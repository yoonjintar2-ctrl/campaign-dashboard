/* ===== 5. 일자별 효율 콤보 차트 ===== */
const BAR_METRICS=['imp','click','view','eng','conv','cost'];
const LINE_METRICS=['ctr','vtr','cvr','cpv','cpc','cpa','roas','none'];
const SERIES_DIMS=[{k:'media',l:'매체'},{k:'segment',l:'구분'},{k:'product',l:'상품'},
  {k:'target',l:'타겟팅'},{k:'line',l:'제품'},{k:'creative',l:'소재'}];
let SERIES_DIM='media';
let ISSUE_OVERFLOW=0;
let SHOW_FORECAST=true, SHOW_BENCH=true;
function roundRect(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h));
  return `M${x} ${y+h} L${x} ${y+r} Q${x} ${y} ${x+r} ${y} L${x+w-r} ${y} Q${x+w} ${y} ${x+w} ${y+r} L${x+w} ${y+h} Z`;}
function pickRamp(n){
  const base=['#aab4bf','#8897a6','#677b8d','#495e72','#354758'];
  if(n<=1)return ['#495e72'];
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
function renderDaily(){
  const host=$('chartDaily');host.innerHTML='';
  const bk=$('barSel').value||'imp', lk=$('lineSel').value||'ctr';
  const fs=factFilter();
  const seriesKeys=[...new Set(fs.map(f=>f[SERIES_DIM]))].sort();
  const SC=viewScope(), PS=paceScope();
  /* 조회 기간 슬롯. 다만 "현재 시점까지" 보고 있고 예상값 토글이 켜져 있으면
     미집행 구간 예측을 보여주기 위해 오른쪽 끝을 집행 종료일까지 늘린다. */
  const showFuture=SHOW_FORECAST&&SC.i1>=dIdx(YESTERDAY)&&PS.i1>SC.i1;
  const iEnd=showFuture?PS.i1:SC.i1;
  const ds=ALLDATES.slice(SC.i0,iEnd+1);
  const EL=SC.elapsed;                                 /* 스코프 안 경과 일수 */
  const W=1680,H=480,P={l:82,r:lk==='none'?22:96,t:16,b:36};
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,class:'chart'},host);
  svg.style.height=H+'px';
  const X0=P.l,XW=W-P.l-P.r,PH=H-P.t-P.b,step=XW/ds.length,cx=i=>X0+step*i+step/2;
  const pal=pickRamp(seriesKeys.length);
  const remainDays=Math.max(ds.length-EL,0);
  const expOf=key=>{                                   /* 시리즈별 캠페인 예상 총량 */
    const ls=activeLines().filter(l=>SERIES_DIM==='creative'
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
  const totals=ds.map((_,i)=>sum(series.map(s=>i>=EL?s.fvals[i]:s.vals[i])));
  /* 막대 축 — 눈금을 큰 단위로 끊고, 막대는 플롯의 약 53%까지만 */
  const barTop=(Math.max(...totals)||1)*1.87;
  const bt=niceTicks(0,barTop,3,true);
  const yMax=bt.hi;
  const txt=(x,y,s,anchor)=>{const t=S('text',{x,y,'text-anchor':anchor||'end','font-size':AXIS.size,
    fill:AXIS.fill,'font-weight':AXIS.weight},svg);t.textContent=s;return t;};
  const bigNum=v=>{
    if(bk==='cost')return v>=1e8?(v/1e8).toFixed(v%1e8?1:0)+'억':fmt(v/1e4)+'만';
    if(v>=1e8)return (v/1e8).toFixed(v%1e8?1:0)+'억';
    if(v>=1e4)return (v/1e4).toFixed(v%1e4?1:0)+'만';
    return fmt(v);};
  /* 주 눈금 단위가 커서 값을 읽기 어려우므로 보조 눈금(minor tick)을 함께 그린다 */
  const majStep=bt.ticks.length>1?bt.ticks[1]-bt.ticks[0]:yMax;
  const minorDiv=(()=>{const m=majStep/Math.pow(10,Math.floor(Math.log10(majStep||1)));
    return Math.abs(m-2)<1e-6?4:Math.abs(m-2.5)<1e-6?5:5;})();
  const minStep=majStep/minorDiv;
  for(let v=minStep;v<yMax-1e-6;v+=minStep){
    if(Math.abs(v/majStep-Math.round(v/majStep))<1e-6)continue;
    const y=P.t+PH*(1-v/yMax);
    S('line',{x1:P.l,x2:W-P.r,y1:y,y2:y,stroke:'#f4f6f9','stroke-width':1},svg);
    const t=S('text',{x:P.l-9,y:y+3,'text-anchor':'end','font-size':8.5,fill:'#aab4c0','font-weight':500},svg);
    t.textContent=bigNum(+v.toFixed(6));}
  bt.ticks.forEach(v=>{
    const y=P.t+PH*(1-v/yMax);
    S('line',{x1:P.l,x2:W-P.r,y1:y,y2:y,stroke:v===0?'#d6dde6':'#e6eaf0','stroke-width':1},svg);
    S('line',{x1:P.l-5,x2:P.l,y1:y,y2:y,stroke:'#c5ccd6','stroke-width':1},svg);
    txt(P.l-9,y+3.5,bigNum(v));});
  const bw=Math.min(step-5,24),Y=v=>P.t+PH*(1-v/yMax);
  /* 미집행 구간 음영 */
  if(EL<ds.length)S('rect',{x:X0+step*EL,y:P.t,width:XW-step*EL,height:PH,fill:'#f7f9fb'},svg);
  ds.forEach((d,i)=>{
    let base=Y(0);const future=i>=EL;
    series.forEach((s,si)=>{const v=future?(SHOW_FORECAST?s.fvals[i]:0):s.vals[i];if(v<=0)return;
      const h=PH*(v/yMax),y=base-h;
      S('path',{d:roundRect(cx(i)-bw/2,y,bw,Math.max(h-2,1),si===series.length-1?4:0),
        fill:pal[si],opacity:future?.34:1},svg);
      base=y;});
    const rest=isRest(d);
    const t=S('text',{x:cx(i),y:H-P.b+15,'text-anchor':'middle','font-size':9,
      fill:rest?'#c9a5a2':AXIS.fill},svg);t.textContent=d.getDate();
    if(d.getDate()===1||i===0){
      const m=S('text',{x:cx(i),y:H-P.b+27,'text-anchor':'middle','font-size':9.5,fill:'#8d9cb0','font-weight':600},svg);
      m.textContent=(d.getMonth()+1)+'월';}});
  let lineVals=null;
  if(lk!=='none'){
    lineVals=ds.map((_,i)=>{
      if(i>=EL)return NaN;
      const b=zeroB();
      fs.filter(f=>f.d===SC.i0+i).forEach(f=>{AMET.forEach(m=>b[m]+=f[m]);b.cost+=f.cost;});
      return METRICS[lk].c(b);});
    const ok=lineVals.filter(isFinite);
    const benchV=METRICS[lk].c(aggExp(activeLines()));
    const useBench=SHOW_BENCH&&isFinite(benchV);
    const dom=useBench?ok.concat([benchV]):ok;
    const mn=Math.min(...dom),mx=Math.max(...dom);
    const rg=(mx-mn)||mx*.2||1;
    const lt=niceTicks(mn-rg*.12,mx+rg*.12,3,false);
    const lo=lt.lo,hi=lt.hi;
    const lTop=P.t+PH*0.34,lBot=P.t+PH*0.66;
    const LY=v=>lBot-(num(v)-lo)/(hi-lo)*(lBot-lTop);
    const lfmt=v=>['ctr','vtr','cvr'].includes(lk)?(v*100).toFixed(2)+'%':lk==='roas'?v.toFixed(2)+'x':fmt(v);
    const tickLabels=[];
    lt.ticks.forEach(v=>{const y=LY(v);
      S('line',{x1:W-P.r,x2:W-P.r+5,y1:y,y2:y,stroke:'#e2e7ed','stroke-width':1},svg);
      tickLabels.push({y,el:txt(W-P.r+9,y+3.5,lfmt(v),'start')});});
    const grad=S('linearGradient',{id:'lgrad',x1:'0',y1:'0',x2:'1',y2:'0'},svg);
    S('stop',{offset:'0%','stop-color':'#6497a6'},grad);S('stop',{offset:'55%','stop-color':ACC2},grad);
    S('stop',{offset:'100%','stop-color':'#2c5866'},grad);
    const pts=lineVals.map((v,i)=>isFinite(v)?[cx(i),LY(v)]:null).filter(Boolean);
    if(!pts.length){lineVals=null;}                    /* 계산할 값이 없으면 꺾은선은 그리지 않는다 */
    else{
    /* 꺾은선 — 굵고 반투명하게 (뒤 막대가 비쳐 보이도록) */
    S('path',{d:smoothPath(pts),fill:'none',stroke:'url(#lgrad)','stroke-width':7,opacity:.42,
      'stroke-linecap':'round','stroke-linejoin':'round'},svg);
    S('path',{d:smoothPath(pts),fill:'none',stroke:'url(#lgrad)','stroke-width':2.4,opacity:.85,
      'stroke-linecap':'round','stroke-linejoin':'round'},svg);
    pts.forEach(([x,y])=>S('circle',{cx:x,cy:y,r:3.2,fill:ACC2,opacity:.75,stroke:'#fff','stroke-width':1.4},svg));
    const li=pts.length-1;
    const lb=S('text',{x:pts[li][0]+9,y:pts[li][1]-11,'text-anchor':'start','font-size':12,'font-weight':700,fill:ACC2},svg);
    lb.textContent=METRICS[lk].f(lineVals[EL-1]);
    /* 예상 효율 기준선 — 데이터 레이블은 우측 보조축 자리에 (눈금과 겹치면 그 눈금은 숨김) */
    if(useBench){
      const ev=benchV,y=LY(ev);
      S('line',{x1:X0,x2:W-P.r,y1:y,y2:y,stroke:ACC2,'stroke-width':9,opacity:.15,'stroke-linecap':'round'},svg);
      S('line',{x1:X0,x2:W-P.r,y1:y,y2:y,stroke:ACC2,'stroke-width':1.5,opacity:.5,'stroke-dasharray':'6 4'},svg);
      tickLabels.forEach(t=>{if(Math.abs(t.y-y)<13&&t.el.parentNode)t.el.parentNode.removeChild(t.el);});
      const bx=W-P.r+6;
      S('rect',{x:bx-2,y:y-9.5,width:P.r-9,height:19,rx:5,fill:'#e9f0f3',stroke:ACC2,'stroke-opacity':.35},svg);
      const t2=S('text',{x:bx+3,y:y+3.6,'font-size':10,'font-weight':700,fill:ACC2},svg);
      t2.textContent=`예상 ${METRICS[lk].f(ev)}`;}
    }
  }
  /* 운영 이슈 — 시작일 위치에서 세로선이 솟아 라벨로 연결 · 최대 5줄 */
  ISSUE_OVERFLOW=0;
  if(SHOW_ISSUES){
    const MAXLANE=5,laneEnd=[],laneTop=P.t+PH*0.12;
    ISSUES.slice().sort((a,b)=>dIdx(a.s)-dIdx(b.s)).forEach(is=>{
      const a=dIdx(is.s)-SC.i0,b2=dIdx(is.e)-SC.i0;   /* 스코프 기준 인덱스 */
      if(b2<0||a>ds.length-1)return;
      const ax=cx(Math.max(a,0));
      const g=S('g',{},svg);g.style.cursor='pointer';
      const label=`[${is.type}] ${is.txt}`;
      const t=S('text',{x:0,y:0,'font-size':10.5,fill:'#33495f','font-weight':700},g);
      t.textContent=label;
      const pw=t.getComputedTextLength()+18;
      let li=0;while(laneEnd[li]!==undefined&&laneEnd[li]>ax-8)li++;
      if(li>=MAXLANE){svg.removeChild(g);ISSUE_OVERFLOW++;return;}
      laneEnd[li]=ax+pw;
      const y=laneTop+li*26;
      const rect=S('rect',{x:ax,y,width:pw,height:19,rx:6,fill:'#eef1f5',stroke:'#b9c4d0'});
      g.insertBefore(rect,t);
      t.setAttribute('x',ax+9);t.setAttribute('y',y+13.2);
      const line=S('line',{x1:ax,x2:ax,y1:y+19,y2:H-P.b,stroke:'#c3ccd6','stroke-dasharray':'3 3','stroke-width':1});
      g.insertBefore(line,rect);
      const bw2=Math.max((Math.min(b2,ds.length-1)-Math.max(a,0)+1)*step-3,6);
      const band=S('rect',{x:cx(Math.max(a,0))-step/2+1.5,y:H-P.b-4,width:bw2,height:4,fill:'#a7b3c1',rx:2});
      g.insertBefore(band,line);
      g.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
        `<div class="t">${is.s} ~ ${is.e}</div><div class="r"><span class="l">${esc(is.scope)}</span><b>${is.type}</b></div>
         <div style="margin-top:6px;opacity:.92">${esc(is.txt)}</div>`));
      g.addEventListener('mouseleave',hideTip);
    });
  }
  if(typeof renderIssueAlert==='function')renderIssueAlert();
  ds.forEach((d,i)=>{
    if(i>=EL)return;
    const hit=S('rect',{x:X0+step*i,y:P.t+PH*0.70,width:step,height:PH*0.30,fill:'transparent'},svg);
    hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
      `<div class="t">${dFull(d)} (${WD[d.getDay()]})${holName(d)?' · '+holName(d):''}</div>`+
      series.map((s,si)=>`<div class="r"><span class="l"><span style="width:8px;height:8px;border-radius:2px;background:${pal[si]};display:inline-block"></span>${esc(s.key)}</span><b>${METRICS[bk].f(s.vals[i])}</b></div>`).join('')+
      `<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:5px"><span class="l">${METRICS[bk].l} 합계</span><b>${METRICS[bk].f(totals[i])}</b></div>`+
      (lineVals?`<div class="r"><span class="l"><span class="linekey" style="background:#8fb9c5"></span>${METRICS[lk].l}</span><b>${METRICS[lk].f(lineVals[i])}</b></div>`:'')));
    hit.addEventListener('mouseleave',hideTip);});
  const lg=$('dailyLegend');lg.innerHTML='';
  series.forEach((s,i)=>{const x=el('span','it',lg);
    x.innerHTML=`<span class="dot" style="background:${pal[i]}"></span>${esc(s.key)}`;});
  if(lk!=='none'){const x=el('span','it',lg);
    x.innerHTML=`<span class="linekey"></span><span style="color:var(--acc2);font-weight:700">${METRICS[lk].l}</span> <span style="color:var(--muted)">(우측 축)</span>`;}
  if(SHOW_FORECAST&&remainDays){const x=el('span','it',lg);
    x.innerHTML=`<span class="dot" style="background:${pal[0]};opacity:.34"></span>미집행 구간 예상값 (일할)`;}
  if(SHOW_ISSUES){const x=el('span','it',lg);
    x.innerHTML=`<span style="width:14px;height:9px;border-radius:3px;background:#eef1f5;border:1px solid #b9c4d0;display:inline-block"></span>운영 이슈`;}
}

