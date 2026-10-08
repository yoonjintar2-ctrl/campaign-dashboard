
/* ===== 데이터 투어 (v116) =====
   디지털 대시보드 › 서머리의 그래프를 한 장씩 전체 화면으로 — 바로 발표할 수 있게.
   ■ 장면 — 표지 → 화면에 보이는 영역(숨긴 영역 · 숨긴 서머리는 빠짐) 하나씩 → 마무리(핵심 요약 · PPT 저장)
     유입 분석은 세 장(흐름 · 랜딩/체류 · 상세 표)으로 나눈다
   ■ 위쪽 제목 · 부제목 = 그 영역에서 자동으로 뽑은 시사점(한/영). 제목 속 숫자는 강조색
   ■ 그래프는 화면 가운데에서 떠오르며 채워지고(23-anim 규칙 그대로) · 눈에 띄는 곳을 강조 — (v123) 흐리게 하지 않고 형광펜(곱하기로 덧칠) +
     가리키는 손가락 + 이름표. 손가락 · 이름표는 원본 글자 · 막대 · 점을 가리지 않는 빈자리를 찾아 놓는다
     차례가 여럿이면(유입 분석의 그래프 세 개) 하나씩 넘어가며 강조하고 끝나면 모두 다시 진하게
   ■ 제목 = 전체 효과(합계 · 평균 · 몇 개 중 몇 개), 부제목 = 눈에 띄는 것(가장 높은 · 낮은 곳) (v119)
   ■ 위 오른쪽 — 문구 편집(E · 그 자리에서 고쳐 쓰기 · Ctrl+B 강조) · 다운로드(PPT · 파일) · 자동 재생 · 닫기 (v119)
   ■ 좌우 단추 · ← → · Space · PageUp/Down(발표용 리모컨) · 스와이프 · 진행 막대 클릭 · P 자동 재생 · Esc 닫기
   ■ 넘어갈 때 3D 로 돌아 나가고 들어온다. 바닥 격자도 함께 흘러 카메라가 옆 전시물로 옮겨 가는 느낌
   ■ 마지막 장 = 갈래별 핵심 요약(v119) · 'PPT로 저장' — 장마다 위쪽에 편집할 수 있는 글(Pretendard) + 바탕 없는(누끼) 그래프 그림(강조 모습 그대로) + 이름표
   ■ 화면의 그래프는 원본을 복제해 쓴다 — 원본은 건드리지 않는다(저장 · 클라우드와 무관) */
const TU={el:null,deck:null,slides:[],i:-1,node:null,timers:[],play:false,playT:0,fs:false,fx:0,rm:false,ppt:0,daily:null,hintT:0,raf:0,rz:0};
const TU_PLAY=9000;
const TU_CONTENT='.card,.stat,.donut,svg,table,.cr,.cmt,.tile,.infk,canvas,img';
const tuTx=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const tuNum=s=>{s=String(s==null?'':s).replace(/[−–]/g,'-');const m=/-?\d[\d,]*(?:\.\d+)?/.exec(s);return m?parseFloat(m[0].replace(/,/g,'')):NaN;};
const tuPc=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
const tuCost=l=>/^\s*(목표\s*)?C(P[A-Z]|TC|PM)|단가|cost/i.test(l||'');
const tuSelTx=id=>{const s=$(id);return s&&s.selectedOptions&&s.selectedOptions[0]?tuTx(s.selectedOptions[0]):'';};
const tuVis=n=>!!(n&&n.getClientRects().length&&!n.classList.contains('hidden'));
/* 제목에서 강조할 값 — E(값) 으로 감싸 둔다(이름 속 숫자 '6초 범퍼' 같은 것은 강조하지 않게) */
const E=v=>`\u0002${v}\u0003`;
const tuPlain=t=>String(t||'').replace(/[\u0002\u0003]/g,'');
function tuWords(t){
  const words=[];let w='',em=false;
  const end=()=>{if(w.replace(/<\/?em>/g,''))words.push(w+(em?'</em>':''));w=em?'<em>':'';};
  for(const ch of String(t||'')){
    if(ch==='\u0002'){em=true;w+='<em>';continue;}
    if(ch==='\u0003'){em=false;w+='</em>';continue;}
    if(/\s/.test(ch)){end();continue;}
    w+=esc(ch);}
  end();
  return words.map(x=>`<span class="w"><span>${x}</span></span>`).join(' ');}
/* PPT 제목 — 강조한 값만 강조색 글자 */
function tuRuns(t,col,acc){
  return String(t||'').split(/[\u0002\u0003]/).map((p,k)=>({text:p,options:{color:k%2?acc:col}})).filter(r=>r.text!=='');}
/* 큰 수는 읽기 쉽게 — 2,009,041 → 201만 / 2.01M (₩ 는 그대로) */
function tuBig(v,f){
  const s=f?String(f(v)):String(v),pre=/^₩/.test(s)?'₩':'',a=Math.abs(v);
  if(!(a>=1e4))return s;
  if(LANG==='en'){const [d,u]=a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:[1e3,'K'];const x=v/d;return pre+(Math.abs(x)>=100?x.toFixed(0):x.toFixed(Math.abs(x)>=10?1:2))+u;}
  if(a>=1e8){const x=v/1e8;return pre+(Math.abs(x)>=100?x.toFixed(0):x.toFixed(1))+'억';}
  const x=v/1e4;return pre+(Math.abs(x)>=100?Math.round(x).toLocaleString('en-US'):x.toFixed(1))+'만';}

/* ---------- 1. 장면 모으기 ---------- */
/* 서머리 화면을 위에서 아래로 — 영역 제목(.sec) + 그 아래 보이는 내용 묶음 */
function tuGroups(){
  const host=$('sub-perf');if(!host)return [];
  const out=[];let cur=null;
  const walk=c=>{for(const n of c.children){
    if(n.nodeType!==1||!tuVis(n))continue;
    if(n.classList.contains('sec')){cur={sec:n,els:[]};out.push(cur);continue;}
    if(!n.classList.contains('card')&&n.querySelector('.sec')){walk(n);continue;}
    if(n.matches('.filters,.hiddenbar,.barlbl,[id$="CfgBox"],.hint'))continue;
    if(!n.matches(TU_CONTENT)&&!n.querySelector(TU_CONTENT))continue;   /* 단추만 있는 줄 등 */
    if(cur)cur.els.push(n);}};
  walk(host);
  return out.filter(g=>g.els.length);}
/* 원본 → 복제 (화면용 원본 그대로 · 조작 단추는 CSS 로 감춤) */
const tuPath=(root,el)=>{const p=[];while(el&&el!==root){p.unshift([...el.parentNode.children].indexOf(el));el=el.parentNode;}return p;};
const tuAt=(root,p)=>p.reduce((e,i)=>e&&e.children[i],root);
function tuClone(els,keep){
  const src=document.createElement('div');src.className='tu-src';
  let W=0,extra=0,tblX=0;
  els.forEach(o=>{
    W=Math.max(W,o.getBoundingClientRect().width);
    const c=o.cloneNode(true);
    /* 가로로 넘겨 보는 상자 — 표는 그대로(투어에서 강조할 칸으로 옮겨 간다), 카드 줄은 펼친다 */
    const scs=[o,...o.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);
      return /auto|scroll/.test(cs.overflowX)&&e.scrollWidth>e.clientWidth+1&&tuVis(e);});
    scs.forEach(e=>{const d=e.scrollWidth-e.clientWidth;
      if(e.querySelector('table')||e.tagName==='TABLE')tblX=Math.max(tblX,d);
      else{extra=Math.max(extra,d);const ce=tuAt(c,tuPath(o,e));if(ce){ce.classList.add('tu-xp');ce.classList.remove('hpover');}}});
    src.appendChild(c);});
  if(keep)keep(src);
  /* 애니메이션 · 변화량 배지 흔적, 편집 · 끌기 속성은 지운다 */
  src.querySelectorAll('.axdelta').forEach(n=>n.remove());
  src.querySelectorAll('.ax,.ax-wait,.axhasdelta').forEach(n=>{[...n.classList].forEach(k=>{if(/^ax/.test(k))n.classList.remove(k);});n.style.removeProperty('--axd');});
  src.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  src.querySelectorAll('[draggable]').forEach(n=>n.removeAttribute('draggable'));
  src.querySelectorAll('[pathLength="1"]').forEach(n=>n.removeAttribute('pathLength'));
  W=Math.ceil(W+extra);src.style.width=W+'px';
  return {src,W,tblX};}
/* 장면 하나 만들기 + 시사점 */
/* 사람이 고친 문구 — 이 창을 닫기 전까지 캠페인 · 장면마다 기억한다(투어를 다시 열어도 · PPT · HTML 에도 그대로) (v119) */
const TU_EDITS=new Map();
const tuEditKey=sl=>`${(typeof CAMPAIGN!=='undefined'&&(CAMPAIGN.id||CAMPAIGN.name))||''}|${LANG}|${sl.key}|${sl.label}`;
/* 자동 문구는 t0 · s0 에 남겨 두고('원래대로'), 고친 문구가 있으면 그것으로 */
function tuApplyEdit(sl){sl.t0=sl.t;sl.s0=sl.s||'';const ed=TU_EDITS.get(tuEditKey(sl));if(ed){sl.t=ed.t;sl.s=ed.s;}return sl;}
function tuMk(key,label,els,keep){
  const {src,W,tblX}=tuClone(els,keep);
  const sl={kind:'body',key,label,src,W,tblX,chips:[]};
  /* 강조할 곳 — step 이 다르면 차례로(유입 분석의 그래프 세 개처럼) */
  const h=(el,chip,step)=>{if(!el)return;el.setAttribute('data-tuhl',String(sl.chips.length));
    if(step)el.setAttribute('data-tust',String(step));sl.chips.push(chip||'');};
  let r=null;
  try{const f=TU_INS[key];r=f?f(sl,h):null;}catch(e){console.warn('tour insight',key,e);}
  if(r&&r.skip)return null;
  /* 시사점도 없고 그래프 · 표도 없으면(데이터 없음 안내뿐) 장면을 뺀다 */
  if(!r&&!src.querySelector('svg,table,canvas,img,.stat,.donut,.cr,.tile,.infk,.cmt'))return null;
  if(!r||!r.t){src.querySelectorAll('[data-tuhl]').forEach(n=>{n.removeAttribute('data-tuhl');n.removeAttribute('data-tust');});sl.chips=[];r={t:label,s:''};}
  sl.t=r.t;sl.s=r.s||'';
  if(LANG==='en'&&sl.s)sl.s=sl.s.charAt(0).toUpperCase()+sl.s.slice(1);
  return tuApplyEdit(sl);}
function tuBuild(){
  const out=[];
  tuGroups().forEach(g=>{
    const sec=g.sec;
    const key=sec.dataset.sect||(sec.closest('#summaryHost')?'sum':'misc');
    const label=(typeof snLabel==='function'?snLabel(sec):tuTx(sec))||key;
    if(key==='inflow'){
      /* 유입 분석은 세 장 — ① 지표 + 흐름 ② 지도 · 랜딩 · 체류 ③ 상세 표 */
      const card=g.els.find(e=>e.querySelector('#infBody'));
      const body=card&&card.querySelector('#infBody');
      if(body){
        const kids=[...body.children].filter(tuVis);
        const pick=sel=>kids.filter(k=>k.matches(sel));
        const parts=[['infA',pick('.infkpis,.infflow')],['infB',pick('.infgrid')],['infC',pick('.infcell.hpcard')]];
        parts.forEach(([k,keepEls])=>{
          if(!keepEls.length)return;
          const ks=new Set(keepEls);
          const subs=[...new Set(keepEls.flatMap(e=>[...e.querySelectorAll('.infh>b')].filter(tuVis).map(tuTx)).filter(Boolean))];
          let sub=subs.slice(0,2).join(' · ');if(sub.length>26)sub=subs[0];
          const sl=tuMk(k,sub?`${label} · ${sub}`:label,[card],src=>{
            const b=src.querySelector('#infBody');if(!b)return;
            [...b.children].filter((c,i)=>!ks.has(body.children[i])).forEach(c=>c.remove());});
          if(sl)out.push(sl);});
        return;}}
    /* 일자별 — 운영 이슈(그래프의 ① ② ③)를 그래프 카드 바깥 아래에 한 건에 한 줄씩 (v123) */
    const keep=key==='daily'?src=>{const is=src.querySelector('#dailyIssues');if(!is)return;
      const its=[...is.querySelectorAll('.disit')];is.remove();if(!its.length)return;
      const box=document.createElement('div');box.className='tu-iss';
      box.innerHTML=`<div class="tu-issh">${esc(L('운영 이슈','Operational issues'))}</div>`+its.map(x=>`<div class="tu-isr">${x.innerHTML}</div>`).join('');
      src.appendChild(box);}:null;
    const sl=tuMk(key,label,g.els,keep);
    if(sl)out.push(sl);});
  return out;}

/* ---------- 2. 시사점 — 영역마다 제목 · 부제목 · 강조할 곳 ---------- */
const tuDay=d=>L(`${d.getMonth()+1}/${d.getDate()}(${'일월화수목금토'[d.getDay()]})`,
  `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`);
const tuJoin=a=>a.filter(Boolean).join(' · ');
/* (v119) 제목 = 전체 효과(합계 · 평균 · 몇 개 중 몇 개), 부제목 = 눈에 띄는 것(가장 높은 · 낮은 곳).
   강조는 부제목에 나온 '눈에 띄는 것' — 나머지를 옅게 해서 상대적으로 진하게 */
const tuMean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
/* 큰 금액 · 수 글자 → 짧게(₩249,866,835 → ₩2.5억 / 8,644만) · % 는 그대로 */
const tuShortTx=v=>{const t=String(v||'').trim();if(/%\s*$/.test(t))return t;const n=tuNum(t);if(!isFinite(n))return t;
  const pre=/^₩/.test(t)?'₩':'';return Math.abs(n)>=1e4?tuBig(n,x=>pre+Math.round(x).toLocaleString('en-US')):t;};
/* 받침에 따라 을/를 · 이/가 */
const tuJosa=(w,a,b)=>{const c=String(w||'').trim().slice(-1).charCodeAt(0);
  return c>=0xAC00&&c<=0xD7A3?((c-0xAC00)%28?a:b):`${a}(${b})`;};
/* 유입 분석 화면과 같은 묶음 · 흐름 모형(18-inflow 와 같은 순서) — 매체 → 랜딩 유입, 매체별 효율 */
function tuInfModel(){
  if(typeof infLineStat!=='function')return null;
  try{
    const LS=infLineStat(),ok=new Set(LS.filter(x=>x.ok).map(x=>x.lid)),dim=(typeof INF!=='undefined'&&INF.dim)||'media';
    const segOK=infSegList(ok).length>=2,useSeg=!!(typeof INF!=='undefined'&&INF.seg)&&segOK,rk=infSegRank();
    const rows=infGroups(dim,ok,useSeg).filter(g=>infHas(g.b)).sort((a,b)=>(useSeg?rk(a.seg)-rk(b.seg):0)||(b.b.iwv||0)-(a.b.iwv||0)||(b.b.click||0)-(a.b.click||0));
    return {rows,M:rows.length?infFlowModel(rows,useSeg):null,A:aggFacts(factFilter()),dim};
  }catch(e){console.warn('tour inflow',e);return null;}}
