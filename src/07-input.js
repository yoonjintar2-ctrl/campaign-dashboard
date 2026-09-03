/* ===== 9. 데이터 입력 ===== */
/* 데이터 입력 열 — 항목 사전의 "대시보드/데이터입력 사용 가능 + 수동 입력" 항목.
   기본 표시는 사전의 디펄트 열, 그 외는 열 설정에서 켤 수 있다. */
/* 필수 표시는 일자·매체명 둘뿐 — 나머지는 열 설정에서 자유롭게 켜고 끈다 */
const SHEET_REQ=['date','media'];
const SHEET_DIMS=[
  {k:'segment',l:'구분',w:110,type:'dim',rule:'캠페인 설정의 구분 목록',lock:1,on:false},
  {k:'media',l:'매체명',w:104,type:'dim',rule:'설정 › 라인 목록',lock:1,on:true},
  {k:'product',l:'광고상품명',w:150,type:'dim',rule:'상위 선택에 매칭 · 조합 또는 개별 항목',lock:1,on:true},
  {k:'slot',l:'광고 지면',w:140,type:'dim',rule:'상위 선택에 매칭 · 조합 또는 개별 항목',lock:1,on:false},
  {k:'target',l:'타겟팅 그룹명',w:150,type:'dim',rule:'상위 선택에 매칭',lock:1,on:true},
  {k:'line',l:'제품',w:100,type:'dim',rule:'상위 선택에 매칭',lock:1,on:false},
  {k:'creative',l:'소재',w:150,type:'dim',rule:'상위 선택에 매칭 · 소재 목록',lock:1,on:true}
];
const SHEET_W={date:112,imp:96,click:84,view:92,rev:108,net:112,cost:130};
/* 기본 표시 열 — 일자 · 매체명 · 광고상품명 · 타겟팅 그룹명 · 소재 · 노출 · 클릭 · 조회 · 소진비용 */
const SHEET_DEF_ON=['date','media','product','target','creative','imp','click','view','cost'];
const SHEET_LABEL={cost:'소진비용 (Gross)',net:'Net 광고비'};
const SHEET_RULE={cost:'숫자 입력 · Gross 기준',net:'Gross 소진비용에서 자동 역산'};
const sheetColsDefault=()=>
  [{k:'date',l:'일자',w:112,type:'text',rule:'YYYY-MM-DD · 라인 집행 기간 내',lock:1,on:true}]
  .concat(SHEET_DIMS.map(c=>({...c,on:SHEET_DEF_ON.includes(c.k)})))
  .concat(FIELDS.filter(f=>f.dashOk&&f.kind==='in'&&!/^e_/.test(f.k)
      &&!['date','start','end','startT','endT','budget','value','feeA','feeR','net'].includes(f.k))
    .map(f=>({k:f.k,l:SHEET_LABEL[f.k]||f.l,
      w:SHEET_W[f.k]||92,type:'num',rule:SHEET_RULE[f.k]||'숫자 입력',
      lock:1,on:SHEET_DEF_ON.includes(f.k)})));
let SHEET_COLS=sheetColsDefault();
/* 예전 저장본(net 기준·소재 열 없음)을 지금 열 구성에 맞춰 얹는다 */
function mergeCols(saved,def){
  if(!Array.isArray(saved)||!saved.length)return def;
  const by={};saved.forEach(c=>by[c.k]=c);
  const kept=saved.filter(c=>def.some(d=>d.k===c.k)||!c.lock)
    .map(c=>{const d=def.find(x=>x.k===c.k);return d?{...d,l:c.l,w:c.w,on:c.on}:c;});
  def.forEach(d=>{if(!by[d.k])kept.push(d);});
  return kept;
}
const numKeys=()=>SHEET_COLS.filter(c=>c.type==='num').map(c=>c.k);
const sheetCols=()=>SHEET_COLS.filter(c=>c.on!==false);
let SHEET=LINES.map(l=>{
  const idx=ELAPSED-1,v=l.daily.view[idx];
  const cs=CREATIVES.filter(c=>c.lid===l.id);
  return {date:CAMPAIGN.today,segment:l.segment,media:l.media,product:l.product,slot:l.slot||'',target:l.target,line:l.line,
    creative:cs.length?cs[0].name:'',cost:Math.round(toGross(l.daily.net[idx],feeOf(l))),
    imp:l.daily.imp[idx],click:l.daily.click[idx],view:v,eng:l.daily.eng[idx],conv:l.daily.conv[idx],
    lead:l.daily.lead[idx],install:l.daily.install[idx],rev:l.daily.rev[idx],
    like:l.daily.like[idx],share:l.daily.share[idx],
    v3:l.daily.v3[idx],v15:l.daily.v15[idx],v30:l.daily.v30[idx],
    v25:l.daily.v25[idx],v50:l.daily.v50[idx],v75:l.daily.v75[idx],v100:l.daily.v100[idx]};});
