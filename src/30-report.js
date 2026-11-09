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
var RPT={y:0,m:0,cat:'',brand:'코웨이',sos:'ytd',sosMed:'all',mix:'m',bub:'m',tblM:0,arcCat:'all'};
var RPT_DOC=null;   // var — 09-cloud applyDoc 이 먼저 불러도 되게
const rptOn=()=>!!(RPT_DOC&&RPT_DOC.v&&!RPT_DOC.none&&Array.isArray(RPT_DOC.cats));
const RPT_CW='#1d6fc2';
const RPT_PAL=['#9a8467','#5d8a84','#82739a','#b2875a','#6b7d93','#a36b7c','#77906d','#8f8a6c','#5e86a8','#8d7366'];
const RPT_MED=[{k:'t',l:'지상파',c:'#24406f',i:[0]},{k:'c',l:'케이블',c:'#6b8cc4',i:[1]},{k:'r',l:'라디오',c:'#c39a4e',i:[2]},
  {k:'n',l:'신문',c:'#8a7b68',i:[3]},{k:'g',l:'잡지',c:'#a77486',i:[4]},{k:'d',l:'디지털',c:'#4f9a8a',i:[5,6,7]}];
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
  if(rptOn()||(RPT_DOC&&RPT_DOC.y))return [RPT_DOC.y];
  const t=String(CAMPAIGN.today||iso(new Date())).slice(0,10);
  const ds=[campStart(),campEnd(),t].map(d=>String(d||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)).map(Number);
  const y0=Math.min(...ds),y1=Math.max(...ds);
  const out=[];for(let y=y0;y<=y1&&out.length<10;y++)out.push(y);
  return out.length?out:[new Date().getFullYear()];}

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
function rpColMap(cat){const m={};let i=0;rpBrands(cat).forEach(b=>{m[b]=b==='코웨이'?RPT_CW:RPT_PAL[i++%RPT_PAL.length];});return m;}
/* 브랜드 · 기간(당월 m / 누적 ytd) · 매체 키 → 천원 */
function rpAmt(cat,b,per,medKeys){
  const rows=rpSpend(cat)[b];if(!rows)return 0;const M=RPT_DOC.m;
  const idx=(medKeys||RPT_MED.map(x=>x.k)).flatMap(k=>RPT_MED.find(x=>x.k===k).i);
  const rs=per==='ytd'?rows:[rows[M-1]||[]];
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
  if(!ys.includes(RPT.y))RPT.y=ys[ys.length-1];
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
    <div id="rpCatBody"></div>
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
  h.innerHTML=`<div class="sec">${L('코웨이 TV 집행 요약','Coway TV summary')} <span class="note">${L(`${M}월 · 위클리 리포트 기준`,`M${M} · weekly report`)}</span></div>
    <div class="rpkpis">
      ${kpi(L('TV 광고비','TV spend'),bud,'eok',0,L(`연 누적 ${wrEok(ytd)}`,`YTD ${wrEok(ytd)}`),0)}
      ${kpi('eq.GRP',eq,'n',0,L(`연 누적 ${wrF(ytdEq)}`,`YTD ${wrF(ytdEq)}`),1)}
      ${kpi('R1+',r1,'p',0,'',2)}${kpi('R3+',r3,'p',0,'',3)}
      ${kpi(L('집행 품목','Items'),n,'n',0,L(`GRP ${wrF(grp)}`,`GRP ${wrF(grp)}`),4)}</div>
    <div class="rpgrid2">
      ${rpCard(L('품목별 집행','By item'),L(`${M}월`,`M${M}`),`<div id="rpIso" class="rpiso"></div>`,rpSeg(mets,RP_OWN_MET,'data-rpom'))}
      ${rpCard(L('월별 TV 광고비','Monthly TV spend'),L(`1~${M}월 · 품목 누적`,`M1–M${M} · stacked by item`),`<div id="rpOwnTr"></div>`)}</div>`;
  rpIso();rpOwnTrend();rpGo(h.querySelector('.rpkpis'));
  h.querySelectorAll('[data-rpom]').forEach(b=>b.onclick=()=>{RP_OWN_MET=b.dataset.rpom;h.querySelectorAll('[data-rpom]').forEach(x=>x.classList.toggle('on',x===b));rpIso();});}

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
  const k=RP_OWN_MET,vi=k==='bud'?1:k==='eq'?2:3;
  const it=cur.it.filter(x=>rN(x[1])>0||rN(x[2])>0).sort((a,b)=>rN(b[vi])-rN(a[vi]));
  if(!it.length){box.innerHTML=`<div class="hint">${L('집행 품목 없음','No items')}</div>`;return;}
  const W=Math.max(520,box.clientWidth||620),H=310,n=it.length,pad=26,dx=16,dy=9,gap=W/(n+.4),bw=Math.min(58,gap*.52),base=H-56,top=40;
  const mx=Math.max(...it.map(x=>rN(x[vi])))||1;
  const fmt=v=>k==='bud'?wrEok(v):k==='eq'?wrF(v):wrF(v,1)+'%';
  let g='';
  it.forEach((x,i)=>{const v=rN(x[vi]),hh=Math.max(2,(base-top)*v/mx),cx=pad+gap*(i+.2),col=wrCol(x[0]);
    g+=`<g class="ib" style="--d:${i*80}ms" data-tip="${i}">${rpPrism(cx,base,bw,hh,col,dx,dy)}</g>
      <text class="iv" style="--d:${i*80+380}ms" x="${(cx+bw/2+dx/2).toFixed(1)}" y="${(base-hh-dy-8).toFixed(1)}" text-anchor="middle">${fmt(v)}</text>
      <text class="in" x="${(cx+bw/2).toFixed(1)}" y="${base+20}" text-anchor="middle">${rpWrap(x[0]).map((t,j)=>`<tspan x="${(cx+bw/2).toFixed(1)}" dy="${j?14:0}">${esc(t)}</tspan>`).join('')}</text>`;});
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpisosvg">
    <path d="M${pad-8},${base} l${dx},${-dy} H${W-8}" class="flr"/><line x1="${pad-8}" x2="${W-pad}" y1="${base}" y2="${base}" class="bl"/>${g}</svg>`;
  rpGo(box);
  rpTipWire(box,i=>{const x=it[+i];if(!x)return '';return `<div class="t">${esc(x[0])}</div>${rpTr(L('광고비','Spend'),wrEok(x[1]))}${rpTr('eq.GRP',wrF(x[2],1))}${rpTr('R3+',wrF(x[3],1)+'%')}`;});}
function rpOwnTrend(){
  const box=$('rpOwnTr');if(!box)return;const own=RPT_DOC.own||[],M=RPT_DOC.m;
  const items=[...new Set(own.flatMap(o=>o.it.filter(x=>rN(x[1])>0).map(x=>x[0])))];
  const W=Math.max(420,box.clientWidth||520),H=300,base=H-40,top=26,n=12,gw=(W-20)/n,bw=Math.min(30,gw*.56);
  const mx=Math.max(...own.map(o=>rN(o.t[0])))||1;let g='';
  for(let m=1;m<=12;m++){const o=own.find(z=>z.m===m),x=10+gw*(m-1)+(gw-bw)/2;
    if(o){let y=base;const sh=o.it.filter(z=>rN(z[1])>0).sort((a,b)=>items.indexOf(a[0])-items.indexOf(b[0]));
      g+=`<g class="cb${m===M?' cur':''}" style="--d:${m*55}ms">`;
      sh.forEach(z=>{const hh=(base-top)*rN(z[1])/mx;y-=hh;g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,hh-1).toFixed(1)}" fill="${wrCol(z[0])}" data-tip="${m}|${esc(z[0])}"/>`;});
      g+=`</g><text class="cv${m===M?' cur':''}" style="--d:${m*55+400}ms" x="${(x+bw/2).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle">${wrEok(o.t[0])}</text>`;}
    else g+=`<rect x="${x.toFixed(1)}" y="${base-2}" width="${bw.toFixed(1)}" height="2" class="nil"/>`;
    g+=`<text class="mx${m===M?' cur':''}" x="${(x+bw/2).toFixed(1)}" y="${base+18}" text-anchor="middle">${m}${L('월','')}</text>`;}
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpcols"><line x1="6" x2="${W-6}" y1="${base}" y2="${base}" class="bl"/>${g}</svg>
    <div class="rplg">${items.map(n2=>`<span><i style="background:${wrCol(n2)}"></i>${esc(n2)}</span>`).join('')}</div>`;
  rpGo(box);
  rpTipWire(box,k=>{const [m,n2]=k.split('|'),o=own.find(z=>z.m===+m);if(!o)return '';const z=o.it.find(q=>q[0]===n2);
    return `<div class="t">${m}${L('월','')} · ${esc(n2)}</div>${z?rpTr(L('광고비','Spend'),wrEok(z[1]))+rpTr('eq.GRP',wrF(z[2],1))+rpTr('R3+',wrF(z[3],1)+'%'):''}${rpTr(L('월 합계','Month total'),wrEok(o.t[0]))}`;});}

/* ================================================================
   업종 고르기 — 업종 타일(코웨이 점유율 고리)이 곧 선택 칩
   ================================================================ */
function rpCatBar(){
  const h=$('rpCatBar');if(!h)return;
  const ring=p=>{const r=15,c=2*Math.PI*r,v=isFinite(p)?Math.max(0,Math.min(100,p)):0;
    return `<svg viewBox="0 0 40 40" class="ring"><circle cx="20" cy="20" r="${r}" class="bg"/><circle cx="20" cy="20" r="${r}" class="fg" style="--c:${c.toFixed(1)};--o:${(c*(1-v/100)).toFixed(1)}"/></svg>`;};
  h.innerHTML=`<div class="rpcats">${RPT_DOC.cats.map((c,i)=>{
    const bs=rpBrands(c),tot=bs.reduce((s,b)=>s+rpAmt(c,b,'ytd'),0),mine=rpAmt(c,'코웨이','ytd'),p=rpPct(mine,tot);
    return `<button type="button" class="rpcat${c.k===RPT.cat?' on':''}" data-rpcat="${esc(c.k)}" style="--d:${i*40}ms">${ring(p)}<span class="tx"><b>${esc(c.lab)}</b><em>SOS ${rpP(p)}</em></span></button>`;}).join('')}</div>`;
  rpGo(h);
  h.querySelectorAll('[data-rpcat]').forEach(b=>b.onclick=()=>{RPT.cat=b.dataset.rpcat;RPT.brand='코웨이';
    h.querySelectorAll('[data-rpcat]').forEach(x=>x.classList.toggle('on',x===b));rpCatBody();});}

function rpCatBody(){
  const h=$('rpCatBody');if(!h)return;const c=rpCat();
  const hasTv=!!(c.ar&&((RPT_DOC.tvr||{})[c.k]||[]).length);
  h.innerHTML=`<div class="rpblk" id="rpSos"></div><div class="rpblk" id="rpMix"></div>
    ${hasTv?`<div class="rpblk" id="rpTv"></div><div class="rpblk" id="rpDet"></div>`:''}
    <div class="rpblk" id="rpEtc"></div><div class="rpblk" id="rpDg"></div>`;
  rpSos();rpMix();if(hasTv){rpTv();rpDet();}rpEtc();rpDg();}

/* ================================================================
   ② 경쟁사 광고비 — 월별 누적 막대 + 3D 도넛(SOS)
   ================================================================ */
const RP_MEDSET={all:null,tv:['t','c'],dg:['d'],etc:['r','n','g']};
function rpSos(){
  const h=$('rpSos');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c),bs=rpBrands(c),mk=RP_MEDSET[RPT.sosMed];
  const segs=bs.map(b=>({n:b,v:rpAmt(c,b,RPT.sos,mk),col:col[b]})).filter(s=>s.v>0).sort((a,b)=>b.v-a.v);
  const tot=segs.reduce((s,x)=>s+x.v,0);
  const meds=[{k:'all',l:L('전체 매체','All media')},{k:'tv',l:'TV'},{k:'dg',l:L('디지털','Digital')},{k:'etc',l:L('라디오 · 인쇄','Radio · Print')}];
  h.innerHTML=`<div class="sec">${L('경쟁사 광고비','Competitor spend')} <span class="note">${esc(c.lab)}${c.sp==='정수기'&&c.k!=='정수기'?L(' · 광고비는 정수기(일반+얼음) 합산',' · spend = water purifier total'):''}</span></div>
    <div class="rpgrid2 w64">
      ${rpCard(L('월별 광고비','Monthly spend'),L(`1~${M}월`,`M1–M${M}`),`<div id="rpSosCols"></div>`,rpSeg(meds,RPT.sosMed,'data-rpsm'))}
      ${rpCard('SOS',RPT.sos==='ytd'?L(`1~${M}월 누적`,'YTD'):L(`${M}월`,`M${M}`),
        tot?`<div class="rpdnwrap"><div id="rpSosDn" class="rpdn"></div><div class="rpdnlg">${segs.map((s,i)=>`<div class="it" data-k="${i}" style="--d:${i*60+500}ms"><i style="background:${s.col}"></i><span>${esc(s.n)}</span><b>${rpP(s.v/tot*100,1)}</b><em>${wrEok(s.v)}</em></div>`).join('')}</div></div>`
          :`<div class="hint rpnil">${L('이 기간 집행 없음','No spend in this period')}</div>`,
        rpSeg([{k:'m',l:L('당월','Month')},{k:'ytd',l:L('누적','YTD')}],RPT.sos,'data-rpsp'))}</div>`;
  rpSosCols(c,col,bs,mk);
  if(tot)rpDnMount($('rpSosDn'),segs,h.querySelector('.rpdnlg'));
  h.querySelectorAll('[data-rpsm]').forEach(b=>b.onclick=()=>{RPT.sosMed=b.dataset.rpsm;rpSos();});
  h.querySelectorAll('[data-rpsp]').forEach(b=>b.onclick=()=>{RPT.sos=b.dataset.rpsp;rpSos();});
  rpGo(h);}
function rpSosCols(c,col,bs,mk){
  const box=$('rpSosCols');if(!box)return;const M=RPT_DOC.m,sp=rpSpend(c);
  const idx=(mk||RPT_MED.map(x=>x.k)).flatMap(k=>RPT_MED.find(x=>x.k===k).i);
  const val=(b,m)=>{const r=(sp[b]||[])[m-1]||[];return idx.reduce((s,i)=>s+rN(r[i]),0);};
  const tots=[...Array(M)].map((_,i)=>bs.reduce((s,b)=>s+val(b,i+1),0));const mx=Math.max(...tots)||1;
  const W=Math.max(520,box.clientWidth||700),H=310,base=H-40,top=28,gw=(W-20)/Math.max(M,6),bw=Math.min(46,gw*.58);let g='';
  for(let m=1;m<=M;m++){const x=10+gw*(m-1)+(gw-bw)/2;let y=base;
    g+=`<g class="cb${m===M?' cur':''}" style="--d:${m*60}ms">`;
    bs.forEach(b=>{const v=val(b,m);if(v<=0)return;const hh=(base-top)*v/mx;y-=hh;
      g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(.5,hh-1.5).toFixed(1)}" fill="${col[b]}" data-tip="${m}|${esc(b)}"/>`;});
    g+=`</g>${tots[m-1]>0?`<text class="cv${m===M?' cur':''}" style="--d:${m*60+420}ms" x="${(x+bw/2).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle">${wrEok(tots[m-1])}</text>`:''}
      <text class="mx${m===M?' cur':''}" x="${(x+bw/2).toFixed(1)}" y="${base+18}" text-anchor="middle">${m}${L('월','')}</text>`;}
  const used=bs.filter(b=>[...Array(M)].some((_,i)=>val(b,i+1)>0));
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpcols"><line x1="6" x2="${W-6}" y1="${base}" y2="${base}" class="bl"/>${g}</svg>
    <div class="rplg">${used.map(b=>`<span${b==='코웨이'?' class="mine"':''}><i style="background:${col[b]}"></i>${esc(b)}</span>`).join('')}</div>`;
  rpTipWire(box,k=>{const [m,b]=k.split('|');const r=(sp[b]||[])[+m-1]||[],v=val(b,+m),t=tots[+m-1];
    return `<div class="t">${m}${L('월','')} · ${esc(b)}</div>${rpTr(L('광고비','Spend'),wrEok(v))}${rpTr('SOS',rpP(v/t*100,1))}
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
  const bs=rpBrands(c).map(b=>({b,v:RPT_MED.map(md=>rpAmt(c,b,RPT.mix,[md.k]))})).map(x=>({...x,t:rpSum(x.v)})).filter(x=>x.t>0)
    .sort((a,b)=>(b.b==='코웨이')-(a.b==='코웨이')||b.t-a.t);
  const mx=Math.max(...bs.map(x=>x.t),1);
  const body=bs.length?`<div class="rpmix">${bs.map((x,i)=>`<div class="row${x.b==='코웨이'?' mine':''}" style="--d:${i*60}ms">
      <div class="nm">${esc(x.b)}</div>
      <div class="bar">${x.v.map((v,j)=>v>0?`<span class="sg" style="--w:${(v/x.t*100).toFixed(2)}%;background:${RPT_MED[j].c}" data-tip="${i}|${j}">${v/x.t>=.09?`<em>${Math.round(v/x.t*100)}%</em>`:''}</span>`:'').join('')}</div>
      <div class="tt"><i style="--w:${(x.t/mx*100).toFixed(1)}%"></i><b>${wrEok(x.t)}</b></div></div>`).join('')}</div>
    <div class="rplg">${RPT_MED.map(md=>`<span><i style="background:${md.c}"></i>${md.l}</span>`).join('')}</div>`
    :`<div class="hint rpnil">${L('이 기간 집행 없음','No spend in this period')}</div>`;
  h.innerHTML=`<div class="sec">${L('미디어 믹스','Media mix')} <span class="note">${esc(c.lab)}</span></div>
    ${rpCard(L('브랜드별 매체 비중','Media share by brand'),RPT.mix==='ytd'?L(`1~${M}월 누적`,'YTD'):L(`${M}월`,`M${M}`),body,
      rpSeg([{k:'m',l:L('당월','Month')},{k:'ytd',l:L('누적','YTD')}],RPT.mix,'data-rpmx'))}`;
  h.querySelectorAll('[data-rpmx]').forEach(b=>b.onclick=()=>{RPT.mix=b.dataset.rpmx;rpMix();});
  rpGo(h);
  rpTipWire(h,k=>{const [i,j]=k.split('|').map(Number),x=bs[i];if(!x)return '';
    return `<div class="t">${esc(x.b)} · ${RPT_MED[j].l}</div>${rpTr(L('광고비','Spend'),wrEok(x.v[j]))}${rpTr(L('비중','Share'),rpP(x.v[j]/x.t*100,1))}`;});}

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
    <div class="rpgrid2 w55">
      ${rpCard(L('노출량 × 도달','Exposure × reach'),L('eq.GRP × R3+ · 원 크기 = 광고비','eq.GRP × R3+ · size = spend'),`<div id="rpBub"></div>`,segB)}
      ${rpCard(L('월별 eq.GRP','Monthly eq.GRP'),L('TV set · 브랜드별','TV set · by brand'),`<div id="rpEqLn"></div>`)}</div>
    ${rpCard(L('TV set 성과','TV set performance'),L(`${RPT.tblM}월 · 실집행은 코웨이 실제 · 경쟁사 추정`,`M${RPT.tblM} · actual = Coway real, competitors est.`),`<div id="rpTvTbl"></div>`)}`;
  h.querySelectorAll('[data-rpbb]').forEach(b=>b.onclick=()=>{RPT.bub=b.dataset.rpbb;rpTv();});
  h.querySelectorAll('[data-rptm2]').forEach(b=>b.onclick=()=>{RPT.tblM=+b.dataset.rptm2;rpTv();});
  rpBubble(c,col,bub);rpEqLine(c,col);rpTvTbl(c,col);rpGo(h);}
function rpBubble(c,col,bub){
  const box=$('rpBub');if(!box)return;
  const pts=RPT.bub==='ytd'&&bub?Object.entries(bub).map(([b,v])=>({b,x:rN(v.eq),y:rN(v.r3),s:rN(v.won)/1000})).filter(p=>p.x>0||p.s>0)
    :rpTvRows(c,RPT.tblM).filter(r=>r[2]===2).map(r=>({b:r[1],x:rN(r[7]),y:rN(r[11]),s:rN(r[4])||rN(r[3]),r})).filter(p=>p.x>0);
  if(!pts.length){box.innerHTML=`<div class="hint rpnil">${L('TV 집행 없음','No TV')}</div>`;return;}
  const W=Math.max(420,box.clientWidth||560),H=330,L0=44,B=H-34,T=16,R0=W-18;
  const mxX=Math.max(...pts.map(p=>p.x))*1.18||1,mxY=Math.max(10,Math.ceil(Math.max(...pts.map(p=>p.y))*1.25/10)*10),mxS=Math.max(...pts.map(p=>p.s))||1;
  const X=v=>L0+(R0-L0)*v/mxX,Y=v=>B-(B-T)*v/mxY,RR=s=>8+Math.sqrt(s/mxS)*34;
  const nice=m=>{const s=Math.pow(10,Math.floor(Math.log10(m/4)));const f=m/4/s;return (f<1.5?1:f<3.5?2:f<7.5?5:10)*s;};
  const sx=nice(mxX),sy=nice(mxY);let grid='';
  for(let v=0;v<=mxX;v+=sx)grid+=`<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${B}" class="gl"/><text x="${X(v)}" y="${B+16}" text-anchor="middle" class="ax">${wrF(v)}</text>`;
  for(let v=0;v<=mxY;v+=sy)grid+=`<line x1="${L0}" x2="${R0}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L0-6}" y="${Y(v)+4}" text-anchor="end" class="ax">${v}%</text>`;
  const ord=[...pts].sort((a,b)=>b.s-a.s);
  const dots=ord.map((p,i)=>{const cx=X(p.x),cy=Y(p.y),r=RR(p.s),me=p.b==='코웨이';
    return `<g class="bb${me?' mine':''}" style="--d:${i*90}ms" data-tip="${esc(p.b)}">
      ${me?`<circle cx="${cx}" cy="${cy}" r="${r}" class="pulse" fill="none" stroke="${col[p.b]}"/>`:''}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${col[p.b]||'#999'}" fill-opacity="${me?.88:.62}"/>
      <text x="${cx}" y="${cy-r-6}" text-anchor="middle" class="bl2">${esc(p.b)}</text></g>`;}).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpbub">${grid}
    <text x="${R0}" y="${B-6}" text-anchor="end" class="axt">eq.GRP →</text><text x="${L0+6}" y="${T+12}" class="axt">↑ R3+</text>${dots}</svg>`;
  rpTipWire(box,b=>{const p=pts.find(q=>q.b===b);if(!p)return '';
    return `<div class="t">${esc(b)}</div>${rpTr('eq.GRP',wrF(p.x))}${rpTr('R3+',wrF(p.y,1)+'%')}${rpTr(L('광고비','Spend'),wrEok(p.s))}${p.r?rpTr('R1+',wrF(p.r[10],1)+'%')+rpTr('A.F',wrF(p.r[12],1))+rpTr(L('모니터링 CPRP','Mon. CPRP'),wrF(p.r[8])):''}`;});}
function rpEqLine(c,col){
  const box=$('rpEqLn');if(!box)return;const M=RPT_DOC.m,rows=((RPT_DOC.tvr||{})[c.k]||[]).filter(r=>r[2]===2);
  const bs=[...new Set(rows.map(r=>r[1]))];
  if(!bs.length){box.innerHTML=`<div class="hint rpnil">${L('TV 집행 없음','No TV')}</div>`;return;}
  const ser=bs.map(b=>({b,v:[...Array(M)].map((_,i)=>{const r=rows.find(q=>q[1]===b&&q[0]===i+1);return r?rN(r[7]):0;})}));
  const mx=Math.max(...ser.flatMap(s=>s.v))||1,W=Math.max(380,box.clientWidth||460),H=330,L0=14,R0=W-14,T=22,B=H-34,step=(R0-L0)/Math.max(1,M-1);
  const X=i=>M===1?(L0+R0)/2:L0+step*i,Y=v=>B-(B-T)*v/mx;
  ser.sort((a,b)=>(a.b==='코웨이')-(b.b==='코웨이'));
  let g='';for(let i=0;i<M;i++)g+=`<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${B}" class="gl"/><text x="${X(i)}" y="${B+18}" text-anchor="middle" class="ax">${i+1}${L('월','')}</text>`;
  ser.forEach((s,k)=>{const me=s.b==='코웨이',d=s.v.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    g+=`<path d="${d}" pathLength="1" class="ln${me?' mine':''}" stroke="${col[s.b]||'#999'}" style="--d:${k*120}ms"/>`;
    s.v.forEach((v,i)=>{if(v>0)g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${me?4.5:3}" fill="${col[s.b]}" class="pt" style="--d:${k*120+700}ms" data-tip="${i+1}"/>`;});});
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpln">${g}<rect class="hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/><line class="xh" y1="${T}" y2="${B}" x1="-10" x2="-10"/></svg>
    <div class="rplg">${[...ser].reverse().map(s=>`<span${s.b==='코웨이'?' class="mine"':''}><i style="background:${col[s.b]}"></i>${esc(s.b)}</span>`).join('')}</div>`;
  const svg=box.querySelector('svg'),xh=svg.querySelector('.xh');
  svg.addEventListener('mousemove',e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width;
    const i=Math.max(0,Math.min(M-1,Math.round(M===1?0:(x-L0)/step)));xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));
    const list=[...ser].map(s=>[s.b,s.v[i]]).filter(x2=>x2[1]>0).sort((a,b)=>b[1]-a[1]);
    showTip(e.clientX,e.clientY,`<div class="t">${i+1}${L('월','')} · eq.GRP</div>${list.length?list.map(([b,v])=>rpTr(`<i class="dot" style="background:${col[b]}"></i>${esc(b)}`,wrF(v))).join(''):`<div class="r">${L('집행 없음','No TV')}</div>`}`);});
  svg.addEventListener('mouseleave',()=>{xh.setAttribute('x1',-10);xh.setAttribute('x2',-10);hideTip();});}
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
  box.innerHTML=wrHs(`<table class="tbl lite rptbl"><thead><tr><th>${L('브랜드','Brand')}</th><th>${L('구분','Type')}</th><th>${L('모니터링 광고비','Monitored')}</th><th>${L('실집행','Actual')}</th>
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
  const barRow=`<tr class="sbar"><td></td><td></td>${G.map((g,gi)=>`<td colspan="${g.a.length}"><div class="stk">${g.a.map((x,i)=>`<span style="--w:${(x.inv/T.inv*100).toFixed(2)}%;background:${tones[Math.min(i,5)]};--d:${gi*120+i*50}ms" data-tip="${gi}|${i}"></span>`).join('')}</div></td>`).join('')}</tr>`;
  const pc=(v,t)=>rpP(v/t*100);
  const row=(l,tot,cell,cls)=>`<tr class="${cls||''}"><td class="md">${l}</td><td class="tv">${tot}</td>${G.map(g=>g.a.map(x=>`<td>${cell(x,g)}</td>`).join('')).join('')}</tr>`;
  const ar=x=>x.ins?wrF(x.grp/x.ins,1):'–',cprp=x=>x.eq?wrF(x.inv/x.eq):'–';
  const body=(hasAct?row(L('금액(실집행)','Actual'),wrF(actT),(x,g)=>g===G[0]&&det[x.k]&&det[x.k].hasAct?wrF(det[x.k].act):'','act'):'')
    +row(L('모니터링 광고비','Monitored'),wrF(T.inv),x=>pc(x.inv,T.inv),'hl')+row('Eq GRP',wrF(T.eq),x=>pc(x.eq,T.eq))
    +row(L('횟수','Spots'),wrF(T.ins),x=>pc(x.ins,T.ins))+row('A.R',ar(T),x=>ar(x))+row(L('모니터링 CPRP','Mon. CPRP'),cprp(T),x=>cprp(x));
  box.innerHTML=rpCard(L('지상파 세부 운영','Terrestrial detail'),L('비중 % · A.R = GRP ÷ 횟수 · CPRP = 모니터링 광고비 ÷ eq.GRP','share % · A.R = GRP/spots'),
    wrHs(`<table class="tbl lite rptbl rpdt"><thead><tr>${head1}</tr><tr>${head2}</tr></thead><tbody>${barRow}${body}</tbody></table>`));
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
  const tones=['#3f4a54','#58636e','#6b8cc4','#4f9a8a','#8a949e','#9db6e0','#a3acb5','#c39a4e','#bcc3ca','#d2d7dc','#e1e5e8'];
  const segs=list.filter(x=>share(x)>0).map((x,i)=>({n:x.k,v:share(x),col:x.k==='기타'?'#d7dce0':tones[i%tones.length]}));
  const T={mon:rpSum(list.map(x=>x.mon)),act:rpSum(list.map(x=>x.act)),eq:rpSum(list.map(x=>x.eq))};
  const tb=`<table class="tbl lite rptbl"><thead><tr><th>MPP</th><th>${L('모니터링 광고비','Monitored')}</th>${hasAct?`<th>${L('실집행 광고비','Actual')}</th>`:''}<th>${L('집행 비중','Share')}</th><th>Eq GRP</th><th>${L('모니터링 CPRP','Mon. CPRP')}</th>${hasAct?`<th>${L('실집행 CPRP','Act. CPRP')}</th>`:''}</tr></thead>
    <tbody>${list.map(x=>`<tr><td class="br">${esc(x.k)}</td><td>${wrF(x.mon)}</td>${hasAct?`<td>${x.act!=null?wrF(x.act):'–'}</td>`:''}<td><span class="rppb" style="--w:${(share(x)/tS*100).toFixed(1)}%"></span>${rpP(share(x)/tS*100)}</td>
      <td>${wrF(x.eq)}</td><td>${x.eq?wrF(x.mon/x.eq):'–'}</td>${hasAct?`<td>${x.eq&&x.act!=null?wrF(x.act/x.eq):'–'}</td>`:''}</tr>`).join('')}
    <tr class="tot"><td>Total</td><td>${wrF(T.mon)}</td>${hasAct?`<td>${wrF(T.act)}</td>`:''}<td>100%</td><td>${wrF(T.eq)}</td><td>${T.eq?wrF(T.mon/T.eq):'–'}</td>${hasAct?`<td>${T.eq?wrF(T.act/T.eq):'–'}</td>`:''}</tr></tbody></table>`;
  /* CPRP 막대 — 모니터링 · 실집행 같은 폭으로 살짝 겹쳐 */
  const cp=list.filter(x=>x.eq>0),mxC=Math.max(...cp.map(x=>Math.max(x.mon/x.eq,x.act!=null?x.act/x.eq:0)))||1;
  const bars=`<div class="rpcp">${cp.map((x,i)=>`<div class="row" style="--d:${i*50}ms"><span class="nm">${esc(x.k)}</span><span class="bars">
      <i class="m" style="--w:${(x.mon/x.eq/mxC*100).toFixed(1)}%" data-tip="${i}"></i>${x.act!=null?`<i class="a" style="--w:${(x.act/x.eq/mxC*100).toFixed(1)}%" data-tip="${i}"></i>`:''}</span>
      <b>${wrF(x.mon/x.eq)}${x.act!=null?` <em>${wrF(x.act/x.eq)}</em>`:''}</b></div>`).join('')}</div>
    <div class="rplg"><span><i style="background:#9aa6b3"></i>${L('모니터링 CPRP','Mon. CPRP')}</span>${hasAct?`<span><i style="background:${RPT_CW}"></i>${L('실집행 CPRP','Act. CPRP')}</span>`:''}</div>`;
  box.innerHTML=`<div class="rpgrid3">
    ${rpCard(L('케이블 · 종편 MPP 비중','Cable MPP share'),hasAct?L('실집행 기준','by actual'):L('모니터링 기준','by monitored'),`<div class="rpdnwrap col"><div id="rpMppDn" class="rpdn"></div><div class="rpdnlg">${segs.map((s,i)=>`<div class="it" data-k="${i}" style="--d:${i*50+500}ms"><i style="background:${s.col}"></i><span>${esc(s.n)}</span><b>${rpP(s.v/tS*100,1)}</b></div>`).join('')}</div></div>`)}
    ${rpCard(L('케이블 · 종편 세부 운영','Cable detail'),'',wrHs(tb),'','span2')}</div>
    ${rpCard(L('MPP별 CPRP','CPRP by MPP'),L('낮을수록 효율적','lower is better'),bars)}`;
  rpDnMount($('rpMppDn'),segs,box.querySelector('.rpdnlg'));wrHsWire(box);
  rpTipWire(box.querySelector('.rpcp'),i=>{const x=cp[+i];if(!x)return '';return `<div class="t">${esc(x.k)}</div>${rpTr(L('모니터링 CPRP','Mon. CPRP'),wrF(x.mon/x.eq))}${x.act!=null?rpTr(L('실집행 CPRP','Act. CPRP'),wrF(x.act/x.eq)):''}${rpTr('eq.GRP',wrF(x.eq,1))}`;});}

/* ================================================================
   ⑥ 라디오 · 신문 · 잡지 / ⑦ 디지털 광고비
   ================================================================ */
function rpEtc(){
  const h=$('rpEtc');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c),bs=rpBrands(c);
  const meds=RPT_MED.filter(m=>['r','n','g'].includes(m.k));
  const cards=meds.map(md=>{const L2=bs.map(b=>({b,m:rpAmt(c,b,'m',[md.k]),y:rpAmt(c,b,'ytd',[md.k])})).filter(x=>x.y>0).sort((a,b)=>b.y-a.y);
    const mx=Math.max(...L2.map(x=>x.y),1);
    return `<div class="rpmed"><div class="h"><i style="background:${md.c}"></i>${md.l}<span>${L2.length?wrEok(rpSum(L2.map(x=>x.m)))+L(' · 당월',' · month'):''}</span></div>
      ${L2.length?L2.map((x,i)=>`<div class="row${x.b==='코웨이'?' mine':''}" style="--d:${i*60}ms" data-tip="${md.k}|${esc(x.b)}"><span class="nm">${esc(x.b)}</span>
        <span class="bars"><i class="y" style="--w:${(x.y/mx*100).toFixed(1)}%;background:${col[x.b]}"></i><i class="m" style="--w:${(x.m/mx*100).toFixed(1)}%;background:${col[x.b]}"></i></span>
        <b>${wrEok(x.y)}</b></div>`).join(''):`<div class="nil">${L('집행 없음','None')}</div>`}</div>`;}).join('');
  h.innerHTML=`<div class="sec">${L('라디오 · 신문 · 잡지','Radio · Newspaper · Magazine')} <span class="note">${esc(c.lab)} · ${L(`막대 = 1~${M}월 누적, 진한 부분 = ${M}월`,`bar = YTD, solid = M${M}`)}</span></div>
    <div class="rpmeds">${cards}</div>`;
  rpGo(h);
  rpTipWire(h,k=>{const [mk,b]=k.split('|'),md=RPT_MED.find(x=>x.k===mk);return `<div class="t">${esc(b)} · ${md.l}</div>${rpTr(L(`${M}월`,`M${M}`),wrEok(rpAmt(c,b,'m',[mk])))}${rpTr(L('누적','YTD'),wrEok(rpAmt(c,b,'ytd',[mk])))}`;});}
function rpDg(){
  const h=$('rpDg');if(!h)return;const c=rpCat(),M=RPT_DOC.m,col=rpColMap(c),sp=rpSpend(c);
  const DG=[{l:L('동영상','Video'),i:5,c:'#2f7d6f'},{l:'PC',i:6,c:'#6fb3a5'},{l:L('모바일','Mobile'),i:7,c:'#a8d5cb'}];
  const bs=rpBrands(c).filter(b=>(sp[b]||[]).some(r=>rN(r[5])+rN(r[6])+rN(r[7])>0));
  if(!bs.length){h.innerHTML=`<div class="sec">${L('디지털 광고비','Digital spend')} <span class="note">${esc(c.lab)}</span></div><div class="hint rpnil">${L('디지털 집행 없음','No digital')}</div>`;return;}
  const ser=bs.map(b=>({b,v:[...Array(M)].map((_,i)=>{const r=(sp[b]||[])[i]||[];return rN(r[5])+rN(r[6])+rN(r[7]);})}));
  const cur=bs.map(b=>{const r=(sp[b]||[])[M-1]||[];return {b,v:DG.map(d=>rN(r[d.i]))};}).map(x=>({...x,t:rpSum(x.v)})).filter(x=>x.t>0).sort((a,b)=>b.t-a.t);
  h.innerHTML=`<div class="sec">${L('디지털 광고비','Digital spend')} <span class="note">${esc(c.lab)}</span></div>
    <div class="rpgrid2 w55">${rpCard(L('월별 디지털 광고비','Monthly digital'),L(`1~${M}월 · 브랜드별`,'by brand'),`<div id="rpDgLn"></div>`)}
      ${rpCard(L('유형별','By format'),L(`${M}월`,`M${M}`),cur.length?`<div class="rpmix dg">${cur.map((x,i)=>`<div class="row${x.b==='코웨이'?' mine':''}" style="--d:${i*60}ms"><div class="nm">${esc(x.b)}</div>
          <div class="bar abs" style="--tw:${(x.t/cur[0].t*100).toFixed(1)}%">${x.v.map((v,j)=>v>0?`<span class="sg" style="--w:${(v/x.t*100).toFixed(2)}%;background:${DG[j].c}" data-tip="${i}|${j}"></span>`:'').join('')}</div><div class="tt"><b>${wrEok(x.t)}</b></div></div>`).join('')}</div>
          <div class="rplg">${DG.map(d=>`<span><i style="background:${d.c}"></i>${d.l}</span>`).join('')}</div>`:`<div class="hint rpnil">${L('당월 집행 없음','None this month')}</div>`)}</div>`;
  /* 꺾은선 — 영역은 흐리게, 코웨이 선을 굵게 */
  const box=$('rpDgLn'),mx=Math.max(...ser.flatMap(s=>s.v))||1,W=Math.max(380,box.clientWidth||520),H=300,L0=14,R0=W-14,T=20,B=H-34,step=(R0-L0)/Math.max(1,M-1);
  const X=i=>M===1?(L0+R0)/2:L0+step*i,Y=v=>B-(B-T)*v/mx;let g='';
  for(let i=0;i<M;i++)g+=`<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${B}" class="gl"/><text x="${X(i)}" y="${B+18}" text-anchor="middle" class="ax">${i+1}${L('월','')}</text>`;
  [...ser].sort((a,b)=>(a.b==='코웨이')-(b.b==='코웨이')).forEach((s,k)=>{const me=s.b==='코웨이',d=s.v.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    g+=`${me?`<path d="${d} L${X(M-1).toFixed(1)},${B} L${X(0).toFixed(1)},${B} Z" fill="${col[s.b]}" class="ar" style="--d:${k*100}ms"/>`:''}<path d="${d}" pathLength="1" class="ln${me?' mine':''}" stroke="${col[s.b]}" style="--d:${k*100}ms"/>`;});
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpln">${g}<line class="xh" y1="${T}" y2="${B}" x1="-10" x2="-10"/></svg>
    <div class="rplg">${ser.map(s=>`<span${s.b==='코웨이'?' class="mine"':''}><i style="background:${col[s.b]}"></i>${esc(s.b)}</span>`).join('')}</div>`;
  const svg=box.querySelector('svg'),xh=svg.querySelector('.xh');
  svg.addEventListener('mousemove',e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width,i=Math.max(0,Math.min(M-1,Math.round(M===1?0:(x-L0)/step)));
    xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));const list=ser.map(s=>[s.b,s.v[i]]).filter(z=>z[1]>0).sort((a,b)=>b[1]-a[1]);
    showTip(e.clientX,e.clientY,`<div class="t">${i+1}${L('월','')} · ${L('디지털','Digital')}</div>${list.length?list.map(([b,v])=>rpTr(`<i class="dot" style="background:${col[b]}"></i>${esc(b)}`,wrEok(v))).join(''):`<div class="r">${L('집행 없음','None')}</div>`}`);});
  svg.addEventListener('mouseleave',()=>{xh.setAttribute('x1',-10);xh.setAttribute('x2',-10);hideTip();});
  rpGo(h);
  rpTipWire(h.querySelector('.rpmix.dg')||h,k=>{const [i,j]=String(k).split('|').map(Number),x=cur[i];if(!x||!DG[j])return '';return `<div class="t">${esc(x.b)} · ${DG[j].l}</div>${rpTr(L('광고비','Spend'),wrEok(x.v[j]))}${rpTr(L('비중','Share'),rpP(x.v[j]/x.t*100,1))}`;});}

/* ================================================================
   ⑧ 소재 아카이브 — 품목 카드(대표 스토리보드 · 소재 수 · 집행 달) → 누르면 전체 소재
   ================================================================ */
const rpImg=(id,t)=>`assets/cr/${id}${t?'_t':''}.jpg`;
function rpArchItems(){
  return (RPT_DOC.arch||[]).map(a=>{const mo=new Set();a.cr.forEach(c=>c.mo.forEach(x=>mo.add(x[0])));a.img.forEach(i=>(i.mo||[]).forEach(m=>mo.add(m)));
    const bud=a.cr.reduce((s,c)=>s+rpSum(c.mo.map(x=>x[1])),0),eq=a.cr.reduce((s,c)=>s+rpSum(c.mo.map(x=>x[2])),0);
    const last=Math.max(0,...mo),cat=RPT_ICAT[a.n]||'';return {...a,mo,bud,eq,last,cat};})
    .sort((a,b)=>b.last-a.last||b.bud-a.bud);}
function rpArch(){
  const h=$('rpArch');if(!h)return;const M=RPT_DOC.m,items=rpArchItems();
  if(!items.length){h.innerHTML='';return;}
  const cats=[{k:'all',l:L('전체','All'),s:items.length}].concat(RPT_DOC.cats.filter(c=>items.some(i=>i.cat===c.k)).map(c=>({k:c.k,l:c.lab,s:items.filter(i=>i.cat===c.k).length})));
  if(!cats.some(x=>x.k===RPT.arcCat))RPT.arcCat='all';
  const vis=items.filter(i=>RPT.arcCat==='all'||i.cat===RPT.arcCat);
  h.innerHTML=`<div class="sec">${L('소재 아카이브','Creative archive')} <span class="note">${L(`코웨이 TVC · 1~${M}월`,`Coway TVC · M1–M${M}`)}</span></div>
    ${rpChips(cats,RPT.arcCat,'data-rparc')}
    <div class="rparch">${vis.map((a,i)=>{const im=a.img[a.img.length-1];
      return `<button type="button" class="rpac" data-rpai="${esc(a.n)}" style="--d:${i*45}ms;--c:${wrCol(a.n)}">
        <div class="th">${im?`<img src="${rpImg(im.id,1)}" alt="" decoding="async">`:`<div class="ph">${esc(a.n.slice(0,2))}</div>`}${a.last===M?`<span class="live">${L('이번 달 온에어','On air')}</span>`:''}</div>
        <div class="tx"><b>${esc(a.n)}</b><div class="meta"><span>${L(`소재 ${a.cr.length}`,`${a.cr.length} creatives`)}</span>${a.img.length?`<span>${L(`스토리보드 ${a.img.length}`,`${a.img.length} boards`)}</span>`:''}</div>
          <div class="mo">${[...Array(12)].map((_,k)=>`<i class="${a.mo.has(k+1)?'on':''}${k+1>M?' fut':''}" title="${k+1}${L('월','')}"></i>`).join('')}</div>
          <div class="nb"><span>${L('광고비','Spend')} <b>${wrEok(a.bud)}</b></span><span>eq.GRP <b>${wrF(a.eq)}</b></span></div></div></button>`;}).join('')}</div>`;
  h.querySelectorAll('[data-rparc]').forEach(b=>b.onclick=()=>{RPT.arcCat=b.dataset.rparc;rpArch();});
  h.querySelectorAll('[data-rpai]').forEach(b=>b.onclick=()=>rpArchOpen(b.dataset.rpai));
  rpGo(h);}
function rpArchOpen(n){
  const a=rpArchItems().find(x=>x.n===n);if(!a)return;const M=RPT_DOC.m;
  const imgs=[...a.img].reverse();
  const gal=imgs.length?`<div class="rpgal">${imgs.map(im=>`<figure><a href="${rpImg(im.id)}" target="_blank" rel="noopener"><img loading="lazy" src="${rpImg(im.id)}" alt="" style="aspect-ratio:${im.w}/${im.h}"></a>
      <figcaption>${im.on?`${L('첫 방영','First aired')} ${wrD(im.on)} · `:''}${L('리포트 수록','In reports')} ${(im.mo||[]).map(m=>m+L('월','')).join(' · ')}</figcaption></figure>`).join('')}</div>`:'';
  const rows=a.cr.map(c=>{const mo=new Map(c.mo.map(x=>[x[0],x]));const last=c.mo[c.mo.length-1]||[];
    return `<tr><td class="br">${esc(c.n)}</td><td>${c.on?wrD(c.on):'–'}</td>
      <td><div class="mo">${[...Array(12)].map((_,k)=>{const x=mo.get(k+1);return `<i class="${x&&rN(x[1])>0?'on':x?'pt':''}${k+1>M?' fut':''}" title="${k+1}${L('월','')}${x?` · ${wrEok(x[1])}`:''}"></i>`;}).join('')}</div></td>
      <td>${wrEok(rpSum(c.mo.map(x=>x[1])))}</td><td>${wrF(rpSum(c.mo.map(x=>x[2])),1)}</td><td>${last[5]!=null?wrF(last[5],1)+'%':'–'}</td></tr>`;}).join('');
  openModal(`${a.n} — ${L('전체 소재','All creatives')}`,
    `${gal}<table class="tbl lite rptbl rpcrt"><thead><tr><th>${L('소재','Creative')}</th><th>${L('온에어','On air')}</th><th>${L('집행 달','Months')}</th><th>${L('광고비','Spend')}</th><th>eq.GRP</th><th>${L('누적 R3+','Cum. R3+')}</th></tr></thead><tbody>${rows||`<tr><td colspan="6">${L('위클리 리포트 소재 없음','No weekly creatives')}</td></tr>`}</tbody></table>`,
    `<button class="btn primary" data-close>${L('닫기','Close')}</button>`,{w:1080});}
