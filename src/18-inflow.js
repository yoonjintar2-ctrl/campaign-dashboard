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
      <div class="infcell"><div class="infh"><b>${L('유입 흐름','Inflow flow')}</b><span>${L('클릭 → 웹 비짓(이탈은 아래로 흐려짐) → 유입 사이트 · 웹 비짓부터는 확대해서 그림','clicks → web visits (drop-off fades down) → landing site · web visits are zoomed in')}</span></div>
        <div class="infsk" id="infSankey"></div></div>
      <div class="infcell"><div class="infh"><b>${L('유입 효율 지도','Inflow efficiency map')}</b><span>${L('오른쪽 = 유입률 높음 · 위 = 단가 낮음 · 크기 = IWV','right = higher rate · up = cheaper · size = IWV')}</span></div>
        <div class="infmap" id="infMap"></div></div>
    </div>
    <div class="infcell"><div class="infh"><b>${L('체류시간 분포','Time on site')}</b><span>${L('방문을 머문 시간 구간으로 나눈 비율 · 평균 체류시간 순','Share of visits by time spent · sorted by average')}</span>
        <span class="infbl">${INF_BANDS.map((x,i)=>`<i style="--op:${INF_BAND_OP[i]}"></i>${L(x.l,x.en)}`).join('')}</span></div>
      <div id="infDwell"></div></div>
    <div class="infcell"><div class="infh"><b>${L('상세','Details')}</b><span>${L('머리글을 누르면 설명 · 정렬','click a header for its description · sorting')}</span>
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

/* ---------- ① 유입 흐름 (v95) ----------
   클릭 → 웹 비짓(IWV) → 유입 사이트 세 단계.
   · 왼쪽: 매체(상품 · 소재)별 클릭. 굵기 = 클릭 수
   · 가운데: 클릭 중 웹 비짓이 된 몫만 위로 모이고, 나머지(이탈)는 아래로 흐려지며 사라진다
   · 웹 비짓은 클릭의 몇 % 뿐이라 그 굵기 그대로는 오른쪽 흐름이 안 보인다 → 돋보기처럼 펼쳐(확대)
     웹 비짓만의 배율로 다시 그린다. 확대한 기둥은 매체 색으로 나뉘고, 각 매체가 어느 사이트로 들어갔는지 이어진다 */
