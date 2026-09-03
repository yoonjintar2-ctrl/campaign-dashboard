/* ===== 11. 클라우드 — 구글 로그인 · 캠페인 저장/불러오기 (Supabase) =====
   config.js 와 supabase-js 가 둘 다 있을 때만 켜진다. 없으면 지금까지처럼 데모(더미) 모드. */
/* 접속 권한 4단계 (v24)
   appRole  = 계정 등급 : super(슈퍼마스터) / master(마스터) / guest(게스트)
   role     = 이 캠페인 안에서의 권한 : master(마스터) / editor(운영진) / viewer(광고주)
   shareRole= 코드로 들어온 경우의 권한 : 'staff'(운영진 코드) / 'viewer'(뷰어 코드) */
const CLOUD={on:false,sb:null,user:null,campaign:null,role:null,list:[],busy:false,
  shareView:false,sample:false,appRole:'guest',shareRole:null,savedAt:null,dirty:false};
const APP_ROLE_LABEL={super:'슈퍼마스터',master:'마스터',guest:'게스트'};
const cfgOf=()=>(typeof window!=='undefined'&&window.CLOUD_CONFIG)||null;
/* config.js 와 supabase-js 는 비동기로 붙으므로 준비될 때까지(최대 3초) 기다린다 */
function cloudReady(cb){
  if(window.__offline||window.__noConfig||window.__noSupabase)return cb();
  let n=0;
  (function tick(){
    const ok=cfgOf()&&typeof supabase!=='undefined'&&supabase.createClient;
    if(ok||n>60||window.__noConfig||window.__noSupabase)return cb();
    n++;setTimeout(tick,50);})();
}
const LINE_KEY=l=>['segment','media','product','target','line'].map(k=>String(l[k]||'')).join('|');
const cloudState=t=>{const e=$('cloudState');if(e)e.textContent=t;};

/* ---------- 직렬화 ----------
   캠페인 설정·소재·이슈·화면 구성은 JSON 문서 한 덩어리(campaigns.doc),
   일별 실적만 별도 정규화 테이블(daily_stats)에 넣는다. */
function serializeDoc(){
  const stripCr=c=>{const o={...c};delete o.daily;
    AMET.concat(['cost']).forEach(m=>delete o['t_'+m]);return o;};
  return {
    v:1,
    campaign:{name:CAMPAIGN.name,advertiser:CAMPAIGN.advertiser,today:CAMPAIGN.today,
      advLogo:CAMPAIGN.advLogo||'',theme:(typeof THEME!=='undefined'?THEME:'')},
    lines:LINES.map(l=>{const o={...l};delete o.daily;return o;}),
    creatives:CREATIVES.map(stripCr),
    issues:ISSUES,holidays:HOLIDAYS,bidTypes:BID_TYPES,verdictBand:VERDICT_BAND,
    cols:{line:LINE_COLS,sheet:SHEET_COLS},
    /* 입력 시트를 그대로 담는다 — 일별 실적의 원본이라 이게 있어야 다시 열어도 남는다 */
    sheet:(typeof SHEET!=='undefined'?SHEET:[]),
    views:{summaries:SUMMARIES,mix:MIX_CFG,raw:RAW_CFG,rawSeg:RAW_SEG,rawHSeg:RAW_HSEG,
           gantt:GANTT,creative:CR_CFG,stat:STAT_CFG,bub:BUB,bubColors:BUB_COLORS,
           perfOrder:(typeof PERF_ORDER!=='undefined'?PERF_ORDER:'sum'),
           donutOrder:(typeof DONUT_ORDER!=='undefined'?DONUT_ORDER:{})}
  };
}
/* keepToday=true 는 예시(샘플) 복원 전용 — 샘플은 만들어 둔 날짜 그대로 보여 준다.
   실제 캠페인은 저장된 날짜를 절대 쓰지 않는다. 저장본에 박힌 옛 날짜(예: 2026-09-25)를 되살리면
   "오늘"이 그 날로 굳어져 기간 필터 종료일이 계속 그 전날(9/24)로 잡혔다. */
/* 클립보드 복사 — navigator.clipboard 는 https(또는 localhost)가 아니면 막힌다.
   그럴 때를 대비해 숨긴 textarea + execCommand 로 한 번 더 시도한다. */
async function copyText(t){
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(t);return true;}
  }catch(e){}
  try{
    const ta=document.createElement('textarea');
    ta.value=t;ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();ta.setSelectionRange(0,ta.value.length);
    const ok=document.execCommand('copy');
    ta.remove();
    return ok;
  }catch(e){return false;}
}
function applyDoc(d,keepToday){
  if(!d||!d.lines)return;
  CAMPAIGN.name=d.campaign?.name||CAMPAIGN.name;
  CAMPAIGN.advertiser=d.campaign?.advertiser||'';
  CAMPAIGN.today=keepToday&&d.campaign?.today?d.campaign.today:iso(new Date());
  CAMPAIGN.advLogo=d.campaign?.advLogo||'';
  if(typeof applyTheme==='function')applyTheme(d.campaign?.theme||'',true);
  if(typeof renderBrand==='function')renderBrand();
  LINES=d.lines.map(l=>({...l,daily:{}}));
  migrateBudget(LINES);            /* 예전 net 기준 저장본을 Gross 기준으로 */
  CREATIVES=(d.creatives||[]).map(c=>({...c,daily:{}}));
  if(d.issues)ISSUES=d.issues;
  if(d.holidays)HOLIDAYS=d.holidays;
  if(d.bidTypes)BID_TYPES=d.bidTypes;
  if(isFinite(d.verdictBand))VERDICT_BAND=d.verdictBand;
  if(d.cols?.line)LINE_COLS=mergeCols(d.cols.line,lineColsDefault());
  if(d.cols?.sheet)SHEET_COLS=mergeCols(d.cols.sheet,sheetColsDefault());
  /* 저장해 둔 입력 시트를 되살린다 (없으면 건드리지 않는다) */
  if(Array.isArray(d.sheet))SHEET=d.sheet.map(r=>({...r}));
  const v=d.views||{};
  if(v.summaries)SUMMARIES=v.summaries;
  if(v.mix)MIX_CFG=v.mix;
  if(v.raw)RAW_CFG=v.raw;
  if(v.rawSeg)RAW_SEG=v.rawSeg;
  if(v.rawHSeg)RAW_HSEG=v.rawHSeg;
  if(v.perfOrder&&typeof PERF_ORDER!=='undefined'){PERF_ORDER=v.perfOrder;
    if(typeof applyPerfOrder==='function')applyPerfOrder();}
  if(v.gantt)GANTT=v.gantt;
  if(v.creative)CR_CFG=v.creative;
  if(v.stat)STAT_CFG=v.stat;
  if(v.bub)BUB=v.bub;
  if(v.bubColors)BUB_COLORS=v.bubColors;
  if(v.donutOrder&&typeof DONUT_ORDER!=='undefined')DONUT_ORDER=v.donutOrder;
}
/* 일별 실적 행 → 라인의 daily 배열 · 누적 a 로 되돌린다 */
function applyDaily(rows){
  const byKey={};LINES.forEach(l=>{
    byKey[LINE_KEY(l)]=l;
    l.daily={};AMET.forEach(m=>l.daily[m]=new Array(TOTAL_DAYS).fill(0));
    l.a={};AMET.forEach(m=>l.a[m]=0);});
  (rows||[]).forEach(r=>{
    const l=byKey[r.line_key];if(!l)return;
    const i=Math.round((new Date(r.stat_date+'T00:00:00')-d0)/DAY);
    if(i<0||i>=TOTAL_DAYS)return;
    const src={...(r.extra||{}),imp:r.imp,click:r.click,view:r.view,eng:r.eng,conv:r.conv,
      lead:r.lead,install:r.install,rev:r.rev,net:r.net};
    AMET.forEach(m=>{const v=+src[m]||0;l.daily[m][i]+=v;l.a[m]+=v;});});
}
/* 데이터 입력 시트 → daily_stats upsert 행 */
const DAILY_COLS=['imp','click','view','eng','conv','lead','install','rev','net'];
/* daily_stats 의 기본키는 (캠페인 · 날짜 · 라인) 하나뿐이다.
   시트에서 같은 라인·같은 날짜를 소재별로 나눠 적으면 행이 여러 개 나오는데,
   그대로 upsert 하면 "ON CONFLICT DO UPDATE command cannot affect row a second time" 로 저장이 통째로 실패한다.
   → 저장 직전에 (날짜 × 라인) 으로 합쳐서 한 행만 보낸다. 소재별 구분은 doc 의 입력 시트에 그대로 남는다. */
