/* ===== 14. 메뉴 · TV 캠페인 (v71 → v72) =====
   v72 — 메뉴를 두 줄로 나눴다.
     1줄: 영역(디지털 · TV · 트렌드 리포트) + 오른쪽 도구
     2줄: 고른 영역의 하위 메뉴(서머리 · 일자별 효율 · 미디어믹스 · 데이터 입력 · 예상효율 입력)
   설정 › 메뉴 설정에서 메뉴마다 **사용 여부**와 **광고주(뷰어)에게 보일지**를 정한다.
   TV 는 기본 틀 — 계획(예상효율) · 실적(리포트 데이터) 입력 표와 서머리 · 일자별 효율 · 미디어믹스.
   데이터는 캠페인 문서(doc.tv) 한 덩어리에 담긴다 → 서버 스키마를 바꾸지 않는다. */

/* ---------- 운영 영역(매체) ---------- */
/* 문서에 없으면(예전 캠페인) 디지털만 운영한 것으로 본다 */
function campMedia(){
  const m=CAMPAIGN.media||{};
  const d=m.digital!==false, t=!!m.tv;
  return (d||t)?{digital:d,tv:t}:{digital:true,tv:false};}
function setCampMedia(m){
  const d=!!m.digital,t=!!m.tv;
  if(!d&&!t)return false;                      /* 최소 한 개는 있어야 캠페인이 성립한다 */
  CAMPAIGN.media={digital:d,tv:t};
  return true;}

/* ---------- 메뉴 목록 ----------
   kind: view(대시보드 — 뷰어에게 보일 수 있다) · edit(입력 — 언제나 관리자 전용) */
/* 메뉴 목록 MENUS · MENU_BY · AREA_OF_TAB · AREA_LABEL 은 p3(03-data) 맨 앞에 있다 —
   부트스트랩 중(switchTab 첫 호출)에 쓰이므로 먼저 정의돼야 한다 (함정 10) */
/* 이 캠페인에서 쓰는 메뉴인가 — 영역이 꺼져 있으면 그 영역 메뉴는 전부 안 쓴다 */
function menuUsed(id){
  const m=MENU_BY[id];if(!m)return true;
  const md=campMedia();
  if(m.area==='digital'&&!md.digital)return false;
  if(m.area==='tv'&&!md.tv)return false;
  const c=campMenus()[id];return !(c&&c.on===false);}
/* 광고주(뷰어)에게 보이는가 — 입력 메뉴는 언제나 관리자 전용 */
function menuViewer(id){
  const m=MENU_BY[id];if(!m||m.kind!=='view')return false;
  if(id==='trend'){try{return trendVisibleToViewer();}catch(e){return true;}}
  const c=campMenus()[id];return !(c&&c.viewer===false);}
function menuVisible(id){
  if(!menuUsed(id))return false;
  let cl=false;try{cl=isClient();}catch(e){}
  return !cl||menuViewer(id);}
/* 탭(화면) 단위로 보이는가 — 디지털 대시보드는 하위 셋 중 하나라도 보이면 */
function tabVisible(tab){
  const ms=MENUS.filter(m=>m.tab===tab);
  return ms.length?ms.some(m=>menuVisible(m.id)):true;}
/* 보이는 첫 화면 — 대시보드(view) 먼저 */
function firstDashTab(){
  const m=MENUS.find(x=>x.kind==='view'&&x.area!=='trend'&&menuVisible(x.id))
    ||MENUS.find(x=>menuVisible(x.id));
  return m?m.tab:'dash';}
/* 영역을 누르면 — 디지털은 대시보드(보던 하위 화면 그대로), TV 는 마지막으로 본 TV 대시보드 */
function areaHome(a){
  if(a==='digital'&&tabVisible('dash'))return 'dash';
  if(a==='tv'&&TV_LAST&&tabVisible(TV_LAST))return TV_LAST;
  const m=MENUS.find(x=>x.area===a&&x.kind==='view'&&menuVisible(x.id))
    ||MENUS.find(x=>x.area===a&&menuVisible(x.id));
  return m?m.tab:firstDashTab();}
/* 지금 디지털 대시보드의 하위 화면 */
function curDashSub(){
  return ['perf','table','mix'].find(n=>{const e=$('sub-'+n);return e&&!e.classList.contains('hidden');})||'perf';}
/* 선택 표시 — 영역 · 하위 메뉴(드롭다운 안) · 상위 버튼 옆 "지금 메뉴" (v74) */
function paintTabsOn(){
  const T=$('tabs');if(!T)return;
  const name=T.dataset.cur||'dash',area=AREA_OF_TAB[name]||'digital';
  const cs=curDashSub();
  T.querySelectorAll('.area').forEach(b=>{
    const on=b.dataset.area===area;b.classList.toggle('on',on);
    const c=b.querySelector('.acur');if(!c)return;
    /* 사전 번역이 되도록 한국어 원문(MENUS.l)을 넣는다 — 영어 화면이면 textContent 훅이 옮긴다 */
    let lb='';
    if(on&&area!=='trend'){
      const m=name==='dash'?MENUS.find(x=>x.tab==='dash'&&x.sub===cs):MENUS.find(x=>x.tab===name);
      lb=m?m.l:'';}
    const src=c.firstChild&&c.firstChild.__ko!=null?c.firstChild.__ko:c.textContent;
    if(src!==lb||(!lb&&c.textContent))c.textContent=lb;});
  T.querySelectorAll('.subgrp').forEach(g=>g.classList.toggle('cur',g.dataset.area===area));
  T.querySelectorAll('.subgrp [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===name));
  T.querySelectorAll('#subbar [data-sub]').forEach(b=>b.classList.toggle('on',name==='dash'&&b.dataset.sub===cs));
  /* 도구 — 영역 관리는 디지털 대시보드에서만, 리포트 엑셀은 디지털 영역에서만 */
  const sm=$('sectMngBtn');if(sm)sm.classList.toggle('tooloff',name!=='dash');
  const dl=T.querySelector('.dlgrp');if(dl)dl.classList.toggle('tooloff',area!=='digital');
  /* "지금 메뉴" 글자 길이가 바뀌면 줄이 넘칠 수 있다 — 한 번 더 잰다 */
  cancelAnimationFrame(window.__fitTabsR);window.__fitTabsR=requestAnimationFrame(()=>{try{fitTabs();}catch(e){}});
  syncUrl();}
/* ---------- 전체 메뉴 판 (v75) ----------
   상위 메뉴(디지털 · TV · 트렌드 리포트) 중 어느 것을 눌러도 모든 영역의 하위 메뉴를 한 판에 펼친다.
   보이는 메뉴가 하나뿐이면 펼치지 않고 바로 간다. 바깥 클릭 · Esc · 창 크기 변경 · 메뉴 선택 → 닫힘. */
function areaItems(){
  const g=document.querySelector('#tabs .megapop');if(!g)return [];
  return [...g.querySelectorAll('button')].filter(x=>!x.classList.contains('menuoff')&&!x.classList.contains('hidden')
    &&!x.closest('.subbar.menuoff')&&!x.closest('.subgrp.menuoff'));}
function openAreaPop(a){
  const T=$('tabs');if(!T)return;
  T.dataset.pop=a||'1';
  T.querySelectorAll('.area[aria-haspopup]').forEach(x=>x.setAttribute('aria-expanded',x.dataset.area===a?'true':'false'));
  /* 오른쪽이 모자라면 판을 왼쪽으로 당긴다 */
  const g=T.querySelector('.megapop');
  if(g){g.style.left='';const r=g.getBoundingClientRect();if(r.right>innerWidth-8)g.style.left=Math.round(innerWidth-8-r.right)+'px';}}
function closeAreaPop(){
  const T=$('tabs');if(!T||!T.dataset.pop)return;
  delete T.dataset.pop;
  T.querySelectorAll('.area[aria-haspopup]').forEach(x=>x.setAttribute('aria-expanded','false'));}
function areaClick(b,e){
  if(e)e.stopPropagation();
  const a=b.dataset.area,T=$('tabs'),items=areaItems();
  if(items.length<=1){closeAreaPop();
    if(items.length===1)items[0].click();else switchTab(areaHome(a));return;}
  if(T&&T.dataset.pop){closeAreaPop();return;}
  openAreaPop(a);}
(function wireAreaPop(){
  const go=()=>{
    const T=$('tabs');if(!T)return;
    /* 메뉴를 고르면 닫는다 (각 단추의 원래 동작은 그대로 돈다) */
    T.addEventListener('click',e=>{if(e.target.closest('.megapop button'))closeAreaPop();});
    document.addEventListener('click',e=>{if(T.dataset.pop&&!e.target.closest('#tabs .arearow'))closeAreaPop();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&T.dataset.pop){closeAreaPop();
      const b=T.querySelector('.area.on');if(b)b.focus();}});
    addEventListener('resize',closeAreaPop);};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):go();})();
