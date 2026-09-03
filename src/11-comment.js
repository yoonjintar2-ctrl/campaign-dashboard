/* ===== 13. 섹션 숨기기 · 운영 코멘트 ===== */

/* ---------- 대시보드 항목 숨기기 ----------
   .sec[data-sect] 와 같은 키를 가진 모든 요소를 함께 감춘다. */
const SECT_LABEL={pace:'캠페인 진행 현황',comment:'운영 코멘트',kpi:'KPI 달성 현황',
  stat:'주요 지표',daily:'일자별 효율 비교',treemap:'분포(트리맵)',
  gantt:'소재 × 일자 게재 히스토리',heat:'요일별 · 일자별 효율 히트맵',
  creative:'효율 우수 소재',raw:'일자별 상세 효율',mix:'미디어믹스',
  bubble:'효율 버블'};
function applyHidden(){
  document.querySelectorAll('[data-sect]').forEach(elm=>{
    elm.style.display=HIDDEN.has(elm.dataset.sect)?'none':'';});
  renderHiddenBar();
}
function renderHiddenBar(){
  const bar=$('hiddenBar');if(!bar)return;
  const keys=[...HIDDEN];
  if(!keys.length){bar.classList.add('hidden');bar.innerHTML='';return;}
  bar.classList.remove('hidden');
  const nameOf=k=>k.indexOf('sum:')===0
    ? ((SUMMARIES.find(s=>'sum:'+s.id===k)||{name:'서머리'}).name)
    : (SECT_LABEL[k]||k);
  bar.innerHTML=`<b>숨긴 항목 ${keys.length}개</b>`
    +keys.map(k=>`<button data-show="${esc(k)}" title="다시 표시">${esc(nameOf(k))} ✕</button>`).join('')
    +'<button class="allbtn" data-showall>모두 다시 표시</button>';
  bar.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{
    HIDDEN.delete(b.dataset.show);applyHidden();renderSummaries();});
  bar.querySelector('[data-showall]').onclick=()=>{HIDDEN.clear();applyHidden();renderSummaries();};
}
/* 표 헤더 고정 위치 — 상단바 + 탭 + 서브바가 차지하는 높이를 CSS 변수로 알려 준다
   (세로 스크롤 없는 표들이 이 값을 기준으로 헤더를 붙인다) */
function syncStick(){
  const sb=document.querySelector('#subbar'),tb=document.querySelector('.tabs');
  const base=sb&&sb.offsetParent?sb:tb;
  if(!base)return;
  const r=base.getBoundingClientRect();
  const top=Math.max(0,Math.round(r.bottom-(base.style.position==='fixed'?0:0)));
  /* 화면 맨 위에 붙어 있을 때의 높이를 쓴다 (스크롤 위치와 무관하게) */
  const h=(document.querySelector('.topbar')?.offsetHeight||0)
    +(tb?.offsetHeight||0)+(sb&&sb.offsetParent?sb.offsetHeight:0);
  document.documentElement.style.setProperty('--stick',h+'px');
}
addEventListener('resize',syncStick);
addEventListener('load',syncStick);
setTimeout(syncStick,0);setTimeout(syncStick,600);

/* ---------- 영역 설명 (ⓘ) ----------
   광고주 · 시행사가 공통으로 궁금해할 만한 내용을 영역마다 한 덩어리로 적어 둔다. */
