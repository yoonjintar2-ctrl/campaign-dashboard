/* ===== 5. 일자별 효율 콤보 차트 ===== */
/* 막대그래프로 고를 수 있는 값. 소진금액은 v62 에서 뺐다 —
   이제 막대 뒤에 깔리는 영역 그래프가 일별 소진금액을 대신 보여 준다. */
const BAR_METRICS=['imp','click','view','eng','conv'];
const LINE_METRICS=['ctr','vtr','cvr','cpv','cpc','cpa','roas','none'];
const SERIES_DIMS=[{k:'media',l:'매체'},{k:'segment',l:'구분'},{k:'product',l:'상품'},
  {k:'target',l:'타겟팅'},{k:'line',l:'제품'},{k:'creative',l:'소재'}];
let SERIES_DIM='media';
/* 막대·꺾은선으로 고른 값. 화면의 select 가 아니라 여기가 기준이다 —
   그래야 저장본에 실려 새로고침 뒤에도 그대로 돌아온다 (v65). */
let BAR_METRIC='imp', LINE_METRIC='ctr';
let ISSUE_OVERFLOW=0;
/* 일자별 효율 비교의 계열 순서 — 기본은 예산 큰 순, 범례를 끌어서 바꿀 수 있다 */
let DAILY_ORDER={};
let SHOW_FORECAST=true, SHOW_BENCH=true;
let LINE_TONE='#2f5d6b';   /* 일자별 효율 비교 꺾은선 — 테마 강조색 */
/* SVG 글자 폭 어림 — getComputedTextLength() 가 0 을 돌려줄 때만 쓴다 */
function estTextW(s,size){
  let w=0;
  for(const ch of String(s))
    w+=/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)?1.00:(/[0-9.,%]/.test(ch)?0.53:/[A-Z]/.test(ch)?0.66:0.52);
  return w*size;
}
function roundRect(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h));
  return `M${x} ${y+h} L${x} ${y+r} Q${x} ${y} ${x+r} ${y} L${x+w-r} ${y} Q${x+w} ${y} ${x+w} ${y+r} L${x+w} ${y+h} Z`;}