const TU_INS={
  /* 캠페인 구조 (v119 마인드맵) — 구성 개수 · 구분별 예산 비중 */
  struct(sl){
    const cs=[...sl.src.querySelectorAll('.cs-cnt span')].map(x=>({n:tuTx(x.querySelector('b')),l:tuTx(x).replace(tuTx(x.querySelector('b')),'').trim()})).filter(x=>x.n);
    if(!cs.length)return null;
    const seg=[...sl.src.querySelectorAll('.cs-lg span')].filter(x=>x.querySelector('i')&&!x.classList.contains('cs-scale'))
      .map(x=>{const b=tuTx(x.querySelector('b'));return b?`${b} ${tuTx(x).replace(b,'').trim()}`:'';}).filter(Boolean);
    const bud=[...document.querySelectorAll('#campBar .it')].find(i=>/예산|budget/i.test(tuTx(i.querySelector('.k'))));
    return {t:cs.map(x=>`${x.l} ${E(x.n)}`).join(' · '),
      s:tuJoin([bud&&L(`총 예산 ${tuShortTx(tuTx(bud.querySelector('.v')).split(' ')[0])}`,`Total budget ${tuShortTx(tuTx(bud.querySelector('.v')).split(' ')[0])}`),
        seg.length?L(`예산 비중 ${seg.join(' · ')}`,`budget split ${seg.join(' · ')}`):''])};},
  /* 캠페인 진행 현황 (v123) — 제목 = 캠페인 KPI(예산이 가장 큰 KPI 묶음의 지표) 목표 대비 실적,
     부제목 = 그 실적을 이끈 매체(몇 회 · 몇 %) · 다음 매체들 · 다른 지표 달성률. 강조 = KPI 줄에서 1위 매체 구간 */
  pace(sl,h){
    const rows=[...sl.src.querySelectorAll('.pline')].map(line=>{
      const b=line.querySelector('.pbar[data-tip]');let d=null;
      try{d=b&&JSON.parse(b.getAttribute('data-tip'));}catch(e){}
      return d&&d.goal>0?{line,d,l:tuTx(line.querySelector('.pside .nm1'))||d.l}:null;}).filter(Boolean);
    if(!rows.length)return null;
    let kk=null;try{const kr=kpiAchRows(activeLines());if(kr.length)kk=kr[0].k;}catch(e){}
    const main=(kk&&rows.find(x=>x.d.l===((typeof KPI_LABEL!=='undefined'&&KPI_LABEL[kk])||kk)))||rows[0];
    const d=main.d,lab=main.l,fk=v=>tuBig(v),pr=d.act/d.goal;
    const media=(d.media||[]).filter(y=>y.v>0&&y.m&&y.m!=='–').sort((a,b)=>b.v-a.v);
    const top=media[0],sh=v=>tuPc(v/(d.act||1),0);
    if(top){const seg=[...main.line.querySelectorAll('.mstack i[data-m]')].find(i=>i.getAttribute('data-m')===top.m);
      h(seg||main.line,L(`${top.m} ${fk(top.v)} 회`,`${top.m} ${fk(top.v)}`));}
    const m=/(\d+(?:\.\d+)?)\s*%/.exec(tuTx(sl.src.querySelector('.phead'))),el=m?+m[1]:100;
    const t=L(`목표 ${lab} ${fk(d.goal)} 대비 ${E(fk(d.act))} ${lab} · ${E(tuPc(pr))} 달성`,
      `${E(fk(d.act))} ${lab} vs a ${fk(d.goal)} target · ${E(tuPc(pr))} achieved`);
    const bits=[];
    if(el<99.5&&d.due>0)bits.push(L(`캠페인 ${el}% 경과 · 페이스 대비 ${tuPc(d.act/d.due)}`,`${el}% of the flight · ${tuPc(d.act/d.due)} of pace`));
    if(top)bits.push(L(`${lab}${tuJosa(lab,'을','를')} 이끈 매체 ${top.m} ${fk(top.v)} 회(${sh(top.v)})`,`led by ${top.m} with ${fk(top.v)} (${sh(top.v)})`));
    if(media[1])bits.push(media.slice(1,3).map(y=>L(`${y.m} ${fk(y.v)} 회(${sh(y.v)})`,`${y.m} ${fk(y.v)} (${sh(y.v)})`)).join(' · '));
    /* 다른 지표는 둘까지만(길면 뺀다) */
    const others=rows.filter(x=>x!==main).map(x=>`${x.l} ${tuPc(x.d.act/x.d.goal)}`);
    if(others.length&&others.length<=2)bits.push(L(`다른 지표 ${others.join(' · ')} 달성`,`other metrics: ${others.join(' · ')}`));
    return {t,s:tuJoin(bits.slice(0,3))};},
  /* 주요 지표 — 합계 숫자 / 페이스 대비 가장 앞선 · 뒤처진 지표 */
  stat(sl,h){
    const pp=s=>{const m=/[+−-]\s?\d[\d.,]*\s?%p?/.exec(s||'');return m?m[0].replace(/\s/g,''):'';};
    const cs=[...sl.src.querySelectorAll('.stat')].map(c=>{const dl=c.querySelector('.dl');
      return {c,k:tuTx(c.querySelector('.k')),v:tuTx(c.querySelector('.v')),r:tuTx(c.querySelector('.r b')),
        dt:dl?pp(tuTx(dl)):'',d:dl?tuNum(pp(tuTx(dl))):NaN};}).filter(x=>x.k&&x.v);
    if(!cs.length)return null;
    const t=cs.slice(0,3).map(x=>`${x.k} ${E(tuShortTx(x.v))}`).join(' · ');
    const wd=cs.filter(x=>isFinite(x.d));
    if(!wd.length)return {t,s:tuJoin(cs.slice(3,6).map(x=>`${x.k} ${tuShortTx(x.v)}`))};
    const best=wd.reduce((a,b)=>b.d>a.d?b:a),worst=wd.reduce((a,b)=>b.d<a.d?b:a),up=wd.filter(x=>x.d>=0).length;
    h(best.c,L(`페이스 대비 ${best.dt}`,`${best.dt} vs pace`));
    if(worst!==best)h(worst.c,L(`페이스 대비 ${worst.dt}`,`${worst.dt} vs pace`));
    return {t,s:tuJoin([L(`페이스 이상 ${up}/${wd.length}개`,`${up} of ${wd.length} at or above pace`),
      L(`가장 앞선 ${best.k} ${best.dt}`,`ahead: ${best.k} ${best.dt}`),
      worst!==best&&L(`가장 뒤처진 ${worst.k} ${worst.dt}`,`furthest behind: ${worst.k} ${worst.dt}`)])};},
  /* KPI 달성 현황 — 몇 개 중 몇 개 달성 · 평균 / 최고 · 최저 */
  kpi(sl,h){
    const ds=[...sl.src.querySelectorAll('.donut')];
    const sp=ds.find(d=>d.classList.contains('spend'));
    const it=ds.filter(d=>d!==sp).map(d=>{const a=d.querySelector('.achv');
      return {d,nm:tuTx(d.querySelector('.dhd .k')),vt:tuTx(a),v:tuNum(tuTx(a))};}).filter(x=>x.nm&&isFinite(x.v));
    const spv=sp?tuTx(sp.querySelector('.achv')):'';
    if(!it.length){if(!sp)return null;return {t:L(`예산 소진율 ${E(spv)}`,`Budget spent: ${E(spv)}`),s:''};}
    const n=it.length,hit=it.filter(x=>x.v>=100).length,avg=tuMean(it.map(x=>x.v)).toFixed(1)+'%';
    const top=it.reduce((a,b)=>b.v>a.v?b:a),low=it.reduce((a,b)=>b.v<a.v?b:a);
    h(top.d,L(`최고 ${top.vt}`,`Top ${top.vt}`));if(low!==top)h(low.d,L(`최저 ${low.vt}`,`Low ${low.vt}`));
    const t=hit===n&&n>1?L(`KPI ${E(n+'개')} 모두 목표 달성 · 평균 ${E(avg)}`,`All ${E(n)} KPIs on target · ${E(avg)} on average`)
      :L(`KPI ${n}개 중 ${E(hit+'개')} 목표 달성 · 평균 ${E(avg)}`,`${E(hit)} of ${n} KPIs on target · ${E(avg)} on average`);
    return {t,s:tuJoin([L(`최고 ${top.nm} ${top.vt}`,`top: ${top.nm} ${top.vt}`),low!==top&&L(`최저 ${low.nm} ${low.vt}`,`lowest: ${low.nm} ${low.vt}`),
      spv&&L(`예산 소진율 ${spv}`,`budget spent ${spv}`)])};},
  /* 일자별 — 기간 합계 · 일평균 / 최고일 · 꺾은선 최고일 */
  daily(sl){
    /* (v119) 제목 = 큰 그림(일평균 · 꺾은선 평균) — 특정 하루를 강조하지 않는다.
       부제목 = 눈에 띄는 것만 골라서 — 주말·공휴일 vs 평일 차이, 유난히 높았던 날, 전반 vs 후반 흐름, 유난히 낮았던 날.
       운영 이슈(그래프의 ① ② ③)는 그래프 아래에 작게 목록으로(CSS — .tu-src #dailyIssues) */
    const D=TU.daily;if(!D||!D.ds||!D.EL)return null;
    const n=Math.min(D.EL,D.ds.length);
    const days=D.totals.slice(0,n).map((v,i)=>({v,d:D.ds[i],i})).filter(x=>x.v>0);
    if(!days.length)return null;
    const fk=v=>tuBig(v,D.bf),bl=tuSelTx('barSel'),ll=tuSelTx('lineSel');
    const sum=days.reduce((a,x)=>a+x.v,0),avg=sum/days.length;
    const lv=D.lineVals&&D.lf&&ll?days.map(x=>D.lineVals[x.i]).filter(isFinite):[];
    const lavg=lv.length?tuMean(lv):NaN;
    const pc=x=>Math.abs(x*100).toFixed(0)+'%';
    const t=L(`일평균 ${bl} ${E(fk(avg))}`,`${E(fk(avg))} ${bl} a day`)
      +(isFinite(lavg)?L(` · 평균 ${ll} ${E(D.lf(lavg))}`,` · ${ll} ${E(D.lf(lavg))} on average`)
                      :L(` · ${days.length}일 누적 ${E(fk(sum))}`,` · ${E(fk(sum))} over ${days.length} days`));
    const bits=[];                                   /* [눈에 띄는 정도, 글] */
    /* 주말·공휴일 vs 평일 */
    const rest=d=>typeof isRest==='function'?isRest(d):(d.getDay()===0||d.getDay()===6);
    const re=days.filter(x=>rest(x.d)),wk=days.filter(x=>!rest(x.d));
    if(re.length>=2&&wk.length>=2){
      const r=tuMean(re.map(x=>x.v))/tuMean(wk.map(x=>x.v))-1;
      const hol=typeof holName==='function'&&re.some(x=>holName(x.d));
      const nm=hol?L('주말·공휴일','weekends & holidays'):L('주말','weekends');
      if(Math.abs(r)>=.05)bits.push([Math.abs(r)*1.2,L(`${nm} 평균이 평일보다 ${pc(r)} ${r>0?'높음':'낮음'}`,`${nm} ran ${pc(r)} ${r>0?'above':'below'} weekdays`)]);
      else bits.push([.02,L(`${nm}·평일 차이 거의 없음`,`${nm} on par with weekdays`)]);}
    /* 유난히 높았던 날 */
    const pk=days.reduce((a,x)=>x.v>a.v?x:a);
    const pr=pk.v/avg;
    bits.push([pr>=1.2?pr-1:.03,L(`최고 ${tuDay(pk.d)} ${fk(pk.v)}(평균의 ${pr.toFixed(1)}배)`,`peak ${fk(pk.v)} on ${tuDay(pk.d)} (${pr.toFixed(1)}× avg)`)]);
    /* 전반 vs 후반 */
    if(days.length>=8){const hf=Math.floor(days.length/2),a1=tuMean(days.slice(0,hf).map(x=>x.v)),a2=tuMean(days.slice(hf).map(x=>x.v)),g=a2/a1-1;
      if(Math.abs(g)>=.1)bits.push([Math.abs(g),L(`후반 ${days.length-hf}일 평균이 전반보다 ${pc(g)} ${g>0?'높음':'낮음'}`,`second half ${pc(g)} ${g>0?'above':'below'} the first`)]);}
    /* 유난히 낮았던 날(시작 · 끝 언저리 하루는 빼고) */
    const lo=days.slice(1,-1).reduce((a,x)=>!a||x.v<a.v?x:a,null);
    if(lo&&lo.v/avg<=.6)bits.push([(1-lo.v/avg)*.8,L(`최저 ${tuDay(lo.d)} ${fk(lo.v)}(평균의 ${(lo.v/avg).toFixed(1)}배)`,`low ${fk(lo.v)} on ${tuDay(lo.d)}`)]);
    const sub=bits.sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
    return {t,s:tuJoin(sub)};},
  /* 서머리 표 — KPI 목표를 맞춘 라인 수(또는 합계 줄) / 목표 대비 가장 좋은 · 나쁜 라인 */
  sum(sl,h){
    const t=sl.src.querySelector('table');if(!t||!t.tHead||!t.tBodies.length)return null;
    const hr=[...t.tHead.rows],labs=[...hr[hr.length-1].cells].map(tuTx);
    const hc=[...hr[0].cells].filter(c=>c.classList.contains('lfz')).length||1;
    const carry=Array.from({length:hc},()=>({t:'',left:0}));
    const rows=[];
    [...t.tBodies].forEach(tb=>[...tb.rows].forEach(r=>{
      const heads=[...r.cells].filter(c=>c.classList.contains('head')),vals=[...r.cells].filter(c=>!c.classList.contains('head'));
      let k=0;
      for(let c=0;c<hc&&k<heads.length;c++){if(carry[c].left>0)continue;
        const hd=heads[k++],sp=Math.max(1,hd.colSpan||1),rs=Math.max(1,hd.rowSpan||1);
        carry[c]={t:tuTx(hd),left:rs};for(let z=1;z<sp&&c+z<hc;z++)carry[c+z]={t:'',left:rs};c+=sp-1;}
      const parts=carry.map(x=>x.t).filter(Boolean);
      carry.forEach(x=>{if(x.left>0)x.left--;});
      rows.push({r,vals,det:!r.classList.contains('sub')&&!r.classList.contains('total'),tot:r.classList.contains('total'),
        name:parts.slice(-2).join(' · ')});}));
    const det=rows.filter(x=>x.det&&x.vals.length===labs.length);
    const tot=rows.find(x=>x.tot&&x.vals.length===labs.length);
    const keepRow=x=>[...x.r.cells].filter(c=>c.classList.contains('head')).forEach(c=>c.setAttribute('data-tukeep',''));
    const pct=j=>det.some(x=>/%\s*$/.test(tuTx(x.vals[j])));
    const totOf=re=>{if(!tot)return null;const j=labs.findIndex(l=>re.test(l));return j>=0?{l:labs[j],v:tuTx(tot.vals[j])}:null;};
    const spend=totOf(/소진율|spend\s*%|spend rate|burn/i);
    const achs=tot?labs.map((l,j)=>/달성|achv|achiev/i.test(l)?{l,v:tuTx(tot.vals[j])}:null).filter(Boolean).slice(0,2):[];
    /* KPI 열(kpicol) — 목표 · 실적 한 쌍 */
    const kp=[];
    det.forEach(x=>{const ks=x.vals.map((c,j)=>c.classList.contains('kpicol')?j:-1).filter(j=>j>=0);
      if(ks.length<2)return;
      const a=ks[0],b=ks[1],tg=tuNum(tuTx(x.vals[a])),ac=tuNum(tuTx(x.vals[b]));
      if(!(tg>0&&ac>0))return;
      const cost=tuCost(labs[b]);
      kp.push({x,a,j:b,m:labs[b],cost,tgt:tuTx(x.vals[a]),act:tuTx(x.vals[b]),g:cost?(tg-ac)/tg:(ac-tg)/tg});});
    if(kp.length){
      /* (v123) 몇 라인이 맞췄는지보다 TOTAL 이 KPI 를 맞췄는지가 먼저 — 라인 KPI 로 가장 많이 쓴 지표(목표 · 실적 열 쌍)의 TOTAL 값 */
      const met=kp.filter(z=>z.g>=0).length;
      const best=kp.reduce((a,b)=>b.g>a.g?b:a),worst=kp.reduce((a,b)=>b.g<a.g?b:a);
      const pr=z=>Math.abs(z*100).toFixed(1)+'%';
      const say=z=>z.g>=0?L(`${z.x.name} ${z.m} ${z.act}(${pr(z.g)} ${z.cost?'절감':'초과'})`,`${z.x.name} ${z.m} ${z.act} (${pr(z.g)} ${z.cost?'under':'over'})`)
        :L(`${z.x.name} ${z.m} ${z.act}(${pr(z.g)} ${z.cost?'높음':'미달'})`,`${z.x.name} ${z.m} ${z.act} (${pr(z.g)} ${z.cost?'over':'short'})`);
      const cnt=new Map();kp.forEach(z=>{const k=z.a+'|'+z.j;cnt.set(k,(cnt.get(k)||0)+1);});
      const pairs=[...cnt].sort((a,b)=>b[1]-a[1]).map(([k])=>k.split('|').map(Number));
      const totK=([ja,jb])=>{if(!tot)return null;const tg=tuNum(tuTx(tot.vals[ja])),ac=tuNum(tuTx(tot.vals[jb]));if(!(tg>0&&ac>0))return null;
        const m=labs[jb],cost=tuCost(m);return {ja,jb,m,cost,tgt:tuTx(tot.vals[ja]),act:tuTx(tot.vals[jb]),g:cost?(tg-ac)/tg:(ac-tg)/tg};};
      const T=pairs.map(totK).filter(Boolean),T0=T[0];
      if(T0){
        h(tot.vals[T0.jb],L(`TOTAL 목표 ${T0.tgt} → ${T0.act}`,`TOTAL ${T0.tgt} → ${T0.act}`));keepRow(tot);
        h(best.x.vals[best.j],L(`최고 ${best.act}`,`Best ${best.act}`));keepRow(best.x);
        const t=T0.g>=0?L(`TOTAL ${T0.m} ${E(T0.act)} — 목표 ${T0.tgt} 대비 ${E(pr(T0.g))} ${T0.cost?'절감':'초과 달성'}`,
                            `TOTAL ${T0.m} ${E(T0.act)} — ${E(pr(T0.g))} ${T0.cost?'under':'over'} the ${T0.tgt} target`)
                       :L(`TOTAL ${T0.m} ${E(T0.act)} — 목표 ${T0.tgt} 대비 ${E(pr(T0.g))} ${T0.cost?'높음':'미달'}`,
                            `TOTAL ${T0.m} ${E(T0.act)} — ${E(pr(T0.g))} ${T0.cost?'over':'short of'} the ${T0.tgt} target`);
        const bits=[];
        if(T[1])bits.push(L(`TOTAL ${T[1].m} ${T[1].act}(목표 대비 ${pr(T[1].g)} ${T[1].g>=0?(T[1].cost?'절감':'초과'):(T[1].cost?'높음':'미달')})`,
          `TOTAL ${T[1].m} ${T[1].act} (${pr(T[1].g)} ${T[1].g>=0?(T[1].cost?'under':'over'):(T[1].cost?'over':'short')})`));
        bits.push(L(`라인 ${kp.length}개 중 ${met}개 KPI 달성`,`${met} of ${kp.length} lines on KPI target`));
        bits.push(L(`가장 좋은 ${say(best)}`,`best: ${say(best)}`));
        if(worst!==best&&worst.g<0&&bits.length<3)bits.push(L(`가장 아쉬운 ${say(worst)}`,`weakest: ${say(worst)}`));
        return {t,s:tuJoin(bits.slice(0,3))};}
      h(best.x.vals[best.j],L(`목표 ${best.tgt} → ${best.act}`,`Target ${best.tgt} → ${best.act}`));keepRow(best.x);
      if(worst!==best&&worst.g<0){h(worst.x.vals[worst.j],L(`목표 ${worst.tgt} → ${worst.act}`,`Target ${worst.tgt} → ${worst.act}`));keepRow(worst.x);}
      return {t:met===kp.length?L(`${E(kp.length+'개')} 라인 모두 KPI 목표 달성`,`All ${E(kp.length)} lines on KPI target`)
                 :L(`${kp.length}개 라인 중 ${E(met+'개')} KPI 목표 달성`,`${E(met)} of ${kp.length} lines on KPI target`)
                  +(spend?L(` · 예산 소진율 ${E(spend.v)}`,` · ${E(spend.v)} spent`):''),
        s:tuJoin([L(`가장 좋은 ${say(best)}`,`best: ${say(best)}`),worst!==best&&worst.g<0&&L(`가장 아쉬운 ${say(worst)}`,`weakest: ${say(worst)}`)])};}
    /* KPI 열이 없으면 — 달성률 열 */
    let best=null,worst=null;
    labs.forEach((l,j)=>{if(!/달성|achv|achiev/i.test(l))return;
      det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(!isFinite(v))return;
        if(!best||v>best.v)best={x,j,v,l,vt:tuTx(x.vals[j])};if(!worst||v<worst.v)worst={x,j,v,l,vt:tuTx(x.vals[j])};});});
    if(best){
      h(best.x.vals[best.j],best.vt);keepRow(best.x);
      if(worst&&worst!==best){h(worst.x.vals[worst.j],worst.vt);keepRow(worst.x);}
      return {t:achs.length?achs.map(a=>`${a.l} ${E(a.v)}`).join(' · '):L(`${det.length}개 라인 효율 비교`,`${det.length} lines compared`),
        s:tuJoin([L(`최고 ${best.x.name} ${best.l} ${best.vt}`,`top: ${best.x.name} ${best.l} ${best.vt}`),
          worst&&worst!==best&&L(`최저 ${worst.x.name} ${worst.l} ${worst.vt}`,`lowest: ${worst.x.name} ${worst.l} ${worst.vt}`),spend&&`${spend.l} ${spend.v}`])};}
    /* 목표 · 달성률 열이 없는 표 — 합계 줄의 KPI/단가 · 비율 열 / 그 열에서 가장 좋은 · 나쁜 라인 */
    const colBest=(j,low)=>{let b=null,w=null;det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(!isFinite(v)||v<=0)return;
      if(!b||(low?v<b.v:v>b.v))b={x,j,v,vt:tuTx(x.vals[j]),l:labs[j]};if(!w||(low?v>w.v:v<w.v))w={x,j,v,vt:tuTx(x.vals[j]),l:labs[j]};});return [b,w];};
    const cnt=new Map();det.forEach(x=>x.vals.forEach((c,j)=>{if(c.classList.contains('kpicol'))cnt.set(j,(cnt.get(j)||0)+1);}));
    let j0=[...cnt].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0];
    if(j0==null)j0=labs.findIndex((l,j)=>tuCost(l)&&!pct(j));
    if(j0==null||j0<0)j0=labs.findIndex((l,j)=>pct(j));
    if(j0==null||j0<0||det.length<2)return null;
    const low=tuCost(labs[j0])&&!pct(j0),[b0,w0]=colBest(j0,low);
    if(!b0)return null;
    h(b0.x.vals[j0],`${b0.l} ${b0.vt}`);keepRow(b0.x);
    if(w0&&w0!==b0){h(w0.x.vals[j0],`${w0.l} ${w0.vt}`);keepRow(w0.x);}
    const j1=labs.findIndex((l,j)=>j!==j0&&pct(j)&&/유입률|CTR|VTR|inflow|rate/i.test(l));
    const head=[tot&&`${labs[j0]} ${E(tuTx(tot.vals[j0]))}`,tot&&j1>=0&&`${labs[j1]} ${E(tuTx(tot.vals[j1]))}`].filter(Boolean);
    return {t:head.length?L(`전체 ${head.join(' · ')}`,`Overall ${head.join(' · ')}`):L(`${det.length}개 라인 효율 비교`,`${det.length} lines compared`),
      s:tuJoin([L(`${b0.l} ${low?'최저':'최고'} ${b0.x.name} ${b0.vt}`,`${low?'lowest':'highest'} ${b0.l}: ${b0.x.name} ${b0.vt}`),
        w0&&w0!==b0&&L(`${low?'최고':'최저'} ${w0.x.name} ${w0.vt}`,`${low?'highest':'lowest'}: ${w0.x.name} ${w0.vt}`)])};},
  /* 운영 코멘트 — 비어 있으면 장면을 뺀다 */
  comment(sl){
    const c=sl.src.querySelector('.cmt');const tx=tuTx(c);if(!tx)return {skip:1};
    const leaf=[...c.querySelectorAll('*')].filter(e=>!e.querySelector('div,p,li')).map(tuTx).filter(x=>x.length>=8);
    const first=(leaf.find(x=>x.length>=14)||leaf[0]||tx);
    return {t:L('이번 기간 운영 포인트','Key notes from this period'),s:first.length>120?first.slice(0,118)+'…':first};},
  /* 소재 × 일자 (v123) — 제목 = 게재가 이어지며 소재 효율이 어떻게 바뀌었나(첫 며칠 vs 마지막 며칠, 캠페인 KPI 단가),
     부제목 = 흐름과 다른 소재(오히려 나빠짐 · 크게 좋아짐) · 늦게 들어와 좋았던 소재. 강조 = 부제목에 나온 소재 줄 */
  gantt(sl,h){
    const tb=sl.src.querySelector('table.gantt')||sl.src.querySelector('table');if(!tb||!tb.tBodies.length)return null;
    const trs=[...tb.tBodies[0].rows].map(r=>{const nm=r.querySelector('td.nm');return nm?{r,nm:tuTx(nm)}:null;}).filter(Boolean);
    if(!trs.length)return null;
    let list=[];try{list=ganttCreatives().filter(c=>(c.daily.imp||[]).some(v=>v>0));}catch(e){}
    const BASE={cpm:'imp',cpc:'click',cpv:'view',cpa:'conv',cpe:'eng',cpi:'install'};
    const unitOf=c=>{try{const l=LINES.find(x=>x.id===((c.lids&&c.lids[0])||c.lid));return KPI_UNIT[kpiOf(l)]||'cpm';}catch(e){return 'cpm';}};
    const wt=new Map();list.forEach(c=>{const u=unitOf(c);wt.set(u,(wt.get(u)||0)+(c.daily.cost||[]).reduce((a,v)=>a+(+v||0),0));});
    const U=[...wt].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0],bk=BASE[U]||'imp';
    const val=(c,b)=>b>0?(U==='cpm'?c/b*1000:c/b):NaN;
    const f=v=>typeof METRICS!=='undefined'&&METRICS[U]?METRICS[U].f(v):'₩'+Math.round(v).toLocaleString('en-US');
    const pool=list.filter(c=>unitOf(c)===U);
    let SC=null;try{SC=GANTT_RANGE==='view'?viewScope():mkScope(campStart(),campEnd());}catch(e){}
    const i0=SC?SC.i0:0,i1=Math.min(SC?SC.i1:1e9,(typeof ELAPSED!=='undefined'?ELAPSED:1e9)-1);
    const dayOf=(cs,i)=>{let c=0,b=0;cs.forEach(x=>{c+=+((x.daily.cost||[])[i])||0;b+=+((x.daily[bk]||[])[i])||0;});return {i,c,b};};
    const span=cs=>{const a=[];for(let i=i0;i<=i1;i++){const d=dayOf(cs,i);if(d.c>0&&d.b>0)a.push(d);}return a;};
    const agg=a=>val(a.reduce((x,d)=>x+d.c,0),a.reduce((x,d)=>x+d.b,0));
    const days=pool.length?span(pool):[];
    const n=trs.length,lab=String(U||'').toUpperCase();
    if(days.length<4){
      return {t:L(`소재 ${E(n+'개')} 게재`,`${E(n)} creatives ran`),s:''};}
    const W=Math.max(2,Math.min(7,Math.floor(days.length/3)));
    const v1=agg(days.slice(0,W)),v2=agg(days.slice(-W)),g=(v1-v2)/v1;       /* 단가 — 내려가면 좋아진 것 */
    const pc=x=>Math.abs(x*100).toFixed(1)+'%';
    const t=Math.abs(g)<.03?L(`게재 내내 ${lab} ${E(f(v2))} 안팎으로 고르게 유지`,`${lab} held steady around ${E(f(v2))}`)
      :g>0?L(`게재가 이어지며 ${lab} ${f(v1)} → ${E(f(v2))}, ${E(pc(g)+' 개선')}`,`${lab} improved ${E(pc(g))} over the flight — ${f(v1)} → ${E(f(v2))}`)
      :L(`게재가 이어지며 ${lab} ${f(v1)} → ${E(f(v2))}, ${E(pc(g))} 상승`,`${lab} rose ${E(pc(g))} over the flight — ${f(v1)} → ${E(f(v2))}`);
    /* 소재마다 — 첫 · 마지막 며칠, 들어온 날, 전체 단가 */
    const avg=agg(days),bits=[];
    pool.forEach(c=>{const a=span([c]);if(a.length<4)return;const w=Math.max(2,Math.min(7,Math.floor(a.length/3)));
      const c1=agg(a.slice(0,w)),c2=agg(a.slice(-w)),gc=(c1-c2)/c1,va=agg(a),nm=c.name||'';
      if(!nm||!isFinite(gc))return;
      /* 흐름과 반대 */
      if(Math.abs(gc)>=.15&&Math.sign(gc)!==Math.sign(g||1))bits.push({c,sc:Math.abs(gc)+.2,
        tx:gc<0?L(`${nm}는 오히려 ${lab} ${pc(gc)} 상승(${f(c1)} → ${f(c2)})`,`${nm}: ${lab} up ${pc(gc)} instead (${f(c1)} → ${f(c2)})`)
               :L(`${nm}는 홀로 ${lab} ${pc(gc)} 개선(${f(c1)} → ${f(c2)})`,`${nm}: ${lab} improved ${pc(gc)} against the trend`),
        chip:L(`${lab} ${gc<0?'+':'−'}${pc(gc)}`,`${lab} ${gc<0?'+':'−'}${pc(gc)}`)});
      else if(Math.abs(gc)>=.2)bits.push({c,sc:Math.abs(gc)*.8,same:gc>0?'down':'up',
        tx:gc>0?L(`${nm} ${f(c1)} → ${f(c2)}(−${pc(gc)})`,`${nm} ${f(c1)} → ${f(c2)} (−${pc(gc)})`)
               :L(`${nm} ${f(c1)} → ${f(c2)}(+${pc(gc)})`,`${nm} ${f(c1)} → ${f(c2)} (+${pc(gc)})`),
        chip:L(`${lab} ${gc>0?'−':'+'}${pc(gc)}`,`${lab} ${gc>0?'−':'+'}${pc(gc)}`)});
      bits.push({c,sc:.01+(avg-va)/avg*.01,tx:L(`가장 효율 좋은 소재 ${nm} ${lab} ${f(va)}`,`most efficient: ${nm} ${lab} ${f(va)}`),chip:L(`${lab} ${f(va)}`,`${lab} ${f(va)}`),best:1,va});
      /* 늦게 들어와 좋았던 소재 */
      const late=a[0].i-days[0].i;
      if(late>=Math.max(3,days.length*.2)&&va<avg*.85)bits.push({c,sc:(1-va/avg)+.1,
        tx:L(`${tuDay(ALLDATES[a[0].i])} 투입된 ${nm} ${lab} ${f(va)} — 평균보다 ${pc(1-va/avg)} 낮음`,`${nm}, added ${tuDay(ALLDATES[a[0].i])}: ${lab} ${f(va)}, ${pc(1-va/avg)} below average`),
        chip:L(`${tuDay(ALLDATES[a[0].i])} 투입`,`Added ${tuDay(ALLDATES[a[0].i])}`)});});
    /* '가장 효율 좋은 소재'는 단가가 가장 낮은 하나만 후보로 */
    const bestOnly=bits.filter(b=>b.best).sort((a,b)=>a.va-b.va)[0];
    const cands=bits.filter(b=>!b.best).concat(bestOnly?[bestOnly]:[]);
    const pick=[];cands.sort((a,b)=>b.sc-a.sc).forEach(b=>{if(pick.length<2&&!pick.some(x=>x.c===b.c))pick.push(b);});
    pick.forEach(b=>{const tr=trs.find(x=>x.nm===b.c.name)||trs.find(x=>x.nm.startsWith(b.c.name));if(tr)h(tr.r,b.chip);});
    /* 같은 방향으로 크게 움직인 소재는 머리말을 한 번만 — '상승 폭이 큰 소재 A … · B …' */
    let said=false;
    const sub=pick.map(b=>{if(!b.same)return b.tx;const pre=said?'':(b.same==='up'?L(`${lab} 상승 폭이 큰 소재 `,`${lab} rose most: `):L(`${lab} 개선 폭이 큰 소재 `,`${lab} improved most: `));said=true;return pre+b.tx;});
    if(!sub.length)sub.push(L(`소재 ${n}개 · 기간 평균 ${lab} ${f(avg)}`,`${n} creatives · ${lab} ${f(avg)} on average`));
    return {t,s:tuJoin(sub)};},
  /* 효율 우수 소재 — 기준별 1위 모아 보기 */
  creative(sl,h){
    const cols=[...sl.src.querySelectorAll('.crcol')].map(c=>{const ld=c.querySelector('.cr.lead')||c.querySelector('.cr');
      return ld&&{m:tuTx(c.querySelector('.crband .t')),ld,nm:tuTx(ld.querySelector('.meta .nm')),v:tuTx(ld.querySelector('.eff b')),md:tuTx(ld.querySelector('.media'))};})
      .filter(x=>x&&x.nm);
    if(!cols.length)return null;
    cols.forEach(x=>h(x.ld,L(`${x.m} 1위`,`#1 ${x.m}`)));
    const by=new Map();cols.forEach(x=>{if(!by.has(x.nm))by.set(x.nm,[]);by.get(x.nm).push(x.m);});
    const t=[...by].map(([nm,ms])=>`${ms.join(' · ')} ${E(nm)}`).join(' / ');
    return {t:L(`효율 1위 — ${t}`,`#1 by efficiency — ${t}`),s:tuJoin(cols.map(x=>`${x.m} ${x.v}`).concat(cols[0].md?[cols[0].md]:[]))};},
  /* 히트맵 — 평일 · 휴일 단가 차이 / 가장 효율 좋은 · 비싼 요일 */
  heat(sl,h){
    const t=sl.src.querySelector('table.heat')||sl.src.querySelector('table');if(!t||!t.tBodies.length)return null;
    const groups=[];let cur=null;
    for(const r of t.tBodies[0].rows){
      if(r.classList.contains('hcat')){cur={cat:tuTx(r),rows:[]};groups.push(cur);continue;}
      if(r.querySelector('td.hm')&&cur)cur.rows.push(r);}
    const grp=(groups.find(g=>/요일|week/i.test(g.cat))||groups[0]||{rows:[]}).rows;
    if(grp.length<2)return null;
    const val=(r,j)=>tuNum(tuTx(r.querySelectorAll('td.hm')[j]));
    const nc=grp[0].querySelectorAll('td.hm').length,win=new Map(),lose=new Map();
    for(let j=0;j<nc;j++){let lo=null,hi=null;
      grp.forEach(r=>{const v=val(r,j);if(!isFinite(v)||v<=0)return;if(!lo||v<lo.v)lo={r,v};if(!hi||v>hi.v)hi={r,v};});
      if(lo)win.set(lo.r,(win.get(lo.r)||0)+1);if(hi)lose.set(hi.r,(lose.get(hi.r)||0)+1);}
    if(!win.size)return null;
    const best=[...win].sort((a,b)=>b[1]-a[1])[0],worst=[...lose].sort((a,b)=>b[1]-a[1])[0];
    const nm=r=>tuTx(r.querySelector('td.head'));
    h(best[0],L(`최저 단가 ${best[1]}/${nc}`,`Lowest cost ${best[1]}/${nc}`));
    if(worst&&worst[0]!==best[0])h(worst[0],L(`최고 단가 ${worst[1]}/${nc}`,`Highest cost ${worst[1]}/${nc}`));
    /* 평일 · 휴일 줄이 있으면 — 열마다 평일 ÷ 휴일 단가의 평균 */
    const hw=groups.find(g=>g!==groups.find(x=>/요일|week/i.test(x.cat))&&g.rows.length===2);
    let title='';
    if(hw){const [a,b]=hw.rows,rs=[];
      for(let j=0;j<nc;j++){const x=val(a,j),y=val(b,j);if(x>0&&y>0)rs.push(y/x);}
      const rr=tuMean(rs);
      if(isFinite(rr)){const d=Math.abs(1-rr)*100,wk=nm(b),hol=nm(a).replace(/\s*\(.*\)\s*/,'');
        title=d<1?L(`${wk} · ${hol} 단가가 거의 같아요`,`${wk} and ${hol} cost about the same`)
          :rr<1?L(`${wk} 단가가 ${hol}보다 평균 ${E(d.toFixed(1)+'%')} 낮아요`,`${wk} costs ${E(d.toFixed(1)+'%')} less than ${hol} on average`)
          :L(`${hol} 단가가 ${wk}보다 평균 ${E(d.toFixed(1)+'%')} 낮아요`,`${hol} costs ${E(d.toFixed(1)+'%')} less than ${wk} on average`);}}
    if(!title){const avg=grp.map(r=>{const vs=[];for(let j=0;j<nc;j++){const v=val(r,j);if(v>0)vs.push(v);}return tuMean(vs);});
      const mx=Math.max(...avg.filter(isFinite)),mn=Math.min(...avg.filter(isFinite));
      title=isFinite(mx)&&mn>0?L(`요일에 따라 단가 차이 최대 ${E(((mx/mn-1)*100).toFixed(0)+'%')}`,`Cost varies up to ${E(((mx/mn-1)*100).toFixed(0)+'%')} by day`)
        :L(`요일별 단가 비교`,`Cost by day of week`);}
    return {t:title,s:tuJoin([L(`가장 효율 좋은 ${nm(best[0])}(최저 단가 ${best[1]}/${nc})`,`most efficient: ${nm(best[0])} (lowest cost ${best[1]}/${nc})`),
      worst&&worst[0]!==best[0]&&L(`가장 비싼 ${nm(worst[0])}`,`priciest: ${nm(worst[0])}`)])};},
  /* 분포(트리맵) — 상위 몇 곳이 얼마나 차지하는지 / 각 비중 */
  treemap(sl,h){
    const ss=[...sl.src.querySelectorAll('.sect')].map(s=>{const m=/^(.*?)\s*(\d[\d.,]*%)$/.exec(tuTx(s.querySelector('.sh')));
      return m&&{s,nm:m[1].trim(),p:m[2],v:tuNum(m[2])};}).filter(Boolean).sort((a,b)=>b.v-a.v);
    if(!ss.length)return null;
    const met=tuTx($('tmapTitle')).replace(/\s*(분포|distribution|breakdown)\s*$/i,'')||L('값','value');
    const k=ss[0].v>=60||ss.length<3?1:2,top=ss.slice(0,k),sum=top.reduce((a,x)=>a+x.v,0).toFixed(1)+'%';
    top.forEach(x=>h(x.s,x.p));
    return {t:k===1?L(`${met}의 ${E(ss[0].p)}가 ${ss[0].nm} 한 곳에`,`${ss[0].nm} alone holds ${E(ss[0].p)} of ${met}`)
                   :L(`상위 2곳이 ${met}의 ${E(sum)}`,`Top 2 hold ${E(sum)} of ${met}`),
      s:tuJoin(ss.slice(0,4).map(x=>`${x.nm} ${x.p}`).concat(ss.length>4?[L(`나머지 ${ss.length-4}곳`,`${ss.length-4} more`)]:[]))};},
  /* 효율 버블 — 두 효율 모두 상위권인 원의 수 / 가장 오른쪽 위 */
  bubble(sl,h){
    const cs=[...sl.src.querySelectorAll('circle.bub[data-g]')];if(!cs.length)return null;
    const ax=[...sl.src.querySelectorAll('text.axt')].map(tuTx);
    const gx=c=>+c.getAttribute('data-gx'),gy=c=>+c.getAttribute('data-gy');
    const both=cs.filter(c=>gx(c)>=.5&&gy(c)>=.5);
    const b=cs.reduce((a,c)=>+c.getAttribute('data-g')>+a.getAttribute('data-g')?c:a);
    const nm=c=>c.getAttribute('data-nm')||L('(미지정)','(Unassigned)');
    (both.length?both:[b]).forEach(c=>h(c,c===b?L('효율 최상','Most efficient'):''));
    return {t:both.length?L(`${cs.length}개 중 ${E(both.length+'개')}가 두 효율 모두 상위권`,`${E(both.length)} of ${cs.length} lead on both efficiency axes`)
                         :L(`${cs.length}개 중 효율 1위 ${E(nm(b))}`,`Most efficient of ${cs.length}: ${E(nm(b))}`),
      s:tuJoin([L(`가장 앞선 ${nm(b)}`,`best: ${nm(b)}`),ax[0]&&`${ax[0]} ${b.getAttribute('data-xf')||''}`,ax[1]&&`${ax[1]} ${b.getAttribute('data-yf')||''}`])};},
  /* 유입 ① (v123) — 제목 = IWV 단가 + 어느 매체에서 어느 랜딩으로 가장 많이 들어왔나, 부제목 = 그 양 · 2위 길 · 랜딩 비중.
     강조 = 유입 흐름의 1위 띠 · IWV 단가 칸 */
  infA(sl,h){
    const ks=[...sl.src.querySelectorAll('.infk')].map(k=>({k:tuTx(k.querySelector('span')).replace(/\s*\([^)]*\)\s*$/,''),v:tuTx(k.querySelector('b')),el:k}))
      .filter(x=>x.k&&x.v);
    if(!ks.length)return null;
    const cp=ks.find(x=>/유입당 단가|단가|cost per/i.test(x.k)),iw=ks.find(x=>/IWV/i.test(x.k)),rt=ks.find(x=>/유입률|inflow rate/i.test(x.k));
    const md=tuInfModel(),M=md&&md.M;
    let fl=[];
    if(M)M.rows.forEach((g,i)=>M.R.forEach((r,j)=>{const v=M.flowTo(g,r);if(v>0)fl.push({i,j,v,m:infName(g),p:r.l,other:r.kind==='other'});}));
    fl.sort((a,b)=>b.v-a.v);
    const TV=M?M.TV:0,top=fl.find(x=>!x.other)||null,second=top?fl.find(x=>x!==top&&!x.other):null;
    const pc=v=>TV?tuPc(v/TV,0):'';
    if(top){const p=sl.src.querySelector(`path.sklink.zf[data-i="${top.i}"][data-j="${top.j}"]`);
      h(p||null,`${top.m} → ${top.p} ${fmt(top.v)}`);}
    if(cp)h(cp.el,'');
    const lands=M?M.R.map((r,j)=>({p:r.l,v:fl.filter(x=>x.j===j).reduce((a,x)=>a+x.v,0),other:r.kind==='other'})).filter(x=>x.v>0&&!x.other).sort((a,b)=>b.v-a.v):[];
    if(!top){const head=[cp&&L(`IWV 단가 ${E(cp.v)}`,`Cost per IWV ${E(cp.v)}`),iw&&L(`IWV ${E(iw.v)}`,`${E(iw.v)} IWV`)].filter(Boolean);
      return {t:head.length?head.join(' · '):`${ks[0].k} ${E(ks[0].v)}`,s:tuJoin(ks.filter(x=>x!==cp&&x!==iw).map(x=>`${x.k} ${x.v}`))};}
    const path=`${top.m} → ${top.p}`;
    const t=cp?L(`IWV 단가 ${E(cp.v)} — ${E(path)} 유입이 가장 많아요`,`Cost per IWV ${E(cp.v)} — most inflow came via ${E(path)}`)
      :L(`${E(path)} 유입이 가장 많아요`,`Most inflow came via ${E(path)}`);
    return {t,s:tuJoin([L(`${path} ${fmt(top.v)}회(전체의 ${pc(top.v)})`,`${path}: ${fmt(top.v)} (${pc(top.v)} of all)`),
      second&&L(`2위 ${second.m} → ${second.p} ${fmt(second.v)}회`,`#2 ${second.m} → ${second.p} ${fmt(second.v)}`),
      lands.length>1?L(`랜딩 비중 ${lands.slice(0,3).map(x=>`${x.p} ${pc(x.v)}`).join(' · ')}`,`landing share ${lands.slice(0,3).map(x=>`${x.p} ${pc(x.v)}`).join(' · ')}`)
        :rt&&`${rt.k} ${rt.v}`])};},
  /* 유입 ② (v123) — 제목 = 전체 유입 효율(유입률 · 평균 체류 · 30초 이상), 부제목 = 매체마다 특히 좋았던 부분
     (IWV 단가 최저 · 유입률 최고 · 체류 최장). 강조 = 그래프 세 개를 차례로 — 지도의 그 매체 원 · 가장 오래 머문 랜딩 · 가장 오래 머문 매체 */
  infB(sl,h){
    const cells=[...sl.src.querySelectorAll('.infgrid>.infcell')];if(!cells.length)return null;
    const md=tuInfModel(),A=md&&md.A;
    const rows=md?md.rows.filter(g=>(+g.b.iwv||0)>=(typeof INF_MIN!=='undefined'?INF_MIN:10)&&g.key!=='__etc'):[];
    const by=(fn,low)=>{let b=null;rows.forEach(g=>{const v=fn(g.b);if(!isFinite(v)||v<=0)return;if(!b||(low?v<b.v:v>b.v))b={g,v,nm:infName(g)};});return b;};
    const bC=by(infCpv,true),bR=by(infRate),bD=by(b=>dwSum(b)>=10?dwAvg(b):NaN);
    const dur=t=>{const m=/(\d+)\s*(?:분|m)/.exec(t),s=/(\d+)\s*(?:초|s)/.exec(t);return (m?+m[1]*60:0)+(s?+s[1]:0);};
    const txt=b=>b?[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).filter(Boolean).join(' '):'';
    /* ① 지도 — IWV 단가가 가장 낮은 매체의 원(이름표로 찾는다) */
    const mp=cells.find(c=>c.classList.contains('infmapc'));
    if(mp){const who=bC||bR;let circ=null;
      if(who){const labs=[...mp.querySelectorAll('text.mlab')],t=labs.find(x=>{const s=tuTx(x).replace(/…$/,'');return s&&(who.nm===s||who.nm.endsWith(s)||who.nm.startsWith(s)||s.endsWith(who.g.lab));});
        if(t){const tx=+t.getAttribute('x'),ty=+t.getAttribute('y');
          circ=[...mp.querySelectorAll('circle.mc')].map(c=>({c,d:Math.hypot(+c.getAttribute('cx')-tx,+c.getAttribute('cy')-ty)})).sort((a,b)=>a.d-b.d)[0];circ=circ&&circ.c;}}
      h(circ||mp,who?(who===bC?L(`IWV 단가 최저 ${who.nm}`,`Lowest cost per IWV: ${who.nm}`):L(`유입률 최고 ${who.nm}`,`Top inflow rate: ${who.nm}`)):L('유입 효율 지도','Efficiency map'),0);}
    /* ② 랜딩별 체류 — 가장 긴 랜딩 */
    const ld=cells.find(c=>c.classList.contains('infldc'));let bl=null;
    if(ld){const ls=[...ld.querySelectorAll('.ldcol')].map(c=>({c,nm:tuTx(c.querySelector('.ldname')),t:txt(c.querySelector('.ldavg b'))})).filter(x=>x.nm&&dur(x.t)>0);
      bl=ls.length?ls.reduce((a,x)=>dur(x.t)>dur(a.t)?x:a):null;
      h(bl?bl.c:ld,bl?L(`가장 오래 머문 랜딩 ${bl.t}`,`Longest stay ${bl.t}`):L('랜딩별 체류','Time by landing'),1);}
    /* ③ 매체별 체류 — 가장 긴 매체 */
    const dw=cells.find(c=>c.classList.contains('infdwc'));
    if(dw){const rs=[...dw.querySelectorAll('.dwrow')].map(r=>({r,nm:tuTx(r.querySelector('.dwl b')),t:txt(r.querySelector('.dwr b'))})).filter(x=>dur(x.t)>0);
      const b=rs.length?rs.reduce((a,x)=>dur(x.t)>dur(a.t)?x:a):null;
      h(b?b.r:dw,b?L(`체류 최장 ${b.t}`,`Longest stay ${b.t}`):L('매체별 체류','Time by media'),2);}
    const rate=A?infRate(A):NaN,dwa=A?dwAvg(A):NaN,d30=A&&typeof dw30Rate==='function'?dw30Rate(A):NaN;
    const head=[isFinite(rate)&&L(`유입률 ${E(pct(rate,2))}`,`Inflow rate ${E(pct(rate,2))}`),isFinite(dwa)&&L(`평균 체류 ${E(fmtDur(dwa))}`,`avg. time on site ${E(fmtDur(dwa))}`),
      isFinite(d30)&&L(`30초 이상 ${pct(d30,1)}`,`${pct(d30,1)} stay 30s+`)].filter(Boolean);
    /* 같은 매체가 여러 부분에서 1위면 한 번에 */
    const wins=new Map();
    [[bC,L('IWV 단가','cost per IWV'),L('최저','lowest'),v=>won(Math.round(v))],[bR,L('유입률','inflow rate'),L('최고','top'),v=>pct(v,2)],
     [bD,L('체류','time on site'),L('최장','longest'),v=>fmtDur(v)]].forEach(([b,an,w,fv])=>{if(!b)return;
      if(!wins.has(b.nm))wins.set(b.nm,[]);wins.get(b.nm).push({an,w,v:fv(b.v)});});
    const sub=[...wins].map(([nm,a])=>a.length>1?L(`${nm} — ${a.map(x=>`${x.an} ${x.v}`).join(' · ')} 모두 1위`,`${nm} leads on ${a.map(x=>`${x.an} ${x.v}`).join(' · ')}`)
      :L(`${a[0].an} ${a[0].w} ${nm} ${a[0].v}`,`${a[0].w} ${a[0].an}: ${nm} ${a[0].v}`));
    if(bl&&sub.length<3)sub.push(L(`가장 오래 머문 랜딩 ${bl.nm} ${bl.t}`,`longest landing: ${bl.nm} ${bl.t}`));
    return {t:head.length?head.join(' · '):L('유입 효율 · 랜딩 · 체류','Efficiency, landing and time on site'),s:tuJoin(sub.slice(0,3))};},
  /* 유입 ③ — 상세 표 */
  infC(sl){
    if(!sl.src.querySelector('table'))return null;
    return {t:tuTx(sl.src.querySelector('.infh b'))||L('유입 효율 상세','Inflow detail'),
      s:L('매체별 유입 · 체류 · 단가를 한 표로','Inflow, dwell time and cost by media in one table')};}};

