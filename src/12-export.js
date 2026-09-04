/* ===== 14. 대시보드 → 엑셀 =====
   효율 · 일자별 상세 효율 · 미디어믹스를 각각 시트로 만든다.
   셀 병합 · 배경색 · 숫자 서식은 살리고, 차트는 그림으로 붙인다. */

/* ---------- 여러 시트 · 병합 · 그림을 담는 통합 작성기 ---------- */
/* 스타일 번호
   0 기본 / 1 제목 / 2 안내 / 3 소제목
   4 헤더(짙은) / 5 그룹헤더 / 6 행헤더 / 7 소계행 / 8 합계행
   10 숫자 / 11 통화 / 12 퍼센트 / 13 텍스트(가운데) / 14 텍스트(왼쪽)
   20 합계 숫자 / 21 합계 통화 / 22 합계 퍼센트
   30 소계 숫자 / 31 소계 통화 / 32 소계 퍼센트                       */
const XL_STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="#,##0"/>
<numFmt numFmtId="165" formatCode="&quot;₩&quot;#,##0"/>
<numFmt numFmtId="166" formatCode="0.0%"/>
<numFmt numFmtId="167" formatCode="0.00%"/>
</numFmts>
<fonts count="9">
<font><sz val="10.5"/><color rgb="FF1E2A38"/><name val="맑은 고딕"/></font>
<font><b/><sz val="15"/><color rgb="FF1E2A38"/><name val="맑은 고딕"/></font>
<font><sz val="9.5"/><color rgb="FF5A6878"/><name val="맑은 고딕"/></font>
<font><b/><sz val="12"/><color rgb="FF3C4957"/><name val="맑은 고딕"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="맑은 고딕"/></font>
<font><b/><sz val="10.5"/><color rgb="FF354758"/><name val="맑은 고딕"/></font>
<font><b/><sz val="10.5"/><color rgb="FF1E2A38"/><name val="맑은 고딕"/></font>
<font><sz val="10.5"/><color rgb="FF5A6878"/><name val="맑은 고딕"/></font>
<font><sz val="10.5"/><color rgb="FFB8665F"/><name val="맑은 고딕"/></font>
</fonts>
<fills count="9">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF3C4957"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4B5966"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF28313B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7ECF2"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFBFCFE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE2E7EE"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8DEE6"/></left><right style="thin"><color rgb="FFD8DEE6"/></right><top style="thin"><color rgb="FFD8DEE6"/></top><bottom style="thin"><color rgb="FFD8DEE6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="35">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="167" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="167" fontId="5" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="8" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="8" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="166" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="8" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="166" fontId="8" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="167" fontId="8" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="164" fontId="5" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="5" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="166" fontId="5" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="7" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs></styleSheet>`;
const EMU=9525;   /* 1px = 9525 EMU */
/* sheets: [{name, rows, widths, merges:[{r1,c1,r2,c2}], images:[{png:Uint8Array,w,h,row,col}]}] */
function buildWorkbook(sheets){
  const files=[],media=[];
  let imgN=0;
  const sheetXml=sheets.map((sh,si)=>{
    const rowsXml=sh.rows.map((r,ri)=>{
      const cells=(r||[]).map((c,ci)=>{
        if(c==null)return '';
        const ref=colName(ci)+(ri+1);
        const st=c.s?` s="${c.s}"`:'';
        /* 값이 비어도 스타일(테두리·배경)이 있으면 셀을 그린다 — 표의 선이 끊기지 않도록 */
        if(c.v===''||c.v==null)return c.s?`<c r="${ref}"${st}/>`:'';
        return c.n
          ? `<c r="${ref}"${st}><v>${Number(c.v)}</v></c>`
          : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;}).join('');
      /* 빈 행도 행 레코드를 남겨야 그림 위치(행 기준)가 밀리지 않는다 */
      return `<row r="${ri+1}"${r&&r.__h?` ht="${r.__h}" customHeight="1"`:''}>${cells}</row>`;}).join('');
    const cols=(sh.widths&&sh.widths.length)
      ? `<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:'';
    const merges=(sh.merges&&sh.merges.length)
      ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m=>
          `<mergeCell ref="${colName(m.c1)}${m.r1+1}:${colName(m.c2)}${m.r2+1}"/>`).join('')}</mergeCells>`:'';
    let drawing='';
    if(sh.images&&sh.images.length){
      const dn=si+1;
      drawing=`<drawing r:id="rIdD"/>`;
      const anchors=sh.images.map((im,k)=>{
        media.push({idx:++imgN,png:im.png});
        /* oneCellAnchor + ext — 셀 크기와 무관하게 원본 비율 그대로 놓인다
           (twoCellAnchor 로 같은 셀에 오프셋을 주면 엑셀에서 그림이 눌린다) */
        const cx=Math.round(im.w*EMU),cy=Math.round(im.h*EMU);
        return `<xdr:oneCellAnchor>`
          +`<xdr:from><xdr:col>${im.col||0}</xdr:col><xdr:colOff>0</xdr:colOff>`
          +`<xdr:row>${im.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
          +`<xdr:ext cx="${cx}" cy="${cy}"/>`
          +`<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${imgN}" name="chart${imgN}"/><xdr:cNvPicPr/></xdr:nvPicPr>`
          +`<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${k+1}"/>`
          +`<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
          +`<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`
          +`<xdr:clientData/></xdr:oneCellAnchor>`;});
      files.push({name:`xl/drawings/drawing${dn}.xml`,data:enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join('')}</xdr:wsDr>`)});
      files.push({name:`xl/drawings/_rels/drawing${dn}.xml.rels`,data:enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        +sh.images.map((im,k)=>`<Relationship Id="rId${k+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${imgN-sh.images.length+k+1}.png"/>`).join('')
        +`</Relationships>`)});
      files.push({name:`xl/worksheets/_rels/sheet${si+1}.xml.rels`,data:enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdD" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${dn}.xml"/></Relationships>`)});
    }
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="0"${si===0?' tabSelected="1"':''}/></sheetViews>${cols}<sheetData>${rowsXml}</sheetData>${merges}${drawing}</worksheet>`;
  });
  media.forEach(m=>files.push({name:`xl/media/image${m.idx}.png`,data:m.png}));
  sheetXml.forEach((x,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:enc(x)}));
  files.push({name:'xl/styles.xml',data:enc(XL_STYLES)});
  files.push({name:'xl/workbook.xml',data:enc(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`
    +sheets.map((sh,i)=>`<sheet name="${xe(sh.name).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')
    +`</sheets></workbook>`)});
  files.push({name:'xl/_rels/workbook.xml.rels',data:enc(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    +sheets.map((sh,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')
    +`<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  files.push({name:'_rels/.rels',data:enc(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)});
  files.push({name:'[Content_Types].xml',data:enc(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    +sheets.map((sh,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    +sheets.map((sh,i)=>sh.images&&sh.images.length?`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`:'').join('')
    +`<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)});
  return zipStore(files);
}

/* ---------- SVG 차트를 PNG 로 ---------- */
function svgToPng(svg,scale){
  return new Promise(res=>{
    try{
      const cl=svg.cloneNode(true);
      let vb=(cl.getAttribute('viewBox')||'0 0 900 400').split(/\s+/).map(Number);
      /* 글자가 뷰박스 밖으로 나가는 경우가 있어 실제 내용 영역으로 넓혀 잡는다 */
      try{const bb=svg.getBBox();const P=6;
        const x0=Math.min(vb[0],bb.x-P),y0=Math.min(vb[1],bb.y-P);
        const x1=Math.max(vb[0]+vb[2],bb.x+bb.width+P),y1=Math.max(vb[1]+vb[3],bb.y+bb.height+P);
        vb=[x0,y0,x1-x0,y1-y0];
        cl.setAttribute('viewBox',vb.join(' '));}catch(e){}
      const w=Math.round(vb[2]||900),h=Math.round(vb[3]||400);
      cl.setAttribute('width',w);cl.setAttribute('height',h);
      cl.setAttribute('xmlns','http://www.w3.org/2000/svg');
      /* CSS 변수는 그림 안에서 풀리지 않으므로 실제 색으로 바꿔 넣는다 */
      const cs=getComputedStyle(document.documentElement);
      let src=new XMLSerializer().serializeToString(cl)
        .replace(/var\(--([a-z0-9-]+)\)/g,(m,n)=>cs.getPropertyValue('--'+n).trim()||'#495e72');
      const img=new Image();
      const k=scale||2;
      img.onload=()=>{
        const cv=document.createElement('canvas');
        cv.width=w*k;cv.height=h*k;
        const ctx=cv.getContext('2d');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);
        ctx.drawImage(img,0,0,cv.width,cv.height);
        const b64=cv.toDataURL('image/png').split(',')[1];
        const bin=atob(b64),arr=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
        res({png:arr,w,h});};
      img.onerror=()=>res(null);
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
    }catch(e){res(null);}});
}