/* 막대 색 계열 — 테마의 b1~b5 를 그대로 쓴다 */
function pickRamp(n){
  const base=[cssVar('--b1')||'#aab4bf',cssVar('--b2')||'#8897a6',cssVar('--b3')||'#677b8d',
              cssVar('--b4')||'#495e72',cssVar('--b5')||'#354758'];
  if(n<=1)return [cssVar('--b4')||'#495e72'];
  const out=[];for(let i=0;i<n;i++)out.push(base[Math.round(i*(base.length-1)/(n-1))]);
  return out.reverse();
}
/* 축 눈금을 1·2·2.5·5·10 배수의 "보기 좋은" 큰 단위로 */
function niceStep(range,target){
  const raw=range/Math.max(target,1);
  const mag=Math.pow(10,Math.floor(Math.log10(raw||1)));
  const n=raw/mag;
  const m=n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10;
  return m*mag;
}
/* [lo,hi]를 덮는 보기 좋은 눈금 배열 (0 포함 축이면 0에서 시작) */
function niceTicks(lo,hi,target,fromZero){
  if(!isFinite(lo)||!isFinite(hi)||hi<=lo)return {lo:lo||0,hi:(hi||1),ticks:[lo||0,hi||1]};
  const step=niceStep(hi-(fromZero?0:lo),target);
  const t0=fromZero?0:Math.floor(lo/step)*step;
  const t1=Math.ceil(hi/step)*step;
  const ticks=[];for(let v=t0;v<=t1+step*1e-6;v+=step)ticks.push(+v.toFixed(10));
  return {lo:t0,hi:t1,ticks};
}
function smoothPath(pts){
  if(pts.length<2)return '';
  let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    d+=` C${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6} ${p2[0]} ${p2[1]}`;}
  return d;
}
/* 범례를 끌어 계열 순서 바꾸기 */
function wireDailyLegendDrag(lg,keys){
  let from=null;
  const clear=()=>lg.querySelectorAll('.it').forEach(x=>x.classList.remove('dragging','dropL','dropR'));
  lg.querySelectorAll('.it.drag').forEach(el2=>{
    el2.addEventListener('dragstart',e=>{from=el2.dataset.k;el2.classList.add('dragging');
      try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',from);}catch(x){}});
    el2.addEventListener('dragend',()=>{from=null;clear();});
    el2.addEventListener('dragover',e=>{
      if(from===null||from===el2.dataset.k)return;
      e.preventDefault();
      const r=el2.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
      el2.classList.toggle('dropR',after);el2.classList.toggle('dropL',!after);});
    el2.addEventListener('dragleave',()=>el2.classList.remove('dropL','dropR'));
    el2.addEventListener('drop',e=>{
      if(from===null||from===el2.dataset.k)return;
      e.preventDefault();
      const r=el2.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
      const list=keys.slice();
      const a=list.indexOf(from);if(a>=0)list.splice(a,1);
      let b2=list.indexOf(el2.dataset.k);if(b2<0)b2=list.length;
      list.splice(after?b2+1:b2,0,from);
      DAILY_ORDER[SERIES_DIM]=list;
      clear();from=null;renderDaily();
      try{markDirty();saveLocal();}catch(x){}});});
}
/* ---------- 일자별 효율 비교 — 그래프 전용 필터 (v54) ----------
   위쪽 조회 필터와 별개로, **이 그래프만** 특정 구분 · 매체 · 광고상품으로 좁혀 본다.
   빈 문자열 = 전체. 문서(views.dailyFilt)에 저장된다. */
const DAILY_FILT_DIMS=[{k:'segment',l:'구분'},{k:'media',l:'매체'},{k:'product',l:'광고상품'}];
let DAILY_FILT={segment:'',media:'',product:''};
const dailyFiltOn=()=>DAILY_FILT_DIMS.filter(d=>DAILY_FILT[d.k]).length;
const dailyPass=o=>DAILY_FILT_DIMS.every(d=>!DAILY_FILT[d.k]||o[d.k]===DAILY_FILT[d.k]);
/* 그래프에 쓰이는 라인도 같은 기준으로 좁힌다 — 예상값·예상 효율선이 따로 놀지 않게 */
const dailyLines=()=>activeLines().filter(dailyPass);
function paintDailyFiltBtn(){
  const b=$('dailyFiltBtn');if(!b)return;
  const n=dailyFiltOn();
  b.classList.toggle('on',!!n);
  b.textContent=n?'▼ 필터 '+n:'▼ 필터';
  b.title=n
    ? DAILY_FILT_DIMS.filter(d=>DAILY_FILT[d.k]).map(d=>`${d.l} ${DAILY_FILT[d.k]}`).join(' · ')
      +' — 이 그래프에만 적용됩니다'
    : '특정 구분 · 매체 · 광고상품만 그래프에 표시합니다';
}
/* 값 목록은 **지금 조회 기간에 실제로 있는 것**에서 뽑는다 (없는 값을 고르게 두지 않는다) */
function dailyFiltVals(k){
  const src=factFilter();
  return [...new Set(src.map(f=>f[k]).filter(v=>v!==undefined&&v!==null&&v!==''))]
    .sort((a,b)=>String(a).localeCompare(String(b),'ko',{numeric:true}));
}
function openDailyFilt(btn){
  if(typeof closeTblMenu==='function')closeTblMenu();
  document.querySelectorAll('.thpop').forEach(p=>p.remove());
  const draft={...DAILY_FILT};
  const pop=document.createElement('div');
  pop.className='thpop dfiltpop';
  pop.innerHTML=`<div class="thttl">이 그래프만 좁혀 보기</div>
    <div class="hint" style="padding:0 6px 8px;line-height:1.45">위쪽 조회 기간·필터는 그대로 두고
      <b>일자별 캠페인 효율 비교</b> 그래프에만 적용됩니다.</div>`
    +DAILY_FILT_DIMS.map(d=>{
      const vals=dailyFiltVals(d.k);
      return `<label class="dfrow"><span>${d.l}</span>
        <select data-dk="${d.k}">
          <option value="">전체</option>
          ${vals.map(v=>`<option value="${esc(v)}"${draft[d.k]===v?' selected':''}>${esc(v)}</option>`).join('')}
        </select></label>`;}).join('')
    +`<div class="thfoot"><button type="button" class="btn sm" data-clear="1">전체 해제</button>
      <div class="spacer"></div><button type="button" class="btn sm primary" data-ok="1">적용</button></div>`;
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(innerWidth-pop.offsetWidth-8,r.right-pop.offsetWidth))+'px';
  pop.style.top=Math.min(innerHeight-pop.offsetHeight-8,r.bottom+6)+'px';
  pop.querySelectorAll('[data-dk]').forEach(s=>s.onchange=()=>{draft[s.dataset.dk]=s.value;});
  const apply=v=>{DAILY_FILT=v;pop.remove();paintDailyFiltBtn();renderDaily();
    try{markDirty();saveLocal();}catch(e){}};
  pop.querySelector('[data-clear]').onclick=()=>apply({segment:'',media:'',product:''});
  pop.querySelector('[data-ok]').onclick=()=>apply(draft);
  setTimeout(()=>{
    const off=e=>{if(!pop.contains(e.target)&&e.target!==btn){pop.remove();
      document.removeEventListener('mousedown',off);}};
    document.addEventListener('mousedown',off);},0);
}
function renderDaily(){
  const host=$('chartDaily');
  /* 다시 그리기 전 가로 위치 — 지표만 바꿔 다시 그릴 때 보던 자리를 지킨다 (v107) */
  const prevSL=host.scrollLeft;
  host.innerHTML='';
  paintDailyFiltBtn();
  const bk=$('barSel').value||BAR_METRIC||'imp', lk=$('lineSel').value||LINE_METRIC||'ctr';
  /* 그래프 전용 필터(v54)를 여기서 한 번 걸어 두면 계열·예상값·범례가 모두 같이 좁혀진다 */
  const fs=factFilter().filter(dailyPass);
  /* 계열 순서 — 예산(Gross)이 큰 것부터. 같으면 이름순 (사용자가 범례에서 바꿀 수 있다) */
  const budOf=k=>sum(dailyLines().filter(l=>SERIES_DIM==='creative'
      ? CREATIVES.some(c=>c.lid===l.id&&c.name===k) : l[SERIES_DIM]===k).map(lineGross));
  /* 필터를 걸었는데 남는 데이터가 없으면 빈 그래프 대신 이유를 알려 준다 (v54) */
  if(dailyFiltOn()&&!fs.length){
    const box=el('div','dfempty',host);
    box.innerHTML=`<b>이 필터에 해당하는 데이터가 없습니다.</b>
      <span>${DAILY_FILT_DIMS.filter(d=>DAILY_FILT[d.k])
        .map(d=>`${d.l} <b>${esc(DAILY_FILT[d.k])}</b>`).join(' · ')}</span>`;
    const b=el('button','btn sm',box);b.textContent='필터 해제';
    b.onclick=()=>{DAILY_FILT={segment:'',media:'',product:''};
      paintDailyFiltBtn();renderDaily();try{markDirty();saveLocal();}catch(e){}};
    $('dailyLegend').innerHTML='';
    return;}
  let seriesKeys=[...new Set(fs.map(f=>f[SERIES_DIM]))]
    .sort((a,b)=>(budOf(b)-budOf(a))||String(a).localeCompare(String(b),'ko'));
  if(Array.isArray(DAILY_ORDER[SERIES_DIM])&&DAILY_ORDER[SERIES_DIM].length){
    const ix=k=>{const i=DAILY_ORDER[SERIES_DIM].indexOf(k);return i<0?1e9:i;};
    seriesKeys=seriesKeys.slice().sort((a,b)=>ix(a)-ix(b));}
  /* 가로축은 늘 캠페인 시작일 ~ 종료일 전체 (기간 필터와 무관하게 흐름을 본다) */
  const SC=campScope(), PS=paceScope();
  /* 조회 기간 슬롯. 다만 "현재 시점까지" 보고 있고 예상값 토글이 켜져 있으면
     미집행 구간 예측을 보여주기 위해 오른쪽 끝을 집행 종료일까지 늘린다. */
  const showFuture=SHOW_FORECAST&&SC.i1>=dIdx(YESTERDAY)&&PS.i1>SC.i1;
  const iEnd=showFuture?PS.i1:SC.i1;
  const ds=ALLDATES.slice(SC.i0,iEnd+1);
  /* 진하게 보여 줄 구간 = **지금 고른 조회 기간의 마지막 날**까지 (그리고 어제를 넘지 않는다).
     9/1~9/2 를 골랐으면 9/2 까지만 진하고 9/3 부터 옅은 음영이 깔린다. */
  const lastOn=Math.min(PS.i1,dIdx(YESTERDAY));
  const EL=Math.max(0,Math.min(lastOn+1-SC.i0,ds.length));
  /* ===== v103 — 입체(3D) =====
     y축 없이 좌우를 꽉 채우고, 카드 아래는 바닥(웜 토프 — 전체 캠페인 › 캠페인별 광고비와 같은 결).
     바닥이 막대 뒤로 이어지며 그대로 **일별 소진금액 언덕**이 된다(테두리 없이, 0원부터 같은 눈금).
     막대는 반투명 입체(앞 · 옆 · 윗면), 그림자도 캠페인별 광고비와 같은 크기 · 자리.
     꺾은선은 평범한 선(굵고 반투명한 검정 · 부드러운 곡선), 눈금 대신 처음 · 최고 · 최저 · 마지막 값.
     운영 이슈는 흰 바탕 · 검은 테두리의 번호 원 */
  const DARK=document.documentElement.getAttribute('data-theme')==='dark';
  const Wv=Math.max(Math.round(host.clientWidth)||1200,560),H=500;
  DAILY_W=Wv;
  const SXp=Math.round(Math.max(14,Math.min(28,Wv*.018)));
  /* v107 — 한 달(31일)이 넘는 캠페인은 한 화면에 31일 폭으로 그리고 나머지는 가로로 넘겨 본다
     (서머리 표처럼 좌우 ‹ › 단추 · 트랙패드/Shift+휠 가로 스크롤) */
  const DAYS_VIS=31;
  /* 페이지 저장(v112.1) 동안에는 전체 기간을 한 화면 폭에 담는다(window.__DAILY_FIT) */
  const W=ds.length>DAYS_VIS&&!window.__DAILY_FIT?Math.round(SXp*2+(Wv-SXp*2)/DAYS_VIS*ds.length):Wv;
  const floorH=132,Ftop=H-floorH,BASE=Ftop+Math.round(floorH*.42);
  const P={l:SXp,r:SXp,t:16};
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'chart d3'},host);
  const X0=P.l,XW=W-P.l-P.r,step=XW/ds.length,cx=i=>X0+step*i+step/2;
  const pal=pickRamp(seriesKeys.length);
  const remainDays=Math.max(ds.length-EL,0);
  const expOf=key=>{                                   /* 시리즈별 캠페인 예상 총량 */
    const ls=dailyLines().filter(l=>SERIES_DIM==='creative'
      ? CREATIVES.some(c=>c.lid===l.id&&c.name===key) : l[SERIES_DIM]===key);
    if(bk==='cost')return sum(ls.map(lineGross));
    return sum(ls.map(l=>l.e[bk]||0));};
  const series=seriesKeys.map(key=>{
    const vals=ds.map((_,i)=>{
      if(i>=EL)return 0;
      const sel=fs.filter(f=>f[SERIES_DIM]===key&&f.d===SC.i0+i);
      return bk==='cost'?sum(sel.map(f=>f.cost)):sum(sel.map(f=>f[bk]));});
    const done=sum(vals),left=Math.max(expOf(key)-done,0);
    const perDay=remainDays?left/remainDays:0;
    const fvals=ds.map((_,i)=>i>=EL?perDay:0);
    return {key,vals,fvals};});
  const vOf=(si,i)=>i>=EL?(SHOW_FORECAST?series[si].fvals[i]:0):series[si].vals[i];
  const totals=ds.map((_,i)=>sum(series.map((s,si)=>vOf(si,i))));
  /* 막대 — 가장 높은 날이 바닥에서 위로 절반쯤 */
  const barMaxH=(BASE-P.t)*.5,mxT=Math.max(...totals)||1;
  const BH=v=>v/mxT*barMaxH;
  const bw=Math.min(step*.54,26),DEP=Math.max(4,Math.min(9,step*.22));
  /* 색 — 바닥 · 글자 */
  const FLC=DARK?[200,168,136]:[150,120,90];
  const FLO=DARK?[.04,.09,.16]:[.08,.17,.28];
  const INK=DARK?'#e8e8e8':'#24262a',INK2=DARK?'#b8ab9c':'#8a7f75',HALO=cssVar('--surface')||(DARK?'#1e1e1e':'#fff');
  const rgbOf=c=>{c=String(c||'').trim();const m=/^rgba?\(([^)]+)\)/.exec(c);
    if(m)return m[1].split(',').slice(0,3).map(x=>+x);
    try{return hex2rgb(c);}catch(e){return [120,124,130];}};
  const rgba=(c,a,k=1)=>`rgba(${c.map(v=>Math.round(Math.max(0,Math.min(255,v*k)))).join(',')},${a})`;
  /* ---------- 바닥 + 일별 소진금액 언덕 ---------- */
  const spend=ds.map((_,i)=>i>=EL?NaN:sum(fs.filter(f=>f.d===SC.i0+i).map(f=>f.cost)));
  let SPEND_ON=false;
  {const got=spend.filter(isFinite),sMax=Math.max(0,...got);
    const BK=14,HH=barMaxH*.95;
    let hill='';
    if(EL>=2&&sMax>0){
      SPEND_ON=true;
      const pts=[];for(let i=0;i<EL;i++)pts.push([cx(i)+BK,Math.min(Ftop,BASE-BK-(num(spend[i])/sMax)*HH)]);
      const sm=smoothPath(pts),ci=sm.indexOf(' C');
      hill=`M0 ${H} L0 ${pts[0][1]} L${pts[0][0]} ${pts[0][1]}`+(ci>=0?sm.slice(ci):'');
      const last=pts[pts.length-1];
      /* 집행이 끝난 뒤(미집행 구간)는 비스듬히 바닥 높이로 내려온다 */
      if(EL<ds.length){const xe=Math.min(W,last[0]+step*1.2);
        hill+=` C${last[0]+step*.5} ${last[1]} ${xe-step*.5} ${Ftop} ${xe} ${Ftop} L${W} ${Ftop}`;}
      else hill+=` L${W} ${last[1]}`;
      hill+=` L${W} ${H} Z`;}
    else hill=`M0 ${H} L0 ${Ftop} L${W} ${Ftop} L${W} ${H} Z`;
    const hTop=Math.min(Ftop,...(SPEND_ON?spend.filter(isFinite).map(v=>BASE-BK-(v/sMax)*HH):[Ftop]))-6;
    const gid='dfl'+uid();
    const lg=S('linearGradient',{id:gid,gradientUnits:'userSpaceOnUse',x1:0,y1:hTop,x2:0,y2:H},svg);
    S('stop',{offset:0,'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[0]},lg);
    S('stop',{offset:Math.max(.05,Math.min(.95,(BASE-hTop)/(H-hTop))).toFixed(3),'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[1]},lg);
    S('stop',{offset:1,'stop-color':`rgb(${FLC})`,'stop-opacity':FLO[2]},lg);
    S('path',{d:hill,fill:`url(#${gid})`,stroke:'none','pointer-events':'none',class:'dground'},svg);
    /* 언덕 위 금액 — 처음 · 가장 많이 쓴 날 · 마지막 날만 */
    if(SPEND_ON){const iC=spend.indexOf(Math.max(...spend.filter(isFinite)));
      [...new Set([iC,EL-1])].forEach(i=>{if(!isFinite(spend[i]))return;
        const x=cx(i)+BK,y=BASE-BK-(spend[i]/sMax)*HH;
        const an=i===0?'start':i===EL-1?'end':'middle';
        const t=S('text',{x:an==='start'?x-6:an==='end'?x+8:x,y:y-7,'text-anchor':an,'font-size':10.5,'font-weight':700,
          fill:INK2,'paint-order':'stroke',stroke:HALO,'stroke-width':3,'pointer-events':'none',class:'dspl'},svg);
        t.textContent=spend[i]>=1e8?(spend[i]/1e8).toFixed(1)+'억':spend[i]>=1e4?fmt(Math.round(spend[i]/1e4))+'만':fmt(spend[i]);});}}
  /* 미집행 구간 — 옅게 덮는다 */
  if(EL<ds.length)S('rect',{x:X0+step*EL,y:P.t,width:XW-step*EL,height:BASE-P.t,fill:HALO,opacity:.45,'pointer-events':'none'},svg);
  /* ---------- 막대 그림자 + 반투명 입체 막대 ---------- */
  const shg='dsh'+uid();
  {const rg=S('radialGradient',{id:shg},svg);
    S('stop',{offset:0,'stop-color':'#000','stop-opacity':DARK?.5:.2},rg);S('stop',{offset:1,'stop-color':'#000','stop-opacity':0},rg);}
  const PRGB=pal.map(rgbOf);
  /* 막대 · 날짜 글자 — 날짜에 마우스를 올리면 그 막대만 진하고 크게(v107) */
  const BARS=[],DTXT=[];
  ds.forEach((d,i)=>{if(!(totals[i]>0))return;
    const bl=cx(i)-(bw+DEP)/2,w=bw+DEP+26;
    S('ellipse',{cx:bl-8+w/2,cy:BASE-DEP/2,rx:w/2,ry:8,fill:`url(#${shg})`,opacity:i>=EL?.3:1,'pointer-events':'none'},svg);});
  ds.forEach((d,i)=>{
    const future=i>=EL,bl=cx(i)-(bw+DEP)/2;let y=BASE;
    let topIdx=-1;for(let si=series.length-1;si>=0;si--){if(vOf(si,i)>0){topIdx=si;break;}}
    const g=S('g',{opacity:future?.22:1,'pointer-events':'none',class:future?'dbar fut':'dbar'},svg);BARS[i]=g;
    series.forEach((s,si)=>{const v=vOf(si,i);if(v<=0)return;
      const h=Math.max(BH(v),1),top=y-h,c=PRGB[si];
      S('rect',{x:bl.toFixed(1),y:top.toFixed(1),width:bw.toFixed(1),height:h.toFixed(1),fill:rgba(c,.8)},g);
      S('path',{d:`M${(bl+bw).toFixed(1)} ${top.toFixed(1)} l${DEP.toFixed(1)} ${(-DEP).toFixed(1)} v${h.toFixed(1)} l${(-DEP).toFixed(1)} ${DEP.toFixed(1)} Z`,fill:rgba(c,.8,.72)},g);
      if(si===topIdx)S('path',{d:`M${bl.toFixed(1)} ${top.toFixed(1)} l${DEP.toFixed(1)} ${(-DEP).toFixed(1)} h${bw.toFixed(1)} l${(-DEP).toFixed(1)} ${DEP.toFixed(1)} Z`,fill:rgba(c,.85,1.18)},g);
      y=top;});
    const rest=isRest(d);
    const t=S('text',{x:cx(i),y:BASE+21,'text-anchor':'middle','font-size':10.5,'font-weight':700,
      fill:rest?'var(--hol)':INK2,opacity:rest?.85:1,class:'ddate'},svg);t.textContent=d.getDate();DTXT[i]=t;
    if(d.getDate()===1||i===0){
      const m=S('text',{x:cx(i),y:BASE+35,'text-anchor':'middle','font-size':10,'font-weight':800,fill:INK2},svg);
      m.textContent=(d.getMonth()+1)+'월';}});
  svg.querySelectorAll('text.dspl').forEach(t=>svg.appendChild(t));
  /* ---------- 꺾은선 ---------- */
  let lineVals=null,LYf=null;DAILY_LY=null;
  const lTop=P.t+30,lBot=Math.max(lTop+70,BASE-barMaxH-DEP-26);
  if(lk!=='none'){
    lineVals=ds.map((_,i)=>{
      if(i>=EL)return NaN;
      const b=zeroB();
      fs.filter(f=>f.d===SC.i0+i).forEach(f=>{AMET.forEach(m=>b[m]+=f[m]);b.cost+=f.cost;});
      return METRICS[lk].c(b);});
    const ok=lineVals.filter(isFinite);
    /* 예상 효율선도 그래프 필터를 따른다 (v54) */
    const benchV=METRICS[lk].c(aggExp(dailyLines()));
    const useBench=SHOW_BENCH&&isFinite(benchV);
    const dom=useBench?ok.concat([benchV]):ok;
    if(!dom.length){lineVals=null;}else{
    const mn=Math.min(...dom),mx=Math.max(...dom);
    const rg=(mx-mn)||mx*.2||1;
    /* 위아래 여백을 넉넉히 — 하루 이틀 튄 날 때문에 선이 휙휙 꺾여 보이지 않게 */
    const lo=mn>=0?Math.max(0,mn-rg*.8):mn-rg*.8,hi=mx+rg*.8;
    const LY=v=>lBot-(num(v)-lo)/((hi-lo)||1)*(lBot-lTop);
    LYf=LY;
    /* 선은 이웃한 날과 1:2:1 로 살짝 고른 높이로 그린다 — 하루하루 튀는 값 때문에 휙휙 꺾이지 않게.
       (이름표 · 툴팁의 숫자는 그날 실제 값) */
    const sv=lineVals.map((v,i)=>{if(!isFinite(v))return NaN;const a=lineVals[i-1],c=lineVals[i+1];
      let s2=2*v,w=2;if(isFinite(a)){s2+=a;w++;}if(isFinite(c)){s2+=c;w++;}return s2/w;});
    const pts=lineVals.map((v,i)=>isFinite(v)?[cx(i),LY(sv[i]),i]:null).filter(Boolean);
    const SY_=new Map(pts.map(p=>[p[2],p[1]]));
    /* 값이 없는 날(집행 공백)에서 선을 끊는다 (v79) */
    const runs=[];pts.forEach(p=>{const r=runs[runs.length-1];
      if(r&&p[2]===r[r.length-1][2]+1)r.push(p);else runs.push([p]);});
    if(!pts.length){lineVals=null;}
    else{
    const LC=DARK?'rgba(255,255,255,.6)':'rgba(16,18,22,.55)';
    DAILY_LY=SY_;
    /* 예상 효율 기준선 — 점선 + 오른쪽 끝 이름표 */
    if(useBench){const y=LY(benchV);
      S('line',{x1:X0,x2:W-P.r,y1:y,y2:y,stroke:INK,'stroke-width':1.2,opacity:.35,'stroke-dasharray':'4 5','pointer-events':'none'},svg);
      const t=S('text',{x:W-P.r,y:y+15,'text-anchor':'end','font-size':10.5,'font-weight':700,fill:INK,opacity:.62,
        'paint-order':'stroke',stroke:HALO,'stroke-width':3,'pointer-events':'none'},svg);
      t.textContent=`예상 ${METRICS[lk].f(benchV)}`;}
    runs.forEach(r=>{
      if(r.length<2){S('circle',{cx:r[0][0],cy:r[0][1],r:3,fill:LC},svg);return;}
      S('path',{d:smoothPath(r),fill:'none',stroke:LC,'stroke-width':4.2,
        'stroke-linecap':'round','stroke-linejoin':'round','pointer-events':'none',class:'dline'},svg);});
    /* 값 이름표 — 처음 · 최고 · 최저 · 마지막 (겹치면 하나만) */
    const vs=pts.map(p=>lineVals[p[2]]);
    const iMx=pts[vs.indexOf(Math.max(...vs))],iMn=pts[vs.indexOf(Math.min(...vs))];
    const marks=[[pts[0],'start',-1],[iMx,'middle',-1],[iMn,'middle',1],[pts[pts.length-1],'end',-1]];
    const used=[];
    marks.forEach(([p,an,dir])=>{if(!p||used.some(u=>Math.abs(u[0]-p[0])<44&&Math.abs(u[1]-p[1])<16))return;
      const y=dir<0?p[1]-12:p[1]+19;used.push([p[0],y]);
      const t=S('text',{x:an==='start'?p[0]-4:an==='end'?p[0]+4:p[0],y,'text-anchor':an,'font-size':12,'font-weight':800,
        fill:INK,'paint-order':'stroke',stroke:HALO,'stroke-width':3.2,'pointer-events':'none'},svg);
      t.textContent=METRICS[lk].f(lineVals[p[2]]);});
    {const p=pts[0],t=S('text',{x:p[0]-4,y:p[1]-30,'text-anchor':'start','font-size':10.5,'font-weight':800,fill:INK2,'pointer-events':'none'},svg);
      t.textContent=METRICS[lk].l;}
    }
    }
  }
  /* ---------- 날짜별 툴팁 (막대 · 날짜 자리) ---------- */
  ISSUE_OVERFLOW=0;
  if(typeof renderIssueAlert==='function')renderIssueAlert();
  ds.forEach((d,i)=>{
    if(i>=EL)return;
    const hit=S('rect',{x:X0+step*i,y:lBot+6,width:step,height:BASE+28-(lBot+6),fill:'transparent'},svg);
    hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
      `<div class="t">${dFull(d)} (${WD[d.getDay()]})${holName(d)?' · '+holName(d):''}</div>`+
      series.map((s,si)=>`<div class="r"><span class="l"><span style="width:8px;height:8px;border-radius:2px;background:${pal[si]};display:inline-block"></span>${esc(s.key)}</span><b>${METRICS[bk].f(s.vals[i])}</b></div>`).join('')+
      `<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:5px"><span class="l">${METRICS[bk].l} 합계</span><b>${METRICS[bk].f(totals[i])}</b></div>`+
      (lineVals?`<div class="r"><span class="l"><span class="linekey"></span>${METRICS[lk].l}</span><b>${METRICS[lk].f(lineVals[i])}</b></div>`:'')+
      (SPEND_ON&&isFinite(spend[i])?`<div class="r"><span class="l">소진금액</span><b>${won(spend[i])}</b></div>`:'')));
    hit.addEventListener('mouseenter',()=>{if(BARS[i])BARS[i].classList.add('on');if(DTXT[i])DTXT[i].classList.add('on');svg.classList.add('hov');});
    hit.addEventListener('mouseleave',()=>{if(BARS[i])BARS[i].classList.remove('on');if(DTXT[i])DTXT[i].classList.remove('on');svg.classList.remove('hov');hideTip();});});
  /* ---------- 운영 이슈 — 흰 바탕 · 검은 테두리 번호 원 (v103) ----------
     이슈가 시작된 날의 꺾은선 위에. 그날 꺾은선 값이 없으면 막대 위에. 같은 날 시작한 이슈는 원 하나 + 개수 배지.
     올리면 이슈 기간을 옅게 칠하고 내용을 띄운다 */
  let ISSUE_DRAWN=0;const ISSUE_LIST=[];
  if(SHOW_ISSUES){
    const groups=new Map();
    ISSUES.slice().sort((a,b)=>dIdx(a.s)-dIdx(b.s)).forEach((is,n)=>{
      const a=dIdx(is.s)-SC.i0,b2=dIdx(is.e||is.s)-SC.i0;
      if(!isFinite(a))return;
      const e2=isFinite(b2)?Math.max(b2,a):a;
      if(e2<0||a>ds.length-1)return;
      const ai=Math.max(a,0);
      if(!groups.has(ai))groups.set(ai,[]);
      groups.get(ai).push({is,n,ai,bi:Math.min(e2,ds.length-1)});});
    groups.forEach((list,ai)=>{
      const x=cx(ai),lv=lineVals&&DAILY_LY&&DAILY_LY.has(ai)?DAILY_LY.get(ai):NaN;
      const y=isFinite(lv)?lv:Math.max(P.t+12,BASE-BH(totals[ai]||0)-DEP-14);
      const g=S('g',{class:'isdot'},svg);
      const halo=S('circle',{cx:x,cy:y,r:15,fill:INK,opacity:0,class:'halo'},g);
      S('circle',{cx:x,cy:y,r:8.5,fill:HALO,stroke:INK,'stroke-width':2,class:'ring'},g);
      const nt=S('text',{x,y:y+3.5,'text-anchor':'middle','font-size':9.5,'font-weight':900,fill:INK,'pointer-events':'none'},g);
      nt.textContent=String(list[0].n+1);
      if(list.length>1){
        S('circle',{cx:x+9.5,cy:y-9.5,r:6.5,fill:INK,stroke:HALO,'stroke-width':1.5},g);
        const t=S('text',{x:x+9.5,y:y-6.4,'text-anchor':'middle','font-size':8.5,'font-weight':800,fill:HALO},g);
        t.textContent=String(list.length);}
      S('circle',{cx:x,cy:y,r:15,fill:'transparent'},g);
      ISSUE_DRAWN++;list.forEach(it=>ISSUE_LIST.push(it));
      let hls=[];
      g.addEventListener('mouseenter',()=>{
        g.classList.add('on');halo.setAttribute('opacity',.1);
        list.forEach(it=>{const h=S('rect',{x:cx(it.ai)-step/2,y:P.t,width:Math.max((it.bi-it.ai+1)*step,step),height:BASE-P.t,
          fill:INK,opacity:.05,'pointer-events':'none'});
          svg.insertBefore(h,svg.firstChild&&svg.firstChild.nextSibling||null);hls.push(h);});});
      g.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,list.map((it,k)=>
        `<div class="t"${k?' style="margin-top:9px"':''}>운영 이슈 ${it.n+1} · ${esc(it.is.s)}${it.is.e&&it.is.e!==it.is.s?' ~ '+esc(it.is.e):''}</div>`
        +(it.is.scope||it.is.type?`<div class="r"><span class="l">${esc(it.is.scope||'')}</span><b>${esc(it.is.type||'')}</b></div>`:'')
        +`<div style="margin-top:4px;opacity:.92;white-space:normal;max-width:280px">${esc(it.is.txt||'')}</div>`).join('')));
      g.addEventListener('mouseleave',()=>{g.classList.remove('on');halo.setAttribute('opacity',0);
        hls.forEach(h=>h.parentNode&&h.parentNode.removeChild(h));hls=[];hideTip();});
    });
  }
  /* 운영 이슈 목록 (v112.1) — 화면에서는 숨겨 두고, 페이지 저장 · 인쇄 때만 그래프 아래에 번호 · 기간 · 내용을 적는다
     (번호 원만으로는 그림에서 무슨 이슈인지 알 수 없다) */
  {const box=$('dailyIssues');
   if(box){const md=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?`${+m[2]}/${+m[3]}`:esc(iso||'');};
     box.innerHTML=ISSUE_LIST.sort((a,b)=>a.n-b.n).map(it=>{const is=it.is;
       const per=md(is.s)+(is.e&&is.e!==is.s?' ~ '+md(is.e):'');
       const tag=[is.scope,is.type].filter(Boolean).map(esc).join(' · ');
       return `<div class="disit"><span class="disno">${it.n+1}</span><span class="disper">${per}</span>`
         +`<span class="distx">${tag?`<b>${tag}</b> `:''}${esc(is.txt||'')}</span></div>`;}).join('');}}
  /* ---------- 범례 — 바닥 위(카드 아래 끝) ---------- */
  const lg=$('dailyLegend');lg.innerHTML='';
  series.forEach((s,i)=>{const x=el('span','it drag',lg);
    x.draggable=true;x.dataset.k=s.key;
    x.title='끌어서 순서를 바꿀 수 있습니다 (기본은 예산 큰 순)';
    x.innerHTML=`<span class="dot" style="background:${rgba(PRGB[i],.85)}"></span>${esc(s.key)}`;});
  wireDailyLegendDrag(lg,seriesKeys);
  if(lineVals){const x=el('span','it',lg);
    x.innerHTML=`<span class="linekey d3"></span>${METRICS[lk].l}`;}
  if(ISSUE_DRAWN){const x=el('span','it',lg);
    x.title='이슈가 시작된 날의 꺾은선 위에 번호로 표시합니다. 원에 마우스를 올리면 내용과 기간이 보입니다.';
    x.innerHTML=`<span class="issuekey"></span>운영 이슈`;}
  if(SPEND_ON){const x=el('span','it',lg);
    x.title='막대 뒤로 이어지는 땅의 높이가 그날의 소진금액입니다(0원부터 같은 눈금). 정확한 금액은 날짜에 마우스를 올리면 나옵니다.';
    x.innerHTML=`<span class="hillkey"></span>일별 소진금액 (뒤 언덕)`;}
  if(SHOW_FORECAST&&remainDays){const x=el('span','it',lg);
    x.innerHTML=`<span class="dot" style="background:${rgba(PRGB[0]||[120,124,130],.22)}"></span>미집행 구간 예상값 (일할)`;}
  /* 가로 넘김 (v107) — 한 달이 넘을 때만 단추가 보인다. 처음엔 최근(마지막 집행일 쪽), 다시 그릴 땐 보던 자리 */
  {const card=host.closest('.card');
    if(W>Wv){const key=[CAMPAIGN.name,SC.i0,ds.length,W].join('|');
      host.scrollLeft=host.__slKey===key?prevSL:Math.max(0,Math.min(W-Wv,cx(Math.max(EL-1,0))+step*3-Wv));
      host.__slKey=key;}
    else host.__slKey='';
    try{enableHPager(card,host,{frozen:()=>0,go:dir=>{
      /* 한 번에 화면의 85% 쯤 — 날짜 칸 경계에 맞춰 멈춘다 */
      const n=Math.max(1,Math.floor(host.clientWidth*.85/step));
      const to=Math.max(0,Math.min(host.scrollWidth-host.clientWidth,Math.round((host.scrollLeft+dir*n*step)/step)*step));
      host.scrollTo({left:to,behavior:'smooth'});}});}catch(e){}}
  /* 폭이 바뀌면 다시 그린다 (탭이 처음 열릴 때 폭 0 → 실제 폭 포함) */
  if(!host.__ro&&typeof ResizeObserver!=='undefined'){
    let t=0;host.__ro=new ResizeObserver(()=>{const w=Math.round(host.clientWidth);
      if(!w||Math.abs(w-(DAILY_W||0))<4)return;clearTimeout(t);t=setTimeout(()=>{try{renderDaily();}catch(e){}},120);});
    host.__ro.observe(host);}
}
var DAILY_W=0,DAILY_LY=null;