/* ---------- 3. 표지 · 마무리 ---------- */
function tuCover(){
  const its=[...document.querySelectorAll('#campBar .it')].map(i=>{const v=i.querySelector('.v');
    const main=v?[...v.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(' ').replace(/\s+/g,' ').trim():'';
    return {k:tuTx(i.querySelector('.k')),v:main||tuTx(v),sub:v&&v.querySelector('span')?tuTx(v.querySelector('span')):''};});
  const get=re=>its.find(x=>re.test(x.k));
  const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||(get(/캠페인|campaign/i)||{}).v||'Campaign';
  const adv=(get(/광고주|advertiser/i)||{}).v||'';
  const tiles=[];
  const per=get(/기간|period|flight/i);
  if(per)tiles.push({k:per.k,v:per.v.replace(/^(\d{4})\.(\d{1,2}\.\d{1,2})\s*[–~-]\s*\1\.(\d{1,2}\.\d{1,2})$/,'$1.$2 – $3')});
  const bud=get(/예산|budget/i);if(bud)tiles.push({k:bud.k,v:bud.v});
  const sp=document.querySelector('#donuts .donut.spend');
  if(sp&&tuVis(sp))tiles.push({k:tuTx(sp.querySelector('.dhd .k'))||L('예산 소진율','Budget spent'),v:tuTx(sp.querySelector('.achv'))});
  else{const val=get(/value/i);if(val)tiles.push({k:val.k,v:val.v,s:val.sub});}
  const ph=document.querySelector('#paceBox .phead');
  if(ph&&tuVis(ph)){const m=/(\d+(?:\.\d+)?)\s*%/.exec(tuTx(ph));if(m)tiles.push({k:L('기간 경과','Flight elapsed'),v:m[1]+'%'});}
  const src=document.createElement('div');src.className='tu-src tu-ch';src.setAttribute('data-noi18n','');
  src.innerHTML=`<div class="tu-tiles">${tiles.map((x,i)=>`<div class="tu-tile" style="--i:${i}"><div class="k">${esc(x.k)}</div><div class="v">${esc(x.v)}</div>${x.s?`<div class="s">${esc(x.s)}</div>`:''}</div>`).join('')}</div>`;
  return tuApplyEdit({kind:'cover',key:'cover',label:L('데이터 투어','Data tour'),src,W:0,tblX:0,chips:[],t:nm,s:tuJoin([adv,L('캠페인 성과 리뷰','Campaign performance review')]),noEm:1,tiles});}
/* 핵심 요약 — 장면을 갈래로 묶어 짧게(v119). 갈래에 없는 영역은 '운영 · 기타' 로 */
const TU_CATS=[
  {ko:'개요 · 달성',en:'Overview & delivery',keys:['struct','pace','stat','kpi']},
  {ko:'추이 · 분포',en:'Trends & mix',keys:['daily','raw','trend','treemap','heat','bubble']},
  {ko:'매체 · 상품 효율',en:'Media & product efficiency',keys:['sum','mix']},
  {ko:'소재',en:'Creatives',keys:['creative','gantt']},
  {ko:'사이트 유입',en:'Site traffic',keys:['infA','infB','infC']},
  {ko:'운영 · 기타',en:'Notes & more',keys:['comment','misc']}];
function tuCats(body){
  const out=TU_CATS.map(c=>({n:L(c.ko,c.en),items:[]})),other=out[out.length-1];
  body.forEach((s,k)=>{const i=TU_CATS.findIndex(c=>c.keys.includes(s.key));(i>=0?out[i]:other).items.push({s,k,go:TU.slides.indexOf(s)});});
  /* 같은 갈래에 같은 종류가 여럿이면(서머리 표 여러 개) 영역 이름을 작게 붙여 구분 */
  out.forEach(c=>c.items.forEach(x=>{x.lab=c.items.filter(y=>y.s.key===x.s.key).length>1;}));
  return out.filter(c=>c.items.length);}
function tuEnd(){
  const body=TU.slides.filter(s=>s.kind==='body');
  const cats=tuCats(body),nc=cats.length<=3?cats.length:cats.length===4?2:3;
  const src=document.createElement('div');src.className='tu-src tu-ch';src.setAttribute('data-noi18n','');
  src.innerHTML=`<div class="tu-cats" style="--nc:${nc}">${cats.map((c,ci)=>
      `<div class="tu-cat" style="--i:${ci}"><div class="tu-cath"><span class="d"></span><b>${esc(c.n)}</b><span class="c">${c.items.length}</span></div>`
      +c.items.map(x=>`<button type="button" class="tu-rc" data-go="${x.go}" title="${esc(x.s.label)}"><span class="n">${String(x.k+1).padStart(2,'0')}</span>`
        +`<span class="tx">${x.lab?`<span class="l">${esc(x.s.label)}</span>`:''}<span class="t">${tuWords(x.s.t)}</span></span></button>`).join('')+`</div>`).join('')}</div>
    <div class="tu-acts">
      <button type="button" class="tu-btn pri" data-act="ppt">${TU_IC.ppt}<span data-lab>${esc(L('PPT로 저장','Save as PPT'))}</span></button>
      <button type="button" class="tu-btn" data-act="html" title="${esc(L('이 투어를 파일 하나(HTML)로 — 인터넷 없이도 브라우저에서 바로 발표할 수 있습니다','This tour as one HTML file — present from any browser, even offline'))}">${TU_IC.html}<span data-lab>${esc(L('파일로 저장 (HTML)','Save as file (HTML)'))}</span></button>
      <button type="button" class="tu-btn" data-act="restart"><span>↺ ${esc(L('처음부터','From the start'))}</span></button>
      <button type="button" class="tu-btn" data-act="close"><span>${esc(L('닫기','Close'))}</span></button>
    </div>`;
  return tuApplyEdit({kind:'end',key:'end',label:L('핵심 요약','Key takeaways'),src,W:0,tblX:0,chips:[],cats,
    t:L('오늘의 핵심, 한 장으로','Today’s takeaways at a glance'),
    s:L(`${body.length}개 장면을 ${cats.length}갈래로 · 항목을 누르면 그 장면으로 돌아갑니다`,`${body.length} scenes in ${cats.length} groups · click any item to jump back`),noEm:1});}
/* 아이콘 */
const TU_IC={
  ppt:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 1.4h6.5l3.6 3.6v9a.8.8 0 0 1-.8.8H3.2a.8.8 0 0 1-.8-.8V2.2a.8.8 0 0 1 .8-.8z" fill="#d35230"/><path d="M9.7 1.4v2.9a.7.7 0 0 0 .7.7h2.9z" fill="#f2a58d"/><path d="M5.6 12V7h2.1a1.6 1.6 0 0 1 0 3.2H5.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  html:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.8 5.6h12.4" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 8.3l2.9 1.6-2.9 1.6z" fill="currentColor"/></svg>',
  edit:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.4 2.7l2.9 2.9-7.7 7.7-3.5.6.6-3.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 4.1l2.9 2.9" stroke="currentColor" stroke-width="1.6"/></svg>',
  dl:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2v7.9M4.7 6.9L8 10.2l3.3-3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.8 11v1.8c0 .6.4 1 1 1h8.4c.6 0 1-.4 1-1V11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'};

/* ---------- 4. 화면 ---------- */
function tuHint(){return L('← → 넘기기 · P 자동 재생 · E 문구 편집 · M 배경음 · Esc 닫기','← → to move · P autoplay · E edit text · M music · Esc to close');}
function tuShell(){
  /* data-noi18n — 영어 화면에서 번역기가 투어 글(이미 L() 로 만든 글 · 캠페인 이름)을 다시 옮기지 않게 */
  const el=document.createElement('div');el.className='tu';el.setAttribute('data-noi18n','');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label',L('데이터 투어','Data tour'));
  const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'';
  el.innerHTML=`<div class="tu-floorw"><div class="tu-floor"></div></div><div class="tu-glow"></div>
    <div class="tu-top tu-ch">
      <div class="tu-prog">${TU.slides.map((s,i)=>`<i data-go="${i}" title="${esc(s.kind==='body'?s.label:s.kind==='cover'?L('표지','Cover'):L('핵심 요약','Key takeaways'))}"></i>`).join('')}</div>
      <div class="tu-meta"><span class="tu-brand"><span class="dot"></span><b>DATA TOUR</b><span class="cn">${esc(nm)}</span></span>
        <span class="sp"></span><span class="tu-cnt"></span>
        <button type="button" class="tu-ib tu-ed" title="${esc(L('이 장 문구 편집 (E)','Edit this slide’s text (E)'))}" aria-pressed="false">${TU_IC.edit}</button>
        <span class="tu-dlw"><button type="button" class="tu-ib tu-dl" title="${esc(L('다운로드','Download'))}" aria-haspopup="menu" aria-expanded="false">${TU_IC.dl}</button>
          <span class="tu-dlm" role="menu">
            <button type="button" class="tu-mi" role="menuitem" data-act="ppt"><span class="ic">${TU_IC.ppt}</span><span class="tx"><b data-lab>${esc(L('PPT로 저장','Save as PPT'))}</b><small>${esc(L('PowerPoint · 글은 고쳐 쓸 수 있게','PowerPoint · editable text'))}</small></span></button>
            <button type="button" class="tu-mi" role="menuitem" data-act="html"><span class="ic">${TU_IC.html}</span><span class="tx"><b data-lab>${esc(L('파일로 저장 (HTML)','Save as file (HTML)'))}</b><small>${esc(L('인터넷 없이도 브라우저에서 바로 발표','Present from any browser, even offline'))}</small></span></button>
          </span></span>
        <button type="button" class="tu-ib tu-snd" aria-pressed="false"></button>
        <button type="button" class="tu-ib tu-play" title="${esc(L('자동 재생 (P)','Autoplay (P)'))}" aria-pressed="false"></button>
        <button type="button" class="tu-ib tu-x" title="${esc(L('닫기 (Esc)','Close (Esc)'))}"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div></div>
    <div class="tu-deck"></div>
    <button type="button" class="tu-nav prev" aria-label="${esc(L('이전','Previous'))}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button type="button" class="tu-nav next" aria-label="${esc(L('다음','Next'))}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="tu-hint tu-ch">${esc(tuHint())}</div>`;
  return el;}
function tuPaintPlay(){
  const b=TU.el&&TU.el.querySelector('.tu-play');if(!b)return;
  b.setAttribute('aria-pressed',TU.play?'true':'false');
  b.innerHTML=TU.play?'<svg viewBox="0 0 16 16"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
    :'<svg viewBox="0 0 16 16"><path d="M5.2 3.4v9.2l7.3-4.6z" fill="currentColor"/></svg>';}
function tuPaintChrome(){
  const el=TU.el;if(!el)return;
  const n=TU.slides.length,i=TU.i;
  el.querySelectorAll('.tu-prog i').forEach((s,k)=>{s.classList.toggle('done',k<i);s.classList.toggle('cur',k===i);
    s.classList.toggle('play',k===i&&TU.play);if(k===i&&TU.play)s.style.setProperty('--dur',tuDur(TU.slides[i])+'ms');});
  el.querySelector('.tu-cnt').textContent=`${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}`;
  el.querySelector('.tu-nav.prev').disabled=i<=0;
  el.querySelector('.tu-nav.next').disabled=i>=n-1;
  el.querySelector('.tu-ed').setAttribute('aria-pressed',TU.ed?'true':'false');
  tuPaintPlay();}
/* 장면 하나를 무대에 */
function tuMount(sl){
  const node=document.createElement('section');node.className='tu-sl tu-'+sl.kind;node.setAttribute('data-noi18n','');
  const no=TU.slides.filter(s=>s.kind==='body').indexOf(sl)+1;
  const eye=sl.kind==='body'?`<span class="no">${String(no).padStart(2,'0')}</span>${esc(sl.label)}`
    :sl.kind==='cover'?`<span class="no">▶</span>DATA TOUR`:`<span class="no">✓</span>${esc(sl.label)}`;
  node.innerHTML=`<div class="tu-head tu-ch"><div class="tu-eye">${eye}</div>
      <h2 class="tu-title">${tuWords(sl.t)}</h2>${sl.s?`<p class="tu-sub">${esc(sl.s)}</p>`:''}</div>
    <div class="tu-stage"><div class="tu-par"><div class="tu-in"><div class="tu-fit"></div></div></div></div>`;
  const src=sl.src.cloneNode(true);
  node.querySelector('.tu-fit').appendChild(src);
  TU.deck.appendChild(node);
  tuLayout(node,sl);
  return node;}
/* 무대 크기에 맞춰 줄이고 늘리기 — 표는 글자가 읽힐 만큼(0.86배 이상) 두고 옆으로 옮겨 가며 본다 */
function tuLayout(node,sl){
  const head=node.querySelector('.tu-head'),stage=node.querySelector('.tu-stage');
  const fit=node.querySelector('.tu-fit'),src=fit.firstElementChild;
  const top=head.offsetTop+head.offsetHeight+Math.max(14,innerHeight*.028);
  stage.style.top=top+'px';
  const sw=Math.max(200,stage.clientWidth),sh=Math.max(160,stage.clientHeight);
  let s;
  src.style.transform='none';src.style.zoom='';
  if(sl.kind!=='body'){
    src.style.width=Math.round(sw)+'px';
    /* 핵심 요약 — 갈래 카드를 모두 같은 크기로(가장 큰 카드에 맞춘다) */
    const cs=[...src.querySelectorAll('.tu-cat')];
    if(cs.length){cs.forEach(c=>c.style.height='');const mh=Math.max(...cs.map(c=>c.offsetHeight));cs.forEach(c=>c.style.height=mh+'px');}
    s=Math.min(1,sh/src.offsetHeight);}
  else if(sl.tblX>0){
    const full=sl.W+sl.tblX;
    s=Math.max(.86,Math.min(1.15,sw/full));
    src.style.width=Math.round(Math.max(sl.W,Math.min(full,sw/s)))+'px';
    const h=src.offsetHeight;if(h*s>sh)s=sh/h;
    s=Math.min(s,sw/src.offsetWidth);}
  else{src.style.width=sl.W+'px';s=tuWrap(src,sl,sw,sh,1.25);}
  s=Math.max(.2,s);
  const w=src.offsetWidth,h=src.offsetHeight;
  /* (v123) transform 으로 줄이면 표의 1px 선이 화소 사이에 걸려 굵기 · 진하기가 줄마다 달라 보였다 — zoom 은 다시 배치해서 선 · 글자가 또렷하다 */
  src.style.zoom=String(s);
  fit.style.width=Math.round(w*s)+'px';fit.style.height=Math.round(h*s)+'px';
  /* 남는 세로 여백은 위 30% · 아래 70% — 제목과 가깝게 */
  node.querySelector('.tu-in').style.marginTop=sl.kind==='body'?Math.max(0,Math.round((sh-h*s)*.3))+'px':'';
  node.__s=s;}
/* 카드 줄(지표 · KPI 도넛)이 길어 한 줄이면 너무 작아질 때 — 2~4줄로 접어 가장 크게 보이는 쪽을 고른다 */
function tuWrap(src,sl,sw,sh,cap){
  src.classList.remove('tu-wrapx');src.style.width=sl.W+'px';
  const fitS=()=>Math.min(cap,sw/src.offsetWidth,sh/src.offsetHeight);
  let best={s:fitS(),w:sl.W,wrap:false};
  const xp=src.querySelector('.tu-xp');
  const kids=xp?[...xp.children].filter(k=>k.offsetWidth>0):[];
  if(kids.length>2&&best.s<.92){
    const step=kids[1].offsetLeft-kids[0].offsetLeft,n=kids.length;
    if(step>0){src.classList.add('tu-wrapx');
      for(let r=2;r<=4;r++){const c=Math.ceil(n/r);if(c<2)break;
        const w=Math.round(sl.W-(n-c)*step);src.style.width=w+'px';
        const s2=fitS();if(s2>best.s*1.08)best={s:s2,w,wrap:true};}
      src.classList.toggle('tu-wrapx',best.wrap);src.style.width=best.w+'px';}}
  return best.s;}
/* 그래프 채우기 — 23-anim 규칙을 복제본에 처음부터(0 에서) */
function tuAnimate(root,base){
  if(TU.rm||typeof AX_RULES==='undefined')return;
  for(const [sel0,kind,gap,b0] of AX_RULES){
    const sel=sel0.replace(/^#tab-(dash|overview|tvdash|oohdash)\s+/,'');
    let list;try{list=[...root.querySelectorAll(sel)];}catch(e){continue;}
    list.forEach((el,i)=>{
      let d=(b0||0)+base;
      if(gap==='row'){const tr=el.closest('tr');d+=Math.min(900,(tr?tr.sectionRowIndex:0)*22);}
      else if(gap==='di'){const td=el.closest('td');d+=Math.min(700,(+(td&&td.dataset.di)||0)*9);}
      else d+=Math.min(1100,i*(gap||0));
      if(kind==='arc'){try{axArc(el,root,d,null);}catch(e){}return;}
      if(kind==='count'){try{axCount(el,root,d,null);}catch(e){}return;}
      if(kind==='draw'){try{el.setAttribute('pathLength','1');}catch(e){}}
      el.style.setProperty('--axd',d+'ms');el.classList.add('ax','ax-'+kind);});}
  /* 표지 숫자 */
  root.querySelectorAll('.tu-tile .v').forEach((v,i)=>{try{axCount(v,root,base+180+i*110,null);}catch(e){}});}
const tuLater=(f,ms)=>{const t=setTimeout(f,ms);TU.timers.push(t);return t;};
function tuClear(){TU.timers.forEach(clearTimeout);TU.timers=[];clearTimeout(TU.playT);}
function tuAnim(el,kf,o){if(!el||!el.animate)return null;try{return el.animate(kf,o);}catch(e){return null;}}
/* 들어온 장면의 차례 — 제목 글자 → 부제목 → 그래프가 떠오르며 채워짐 → 강조 */
function tuPlaySlide(node,sl){
  const rm=TU.rm,E='cubic-bezier(.16,1,.3,1)';
  const ws=[...node.querySelectorAll('.tu-title .w>span')];
  tuAnim(node.querySelector('.tu-eye'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:rm?150:600,delay:rm?0:200,easing:E,fill:'backwards'});
  ws.forEach((w,k)=>tuAnim(w,[{opacity:0,transform:'translateY(105%) rotateX(-80deg)'},{opacity:1,transform:'none'}],
    {duration:rm?150:820,delay:rm?0:280+k*60,easing:'cubic-bezier(.2,.85,.25,1)',fill:'backwards'}));
  tuAnim(node.querySelector('.tu-sub'),[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],
    {duration:rm?150:760,delay:rm?0:520+ws.length*45,easing:E,fill:'backwards'});
  tuAnim(node.querySelector('.tu-in'),[{opacity:0,transform:'translateY(56px) scale(.95)'},{opacity:1,transform:'none'}],
    {duration:rm?150:1150,delay:rm?0:330,easing:E,fill:'backwards'});
  const src=node.querySelector('.tu-src');
  if(sl.kind==='cover')src.querySelectorAll('.tu-tile').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(40px) rotateX(35deg)'},{opacity:1,transform:'none'}],
    {duration:rm?150:900,delay:rm?0:520+i*110,easing:E,fill:'backwards'}));
  if(sl.kind==='end'){
    src.querySelectorAll('.tu-cat').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:760,delay:rm?0:420+i*90,easing:E,fill:'backwards'}));
    src.querySelectorAll('.tu-cat').forEach((c,i)=>c.querySelectorAll('.tu-rc').forEach((t,j)=>tuAnim(t,[{opacity:0,transform:'translateX(-10px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:560,delay:rm?0:620+i*90+j*55,easing:E,fill:'backwards'})));
    src.querySelectorAll('.tu-btn').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:620,delay:rm?0:900+i*60,easing:E,fill:'backwards'}));}
  tuAnimate(src,rm?0:520);
  /* 강조 — 그래프가 다 찬 뒤에. 차례가 있으면(유입 분석 그래프 세 개) 하나씩 넘어가고, 끝나면 모두 다시 진하게 */
  const t0=rm?300:tuSlow(src),steps=tuSteps(src);
  tuLater(()=>tuSpot(node,steps[0]),t0);
  if(steps.length>1){steps.slice(1).forEach((st,k)=>tuLater(()=>tuSpot(node,st),t0+(k+1)*TU_STEP));
    tuLater(()=>tuSpot(node,-1),t0+steps.length*TU_STEP);}
  if(TU.play)TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},tuDur(sl));}