const SECT_INFO={
  pace:`<p>지표마다 <b>그 지표를 KPI로 잡은 라인들만</b> 모아 실적과 목표를 비교합니다.
     캠페인 전체 노출·클릭·조회가 아니라, 그 지표를 <b>보장한 라인</b>의 합입니다.</p>
   <p><b>막대 위의 점 = 목표 페이스.</b> 각 라인의 목표를 그 라인의 <b>집행 일수로 나눠 하루치</b>를 구하고
     오늘까지 지난 날만큼 더한 값입니다. 캠페인 중간에 들어온 매체는 시작 전까지 목표에 잡히지 않습니다.
     막대 끝이 이 점보다 오른쪽이면 페이스보다 앞선 것입니다.</p>
   <p>막대 색은 <b>페이스 대비 성과</b>를 나타냅니다. 기본은 남색이고, 앞설수록 초록 · 뒤처질수록
     붉은색 물결이 은은하게 흐릅니다. 페이스와 같으면 물결 없이 남색만 보입니다.</p>
   <p>막대 안 구간은 <b>매체별 기여</b>입니다. 각 %는 “그 매체가 전체 목표의 몇 %를 채웠나”라서
     모두 더하면 달성률이 됩니다.</p>
   <p>맨 위 <b>N일차 · NN% 경과</b>는 달력상 경과일이라 목표 페이스와 값이 다를 수 있습니다.</p>`,
  stat:`<p>조회 기간 동안의 <b>전체 합계</b>입니다. 필터를 걸면 그 범위만 집계됩니다.</p>
   <p><b>제안 대비</b>는 “제안대로면 오늘쯤 여기까지” 와 비교한 값입니다.
     볼륨·금액은 제안값 × 목표 페이스, 단가(CPM·CPC·CPV 등)는 제안 단가와 직접 견줍니다.
     단가는 낮을수록 좋으므로 부호를 뒤집어 읽습니다.</p>
   <p>카드 뒤 회색 선은 <b>일별 추이</b>입니다. 지표는 ⚙ 지표 설정에서 바꿉니다.</p>`,
  kpi:`<p><b>캠페인 전체 노출·클릭·조회가 아닙니다.</b> 매체(또는 상품)마다
     <b>그 매체가 KPI로 잡은 지표만</b> 골라 달성률을 그립니다.
     예를 들어 CPV로 산 상품은 조회만, CPM으로 산 상품은 노출만 봅니다.</p>
   <p>도넛의 <b>붉은 호가 목표 페이스</b>입니다. 달성 호는 살짝 비쳐 있어 페이스보다 앞서 있어도
     목표 지점이 어디인지 보입니다.</p>
   <p>맨 앞 카드는 전체 매체 기준 <b>예산 소진율</b>입니다.</p>`,
  daily:`<p>막대는 물량, 꺾은선은 단가입니다. 위쪽 말풍선은 그 기간에 있었던 <b>운영 이슈</b>입니다.</p>
   <p><b>예상 효율선</b>은 캠페인 설정에 넣은 제안값을 일평균으로 편 선입니다.
     실제 선이 그 아래(단가) 또는 위(물량)에 있으면 제안보다 잘 나오고 있다는 뜻입니다.</p>`,
  gantt:`<p>노출이 <b>1회 이상 발생한 날</b>을 게재한 날로 봅니다. 칸 색이 진할수록 그날 값이 큽니다.</p>
   <p>농도 기준은 <b>행(소재)별 최댓값</b>입니다. 소재끼리의 절대 비교가 아니라
     그 소재 안에서 어느 날이 셌는지를 봅니다.</p>`,
  creative:`<p>기준별로 <b>단가가 낮은 순</b> 상위 소재입니다. 조회 효율은 CPV, 클릭 효율은 CPC,
     노출 효율은 CPM 기준입니다.</p>
   <p>분모가 0인 소재(조회가 없는데 CPV를 보는 등)는 순위에서 빠집니다.
     소재를 누르면 원본과 지표를 볼 수 있습니다.</p>`,
  heat:`<p>열마다 <b>그 라인이 KPI로 잡은 지표의 단가</b>를 봅니다. 열이 다르면 단위도 다릅니다.</p>
   <p>색은 <b>같은 카테고리 · 같은 열 안에서만</b> 비교합니다.
     요일별과 휴일·평일은 한 묶음으로 보고, 일자별은 따로 봅니다.
     초록이 쌀수록(좋음), 빨강이 비쌀수록(나쁨)이고 가운데값은 회색입니다.</p>
   <p>칸에 마우스를 올리면 그 구간의 노출·클릭·조회·소진금액을 볼 수 있습니다.</p>`,
  treemap:`<p>면적은 값의 크기, 색은 매체입니다. 매체 → 광고상품 → 소재 순으로 물량이
     어디에 몰려 있는지 봅니다.</p>
   <p>색의 <b>농도는 단가 효율</b>입니다. 같은 매체 안에서 진할수록 단가가 낮습니다(= 효율이 좋습니다).</p>`,
  bubble:`<p>가로·세로 두 축 모두 <b>단가</b>라서 <b>오른쪽 · 위로 갈수록 좋습니다.</b>
     원의 크기는 노출량, 색은 매체입니다.</p>
   <p>노출 분포와 <b>매체 색이 항상 같습니다.</b> 종료된 소재는 테두리만 그립니다.</p>`,
  comment:`<p>이 캠페인에 대해 <b>시행사가 직접 적는</b> 운영 코멘트입니다.
     ✎ 자동 작성을 누르면 지금 수치를 바탕으로 초안을 만들어 줍니다.</p>
   <p>저장하면 광고주 화면에도 같이 보입니다.</p>`,
  raw:`<p>날짜별 숫자를 그대로 봅니다. 주말·공휴일은 붉은 글씨, 값이 없는 칸은 회색입니다.</p>
   <p>세로 · 가로 세그먼트로 매체별 · 상품별로 나눠 볼 수 있고,
     가로로 길어지면 표 위 <b>세그먼트 미니맵</b>으로 건너뜁니다. 일자 · 요일 열은 왼쪽에 고정됩니다.</p>`,
  mix:`<p><b>제안서용 표</b>입니다. 집행 실적이 아니라 캠페인 설정에 넣은 <b>예상 효율</b> 기준입니다.</p>
   <p><b>굵은 파란 숫자는 게런티(보장) 항목</b>입니다. 묶인 라인이 모두 그 지표를 보장할 때만 표시됩니다.</p>
   <p>KPI 목표 수는 각 라인이 자기 KPI로 잡은 목표의 합입니다.</p>`
};
function SUM_INFO(){return `<p>선택한 차원(매체 · 광고상품 · 타겟팅 등)으로 묶어 본 <b>집행 실적 요약</b>입니다.</p>
  <p>목표 열은 캠페인 설정의 <b>예상 효율</b>, 나머지는 조회 기간의 실제 집행값입니다.
    달성률 막대는 목표 대비 실적입니다.</p>
  <p>⚙ 헤더 편집에서 열 구성과 묶음을 바꿀 수 있습니다.</p>`;}
