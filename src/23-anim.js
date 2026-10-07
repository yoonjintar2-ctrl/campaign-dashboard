
/* ===== 그래프 등장 애니메이션 (v113) =====
   막대는 자라고 · 도넛은 돌며 채워지고 · 선은 그려지고 · 숫자는 올라가고 · 버블은 톡 튀어나온다.
   ■ 방식 — 그래프는 다시 그릴 때마다(새로고침 · 필터 · 기간 · 지표 바꾸기) DOM 을 통째로 새로 만든다.
     MutationObserver 로 새로 들어온 그래프 조각을 찾아 CSS 애니메이션 클래스(ax ax-…)를 붙인다.
     (관찰 콜백은 그리기 직후 · 화면에 칠하기 전에 돌아서, 다 그려진 모습이 한 번 번쩍 보이는 일이 없다)
   ■ 화면 밖 그래프는 들어올 때 — 영역(카드)이 화면에 들어오기 전엔 처음 모습(빈 막대)으로 멈춰 있다가 보이면 시작
   ■ 끝 모습 = 원래 모습 — 키프레임은 시작(from)만 정하고 backwards 로 채운다. 끝나면 클래스를 떼어
     마우스 오버 효과(막대 커지기 · 카드 뜨기 등)와 부딪치지 않는다
   ■ 그림 복사 · 페이지 저장 · 인쇄 직전에는 axFinish() 로 모두 끝 모습으로(중간 모습이 찍히지 않게)
   ■ 동작 줄이기(prefers-reduced-motion) 설정이면 아무것도 하지 않는다 */
const AX_RULES=[
  /* [선택자, 종류, 간격(ms · 같은 그래프 안에서 하나씩 늦게), 첫 지연(ms)] */
  /* 캠페인 진행 현황 */
  ['#paceBox .mstack','clipx',90,80],
  ['#paceBox .sheen','clipx',90,80],
  ['#paceBox .dgauge>i','pop',9,0],
  ['#paceBox .pside.r .nm1','count',90,80],
  /* 주요 지표 */
  ['#statStrip .stat .v','count',70,0],
  ['#statStrip svg.spk','clipx',70,120],
  /* KPI 달성 현황 — 도넛은 돌면서 호가 차오른다 */
  ['#donuts .ring>svg','spin',70,0],
  ['#donuts .ring svg circle[stroke-dasharray]','dash',70,60],
  ['#donuts .ring .achv','count',70,60],
  /* 일자별 캠페인 효율 비교 — 막대 자라기 · 언덕 떠오르기 · 꺾은선 그리기 · 이슈 번호 톡 */
  ['#chartDaily .dbar','growy',14,0],
  ['#chartDaily path.dground','rise',0,0],
  ['#chartDaily path.dline','draw',0,380],
  ['#chartDaily g.isdot','pop',70,1000],
  /* 표 안 게이지 · 게재 히스토리 · 히트맵 */
  ['#tab-dash .gauge .track>i','growx','row',0],
  ['#ganttTbl td.day>.b','growx','di',0],
  ['#heatTbl td.hm>.c','fade','row',0],
  /* 지형도 · 버블 · 효율 우수 소재 */
  ['#treemap .tile','zoom',12,0],
  ['#bubble circle.bub','pop',45,100],
  ['#creatives .cr','up',35,0],
  /* 유입 분석 */
  ['#tab-dash .infk b','count',70,0],
  ['#infSankey svg.sksvg','clipx',0,0],
  ['#tab-dash .msvg circle.mc','pop',60,100],
  ['#tab-dash .ldbar','clipy',90,0],
  ['#tab-dash .dwbar','clipx',70,0],
  /* 전체 캠페인 */
  ['#ovKpis circle[data-ovpie]','dash',0,60],   /* 가운데 글자가 svg 안에 있어 통째로 돌리지 않는다 */
  ['#ovKpis .kbar>i','growx',90,100],
  ['#ovFlow svg.flsvg','clipx',0,100],
  ['#ovTimeline .ovbar','growx',80,0],
  ['#ovLists .ovmini>i','growx','row',0],
  ['#ovBars .ocbar','growy',90,0],
  ['#ovCollage .oct','up',22,0],
  /* TV · OOH */
  ['.tvkpi .bar>i','growx',80,80],
  ['.tvkpi .vv','count',80,0],
  ['#oohMediaBox .ob .tr>i','growx',70,0],
  ['#oohTbl .otl>i','growx','row',0]];