const DIM_CHAIN=['segment','media','product','slot','target','line','creative'];
/* 상위 차원이 정해졌으면 그 조건에 맞는 라인만 남긴다.
   여러 항목이 들어가는 차원(광고상품·지면·타겟팅·소재)은 "포함"으로 본다 —
   조합 전체(예상효율에 등록한 그대로)로 골라도 되고, 그 안의 한 항목만 골라도 된다. */
const dimMatch=(l,k,v)=>{
  if(!v)return true;
  if(!MULTI_DIMS.includes(k))return l[k]===v;
  if(l[k]===v)return true;
  const set=new Set(lineMulti(l,k)),want=parseMulti(v);
  return want.length>0&&want.every(x=>set.has(x));};
const dimOpts=(k,row)=>{const i=DIM_CHAIN.indexOf(k);
  const ls=LINES.filter(l=>DIM_CHAIN.slice(0,i).every(p=>dimMatch(l,p,row[p])));
  /* 조합 전체와 그 안의 개별 항목을 함께 고를 수 있게 둘 다 내려 준다 */
  if(MULTI_DIMS.includes(k))
    return [...new Set(ls.flatMap(l=>[l[k]].concat(lineMulti(l,k))))].filter(Boolean);
  return [...new Set(ls.map(l=>l[k]))].filter(Boolean);};
/* 켜 둔 열만으로 라인을 찾는다 — 값이 빈 차원은 조건에서 뺀다.
   광고상품·지면·타겟팅은 순서가 달라도, 조합 중 일부만 적어도 같은 라인으로 본다. */
function rowLine(r){
  const keys=['segment','media','product','slot','target','line'].filter(k=>r[k]);
  if(!keys.length)return null;
  const ok=l=>keys.every(k=>dimMatch(l,k,r[k]));
  /* 조합이 정확히 같은 라인을 먼저 고르고, 없으면 그 항목을 품고 있는 라인 */
  const exact=LINES.find(l=>ok(l)&&keys.every(k=>!MULTI_DIMS.includes(k)
    ||lineMulti(l,k).length===parseMulti(r[k]).length));
  return exact||LINES.find(ok)||null;}
function rowBad(r){
  const l=rowLine(r);if(!l)return !!(r.media||r.product);
  return !(r.date>=l.start&&r.date<=l.end);}
let SEL={r1:0,c1:0,r2:0,c2:0},selecting=false;
const inSel=(r,c)=>r>=Math.min(SEL.r1,SEL.r2)&&r<=Math.max(SEL.r1,SEL.r2)&&c>=Math.min(SEL.c1,SEL.c2)&&c<=Math.max(SEL.c1,SEL.c2);
function evalFormula(f,row){
  try{const expr=String(f).replace(/[A-Za-z_][A-Za-z0-9_]*/g,m=>{const v=row[m];return v===undefined?'0':String(+v||0);});
    if(!/^[0-9.+\-*/()\s]*$/.test(expr))return NaN;
    return Function('"use strict";return ('+expr+')')();}catch(e){return NaN;}}
function checkFormula(f,cols){
  if(!f.trim())return '수식을 입력하세요.';
  const keys=(cols||SHEET_COLS).map(c=>c.k);
  const toks=f.match(/[A-Za-z_][A-Za-z0-9_]*/g)||[];
  const bad=toks.filter(t=>!keys.includes(t));
  if(bad.length)return `알 수 없는 열: ${bad.join(', ')}`;
  if(!/^[A-Za-z0-9_.+\-*/()\s]*$/.test(f))return '사칙연산(+ - * /)과 괄호만 사용할 수 있습니다.';
  let bal=0;for(const ch of f){if(ch==='(')bal++;if(ch===')')bal--;if(bal<0)return '괄호가 맞지 않습니다.';}
  if(bal!==0)return '괄호가 맞지 않습니다.';
  if(!toks.length)return '열을 하나 이상 포함해야 합니다.';
  const test={};(cols||SHEET_COLS).forEach(c=>test[c.k]=2);
  if(!isFinite(evalFormula(f,test)))return '수식을 계산할 수 없습니다.';
  return null;}
