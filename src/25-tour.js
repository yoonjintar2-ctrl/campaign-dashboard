
/* ===== 데이터 투어 (v116) =====
   디지털 대시보드 › 서머리의 그래프를 한 장씩 전체 화면으로 — 바로 발표할 수 있게.
   ■ 장면 — 표지 → 화면에 보이는 영역(숨긴 영역 · 숨긴 서머리는 빠짐) 하나씩 → 마무리(핵심 요약 · PPT 저장)
     유입 분석은 세 장(흐름 · 랜딩/체류 · 상세 표)으로 나눈다
   ■ 위쪽 제목 · 부제목 = 그 영역에서 자동으로 뽑은 시사점(한/영). 제목 속 숫자는 강조색
   ■ 그래프는 화면 가운데에서 떠오르며 채워지고(23-anim 규칙 그대로) · 시사점과 관련된 부분을 은은하게 강조(주변을 옅게 · 테두리 · 이름표)
   ■ 좌우 단추 · ← → · Space · PageUp/Down(발표용 리모컨) · 스와이프 · 진행 막대 클릭 · P 자동 재생 · Esc 닫기
   ■ 넘어갈 때 3D 로 돌아 나가고 들어온다. 바닥 격자도 함께 흘러 카메라가 옆 전시물로 옮겨 가는 느낌
   ■ 마지막 장의 'PPT로 저장' — 장마다 위쪽에 편집할 수 있는 글(Pretendard) + 바탕 없는(누끼) 그래프 그림 + 강조 테두리(도형)
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
function tuMk(key,label,els,keep){
  const {src,W,tblX}=tuClone(els,keep);
  const sl={kind:'body',key,label,src,W,tblX,chips:[]};
  const h=(el,chip)=>{if(!el)return;el.setAttribute('data-tuhl',String(sl.chips.length));sl.chips.push(chip||'');};
  let r=null;
  try{const f=TU_INS[key];r=f?f(sl,h):null;}catch(e){console.warn('tour insight',key,e);}
  if(r&&r.skip)return null;
  /* 시사점도 없고 그래프 · 표도 없으면(데이터 없음 안내뿐) 장면을 뺀다 */
  if(!r&&!src.querySelector('svg,table,canvas,img,.stat,.donut,.cr,.tile,.infk,.cmt'))return null;
  if(!r||!r.t){src.querySelectorAll('[data-tuhl]').forEach(n=>n.removeAttribute('data-tuhl'));sl.chips=[];r={t:label,s:''};}
  sl.t=r.t;sl.s=r.s||'';sl.noFade=!!r.noFade;
  return sl;}
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
    const sl=tuMk(key,label,g.els);
    if(sl)out.push(sl);});
  return out;}

/* ---------- 2. 시사점 — 영역마다 제목 · 부제목 · 강조할 곳 ---------- */
const tuDay=d=>L(`${d.getMonth()+1}/${d.getDate()}(${'일월화수목금토'[d.getDay()]})`,
  `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`);
