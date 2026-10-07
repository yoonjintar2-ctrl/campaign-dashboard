
/* ===== 카드 그림 복사 (v105) =====
   디지털 대시보드의 카드마다 오른쪽 위에 작은 복사 단추(카드에 마우스를 올리면 보인다).
   누르면 그 카드만 PNG 로 클립보드에 담고, 단추가 잠깐 ✓ 로 바뀐다.
   · 페이지는 건드리지 않는다 — 카드를 따로 복제해(메모리 안에서만) 그린다. 화면 배치 · 스크롤 · 열린 메뉴 그대로.
     예전처럼 화면을 잠깐 바꿔 찍는 방식이 아니라 페이지가 흩어지지 않는다.
   · 옆/아래로 넘치는 표(서머리 · 게재 히스토리 등)는 숨은 칸까지 펼쳐서 표 전체를 담는다. 스크롤바 · 좌우 넘김 단추는 빼고.
   · 클립보드에 그림을 넣을 수 없는 환경(https 가 아닌 곳 · 오래된 브라우저)이면 PNG 파일로 내려받는다 */
const CC_ICON='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="5.3" y="5.3" width="8.4" height="8.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.7 3.3v-.1a1.6 1.6 0 0 0-1.6-1.6H3.3a1.6 1.6 0 0 0-1.6 1.6v5.8a1.6 1.6 0 0 0 1.6 1.6h.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CC_OK='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.2 8.4l3.1 3.1 6.5-6.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CC_NG='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
const CC_BLANK='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
/* 여러 그래프 · 표가 모인 카드(유입 분석)는 카드 전체가 아니라 **그래프 · 표 하나하나**에 단추를 단다 (v111).
   전체 복사는 쓸 일이 없어 그런 카드에는 카드 단추를 달지 않는다 */
const CC_SPLIT='.infk,.infcell';
function ccButtons(host){
  if(!host.querySelector(':scope>.cardcopy')){
    const b=document.createElement('button');
    b.type='button';b.className='cardcopy';b.innerHTML=CC_ICON;
    b.title=L('이 영역을 그림으로 복사','Copy this card as an image');
    b.setAttribute('aria-label',b.title);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ccCopy(host,b);});
    host.classList.add('hascopy');host.appendChild(b);}
  /* 표가 있으면 그 옆에 엑셀 단추 (v108 · 21-tblxlsx.js) — 표가 사라지면 단추도 뗀다 */
  const has=!!host.querySelector('table'),xb=host.querySelector(':scope>.cardxl');
  if(has&&!xb&&typeof txClick==='function'){
    const b=document.createElement('button');
    b.type='button';b.className='cardxl';b.innerHTML=TX_ICON;
    b.title=L('이 표를 엑셀로 내려받기','Download this table as Excel');
    b.setAttribute('aria-label',b.title);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();txClick(host,b);});
    host.appendChild(b);}
  else if(!has&&xb)xb.remove();}
function ccAdd(){
  const root=$('tab-dash');if(!root)return;
  root.querySelectorAll('.card').forEach(card=>{
    const parts=card.querySelectorAll(CC_SPLIT);
    if(parts.length){
      card.querySelectorAll(':scope>.cardcopy,:scope>.cardxl').forEach(n=>n.remove());
      card.classList.remove('hascopy');
      parts.forEach(ccButtons);return;}
    ccButtons(card);});}
/* ---- 카드 → PNG (외부 라이브러리 없이) ----
   ① 카드를 통째로 복제(cloneNode) — 화면의 카드는 그대로 둔다
   ② 원본과 복제본을 나란히 훑으며, 화면에 실제로 적용된 스타일(getComputedStyle)을 복제본에 인라인으로 옮긴다
      (CSS 클래스로 칠한 SVG 그래프 · ::before/::after 장식까지)
   ③ <img> · 배경 그림은 data URL 로 바꿔 넣는다(그림이 SVG 안에 갇혀 있어도 보이게)
   ④ SVG foreignObject 로 감싸 이미지로 읽고 캔버스에 2배로 그려 PNG 로 */