function renderSheet(){
  const t=$('sheet'),cols=sheetCols();
  let dl='';
  SHEET.forEach((r,i)=>{['segment','media','product','target','line'].forEach(k=>{
    dl+=`<datalist id="dl-${k}-${i}">${dimOpts(k,r).map(o=>`<option value="${esc(o)}">`).join('')}</datalist>`;});});
  let h='<thead><tr><th style="width:34px" class="rm">'
    +'<button id="sheetClearAll" title="입력한 일별 실적을 모두 지웁니다">✕</button></th>'
    +cols.map(c=>`<th style="min-width:${c.w||110}px">${c.l}${c.type==='calc'?' ƒ':''}</th>`).join('')+'</tr></thead><tbody>';
  SHEET.forEach((r,ri)=>{
    h+=`<tr class="${rowBad(r)?'bad':''}"><td class="rm"><button data-del="${ri}">✕</button></td>`;
    cols.forEach((c,ci)=>{
      if(c.type==='calc'){h+=`<td class="calc mono">${fmt(evalFormula(c.rule,r))}</td>`;return;}
      /* 숫자 칸은 값이 없으면(0·미입력) 빈칸으로 둔다 */
      const v=c.type==='num'?(+r[c.k]?fmt(r[c.k]):''):(r[c.k]||'');
      const cls=[c.type==='dim'?'dd':'',c.k==='date'?'dt':'',inSel(ri,ci)?'sel':'',
        (ri===SEL.r1&&ci===SEL.c1)?'anchor':''].filter(Boolean).join(' ');
      if(c.type==='dim'){
        /* 클릭하면 곧바로 선택 목록이 열리도록 select 사용 */
        const opts=dimOpts(c.k,r);
        const cur=r[c.k]||'';
        h+=`<td class="${cls}" data-r="${ri}" data-c="${ci}"><select data-r="${ri}" data-c="${ci}">`
          +`<option value=""${cur?'':' selected'}>선택</option>`
          +opts.map(o=>`<option value="${esc(o)}"${o===cur?' selected':''}>${esc(o)}</option>`).join('')
          +(cur&&!opts.includes(cur)?`<option value="${esc(cur)}" selected>${esc(cur)}</option>`:'')
          +`</select></td>`;
      }else if(c.k==='date'){
        /* 텍스트로 자유 입력 + 우측 달력 아이콘으로 날짜 선택 */
        h+=`<td class="${cls}" data-r="${ri}" data-c="${ci}"><span class="datecell">`
          +`<input type="text" class="dtxt" data-r="${ri}" data-c="${ci}" value="${esc(v)}" `
          +`placeholder="YYYY-MM-DD" title="8/3, 08-03, 2026-08-03 등 자유롭게 입력하면 자동 변환됩니다">`
          +`<button type="button" class="dpick" data-dp="${ri}" title="달력에서 선택">`
          +`<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><rect x="1" y="2.5" width="12" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1 6h12M4.4 1v3M9.6 1v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>`
          +`<input type="date" class="dnative" data-dn="${ri}" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'')}" tabindex="-1">`
          +`</span></td>`;
      }else{
        h+=`<td class="${cls}" data-r="${ri}" data-c="${ci}"><input type="text" data-r="${ri}" data-c="${ci}" value="${esc(v)}"></td>`;}
    });
    h+='</tr>';});
  t.innerHTML=h+'</tbody>'+dl;
  const bad=SHEET.filter(rowBad).length;
  $('sheetNote').innerHTML=`${SHEET.length}행 · 새 행 기본 일자 = 어제(${YESTERDAY})`
    +(bad?` · <b style="color:var(--neg)">기간을 벗어난 행 ${bad}개</b>`:'');
  const gross=sum(SHEET.map(r=>+r.cost||0));
  $('sheetSum').innerHTML=`합계 — 노출 <b class="mono">${fmt(sum(SHEET.map(r=>+r.imp||0)))}</b> ·
    클릭 <b class="mono">${fmt(sum(SHEET.map(r=>+r.click||0)))}</b> ·
    조회 <b class="mono">${fmt(sum(SHEET.map(r=>+r.view||0)))}</b> ·
    전환 <b class="mono">${fmt(sum(SHEET.map(r=>+r.conv||0)))}</b> ·
    Gross 광고비 <b class="mono">${won(gross)}</b>`;
  /* 머리글 끝을 끌어 열 너비 조정 — 맨 앞 삭제 열 다음부터가 값 열이라 off=1 */
  enableColResize(t,cols,()=>markDirty(),1);
  t.querySelectorAll('td[data-r]').forEach(td=>{
    td.addEventListener('mousedown',e=>{const r=+td.dataset.r,c=+td.dataset.c;
      if(e.shiftKey){SEL.r2=r;SEL.c2=c;}else SEL={r1:r,c1:c,r2:r,c2:c};selecting=true;paintSel();});
    td.addEventListener('mouseenter',()=>{if(selecting){SEL.r2=+td.dataset.r;SEL.c2=+td.dataset.c;paintSel();}});});
  t.querySelectorAll('input[data-c],select[data-c]').forEach(inp=>inp.addEventListener('change',e=>{
    pushUndo();
    setCell(+e.target.dataset.r,cols[+e.target.dataset.c].k,e.target.value);renderSheet();}));
  /* 달력 아이콘 → 네이티브 데이트피커 */
  t.querySelectorAll('[data-dp]').forEach(b=>b.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const n=t.querySelector(`[data-dn="${b.dataset.dp}"]`);if(!n)return;
    if(n.showPicker)try{n.showPicker();}catch(err){n.click();}else n.click();});
  t.querySelectorAll('[data-dn]').forEach(n=>n.addEventListener('change',e=>{
    if(e.target.value){pushUndo();SHEET[+e.target.dataset.dn].date=e.target.value;renderSheet();}}));
  t.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{pushUndo();SHEET.splice(+b.dataset.del,1);renderSheet();});
  /* 헤더의 ✕ = 모두 지우기 (확인 후 실행) */
  const ca=$('sheetClearAll');
  if(ca)ca.onclick=()=>confirmModal('입력한 일별 실적을 모두 지울까요?',
    `${SHEET.length}행이 모두 사라집니다. 되돌리려면 Ctrl+Z 를 누르세요.`,
    ()=>{pushUndo();SHEET.length=0;renderSheet();buildFacts();renderAll();},'모두 지우기');
}
function paintSel(){document.querySelectorAll('#sheet td[data-r]').forEach(td=>{
  const r=+td.dataset.r,c=+td.dataset.c;
  td.classList.toggle('sel',inSel(r,c));td.classList.toggle('anchor',r===SEL.r1&&c===SEL.c1);});}
