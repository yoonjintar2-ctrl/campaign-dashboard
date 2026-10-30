
/* =====================================================================
   v136 — TV 주차별 퍼포먼스 확장 (코웨이 피드백: "엑셀 대비 대시보드가 너무 함축적, 그래프도")
   주별 리포트(예: '당월_주별' · '당월_시청률')가 주는 값을 그대로 담는다.
   · TV_WEEK  : 주차 합계 — v135 에 닐슨 금액 · 보너스 금액 열 추가 (CPRP · 보너스율은 계산)
   · TV_WKCH  : 주차 × 채널(방송사 묶음) — 집행 광고비 · eq.GRP · 닐슨 금액 · 보너스 금액 · GRP · 횟수
   · TV_WKRT  : 주차 × 채널 구분 시청률 — 우리 편성 평균 vs 타깃 평균 (지상파 · 종편 · 케이블 계 등)
   · TV_WKSEG : 구분(품목) × 주차 — 계획 횟수(큐시트) · 실적(있으면). 품목 × 주차 실적이 없는 리포트가 많아
                계획만 있어도 품목별 주차 흐름(플라이트)을 보여 준다
   화면(TV › 주차별 퍼포먼스): KPI 카드(디지털 '주요 지표'와 같은 모양 · 주차 추이) → 주차별 집행 흐름(입체 막대 · 언덕 · 꺾은선)
   → 방송사 × 주차 히트맵 · 시청률 지수 → 품목별 주차 편성 → 주차별 상세 표
   ===================================================================== */
/* TV_WKCH · TV_WKRT · TV_WKSEG 는 14-tv.js 에서 선언 */
let TVW_BAR='eqgrp',TVW_LINE='cprp',TVW_HEAT='eqgrp';
const TV_WKCH_COLS=[
  {k:'wk',l:'주차',type:'text',w:80},
  {k:'ch',l:'채널',type:'text',w:120},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:116},
  {k:'eqgrp',l:'eq.GRP',type:'dec',w:90},
  {k:'grp',l:'GRP',type:'dec',w:84},
  {k:'cnt',l:'횟수',type:'num',w:76},
  {k:'nlsn',l:'닐슨 금액',type:'num',unit:'k',w:120},
  {k:'bonus',l:'보너스 금액',type:'num',unit:'k',w:120},
  {k:'note',l:'비고',type:'text',w:150}];
const TV_WKRT_COLS=[
  {k:'wk',l:'주차',type:'text',w:80},
  {k:'ch',l:'채널 구분',type:'text',w:120},
  {k:'rt',l:'편성 시청률(%)',type:'dec',w:120},
  {k:'trt',l:'타깃 평균 시청률(%)',type:'dec',w:140},
  {k:'note',l:'비고',type:'text',w:150}];
const TV_WKSEG_COLS=[
  {k:'wk',l:'주차',type:'text',w:80},
  {k:'seg',l:'구분',type:'text',w:130},
  {k:'pcnt',l:'계획 횟수',type:'num',w:86},
  {k:'cnt',l:'실적 횟수',type:'num',w:86},
  {k:'grp',l:'실적 GRP',type:'dec',w:90},
  {k:'eqgrp',l:'실적 eq.GRP',type:'dec',w:100},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:116},
  {k:'note',l:'비고',type:'text',w:170}];
const tvwSum=(rows,ks)=>{const o={};ks.forEach(k=>o[k]=0);(rows||[]).forEach(r=>ks.forEach(k=>o[k]+=tvNum(r[k])));return o;};
const tvwFootNum=(c,t)=>{
  if(c.unit==='k')return t[c.k]?fmt(t[c.k]/1000):'';
  if(c.type==='num')return t[c.k]?fmt(t[c.k]):'';
  if(c.type==='dec')return t[c.k]?String(tvR(t[c.k],3)):'';
  return '';};
TV_TBL.wkch={id:'tvWkChInTbl',name:'TV 주차 × 채널 실적',base:TV_WKCH_COLS,get cols(){return tblCols('wkch');},
  rows:()=>TV_WKCH,set:v=>{TV_WKCH=v;},calc:()=>({}),
  total:rs=>tvwSum(rs||TV_WKCH,['cost','eqgrp','grp','cnt','nlsn','bonus']),foot:tvwFootNum,
  blank:()=>({wk:'',ch:'',cost:'',eqgrp:'',grp:'',cnt:'',nlsn:'',bonus:'',note:''}),
  note:'tvWkChInNote',changed:()=>tvChanged()};
TV_TBL.wkrt={id:'tvWkRtInTbl',name:'TV 주차별 시청률',base:TV_WKRT_COLS,get cols(){return tblCols('wkrt');},
  rows:()=>TV_WKRT,set:v=>{TV_WKRT=v;},calc:()=>({}),total:()=>({}),foot:()=>'',
  blank:()=>({wk:'',ch:'',rt:'',trt:'',note:''}),
  note:'tvWkRtInNote',changed:()=>tvChanged()};
TV_TBL.wkseg={id:'tvWkSegInTbl',name:'TV 구분 × 주차',base:TV_WKSEG_COLS,get cols(){return tblCols('wkseg');},
  rows:()=>TV_WKSEG,set:v=>{TV_WKSEG=v;},calc:()=>({}),
  total:rs=>tvwSum(rs||TV_WKSEG,['pcnt','cnt','grp','eqgrp','cost']),foot:tvwFootNum,
  blank:()=>({wk:'',seg:'',pcnt:'',cnt:'',grp:'',eqgrp:'',cost:'',note:''}),
  note:'tvWkSegInNote',changed:()=>tvChanged()};
TBL_FIXED.wkch=['wk','ch'];TBL_FIXED.wkrt=['wk','ch'];TBL_FIXED.wkseg=['wk','seg'];

/* ---------- 주차 목록 — 실적 주(TV_WEEK · 주차 × 채널) 다음에 계획에만 있는 주(방송 예정) ---------- */
const tvwNo=s=>{const m=/(\d+)/.exec(String(s||''));return m?+m[1]:1e9;};
const tvwK=s=>tvKey(s);
function tvwWeekList(){
  const out=[],seen=new Map();
  const add=(wk,s,e,src)=>{wk=String(wk||'').trim();if(!wk)return null;const k=tvwK(wk);
    let o=seen.get(k);if(!o){o={wk,s:'',e:'',w:null,act:false,plan:false};seen.set(k,o);out.push(o);}
    if(s&&!o.s)o.s=s;if(e&&!o.e)o.e=e;
    if(src==='w'||src==='ch')o.act=true;if(src==='seg')o.plan=true;return o;};
  tvWeeks().forEach((r,i)=>{const o=add(tvWkLabel(r,i),tvIsoOk(r.start)?r.start:'',tvIsoOk(r.end)?r.end:'','w');if(o)o.w=r;});
  TV_WKCH.forEach(r=>{if(tvHas(r.cost)||tvHas(r.eqgrp)||tvHas(r.grp))add(r.wk,'','','ch');});
  TV_WKRT.forEach(r=>add(r.wk,'','','rt'));
  TV_WKSEG.forEach(r=>{const o=add(r.wk,'','','seg');if(o&&(tvHas(r.cnt)||tvHas(r.grp)||tvHas(r.eqgrp)))o.segAct=true;});
  /* 실적 주가 앞, 계획에만 있는 주는 뒤 — 각각 주차 번호 순(번호가 없으면 들어온 순서) */
  const allNo=out.every(o=>tvwNo(o.wk)<1e9);
  const a=out.filter(o=>o.act),b=out.filter(o=>!o.act);
  if(allNo){a.sort((x,y)=>tvwNo(x.wk)-tvwNo(y.wk));b.sort((x,y)=>tvwNo(x.wk)-tvwNo(y.wk));}
  return a.concat(b);}
/* 한 주의 합계 — 주차 합계 줄이 있으면 그것, 없으면 주차 × 채널 합 */
function tvwWeekAgg(o){
  const chs=TV_WKCH.filter(r=>tvwK(r.wk)===tvwK(o.wk));
  const cs=tvwSum(chs,['cost','eqgrp','grp','cnt','nlsn','bonus']);
  const w=o.w,pick=(k,ck)=>w&&tvHas(w[k])?tvNum(w[k]):(cs[ck||k]||NaN);
  const a={cost:pick('cost'),eq:pick('eqgrp'),grp:pick('grp'),cnt:pick('cnt'),nlsn:pick('nlsn'),bonus:pick('bonus'),
    reach:w&&tvHas(w.reach)?tvNum(w.reach):NaN,reach3:w&&tvHas(w.reach3)?tvNum(w.reach3):NaN,
    cumgrp:w&&tvHas(w.cumgrp)?tvNum(w.cumgrp):NaN,cumreach:w&&tvHas(w.cumreach)?tvNum(w.cumreach):NaN};
  Object.keys(a).forEach(k=>{if(!a[k])a[k]=NaN;});
  a.cprp=tvwDiv(a.cost,isFinite(a.eq)?a.eq:a.grp);
  a.brate=tvwDiv(a.bonus,a.cost);
  return a;}
const tvwDiv=(a,b)=>isFinite(a)&&isFinite(b)&&b?a/b:NaN;
/* 시청률 지수 — 우리 편성 평균 ÷ 타깃 평균 × 100 (채널 구분별) */
function tvwRtSeries(weeks){
  const cats=[...new Set(TV_WKRT.map(r=>String(r.ch||'').trim()).filter(Boolean))];
  return cats.map(c=>({c,pts:weeks.map(o=>{const r=TV_WKRT.find(x=>tvwK(x.wk)===tvwK(o.wk)&&String(x.ch||'').trim()===c);
    if(!r||!tvHas(r.rt))return null;const rt=tvNum(r.rt),trt=tvHas(r.trt)?tvNum(r.trt):NaN;
    return {rt,trt,idx:tvwDiv(rt,trt)*100};})}));}
/* 계획 eq.GRP · 계획 예산 (구분별 표 → 채널별 계획) */
function tvwPlan(){
  const P=tvPlanAgg().tot,S=tvSegTotal(tvSegRows());
  return {amt:P.amt||S.amt||NaN,grp:P.grp||S.pgrp||NaN,eq:S.peq||NaN,reach:P.reach,cnt:P.cnt||S.pcnt||NaN};}

/* ---------- 숫자 모양 ---------- */
const tvwK0=v=>isFinite(v)?fmt(Math.round(v/1000)):'–';                 /* 천원 */
const tvwEok=v=>!isFinite(v)?'–':v>=1e8?(v/1e8).toFixed(1)+L('억','억'):v>=1e4?fmt(Math.round(v/1e4))+L('만','만'):fmt(v);
const tvwG2=v=>isFinite(v)?(+v).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:2}):'–';
const tvwPct=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
const tvwBr=v=>isFinite(v)?fmt(Math.round(v*100))+'%':'–';               /* 보너스율 — 리포트의 11.44 = 1,144% */
const TVW_BARS={eqgrp:{l:'eq.GRP',k:'eqgrp',f:tvwG2},cost:{l:'집행 광고비',k:'cost',f:v=>tvwK0(v)+L('천원','K')},
  grp:{l:'GRP',k:'grp',f:tvwG2},nlsn:{l:'닐슨 금액',k:'nlsn',f:v=>tvwK0(v)+L('천원','K')}};
