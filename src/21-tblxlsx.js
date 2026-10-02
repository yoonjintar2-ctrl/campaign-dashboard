
/* ===== 표 → 엑셀 (v108) =====
   대시보드에서 표가 있는 카드마다 복사 단추 옆에 작은 엑셀 단추. 누르면 그 카드의 표를 .xlsx 로 내려받는다.
   · 화면에 **보이는 그대로** 옮긴다 — 칸마다 실제로 적용된 스타일(getComputedStyle)을 읽어
     배경색 · 글자색 · 굵기 · 크기 · 정렬 · 테두리(굵기 · 색)를 엑셀 서식으로 만든다(정해 둔 서식표가 아니라 칸마다).
     반투명 색은 아래 배경과 섞은 실제 색으로. 칸 안에 칠한 막대(게재 히스토리의 날짜 칸)도 칸 배경으로 옮긴다.
   · 숫자는 숫자로 — 화면 글자를 읽어 같은 모양의 숫자 서식을 붙인다
     (₩1,234 → "₩"#,##0 · 12.34% → 0.00% · 1,234 → #,##0 · 26일 → #,##0"일"). 나머지는 글자 그대로.
   · 병합(rowspan/colspan) · 두 줄 머리글(줄바꿈) · 머리글 줄과 왼쪽 고정 열은 틀 고정.
   · 열 너비는 글자 폭을 실제로 재서(canvas) 비례하게 — 가장 긴 줄 기준, 가로로 합친 칸은 빼고.
   · 다크 보기에서는 밝은 화면 기준 색으로 내보낸다(그 순간에만 밝은 테마로 읽고 곧바로 되돌린다 — 화면은 바뀌지 않는다).
   · 맨 위에 표 이름 · 캠페인 · 조회 기간을 한 줄씩 적는다. */
const TX_ICON='<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1" y="1.6" width="14" height="12.8" rx="2" fill="#1f6b41"/><path d="M4.3 5.2h2.1L8 7.5l1.6-2.3h2.1L9.1 8.6l2.7 3.4H9.6L8 9.6l-1.6 2.4H4.3L7 8.6z" fill="#fff"/></svg>';
const TX_FONT='맑은 고딕';
/* ---- 색 ---- */
const txParse=c=>{c=String(c||'').trim();
  let m=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(c);
  if(m){let a=m[4]==null?1:(m[4].endsWith('%')?parseFloat(m[4])/100:+m[4]);return [+m[1],+m[2],+m[3],a];}
  m=/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(c);
  if(m)return [m[1]*255,m[2]*255,m[3]*255,m[4]==null?1:+m[4]];
  if(c==='transparent')return [0,0,0,0];
  return null;};
const txMix=(top,under)=>{const a=top[3];if(a>=.999)return top.slice(0,3).concat([1]);
  return [0,1,2].map(i=>top[i]*a+under[i]*(1-a)).concat([1]);};
