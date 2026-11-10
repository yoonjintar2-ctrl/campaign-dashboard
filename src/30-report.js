/* ===== 30. 리포트 (v143 틀 → v149 먼슬리 리포트 웹 버전) =====
   상위 메뉴 '리포트'. 한 달 = 한 캠페인이라 그 달 캠페인 문서(doc.report)에 그 달 기준 스냅샷이 들어 있다.
   doc.report = {v, y, m, unit:'천원', cats:[{k,lab,sp,ar}], camps:{ym:{id,r}},
     sp:{광고비 묶음:{브랜드:[[지상파,케이블,라디오,신문,잡지,디지털 동영상,PC,모바일]…1~m월]}},
     tvr:{업종:[[월,브랜드,매체(0 지상파 · 1 케이블&종편 · 2 TV set),모니터링,실집행,횟수,GRP,eq,모니터링CPRP,실집행CPRP,R1,R3,AF]]},
     det:{업종:[[브랜드,매체,채널·MPP,모니터링,실집행]]}  (당월)
     ar:{TV 업종:{브랜드:[[매체,채널,MPP,시급,초수,유형,모니터링,횟수,GRP,eq]]}}  (당월 · Nielsen 원자료 묶음)
     bub:{업종:{브랜드:{won,eq,r3}}}  (연 누적 — 가장 최근 달에만)
     own:[{m,t:[예산,GRP,eq,R1,R3],it:[[품목,예산,eq,R3]]}]  (코웨이 위클리 리포트 · 1~m월)
     arch:[{n:품목,cr:[{n,on,mo:[[월,예산,eq,R3,누적eq,누적R3]]}],img:[{id,on,mo,w,h}]}]}  (소재 아카이브 · 스토리보드는 assets/cr/)
   분석 문구는 없다 — 숫자와 그래프만. 업종 · 브랜드 · 월은 칩으로 바꿔 가며 한 화면에서 비교한다. */
var RPT={arcScope:'m',arcOwn:'all',bubSel:'',sosHi:'',sosMo:0,oldY:0,dgB:'',dgP:'m',y:0,m:0,cat:'',brand:'코웨이',sos:'ytd',sosMed:'atl',mix:'ytd',bub:'m',tblM:0,arcCat:'all'};
var RPT_DOC=null;   // var — 09-cloud applyDoc 이 먼저 불러도 되게
const rptOn=()=>!!(RPT_DOC&&RPT_DOC.v&&!RPT_DOC.none&&Array.isArray(RPT_DOC.cats));
const RPT_CW='#1d6fc2';
const RPT_PAL=['#9a8467','#5d8a84','#82739a','#b2875a','#6b7d93','#a36b7c','#77906d','#8f8a6c','#5e86a8','#8d7366'];
const RPT_MED=[{k:'t',l:'지상파',c:'#24406f',i:[0]},{k:'c',l:'케이블',c:'#6b8cc4',i:[1]},{k:'r',l:'라디오',c:'#c39a4e',i:[2]},
  {k:'n',l:'신문',c:'#8a7b68',i:[3]},{k:'g',l:'잡지',c:'#a77486',i:[4]},{k:'d',l:'디지털',c:'#4f9a8a',i:[5,6,7]}];
/* v150 — 먼슬리 리포트와 같은 기준: SOS · 미디어 믹스는 4대 매체(지상파 · 케이블 · 라디오 · 신문 · 잡지, Nielsen 모니터링), 디지털(Researchad)은 따로 */
const RP_ATL=['t','c','r','n','g'];
const RPT_MI=['지상파','케이블&종편','TV set'];
const RPT_TYPE={PR:'일반프로',SP:'스팟',TJ:'특집 · 재방'};
/* 품목 → 업종 (소재 아카이브 칩) */
const RPT_ICAT={'아이콘3':'정수기 일반','아이콘프로':'정수기 일반','아이콘얼음정수기':'정수기 얼음','카페얼음정수기':'정수기 얼음',
  '노블청정기':'공기청정기','히티브':'공기청정기','비데':'비데','스마트매트리스':'매트리스','안마매트리스':'매트리스',
  '페블체어2':'안마의자','트리플체어2':'안마의자','마사지셋/코어셋':'안마의자','음식물처리기':'음식물처리기','코웨이페스타':'브랜드'};
const rN=v=>v==null||!isFinite(v)?0:+v;
const rpSum=a=>a.reduce((s,x)=>s+rN(x),0);
const rpPct=(a,b)=>b>0?a/b*100:NaN;
const rpP=(v,d=0)=>isFinite(v)?v.toFixed(d)+'%':'–';
const rpYm=m=>`${RPT_DOC.y}-${String(m).padStart(2,'0')}`;

function rptYears(){
  if(rptOn()||(RPT_DOC&&RPT_DOC.y)){const ys=new Set([RPT_DOC.y]);Object.keys(RPT_DOC.camps||{}).forEach(k=>{const y=+k.slice(0,4);if(y)ys.add(y);});return [...ys].sort((a,b)=>a-b);}
  const t=String(CAMPAIGN.today||iso(new Date())).slice(0,10);
  const ds=[campStart(),campEnd(),t].map(d=>String(d||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)).map(Number);
  const y0=Math.min(...ds),y1=Math.max(...ds);
  const out=[];for(let y=y0;y<=y1&&out.length<10;y++)out.push(y);
  return out.length?out:[new Date().getFullYear()];}

/* ---------- 메뉴 — 올해 발행된 리포트는 달마다 한 줄(최신 달이 위), 올해 이전은 연도 한 줄(누르면 화면 안에서 달을 고른다) (v157) ---------- */
function rptThisYear(){const t=String(CAMPAIGN.today||iso(new Date())).slice(0,4);return +t||new Date().getFullYear();}
function rptMenuPaint(){
  const box=$('rptMenuList'),btn=$('rptMenuBtn');if(!box)return;
  const camps=(RPT_DOC&&RPT_DOC.camps)||{},Y=rptThisYear();
  const yms=Object.keys(camps).filter(k=>camps[k]&&camps[k].r).sort().reverse();
  const cur=yms.filter(k=>+k.slice(0,4)===Y),old=[...new Set(yms.filter(k=>+k.slice(0,4)<Y).map(k=>+k.slice(0,4)))].sort((a,b)=>b-a);
  /* 올해 리포트가 없으면(예: 1월) 가장 최근 해를 달로 */
  const ylist=cur.length?cur:yms.filter(k=>k.slice(0,4)===(yms[0]||'').slice(0,4)),olist=cur.length?old:old.filter(y=>String(y)!==(yms[0]||'').slice(0,4));
  const tab=($('tabs')||{}).dataset?.cur,me=RPT_DOC&&RPT_DOC.y?`${RPT_DOC.y}-${String(RPT_DOC.m).padStart(2,'0')}`:'';
  box.innerHTML=ylist.map(k=>`<button type="button" data-menu="report" data-rptmenu="${k}" class="${tab==='report'&&k===me&&!RPT.oldY?'on':''}">${L(`${k.slice(0,4)}년 ${k.slice(5,7)}월`,`${k.slice(5,7)}/${k.slice(0,4)}`)}</button>`).join('')
    +olist.map(y=>`<button type="button" data-menu="report" data-rptyear="${y}" class="${tab==='report'&&RPT.oldY===y?'on':''}">${L(`${y}년`,String(y))}</button>`).join('');
  if(btn)btn.classList.toggle('rpx',!!(ylist.length||olist.length));
  /* 메뉴 사용 · 권한 상태는 같은 data-menu 단추를 따라간다 */
  if(btn)box.querySelectorAll('button').forEach(b=>['menuoff','hidden','vhide'].forEach(c=>b.classList.toggle(c,btn.classList.contains(c))));
  box.querySelectorAll('[data-rptmenu]').forEach(b=>b.onclick=()=>{RPT.oldY=0;closeMegaPop();const ym=b.dataset.rptmenu;
    if(ym===me){switchTab('report');rptMenuPaint();}else{rptGo(ym);}});
  box.querySelectorAll('[data-rptyear]').forEach(b=>b.onclick=()=>{RPT.oldY=+b.dataset.rptyear;RPT.y=RPT.oldY;closeMegaPop();switchTab('report');rptMenuPaint();});}
function closeMegaPop(){try{if(typeof closeAreaPop==='function')closeAreaPop();}catch(e){}}

/* ---------- 다른 달로 — 그 달 캠페인을 열고 리포트 탭 그대로 ---------- */
async function rptGo(ym){
  const c=RPT_DOC&&RPT_DOC.camps&&RPT_DOC.camps[ym];if(!c||!c.id)return;
  if(CLOUD.campaign&&CLOUD.campaign.id===c.id)return;
  try{sessionStorage.setItem('dmd:rptGo','1');}catch(e){}
  if(CLOUD.shareView){const a=(CLOUD.advList||[]).find(x=>x.id===c.id);if(a&&a.code&&typeof switchByCode==='function')await switchByCode(a.code);}
  else if(typeof openCampaign==='function')await openCampaign(c.id);}
/* 캠페인이 바뀐 뒤 — 리포트에서 달을 바꿨으면 리포트 탭을 다시 연다 */
function rptResume(){let f='';try{f=sessionStorage.getItem('dmd:rptGo')||'';sessionStorage.removeItem('dmd:rptGo');}catch(e){}
  if(f&&typeof switchTab==='function'){try{switchTab('report');}catch(e){}}}

/* ---------- 칩 ---------- */
function rpChips(list,cur,attr,cls){
  return `<div class="rpchips ${cls||''}">${list.map(x=>`<button type="button" class="rpchip${x.k===cur?' on':''}${x.dis?' dis':''}" ${attr}="${esc(x.k)}"${x.dis?' disabled':''}>${x.c?`<i style="background:${x.c}"></i>`:''}${esc(x.l)}${x.s!=null?`<em>${esc(x.s)}</em>`:''}</button>`).join('')}</div>`;}
function rpSeg(list,cur,attr){
  return `<div class="rpseg">${list.map(x=>`<button type="button" class="${x.k===cur?'on':''}" ${attr}="${esc(x.k)}">${esc(x.l)}</button>`).join('')}</div>`;}
function rpCard(title,sub,body,tools,cls){
  return `<section class="rpcard ${cls||''}"><header><div class="t">${title}${sub?`<span>${sub}</span>`:''}</div>${tools?`<div class="tools">${tools}</div>`:''}</header><div class="bd">${body}</div></section>`;}

/* ---------- 업종 · 브랜드 ---------- */
const rpCat=()=>RPT_DOC.cats.find(c=>c.k===RPT.cat)||RPT_DOC.cats[0];
function rpSpend(cat){return (RPT_DOC.sp||{})[cat.sp]||{};}
/* 브랜드 순서 — 연 누적 광고비 큰 순(코웨이는 맨 앞). 색은 브랜드를 따라간다 */
function rpBrands(cat){
  const sp=rpSpend(cat),tot={};
  Object.entries(sp).forEach(([b,rows])=>tot[b]=rows.reduce((s,r)=>s+rpSum(r),0));
  ((RPT_DOC.tvr||{})[cat.k]||[]).forEach(r=>{if(!(r[1] in tot))tot[r[1]]=0;});
  const list=Object.keys(tot).filter(b=>tot[b]>0||b==='코웨이'||((RPT_DOC.tvr||{})[cat.k]||[]).some(r=>r[1]===b));
  list.sort((a,b)=>(b==='코웨이')-(a==='코웨이')||tot[b]-tot[a]);
  return list;}