/* ---------- 주소창 = 지금 화면 (v75) ----------
   ?code=<코드>&menu=<메뉴>&lang=<ko|en> — 캠페인 · 메뉴 · 언어가 바뀔 때마다 주소를 고쳐 쓴다(뒤로 가기 기록은 쌓지 않음).
   주소창을 그대로 복사해 보내면 받는 사람도 같은 캠페인 · 같은 메뉴 · 같은 언어로 열린다.
   · 로그인한 시행사 → 그 캠페인의 **뷰어(광고주) 코드** — 복사해 보내도 조회 전용이다
   · 운영진 코드로 들어온 화면 → 코드를 싣지 않는다(운영진 권한이 퍼지지 않게). 같은 탭 새로고침은 staffResume 로 이어 연다
   · 샘플 → DEMO-2026(시행사 화면) / VIEW-2026(광고주 화면) · 접속 화면 → lang 만
   ⚠ 첫 화면이 자리 잡기 전(window.__urlLive 없음)에는 절대 고치지 않는다 — 접속 화면이 ?code 를 읽기 전에 지워지면 안 된다. */
/* ⚠ 부트스트랩 중(접속 화면이 코드를 읽는 순간 · p8 의 첫 switchTab)에 이 파일보다 **먼저** 불린다 →
   최상위 const/let/var 로 두면 TDZ 이거나, 나중에 `var …=false` 가 이미 켠 값을 되돌린다. 전부 window 에 둔다 (함정 10) */
function urlBoot(){
  if(!window.__urlBoot){try{const q=new URLSearchParams(location.search);
    window.__urlBoot={code:q.get('code')||'',menu:q.get('menu')||''};}catch(e){window.__urlBoot={code:'',menu:''};}}
  return window.__urlBoot;}
function urlCode(){
  const g=$('gate');if(g&&!g.classList.contains('hidden'))return '';
  if(CLOUD.sample)return SAMPLE_CODE;
  if(CLOUD.shareView)return CLOUD.shareRole==='staff'?'':(CLOUD.shareCode||'');
  if(CLOUD.user&&CLOUD.campaign&&CLOUD.campaign.id){
    const c=(CLOUD.list||[]).find(x=>x.id===CLOUD.campaign.id);return (c&&c.share_code)||CLOUD.campaign.share_code||'';}
  return '';}
function urlMenu(){
  const g=$('gate');if(g&&!g.classList.contains('hidden'))return '';
  const T=$('tabs');if(!T)return '';
  const cur=T.dataset.cur||'dash';
  const m=cur==='dash'?MENUS.find(x=>x.tab==='dash'&&x.sub===curDashSub()):MENUS.find(x=>x.tab===cur);
  return m?m.id:'';}
function syncUrl(){
  if(!window.__urlLive)return;
  try{
    const keep=new URLSearchParams(location.search);['code','menu','lang'].forEach(k=>keep.delete(k));
    const q=new URLSearchParams();
    const c=urlCode(),m=urlMenu();
    if(c)q.set('code',c);if(m)q.set('menu',m);q.set('lang',LANG);
    keep.forEach((v,k)=>q.append(k,v));
    const url=location.pathname+'?'+q.toString()+location.hash;
    if(url!==location.pathname+location.search+location.hash)history.replaceState(history.state,'',url);
  }catch(e){}}
/* 주소에 적힌 메뉴로 가기 — 보이지 않는 메뉴(꺼짐 · 광고주에게 숨김)면 그대로 둔다 */
function goMenu(id){
  const m=MENU_BY[id];if(!m||!menuVisible(id))return false;
  if(m.tab==='dash'){
    if(($('tabs')||{}).dataset?.cur!=='dash')switchTab('dash');
    const b=document.querySelector(`#subbar [data-sub="${m.sub}"]`);if(b&&curDashSub()!==m.sub)b.click();}
  else switchTab(m.tab);
  return true;}
/* 캠페인(또는 샘플 · 코드 화면)이 자리 잡은 뒤 한 번 — 주소의 메뉴로 옮기고, 이후로는 주소를 따라 고친다 */
function urlSettled(){
  const B=urlBoot(),m=B.menu;B.menu='';
  if(m){try{goMenu(m);}catch(e){}}
  window.__urlLive=true;syncUrl();}
/* 디지털 대시보드에서 지금 하위 화면이 꺼져 있으면 보이는 첫 하위 화면으로 */
function ensureDashSub(){
  const cs=curDashSub(),m=MENUS.find(x=>x.tab==='dash'&&x.sub===cs);
  if(m&&menuVisible(m.id))return;
  const alt=MENUS.find(x=>x.tab==='dash'&&menuVisible(x.id));
  const b=alt&&document.querySelector(`#subbar [data-sub="${alt.sub}"]`);
  if(b)b.click();}