/* 그래프가 다 차는 데 걸리는 시간 · 장면에 머무는 시간(자동 재생) */
const TU_STEP=3000;
const tuSlow=src=>src.querySelector('.dbar,circle[data-axarc]')?2500:src.querySelector('table')?1800:2000;
const tuStepOf=e=>+(e.getAttribute('data-tust')||0);
const tuSteps=src=>[...new Set([...src.querySelectorAll('[data-tuhl]')].map(tuStepOf))].sort((a,b)=>a-b);
function tuDur(sl){if(!sl||!sl.src)return TU_PLAY;const n=tuSteps(sl.src).length;
  return n>1?Math.max(TU_PLAY,tuSlow(sl.src)+n*TU_STEP+1800):TU_PLAY;}
/* ---------- 5. 강조 (v123) — 흐리게 하지 않는다. 형광펜(뒤 글자가 그대로 비치는 색 덧칠) + 가리키는 손가락 + 이름표 ----------
   손가락 · 이름표는 원본 데이터(글자 · 막대 · 점)를 가리지 않는 빈자리를 찾아 놓는다(위 → 오른쪽 → 왼쪽 → 아래, 칸 안 여백까지).
   이름표까지 놓을 빈자리가 없으면 손가락만, 손가락도 놓을 곳이 없으면 가장 덜 겹치는 곳에 */
function tuScroller(el,root){
  for(let p=el.parentElement;p&&p!==root;p=p.parentElement){
    const cs=getComputedStyle(p);if(/auto|scroll/.test(cs.overflowX)&&p.scrollWidth>p.clientWidth+1)return p;}
  return null;}
/* 손가락 — 위를 가리키는 손(끝 = 8,2 / 24). 흰 손 · 강조색 테두리 */
const TU_HAND=(acc,fill)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4a2 2 0 0 1 4 0v5.2a2 2 0 0 1 4 0v1.4a2 2 0 0 1 4 0V12a2 2 0 0 1 4 0v3a7.5 7.5 0 0 1-7.5 7.5h-1.9c-2.5 0-4-.8-5.4-2.2l-4-4a1.9 1.9 0 0 1 2.7-2.7l.1.1z" fill="${fill||'#fff'}" stroke="${acc}" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 9.2v3.4M14 10.6v2.6M18 12v2.2" stroke="${acc}" stroke-width="1.3" stroke-linecap="round"/></svg>`;
/* 가리면 안 되는 것들(화면 좌표) — 글자, SVG 의 점 · 막대 · 띠, 작은 색 막대(HTML) */
function tuObst(root){
  const out=[],rg=document.createRange(),seen=new Map();
  const vis=el=>{if(seen.has(el))return seen.get(el);const cs=getComputedStyle(el);
    const v=cs.visibility!=='hidden'&&cs.display!=='none';seen.set(el,v);return v;};
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let n=tw.nextNode();n;n=tw.nextNode()){
    if(!/\S/.test(n.nodeValue))continue;const p=n.parentElement;if(!p||!vis(p)||p.closest('defs,style,script,title'))continue;
    rg.selectNodeContents(n);for(const r of rg.getClientRects())if(r.width>.5&&r.height>.5)out.push({left:r.left,top:r.top,width:r.width,height:r.height,el:p,tx:1});}
  const RR=root.getBoundingClientRect(),RA=RR.width*RR.height;
  root.querySelectorAll('*').forEach(e=>{
    const tag=e.tagName.toLowerCase();
    if(e instanceof SVGElement){
      if(!/^(circle|ellipse|rect|path|polygon|image)$/.test(tag)||e.closest('defs,clipPath,mask,pattern,marker'))return;
      const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return;
      const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.05)return;
      const fill=cs.fill!=='none'&&+cs.fillOpacity>.05,stroke=cs.stroke!=='none'&&parseFloat(cs.strokeWidth)>=2;
      const o={left:r.left,top:r.top,width:r.width,height:r.height,el:e,tx:0};
      if(tag==='circle'||tag==='ellipse'){if(fill||stroke)out.push(o);return;}
      if(!fill&&tag!=='image')return;
      const s=e.ownerSVGElement&&e.ownerSVGElement.getBoundingClientRect(),sa=s?s.width*s.height:Infinity;
      if(r.width*r.height>sa*.6)return;                                 /* 바탕 · 언덕 같은 큰 면은 빼고 */
      if(tag==='path'&&r.width*r.height>sa*.03)return;                  /* 흐름 띠처럼 비스듬한 큰 면 — 상자로 재면 주변이 다 막힌다 */
      out.push(o);return;}
    if(/^(td|th|tr|table|tbody|thead|tfoot|colgroup|col)$/.test(tag))return;
    if(tag==='img'||tag==='canvas'){const r=e.getBoundingClientRect();out.push({left:r.left,top:r.top,width:r.width,height:r.height,el:e,tx:0});return;}
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;
    if(Math.min(r.width,r.height)>64||r.width*r.height>RA*.04)return;   /* 카드 같은 큰 상자는 빼고 작은 색 막대만 */
    const cs=getComputedStyle(e);if(cs.visibility==='hidden')return;
    const m=/rgba?\(([^)]+)\)/.exec(cs.backgroundColor),a=m?m[1].split(/[\s,/]+/).filter(Boolean)[3]:null;
    if((m&&(a==null||+a>.05))||cs.backgroundImage!=='none')out.push({left:r.left,top:r.top,width:r.width,height:r.height,el:e,tx:0});});
  return out;}
/* 이름표 너비 */
let TU_CV=null;
function tuTextW(t,px){TU_CV=TU_CV||document.createElement('canvas');const c=TU_CV.getContext('2d');
  c.font=`800 ${px||13}px 'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif`;return c.measureText(t).width;}