/* 사용자가 어떻게 입력하든 YYYY-MM-DD 로 정규화 (연도 생략 시 캠페인 기준 연도) */
function normDate(raw,fallback){
  const s=String(raw||'').trim();
  if(!s)return fallback||'';
  const baseY=new Date(CAMPAIGN.today+'T00:00:00').getFullYear();
  const p=s.replace(/[.\/\s]+/g,'-').replace(/[년월]/g,'-').replace(/일/g,'').replace(/-+$/,'').split('-').filter(x=>x!=='');
  const pad=n=>String(n).padStart(2,'0');
  let y,m,d;
  if(p.length>=3){y=+p[0];m=+p[1];d=+p[2];if(y<100)y+=2000;}
  else if(p.length===2){y=baseY;m=+p[0];d=+p[1];}
  else if(/^\d{8}$/.test(s)){y=+s.slice(0,4);m=+s.slice(4,6);d=+s.slice(6,8);}
  else if(/^\d{4}$/.test(s)){y=baseY;m=+s.slice(0,2);d=+s.slice(2,4);}
  else return fallback||'';
  if(!(m>=1&&m<=12&&d>=1&&d<=31))return fallback||'';
  return `${y}-${pad(m)}-${pad(d)}`;
}
function setCell(i,k,raw){
  const r=SHEET[i];if(!r)return;
  const col=SHEET_COLS.find(c=>c.k===k);if(!col||col.type==='calc')return;
  if(col.type==='num'){const n=String(raw).replace(/[^0-9.\-]/g,'');r[k]=n===''?0:+n;}
  else if(col.type==='dim'){const v=String(raw).trim();
    r[k]=dimOpts(k,r).includes(v)?v:'';}
  else if(k==='date')r[k]=normDate(raw,r.date);
  else r[k]=String(raw).trim();
  const ix=DIM_CHAIN.indexOf(k);
  if(ix>=0)DIM_CHAIN.slice(ix+1).forEach(p=>{if(r[p]&&!dimOpts(p,r).includes(r[p]))r[p]='';});}
/* 숫자 칸은 0이 아니라 빈칸으로 시작한다 (0과 미입력을 구분) */
const blankRow=()=>{const o={date:YESTERDAY};DIM_CHAIN.forEach(k=>o[k]='');
  numKeys().forEach(k=>o[k]='');return o;};
const addRow=n=>{pushUndo();for(let i=0;i<(n||1);i++)SHEET.push(blankRow());renderSheet();};
const sheetActive=()=>!$('tab-input').classList.contains('hidden')&&document.querySelector('#sheet td.sel');

/* ===== 실행 취소 / 다시 실행 (Ctrl+Z · Ctrl+Y) ===== */
const UNDO=[],REDO=[],UNDO_MAX=60;
const snapSheet=()=>JSON.parse(JSON.stringify({rows:SHEET,sel:SEL}));
function pushUndo(){UNDO.push(snapSheet());if(UNDO.length>UNDO_MAX)UNDO.shift();REDO.length=0;markDirty();}
function applySnap(s){SHEET=s.rows.map(r=>({...r}));SEL={...s.sel};renderSheet();}
function undoSheet(){if(!UNDO.length)return false;REDO.push(snapSheet());applySnap(UNDO.pop());return true;}
function redoSheet(){if(!REDO.length)return false;UNDO.push(snapSheet());applySnap(REDO.pop());return true;}