const txHex=c=>'FF'+c.slice(0,3).map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('').toUpperCase();
const txLum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
const txContrast=(a,b)=>{const x=txLum(a),y=txLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
/* ---- 화면 글자 → 엑셀 값 · 숫자 서식 ---- */
function txValue(t){
  const r=txValue0(t);
  /* 0.0034000000000000002 같은 부동소수 찌꺼기 없이 */
  if(r.n)r.v=Math.round(r.v*1e10)/1e10;
  return r;}
function txValue0(t){
  const s=t.trim();
  if(!s||s.indexOf('\n')>=0)return {v:t};
  const dec=x=>{const m=/\.(\d+)/.exec(x);return m?m[1].length:0;};
  const body=(x,comma)=>(comma?'#,##0':'0')+(dec(x)?'.'+'0'.repeat(dec(x)):'');
  const sign=(f,plus)=>plus?`+${f};-${f};${f}`:f;
  let m;
  /* 앞자리 0 이 붙은 코드(007) · 아주 긴 숫자는 글자로 둔다 */
  const okNum=x=>{const d=x.replace(/[^\d]/g,'');return d.length<=15&&!/^[+-]?0\d/.test(x.replace(/,/g,''));};
  if((m=/^([+-]?)([\d,]*\.?\d+)%$/.exec(s))&&okNum(m[2])){
    return {v:parseFloat((m[1]==='-'?'-':'')+m[2].replace(/,/g,''))/100,n:1,f:sign(body(m[2],m[2].includes(','))+'%',m[1]==='+')};}
  if((m=/^(-?)₩\s?(-?)([\d,]*\.?\d+)$/.exec(s))&&okNum(m[3])){
    const neg=m[1]||m[2];return {v:(neg?-1:1)*parseFloat(m[3].replace(/,/g,'')),n:1,f:'"₩"'+body(m[3],true)};}
  if((m=/^([+-]?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)$/.exec(s))&&okNum(m[2])){
    return {v:parseFloat((m[1]==='-'?'-':'')+m[2].replace(/,/g,'')),n:1,f:sign(body(m[2],m[2].includes(',')),m[1]==='+')};}
  if((m=/^([+-]?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?(일|건|회|명|개|원|배|초|분)$/.exec(s))&&okNum(m[2])){
    return {v:parseFloat((m[1]==='-'?'-':'')+m[2].replace(/,/g,'')),n:1,f:sign(body(m[2],m[2].includes(','))+`"${m[3]}"`,m[1]==='+')};}
  return {v:s};}
/* ---- 카드 · 표 이름 ---- */
function txSecText(sec){
  const nm=sec.querySelector('[data-nm]');if(nm)return nm.textContent.replace(/\s+/g,' ').trim();
  const c=sec.cloneNode(true);
  c.querySelectorAll('.tools,.note,.hint,.infowrap,.infobtn,button,select,.switch,label,.shlegend,.hmramp,svg,input').forEach(n=>n.remove());
  return c.textContent.replace(/\s+/g,' ').trim();}
function txTitle(card,tbl){
  const ic=tbl&&tbl.closest('.infcell');
  if(ic){const b=ic.querySelector('.infh>b');if(b)return b.textContent.replace(/\s+/g,' ').trim();}
  const parts=[];
  const ps=card.previousElementSibling;
  if(ps&&ps.classList.contains('subsec')){const sp=ps.querySelector('span');if(sp)parts.push(sp.textContent.trim());}
  let n=card;
  while(n&&n!==document.body){let p=n.previousElementSibling;
    while(p){if(p.classList&&p.classList.contains('sec')){const t=txSecText(p);return [t].concat(parts).filter(Boolean).join(' · ');}
      p=p.previousElementSibling;}
    n=n.parentElement;}
  return parts.join(' · ')||L('표','Table');}
/* ---- 화면 표 → 칸 목록 (스타일 읽기) ---- */
function txReadTable(tbl,card){
  const bgMemo=new Map();
  const WHITE=[255,255,255,1];
  /* 그 요소 뒤에 실제로 깔린 배경색(반투명은 아래와 섞은 색) */
  const bgOf=el=>{
    if(!el||el===document.documentElement)return WHITE;
    if(bgMemo.has(el))return bgMemo.get(el);
    const own=txParse(getComputedStyle(el).backgroundColor)||[0,0,0,0];
    const under=(el===card||!el.parentElement)?WHITE:bgOf(el.parentElement);
    const r=own[3]>0?txMix(own,under):under;
    bgMemo.set(el,r);return r;};
  const rows=[],merges=[],grid=[];
  let headRows=0,frozen=0,firstBody=true;
  const trs=[...tbl.rows].filter(tr=>tr.getClientRects().length);
  trs.forEach((tr,ri)=>{
    if(!grid[ri])grid[ri]=[];
    const inHead=tr.parentElement&&tr.parentElement.tagName==='THEAD';
    if(inHead)headRows=ri+1;
    let ci=0,fz=0,lead=true;
    /* 고정 열은 칸이 둘 이상인 첫 본문 줄에서 센다(한 칸으로 합친 구분 줄 — 히트맵 '요일별' — 은 건너뛴다) */
    const multi=[...tr.cells].filter(c=>getComputedStyle(c).display!=='none').length>=2;
    [...tr.cells].forEach(cell=>{
      const cs=getComputedStyle(cell);
      if(cs.display==='none')return;
      while(grid[ri][ci])ci++;
      const rs=Math.max(1,+cell.rowSpan||1),cn=Math.max(1,+cell.colSpan||1);
      /* 글자 — 화면에 보이는 줄 그대로(두 줄 머리글은 줄바꿈) */
      const text=(cell.innerText||'').split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
      /* 배경 — 칸 자체 색, 없으면(아래 색과 같으면) 칸 안에 넓게 칠한 막대(게재 히스토리 날짜 칸) */
      let fill=bgOf(cell);
      const cr=cell.getBoundingClientRect();
      if(cr.width&&cr.height&&cell.children.length){
        const area=cr.width*cr.height;
        for(const d of cell.querySelectorAll('*')){
          const dc=getComputedStyle(d);const c=txParse(dc.backgroundColor);
          if(!c||c[3]<=0||(dc.backgroundImage&&dc.backgroundImage!=='none'))continue;
          const r=d.getBoundingClientRect();
          if(r.width*r.height>=area*.33){fill=txMix(c,fill);break;}}}
      const plain=Math.abs(fill[0]-255)+Math.abs(fill[1]-255)+Math.abs(fill[2]-255)<3;
      /* 글자색 — 반투명은 배경과 섞고, 배경과 너무 비슷하면(대비 2 미만) 검정/흰색으로 */
      let col=txMix(txParse(cs.color)||[30,30,30,1],fill);
      if(txContrast(col,fill)<2)col=txLum(fill)>.4?[20,22,26,1]:[255,255,255,1];
      const px=parseFloat(cs.fontSize)||12;
      const font={b:(parseInt(cs.fontWeight,10)||400)>=600?1:0,i:cs.fontStyle==='italic'?1:0,
        sz:Math.max(8,Math.round(px*.75*2)/2),c:txHex(col)};
      const bd={};
      for(const side of ['top','right','bottom','left']){
        const w=parseFloat(cs.getPropertyValue(`border-${side}-width`))||0,st=cs.getPropertyValue(`border-${side}-style`);
        if(!w||st==='none'||st==='hidden')continue;
        const bc=txParse(cs.getPropertyValue(`border-${side}-color`));if(!bc||bc[3]<=0)continue;
        bd[side]={s:st==='dashed'?'dashed':st==='dotted'?'dotted':w>=2.5?'thick':w>=1.5?'medium':'thin',c:txHex(txMix(bc,fill))};}
      let ha=cs.textAlign;ha=ha==='start'||ha==='left'?'left':ha==='end'||ha==='right'?'right':ha==='justify'?'left':'center';
      const va=cs.verticalAlign==='top'?'top':cs.verticalAlign==='bottom'?'bottom':'center';
      const val=txValue(text);
      const c={v:val.v,n:val.n,f:val.f||'',font,fill:plain?null:txHex(fill),bd,al:{h:ha,v:va,w:text.indexOf('\n')>=0?1:0},
        lines:text?text.split('\n'):[],fontCss:`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        cn,rs,padX:(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0),pt:font.sz};
      grid[ri][ci]=c;
      if(rs>1||cn>1)merges.push({r1:ri,c1:ci,r2:ri+rs-1,c2:ci+cn-1});
      for(let a=0;a<rs;a++)for(let b=0;b<cn;b++){
        if(!grid[ri+a])grid[ri+a]=[];
        if(a||b)grid[ri+a][ci+b]={v:'',font,fill:c.fill,bd,al:c.al,f:'',ghost:1};}
      /* 왼쪽 고정 열 — 첫 본문 줄에서 sticky(left) 인 앞쪽 칸들 */
      if(!inHead&&firstBody&&multi){if(lead&&cs.position==='sticky'&&cs.left!=='auto')fz+=cn;else lead=false;}
      ci+=cn;});
    if(!inHead&&firstBody&&multi){frozen=fz;firstBody=false;}
    rows.push({h:tr.getBoundingClientRect().height});});
  const nCols=Math.max(0,...grid.map(r=>r?r.length:0));
  if(frozen>=nCols-1)frozen=0;
  return {grid,merges,rows,headRows,frozen};}
/* ---- 엑셀 파일 만들기 ---- */
function txBuild(title,info,blocks){
  const fonts=[`<font><sz val="10"/><color rgb="FF000000"/><name val="${TX_FONT}"/></font>`],fontId=new Map([['base',0]]);
  const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'],fillId=new Map();
  const borders=['<border><left/><right/><top/><bottom/><diagonal/></border>'],bdId=new Map([['{}',0]]);
  const fmts=[],fmtId=new Map();
  const xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'],xfId=new Map();
  const getFont=f=>{const k=JSON.stringify(f);if(!fontId.has(k)){fontId.set(k,fonts.length);
    fonts.push(`<font>${f.b?'<b/>':''}${f.i?'<i/>':''}<sz val="${f.sz}"/><color rgb="${f.c}"/><name val="${TX_FONT}"/></font>`);}return fontId.get(k);};
  const getFill=h=>{if(!h)return 0;if(!fillId.has(h)){fillId.set(h,fills.length);
    fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${h}"/><bgColor indexed="64"/></patternFill></fill>`);}return fillId.get(h);};
  const getBd=b=>{const k=JSON.stringify(b);if(!bdId.has(k)){bdId.set(k,borders.length);
    const sd=s=>b[s]?`<${s} style="${b[s].s}"><color rgb="${b[s].c}"/></${s}>`:`<${s}/>`;
    borders.push(`<border>${sd('left')}${sd('right')}${sd('top')}${sd('bottom')}<diagonal/></border>`);}return bdId.get(k);};
  const getFmt=f=>{if(!f)return 0;if(!fmtId.has(f)){fmtId.set(f,164+fmts.length);fmts.push(f);}return fmtId.get(f);};
  const getXf=c=>{
    const fo=getFont(c.font),fi=getFill(c.fill),bo=getBd(c.bd||{}),nf=getFmt(c.f);
    const al=c.al||{h:'left',v:'center',w:0};
    const k=[fo,fi,bo,nf,al.h,al.v,al.w].join('|');
    if(!xfId.has(k)){xfId.set(k,xfs.length);
      xfs.push(`<xf numFmtId="${nf}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${al.h}" vertical="${al.v}"${al.w?' wrapText="1"':''}/></xf>`);}
    return xfId.get(k);};
  /* 맨 위 두 줄 — 표 이름(굵게) · 캠페인 · 조회 기간(회색) */
  const tStyle=getXf({font:{b:1,i:0,sz:13,c:'FF1E2A38'},fill:null,bd:{},f:'',al:{h:'left',v:'center',w:0}});
  const iStyle=getXf({font:{b:0,i:0,sz:9,c:'FF6B7480'},fill:null,bd:{},f:'',al:{h:'left',v:'center',w:0}});
  const out=[];  /* [{cells:[{v,n,s}], ht}] */
  out.push({cells:[{v:title,s:tStyle}],ht:22});
  out.push({cells:[{v:info,s:iStyle}],ht:15});
  out.push({cells:[],ht:8});
  const TOP=out.length;
  const merges=[],widthPx=[];
  const cv=document.createElement('canvas').getContext('2d');
  const measure=(font,t)=>{cv.font=font;return cv.measureText(t).width;};
  let freezeY=0,freezeX=0;
  blocks.forEach((B,bi)=>{
    const base=out.length;
    if(bi===0){freezeY=B.headRows?base+B.headRows:0;freezeX=B.frozen||0;}
    B.grid.forEach((r,ri)=>{
      const cells=[];let maxLines=1,maxPt=8;
      (r||[]).forEach((c,ci)=>{
        if(!c){cells[ci]=null;return;}
        cells[ci]={v:c.v,n:c.n,s:getXf(c)};
        if(c.ghost)return;
        if(c.rs===1&&c.lines.length>maxLines)maxLines=c.lines.length;
        if(c.pt>maxPt)maxPt=c.pt;
        /* 열 너비 — 가로로 합치지 않은 칸만 */
        if(c.cn===1&&c.lines.length){
          const w=Math.max(...c.lines.map(l=>measure(c.fontCss,l)))+Math.min(c.padX,24);
          widthPx[ci]=Math.max(widthPx[ci]||0,w);}});
      const scr=(B.rows[ri]&&B.rows[ri].h)||0;
      const ht=Math.max(maxLines*maxPt*1.32+5,Math.min(scr*.75,40),13);
      out.push({cells,ht:Math.round(ht*10)/10});});
    B.merges.forEach(m=>merges.push({r1:m.r1+base,c1:m.c1,r2:m.r2+base,c2:m.c2}));
    if(bi<blocks.length-1)out.push({cells:[],ht:12});});
  /* 엑셀 열 너비(글자 수) — 기본 글꼴(맑은 고딕 10)의 숫자 폭 ≈ 7px. 화면 글꼴과 폭이 조금 달라 8% 여유 */
  const widths=widthPx.map(px=>Math.max(2.6,Math.min(90,Math.round(((px||20)*1.08+8)/7*100)/100)));
  const rowsXml=out.map((r,ri)=>{
    const cells=(r.cells||[]).map((c,ci)=>{
      if(!c)return '';
      const ref=colName(ci)+(ri+1);
      if(c.v===''||c.v==null)return `<c r="${ref}" s="${c.s}"/>`;
      return c.n?`<c r="${ref}" s="${c.s}"><v>${Number(c.v)}</v></c>`
        :`<c r="${ref}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;}).join('');
    return `<row r="${ri+1}" ht="${r.ht}" customHeight="1">${cells}</row>`;}).join('');
  const cols=widths.length?`<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:'';
  const mg=merges.length?`<mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${colName(m.c1)}${m.r1+1}:${colName(m.c2)}${m.r2+1}"/>`).join('')}</mergeCells>`:'';
  let pane='';
  if(freezeY||freezeX){
    const tl=colName(freezeX)+(freezeY+1),ap=freezeX&&freezeY?'bottomRight':freezeX?'topRight':'bottomLeft';
    pane=`<pane${freezeX?` xSplit="${freezeX}"`:''}${freezeY?` ySplit="${freezeY}"`:''} topLeftCell="${tl}" activePane="${ap}" state="frozen"/><selection pane="${ap}" activeCell="${tl}" sqref="${tl}"/>`;}
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowsXml}</sheetData>${mg}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fmts.length?`<numFmts count="${fmts.length}">${fmts.map((f,i)=>`<numFmt numFmtId="${164+i}" formatCode="${xe(f)}"/>`).join('')}</numFmts>`:''}<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const sheetName=(title||'Sheet1').replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,31)||'Sheet1';
  const files=[
    {name:'[Content_Types].xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)},
    {name:'_rels/.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:'xl/workbook.xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:'xl/styles.xml',data:enc(styles)},
    {name:'xl/worksheets/sheet1.xml',data:enc(sheet)}];
  return zipStore(files);}
/* 카드 → .xlsx 내려받기 */
function txExport(card){
  try{hideTip();}catch(e){}
  const tbls=[...card.querySelectorAll('table')].filter(t=>t.rows.length&&t.getClientRects().length);
  if(!tbls.length)throw new Error('표가 없습니다');
  const title=txTitle(card,tbls[0]);
  /* 다크 보기면 그 순간에만 밝은 테마로 읽는다 — 전환 효과를 끄고, 같은 작업 안에서 되돌리므로 화면은 그대로 */
  const root=document.documentElement,prev=root.getAttribute('data-theme');
  let calm=null;
  if(prev==='dark'){
    calm=document.createElement('style');calm.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(calm);
    const light=(typeof THEME!=='undefined'&&THEME&&THEME!=='dark')?THEME:'';
    if(light)root.setAttribute('data-theme',light);else root.removeAttribute('data-theme');}
  let blocks;
  try{blocks=tbls.map(t=>txReadTable(t,card));}
  finally{if(prev==='dark'){root.setAttribute('data-theme',prev);getComputedStyle(root).color;if(calm)calm.remove();}}
  let info='';
  try{const vs=viewScope();info=`${CAMPAIGN.name||''} · ${L('조회 기간','Period')} ${dFull(vs.start)} ~ ${dFull(vs.end)} · ${L('내려받은 날','Exported')} ${dFull(new Date())}`;}
  catch(e){info=CAMPAIGN.name||'';}
  const bytes=txBuild(title,info,blocks);
  /* 파일 이름 — 다른 엑셀 내려받기와 같이 띄어쓰기는 밑줄로 */
  const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*·\s*/g,' ').trim().replace(/\s+/g,'_');
  saveFile(bytes,`${clean(CAMPAIGN.name)||'dashboard'}_${clean(title)}.xlsx`.replace(/_+/g,'_'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
function txClick(card,btn){
  if(btn.__busy)return;btn.__busy=1;btn.classList.add('busy');
  /* 단추가 깜빡이는 것을 한 번 그린 다음에 만든다(큰 표는 0.몇 초 걸린다) */
  requestAnimationFrame(()=>setTimeout(()=>{
    let ok=true;try{txExport(card);}catch(e){console.warn('표 엑셀',e);ok=false;}
    btn.classList.remove('busy');btn.innerHTML=ok?CC_OK:CC_NG;btn.classList.add(ok?'ok':'ng');
    btn.title=ok?L('엑셀로 내려받았습니다','Downloaded as Excel'):L('내려받지 못했습니다','Download failed');
    setTimeout(()=>{btn.innerHTML=TX_ICON;btn.classList.remove('ok','ng');btn.title=L('이 표를 엑셀로 내려받기','Download this table as Excel');btn.__busy=0;},1400);},0));}
