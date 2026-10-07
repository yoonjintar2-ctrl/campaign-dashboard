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
/* v113 — 6,000행 표에서 한 글자 칠 때마다 3~16초 멈추던 것.
   ① 찾는 말은 한 번만 소문자로 ② 숫자 칸의 화면 표기(콤마)는 찾는 말에 콤마 · 점이 있거나 소수일 때만 만든다
   ③ 칠하기는 지금 쪽(500행)의 칸만 훑는다(예전엔 찾은 칸마다 표 전체에서 querySelector — 1만 2천 번)
   ④ 입력은 잠깐 모아서(0.18초) 한 번에 찾는다 */
function findCompute(){
  FIND.hits=[];
  if(!FIND.q){FIND.cur=-1;return;}
  const cols=sheetCols(),fc=new Set(findCols().map(c=>c.k));
  const view=(typeof SHEET_VIEW!=='undefined'&&SHEET_VIEW.length)?SHEET_VIEW:SHEET.map((_,i)=>i);
  const cs=FIND.cs,q=cs?FIND.q:FIND.q.toLowerCase(),whole=FIND.whole,numQ=/[,.]/.test(FIND.q);
  const test=t=>{if(!cs)t=t.toLowerCase();return whole?t===q:t.includes(q);};
  /* 찾는 말에 숫자가 하나도 없으면 숫자 칸은 볼 필요가 없다(실데이터 6천 행 × 24열에서 200ms → 수십 ms) */
  const hasDigit=/\d/.test(FIND.q);
  const use=[];cols.forEach((c,ci)=>{if(fc.has(c.k)&&(hasDigit||c.type!=='num'))use.push([c,ci]);});
  const out=FIND.hits;
  for(let i=0;i<view.length;i++){const ri=view[i],r=SHEET[ri];if(!r)continue;
    for(let j=0;j<use.length;j++){const c=use[j][0],v=r[c.k];
      if(v===''||v==null)continue;
      let hit=test(String(v));
      if(!hit&&c.type==='num'&&typeof v==='number'&&(numQ||v%1!==0))hit=test(fmt(v));
      if(hit)out.push({ri,ci:use[j][1],k:c.k});}}
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
      if(e.key==='Enter'){e.preventDefault();
        if(FIND.t&&FIND.re){FIND.re();return;}   /* 모아 둔 검색이 있으면 먼저 찾고 첫 칸으로 */
        findGo(e.shiftKey?-1:1);}
      else if(e.key==='Escape'){e.preventDefault();closeSheetFind();}});
    const re=()=>{clearTimeout(FIND.t);FIND.t=0;
      FIND.q=$('fdQ').value;FIND.r=$('fdR').value;FIND.col=$('fdCol').value;
      FIND.cs=$('fdCase').checked;FIND.whole=$('fdWhole').checked;FIND.note='';
      FIND.cur=-1;findCompute();if(FIND.hits.length)FIND.cur=0;findPaint(true);};
    FIND.re=re;
    /* 타이핑 중에는 잠깐 모았다가 한 번에 — 칠 때마다 표 전체를 훑지 않는다 */
    $('fdQ').oninput=()=>{clearTimeout(FIND.t);const info=$('fdInfo');if(info&&$('fdQ').value)info.textContent=L('찾는 중…','Searching…');
      FIND.t=setTimeout(re,180);};
    $('fdR').oninput=()=>{FIND.r=$('fdR').value;};
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
  /* 다른 쪽(500행 단위)에 있으면 그 쪽으로 넘긴 뒤 이어서 칠한다(표를 다시 그릴 때 끼어드는 칠하기는 건너뛴다) */
  if(jump&&h){FIND.painting=1;try{sheetShowRow(h.ri);}finally{FIND.painting=0;}}
  const tb=$('sheet')&&$('sheet').tBodies[0];if(!tb)return;
  /* 지금 쪽에 그려진 줄만 — 줄 번호 → 찾은 칸 번호들 */
  const byRow=new Map();
  FIND.hits.forEach((x,i)=>{let a=byRow.get(x.ri);if(!a){a=[];byRow.set(x.ri,a);}a.push([x.ci,i]);});
  let curTd=null;
  for(const tr of tb.rows){const a=byRow.get(+tr.dataset.ri);if(!a)continue;
    const tds={};tr.querySelectorAll('td[data-c]').forEach(td=>{tds[td.dataset.c]=td;});
    for(const [ci,i] of a){const td=tds[ci];if(!td)continue;
      td.classList.add(i===FIND.cur?'findcur':'findhit');if(i===FIND.cur)curTd=td;}}
  if(jump&&h&&curTd){SEL={r1:h.ri,c1:h.ci,r2:h.ri,c2:h.ci};try{paintSel();}catch(e){}
    curTd.scrollIntoView({block:'center',inline:'nearest'});}}
function findGo(d){
  if(!FIND.hits.length){findCompute();}
  if(!FIND.hits.length){FIND.note='';findPaint(false);return;}
  FIND.note='';FIND.cur=(FIND.cur+d+FIND.hits.length)%FIND.hits.length;findPaint(true);}