/* 놓기 — items: {r:대상 상자, t:대상 글자 상자(없으면 null), pw · ph:이름표 크기(없으면 0), finger}
   좌표는 모두 같은 평면(무대 또는 그림). B = 놓아도 되는 범위. F = 손가락 크기 */
function tuPlace(items,obst,B,F,C){
  const G=Math.max(3,F*.12),placed=[];
  const inter=(a,b)=>{const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);return w>0&&h>0?w*h:0;};
  let pan=[];
  let own=null;
  const cost=bx=>{let c=0;for(const o of obst){if(own&&!o.tx&&o.el&&(o.el===own||own.contains(o.el)))continue;c+=inter(bx,o);}
    for(const o of pan)c+=inter(bx,o)*.5;for(const p of placed)c+=inter(bx,p)*3;
    const ox=Math.max(0,B.x0-bx.x)+Math.max(0,bx.x+bx.w-B.x1),oy=Math.max(0,B.y0-bx.y)+Math.max(0,bx.y+bx.h-B.y1);
    return c+(ox*bx.h+oy*bx.w)*6;};
  const fbox=(ax,ay,rot)=>{const th=rot*Math.PI/180,s=F/24,dx=-4,dy=-10;
    const cx=ax-(dx*Math.cos(th)-dy*Math.sin(th))*s,cy=ay-(dx*Math.sin(th)+dy*Math.cos(th))*s;
    return {x:cx-F/2,y:cy-F/2,w:F,h:F,cx,cy,rot};};
  const around=(R,list)=>{const cx=R.x+R.w/2,cy=R.y+R.h/2;
    return list.map(s=>s==='top'?fbox(cx,R.y-G,180):s==='bottom'?fbox(cx,R.y+R.h+G,0):s==='left'?fbox(R.x-G,cy,90):fbox(R.x+R.w+G,cy,270));};
  const pills=(fb,pw,ph)=>fb.rot===90?[{x:fb.x-4-pw,y:fb.cy-ph/2,w:pw,h:ph,side:'l'}]:fb.rot===270?[{x:fb.x+fb.w+4,y:fb.cy-ph/2,w:pw,h:ph,side:'r'}]
    :[{x:fb.x+fb.w+4,y:fb.cy-ph/2,w:pw,h:ph,side:'r'},{x:fb.x-4-pw,y:fb.cy-ph/2,w:pw,h:ph,side:'l'}];
  return items.map(it=>{
    if(!it.finger)return null;
    pan=it.pan||[];own=it.el||null;
    const R=it.f||it.r;
    /* 대상 둘레 → 대상 글자 둘레(칸 안 여백) → 그래프 묶음 바깥 위 · 아래(멀리서 가리킨다 —
       사이에 다른 강조할 곳이 끼어 있으면 그쪽을 가리키는 것처럼 보이므로 뺀다) */
    const clear=(y0,y1)=>!items.some(o=>o!==it&&o.r.x<R.x+R.w&&o.r.x+o.r.w>R.x&&o.r.y<y1&&o.r.y+o.r.h>y0);
    const cand=around(R,['top','right','left','bottom']).concat(it.t?around(it.t,['left','right','top','bottom']):[])
      .concat(C&&clear(C.y,R.y)?[fbox(R.x+R.w/2,C.y-G,180)]:[]).concat(C&&clear(R.y+R.h,C.y+C.h)?[fbox(R.x+R.w/2,C.y+C.h+G,0)]:[]);
    let best=null;
    if(it.pw)for(const fb of cand){const fc=cost(fb);if(fc>=1)continue;
      const pb=pills(fb,it.pw,it.ph).find(p=>cost(p)<1);if(pb){best={f:fb,p:pb};break;}}
    if(!best){let bc=Infinity;for(const fb of cand){const c=cost(fb);if(c<bc-.5){bc=c;best={f:fb,p:null};}if(c<1)break;}}
    if(best){placed.push(best.f);if(best.p)placed.push(best.p);}
    return best;});}
/* 대상의 글자 상자(칸 안 여백을 쓰려고) — 글자가 상자보다 충분히 작을 때만 */
function tuTextRect(e){
  if(e instanceof SVGElement)return null;
  const rg=document.createRange();rg.selectNodeContents(e);const r=rg.getBoundingClientRect(),R=e.getBoundingClientRect();
  return r.width>1&&r.height>1&&(r.width<R.width-20||r.height<R.height-20)?r:null;}
/* 강조할 것들 → 놓을 재료. toP = 화면 좌표 → 놓는 평면 좌표, mw = 이름표 너비 재기
   r = 형광펜 상자(넘치면 잘리는 조상 상자 안으로 자른다), f = 손가락이 가리킬 곳(흐름 띠는 띠 한가운데), pan = 다른 카드들(손가락이 덜 덮게) */
const TU_PANEL='.card,.infcell,.donut,.stat,.cr,.tile,.infk,.hpbox';
function tuItems(src,hls,chips,toP,PX,mw){
  const any=hls.some(e=>chips[+e.getAttribute('data-tuhl')]);
  const panels=[...src.querySelectorAll(TU_PANEL)].filter(tuVis);
  return hls.map((e,k)=>{
    let r=e.getBoundingClientRect();r={left:r.left,right:r.right,top:r.top,bottom:r.bottom};
    for(let p=e.parentElement;p&&p!==src.parentElement;p=p.parentElement){
      if(p instanceof SVGElement&&p.tagName.toLowerCase()!=='svg')continue;
      const cs=getComputedStyle(p);
      if(cs.overflowX!=='visible'||cs.overflowY!=='visible'){const c=p.getBoundingClientRect();
        r={left:Math.max(r.left,c.left),right:Math.min(r.right,c.right),top:Math.max(r.top,c.top),bottom:Math.min(r.bottom,c.bottom)};}}
    r.width=r.right-r.left;r.height=r.bottom-r.top;
    if(!(r.width>3&&r.height>3))return null;
    let f=null;
    if(/^(path|polygon)$/i.test(e.tagName)&&e.getTotalLength){try{
      const L=e.getTotalLength(),m=e.getScreenCTM(),P=q=>({x:q.x*m.a+q.y*m.c+m.e,y:q.x*m.b+q.y*m.d+m.f});
      const A=P(e.getPointAtLength(L*.25)),Bp=P(e.getPointAtLength(L*.75)),cx=(A.x+Bp.x)/2,cy=(A.y+Bp.y)/2,hh=Math.max(5,Math.abs(A.y-Bp.y)/2);
      if(cx>=r.left-2&&cx<=r.right+2&&cy>=r.top-2&&cy<=r.bottom+2)f=toP({left:cx-6,top:cy-hh,width:12,height:hh*2});}catch(x){}}
    const chip=chips[+e.getAttribute('data-tuhl')]||'';
    const tr=tuTextRect(e);
    const pan=panels.filter(p=>!p.contains(e)&&!e.contains(p)).map(p=>toP(p.getBoundingClientRect()));
    return {el:e,r:toP(r),f,t:tr?toP(tr):null,pan,chip,round:/^(circle|ellipse)$/i.test(e.tagName),svg:e instanceof SVGGeometryElement,
      finger:any?!!chip:k===0,pw:chip?Math.ceil(mw?mw(chip):tuTextW(chip,PX)+24):0,ph:chip?Math.round(PX*2.15):0};}).filter(Boolean);}
/* SVG 도형(흐름 띠 · 원)의 형광펜 — 같은 모양을 바로 위에 겹쳐 곱하기로 물들인다(상자로 덮지 않게) */
function tuSvgMark(el,round){
  const c=el.cloneNode(false);['data-tuhl','data-tust','id','data-tip','pathLength'].forEach(a=>c.removeAttribute(a));
  c.setAttribute('class','tu-mksvg');c.removeAttribute('style');
  if(round){const r0=+c.getAttribute('r');if(r0)c.setAttribute('r',String(r0+2.5));}
  el.after(c);return c;}
/* step — 몇 번째 차례를 강조할지(-1 이면 강조를 거둔다) */
function tuSpot(node,step){
  if(!node.isConnected)return;
  node.classList.add('hl');
  const fit=node.querySelector('.tu-fit'),src=fit&&fit.firstElementChild;if(!src)return;
  const all=[...src.querySelectorAll('[data-tuhl]')];if(!all.length)return;
  if(step==null)step=tuSteps(src)[0];
  node.__step=step;
  const old=[...fit.querySelectorAll('.tu-mk,.tu-mksvg,.tu-pt,.tu-chip')];
  const drop=()=>old.forEach(c=>{const a=tuAnim(c,[{opacity:getComputedStyle(c).opacity},{opacity:0}],{duration:TU.rm?60:300,fill:'forwards'});
    if(a)a.onfinish=()=>c.remove();else c.remove();});
  const hls=all.filter(e=>tuStepOf(e)===step).sort((a,b)=>+a.getAttribute('data-tuhl')-+b.getAttribute('data-tuhl'));
  if(!hls.length){drop();return;}
  /* 장면 들어오기 · 그래프 채우기가 아직 덜 끝났으면(느린 컴퓨터 · 뒤에 있던 탭) 끝 모습으로 맞춘 뒤 잰다 — 반복 효과는 그대로 */
  try{node.getAnimations({subtree:true}).forEach(a=>{try{const it=a.effect&&a.effect.getTiming().iterations;const tg=a.effect&&a.effect.target;
    if(it!==Infinity&&!(tg&&tg.classList&&(tg.classList.contains('tu-mk')||tg.classList.contains('tu-pt')||tg.classList.contains('tu-chip'))))a.finish();}catch(e){}});}catch(e){}
  try{if(typeof axFinish==='function')axFinish(src);}catch(e){}
  /* 표 — 강조할 칸이 가려져 있으면 그쪽으로 부드럽게 옮긴 뒤 */
  const sc=tuScroller(hls[0],src);
  if(sc&&node.__pan!==step){
    node.__pan=step;
    const k=sc.getBoundingClientRect().width/sc.offsetWidth||1;
    const er=hls[0].getBoundingClientRect(),cr=sc.getBoundingClientRect();
    const x=(er.left-cr.left)/k+sc.scrollLeft,w=er.width/k;
    const fzW=sc.querySelector('.lfz')?Math.max(...[...sc.querySelectorAll('thead .lfz')].map(c=>(c.getBoundingClientRect().right-cr.left)/k),0):0;
    const vis0=sc.scrollLeft+fzW,vis1=sc.scrollLeft+sc.clientWidth;
    if(x<vis0||x+w>vis1){
      const to=Math.max(0,Math.min(sc.scrollWidth-sc.clientWidth,x-fzW-(sc.clientWidth-fzW-w)/2));
      sc.scrollTo({left:to,behavior:TU.rm?'auto':'smooth'});
      /* 다 옮겨 간 뒤(위치가 멈춘 뒤)에 */
      let n=0;
      const wait=()=>{if(Math.abs(sc.scrollLeft-to)<2||n>30)return tuSpot(node,step);n++;tuLater(wait,100);};
      tuLater(wait,TU.rm?40:250);return;}}
  drop();
  /* 무대(.tu-fit) 좌표 — 들어오는 효과 중이면(바깥 확대 · 축소) 그만큼 되돌린다 */
  const fr=fit.getBoundingClientRect(),kx=fit.offsetWidth/(fr.width||1),ky=fit.offsetHeight/(fr.height||1);
  const toP=r=>({x:(r.left-fr.left)*kx,y:(r.top-fr.top)*ky,w:r.width*kx,h:r.height*ky,el:r.el,tx:r.tx});
  const hd=node.querySelector('.tu-head').getBoundingClientRect();
  const B={x0:(8-fr.left)*kx,y0:(hd.bottom+8-fr.top)*ky,x1:(innerWidth-8-fr.left)*kx,y1:(innerHeight-10-fr.top)*ky};
  const obst=tuObst(src).map(toP);
  TU.el.querySelectorAll('.tu-nav:not([disabled]),.tu-hint:not(.off)').forEach(n=>obst.push(toP(n.getBoundingClientRect())));
  const meas=document.createElement('div');meas.className='tu-chip tu-ch';meas.style.cssText='visibility:hidden;animation:none;left:0;top:0';fit.appendChild(meas);
  const its=tuItems(src,hls,node.__chips||[],toP,13,t=>{meas.textContent=t;return meas.offsetWidth+2;});
  meas.remove();
  const plan=tuPlace(its,obst,B,34,toP(src.getBoundingClientRect()));
  const acc=getComputedStyle(TU.el).getPropertyValue('--tu-acc').trim()||'#e4573d';
  its.forEach((it,k)=>{
    /* 형광펜 — 대상 위에 색을 덧칠하되 곱하기(어두운 화면은 더하기)로 섞어 아래 글자 · 그림이 그대로 보인다 */
    if(it.svg)tuSvgMark(it.el,it.round).style.setProperty('--k',k);
    else{const P=4,big=it.r.w*it.r.h>36000,m=document.createElement('div');
      m.className='tu-mk'+(big?' big':'');
      Object.assign(m.style,{left:(it.r.x-P)+'px',top:(it.r.y-P)+'px',width:(it.r.w+P*2)+'px',height:(it.r.h+P*2)+'px'});
      m.style.setProperty('--k',k);fit.appendChild(m);}
    const pl=plan[k];if(!pl)return;
    const f=document.createElement('div');f.className='tu-pt';
    Object.assign(f.style,{left:pl.f.x+'px',top:pl.f.y+'px',width:pl.f.w+'px',height:pl.f.h+'px',transform:`rotate(${pl.f.rot}deg)`});
    f.style.setProperty('--k',k);f.innerHTML=`<i>${TU_HAND(acc)}</i>`;fit.appendChild(f);
    if(pl.p){const c=document.createElement('div');c.className='tu-chip tu-ch';c.setAttribute('data-noi18n','');c.textContent=it.chip;
      Object.assign(c.style,{left:pl.p.x+'px',top:pl.p.y+'px',height:pl.p.h+'px'});c.style.setProperty('--k',k);fit.appendChild(c);}});}
/* ---------- 6. 넘기기 ---------- */
function tuGo(i,dir){
  if(!TU.el||i<0||i>=TU.slides.length||i===TU.i)return;
  if(TU.ed)tuEditEnd(true);
  tuMenu(false);
  tuClear();
  dir=dir||(i>TU.i?1:-1);
  const old=TU.node,sl=TU.slides[i];
  TU.i=i;
  const node=tuMount(sl);node.__chips=sl.chips;
  TU.node=node;
  TU.fx-=dir*288;{const f=TU.el.querySelector('.tu-floor');if(f)f.style.backgroundPosition=`${TU.fx}px 0`;}
  const rm=TU.rm;
  if(old){
    old.classList.add('out');old.style.pointerEvents='none';
    const a=tuAnim(old,[{opacity:1,transform:'none'},{opacity:0,transform:`translate3d(${-dir*32}%,0,-560px) rotateY(${dir*34}deg)`}],
      {duration:rm?200:820,easing:'cubic-bezier(.7,0,.25,1)',fill:'forwards'});
    const rmv=()=>{if(old.isConnected)old.remove();};
    if(a)a.onfinish=rmv;setTimeout(rmv,rm?260:1000);}
  tuAnim(node,[{opacity:0,transform:`translate3d(${dir*36}%,0,-640px) rotateY(${-dir*36}deg)`},{opacity:1,transform:'none'}],
    {duration:rm?220:1050,delay:rm?0:old?120:0,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  tuPaintChrome();
  tuPlaySlide(node,sl);
  /* 마지막 장이 가까우면 PPT 도구를 미리 불러 둔다 */
  if(i>=TU.slides.length-2)tuLoadPptx().catch(()=>{});}
const tuNext=()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1,1);};
const tuPrev=()=>{if(TU.i>0)tuGo(TU.i-1,-1);};
function tuPlay(on){
  TU.play=!!on;clearTimeout(TU.playT);
  if(TU.play){if(TU.i>=TU.slides.length-1){tuGo(0,1);return;}
    if(TU.ed)tuEditEnd(true);
    TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},tuDur(TU.slides[TU.i]));}
  tuPaintChrome();}
/* ---------- 7. 열기 · 닫기 ---------- */
function tuFont(){
  if(document.getElementById('tuFont'))return;
  const l=document.createElement('link');l.id='tuFont';l.rel='stylesheet';
  l.href='https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
  document.head.appendChild(l);}
function tuOpen(){
  if(TU.el||document.body.classList.contains('booting'))return;
  const perf=$('sub-perf');
  if(!perf||perf.classList.contains('hidden')||!tuVis(perf)){showToast(L('서머리 화면에서 열 수 있어요','Open it from the summary view'),'',{kind:'warn'});return;}
  TU.rm=typeof reduceMotion==='function'?reduceMotion():false;
  try{if(typeof axFinish==='function')axFinish(perf);}catch(e){}
  try{hideTip();}catch(e){}
  /* 일자별 그래프는 전체 기간을 한 폭에 담아 복제(페이지 저장과 같은 방식) — 복제 뒤 바로 원래대로 */
  window.__axHold=(window.__axHold||0)+1;
  let fitOn=false;
  try{if(!window.__DAILY_FIT&&$('chartDaily')&&tuVis($('chartDaily'))){window.__DAILY_FIT=1;fitOn=true;renderDaily();}}catch(e){console.warn(e);}
  TU.daily=window.__DAILY_INFO||null;
  let body=[];
  try{body=tuBuild();}catch(e){console.warn('tour build',e);}
  if(fitOn){window.__DAILY_FIT=0;try{renderDaily();}catch(e){}}
  if(!body.length){window.__axHold=Math.max(0,window.__axHold-1);
    showToast(L('보여 줄 그래프가 없어요','Nothing to show yet'),L('데이터가 들어오면 다시 눌러 주세요','Try again once there is data'),{kind:'warn'});return;}
  TU.slides=[tuCover(),...body];
  TU.slides.push(tuEnd());
  TU.i=-1;TU.node=null;TU.fx=0;TU.play=false;TU.ppt=0;
  tuFont();
  const el=tuShell();TU.el=el;TU.deck=el.querySelector('.tu-deck');
  document.body.appendChild(el);
  document.documentElement.classList.add('tu-on');
  /* 전체 화면 — 문서 전체를(알림 · 툴팁도 함께 보이게). 안 되면 화면 위 덮개로만 */
  try{const de=document.documentElement;
    if(de.requestFullscreen&&!document.fullscreenElement)de.requestFullscreen({navigationUI:'hide'}).then(()=>{TU.fs=true;}).catch(()=>{});}catch(e){}
  tuWire(el);
  /* 배경음 — 투어를 연 누름(사용자 동작) 안에서 시작해야 브라우저가 소리를 낸다 */
  try{if(TU_SND.on)tuSound(true,true);}catch(e){console.warn('tour music',e);}
  tuPaintSnd();
  requestAnimationFrame(()=>{el.classList.add('on');});
  tuGo(0,1);
  TU.hintT=setTimeout(()=>{const h=el.querySelector('.tu-hint');if(h)h.classList.add('off');},5200);}
function tuClose(){
  const el=TU.el;if(!el)return;
  if(TU.ed)tuEditEnd(true);
  try{if(TU_SND.m)TU_SND.m.stop();}catch(e){}
  tuClear();clearTimeout(TU.hintT);
  TU.el=null;TU.deck=null;TU.node=null;TU.play=false;
  document.removeEventListener('keydown',tuKey,true);
  removeEventListener('resize',tuResize);
  document.removeEventListener('fullscreenchange',tuFsChange);
  if(TU.fs&&document.fullscreenElement){try{document.exitFullscreen();}catch(e){}}
  TU.fs=false;
  window.__axHold=Math.max(0,(window.__axHold||0)-1);
  el.classList.remove('on');el.classList.add('closing');
  document.documentElement.classList.remove('tu-on');
  setTimeout(()=>el.remove(),TU.rm?60:420);
  try{const b=$('tourBtn');if(b)b.focus({preventScroll:true});}catch(e){}}
