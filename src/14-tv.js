/* ===== 14. 메뉴 · TV 캠페인 (v71 → v72) =====
   v72 — 메뉴를 두 줄로 나눴다.
     1줄: 영역(디지털 · TV · 트렌드 리포트) + 오른쪽 도구
     2줄: 고른 영역의 하위 메뉴(서머리 · 일자별 효율 · 미디어믹스 · 데이터 입력 · 예상효율 입력)
   설정 › 메뉴 설정에서 메뉴마다 **사용 여부**와 **광고주(뷰어)에게 보일지**를 정한다.
   TV 는 기본 틀 — 계획(예상효율) · 실적(리포트 데이터) 입력 표와 서머리 · 일자별 효율 · 미디어믹스.
   데이터는 캠페인 문서(doc.tv) 한 덩어리에 담긴다 → 서버 스키마를 바꾸지 않는다. */

/* ---------- 운영 영역(매체) ---------- */
/* 문서에 없으면(예전 캠페인) 디지털만 운영한 것으로 본다 */
/* v81 — OOH 영역 추가 {digital, tv, ooh} */
function campMedia(){
  const m=CAMPAIGN.media||{};
  const d=m.digital!==false, t=!!m.tv, o=!!m.ooh;
  return (d||t||o)?{digital:d,tv:t,ooh:o}:{digital:true,tv:false,ooh:false};}
function setCampMedia(m){
  const d=!!m.digital,t=!!m.tv,o=!!m.ooh;
  if(!d&&!t&&!o)return false;                  /* 최소 한 개는 있어야 캠페인이 성립한다 */
  CAMPAIGN.media={digital:d,tv:t,ooh:o};
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
  if(m.area==='ooh'&&!md.ooh)return false;
  const c=campMenus()[id];
  /* 기본이 '꺼짐'인 메뉴(주차별 퍼포먼스 · v135)는 켜 둔 경우에만 */
  if(m.udef===false)return !!(c&&c.on===true);
  return !(c&&c.on===false);}
/* 광고주(뷰어)에게 보이는가 — 입력 메뉴는 언제나 관리자 전용 */
function menuViewer(id){
  const m=MENU_BY[id];if(!m||m.kind!=='view')return false;
  if(id==='trend'){try{return trendVisibleToViewer();}catch(e){return true;}}
  const c=campMenus()[id];
  /* 기본이 '숨김'인 메뉴(전체 캠페인)는 켜 둔 경우에만 보인다 (v81) */
  if(m.vdef===false)return !!(c&&c.viewer===true);
  return !(c&&c.viewer===false);}
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
  const m=MENUS.find(x=>x.kind==='view'&&MEDIA_AREAS.includes(x.area)&&menuVisible(x.id))
    ||MENUS.find(x=>x.kind==='view'&&menuVisible(x.id))
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
  return ['struct','perf','table','mix'].find(n=>{const e=$('sub-'+n);return e&&!e.classList.contains('hidden');})||'perf';}
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
    if(on&&MEDIA_AREAS.includes(area)){
      const m=name==='dash'?MENUS.find(x=>x.tab==='dash'&&x.sub===cs):MENUS.find(x=>x.tab===name);
      lb=m?m.l:'';}
    const src=c.firstChild&&c.firstChild.__ko!=null?c.firstChild.__ko:c.textContent;
    if(src!==lb||(!lb&&c.textContent))c.textContent=lb;});
  T.querySelectorAll('.subgrp').forEach(g=>g.classList.toggle('cur',g.dataset.area===area));
  /* 전체 캠페인 하위 메뉴 이름 = "광고주명 캠페인 현황" (v82) */
  {const ob=T.querySelector('.megapop [data-tab="overview"]');
   if(ob){const adv=String(CAMPAIGN.advertiser||'').trim(),lb=adv?`${adv} 캠페인 현황`:'광고주 캠페인 현황';
     const src=ob.firstChild&&ob.firstChild.__ko!=null?ob.firstChild.__ko:ob.textContent;
     if(src!==lb)ob.textContent=lb;}}
  T.querySelectorAll('.subgrp [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===name));
  T.querySelectorAll('#subbar [data-sub]').forEach(b=>b.classList.toggle('on',name==='dash'&&b.dataset.sub===cs));
  /* 도구 — 영역 관리는 디지털 대시보드에서만, 페이지 저장(v112)은 보기 메뉴(대시보드 · 전체 캠페인)에서만 — 입력 화면은 빼고 */
  const sm=$('sectMngBtn');if(sm)sm.classList.toggle('tooloff',name!=='dash'||cs==='struct');   /* 캠페인 구조 화면에는 관리할 영역이 없다 (v120) */
  {const mk=name==='dash'?'view':((MENUS.find(x=>x.tab===name)||{}).kind||'');
   /* 트렌드 리포트(자료 게시판)는 그림으로 남길 내용이 아니라 뺀다 (v112.1) */
   const dl=T.querySelector('.dlgrp');if(dl)dl.classList.toggle('tooloff',mk!=='view'||name==='trend');
   /* 데이터 투어(v116)는 디지털 대시보드 › 서머리에서만 */
   const tb=$('tourBtn');if(tb)tb.classList.toggle('tooloff',!(name==='dash'&&cs==='perf'));}
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
    /* 판의 열 제목 = 상위 메뉴 (v82 — 판이 메뉴 줄을 덮으므로) — 누르면 그 영역으로 */
    T.addEventListener('click',e=>{const st=e.target.closest('.megapop .subttl');if(!st)return;
      const g=st.closest('.subgrp');closeAreaPop();if(g)switchTab(areaHome(g.dataset.area));});
    document.addEventListener('click',e=>{if(T.dataset.pop&&!e.target.closest('#tabs .arearow'))closeAreaPop();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&T.dataset.pop){closeAreaPop();
      const b=T.querySelector('.area.on');if(b)b.focus();}});
    addEventListener('resize',closeAreaPop);};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):go();})();
/* ---------- 주소창 = 지금 화면 (v75) ----------
   ?code=<코드>&menu=<메뉴>&lang=<ko|en> — 캠페인 · 메뉴 · 언어가 바뀔 때마다 주소를 고쳐 쓴다(뒤로 가기 기록은 쌓지 않음).
   주소창을 그대로 복사해 보내면 받는 사람도 같은 캠페인 · 같은 메뉴 · 같은 언어로 열린다.
   · 로그인한 시행사 → 그 캠페인의 **뷰어(광고주) 코드** — 복사해 보내도 조회 전용이다
   · 뷰어 코드로 들어온 화면 → 그 코드 (v121 — 링크 코드는 뷰어 코드뿐)
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
  if(CLOUD.shareView)return CLOUD.shareCode||'';
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
  const tmp=[$('darkToggle'),$('sectMngBtn'),t.querySelector('.dlgrp'),$('tourBtn')]
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
   영역(디지털 · TV · OOH) 켜기, 메뉴마다 사용 여부, 광고주(뷰어)에게 보일지.
   트렌드 리포트 · 전체 캠페인은 영역이 아니라 공용 메뉴 — 켜고 끄기만 한다 (v81) */
