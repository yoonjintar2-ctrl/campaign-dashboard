/* =====================================================================
   TV 큐시트 (v167) — TV › 큐시트 메뉴 6개
   · 큐시트 화면 · 계산은 예전 큐시트 사이트(smcnc-cuesheet 17차) 코드를 그대로 쓴다 — cue.html 한 파일(cue/build.py)을
     틀(iframe) 안에 띄운다. 전역 이름 · CSS 가 대시보드와 섞이지 않게 문서를 나눈 것.
   · 데이터 — 그 달 캠페인 문서 안 tv.cue = {v,ym,z,at,name,st}. z = 작업 데이터(JSON)를 gzip → base64 (한 달 약 50KB).
     변경 이력 · 버전은 두지 않는다. 달마다 최신본 하나.
   · 넣기 — 데이터 접수함에 '코웨이 TV set 큐시트 (YYYY년 M월)' 통합 엑셀을 올리면 '바로 넣기'.
   ===================================================================== */
var TV_CUE=null;        // var — 14-tv 의 tvForDoc · tvFromDoc 이 typeof 로 본다
var CUE_TAB='summary';
var CUE_SUB='cueg';      // 큐시트 메뉴 안에서 고른 쪽(지상파 · 케이블)
const CUE_TABS=[['summary','TV 미디어믹스'],['cue','큐시트'],['cal','큐시트 캘린더'],['cueall','전체 큐시트']];
const CUE={json:'',key:'',busy:false,frameKey:'',imp:null,impWait:null};
const CUE_URL='cue.html';
/* v184 — 큐시트 틀 주소는 버전만 붙인다. 달 · 탭은 # 뒤에 실어 같은 파일을 캐시에서 다시 쓴다(예전에는 캠페인마다 1.5MB 를 새로 받았다) */
const CUE_VER='184';
async function cuePipe(bytes,stream){
  const wr=stream.writable.getWriter();wr.write(bytes);wr.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());}
async function cueGz(obj){
  const b=await cuePipe(new TextEncoder().encode(JSON.stringify(obj)),new CompressionStream('gzip'));
  let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));
  return btoa(s);}
async function cueUngz(z){
  const bin=atob(z),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(await cuePipe(b,new DecompressionStream('gzip')));}
function cueKeyOf(){return TV_CUE?`${TV_CUE.ym}|${TV_CUE.at}|${(TV_CUE.z||'').length}`:'';}
/* 틀이 열릴 때 부른다 — 그 달 작업 데이터 */
function cueFrameData(){
  if(!TV_CUE||!CUE.json||CUE.key!==cueKeyOf())return null;
  try{return {ws:JSON.parse(CUE.json),at:TV_CUE.at,title:''};}catch(e){return null;}}
function cueFrameReady(w,imp){
  if(imp){CUE.imp=w;if(CUE.impWait){CUE.impWait(w);CUE.impWait=null;}return;}
  const f=$('cueFrame');if(f)f.classList.add('ready');}
/* 예전에 넣은 큐시트에는 계획 GRP 가 없다 — 틀이 계산해 알려 주면 채워 둔다(편집 권한이 있을 때만 저장 대상) */
function cueFrameStats(s){
  if(!TV_CUE||!s||!(s.grp>0))return;const st=TV_CUE.st||(TV_CUE.st={});let ch=false;
  /* v179 — 품목별 예산(원)도 적어 둔다 → 전체 캠페인 '월별 광고 구분' 표가 큐시트만 있는 달에도 품목을 보여 준다 */
  try{const D=cueMixData();if(D&&D.items.length){const it=D.items.map(x=>[x.fn||x.n,Math.round(x.sub.bud*1000),x.cat||'']);if(JSON.stringify(it)!==JSON.stringify(st.it||null)){st.it=it;ch=true;}}}catch(e){}
  if(Math.abs((+st.pgrp||0)-s.grp)>=.05){st.pgrp=Math.round(s.grp*10)/10;st.peq=Math.round(s.eq*10)/10;ch=true;}
  if(!ch)return;
  try{if(!isClient()&&inbxEdit())markDirty();}catch(e){}}