const AX_ROOTS='#tab-dash,#tab-overview,#tab-tvdash,#tab-oohdash';
const AX_SEEN=new WeakSet();
const AX_COUNTS=new Set();
/* 숫자는 지난번 값에서 새 값으로 — 필터를 바꾸면 바뀐 숫자만 움직인다(처음엔 0 에서) */
const AX_LAST=new Map();
let AX_IO=null;
window.__axHold=window.__axHold||0;
/* 자동 검사용 헤드리스 크롬(배포 전 검사 · 시험 스크립트)에서는 끈다 — 가상 시간으로 도는 검사가 애니메이션을 기다리다 멈추지 않게.
   시험할 때 켜려면 주소에 &anim=1 */
const AX_HEADLESS=/HeadlessChrome/.test(navigator.userAgent)&&!/[?&]anim=1(&|$)/.test(location.search);
if(AX_HEADLESS)document.documentElement.classList.add('ax-none');
function axOff(){
  if(AX_HEADLESS||window.__axHold>0)return true;
  try{return typeof reduceMotion==='function'?reduceMotion():matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
/* 그래프 하나의 바깥 상자 — 화면에 들어왔는지 이 상자로 본다 */
function axRootOf(el){
  return el.closest('.card,.infcell,.ovk,.tvkpi,#ovBars,#ovTimeline,#ovFlow,#ovCollage,#paceBox,#chartDaily,.hpbox')||el.parentElement;}
function axInView(r){
  if(document.body.classList.contains('booting'))return false;
  if(!r.isConnected||!r.getClientRects().length)return false;
  const b=r.getBoundingClientRect();
  return b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth;}
function axWait(r){
  if(r.classList.contains('ax-wait'))return;
  r.classList.add('ax-wait');
  if(!AX_IO)AX_IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)axGo(e.target);}),{threshold:0.08});
  AX_IO.observe(r);}
function axGo(r){
  if(document.body.classList.contains('booting'))return;   /* 첫 화면 가림막이 걷힌 뒤(axKick) */
  r.classList.remove('ax-wait');if(AX_IO)AX_IO.unobserve(r);
  const now=performance.now();
  AX_COUNTS.forEach(c=>{if(c.root===r&&!c.t0)c.t0=now+c.delay;});
  axTick();}
/* 기다리는 영역 중 지금 보이는 것을 시작 — 첫 화면 가림막이 걷혔을 때 등 */
function axKick(){document.querySelectorAll('.ax-wait').forEach(r=>{if(axInView(r))axGo(r);});}
/* ---------- 숫자 올라가기 ---------- */
let AX_RAF=0;
const axEase=t=>1-Math.pow(1-t,4);
function axFmt(c,v){
  const s=c.comma?v.toLocaleString('en-US',{minimumFractionDigits:c.dec,maximumFractionDigits:c.dec}):v.toFixed(c.dec);
  return c.pre+s+c.suf;}
function axCount(el,root,delay,key){
  if(el.childNodes.length!==1||el.firstChild.nodeType!==3)return false;
  const tn=el.firstChild,txt=tn.nodeValue;
  if(/[가-힣]/.test(txt))return false;              /* 단위가 한글이면 그대로(번역기와 부딪치지 않게) */
  const m=/^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(txt.trim());if(!m)return false;
  const target=parseFloat(m[2].replace(/,/g,''));if(!isFinite(target)||!target)return false;
  const from=key&&AX_LAST.has(key)?AX_LAST.get(key):0;
  if(key)AX_LAST.set(key,target);
  if(from===target)return false;
  const c={tn,root,pre:m[1],suf:m[3],dec:(m[2].split('.')[1]||'').length,comma:m[2].includes(','),
    from,target,final:txt,delay,dur:from?800:1100,t0:0};
  tn.nodeValue=axFmt(c,from);
  if(from)axDelta(el,c,delay);
  AX_COUNTS.add(c);
  if(!root.classList.contains('ax-wait'))c.t0=performance.now()+delay;
  axTick();return true;}
