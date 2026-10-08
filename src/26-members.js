
/* ===== 26. 회원 — 이메일 로그인 · 가입 신청 · 회원 관리 · 가입 요청 알림 (v117) =====
   계정 등급(CLOUD.appRole) — super(슈퍼마스터) · master(마스터) · viewer(뷰어) · pending(승인 대기)
   · 로그인 = Supabase 이메일 + 비밀번호. 가입 신청 = auth.signUp → 서버 트리거가 '승인 대기' 프로필을 만든다
   · 승인 · 거절 · 등급 · 뷰어 광고주 · 탈퇴 · 비밀번호 재설정은 서버 함수(supabase/2026-10-08_members_email.sql)가
     권한을 다시 확인한다. 화면에서 버튼을 숨기는 것은 편의일 뿐 — 최종 판정은 서버
   · 마스터끼리는 서로 볼 수만 있다. 마스터 강등 · 탈퇴 · 비밀번호 재설정은 슈퍼마스터만
   ⚠ 이 파일은 09-cloud 보다 뒤에 붙는다 — 09 가 부팅 중에 부르는 것은 전부 function 선언(호이스팅)과 var 로 (함정 10) */

var MB_POLL={t:null,last:null};
var MEMBERS={rows:[],tab:'req',q:'',err:''};
const EMAIL_RX=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isAppMaster(){try{return !!(CLOUD.user&&(CLOUD.appRole==='super'||CLOUD.appRole==='master'));}catch(e){return false;}}
function isAppSuper(){try{return !!(CLOUD.user&&CLOUD.appRole==='super');}catch(e){return false;}}
function appRoleLabel(r){
  return ({super:L('슈퍼마스터','Super master'),master:L('마스터','Master'),viewer:L('뷰어','Viewer'),
    pending:L('승인 대기','Pending'),guest:L('승인 대기','Pending')})[r]||String(r||'');}

/* ---------- 접속 화면 — 로그인 · 가입 신청 · 신청 완료 ---------- */
function gatePane(which,o){
  o=o||{};
  const map={login:'gpLogin',signup:'gpSignup',done:'gpDone'};
  Object.values(map).forEach(id=>{const e=$(id);if(e)e.classList.toggle('hidden',id!==map[which]);});
  if(which==='done'){
    const t=$('gdTitle'),s=$('gdSub'),ic=document.querySelector('#gpDone .gdone');
    if(t)t.textContent=o.title||'';if(s)s.textContent=o.sub||'';
    if(ic){ic.textContent=o.wait?'…':'✓';ic.classList.toggle('wait',!!o.wait);}}
  const f=which==='login'?$('liEmail'):which==='signup'?$('suEmail'):$('gdBack');
  setTimeout(()=>{try{if(f&&!(which==='login'&&$('liEmail').value))f.focus();
    else if(which==='login')$('liPw').focus();}catch(e){}},80);
}
/* 접속 화면을 띄운다 — over=true 면 보던 화면(코드 · 샘플) 위에 겹쳐 띄운 것이라 닫기(✕)를 보여 준다 */
function showGate(which,over){
  const g=$('gate');if(!g)return;
  g.classList.remove('hidden');
  const x=$('gateClose');if(x)x.classList.toggle('hidden',!over);
  gatePane(which||'login');
}
function showGateLogin(){const g=$('gate');showGate('login',!!(g&&g.classList.contains('hidden')));}
function showGateSignup(){const g=$('gate');showGate('signup',!!(g&&g.classList.contains('hidden')));}

/* Supabase 오류 문구 → 한국어 */
function authErrMsg(err){
  const m=String(err&&(err.message||err.msg||err.error_description||err.code)||err||'');
  if(/invalid login credentials|invalid_credentials/i.test(m))return L('이메일 또는 비밀번호가 맞지 않습니다.','Incorrect email or password.');
  if(/email not confirmed/i.test(m))return L('아직 확인되지 않은 계정입니다. 마스터에게 문의해 주세요.','This account is not confirmed yet — please contact a master.');
  if(/already registered|already exists|user_already_exists|already been registered/i.test(m))
    return L('이미 가입했거나 가입 신청한 이메일입니다. 승인 전이면 마스터의 승인을 기다려 주세요.','This email is already registered or has a pending request.');
  if(/password.*(at least|short|characters|length)|weak_password|weak/i.test(m))
    return L('비밀번호가 너무 짧거나 쉽습니다. 8자 이상으로 정해 주세요.','The password is too short or too weak — use at least 8 characters.');
  if(/rate limit|too many|429/i.test(m))return L('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.','Too many requests — please try again shortly.');
  if(/signups? not allowed|signup.*disabled/i.test(m))return L('지금은 가입 신청을 받지 않습니다.','Sign-ups are closed at the moment.');
  if(/sending|smtp|not authorized/i.test(m))
    return L('확인 메일을 보내지 못해 신청이 막혔습니다. 마스터에게 문의해 주세요.','The confirmation email could not be sent — please contact a master.');
  if(/invalid.*email|email.*invalid|validation_failed/i.test(m))return L('이메일 형식을 확인해 주세요.','Check the email address.');
  if(/fetch|network|시간 초과|timeout/i.test(m))return L('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.','Could not reach the server — please try again.');
  return m;}
