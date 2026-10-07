/* ===== 유입 분석 (v92) =====
   사이트 분석 도구(Adobe Analytics 등)에서 받은 IWV(인터랙팅 방문) · 랜딩별 IWV · 체류시간 구간 값을
   매체 · 광고상품 · 소재별로 모아 본다. 디지털 서머리 맨 아래 영역.
   ① 유입 흐름 (Sankey) — 처음엔 유입 → 랜딩 페이지 하나만 크게, ‹ › 로 클릭 → 유입 · 노출 → 클릭 단계로 넘겨 본다 (v100)
   ② 유입 효율 지도 (버블) — 가로 = 클릭 대비 유입률, 세로 = 유입당 단가(위로 갈수록 저렴), 크기 = IWV
   ③ 체류시간 분포 — 100% 막대(짧게 머문 방문 → 오래 머문 방문), 평균 체류시간 순
      · 랜딩 페이지별 (v106) — 지도 옆, 랜딩 페이지마다 세로 100% 기둥(아래 = 짧게 · 위 = 오래). 랜딩이 적힌 체류 데이터가 있을 때만
      · 매체별(묶음별) — 가로 막대, 구분으로 나누기를 따른다
   ④ 상세 표 — 매체 서머리와 같은 표(헤더 편집 · 머리글 설명 · 정렬 · 열 너비). 행 머리는 '묶음' 을 따르다가 헤더 편집에서 바꾸면 그대로 둔다 (v93)
   데이터가 전혀 없는 캠페인에서는 영역 자체를 감춘다. */
var INF={dim:'media',mapSeg:''};
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
/* seg — 구분으로 나누기 (v102): 같은 매체라도 구분이 다르면 다른 줄. 구분은 줄을 묶는 머리일 뿐 따로 그리지 않는다 */
function infGroups(dim,okSet,seg,onlySeg){
  const map=new Map();
  factFilter().forEach(f=>{
    if(okSet&&!okSet.has(f.lid))return;
    if(onlySeg!=null&&(f.segment||'')!==onlySeg)return;
    let key,lab,sub,col;
    if(dim==='product'){key=f.media+'\u0001'+f.product;lab=f.product||'–';sub=f.media;col=f.media;}
    else if(dim==='creative'){key=f.creative;lab=f.creative||'–';sub='';col=f.creative;}
    else{key=f.media;lab=f.media||'–';sub='';col=f.media;}
    const sg=seg?(f.segment||''):null;
    if(seg)key=sg+'\u0002'+key;
    let g=map.get(key);if(!g){g={key,lab,sub,col,seg:sg,fs:[]};map.set(key,g);}
    g.fs.push(f);});
  return [...map.values()].map(g=>({key:g.key,lab:g.lab,sub:g.sub,col:g.col,seg:g.seg,b:aggFacts(g.fs)}));}
