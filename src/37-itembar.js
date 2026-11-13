/* =====================================================================
   v210 — 품목 선택 줄 (TV · OTT · 리포트 메뉴 맨 위)
   · 품목을 고르면 메뉴마다 맞는 필터를 건다
       TV 큐시트 → 큐시트 안 '품목' 필터 · OTT 대시보드 → 구분(FILTER.segment)
       리포트 → 품목 선택(업종) · TV 실집행 추정금액 칩
       TV 캠페인 퍼포먼스 → 소재별 효율의 선택 품목
   · 모든 품목이 나오는 그래프(품목별 월 예산 · 품목별 집행)는 고른 품목만 진하게
   · 이름은 자료마다 다르다(큐시트 '카페 얼음' · 위클리 '카페얼음정수기' …) → itemKey 로 하나로 묶는다
   ===================================================================== */
var ITEM_SEL='';          // 고른 품목 열쇠(itemKey) · '' = 전체
var ITEM_SEG=false;       // OTT 구분 필터를 이 줄이 걸었는가(떠날 때 풀려고)
const ITEM_ALIAS={'카페얼음':'카페얼음정수기','아이콘얼음':'아이콘얼음정수기','음처기':'음식물처리기','스매':'스마트매트리스',
  '노블':'노블청정기','페스타':'코웨이페스타','트리플체어':'트리플체어2','마사지셋':'마사지셋/코어셋','코어셋':'마사지셋/코어셋'};
function itemKey(n){const s=String(n==null?'':n).replace(/\s+/g,'');return ITEM_ALIAS[s]||s;}
function itemOn(n){return !!ITEM_SEL&&itemKey(n)===ITEM_SEL;}
/* 리포트 업종 */
function itemCat(k){
  if(/얼음/.test(k))return '정수기 얼음';
  if(/^아이콘|정수기/.test(k))return '정수기 일반';
  if(/청정기|히티브/.test(k))return '공기청정기';
  if(/비데/.test(k))return '비데';
  if(/매트리스/.test(k))return '매트리스';
  if(/체어|마사지|코어셋|안마의자/.test(k))return '안마의자';
  if(/음식물/.test(k))return '음식물처리기';
  if(/페스타|브랜드/.test(k))return '브랜드';
  return '';}
/* 큐시트 품목 시트 — [약칭, 정식 이름, 묶음] */
function itemCueRows(){try{return (JSON.parse(CUE.json).sheets['품목']||[]).filter(r=>r&&r[0]);}catch(e){return [];}}
function itemAreaNow(){
  const T=$('tabs'),cur=T?(T.dataset.cur||''):'';
  /* v211 — 캠페인 퍼포먼스 · 일자별 · 주차별에는 품목으로 강조할 그래프가 없어 줄을 감춘다 */
  if(['tvmix','tvcue'].includes(cur))return 'tv';
  if(cur==='report')return 'report';
  if(cur==='dash'){try{return curDgArea()==='ott'?'ott':'';}catch(e){return '';}}
  return '';}
/* 이 캠페인의 품목 — 영역마다 있는 것 · 표시 이름은 처음 만난 이름(위클리 · OTT 구분 · 리포트) */
function itemList(){
  const m=new Map(),add=(n,a)=>{if(!n)return;const k=itemKey(n);if(!k)return;const e=m.get(k)||{k,l:String(n).trim(),a:new Set()};e.a.add(a);m.set(k,e);};
  try{if(typeof TV_WR!=='undefined'&&TV_WR&&TV_WR.items)TV_WR.items.forEach(it=>add(it.n,'tv'));}catch(e){}
  try{if(typeof TV_CUE!=='undefined'&&TV_CUE&&CUE.json){const S=JSON.parse(CUE.json).sheets,hd=((S['예산']||[])[0]||[]).slice(1),full={};
    itemCueRows().forEach(r=>full[r[0]]=r[1]||r[0]);hd.forEach(h=>add(full[h]||h,'tv'));}}catch(e){}
  try{(LINES||[]).filter(l=>isOttMedia(l.media)).forEach(l=>add(l.segment,'ott'));}catch(e){}
  try{if(typeof RPT_DOC!=='undefined'&&RPT_DOC&&RPT_DOC.own){const o=RPT_DOC.own.find(x=>x.m===RPT_DOC.m);(o?o.it:[]).filter(x=>rN(x[1])>0).forEach(x=>add(x[0],'report'));}}catch(e){}
  return [...m.values()];}