function infSankey(host,rows0,T){
  if(!host)return;
  const lands=INF_LAND.filter(x=>rows0.some(g=>(+g.b[x.k]||0)>0));
  const landSum=g=>lands.reduce((s,x)=>s+(+g.b[x.k]||0),0);
  const iwvOf=g=>Math.max(+g.b.iwv||0,landSum(g));
  const clkOf=g=>Math.max(+g.b.click||0,iwvOf(g));
  /* 왼쪽 마디 — 웹 비짓 많은 순 9개 + 그 외 */
  let rows=rows0.slice().sort((a,b)=>iwvOf(b)-iwvOf(a)||clkOf(b)-clkOf(a));
  if(rows.length>10){const rest=rows.slice(9),b=aggFacts([]);rest.forEach(g=>{AMET.concat(['cost']).forEach(m=>b[m]+=+g.b[m]||0);});
    rows=rows.slice(0,9).concat([{key:'__etc',lab:L(`그 외 ${rest.length}개`,`${rest.length} more`),sub:'',col:'__etc',b}]);}
  rows=rows.filter(g=>clkOf(g)>0);
  if(!rows.length){host.innerHTML='';return;}
  const R=lands.map(x=>({k:x.k,l:x.l,kind:'land'}));
  const otherOf=g=>Math.max((+g.b.iwv||0)-landSum(g),0);
  if(rows.some(g=>otherOf(g)>0))R.push({k:'__other',l:L('랜딩 구분 없음','other landing'),kind:'other'});
  const flowTo=(g,r)=>r.kind==='land'?(+g.b[r.k]||0):otherOf(g);
  const TOTC=rows.reduce((s,g)=>s+clkOf(g),0),TOTI=rows.reduce((s,g)=>s+iwvOf(g),0);
  /* ---- 자리 ---- */
  const W=Math.max(host.clientWidth||720,380);
  const TOP=34,BOT=12,NW=10,LBL=32,GAP=6;
  const LW=Math.min(150,W*.19),RW=Math.min(150,W*.2);
  const x0=LW,xI=x0+NW+Math.max(100,W*.24),xZ=xI+NW+Math.max(44,W*.075),x3=W-RW-NW;
  const H0=Math.max(300,Math.min(520,rows.length*46+40));
  /* 가운데 칸 — 웹 비짓(위) + 이탈(아래) */
  const kC=(H0-TOP-BOT-GAP*(rows.length-1))/TOTC;
  const place=(vals,k,gap)=>{let y=TOP,pc=-1e9;return vals.map(v=>{const h=Math.max(v*k,2);
    const top=Math.max(y,pc+LBL-h/2);const n={y:top,h,ui:0,ul:0};y=top+h+gap;pc=top+h/2;return n;});};
  const LN=place(rows.map(clkOf),kC,GAP);
  const bottomL=Math.max(...LN.map(n=>n.y+n.h));
  const iH=Math.max(TOTI*kC,3);
  const IN={y:TOP,h:iH};
  const leakTop=TOP+iH+10;
  /* 이탈 띠는 왼쪽 마디 높이를 그대로 받아 아래로 쌓인다 */
  let ly=leakTop;const LK=rows.map(g=>{const h=Math.max((clkOf(g)-iwvOf(g))*kC,0);const n={y:ly,h};ly+=h;return n;});
  /* 오른쪽 — 웹 비짓 확대 기둥(매체별로 나뉨) → 사이트 */
  const Hb=Math.max(bottomL,ly);
  const zAvail=Hb-TOP-2*Math.max(rows.length-1,0);
  const kI=TOTI?zAvail/TOTI:0;
  let zy=TOP;const ZN=rows.map(g=>{const h=iwvOf(g)*kI;const n={y:zy,h,used:0};zy+=h+(h>0?2:0);return n;});
  const rv=R.map(r=>rows.reduce((s,g)=>s+flowTo(g,r),0));
  const RN=place(rv,kI,10);
  /* 오른쪽 마디가 확대 기둥보다 길면 배율을 줄여 맞춘다 */
  const bottomR=Math.max(...RN.map(n=>n.y+n.h),TOP);
  const Hh=Math.max(Hb,bottomR)+BOT;
  const zCen=(TOP+Hb)/2,rCen=(TOP+bottomR)/2;
  if(bottomR<Hb)RN.forEach(n=>{n.y+=zCen-rCen;});
  const C=(a,b)=>(a+b)/2;
  const band=(xa,ya,ha,xb,yb,hb)=>{const cx=C(xa,xb);
    return `M${xa},${ya} C${cx},${ya} ${cx},${yb} ${xb},${yb} L${xb},${yb+hb} C${cx},${yb+hb} ${cx},${ya+ha} ${xa},${ya+ha} Z`;};
  let defs='',paths='',nodes='',labs='';
  const rate=g=>clkOf(g)?iwvOf(g)/clkOf(g):NaN;
  /* ① 클릭 → 웹 비짓 · 이탈 */
  let iy=IN.y;
  rows.forEach((g,i)=>{const n=LN[i],col=infColor(g);
    const hi=iwvOf(g)*kC,hl=Math.max(n.h-hi,0);
    if(iwvOf(g)>0){const h=Math.max(hi,1);
      paths+=`<path class="sklink iw" d="${band(x0+NW,n.y,h,xI,iy,Math.max(hi,0.6))}" style="fill:${col}" data-i="${i}" data-s="iw"></path>`;
      iy+=hi;}
    if(hl>0.3){const lk=LK[i];
      defs+=`<linearGradient id="skfd${i}" gradientUnits="userSpaceOnUse" x1="${x0+NW}" y1="0" x2="${xI}" y2="0"><stop offset="0" stop-color="${col}" stop-opacity=".34"/><stop offset=".8" stop-color="${col}" stop-opacity=".07"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
      paths+=`<path class="sklink lk" d="${band(x0+NW,n.y+hi,hl,xI,lk.y,lk.h)}" fill="url(#skfd${i})" data-i="${i}" data-s="lk"></path>`;}
    nodes+=`<rect class="sknode" x="${x0}" y="${n.y}" width="${NW}" height="${n.h}" rx="2.5" style="fill:${col}" data-i="${i}"></rect>`;
    const cy=n.y+n.h/2;
    labs+=`<text class="sklab" x="${x0-8}" y="${cy-2}" text-anchor="end" data-i="${i}">${esc(infClip(g.lab,18))}</text>
      <text class="skval" x="${x0-8}" y="${cy+11}" text-anchor="end">${L('클릭','clicks')} ${fmt(clkOf(g))} · ${pct(rate(g),1)}</text>`;});
  /* 웹 비짓 마디(작게) · 돋보기 · 확대 기둥 */
  const zTop=TOP,zBot=Hb;
  defs+=`<linearGradient id="skzoom" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.18"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:.05"/></linearGradient>`;
  paths+=`<path class="skzoom" d="M${xI+NW},${IN.y} L${xZ},${zTop} L${xZ},${zBot} L${xI+NW},${IN.y+IN.h} Z" fill="url(#skzoom)"></path>`;
  nodes+=`<rect class="sknode iwn" x="${xI}" y="${IN.y}" width="${NW}" height="${IN.h}" rx="2" data-n="iwv"></rect>`;
  const mag=TOTI&&kC?kI/kC:0;
  if(mag>1.5)labs+=`<text class="skzl" x="${C(xI+NW,xZ)}" y="${C(IN.y+IN.h,zBot)+16}" text-anchor="middle">${L('확대','zoom')}</text>
    <text class="skzl b" x="${C(xI+NW,xZ)}" y="${C(IN.y+IN.h,zBot)+30}" text-anchor="middle">×${mag>=10?Math.round(mag):mag.toFixed(1)}</text>`;
  /* 이탈 이름표 — 이탈 띠 한가운데, 웹 비짓 마디 바로 왼쪽 */
  const leakSum=TOTC-TOTI;
  if(leakSum>0&&ly>leakTop+20){const cy=C(leakTop,ly);
    labs+=`<text class="sklab lk skhalo" x="${xI-8}" y="${cy-2}" text-anchor="end">${L('이탈','Dropped')} ${fmt(leakSum)}</text>
      <text class="skval skhalo" x="${xI-8}" y="${cy+11}" text-anchor="end">${L('클릭의','of clicks')} ${pct(leakSum/TOTC,1)}</text>`;}
  /* ② 확대 기둥(매체별) → 사이트 */
  rows.forEach((g,i)=>{const z=ZN[i];if(!z.h)return;
    nodes+=`<rect class="sknode z" x="${xZ}" y="${z.y}" width="${NW}" height="${z.h}" style="fill:${infColor(g)}" data-i="${i}"></rect>`;});
  R.forEach((r,j)=>{RN[j].used=0;});
  rows.forEach((g,i)=>{const z=ZN[i];R.forEach((r,j)=>{const v=flowTo(g,r);if(!(v>0))return;
    const h=v*kI,a=z.y+z.used,b=RN[j].y+RN[j].used;z.used+=h;RN[j].used+=h;
    paths+=`<path class="sklink zf" d="${band(xZ+NW,a,h,x3,b,h)}" style="fill:${infColor(g)}" data-i="${i}" data-j="${j}" data-v="${v}" data-s="zf"></path>`;});});
  R.forEach((r,j)=>{const n=RN[j];
    nodes+=`<rect class="sknode r" x="${x3}" y="${n.y}" width="${NW}" height="${Math.max(n.h,2)}" rx="2.5" style="fill:${r.kind==='other'?'var(--gline)':'var(--acc)'}" data-j="${j}"></rect>`;
    const cy=n.y+n.h/2;
    labs+=`<text class="sklab" x="${x3+NW+8}" y="${cy-2}" data-j="${j}">${esc(r.l)}</text>
      <text class="skval" x="${x3+NW+8}" y="${cy+11}">${fmt(rv[j])} · ${pct(TOTI?rv[j]/TOTI:NaN,1)}</text>`;});
  /* 단계 이름 */
  const cap=(x,t,a)=>`<text class="skcap" x="${x}" y="${TOP-14}" text-anchor="${a||'middle'}">${t}</text>`;
  labs+=cap(x0+NW/2,`${L('클릭','Clicks')} ${fmt(TOTC)}`,'middle')
    +cap(xI+NW/2,`${L('웹 비짓','Web visits')} ${fmt(TOTI)} · ${pct(TOTC?TOTI/TOTC:NaN,2)}`,'start')
    +cap(x3+NW/2,L('유입 사이트','Landing site'),'middle');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" class="sksvg"><defs>${defs}</defs>${paths}${nodes}${labs}</svg>`;
  /* ---- 마우스 ---- */
  const svg=host.querySelector('svg');
  const hl=fn=>svg.querySelectorAll('.sklink').forEach(p=>p.classList.toggle('dim',!fn(p)));
  const tipRow=(l,v)=>`<div class="r"><span class="l">${l}</span><b>${v}</b></div>`;
  svg.querySelectorAll('.sklink').forEach(p=>{
    const g=rows[+p.dataset.i],s=p.dataset.s;
    p.addEventListener('mousemove',e=>{hl(q=>q===p);
      let h=`<div class="t">${esc(infName(g))}</div>`;
      if(s==='iw')h+=tipRow(L('클릭 → 웹 비짓','clicks → web visits'),fmt(iwvOf(g)))+tipRow(L('클릭 대비','of clicks'),pct(rate(g),2));
      else if(s==='lk')h+=tipRow(L('이탈 (클릭 − 웹 비짓)','dropped (clicks − visits)'),fmt(clkOf(g)-iwvOf(g)))+tipRow(L('클릭 대비','of clicks'),pct(1-rate(g),2));
      else{const r=R[+p.dataset.j],v=+p.dataset.v;
        h=`<div class="t">${esc(infName(g))} → ${esc(r.l)}</div>`+tipRow(L('웹 비짓','web visits'),fmt(v))
          +tipRow(L('이 매체 웹 비짓 중','of its web visits'),pct(iwvOf(g)?v/iwvOf(g):NaN,1));}
      showTip(e.clientX,e.clientY,h);});
    p.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});});
  svg.querySelectorAll('.sknode,.sklab').forEach(n=>{
    const on=()=>{if(n.dataset.i!=null)hl(p=>p.dataset.i===n.dataset.i);else if(n.dataset.j!=null)hl(p=>p.dataset.j===n.dataset.j);};
    n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});
    if(n.dataset.i!=null){const g=rows[+n.dataset.i];
      n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
        +tipRow(L('클릭','Clicks'),fmt(clkOf(g)))+tipRow(L('웹 비짓 (IWV)','Web visits (IWV)'),fmt(iwvOf(g)))
        +tipRow(L('유입률','Inflow rate'),pct(rate(g),2))+tipRow(L('이탈','Dropped'),fmt(clkOf(g)-iwvOf(g)))));}});
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
    <text class="mq lo" x="${qx}" y="${P.t-9}" text-anchor="middle">${L('평균','avg')}</text>`;}
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
    groups:[g('클릭 · 유입',['click','iwv','iwvr']),g('비용',['cost','cpiwv']),
      g('랜딩별 IWV',['iwv_tda','iwv_mh','iwv_mp']),g('체류시간',['dwavg','dw30r'])]};}
const infTbl=()=>INF_TBL||(INF_TBL=infTblDefault());
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