const AREA_SUB={digital:'디지털 캠페인 메뉴',tv:'TV 캠페인 메뉴',ooh:'OOH(옥외) 캠페인 메뉴 — 계획 · 소재만'};
function openMenuSettings(){
  const md=campMedia(),cm=campMenus();
  const st={media:{...md},menus:{}};
  MENUS.forEach(m=>{const c=cm[m.id]||{};
    st.menus[m.id]={on:m.udef===false?c.on===true:c.on!==false,viewer:m.id==='trend'?(()=>{try{return trendVisibleToViewer();}catch(e){return true;}})()
      :(m.kind==='view'&&(m.vdef===false?c.viewer===true:c.viewer!==false))};});
  /* 순서 · 이름은 실제 메뉴 줄과 같게 (v101) — 영역은 메뉴 줄의 순서(전체 캠페인 · 디지털 · TV · OOH · 트렌드),
     하위 메뉴는 그 영역 펼침판의 순서와 글자 그대로 */
  const T=$('tabs');
  const siteAreas=T?[...T.querySelectorAll('.arearow .area[data-area]')].map(b=>b.dataset.area):[];
  const areaOrder=siteAreas.length?siteAreas.filter(a=>MENUS.some(m=>m.area===a)).concat(['overview',...MEDIA_AREAS,'trend'].filter(a=>!siteAreas.includes(a))):['overview',...MEDIA_AREAS,'trend'];
  const siteBtn=id=>T&&T.querySelector(`.subgrp [data-menu="${id}"]`);
  const menusOf=a=>{const ms=MENUS.filter(m=>m.area===a);
    const pos=m=>{const b=siteBtn(m.id);if(!b)return 999;return [...T.querySelectorAll(`.subgrp[data-area="${a}"] [data-menu]`)].indexOf(b);};
    return ms.slice().sort((x,y)=>pos(x)-pos(y));};
  const lab=m=>{const b=siteBtn(m.id);const t=b&&b.textContent.trim();return t?esc(t):m.l;};
  const row=m=>`<tr data-mid="${m.id}"${MEDIA_AREAS.includes(m.area)?` data-marea="${m.area}"`:''}>
      <td class="mn">${lab(m)}${m.kind==='edit'?' <span class="mtag">입력</span>':''}</td>
      <td class="mc"><label class="mchk"><input type="checkbox" data-k="on"></label></td>
      <td class="mc">${m.kind==='view'?'<label class="mchk"><input type="checkbox" data-k="viewer"></label>'
        :'<span class="mfix">관리자 전용</span>'}</td></tr>`;
  const area=a=>`<tbody class="mgrp" data-area="${a}">
      <tr class="mhead"><td colspan="3"><label class="marea"><input type="checkbox" data-area="${a}">
        <b>${AREA_LABEL[a]}</b><i>${AREA_SUB[a]}</i></label></td></tr>
      ${menusOf(a).map(row).join('')}</tbody>`;
  /* 공용 메뉴(전체 캠페인 · 트렌드 리포트)도 이름 왼쪽 체크박스로 켜고 끈다 (v82) — 그 묶음 메뉴의 '사용' 과 같다 */
  const common=(a,sub)=>`<tbody class="mgrp" data-area="${a}"><tr class="mhead"><td colspan="3"><label class="marea">
         <input type="checkbox" data-common="${a}"><b>${AREA_LABEL[a]}</b><i>${sub}</i></label></td></tr>${menusOf(a).map(row).join('')}</tbody>`;
  const COMMON_SUB={overview:'같은 광고주의 모든 캠페인 — 광고비와 디지털 · TV · OOH 캠페인 목록',trend:'모든 캠페인이 함께 쓰는 자료 게시판'};
  const groups=areaOrder.map(a=>MEDIA_AREAS.includes(a)?area(a):common(a,COMMON_SUB[a]||'')).join('');
  const box=openModal('메뉴 설정',
    `<div class="hint" style="margin:-2px 0 12px">${L(`이번 캠페인에서 쓸 메뉴를 고르고, 광고주(뷰어)에게 보일지 정합니다.
      <b>디지털 · TV · OOH 중 최소 한 영역</b>은 켜야 합니다. 뷰어에게 숨긴 메뉴는 시행사 화면에서만 옅게 보입니다.`,
      `Choose the menus this campaign uses and whether advertisers (viewers) can see them.
      <b>At least one of Digital · TV · OOH</b> must be on. Menus hidden from viewers appear dimmed only on the agency screen.`)}</div>
     <table class="mset"><thead><tr><th>메뉴</th><th>사용</th><th>뷰어에게 보이기</th></tr></thead>
       ${groups}
     </table>
     <div class="hint" id="medMsg" style="margin-top:10px;min-height:18px"></div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="medOk">적용</button>',{w:620});
  const paint=()=>{
    box.querySelectorAll('input[data-area]').forEach(cb=>cb.checked=!!st.media[cb.dataset.area]);
    box.querySelectorAll('input[data-common]').forEach(cb=>cb.checked=MENUS.some(m=>m.area===cb.dataset.common&&st.menus[m.id].on));
    box.querySelectorAll('tr[data-mid]').forEach(tr=>{
      const id=tr.dataset.mid,s=st.menus[id],a=tr.dataset.marea,off=a&&!st.media[a];
      tr.classList.toggle('off',!!off);
      tr.querySelectorAll('input[data-k]').forEach(cb=>{cb.checked=!!s[cb.dataset.k];
        cb.disabled=!!off||(cb.dataset.k==='viewer'&&!s.on);});
      tr.classList.toggle('unused',!s.on);});
    box.querySelectorAll('tbody.mgrp').forEach(g=>g.classList.toggle('off',MEDIA_AREAS.includes(g.dataset.area)?!st.media[g.dataset.area]
      :!MENUS.some(m=>m.area===g.dataset.area&&st.menus[m.id].on)));};
  const check=()=>{
    if(!MEDIA_AREAS.some(a=>st.media[a]))return L('디지털 · TV · OOH 중 <b>최소 한 영역</b>은 켜야 합니다.','<b>At least one</b> of Digital · TV · OOH must be on.');
    for(const a of MEDIA_AREAS){
      if(st.media[a]&&!MENUS.some(m=>m.area===a&&st.menus[m.id].on))
        return L(`<b>${AREA_LABEL[a]}</b> 영역을 쓰려면 메뉴를 <b>한 개 이상</b> 켜 주세요.`,
          `Turn on <b>at least one</b> menu to use <b>${a==='tv'?'TV':a==='ooh'?'OOH':'Digital'}</b>.`);}
    const viewerAny=MENUS.some(m=>m.kind==='view'&&(!MEDIA_AREAS.includes(m.area)||st.media[m.area])&&st.menus[m.id].on&&st.menus[m.id].viewer);
    if(!viewerAny)return L('광고주(뷰어)에게 보일 메뉴가 <b>하나도 없습니다</b>. 한 개 이상 켜 주세요.',
      '<b>No menu</b> is visible to advertisers (viewers). Turn on at least one.');
    return '';};
  const say=()=>{const m=check();$('medMsg').innerHTML=m?`<span style="color:var(--neg)">${m}</span>`:'';return !m;};
  box.querySelectorAll('input[data-area]').forEach(cb=>cb.onchange=()=>{st.media[cb.dataset.area]=cb.checked;paint();say();});
  box.querySelectorAll('input[data-common]').forEach(cb=>cb.onchange=()=>{
    MENUS.filter(m=>m.area===cb.dataset.common).forEach(m=>{st.menus[m.id].on=cb.checked;});paint();say();});
  box.querySelectorAll('tr[data-mid] input[data-k]').forEach(cb=>cb.onchange=()=>{
    const id=cb.closest('tr').dataset.mid;st.menus[id][cb.dataset.k]=cb.checked;paint();say();});
  paint();
  const ok=$('medOk');
  if(ok)ok.onclick=()=>{
    if(!say())return;
    setCampMedia(st.media);
    const out={};
    MENUS.forEach(m=>{const s=st.menus[m.id],o={};
      if(m.udef===false){if(s.on)o.on=true;}else if(!s.on)o.on=false;
      /* 기본값과 다른 것만 적는다 — 기본 숨김(vdef:false) 메뉴는 보이게 켠 경우만 */
      if(m.kind==='view'&&m.id!=='trend'){
        if(m.vdef===false){if(s.viewer)o.viewer=true;}
        else if(!s.viewer)o.viewer=false;}
      if(Object.keys(o).length)out[m.id]=o;});
    CAMPAIGN.menus=out;
    try{TREND_VIEWER=!!st.menus.trend.viewer;paintTrendToggle();}catch(e){}
    closeModal();
    try{applyRole();}catch(e){applyMenus();}
    try{if(campMedia().tv)renderTV();}catch(e){}
    try{if(campMedia().ooh&&typeof renderOOH==='function')renderOOH();}catch(e){}
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
  {k:'price',l:'단가',type:'num',unit:'k',w:112},
  {k:'rating',l:'예상 시청률(%)',type:'pct',w:108},
  {k:'amt',l:'금액',type:'calc',unit:'k',w:124},
  {k:'grp',l:'예상 GRP',type:'calc',w:96},
  {k:'cprp',l:'예상 CPRP',type:'calc',unit:'k',w:110},
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
  {k:'cost',l:'광고비',type:'num',unit:'k',w:120},
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

/* ---------- 입력 표 (예상효율 · 리포트 데이터 공용 — v81 부터 OOH 도 이 틀을 쓴다) ----------
   base: 기본 열 · cols: 지금 보이는 열(설정 › 열 설정을 반영한 getter) · changed: 값이 바뀐 뒤 할 일 */
const TV_TBL={
  plan:{id:'tvPlanTbl',name:'TV 예상효율',base:TV_PLAN_COLS,get cols(){return tblCols('plan');},
    rows:()=>TV_PLAN,set:v=>{TV_PLAN=v;},calc:tvPlanCalc,total:rs=>tvPlanTotal(rs),
    blank:()=>({ch:'',prog:'',grade:'',dur:'',cnt:'',price:'',rating:'',note:''}),
    sum:'tvPlanSum',note:'tvPlanNote',changed:()=>tvChanged()},
  spot:{id:'tvSpotTbl',name:'TV 리포트 데이터',base:TV_SPOT_COLS,get cols(){return tblCols('spot');},
    rows:()=>TV_SPOTS,set:v=>{TV_SPOTS=v;},calc:tvSpotCalc,total:rs=>tvSpotTotal(rs),
    blank:()=>({date:'',time:'',ch:'',prog:'',grade:'',dur:'',cr:'',cnt:'',cost:'',rating:''}),
    sum:'tvSpotSum',note:'tvSpotNote',changed:()=>tvChanged()}};
/* ---------- 입력 표 열 설정 (v81) — 설정 › 열 설정 › TV · OOH ----------
   표마다 {hide:[열쇠], label:{열쇠:이름}, extra:[{k,l,type:'text'|'num'}]} — 캠페인 문서(doc.tblCols)에 담긴다.
   숨긴 열의 값은 지우지 않는다(다시 켜면 그대로). 직접 만든 열은 '비고' 앞에 붙는다 */
var TBL_CFG={};
const TBL_FIXED={plan:['ch'],spot:['date','ch'],ooh:['media','slot'],mix:['ch'],ch:['ch'],day:['date'],week:['wk'],seg:['seg']};
function tblCfg(key){
  const c=TBL_CFG[key]||(TBL_CFG[key]={});
  if(!Array.isArray(c.hide))c.hide=[];
  if(!c.label||typeof c.label!=='object')c.label={};
  if(!Array.isArray(c.extra))c.extra=[];
  return c;}
function tblColsAll(key){
  const T=TV_TBL[key],c=tblCfg(key);
  const base=T.base.map(x=>({...x,l:String(c.label[x.k]||'').trim()||x.l,base:x.l}));
  const ex=c.extra.map(x=>({k:x.k,l:String(c.label[x.k]||x.l||'').trim()||'새 열',base:x.l||'새 열',
    type:x.type==='num'?'num':'text',w:x.type==='num'?110:150,extra:true}));
  const ni=base.findIndex(x=>x.k==='note');
  return ni<0?base.concat(ex):base.slice(0,ni).concat(ex,base.slice(ni));}
function tblCols(key){
  const c=tblCfg(key),fx=TBL_FIXED[key]||[];
  return tblColsAll(key).filter(x=>fx.includes(x.k)||!c.hide.includes(x.k));}
function tblChanged(key){const T=TV_TBL[key];(T&&T.changed?T.changed:tvChanged)();}
function tblCfgForDoc(){
  const o={};Object.keys(TBL_CFG||{}).forEach(k=>{const c=tblCfg(k);
    if(c.hide.length||Object.keys(c.label).length||c.extra.length)o[k]=JSON.parse(JSON.stringify(c));});
  return o;}
function tblCfgFromDoc(d){
  TBL_CFG={};const t=d&&d.tblCols;
  if(t&&typeof t==='object')Object.keys(t).forEach(k=>{if(t[k]&&typeof t[k]==='object')TBL_CFG[k]=JSON.parse(JSON.stringify(t[k]));});}
/* 칸에 보여 줄 값 */
function tvCellShow(c,r,cv){
  const U=c.unit==='k'?1000:1;
  if(c.type==='calc'){
    const v=cv[c.k];
    if(c.k==='grp')return tvFmt1(v);
    return isFinite(v)&&v?fmt(v/U):'';}
  const v=r[c.k];
  if(v===''||v==null)return '';
  if(c.type==='num')return fmt(tvNum(v)/U);
  if(c.type==='pct')return String(tvR(tvNum(v),2));
  if(c.type==='dec')return String(tvR(tvNum(v),3));
  if(c.type==='month')return /^\d{4}-\d{2}$/.test(v)?tvMonthLabel(v):String(v);
  return String(v);}
function tvCalcCells(key,tr,r){
  const T=TV_TBL[key],cv=T.calc(r);
  tr.querySelectorAll('td[data-calc]').forEach(td=>{
    const c=T.cols.find(x=>x.k===td.dataset.calc);if(c)td.textContent=tvCellShow(c,r,cv);});}
function tvFootHTML(key){
  const T=TV_TBL[key],rows=T.rows();
  const tot=T.total(rows);
  return '<tr class="total"><td class="rm"></td>'+T.cols.map((c,i)=>{
    let v='';
    if(i===0)v='TOTAL';
    else if(c.extra){if(c.type==='num'){const n=sum(rows.map(r=>tvNum(r[c.k])));v=n?fmt(n):'';}}
    else if(T.foot)v=T.foot(c,tot)||'';
    else if(c.k==='cnt')v=fmt(tot.cnt);
    else if(c.k==='amt')v=fmt(tot.amt/(c.unit==='k'?1000:1));
    else if(c.k==='cost')v=fmt(tot.cost/(c.unit==='k'?1000:1));
    else if(c.k==='grp')v=tvFmt1(tot.grp);
    else if(c.k==='cprp')v=isFinite(tot.cprp)?fmt(tot.cprp/(c.unit==='k'?1000:1)):'';
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
        const num=c.type==='num'||c.type==='pct'||c.type==='dec';
        return `<td><input data-i="${i}" data-k="${c.k}" data-c="${ci}"${num?' inputmode="decimal" class="mono"':''}`
          +` value="${esc(tvCellShow(c,r,cv))}"${c.type==='date'?' placeholder="YYYY-MM-DD"':''}></td>`;}).join('')+'</tr>';});
  if(!rows.length)h+=`<tr class="tvempty"><td colspan="${T.cols.length+1}">${L('아직 입력한 행이 없습니다 — <b>+ 행 추가</b>를 누르거나 엑셀에서 복사해 첫 칸에 붙여 넣으세요.','No rows yet — click <b>+ Add row</b>, or copy cells in Excel and paste them into the first cell.')}</td></tr>`;
  h+='</tbody><tfoot>'+tvFootHTML(key)+'</tfoot>';
  t.innerHTML=h;
  const n=$(T.note);if(n)n.textContent=rows.length?`${fmt(rows.length)}행`:'';
  tvWire(key);
  enableRowMove(t,()=>({why:()=>'',apply:(from,to)=>{moveItem(T.rows(),from,to);renderTvTable(key);tblChanged(key);}}));
  /* 머리글 — 설명 + 정렬 (v72). 입력 표라 정렬하면 **행 순서가 실제로** 그 순서로 바뀐다 */
  const ths=[...t.tHead.rows[0].cells].slice(1);
  wireHeadPops(T.cols.map((c,i)=>({th:ths[i],k:c.k,label:c.l})),{scope:T.scope||'tv',
    onSort:(k,d)=>{if(!d)return;const c=T.cols.find(x=>x.k===k);
      const val=r=>{if(c.type==='calc')return T.calc(r)[k];const v=r[k];
        if(c.type==='num'||c.type==='pct'||c.type==='dec')return v===''||v==null?NaN:tvNum(v);return String(v==null?'':v);};
      const arr=T.rows().slice().sort((a,b)=>{const x=val(a),y=val(b);
        if(typeof x==='string'&&x===''&&y!=='')return 1;if(typeof y==='string'&&y===''&&x!=='')return -1;
        return hpCmp(x,y,d);});
      T.set(arr);renderTvTable(key);tblChanged(key);}});
}
/* 값이 바뀌었을 때 — 대시보드 · 저장 */
function tvChanged(){
  try{if(!$('tab-tvdash').classList.contains('hidden'))renderTvDash();}catch(e){}
  try{if(!$('tab-tvdaily').classList.contains('hidden'))renderTvDaily();}catch(e){}
  try{if(!$('tab-tvweekly').classList.contains('hidden'))renderTvWeekly();}catch(e){}
  try{if(!$('tab-tvmix').classList.contains('hidden'))renderTvMix();}catch(e){}
  /* 전체 Reach 는 일자표의 마지막 누적 Reach 를 따른다 — 채널표 · 일자표 합계 줄도 함께 (v132) */
  try{['ch','day','seg'].forEach(x=>{const t=$(TV_TBL[x].id);if(t&&t.tFoot)t.tFoot.innerHTML=tvFootHTML(x);});tvPaintMeta();}catch(e){}
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
    if(c.type==='num')v=v===''?'':tvNum(v)*(c.unit==='k'?1000:1);
    else if(c.type==='pct'||c.type==='dec')v=v===''?'':tvR(tvNum(v),3);
    else if(c.type==='date')v=tvDate(v);
    else if(c.type==='month')v=tvYm(v);
    r[k]=v;
    inp.value=tvCellShow(c,r,T.calc(r));
    tvCalcCells(key,inp.closest('tr'),r);
    const tf=t.tFoot;if(tf)tf.innerHTML=tvFootHTML(key);
    tblChanged(key);});
  /* Enter = 아래 칸으로 (엑셀처럼) */
  t.addEventListener('keydown',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp||e.key!=='Enter')return;
    e.preventDefault();
    const i=+inp.dataset.i+(e.shiftKey?-1:1);
    const nx=t.querySelector(`input[data-i="${i}"][data-k="${inp.dataset.k}"]`);
    inp.blur();if(nx){nx.focus();nx.select();}});
  t.addEventListener('click',e=>{
    const d=e.target.closest('[data-tvdel]');if(!d)return;
    T.rows().splice(+d.dataset.tvdel,1);renderTvTable(key);tblChanged(key);});
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
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)*(c.unit==='k'?1000:1)):(c.type==='pct'||c.type==='dec')?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):c.type==='month'?tvYm(v):v;});});
    renderTvTable(key);tblChanged(key);});
}
function tvAddRow(key){
  const T=TV_TBL[key];T.rows().push(T.blank());renderTvTable(key);
  const t=$(T.id),last=t&&t.querySelector(`tbody tr[data-rd="${T.rows().length-1}"] input`);
  if(last){last.focus();last.scrollIntoView({block:'nearest'});}
  tblChanged(key);}
function tvWipe(key){
  const T=TV_TBL[key],n=T.rows().length;if(!n)return;
  confirmModal(`${T.name||'표'} 데이터를 모두 지울까요?`,`${fmt(n)}행이 모두 사라집니다.`,
    ()=>{T.set([]);renderTvTable(key);tblChanged(key);},'모두 지우기');}
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
/* 머리글 줄 찾기 — 앞쪽 30줄 안에서 아는 이름이 두 개 이상 있는 줄. 없으면 null */
function tvFindHeader(grid,want){
  for(let i=0;i<Math.min(grid.length,30);i++){
    const row=grid[i]||[],m={};
    want.forEach(c=>{const names=(c.extra?[]:(TV_HDR[c.k]||[])).concat([c.l,c.base||c.l]).map(tvKey);
      const j=row.findIndex(v=>names.includes(tvKey(v)));if(j>=0&&!Object.values(m).includes(j))m[c.k]=j;});
    if(Object.keys(m).length>=2)return {hi:i,map:m};}
  return null;}
/* 같은 행인지 가르는 열쇠 — 직접 입력하는 칸 전부(계산 열 제외)를 정리한 값으로 비교한다 */
function tvRowKey(key,r){
  return tblColsAll(key).filter(c=>c.type!=='calc').map(c=>{
    const v=r[c.k];
    if(v===''||v==null)return '';
    if(c.type==='num')return String(tvNum(v));
    if(c.type==='pct'||c.type==='dec')return String(tvR(tvNum(v),3));
    if(c.type==='date')return tvDate(v);
    if(c.type==='month')return tvYm(v);
    return String(v).trim();}).join('\u0001');}
function tvImport(key,file){
  /* 숨긴 열 · 직접 만든 열까지 머리글로 맞춘다 (v81) */
  const T=TV_TBL[key],want=tblColsAll(key).filter(c=>c.type!=='calc');
  /* 시트가 여러 장이면 머리글이 맞는 첫 시트를 읽는다 */
  const run=f=>readGrid(f,g=>!!tvFindHeader(g,want)).then(grid=>{
    const h=tvFindHeader(grid,want);
    if(!h){confirmModal('머리글을 찾지 못했습니다.',
      `첫 시트에서 ${want.map(c=>c.l).join(' · ')} 같은 머리글 줄을 찾지 못했습니다.`,()=>{},'확인');return;}
    const {hi,map}=h,pct=grid.__pct||new Set();
    const out=[];let tot=0;
    grid.slice(hi+1).forEach((row,di)=>{
      if(!row||!row.some(v=>String(v==null?'':v).trim()!==''))return;
      /* 합계 · 소계 줄은 행이 아니다 (v81 — OOH 계획표처럼 맨 아래 합계가 있으면 광고비가 두 배가 됐다) */
      if(typeof isTotalRow==='function'&&isTotalRow(row)){tot++;return;}
      const r=T.blank();
      want.forEach(c=>{if(map[c.k]==null)return;let v=row[map[c.k]];
        /* v134 — 구분별 표의 금액 칸은 머리글에 단위가 없으면 천원 (v132.1 규칙과 같게) */
        if(['seg','wkch','wkseg'].includes(key)&&c.unit==='k'&&v!=null&&String(v).trim()!==''){const t=String((grid[hi]||[])[map[c.k]]||'');
          const sc=/백만/.test(t)?1e6:/천원/.test(t)?1e3:/\(\s*원\s*\)/.test(t)?1:1e3;v=tvNum(v)*sc;}
        /* 엑셀에서 % 서식인 시청률 칸은 0.052 로 들어온다 — 직접 적은 5.2 와 같은 %p 로 맞춘다 (v78) */
        if(c.type==='pct'&&typeof v==='number'&&pct.has((hi+1+di)+','+map[c.k]))v=v*100;
        v=v==null?'':String(v).trim();
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)):(c.type==='pct'||c.type==='dec')?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):v;});
      out.push(r);});
    /* 표에 이미 있는 행과 모든 칸이 같은 행은 건너뛴다 — 같은 파일을 다시 불러와도 광고비가 두 배가 되지 않게 (v78).
       파일 안에서 서로 같은 행은 그대로 둔다 (같은 스팟이 실제로 두 번 나갈 수 있다) */
    const have=new Map();
    T.rows().forEach(r=>{const k=tvRowKey(key,r);have.set(k,(have.get(k)||0)+1);});
    let dup=0;
    const add=out.filter(r=>{const k=tvRowKey(key,r),n=have.get(k)||0;
      if(n>0){have.set(k,n-1);dup++;return false;}
      return true;});
    if(add.length){T.rows().push(...add);renderTvTable(key);tblChanged(key);}
    const notes=[`맞춘 열: ${want.filter(c=>map[c.k]!=null).map(c=>c.l).join(' · ')}`];
    if(dup)notes.push(`중복 ${fmt(dup)}행은 건너뛰었습니다. 표에 이미 있는 행과 모든 칸이 같습니다.`);
    if(tot)notes.push(`합계 · 소계 줄 ${fmt(tot)}개는 건너뛰었습니다.`);
    confirmModal(add.length?`${fmt(add.length)}행을 불러왔습니다.`:'새로 불러올 행이 없습니다.',
      notes.concat(gridNotes(grid)).map(esc).join('<br>'),()=>{},'확인',true);
  }).catch(err=>confirmModal('파일을 읽지 못했습니다.',esc(String(err&&err.message||err)),()=>{},'확인'));
  (file instanceof Blob)?run(file):pickFile(run);}

/* ===== v132 — 요약형 TV 데이터 (BMW THE NEW 7 피드백) =====
   렙사 · 매체사가 주는 TV 리포트는 스팟 한 건 한 건이 아니라 **채널별 집행 합계**와 **일자별 퍼포먼스**다.
   Reach 1+ 는 중복이 빠진 값이라 채널 · 날짜끼리 더하면 안 된다 → 전체 Reach 는 따로 쓴다
   (일자표의 마지막 누적 Reach 1+, 없으면 채널표 '계' 줄 · 직접 입력).
   계획도 채널 단위 — 월별 예산 · 월별 노출 횟수 · 예상 GRP · 예상 Reach 1+ (전체 예상 Reach 는 따로).
   예전 형식(프로그램별 계획 TV_PLAN · 스팟 실적 TV_SPOTS)은 그대로 두고, 새 표가 비어 있으면 그걸로 보여 준다. */
let TV_MIX=[],TV_CH=[],TV_DAY=[];
let TV_META={target:'',planReach:'',reach:'',reach3:''};
const tvIsoOk=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'');
/* 캠페인 기간의 달 — 디지털 라인 기간 + TV 방송일 */
function tvMonthRange(){
  const ds=[campStart(),campEnd()].concat(TV_DAY.map(r=>r.date),TV_SPOTS.map(r=>r.date))
    .map(d=>String(d||'').slice(0,10)).filter(tvIsoOk).sort();
  if(!ds.length)return [];
  let y=+ds[0].slice(0,4),m=+ds[0].slice(5,7);const y1=+ds[ds.length-1].slice(0,4),m1=+ds[ds.length-1].slice(5,7);
  const out=[];
  while((y<y1||(y===y1&&m<=m1))&&out.length<24){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}
  return out;}
/* v132.2 — 채널별 계획은 한 줄에 '채널 · 월 · 예산 · 횟수 · 예상 GRP · 예상 Reach 1+' (월은 한 열).
   월을 비운 줄은 채널 전체 값(예: 채널 전체 예상 Reach)으로 본다.
   예전 가로형(a@YYYY-MM · c@YYYY-MM 열)은 문서를 읽을 때 월별 줄로 풀어 둔다 */
/* 달 글자 → 'YYYY-MM'. '10월' · '10' 은 캠페인 시작 연도의 달(시작 달보다 앞이면 다음 해) */
function tvYm(v){
  if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}`;
  const s=String(v==null?'':v).trim();if(!s)return '';
  let m=/^(\d{4})\s*[-./년]\s*(\d{1,2})/.exec(s);
  if(m&&+m[2]>=1&&+m[2]<=12)return `${m[1]}-${m[2].padStart(2,'0')}`;
  m=/^(\d{1,2})\s*월?$/.exec(s)||/^(\d{1,2})\s*월/.exec(s);
  if(m&&+m[1]>=1&&+m[1]<=12){const s0=String(campStart()||'').slice(0,10);
    const y0=tvIsoOk(s0)?+s0.slice(0,4):new Date().getFullYear(),m0=tvIsoOk(s0)?+s0.slice(5,7):1,mm=+m[1];
    return `${mm<m0?y0+1:y0}-${String(mm).padStart(2,'0')}`;}
  return s;}
const tvYmOk=v=>/^\d{4}-\d{2}$/.test(v||'');
/* 예전 가로형 줄 → 월별 줄 (GRP · Reach 는 그 채널의 첫 줄에) */
function tvMixLong(rows){
  const out=[];
  (rows||[]).forEach(r=>{
    const yms=[...new Set(Object.keys(r).map(k=>{const m=/^[ac]@(\d{4}-\d{2})$/.exec(k);return m?m[1]:null;}).filter(Boolean))].sort();
    if(!yms.length){out.push({ch:r.ch||'',ym:r.ym||'',amt:tvHas(r.amt)?r.amt:'',cnt:tvHas(r.cnt)?r.cnt:'',
      grp:tvHas(r.grp)?r.grp:'',reach:tvHas(r.reach)?r.reach:'',note:r.note||''});return;}
    yms.forEach((ym,i)=>{const a=r['a@'+ym],c=r['c@'+ym];
      out.push({ch:r.ch||'',ym,amt:tvHas(a)?a:'',cnt:tvHas(c)?c:'',grp:i===0&&tvHas(r.grp)?r.grp:'',
        reach:i===0&&tvHas(r.reach)?r.reach:'',note:i===0?(r.note||''):''});});});
  return out;}
/* 화면에 쓰는 달 — 예산 · 횟수가 있는 달만 (없으면 캠페인 기간의 달) */
function tvMixMonthsUsed(){
  const s=new Set(TV_MIX.filter(r=>tvYmOk(r.ym)&&(tvNum(r.amt)||tvNum(r.cnt))).map(r=>r.ym));
  return s.size?[...s].sort():tvMonthRange();}
/* 달 이름 — 캠페인이 달 중간에 시작 · 끝나면 '10월 (16일~)' · '12월 (~20일)' */
function tvMonthLabel(ym,withDays){
  const m=+ym.slice(5,7);let t=m+'월';
  if(withDays){
    const s=String(campStart()||'').slice(0,10),e=String(campEnd()||'').slice(0,10);
    if(tvIsoOk(s)&&s.slice(0,7)===ym&&+s.slice(8)>1)t+=` (${+s.slice(8)}일~)`;
    if(tvIsoOk(e)&&e.slice(0,7)===ym){const last=new Date(+ym.slice(0,4),m,0).getDate();if(+e.slice(8)<last)t+=` (~${+e.slice(8)}일)`;}}
  return t;}
const TV_MIX_COLS=[
  {k:'ch',l:'채널',type:'text',w:130},
  {k:'ym',l:'월',type:'month',w:80},
  {k:'amt',l:'예산',type:'num',unit:'k',w:124},
  {k:'cnt',l:'횟수',type:'num',w:84},
  {k:'grp',l:'예상 GRP',type:'dec',w:96},
  {k:'reach',l:'예상 Reach 1+(%)',type:'pct',w:128},
  {k:'note',l:'비고',type:'text',w:170}];
function tvMixCalc(r){
  let amt=tvNum(r&&r.amt),cnt=tvNum(r&&r.cnt);
  Object.keys(r||{}).forEach(k=>{if(/^a@/.test(k))amt+=tvNum(r[k]);else if(/^c@/.test(k))cnt+=tvNum(r[k]);});
  return {amt,cnt};}
function tvMixTotal(rows){
  rows=rows||TV_MIX;let amt=0,cnt=0,grp=0;
  rows.forEach(r=>{const c=tvMixCalc(r);amt+=c.amt;cnt+=c.cnt;grp+=tvNum(r.grp);});
  return {amt,cnt,grp,reach:tvHas(TV_META.planReach)?tvNum(TV_META.planReach):NaN};}
const TV_CH_COLS=[
  {k:'ch',l:'채널',type:'text',w:130},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:124},
  {k:'cnt',l:'횟수',type:'num',w:80},
  {k:'grp',l:'GRP',type:'dec',w:90},
  {k:'reach',l:'Reach 1+(%)',type:'pct',w:108},
  {k:'note',l:'비고',type:'text',w:170}];
