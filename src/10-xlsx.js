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
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0">${freeze}</sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;});
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
  const dims=['date','segment','media','product','slot','target','line','creative']
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
/* 머리글 → 항목 열쇠. **같은 이름의 열이 두 개면 첫 번째만 쓴다.**
   (실무 엑셀에는 "소진비용 (Gross)" 옆에 같은 이름의 비고 열이 붙어 있는 경우가 있는데,
    예전에는 뒤쪽 열이 앞 열을 덮어써서 그 행의 금액이 비고 속 숫자로 바뀌었다) */
function mapHeader(headRow,cols){
  const byLabel={};cols.forEach(c=>byLabel[normHdr(c.l)]=c.k);
  const used=new Set();
  return (headRow||[]).map(h=>{
    const k=byLabel[normHdr(h)]||null;
    if(!k||used.has(k))return null;
    used.add(k);return k;});
}
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
        let first=null,hit=null;
        for(const nm of names){
          const g=sheetGrid(wb.Sheets[nm]);g.__sheet=nm;
          if(!first)first=g;
          if(!pick||pick(g)){hit=g;break;}}
        const out=hit||first||[];
        out.__sheets=names.length;
        out.__sheetIdx=Math.max(0,names.indexOf(out.__sheet));
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
  if(g.__sheetIdx>0&&g.__sheet)out.push(`시트 ${g.__sheets}개 중 '${g.__sheet}' 시트를 읽었습니다.`);
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
    const cols=dailyColsOf(true);
    try{grid=await readGrid(file,g=>findHeader(g,cols)>=0);}catch(e){
      progClose();confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    progSet(26,`${grid.length.toLocaleString()}줄 · 머리글 찾는 중…`);
    await uiTick();
    const hi=findHeader(grid,cols);
    if(hi<0){progClose();confirmModal('머리글 줄을 찾지 못했습니다.',
      '템플릿의 머리글(일자 · 구분 · 매체명 …) 줄이 그대로 있어야 합니다. 템플릿을 내려받아 다시 시도해 주세요.',()=>{},'확인');return;}
    const keys=mapHeader(grid[hi],cols);
    const numK=new Set(SHEET_COLS.filter(c=>c.type==='num').map(c=>c.k));
    let rows=[];
    const NROW=Math.max(1,grid.length-hi-1);
    let tick=performance.now();
    for(let i=hi+1;i<grid.length;i++){
      /* 0.1초에 한 번만 화면에 숨 쉴 틈을 준다 (줄 수로 세면 빈 줄이 많을 때 오히려 느려진다) */
      if(performance.now()-tick>100){
        progSet(26+((i-hi)/NROW)*30,
          `${rows.length.toLocaleString()} / ${NROW.toLocaleString()}행 정리 중…`);
        await uiTick();tick=performance.now();}
      const r=grid[i]||[];
      if(!r.some(v=>String(v||'').trim()!==''))continue;
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
        else {o[k]=raw;filled=true;}});
      if(filled||o.date)rows.push(o);}
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
    await applyImportedRows(rows,{dup,bad,badC,numC,sheet:grid.__sheetIdx>0?grid.__sheet:''});
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
    +(n.dup?` · 값까지 같은 행 ${n.dup}개 포함`:'')
    +(misC>0?` · 예상 효율과 맞지 않는 칸 ${misC}개(${n.bad}행)는 붉게 표시`:'')
    +(n.numC?` · 숫자로 읽을 수 없는 칸 ${n.numC}개는 붉게 표시`:'')
    +` · 저장 대기`;
  progSet(100,'완료');
  await uiTick();
  progClose();
  try{markDirty();saveLocal();}catch(err){}
}
function importLines(f){
  const run=(async file=>{
    let grid;
    const cols=lineColsOf(true);
    try{grid=await readGrid(file,g=>findHeader(g,cols)>=0);}catch(e){
      confirmModal('불러오지 못했습니다.',e.message,()=>{},'확인');return;}
    const hi=findHeader(grid,cols);
    if(hi<0){confirmModal('머리글 줄을 찾지 못했습니다.',
      '템플릿의 머리글(구분 · 매체 · 광고상품 …) 줄이 그대로 있어야 합니다.',()=>{},'확인');return;}
    const keys=mapHeader(grid[hi],cols);
    const typeOf={};LINE_COLS.forEach(c=>typeOf[c.k]=c.type);
    const kpiByLabel={};Object.entries(KPI_LABEL).forEach(([k,v])=>kpiByLabel[v]=k);
    const out=[];
    /* 숫자로 읽을 수 없는 칸 — 0 으로 채우지 않고 비워 둔 뒤 확인 창에 알린다 */
    const badNum=[];
    const hdrOf={};cols.forEach(c=>{hdrOf[c.k]=c.l;});
    for(let i=hi+1;i<grid.length;i++){
      const r=grid[i]||[];
      if(!r.some(v=>String(v||'').trim()!==''))continue;
      const n=blankLine();
      let filled=false,creatives=[],targets=[],products=[],slots=[];
      keys.forEach((k,ci)=>{
        if(!k)return;
        const raw=String(r[ci]==null?'':r[ci]).trim();
        if(raw==='')return;
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
        else if(k==='kpi'){n.kpi=kpiByLabel[raw]||(KPI_KEYS.includes(raw)?raw:n.kpi);}
        else if(t==='date'){n[k]=normDate(raw)||raw;}
        else if(t==='pct'){const v=numOf(raw);if(v!==null)n[k]=v>1?v/100:v;}
        else if(t==='exp'){const v=numOf(raw);if(v!==null)n.e[k.slice(2)]=v;}
        else if(k==='bid'){n.bid=normBid(raw);}
        else if(GUAR_KEY[k]){n.g=n.g||{};n.g[GUAR_KEY[k]]=isYes(raw);}
        else if(t==='gross'){const v=numOf(raw);if(v!==null)n.gross=v;}
        else if(t==='num'){const v=numOf(raw);if(v!==null)n[k]=v;}
        else if(t==='dev'){n.device=raw.split(/[+,\s]+/).filter(Boolean);}
        else n[k]=raw;});
      if(!filled)continue;
      if(!n.bid&&BID_TYPES.length)n.bid='CPM';
      if(BID_KPI[n.bid]&&KPI_KEYS.includes(BID_KPI[n.bid])&&!keys.includes('kpi'))n.kpi=BID_KPI[n.bid];
      n.__cr=creatives;n.__tg=targets;n.__pd=products;n.__sl=slots;
      out.push(n);}
    if(!out.length){confirmModal('가져올 행이 없습니다.','머리글 아래에 데이터가 있는지 확인해 주세요.',()=>{},'확인');return;}
    /* 덧붙임 — 읽은 시트 · 행 한도 · 숫자로 읽을 수 없어 비워 둔 칸 (값은 사용자 데이터라 번역하지 않는다) */
    const extra=gridNotes(grid).map(esc);
    if(badNum.length)extra.push(`숫자로 읽을 수 없는 칸 ${badNum.length}개는 비워 두었습니다.`
      +`<br><span data-noi18n>${badNum.slice(0,5).map(x=>esc(`${x.row}행 ${x.col}: "${x.raw}"`)).join('<br>')}`
      +`${badNum.length>5?'<br>…':''}</span>`);
    confirmModal(`${out.length}개 라인을 불러옵니다.`,
      '지금의 예상 효율 표를 이 내용으로 바꿉니다. 되돌리려면 Ctrl+Z 를 누르세요.'
        +extra.map(x=>'<br><br>'+x).join(''),
      ()=>{
        pushLineUndo();
        LINES=out.map(l=>{const {__cr,__tg,__pd,__sl,...rest}=l;return rest;});
        CREATIVES=CREATIVES.filter(()=>false);
        /* 소재를 만들기 **전에** 캠페인 기간부터 잡는다 —
           그래야 소재 게재 기간이 캠페인 전체로 잡힌다 */
        rebuildPeriod();
        LINES.forEach((l,i)=>{
          const src=out[i];
          if(src.__pd.length)setLineProducts(l,src.__pd);
          if(src.__sl.length)setLineSlots(l,src.__sl);
          if(src.__tg.length)setLineTargets(l,src.__tg);
          if(src.__cr.length)setLineCreatives(l,src.__cr);});
        rebuildPeriod();buildFacts();
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