/* 구분 순서 = 예상 효율(라인)에 처음 나온 순서. 구분이 없는 줄은 맨 뒤 */
const infSegRank=()=>{const m=new Map();LINES.forEach(l=>{const s=l.segment||'';if(s&&!m.has(s))m.set(s,m.size);});return s=>s?(m.has(s)?m.get(s):m.size):m.size+1;};
const infSegLab=s=>s===''?L('(구분 없음)','(no segment)'):s==='__etc'?L('그 외','Others'):s;
const infColor=g=>{if(g.col==='__etc')return 'rgb(150,157,166)';try{const c=hueOf(g.col);return `rgb(${c[0]},${c[1]},${c[2]})`;}catch(e){return 'var(--acc)';}};
const infName=g=>[g.seg?infSegLab(g.seg):'',g.sub,g.lab].filter(Boolean).join(' · ');
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
  /* 구분으로 나누기 (v102) — 머리의 체크. 유입 데이터에 구분이 둘 이상일 때만 보인다 */
  const rkS=infSegRank(),segList=infSegList(okSet).sort((a,b)=>rkS(a)-rkS(b));
  const segOK=segList.length>=2;
  const useSeg=!!INF.seg&&segOK;
  {const lb=$('infSegLbl'),sc=$('infSegChk');
    if(lb)lb.classList.toggle('hidden',!segOK);
    if(sc){sc.checked=!!INF.seg;sc.onchange=()=>{INF.seg=sc.checked;renderInflow();
      try{if(!isClient()){markDirty();saveLocal();}}catch(x){}};}}
  const all=infGroups(dim,okSet,useSeg);
  const rk=infSegRank();
  const rows=all.filter(g=>infHas(g.b)).sort((a,b)=>(useSeg?rk(a.seg)-rk(b.seg):0)||(b.b.iwv||0)-(a.b.iwv||0)||(b.b.click||0)-(a.b.click||0));
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
  /* 랜딩 페이지별 체류시간 (v106) — 랜딩이 적힌 체류 데이터가 하나라도 있으면 지도 옆에 */
  const LD=infLandGroups(okSet),ldOK=LD.some(g=>g.key!==LAND_NONE);
  body.innerHTML=`<div class="infkpis">
      ${kp('IWV (All)',fmt(A.iwv),L(`전체 클릭 ${fmt(A.click)}`,`${fmt(A.click)} clicks in total`))}
      ${kp(L('유입률 (유입/클릭)','Inflow rate (inflow/clicks)'),pct(infRate(A)),L('캠페인 전체 클릭 기준','based on all campaign clicks'))}
      ${kp(L('유입당 단가','Cost per IWV'),won(Math.round(infCpv(A))||0),L(`전체 소진 ${won(Math.round(A.cost))}`,`total spend ${won(Math.round(A.cost))}`))}
      ${kp(L('평균 체류시간','Avg. time on site'),fmtDur(dwAvg(A)),isFinite(dw30Rate(A))?L(`30초 이상 ${pct(dw30Rate(A),1)}`,`${pct(dw30Rate(A),1)} stay 30s+`):'')}
    </div>
    <div class="infcell infflow"><div class="infh"><b>${L('유입 흐름','Inflow flow')}</b><span>${L('‹ › 로 노출 → 클릭 · 클릭 → 유입 단계도 넘겨 볼 수 있어요 · 매체 색 = 다음 단계로 넘어간 몫 · 회색 = 이탈 · 마우스를 올리면 잔존율','‹ › to step through impressions → clicks → inflow · media color = carried on · gray = dropped · hover for retention')}</span></div>
      <div id="infSankey"></div></div>
    <div class="infgrid${ldOK?' ld3':''}">
      <div class="infcell infmapc"><div class="infh"><b>${L('유입 효율 지도','Inflow efficiency map')}</b><span>${ldOK?L('원 크기 = 유입','size = inflow'):L('위 = 유입률 높음 · 오른쪽 = 비용 효율 좋음 · 원 크기 = 유입','up = higher inflow rate · right = more cost-efficient · size = inflow')}</span>
          ${segOK?`<select class="ctl sm infmapseg" id="infMapSeg" title="${L('구분 하나만 골라 보기','Show one segment only')}"><option value="">${L('전체 (구분 없이)','All (no segment)')}</option>${segList.map(x=>`<option value="${esc(x)}"${INF.mapSeg===x?' selected':''}>${esc(infSegLab(x))}</option>`).join('')}</select>`:''}</div>
        <div class="infmap" id="infMap"></div></div>
      ${ldOK?`<div class="infcell infldc"><div class="infh"><b>${L('체류시간 분포 · 랜딩 페이지별','Time on site · by landing page')}</b><span>${L('평균 체류시간 순','by average')}</span></div>
        <div id="infLand"></div></div>`:''}
      <div class="infcell infdwc"><div class="infh"><b>${ldOK?L('체류시간 분포 · ','Time on site · ')+infDimLab(dim):L('체류시간 분포','Time on site')}</b><span>${ldOK?L('평균 체류시간 순','by average'):L('방문을 머문 시간 구간으로 나눈 비율 · 평균 체류시간 순','Share of visits by time spent · sorted by average')}</span>
          <span class="infbl">${INF_BANDS.map((x,i)=>`<i style="--op:${INF_BAND_OP[i]}"></i>${L(x.l,x.en)}`).join('')}</span></div>
        <div id="infDwell"></div></div>
    </div>
    <div class="infcell"><div class="infh"><b>${L('유입 효율 상세분석','Inflow efficiency details')}</b><span>${L('머리글을 누르면 설명 · 정렬','click a header for its description · sorting')}</span>
        <span class="switch${infTbl().allMedia?'':' on'}" id="infOnlySw" title="${L('끄면 유입 데이터가 없는 매체까지 모두 보여 줍니다','Turn off to show media without inflow data too')}"><i></i> ${L('유입 발생 매체만','Only media with inflow')}</span>
        ${isClient()?'':`<button class="btn sm infcfg" id="infCfgBtn">${L('⚙ 헤더 편집','⚙ Edit headers')}</button>`}</div>
      <div class="hidden" id="infCfgBox"></div>
      <div class="tbl-wrap noy" id="infTblWrap"><table class="tbl gln fit cmpt inftbl" id="infTbl"></table></div></div>
    ${miss.length?`<div class="hint infmiss">${L(`IWV 가 없거나 ${INF_MIN}건 미만이라 분석에서 뺀 매체`,`Excluded (no IWV or fewer than ${INF_MIN})`)}: <span data-noi18n>${esc(miss.join(' · '))}</span></div>`:''}`;
  try{infSankey($('infSankey'),rows,T,useSeg);}catch(e){console.warn(e);}
  /* 지도 높이 = 옆 체류시간 분포의 막대 영역 높이 — 두 카드 높이를 맞춘다 */
  const dwR=rows.filter(g=>dwSum(g.b)>0),nDw=dwR.length,nSh=useSeg?new Set(dwR.map(g=>g.seg)).size:0;
  /* 효율 지도는 구분으로 나누지 않는다(원이 너무 작아진다) — 전체, 또는 머리에서 고른 구분 하나만 (v103) */
  const mapRows=()=>infGroups(dim,okSet,false,segOK&&INF.mapSeg!=null&&INF.mapSeg!==''&&segList.includes(INF.mapSeg)?INF.mapSeg:null).filter(g=>infHas(g.b));
  const mapH=nDw?nDw*44+(useSeg?nSh*16:0)+26:340;
  try{infMap($('infMap'),mapRows(),T,mapH);}catch(e){console.warn(e);}
  {const ms=$('infMapSeg');if(ms)ms.onchange=()=>{INF.mapSeg=ms.value;try{infMap($('infMap'),mapRows(),T,mapH);}catch(e){console.warn(e);}};}
  try{infDwell($('infDwell'),rows);}catch(e){console.warn(e);}
  if(ldOK)try{infLandDwell($('infLand'),LD);}catch(e){console.warn(e);}
  INF_OK=okSet;
  try{infTable();}catch(e){console.warn(e);}
  {const sw=$('infOnlySw');if(sw)sw.onclick=()=>{const c=infTbl();c.allMedia=!c.allMedia;sw.classList.toggle('on',!c.allMedia);
    infTable();try{if(!isClient()){markDirty();saveLocal();}}catch(e){}};}
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

/* ---------- ① 유입 흐름 (v100 — 한 단계씩 크게, ‹ › 로 넘겨 본다) ----------
   처음에는 ③ 유입 → 랜딩 페이지 하나만 가운데에 크게. ‹ 를 누르면 ② 클릭 → 유입, 한 번 더 누르면 ① 노출 → 클릭.
   · 그래프마다 **자기 단계의 배율**로 그린다 — 노출 · 클릭 · 유입은 숫자 단위가 수백~수천 배 다르다
   · 넘길 때 두 그래프에 함께 있는 기둥이 커지며(작아지며) 옆으로 옮겨 가 새 그래프의 축이 된다
     (예: ①의 오른쪽 '클릭' 기둥이 커지면서 왼쪽으로 가 ②의 왼쪽 축이 된다)
   · ①② 는 매체별로 다음 단계로 넘어간 몫(매체 색)과 이탈(회색)로 갈라진다
   · '구분으로 나누기'(영역 머리, v102)를 켜면 같은 매체라도 구분별로 따로 — 구분은 매체를 묶는 머리(왼쪽 괄호)일 뿐 구분 자체의 숫자는 그리지 않는다 */