/* ===== 6. 서머리 ===== */
/* ===== 서머리 열 — 항목 사전(열설정북)에서 생성 ===== */
const mkSumCat=()=>mergeCatalog(fieldCatalog('dash').concat([{g:'기타',
  cols:[{k:'period',l:'기간'},{k:'bid',l:'비드 타입'}]}]));
let SUM_CATALOG=mkSumCat();
let SUM_DEF={};SUM_CATALOG.forEach(g=>g.cols.forEach(c=>SUM_DEF[c.k]=c));
/* x: false = 정상 · 'ratio' = 예상값은 표시하되 비율은 의미가 없어 숨김 · 'all' = 예상값 전부 숨김 */
const HA=x=>x==='all';
const SUM_CELL={};
function buildSumCell(){
  const abs=k=>a=>[fmt(a[k])];
  const money=k=>a=>[won(a[k])];
  const est=k=>(a,e,x)=>[HA(x)||!e[k]?'–':fmt(e[k])];
  const achv=k=>(a,e,x)=>[null,x||!e[k]?NaN:a[k]/e[k]];
  const rate=k=>a=>[METRICS[k].f(mval(k,a))];
  FIELDS.forEach(f=>{
    const k=f.k;
    if(SUM_CELL[k])return;
    if(k.startsWith('e_')){SUM_CELL[k]=est(k.slice(2));return;}
    if(k.endsWith('_r')&&FLD['e_'+k.slice(0,-2)]){SUM_CELL[k]=achv(k.slice(0,-2));return;}
    if(METRICS[k]){SUM_CELL[k]=METRICS[k].kind==='abs'
      ?(METRICS[k].f===won?money(k):abs(k)):rate(k);return;}
  });
  /* 사전 계산으로 만들 수 없는 항목들 */
  SUM_CELL.budget=(a,e,x)=>[HA(x)?'–':won(e.budget)];
  SUM_CELL.value=(a,e,x)=>[HA(x)?'–':won(e.value)];
  SUM_CELL.bonus=(a,e,x)=>[HA(x)?'–':won(e.bonusSum)];
  SUM_CELL.bonusRate=(a,e,x)=>[HA(x)?'–':pct(e.bonusSum/e.budget,1)];
  SUM_CELL.cost=a=>[won(a.cost)];
  SUM_CELL.spend_r=(a,e,x)=>[null,x?NaN:a.cost/e.budget];
  /* 진도율 — 그 행의 라인들만으로 (v79). 예전에는 모든 행에 캠페인 전체 진도율이 찍혀
     이미 끝난 1차 행도 96.9% 로 보였다 */
  SUM_CELL.progress=(a,e)=>[pct(e&&e.lines&&e.lines.length?paceRatioOf(e.lines):paceRatio(),1)];
  /* 목표 단가 — 예산(Gross) ÷ 목표 수치. 실적 단가(CPM·CPC…)와 같은 방식이라 나란히 비교된다 */
  const goalCost=(k,mult)=>(a,e,x)=>[HA(x)||!e[k]||!e.budget?'–':won(e.budget/e[k]*(mult||1))];
  SUM_CELL.g_cpm=goalCost('imp',1000);
  SUM_CELL.g_cpc=goalCost('click');
  SUM_CELL.g_cpv=goalCost('view');
  SUM_CELL.g_cpa=goalCost('conv');
  SUM_CELL.g_cpe=goalCost('eng');
  SUM_CELL.start=(a,e,x)=>[HA(x)||!e.dstart?'–':mdy(e.dstart)];
  SUM_CELL.end=(a,e,x)=>[HA(x)||!e.dend?'–':mdy(e.dend)];
  SUM_CELL.startT=()=>['–'];SUM_CELL.endT=()=>['–'];
  /* 기간 — 미디어믹스와 같은 M/D~M/D 표기 */
  SUM_CELL.period=(a,e,x)=>[HA(x)||!e.dstart?'–':`${mdy(e.dstart)}~${mdy(e.dend)}`];
  /* 비드 타입 (v55) — 그 행의 라인들이 한 가지면 그대로, 여러 가지면 " · " 로 이어 붙인다.
     소재·월처럼 라인보다 잘게 나뉜 행에서는 예상 효율과 같은 규칙으로 합쳐 보여 준다. */
  SUM_CELL.bid=(a,e,x)=>{
    const bs=(e&&e.bids)||[];
    if(!bs.length)return ['<span class="na">–</span>'];
    return [bs.length<=2?esc(bs.join(' · '))
      :`<span title="${esc(bs.join(' · '))}">${esc(bs[0])} 외 ${bs.length-1}</span>`];};
  SUM_CELL.date=()=>['–'];
}
buildSumCell();
/* 사용자 열이 바뀜다면 서머리 카탈로그와 칸 그리는 법을 다시 만든다 (v57) */
COLREB.push(()=>{
  SUM_CATALOG=mkSumCat();
  SUM_DEF={};SUM_CATALOG.forEach(g=>g.cols.forEach(c=>SUM_DEF[c.k]=c));
  Object.keys(SUM_CELL).forEach(k=>{if(/^u_|^e_u_/.test(k))delete SUM_CELL[k];});
  buildSumCell();
});
/* 예상값이 들어가는 열 (소재 단위로 쪼개지면 위·아래 셀을 합쳐 표시) */
SUM_CELL.__exp=new Set(FIELDS.filter(f=>/^e_/.test(f.k)||/_r$/.test(f.k)
  ||/^g_cp/.test(f.k)
  ||['budget','net','value','bonus','bonusRate','feeA','feeR','spend_r','start','end','period'].includes(f.k))
  .map(f=>f.k).concat(['period','bid']));
