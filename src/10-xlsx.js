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
/* rows: [[{v,s?,n?}, …], …]  s = 스타일 번호, n = true 면 숫자
   시트가 여러 장이면 buildXlsx([{name,rows,widths}, …]) 로 부른다 */
function buildXlsx(sheetName,rows,widths){
  const shs=Array.isArray(sheetName)?sheetName:[{name:sheetName,rows,widths}];
  const sheetXml=shs.map(sh=>{
    const sheetRows=(sh.rows||[]).map((r,ri)=>{
      const cells=(r||[]).map((c,ci)=>{
        if(c==null)return '';
        const ref=colName(ci)+(ri+1);
        const st=c.s?` s="${c.s}"`:'';
        /* 값이 없어도 스타일(테두리)이 있으면 빈 셀을 그려 둔다 */
        if(c.v===''||c.v==null)return c.s?`<c r="${ref}"${st}/>`:'';
        return c.n
          ? `<c r="${ref}"${st}><v>${Number(c.v)}</v></c>`
          : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;}).join('');
      return `<row r="${ri+1}">${cells}</row>`;}).join('');
    const cols=(sh.widths&&sh.widths.length)
      ? `<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';
    /* 입력 시트는 머리글 줄(1행)을 얼려 둬서 아래로 내려도 항목 이름이 보인다 */
    const freeze=sh.freeze
      ? `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>`
      +`<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>`:'';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="${sh.grid?1:0}">${freeze}</sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;});
  /* 0 기본 · 1 제목 · 2 안내 · 3 머리글 · 4 예시 · 5 소제목 · 6 입력칸(테두리만) · 7 숫자(#,##0) · 8 숫자(#,##0.00) */
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
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs></styleSheet>`;
  const files=[
    {name:'[Content_Types].xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${shs.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)},
    {name:'_rels/.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:'xl/workbook.xml',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${shs.map((sh,i)=>`<sheet name="${xe(sh.name).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels',data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${shs.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${shs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:'xl/styles.xml',data:enc(styles)},
    ...sheetXml.map((x,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:enc(x)}))
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
const TPL_NOTE='  (동일 예산 내 항목이 여러개인 경우 콤마로 표시)';
const TPL_HINT={
  product:'광고상품'+TPL_NOTE,
  slot:'광고 지면'+TPL_NOTE,
  landing:'랜딩 페이지'+TPL_NOTE,
  creative:'소재'+TPL_NOTE,
  target:'타겟팅 그룹'+TPL_NOTE};
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
  '"일자별 실적" 시트의 1행이 머리글입니다. 2행부터 바로 데이터를 넣으세요. (이 안내는 별도 시트라 지워도 됩니다.)',
  '일자는 YYYY-MM-DD 로 적습니다. 8/3, 2026.8.3, 20260803 처럼 적어도 불러올 때 자동으로 바뀝니다.',
  '구분 · 매체명 · 광고상품명 · 타겟팅 그룹 · 제품은 캠페인 설정에 등록된 이름과 똑같이 적어야 합니다.',
  '광고상품 · 타겟팅 그룹 · 소재는 예상 효율에 등록한 조합 그대로 적어도 되고, 그 안의 한 항목만 적어 따로 나누어 넣어도 됩니다.',
  '조합으로 적을 때 순서는 상관없습니다. 포함된 항목이 같으면 같은 라인으로 봅니다.',
  '날짜까지 완전히 똑같은 행은 불러올 때 한 번만 반영합니다. 파일에 계속 이어 붙여도 중복으로 쌓이지 않습니다.',
  '소진비용은 매체 리포트의 광고비(집행 금액)를 그대로 적습니다.',
  '값이 없는 항목은 열을 통째로 비워 두세요. 0 을 채워 넣을 필요 없습니다.',
  'CTR · CPM · CPV 같은 계산 항목은 템플릿에 없습니다. 불러오면 사이트가 자동으로 계산합니다.',
  '안 쓰는 열은 되도록 지우지 마세요. 값이 없으면 열은 그대로 두고 칸만 비워 둡니다. (지우거나 순서를 바꿔도 머리글 이름으로 찾아 넣습니다.)',
  '한 줄 = 하루 × 하나의 라인(구분 × 매체 × 광고상품 × 타겟팅 그룹 × 제품) 입니다.',
  '테두리가 그려진 칸(2행 ~ 501행)이 입력 영역입니다. 그 안에 값을 채워 주세요. 행이 모자라면 더 붙여도 됩니다.',
  '비드 타입은 경매형CPC · Bid CPC 처럼 적어도 CPC 로 알아서 정리됩니다.'
];
const TPL_LINE_GUIDE=[
  '"예상 효율" 시트의 1행이 머리글입니다. 2행부터 바로 데이터를 넣으세요. (이 안내는 별도 시트라 지워도 됩니다.)',
  '한 줄 = 하나의 라인(구분 × 매체 × 광고상품 × 타겟팅 그룹) 입니다.',
  '광고상품 · 광고 지면 · 타겟팅 그룹 · 소재는 동일 예산 안에 여러 개가 있으면 한 칸에 콤마(,) 로 이어 적습니다. 예) 20대남성, 30대남성',
  '예산을 나누어 세팅한 항목은 행을 나누어 각각의 예산을 적어 주세요. 한 행 = 하나의 예산 단위입니다.',
  '광고상품도 패키지로 판매하는 경우가 있어 타겟팅 · 소재와 똑같이 콤마로 여러 개를 적을 수 있습니다.',
  '시작일 · 종료일은 YYYY-MM-DD 로 적습니다.',
  '예산을 넣고 밸류를 적으면 보너스율은 자동으로 계산됩니다.',
  '예상 노출 · 클릭 · 조회 같은 목표 수치를 넣습니다. CPM · CPV · CTR 은 넣지 않습니다 — 자동 계산됩니다.',
  '값이 없는 항목은 칸만 비워 두세요. 열을 지우거나 순서를 바꿔도 머리글 이름을 보고 찾아 넣습니다.',
  '노출/클릭/조회 보장(O/X) 칸에 O 를 적으면 게런티(보장) 지표로 표시됩니다.',
  '1개 행은 예산을 배분하는 기준으로 나눕니다. 타겟팅 그룹이나 소재를 매체가 자동으로 예산 최적화하는 경우에는 나누지 말고 한 개의 라인으로 적어 주세요.',
  '테두리가 그려진 칸(2행 ~ 501행)이 입력 영역입니다. 그 안에 값을 채워 주세요. 행이 모자라면 더 붙여도 됩니다.',
  '비드 타입은 경매형CPC · Bid CPC 처럼 적어도 CPC 로 알아서 정리됩니다.'
];
/* 입력 시트 — 1행이 머리글, 2행부터 바로 데이터.
   안내 문구는 옆의 "작성 요령" 시트로 뺐다. */
function tplRows(cols){
  const R=[cols.map(c=>({v:c.l,s:3}))];
  /* 입력 영역 — 500행까지 테두리를 그려 어디에 적어야 하는지 한눈에 보이게 한다 */
  while(R.length<501)R.push(cols.map(()=>({v:'',s:6})));
  return R;
}
/* 작성 요령 시트 */
function tplGuideRows(title,guide){
  const R=[];
  R.push([{v:title,s:1}]);
  R.push([{v:`캠페인  ${CAMPAIGN.name}${CAMPAIGN.advertiser?'   ·   광고주  '+CAMPAIGN.advertiser:''}   ·   집행 기간  ${campStart()} ~ ${campEnd()}`,s:2}]);
  R.push([]);
  R.push([{v:'■ 작성 요령',s:5}]);
  guide.forEach((g,i)=>R.push([{v:`${i+1}.  ${g}`,s:2}]));
  return R;
}
const TPL_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function downloadDailyTemplate(){
  const cols=tplDailyCols();
  saveFile(buildXlsx([
      {name:'일자별 실적',rows:tplRows(cols),widths:cols.map(c=>c.w),freeze:true},
      {name:'작성 요령',rows:tplGuideRows('Media Dashboard — 일자별 실적 입력 템플릿',TPL_DAILY_GUIDE),widths:[120]}]),
    `일자별_실적_템플릿_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}.xlsx`,TPL_MIME);
}
function downloadLineTemplate(){
  const cols=tplLineCols();
  saveFile(buildXlsx([
      {name:'예상 효율',rows:tplRows(cols),widths:cols.map(c=>c.w),freeze:true},
      {name:'작성 요령',rows:tplGuideRows('Media Dashboard — 예상 효율(미디어믹스) 입력 템플릿',TPL_LINE_GUIDE),widths:[120]}]),
    `예상효율_템플릿_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}.xlsx`,TPL_MIME);
}

/* ---------- 입력값 내려받기 (v94) ----------
   지금 '일자별 실적 입력' 표에 들어 있는 값을 그대로 엑셀로 — 컴퓨터에서 고친 뒤 [엑셀 불러오기]로 올리면
   표 전체가 그 파일로 바뀐다(불러오기는 표를 통째로 갈아 끼운다).
   · 열 = 지금 켜 둔 입력 열 + 꺼 두었어도 값이 들어 있는 열 (다시 올릴 때 값이 빠지지 않게)
   · 머리글은 템플릿과 같은 이름이라 그대로 다시 알아본다 · 행 순서도 표 그대로 */
function downloadDailyData(){
  const rows=(typeof SHEET!=='undefined'?SHEET:[])||[];
  if(!rows.length){confirmModal('내려받을 값이 없습니다.','일자별 실적 표가 비어 있습니다. 템플릿을 내려받아 채운 뒤 불러와 주세요.',()=>{},'확인');return;}
  const has=k=>rows.some(r=>r[k]!==''&&r[k]!=null);
  const cols=SHEET_COLS.filter(c=>c.type!=='calc'&&(c.on!==false||has(c.k))).map(c=>tplCol(c,TPL_HINT_DAILY));
  const numK=new Set(SHEET_COLS.filter(c=>c.type==='num').map(c=>c.k));
  const R=[cols.map(c=>({v:c.l,s:3}))];
  rows.forEach(r=>{R.push(cols.map(c=>{
    const v=r[c.k];
    if(v===''||v==null)return null;
    /* 숫자 열의 숫자는 숫자 칸으로(소수가 있으면 소수 둘째 자리까지 보이게) — 값 자체는 그대로 담는다 */
    if(numK.has(c.k)&&typeof v==='number'&&isFinite(v))return {v,n:true,s:Number.isInteger(v)?7:8};
    if(numK.has(c.k)&&typeof v==='string'&&/^-?\d+(\.\d+)?$/.test(v.trim())){const n=+v;return {v:n,n:true,s:Number.isInteger(n)?7:8};}
    return {v:String(v)};}));});
  const d=new Date(),ymd=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  saveFile(buildXlsx([{name:'일자별 실적',rows:R,widths:cols.map(c=>c.w),freeze:true,grid:true}]),
    `일자별_실적_입력값_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}_${ymd}.xlsx`,TPL_MIME);
  const e=$('saveState');if(e)e.textContent=`입력값 ${rows.length.toLocaleString()}행을 엑셀로 내려받았습니다 · 고친 뒤 [엑셀 불러오기]로 올리면 표 전체가 바뀝니다`;
}

/* ---------- 불러오기 ---------- */
/* 여러 항목이 들어가는 칸은 순서가 달라도 같은 조합으로 본다.
   조합이 통째로 들어왔으면 등록된 표기(" · " 연결)로 맞춰 두어 목록에서 바로 잡히게 한다. */
function canonRow(r){
  const l=rowLine(r);if(!l)return r;
  /* 대소문자·공백만 다른 이름은 예상 효율에 등록된 표기로 맞춰 둔다
     ("TOSS" → "Toss") — 목록에서 바로 잡히고, 화면 표기도 하나로 통일된다 */
  ['segment','media','line'].forEach(k=>{
    if(r[k]&&l[k]&&r[k]!==l[k]&&dimKey(r[k])===dimKey(l[k]))r[k]=l[k];});
  MULTI_DIMS.forEach(k=>{
    if(k==='creative'||!r[k])return;
    const want=parseMulti(r[k]);
    if(want.length>1&&want.length===lineMulti(l,k).length){r[k]=l[k];return;}
    const reg=lineMulti(l,k).find(x=>dimKey(x)===dimKey(r[k]));
    if(reg&&reg!==r[k])r[k]=reg;});
  return r;
}
/* 완전히 같은 행인지 판단하는 열쇠 — 날짜 · 차원 · 모든 수치 */
function rowKey(r){
  const dims=['date','segment','media','product','slot','target','line','landing','creative']
    .map(k=>k!=='date'&&MULTI_DIMS.includes(k)
      ? parseMulti(r[k]).slice().sort().join('|')
      : String(r[k]==null?'':r[k]).trim());
  const nums=SHEET_COLS.filter(c=>c.type==='num').map(c=>String(+r[c.k]||0));
  return dims.concat(nums).join('\u0001');
}
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
/* 숫자 칸 읽기 (v78) — ₩ · 원 · 콤마 · 공백 · % 는 떼고 읽는다.
   (1,000) → −1000 (회계 서식) · 1.2E+03 → 1200 (지수 표기).
   비어 있거나 '-' 면 null, **숫자로 읽을 수 없으면 NaN** — 예전처럼 숫자만 긁어 모으면
   "12-34" 가 엉뚱한 값이 되거나 글자가 조용히 0 이 됐다. NaN 이면 부르는 쪽이 그 칸을 알린다.
   (CP949 로 읽은 CSV 에서는 ₩ 가 \ 로 보인다) */
function cleanNum(v){
  if(typeof v==='number')return isFinite(v)?v:NaN;
  let s=String(v==null?'':v).trim();
  let neg=false;
  const m=/^\((.*)\)$/.exec(s);
  if(m){neg=true;s=m[1];}
  s=s.replace(/[\s\u00a0,₩￦원$%\\]/g,'').replace(/^[\u2212\u2013]/,'-');
  if(s===''||/^[-\u2014]$/.test(s))return null;
  if(!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s))return NaN;
  const n=+s;
  return neg?-n:n;}
/* 엑셀 시트의 "쓴 범위" 는 종종 1,048,576행(최대치)으로 잡혀 있다.
   뒤쪽 빈 줄을 잘라 내지 않으면 백만 줄을 헛돌게 된다. */
function trimGrid(g){
  let last=-1;
  for(let i=g.length-1;i>=0;i--){
    const r=g[i];
    if(r&&r.some(v=>String(v==null?'':v).trim()!=='')){last=i;break;}}
  return last<0?[]:g.slice(0,last+1);
}
/* 머리글 비교용 정규화 — 공백과 끝의 괄호 안내를 떼어 내고 영문은 소문자로
   ("타겟팅 그룹 (여러 개면 콤마로 구분)" → "타겟팅그룹", "Published\nAmount" → "publishedamount") */
const normHdr=v=>String(v==null?'':v).trim().replace(/\s*\([^()]*\)\s*$/,'').replace(/\s+/g,'').toLowerCase();
/* 괄호까지 그대로 둔 정규화 (v92) — "IWV(all)" · "IWV(tda)" 처럼 괄호 안이 이름의 일부인 열을 구분한다.
   머리글은 이것으로 먼저 찾고, 없으면 괄호 안내를 뗀 이름(normHdr)으로 찾는다 */
const normHdrFull=v=>String(v==null?'':v).trim().replace(/\s+/g,'').toLowerCase();
const hdrGet=(dict,v)=>dict.get('\u0001'+normHdrFull(v))||dict.get(normHdr(v));
/* ---------- 머리글 별칭 (v79) ----------
   템플릿 이름이 아니어도 실무 엑셀 · 매체 리포트에서 흔히 쓰는 이름이면 알아본다.
   (미디어믹스의 "상품 · 타겟팅 가이드 · 최종 예산 · 예상 노출수", 매체 RAW 의 "일 · 광고그룹 · 노출수 · 비용" 등)
   period 는 "5/29~6/1" 처럼 시작 · 종료를 한 칸에 적은 열 — 불러올 때 둘로 나눈다 */
const HDR_ALIAS={
  line:{
    segment:['구분','차수','플라이트','flight'],
    media:['매체','매체명','media','채널'],
    product:['광고상품','광고 상품','상품','상품명','광고상품명','광고 유형','product'],
    slot:['광고 지면','지면','노출 지면','placement'],
    landing:['랜딩 페이지','랜딩페이지','랜딩 url','설정 랜딩','landing page','landing url'],
    target:['타겟팅 그룹','타겟팅','타겟','타깃','타깃팅','타겟팅 가이드','타겟팅 그룹명','광고그룹','광고 그룹','target','targeting'],
    creative:['소재','소재명','광고 소재','creative'],
    line:['제품','제품명'],
    device:['디바이스','기기','device'],
    sec:['소재 초수','초수','소재 길이'],
    bid:['비드 타입','과금 방식','과금 기준','구매 방식','bid type'],
    price:['판매 단가','판매단가','단가','예상 단가','고정 단가','unit price'],
    start:['시작일','시작','시작 일자','집행 시작일','start','start date'],
    end:['종료일','종료','종료 일자','집행 종료일','end','end date'],
    period:['기간','상세 기간','집행 기간','캠페인 기간','period'],
    kpi:['kpi','kpi 지표','목표 지표'],
    e_imp:['예상 노출','예상 노출수','목표 노출','제안 노출','보장 노출'],
    e_click:['예상 클릭','예상 클릭수','목표 클릭','제안 클릭'],
    e_view:['예상 조회','예상 조회수','목표 조회','제안 조회'],
    budget:['예산','최종 예산','집행 예산','광고 예산','광고예산','총 예산','gross 예산','budget'],
    value:['밸류','value','published amount','총 밸류'],
    bonus:['보너스 밸류','보너스','서비스 금액','bonus'],
    note:['비고','메모','note','remark']},
  daily:{
    date:['일자','일','날짜','일시','기준일','보고 일자','date','day'],
    segment:['구분'],
    media:['매체명','매체','채널','media'],
    product:['광고상품명','광고상품','상품','상품명','광고 유형'],
    slot:['광고 지면','지면','노출 지면','placement'],
    target:['타겟팅 그룹명','타겟팅 그룹','타겟팅','타겟','타깃','광고그룹','광고 그룹','광고그룹 이름','광고 그룹 이름',
      '광고 세트','광고세트','광고 세트 이름','ad group','ad set'],
    line:['제품'],
    landing:['랜딩 페이지','랜딩페이지','설정 랜딩','landing page','entry page'],
    creative:['소재','소재명','광고 이름','광고명','광고 소재','ad name','creative'],
    imp:['노출','노출수','impressions','impression','imps','impr.'],
    click:['클릭','클릭수','clicks','click'],
    view:['조회','조회수','views','view','동영상 조회','동영상 조회수'],
    v25:['25% 조회','동영상 25% 재생','25% 재생','video played to 25%'],
    v50:['50% 조회','동영상 50% 재생','50% 재생','video played to 50%'],
    v75:['75% 조회','동영상 75% 재생','75% 재생','video played to 75%'],
    v100:['100% 조회','동영상 100% 재생','100% 재생','video played to 100%'],
    v3:['3초 조회','3초 재생','3초 동영상 재생'],
    conv:['전환','전환수','conversions'],
    install:['설치','설치수','installs'],
    eng:['참여','참여수','engagements'],
    rev:['매출','revenue'],
    /* 유입 · 체류시간 (v92) — Adobe Analytics 등 사이트 분석 리포트 머리글 */
    iwv:['IWV(all)','IWV','interacting visits','인터랙팅 방문','인터랙팅 비짓'],
    iwv_mh:['IWV(mobilityhub)','IWV(mobility hub)','IWV(e-mobilityhub)'],
    iwv_mp:['IWV(modelpage)','IWV(model page)','IWV(ix3-modelpage)'],
    iwv_tda:['IWV(tda)','IWV(tda-experience)','IWV(ix3-tda)'],
    dw15:['체류시간 : less than 15 seconds','time on site : less than 15 seconds','time spent per visit : less than 15 seconds','15초 미만'],
    dw30:['체류시간 : 15 to 29 seconds','time on site : 15 to 29 seconds','time spent per visit : 15 to 29 seconds','15~29초'],
    dw60:['체류시간 : 30 to 59 seconds','time on site : 30 to 59 seconds','time spent per visit : 30 to 59 seconds','30~59초'],
    dw3m:['체류시간 : 1 to 3 minutes','time on site : 1 to 3 minutes','time spent per visit : 1 to 3 minutes','1~3분'],
    dw5m:['체류시간 : 3 to 5 minutes','time on site : 3 to 5 minutes','time spent per visit : 3 to 5 minutes','3~5분'],
    dw10m:['체류시간 : 5 to 10 minutes','time on site : 5 to 10 minutes','time spent per visit : 5 to 10 minutes','5~10분'],
    dw15m:['체류시간 : 10 to 15 minutes','time on site : 10 to 15 minutes','time spent per visit : 10 to 15 minutes','10~15분'],
    dw20m:['체류시간 : 15 to 20 minutes','time on site : 15 to 20 minutes','time spent per visit : 15 to 20 minutes','15~20분'],
    dw30m:['체류시간 : 20 to 30 minutes','time on site : 20 to 30 minutes','time spent per visit : 20 to 30 minutes','20~30분'],
    dw30p:['체류시간 : more than 30 minutes','time on site : more than 30 minutes','time spent per visit : more than 30 minutes','30분 이상'],
    cost:['소진비용','소진 비용','소진금액','소진 금액','비용','광고비','지출','지출 금액','집행 금액','집행금액',
      'cost','spend','amount spent']}};
/* 머리글 → 항목 열쇠 사전. 지금 열 이름(사용자가 바꾼 이름 포함) > 기본 이름 > 별칭 순으로 채운다 */
function hdrDict(cols,kind){
  const m=new Map();
  const put=(l,k)=>{const n=normHdr(l);if(n&&!m.has(n))m.set(n,k);
    const f='\u0001'+normHdrFull(l);if(f.length>1&&!m.has(f))m.set(f,k);};
  cols.forEach(c=>put(c.l,c.k));
  try{const def=kind==='line'?lineColsDefault():sheetColsDefault();def.forEach(c=>put(c.l,c.k));}catch(e){}
  Object.entries(HDR_ALIAS[kind]||{}).forEach(([k,ls])=>ls.forEach(l=>put(l,k)));
  return m;
}
/* 한 줄이 머리글로서 몇 개의 항목을 알아보는가. need 중 하나는 꼭 있어야 한다 (일자별 = 일자, 예상 효율 = 매체·상품) */
function hdrScore(row,dict,need){
  const ks=new Set();
  (row||[]).forEach(v=>{const k=hdrGet(dict,v);if(k)ks.add(k);});
  if(need&&!need.some(k=>ks.has(k)))return 0;
  return ks.size>=2?ks.size:0;
}
/* 위쪽 40줄 중 **가장 많이 알아보는 줄**을 머리글로 (예전에는 2개만 맞으면 첫 줄로 정했다) */
function findHeader(grid,dict,need){
  let bi=-1,bs=0;
  for(let i=0;i<Math.min(grid.length,40);i++){
    const sc=hdrScore(grid[i],dict,need);
    if(sc>bs){bs=sc;bi=i;}}
  return {i:bi,score:bs};
}
/* 같은 항목으로 읽히는 열이 여럿이면 금액 기준으로 고른다 —
   VAT 포함 > Gross > 표시 없음 > Net · VAT 제외 (미디어믹스 예산이 VAT 포함 Gross 기준이라 소진도 같은 기준으로).
   순위가 같으면 **첫 번째 열**. (실무 엑셀에는 "소진비용 (Gross)" 옆에 같은 이름의 비고 열이
   붙어 있는 경우가 있는데, 예전에는 뒤쪽 열이 앞 열을 덮어써서 그 행의 금액이 비고 속 숫자로 바뀌었다) */
function basisRank(h){
  const t=String(h==null?'':h);
  if(/vat\s*포함|vat\s*incl|부가세\s*포함/i.test(t))return 3;
  if(/(^|[^a-z])net\b|넷|vat\s*제외|vat\s*excl|부가세\s*제외/i.test(t))return 0;
  if(/gross|그로스/i.test(t))return 2;
  return 1;}
function mapHeader(headRow,dict){
  const best={};
  (headRow||[]).forEach((h,ci)=>{
    const k=hdrGet(dict,h);if(!k)return;
    const r=basisRank(h);
    if(!best[k]||r>best[k].r)best[k]={ci,r};});
  const keys=(headRow||[]).map(()=>null);
  Object.entries(best).forEach(([k,b])=>{keys[b.ci]=k;});
  return keys;
}
/* 합계 · 소계 줄 — 불러오지 않는다 (미디어믹스 · 서머리 표에 끼어 있는 "SUB TOTAL", "Youtube Total", "합계") */
const TOTAL_RE=/^(grand\s*|sub\s*)?total$|\s(sub\s*)?total$|^(합계|소계|총계|총합|누계|전체\s*합계)$|\s(합계|소계|총계)$/i;
function isTotalRow(r,skip){
  return (r||[]).some((v,ci)=>ci!==skip&&typeof v==='string'&&TOTAL_RE.test(v.trim()));}
/* 표 중간에 다시 나오는 머리글 줄 (한 시트에 표가 둘 이상일 때) */
const isHeaderRow=(r,dict)=>{let n=0;(r||[]).forEach(v=>{if(typeof v==='string'&&hdrGet(dict,v))n++;});return n>=2;};
/* 머리글을 못 찾은 한 장짜리 시트 — **템플릿 열 순서대로** 읽는다 (v79).
   제목 · 머리글 같은 윗부분은 숫자가 하나도 없는 줄이라 건너뛰고, 숫자가 처음 나오는 줄부터 데이터로 본다 */
function positionalStart(grid,keys){
  const di=keys.indexOf('date');
  for(let i=0;i<grid.length;i++){
    const r=grid[i]||[];
    if(di>=0&&!normDate(String(r[di]==null?'':r[di])))continue;
    if(r.some(v=>{const n=cleanNum(v);return n!==null&&isFinite(n);}))return i;}
  return grid.length;
}
/* 머리글을 거의 못 알아봤는가 — 이름이 적힌 칸 중 알아본 칸이 40% 미만 (예: DAY · MEDIA · A · B …).
   한 장짜리 시트에서 이러면 머리글은 무시하고 템플릿 열 순서로 읽는다 */
function hdrWeak(row,dict){
  const named=(row||[]).filter(v=>String(v==null?'':v).trim()!=='');
  const hit=named.filter(v=>hdrGet(dict,v)).length;
  return !named.length||hit/named.length<0.4;}
/* 여러 줄 · 여러 칸 공백을 한 칸으로 (셀 안 줄바꿈 "M2544 + 육아 관심사\n*부모 타겟팅") */
const oneLine=v=>String(v==null?'':v).replace(/\s*[\r\n]+\s*/g,' ').replace(/\s{2,}/g,' ').trim();
/* 비드 타입 정규화 — "경매형CPC", "Bid CPC", "CPC(자동입찰)" 같은 표기도 CPC 로 */
function normBid(v){
  const t=String(v==null?'':v).toUpperCase();
  const m=t.match(/CP[MCVAIETD]/);
  if(m)return m[0];
  return String(v||'').trim();
}
const isYes=v=>/^(o|y|yes|예|보장|true|1|✓|v)$/i.test(String(v==null?'':v).trim());
/* 엑셀 날짜 칸 → 'YYYY-MM-DD'.
   **시간대 보정이 필요하다.** SheetJS 는 브라우저 시간대만큼 값을 밀어서 돌려주기 때문에
   한국(UTC+9)에서는 9월 1일이 8월 31일 14:59Z 로 나온다 — 그대로 읽으면 날짜가 하루 당겨진다.
   가장 가까운 UTC 자정으로 반올림한 뒤 UTC 기준으로 읽으면 어느 시간대에서나 같은 날짜가 된다. */
function xlsDay(d){
  /* SheetJS 가 뺀 만큼(그 날짜의 시간대 오프셋) 도로 더해 "엑셀에 적힌 벽시계" 로 돌린다 */
  const off=d.getTimezoneOffset(),w=d.getTime()-off*60000;
  /* 날짜만 있는 칸은 벽시계가 자정 언저리로 나온다 — 옛 지방시(LMT) 초 단위 오차로 23:59:08 처럼
     조금 모자라거나, 서머타임이 자정에 바뀌는 날은 ±1시간까지 어긋난다 → 가장 가까운 자정으로.
     **시각이 있는 칸**(2026-09-02 18:00)은 반올림하면 12시 이후가 다음 날로 넘어가므로 그 날짜를 그대로 쓴다 (v78) */
  const tod=((w%864e5)+864e5)%864e5;
  const nearDst=new Date(d.getTime()-2*36e5).getTimezoneOffset()!==off
    ||new Date(d.getTime()+2*36e5).getTimezoneOffset()!==off;
  const tol=nearDst?3700e3:90e3;
  const t=(tod<tol||tod>864e5-tol?Math.round(w/864e5):Math.floor(w/864e5))*864e5, x=new Date(t);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;
}
/* var — 시험할 때 한도를 낮춰 볼 수 있게 */
var XLS_MAX_ROWS=300000;
/* 시트의 "쓴 범위(!ref)" 가 A1:L1048576 처럼 최대치로 잡혀 있는 파일이 많다.
   그대로 읽으면 1,200만 칸을 두 번 훑느라 30초씩 걸린다 —
   실제로 값이 들어 있는 마지막 행·열까지로 줄여 두고 읽는다. */
function tightenRef(ws){
  try{
    if(!ws||!ws['!ref']||typeof XLSX==='undefined')return;
    const r0=XLSX.utils.decode_range(ws['!ref']);
    let maxR=-1,maxC=-1;
    for(const k in ws){
      if(k.charCodeAt(0)===33)continue;                 /* '!' 로 시작하는 메타 */
      const c=ws[k];
      if(!c||c.v===undefined||c.v===null||String(c.v).trim()==='')continue;
      const a=XLSX.utils.decode_cell(k);
      if(a.r>maxR)maxR=a.r;
      if(a.c>maxC)maxC=a.c;}
    if(maxR<0)return;
    ws['!ref']=XLSX.utils.encode_range({s:{r:r0.s.r,c:r0.s.c},
      e:{r:Math.min(r0.e.r,maxR),c:Math.min(r0.e.c,maxC)}});
  }catch(e){}
}
/* 시트의 첫 n 줄만 — 어느 시트를 읽을지 고를 때 머리글만 본다 (시트 전체를 다 풀지 않게) */
function sheetHead(ws,n){
  try{
    if(!ws||!ws['!ref'])return [];
    tightenRef(ws);
    const r=XLSX.utils.decode_range(ws['!ref']);
    return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,
      range:{s:r.s,e:{r:Math.min(r.e.r,r.s.r+n-1),c:r.e.c}}});
  }catch(e){return [];}
}
/* 시트 하나 → 2차원 배열.
   덧붙이는 정보 (배열의 속성) — __pct: % 서식 숫자 칸("행,열") · __cut: 행 한도에 닿아 뒤를 못 읽었는가 */
function sheetGrid(ws){
  if(!ws)return [];
  /* sheetRows 로 잘렸으면 SheetJS 가 원래 범위를 !fullref 에 남긴다 */
  const full=ws['!fullref']?XLSX.utils.decode_range(ws['!fullref']):null;
  tightenRef(ws);
  const OPT={header:1,defval:''};
  const shown=XLSX.utils.sheet_to_json(ws,{...OPT,raw:false});  /* 보이는 대로 (글자·날짜) */
  const val=XLSX.utils.sheet_to_json(ws,{...OPT,raw:true});     /* 원래 값 (숫자) */
  const pct=new Set();
  /* 숫자는 **서식에 반올림된 글자 대신 원래 값**을 쓴다 —
     셀 서식이 #,##0 이면 소수점이 잘려 합계가 원본과 어긋난다. */
  const g=trimGrid(shown.map((row,ri)=>row.map((v,ci)=>{
    const rv=val[ri]?val[ri][ci]:undefined;
    if(rv instanceof Date&&!isNaN(rv))return xlsDay(rv);
    if(typeof rv==='number'&&isFinite(rv)){
      /* % 서식 칸(5.2% 로 보이는 0.052)은 따로 적어 둔다 — 시청률처럼 %p 로 받는 곳이 쓴다 */
      if(typeof v==='string'&&v.indexOf('%')>=0&&/%\s*$/.test(v))pct.add(ri+','+ci);
      return rv;}
    return v;})));
  g.__pct=pct;
  const ref=ws['!ref']?XLSX.utils.decode_range(ws['!ref']):null;
  /* 병합된 칸 (v79) — 엑셀은 병합 범위의 **첫 칸에만** 값을 둔다. 미디어믹스처럼 매체 · 기간을
     여러 줄에 병합해 둔 표는 둘째 줄부터 매체가 빈칸으로 읽혀 라인이 깨졌다.
     글자(이름 · 날짜)만 나머지 칸에 채운다 — 숫자(예산 등)를 채우면 금액이 두 번 잡히므로 첫 칸에만 둔다 */
  try{
    (ws['!merges']||[]).forEach(m=>{
      if(!ref)return;
      const r0=m.s.r-ref.s.r,c0=m.s.c-ref.s.c;
      const v=g[r0]&&g[r0][c0];
      if(typeof v!=='string'||!v.trim())return;
      const n=cleanNum(v);if(n!==null&&isFinite(n))return;
      for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++){
        const ri=r-ref.s.r,ci=c-ref.s.c;
        if(ri<0||ci<0||!g[ri])continue;
        if(g[ri][ci]===''||g[ri][ci]==null)g[ri][ci]=v;}});
  }catch(e){}
  /* 한도의 마지막 줄까지 값이 차 있고 파일 범위가 그 뒤로 더 있으면 → 잘렸다 */
  g.__cut=!!(full&&ref&&ref.e.r>=XLS_MAX_ROWS-1&&full.e.r>ref.e.r);
  return g;
}
/* CSV · TSV 글자 → 2차원 배열.
   한국어 엑셀의 기본 CSV 는 CP949(EUC-KR) 다 — UTF-8 로 읽어 글자가 깨지거나(U+FFFD) 머리글이 안 보이면
   EUC-KR 로 다시 읽는다. "유니코드 텍스트"(UTF-16) 로 저장한 파일은 BOM 으로 알아본다. */
function csvGrid(bytes,pick){
  const dec=enc=>{try{return new TextDecoder(enc).decode(bytes);}catch(e){return null;}};
  const broken=t=>t.indexOf('\uFFFD')>=0;
  const enc=(bytes[0]===0xFF&&bytes[1]===0xFE)?'utf-16le':(bytes[0]===0xFE&&bytes[1]===0xFF)?'utf-16be':'utf-8';
  const t1=dec(enc)||'';
  let g=parseCSV(t1);
  const ok1=pick?pick(g):!broken(t1);
  if(enc==='utf-8'&&(!ok1||broken(t1))){
    const t2=dec('euc-kr');
    if(t2!=null){
      const g2=parseCSV(t2),ok2=pick?pick(g2):!broken(t2);
      if((ok2&&!ok1)||(!ok1&&!ok2&&broken(t1)&&!broken(t2))){g=g2;g.__enc='euc-kr';}}}
  return g;
}
/* 파일 → 2차원 배열. .xlsx 는 SheetJS 가 있을 때만 (배포본에서는 자동 로드)
   pick(grid) — 이 시트에 머리글이 있는가. 시트가 여러 장이면 **머리글이 맞는 첫 시트**를 읽는다
   (없으면 첫 시트). 읽은 시트 이름은 __sheet, 몇 번째인지는 __sheetIdx, 시트 수는 __sheets 에 남긴다. */
function readGrid(file,pick){
  return new Promise((res,rej)=>{
    const isX=/\.xlsx?$/i.test(file.name);
    if(isX){
      if(typeof XLSX==='undefined'){
        rej(new Error('이 화면에서는 .xlsx 를 바로 읽을 수 없습니다. 엑셀에서 [다른 이름으로 저장 → CSV]로 바꿔 올려 주세요.'));return;}
      const r=new FileReader();
      r.onload=()=>{try{
        /* cellDates — 날짜 칸을 진짜 날짜로 읽는다 ("09월 01일" 처럼 연도가 안 보이는 서식 대비) */
        /* sheetRows — "쓴 범위" 가 백만 행으로 잡힌 파일에서 XML 을 끝까지 훑지 않게 한다.
           (16MB 짜리 실무 파일에서 12초 → 5초) 실제 리포트가 30만 행을 넘을 일은 없다.
           넘으면 __cut 으로 알린다. */
        const wb=XLSX.read(new Uint8Array(r.result),
          {type:'array',cellDates:true,sheetRows:XLS_MAX_ROWS});
        const names=wb.SheetNames||[];
        /* 시트 고르기 (v79)
           · 한 장뿐이면 그 시트를 그대로 읽는다 (머리글이 안 맞아도 — 템플릿 열 순서로 읽는다)
           · 여러 장이면 머리글을 **가장 많이 알아보는** 시트. 예전에는 조건(2개)만 맞으면 첫 시트를 골라
             리포트 파일을 통째로 넣으면 서머리 표를 라인으로 읽었다 (SUB TOTAL 까지 23개 · 예산 6억)
           pick(첫 40줄) 은 점수(숫자) 또는 참/거짓을 돌려준다 */
        let nm=names[0],best=0;
        if(names.length>1&&pick){
          names.forEach(n=>{const sc=+pick(sheetHead(wb.Sheets[n],40))||0;if(sc>best){best=sc;nm=n;}});}
        const out=nm?sheetGrid(wb.Sheets[nm]):[];
        out.__sheet=nm;
        out.__sheets=names.length;
        out.__sheetIdx=Math.max(0,names.indexOf(nm));
        res(out);
      }catch(e){rej(e);}};
      r.onerror=()=>rej(new Error('파일을 읽지 못했습니다.'));
      r.readAsArrayBuffer(file);
    }else{
      const r=new FileReader();
      r.onload=()=>{try{res(csvGrid(new Uint8Array(r.result),pick));}catch(e){rej(e);}};
      r.onerror=()=>rej(new Error('파일을 읽지 못했습니다.'));
      r.readAsArrayBuffer(file);}});
}
/* 불러오기 결과에 덧붙일 안내 — 첫 시트가 아닌 시트를 읽었나 · 행 한도에 닿았나 */
function gridNotes(g){
  const out=[];
  if(!g)return out;
  /* 여러 장이면 어느 시트를 읽었는지 늘 알린다 (v79 — 첫 시트를 읽었을 때는 말이 없었다) */
  if(g.__sheets>1&&g.__sheet)out.push(`시트 ${g.__sheets}개 중 '${g.__sheet}' 시트를 읽었습니다.`);
  if(g.__cut)out.push(`행 한도(${XLS_MAX_ROWS.toLocaleString()}행)에 닿아 그 뒤의 행은 읽지 않았습니다. 파일을 나눠서 올려 주세요.`);
  return out;
}
function pickFile(cb){
  const inp=$('fileIn');if(!inp)return;
  inp.value='';
  inp.onchange=()=>{const f=inp.files&&inp.files[0];if(f)cb(f);};
  inp.click();
}
function importDaily(f){
  const run=(async file=>{
    let grid;
    progOpen('일자별 실적을 불러오는 중');
    progSet(null,`${file.name||'파일'} 읽는 중…`);
    await uiTick();
    const cols=dailyColsOf(true),dict=hdrDict(cols,'daily'),NEED=['date'];
    try{grid=await readGrid(file,g=>findHeader(g,dict,NEED).score);}catch(e){
      progClose();confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    progSet(26,`${grid.length.toLocaleString()}줄 · 머리글 찾는 중…`);
    await uiTick();
    let hi=findHeader(grid,dict,NEED).i,keys,first,byPos=false;
    /* 시트가 한 장이면 머리글을 거의 못 알아봐도 멈추지 않고 **템플릿 열 순서대로** 읽는다 (v79) */
    if(hi>=0&&!((grid.__sheets||1)<=1&&hdrWeak(grid[hi],dict))){keys=mapHeader(grid[hi],dict);first=hi+1;}
    else if((grid.__sheets||1)<=1){
      keys=tplDailyCols().map(c=>c.k);first=positionalStart(grid,keys);byPos=true;}
    else{progClose();confirmModal('머리글 줄을 찾지 못했습니다.',
      `시트 ${grid.__sheets}개 중 일자 · 매체명 같은 머리글이 있는 시트를 찾지 못했습니다. 템플릿을 내려받아 다시 시도해 주세요.`,()=>{},'확인');return;}
    const numK=new Set(SHEET_COLS.filter(c=>c.type==='num').map(c=>c.k));
    let rows=[],skipTot=0;
    const NROW=Math.max(1,grid.length-first);
    let tick=performance.now();
    for(let i=first;i<grid.length;i++){
      /* 0.1초에 한 번만 화면에 숨 쉴 틈을 준다 (줄 수로 세면 빈 줄이 많을 때 오히려 느려진다) */
      if(performance.now()-tick>100){
        progSet(26+((i-first)/NROW)*30,
          `${rows.length.toLocaleString()} / ${NROW.toLocaleString()}행 정리 중…`);
        await uiTick();tick=performance.now();}
      const r=grid[i]||[];
      if(!r.some(v=>String(v==null?'':v).trim()!==''))continue;
      /* 합계 · 소계 줄, 표 중간에 다시 나온 머리글 줄은 건너뛴다 (v79) */
      if(isTotalRow(r)){skipTot++;continue;}
      if(isHeaderRow(r,dict))continue;
      const o={date:'',segment:'',media:'',product:'',target:'',line:''};
      /* 원본 줄 전체를 기억해 둔다 — 대시보드가 쓰지 않는 열(광고그룹명 등)만 다른 행을
         "똑같은 행" 으로 잘못 지우지 않기 위해서 */
      o.__src=r.map(v=>String(v==null?'':v).trim()).join('\u0002');
      SHEET_COLS.filter(c=>c.type==='num').forEach(c=>o[c.k]='');
      let filled=false;
      keys.forEach((k,ci)=>{
        if(!k)return;
        const raw=String(r[ci]==null?'':r[ci]).trim();
        if(raw==='')return;
        if(k==='date')o.date=normDate(raw)||raw;
        else if(numK.has(k)){const n=cleanNum(raw);
          /* 숫자로 읽을 수 없는 값은 0 으로 삼키지 않고 글자 그대로 둔다 — 표에서 그 칸이 붉게 표시된다 */
          if(n!==null){o[k]=isNaN(n)?raw:n;filled=true;}}
        else {o[k]=oneLine(raw);filled=true;}});
      /* 재생 구간(25~100%) 값이 비율(0~1 사이 소수)로 적혀 있으면 노출 × 비율로 건수로 바꾼다 (v79)
         — 구글 애즈 리포트는 "동영상 25% 재생" 을 노출 대비 비율로 내려 준다. 건수는 소수가 될 수 없으므로 구분된다 */
      ['v25','v50','v75','v100'].forEach(k=>{const v=o[k];
        if(typeof v==='number'&&v>0&&v<1&&+o.imp>0){o[k]=Math.round(v*o.imp);o.__ratio=1;}});
      /* 날짜도 없고 숫자도 전부 0 · 빈칸인 줄 — 수식만 남은 빈 줄이다 (매체 RAW 끝의 0 줄) */
      if(!o.date&&!SHEET_COLS.some(c=>c.type==='num'&&typeof o[c.k]==='number'&&o[c.k]!==0))continue;
      if(filled||o.date)rows.push(o);}
    const ratioN=rows.filter(r=>r.__ratio).length;rows.forEach(r=>{delete r.__ratio;});
    /* 조합으로 적은 칸은 등록된 순서로 맞춰 준다 —
       "A, B" 든 "B · A" 든 같은 조합이면 화면에는 등록된 표기 하나로 보이게 */
    progSet(58,'예상 효율과 맞춰 보는 중…');await uiTick();
    tick=performance.now();
    for(let i=0;i<rows.length;i++){
      if(performance.now()-tick>100){
        progSet(58+(i/Math.max(rows.length,1))*22,
          `${i.toLocaleString()} / ${rows.length.toLocaleString()}행 맞춰 보는 중…`);
        await uiTick();tick=performance.now();}
      canonRow(rows[i]);}
    /* **행은 하나도 버리지 않는다.**
       매체 리포트에는 값까지 똑같은 줄이 실제로 두 번 나오는 경우가 있어서
       (광고그룹만 다르고 숫자가 같은 경우 등) 예전처럼 지우면 합계가 원본과 어긋난다.
       대신 몇 줄이 완전히 같은지 세어 알려만 준다. */
    progSet(82,'같은 줄이 있는지 보는 중…');await uiTick();
    const seen=new Set();let dup=0;
    rows.forEach(r=>{const k=(r.__src||'')+'\u0002'+rowKey(r);
      if(seen.has(k))dup++;else seen.add(k);});
    rows.forEach(r=>{delete r.__src;});
    if(!rows.length){progClose();
      confirmModal('가져올 행이 없습니다.','머리글 아래에 데이터가 있는지 확인해 주세요.',()=>{},'확인');return;}
    progSet(94,'매칭 결과 확인 중…');await uiTick();
    /* 예상 효율과 맞지 않는 행 (이름 · 기간) — 숫자만 문제인 행('num')은 따로 센다 */
    const bad=rows.filter(r=>{const k=rowIssue(r);return !!k&&k!=='num';}).length;
    const badC=rows.reduce((n,r)=>n+rowCellIssues(r).cells.length,0);
    const numC=rows.reduce((n,r)=>n+rowNumBad(r).length,0);
    progSet(100,'');
    /* v51 — 확인 팝업 없이 바로 반영한다. 파일을 넣는 것 자체가 "불러오기" 의사표시다.
       (되돌리려면 Ctrl+Z · 맞지 않는 칸은 표에서 붉게 표시되고 탭을 옮길 때 알려 준다) */
    await applyImportedRows(rows,{dup,bad,badC,numC,sheet:(grid.__sheets||1)>1?grid.__sheet:'',
      byPos,skipTot,ratioN});
    /* 행 한도에 닿아 뒤쪽을 못 읽었으면 — 데이터가 빠진 것이라 팝업으로 알린다 */
    if(grid.__cut)confirmModal('파일 뒷부분을 읽지 못했습니다.',gridNotes(grid).map(esc).join('<br>'),()=>{},'확인',true);
  });
  /* 버튼에 그냥 걸면 클릭 이벤트가 첫 인자로 들어온다 — 진짜 파일일 때만 바로 읽는다 */
  (f instanceof Blob)?run(f):pickFile(run);
}
/* 표에 얹고 대시보드까지 반영 — 여기도 몇 초 걸리므로 진행 표시를 이어서 보여 준다 */
async function applyImportedRows(rows,note){
  /* 이미 진행 표시가 떠 있으면 제목만 바꿔 이어 간다 (깜빡임 없이) */
  if(typeof PROG!=='undefined'&&PROG)progTitle('표에 반영하는 중');
  else progOpen('표에 반영하는 중');
  progSet(8,`${rows.length.toLocaleString()}행을 표에 옮기는 중…`);
  await uiTick();
  pushUndo();
  SHEET=rows;SEL={r1:0,c1:0,r2:0,c2:0};
  renderSheet();
  progSet(58,'대시보드에 반영하는 중…');
  await uiTick();
  applySheet();
  progSet(84,'그래프를 다시 그리는 중…');
  await uiTick();
  renderAll();
  /* 확인 팝업을 없앤 대신(v51), 결과 요약은 표 위 문구에 남긴다 */
  const n=note||{};
  const e=$('saveState');
  /* 숫자로 읽을 수 없는 칸(numC)은 "예상 효율과 맞지 않는 칸" 과 따로 센다 */
  const misC=(n.badC||0)-(n.numC||0);
  if(e)e.textContent=`엑셀 ${rows.length.toLocaleString()}행 불러옴`
    +(n.sheet?` · '${n.sheet}' 시트`:'')
    +(n.byPos?' · 머리글이 달라 템플릿 열 순서대로 읽음':'')
    +(n.skipTot?` · 합계 줄 ${n.skipTot}개 건너뜀`:'')
    +(n.ratioN?` · 재생 비율 ${n.ratioN}행을 건수로 바꿈`:'')
    +(n.dup?` · 값까지 같은 행 ${n.dup}개 포함`:'')
    +(misC>0?` · 예상 효율과 맞지 않는 칸 ${misC}개(${n.bad}행)는 붉게 표시`:'')
    +(n.numC?` · 숫자로 읽을 수 없는 칸 ${n.numC}개는 붉게 표시`:'')
    +` · 저장 대기`;
  progSet(100,'완료');
  await uiTick();
  progClose();
  try{markDirty();saveLocal();}catch(err){}
}
/* 머리글 안내 문구에서 괄호 설명을 뗀 이름 */
const normHdrLabel=l=>String(l||'').replace(/\s*\([^()]*\)\s*$/,'').trim();
/* "5/29~6/1" · "2026.05.29 - 2026.06.01" → [시작, 종료]. 종료가 시작보다 앞이면 해를 넘긴 것으로 본다 */
function splitPeriod(raw,baseY){
  const p=String(raw||'').split(/\s*[~∼〜]\s*|\s+[-–]\s+/).map(x=>x.trim()).filter(Boolean);
  if(p.length<2)return null;
  const a=normDate(p[0]),b0=normDate(p[1]);
  if(!a||!b0)return null;
  let b=b0;
  /* "6/1" 처럼 연도가 없으면 시작일의 연도를 따른다 */
  if(!/\d{4}/.test(p[1])&&/\d{4}/.test(p[0]))b=a.slice(0,4)+b0.slice(4);
  if(b<a)b=String(+b.slice(0,4)+1)+b.slice(4);
  return [a,b];}
/* 디바이스 표기 정리 — "ALL (PC, MO, 태블릿, TV)" · "MO(APP)" → PC · MO · CTV */
function normDevices(raw){
  const t=String(raw||'').toUpperCase(),out=new Set();
  if(/\bALL\b|전체/.test(t))DEVICES.forEach(d=>out.add(d));
  if(/\bPC\b|데스크/.test(t))out.add('PC');
  if(/\bMO\b|MOBILE|모바일|\bAPP\b|앱|태블릿|TABLET/.test(t))out.add('MO');
  if(/CTV|\bTV\b|커넥티드/.test(t))out.add('CTV');
  if(!out.size)return String(raw||'').split(/[+,\s]+/).filter(Boolean);
  return DEVICES.filter(d=>out.has(d));}
function importLines(f){
  const run=(async file=>{
    let grid;
    const cols=lineColsOf(true),dict=hdrDict(cols,'line'),NEED=['media','product'];
    try{grid=await readGrid(file,g=>findHeader(g,dict,NEED).score);}catch(e){
      confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    let hi=findHeader(grid,dict,NEED).i,keys,first,byPos=false;
    /* 시트가 한 장이면 머리글을 거의 못 알아봐도 멈추지 않고 **템플릿 열 순서대로** 읽는다 (v79) */
    if(hi>=0&&!((grid.__sheets||1)<=1&&hdrWeak(grid[hi],dict))){keys=mapHeader(grid[hi],dict);first=hi+1;}
    else if((grid.__sheets||1)<=1){
      keys=tplLineCols().map(c=>c.k);first=positionalStart(grid,keys);byPos=true;}
    else{confirmModal('머리글 줄을 찾지 못했습니다.',
      `시트 ${grid.__sheets}개 중 매체 · 광고상품 같은 머리글이 있는 시트를 찾지 못했습니다.`,()=>{},'확인');return;}
    const typeOf={};LINE_COLS.forEach(c=>typeOf[c.k]=c.type);
    const kpiByLabel={};Object.entries(KPI_LABEL).forEach(([k,v])=>kpiByLabel[v]=k);
    const out=[];
    /* 숫자로 읽을 수 없는 칸 — 0 으로 채우지 않고 비워 둔 뒤 확인 창에 알린다 */
    const badNum=[];
    const hdrOf={};cols.forEach(c=>{hdrOf[c.k]=c.l;});
    const noteCi=keys.indexOf('note');
    let skipTot=0,skipNoKey=0;
    const baseY=+String(CAMPAIGN.today||todaySeoul()).slice(0,4);
    for(let i=first;i<grid.length;i++){
      const r=grid[i]||[];
      if(!r.some(v=>String(v==null?'':v).trim()!==''))continue;
      /* 합계 · 소계 줄, 표 중간에 다시 나온 머리글 줄은 라인이 아니다 (v79) */
      if(isTotalRow(r,noteCi)){skipTot++;continue;}
      if(isHeaderRow(r,dict))continue;
      const n=blankLine();
      let filled=false,creatives=[],targets=[],products=[],slots=[],landings=[],period='',hasBonus=false;
      keys.forEach((k,ci)=>{
        if(!k)return;
        const raw0=String(r[ci]==null?'':r[ci]).trim();
        if(raw0==='')return;
        /* 셀 안 줄바꿈은 한 칸 띄우기로 (비고는 그대로) */
        const raw=k==='note'?raw0:oneLine(raw0);
        filled=true;
        const t=typeOf[k];
        const numOf=s=>{const v=cleanNum(s);
          if(v!==null&&isNaN(v)){badNum.push({row:i+1,col:hdrOf[k]||k,raw});return null;}
          return v;};
        /* 동일 예산 안에서 여러 개를 함께 돌리는 항목은 콤마로 이어 적는다 */
        if(k==='creative'){creatives=parseMulti(raw);}
        else if(k==='target'){targets=parseMulti(raw);}
        else if(k==='product'){products=parseMulti(raw);}
        else if(k==='slot'){slots=parseMulti(raw);}
        else if(k==='landing'){landings=parseMulti(raw);}
        else if(k==='period'){period=raw;}
        else if(k==='kpi'){n.kpi=kpiByLabel[raw]||(KPI_KEYS.includes(raw)?raw:n.kpi);}
        else if(t==='date'){n[k]=normDate(raw)||raw;}
        else if(t==='pct'){const v=numOf(raw);if(v!==null)n[k]=v>1?v/100:v;}
        else if(t==='exp'){const v=numOf(raw);if(v!==null)n.e[k.slice(2)]=v;}
        else if(k==='bid'){n.bid=normBid(raw);}
        else if(GUAR_KEY[k]){n.g=n.g||{};n.g[GUAR_KEY[k]]=isYes(raw);}
        else if(t==='gross'){const v=numOf(raw);if(v!==null)n.gross=v;}
        /* 밸류 — 숫자로 담는다 (v79: 글자로 담겨 보너스가 계산되지 않았다) */
        else if(t==='val'||k==='value'){const v=numOf(raw);if(v!==null)n.value=v;}
        else if(k==='bonus'){const v=numOf(raw);if(v!==null){n.bonus=v;hasBonus=true;}}
        else if(t==='num'){const v=numOf(raw);if(v!==null)n[k]=v;}
        else if(t==='dev'){n.device=normDevices(raw);}
        else n[k]=raw;});
      if(!filled)continue;
      /* 매체도 광고상품도 없는 줄은 라인이 아니다 (표 아래 안내 문구 등) */
      if(!n.media&&!products.length){skipNoKey++;continue;}
      /* "5/29~6/1" 처럼 한 칸에 적은 기간 — 시작 · 종료 칸이 비어 있을 때만 쓴다 */
      if(period){const pr=splitPeriod(period,baseY);
        if(pr){if(!n.start)n.start=pr[0];if(!n.end)n.end=pr[1];}}
      /* 밸류만 적었으면 보너스 = 밸류 − 예산 (안내 문구 약속대로 보너스율이 자동으로 잡힌다) */
      if(n.value!=null&&n.value!==''&&!hasBonus)n.bonus=Math.max(0,(+n.value||0)-(+n.gross||0));
      if(!n.bid&&BID_TYPES.length)n.bid='CPM';
      if(BID_KPI[n.bid]&&KPI_KEYS.includes(BID_KPI[n.bid])&&!keys.includes('kpi'))n.kpi=BID_KPI[n.bid];
      n.__cr=creatives;n.__tg=targets;n.__pd=products;n.__sl=slots;n.__ld=landings;
      out.push(n);}
    if(!out.length){confirmModal('가져올 행이 없습니다.','머리글 아래에 데이터가 있는지 확인해 주세요.',()=>{},'확인');return;}
    /* 덧붙임 — 읽은 시트 · 행 한도 · 숫자로 읽을 수 없어 비워 둔 칸 (값은 사용자 데이터라 번역하지 않는다) */
    const extra=gridNotes(grid).map(esc);
    if(byPos)extra.push('머리글을 알아보지 못해 <b>템플릿 열 순서</b>('+tplLineCols().slice(0,4).map(c=>esc(normHdrLabel(c.l))).join(' · ')+' …)대로 읽었습니다.');
    if(skipTot)extra.push(`합계 · 소계 줄 ${skipTot}개는 라인이 아니라서 건너뛰었습니다.`);
    if(skipNoKey)extra.push(`매체 · 광고상품이 비어 있는 줄 ${skipNoKey}개는 건너뛰었습니다.`);
    /* 예산 열이 없으면 알린다 (v79) — 머리글 이름이 달라 예산이 통째로 0 이 되어도 아무 말이 없었다 */
    if(!byPos&&!keys.includes('budget'))extra.push('<b>예산 열을 찾지 못했습니다</b> — 예산이 모두 비어 있습니다. 머리글을 "예산" 으로 적어 주세요.');
    if(!byPos){const miss=(grid[hi]||[]).map((h,ci)=>keys[ci]?'':String(h==null?'':h).replace(/\s+/g,' ').trim()).filter(Boolean);
      if(miss.length)extra.push(`읽지 않은 열 ${miss.length}개 — <span data-noi18n>${esc(miss.slice(0,8).join(' · '))}${miss.length>8?' …':''}</span>`);}
    if(badNum.length)extra.push(`숫자로 읽을 수 없는 칸 ${badNum.length}개는 비워 두었습니다.`
      +`<br><span data-noi18n>${badNum.slice(0,5).map(x=>esc(`${x.row}행 ${x.col}: "${x.raw}"`)).join('<br>')}`
      +`${badNum.length>5?'<br>…':''}</span>`);
    confirmModal(`${out.length}개 라인을 불러옵니다.`,
      '지금의 예상 효율 표를 이 내용으로 바꿉니다. 되돌리려면 Ctrl+Z 를 누르세요.'
        +extra.map(x=>'<br><br>'+x).join(''),
      ()=>{
        pushLineUndo();
        LINES=out.map(l=>{const {__cr,__tg,__pd,__sl,__ld,...rest}=l;return rest;});
        CREATIVES=CREATIVES.filter(()=>false);
        /* 소재를 만들기 **전에** 캠페인 기간부터 잡는다 —
           그래야 소재 게재 기간이 캠페인 전체로 잡힌다 */
        rebuildPeriod();
        LINES.forEach((l,i)=>{
          const src=out[i];
          if(src.__pd.length)setLineProducts(l,src.__pd);
          if(src.__sl.length)setLineSlots(l,src.__sl);
          if(src.__ld&&src.__ld.length)setLineLandings(l,src.__ld);
          if(src.__tg.length)setLineTargets(l,src.__tg);
          if(src.__cr.length)setLineCreatives(l,src.__cr);});
        rebuildPeriod();buildFacts();
        /* 조회 기간을 새 라인 기간에 맞춘다 (v79) */
        try{followDefaultRange();}catch(e){}
        buildFilters();buildSelects();
        renderKpiTable();renderCampForm();renderMix();renderAll();renderSheet();
        const e=$('lineSaveState');if(e)e.textContent=`엑셀 ${LINES.length}개 라인 불러옴 · 저장 대기`;
      },'불러오기',true);
  });
  (f instanceof Blob)?run(f):pickFile(run);
}
/* ---------- 배선 ---------- */
(function wireXlsx(){
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn;};
  on('tplDaily',downloadDailyTemplate);
  on('upDaily',()=>importDaily());
  on('tplLine',downloadLineTemplate);
  on('dlDaily',downloadDailyData);
  on('upLine',()=>importLines());
  on('crManageBtn',openCrManage);
})();
/* ---------- 파일 끌어다 놓기 ----------
   엑셀·CSV 를 탭 위로 끌어오면 안내가 뜨고, 놓으면 그대로 불러온다.
   (버튼을 찾아 누르지 않아도 되도록 — 리포트 데이터 입력 · 예상효율 입력 둘 다) */
const DROP_OK=/\.(xlsx|xls|csv|tsv|txt)$/i;
function enableFileDrop(host,label,onFile){
  if(!host||host.dataset.drop)return;
  host.dataset.drop='1';
  const ov=el('div','dropzone');
  ov.innerHTML=`<div class="dzbox"><span class="dzic">⤓</span><b>여기에 놓으면 불러옵니다</b>
    <i>${label} · xlsx · csv · tsv</i></div>`;
  host.appendChild(ov);
  let depth=0;
  const hasFile=e=>{const dt=e.dataTransfer;if(!dt)return false;
    return [...(dt.types||[])].includes('Files');};
  host.addEventListener('dragenter',e=>{if(!hasFile(e))return;
    e.preventDefault();depth++;host.classList.add('dragon');});
  host.addEventListener('dragover',e=>{if(!hasFile(e))return;
    e.preventDefault();e.dataTransfer.dropEffect='copy';});
  host.addEventListener('dragleave',e=>{if(!hasFile(e))return;
    depth=Math.max(0,depth-1);if(!depth)host.classList.remove('dragon');});
  host.addEventListener('drop',e=>{
    if(!hasFile(e))return;
    e.preventDefault();depth=0;host.classList.remove('dragon');
    const f=e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f)return;
    if(!DROP_OK.test(f.name)){
      confirmModal('이 파일은 불러올 수 없습니다.',
        `<b>${esc(f.name)}</b><br>엑셀(.xlsx) · CSV · TSV · 텍스트 파일만 불러옵니다.`,()=>{},'확인',true);
      return;}
    onFile(f);});
}
(function wireDrop(){
  const go=()=>{
    enableFileDrop($('tab-input'),'일자별 실적',f=>importDaily(f));
    enableFileDrop($('tab-setup'),'예상 효율(미디어믹스)',f=>importLines(f));
    /* 브라우저가 파일을 그냥 열어 버리지 않게 */
    ['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>{
      if(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')
        &&!e.target.closest('#tab-input,#tab-setup'))e.preventDefault();}));};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();