/* ===== 자동 저장 (마지막 입력 후 10분 이상 추가 입력이 없으면 스냅샷 저장) ===== */
const AUTOSAVE_MIN=10;
let DIRTY_AT=null,autosaveTimer=null;
function markDirty(){
  DIRTY_AT=Date.now();
  clearTimeout(autosaveTimer);
  /* 시안에서는 10분을 기다리지 않고 12초 뒤 저장되는 것으로 시연한다 */
  autosaveTimer=setTimeout(()=>commitSnapshot('자동 저장'),12000);
  const el2=$('saveState');if(el2)el2.textContent='변경됨 · 저장 대기';
}
function commitSnapshot(kind){
  if(!DIRTY_AT)return;
  const now=new Date();
  SHEET_HIST.unshift({t:now,who:'윤석진',org:'미디어웍스',kind,rows:JSON.parse(JSON.stringify(SHEET))});
  if(SHEET_HIST.length>40)SHEET_HIST.pop();
  DIRTY_AT=null;
  const el2=$('saveState');if(el2)el2.textContent=`${kind} ${hhmm(now)}`;
}
const hhmm=d=>`${dFull(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
/* 입력 히스토리 — 실제로 저장·반영할 때만 쌓인다 (예시 값 없음) */
let SHEET_HIST=[];
document.addEventListener('paste',e=>{
  if(!sheetActive())return;
  const txt=(e.clipboardData||window.clipboardData).getData('text');if(!txt)return;
  e.preventDefault();pushUndo();
  const cols=sheetCols();
  const grid=txt.replace(/\r/g,'').replace(/\n+$/,'').split('\n').map(l=>l.split('\t'));
  const r0=Math.min(SEL.r1,SEL.r2),c0=Math.min(SEL.c1,SEL.c2);
  const rN=Math.abs(SEL.r2-SEL.r1)+1,cN=Math.abs(SEL.c2-SEL.c1)+1;
  if(grid.length===1&&grid[0].length===1){
    for(let r=0;r<rN;r++)for(let c=0;c<cN;c++){
      while(SHEET.length<=r0+r)SHEET.push(blankRow());
      if(cols[c0+c])setCell(r0+r,cols[c0+c].k,grid[0][0]);}
  }else{
    grid.forEach((line,dr)=>line.forEach((cell,dc)=>{
      const ri=r0+dr,ci=c0+dc;if(!cols[ci])return;
      while(SHEET.length<=ri)SHEET.push(blankRow());
      setCell(ri,cols[ci].k,cell);}));
    SEL={r1:r0,c1:c0,r2:r0+grid.length-1,c2:c0+grid[0].length-1};}
  renderSheet();});
document.addEventListener('copy',e=>{
  if(!sheetActive())return;
  const cols=sheetCols();
  const r0=Math.min(SEL.r1,SEL.r2),r1=Math.max(SEL.r1,SEL.r2);
  const c0=Math.min(SEL.c1,SEL.c2),c1=Math.max(SEL.c1,SEL.c2);
  let out=[];
  for(let r=r0;r<=r1;r++){let row=[];
    for(let c=c0;c<=c1;c++)row.push(SHEET[r]?(SHEET[r][cols[c].k]??''):'');
    out.push(row.join('\t'));}
  e.clipboardData.setData('text/plain',out.join('\n'));e.preventDefault();});
document.addEventListener('mouseup',()=>selecting=false);
/* ===== 키보드 — 실행 취소/다시 실행 · 방향키 이동 · Shift+방향키 범위 확장 ===== */
/* 편집 중인 칸의 원래 값을 기억해 둔다 (ESC 로 되돌리기 위해) */
document.addEventListener('focusin',e=>{
  const t=e.target;
  if(t&&t.closest&&t.closest('#sheet td')&&(t.tagName==='INPUT'||t.tagName==='SELECT'))
    t.dataset.orig=t.value;});
document.addEventListener('keydown',e=>{
  if($('tab-input').classList.contains('hidden'))return;
  /* Enter · ESC — 커서를 없애고 그 칸을 "선택된 상태"로만 남긴다.
     Enter 는 입력한 값을 반영하고, ESC 는 편집을 시작하기 전 값으로 되돌린다. */
  if(e.key==='Enter'||e.key==='Escape'){
    const ae=document.activeElement;
    const cell=ae&&ae.closest?ae.closest('#sheet td'):null;
    if(cell){
      e.preventDefault();e.stopPropagation();
      if(e.key==='Escape'&&ae.dataset.orig!==undefined)ae.value=ae.dataset.orig;
      const r=+cell.dataset.r,c=+cell.dataset.c;
      ae.blur();
      if(isFinite(r)&&isFinite(c)){SEL={r1:r,c1:c,r2:r,c2:c};paintSel();}
      return;}}
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undoSheet();return;}
  if(mod&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();redoSheet();return;}
  const ARROW={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(!ARROW[e.key]||mod)return;
  if(!document.querySelector('#sheet td.sel'))return;
  const ae=document.activeElement;
  /* 텍스트 입력 중에는 좌우 방향키를 커서 이동에 양보하고, 위·아래만 셀 이동으로 쓴다 */
  const typing=ae&&(ae.tagName==='INPUT'&&ae.type==='text');
  if(typing&&!e.shiftKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;
  e.preventDefault();
  const [dr,dc]=ARROW[e.key];
  const maxR=SHEET.length-1,maxC=sheetCols().length-1;
  const cl=(v,mx)=>Math.max(0,Math.min(v,mx));
  if(e.shiftKey){SEL.r2=cl(SEL.r2+dr,maxR);SEL.c2=cl(SEL.c2+dc,maxC);}
  else{const r=cl(SEL.r1+dr,maxR),c=cl(SEL.c1+dc,maxC);SEL={r1:r,c1:c,r2:r,c2:c};}
  paintSel();
  const cell=document.querySelector(`#sheet td[data-r="${SEL.r2}"][data-c="${SEL.c2}"]`);
  if(cell){cell.scrollIntoView({block:'nearest',inline:'nearest'});
    if(!e.shiftKey){const f=cell.querySelector('input,select');if(f)f.focus();}}
});
function saveRows(){
  LINES.forEach(l=>{
    const rows=SHEET.filter(r=>rowLine(r)===l);
    if(!rows.length)return;
    const i=ELAPSED-1;
    AMET.forEach(m=>{const before=l.daily[m][i];
      l.daily[m][i]=sum(rows.map(r=>+r[m]||0));l.a[m]+=l.daily[m][i]-before;});
    /* 한 라인을 소재별로 나눠 적었으면 그 비중을 소재 배분에 반영한다 —
       예상 효율에서는 소재 2개를 한 줄로 등록했어도 실적은 소재마다 따로 넣을 수 있다 */
    const byCr=new Map();
    rows.forEach(r=>{const n2=String(r.creative||'').trim();if(!n2)return;
      byCr.set(n2,(byCr.get(n2)||0)+(+r[l.kpi]||+r.imp||0));});
    if(byCr.size>1){
      const cs=CREATIVES.filter(c=>c.lid===l.id);
      const tot=sum([...byCr.values()]);
      if(tot>0&&cs.length){
        cs.forEach(c=>{const v=byCr.get(c.name);if(v!=null)c.share=v/tot;});
        const s2=sum(cs.map(c=>+c.share||0));
        if(s2>0)cs.forEach(c=>c.share=(+c.share||0)/s2);}}});
  buildFacts();renderAll();switchTab('dash');}