/* 기본 표시 열 — 열설정북의 "대시보드/데이터입력 탭에 디펄트 표시" 기준 */
/* 기본 열 구성 — 운영사항 / 노출 효율 / 클릭 효율 / 조회 효율 */
const SUM_PRESET=()=>({
  rows:[{k:'segment',sub:true},{k:'media',sub:true},{k:'product',sub:false}],order:null,
  groups:[
    {id:uid(),name:'운영사항',cols:['period','budget','cost','spend_r','progress']},
    {id:uid(),name:'노출 효율',cols:['e_imp','imp','imp_r','g_cpm','cpm']},
    {id:uid(),name:'클릭 효율',cols:['e_click','click','click_r','ctr','g_cpc','cpc']},
    {id:uid(),name:'조회 효율',cols:['e_view','view','view_r','vtr','g_cpv','cpv']}
  ].map(g=>({...g,cols:g.cols.filter(k=>SUM_CELL[k])}))
});
let SUMMARIES=[{id:'s1',name:'상세 효율 비교',...SUM_PRESET()},
               {id:'s2',name:'타겟팅 그룹별 효율',...SUM_PRESET(),
                rows:[{k:'target',sub:false}]}];
/* **KPI 지표** → 그 지표의 비용 효율 열 · 목표 단가 열 · 계산 밑값.
   비드 타입이 아니라 라인에 정해 둔 KPI 를 따른다 —
   KPI 가 "클릭" 이면 CPM 이 아니라 목표 CPC · CPC 를 견준다. */
