/* ===== 찾아 바꾸기 — 일자별 실적 입력 (v98) =====
   표가 500행씩 나뉘어 있어 브라우저의 찾기(Ctrl+F)로는 다른 쪽 행을 못 찾는다.
   표 전체(필터로 숨긴 행 제외)를 대상으로 찾고, 한 칸씩 또는 한 번에 바꾼다.
   · 범위: 모든 열 또는 열 하나 · 대소문자 구분 · 칸 전체 일치
   · 바꾼 값은 그대로 들어간다 — 예상 효율과 맞지 않으면 그 칸이 붉게 표시된다(엑셀 불러오기와 같은 규칙)
   · 모두 바꾸기는 한 번의 Ctrl+Z 로 되돌린다
   · 입력 탭에서 Ctrl+F · Ctrl+H 로도 연다 */
var FIND={open:false,q:'',r:'',col:'*',cs:false,whole:false,hits:[],cur:-1,note:''};
const findEsc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/* 칸의 글자 — 숫자 칸은 적힌 그대로(콤마 없이)와 화면 표기(콤마) 둘 다로 찾는다 */
function findCellTexts(r,c){
  const v=r[c.k];
  if(v===''||v==null)return [];
  if(c.type==='num'&&typeof v==='number')return [String(v),fmt(v)];
  return [String(v)];}
function findMatch(text){
  if(!FIND.q)return false;
  if(FIND.whole)return FIND.cs?text===FIND.q:text.toLowerCase()===FIND.q.toLowerCase();
  return FIND.cs?text.includes(FIND.q):text.toLowerCase().includes(FIND.q.toLowerCase());}
function findCols(){return sheetCols().filter(c=>c.type!=='calc'&&(FIND.col==='*'||c.k===FIND.col));}
function findCompute(){
  FIND.hits=[];
  if(!FIND.q){FIND.cur=-1;return;}
  const cols=sheetCols(),fc=new Set(findCols().map(c=>c.k));
  const view=(typeof SHEET_VIEW!=='undefined'&&SHEET_VIEW.length)?SHEET_VIEW:SHEET.map((_,i)=>i);
  view.forEach(ri=>{const r=SHEET[ri];if(!r)return;
    cols.forEach((c,ci)=>{if(!fc.has(c.k))return;
      if(findCellTexts(r,c).some(findMatch))FIND.hits.push({ri,ci,k:c.k});});});
  if(FIND.cur>=FIND.hits.length)FIND.cur=FIND.hits.length?0:-1;}
/* 바꾼 글자 — 칸 전체 일치면 통째로, 아니면 들어 있는 곳을 모두 */
function findReplaced(text){
  if(FIND.whole)return FIND.r;
  return text.replace(new RegExp(findEsc(FIND.q),FIND.cs?'g':'gi'),()=>FIND.r);}
function findApply(h){
  const r=SHEET[h.ri],c=SHEET_COLS.find(x=>x.k===h.k);if(!r||!c)return false;
  const v=r[c.k];
  if(c.type==='num'){
    /* 숫자 칸 — 적힌 그대로(콤마 없이) 바꿔 보고, 안 맞으면 화면 표기(콤마)로 */
    let src=String(v);if(!findMatch(src)&&typeof v==='number')src=fmt(v);
    const n=cleanNum(findReplaced(src));
    r[c.k]=n===null?'':isNaN(n)?findReplaced(src).trim():n;}
  else if(c.k==='date'){r.date=normDate(findReplaced(String(v)),r.date)||findReplaced(String(v));}
  else r[c.k]=findReplaced(String(v)).trim();
  return true;}