/* v151 — 코웨이만 색, 경쟁사는 회색 명도만 */
function rpColMap(cat){const m={},bs=rpBrands(cat).filter(b=>b!=='코웨이');m['코웨이']=RPT_CW;bs.forEach((b,i)=>m[b]=rpMono(i,bs.length));return m;}
function rpHueMap(cat){const m={};let i=0;rpBrands(cat).forEach(b=>{m[b]=b==='코웨이'?RPT_CW:RPT_PAL[i++%RPT_PAL.length];});return m;}
/* 브랜드 · 기간(당월 m / 누적 ytd) · 매체 키 → 천원 */
function rpAmt(cat,b,per,medKeys){
  const rows=rpSpend(cat)[b];if(!rows)return 0;const M=RPT_DOC.m;
  const idx=(medKeys||RPT_MED.map(x=>x.k)).flatMap(k=>RPT_MED.find(x=>x.k===k).i);
  const rs=per==='ytd'?rows:/^mo\d+$/.test(per||'')?[rows[+per.slice(2)-1]||[]]:[rows[M-1]||[]];
  return rs.reduce((s,r)=>s+idx.reduce((t,i)=>t+rN(r[i]),0),0);}

/* ---------- 애니메이션 — 그려 넣은 뒤 한 프레임 쉬고 .go 를 붙이면 CSS 가 펼친다 ---------- */
function rpGo(root){
  if(!root)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('go')));
  root.querySelectorAll('[data-cu]').forEach(el=>{
    const v=+el.dataset.cu,d=+(el.dataset.d||0),fmt=el.dataset.f||'n',t0=performance.now(),DUR=1100;
    const out=x=>fmt==='eok'?wrEok(x):fmt==='p'?x.toFixed(1)+'%':wrF(x,+(el.dataset.dp||0));
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=out(v);return;}
    const fr=now=>{const x=Math.min(1,Math.max(0,(now-t0-d)/DUR)),e=1-Math.pow(1-x,3);el.textContent=out(v*e);if(x<1)requestAnimationFrame(fr);};
    requestAnimationFrame(fr);});}
function rpTipWire(root,fn){
  root.addEventListener('mousemove',e=>{const g=e.target.closest('[data-tip]');if(!g){hideTip();return;}const h=fn(g.dataset.tip,g);if(h)showTip(e.clientX,e.clientY,h);else hideTip();});
  root.addEventListener('mouseleave',hideTip);}
const rpTr=(l,v)=>`<div class="r"><span class="l">${l}</span><b>${v}</b></div>`;

/* ================================================================
   본문
   ================================================================ */
function renderReport(){
  const host=$('rptBody');if(!host)return;
  const ys=rptYears();
  /* 보고 있는 리포트가 바뀌면 리포트 안 선택(표 달 · 브랜드 등)을 처음으로 (v157 — 9월에 4월 표가 남던 문제) */
  if(RPT._doc!==RPT_DOC){RPT._doc=RPT_DOC;RPT.tblM=0;RPT.brand='코웨이';RPT.dgB='';RPT.sosMo=0;}
  if(RPT.oldY&&ys.includes(RPT.oldY))RPT.y=RPT.oldY;else{RPT.oldY=0;if(RPT_DOC&&RPT_DOC.y)RPT.y=RPT_DOC.y;}
  if(!ys.includes(RPT.y))RPT.y=ys[ys.length-1];
  /* 달 고르기 줄은 올해 이전 연도를 볼 때만 — 올해 달은 메뉴에서 고른다 */
  const nav=document.querySelector('#tab-report .rpt-nav');if(nav)nav.classList.toggle('hidden',!RPT.oldY);
  try{rptMenuPaint();}catch(e){}
  const t=String(CAMPAIGN.today||iso(new Date())).slice(0,10);
  const curM=RPT_DOC&&RPT_DOC.m?RPT_DOC.m:(+t.slice(0,4)===RPT.y?+t.slice(5,7):1);
  RPT.m=curM;
  const yb=$('rptYears');
  if(yb)yb.innerHTML=ys.map(y=>`<button type="button" class="rpt-y${y===RPT.y?' on':''}" data-rpty="${y}">${L(`${y}년`,String(y))}</button>`).join('');
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const camps=(RPT_DOC&&RPT_DOC.camps)||{};
  const mb=$('rptMonths');
  if(mb)mb.innerHTML=[...Array(12)].map((_,i)=>{const m=i+1,ym=`${RPT.y}-${String(m).padStart(2,'0')}`,c=camps[ym],has=c&&c.r;
    const can=!!(c&&c.id);
    return `<button type="button" class="rpt-m${m===RPT.m?' on':''}${has?' has':''}${!can&&m!==RPT.m?' fut':''}" data-rptm="${ym}"${!can&&m!==RPT.m?' disabled':''}
      title="${has?L('리포트 있음','Report available'):L('리포트 없음','No report')}">${L(`${m}월`,MON[i])}${has?'<i></i>':''}</button>`;}).join('');
  const nt=$('rptNote');if(nt)nt.textContent=L(`${RPT.y}년 ${RPT.m}월 · 단위 천원`,`${MON[RPT.m-1]} ${RPT.y} · KRW thousand`);
  document.querySelectorAll('#tab-report [data-rptm]').forEach(b=>b.onclick=()=>rptGo(b.dataset.rptm));
  if(!rptOn()){
    host.innerHTML=`<div class="rpt-empty"><div class="ttl">${L(`${RPT.y}년 ${RPT.m}월 리포트가 아직 없습니다`,`No report for ${MON[RPT.m-1]} ${RPT.y} yet`)}</div>
      <div class="txt">${Object.values(camps).some(c=>c.r)?L('위의 달 가운데 점이 찍힌 달을 누르면 그 달 리포트로 옮겨 갑니다.','Pick a month with a dot above to open its report.')
        :L('먼슬리 리포트 데이터가 들어오면 이 자리에 표와 그래프가 채워집니다.','Tables and charts appear here once monthly report data is loaded.')}</div></div>`;
    return;}
  if(!RPT_DOC.cats.some(c=>c.k===RPT.cat))RPT.cat=(RPT_DOC.cats.find(c=>c.k==='정수기 일반')||RPT_DOC.cats[0]).k;
  host.innerHTML=`<div id="rpOwn" class="rpblk"></div>
    <div class="rpsticky" id="rpCatBar"></div>
    <div id="rpCatBody" class="rpcatpanel"></div>
    <div id="rpArch" class="rpblk"></div>
    <div class="rpsrc">${esc(RPT_DOC.src||'')}</div>`;
  rpOwn();rpCatBar();rpCatBody();rpArch();
  try{const tb=document.querySelector('.topbar');if(tb)host.style.setProperty('--rptop',(tb.getBoundingClientRect().height)+'px');}catch(e){}}

/* ================================================================
   ① 코웨이 TV 집행 요약 — 숫자 카드 + 3D 품목 막대 + 1~m월 추이
   ================================================================ */
let RP_OWN_MET='bud';
function rpOwn(){
  const h=$('rpOwn');if(!h)return;
  const own=RPT_DOC.own||[],M=RPT_DOC.m,cur=own.find(o=>o.m===M);
  if(!cur){h.innerHTML='';return;}
  const [bud,grp,eq,r1,r3]=cur.t,n=cur.it.filter(x=>rN(x[1])>0).length;
  const ytd=own.reduce((s,o)=>s+rN(o.t[0]),0),ytdEq=own.reduce((s,o)=>s+rN(o.t[2]),0);
  const kpi=(l,v,f,dp,sub,i)=>`<div class="rpk" style="--d:${i*70}ms"><div class="l">${l}</div><div class="v"><b data-cu="${v}" data-f="${f}" data-dp="${dp||0}" data-d="${i*70}">0</b></div>${sub?`<div class="s">${sub}</div>`:''}</div>`;
  const mets=[{k:'bud',l:L('광고비','Spend')},{k:'eq',l:'eq.GRP'},{k:'r3',l:'R3+'}];
  h.innerHTML=`<div class="sec">${L('코웨이 TV 집행 요약','Coway TV summary')} <span class="note">${L(`${M}월 · 먼슬리 리포트 기준`,`M${M} · monthly report`)}</span></div>
    <div class="rpkpis">
      ${kpi(L('TV 광고비','TV spend'),bud,'eok',0,L(`연 누적 ${wrEok(ytd)}`,`YTD ${wrEok(ytd)}`),0)}
      ${kpi('eq.GRP',eq,'n',0,L(`연 누적 ${wrF(ytdEq)}`,`YTD ${wrF(ytdEq)}`),1)}
      ${kpi('R1+',r1,'p',0,'',2)}${kpi('R3+',r3,'p',0,'',3)}
      ${kpi(L('집행 품목','Items'),n,'n',0,L(`GRP ${wrF(grp)}`,`GRP ${wrF(grp)}`),4)}</div>
    <div class="rpgrid2">
      ${rpCard(L(`${M}월 캠페인 품목별 집행`,`M${M} campaign by item`),'',`<div id="rpIso" class="rpiso"></div>`,`<div class="rplg rpisolg"><span><i style="background:#5f7a9c"></i>${L('광고비','Spend')}</span><span><i class="ln"></i>R3+</span><span><i class="ar"></i>eq.GRP</span></div>`)}
      ${rpCard(L('월별 TV 광고비','Monthly TV spend'),L('막대를 누르면 그 달 품목별 내역','click a bar for the month by item'),`<div id="rpOwnTr"></div>`)}</div>`;
  rpIso();rpOwnTrend();rpGo(h.querySelector('.rpkpis'));}

/* 3D 막대(아이소메트릭 프리즘) — 앞면 · 오른면 · 윗면. 아래에서 솟아오른다 */
function rpPrism(x,base,w,hgt,col,dx,dy){
  const f=n=>n.toFixed(1),y=base-hgt;
  return `<path d="M${f(x)},${f(base)} h${f(w)} v${f(-hgt)} h${f(-w)} Z" fill="${col}"/>
    <path d="M${f(x+w)},${f(base)} l${f(dx)},${f(-dy)} v${f(-hgt)} l${f(-dx)},${f(dy)} Z" fill="${wrShade(col.startsWith('#')?col:'#888888',.72)}"/>
    <path d="M${f(x)},${f(y)} l${f(dx)},${f(-dy)} h${f(w)} l${f(-dx)},${f(dy)} Z" fill="${wrShade(col.startsWith('#')?col:'#888888',1.22)}"/>`;}
/* 긴 품목 이름은 두 줄로 — 끝말(정수기 · 매트리스 …) 앞에서 끊는다 */
function rpWrap(n){n=String(n||'');if(n.length<=5)return [n];
  const m=n.match(/^(.+?)(얼음정수기|정수기|매트리스|청정기|체어2|처리기|\/.+)$/);if(m&&m[1].length>=2)return [m[1],m[2]];
  const h=Math.ceil(n.length/2);return [n.slice(0,h),n.slice(h)];}