const KPI_COSTCOL={
  imp:{c:'cpm',g:'g_cpm',b:'imp',m:1000},
  click:{c:'cpc',g:'g_cpc',b:'click',m:1},
  view:{c:'cpv',g:'g_cpv',b:'view',m:1},
  conv:{c:'cpa',g:'g_cpa',b:'conv',m:1},
  lead:{c:'cpa',g:'g_cpa',b:'lead',m:1},
  eng:{c:'cpe',g:'g_cpe',b:'eng',m:1},
  install:{c:'cpi',g:'',b:'install',m:1}};
/* 모든 비용 지표 ↔ 그 지표의 밑수 · 목표 열 (v53).
   KPI 열은 진하게(kpicol/kpibad), **KPI 가 아닌 단가 열도 제안보다 비싸면 은은하게**(costbad). */
const COSTCOL={
  cpm:{b:'imp',m:1000,g:'g_cpm'}, cpc:{b:'click',m:1,g:'g_cpc'},
  cpv:{b:'view',m:1,g:'g_cpv'},   cpa:{b:'conv',m:1,g:'g_cpa'},
  cpe:{b:'eng',m:1,g:'g_cpe'},    cpi:{b:'install',m:1,g:'g_cpi'}};
/* 목표 열(g_cpm 등) → 그 목표가 가리키는 단가 열 */
const GOAL2COST={};Object.entries(COSTCOL).forEach(([c,d])=>{if(d.g)GOAL2COST[d.g]=c;});
/* 화면에 보이는 값(원 단위)이 실제로 다를 때만 "저조" 로 본다 —
   1원 미만 차이는 같은 값으로 읽히므로 붉게 칠하지 않는다 */
const kpiWorse=(act,goal)=>isFinite(act)&&isFinite(goal)&&goal>0
  &&Math.round(act)-Math.round(goal)>=1;
/* 그 단가 열의 실집행 · 목표를 구한다 (KPI 여부와 무관) */
function costPair(ck,src,ex){
  const d=COSTCOL[ck];if(!d)return null;
  /* CPA 는 전환이 없으면 리드로 본다 (라인마다 어느 쪽을 KPI 로 잡았는지가 달라서) */
  const base=(ck==='cpa'&&!src[d.b]&&src.lead)?'lead':d.b;
  const act=src[base]?src.cost/src[base]*d.m:NaN;
  const goal=(ex&&ex.budget&&ex[base])?ex.budget/ex[base]*d.m:NaN;
  return {act,goal};}
/* 이 행에 걸린 라인들의 KPI 지표가 하나로 모이면 그 지표의 단가 열을 강조한다 */
function rowKpi(ls,cols){
  if(!ls||!ls.length)return null;
  const k=kpiOf(ls[0]);
  if(!k||ls.some(l=>kpiOf(l)!==k))return null;
  const d=KPI_COSTCOL[k];
  if(!d||!cols.includes(d.c))return null;
  return {...d,kpi:k};}
const gauge=v=>!isFinite(v)?'<span class="na">–</span>'
  :`<span class="gauge"><b class="mono">${pct(v)}</b><span class="track"><i style="width:${Math.min(v,1)*100}%"></i></span></span>`;
