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
      ${kp(L('유입률 (유입/클릭)','Inflow rate (inflow/clicks)'),pct(infRate(A)),L('캠페인 전체 클릭 기준','based on all campaign clicks'))}
      ${kp(L('유입당 단가','Cost per IWV'),won(Math.round(infCpv(A))||0),L(`전체 소진 ${won(Math.round(A.cost))}`,`total spend ${won(Math.round(A.cost))}`))}
      ${kp(L('평균 체류시간','Avg. time on site'),fmtDur(dwAvg(A)),isFinite(dw30Rate(A))?L(`30초 이상 ${pct(dw30Rate(A),1)}`,`${pct(dw30Rate(A),1)} stay 30s+`):'')}
    </div>
    <div class="infcell"><div class="infh"><b>${L('유입 흐름','Inflow flow')}</b><span>${L('단계마다 따로 그린 그래프 · 매체 색 = 다음 단계로 넘어간 몫 · 회색 = 이탈 · 마우스를 올리면 잔존율','one chart per step · media color = carried on · gray = dropped · hover for retention')}</span></div>
      <div class="infsk3" id="infSankey"></div></div>
    <div class="infgrid">
      <div class="infcell"><div class="infh"><b>${L('유입 효율 지도','Inflow efficiency map')}</b><span>${L('위 = 유입률 높음 · 오른쪽 = 비용 효율 좋음 · 원 크기 = 유입','up = higher inflow rate · right = more cost-efficient · size = inflow')}</span></div>
        <div class="infmap" id="infMap"></div></div>
      <div class="infcell"><div class="infh"><b>${L('체류시간 분포','Time on site')}</b><span>${L('방문을 머문 시간 구간으로 나눈 비율 · 평균 체류시간 순','Share of visits by time spent · sorted by average')}</span>
          <span class="infbl">${INF_BANDS.map((x,i)=>`<i style="--op:${INF_BAND_OP[i]}"></i>${L(x.l,x.en)}`).join('')}</span></div>
        <div id="infDwell"></div></div>
    </div>
    <div class="infcell"><div class="infh"><b>${L('유입 효율 상세분석','Inflow efficiency details')}</b><span>${L('머리글을 누르면 설명 · 정렬','click a header for its description · sorting')}</span>
        ${isClient()?'':`<button class="btn sm infcfg" id="infCfgBtn">${L('⚙ 헤더 편집','⚙ Edit headers')}</button>`}</div>
      <div class="hidden" id="infCfgBox"></div>
      <div class="tbl-wrap noy" id="infTblWrap"><table class="tbl gln fit cmpt inftbl" id="infTbl"></table></div></div>
    ${miss.length?`<div class="hint infmiss">${L(`IWV 가 없거나 ${INF_MIN}건 미만이라 분석에서 뺀 매체`,`Excluded (no IWV or fewer than ${INF_MIN})`)}: <span data-noi18n>${esc(miss.join(' · '))}</span></div>`:''}`;
  try{infSankey($('infSankey'),rows,T);}catch(e){console.warn(e);}
  /* 지도 높이 = 옆 체류시간 분포의 막대 영역 높이 — 두 카드 높이를 맞춘다 */
  const nDw=rows.filter(g=>dwSum(g.b)>0).length;
  try{infMap($('infMap'),rows,T,nDw?nDw*44+26:340);}catch(e){console.warn(e);}
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

/* ---------- ① 유입 흐름 (v97 — 단계별 그래프 3개를 나란히) ----------
   ⓐ 노출 → 클릭   ⓑ 클릭 → 유입(IWV)   ⓒ 유입 → 랜딩 페이지
   · 그래프마다 **자기 단계의 배율**로 그린다 — 노출 · 클릭 · 유입은 숫자 단위가 수백~수천 배 달라
     한 그래프에 같은 배율로 그리면 노출밖에 안 보이고, 단계마다 배율을 바꿔 이어 그리면 이탈이 안 보인다.
   · ⓐ ⓑ 는 매체별로 다음 단계로 넘어간 몫(매체 색)과 이탈(회색)로 갈라진다 — 같은 그래프 안에서는 같은 배율
   · 띠 · 마디에 마우스 → 잔존율(CTR · 유입률)과 이탈. 한 매체를 가리키면 세 그래프에서 그 매체가 함께 강조된다 */
function infSankey(host,rows0,T){
  if(!host)return;
  const lands=INF_LAND.filter(x=>rows0.some(g=>(+g.b[x.k]||0)>0));
  const landSum=g=>lands.reduce((s,x)=>s+(+g.b[x.k]||0),0);
  const iwvOf=g=>Math.max(+g.b.iwv||0,landSum(g));
  const clkOf=g=>Math.max(+g.b.click||0,iwvOf(g));
  const impOf=g=>Math.max(+g.b.imp||0,clkOf(g));
  let rows=rows0.slice().sort((a,b)=>iwvOf(b)-iwvOf(a)||clkOf(b)-clkOf(a));
  if(rows.length>10){const rest=rows.slice(9),b=aggFacts([]);rest.forEach(g=>{AMET.concat(['cost']).forEach(m=>b[m]+=+g.b[m]||0);});
    rows=rows.slice(0,9).concat([{key:'__etc',lab:L(`그 외 ${rest.length}개`,`${rest.length} more`),sub:'',col:'__etc',b}]);}
  rows=rows.filter(g=>impOf(g)>0);
  if(!rows.length){host.innerHTML='';return;}
  const R=lands.map(x=>({k:x.k,l:x.l,kind:'land'}));
  const otherOf=g=>Math.max((+g.b.iwv||0)-landSum(g),0);
  if(rows.some(g=>otherOf(g)>0))R.push({k:'__other',l:L('랜딩 구분 없음','other landing'),kind:'other'});
  const flowTo=(g,r)=>r.kind==='land'?(+g.b[r.k]||0):otherOf(g);
  const sum=f=>rows.reduce((s,g)=>s+f(g),0);
  const TI=sum(impOf),TC=sum(clkOf),TV=sum(iwvOf);
  const pf=v=>pct(v,v<.01?2:1);
  const ST=[
    {n:'①',la:L('노출','Impressions'),sa:L('노출','imps'),lb:L('클릭','Clicks'),rl:'CTR',a:impOf,b:clkOf,ta:TI,tb:TC},
    {n:'②',la:L('클릭','Clicks'),sa:L('클릭','clicks'),lb:L('유입 (IWV)','Inflow (IWV)'),rl:L('유입률','Inflow rate'),a:clkOf,b:iwvOf,ta:TC,tb:TV}];
  host.innerHTML=ST.map((s,p)=>`<div class="skp"><div class="skph"><b>${s.n} ${s.la} → ${s.lb}</b>
      <span>${s.rl} <b class="mono">${pf(s.ta?s.tb/s.ta:NaN)}</b></span></div><div class="skpb" data-p="${p}"></div></div>`).join('')
    +`<div class="skp"><div class="skph"><b>③ ${L('유입 → 랜딩 페이지','Inflow → landing page')}</b>
      <span>${L('유입','inflow')} <b class="mono">${fmt(TV)}</b></span></div><div class="skpb" data-p="2"></div></div>`;
  const boxes=[...host.querySelectorAll('.skpb')];
  const HM=Math.max(250,Math.min(420,rows.length*40+50));
  const TOP=8,NW=9,SG=4;
  const band=(xa,ya,ha,xb,yb,hb)=>{const cx=(xa+xb)/2;
    return `M${xa},${ya} C${cx},${ya} ${cx},${yb} ${xb},${yb} L${xb},${yb+hb} C${cx},${yb+hb} ${cx},${ya+ha} ${xa},${ya+ha} Z`;};
  const spread=(cs,gap,lo,hi)=>{const o=cs.map((c,i)=>({c,i,y:c})).sort((a,b)=>a.c-b.c);
    for(let k=1;k<o.length;k++)if(o[k].y<o[k-1].y+gap)o[k].y=o[k-1].y+gap;
    const over=o.length?o[o.length-1].y-hi:0;if(over>0)o.forEach(x=>x.y-=over);
    for(let k=o.length-2;k>=0;k--)if(o[k].y>o[k+1].y-gap)o[k].y=o[k+1].y-gap;
    const under=o.length?lo-o[0].y:0;if(under>0)o.forEach(x=>x.y+=under);
    const out=[];o.forEach(x=>out[x.i]=x.y);return out;};
  /* 왼쪽 마디(매체) — 값 비중대로 쌓고 이름표는 겹치지 않게 벌린다 */
  const leftCol=(vals,k0)=>{const tot=vals.reduce((a,v)=>a+v,0)||1,n=vals.filter(v=>v>0).length;
    const k=k0||(HM-SG*Math.max(n-1,0))/tot;
    const full=vals.reduce((a,v)=>a+(v>0?Math.max(v*k,1)+SG:0),0)-SG;
    let y=TOP+Math.max(0,(HM-full)/2);
    const N=vals.map(v=>{const h=v>0?Math.max(v*k,1):0;const o={y,h,used:0};y+=h+(h>0?SG:0);return o;});
    return {N,k};};
  const leftLabels=(N,x,valTxt)=>{const idx=N.map((n,i)=>n.h?i:-1).filter(i=>i>=0);
    const sp=spread(idx.map(i=>N[i].y+N[i].h/2),28,TOP+6,TOP+HM-10);
    const cs=N.map(n=>n.y+n.h/2),ly=[];idx.forEach((i,j)=>ly[i]=sp[j]);let s='';
    rows.forEach((g,i)=>{const y=ly[i];if(!N[i].h)return;
      if(Math.abs(y-cs[i])>2)s+=`<path class="sklead" d="M${x-5},${y} L${x-1},${cs[i]}"></path>`;
      s+=`<text class="sklab" x="${x-8}" y="${y-2}" text-anchor="end" data-i="${i}">${esc(infClip(g.lab,14))}</text>
        <text class="skval" x="${x-8}" y="${y+10}" text-anchor="end">${valTxt(g)}</text>`;});return s;};
  const svgOf=(W,body)=>`<svg viewBox="0 0 ${W} ${HM+TOP*2+8}" width="${W}" height="${HM+TOP*2+8}" class="sksvg">${body}</svg>`;
  /* ①② — 넘어간 몫 + 이탈 */
  ST.forEach((s,p)=>{const box=boxes[p];const W=Math.max(box.clientWidth||380,280);
    const LW=Math.min(112,W*.3),RW=Math.min(122,W*.31),xL=LW,xR=W-RW-NW;
    const {N,k}=leftCol(rows.map(s.a));
    const drop=s.ta-s.tb;
    const hB=Math.max(s.tb*k,3),hD=Math.max(drop*k,0),GP=16;
    const rTop=TOP+Math.max(0,(HM-(hB+GP+hD))/2);
    const BN={y:rTop,h:hB,used:0},DN={y:rTop+hB+GP,h:hD,used:0};
    let paths='',nodes='',labs='';
    rows.forEach((g,i)=>{const n=N[i];if(!n.h)return;const col=infColor(g);
      const vb=s.b(g),vd=s.a(g)-vb,hb=vb*k,hd=Math.max(n.h-hb,0);
      if(vb>0){const h=Math.max(hb,.8);
        paths+=`<path class="sklink pb" d="${band(xL+NW,n.y,h,xR,BN.y+BN.used,Math.max(hb,.8))}" style="fill:${col}" data-i="${i}" data-p="${p}" data-s="b"></path>`;
        nodes+=`<rect class="sknode" x="${xR}" y="${BN.y+BN.used}" width="${NW}" height="${Math.max(hb,.8)}" style="fill:${col}" data-i="${i}" data-p="${p}"></rect>`;
        BN.used+=hb;}
      if(vd>0&&hd>0){paths+=`<path class="sklink pd" d="${band(xL+NW,n.y+hb,hd,xR,DN.y+DN.used,vd*k)}" style="fill:${col}" data-i="${i}" data-p="${p}" data-s="d"></path>`;DN.used+=vd*k;}
      nodes+=`<rect class="sknode" x="${xL}" y="${n.y}" width="${NW}" height="${n.h}" style="fill:${col}" data-i="${i}" data-p="${p}"></rect>`;});
    if(BN.used<hB)nodes+=`<rect class="sknode bn" x="${xR}" y="${BN.y+BN.used}" width="${NW}" height="${hB-BN.used}"></rect>`;
    if(hD>0)nodes+=`<rect class="sknode dn" x="${xR}" y="${DN.y}" width="${NW}" height="${hD}" data-drop="${p}"></rect>`;
    labs+=leftLabels(N,xL,g=>`${s.sa} ${fmt(s.a(g))}`);
    const by=BN.y+hB/2,dy=DN.y+hD/2;
    const yb=Math.max(TOP+8,Math.min(by,dy-30));
    labs+=`<text class="sklab" x="${xR+NW+8}" y="${yb-2}">${s.lb}</text>
      <text class="skval b" x="${xR+NW+8}" y="${yb+11}">${fmt(s.tb)} · ${pf(s.ta?s.tb/s.ta:NaN)}</text>`;
    if(hD>0)labs+=`<text class="sklab dl" x="${xR+NW+8}" y="${Math.max(dy,yb+30)-2}" data-drop="${p}">${L('이탈','Dropped')}</text>
      <text class="skval" x="${xR+NW+8}" y="${Math.max(dy,yb+30)+11}">${fmt(drop)} · ${pf(s.ta?drop/s.ta:NaN)}</text>`;
    box.innerHTML=svgOf(W,paths+nodes+labs);});
  /* ③ 유입 → 랜딩 페이지 */
  {const box=boxes[2];const W=Math.max(box.clientWidth||380,280);
    const LW=Math.min(112,W*.3),RW=Math.min(116,W*.3),xL=LW,xR=W-RW-NW;
    const rv=R.map(r=>rows.reduce((s,g)=>s+flowTo(g,r),0));
    const RG=12,nL=rows.filter(g=>iwvOf(g)>0).length;
    /* 왼쪽 · 오른쪽 모두 같은 배율 — 둘 중 마디 사이 틈이 더 많은 쪽에 맞춘다 */
    const k3=(HM-Math.max(SG*Math.max(nL-1,0),RG*Math.max(R.length-1,0))-R.length*2)/(TV||1);
    const {N,k}=leftCol(rows.map(iwvOf),k3);
    const rH=rv.reduce((s,v)=>s+Math.max(v*k,2),0)+RG*Math.max(R.length-1,0);
    let ry=TOP+Math.max(0,(HM-rH)/2);const RN=rv.map(v=>{const h=Math.max(v*k,2);const o={y:ry,h,used:0};ry+=h+RG;return o;});
    let paths='',nodes='',labs='';
    rows.forEach((g,i)=>{const n=N[i];if(!n.h)return;const col=infColor(g);
      nodes+=`<rect class="sknode" x="${xL}" y="${n.y}" width="${NW}" height="${n.h}" style="fill:${col}" data-i="${i}" data-p="2"></rect>`;
      R.forEach((r,j)=>{const v=flowTo(g,r);if(!(v>0))return;const h=v*k;
        paths+=`<path class="sklink zf" d="${band(xL+NW,n.y+n.used,h,xR,RN[j].y+RN[j].used,h)}" style="fill:${col}" data-i="${i}" data-j="${j}" data-v="${v}" data-p="2"></path>`;
        n.used+=h;RN[j].used+=h;});});
    const cs=RN.map(n=>n.y+n.h/2),ly=spread(cs,30,TOP+6,TOP+HM-10);
    R.forEach((r,j)=>{const n=RN[j];
      nodes+=`<rect class="sknode r" x="${xR}" y="${n.y}" width="${NW}" height="${n.h}" rx="2" style="fill:${r.kind==='other'?'var(--gline)':'var(--acc)'}" data-j="${j}"></rect>`;
      labs+=`<text class="sklab" x="${xR+NW+8}" y="${ly[j]-2}" data-j="${j}">${esc(r.l)}</text>
        <text class="skval" x="${xR+NW+8}" y="${ly[j]+11}">${fmt(rv[j])} · ${pct(TV?rv[j]/TV:NaN,1)}</text>`;});
    labs+=leftLabels(N,xL,g=>`${L('유입','inflow')} ${fmt(iwvOf(g))}`);
    box.innerHTML=svgOf(W,paths+nodes+labs);}
  /* ---- 마우스 — 세 그래프를 함께 ---- */
  const hl=fn=>host.querySelectorAll('.sklink').forEach(p=>p.classList.toggle('dim',!fn(p)));
  const tr=(l,v)=>`<div class="r"><span class="l">${l}</span><b>${v}</b></div>`;
  const stepTip=(g,s)=>{const a=s.a(g),b=s.b(g);return `<div class="t">${esc(infName(g))} · ${s.la} → ${s.lb}</div>`
    +tr(s.la,fmt(a))+tr(s.lb,fmt(b))+tr(L('잔존율','retained')+` (${s.rl})`,pf(a?b/a:NaN))+tr(L('이탈','dropped'),`${fmt(a-b)} · ${pf(a?(a-b)/a:NaN)}`);};
  host.querySelectorAll('.sklink').forEach(p=>{
    const g=rows[+p.dataset.i],pp=+p.dataset.p;
    p.addEventListener('mousemove',e=>{hl(q=>q.dataset.i===p.dataset.i);
      let h;
      if(pp<2)h=stepTip(g,ST[pp]);
      else{const r=R[+p.dataset.j],v=+p.dataset.v;
        h=`<div class="t">${esc(infName(g))} → ${esc(r.l)}</div>`+tr(L('유입','inflow'),fmt(v))
          +tr(L('이 매체 유입 중','of its inflow'),pct(iwvOf(g)?v/iwvOf(g):NaN,1));}
      showTip(e.clientX,e.clientY,h);});
    p.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});});
  host.querySelectorAll('.sknode,.sklab').forEach(n=>{
    const on=()=>{if(n.dataset.i!=null)hl(p=>p.dataset.i===n.dataset.i);
      else if(n.dataset.j!=null)hl(p=>p.dataset.j===n.dataset.j);
      else if(n.dataset.drop!=null)hl(p=>p.dataset.p===n.dataset.drop&&p.classList.contains('pd'));};
    n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});
    if(n.dataset.i!=null){const g=rows[+n.dataset.i];
      n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
        +tr(L('노출','Impressions'),fmt(impOf(g)))+tr(L('클릭','Clicks'),fmt(clkOf(g)))+tr('CTR',pf(impOf(g)?clkOf(g)/impOf(g):NaN))
        +tr(L('유입 (IWV)','Inflow (IWV)'),fmt(iwvOf(g)))+tr(L('유입률','Inflow rate'),pf(clkOf(g)?iwvOf(g)/clkOf(g):NaN))));}
    if(n.dataset.drop!=null){const s=ST[+n.dataset.drop];
      n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${L('이탈','Dropped')} · ${s.la} → ${s.lb}</div>`
        +tr(s.la,fmt(s.ta))+tr(L('이탈','dropped'),`${fmt(s.ta-s.tb)} · ${pf(s.ta?(s.ta-s.tb)/s.ta:NaN)}`)
        +tr(L('잔존율','retained')+` (${s.rl})`,pf(s.ta?s.tb/s.ta:NaN))));}});
}

