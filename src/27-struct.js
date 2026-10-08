
/* ===== 27. 캠페인 구조 (v119 → v120 디지털 대시보드 첫 메뉴 #sub-struct) — 마인드맵 =====
   캠페인 → 구분 → 매체 → 타깃 → 광고상품 → 소재 (가지 순서를 '타깃 › 매체' 로 바꿀 수 있다)
   · 구분까지는 굵은 가지(띠) 위에 이름, 매체부터 카드
   · 가지 굵기 = 예산에 정비례. 굵기 고정 선(stroke)이라 방향이 바뀌어도 두께가 같다
     상품 · 소재는 그 라인 예산을 일자별 실적 시트의 소진 비중대로 나눈 값(시트가 없으면 고르게 · 소재는 대시보드 실적 비중)
   · 구분 순서는 그대로, 그 아래는 예산 많은 순
   · 카드에는 금액을 적지 않는다 — 마우스를 올리면 툴팁
   · 물빛 흐름 — 가지마다 · 물줄기마다 속도 · 출발 시점 · 무늬가 달라 한꺼번에 지나가지 않는다. 화면 밖이면 멈춘다
   · 보기 설정(가지 순서 · 펼침 · 흐름 · 화면 맞춤)은 이 브라우저에만 기억한다 — 캠페인 문서에 저장하지 않아 뷰어도 바꿔 볼 수 있다
   · 캠페인 전체 구조라 조회 기간 · 구분/매체 필터를 따르지 않는다(툴팁 실적도 누적)
   · 화면 맞춤(v120, 기본 켜짐) — 보통 배치가 창 높이를 넘으면 ① 촘촘한 배치(.cs-fit) ② 그래도 넘으면
     더 넓게 그린 뒤 통째로 줄인다(scale, 최소 CS_SMIN). 넓게 그릴수록 타깃이 한 줄로 펴져 덜 줄여도 된다
   ⚠ 부트스트랩(08 firstPaint)이 renderAll → renderStruct 를 이 파일보다 먼저 부른다 → 상태는 var (함정 10) */
var CS=null;
var CS_HUES=['#3a668c','#a67b36','#7a5f91','#4f7c65','#b06a63','#40828a','#6d6f9c','#8a6d4f'];
var CS_DASH=['10 22 4 84','22 50 6 42','6 30 14 70'];   /* 무늬마다 합이 120 — @keyframes csFlow 와 맞춘다 */
var CS_SMIN=.7;
/* 배치 간격 — 보통(시안 A-4 그대로) · 촘촘(화면 맞춤) */
var CS_P={loose:{fit:false,gRoot:28,gSeg:6,padN:8,padS:20,minPad:10,top:8,bot:16,rootMin:150},
  tight:{fit:true,gRoot:12,gSeg:2,padN:3,padS:8,minPad:4,top:4,bot:6,rootMin:118}};
/* 가지 순서 (v120.3) — 캠페인마다 다르다(예: 테슬라어택은 광고상품이 타깃보다 위). 마지막 단 아래에 소재 칩 */
var CS_ORDERS={media:['seg','media','target','product'],product:['seg','media','product','target'],target:['seg','target','media','product']};
CS={ovr:null,depth:5,flow:true,fit:true,collapsed:{},expanded:{},W:0,vh:0,scale:1,sig:'',agg:null,N:null,ro:null,io:null,t:0,hov:-1};
(function(){try{const s=JSON.parse(localStorage.getItem('dmd:cs')||'{}');
  if(s.depth>=2&&s.depth<=5)CS.depth=s.depth|0;
  if(s.flow===false)CS.flow=false;
  if(s.fit===false)CS.fit=false;}catch(e){}})();
function csSave(){try{localStorage.setItem('dmd:cs',JSON.stringify({depth:CS.depth,flow:CS.flow,fit:CS.fit}));}catch(e){}}
/* 가지 순서 = 캠페인 문서의 기본(CAMPAIGN.csOrder — 시행사가 고르면 저장) · 저장할 수 없는 화면(광고주)에서 바꾼 것은 이 캠페인 · 이 화면에서만(CS.ovr) */
function csCampKey(){try{return (CLOUD.campaign&&CLOUD.campaign.id)||CAMPAIGN.name||'';}catch(e){return CAMPAIGN.name||'';}}
function csOrder(){const o=(CS.ovr&&CS.ovr.k===csCampKey()&&CS.ovr.o)||CAMPAIGN.csOrder||'media';return CS_ORDERS[o]?o:'media';}
function csDims(){return CS_ORDERS[csOrder()];}
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