function renderIssues(){
  let h=`<thead><tr><th style="width:124px">시작일</th><th style="width:124px">종료일</th>
    <th style="width:190px">대상</th><th style="width:92px">유형</th><th>이슈 내용</th><th style="width:44px"></th></tr></thead><tbody>`;
  ISSUES.forEach((is,i)=>{
    h+=`<tr><td><input value="${is.s}" data-is="${i}" data-k="s"></td>
      <td><input value="${is.e}" data-is="${i}" data-k="e"></td>
      <td><input value="${esc(is.scope)}" data-is="${i}" data-k="scope"></td>
      <td><select data-is="${i}" data-k="type" style="min-width:0">${['홀딩','매체','단가','소재','기타'].map(o=>`<option ${o===is.type?'selected':''}>${o}</option>`).join('')}</select></td>
      <td><input class="txt" value="${esc(is.txt)}" data-is="${i}" data-k="txt"></td>
      <td><button class="btn sm" data-isdel="${i}">✕</button></td></tr>`;});
  const t=$('tblIssue');t.innerHTML=h+'</tbody>';
  const c=$('issueCount');if(c)c.textContent=`${ISSUES.length}건 등록됨`;
  t.querySelectorAll('[data-is]').forEach(inp=>inp.onchange=e=>{
    ISSUES[+e.target.dataset.is][e.target.dataset.k]=e.target.value;renderDaily();});
  t.querySelectorAll('[data-isdel]').forEach(b=>b.onclick=()=>{ISSUES.splice(+b.dataset.isdel,1);renderIssues();renderDaily();});}