function rpIso(){
  const box=$('rpIso');if(!box)return;const M=RPT_DOC.m,cur=(RPT_DOC.own||[]).find(o=>o.m===M);if(!cur)return;
  const it=cur.it.filter(x=>rN(x[1])>0||rN(x[2])>0).sort((a,b)=>rN(b[1])-rN(a[1]));
  if(!it.length){box.innerHTML=`<div class="hint">${L('집행 품목 없음','No items')}</div>`;return;}
  const W=Math.max(520,box.clientWidth||620),H=360,n=it.length,pad=26,dx=0,dy=0,gap=(W-pad)/(n+.2),bw=Math.min(54,gap*.5),base=H-56,top=100;
  const mxB=Math.max(...it.map(x=>rN(x[1])))||1,mxE=Math.max(...it.map(x=>rN(x[2])))||1,mxR=Math.max(...it.map(x=>rN(x[3])))||1;
  /* v151 — 품목 고유 색은 쓰지 않는다: 회청 한 가지, 순위대로 명도만 */
  const PAL=['#4f6b8f','#5f7a9c','#7089a8','#8198b4','#93a7c0','#a5b6cb','#b7c5d6','#c6d1de'];
  const cxs=it.map((_,i)=>pad+gap*(i+.2)+bw/2+dx/2);
  /* ① 바탕 — eq.GRP 연한 회색 영역(부드러운 곡선 · 선 없음 · 아래로 옅어지는 그라데이션) */
  /* 양 끝은 바닥에서 부드럽게 솟아 — 왼쪽 위가 잘려 보이지 않게, 높이는 막대 영역의 80% 안 */
  const ey=v=>base-(base-82)*.92*v/mxE,ePts=it.map((x,i)=>[cxs[i],ey(rN(x[2]))]);
  const ePath=rpSmooth([[pad-40,base-1],...ePts,[W+30,base-1]],false,.24);
  /* ③ R3+ 꺾은선 — 막대 위쪽 띠에 */
  const ry=v=>22+(1-v/mxR)*54,rPts=it.map((x,i)=>[cxs[i],ry(rN(x[3]))]);
  let g='';
  it.forEach((x,i)=>{const v=rN(x[1]),hh=Math.max(2,(base-top)*v/mxB),cx=pad+gap*(i+.2),col=PAL[Math.min(i,7)];
    /* v155 — 2D 막대(위쪽만 둥글게) — 뒤 eq.GRP 영역과 같은 평면 */
    const rr=Math.min(5,hh/2),f=v2=>v2.toFixed(1);
    g+=`<g class="ib" style="--d:${i*80}ms" data-tip="${i}"><path d="M${f(cx)},${f(base)} V${f(base-hh+rr)} Q${f(cx)},${f(base-hh)} ${f(cx+rr)},${f(base-hh)} H${f(cx+bw-rr)} Q${f(cx+bw)},${f(base-hh)} ${f(cx+bw)},${f(base-hh+rr)} V${f(base)} Z" fill="${col}"/></g>
      <text class="iv" style="--d:${i*80+380}ms" x="${(cx+bw/2+dx/2).toFixed(1)}" y="${(base-hh-8).toFixed(1)}" text-anchor="middle">${wrEok(v)}</text>
      <text class="in" x="${(cx+bw/2).toFixed(1)}" y="${base+20}" text-anchor="middle">${rpWrap(x[0]).map((t,j)=>`<tspan x="${(cx+bw/2).toFixed(1)}" dy="${j?14:0}">${esc(t)}</tspan>`).join('')}</text>`;});
  /* R3+ — 굵은 부드러운 곡선 · 값이 표식 안에 들어가는 큰 표식 */
  const line=`<path d="${rpSmooth(rPts,true,.22)}" class="r3" pathLength="1"/>`
    +rPts.map((p,i)=>`<g class="r3p" style="--d:${900+i*70}ms" data-tip="${i}"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="18.5"/>
      <text x="${p[0].toFixed(1)}" y="${(p[1]+4).toFixed(1)}" text-anchor="middle">${wrF(it[i][3],rN(it[i][3])%1?1:0)}%</text></g>`).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpisosvg">
    <defs><linearGradient id="rpeqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ad" stop-opacity=".36"/><stop offset="1" stop-color="#9aa3ad" stop-opacity="0"/></linearGradient></defs>
    <path d="${ePath} L${W+30},${base} L${pad-40},${base} Z" fill="url(#rpeqg)" class="eqa"/>
    <line x1="${pad-8}" x2="${W-8}" y1="${base}" y2="${base}" class="bl"/>${g}${line}</svg>`;
  rpGo(box);
  rpTipWire(box,i=>{const x=it[+i];if(!x)return '';return `<div class="t">${esc(x[0])}</div>${rpTr(L('광고비','Spend'),wrEok(x[1]))}${x.length>5?rpTr(L('· 지상파','· Terr.'),wrEok(x[4]))+rpTr(L('· 케이블 · 종편','· Cable'),wrEok(x[5]))+rpTr('GRP',wrF(x[6])):''}${rpTr('eq.GRP',wrF(x[2],1))}${x.length>7?rpTr('R1+',wrF(x[7],1)+'%'):''}${rpTr('R3+',wrF(x[3],1)+'%')}`;});}
function rpOwnTrend(){
  const box=$('rpOwnTr');if(!box)return;const own=RPT_DOC.own||[],M=RPT_DOC.m;
  const bars=[...Array(12)].map((_,i)=>{const o=own.find(z=>z.m===i+1);const it=o?o.it.filter(x=>rN(x[1])>0).sort((a,b)=>rN(b[1])-rN(a[1])):[];
    return {k:i+1,label:L(`${i+1}월`,`M${i+1}`),lab:L(`${i+1}월`,`M${i+1}`),v:o?rN(o.t[0]):0,col:i+1===M?'#4f6b8f':'#9fb2c9',
      slices:it.map((x,j)=>({n:x[0],v:rN(x[1]),col:rpSteel(j,it.length),sub:x.length>5&&(rN(x[4])||rN(x[5]))?`${L('지상파','Terr.')} ${wrEok(x[4])} · ${L('케이블','Cable')} ${wrEok(x[5])}`:''}))};});
  rpBarDonut(box,bars,{H:340,cur:M-1});}

/* ================================================================
   업종 고르기 — 업종 타일(코웨이 점유율 고리)이 곧 선택 칩
   ================================================================ */
function rpCatBar(){
  const h=$('rpCatBar');if(!h)return;
  /* v157 — 업종 이름만 · 한 줄을 꽉 채우는 고르기 줄. 고른 업종 아래로 내려가는 꼭지가 아래 모든 영역을 가리킨다 */
  h.innerHTML=`<div class="rpcatw"><div class="rpcatl"><b>${L('업종','Category')}</b><em>${L('아래 모든 영역에 적용','applies to everything below')}</em></div>
    <div class="rpcats" role="tablist">${RPT_DOC.cats.map((c,i)=>`<button type="button" role="tab" aria-selected="${c.k===RPT.cat}" class="rpcat${c.k===RPT.cat?' on':''}" data-rpcat="${esc(c.k)}" style="--d:${i*30}ms">${esc(c.lab)}</button>`).join('')}</div></div>`;
  rpGo(h);
  h.querySelectorAll('[data-rpcat]').forEach(b=>b.onclick=()=>{RPT.cat=b.dataset.rpcat;RPT.brand='코웨이';
    h.querySelectorAll('[data-rpcat]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b);});rpCatBody();
    const body=$('rpCatBody');if(body){body.classList.remove('flash');void body.offsetWidth;body.classList.add('flash');}});}

function rpCatBody(){
  const h=$('rpCatBody');if(!h)return;const c=rpCat();
  const hasTv=!!((RPT_DOC.tvr||{})[c.k]||[]).length,hasDet=hasTv&&!!c.ar;
  h.innerHTML=`<div class="rpblk" id="rpMix"></div><div class="rpblk" id="rpSos"></div>
    ${hasTv?`<div class="rpblk" id="rpTv"></div>`:''}${hasDet?`<div class="rpblk" id="rpDet"></div>`:''}
    <div class="rpblk" id="rpEtc"></div><div class="rpblk" id="rpDg"></div>`;
  rpMix();rpSos();if(hasTv)rpTv();if(hasDet)rpDet();rpEtc();rpDg();}

/* ================================================================
   ② 경쟁사 광고비 — 월별 누적 막대 + 3D 도넛(SOS)
   ================================================================ */
const RP_MEDSET={atl:RP_ATL,all:null,tv:['t','c'],dg:['d'],etc:['r','n','g']};
function rpSos(){
  const h=$('rpSos');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c),bs=rpBrands(c),mk=RP_MEDSET[RPT.sosMed];
  if(RPT.sos==='mon'&&!(RPT.sosMo>=1&&RPT.sosMo<=M))RPT.sos='ytd';
  const per=RPT.sos==='mon'?'mo'+RPT.sosMo:RPT.sos;
  const segs=bs.map(b=>({n:b,v:rpAmt(c,b,per,mk),col:col[b]})).filter(s=>s.v>0).sort((a,b)=>b.v-a.v);
  const tot=segs.reduce((s,x)=>s+x.v,0);
  const meds=[{k:'atl',l:L('4대 매체','ATL')},{k:'tv',l:'TV'},{k:'etc',l:L('라디오 · 인쇄','Radio · Print')},{k:'dg',l:L('디지털','Digital')},{k:'all',l:L('4대 + 디지털','ATL + digital')}];
  h.innerHTML=`<div class="sec">${L('경쟁사 광고비','Competitor spend')} <span class="note">${esc(c.lab)}${c.sp==='정수기'&&c.k!=='정수기'?L(' · 광고비는 정수기(일반+얼음) 합산',' · spend = water purifier total'):''}</span></div>
    <div class="rpgrid2">
      ${rpCard(L('월별 광고비','Monthly spend'),L(`1~${M}월`,`M1–M${M}`),`<div id="rpSosCols"></div>`,rpSeg(meds,RPT.sosMed,'data-rpsm'))}
      ${rpCard(L('광고비 점유율','Share of spend'),RPT.sos==='ytd'?L(`1~${M}월 누적`,'YTD'):RPT.sos==='mon'?L(`${RPT.sosMo}월`,`M${RPT.sosMo}`):L(`${M}월`,`M${M}`),
        tot?`<div id="rpSosDn" class="rp3dbox rpmid"></div>`:`<div class="hint rpnil">${L('이 기간 집행 없음','No spend in this period')}</div>`,
        rpSeg([{k:'m',l:L('당월','Month')},{k:'ytd',l:L('누적','YTD')}],RPT.sos,'data-rpsp')
        /* v157 — 궁금한 사람만: 다른 달 하나를 골라 보는 작은 메뉴 */
        +`<label class="rpmsel${RPT.sos==='mon'?' on':''}"><select data-rpsmo aria-label="${L('월별 보기','By month')}"><option value="">${L('월별','Month…')}</option>${[...Array(M)].map((_,i)=>`<option value="${i+1}"${RPT.sos==='mon'&&RPT.sosMo===i+1?' selected':''}>${L(`${i+1}월`,`M${i+1}`)}</option>`).join('')}</select></label>`,'rpfill')}</div>`;
  rpSosCols(c,col,bs,mk);
  if(tot)rp3dDonut($('rpSosDn'),segs,'코웨이');
  h.querySelectorAll('[data-rpsm]').forEach(b=>b.onclick=()=>{RPT.sosMed=b.dataset.rpsm;rpSos();});
  h.querySelectorAll('[data-rpsp]').forEach(b=>b.onclick=()=>{RPT.sos=b.dataset.rpsp;rpSos();});
  h.querySelectorAll('[data-rpsmo]').forEach(sel=>sel.onchange=()=>{const v=+sel.value;if(v){RPT.sos='mon';RPT.sosMo=v;}else RPT.sos='m';rpSos();});
  rpGo(h);}
function rpSosCols(c,col,bs,mk){
  const box=$('rpSosCols');if(!box)return;const M=RPT_DOC.m,sp=rpSpend(c);
  const idx=(mk||RPT_MED.map(x=>x.k)).flatMap(k=>RPT_MED.find(x=>x.k===k).i);
  const val=(b,m)=>{const r=(sp[b]||[])[m-1]||[];return idx.reduce((s,i)=>s+rN(r[i]),0);};
  const tots=[...Array(M)].map((_,i)=>bs.reduce((s,b)=>s+val(b,i+1),0));
  /* v157 — 같은 업종 안에서는 눈금 고정: 매체를 바꿔도(4대 · TV · 디지털 …) 막대 높이로 크기를 비교할 수 있게 4대+디지털 합계 최대값 기준 */
  const allIdx=RPT_MED.flatMap(x=>x.i),allTot=[...Array(M)].map((_,i)=>bs.reduce((s,b)=>{const r=(sp[b]||[])[i]||[];return s+allIdx.reduce((t,k)=>t+rN(r[k]),0);},0));
  const mx=Math.max(...allTot,...tots)||1;
  const W=Math.max(520,box.clientWidth||700),H=310,base=H-40,top=28,gw=(W-20)/Math.max(M,6),bw=Math.min(46,gw*.58);let g='';
  for(let m=1;m<=M;m++){const x=10+gw*(m-1)+(gw-bw)/2;let y=base;
    g+=`<g class="cb${m===M?' cur':''}" style="--d:${m*60}ms">`;
    bs.forEach(b=>{const v=val(b,m);if(v<=0)return;const hh=(base-top)*v/mx;y-=hh;
      g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(.5,hh-1.5).toFixed(1)}" fill="${col[b]}" data-tip="${m}|${esc(b)}" data-b="${esc(b)}"/>`;});
    g+=`</g>${tots[m-1]>0?`<text class="cv${m===M?' cur':''}" style="--d:${m*60+420}ms" x="${(x+bw/2).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle">${wrEok(tots[m-1])}</text>`:''}
      <text class="mx${m===M?' cur':''}" x="${(x+bw/2).toFixed(1)}" y="${base+18}" text-anchor="middle">${m}${L('월','')}</text>`;}
  const used=bs.filter(b=>[...Array(M)].some((_,i)=>val(b,i+1)>0));
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpcols"><line x1="6" x2="${W-6}" y1="${base}" y2="${base}" class="bl"/>${g}</svg>
    <div class="rplg rplgb" role="group" aria-label="${L('광고주 강조','Highlight advertiser')}">${used.map(b=>`<button type="button" class="${b==='코웨이'?'mine':''}${RPT.sosHi===b?' on':''}" data-rphb="${esc(b)}" aria-pressed="${RPT.sosHi===b}"><i style="background:${col[b]}"></i>${esc(b)}</button>`).join('')}<span class="hint">${L('눌러서 강조','click to highlight')}</span></div>`;
  /* 범례를 누르면 그 광고주만 또렷하게(다른 광고주는 옅게) · 다시 누르면 해제 */
  const paintHi=()=>{const svg=box.querySelector('svg');svg.classList.toggle('hl',!!RPT.sosHi);svg.querySelectorAll('rect[data-b]').forEach(r=>r.classList.toggle('hi',r.dataset.b===RPT.sosHi));
    box.querySelectorAll('[data-rphb]').forEach(x=>{const on=x.dataset.rphb===RPT.sosHi;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);});
    box.querySelector('.rplgb').classList.toggle('any',!!RPT.sosHi);};
  if(!used.includes(RPT.sosHi))RPT.sosHi='';
  box.querySelectorAll('[data-rphb]').forEach(x=>x.onclick=()=>{RPT.sosHi=RPT.sosHi===x.dataset.rphb?'':x.dataset.rphb;paintHi();});paintHi();
  rpTipWire(box,k=>{const [m,b]=k.split('|');const r=(sp[b]||[])[+m-1]||[],v=val(b,+m),t=tots[+m-1];
    return `<div class="t">${m}${L('월','')} · ${esc(b)}</div>${rpTr(L('광고비','Spend'),wrEok(v))}${rpTr(L('점유율','Share'),rpP(v/t*100,1))}
      <div class="tsec">${L('매체별','By media')}</div>${RPT_MED.map(md=>{const a=md.i.reduce((s,i)=>s+rN(r[i]),0);return a>0?rpTr(md.l,wrEok(a)):'';}).join('')}`;});}

/* 3D 도넛 — 위에서 비스듬히 본 고리. 0 → 360° 로 감기며 펼쳐지고, 범례 · 조각에 마우스를 올리면 그 조각만 */
function rpDnSvg(S0,T,W){
  const tot=S0.reduce((s,x)=>s+x.v,0);if(!tot)return '';
  const R=Math.min(W*.44,128),K=.56,r=R*.5,DEP=24,cx=W/2,cy=R*K+16,TAU=Math.PI*2,H=Math.ceil(cy+R*K+DEP+18);
  const P=(a,rr,dz)=>[cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*K+(dz||0)];
  let a=-Math.PI/2-.0001;const S=S0.map((s,i)=>{const sp=s.v/tot*TAU*T,o={...s,i,a0:a,a1:a+sp};a+=sp;return o;});
  const arc=(rr,b0,b1,dz,rev)=>{const st=rev?b1:b0,en=rev?b0:b1,mid=(b0+b1)/2,[x0,y0]=P(st,rr,dz),[xm,ym]=P(mid,rr,dz),[x1,y1]=P(en,rr,dz),sw=rev?0:1,ry=(rr*K).toFixed(1);
    return [`${x0.toFixed(1)},${y0.toFixed(1)}`,`A${rr},${ry} 0 0 ${sw} ${xm.toFixed(1)},${ym.toFixed(1)} A${rr},${ry} 0 0 ${sw} ${x1.toFixed(1)},${y1.toFixed(1)}`];};
  const clips=(b0,b1,lo,hi)=>{const o=[];for(const k of [-1,0,1,2]){const x=Math.max(b0,lo+k*TAU),y=Math.min(b1,hi+k*TAU);if(y>x+1e-6)o.push([x,y]);}return o;};
  const wall=(rr,c)=>{const [m,aa]=arc(rr,c[0],c[1],0),[mb,ab]=arc(rr,c[0],c[1],DEP,true);return `M${m} ${aa} L${mb} ${ab} Z`;};
  let back='',walls='',tops='';
  S.forEach(s=>{if(s.a1-s.a0<1e-4)return;const sh=s.col.startsWith('#')?s.col:'#888888';
    clips(s.a0,s.a1,Math.PI,TAU).forEach(c=>back+=`<path class="sl" data-k="${s.i}" d="${wall(r,c)}" fill="${wrShade(sh,.55)}"/>`);
    clips(s.a0,s.a1,0,Math.PI).forEach(c=>walls+=`<path class="sl" data-k="${s.i}" d="${wall(R,c)}" fill="${wrShade(sh,.78)}"/>`);
    const [m,aa]=arc(R,s.a0,s.a1,0),[mi,ai]=arc(r,s.a0,s.a1,0,true);
    tops+=`<path class="sl" data-k="${s.i}" d="M${m} ${aa} L${mi} ${ai} Z" fill="${s.col}" stroke="var(--surface)" stroke-width="1.2" stroke-linejoin="round"/>`;});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="rpdnsvg">
    <ellipse cx="${cx}" cy="${cy+DEP+6}" rx="${R*1.12}" ry="${R*K*.7}" fill="rgba(12,26,42,.08)"/>${back}${walls}${tops}
    <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R*K}" fill="url(#rphl)" pointer-events="none"/>
    <defs><radialGradient id="rphl" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`;}