const tuJoin=a=>a.filter(Boolean).join(' · ');
const TU_INS={
  /* 캠페인 진행 현황 — 목표 페이스 대비 */
  pace(sl,h){
    const rows=[...sl.src.querySelectorAll('.pline')].map(line=>{
      const b=line.querySelector('.pbar[data-tip]');let d=null;
      try{d=b&&JSON.parse(b.getAttribute('data-tip'));}catch(e){}
      return d&&d.goal>0&&isFinite(d.pr)?{line,pr:d.pr,l:tuTx(line.querySelector('.pside .nm1'))||d.l}:null;}).filter(Boolean);
    if(!rows.length)return null;
    const n=rows.length,ok=rows.filter(x=>x.pr>=0.995).length;
    const best=rows.reduce((a,b)=>b.pr>a.pr?b:a),worst=rows.reduce((a,b)=>b.pr<a.pr?b:a);
    const m=/(\d+(?:\.\d+)?)\s*%/.exec(tuTx(sl.src.querySelector('.phead'))),el=m?m[1]+'%':'';
    h(best.line,L(`페이스 대비 ${tuPc(best.pr)}`,`${tuPc(best.pr)} of pace`));
    const bp=E(tuPc(best.pr));
    const t=ok===n?L(`${E(n+'개')} 지표 모두 목표 페이스 달성`,`All ${E(n)} metrics on target pace`)
      :ok?L(`${best.l} ${bp}, 목표 페이스를 앞서는 중`,`${best.l} ahead of pace at ${bp}`)
      :L(`${best.l} ${bp}, 목표 페이스에 가장 근접`,`${best.l} closest to pace at ${bp}`);
    return {t,s:tuJoin([el&&L(`캠페인 ${el} 경과`,`${el} of the flight elapsed`),
      L(`${n}개 지표 중 ${ok}개 페이스 달성`,`${ok} of ${n} metrics on pace`),
      worst!==best&&L(`가장 더딘 지표 ${worst.l} ${tuPc(worst.pr)}`,`slowest: ${worst.l} at ${tuPc(worst.pr)}`)])};},
  /* 주요 지표 — 페이스 대비 가장 앞선 지표 */
  stat(sl,h){
    const pp=s=>{const m=/[+−-]\s?\d[\d.,]*\s?%p?/.exec(s||'');return m?m[0].replace(/\s/g,''):'';};
    const cs=[...sl.src.querySelectorAll('.stat')].map(c=>{const dl=c.querySelector('.dl');
      return {c,k:tuTx(c.querySelector('.k')),v:tuTx(c.querySelector('.v')),r:tuTx(c.querySelector('.r b')),
        dt:dl?pp(tuTx(dl)):'',d:dl?tuNum(pp(tuTx(dl))):NaN};}).filter(x=>x.k&&x.v);
    if(!cs.length)return null;
    const wd=cs.filter(x=>isFinite(x.d));
    if(!wd.length){h(cs[0].c,'');
      return {t:L(`핵심 지표 ${E(cs.length+'개')} 한눈에`,`${E(cs.length)} key metrics at a glance`),s:tuJoin(cs.slice(0,4).map(x=>`${x.k} ${x.v}`))};}
    const best=wd.reduce((a,b)=>b.d>a.d?b:a),worst=wd.reduce((a,b)=>b.d<a.d?b:a),up=wd.filter(x=>x.d>=0).length;
    const g=E(Math.abs(best.d).toFixed(1)+'%p');
    h(best.c,L(`페이스 대비 ${best.dt}`,`${best.dt} vs pace`));
    const t=best.d>0?L(`${best.k}, 목표 페이스보다 ${g} 앞서`,`${best.k} ${g} ahead of pace`)
      :best.d===0?L(`${best.k}, 목표 페이스와 나란히`,`${best.k} right on pace`)
      :L(`${best.k}, 목표 페이스까지 ${g}`,`${best.k} ${g} short of pace`);
    return {t,s:tuJoin([best.r?L(`${best.k} 현재 달성률 ${best.r}`,`${best.k} at ${best.r} of goal`):`${best.k} ${best.v}`,
      L(`페이스 이상 ${up}/${wd.length}개 지표`,`${up} of ${wd.length} metrics at or above pace`),
      worst!==best&&L(`가장 뒤처진 ${worst.k} ${worst.dt}`,`furthest behind: ${worst.k} ${worst.dt}`)])};},
  /* KPI 달성 현황 — 도넛 */
  kpi(sl,h){
    const ds=[...sl.src.querySelectorAll('.donut')];
    const sp=ds.find(d=>d.classList.contains('spend'));
    const it=ds.filter(d=>d!==sp).map(d=>{const a=d.querySelector('.achv');
      return {d,nm:tuTx(d.querySelector('.dhd .k')),vt:tuTx(a),v:tuNum(tuTx(a))};}).filter(x=>x.nm&&isFinite(x.v));
    const spv=sp?tuTx(sp.querySelector('.achv')):'';
    if(!it.length){if(!sp)return null;h(sp,'');return {t:L(`예산 소진율 ${E(spv)}`,`Budget spent: ${E(spv)}`),s:''};}
    const top=it.reduce((a,b)=>b.v>a.v?b:a),low=it.reduce((a,b)=>b.v<a.v?b:a),hit=it.filter(x=>x.v>=100).length;
    h(top.d,L(`최고 ${top.vt}`,`Top ${top.vt}`));
    const t=hit===it.length&&it.length>1?L(`${E(it.length+'개')} 모두 KPI ${E('100%')} 이상 달성`,`All ${E(it.length)} beat ${E('100%')} of KPI`)
      :L(`${top.nm} KPI 달성률 ${E(top.vt)}로 최고`,`${top.nm} leads KPI achievement at ${E(top.vt)}`);
    return {t,s:tuJoin([L(`KPI 100% 이상 ${hit}/${it.length}개`,`${hit} of ${it.length} at 100%+`),
      spv&&L(`예산 소진율 ${spv}`,`budget spent ${spv}`),
      low!==top&&L(`가장 낮은 ${low.nm} ${low.vt}`,`lowest: ${low.nm} at ${low.vt}`)])};},
  /* 일자별 효율 — 막대 최고일 · 꺾은선 최고일 */
  daily(sl,h){
    const D=TU.daily;if(!D||!D.ds||!D.EL)return null;
    const n=Math.min(D.EL,D.ds.length),tot=D.totals.slice(0,n);
    let pi=0;tot.forEach((v,i)=>{if(v>tot[pi])pi=i;});
    if(!(tot[pi]>0))return null;
    const fb=v=>D.bf?D.bf(v):Math.round(v).toLocaleString('en-US'),fk=v=>tuBig(v,D.bf);
    const bl=tuSelTx('barSel'),ll=tuSelTx('lineSel');
    h(sl.src.querySelectorAll('.dbar')[pi],fb(tot[pi]));
    const dpk=E(tuDay(D.ds[pi])),vpk=E(fk(tot[pi]));
    const avg=tot.reduce((a,b)=>a+b,0)/n;
    let li=-1;
    if(D.lineVals&&D.lf&&ll)D.lineVals.slice(0,n).forEach((v,i)=>{if(isFinite(v)&&(li<0||v>D.lineVals[li]))li=i;});
    return {t:L(`${dpk} ${bl} ${vpk}, 기간 최고`,`${bl} peaked at ${vpk} on ${dpk}`),
      s:tuJoin([L(`${n}일 집행 · 일평균 ${fk(avg)}`,`${n} days live · ${fk(avg)} a day on average`),
        li>=0&&L(`${ll} 최고 ${tuDay(D.ds[li])} ${D.lf(D.lineVals[li])}`,`${ll} high of ${D.lf(D.lineVals[li])} on ${tuDay(D.ds[li])}`)])};},
  /* 서머리 표 — KPI 단가(목표 대비)가 가장 좋은 라인 */
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
    const totBits=[];
    if(tot){const j=labs.findIndex(l=>/소진율|spend\s*%|spend rate|burn/i.test(l));if(j>=0)totBits.push(L(`전체 ${labs[j]} ${tuTx(tot.vals[j])}`,`total ${labs[j]} ${tuTx(tot.vals[j])}`));
      labs.forEach((l,i)=>{if(totBits.length<3&&/달성|achv|achiev/i.test(l))totBits.push(`${l} ${tuTx(tot.vals[i])}`);});}
    /* KPI 열(kpicol) — 목표 · 실적 한 쌍 */
    const kp=[];
    det.forEach(x=>{const ks=x.vals.map((c,j)=>c.classList.contains('kpicol')?j:-1).filter(j=>j>=0);
      if(ks.length<2)return;
      const a=ks[0],b=ks[1],tg=tuNum(tuTx(x.vals[a])),ac=tuNum(tuTx(x.vals[b]));
      if(!(tg>0&&ac>0))return;
      const cost=tuCost(labs[b]);
      kp.push({x,j:b,m:labs[b],cost,tgt:tuTx(x.vals[a]),act:tuTx(x.vals[b]),g:cost?(tg-ac)/tg:(ac-tg)/tg});});
    if(kp.length){
      const best=kp.reduce((a,b)=>b.g>a.g?b:a),met=kp.filter(z=>z.g>=0).length,pr=Math.abs(best.g*100).toFixed(1)+'%';
      h(best.x.vals[best.j],L(`목표 ${best.tgt} → ${best.act}`,`Target ${best.tgt} → ${best.act}`));
      [...best.x.r.cells].filter(c=>c.classList.contains('head')).concat(best.x.vals.filter(c=>c.classList.contains('kpicol'))).forEach(c=>c.setAttribute('data-tukeep',''));
      const tt=best.g>=0
        ?(best.cost?L(`${best.x.name} ${best.m} ${E(best.act)}, 목표 대비 ${E(pr)} 절감`,`${best.x.name} ${best.m} ${E(best.act)}, ${E(pr)} under target`)
                   :L(`${best.x.name} ${best.m} 목표 대비 ${E(pr)} 초과 달성`,`${best.x.name} beats its ${best.m} target by ${E(pr)}`))
        :L(`${best.x.name} ${best.m}, 목표에 가장 근접`,`${best.x.name} is closest to its ${best.m} target`);
      return {t:tt,s:tuJoin([L(`KPI 목표 달성 ${met}/${kp.length}개 라인`,`${met} of ${kp.length} lines on KPI target`)].concat(totBits))};}
    /* KPI 열이 없으면 — 달성률 열에서 가장 높은 칸 */
    let best=null;
    labs.forEach((l,j)=>{if(!/달성|achv|achiev/i.test(l))return;
      det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(isFinite(v)&&(!best||v>best.v))best={x,j,v,l,vt:tuTx(x.vals[j])};});});
    if(!best){
      /* 목표 · 달성률 열이 없는 표(매체별 효율 비교 등) — KPI 열(없으면 첫 단가 열)에서 가장 좋은 라인, 비율 열(CTR · 유입률 …)에서 가장 높은 라인 */
      const pct=j=>det.some(x=>/%\s*$/.test(tuTx(x.vals[j])));
      const colBest=(j,low)=>{let b=null;det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(!isFinite(v)||v<=0)return;
        if(!b||(low?v<b.v:v>b.v))b={x,j,v,vt:tuTx(x.vals[j]),l:labs[j]};});return b;};
      const cnt=new Map();det.forEach(x=>x.vals.forEach((c,j)=>{if(c.classList.contains('kpicol'))cnt.set(j,(cnt.get(j)||0)+1);}));
      let j0=[...cnt].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0];
      if(j0==null)j0=labs.findIndex((l,j)=>tuCost(l)&&!pct(j));
      if(j0==null||j0<0)j0=labs.findIndex((l,j)=>pct(j));
      if(j0==null||j0<0||det.length<2)return totBits.length?{t:sl.label,s:tuJoin(totBits)}:null;
      const low=tuCost(labs[j0])&&!pct(j0),b0=colBest(j0,low);
      if(!b0)return null;
      h(b0.x.vals[j0],`${b0.l} ${b0.vt}`);
      [...b0.x.r.cells].filter(c=>c.classList.contains('head')).forEach(c=>c.setAttribute('data-tukeep',''));
      const j1=labs.findIndex((l,j)=>j!==j0&&pct(j)&&/유입률|CTR|VTR|inflow|rate/i.test(l));
      const b1=j1>=0?colBest(j1,false):null;
      return {t:low?L(`${b0.l} 최저 — ${b0.x.name} ${E(b0.vt)}`,`Lowest ${b0.l}: ${b0.x.name} at ${E(b0.vt)}`)
                   :L(`${b0.l} 최고 — ${b0.x.name} ${E(b0.vt)}`,`Highest ${b0.l}: ${b0.x.name} at ${E(b0.vt)}`),
        s:tuJoin([b1&&L(`${b1.l} 최고 ${b1.x.name} ${b1.vt}`,`highest ${b1.l}: ${b1.x.name} ${b1.vt}`),
          L(`비교 라인 ${det.length}개`,`${det.length} lines compared`)].concat(totBits))};}
    h(best.x.vals[best.j],best.vt);
    [...best.x.r.cells].filter(c=>c.classList.contains('head')).forEach(c=>c.setAttribute('data-tukeep',''));
    return {t:L(`${best.x.name} ${best.l} ${E(best.vt)}로 최고`,`${best.x.name} tops ${best.l} at ${E(best.vt)}`),s:tuJoin(totBits)};},
  /* 운영 코멘트 — 비어 있으면 장면을 뺀다 */
  comment(sl){
    const c=sl.src.querySelector('.cmt');const tx=tuTx(c);if(!tx)return {skip:1};
    const leaf=[...c.querySelectorAll('*')].filter(e=>!e.querySelector('div,p,li')).map(tuTx).filter(x=>x.length>=8);
    const first=(leaf.find(x=>x.length>=14)||leaf[0]||tx);
    return {t:L('이번 기간 운영 포인트','Key notes from this period'),s:first.length>120?first.slice(0,118)+'…':first};},
  /* 소재 × 일자 — 기준 지표 1위 소재 · 가장 오래 게재된 소재 */
  gantt(sl,h){
    const t=sl.src.querySelector('table.gantt')||sl.src.querySelector('table');if(!t||!t.tBodies.length)return null;
    const hr=t.tHead?[...t.tHead.rows]:[];
    const ml=hr.length?[...hr[hr.length-1].cells].filter(c=>c.classList.contains('mcol')).map(tuTx):[];
    const rows=[...t.tBodies[0].rows].map(r=>{const nm=r.querySelector('td.nm');if(!nm)return null;
      const ms=[...r.querySelectorAll('td.mcol')];
      return {r,nm:tuTx(nm),ms,hi:ms.findIndex(c=>c.classList.contains('hl')),days:r.querySelectorAll('td.day>.b').length};}).filter(Boolean);
    if(!rows.length)return null;
    const j=Math.max(0,rows[0].hi),lab=ml[j]||'',cost=tuCost(lab);
    const ok=rows.filter(x=>x.ms[j]&&isFinite(tuNum(tuTx(x.ms[j])))&&tuNum(tuTx(x.ms[j]))>0);
    const long=rows.reduce((a,b)=>b.days>a.days?b:a);
    const tail=L(`게재 소재 ${rows.length}개 · 가장 오래 게재 ${long.nm} ${long.days}일`,`${rows.length} creatives ran · longest: ${long.nm}, ${long.days} days`);
    if(!ok.length){h(long.r,L(`${long.days}일 게재`,`${long.days} days`));return {t:L(`가장 오래 게재된 소재 — ${long.nm} ${E(long.days+'일')}`,`${long.nm} ran longest — ${E(long.days+' days')}`),s:tail};}
    const v=x=>tuNum(tuTx(x.ms[j]));
    const top=ok.reduce((a,b)=>(cost?v(b)<v(a):v(b)>v(a))?b:a),vt=tuTx(top.ms[j]),vk=E(cost?vt:tuBig(v(top)));
    h(top.r,`${lab} ${vt}`);
    return {t:cost?L(`소재 중 ${lab} 최저 — ${top.nm} ${vk}`,`${top.nm} is the most efficient on ${lab} (${vk})`)
                  :L(`소재 중 ${lab} 최다 — ${top.nm} ${vk}`,`${top.nm} leads all creatives on ${lab} — ${vk}`),s:tail};},
  /* 효율 우수 소재 — 기준마다 1위 */
  creative(sl,h){
    const cols=[...sl.src.querySelectorAll('.crcol')].map(c=>{const ld=c.querySelector('.cr.lead')||c.querySelector('.cr');
      return ld&&{m:tuTx(c.querySelector('.crband .t')),ld,nm:tuTx(ld.querySelector('.meta .nm')),v:tuTx(ld.querySelector('.eff b')),md:tuTx(ld.querySelector('.media'))};})
      .filter(x=>x&&x.nm);
    if(!cols.length)return null;
    cols.forEach((x,k)=>h(x.ld,k===0?L(`${x.m} 1위`,`#1 ${x.m}`):''));
    const a=cols[0],same=cols.length>1&&cols.every(x=>x.nm===a.nm);
    return {t:same?L(`${a.nm}, ${cols.map(x=>x.m).join(' · ')} 모두 ${E('1위')}`,`${a.nm} ranks ${E('#1')} on ${cols.map(x=>x.m).join(', ')}`)
                  :L(`${a.m} 효율 ${E('1위')} — ${a.nm} ${E(a.v)}`,`${a.nm} ranks ${E('#1')} on ${a.m} at ${E(a.v)}`),
      s:same?tuJoin(cols.map(x=>`${x.m} ${x.v}`))
        :(tuJoin(cols.slice(1).map(x=>L(`${x.m} 1위 ${x.nm} ${x.v}`,`${x.m}: ${x.nm} ${x.v}`)))||tuJoin([a.md,L('효율 상위 소재','top creatives')]))};},
  /* 히트맵 — 가장 낮은 단가를 가장 많이 낸 요일(날) */
  heat(sl,h){
    const t=sl.src.querySelector('table.heat')||sl.src.querySelector('table');if(!t||!t.tBodies.length)return null;
    let cat='';const grp=[];
    for(const r of t.tBodies[0].rows){
      if(r.classList.contains('hcat')){if(grp.length)break;cat=tuTx(r);continue;}
      if(r.querySelector('td.hm'))grp.push(r);}
    if(grp.length<2)return null;
    const nc=grp[0].querySelectorAll('td.hm').length,win=new Map(),lose=new Map();
    for(let j=0;j<nc;j++){let lo=null,hi=null;
      grp.forEach(r=>{const v=tuNum(tuTx(r.querySelectorAll('td.hm')[j]));if(!isFinite(v)||v<=0)return;
        if(!lo||v<lo.v)lo={r,v};if(!hi||v>hi.v)hi={r,v};});
      if(lo)win.set(lo.r,(win.get(lo.r)||0)+1);if(hi)lose.set(hi.r,(lose.get(hi.r)||0)+1);}
    if(!win.size)return null;
    const best=[...win].sort((a,b)=>b[1]-a[1])[0],worst=[...lose].sort((a,b)=>b[1]-a[1])[0];
    const nm=r=>tuTx(r.querySelector('td.head'));
    const dow=/요일|week/i.test(cat);
    h(best[0],L(`최저 단가 ${best[1]}/${nc}`,`Lowest cost ${best[1]}/${nc}`));
    const bn=E(nm(best[0]));
    return {t:dow?L(`가장 효율 좋은 요일은 ${bn}`,`${bn} is the most efficient day`)
                 :L(`가장 효율 좋은 날은 ${bn}`,`${bn} was the most efficient day`),
      s:tuJoin([L(`${nc}개 지표 중 ${best[1]}개에서 가장 낮은 단가`,`lowest cost on ${best[1]} of ${nc} metrics`),
        worst&&worst[0]!==best[0]&&L(`단가가 가장 높은 ${dow?'요일':'날'} ${nm(worst[0])}`,`priciest: ${nm(worst[0])}`)])};},
  /* 분포(트리맵) — 가장 큰 덩어리 */
  treemap(sl,h){
    const ss=[...sl.src.querySelectorAll('.sect')].map(s=>{const m=/^(.*?)\s*(\d[\d.,]*%)$/.exec(tuTx(s.querySelector('.sh')));
      return m&&{s,nm:m[1].trim(),p:m[2],v:tuNum(m[2])};}).filter(Boolean).sort((a,b)=>b.v-a.v);
    if(!ss.length)return null;
    const met=tuTx($('tmapTitle')).replace(/\s*(분포|distribution|breakdown)\s*$/i,'')||L('값','value');
    const a=ss[0];h(a.s,a.p);
    const rest=ss.slice(1,3).map(x=>`${x.nm} ${x.p}`).join(' · ');
    return {t:L(`${met}의 ${E(a.p)}, ${a.nm}에서`,`${a.nm} holds a ${E(a.p)} ${met} share`),
      s:rest?L(`이어서 ${rest} 순 · 모두 ${ss.length}개`,`followed by ${rest} · ${ss.length} in total`):''};},
  /* 효율 버블 — 오른쪽 위(두 지표 모두 좋음)에 가장 가까운 원 */
  bubble(sl,h){
    const cs=[...sl.src.querySelectorAll('circle.bub[data-g]')];if(!cs.length)return null;
    const b=cs.reduce((a,c)=>+c.getAttribute('data-g')>+a.getAttribute('data-g')?c:a);
    const ax=[...sl.src.querySelectorAll('text.axt')].map(tuTx);
    const nm=b.getAttribute('data-nm')||L('(미지정)','(Unassigned)');
    h(b,L('효율 최상','Most efficient'));
    return {t:L(`${nm}, 두 효율 모두 ${E('최상위')}`,`${nm} leads on ${E('both')} efficiency axes`),
      s:tuJoin([ax[0]&&`${ax[0]} ${b.getAttribute('data-xf')||''}`,ax[1]&&`${ax[1]} ${b.getAttribute('data-yf')||''}`,b.getAttribute('data-md')])};},
  /* 유입 ① — 핵심 지표 + 흐름 */
  infA(sl,h){
    const ks=[...sl.src.querySelectorAll('.infk')].map(k=>({k:tuTx(k.querySelector('span')).replace(/\s*\([^)]*\)\s*$/,''),v:tuTx(k.querySelector('b')),el:k}))
      .filter(x=>x.k&&x.v);
    if(!ks.length)return null;
    const rt=ks.find(x=>/유입률|inflow rate|landing rate/i.test(x.k));
    if(rt){h(rt.el,'');
      return {t:L(`광고 클릭의 ${E(rt.v)}가 사이트 유입으로`,`${E(rt.v)} of ad clicks reached the site`),s:tuJoin(ks.filter(x=>x!==rt).map(x=>`${x.k} ${x.v}`)),noFade:1};}
    h(ks[0].el,'');
    return {t:ks[1]?`${ks[0].k} ${E(ks[0].v)} · ${ks[1].k} ${E(ks[1].v)}`:`${ks[0].k} ${E(ks[0].v)}`,s:tuJoin(ks.slice(2).map(x=>`${x.k} ${x.v}`))};},
  /* 유입 ② — 체류가 가장 긴 랜딩 */
  infB(sl,h){
    const ls=[...sl.src.querySelectorAll('.ldcol')].map(c=>{const t=tuTx(c.querySelector('.ldavg b'));
      const m=/(\d+)\s*(?:분|m)/.exec(t),s=/(\d+)\s*(?:초|s)/.exec(t);
      return {c,nm:tuTx(c.querySelector('.ldname')),t,sec:(m?+m[1]*60:0)+(s?+s[1]:0),vis:tuTx(c.querySelector('.ldavg span'))};}).filter(x=>x.nm&&x.sec>0);
    if(!ls.length)return null;
    const b=ls.reduce((a,x)=>x.sec>a.sec?x:a);h(b.c,b.t);
    return {t:L(`${b.nm} 평균 체류 ${E(b.t)}, 랜딩 중 가장 길어요`,`${b.nm} holds visitors longest — ${E(b.t)} on average`),
      s:tuJoin([L(`랜딩 페이지 ${ls.length}곳`,`${ls.length} landing pages`),b.vis])};},
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
  return {kind:'cover',key:'cover',label:L('데이터 투어','Data tour'),src,W:0,tblX:0,chips:[],t:nm,s:tuJoin([adv,L('캠페인 성과 리뷰','Campaign performance review')]),noEm:1,tiles};}