function openHistory(){
  const rowsOf=hs=>{
    if(hs.rows)return hs.rows;
    /* 시드 시점은 당시 라인 일별 실적으로 재구성 */
    const di=Math.max(0,Math.min(Math.round((hs.t-d0)/DAY),ELAPSED-1));
    return LINES.map(l=>{const v=l.daily.view[di]||0;
      const o={date:iso(ALLDATES[di]),segment:l.segment,media:l.media,product:l.product,target:l.target,line:l.line};
      AMET.forEach(m=>o[m]=l.daily[m][di]||0);
      o.v3=Math.round(v*1.9);o.v15=Math.round(v*.62);o.v30=Math.round(v*.41);
      o.q25=Math.round(v*.78);o.q50=Math.round(v*.55);o.q75=Math.round(v*.38);o.q100=Math.round(v*.29);
      return o;});};
  let h=`<div class="notice" style="margin-bottom:12px"><span>ⓘ</span>
      <div><b>자동 저장 규칙</b> — 입력이 끝나고 <b>${AUTOSAVE_MIN}분 이상</b> 추가 입력이 없으면 그 시점의 표를 자동으로 저장합니다.
      매 수정마다 저장하지는 않습니다. 되돌리면 그 시점의 표가 그대로 복원되고, 지금 표는 실행 취소(Ctrl+Z)로 다시 돌아올 수 있습니다.</div>
    </div>
    <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:160px">반영 완료 시각</th><th style="width:96px">입력자</th><th style="width:104px">소속</th>
      <th style="width:70px">행 수</th><th>노출</th><th>클릭</th><th>조회</th><th>전환</th><th>Gross 광고비</th>
      <th style="width:104px">상태</th><th style="width:118px"></th></tr></thead><tbody>`;
  if(!SHEET_HIST.length)
    h+='<tr><td colspan="11" class="hint" style="padding:20px">아직 저장된 시점이 없습니다. '
      +'표를 입력하고 저장하면 여기에 쌓입니다.</td></tr>';
  SHEET_HIST.forEach((hs,n)=>{
    const rs=rowsOf(hs);
    const g=k=>sum(rs.map(r=>+r[k]||0));
    const cost=sum(rs.map(r=>+r.cost||0));
    h+=`<tr><td class="mono">${hhmm(hs.t)}</td><td>${hs.who}</td><td>${hs.org}</td>
      <td class="mono">${rs.length}</td><td class="mono">${fmt(g('imp'))}</td><td class="mono">${fmt(g('click'))}</td>
      <td class="mono">${fmt(g('view'))}</td><td class="mono">${fmt(g('conv'))}</td><td class="mono">${won(cost)}</td>
      <td><span class="tagchip ${hs.kind==='자동 저장'?'':'on'}">${hs.kind}</span></td>
      <td><button class="btn sm" data-rb="${n}">이 시점으로 되돌리기</button></td></tr>`;});
  openModal('입력 히스토리',h+'</tbody></table>','<button class="btn" data-close>닫기</button>',{w:1140});
  $('modalHost').querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{
    const hs=SHEET_HIST[+b.dataset.rb];
    confirmModal(`${hhmm(hs.t)} 시점으로 되돌릴까요?`,
      '지금 입력한 내용은 실행 취소(Ctrl+Z)로 다시 돌아올 수 있습니다.',
      ()=>{pushUndo();SHEET=rowsOf(hs).map(r=>({...r}));
        SEL={r1:0,c1:0,r2:0,c2:0};renderSheet();
        const el2=$('saveState');if(el2)el2.textContent=`${hhmm(hs.t)} 시점으로 복원됨`;},'되돌리기');});}
/* ===== 열 설정 (데이터 입력 · 예상 효율 공통 UI) =====
   초안(draft)에서 고치고 "저장"을 눌러야 실제 표에 반영된다. */
const COL_TYPE_LABEL={num:'숫자',text:'텍스트',dim:'드롭다운',calc:'수식',
  auto:'드롭다운',chips:'칩 선택',date:'날짜',time:'시간',bid:'드롭다운',kpi:'드롭다운',
  subm:'드롭다운',dev:'체크박스',exp:'숫자',net:'숫자',pct:'비율(%)',ro:'자동 계산',
  ro2:'자동 계산',note:'텍스트'};