/* 메뉴 줄 전체 — 사용 여부 · 권한 · 뷰어 노출에 맞춘다 */
function applyMenus(){
  const T=$('tabs');if(!T)return;
  let cl=false;try{cl=isClient();}catch(e){}
  T.querySelectorAll('[data-menu]').forEach(b=>{
    const id=b.dataset.menu,used=menuUsed(id),vw=menuViewer(id);
    b.classList.toggle('menuoff',!used);
    b.classList.toggle('hidden',used&&cl&&!vw);
    /* 광고주에게 보이지 않는 메뉴 — 시행사 화면에서는 옅게 (v66) */
    b.classList.toggle('vhide',used&&!cl&&!vw);});
  T.querySelectorAll('.area').forEach(b=>{
    const a=b.dataset.area;
    const vis=MENUS.some(m=>m.area===a&&menuVisible(m.id));
    const anyV=MENUS.some(m=>m.area===a&&menuUsed(m.id)&&menuViewer(m.id));
    b.classList.toggle('menuoff',!vis);
    b.classList.toggle('vhide',vis&&!cl&&!anyV);});
  /* 보이는 단추가 없는 묶음(트레이)은 통째로 감춘다 */
  T.querySelectorAll('.subgrp .subbar').forEach(sb=>{
    const any=[...sb.querySelectorAll('button')].some(x=>!x.classList.contains('menuoff')&&!x.classList.contains('hidden'));
    sb.classList.toggle('menuoff',!any);});
  /* 보이는 트레이가 없는 영역은 판에서 열째로 감춘다 */
  T.querySelectorAll('.megapop .subgrp').forEach(g=>{
    g.classList.toggle('menuoff',![...g.querySelectorAll('.subbar')].some(x=>!x.classList.contains('menuoff')));});
  const cur=T.dataset.cur||'dash';
  if(!tabVisible(cur))switchTab(firstDashTab());
  else{if(cur==='dash')ensureDashSub();paintTabsOn();}
  try{fitTabs();}catch(e){}
}
/* 예전 이름 — 부르는 곳이 여럿이라 남겨 둔다 */
function applyMediaTabs(){applyMenus();}
/* 줄이 넘치면 줄인다(.dense → .dense2 → .dense3). v74 — 하위 메뉴는 드롭다운이라 줄에는 상위 메뉴 · 지금 메뉴 · 도구만 */
function fitTabs(){
  const t=$('tabs');if(!t)return;
  /* 대시보드에서만 보이는 도구(🌙 다크 · 영역 관리 · 리포트)가 **보일 때** 기준 — 탭을 옮겨도 모양이 그대로 */
  const tmp=[$('darkToggle'),$('sectMngBtn'),t.querySelector('.dlgrp')]
    .filter(e=>e&&(e.classList.contains('hidden')||e.classList.contains('tooloff'))&&!e.classList.contains('medoff'));
  const was=tmp.map(e=>[e.classList.contains('hidden'),e.classList.contains('tooloff')]);
  const pop=t.dataset.pop;if(pop)delete t.dataset.pop;      /* 펼친 판은 재는 동안만 접는다 */
  tmp.forEach(e=>e.classList.remove('hidden','tooloff'));
  const over=()=>t.scrollWidth>t.clientWidth+2;
  try{
    t.classList.remove('dense','dense2','dense3');
    if(over())t.classList.add('dense');
    if(over())t.classList.add('dense2');
    if(over())t.classList.add('dense3');
  }finally{
    if(pop)t.dataset.pop=pop;
    tmp.forEach((e,i)=>{if(was[i][0])e.classList.add('hidden');if(was[i][1])e.classList.add('tooloff');});}
  try{if(typeof syncStick==='function')syncStick();}catch(e){}try{fitTop();}catch(e){}
}
/* 머리줄(로고 · 캠페인 · 상태 · 저장 · 로그인 · 언어 · 설정) — 좁으면 언어 칩을 KO/EN 으로 줄인다 */
const LANG_LONG={ko:'한국어',en:'English'},LANG_SHORT={ko:'KO',en:'EN'};
/* 언어 단추 글자 — 넓으면 한국어/English, 좁으면 KO/EN (v72 — 직접 만든 드롭다운) */
function paintLangBtn(){
  const c=$('langCur');if(!c)return;
  const short=!!document.querySelector('.topbar.tcompact');
  const v=(short?LANG_SHORT:LANG_LONG)[LANG]||LANG;
  if(c.textContent!==v)c.textContent=v;
  const m=$('langMenu');if(m)m.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===LANG));}
function fitTop(){
  const t=document.querySelector('.topbar'),cs=$('cloudState');if(!t)return;
  const put=()=>paintLangBtn();
  t.classList.remove('tcompact','tcompact2','tcompact3');put();
  const over=()=>t.scrollWidth>t.clientWidth+1;
  const tight=()=>over()||!!(cs&&cs.textContent.trim()&&cs.offsetParent&&cs.scrollWidth>cs.clientWidth+1);
  if(tight()){t.classList.add('tcompact');put();}
  /* 그래도 넘치거나 상태 글씨가 거의 안 보이면 — 여백을 줄이고 제품 이름을 감춘다(로고는 남김) → 베타 표시 감춤 */
  const cramped=()=>over()||!!(cs&&cs.textContent.trim()&&cs.offsetParent&&cs.scrollWidth>cs.clientWidth+1&&cs.clientWidth<70);
  if(cramped())t.classList.add('tcompact2');
  if(cramped())t.classList.add('tcompact3');
  if(cs)cs.title=cs.textContent.trim();}
(function(){const go=()=>{fitTop();const cs=$('cloudState');
    if(cs)new MutationObserver(()=>{clearTimeout(window.__fitTopM);window.__fitTopM=setTimeout(()=>{try{fitTop();}catch(e){}},60);})
      .observe(cs,{childList:true,characterData:true,subtree:true});};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):go();})();
addEventListener('resize',()=>{clearTimeout(window.__fitTabsT);window.__fitTabsT=setTimeout(()=>{try{fitTabs();}catch(e){}try{fitTop();}catch(e){}},120);});

/* ---------- 설정 › 메뉴 설정 (v72 — 예전 "운영 매체") ----------
   영역(디지털 · TV) 켜기, 메뉴마다 사용 여부, 광고주(뷰어)에게 보일지. */