/* ---------- ② 유입 효율 지도 (버블) ---------- */
function infMap(host,rows0,T,hH){
  if(!host)return;
  const rows=rows0.filter(g=>(g.b.click||0)>0&&(g.b.iwv||0)>0&&(g.b.cost||0)>0);
  if(!rows.length){host.innerHTML=`<div class="hint infempty">${L('클릭 · IWV · 소진금액이 모두 있는 항목이 없어 그릴 수 없습니다.','Needs clicks, IWV and spend.')}</div>`;return;}
  /* v99 — 가로 = 유입 비용 효율(유입당 단가, 오른쪽일수록 저렴) · 세로 = 유입률(위가 높음).
     예전처럼 단가를 세로에 두면 "위 = 비싸다" 로 읽혀서 축을 바꿨다. 평균 점선은 없앴다 */
  const W=Math.max(host.clientWidth||420,300),H=Math.max(300,Math.min(560,hH||340)),P={l:50,r:16,t:26,b:42};
  const RMAX=rows.length>8?18:rows.length>4?23:27;
  const cs=rows.map(g=>infCpv(g.b)),rs=rows.map(g=>infRate(g.b));
  const yMax=Math.max(...rs)*1.1||1;
  /* 유입당 단가는 몇 백 원 ~ 몇 만 원으로 벌어지므로 로그 눈금 */
  const cl=cs.map(v=>Math.log10(v));let clo=Math.min(...cl),chi=Math.max(...cl);
  if(chi-clo<.3){const m=(clo+chi)/2;clo=m-.15;chi=m+.15;}
  /* 원이 그림 밖으로 나가지 않게 데이터 자리는 안쪽으로 원 반지름만큼 줄인다 */
  const ix0=P.l+RMAX,ix1=W-P.r-RMAX,iy0=P.t+RMAX,iy1=H-P.b-10;
  const X=v=>ix0+(chi-Math.log10(v))/((chi-clo)||1)*(ix1-ix0);   /* 싼 쪽이 오른쪽 */
  const Y=v=>iy1-v/yMax*(iy1-iy0);
  const xs=cs.map(X),ys=rs.map(Y);
  const maxI=Math.max(...rows.map(g=>g.b.iwv));
  const Rr=v=>4+Math.sqrt(v/maxI)*(RMAX-4);
  /* 눈금 */
  const xv=v=>{const x=X(v);return x>=P.l-1&&x<=W-P.r+1;};
  const xt=[];for(let e=Math.floor(clo)-1;e<=Math.ceil(chi)+1;e++){[1,2,5].forEach(m=>{const v=m*Math.pow(10,e);if(xv(v))xt.push(v);});}
  const yt=[];{const st=niceStep(yMax,4);for(let v=0;v<=yMax+1e-9;v+=st)yt.push(v);}
  const cLab=v=>'₩'+(v>=10000?(LANG==='en'?fmt(v/1000)+'k':(v/10000)+'만'):fmt(v));
  const ax=xt.map(v=>`<line class="mgrid" x1="${X(v)}" x2="${X(v)}" y1="${P.t}" y2="${H-P.b}"></line><text class="mtick" x="${X(v)}" y="${H-P.b+15}" text-anchor="middle">${cLab(v)}</text>`).join('')
    +yt.map(v=>`<line class="mgrid" x1="${P.l}" x2="${W-P.r}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="mtick" x="${P.l-6}" y="${Y(v)+3}" text-anchor="end">${(v*100).toFixed((v*100)%1?1:0)}%</text>`).join('');
  const mid=`<text class="mq" x="${W-P.r}" y="${P.t-9}" text-anchor="end">${L('↗ 효율 좋음','↗ more efficient')}</text>`;
  const order=rows.map((g,i)=>i).sort((a,b)=>rows[b].b.iwv-rows[a].b.iwv);   /* 큰 원을 먼저(뒤에) 깐다 */
  /* 이름표 — 큰 원부터 위 · 아래 · 오른쪽 · 왼쪽 중 겹치지 않는 자리에. 자리가 없으면 생략(툴팁으로 확인) */
  const boxes=[];const hit=(a)=>boxes.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)
    ||a.x<P.l||a.x+a.w>W-P.r+6||a.y<P.t-2||a.y+a.h>H-P.b;
  const tw=t=>[...t].reduce((s,c)=>s+(c.charCodeAt(0)>255?11:6.4),0);
  rows.forEach((g,i)=>{const r=Rr(g.b.iwv);boxes.push({x:xs[i]-r*.7,y:ys[i]-r*.7,w:r*1.4,h:r*1.4,dot:1});});
  const labs={};
  order.forEach(i=>{const g=rows[i],cx=xs[i],cy=ys[i],r=Rr(g.b.iwv),t=infClip(g.lab,14),w=tw(t),h=13;
    const cand=[{x:cx-w/2,y:cy-r-3-h,a:'middle',tx:cx,ty:cy-r-5},{x:cx-w/2,y:cy+r+3,a:'middle',tx:cx,ty:cy+r+13},
      {x:cx+r+4,y:cy-h/2,a:'start',tx:cx+r+4,ty:cy+4},{x:cx-r-4-w,y:cy-h/2,a:'end',tx:cx-r-4,ty:cy+4}];
    const own=boxes.findIndex(b=>b.dot&&Math.abs(b.x+b.w/2-cx)<.01&&Math.abs(b.y+b.h/2-cy)<.01);
    const saved=own>=0?boxes.splice(own,1)[0]:null;
    const c=cand.find(c=>!hit({x:c.x,y:c.y,w,h}));
    if(saved)boxes.push(saved);
    if(c){boxes.push({x:c.x,y:c.y,w,h});labs[i]=`<text class="mlab" x="${c.tx}" y="${c.ty}" text-anchor="${c.a}">${esc(t)}</text>`;}});
  const dots=order.map(i=>{const g=rows[i],cx=xs[i],cy=ys[i],r=Rr(g.b.iwv),col=infColor(g);
    return `<g class="mdot" data-i="${i}"><circle cx="${cx}" cy="${cy}" r="${r}" class="mc" style="fill:${col};stroke:${col}"></circle></g>`;}).join('');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="msvg">${ax}${mid}${dots}${order.map(i=>labs[i]||'').join('')}
      <text class="maxl" x="${(P.l+W-P.r)/2}" y="${H-4}" text-anchor="middle">${L('유입 비용 효율 →','Cost efficiency →')}</text>
      <text class="maxl" transform="translate(12 ${(P.t+H-P.b)/2}) rotate(-90)" text-anchor="middle">${L('유입률 (유입/클릭) →','Inflow rate (inflow/clicks) →')}</text></svg>`;
  host.querySelectorAll('.mdot').forEach(n=>{const g=rows[+n.dataset.i];
    n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
      +`<div class="r"><span class="l">${L('유입률 (유입/클릭)','Inflow rate')}</span><b>${pct(infRate(g.b))}</b></div>`
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