function tuKey(e){
  if(!TU.el)return;
  const k=e.key,onBtn=e.target&&e.target.closest&&e.target.closest('.tu-btn,.tu-rc,.tu-mi,.tu-eb');
  const stop=()=>{e.preventDefault();e.stopPropagation();};
  /* 문구 편집 중 — 글자 입력은 그대로 두고(대시보드 단축키만 막는다) Enter 완료 · Esc 취소 · Ctrl+B 강조 */
  if(TU.ed){
    if(e.isComposing||e.keyCode===229){e.stopPropagation();return;}     /* 한글 조합 중 */
    if(k==='Escape'){stop();tuEditEnd(false);return;}
    if(k==='Enter'&&!onBtn){stop();tuEditEnd(true);return;}
    if((e.ctrlKey||e.metaKey)&&(k==='b'||k==='B')){stop();tuEmToggle();return;}
    if(k==='Tab'){stop();const to=document.activeElement===TU.ed.title?TU.ed.sub:TU.ed.title;tuCaretEnd(to);return;}
    /* 제목 전체를 고른 채 새로 쓰면 — 첫 글자의 강조색이 새 글 전체로 번지지 않게 먼저 비운다(한글 조합 시작 전 keydown 에서) */
    const ti=TU.ed.title;
    if(document.activeElement===ti&&!e.ctrlKey&&!e.metaKey&&(k.length===1||k==='Process'||e.keyCode===229||k==='Backspace'||k==='Delete')){
      const sel=getSelection(),all=x=>String(x||'').replace(/\s/g,'');
      if(sel.rangeCount&&!sel.isCollapsed&&all(sel.toString())===all(ti.textContent)){
        ti.textContent='';tuCaretEnd(ti);if(k==='Backspace'||k==='Delete')e.preventDefault();}}
    e.stopPropagation();return;}
  const menu=TU.el.querySelector('.tu-dlw.open');
  if(k==='Escape'){stop();if(menu)tuMenu(false);else tuClose();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(menu&&e.target.closest&&e.target.closest('.tu-dlw'))return;      /* 메뉴 안에서는 Enter · Space 가 단추를 누르게 */
  if(k==='ArrowRight'||k==='PageDown'||((k===' '||k==='Enter')&&!onBtn)){stop();tuNext();return;}
  if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){stop();tuPrev();return;}
  if(k==='Home'){stop();tuGo(0,-1);return;}
  if(k==='End'){stop();tuGo(TU.slides.length-1,1);return;}
  if(k==='p'||k==='P'){stop();tuPlay(!TU.play);return;}
  if(k==='e'||k==='E'){stop();tuEditStart();return;}
  if(k==='m'||k==='M'){stop();tuSound();return;}}
/* 크기가 바뀌거나 제목 줄 수가 바뀌면 — 다시 맞추고 지금 차례의 강조를 다시 */
function tuRelayout(n,sl){
  n.querySelectorAll('.tu-chip,.tu-mk,.tu-mksvg,.tu-pt').forEach(x=>x.remove());
  tuLayout(n,sl);
  if(n.classList.contains('hl')&&n.__step!=null&&n.__step>=0)tuSpot(n,n.__step);}
function tuResize(){
  clearTimeout(TU.rz);
  TU.rz=setTimeout(()=>{const n=TU.node;if(!n||!TU.el)return;tuRelayout(n,TU.slides[TU.i]);},140);}
function tuFsChange(){if(TU.fs&&!document.fullscreenElement){TU.fs=false;tuClose();}}
function tuWire(el){
  document.addEventListener('keydown',tuKey,true);
  addEventListener('resize',tuResize);
  document.addEventListener('fullscreenchange',tuFsChange);
  el.addEventListener('click',e=>{
    /* 편집 중 머리글 밖을 누르면 고친 대로 끝낸다 · 다운로드 메뉴는 밖을 누르면 닫힌다 */
    if(TU.ed&&!e.target.closest('.tu-head,.tu-ed'))tuEditEnd(true);
    if(!e.target.closest('.tu-dlw'))tuMenu(false);
    const ed=e.target.closest('[data-ed]');if(ed)return tuEditCmd(ed.dataset.ed);
    const t=e.target.closest('[data-go],[data-act],.tu-nav,.tu-x,.tu-play,.tu-ed,.tu-dl,.tu-snd');if(!t)return;
    if(e.detail&&!t.classList.contains('tu-mi'))try{t.blur();}catch(x){}
    if(t.classList.contains('tu-ed'))return TU.ed?tuEditEnd(true):tuEditStart();
    if(t.classList.contains('tu-dl'))return tuMenu();
    if(t.classList.contains('tu-snd'))return tuSound();
    if(t.classList.contains('tu-x'))return tuClose();
    if(t.classList.contains('tu-play'))return tuPlay(!TU.play);
    if(t.classList.contains('tu-nav'))return t.classList.contains('prev')?tuPrev():tuNext();
    if(t.dataset.go!=null){tuPlay(false);return tuGo(+t.dataset.go);}
    const a=t.dataset.act;
    if(a==='close')return tuClose();
    if(a==='restart')return tuGo(0,-1);
    if(a==='ppt')return tuPpt(t);
    if(a==='html')return tuHtml(t);});
  /* 휠은 장면 안 표를 옆으로 넘길 때만 — 뒤 페이지가 스크롤되지 않게 */
  el.addEventListener('wheel',e=>{const sc=e.target.closest&&e.target.closest('.tu-src .tbl-wrap,.tu-src .gantt-wrap,.tu-src .hpwrap');
    if(sc&&Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    if(sc&&e.shiftKey)return;
    e.preventDefault();},{passive:false});
  /* 터치 — 좌우로 밀어 넘기기 */
  let sx=null,sy=0;
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){sx=e.clientX;sy=e.clientY;}});
  el.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4){dx<0?tuNext():tuPrev();}});
  /* (v118) 마우스를 따라 무대를 기울이던 효과는 뺐다 — 표 · 카드가 비스듬해져 강조 테두리와 어긋나 보였다. 그래프는 늘 평평하게 */
}

/* 다운로드 메뉴 (v119) — 위 오른쪽. PPT · 파일(HTML) */
function tuMenu(open){
  const w=TU.el&&TU.el.querySelector('.tu-dlw');if(!w)return;
  open=open==null?!w.classList.contains('open'):!!open;
  if(!open&&TU.ppt&&w.contains(document.activeElement))return;
  w.classList.toggle('open',open);w.querySelector('.tu-dl').setAttribute('aria-expanded',open?'true':'false');
  if(open){tuPlay(false);const f=w.querySelector('.tu-mi');if(f)try{f.focus({preventScroll:true});}catch(e){}}}
/* ---------- 문구 편집 (v119) — 지금 장의 제목 · 부제목을 그 자리에서 고쳐 쓴다 ----------
   강조(강조색 숫자)는 글자를 고른 뒤 '강조' 또는 Ctrl+B. 고친 문구는 이 창을 닫기 전까지 남고 PPT · 파일 저장 · 핵심 요약에도 그대로 */
const tuEditHtml=t=>esc(t||'').replace(/\u0002/g,'<em>').replace(/\u0003/g,'</em>');
function tuEditRead(el){
  let out='';
  const walk=(n,em)=>{for(const c of n.childNodes){
    if(c.nodeType===3){out+=c.nodeValue;continue;}
    if(c.nodeType!==1)continue;
    if(c.tagName==='BR'){out+=' ';continue;}
    const isEm=/^(EM|B|STRONG)$/.test(c.tagName)||/bold|^[6-9]00$/.test(c.style&&c.style.fontWeight||'');
    if(isEm&&!em){out+='\u0002';walk(c,true);out+='\u0003';}
    else{walk(c,em);if(/^(DIV|P)$/.test(c.tagName))out+=' ';}}};
  walk(el,false);
  return out.replace(/[\s\u00a0]+/g,' ').replace(/\u0002\s+/g,' \u0002').replace(/\s+\u0003/g,'\u0003 ')
    .replace(/\u0002\u0003/g,'').replace(/ {2,}/g,' ').trim();}
function tuCaretEnd(el){if(!el)return;try{el.focus({preventScroll:true});const r=document.createRange();r.selectNodeContents(el);r.collapse(false);
  const s=getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}
function tuEmToggle(){
  const ed=TU.ed,t=ed&&ed.title;if(!t)return;
  const sel=getSelection();if(!sel.rangeCount)return;const r=sel.getRangeAt(0);
  if(!t.contains(r.commonAncestorContainer))return;
  const emOf=n=>{for(let p=n&&(n.nodeType===1?n:n.parentElement);p&&p!==t;p=p.parentElement)if(p.tagName==='EM')return p;return null;};
  const e0=emOf(r.startContainer);
  if(e0&&e0===emOf(r.endContainer)){            /* 강조 안 — 풀기 */
    const f=document.createDocumentFragment();while(e0.firstChild)f.appendChild(e0.firstChild);e0.replaceWith(f);t.normalize();return;}
  if(r.collapsed)return;
  const frag=r.extractContents();frag.querySelectorAll('em,b,strong').forEach(x=>x.replaceWith(...x.childNodes));
  const em=document.createElement('em');em.appendChild(frag);r.insertNode(em);
  t.querySelectorAll('em').forEach(x=>{if(!x.textContent)x.remove();});
  t.normalize();
  try{sel.removeAllRanges();const nr=document.createRange();nr.selectNodeContents(em);sel.addRange(nr);}catch(e){}}
function tuEditPaste(e){
  e.preventDefault();
  const tx=((e.clipboardData||window.clipboardData).getData('text/plain')||'').replace(/\s+/g,' ');
  if(!document.execCommand||!document.execCommand('insertText',false,tx)){
    const s=getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);r.deleteContents();r.insertNode(document.createTextNode(tx));r.collapse(false);}}
function tuEditStart(){
  if(!TU.el||TU.ed||TU.ppt)return;
  const node=TU.node,sl=TU.slides[TU.i];if(!node||!sl)return;
  tuPlay(false);tuMenu(false);
  const head=node.querySelector('.tu-head');
  try{head.getAnimations({subtree:true}).forEach(a=>{try{a.finish();}catch(x){}});}catch(e){}
  const t=head.querySelector('.tu-title');
  let sub=head.querySelector('.tu-sub');
  if(!sub){sub=document.createElement('p');sub.className='tu-sub';t.after(sub);}
  t.innerHTML=tuEditHtml(sl.t);sub.textContent=sl.s||'';
  sub.setAttribute('data-ph',L('부제목 (비워 두면 숨겨요)','Subtitle (leave empty to hide)'));
  [t,sub].forEach(x=>{x.setAttribute('contenteditable','true');x.spellcheck=false;x.addEventListener('paste',tuEditPaste);});
  const bar=document.createElement('div');bar.className='tu-edbar tu-ch';bar.setAttribute('data-noi18n','');
  bar.innerHTML=`<span class="tip">${esc(L('글자를 바로 고쳐 쓰세요','Type to edit'))}</span>`
    +`<button type="button" class="tu-eb em" data-ed="em" title="${esc(L('고른 글자를 강조색으로 (Ctrl+B)','Highlight the selected text (Ctrl+B)'))}"><b>${esc(L('강조','Highlight'))}</b><kbd>Ctrl B</kbd></button>`
    +`<button type="button" class="tu-eb" data-ed="reset" title="${esc(L('자동으로 만든 문구로 되돌리기','Back to the generated text'))}">${esc(L('원래대로','Reset'))}</button>`
    +`<button type="button" class="tu-eb" data-ed="cancel">${esc(L('취소','Cancel'))}<kbd>Esc</kbd></button>`
    +`<button type="button" class="tu-eb pri" data-ed="done">${esc(L('완료','Done'))}<kbd>Enter</kbd></button>`;
  /* 단추를 눌러도 고른 글자(선택)가 풀리지 않게 */
  bar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
  head.appendChild(bar);
  node.classList.add('editing');TU.el.classList.add('editing');
  TU.ed={node,sl,title:t,sub,bar};
  tuPaintChrome();
  tuCaretEnd(t);}
function tuEditCmd(c){
  const ed=TU.ed;if(!ed)return;
  if(c==='em')return tuEmToggle();
  if(c==='done')return tuEditEnd(true);
  if(c==='cancel')return tuEditEnd(false);
  if(c==='reset'){ed.title.innerHTML=tuEditHtml(ed.sl.t0!=null?ed.sl.t0:ed.sl.t);ed.sub.textContent=ed.sl.s0!=null?ed.sl.s0:(ed.sl.s||'');tuCaretEnd(ed.title);}}
function tuEditEnd(save){
  const ed=TU.ed;if(!ed)return;TU.ed=null;
  const {node,sl,title,sub,bar}=ed;
  if(save){
    let t=tuEditRead(title);const s=sub.textContent.replace(/[\s\u00a0]+/g,' ').trim();
    if(!tuPlain(t).trim())t=sl.t;                  /* 제목을 다 지웠으면 그대로 */
    if(t!==sl.t||s!==(sl.s||'')){
      sl.t=t;sl.s=s;
      if(t===sl.t0&&s===(sl.s0||''))TU_EDITS.delete(tuEditKey(sl));else TU_EDITS.set(tuEditKey(sl),{t,s});
      /* 핵심 요약 장은 다시 만든다(고친 제목이 보이게) */
      const ei=TU.slides.findIndex(x=>x.kind==='end');
      if(ei>=0&&TU.slides[ei]!==sl){TU.slides[ei]=tuEnd();}}}
  bar.remove();
  [title,sub].forEach(x=>{x.removeAttribute('contenteditable');x.removeEventListener('paste',tuEditPaste);});
  title.innerHTML=tuWords(sl.t);
  if(sl.s)sub.textContent=sl.s;else sub.remove();
  node.classList.remove('editing');if(TU.el)TU.el.classList.remove('editing');
  try{const s=getSelection();if(s&&title.contains(s.anchorNode))s.removeAllRanges();}catch(e){}
  if(node.isConnected)tuRelayout(node,sl);
  if(TU.el)tuPaintChrome();}
/* ---------- 8. PPT 저장 ---------- */
let TU_PPTX=null;
function tuScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;
  const to=setTimeout(()=>{s.onload=s.onerror=null;rej(new Error('timeout'));},20000);
  s.onload=()=>{clearTimeout(to);res();};s.onerror=()=>{clearTimeout(to);s.remove();rej(new Error('load '+src));};document.head.appendChild(s);});}
function tuLoadPptx(){
  if(window.PptxGenJS)return Promise.resolve(window.PptxGenJS);
  if(TU_PPTX)return TU_PPTX;
  const urls=['./vendor/pptxgen.bundle.js','https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js'];
  TU_PPTX=(async()=>{let last=null;
    for(const u of urls){try{await tuScript(u);if(window.PptxGenJS)return window.PptxGenJS;}catch(e){last=e;}}
    TU_PPTX=null;throw last||new Error('PptxGenJS');})();
  TU_PPTX.catch(()=>{});
  return TU_PPTX;}
/* PPT 파일 묶기(JSZip)는 setTimeout(0) 을 수백 번 이어 부른다 — 탭이 뒤에 있으면 크롬이 이어진 타이머를 1초~1분 간격으로 묶어
   '파일 저장 중…'에서 멈춘 것처럼 보였다. 묶는 동안만 0ms 타이머를 메시지 채널로 바로 돌린다(앞에 있어도 더 빠름) */
async function tuFast(job){
  const ST=window.setTimeout,ch=new MessageChannel(),q=[];
  ch.port1.onmessage=()=>{const f=q.shift();if(f)try{f();}catch(e){ST(()=>{throw e;},0);}};
  window.setTimeout=function(fn,ms){
    if(!ms&&typeof fn==='function'){const a=[].slice.call(arguments,2);q.push(()=>fn.apply(window,a));ch.port2.postMessage(0);return 0;}
    return ST.apply(window,arguments);};
  try{return await job();}finally{window.setTimeout=ST;}}
/* 화면 갱신 틈 — 탭이 뒤에 있으면 타이머가 1분 단위로 묶이므로(크롬) 메시지로 넘긴다 */
const tuYield=()=>new Promise(r=>{if(document.visibilityState==='visible')setTimeout(r,16);
  else{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);}});
/* 장면의 그래프 → 그림(PNG) + 강조 표시(형광펜 · 손가락 · 이름표 — 그림 밖 도형으로, 고치고 지울 수 있게).
   o.cards — 카드 바탕은 남긴다(HTML 파일). 기본은 PPT 용 누끼(카드 바탕까지 뺀다).
   표는 가로로 넘겨 보던 칸까지 펼쳐서 찍는다(그림 · 표시 좌표가 같게) */
async function tuShot(sl,o){
  o=o||{};
  const key=o.cards?'__shotH':'__shotP';
  if(sl[key])return sl[key];                  /* 한 번 만든 그림은 다시 쓴다(PPT · HTML 둘 다 저장할 때) */
  const hold=document.createElement('div');hold.className='tu-shot';
  const src=sl.src.cloneNode(true);src.style.width=(sl.W+(sl.tblX||0))+'px';src.style.transform='none';
  hold.appendChild(src);TU.el.appendChild(hold);
  try{
    if(!sl.tblX)tuWrap(src,sl,o.cards?1700:1213,o.cards?620:470,Infinity);
    const R=src.getBoundingClientRect();
    const toP=r=>({x:r.left-R.left,y:r.top-R.top,w:r.width,h:r.height,el:r.el,tx:r.tx});
    const M=44,B={x0:-M,y0:-M,x1:R.width+M,y1:R.height+M};
    const obst=tuObst(src).map(toP),marks=[],steps=tuSteps(src),bake=[];
    steps.forEach(st=>{
      const hls=[...src.querySelectorAll('[data-tuhl]')].filter(e=>tuStepOf(e)===st).sort((a,b)=>+a.getAttribute('data-tuhl')-+b.getAttribute('data-tuhl'));
      const its=tuItems(src,hls,sl.chips,toP,13),plan=tuPlace(its,obst,B,30,toP(R));
      /* SVG 도형은 차례가 하나뿐이면 그림에 같은 모양 덧칠로 담는다(상자보다 정확) */
      its.forEach((it,k)=>{const baked=it.svg&&steps.length===1;if(baked)bake.push(it);
        marks.push({st,r:it.r,round:it.round,baked,big:it.r.w*it.r.h>36000,chip:it.chip,f:plan[k]?plan[k].f:null,p:plan[k]?plan[k].p:null});});});
    bake.forEach(it=>{const c=tuSvgMark(it.el,it.round);c.style.mixBlendMode='multiply';});
    const strip=e=>{e.style.setProperty('background','transparent','important');e.style.setProperty('box-shadow','none','important');
      e.style.setProperty('border-color','transparent','important');};
    const out=await ccRender(src,{zoom:2,transparent:true,meta:true,dataUrl:true,
      clean:c=>{if(o.cards)return;strip(c);c.querySelectorAll('.card,.hpbox,.infcell,.infk').forEach(strip);}});
    /* 그림 + 표시를 모두 담는 상자(U) — 손가락 · 이름표가 그림 밖으로 조금 나갈 수 있다 */
    const U={x0:0,y0:0,x1:out.W,y1:out.H};
    marks.forEach(m=>[m.f,m.p].filter(Boolean).forEach(b=>{U.x0=Math.min(U.x0,b.x);U.y0=Math.min(U.y0,b.y);U.x1=Math.max(U.x1,b.x+b.w);U.y1=Math.max(U.y1,b.y+b.h);}));
    return (sl[key]={...out,marks,U});
  }finally{hold.remove();}}