if(INF.step==null)INF.step=2;
const INF_TOP=10,INF_NW=10;
/* 유입 데이터가 있는 팩트의 구분 목록 — 둘 이상이어야 '구분으로 나누기' 가 의미가 있다 */
function infSegList(okSet){
  const s=new Set();
  factFilter().forEach(f=>{if(okSet&&!okSet.has(f.lid))return;if(infHas(f))s.add(f.segment||'');});
  return [...s];}
/* useSeg — 줄이 이미 구분 · 매체로 나뉘어 들어온다(infGroups). 구분은 줄을 묶는 머리로만 그린다 (v102) */
function infFlowModel(rows0,useSeg){
  const lands=INF_LAND.filter(x=>rows0.some(g=>(+g.b[x.k]||0)>0));
  const landSum=b=>lands.reduce((s,x)=>s+(+b[x.k]||0),0);
  const iwvB=b=>Math.max(+b.iwv||0,landSum(b));
  const iwvOf=g=>iwvB(g.b);
  const clkOf=g=>Math.max(+g.b.click||0,iwvOf(g));
  const impOf=g=>Math.max(+g.b.imp||0,clkOf(g));
  const rk=infSegRank();
  const MAXR=useSeg?14:10;
  let rows=rows0.slice().sort((a,b)=>iwvOf(b)-iwvOf(a)||clkOf(b)-clkOf(a));
  if(rows.length>MAXR){const rest=rows.slice(MAXR-1),b=aggFacts([]);rest.forEach(g=>{AMET.concat(['cost']).forEach(m=>b[m]+=+g.b[m]||0);});
    rows=rows.slice(0,MAXR-1).concat([{key:'__etc',lab:L(`그 외 ${rest.length}개`,`${rest.length} more`),sub:'',col:'__etc',seg:useSeg?'__etc':null,b}]);}
  rows=rows.filter(g=>impOf(g)>0);
  if(useSeg)rows.sort((a,b)=>(a.seg==='__etc')-(b.seg==='__etc')||rk(a.seg)-rk(b.seg)||iwvOf(b)-iwvOf(a)||clkOf(b)-clkOf(a));
  const R=lands.map(x=>({k:x.k,l:x.l,kind:'land'}));
  const otherOf=g=>Math.max((+g.b.iwv||0)-landSum(g.b),0);
  if(rows.some(g=>otherOf(g)>0))R.push({k:'__other',l:L('랜딩 구분 없음','other landing'),kind:'other'});
  const flowTo=(g,r)=>r.kind==='land'?(+g.b[r.k]||0):otherOf(g);
  const sum=f=>rows.reduce((s,g)=>s+f(g),0);
  const TI=sum(impOf),TC=sum(clkOf),TV=sum(iwvOf);
  const ST=[
    {ka:'imp',kb:'clk',n:'①',la:L('노출','Impressions'),sa:L('노출','imps'),lb:L('클릭','Clicks'),rl:'CTR',a:impOf,b:clkOf,ta:TI,tb:TC},
    {ka:'clk',kb:'iwv',n:'②',la:L('클릭','Clicks'),sa:L('클릭','clicks'),lb:L('유입 (IWV)','Inflow (IWV)'),rl:L('유입률','Inflow rate'),a:clkOf,b:iwvOf,ta:TC,tb:TV}];
  return {rows,R,ST,flowTo,iwvOf,clkOf,impOf,TI,TC,TV,useSeg};}
const infFlowHM=M=>Math.max(380,Math.min(540,M.rows.length*48+60));
const infBand=(xa,ya,ha,xb,yb,hb)=>{const cx=(xa+xb)/2;
  return `M${xa},${ya} C${cx},${ya} ${cx},${yb} ${xb},${yb} L${xb},${yb+hb} C${cx},${yb+hb} ${cx},${ya+ha} ${xa},${ya+ha} Z`;};
const infAt=at=>Object.entries(at||{}).map(([k,v])=>` data-${k}="${esc(String(v))}"`).join('');
const infNodeSVG=n=>`<rect class="${n.cls}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"${n.rx?` rx="${n.rx}"`:''}${n.fill?` style="fill:${n.fill}"`:''}${infAt(n.at)}></rect>`;
const infLinkSVG=l=>`<path class="${l.cls}" d="${infBand(l.xa,l.ya,l.ha,l.xb,l.yb,l.hb)}" style="fill:${l.fill}"${infAt(l.at)}></path>`;
/* 단계 v(0 · 1 · 2)의 그림 — 마디 · 띠 · 이름표. 마디 id 는 단계를 넘어 같은 값을 가리키면 같다
   (①의 오른쪽 'clk:매체' = ②의 왼쪽 'clk:매체') — 넘길 때 이 마디들이 옮겨 가며 커진다 */