const TVW_LINES={cprp:{l:'CPRP (천원)',f:v=>tvwK0(v)},brate:{l:'보너스율',f:tvwBr},
  rtidx:{l:'시청률 지수',f:v=>isFinite(v)?Math.round(v)+'':'–'},none:{l:'없음'}};

/* ---------- 카드 배경 주차 추이 (디지털 '주요 지표' 카드와 같은 모양) ---------- */
function tvwSpark(card,vals,labels,f){
  const host=card.querySelector('.spark'),pill=card.querySelector('.sppill');if(!host)return;
  const ok=vals.filter(isFinite);if(ok.length<2)return;
  const W=300,H=112,n=vals.length;
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none',class:'spk'},host);
  let lo=Math.min(...ok),hi=Math.max(...ok);
  if(hi===lo){hi=lo+(Math.abs(lo)||1);lo=lo-(Math.abs(lo)||1)*.15;}else{const pad=(hi-lo)*.22;hi+=pad*.6;lo-=pad;}
  const X=i=>n<=1?0:(i/(n-1))*W,Y=v=>H-((v-lo)/(hi-lo))*(H-8)-4;
  const pts=[];vals.forEach((v,i)=>{if(isFinite(v))pts.push([X(i),Y(v),i]);});
  const line=smoothPath(pts.map(p=>[p[0],p[1]]));
  const gid=uid(),g=S('linearGradient',{id:gid,x1:'0',y1:'0',x2:'0',y2:'1'},svg);
  S('stop',{offset:'0%','stop-color':'var(--acc)','stop-opacity':'.13'},g);S('stop',{offset:'100%','stop-color':'var(--acc)','stop-opacity':'0'},g);
  S('path',{d:`${line} L${pts[pts.length-1][0]} ${H} L${pts[0][0]} ${H} Z`,fill:`url(#${gid})`},svg);
  const lid=uid(),lg=S('linearGradient',{id:lid,x1:'0',y1:'0',x2:'1',y2:'0',gradientUnits:'objectBoundingBox'},svg);
  S('stop',{offset:'0%','stop-color':'var(--acc-lt)','stop-opacity':'.22'},lg);
  const mid=S('stop',{offset:'50%','stop-color':'var(--acc-d)','stop-opacity':'1'},lg);
  S('stop',{offset:'100%','stop-color':'var(--acc-lt)','stop-opacity':'.22'},lg);
  let rm=false;try{rm=reduceMotion();}catch(e){}
  if(!rm)S('animate',{attributeName:'offset',values:'0.04;0.96;0.04',dur:'5.2s',repeatCount:'indefinite',calcMode:'spline',
    keySplines:'.42 0 .58 1;.42 0 .58 1',keyTimes:'0;.5;1'},mid);
  S('path',{d:line,fill:'none',stroke:`url(#${lid})`,'stroke-width':2.2,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},svg);
  const lp=pts[pts.length-1];
  S('circle',{cx:lp[0],cy:lp[1],r:3.4,fill:'var(--acc)',stroke:'var(--acc)',opacity:.9,'stroke-width':1,'vector-effect':'non-scaling-stroke',class:'spk-now'},svg);
  const hl=S('line',{x1:0,y1:0,x2:0,y2:H,stroke:'var(--acc)','stroke-width':1,'stroke-dasharray':'3 3','vector-effect':'non-scaling-stroke',opacity:0},svg);
  const hd=S('circle',{r:3.6,fill:'var(--acc)',stroke:'var(--surface)','stroke-width':2,'vector-effect':'non-scaling-stroke',opacity:0},svg);
  card.addEventListener('mousemove',ev=>{
    const r=host.getBoundingClientRect();let i=Math.round((ev.clientX-r.left)/Math.max(r.width,1)*(n-1));
    i=Math.max(0,Math.min(i,n-1));const v=vals[i];
    if(!isFinite(v)){hl.setAttribute('opacity',0);hd.setAttribute('opacity',0);pill.hidden=true;return;}
    const x=X(i),y=Y(v);
    hl.setAttribute('x1',x);hl.setAttribute('x2',x);hl.setAttribute('y1',y);hl.setAttribute('opacity',.55);
    hd.setAttribute('cx',x);hd.setAttribute('cy',y);hd.setAttribute('opacity',1);
    pill.hidden=false;pill.innerHTML=`<span class="d">${esc(labels[i])}</span><b class="mono">${f(v)}</b>`;
    const px=(x/W)*r.width,cw=card.getBoundingClientRect().width;
    pill.style.left=Math.max(6,Math.min(px-pill.offsetWidth/2,cw-pill.offsetWidth-6))+'px';
    pill.style.bottom=(r.height-(y/H)*r.height+10)+'px';});
  card.addEventListener('mouseleave',()=>{hl.setAttribute('opacity',0);hd.setAttribute('opacity',0);pill.hidden=true;});}

/* ---------- KPI 카드 — v137: TV 서머리 현황 아래로 옮김. 현황 카드(예산 소진 · GRP · Reach 1+ · 횟수)와 겹치지 않는 것만 ---------- */
function tvwCards(weeks,A,T,P){
  const box=$('tvwStrip');if(!box)return;box.innerHTML='';
  const act=weeks.filter(o=>o.act),N=act.length;
  const lab=act.map(o=>o.wk+(o.s?` · ${mdy(o.s)}~${o.e?mdy(o.e):''}`:''));
  const last=A[N-1]||{},lastWk=N?act[N-1].wk:'';
  const dl=(good,txt)=>`<div class="dl ${good==null?'flat':good?'up':'down'}">${txt}</div>`;
  let n=0;
  const card=(k,v,dlh,e,r,r2,vals,f)=>{n++;const c=el('div','card stat tvwstat',box);
    c.innerHTML=`<div class="sbody"><div class="k">${k}</div><div class="v mono">${v}</div>${dlh||''}
      <div class="e">${e||''}</div><div class="r">${r||''}</div><div class="r2">${r2||''}</div></div>
      <div class="spark"></div><div class="sppill" hidden></div>`;
    if(vals&&N>1)tvwSpark(c,vals,lab,f);};
  const kw=v=>isFinite(v)?`${fmt(Math.round(v/1000))}<span class="vsm"> ${L('천원','K')}</span>`:'–';
  const kws=v=>isFinite(v)?`${fmt(Math.round(v/1000))}${L('천원','K')}`:'–';
  /* eq.GRP — 현황 카드의 GRP 와 다른 지표(초수 보정) */
  if(isFinite(T.eq)){const rt=tvwDiv(T.eq,P.eq);
    card('eq.GRP',tvwG2(T.eq),isFinite(rt)?dl(null,`${L('계획 대비','of plan')} ${tvwPct(rt)}`):'',
      `${L('계획','Plan')} <b class="mono">${tvwG2(P.eq)}</b>`,
      N?`${L('주평균','Weekly avg')} <b class="mono">${tvwG2(T.eq/N)}</b>`:'',
      N?`${esc(lastWk)} <b class="mono">${tvwG2(last.eq)}</b>`:'',N?A.map(a=>a.eq):null,tvwG2);}
  /* CPRP — 낮을수록 좋다. 계획 CPRP = 계획 예산 ÷ 계획 eq.GRP */
  {const v=T.cprp,pl=tvwDiv(P.amt,isFinite(T.eq)?P.eq:P.grp),d=isFinite(v)&&isFinite(pl)?pl/v-1:NaN;
    if(isFinite(v))card(isFinite(T.eq)?'eq.CPRP':'CPRP',kw(v),
      isFinite(d)?dl(d>=0,`${L('계획 대비','vs plan')} ${d>=0?'−':'+'}${tvwPct(Math.abs(v/pl-1))} <i>${d>=0?'↓':'↑'}</i>`):'',
      `${L('계획','Plan')} <b class="mono">${kws(pl)}</b>`,
      N?`${L('최저 주','Best week')} <b class="mono">${(()=>{let b=-1;A.forEach((a,i)=>{if(isFinite(a.cprp)&&(b<0||a.cprp<A[b].cprp))b=i;});return b<0?'–':`${esc(act[b].wk)} ${kws(A[b].cprp)}`;})()}</b>`:'',
      N?`${esc(lastWk)} <b class="mono">${kws(last.cprp)}</b>`:'',N?A.map(a=>a.cprp):null,kws);}
  /* 보너스율 — 보너스 금액 ÷ 집행 광고비 */
  if(isFinite(T.brate))card(L('보너스율','Bonus rate'),tvwBr(T.brate),'',
      `${L('닐슨 금액','Nielsen value')} <b class="mono">${kws(T.nlsn)}</b>`,
      `${L('보너스 금액','Bonus value')} <b class="mono">${kws(T.bonus)}</b>`,
      N?`${esc(lastWk)} <b class="mono">${tvwBr(last.brate)}</b>`:'',N?A.map(a=>a.brate):null,tvwBr);
  /* Reach 3+ — 현황 카드는 Reach 1+ 만 */
  {const r1=tvActReach(),r3=tvHas(TV_META.reach3)?tvNum(TV_META.reach3):NaN;
    const pr3=(()=>{const xs=tvSegRows().filter(r=>tvHas(r.preach3));return NaN;})();
    if(isFinite(r3))card('Reach 3+',tvRc(r3),isFinite(r1)?dl(null,`${L('유효 도달 비율','R3+ / R1+')} ${tvwPct(r3/r1)}`):'',
      isFinite(r1)?`Reach 1+ <b class="mono">${tvRc(r1)}</b>`:'',
      `<span class="sub">${L('3회 이상 본 타깃 비율 · 전체(중복 제거) 값','Share of target reached 3+ times · de-duplicated')}</span>`,'',null,tvRc);}
  box.classList.toggle('hidden',!n);
  box.style.setProperty('--n',n);}