function rpDnMount(box,segs,lg){
  if(!box)return;const W=Math.max(220,Math.min(300,box.clientWidth||280)),id=(box._a=(box._a||0)+1),t0=performance.now(),DUR=1100,ease=x=>1-Math.pow(1-x,3);
  const tot=segs.reduce((s,x)=>s+x.v,0);
  const hot=k=>{const svg=box.querySelector('svg');if(svg){svg.classList.toggle('hot',k!=null);svg.querySelectorAll('.sl').forEach(e=>e.classList.toggle('on',e.dataset.k===String(k)));}
    if(lg)lg.querySelectorAll('.it').forEach(e=>e.classList.toggle('on',e.dataset.k===String(k)));if(lg)lg.classList.toggle('hot',k!=null);};
  const wire=()=>{box.onmousemove=e=>{const g=e.target.closest('.sl');if(!g){hot(null);hideTip();return;}const s=segs[+g.dataset.k];hot(g.dataset.k);
      showTip(e.clientX,e.clientY,`<div class="t">${esc(s.n)}</div>${rpTr(L('광고비','Spend'),wrEok(s.v))}${rpTr(L('비중','Share'),rpP(s.v/tot*100,1))}`);};
    box.onmouseleave=()=>{hot(null);hideTip();};
    if(lg)lg.querySelectorAll('.it').forEach(e=>{e.onmouseenter=()=>hot(e.dataset.k);e.onmouseleave=()=>hot(null);});};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){box.innerHTML=rpDnSvg(segs,1,W);wire();return;}
  const fr=now=>{if(box._a!==id)return;const x=Math.min(1,(now-t0)/DUR);box.innerHTML=rpDnSvg(segs,x<1?ease(x):1,W);if(x<1)requestAnimationFrame(fr);else wire();};
  requestAnimationFrame(fr);}

/* ================================================================
   ③ 미디어 믹스 — 브랜드마다 100% 가로 막대(지상파 · 케이블 · 라디오 · 신문 · 잡지 · 디지털)
   ================================================================ */
function rpMix(){
  const h=$('rpMix');if(!h)return;const c=rpCat(),M=RPT_DOC.m;
  const MM=RPT_MED.filter(md=>RP_ATL.includes(md.k));
  const bs=rpBrands(c).map(b=>({b,v:MM.map(md=>rpAmt(c,b,RPT.mix,[md.k]))})).map(x=>({...x,t:rpSum(x.v)})).filter(x=>x.t>0)
    .sort((a,b)=>(b.b==='코웨이')-(a.b==='코웨이')||b.t-a.t);
  h.innerHTML=`<div class="sec">${L('브랜드별 광고비','Spend by brand')} <span class="note">${esc(c.lab)} · ${L('4대 매체 · 디지털은 아래 디지털 광고비','ATL · digital below')}</span></div>
    ${rpCard(L('브랜드별 광고비 · 매체 비중','Spend · media share by brand'),(RPT.mix==='ytd'?L(`1~${M}월 누적`,'YTD'):L(`${M}월`,`M${M}`))+L(' · 막대를 누르면 매체별 비중',' · click a bar for media share'),
      bs.length?`<div id="rpMixBd"></div>`:`<div class="hint rpnil">${L('이 기간 집행 없음','No spend in this period')}</div>`,
      rpSeg([{k:'m',l:L('당월','Month')},{k:'ytd',l:L('누적','YTD')}],RPT.mix,'data-rpmx'))}`;
  h.querySelectorAll('[data-rpmx]').forEach(b=>b.onclick=()=>{RPT.mix=b.dataset.rpmx;rpMix();});
  if(!bs.length)return;
  const others=bs.filter(x=>x.b!=='코웨이').length;let oi=0;
  rpBarDonut($('rpMixBd'),bs.map(x=>({k:x.b,label:x.b,lab:x.b,v:x.t,col:x.b==='코웨이'?RPT_CW:rpMono(oi++,others),
      slices:x.v.map((v,j)=>({n:MM[j].l,v,col:MM[j].c})).filter(z=>z.v>0)})),
    {H:370,cur:bs.findIndex(x=>x.b==='코웨이'),legend:`<div class="rplg">${MM.map(md=>`<span><i style="background:${md.c}"></i>${md.l}</span>`).join('')}</div>`});}

/* ================================================================
   ④ TV 집행 결과 — 버블(eq.GRP × R3+ · 크기 = 광고비) · TV set 성과 표 · 월별 eq.GRP
   ================================================================ */