function gmsg(id,t,ok){const m=$(id);if(!m)return;m.textContent=t||'';m.classList.toggle('ok',!!ok);}
function badInput(el){if(!el)return;el.classList.add('bad');try{el.focus();}catch(e){}
  setTimeout(()=>el.classList.remove('bad'),1600);}

async function doLogin(e){
  if(e&&e.preventDefault)e.preventDefault();
  const emEl=$('liEmail'),pwEl=$('liPw'),b=$('liGo');
  const em=(emEl.value||'').trim().toLowerCase(),pw=pwEl.value||'';
  if(!CLOUD.on){gmsg('liMsg',L('클라우드가 설정되지 않아 지금은 샘플만 볼 수 있습니다.','The cloud is not configured — only the sample is available.'));return;}
  if(!EMAIL_RX.test(em)){gmsg('liMsg',L('이메일을 확인해 주세요.','Check the email address.'));badInput(emEl);return;}
  if(!pw){gmsg('liMsg',L('비밀번호를 입력해 주세요.','Enter your password.'));badInput(pwEl);return;}
  b.disabled=true;gmsg('liMsg',L('확인 중…','Checking…'),true);
  try{
    const {data,error}=await withTimeout(CLOUD.sb.auth.signInWithPassword({email:em,password:pw}),20000,L('로그인','Sign-in'));
    if(error){gmsg('liMsg',authErrMsg(error));badInput(pwEl);return;}
    pwEl.value='';gmsg('liMsg','');
    /* 보통은 로그인 이벤트(onAuthStateChange)가 afterSignIn 을 부른다 — 이벤트가 늦을 때를 위해 한 번 더 */
    if(data&&data.user&&(!CLOUD.user||CLOUD.user.id!==data.user.id)){CLOUD.user=data.user;await afterSignIn();}
  }catch(err){gmsg('liMsg',authErrMsg(err));}
  finally{b.disabled=false;}
}
async function doSignup(e){
  if(e&&e.preventDefault)e.preventDefault();
  const g=id=>$(id),v=id=>(g(id).value||'').trim();
  const em=v('suEmail').toLowerCase(),pw=g('suPw').value||'',pw2=g('suPw2').value||'';
  const nm=v('suName'),org=v('suOrg'),note=v('suNote');
  if(!CLOUD.on){gmsg('suMsg',L('클라우드가 설정되지 않아 지금은 가입 신청을 받을 수 없습니다.','The cloud is not configured — sign-up is unavailable.'));return;}
  if(!EMAIL_RX.test(em)){gmsg('suMsg',L('이메일을 확인해 주세요.','Check the email address.'));badInput(g('suEmail'));return;}
  if(pw.length<8){gmsg('suMsg',L('비밀번호는 8자 이상으로 정해 주세요.','Use at least 8 characters for the password.'));badInput(g('suPw'));return;}
  if(pw!==pw2){gmsg('suMsg',L('비밀번호 확인이 맞지 않습니다.','The passwords do not match.'));badInput(g('suPw2'));return;}
  if(!nm){gmsg('suMsg',L('이름을 적어 주세요.','Enter your name.'));badInput(g('suName'));return;}
  const b=g('suGo');b.disabled=true;gmsg('suMsg',L('보내는 중…','Sending…'),true);
  /* 가입하면 Supabase 가 바로 로그인 상태를 만든다 — 승인 전이므로 afterSignIn 을 건너뛰고 곧바로 로그아웃한다 */
  CLOUD.authHold=true;
  try{
    const {data,error}=await withTimeout(CLOUD.sb.auth.signUp({email:em,password:pw,
      options:{data:{name:nm,org,note}}}),20000,L('가입 신청','Sign-up'));
    if(error){gmsg('suMsg',authErrMsg(error));return;}
    /* 이미 있는 이메일이면 Supabase 는 오류 대신 빈 identities 를 돌려준다(이메일 노출 방지) */
    if(data&&data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length){
      gmsg('suMsg',authErrMsg({message:'already registered'}));return;}
    try{if(data&&data.session)await CLOUD.sb.auth.signOut();}catch(x){}
    ['suPw','suPw2','suNote'].forEach(id=>{if(g(id))g(id).value='';});
    gmsg('suMsg','');
    if($('liEmail'))$('liEmail').value=em;
    gatePane('done',{title:L('가입 신청을 보냈습니다','Sign-up request sent'),
      sub:L('마스터가 승인하면 같은 이메일과 비밀번호로 로그인할 수 있습니다.','Once a master approves it, you can sign in with the same email and password.')});
  }catch(err){gmsg('suMsg',authErrMsg(err));}
  finally{CLOUD.authHold=false;b.disabled=false;}
}
/* 승인되지 않은 계정으로 로그인했을 때 — 안내를 띄우고 로그아웃한다 */
async function holdUnapproved(email){
  showGate('done',false);
  gatePane('done',{wait:true,title:L('승인 대기 중입니다','Waiting for approval'),
    sub:L(`${email||'이 계정'} 의 가입 신청이 접수되어 있습니다. 마스터가 승인하면 로그인할 수 있습니다.`,
          `The sign-up request for ${email||'this account'} is pending. You can sign in once a master approves it.`)});
  if($('liEmail')&&email)$('liEmail').value=email;
}
function wireAuthForms(){
  const f=$('loginForm');if(f)f.onsubmit=doLogin;
  const s=$('signupForm');if(s)s.onsubmit=doSignup;
  const ts=$('toSignup');if(ts)ts.onclick=e=>{e.preventDefault();gmsg('suMsg','');
    const le=$('liEmail'),se=$('suEmail');if(le&&se&&!se.value)se.value=le.value;gatePane('signup');};
  const tl=$('toLogin');if(tl)tl.onclick=e=>{e.preventDefault();gmsg('liMsg','');gatePane('login');};
  const gb=$('gdBack');if(gb)gb.onclick=()=>gatePane('login');
  const gx=$('gateClose');if(gx)gx.onclick=()=>{hideGate();gx.classList.add('hidden');};
}

