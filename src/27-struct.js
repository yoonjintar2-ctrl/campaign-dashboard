
/* ===== 27. 캠페인 구조 (v119) — 디지털 서머리 맨 위 마인드맵 =====
   캠페인 → 구분 → 매체 → 타깃 → 광고상품 → 소재 (가지 순서를 '타깃 › 매체' 로 바꿀 수 있다)
   · 구분까지는 굵은 가지(띠) 위에 이름, 매체부터 카드
   · 가지 굵기 = 예산에 정비례. 굵기 고정 선(stroke)이라 방향이 바뀌어도 두께가 같다
     상품 · 소재는 그 라인 예산을 일자별 실적 시트의 소진 비중대로 나눈 값(시트가 없으면 고르게 · 소재는 대시보드 실적 비중)
   · 구분 순서는 그대로, 그 아래는 예산 많은 순
   · 카드에는 금액을 적지 않는다 — 마우스를 올리면 툴팁
   · 물빛 흐름 — 가지마다 · 물줄기마다 속도 · 출발 시점 · 무늬가 달라 한꺼번에 지나가지 않는다. 화면 밖이면 멈춘다
   · 보기 설정(가지 순서 · 펼침 · 흐름)은 이 브라우저에만 기억한다 — 캠페인 문서에 저장하지 않아 뷰어도 바꿔 볼 수 있다
   ⚠ 부트스트랩(08 firstPaint)이 renderAll → renderStruct 를 이 파일보다 먼저 부른다 → 상태는 var (함정 10) */
var CS=null;
var CS_HUES=['#3a668c','#a67b36','#7a5f91','#4f7c65','#b06a63','#40828a','#6d6f9c','#8a6d4f'];
var CS_DASH=['10 22 4 84','22 50 6 42','6 30 14 70'];   /* 무늬마다 합이 120 — @keyframes csFlow 와 맞춘다 */
CS={order:'media',depth:5,flow:true,collapsed:{},expanded:{},W:0,sig:'',agg:null,N:null,ro:null,io:null,t:0,hov:-1};
(function(){try{const s=JSON.parse(localStorage.getItem('dmd:cs')||'{}');
  if(s.order==='target')CS.order='target';
  if(s.depth>=1&&s.depth<=5)CS.depth=s.depth|0;
  if(s.flow===false)CS.flow=false;}catch(e){}})();
function csSave(){try{localStorage.setItem('dmd:cs',JSON.stringify({order:CS.order,depth:CS.depth,flow:CS.flow}));}catch(e){}}
function csDims(){return CS.order==='target'?['seg','target','media','product']:['seg','media','target','product'];}
function csDimName(d){return {seg:L('구분','Segment'),media:L('매체','Media'),target:L('타깃','Target'),
  product:L('광고상품','Product'),creative:L('소재','Creative')}[d]||d;}