function tuEnd(){
  const body=TU.slides.filter(s=>s.kind==='body');
  const src=document.createElement('div');src.className='tu-src tu-ch';src.setAttribute('data-noi18n','');
  src.innerHTML=`<div class="tu-recap${body.length>6?' two':''}">${body.map((s,k)=>
      `<button type="button" class="tu-rc" data-go="${TU.slides.indexOf(s)}" style="--i:${k}"><span class="n">${String(k+1).padStart(2,'0')}</span>`
      +`<span class="tx"><span class="t">${tuWords(s.t)}</span><span class="l">${esc(s.label)}</span></span></button>`).join('')}</div>
    <div class="tu-acts">
      <button type="button" class="tu-btn pri" data-act="ppt"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 1.4h6.5l3.6 3.6v9a.8.8 0 0 1-.8.8H3.2a.8.8 0 0 1-.8-.8V2.2a.8.8 0 0 1 .8-.8z" fill="#d35230"/><path d="M9.7 1.4v2.9a.7.7 0 0 0 .7.7h2.9z" fill="#f2a58d"/><path d="M5.6 12V7h2.1a1.6 1.6 0 0 1 0 3.2H5.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg><span>${esc(L('PPT로 저장','Save as PPT'))}</span></button>
      <button type="button" class="tu-btn" data-act="html" title="${esc(L('이 투어를 파일 하나(HTML)로 — 인터넷 없이도 브라우저에서 바로 발표할 수 있습니다','This tour as one HTML file — present from any browser, even offline'))}"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.8 5.6h12.4" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 8.3l2.9 1.6-2.9 1.6z" fill="currentColor"/></svg><span>${esc(L('파일로 저장 (HTML)','Save as file (HTML)'))}</span></button>
      <button type="button" class="tu-btn" data-act="restart"><span>↺ ${esc(L('처음부터','From the start'))}</span></button>
      <button type="button" class="tu-btn" data-act="close"><span>${esc(L('닫기','Close'))}</span></button>
    </div>`;
  return {kind:'end',key:'end',label:L('핵심 요약','Key takeaways'),src,W:0,tblX:0,chips:[],
    t:L('오늘의 핵심, 한 장으로','Today’s takeaways at a glance'),
    s:L(`${body.length}개 장면을 짚었어요 · 항목을 누르면 그 장면으로 돌아갑니다`,`${body.length} scenes covered · click any item to jump back`),noEm:1};}