function cueReset(){CUE.json='';CUE.key='';CUE.frameKey='';const f=$('cueFrame');if(f){f.classList.remove('ready');f.removeAttribute('src');}
  /* v184 — 큐시트 화면을 보고 있는 중에 캠페인이 바뀌면 바로 다시 그린다(예전에는 앞 캠페인 머리글이 남고 '여는 중'에서 멈췄다) */
  try{const T=$('tabs');if(T&&T.dataset.cur==='tvcue'){clearTimeout(CUE.rt);CUE.rt=setTimeout(()=>{try{renderTvCue();}catch(e){}},30);}}catch(e){}}
/* v170 — 틀 높이 = 내용 높이(틀이 알려 준다) → 페이지 스크롤 하나만. 캘린더는 화면 폭을 넓게 쓴다 */
function cueSize(){
  const f=$('cueFrame'),host=$('cueHost');if(!f||!host||f.offsetParent===null)return;
  /* v172 — 큐시트 · 캘린더 · 전체 큐시트는 화면 폭을 넓게(가로 스크롤을 줄인다) */
  if(CUE_TAB!=='summary'){const r=host.getBoundingClientRect(),vw=document.documentElement.clientWidth,w=Math.min(vw-28,2400);
    if(w>r.width+8){f.style.width=w+'px';f.style.marginLeft=Math.round((vw-w)/2-r.left)+'px';}else{f.style.width='';f.style.marginLeft='';}}
  else{f.style.width='';f.style.marginLeft='';}
  {const sc=$('cueSec');if(sc){sc.style.marginLeft=f.style.marginLeft;sc.style.width=f.style.width;}}
  cueStickNow();}
function cueFrameH(h){const f=$('cueFrame');if(!f)return;h=Math.max(360,Math.round(h));if(Math.abs((parseFloat(f.style.height)||0)-h)>1)f.style.height=h+'px';}
/* 표 머리줄 고정 — 대시보드 머리(메뉴 줄) 아래에 붙도록 틀에 알려 준다 */
function cueStickNow(){
  const f=$('cueFrame');if(!f||f.offsetParent===null)return;
  try{const tb=document.querySelector('.topbar'),hb=tb?tb.getBoundingClientRect().bottom:0;
    const t2=$('tabs'),b2=t2?t2.getBoundingClientRect().bottom:0,top=Math.max(hb,b2>0&&b2<200?b2:0);
    f.contentWindow.cueStick&&f.contentWindow.cueStick(top-f.getBoundingClientRect().top);}catch(e){}}
(function(){let q=0;window.addEventListener('scroll',()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;cueStickNow();});},{passive:true});})();
/* 틀 안의 한 지점(y — 틀 기준)이 화면 가운데쯤 오도록 */
function cueScrollTo(y,x,smooth){
  const f=$('cueFrame');if(!f)return;const r=f.getBoundingClientRect();
  window.scrollTo({top:Math.max(0,window.scrollY+r.top+y-window.innerHeight*.42),behavior:smooth?'smooth':'auto'});}