function csHex(c){c=String(c||'').trim();
  if(/^#[0-9a-f]{3}$/i.test(c))c='#'+c.slice(1).split('').map(x=>x+x).join('');
  if(/^#[0-9a-f]{6}$/i.test(c))return c;
  const m=c.match(/rgba?\(([^)]+)\)/);
  if(m){const p=m[1].split(',').map(v=>parseFloat(v));return '#'+p.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');}
  return '#ffffff';}
/* a 를 b 쪽으로 t 만큼 — 밝은 테마에서는 옅어지고, 다크에서는 바탕 쪽으로 가라앉는다 */
function csMix(a,b,t){const A=hex2rgb(csHex(a)),B=hex2rgb(csHex(b));
  return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function csLum(c){const [r,g,b]=hex2rgb(csHex(c)).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
  return .2126*r+.7152*g+.0722*b;}
/* 같은 입력이면 늘 같은 값 — 흐름의 속도 · 출발 시점을 가지마다 다르게 */
function csRnd(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return ((h>>>0)%10007)/10007;}

/* ---- 일자별 실적 시트 → 라인 · 광고상품 · 소재별 소진금액 (시트가 바뀔 때만 다시 센다) ---- */
function csSheetAgg(){
  const rows=(typeof SHEET!=='undefined'&&Array.isArray(SHEET))?SHEET:[];
  let h=rows.length+'|'+LINES.map(l=>l.id+':'+(l.product||'')+':'+(l.segment||'')+':'+(l.media||'')+':'+(l.target||'')).join(',');
  const step=Math.max(1,(rows.length/80)|0);
  for(let i=0;i<rows.length;i+=step){const r=rows[i]||{};h+='|'+(r.cost||0)+(r.product||'')+(r.creative||'');}
  if(CS.agg&&CS.sig===h)return CS.agg;
  const A={};
  rows.forEach(r=>{
    if(!r)return;
    const cost=+r.cost||0,imp=+r.imp||0,click=+r.click||0;
    if(!cost&&!imp&&!click)return;
    let ls=[];try{ls=rowLineCands(r);}catch(e){}
    if(ls.length!==1)return;
    const l=ls[0],ps=lineProducts(l);
    const pk=ps.find(p=>dimKey(p)===dimKey(r.product))||(ps.length===1?ps[0]:'');
    const a=A[l.id]||(A[l.id]={});
    const b=a[pk]||(a[pk]={cost:0,imp:0,click:0,cr:{}});
    b.cost+=cost;b.imp+=imp;b.click+=click;
    const cn=String(r.creative==null?'':r.creative).trim();
    if(cn)b.cr[cn]=(b.cr[cn]||0)+cost;});
  CS.sig=h;CS.agg=A;return A;}

/* ---- 라인 × 광고상품 한 줄씩 (예산 · 소재 비중) ---- */
function csRows(){
  const lines=LINES.filter(l=>['segment','media','line'].every(k=>FILTER[k]==='all'||l[k]===FILTER[k]));
  const A=csSheetAgg();
  /* 대시보드 실적(전체 기간)의 라인별 소재 소진 — 시트에 소재 구분이 없을 때 쓴다 */
  const FC={};
  FACTS.forEach(f=>{if(!f.creative||f.creative==='(소재 미등록)')return;
    const m=FC[f.lid]||(FC[f.lid]={});m[f.creative]=(m[f.creative]||0)+(+f.cost||0);});
  const out=[];
  lines.forEach(l=>{
    let ps=lineProducts(l);if(!ps.length)ps=[l.product||L('(상품 미입력)','(No product)')];
    const a=A[l.id]||{},gross=lineGross(l);
    const unk=(a['']&&a[''].cost)||0;
    const pc=ps.map(p=>(a[p]&&a[p].cost)||0);
    const tot=pc.reduce((s,v)=>s+v,0);
    const share=ps.map((p,i)=>tot>0?pc[i]/tot:1/ps.length);
    ps.forEach((p,i)=>{
      /* 소재 — ① 시트의 이 상품 소재 비중 ② 대시보드 실적의 라인 소재 비중 ③ 등록된 소재를 고르게 */
      let cr={};
      const src=a[p]&&Object.values(a[p].cr).some(v=>v>0)?a[p].cr
        :(FC[l.id]&&Object.values(FC[l.id]).some(v=>v>0)?FC[l.id]:null);
      if(src)Object.keys(src).forEach(k=>{if(src[k]>0)cr[k]=src[k];});
      else lineCreatives(l).forEach(k=>{cr[k]=1;});
      const ct=Object.values(cr).reduce((s,v)=>s+v,0)||1;
      const s=a[p]||{cost:0,imp:0,click:0};
      out.push({l,seg:l.segment||L('(구분 없음)','(No segment)'),media:l.media||L('(매체 미입력)','(No media)'),
        target:l.target||joinMulti(lineTargets(l))||L('(타깃 미입력)','(No target)'),product:p,
        bud:gross*share[i],sh:share[i],cost:s.cost+(ps.length===1?unk:0),imp:s.imp,click:s.click,
        cr:Object.keys(cr).map(k=>({n:k,v:cr[k]/ct}))});});});
  return out;}

/* ---- 나무 — 구분 순서는 그대로, 그 아래는 예산 많은 순 ---- */
function csTree(rows){
  const dims=csDims(),segOrd=segments();
  const root={i:0,dim:'root',label:'',rows,kids:[],depth:0,parent:null,bud:rows.reduce((s,r)=>s+r.bud,0)};
  const all=[root];
  const grow=(n,lv)=>{
    if(lv>=dims.length){
      const m={};n.rows.forEach(r=>r.cr.forEach(c=>{m[c.n]=(m[c.n]||0)+c.v*(r.bud||0)+c.v*1e-9;}));
      const t=Object.values(m).reduce((s,v)=>s+v,0)||1;
      n.cr=Object.keys(m).map(k=>({n:k,v:m[k]/t})).sort((a,b)=>b.v-a.v);
      return;}
    const dim=dims[lv],g=new Map();
    n.rows.forEach(r=>{const k=dimKey(r[dim]);if(!g.has(k))g.set(k,{label:r[dim],rows:[]});g.get(k).rows.push(r);});
    let kids=[...g.values()].map((x,j)=>({i:0,dim,label:x.label,rows:x.rows,kids:[],depth:lv+1,parent:n,nat:j,
      si:Math.max(0,segOrd.indexOf(x.rows[0].l.segment)),bud:x.rows.reduce((s,r)=>s+r.bud,0)}));
    if(dim==='seg')kids.sort((a,b)=>a.si-b.si||a.nat-b.nat);
    else kids.sort((a,b)=>Math.round(b.bud)-Math.round(a.bud)||a.nat-b.nat);
    kids.forEach(k=>{k.i=all.length;all.push(k);n.kids.push(k);grow(k,lv+1);});};
  grow(root,0);
  /* 구분 색 — 구분 순서대로, 그 아래는 자기 구분 색 */
  root.hue='#4d5257';
  root.kids.forEach((k,j)=>{k.hue=CS_HUES[j%CS_HUES.length];});
  all.forEach(n=>{if(n.depth>1){let p=n;while(p.depth>1)p=p.parent;n.hue=p.hue;}});
  return {root,all};}

/* ---- 그리기 ---- */
function renderStruct(){
  if(!CS)return;
  const wrap=$('csWrap'),map=$('csMap');if(!wrap||!map)return;
  try{if(typeof HIDDEN!=='undefined'&&HIDDEN.has('struct'))return;}catch(e){}
  const W=wrap.clientWidth;
  if(W<60){CS.W=0;return;}          /* 숨어 있다 — 보이게 되면 ResizeObserver 가 다시 부른다 (함정 65) */
  CS.W=W;
  csWire();
  hideTip&&hideTip();
  const rows=csRows();
  if(!rows.length){map.innerHTML=`<div class="hint" style="padding:18px 4px">${L('표시할 라인이 없습니다.','No lines to show.')}</div>`;
    map.style.height='';map.style.width='';$('csSum').innerHTML='';return;}
  const T=csTree(rows),root=T.root,all=T.all;
  const TOT=root.bud||1;
  /* 굵기 — 전체 예산 = 200px. 한 라인이 너무 굵어지지 않게(카드보다 굵으면 어색) 가장 큰 라인이 40px 를 넘지 않도록 줄인다 */
  const lineMax=Math.max(...LINES.filter(l=>rows.some(r=>r.l===l)).map(l=>lineGross(l)),0)/TOT;
  const K=Math.max(40,Math.min(200,lineMax>0?40/lineMax:200));
  const bw=v=>v>0?Math.max(1.8,K*v/TOT):0;
  const dims=csDims();
  /* 요약 줄은 먼저 — 아래 그리기가 중간에 실패해도 비지 않게 */
  try{csSum(root,rows,TOT,K);}catch(e){console.warn('struct sum',e);}
  const kidsOn=n=>n.kids.length>0&&!CS.collapsed[n.i+'|'+n.label]&&(n.depth<CS.depth||!!CS.expanded[n.i+'|'+n.label]);
  const chipsOn=n=>n.dim==='product'&&!CS.collapsed[n.i+'|'+n.label]&&(CS.depth>=5||!!CS.expanded[n.i+'|'+n.label]);

  /* 열 — 타깃 칸만 좁게(줄바꿈) 두고 남는 폭은 가지 사이 간격으로 */
  const ROOTW=150,SEGW=136,MEDW=132,PRODW=170,CHIPW=182;
  const avail=Math.max(0,W-(ROOTW+SEGW+MEDW+PRODW+CHIPW));
  const base=[140,78,70,60,20],bsum=368;
  let TW,g;
  if(avail>=568){TW=Math.min(320,200+(avail-568)*.4);const rest=avail-TW;g=base.map(x=>x*rest/bsum);}
  else{TW=Math.max(130,200-(568-avail)*.45);const rest=Math.max(0,avail-TW);const mins=[72,34,30,28,10];
    g=base.map((x,i)=>Math.max(mins[i],x*rest/bsum));}
  const MW=Math.ceil(ROOTW+SEGW+MEDW+PRODW+CHIPW+TW+g.reduce((s,v)=>s+v,0));
  const colW={media:MEDW,target:Math.round(TW),product:PRODW};
  const X=[0,ROOTW+g[0]];
  X[2]=X[1]+SEGW+g[1];X[3]=X[2]+colW[dims[1]]+g[2];X[4]=X[3]+colW[dims[2]]+g[3];
  const chipX=X[4]+PRODW+g[4];

  /* 카드를 먼저 그려 실제 크기를 잰다 (글자 폭 어림 금지 — 함정 69) */
  const vis=[];const walk=n=>{vis.push(n);if(kidsOn(n))n.kids.forEach(walk);};walk(root);
  CS.surf=csHex(getComputedStyle(document.documentElement).getPropertyValue('--surface'))||'#ffffff';
  const cStart=campStart(),cEnd=campEnd();
  const fmtD=s=>s?s.slice(5).replace('-','.'):'';
  const html=vis.map(n=>{
    const st=`data-nid="${n.i}" style="visibility:hidden;left:0;top:0;`;
    if(n.dim==='root')return `<div class="cs-n cs-root" ${st}width:${ROOTW}px" role="button" tabindex="0">`
      +`<span class="a">${esc(CAMPAIGN.advertiser||'')}</span><span class="n">${esc(CAMPAIGN.name||'')}</span>`
      +`<span class="p">${fmtD(cStart)} – ${fmtD(cEnd)}</span><span class="p2">${L(`라인 ${new Set(rows.map(r=>r.l.id)).size}개`,`${new Set(rows.map(r=>r.l.id)).size} lines`)}</span></div>`;
    if(n.dim==='seg')return `<div class="cs-n cs-seg" ${st}width:${SEGW}px" role="button" tabindex="0"><span>${esc(n.label)}</span></div>`;
    if(n.dim==='media'){
      const ls=[...new Set(n.rows.map(r=>r.l))];
      const per=new Set(ls.map(l=>l.start+'~'+l.end));
      let tag='';
      if(per.size===1&&(ls[0].start!==cStart||ls[0].end!==cEnd))tag=`${fmtD(ls[0].start)} – ${fmtD(ls[0].end)} ${L('집행','')}`.trim();
      return `<div class="cs-n cs-media" ${st}--cs-bd:${csMix(n.hue,CS.surf,.2)};max-width:${MEDW}px" role="button" tabindex="0">`
        +`<b>${esc(n.label)}</b>${tag?`<span class="tg" style="color:${n.hue}">${esc(tag)}</span>`:''}</div>`;}
    const cls=n.dim==='target'?'cs-tgt':'cs-prod';
    return `<div class="cs-n ${cls}" ${st}max-width:${colW[n.dim]}px" role="button" tabindex="0">${esc(n.label)}</div>`;}).join('');
  map.style.width=MW+'px';
  map.innerHTML=html;
  const elOf={};map.querySelectorAll('.cs-n').forEach(e=>{elOf[e.dataset.nid]=e;});
  /* 크기 */
  vis.forEach(n=>{
    const e=elOf[n.i];n.bw=bw(n.bud);
    if(n.dim==='root'){n.w=ROOTW;n.ch=Math.max(e.offsetHeight+24,Math.ceil(K)+18,150);return;}
    if(n.dim==='seg'){n.w=SEGW;n.ch=Math.max(20,Math.ceil(n.bw));return;}
    /* 소수점 폭을 내리면 글자가 말줄임으로 잘린다 → 올림 + 1 */
    const rc=e.getBoundingClientRect();n.w=Math.ceil(rc.width)+1;n.ch=Math.max(Math.ceil(rc.height),Math.ceil(n.bw)+10);});
  /* 세로 배치 */
  const gap=n=>n.dim==='root'?28:n.dim==='seg'?6:0;
  const measure=n=>{
    const own=n.ch+(n.dim==='seg'?20:8);
    if(kidsOn(n)){let s=0;n.kids.forEach((k,j)=>{s+=measure(k)+(j?gap(n):0);});n.band=Math.max(own,s);}
    else n.band=chipsOn(n)?Math.max(own,30):own;
    return n.band;};
  const place=(n,top)=>{
    if(kidsOn(n)){let s=0;n.kids.forEach((k,j)=>{s+=k.band+(j?gap(n):0);});
      let y=top+(n.band-s)/2;
      n.kids.forEach((k,j)=>{if(j)y+=gap(n);place(k,y);y+=k.band;});
      n.y=(n.kids[0].y+n.kids[n.kids.length-1].y)/2;}
    else n.y=top+n.band/2;
    n.x=X[n.depth];};
  measure(root);place(root,8);
  const H=Math.ceil(Math.max(root.band,root.ch)+16);
  map.style.height=H+'px';
  /* 가지 출발점 — 부모 끝에서 자식 가지를 굵기만큼 쌓는다 (합 = 부모 굵기) */
  vis.forEach(p=>{if(!kidsOn(p))return;
    const S=p.kids.reduce((s,k)=>s+k.bw,0);let y=p.y-S/2;
    p.kids.forEach(k=>{k.ys=y+k.bw/2;y+=k.bw;});});
  /* 색 — 구분 띠 · 그 아래 첫 가지는 구분 색 그대로, 그다음부터 조금씩 (단계가 바뀌는 곳은 늘 카드 밑이라 끊겨 보이지 않는다) */
  const tone=(n,d)=>csMix(n.hue,CS.surf,[0,0,0,.2,.34,.46][Math.min(5,d)]);
  const r1=v=>(Math.round(v*10)/10).toString();
  const curve=(sx,ex,ys,cx,cy,m)=>`M${sx} ${r1(ys)} L${ex} ${r1(ys)} C${m} ${r1(ys)} ${m} ${r1(cy)} ${cx} ${r1(cy)}`;
  let lines='',zeros='',flows='',labels='',badges='',chips='';
  const flow=(key,mk,w,col,n)=>{
    if(w<1.8)return;
    const k=Math.max(1,Math.min(5,Math.round(w/13))),light=csLum(col)>.3;
    for(let q=0;q<k;q++){
      const a=csRnd(key+'#'+q),b=csRnd(key+'@'+q),c=csRnd(key+'$'+q);
      const off=k>1?((q+.5)/k-.5)*w*.78:0,dur=120/(30+34*a);
      flows+=`<path class="cs-fl" data-nid="${n.i}" d="${mk(off)}" stroke-dasharray="${CS_DASH[Math.floor(b*3)]}"`
        +` style="stroke:${light?csMix(n.hue,'#000000',.3):'#ffffff'};stroke-width:${r1(Math.max(1.1,Math.min(4,w/k*.42)))}px;`
        +`opacity:${((light?.34:.5)*(.7+.3*c)).toFixed(2)};--dur:${dur.toFixed(2)}s;--dl:${(-c*dur).toFixed(2)}s"></path>`;}};
  vis.forEach(n=>{
    const e=elOf[n.i];
    e.style.left=Math.round(n.x)+'px';e.style.top=Math.round(n.y-n.ch/2)+'px';e.style.height=Math.round(n.ch)+'px';
    if(n.dim==='media'||n.dim==='target'||n.dim==='product')e.style.width=n.w+'px';
    e.style.visibility='';
    if(n.dim==='seg'){e.style.height=Math.round(n.ch)+'px';}
    const hid=n.kids.length&&!kidsOn(n)?n.kids.length:(n.dim==='product'&&!chipsOn(n)?(n.cr||[]).length:0);
    if(hid)badges+=`<span class="cs-badge" data-nid="${n.i}" style="left:${Math.round(n.x+n.w+8)}px;top:${Math.round(n.y-9)}px;background:${n.hue}">+${hid}</span>`;
    if(n.parent){
      const p=n.parent;
      if(n.dim==='seg'){
        const m=r1((ROOTW+X[1])/2);
        if(n.bw>0){
          lines+=`<path class="cs-ln" data-nid="${n.i}" d="${curve(ROOTW-40,ROOTW,n.ys,X[1],n.y,m)} L${X[1]+SEGW} ${r1(n.y)}" style="stroke:${n.hue};stroke-width:${r1(n.bw)}px"></path>`;
          flow('s'+n.label,o=>`${curve(ROOTW-6,ROOTW,n.ys+o,X[1],n.y+o,m)} L${X[1]+SEGW} ${r1(n.y+o)}`,n.bw,n.hue,n);}
        else zeros+=`<path class="cs-z" data-nid="${n.i}" d="${curve(ROOTW,ROOTW,n.ys,X[1],n.y,m)} L${X[1]+SEGW} ${r1(n.y)}" style="stroke:${n.hue}"></path>`;
      }else{
        const sx=p.dim==='seg'?p.x+p.w-6:p.x+12,ex=p.x+p.w,cx=n.x+12,m=r1((ex+n.x)/2),col=tone(n,n.depth);
        if(n.bw>0){
          lines+=`<path class="cs-ln" data-nid="${n.i}" d="${curve(sx,ex,n.ys,cx,n.y,m)}" style="stroke:${col};stroke-width:${r1(n.bw+.8)}px"></path>`;
          flow(n.i+'/'+n.label,o=>curve(ex-4,ex,n.ys+o,cx,n.y+o,m),n.bw,col,n);}
        else zeros+=`<path class="cs-z" data-nid="${n.i}" d="M${ex} ${r1(n.ys)} C${m} ${r1(n.ys)} ${m} ${r1(n.y)} ${cx} ${r1(n.y)}" style="stroke:${tone(n,3)}"></path>`;}}
    if(n.dim==='seg'){/* 이름은 띠 위에 */}
    if(chipsOn(n)&&n.cr&&n.cr.length){
      const col=tone(n,5);
      if(n.bw>0){lines+=`<path class="cs-ln" data-nid="${n.i}" d="M${n.x+12} ${r1(n.y)} L${chipX+4} ${r1(n.y)}" style="stroke:${col};stroke-width:${r1(n.bw)}px"></path>`;
        flow(n.i+'>cr',o=>`M${n.x+n.w-4} ${r1(n.y+o)} L${chipX+4} ${r1(n.y+o)}`,n.bw,col,n);}
      else zeros+=`<path class="cs-z" data-nid="${n.i}" d="M${n.x+n.w} ${r1(n.y)} L${chipX+4} ${r1(n.y)}" style="stroke:${col}"></path>`;
      /* 칩 — 들어가는 만큼만, 나머지는 +N */
      let x=chipX;const maxX=MW-2;
      for(let j=0;j<n.cr.length;j++){
        const c=n.cr[j],left=n.cr.length-j;
        const w=Math.min(96,Math.ceil(csTextW(c.n)+16));
        const need=left>1?w+4+30:w;
        if(x+need>maxX&&j>0){chips+=`<span class="cs-chip more" data-nid="${n.i}" style="left:${x}px;top:${Math.round(n.y-10)}px;--cs-bd:${csMix(n.hue,CS.surf,.55)}">+${left}</span>`;break;}
        chips+=`<span class="cs-chip" data-nid="${n.i}" data-cr="${esc(dimKey(c.n))}" data-k="${j}" style="left:${x}px;top:${Math.round(n.y-10)}px;width:${w}px;--cs-bd:${csMix(n.hue,CS.surf,.55)}">`
          +`${esc(c.n)}<i style="width:${Math.max(2,Math.round((w-10)*c.v))}px;background:${n.hue}"></i></span>`;
        x+=w+4;}}});
  const svg=`<svg class="cs-svg" width="${MW}" height="${H}" viewBox="0 0 ${MW} ${H}" aria-hidden="true">`
    +`<g class="cs-lines">${lines}${zeros}</g><g class="cs-flows ccskip">${flows}</g></svg>`;
  map.insertAdjacentHTML('afterbegin',svg);
  map.insertAdjacentHTML('beforeend',badges+chips);
  map.classList.toggle('cs-noflow',!CS.flow);
  /* 툴팁용 — 조회 기간 실적을 라인별로 한 번만 모아 둔다 */
  const pf={};
  try{factFilter().forEach(f=>{const a=pf[f.lid]||(pf[f.lid]={cost:0,imp:0,click:0});a.cost+=+f.cost||0;a.imp+=+f.imp||0;a.click+=+f.click||0;});}catch(e){}
  CS.N={all,vis,rows,TOT,K,pf};CS.hov=-1;CS.tipK='';
  csBind();
  try{CS.io&&CS.io.observe(map);}catch(e){}
}
/* 칩 글자 폭 — 실제 글꼴로 잰다 */
function csTextW(s){
  try{const c=csTextW.c||(csTextW.c=document.createElement('canvas').getContext('2d'));
    const ff=getComputedStyle(document.body).fontFamily;c.font=`700 10.5px ${ff}`;return c.measureText(String(s)).width;}
  catch(e){return String(s).length*7;}}

/* ---- 위쪽 요약 줄 — 구성 개수 · 굵기 견본 · 구분 범례 ---- */
function csSum(root,rows,TOT,K){
  const el=$('csSum');if(!el)return;
  const uniq=k=>new Set(rows.map(r=>dimKey(r[k]))).size;
  const crs=new Set();rows.forEach(r=>r.cr.forEach(c=>crs.add(dimKey(c.n))));
  const cnt=[[root.kids.length,L('구분','segments')],[uniq('media'),L('매체','media')],[uniq('product'),L('광고상품','products')],
    [uniq('target'),L('타깃 그룹','target groups')],[crs.size,L('소재','creatives')]];
  const scaleV=TOT>=5e8?1e8:TOT>=5e7?1e7:1e6;
  const scaleH=Math.max(1.8,K*scaleV/TOT);
  el.innerHTML=`<div class="cs-cnt">${cnt.map(c=>`<span><b>${c[0]}</b>${esc(c[1])}</span>`).join('')}</div>`
    +`<div class="cs-lg"><span class="cs-scale">${L('가지 굵기 = 예산','Branch width = budget')}<i style="height:${scaleH.toFixed(1)}px"></i><b>${manUnitL(scaleV)}</b></span>`
    +root.kids.map(k=>`<span><i style="background:${k.hue}"></i><b>${esc(k.label)}</b>${pct(k.bud/TOT,1)}</span>`).join('')+`</div>`;}
function manUnitL(n){return LANG==='en'?(n>=1e8?(n/1e6).toLocaleString('en-US')+'M':(n/1e6).toLocaleString('en-US')+'M'):manUnit(n);}

/* ---- 툴팁 · 강조 · 접기 ---- */
function csTipHtml(n){
  const tr=(l,v)=>`<div class="r"><span class="l">${esc(l)}</span><b>${esc(v)}</b></div>`;
  const N=CS.N,TOT=N.TOT;
  const lids=new Set(n.rows.map(r=>r.l.id));
  let cost=0,imp=0,click=0;
  lids.forEach(id=>{const a=N.pf[id];if(a){cost+=a.cost;imp+=a.imp;click+=a.click;}});
  const bud=n.rows.reduce((s,r)=>s+r.bud,0);
  const ctr=imp?pct(click/imp):'–',cpc=click?won(cost/click):'–';
  let h='';
  if(n.dim==='root'){
    h=`<div class="t">${esc(CAMPAIGN.name||'')}</div>`+tr(L('예산','Budget'),won(bud))+tr(L('소진금액 (조회 기간)','Spend (period)'),won(cost))
      +tr(L('클릭 · CTR','Clicks · CTR'),`${fmt(click)} · ${ctr}`)+`<div class="tsec">${L('누르면 모두 펼칩니다','Click to expand all')}</div>`;
    return h;}
  const seg=(()=>{let p=n;while(p.depth>1)p=p.parent;return p.label;})();
  h=`<div class="t">${esc(n.label)}</div><div style="opacity:.7;margin:-3px 0 6px">${esc(csDimName(n.dim))}${n.dim!=='seg'?' · '+esc(seg):''}</div>`;
  if(n.dim==='product'){
    const r=n.rows;const sc=r.reduce((s,x)=>s+x.cost,0),si=r.reduce((s,x)=>s+x.imp,0),sk=r.reduce((s,x)=>s+x.click,0);
    h+=tr(L('예산 배분','Budget share'),`${won(bud)} (${pct(bud/TOT,1)})`);
    if(r.length===1&&r[0].l&&lineProducts(r[0].l).length>1)h+=tr(L('라인 안 비중','Within line'),pct(r[0].sh,1));
    if(si||sk||sc)h+=tr(L('소진금액 (전체 기간)','Spend (all dates)'),won(sc))+tr(L('노출 · 클릭','Imps · clicks'),`${fmt(si)} · ${fmt(sk)}`);
    if(!sc&&si)h+=`<div class="tsec">${L('소진 0원 — 같은 라인 예산 안에서 받은 보너스 노출','0 spend — bonus impressions within the line budget')}</div>`;
    return h;}
  h+=tr(L('예산','Budget'),`${won(bud)} (${pct(bud/TOT,1)})`);
  const ls=[...new Set(n.rows.map(r=>r.l))];
  if(n.dim==='media'&&ls.length===1){const l=ls[0];
    h+=tr(L('광고상품','Product'),lineProducts(l).join(', ')||'–');
    if(CS.order==='media')h+=tr(L('타깃','Target'),l.target||joinMulti(lineTargets(l))||'–');
    if(l.bid)h+=tr(L('비드 · 단가','Bid · price'),`${l.bid} ${fmt(+l.price||0)}`);
    h+=tr(L('기간','Period'),`${(l.start||'').replace(/-/g,'.')} – ${(l.end||'').replace(/-/g,'.')}`);}
  else if(n.dim!=='seg')h+=tr(L('라인','Lines'),`${ls.length}${L('개','')} · ${[...new Set(ls.map(l=>l.media))].join(', ')}`);
  else h+=tr(L('구성','Make-up'),`${L('라인','lines')} ${ls.length} · ${L('매체','media')} ${new Set(ls.map(l=>dimKey(l.media))).size}`);
  h+=tr(L('소진금액 (조회 기간)','Spend (period)'),`${won(cost)}${bud?' · '+pct(cost/bud,1):''}`)
    +tr(L('클릭 · CTR','Clicks · CTR'),`${fmt(click)} · ${ctr}`)+(n.dim==='media'?tr('CPC',cpc):'');
  const twins=N.vis.filter(m=>m!==n&&m.dim===n.dim&&dimKey(m.label)===dimKey(n.label)).length;
  if(twins)h+=`<div class="tsec">${L(`같은 이름이 ${twins+1}곳에 있습니다 — 함께 강조된 가지`,`Appears in ${twins+1} places — highlighted together`)}</div>`;
  return h;}
function csHot(n,crKey){
  const map=$('csMap');if(!map||!CS.N)return;
  if(!n&&!crKey){map.classList.remove('cs-hov');map.querySelectorAll('.cs-on,.cs-hot').forEach(e=>e.classList.remove('cs-on','cs-hot'));return;}
  const on=new Set(),hot=new Set();
  const up=m=>{for(let p=m;p;p=p.parent)on.add(p.i);};
  const down=m=>{on.add(m.i);m.kids.forEach(down);};
  if(crKey){CS.N.vis.filter(m=>m.dim==='product'&&(m.cr||[]).some(c=>dimKey(c.n)===crKey)).forEach(up);}
  else CS.N.vis.filter(m=>m===n||(m.dim===n.dim&&m.dim!=='root'&&dimKey(m.label)===dimKey(n.label))).forEach(m=>{up(m);down(m);hot.add(m.i);});
  if(n&&n.dim==='root'){csHot(null);return;}
  map.classList.add('cs-hov');
  map.querySelectorAll('[data-nid]').forEach(e=>{const id=+e.dataset.nid;
    let ok=on.has(id);
    if(e.classList.contains('cs-chip')&&crKey)ok=ok&&e.dataset.cr===crKey;
    e.classList.toggle('cs-on',ok);e.classList.toggle('cs-hot',hot.has(id)&&e.classList.contains('cs-n'));});}
function csToggle(n){
  if(n.dim==='root'){CS.collapsed={};CS.expanded={};CS.depth=5;csSave();csPaintCtl();renderStruct();return;}
  if(!n.kids.length&&n.dim!=='product')return;
  const key=n.i+'|'+n.label;
  const open=n.dim==='product'?(!CS.collapsed[key]&&(CS.depth>=5||CS.expanded[key])):(!CS.collapsed[key]&&(n.depth<CS.depth||CS.expanded[key]));
  const limited=n.dim==='product'?CS.depth<5:n.depth>=CS.depth;
  if(open){if(limited)delete CS.expanded[key];else CS.collapsed[key]=true;}
  else{delete CS.collapsed[key];if(limited)CS.expanded[key]=true;}
  renderStruct();}
function csBind(){
  const map=$('csMap');if(!map||map.__csb)return;map.__csb=1;
  const nodeOf=e=>{const t=e.target.closest&&e.target.closest('[data-nid]');if(!t||!CS.N)return null;
    return {el:t,n:CS.N.all[+t.dataset.nid]};};
  map.addEventListener('mousemove',e=>{
    const h=nodeOf(e);
    if(!h||h.el.tagName==='path'){if(CS.hov!==-1){CS.hov=-1;csHot(null);hideTip();}return;}
    if(h.el.classList.contains('cs-chip')&&!h.el.classList.contains('more')){
      const key='c'+h.n.i+':'+h.el.dataset.k;
      if(CS.hov!==key){CS.hov=key;csHot(null,h.el.dataset.cr);}
      const c=(h.n.cr||[])[+h.el.dataset.k];
      if(c&&CS.tipK!==key){CS.tipK=key;
        const uses=CS.N.vis.filter(m=>m.dim==='product'&&(m.cr||[]).some(x=>dimKey(x.n)===dimKey(c.n))).length;
        CS.tipC=`<div class="t">${esc(c.n)}</div><div style="opacity:.7;margin:-3px 0 6px">${esc(csDimName('creative'))} · ${esc(h.n.label)}</div>`
          +`<div class="r"><span class="l">${L('상품 안 비중','Within product')}</span><b>${(h.n.cr.length>1?pct(c.v,1):L('단독 소재','Only creative'))}</b></div>`
          +`<div class="tsec">${L(`지금 보이는 가지 중 ${uses}곳에 쓰였습니다`,`Used in ${uses} visible branches`)}</div>`;}
      if(c)showTip(e.clientX,e.clientY,CS.tipC);
      return;}
    if(!h.el.classList.contains('cs-n'))return;
    if(CS.hov!==h.n.i){CS.hov=h.n.i;csHot(h.n);CS.tipH=csTipHtml(h.n);}
    showTip(e.clientX,e.clientY,CS.tipH);});
  map.addEventListener('mouseleave',()=>{CS.hov=-1;csHot(null);hideTip();});
  map.addEventListener('click',e=>{const h=nodeOf(e);if(!h||!h.el.classList.contains('cs-n'))return;hideTip();csToggle(h.n);});
  map.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const h=nodeOf(e);
    if(!h||!h.el.classList.contains('cs-n'))return;e.preventDefault();csToggle(h.n);});
  map.addEventListener('focusin',e=>{const h=nodeOf(e);if(h&&h.el.classList.contains('cs-n'))csHot(h.n);});
  map.addEventListener('focusout',()=>csHot(null));}
/* 위쪽 도구 — 흐름 효과 · 가지 순서 · 펼침 */
function csPaintCtl(){
  const sw=$('csFlowSw');if(sw)sw.classList.toggle('on',!!CS.flow);
  const os=$('csOrderSel');if(os){os.innerHTML=`<option value="media">${L('매체 › 타깃','Media › Target')}</option><option value="target">${L('타깃 › 매체','Target › Media')}</option>`;os.value=CS.order;}
  const ds=$('csDepthSel');if(ds){const d=csDims().map(csDimName).concat([csDimName('creative')]);
    ds.innerHTML=d.map((x,i)=>`<option value="${i+1}">${L('','to ')}${esc(x)}${L('까지','')}</option>`).join('');ds.value=String(CS.depth);}}
function csWire(){
  if(CS.wired)return;CS.wired=1;
  const sw=$('csFlowSw');
  if(sw)sw.onclick=()=>{CS.flow=!CS.flow;csSave();sw.classList.toggle('on',CS.flow);
    const m=$('csMap');if(m)m.classList.toggle('cs-noflow',!CS.flow);};
  const os=$('csOrderSel');if(os)os.onchange=()=>{CS.order=os.value==='target'?'target':'media';CS.collapsed={};CS.expanded={};csSave();csPaintCtl();renderStruct();};
  const ds=$('csDepthSel');if(ds)ds.onchange=()=>{CS.depth=Math.max(1,Math.min(5,+ds.value||5));CS.collapsed={};CS.expanded={};csSave();renderStruct();};
  csPaintCtl();
  /* 화면 밖이면 흐름을 멈춘다 · 폭이 바뀌면(메뉴 옮김 · 창 크기 · 숨김 → 보임) 다시 그린다 */
  try{CS.io=new IntersectionObserver(es=>es.forEach(x=>x.target.classList.toggle('cs-pause',!x.isIntersecting)));}catch(e){}
  try{const w=$('csWrap');CS.ro=new ResizeObserver(()=>{const nw=w.clientWidth;
      if(Math.abs(nw-CS.W)<3)return;clearTimeout(CS.t);CS.t=setTimeout(renderStruct,nw>60&&CS.W<60?0:140);});
    CS.ro.observe(w);}catch(e){}}
/* 언어를 바꾸면 도구 글자도 */
setTimeout(()=>{try{csWire();csPaintCtl();renderStruct();}catch(e){console.warn('struct',e);}},0);