/* ---------- 변화량 배지 (v114) ----------
   필터 · 기간 등을 바꿔 숫자가 달라지면 숫자 옆에 지난 값 대비 ▲▼ 를 4초쯤 띄운다.
   % 로 끝나는 숫자(달성률 · 소진율 등)는 차이(%p), 나머지는 몇 % 늘고 줄었는지. 색은 좋고 나쁨이 아니라 방향만(단가는 오르면 나쁘다) */
function axDelta(el,c,delay){
  const diff=c.target-c.from;if(!diff)return;
  const pct=/^\s*%/.test(c.suf);
  let v;
  if(pct){v=Math.abs(diff);if(v<0.05)return;v=v.toFixed(v>=10?0:1)+'%p';}
  else{if(!c.from)return;v=Math.abs(diff/c.from)*100;if(v<0.05)return;v=(v>=100?v.toFixed(0):v.toFixed(1))+'%';}
  el.querySelectorAll(':scope>.axdelta').forEach(n=>n.remove());
  const b=document.createElement('span');
  b.className='axdelta '+(diff>0?'up':'dn');
  b.textContent=(diff>0?'▲ ':'▼ ')+v;
  b.title=L(`이전 ${axFmt(c,c.from)} → 지금 ${c.final.trim()}`,`Was ${axFmt(c,c.from)} → now ${c.final.trim()}`);
  if(delay)b.style.setProperty('--axd',delay+'ms');
  el.classList.add('axhasdelta');el.appendChild(b);}
/* ⚠ requestAnimationFrame 대신 setTimeout(16ms) — 배포 전 검사(헤드리스 크롬 · 가상 시간)는 rAF 가 계속 걸려 있으면
   시간이 흐르지 않아 숫자가 끝나지 않고 검사가 멈췄다(v113 첫 배포). 타이머는 가상 시간이 건너뛰어 준다 */
function axTick(){
  if(AX_RAF)return;
  AX_RAF=setTimeout(function step(){
    AX_RAF=0;
    const now=performance.now();
    AX_COUNTS.forEach(c=>{
      if(!c.tn.isConnected){AX_COUNTS.delete(c);return;}
      if(!c.t0||now<c.t0)return;
      const t=Math.min(1,(now-c.t0)/c.dur);
      if(t>=1||now-c.t0>c.dur+4000){c.tn.nodeValue=c.final;AX_COUNTS.delete(c);return;}
      c.tn.nodeValue=axFmt(c,c.from+(c.target-c.from)*axEase(t));});
    if([...AX_COUNTS].some(c=>c.t0))AX_RAF=setTimeout(step,16);},16);}
/* ---------- 새로 그려진 조각에 클래스 붙이기 ---------- */
/* nodes — 한 번에 새로 들어온 조각들(카드를 하나씩 붙여도 한 묶음으로 받아 차례 지연이 이어지게) */
function axScan(nodes){
  if(axOff())return;
  nodes=[].concat(nodes).filter(n=>n&&n.nodeType===1&&n.isConnected);
  /* 다른 조각 안에 든 조각은 빼고 바깥 것만 */
  nodes=nodes.filter(n=>!nodes.some(m=>m!==n&&m.contains(n)));
  if(!nodes.length)return;
  const roots=new Set(),byRule=[];
  for(const [sel,kind,gap,base] of AX_RULES){
    let list=[];
    for(const node of nodes){
      try{if(node.matches(sel))list.push(node);list.push(...node.querySelectorAll(sel));}catch(e){}}
    list=list.filter(el=>!AX_SEEN.has(el));
    if(!list.length)continue;
    byRule.push([list,kind,gap,base,sel]);}
  if(!byRule.length)return;
  /* 유입 흐름은 단계 넘기기 애니메이션이 끝나고 다시 그릴 때는 건너뛴다 */
  const skipFlow=typeof INF!=='undefined'&&INF.stepped&&performance.now()-INF.stepped<400;
  for(const [list,kind,gap,base,sel] of byRule){
    list.forEach((el,i)=>{
      AX_SEEN.add(el);
      if(kind==='clipx'&&el.classList.contains('sksvg')&&(skipFlow||el.classList.contains('skanim')))return;
      const r=axRootOf(el);if(!r)return;
      if(!roots.has(r)){roots.add(r);if(!axInView(r))axWait(r);}
      /* 늦게 시작 — 같은 그래프 안에서 차례로(줄 · 날짜 순서로 고를 수도) */
      let d=base||0;
      if(gap==='row'){const tr=el.closest('tr');d+=Math.min(900,(tr?tr.sectionRowIndex:0)*22);}
      else if(gap==='di'){const td=el.closest('td');d+=Math.min(700,(+(td&&td.dataset.di)||0)*9);}
      else d+=Math.min(1100,i*(gap||0));
      if(kind==='count'){
        /* 지난 값을 찾는 열쇠 — 캠페인 · 자리 · 이름표(노출 · 클릭 …). 이름표가 없으면 순서 */
        const box=el.closest('.pline,.stat,.donut,.infk,.tvkpi,.ovk');
        const lb=box&&box.querySelector('.k,.dhd,.pside .nm1,.tt,span');
        const lab=lb?lb.textContent.trim().slice(0,40):'';
        axCount(el,r,d,(CAMPAIGN&&(CAMPAIGN.id||CAMPAIGN.name))+'|'+sel+'|'+(lab||i));return;}
      if(kind==='draw'){try{el.setAttribute('pathLength','1');}catch(e){}}
      if(d)el.style.setProperty('--axd',d+'ms');
      el.classList.add('ax','ax-'+kind);});}}