function infFlowLayout(M,v,W,HM){
  const rows=M.rows,TOP=INF_TOP,NW=INF_NW,SG=5,SGG=18;
  const out={nodes:[],links:[],labs:''};
  const narrow=W<520;
  /* 왼쪽 이름표 자리 — 구분으로 나누면 맨 왼쪽에 구분 이름 칸(SW)을 더 둔다 */
  const SW=M.useSeg?(narrow?66:84):0;
  const LW=SW+Math.round(Math.min(150,Math.max(92,W*.2))),RW=Math.round(Math.min(150,Math.max(100,W*.21)));
  const clipN=narrow?10:15;
  const pf=x=>pct(x,x<.01?2:1);
  const segOf=i=>M.useSeg?rows[i].seg:null;
  const spread=(cs,gap,lo,hi)=>{const o=cs.map((c,i)=>({c,i,y:c})).sort((a,b)=>a.c-b.c);
    for(let k=1;k<o.length;k++)if(o[k].y<o[k-1].y+gap)o[k].y=o[k-1].y+gap;
    const over=o.length?o[o.length-1].y-hi:0;if(over>0)o.forEach(x=>x.y-=over);
    for(let k=o.length-2;k>=0;k--)if(o[k].y>o[k+1].y-gap)o[k].y=o[k+1].y-gap;
    const under=o.length?lo-o[0].y:0;if(under>0)o.forEach(x=>x.y+=under);
    const r=[];o.forEach(x=>r[x.i]=x.y);return r;};
  /* 기둥 하나 — 값 비중대로 쌓는다. 구분이 바뀌는 자리는 틈을 넓혀 묶음이 보이게 */
  const gapsOf=vals=>{const vis=vals.map((x,i)=>x>0?i:-1).filter(i=>i>=0);
    return {vis,gap:vis.map((i,p)=>p===0?0:(M.useSeg&&segOf(i)!==segOf(vis[p-1])?SGG:SG))};};
  const column=(vals,k0)=>{const {vis,gap}=gapsOf(vals),gs=gap.reduce((a,b)=>a+b,0);
    const tot=vals.reduce((a,x)=>a+x,0)||1,k=k0||(HM-gs)/tot;
    const full=vis.reduce((a,i)=>a+Math.max(vals[i]*k,1),0)+gs;
    let y=TOP+Math.max(0,(HM-full)/2);
    const N=vals.map(()=>({y:0,h:0,used:0}));
    vis.forEach((i,p)=>{y+=gap[p];const h=Math.max(vals[i]*k,1);N[i]={y,h,used:0};y+=h;});
    return {N,k};};
  /* 매체 이름표 자리 — 마디 가운데에서 시작해 겹치지 않게 벌린다 (이름표 · 구분 괄호가 같이 쓴다) */
  const labelYs=N=>{const idx=N.map((n,i)=>n.h?i:-1).filter(i=>i>=0);
    const sp=spread(idx.map(i=>N[i].y+N[i].h/2),30,TOP+6,TOP+HM-10);const ly=[];idx.forEach((i,j)=>ly[i]=sp[j]);return ly;};
  /* 매체 이름표 — 기둥 왼쪽(오른쪽 끝 맞춤), 벌어진 만큼 짧은 선 */
  const rowLabels=(N,x,valTxt,ly)=>{const cs=N.map(n=>n.y+n.h/2);let s='';
    rows.forEach((g,i)=>{const y=ly[i];if(!N[i].h)return;
      if(Math.abs(y-cs[i])>2)s+=`<path class="sklead" d="M${x-5},${y} L${x-1},${cs[i]}"></path>`;
      s+=`<text class="sklab" x="${x-8}" y="${y-2}" text-anchor="end" data-i="${i}">${esc(infClip(g.lab,clipN))}</text>
        <text class="skval" x="${x-8}" y="${y+11}" text-anchor="end">${valTxt(g)}</text>`;});
    return s;};
  /* 구분 머리 — 맨 왼쪽 칸에 구분 이름 + 그 구분 매체들(마디와 이름표 모두)을 감싸는 세로 괄호선.
     구분 자체의 숫자는 그리지 않는다 */
  const segHeads=(N,ly)=>{if(!M.useSeg)return '';
    const grp=[];rows.forEach((g,i)=>{if(!N[i].h)return;
      const t=Math.min(N[i].y,ly[i]-12),b=Math.max(N[i].y+N[i].h,ly[i]+14),l=grp[grp.length-1];
      if(l&&l.s===g.seg){l.t=Math.min(l.t,t);l.b=Math.max(l.b,b);}else grp.push({s:g.seg,t,b});});
    /* 이웃 괄호가 겹치면 가운데에서 나눈다 */
    for(let k=1;k<grp.length;k++)if(grp[k].t<grp[k-1].b+6){const m=(grp[k].t+grp[k-1].b)/2;grp[k-1].b=m-3;grp[k].t=m+3;}
    let s='';
    grp.forEach(x=>{const cy=(x.t+x.b)/2;
      s+=`<path class="sksgl" d="M${SW-6},${x.t} L${SW-10},${x.t} L${SW-10},${x.b} L${SW-6},${x.b}"></path>
        <text class="sksg" x="${SW-16}" y="${cy+4}" text-anchor="end">${esc(infClip(infSegLab(x.s),narrow?8:11))}</text>`;});
    return s;};
  if(v<2){
    /* ①② — 다음 단계로 넘어간 몫(오른쪽 위 기둥, 매체별로 쌓임) + 이탈(오른쪽 아래 회색) */
    const s=M.ST[v],xL=LW,xR=W-RW-NW;
    const {N,k}=column(rows.map(s.a),0);
    const drop=s.ta-s.tb;
    const hB=Math.max(s.tb*k,3),hD=Math.max(drop*k,0),GP=18;
    const rTop=TOP+Math.max(0,(HM-(hB+GP+hD))/2),dTop=rTop+hB+GP;
    let bu=0,du=0;
    rows.forEach((g,i)=>{const n=N[i];if(!n.h)return;const col=infColor(g);
      const vb=s.b(g),vd=s.a(g)-vb,hb=vb*k,hd=Math.max(n.h-hb,0);
      if(vb>0){const h=Math.max(hb,.8);
        out.links.push({cls:'sklink pb',xa:xL+NW,ya:n.y,ha:h,xb:xR,yb:rTop+bu,hb:h,fill:col,at:{i,p:v,s:'b'}});
        out.nodes.push({id:`${s.kb}:${g.key}`,cls:'sknode',x:xR,y:rTop+bu,w:NW,h,fill:col,at:{i,p:v}});
        bu+=hb;}
      if(vd>0&&hd>0){out.links.push({cls:'sklink pd',xa:xL+NW,ya:n.y+hb,ha:hd,xb:xR,yb:dTop+du,hb:vd*k,fill:col,at:{i,p:v,s:'d'}});du+=vd*k;}
      out.nodes.push({id:`${s.ka}:${g.key}`,cls:'sknode',x:xL,y:n.y,w:NW,h:n.h,fill:col,at:{i,p:v}});});
    if(bu<hB)out.nodes.push({id:`${s.kb}:__rest`,cls:'sknode bn',x:xR,y:rTop+bu,w:NW,h:hB-bu});
    if(hD>0)out.nodes.push({id:`drop${v}`,cls:'sknode dn',x:xR,y:dTop,w:NW,h:hD,at:{drop:v}});
    {const ly=labelYs(N);out.labs+=segHeads(N,ly)+rowLabels(N,xL,g=>`${s.sa} ${fmt(s.a(g))}`,ly);}
    const by=rTop+hB/2,dy=dTop+hD/2;
    const yb=Math.max(TOP+8,Math.min(by,dy-34));
    out.labs+=`<text class="sklab big" x="${xR+NW+8}" y="${yb-2}">${s.lb}</text>
      <text class="skval b" x="${xR+NW+8}" y="${yb+13}">${fmt(s.tb)} · ${pf(s.ta?s.tb/s.ta:NaN)}</text>`;
    if(hD>0){const yd=Math.max(dy,yb+36);
      out.labs+=`<text class="sklab dl" x="${xR+NW+8}" y="${yd-2}" data-drop="${v}">${L('이탈','Dropped')}</text>
      <text class="skval" x="${xR+NW+8}" y="${yd+11}">${fmt(drop)} · ${pf(s.ta?drop/s.ta:NaN)}</text>`;}
    return out;}
  /* ③ 유입 → 랜딩 페이지 */
  const R=M.R,rv=R.map(r=>rows.reduce((s,g)=>s+M.flowTo(g,r),0));
  const RG=16,xL=LW,xR=W-RW-NW;
  const {gap}=gapsOf(rows.map(M.iwvOf)),gs=gap.reduce((a,b)=>a+b,0);
  /* 양쪽 기둥 같은 배율 — 틈이 더 많은 쪽에 맞춘다 */
  const k=(HM-Math.max(gs,RG*Math.max(R.length-1,0))-R.length*2)/(M.TV||1);
  const {N}=column(rows.map(M.iwvOf),k);
  const rH=rv.reduce((s,x)=>s+Math.max(x*k,2),0)+RG*Math.max(R.length-1,0);
  let ry=TOP+Math.max(0,(HM-rH)/2);const RN=rv.map(x=>{const h=Math.max(x*k,2);const o={y:ry,h,used:0};ry+=h+RG;return o;});
  rows.forEach((g,i)=>{const n=N[i];if(!n.h)return;const col=infColor(g);
    out.nodes.push({id:`iwv:${g.key}`,cls:'sknode',x:xL,y:n.y,w:NW,h:n.h,fill:col,at:{i,p:2}});
    R.forEach((r,j)=>{const x=M.flowTo(g,r);if(!(x>0))return;const h=x*k;
      out.links.push({cls:'sklink zf',xa:xL+NW,ya:n.y+n.used,ha:h,xb:xR,yb:RN[j].y+RN[j].used,hb:h,fill:col,at:{i,j,v:x,p:2}});
      n.used+=h;RN[j].used+=h;});});
  const cs=RN.map(n=>n.y+n.h/2),ly=spread(cs,32,TOP+6,TOP+HM-10);
  R.forEach((r,j)=>{const n=RN[j];
    out.nodes.push({id:`land:${r.k}`,cls:'sknode r',x:xR,y:n.y,w:NW,h:n.h,rx:2,fill:r.kind==='other'?'var(--gline)':'var(--acc)',at:{j}});
    out.labs+=`<text class="sklab" x="${xR+NW+8}" y="${ly[j]-2}" data-j="${j}">${esc(r.l)}</text>
      <text class="skval" x="${xR+NW+8}" y="${ly[j]+11}">${fmt(rv[j])} · ${pct(M.TV?rv[j]/M.TV:NaN,1)}</text>`;});
  {const ly=labelYs(N);out.labs+=segHeads(N,ly)+rowLabels(N,xL,g=>`${L('유입','inflow')} ${fmt(M.iwvOf(g))}`,ly);}
  return out;}