const CC_HTML_PROPS=['display','position','top','right','bottom','left','z-index','float','clear','box-sizing',
  'width','height','min-width','min-height','max-width','max-height',
  'margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left',
  'border-top-width','border-right-width','border-bottom-width','border-left-width',
  'border-top-style','border-right-style','border-bottom-style','border-left-style',
  'border-top-color','border-right-color','border-bottom-color','border-left-color',
  'border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius',
  'overflow-x','overflow-y','color','background-color','background-image','background-size','background-position',
  'background-repeat','background-clip','background-origin','opacity','visibility','box-shadow',
  'font-family','font-size','font-weight','font-style','font-variant-numeric','line-height','letter-spacing','word-spacing',
  'text-align','text-decoration-line','text-decoration-color','text-decoration-style','text-decoration-thickness',
  'text-underline-offset','text-transform','text-indent','text-shadow','white-space','word-break','overflow-wrap','text-overflow',
  'vertical-align','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','justify-content','justify-items',
  'align-items','align-self','align-content','order','row-gap','column-gap',
  'grid-template-columns','grid-template-rows','grid-column-start','grid-column-end','grid-row-start','grid-row-end',
  'grid-auto-flow','grid-auto-columns','grid-auto-rows','transform','transform-origin','filter','clip-path',
  'border-collapse','border-spacing','table-layout','list-style-type','object-fit','object-position',
  '-webkit-line-clamp','-webkit-box-orient','mix-blend-mode','isolation','paint-order','-webkit-text-stroke',
  'fill','stroke','stroke-width'];
const CC_SVG_PROPS=['display','visibility','opacity','fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity',
  'stroke-dasharray','stroke-dashoffset','stroke-linecap','stroke-linejoin','stroke-miterlimit','paint-order',
  'font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','alignment-baseline',
  'text-decoration-line','filter','clip-path','mask','mix-blend-mode','transform-origin','vector-effect','shape-rendering'];
const CC_SVG_NS='http://www.w3.org/2000/svg';
const ccCss=(cs,props)=>{let t='';for(const p of props){const v=cs.getPropertyValue(p);if(v!=='')t+=p+':'+v+';';}return t;};
const ccDataURL=(()=>{const memo=new Map();
  return url=>{if(!url||/^data:/i.test(url))return Promise.resolve(url);
    if(!memo.has(url))memo.set(url,fetch(url,{mode:'cors',cache:'force-cache'}).then(r=>{if(!r.ok)throw 0;return r.blob();})
      .then(b=>new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(CC_BLANK);fr.readAsDataURL(b);}))
      .catch(()=>CC_BLANK));
    return memo.get(url);};})();