/* ---------- 4. 화면 ---------- */
function tuHint(){return L('← → 넘기기 · P 자동 재생 · Esc 닫기','← → to move · P autoplay · Esc to close');}
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
    s.classList.toggle('play',k===i&&TU.play);if(k===i&&TU.play)s.style.setProperty('--dur',TU_PLAY+'ms');});
  el.querySelector('.tu-cnt').textContent=`${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}`;
  el.querySelector('.tu-nav.prev').disabled=i<=0;
  el.querySelector('.tu-nav.next').disabled=i>=n-1;
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
  src.style.transform='none';
  if(sl.kind!=='body'){
    src.style.width=Math.round(sw)+'px';
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
  src.style.transform=`scale(${s})`;
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
  if(sl.kind==='end')src.querySelectorAll('.tu-rc,.tu-btn').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],
    {duration:rm?150:620,delay:rm?0:420+i*45,easing:E,fill:'backwards'}));
  tuAnimate(src,rm?0:520);
  /* 강조 — 그래프가 다 찬 뒤에 */
  const slow=src.querySelector('.dbar,circle[data-axarc]')?2500:src.querySelector('table')?1800:2000;
  tuLater(()=>tuSpot(node),rm?300:slow);
  if(TU.play)TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},TU_PLAY);}
/* ---------- 5. 강조 — 주변을 옅게 · 테두리가 그려지고 은은하게 숨쉰다 · 이름표 ---------- */
function tuScroller(el,root){
  for(let p=el.parentElement;p&&p!==root;p=p.parentElement){
    const cs=getComputedStyle(p);if(/auto|scroll/.test(cs.overflowX)&&p.scrollWidth>p.clientWidth+1)return p;}
  return null;}
