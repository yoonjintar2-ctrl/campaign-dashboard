/* ===== 12. 엑셀 템플릿 — 내려받기 · 불러오기 =====
   템플릿에는 "직접 입력하는 항목"만 넣는다. CTR·CPM 같은 계산 항목은
   업로드한 뒤 사이트가 알아서 계산하므로 열 자체를 만들지 않는다. */

/* ---------- 최소 XLSX 작성기 (라이브러리 없이 zip 을 직접 만든다) ---------- */
const CRC_TBL=(()=>{const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    t[n]=c>>>0;}
  return t;})();
function crc32(bytes){let c=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++)c=CRC_TBL[(c^bytes[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;}
const enc=s=>new TextEncoder().encode(s);
/* 압축 없이(stored) 담는 zip — 엑셀이 그대로 읽는다 */
function zipStore(files){
  const chunks=[],central=[];let off=0;
  const u16=n=>[n&255,(n>>8)&255];
  const u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>24)&255];
  files.forEach(f=>{
    const name=enc(f.name),data=f.data;
    const crc=crc32(data);
    const local=[].concat([80,75,3,4],u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0));
    chunks.push(new Uint8Array(local),name,data);
    central.push({name,crc,len:data.length,off});
    off+=local.length+name.length+data.length;});
  const cenStart=off;let cenLen=0;
  central.forEach(c=>{
    const h=[].concat([80,75,1,2],u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),
      u32(c.crc),u32(c.len),u32(c.len),u16(c.name.length),u16(0),u16(0),u16(0),u16(0),
      u32(0),u32(c.off));
    chunks.push(new Uint8Array(h),c.name);
    cenLen+=h.length+c.name.length;});
  chunks.push(new Uint8Array([].concat([80,75,5,6],u16(0),u16(0),
    u16(central.length),u16(central.length),u32(cenLen),u32(cenStart),u16(0))));
  let total=0;chunks.forEach(c=>total+=c.length);
  const out=new Uint8Array(total);let p=0;
  chunks.forEach(c=>{out.set(c,p);p+=c.length;});
  return out;
}
const xe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
const colName=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
/* rows: [[{v,s?,n?}, …], …]  s = 스타일 번호, n = true 면 숫자 */
function buildXlsx(sheetName,rows,widths){
  const sheetRows=rows.map((r,ri)=>{
    const cells=r.map((c,ci)=>{
      if(c==null)return '';
      const ref=colName(ci)+(ri+1);
      const st=c.s?` s="${c.s}"`:'';
      /* 값이 없어도 스타일(테두리)이 있으면 빈 셀을 그려 둔다 */
      if(c.v===''||c.v==null)return c.s?`<c r="${ref}"${st}/>`:'';
      return c.n
        ? `<c r="${ref}"${st}><v>${Number(c.v)}</v></c>`
        : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;}).join('');
    return `<row r="${ri+1}">${cells}</row>`;}).join('');
  const cols=widths&&widths.length
    ? `<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;
  /* 0 기본 · 1 제목 · 2 안내 · 3 머리글 · 4 예시 · 5 소제목 · 6 입력칸(테두리만) */
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="11"/><name val="맑은 고딕"/></font>
<font><b/><sz val="15"/><color rgb="FF1E2A38"/><name val="맑은 고딕"/></font>
<font><sz val="10"/><color rgb="FF5A6878"/><name val="맑은 고딕"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="맑은 고딕"/></font>
<font><i/><sz val="10"/><color rgb="FF98A3B1"/><name val="맑은 고딕"/></font>
<font><b/><sz val="11"/><color rgb="FF3C4957"/><name val="맑은 고딕"/></font>
</fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF3C4957"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F5F8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8DEE6"/></left><right style="thin"><color rgb="FFD8DEE6"/></right><top style="thin"><color rgb="FFD8DEE6"/></top><bottom style="thin"><color rgb="FFD8DEE6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
</cellXfs></styleSheet>`;
  const files=[
    {name:'[Content_Types].xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)},
    {name:'_rels/.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:'xl/workbook.xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(sheetName).slice(0,31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:'xl/styles.xml',data:enc(styles)},
    {name:'xl/worksheets/sheet1.xml',data:enc(sheet)}
  ];
  return zipStore(files);
}
function saveFile(bytes,name,mime){
  const blob=new Blob([bytes],{type:mime||'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},400);
}

/* ---------- 템플릿 정의 ---------- */
/* 일자별 실적 — 직접 입력 열만 (계산 열 제외) */
/* 여러 개를 한 칸에 적는 열은 머리글에 안내를 붙인다 */
const TPL_HINT={creative:'소재 (여러 개면 콤마로 구분)',target:'타겟팅 그룹 (여러 개면 콤마로 구분)'};
/* 일자별 실적은 한 행 = 하나의 타겟팅 그룹이라 콤마 안내를 붙이지 않는다 */
const TPL_HINT_DAILY={};
const tplW=(k,l)=>k==='note'?40:k==='date'?14:Math.max(11,Math.min(26,l.length*1.5+7));
const tplCol=(c,hint)=>{const l=(hint||TPL_HINT)[c.k]||c.l;return {k:c.k,l,w:tplW(c.k,l)};};
/* 게런티(보장) 여부 — 예상 노출/클릭/조회 바로 옆에 O/X 열을 둔다 */
const GUAR_COLS={e_imp:{k:'g_imp',l:'노출 보장(O/X)'},e_click:{k:'g_click',l:'클릭 보장(O/X)'},
  e_view:{k:'g_view',l:'조회 보장(O/X)'}};
const GUAR_KEY={g_imp:'imp',g_click:'click',g_view:'view'};
/* 다운로드 = 지금 켜져 있는 열만 / 매칭 = 꺼진 열까지 전부 (열을 지워도 머리글로 찾도록) */
const dailyColsOf=all=>SHEET_COLS.filter(c=>c.type!=='calc'&&(all||c.on!==false))
  .map(c=>tplCol(c,TPL_HINT_DAILY));
const lineColsOf=all=>{
  const out=[];
  LINE_COLS.filter(c=>!['ro','ro2'].includes(c.type)&&(all||c.on!==false)).forEach(c=>{
    out.push(tplCol(c));
    if(GUAR_COLS[c.k]){const g=GUAR_COLS[c.k];out.push({k:g.k,l:g.l,w:tplW(g.k,g.l)});}});
  return out;};
const tplDailyCols=()=>dailyColsOf(false);
const tplLineCols=()=>lineColsOf(false);

const TPL_DAILY_GUIDE=[
  '아래 [일자] 머리글 줄 다음 줄부터 데이터를 넣으세요. 이 안내 부분은 지우지 않아도 됩니다.',
  '일자는 YYYY-MM-DD 로 적습니다. 8/3, 2026.8.3, 20260803 처럼 적어도 불러올 때 자동으로 바뀝니다.',
  '구분 · 매체명 · 광고상품명 · 타겟팅 그룹 · 제품은 캠페인 설정에 등록된 이름과 똑같이 적어야 합니다.',
  '타겟팅 그룹은 한 행에 하나만 적습니다. 여러 그룹이면 행을 나눠 주세요 (콤마로 묶지 않습니다).',
  '일별 광고비는 Net 기준으로 넣습니다. Gross 소진액은 설정의 수수료율로 자동 환산됩니다.',
  '값이 없는 항목은 열을 통째로 비워 두세요. 0 을 채워 넣을 필요 없습니다.',
  'CTR · CPM · CPV 같은 계산 항목은 템플릿에 없습니다. 불러오면 사이트가 자동으로 계산합니다.',
  '안 쓰는 열은 되도록 지우지 마세요. 값이 없으면 열은 그대로 두고 칸만 비워 둡니다. (지우거나 순서를 바꿔도 머리글 이름으로 찾아 넣습니다.)',
  '한 줄 = 하루 × 하나의 라인(구분 × 매체 × 광고상품 × 타겟팅 그룹 × 제품) 입니다.',
  '테두리가 그려진 칸(머리글 아래 ~ 500행)이 입력 영역입니다. 그 안에 값을 채워 주세요.',
  '비드 타입은 경매형CPC · Bid CPC 처럼 적어도 CPC 로 알아서 정리됩니다.'
];
const TPL_LINE_GUIDE=[
  '아래 [구분] 머리글 줄 다음 줄부터 데이터를 넣으세요. 이 안내 부분은 지우지 않아도 됩니다.',
  '한 줄 = 하나의 라인(구분 × 매체 × 광고상품 × 타겟팅 그룹) 입니다.',
  '소재와 타겟팅 그룹이 여러 개면 쉼표(,) 로 구분해 한 칸에 적습니다.',
  '시작일 · 종료일은 YYYY-MM-DD 로 적습니다.',
  'Gross 예산을 넣고 대행사 · 렙사 수수료율을 적으면 Net 예산 · 밸류 · 보너스율은 자동으로 역산됩니다.',
  '수수료율은 10 또는 10% 어느 쪽으로 적어도 됩니다.',
  '예상 노출 · 클릭 · 조회 같은 목표 수치를 넣습니다. CPM · CPV · CTR 은 넣지 않습니다 — 자동 계산됩니다.',
  '값이 없는 항목은 칸만 비워 두세요. 열을 지우거나 순서를 바꿔도 머리글 이름을 보고 찾아 넣습니다.',
  '노출/클릭/조회 보장(O/X) 칸에 O 를 적으면 게런티(보장) 지표로 표시됩니다.',
  '1개 행은 예산을 배분하는 기준으로 나눕니다. 타겟팅 그룹이나 소재를 매체가 자동으로 예산 최적화하는 경우에는 나누지 말고 한 개의 라인으로 적어 주세요.',
  '테두리가 그려진 칸(머리글 아래 ~ 500행)이 입력 영역입니다. 그 안에 값을 채워 주세요.',
  '비드 타입은 경매형CPC · Bid CPC 처럼 적어도 CPC 로 알아서 정리됩니다.'
];
function tplRows(title,guide,cols){
  const R=[];
  R.push([{v:title,s:1}]);
  R.push([{v:`캠페인  ${CAMPAIGN.name}${CAMPAIGN.advertiser?'   ·   광고주  '+CAMPAIGN.advertiser:''}   ·   집행 기간  ${campStart()} ~ ${campEnd()}`,s:2}]);
  R.push([]);
  R.push([{v:'■ 작성 요령',s:5}]);
  guide.forEach((g,i)=>R.push([{v:`${i+1}.  ${g}`,s:2}]));
  R.push([]);
  R.push(cols.map(c=>({v:c.l,s:3})));
  /* 입력 영역 — 500행까지 테두리를 그려 어디에 적어야 하는지 한눈에 보이게 한다 */
  while(R.length<500)R.push(cols.map(()=>({v:'',s:6})));
  return R;
}
function downloadDailyTemplate(){
  const cols=tplDailyCols();
  const rows=tplRows('Digital Media Dashboard — 일자별 실적 입력 템플릿',TPL_DAILY_GUIDE,cols);
  saveFile(buildXlsx('일자별 실적',rows,cols.map(c=>c.w)),
    `일자별_실적_템플릿_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function downloadLineTemplate(){
  const cols=tplLineCols();
  const rows=tplRows('Digital Media Dashboard — 예상 효율(미디어믹스) 입력 템플릿',TPL_LINE_GUIDE,cols);
  saveFile(buildXlsx('예상 효율',rows,cols.map(c=>c.w)),
    `예상효율_템플릿_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- 불러오기 ---------- */
const parseCSV=txt=>{
  const rows=[];let row=[],cur='',q=false;
  const t=txt.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
  const sep=(t.split('\n')[0]||'').split('\t').length>1?'\t':',';
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){ if(ch==='"'){ if(t[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"')q=true;
    else if(ch===sep){row.push(cur);cur='';}
    else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur='';}
    else cur+=ch;}
  row.push(cur);rows.push(row);
  return rows;
};
const cleanNum=v=>{const s=String(v==null?'':v).replace(/[^0-9.\-]/g,'');
  return s===''||s==='-'?null:+s;};
/* 머리글 비교용 정규화 — 공백과 끝의 괄호 안내를 떼어 낸다
   ("타겟팅 그룹 (여러 개면 콤마로 구분)" → "타겟팅그룹") */
const normHdr=v=>String(v==null?'':v).trim().replace(/\s*\([^()]*\)\s*$/,'').replace(/\s+/g,'');
function findHeader(grid,cols){
  const labels=new Set(cols.map(c=>normHdr(c.l)));
  for(let i=0;i<Math.min(grid.length,40);i++){
    const hit=(grid[i]||[]).filter(c=>labels.has(normHdr(c))).length;
    if(hit>=2)return i;}
  return -1;
}
function mapHeader(headRow,cols){
  const byLabel={};cols.forEach(c=>byLabel[normHdr(c.l)]=c.k);
  return (headRow||[]).map(h=>byLabel[normHdr(h)]||null);
}
/* 비드 타입 정규화 — "경매형CPC", "Bid CPC", "CPC(자동입찰)" 같은 표기도 CPC 로 */
function normBid(v){
  const t=String(v==null?'':v).toUpperCase();
  const m=t.match(/CP[MCVAIETD]/);
  if(m)return m[0];
  return String(v||'').trim();
}
const isYes=v=>/^(o|y|yes|예|보장|true|1|✓|v)$/i.test(String(v==null?'':v).trim());
/* 파일 → 2차원 배열. .xlsx 는 SheetJS 가 있을 때만 (배포본에서는 자동 로드) */
function readGrid(file){
  return new Promise((res,rej)=>{
    const isX=/\.xlsx?$/i.test(file.name);
    if(isX){
      if(typeof XLSX==='undefined'){
        rej(new Error('이 화면에서는 .xlsx 를 바로 읽을 수 없습니다. 엑셀에서 [다른 이름으로 저장 → CSV]로 바꿔 올려 주세요.'));return;}
      const r=new FileReader();
      r.onload=()=>{try{
        const wb=XLSX.read(new Uint8Array(r.result),{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        res(XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''}));
      }catch(e){rej(e);}};
      r.onerror=()=>rej(new Error('파일을 읽지 못했습니다.'));
      r.readAsArrayBuffer(file);
    }else{
      const r=new FileReader();
      r.onload=()=>res(parseCSV(String(r.result)));
      r.onerror=()=>rej(new Error('파일을 읽지 못했습니다.'));
      r.readAsText(file,'utf-8');}});
}
function pickFile(cb){
  const inp=$('fileIn');if(!inp)return;
  inp.value='';
  inp.onchange=()=>{const f=inp.files&&inp.files[0];if(f)cb(f);};
  inp.click();
}
function importDaily(){
  pickFile(async file=>{
    let grid;
    try{grid=await readGrid(file);}catch(e){
      confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    const cols=dailyColsOf(true);
    const hi=findHeader(grid,cols);
    if(hi<0){confirmModal('머리글 줄을 찾지 못했습니다.',
      '템플릿의 머리글(일자 · 구분 · 매체명 …) 줄이 그대로 있어야 합니다. 템플릿을 내려받아 다시 시도해 주세요.',()=>{},'확인');return;}
    const keys=mapHeader(grid[hi],cols);
    const numK=new Set(SHEET_COLS.filter(c=>c.type==='num').map(c=>c.k));
    const rows=[];
    for(let i=hi+1;i<grid.length;i++){
      const r=grid[i]||[];
      if(!r.some(v=>String(v||'').trim()!==''))continue;
      const o={date:'',segment:'',media:'',product:'',target:'',line:''};
      SHEET_COLS.filter(c=>c.type==='num').forEach(c=>o[c.k]='');
      let filled=false;
      keys.forEach((k,ci)=>{
        if(!k)return;
        const raw=String(r[ci]==null?'':r[ci]).trim();
        if(raw==='')return;
        if(k==='date')o.date=normDate(raw)||raw;
        else if(numK.has(k)){const n=cleanNum(raw);if(n!==null){o[k]=n;filled=true;}}
        else {o[k]=raw;filled=true;}});
      if(filled||o.date)rows.push(o);}
    if(!rows.length){confirmModal('가져올 행이 없습니다.','머리글 아래에 데이터가 있는지 확인해 주세요.',()=>{},'확인');return;}
    const bad=rows.filter(rowBad).length;
    confirmModal(`${rows.length}행을 불러옵니다.`,
      `표의 기존 행을 이 내용으로 바꿉니다. 되돌리려면 Ctrl+Z 를 누르세요.`
      +(bad?` 집행 기간이나 라인 정보가 맞지 않는 행이 ${bad}개 있어 붉게 표시됩니다.`:''),
      ()=>{pushUndo();SHEET=rows;SEL={r1:0,c1:0,r2:0,c2:0};renderSheet();
        const e=$('saveState');if(e)e.textContent=`엑셀 ${rows.length}행 불러옴 · 저장 대기`;},'불러오기');
  });
}
function importLines(){
  pickFile(async file=>{
    let grid;
    try{grid=await readGrid(file);}catch(e){
      confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    const cols=lineColsOf(true);
    const hi=findHeader(grid,cols);
    if(hi<0){confirmModal('머리글 줄을 찾지 못했습니다.',
      '템플릿의 머리글(구분 · 매체 · 광고상품 …) 줄이 그대로 있어야 합니다.',()=>{},'확인');return;}
    const keys=mapHeader(grid[hi],cols);
    const typeOf={};LINE_COLS.forEach(c=>typeOf[c.k]=c.type);
    const kpiByLabel={};Object.entries(KPI_LABEL).forEach(([k,v])=>kpiByLabel[v]=k);
    const out=[];
    for(let i=hi+1;i<grid.length;i++){
      const r=grid[i]||[];
      if(!r.some(v=>String(v||'').trim()!==''))continue;
      const n=blankLine();
      let filled=false,creatives=[],targets=[];
      keys.forEach((k,ci)=>{
        if(!k)return;
        const raw=String(r[ci]==null?'':r[ci]).trim();
        if(raw==='')return;
        filled=true;
        const t=typeOf[k];
        if(k==='creative'){creatives=raw.split(',').map(s=>s.trim()).filter(Boolean);}
        else if(k==='target'){targets=raw.split(',').map(s=>s.trim()).filter(Boolean);}
        else if(k==='kpi'){n.kpi=kpiByLabel[raw]||(KPI_KEYS.includes(raw)?raw:n.kpi);}
        else if(t==='date'){n[k]=normDate(raw)||raw;}
        else if(t==='pct'){const v=cleanNum(raw);if(v!==null)n[k]=v>1?v/100:v;}
        else if(t==='exp'){const v=cleanNum(raw);if(v!==null)n.e[k.slice(2)]=v;}
        else if(k==='bid'){n.bid=normBid(raw);}
        else if(GUAR_KEY[k]){n.g=n.g||{};n.g[GUAR_KEY[k]]=isYes(raw);}
        else if(t==='gross'){const v=cleanNum(raw);if(v!==null)n.gross=v;}
        else if(t==='num'){const v=cleanNum(raw);if(v!==null)n[k]=v;}
        else if(t==='dev'){n.device=raw.split(/[+,\s]+/).filter(Boolean);}
        else n[k]=raw;});
      if(!filled)continue;
      if(!n.bid&&BID_TYPES.length)n.bid='CPM';
      if(BID_KPI[n.bid]&&KPI_KEYS.includes(BID_KPI[n.bid])&&!keys.includes('kpi'))n.kpi=BID_KPI[n.bid];
      n.__cr=creatives;n.__tg=targets;
      out.push(n);}
    if(!out.length){confirmModal('가져올 행이 없습니다.','머리글 아래에 데이터가 있는지 확인해 주세요.',()=>{},'확인');return;}
    confirmModal(`${out.length}개 라인을 불러옵니다.`,
      '지금의 예상 효율 표를 이 내용으로 바꿉니다. 되돌리려면 Ctrl+Z 를 누르세요.',
      ()=>{
        pushLineUndo();
        LINES=out.map(l=>{const {__cr,__tg,...rest}=l;return rest;});
        CREATIVES=CREATIVES.filter(()=>false);
        LINES.forEach((l,i)=>{
          const src=out[i];
          if(src.__tg.length)setLineTargets(l,src.__tg);
          if(src.__cr.length)setLineCreatives(l,src.__cr);});
        rebuildPeriod();buildFacts();
        buildFilters();buildSelects();
        renderKpiTable();renderCampForm();renderMix();renderAll();renderSheet();
        const e=$('lineSaveState');if(e)e.textContent=`엑셀 ${LINES.length}개 라인 불러옴 · 저장 대기`;
      },'불러오기');
  });
}
/* ---------- 배선 ---------- */
(function wireXlsx(){
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn;};
  on('tplDaily',downloadDailyTemplate);
  on('upDaily',importDaily);
  on('tplLine',downloadLineTemplate);
  on('upLine',importLines);
  on('crManageBtn',openCrManage);
})();