const TV_DAY_COLS=[
  {k:'date',l:'방송일',type:'date',w:112},
  {k:'cnt',l:'횟수',type:'num',w:80},
  {k:'grp',l:'GRP',type:'dec',w:90},
  {k:'reach',l:'Reach 1+(%)',type:'pct',w:108},
  {k:'cumgrp',l:'누적 GRP',type:'dec',w:96},
  {k:'cumreach',l:'누적 Reach 1+(%)',type:'pct',w:128}];
function tvChTotal(rows){
  let cnt=0,cost=0,grp=0;(rows||TV_CH).forEach(r=>{cnt+=tvNum(r.cnt);cost+=tvNum(r.cost);grp+=tvNum(r.grp);});
  return {cnt,cost,grp};}
/* 날짜가 맞는 일자 행 — 날짜순 */
const tvDays=()=>TV_DAY.filter(r=>tvIsoOk(r.date)).slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
const tvHas=v=>!(v===''||v==null);
/* 전체(중복 제거) Reach 1+ — 일자표의 마지막 누적 Reach → 없으면 채널표 '계' 줄 · 직접 입력 */
function tvActReach(){
  const d=tvDays().filter(r=>tvHas(r.cumreach));
  if(d.length)return tvNum(d[d.length-1].cumreach);
  /* 일자별이 없으면 주차별의 마지막 누적 Reach (v135) */
  const w=tvWeeks().filter(r=>tvHas(r.cumreach));
  if(w.length)return tvNum(w[w.length-1].cumreach);
  return tvHas(TV_META.reach)?tvNum(TV_META.reach):NaN;}