function tuSpot(node){
  if(!node.isConnected)return;
  node.classList.add('hl');
  const fit=node.querySelector('.tu-fit'),src=fit&&fit.firstElementChild;if(!src)return;
  const hls=[...src.querySelectorAll('[data-tuhl]')];if(!hls.length)return;
  /* 장면 들어오기 · 그래프 채우기가 아직 덜 끝났으면(느린 컴퓨터 · 뒤에 있던 탭) 끝 모습으로 맞춘 뒤 잰다 — 반복 효과는 그대로 */
  try{node.getAnimations({subtree:true}).forEach(a=>{try{const it=a.effect&&a.effect.getTiming().iterations;if(it!==Infinity)a.finish();}catch(e){}});}catch(e){}
  try{if(typeof axFinish==='function')axFinish(src);}catch(e){}
  /* 표 — 강조할 칸이 가려져 있으면 그쪽으로 부드럽게 옮긴 뒤 */
  const sc=tuScroller(hls[0],src);
  if(sc&&!node.__panned){
    node.__panned=1;
    const k=sc.getBoundingClientRect().width/sc.offsetWidth||1;
    const er=hls[0].getBoundingClientRect(),cr=sc.getBoundingClientRect();
    const x=(er.left-cr.left)/k+sc.scrollLeft,w=er.width/k;
    const fz=sc.querySelector('th.lfz,td.lfz,.lfz');
    const fzW=fz?Math.max(...[...sc.querySelectorAll('thead .lfz')].map(c=>(c.getBoundingClientRect().right-cr.left)/k),0):0;
    const vis0=sc.scrollLeft+fzW,vis1=sc.scrollLeft+sc.clientWidth;
    if(x<vis0||x+w>vis1){
      const to=Math.max(0,Math.min(sc.scrollWidth-sc.clientWidth,x-fzW-(sc.clientWidth-fzW-w)/2));
      sc.scrollTo({left:to,behavior:TU.rm?'auto':'smooth'});
      /* 다 옮겨 간 뒤(위치가 멈춘 뒤)에 그린다 */
      let n=0;
      const wait=()=>{if(Math.abs(sc.scrollLeft-to)<2||n>30)return tuSpot(node);n++;tuLater(wait,100);};
      tuLater(wait,TU.rm?40:250);return;}}
  /* 그래프가 아직 자라는 중이면(느린 컴퓨터 · 뒤에 있던 탭) 끝 모습으로 맞춘 뒤 잰다 */
  try{if(typeof axFinish==='function')axFinish(src);}catch(e){}
  const fr=fit.getBoundingClientRect(),kx=fit.offsetWidth/(fr.width||1),ky=fit.offsetHeight/(fr.height||1);
  const FW=fit.offsetWidth,FH=fit.offsetHeight,P=7;
  const rects=hls.map(e=>{
    let r=e.getBoundingClientRect();
    /* 넘겨 보는 상자 밖으로 나간 부분은 자른다 */
    const s2=tuScroller(e,src);
    if(s2){const c=s2.getBoundingClientRect();r={left:Math.max(r.left,c.left),right:Math.min(r.right,c.right),top:Math.max(r.top,c.top),bottom:Math.min(r.bottom,c.bottom)};}
    const x=(r.left-fr.left)*kx-P,y=(r.top-fr.top)*ky-P,w=(r.right-r.left)*kx+P*2,h=(r.bottom-r.top)*ky+P*2;
    const x0=Math.max(-P,x),y0=Math.max(-P,y);
    return {x:x0,y:y0,w:Math.min(x+w,FW+P)-x0,h:Math.min(y+h,FH+P)-y0,chip:node.__chips?node.__chips[+e.getAttribute('data-tuhl')]:''};})
    .filter(r=>r.w>8&&r.h>8&&r.x<FW&&r.y<FH);
  if(!rects.length)return;
  fit.querySelectorAll('.tu-spot,.tu-chip').forEach(n=>n.remove());
  /* 주변을 옅게 — 강조할 곳까지 이어지는 줄기는 그대로 두고, 그 형제들만 흐리게(덮개 상자를 씌우지 않아 배경 결이 그대로) */
  const keep=new Set();hls.concat([...src.querySelectorAll('[data-tukeep]')]).forEach(e=>{for(let p=e;p&&p!==src;p=p.parentElement)keep.add(p);});
  const fade=new Set();
  keep.forEach(p=>{const par=p.parentElement;if(!par)return;
    for(const c of par.children)if(!keep.has(c)&&!/^(defs|style|linearGradient|radialGradient|clipPath|mask)$/i.test(c.tagName))fade.add(c);});
  /* 표 — 줄(tr)을 통째로 흐리면 줄마다 겹 하나가 생겨, 여러 줄에 걸친 고정 칸(rowspan) 위로 옆 칸이 비쳐 보인다.
     칸마다 흐리고, 고정 칸(sticky)은 바탕을 덮는 방식(.tu-fadeS)으로 */
  if(!node.__noFade)fade.forEach(c=>{
    if(/^(TR|THEAD|TBODY|TFOOT)$/.test(c.tagName)){
      c.querySelectorAll('td,th').forEach(td=>{if(keep.has(td))return;
        td.classList.add(getComputedStyle(td).position==='sticky'?'tu-fadeS':'tu-fade');});
      return;}
    c.classList.add(/^(TD|TH)$/.test(c.tagName)&&getComputedStyle(c).position==='sticky'?'tu-fadeS':'tu-fade');});
  const id='tuc'+Math.random().toString(36).slice(2,8);
  const rr=r=>Math.min(14,r.h/2,r.w/2);
  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','tu-spot');
  svg.setAttribute('width',FW);svg.setAttribute('height',FH);svg.setAttribute('viewBox',`0 0 ${FW} ${FH}`);
  svg.innerHTML=`<defs><linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      ${rects.map((r,k)=>`<clipPath id="${id}c${k}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rr(r)}"/></clipPath>`).join('')}</defs>
    ${rects.map((r,k)=>{const len=Math.round(2*(r.w+r.h)),bw=Math.max(60,Math.min(220,r.w*.35));
      return `<rect class="halo" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rr(r)}" style="--k:${k}"/>`
        +`<g clip-path="url(#${id}c${k})"><rect class="sheen" x="${r.x-bw}" y="${r.y}" width="${bw}" height="${r.h}" fill="url(#${id}g)" style="--k:${k};--sw:${Math.round(r.w+bw)}px"/></g>`
        +`<rect class="ring" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rr(r)}" style="--k:${k};--len:${len}"/>`;}).join('')}`;
  fit.appendChild(svg);
  rects.forEach((r,k)=>{if(!r.chip)return;
    const c=document.createElement('div');c.className='tu-chip tu-ch';c.setAttribute('data-noi18n','');c.textContent=r.chip;
    const above=r.y>30;
    c.style.left=Math.min(FW,Math.max(0,r.x+r.w-14))+'px';c.style.top=(above?r.y:r.y+r.h)+'px';
    c.style.setProperty('--ty',above?'-62%':'-38%');c.style.setProperty('--k',k);
    fit.appendChild(c);});
  void svg.getBoundingClientRect();
  svg.classList.add('on');fit.querySelectorAll('.tu-chip').forEach(c=>c.classList.add('on'));}
/* ---------- 6. 넘기기 ---------- */
function tuGo(i,dir){
  if(!TU.el||i<0||i>=TU.slides.length||i===TU.i)return;
  tuClear();
  dir=dir||(i>TU.i?1:-1);
  const old=TU.node,sl=TU.slides[i];
  TU.i=i;
  const node=tuMount(sl);node.__chips=sl.chips;node.__noFade=!!sl.noFade;
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
    TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},TU_PLAY);}
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
  requestAnimationFrame(()=>{el.classList.add('on');});
  tuGo(0,1);
  TU.hintT=setTimeout(()=>{const h=el.querySelector('.tu-hint');if(h)h.classList.add('off');},5200);}
function tuClose(){
  const el=TU.el;if(!el)return;
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
  const k=e.key,onBtn=e.target&&e.target.closest&&e.target.closest('.tu-btn,.tu-rc');
  const stop=()=>{e.preventDefault();e.stopPropagation();};
  if(k==='Escape'){stop();tuClose();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='ArrowRight'||k==='PageDown'||((k===' '||k==='Enter')&&!onBtn)){stop();tuNext();return;}
  if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){stop();tuPrev();return;}
  if(k==='Home'){stop();tuGo(0,-1);return;}
  if(k==='End'){stop();tuGo(TU.slides.length-1,1);return;}
  if(k==='p'||k==='P'){stop();tuPlay(!TU.play);return;}}
function tuResize(){
  clearTimeout(TU.rz);
  TU.rz=setTimeout(()=>{const n=TU.node;if(!n||!TU.el)return;const sl=TU.slides[TU.i];
    n.querySelectorAll('.tu-spot,.tu-chip').forEach(x=>x.remove());n.querySelectorAll('.tu-fade,.tu-fadeS').forEach(x=>x.classList.remove('tu-fade','tu-fadeS'));
    tuLayout(n,sl);if(n.classList.contains('hl'))tuSpot(n);},140);}
function tuFsChange(){if(TU.fs&&!document.fullscreenElement){TU.fs=false;tuClose();}}
function tuWire(el){
  document.addEventListener('keydown',tuKey,true);
  addEventListener('resize',tuResize);
  document.addEventListener('fullscreenchange',tuFsChange);
  el.addEventListener('click',e=>{
    const t=e.target.closest('[data-go],[data-act],.tu-nav,.tu-x,.tu-play');if(!t)return;
    if(e.detail)try{t.blur();}catch(x){}
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
/* 장면의 그래프 → 바탕 없는 PNG + 강조할 곳(그림 안 좌표) */
/* o.cards — 카드 바탕은 남긴다(HTML 파일 · 투어 화면처럼). 기본은 PPT 용 누끼(카드 바탕까지 뺀다) */
async function tuShot(sl,o){
  o=o||{};
  const key=o.cards?'__shotH':'__shotP';
  if(sl[key])return sl[key];                  /* 한 번 만든 그림은 다시 쓴다(PPT · HTML 둘 다 저장할 때) */
  const hold=document.createElement('div');hold.className='tu-shot';
  const src=sl.src.cloneNode(true);src.style.width=sl.W+'px';src.style.transform='none';
  hold.appendChild(src);TU.el.appendChild(hold);
  try{
    if(!sl.tblX)tuWrap(src,sl,o.cards?1700:1213,o.cards?620:470,Infinity);
    const R=src.getBoundingClientRect();
    const hl=[...src.querySelectorAll('[data-tuhl]')].map(e=>{const r=e.getBoundingClientRect();
      return {x:r.left-R.left,y:r.top-R.top,w:r.width,h:r.height,chip:sl.chips[+e.getAttribute('data-tuhl')]||''};}).filter(r=>r.w>2&&r.h>2);
    const strip=e=>{e.style.setProperty('background','transparent','important');e.style.setProperty('box-shadow','none','important');
      e.style.setProperty('border-color','transparent','important');};
    const out=await ccRender(src,{zoom:2,transparent:true,meta:true,dataUrl:true,
      clean:c=>{if(o.cards)return;strip(c);c.querySelectorAll('.card,.hpbox,.infcell,.infk').forEach(strip);}});
    return (sl[key]={...out,hl});
  }finally{hold.remove();}}
async function tuPpt(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);
  const lab=btn.querySelector('span'),was=lab.textContent;btn.disabled=true;btn.classList.add('busy');
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
    /* 장면마다 — 편집 가능한 글 + 누끼 그래프 + 강조 테두리(도형) */
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
      let shot=null;
      try{shot=await tuShot(sl);}catch(e){console.warn('tour shot',e);}
      if(shot){
        const AX=.6,AY=sy+(sl.s?.66:.2),AW=12.13,AH=6.92-AY;
        const a=shot.W/shot.H;let w=AW,h=w/a;if(h>AH){h=AH;w=h*a;}
        const x=AX+(AW-w)/2,y=AY+Math.max(0,(AH-h)/2)*.4,f=w/shot.W;
        s.addImage({data:shot.data.replace(/^data:/,''),x,y,w,h});
        shot.hl.forEach(r=>{const p=4*f;
          s.addShape(px.ShapeType.roundRect,{x:x+r.x*f-p,y:y+r.y*f-p,w:r.w*f+p*2,h:r.h*f+p*2,rectRadius:.06,
            fill:{color:ACC,transparency:100},line:{color:ACC,width:2}});
          if(r.chip){const cw=Math.min(3.6,.32+[...r.chip].reduce((a,ch)=>a+(/[가-힣]/.test(ch)?.15:.085),0));
            const cx=Math.min(x+w,x+(r.x+r.w)*f+p)-cw,cy=y+r.y*f-p-.36;
            s.addText(r.chip,{x:Math.max(.3,cx),y:Math.max(.3,cy),w:cw,h:.3,fontFace:FF,fontSize:10.5,bold:true,color:'FFFFFF',
              fill:{color:ACC},align:'center',valign:'middle',margin:0,rectRadius:.15,shape:px.ShapeType.roundRect});}});}
      foot(s,k+2);}
    /* 핵심 요약 */
    {const s=addSlide();
      s.addText(L('핵심 요약','Key takeaways'),{x:.6,y:.5,w:12.1,h:.6,fontFace:FF,fontSize:28,bold:true,color:INK,margin:0});
      const two=body.length>6,per=two?Math.ceil(body.length/2):body.length,cw=two?5.95:12.1;
      body.forEach((sl,k)=>{const col=two&&k>=per?1:0,row=col?k-per:k;
        const x=.6+col*(cw+.2),y=1.45+row*Math.min(.82,5.4/per);
        s.addText([{text:String(k+1).padStart(2,'0')+'  ',options:{color:ACC,bold:true}},{text:tuPlain(sl.t),options:{color:INK,bold:true}},
          {text:'\n'+sl.label,options:{color:MUT,fontSize:10,bold:false}}],
          {x,y,w:cw,h:Math.min(.78,5.3/per),fontFace:FF,fontSize:13,margin:0,valign:'top',fit:'shrink'});});
      foot(s,body.length+2);}
    say(L('파일 저장 중…','Saving…'));
    const buf=await tuFast(()=>px.write({outputType:'arraybuffer'}));
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.pptx`;
    saveFile(buf,fn,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('PPT로 저장했어요','Saved as PowerPoint'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);
  }catch(e){console.warn('tour ppt',e);say(was);
    showToast(L('PPT를 만들지 못했어요','Couldn’t create the PPT'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;btn.disabled=false;btn.classList.remove('busy');}}
/* ---------- 9. 파일로 저장 (HTML) — v118 ----------
   투어를 파일 하나로: 장면마다 그래프 그림(카드 바탕 그대로 · 2배 해상도) + 제목/부제목 글 + 강조 위치를 담고,
   같은 모양의 작은 재생기(넘기기 · 3D 장면 전환 · 강조 · 진행 막대 · 자동 재생 · 전체 화면)를 함께 넣는다.
   인터넷 없이 어느 브라우저에서나 열린다(Pretendard 글꼴만 인터넷이 되면 받아 쓴다) */
async function tuHtml(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);
  const lab=btn.querySelector('span'),was=lab.textContent;btn.disabled=true;btn.classList.add('busy');
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
          img:sh?sh.data:'',w:sh?sh.W:0,h:sh?sh.H:0,
          hl:sh?sh.hl.map(r=>({x:r.x/sh.W,y:r.y/sh.H,w:r.w/sh.W,h:r.h/sh.H,c:r.chip||''})):[]});}
      else if(sl.kind==='cover')
        out.push({k:'cover',eye:`<span class="no">▶</span>DATA TOUR`,t:tuWords(sl.t),s:sl.s,tiles:(sl.tiles||[]).map(x=>({k:x.k,v:x.v,s:x.s||''}))});
      else out.push({k:'end',eye:`<span class="no">✓</span>${esc(sl.label)}`,t:tuWords(sl.t),
        s:L(`${body.length}개 장면 · 항목을 누르면 그 장면으로 돌아갑니다`,`${body.length} scenes · click any item to jump back`),
        recap:body.map((x,k)=>({n:String(k+1).padStart(2,'0'),t:tuWords(x.t),l:x.label,go:TU.slides.indexOf(x)}))});}
    say(L('파일 저장 중…','Saving…'));
    const D={name:nm,lang:LANG,dark:document.documentElement.getAttribute('data-theme')==='dark',
      made:new Date().toISOString().slice(0,10),
      ui:{prev:L('이전','Previous'),next:L('다음','Next'),play:L('자동 재생 (P)','Autoplay (P)'),fs:L('전체 화면 (F)','Full screen (F)'),
        hint:L('← → 넘기기 · P 자동 재생 · F 전체 화면','← → to move · P autoplay · F full screen'),again:L('처음부터','From the start')},slides:out};
    const html=tuHtmlDoc(D);
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.html`;
    saveFile(new TextEncoder().encode(html),fn,'text/html;charset=utf-8');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('투어를 파일로 저장했어요','Tour saved as a file'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);
  }catch(e){console.warn('tour html',e);say(was);
    showToast(L('파일을 만들지 못했어요','Couldn’t create the file'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;btn.disabled=false;btn.classList.remove('busy');}}
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
.pg i.on::after{transform:scaleX(1)}.pg i.cur.play::after{transition:none;animation:pgp 9s linear both}
@keyframes pgp{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.mt{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:12px;font-weight:700;color:var(--ink2)}
.br{display:inline-flex;align-items:center;gap:8px;min-width:0}.br .d{width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 4px rgb(var(--accrgb) / .15);flex:none}
.br b{font-weight:900;font-size:11px;letter-spacing:.16em;color:var(--ink);white-space:nowrap}
.br .cn{color:var(--mut);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw}.br .cn::before{content:'·';margin:0 8px 0 2px}
.sp{flex:1}.ct{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:800;letter-spacing:.04em;margin-right:4px;white-space:nowrap}
.ib{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0}
.ib svg{width:14px;height:14px;display:block}.ib[aria-pressed=true]{background:var(--ink);color:var(--bg1)}
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
.fig{position:relative}.fig svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.fig .base{transition:opacity 1s ease}.sl.hl .fig .base.fd{opacity:.26}
.ring{fill:none;stroke:var(--acc);stroke-width:2.5;stroke-dasharray:var(--l) var(--l);stroke-dashoffset:var(--l)}
.sl.hl .ring{animation:rg 1.15s cubic-bezier(.65,0,.25,1) calc(var(--k,0)*140ms + .15s) forwards,br 3s ease-in-out calc(var(--k,0)*140ms + 1.4s) infinite}
.halo{fill:none;stroke:rgb(var(--accrgb) / .3);stroke-width:10;opacity:0;filter:blur(6px)}.sl.hl .halo{animation:ha 3s ease-in-out 1.1s infinite}
@keyframes rg{to{stroke-dashoffset:0}}@keyframes br{0%,100%{stroke-opacity:1}50%{stroke-opacity:.5}}@keyframes ha{0%,100%{opacity:.25}50%{opacity:1}}
.chip{position:absolute;z-index:4;padding:6px 12px;border-radius:999px;background:var(--acc);color:#fff;font-size:13px;font-weight:800;white-space:nowrap;
  box-shadow:0 8px 20px rgb(var(--accrgb) / .32);transform:translate(-100%,var(--ty,-62%)) scale(.6);opacity:0;transform-origin:100% 100%}
.sl.hl .chip{animation:cp .65s cubic-bezier(.34,1.56,.64,1) .9s forwards}@keyframes cp{to{opacity:1;transform:translate(-100%,var(--ty,-62%)) scale(1)}}
.tiles{display:flex;justify-content:center;gap:clamp(12px,1.3vw,22px);flex-wrap:wrap;padding-top:4vh}
.tile{min-width:clamp(190px,15.5vw,290px);padding:clamp(16px,1.4vw,24px) clamp(18px,1.5vw,26px);border-radius:20px;text-align:left;background:var(--glass);
  border:1px solid rgba(255,255,255,.85);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 22px 44px rgba(27,31,36,.10)}
html.dk .tile{border-color:rgba(255,255,255,.08)}
.tile .k{font-size:clamp(11.5px,.82vw,14px);font-weight:700;color:var(--mut)}.tile .v{margin-top:10px;font-size:clamp(19px,1.65vw,30px);font-weight:800;letter-spacing:-.03em;white-space:nowrap}
.tile .s{margin-top:6px;font-size:12px;font-weight:600;color:var(--ink2)}
.rc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 18px;max-width:1240px;margin:0 auto}
.rc button{display:flex;gap:14px;align-items:flex-start;padding:12px 16px;border-radius:14px;text-align:left;cursor:pointer;font:inherit;border:1px solid var(--line);background:var(--glass);color:var(--ink)}
.rc button:hover{background:var(--bg1)}.rc .n{font-size:13px;font-weight:900;color:var(--acc);padding-top:1px}
.rc .x{display:flex;flex-direction:column;gap:3px;min-width:0}.rc .t{font-size:15px;font-weight:700;letter-spacing:-.02em;line-height:1.35;word-break:keep-all}
.rc .t em{font-style:normal;color:var(--acc)}.rc .l{font-size:11.5px;font-weight:600;color:var(--mut)}
.ag{display:flex;justify-content:center;margin-top:26px}.ag button{height:46px;padding:0 24px;border-radius:999px;border:0;background:var(--ink);color:var(--bg1);font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.nv{position:fixed;top:56%;z-index:6;width:clamp(46px,3.7vw,62px);height:clamp(46px,3.7vw,62px);transform:translateY(-50%);border-radius:50%;border:1px solid var(--line);
  background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:0 10px 30px rgba(27,31,36,.12);transition:transform .2s,opacity .3s}
.nv svg{width:42%;height:42%}.nv.p{left:1.4vw}.nv.n{right:1.4vw}.nv:hover{transform:translateY(-50%) scale(1.08)}.nv[disabled]{opacity:0;pointer-events:none}
.hn{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;font-size:12px;font-weight:600;color:var(--mut);padding:6px 14px;border-radius:999px;
  background:var(--glass);border:1px solid var(--line);transition:opacity .8s}.hn.off{opacity:0}
@media (max-width:760px){.top{padding:12px 14px 0}.hd{padding:0 6vw}.nv{top:auto;bottom:14px;transform:none}.hn{display:none}.rc{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.sl.hl .ring,.sl.hl .halo{animation:none;stroke-dashoffset:0}}
@media print{.top,.nv,.hn{display:none}}`;
  const js=`
const D=JSON.parse(document.getElementById('tud').textContent);
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
  if(s.k==='end')return '<div class="rc">'+s.recap.map(r=>'<button data-go="'+r.go+'"><span class="n">'+r.n+'</span><span class="x"><span class="t">'+r.t+'</span><span class="l">'+esc(r.l)+'</span></span></button>').join('')+'</div><div class="ag"><button data-go="0">↺ '+esc(D.ui.again)+'</button></div>';
  if(!s.img)return '';
  const W=s.w,H=s.h,id='c'+Math.random().toString(36).slice(2,7),rr=(w,h)=>Math.min(14,w/2,h/2),P=7;
  const R=s.hl.map(r=>({x:r.x*W-P,y:r.y*H-P,w:r.w*W+P*2,h:r.h*H+P*2,c:r.c}));
  return '<div class="fig"><svg viewBox="0 0 '+W+' '+H+'"><defs><clipPath id="'+id+'">'+R.map(r=>'<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+rr(r.w,r.h)+'"/>').join('')+'</clipPath></defs>'
    +'<image class="base'+(R.length?' fd':'')+'" href="'+s.img+'" x="0" y="0" width="'+W+'" height="'+H+'"/>'
    +(R.length?'<image href="'+s.img+'" x="0" y="0" width="'+W+'" height="'+H+'" clip-path="url(#'+id+')"/>':'')
    +R.map((r,k)=>'<rect class="halo" x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+rr(r.w,r.h)+'"/><rect class="ring" x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+rr(r.w,r.h)+'" style="--k:'+k+';--l:'+Math.round(2*(r.w+r.h))+'"/>').join('')
    +'</svg>'+R.filter(r=>r.c).map((r,k)=>'<div class="chip" style="left:'+((r.x+r.w-14)/W*100)+'%;top:'+((r.y>30?r.y:r.y+r.h)/H*100)+'%;--ty:'+(r.y>30?'-62%':'-38%')+'">'+esc(r.c)+'</div>').join('')+'</div>';}
function layout(n,s){
  const hd=n.querySelector('.hd'),st=n.querySelector('.st'),fig=n.querySelector('.fig');
  st.style.top=(hd.offsetTop+hd.offsetHeight+Math.max(14,innerHeight*.028))+'px';
  if(!fig)return;
  const sw=st.clientWidth,sh=st.clientHeight,w=s.w,h=s.h;   /* s.w · s.h = 화면 크기(그림 파일은 그 2배 해상도) */
  const k=Math.max(.2,Math.min(1.25,sw/w,sh/h));
  fig.style.width=Math.round(w*k)+'px';fig.style.height=Math.round(h*k)+'px';
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
  an(node.querySelector('.fig svg'),[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:RM?150:1300,delay:RM?0:500,easing:'cubic-bezier(.45,0,.2,1)',fill:'backwards'});
  node.querySelectorAll('.tile,.rc button,.ag button').forEach((t,k)=>an(t,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],{duration:RM?150:760,delay:RM?0:480+k*70,easing:E,fill:'backwards'}));
  const n=node;tm.push(setTimeout(()=>n.classList.add('hl'),RM?200:1900));
  if(play)pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},9000);
  paint();}
function paint(){
  document.querySelectorAll('.pg i').forEach((s,k)=>{s.classList.toggle('on',k<=I);s.classList.toggle('cur',k===I);s.classList.toggle('play',k===I&&play);});
  $('.ct').textContent=String(I+1).padStart(2,'0')+' / '+String(N).padStart(2,'0');
  $('.nv.p').disabled=I<=0;$('.nv.n').disabled=I>=N-1;
  $('.bp').setAttribute('aria-pressed',play?'true':'false');
  $('.bp').innerHTML=play?'<svg viewBox="0 0 16 16"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 16 16"><path d="M5.2 3.4v9.2l7.3-4.6z" fill="currentColor"/></svg>';}
function setPlay(on){play=!!on;clearTimeout(pt);if(play){if(I>=N-1){go(0,1);return;}pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},9000);}paint();}
function fs(){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}}
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],.nv,.bp,.bf');if(!t)return;
  if(t.classList.contains('nv'))return t.classList.contains('p')?go(I-1,-1):go(I+1,1);
  if(t.classList.contains('bp'))return setPlay(!play);if(t.classList.contains('bf'))return fs();
  setPlay(false);go(+t.dataset.go);});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
  if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();go(I+1,1);}
  else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){e.preventDefault();go(I-1,-1);}
  else if(k==='Home')go(0,-1);else if(k==='End')go(N-1,1);
  else if(k==='p'||k==='P')setPlay(!play);else if(k==='f'||k==='F')fs();});
let sx=null,sy=0;
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){sx=e.clientX;sy=e.clientY;}});
addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)dx<0?go(I+1,1):go(I-1,-1);});
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(node)layout(node,D.slides[I]);},120);});
$('.hn').textContent=D.ui.hint;setTimeout(()=>$('.hn').classList.add('off'),5200);
$('.nv.p').setAttribute('aria-label',D.ui.prev);$('.nv.n').setAttribute('aria-label',D.ui.next);$('.bp').title=D.ui.play;$('.bf').title=D.ui.fs;
go(0,1);`;
  return `<!doctype html>
<html lang="${esc(D.lang||'ko')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.name)} · Data Tour</title>
<meta name="generator" content="Media Dashboard · Data Tour (${esc(D.made)})">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${css}</style></head><body>
<div class="fw"><div class="fl"></div></div>
<div class="top"><div class="pg"></div><div class="mt"><span class="br"><span class="d"></span><b>DATA TOUR</b><span class="cn"></span></span><span class="sp"></span>
<span class="ct"></span><button class="ib bp" type="button"></button><button class="ib bf" type="button"><svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>
<div class="dk2"></div>
<button class="nv p" type="button"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="nv n" type="button"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<div class="hn"></div>
<script type="application/json" id="tud">${json}</`+`script>
<script>${js}</`+`script>
</body></html>`;}
(function(){const b=$('tourBtn');if(b)b.addEventListener('click',()=>{try{tuOpen();}catch(e){console.warn('tour',e);}});})();