/* opt = {facts, lines} — 표에 쓸 팩트 · 라인을 따로 줄 때 (유입 분석 상세 표: 추적되는 라인만, v93) */
function buildPivot(tbl,cfg,cdef,cellDef,rerender,opt){
  const rows=cfg.rows.length?cfg.rows:[{k:'media',sub:false}];
  const dims=rows.map(r=>r.k),noExp=dims.some(d=>NO_EXP_DIMS.includes(d));
  const cols=cfgCols(cfg),seps=gsepSet(cfg);
  const facts=opt&&opt.facts?opt.facts:factFilter();
  const LNS=opt&&opt.lines?opt.lines:LINES;
  const map=new Map();
  facts.forEach(f=>{const key=dims.map(d=>f[d]).join(SEP);
    if(!map.has(key))map.set(key,[]);map.get(key).push(f);});
  /* 라인의 차원 값 — 팩트와 같은 규칙으로 비교한다. 팩트는 slot 을 `l.slot||''` 로 담으므로
     지면을 안 적은 라인(slot 없음)도 '' 로 맞춰야 예산 · 목표 · 달성률이 붙는다 (v78) */
  const lv=(l,d)=>l[d]==null?'':l[d];
  /* 기본 정렬 — 예산(Gross)이 큰 순서. 같으면 이름순. (사용자가 끌어서 바꾼 순서가 있으면 그게 우선) */
  const budgetOf=vals=>sum(LNS.filter(l=>vals.every((v,i)=>
      NO_EXP_DIMS.includes(dims[i])||lv(l,dims[i])===v)).map(lineGross));
  let entries=[...map.entries()].sort((a,b)=>{
    const av=a[0].split(SEP),bv=b[0].split(SEP);
    for(let i=0;i<dims.length;i++){
      if(av[i]===bv[i])continue;
      const ab=budgetOf(av.slice(0,i+1)),bb=budgetOf(bv.slice(0,i+1));
      if(ab!==bb)return bb-ab;
      return String(av[i]).localeCompare(String(bv[i]),'ko');}
    return 0;});
  entries=applyOrder(entries,cfg);
  /* 예상 효율(라인)보다 행이 더 잘게 나뉜 경우:
     예상값은 라인 단위까지만 매칭해 구하고, 같은 라인 그룹에서는 첫 행에만 합쳐서 표시한다.
     (소재·월처럼 라인에 없는 차원으로 쪼개면 값이 흩어져 표시가 안 되기 때문) */
  const expIdx=dims.map((d,i)=>NO_EXP_DIMS.includes(d)?-1:i).filter(i=>i>=0);
  const finer=expIdx.length<dims.length;                 /* 라인보다 잘게 나뉘었는가 */
  const expKey=vals=>expIdx.map(i=>vals[i]).join(SEP);
  const expFor=vals=>aggExp(LNS.filter(l=>expIdx.every(i=>i>=vals.length||lv(l,dims[i])===vals[i])));
  /* 머리글 정렬 (v72) — 화면에서만. 같은 부모 안에서 그 열 값으로 형제끼리 줄 세운다 */
  const hpKey='piv:'+(cfg.id||'mix');
  const srt=HP_SORT[hpKey];
  if(srt&&srt.dir&&(cols.includes(srt.k)||dims.includes(srt.k))){
    entries=hpSortEntries(entries,dims,srt,pre=>{
      if(!cellDef[srt.k])return NaN;
      const gf=facts.filter(f=>pre.every((v,x)=>f[dims[x]]===v));
      try{return hpVal(cellDef[srt.k](aggFacts(gf),expFor(pre),expIdx.length?false:'all')[0]);}catch(e){return NaN;}});}
  const keys=entries.map(e=>e[0].split(SEP));
  const {out,span}=pivotLayout(keys,rows);
  /* 예상값이 들어가는 열 — 소재처럼 잘게 나뉜 구간에서는 위·아래 셀을 합쳐 한 번만 표시한다 */
  const EXPCOL=cellDef.__exp||new Set();
  const lead=rows.map(r=>`<th rowspan="2">${(DIMS.find(d=>d.k===r.k)||{l:r.k}).l}</th>`);
  let h='<thead>'+groupHeaderHTML(cfg,cdef,lead)+'</thead><tbody>';
  /* 체류시간 구간 칸 (v100) — 그 행 체류 방문 중 이 구간 비율만큼 칠한다(데이터 행만).
     짧은 구간에 방문이 몰려 있어도 뒤 구간의 옅은 차이가 보이도록 √ 로 펼친다 */
  const DWSET=new Set(DW_KEYS);
  const dwShade=(k,src)=>{const n=dwSum(src),v=+src[k]||0;if(!n||!v)return '';
    /* v102 — 녹색 한 가지 톤(일자별 · 소재 효율 히트맵의 '좋음' 색). 붉은색은 쓰지 않는다 */
    const p=v/n;return {bg:`background:rgba(86,162,116,${(Math.sqrt(p)*.5).toFixed(3)})`,
      tip:L(`체류 방문 ${fmt(n)} 중 ${pct(p,1)}`,`${pct(p,1)} of ${fmt(n)} visits`)};};
  const cells=(a,e,x,merge,kpi,isData)=>cols.map((k,i)=>{
    const isExp=EXPCOL.has(k);
    if(merge&&isExp&&merge.skip)return '';               /* 병합된 구간의 두 번째 행부터는 셀 자체를 그리지 않음 */
    const src=(merge&&isExp)?merge.agg:a, ex=(merge&&isExp)?merge.exp:e;
    const [txt,g]=cellDef[k](src,ex,x);
    const rs=(merge&&isExp&&merge.n>1)?` rowspan="${merge.n}"`:'';
    /* 이 행의 KPI 지표 열은 눈에 띄게 — 목표 단가보다 비싸면(=효율이 나쁘면) 살짝 붉게.
       소계 · TOTAL 행은 KPI 가 섞이므로 표시하지 않는다(kpi 를 넘기지 않음) */
    let kc='',tip='';
    if(kpi&&(k===kpi.c||k===kpi.g)){
      kc=' kpicol';
      const act=src[kpi.b]?src.cost/src[kpi.b]*kpi.m:NaN;
      const goal=(ex.budget&&ex[kpi.b])?ex.budget/ex[kpi.b]*kpi.m:NaN;
      /* 1원 미만 차이는 사실상 같은 값 — 붉게 칠하지 않는다 */
      /* 저조 표시를 숨긴 서머리는 KPI 개선 고려(붉은 칸)도 함께 숨긴다 (v93) — 굵은 KPI 열 표시는 남긴다 */
      if(!cfg.noCostBad&&kpiWorse(act,goal))kc+=' kpibad';
      tip=kpiTip(kpi,src,ex);
    }else if(!cfg.noCostBad){
      /* KPI 가 아닌 단가 열도 제안(목표)보다 비싸면 은은하게 (v53).
         KPI 가 아닌 지표까지 강조할 필요가 없으면 서머리마다 끌 수 있다 (v68) */
      const ck=COSTCOL[k]?k:GOAL2COST[k];
      if(ck){
        const pr=costPair(ck,src,ex);
        if(pr&&kpiWorse(pr.act,pr.goal)){kc=' costbad';tip=costTip(ck,pr);}}}
    let st='';
    if(isData&&DWSET.has(k)){const d=dwShade(k,src);if(d){st=` style="${d.bg}"`;kc+=' dwsh';tip=tip||d.tip;}}
    return `<td class="mono${seps.has(i)?' gsep':''}${kc}"${rs}${st}${tip?` title="${esc(tip)}"`:''}>`
      +`${g!==undefined?gauge(g):txt}</td>`;}).join('');
  const costTip=(ck,pr)=>{
    const nm=(METRICS[ck]||{l:ck}).l;
    const d=Math.round(pr.act)-Math.round(pr.goal);
    return `${nm} — 제안 ${won(pr.goal)} 대비 ${won(d)} 비쌈`
      +` (${((pr.act/pr.goal-1)*100).toFixed(1)}% 저조)`;};
  const kpiTip=(kpi,src,ex)=>{
    const act=src[kpi.b]?src.cost/src[kpi.b]*kpi.m:NaN;
    const goal=(ex.budget&&ex[kpi.b])?ex.budget/ex[kpi.b]*kpi.m:NaN;
    const nm=`${KPI_LABEL[kpi.kpi]||kpi.kpi} · ${(METRICS[kpi.c]||{l:kpi.c}).l}`;
    if(!isFinite(act)||!isFinite(goal)||!goal)return `이 라인의 KPI 지표 (${nm})`;
    const d=Math.round(act)-Math.round(goal);
    if(!d)return `KPI 지표 (${nm}) · 목표 ${won(goal)}와 같음`;
    return `KPI 지표 (${nm}) · 목표 ${won(goal)} 대비 `
      +`${d>0?'+':''}${(d/goal*100).toFixed(1)}% ${d>0?'(저조)':'(우수)'}`;};
  /* 같은 라인(예상 효율 입력 단위)에 속한 연속 데이터 행의 길이를 미리 센다 */
  const runInfo=out.map(()=>null);
  if(finer&&expIdx.length){
    let i=0;
    while(i<out.length){
      if(out[i].kind!=='data'){i++;continue;}
      const ek=expKey(out[i].vals);let j=i;
      while(j<out.length&&out[j].kind==='data'&&expKey(out[j].vals)===ek)j++;
      const gf=[];for(let x=i;x<j;x++)gf.push(...entries[out[x].ri][1]);
      const agg=aggFacts(gf),exp=expFor(out[i].vals);
      for(let x=i;x<j;x++)runInfo[x]={n:j-i,skip:x>i,agg,exp};
      i=j;}
  }
  out.forEach((r,i)=>{
    if(r.kind==='data'){
      const vals=r.vals,fs=entries[r.ri][1];
      h+=`<tr data-key="${esc(entries[r.ri][0])}" data-pre="${esc(vals.slice(0,-1).join(SEP))}">`;
      vals.forEach((v,ci)=>{const sp=span[i][ci];if(!sp)return;
        /* 상위 계층 셀을 잡고 끌면 그 그룹 전체가 같은 부모 안에서 이동한다 */
        h+=`<td class="head" data-lvl="${ci}" data-pk="${esc(vals.slice(0,ci+1).join(SEP))}"`
          +` data-pp="${esc(vals.slice(0,ci).join(SEP))}"${sp>1?` rowspan="${sp}"`:''}>${dimCellHTML(dims[ci],v)}</td>`;});
      const rls=LNS.filter(l=>expIdx.every(i2=>i2>=vals.length||lv(l,dims[i2])===vals[i2]));
      h+=cells(aggFacts(fs),expFor(vals),expIdx.length?false:'all',runInfo[i],rowKpi(rls,cols),true)+'</tr>';
    }else{
      const L=r.level,vals=r.vals;
      h+=`<tr class="sub sub-l${Math.min(L,3)}">`;
      /* 기준 열까지는 위 데이터 행과 병합돼 있으므로(span 0) 그 칸은 그리지 않는다 */
      for(let ci=0;ci<=L;ci++){const sp=span[i][ci];if(!sp)continue;
        h+=`<td class="head" data-lvl="${ci}"${sp>1?` rowspan="${sp}"`:''}>${dimCellHTML(dims[ci],vals[ci])}</td>`;}
      const cs=Math.max(dims.length-(L+1),1);
      h+=`<td class="head" data-lvl="${L+1>=dims.length?L:L+1}" colspan="${cs}">${esc(dimDisp(dims[L],vals[L]))} 소계</td>`;
      const gf=facts.filter(f=>vals.every((v,x)=>f[dims[x]]===v));
      h+=cells(aggFacts(gf),expFor(vals),expIdx.length?false:'all')+'</tr>';
    }});
  h+=`<tr class="total"><td class="head" data-lvl="0" colspan="${dims.length}">TOTAL</td>`
    +cells(aggFacts(facts),aggExp(opt&&opt.lines?activeLines().filter(l=>LNS.includes(l)):activeLines()),expIdx.length?false:'all')+'</tr></tbody>';
  tbl.innerHTML=h;
  applyColWidths(tbl,cfg,cols,!!(opt&&opt.fill));
  markBlanks(tbl);
  wireGroupRename(tbl,cfg,rerender);
  if(rerender)enableRowDrag(tbl,cfg,rerender);
  /* 행 머리 열 고정을 먼저 — 손잡이(그립)가 static 머리글을 relative 로 바꾸기 전에
     sticky 를 걸어 둬야 가로 고정이 살아남는다 */
  freezeLeadCols(tbl,rows.length);
  /* 값 열 머리글을 끌어 너비 조절 — 정한 폭은 표 설정에 저장된다 */
  wirePivotColResize(tbl,cfg,cols,rerender);
  /* 머리글을 누르면 설명 + 정렬 (v72) */
  if(rerender)wireHeadPops(pivotHeadList(tbl,cfg,cols,dims,cdef),{cur:srt,scope:'sum',
    onSort:(k,d)=>{if(d)HP_SORT[hpKey]={k,dir:d};else delete HP_SORT[hpKey];rerender();}});
  /* 세로 스크롤 시 떠 있는 머리글 */
  mountFloatHead(tbl);
  /* 표 위쪽에도 가로 스크롤바를 하나 더 (표가 길면 아래 스크롤바가 화면 밖이라) */
  try{if(typeof attachTopScroll==='function')attachTopScroll(tbl.closest('.tbl-wrap'));}catch(e){}
}
/* 서머리 · 미디어믹스의 열 너비 조절.
   머리글이 2행이라 값 열은 따로 찾아야 하고, **매체·광고상품 같은 행 머리 열도 함께** 잡는다
   (예전에는 값 열에만 손잡이가 있어서 매체·상품 너비를 못 늘렸다). */
