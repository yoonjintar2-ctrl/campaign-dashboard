
/* ---------- 페이지 저장 (v112) ----------
   지금 보고 있는 화면(디지털 · TV · OOH 대시보드, 전체 캠페인 …)을 위에서 아래까지 한 장으로 —
   긴 PNG 그림 한 장, 또는 긴 한 쪽짜리 PDF.  (예전 「⤓ 리포트 · 엑셀」 단추를 대신한다)
   · 카드 복사(20-cardcopy)의 ccRender 로 화면을 SVG 그림 한 장으로 옮긴 뒤 캔버스에 옮겨 그린다.
     캔버스는 한 변 3만 픽셀 남짓이 한도라 — PNG 는 아주 긴 화면이면 배율을 낮추고,
     PDF 는 4천 px 씩 잘라 여러 장의 JPEG 를 한 쪽에 위아래로 이어 붙인다(길어도 2배 선명도 그대로).
   · 폭은 화면에 보이는 그대로 — 옆으로 넘치는 표는 화면처럼 잘린다(표 전체는 표마다 붙은 엑셀 단추로).
   · 버튼 · 숨기기 · 설명(i) · 복사 단추 같은 조작용 요소는 그림에서 뺀다(body.pssave — 자리는 그대로 두고 감춘다).
   · 맨 위에 캠페인 이름 · 메뉴 · 저장 시각 한 줄. */
const PS_PAD=28,PS_HEAD=50,PS_SLICE=4000;
let PS_BUSY=false;
function psMenu(){
  const T=$('tabs'),cur=(T&&T.dataset.cur)||'dash';
  const m=cur==='dash'?MENUS.find(x=>x.tab==='dash'&&x.sub===curDashSub()):MENUS.find(x=>x.tab===cur);
  return {cur,m};}
const psTr=s=>{try{return LANG==='en'&&typeof trText==='function'?trText(s):s;}catch(e){return s;}};
function psMenuLabel(m){
  if(!m)return '';
  const a=psTr(AREA_LABEL[m.area]||''),l=psTr(m.l||'');
  if(m.id==='overview'){const adv=String(CAMPAIGN.advertiser||'').trim();
    return adv?`${adv} ${L('캠페인 현황','campaigns')}`:l;}
  return a&&a!==l?`${a} › ${l}`:l;}
const psStamp=d=>{const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;};
const psDay=d=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;};
function psFileName(m,ext,d){
  const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
  const parts=[clean(CAMPAIGN.name)||'dashboard'];
  if(m){const a=psTr(AREA_LABEL[m.area]||''),l=psTr(m.l||'');
    if(a&&a!==l)parts.push(clean(a));parts.push(clean(l));}
  parts.push(psDay(d));
  return parts.join('_').replace(/_+/g,'_')+'.'+ext;}
/* 화면 좌우 여백(.wrap 의 안쪽 여백)은 빼고 내용이 있는 폭만 — 머리 줄도 내용 왼쪽 끝에 맞춘다 */
function psSpan(tgt){
  const wr=tgt.getBoundingClientRect();let L=Infinity,R=-Infinity;
  [...tgt.children].forEach(c=>{if(!c.getClientRects().length)return;
    const cs=getComputedStyle(c);if(cs.position==='absolute'||cs.position==='fixed')return;
    const r=c.getBoundingClientRect();if(!r.width||!r.height)return;
    L=Math.min(L,r.left-wr.left);R=Math.max(R,r.right-wr.left);});
  if(!(R>L))return null;
  return {x:Math.max(0,Math.floor(L)),w:Math.ceil(R)-Math.max(0,Math.floor(L))};}
/* 그림 전체(머리 줄 + 화면)의 자리 잡기 — 단위는 화면 px */
function psLayout(r,m,d,span){
  const sx=span?Math.min(span.x,r.W-1):0,W=span?Math.min(span.w,r.W-sx):r.W;
  const bs=getComputedStyle(document.body);
  const bg=(bs.backgroundColor&&bs.backgroundColor!=='rgba(0, 0, 0, 0)')?bs.backgroundColor:(cssVar('--bg')||'#fff');
  const top=PS_PAD+PS_HEAD;
  return {img:r.img,sx,W,H:r.H,bg,top,pad:PS_PAD,
    Wt:W+PS_PAD*2,Ht:top+r.H+PS_PAD,
    font:bs.fontFamily||'sans-serif',
    ink:cssVar('--ink')||'#1e2a38',muted:cssVar('--muted')||'#8b98a7',line:cssVar('--line')||'#e4e8ee',
    title:String(CAMPAIGN.name||'').trim()||L('캠페인','Campaign'),
    sub:psMenuLabel(m),
    stamp:`${L('저장','Saved')} ${psStamp(d)}`};}