/* ---------- 비밀번호 변경 (내 계정) ---------- */
function openPwChange(){
  if(!CLOUD.on||!CLOUD.user)return;
  openModal(L('비밀번호 변경','Change password'),
    `<div style="display:grid;gap:10px">
      <div class="fld"><label>${L('현재 비밀번호','Current password')}</label><input type="password" id="pwCur" autocomplete="current-password" style="width:100%"></div>
      <div class="fld"><label>${L('새 비밀번호 (8자 이상)','New password (8+ characters)')}</label><input type="password" id="pwNew" autocomplete="new-password" style="width:100%"></div>
      <div class="fld"><label>${L('새 비밀번호 확인','Confirm new password')}</label><input type="password" id="pwNew2" autocomplete="new-password" style="width:100%"></div>
    </div><div class="hint" id="pwMsg" style="margin-top:10px;min-height:18px"></div>`,
    `<button class="btn" data-close>${L('취소','Cancel')}</button><button class="btn primary" id="pwGo">${L('바꾸기','Change')}</button>`,{w:440});
  const msg=t=>{const m=$('pwMsg');if(m)m.textContent=t||'';};
  setTimeout(()=>{try{$('pwCur').focus();}catch(e){}},60);
  $('pwGo').onclick=async()=>{
    const cur=$('pwCur').value||'',nw=$('pwNew').value||'',nw2=$('pwNew2').value||'';
    if(!cur){msg(L('현재 비밀번호를 입력해 주세요.','Enter your current password.'));return;}
    if(nw.length<8){msg(L('새 비밀번호는 8자 이상으로 정해 주세요.','Use at least 8 characters.'));return;}
    if(nw!==nw2){msg(L('새 비밀번호 확인이 맞지 않습니다.','The new passwords do not match.'));return;}
    const b=$('pwGo');b.disabled=true;msg(L('바꾸는 중…','Changing…'));
    try{
      const {error:e1}=await withTimeout(CLOUD.sb.auth.signInWithPassword({email:CLOUD.user.email,password:cur}),20000,'');
      if(e1){msg(/invalid/i.test(e1.message||'')?L('현재 비밀번호가 맞지 않습니다.','The current password is incorrect.'):authErrMsg(e1));return;}
      const {error:e2}=await withTimeout(CLOUD.sb.auth.updateUser({password:nw}),20000,'');
      if(e2){msg(authErrMsg(e2));return;}
      closeModal();
      showToast(L('비밀번호를 바꿨습니다','Password changed'),L('다음 로그인부터 새 비밀번호를 씁니다.','Use the new password next time you sign in.'),{kind:'ok'});
    }catch(err){msg(authErrMsg(err));}
    finally{b.disabled=false;}};
}