function openColCfgUI(opt){
  /* opt = {title, cols, fixedKeys, allowFormula, ruleOf, onSave} */
  const draft=opt.cols.map(c=>({...c}));
  const draw=()=>{
    let h=`<div class="hint" style="margin-bottom:10px">${opt.hint||'체크한 열만 표에 나타납니다.'}
        <b>고친 내용은 아래 [저장]을 눌러야 반영됩니다.</b></div>
      <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden">
        <thead><tr><th style="width:34px">#</th><th style="width:56px">표시</th><th>열 이름</th>
        <th style="width:96px">유형</th><th style="text-align:center">입력 규칙 · 수식</th>
        <th style="width:64px"></th></tr></thead><tbody>`;
    draft.forEach((c,i)=>{
      const fixed=(opt.fixedKeys||[]).includes(c.k);
      const lock=!!c.lock;
      h+=`<tr><td class="mono">${i+1}</td>
        <td><label class="colcfg-lab" style="justify-content:center">
          <input type="checkbox" class="colcfg-chk" data-con="${i}" ${c.on!==false?'checked':''} ${fixed?'disabled':''}></label></td>
        <td><input value="${esc(c.l)}" data-cc="${i}" data-k="l" ${lock&&!opt.renameAll?'disabled class="locked"':''}></td>
        <td><input value="${COL_TYPE_LABEL[c.type]||c.type||'–'}" disabled class="locked"></td>
        <td><input class="txt" value="${esc(c.rule||opt.ruleOf&&opt.ruleOf(c)||'')}" data-cc="${i}" data-k="rule"
          ${c.type==='calc'?'':'disabled class="locked"'}></td>
        <td>${lock||fixed?'<span class="hint">기본 열</span>'
          :`<button class="btn sm danger" data-ccdel="${i}">삭제</button>`}</td></tr>`;});
    h+='</tbody></table>';
    if(opt.allowFormula){
      const keys=draft.filter(c=>c.type==='num'||c.type==='calc');
      h+=`<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:12px">
        <div style="font-weight:700;margin-bottom:8px">수식 열 추가</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input id="ncName" placeholder="열 이름" style="height:32px;border:1px solid var(--line);border-radius:9px;padding:0 11px;min-width:150px">
          <input id="ncRule" placeholder="아래 열 버튼을 눌러 수식을 만드세요" readonly style="height:32px;border:1px solid var(--line);border-radius:9px;padding:0 11px;flex:1;min-width:220px;background:#fbfcfe">
          <button class="btn" id="ncClear">지우기</button>
          <button class="btn" id="ncAdd">+ 목록에 추가</button></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:9px">
          ${keys.map(c=>`<span class="chip" data-ins="${c.k}">${esc(c.l)}</span>`).join('')}
          ${['+','-','*','/','(',')'].map(o=>`<span class="chip" data-ins="${o}" style="min-width:30px;justify-content:center">${o}</span>`).join('')}</div>
        <div id="ncMsg" class="hint" style="margin-top:9px">열과 연산자 버튼만으로 수식을 구성합니다. 추가한 열도 [저장]을 눌러야 표에 나타납니다.</div></div>`;}
    return h;};
  const open=()=>{
    openModal(opt.title,draw(),
      '<button class="btn" data-close>닫기</button><button class="btn primary" id="colSave">저장</button>',{w:900});
    const host=$('modalHost');
    host.querySelectorAll('[data-cc]').forEach(inp=>inp.onchange=e=>{
      draft[+e.target.dataset.cc][e.target.dataset.k]=e.target.value;});
    host.querySelectorAll('[data-con]').forEach(cb=>cb.onchange=e=>{
      draft[+e.target.dataset.con].on=e.target.checked;});
    host.querySelectorAll('[data-ccdel]').forEach(b=>b.onclick=()=>{
      draft.splice(+b.dataset.ccdel,1);closeModal();open();});
    if(opt.allowFormula){
      const msg=$('ncMsg');
      host.querySelectorAll('[data-ins]').forEach(ch=>ch.onclick=()=>{
        const inp=$('ncRule');inp.value=(inp.value+' '+ch.dataset.ins).trim();
        const err=checkFormula(inp.value,draft);
        msg.innerHTML=err?`<span style="color:var(--muted)">${err}</span>`
          :'<span style="color:var(--acc);font-weight:700">✓ 올바른 수식입니다.</span>';});
      $('ncClear').onclick=()=>{$('ncRule').value='';msg.textContent='';};
      $('ncAdd').onclick=()=>{
        const n=$('ncName').value.trim(),f=$('ncRule').value.trim();
        if(!n){msg.innerHTML='<span style="color:var(--neg);font-weight:700">✕ 열 이름을 입력하세요.</span>';return;}
        const err=checkFormula(f,draft);
        if(err){msg.innerHTML=`<span style="color:var(--neg);font-weight:700">✕ ${err}</span>`;return;}
        draft.push({k:'cx'+uid(),l:n,w:110,type:'calc',rule:f,on:true});
        closeModal();open();};}
    $('colSave').onclick=()=>{opt.onSave(draft);closeModal();};};
  open();
}
function openColCfg(){
  openColCfgUI({
    title:'데이터 입력 · 열 설정',
    hint:'체크한 열만 표에 나타납니다. 필수 열은 일자 · 매체명 두 개뿐이고, 나머지는 자유롭게 켜고 끌 수 있습니다.',
    cols:SHEET_COLS,
    fixedKeys:SHEET_REQ,
    allowFormula:true,
    onSave:d=>{SHEET_COLS=d;renderSheet();}});
}