/* ---------- 주차별 퍼포먼스 (v135) — 리포트에 일별 값이 없고 주별만 있을 때 ----------
   한 줄 = 한 주: 주차 · 시작일 · 종료일 · 횟수 · 집행 광고비 · GRP · eq.GRP · Reach 1+ · Reach 3+ · 누적 GRP · 누적 Reach 1+ */
let TV_WEEK=[];
/* v136 — 주차 × 채널 · 주차별 시청률 · 구분 × 주차 (화면 · 표는 28-tvweek.js) */
let TV_WKCH=[],TV_WKRT=[],TV_WKSEG=[];
const TV_WEEK_COLS=[
  {k:'wk',l:'주차',type:'text',w:90},
  {k:'start',l:'시작일',type:'date',w:112},
  {k:'end',l:'종료일',type:'date',w:112},
  {k:'cnt',l:'횟수',type:'num',w:80},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:120},
  {k:'grp',l:'GRP',type:'dec',w:90},
  {k:'eqgrp',l:'eq.GRP',type:'dec',w:90},
  {k:'nlsn',l:'닐슨 금액',type:'num',unit:'k',w:120},
  {k:'bonus',l:'보너스 금액',type:'num',unit:'k',w:120},
  {k:'reach',l:'Reach 1+(%)',type:'pct',w:104},
  {k:'reach3',l:'Reach 3+(%)',type:'pct',w:104},
  {k:'cumgrp',l:'누적 GRP',type:'dec',w:96},
  {k:'cumreach',l:'누적 Reach 1+(%)',type:'pct',w:128},
  {k:'note',l:'비고',type:'text',w:150}];
/* 값이 있는 주 — 시작일이 있으면 날짜순, 없으면 적은 순서 */
const tvWeeks=()=>{const ws=TV_WEEK.filter(r=>String(r.wk||'').trim()||tvIsoOk(r.start)||tvHas(r.grp)||tvHas(r.cnt));
  return ws.every(r=>tvIsoOk(r.start))?ws.slice().sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0):ws;};
const tvWkLabel=(r,i)=>String(r.wk||'').trim()||`${i+1}주차`;
TV_TBL.week={id:'tvWkInTbl',name:'TV 주차별 실적',base:TV_WEEK_COLS,get cols(){return tblCols('week');},
  rows:()=>TV_WEEK,set:v=>{TV_WEEK=v;},calc:()=>({}),
  total:rs=>{const o={cnt:0,cost:0,grp:0,eqgrp:0,nlsn:0,bonus:0};(rs||TV_WEEK).forEach(r=>Object.keys(o).forEach(k=>o[k]+=tvNum(r[k])));return o;},
  foot:(c,t)=>{
    if(c.k==='cnt')return t.cnt?fmt(t.cnt):'';
    if(c.k==='cost'||c.k==='nlsn'||c.k==='bonus')return t[c.k]?fmt(t[c.k]/1000):'';
    if(c.k==='grp'||c.k==='eqgrp')return t[c.k]?String(tvR(t[c.k],3)):'';
    if(c.k==='cumgrp'){const g=tvWeeks().filter(r=>tvHas(r.cumgrp));return g.length?String(tvR(tvNum(g[g.length-1].cumgrp),3)):(t.grp?String(tvR(t.grp,3)):'');}
    if(c.k==='reach'||c.k==='cumreach'){const v=tvActReach();return isFinite(v)?String(tvR(v,2)):'';}
    if(c.k==='reach3')return tvHas(TV_META.reach3)?String(tvR(tvNum(TV_META.reach3),2)):'';
    return '';},
  blank:()=>({wk:'',start:'',end:'',cnt:'',cost:'',grp:'',eqgrp:'',nlsn:'',bonus:'',reach:'',reach3:'',cumgrp:'',cumreach:'',note:''}),
  note:'tvWkInNote',changed:()=>tvChanged()};
TV_TBL.mix={id:'tvMixInTbl',name:'TV 채널별 월 계획',base:TV_MIX_COLS,get cols(){return tblCols('mix');},
  rows:()=>TV_MIX,set:v=>{TV_MIX=v;},calc:()=>({}),total:rs=>tvMixTotal(rs),
  foot:(c,t)=>{
    if(c.k==='amt')return t.amt?fmt(t.amt/1000):'';
    if(c.k==='cnt')return t.cnt?fmt(t.cnt):'';
    if(c.k==='grp')return t.grp?String(tvR(t.grp,3)):'';
    if(c.k==='reach')return isFinite(t.reach)?String(tvR(t.reach,2)):'';
    return '';},
  blank:()=>({ch:'',ym:'',amt:'',cnt:'',grp:'',reach:'',note:''}),note:'tvMixInNote',changed:()=>tvChanged()};
TV_TBL.ch={id:'tvChInTbl',name:'TV 채널별 실적',base:TV_CH_COLS,get cols(){return tblCols('ch');},
  rows:()=>TV_CH,set:v=>{TV_CH=v;},calc:()=>({}),total:rs=>tvChTotal(rs),
  foot:(c,t)=>{
    if(c.k==='cost')return t.cost?fmt(t.cost/1000):'';
    if(c.k==='cnt')return t.cnt?fmt(t.cnt):'';
    if(c.k==='grp')return t.grp?String(tvR(t.grp,3)):'';
    if(c.k==='reach'){const v=tvActReach();return isFinite(v)?String(tvR(v,2)):'';}
    return '';},
  blank:()=>({ch:'',cost:'',cnt:'',grp:'',reach:'',note:''}),note:'tvChInNote',changed:()=>tvChanged()};
TV_TBL.day={id:'tvDayInTbl',name:'TV 일자별 실적',base:TV_DAY_COLS,get cols(){return tblCols('day');},
  rows:()=>TV_DAY,set:v=>{TV_DAY=v;},calc:()=>({}),
  total:rs=>{let cnt=0,grp=0;(rs||TV_DAY).forEach(r=>{cnt+=tvNum(r.cnt);grp+=tvNum(r.grp);});return {cnt,grp};},
  foot:(c,t)=>{
    const ds=tvDays();
    if(c.k==='cnt')return t.cnt?fmt(t.cnt):'';
    if(c.k==='grp')return t.grp?String(tvR(t.grp,3)):'';
    if(c.k==='cumgrp'){const g=ds.filter(r=>tvHas(r.cumgrp));return g.length?String(tvR(tvNum(g[g.length-1].cumgrp),3)):(t.grp?String(tvR(t.grp,3)):'');}
    if(c.k==='reach'||c.k==='cumreach'){const v=tvActReach();return isFinite(v)?String(tvR(v,2)):'';}
    return '';},
  blank:()=>({date:'',cnt:'',grp:'',reach:'',cumgrp:'',cumreach:''}),note:'tvDayInNote',changed:()=>tvChanged()};

/* ---------- v134 — 구분(품목)별 계획 · 실적 (코웨이처럼 한 캠페인에 품목 여러 개가 TV 에 나갈 때) ----------
   채널표와 따로 둔다: 리포트가 품목별로는 GRP · eq.GRP · Reach 를, 채널별로는 광고비를 준다(품목별 광고비가 없는 경우가 많다).
   Reach 는 품목끼리도 더하지 않는다 → TOTAL 은 전체 Reach(일자표 · 위 칸). 비어 있으면 서머리에 이 표가 보이지 않는다 */
let TV_SEG=[];
const TV_SEG_COLS=[
  {k:'seg',l:'구분',type:'text',w:130},
  {k:'amt',l:'계획 예산',type:'num',unit:'k',w:116},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:116},
  {k:'pgrp',l:'계획 GRP',type:'dec',w:90},
  {k:'grp',l:'실적 GRP',type:'dec',w:90},
  {k:'peq',l:'계획 eq.GRP',type:'dec',w:100},
  {k:'eq',l:'실적 eq.GRP',type:'dec',w:100},
  {k:'preach',l:'계획 Reach 1+(%)',type:'pct',w:120},
  {k:'reach',l:'실적 Reach 1+(%)',type:'pct',w:120},
  {k:'preach3',l:'계획 Reach 3+(%)',type:'pct',w:120},
  {k:'reach3',l:'실적 Reach 3+(%)',type:'pct',w:120},
  {k:'pcnt',l:'계획 횟수',type:'num',w:84},
  {k:'cnt',l:'실적 횟수',type:'num',w:84},
  {k:'note',l:'비고',type:'text',w:170}];
function tvSegTotal(rows){
  const o={amt:0,cost:0,pgrp:0,grp:0,peq:0,eq:0,pcnt:0,cnt:0};
  (rows||TV_SEG).forEach(r=>Object.keys(o).forEach(k=>o[k]+=tvNum(r[k])));return o;}
TV_TBL.seg={id:'tvSegInTbl',name:'TV 구분별 계획 · 실적',base:TV_SEG_COLS,get cols(){return tblCols('seg');},
  rows:()=>TV_SEG,set:v=>{TV_SEG=v;},calc:()=>({}),total:rs=>tvSegTotal(rs),
  foot:(c,t)=>{
    if(c.k==='amt'||c.k==='cost')return t[c.k]?fmt(t[c.k]/1000):'';
    if(c.k==='pcnt'||c.k==='cnt')return t[c.k]?fmt(t[c.k]):'';
    if(['pgrp','grp','peq','eq'].includes(c.k))return t[c.k]?String(tvR(t[c.k],3)):'';
    if(c.k==='reach'){const v=tvActReach();return isFinite(v)?String(tvR(v,2)):'';}
    if(c.k==='preach')return tvHas(TV_META.planReach)?String(tvR(tvNum(TV_META.planReach),2)):'';
    if(c.k==='reach3')return tvHas(TV_META.reach3)?String(tvR(tvNum(TV_META.reach3),2)):'';
    return '';},
  blank:()=>({seg:'',amt:'',cost:'',pgrp:'',grp:'',peq:'',eq:'',preach:'',reach:'',preach3:'',reach3:'',pcnt:'',cnt:'',note:''}),
  note:'tvSegInNote',changed:()=>tvChanged()};
const tvSegRows=()=>TV_SEG.filter(r=>String(r.seg||'').trim());

/* ---------- 채널 이름 맞추기 — 계획(TV조선)과 리포트(TV CHOSUN)가 다르게 적어도 같은 채널로 ---------- */
const TV_CH_ALIAS={tvchosun:'tv조선',chosun:'tv조선',tv조선:'tv조선',조선tv:'tv조선',channela:'채널a',채널a:'채널a',
  kbs2tv:'kbs2',kbs2:'kbs2',kbs1tv:'kbs1',kbs1:'kbs1',mbctv:'mbc',sbstv:'sbs',jtbctv:'jtbc'};
const tvChId=s=>{const k=tvKey(s).replace(/[·\-_.]/g,'');return TV_CH_ALIAS[k]||k;};

/* ---------- 채널별 월 계획 → 채널로 묶기 (입력 순서). Reach 는 더하지 않는다:
   한 줄에만 적었으면 그 값, 여러 달에 적었으면 가장 큰 값(누적 Reach 는 달이 갈수록 커지므로) ---------- */
function tvMixByCh(){
  const by=new Map(),out=[];
  TV_MIX.forEach(r=>{const ch=String(r.ch||'').trim();if(!ch)return;const id=tvChId(ch);
    let o=by.get(id);if(!o){o={ch,m:{},amt:0,cnt:0,grp:0,reach:NaN};by.set(id,o);out.push(o);}
    const c=tvMixCalc(r);o.amt+=c.amt;o.cnt+=c.cnt;o.grp+=tvNum(r.grp);
    if(tvYmOk(r.ym)){const x=o.m[r.ym]||(o.m[r.ym]={amt:0,cnt:0});x.amt+=tvNum(r.amt);x.cnt+=tvNum(r.cnt);}
    if(tvHas(r.reach)){const v=tvNum(r.reach);o.reach=isFinite(o.reach)?Math.max(o.reach,v):v;}});
  return out;}
/* ---------- 계획 · 실적 묶음 — 계획: 채널별 월 계획 → 없으면 프로그램별 계획. 실적: 채널별 집행 → 일자별 → 스팟 ---------- */
function tvPlanAgg(){
  if(TV_MIX.some(r=>String(r.ch||'').trim())){
    const rows=tvMixByCh().map(o=>({ch:o.ch,amt:o.amt,cnt:o.cnt,grp:o.grp,reach:o.reach}));
    return {rows,tot:tvMixTotal(),src:'mix'};}
  const chs=[...new Set(TV_PLAN.map(r=>String(r.ch||'').trim()).filter(Boolean))];
  const rows=chs.map(ch=>{const t=tvPlanTotal(TV_PLAN.filter(r=>String(r.ch||'').trim()===ch));
    return {ch,amt:t.amt,cnt:t.cnt,grp:t.grp,reach:NaN};});
  const t=tvPlanTotal();
  return {rows,tot:{amt:t.amt,cnt:t.cnt,grp:t.grp,reach:tvHas(TV_META.planReach)?tvNum(TV_META.planReach):NaN},src:TV_PLAN.length?'plan':''};}