/* ---------- 가입 요청 알림 (우측 상단 계정 동그라미) ---------- */
function paintBadge(n,pulse){
  n=+n||0;
  const show=isAppMaster()&&n>0;
  const b=$('meBadge'),c=$('acctCnt');
  if(b){b.classList.toggle('hidden',!show);b.textContent=n>9?'9+':String(n);
    b.title=L(`새 가입 요청 ${n}건 — 눌러서 승인하기`,`${n} new sign-up request(s) — click to review`);
    if(show&&pulse){b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');}}
  if(c){c.classList.toggle('hidden',!show);c.textContent=String(n);}
}
/* force — 화면이 뒤에 있어도 확인한다 (로그인 직후 첫 확인: 창을 열어 둔 채 다른 일을 하다 돌아와도 바로 숫자가 보이게) */
async function memberPoll(force){
  if(!isAppMaster()||!CLOUD.sb)return;
  if(document.hidden&&!force)return;
  try{
    const {data,error}=await withTimeout(CLOUD.sb.rpc('pending_count'),15000,'');
    if(error)return;
    const n=+data||0,prev=MB_POLL.last;
    MB_POLL.last=n;
    const more=prev!=null&&n>prev;
    paintBadge(n,more||prev==null);
    if(more){
      showToast(L('새 가입 요청이 있습니다','New sign-up request'),
        L(`${n}건 대기 중 — 오른쪽 위 알림을 누르면 승인 화면으로 갑니다`,`${n} pending — click the badge at the top right to review`),{ms:6000});
      if(membersBox()){await membersLoad();membersDraw();}}
  }catch(e){}
}
function memberPollStart(){
  memberPollStop();
  if(!isAppMaster())return;
  memberPoll(true);
  MB_POLL.t=setInterval(()=>memberPoll(),60*1000);
}
function memberPollStop(){if(MB_POLL.t)clearInterval(MB_POLL.t);MB_POLL.t=null;MB_POLL.last=null;paintBadge(0);}
addEventListener('visibilitychange',()=>{if(!document.hidden)memberPoll();});

/* ---------- 광고주 고르기 (뷰어가 볼 광고주) ---------- */
/* 캠페인 목록 · 광고주 관리 장부에 있는 광고주를 광고주 열쇠(공백 · 대소문자 무시)로 묶는다 */
function advOptions(extra){
  const by=new Map();
  const add=(n,w)=>{n=String(n||'').trim();const k=advKey(n);if(!k)return;
    const m=by.get(k)||new Map();m.set(n,(m.get(n)||0)+w);by.set(k,m);};
  try{(CLOUD.list||[]).forEach(c=>add(c.advertiser,1));}catch(e){}
  try{if(typeof loadAdvBook==='function')loadAdvBook();Object.keys(ADV_BOOK||{}).forEach(n=>add(n,.5));}catch(e){}
  (extra||[]).forEach(n=>add(n,.1));
  return [...by.entries()].map(([k,m])=>({k,name:[...m.entries()].sort((a,b)=>b[1]-a[1])[0][0],
      n:(CLOUD.list||[]).filter(c=>advKey(c.advertiser)===k).length}))
    .sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
function advPickHTML(id,sel){
  const on=new Set((sel||[]).map(advKey));
  const opts=advOptions(sel);
  if(!opts.length)return `<div class="advpick" id="${id}"><span class="none">${L('등록된 광고주가 없습니다 — 캠페인을 먼저 만들어 주세요.','No advertisers yet — create a campaign first.')}</span></div>`;
  return `<div class="advpick" id="${id}" data-noi18n>`+opts.map(o=>
    `<label title="${esc(o.n?L(`캠페인 ${o.n}개`,`${o.n} campaign(s)`):L('아직 캠페인 없음','No campaigns yet'))}">`
    +`<input type="checkbox" value="${esc(o.name)}"${on.has(o.k)?' checked':''}>${esc(o.name)}</label>`).join('')+'</div>';
}
const advPickRead=el=>el?[...el.querySelectorAll('input:checked')].map(x=>x.value):[];

/* ---------- 회원 관리 ---------- */
function membersBox(){return document.querySelector('#modalHost .modal[data-members]');}
async function mbRpc(fn,args){
  try{const {error}=await withTimeout(CLOUD.sb.rpc(fn,args),20000,L('회원 관리','Members'));
    if(error){mbErr(error.message);return false;}
    return true;}catch(e){mbErr(String(e&&e.message||e));return false;}}
function mbErr(m){
  if(/PGRST202|could not find the function|schema cache/i.test(m||''))
    m=L('서버에 회원 관리 기능이 아직 없습니다 — supabase/2026-10-08_members_email.sql 을 실행해 주세요.',
        'The member functions are missing on the server — run supabase/2026-10-08_members_email.sql.');
  showToast(L('처리하지 못했습니다','Could not complete'),m,{kind:'warn',ms:6500});}
async function membersLoad(){
  try{
    const {data,error}=await withTimeout(CLOUD.sb.rpc('list_members'),20000,L('회원 목록','Member list'));
    if(error){MEMBERS.err=error.message;MEMBERS.rows=[];}
    else{MEMBERS.err='';MEMBERS.rows=Array.isArray(data)?data:[];}
  }catch(e){MEMBERS.err=String(e&&e.message||e);MEMBERS.rows=[];}
  const n=MEMBERS.rows.filter(r=>r.app_role==='pending').length;
  if(!MEMBERS.err){MB_POLL.last=n;paintBadge(n);}
}
async function openMembers(tab){
  if(!CLOUD.on||!CLOUD.user){showGateLogin();return;}
  if(!isAppMaster()){
    confirmModal(L('마스터 · 슈퍼마스터만 열 수 있습니다.','Only masters can open this.'),
      L('회원 관리는 마스터 이상 계정에서만 할 수 있습니다.','Member management is for master accounts.'),()=>{},L('확인','OK'));return;}
  MEMBERS.tab=tab||'req';MEMBERS.q='';
  const old=membersBox();if(old){old.remove();}
  const box=openModal(L('회원 관리','Members'),`<div class="mbempty">${L('불러오는 중…','Loading…')}</div>`,
    `<div class="mbrule">${L('마스터는 가입 승인 · 뷰어 관리를 하고, 마스터끼리는 서로 볼 수만 있습니다. 마스터 강등 · 탈퇴는 슈퍼마스터만 할 수 있습니다.',
      'Masters approve sign-ups and manage viewers; masters can only view each other. Only the super master can demote or remove masters.')}</div>`
    +`<div class="spacer"></div><button class="btn" data-close>${L('닫기','Close')}</button>`,{w:1180});
  box.dataset.members='1';
  /* 광고주 목록을 최신으로 (다른 마스터가 만든 캠페인까지) */
  try{await loadCampaignList(true);}catch(e){}
  await membersLoad();
  membersDraw();
}
function membersDraw(){
  const box=membersBox();if(!box)return;
  const bd=box.querySelector('.mbd');if(!bd)return;
  const rows=MEMBERS.rows||[];
  const pend=rows.filter(r=>r.app_role==='pending'||r.app_role==='guest');
  const mem=rows.filter(r=>!(r.app_role==='pending'||r.app_role==='guest'));
  const tab=MEMBERS.tab==='list'?'list':'req';
  const d10=s=>s?String(s).slice(0,10).replace(/-/g,'.'):'–';
  let h=`<div class="mbtabs" role="tablist">
      <button type="button" data-mtab="req" class="${tab==='req'?'on':''}">${L('가입 요청','Requests')}<i class="${pend.length?'hot':''}">${pend.length}</i></button>
      <button type="button" data-mtab="list" class="${tab==='list'?'on':''}">${L('회원','Members')}<i>${mem.length}</i></button></div>`;
  if(MEMBERS.err)h+=`<div class="notice" style="margin-bottom:12px"><span>!</span><div>${esc(L('회원 목록을 불러오지 못했습니다: ','Could not load members: ')+MEMBERS.err)}</div></div>`;
  if(tab==='req'){
    if(!pend.length)h+=`<div class="mbempty">${L('대기 중인 가입 요청이 없습니다.','No pending sign-up requests.')}</div>`;
    pend.forEach(r=>{
      const id=r.id;
      h+=`<div class="mreq" data-uid="${id}">
        <div class="who" data-noi18n><b>${esc(r.name||'–')}</b><span class="em">${esc(r.email||'')}</span>
          <span class="meta">${esc(r.org||'')}${r.org?' · ':''}${d10(r.created_at)} ${L('신청','requested')}</span></div>
        ${r.note?`<div class="memo" data-noi18n>${esc(r.note)}</div>`:''}
        <div class="dec">
          <div><div class="lb">${L('등급','Level')}</div>
            <div class="mlvl"><label><input type="radio" name="lv_${id}" value="viewer" checked>${L('뷰어','Viewer')}</label>`
            +`<label><input type="radio" name="lv_${id}" value="master">${L('마스터','Master')}</label></div></div>
          <div class="advcol"><div class="lb">${L('볼 수 있는 광고주 (뷰어)','Advertisers this viewer can see')}</div>${advPickHTML('ap_'+id,[])}</div>
          <div class="acts"><button class="btn sm danger" type="button" data-mrej="${id}">${L('거절','Reject')}</button>
            <button class="btn sm primary" type="button" data-mok="${id}">${L('승인','Approve')}</button></div>
        </div></div>`;});
  }else{
    h+=`<div class="mbtool"><input type="search" id="mbQ" placeholder="${L('이름 · 이메일 · 소속 · 광고주로 찾기','Search name · email · org · advertiser')}" value="${esc(MEMBERS.q||'')}">
      <span class="hint">${L('뷰어는 지정된 광고주의 캠페인만 볼 수 있습니다.','Viewers only see campaigns of their assigned advertisers.')}</span></div>`;
    const q=String(MEMBERS.q||'').trim().toLowerCase();
    const hit=r=>!q||[r.name,r.email,r.org,appRoleLabel(r.app_role)].concat(r.advs||[]).some(x=>String(x||'').toLowerCase().includes(q));
    const list=mem.filter(hit);
    h+=`<table class="tbl lite mtbl" style="background:var(--surface);border-radius:10px;overflow:hidden"><thead><tr>
      <th style="min-width:110px">${L('이름','Name')}</th><th style="min-width:180px">${L('이메일','Email')}</th>
      <th style="min-width:100px">${L('소속','Org')}</th><th style="width:96px">${L('등급','Level')}</th>
      <th style="min-width:170px">${L('볼 수 있는 광고주','Advertisers')}</th>
      <th style="width:86px">${L('승인','Approved')}</th><th style="width:86px">${L('최근 로그인','Last sign-in')}</th>
      <th style="width:330px">${L('관리','Manage')}</th></tr></thead><tbody>`;
    if(!list.length)h+=`<tr><td colspan="8" class="hint" style="padding:18px">${L('찾는 회원이 없습니다.','No matching members.')}</td></tr>`;
    list.forEach(r=>{
      const me=r.id===CLOUD.user.id;
      const advs=(r.advs||[]);
      const advCell=(r.app_role==='super'||r.app_role==='master')
        ?`<span class="all">${L('전체 광고주','All advertisers')}</span>`
        :advs.length?advs.map(a=>`<span>${esc(a)}</span>`).join('')
        :`<em title="${L('볼 수 있는 캠페인이 없습니다','Can see no campaigns')}">${L('지정 안 됨','None assigned')}</em>`;
      h+=`<tr data-uid="${r.id}" class="${me?'mbme':''}">
        <td class="l" data-noi18n><b>${esc(r.name||'–')}</b>${me?` <span class="cnt2">${L('나','Me')}</span>`:''}</td>
        <td class="l mono" data-noi18n>${esc(r.email||'–')}</td>
        <td class="l" data-noi18n>${esc(r.org||'–')}</td>
        <td><span class="mrole ${esc(r.app_role)}">${appRoleLabel(r.app_role)}</span></td>
        <td class="l"><div class="advchips" data-noi18n>${advCell}</div></td>
        <td class="mono" title="${esc(r.approved_by_name?L(`승인: ${r.approved_by_name}`,`Approved by ${r.approved_by_name}`):'')}">${d10(r.approved_at||r.created_at)}</td>
        <td class="mono">${d10(r.last_sign_in_at)}</td>
        <td class="acts"><div class="ln">${memberActs(r)}</div></td></tr>`;});
    h+='</tbody></table>';
  }
  bd.innerHTML=h;
  membersWire(bd);
}
/* 한 줄에서 할 수 있는 일 — 서버 함수와 같은 규칙 */
function memberActs(r){
  if(r.id===CLOUD.user.id)return `<span class="hint">${L('내 비밀번호는 계정 메뉴에서','Change yours from the account menu')}</span>`;
  const btn=(attr,t,cls,tip)=>`<button class="btn sm${cls?' '+cls:''}" type="button" ${attr}="${r.id}"${tip?` title="${tip}"`:''}>${t}</button>`;
  if(r.app_role==='viewer')
    return btn('data-madv',L('광고주 지정','Advertisers'),'',L('이 뷰어가 볼 광고주를 고릅니다','Choose the advertisers this viewer can see'))
      +btn('data-mup',L('마스터로','Make master'),'',L('모든 광고주 · 캠페인을 보고 고칠 수 있게 합니다','Can see and edit every advertiser · campaign'))
      +btn('data-mpw',L('비밀번호','Password'),'',L('비밀번호를 새로 정해 줍니다','Set a new password'))
      +btn('data-mdel',L('탈퇴','Remove'),'danger');
  if(r.app_role==='master'||r.app_role==='super'){
    if(!isAppSuper())return `<span class="hint" title="${L('마스터끼리는 서로 볼 수만 있습니다 — 강등 · 탈퇴는 슈퍼마스터만','Masters can only view each other — only the super master can demote or remove')}">${L('보기만 가능','View only')}</span>`;
    return btn('data-mdown',L('뷰어로','Make viewer'),'',L('지정한 광고주만 볼 수 있게 낮춥니다','Limit to chosen advertisers'))
      +btn('data-mpw',L('비밀번호','Password'),'',L('비밀번호를 새로 정해 줍니다','Set a new password'))
      +btn('data-mdel',L('탈퇴','Remove'),'danger');}
  return '';
}
function mbRow(id){return (MEMBERS.rows||[]).find(r=>r.id===id)||{};}
const mbWho=r=>(r.name&&r.name!==r.email?`${r.name} (${r.email})`:(r.email||''));
async function mbAfter(okTitle,okSub){
  showToast(okTitle,okSub||'',{kind:'ok'});
  await membersLoad();membersDraw();
}
function membersWire(bd){
  bd.querySelectorAll('[data-mtab]').forEach(b=>b.onclick=()=>{MEMBERS.tab=b.dataset.mtab;membersDraw();});
  const q=bd.querySelector('#mbQ');
  if(q){q.oninput=()=>{MEMBERS.q=q.value;clearTimeout(q.__t);q.__t=setTimeout(()=>{
      const pos=q.selectionStart;membersDraw();const q2=$('mbQ');if(q2){q2.focus();try{q2.setSelectionRange(pos,pos);}catch(e){}}},160);};}
  /* 가입 요청 — 등급을 마스터로 고르면 광고주 고르기는 쓰지 않는다 */
  bd.querySelectorAll('.mreq').forEach(card=>{
    const id=card.dataset.uid,ap=card.querySelector('#ap_'+CSS.escape(id));
    card.querySelectorAll(`input[name="lv_${id}"]`).forEach(x=>x.onchange=()=>{
      if(ap)ap.classList.toggle('off',x.value==='master'&&x.checked);});});
  bd.querySelectorAll('[data-mok]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mok,r=mbRow(id),card=b.closest('.mreq');
    const lv=(card.querySelector(`input[name="lv_${id}"]:checked`)||{}).value||'viewer';
    const advs=lv==='viewer'?advPickRead(card.querySelector('.advpick')):[];
    const go=async()=>{b.disabled=true;
      if(await mbRpc('approve_member',{p_user:id,p_role:lv,p_advs:advs}))
        await mbAfter(L('가입을 승인했습니다','Sign-up approved'),
          `${mbWho(r)} · ${appRoleLabel(lv)}${lv==='viewer'&&advs.length?' · '+advs.join(', '):''}`);
      else b.disabled=false;};
    if(lv==='master')
      confirmModal(L(`${r.name||r.email} 님을 마스터로 승인할까요?`,`Approve ${r.name||r.email} as a master?`),
        L('마스터는 모든 광고주 · 캠페인을 보고 고치고 지울 수 있으며, 다른 사람의 가입도 승인할 수 있습니다.',
          'Masters can see, edit and delete every advertiser and campaign, and can approve sign-ups.'),go,L('마스터로 승인','Approve as master'));
    else if(!advs.length)
      confirmModal(L('광고주를 고르지 않았습니다.','No advertiser selected.'),
        L('이대로 승인하면 볼 수 있는 캠페인이 없습니다. 나중에 회원 목록의 [광고주 지정]에서 정할 수 있습니다.',
          'The viewer will see no campaigns until you assign advertisers in the member list.'),go,L('그대로 승인','Approve anyway'));
    else go();});
  bd.querySelectorAll('[data-mrej]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mrej,r=mbRow(id);
    confirmModal(L(`${r.name||r.email} 님의 가입 요청을 거절할까요?`,`Reject the request from ${r.name||r.email}?`),
      L('신청한 계정이 지워집니다. 같은 이메일로 다시 신청할 수 있습니다.','The account is deleted; the same email can apply again.'),
      async()=>{if(await mbRpc('reject_member',{p_user:id}))await mbAfter(L('가입 요청을 거절했습니다','Request rejected'),mbWho(r));},
      L('거절','Reject'));});
  bd.querySelectorAll('[data-madv]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.madv,r=mbRow(id);
    mbAdvModal(L(`볼 수 있는 광고주 — ${r.name||r.email}`,`Advertisers — ${r.name||r.email}`),r.advs||[],
      L('이 뷰어는 고른 광고주의 캠페인만 볼 수 있습니다.','This viewer will only see campaigns of the chosen advertisers.'),
      L('저장','Save'),async advs=>{
        if(await mbRpc('set_viewer_advertisers',{p_user:id,p_advs:advs})){
          closeModal();await mbAfter(L('광고주를 바꿨습니다','Advertisers updated'),`${mbWho(r)} · ${advs.join(', ')||L('지정 안 됨','none')}`);}});});
  bd.querySelectorAll('[data-mup]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mup,r=mbRow(id);
    confirmModal(L(`${r.name||r.email} 님을 마스터로 바꿀까요?`,`Make ${r.name||r.email} a master?`),
      L('모든 광고주 · 캠페인을 보고 고치고 지울 수 있게 됩니다. 마스터를 다시 뷰어로 낮추는 일은 슈퍼마스터만 할 수 있습니다.',
        'They will be able to see, edit and delete every advertiser and campaign. Only the super master can demote a master.'),
      async()=>{if(await mbRpc('set_member_role',{p_user:id,p_role:'master',p_advs:null}))
        await mbAfter(L('마스터로 바꿨습니다','Promoted to master'),mbWho(r));},L('마스터로','Make master'));});
  bd.querySelectorAll('[data-mdown]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mdown,r=mbRow(id);
    mbAdvModal(L(`뷰어로 낮추기 — ${r.name||r.email}`,`Make viewer — ${r.name||r.email}`),[],
      L('뷰어가 되면 고른 광고주의 캠페인만 볼 수 있고 고칠 수 없습니다.','As a viewer they can only see the chosen advertisers\' campaigns, read-only.'),
      L('뷰어로 바꾸기','Make viewer'),async advs=>{
        if(await mbRpc('set_member_role',{p_user:id,p_role:'viewer',p_advs:advs})){
          closeModal();await mbAfter(L('뷰어로 바꿨습니다','Changed to viewer'),`${mbWho(r)}${advs.length?' · '+advs.join(', '):''}`);}});});
  bd.querySelectorAll('[data-mpw]').forEach(b=>b.onclick=()=>mbPwModal(mbRow(b.dataset.mpw)));
  bd.querySelectorAll('[data-mdel]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.mdel,r=mbRow(id);
    confirmModal(L(`${r.name||r.email} 님을 탈퇴시킬까요?`,`Remove ${r.name||r.email}?`),
      L('계정이 삭제되어 더 이상 로그인할 수 없습니다. 이 사람이 만든 캠페인 · 데이터는 그대로 남습니다.',
        'The account is deleted and can no longer sign in. Campaigns and data they created stay.'),
      async()=>{if(await mbRpc('remove_member',{p_user:id}))await mbAfter(L('탈퇴시켰습니다','Member removed'),mbWho(r));},
      L('탈퇴','Remove'));});
}
/* 광고주 고르기 창 (뷰어 광고주 지정 · 마스터 → 뷰어) */
function mbAdvModal(title,sel,note,okLabel,onOk){
  openModal(title,`<div class="hint" style="margin-bottom:12px">${esc(note)}</div>${advPickHTML('mbAdvPick',sel)}`,
    `<button class="btn" data-close>${L('취소','Cancel')}</button><button class="btn primary" id="mbAdvGo">${esc(okLabel)}</button>`,{w:620});
  $('mbAdvGo').onclick=async()=>{const b=$('mbAdvGo');b.disabled=true;
    try{await onOk(advPickRead($('mbAdvPick')));}finally{if(b.isConnected)b.disabled=false;}};
}
/* 비밀번호 새로 정해 주기 — 메일 없이 (뷰어는 마스터 이상, 마스터는 슈퍼마스터만) */
function mbPwModal(r){
  openModal(L(`비밀번호 재설정 — ${r.name||r.email}`,`Reset password — ${r.name||r.email}`),
    `<div class="hint" style="margin-bottom:12px">${L('새 비밀번호를 정해 본인에게 따로 전달해 주세요. 본인은 로그인한 뒤 계정 메뉴에서 다시 바꿀 수 있습니다.',
      'Set a new password and pass it to them; they can change it from the account menu after signing in.')}</div>
     <div style="display:grid;gap:10px">
      <div class="fld"><label>${L('새 비밀번호 (8자 이상)','New password (8+ characters)')}</label><input type="text" id="mbPw1" autocomplete="off" spellcheck="false" style="width:100%"></div>
     </div><div class="hint" id="mbPwMsg" style="margin-top:10px;min-height:18px"></div>`,
    `<button class="btn" data-close>${L('취소','Cancel')}</button><button class="btn primary" id="mbPwGo">${L('정하기','Set')}</button>`,{w:460});
  setTimeout(()=>{try{$('mbPw1').focus();}catch(e){}},60);
  $('mbPwGo').onclick=async()=>{
    const p=$('mbPw1').value||'';
    if(p.length<8){$('mbPwMsg').textContent=L('8자 이상으로 정해 주세요.','Use at least 8 characters.');return;}
    const b=$('mbPwGo');b.disabled=true;
    if(await mbRpc('set_member_password',{p_user:r.id,p_pw:p})){closeModal();
      showToast(L('비밀번호를 새로 정했습니다','Password reset'),mbWho(r),{kind:'ok'});}
    else b.disabled=false;};
}