function rpTvRows(c,m){return ((RPT_DOC.tvr||{})[c.k]||[]).filter(r=>r[0]===m);}
function rpTv(){
  const h=$('rpTv');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c);
  const bub=(RPT_DOC.bub||{})[c.k];if(RPT.bub==='ytd'&&!bub)RPT.bub='m';
  if(!(RPT.tblM>=1&&RPT.tblM<=M))RPT.tblM=M;
  const months=[...new Set(((RPT_DOC.tvr||{})[c.k]||[]).map(r=>r[0]))].sort((a,b)=>a-b);
  if(!months.includes(RPT.tblM))RPT.tblM=months.length?months[months.length-1]:M;
  const segB=bub?rpSeg([{k:'m',l:L(`${RPT.tblM}월`,`M${RPT.tblM}`)},{k:'ytd',l:L('연 누적','YTD')}],RPT.bub,'data-rpbb'):'';
  const mChips=rpChips(months.map(m=>({k:String(m),l:L(`${m}월`,`M${m}`)})),String(RPT.tblM),'data-rptm2','sm');
  h.innerHTML=`<div class="sec">${L('TV 집행 결과','TV results')} <span class="note">${esc(c.lab)} · F30-45 · ${L('수도권','Seoul metro')}</span></div>
    <div class="rpmonths">${mChips}</div>
    ${rpCard(L('노출량 × 도달','Exposure × reach'),L('eq.GRP × R3+ · 원 크기 = 광고비 · 브랜드를 누르면 월별 실적','eq.GRP × R3+ · size = spend · click a brand for monthly detail'),
      `<div class="rpbubw"><div id="rpBub"></div><div id="rpBubSide" class="rpbubside"></div></div>`,segB)}
    ${rpCard(L('TV set 성과','TV set performance'),L(`${RPT.tblM}월 · 실집행은 코웨이 실제 · 경쟁사 추정`,`M${RPT.tblM} · actual = Coway real, competitors est.`),`<div id="rpTvTbl"></div>`)}`;
  h.querySelectorAll('[data-rpbb]').forEach(b=>b.onclick=()=>{RPT.bub=b.dataset.rpbb;rpTv();});
  h.querySelectorAll('[data-rptm2]').forEach(b=>b.onclick=()=>{RPT.tblM=+b.dataset.rptm2;rpTv();});
  rpBubble(c,col,bub);rpTvTbl(c,col);rpGo(h);}
/* 브랜드 상세 카드 — 월별 TV set 실적(이 리포트까지) */
function rpBrandCard(c,b,col){
  const rows=((RPT_DOC.tvr||{})[c.k]||[]).filter(r=>r[1]===b&&r[2]===2).sort((x,y)=>x[0]-y[0]);
  const bub=((RPT_DOC.bub||{})[c.k]||{})[b];
  if(!rows.length)return `<div class="hint">${L('TV 실적 없음','No TV results')}</div>`;
  const mx=Math.max(...rows.map(r=>rN(r[7])),1);
  return `<div class="bh"><i style="background:${col[b]}"></i><b>${esc(b)}</b>${bub?`<span>${L('연 누적','YTD')} eq ${wrF(bub.eq)} · R3+ ${wrF(bub.r3)}% · ${wrEok(bub.won/1000)}</span>`:''}</div>
    <table class="tbl lite rptbl rpbt eqw"><thead><tr><th>${L('월','Mo')}</th><th>${L('광고비','Spend')}</th><th>eq.GRP</th><th>R1+</th><th>R3+</th><th>A.F</th></tr></thead>
    <tbody>${rows.map(r=>`<tr${r[0]===RPT.tblM?' class="cur"':''}><td class="br">${r[0]}${L('월','')}</td><td>${wrEok(rN(r[4])||rN(r[3]))}</td>
      <td class="eqc"><span class="mb" style="--w:${(rN(r[7])/mx*100).toFixed(1)}%;--c:${col[b]}"></span><b>${wrF(r[7])}</b></td><td>${wrF(r[10],1)}%</td><td>${wrF(r[11],1)}%</td><td>${wrF(r[12],1)}</td></tr>`).join('')}</tbody></table>
    <div class="hint">${L('광고비 = 코웨이 실집행 · 경쟁사 추정 실집행','Spend = Coway actual · competitors estimated')}</div>`;}