/* ===== 6. 서머리 ===== */
/* ===== 서머리 열 — 항목 사전(열설정북)에서 생성 ===== */
const SUM_CATALOG=fieldCatalog('dash').concat([{g:'기타',cols:[{k:'period',l:'기간'}]}]);
const SUM_DEF={};SUM_CATALOG.forEach(g=>g.cols.forEach(c=>SUM_DEF[c.k]=c));
/* x: false = 정상 · 'ratio' = 예상값은 표시하되 비율은 의미가 없어 숨김 · 'all' = 예상값 전부 숨김 */
const HA=x=>x==='all';
const SUM_CELL={};
(function buildSumCell(){
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
  SUM_CELL.net=(a,e,x)=>[HA(x)?'–':won(e.netSum)];
  SUM_CELL.value=(a,e,x)=>[HA(x)?'–':won(e.value)];
  SUM_CELL.bonus=(a,e,x)=>[HA(x)?'–':won(e.bonusSum)];
  SUM_CELL.bonusRate=(a,e,x)=>[HA(x)?'–':pct(e.bonusSum/e.budget,1)];
  SUM_CELL.feeA=(a,e,x)=>[HA(x)?'–':pct(e.feeA,1)];
  SUM_CELL.feeR=(a,e,x)=>[HA(x)?'–':pct(e.feeR,1)];
  SUM_CELL.cost=a=>[won(a.cost)];
  SUM_CELL.spend_r=(a,e,x)=>[null,x?NaN:a.cost/e.budget];
  SUM_CELL.progress=()=>[pct(paceRatio(),1)];
  SUM_CELL.start=(a,e,x)=>[HA(x)||!e.dstart?'–':mdy(e.dstart)];
  SUM_CELL.end=(a,e,x)=>[HA(x)||!e.dend?'–':mdy(e.dend)];
  SUM_CELL.startT=()=>['–'];SUM_CELL.endT=()=>['–'];
  /* 기간 — 미디어믹스와 같은 M/D~M/D 표기 */
  SUM_CELL.period=(a,e,x)=>[HA(x)||!e.dstart?'–':`${mdy(e.dstart)}~${mdy(e.dend)}`];
  SUM_CELL.date=()=>['–'];
})();
/* 예상값이 들어가는 열 (소재 단위로 쪼개지면 위·아래 셀을 합쳐 표시) */
SUM_CELL.__exp=new Set(FIELDS.filter(f=>/^e_/.test(f.k)||/_r$/.test(f.k)
  ||['budget','net','value','bonus','bonusRate','feeA','feeR','spend_r','start','end','period'].includes(f.k))
  .map(f=>f.k).concat(['period']));
