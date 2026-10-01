/* ===== 유입 분석 (v92) =====
   사이트 분석 도구(Adobe Analytics 등)에서 받은 IWV(인터랙팅 방문) · 랜딩별 IWV · 체류시간 구간 값을
   매체 · 광고상품 · 소재별로 모아 본다. 디지털 서머리 맨 아래 영역.
   ① 유입 흐름 (Sankey) — 클릭이 어느 랜딩 페이지로 들어왔는지, 얼마나 IWV 로 이어지지 않았는지
   ② 유입 효율 지도 (버블) — 가로 = 클릭 대비 유입률, 세로 = 유입당 단가(위로 갈수록 저렴), 크기 = IWV
   ③ 체류시간 분포 — 100% 막대(짧게 머문 방문 → 오래 머문 방문), 평균 체류시간 순
   ④ 상세 표 — 매체 서머리와 같은 표(헤더 편집 · 머리글 설명 · 정렬 · 열 너비). 행 머리는 '묶음' 을 따르다가 헤더 편집에서 바꾸면 그대로 둔다 (v93)
   데이터가 전혀 없는 캠페인에서는 영역 자체를 감춘다. */
var INF={dim:'media'};
/* IWV 가 이보다 적은 라인은 추적이 빠진 것으로 보고 분석에서 뺀다 — 클릭은 많은데 IWV 가 한두 건이면
   유입률 · 유입당 단가가 0% · 수천만 원으로 튀어 다른 매체가 묻힌다 (표 아래 안내로 알려 준다) */
const INF_MIN=10;
const INF_LAND=[{k:'iwv_tda',l:'TDA'},{k:'iwv_mh',l:'Mobility Hub'},{k:'iwv_mp',l:'Model Page'}];
/* 체류시간 10구간 → 화면에서는 5묶음 */
const INF_BANDS=[
  {l:'15초 미만',en:'<15s',ks:['dw15']},
  {l:'15~59초',en:'15–59s',ks:['dw30','dw60']},
  {l:'1~3분',en:'1–3m',ks:['dw3m']},
  {l:'3~10분',en:'3–10m',ks:['dw5m','dw10m']},
  {l:'10분 이상',en:'10m+',ks:['dw15m','dw20m','dw30m','dw30p']}];
const INF_BAND_OP=[.16,.34,.55,.76,.96];
const infHas=b=>(+b.iwv||0)>0||dwSum(b)>0||INF_LAND.some(x=>(+b[x.k]||0)>0);
const infRate=b=>b.click?b.iwv/b.click:NaN;
const infCpv=b=>b.iwv?b.cost/b.iwv:NaN;
/* 캠페인 전체(기간 무관)에 유입 데이터가 하나라도 있는가 */
function infAny(){try{return FACTS.some(f=>infHas(f));}catch(e){return false;}}
/* 기준(매체 · 광고상품 · 소재)별로 묶는다 — 지금 조회 기간 · 필터를 따른다 */
function infLineStat(){
  const by=new Map();
  factFilter().forEach(f=>{let a=by.get(f.lid);if(!a){a=[];by.set(f.lid,a);}a.push(f);});
  const out=[];
  by.forEach((fs,lid)=>{const b=aggFacts(fs);const l=LINES.find(x=>x.id===lid)||{};
    out.push({lid,l,b,ok:(+b.iwv||0)>=INF_MIN||(!(+b.iwv)&&dwSum(b)>=INF_MIN)});});
  return out;}
function infGroups(dim,okSet){
  const map=new Map();
  factFilter().forEach(f=>{
    if(okSet&&!okSet.has(f.lid))return;
    let key,lab,sub,col;
    if(dim==='product'){key=f.media+'\u0001'+f.product;lab=f.product||'–';sub=f.media;col=f.media;}
    else if(dim==='creative'){key=f.creative;lab=f.creative||'–';sub='';col=f.creative;}
    else{key=f.media;lab=f.media||'–';sub='';col=f.media;}
    let g=map.get(key);if(!g){g={key,lab,sub,col,fs:[]};map.set(key,g);}
    g.fs.push(f);});
  return [...map.values()].map(g=>({key:g.key,lab:g.lab,sub:g.sub,col:g.col,b:aggFacts(g.fs)}));}
const infColor=g=>{if(g.col==='__etc')return 'rgb(150,157,166)';try{const c=hueOf(g.col);return `rgb(${c[0]},${c[1]},${c[2]})`;}catch(e){return 'var(--acc)';}};
const infName=g=>g.sub?`${g.sub} · ${g.lab}`:g.lab;
const infClip=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;};