function tvActAgg(){
  if(TV_CH.some(r=>String(r.ch||'').trim())){
    const rows=TV_CH.filter(r=>String(r.ch||'').trim()).map(r=>({ch:String(r.ch).trim(),cost:tvNum(r.cost),cnt:tvNum(r.cnt),
      grp:tvNum(r.grp),reach:tvHas(r.reach)?tvNum(r.reach):NaN}));
    const t=tvChTotal();
    return {rows,tot:{...t,reach:tvActReach()},src:'ch'};}
  if(TV_DAY.some(r=>tvIsoOk(r.date))){
    let cnt=0,grp=0;tvDays().forEach(r=>{cnt+=tvNum(r.cnt);grp+=tvNum(r.grp);});
    return {rows:[],tot:{cnt,grp,cost:0,reach:tvActReach()},src:'day'};}
  /* 주차별만 있으면 그 합 (v135) */
  if(tvWeeks().length){
    let cnt=0,grp=0,cost=0;tvWeeks().forEach(r=>{cnt+=tvNum(r.cnt);grp+=tvNum(r.grp);cost+=tvNum(r.cost);});
    return {rows:[],tot:{cnt,grp,cost,reach:tvActReach()},src:'week'};}
  const chs=[...new Set(TV_SPOTS.map(r=>String(r.ch||'').trim()).filter(Boolean))];
  const rows=chs.map(ch=>{const t=tvSpotTotal(TV_SPOTS.filter(r=>String(r.ch||'').trim()===ch));
    return {ch,cost:t.cost,cnt:t.cnt,grp:t.grp,reach:NaN};});
  const t=tvSpotTotal();
  return {rows,tot:{cnt:t.cnt,grp:t.grp,cost:t.cost,reach:NaN},src:TV_SPOTS.length?'spot':''};}
/* 숫자 모양 */
const tvG=v=>isFinite(v)&&v?(+v).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:2}):'–';
const tvRc=v=>isFinite(v)&&v?tvR(v,1).toFixed(1)+'%':'–';
const tvPc=(a,b)=>(isFinite(a)&&isFinite(b)&&b)?a/b:NaN;
const tvP1=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
/* TV 금액은 천원 단위로 보인다 (v132.1 — TV 실무 표기). 통합(전체 캠페인)만 원 단위 */
const tvKw=v=>isFinite(v)&&v?fmt(v/1000):'–';
/* 실적이 있는 채널의 0 은 '–' 가 아니라 0 으로 (달성률 0.0% 와 맞게) */
const tvGa=v=>isFinite(v)?(v?tvG(v):'0'):'–',tvRa=v=>isFinite(v)?(v?tvRc(v):'0.0%'):'–';
/* 타겟 표시 — 화면 머리글 옆 */
function tvPaintTarget(){
  const t=String(TV_META.target||'').trim();
  document.querySelectorAll('.tvtgt').forEach(e=>{e.textContent=t?`${L('타겟','Target')} ${t}`:'';e.classList.toggle('hidden',!t);});}
/* 입력 화면의 칸 (타겟 · 전체 Reach) */
function tvPaintMeta(){
  const set=(id,v,ph)=>{const e=$(id);if(!e)return;if(document.activeElement!==e)e.value=v==null?'':String(v);if(ph!=null)e.placeholder=ph;};
  set('tvTarget',TV_META.target);
  set('tvPlanReach',tvHas(TV_META.planReach)?tvR(tvNum(TV_META.planReach),2):'');
  const d=tvDays().filter(r=>tvHas(r.cumreach));
  set('tvReach',tvHas(TV_META.reach)?tvR(tvNum(TV_META.reach),2):'',d.length?`자동 ${tvR(tvNum(d[d.length-1].cumreach),2)}`:'');
  set('tvReach3',tvHas(TV_META.reach3)?tvR(tvNum(TV_META.reach3),2):'');
  const lk=$('tvReachLock');if(lk)lk.classList.toggle('hidden',!d.length);
  const old=(id,on)=>{const e=$(id);if(e)e.classList.toggle('hidden',!on);};
  old('tvSpotOld',TV_SPOTS.length>0);}

/* ---------- TV 대시보드 — v132.2: 예산 소진 · 예산 열은 그대로, CPRP 자리에 Reach 1+ (금액은 천원) ---------- */
function renderTvDash(){
  const box=$('tvKpis'),tb=$('tvChTbl');if(!box||!tb)return;
  tvPaintTarget();
  const PA=tvPlanAgg(),AA=tvActAgg(),P=PA.tot,A=AA.tot;
  const card=(t,act,goal,fa,fg,rate)=>`<div class="tvkpi">
      <div class="tt">${t}</div>
      <div class="vv mono">${fa(act)}</div>
      <div class="gg">계획 <b class="mono">${fg(goal)}</b></div>
      <div class="bar"><i style="width:${Math.min(isFinite(rate)?rate:0,1)*100}%"></i></div>
      <div class="rr mono">${isFinite(rate)?(rate*100).toFixed(1)+'%':'–'}</div></div>`;
  const n0=v=>isFinite(v)&&v?fmt(v):'–';
  const kBig=v=>isFinite(v)&&v?`${fmt(v/1000)}<span class="vsm"> ${L('천원','K KRW')}</span>`:'–';
  const kSm=v=>isFinite(v)&&v?`${fmt(v/1000)}${L('천원',' K')}`:'–';
  box.classList.remove('c3');
  box.innerHTML=
    card('예산 소진',A.cost,P.amt,kBig,kSm,tvPc(A.cost,P.amt))
   +card('GRP 달성',A.grp,P.grp,tvG,tvG,tvPc(A.grp,P.grp))
   +card('Reach 1+',A.reach,P.reach,tvRc,tvRc,tvPc(A.reach,P.reach))
   +card('집행 횟수',A.cnt,P.cnt,n0,n0,tvPc(A.cnt,P.cnt));
  /* 채널별 — 계획 순서(입력한 순서) 그대로, 실적에만 있는 채널은 뒤에 */
  const rows=[],by=new Map();
  PA.rows.forEach(p=>{const id=tvChId(p.ch);if(by.has(id)){const o=by.get(id);['amt','cnt','grp'].forEach(k=>o.p[k]+=p[k]);return;}
    const o={ch:p.ch,p:{...p},a:null};by.set(id,o);rows.push(o);});
  AA.rows.forEach(a=>{const id=tvChId(a.ch);let o=by.get(id);
    if(!o){o={ch:a.ch,p:null,a:null};by.set(id,o);rows.push(o);}
    if(o.a){['cost','cnt','grp'].forEach(k=>o.a[k]+=a[k]);o.a.reach=NaN;}else o.a={...a};});
  const g=(o,s,k)=>o[s]?o[s][k]:NaN;
  const tr=(nm,o,cls)=>`<tr${cls?` class="${cls}"`:''}><td class="head">${esc(nm)}</td>
      <td class="mono">${tvKw(g(o,'p','amt'))}</td><td class="mono">${tvKw(g(o,'a','cost'))}</td><td class="mono">${tvP1(tvPc(g(o,'a','cost'),g(o,'p','amt')))}</td>
      <td class="mono gsep">${tvG(g(o,'p','grp'))}</td><td class="mono">${tvGa(g(o,'a','grp'))}</td><td class="mono">${tvP1(tvPc(g(o,'a','grp'),g(o,'p','grp')))}</td>
      <td class="mono gsep">${tvRc(g(o,'p','reach'))}</td><td class="mono">${tvRa(g(o,'a','reach'))}</td>
      <td class="mono gsep">${n0(g(o,'p','cnt'))}</td><td class="mono">${n0(g(o,'a','cnt'))}</td></tr>`;
  const cs=HP_SORT['tvch'];
  if(cs&&cs.dir){const idx={ch:o=>o.ch,amt:o=>g(o,'p','amt'),cost:o=>g(o,'a','cost'),spend:o=>tvPc(g(o,'a','cost'),g(o,'p','amt')),
      pgrp:o=>g(o,'p','grp'),grp:o=>g(o,'a','grp'),grpr:o=>tvPc(g(o,'a','grp'),g(o,'p','grp')),
      preach:o=>g(o,'p','reach'),reach:o=>g(o,'a','reach'),pcnt:o=>g(o,'p','cnt'),cnt:o=>g(o,'a','cnt')}[cs.k];
    if(idx)rows.sort((x,y)=>hpCmp(idx(x),idx(y),cs.dir));}
  const none=!PA.src&&!AA.src;
  tb.innerHTML=`<thead><tr><th rowspan="2">채널</th><th colspan="3">예산 <span class="tvunit">(천원)</span></th><th colspan="3" class="gsep">GRP</th>
      <th colspan="2" class="gsep">Reach 1+</th><th colspan="2" class="gsep">집행 횟수</th></tr>
    <tr><th>계획 금액</th><th>집행 광고비</th><th>소진율</th><th class="gsep">계획</th><th>실적</th><th>달성률</th>
      <th class="gsep">계획</th><th>실적</th><th class="gsep">계획</th><th>실적</th></tr></thead><tbody>`
    +(!none&&rows.length?rows.map(o=>tr(o.ch,o)).join('')+tr('TOTAL',{p:PA.src?P:null,a:AA.src?A:null},'total')
      :`<tr><td colspan="11" class="hint" style="padding:22px;text-align:center">아직 TV 데이터가 없습니다.</td></tr>`)
    +'</tbody>';
  {const r0=tb.tHead.rows[0].cells,r1=tb.tHead.rows[1].cells;
   const map=[['ch',r0[0],'채널'],['amt',r1[0],'계획 금액'],['cost',r1[1],'집행 광고비'],['spend',r1[2],'소진율'],
     ['pgrp',r1[3],'계획 GRP'],['grp',r1[4],'실적 GRP'],['grpr',r1[5],'GRP 달성률'],
     ['preach',r1[6],'계획 Reach 1+'],['reach',r1[7],'실적 Reach 1+'],['pcnt',r1[8],'계획 횟수'],['cnt',r1[9],'실적 횟수']];
   wireHeadPops(map.map(([k,th,l])=>({th,k,label:l})),{cur:cs,scope:'tvch',
     onSort:(k,d)=>{if(d)HP_SORT['tvch']={k,dir:d};else delete HP_SORT['tvch'];renderTvDash();}});}
  /* 채널별 Reach 는 중복이 있어 더하지 않는다 — TOTAL 의 Reach 는 전체(중복 제거) 값 */
  const rn=$('tvChReachNote');
  if(rn)rn.textContent=(isFinite(A.reach)||isFinite(P.reach))&&rows.length>1?L('TOTAL 의 Reach 1+ 는 채널 합이 아니라 중복을 뺀 전체 값입니다.','TOTAL Reach 1+ is the de-duplicated overall reach, not the sum of channels.'):'';
  const em=$('tvEmpty');
  if(em){em.classList.toggle('hidden',!none);
    em.innerHTML=none?`<div class="notice"><span>ⓘ</span><div>${L(
      `TV 데이터가 아직 없습니다.
      <b>TV › 예상효율 입력</b>에 프로그램별 계획과 채널별 월 계획(예산 · 횟수 · 예상 GRP · Reach 1+)을,
      <b>TV › 데이터 입력</b>에 채널별 집행과 일자별 퍼포먼스를 넣으면 여기에 모입니다.`,
      `No TV data yet. Enter the program plan and the monthly channel plan (budget · spots · expected GRP · Reach 1+) in
      <b>TV › Forecast input</b>, and delivery by channel and daily performance in <b>TV › Data input</b>.`)}
      <span class="agency-only"><button class="btn sm" id="tvGoPlan">TV 예상효율 입력으로</button>
      <button class="btn sm" id="tvGoSpot">TV 리포트 데이터 입력으로</button></span></div></div>`:'';
    const gp=$('tvGoPlan'),gs=$('tvGoSpot');
    if(gp)gp.onclick=()=>switchTab('tvplan');if(gs)gs.onclick=()=>switchTab('tvinput');
    try{if(isClient())em.querySelectorAll('.agency-only').forEach(x=>x.classList.add('hidden'));}catch(e){}}
  const nt=$('tvDashNote');
  if(nt){const ds=(TV_DAY.length?tvDays().map(r=>r.date):TV_SPOTS.map(r=>r.date).filter(tvIsoOk)).sort();
    nt.textContent=ds.length?`방송일 ${mdy(ds[0])}~${mdy(ds[ds.length-1])}`:'';}
  try{renderTvSeg(P,A);}catch(e){console.warn(e);}
}
/* ---------- v134 — 구분(품목)별 집행: 구분별 계획 · 실적 표가 있을 때만 ---------- */
function renderTvSeg(P,A){
  const box=$('tvSegBox'),tb=$('tvSegTbl');if(!box||!tb)return;
  const rows=tvSegRows();box.classList.toggle('hidden',!rows.length);if(!rows.length){tb.innerHTML='';return;}
  const has=k=>rows.some(r=>tvHas(r[k]));
  const showEq=has('peq')||has('eq'),showR3=has('preach3')||has('reach3')||tvHas(TV_META.reach3);
  const showCost=has('cost');
  const v=(r,k)=>tvHas(r[k])?tvNum(r[k]):NaN;
  const n0=x=>isFinite(x)&&x?fmt(x):'–';
  const T=tvSegTotal(rows),tot={seg:'TOTAL',amt:T.amt||NaN,cost:T.cost||NaN,pgrp:T.pgrp||NaN,grp:T.grp||NaN,peq:T.peq||NaN,eq:T.eq||NaN,
    preach:P&&isFinite(P.reach)?P.reach:NaN,reach:A&&isFinite(A.reach)?A.reach:NaN,
    preach3:NaN,reach3:tvHas(TV_META.reach3)?tvNum(TV_META.reach3):NaN,pcnt:T.pcnt||NaN,cnt:T.cnt||NaN};
  const row=(o,isTot)=>{const g=k=>isTot?o[k]:v(o,k);
    return `<tr${isTot?' class="total"':''}><td class="head">${esc(isTot?'TOTAL':String(o.seg).trim())}</td>`
      +`<td class="mono">${tvKw(g('amt'))}</td>`
      +(showCost?`<td class="mono">${tvKw(g('cost'))}</td><td class="mono">${tvP1(tvPc(g('cost'),g('amt')))}</td>`:'')
      +`<td class="mono gsep">${tvG(g('pgrp'))}</td><td class="mono">${tvGa(g('grp'))}</td><td class="mono">${tvP1(tvPc(g('grp'),g('pgrp')))}</td>`
      +(showEq?`<td class="mono gsep">${tvG(g('peq'))}</td><td class="mono">${tvGa(g('eq'))}</td><td class="mono">${tvP1(tvPc(g('eq'),g('peq')))}</td>`:'')
      +`<td class="mono gsep">${tvRc(g('preach'))}</td><td class="mono">${tvRa(g('reach'))}</td>`
      +(showR3?`<td class="mono gsep">${tvRc(g('preach3'))}</td><td class="mono">${tvRa(g('reach3'))}</td>`:'')
      +`<td class="mono gsep">${n0(g('pcnt'))}</td><td class="mono">${n0(g('cnt'))}</td></tr>`;};
  tb.innerHTML=`<thead><tr><th rowspan="2">${L('구분','Group')}</th><th colspan="${showCost?3:1}">${L('예산','Budget')} <span class="tvunit">(${L('천원','K KRW')})</span></th>`
      +`<th colspan="3" class="gsep">GRP</th>${showEq?'<th colspan="3" class="gsep">eq.GRP</th>':''}`
      +`<th colspan="2" class="gsep">Reach 1+</th>${showR3?'<th colspan="2" class="gsep">Reach 3+</th>':''}<th colspan="2" class="gsep">${L('집행 횟수','Spots')}</th></tr>`
    +`<tr><th>${L('계획 금액','Planned')}</th>${showCost?`<th>${L('집행 광고비','Spent')}</th><th>${L('소진율','Burn')}</th>`:''}`
      +`<th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th><th>${L('달성률','Achv.')}</th>`
      +(showEq?`<th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th><th>${L('달성률','Achv.')}</th>`:'')
      +`<th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th>`
      +(showR3?`<th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th>`:'')
      +`<th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th></tr></thead><tbody>`
    +rows.map(r=>row(r,false)).join('')+row(tot,true)+'</tbody>';
  const n=$('tvSegNote');
  if(n)n.textContent=(showCost?'':L('품목별 광고비가 없는 리포트라 예산은 계획 금액만 보입니다 · ','Spend by group is not reported — budget shows the plan only · '))
    +L('구분별 Reach 는 더하지 않습니다 — TOTAL 은 전체(중복 제거) Reach 입니다.','Reach is not summed across groups — TOTAL shows the de-duplicated overall reach.');
}
/* ---------- TV 일자별 퍼포먼스 (v132) — 횟수 · GRP · Reach 1+ · 누적 ---------- */
function tvEmptyNote(elId,show,ko,en){
  const em=$(elId);if(!em)return;
  em.classList.toggle('hidden',!show);
  em.innerHTML=show?`<div class="notice"><span>ⓘ</span><div>${L(ko,en)}</div></div>`:'';}