/* 지금 쪽에 그려진 그 칸 하나만 새 값으로 — 칸 모양(입력칸 · 목록 · 날짜)과 붉은 표시(매칭 안 됨)까지 */
function findPatchCell(h){
  try{
    const cols=sheetCols();if(cols.some(c=>c.type==='calc'))return false;   /* 계산 열이 있으면 줄 전체를 다시 */
    const tb=$('sheet')&&$('sheet').tBodies[0];if(!tb)return false;
    const tr=tb.querySelector(`tr[data-ri="${h.ri}"]`);if(!tr)return true;   /* 이 쪽에 없는 줄 — 그릴 것 없음 */
    const r=SHEET[h.ri],c=cols[h.ci];if(!r||!c)return false;
    const td=tr.querySelector(`td[data-c="${h.ci}"]`);if(!td)return false;
    if(c.type==='dim'){const sel=td.querySelector('select');if(!sel)return false;
      const v=r[c.k]||'';sel.innerHTML=`<option value="${esc(v)}" selected>${v?esc(v):'선택'}</option>`;sel.dataset.lazy='1';}
    else if(c.k==='date'){const inp=td.querySelector('input.dtxt');if(!inp)return false;inp.value=r.date||'';
      const dn=td.querySelector('input.dnative');if(dn)dn.value=/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')?r.date:'';}
    else{const inp=td.querySelector('input');if(!inp)return false;
      inp.value=c.type==='num'?(numBad(r[c.k])?String(r[c.k]):(+r[c.k]?fmt(r[c.k]):'')):(r[c.k]||'');}
    const iss=rowCellIssues(r),bad=new Set(iss.cells);
    tr.querySelectorAll('td[data-c]').forEach(t=>{const cc=cols[+t.dataset.c];if(!cc)return;
      const b=bad.has(cc.k);t.classList.toggle('badcell',b);
      if(b)t.title=(cc.type==='num'?ROW_ISSUE_LABEL.num:CELL_ISSUE_LABEL[cc.k])||ROW_ISSUE_LABEL[iss.kind]||'';
      else t.removeAttribute('title');});
    return true;
  }catch(e){console.warn('찾아 바꾸기 칸 고치기',e);return false;}}
/* 바꾸기 결과는 찾기 줄의 글자만으로는 눈에 잘 안 띈다 — 화면 아래 알림으로도 띄운다 (v113) */
function findToast(n,left){
  if(typeof showToast!=='function')return;
  if(!n){showToast(L('바꿀 내용이 없습니다','Nothing to replace'),'',{kind:'warn'});return;}
  showToast(L(`${fmt(n)}칸을 바꿨습니다`,`Replaced ${fmt(n)} cell${n>1?'s':''}`),
    (left!=null&&left>0?L(`남은 ${fmt(left)}개 · `,`${fmt(left)} left · `):'')+L('되돌리려면 Ctrl+Z','Ctrl+Z to undo'),{kind:'ok'});}
function findOne(){
  if(FIND.t&&FIND.re)FIND.re();
  if(!FIND.q)return;
  findCompute();
  const h=FIND.hits[FIND.cur<0?0:FIND.cur];if(!h){findPaint(false);findToast(0);return;}
  pushUndo();findApply(h);
  const at=FIND.cur<0?0:FIND.cur;
  /* 한 칸만 바뀌었으니 그 칸만 고친다 — 표 전체를 다시 그리면 실데이터에서 2초 가까이 걸렸다 */
  if(!findPatchCell(h)){FIND.painting=1;try{renderSheet();}finally{FIND.painting=0;}}
  syncSheet();
  findCompute();FIND.cur=FIND.hits.length?Math.min(at,FIND.hits.length-1):-1;
  FIND.note=L(`1칸을 바꿨습니다`,`Replaced 1 cell`)+(FIND.hits.length?L(` · 남은 ${fmt(FIND.hits.length)}개`,` · ${fmt(FIND.hits.length)} left`):'');
  findPaint(true);findToast(1,FIND.hits.length);}
function findAll(){
  if(FIND.t&&FIND.re)FIND.re();
  if(!FIND.q)return;
  findCompute();
  const n=FIND.hits.length;if(!n){findPaint(false);findToast(0);return;}
  pushUndo();
  FIND.hits.forEach(findApply);
  FIND.painting=1;try{renderSheet();}finally{FIND.painting=0;}syncSheet();
  findCompute();FIND.cur=FIND.hits.length?0:-1;
  FIND.note=L(`✓ ${fmt(n)}칸을 바꿨습니다 · 되돌리려면 Ctrl+Z`,`✓ Replaced ${fmt(n)} cells · Ctrl+Z to undo`);
  findPaint(false);findToast(n);}
/* 표를 다시 그릴 때마다(쪽 넘김 · 입력 · 정렬) 찾은 칸을 다시 칠한다 */
(function(){try{const orig=renderSheet;renderSheet=function(){const r=orig.apply(this,arguments);
  try{if(FIND.open&&!FIND.painting){findCompute();findPaint(false);}}catch(e){}return r;};}catch(e){}})();
/* 단추 · 단축키 */
{const b=$('sheetFindBtn');if(b)b.onclick=()=>FIND.open?closeSheetFind():openSheetFind(false);}
document.addEventListener('keydown',e=>{
  const tab=$('tab-input');if(!tab||tab.classList.contains('hidden'))return;
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const k=e.key.toLowerCase();if(k!=='f'&&k!=='h')return;
  /* 다른 창(모달)이 떠 있으면 건드리지 않는다 */
  if(document.querySelector('#modalHost .modal'))return;
  e.preventDefault();openSheetFind(k==='h');});