/* ---- 라인 × 광고상품 한 줄씩 (예산 · 소재 비중) — 캠페인 전체(필터 무시, v120) ---- */
function csRows(){
  const lines=LINES.slice();
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
      out.push({l,seg:l.segment||L('(구분 없음)','(No segment)'),noSeg:!String(l.segment||'').trim(),media:l.media||L('(매체 미입력)','(No media)'),
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
      blank:dim==='seg'&&!!x.rows[0].noSeg,
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

/* ---- 그리기 ----
   (v120.2) 세 단계로 나눴다 — csCols(폭: 칸 · 카드 만들고 재기) → csVert(높이: 굵기 K · 줄 간격 e 로 세로 배치, 계산만) → csDraw(가지 · 흐름 · 칩)
   · 펼침을 줄이면 안 보이는 칸은 폭 0 — 남는 폭을 보이는 가지 사이로 나눠 오른쪽 끝까지 채운다(여백 없음)
   · 화면 맞춤: 넘치면 촘촘 → 넓게 그려 줄이기 / 남으면 가지를 굵게(기본의 1.8배 · 가장 큰 라인 72px 까지) → 그래도 남으면 줄 간격 */
function csMinDepth(){return csDims().indexOf('media')+1;}   /* 펼침은 매체까지가 최소 */
function renderStruct(){
  if(!CS)return;
  const wrap=$('csWrap'),map=$('csMap');if(!wrap||!map)return;
  const W=wrap.clientWidth;
  if(W<60){CS.W=0;return;}          /* 숨어 있다 — 보이게 되면 ResizeObserver 가 다시 부른다 (함정 65) */
  CS.W=W;CS.vh=innerHeight;CS.drawnAt=Date.now();
  csWire();
  if(CS.depth<csMinDepth())CS.depth=csMinDepth();
  /* 언어를 바꾸거나 다른 캠페인을 열어 가지 순서가 바뀌면 펼침 · 가지 순서 목록도 다시 */
  if(CS.lang!==LANG||CS.pOrd!==csOrder()){if(CS.pOrd&&CS.pOrd!==csOrder()){CS.collapsed={};CS.expanded={};}CS.lang=LANG;csPaintCtl();}
  hideTip&&hideTip();
  /* 지난 배율을 걷어 내고 잰다 — 줄인 채로 재면 getBoundingClientRect 가 줄어든 크기를 돌려준다 */
  map.style.transform='';map.style.transformOrigin='';wrap.style.height='';wrap.classList.remove('cs-scaled');
  map.classList.remove('cs-fit');CS.scale=1;
  /* 화면 맞춤이면 가로 스크롤바를 아예 내지 않는다 — 스크롤바가 생겼다 없어졌다 하며 폭이 흔들리던 것(v120.2) */
  wrap.classList.toggle('cs-fitw',!!CS.fit);
  const rows=csRows();
  if(!rows.length){map.innerHTML=`<div class="hint" style="padding:18px 4px">${L('표시할 라인이 없습니다.','No lines to show.')}</div>`;
    map.style.height='';map.style.width='';$('csSum').innerHTML='';return;}
  const T=csTree(rows),root=T.root,all=T.all;
  const TOT=root.bud||1;
  /* 굵기 — 전체 예산 = 200px. 한 라인이 너무 굵어지지 않게(카드보다 굵으면 어색) 가장 큰 라인이 40px 를 넘지 않도록 줄인다 */
  const lineMax=Math.max(...LINES.filter(l=>rows.some(r=>r.l===l)).map(l=>lineGross(l)),0)/TOT;
  const K0=Math.max(40,Math.min(200,lineMax>0?40/lineMax:200));
  /* 요약 줄은 먼저 — 아래 그리기가 중간에 실패해도 비지 않게(지도 위치도 이 줄 높이에 달렸다) */
  try{csSum(root,rows,TOT,K0,1);}catch(e){console.warn('struct sum',e);}
  CS.surf=csHex(getComputedStyle(document.documentElement).getPropertyValue('--surface'))||'#ffffff';
  const C={rows,root,all,TOT};
  let P=CS_P.loose,s=1,K=K0,e=0;
  let G=csCols(W,P,C),H=csVert(G,K,P,0);
  if(CS.fit){
    const Hav=csAvailH(wrap);
    if(H>Hav){
      P=CS_P.tight;map.classList.add('cs-fit');
      G=csCols(W,P,C);H=csVert(G,K,P,0);
      if(H>Hav){
        /* 넓게 그려 줄이기 — 가장 덜 줄이는 배율을 반씩 좁혀 찾는다 */
        const at=m=>{G=csCols(W/m,P,C);return csVert(G,K,P,0)*m;};
        if(at(CS_SMIN)>Hav)s=CS_SMIN;
        else{let lo=CS_SMIN,hi=1;for(let i=0;i<6;i++){const m=(lo+hi)/2;if(at(m)<=Hav)lo=m;else hi=m;}s=lo;}
        G=csCols(W/s,P,C);H=csVert(G,K,P,0);}}
    if(s===1&&H<Hav-4){
      /* 남는 높이 — ① 가지를 굵게 ② 그래도 남으면 줄 간격 (폭은 그대로라 카드를 다시 잴 필요 없이 계산만) */
      const Kmax=Math.max(K0,Math.min(K0*1.8,lineMax>0?72/lineMax:K0*1.8));
      if(csVert(G,Kmax,P,0)<=Hav)K=Kmax;
      else{let lo=K0,hi=Kmax;for(let i=0;i<8;i++){const m=(lo+hi)/2;if(csVert(G,m,P,0)<=Hav)lo=m;else hi=m;}K=lo;}
      const EMAX=120;
      if(csVert(G,K,P,EMAX)<=Hav)e=EMAX;
      else{let lo=0,hi=EMAX;for(let i=0;i<7;i++){const m=(lo+hi)/2;if(csVert(G,K,P,m)<=Hav)lo=m;else hi=m;}e=lo;}}}
  H=csVert(G,K,P,e);
  csDraw(G,K,P,H);
  if(s<1){map.style.transformOrigin='0 0';map.style.transform=`scale(${s.toFixed(4)})`;
    wrap.style.height=Math.ceil(H*s)+'px';wrap.classList.add('cs-scaled');}
  CS.scale=s;CS.K=K;
  /* 굵기 견본은 화면에 보이는 굵기(K × 배율)로 다시 */
  if(K!==K0||s!==1)try{csSum(root,rows,TOT,K,s);}catch(e){}
  map.classList.toggle('cs-noflow',!CS.flow);
  /* 툴팁용 — 라인별 누적 실적을 한 번만 모아 둔다 (캠페인 전체 화면이라 조회 기간을 따르지 않는다) */
  const pf={};
  try{FACTS.forEach(f=>{const a=pf[f.lid]||(pf[f.lid]={cost:0,imp:0,click:0});a.cost+=+f.cost||0;a.imp+=+f.imp||0;a.click+=+f.click||0;});}catch(e){}
  CS.N={all,vis:G.vis,rows,TOT,K,pf};CS.hov=-1;CS.tipK='';
  csBind();
  try{CS.io&&CS.io.observe(map);}catch(e){}
}
/* 한 화면에 쓸 수 있는 지도 높이 — 문서 맨 위에서 지도까지를 뺀 창 높이(아래는 카드 여백 + 페이지 아래 여백).
   위가 너무 길면(낮은 창) 영역 제목을 머리줄 바로 밑까지 내렸을 때 기준 */
function csAvailH(wrap){
  const vh=innerHeight,bot=42;
  const stick=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stick'),10)||94;
  const top=wrap.getBoundingClientRect().top+scrollY;
  let h=vh-top-bot;
  if(h<(vh-stick)*.55){const sec=$('csSec');const st=sec?sec.getBoundingClientRect().top+scrollY:top;
    h=vh-stick-12-(top-st)-bot;}
  return Math.max(300,h);}
/* ① 폭 Wl 로 칸을 정하고 카드를 만들어 잰다 */
function csCols(Wl,P,C){
  const map=$('csMap'),{rows,root}=C;
  const dims=csDims();
  const kidsOn=n=>n.kids.length>0&&!CS.collapsed[n.i+'|'+n.label]&&(n.depth<CS.depth||!!CS.expanded[n.i+'|'+n.label]);
  /* 소재 칩은 마지막 단(depth 4 — 광고상품, 순서에 따라 타깃) 아래 */
  const chipsOn=n=>n.depth===4&&!CS.collapsed[n.i+'|'+n.label]&&(CS.depth>=5||!!CS.expanded[n.i+'|'+n.label]);
  const vis=[];const walk=n=>{vis.push(n);if(kidsOn(n))n.kids.forEach(walk);};walk(root);
  /* 보이는 가장 깊은 칸 — 0 캠페인 · 1 구분 · 2/3 매체·타깃 · 4 광고상품 · 5 소재 */
  let dv=0;vis.forEach(n=>{if(n.depth>dv)dv=n.depth;});
  if(vis.some(n=>chipsOn(n)&&n.cr&&n.cr.length))dv=5;
  const tail=dv<5?44:0;                 /* 접힌 가지의 +N 표시 자리 */

  /* 열 — 보통: 타깃 칸만 좁게(줄바꿈) 두고 남는 폭은 가지 사이 간격으로.
     촘촘: 타깃이 한 줄로 펴질 만큼(최대 460px) 먼저 주고 남는 폭을 간격으로 — 줄 수가 곧 높이다 */
  const ROOTW=P.fit?138:150,SEGW=P.fit?124:136;
  let MEDW=132,PRODW=170,CHIPW=182;
  const cStart=campStart(),cEnd=campEnd();
  const fmtD=s=>s?s.slice(5).replace('-','.'):'';
  /* 매체 카드 아래 작은 글씨 — 캠페인과 집행 기간이 다른 매체만 */
  const mTag=n=>{const ls=[...new Set(n.rows.map(r=>r.l))],per=new Set(ls.map(l=>l.start+'~'+l.end));
    return per.size===1&&(ls[0].start!==cStart||ls[0].end!==cEnd)?`${fmtD(ls[0].start)} – ${fmtD(ls[0].end)} ${L('집행','')}`.trim():'';};
  /* 촘촘: 매체 · 광고상품 · 소재 칸도 글자에 맞춘다 — 상품이 두 줄로 꺾이거나 소재가 +N 으로 접히지 않게 */
  if(P.fit){
    let mN=0,pN=0,cN=0;
    vis.forEach(n=>{
      if(n.dim==='media'){const t=mTag(n);mN=Math.max(mN,csTextW(n.label,'700 12.5px')+22,t?csTextW(t,'700 10px')+22:0);}
      else if(n.dim==='product')pN=Math.max(pN,csTextW(n.label,'400 11px')+20);
      if(chipsOn(n)&&n.cr&&n.cr.length){let w=0;n.cr.slice(0,4).forEach((c,j)=>{w+=Math.min(140,Math.ceil(csTextW(c.n,'700 10px')+16))+(j?4:0);});
        if(n.cr.length>4)w+=34;cN=Math.max(cN,w);}});
    MEDW=Math.max(90,Math.min(150,Math.ceil(mN)||124));
    PRODW=Math.max(110,Math.min(270,Math.ceil(pN)||164));
    CHIPW=Math.max(60,Math.min(300,cN?Math.ceil(cN)+6:60));}
  const tD=dims.indexOf('target')+1,tOn=tD<=dv;
  const wOf=(d,TW)=>{if(d===0)return ROOTW;if(d===1)return SEGW;if(d===5)return CHIPW;
    const k=dims[d-1];return k==='target'?TW:k==='product'?PRODW:MEDW;};
  const base=[140,78,70,60,20],mins=P.fit?[48,26,24,22,8]:[72,34,30,28,10];
  const act=i=>i<dv;
  const bs=base.reduce((a,x,i)=>a+(act(i)?x:0),0)||1,ms=mins.reduce((a,x,i)=>a+(act(i)?x:0),0);
  let fixed=tail;for(let d=0;d<=dv;d++)if(!(tOn&&d===tD))fixed+=wOf(d,0);
  const avail=Math.max(0,Wl-fixed);
  let TW=0;
  if(tOn){
    if(!P.fit){const pv=200+bs;TW=avail>=pv?Math.min(320,200+(avail-pv)*.4):Math.max(130,200-(pv-avail)*.45);}
    else{let need=0;vis.forEach(n=>{if(n.dim==='target')need=Math.max(need,csTextW(n.label,'400 11px')+22);});
      TW=Math.max(130,Math.min(need||200,460,avail-ms));}}
  const gaps=rest=>base.map((x,i)=>act(i)?Math.max(mins[i],x*rest/bs):0);
  let g=gaps(Math.max(0,avail-TW));
  /* 최소 간격 때문에 넘치면 타깃 칸을 그만큼 줄인다 */
  const over=fixed+TW+g.reduce((a,v)=>a+v,0)-Wl;
  if(over>0&&tOn&&TW>130){TW-=Math.min(over,TW-130);g=gaps(Math.max(0,avail-TW));}
  TW=Math.round(TW);
  const X=[0];for(let d=0;d<5;d++)X[d+1]=X[d]+wOf(d,TW)+g[d];
  const total=X[dv]+wOf(dv,TW)+tail;
  /* 폭은 감싼 칸을 1px 도 넘지 않게(소수점 올림으로 넘치면 스크롤바가 생겼다 없어졌다 한다) */
  const MW=total<=Wl+.5?Math.floor(Math.min(total,Wl)):Math.ceil(total);
  const colW={media:MEDW,target:TW||200,product:PRODW};
  const chipX=X[4]+wOf(4,TW)+g[4];

  /* 카드를 먼저 그려 실제 크기를 잰다 (글자 폭 어림 금지 — 함정 69 · 위 칸 폭 어림은 상한일 뿐, 높이는 실제로 잰다) */
  const html=vis.map(n=>{
    const st=`data-nid="${n.i}" style="visibility:hidden;left:0;top:0;`;
    if(n.dim==='root')return `<div class="cs-n cs-root" ${st}width:${ROOTW}px" role="button" tabindex="0">`
      +`<span class="a">${esc(CAMPAIGN.advertiser||'')}</span><span class="n">${esc(CAMPAIGN.name||'')}</span>`
      +`<span class="p">${fmtD(cStart)} – ${fmtD(cEnd)}</span><span class="p2">${L(`라인 ${new Set(rows.map(r=>r.l.id)).size}개`,`${new Set(rows.map(r=>r.l.id)).size} lines`)}</span></div>`;
    /* 구분이 비어 있는 라인 묶음은 띠만 — 이름(‘구분 없음’)을 적지 않는다 (v120) */
    if(n.dim==='seg')return `<div class="cs-n cs-seg${n.blank?' blank':''}" ${st}width:${SEGW}px" role="button" tabindex="0"${n.blank?` aria-label="${esc(n.label)}"`:''}><span>${n.blank?'':esc(n.label)}</span></div>`;
    if(n.dim==='media'){
      const tag=mTag(n);
      return `<div class="cs-n cs-media" ${st}--cs-bd:${csMix(n.hue,CS.surf,.2)};max-width:${MEDW}px" role="button" tabindex="0">`
        +`<b>${esc(n.label)}</b>${tag?`<span class="tg" style="color:${n.hue}">${esc(tag)}</span>`:''}</div>`;}
    const cls=n.dim==='target'?'cs-tgt':'cs-prod';
    return `<div class="cs-n ${cls}" ${st}max-width:${colW[n.dim]}px" role="button" tabindex="0">${esc(n.label)}</div>`;}).join('');
  map.style.width=MW+'px';
  map.innerHTML=html;
  const elOf={};map.querySelectorAll('.cs-n').forEach(e=>{elOf[e.dataset.nid]=e;});
  vis.forEach(n=>{const e=elOf[n.i];
    if(n.dim==='root'){n.w=ROOTW;n.rh=e.offsetHeight;return;}
    if(n.dim==='seg'){n.w=SEGW;n.rh=0;return;}
    /* 소수점 폭을 내리면 글자가 말줄임으로 잘린다 → 올림 + 1 */
    const rc=e.getBoundingClientRect();n.w=Math.ceil(rc.width)+1;n.rh=Math.ceil(rc.height);});
  return {vis,X,MW,ROOTW,SEGW,PRODW,chipX,elOf,kidsOn,chipsOn,TOT:C.TOT};}
/* ② 세로 배치 — 굵기 K · 줄 간격 덧붙임 e. 계산만 하고 높이를 돌려준다 */
function csVert(G,K,P,e){
  const {vis,kidsOn,chipsOn,TOT}=G;
  vis.forEach(n=>{n.bw=n.bud>0?Math.max(1.8,K*n.bud/TOT):0;
    if(n.dim==='root')n.ch=Math.max(n.rh+(P.fit?16:24),Math.ceil(K)+18,P.rootMin);
    else if(n.dim==='seg')n.ch=Math.max(P.fit?18:20,Math.ceil(n.bw));
    else n.ch=Math.max(n.rh,Math.ceil(n.bw)+P.minPad);});
  const gap=n=>n.dim==='root'?P.gRoot+e*1.5:n.dim==='seg'?P.gSeg+e*.3:0;
  const measure=n=>{
    const own=n.ch+(n.dim==='seg'?P.padS:P.padN+e);
    if(kidsOn(n)){let s=0;n.kids.forEach((k,j)=>{s+=measure(k)+(j?gap(n):0);});n.band=Math.max(own,s);}
    else n.band=chipsOn(n)?Math.max(own,(P.fit?24:30)+e):own;
    return n.band;};
  const place=(n,top)=>{
    if(kidsOn(n)){let s=0;n.kids.forEach((k,j)=>{s+=k.band+(j?gap(n):0);});
      let y=top+(n.band-s)/2;
      n.kids.forEach((k,j)=>{if(j)y+=gap(n);place(k,y);y+=k.band;});
      n.y=(n.kids[0].y+n.kids[n.kids.length-1].y)/2;}
    else n.y=top+n.band/2;
    n.x=G.X[n.depth];};
  const root=vis[0];
  measure(root);place(root,P.top);
  return Math.ceil(Math.max(root.band,root.ch)+P.top+P.bot);}
/* ③ 놓고 · 가지 · 흐름 · 칩 */
function csDraw(G,K,P,H){
  const map=$('csMap'),{vis,X,MW,ROOTW,SEGW,PRODW,chipX,elOf,kidsOn,chipsOn}=G;
  map.style.height=H+'px';
  /* 가지 출발점 — 부모 끝에서 자식 가지를 굵기만큼 쌓는다 (합 = 부모 굵기) */
  vis.forEach(p=>{if(!kidsOn(p))return;
    const S=p.kids.reduce((s,k)=>s+k.bw,0);let y=p.y-S/2;
    p.kids.forEach(k=>{k.ys=y+k.bw/2;y+=k.bw;});});
  /* 색 — 구분 띠 · 그 아래 첫 가지는 구분 색 그대로, 그다음부터 조금씩 (단계가 바뀌는 곳은 늘 카드 밑이라 끊겨 보이지 않는다) */
  const tone=(n,d)=>csMix(n.hue,CS.surf,[0,0,0,.2,.34,.46][Math.min(5,d)]);
  const r1=v=>(Math.round(v*10)/10).toString();
  const curve=(sx,ex,ys,cx,cy,m)=>`M${sx} ${r1(ys)} L${ex} ${r1(ys)} C${m} ${r1(ys)} ${m} ${r1(cy)} ${cx} ${r1(cy)}`;
  let lines='',zeros='',flows='',badges='',chips='';
  const flow=(key,mk,w,col,n)=>{
    if(w<1.8)return;
    const k=Math.max(1,Math.min(5,Math.round(w/13))),light=csLum(col)>.3;
    for(let q=0;q<k;q++){
      const a=csRnd(key+'#'+q),b=csRnd(key+'@'+q),c=csRnd(key+'$'+q);
      const off=k>1?((q+.5)/k-.5)*w*.78:0,dur=120/(30+34*a);
      flows+=`<path class="cs-fl" data-nid="${n.i}" d="${mk(off)}" stroke-dasharray="${CS_DASH[Math.floor(b*3)]}"`
        +` style="stroke:${light?csMix(n.hue,'#000000',.3):'#ffffff'};stroke-width:${r1(Math.max(1.1,Math.min(4,w/k*.42)))}px;`
        +`opacity:${((light?.34:.5)*(.7+.3*c)).toFixed(2)};--dur:${dur.toFixed(2)}s;--dl:${(-c*dur).toFixed(2)}s"></path>`;}};
  const chipH=P.fit?18:20,chipF=P.fit?'700 10px':'700 10.5px';
  vis.forEach(n=>{
    const e=elOf[n.i];
    e.style.left=Math.round(n.x)+'px';e.style.top=Math.round(n.y-n.ch/2)+'px';e.style.height=Math.round(n.ch)+'px';
    if(n.dim==='media'||n.dim==='target'||n.dim==='product')e.style.width=n.w+'px';
    e.style.visibility='';
    const hid=n.kids.length&&!kidsOn(n)?n.kids.length:(n.depth===4&&!chipsOn(n)?(n.cr||[]).length:0);
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
    if(chipsOn(n)&&n.cr&&n.cr.length){
      const col=tone(n,5);
      if(n.bw>0){lines+=`<path class="cs-ln" data-nid="${n.i}" d="M${n.x+12} ${r1(n.y)} L${chipX+4} ${r1(n.y)}" style="stroke:${col};stroke-width:${r1(n.bw)}px"></path>`;
        flow(n.i+'>cr',o=>`M${n.x+n.w-4} ${r1(n.y+o)} L${chipX+4} ${r1(n.y+o)}`,n.bw,col,n);}
      else zeros+=`<path class="cs-z" data-nid="${n.i}" d="M${n.x+n.w} ${r1(n.y)} L${chipX+4} ${r1(n.y)}" style="stroke:${col}"></path>`;
      /* 칩 — 들어가는 만큼만, 나머지는 +N */
      let x=chipX;const maxX=MW-2,ct=Math.round(n.y-chipH/2);
      for(let j=0;j<n.cr.length;j++){
        const c=n.cr[j],left=n.cr.length-j;
        const w=Math.min(P.fit?140:96,Math.ceil(csTextW(c.n,chipF)+16));
        const need=left>1?w+4+30:w;
        if(x+need>maxX&&j>0){chips+=`<span class="cs-chip more" data-nid="${n.i}" style="left:${x}px;top:${ct}px;--cs-bd:${csMix(n.hue,CS.surf,.55)}">+${left}</span>`;break;}
        chips+=`<span class="cs-chip" data-nid="${n.i}" data-cr="${esc(dimKey(c.n))}" data-k="${j}" style="left:${x}px;top:${ct}px;width:${w}px;--cs-bd:${csMix(n.hue,CS.surf,.55)}">`
          +`${esc(c.n)}<i style="width:${Math.max(2,Math.round((w-10)*c.v))}px;background:${n.hue}"></i></span>`;
        x+=w+4;}}});
  const svg=`<svg class="cs-svg" width="${MW}" height="${H}" viewBox="0 0 ${MW} ${H}" aria-hidden="true">`
    +`<g class="cs-lines">${lines}${zeros}</g><g class="cs-flows ccskip">${flows}</g></svg>`;
  map.insertAdjacentHTML('afterbegin',svg);
  map.insertAdjacentHTML('beforeend',badges+chips);}
/* 글자 폭 — 실제 글꼴로 잰다 (font = '굵기 크기') */
function csTextW(s,font){
  try{const c=csTextW.c||(csTextW.c=document.createElement('canvas').getContext('2d'));
    const ff=csTextW.ff||(csTextW.ff=getComputedStyle(document.body).fontFamily);c.font=`${font||'700 10.5px'} ${ff}`;return c.measureText(String(s)).width;}
  catch(e){return String(s).length*7;}}

/* ---- 위쪽 요약 줄 — 구성 개수 · 굵기 견본 · 구분 범례 ---- */
function csSum(root,rows,TOT,K,sc){
  const el=$('csSum');if(!el)return;
  const uniq=k=>new Set(rows.map(r=>dimKey(r[k]))).size;
  const crs=new Set();rows.forEach(r=>r.cr.forEach(c=>crs.add(dimKey(c.n))));
  /* 구분이 비어 있는 묶음은 개수에서 빼고, 모두 비어 있으면 구분 개수 · 범례를 아예 내지 않는다 (v120) */
  const named=root.kids.filter(k=>!k.blank);
  const cnt=[[named.length,L('구분','segments')],[uniq('media'),L('매체','media')],[uniq('product'),L('광고상품','products')],
    [uniq('target'),L('타깃 그룹','target groups')],[crs.size,L('소재','creatives')]];
  /* 견본 = 화면에 보이는 굵기(K × 배율)가 22px 를 넘지 않는 가장 큰 깔끔한 금액 — 요약 줄 높이가 흔들리지 않게 */
  const kv=K*(sc||1)/TOT;
  const scaleV=[1e9,5e8,1e8,5e7,1e7,5e6,1e6,5e5,1e5].find(v=>v<=TOT*1.0001&&kv*v<=22)||1e5;
  const scaleH=Math.max(1.8,kv*scaleV);
  if(!named.length)cnt.shift();
  el.innerHTML=`<div class="cs-cnt">${cnt.map(c=>`<span><b>${c[0]}</b>${esc(c[1])}</span>`).join('')}</div>`
    +`<div class="cs-lg"><span class="cs-scale">${L('가지 굵기 = 예산','Branch width = budget')}<i style="height:${scaleH.toFixed(1)}px"></i><b>${manUnitL(scaleV)}</b></span>`
    +(named.length?root.kids:[]).map(k=>`<span><i style="background:${k.hue}"></i><b>${esc(k.label)}</b>${pct(k.bud/TOT,1)}</span>`).join('')+`</div>`;}
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
    h=`<div class="t">${esc(CAMPAIGN.name||'')}</div>`+tr(L('예산','Budget'),won(bud))+tr(L('소진금액 (누적)','Spend (to date)'),won(cost))
      +tr(L('클릭 · CTR','Clicks · CTR'),`${fmt(click)} · ${ctr}`)+`<div class="tsec">${L('누르면 모두 펼칩니다','Click to expand all')}</div>`;
    return h;}
  const sp=(()=>{let p=n;while(p.depth>1)p=p.parent;return p;})(),seg=sp.label;
  h=`<div class="t">${esc(n.label)}</div><div style="opacity:.7;margin:-3px 0 6px">${esc(csDimName(n.dim))}${n.dim!=='seg'&&!sp.blank?' · '+esc(seg):''}</div>`;
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
    if(csDims().indexOf('target')>csDims().indexOf('media'))h+=tr(L('타깃','Target'),l.target||joinMulti(lineTargets(l))||'–');
    if(l.bid)h+=tr(L('비드 · 단가','Bid · price'),`${l.bid} ${fmt(+l.price||0)}`);
    h+=tr(L('기간','Period'),`${(l.start||'').replace(/-/g,'.')} – ${(l.end||'').replace(/-/g,'.')}`);}
  else if(n.dim!=='seg')h+=tr(L('라인','Lines'),`${ls.length}${L('개','')} · ${[...new Set(ls.map(l=>l.media))].join(', ')}`);
  else h+=tr(L('구성','Make-up'),`${L('라인','lines')} ${ls.length} · ${L('매체','media')} ${new Set(ls.map(l=>dimKey(l.media))).size}`);
  h+=tr(L('소진금액 (누적)','Spend (to date)'),`${won(cost)}${bud?' · '+pct(cost/bud,1):''}`)
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
  if(crKey){CS.N.vis.filter(m=>m.depth===4&&(m.cr||[]).some(c=>dimKey(c.n)===crKey)).forEach(up);}
  else CS.N.vis.filter(m=>m===n||(m.dim===n.dim&&m.dim!=='root'&&dimKey(m.label)===dimKey(n.label))).forEach(m=>{up(m);down(m);hot.add(m.i);});
  if(n&&n.dim==='root'){csHot(null);return;}
  map.classList.add('cs-hov');
  map.querySelectorAll('[data-nid]').forEach(e=>{const id=+e.dataset.nid;
    let ok=on.has(id);
    if(e.classList.contains('cs-chip')&&crKey)ok=ok&&e.dataset.cr===crKey;
    e.classList.toggle('cs-on',ok);e.classList.toggle('cs-hot',hot.has(id)&&e.classList.contains('cs-n'));});}