const infFlowNames=()=>[L('노출 → 클릭','Impressions → clicks'),L('클릭 → 유입','Clicks → inflow'),L('유입 → 랜딩 페이지','Inflow → landing page')];
const infFlowShort=()=>[L('노출 → 클릭','Imps → clicks'),L('클릭 → 유입','Clicks → inflow'),L('유입 → 랜딩','Inflow → landing')];
/* 가운데 제목 · 점 · 양옆 화살표 설명 */
function infFlowHead(host,M,v,fade){
  const nm=infFlowNames(),pf=x=>pct(x,x<.01?2:1);
  const t=host.querySelector('.sktitle'),s=host.querySelector('.sksub');
  if(t){t.textContent=`${'①②③'[v]} ${nm[v]}`;
    s.innerHTML=v===0?`CTR <b class="mono">${pf(M.TI?M.TC/M.TI:NaN)}</b> · ${L('노출','imps')} ${fmt(M.TI)}`
      :v===1?`${L('유입률','Inflow rate')} <b class="mono">${pf(M.TC?M.TV/M.TC:NaN)}</b> · ${L('클릭','clicks')} ${fmt(M.TC)}`
      :`${L('유입','inflow')} <b class="mono">${fmt(M.TV)}</b>`;
    if(fade){const h=t.parentNode;h.classList.remove('skfade');void h.offsetWidth;h.classList.add('skfade');}}
  host.querySelectorAll('.skdots button').forEach((b,i)=>b.classList.toggle('on',i===v));
  const nl=host.querySelector('.sknav.l'),nr=host.querySelector('.sknav.r');
  const sh=infFlowShort();
  if(nl){nl.querySelector('button').disabled=v<=0;nl.querySelector('span').textContent=v>0?sh[v-1]:'';
    nl.querySelector('button').title=v>0?nm[v-1]:'';}
  if(nr){nr.querySelector('button').disabled=v>=2;nr.querySelector('span').textContent=v<2?sh[v+1]:'';
    nr.querySelector('button').title=v<2?nm[v+1]:'';}}
function infSankey(host,rows0,T,useSeg){
  if(!host)return;
  const M=infFlowModel(rows0,!!useSeg);
  if(!M.rows.length){host.innerHTML='';return;}
  host.__M=M;
  infFlowDraw(host,M);}