function attachInfo(tools,html,title){
  if(!tools||tools.querySelector('.infowrap'))return;
  const w=el('span','infowrap',tools);
  w.innerHTML=`<button class="infoi" title="${esc(title||'설명')}" aria-label="설명">i</button>`
    +`<div class="infopop">${title?`<div class="h">${esc(title)}</div>`:''}${html}</div>`;
  const pop=w.querySelector('.infopop');
  /* 설명 상자를 화면 안쪽에 앉힌다 — 아래가 좁으면 위로 뒤집고, 좌우도 화면 안으로 붙인다.
     position:fixed 라서 카드의 overflow 에 잘리지 않는다. */
  const place=()=>{
    pop.style.visibility='hidden';pop.style.left='0px';pop.style.top='0px';
    w.classList.remove('up');
    const r=w.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight;
    const vw=innerWidth, vh=innerHeight, M=12;
    let top=r.bottom+8, up=false;
    if(top+ph>vh-M){
      if(r.top-8-ph>M){top=r.top-8-ph;up=true;}
      else top=Math.max(M,vh-M-ph);}
    let left=Math.max(M,Math.min(r.right-pw,vw-M-pw));
    pop.style.left=left+'px';pop.style.top=top+'px';
    /* 화살표는 늘 아이콘 가운데를 가리킨다 */
    const ax=left+pw-(r.left+r.width/2)-5.5;
    pop.style.setProperty('--arrx',Math.max(6,Math.min(pw-17,ax)).toFixed(1)+'px');
    w.classList.toggle('up',up);
    pop.style.visibility='';};
  const open=v=>{w.classList.toggle('open',v);if(v)place();};
  w.addEventListener('mouseenter',()=>open(true));
  w.addEventListener('mouseleave',()=>open(false));
  w.querySelector('.infoi').onclick=e=>{e.stopPropagation();open(!w.classList.contains('open'));};
  addEventListener('scroll',()=>{if(w.classList.contains('open'))place();},true);
  addEventListener('resize',()=>{if(w.classList.contains('open'))place();});
}
document.addEventListener('click',()=>document.querySelectorAll('.infowrap.open')
  .forEach(w=>w.classList.remove('open')));

