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
/* A4 가로 한 장에 들어가는 실제 폭(96dpi 기준, 여백 제외) */
const PRINT_W=1040;
/* 종이보다 넓은 표·그래프는 그만큼 줄여서 잘리지 않게 한다.
   화면에는 영향이 없도록 --pz 만 심어 두고 @media print 에서만 zoom 을 건다. */
function fitForPrint(){
  document.querySelectorAll('.pz').forEach(x=>{x.classList.remove('pz');x.style.removeProperty('--pz');});
  const wide=document.querySelectorAll(
    '#sub-perf .tbl-wrap, #sub-mix .tbl-wrap, .gantt-wrap, .heatwrap, .pacescroll, .stripscroll');
  wide.forEach(w=>{
    const inner=w.firstElementChild;
    const cw=Math.max(w.scrollWidth,inner?inner.scrollWidth:0);
    if(cw>PRINT_W+4){
      w.classList.add('pz');
      w.style.setProperty('--pz',(PRINT_W/cw).toFixed(3));}});
}
/* ---------- PDF 리포트 ----------
   브라우저의 인쇄 기능을 그대로 쓴다(별도 라이브러리 없이 어디서나 동작).
   인쇄용 스타일이 광고주 화면 기준으로 정리하고 일자별 상세 효율만 뺀다.
   미디어믹스는 아직 안 그려져 있을 수 있으므로 미리 그려 둔 뒤 인쇄한다. */
function exportPdfReport(){
  const b=$('pdfBtn');
  if(b){b.disabled=true;}
  /* 지금 보고 있던 자리를 기억해 두었다가 인쇄가 끝나면 그대로 되돌린다 */
  const subOn=document.querySelector('#subbar button[data-sub].on');
  const tabOn=document.querySelector('#tabs button.on');
  const prev={sub:subOn?subOn.dataset.sub:'perf',tab:tabOn?tabOn.dataset.tab:'dash',
    y:scrollY};
  document.body.classList.add('pdfmode');
  try{switchTab('dash');}catch(e){}
  const goPerf=document.querySelector('#subbar button[data-sub="perf"]');
  if(goPerf)goPerf.click();
  /* 미디어믹스 · 효율 화면을 모두 그려 둔다 */
  setTimeout(()=>{
    try{renderMix();}catch(e){}
    try{renderCreatives();renderGantt();renderStrip();renderBubble();renderTreemap();renderHeat();}catch(e){}
    setTimeout(()=>{
      fitForPrint();
      document.body.classList.remove('pdfmode');
      const back=()=>{
        const bs=document.querySelector(`#subbar button[data-sub="${prev.sub}"]`);
        if(bs)bs.click();
        if(prev.tab!=='dash'){try{switchTab(prev.tab);}catch(e){}}
        scrollTo({top:prev.y});
        document.querySelectorAll('.pz').forEach(x=>{x.classList.remove('pz');
          x.style.removeProperty('--pz');});
        if(b)b.disabled=false;};
      const once=()=>{removeEventListener('afterprint',once);setTimeout(back,120);};
      addEventListener('afterprint',once);
      try{print();}catch(e){back();}
      /* afterprint 를 안 주는 브라우저 대비 */
      setTimeout(()=>{if(b&&b.disabled){removeEventListener('afterprint',once);back();}},4000);
    },420);
  },60);
}
(function(){const b=$('reportBtn');if(b)b.onclick=exportDashboard;
  const p2=$('pdfBtn');if(p2)p2.onclick=exportPdfReport;})();