function renderInflow(){
  const body=$('infBody');if(!body)return;
  const any=infAny();
  document.querySelectorAll('[data-sect="inflow"]').forEach(n=>n.classList.toggle('infnone',!any));
  if(!any){body.innerHTML='';return;}
  const dim=INF.dim||'media';
  /* 머리 단추 */
  const seg=$('infDim');
  if(seg){seg.value=dim;seg.onchange=e=>{INF.dim=e.target.value;infTbl().follow=true;renderInflow();
    try{if(!isClient()){markDirty();saveLocal();}}catch(x){}};}
  /* 추적되는 라인만 — IWV(또는 체류시간) 가 INF_MIN 이상인 라인 */
  const LS=infLineStat();
  const okSet=new Set(LS.filter(x=>x.ok).map(x=>x.lid));
  const all=infGroups(dim,okSet);
  const rows=all.filter(g=>infHas(g.b)).sort((a,b)=>(b.b.iwv||0)-(a.b.iwv||0)||(b.b.click||0)-(a.b.click||0));
  if(!rows.length){body.innerHTML=`<div class="hint infempty">${L('지금 조회 기간에는 유입 데이터가 없습니다. 조회 기간을 넓혀 보세요.','No inflow data in this period. Try a wider date range.')}</div>`;return;}
  const T=aggFacts([]);rows.forEach(g=>{AMET.concat(['cost']).forEach(m=>T[m]+=+g.b[m]||0);});
  /* 추적 데이터가 없는 매체 — 클릭은 있는데 IWV · 체류시간이 없다 */
  /* 빠진 라인 — 매체별로 묶어 "Google (IWV 2)" 처럼 */
  const missM=new Map();
  const okMedia=new Set(LS.filter(x=>x.ok).map(x=>x.l.media));
  LS.filter(x=>!x.ok&&(x.b.click||0)>0).forEach(x=>{const m=(x.l.media||'–')+(okMedia.has(x.l.media)&&x.l.segment?' · '+x.l.segment:'');
    missM.set(m,(missM.get(m)||0)+(+x.b.iwv||0));});
  const miss=[...missM].map(([m,v])=>v?`${m} (IWV ${fmt(v)})`:m);
  const kp=(l,v,s)=>`<div class="infk"><span>${l}</span><b class="mono">${v}</b>${s?`<em>${s}</em>`:''}</div>`;
  /* 맨 위 숫자 4개는 **캠페인 전체 기준** (v95) — 유입 데이터가 없는 매체의 클릭 · 소진금액까지 넣는다.
     (아래 그래프 · 표는 유입을 추적하는 매체만) */
  const A=aggFacts(factFilter());
  body.innerHTML=`<div class="infkpis">
      ${kp('IWV (All)',fmt(A.iwv),L(`전체 클릭 ${fmt(A.click)}`,`${fmt(A.click)} clicks in total`))}
      ${kp(L('클릭 대비 유입률','Inflow / click'),pct(infRate(A)),L('IWV ÷ 캠페인 전체 클릭','IWV ÷ all campaign clicks'))}
      ${kp(L('유입당 단가','Cost per IWV'),won(Math.round(infCpv(A))||0),L(`전체 소진 ${won(Math.round(A.cost))}`,`total spend ${won(Math.round(A.cost))}`))}
      ${kp(L('평균 체류시간','Avg. time on site'),fmtDur(dwAvg(A)),isFinite(dw30Rate(A))?L(`30초 이상 ${pct(dw30Rate(A),1)}`,`${pct(dw30Rate(A),1)} stay 30s+`):'')}
    </div>
    <div class="infgrid">
      <div class="infcell"><div class="infh"><b>${L('유입 흐름','Inflow flow')}</b><span>${L('노출 → 클릭 → 유입 → 랜딩 페이지 · 단계마다 배율이 달라요 · 띠에 마우스를 올리면 잔존율','impressions → clicks → inflow → landing page · each stage has its own scale · hover a band for retention')}</span></div>
        <div class="infsk" id="infSankey"></div></div>
      <div class="infcell"><div class="infh"><b>${L('유입 효율 지도','Inflow efficiency map')}</b><span>${L('오른쪽 = 유입률 높음 · 위 = 단가 낮음 · 크기 = IWV','right = higher rate · up = cheaper · size = IWV')}</span></div>
        <div class="infmap" id="infMap"></div></div>
    </div>
    <div class="infcell"><div class="infh"><b>${L('체류시간 분포','Time on site')}</b><span>${L('방문을 머문 시간 구간으로 나눈 비율 · 평균 체류시간 순','Share of visits by time spent · sorted by average')}</span>
        <span class="infbl">${INF_BANDS.map((x,i)=>`<i style="--op:${INF_BAND_OP[i]}"></i>${L(x.l,x.en)}`).join('')}</span></div>
      <div id="infDwell"></div></div>
    <div class="infcell"><div class="infh"><b>${L('유입 효율 상세분석','Inflow efficiency details')}</b><span>${L('머리글을 누르면 설명 · 정렬','click a header for its description · sorting')}</span>
        ${isClient()?'':`<button class="btn sm infcfg" id="infCfgBtn">${L('⚙ 헤더 편집','⚙ Edit headers')}</button>`}</div>
      <div class="hidden" id="infCfgBox"></div>
      <div class="tbl-wrap noy" id="infTblWrap"><table class="tbl gln fit cmpt inftbl" id="infTbl"></table></div></div>
    ${miss.length?`<div class="hint infmiss">${L(`IWV 가 없거나 ${INF_MIN}건 미만이라 분석에서 뺀 매체`,`Excluded (no IWV or fewer than ${INF_MIN})`)}: <span data-noi18n>${esc(miss.join(' · '))}</span></div>`:''}`;
  try{infSankey($('infSankey'),rows,T);}catch(e){console.warn(e);}
  try{infMap($('infMap'),rows,T);}catch(e){console.warn(e);}
  try{infDwell($('infDwell'),rows);}catch(e){console.warn(e);}
  INF_OK=okSet;
  try{infTable();}catch(e){console.warn(e);}
  const cb=$('infCfgBtn');
  if(cb)cb.onclick=()=>{const box=$('infCfgBox');if(!box)return;
    if(!box.classList.contains('hidden')&&box.firstChild){box.classList.add('hidden');box.innerHTML='';return;}
    const cfg=infTbl();
    openBuilder(box,cfg,{rowFields:DIMS,catalog:SUM_CATALOG,onApply:()=>{
      /* 행 머리를 바꾸면 그때부터는 '묶음' 을 따르지 않는다 (묶음을 다시 고르면 다시 따른다) */
      const want=(INF_DIM_ROWS[INF.dim]||INF_DIM_ROWS.media).map(r=>r.k).join('|');
      if(cfg.rows.map(r=>r.k).join('|')!==want)cfg.follow=false;
      infTable();try{markDirty();saveLocal();}catch(e){}}});};
}