/* 기본 표시 열 — 열설정북의 "대시보드/데이터입력 탭에 디펄트 표시" 기준 */
const SUM_PRESET=()=>{
  const d=fieldDefaults('dash').filter(k=>k!=='date'&&SUM_CELL[k]);
  const inCat=c=>d.filter(k=>FLD[k].cat===c);
  const vol=[...inCat('노출'),...inCat('클릭'),...inCat('조회')].filter(k=>FLD[k].kind==='in');
  const eff=[...inCat('노출'),...inCat('클릭'),...inCat('조회')].filter(k=>FLD[k].kind==='calc');
  const cost=[...inCat('비용'),...inCat('전환'),...inCat('기타')];
  return {rows:[{k:'media',sub:true},{k:'product',sub:false}],order:null,
    groups:[{id:uid(),name:'집행 조건',cols:['period'],solo:true},
            {id:uid(),name:'실집행 볼륨',cols:vol},
            {id:uid(),name:'효율 · 달성률',cols:eff},
            {id:uid(),name:'비용',cols:cost}]};
};
let SUMMARIES=[{id:'s1',name:'매체 서머리',...SUM_PRESET()},
               {id:'s2',name:'상품 × 타겟팅 서머리',...SUM_PRESET(),
                rows:[{k:'product',sub:true},{k:'target',sub:false}]}];