function openMenuSettings(){
  const md=campMedia(),cm=campMenus();
  const st={media:{...md},menus:{}};
  MENUS.forEach(m=>{const c=cm[m.id]||{};
    st.menus[m.id]={on:c.on!==false,viewer:m.id==='trend'?(()=>{try{return trendVisibleToViewer();}catch(e){return true;}})()
      :(m.kind==='view'&&c.viewer!==false)};});
  const row=m=>`<tr data-mid="${m.id}"${m.area!=='trend'?` data-marea="${m.area}"`:''}>
      <td class="mn">${m.l}${m.kind==='edit'?' <span class="mtag">입력</span>':''}</td>
      <td class="mc"><label class="mchk"><input type="checkbox" data-k="on"></label></td>
      <td class="mc">${m.kind==='view'?'<label class="mchk"><input type="checkbox" data-k="viewer"></label>'
        :'<span class="mfix">관리자 전용</span>'}</td></tr>`;
  const area=a=>`<tbody class="mgrp" data-area="${a}">
      <tr class="mhead"><td colspan="3"><label class="marea"><input type="checkbox" data-area="${a}">
        <b>${AREA_LABEL[a]}</b><i>${a==='digital'?'디지털 캠페인':'TV 캠페인'} 메뉴</i></label></td></tr>
      ${MENUS.filter(m=>m.area===a).map(row).join('')}</tbody>`;
  const box=openModal('메뉴 설정',
    `<div class="hint" style="margin:-2px 0 12px">${L(`이번 캠페인에서 쓸 메뉴를 고르고, 광고주(뷰어)에게 보일지 정합니다.
      <b>디지털 · TV 중 최소 한 영역</b>은 켜야 합니다. 뷰어에게 숨긴 메뉴는 시행사 화면에서만 옅게 보입니다.`,
      `Choose the menus this campaign uses and whether advertisers (viewers) can see them.
      <b>At least one of Digital · TV</b> must be on. Menus hidden from viewers appear dimmed only on the agency screen.`)}</div>
     <table class="mset"><thead><tr><th>메뉴</th><th>사용</th><th>뷰어에게 보이기</th></tr></thead>
       ${area('digital')}${area('tv')}
       <tbody class="mgrp" data-area="trend"><tr class="mhead"><td colspan="3"><label class="marea nochk">
         <b>${AREA_LABEL.trend}</b><i>모든 캠페인이 함께 쓰는 자료 게시판</i></label></td></tr>${row(MENU_BY.trend)}</tbody>
     </table>
     <div class="hint" id="medMsg" style="margin-top:10px;min-height:18px"></div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="medOk">적용</button>',{w:600});
  const paint=()=>{
    box.querySelectorAll('input[data-area]').forEach(cb=>cb.checked=!!st.media[cb.dataset.area]);
    box.querySelectorAll('tr[data-mid]').forEach(tr=>{
      const id=tr.dataset.mid,s=st.menus[id],a=tr.dataset.marea,off=a&&!st.media[a];
      tr.classList.toggle('off',!!off);
      tr.querySelectorAll('input[data-k]').forEach(cb=>{cb.checked=!!s[cb.dataset.k];
        cb.disabled=!!off||(cb.dataset.k==='viewer'&&!s.on);});
      tr.classList.toggle('unused',!s.on);});
    box.querySelectorAll('tbody.mgrp').forEach(g=>g.classList.toggle('off',g.dataset.area!=='trend'&&!st.media[g.dataset.area]));};
  const check=()=>{
    if(!st.media.digital&&!st.media.tv)return L('디지털 · TV 중 <b>최소 한 영역</b>은 켜야 합니다.','<b>At least one</b> of Digital · TV must be on.');
    for(const a of ['digital','tv']){
      if(st.media[a]&&!MENUS.some(m=>m.area===a&&st.menus[m.id].on))
        return L(`<b>${AREA_LABEL[a]}</b> 영역을 쓰려면 메뉴를 <b>한 개 이상</b> 켜 주세요.`,
          `Turn on <b>at least one</b> menu to use <b>${a==='tv'?'TV':'Digital'}</b>.`);}
    const viewerAny=MENUS.some(m=>m.kind==='view'&&(m.area==='trend'||st.media[m.area])&&st.menus[m.id].on&&st.menus[m.id].viewer);
    if(!viewerAny)return L('광고주(뷰어)에게 보일 메뉴가 <b>하나도 없습니다</b>. 한 개 이상 켜 주세요.',
      '<b>No menu</b> is visible to advertisers (viewers). Turn on at least one.');
    return '';};
  const say=()=>{const m=check();$('medMsg').innerHTML=m?`<span style="color:var(--neg)">${m}</span>`:'';return !m;};
  box.querySelectorAll('input[data-area]').forEach(cb=>cb.onchange=()=>{st.media[cb.dataset.area]=cb.checked;paint();say();});
  box.querySelectorAll('tr[data-mid] input[data-k]').forEach(cb=>cb.onchange=()=>{
    const id=cb.closest('tr').dataset.mid;st.menus[id][cb.dataset.k]=cb.checked;paint();say();});
  paint();
  const ok=$('medOk');
  if(ok)ok.onclick=()=>{
    if(!say())return;
    setCampMedia(st.media);
    const out={};
    MENUS.forEach(m=>{const s=st.menus[m.id],o={};
      if(!s.on)o.on=false;
      if(m.kind==='view'&&m.id!=='trend'&&!s.viewer)o.viewer=false;
      if(Object.keys(o).length)out[m.id]=o;});
    CAMPAIGN.menus=out;
    try{TREND_VIEWER=!!st.menus.trend.viewer;paintTrendToggle();}catch(e){}
    closeModal();
    try{applyRole();}catch(e){applyMenus();}
    try{if(campMedia().tv)renderTV();}catch(e){}
    try{markDirty();saveLocal();}catch(e){}};
}
/* 예전 이름 */
function openMediaSettings(){openMenuSettings();}

/* ---------- 데이터 ---------- */
let TV_PLAN=[], TV_SPOTS=[];
/* 열 정의 — type: text · num · pct(시청률 %) · date · calc(자동 계산) */
const TV_PLAN_COLS=[
  {k:'ch',l:'채널',type:'text',w:118},
  {k:'prog',l:'프로그램',type:'text',w:220},
  {k:'grade',l:'시급',type:'text',w:66},
  {k:'dur',l:'초수',type:'num',w:66},
  {k:'cnt',l:'횟수',type:'num',w:66},
  {k:'price',l:'단가',type:'num',w:112},
  {k:'rating',l:'예상 시청률(%)',type:'pct',w:108},
  {k:'amt',l:'금액',type:'calc',w:124},
  {k:'grp',l:'예상 GRP',type:'calc',w:96},
  {k:'cprp',l:'예상 CPRP',type:'calc',w:110},
  {k:'note',l:'비고',type:'text',w:170}];
const TV_SPOT_COLS=[
  {k:'date',l:'방송일',type:'date',w:112},
  {k:'time',l:'방송시간',type:'text',w:80},
  {k:'ch',l:'채널',type:'text',w:112},
  {k:'prog',l:'프로그램',type:'text',w:210},
  {k:'grade',l:'시급',type:'text',w:62},
  {k:'dur',l:'초수',type:'num',w:62},
  {k:'cr',l:'소재',type:'text',w:140},
  {k:'cnt',l:'횟수',type:'num',w:62},
  {k:'cost',l:'광고비',type:'num',w:120},
  {k:'rating',l:'시청률(%)',type:'pct',w:92},
  {k:'grp',l:'GRP',type:'calc',w:80}];
const tvNum=v=>{const n=parseFloat(String(v==null?'':v).replace(/[,\s₩원%]/g,''));return isFinite(n)?n:0;};
const tvR=(n,d)=>{const p=Math.pow(10,d||0);return Math.round((+n||0)*p)/p;};
const tvFmt1=n=>(isFinite(n)&&n)?(+n).toLocaleString('en-US',{maximumFractionDigits:1,minimumFractionDigits:1}):'';
/* 행 하나의 계산값 */
function tvPlanCalc(r){
  const cnt=tvNum(r.cnt),price=tvNum(r.price),rt=tvNum(r.rating);
  const amt=cnt*price,grp=cnt*rt;
  return {amt,grp,cprp:grp?amt/grp:NaN};}
function tvSpotCalc(r){
  const cnt=r.cnt===''||r.cnt==null?1:tvNum(r.cnt);
  return {cnt,grp:cnt*tvNum(r.rating),cost:tvNum(r.cost)};}
/* 합계 */
function tvPlanTotal(rows){
  let cnt=0,amt=0,grp=0;
  (rows||TV_PLAN).forEach(r=>{const c=tvPlanCalc(r);cnt+=tvNum(r.cnt);amt+=c.amt;grp+=c.grp;});
  return {cnt,amt,grp,cprp:grp?amt/grp:NaN};}
function tvSpotTotal(rows){
  let cnt=0,cost=0,grp=0;
  (rows||TV_SPOTS).forEach(r=>{const c=tvSpotCalc(r);cnt+=c.cnt;cost+=c.cost;grp+=c.grp;});
  return {cnt,cost,grp,cprp:grp?cost/grp:NaN};}
/* 날짜 — 2026-09-01 · 2026.9.1 · 9/1 (캠페인 연도) · 20260901 */
function tvDate(s){
  s=String(s==null?'':s).trim();if(!s)return '';
  let m=/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(s);
  if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=/^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=/^(\d{1,2})[-./](\d{1,2})$/.exec(s);
  if(m){const y=String(campStart()||iso(new Date())).slice(0,4);
    return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
  return s;}

/* ---------- 입력 표 (예상효율 · 리포트 데이터 공용) ---------- */
const TV_TBL={
  plan:{id:'tvPlanTbl',rows:()=>TV_PLAN,set:v=>{TV_PLAN=v;},cols:TV_PLAN_COLS,calc:tvPlanCalc,
    blank:()=>({ch:'',prog:'',grade:'',dur:'',cnt:'',price:'',rating:'',note:''}),
    sum:'tvPlanSum',note:'tvPlanNote'},
  spot:{id:'tvSpotTbl',rows:()=>TV_SPOTS,set:v=>{TV_SPOTS=v;},cols:TV_SPOT_COLS,calc:tvSpotCalc,
    blank:()=>({date:'',time:'',ch:'',prog:'',grade:'',dur:'',cr:'',cnt:'',cost:'',rating:''}),
    sum:'tvSpotSum',note:'tvSpotNote'}};
/* 칸에 보여 줄 값 */
function tvCellShow(c,r,cv){
  if(c.type==='calc'){
    const v=cv[c.k];
    if(c.k==='grp')return tvFmt1(v);
    return isFinite(v)&&v?fmt(Math.round(v)):'';}
  const v=r[c.k];
  if(v===''||v==null)return '';
  if(c.type==='num')return fmt(tvNum(v));
  if(c.type==='pct')return String(tvR(tvNum(v),2));
  return String(v);}
function tvCalcCells(key,tr,r){
  const T=TV_TBL[key],cv=T.calc(r);
  tr.querySelectorAll('td[data-calc]').forEach(td=>{
    const c=T.cols.find(x=>x.k===td.dataset.calc);if(c)td.textContent=tvCellShow(c,r,cv);});}
function tvFootHTML(key){
  const T=TV_TBL[key],rows=T.rows();
  const tot=key==='plan'?tvPlanTotal(rows):tvSpotTotal(rows);
  return '<tr class="total"><td class="rm"></td>'+T.cols.map((c,i)=>{
    let v='';
    if(i===0)v='TOTAL';
    else if(c.k==='cnt')v=fmt(tot.cnt);
    else if(c.k==='amt')v=fmt(Math.round(tot.amt));
    else if(c.k==='cost')v=fmt(Math.round(tot.cost));
    else if(c.k==='grp')v=tvFmt1(tot.grp);
    else if(c.k==='cprp')v=isFinite(tot.cprp)?fmt(Math.round(tot.cprp)):'';
    return `<td class="mono">${v}</td>`;}).join('')+'</tr>';}
function renderTvTable(key){
  const T=TV_TBL[key],t=$(T.id);if(!t)return;
  const rows=T.rows();
  let h='<thead><tr><th class="rm" style="width:50px"></th>'
    +T.cols.map(c=>`<th style="min-width:${c.w}px"${c.type==='calc'?' class="tvcalc" title="자동 계산"':''}>${c.l}${c.type==='calc'?' ƒ':''}</th>`).join('')
    +'</tr></thead><tbody>';
  rows.forEach((r,i)=>{
    const cv=T.calc(r);
    h+=`<tr data-rd="${i}"><td class="rm">${RGRIP}<button data-tvdel="${i}" title="행 삭제">✕</button></td>`
      +T.cols.map((c,ci)=>{
        if(c.type==='calc')return `<td class="calc mono" data-calc="${c.k}">${tvCellShow(c,r,cv)}</td>`;
        const num=c.type==='num'||c.type==='pct';
        return `<td><input data-i="${i}" data-k="${c.k}" data-c="${ci}"${num?' inputmode="decimal" class="mono"':''}`
          +` value="${esc(tvCellShow(c,r,cv))}"${c.type==='date'?' placeholder="YYYY-MM-DD"':''}></td>`;}).join('')+'</tr>';});
  if(!rows.length)h+=`<tr class="tvempty"><td colspan="${T.cols.length+1}">${L('아직 입력한 행이 없습니다 — <b>+ 행 추가</b>를 누르거나 엑셀에서 복사해 첫 칸에 붙여 넣으세요.','No rows yet — click <b>+ Add row</b>, or copy cells in Excel and paste them into the first cell.')}</td></tr>`;
  h+='</tbody><tfoot>'+tvFootHTML(key)+'</tfoot>';
  t.innerHTML=h;
  const n=$(T.note);if(n)n.textContent=rows.length?`${fmt(rows.length)}행`:'';
  tvWire(key);
  enableRowMove(t,()=>({why:()=>'',apply:(from,to)=>{moveItem(T.rows(),from,to);renderTvTable(key);tvChanged();}}));
  /* 머리글 — 설명 + 정렬 (v72). 입력 표라 정렬하면 **행 순서가 실제로** 그 순서로 바뀐다 */
  const ths=[...t.tHead.rows[0].cells].slice(1);
  wireHeadPops(T.cols.map((c,i)=>({th:ths[i],k:c.k,label:c.l})),{scope:'tv',
    onSort:(k,d)=>{if(!d)return;const c=T.cols.find(x=>x.k===k);
      const val=r=>{if(c.type==='calc')return T.calc(r)[k];const v=r[k];
        if(c.type==='num'||c.type==='pct')return v===''||v==null?NaN:tvNum(v);return String(v==null?'':v);};
      const arr=T.rows().slice().sort((a,b)=>{const x=val(a),y=val(b);
        if(typeof x==='string'&&x===''&&y!=='')return 1;if(typeof y==='string'&&y===''&&x!=='')return -1;
        return hpCmp(x,y,d);});
      T.set(arr);renderTvTable(key);tvChanged();}});
}
/* 값이 바뀌었을 때 — 대시보드 · 저장 */
function tvChanged(){
  try{if(!$('tab-tvdash').classList.contains('hidden'))renderTvDash();}catch(e){}
  try{if(!$('tab-tvdaily').classList.contains('hidden'))renderTvDaily();}catch(e){}
  try{if(!$('tab-tvmix').classList.contains('hidden'))renderTvMix();}catch(e){}
  try{markDirty();saveLocal();}catch(e){}}
/* 표 하나에 리스너를 한 번만 (위임) */
function tvWire(key){
  const T=TV_TBL[key],t=$(T.id);if(!t||t.__tvWired)return;
  t.__tvWired=1;
  t.addEventListener('change',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp)return;
    const i=+inp.dataset.i,k=inp.dataset.k,r=T.rows()[i];if(!r)return;
    const c=T.cols.find(x=>x.k===k);
    let v=inp.value.trim();
    if(c.type==='num')v=v===''?'':tvNum(v);
    else if(c.type==='pct')v=v===''?'':tvR(tvNum(v),3);
    else if(c.type==='date')v=tvDate(v);
    r[k]=v;
    inp.value=tvCellShow(c,r,T.calc(r));
    tvCalcCells(key,inp.closest('tr'),r);
    const tf=t.tFoot;if(tf)tf.innerHTML=tvFootHTML(key);
    tvChanged();});
  /* Enter = 아래 칸으로 (엑셀처럼) */
  t.addEventListener('keydown',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp||e.key!=='Enter')return;
    e.preventDefault();
    const i=+inp.dataset.i+(e.shiftKey?-1:1);
    const nx=t.querySelector(`input[data-i="${i}"][data-k="${inp.dataset.k}"]`);
    inp.blur();if(nx){nx.focus();nx.select();}});
  t.addEventListener('click',e=>{
    const d=e.target.closest('[data-tvdel]');if(!d)return;
    T.rows().splice(+d.dataset.tvdel,1);renderTvTable(key);tvChanged();});
  /* 엑셀에서 여러 칸을 복사해 붙이면 그 칸부터 펼친다 (모자라는 행은 새로 만든다) */
  t.addEventListener('paste',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp)return;
    const txt=(e.clipboardData||window.clipboardData).getData('text');
    if(!txt||!/[\t\n]/.test(txt.replace(/\n$/,'')))return;        /* 한 칸짜리는 평소대로 */
    e.preventDefault();
    const grid=txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));
    const edit=T.cols.filter(c=>c.type!=='calc');
    const c0=edit.findIndex(c=>c.k===inp.dataset.k),r0=+inp.dataset.i;
    const rows=T.rows();
    grid.forEach((line,dr)=>{
      while(rows.length<=r0+dr)rows.push(T.blank());
      const r=rows[r0+dr];
      line.forEach((v,dc)=>{const c=edit[c0+dc];if(!c)return;
        v=String(v).trim();
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)):c.type==='pct'?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):v;});});
    renderTvTable(key);tvChanged();});
}
function tvAddRow(key){
  const T=TV_TBL[key];T.rows().push(T.blank());renderTvTable(key);
  const t=$(T.id),last=t&&t.querySelector(`tbody tr[data-rd="${T.rows().length-1}"] input`);
  if(last){last.focus();last.scrollIntoView({block:'nearest'});}
  tvChanged();}
function tvWipe(key){
  const T=TV_TBL[key],n=T.rows().length;if(!n)return;
  confirmModal(`${key==='plan'?'TV 예상효율':'TV 리포트 데이터'}을 모두 지울까요?`,`${fmt(n)}행이 모두 사라집니다.`,
    ()=>{T.set([]);renderTvTable(key);tvChanged();},'모두 지우기');}
/* 엑셀 불러오기 — 첫 시트에서 머리글 줄을 찾아 이름으로 열을 맞춘다 (행을 이어 붙인다) */
const TV_HDR={
  date:['방송일','일자','날짜','방송일자','date'],time:['방송시간','시간','시작','시작시간','time'],
  ch:['채널','채널명','매체','channel'],prog:['프로그램','프로그램명','program'],
  grade:['시급','등급','grade'],dur:['초수','초','길이','sec','초(sec)'],
  cr:['소재','소재명','품목','creative'],cnt:['횟수','회수','집행횟수','count'],
  cost:['광고비','광고비(gross)','금액','집행금액','청약금액','cost'],
  price:['단가','price'],rating:['시청률','시청률(%)','예상시청률','예상시청률(%)','rating'],
  note:['비고','메모','note']};
const tvKey=s=>String(s==null?'':s).replace(/\s+/g,'').toLowerCase();
function tvImport(key,file){
  const run=f=>readGrid(f).then(grid=>{
    const T=TV_TBL[key],want=T.cols.filter(c=>c.type!=='calc');
    let hi=-1,map=null;
    for(let i=0;i<Math.min(grid.length,30)&&hi<0;i++){
      const row=grid[i]||[],m={};
      want.forEach(c=>{const names=(TV_HDR[c.k]||[c.l]).concat([c.l]).map(tvKey);
        const j=row.findIndex(v=>names.includes(tvKey(v)));if(j>=0&&!Object.values(m).includes(j))m[c.k]=j;});
      if(Object.keys(m).length>=2){hi=i;map=m;}}
    if(hi<0){confirmModal('머리글을 찾지 못했습니다.',
      `첫 시트에서 ${want.map(c=>c.l).join(' · ')} 같은 머리글 줄을 찾지 못했습니다.`,()=>{},'확인');return;}
    const out=[];
    grid.slice(hi+1).forEach(row=>{
      if(!row||!row.some(v=>String(v==null?'':v).trim()!==''))return;
      const r=T.blank();
      want.forEach(c=>{if(map[c.k]==null)return;let v=row[map[c.k]];v=v==null?'':String(v).trim();
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)):c.type==='pct'?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):v;});
      out.push(r);});
    T.rows().push(...out);renderTvTable(key);tvChanged();
    confirmModal(`${fmt(out.length)}행을 불러왔습니다.`,
      `맞춘 열: ${want.filter(c=>map[c.k]!=null).map(c=>c.l).join(' · ')}`,()=>{},'확인');
  }).catch(err=>confirmModal('파일을 읽지 못했습니다.',esc(String(err&&err.message||err)),()=>{},'확인'));
  (file instanceof Blob)?run(file):pickFile(run);}

/* ---------- TV 대시보드 ---------- */
function renderTvDash(){
  const box=$('tvKpis'),tb=$('tvChTbl');if(!box||!tb)return;
  const P=tvPlanTotal(),A=tvSpotTotal();
  const pc=(a,b)=>b?a/b:NaN;
  const card=(t,act,goal,fmtv,rate,sub)=>`<div class="tvkpi">
      <div class="tt">${t}</div>
      <div class="vv mono">${fmtv(act)}</div>
      <div class="gg">${goal!=null?`계획 <b class="mono">${fmtv(goal)}</b>`:''}${sub||''}</div>
      ${rate!=null?`<div class="bar"><i style="width:${Math.min(isFinite(rate)?rate:0,1)*100}%"></i></div>
      <div class="rr mono">${isFinite(rate)?(rate*100).toFixed(1)+'%':'–'}</div>`:''}</div>`;
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const g1=v=>isFinite(v)&&v?tvFmt1(v):'–';
  const n0=v=>isFinite(v)&&v?fmt(v):'–';
  const cprpDiff=(isFinite(A.cprp)&&isFinite(P.cprp)&&P.cprp)?(A.cprp/P.cprp-1):NaN;
  box.innerHTML=
    card('예산 소진',A.cost,P.amt,won0,pc(A.cost,P.amt))
   +card('GRP 달성',A.grp,P.grp,g1,pc(A.grp,P.grp))
   +card('CPRP',A.cprp,P.cprp,won0,null,isFinite(cprpDiff)
      ?` · <span class="${cprpDiff>0?'neg':'pos'}">계획 대비 ${cprpDiff>0?'+':''}${(cprpDiff*100).toFixed(1)}%</span>`:'')
   +card('집행 횟수',A.cnt,P.cnt,n0,pc(A.cnt,P.cnt));
  /* 채널별 */
  const chs=[...new Set(TV_PLAN.map(r=>r.ch).concat(TV_SPOTS.map(r=>r.ch)).map(v=>String(v||'').trim()).filter(Boolean))];
  const by=ch=>({p:tvPlanTotal(TV_PLAN.filter(r=>String(r.ch||'').trim()===ch)),
                 a:tvSpotTotal(TV_SPOTS.filter(r=>String(r.ch||'').trim()===ch))});
  const rows=chs.map(ch=>({ch,...by(ch)})).sort((x,y)=>(y.p.amt+y.a.cost)-(x.p.amt+x.a.cost));
  const pct1=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
  const tr=(nm,p,a,cls)=>`<tr${cls?` class="${cls}"`:''}><td class="head">${esc(nm)}</td>
      <td class="mono">${won0(p.amt)}</td><td class="mono">${won0(a.cost)}</td><td class="mono">${pct1(pc(a.cost,p.amt))}</td>
      <td class="mono gsep">${g1(p.grp)}</td><td class="mono">${g1(a.grp)}</td><td class="mono">${pct1(pc(a.grp,p.grp))}</td>
      <td class="mono gsep">${won0(p.cprp)}</td><td class="mono">${won0(a.cprp)}</td>
      <td class="mono gsep">${n0(p.cnt)}</td><td class="mono">${n0(a.cnt)}</td></tr>`;
  /* 머리글 정렬 (v72) */
  const cs=HP_SORT['tvch'];
  if(cs&&cs.dir){const idx={ch:r=>r.ch,amt:r=>r.p.amt,cost:r=>r.a.cost,spend:r=>pc(r.a.cost,r.p.amt),
      pgrp:r=>r.p.grp,grp:r=>r.a.grp,grpr:r=>pc(r.a.grp,r.p.grp),pcprp:r=>r.p.cprp,cprp:r=>r.a.cprp,pcnt:r=>r.p.cnt,cnt:r=>r.a.cnt}[cs.k];
    if(idx)rows.sort((x,y)=>hpCmp(idx(x),idx(y),cs.dir));}
  tb.innerHTML=`<thead><tr><th rowspan="2">채널</th><th colspan="3">예산</th><th colspan="3" class="gsep">GRP</th>
      <th colspan="2" class="gsep">CPRP</th><th colspan="2" class="gsep">집행 횟수</th></tr>
    <tr><th>계획 금액</th><th>집행 광고비</th><th>소진율</th><th class="gsep">계획</th><th>실적</th><th>달성률</th>
      <th class="gsep">계획</th><th>실적</th><th class="gsep">계획</th><th>실적</th></tr></thead><tbody>`
    +(rows.length?rows.map(r=>tr(r.ch,r.p,r.a)).join('')+tr('TOTAL',P,A,'total')
      :`<tr><td colspan="11" class="hint" style="padding:22px;text-align:center">아직 TV 데이터가 없습니다.</td></tr>`)
    +'</tbody>';
  {const r0=tb.tHead.rows[0].cells,r1=tb.tHead.rows[1].cells;
   const map=[['ch',r0[0],'채널'],['amt',r1[0],'계획 금액'],['cost',r1[1],'집행 광고비'],['spend',r1[2],'소진율'],
     ['pgrp',r1[3],'계획 GRP'],['grp',r1[4],'실적 GRP'],['grpr',r1[5],'GRP 달성률'],
     ['pcprp',r1[6],'계획 CPRP'],['cprp',r1[7],'실적 CPRP'],['pcnt',r1[8],'계획 횟수'],['cnt',r1[9],'실적 횟수']];
   wireHeadPops(map.map(([k,th,l])=>({th,k,label:l})),{cur:cs,scope:'tvch',
     onSort:(k,d)=>{if(d)HP_SORT['tvch']={k,dir:d};else delete HP_SORT['tvch'];renderTvDash();}});}
  /* 비어 있으면 어디서 넣는지 알려 준다 */
  const em=$('tvEmpty');
  if(em){const none=!TV_PLAN.length&&!TV_SPOTS.length;
    em.classList.toggle('hidden',!none);
    em.innerHTML=none?`<div class="notice"><span>ⓘ</span><div>${L(
      `TV 데이터가 아직 없습니다.
      <b>TV › 예상효율 입력</b>에 채널별 계획(횟수 · 단가 · 예상 시청률)을,
      <b>TV › 데이터 입력</b>에 실제 방송 실적(광고비 · 시청률)을 넣으면 여기에 모입니다.`,
      `No TV data yet. Enter per-channel plans (spots · unit price · expected rating) in
      <b>TV › Forecast input</b> and actual airing results (ad spend · rating) in
      <b>TV › Data input</b> — they'll be gathered here.`)}
      <span class="agency-only"><button class="btn sm" id="tvGoPlan">TV 예상효율 입력으로</button>
      <button class="btn sm" id="tvGoSpot">TV 리포트 데이터 입력으로</button></span></div></div>`:'';
    const gp=$('tvGoPlan'),gs=$('tvGoSpot');
    if(gp)gp.onclick=()=>switchTab('tvplan');if(gs)gs.onclick=()=>switchTab('tvinput');
    try{if(isClient())em.querySelectorAll('.agency-only').forEach(x=>x.classList.add('hidden'));}catch(e){}}
  const nt=$('tvDashNote');
  if(nt){const ds=TV_SPOTS.map(r=>r.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')).sort();
    nt.textContent=ds.length?`방송일 ${mdy(ds[0])}~${mdy(ds[ds.length-1])} · 실적 ${fmt(TV_SPOTS.length)}행`:'';}
}
/* ---------- TV 일자별 효율 (v72) — 방송 실적을 날짜별로 ---------- */
function tvEmptyNote(elId,show,ko,en){
  const em=$(elId);if(!em)return;
  em.classList.toggle('hidden',!show);
  em.innerHTML=show?`<div class="notice"><span>ⓘ</span><div>${L(ko,en)}</div></div>`:'';}
function renderTvDaily(){
  const tb=$('tvDailyTbl');if(!tb)return;
  const by=new Map();
  TV_SPOTS.forEach(r=>{const d=r.date;if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return;
    if(!by.has(d))by.set(d,[]);by.get(d).push(r);});
  const ds=[...by.keys()].sort();
  let cg=0,cc=0;
  let rows=ds.map(d=>{const t=tvSpotTotal(by.get(d));cg+=t.grp;cc+=t.cost;
    const dt=new Date(d+'T00:00:00');return {d,wd:dt.getDay(),...t,cumgrp:cg,cumcost:cc};});
  const all=tvSpotTotal(TV_SPOTS.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')));
  const srt=HP_SORT['tvdaily'];
  if(srt&&srt.dir){const f={date:r=>r.d,wd:r=>(r.wd+6)%7,spots:r=>r.cnt,cost:r=>r.cost,grp:r=>r.grp,cprp:r=>r.cprp,
      cumcost:r=>r.cumcost,cumgrp:r=>r.cumgrp}[srt.k];if(f)rows.sort((a,b)=>hpCmp(f(a),f(b),srt.dir));}
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const g1=v=>isFinite(v)&&v?tvFmt1(v):'–';
  const cols=[['date','방송일'],['wd','요일'],['spots','횟수'],['cost','광고비'],['grp','GRP'],['cprp','CPRP'],
    ['cumcost','누적 광고비'],['cumgrp','누적 GRP']];
  let h='<thead><tr>'+cols.map(([k,l],i)=>`<th${i>=2?' class="num"':''}>${l}</th>`).join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{const dt=new Date(r.d+'T00:00:00'),hol=(typeof holName==='function')?holName(dt):'';
    const cls=(r.wd===0||r.wd===6||hol)?' hol':'';
    h+=`<tr><td class="head mono${cls}"${hol?` title="${esc(hol)}"`:''}>${mdy(r.d)}</td><td class="head${cls}">${WD[r.wd]}</td>`
      +`<td class="mono">${fmt(r.cnt)}</td><td class="mono">${won0(r.cost)}</td><td class="mono">${g1(r.grp)}</td>`
      +`<td class="mono">${won0(r.cprp)}</td><td class="mono">${won0(r.cumcost)}</td><td class="mono">${g1(r.cumgrp)}</td></tr>`;});
  if(rows.length)h+=`<tr class="total"><td class="head" colspan="2">TOTAL</td><td class="mono">${fmt(all.cnt)}</td>`
    +`<td class="mono">${won0(all.cost)}</td><td class="mono">${g1(all.grp)}</td><td class="mono">${won0(all.cprp)}</td>`
    +`<td class="mono">${won0(all.cost)}</td><td class="mono">${g1(all.grp)}</td></tr>`;
  else h+=`<tr><td colspan="8" class="hint" style="padding:22px;text-align:center">${L('방송일이 적힌 실적이 아직 없습니다.','No airing results with dates yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  const ths=[...tb.tHead.rows[0].cells];
  wireHeadPops(cols.map(([k,l],i)=>({th:ths[i],k,label:l})),{cur:srt,scope:'tv',
    onSort:(k,d)=>{if(d)HP_SORT['tvdaily']={k,dir:d};else delete HP_SORT['tvdaily'];renderTvDaily();}});
  const nt=$('tvDailyNote');if(nt)nt.textContent=ds.length?`${mdy(ds[0])}~${mdy(ds[ds.length-1])} · ${fmt(ds.length)}일`:'';
  tvEmptyNote('tvDailyEmpty',!ds.length,
    'TV 실적이 아직 없습니다. <b>TV › 데이터 입력</b>에 방송일 · 광고비 · 시청률을 넣으면 날짜별로 모입니다.',
    'No TV results yet. Enter air date · ad spend · rating in <b>TV › Data input</b> and they will be grouped by date.');
}
/* ---------- TV 미디어믹스 (v72) — 계획(예상효율)을 채널 › 프로그램으로 ---------- */
function renderTvMix(){
  const tb=$('tvMixTbl');if(!tb)return;
  const P=tvPlanTotal();
  const chs=[...new Set(TV_PLAN.map(r=>String(r.ch||'').trim()||'(채널 없음)'))];
  const chRows=ch=>TV_PLAN.filter(r=>(String(r.ch||'').trim()||'(채널 없음)')===ch);
  const srt=HP_SORT['tvmix'];
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const g1=v=>isFinite(v)&&v?tvFmt1(v):'–';
  const p1=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
  const val=(k,rs,one)=>{const t=tvPlanTotal(rs);
    return {progs:rs.length,cnt:t.cnt,amt:t.amt,share:P.amt?t.amt/P.amt:NaN,grp:t.grp,grpshare:P.grp?t.grp/P.grp:NaN,cprp:t.cprp,
      price:one?tvNum(one.price):NaN,rating:one?tvNum(one.rating):NaN,dur:one?tvNum(one.dur):NaN,
      grade:one?String(one.grade||''):'',prog:one?String(one.prog||''):'',ch:one?String(one.ch||''):''}[k];};
  let order=chs.slice().sort((a,b)=>tvPlanTotal(chRows(b)).amt-tvPlanTotal(chRows(a)).amt);
  if(srt&&srt.dir){
    if(srt.k==='ch')order.sort((a,b)=>hpCmp(a,b,srt.dir));
    else if(!['prog','grade'].includes(srt.k))order.sort((a,b)=>hpCmp(val(srt.k,chRows(a)),val(srt.k,chRows(b)),srt.dir));}
  const cols=[['ch','채널'],['prog','프로그램'],['grade','시급'],['dur','초수'],['cnt','횟수'],['price','단가'],['amt','금액'],
    ['share','금액 비중'],['rating','예상 시청률'],['grp','예상 GRP'],['grpshare','GRP 비중'],['cprp','예상 CPRP']];
  let h='<thead><tr>'+cols.map(([k,l],i)=>`<th${[3,4,5,6,7,8,9,10,11].includes(i)?' class="num"':''}>${l}</th>`).join('')+'</tr></thead><tbody>';
  const tr=(rs,one,cls,first,span,chName)=>{
    const v=k=>val(k,rs,one);
    return `<tr${cls?` class="${cls}"`:''}>`
      +(first?`<td class="head"${span>1?` rowspan="${span}"`:''}>${esc(chName)}</td>`:'')
      +(cls==='sub'?`<td class="head" colspan="3">${esc(chName)} 소계</td>`
        :`<td class="head">${esc(v('prog')||'–')}</td><td>${esc(v('grade')||'–')}</td><td class="mono">${isFinite(v('dur'))&&v('dur')?fmt(v('dur'))+'초':'–'}</td>`)
      +`<td class="mono">${fmt(v('cnt'))}</td><td class="mono">${cls==='sub'?'':won0(v('price'))}</td>`
      +`<td class="mono">${won0(v('amt'))}</td><td class="mono">${p1(v('share'))}</td>`
      +`<td class="mono">${cls==='sub'?'':(isFinite(v('rating'))&&v('rating')?tvR(v('rating'),2)+'%':'–')}</td>`
      +`<td class="mono">${g1(v('grp'))}</td><td class="mono">${p1(v('grpshare'))}</td><td class="mono">${won0(v('cprp'))}</td></tr>`;};
  order.forEach(ch=>{
    let rs=chRows(ch).slice();
    if(srt&&srt.dir&&srt.k!=='ch')rs.sort((a,b)=>hpCmp(val(srt.k,[a],a),val(srt.k,[b],b),srt.dir));
    else rs.sort((a,b)=>tvPlanCalc(b).amt-tvPlanCalc(a).amt);
    rs.forEach((r,i)=>{h+=tr([r],r,'',i===0,rs.length+(rs.length>1?1:0),ch);});
    if(rs.length>1)h+=tr(rs,null,'sub',false,1,ch);});
  if(TV_PLAN.length)h+=`<tr class="total"><td class="head" colspan="4">TOTAL</td><td class="mono">${fmt(P.cnt)}</td><td></td>`
    +`<td class="mono">${won0(P.amt)}</td><td class="mono">100.0%</td><td></td><td class="mono">${g1(P.grp)}</td>`
    +`<td class="mono">100.0%</td><td class="mono">${won0(P.cprp)}</td></tr>`;
  else h+=`<tr><td colspan="12" class="hint" style="padding:22px;text-align:center">${L('TV 계획이 아직 없습니다.','No TV plan yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  const ths=[...tb.tHead.rows[0].cells];
  wireHeadPops(cols.map(([k,l],i)=>({th:ths[i],k,label:l})),{cur:srt,scope:'tv',
    onSort:(k,d)=>{if(d)HP_SORT['tvmix']={k,dir:d};else delete HP_SORT['tvmix'];renderTvMix();}});
  tvEmptyNote('tvMixEmpty',!TV_PLAN.length,
    'TV 계획이 아직 없습니다. <b>TV › 예상효율 입력</b>에 채널 · 프로그램 · 횟수 · 단가 · 예상 시청률을 넣으면 채널별 믹스로 모입니다.',
    'No TV plan yet. Enter channel · program · spots · unit price · expected rating in <b>TV › Forecast input</b> to build the channel mix.');
}
function renderTV(){
  try{renderTvTable('plan');}catch(e){console.warn(e);}
  try{renderTvTable('spot');}catch(e){console.warn(e);}
  try{renderTvDash();}catch(e){console.warn(e);}
  try{renderTvDaily();}catch(e){console.warn(e);}
  try{renderTvMix();}catch(e){console.warn(e);}}
/* 문서에 담기 · 되살리기 — serializeDoc / applyDoc 이 부른다 */
function tvForDoc(){return {plan:TV_PLAN.map(r=>({...r})),spots:TV_SPOTS.map(r=>({...r}))};}
function tvFromDoc(d){
  const t=d&&d.tv;
  TV_PLAN=Array.isArray(t&&t.plan)?t.plan.map(r=>({...r})):[];
  TV_SPOTS=Array.isArray(t&&t.spots)?t.spots.map(r=>({...r})):[];}

/* ---------- 연결 ---------- */
(function initTV(){
  const go=()=>{
    const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
    on('tvPlanAdd',()=>tvAddRow('plan'));on('tvSpotAdd',()=>tvAddRow('spot'));
    on('tvPlanAdd2',()=>tvAddRow('plan'));on('tvSpotAdd2',()=>tvAddRow('spot'));
    on('tvPlanWipe',()=>tvWipe('plan'));on('tvSpotWipe',()=>tvWipe('spot'));
    on('tvPlanUp',()=>tvImport('plan'));on('tvSpotUp',()=>tvImport('spot'));
    renderTV();applyMediaTabs();};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();