function wirePivotColResize(tbl,cfg,cols,rerender){
  const gs=(cfg.groups||[]).filter(g=>g.cols.length);
  const soloThs=[...tbl.querySelectorAll('thead th.g.solo')];
  const row2=tbl.tHead&&tbl.tHead.rows[1]?[...tbl.tHead.rows[1].cells]:[];
  const leadN=(cfg.rows&&cfg.rows.length?cfg.rows.length:1);
  const leadThs=tbl.tHead&&tbl.tHead.rows[0]?[...tbl.tHead.rows[0].cells].slice(0,leadN):[];
  const ths=[];let si=0,ri=0;
  gs.forEach(g=>{
    if(g.solo&&g.cols.length===1)ths.push(soloThs[si++]);
    else g.cols.forEach(()=>ths.push(row2[ri++]));});
  /* 행 머리 열 — 키는 '_row0','_row1' … 로 저장한다 */
  leadThs.forEach((th,i)=>grip(th,'_row'+i,i));
  ths.forEach((th,i)=>grip(th,cols[i],leadN+i));
  function grip(th,key,colIdx){
    if(!th||th.querySelector('.colgrip'))return;
    th.classList.add('cresz');
    /* 손잡이는 th 를 기준으로 붙어야 한다 — 머리글이 static 이면 표 전체 오른쪽 끝에 붙어
       실제로는 잡히지 않았다 (sticky 인 머리글은 그대로 둔다) */
    /* 그립은 절대 배치라 부모 th 가 배치 기준이어야 한다.
       다만 static -> relative 로 바꾸면 sticky 용으로 걸어 둔 top(2행 헤더의 33px)이
       그대로 살아나 셀이 아래로 밀린다 — 그래서 top 도 함께 0 으로 못 박는다. */
    if(getComputedStyle(th).position==='static'){th.style.position='relative';th.style.top='0';}
    const g=document.createElement('span');
    g.className='colgrip';g.title='드래그해서 열 너비 조정 · 더블클릭하면 자동';
    th.appendChild(g);
    let x0=0,w0=0;
    const move=e=>{
      const w=Math.max(52,Math.round(w0+e.clientX-x0));
      cfg.w=cfg.w||{};cfg.w[key]=w;
      th.style.minWidth=w+'px';th.style.width=w+'px';
      const cg=tbl.querySelector('colgroup');
      if(cg&&cg.children[colIdx])cg.children[colIdx].style.width=w+'px';};
    const up=()=>{document.removeEventListener('mousemove',move);
      document.removeEventListener('mouseup',up);
      document.body.classList.remove('colresizing');
      /* 행 머리 열 폭이 바뀌었으면 고정 위치도 다시 잡는다 */
      try{freezeLeadCols(tbl,leadN);}catch(e){}
      try{markDirty();saveLocal();}catch(e){}};
    g.addEventListener('mousedown',e=>{
      e.preventDefault();e.stopPropagation();
      x0=e.clientX;w0=th.getBoundingClientRect().width;
      document.body.classList.add('colresizing');
      document.addEventListener('mousemove',move);
      document.addEventListener('mouseup',up);});
    g.addEventListener('dblclick',e=>{
      e.stopPropagation();
      if(cfg.w)delete cfg.w[key];
      try{markDirty();saveLocal();}catch(x){}
      rerender&&rerender();});}
}
/* ---------- 가로 넘김 버튼 (v75) ----------
   표가 옆으로 넘칠 때 스크롤바 대신 양옆에 둥근 ‹ › 단추를 띄운다 (애플 스토어 진열대처럼).
   · 한 번에 "보이는 폭 − 고정 열(행 머리)" 의 85% 쯤 넘기고, **열 경계에 맞춰** 멈춘다
   · 왼쪽 단추는 고정 열(.lfz) 바로 오른쪽에 — 매체·상품 이름을 가리지 않게
   · 세로로는 표의 "화면에 보이는 부분" 한가운데 — 긴 표라도 단추가 화면 밖으로 나가지 않는다
   · 스크롤바만 감춘 것이라 트랙패드 · Shift+휠 가로 스크롤은 그대로 된다
   · 떠 있는 머리글(.ghfix)은 wrap 의 scroll 이벤트를 따라가므로 부드러운 이동에도 함께 움직인다 */
/* 왼쪽에 붙어 있는(가로 고정) 열의 폭 — .lfz 든, 가로 sticky(left≠auto) 든 */
function hpFrozenW(wrap){
  const t=wrap.querySelector('table');if(!t||!t.tHead)return 0;
  const wl=wrap.getBoundingClientRect().left;let w=0;
  t.tHead.querySelectorAll('th').forEach(th=>{
    if(!th.classList.contains('lfz')){const cs=getComputedStyle(th);if(cs.position!=='sticky'||cs.left==='auto')return;}
    const r=th.getBoundingClientRect();if(r.width)w=Math.max(w,r.right-wl);});
  return Math.max(0,Math.round(w));}
/* 스크롤 좌표로 본 "멈출 자리"들 — 표면 머리글 잎(묶음이 아닌 칸), 카드 줄이면 카드 */
function hpColStarts(wrap){
  const wl=wrap.getBoundingClientRect().left,sl=wrap.scrollLeft,out=new Set();
  const t=wrap.querySelector('table');
  const cells=t&&t.tHead?[...t.tHead.querySelectorAll('th')].filter(th=>th.colSpan<=1):[...wrap.children];
  cells.forEach(el=>{
    if(el.classList.contains('lfz')||el.classList.contains('hpbtn'))return;
    if(el.tagName==='TH'){const cs=getComputedStyle(el);if(cs.position==='sticky'&&cs.left!=='auto')return;}
    const r=el.getBoundingClientRect();if(r.width)out.add(Math.round(r.left-wl+sl));});
  return [...out].sort((a,b)=>a-b);}
function hpGo(wrap,dir,o){
  if(o&&o.go){o.go(dir);return;}
  const fz=o&&o.frozen?o.frozen():hpFrozenW(wrap),view=wrap.clientWidth-fz,max=wrap.scrollWidth-wrap.clientWidth;
  const cur=wrap.scrollLeft,step=Math.max(120,view*0.85);
  /* 고정 열 바로 오른쪽 경계(=cur+fz)에 열(카드) 시작이 오도록 맞춘다 */
  const starts=hpColStarts(wrap).map(x=>x-fz-(o&&o.pad||0));
  let to=dir>0?cur+step:cur-step;
  if(dir>0){const c=starts.filter(x=>x>cur+8&&x<=to);if(c.length)to=c[c.length-1];}
  else{const c=starts.filter(x=>x>=to&&x<cur-8);if(c.length)to=c[0];}
  to=Math.max(0,Math.min(max,to));
  wrap.scrollTo({left:to,behavior:'smooth'});}