const gauge=v=>!isFinite(v)?'<span class="na">–</span>'
  :`<span class="gauge"><b class="mono">${pct(v)}</b><span class="track"><i style="width:${Math.min(v,1)*100}%"></i></span></span>`;
function buildPivot(tbl,cfg,cdef,cellDef,rerender){
  const rows=cfg.rows.length?cfg.rows:[{k:'media',sub:false}];
  const dims=rows.map(r=>r.k),noExp=dims.some(d=>NO_EXP_DIMS.includes(d));
  const cols=cfgCols(cfg),seps=gsepSet(cfg);
  const facts=factFilter();
  const map=new Map();
  facts.forEach(f=>{const key=dims.map(d=>f[d]).join(SEP);
    if(!map.has(key))map.set(key,[]);map.get(key).push(f);});
  let entries=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ko'));
  entries=applyOrder(entries,cfg);
  const keys=entries.map(e=>e[0].split(SEP));
  const {out,span}=pivotLayout(keys,rows);
  /* 예상 효율(라인)보다 행이 더 잘게 나뉜 경우:
     예상값은 라인 단위까지만 매칭해 구하고, 같은 라인 그룹에서는 첫 행에만 합쳐서 표시한다.
     (소재·월처럼 라인에 없는 차원으로 쪼개면 값이 흩어져 표시가 안 되기 때문) */
  const expIdx=dims.map((d,i)=>NO_EXP_DIMS.includes(d)?-1:i).filter(i=>i>=0);
  const finer=expIdx.length<dims.length;                 /* 라인보다 잘게 나뉘었는가 */
  const expKey=vals=>expIdx.map(i=>vals[i]).join(SEP);
  const expFor=vals=>aggExp(LINES.filter(l=>expIdx.every(i=>i>=vals.length||l[dims[i]]===vals[i])));
  /* 예상값이 들어가는 열 — 소재처럼 잘게 나뉜 구간에서는 위·아래 셀을 합쳐 한 번만 표시한다 */
  const EXPCOL=cellDef.__exp||new Set();
  const lead=rows.map(r=>`<th rowspan="2">${(DIMS.find(d=>d.k===r.k)||{l:r.k}).l}</th>`);
  let h='<thead>'+groupHeaderHTML(cfg,cdef,lead)+'</thead><tbody>';
  const cells=(a,e,x,merge)=>cols.map((k,i)=>{
    const isExp=EXPCOL.has(k);
    if(merge&&isExp&&merge.skip)return '';               /* 병합된 구간의 두 번째 행부터는 셀 자체를 그리지 않음 */
    const src=(merge&&isExp)?merge.agg:a, ex=(merge&&isExp)?merge.exp:e;
    const [txt,g]=cellDef[k](src,ex,x);
    const rs=(merge&&isExp&&merge.n>1)?` rowspan="${merge.n}"`:'';
    return `<td class="mono${seps.has(i)?' gsep':''}"${rs}>${g!==undefined?gauge(g):txt}</td>`;}).join('');
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
          +` data-pp="${esc(vals.slice(0,ci).join(SEP))}"${sp>1?` rowspan="${sp}"`:''}>${esc(dimDisp(dims[ci],v))}</td>`;});
      h+=cells(aggFacts(fs),expFor(vals),expIdx.length?false:'all',runInfo[i])+'</tr>';
    }else{
      const L=r.level,vals=r.vals;
      h+='<tr class="sub">';
      for(let ci=0;ci<L;ci++){const sp=span[i][ci];if(!sp)continue;
        h+=`<td class="head"${sp>1?` rowspan="${sp}"`:''}>${esc(dimDisp(dims[ci],vals[ci]))}</td>`;}
      h+=`<td class="head" colspan="${dims.length-L}">${esc(dimDisp(dims[L],vals[L]))} 소계</td>`;
      const gf=facts.filter(f=>vals.every((v,x)=>f[dims[x]]===v));
      h+=cells(aggFacts(gf),expFor(vals),expIdx.length?false:'all')+'</tr>';
    }});
  h+=`<tr class="total"><td class="head" colspan="${dims.length}">TOTAL</td>`
    +cells(aggFacts(facts),aggExp(activeLines()),expIdx.length?false:'all')+'</tr></tbody>';
  tbl.innerHTML=h;
  applyColWidths(tbl,cfg,cols);
  wireGroupRename(tbl,cfg,rerender);
  if(rerender)enableRowDrag(tbl,cfg,rerender);
}
function renderSummaries(){
  const host=$('summaryHost');host.innerHTML='';
  SUMMARIES.forEach((s,i)=>{
    if(HIDDEN.has('sum:'+s.id))return;
    const sec=el('div','sec gap3',host);
    sec.innerHTML=`<span data-nm="${i}" style="cursor:${isClient()?'default':'pointer'}">${esc(s.name)}</span>`;
    const tools=el('div','tools',sec);
    tools.innerHTML=`<button class="btn sm" data-hide="${i}" title="이 서머리 숨기기">숨기기</button>`
      +(isClient()?'':`<button class="btn sm" data-cfg="${i}">⚙ 구성 편집</button>
      <button class="btn sm danger" data-del="${i}">서머리 삭제</button>`);
    const cfgBox=el('div','hidden',host);
    const card=el('div','card fit',host);
    /* 서머리는 세로 스크롤 없이 전체 높이를 그대로 노출한다 (가로 스크롤만) */
    const tbl=el('table','tbl gln fit',el('div','tbl-wrap noy',card));
    const draw=()=>buildPivot(tbl,s,SUM_DEF,SUM_CELL,draw);
    draw();
    const nm=sec.querySelector('[data-nm]');
    if(!isClient())nm.onclick=()=>{const n=prompt('서머리 이름',s.name);if(n){s.name=n;renderSummaries();}};
    const cb=tools.querySelector('[data-cfg]');
    if(cb)cb.onclick=()=>openBuilder(cfgBox,s,{rowFields:DIMS,catalog:SUM_CATALOG,onApply:draw});
    const hb=tools.querySelector('[data-hide]');
    if(hb)hb.onclick=()=>{HIDDEN.add('sum:'+s.id);renderSummaries();renderHiddenBar();};
    const db=tools.querySelector('[data-del]');
    if(db)db.onclick=()=>confirmModal(`"${s.name}" 서머리를 삭제할까요?`,'삭제하면 이 영역의 구성이 사라집니다.',
      ()=>{if(SUMMARIES.length>1){SUMMARIES.splice(i,1);renderSummaries();}else alert('마지막 서머리는 삭제할 수 없습니다.');});
  });
}