function psHead(ctx,P){
  const x0=P.pad,x1=P.pad+P.W,y=P.pad;
  ctx.textBaseline='alphabetic';
  /* 오른쪽 — 저장 시각 */
  ctx.font=`500 12px ${P.font}`;ctx.fillStyle=P.muted;ctx.textAlign='right';
  ctx.fillText(P.stamp,x1,y+18);
  const sw=ctx.measureText(P.stamp).width;
  /* 왼쪽 — 캠페인 이름(굵게) · 그 아래 메뉴 */
  ctx.textAlign='left';
  const fit=(t,max)=>{if(ctx.measureText(t).width<=max)return t;
    let s=t;while(s.length>1&&ctx.measureText(s+'…').width>max)s=s.slice(0,-1);return s+'…';};
  ctx.font=`800 17px ${P.font}`;ctx.fillStyle=P.ink;
  ctx.fillText(fit(P.title,P.W-sw-24),x0,y+18);
  if(P.sub){ctx.font=`600 12px ${P.font}`;ctx.fillStyle=P.muted;ctx.fillText(fit(P.sub,P.W-sw-24),x0,y+37);}
  /* 머리 줄 아래 구분선 */
  ctx.fillStyle=P.line;ctx.fillRect(x0,y+PS_HEAD-6,P.W,1);}
/* 전체 그림의 [y0, y0+h) 구간을 캔버스에 그린다 (pr = 화면 px 하나당 캔버스 픽셀) */
function psPaint(cv,P,y0,h,pr){
  const ctx=cv.getContext('2d');
  ctx.fillStyle=P.bg;ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save();ctx.scale(pr,pr);ctx.translate(0,-y0);
  if(y0<P.top)psHead(ctx,P);
  const a=Math.max(y0,P.top),b=Math.min(y0+h,P.top+P.H);
  if(b>a)ctx.drawImage(P.img,P.sx,a-P.top,P.W,b-a,P.pad,a,P.W,b-a);
  ctx.restore();}
const psBlob=(cv,type,q)=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('그림을 만들지 못했습니다')),type,q));
/* 긴 PNG 한 장 — 캔버스 한도(한 변 32,767 · 넓이 2.5억 픽셀 남짓) 안에서 되도록 2배 */
async function psPng(P){
  const pr=Math.min(2,32000/P.Ht,32000/P.Wt,Math.sqrt(2.4e8/(P.Wt*P.Ht)));
  const cv=document.createElement('canvas');
  cv.width=Math.round(P.Wt*pr);cv.height=Math.round(P.Ht*pr);
  psPaint(cv,P,0,P.Ht,pr);
  return psBlob(cv,'image/png');}
/* ---------- 아주 작은 PDF 작성기 ----------
   한 쪽(page)에 JPEG 여러 장을 위에서 아래로 붙인다. 쪽 크기는 화면 1px = 0.75pt(96dpi)이고,
   PDF 한 변 한도(14,400pt)를 넘는 긴 화면은 쪽 전체를 그만큼 줄인다(그림 해상도는 그대로 — 확대하면 선명하다) */