function rpBubble(c,col,bub){
  const box=$('rpBub'),side=$('rpBubSide');if(!box)return;
  const pts=RPT.bub==='ytd'&&bub?Object.entries(bub).map(([b,v])=>({b,x:rN(v.eq),y:rN(v.r3),s:rN(v.won)/1000})).filter(p=>p.x>0||p.s>0)
    :rpTvRows(c,RPT.tblM).filter(r=>r[2]===2).map(r=>({b:r[1],x:rN(r[7]),y:rN(r[11]),s:rN(r[4])||rN(r[3]),r})).filter(p=>p.x>0);
  if(!pts.length){box.innerHTML=`<div class="hint rpnil">${L('TV 집행 없음','No TV')}</div>`;if(side)side.innerHTML='';return;}
  const W=Math.max(480,box.clientWidth||720),H=380,L0=46,B=H-34,T=20,R0=W-24;
  const mxX=Math.max(...pts.map(p=>p.x))*1.18||1,mxY=Math.max(10,Math.ceil(Math.max(...pts.map(p=>p.y))*1.25/10)*10),mxS=Math.max(...pts.map(p=>p.s))||1;
  const X=v=>L0+(R0-L0)*v/mxX,Y=v=>B-(B-T)*v/mxY,RR=s=>6+Math.sqrt(s/mxS)*27;   /* v157 — 원을 조금 작게 */
  const nice=m=>{const s2=Math.pow(10,Math.floor(Math.log10(m/4)));const f=m/4/s2;return (f<1.5?1:f<3.5?2:f<7.5?5:10)*s2;};
  const sx=nice(mxX),sy=nice(mxY);let grid='';
  for(let v=0;v<=mxX;v+=sx)grid+=`<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${B}" class="gl"/><text x="${X(v)}" y="${B+16}" text-anchor="middle" class="ax">${wrF(v)}</text>`;
  for(let v=0;v<=mxY;v+=sy)grid+=`<line x1="${L0}" x2="${R0}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L0-6}" y="${Y(v)+4}" text-anchor="end" class="ax">${v}%</text>`;
  const ord=[...pts].sort((a,b)=>b.s-a.s);
  /* v151 — 경쟁사는 회색, 코웨이만 색 · 반투명이라 뒤 눈금이 비친다 */
  /* v157 — 테두리 없음 · 고른 브랜드만 진하게 + 면이 퍼지는 옅은 레이더(코웨이 고정 강조는 없앰) */
  const dots=ord.map((p,i)=>{const cx=X(p.x),cy=Y(p.y),r=RR(p.s),me=p.b==='코웨이',fc=me?RPT_CW:'#7d8792';
    return `<g class="bb${me?' mine':''}" style="--d:${i*90}ms" data-b="${esc(p.b)}">
      <circle cx="${cx}" cy="${cy}" r="${r}" class="pulse" fill="${fc}"/><circle cx="${cx}" cy="${cy}" r="${r}" class="pulse p2" fill="${fc}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" class="core" fill="${fc}"/>
      <text x="${cx}" y="${cy-r-6}" text-anchor="middle" class="bl2">${esc(p.b)}</text></g>`;}).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpbub">${grid}
    <text x="${R0}" y="${B-6}" text-anchor="end" class="axt">eq.GRP →</text><text x="${L0+6}" y="${T+12}" class="axt">↑ R3+</text>${dots}</svg>`;
  /* 오른쪽 — 브랜드 목록(누르면 아래 월별 카드 · 왼쪽 그래프에서 그 브랜드를 강조) */
  const list=[...pts].sort((a,b)=>(b.b==='코웨이')-(a.b==='코웨이')||b.x-a.x);
  let cur=list.some(p=>p.b===RPT.bubSel)?RPT.bubSel:list[0].b;
  const paint=b=>{cur=b;RPT.bubSel=b;if(side){side.querySelectorAll('[data-sb]').forEach(e=>e.classList.toggle('on',e.dataset.sb===b));
    const cd=side.querySelector('.bcard');if(cd)cd.innerHTML=rpBrandCard(c,b,col);rpGo(cd);}
    box.querySelectorAll('.bb').forEach(g=>g.classList.toggle('on',g.dataset.b===b));box.querySelector('svg').classList.add('hot');
    /* 고른 원을 맨 앞으로 */
    const g=box.querySelector(`.bb[data-b="${CSS.escape(b)}"]`);if(g)g.parentNode.appendChild(g);};
  if(side){side.innerHTML=`<div class="bl">${list.map(p=>`<button type="button" class="${p.b==='코웨이'?'mine':''}" data-sb="${esc(p.b)}"><i style="background:${p.b==='코웨이'?RPT_CW:'#9aa3ad'}"></i><b>${esc(p.b)}</b>
      <span>eq ${wrF(p.x)}</span><span>R3+ ${wrF(p.y,1)}%</span><span>${wrEok(p.s)}</span></button>`).join('')}</div><div class="bcard"></div>`;
    side.querySelectorAll('[data-sb]').forEach(e=>e.addEventListener('click',()=>paint(e.dataset.sb)));}
  box.querySelectorAll('.bb').forEach(g=>{g.style.cursor='pointer';g.addEventListener('click',()=>paint(g.dataset.b));});
  paint(cur);}
function rpTvTbl(c,col){
  const box=$('rpTvTbl');if(!box)return;const rows=rpTvRows(c,RPT.tblM);
  const bs=[...new Set(rows.map(r=>r[1]))].sort((a,b)=>(b==='코웨이')-(a==='코웨이')||rN((rows.find(r=>r[1]===b&&r[2]===2)||[])[7])-rN((rows.find(r=>r[1]===a&&r[2]===2)||[])[7]));
  if(!bs.length){box.innerHTML=`<div class="hint rpnil">${L('TV 집행 없음','No TV')}</div>`;return;}
  const mxEq=Math.max(...rows.filter(r=>r[2]===2).map(r=>rN(r[7])))||1;
  const body=bs.map(b=>{const rs=[0,1,2].map(mi=>rows.find(r=>r[1]===b&&r[2]===mi)).filter(Boolean);
    return rs.map((r,j)=>`<tr class="${b==='코웨이'?'mine ':''}${r[2]===2?'tot':''}">
      ${j===0?`<td rowspan="${rs.length}" class="br"><i style="background:${col[b]}"></i>${esc(b)}</td>`:''}
      <td class="md">${RPT_MI[r[2]]}</td><td>${wrF(r[3])}</td><td>${r[4]!=null?wrF(r[4]):'–'}</td><td>${wrF(r[5])}</td><td>${wrF(r[6])}</td>
      <td class="eqc"><span class="mb" style="--w:${(rN(r[7])/mxEq*100).toFixed(1)}%;--c:${col[b]}"></span><b>${wrF(r[7])}</b></td>
      <td>${wrF(r[8])}</td><td>${r[9]!=null?wrF(r[9]):'–'}</td><td>${wrF(r[10],1)}%</td><td>${wrF(r[11],1)}%</td><td>${wrF(r[12],1)}</td></tr>`).join('');}).join('');
  box.innerHTML=wrHs(`<table class="tbl lite rptbl eqw" style="min-width:1080px"><thead><tr><th>${L('브랜드','Brand')}</th><th>${L('구분','Type')}</th><th>${L('모니터링 광고비','Monitored')}</th><th>${L('실집행','Actual')}</th>
    <th>${L('횟수','Spots')}</th><th>GRP</th><th>eq.GRP</th><th>${L('모니터링 CPRP','Mon. CPRP')}</th><th>${L('실집행 CPRP','Act. CPRP')}</th><th>R1+</th><th>R3+</th><th>A.F</th></tr></thead><tbody>${body}</tbody></table>`);
  wrHsWire(box);}

/* ================================================================
   ⑤ TV 세부 운영 — 지상파(채널 · 시급 · 광고유형 · 초수) · 케이블(MPP 3D 도넛 · 표 · CPRP 막대)
   ================================================================ */
function rpArRows(c,b){return (((RPT_DOC.ar||{})[c.ar]||{})[b])||[];}
function rpDetRows(c,b,mi){
  /* 정수기 일반 · 얼음은 Nielsen 원자료가 정수기 하나로 묶여 있어 세부는 두 업종을 합쳐 본다 */
  const ks=RPT_DOC.cats.filter(x=>x.ar===c.ar).map(x=>x.k),o={};
  ks.forEach(k=>((RPT_DOC.det||{})[k]||[]).forEach(r=>{if(r[0]!==b||r[1]!==mi)return;const e=o[r[2]]||(o[r[2]]={n:r[2],mon:0,act:0,hasAct:false});
    e.mon+=rN(r[3]);if(r[4]!=null){e.act+=rN(r[4]);e.hasAct=true;}}));
  return o;}
function rpDet(){
  const h=$('rpDet');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c);
  const all=(RPT_DOC.ar||{})[c.ar]||{},bs=Object.keys(all).filter(b=>all[b].length).sort((a,b)=>(b==='코웨이')-(a==='코웨이')||rpSum(all[b].map(r=>r[6]))-rpSum(all[a].map(r=>r[6])));
  if(!bs.length){h.innerHTML='';return;}
  if(!bs.includes(RPT.brand))RPT.brand=bs[0];
  const merged=RPT_DOC.cats.filter(x=>x.ar===c.ar).length>1;
  h.innerHTML=`<div class="sec">${L('TV 세부 운영','TV operation detail')} <span class="note">${L(`${M}월`,`M${M}`)} · ${esc(merged?c.ar+L(' (일반 + 얼음)',' (all)'):c.lab)}</span></div>
    ${rpChips(bs.map(b=>({k:b,l:b,c:col[b]})),RPT.brand,'data-rpbr')}
    <div id="rpDetT"></div><div id="rpDetC"></div>`;
  h.querySelectorAll('[data-rpbr]').forEach(b=>b.onclick=()=>{RPT.brand=b.dataset.rpbr;rpDet();});
  rpDetTerr(c);rpDetCable(c);rpGo(h);}
function rpGroupBy(rows,key){const o={};rows.forEach(r=>{const k=key(r),e=o[k]||(o[k]={k,inv:0,ins:0,grp:0,eq:0});e.inv+=rN(r[6]);e.ins+=rN(r[7]);e.grp+=rN(r[8]);e.eq+=rN(r[9]);});return o;}
function rpDetTerr(c){
  const box=$('rpDetT');if(!box)return;const rows=rpArRows(c,RPT.brand).filter(r=>r[0]===0);
  if(!rows.length){box.innerHTML=rpCard(L('지상파 세부 운영','Terrestrial detail'),'',`<div class="hint rpnil">${L('지상파 집행 없음','No terrestrial')}</div>`);return;}
  const ordr=(o,pref)=>Object.values(o).sort((a,b)=>{const ia=pref.indexOf(a.k),ib=pref.indexOf(b.k);return (ia<0?99:ia)-(ib<0?99:ib)||b.inv-a.inv;});
  const G=[{l:L('채널별','Channel'),a:ordr(rpGroupBy(rows,r=>r[1]),['KBS2','KBS1','MBC','SBS','EBS'])},
    {l:L('시급별','Time class'),a:ordr(rpGroupBy(rows,r=>r[3]),['SA','A','B','C'])},
    {l:L('광고유형별','Ad type'),a:ordr(rpGroupBy(rows,r=>RPT_TYPE[r[5]]||r[5]),['일반프로','스팟','특집 · 재방'])},
    {l:L('초수별','Length'),a:ordr(rpGroupBy(rows,r=>r[4]+'"'),[])}];
  const T=rpGroupBy(rows,()=>'T').T,det=rpDetRows(c,RPT.brand,0),actT=Object.values(det).reduce((s,e)=>s+(e.hasAct?e.act:0),0),hasAct=Object.values(det).some(e=>e.hasAct);
  const tones=['#24406f','#3d5f99','#6b8cc4','#9db6e0','#c4d4ee','#dbe5f5'];
  const head1=`<th rowspan="2">${L('구분','Metric')}</th><th rowspan="2">${L('합계','Total')}</th>${G.map(g=>`<th colspan="${g.a.length}" class="gh">${g.l}</th>`).join('')}`;
  const head2=G.map(g=>g.a.map(x=>`<th>${esc(x.k)}</th>`).join('')).join('');
  const pc=(v,t)=>rpP(v/t*100);
  /* v157 — 표 안은 글자만. 자사 실집행 금액은 채널별만 나온다(원본도 그렇다) — 나머지 칸은 테두리 색 음영 */
  const row=(l,tot,cell,cls)=>`<tr class="${cls||''}"><td class="md">${l}</td><td class="tv">${tot}</td>${G.map(g=>g.a.map(x=>{const v=cell(x,g);return v==null?'<td class="na"></td>':`<td>${v}</td>`;}).join('')).join('')}</tr>`;
  const ar=x=>x.ins?wrF(x.grp/x.ins,1):'–',cprp=x=>x.eq?wrF(x.inv/x.eq):'–';
  const body=(hasAct?row(L('금액(실집행)','Actual'),wrF(actT),(x,g)=>g===G[0]?(det[x.k]&&det[x.k].hasAct?wrF(det[x.k].act):'–'):null,'act'):'')
    +row(L('모니터링 광고비','Monitored'),wrF(T.inv),x=>pc(x.inv,T.inv),'hl')+row('Eq GRP',wrF(T.eq),x=>pc(x.eq,T.eq))
    +row(L('횟수','Spots'),wrF(T.ins),x=>pc(x.ins,T.ins))+row('A.R',ar(T),x=>ar(x))+row(L('모니터링 CPRP','Mon. CPRP'),cprp(T),x=>cprp(x));
  const nc=2+G.reduce((s2,g)=>s2+g.a.length,0);
  /* 그래프 — 표 아래 바깥에 묶음마다 100% 막대(모니터링 광고비 비중) */
  const bars=`<div class="rpdtbars">${G.map((g,gi)=>`<div class="g"><div class="h">${g.l}</div><div class="rpstk">${g.a.map((x,i)=>`<span style="--w:${(x.inv/T.inv*100).toFixed(2)}%;background:${tones[Math.min(i,5)]};--d:${gi*120+i*50}ms" data-tip="${gi}|${i}"></span>`).join('')}</div>
      <div class="lg">${g.a.map((x,i)=>`<span><i style="background:${tones[Math.min(i,5)]}"></i>${esc(x.k)} <b>${pc(x.inv,T.inv)}</b></span>`).join('')}</div></div>`).join('')}</div>`;
  box.innerHTML=rpCard(L('지상파 세부 운영','Terrestrial detail'),L('비중 % · A.R = GRP ÷ 횟수 · CPRP = 모니터링 광고비 ÷ eq.GRP','share % · A.R = GRP/spots'),
    wrHs(`<table class="tbl lite rptbl rpdt eqw" style="min-width:${130+(nc-1)*78}px"><colgroup><col style="width:130px">${'<col>'.repeat(nc-1)}</colgroup><thead><tr>${head1}</tr><tr>${head2}</tr></thead><tbody>${body}</tbody></table>`)+bars);
  wrHsWire(box);
  rpTipWire(box,k=>{const [gi,i]=k.split('|').map(Number),x=G[gi]&&G[gi].a[i];if(!x)return '';
    return `<div class="t">${G[gi].l} · ${esc(x.k)}</div>${rpTr(L('모니터링 광고비','Monitored'),wrF(x.inv)+' · '+pc(x.inv,T.inv))}${rpTr('eq.GRP',wrF(x.eq,1))}${rpTr(L('횟수','Spots'),wrF(x.ins))}${rpTr('A.R',ar(x))}`;});}
function rpDetCable(c){
  const box=$('rpDetC');if(!box)return;const rows=rpArRows(c,RPT.brand).filter(r=>r[0]===1);
  if(!rows.length){box.innerHTML=rpCard(L('케이블 · 종편 세부 운영','Cable detail'),'',`<div class="hint rpnil">${L('케이블 집행 없음','No cable')}</div>`);return;}
  const g=rpGroupBy(rows,r=>r[2]||r[1]),det=rpDetRows(c,RPT.brand,1);
  const hasAct=Object.values(det).some(e=>e.hasAct);
  const list=Object.values(g).map(x=>({...x,mon:det[x.k]?det[x.k].mon:x.inv,act:det[x.k]&&det[x.k].hasAct?det[x.k].act:null}))
    .sort((a,b)=>(a.k==='기타')-(b.k==='기타')||(hasAct?rN(b.act)-rN(a.act):b.mon-a.mon));
  const share=x=>hasAct?rN(x.act):x.mon,tS=list.reduce((s,x)=>s+share(x),0)||1;
  /* v157 — 지상파 계열 MPP(KBS · MBC · SBS · EBS)는 푸른 유채색, 그 밖 케이블은 무채색 · 두 묶음은 조각을 서로 떼어 놓는다 */
  const isT=k=>/^(KBS|MBC|SBS|EBS)/i.test(String(k).trim());
  const TT=['#2f5d93','#4a78ae','#6e95c5','#97b4d9','#bccfe8'],CT=['#3f4a54','#58636e','#717c87','#8a949e','#a3acb5','#bcc3ca','#d2d7dc'];
  const sl=list.filter(x=>share(x)>0),tl=sl.filter(x=>isT(x.k)),cl=sl.filter(x=>!isT(x.k));
  const segs=[...tl.map((x,i)=>({n:x.k,v:share(x),col:TT[Math.min(i,TT.length-1)],grp:'t'})),...cl.map((x,i)=>({n:x.k,v:share(x),col:x.k==='기타'?'#d7dce0':CT[Math.min(i,CT.length-1)],grp:'c'}))];
  const T={mon:rpSum(list.map(x=>x.mon)),act:rpSum(list.map(x=>x.act)),eq:rpSum(list.map(x=>x.eq))};
  const ncC=4+(hasAct?2:0);
  const tb=`<table class="tbl lite rptbl eqw" style="min-width:${ncC*96}px"><thead><tr><th>MPP</th><th>${L('모니터링 광고비','Monitored')}</th>${hasAct?`<th>${L('실집행 광고비','Actual')}</th>`:''}<th>${L('집행 비중','Share')}</th><th>Eq GRP</th><th>${L('모니터링 CPRP','Mon. CPRP')}</th>${hasAct?`<th>${L('실집행 CPRP','Act. CPRP')}</th>`:''}</tr></thead>
    <tbody>${list.map(x=>`<tr><td class="br">${esc(x.k)}</td><td>${wrF(x.mon)}</td>${hasAct?`<td>${x.act!=null?wrF(x.act):'–'}</td>`:''}<td><span class="rppb" style="--w:${(share(x)/tS*100).toFixed(1)}%"></span>${rpP(share(x)/tS*100)}</td>
      <td>${wrF(x.eq)}</td><td>${x.eq?wrF(x.mon/x.eq):'–'}</td>${hasAct?`<td>${x.eq&&x.act!=null?wrF(x.act/x.eq):'–'}</td>`:''}</tr>`).join('')}
    <tr class="tot"><td>Total</td><td>${wrF(T.mon)}</td>${hasAct?`<td>${wrF(T.act)}</td>`:''}<td>100%</td><td>${wrF(T.eq)}</td><td>${T.eq?wrF(T.mon/T.eq):'–'}</td>${hasAct?`<td>${T.eq?wrF(T.act/T.eq):'–'}</td>`:''}</tr></tbody></table>`;
  /* CPRP 막대 — v157: 모니터링 · 실집행을 겹치지 않고 위아래로 나란히, 값은 막대 끝에 같은 색으로 */
  const cp=list.filter(x=>x.eq>0),mxC=Math.max(...cp.map(x=>Math.max(x.mon/x.eq,x.act!=null?x.act/x.eq:0)))||1;
  const bars=`<div class="rpcp">${cp.map((x,i)=>`<div class="row" style="--d:${i*50}ms"><span class="nm">${esc(x.k)}</span><span class="bars">
      <span class="ln m" data-tip="${i}"><i style="--w:${(x.mon/x.eq/mxC*82).toFixed(1)}%"></i><b>${wrF(x.mon/x.eq)}</b></span>
      ${x.act!=null?`<span class="ln a" data-tip="${i}"><i style="--w:${(x.act/x.eq/mxC*82).toFixed(1)}%"></i><b>${wrF(x.act/x.eq)}</b></span>`:''}</span></div>`).join('')}</div>
    <div class="rplg"><span><i style="background:#9aa6b3"></i>${L('모니터링 CPRP','Mon. CPRP')}</span>${hasAct?`<span><i style="background:${RPT_CW}"></i>${L('실집행 CPRP','Act. CPRP')}</span>`:''}</div>`;
  box.innerHTML=`<div class="rpgrid2">
    ${rpCard(L('케이블 · 종편 MPP 비중','Cable MPP share'),(hasAct?L('실집행 기준','by actual'):L('모니터링 기준','by monitored'))+L(' · 푸른색 = 지상파 계열 MPP',' · blue = terrestrial-affiliated'),`<div id="rpMppDn" class="rp3dbox"></div>`,'','rpfill')}
    ${rpCard(L('케이블 · 종편 세부 운영','Cable detail'),'',wrHs(tb),'','span2')}</div>
    ${rpCard(L('MPP별 CPRP','CPRP by MPP'),'',bars)}`;
  rp3dDonut($('rpMppDn'),segs,'',{grp:true});wrHsWire(box);
  rpTipWire(box.querySelector('.rpcp'),i=>{const x=cp[+i];if(!x)return '';return `<div class="t">${esc(x.k)}</div>${rpTr(L('모니터링 CPRP','Mon. CPRP'),wrF(x.mon/x.eq))}${x.act!=null?rpTr(L('실집행 CPRP','Act. CPRP'),wrF(x.act/x.eq)):''}${rpTr('eq.GRP',wrF(x.eq,1))}`;});}

/* ================================================================
   ⑥ 라디오 · 신문 · 잡지 / ⑦ 디지털 광고비
   ================================================================ */
function rpEtc(){
  const h=$('rpEtc');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c),bs=rpBrands(c);
  const meds=RPT_MED.filter(m=>['r','n','g'].includes(m.k));
  const cards=meds.map(md=>{const L2=bs.map(b=>({b,m:rpAmt(c,b,'m',[md.k]),y:rpAmt(c,b,'ytd',[md.k])})).filter(x=>x.y>0).sort((a,b)=>b.y-a.y);
    const mx=Math.max(...L2.map(x=>x.y),1);
    return `<div class="rpmed"><div class="h">${md.l}<span>${L2.length?wrEok(rpSum(L2.map(x=>x.m)))+L(' · 당월',' · month'):''}</span></div>
      ${L2.length?L2.map((x,i)=>`<div class="row${x.b==='코웨이'?' mine':''}" style="--d:${i*60}ms" data-tip="${md.k}|${esc(x.b)}"><span class="nm">${esc(x.b)}</span>
        <span class="bars"><i class="y" style="--w:${(x.y/mx*100).toFixed(1)}%;background:${col[x.b]}"></i><i class="m" style="--w:${(x.m/mx*100).toFixed(1)}%;background:${col[x.b]}"></i></span>
        <b>${wrEok(x.y)}</b></div>`).join(''):`<div class="nil">${L('집행 없음','None')}</div>`}</div>`;}).join('');
  h.innerHTML=`<div class="sec">${L('라디오 · 신문 · 잡지','Radio · Newspaper · Magazine')} <span class="note">${esc(c.lab)} · ${L(`막대 = 1~${M}월 누적, 진한 부분 = ${M}월`,`bar = YTD, solid = M${M}`)}</span></div>
    <div class="rpmeds">${cards}</div>`;
  rpGo(h);
  rpTipWire(h,k=>{const [mk,b]=k.split('|'),md=RPT_MED.find(x=>x.k===mk);return `<div class="t">${esc(b)} · ${md.l}</div>${rpTr(L(`${M}월`,`M${M}`),wrEok(rpAmt(c,b,'m',[mk])))}${rpTr(L('누적','YTD'),wrEok(rpAmt(c,b,'ytd',[mk])))}`;});}
function rpDg(){
  const h=$('rpDg');if(!h)return;const c=rpCat(),M=RPT_DOC.m,sp=rpSpend(c);
  const bs=rpBrands(c).filter(b=>(sp[b]||[]).some(r=>rN(r[5])>0));
  if(!bs.length){h.innerHTML=`<div class="sec">${L('디지털 광고비','Digital spend')} <span class="note">${esc(c.lab)}</span></div><div class="hint rpnil">${L('디지털 집행 없음','No digital')}</div>`;return;}
  const ser=bs.map(b=>({b,v:[...Array(M)].map((_,i)=>rN(((sp[b]||[])[i]||[])[5]))}));
  let ai=0;const acol={};ser.forEach(x=>acol[x.b]=x.b==='코웨이'?'#3f86d6':RP_AREA[ai++%RP_AREA.length]);
  if(!bs.includes(RPT.dgB))RPT.dgB=bs.includes('코웨이')&&rN(((sp['코웨이']||[])[M-1]||[])[5])>0?'코웨이':[...bs].sort((x,y)=>rN(((sp[y]||[])[M-1]||[])[5])-rN(((sp[x]||[])[M-1]||[])[5]))[0];
  h.innerHTML=`<div class="sec">${L('디지털 광고비','Digital spend')} <span class="note">${esc(c.lab)}</span></div>
    <div class="rpgrid2 w55">${rpCard(L('월별 디지털 광고비','Monthly digital'),L(`1~${M}월 · 브랜드별`,'by brand'),`<div id="rpDgLn"></div>`)}
      ${rpCard(L('디지털 세부','Digital detail'),RPT.dgP==='ytd'?L(`1~${M}월 누적 · 동영상 · PC · 모바일`,'YTD'):L(`${M}월 · 동영상 · PC · 모바일`,`M${M}`),
        `${rpChips(bs.map(b=>({k:b,l:b,c:acol[b]})),RPT.dgB,'data-rpdgb','sm')}<div id="rpDgDn" class="rp3dbox"></div><div id="rpDgNote" class="hint"></div>`,
        rpSeg([{k:'m',l:L('당월','Month')},{k:'ytd',l:L('누적','YTD')}],RPT.dgP||'m','data-rpdgp'))}</div>`;
  /* v151 — 부드러운 곡선 영역 + 아래로 옅어지는 그라데이션 · 범례를 눌러 브랜드 켜고 끄기 */
  rpDgDonut(c,acol);
  /* v157 — x축 두 줄(월 · 아래 연도) · 그래프 높이는 옆 카드 높이에 맞춰 아래 여백이 남지 않게 */
  const lnBox=$('rpDgLn'),ARGS=[ser.map(x=>({b:x.b,v:x.v,col:acol[x.b],mine:x.b==='코웨이'})),[...Array(M)].map((_,i)=>L(`${i+1}월`,`M${i+1}`))];
  rpAreaChart(lnBox,...ARGS,{H:300,years:[...Array(M)].map(()=>RPT_DOC.y),title:L('디지털','Digital')});
  requestAnimationFrame(()=>{const card=lnBox&&lnBox.closest('.rpcard'),svg=lnBox&&lnBox.querySelector('svg');if(!card||!svg)return;
    const slack=Math.floor(card.getBoundingClientRect().bottom-svg.getBoundingClientRect().bottom-18);
    if(slack>12)rpAreaChart(lnBox,...ARGS,{H:Math.min(520,300+slack),years:[...Array(M)].map(()=>RPT_DOC.y),title:L('디지털','Digital')});});
  h.querySelectorAll('[data-rpdgb]').forEach(b=>b.onclick=()=>{RPT.dgB=b.dataset.rpdgb;h.querySelectorAll('[data-rpdgb]').forEach(x=>x.classList.toggle('on',x===b));rpDgDonut(c,acol);});
  h.querySelectorAll('[data-rpdgp]').forEach(b=>b.onclick=()=>{RPT.dgP=b.dataset.rpdgp;rpDg();});
  rpGo(h);}
/* 디지털 세부 — 고른 광고주의 동영상 · PC · 모바일 3D 도넛. 색은 그 광고주 범례 색의 명도 · 채도만 달리 */
function rpDgDonut(c,acol){
  const box=$('rpDgDn'),nt=$('rpDgNote');if(!box)return;const M=RPT_DOC.m,b=RPT.dgB,base=acol[b]||'#7f8c99';
  const e=(((RPT_DOC.dgs||{})[c.k]||{})[b])||null,per=RPT.dgP==='ytd';
  const rows=e?(per?e.v.slice(0,M):[e.v[M-1]||[0,0,0]]):[];const v=[0,1,2].map(k=>rows.reduce((s2,r)=>s2+rN(r[k]),0));
  const est=e?(per?e.e.slice(0,M).some((x,i)=>x&&rpSum(e.v[i])>0):!!e.e[M-1]):false;
  const segs=[{n:L('동영상','Video'),v:v[0],col:base},{n:'PC',v:v[1],col:rpMix(base,'#ffffff',.42)},{n:L('모바일','Mobile'),v:v[2],col:rpMix(rpShadeC(base,.62),'#7f8c99',.25)}].filter(x=>x.v>0);
  if(!segs.length){box.innerHTML=`<div class="hint rpnil">${L('이 기간 디지털 집행 없음','No digital in this period')}</div>`;if(nt)nt.textContent='';return;}
  rp3dDonut(box,segs,'',{below:true,R:Math.min((box.clientWidth||460)*.36,150)});
  if(nt)nt.textContent=est?L('※ 일부 금액은 매체 비율 자료가 없어 임시 비율로 나눈 값입니다 (자료 연결 후 교체)','※ Some values use a provisional split'):L('리포트 디지털 광고비를 매체 비율(동영상 · PC · 모바일)로 나눈 값','Report digital spend split by format');}

/* ================================================================
   ⑧ 소재 아카이브 (v157) — 자사(코웨이 TVC 품목 스토리보드 · 인쇄 · 라디오) + 경쟁사(먼슬리 리포트 '집행 소재' 페이지)
   기본은 이번 달 소재. 카드 = 보고 있는 달 광고비 · eq.GRP(작은 회색 = 1~이번 달 누적). 그림을 누르면 사이트 안에서 크게
   ================================================================ */
const rpImg=(id,t)=>`assets/cr/${id}${t?'_t':''}.jpg`;
const rpImgC=(id,t)=>`assets/cr/ca/${id}${t?'_t':''}.jpg`;
let RP_COMP=null,RP_COMP_P=null;
function rpCompLoad(){if(RP_COMP)return Promise.resolve(RP_COMP);if(RP_COMP_P)return RP_COMP_P;
  RP_COMP_P=fetch('assets/cr/comp.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]).then(d=>(RP_COMP=Array.isArray(d)?d:[]));return RP_COMP_P;}
const RP_MEDK={'TVC':['t','c'],'신문':['n'],'잡지':['g'],'라디오':['r'],'인쇄':['n','g'],'신문 · 잡지':['n','g']};
function rpArchItems(){
  const M=RPT_DOC.m,cats=RPT_DOC.cats||[];
  /* 자사 TVC — 품목 카드 */
  const own=(RPT_DOC.arch||[]).map(a=>{const mo=new Set();a.cr.forEach(c=>c.mo.forEach(x=>mo.add(x[0])));a.img.forEach(i=>(i.mo||[]).forEach(m=>mo.add(m)));
    const sumM=(k,f)=>a.cr.reduce((s2,c)=>s2+rpSum(c.mo.filter(f).map(x=>x[k])),0);
    return {key:'o|'+a.n,own:true,n:a.n,cat:RPT_ICAT[a.n]||'',med:'TVC',mo,img:[...a.img].reverse().map(i=>({src:rpImg(i.id),th:rpImg(i.id,1),w:i.w,h:i.h,on:i.on,mo:i.mo||[]})),
      bud:sumM(1,x=>x[0]===M),eq:sumM(2,x=>x[0]===M),cbud:sumM(1,x=>x[0]<=M),ceq:sumM(2,x=>x[0]<=M),ncr:a.cr.length,a};});
  /* 경쟁사 · 자사 인쇄/라디오 — 브랜드 · 업종 · 매체 카드 */
  const g={};(RP_COMP||[]).filter(x=>x.mo.some(m=>m<=M)).forEach(x=>{const k=[x.br,x.cat,x.med].join('|');(g[k]||(g[k]={br:x.br,cat:x.cat,med:x.med,list:[]})).list.push(x);});
  const comp=Object.values(g).map(e=>{const c=cats.find(z=>z.k===e.cat)||cats.find(z=>z.sp===e.cat),mk=RP_MEDK[e.med]||['t','c'],mo=new Set();e.list.forEach(x=>x.mo.forEach(m=>{if(m<=M)mo.add(m);}));
    const bud=c?rpAmt(c,e.br,'mo'+M,mk):0,cbud=c?rpAmt(c,e.br,'ytd',mk):0;
    const tv=e.med==='TVC'&&c?((RPT_DOC.tvr||{})[c.k]||[]).filter(r=>r[1]===e.br&&r[2]===2):[];
    const eq=tv.filter(r=>r[0]===M).reduce((s2,r)=>s2+rN(r[7]),0),ceq=tv.filter(r=>r[0]<=M).reduce((s2,r)=>s2+rN(r[7]),0);
    const own=e.br==='코웨이';
    return {key:'c|'+e.br+'|'+e.cat+'|'+e.med,own,n:own?`${L('코웨이','Coway')} ${e.med}`:e.br,cat:e.cat,med:e.med,mo,
      img:[...e.list].sort((a,b)=>Math.max(...b.mo)-Math.max(...a.mo)).map(x=>({src:rpImgC(x.id),th:rpImgC(x.id,1),w:x.w,h:x.h,mo:x.mo.filter(m=>m<=M)})),
      bud,eq:e.med==='TVC'?eq:NaN,cbud,ceq:e.med==='TVC'?ceq:NaN,tv:e.med==='TVC'};});
  return [...own,...comp].filter(x=>x.img.length||x.mo.size);}
function rpArch(){
  const h=$('rpArch');if(!h)return;const M=RPT_DOC.m;
  if(!RP_COMP){h.innerHTML=`<div class="sec">${L('소재 아카이브','Creative archive')}</div><div class="hint rpnil">${L('불러오는 중…','Loading…')}</div>`;rpCompLoad().then(()=>{if(h.isConnected)rpArch();});return;}
  const all=rpArchItems();if(!all.length){h.innerHTML='';return;}
  if(!RPT.arcScope)RPT.arcScope='m';if(!RPT.arcOwn)RPT.arcOwn='all';
  const inScope=x=>RPT.arcScope==='ytd'||x.mo.has(M),inOwn=x=>RPT.arcOwn==='all'||(RPT.arcOwn==='own')===!!x.own;
  const base=all.filter(x=>inScope(x)&&inOwn(x));
  const cats=[{k:'all',l:L('전체 업종','All'),s:base.length}].concat(RPT_DOC.cats.filter(c=>base.some(i=>i.cat===c.k)).map(c=>({k:c.k,l:c.lab,s:base.filter(i=>i.cat===c.k).length})));
  if(!cats.some(x=>x.k===RPT.arcCat))RPT.arcCat='all';
  const vis=base.filter(i=>RPT.arcCat==='all'||i.cat===RPT.arcCat).sort((a,b)=>(b.own-a.own)||(rN(b.bud)-rN(a.bud))||(rN(b.cbud)-rN(a.cbud)));
  const catLab=k=>((RPT_DOC.cats||[]).find(c=>c.k===k)||{}).lab||k;
  const num=(v,f)=>isFinite(v)&&v>0?f(v):'–';
  h.innerHTML=`<div class="sec">${L('소재 아카이브','Creative archive')} <span class="note">${L('자사 · 경쟁사 · 먼슬리 리포트 집행 소재','Coway · competitors · from monthly reports')}</span></div>
    <div class="rparcbar">${rpSeg([{k:'m',l:L(`${M}월 소재`,`M${M}`)},{k:'ytd',l:L(`1~${M}월 전체`,'YTD')}],RPT.arcScope,'data-rparcs')}
      ${rpSeg([{k:'all',l:L('전체','All')},{k:'own',l:L('자사','Coway')},{k:'comp',l:L('경쟁사','Competitors')}],RPT.arcOwn,'data-rparco')}</div>
    ${rpChips(cats,RPT.arcCat,'data-rparc')}
    ${vis.length?`<div class="rparch">${vis.map((a,i)=>{const ims=a.img.slice(0,1);
      return `<button type="button" class="rpac${a.own?' mine':''}" data-rpai="${esc(a.key)}" style="--d:${i*35}ms">
        <div class="th${a.own&&a.med==='TVC'?'':' pg'}">${ims.length?`<img src="${ims[0].th}" alt="" decoding="async">`:`<div class="ph">${esc(a.n.slice(0,2))}</div>`}${a.img.length>1?`<span class="cnt">${a.img.length}</span>`:''}</div>
        <div class="tx"><div class="tg"><span class="${a.own?'own':''}">${a.own?L('자사','Coway'):L('경쟁사','Competitor')}</span><em>${esc(catLab(a.cat))} · ${esc(a.med)}</em></div><b>${esc(a.n)}</b>
          <div class="nb"><span><em>${L(`${M}월 광고비`,`M${M} spend`)}</em><b>${num(a.bud,wrEok)}</b><i>${L('누적','YTD')} ${num(a.cbud,wrEok)}</i></span>
            ${a.med==='TVC'?`<span><em>eq.GRP</em><b>${num(a.eq,v=>wrF(v))}</b><i>${L('누적','YTD')} ${num(a.ceq,v=>wrF(v))}</i></span>`:''}</div></div></button>`;}).join('')}</div>`
      :`<div class="hint rpnil">${L('이 조건의 소재가 없습니다','No creatives for this filter')}</div>`}`;
  h.querySelectorAll('[data-rparc]').forEach(b=>b.onclick=()=>{RPT.arcCat=b.dataset.rparc;rpArch();});
  h.querySelectorAll('[data-rparcs]').forEach(b=>b.onclick=()=>{RPT.arcScope=b.dataset.rparcs;rpArch();});
  h.querySelectorAll('[data-rparco]').forEach(b=>b.onclick=()=>{RPT.arcOwn=b.dataset.rparco;rpArch();});
  h.querySelectorAll('[data-rpai]').forEach(b=>b.onclick=()=>rpArchOpen(b.dataset.rpai));
  rpGo(h);}
/* 그림 크게 보기 — 새 창 대신 사이트 안 덮개 */
function rpLightbox(list,i){
  let k=i||0;const ov=document.createElement('div');ov.className='rplb';ov.setAttribute('role','dialog');
  const paint=()=>{const x=list[k];ov.innerHTML=`<div class="bx"><img src="${x.src}" alt=""><div class="cap">${esc(x.cap||'')}${list.length>1?` <span>${k+1} / ${list.length}</span>`:''}</div></div>
    <button type="button" class="x" aria-label="${L('닫기','Close')}"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg></button>
    ${list.length>1?`<button type="button" class="nv l" aria-label="${L('이전','Prev')}"><svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg></button><button type="button" class="nv r" aria-label="${L('다음','Next')}"><svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg></button>`:''}`;
    ov.querySelector('.x').onclick=close;const l=ov.querySelector('.nv.l'),r=ov.querySelector('.nv.r');
    if(l)l.onclick=e=>{e.stopPropagation();k=(k+list.length-1)%list.length;paint();};if(r)r.onclick=e=>{e.stopPropagation();k=(k+1)%list.length;paint();};};
  const key=e=>{if(e.key==='Escape'){e.stopPropagation();close();}else if(e.key==='ArrowRight'&&list.length>1){k=(k+1)%list.length;paint();}else if(e.key==='ArrowLeft'&&list.length>1){k=(k+list.length-1)%list.length;paint();}};
  function close(){removeEventListener('keydown',key,true);ov.classList.remove('on');setTimeout(()=>ov.remove(),200);}
  ov.addEventListener('click',e=>{if(e.target===ov)close();});addEventListener('keydown',key,true);
  paint();document.body.appendChild(ov);requestAnimationFrame(()=>ov.classList.add('on'));}
function rpArchOpen(key){
  const a=rpArchItems().find(x=>x.key===key);if(!a)return;const M=RPT_DOC.m;
  const capOf=x=>[x.on?`${L('첫 방영','First aired')} ${wrD(x.on)}`:'',x.mo&&x.mo.length?`${L('리포트 수록','In reports')} ${x.mo.map(m=>m+L('월','')).join(' · ')}`:''].filter(Boolean).join(' · ');
  const gal=a.img.length?`<div class="rpgal${a.own&&a.med==='TVC'?'':' pg'}">${a.img.map((im,i)=>`<figure><button type="button" class="zim" data-zi="${i}" aria-label="${L('크게 보기','Enlarge')}"><img loading="lazy" src="${im.src}" alt="" style="aspect-ratio:${im.w}/${im.h}"><span class="zb"><svg viewBox="0 0 16 16"><path d="M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.4 10.4 14 14M5 7h4M7 5v4"/></svg></span></button>
      <figcaption>${capOf(im)}</figcaption></figure>`).join('')}</div>`:'';
  let tbl='';
  if(a.own&&a.a){const rows=a.a.cr.map(c=>{const m=c.mo.find(x=>x[0]===M),cum=c.mo.filter(x=>x[0]<=M),last=cum[cum.length-1]||[];
      return `<tr><td class="br">${esc(c.n)}</td><td>${c.on?wrD(c.on):'–'}</td><td>${m?wrEok(m[1]):'–'}<div class="cum">${L('누적','YTD')} ${wrEok(rpSum(cum.map(x=>x[1])))}</div></td>
        <td>${m?wrF(m[2],1):'–'}<div class="cum">${L('누적','YTD')} ${wrF(rpSum(cum.map(x=>x[2])),1)}</div></td><td>${last[5]!=null?wrF(last[5],1)+'%':'–'}</td></tr>`;}).join('');
    tbl=`<table class="tbl lite rptbl rpcrt eqw"><thead><tr><th>${L('소재','Creative')}</th><th>${L('온에어','On air')}</th><th>${L(`${M}월 광고비`,`M${M} spend`)}</th><th>${L(`${M}월 eq.GRP`,`M${M} eq.GRP`)}</th><th>${L('누적 R3+','Cum. R3+')}</th></tr></thead>
      <tbody>${rows||`<tr><td colspan="5">${L('위클리 리포트 소재 없음','No weekly creatives')}</td></tr>`}</tbody></table>`;}
  else tbl=`<div class="rpcrsum"><span><em>${L(`${M}월 광고비`,`M${M} spend`)}</em><b>${isFinite(a.bud)&&a.bud>0?wrEok(a.bud):'–'}</b><i>${L('누적','YTD')} ${a.cbud>0?wrEok(a.cbud):'–'}</i></span>
      ${a.med==='TVC'?`<span><em>${L(`${M}월 eq.GRP`,`M${M} eq.GRP`)}</em><b>${a.eq>0?wrF(a.eq):'–'}</b><i>${L('누적','YTD')} ${a.ceq>0?wrF(a.ceq):'–'}</i></span>`:''}
      <span class="n">${L('광고비 = 먼슬리 리포트 업종 · 매체 모니터링 금액','Spend = monitored, by category · media')}</span></div>`;
  const catLab=((RPT_DOC.cats||[]).find(c=>c.k===a.cat)||{}).lab||a.cat;
  openModal(`${a.n} — ${esc(catLab)} · ${esc(a.med)}`,`${tbl}${gal}`,`<button class="btn primary" data-close>${L('닫기','Close')}</button>`,{w:1080});
  setTimeout(()=>document.querySelectorAll('#modalHost .modal:not(.stacked) [data-zi]').forEach(b=>b.onclick=()=>rpLightbox(a.img.map(x=>({src:x.src,cap:`${a.n} · ${capOf(x)}`})),+b.dataset.zi)),0);}