function infFlowDraw(host,M){
  const v=Math.max(0,Math.min(2,INF.step==null?2:INF.step));
  const nm=infFlowNames();
  host.innerHTML=`<div class="skstage">
      <div class="sknav l"><button type="button" class="skarr" data-go="-1" aria-label="${L('이전 단계','Previous step')}">‹</button><span data-go="-1"></span></div>
      <div class="skview"><div class="skhead"><b class="sktitle"></b><span class="sksub"></span></div>
        <div class="skdots">${nm.map((n,i)=>`<button type="button" data-step="${i}" title="${esc(n)}" aria-label="${esc(n)}"></button>`).join('')}</div>
        <div class="skbox"></div></div>
      <div class="sknav r"><button type="button" class="skarr" data-go="1" aria-label="${L('다음 단계','Next step')}">›</button><span data-go="1"></span></div></div>`;
  infFlowHead(host,M,v,false);
  const box=host.querySelector('.skbox');
  const W=Math.max(Math.floor(box.clientWidth)||640,300),HM=infFlowHM(M),H=HM+INF_TOP*2+8;
  const P=infFlowLayout(M,v,W,HM);
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="sksvg">${P.links.map(infLinkSVG).join('')}${P.nodes.map(infNodeSVG).join('')}${P.labs}</svg>`;
  host.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>infFlowGo(host,M,(INF.step==null?2:INF.step)+(+b.dataset.go)));
  host.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>infFlowGo(host,M,+b.dataset.step));
  infFlowWire(host,M,v);}
/* 단계 넘기기 — 두 그래프에 함께 있는 마디는 자리 · 크기를 바꾸며 옮겨 가고,
   나머지는 넘기는 방향으로 밀려 나가며 흐려진다 / 반대쪽에서 들어오며 진해진다. 두 칸 건너뛰면 한 칸씩 이어서 */
function infFlowGo(host,M,to){
  to=Math.max(0,Math.min(2,to));
  const from=INF.step==null?2:INF.step;
  if(INF.anim||to===from)return;
  const dir=to>from?1:-1,nx=from+dir;
  const box=host.querySelector('.skbox');if(!box)return;
  /* 넘기는 동안 영역이 다시 그려졌으면(자동 저장 · 필터 등) 지금 화면의 흐름 그래프에 이어서 그린다 */
  const fin=()=>{INF.step=nx;INF.anim=false;INF.stepped=performance.now();   /* 등장 애니메이션(23-anim)은 이번 다시 그리기를 건너뛴다 */
    const h=host.isConnected?host:$('infSankey');if(!h)return;const m=h===host?M:(h.__M||M);
    infFlowDraw(h,m);if(nx!==to)setTimeout(()=>infFlowGo(h,m,to),30);};
  let reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  if(reduce){fin();return;}
  INF.anim=true;try{hideTip();}catch(e){}
  try{
    const W=Math.max(Math.floor(box.clientWidth)||640,300),HM=infFlowHM(M),H=HM+INF_TOP*2+8;
    const A=infFlowLayout(M,from,W,HM),B=infFlowLayout(M,nx,W,HM);
    const bId=new Map(B.nodes.filter(n=>n.id).map(n=>[n.id,n]));
    const aIds=new Set(A.nodes.filter(n=>n.id).map(n=>n.id));
    const shared=A.nodes.filter(n=>n.id&&bId.has(n.id)).map(a=>({a,b:bId.get(a.id)}));
    const aOnly=A.nodes.filter(n=>!n.id||!bId.has(n.id)),bOnly=B.nodes.filter(n=>!n.id||!aIds.has(n.id));
    box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="sksvg skanim">
      <g class="ga">${A.links.map(infLinkSVG).join('')}${aOnly.map(infNodeSVG).join('')}${A.labs}</g>
      <g class="gb" opacity="0">${B.links.map(infLinkSVG).join('')}${bOnly.map(infNodeSVG).join('')}${B.labs}</g>
      <g class="gs">${shared.map(x=>infNodeSVG(x.a)).join('')}</g></svg>`;
    infFlowHead(host,M,nx,true);
    const ga=box.querySelector('.ga'),gb=box.querySelector('.gb'),rs=[...box.querySelectorAll('.gs rect')];
    const D=820,t0=performance.now(),dx=Math.min(110,W*.1);
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const lerp=(a,b,e)=>(a+(b-a)*e).toFixed(2);
    const frame=now=>{try{
      const t=Math.min(1,(now-t0)/D),e=ease(t);
      ga.setAttribute('opacity',Math.max(0,1-t/.42).toFixed(3));
      ga.setAttribute('transform',`translate(${(-dir*dx*e).toFixed(1)},0)`);
      gb.setAttribute('opacity',Math.max(0,Math.min(1,(t-.5)/.5)).toFixed(3));
      gb.setAttribute('transform',`translate(${(dir*dx*(1-e)).toFixed(1)},0)`);
      shared.forEach((x,i)=>{const r=rs[i];r.setAttribute('x',lerp(x.a.x,x.b.x,e));r.setAttribute('y',lerp(x.a.y,x.b.y,e));
        r.setAttribute('height',lerp(x.a.h,x.b.h,e));});
      if(t<1)requestAnimationFrame(frame);else fin();}catch(err){fin();}};
    requestAnimationFrame(frame);
  }catch(e){console.warn(e);fin();}}