function hpPaint(P){
  const {card,wrap,L,R,o}=P;
  if(!card.isConnected)return false;
  const max=wrap.scrollWidth-wrap.clientWidth,over=max>2&&wrap.offsetParent;
  /* 카드 줄은 scroll-snap 과 안쪽 여백 때문에 맨 앞에서도 몇 px 밀려 있을 수 있다 — 8px 까지는 "처음"으로 본다 */
  L.classList.toggle('on',!!over&&wrap.scrollLeft>8);
  R.classList.toggle('on',!!over&&wrap.scrollLeft<max-8);
  wrap.classList.toggle('hpover',!!over);
  /* 세로 스크롤 상자 — 가로 막대만 카드 밖으로 밀어 잘라 낸다 (위 CSS 설명) */
  if(o.keepY){const cs=getComputedStyle(wrap);
    const sb=Math.max(0,wrap.offsetHeight-wrap.clientHeight-(parseFloat(cs.borderTopWidth)||0)-(parseFloat(cs.borderBottomWidth)||0)-(parseFloat(wrap.style.marginBottom)?0:0));
    const cur=-(parseFloat(wrap.style.marginBottom)||0);
    if(over&&sb!==cur)wrap.style.marginBottom=sb?(-sb)+'px':'';
    if(!over&&cur)wrap.style.marginBottom='';}
  if(!over)return true;
  const cr=card.getBoundingClientRect(),wr=wrap.getBoundingClientRect();
  const top=(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stick'),10)||94)+40;
  const vt=Math.max(wr.top,top),vb=Math.min(wr.bottom,innerHeight-10);
  const y=vb>vt?(vt+vb)/2-cr.top:(wr.top+wr.bottom)/2-cr.top;
  L.style.top=R.style.top=Math.round(y)+'px';
  const fz=o.frozen?o.frozen():hpFrozenW(wrap);
  L.style.left=Math.round(wr.left-cr.left+fz+10)+'px';
  R.style.right=Math.round(cr.right-wr.right+10)+'px';
  return true;}
/* host = 단추를 얹을 상자(position:relative 가 된다), wrap = 옆으로 넘치는 상자.
   o.go(dir) — 넘기는 방법을 직접 줄 때(일자별 효율: 블록 단위로 여러 표를 함께) · o.frozen() — 고정 폭을 직접 잴 때
   o.keepY — 세로 스크롤이 있는 상자라 가로 스크롤바만 감춘다 */
function enableHPager(card,wrap,o){
  if(!card||!wrap)return;o=o||{};
  card.classList.add('hpcard');wrap.classList.add('hpwrap');wrap.classList.toggle('hpy',!!o.keepY);
  card.classList.toggle('hpclip',!!o.keepY);
  card.querySelectorAll(':scope>.hpbtn').forEach(b=>b.remove());
  /* 위쪽 거울 스크롤바가 먼저 붙어 있었다면 떼어 낸다 (버튼과 둘 다 있을 필요가 없다) */
  const ts=wrap.previousElementSibling;if(ts&&ts.classList.contains('topscroll'))ts.remove();
  const mk=(cls,dir,lab)=>{const b=el('button','hpbtn '+cls,card);b.type='button';b.title=lab;b.setAttribute('aria-label',lab);
    b.innerHTML=`<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="${dir<0?'M12.5 4.5 7 10l5.5 5.5':'M7.5 4.5 13 10l-5.5 5.5'}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    b.onclick=e=>{e.stopPropagation();hpGo(wrap,dir,o);};return b;};
  const P={card,wrap,o,L:mk('l',-1,'이전'),R:mk('r',1,'다음')};
  const paint=()=>hpPaint(P);
  if(!wrap.__hpScroll){wrap.__hpScroll=1;
    wrap.addEventListener('scroll',()=>{cancelAnimationFrame(wrap.__hpRaf);wrap.__hpRaf=requestAnimationFrame(()=>wrap.__hpPaint&&wrap.__hpPaint());},{passive:true});
    try{new ResizeObserver(()=>wrap.__hpPaint&&wrap.__hpPaint()).observe(wrap);}catch(e){}}
  wrap.__hpPaint=paint;
  if(!window.__hpList){window.__hpList=[];
    const run=()=>{window.__hpList=window.__hpList.filter(f=>f());};
    let raf=0;const q=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run);};
    addEventListener('scroll',q,{passive:true});addEventListener('resize',q);}
  /* 같은 상자에 다시 걸면 예전 그리기 함수는 목록에서 빠진다 (다시 그릴 때마다 쌓이지 않게) */
  if(card.__hpPaint){const i=window.__hpList.indexOf(card.__hpPaint);if(i>=0)window.__hpList.splice(i,1);}
  /* 다시 그려 떨어져 나간 상자도 여기서 걷어 낸다 — 스크롤이 없으면 옛 화면을 계속 붙잡고 있었다 (v78) */
  window.__hpList=window.__hpList.filter(f=>!f.__card||f.__card.isConnected);
  paint.__card=card;card.__hpPaint=paint;window.__hpList.push(paint);
  setTimeout(paint,0);setTimeout(paint,360);}
/* 카드 줄(주요 지표 · KPI 달성 현황) — 스크롤 상자를 한 겹 감싸 단추를 얹는다.
   감싼 상자에도 같은 data-sect 를 줘서 영역 관리(순서 · 숨기기)가 그대로 따라온다 */
function hpStrip(id){
  const s=$(id);if(!s)return;
  let box=s.parentElement;
  if(!box.classList.contains('hpbox')){
    box=document.createElement('div');box.className='hpbox';
    if(s.dataset.sect)box.dataset.sect=s.dataset.sect;
    s.parentNode.insertBefore(box,s);box.appendChild(s);}
  enableHPager(box,s,{frozen:()=>0});}
function renderSummaries(){
  const host=$('summaryHost');host.innerHTML='';
  SUMMARIES.forEach((s,i)=>{
    if(HIDDEN.has('sum:'+s.id))return;
    const sec=el('div','sec gap3',host);
    sec.innerHTML=`<span data-nm="${i}" style="cursor:${isClient()?'default':'pointer'}">${esc(s.name)}</span>`;
    const tools=el('div','tools',sec);
    /* 붉게 칠한 칸이 무슨 뜻인지 표 옆에 바로 적어 둔다 */
    tools.innerHTML=(s.noCostBad?''
      :`<span class="kpilgd" title="그 라인의 KPI 지표 단가가 목표 단가보다 비싼 칸입니다">`
        +`<i></i>KPI 개선 고려</span>`
        +`<span class="kpilgd soft" title="KPI 는 아니지만 제안(목표) 단가보다 비싼 칸입니다">`
        +`<i></i>제안 대비 저조</span>`)
      +(isClient()?''
      :`<button class="btn sm" data-hide="${i}" title="이 서머리 숨기기">숨기기</button>`)
      +(isClient()?'':`<button class="btn sm${s.noGauge?'':' on'}" data-gauge="${i}"
          title="달성률 막대(게이지)를 숨기거나 다시 표시합니다">${s.noGauge?'게이지 표시':'게이지 숨김'}</button>
      <button class="btn sm${s.noCostBad?'':' on'}" data-costbad="${i}"
          title="&quot;KPI 개선 고려&quot; · &quot;제안 대비 저조&quot; 붉은 표시를 함께 끄거나 켭니다.">${s.noCostBad?'저조 표시':'저조 표시 숨김'}</button>
      <button class="btn sm" data-cfg="${i}">⚙ 헤더 편집</button>
      <button class="btn sm danger" data-del="${i}">서머리 삭제</button>`);
    if(typeof attachInfo==='function')attachInfo(tools,SUM_INFO(),s.name);
    const cfgBox=el('div','hidden',host);
    const card=el('div','card fit',host);
    /* 서머리는 세로 스크롤 없이 전체 높이를 그대로 노출한다 (가로 스크롤만) */
    const tbl=el('table','tbl gln fit cmpt',el('div','tbl-wrap noy hpwrap',card));
    const draw=()=>{tbl.classList.toggle('nogauge',!!s.noGauge);
      buildPivot(tbl,s,SUM_DEF,SUM_CELL,draw);};
    draw();
    /* 가로 스크롤바 대신 좌우 버튼 (v75) */
    try{enableHPager(card,tbl.parentNode);}catch(e){}
    const nm=sec.querySelector('[data-nm]');
    if(!isClient())nm.onclick=()=>{const n=prompt('서머리 이름',s.name);if(n){s.name=n;renderSummaries();}};
    const cb=tools.querySelector('[data-cfg]');
    if(cb)cb.onclick=()=>openBuilder(cfgBox,s,{rowFields:DIMS,catalog:SUM_CATALOG,onApply:draw});
    const gb=tools.querySelector('[data-gauge]');
    if(gb)gb.onclick=()=>{s.noGauge=!s.noGauge;renderSummaries();
      try{markDirty();saveLocal();}catch(e){}};
    const cb2=tools.querySelector('[data-costbad]');
    if(cb2)cb2.onclick=()=>{s.noCostBad=!s.noCostBad;renderSummaries();
      try{markDirty();saveLocal();}catch(e){}};
    const hb=tools.querySelector('[data-hide]');
    if(hb)hb.onclick=()=>{HIDDEN.add('sum:'+s.id);renderSummaries();renderHiddenBar();};
    const db=tools.querySelector('[data-del]');
    if(db)db.onclick=()=>confirmModal(`"${s.name}" 서머리를 삭제할까요?`,'삭제하면 이 영역의 구성이 사라집니다.',
      ()=>{if(SUMMARIES.length>1){SUMMARIES.splice(i,1);renderSummaries();}else alert('마지막 서머리는 삭제할 수 없습니다.');});
  });
}