window.addEventListener('resize',()=>{try{cueSize();}catch(e){}});
/* v173 — 미디어믹스 맨 위: 품목별 월 예산 · 채널별 월 예산 그래프를 큐시트 예산으로 그린다(계획은 미디어믹스, 실제 집행은 캠페인 퍼포먼스) */
function cueMixData(){
  try{const S=JSON.parse(CUE.json).sheets,B=S['예산']||[],hd=(B[0]||[]).slice(1),nz=x=>String(x||'').replace(/\s+/g,'');
    const col={},full={},catm={};(S['품목']||[]).forEach(r=>{if(r&&r[0]){col[r[0]]=r[3];full[r[0]]=String(r[1]||r[0]).trim();catm[r[0]]=String(r[2]||'').trim();}});   /* v182 — full = 품목 정식 이름 · v183 — catm = 품목 묶음(정수기 · 매트리스 …) */
    const mix=(h,k)=>{const n=parseInt(String(h).slice(1),16),f=v=>Math.round(v+(255-v)*k).toString(16).padStart(2,'0');return '#'+f(n>>16&255)+f(n>>8&255)+f(n&255);};
    const cOf=n=>{let c=col[n];if(!/^#[0-9a-f]{6}$/i.test(c||''))return '';c=wrCalm(c);if(n==='아이콘 얼음'&&col['아이콘3'])c=mix(wrCalm(col['아이콘3']),.42);return c;};
    /* 소재 금액 비중 — 소재 시트(품목 칸이 빈 줄은 윗줄 품목, '… 계' 줄은 뺀다) */
    const cre={};let cur='';(S['소재']||[]).forEach(r=>{if(!r)return;if(r[0])cur=nz(r[0]);const nm=String(r[3]||'');if(!cur||!nm||/\s계$/.test(nm))return;const w=+r[4];if(w>0)(cre[cur]||(cre[cur]=[])).push([nm,w]);});
    const meta={};(S['채널']||[]).forEach(r=>{if(r&&r[0])meta[r[0]]={g:r[2]==='지상파'?'지상파':'케이블',pp:r[3]||r[0]};});
    const it=hd.map(()=>0),chs=[];
    B.slice(1).forEach(r=>{let t=0;hd.forEach((h,i)=>{const v=+r[i+1];if(v>0){it[i]+=v;t+=v;}});
      if(t>0){const m=meta[r[0]]||{g:'케이블',pp:r[0]};chs.push({g:m.g,ch:r[0],pp:m.pp,bud:t/1000});}});
    const items=hd.map((h,i)=>{const b=it[i]/1000,cs=cre[nz(h)]||[],ws=cs.reduce((s,x)=>s+x[1],0);
      return {n:h,fn:full[h]||h,cat:catm[h]||'',col:cOf(h)||undefined,sub:{bud:b},cr:cs.length&&ws>0?cs.map(x=>({n:x[0],bud:b*x[1]/ws})):[{n:h,bud:b}]};}).filter(x=>x.sub.bud>0)
      .sort((a,b)=>b.sub.bud-a.sub.bud);
    return {items,tot:items.reduce((s,x)=>s+x.sub.bud,0),chs};}catch(e){return null;}}
function cueTopPaint(){
  const el=$('cueTop');if(!el)return;
  if(CUE_TAB!=='summary'||!CUE.json){if(el.firstChild){el.innerHTML='';WR_DN_SRC=null;}return;}
  if(el.dataset.k===CUE.key&&el.firstChild)return;
  const D=cueMixData();if(!D||!D.items.length){el.innerHTML='';return;}
  ['wrMix','wrDash'].forEach(id=>{const d=$(id);if(d&&d.querySelector('#wrDn'))d.innerHTML='';});
  el.dataset.k=CUE.key;WR_DN_SRC=D.chs;
  el.innerHTML=wrMixTopHtml(D);
  try{wrDnMount();wrMixTipWire(el);}catch(e){}}
function cueYmLabel(ym){const m=/^(\d{4})-(\d{2})$/.exec(ym||'');return m?`${m[1]}년 ${+m[2]}월`:'';}
async function renderTvCue(){
  const host=$('cueHost');if(!host)return;
  const ttl=$('cueTitle'),note=$('cueNote');
  if(!CUE_TABS.some(t=>t[0]===CUE_TAB))CUE_TAB='summary';
  const lb=(CUE_TABS.find(t=>t[0]===CUE_TAB)||CUE_TABS[0])[1];
  if(ttl)ttl.textContent=CUE_TAB==='cue'?(CUE_SUB==='cueg'?'지상파 큐시트':'케이블 큐시트'):lb;
  const seg=$('cueSeg');
  if(seg){seg.classList.toggle('hidden',CUE_TAB!=='cue'||!TV_CUE);
    seg.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.cs===CUE_SUB);b.onclick=()=>{if(CUE_SUB===b.dataset.cs)return;CUE_SUB=b.dataset.cs;renderTvCue();};});}
  const ftab=CUE_TAB==='cue'?CUE_SUB:CUE_TAB;
  let ed=false;try{ed=!isClient()&&inbxEdit();}catch(e){}
  if(!TV_CUE||!TV_CUE.z){
    {const t=$('cueTop');if(t)t.innerHTML='';WR_DN_SRC=null;}
    if(note)note.textContent='';
    host.innerHTML=`<div class="card cue-empty"><b>이 캠페인에 올라온 TV 큐시트가 없습니다</b>
      <p>${ed?'데이터 접수함에 그 달의 <em>TV set 큐시트</em> 통합 엑셀을 올리고 ‘바로 넣기’를 누르면 여기에 표시됩니다.':'큐시트가 올라오면 여기에서 볼 수 있습니다.'}</p>
      ${ed?'<button class="btn pri" id="cueGoInbox">데이터 접수함으로</button>':''}</div>`;
    const b=$('cueGoInbox');if(b)b.onclick=()=>{try{goMenu('inbox');}catch(e){}};
    return;}
  if(note){const s=TV_CUE.st||{};
    note.textContent=`${cueYmLabel(TV_CUE.ym)} · 지상파 ${(s.g||0).toLocaleString()}회 · 케이블 ${(s.c||0).toLocaleString()}회 · 반영 ${inbxWhen(new Date(TV_CUE.at).toISOString())}`;}
  /* v184 — 여는 동안 잘 보이는 로딩 화면(도는 고리 + 그 달 · 건수) */
  if(!$('cueFrame'))host.innerHTML='<div class="cue-load" id="cueLoad"><i class="sp"></i><b>큐시트를 여는 중…</b><span id="cueLoadSub"></span></div><iframe id="cueFrame" title="TV 큐시트" allow="clipboard-write"></iframe>';
  {const ls=$('cueLoadSub'),s=TV_CUE.st||{};if(ls)ls.textContent=`${cueYmLabel(TV_CUE.ym)} · ${((s.g||0)+(s.c||0)).toLocaleString()}건`;}
  let f=$('cueFrame');const key=cueKeyOf();
  if(CUE.key!==key){
    /* v184 — 푸는 도중에 캠페인이 바뀌면 끝난 뒤 한 번 더 그린다(예전에는 그냥 돌아가서 '여는 중'에 멈췄다) */
    if(CUE.busy){CUE.again=true;return;}CUE.busy=true;
    try{const z=TV_CUE.z,js=await cueUngz(z);
      if(!TV_CUE||TV_CUE.z!==z||cueKeyOf()!==key){CUE.busy=false;CUE.again=false;return renderTvCue();}
      CUE.json=js;CUE.key=key;}
    catch(e){CUE.busy=false;host.innerHTML=`<div class="card cue-empty"><b>큐시트를 열지 못했습니다</b><p>${esc((e&&e.message)||String(e))}</p></div>`;return;}
    CUE.busy=false;if(CUE.again){CUE.again=false;if(cueKeyOf()!==key)return renderTvCue();}}
  cueTopPaint();
  if(CUE.frameKey!==key){CUE.frameKey=key;
    /* 주소가 # 뒤만 다르면 틀이 다시 열리지 않는다 → 틀을 새로 만들어 그 달 자료로 확실히 다시 연다 */
    {const nf=document.createElement('iframe');nf.id='cueFrame';nf.title='TV 큐시트';nf.setAttribute('allow','clipboard-write');f.replaceWith(nf);f=nf;}
    f.classList.remove('ready');f.style.height=Math.max(420,window.innerHeight-Math.round(f.getBoundingClientRect().top+window.scrollY)-10)+'px';f.src=`${CUE_URL}?v=${CUE_VER}#t=${encodeURIComponent(ftab)}&k=${encodeURIComponent(String(TV_CUE.at))}`;}
  else{try{f.contentWindow.cueGo(ftab);f.contentWindow.cueTellH&&f.contentWindow.cueTellH();}catch(e){}}
  cueSize();}