const ccScrolls=v=>v==='auto'||v==='scroll'||v==='overlay';
async function ccRender(card){
  try{hideTip();}catch(e){}
  const W=Math.ceil(card.offsetWidth)||1,H=Math.ceil(card.offsetHeight)||1;
  const clone=card.cloneNode(true);
  const jobs=[];
  /* 원본 · 복제본을 같은 순서로 훑는다 — 복제본은 처음엔 원본과 구조가 똑같으므로 자식 순서로 짝을 맞춘다.
     ::before/::after 는 자식을 다 훑은 뒤에 끼워 넣어 짝이 어긋나지 않게.
     돌려주는 값 [ex,ey] = 그 상자 안에서 스크롤로 숨어 있던 만큼(펼치면 그만큼 넓어지고 길어진다) */
  const walk=(o,c)=>{
    if(o.nodeType!==1||!c||c.nodeType!==1)return [0,0];
    const isSvg=o.namespaceURI===CC_SVG_NS&&o.tagName.toLowerCase()!=='svg';
    const cs=getComputedStyle(o);
    let st=ccCss(cs,isSvg?CC_SVG_PROPS:CC_HTML_PROPS);
    if(isSvg){c.setAttribute('style',st);return [0,0];}
    if(cs.display==='none'){c.setAttribute('style',st);return [0,0];}
    /* 자식들이 펼쳐지는 만큼 — 가로로 나란한 상자(flex 가로줄)는 가로는 더하고 세로는 큰 쪽, 아래로 쌓이는 상자는 그 반대 */
    const row=/flex/.test(cs.display)&&/^row/.test(cs.flexDirection);
    let ex=0,ey=0;
    const oc=[...o.children],ccn=[...c.children];
    for(let i=0;i<oc.length;i++){const [x,y]=walk(oc[i],ccn[i]);
      if(row){ex+=x;ey=Math.max(ey,y);}else{ex=Math.max(ex,x);ey+=y;}}
    /* 스크롤 상자 — 숨은 칸까지 펼친다 */
    if(ccScrolls(cs.overflowX)&&o.scrollWidth>o.clientWidth+1)ex+=o.scrollWidth-o.clientWidth;
    if(ccScrolls(cs.overflowY)&&o.scrollHeight>o.clientHeight+1)ey+=o.scrollHeight-o.clientHeight;
    /* 스크롤바는 그리지 않는다 — 펼친 뒤엔 넘칠 것이 없다 */
    if(ccScrolls(cs.overflowX))st+='overflow-x:hidden;';
    if(ccScrolls(cs.overflowY))st+='overflow-y:hidden;';
    const tbl=/^(TABLE|TR|TD|TH|TBODY|THEAD|TFOOT|COL|COLGROUP|CAPTION)$/.test(o.tagName);
    const flow=cs.position!=='absolute'&&cs.position!=='fixed';
    /* 칸 너비는 화면에서 잰 그대로 — 글꼴이 조금 달라도 줄바꿈 · 배치가 흔들리지 않게 (표 안 칸은 표가 정한다) */
    if(o!==card&&cs.display!=='inline'&&cs.display!=='contents'&&flow&&!tbl)
      st+='width:'+(parseFloat(cs.width)+ex)+'px;'+(ex?'max-width:none;':'');
    if(ey&&!tbl&&cs.display!=='inline'&&cs.display!=='contents')
      st+='height:'+(parseFloat(cs.height)+ey)+'px;max-height:none;';
    c.setAttribute('style',st);
    /* 배경 그림(url) — data URL 로 */
    const bi=cs.backgroundImage;
    if(bi&&bi.includes('url(')&&!bi.includes('data:'))
      jobs.push((async()=>{let out=bi;for(const m of bi.matchAll(/url\(["']?([^"')]+)["']?\)/g)){const d=await ccDataURL(m[1]);out=out.replace(m[0],`url("${d}")`);}
        c.style.backgroundImage=out;})());
    if(o.tagName==='INPUT'){c.setAttribute('value',o.value);if(o.checked)c.setAttribute('checked','');else c.removeAttribute('checked');}
    if(o.tagName==='SELECT'){const k0=o.selectedIndex;[...c.options].forEach((op,k)=>{if(k===k0)op.setAttribute('selected','');else op.removeAttribute('selected');});}
    if(o.tagName==='IMG'){const src=o.currentSrc||o.src;jobs.push(ccDataURL(src).then(d=>{c.setAttribute('src',d);c.removeAttribute('srcset');}));}
    if(o.tagName==='CANVAS'){try{const img=document.createElement('img');img.src=o.toDataURL();img.setAttribute('style',st);c.replaceWith(img);}catch(e){}
      return flow?[ex,ey]:[0,0];}
    /* ::before / ::after — 실제 요소로 */
    for(const ps of ['::before','::after']){const pcs=getComputedStyle(o,ps),ct=pcs.content;
      if(!ct||ct==='none'||ct==='normal')continue;
      const sp=document.createElement('span');
      sp.setAttribute('style',ccCss(pcs,CC_HTML_PROPS));
      const m=/^["'](.*)["']$/.exec(ct);sp.textContent=m?m[1].replace(/\\"/g,'"'):'';
      if(ps==='::before')c.insertBefore(sp,c.firstChild);else c.appendChild(sp);}
    /* 떠 있는 상자(absolute)는 둘레 상자 크기에 보태지 않는다 */
    return flow?[ex,ey]:[0,0];};
  const [EX,EY]=walk(card,clone);
  await Promise.all(jobs);
  /* 복사 단추 · 좌우 넘김 단추는 그림에서 뺀다 */
  clone.querySelectorAll('.cardcopy,.cardxl,.hpbtn').forEach(n=>n.remove());
  const W2=W+Math.round(EX),H2=H+Math.round(EY);
  clone.style.margin='0';clone.style.width=W2+'px';clone.style.height=H2+'px';clone.style.maxWidth='none';clone.style.maxHeight='none';
  /* 표의 data-key 등에 들어 있는 제어문자(구분자 U+0001)는 XML 에 넣을 수 없다 — 지운다 */
  const html=new XMLSerializer().serializeToString(clone).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}"><foreignObject x="0" y="0" width="100%" height="100%">${html}</foreignObject></svg>`;
  const img=new Image();img.decoding='sync';
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  await img.decode();
  /* 2배로 선명하게 — 아주 큰 표는 캔버스 한도(한 변 3만 픽셀 남짓) 안으로 줄인다 */
  const pr=Math.min(2,16000/H2,16000/W2);
  const cv=document.createElement('canvas');cv.width=Math.round(W2*pr);cv.height=Math.round(H2*pr);
  const ctx=cv.getContext('2d');
  const bg=getComputedStyle(card).backgroundColor;
  ctx.fillStyle=bg&&bg!=='rgba(0, 0, 0, 0)'?bg:(cssVar('--surface')||'#fff');ctx.fillRect(0,0,cv.width,cv.height);
  ctx.scale(pr,pr);ctx.drawImage(img,0,0,W2,H2);
  const blob=await new Promise(res=>cv.toBlob(res,'image/png'));
  if(!blob)throw new Error('그림을 만들지 못했습니다');
  return blob;}