/* 마우스 — 띠 · 마디 · 이름표 */
function infFlowWire(host,M,v){
  const svg=host.querySelector('.skbox svg');if(!svg)return;
  const rows=M.rows,pf=x=>pct(x,x<.01?2:1);
  const hl=fn=>svg.querySelectorAll('.sklink').forEach(p=>p.classList.toggle('dim',!fn(p)));
  const tr=(l,x)=>`<div class="r"><span class="l">${l}</span><b>${x}</b></div>`;
  const stepTip=(g,s)=>{const a=s.a(g),b=s.b(g);return `<div class="t">${esc(infName(g))} · ${s.la} → ${s.lb}</div>`
    +tr(s.la,fmt(a))+tr(s.lb,fmt(b))+tr(L('잔존율','retained')+` (${s.rl})`,pf(a?b/a:NaN))+tr(L('이탈','dropped'),`${fmt(a-b)} · ${pf(a?(a-b)/a:NaN)}`);};
  svg.querySelectorAll('.sklink').forEach(p=>{
    const g=rows[+p.dataset.i];
    p.addEventListener('mousemove',e=>{hl(q=>q.dataset.i===p.dataset.i);
      let h;
      if(v<2)h=stepTip(g,M.ST[v]);
      else{const r=M.R[+p.dataset.j],x=+p.dataset.v;
        h=`<div class="t">${esc(infName(g))} → ${esc(r.l)}</div>`+tr(L('유입','inflow'),fmt(x))
          +tr(L('이 매체 유입 중','of its inflow'),pct(M.iwvOf(g)?x/M.iwvOf(g):NaN,1));}
      showTip(e.clientX,e.clientY,h);});
    p.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});});
  svg.querySelectorAll('.sknode,.sklab').forEach(n=>{
    const on=()=>{if(n.dataset.i!=null)hl(p=>p.dataset.i===n.dataset.i);
      else if(n.dataset.j!=null)hl(p=>p.dataset.j===n.dataset.j);
      else if(n.dataset.drop!=null)hl(p=>p.classList.contains('pd'));};
    n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',()=>{hl(()=>true);hideTip();});
    if(n.dataset.i!=null){const g=rows[+n.dataset.i];
      n.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))}</div>`
        +tr(L('노출','Impressions'),fmt(M.impOf(g)))+tr(L('클릭','Clicks'),fmt(M.clkOf(g)))+tr('CTR',pf(M.impOf(g)?M.clkOf(g)/M.impOf(g):NaN))
        +tr(L('유입 (IWV)','Inflow (IWV)'),fmt(M.iwvOf(g)))+tr(L('유입률','Inflow rate'),pf(M.clkOf(g)?M.iwvOf(g)/M.clkOf(g):NaN))));}
    if(n.dataset.drop!=null){const s=M.ST[+n.dataset.drop];
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
  /* 구분으로 나눴으면 같은 매체가 여럿 — 이름 뒤에 구분을 붙인다 (v102) */
  const mlab=g=>g.seg!=null&&g.seg!==undefined?`${g.lab} · ${infSegLab(g.seg)}`:g.lab;
  /* 이름표 — 큰 원부터 위 · 아래 · 오른쪽 · 왼쪽 중 겹치지 않는 자리에. 자리가 없으면 생략(툴팁으로 확인) */
  const boxes=[];const hit=(a)=>boxes.some(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)
    ||a.x<P.l||a.x+a.w>W-P.r+6||a.y<P.t-2||a.y+a.h>H-P.b;
  const tw=t=>[...t].reduce((s,c)=>s+(c.charCodeAt(0)>255?11:6.4),0);
  rows.forEach((g,i)=>{const r=Rr(g.b.iwv);boxes.push({x:xs[i]-r*.7,y:ys[i]-r*.7,w:r*1.4,h:r*1.4,dot:1});});
  const labs={};
  order.forEach(i=>{const g=rows[i],cx=xs[i],cy=ys[i],r=Rr(g.b.iwv),t=infClip(mlab(g),22),w=tw(t),h=13;
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
  /* 구분으로 나눴으면 구분 순서대로 묶고 그 안에서 평균 체류시간 순 */
  const sg=rows0.some(g=>g.seg!=null),rk=infSegRank();
  const rows=rows0.filter(g=>dwSum(g.b)>0).sort((a,b)=>(sg?rk(a.seg)-rk(b.seg):0)||(dwAvg(b.b)||0)-(dwAvg(a.b)||0));
  if(!rows.length){host.innerHTML=`<div class="hint infempty">${L('체류시간 구간 데이터가 없습니다.','No time-on-site data.')}</div>`;return;}
  const rowHTML=(g,i)=>{const n=dwSum(g.b);
      const segs=INF_BANDS.map((x,bi)=>({bi,v:x.ks.reduce((s,k)=>s+(+g.b[k]||0),0)})).filter(s=>s.v>0);
      return `<div class="dwrow" data-i="${i}">
        <div class="dwl"><b title="${esc(infName(g))}">${esc(g.lab)}</b>${g.sub?`<span>${esc(g.sub)}</span>`:''}</div>
        <div class="dwbar">${segs.map(s=>`<i style="flex:${s.v} 1 0;--op:${INF_BAND_OP[s.bi]}"${s.bi>=2?` class="dk${s.bi>=3?' hi':''}"`:''} data-b="${s.bi}" data-v="${s.v}"><em>${pct(s.v/n,0)}</em></i>`).join('')}</div>
        <div class="dwr"><b class="mono">${fmtDur(dwAvg(g.b))}</b><span>${L(`방문 ${fmt(n)}`,`${fmt(n)} visits`)}</span></div></div>`;};
  /* 구분으로 나눴으면 유입 흐름처럼 — 왼쪽에 구분 이름 + 그 구분의 매체들을 감싸는 괄호 (v103) */
  if(sg){const grp=[];rows.forEach((g,i)=>{const l=grp[grp.length-1];if(l&&l.s===g.seg)l.idx.push(i);else grp.push({s:g.seg,idx:[i]});});
    host.innerHTML=`<div class="infdw sg">${grp.map(x=>`<div class="dwgrp"><div class="dwsegc"><b>${esc(infSegLab(x.s))}</b></div>
        <div class="dwrows">${x.idx.map(i=>rowHTML(rows[i],i)).join('')}</div></div>`).join('')}</div>`;}
  else host.innerHTML=`<div class="infdw">${rows.map(rowHTML).join('')}</div>`;
  host.querySelectorAll('.dwbar i').forEach(seg=>{const g=rows[+seg.closest('.dwrow').dataset.i],b=INF_BANDS[+seg.dataset.b],v=+seg.dataset.v;
    seg.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(infName(g))} · ${L(b.l,b.en)}</div>`
      +`<div class="r"><span class="l">${L('방문','Visits')}</span><b>${fmt(v)}</b></div>`
      +`<div class="r"><span class="l">${L('비율','Share')}</span><b>${pct(v/dwSum(g.b),1)}</b></div>`));
    seg.addEventListener('mouseleave',hideTip);});
}