/* ---------- 주차별 집행 흐름 — 디지털 '일자별 캠페인 효율 비교'와 같은 입체 그래프 ---------- */
function tvwFlow(weeks,A){
  const host=$('tvwFlow');if(!host)return;host.innerHTML='';
  const lgBox=$('tvwFlowLg');if(lgBox)lgBox.innerHTML='';
  const N=weeks.length;if(!N)return;
  const bk=TVW_BARS[TVW_BAR]?TVW_BAR:'eqgrp',lk=TVW_LINES[TVW_LINE]?TVW_LINE:'cprp';
  /* 계열 = 주차 × 채널의 채널(입력 순서). 없으면 한 계열 */
  const chs=[...new Set(TV_WKCH.map(r=>String(r.ch||'').trim()).filter(Boolean))];
  const series=chs.length?chs.map(c=>({key:c,vals:weeks.map(o=>{if(!o.act)return 0;
      return sum(TV_WKCH.filter(r=>tvwK(r.wk)===tvwK(o.wk)&&String(r.ch||'').trim()===c).map(r=>tvNum(r[bk])));})}))
    :[{key:TVW_BARS[bk].l,vals:weeks.map((o,i)=>o.act?(num0({eqgrp:A[i].eq,cost:A[i].cost,grp:A[i].grp,nlsn:A[i].nlsn}[bk])):0)}];
  const totals=weeks.map((_,i)=>sum(series.map(s=>s.vals[i])));
  const DARK=document.documentElement.getAttribute('data-theme')==='dark';
  const W=Math.max(Math.round(host.clientWidth)||640,420),H=360;
  const floorH=104,Ftop=H-floorH,BASE=Ftop+Math.round(floorH*.42);
  const SX=Math.round(Math.max(18,Math.min(36,W*.025)));
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'chart d3 tvwflow'},host);
  const X0=SX,XW=W-SX*2,step=XW/N,cx=i=>X0+step*i+step/2;
  const pal=pickRamp(series.length);
  const FLC=DARK?[200,168,136]:[150,120,90],FLO=DARK?[.04,.09,.16]:[.08,.17,.28];
  const INK=DARK?'#e8e8e8':'#24262a',INK2=DARK?'#b8ab9c':'#8a7f75',HALO=cssVar('--surface')||(DARK?'#1e1e1e':'#fff');
  const rgbOf=c=>{c=String(c||'').trim();const m=/^rgba?\(([^)]+)\)/.exec(c);if(m)return m[1].split(',').slice(0,3).map(x=>+x);
    try{return hex2rgb(c);}catch(e){return [120,124,130];}};
  const rgba=(c,a,k=1)=>`rgba(${c.map(v=>Math.round(Math.max(0,Math.min(255,v*k)))).join(',')},${a})`;
  const barMaxH=(BASE-16)*.46,mx=Math.max(...totals)||1,BH=v=>v/mx*barMaxH;
  const bw=Math.min(step*.3,46),DEP=Math.max(5,Math.min(9,bw*.18));
  /* 바닥 + 주별 집행 광고비 언덕 */
  const spend=weeks.map((o,i)=>o.act&&isFinite(A[i].cost)?A[i].cost:NaN);
  const EL=weeks.filter(o=>o.act).length;
  {const got=spend.filter(isFinite),sMax=Math.max(0,...got),BK=16,HH=barMaxH*.95;let hill;
    if(got.length>=2&&sMax>0){
      const pts=[];for(let i=0;i<EL;i++)if(isFinite(spend[i]))pts.push([cx(i)+BK,Math.min(Ftop,BASE-BK-(spend[i]/sMax)*HH)]);
      const sm=smoothPath(pts),ci=sm.indexOf(' C');
      hill=`M0 ${H} L0 ${pts[0][1]} L${pts[0][0]} ${pts[0][1]}`+(ci>=0?sm.slice(ci):'');
      const lp=pts[pts.length-1];
      if(EL<N){const xe=Math.min(W,lp[0]+step*.9);hill+=` C${lp[0]+step*.35} ${lp[1]} ${xe-step*.35} ${Ftop} ${xe} ${Ftop} L${W} ${Ftop}`;}
      else hill+=` L${W} ${lp[1]}`;
      hill+=` L${W} ${H} Z`;
      const hTop=Math.min(...pts.map(p=>p[1]))-6,gid='tvwf'+uid();
      const lg=S('linearGradient',{id:gid,gradientUnits:'userSpaceOnUse',x1:0,y1:hTop,x2:0,y2:H},svg);
      S('stop',{offset:0,'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[0]},lg);
      S('stop',{offset:Math.max(.05,Math.min(.95,(BASE-hTop)/(H-hTop))).toFixed(3),'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[1]},lg);
      S('stop',{offset:1,'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[2]},lg);
      S('path',{d:hill,fill:`url(#${gid})`,stroke:'none','pointer-events':'none'},svg);
      /* 언덕 위 금액 — 가장 많이 쓴 주 · 마지막 주 */
      const iC=spend.indexOf(Math.max(...got));
      [...new Set([iC,EL-1])].forEach(i=>{if(!isFinite(spend[i]))return;const x=cx(i)+BK,y=BASE-BK-(spend[i]/sMax)*HH;
        const t=S('text',{x:x+8,y:y-8,'text-anchor':'start','font-size':11,'font-weight':700,fill:INK2,'paint-order':'stroke',stroke:HALO,'stroke-width':3,'pointer-events':'none',class:'tvwspl'},svg);
        t.textContent=tvwEok(spend[i]);});}
    else S('path',{d:`M0 ${H} L0 ${Ftop} L${W} ${Ftop} L${W} ${H} Z`,fill:`rgba(${FLC},${FLO[1]})`},svg);}
  /* 막대 그림자 · 입체 막대 */
  const shg='tvwsh'+uid();{const rg=S('radialGradient',{id:shg},svg);
    S('stop',{offset:0,'stop-color':'#000','stop-opacity':DARK?.5:.2},rg);S('stop',{offset:1,'stop-color':'#000','stop-opacity':0},rg);}
  const PR=pal.map(rgbOf),BARS=[];
  weeks.forEach((o,i)=>{const bl=cx(i)-(bw+DEP)/2;
    if(!o.act){/* 방송 예정 주 — 점선 자리만 */
      const g=S('g',{'pointer-events':'none',opacity:.75},svg);
      S('rect',{x:bl,y:BASE-barMaxH*.42,width:bw,height:barMaxH*.42,fill:'none',stroke:'var(--gline)','stroke-dasharray':'4 4','stroke-width':1.2,rx:3},g);
      const t=S('text',{x:bl+bw/2,y:BASE-barMaxH*.21+4,'text-anchor':'middle','font-size':11,'font-weight':700,fill:'var(--muted)'},g);
      t.textContent=L('방송 예정','Upcoming');return;}
    if(!(totals[i]>0))return;
    const w=bw+DEP+34;S('ellipse',{cx:bl-10+w/2,cy:BASE-DEP/2,rx:w/2,ry:9,fill:`url(#${shg})`,'pointer-events':'none'},svg);});
  weeks.forEach((o,i)=>{if(!o.act||!(totals[i]>0))return;
    const bl=cx(i)-(bw+DEP)/2;let y=BASE;
    let top=-1;for(let si=series.length-1;si>=0;si--)if(series[si].vals[i]>0){top=si;break;}
    const g=S('g',{'pointer-events':'none',class:'dbar'},svg);BARS[i]=g;
    series.forEach((s,si)=>{const v=s.vals[i];if(!(v>0))return;const h=Math.max(BH(v),1),t=y-h,c=PR[si];
      S('rect',{x:bl.toFixed(1),y:t.toFixed(1),width:bw.toFixed(1),height:h.toFixed(1),fill:rgba(c,.82)},g);
      S('path',{d:`M${(bl+bw).toFixed(1)} ${t.toFixed(1)} l${DEP.toFixed(1)} ${(-DEP).toFixed(1)} v${h.toFixed(1)} l${(-DEP).toFixed(1)} ${DEP.toFixed(1)} Z`,fill:rgba(c,.82,.72)},g);
      if(si===top)S('path',{d:`M${bl.toFixed(1)} ${t.toFixed(1)} l${DEP.toFixed(1)} ${(-DEP).toFixed(1)} h${bw.toFixed(1)} l${(-DEP).toFixed(1)} ${DEP.toFixed(1)} Z`,fill:rgba(c,.88,1.18)},g);
      /* 칸이 넉넉하면 채널 이름 · 비중 */
      if(h>=22&&bw>=72){const tx=S('text',{x:bl+6,y:t+14,'font-size':10.5,'font-weight':700,fill:'#fff',opacity:.92},g);
        tx.textContent=`${s.key} ${Math.round(v/totals[i]*100)}%`;}
      y=t;});
    const tv=S('text',{x:bl+bw/2+DEP/2,y:y-DEP-8,'text-anchor':'middle','font-size':12.5,'font-weight':800,fill:INK,'paint-order':'stroke',stroke:HALO,'stroke-width':3,'pointer-events':'none'},svg);
    tv.textContent=bk==='cost'||bk==='nlsn'?tvwEok(totals[i]):tvwG2(totals[i]);});
  /* 주차 이름 · 기간 */
  weeks.forEach((o,i)=>{const t=S('text',{x:cx(i),y:BASE+24,'text-anchor':'middle','font-size':13,'font-weight':800,fill:o.act?INK:'var(--muted)'},svg);t.textContent=o.wk;
    if(o.s){const p=S('text',{x:cx(i),y:BASE+41,'text-anchor':'middle','font-size':10.5,'font-weight':700,fill:INK2},svg);p.textContent=`${mdy(o.s)}~${o.e?mdy(o.e):''}`;}});
  svg.querySelectorAll('text.tvwspl').forEach(t=>svg.appendChild(t));
  /* 꺾은선 */
  let lv=null;
  if(lk!=='none'){
    if(lk==='rtidx'){const rs=tvwRtSeries(weeks);lv=weeks.map((o,i)=>{const xs=rs.map(s=>s.pts[i]).filter(p=>p&&isFinite(p.idx));
        /* 구분이 여럿이면 편성 시청률 합 ÷ 타깃 평균 합 */
        return xs.length?tvwDiv(sum(xs.map(p=>p.rt)),sum(xs.map(p=>p.trt)))*100:NaN;});}
    else lv=weeks.map((o,i)=>o.act?A[i][lk]:NaN);
    const ok=lv.filter(isFinite);
    if(ok.length){
      const mn=Math.min(...ok),mx2=Math.max(...ok),rg=(mx2-mn)||mx2*.2||1;
      const lo=mn>=0?Math.max(0,mn-rg*.9):mn-rg*.9,hi=mx2+rg*.9;
      const lTop=44,lBot=Math.max(lTop+44,BASE-barMaxH-DEP-34);
      const LY=v=>lBot-(v-lo)/((hi-lo)||1)*(lBot-lTop);
      const pts=lv.map((v,i)=>isFinite(v)?[cx(i),LY(v)]:null).filter(Boolean);
      S('path',{d:pts.length>1?smoothPath(pts):`M${pts[0][0]-1} ${pts[0][1]} L${pts[0][0]+1} ${pts[0][1]}`,fill:'none',stroke:DARK?'rgba(240,240,240,.62)':'rgba(30,32,36,.58)',
        'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round','pointer-events':'none'},svg);
      lv.forEach((v,i)=>{if(!isFinite(v))return;const y=LY(v);
        S('circle',{cx:cx(i),cy:y,r:4.2,fill:HALO,stroke:DARK?'#ddd':'#2a2c30','stroke-width':2,'pointer-events':'none'},svg);
        const t=S('text',{x:cx(i),y:y-12,'text-anchor':'middle','font-size':12,'font-weight':800,fill:INK,'paint-order':'stroke',stroke:HALO,'stroke-width':3.5,'pointer-events':'none'},svg);
        t.textContent=TVW_LINES[lk].f(v);});
      const lt=S('text',{x:X0,y:22,'font-size':11,'font-weight':800,fill:INK2},svg);lt.textContent=L(TVW_LINES[lk].l,{cprp:'CPRP (K KRW)',brate:'Bonus rate',rtidx:'Rating index'}[lk]||TVW_LINES[lk].l);}
    else lv=null;}
  /* 툴팁 */
  weeks.forEach((o,i)=>{const hit=S('rect',{x:X0+step*i,y:0,width:step,height:H,fill:'transparent'},svg);
    hit.addEventListener('mousemove',e=>{const a=A[i]||{};
      showTip(e.clientX,e.clientY,`<div class="t">${esc(o.wk)}${o.s?` · ${mdy(o.s)}~${o.e?mdy(o.e):''}`:''}${o.act?'':' · '+L('방송 예정','upcoming')}</div>`
        +(o.act?series.map((s,si)=>`<div class="r"><span class="l"><span style="width:8px;height:8px;border-radius:2px;background:${pal[si]};display:inline-block"></span>${esc(s.key)}</span><b>${TVW_BARS[bk].f(s.vals[i])}</b></div>`).join('')
          +`<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:5px"><span class="l">${TVW_BARS[bk].l} ${L('합계','total')}</span><b>${TVW_BARS[bk].f(totals[i])}</b></div>`
          +(isFinite(a.cost)?`<div class="r"><span class="l">${L('집행 광고비','Spend')}</span><b>${tvwK0(a.cost)}${L('천원','K')}</b></div>`:'')
          +(isFinite(a.cprp)?`<div class="r"><span class="l">CPRP</span><b>${tvwK0(a.cprp)}${L('천원','K')}</b></div>`:'')
          +(isFinite(a.brate)?`<div class="r"><span class="l">${L('보너스율','Bonus rate')}</span><b>${tvwBr(a.brate)}</b></div>`:'')
          +(lv&&lk==='rtidx'&&isFinite(lv[i])?`<div class="r"><span class="l">${L('시청률 지수','Rating index')}</span><b>${Math.round(lv[i])}</b></div>`:'')
          :`<div class="r"><span class="l">${L('계획 횟수','Planned spots')}</span><b>${fmt(sum(TV_WKSEG.filter(r=>tvwK(r.wk)===tvwK(o.wk)).map(r=>tvNum(r.pcnt))))}</b></div>`));
      if(BARS[i])BARS[i].classList.add('on');svg.classList.add('hov');});
    hit.addEventListener('mouseleave',()=>{hideTip();if(BARS[i])BARS[i].classList.remove('on');svg.classList.remove('hov');});});
  /* 범례 */
  if(lgBox)lgBox.innerHTML=series.map((s,si)=>`<span class="it"><span class="dot" style="background:${pal[si]}"></span>${esc(s.key)}</span>`).join('')
    +(lv?`<span class="it"><span class="linekey" style="background:${DARK?'#ccc':'#3a3c40'}"></span>${esc(TVW_LINES[lk].l)}</span>`:'')
    +`<span class="it"><span class="dot" style="background:rgba(150,120,90,.35)"></span>${L('주별 집행 광고비 (뒤 언덕)','Weekly spend (hill)')}</span>`
    +(weeks.some(o=>!o.act)?`<span class="it"><span class="dot" style="border:1.2px dashed var(--gline);background:none"></span>${L('방송 예정 주 (계획만)','Upcoming week (plan only)')}</span>`:'');}
const num0=v=>isFinite(v)?v:0;

/* ---------- 방송사 × 주차 히트맵 ---------- */
function tvwHeat(weeks){
  const box=$('tvwHeat');if(!box)return;
  const act=weeks.filter(o=>o.act);
  const chs=[...new Set(TV_WKCH.map(r=>String(r.ch||'').trim()).filter(Boolean))];
  const col=$('tvwHeatCol');if(col)col.classList.toggle('hidden',!chs.length||!act.length);
  if(!chs.length||!act.length){box.innerHTML='';return;}
  const m=TVW_HEAT;
  const cell=(c,o)=>{const rs=TV_WKCH.filter(r=>tvwK(r.wk)===tvwK(o.wk)&&String(r.ch||'').trim()===c);
    const s=tvwSum(rs,['cost','eqgrp','grp','nlsn','bonus']);
    return {cost:s.cost||NaN,eq:s.eqgrp||NaN,grp:s.grp||NaN,cprp:tvwDiv(s.cost,s.eqgrp||s.grp),brate:tvwDiv(s.bonus,s.cost)};};
  const val=x=>m==='cost'?x.cost:m==='cprp'?x.cprp:m==='brate'?x.brate:x.eq;
  const show=x=>m==='cost'?tvwK0(x.cost):m==='cprp'?tvwK0(x.cprp):m==='brate'?tvwBr(x.brate):tvwG2(x.eq);
  const grid=chs.map(c=>act.map(o=>cell(c,o)));
  const tot=chs.map(c=>{const s=tvwSum(TV_WKCH.filter(r=>String(r.ch||'').trim()===c&&act.some(o=>tvwK(o.wk)===tvwK(r.wk))),['cost','eqgrp','grp','bonus']);
    return {cost:s.cost||NaN,eq:s.eqgrp||NaN,cprp:tvwDiv(s.cost,s.eqgrp||s.grp),brate:tvwDiv(s.bonus,s.cost)};});
  const colTot=act.map((o,j)=>{const s=tvwSum(TV_WKCH.filter(r=>tvwK(r.wk)===tvwK(o.wk)),['cost','eqgrp','grp','bonus']);
    return {cost:s.cost||NaN,eq:s.eqgrp||NaN,cprp:tvwDiv(s.cost,s.eqgrp||s.grp),brate:tvwDiv(s.bonus,s.cost)};});
  const all=[].concat(...grid).map(val).filter(isFinite);const lo=Math.min(...all),hi=Math.max(...all);
  /* CPRP 는 낮을수록 좋다 → 낮을수록 진하게 */
  const inten=v=>!isFinite(v)||hi===lo?.12:(m==='cprp'?(hi-v)/(hi-lo):(v-lo)/(hi-lo))*.78+.08;
  const share=(c,j)=>m==='eqgrp'||m==='cost'?tvwDiv(val(grid[c][j]),val(colTot[j])):NaN;
  let h=`<table class="tbl lite tvwheat"><thead><tr><th>${L('방송사','Network')}</th>`+act.map(o=>`<th>${esc(o.wk)}</th>`).join('')+`<th class="gsep">${L('계','Total')}</th></tr></thead><tbody>`;
  chs.forEach((c,ci)=>{h+=`<tr><td class="head">${esc(c)}</td>`+act.map((o,j)=>{const x=grid[ci][j],v=val(x),a=inten(v),sh=share(ci,j);
      return `<td class="hcell" style="--a:${a.toFixed(3)}"><b class="mono">${show(x)}</b>${isFinite(sh)?`<span class="mono">${(sh*100).toFixed(0)}%</span>`:''}</td>`;}).join('')
    +`<td class="mono gsep tot">${show(tot[ci])}</td></tr>`;});
  h+=`<tr class="total"><td class="head">TOTAL</td>`+colTot.map(x=>`<td class="mono">${show(x)}</td>`).join('')
    +`<td class="mono gsep">${(()=>{const s=tvwSum(TV_WKCH.filter(r=>act.some(o=>tvwK(o.wk)===tvwK(r.wk))),['cost','eqgrp','grp','bonus']);
      return show({cost:s.cost,eq:s.eqgrp,cprp:tvwDiv(s.cost,s.eqgrp||s.grp),brate:tvwDiv(s.bonus,s.cost)});})()}</td></tr></tbody></table>`;
  box.innerHTML=`<div class="tbl-wrap noy">${h}</div>`;
  const n=$('tvwHeatNote');
  if(n)n.textContent=m==='cprp'?L('천원 · 낮을수록 진하게','K KRW · darker = cheaper'):m==='cost'?L('천원 · 칸 아래 = 그 주 안 비중','K KRW · share within the week'):m==='brate'?L('보너스 금액 ÷ 집행 광고비','Bonus ÷ spend'):L('칸 아래 = 그 주 안 비중','share within the week');}

/* ---------- 시청률 지수 — 우리 편성 평균 ÷ 타깃 평균 × 100 (v137: 크게 · 지수 / 시청률 비교) ---------- */
let TVW_RT='idx';
function tvwRating(weeks){
  const host=$('tvwRt'),col=$('tvwRtCol');if(!host)return;host.innerHTML='';
  const ws=weeks.filter(o=>TV_WKRT.some(r=>tvwK(r.wk)===tvwK(o.wk)));
  const rs=tvwRtSeries(ws).filter(s=>s.pts.some(p=>p&&isFinite(p.idx)));
  if(col)col.classList.toggle('hidden',!rs.length);
  const lg=$('tvwRtLg');if(lg)lg.innerHTML='';
  const sel=$('tvwRtSel');
  if(sel){sel.innerHTML=[['idx',L('시청률 지수','Rating index')],['raw',L('시청률 비교 (편성 vs 타깃 평균)','Ratings (ours vs target avg)')]]
      .map(([k,l])=>`<option value="${k}"${k===TVW_RT?' selected':''}>${l}</option>`).join('');
    sel.onchange=()=>{TVW_RT=sel.value;tvwRating(tvwWeekList());};}
  if(!rs.length)return;
  const RAW=TVW_RT==='raw';
  const DARK=document.documentElement.getAttribute('data-theme')==='dark';
  const W=Math.max(Math.round(host.clientWidth)||1100,420),H=400,P={l:52,r:120,t:34,b:50};
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'chart tvwrt'},host);
  const vals=RAW?[].concat(...rs.map(s=>s.pts.filter(Boolean).flatMap(p=>[p.rt,p.trt]).filter(isFinite)))
    :[].concat(...rs.map(s=>s.pts.filter(p=>p&&isFinite(p.idx)).map(p=>p.idx))).concat([100]);
  const lo0=Math.min(...vals),hi0=Math.max(...vals),pad=(hi0-lo0)*.12||1;
  const tk=niceTicks(RAW?Math.max(0,lo0-pad):lo0-pad,hi0+pad,5,RAW);
  const N=ws.length,XW=W-P.l-P.r,X=i=>P.l+(N<=1?XW/2:XW*(i+.5)/N),Y=v=>P.t+(tk.hi-v)/((tk.hi-tk.lo)||1)*(H-P.t-P.b);
  const INK=DARK?'#e8e8e8':'#24262a',INK2=DARK?'#b0b0b0':'#61656b',HALO=cssVar('--surface')||'#fff';
  /* 주차 띠 — 번갈아 옅은 배경 */
  ws.forEach((o,i)=>{if(i%2)S('rect',{x:P.l+XW*i/N,y:P.t,width:XW/N,height:H-P.t-P.b,fill:'var(--line2)',opacity:.7},svg);});
  tk.ticks.forEach(v=>{S('line',{x1:P.l,x2:W-P.r,y1:Y(v),y2:Y(v),stroke:'var(--line)','stroke-width':1},svg);
    const t=S('text',{x:P.l-10,y:Y(v)+4,'text-anchor':'end','font-size':11,fill:'var(--muted)'},svg);t.textContent=RAW?(+v).toFixed(2)+'%':v;});
  if(!RAW){S('rect',{x:P.l,y:Y(100),width:XW,height:Math.max(0,Y(tk.lo)-Y(100)),fill:DARK?'rgba(255,255,255,.03)':'rgba(0,0,0,.025)'},svg);
    S('line',{x1:P.l,x2:W-P.r,y1:Y(100),y2:Y(100),stroke:INK2,'stroke-width':1.5,'stroke-dasharray':'6 4'},svg);
    const t=S('text',{x:P.l+8,y:Y(100)-7,'font-size':11.5,'font-weight':800,fill:INK2,'paint-order':'stroke',stroke:HALO,'stroke-width':3},svg);t.textContent=L('타깃 평균 = 100','Target avg = 100');}
  ws.forEach((o,i)=>{const t=S('text',{x:X(i),y:H-P.b+24,'text-anchor':'middle','font-size':13,'font-weight':800,fill:INK},svg);t.textContent=o.wk;
    if(o.s){const p=S('text',{x:X(i),y:H-P.b+40,'text-anchor':'middle','font-size':10.5,'font-weight':700,fill:'var(--muted)'},svg);p.textContent=`${mdy(o.s)}~${o.e?mdy(o.e):''}`;}});
  const tone=pickRamp(Math.max(rs.length,2)),dash=['','7 5','2 4','10 4 2 4'];
  const labs=[],ends=[];
  rs.forEach((s,si)=>{const c=tone[si%tone.length];
    const line=(get,dsh,wd,op)=>{const pts=s.pts.map((p,i)=>p&&isFinite(get(p))?[X(i),Y(get(p))]:null).filter(Boolean);
      if(pts.length>1)S('path',{d:smoothPath(pts),fill:'none',stroke:c,'stroke-width':wd,'stroke-dasharray':dsh,'stroke-linecap':'round',opacity:op},svg);};
    if(RAW){line(p=>p.trt,'3 5',2,.75);line(p=>p.rt,dash[si%dash.length],3,1);}
    else line(p=>p.idx,dash[si%dash.length],3,1);
    s.pts.forEach((p,i)=>{if(!p)return;const v=RAW?p.rt:p.idx;if(!isFinite(v))return;
      S('circle',{cx:X(i),cy:Y(v),r:4.6,fill:HALO,stroke:c,'stroke-width':2.4},svg);
      if(RAW&&isFinite(p.trt))S('circle',{cx:X(i),cy:Y(p.trt),r:3,fill:c,opacity:.55},svg);
      labs.push({i,y:Y(v),c,t:RAW?p.rt.toFixed(2)+'%':String(Math.round(v))});});
    /* 오른쪽 끝 이름표 */
    const lp=[...s.pts].reverse().find(p=>p&&isFinite(RAW?p.rt:p.idx)),li=s.pts.lastIndexOf(lp);
    if(lp)ends.push({y:Y(RAW?lp.rt:lp.idx)+4,c,t:s.c});});
  /* 오른쪽 이름표도 겹치지 않게 */
  {let prev=-1e9;ends.sort((a,b)=>a.y-b.y).forEach(e=>{const y=Math.max(e.y,prev+15);prev=y;
    const t=S('text',{x:W-P.r+12,y,'font-size':12,'font-weight':800,fill:e.c},svg);t.textContent=e.t;});}
  /* 값 이름표 — 같은 주에서 겹치면 위아래로 비켜 놓는다 */
  ws.forEach((o,i)=>{const xs=labs.filter(l=>l.i===i).sort((a,b)=>a.y-b.y);let prev=-1e9;
    xs.forEach((l,k)=>{let y=l.y-11;if(y<prev+14)y=prev+14;prev=y;
      const t=S('text',{x:X(i)+9,y,'text-anchor':'start','font-size':11.5,'font-weight':800,fill:l.c,'paint-order':'stroke',stroke:HALO,'stroke-width':3.5},svg);t.textContent=l.t;});});
  ws.forEach((o,i)=>{const hit=S('rect',{x:P.l+XW*i/N,y:0,width:XW/N,height:H,fill:'transparent'},svg);
    hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(o.wk)}${o.s?` · ${mdy(o.s)}~${o.e?mdy(o.e):''}`:''}</div>`
      +rs.map((s,si)=>{const p=s.pts[i];return p?`<div class="r"><span class="l"><span style="width:10px;height:3px;background:${tone[si%tone.length]};display:inline-block"></span>${esc(s.c)} ${L('지수','index')}</span><b>${isFinite(p.idx)?Math.round(p.idx):'–'}</b></div>`
        +`<div class="r" style="opacity:.75;font-size:10.5px"><span class="l">${L('편성','Ours')} ${p.rt.toFixed(2)}% · ${L('타깃 평균','Target avg')} ${isFinite(p.trt)?p.trt.toFixed(2)+'%':'–'}</span></div>`:'';}).join('')));
    hit.addEventListener('mouseleave',hideTip);});
  if(lg)lg.innerHTML=rs.map((s,si)=>`<span class="it"><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="${tone[si%tone.length]}" stroke-width="2.6" stroke-dasharray="${dash[si%dash.length]}"/></svg>${esc(s.c)}</span>`).join('')
    +(RAW?`<span class="it"><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 5"/></svg>${L('타깃 평균 (같은 색 점선)','Target avg (dotted)')}</span>`
      :`<span class="it hint">${L('100 보다 높으면 타깃 평균보다 시청률이 높은 자리에 편성했다는 뜻입니다','Above 100 = aired in slots rated above the target average')}</span>`);}

/* ---------- 품목(구분)별 주차 편성 — 계획 횟수 플라이트 + 실적 ---------- */
function tvwFlight(weeks){
  const box=$('tvwFlightBox'),tb=$('tvwFlight');if(!box||!tb)return;
  const segs=[];tvSegRows().forEach(r=>{const s=String(r.seg).trim();if(!segs.includes(s))segs.push(s);});
  TV_WKSEG.forEach(r=>{const s=String(r.seg||'').trim();if(s&&!segs.includes(s))segs.push(s);});
  const ws=weeks.filter(o=>TV_WKSEG.some(r=>tvwK(r.wk)===tvwK(o.wk)));
  const on=TV_WKSEG.some(r=>String(r.seg||'').trim())&&ws.length;
  box.classList.toggle('hidden',!on);if(!on){tb.innerHTML='';return;}
  const rowsOf=s=>TV_WKSEG.filter(r=>String(r.seg||'').trim()===s);
  const get=(s,o,k)=>{const rs=rowsOf(s).filter(r=>tvwK(r.wk)===tvwK(o.wk));return rs.some(r=>tvHas(r[k]))?sum(rs.map(r=>tvNum(r[k]))):NaN;};
  const hasAct=TV_WKSEG.some(r=>tvHas(r.cnt)||tvHas(r.eqgrp)||tvHas(r.grp));
  const mx=Math.max(1,...segs.map(s=>Math.max(...ws.map(o=>num0(get(s,o,'pcnt')))))) ;
  const segAct=new Map(tvSegRows().map(r=>[String(r.seg).trim(),r]));
  const showSegAct=segAct.size>0;
  const colTot=ws.map(o=>sum(segs.map(s=>num0(get(s,o,'pcnt')))));
  const allP=sum(colTot);
  let h=`<thead><tr><th rowspan="2">${L('구분','Group')}</th><th colspan="${ws.length}">${L('주차별 편성','Weekly flighting')} <span class="tvunit">(${hasAct?L('실적 / 계획 횟수','actual / planned spots'):L('계획 횟수 · 큐시트','planned spots · cue sheet')})</span></th>`
    +`<th rowspan="2" class="gsep">${L('계획 계','Plan total')}</th><th rowspan="2">${L('비중','Share')}</th>`
    +(showSegAct?`<th colspan="4" class="gsep">${L('실적 (기간 누적)','Actual (to date)')}</th>`:'')+`</tr><tr>`
    +ws.map(o=>`<th class="${o.act?'':'tvwup'}">${esc(o.wk)}${o.act?'':`<span class="sub">${L('예정','next')}</span>`}</th>`).join('')
    +(showSegAct?`<th class="gsep">${L('횟수','Spots')}</th><th>GRP</th><th>eq.GRP</th><th>Reach 1+</th>`:'')+`</tr></thead><tbody>`;
  segs.forEach(s=>{const tp=sum(ws.map(o=>num0(get(s,o,'pcnt'))));const sa=segAct.get(s);
    h+=`<tr><td class="head">${esc(s)}</td>`+ws.map(o=>{const p=get(s,o,'pcnt'),a=get(s,o,'cnt');
        const w=isFinite(p)?Math.max(4,p/mx*100):0;
        return `<td class="fl${o.act?'':' up'}"><div class="flc"><i style="width:${w.toFixed(1)}%"></i><b class="mono">${isFinite(a)?fmt(a)+' / ':''}${isFinite(p)?fmt(p):'–'}</b></div></td>`;}).join('')
      +`<td class="mono gsep">${tp?fmt(tp):'–'}</td><td class="mono">${allP?tvwPct(tp/allP):'–'}</td>`
      +(showSegAct?`<td class="mono gsep">${sa&&tvHas(sa.cnt)?fmt(tvNum(sa.cnt)):'–'}</td><td class="mono">${sa?tvG(tvNum(sa.grp)):'–'}</td><td class="mono">${sa?tvG(tvNum(sa.eq)):'–'}</td><td class="mono">${sa&&tvHas(sa.reach)?tvRc(tvNum(sa.reach)):'–'}</td>`:'')+`</tr>`;});
  const ST=tvSegTotal(tvSegRows());
  h+=`<tr class="total"><td class="head">TOTAL</td>`+colTot.map(v=>`<td class="mono">${v?fmt(v):'–'}</td>`).join('')
    +`<td class="mono gsep">${allP?fmt(allP):'–'}</td><td class="mono">${allP?'100%':'–'}</td>`
    +(showSegAct?`<td class="mono gsep">${ST.cnt?fmt(ST.cnt):'–'}</td><td class="mono">${tvG(ST.grp)}</td><td class="mono">${tvG(ST.eq)}</td><td class="mono">${tvRc(tvActReach())}</td>`:'')+`</tr></tbody>`;
  tb.innerHTML=h;
  const n=$('tvwFlightNote');
  if(n)n.textContent=hasAct?L('주차 칸 = 실적 / 계획 횟수','week cells = actual / planned spots'):L('주차 칸 = 큐시트 계획 횟수','week cells = planned spots (cue sheet)');
  const f=$('tvwFlightFoot');
  if(f)f.textContent=(hasAct?'':L('리포트에 품목 × 주차 실적이 없어 주차 칸은 계획(큐시트) 횟수입니다. ','The report has no actuals by group × week, so week cells show planned spots. '))
    +(showSegAct?L('오른쪽 실적은 기간 누적(구분별 계획 · 실적 표)이고, TOTAL Reach 는 전체(중복 제거) 값입니다.','Actuals on the right are to-date totals; TOTAL reach is de-duplicated.'):'');}

/* ---------- TV 주차별 퍼포먼스 (v135 → v136) ---------- */
function renderTvWeekly(){
  const tb=$('tvWeekTbl');if(!tb)return;
  tvPaintTarget();
  const weeks=tvwWeekList(),A=weeks.map(o=>tvwWeekAgg(o));
  const act=weeks.map((o,i)=>({o,a:A[i]})).filter(x=>x.o.act);
  const n=act.length;
  const T=(()=>{const s=k=>{const xs=act.map(x=>x.a[k]).filter(isFinite);return xs.length?sum(xs):NaN;};
    const t={cost:s('cost'),eq:s('eq'),grp:s('grp'),cnt:s('cnt'),nlsn:s('nlsn'),bonus:s('bonus')};
    t.cprp=tvwDiv(t.cost,isFinite(t.eq)?t.eq:t.grp);t.brate=tvwDiv(t.bonus,t.cost);return t;})();
  const P=tvwPlan();
  const fb=$('tvwFlowBox');if(fb)fb.classList.toggle('hidden',!n);
  try{tvwHeat(weeks);}catch(e){console.warn(e);}
  try{tvwFlight(weeks);}catch(e){console.warn(e);}
  try{tvwRating(weeks);}catch(e){console.warn(e);}
  {const d=$('tvwDuo'),h=$('tvwHeatCol'),r=$('tvwFlowBox');
    if(d)d.classList.toggle('hidden',(!h||h.classList.contains('hidden'))&&(!r||r.classList.contains('hidden')));
    if(d)d.classList.toggle('one',!!(h&&r)&&(h.classList.contains('hidden')!==r.classList.contains('hidden')));}
  try{if(n)tvwFlow(weeks,A);}catch(e){console.warn(e);}
  /* ---- 주차별 상세 표 ---- */
  let cg=0,cc=0,ce=0;
  const ws=act.map((x,i)=>{const a=x.a,o=x.o;cg+=num0(a.grp);cc+=num0(a.cost);ce+=num0(a.eq);
    return {i,wk:o.wk,s:o.s,e:o.e,cnt:a.cnt,cost:a.cost,grp:a.grp,eq:a.eq,nlsn:a.nlsn,bonus:a.bonus,brate:a.brate,cprp:a.cprp,
      reach:a.reach,reach3:a.reach3,cumgrp:isFinite(a.cumgrp)?a.cumgrp:(cg||NaN),cumreach:a.cumreach,cumcost:cc||NaN,cumeq:ce||NaN,
      burn:tvwDiv(cc,P.amt)};});
  const has=k=>ws.some(r=>isFinite(r[k])&&r[k]);
  const allReach=tvActReach(),allR3=tvHas(TV_META.reach3)?tvNum(TV_META.reach3):NaN;
  const per=r=>r.s?`${mdy(r.s)}~${r.e?mdy(r.e):''}`:'–';
  const C=[['wk','주차'],['per','기간']]
    .concat(has('cnt')?[['spots','횟수']]:[],has('cost')?[['cost','집행 광고비']]:[],has('grp')?[['grp','GRP']]:[],has('eq')?[['eq','eq.GRP']]:[],
      has('cprp')?[['cprp',has('eq')?'eq.CPRP':'CPRP']]:[],has('nlsn')?[['nlsn','닐슨 금액']]:[],has('bonus')?[['bonus','보너스 금액']]:[],has('brate')?[['brate','보너스율']]:[],
      (has('reach')||isFinite(allReach))?[['reach','Reach 1+']]:[],(has('reach3')||isFinite(allR3))?[['reach3','Reach 3+']]:[],
      has('cost')?[['cumcost','누적 광고비']]:[],has('cost')&&isFinite(P.amt)?[['burn','누적 소진율']]:[],
      has('eq')?[['cumeq','누적 eq.GRP']]:[],has('grp')?[['cumgrp','누적 GRP']]:[],has('cumreach')?[['cumreach','누적 Reach 1+']]:[]);
  const srt=HP_SORT['tvweekly'];const rows=ws.slice();
  if(srt&&srt.dir){const f=srt.k==='wk'?(r=>r.i):srt.k==='per'?(r=>r.s||r.i):srt.k==='spots'?(r=>r.cnt):(r=>r[srt.k]);
    rows.sort((a,b)=>hpCmp(f(a),f(b),srt.dir));}
  const L0=ws[n-1]||{};
  const tot={wk:'TOTAL',cnt:T.cnt,cost:T.cost,grp:T.grp,eq:T.eq,cprp:T.cprp,nlsn:T.nlsn,bonus:T.bonus,brate:T.brate,reach:allReach,reach3:allR3,
    cumcost:L0.cumcost,burn:L0.burn,cumeq:L0.cumeq,cumgrp:L0.cumgrp,cumreach:allReach};
  const K=new Set(['cost','cprp','nlsn','bonus','cumcost']);
  const cell=(k,r,isT)=>{
    if(k==='wk')return `<td class="head">${esc(isT?'TOTAL':r.wk)}</td>`;
    if(k==='per')return `<td class="mono">${isT?'':per(r)}</td>`;
    const v=k==='spots'?r.cnt:r[k];
    if(k==='spots')return `<td class="mono">${isFinite(v)&&v?fmt(v):'–'}</td>`;
    if(K.has(k))return `<td class="mono">${tvKw(v)}</td>`;
    if(k==='brate')return `<td class="mono">${tvwBr(v)}</td>`;
    if(k==='burn')return `<td class="mono">${tvwPct(v)}</td>`;
    if(k==='reach'||k==='reach3'||k==='cumreach')return `<td class="mono">${tvRc(v)}</td>`;
    return `<td class="mono">${tvG(v)}</td>`;};
  const lbl=(k,l)=>L(l,{wk:'Week',per:'Period',spots:'Spots',cost:'Spend',nlsn:'Nielsen value',bonus:'Bonus value',brate:'Bonus rate',cumcost:'Cum. spend',burn:'Cum. burn',cumeq:'Cum. eq.GRP',cumgrp:'Cum. GRP',cumreach:'Cum. Reach 1+'}[k]||l);
  let h='<thead><tr>'+C.map(([k,l],i)=>`<th${i>=2?' class="num"':''}>${lbl(k,l)}${K.has(k)?` <span class="tvunit">(${L('천원','K')})</span>`:''}</th>`).join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{h+='<tr>'+C.map(([k])=>cell(k,r,false)).join('')+'</tr>';});
  if(n)h+='<tr class="total">'+C.map(([k])=>cell(k,tot,true)).join('')+'</tr>';
  else h+=`<tr><td colspan="${C.length}" class="hint" style="padding:22px;text-align:center">${L('주차별 실적이 아직 없습니다.','No weekly results yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  const ths=[...tb.tHead.rows[0].cells];
  wireHeadPops(C.map(([k,l],i)=>({th:ths[i],k,label:l})),{cur:srt,scope:'tv',
    onSort:(k,d)=>{if(d)HP_SORT['tvweekly']={k,dir:d};else delete HP_SORT['tvweekly'];renderTvWeekly();}});
  const nt=$('tvWeeklyNote');
  if(nt){const ss=ws.map(r=>r.s).filter(Boolean).sort(),ee=ws.map(r=>r.e).filter(Boolean).sort();
    nt.textContent=n?(ss.length?`${mdy(ss[0])}~${mdy(ee.length?ee[ee.length-1]:ss[ss.length-1])} · `:'')+`${fmt(n)}${L('주','wk')}`:'';}
  const rn=$('tvWeeklyReachNote');
  if(rn)rn.textContent=[n>1&&isFinite(allReach)?L('TOTAL 의 Reach 는 주차 합이 아니라 중복을 뺀 전체 값입니다.','TOTAL reach is the de-duplicated overall value, not the sum of weeks.'):'',
    has('brate')?L('보너스율 = 보너스 금액 ÷ 집행 광고비 · CPRP = 집행 광고비 ÷ eq.GRP(없으면 GRP).','Bonus rate = bonus ÷ spend · CPRP = spend ÷ eq.GRP (or GRP).'):''].filter(Boolean).join(' ');
  /* 그래프 고르기 */
  const fill=(id,o,cur,set)=>{const s=$(id);if(!s)return;
    const keys=Object.keys(o).filter(k=>id!=='tvwLineSel'||k==='none'||k!=='rtidx'||TV_WKRT.length);
    s.innerHTML=keys.map(k=>`<option value="${k}"${k===cur?' selected':''}>${esc(o[k].l)}</option>`).join('');
    s.onchange=()=>{set(s.value);renderTvWeekly();};};
  fill('tvwBarSel',TV_WKCH.length?TVW_BARS:{eqgrp:TVW_BARS.eqgrp,cost:TVW_BARS.cost,grp:TVW_BARS.grp},TVW_BAR,v=>TVW_BAR=v);
  fill('tvwLineSel',TVW_LINES,TVW_LINE,v=>TVW_LINE=v);
  fill('tvwHeatSel',{eqgrp:{l:'eq.GRP'},cost:{l:L('집행 광고비','Spend')},cprp:{l:'CPRP'},brate:{l:L('보너스율','Bonus rate')}},TVW_HEAT,v=>TVW_HEAT=v);
  tvEmptyNote('tvWeeklyEmpty',!n&&!weeks.length,
    'TV 주차별 실적이 아직 없습니다. <b>TV › 데이터 입력</b>의 주차별 퍼포먼스에 주차 · 기간 · 횟수 · GRP · Reach 1+ 를 넣으면 여기에 모입니다.',
    'No weekly TV results yet. Enter week · period · spots · GRP · Reach 1+ in the weekly table of <b>TV › Data input</b>.');
}
/* =====================================================================
   v137 — 품목(구분) 분석 (TV 서머리)
   · TV_SEGCH : 구분 × 채널(방송사 묶음) — 횟수 · GRP · eq.GRP · Reach 1+/3+ (리포트 '당월_품목별 세부'의 품목 '계' 블록)
   · TV_SEGCR : 구분 × 소재 — 온에어일 · 월 예산 · 횟수 · GRP · eq.GRP · Reach · 온에어 이후 누적
   서머리: 현황 카드 아래 보조 카드(eq.GRP · eq.CPRP · 보너스율 · Reach 3+) → 품목별 성과 카드 → 품목 × 방송사 → 품목 › 소재 → 품목별 계획 대비 실적 표
   ===================================================================== */
const TV_SEGCH_COLS=[
  {k:'seg',l:'구분',type:'text',w:120},{k:'ch',l:'채널',type:'text',w:110},
  {k:'cnt',l:'횟수',type:'num',w:76},{k:'grp',l:'GRP',type:'dec',w:84},{k:'eqgrp',l:'eq.GRP',type:'dec',w:90},
  {k:'reach',l:'Reach 1+(%)',type:'pct',w:100},{k:'reach3',l:'Reach 3+(%)',type:'pct',w:100},{k:'note',l:'비고',type:'text',w:150}];
const TV_SEGCR_COLS=[
  {k:'seg',l:'구분',type:'text',w:120},{k:'cr',l:'소재',type:'text',w:130},{k:'onair',l:'온에어',type:'date',w:112},
  {k:'amt',l:'월 예산',type:'num',unit:'k',w:110},
  {k:'cnt',l:'횟수',type:'num',w:76},{k:'grp',l:'GRP',type:'dec',w:84},{k:'eqgrp',l:'eq.GRP',type:'dec',w:90},
  {k:'reach',l:'Reach 1+(%)',type:'pct',w:100},{k:'reach3',l:'Reach 3+(%)',type:'pct',w:100},
  {k:'cumgrp',l:'누적 GRP',type:'dec',w:96},{k:'cumeq',l:'누적 eq.GRP',type:'dec',w:104},
  {k:'cumreach',l:'누적 Reach 1+(%)',type:'pct',w:124},{k:'cumreach3',l:'누적 Reach 3+(%)',type:'pct',w:124},{k:'note',l:'비고',type:'text',w:150}];
TV_TBL.segch={id:'tvSegChInTbl',name:'TV 구분 × 채널',base:TV_SEGCH_COLS,get cols(){return tblCols('segch');},
  rows:()=>TV_SEGCH,set:v=>{TV_SEGCH=v;},calc:()=>({}),total:rs=>tvwSum(rs||TV_SEGCH,['cnt','grp','eqgrp']),foot:tvwFootNum,
  blank:()=>({seg:'',ch:'',cnt:'',grp:'',eqgrp:'',reach:'',reach3:'',note:''}),note:'tvSegChInNote',changed:()=>tvChanged()};
TV_TBL.segcr={id:'tvSegCrInTbl',name:'TV 구분 × 소재',base:TV_SEGCR_COLS,get cols(){return tblCols('segcr');},
  rows:()=>TV_SEGCR,set:v=>{TV_SEGCR=v;},calc:()=>({}),total:rs=>tvwSum(rs||TV_SEGCR,['amt','cnt','grp','eqgrp']),foot:tvwFootNum,
  blank:()=>({seg:'',cr:'',onair:'',amt:'',cnt:'',grp:'',eqgrp:'',reach:'',reach3:'',cumgrp:'',cumeq:'',cumreach:'',cumreach3:'',note:''}),note:'tvSegCrInNote',changed:()=>tvChanged()};
TBL_FIXED.segch=['seg','ch'];TBL_FIXED.segcr=['seg','cr'];
let TVS_CH='eqgrp';
const tvsTrim=v=>String(v==null?'':v).trim();
const tvsChList=()=>{const o=[];TV_SEGCH.forEach(r=>{const c=tvsTrim(r.ch);if(c&&!o.includes(c))o.push(c);});return o;};
const tvsV=(r,k)=>r&&tvHas(r[k])?tvNum(r[k]):NaN;

function tvwSummary(P,A){
  /* 1) 보조 카드 — 주차 추이가 있으면 카드 배경에 */
  const weeks=tvwWeekList(),WA=weeks.map(o=>tvwWeekAgg(o)),act=weeks.map((o,i)=>({o,a:WA[i]})).filter(x=>x.o.act);
  const sm=k=>{const xs=act.map(x=>x.a[k]).filter(isFinite);return xs.length?sum(xs):NaN;};
  const SG=tvSegTotal(tvSegRows());
  const T={cost:isFinite(A&&A.cost)&&A.cost?A.cost:sm('cost'),eq:sm('eq'),grp:sm('grp'),nlsn:sm('nlsn'),bonus:sm('bonus')};
  if(!isFinite(T.eq)&&SG.eq)T.eq=SG.eq;
  T.cprp=tvwDiv(T.cost,isFinite(T.eq)?T.eq:(A&&A.grp));T.brate=tvwDiv(T.bonus,T.cost);
  try{tvwCards(weeks,act.map(x=>x.a),T,tvwPlan());}catch(e){console.warn(e);}
  /* 2) 품목 */
  try{tvsCards();}catch(e){console.warn(e);}
  try{tvsChHeat();}catch(e){console.warn(e);}
  try{tvsCrTbl();}catch(e){console.warn(e);}
}
/* 품목별 성과 카드 */
function tvsCards(){
  const box=$('tvSegCards');if(!box)return;
  const rows=tvSegRows();box.classList.toggle('hidden',!rows.length);if(!rows.length){box.innerHTML='';return;}
  const T=tvSegTotal(rows),useEq=rows.some(r=>tvHas(r.eq)),kA=useEq?'eq':'grp',kP=useEq?'peq':'pgrp',ML=useEq?'eq.GRP':'GRP';
  const chs=tvsChList(),pal=pickRamp(Math.max(chs.length,1));
  const totA=sum(rows.map(r=>tvNum(r[kA]))),totB=sum(rows.map(r=>tvNum(r.amt)));
  const pc=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
  box.innerHTML=rows.map(r=>{const seg=tvsTrim(r.seg),a=tvsV(r,kA),p=tvsV(r,kP),ach=tvwDiv(a,p);
    const r1=tvsV(r,'reach'),p1=tvsV(r,'preach'),r3=tvsV(r,'reach3'),p3=tvsV(r,'preach3'),c=tvsV(r,'cnt'),pcn=tvsV(r,'pcnt');
    const bS=tvwDiv(tvNum(r.amt),totB),gS=tvwDiv(a,totA);
    const cmp=(v,pv,f)=>`<b class="mono">${f(v)}</b>${isFinite(pv)?`<em>${L('계획','plan')} ${f(pv)}${isFinite(v)?` <i class="${v>=pv?'up':'dn'}">${v>=pv?'▲':'▼'}</i>`:''}</em>`:''}`;
    /* 방송사 구성 */
    const chr=TV_SEGCH.filter(x=>tvsTrim(x.seg)===seg);
    const chv=chs.map(ch=>sum(chr.filter(x=>tvsTrim(x.ch)===ch).map(x=>tvNum(x.eqgrp||x.grp))));
    const cht=sum(chv);
    const top=chs.map((ch,i)=>({ch,v:chv[i]})).filter(x=>x.v>0).sort((x,y)=>y.v-x.v).slice(0,2);
    const mix=cht?`<div class="tvsmix"><div class="lb">${L('방송사 구성','Network mix')} <span>${top.map(x=>`${esc(x.ch)} ${Math.round(x.v/cht*100)}%`).join(' · ')}</span></div>
      <div class="sbar">${chs.map((ch,i)=>chv[i]>0?`<i style="width:${(chv[i]/cht*100).toFixed(2)}%;background:${pal[i]}" title="${esc(ch)} ${Math.round(chv[i]/cht*100)}%"></i>`:'').join('')}</div></div>`:'';
    /* 소재 */
    const crs=TV_SEGCR.filter(x=>tvsTrim(x.seg)===seg);const crt=sum(crs.map(x=>tvNum(x.eqgrp||x.grp)));
    const cs=crs.length?`<div class="tvscr"><div class="lb">${L('소재','Creatives')} ${crs.length}${L('개','')}</div>`+crs.map(x=>{const v=tvNum(x.eqgrp||x.grp),sh=crt?v/crt:0;
        const nw=tvIsoOk(x.onair)&&campStart&&String(x.onair)>=String(campStart()||'').slice(0,10);
        return `<div class="cr"><span class="nm">${esc(tvsTrim(x.cr))}${nw?` <u>${L('신규','new')}</u>`:''}</span><span class="bar"><i style="width:${(sh*100).toFixed(1)}%"></i></span><b class="mono">${tvwG2(v)}</b><em class="mono">${Math.round(sh*100)}%</em></div>`;}).join('')+'</div>':'';
    return `<div class="card tvsc"><div class="hd"><b>${esc(seg)}</b>${isFinite(ach)?`<span class="ach ${ach>=1?'ok':''}">${ML} ${L('달성','achv.')} ${pc(ach)}</span>`:''}</div>
      <div class="big"><b class="mono">${tvwG2(a)}</b><span>${isFinite(p)?`/ ${L('계획','plan')} ${tvwG2(p)}`:''} ${ML}</span></div>
      <div class="gbar"><i style="width:${Math.min(isFinite(ach)?ach:0,1.2)/1.2*100}%"></i><s style="left:${100/1.2}%"></s></div>
      <div class="kv"><div><span>Reach 1+</span>${cmp(r1,p1,tvRc)}</div><div><span>Reach 3+</span>${cmp(r3,p3,tvRc)}</div><div><span>${L('횟수','Spots')}</span>${cmp(c,pcn,v=>isFinite(v)?fmt(v):'–')}</div></div>
      <div class="tvsshare"><div class="lb">${L('예산 비중','Budget share')}<b class="mono">${pc(bS)}</b></div><div class="b"><i style="width:${(num0(bS)*100).toFixed(1)}%"></i></div>
        <div class="lb">${ML} ${L('비중','share')}<b class="mono">${pc(gS)}</b></div><div class="b g"><i style="width:${(num0(gS)*100).toFixed(1)}%"></i></div></div>
      ${mix}${cs}</div>`;}).join('');
  const lg=$('tvSegCardsLg');
  if(lg)lg.innerHTML=chs.length?chs.map((ch,i)=>`<span class="it"><span class="dot" style="background:${pal[i]}"></span>${esc(ch)}</span>`).join('')
    +`<span class="it hint">${L('예산 비중보다 '+ML+' 비중이 크면 예산 대비 노출을 더 가져간 품목입니다 · 품목별 Reach 는 품목 단독 값','Higher '+ML+' share than budget share = more delivery per budget')}</span>`:'';}
/* 품목 × 방송사 */
function tvsChHeat(){
  const box=$('tvSegChBox'),host=$('tvSegCh');if(!box||!host)return;
  const chs=tvsChList(),segs=[];tvSegRows().forEach(r=>{const s=tvsTrim(r.seg);if(!segs.includes(s))segs.push(s);});
  TV_SEGCH.forEach(r=>{const s=tvsTrim(r.seg);if(s&&!segs.includes(s))segs.push(s);});
  const on=chs.length&&segs.length;box.classList.toggle('hidden',!on);if(!on){host.innerHTML='';return;}
  const sel=$('tvSegChSel');
  if(sel){sel.innerHTML=[['eqgrp','eq.GRP · '+L('품목 내 비중','share in group')],['chshare',L('방송사 안 품목 비중','share in network')],['reach','Reach 1+'],['cnt',L('횟수','Spots')]]
      .map(([k,l])=>`<option value="${k}"${k===TVS_CH?' selected':''}>${l}</option>`).join('');sel.onchange=()=>{TVS_CH=sel.value;tvsChHeat();};}
  const m=TVS_CH,g=(s,c,k)=>{const rs=TV_SEGCH.filter(x=>tvsTrim(x.seg)===s&&tvsTrim(x.ch)===c);return rs.length&&rs.some(x=>tvHas(x[k]))?sum(rs.map(x=>tvNum(x[k]))):NaN;};
  const eqK=TV_SEGCH.some(x=>tvHas(x.eqgrp))?'eqgrp':'grp';
  const rowT=segs.map(s=>sum(chs.map(c=>num0(g(s,c,eqK))))),colT=chs.map(c=>sum(segs.map(s=>num0(g(s,c,eqK)))));
  const segRow=new Map(tvSegRows().map(r=>[tvsTrim(r.seg),r]));
  const cell=(si,ci)=>{const s=segs[si],c=chs[ci];
    if(m==='reach'){const v=g(s,c,'reach');return {v,t:tvRc(v),sub:''};}
    if(m==='cnt'){const v=g(s,c,'cnt');return {v,t:isFinite(v)?fmt(v):'–',sub:''};}
    const v=g(s,c,eqK);
    if(m==='chshare'){const sh=tvwDiv(v,colT[ci]);return {v:sh,t:isFinite(sh)?(sh*100).toFixed(0)+'%':'–',sub:isFinite(v)?tvwG2(v):''};}
    const sh=tvwDiv(v,rowT[si]);return {v:sh,t:tvwG2(v),sub:isFinite(sh)?(sh*100).toFixed(0)+'%':''};};
  const G=segs.map((s,si)=>chs.map((c,ci)=>cell(si,ci)));
  const all=[].concat(...G).map(x=>x.v).filter(isFinite),lo=Math.min(...all),hi=Math.max(...all);
  const a=v=>!isFinite(v)?0:hi===lo?.3:(v-lo)/(hi-lo)*.78+.06;
  const tot=(s)=>{const r=segRow.get(s);
    if(m==='reach')return tvRc(tvsV(r,'reach'));if(m==='cnt')return fmt(sum(chs.map(c=>num0(g(s,c,'cnt')))));
    if(m==='chshare')return tvwG2(rowT[segs.indexOf(s)]);return tvwG2(rowT[segs.indexOf(s)]);};
  let h=`<table class="tbl lite tvwheat"><thead><tr><th>${L('구분','Group')}</th>`+chs.map(c=>`<th>${esc(c)}</th>`).join('')+`<th class="gsep">${L('계','Total')}</th></tr></thead><tbody>`;
  segs.forEach((s,si)=>{h+=`<tr><td class="head">${esc(s)}</td>`+G[si].map(x=>`<td class="hcell" style="--a:${a(x.v).toFixed(3)}"><b class="mono">${x.t}</b>${x.sub?`<span class="mono">${x.sub}</span>`:''}</td>`).join('')
    +`<td class="mono gsep tot">${tot(s)}</td></tr>`;});
  if(m!=='reach')h+=`<tr class="total"><td class="head">TOTAL</td>`+chs.map((c,ci)=>`<td class="mono">${m==='cnt'?fmt(sum(segs.map(s=>num0(g(s,c,'cnt'))))):m==='chshare'?'100%':tvwG2(colT[ci])}</td>`).join('')
    +`<td class="mono gsep">${m==='cnt'?fmt(sum(segs.map(s=>sum(chs.map(c=>num0(g(s,c,'cnt'))))))):tvwG2(sum(rowT))}</td></tr>`;
  host.innerHTML=`<div class="tbl-wrap noy">${h}</tbody></table></div>`;
  const n=$('tvSegChNote');
  if(n)n.textContent=m==='chshare'?L('세로 합 100% — 그 방송사 물량을 어느 품목이 썼나','columns sum to 100%'):m==='reach'?L('품목 × 방송사 단독 Reach (기타는 여러 PP 라 없음)','Reach by group × network'):m==='cnt'?L('집행 횟수','Spots'):L('칸 아래 = 그 품목 안 비중 · 진할수록 비중 큼','sub = share within the group');}
/* 품목 › 소재 */
function tvsCrTbl(){
  const box=$('tvSegCrBox'),tb=$('tvSegCrTbl');if(!box||!tb)return;
  const rows=TV_SEGCR.filter(r=>tvsTrim(r.seg)&&tvsTrim(r.cr));box.classList.toggle('hidden',!rows.length);if(!rows.length){tb.innerHTML='';return;}
  const segs=[];tvSegRows().forEach(r=>{const s=tvsTrim(r.seg);if(rows.some(x=>tvsTrim(x.seg)===s)&&!segs.includes(s))segs.push(s);});
  rows.forEach(r=>{const s=tvsTrim(r.seg);if(!segs.includes(s))segs.push(s);});
  const has=k=>rows.some(r=>tvHas(r[k]));
  const C=[['onair',L('온에어','On-air')]].filter(()=>has('onair'))
    .concat(has('amt')?[['amt',L('월 예산','Budget')]]:[],has('cnt')?[['cnt',L('횟수','Spots')]]:[],has('grp')?[['grp','GRP']]:[],has('eqgrp')?[['eqgrp','eq.GRP']]:[],
      [['share',L('품목 내 비중','Share')]],has('reach')?[['reach','Reach 1+']]:[],has('reach3')?[['reach3','Reach 3+']]:[]);
  const C2=[].concat(has('cumgrp')?[['cumgrp','GRP']]:[],has('cumeq')?[['cumeq','eq.GRP']]:[],has('cumreach')?[['cumreach','Reach 1+']]:[],has('cumreach3')?[['cumreach3','Reach 3+']]:[]);
  const segRow=new Map(tvSegRows().map(r=>[tvsTrim(r.seg),r]));
  const f=(k,v)=>!isFinite(v)?'–':k==='amt'?fmt(Math.round(v/1000)):k==='cnt'?fmt(v):/reach/.test(k)?tvRc(v):tvG(v);
  let h=`<thead><tr><th rowspan="2">${L('구분','Group')}</th><th rowspan="2">${L('소재','Creative')}</th><th colspan="${C.length}">${L('당월','This month')}${has('amt')?` <span class="tvunit">(${L('예산 천원','budget K KRW')})</span>`:''}</th>`
    +(C2.length?`<th colspan="${C2.length}" class="gsep">${L('온에어 이후 누적','Since on-air')}</th>`:'')+`</tr><tr>`
    +C.map(([k,l])=>`<th>${l}</th>`).join('')+C2.map(([k,l],i)=>`<th${i?'':' class="gsep"'}>${l}</th>`).join('')+`</tr></thead><tbody>`;
  segs.forEach(s=>{const rs=rows.filter(r=>tvsTrim(r.seg)===s),tt=sum(rs.map(r=>tvNum(r.eqgrp||r.grp)));
    rs.forEach((r,i)=>{const sh=tvwDiv(tvNum(r.eqgrp||r.grp),tt);
      const nw=tvIsoOk(r.onair)&&String(r.onair)>=String(campStart()||'').slice(0,10);
      h+=`<tr>${i?'':`<td class="head" rowspan="${rs.length+(rs.length>1?1:0)}">${esc(s)}</td>`}<td class="head l">${esc(tvsTrim(r.cr))}${nw?` <span class="tvnew">${L('신규','new')}</span>`:''}</td>`
        +C.map(([k])=>k==='onair'?`<td class="mono">${tvIsoOk(r.onair)?mdy(r.onair):esc(tvsTrim(r.onair))||'–'}</td>`
          :k==='share'?`<td class="shc"><span class="bar"><i style="width:${(num0(sh)*100).toFixed(1)}%"></i></span><b class="mono">${isFinite(sh)?Math.round(sh*100)+'%':'–'}</b></td>`
          :`<td class="mono">${f(k,tvsV(r,k))}</td>`).join('')
        +C2.map(([k],j)=>`<td class="mono${j?'':' gsep'}">${f(k,tvsV(r,k))}</td>`).join('')+`</tr>`;});
    if(rs.length>1){const sr=segRow.get(s);const sumk=k=>{const xs=rs.map(r=>tvsV(r,k)).filter(isFinite);return xs.length?sum(xs):NaN;};
      h+=`<tr class="subt"><td class="head l">${L('소계','Subtotal')}</td>`+C.map(([k])=>k==='onair'?'<td></td>':k==='share'?`<td class="mono">100%</td>`
        :/reach/.test(k)?`<td class="mono">${f(k,sr?tvsV(sr,k):NaN)}</td>`:`<td class="mono">${f(k,sumk(k))}</td>`).join('')
        +C2.map(([k],j)=>`<td class="mono${j?'':' gsep'}">${/reach/.test(k)?'–':f(k,sumk(k))}</td>`).join('')+`</tr>`;}});
  tb.innerHTML=h+'</tbody>';
  const n=$('tvSegCrFoot');
  if(n)n.textContent=L('소계의 Reach 는 품목 전체(중복 제거) 값이고, 누적 Reach 는 소재끼리 더하지 않습니다. 신규 = 이번 캠페인 기간에 온에어한 소재.','Subtotal reach is the de-duplicated group reach; cumulative reach is not summed. New = launched in this campaign.');}

/* 창 크기가 바뀌면 그래프 폭을 다시 */
(function(){let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{try{const e=$('tab-tvweekly');if(e&&!e.classList.contains('hidden'))renderTvWeekly();}catch(err){}},180);});})();
/* 입력 화면 연결 */
(function(){const go=()=>{
  const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
  ['wkch','wkrt','wkseg','segch','segcr'].forEach(k=>{const n={wkch:'WkCh',wkrt:'WkRt',wkseg:'WkSeg',segch:'SegCh',segcr:'SegCr'}[k];
    on(`tv${n}Add`,()=>tvAddRow(k));on(`tv${n}Up`,()=>tvImport(k));on(`tv${n}Wipe`,()=>tvWipe(k));
    try{renderTvTable(k);}catch(e){console.warn(e);}});};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);})();