function renderTvDaily(){
  const tb=$('tvDailyTbl');if(!tb)return;
  tvPaintTarget();
  let rows=[];
  if(TV_DAY.length){
    let cg=0;
    rows=tvDays().map(r=>{cg+=tvNum(r.grp);const dt=new Date(r.date+'T00:00:00');
      return {d:r.date,wd:dt.getDay(),cnt:tvNum(r.cnt),grp:tvNum(r.grp),reach:tvHas(r.reach)?tvNum(r.reach):NaN,
        cumgrp:tvHas(r.cumgrp)?tvNum(r.cumgrp):cg,cumreach:tvHas(r.cumreach)?tvNum(r.cumreach):NaN};});}
  else{
    const by=new Map();
    TV_SPOTS.forEach(r=>{if(!tvIsoOk(r.date))return;if(!by.has(r.date))by.set(r.date,[]);by.get(r.date).push(r);});
    let cg=0;
    rows=[...by.keys()].sort().map(d=>{const t=tvSpotTotal(by.get(d));cg+=t.grp;
      return {d,wd:new Date(d+'T00:00:00').getDay(),cnt:t.cnt,grp:t.grp,reach:NaN,cumgrp:cg,cumreach:NaN};});}
  const n=rows.length,tot={cnt:sum(rows.map(r=>r.cnt)),grp:sum(rows.map(r=>r.grp))};
  const lastCumG=n?rows[n-1].cumgrp:NaN,allReach=TV_DAY.length?tvActReach():NaN;
  const srt=HP_SORT['tvdaily'];
  if(srt&&srt.dir){const f={date:r=>r.d,wd:r=>(r.wd+6)%7,spots:r=>r.cnt,grp:r=>r.grp,reach:r=>r.reach,
      cumgrp:r=>r.cumgrp,cumreach:r=>r.cumreach}[srt.k];if(f)rows.sort((a,b)=>hpCmp(f(a),f(b),srt.dir));}
  const cols=[['date','방송일'],['wd','요일'],['spots','횟수'],['grp','GRP'],['reach','Reach 1+'],
    ['cumgrp','누적 GRP'],['cumreach','누적 Reach 1+']];
  let h='<thead><tr>'+cols.map(([k,l],i)=>`<th${i>=2?' class="num"':''}>${l}</th>`).join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{const dt=new Date(r.d+'T00:00:00'),hol=(typeof holName==='function')?holName(dt):'';
    const cls=(r.wd===0||r.wd===6||hol)?' hol':'';
    h+=`<tr><td class="head mono${cls}"${hol?` title="${esc(hol)}"`:''}>${mdy(r.d)}</td><td class="head${cls}">${WD[r.wd]}</td>`
      +`<td class="mono">${r.cnt?fmt(r.cnt):'–'}</td><td class="mono">${tvG(r.grp)}</td><td class="mono">${tvRc(r.reach)}</td>`
      +`<td class="mono">${tvG(r.cumgrp)}</td><td class="mono">${tvRc(r.cumreach)}</td></tr>`;});
  if(n)h+=`<tr class="total"><td class="head" colspan="2">TOTAL</td><td class="mono">${fmt(tot.cnt)}</td>`
    +`<td class="mono">${tvG(tot.grp)}</td><td class="mono">${tvRc(allReach)}</td>`
    +`<td class="mono">${tvG(isFinite(lastCumG)?lastCumG:tot.grp)}</td><td class="mono">${tvRc(allReach)}</td></tr>`;
  else h+=`<tr><td colspan="7" class="hint" style="padding:22px;text-align:center">${L('방송일이 적힌 실적이 아직 없습니다.','No airing results with dates yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  const ths=[...tb.tHead.rows[0].cells];
  wireHeadPops(cols.map(([k,l],i)=>({th:ths[i],k,label:l})),{cur:srt,scope:'tv',
    onSort:(k,d)=>{if(d)HP_SORT['tvdaily']={k,dir:d};else delete HP_SORT['tvdaily'];renderTvDaily();}});
  const ds=rows.map(r=>r.d).sort();
  const nt=$('tvDailyNote');if(nt)nt.textContent=n?`${mdy(ds[0])}~${mdy(ds[n-1])} · ${fmt(n)}일`:'';
  tvEmptyNote('tvDailyEmpty',!n,
    'TV 실적이 아직 없습니다. <b>TV › 데이터 입력</b>의 일자별 퍼포먼스에 방송일 · 횟수 · GRP · Reach 1+ 를 넣으면 날짜별로 모입니다.',
    'No TV results yet. Enter air date · spots · GRP · Reach 1+ in the daily performance table of <b>TV › Data input</b>.');
}
/* TV 주차별 퍼포먼스 화면은 28-tvweek.js (v136) */
/* ---------- TV 미디어믹스 (v132.2) — 위: 프로그램별 편성 / 아래: 채널 × 월 예산 · 노출 횟수 · 예상 GRP · 예상 Reach 1+ ---------- */
function renderTvMix(){
  tvPaintTarget();
  try{renderTvProg();}catch(e){console.warn(e);}
  const tb=$('tvMixTbl');if(!tb)return;
  const ms=tvMixMonthsUsed(),T=tvMixTotal(),rows=tvMixByCh();
  const val=(o,k)=>{
    if(k==='ch')return o.ch;if(k==='amt')return o.amt;if(k==='cnt')return o.cnt;
    if(k==='ashare')return T.amt?o.amt/T.amt:NaN;if(k==='cshare')return T.cnt?o.cnt/T.cnt:NaN;
    if(k==='grp')return o.grp;if(k==='reach')return o.reach;
    const m=/^([ac])@(.+)$/.exec(k);if(m){const x=o.m[m[2]];return x?x[m[1]==='a'?'amt':'cnt']:0;}
    return NaN;};
  const srt=HP_SORT['tvmix2'];
  const order=rows.slice();
  if(srt&&srt.dir)order.sort((a,b)=>hpCmp(val(a,srt.k),val(b,srt.k),srt.dir));
  const w0=tvKw,n0=v=>isFinite(v)&&v?fmt(v):'–';
  const leaf=[].concat(ms.map(ym=>['a@'+ym,tvMonthLabel(ym,true),'예산 '+tvMonthLabel(ym)]),[['amt','계','예산 계'],['ashare','비중','예산 비중']],
    ms.map(ym=>['c@'+ym,tvMonthLabel(ym,true),'노출 횟수 '+tvMonthLabel(ym)]),[['cnt','계','노출 횟수 계'],['cshare','비중','노출 횟수 비중']]);
  let h=`<thead><tr><th rowspan="2">채널</th><th colspan="${ms.length+2}" class="gsep">예산 <span class="tvunit">(천원)</span></th><th colspan="${ms.length+2}" class="gsep">노출 횟수</th>
      <th rowspan="2" class="gsep num">예상 GRP</th><th rowspan="2" class="num">예상 Reach 1+</th></tr><tr>`
    +leaf.map(([k,l],i)=>`<th class="num${i===0||i===ms.length+2?' gsep':''}">${esc(l).replace(' (','<br>(')}</th>`).join('')+'</tr></thead><tbody>';
  const cells=(get,amtTot,cntTot,grp,reach)=>
    ms.map((ym,i)=>`<td class="mono${i===0?' gsep':''}">${w0(get('a@'+ym))}</td>`).join('')
    +`<td class="mono">${w0(amtTot)}</td><td class="mono">${tvP1(T.amt&&amtTot?amtTot/T.amt:NaN)}</td>`
    +ms.map((ym,i)=>`<td class="mono${i===0?' gsep':''}">${n0(get('c@'+ym))}</td>`).join('')
    +`<td class="mono">${n0(cntTot)}</td><td class="mono">${tvP1(T.cnt&&cntTot?cntTot/T.cnt:NaN)}</td>`
    +`<td class="mono gsep">${tvG(grp)}</td><td class="mono">${tvRc(reach)}</td>`;
  order.forEach(o=>{h+=`<tr><td class="head">${esc(o.ch)}</td>`+cells(k=>val(o,k),o.amt,o.cnt,o.grp,o.reach)+'</tr>';});
  if(rows.length)h+=`<tr class="total"><td class="head">TOTAL</td>`
    +cells(k=>sum(rows.map(o=>val(o,k))),T.amt,T.cnt,T.grp,T.reach)+'</tr>';
  else h+=`<tr><td colspan="${2*ms.length+7}" class="hint" style="padding:22px;text-align:center">${L('채널별 월 계획이 아직 없습니다.','No monthly channel plan yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  {const r0=tb.tHead.rows[0].cells,r1=[...tb.tHead.rows[1].cells];
   const map=[{th:r0[0],k:'ch',label:'채널'}].concat(leaf.map(([k,,lab],i)=>({th:r1[i],k,label:lab})),
     [{th:r0[3],k:'grp',label:'예상 GRP'},{th:r0[4],k:'reach',label:'예상 Reach 1+'}]);
   wireHeadPops(map,{cur:srt,scope:'tv',
     onSort:(k,d)=>{if(d)HP_SORT['tvmix2']={k,dir:d};else delete HP_SORT['tvmix2'];renderTvMix();}});}
  const rn=$('tvMixReachNote');
  if(rn)rn.textContent=rows.length>1&&(isFinite(T.reach)||rows.some(o=>isFinite(o.reach)))?L('TOTAL 의 예상 Reach 1+ 는 채널 합이 아니라 TV › 예상효율 입력에 적은 전체(중복 제거) 값입니다.',
    'TOTAL expected Reach 1+ is the overall de-duplicated value entered in TV › Forecast input, not the sum of channels.'):'';
  tvEmptyNote('tvMixEmpty',!rows.length,
    '채널별 월 계획이 아직 없습니다. <b>TV › 예상효율 입력</b>의 채널별 월 계획에 채널 · 월 · 예산 · 횟수 · 예상 GRP · 예상 Reach 1+ 를 넣으면 여기에 모입니다.',
    'No monthly channel plan yet. Enter channel · month · budget · spots · expected GRP · Reach 1+ in <b>TV › Forecast input</b>.');
}
/* 위 표 — 프로그램별 편성 (프로그램별 계획 TV_PLAN). 횟수 · 금액 비중 · 예상 GRP 는 빼고 (v132.2 피드백) */
function renderTvProg(){
  const tb=$('tvProgTbl');if(!tb)return;
  const P=tvPlanTotal();
  const chOf=r=>String(r.ch||'').trim()||'(채널 없음)';
  const chs=[...new Set(TV_PLAN.map(chOf))];
  const chRows=ch=>TV_PLAN.filter(r=>chOf(r)===ch);
  const srt=HP_SORT['tvprog'];
  const val=(k,rs,one)=>{const t=tvPlanTotal(rs);
    return {ch:one?chOf(one):(rs[0]?chOf(rs[0]):''),prog:one?String(one.prog||''):'',grade:one?String(one.grade||''):'',dur:one?tvNum(one.dur):NaN,
      price:one?tvNum(one.price):NaN,amt:t.amt,rating:one?tvNum(one.rating):NaN,grpshare:P.grp?t.grp/P.grp:NaN,cprp:t.cprp}[k];};
  const order=chs.slice();
  if(srt&&srt.dir){
    if(srt.k==='ch')order.sort((a,b)=>hpCmp(a,b,srt.dir));
    else if(['amt','grpshare','cprp'].includes(srt.k))order.sort((a,b)=>hpCmp(val(srt.k,chRows(a)),val(srt.k,chRows(b)),srt.dir));}
  const cols=[['ch','채널'],['prog','프로그램'],['grade','시급'],['dur','초수'],['price','단가'],['amt','금액'],
    ['rating','예상 시청률'],['grpshare','GRP 비중'],['cprp','예상 CPRP']];
  let h='<thead><tr>'+cols.map(([k,l],i)=>`<th${i>=3?' class="num"':''}>${l}</th>`).join('')+'</tr></thead><tbody>';
  const tr=(rs,one,cls,first,span,ch)=>{const v=k=>val(k,rs,one);
    return `<tr${cls?` class="${cls}"`:''}>`
      +(first?`<td class="head"${span>1?` rowspan="${span}"`:''}>${esc(ch)}</td>`:'')
      +(cls==='sub'?`<td class="head" colspan="3">${esc(ch)} 소계</td><td></td>`
        :`<td class="head">${esc(v('prog')||'–')}</td><td>${esc(v('grade')||'–')}</td>`
          +`<td class="mono">${isFinite(v('dur'))&&v('dur')?fmt(v('dur'))+'초':'–'}</td><td class="mono">${tvKw(v('price'))}</td>`)
      +`<td class="mono">${tvKw(v('amt'))}</td>`
      +`<td class="mono">${cls==='sub'?'':(isFinite(v('rating'))&&v('rating')?tvR(v('rating'),2)+'%':'–')}</td>`
      +`<td class="mono">${tvP1(v('grpshare'))}</td><td class="mono">${tvKw(v('cprp'))}</td></tr>`;};
  order.forEach(ch=>{
    const rs=chRows(ch).slice();
    if(srt&&srt.dir&&srt.k!=='ch')rs.sort((a,b)=>hpCmp(val(srt.k,[a],a),val(srt.k,[b],b),srt.dir));
    rs.forEach((r,i)=>{h+=tr([r],r,'',i===0,rs.length+(rs.length>1?1:0),ch);});
    if(rs.length>1)h+=tr(rs,null,'sub',false,1,ch);});
  if(TV_PLAN.length)h+=`<tr class="total"><td class="head" colspan="5">TOTAL</td><td class="mono">${tvKw(P.amt)}</td><td></td>`
    +`<td class="mono">100.0%</td><td class="mono">${tvKw(P.cprp)}</td></tr>`;
  else h+=`<tr><td colspan="9" class="hint" style="padding:22px;text-align:center">${L('프로그램별 계획이 아직 없습니다.','No program plan yet.')}</td></tr>`;
  tb.innerHTML=h+'</tbody>';
  const ths=[...tb.tHead.rows[0].cells];
  wireHeadPops(cols.map(([k,l],i)=>({th:ths[i],k,label:l})),{cur:srt,scope:'tv',
    onSort:(k,d)=>{if(d)HP_SORT['tvprog']={k,dir:d};else delete HP_SORT['tvprog'];renderTvMix();}});
  tvEmptyNote('tvProgEmpty',!TV_PLAN.length,
    '프로그램별 계획이 아직 없습니다. <b>TV › 예상효율 입력</b>의 프로그램별 계획에 채널 · 프로그램 · 시급 · 초수 · 횟수 · 단가 · 예상 시청률을 넣으면 여기에 모입니다.',
    'No program plan yet. Enter channel · program · grade · length · spots · unit price · expected rating in <b>TV › Forecast input</b>.');
}