/* 각 섹션 제목 우측에 숨기기 버튼과 설명 아이콘을 붙인다 */
(function wireHide(){
  document.querySelectorAll('.sec[data-sect]').forEach(sec=>{
    const key=sec.dataset.sect;
    let tools=sec.querySelector('.tools');
    if(!tools)tools=el('div','tools',sec);
    const b=document.createElement('button');
    b.className='hidebtn agency-only';b.textContent='숨기기';b.title=`${SECT_LABEL[key]||key} 숨기기`;
    b.onclick=()=>{HIDDEN.add(key);applyHidden();};
    tools.appendChild(b);
    if(SECT_INFO[key])attachInfo(tools,SECT_INFO[key],SECT_LABEL[key]||key);});
})();

/* ---------- 운영 코멘트 · 서머리 표시 순서 ----------
   중간 자리(#slotMid)와 페이지 맨 아래(#slotEnd) 두 자리를 두고
   운영 코멘트와 서머리 묶음이 어느 자리에 들어갈지 정한다. */
let PERF_ORDER='sum';   /* 'sum' = 서머리 먼저 · 코멘트 맨 아래 */
function applyPerfOrder(){
  const mid=$('slotMid'),end=$('slotEnd'),cb=$('cmtBlock'),sb=$('sumBlock');
  if(!mid||!end||!cb||!sb)return;
  const first=PERF_ORDER==='cmt'?cb:sb, last=PERF_ORDER==='cmt'?sb:cb;
  mid.after(first);end.before(last);
  const sel=$('perfOrder');if(sel&&sel.value!==PERF_ORDER)sel.value=PERF_ORDER;
}
(function wirePerfOrder(){
  const sel=$('perfOrder');if(!sel)return;
  sel.onchange=()=>{PERF_ORDER=sel.value;applyPerfOrder();
    if(typeof markDirty==='function')markDirty();
    if(typeof syncStick==='function')syncStick();};
  applyPerfOrder();
})();

