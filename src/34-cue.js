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
const CUE_TABS=[['summary','요약'],['crev','당월 소재'],['cueg','지상파 큐시트'],['cuec','케이블 큐시트'],['cal','큐시트 캘린더'],['cueall','전체 큐시트']];
const CUE={json:'',key:'',busy:false,frameKey:'',imp:null,impWait:null};
const CUE_URL='cue.html';
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
function cueReset(){CUE.json='';CUE.key='';CUE.frameKey='';const f=$('cueFrame');if(f){f.classList.remove('ready');f.removeAttribute('src');}}
function cueSize(){
  const f=$('cueFrame');if(!f||f.offsetParent===null)return;
  const top=f.getBoundingClientRect().top+window.scrollY;
  f.style.height=Math.max(420,window.innerHeight-Math.round(top)-10)+'px';}
window.addEventListener('resize',()=>{try{cueSize();}catch(e){}});
function cueYmLabel(ym){const m=/^(\d{4})-(\d{2})$/.exec(ym||'');return m?`${m[1]}년 ${+m[2]}월`:'';}
async function renderTvCue(){
  const host=$('cueHost');if(!host)return;
  const ttl=$('cueTitle'),note=$('cueNote');
  const lb=(CUE_TABS.find(t=>t[0]===CUE_TAB)||CUE_TABS[0])[1];
  if(ttl)ttl.textContent=CUE_TAB==='summary'?'큐시트 요약':lb;
  let ed=false;try{ed=!isClient()&&inbxEdit();}catch(e){}
  if(!TV_CUE||!TV_CUE.z){
    if(note)note.textContent='';
    host.innerHTML=`<div class="card cue-empty"><b>이 캠페인에 올라온 TV 큐시트가 없습니다</b>
      <p>${ed?'데이터 접수함에 그 달의 <em>TV set 큐시트</em> 통합 엑셀을 올리고 ‘바로 넣기’를 누르면 여기에 표시됩니다.':'큐시트가 올라오면 여기에서 볼 수 있습니다.'}</p>
      ${ed?'<button class="btn pri" id="cueGoInbox">데이터 접수함으로</button>':''}</div>`;
    const b=$('cueGoInbox');if(b)b.onclick=()=>{try{goMenu('t_inbox');}catch(e){}};
    return;}
  if(note){const s=TV_CUE.st||{};
    note.textContent=`${cueYmLabel(TV_CUE.ym)} · 지상파 ${(s.g||0).toLocaleString()}회 · 케이블 ${(s.c||0).toLocaleString()}회 · 반영 ${inbxWhen(new Date(TV_CUE.at).toISOString())}`;}
  if(!$('cueFrame'))host.innerHTML='<div class="cue-load" id="cueLoad">큐시트를 여는 중…</div><iframe id="cueFrame" title="TV 큐시트" allow="clipboard-write"></iframe>';
  const f=$('cueFrame'),key=cueKeyOf();
  if(CUE.key!==key){
    if(CUE.busy)return;CUE.busy=true;
    try{CUE.json=await cueUngz(TV_CUE.z);CUE.key=key;}
    catch(e){CUE.busy=false;host.innerHTML=`<div class="card cue-empty"><b>큐시트를 열지 못했습니다</b><p>${esc((e&&e.message)||String(e))}</p></div>`;return;}
    CUE.busy=false;}
  if(CUE.frameKey!==key){CUE.frameKey=key;f.classList.remove('ready');f.src=`${CUE_URL}?t=${encodeURIComponent(CUE_TAB)}&k=${encodeURIComponent(String(TV_CUE.at))}`;}
  else{try{f.contentWindow.cueGo(CUE_TAB);f.contentWindow.scrollTo(0,0);}catch(e){}}
  cueSize();}
/* 메뉴 줄 — 고른 큐시트 메뉴 표시 · 큐시트가 없으면 광고주 화면에서는 묶음을 감춘다 */
function cueMenuPaint(){
  const T=$('tabs');if(!T)return;
  const cur=(T.dataset.cur||'')==='tvcue';
  T.querySelectorAll('[data-cue]').forEach(b=>b.classList.toggle('on',cur&&b.dataset.cue===CUE_TAB));
  let cl=false;try{cl=isClient();}catch(e){}
  const bar=$('tvcuebar'),hd=$('tvcuehd');
  if(bar){const any=[...bar.querySelectorAll('button')].some(x=>!x.classList.contains('menuoff')&&!x.classList.contains('hidden'));
    const off=!any||(cl&&!TV_CUE);
    bar.classList.toggle('menuoff',off);if(hd)hd.classList.toggle('hidden',off);}
  const ph=$('tvperfhd'),pb=$('tvsubbar');
  if(ph&&pb)ph.classList.toggle('hidden',pb.classList.contains('menuoff')||!bar||bar.classList.contains('menuoff'));}

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
      st:{g:r.stats.g,c:r.stats.c,budget:r.stats.budget,value:r.stats.value,items:r.stats.items,cmpN:r.cmpN,cmpBad:r.cmpBad}};
    cueReset();try{markDirty();}catch(e){}try{applyMenus();}catch(e){}
    say('큐시트를 넣었습니다',`${cueYmLabel(r.ym)} · 지상파 ${r.stats.g.toLocaleString()}회 · 케이블 ${r.stats.c.toLocaleString()}회 · 엑셀 운영 요약 대조 ${r.cmpN-r.cmpBad}/${r.cmpN}칸 일치`
      +((r.unkItems||[]).length||(r.unkChs||[]).length?` · 모르는 이름 ${[...(r.unkItems||[]),...(r.unkChs||[])].slice(0,4).join(', ')}`:''),{kind:r.cmpBad?'warn':'ok',ms:8000});};
  /* 캠페인 기간의 달과 큐시트의 달이 다르면 한 번 묻는다 */
  let cym='';try{cym=String(campStart()||'').slice(0,7);}catch(e){}
  if(cym&&r.ym&&cym!==r.ym){
    confirmModal('다른 달의 큐시트입니다',`이 캠페인은 <b>${cueYmLabel(cym)}</b>인데 파일은 <b>${cueYmLabel(r.ym)}</b> 큐시트입니다. 그래도 이 캠페인에 넣을까요?`,()=>{put();},'넣기',true);
    return true;}
  await put();return true;}