/* ---------- ① 유입 흐름 (v96 — 4단계 깔때기) ----------
   노출 → 클릭 → 유입(IWV) → 랜딩 페이지.
   · 단계마다 숫자 단위가 수백~수천 배씩 차이 나므로 **단계마다 배율을 따로** 잡는다.
     기둥 길이는 단계 합계의 자릿수(로그)에 맞춰 조금씩 짧아져 깔때기처럼 보이고,
     기둥 안에서 매체가 차지하는 길이는 그 단계에서의 비중이다.
   · 매체 색 띠는 단계를 건널 때마다 그 단계 비중만큼 굵어지거나 가늘어진다 —
     클릭은 많은데 유입이 적은 매체는 띠가 확 가늘어진다
   · 띠에 마우스를 올리면 그 단계를 넘어간 비율(잔존율 — CTR · 유입률)이 나온다 */
function infSankey(host,rows0,T){
  if(!host)return;
  const lands=INF_LAND.filter(x=>rows0.some(g=>(+g.b[x.k]||0)>0));
  const landSum=g=>lands.reduce((s,x)=>s+(+g.b[x.k]||0),0);
  const iwvOf=g=>Math.max(+g.b.iwv||0,landSum(g));
  const clkOf=g=>Math.max(+g.b.click||0,iwvOf(g));
  const impOf=g=>Math.max(+g.b.imp||0,clkOf(g));
  /* 왼쪽 마디 — 유입 많은 순 9개 + 그 외 */
  let rows=rows0.slice().sort((a,b)=>iwvOf(b)-iwvOf(a)||clkOf(b)-clkOf(a));
  if(rows.length>10){const rest=rows.slice(9),b=aggFacts([]);rest.forEach(g=>{AMET.concat(['cost']).forEach(m=>b[m]+=+g.b[m]||0);});
    rows=rows.slice(0,9).concat([{key:'__etc',lab:L(`그 외 ${rest.length}개`,`${rest.length} more`),sub:'',col:'__etc',b}]);}
  rows=rows.filter(g=>impOf(g)>0);
  if(!rows.length){host.innerHTML='';return;}
  const R=lands.map(x=>({k:x.k,l:x.l,kind:'land'}));
  const otherOf=g=>Math.max((+g.b.iwv||0)-landSum(g),0);
  if(rows.some(g=>otherOf(g)>0))R.push({k:'__other',l:L('랜딩 구분 없음','other landing'),kind:'other'});
  const flowTo=(g,r)=>r.kind==='land'?(+g.b[r.k]||0):otherOf(g);
  const ST=[{k:'imp',l:L('노출','Impressions'),v:impOf},{k:'click',l:L('클릭','Clicks'),v:clkOf},{k:'iwv',l:L('유입 (IWV)','Inflow (IWV)'),v:iwvOf}];
  const TOT=ST.map(s=>rows.reduce((a,g)=>a+s.v(g),0));
  /* ---- 자리 ---- */
  const W=Math.max(host.clientWidth||720,420);
  const TOP=44,BOT=24,NW=10,SG=3;
  const LW=Math.min(150,W*.18),RW=Math.min(140,W*.18);
  const x3=W-RW-NW,span=(x3-LW)/3;
  const X=[LW,LW+span,LW+2*span,x3];
  const HM=Math.max(300,Math.min(480,rows.length*44+60));
  /* 기둥 길이 — 합계의 자릿수 비율 (노출 기둥 = 1). 너무 짧아지지 않게 아래를 받친다 */
  const lg=v=>Math.log10(Math.max(v,1));
  const HK=TOT.map((t,k)=>k?HM*Math.min(1,Math.max(.42,lg(t)/Math.max(lg(TOT[0]),1))):HM);
  const mid=TOP+HM/2;
  /* 기둥마다 매체 마디 — 비중대로 나누고 마디 사이 SG 띄움 */
  const COLS=ST.map((s,k)=>{const vals=rows.map(g=>s.v(g)),n=vals.filter(v=>v>0).length;
    const avail=HK[k]-SG*Math.max(n-1,0),tot=TOT[k]||1;
    let y=mid-HK[k]/2;return vals.map(v=>{const h=v>0?Math.max(v/tot*avail,1):0;const o={y,h,used:0};y+=h+(h>0?SG:0);return o;});});
  /* 랜딩 페이지 기둥 — 유입 기둥과 같은 배율 */
  const kI=(HK[2]-SG*Math.max(rows.filter(g=>iwvOf(g)>0).length-1,0))/(TOT[2]||1);
  const rv=R.map(r=>rows.reduce((s,g)=>s+flowTo(g,r),0));
  const RG=10,rH=rv.reduce((s,v)=>s+Math.max(v*kI,2),0)+RG*Math.max(R.length-1,0);
  let ry=mid-rH/2;const RN=rv.map(v=>{const h=Math.max(v*kI,2);const o={y:ry,h,used:0};ry+=h+RG;return o;});
  const band=(xa,ya,ha,xb,yb,hb)=>{const cx=(xa+xb)/2;
    return `M${xa},${ya} C${cx},${ya} ${cx},${yb} ${xb},${yb} L${xb},${yb+hb} C${cx},${yb+hb} ${cx},${ya+ha} ${xa},${ya+ha} Z`;};
  let paths='',nodes='',labs='';
  /* 단계 사이 띠 (매체별) */
  rows.forEach((g,i)=>{const col=infColor(g);
    for(let k=0;k<2;k++){const a=COLS[k][i],b=COLS[k+1][i];if(!a.h)continue;
      const hb=b.h||0.8;
      paths+=`<path class="sklink fn" d="${band(X[k]+NW,a.y,a.h,X[k+1],b.h?b.y:b.y-0.4,hb)}" style="fill:${col}" data-i="${i}" data-k="${k}"></path>`;}
    ST.forEach((s,k)=>{const c=COLS[k][i];if(!c.h)return;
      nodes+=`<rect class="sknode" x="${X[k]}" y="${c.y}" width="${NW}" height="${c.h}" style="fill:${col}" data-i="${i}" data-k="${k}"></rect>`;});});
  /* 유입 → 랜딩 페이지 */
  rows.forEach((g,i)=>{const z=COLS[2][i];z.used=0;R.forEach((r,j)=>{const v=flowTo(g,r);if(!(v>0))return;
    const h=v*kI,a=z.y+z.used,b=RN[j].y+RN[j].used;z.used+=h;RN[j].used+=h;
    paths+=`<path class="sklink zf" d="${band(X[2]+NW,a,h,X[3],b,h)}" style="fill:${infColor(g)}" data-i="${i}" data-j="${j}" data-v="${v}" data-k="2"></path>`;});});
  /* 이름표 겹침 피하기 — 가운데 값들을 위아래로 벌려 최소 간격을 지킨다 */
  const spread=(cs,gap,lo,hi)=>{const o=cs.map((c,i)=>({c,i,y:c})).sort((a,b)=>a.c-b.c);
    for(let k=1;k<o.length;k++)if(o[k].y<o[k-1].y+gap)o[k].y=o[k-1].y+gap;
    const over=o.length?o[o.length-1].y-hi:0;if(over>0)o.forEach(x=>x.y-=over);
    for(let k=o.length-2;k>=0;k--)if(o[k].y>o[k+1].y-gap)o[k].y=o[k+1].y-gap;
    const under=o.length?lo-o[0].y:0;if(under>0)o.forEach(x=>x.y+=under);
    const out=[];o.forEach(x=>out[x.i]=x.y);return out;};
  const rate=(a,b)=>a?b/a:NaN;
  const pf=v=>pct(v,v<.01?2:1);
  /* 왼쪽 — 매체 이름 · 노출 */
  const c0=COLS[0].map(c=>c.y+c.h/2),l0=spread(c0,30,TOP+6,TOP+HM-6);
  rows.forEach((g,i)=>{const y=l0[i],c=COLS[0][i];
    if(Math.abs(y-c0[i])>2)labs+=`<path class="sklead" d="M${X[0]-6},${y} L${X[0]-1},${c0[i]}"></path>`;
    labs+=`<text class="sklab" x="${X[0]-9}" y="${y-2}" text-anchor="end" data-i="${i}">${esc(infClip(g.lab,18))}</text>
      <text class="skval" x="${X[0]-9}" y="${y+11}" text-anchor="end">${L('노출','imps')} ${fmt(impOf(g))}</text>`;});
  /* 오른쪽 — 랜딩 페이지 */
  const c3=RN.map(n=>n.y+n.h/2),l3=spread(c3,30,TOP+6,TOP+HM-6);
  R.forEach((r,j)=>{const n=RN[j];
    nodes+=`<rect class="sknode r" x="${X[3]}" y="${n.y}" width="${NW}" height="${n.h}" rx="2" style="fill:${r.kind==='other'?'var(--gline)':'var(--acc)'}" data-j="${j}"></rect>`;
    const y=l3[j];
    labs+=`<text class="sklab" x="${X[3]+NW+8}" y="${y-2}" data-j="${j}">${esc(r.l)}</text>
      <text class="skval" x="${X[3]+NW+8}" y="${y+11}">${fmt(rv[j])} · ${pct(TOT[2]?rv[j]/TOT[2]:NaN,1)}</text>`;});
  /* 단계 이름 · 합계 · 단계를 넘어간 비율 */
  const cap=(x,t1,t2,a)=>`<text class="skcap" x="${x}" y="${TOP-24}" text-anchor="${a}">${t1}</text>`
    +`<text class="skcapv" x="${x}" y="${TOP-10}" text-anchor="${a}">${t2}</text>`;
  labs+=cap(X[0]+NW/2,L('노출','Impressions'),fmt(TOT[0]),'middle')
    +cap(X[1]+NW/2,L('클릭','Clicks'),fmt(TOT[1]),'middle')
    +cap(X[2]+NW/2,L('유입 (IWV)','Inflow (IWV)'),fmt(TOT[2]),'middle')
    +cap(X[3]+NW/2,L('랜딩 페이지','Landing page'),'','middle');
  /* 단계 사이 잔존율 배지 (전체) */
  /* 단계 사이 전체 잔존율 — 기둥 아래(띠 사이 빈 곳)에 */
  const badge=(xa,xb,t,v)=>`<g class="skrate" data-k="${t}"><text x="${(xa+xb)/2}" y="${TOP+HM+12}" text-anchor="middle"><tspan class="skr1">${t==='0'?'CTR':L('유입률','inflow rate')}</tspan> <tspan class="skr2">${v}</tspan></text></g>`;
  labs+=badge(X[0]+NW,X[1],'0',pf(rate(TOT[0],TOT[1])))+badge(X[1]+NW,X[2],'1',pf(rate(TOT[1],TOT[2])));
  const Hh=TOP+HM+BOT;
  host.innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" class="sksvg">${paths}${nodes}${labs}</svg>`;
  /* ---- 마우스 ---- */
  const svg=host.querySelector('svg');
  const hl=fn=>svg.querySelectorAll('.sklink').forEach(p=>p.classList.toggle('dim',!fn(p)));
  const tr=(l,v)=>`<div class="r"><span class="l">${l}</span><b>${v}</b></div>`;
  const STEP=[[L('노출 → 클릭','imps → clicks'),'CTR'],[L('클릭 → 유입','clicks → inflow'),L('유입률 (IWV ÷ 클릭)','inflow rate (IWV ÷ clicks)')]];
  svg.querySelectorAll('.sklink').forEach(p=>{
    const g=rows[+p.dataset.i],k=+p.dataset.k;
    p.addEventListener('mousemove',e=>{hl(q=>q===p);let h;
      if(k<2){const a=ST[k].v(g),b=ST[k+1].v(g);
        h=`<div class="t">${esc(infName(g))} · ${STEP[k][0]}</div>`+tr(ST[k].l,fmt(a))+tr(ST[k+1].l,fmt(b))
          +tr(L('잔존율','retained')+' · '+STEP[k][1],pf(rate(a,b)))+tr(L('이탈','dropped'),fmt(a-b));}
      else{const r=R[+p.dataset.j],v=+p.dataset.v;
        h=`<div class="t">${esc(infName(g))} → ${esc(r.l)}</div>`+tr(L('유입','inflow'),fmt(v))
          +tr(L('이 매체 유입 중','of its inflow'),pct(iwvOf(g)?v/iwvOf(g):NaN,1));}
      showTip(e.clientX,e.clientY,h);});
    p.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});});
  svg.querySelectorAll('.sknode,.sklab').forEach(n=>{
    const on=()=>{if(n.dataset.i!=null)hl(p=>p.dataset.i===n.dataset.i);else if(n.dataset.j!=null)hl(p=>p.dataset.j===n.dataset.j);};
    n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});
    if(n.dataset.i!=null){const g=rows[+n.dataset.i];
      n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
        +tr(L('노출','Impressions'),fmt(impOf(g)))+tr(L('클릭','Clicks'),fmt(clkOf(g)))+tr('CTR',pf(rate(impOf(g),clkOf(g))))
        +tr(L('유입 (IWV)','Inflow (IWV)'),fmt(iwvOf(g)))+tr(L('유입률','Inflow rate'),pf(rate(clkOf(g),iwvOf(g))))));}});
  /* 단계 사이 전체 잔존율 */
  svg.querySelectorAll('.skrate').forEach(n=>{const k=+n.dataset.k;
    n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${L('전체','All')} · ${STEP[k][0]}</div>`
      +tr(ST[k].l,fmt(TOT[k]))+tr(ST[k+1].l,fmt(TOT[k+1]))+tr(L('잔존율','retained')+' · '+STEP[k][1],pf(rate(TOT[k],TOT[k+1])))));
    n.addEventListener('mouseleave',hideTip);});
}

/* ---------- ② 유입 효율 지도 (버블) ---------- */
function infMap(host,rows0,T){
  if(!host)return;
  const rows=rows0.filter(g=>(g.b.click||0)>0&&(g.b.iwv||0)>0&&(g.b.cost||0)>0);
  if(!rows.length){host.innerHTML=`<div class="hint infempty">${L('클릭 · IWV · 소진금액이 모두 있는 항목이 없어 그릴 수 없습니다.','Needs clicks, IWV and spend.')}</div>`;return;}
  const sk=document.querySelector('#infSankey svg');
  const W=Math.max(host.clientWidth||420,300),H=Math.round(Math.min(460,Math.max(320,sk&&innerWidth>1100?+sk.getAttribute('height')||0:0))),P={l:54,r:14,t:30,b:40};
  const RMAX=rows.length>8?18:rows.length>4?23:27;
  const xs=rows.map(g=>infRate(g.b)),ys=rows.map(g=>infCpv(g.b));
  const xMax=Math.max(...xs,infRate(T)||0)*1.08||1;
  /* 유입당 단가는 몇 백 원 ~ 몇 만 원으로 벌어지므로 로그 눈금 · 위로 갈수록 저렴 */
  const yl=ys.map(v=>Math.log10(v));let ylo=Math.min(...yl),yhi=Math.max(...yl);
  if(yhi-ylo<.3){const m=(ylo+yhi)/2;ylo=m-.15;yhi=m+.15;}
  /* 원이 그림 밖으로 나가지 않게 데이터 자리는 안쪽으로 원 반지름만큼 줄인다 */
  const ix0=P.l+10,ix1=W-P.r-RMAX,iy0=P.t+RMAX,iy1=H-P.b-10;
  const X=v=>ix0+v/xMax*(ix1-ix0);
  const Y=v=>iy0+(Math.log10(v)-ylo)/((yhi-ylo)||1)*(iy1-iy0);   /* 낮은 단가가 위 */
  const maxI=Math.max(...rows.map(g=>g.b.iwv));
  const Rr=v=>4+Math.sqrt(v/maxI)*(RMAX-4);
  /* 눈금 */
  const xt=[];{const st=niceStep(xMax,4);for(let v=0;v<=xMax+1e-9;v+=st)xt.push(v);}
  const yv=v=>{const y=Y(v);return y>=P.t-1&&y<=H-P.b+1;};
  const yt=[];for(let e=Math.floor(ylo)-1;e<=Math.ceil(yhi)+1;e++){[1,2,5].forEach(m=>{const v=m*Math.pow(10,e);if(yv(v))yt.push(v);});}
  const yLab=v=>v>=10000?(LANG==='en'?fmt(v/1000)+'k':(v/10000)+'만'):fmt(v);
  const ax=xt.map(v=>`<line class="mgrid" x1="${X(v)}" x2="${X(v)}" y1="${P.t}" y2="${H-P.b}"></line><text class="mtick" x="${X(v)}" y="${H-P.b+15}" text-anchor="middle">${(v*100).toFixed((v*100)%1?1:0)}%</text>`).join('')
    +yt.map(v=>`<line class="mgrid" x1="${P.l}" x2="${W-P.r}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="mtick" x="${P.l-6}" y="${Y(v)+3}" text-anchor="end">${yLab(v)}</text>`).join('');
  /* 기준선 = 전체 평균 — 오른쪽 위 칸(유입 잘 되고 저렴)을 옅게 칠한다 */
  const ax0=infRate(T),ay0=infCpv(T);
  let mid='';
  if(isFinite(ax0)&&isFinite(ay0)){const qx=Math.min(Math.max(X(ax0),P.l),W-P.r),qy=Math.min(Math.max(Y(ay0),P.t),H-P.b);
    mid=`<rect class="mqbg" x="${qx}" y="${P.t}" width="${W-P.r-qx}" height="${qy-P.t}"></rect>
    <line class="mavg" x1="${qx}" x2="${qx}" y1="${P.t}" y2="${H-P.b}"></line>
    <line class="mavg" x1="${P.l}" x2="${W-P.r}" y1="${qy}" y2="${qy}"></line>
    <text class="mq" x="${W-P.r}" y="${P.t-9}" text-anchor="end">${L('↗ 유입 잘 되고 저렴','↗ high rate · cheap')}</text>
    <text class="mq lo" x="${qx+4}" y="${H-P.b-5}">${L('평균','avg')}</text>`;}
  const order=rows.map((g,i)=>i).sort((a,b)=>rows[b].b.iwv-rows[a].b.iwv);   /* 큰 원을 먼저(뒤에) 깐다 */
  /* 이름표 — 큰 원부터 위 · 아래 · 오른쪽 · 왼쪽 중 겹치지 않는 자리에. 자리가 없으면 생략(툴팁으로 확인) */
  const boxes=[];const hit=(a)=>boxes.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)
    ||a.x<P.l||a.x+a.w>W-P.r+6||a.y<P.t-2||a.y+a.h>H-P.b;
  const tw=t=>[...t].reduce((s,c)=>s+(c.charCodeAt(0)>255?11:6.4),0);
  rows.forEach((g,i)=>{const r=Rr(g.b.iwv);boxes.push({x:X(xs[i])-r*.7,y:Y(ys[i])-r*.7,w:r*1.4,h:r*1.4,dot:1});});
  const labs={};
  order.forEach(i=>{const g=rows[i],cx=X(xs[i]),cy=Y(ys[i]),r=Rr(g.b.iwv),t=infClip(g.lab,14),w=tw(t),h=13;
    const cand=[{x:cx-w/2,y:cy-r-3-h,a:'middle',tx:cx,ty:cy-r-5},{x:cx-w/2,y:cy+r+3,a:'middle',tx:cx,ty:cy+r+13},
      {x:cx+r+4,y:cy-h/2,a:'start',tx:cx+r+4,ty:cy+4},{x:cx-r-4-w,y:cy-h/2,a:'end',tx:cx-r-4,ty:cy+4}];
    const own=boxes.findIndex(b=>b.dot&&Math.abs(b.x+b.w/2-cx)<.01&&Math.abs(b.y+b.h/2-cy)<.01);
    const saved=own>=0?boxes.splice(own,1)[0]:null;
    const c=cand.find(c=>!hit({x:c.x,y:c.y,w,h}));
    if(saved)boxes.push(saved);
    if(c){boxes.push({x:c.x,y:c.y,w,h});labs[i]=`<text class="mlab" x="${c.tx}" y="${c.ty}" text-anchor="${c.a}">${esc(t)}</text>`;}});
  const dots=order.map(i=>{const g=rows[i],cx=X(xs[i]),cy=Y(ys[i]),r=Rr(g.b.iwv),col=infColor(g);
    return `<g class="mdot" data-i="${i}"><circle cx="${cx}" cy="${cy}" r="${r}" class="mc" style="fill:${col};stroke:${col}"></circle></g>`;}).join('');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="msvg">${ax}${mid}${dots}${order.map(i=>labs[i]||'').join('')}
      <text class="maxl" x="${(P.l+W-P.r)/2}" y="${H-4}" text-anchor="middle">${L('클릭 대비 유입률 (IWV ÷ 클릭) →','Inflow rate (IWV ÷ clicks) →')}</text>
      <text class="maxl" transform="translate(12 ${(P.t+H-P.b)/2}) rotate(-90)" text-anchor="middle">${L('유입당 단가 · 위로 갈수록 저렴','Cost per IWV · cheaper upward')}</text></svg>`;
  host.querySelectorAll('.mdot').forEach(n=>{const g=rows[+n.dataset.i];
    n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
      +`<div class="r"><span class="l">${L('클릭 대비 유입률','Inflow rate')}</span><b>${pct(infRate(g.b))}</b></div>`
      +`<div class="r"><span class="l">${L('유입당 단가','Cost per IWV')}</span><b>${won(Math.round(infCpv(g.b)))}</b></div>`
      +`<div class="r"><span class="l">IWV (All)</span><b>${fmt(g.b.iwv)}</b></div>`
      +`<div class="r"><span class="l">${L('평균 체류시간','Avg. time')}</span><b>${fmtDur(dwAvg(g.b))}</b></div>`));
    n.addEventListener('mouseleave',hideTip);});
}

/* ---------- ③ 체류시간 분포 ---------- */
function infDwell(host,rows0){
  if(!host)return;
  const rows=rows0.filter(g=>dwSum(g.b)>0).sort((a,b)=>(dwAvg(b.b)||0)-(dwAvg(a.b)||0));
  if(!rows.length){host.innerHTML=`<div class="hint infempty">${L('체류시간 구간 데이터가 없습니다.','No time-on-site data.')}</div>`;return;}
  host.innerHTML=`<div class="infdw">${rows.map((g,i)=>{const n=dwSum(g.b);
      const segs=INF_BANDS.map((x,bi)=>({bi,v:x.ks.reduce((s,k)=>s+(+g.b[k]||0),0)})).filter(s=>s.v>0);
      return `<div class="dwrow" data-i="${i}">
        <div class="dwl"><b title="${esc(infName(g))}">${esc(g.lab)}</b>${g.sub?`<span>${esc(g.sub)}</span>`:''}</div>
        <div class="dwbar">${segs.map(s=>`<i style="flex:${s.v} 1 0;--op:${INF_BAND_OP[s.bi]}" data-b="${s.bi}" data-v="${s.v}"></i>`).join('')}</div>
        <div class="dwr"><b class="mono">${fmtDur(dwAvg(g.b))}</b><span>${L(`방문 ${fmt(n)}`,`${fmt(n)} visits`)}</span></div></div>`;}).join('')}</div>`;
  host.querySelectorAll('.dwbar i').forEach(seg=>{const g=rows[+seg.closest('.dwrow').dataset.i],b=INF_BANDS[+seg.dataset.b],v=+seg.dataset.v;
    seg.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))} · ${L(b.l,b.en)}</div>`
      +`<div class="r"><span class="l">${L('방문','Visits')}</span><b>${fmt(v)}</b></div>`
      +`<div class="r"><span class="l">${L('비율','Share')}</span><b>${pct(v/dwSum(g.b),1)}</b></div>`));
    seg.addEventListener('mouseleave',hideTip);});
}