/* 끝 모습으로 — 그림 복사 · 페이지 저장 · 인쇄 직전 */
function axFinish(root){
  root=root||document.documentElement;
  let list=[];
  try{list=root.getAnimations?root.getAnimations({subtree:true}):document.getAnimations();}catch(e){try{list=document.getAnimations();}catch(x){}}
  list.forEach(a=>{if(a.animationName&&/^ax/.test(a.animationName)){try{a.finish();}catch(e){}}});
  AX_COUNTS.forEach(c=>{if(root.contains(c.tn)){c.tn.nodeValue=c.final;AX_COUNTS.delete(c);}});
  root.querySelectorAll('.axdelta').forEach(n=>{const p=n.parentElement;n.remove();if(p)p.classList.remove('axhasdelta');});
  root.querySelectorAll('.ax-wait').forEach(r=>{r.classList.remove('ax-wait');if(AX_IO)AX_IO.unobserve(r);});
  if(root.classList&&root.classList.contains('ax-wait'))root.classList.remove('ax-wait');}
/* 끝나면 클래스를 뗀다 — 마우스 오버 효과와 부딪치지 않게, 탭을 다시 열 때 또 돌지 않게 */
document.addEventListener('animationend',e=>{
  if(!/^ax/.test(e.animationName))return;
  if(e.target.classList&&e.target.classList.contains('axdelta')){const p=e.target.parentElement;e.target.remove();
    if(p&&!p.querySelector('.axdelta'))p.classList.remove('axhasdelta');return;}
  const t=e.target;if(!t.classList||!t.classList.contains('ax'))return;
  t.classList.forEach(k=>{if(/^ax-(?!wait)/.test(k))t.classList.remove(k);});
  t.classList.remove('ax');t.style.removeProperty('--axd');
  if(t.getAttribute&&t.getAttribute('pathLength')==='1')t.removeAttribute('pathLength');},true);
addEventListener('beforeprint',()=>{try{axFinish();}catch(e){}});
(function(){
  let q=[];
  const flush=()=>{const list=q;q=[];try{axScan(list);}catch(e){console.warn('ax',e);}};
  const mo=new MutationObserver(recs=>{
    for(const r of recs)for(const n of r.addedNodes){
      if(n.nodeType!==1)continue;
      if(n.closest&&n.closest(AX_ROOTS))q.push(n);}
    if(q.length)flush();});
  document.querySelectorAll(AX_ROOTS).forEach(r=>mo.observe(r,{childList:true,subtree:true}));
  /* 첫 화면 가림막(booting)이 걷히면 보이는 그래프부터 시작 */
  new MutationObserver(()=>{if(!document.body.classList.contains('booting'))axKick();})
    .observe(document.body,{attributes:true,attributeFilter:['class']});
  /* 이미 그려져 있는 그래프(이 파일보다 먼저 그려진 것)도 한 번 */
  try{axScan([...document.querySelectorAll(AX_ROOTS)]);}catch(e){}})();