/* ---------- ③-1 랜딩 페이지별 체류시간 (v106) ----------
   랜딩 페이지가 어디냐에 따라 머무는 시간이 크게 다르다 — 매체별 막대와 따로, 랜딩마다 세로 100% 기둥 하나.
   v106.2 — 위에 랜딩 이름, 기둥은 위 = 짧게 머문 방문(옅게) → 아래 = 오래 머문 방문(진하게), 아래에 평균 체류시간 · 방문 수.
   이름 · 기둥 · 평균 세 줄은 subgrid 로 기둥끼리 높이를 맞춘다(이름이 두 줄이 돼도 기둥 위끝이 가지런하게).
   구간 범례는 바로 옆 매체별 분포 머리의 것을 같이 쓴다(칸이 좁아 따로 두지 않는다).
   지금 조회 기간 · 필터, 분석 대상 라인(INF_MIN 이상)만. 랜딩을 안 적은 몫은 '(랜딩 미입력)' 기둥(맨 뒤) */
const infDimLab=d=>d==='product'?L('광고상품별','by product'):d==='creative'?L('소재별','by creative'):L('매체별','by media');
function infLandGroups(okSet){
  const m=new Map();
  factFilter().forEach(f=>{if(okSet&&!okSet.has(f.lid))return;if(!dwSum(f))return;
    const k=f.landing||LAND_NONE;let a=m.get(k);if(!a){a=[];m.set(k,a);}a.push(f);});
  return [...m].map(([k,fs])=>({key:k,lab:k===LAND_NONE?L('(랜딩 미입력)','(no landing)'):k,fs,b:aggFacts(fs)}));}
const INF_LD_MAX=6;
function infLandDwell(host,rows0){
  if(!host)return;
  let rows=rows0.filter(g=>dwSum(g.b)>0);
  /* 랜딩이 많으면 방문 많은 순으로 몇 개만, 나머지는 '그 외' 하나로 */
  if(rows.length>INF_LD_MAX){const keep=new Set(rows.slice().sort((a,b)=>dwSum(b.b)-dwSum(a.b)).slice(0,INF_LD_MAX-1).map(g=>g.key));
    const etc=rows.filter(g=>!keep.has(g.key)).flatMap(g=>g.fs);
    rows=rows.filter(g=>keep.has(g.key)).concat([{key:'__etc',lab:L('그 외','Others'),fs:etc,b:aggFacts(etc)}]);}
  const last=g=>g.key===LAND_NONE||g.key==='__etc'?1:0;
  rows.sort((a,b)=>last(a)-last(b)||(dwAvg(b.b)||0)-(dwAvg(a.b)||0));
  if(!rows.length){host.innerHTML=`<div class="hint infempty">${L('체류시간 구간 데이터가 없습니다.','No time-on-site data.')}</div>`;return;}
  /* 기둥이 많으면(5개 이상) 글자를 줄이고 방문 수는 숫자만 */
  const many=rows.length>4;
  const col=(g,i)=>{const n=dwSum(g.b);
    const segs=INF_BANDS.map((x,bi)=>({bi,v:x.ks.reduce((s,k)=>s+(+g.b[k]||0),0)})).filter(s=>s.v>0);
    return `<div class="ldcol" data-i="${i}">
      <div class="ldname"><b title="${esc(g.lab)}">${esc(g.lab)}</b></div>
      <div class="ldbar">${segs.map(s=>{const p=s.v/n;
        return `<i style="flex:${s.v} 1 0;--op:${INF_BAND_OP[s.bi]}"${s.bi>=2?` class="dk${s.bi>=3?' hi':''}"`:''} data-b="${s.bi}" data-v="${s.v}">${p>=.09?`<em>${pct(p,0)}</em>`:''}</i>`;}).join('')}</div>
      <div class="ldavg"><b class="mono">${many?esc(fmtDur(dwAvg(g.b))).replace(/ /g,'<br>'):esc(fmtDur(dwAvg(g.b)))}</b><span>${many?fmt(n):L(`방문 ${fmt(n)}`,`${fmt(n)} visits`)}</span></div></div>`;};
  host.innerHTML=`<div class="infld${many?' many':''}"><div class="ldcols">${rows.map(col).join('')}</div></div>`;
  host.querySelectorAll('.ldbar i').forEach(seg=>{const g=rows[+seg.closest('.ldcol').dataset.i],b=INF_BANDS[+seg.dataset.b],v=+seg.dataset.v;
    seg.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(g.lab)} · ${L(b.l,b.en)}</div>`
      +`<div class="r"><span class="l">${L('방문','Visits')}</span><b>${fmt(v)}</b></div>`
      +`<div class="r"><span class="l">${L('비율','Share')}</span><b>${pct(v/dwSum(g.b),1)}</b></div>`
      +`<div class="r"><span class="l">${L('평균 체류시간','Avg. time')}</span><b>${fmtDur(dwAvg(g.b))}</b></div>`
      +(isFinite(dw30Rate(g.b))?`<div class="r"><span class="l">${L('30초 이상 체류율','Stayed 30s+')}</span><b>${pct(dw30Rate(g.b),1)}</b></div>`:'')));
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
  /* 유입 발생 매체만 (v104, 기본 켬) — 끄면 유입 데이터가 없는 매체(라인)까지 모두 */
  const only=!cfg.allMedia;
  const draw=()=>buildPivot(tbl,cfg,SUM_DEF,SUM_CELL,draw,{
    facts:only?factFilter().filter(f=>INF_OK.has(f.lid)):factFilter(),lines:only?LINES.filter(l=>INF_OK.has(l.id)):LINES,fill:true});
  draw();
  try{enableHPager(tbl.closest('.infcell'),tbl.parentNode);}catch(e){}
}

/* 효율 버블이 다시 그려질 때(데이터 · 필터 · 기간이 바뀔 때) 함께 그린다 */
(function(){try{const orig=renderBubble;renderBubble=function(){const r=orig.apply(this,arguments);try{renderInflow();}catch(e){console.warn(e);}return r;};}catch(e){}})();
window.addEventListener('resize',(()=>{let t=0;return ()=>{clearTimeout(t);t=setTimeout(()=>{
  const d=$('tab-dash');if(d&&!d.classList.contains('hidden'))try{renderInflow();}catch(e){}},200);};})());
setTimeout(()=>{try{renderInflow();}catch(e){}},0);