function csToggle(n){
  if(n.dim==='root'){CS.collapsed={};CS.expanded={};CS.depth=5;csSave();csPaintCtl();renderStruct();return;}
  if(!n.kids.length&&n.depth!==4)return;
  if(n.depth<csMinDepth())return;          /* 매체까지는 늘 펼친다 (v120.2) */
  const key=n.i+'|'+n.label;
  const leaf=n.depth===4;
  const open=leaf?(!CS.collapsed[key]&&(CS.depth>=5||CS.expanded[key])):(!CS.collapsed[key]&&(n.depth<CS.depth||CS.expanded[key]));
  const limited=leaf?CS.depth<5:n.depth>=CS.depth;
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
        const uses=CS.N.vis.filter(m=>m.depth===4&&(m.cr||[]).some(x=>dimKey(x.n)===dimKey(c.n))).length;
        CS.tipC=`<div class="t">${esc(c.n)}</div><div style="opacity:.7;margin:-3px 0 6px">${esc(csDimName('creative'))} · ${esc(h.n.label)}</div>`
          +`<div class="r"><span class="l">${L(`${csDimName(h.n.dim)} 안 비중`,`Within ${csDimName(h.n.dim).toLowerCase()}`)}</span><b>${(h.n.cr.length>1?pct(c.v,1):L('단독 소재','Only creative'))}</b></div>`
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
/* 그림 복사 — 카드 오른쪽 위 복사 단추(20-cardcopy)와 같은 그림. 도구 줄에도 둔다(카드 단추는 마우스를 올려야 보여서) */
async function csCopy(btn){
  const card=document.querySelector('#sub-struct .cs-card');if(!card||btn.__busy)return;
  btn.__busy=1;const lb=btn.textContent;btn.classList.add('busy');
  const done=t=>{btn.textContent=t;setTimeout(()=>{btn.textContent=lb;btn.__busy=0;btn.classList.remove('busy');},1400);};
  const dl=async()=>{ccDownload(await ccRender(card),card);done(L('✓ PNG 로 저장','✓ Saved as PNG'));};
  try{
    if(navigator.clipboard&&navigator.clipboard.write&&window.ClipboardItem&&window.isSecureContext){
      await navigator.clipboard.write([new ClipboardItem({'image/png':ccRender(card)})]);done(L('✓ 복사했습니다','✓ Copied'));return;}
    await dl();
  }catch(e){console.warn('구조 복사',e);try{await dl();}catch(x){done(L('복사하지 못했습니다','Copy failed'));}}}
/* 위쪽 도구 — 화면 맞춤 · 흐름 효과 · 가지 순서 · 펼침 */
function csPaintCtl(){
  const sw=$('csFlowSw');if(sw)sw.classList.toggle('on',!!CS.flow);
  const fw=$('csFitSw');if(fw)fw.classList.toggle('on',!!CS.fit);
  const os=$('csOrderSel');if(os){
    os.innerHTML=`<option value="media">${L('매체 › 타깃 › 광고상품','Media › Target › Product')}</option>`
      +`<option value="product">${L('매체 › 광고상품 › 타깃','Media › Product › Target')}</option>`
      +`<option value="target">${L('타깃 › 매체 › 광고상품','Target › Media › Product')}</option>`;
    os.value=csOrder();CS.pOrd=csOrder();}
  const ds=$('csDepthSel');if(ds){const d=csDims().map(csDimName).concat([csDimName('creative')]),mn=csMinDepth();
    if(CS.depth<mn)CS.depth=mn;
    ds.innerHTML=d.map((x,i)=>i+1<mn?'':`<option value="${i+1}">${L('','to ')}${esc(x)}${L('까지','')}</option>`).join('');ds.value=String(CS.depth);}}
function csWire(){
  if(CS.wired)return;CS.wired=1;
  const sw=$('csFlowSw');
  if(sw)sw.onclick=()=>{CS.flow=!CS.flow;csSave();sw.classList.toggle('on',CS.flow);
    const m=$('csMap');if(m)m.classList.toggle('cs-noflow',!CS.flow);};
  const cb=$('csCopyBtn');if(cb)cb.onclick=()=>csCopy(cb);
  const fw=$('csFitSw');
  if(fw)fw.onclick=()=>{CS.fit=!CS.fit;csSave();fw.classList.toggle('on',CS.fit);renderStruct();};
  /* 화면 맞춤은 창 높이도 따른다 (폭은 아래 ResizeObserver) */
  addEventListener('resize',()=>{if(!CS.fit||!CS.W||Math.abs(innerHeight-CS.vh)<6)return;
    clearTimeout(CS.t2);CS.t2=setTimeout(renderStruct,160);});
  /* 시행사(저장할 수 있는 화면)가 고르면 이 캠페인의 기본 순서로 문서에 저장 — 광고주 화면도 같은 순서로 열린다.
     광고주가 고른 것은 이 캠페인 · 이 화면에서만 */
  const os=$('csOrderSel');if(os)os.onchange=()=>{const v=CS_ORDERS[os.value]?os.value:'media';
    let sv=false;try{sv=canSaveView();}catch(e){}
    if(sv){CAMPAIGN.csOrder=v==='media'?'':v;CS.ovr=null;try{markDirty();saveLocal();}catch(e){}}
    else CS.ovr={k:csCampKey(),o:v};
    CS.collapsed={};CS.expanded={};csPaintCtl();renderStruct();};
  const ds=$('csDepthSel');if(ds)ds.onchange=()=>{CS.depth=Math.max(csMinDepth(),Math.min(5,+ds.value||5));CS.collapsed={};CS.expanded={};csSave();renderStruct();};
  csPaintCtl();
  /* 화면 밖이면 흐름을 멈춘다 · 폭이 바뀌면(메뉴 옮김 · 창 크기 · 숨김 → 보임) 다시 그린다 */
  try{CS.io=new IntersectionObserver(es=>es.forEach(x=>x.target.classList.toggle('cs-pause',!x.isIntersecting)));}catch(e){}
  try{const w=$('csWrap');CS.ro=new ResizeObserver(()=>{const nw=w.clientWidth;
      if(Math.abs(nw-CS.W)<3)return;
      /* 되먹임 막기 — 다시 그린 직후 스크롤바 폭만큼(24px 이하) 줄었다 늘었다 하는 것은 따라가지 않는다 */
      const now=Date.now();CS.rh=(CS.rh||[]).filter(t=>now-t<2500);
      if(CS.rh.length>=3&&nw>60&&CS.W>60&&Math.abs(nw-CS.W)<=24)return;
      CS.rh.push(now);
      clearTimeout(CS.t);CS.t=setTimeout(renderStruct,nw>60&&CS.W<60?0:140);});
    CS.ro.observe(w);}catch(e){}}
/* 언어를 바꾸면 도구 글자도 */
setTimeout(()=>{try{csWire();csPaintCtl();renderStruct();}catch(e){console.warn('struct',e);}
  /* 영역 설명(ⓘ) — 영역 관리 대상이 아니라 wireHide 가 붙이지 않으므로 여기서 */
  try{const t=document.querySelector('#csSec .tools');if(t&&SECT_INFO.struct)attachInfo(t,SECT_INFO.struct,'캠페인 구조');}catch(e){}},0);