function ccDownload(blob,card){
  const nm=card.querySelector('.infh>b,.infk>span');
  const sec=(nm&&nm.textContent.trim())||card.getAttribute('data-sect')||'card';
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`${(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name||'dashboard').replace(/[\\/:*?"<>|]/g,'')}_${sec}.png`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
async function ccCopy(card,btn){
  if(btn.__busy)return;btn.__busy=1;btn.classList.add('busy');
  const fin=(ok,dl)=>{btn.classList.remove('busy');btn.innerHTML=ok?CC_OK:CC_NG;btn.classList.add(ok?'ok':'ng');
    btn.title=ok?(dl?L('PNG 파일로 내려받았습니다','Saved as a PNG file'):L('복사했습니다','Copied')):L('복사하지 못했습니다','Copy failed');
    setTimeout(()=>{btn.innerHTML=CC_ICON;btn.classList.remove('ok','ng');btn.title=L('이 영역을 그림으로 복사','Copy this card as an image');btn.__busy=0;},1400);};
  try{
    if(navigator.clipboard&&navigator.clipboard.write&&window.ClipboardItem&&window.isSecureContext){
      /* 클릭한 그 순간에 ClipboardItem 을 만들어 넘겨야 Safari 도 받아 준다(그림은 Promise 로 나중에 채운다) */
      await navigator.clipboard.write([new ClipboardItem({'image/png':ccRender(card)})]);
      fin(true);return;}
    ccDownload(await ccRender(card),card);fin(true,1);
  }catch(e){console.warn('카드 복사',e);
    try{ccDownload(await ccRender(card),card);fin(true,1);}catch(x){console.warn(x);fin(false);}}}
/* 카드는 다시 그려질 때마다 새로 생기므로, 대시보드에 변화가 있으면 빠진 카드에만 단추를 단다 */
(function(){const root=$('tab-dash');if(!root)return;
  let t=0;const go=()=>{clearTimeout(t);t=setTimeout(()=>{try{ccAdd();}catch(e){}},150);};
  try{new MutationObserver(go).observe(root,{childList:true,subtree:true});}catch(e){}
  go();})();