/* ---------- 엑셀 불러오기 (v132) ----------
   실적: 한 시트에 '채널별 집행' 표와 '일자별 퍼포먼스' 표가 위아래로 있어도 둘 다 찾는다.
     · 채널별 — 통째로 바꾼다(매주 누적 리포트). '계' 줄의 Reach 1+ 는 전체(중복 제거) Reach 로 쓴다.
     · 일자별 — 같은 날짜는 새 값으로 바꾸고, 없던 날짜는 더한다.
   계획: '채널 | 예산(월별…) | 노출 횟수(월별…) | 예상 GRP | 예상 Reach 1+' 두 줄 머리글. '10월', '11월' 을 캠페인 연도의 달로 맞춘다. */
const TV_RES_HDR={ch:['채널','채널명','channel'],cost:['집행광고비','광고비','집행금액','cost'],cnt:['횟수','집행횟수','회수','spots'],
  grp:['grp'],reach:['reach1+','reach','도달률','reach1'],date:['일','일자','날짜','방송일','date'],
  cumgrp:['누적grp'],cumreach:['누적reach1+','누적reach','누적도달률'],
  /* v135 — 주차별 */
  wk:['주차','주','week','주간'],start:['시작일','시작'],end:['종료일','종료'],per:['기간','방송기간','집행기간'],
  eqgrp:['eq.grp','eqgrp','e.grp'],reach3:['reach3+','r3+','reach3','3+도달률']};
const tvHk=v=>tvKey(v).replace(/[()（）%]/g,'');
function tvHdrMap(row){
  const m={};
  (row||[]).forEach((v,j)=>{const t=tvHk(v);if(!t)return;
    for(const k of Object.keys(TV_RES_HDR)){if(m[k]==null&&TV_RES_HDR[k].includes(t)){m[k]=j;break;}}});
  return m;}
const tvIsChHdr=m=>m.ch!=null&&m.date==null&&(m.grp!=null||m.cnt!=null||m.reach!=null);
const tvIsDayHdr=m=>m.date!=null&&m.ch==null&&m.wk==null&&(m.grp!=null||m.cnt!=null);
const tvIsWkHdr=m=>m.wk!=null&&m.ch==null&&(m.grp!=null||m.cnt!=null||m.cost!=null);
const TV_TOT_RE=/^(계|합계|총계|소계|total|grandtotal|전체)$/i;
function tvResScore(g){let s=0;(g||[]).forEach(r=>{const m=tvHdrMap(r);if(tvIsChHdr(m)||tvIsDayHdr(m)||tvIsWkHdr(m))s+=Object.keys(m).length;});return s;}
/* 머리글 아래 줄들 — 빈 줄 · 다음 머리글에서 멈춘다. 합계 줄은 따로 돌려준다 */
function tvReadBlock(grid,hi,key){
  const map=tvHdrMap(grid[hi]),rows=[],idx=[];let tot=null,ti=-1;
  for(let i=hi+1;i<grid.length;i++){
    const row=grid[i]||[];
    if(!row.some(v=>String(v==null?'':v).trim()!=='')){if(rows.length)break;continue;}
    const m=tvHdrMap(row);if(tvIsChHdr(m)||tvIsDayHdr(m)||tvIsWkHdr(m))break;
    const first=String(row[map[key]]==null?'':row[map[key]]).trim();
    if(TV_TOT_RE.test(first.replace(/\s+/g,''))||isTotalRow(row)){tot=row;ti=i;break;}
    if(!first)continue;
    rows.push(row);idx.push(i);}
  return {map,rows,idx,tot,ti,hi};}
function tvCellVal(grid,ri,ci,type){
  let v=grid[ri]?grid[ri][ci]:'';
  if(type==='pct'&&typeof v==='number'&&(grid.__pct||new Set()).has(ri+','+ci))v=v*100;
  v=v==null?'':String(v).trim();
  if(type==='num')return v===''?'':tvNum(v);
  if(type==='pct'||type==='dec')return v===''?'':tvR(tvNum(v),3);
  if(type==='date')return tvDate(v);
  return v;}
function tvResImport(file){
  const run=f=>readGrid(f,tvResScore).then(grid=>{
    let chB=null,dayB=null,wkB=null;
    for(let i=0;i<grid.length;i++){const m=tvHdrMap(grid[i]);
      if(!chB&&tvIsChHdr(m))chB=tvReadBlock(grid,i,'ch');
      else if(!dayB&&tvIsDayHdr(m))dayB=tvReadBlock(grid,i,'date');
      else if(!wkB&&tvIsWkHdr(m))wkB=tvReadBlock(grid,i,'wk');}
    if(!chB&&!dayB&&!wkB){confirmModal('표를 찾지 못했습니다.',
      `'채널 · 횟수 · GRP · Reach 1+' 또는 '일 · 횟수 · GRP · Reach 1+ · 누적 GRP · 누적 Reach 1+' 머리글 줄을 찾지 못했습니다.`,()=>{},'확인');return;}
    const notes=[];
    if(chB){
      const cols=TV_CH_COLS.filter(c=>c.k!=='note');
      /* 집행 광고비 — 단위가 안 적혀 있으면 천원 (v132.1) */
      const ch0=chB.map.cost!=null?String((grid[chB.hi]||[])[chB.map.cost]||''):'';
      const cU=/백만/.test(ch0)?1e6:/천원/.test(ch0)?1e3:/\(\s*원\s*\)/.test(ch0)?1:1e3;
      TV_CH=chB.rows.map((row,n)=>{const r=TV_TBL.ch.blank();
        cols.forEach(c=>{if(chB.map[c.k]!=null){let v=tvCellVal(grid,chB.idx[n],chB.map[c.k],c.type);
          if(c.k==='cost'&&v!=='')v=v*cU;r[c.k]=v;}});return r;});
      if(chB.tot&&chB.map.reach!=null){const v=tvCellVal(grid,chB.ti,chB.map.reach,'pct');TV_META.reach=v;}
      notes.push(`채널별 집행 ${fmt(TV_CH.length)}채널을 새로 넣었습니다${chB.tot&&chB.map.reach!=null&&tvHas(TV_META.reach)?` (전체 Reach 1+ ${tvR(tvNum(TV_META.reach),2)}%)`:''}.`);
      notes.push(`맞춘 열: ${cols.filter(c=>chB.map[c.k]!=null).map(c=>c.l).join(' · ')}`);}
    if(dayB){
      const have=new Map(TV_DAY.filter(r=>tvIsoOk(r.date)).map(r=>[r.date,r]));let nw=0,up=0,bad=0;
      dayB.rows.forEach((row,n)=>{const r=TV_TBL.day.blank();
        TV_DAY_COLS.forEach(c=>{if(dayB.map[c.k]!=null)r[c.k]=tvCellVal(grid,dayB.idx[n],dayB.map[c.k],c.type);});
        if(!tvIsoOk(r.date)){bad++;return;}
        const o=have.get(r.date);if(o){Object.assign(o,r);up++;}else{TV_DAY.push(r);have.set(r.date,r);nw++;}});
      TV_DAY=tvDays().concat(TV_DAY.filter(r=>!tvIsoOk(r.date)));
      notes.push(`일자별 퍼포먼스 ${fmt(nw+up)}일 (새 날짜 ${fmt(nw)} · 바꾼 날짜 ${fmt(up)})${bad?` · 날짜를 못 읽은 ${fmt(bad)}줄은 건너뜀`:''}.`);
      notes.push(`맞춘 열: ${TV_DAY_COLS.filter(c=>dayB.map[c.k]!=null).map(c=>c.l).join(' · ')}`);}
    if(wkB){
      /* 주차별 (v135) — 같은 주차 이름은 새 값으로, 없던 주차는 더한다. '기간' 한 칸(10/1~10/5)은 시작 · 종료일로 나눈다 */
      const have=new Map(TV_WEEK.map(r=>[String(r.wk||'').trim(),r]));let nw=0,up=0;
      wkB.rows.forEach((row,n)=>{const r=TV_TBL.week.blank(),ri=wkB.idx[n];
        TV_WEEK_COLS.forEach(c=>{if(wkB.map[c.k]!=null){let v=tvCellVal(grid,ri,wkB.map[c.k],c.type==='num'&&c.unit==='k'?'num':c.type);
          if(c.k==='cost'&&v!=='')v=v*1e3;r[c.k]=v;}});
        if(wkB.map.per!=null&&!tvIsoOk(r.start)){const p=String(grid[ri][wkB.map.per]||'').split(/\s*[~∼–-]\s*(?=\d)/);
          if(p.length>=2){r.start=tvDate(p[0]);r.end=tvDate(p[1]);if(/^\d{1,2}$/.test(p[1].trim())&&tvIsoOk(r.start))r.end=r.start.slice(0,8)+p[1].trim().padStart(2,'0');}}
        const key=String(r.wk||'').trim();
        const o=key&&have.get(key);if(o){Object.assign(o,r);up++;}else{TV_WEEK.push(r);if(key)have.set(key,r);nw++;}});
      notes.push(`주차별 퍼포먼스 ${fmt(nw+up)}주 (새 주차 ${fmt(nw)} · 바꾼 주차 ${fmt(up)}).`);
      notes.push(`맞춘 열: ${TV_WEEK_COLS.filter(c=>wkB.map[c.k]!=null).map(c=>c.l).concat(wkB.map.per!=null?['기간']:[]).join(' · ')}`);}
    renderTvTable('ch');renderTvTable('day');renderTvTable('week');tvPaintMeta();tvChanged();
    confirmModal('TV 실적을 불러왔습니다.',notes.concat(gridNotes(grid)).map(esc).join('<br>'),()=>{},'확인',true);
  }).catch(err=>confirmModal('파일을 읽지 못했습니다.',esc(String(err&&err.message||err)),()=>{},'확인'));
  (file instanceof Blob)?run(file):pickFile(run);}