/* 표 위의 찾기 줄 */
function openSheetFind(focusReplace){
  let bar=$('sheetFind');
  if(!bar){
    const card=$('sheet')&&$('sheet').closest('.card');if(!card)return;
    bar=document.createElement('div');bar.id='sheetFind';bar.className='findbar';
    card.parentNode.insertBefore(bar,card);
    bar.innerHTML=`<span class="fdl">${L('찾기','Find')}</span>
      <input type="text" id="fdQ" placeholder="${L('찾을 내용','Find what')}" autocomplete="off">
      <span class="fdl">${L('바꿀 내용','Replace with')}</span>
      <input type="text" id="fdR" placeholder="${L('바꿀 내용 (비우면 지움)','Replace with (empty = erase)')}" autocomplete="off">
      <select id="fdCol" class="ctl" title="${L('찾을 열','Column to search')}"></select>
      <label class="fdo"><input type="checkbox" id="fdCase"> ${L('대소문자 구분','Match case')}</label>
      <label class="fdo"><input type="checkbox" id="fdWhole"> ${L('칸 전체 일치','Whole cell')}</label>
      <span class="fdgrp"><button type="button" class="btn sm" id="fdPrev" title="${L('이전 (Shift+Enter)','Previous (Shift+Enter)')}">▲</button><button type="button" class="btn sm" id="fdNext" title="${L('다음 (Enter)','Next (Enter)')}">▼</button></span>
      <button type="button" class="btn sm" id="fdOne">${L('바꾸기','Replace')}</button>
      <button type="button" class="btn sm primary" id="fdAll">${L('모두 바꾸기','Replace all')}</button>
      <span class="fdinfo" id="fdInfo"></span>
      <button type="button" class="btn sm fdx" id="fdClose" title="${L('닫기 (Esc)','Close (Esc)')}">✕</button>`;
    /* 찾기 줄 안의 키는 표(Ctrl+Z · 방향키 등)로 넘기지 않는다 */
    bar.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Enter'){e.preventDefault();findGo(e.shiftKey?-1:1);}
      else if(e.key==='Escape'){e.preventDefault();closeSheetFind();}});
    const re=()=>{FIND.q=$('fdQ').value;FIND.r=$('fdR').value;FIND.col=$('fdCol').value;
      FIND.cs=$('fdCase').checked;FIND.whole=$('fdWhole').checked;FIND.note='';
      FIND.cur=-1;findCompute();if(FIND.hits.length)FIND.cur=0;findPaint(true);};
    $('fdQ').oninput=re;$('fdR').oninput=()=>{FIND.r=$('fdR').value;};
    $('fdCol').onchange=re;$('fdCase').onchange=re;$('fdWhole').onchange=re;
    $('fdPrev').onclick=()=>findGo(-1);$('fdNext').onclick=()=>findGo(1);
    $('fdOne').onclick=findOne;$('fdAll').onclick=findAll;$('fdClose').onclick=closeSheetFind;}
  /* 열 목록은 열 설정이 바뀌었을 수 있어 열 때마다 새로 */
  const sel=$('fdCol'),cur=FIND.col;
  sel.innerHTML=`<option value="*">${L('모든 열','All columns')}</option>`
    +sheetCols().filter(c=>c.type!=='calc').map(c=>`<option value="${esc(c.k)}">${esc(c.l)}</option>`).join('');
  sel.value=[...sel.options].some(o=>o.value===cur)?cur:'*';
  bar.classList.remove('hidden');FIND.open=true;
  const q=$('fdQ');
  /* 고른 칸의 글자를 찾을 내용으로 미리 넣어 준다 (비어 있을 때만) */
  if(!q.value){try{const c=sheetCols()[SEL.c1],r=SHEET[SEL.r1];
    if(c&&r&&c.type!=='calc'&&document.querySelector('#sheet td.sel')&&r[c.k]!==''&&r[c.k]!=null)q.value=String(r[c.k]);}catch(e){}}
  FIND.q=q.value;FIND.r=$('fdR').value;FIND.col=sel.value;FIND.cs=$('fdCase').checked;FIND.whole=$('fdWhole').checked;
  findCompute();if(FIND.cur<0&&FIND.hits.length)FIND.cur=0;findPaint(false);
  (focusReplace&&q.value?$('fdR'):q).focus();
  (focusReplace&&q.value?$('fdR'):q).select();}