/* 메뉴 줄 — 고른 큐시트 메뉴 표시 · 큐시트가 없으면 광고주 화면에서는 묶음을 감춘다 */
function cueMenuPaint(){
  const T=$('tabs');if(!T)return;
  const cur=(T.dataset.cur||'')==='tvcue';
  T.querySelectorAll('[data-cue]').forEach(b=>{b.classList.toggle('on',cur&&b.dataset.cue===CUE_TAB);
    /* 큐시트가 없는 캠페인 — 광고주 화면에서는 큐시트 메뉴를 감춘다 */
    let cl=false;try{cl=isClient();}catch(e){}b.classList.toggle('hidden',cl&&!TV_CUE);});
  /* 미디어믹스 = 큐시트 요약(큐시트가 있을 때) */
  const mx=T.querySelector('[data-menu="t_mix"]');if(mx&&cur)mx.classList.toggle('on',CUE_TAB==='summary');
  /* 주차별 퍼포먼스 — 리포트형(코웨이)은 캠페인 퍼포먼스 맨 아래로 들어갔다 */
  const wk=T.querySelector('[data-menu="t_week"]');if(wk){let w=false;try{w=wrOn();}catch(e){}wk.classList.toggle('hidden',w);}}

/* ---------- 통합 큐시트 엑셀 넣기 ---------- */
function cueImpFrame(){
  if(CUE.imp)return Promise.resolve(CUE.imp);
  return new Promise((res,rej)=>{
    CUE.impWait=res;
    let f=$('cueImpFrame');
    if(!f){f=document.createElement('iframe');f.id='cueImpFrame';f.title='큐시트 변환';f.setAttribute('aria-hidden','true');
      f.style.cssText='position:fixed;left:-9999px;top:0;width:1500px;height:900px;border:0;visibility:hidden';document.body.appendChild(f);f.src=CUE_URL+'?imp=1';}
    setTimeout(()=>{if(CUE.impWait){CUE.impWait=null;rej(new Error('큐시트 변환기를 불러오지 못했습니다'));}},30000);});}