function tvMixImport(file){
  const isHdr=row=>{const t=(row||[]).map(tvHk);return t.some(x=>x==='채널'||x==='채널명')&&t.some(x=>/^(예산|금액|광고비)/.test(x));};
  const run=f=>readGrid(f,g=>g.some(isHdr)?3:0).then(grid=>{
    const hi=grid.findIndex(isHdr);
    if(hi<0){confirmModal('머리글을 찾지 못했습니다.',`'채널 · 월 · 예산 · 횟수 · 예상 GRP · 예상 Reach 1+' 머리글 줄을 찾지 못했습니다.`,()=>{},'확인');return;}
    /* TV 금액은 단위가 안 적혀 있으면 천원으로 본다 (v132.1). '(원)' 이라고 적혀 있으면 원 */
    const scale=t=>/백만/.test(t)?1e6:/천원/.test(t)?1e3:/\(\s*원\s*\)|단위\s*:?\s*원/.test(t)?1:1e3;
    const top=grid[hi]||[],tk=top.map(tvHk),blankRow=row=>!(row||[]).some(v=>String(v==null?'':v).trim()!=='');
    const out=[];let tot=null,ti=-1,sA=1e3,jReach=-1,form='';
    const jM=tk.findIndex(x=>['월','월별','집행월','month'].includes(x));
    if(jM>=0){
      /* 세로형 — 채널 | 월 | 예산 | 횟수 | 예상 GRP | 예상 Reach 1+ */
      form='세로형(월 한 열)';
      const j=re=>tk.findIndex(x=>re.test(x));
      const jc=tk.findIndex(x=>x==='채널'||x==='채널명'),ja=j(/^(예산|금액|광고비)/),jn=j(/횟수/),jg=j(/grp/),jr=j(/reach|도달/),jo=j(/비고|메모/);
      sA=scale(String(top[ja]||''));jReach=jr;
      let lastCh='';
      for(let i=hi+1;i<grid.length;i++){const row=grid[i]||[];
        if(blankRow(row)){if(out.length)break;continue;}
        let ch=String(row[jc]==null?'':row[jc]).trim();
        if(TV_TOT_RE.test(ch.replace(/\s+/g,''))||isTotalRow(row)){tot=row;ti=i;break;}
        if(!ch)ch=lastCh;if(!ch)continue;lastCh=ch;
        const r=TV_TBL.mix.blank();r.ch=ch;r.ym=tvYm(row[jM]);
        if(ja>=0){const v=tvCellVal(grid,i,ja,'num');if(v!=='')r.amt=v*sA;}
        if(jn>=0)r.cnt=tvCellVal(grid,i,jn,'num');
        if(jg>=0)r.grp=tvCellVal(grid,i,jg,'dec');
        if(jr>=0)r.reach=tvCellVal(grid,i,jr,'pct');
        if(jo>=0)r.note=tvCellVal(grid,i,jo,'text');
        out.push(r);}}
    else{
      /* 가로형 — 채널 | 예산(10월 · 11월 · 계 · 비중) | 노출 횟수(…) | 예상 GRP | 예상 Reach 1+ (두 줄 머리글) */
      form='가로형(월별 열)';
      const sub=grid[hi+1]||[];
      let last='';const grp=top.map(v=>{const t=String(v==null?'':v).trim();if(t)last=t;return last;});
      const col={ch:null,a:{},c:{},aT:null,cT:null,grp:null,reach:null,note:null};let hasSub=false;
      grp.forEach((g,jj)=>{const gk=tvHk(g),sk=tvHk(sub[jj]),ym=/\d\s*월/.test(String(sub[jj]||''))?tvYm(String(sub[jj]).replace(/\s*\(.*$/,'')):null;
        if(ym)hasSub=true;
        if(gk==='채널'||gk==='채널명'){if(col.ch==null)col.ch=jj;return;}
        if(/^(예산|금액|광고비)/.test(gk)){sA=scale(String(g));if(ym)col.a[ym]=jj;else if(!sk&&col.aT==null)col.aT=jj;return;}
        if(/횟수/.test(gk)){if(ym)col.c[ym]=jj;else if(!sk&&col.cT==null)col.cT=jj;return;}
        if(/grp/.test(gk)){if(col.grp==null)col.grp=jj;return;}
        if(/reach|도달/.test(gk)){if(col.reach==null)col.reach=jj;return;}
        if(/비고|메모/.test(gk)&&col.note==null)col.note=jj;});
      jReach=col.reach==null?-1:col.reach;
      const first=tvMonthRange()[0]||'';
      for(let i=hi+(hasSub?2:1);i<grid.length;i++){const row=grid[i]||[];
        if(blankRow(row)){if(out.length)break;continue;}
        const ch=String(row[col.ch]==null?'':row[col.ch]).trim();
        if(TV_TOT_RE.test(ch.replace(/\s+/g,''))||isTotalRow(row)){tot=row;ti=i;break;}
        if(!ch)continue;
        const m={};
        const put=(ym,k,v)=>{if(v==='')return;(m[ym]||(m[ym]={}))[k]=v;};
        Object.entries(col.a).forEach(([ym,jj])=>{const v=tvCellVal(grid,i,jj,'num');put(ym,'amt',v===''?'':v*sA);});
        Object.entries(col.c).forEach(([ym,jj])=>put(ym,'cnt',tvCellVal(grid,i,jj,'num')));
        if(!Object.keys(col.a).length&&col.aT!=null){const v=tvCellVal(grid,i,col.aT,'num');put(first,'amt',v===''?'':v*sA);}
        if(!Object.keys(col.c).length&&col.cT!=null)put(first,'cnt',tvCellVal(grid,i,col.cT,'num'));
        const g0=col.grp!=null?tvCellVal(grid,i,col.grp,'dec'):'',r0=col.reach!=null?tvCellVal(grid,i,col.reach,'pct'):'',n0=col.note!=null?tvCellVal(grid,i,col.note,'text'):'';
        const yms=Object.keys(m).sort();
        if(!yms.length)out.push({ch,ym:'',amt:'',cnt:'',grp:g0,reach:r0,note:n0});
        else yms.forEach((ym,k)=>out.push({ch,ym,amt:tvHas(m[ym].amt)?m[ym].amt:'',cnt:tvHas(m[ym].cnt)?m[ym].cnt:'',
          grp:k===0?g0:'',reach:k===0?r0:'',note:k===0?n0:''}));}}
    if(!out.length){confirmModal('불러올 채널이 없습니다.','머리글 아래에 채널 줄이 없습니다.',()=>{},'확인');return;}
    const had=TV_MIX.filter(r=>String(r.ch||'').trim()).length;TV_MIX=out;
    if(tot&&jReach>=0){const v=tvCellVal(grid,ti,jReach,'pct');if(v!=='')TV_META.planReach=v;}
    renderTvTable('mix');tvPaintMeta();tvChanged();
    const chs=new Set(out.map(r=>tvChId(r.ch))).size,ms=[...new Set(out.map(r=>r.ym).filter(tvYmOk))].sort().map(ym=>tvMonthLabel(ym));
    confirmModal(`${fmt(chs)}채널 · ${fmt(out.length)}줄을 불러왔습니다.`,[
      `표 모양: ${form}`,
      had?`예전 채널별 월 계획 ${fmt(had)}줄은 새 표로 바꿨습니다.`:'',
      ms.length?`달: ${ms.join(' · ')}`:'',
      `금액 단위: ${sA===1e6?'백만원':sA===1e3?'천원':'원'} 으로 읽었습니다.`,
      `예산 합계 ${fmt(tvMixTotal().amt/1000)}천원`].filter(Boolean).concat(gridNotes(grid)).map(esc).join('<br>'),()=>{},'확인',true);
  }).catch(err=>confirmModal('파일을 읽지 못했습니다.',esc(String(err&&err.message||err)),()=>{},'확인'));
  (file instanceof Blob)?run(file):pickFile(run);}
/* 실적 두 표 모두 지우기 */
function tvResWipe(){
  const n=TV_CH.length+TV_DAY.length+TV_WEEK.length+TV_WKCH.length+TV_WKRT.length+TV_WKSEG.length;if(!n&&!tvHas(TV_META.reach))return;
  confirmModal('TV 실적(채널별 집행 · 일자별 퍼포먼스)을 모두 지울까요?',`${fmt(TV_CH.length)}채널 · ${fmt(TV_DAY.length)}일이 사라집니다.`,
    ()=>{TV_CH=[];TV_DAY=[];TV_WEEK=[];TV_WKCH=[];TV_WKRT=[];TV_WKSEG=[];TV_META.reach='';
      ['ch','day','week','wkch','wkrt','wkseg'].forEach(k=>{try{renderTvTable(k);}catch(e){}});tvPaintMeta();tvChanged();},'모두 지우기');}

function renderTV(){
  try{renderTvTable('mix');}catch(e){console.warn(e);}
  try{renderTvTable('ch');}catch(e){console.warn(e);}
  try{renderTvTable('day');}catch(e){console.warn(e);}
  try{renderTvTable('week');}catch(e){console.warn(e);}
  try{renderTvTable('seg');}catch(e){console.warn(e);}
  ['wkch','wkrt','wkseg'].forEach(k=>{try{if(TV_TBL[k])renderTvTable(k);}catch(e){console.warn(e);}});
  try{renderTvTable('plan');}catch(e){console.warn(e);}
  try{renderTvTable('spot');}catch(e){console.warn(e);}
  try{tvPaintMeta();}catch(e){console.warn(e);}
  try{renderTvDash();}catch(e){console.warn(e);}
  try{renderTvDaily();}catch(e){console.warn(e);}
  try{renderTvMix();}catch(e){console.warn(e);}}
/* 문서에 담기 · 되살리기 — serializeDoc / applyDoc 이 부른다 */
function tvForDoc(){return {plan:TV_PLAN.map(r=>({...r})),spots:TV_SPOTS.map(r=>({...r})),
  /* v132 — 요약형(채널별 계획 · 채널별 실적 · 일자별 실적) + 타겟 · 전체 Reach */
  mix:TV_MIX.map(r=>({...r})),ch:TV_CH.map(r=>({...r})),day:TV_DAY.map(r=>({...r})),week:TV_WEEK.map(r=>({...r})),seg:TV_SEG.map(r=>({...r})),
  wkch:TV_WKCH.map(r=>({...r})),wkrt:TV_WKRT.map(r=>({...r})),wkseg:TV_WKSEG.map(r=>({...r})),meta:{...TV_META}};}
function tvFromDoc(d){
  const t=d&&d.tv,arr=k=>Array.isArray(t&&t[k])?t[k].map(r=>({...r})):[];
  TV_PLAN=arr('plan');TV_SPOTS=arr('spots');
  TV_MIX=tvMixLong(arr('mix'));TV_CH=arr('ch');TV_DAY=arr('day');
  const m=t&&t.meta&&typeof t.meta==='object'?t.meta:{};
  TV_META={target:String(m.target||''),planReach:tvHas(m.planReach)?m.planReach:'',reach:tvHas(m.reach)?m.reach:'',reach3:tvHas(m.reach3)?m.reach3:''};
  TV_SEG=arr('seg');TV_WEEK=arr('week');TV_WKCH=arr('wkch');TV_WKRT=arr('wkrt');TV_WKSEG=arr('wkseg');}

/* ---------- 연결 ---------- */
(function initTV(){
  const go=()=>{
    const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
    on('tvPlanAdd',()=>tvAddRow('plan'));on('tvSpotAdd',()=>tvAddRow('spot'));
    on('tvPlanAdd2',()=>tvAddRow('plan'));on('tvSpotAdd2',()=>tvAddRow('spot'));
    on('tvPlanWipe',()=>tvWipe('plan'));on('tvSpotWipe',()=>tvWipe('spot'));
    on('tvPlanUp',()=>tvImport('plan'));on('tvSpotUp',()=>tvImport('spot'));
    /* 열 설정 (v81) — 설정 › 열 설정의 TV 탭 */
    on('tvPlanCols',()=>openColSettings('tv'));on('tvSpotCols',()=>openColSettings('tv'));
    /* v132 — 요약형 표 */
    on('tvMixAdd',()=>tvAddRow('mix'));on('tvMixAdd2',()=>tvAddRow('mix'));
    on('tvMixUp',()=>tvMixImport());on('tvMixWipe',()=>tvWipe('mix'));on('tvMixCols',()=>openColSettings('tv'));
    on('tvChAdd',()=>tvAddRow('ch'));on('tvDayAdd',()=>tvAddRow('day'));on('tvWkAdd',()=>tvAddRow('week'));
    on('tvSegAdd',()=>tvAddRow('seg'));on('tvSegUp',()=>tvImport('seg'));on('tvSegWipe',()=>tvWipe('seg'));
    on('tvResUp',()=>tvResImport());on('tvResWipe',()=>tvResWipe());on('tvResCols',()=>openColSettings('tv'));
    const meta=(id,k,num)=>{const e=$(id);if(!e)return;e.onchange=()=>{let v=e.value.trim();
      if(num)v=v===''?'':tvR(tvNum(v),3);TV_META[k]=v;tvPaintMeta();
      ['mix','ch','day','seg'].forEach(x=>{try{const t=$(TV_TBL[x].id);if(t&&t.tFoot)t.tFoot.innerHTML=tvFootHTML(x);}catch(err){}});
      tvPaintTarget();tvChanged();};};
    meta('tvTarget','target',false);meta('tvPlanReach','planReach',true);meta('tvReach','reach',true);meta('tvReach3','reach3',true);
    renderTV();applyMediaTabs();};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();