/* ---------- 운영 코멘트 ---------- */
let CMT_SAVED='';
const cmtHost=()=>$('cmtBody');
function cmtExec(cmd,val){
  const b=cmtHost();if(!b)return;
  b.focus();
  try{document.execCommand(cmd,false,val);}catch(e){}
  cmtDirty();
}
function cmtDirty(){const e=$('cmtState');if(e)e.textContent='변경됨 · 저장 대기';}
const CMT_HL='#2f6fb0';                 /* 강조색 — 파랑 고정 */
/* 텍스트 스타일 정의 — 글머리(목록) 여부까지 스타일에 포함한다 */
const CMT_STYLES=[
  {k:'cat', l:'카테고리', tag:'h4',  cls:'',     t:'매체처럼 가장 큰 묶음의 제목 (붉은색)'},
  {k:'ttl', l:'제목',     tag:'h5',  cls:'',     t:'광고상품처럼 카테고리 안의 제목'},
  {k:'body',l:'내용',     tag:'li',  cls:'',     t:'글머리가 붙는 본문 한 줄'},
  {k:'sub', l:'보조줄',   tag:'div', cls:'sub',  t:'윗줄보다 한 글자 들여 쓰고 ㄴ 를 붙인 보조 설명'},
  {k:'main',l:'메인 코멘트',tag:'h4', cls:'main', t:'카테고리와 같은 크기의 남색 제목'}
];
/* 커서가 놓인 블록 — 목록 항목이면 li, 아니면 코멘트 본문의 직계 자식 */
function cmtCurBlock(){
  const host=cmtHost();if(!host)return null;
  const sel=window.getSelection();
  if(!sel||!sel.anchorNode||!host.contains(sel.anchorNode))return null;
  let n=sel.anchorNode;
  if(n.nodeType!==1)n=n.parentNode;
  const li=n.closest?n.closest('li'):null;
  if(li&&host.contains(li))return li;
  let e=n;
  while(e&&e.parentNode&&e.parentNode!==host)e=e.parentNode;
  return (e&&e.nodeType===1&&e.parentNode===host)?e:null;
}
/* 커서를 새 블록 끝으로 옮긴다 */
function cmtCaret(node){
  try{const r=document.createRange();r.selectNodeContents(node);r.collapse(false);
    const s2=window.getSelection();s2.removeAllRanges();s2.addRange(r);}catch(e){}
}
/* 목록 중간의 li 를 빼낼 때 목록을 앞뒤로 나눈다 */
function cmtSplitList(ul,li){
  const after=[];let n=li.nextSibling;
  while(n){const nx=n.nextSibling;after.push(n);n=nx;}
  li.remove();
  let tail=null;
  if(after.length){
    tail=document.createElement(ul.tagName);
    after.forEach(x=>tail.appendChild(x));
    ul.parentNode.insertBefore(tail,ul.nextSibling);}
  const anchor=tail||ul.nextSibling;
  if(!ul.children.length)ul.remove();
  return anchor;
}
function cmtStyle(k){
  const host=cmtHost();if(!host)return;
  host.focus();
  const def=CMT_STYLES.find(x=>x.k===k);if(!def)return;
  let blk=cmtCurBlock();
  if(!blk){                                   /* 빈 코멘트 — 블록을 하나 만든다 */
    blk=document.createElement('div');blk.innerHTML='<br>';host.appendChild(blk);}
  const html=blk.innerHTML;
  const inLi=blk.tagName==='LI';
  if(def.tag==='li'){
    if(inLi){cmtDirty();return;}             /* 이미 목록 항목 */
    const li=document.createElement('li');li.innerHTML=html;
    const prev=blk.previousElementSibling;
    if(prev&&prev.tagName==='UL'){prev.appendChild(li);blk.remove();}
    else{const ul=document.createElement('ul');ul.appendChild(li);
      host.replaceChild(ul,blk);}
    cmtCaret(li);cmtDirty();cmtSnap();return;}
  const nb=document.createElement(def.tag);
  if(def.cls)nb.className=def.cls;
  /* 보조줄은 앞의 ㄴ 를 지우고 다시 붙인다 (다른 스타일로 바꿀 때 찌꺼기가 남지 않게) */
  nb.innerHTML=html.replace(/^\s*(ㄴ|└)\s*/,'');
  if(inLi){
    const ul=blk.parentNode;
    const anchor=cmtSplitList(ul,blk);
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(nb,anchor);
    else host.appendChild(nb);
  }else{
    host.replaceChild(nb,blk);}
  cmtCaret(nb);cmtDirty();cmtSnap();
}
function buildCmtBar(){
  const bar=$('cmtBar');if(!bar)return;
  bar.innerHTML=
     `<button data-c="hl" class="hl" title="강조색 (파랑) — 색은 고정입니다">강조</button>`
    +'<span class="sep"></span>'
    +'<span class="grp"><span class="glbl">텍스트 스타일</span>'
    +CMT_STYLES.map(x=>`<button data-s="${x.k}" title="${x.t}">${x.l}</button>`).join('')
    +'</span>';
  bar.querySelectorAll('[data-c]').forEach(bt=>bt.onclick=()=>{
    if(bt.dataset.c==='hl')cmtExec('foreColor',CMT_HL);});
  bar.querySelectorAll('[data-s]').forEach(bt=>bt.onclick=()=>cmtStyle(bt.dataset.s));
}
/* 조회 기간 기준으로 서머리 + 매체 · 광고상품별 코멘트 초안을 만든다 */
function autoComment(){
  const sc=viewScope(),pr=paceRatio();
  const fs=factFilter();
  const period=`${mdy(sc.startIso)}~${mdy(sc.endIso)}`;
  const ls0=activeLines();
  const medias=[...new Set(ls0.map(l=>l.media))];
  const unitOf=k=>({imp:'cpm',click:'cpc',view:'cpv',conv:'cpa',install:'cpi',eng:'cpe'}[k]||'cpm');
  const achOf=ls=>{const w=sum(ls.map(lineGross));
    return w?sum(ls.map(l=>(isFinite(kpiAch(l))?kpiAch(l):0)*lineGross(l)))/w:NaN;};
  /* ---- 서머리 ---- */
  const allAgg=aggFacts(fs),allGross=sum(ls0.map(lineGross));
  const allAch=achOf(ls0),allGap=(allAch-pr)*100;
  const byMedia=medias.map(m=>{const ls=ls0.filter(l=>l.media===m);
    return {m,ach:achOf(ls),gross:sum(ls.map(lineGross))};})
    .sort((x,y)=>(y.ach||0)-(x.ach||0));
  const days=Math.max(1,sc.i1-sc.i0+1);
  const bestAll=CREATIVES.map(c=>{const bb=crAgg(c);const uk=unitOf((LINES.find(l=>l.id===c.lid)||{}).kpi||'imp');
      return {c,uk,v:METRICS[uk].c(bb),base:bb.imp||0};})
    .filter(x=>x.base>0&&isFinite(x.v)&&x.v>0).sort((x,y)=>x.v-y.v)[0];
  /* 한 줄씩 끊어서 — 길게 이어 쓰면 읽기 어렵다 */
  const lines=[
    `조회 기간 <b>${period}</b> (${days}일) · 캠페인 <b>${esc(CAMPAIGN.name)}</b>`,
    `총 광고비 <b>${won(allGross)}</b> 중 <b>${won(allAgg.cost)}</b> 집행 `
      +`(소진율 <b>${pct(allAgg.cost/allGross,1)}</b>)`,
    `종합 KPI 달성률 <b>${pct(allAch,1)}</b> · 목표 페이스 ${pct(pr,1)} 대비 `
      +(allGap>=0?`<b>+${allGap.toFixed(1)}%p 앞섬</b>`:`진행 중`)
  ];
  if(byMedia.length>1)
    lines.push(`매체별 달성률 ${byMedia.map(x=>`${esc(x.m)} <b>${pct(x.ach,1)}</b>`).join(' · ')} `
      +`→ <b>${esc(byMedia[0].m)}</b> 가 가장 앞서 있음`);
  if(bestAll)
    lines.push(`최우수 소재 <b>${esc(bestAll.c.name)}</b> — ${METRICS[bestAll.uk].l} `
      +`<b>${METRICS[bestAll.uk].f(bestAll.v)}</b>`);
  const sm=`<div class="cmtsum"><span class="t">서머리</span>`
    +lines.map(x=>`<span class="ln">${x}</span>`).join('')+`</div>`;
  let h=sm;
  medias.forEach(m=>{
    const ls=ls0.filter(l=>l.media===m);
    h+=`<h4>[${esc(m)}]</h4>`;
    const prods=[...new Set(ls.map(l=>l.product))];
    prods.forEach((pd,pi)=>{
      const pls=ls.filter(l=>l.product===pd);
      const pf=fs.filter(f=>f.media===m&&f.product===pd);
      const a=aggFacts(pf),e=aggExp(pls);
      const kpi=pls[0]?pls[0].kpi:'imp';
      const kpiL=KPI_LABEL[kpi]||'노출';
      const unitK=unitOf(kpi);
      const unit=METRICS[unitK]?METRICS[unitK].c(a):NaN;
      const unitE=METRICS[unitK]?METRICS[unitK].c(e):NaN;
      const gross=sum(pls.map(lineGross));
      const spend=a.cost/gross;
      const got=paceSum2(pls,kpi),goal=sum(pls.map(l=>l.e[kpi]||0));
      const ach=got/goal;
      const gap=(ach-pr)*100;
      const diff=isFinite(unit)&&isFinite(unitE)?unit-unitE:NaN;
      /* 반응률 — 클릭 KPI 면 CTR, 조회 KPI 면 VTR 을 함께 본다 */
      const rateK={click:'ctr',view:'vtr',conv:'cvr',eng:'etr'}[kpi];
      const rv=rateK&&METRICS[rateK]?METRICS[rateK].c(a):NaN;
      const re=rateK&&METRICS[rateK]?METRICS[rateK].c(e):NaN;
      h+=`<h5>${pi+1}) ${esc(pd)}</h5><ul>`
        +`<li>${period} 기준 평균 ${METRICS[unitK].l} <b>${METRICS[unitK].f(unit)}</b> 기록`
          +(isFinite(diff)&&Math.round(Math.abs(diff))>=1
              ?` (제안 대비 ${diff<0?'−':'+'}${METRICS[unitK].f(Math.abs(diff))})`:'')+`</li>`
        /* 목표 페이스는 앞서 있을 때만 덧붙인다 */
        +`<li>${kpiL} 달성률 <b>${pct(ach,1)}</b>`
          +(gap>=0?`, 목표 페이스 ${pct(pr,1)} 대비 <b>+${gap.toFixed(1)}%p</b> 앞서 있음`:'')+`</li>`;
      if(rateK&&isFinite(rv)&&rv>0){
        const dp=(isFinite(re)?(rv-re)*100:NaN);
        h+=`<li>${RATE_LABEL[rateK]} <b>${pct(rv)}</b>`
          +(isFinite(dp)&&Math.abs(dp)>=0.005
             ?` — 제안 ${pct(re)} 대비 <b>${dp>=0?'+':'−'}${Math.abs(dp).toFixed(2)}%p</b>`
               +` ${dp>=0?'양호':'점검 필요'}`:'')+`</li>`;}
      h+=`<li>예산 소진율 <b>${pct(spend,1)}</b> (${won(a.cost)} / ${won(gross)})</li>`;
      const crs=CREATIVES.filter(c=>c.media===m&&c.product===pd)
        .map(c=>{const b2=crAgg(c);return {c,v:METRICS[unitK].c(b2),base:b2[kpi]||0};})
        .filter(x=>x.base>0&&isFinite(x.v)&&x.v>0).sort((x,y)=>x.v-y.v);
      if(crs.length)
        h+=`<li>소재 중 <b>${esc(crs[0].c.name)}</b>가 ${METRICS[unitK].l} `
          +`<b>${METRICS[unitK].f(crs[0].v)}</b>로 가장 우수</li>`;
      h+=`</ul>`;});
  });
  return h;
}
/* 특정 라인 묶음의 KPI 실적 합 (진행 스코프 기준) */
function paceSum2(ls,k){return sum(ls.map(l=>paceSum(l.daily[k])));}
/* 되돌리기 — contenteditable 기본 실행취소가 우리 DOM 조작을 못 따라가므로 직접 쌓는다 */
const CMT_UNDO=[],CMT_REDO=[];
function cmtSnap(){
  const b=cmtHost();if(!b)return;
  const h=b.innerHTML;
  if(CMT_UNDO.length&&CMT_UNDO[CMT_UNDO.length-1]===h)return;
  CMT_UNDO.push(h);if(CMT_UNDO.length>80)CMT_UNDO.shift();
  CMT_REDO.length=0;
}
function cmtUndo(){
  const b=cmtHost();if(!b||CMT_UNDO.length<2)return;
  CMT_REDO.push(CMT_UNDO.pop());
  b.innerHTML=CMT_UNDO[CMT_UNDO.length-1];cmtDirty();
}
function cmtRedo(){
  const b=cmtHost();if(!b||!CMT_REDO.length)return;
  const h=CMT_REDO.pop();CMT_UNDO.push(h);b.innerHTML=h;cmtDirty();
}
(function wireComment(){
  const b=cmtHost();if(!b)return;
  buildCmtBar();
  cmtSnap();
  let tmr=null;
  b.addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(cmtSnap,450);});
  b.addEventListener('input',cmtDirty);
  b.addEventListener('keydown',e=>{
    const k=(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.stopPropagation();
      if(e.shiftKey)cmtRedo();else cmtUndo();return;}
    if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();e.stopPropagation();cmtRedo();return;}
  },true);
  const auto=$('cmtAuto');
  if(auto)auto.onclick=()=>{
    const write=()=>{b.innerHTML=autoComment();cmtDirty();cmtSnap();};
    if(b.innerHTML.trim())
      confirmModal('지금 내용을 지우고 새로 작성할까요?',
        '조회 기간 기준으로 매체·광고상품별 초안을 다시 만듭니다.',write,'새로 작성');
    else write();};
  const sv=$('cmtSave');
  if(sv)sv.onclick=()=>{
    CMT_SAVED=b.innerHTML;
    const t=new Date();
    const e=$('cmtState');
    if(e)e.textContent=`저장됨 ${dFull(t)} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;};
  /* 광고주 모드에서는 읽기 전용 */
  const lock=()=>{b.contentEditable=isClient()?'false':'true';};
  lock();
  window.__cmtLock=lock;
})();

applyHidden();
