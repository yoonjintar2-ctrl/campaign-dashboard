/* ===== 11. 클라우드 — 구글 로그인 · 캠페인 저장/불러오기 (Supabase) =====
   config.js 와 supabase-js 가 둘 다 있을 때만 켜진다. 없으면 지금까지처럼 데모(더미) 모드. */
const CLOUD={on:false,sb:null,user:null,campaign:null,role:null,list:[],busy:false};
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
    campaign:{name:CAMPAIGN.name,advertiser:CAMPAIGN.advertiser,today:CAMPAIGN.today},
    lines:LINES.map(l=>{const o={...l};delete o.daily;return o;}),
    creatives:CREATIVES.map(stripCr),
    issues:ISSUES,holidays:HOLIDAYS,bidTypes:BID_TYPES,verdictBand:VERDICT_BAND,
    cols:{line:LINE_COLS,sheet:SHEET_COLS},
    views:{summaries:SUMMARIES,mix:MIX_CFG,raw:RAW_CFG,rawSeg:RAW_SEG,
           gantt:GANTT,creative:CR_CFG,stat:STAT_CFG}
  };
}
function applyDoc(d){
  if(!d||!d.lines)return;
  CAMPAIGN.name=d.campaign?.name||CAMPAIGN.name;
  CAMPAIGN.advertiser=d.campaign?.advertiser||'';
  if(d.campaign?.today)CAMPAIGN.today=d.campaign.today;
  LINES=d.lines.map(l=>({...l,daily:{}}));
  CREATIVES=(d.creatives||[]).map(c=>({...c,daily:{}}));
  if(d.issues)ISSUES=d.issues;
  if(d.holidays)HOLIDAYS=d.holidays;
  if(d.bidTypes)BID_TYPES=d.bidTypes;
  if(isFinite(d.verdictBand))VERDICT_BAND=d.verdictBand;
  if(d.cols?.line)LINE_COLS=d.cols.line;
  if(d.cols?.sheet)SHEET_COLS=d.cols.sheet;
  const v=d.views||{};
  if(v.summaries)SUMMARIES=v.summaries;
  if(v.mix)MIX_CFG=v.mix;
  if(v.raw)RAW_CFG=v.raw;
  if(v.rawSeg)RAW_SEG=v.rawSeg;
  if(v.gantt)GANTT=v.gantt;
  if(v.creative)CR_CFG=v.creative;
  if(v.stat)STAT_CFG=v.stat;
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
function sheetToRows(){
  const out=[];
  SHEET.forEach(r=>{
    const l=rowLine(r);if(!l||!r.date)return;
    const row={campaign_id:CLOUD.campaign.id,stat_date:r.date,line_key:LINE_KEY(l),creative:''};
    const extra={};
    DAILY_COLS.forEach(k=>row[k]=+r[k]||0);
    AMET.forEach(m=>{if(!DAILY_COLS.includes(m))extra[m]=+r[m]||0;});
    /* 사용자가 열 설정에서 새로 만든 열도 함께 보관 */
    SHEET_COLS.forEach(c=>{if(c.type==='num'&&!AMET.includes(c.k)&&!DAILY_COLS.includes(c.k))extra[c.k]=+r[c.k]||0;});
    row.extra=extra;
    out.push(row);});
  return out;
}

/* ---------- 세션 ---------- */
async function cloudInit(){
  const CFG=cfgOf();
  if(window.__offline||window.__noSupabase||window.__noConfig||!CFG||!CFG.url||!CFG.anonKey
     ||typeof supabase==='undefined'||!supabase.createClient){
    cloudState('데모 모드 · 클라우드 미설정');return;}
  CLOUD.sb=supabase.createClient(CFG.url,CFG.anonKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  CLOUD.on=true;
  CLOUD.sb.auth.onAuthStateChange((_e,session)=>{
    const u=session?.user||null;
    if(u&&(!CLOUD.user||CLOUD.user.id!==u.id)){CLOUD.user=u;afterSignIn();}
    else if(!u&&CLOUD.user){CLOUD.user=null;paintAuth();cloudState('로그아웃됨 · 데모 모드');}});
  const {data}=await CLOUD.sb.auth.getSession();
  if(data?.session?.user){CLOUD.user=data.session.user;await afterSignIn();}
  else{paintAuth();cloudState('로그인하면 내 캠페인이 열립니다');}
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
  paintAuth();paintCampSel();cloudState('로그아웃됨 · 데모 모드');
}
async function afterSignIn(){
  const u=CLOUD.user;
  /* 프로필 upsert — 트리거가 없어도 이름/이메일이 채워지도록 */
  await CLOUD.sb.from('profiles').upsert({
    id:u.id,email:u.email,
    name:u.user_metadata?.full_name||u.user_metadata?.name||u.email,
    avatar_url:u.user_metadata?.avatar_url||null},{onConflict:'id'});
  /* 가입 후에 받은 초대도 로그인 시점에 자동으로 수락된다 */
  try{await CLOUD.sb.rpc('accept_my_invites');}catch(err){}
  paintAuth();
  await loadCampaignList();
}
function paintAuth(){
  const u=CLOUD.user;
  const av=$('meAvatar'),si=$('signIn'),so=$('signOut'),bar=$('demoBar');
  if(u){
    const nm=u.user_metadata?.full_name||u.email||'';
    av.textContent=nm.slice(0,2).toUpperCase();av.title=`${nm} · ${u.email}`;
    si.classList.add('hidden');so.classList.remove('hidden');
    if(bar)bar.classList.add('hidden');
  }else{
    av.textContent='GU';av.title='게스트 (데모 모드)';
    si.classList.remove('hidden');so.classList.add('hidden');
    if(bar&&!sessionStorage.getItem('demoBarHidden'))bar.classList.remove('hidden');}
}

/* ---------- 캠페인 목록 · 열기 ---------- */
async function loadCampaignList(){
  const {data,error}=await CLOUD.sb.from('campaigns')
    .select('id,name,advertiser,start_date,end_date,updated_at')
    .order('updated_at',{ascending:false});
  if(error){cloudState('목록을 불러오지 못했습니다: '+error.message);return;}
  CLOUD.list=data||[];
  paintCampSel();
  if(CLOUD.list.length)await openCampaign(CLOUD.list[0].id);
  else cloudState('캠페인이 없습니다 · ＋ 새 캠페인으로 시작하세요');
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
  applyDoc(c.doc);
  rebuildPeriod();
  const {data:rows}=await CLOUD.sb.from('daily_stats')
    .select('stat_date,line_key,imp,click,view,eng,conv,lead,install,rev,net,extra')
    .eq('campaign_id',id);
  applyDaily(rows);
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
  cloudState(`${c.name} · ${ROLE_LABEL[CLOUD.role]||CLOUD.role} · 저장됨`);
}
const ROLE_LABEL={master:'마스터',editor:'편집',viewer:'조회'};
/* 조회 권한이면 편집 화면을 잠근다 (광고주 모드와 동일한 처리) */
function applyRoleLock(){
  const ro=CLOUD.on&&CLOUD.user&&CLOUD.role==='viewer';
  ['cloudSave','campNew'].forEach(k=>{const b=$(k);if(b)b.classList.toggle('hidden',!!ro);});
  document.querySelectorAll('#tabs [data-tab="input"],#tabs [data-tab="setup"]')
    .forEach(b=>b.classList.toggle('hidden',!!ro||isClient()));
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
  const rows=sheetToRows();
  if(rows.length){
    const {error:e2}=await CLOUD.sb.from('daily_stats')
      .upsert(rows,{onConflict:'campaign_id,stat_date,line_key,creative'});
    if(e2){cloudState('일별 실적 저장 실패: '+e2.message);return;}}
  await CLOUD.sb.from('campaign_history').insert({
    campaign_id:CLOUD.campaign.id,kind:'setup',doc,note:'저장',created_by:CLOUD.user.id});
  const t=new Date();
  cloudState(`저장됨 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`);
}
async function createCampaign(){
  if(!CLOUD.on||!CLOUD.user){signInGoogle();return;}
  const name=prompt('새 캠페인 이름','새 캠페인');
  if(!name)return;
  cloudState('만드는 중…');
  const {data,error}=await CLOUD.sb.from('campaigns').insert({
    name,advertiser:'',start_date:campStart(),end_date:campEnd(),
    doc:serializeDoc(),created_by:CLOUD.user.id,updated_by:CLOUD.user.id
  }).select().single();
  if(error){cloudState('생성 실패: '+error.message);return;}
  /* 만든 사람을 마스터로 넣는 일은 DB 트리거(campaigns_add_owner)가 처리한다 */
  await loadCampaignList();
  await openCampaign(data.id);
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
  if(b('cloudSave'))b('cloudSave').onclick=()=>cloudSave(false);
  if(b('campNew'))b('campNew').onclick=createCampaign;
  if(b('campSel'))b('campSel').onchange=e=>{if(e.target.value)openCampaign(e.target.value);};
  if(b('demoHide'))b('demoHide').onclick=()=>{
    b('demoBar').classList.add('hidden');
    try{sessionStorage.setItem('demoBarHidden','1');}catch(err){}};
  paintCampSel();paintAuth();
  cloudReady(cloudInit);
  /* 저장 버튼들과 함께 클라우드에도 반영 */
  const chain=(id,fn)=>{const el2=$(id);if(!el2)return;const prev=el2.onclick;
    el2.onclick=async e=>{if(prev)await prev.call(el2,e);if(CLOUD.on&&CLOUD.user)cloudSave(true);};};
  chain('saveAll');chain('saveLines');chain('saveRows');
})();