function closeSheetFind(){
  const bar=$('sheetFind');if(bar)bar.classList.add('hidden');
  FIND.open=false;FIND.hits=[];FIND.cur=-1;
  document.querySelectorAll('#sheet td.findhit,#sheet td.findcur').forEach(td=>td.classList.remove('findhit','findcur'));}
/* 찾은 칸 칠하기 · 지금 칸으로 데려가기 */
function findPaint(jump){
  const info=$('fdInfo');
  document.querySelectorAll('#sheet td.findhit,#sheet td.findcur').forEach(td=>td.classList.remove('findhit','findcur'));
  if(!FIND.open)return;
  if(info)info.textContent=FIND.note?FIND.note
    :!FIND.q?''
    :FIND.hits.length?L(`${fmt(FIND.hits.length)}개 중 ${FIND.cur+1}번째`,`${FIND.cur+1} of ${fmt(FIND.hits.length)}`)
    :L('찾는 내용이 없습니다','No matches');
  const h=FIND.hits[FIND.cur];
  /* 다른 쪽(500행 단위)에 있으면 그 쪽으로 넘긴 뒤 이어서 칠한다 */
  if(jump&&h)sheetShowRow(h.ri);
  const tb=$('sheet')&&$('sheet').tBodies[0];if(!tb)return;
  FIND.hits.forEach((x,i)=>{const td=tb.querySelector(`tr[data-ri="${x.ri}"] td[data-c="${x.ci}"]`);
    if(td)td.classList.add(i===FIND.cur?'findcur':'findhit');});
  if(jump&&h){const td=tb.querySelector(`tr[data-ri="${h.ri}"] td[data-c="${h.ci}"]`);
    if(td){SEL={r1:h.ri,c1:h.ci,r2:h.ri,c2:h.ci};try{paintSel();}catch(e){}
      td.scrollIntoView({block:'center',inline:'nearest'});}}}
function findGo(d){
  if(!FIND.hits.length){findCompute();}
  if(!FIND.hits.length){FIND.note='';findPaint(false);return;}
  FIND.note='';FIND.cur=(FIND.cur+d+FIND.hits.length)%FIND.hits.length;findPaint(true);}
function findOne(){
  if(!FIND.q)return;
  findCompute();
  const h=FIND.hits[FIND.cur<0?0:FIND.cur];if(!h){findPaint(false);return;}
  pushUndo();findApply(h);
  const at=FIND.cur<0?0:FIND.cur;
  renderSheet();syncSheet();
  findCompute();FIND.cur=FIND.hits.length?Math.min(at,FIND.hits.length-1):-1;
  FIND.note='';findPaint(true);}
function findAll(){
  if(!FIND.q)return;
  findCompute();
  const n=FIND.hits.length;if(!n){findPaint(false);return;}
  pushUndo();
  FIND.hits.forEach(findApply);
  renderSheet();syncSheet();
  findCompute();FIND.cur=FIND.hits.length?0:-1;
  FIND.note=L(`${fmt(n)}칸을 바꿨습니다 · 되돌리려면 Ctrl+Z`,`Replaced ${fmt(n)} cells · Ctrl+Z to undo`);
  findPaint(false);}
/* 표를 다시 그릴 때마다(쪽 넘김 · 입력 · 정렬) 찾은 칸을 다시 칠한다 */
(function(){try{const orig=renderSheet;renderSheet=function(){const r=orig.apply(this,arguments);
  try{if(FIND.open){findCompute();findPaint(false);}}catch(e){}return r;};}catch(e){}})();
/* 단추 · 단축키 */
{const b=$('sheetFindBtn');if(b)b.onclick=()=>FIND.open?closeSheetFind():openSheetFind(false);}
document.addEventListener('keydown',e=>{
  const tab=$('tab-input');if(!tab||tab.classList.contains('hidden'))return;
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const k=e.key.toLowerCase();if(k!=='f'&&k!=='h')return;
  /* 다른 창(모달)이 떠 있으면 건드리지 않는다 */
  if(document.querySelector('#modalHost .modal'))return;
  e.preventDefault();openSheetFind(k==='h');});