/* ---------- ④ 상세 표 (v93 — 매체 서머리와 같은 표) ----------
   헤더 편집 · 머리글 설명/정렬 · 열 너비 · 행 끌어 옮기기가 서머리와 똑같이 된다.
   추적되는 라인(INF_OK)의 실적만 담는다 — 위 숫자 · 그래프의 TOTAL 과 같은 범위 */
var INF_OK=new Set();
var INF_TBL=null;
const INF_DIM_ROWS={media:[{k:'media',sub:false}],
  product:[{k:'media',sub:false},{k:'product',sub:false}],
  creative:[{k:'creative',sub:false}]};
function infTblDefault(){
  const g=(name,cols)=>({id:uid(),name,cols:cols.filter(k=>SUM_CELL[k])});
  return {id:'inflow',name:'유입 상세',follow:true,rows:INF_DIM_ROWS.media.map(r=>({...r})),order:null,
    v96:true,
    groups:[g('노출 · 클릭 · 유입',['imp','click','ctr','iwv','iwvr']),g('비용',['cost','cpiwv']),
      g('랜딩별 IWV',['iwv_tda','iwv_mh','iwv_mp']),g('체류시간',['dwavg','dw30r'])]};}
/* v96 — 예전 구성에 노출 · CTR 열을 보탠다 (클릭 열 앞뒤로, 한 번만) */
function infTblUp(c){
  if(!c||c.v96)return c;
  c.v96=true;
  const has=k=>c.groups.some(g=>g.cols.includes(k));
  const g=c.groups.find(x=>x.cols.includes('click'));
  if(g){const i=g.cols.indexOf('click');
    if(!has('ctr'))g.cols.splice(i+1,0,'ctr');
    if(!has('imp'))g.cols.splice(i,0,'imp');
    if(g.name==='클릭 · 유입')g.name='노출 · 클릭 · 유입';}
  return c;}