function sheetToRows(){
  const by=new Map();
  SHEET.forEach(r=>{
    const l=rowLine(r);if(!l||!r.date)return;
    const key=r.date+''+LINE_KEY(l);
    let row=by.get(key);
    if(!row){
      row={campaign_id:CLOUD.campaign.id,stat_date:r.date,line_key:LINE_KEY(l),
        creative:'',extra:{}};
      DAILY_COLS.forEach(k=>row[k]=0);
      by.set(key,row);}
    DAILY_COLS.forEach(k=>{if(k!=='net')row[k]+=+r[k]||0;});
    /* 시트는 Gross 소진비용을 받고, 저장은 Net 기준(DB 열이 net)이다 */
    row.net+=Math.round((+r.cost||0)*(1-feeOf(l)))||0;
    if(+r.net&&!+r.cost)row.net+=+r.net||0;
    AMET.forEach(m=>{if(!DAILY_COLS.includes(m))row.extra[m]=(+row.extra[m]||0)+(+r[m]||0);});
    /* 사용자가 열 설정에서 새로 만든 열도 함께 보관 */
    SHEET_COLS.forEach(c=>{if(c.type==='num'&&!AMET.includes(c.k)&&!DAILY_COLS.includes(c.k))
      row.extra[c.k]=(+row.extra[c.k]||0)+(+r[c.k]||0);});
  });
  return [...by.values()];
}


/* ===== 접속 화면 — 공유 코드 / 샘플 둘러보기 =====
   시행사가 캠페인마다 자동으로 받는 8자리 코드를 광고주에게 알려 주면
   로그인 없이 그 캠페인 대시보드를 "조회 전용(광고주 모드)"으로 볼 수 있다. */
const CODE_ALPHABET='ACDEFGHJKLMNPQRTUVWXY34679';   /* 헷갈리는 글자(I·O·0·1·S·5·B·8·2·Z) 제외 */
function makeShareCode(){
  let a='';for(let i=0;i<8;i++)a+=CODE_ALPHABET[Math.floor(Math.random()*CODE_ALPHABET.length)];
  return a.slice(0,4)+'-'+a.slice(4);}
const normCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)
  .replace(/^(.{4})(.{1,4})$/,'$1-$2');
/* 샘플(데모) 캠페인의 코드 — 클라우드가 없을 때 이 코드로도 들어올 수 있다 */
const SAMPLE_CODE='DEMO-2026';        /* 샘플 둘러보기 (시행사 화면) */
const SAMPLE_VIEW_CODE='VIEW-2026';   /* 샘플을 광고주 화면으로 보고 싶을 때 */
/* 처음 켰을 때의 예시 데이터를 그대로 떠 놓는다 —
   로그인·로그아웃을 거친 뒤 샘플로 돌아와도 새로고침 없이 다시 보여 주기 위해서.
   샘플은 이 스냅샷에서만 복원되므로 로그인 후 내 캠페인에는 절대 섞이지 않는다. */
