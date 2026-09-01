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
    views:{summaries:SUMMARIES,mix:MIX_CFG,raw:RAW_CFG,rawSeg:RAW_SEG,rawHSeg:RAW_HSEG,
           gantt:GANTT,creative:CR_CFG,stat:STAT_CFG,bub:BUB,bubColors:BUB_COLORS}
  };
}
function applyDoc(d){
  if(!d||!d.lines)return;
  CAMPAIGN.name=d.campaign?.name||CAMPAIGN.name;
  CAMPAIGN.advertiser=d.campaign?.advertiser||'';
  if(d.campaign?.today)CAMPAIGN.today=d.campaign.today;
  LINES=d.lines.map(l=>({...l,daily:{}}));
  migrateBudget(LINES);            /* 예전 net 기준 저장본을 Gross 기준으로 */
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
  if(v.rawHSeg)RAW_HSEG=v.rawHSeg;
  if(v.gantt)GANTT=v.gantt;
  if(v.creative)CR_CFG=v.creative;
  if(v.stat)STAT_CFG=v.stat;
  if(v.bub)BUB=v.bub;
  if(v.bubColors)BUB_COLORS=v.bubColors;
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
  applyRoleLock();
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
  if(typeof applyRoleLock==='function')applyRoleLock();
}

/* ---------- 캠페인 목록 · 열기 ---------- */
async function loadCampaignList(listOnly){
  /* RLS 가 내가 멤버인 캠페인만 돌려준다 (할당받은 캠페인만 보이는 구조) */
  const {data,error}=await CLOUD.sb.from('campaigns')
    .select('id,name,advertiser,start_date,end_date,updated_at')
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
/* 빈 캠페인으로 초기화 — 새 캠페인이 데모 데이터를 그대로 안고 저장되던 문제를 막는다 */
function resetToBlank(name,advertiser){
  CAMPAIGN.name=name||'새 캠페인';
  CAMPAIGN.advertiser=advertiser||'';
  LINES=[];CREATIVES=[];ISSUES=[];
  if(typeof SHEET!=='undefined')SHEET.length=0;
  rebuildPeriod();buildFacts();
  buildFilters();buildSelects();
  renderAll();renderSheet();renderIssues();renderKpiTable();renderIssueAlert();
  renderRaw();renderCreatives();renderGantt();renderTreemap();
}
async function createCampaign(){
  if(!CLOUD.on||!CLOUD.user){signInGoogle();return;}
  openModal('새 캠페인',
    `<div class="form-row">
       <div class="fld" style="flex:2;min-width:220px"><label>캠페인명</label><input id="ncName" placeholder="예: 2026 하반기 브랜드 캠페인"></div>
       <div class="fld" style="flex:1;min-width:160px"><label>광고주</label><input id="ncAdv" placeholder="예: OO전자"></div>
     </div>
     <label class="tagchip" style="margin-top:12px;cursor:pointer">
       <input type="checkbox" id="ncDemo"> 지금 화면의 내용을 그대로 복사해서 시작
     </label>
     <div class="hint" style="margin-top:8px">체크하지 않으면 <b>빈 캠페인</b>으로 시작합니다.
       (예상 효율 · 일별 실적 없음)</div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="ncGo">만들기</button>',{w:620});
  $('ncGo').onclick=async()=>{
    const name=($('ncName').value||'').trim()||'새 캠페인';
    const adv=($('ncAdv').value||'').trim();
    const copy=$('ncDemo').checked;
    closeModal();
    cloudState('만드는 중…');
    if(!copy)resetToBlank(name,adv);
    else{CAMPAIGN.name=name;CAMPAIGN.advertiser=adv;renderCampForm();renderCampBar();}
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
      이름 변경 · 복제 · 삭제는 <b>마스터</b> 권한이 있는 캠페인에서만 됩니다.</div>`;
  if(!rows.length)h+='<div class="card" style="padding:22px;text-align:center">아직 캠페인이 없습니다. ＋ 새 캠페인으로 시작하세요.</div>';
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="min-width:220px">캠페인명</th><th style="min-width:150px">광고주</th>
      <th style="width:170px">기간</th><th style="width:120px">최근 저장</th>
      <th style="width:230px"></th></tr></thead><tbody>`;
    rows.forEach(c=>{
      const cur=CLOUD.campaign&&CLOUD.campaign.id===c.id;
      h+=`<tr data-cid="${c.id}"${cur?' style="background:var(--acc-soft2)"':''}>
        <td style="text-align:left"><b>${esc(c.name||'(이름 없음)')}</b>${cur?' <span class="cnt2">열려 있음</span>':''}</td>
        <td>${esc(c.advertiser||'–')}</td>
        <td class="mono">${c.start_date||'–'} ~ ${c.end_date||'–'}</td>
        <td class="mono">${(c.updated_at||'').slice(0,10)||'–'}</td>
        <td><button class="btn sm" data-open="${c.id}">열기</button>
          <button class="btn sm" data-ren="${c.id}">이름 변경</button>
          <button class="btn sm" data-dup="${c.id}">복제</button>
          <button class="btn sm danger" data-del="${c.id}">삭제</button></td></tr>`;});
    h+='</tbody></table>';}
  openModal('캠페인 관리',h,'<button class="btn" data-close>닫기</button>',{w:1020});
  const host=$('modalHost');
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=async()=>{
    closeModal();await openCampaign(b.dataset.open);});
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
  if(b('cloudSave'))b('cloudSave').onclick=()=>cloudSave(false);
  if(b('campNew'))b('campNew').onclick=createCampaign;
  if(b('campMng'))b('campMng').onclick=openCampManage;
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