function psPdfBytes(P,slices){
  const s=Math.min(0.75,14400/P.Ht,14400/P.Wt);
  const Wpt=+(P.Wt*s).toFixed(2),Hpt=+(P.Ht*s).toFixed(2);
  const enc=new TextEncoder(),parts=[],off=[];let len=0;
  const put=b=>{if(typeof b==='string')b=enc.encode(b);parts.push(b);len+=b.length;};
  const obj=(n,dict,stream)=>{off[n]=len;put(`${n} 0 obj\n${dict}\n`);
    if(stream){put('stream\n');put(stream);put('\nendstream\n');}
    put('endobj\n');};
  /* 문서 정보의 글자(한글)는 UTF-16BE 16진수로 */
  const pdfStr=t=>{let h='FEFF';for(const ch of String(t)){const c=ch.codePointAt(0);
      if(c>0xffff){const v=c-0x10000;h+=(0xd800+(v>>10)).toString(16).padStart(4,'0')+(0xdc00+(v&0x3ff)).toString(16).padStart(4,'0');}
      else h+=c.toString(16).padStart(4,'0');}
    return '<'+h.toUpperCase()+'>';};
  put('%PDF-1.4\n');put(new Uint8Array([0x25,0xe2,0xe3,0xcf,0xd3,0x0a]));
  const N0=5;   /* 1 카탈로그 · 2 쪽 목록 · 3 쪽 · 4 그리기 명령 · 5.. 그림들 · 마지막 문서 정보 */
  const draw=slices.map((sl,k)=>{
    /* 이음매에 머리카락 같은 틈이 보이지 않게 — 마지막 조각이 아니면 아래로 0.6pt 겹쳐 그린다 */
    const h=sl.h*s+(k<slices.length-1?0.6:0),y=Hpt-(sl.y+sl.h)*s-(k<slices.length-1?0.6:0);
    return `q ${Wpt} 0 0 ${h.toFixed(3)} 0 ${y.toFixed(3)} cm /Im${k} Do Q`;}).join('\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${Wpt} ${Hpt}] /Resources << /XObject << ${slices.map((_,k)=>`/Im${k} ${N0+k} 0 R`).join(' ')} >> >> /Contents 4 0 R >>`);
  const ds=enc.encode(draw);
  obj(4,`<< /Length ${ds.length} >>`,ds);
  slices.forEach((sl,k)=>obj(N0+k,`<< /Type /XObject /Subtype /Image /Width ${sl.pw} /Height ${sl.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${sl.data.length} >>`,sl.data));
  const nInfo=N0+slices.length;
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  const tz=-d.getTimezoneOffset(),tzs=(tz>=0?'+':'-')+p(Math.floor(Math.abs(tz)/60))+"'"+p(Math.abs(tz)%60)+"'";
  obj(nInfo,`<< /Title ${pdfStr(P.title+(P.sub?' · '+P.sub:''))} /Producer ${pdfStr('Digital Media Dashboard')} /CreationDate (D:${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${tzs}) >>`);
  const xref=len,n=nInfo+1;
  let x=`xref\n0 ${n}\n0000000000 65535 f \n`;
  for(let i=1;i<n;i++)x+=String(off[i]).padStart(10,'0')+' 00000 n \n';
  put(x);put(`trailer\n<< /Size ${n} /Root 1 0 R /Info ${nInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out=new Uint8Array(len);let o=0;for(const b of parts){out.set(b,o);o+=b.length;}
  return out;}
async function psPdf(P,onStep){
  const pr=2,slices=[];
  const n=Math.ceil(P.Ht/PS_SLICE);
  for(let k=0;k<n;k++){
    const y=k*PS_SLICE,h=Math.min(PS_SLICE,P.Ht-y);
    const cv=document.createElement('canvas');cv.width=Math.round(P.Wt*pr);cv.height=Math.round(h*pr);
    psPaint(cv,P,y,h,pr);
    const b=await psBlob(cv,'image/jpeg',0.92);
    slices.push({y,h,pw:cv.width,ph:cv.height,data:new Uint8Array(await b.arrayBuffer())});
    cv.width=cv.height=0;
    if(onStep)await onStep(k+1,n);}
  return psPdfBytes(P,slices);}
async function pageSave(kind){
  if(PS_BUSY)return;PS_BUSY=true;
  const btns=[$('pageImgBtn'),$('pagePdfBtn')].filter(Boolean);
  btns.forEach(b=>b.disabled=true);
  const d=new Date(),{cur,m}=psMenu();
  const tgt=$('tab-'+cur);
  progOpen(kind==='pdf'?L('페이지를 PDF로 저장하는 중','Saving the page as PDF'):L('페이지를 이미지로 저장하는 중','Saving the page as an image'));
  progSet(null,L('화면을 그림으로 옮기는 중… (긴 화면은 10초 넘게 걸릴 수 있습니다)','Capturing the page… (long pages can take over 10 seconds)'));
  document.body.classList.add('pssave');
  try{
    if(!tgt||tgt.classList.contains('hidden')||!tgt.offsetHeight)throw new Error('no page');
    await uiTick();await uiTick();
    const span=psSpan(tgt);
    const r=await ccRender(tgt,{noX:true,dropHidden:true,raw:true});
    document.body.classList.remove('pssave');
    const P=psLayout(r,m,d,span);
    if(kind==='pdf'){
      progSet(40,L('PDF 만드는 중…','Building the PDF…'));await uiTick();
      const bytes=await psPdf(P,async(k,n)=>{progSet(40+55*k/n);await uiTick();});
      saveFile(bytes,psFileName(m,'pdf',d),'application/pdf');}
    else{
      progSet(50,L('PNG 파일 만드는 중…','Building the PNG…'));await uiTick();
      saveFile(await psPng(P),psFileName(m,'png',d),'image/png');}
    progSet(100);
  }catch(e){
    console.warn('페이지 저장',e);
    progClose();
    openModal(L('페이지 저장','Save page'),
      `<div class="hint">${esc(L('이 화면을 그림으로 만들지 못했습니다. 잠시 뒤 다시 시도하거나, 크롬(Chrome)에서 열어 다시 눌러 주세요.',
        'Could not capture this page. Please try again in a moment, or retry in Chrome.'))}</div>`,
      `<button class="btn" data-close>${esc(L('닫기','Close'))}</button>`,{w:460});
  }finally{
    document.body.classList.remove('pssave');
    progClose();
    btns.forEach(b=>b.disabled=false);
    PS_BUSY=false;}}
(function(){
  const a=$('pageImgBtn'),b=$('pagePdfBtn');
  if(a)a.onclick=()=>pageSave('png');
  if(b)b.onclick=()=>pageSave('pdf');})();