let DEMO_SNAP=null;
(function keepDemo(){
  const grab=()=>{try{DEMO_SNAP=JSON.parse(JSON.stringify(serializeDoc()));
    DEMO_SNAP.__daily=LINES.map(l=>({k:LINE_KEY(l),daily:JSON.parse(JSON.stringify(l.daily))}));
  }catch(e){}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',grab):setTimeout(grab,0);
})();
/* ---------- 새로고침에도 남기기 ----------
   클라우드에 저장하지 않아도(또는 저장 전에 새로고침해도) 입력한 값이 사라지지 않도록
   이 브라우저에 마지막 상태를 적어 둔다. 캠페인마다 따로 저장한다. */
const LS_KEY=()=>'dmd:doc:'+((CLOUD&&CLOUD.campaign&&CLOUD.campaign.id)||'local');
let LS_T=null;
/* 일별 실적은 doc(설정 문서)에 넣지 않는다 — 클라우드에서는 daily_stats 테이블이 원본이기 때문.
   대신 브라우저 저장본에만 따로 담는다. 이게 없으면 새로고침할 때 라인의 daily 가 비고
   입력 시트에 적힌 줄만 살아남아 화면이 텅 비어 보였다. */
function packDaily(){
  return LINES.map(l=>{
    const d={};
    AMET.forEach(m=>{const a=l.daily&&l.daily[m];
      if(Array.isArray(a)&&a.some(v=>+v))d[m]=a.map(v=>Math.round((+v||0)*1000)/1000);});
    return {k:LINE_KEY(l),d};});
}
function unpackDaily(list){
  if(!Array.isArray(list)||!list.length)return false;
  const by={};list.forEach(x=>{if(x&&x.k)by[x.k]=x.d||{};});
  let hit=0;
  LINES.forEach(l=>{
    const d=by[LINE_KEY(l)];if(!d)return;hit++;
    l.daily=l.daily||{};l.a=l.a||{};
    AMET.forEach(m=>{
      if(!Array.isArray(l.daily[m]))l.daily[m]=[];
      const src=d[m];
      for(let i=0;i<TOTAL_DAYS;i++)l.daily[m][i]=src?(+src[i]||0):(+l.daily[m][i]||0);
      l.daily[m].length=TOTAL_DAYS;
      l.a[m]=sum(l.daily[m]);});});
  return hit>0;
}
const lsPack=()=>JSON.stringify({t:Date.now(),doc:serializeDoc(),daily:packDaily()});
function saveLocal(){
  clearTimeout(LS_T);
  LS_T=setTimeout(()=>{try{localStorage.setItem(LS_KEY(),lsPack());}catch(e){}},500);
}
function loadLocal(){
  try{
    const raw=localStorage.getItem(LS_KEY());if(!raw)return false;
    const o=JSON.parse(raw);if(!o||!o.doc||!o.doc.lines)return false;
    applyDoc(o.doc);
    rebuildPeriod();resetDateFilter();
    unpackDaily(o.daily);                 /* 저장해 둔 일별 실적을 먼저 되살리고 */
    if(typeof applySheet==='function')applySheet();   /* 시트에 적힌 날짜만 덮어쓴다 */
    buildFacts();buildFilters();buildSelects();
    renderAll();renderSheet();renderIssues();renderKpiTable();renderRaw();
    renderCreatives();renderGantt();
    return true;
  }catch(e){return false;}
}
function clearLocal(){try{localStorage.removeItem(LS_KEY());}catch(e){}}
/* 값이 바뀔 때마다 조용히 적어 둔다 */
addEventListener('beforeunload',()=>{try{localStorage.setItem(LS_KEY(),lsPack());}catch(e){}});
function restoreDemo(){
  if(!DEMO_SNAP)return false;
  clearWorkState();
  applyDoc(DEMO_SNAP,true);
  rebuildPeriod();resetDateFilter();
  const by={};(DEMO_SNAP.__daily||[]).forEach(x=>by[x.k]=x.daily);
  LINES.forEach(l=>{const d=by[LINE_KEY(l)];if(d)l.daily=JSON.parse(JSON.stringify(d));});
  buildFacts();buildFilters();buildSelects();
  renderAll();renderSheet();renderIssues();renderKpiTable();renderIssueAlert();
  renderRaw();renderCreatives();renderGantt();
  clearLocal();
  return true;
}
const gateEl=()=>$('gate');
function hideGate(){const g=gateEl();if(g)g.classList.add('hidden');}
function gateMsg(t,ok){const m=$('gateMsg');if(!m)return;m.textContent=t||'';m.classList.toggle('ok',!!ok);}
/* 코드로 들어온 사람 —
   뷰어 코드  → 광고주 (대시보드 열람 + 엑셀 다운로드만)
   운영진 코드 → 운영진 (그 캠페인 안에서는 마스터와 동등, 저장은 구글 로그인 후) */
function enterShareView(name,kind){
  CLOUD.shareView=true;CLOUD.shareRole=kind||'viewer';
  hideGate();
  if(typeof applyRole==='function')applyRole();
  const bar=$('demoBar');if(bar)bar.classList.add('hidden');
  cloudState(kind==='staff'
    ? `${name||CAMPAIGN.name} · 운영진 코드로 접속 — 저장하려면 구글 로그인이 필요합니다`
    : `${name||CAMPAIGN.name} · 뷰어 코드로 열람 (조회 전용)`);
}
/* 샘플 둘러보기는 시행사 전용 — 데이터 입력 · 캠페인 설정까지 다 열어 둔다.
   (공유 코드로 들어온 광고주와 달리 화면 전체를 둘러볼 수 있어야 하기 때문) */
function enterSample(){
  CLOUD.shareView=false;CLOUD.sample=true;CLOUD.campaign=null;CLOUD.role=null;
  /* 로그인·로그아웃을 거쳐 화면이 비어 있을 수 있으므로 예시 데이터를 되살린다 */
  restoreDemo();
  hideGate();
  if(typeof applyRole==='function')applyRole();
  cloudState('샘플 데이터 둘러보기 · 시행사 화면');
  const bar=$('demoBar');
  if(bar&&!sessionStorage.getItem('demoBarHidden'))bar.classList.remove('hidden');
}
/* 코드 확인 — 클라우드가 있으면 RPC(open_by_code)로, 없으면 샘플 코드만 */
async function tryCode(raw){
  const code=normCode(raw);
  if(code.replace('-','').length<8){gateMsg('8자리 코드를 모두 입력해 주세요.');return false;}
  if(code===SAMPLE_CODE){enterSample();return true;}
  if(code===SAMPLE_VIEW_CODE){enterShareView('샘플 캠페인','viewer');return true;}
  if(!CLOUD.on){
    gateMsg('그런 코드를 찾지 못했습니다. 시행사에서 받은 코드를 다시 확인해 주세요.');return false;}
  gateMsg('확인 중…',true);
  const {data,error}=await CLOUD.sb.rpc('open_by_code',{p_code:code});
  const c=Array.isArray(data)?data[0]:data;
  if(error||!c){gateMsg('그런 코드를 찾지 못했습니다. 시행사에서 받은 코드를 다시 확인해 주세요.');return false;}
  const kind=c.code_kind==='staff'?'staff':'viewer';
  CLOUD.campaign={id:c.id,name:c.name};
  CLOUD.role=kind==='staff'?'editor':'viewer';
  applyDoc(c.doc);
  rebuildPeriod();resetDateFilter();
  const {data:rows}=await CLOUD.sb.rpc('stats_by_code',{p_code:code});
  if(rows&&rows.length)applyDaily(rows);
  CREATIVES.forEach(c2=>{const cs=CREATIVES.filter(x=>x.lid===c2.lid);
    if(!c2.run)c2.run=[[0,Math.max(TOTAL_DAYS-1,0)]];
    if(!isFinite(c2.share))c2.share=1/Math.max(cs.length,1);});
  buildFacts();buildFilters();buildSelects();
  renderAll();renderIssues();renderIssueAlert();renderRaw();
  renderCreatives();renderGantt();
  enterShareView(c.name,kind);
  /* 운영진 코드는 다음 로그인 때 정식 멤버로 등록할 수 있게 기억해 둔다 */
  if(kind==='staff'){try{sessionStorage.setItem('staffCode',code);}catch(e){}}
  return true;
}
/* 게이트를 쓸 수 있는 상태로 (로그인 세션이 없을 때만 보인다) */
function gateReady(){
  const g=gateEl();if(!g)return;
  const lg=$('gateLogo'),tb=document.querySelector('.topbar .logo .mark');
  if(lg&&tb)lg.src=tb.src;
  const hint=$('gateHint');
  if(hint)hint.innerHTML=`코드는 두 가지입니다 — <b>운영진 코드</b>는 데이터 수정까지, `
    +`<b>뷰어 코드</b>는 대시보드 열람과 엑셀 다운로드만 됩니다.`
    +`<br>둘러보기용 샘플 코드 <code>${SAMPLE_CODE}</code> (시행사 화면) · `
    +`<code>${SAMPLE_VIEW_CODE}</code> (광고주 화면)`;
  const inp=$('gateCode');
  if(inp){
    inp.oninput=e=>{const p=e.target.selectionStart;e.target.value=normCode(e.target.value);
      gateMsg('');if(p>=e.target.value.length)e.target.setSelectionRange(99,99);};
    inp.onkeydown=e=>{if(e.key==='Enter')tryCode(inp.value);};
    setTimeout(()=>inp.focus(),120);}
  const go=$('gateGo');if(go)go.onclick=()=>tryCode($('gateCode').value);
  const sm=$('gateSample');if(sm)sm.onclick=enterSample;
  const li=$('gateLogin');if(li)li.onclick=()=>{
    if(!CLOUD.on){gateMsg('클라우드가 설정되지 않아 지금은 샘플만 볼 수 있습니다.');return;}
    signInGoogle();};
  const qs=new URLSearchParams(location.search);
  /* 내려받은 파일을 그대로 열어 볼 때(file:// · localhost)는 ?nogate=1 로 건너뛸 수 있다.
     게시된 주소에서는 동작하지 않는다. */
  const local=location.protocol==='file:'||/^(localhost|127\.|\[::1\])/.test(location.hostname);
  if(local&&qs.has('nogate')){
    hideGate();
    /* 새로고침해도 입력한 값이 남아 있게 — 이 브라우저에 적어 둔 마지막 상태를 되살린다 */
    setTimeout(()=>{try{loadLocal();}catch(e){}},0);
    return;}
  /* 주소에 ?code=XXXX 가 있으면 바로 열어 준다 */
  const q=qs.get('code');
  if(q){if(inp)inp.value=normCode(q);tryCode(q);}
}

/* 로고를 누르면 첫 화면(접속 화면)으로 — 저장하지 않은 내용이 있으면 한 번 묻는다 */
function goHome(){
  const home=()=>{location.href=location.pathname;};
  if(CLOUD.shareView&&!CLOUD.user){home();return;}     /* 조회 전용은 잃을 게 없다 */
  confirmModal('첫 화면으로 돌아갈까요?',
    '저장하지 않은 내용은 사라집니다. 먼저 ☁ 저장을 눌러 주세요.',home,'첫 화면으로');
}
(function wireLogo(){
  const go=()=>{const l=document.querySelector('.topbar .logo');
    if(l){l.title='첫 화면으로';l.onclick=goHome;}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();

/* ---------- 세션 ---------- */
async function cloudInit(){
  const CFG=cfgOf();
  if(window.__offline||window.__noSupabase||window.__noConfig||!CFG||!CFG.url||!CFG.anonKey
     ||typeof supabase==='undefined'||!supabase.createClient){
    cloudState('데모 모드 · 클라우드 미설정');gateReady();return;}
  CLOUD.sb=supabase.createClient(CFG.url,CFG.anonKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  CLOUD.on=true;
  CLOUD.sb.auth.onAuthStateChange((_e,session)=>{
    const u=session?.user||null;
    if(u&&(!CLOUD.user||CLOUD.user.id!==u.id)){CLOUD.user=u;afterSignIn();}
    else if(!u&&CLOUD.user){CLOUD.user=null;paintAuth();cloudState('로그아웃됨 · 데모 모드');}});
  const {data}=await CLOUD.sb.auth.getSession();
  if(data?.session?.user){CLOUD.user=data.session.user;hideGate();await afterSignIn();}
  else{paintAuth();cloudState('로그인하면 내 캠페인이 열립니다');gateReady();}
}
async function signInGoogle(){
  if(!CLOUD.on){alert('클라우드가 설정되지 않았습니다. config.js 의 Supabase URL / anon key 를 확인해 주세요.');return;}
  await CLOUD.sb.auth.signInWithOAuth({provider:'google',
    options:{redirectTo:location.href.split('#')[0].split('?')[0],
             queryParams:{prompt:'select_account'}}});
}
async function signOutCloud(){
  if(!CLOUD.on)return;
  await CLOUD.sb.auth.signOut();
  CLOUD.user=null;CLOUD.campaign=null;CLOUD.role=null;CLOUD.list=[];
  CLOUD.shareView=false;CLOUD.sample=false;CLOUD.shareRole=null;CLOUD.appRole='guest';
  paintAuth();paintCampSel();cloudState('로그아웃됨');
  const g=gateEl();if(g)g.classList.remove('hidden');
  gateReady();
}
async function afterSignIn(){
  const u=CLOUD.user;
  CLOUD.shareView=false;CLOUD.sample=false;CLOUD.shareRole=null;hideGate();
  /* 프로필 upsert — 트리거가 없어도 이름/이메일이 채워지도록 */
  await CLOUD.sb.from('profiles').upsert({
    id:u.id,email:u.email,
    name:u.user_metadata?.full_name||u.user_metadata?.name||u.email,
    avatar_url:u.user_metadata?.avatar_url||null},{onConflict:'id'});
  /* 가입 후에 받은 초대도 로그인 시점에 자동으로 수락된다 */
  try{await CLOUD.sb.rpc('accept_my_invites');}catch(err){}
  /* 운영진 코드로 들어와 있던 사람이 로그인하면 그 캠페인의 정식 운영진이 된다 */
  try{const sc=sessionStorage.getItem('staffCode');
    if(sc){await CLOUD.sb.rpc('join_by_staff_code',{p_code:sc});sessionStorage.removeItem('staffCode');}
  }catch(err){}
  /* 계정 등급 (슈퍼마스터 / 마스터 / 게스트) */
  try{const {data}=await CLOUD.sb.from('profiles').select('app_role').eq('id',u.id).maybeSingle();
    CLOUD.appRole=data?.app_role||'guest';}catch(err){CLOUD.appRole='guest';}
  paintAuth();
  applyRoleLock();
  await loadCampaignList();
  /* 아직 등급이 없고 참여 중인 캠페인도 없으면 권한을 요청하도록 안내 */
  if(CLOUD.appRole==='guest'&&!CLOUD.list.length)openAccessRequest();
}
/* ---------- 마스터 권한 요청 (게스트 → 슈퍼마스터에게) ---------- */
async function openAccessRequest(){
  if(!CLOUD.on||!CLOUD.user)return;
  let prev=null;
  try{const {data}=await CLOUD.sb.from('access_requests')
    .select('status,message,created_at').eq('user_id',CLOUD.user.id)
    .order('created_at',{ascending:false}).limit(1);
    prev=data&&data[0];}catch(err){}
  if(prev&&prev.status==='pending'){
    confirmModal('권한 요청이 접수되어 있습니다.',
      `보내신 메시지 — “${prev.message||'(내용 없음)'}”\n승인되면 캠페인을 만들 수 있습니다.`,
      ()=>{},'확인');return;}
  openModal('캠페인 권한 요청',
    `<div class="notice" style="margin-bottom:12px"><span>ⓘ</span><div>
       이 계정에는 아직 <b>캠페인을 만들 권한</b>이 없습니다.
       아래에 <b>소속과 용도</b>를 적어 보내 주시면 확인 후 <b>마스터 권한</b>을 드립니다.<br>
       특정 캠페인만 보시는 분은 요청 대신 시행사에서 <b>운영진 코드</b> 또는 <b>뷰어 코드</b>를 받으시면 됩니다.</div></div>
     <div class="fld"><label>소속 · 이름</label>
       <input id="arOrg" placeholder="예: 미디어웍스 / 윤석진" style="width:100%"></div>
     <div class="fld" style="margin-top:10px"><label>요청 메시지</label>
       <textarea id="arMsg" rows="4" placeholder="예: 하반기 브랜드 캠페인 운영을 맡고 있어 캠페인 생성 권한이 필요합니다."
         style="width:100%;resize:vertical"></textarea></div>
     <div class="hint" id="arMsgOut" style="margin-top:8px">보낸 요청은 슈퍼마스터 화면에 그대로 표시됩니다.</div>`,
    '<button class="btn" data-close>나중에</button><button class="btn primary" id="arGo">요청 보내기</button>',{w:620});
  $('arGo').onclick=async()=>{
    const org=($('arOrg').value||'').trim(),msg=($('arMsg').value||'').trim();
    if(!msg){$('arMsgOut').textContent='요청 메시지를 적어 주세요.';return;}
    if(org){try{await CLOUD.sb.from('profiles').update({org}).eq('id',CLOUD.user.id);}catch(err){}}
    const {error}=await CLOUD.sb.rpc('request_access',{p_message:(org?org+' — ':'')+msg});
    if(error){$('arMsgOut').textContent='보내지 못했습니다: '+error.message;return;}
    closeModal();
    confirmModal('요청을 보냈습니다.','승인되면 캠페인을 만들 수 있습니다. 잠시만 기다려 주세요.',()=>{},'확인');};
}
/* ---------- 슈퍼마스터 · 계정 관리 ---------- */
async function openAccounts(){
  if(!CLOUD.on||!CLOUD.user||CLOUD.appRole!=='super'){
    confirmModal('슈퍼마스터만 열 수 있습니다.','계정 등급 관리는 슈퍼마스터 계정에서만 가능합니다.',()=>{},'확인');return;}
  const [{data:reqs},{data:accs}]=await Promise.all([
    CLOUD.sb.from('access_requests').select('*').order('created_at',{ascending:false}),
    CLOUD.sb.rpc('list_accounts')]);
  const pend=(reqs||[]).filter(r=>r.status==='pending');
  let h=`<div class="notice" style="margin-bottom:12px"><span>ⓘ</span><div>
      <b>슈퍼마스터</b>만 마스터 권한을 주거나 뺏을 수 있습니다.
      마스터는 <b>본인이 만든 캠페인만</b> 보고 관리하며, 다른 사람에게 마스터 권한을 줄 수 없습니다.</div></div>`;
  h+=`<div style="font-weight:700;margin:4px 0 8px">권한 요청 <span class="cnt2">${pend.length}건 대기</span></div>`;
  if(!pend.length)h+='<div class="card" style="padding:16px;text-align:center;color:var(--muted)">대기 중인 요청이 없습니다.</div>';
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:150px">이름</th><th style="width:200px">이메일</th><th>요청 메시지</th>
      <th style="width:110px">보낸 날</th><th style="width:150px"></th></tr></thead><tbody>`;
    pend.forEach(r=>{h+=`<tr><td>${esc(r.name||'–')}</td><td>${esc(r.email||'–')}</td>
      <td style="text-align:left">${esc(r.message||'–')}</td>
      <td class="mono">${(r.created_at||'').slice(0,10)}</td>
      <td><button class="btn sm primary" data-ok="${r.id}">마스터 승인</button>
        <button class="btn sm danger" data-no="${r.id}">거절</button></td></tr>`;});
    h+='</tbody></table>';}
  h+=`<div style="font-weight:700;margin:18px 0 8px">계정 목록</div>
    <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:150px">이름</th><th style="width:210px">이메일</th><th style="width:150px">소속</th>
      <th style="width:110px">등급</th><th style="width:90px">캠페인</th>
      <th style="width:130px"></th></tr></thead><tbody>`;
  (accs||[]).forEach(a=>{
    const me=a.id===CLOUD.user.id;
    h+=`<tr><td>${esc(a.name||'–')}</td><td>${esc(a.email||'–')}</td><td>${esc(a.org||'–')}</td>
      <td><span class="tagchip ${a.app_role==='guest'?'':'on'}">${APP_ROLE_LABEL[a.app_role]||a.app_role}</span></td>
      <td class="mono">${a.campaigns||0}</td>
      <td>${a.app_role==='super'||me?'<span class="hint">–</span>'
        :a.app_role==='master'
          ?`<button class="btn sm danger" data-drop="${a.id}">마스터 해제</button>`
          :`<button class="btn sm" data-up="${a.id}">마스터 부여</button>`}</td></tr>`;});
  h+='</tbody></table>';
  openModal('계정 · 등급 관리 (슈퍼마스터)',h,'<button class="btn" data-close>닫기</button>',{w:1060});
  const host=$('modalHost'),again=()=>{closeModal();openAccounts();};
  host.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('decide_access',{p_request:b.dataset.ok,p_approve:true});again();});
  host.querySelectorAll('[data-no]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('decide_access',{p_request:b.dataset.no,p_approve:false});again();});
  host.querySelectorAll('[data-up]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('set_app_role',{p_user:b.dataset.up,p_role:'master'});again();});
  host.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>
    confirmModal('마스터 권한을 해제할까요?','이 계정은 더 이상 캠페인을 만들 수 없습니다. 이미 만든 캠페인은 남습니다.',
      async()=>{await CLOUD.sb.rpc('set_app_role',{p_user:b.dataset.drop,p_role:'guest'});again();},'해제'));
}
function paintAuth(){
  const u=CLOUD.user;
  const av=$('meAvatar'),si=$('signIn'),bar=$('demoBar');
  const mail=$('meMail'),nameEl=$('meName'),sub=$('meSub'),wrap=$('meWrap'),menu=$('meMenu');
  if(u){
    const nm=u.user_metadata?.full_name||u.email||'';
    av.textContent=(nm[0]||'U').toUpperCase();
    if(mail)mail.textContent=u.email||nm;
    if(nameEl)nameEl.textContent=nm;
    if(sub)sub.textContent=`${u.email||''} · ${APP_ROLE_LABEL[CLOUD.appRole]||'게스트'}`;
    si.classList.add('hidden');
    if(wrap)wrap.classList.remove('hidden');
    if(bar)bar.classList.add('hidden');
  }else{
    av.textContent='GU';
    if(mail)mail.textContent='게스트';
    if(nameEl)nameEl.textContent='게스트';
    if(sub)sub.textContent='로그인하지 않음';
    si.classList.remove('hidden');
    /* 로그인하지 않았으면 계정 버튼(=로그아웃 메뉴)은 숨긴다 */
    if(wrap)wrap.classList.add('hidden');
    if(bar&&!sessionStorage.getItem('demoBarHidden'))bar.classList.remove('hidden');}
  if(menu)menu.classList.add('hidden');
  if(typeof applyRoleLock==='function')applyRoleLock();
}

/* ---------- 캠페인 목록 · 열기 ---------- */
async function loadCampaignList(listOnly){
  /* RLS 가 내가 멤버인 캠페인만 돌려준다 (할당받은 캠페인만 보이는 구조) */
  const {data,error}=await CLOUD.sb.from('campaigns')
    .select('id,name,advertiser,start_date,end_date,updated_at,share_code,staff_code,created_by')
    .order('updated_at',{ascending:false});
  if(error){cloudState('목록을 불러오지 못했습니다: '+error.message);return;}
  CLOUD.list=data||[];
  paintCampSel();
  if(listOnly)return;
  if(CLOUD.list.length)await openCampaign(CLOUD.list[0].id);
  else{
    /* 로그인은 했는데 캠페인이 없다 → 데모 데이터를 계속 보여 주면
       그대로 저장돼 버리므로 빈 캠페인으로 비운다 */
    resetToBlank('새 캠페인','');
    cloudState('캠페인이 없습니다 · ＋ 새 캠페인으로 시작하세요');}
}
function paintCampSel(){
  const s=$('campSel');if(!s)return;
  if(!CLOUD.user){
    s.innerHTML=`<option>${esc(CAMPAIGN.name)} (데모)</option>`;return;}
  s.innerHTML=CLOUD.list.map(c=>
    `<option value="${c.id}"${CLOUD.campaign&&CLOUD.campaign.id===c.id?' selected':''}>${esc(c.name)}</option>`).join('')
    ||'<option value="">캠페인 없음</option>';
}
async function openCampaign(id){
  if(!CLOUD.on||!id)return;
  CLOUD.busy=true;cloudState('불러오는 중…');
  const {data:c,error}=await CLOUD.sb.from('campaigns').select('*').eq('id',id).single();
  if(error){CLOUD.busy=false;cloudState('열지 못했습니다: '+error.message);return;}
  CLOUD.campaign=c;
  const {data:mem}=await CLOUD.sb.from('campaign_members')
    .select('role').eq('campaign_id',id).eq('user_id',CLOUD.user.id).maybeSingle();
  CLOUD.role=mem?.role||'viewer';
  clearWorkState();
  applyDoc(c.doc);
  rebuildPeriod();resetDateFilter();
  const {data:rows}=await CLOUD.sb.from('daily_stats')
    .select('stat_date,line_key,imp,click,view,eng,conv,lead,install,rev,net,extra')
    .eq('campaign_id',id);
  applyDaily(rows);
  /* 저장해 둔 입력 시트가 있으면 그걸로 일별 실적을 다시 채운다 (시트가 원본) */
  try{if(Array.isArray(c.doc&&c.doc.sheet)&&c.doc.sheet.length&&typeof applySheet==='function')applySheet();}catch(e){}
  CREATIVES.forEach(c2=>{const cs=CREATIVES.filter(x=>x.lid===c2.lid);
    if(!c2.run)c2.run=[[0,Math.max(TOTAL_DAYS-1,0)]];
    if(!isFinite(c2.share))c2.share=1/Math.max(cs.length,1);});
  buildFacts();
  buildFilters();buildSelects();
  renderAll();renderSheet();renderIssues();renderKpiTable();renderIssueAlert();
  renderRaw();renderCreatives();renderGantt();
  paintCampSel();
  applyRoleLock();
  CLOUD.busy=false;
  clearLocal();
  cloudState(`${c.name} · ${ROLE_LABEL[CLOUD.role]||CLOUD.role} · 저장됨`);
}
const ROLE_LABEL={master:'마스터',editor:'운영진',viewer:'광고주'};
/* 조회 권한이면 편집 화면을 잠근다 (광고주 모드와 동일한 처리) */
function applyRoleLock(){
  if(typeof applyRole==='function')applyRole();
  if(typeof window.__cmtLock==='function')window.__cmtLock();
  /* 로그인해 있으면 더미 배지를 감춘다 */
  const mk=$('mockBadge');
  if(mk)mk.classList.toggle('hidden',!!(CLOUD.on&&CLOUD.user));
}

/* ---------- 저장 ---------- */
async function cloudSave(silent){
  if(!CLOUD.on||!CLOUD.user){
    if(!silent)confirmModal('데모 모드입니다.','구글 로그인을 하면 이 캠페인을 클라우드에 저장할 수 있습니다.',
      ()=>signInGoogle(),'구글 로그인');
    return;}
  if(!CLOUD.campaign){if(!silent)await createCampaign();return;}
  if(CLOUD.role==='viewer'){cloudState('조회 권한이라 저장할 수 없습니다');return;}
  cloudState('저장 중…');
  const doc=serializeDoc();
  /* .select() 를 붙여 실제로 몇 행이 바뀌었는지 확인한다.
     권한이 없으면 RLS 가 오류 대신 "0행 수정"으로 조용히 넘어가기 때문. */
  const {data:upd,error}=await CLOUD.sb.from('campaigns').update({
    name:CAMPAIGN.name,advertiser:CAMPAIGN.advertiser,
    start_date:campStart(),end_date:campEnd(),
    doc,updated_at:new Date().toISOString(),updated_by:CLOUD.user.id
  }).eq('id',CLOUD.campaign.id).select('id');
  if(error){cloudState('저장 실패: '+error.message);return;}
  if(!upd||!upd.length){cloudState('저장 권한이 없습니다 (조회 전용)');return;}
  /* 일별 실적은 입력 시트가 원본이라 늘 통째로 다시 쓴다.
     (예전에는 upsert 만 했는데, 같은 라인·같은 날짜가 두 줄이면
      "ON CONFLICT DO UPDATE command cannot affect row a second time" 로 저장이 실패했다.
      지금은 sheetToRows() 가 날짜×라인으로 합쳐 한 줄만 만들고, 옛 행은 먼저 지운다.
      설정 문서(doc)에 시트가 이미 저장된 뒤라 중간에 실패해도 입력값은 남는다.) */
  const rows=sheetToRows();
  const {error:eDel}=await CLOUD.sb.from('daily_stats').delete().eq('campaign_id',CLOUD.campaign.id);
  if(eDel){cloudState('일별 실적 정리 실패: '+eDel.message);return;}
  for(let i=0;i<rows.length;i+=500){
    const {error:e2}=await CLOUD.sb.from('daily_stats').insert(rows.slice(i,i+500));
    if(e2){cloudState('일별 실적 저장 실패: '+e2.message);return;}}
  await CLOUD.sb.from('campaign_history').insert({
    campaign_id:CLOUD.campaign.id,kind:'setup',doc,note:'저장',created_by:CLOUD.user.id});
  CLOUD.savedAt=new Date();
  CLOUD.dirty=false;
  paintSaved();
}
/* ---------- 자동 저장 · "00분 전에 저장됨" ----------
   저장 버튼을 누르지 않아도 알아서 저장한다.
   · 값이 바뀌면 20초 뒤(추가 변경이 있으면 다시 20초 뒤)에 조용히 저장
   · 그와 별개로 최소 60초에 한 번만 실제로 올려 서버를 두드리지 않는다
   · 마지막 저장 시각은 상단 ☁ 저장 버튼 왼쪽에 "n분 전 저장" 으로 계속 보인다 */
const AUTO_SAVE_MS=60*1000;      /* 실제 저장 최소 간격 */
const DIRTY_WAIT_MS=20*1000;     /* 마지막 변경 후 기다리는 시간 */
function paintSaved(){
  const chip=$('savedAgo');
  if(!chip)return;
  if(!CLOUD.on||!CLOUD.user||!CLOUD.campaign){chip.textContent='';chip.classList.remove('on');return;}
  if(!CLOUD.savedAt){chip.textContent=CLOUD.dirty?'저장 대기 중':'';chip.classList.remove('on');return;}
  const m=Math.floor((Date.now()-CLOUD.savedAt.getTime())/60000);
  const t=CLOUD.savedAt;
  const hhmm=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  chip.classList.add('on');
  chip.textContent=CLOUD.dirty?'변경됨 · 곧 저장'
    :m<1?'방금 저장':m<60?`${m}분 전 저장`
    :m<1440?`${Math.floor(m/60)}시간 전 저장`:`${hhmm} 저장`;
  chip.title=`마지막 자동 저장 ${dFull(t)} ${hhmm} · 저장 버튼을 누르지 않아도 자동으로 저장됩니다`;
}
/* 화면에 바뀐 내용이 생기면 표시해 둔다 (자동 저장 대상) */
let DIRTY_T=null;
function markDirty(){
  CLOUD.dirty=true;CLOUD.dirtyAt=Date.now();
  paintSaved();
  clearTimeout(DIRTY_T);
  DIRTY_T=setTimeout(tryAutoSave,DIRTY_WAIT_MS);
}
function tryAutoSave(){
  if(!CLOUD.on||!CLOUD.user||!CLOUD.campaign||CLOUD.role==='viewer')return;
  if(!CLOUD.dirty||CLOUD.busy)return;
  if(CLOUD.savedAt&&Date.now()-CLOUD.savedAt.getTime()<AUTO_SAVE_MS){
    clearTimeout(DIRTY_T);
    DIRTY_T=setTimeout(tryAutoSave,AUTO_SAVE_MS-(Date.now()-CLOUD.savedAt.getTime())+500);
    return;}
  CLOUD.dirty=false;cloudSave(true).then(paintSaved,paintSaved);
}
(function autoSave(){
  setInterval(()=>{paintSaved();tryAutoSave();},15000);
  /* 탭을 벗어나거나 창을 닫기 직전에도 한 번 */
  addEventListener('visibilitychange',()=>{if(document.hidden)tryAutoSave();});
})();
/* 빈 캠페인으로 초기화 — 새 캠페인이 데모 데이터를 그대로 안고 저장되던 문제를 막는다 */
/* 캠페인을 옮겨 다닐 때 앞 캠페인의 값이 남지 않도록 화면 상태를 통째로 비운다 */
function clearWorkState(){
  if(typeof SHEET!=='undefined')SHEET.length=0;
  if(typeof SHEET_HIST!=='undefined')SHEET_HIST.length=0;
  if(typeof LINE_HIST!=='undefined')LINE_HIST.length=0;
  if(typeof CAMP_HIST!=='undefined')CAMP_HIST.length=0;
  try{HIDDEN.clear();}catch(e){}
  try{DIRTY_AT=null;}catch(e){}
  try{LINE_DIRTY=null;}catch(e){}
}
function resetToBlank(name,advertiser){
  CAMPAIGN.name=name||'새 캠페인';
  CAMPAIGN.advertiser=advertiser||'';
  LINES=[];CREATIVES=[];ISSUES=[];
  clearWorkState();
  rebuildPeriod();buildFacts();
  buildFilters();buildSelects();
  renderAll();renderSheet();renderIssues();renderKpiTable();renderIssueAlert();
  renderRaw();renderCreatives();renderGantt();renderTreemap();
}
async function createCampaign(){
  if(!CLOUD.on||!CLOUD.user){signInGoogle();return;}
  /* ① 광고주를 먼저 고르고 ② 캠페인 이름을 정한다 */
  const st={logo:''};
  openModal('새 캠페인',
    `<div class="hint" style="margin-bottom:10px"><b>①</b> 광고주를 먼저 고르고 <b>②</b> 캠페인 이름을 정합니다.
       로고를 등록하면 이 광고주의 대시보드 왼쪽 위에 로고와 광고주명이 함께 보입니다.</div>
     <div class="form-row">${advPickerHTML('',''  )}</div>
     <div class="form-row" style="margin-top:6px">
       <div class="fld" style="flex:1;min-width:260px"><label>캠페인명</label>
         <input id="ncName" placeholder="예: 2026 하반기 브랜드 캠페인"></div>
     </div>
     <label class="tagchip" style="margin-top:12px;cursor:pointer">
       <input type="checkbox" id="ncDemo"> 지금 화면의 내용을 그대로 복사해서 시작
     </label>
     <div class="hint" style="margin-top:8px">체크하지 않으면 <b>빈 캠페인</b>으로 시작합니다.
       (예상 효율 · 일별 실적 없음)</div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="ncGo">만들기</button>',{w:660});
  const readAdv=wireAdvPicker(st);
  $('ncGo').onclick=async()=>{
    const av=readAdv();
    if(!av.name){confirmModal('광고주를 골라 주세요.','기존 광고주를 고르거나 새 광고주명을 적어 주세요.',()=>{},'확인');return;}
    const name=($('ncName').value||'').trim()||'새 캠페인';
    const adv=av.name;
    const copy=$('ncDemo').checked;
    ADV_BOOK[adv]=ADV_BOOK[adv]||{};ADV_BOOK[adv].logo=av.logo||'';saveAdvBook();
    closeModal();
    cloudState('만드는 중…');
    if(!copy)resetToBlank(name,adv);
    else{CAMPAIGN.name=name;CAMPAIGN.advertiser=adv;renderCampForm();renderCampBar();}
    CAMPAIGN.advLogo=av.logo||'';renderBrand();
    const {data,error}=await CLOUD.sb.from('campaigns').insert({
      name,advertiser:adv,start_date:campStart(),end_date:campEnd(),
      doc:serializeDoc(),created_by:CLOUD.user.id,updated_by:CLOUD.user.id
    }).select().single();
    if(error){cloudState('생성 실패: '+error.message);return;}
    /* 만든 사람을 마스터로 넣는 일은 DB 트리거(campaigns_add_owner)가 처리한다 */
    await loadCampaignList();
    await openCampaign(data.id);};
}
/* ---------- 캠페인 관리 (이름 변경 · 복제 · 삭제) ---------- */
async function openCampManage(){
  if(!CLOUD.on||!CLOUD.user){
    confirmModal('구글 로그인이 필요합니다.','로그인하면 내가 할당받은 캠페인만 목록에 나옵니다.',
      ()=>signInGoogle(),'구글 로그인');return;}
  await loadCampaignList(true);
  const rows=CLOUD.list;
  let h=`<div class="hint" style="margin-bottom:10px">내가 <b>만들었거나 초대받은</b> 캠페인만 보입니다.
      이름 변경 · 복제 · 삭제는 <b>마스터</b> 권한이 있는 캠페인에서만 됩니다.<br>
      캠페인마다 <b>코드 두 개</b>가 자동으로 붙습니다 —
      <b>운영진 코드</b>는 그 캠페인의 데이터를 수정·추가할 수 있고,
      <b>뷰어 코드</b>는 대시보드 열람과 엑셀 다운로드만 됩니다.
      코드 옆 <b>⧉</b>를 누르면 접속 링크가 복사되고, <b>👥 초대</b>로 구글 계정을 직접 초대할 수 있습니다.</div>`;
  if(!rows.length)h+='<div class="card" style="padding:22px;text-align:center">아직 캠페인이 없습니다. 아래 <b>＋ 새 캠페인</b>으로 시작하세요.</div>';
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="min-width:190px">캠페인명</th><th style="min-width:120px">광고주</th>
      <th style="width:160px">기간</th><th style="width:96px">최근 저장</th>
      <th style="width:190px">공유 코드</th>
      <th style="width:300px"></th></tr></thead><tbody>`;
    rows.forEach(c=>{
      const cur=CLOUD.campaign&&CLOUD.campaign.id===c.id;
      h+=`<tr data-cid="${c.id}"${cur?' style="background:var(--acc-soft2)"':''}>
        <td style="text-align:left"><b>${esc(c.name||'(이름 없음)')}</b>${cur?' <span class="cnt2">열려 있음</span>':''}</td>
        <td>${esc(c.advertiser||'–')}</td>
        <td class="mono">${c.start_date||'–'} ~ ${c.end_date||'–'}</td>
        <td class="mono">${(c.updated_at||'').slice(0,10)||'–'}</td>
        <td style="text-align:left">
          <div class="codeline"><span class="ck staff">운영진</span>
            <span class="sharecode">${esc(c.staff_code||'–')}</span>
            <button class="copyb" data-copy="${c.id}" data-kind="staff"
              title="운영진용 접속 링크를 복사합니다">⧉</button></div>
          <div class="codeline"><span class="ck view">뷰어</span>
            <span class="sharecode view">${esc(c.share_code||'–')}</span>
            <button class="copyb" data-copy="${c.id}" data-kind="viewer"
              title="광고주용 접속 링크를 복사합니다">⧉</button></div></td>
        <td class="acts">
          <div class="ln">${cur?'<button class="btn sm" disabled title="지금 열려 있는 캠페인입니다">열기</button>'
              :`<button class="btn sm" data-open="${c.id}">열기</button>`}
            <button class="btn sm" data-inv="${c.id}" title="이 캠페인에 운영진 · 광고주를 초대합니다">👥 운영진 초대</button>
          </div>
          <div class="ln">
            <button class="btn sm" data-ren="${c.id}">이름 변경</button>
            <button class="btn sm" data-dup="${c.id}">캠페인 복제</button>
            <button class="btn sm danger" data-del="${c.id}">캠페인 삭제</button>
          </div></td></tr>`;});
    h+='</tbody></table>';}
  openModal('캠페인 관리',h,
    '<button class="btn primary" id="campNew" title="새 캠페인 만들기">＋ 새 캠페인</button>'
    +'<div class="spacer"></div><button class="btn" data-close>닫기</button>',{w:1140});
  const host=$('modalHost');
  if($('campNew'))$('campNew').onclick=()=>{closeModal();createCampaign();};
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=async()=>{
    closeModal();await openCampaign(b.dataset.open);});
  /* 코드 옆 ⧉ 아이콘 — 접속 링크를 클립보드로 */
  host.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.copy);if(!c)return;
    const kind=b.dataset.kind;
    const code=kind==='staff'?c.staff_code:c.share_code;if(!code)return;
    const url=location.href.split('#')[0].split('?')[0]+'?code='+code;
    if(await copyText(url)){
      b.textContent='✓';b.classList.add('ok');
      setTimeout(()=>{b.textContent='⧉';b.classList.remove('ok');},1400);}
    else prompt(kind==='staff'?'운영진에게 전달할 주소입니다.':'광고주에게 전달할 주소입니다.',url);});
  /* 👥 초대 — 이 캠페인의 운영진 · 광고주 관리 */
  host.querySelectorAll('[data-inv]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.inv);if(!c)return;
    if(!CLOUD.campaign||CLOUD.campaign.id!==c.id){closeModal();await openCampaign(c.id);}
    else closeModal();
    if(typeof openPermCloud==='function')openPermCloud();});
  host.querySelectorAll('[data-ren]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.ren);if(!c)return;
    const nm=prompt('캠페인 이름',c.name||'');if(nm===null)return;
    const adv=prompt('광고주',c.advertiser||'');if(adv===null)return;
    const {data,error}=await CLOUD.sb.from('campaigns')
      .update({name:nm.trim()||c.name,advertiser:(adv||'').trim()}).eq('id',c.id).select('id');
    if(error||!data||!data.length){cloudState('이름을 바꾸지 못했습니다 (권한 확인)');return;}
    if(CLOUD.campaign&&CLOUD.campaign.id===c.id){CAMPAIGN.name=nm.trim()||c.name;
      CAMPAIGN.advertiser=(adv||'').trim();renderCampForm();renderCampBar();}
    await loadCampaignList(true);closeModal();openCampManage();});
  host.querySelectorAll('[data-dup]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.dup);if(!c)return;
    cloudState('복제 중…');
    const {data:src,error:e0}=await CLOUD.sb.from('campaigns').select('*').eq('id',c.id).single();
    if(e0){cloudState('복제 실패: '+e0.message);return;}
    const {data:ins,error}=await CLOUD.sb.from('campaigns').insert({
      name:(src.name||'캠페인')+' 사본',advertiser:src.advertiser||'',
      start_date:src.start_date,end_date:src.end_date,
      doc:src.doc,created_by:CLOUD.user.id,updated_by:CLOUD.user.id}).select().single();
    if(error){cloudState('복제 실패: '+error.message);return;}
    /* 일별 실적도 함께 복사 */
    const {data:rows}=await CLOUD.sb.from('daily_stats').select('*').eq('campaign_id',c.id);
    if(rows&&rows.length){
      const copy=rows.map(r=>{const o={...r};delete o.id;o.campaign_id=ins.id;return o;});
      await CLOUD.sb.from('daily_stats').insert(copy);}
    await loadCampaignList(true);closeModal();openCampManage();
    cloudState('복제 완료');});
  host.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.del);if(!c)return;
    confirmModal(`"${c.name}" 캠페인을 삭제할까요?`,
      '이 캠페인의 설정과 일별 실적이 모두 사라집니다. 되돌릴 수 없습니다.',async()=>{
        const {data,error}=await CLOUD.sb.from('campaigns').delete().eq('id',c.id).select('id');
        if(error||!data||!data.length){cloudState('삭제하지 못했습니다 (마스터 권한 필요)');return;}
        if(CLOUD.campaign&&CLOUD.campaign.id===c.id){CLOUD.campaign=null;CLOUD.role=null;}
        await loadCampaignList(true);
        if(!CLOUD.list.length)resetToBlank('새 캠페인','');
        else await openCampaign(CLOUD.list[0].id);
        closeModal();openCampManage();},'삭제');});
}

/* ---------- 권한 · 초대 (계정 · 권한 팝업) ---------- */
async function cloudMembers(){
  if(!CLOUD.on||!CLOUD.user||!CLOUD.campaign)return null;
  const {data}=await CLOUD.sb.from('campaign_members')
    .select('role,user_id,profiles(name,email,org)').eq('campaign_id',CLOUD.campaign.id);
  const {data:inv}=await CLOUD.sb.from('campaign_invites')
    .select('id,email,role,accepted_at').eq('campaign_id',CLOUD.campaign.id).is('accepted_at',null);
  return {members:data||[],invites:inv||[]};
}
async function inviteMember(email,role){
  if(!CLOUD.campaign)return '캠페인을 먼저 여세요.';
  if(CLOUD.role!=='master')return '마스터 권한만 초대할 수 있습니다.';
  const {error}=await CLOUD.sb.from('campaign_invites').insert({
    campaign_id:CLOUD.campaign.id,email:email.trim().toLowerCase(),role,invited_by:CLOUD.user.id});
  return error?error.message:null;
}
async function setMemberRole(userId,role){
  if(CLOUD.role!=='master')return '마스터 권한만 변경할 수 있습니다.';
  const {error}=await CLOUD.sb.from('campaign_members')
    .update({role}).eq('campaign_id',CLOUD.campaign.id).eq('user_id',userId);
  return error?error.message:null;
}
async function removeMember(userId){
  if(CLOUD.role!=='master')return '마스터 권한만 삭제할 수 있습니다.';
  const {error}=await CLOUD.sb.from('campaign_members')
    .delete().eq('campaign_id',CLOUD.campaign.id).eq('user_id',userId);
  return error?error.message:null;
}

/* ---------- 배선 ---------- */
(function wireCloud(){
  const b=id=>$(id);
  if(b('signIn'))b('signIn').onclick=signInGoogle;
  if(b('signOut'))b('signOut').onclick=signOutCloud;
  /* 계정 버튼 — 누르면 로그아웃 메뉴 열기/닫기 */
  if(b('meBtn'))b('meBtn').onclick=e=>{e.stopPropagation();
    $('meMenu').classList.toggle('hidden');};
  document.addEventListener('click',e=>{
    const m=$('meMenu');
    if(m&&!m.classList.contains('hidden')&&!e.target.closest('#meWrap'))m.classList.add('hidden');});
  if(b('cloudSave'))b('cloudSave').onclick=()=>cloudSave(false);
  if(b('campMng'))b('campMng').onclick=openCampManage;
  /* 계정 관리 — 구글 계정 메뉴 안에서 연다 */
  if(b('acctBtn'))b('acctBtn').onclick=e=>{e.stopPropagation();
    $('meMenu').classList.add('hidden');openAccounts();};
  if(b('reqBtn'))b('reqBtn').onclick=()=>{
    if(CLOUD.user){openAccessRequest();return;}
    confirmModal('먼저 구글 로그인이 필요합니다.',
      '어떤 계정에 권한을 드릴지 확인해야 하기 때문입니다. 로그인한 뒤 소속과 용도를 적어 보내 주세요.',
      ()=>{if(CLOUD.on)signInGoogle();
        else confirmModal('지금은 샘플 화면입니다.',
          '실제 사이트에 올린 뒤에는 이 버튼으로 바로 권한을 요청할 수 있습니다.',()=>{},'확인');},
      '구글 로그인');};
  if(b('campSel'))b('campSel').onchange=e=>{if(e.target.value)openCampaign(e.target.value);};
  if(b('demoHide'))b('demoHide').onclick=()=>{
    b('demoBar').classList.add('hidden');
    try{sessionStorage.setItem('demoBarHidden','1');}catch(err){}};
  paintCampSel();paintAuth();
  cloudReady(cloudInit);
  /* 저장 버튼들과 함께 클라우드에도 반영 */
  const chain=(id,fn)=>{const el2=$(id);if(!el2)return;const prev=el2.onclick;
    el2.onclick=async e=>{if(prev)await prev.call(el2,e);if(CLOUD.on&&CLOUD.user)cloudSave(true);};};
  /* 저장 버튼은 ☁ 저장 하나로 통일했다 */
  /* 화면에서 값을 바꾸면 자동 저장 대상으로 표시한다 */
  ['input','change'].forEach(ev=>document.addEventListener(ev,e=>{
    if(e.target.closest('#gate,#modalHost'))return;markDirty();},true));
})();