/* ---------- 화면의 표를 그대로 엑셀 행으로 ---------- */
const XS={hdr:4,ghdr:5,rowhdr:6,sub:7,total:8,num:10,won:11,pct:12,txt:13,left:14,
  pct2:15,tpct2:16,spct2:17,htxt:18,hnum:19,
  tnum:20,twon:21,tpct:22,hwon:23,hpct:24,hpct2:25,
  label:26,val:27,valWon:28,valPct:29,snum:30,swon:31,spct:32,
  blank:33,sblank:34};
/* 휴일(주말·공휴일) 행 — 같은 서식의 붉은 글씨 짝 */
const XL_HOL={10:XS.hnum,11:XS.hwon,12:XS.hpct,13:XS.htxt,15:XS.hpct2,14:XS.htxt,6:XS.htxt};
/* 셀 텍스트를 숫자/통화/퍼센트로 되돌린다 */
function xlCell(txt,role){
  const t=String(txt==null?'':txt).trim();
  if(t===''||t==='–')return {v:'',s:role==='total'?XS.total:role==='sub'?XS.sub:XS.txt};
  const st=(n,w,p)=>role==='total'?(n?XS.tnum:w?XS.twon:XS.tpct)
    :role==='sub'?(n?XS.snum:w?XS.swon:XS.spct)
    :(n?XS.num:w?XS.won:XS.pct);
  /* 퍼센트는 화면에 적힌 소수 자릿수를 그대로 (CTR·VTR 은 2자리) */
  if(/^-?[\d,]+(\.\d+)?%$/.test(t)){
    const dec=((t.match(/\.(\d+)%/)||[,''])[1]||'').length;
    const two=dec>=2;
    const sty=role==='total'?(two?XS.tpct2:XS.tpct):role==='sub'?(two?XS.spct2:XS.spct):(two?XS.pct2:XS.pct);
    return {v:parseFloat(t.replace(/[,%]/g,''))/100,n:1,s:sty};}
  if(/^₩-?[\d,]+(\.\d+)?$/.test(t))return {v:parseFloat(t.replace(/[₩,]/g,'')),n:1,s:st(0,1,0)};
  if(/^-?[\d,]+(\.\d+)?$/.test(t)&&t.length<16)return {v:parseFloat(t.replace(/,/g,'')),n:1,s:st(1,0,0)};
  return {v:t,s:role==='total'?XS.total:role==='sub'?XS.sub:XS.txt};
}
/* DOM 표(table.tbl) → {rows,merges,widths} — rowspan/colspan 을 병합으로 옮긴다 */
function tableToRows(tbl,startRow){
  const rows=[],merges=[];
  const grid=[];
  const trs=[...tbl.querySelectorAll('tr')];
  trs.forEach((tr,ri)=>{
    if(!grid[ri])grid[ri]=[];
    let ci=0;
    [...tr.children].forEach(cell=>{
      while(grid[ri][ci])ci++;
      const rs=+(cell.getAttribute('rowspan')||1), csn=+(cell.getAttribute('colspan')||1);
      const isHead=cell.tagName==='TH';
      const cls=cell.className||'';
      const trCls=tr.className||'';
      const role=trCls.indexOf('total')>=0?'total':trCls.indexOf('sub')>=0?'sub':'';
      let sty;
      if(isHead)sty=cls.indexOf(' g')>=0||cls.indexOf('g ')===0||cell.classList.contains('g')?XS.ghdr:XS.hdr;
      else if(role==='total')sty=XS.total;
      else if(role==='sub')sty=XS.sub;
      else if(cell.classList.contains('head'))sty=XS.rowhdr;
      else sty=null;
      const txt=(cell.innerText||cell.textContent||'').replace(/\s+/g,' ').trim();
      let c=sty===null?xlCell(txt,role):(function(){
        const base=xlCell(txt,role);
        return (base.n&&!isHead)?base:{v:txt,s:sty};})();
      /* 주말·공휴일 셀은 붉은 글씨로 (화면과 동일) */
      if(!isHead&&cell.classList.contains('hol')&&XL_HOL[c.s])c={...c,s:XL_HOL[c.s]};
      /* 값이 없는 칸은 화면과 같이 연한 회색으로 채운다 */
      if(!isHead&&cell.classList.contains('blank')&&role!=='total')
        c={v:'',s:role==='sub'?XS.sblank:XS.blank};
      grid[ri][ci]=c;
      if(rs>1||csn>1)merges.push({r1:startRow+ri,c1:ci,r2:startRow+ri+rs-1,c2:ci+csn-1});
      for(let a=0;a<rs;a++)for(let b=0;b<csn;b++){
        if(!grid[ri+a])grid[ri+a]=[];
        if(!(a===0&&b===0))grid[ri+a][ci+b]={v:'',s:c.s};}
      ci+=csn;});});
  grid.forEach(r=>rows.push(r.map(x=>x||{v:''})));
  const cols=Math.max(...rows.map(r=>r.length),1);
  return {rows,merges,cols};
}

/* ---------- 대시보드 전체 내보내기 ---------- */
/* 모든 시트는 A열(너비 2.5)과 1행을 비워 두고 B2 부터 시작한다 */
function offsetSheet(sh){
  sh.rows=[[]].concat(sh.rows.map(r=>{const n=[null].concat(r||[]);
    if(r&&r.__h)n.__h=r.__h;return n;}));
  sh.merges=(sh.merges||[]).map(m=>({r1:m.r1+1,c1:m.c1+1,r2:m.r2+1,c2:m.c2+1}));
  (sh.images||[]).forEach(im=>{im.row+=1;im.col=(im.col||0)+1;});
  return sh;
}
/* 열 너비 — 내용 길이에 맞춰 자동으로 (한글은 두 칸으로 셈) */
const xlWidth=t=>{let n=0;const s2=String(t==null?'':t);
  for(let i=0;i<s2.length;i++)n+=s2.charCodeAt(i)>127?2:1;return n;};
