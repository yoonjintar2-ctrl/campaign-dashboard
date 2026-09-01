/* ===== 13. 섹션 숨기기 · 운영 코멘트 ===== */

/* ---------- 대시보드 항목 숨기기 ----------
   .sec[data-sect] 와 같은 키를 가진 모든 요소를 함께 감춘다. */
const SECT_LABEL={pace:'캠페인 진행 현황',comment:'운영 코멘트',kpi:'KPI 달성 현황',
  stat:'전체 지표',daily:'일자별 효율 비교',treemap:'분포(트리맵)',
  gantt:'소재 × 일자 게재 히스토리',creative:'우수 소재',raw:'일자별 상세 효율',mix:'미디어믹스',
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
/* 각 섹션 제목 우측에 숨기기 버튼을 붙인다 */
(function wireHide(){
  document.querySelectorAll('.sec[data-sect]').forEach(sec=>{
    const key=sec.dataset.sect;
    let tools=sec.querySelector('.tools');
    if(!tools)tools=el('div','tools',sec);
    const b=document.createElement('button');
    b.className='hidebtn';b.textContent='숨기기';b.title=`${SECT_LABEL[key]||key} 숨기기`;
    b.onclick=()=>{HIDDEN.add(key);applyHidden();};
    tools.appendChild(b);});
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