/* PPT 용 손가락 그림(PNG) — 한 번만 그린다 */
let TU_HANDPNG=null;
function tuHandPng(acc){
  if(TU_HANDPNG)return TU_HANDPNG;
  TU_HANDPNG=new Promise(res=>{const im=new Image();
    im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=144;const x=c.getContext('2d');
      x.shadowColor='rgba(20,24,30,.28)';x.shadowBlur=8;x.shadowOffsetY=3;x.drawImage(im,12,12,120,120);res(c.toDataURL('image/png'));}catch(e){res(null);}};
    im.onerror=()=>res(null);
    im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(TU_HAND(acc).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" '));});
  return TU_HANDPNG;}
/* 저장 단추(마지막 장 · 위쪽 다운로드 메뉴) — 글자로 진행 상황, 다운로드 단추도 함께 바쁨 표시 */
function tuBusy(btn,on){btn.disabled=on;btn.classList.toggle('busy',on);
  const d=TU.el&&TU.el.querySelector('.tu-dl');if(d)d.classList.toggle('busy',on);}
function tuSaved(btn){if(btn.classList.contains('tu-mi'))setTimeout(()=>tuMenu(false),1400);}
async function tuPpt(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);if(TU.ed)tuEditEnd(true);
  const lab=btn.querySelector('[data-lab]')||btn.querySelector('span'),was=lab.textContent;tuBusy(btn,true);
  const say=t=>{lab.textContent=t;};
  try{
    say(L('PPT 준비 중…','Preparing PPT…'));
    const P=await tuLoadPptx();
    const px=new P();px.layout='LAYOUT_WIDE';
    const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'Dashboard';
    px.title=`${nm} · Data Tour`;px.company='Media Dashboard';
    try{px.theme={headFontFace:'Pretendard',bodyFontFace:'Pretendard'};}catch(e){}
    /* 다크 보기에서 만들면 그림도 어두운 색이라 — 장 바탕 · 글자도 어둡게 맞춘다 */
    const DK=document.documentElement.getAttribute('data-theme')==='dark';
    const FF='Pretendard',INK=DK?'F1F2F4':'1B1F24',INK2=DK?'B3B9C1':'5B636E',MUT='8F97A2',ACC='E4573D',BG=DK?'1C1F23':'FFFFFF';
    const addSlide=()=>{const x=px.addSlide();x.background={color:BG};return x;};
    const body=TU.slides.filter(s=>s.kind==='body');
    const foot=(s,no)=>{
      s.addText(`${nm}  ·  DATA TOUR`,{x:.6,y:7.02,w:8,h:.3,fontFace:FF,fontSize:9,color:'A0A6AE',margin:0});
      if(no)s.addText(String(no),{x:11.73,y:7.02,w:1,h:.3,fontFace:FF,fontSize:9,color:'A0A6AE',align:'right',margin:0});};
    /* 표지 */
    {const c=TU.slides[0],s=addSlide();
      s.addShape(px.ShapeType.ellipse,{x:.62,y:2.12,w:.13,h:.13,fill:{color:ACC},line:{color:ACC,width:0}});
      s.addText('DATA TOUR',{x:.86,y:2.02,w:6,h:.32,fontFace:FF,fontSize:11,bold:true,color:INK,charSpacing:3,margin:0});
      s.addText(tuPlain(c.t),{x:.6,y:2.45,w:12.1,h:1.1,fontFace:FF,fontSize:40,bold:true,color:INK,margin:0,valign:'top',fit:'shrink'});
      if(c.s)s.addText(c.s,{x:.6,y:3.55,w:12.1,h:.45,fontFace:FF,fontSize:16,color:INK2,margin:0});
      const ts=c.tiles||[],tw=2.85,gap=.22;
      ts.forEach((t,k)=>{const x=.6+k*(tw+gap),y=4.45;
        s.addShape(px.ShapeType.roundRect,{x,y,w:tw,h:1.25,rectRadius:.12,fill:{color:DK?'2A2E34':'F3F4F6'},line:{color:DK?'3A3F46':'E6E8EB',width:.75}});
        s.addText(t.k,{x:x+.22,y:y+.18,w:tw-.44,h:.3,fontFace:FF,fontSize:10.5,bold:true,color:MUT,margin:0});
        s.addText(t.v,{x:x+.22,y:y+.52,w:tw-.44,h:.5,fontFace:FF,fontSize:t.v.length>14?15:20,bold:true,color:INK,margin:0,fit:'shrink'});});
      foot(s,0);}
    /* 장면마다 — 편집 가능한 글 + 누끼 그래프 + 강조 표시(도형) */
    for(let k=0;k<body.length;k++){
      const sl=body[k];say(L(`PPT 만드는 중 ${k+1}/${body.length}`,`Building PPT ${k+1}/${body.length}`));
      await tuYield();
      const s=addSlide();
      s.addText(`${String(k+1).padStart(2,'0')}   ${sl.label}`,{x:.6,y:.42,w:12.1,h:.3,fontFace:FF,fontSize:11,bold:true,color:MUT,margin:0});
      /* 제목 길이 — 두 줄이면 아래를 내린다 */
      const est=[...tuPlain(sl.t)].reduce((a,ch)=>a+(/[가-힣ㄱ-ㅎ]/.test(ch)?.39:/[A-Z0-9₩%]/.test(ch)?.25:.21),0);
      const two=est>11.8,ty=.74,th=two?1.02:.6;
      s.addText(tuRuns(sl.t,INK,ACC),{x:.6,y:ty,w:12.13,h:th,fontFace:FF,fontSize:28,bold:true,margin:0,valign:'top',fit:'shrink'});
      const sy=ty+th+.1;
      if(sl.s)s.addText(sl.s,{x:.6,y:sy,w:12.13,h:.5,fontFace:FF,fontSize:14,color:INK2,margin:0,valign:'top',fit:'shrink'});
      s.addNotes([sl.label,tuPlain(sl.t),sl.s].filter(Boolean).join('\n'));
      /* 그림 + 강조 표시(형광펜 = 반투명 도형 · 손가락 = 그림 · 이름표 = 글상자) — 모두 따로 고치고 지울 수 있다.
         차례가 여럿인 장면(유입 분석 ②)은 모든 차례를 한 장에 */
      let shot=null;
      try{shot=await tuShot(sl);}catch(e){console.warn('tour shot',e);}
      if(shot){
        const U=shot.U,UW=U.x1-U.x0,UH=U.y1-U.y0;
        const AX=.6,AY=sy+(sl.s?.66:.2),AW=12.13,AH=6.92-AY;
        let f=Math.min(AW/UW,AH/UH);
        const ux=AX+(AW-UW*f)/2,uy=AY+Math.max(0,(AH-UH*f)/2)*.4;
        const x=ux-U.x0*f,y=uy-U.y0*f,w=shot.W*f,h=shot.H*f;
        s.addImage({data:shot.data.replace(/^data:/,''),x,y,w,h});
        const hand=shot.marks.some(m=>m.f)?await tuHandPng('#'+ACC):null;
        shot.marks.forEach(m=>{const P=3;if(m.baked)return;
          s.addShape(m.round?px.ShapeType.ellipse:px.ShapeType.roundRect,{x:x+(m.r.x-P)*f,y:y+(m.r.y-P)*f,w:(m.r.w+P*2)*f,h:(m.r.h+P*2)*f,
            rectRadius:.05,fill:{color:ACC,transparency:m.big?90:78},line:{type:'none'}});});
        shot.marks.forEach(m=>{
          if(m.f&&hand){const g=m.f.w*f*.1;s.addImage({data:hand.replace(/^data:/,''),x:x+m.f.x*f-g,y:y+m.f.y*f-g,w:m.f.w*f*1.2,h:m.f.h*f*1.2,rotate:m.f.rot});}
          /* 이름표 — 글자 크기는 그대로(10.5pt)라 너비는 글자 수로 잰다. 손가락 왼쪽에 놓인 것은 오른쪽 끝을 맞춘다 */
          if(m.p&&m.chip){const pw=.36+1.08*[...m.chip].reduce((a,ch)=>a+(/[가-힣]/.test(ch)?.148:/\s/.test(ch)?.045:/[A-Z₩%→]/.test(ch)?.1:.08),0);
            const px0=m.p.side==='l'?x+(m.p.x+m.p.w)*f-pw:x+m.p.x*f,py0=y+(m.p.y+m.p.h/2)*f-.14;
            s.addText(m.chip,{x:Math.max(.2,Math.min(13.13-pw,px0)),y:Math.max(.2,py0),w:pw,h:.28,fontFace:FF,fontSize:10.5,bold:true,color:'FFFFFF',
              fill:{color:ACC},align:'center',valign:'middle',margin:0,rectRadius:.14,shape:px.ShapeType.roundRect});}});}
      foot(s,k+2);}
    /* 핵심 요약 — 갈래별 묶음(투어 마지막 장과 같게). 갈래는 세로 칸에 차례로, 가장 짧은 칸부터 채운다 */
    {const s=addSlide(),endSl=TU.slides.find(x=>x.kind==='end');
      s.addText(tuPlain(endSl?endSl.t:L('핵심 요약','Key takeaways')),{x:.6,y:.5,w:12.1,h:.6,fontFace:FF,fontSize:28,bold:true,color:INK,margin:0});
      const cats=tuCats(body),nc=cats.length<=3?cats.length:cats.length===4?2:3,G=.24,cw=(12.13-(nc-1)*G)/nc;
      const est=t=>[...t].reduce((a,ch)=>a+(/[가-힣ㄱ-ㅎ]/.test(ch)?1:/[A-Z0-9₩%]/.test(ch)?.62:.52),0);
      const lines=(t,fs)=>Math.max(1,Math.ceil(est(t)*fs/72/(cw-.62)));
      /* (v123) 카드는 모두 같은 크기 — 줄마다 nc 개, 마지막 줄은 가운데 */
      const rowsN=Math.ceil(cats.length/nc);
      const plan=fs=>{const hs=cats.map(c=>.5+c.items.map(it=>lines((it.lab?it.s.label+'  ':'')+tuPlain(it.s.t),fs)*fs*1.32/72+fs*.5/72).reduce((a,b)=>a+b,0)+.18);
        const h=Math.max(...hs);return {h,H:rowsN*h+(rowsN-1)*.2};};
      let fs=12,P=plan(fs);
      while(P.H>5.35&&fs>8.5){fs-=.5;P=plan(fs);}
      cats.forEach((c,ci)=>{const r=Math.floor(ci/nc),inRow=Math.min(nc,cats.length-r*nc),k=ci-r*nc,h=P.h;
        const x=.6+(12.13-(inRow*cw+(inRow-1)*G))/2+k*(cw+G),Y=1.38+r*(h+.2);
        s.addShape(px.ShapeType.roundRect,{x,y:Y,w:cw,h,rectRadius:.1,fill:{color:DK?'2A2E34':'F4F5F7'},line:{color:DK?'3A3F46':'E6E8EB',width:.75}});
        s.addShape(px.ShapeType.ellipse,{x:x+.2,y:Y+.2,w:.09,h:.09,fill:{color:ACC},line:{color:ACC,width:0}});
        s.addText([{text:c.n,options:{bold:true,color:INK}},{text:'  '+c.items.length,options:{bold:true,color:MUT}}],
          {x:x+.36,y:Y+.1,w:cw-.5,h:.3,fontFace:FF,fontSize:11,margin:0,valign:'middle'});
        const runs=[];
        c.items.forEach((it,j)=>{
          runs.push({text:String(it.k+1).padStart(2,'0')+'   ',options:{color:ACC,bold:true}});
          if(it.lab)runs.push({text:it.s.label+'  ',options:{color:MUT,bold:true}});
          const tr=tuRuns(it.s.t,INK,ACC);
          tr.forEach((r,q)=>runs.push({text:r.text,options:{...r.options,bold:r.options.color===ACC,breakLine:q===tr.length-1&&j<c.items.length-1}}));});
        s.addText(runs,{x:x+.2,y:Y+.48,w:cw-.4,h:h-.6,fontFace:FF,fontSize:fs,margin:0,valign:'top',paraSpaceAfter:fs*.5,lineSpacingMultiple:1.05});});
      foot(s,body.length+2);}
    say(L('파일 저장 중…','Saving…'));
    const buf=await tuFast(()=>px.write({outputType:'arraybuffer'}));
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.pptx`;
    saveFile(buf,fn,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('PPT로 저장했어요','Saved as PowerPoint'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);tuSaved(btn);
  }catch(e){console.warn('tour ppt',e);say(was);
    showToast(L('PPT를 만들지 못했어요','Couldn’t create the PPT'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;tuBusy(btn,false);}}
/* ---------- 9. 파일로 저장 (HTML) — v118 ----------
   투어를 파일 하나로: 장면마다 그래프 그림(카드 바탕 그대로 · 2배 해상도) + 제목/부제목 글 + 강조 위치를 담고,
   같은 모양의 작은 재생기(넘기기 · 3D 장면 전환 · 강조 · 진행 막대 · 자동 재생 · 전체 화면)를 함께 넣는다.
   인터넷 없이 어느 브라우저에서나 열린다(Pretendard 글꼴만 인터넷이 되면 받아 쓴다) */
async function tuHtml(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);if(TU.ed)tuEditEnd(true);
  const lab=btn.querySelector('[data-lab]')||btn.querySelector('span'),was=lab.textContent;tuBusy(btn,true);
  const say=t=>{lab.textContent=t;};
  try{
    const body=TU.slides.filter(x=>x.kind==='body');
    const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'Dashboard';
    const out=[];
    for(const sl of TU.slides){
      if(sl.kind==='body'){
        const k=body.indexOf(sl);
        say(L(`파일 만드는 중 ${k+1}/${body.length}`,`Building file ${k+1}/${body.length}`));
        await tuYield();
        let sh=null;try{sh=await tuShot(sl,{cards:true});}catch(e){console.warn('tour html shot',e);}
        out.push({k:'body',eye:`<span class="no">${String(k+1).padStart(2,'0')}</span>${esc(sl.label)}`,t:tuWords(sl.t),s:sl.s,
          img:sh?sh.data:'',w:sh?sh.W:0,h:sh?sh.H:0,u:sh?[sh.U.x0,sh.U.y0,sh.U.x1,sh.U.y1].map(v=>Math.round(v*10)/10):[0,0,0,0],
          mk:sh?sh.marks.map(m=>({st:m.st,r:[m.r.x,m.r.y,m.r.w,m.r.h],rd:m.round?1:0,big:m.big?1:0,bk:m.baked?1:0,c:m.p?m.chip:'',
            f:m.f?[m.f.x,m.f.y,m.f.w,m.f.rot]:null,p:m.p?[m.p.x,m.p.y,m.p.w,m.p.h,m.p.side==='l'?1:0]:null})):[]});}
      else if(sl.kind==='cover')
        out.push({k:'cover',eye:`<span class="no">▶</span>DATA TOUR`,t:tuWords(sl.t),s:sl.s,tiles:(sl.tiles||[]).map(x=>({k:x.k,v:x.v,s:x.s||''}))});
      else out.push({k:'end',eye:`<span class="no">✓</span>${esc(sl.label)}`,t:tuWords(sl.t),s:sl.s,
        cats:tuCats(body).map(c=>({n:c.n,items:c.items.map(x=>({n:String(x.k+1).padStart(2,'0'),t:tuWords(x.s.t),l:x.lab?x.s.label:'',tl:x.s.label,go:x.go}))}))});}
    say(L('파일 저장 중…','Saving…'));
    const D={name:nm,lang:LANG,dark:document.documentElement.getAttribute('data-theme')==='dark',
      made:new Date().toISOString().slice(0,10),hand:TU_HAND('#e4573d'),
      ui:{prev:L('이전','Previous'),next:L('다음','Next'),play:L('자동 재생 (P)','Autoplay (P)'),fs:L('전체 화면 (F)','Full screen (F)'),
        hint:L('← → 넘기기 · P 자동 재생 · M 배경음 · F 전체 화면','← → to move · P autoplay · M music · F full screen'),again:L('처음부터','From the start'),
        sndOn:L('배경음 끄기 (M)','Mute music (M)'),sndOff:L('배경음 켜기 (M)','Play music (M)')},slides:out};
    const html=tuHtmlDoc(D);
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.html`;
    saveFile(new TextEncoder().encode(html),fn,'text/html;charset=utf-8');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('투어를 파일로 저장했어요','Tour saved as a file'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);tuSaved(btn);
  }catch(e){console.warn('tour html',e);say(was);
    showToast(L('파일을 만들지 못했어요','Couldn’t create the file'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;tuBusy(btn,false);}}
/* 저장 파일 — 문서 + 작은 재생기. 데이터는 JSON 으로 넣는다(</ 는 막아 둔다) */
function tuHtmlDoc(D){
  const json=JSON.stringify(D).replace(/</g,'\\u003c');
  const css=`
:root{--ink:#1b1f24;--ink2:#5b636e;--mut:#8f97a2;--acc:#e4573d;--accrgb:228 87 61;--bg1:#fcfcfd;--bg2:#eef0f3;--bg3:#dde1e6;
  --grid:rgba(36,44,56,.085);--glass:rgba(255,255,255,.74);--line:rgba(27,31,36,.1)}
html.dk{--ink:#f1f2f4;--ink2:#b3b9c1;--mut:#868d97;--bg1:#2d3137;--bg2:#212429;--bg3:#16181b;--grid:rgba(255,255,255,.06);--glass:rgba(44,48,54,.78);--line:rgba(255,255,255,.1)}
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}
body{font-family:'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
  background:radial-gradient(125% 95% at 50% 34%,var(--bg1) 0%,var(--bg2) 50%,var(--bg3) 100%);-webkit-font-smoothing:antialiased}
.fw{position:fixed;inset:0;perspective:720px;perspective-origin:50% 36%;pointer-events:none;overflow:hidden}
.fl{position:absolute;left:-120%;right:-120%;bottom:0;height:230%;transform:rotateX(80deg);transform-origin:50% 100%;
  background-image:linear-gradient(var(--grid) 1.5px,transparent 1.5px),linear-gradient(90deg,var(--grid) 1.5px,transparent 1.5px);background-size:96px 96px;
  -webkit-mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.5) 22%,transparent 46%);mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.5) 22%,transparent 46%);
  transition:background-position 1.15s cubic-bezier(.65,0,.25,1)}
.top{position:fixed;left:0;right:0;top:0;padding:16px 30px 0;z-index:6}
.pg{display:flex;gap:6px}.pg i{flex:1;height:14px;position:relative;cursor:pointer}
.pg i::before,.pg i::after{content:'';position:absolute;left:0;right:0;top:5px;height:3px;border-radius:3px}
.pg i::before{background:rgba(27,31,36,.12)}html.dk .pg i::before{background:rgba(255,255,255,.14)}
.pg i::after{background:var(--ink);transform:scaleX(0);transform-origin:0 50%;transition:transform .55s cubic-bezier(.22,1,.36,1)}
.pg i.on::after{transform:scaleX(1)}.pg i.cur.play::after{transition:none;animation:pgp var(--dur,9s) linear both}
@keyframes pgp{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.mt{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:12px;font-weight:700;color:var(--ink2)}
.br{display:inline-flex;align-items:center;gap:8px;min-width:0}.br .d{width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 4px rgb(var(--accrgb) / .15);flex:none}
.br b{font-weight:900;font-size:11px;letter-spacing:.16em;color:var(--ink);white-space:nowrap}
.br .cn{color:var(--mut);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw}.br .cn::before{content:'·';margin:0 8px 0 2px}
.sp{flex:1}.ct{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:800;letter-spacing:.04em;margin-right:4px;white-space:nowrap}
.ib{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0}
.ib svg{width:14px;height:14px;display:block}.ib[aria-pressed=true]{background:var(--ink);color:var(--bg1)}
.ib.bs[aria-pressed]{background:var(--glass);color:var(--ink)}.ib.bs[aria-pressed=false]{color:var(--mut)}.bs .wv{animation:wv 2.4s ease-in-out infinite}@keyframes wv{50%{opacity:.35}}
.dk2{position:fixed;inset:0;perspective:2200px;perspective-origin:50% 46%}
.sl{position:absolute;inset:0;transform-style:preserve-3d;backface-visibility:hidden}
.hd{position:absolute;left:0;right:0;top:calc(66px + 3.2vh);padding:0 9vw;text-align:center;z-index:2;perspective:900px}
.eye{display:inline-flex;align-items:center;gap:9px;font-size:clamp(11.5px,.86vw,14px);font-weight:800;color:var(--mut)}
.eye .no{display:inline-grid;place-items:center;min-width:28px;height:21px;padding:0 8px;border-radius:999px;background:var(--ink);color:var(--bg1);font-size:11px;font-weight:800}
.tt{margin:12px 0 0;font-size:clamp(26px,2.95vw,54px);line-height:1.2;font-weight:800;letter-spacing:-.035em;word-break:keep-all;overflow-wrap:anywhere}
.tt .w{display:inline-block;overflow:hidden;vertical-align:top;padding:.04em .02em .12em;margin:-.04em 0 -.12em}.tt .w>span{display:inline-block;transform-origin:50% 100%}
.tt em{font-style:normal;color:var(--acc);position:relative}
.tt em::after{content:'';position:absolute;left:-.04em;right:-.04em;bottom:.02em;height:.16em;border-radius:.1em;z-index:-1;background:rgb(var(--accrgb) / .2);
  transform:scaleX(0);transform-origin:0 50%;transition:transform 1s cubic-bezier(.22,1,.36,1) .25s}
.sl.hl .tt em::after{transform:scaleX(1)}
.sb{margin:13px auto 0;max-width:min(1180px,84vw);font-size:clamp(14px,1.16vw,21px);line-height:1.5;font-weight:500;color:var(--ink2);letter-spacing:-.015em;word-break:keep-all}
.cover .hd{top:24vh}.cover .tt{font-size:clamp(34px,4.3vw,80px);margin-top:18px}
.st{position:absolute;left:4.5vw;right:4.5vw;bottom:5vh;display:flex;justify-content:center;align-items:flex-start;z-index:1}
.in{position:relative;transform-origin:50% 100%}
.fig{position:relative}.fig .base{position:absolute;display:block;max-width:none}
.mk{position:absolute;border-radius:8px;background:rgb(var(--accrgb) / .24);mix-blend-mode:multiply;opacity:0;clip-path:inset(0 100% 0 0);pointer-events:none}
.mk.big{background:rgb(var(--accrgb) / .1)}.mk.rd{border-radius:50%}
html.dk .mk{mix-blend-mode:screen;background:rgb(var(--accrgb) / .34)}html.dk .mk.big{background:rgb(var(--accrgb) / .16)}
.mk.on{opacity:1;animation:mk .6s cubic-bezier(.65,0,.25,1) forwards}@keyframes mk{to{clip-path:inset(0)}}
.pt{position:absolute;aspect-ratio:1;opacity:0;pointer-events:none;filter:drop-shadow(0 3px 5px rgba(20,24,30,.28));transition:opacity .3s}
.pt.on{opacity:1;transition:opacity .4s .3s}.pt>i{display:block;width:100%;height:100%}.pt.on>i{animation:tap 1.4s ease-in-out .7s infinite}
.pt svg{display:block;width:100%;height:100%}@keyframes tap{50%{transform:translateY(-12%)}}
.chip{position:absolute;display:flex;align-items:center;padding:0 calc(12px * var(--k,1));border-radius:999px;background:var(--acc);color:#fff;font-size:calc(13px * var(--k,1));
  font-weight:800;white-space:nowrap;pointer-events:none;box-shadow:0 8px 20px rgb(var(--accrgb) / .3);opacity:0;transform:scale(.7);transition:opacity .2s}
.chip.on{opacity:1;transform:none;transition:opacity .3s .45s,transform .5s cubic-bezier(.34,1.56,.64,1) .45s}
.tiles{display:flex;justify-content:center;gap:clamp(12px,1.3vw,22px);flex-wrap:wrap;padding-top:4vh}
.tile{min-width:clamp(190px,15.5vw,290px);padding:clamp(16px,1.4vw,24px) clamp(18px,1.5vw,26px);border-radius:20px;text-align:left;background:var(--glass);
  border:1px solid rgba(255,255,255,.85);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 22px 44px rgba(27,31,36,.10)}
html.dk .tile{border-color:rgba(255,255,255,.08)}
.tile .k{font-size:clamp(11.5px,.82vw,14px);font-weight:700;color:var(--mut)}.tile .v{margin-top:10px;font-size:clamp(19px,1.65vw,30px);font-weight:800;letter-spacing:-.03em;white-space:nowrap}
.tile .s{margin-top:6px;font-size:12px;font-weight:600;color:var(--ink2)}
.cats{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;max-width:1320px;margin:0 auto}
.cat{flex:0 0 calc((100% - (var(--nc,3) - 1) * 16px) / var(--nc,3));box-sizing:border-box;padding:14px 12px 10px;border-radius:18px;background:var(--glass);border:1px solid var(--line);box-shadow:0 14px 34px rgba(27,31,36,.07)}
.cath{display:flex;align-items:center;gap:8px;padding:0 6px 8px;font-size:13px;font-weight:800;color:var(--ink)}
.cath .d{width:7px;height:7px;border-radius:50%;background:var(--acc)}.cath .c{margin-left:auto;font-size:11.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.cat button{display:flex;gap:11px;align-items:flex-start;width:100%;padding:8px 8px;border-radius:11px;text-align:left;cursor:pointer;font:inherit;border:0;background:transparent;color:var(--ink)}
.cat button:hover{background:var(--bg1)}.cat .n{font-size:12px;font-weight:900;color:var(--acc);padding-top:2px;font-variant-numeric:tabular-nums}
.cat .x{display:flex;flex-direction:column;gap:2px;min-width:0}.cat .t{font-size:14px;font-weight:700;letter-spacing:-.02em;line-height:1.38;word-break:keep-all}
.cat .t em{font-style:normal;color:var(--acc)}.cat .t .w{display:inline}.cat .l{font-size:11px;font-weight:700;color:var(--mut)}
.ag{display:flex;justify-content:center;margin-top:26px}.ag button{height:46px;padding:0 24px;border-radius:999px;border:0;background:var(--ink);color:var(--bg1);font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.nv{position:fixed;top:56%;z-index:6;width:clamp(46px,3.7vw,62px);height:clamp(46px,3.7vw,62px);transform:translateY(-50%);border-radius:50%;border:1px solid var(--line);
  background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:0 10px 30px rgba(27,31,36,.12);transition:transform .2s,opacity .3s}
.nv svg{width:42%;height:42%}.nv.p{left:1.4vw}.nv.n{right:1.4vw}.nv:hover{transform:translateY(-50%) scale(1.08)}.nv[disabled]{opacity:0;pointer-events:none}
.hn{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;font-size:12px;font-weight:600;color:var(--mut);padding:6px 14px;border-radius:999px;
  background:var(--glass);border:1px solid var(--line);transition:opacity .8s}.hn.off{opacity:0}
@media (max-width:760px){.top{padding:12px 14px 0}.hd{padding:0 6vw}.nv{top:auto;bottom:14px;transform:none}.hn{display:none}.cat{flex-basis:100%}}
@media print{.top,.nv,.hn{display:none}}`;
  const js=`
const D=JSON.parse(document.getElementById('tud').textContent);
/* 배경음 — 투어 화면과 같은 소리(브라우저에서 합성). 브라우저 규칙상 처음 누르거나 키를 칠 때 시작 */
${tuMusicBuild.toString()}
${tuMusic.toString()}
const MUS=tuMusic(),SIC=${TU_SNDIC.toString()};
let SND=true;try{SND=localStorage.getItem('dmd:tuSound')!=='0';}catch(e){}
if(D.dark)document.documentElement.classList.add('dk');
document.documentElement.lang=D.lang||'ko';
const $=s=>document.querySelector(s),deck=$('.dk2'),N=D.slides.length,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let I=-1,node=null,play=false,pt=0,tm=[],fx=0;
$('.cn').textContent=D.name;document.title=D.name+' · Data Tour';
$('.pg').innerHTML=D.slides.map((s,i)=>'<i data-go="'+i+'"></i>').join('');
const svgNS='http://www.w3.org/2000/svg';
function bodyHtml(s){
  if(s.k==='cover')return '<div class="tiles">'+s.tiles.map(x=>'<div class="tile"><div class="k">'+esc(x.k)+'</div><div class="v">'+esc(x.v)+'</div>'+(x.s?'<div class="s">'+esc(x.s)+'</div>':'')+'</div>').join('')+'</div>';
  if(s.k==='end')return '<div class="cats" style="--nc:'+(s.cats.length<=3?s.cats.length:s.cats.length===4?2:3)+'">'+s.cats.map(c=>'<div class="cat"><div class="cath"><span class="d"></span>'+esc(c.n)+'<span class="c">'+c.items.length+'</span></div>'
    +c.items.map(r=>'<button data-go="'+r.go+'" title="'+esc(r.tl)+'"><span class="n">'+r.n+'</span><span class="x">'+(r.l?'<span class="l">'+esc(r.l)+'</span>':'')+'<span class="t">'+r.t+'</span></span></button>').join('')+'</div>').join('')
    +'</div><div class="ag"><button data-go="0">↺ '+esc(D.ui.again)+'</button></div>';
  if(!s.img)return '';
  /* 강조 — 형광펜(곱하기로 섞여 아래가 그대로 보인다) · 손가락 · 이름표. 위치는 그림 + 표시를 담은 상자(u) 기준 % */
  const x0=s.u[0],y0=s.u[1],UW=s.u[2]-s.u[0],UH=s.u[3]-s.u[1],X=v=>((v-x0)/UW*100)+'%',Y=v=>((v-y0)/UH*100)+'%',WW=v=>(v/UW*100)+'%',HH=v=>(v/UH*100)+'%';
  return '<div class="fig"><img class="base" alt="" src="'+s.img+'" style="left:'+X(0)+';top:'+Y(0)+';width:'+WW(s.w)+';height:'+HH(s.h)+'">'
    +s.mk.map(m=>{const P=4;
      return (m.bk?'':'<i class="mk'+(m.rd?' rd':'')+(m.big?' big':'')+'" data-st="'+m.st+'" style="left:'+X(m.r[0]-P)+';top:'+Y(m.r[1]-P)+';width:'+WW(m.r[2]+P*2)+';height:'+HH(m.r[3]+P*2)+'"></i>')
        +(m.f?'<i class="pt" data-st="'+m.st+'" style="left:'+X(m.f[0])+';top:'+Y(m.f[1])+';width:'+WW(m.f[2])+';transform:rotate('+m.f[3]+'deg)"><i>'+D.hand+'</i></i>':'')
        +(m.p&&m.c?'<span class="chip" data-st="'+m.st+'" style="'+(m.p[4]?'right:'+(((s.u[2]-m.p[0]-m.p[2])/UW)*100)+'%':'left:'+X(m.p[0]))+';top:'+Y(m.p[1])+';height:'+HH(m.p[3])+'">'+esc(m.c)+'</span>':'');}).join('')+'</div>';}
function layout(n,s){
  const hd=n.querySelector('.hd'),st=n.querySelector('.st'),fig=n.querySelector('.fig');
  st.style.top=(hd.offsetTop+hd.offsetHeight+Math.max(14,innerHeight*.028))+'px';
  const cs=[...n.querySelectorAll('.cat')];if(cs.length){cs.forEach(c=>c.style.height='');const mh=Math.max(...cs.map(c=>c.offsetHeight));cs.forEach(c=>c.style.height=mh+'px');}
  if(!fig)return;
  const sw=st.clientWidth,sh=st.clientHeight,w=s.u[2]-s.u[0],h=s.u[3]-s.u[1];   /* 그림 + 강조 표시를 담은 상자(화면 크기 · 그림 파일은 2배 해상도) */
  const k=Math.max(.2,Math.min(1.25,sw/w,sh/h));
  fig.style.width=Math.round(w*k)+'px';fig.style.height=Math.round(h*k)+'px';fig.style.setProperty('--k',k);
  n.querySelector('.in').style.marginTop=Math.max(0,Math.round((sh-h*k)*.3))+'px';}
function mount(i){
  const s=D.slides[i],n=document.createElement('section');n.className='sl '+s.k;
  n.innerHTML='<div class="hd"><div class="eye">'+s.eye+'</div><h2 class="tt">'+s.t+'</h2>'+(s.s?'<p class="sb">'+esc(s.s)+'</p>':'')+'</div><div class="st"><div class="in">'+bodyHtml(s)+'</div></div>';
  deck.appendChild(n);layout(n,s);return n;}
const an=(el,kf,o)=>el&&el.animate?el.animate(kf,o):null;
function go(i,dir){
  if(i<0||i>=N||i===I)return;tm.forEach(clearTimeout);tm=[];clearTimeout(pt);
  dir=dir||(i>I?1:-1);const old=node;I=i;node=mount(i);
  fx-=dir*288;$('.fl').style.backgroundPosition=fx+'px 0';
  if(old){old.style.pointerEvents='none';const a=an(old,[{opacity:1,transform:'none'},{opacity:0,transform:'translate3d('+(-dir*32)+'%,0,-560px) rotateY('+(dir*34)+'deg)'}],{duration:RM?200:820,easing:'cubic-bezier(.7,0,.25,1)',fill:'forwards'});
    const rm=()=>old.isConnected&&old.remove();if(a)a.onfinish=rm;setTimeout(rm,1000);}
  an(node,[{opacity:0,transform:'translate3d('+(dir*36)+'%,0,-640px) rotateY('+(-dir*36)+'deg)'},{opacity:1,transform:'none'}],{duration:RM?220:1050,delay:RM||!old?0:120,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  const E='cubic-bezier(.16,1,.3,1)',ws=[...node.querySelectorAll('.tt .w>span')];
  an(node.querySelector('.eye'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:600,delay:200,easing:E,fill:'backwards'});
  ws.forEach((w,k)=>an(w,[{opacity:0,transform:'translateY(105%) rotateX(-80deg)'},{opacity:1,transform:'none'}],{duration:RM?150:820,delay:RM?0:280+k*60,easing:'cubic-bezier(.2,.85,.25,1)',fill:'backwards'}));
  an(node.querySelector('.sb'),[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:760,delay:RM?0:520+ws.length*45,easing:E,fill:'backwards'});
  an(node.querySelector('.in'),[{opacity:0,transform:'translateY(56px) scale(.95)'},{opacity:1,transform:'none'}],{duration:RM?150:1150,delay:RM?0:330,easing:E,fill:'backwards'});
  /* 그래프는 왼쪽부터 드러난다 */
  an(node.querySelector('.fig .base'),[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:RM?150:1300,delay:RM?0:500,easing:'cubic-bezier(.45,0,.2,1)',fill:'backwards'});
  node.querySelectorAll('.tile,.cat,.ag button').forEach((t,k)=>an(t,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],{duration:RM?150:760,delay:RM?0:480+k*70,easing:E,fill:'backwards'}));
  const n=node,f=n.querySelector('.fig'),mk=f?[...f.querySelectorAll('[data-st]')]:[],sts=[...new Set(mk.map(x=>+x.dataset.st))].sort((a,b)=>a-b);
  const spot=k=>{if(!n.isConnected)return;n.classList.add('hl');mk.forEach(x=>x.classList.toggle('on',+x.dataset.st===k));};
  const T0=RM?200:1900;
  tm.push(setTimeout(()=>spot(sts.length?sts[0]:-1),T0));
  if(sts.length>1){sts.slice(1).forEach((k,j)=>tm.push(setTimeout(()=>spot(k),T0+(j+1)*3000)));tm.push(setTimeout(()=>spot(-1),T0+sts.length*3000));}
  if(play)pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},dur(I));
  paint();}
function dur(i){const f=node&&node.querySelector('.fig'),n=f?new Set([...f.querySelectorAll('[data-st]')].map(x=>x.dataset.st)).size:0;return n>1?Math.max(9000,1900+n*3000+1800):9000;}
function paint(){
  document.querySelectorAll('.pg i').forEach((s,k)=>{s.classList.toggle('on',k<=I);s.classList.toggle('cur',k===I);s.classList.toggle('play',k===I&&play);if(k===I)s.style.setProperty('--dur',dur(I)+'ms');});
  $('.ct').textContent=String(I+1).padStart(2,'0')+' / '+String(N).padStart(2,'0');
  $('.nv.p').disabled=I<=0;$('.nv.n').disabled=I>=N-1;
  $('.bp').setAttribute('aria-pressed',play?'true':'false');
  $('.bp').innerHTML=play?'<svg viewBox="0 0 16 16"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 16 16"><path d="M5.2 3.4v9.2l7.3-4.6z" fill="currentColor"/></svg>';}
function setPlay(on){play=!!on;clearTimeout(pt);if(play){if(I>=N-1){go(0,1);return;}pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},dur(I));}paint();}
function fs(){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}}
function snd(on){if(on!=null){SND=on;try{localStorage.setItem('dmd:tuSound',on?'1':'0');}catch(e){}}
  if(SND)MUS.start();else MUS.stop();
  const b=$('.bs');b.setAttribute('aria-pressed',SND?'true':'false');b.innerHTML=SIC(SND);b.title=SND?D.ui.sndOn:D.ui.sndOff;}
const wake=e=>{if(e.target&&e.target.closest&&e.target.closest('.bs'))return;removeEventListener('pointerdown',wake,true);removeEventListener('keydown',wake,true);if(SND)snd();};
addEventListener('pointerdown',wake,true);addEventListener('keydown',wake,true);
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],.nv,.bp,.bf,.bs');if(!t)return;
  if(t.classList.contains('bs')){removeEventListener('pointerdown',wake,true);removeEventListener('keydown',wake,true);return snd(!(SND&&MUS.on));}
  if(t.classList.contains('nv'))return t.classList.contains('p')?go(I-1,-1):go(I+1,1);
  if(t.classList.contains('bp'))return setPlay(!play);if(t.classList.contains('bf'))return fs();
  setPlay(false);go(+t.dataset.go);});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
  if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();go(I+1,1);}
  else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){e.preventDefault();go(I-1,-1);}
  else if(k==='Home')go(0,-1);else if(k==='End')go(N-1,1);
  else if(k==='p'||k==='P')setPlay(!play);else if(k==='f'||k==='F')fs();
  else if(k==='m'||k==='M')snd(!(SND&&MUS.on));});
let sx=null,sy=0;
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){sx=e.clientX;sy=e.clientY;}});
addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)dx<0?go(I+1,1):go(I-1,-1);});
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(node)layout(node,D.slides[I]);},120);});
$('.hn').textContent=D.ui.hint;setTimeout(()=>$('.hn').classList.add('off'),5200);
$('.nv.p').setAttribute('aria-label',D.ui.prev);$('.nv.n').setAttribute('aria-label',D.ui.next);$('.bp').title=D.ui.play;$('.bf').title=D.ui.fs;
{const b=$('.bs');b.setAttribute('aria-pressed',SND?'true':'false');b.innerHTML=SIC(SND);b.title=SND?D.ui.sndOn:D.ui.sndOff;}
go(0,1);`;
  return `<!doctype html>
<html lang="${esc(D.lang||'ko')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.name)} · Data Tour</title>
<meta name="generator" content="Media Dashboard · Data Tour (${esc(D.made)})">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${css}</style></head><body>
<div class="fw"><div class="fl"></div></div>
<div class="top"><div class="pg"></div><div class="mt"><span class="br"><span class="d"></span><b>DATA TOUR</b><span class="cn"></span></span><span class="sp"></span>
<span class="ct"></span><button class="ib bs" type="button"></button><button class="ib bp" type="button"></button><button class="ib bf" type="button"><svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>
<div class="dk2"></div>
<button class="nv p" type="button"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="nv n" type="button"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<div class="hn"></div>
<script type="application/json" id="tud">${json}</`+`script>
<script>${js}</`+`script>
</body></html>`;}
/* ---------- 10. 배경음 (v119) — 발표장 분위기를 깨지 않는 잔잔한 리듬. 브라우저에서 직접 합성(음원 파일 없음 · 저작권 걱정 없음) ----------
   76BPM · Am(add9) → Fmaj7 → C(add9) → G6 두 마디씩 되풀이(약 25초).
   부드러운 패드 + 낮은 맥박(킥 · 베이스 당김음) + 작은 아르페지오(점8분 메아리) + 아주 옅은 셰이커, 잔향.
   처음 두 마디는 패드 · 아르페지오만 — 서서히 들어오고, 닫을 때 1초 동안 줄어든다.
   위 오른쪽 스피커 단추 · M 키로 끄고 켠다(끈 것은 이 브라우저가 기억). 저장한 HTML 파일에도 같은 소리가 들어간다 */
function tuMusicBuild(ctx){
  const SR=ctx.sampleRate,E8=30/76,mf=m=>440*Math.pow(2,(m-69)/12),R=Math.random;
  /* [베이스, 패드, 아르페지오] */
  const CH=[[45,[57,60,64,71],[69,72,76,71,74]],[41,[57,60,64,67],[65,69,72,76,74]],
            [48,[55,60,62,64],[67,72,74,76,79]],[43,[55,59,62,64],[67,71,74,76,79]]];
  const PAT=[[0,-1,1,2,-1,1,3,-1,0,-1,1,2,-1,4,2,-1],[0,1,-1,2,3,-1,2,1,0,-1,2,-1,3,2,-1,1]];
  const g=v=>{const n=ctx.createGain();n.gain.value=v;return n;};
  const lp=(f,q)=>{const n=ctx.createBiquadFilter();n.type='lowpass';n.frequency.value=f;n.Q.value=q||.5;return n;};
  const master=g(0),comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-20;comp.ratio.value=3;comp.attack.value=.02;comp.release.value=.3;
  const bus=g(1);bus.connect(comp);comp.connect(master);master.connect(ctx.destination);
  /* 잔향 — 서서히 줄어드는 잡음으로 만든 공간 */
  const rv=ctx.createConvolver(),n=Math.floor(SR*3.2),ib=ctx.createBuffer(2,n,SR);
  for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<n;i++)d[i]=(R()*2-1)*Math.pow(1-i/n,2.6);}
  rv.buffer=ib;const rvo=g(.5);rv.connect(rvo);rvo.connect(bus);
  /* 메아리 — 점4분(8분 셋) 뒤, 갈수록 어둡게 */
  const dl=ctx.createDelay(2);dl.delayTime.value=E8*3;const dfb=g(.3),dlf=lp(1700);
  dl.connect(dlf);dlf.connect(dfb);dfb.connect(dl);const dlo=g(.32);dlf.connect(dlo);dlo.connect(bus);
  const send=(node,dry,rev,del)=>{const a=g(dry);node.connect(a);a.connect(bus);
    if(rev){const r=g(rev);node.connect(r);r.connect(rv);}if(del){const d=g(del);node.connect(d);d.connect(dl);}};
  const padF=lp(950,.4),lfo=ctx.createOscillator(),lfg=g(300);lfo.frequency.value=.045;lfo.connect(lfg);lfg.connect(padF.frequency);lfo.start();
  send(padF,1,.6,0);
  const arpF=lp(2400);send(arpF,.85,.45,.55);
  const bassF=lp(420);send(bassF,1,.04,0);
  const drum=g(1);send(drum,1,.12,0);
  const noise=ctx.createBuffer(1,SR,SR);{const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=R()*2-1;}
  const env=(p,t,a,v,d)=>{p.setValueAtTime(0,t);p.linearRampToValueAtTime(v,t+a);p.exponentialRampToValueAtTime(.0004,t+d);};
  function pad(ns,t,d){ns.forEach((m,k)=>{const a=g(0);a.connect(padF);
    a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(.014,t+1.6);a.gain.setValueAtTime(.014,t+d-.1);a.gain.linearRampToValueAtTime(0,t+d+2);
    [-7,7].forEach(dt=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=mf(m);o.detune.value=dt+(k%2?3:-3);o.connect(a);o.start(t);o.stop(t+d+2.1);});});}
  /* 베이스 — 사인 + 한 옥타브 위 세모파를 조금(노트북 스피커에서도 음이 들리게) */
  function bass(m,t,d,v){const a=g(0);a.connect(bassF);
    a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(v,t+.04);a.gain.setValueAtTime(v,t+d*.6);a.gain.linearRampToValueAtTime(0,t+d);
    [['sine',1,1],['triangle',2,.28]].forEach(([ty,k,lv])=>{const o=ctx.createOscillator(),b=g(lv);o.type=ty;o.frequency.value=mf(m)*k;o.connect(b);b.connect(a);o.start(t);o.stop(t+d+.05);});}
  function pluck(m,t,v){const o=ctx.createOscillator(),a=g(0);o.type='triangle';o.frequency.value=mf(m);o.connect(a);a.connect(arpF);
    env(a.gain,t,.006,v,.95);o.start(t);o.stop(t+1);}
  /* 킥 — 낮은 사인 + 짧은 윗소리(작은 스피커에서도 박이 느껴지게) */
  function kick(t,v){[[105,44,1,.5],[210,90,.3,.18]].forEach(([f0,f1,lv,d])=>{const o=ctx.createOscillator(),a=g(0);o.type='sine';
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+.17);o.connect(a);a.connect(drum);env(a.gain,t,.008,v*lv,d);o.start(t);o.stop(t+d+.05);});}
  function shk(t,v){const b=ctx.createBufferSource(),f=ctx.createBiquadFilter(),a=g(0);b.buffer=noise;f.type='bandpass';f.frequency.value=7200;f.Q.value=.9;
    b.connect(f);f.connect(a);a.connect(drum);env(a.gain,t,.004,v,.075);b.start(t,R()*.5);b.stop(t+.09);}
  let step=0,next=ctx.currentTime+.08;
  function play(s,t){
    const c=CH[Math.floor(s/16)%4],i=s%16,b=s%8,intro=s<16,pat=PAT[Math.floor(s/64)%2];
    if(i===0)pad(c[1],t,16*E8);
    if(b===0)bass(c[0],t,E8*2.8,intro?.06:.085);if(b===3)bass(c[0],t,E8*4.6,intro?.045:.07);
    const k=pat[i];if(k>=0)pluck(c[2][k],t+(R()-.5)*.008,(intro?.03:.042)*(i===0?1.3:1)*(.85+R()*.3));
    if(!intro){if(b===0||b===4)kick(t,b===0?.2:.15);if(s%2)shk(t,(b===3||b===7?.013:.008)*(.8+R()*.4));}}
  return {master,lfo,schedule(until){while(next<until){play(step,next);next+=E8;step++;}}};}