function autoWidths(sh,opt){
  const mn=(opt&&opt.min)||9,mx=(opt&&opt.max)||34;
  const merged=new Set();
  (sh.merges||[]).forEach(m=>{if(m.c2>m.c1)for(let r=m.r1;r<=m.r2;r++)merged.add(r+':'+m.c1);});
  const w=[];
  sh.rows.forEach((r,ri)=>(r||[]).forEach((c,ci)=>{
    if(!c||c.v===''||c.v==null)return;
    if(c.s===1||c.s===2||c.s===3)return;              /* 제목·안내줄은 길이에서 뺀다 */
    if(merged.has(ri+':'+ci))return;                   /* 가로 병합된 칸도 제외 */
    const t=c.n?fmt(Math.round(c.v))+(String(c.s).match(/^(11|21|31|28|23)$/)?'₩':''):c.v;
    w[ci]=Math.max(w[ci]||0,xlWidth(t));}));
  sh.widths=w.map((x,i)=>i===0?2.5:Math.min(mx,Math.max(mn,(x||6)+3.2)));
  if(!sh.widths.length)sh.widths=[2.5];
  sh.widths[0]=2.5;
  return sh;
}
/* 노출이 있었던 날을 이어붙여 M/D~M/D 구간 문자열로 (쉰 구간이 있으면 쉼표로 나눈다) */
function onAirRanges(c){
  const a=c.daily&&c.daily.imp?c.daily.imp:[];
  const out=[];let st=-1;
  for(let i=0;i<TOTAL_DAYS;i++){
    const on=(a[i]||0)>0;
    if(on&&st<0)st=i;
    if(!on&&st>=0){out.push([st,i-1]);st=-1;}}
  if(st>=0)out.push([st,TOTAL_DAYS-1]);
  return out;
}
const md2=d=>`${d.getMonth()+1}/${d.getDate()}`;
const onAirText=c=>{
  const r=onAirRanges(c);
  if(!r.length)return '–';
  return r.map(([a,b])=>`${md2(ALLDATES[a])}~${md2(ALLDATES[b])}`).join(', ');
};
async function exportDashboard(){
  const btn=$('reportBtn');
  /* 아이콘이 들어 있으므로 글자만 바꾼다 */
  const lb=btn?btn.querySelector('span'):null;
  const label=lb?lb.textContent:'';
  if(btn){btn.disabled=true;if(lb)lb.textContent='만드는 중…';}
  try{
    const sc=viewScope(),pr=paceRatio(),ps=paceScope();
    const T=(v,s)=>({v,s:s||0});
    const push=(rows,arr)=>rows.push(arr);
    const blank=rows=>rows.push([]);

    /* ---- 시트 1 · 서머리 ---- */
    const s1={name:'서머리',rows:[],merges:[],images:[]};
    const R=s1.rows;
    push(R,[T(`${CAMPAIGN.name} — 대시보드 리포트`,1)]);
    push(R,[T(`내려받은 시각 ${dFull(new Date())}`,2)]);
    blank(R);

    /* ---- 캠페인 집행 현황 (라벨 · 값 카드형) ---- */
    const b=aggFacts(paceFacts()),budget=sum(activeLines().map(lineGross));
    /* 화면의 캠페인 진행 현황과 같은 기준 — 각 라인이 자기 KPI 로 쌓은 실적 합 ÷ 목표 합 */
    const kr=paceKpiRows();
    const kAct=sum(kr.map(x=>x.act)),kGoal=sum(kr.map(x=>x.goal));
    const allAch=kGoal?kAct/kGoal:0;
    push(R,[T('캠페인 집행 현황',3)]);
    const info=[
      ['캠페인명',{v:CAMPAIGN.name,s:XS.val}],
      ['광고주',{v:CAMPAIGN.advertiser||'–',s:XS.val}],
      ['집행 기간',{v:`${campStart()} ~ ${campEnd()}  (${ps.days}일)`,s:XS.val}],
      ['조회 기간',{v:`${sc.startIso} ~ ${sc.endIso}`,s:XS.val}],
      ['집행 경과',{v:`${ps.elapsed}일차 / ${ps.days}일`,s:XS.val}],
      ['총 광고비 (Gross)',{v:budget,n:1,s:XS.valWon}],
      ['소진 광고비',{v:b.cost,n:1,s:XS.valWon}],
      ['목표 달성 수치',{v:kAct,n:1,s:XS.val}],
      ['종합 목표',{v:kGoal,n:1,s:XS.val}],
      ['종합 KPI 달성률',{v:allAch,n:1,s:XS.valPct}],
      ['목표 페이스',{v:pr,n:1,s:XS.valPct}]
    ];
    info.forEach(([k,v])=>{
      const r0=R.length;
      push(R,[T(k,XS.label),v,{v:'',s:v.s},{v:'',s:v.s}]);
      s1.merges.push({r1:r0,c1:1,r2:r0,c2:3});});
    blank(R);

    /* KPI 달성 현황은 리포트에 넣지 않는다 (화면에서만 본다) */

    /* ---- 일자별 효율 비교 — 차트 그림 ---- */
    const chartSvg=document.querySelector('#chartDaily svg');
    const pic=chartSvg?await svgToPng(chartSvg,1.6):null;
    if(pic){
      push(R,[T('일자별 효율 비교',3)]);
      blank(R);blank(R);blank(R);
      const at=R.length;
      for(let i=0;i<Math.ceil(pic.h*0.62/18)+1;i++){const rr=[];rr.__h=13.5;push(R,rr);}
      s1.images.push({png:pic.png,w:pic.w*0.62,h:pic.h*0.62,row:at,col:0});
      blank(R);}

    /* ---- 서머리 표 — 화면 표 그대로 (병합·색·숫자 서식 유지) ---- */
    document.querySelectorAll('#summaryHost .sec').forEach(sec=>{
      const card=sec.nextElementSibling&&sec.nextElementSibling.nextElementSibling;
      const tbl=card?card.querySelector('table.tbl'):null;
      if(!tbl)return;
      push(R,[T(sec.textContent.replace(/숨기기|⚙ 헤더 편집|서머리 삭제/g,'').trim(),3)]);
      const g=tableToRows(tbl,R.length);
      g.rows.forEach(r=>R.push(r));
      s1.merges.push(...g.merges);
      blank(R);});

    /* ---- 소재별 효율 (달력 대신 온에어 기간을 M/D~M/D 로) ---- */
    const crs=filteredCreatives(),mrg=s1.merges;
    if(crs.length){
      push(R,[T('소재별 효율',3)]);
      push(R,[T('온에어 기간은 노출이 발생한 날 기준입니다. 중간에 쉰 구간이 있으면 쉼표로 나눠 적습니다.',2)]);
      const dims=GANTT.rows.map(r=>r.k);
      const mcols=cfgCols(GANTT);
      push(R,dims.map(k=>T((DIMS.find(d=>d.k===k)||{l:k}).l,XS.hdr))
        .concat(mcols.map(k=>T(GANTT_DEF[k].l,XS.hdr)))
        .concat([T('온에어 기간',XS.hdr)]));
      /* 화면과 같은 순서 — 예산이 큰 매체·소재가 위로 */
      const sorted=crs.slice().sort((a,b)=>{
        for(let i=0;i<dims.length;i++){
          const va=dims[i]==='creative'?a.name:a[dims[i]],vb=dims[i]==='creative'?b.name:b[dims[i]];
          const ra=ganttRank(dims[i],va,a),rb=ganttRank(dims[i],vb,b);
          if(ra!==null&&rb!==null&&ra!==rb)return rb-ra;
          if(va!==vb)return String(va).localeCompare(String(vb),'ko');}
        return 0;});
      /* 매체·광고상품처럼 같은 값이 이어지는 앞쪽 열은 세로로 병합한다 */
      const keys=sorted.map(c=>dims.map(k=>String(k==='creative'?c.name:(c[k]||''))));
      const span=mergeSpans(keys,dims.length);
      const at0=R.length;
      sorted.forEach((c,ri)=>{
        const days=(c.daily.imp||[]).filter(v=>v>0).length;
        const lead=dims.map((k,ci)=>{
          if(span[ri][ci]>1)mrg.push({r1:at0+ri,c1:ci,r2:at0+ri+span[ri][ci]-1,c2:ci});
          return T(span[ri][ci]===0?'':keys[ri][ci],XS.rowhdr);});
        push(R,lead
          .concat(mcols.map(k=>xlCell(k==='days'?days+'일':crVal(c,k),'')))
          .concat([{v:onAirText(c),s:XS.left}]));});
      blank(R);}

    /* ---- 시트 2 · 일자별 상세 효율 ---- */
    const s2={name:'일자별 상세 효율',rows:[],merges:[]};
    push(s2.rows,[T(`${CAMPAIGN.name} — 일자별 상세 효율`,1)]);
    push(s2.rows,[T(`캠페인 전 기간 ${campStart()} ~ ${campEnd()}   ·   주말·공휴일은 붉은 글씨, `
      +`아직 도래하지 않았거나 실적이 없는 날은 빈 칸입니다.`,2)]);
    blank(s2.rows);
    /* 캠페인 시작일 ~ 종료일 전체를 행으로 (도래하지 않은 날짜는 빈 칸) */
    RAW_ALLDAYS=true;renderRaw();
    document.querySelectorAll('#rawHost .rawblock').forEach(blk=>{
      const ttl=blk.querySelector('.subsec');
      if(ttl)push(s2.rows,[T(ttl.textContent.replace(/\s+/g,' ').trim(),3)]);
      blk.querySelectorAll('table.tbl').forEach(tbl=>{
        const g=tableToRows(tbl,s2.rows.length);
        g.rows.forEach(r=>s2.rows.push(r));
        s2.merges.push(...g.merges);});
      blank(s2.rows);});
    RAW_ALLDAYS=false;renderRaw();

    /* ---- 시트 3 · 미디어믹스 ---- */
    const s3={name:'미디어믹스',rows:[],merges:[]};
    push(s3.rows,[T(`${CAMPAIGN.name} — 미디어믹스 (예상 효율 기준)`,1)]);
    push(s3.rows,[T(`집행 기간 ${campStart()} ~ ${campEnd()}   ·   Gross ${won(sum(LINES.map(lineGross)))}   ·   Value ${won(sum(LINES.map(lineValue)))}`,2)]);
    blank(s3.rows);
    renderMix();
    const mtbl=$('tblMix');
    if(mtbl){const g=tableToRows(mtbl,s3.rows.length);
      g.rows.forEach(r=>s3.rows.push(r));
      s3.merges.push(...g.merges);}

    [s1,s2,s3].forEach(sh=>{offsetSheet(sh);autoWidths(sh);});
    s1.rows[0]=[];                       /* 1행은 비워 둔다 */
    const bytes=buildWorkbook([s1,s2,s3]);
    saveFile(bytes,`대시보드_${CAMPAIGN.name.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_')}_${sc.startIso}~${sc.endIso}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }catch(err){
    confirmModal('엑셀을 만들지 못했습니다.',String(err&&err.message||err),()=>{},'확인');
  }finally{
    if(btn){btn.disabled=false;if(lb)lb.textContent=label||'엑셀';}}
}
/* ---------- PDF 리포트 ----------
   화면을 그대로 인쇄하면 스크롤 상자·고정 머리글·가로로 긴 표가 종이 위에서 어긋난다.
   그래서 인쇄할 때는 화면을 건드리지 않고 **인쇄 전용 문서(#printdoc)** 를 따로 만든다.
   · 영역마다 복제본을 넣고, 그 영역의 원래 폭을 픽셀로 고정한 뒤 zoom 으로 종이 폭에 맞춘다
     → 종이 위에서 다시 흐르지 않으므로 화면과 같은 배치가 그대로 나온다
   · 조작 항목(버튼·선택·숨기기·ⓘ)과 시행사 전용 항목은 빼서 광고주가 보는 모습으로 만든다
   · 일자별 상세 효율만 제외하고 미디어믹스까지 담는다
   · beforeprint 에서 만들기 때문에 버튼을 눌러도, Ctrl+P 로 인쇄해도 똑같이 나온다 */
const PRINT_W=1010;          /* A4 가로 · 여백 9mm 기준 실제 폭(px) */
const PRINT_H=690;           /* 한 장에 들어가는 높이 — 이보다 크면 페이지를 넘겨서 이어 그린다 */
function printHost(){
  let h=$('printdoc');
  if(!h){h=document.createElement('div');h.id='printdoc';document.body.appendChild(h);}
  return h;
}
/* 복제본에서 조작 항목과 화면 전용 장치를 걷어낸다.
   그래프 안의 id(그라데이션·곡선 경로)는 지우면 안 된다 — 지우면 url(#..) 참조가 끊겨
   달성률 호가 통째로 사라지고 뒤의 붉은 페이스 호만 남는다. 대신 새 이름으로 바꿔 준다. */
let PRINT_UID=0;
function remapSvgIds(root){
  root.querySelectorAll('svg').forEach(svg=>{
    const map={};
    svg.querySelectorAll('[id]').forEach(e=>{
      const old=e.id, nw='p'+(++PRINT_UID);map[old]=nw;e.id=nw;});
    if(!Object.keys(map).length)return;
    svg.querySelectorAll('*').forEach(e=>{
      [...e.attributes].forEach(a=>{
        let v=a.value;
        if(v.indexOf('#')<0)return;
        Object.keys(map).forEach(o=>{
          v=v.split('url(#'+o+')').join('url(#'+map[o]+')').split('#'+o+'"').join('#'+map[o]+'"');
          if(a.name==='href'||a.name==='xlink:href'){if(v==='#'+o)v='#'+map[o];}});
        if(v!==a.value)e.setAttribute(a.name,v);});});});
}
function cleanPrintNode(root){
  root.querySelectorAll('.tools,.hidebtn,.infowrap,.agency-only,.hnav,.ghfix,.colgrip,'
    +'button,select,input,.switch,.barlbl.row').forEach(e=>e.remove());
  /* 코멘트 입력칸은 적힌 내용만 남긴다 */
  root.querySelectorAll('textarea,[contenteditable]').forEach(e=>{
    const txt=(e.value!==undefined?e.value:e.innerHTML)||'';
    const d=document.createElement('div');d.className='cmtprint';
    d.innerHTML=e.value!==undefined?esc(txt).replace(/\n/g,'<br>'):txt;
    e.replaceWith(d);});
  root.querySelectorAll('*').forEach(e=>{
    if(e.namespaceURI&&e.namespaceURI.indexOf('svg')>=0)return;   /* 그래프 내부는 그대로 */
    const st=getComputedStyle(e);
    if(st.position==='sticky'||st.position==='fixed'){e.style.position='static';e.style.top='auto';e.style.left='auto';}
    if(st.overflowX!=='visible'||st.overflowY!=='visible')e.style.overflow='visible';
    if(st.maxHeight&&st.maxHeight!=='none')e.style.maxHeight='none';
    e.style.animation='none';
    if(e.id)e.removeAttribute('id');});
  remapSvgIds(root);
  return root;
}
/* 제목(.sec) 하나와 그 아래 딸린 카드들을 한 덩어리로 묶는다 */
function printBlocks(container){
  const out=[];let cur=null;
  [...container.children].forEach(node=>{
    if(node.classList.contains('hidden'))return;
    if(!node.offsetParent&&getComputedStyle(node).display==='none')return;
    if(node.classList.contains('barlbl'))return;          /* 필터 줄 */
    if(node.classList.contains('sec')){cur=[node];out.push(cur);return;}
    if(!cur){cur=[];out.push(cur);}
    cur.push(node);});
  return out.filter(g=>g.length);
}
function buildPrintDoc(){
  const host=printHost();
  host.innerHTML='';
  /* 재는 동안에는 화면 밖에 펼쳐 둔다 */
  host.className='measuring';
  const W=Math.max(($('sub-perf')||document.body).getBoundingClientRect().width,900);
  host.style.width=W+'px';
  const head=document.createElement('div');
  head.className='phdr';
  const sc=viewScope();
  head.innerHTML=`<div class="t">${esc(CAMPAIGN.name)}</div>`
    +`<div class="s">${esc(CAMPAIGN.advertiser||'')}${CAMPAIGN.advertiser?' · ':''}`
    +`조회 기간 ${sc.startIso} ~ ${sc.endIso} · 출력 ${iso(new Date())}</div>`;
  host.appendChild(head);
  const groups=[];
  const perf=$('sub-perf'); if(perf)printBlocks(perf).forEach(g=>groups.push(g));
  const mix=$('sub-mix');   if(mix) printBlocks(mix).forEach(g=>groups.push(g));
  groups.forEach(g=>{
    const bk=document.createElement('div');bk.className='pbk';
    const inner=document.createElement('div');inner.className='pbki';
    inner.style.width=W+'px';
    g.forEach(n=>inner.appendChild(cleanPrintNode(n.cloneNode(true))));
    bk.appendChild(inner);host.appendChild(bk);});
  /* 실제 크기를 재서 종이 폭에 맞춘다 */
  host.querySelectorAll('.pbk').forEach(bk=>{
    const inner=bk.firstElementChild;
    /* 가로로 흘러넘치는 것(KPI 카드 줄 · 넓은 표 · 간트)은 scrollWidth 만으로는 안 잡힌다.
       실제 오른쪽 끝까지 재서 그 폭에 맞춰 줄인다 */
    let nw=Math.max(inner.scrollWidth,W);
    const x0=inner.getBoundingClientRect().left;
    inner.querySelectorAll('table,.grid,.strip,.crcols,.tmap,svg,.dgauge,.pacebody').forEach(e=>{
      const w=Math.max(e.scrollWidth||0,Math.ceil(e.getBoundingClientRect().right-x0));
      if(w>nw)nw=w;});
    const k=Math.min(1,PRINT_W/nw);
    inner.style.width=nw+'px';
    bk.style.zoom=k.toFixed(4);
    /* 한 장을 넘는 덩어리는 잘라서 이어 그린다 (안 그러면 통째로 다음 장으로 밀린다) */
    bk.style.breakInside=(inner.scrollHeight*k>PRINT_H)?'auto':'avoid';});
  host.className='';
  return host;
}
function clearPrintDoc(){const h=$('printdoc');if(h)h.innerHTML='';}
/* 인쇄 직전에 항상 새로 만든다 — 버튼으로 눌러도, Ctrl+P 로 눌러도 같은 결과 */
addEventListener('beforeprint',()=>{try{buildPrintDoc();}catch(e){}});
addEventListener('afterprint',()=>{setTimeout(clearPrintDoc,300);});
function exportPdfReport(){
  const b=$('pdfBtn');
  if(b)b.disabled=true;
  /* 미디어믹스는 한 번도 열지 않았으면 아직 안 그려져 있다 */
  try{renderMix();}catch(e){}
  try{if($('sub-perf').classList.contains('hidden')){
    const go=document.querySelector('#subbar button[data-sub="perf"]');if(go)go.click();}}catch(e){}
  setTimeout(()=>{
    try{buildPrintDoc();}catch(e){}
    try{print();}catch(e){}
    setTimeout(()=>{if(b)b.disabled=false;},600);
  },260);
}
(function(){const b=$('reportBtn');if(b)b.onclick=exportDashboard;
  const p2=$('pdfBtn');if(p2)p2.onclick=exportPdfReport;})();

/* =========================================================================
   테마 색상 · 광고주 브랜딩
   ========================================================================= */
/* 고를 수 있는 색 계열 — CSS 의 [data-theme=…] 와 짝을 이룬다 */
const THEMES=[
  {k:'',       l:'남색 (기본)', sw:['#495e72','#8fb0cc','#eef1f5']},
  {k:'red',    l:'붉은 톤',     sw:['#8f4a44','#c39894','#f5eeed']},
  {k:'orange', l:'주황 톤',     sw:['#9a5f2b','#c8a683','#f6f0e9']},
  {k:'mustard',l:'머스타드 톤', sw:['#8a7a24','#bdb37c','#f4f1e4']},
  {k:'green',  l:'그린 톤',     sw:['#3c6b53','#8aa898','#ecf2ee']},
  {k:'pink',   l:'핑크 톤',     sw:['#8d4468','#c294ab','#f6eef3']},
  {k:'mono',   l:'무채색 화이트', sw:['#4b5257','#969ba0','#f2f3f4']},
  {k:'dark',   l:'무채색 다크',  sw:['#8fb0cc','#5f7488','#171a1d']}
];
let THEME='';
/* 그래프는 자바스크립트로 그리므로 테마가 바뀌면 색 값을 다시 읽어 온다.
   효율 히트맵(HM_GOOD/MID/BAD)만은 손대지 않는다 — 잘 됨·안 됨을 뜻하는 색이라서. */
function syncThemeColors(){
  const v=n=>cssVar(n)||'';
  ACC=v('--acc')||ACC; ACC2=v('--acc2')||ACC2; GRAY=v('--gray')||GRAY;
  PACE=v('--pace')||PACE; PACE_LT=v('--pace-lt')||PACE_LT;
  AXIS.fill=v('--muted')||AXIS.fill;
  if(typeof DONUT_TRACK!=='undefined')DONUT_TRACK=v('--gline')||DONUT_TRACK;
  if(typeof PACE_SEG!=='undefined')PACE_SEG=[v('--b5'),v('--b4'),v('--b3'),v('--b2'),v('--b1')]
    .map((x,i)=>x||PACE_SEG[i]);
  if(typeof PACE_TONE!=='undefined')PACE_TONE=v('--acc')||PACE_TONE;
  if(typeof SHADE_LOW!=='undefined'){SHADE_LOW=cssRgb(v('--acc-soft')||'#e7ecf1');
    SHADE_HIGH=cssRgb(v('--b3')||'#4c729a');}
  /* 버블 색상표 — 첫 색만 테마 강조색으로 바꾸고 나머지는 계열을 유지한다 */
  if(typeof BUB_HUES!=='undefined')BUB_HUES[0]=cssRgb(v('--acc')||'#3a668c');
  /* KPI 달성 현황 게이지 · 일자별 효율 비교 꺾은선도 테마 색으로 */
  if(typeof KPI_RING!=='undefined')KPI_RING=[v('--acc')||KPI_RING[0],v('--acc2')||KPI_RING[1],v('--b2')||KPI_RING[2]];
  if(typeof LINE_TONE!=='undefined')LINE_TONE=v('--acc2')||LINE_TONE;
  /* 운영 코멘트 강조색 · 히트맵 배경은 CSS 변수로 처리한다 */
}
function applyTheme(k,quiet){
  THEME=THEMES.some(t=>t.k===k)?k:'';
  if(THEME)document.documentElement.setAttribute('data-theme',THEME);
  else document.documentElement.removeAttribute('data-theme');
  syncThemeColors();
  try{refreshBgDots();}catch(e){}
  if(quiet)return;
  try{renderAll();renderCreatives();renderGantt();renderKpiTable&&renderKpiTable();}catch(e){}
  try{saveLocal();markDirty();}catch(e){}
}
function openThemePicker(){
  const card=t=>`<button class="thcard${t.k===THEME?' on':''}" data-th="${t.k}">
      <span class="sws">${t.sw.map(c=>`<i style="background:${c}"></i>`).join('')}</span>
      <span class="thl">${t.l}</span></button>`;
  openModal('디자인 — 테마 색상',
    `<div class="hint" style="margin-bottom:12px">이 캠페인 대시보드 전체(배경 · 강조색 · 표 · 그래프)의 색 계열을 바꿉니다.
       광고주도 같은 색으로 봅니다.<br>
       <b>효율 히트맵</b>(잘 된 곳 초록 · 저조한 곳 붉은색)은 뜻이 정해진 색이라 테마와 무관하게 그대로 둡니다.</div>
     <div class="thgrid">${THEMES.map(card).join('')}</div>`,
    '<button class="btn" data-close>닫기</button>',{w:660});
  $('modalHost').querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{
    applyTheme(b.dataset.th);
    $('modalHost').querySelectorAll('[data-th]').forEach(x=>x.classList.toggle('on',x.dataset.th===THEME));});
}

/* ---------- 광고주 · 로고 ----------
   광고주마다 로고를 한 번 등록해 두면 그 광고주의 캠페인을 열 때 좌상단에 함께 보인다. */
let ADV_BOOK={};                        /* { 광고주명: {logo:dataURL} } */
const ADV_KEY='dmd:advbook';
function loadAdvBook(){try{ADV_BOOK=JSON.parse(localStorage.getItem(ADV_KEY)||'{}')||{};}catch(e){ADV_BOOK={};}}
function saveAdvBook(){try{localStorage.setItem(ADV_KEY,JSON.stringify(ADV_BOOK));}catch(e){}}
/* 지금까지 쓴 광고주 이름 — 내 캠페인 목록 + 로고를 등록해 둔 이름 */
function advNames(){
  const s=new Set(Object.keys(ADV_BOOK));
  try{(CLOUD.list||[]).forEach(c=>{if(c.advertiser)s.add(c.advertiser);});}catch(e){}
  if(CAMPAIGN.advertiser)s.add(CAMPAIGN.advertiser);
  return [...s].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
}
const advLogo=n=>(ADV_BOOK[n]&&ADV_BOOK[n].logo)||'';
/* 좌상단 — [광고주 로고] 광고주명 · Digital Media Dashboard */
function renderBrand(){
  const mark=$('brandMark'),nm=$('brandAdv');
  if(!mark||!nm)return;
  const adv=CAMPAIGN.advertiser||'';
  const logo=CAMPAIGN.advLogo||advLogo(adv);
  const isDMD=!adv||/^digital media dashboard$/i.test(adv);
  if(logo){mark.src=logo;mark.classList.add('adv');mark.alt=adv;}
  else{mark.src=DMD_MARK;mark.classList.remove('adv');mark.alt='DmD';}
  nm.hidden=isDMD;nm.textContent=isDMD?'':adv;
  try{refreshBgDots();tuneTopbarForLogo();}catch(e){}
}
let DMD_MARK='';
/* 이미지 파일 → 데이터 URL (가로세로 1:1 ~ 3:1 만 받는다) */
function pickLogo(cb){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/png,image/jpeg,image/svg+xml,image/webp';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    if(f.size>3*1024*1024){confirmModal('파일이 큽니다.','로고는 3MB 이하로 올려 주세요.',()=>{},'확인');return;}
    const rd=new FileReader();
    rd.onload=()=>{
      const url=String(rd.result||'');
      const im=new Image();
      im.onload=()=>{
        const r=im.width/Math.max(im.height,1);
        if(r<0.95||r>3.05){
          confirmModal('가로세로 비율이 맞지 않습니다.',
            `로고는 1:1 부터 3:1 까지 등록할 수 있습니다. (지금 ${r.toFixed(2)}:1)`,()=>{},'확인');return;}
        cb(url);};
      im.onerror=()=>cb(url);
      im.src=url;};
    rd.readAsDataURL(f);};
  inp.click();
}
/* 광고주 고르기 UI — 기존 광고주 드롭다운 + 새 광고주 직접 입력 + 로고 */
function advPickerHTML(cur,logo){
  const names=advNames();
  return `<div class="fld" style="flex:1;min-width:200px"><label>광고주</label>
      <select id="advSel">
        ${names.map(n=>`<option ${n===cur?'selected':''}>${esc(n)}</option>`).join('')}
        <option value="__new" ${names.includes(cur)?'':'selected'}>＋ 새 광고주 직접 입력</option>
      </select></div>
    <div class="fld" id="advNewFld" style="flex:1;min-width:180px"><label>새 광고주명</label>
      <input id="advNew" placeholder="예: OO전자" value="${names.includes(cur)?'':esc(cur||'')}"></div>
    <div class="fld" style="flex:0 0 100%"><label>광고주 로고 <span class="hint">(선택 · 가로세로 1:1 ~ 3:1 · 높이는 자동으로 맞춰집니다)</span></label>
      <div class="logopick">
        <span class="prev" id="advPrev">${logo?`<img src="${logo}" alt="">`:'<em>없음</em>'}</span>
        <button class="btn sm" id="advPick" type="button">이미지 선택</button>
        <button class="btn sm" id="advClear" type="button">지우기</button>
      </div></div>`;
}
function wireAdvPicker(state){
  const sel=$('advSel'),nf=$('advNewFld');
  /* 광고주와 로고는 한 세트 — 광고주를 고르면 그 광고주의 로고가 따라오고,
     로고를 바꾸면 그 광고주의 로고로 저장된다 */
  const nameNow=()=>(sel.value==='__new'?($('advNew').value||'').trim():sel.value)||'';
  const paint=()=>{const p=$('advPrev');
    p.innerHTML=state.logo?`<img src="${state.logo}" alt="">`:'<em>없음</em>';
    const t=$('advSetNote');
    if(t)t.textContent=nameNow()?`“${nameNow()}” 광고주의 로고로 저장됩니다`:'광고주를 먼저 골라 주세요';};
  const sync=()=>{const isNew=sel.value==='__new';nf.style.display=isNew?'':'none';
    state.logo=isNew?(advLogo(($('advNew').value||'').trim())||state.logo||''):(advLogo(sel.value)||'');
    paint();};
  sel.onchange=sync;
  const nv=$('advNew');if(nv)nv.oninput=()=>{const g=advLogo(nv.value.trim());if(g)state.logo=g;paint();};
  sync();
  $('advPick').onclick=()=>pickLogo(u=>{state.logo=u;
    const n=nameNow();if(n){ADV_BOOK[n]=ADV_BOOK[n]||{};ADV_BOOK[n].logo=u;saveAdvBook();}
    paint();});
  $('advClear').onclick=()=>{state.logo='';
    const n=nameNow();if(n&&ADV_BOOK[n]){ADV_BOOK[n].logo='';saveAdvBook();}
    paint();};
  return ()=>({name:nameNow(),logo:state.logo});
}
function openAdvEditor(){
  const st={logo:CAMPAIGN.advLogo||advLogo(CAMPAIGN.advertiser)||''};
  openModal('광고주 · 로고',
    `<div class="hint" style="margin-bottom:10px">로고를 등록하면 이 캠페인 대시보드 왼쪽 위에
       <b>로고 · 광고주명 · Digital Media Dashboard</b> 순서로 함께 보입니다.</div>
     <div class="form-row">${advPickerHTML(CAMPAIGN.advertiser,st.logo)}</div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="advGo">적용</button>',{w:620});
  const read=wireAdvPicker(st);
  $('advGo').onclick=()=>{
    const v=read();
    if(v.name){CAMPAIGN.advertiser=v.name;
      ADV_BOOK[v.name]=ADV_BOOK[v.name]||{};ADV_BOOK[v.name].logo=v.logo||'';saveAdvBook();}
    CAMPAIGN.advLogo=v.logo||'';
    closeModal();renderBrand();renderCampBar();renderCampForm&&renderCampForm();
    try{markDirty();saveLocal();}catch(e){}};
}
(function initBrandTheme(){
  const go=()=>{
    const m=$('brandMark');if(m)DMD_MARK=m.getAttribute('src')||'';
    loadAdvBook();
    const tb=$('themeBtn');if(tb)tb.onclick=openThemePicker;
    applyTheme(THEME,true);renderBrand();};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();

/* ---------- 표 위쪽 가로 스크롤바 ----------
   예상 효율처럼 세로로 긴 표는 스크롤바가 화면 밖 아래에 있어 좌우로 옮기기가 번거롭다.
   같은 폭의 얇은 막대를 표 위에 하나 더 두고 서로 위치를 맞춘다. */
function attachTopScroll(wrap){
  if(!wrap||wrap.dataset.tsc)return;
  wrap.dataset.tsc='1';
  const bar=el('div','topscroll'),inner=el('i','',bar);
  wrap.parentNode.insertBefore(bar,wrap);
  let lock=false;
  const sync=()=>{inner.style.width=wrap.scrollWidth+'px';
    bar.style.display=wrap.scrollWidth>wrap.clientWidth+2?'':'none';};
  bar.addEventListener('scroll',()=>{if(lock)return;lock=true;wrap.scrollLeft=bar.scrollLeft;lock=false;});
  wrap.addEventListener('scroll',()=>{if(lock)return;lock=true;bar.scrollLeft=wrap.scrollLeft;lock=false;});
  new ResizeObserver(sync).observe(wrap);
  const t=wrap.querySelector('table');
  if(t)new MutationObserver(()=>setTimeout(sync,0)).observe(t,{childList:true,subtree:true});
  setTimeout(sync,120);
}
(function initTopScroll(){
  const go=()=>{
    const k=$('tblKpi');if(k)attachTopScroll(k.closest('.tbl-wrap'));
    const sh=$('sheet');if(sh)attachTopScroll(sh.closest('.sheet-wrap'));
    const mx=$('tblMix');if(mx)attachTopScroll(mx.closest('.tbl-wrap'));};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,80);
})();

/* =========================================================================
   배경 — 광고주 로고를 도트 패턴으로 크게 깔고 아주 천천히 움직인다.
   · 로고를 작은 캔버스에 그린 뒤 밝기로 도트 격자를 만든다(글자·형태만 남는다)
   · 색은 테마 강조색, 배경과 다투지 않도록 아주 옅게
   · 크기는 화면(가로)의 약 50% → 넓이 기준 화면의 25% 정도를 차지한다
   ========================================================================= */
const BGDOT={url:'',theme:'',svg:''};
function bgDotBuild(url,cb){
  const im=new Image();
  im.onload=()=>{
    try{
      const GRID=46;                                   /* 가로 도트 개수 */
      const ratio=im.height/Math.max(im.width,1);
      const gh=Math.max(6,Math.round(GRID*ratio));
      const cv=document.createElement('canvas');
      cv.width=GRID;cv.height=gh;
      const cx=cv.getContext('2d',{willReadFrequently:true});
      cx.drawImage(im,0,0,GRID,gh);
      const d=cx.getImageData(0,0,GRID,gh).data;
      const dots=[];
      for(let y=0;y<gh;y++)for(let x=0;x<GRID;x++){
        const i=(y*GRID+x)*4, a=d[i+3]/255;
        if(a<0.25)continue;
        /* 밝기가 낮을수록(=로고의 잉크 부분) 크게 */
        const l=(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255;
        const w=(1-l)*a;
        if(w<0.16)continue;
        dots.push([x,y,(0.16+w*0.34).toFixed(3)]);}
      if(dots.length<14){cb('');return;}
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${gh}">`
        +dots.map(([x,y,r])=>`<circle cx="${x+.5}" cy="${y+.5}" r="${r}" fill="CLR"/>`).join('')
        +'</svg>';
      cb(svg);
    }catch(e){cb('');}};
  im.onerror=()=>cb('');
  im.crossOrigin='anonymous';
  im.src=url;
}
function paintBgDots(svg){
  const host=$('bgdots');if(!host)return;
  const layer=host.querySelector('.bgfloat>i')||host;
  if(!svg){layer.style.backgroundImage='';host.classList.remove('on');return;}
  /* 테마 강조색을 옅게 — 배경 위에서 튀지 않을 만큼만 */
  const c=cssRgb(cssVar('--acc')||'#495e72');
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const col=`rgba(${c[0]},${c[1]},${c[2]},${dark?0.14:0.10})`;
  const url='data:image/svg+xml;utf8,'+encodeURIComponent(svg.replace(/CLR/g,col));
  layer.style.backgroundImage=`url("${url}")`;
  host.classList.add('on');
}
function refreshBgDots(){
  const url=CAMPAIGN.advLogo||advLogo(CAMPAIGN.advertiser)||'';
  const th=document.documentElement.getAttribute('data-theme')||'';
  if(!url){BGDOT.url='';BGDOT.svg='';paintBgDots('');return;}
  if(url===BGDOT.url){if(th!==BGDOT.theme){BGDOT.theme=th;paintBgDots(BGDOT.svg);}return;}
  BGDOT.url=url;BGDOT.theme=th;
  bgDotBuild(url,svg=>{BGDOT.svg=svg;paintBgDots(svg);});
}
/* 로고가 밝으면 상단 바를 짙게 — 흰 배경 위 흰 로고가 안 보이던 문제 */
function tuneTopbarForLogo(){
  const bar=document.querySelector('.topbar');if(!bar)return;
  const url=CAMPAIGN.advLogo||advLogo(CAMPAIGN.advertiser)||'';
  if(!url){bar.classList.remove('darkbar');return;}
  const im=new Image();
  im.onload=()=>{
    try{
      const cv=document.createElement('canvas');cv.width=24;cv.height=24;
      const cx=cv.getContext('2d',{willReadFrequently:true});
      cx.drawImage(im,0,0,24,24);
      const d=cx.getImageData(0,0,24,24).data;
      let lum=0,n=0;
      for(let i=0;i<d.length;i+=4){
        const a=d[i+3]/255;if(a<0.25)continue;
        lum+=(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255;n++;}
      const avg=n?lum/n:0;
      bar.classList.toggle('darkbar',n>0&&avg>0.72);
    }catch(e){bar.classList.remove('darkbar');}};
  im.onerror=()=>bar.classList.remove('darkbar');
  im.crossOrigin='anonymous';
  im.src=url;
}

/* 어떤 이유로든 부팅이 끝나지 않으면 6초 뒤 가림막을 걷는다 (화면이 영영 비어 있지 않도록) */
setTimeout(()=>{try{document.body.classList.remove('booting');}catch(e){}},6000);

/* =========================================================================
   표 머리글을 끌어서 열 순서 바꾸기 (일별 실적 입력 · 예상 효율)
   ========================================================================= */
function enableColDrag(tbl,cols,onDone,off){
  if(!tbl||!tbl.tHead||!tbl.tHead.rows[0])return;
  off=off||0;
  const ths=[...tbl.tHead.rows[0].cells];
  let from=-1;
  const clear=()=>ths.forEach(t=>t.classList.remove('cdrag','cdropL','cdropR'));
  cols.forEach((c,i)=>{
    const th=ths[off+i];if(!th)return;
    th.draggable=true;
    th.classList.add('cmove');
    if(!th.title)th.title='끌어서 열 순서를 바꿀 수 있습니다';
    th.addEventListener('dragstart',e=>{
      /* 너비 조절 손잡이를 잡은 것이면 순서 바꾸기가 아니다 */
      if(e.target.classList&&e.target.classList.contains('colgrip')){e.preventDefault();return;}
      from=i;th.classList.add('cdrag');
      try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','col');}catch(x){}});
    th.addEventListener('dragend',()=>{from=-1;clear();});
    th.addEventListener('dragover',e=>{
      if(from<0||from===i)return;
      e.preventDefault();
      const r=th.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
      th.classList.toggle('cdropR',after);th.classList.toggle('cdropL',!after);});
    th.addEventListener('dragleave',()=>th.classList.remove('cdropL','cdropR'));
    th.addEventListener('drop',e=>{
      if(from<0||from===i)return;
      e.preventDefault();
      const r=th.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
      /* 화면에 보이는 열(cols)의 순서를 원본 배열에서도 그대로 옮긴다 */
      const moved=cols[from];
      let to=i+(after?1:0);
      if(from<to)to--;
      const view=cols.slice();
      view.splice(from,1);view.splice(to,0,moved);
      onDone(view);
      clear();from=-1;});});
}
/* 보이는 열만 담긴 배열(view)의 순서를 전체 열 배열에 반영한다 */
function applyColOrder(all,view){
  const order=view.map(c=>c.k);
  const rest=all.filter(c=>!order.includes(c.k));
  const moved=order.map(k=>all.find(c=>c.k===k)).filter(Boolean);
  /* 숨긴 열은 원래 자리 근처에 그대로 둔다 — 뒤에 붙인다 */
  return moved.concat(rest);
}

/* =========================================================================
   광고주 관리 — 목록 · 로고 · 추가 · 삭제
   내가 만든(= 내 브라우저 장부에 있는) 광고주만 지울 수 있다.
   다른 사람이 만든 캠페인에 붙은 광고주는 목록에 보이되 "다른 계정이 등록" 으로 잠근다.
   ========================================================================= */
function advOwnedByMe(name){
  const rec=ADV_BOOK[name];
  return !!(rec&&rec.mine!==false);
}
/* 그 광고주를 쓰고 있는 캠페인 수 */
function advUseCount(name){
  let n=0;
  try{(CLOUD.list||[]).forEach(c=>{if(c.advertiser===name)n++;});}catch(e){}
  if(CAMPAIGN.advertiser===name&&!n)n=1;
  return n;
}
function openAdvManage(){
  const draw=()=>{
    const names=advNames();
    let h=`<div class="hint" style="margin-bottom:12px">
        광고주마다 로고를 한 번 등록해 두면, 그 광고주의 캠페인을 열 때
        왼쪽 위에 <b>로고 · 광고주명 · Digital Media Dashboard</b> 순서로 함께 보입니다.<br>
        로고는 가로세로 <b>1:1 ~ 3:1</b>, <b>3MB</b> 이하 이미지를 올려 주세요.
        내가 등록한 광고주만 지울 수 있습니다.</div>`;
    if(!names.length)h+='<div class="card" style="padding:22px;text-align:center">아직 등록된 광고주가 없습니다. 아래 <b>＋ 광고주 추가</b>로 시작하세요.</div>';
    else{
      h+=`<table class="tbl lite" style="background:var(--surface);border-radius:10px;overflow:hidden"><thead><tr>
        <th style="width:120px">로고</th><th style="min-width:200px">광고주</th>
        <th style="width:110px">캠페인</th><th style="width:230px"></th></tr></thead><tbody>`;
      names.forEach(n=>{
        const lg=advLogo(n),mine=advOwnedByMe(n),used=advUseCount(n);
        h+=`<tr>
          <td><span class="advprev">${lg?`<img src="${lg}" alt="">`:'<em>없음</em>'}</span></td>
          <td style="text-align:left"><b>${esc(n)}</b>${CAMPAIGN.advertiser===n?' <span class="cnt2">지금 캠페인</span>':''}</td>
          <td class="mono">${used?used+'개':'–'}</td>
          <td class="acts"><div class="ln">
            <button class="btn sm" data-alogo="${esc(n)}">${lg?'로고 변경':'로고 등록'}</button>
            ${lg?`<button class="btn sm" data-aclear="${esc(n)}">로고 삭제</button>`:''}
            <button class="btn sm" data-aren="${esc(n)}">이름 변경</button>
            ${mine?`<button class="btn sm danger" data-adel="${esc(n)}">삭제</button>`
                  :'<span class="hint">다른 계정이 등록</span>'}
          </div></td></tr>`;});
      h+='</tbody></table>';}
    return h;};
  const open=()=>{
    openModal('광고주 관리',draw(),
      '<button class="btn primary" id="advAdd">＋ 광고주 추가</button>'
      +'<div class="spacer"></div><button class="btn" data-close>닫기</button>',{w:840});
    const host=$('modalHost');
    const redraw=()=>{closeModal();open();};
    host.querySelectorAll('[data-alogo]').forEach(b=>b.onclick=()=>{
      const n=b.dataset.alogo;
      pickLogo(u=>{ADV_BOOK[n]=ADV_BOOK[n]||{};ADV_BOOK[n].logo=u;ADV_BOOK[n].mine=true;saveAdvBook();
        if(CAMPAIGN.advertiser===n){CAMPAIGN.advLogo=u;renderBrand();try{markDirty();saveLocal();}catch(e){}}
        redraw();});});
    host.querySelectorAll('[data-aclear]').forEach(b=>b.onclick=()=>{
      const n=b.dataset.aclear;
      if(ADV_BOOK[n]){ADV_BOOK[n].logo='';saveAdvBook();}
      if(CAMPAIGN.advertiser===n){CAMPAIGN.advLogo='';renderBrand();try{markDirty();saveLocal();}catch(e){}}
      redraw();});
    host.querySelectorAll('[data-aren]').forEach(b=>b.onclick=()=>{
      const n=b.dataset.aren;
      openModal('광고주 이름 변경',
        `<div class="fld"><label>새 이름</label><input class="txt" id="advRenNew" value="${esc(n)}" style="width:100%"></div>
         <div class="hint" style="margin-top:9px">이 광고주를 쓰는 캠페인 <b>${advUseCount(n)}개</b>의 표시 이름이 함께 바뀝니다.</div>`,
        '<button class="btn" data-close>취소</button><button class="btn primary" id="advRenGo">바꾸기</button>',{w:460});
      $('advRenGo').onclick=()=>{
        const nv=($('advRenNew').value||'').trim();
        if(!nv||nv===n){closeModal();open();return;}
        ADV_BOOK[nv]={...(ADV_BOOK[n]||{}),mine:true};delete ADV_BOOK[n];saveAdvBook();
        if(CAMPAIGN.advertiser===n){CAMPAIGN.advertiser=nv;renderBrand();renderCampBar();
          try{markDirty();saveLocal();}catch(e){}}
        closeModal();open();};});
    host.querySelectorAll('[data-adel]').forEach(b=>b.onclick=()=>{
      const n=b.dataset.adel,used=advUseCount(n);
      confirmModal(`‘${n}’ 광고주를 지울까요?`,
        used?`이 광고주를 쓰는 캠페인 <b>${used}개</b>는 그대로 남고, 목록과 로고만 사라집니다.`
            :'등록해 둔 로고가 함께 사라집니다.',
        ()=>{delete ADV_BOOK[n];saveAdvBook();
          if(CAMPAIGN.advertiser===n){CAMPAIGN.advLogo='';renderBrand();}
          open();},'삭제',true);});
    $('advAdd').onclick=()=>{
      const st={logo:''};
      openModal('광고주 추가',
        `<div class="form-row">
           <div class="fld" style="flex:1;min-width:220px"><label>광고주명</label>
             <input id="advNewName" placeholder="예: OO전자"></div>
           <div class="fld" style="flex:0 0 100%"><label>로고 <span class="hint">(선택 · 1:1 ~ 3:1 · 3MB 이하)</span></label>
             <div class="logopick">
               <span class="prev" id="advPrev2"><em>없음</em></span>
               <button class="btn sm" id="advPick2" type="button">이미지 선택</button>
               <button class="btn sm" id="advClear2" type="button">지우기</button>
             </div></div>
         </div>`,
        '<button class="btn" data-close>취소</button><button class="btn primary" id="advAddGo">추가</button>',{w:600});
      const paint=()=>{$('advPrev2').innerHTML=st.logo?`<img src="${st.logo}" alt="">`:'<em>없음</em>';};
      $('advPick2').onclick=()=>pickLogo(u=>{st.logo=u;paint();});
      $('advClear2').onclick=()=>{st.logo='';paint();};
      $('advAddGo').onclick=()=>{
        const n=($('advNewName').value||'').trim();
        if(!n){confirmModal('이름을 적어 주세요.','광고주명은 반드시 필요합니다.',()=>{},'확인');return;}
        ADV_BOOK[n]={logo:st.logo||'',mine:true};saveAdvBook();
        closeModal();open();};};
  };
  loadAdvBook();open();
}