async function cueSheetNames(file){
  const buf=new Uint8Array(await file.arrayBuffer());
  if(typeof XLSX!=='undefined'){const wb=XLSX.read(buf,{type:'array',bookSheets:true});return wb.SheetNames||[];}
  /* 대시보드 쪽 엑셀 읽개가 없으면(오프라인 등) 이름에 '큐시트'가 있을 때만 변환 틀에 묻는다 */
  if(!/큐시트/.test(file.name))return [];
  const w=await cueImpFrame();return w.cueSheetNames(buf.buffer);}
async function cueIsLegacy(file){
  if(!/\.xlsx$/i.test(file.name)||file.size>12*1048576)return 0;
  try{const n=await cueSheetNames(file);
    const has=re=>n.some(x=>re.test(x));
    return (has(/운영\s*요약/)&&(has(/지상파\s*TV/)||has(/케이블\s*TV|케이블raw/)))?9:0;}catch(e){return 0;}}
async function cueImportFile(file){
  const say=(t,d,o)=>{try{showToast(t,d,o||{});}catch(e){}};
  say('큐시트를 읽는 중…',file.name,{ms:2500});
  let year=new Date().getFullYear();
  const fm=/(20\d{2})\s*년/.exec(file.name);
  if(fm)year=+fm[1];else{try{const s=campStart();if(s)year=+String(s).slice(0,4)||year;}catch(e){}}
  let r;
  try{const w=await cueImpFrame();r=await w.cueImport(await file.arrayBuffer(),year);}
  catch(e){say('큐시트를 읽지 못했습니다',(e&&e.message)||String(e),{kind:'warn',ms:7000});return false;}
  const put=async()=>{
    TV_CUE={v:1,ym:r.ym,z:await cueGz(r.ws),at:Date.now(),name:file.name,
      st:{g:r.stats.g,c:r.stats.c,pgrp:Math.round((r.stats.grp||0)*10)/10,peq:Math.round((r.stats.eq||0)*10)/10,budget:r.stats.budget,value:r.stats.value,items:r.stats.items,cmpN:r.cmpN,cmpBad:r.cmpBad}};
    cueReset();try{markDirty();}catch(e){}try{applyMenus();}catch(e){}
    say('큐시트를 넣었습니다',`${cueYmLabel(r.ym)} · 지상파 ${r.stats.g.toLocaleString()}회 · 케이블 ${r.stats.c.toLocaleString()}회 · 엑셀 운영 요약 대조 ${r.cmpN-r.cmpBad}/${r.cmpN}칸 일치`
      +((r.unkItems||[]).length||(r.unkChs||[]).length?` · 모르는 이름 ${[...(r.unkItems||[]),...(r.unkChs||[])].slice(0,4).join(', ')}`:''),{kind:r.cmpBad?'warn':'ok',ms:8000});};
  /* 캠페인 기간의 달과 큐시트의 달이 다르면 한 번 묻는다 */
  let cym='';try{cym=String(campStart()||'').slice(0,7);}catch(e){}
  if(cym&&r.ym&&cym!==r.ym){
    confirmModal('다른 달의 큐시트입니다',`이 캠페인은 <b>${cueYmLabel(cym)}</b>인데 파일은 <b>${cueYmLabel(r.ym)}</b> 큐시트입니다. 그래도 이 캠페인에 넣을까요?`,()=>{put();},'넣기',true);
    return true;}
  await put();return true;}