const infTbl=()=>infTblUp(INF_TBL||(INF_TBL=infTblDefault()));
/* 처음 정렬 — IWV 많은 순 (머리글에서 바꾸거나 풀 수 있다) */
try{if(!HP_SORT['piv:inflow'])HP_SORT['piv:inflow']={k:'iwv',dir:-1};}catch(e){}
function infTable(){
  const tbl=$('infTbl');if(!tbl)return;
  const cfg=infTbl();
  if(cfg.follow!==false){
    const want=INF_DIM_ROWS[INF.dim]||INF_DIM_ROWS.media;
    if(cfg.rows.map(r=>r.k).join('|')!==want.map(r=>r.k).join('|')){cfg.rows=want.map(r=>({...r}));cfg.order=null;}}
  const draw=()=>buildPivot(tbl,cfg,SUM_DEF,SUM_CELL,draw,{
    facts:factFilter().filter(f=>INF_OK.has(f.lid)),lines:LINES.filter(l=>INF_OK.has(l.id)),fill:true});
  draw();
  try{enableHPager(tbl.closest('.infcell'),tbl.parentNode);}catch(e){}
}

/* 효율 버블이 다시 그려질 때(데이터 · 필터 · 기간이 바뀔 때) 함께 그린다 */
(function(){try{const orig=renderBubble;renderBubble=function(){const r=orig.apply(this,arguments);try{renderInflow();}catch(e){console.warn(e);}return r;};}catch(e){}})();
window.addEventListener('resize',(()=>{let t=0;return ()=>{clearTimeout(t);t=setTimeout(()=>{
  const d=$('tab-dash');if(d&&!d.classList.contains('hidden'))try{renderInflow();}catch(e){}},200);};})());
setTimeout(()=>{try{renderInflow();}catch(e){}},0);