function tuMusic(){
  const AC=window.AudioContext||window.webkitAudioContext,VOL=.9;
  let ctx=null,eng=null,timer=0;
  return {
    get on(){return !!timer;},
    start(){
      if(!AC||timer)return;
      try{if(!ctx){ctx=new AC();eng=tuMusicBuild(ctx);}if(ctx.resume)ctx.resume();}catch(e){ctx=null;return;}
      const m=eng.master.gain,t=ctx.currentTime;m.cancelScheduledValues(t);m.setValueAtTime(m.value,t);m.linearRampToValueAtTime(VOL,t+2.5);
      const tick=()=>{if(ctx)eng.schedule(ctx.currentTime+1.2);};tick();timer=setInterval(tick,200);},
    stop(){
      clearInterval(timer);timer=0;if(!ctx)return;
      const c=ctx,m=eng.master.gain,t=c.currentTime;m.cancelScheduledValues(t);m.setValueAtTime(m.value,t);m.linearRampToValueAtTime(0,t+.9);
      ctx=null;eng=null;setTimeout(()=>{try{c.close();}catch(e){}},1100);}};}
/* 확인용 — 몇 초를 미리 그려 소리 크기를 잰다(오프라인) */
async function tuMusicRender(sec){
  const c=new OfflineAudioContext(2,Math.round(44100*sec),44100),e=tuMusicBuild(c);
  e.master.gain.value=.9;e.schedule(sec);return c.startRendering();}
const TU_SND={m:null,on:true};
try{TU_SND.on=localStorage.getItem('dmd:tuSound')!=='0';}catch(e){}
const TU_SNDIC=on=>'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 6h2.4L8 3.3v9.4L4.8 10H2.4z" fill="currentColor"/>'
  +(on?'<path class="wv" d="M10.4 5.7a3.2 3.2 0 0 1 0 4.6M12.2 4a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
      :'<path d="M10.6 6.2l3.4 3.6M14 6.2l-3.4 3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')+'</svg>';
function tuPaintSnd(){
  const b=TU.el&&TU.el.querySelector('.tu-snd');if(!b)return;
  b.setAttribute('aria-pressed',TU_SND.on?'true':'false');b.innerHTML=TU_SNDIC(TU_SND.on);
  b.title=TU_SND.on?L('배경음 끄기 (M)','Mute music (M)'):L('배경음 켜기 (M)','Play music (M)');}
/* on — true 켜기 · false 끄기 · 비우면 바꾸기. keep — 설정(다음에도 켤지)은 건드리지 않는다 */
function tuSound(on,keep){
  if(on==null)on=!TU_SND.on;
  if(!keep){TU_SND.on=on;try{localStorage.setItem('dmd:tuSound',on?'1':'0');}catch(e){}}
  if(on){if(!TU_SND.m)TU_SND.m=tuMusic();TU_SND.m.start();}else if(TU_SND.m)TU_SND.m.stop();
  tuPaintSnd();}
(function(){const b=$('tourBtn');if(b)b.addEventListener('click',()=>{try{tuOpen();}catch(e){console.warn('tour',e);}});})();