function itemBarPaint(){
  const h=$('itemBar');if(!h)return;const ar=itemAreaNow();
  const IL=ar?itemList():[];
  const show=!!ar&&IL.length>1;
  h.classList.toggle('hidden',!show);document.body.classList.toggle('ihl',!!ITEM_SEL&&show);
  if(!show){h.innerHTML='';return;}
  if(ITEM_SEL&&!IL.some(x=>x.k===ITEM_SEL))IL.push({k:ITEM_SEL,l:ITEM_SEL,a:new Set()});
  /* 지금 영역에 있는 품목을 앞에 */
  const here=IL.filter(x=>x.a.has(ar)),other=IL.filter(x=>!x.a.has(ar));
  const chip=x=>`<button type="button" class="ichip${x.k===ITEM_SEL?' on':''}${x.a.has(ar)?'':' na'}" data-ik="${esc(x.k)}" title="${x.a.has(ar)?'':esc(L('이 메뉴에는 이 품목 자료가 없습니다','No data for this item here'))}">${esc(x.l)}</button>`;
  h.innerHTML=`<div class="itembar-in"><span class="lb">${L('품목','Item')}</span><div class="ichips"><button type="button" class="ichip all${ITEM_SEL?'':' on'}" data-ik="">${L('전체','All')}</button>${here.map(chip).join('')}${other.length?'<i class="sep"></i>'+other.map(chip).join(''):''}</div></div>`;
  h.querySelectorAll('[data-ik]').forEach(b=>b.onclick=()=>{const k=b.dataset.ik;if(k===ITEM_SEL)return;ITEM_SEL=k;itemApply(true);});}
/* 고른 품목을 지금 메뉴에 적용 — 화면을 다시 그린다 */
function itemApply(redraw){
  const ar=itemAreaNow(),k=ITEM_SEL;
  /* OTT 구분 필터 — OTT 를 볼 때만 건다. 다른 화면으로 가면 푼다 */
  try{
    if(ar==='ott'){let seg='all';if(k){const l=(LINES||[]).find(x=>isOttMedia(x.media)&&itemKey(x.segment)===k);if(l)seg=l.segment;}
      if(FILTER.segment!==seg){FILTER.segment=seg;ITEM_SEG=seg!=='all';if(redraw){buildFilters();renderAll();}else DG_DIRTY=true;}}
    else if(ITEM_SEG){FILTER.segment='all';ITEM_SEG=false;DG_DIRTY=true;}
  }catch(e){console.warn('item ott',e);}
  if(ar==='tv'){
    try{if(k&&typeof TV_WR!=='undefined'&&TV_WR&&TV_WR.items){const it=TV_WR.items.find(x=>itemKey(x.n)===k);if(it)WR_SEL={item:it.n,cr:''};}}catch(e){}
    /* 큐시트 틀 안 품목 필터 */
    try{const f=$('cueFrame');if(f&&f.contentWindow&&f.contentWindow.cueSetItems){const sh=itemCueRows().filter(r=>itemKey(r[1]||r[0])===k||itemKey(r[0])===k).map(r=>r[0]);f.contentWindow.cueSetItems(k&&sh.length?sh:null,!!k&&!sh.length);}}catch(e){}
    if(redraw){const T=$('tabs'),cur=T?T.dataset.cur:'';try{if(cur==='tvdash')renderTvDash();else if(cur==='tvcue'){const el=$('cueTop');if(el)el.dataset.k='';cueTopPaint();}else if(cur==='tvmix'){try{renderWrMix();}catch(e){}}}catch(e){console.warn('item tv',e);}}}
  if(ar==='report'){
    const c=k?itemCat(k):'';
    try{if(c&&RPT_DOC&&RPT_DOC.cats.some(x=>x.k===c)){RPT.cat=c;RPT.brand='코웨이';}
      if(c&&RPT_DOC&&RPT_DOC.tvx&&RPT_DOC.tvx.cats.some(x=>x.k===c))RPX.c=c;}catch(e){}
    if(redraw)try{renderReport();}catch(e){console.warn('item rpt',e);}}
  itemBarPaint();}
