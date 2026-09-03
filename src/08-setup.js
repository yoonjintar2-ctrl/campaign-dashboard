/* ===== 10. 캠페인 설정 ===== */
function renderCampForm(){
  const gross=sum(LINES.map(lineGross)),net=sum(LINES.map(lineNet)),val=sum(LINES.map(lineValue));
  $('campForm').innerHTML=`
    <div class="fld" style="flex:2;min-width:250px"><label>캠페인명</label>
      <div class="ro ell" title="${esc(CAMPAIGN.name||'')}">${esc(CAMPAIGN.name||'–')}</div></div>
    <div class="fld" style="flex:1.4;min-width:190px"><label>광고주</label>
      <div class="ro ell" title="${esc(CAMPAIGN.advertiser||'')}">${esc(CAMPAIGN.advertiser||'–')}</div></div>
    <div class="fld" style="width:124px"><label>시작일 (자동)</label><div class="ro">${campStart()}</div></div>
    <div class="fld" style="width:124px"><label>종료일 (자동)</label><div class="ro">${campEnd()}</div></div>
    <div class="fld" style="width:160px"><label>Gross 예산 (합계)</label><div class="ro">${won(gross)}</div></div>
    <div class="fld" style="width:160px"><label>Net 예산 (자동 역산)</label><div class="ro">${won(net)}</div></div>
    <div class="fld" style="width:210px"><label>Value (합계)</label>
      <div class="ro">${won(val)}<span style="color:var(--muted);font-weight:600;margin-left:7px">보너스율 ${pct(bonusRate(LINES),1)}</span></div></div>
    <div class="fld" style="width:120px"><label>평균 수수료율</label><div class="ro">${((1-net/gross)*100).toFixed(2)}%</div></div>`;
}
/* 라인 표 — 열 정의 기반 (열 설정에서 on/off) */
/* 라인 표 열 — 고정 열(차원·KPI) + 항목 사전의 "예상효율&미디어믹스 사용 가능" 항목 */
/* 열 너비는 화면에 최대한 많은 열이 들어오도록 좁게 잡는다 */
/* 필수 표시는 매체 · 광고상품 둘뿐 — 나머지는 열 설정에서 자유롭게 켜고 끈다 */
const LINE_REQ=['media','product'];
const LINE_FIXED=[
  {k:'segment',l:'구분',w:88,type:'auto',on:false},
  {k:'media',l:'매체',w:92,type:'auto',on:true,lock:1},
  {k:'product',l:'광고상품',w:150,type:'chips',on:true,lock:1},
  {k:'slot',l:'광고 지면',w:150,type:'chips',on:false},
  {k:'target',l:'타겟팅 그룹',w:164,type:'chips',on:true},
  {k:'creative',l:'소재',w:180,type:'chips',on:true},
  {k:'line',l:'제품',w:96,type:'auto',on:false},
  {k:'device',l:'디바이스',w:118,type:'dev',on:false},
  {k:'sec',l:'소재 초수',w:74,type:'num',on:false},
  {k:'bid',l:'비드 타입',w:84,type:'bid',on:true,g:'집행 조건'},
  {k:'price',l:'판매 단가',w:80,type:'num',on:true,g:'집행 조건'},
  {k:'kpi',l:'KPI 지표',w:84,type:'kpi',on:true,g:'KPI'},
  {k:'sub',l:'보조 지표',w:84,type:'subm',on:false,g:'KPI'}
];
const LINE_LABEL={budget:'Gross 예산',net:'Net 예산 (자동)'};
/* 사전에서 온 열의 입력 방식 */
const LINE_TYPE={start:'date',end:'date',startT:'time',endT:'time',
  feeA:'pct',feeR:'pct',net:'ro',budget:'gross',value:'val',bonus:'num',bonusRate:'ro2'};
/* 예상 효율 표의 기본 표시 열 */
const LINE_DEF_ON=['media','product','target','creative','bid','price','start','end','kpi',
  'e_imp','e_click','e_view','budget'];
const lineColsDefault=(function(){
  const grp=f=>f.cat==='운영'?'집행 조건':f.cat==='비용'?'예산':'예상 수치';
  const dyn=FIELDS.filter(f=>f.mixOk&&!['cpm','cpc','cpv','cpa','cpi','cpe','ctr','vtr','cvr','etr','cost'].includes(f.k))
    .map(f=>({k:f.k,l:f.k.startsWith('e_')?f.l.replace('목표','예상'):f.l,
      w:f.k.startsWith('e_')?120:106,type:LINE_TYPE[f.k]||'exp',on:LINE_DEF_ON.includes(f.k),g:grp(f)}))
    .map(c=>LINE_LABEL[c.k]?{...c,l:LINE_LABEL[c.k]}:c);
  const order=['집행 조건','KPI','예상 수치','예산'];
  const out=LINE_FIXED.filter(c=>!c.g).concat(
    order.flatMap(g=>LINE_FIXED.filter(c=>c.g===g).concat(dyn.filter(c=>c.g===g))));
  out.push({k:'note',l:'비고',w:280,type:'note',on:LINE_DEF_ON.includes('note')});
  return out;});
let LINE_COLS=lineColsDefault();
const GKEY={e_imp:'imp',e_click:'click',e_view:'view'};
const lineOpts=k=>[...new Set(LINES.map(l=>l[k]).filter(Boolean))];

/* ---- 여러 개를 한 칸에 담는 차원 ----
   광고상품 · 광고 지면 · 타겟팅 그룹 · 소재는 한 라인에 여러 개가 들어갈 수 있다.
   (패키지로 파는 광고상품, 한 예산으로 함께 돌리는 타겟팅·소재 등)
   라인에는 배열(products/slots/targets/creatives)로 두고,
   집계용 차원 값(l.product 등)은 " · " 로 이어 붙인 한 덩어리로 유지한다. */
const MULTI_DIMS=['product','slot','target','creative'];
/* 콤마 · 가운뎃점 · 앰퍼샌드 어느 쪽으로 적어도 나눠 읽는다 */
const MULTI_SPLIT=/[,\u00b7\u2022&]/;
const parseMulti=v=>String(v==null?'':v).split(MULTI_SPLIT).map(x=>x.trim()).filter(Boolean);
const joinMulti=a=>a.join(' · ');
const lineCreatives=l=>Array.isArray(l.creatives)?l.creatives
  :CREATIVES.filter(c=>c.lid===l.id).map(c=>c.name);
const lineTargets=l=>Array.isArray(l.targets)?l.targets:parseMulti(l.target);
const lineProducts=l=>Array.isArray(l.products)&&l.products.length?l.products:parseMulti(l.product);
const lineSlots=l=>Array.isArray(l.slots)?l.slots:parseMulti(l.slot);
/* 차원 이름 → 그 라인의 항목 배열 */
const lineMulti=(l,k)=>k==='creative'?lineCreatives(l):k==='target'?lineTargets(l)
  :k==='product'?lineProducts(l):k==='slot'?lineSlots(l):(l[k]?[l[k]]:[]);
const allCreativeNames=()=>[...new Set(CREATIVES.map(c=>c.name)
  .concat(LINES.flatMap(lineCreatives)))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
const allTargetNames=()=>[...new Set(LINES.flatMap(lineTargets))]
  .filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
const allProductNames=()=>[...new Set(LINES.flatMap(lineProducts))]
  .filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
const allSlotNames=()=>[...new Set(LINES.flatMap(lineSlots))]
  .filter(Boolean).sort((a,b)=>a.localeCompare(b,'ko'));
const GRADS=['linear-gradient(140deg,#93a9bf,#354758)','linear-gradient(140deg,#b3c1cf,#495e72)',
  'linear-gradient(140deg,#93a2b1,#35536f)','linear-gradient(140deg,#aabbcb,#495e72)',
  'linear-gradient(140deg,#bfcad6,#495e72)'];
/* 칩 목록을 CREATIVES(집계 원천)에 그대로 반영 — 콤마 문자열이 아니라 실제 소재 레코드로 */
function setLineCreatives(l,names){
  names=[...new Set(names.map(s=>String(s).trim()).filter(Boolean))];
  l.creatives=names;
  CREATIVES=CREATIVES.filter(c=>c.lid!==l.id||names.includes(c.name));
  names.forEach((n,i)=>{
    if(CREATIVES.some(c=>c.lid===l.id&&c.name===n))return;
    CREATIVES.push({id:uid(),lid:l.id,name:n,type:/9:16|story|reels/i.test(n)?'video':'image',
      ratio:'16:9',g:GRADS[(CREATIVES.length+i)%GRADS.length],
      run:[[0,Math.max(TOTAL_DAYS-1,0)]],share:1});});
  const cs=CREATIVES.filter(c=>c.lid===l.id);
  cs.forEach(c=>c.share=1/Math.max(cs.length,1));
  buildFacts();
}
function setLineTargets(l,names){
  names=[...new Set(names.map(s=>String(s).trim()).filter(Boolean))];
  l.targets=names;
  l.target=joinMulti(names)||'(미지정)';   /* 집계 차원 값은 하나로 유지 */
  buildFacts();
}
function setLineProducts(l,names){
  names=[...new Set(names.map(s=>String(s).trim()).filter(Boolean))];
  l.products=names;
  l.product=joinMulti(names);
  buildFacts();
}
function setLineSlots(l,names){
  names=[...new Set(names.map(s=>String(s).trim()).filter(Boolean))];
  l.slots=names;
  l.slot=joinMulti(names);
  buildFacts();
}
/* 칩 필드 종류별 동작 — 이름표 · 현재 값 · 저장 · 고를 수 있는 목록 */
const CHIP_KIND={
  creative:{label:'소재',      get:lineCreatives,set:setLineCreatives,all:allCreativeNames},
  target:  {label:'타겟팅 그룹',get:lineTargets,  set:setLineTargets,  all:allTargetNames},
  product: {label:'광고상품',   get:lineProducts, set:setLineProducts, all:allProductNames},
  slot:    {label:'광고 지면',  get:lineSlots,    set:setLineSlots,    all:allSlotNames}};
/* 기본은 "이미 등록된 항목 중에서 고르기". 새 이름이 필요할 때만 ＋ 버튼으로 직접 추가한다. */
function chipFieldHTML(kind,li,items){
  return `<div class="chipfield" data-cf="${kind}" data-l="${li}">`
    +items.map(v=>`<span class="cfchip">${esc(v)}`
      +`<b class="ed" data-ed="${esc(v)}" title="이름 수정">✎</b>`
      +`<b data-rm="${esc(v)}" title="삭제">✕</b></span>`).join('')
    +`<button type="button" class="cfpick" title="등록된 항목에서 선택">선택 ▾</button>`
    +`<button type="button" class="cfadd" title="새 항목 직접 추가">＋</button></div>`;
}
function wireChipFields(root,onChange){
  root.querySelectorAll('.chipfield').forEach(fd=>{
    const kind=fd.dataset.cf,li=+fd.dataset.l,l=LINES[li];
    const K=CHIP_KIND[kind];if(!K||!l)return;
    const label=K.label;
    const cur=()=>K.get(l);
    const set=v=>{K.set(l,v);onChange();};
    fd.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{
      e.stopPropagation();set(cur().filter(x=>x!==b.dataset.rm));});
    fd.querySelectorAll('[data-ed]').forEach(b=>b.onclick=e=>{
      e.stopPropagation();openChipRename(kind,b.dataset.ed,l,onChange);});
    /* 선택 ▾ — 등록된 목록에서 고르기 (기본 동작)
       표 안에 그리면 스크롤 영역에 잘리므로 body에 fixed로 띄우고, 아래가 좁으면 위로 연다 */
    const pickBtn=fd.querySelector('.cfpick');
    pickBtn.onclick=e=>{
      e.stopPropagation();
      document.querySelectorAll('.cfmenu').forEach(m=>m.remove());
      const pool=K.all().filter(n=>!cur().includes(n));
      const m=el('div','cfmenu',document.body);
      m.innerHTML=`<div class="mt">등록된 ${label}</div>`
        +(pool.length?pool.map(n=>`<button class="mi" data-pick="${esc(n)}">${esc(n)}</button>`).join('')
                     :`<div class="mt" style="color:var(--muted)">추가할 ${label}이 없습니다 · ＋로 새로 만드세요</div>`);
      const r=pickBtn.getBoundingClientRect();
      const mh=Math.min(m.scrollHeight||210,240);
      const below=window.innerHeight-r.bottom;
      m.style.left=Math.min(r.left,window.innerWidth-m.offsetWidth-10)+'px';
      if(below<mh+12&&r.top>mh+12)m.style.top=(r.top-mh-6)+'px';
      else m.style.top=(r.bottom+5)+'px';
      m.querySelectorAll('[data-pick]').forEach(b=>b.onclick=ev=>{
        ev.stopPropagation();m.remove();set(cur().concat([b.dataset.pick]));});
      setTimeout(()=>document.addEventListener('click',function h(){m.remove();
        document.removeEventListener('click',h);},{once:true}),0);};
    /* ＋ — 목록에 없는 새 항목 만들기 */
    fd.querySelector('.cfadd').onclick=e=>{
      e.stopPropagation();
      const n=prompt(`새 ${label} 이름 (쉼표로 여러 개 한 번에)`);
      if(!n)return;
      const parts=n.split(',').map(x=>x.trim()).filter(Boolean);
      if(parts.length)set(cur().concat(parts));};
  });
}
/* 이미 등록된 광고상품 · 광고 지면 · 타겟팅 그룹 · 소재의 이름을 고친다.
   같은 이름을 여러 라인에서 쓰고 있으면 "이 라인만" 바꿀지 "전부 함께" 바꿀지 물어본다. */
function openChipRename(kind,old,line,onChange){
  const K=CHIP_KIND[kind];if(!K)return;
  const used=LINES.filter(x=>K.get(x).includes(old));
  const many=used.length>1;
  openModal(`${K.label} 이름 수정`,
    `<div class="fld"><label>새 이름</label>
       <input class="txt" id="chipNew" value="${esc(old)}" style="width:100%"></div>
     <div class="hint" style="margin-top:9px">
       "${esc(old)}" 은(는) 지금 <b>${used.length}개 라인</b>에서 쓰고 있습니다.
       ${many?'다른 라인도 함께 바꿀지 골라 주세요.':''}</div>`,
    `<button class="btn" data-close>취소</button>`
    +(many?`<button class="btn" id="chipOne">이 라인만 바꾸기</button>`:'')
    +`<button class="btn primary" id="chipAll">${many?`전체 ${used.length}개 함께 바꾸기`:'저장'}</button>`,
    {w:460});
  const apply=lines=>{
    const nv=($('chipNew').value||'').trim();
    if(!nv||nv===old){closeModal();return;}
    /* 소재는 이미지·미리보기가 달린 실제 레코드라 이름만 갈아 끼운다 */
    if(kind==='creative')
      CREATIVES.forEach(c=>{if(c.name===old&&lines.some(x=>x.id===c.lid))c.name=nv;});
    lines.forEach(x=>K.set(x,K.get(x).map(n=>n===old?nv:n)));
    closeModal();
    buildFacts();
    if(onChange)onChange(); else {renderKpiTable();renderAll();}};
  const one=$('chipOne');if(one)one.onclick=()=>apply([line]);
  $('chipAll').onclick=()=>apply(many?used:[line]);
  setTimeout(()=>{const i=$('chipNew');if(i){i.focus();i.select();}},30);
}
function renderKpiTable(){
  const t=$('tblKpi'),cols=LINE_COLS.filter(c=>c.on);
  let dl='';['segment','media','product','target','line'].forEach(k=>{
    dl+=`<datalist id="ld-${k}">${lineOpts(k).map(o=>`<option value="${esc(o)}">`).join('')}</datalist>`;});
  let prevG=null;
  const head=cols.map(c=>{const sep=(c.g||'')!==prevG;prevG=c.g||'';
    const gk=GKEY[c.k];
    return `<th class="${sep?'gsep':''}" style="min-width:${c.w}px">${c.l}</th>`;}).join('');
  /* 행 조작(복제 · 삭제)은 맨 앞 열로 — 표가 가로로 길어 오른쪽 끝까지 가기 번거로웠다 */
  let h=`<thead><tr><th class="rm" rowspan="1" style="width:74px">`
    +`<button class="btn sm danger" id="lineClearAll" title="예상 효율 값을 모두 지웁니다"`
    +` style="padding:0 6px">✕</button></th>${head}</tr></thead><tbody>`;
  LINES.forEach((l,i)=>{
    prevG=null;
    h+=`<tr><td class="rm" style="white-space:nowrap;padding-left:3px;padding-right:3px">`
      +`<button class="btn sm" data-ldup="${i}" title="이 행을 같은 값으로 복제" style="padding:0 6px">⧉</button>`
      +`<button class="btn sm danger" data-ldel="${i}" title="행 삭제" style="padding:0 6px;margin-left:3px">✕</button></td>`
      +cols.map(c=>{
      const sep=(c.g||'')!==prevG;prevG=c.g||'';
      const cls=`${sep?'gsep ':''}`;
      const gk=GKEY[c.k],isG=gk&&l.g&&l.g[gk];
      const inp=v=>`<input class="${v}" data-l="${i}" data-k="${c.k}"`;
      switch(c.type){
        case 'auto':return `<td class="${cls}">${inp('txt')} list="ld-${c.k}" value="${esc(l[c.k]||'')}"></td>`;
        case 'text':return `<td class="${cls}">${inp('txt')} value="${esc(l[c.k]||'')}"></td>`;
        case 'chips':return `<td class="${cls}">${chipFieldHTML(c.k,i,(CHIP_KIND[c.k]||CHIP_KIND.target).get(l))}</td>`;
        case 'date':return `<td class="${cls}">${inp('')} type="date" value="${l[c.k]||''}"></td>`;
        case 'time':return `<td class="${cls}">${inp('')} type="time" value="${l[c.k]||''}"></td>`;
        case 'bid':return `<td class="${cls}"><select data-l="${i}" data-k="bid"><option value=""${l.bid?'':' selected'}>선택</option>${BID_TYPES.map(b=>`<option ${l.bid===b?'selected':''}>${b}</option>`).join('')}<option value="__add">+ 항목 추가…</option></select></td>`;
        case 'kpi':return `<td class="${cls}"><select data-l="${i}" data-k="kpi" title="비워 두면 비드 타입으로 판단합니다"><option value=""${l.kpi?'':' selected'}>자동 (${KPI_LABEL[kpiOf(l)]})</option>${KPI_KEYS.map(k=>`<option value="${k}" ${l.kpi===k?'selected':''}>${KPI_LABEL[k]}</option>`).join('')}</select></td>`;
        case 'subm':return `<td class="${cls}"><select data-l="${i}" data-k="sub"><option value="">–</option>${Object.entries(RATE_LABEL).map(([k,v])=>`<option value="${k}" ${l.sub===k?'selected':''}>${v}</option>`).join('')}</select></td>`;
        case 'dev':return `<td class="${cls}"><span style="display:flex;gap:5px;justify-content:center">${DEVICES.map(d=>
          `<label class="gchk"><input type="checkbox" data-dev="${i}" value="${d}" ${l.device.includes(d)?'checked':''}>${d}</label>`).join('')}</span></td>`;
        case 'exp':{const m=c.k.slice(2);
          return `<td class="expcell ${cls}${isG?'gt':''}"><span class="gwrap">
            ${inp('num')} data-e="${m}" value="${l.e[m]?fmt(l.e[m]):''}">
            ${gk?`<label class="gchk gwarr" title="게런티(보장) 지표 — 체크하면 보장 물량으로 봅니다"><span class="gl">보장</span><input type="checkbox" data-g="${i}" data-gk="${gk}" ${isG?'checked':''}></label>`:''}</span></td>`;}
        case 'ro2':return `<td class="${cls} mono" style="background:var(--acc-soft2)"><b>${pct(bonusRate([l]),1)}</b></td>`;
        case 'pct':return `<td class="${cls}">${inp('num')} value="${l[c.k]?((l[c.k]*100).toFixed(0)+'%'):''}"></td>`;
        case 'gross':return `<td class="${cls}">${inp('num')} value="${lineGross(l)?fmt(lineGross(l)):''}"></td>`;
        case 'val':return `<td class="${cls}">${inp('num')} value="${lineValue(l)?fmt(lineValue(l)):''}"></td>`;
        case 'ro':return `<td class="${cls} mono" style="background:var(--acc-soft2)"><b>${
          fmt(c.k==='net'?lineNet(l):c.k==='budget'?lineGross(l):lineValue(l))}</b></td>`;
        case 'note':return `<td class="${cls}"><textarea class="note" data-l="${i}" data-k="note">${esc(l.note||'')}</textarea></td>`;
        default:return `<td class="${cls}">${inp('num')} value="${l[c.k]?fmt(l[c.k]):''}"></td>`;}
    }).join('')+'</tr>';});
  /* TOTAL */
  const gross=sum(LINES.map(lineGross)),net=sum(LINES.map(lineNet));
  prevG=null;
  h+='<tr class="total"><td class="rm"></td>'+cols.map((c,ci)=>{
    const sep=(c.g||'')!==prevG;prevG=c.g||'';
    const cls=`${sep?'gsep ':''}mono`;
    let v='';
    if(ci===0)v='TOTAL';
    else if(c.type==='exp')v=fmt(sum(LINES.map(l=>l.e[c.k.slice(2)]||0)));
    else if(c.k==='net')v=fmt(net);
    else if(c.k==='budget')v=fmt(gross);
    else if(c.k==='bonus')v=fmt(sum(LINES.map(l=>l.bonus||0)));
    else if(c.k==='value')v=fmt(sum(LINES.map(lineValue)));
    else if(c.k==='feeA')v=((sum(LINES.map(l=>lineGross(l)*l.feeA))/gross)*100).toFixed(1)+'%';
    else if(c.k==='feeR')v=((sum(LINES.map(l=>lineGross(l)*l.feeR))/gross)*100).toFixed(1)+'%';
    return `<td class="${cls}">${v}</td>`;}).join('')+'</tr></tbody>'+dl;
  t.innerHTML=h;
  /* 머리글 끝을 끌어 열 너비 조정 — 값 열이 맨 앞부터라 off=0 */
  enableColResize(t,cols,()=>markDirty(),1);
  wireChipFields(t,()=>{rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderAll();});
  t.querySelectorAll('[data-k]').forEach(inp=>inp.onchange=e=>{
    pushLineUndo();
    const l=LINES[+e.target.dataset.l],k=e.target.dataset.k,v=e.target.value;
    const n=()=>+String(v).replace(/[^0-9.]/g,'')||0;
    if(k==='feeA'||k==='feeR'){const f=parseFloat(v.replace(/[^0-9.]/g,''));
      if(isFinite(f))l[k]=Math.min(Math.max(f/100,0),.9);}
    else if(k==='gross')l.gross=n();
    /* 밸류는 직접 입력 — 보너스는 Gross 와의 차액으로 맞춘다 (거꾸로도 성립) */
    else if(k==='value'){l.value=n();l.bonus=Math.max(0,l.value-lineGross(l));}
    else if(k==='bonus'){l.bonus=n();l.value=lineGross(l)+l.bonus;}
    else if(k==='price'||k==='sec')l[k]=n();
    else if(k==='bid'){if(v==='__add'){const nb=prompt('추가할 비드 타입 (예: 1주일, 1개월, CPP)');
        if(nb&&!BID_TYPES.includes(nb))BID_TYPES.push(nb);l.bid=nb||l.bid;}else l.bid=v;
      /* 비드 타입이 바뀌면 KPI 기본값을 자동으로 맞춘다 (이후 KPI 열에서 직접 변경 가능) */
      /* KPI 를 따로 고르지 않았으면 kpiOf() 가 비드 타입으로 알아서 판단한다 */}
    else l[k]=v;
    if(k==='start'||k==='end')rebuildPeriod();
    buildFacts();renderKpiTable();renderCampForm();renderAll();});
  t.querySelectorAll('[data-e]').forEach(inp=>inp.onchange=e=>{
    pushLineUndo();
    LINES[+e.target.dataset.l].e[e.target.dataset.e]=+e.target.value.replace(/[^0-9]/g,'')||0;
    renderKpiTable();renderMix();renderAll();});
  t.querySelectorAll('[data-g]').forEach(cb=>cb.onchange=e=>{
    pushLineUndo();
    LINES[+e.target.dataset.g].g[e.target.dataset.gk]=e.target.checked;renderKpiTable();renderMix();});
  t.querySelectorAll('[data-dev]').forEach(cb=>cb.onchange=e=>{
    const l=LINES[+e.target.dataset.dev],v=e.target.value;
    l.device=e.target.checked?[...new Set([...l.device,v])]:l.device.filter(x=>x!==v);});
  /* 헤더의 ✕ = 예상 효율 모두 지우기 (확인 후 실행) */
  const ca=$('lineClearAll');
  if(ca)ca.onclick=()=>confirmModal('예상 효율을 모두 지울까요?',
    `${LINES.length}개 라인이 모두 사라집니다. 되돌리려면 Ctrl+Z 를 누르세요.`,
    ()=>{pushLineUndo();LINES=[];CREATIVES=[];
      rebuildPeriod();buildFacts();buildFilters();buildSelects();
      renderKpiTable();renderCampForm();renderMix();renderAll();},'모두 지우기');
  t.querySelectorAll('[data-ldel]').forEach(b=>b.onclick=()=>{
    pushLineUndo();LINES.splice(+b.dataset.ldel,1);rebuildPeriod();buildFacts();
    renderKpiTable();renderCampForm();renderAll();});
  /* 행 복제 — 같은 값으로 한 줄 더 */
  t.querySelectorAll('[data-ldup]').forEach(b=>b.onclick=()=>{
    pushLineUndo();
    const i=+b.dataset.ldup,src=LINES[i];
    const n=JSON.parse(JSON.stringify({...src,daily:undefined}));
    n.id='L'+Math.random().toString(36).slice(2,7);n.daily={};
    LINES.splice(i+1,0,n);
    /* 소재·타겟팅은 실제 레코드까지 함께 복제한다 */
    setLineTargets(n,lineTargets(src));setLineCreatives(n,lineCreatives(src));
    setLineProducts(n,lineProducts(src));setLineSlots(n,lineSlots(src));
    rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderMix();renderAll();});
  /* 셀 선택 — 클릭한 칸이 선택 상태가 된다 */
  [...(t.tBodies[0]?t.tBodies[0].rows:[])].forEach((tr,ri)=>{
    if(tr.classList.contains('total'))return;
    [...tr.cells].forEach((td,cx)=>{
      const ci=cx-1;                       /* 맨 앞은 행 조작(복제·삭제) 열 */
      if(ci<0||ci>=cols.length)return;
      td.dataset.r=ri;td.dataset.c=ci;
      /* 엑셀처럼 — 한 번 누르면 "셀 선택", Enter 또는 더블클릭이면 "입력 시작".
         드롭다운·날짜·체크박스·칩은 기존처럼 바로 눌러서 쓴다. */
      td.addEventListener('mousedown',e=>{
        LSEL={r:ri,c:ci};paintLSel();
        const tg=e.target;
        const isTxt=(tg.tagName==='INPUT'&&(tg.type==='text'||!tg.getAttribute('type')))||tg.tagName==='TEXTAREA';
        if(isTxt&&document.activeElement!==tg){
          e.preventDefault();
          if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}});
      td.addEventListener('dblclick',()=>{LSEL={r:ri,c:ci};paintLSel();editLineCell();});});});
  paintLSel();
}
/* ===== 예상 효율 — 키보드 편집 · 실행 취소 · 히스토리 · 중복 병합 ===== */
let LSEL=null;                                  /* 선택 셀 {r,c} */
const LCOLS=()=>LINE_COLS.filter(c=>c.on);
const lineTblCell=()=>{const t=$('tblKpi');
  return (t&&LSEL)?t.querySelector(`td[data-r="${LSEL.r}"][data-c="${LSEL.c}"]`):null;};
function paintLSel(){
  const t=$('tblKpi');if(!t)return;
  t.querySelectorAll('td.lsel').forEach(td=>td.classList.remove('lsel'));
  const td=lineTblCell();if(td)td.classList.add('lsel');
}
function editLineCell(){
  const td=lineTblCell();if(!td)return;
  const f=td.querySelector('input:not([type=checkbox]),select,textarea');
  if(f){f.focus();if(f.select)try{f.select();}catch(err){}return;}
  const p=td.querySelector('.cfpick');if(p)p.click();
}
function moveLSel(dr,dc){
  const maxR=Math.max(LINES.length-1,0),maxC=Math.max(LCOLS().length-1,0);
  const cl=(v,m)=>Math.max(0,Math.min(v,m));
  LSEL={r:cl((LSEL?LSEL.r:0)+dr,maxR),c:cl((LSEL?LSEL.c:0)+dc,maxC)};
  paintLSel();
  const td=lineTblCell();if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});
}
/* --- 실행 취소 / 다시 실행 --- */
const LUNDO=[],LREDO=[],LUNDO_MAX=60;
const snapLines=()=>JSON.stringify(LINES.map(l=>{const o={...l};delete o.daily;return o;}));
function pushLineUndo(){LUNDO.push(snapLines());if(LUNDO.length>LUNDO_MAX)LUNDO.shift();
  LREDO.length=0;markLineDirty();}
function applyLineSnap(s){
  LINES=JSON.parse(s).map(l=>({...l,daily:{}}));
  rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderMix();renderAll();}
function undoLines(){if(!LUNDO.length)return;LREDO.push(snapLines());applyLineSnap(LUNDO.pop());}
function redoLines(){if(!LREDO.length)return;LUNDO.push(snapLines());applyLineSnap(LREDO.pop());}
/* --- 저장 상태 · 히스토리 --- */
let LINE_DIRTY=null,lineAutoTimer=null,LINE_HIST=[];
function markLineDirty(){
  LINE_DIRTY=Date.now();clearTimeout(lineAutoTimer);
  /* 시안에서는 10분 대신 12초 뒤 자동 저장되는 것으로 시연한다 */
  lineAutoTimer=setTimeout(()=>commitLineSnap('자동 저장'),12000);
  const e=$('lineSaveState');if(e)e.textContent='변경됨 · 저장 대기';}
function commitLineSnap(kind){
  if(kind==='자동 저장'&&!LINE_DIRTY)return;
  const now=new Date();
  LINE_HIST.unshift({t:now,who:'윤석진',org:'미디어웍스',kind,snap:snapLines()});
  if(LINE_HIST.length>40)LINE_HIST.pop();
  LINE_DIRTY=null;
  const e=$('lineSaveState');if(e)e.textContent=`${kind} ${hhmm(now)}`;}
function openLineHistory(){
  let h=`<div class="notice" style="margin-bottom:12px"><span>ⓘ</span>
      <div><b>자동 저장 규칙</b> — 예상 효율을 고친 뒤 <b>10분 이상</b> 추가 입력이 없으면 그 시점의 표를 자동으로 저장합니다.
      되돌리면 그 시점의 예상 효율이 그대로 복원되고, 지금 입력한 값은 실행 취소(Ctrl+Z)로 다시 돌아올 수 있습니다.</div></div>
    <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:160px">반영 시각</th><th style="width:96px">입력자</th><th style="width:104px">소속</th>
      <th style="width:70px">라인</th><th>예상 노출</th><th>예상 클릭</th><th>예상 조회</th>
      <th>Gross 예산</th><th style="width:104px">상태</th><th style="width:118px"></th></tr></thead><tbody>`;
  LINE_HIST.forEach((hs,n)=>{
    const ls=JSON.parse(hs.snap);
    const g=k=>sum(ls.map(l=>+(l.e&&l.e[k])||0));
    const gross=sum(ls.map(lineGross));
    h+=`<tr><td class="mono">${hhmm(hs.t)}</td><td>${hs.who}</td><td>${hs.org}</td>
      <td class="mono">${ls.length}</td><td class="mono">${fmt(g('imp'))}</td><td class="mono">${fmt(g('click'))}</td>
      <td class="mono">${fmt(g('view'))}</td><td class="mono">${won(gross)}</td>
      <td><span class="tagchip ${hs.kind==='자동 저장'?'':'on'}">${hs.kind}</span></td>
      <td><button class="btn sm" data-lrb="${n}">이 시점으로 되돌리기</button></td></tr>`;});
  if(!LINE_HIST.length)h+='<tr><td colspan="10" class="hint" style="padding:18px">아직 저장된 시점이 없습니다.</td></tr>';
  openModal('예상 효율 · 입력 히스토리',h+'</tbody></table>','<button class="btn" data-close>닫기</button>',{w:1120});
  $('modalHost').querySelectorAll('[data-lrb]').forEach(b=>b.onclick=()=>{
    const hs=LINE_HIST[+b.dataset.lrb];
    confirmModal(`${hhmm(hs.t)} 시점으로 되돌릴까요?`,
      '지금 입력한 값은 실행 취소(Ctrl+Z)로 다시 돌아올 수 있습니다.',
      ()=>{LUNDO.push(snapLines());LREDO.length=0;applyLineSnap(hs.snap);
        const e=$('lineSaveState');if(e)e.textContent=`${hhmm(hs.t)} 시점으로 복원됨`;},'되돌리기');});}
/* --- 중복 라인 검사 · 합산 --- */
const DUP_KEYS=['segment','media','product','slot','target','start','end'];
function dupGroups(){
  const key=l=>DUP_KEYS.map(k=>String(l[k]||'')).join(SEP)
    +SEP+lineCreatives(l).slice().sort().join(',');
  const m=new Map();
  LINES.forEach((l,i)=>{const k=key(l);if(!m.has(k))m.set(k,[]);m.get(k).push(i);});
  return [...m.values()].filter(a=>a.length>1);}
function mergeDupLines(groups){
  const drop=new Set();
  groups.forEach(g=>{
    const base=LINES[g[0]];base.e=base.e||{};
    g.slice(1).forEach(i=>{const l=LINES[i];
      [...new Set(Object.keys(base.e).concat(Object.keys(l.e||{})))]
        .forEach(m=>base.e[m]=(+base.e[m]||0)+(+((l.e||{})[m])||0));
      base.a=base.a||{};
      [...new Set(Object.keys(base.a).concat(Object.keys(l.a||{})))]
        .forEach(m=>base.a[m]=(+base.a[m]||0)+(+((l.a||{})[m])||0));
      base.gross=(+base.gross||0)+(+l.gross||0);
      base.bonus=(+base.bonus||0)+(+l.bonus||0);
      base.note=[base.note,l.note].filter(Boolean).join(' / ');
      drop.add(i);});});
  LINES=LINES.filter((_,i)=>!drop.has(i));}
/* 예상 효율 저장 직전 점검 — 중복 라인이 있으면 합산할지 물어본다.
   저장 버튼이 없어진 뒤로는 상단바 ☁ 저장에서 부른다. after 를 주면 정리 후 이어서 실행한다. */
function saveLines(after){
  const gs=dupGroups();
  if(gs.length){
    const names=gs.map(a=>{const l=LINES[a[0]];
      return `${l.segment||'–'} · ${l.media||'–'} · ${l.product||'–'} · ${l.target||'–'} (${a.length}행)`;});
    confirmModal(`중복된 라인이 ${gs.length}건 있습니다.`,
      `구분 · 매체 · 광고상품 · 타겟팅 그룹 · 소재 · 시작일 · 종료일이 모두 같은 라인입니다 — ${names.join(' / ')}. `
      +'확인을 누르면 해당 라인의 예상 효율 데이터를 하나로 합산해 저장합니다.',
      ()=>{pushLineUndo();mergeDupLines(gs);
        rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderMix();renderAll();
        commitLineSnap('반영 완료');if(after)after();},'합산 후 저장');
    return;}
  rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderMix();renderAll();
  commitLineSnap('반영 완료');
  if(after)after();}
/* --- 키보드 — Enter 입력/완료 · 방향키 이동 · Ctrl+Z / Ctrl+Y --- */
document.addEventListener('keydown',e=>{
  const tab=$('tab-setup');if(!tab||tab.classList.contains('hidden'))return;
  if($('modalHost')&&$('modalHost').innerHTML)return;      /* 팝업이 열려 있으면 개입하지 않는다 */
  const t=$('tblKpi');if(!t)return;
  const ae=document.activeElement;
  const inTbl=!!(ae&&t.contains(ae));
  /* 표 밖의 입력칸(캠페인 정보·이슈 등)에서는 브라우저 기본 동작을 그대로 둔다 */
  if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&!inTbl)return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undoLines();return;}
  if(mod&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){e.preventDefault();redoLines();return;}
  if(!LSEL&&!inTbl)return;
  const typing=inTbl&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
  if(e.key==='Enter'){
    if(typing&&ae.tagName==='TEXTAREA'&&e.shiftKey)return;   /* 비고 줄바꿈 */
    e.preventDefault();
    if(typing){ae.blur();paintLSel();}                        /* 완료 → 셀 선택 상태 */
    else editLineCell();                                      /* 입력 시작 */
    return;}
  if(e.key==='Escape'&&typing){e.preventDefault();ae.blur();paintLSel();return;}
  const ARROW={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(!ARROW[e.key]||mod)return;
  /* 글자를 치는 중에는 좌우 방향키를 커서 이동에 양보한다 */
  if(typing&&(ae.tagName==='SELECT'||((e.key==='ArrowLeft'||e.key==='ArrowRight')&&ae.tagName!=='SELECT')))return;
  e.preventDefault();
  if(typing)ae.blur();
  moveLSel(...ARROW[e.key]);});
/* 기간을 다시 잡는다 — 날짜 배열만 새로 만들고 **입력된 일별 실적은 그대로 둔다**.
   예전에는 여기서 daily 를 매번 새로 만들어(spread) 사용자가 올린 데이터가 통째로 사라졌다. */
function rebuildPeriod(){
  d0=new Date(campStart()+'T00:00:00');dE=new Date(campEnd()+'T00:00:00');
  dT=new Date(CAMPAIGN.today+'T00:00:00');
  YESTERDAY=iso(new Date(dT.getTime()-DAY));
  TOTAL_DAYS=Math.round((dE-d0)/DAY)+1;ELAPSED=Math.min(Math.round((dT-d0)/DAY)+1,TOTAL_DAYS);
  ALLDATES=[...Array(TOTAL_DAYS)].map((_,i)=>new Date(d0.getTime()+i*DAY));
  dates=ALLDATES.slice(0,ELAPSED);
  /* 길이만 새 기간에 맞춘다 (모자라면 0 으로 채우고, 넘치면 자른다) */
  LINES.forEach(l=>{
    if(!l.daily)l.daily={};
    AMET.forEach(m=>{
      const a=Array.isArray(l.daily[m])?l.daily[m]:[];
      const b=new Array(TOTAL_DAYS).fill(0);
      for(let i=0;i<Math.min(a.length,TOTAL_DAYS);i++)b[i]=+a[i]||0;
      l.daily[m]=b;});});
}
/* 예시(샘플) 캠페인에서만 쓰는 가짜 일별 분포 — 실제 데이터가 있으면 절대 부르지 않는다 */
function seedDemoDaily(){
  LINES.forEach((l,i)=>{l.daily={};
    AMET.forEach((m,j)=>l.daily[m]=spread(l.a[m],ELAPSED,seeded(17+i*131+j*29),.3+.05*j));});
}
function openLineColCfg(){
  openColCfgUI({
    title:'예상 효율 · 열 설정',
    hint:'체크한 열만 예상 효율 표에 나타납니다. 필수 열은 매체 · 광고상품 두 개뿐이고, 나머지는 자유롭게 켜고 끌 수 있습니다.',
    cols:LINE_COLS,
    fixedKeys:LINE_REQ,
    allowFormula:false,
    ruleOf:c=>({auto:'캠페인에 등록된 값 중 선택 · 직접 입력 가능',
      chips:'등록된 항목에서 선택 · ＋로 신규 추가',
      date:'YYYY-MM-DD',time:'HH:MM',
      bid:'CPM · CPC · CPV · CPA …',kpi:'노출 · 클릭 · 조회 · 전환 …',
      subm:'보조로 함께 볼 지표',dev:'PC · MO · CTV 중 선택',
      exp:'제안 목표 수치 (숫자)',gross:'Gross 예산 · Net 자동 역산',val:'밸류 (직접 입력)',
      pct:'수수료율 (10 또는 10%)',ro:'자동 계산 — 입력하지 않습니다',
      ro2:'자동 계산 — 입력하지 않습니다',note:'자유 입력'})[c.type]||'숫자 입력',
    onSave:d=>{LINE_COLS=d;renderKpiTable();renderMix();}});
}
const MIX_CATALOG=fieldCatalog('mix').concat([
  {g:'KPI',cols:[{k:'kpi',l:'KPI 지표'},{k:'kpiGoal',l:'KPI 목표 수'}]},
  {g:'기타',cols:[{k:'note',l:'비고'},{k:'period',l:'기간'},
  {k:'price',l:'판매단가'},{k:'device',l:'디바이스'},{k:'sec',l:'소재 초수'},{k:'share',l:'예산 비중'}]}]);
const MIX_DEF={};MIX_CATALOG.forEach(g=>g.cols.forEach(c=>MIX_DEF[c.k]=c));
let MIX_CFG={rows:[{k:'segment',sub:true},{k:'media',sub:true},{k:'product',sub:false},{k:'target',sub:false}],
  order:null,
  groups:[
    {id:uid(),name:'기간',cols:['period']},
    {id:uid(),name:'KPI',cols:['kpi','kpiGoal']},
    {id:uid(),name:'예산',cols:['budget','value','bonusRate','price']},
    {id:uid(),name:'노출 효과',cols:['e_imp','cpm']},
    {id:uid(),name:'클릭 효과',cols:['e_click','ctr','cpc']},
    {id:uid(),name:'조회 효과',cols:['e_view','vtr','cpv']},
    {id:uid(),name:'기타',cols:['note']}
  ].map(g=>({...g,cols:g.cols.filter(k=>MIX_DEF[k])}))};
const md=s=>mdy(s);   /* M/D (앞에 0 없이) */
function mixRows(){
  const dims=MIX_CFG.rows.map(r=>r.k);
  const useCr=dims.includes('creative'),base=[];
  LINES.forEach(l=>{
    if(useCr){const cs=CREATIVES.filter(c=>c.lid===l.id);
      (cs.length?cs:[{name:'–'}]).forEach(c=>base.push({l,creative:c.name}));}
    else base.push({l,creative:'–'});});
  return base.map(r=>({...r,vals:dims.map(d=>d==='creative'?r.creative:r.l[d]),
    key:dims.map(d=>d==='creative'?r.creative:r.l[d]).join(SEP)}));
}
function renderMix(){
  const dims=MIX_CFG.rows.map(r=>r.k),cols=cfgCols(MIX_CFG),seps=gsepSet(MIX_CFG);
  const rows=mixRows();
  const grouped=new Map();
  rows.forEach(r=>{if(!grouped.has(r.key))grouped.set(r.key,[]);grouped.get(r.key).push(r);});
  let entries=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ko'));
  entries=applyOrder(entries,MIX_CFG);
  const keys=entries.map(e=>e[0].split(SEP));
  const {out,span}=pivotLayout(keys,MIX_CFG.rows);
  const totalBudget=sum(LINES.map(lineGross));
  const linesOf=rs=>[...new Set(rs.map(r=>r.l))];
  const cell=(rs,k,tot)=>{
    const ls=linesOf(rs);
    const b=aggExp(ls),gross=sum(ls.map(lineGross)),net=sum(ls.map(lineNet)),val=sum(ls.map(lineValue));
    const one=ls.length===1?ls[0]:null;
    const g=key=>ls.length>0&&ls.every(l=>l.g&&l.g[key]);
    const wrap=(v,key)=>g(key)?`<b class="gt">${v}</b>`:v;
    /* 집행 조건 · 기타 */
    switch(k){
      case 'period':return one?`${md(one.start)}~${md(one.end)}`
        :`${md(ls.map(l=>l.start).sort()[0])}~${md(ls.map(l=>l.end).sort().slice(-1)[0])}`;
      case 'start':return one?md(one.start):md(ls.map(l=>l.start).sort()[0]);
      case 'end':return one?md(one.end):md(ls.map(l=>l.end).sort().slice(-1)[0]);
      case 'startT':return one?(one.startT||'–'):'–';
      case 'endT':return one?(one.endT||'–'):'–';
      /* 판매단가 — 서브토탈·그랜드토탈 행은 비운다.
         묶인 라인의 단가가 모두 같으면 그대로, 다르면(예: 페이즈별 단가)
         과금 기준 물량(노출·클릭·조회…)을 합산해 역산한 평균 단가를 보여준다. */
      case 'price':{
        if(tot)return '';
        if(one)return `${one.bid} ${fmt(one.price)}`;
        const vs=[...new Set(ls.map(l=>`${l.bid} ${fmt(l.price)}`))];
        if(vs.length===1)return vs[0];
        const bids=[...new Set(ls.map(l=>l.bid))];
        if(bids.length!==1)return '';
        const bd=bids[0];
        const base={CPM:'imp',CPC:'click',CPV:'view',CPA:'conv',CPI:'install',CPE:'eng'}[bd];
        if(!base)return '';
        const vol=b[base]||0;
        if(!vol)return '';
        const avg=gross/vol*(bd==='CPM'?1000:1);
        return `${bd} ${fmt(avg)}`;}
      /* KPI 지표 — 묶인 라인의 KPI 가 하나면 그 이름, 여럿이면 모두 나열 */
      case 'kpi':{const ks=[...new Set(ls.map(kpiOf).filter(Boolean))];
        if(!ks.length)return '–';
        return ks.map(x=>KPI_LABEL[x]||x).join(' · ');}
      /* KPI 목표 수 — 각 라인이 자기 KPI 로 잡은 목표 물량의 합 (게런티면 굵은 파랑) */
      case 'kpiGoal':{
        const v=sum(ls.map(l=>(l.e&&+l.e[kpiOf(l)])||0));
        if(!v)return '–';
        const gt=ls.length>0&&ls.every(l=>l.g&&l.g[kpiOf(l)]);
        return gt?`<b class="gt">${fmt(v)}</b>`:fmt(v);}
      case 'device':return one?one.device.join('+'):'–';
      case 'sec':return one?(one.sec?one.sec+'초':'–'):'–';
      case 'share':return pct(gross/totalBudget,1);
      case 'note':return (tot||!one)?''
        :`<span style="color:var(--ink2);white-space:normal;display:block;text-align:left">${esc(one.note||'')}</span>`;
      /* 금액 */
      case 'budget':return fmt(gross);
      case 'net':return fmt(net);
      case 'value':return fmt(val);
      case 'bonus':return fmt(sum(ls.map(l=>l.bonus||0)));
      case 'bonusRate':return pct(sum(ls.map(l=>l.bonus||0))/gross,1);
      case 'feeA':return pct(sum(ls.map(l=>lineGross(l)*(+l.feeA||0)))/gross,1);
      case 'feeR':return pct(sum(ls.map(l=>lineGross(l)*(+l.feeR||0)))/gross,1);
      case 'cost':return fmt(sum(ls.map(l=>sum(paceFacts().filter(f=>f.lid===l.id).map(x=>x.cost)))));
    }
    /* 목표 수치 — 게런티 지표는 굵은 파랑 */
    if(k.startsWith('e_')){const m=k.slice(2);return wrap(fmt(b[m]||0),m);}
    /* 예상 효율 — 목표 수치와 예산으로 역산 */
    const eff={cpm:()=>gross/b.imp*1000,cpc:()=>gross/b.click,cpv:()=>gross/b.view,
      cpa:()=>gross/b.conv,cpi:()=>gross/b.install,cpe:()=>gross/b.eng,
      ctr:()=>b.click/b.imp,vtr:()=>b.view/b.imp,cvr:()=>b.conv/b.click,etr:()=>b.eng/b.imp};
    if(eff[k]){const v=eff[k]();
      return ['ctr','vtr','cvr','etr'].includes(k)?pct(v):fmt(v);}
    return '–';};
  const crIdx=dims.indexOf('creative');
  const lead=dims.map(d=>`<th rowspan="2">${(DIMS.find(x=>x.k===d)||{l:d}).l}</th>`);
  let h='<thead>'+groupHeaderHTML(MIX_CFG,MIX_DEF,lead)+'</thead><tbody>';
  const row=(rs,sp,tot)=>cols.map((k,i)=>{
    const rsAttr=(k==='m_note'||!sp||sp===1)?'':` rowspan="${sp}"`;
    const v=cell(rs,k,tot);
    return `<td class="mono${seps.has(i)?' gsep':''}" data-mk="${k}" data-mv="${esc(String(v))}"${rsAttr}>${v}</td>`;}).join('');
  out.forEach((r,i)=>{
    if(r.kind==='data'){
      const vals=r.vals,rs=entries[r.ri][1];
      const merge=crIdx>0?span[i][crIdx-1]:1;
      h+=`<tr data-key="${esc(entries[r.ri][0])}" data-pre="${esc(vals.slice(0,-1).join(SEP))}">`;
      vals.forEach((v,ci)=>{const sp=span[i][ci];if(!sp)return;
        h+=`<td class="head" data-lvl="${ci}" data-pk="${esc(vals.slice(0,ci+1).join(SEP))}"`
          +` data-pp="${esc(vals.slice(0,ci).join(SEP))}"${sp>1?` rowspan="${sp}"`:''}>${esc(v)}</td>`;});
      /* 소재 행이 병합된 구간에서도 비고 열은 행마다 그리므로 구분선 클래스를 그대로 유지한다 */
      h+=(crIdx>0&&merge===0)
        ? cols.map((k,ci)=>k==='m_note'?`<td class="mono${seps.has(ci)?' gsep':''}">${cell(rs,k)}</td>`:'').join('')
        : row(rs,crIdx>0?merge:1);
      h+='</tr>';
    }else{
      const L=r.level,vals=r.vals;
      h+=`<tr class="sub sub-l${Math.min(L,3)}">`;
      for(let ci=0;ci<=L;ci++){const sp=span[i][ci];if(!sp)continue;
        h+=`<td class="head"${sp>1?` rowspan="${sp}"`:''}>${esc(vals[ci])}</td>`;}
      const cs=Math.max(dims.length-(L+1),1);
      h+=`<td class="head" colspan="${cs}">${esc(vals[L])} Sub Total</td>`;
      const gr=rows.filter(x=>vals.every((v,y)=>x.vals[y]===v));
      h+=row(gr,1,true)+'</tr>';}});
  h+=`<tr class="total"><td class="head" colspan="${dims.length}">Grand Total</td>`+row(rows,1,true)+'</tr></tbody>';
  $('tblMix').innerHTML=h;
  applyColWidths($('tblMix'),MIX_CFG,cols);
  markBlanks($('tblMix'));
  /* 판매단가처럼 라인 단위로만 정해지는 열은 값이 같거나 빈 구간을 위 행과 합쳐서 보여준다
     (열 너비 계산이 끝난 뒤에 병합한다) */
  mergeVertical($('tblMix'),'price');
  wireGroupRename($('tblMix'),MIX_CFG,renderMix);
  enableRowDrag($('tblMix'),MIX_CFG,renderMix);
}
function openPerm(){
  /* 로그인 상태면 실제 캠페인 멤버·초대를 보여준다 (미로그인이면 예시 목록) */
  if(typeof CLOUD!=='undefined'&&CLOUD.on&&CLOUD.user&&CLOUD.campaign){openPermCloud();return;}
  const rows=[['윤석진','미디어웍스','시행사 (관리자)','yoonjintar2@gmail.com','전체 · 설정/입력/조회','활성'],
    ['김미디어','미디어웍스','시행사 (운영)','media@agency.co.kr','입력 · 조회','활성'],
    ['이운영','퍼포먼스랩','시행사 (운영)','ops@perflab.co.kr','입력 · 조회','활성'],
    ['BMW Korea 마케팅팀','BMW Korea','광고주','mkt@bmw.co.kr','조회 전용','활성'],
    ['BMW Korea 대행 검수','BMW Korea','광고주 (뷰어)','review@bmw.co.kr','조회 전용','초대 대기']];
  let h='<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>'
    +'<th>이름</th><th>소속</th><th>역할</th><th>이메일</th><th>권한</th><th>상태</th></tr></thead><tbody>';
  rows.forEach(r=>{h+='<tr>'+r.map((c,i)=>i===5?`<td><span class="tagchip ${c==='활성'?'on':''}">${c}</span></td>`
    :`<td>${c}</td>`).join('')+'</tr>';});
  openModal('계정 · 권한',h+'</tbody></table>',
    '<button class="btn" data-close>닫기</button><button class="btn primary" data-close>+ 사용자 초대</button>',{w:900});}
/* 클라우드 — 이 캠페인의 멤버 · 초대 관리 */
async function openPermCloud(){
  const d=await cloudMembers();if(!d)return;
  const master=CLOUD.role==='master';
  /* 캠페인 안에서 줄 수 있는 권한 — 운영진(수정 가능) · 광고주(조회 전용) */
  const opt=(cur)=>['editor','viewer'].map(r=>
    `<option value="${r}"${r===cur?' selected':''}>${ROLE_LABEL[r]}</option>`).join('');
  let h=`<div class="notice" style="margin-bottom:12px"><span>ⓘ</span><div>
      <b>캠페인 단위 공유</b> — 이 캠페인에 초대되었거나 코드를 받은 사람만 볼 수 있습니다.<br>
      <b>운영진</b>은 이 캠페인 안에서 마스터와 동등하게 모든 데이터를 수정·추가할 수 있고,
      <b>광고주</b>는 대시보드 열람과 엑셀 다운로드만 됩니다.
      ${master?'':'<b>지금은 초대·권한 변경 권한이 없습니다.</b>'}</div></div>
    <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th>이름</th><th>소속</th><th>이메일</th><th style="width:120px">권한</th>
      <th style="width:96px">상태</th><th style="width:70px"></th></tr></thead><tbody>`;
  d.members.forEach(m=>{
    const p=m.profiles||{};
    h+=`<tr><td>${esc(p.name||'–')}</td><td>${esc(p.org||'–')}</td><td>${esc(p.email||'–')}</td>
      <td>${master?`<select data-mrole="${m.user_id}">${opt(m.role)}</select>`:ROLE_LABEL[m.role]}</td>
      <td><span class="tagchip on">활성</span></td>
      <td>${master&&m.user_id!==CLOUD.user.id?`<button class="btn sm danger" data-mdel="${m.user_id}">해제</button>`:''}</td></tr>`;});
  d.invites.forEach(iv=>{
    h+=`<tr><td class="hint">(가입 전)</td><td>–</td><td>${esc(iv.email)}</td>
      <td>${ROLE_LABEL[iv.role]}</td><td><span class="tagchip">초대 대기</span></td><td></td></tr>`;});
  h+=`</tbody></table>
    <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:12px">
      <div style="font-weight:700;margin-bottom:8px">사용자 초대</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input id="invMail" type="email" placeholder="초대할 구글 계정 이메일" ${master?'':'disabled'}
          style="height:32px;border:1px solid var(--line);border-radius:9px;padding:0 11px;min-width:260px;flex:1">
        <select id="invRole" class="ctl" ${master?'':'disabled'}>${opt('viewer')}</select>
        <button class="btn primary" id="invAdd" ${master?'':'disabled'}>초대</button></div>
      <div id="invMsg" class="hint" style="margin-top:9px">초대한 이메일로 구글 로그인하면 이 캠페인이 자동으로 열립니다.</div>
    </div>`;
  openModal(`계정 · 권한 — ${esc(CLOUD.campaign.name)}`,h,'<button class="btn" data-close>닫기</button>',{w:940});
  const host=$('modalHost');
  host.querySelectorAll('[data-mrole]').forEach(s=>s.onchange=async e=>{
    const err=await setMemberRole(e.target.dataset.mrole,e.target.value);
    $('invMsg').textContent=err||'권한을 변경했습니다.';});
  host.querySelectorAll('[data-mdel]').forEach(b=>b.onclick=async()=>{
    const err=await removeMember(b.dataset.mdel);
    if(err)$('invMsg').textContent=err;else{closeModal();openPermCloud();}});
  const add=$('invAdd');
  if(add)add.onclick=async()=>{
    const m=$('invMail').value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){$('invMsg').textContent='이메일 형식을 확인해 주세요.';return;}
    const err=await inviteMember(m,$('invRole').value);
    if(err)$('invMsg').textContent='초대 실패: '+err;
    else{closeModal();openPermCloud();}};
}
function openCampHist(){
  let h='<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>'
    +'<th>변경 시각</th><th>변경자</th><th>항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>';
  if(!CAMP_HIST.length)
    h+='<tr><td colspan="5" class="hint" style="padding:20px">아직 기록된 변경이 없습니다. '
      +'캠페인 정보를 바꾸면 여기에 쌓입니다.</td></tr>';
  CAMP_HIST.slice().reverse().forEach(r=>{h+=`<tr><td class="mono">${r.d}</td><td>${r.who}</td>
    <td>${r.f}</td><td class="mono" style="color:var(--muted)">${r.b}</td><td class="mono"><b>${r.a}</b></td></tr>`;});
  openModal('캠페인 정보 변경 히스토리',h+'</tbody></table>','<button class="btn" data-close>닫기</button>',{w:820});}
function openHolidays(){
  const yrs=[...new Set(HOLIDAYS.map(h=>h[0].slice(0,4)))];
  let h='<div class="hint" style="margin-bottom:10px">토·일요일과 아래 공휴일은 <b>표 탭에서 붉은 글씨</b>로, <b>소재 탭 간트에서 음영</b>으로 표시됩니다.</div>';
  yrs.forEach(y=>{
    h+=`<div style="font-weight:700;margin:10px 0 6px;color:var(--sec)">${y}년</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">`
      +HOLIDAYS.filter(x=>x[0].startsWith(y)).map((x,i)=>
        `<span class="tagchip on" style="display:inline-flex;gap:6px;align-items:center">
          <b>${x[0].slice(5)}</b> ${x[1]}<span data-hdel="${HOLIDAYS.indexOf(x)}" style="cursor:pointer;opacity:.6">✕</span></span>`).join('')
      +'</div>';});
  h+=`<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <input type="date" id="hDate" style="height:32px;border:1px solid var(--line);border-radius:9px;padding:0 10px">
    <input id="hName" placeholder="공휴일 이름" style="height:32px;border:1px solid var(--line);border-radius:9px;padding:0 11px">
    <button class="btn primary" id="hAdd">+ 추가</button></div>`;
  openModal('공휴일 설정 (2026 – 2028)',h,'<button class="btn" data-close>닫기</button>',{w:820});
  $('modalHost').querySelectorAll('[data-hdel]').forEach(b=>b.onclick=()=>{
    HOLIDAYS.splice(+b.dataset.hdel,1);closeModal();openHolidays();renderAll();});
  $('hAdd').onclick=()=>{const d=$('hDate').value,n=$('hName').value.trim();
    if(!d||!n)return;HOLIDAYS.push([d,n]);HOLIDAYS.sort((a,b)=>a[0].localeCompare(b[0]));
    closeModal();openHolidays();renderAll();};}

/* ===== 11. 모달 · 필터 · 탭 ===== */
function openModal(title,body,footer,opts){
  const w=(opts&&opts.w)||900;
  $('modalHost').innerHTML=`<div class="modal" id="mdl"><div class="box" style="max-width:min(${w}px,94vw)">
    <div class="mhd"><b>${esc(title)}</b><div class="spacer"></div><button class="x" data-close>✕</button></div>
    <div class="mbd">${body}</div>${footer?`<div class="mft">${footer}</div>`:''}</div></div>`;
  $('modalHost').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  $('mdl').onclick=e=>{if(e.target.id==='mdl')closeModal();};}
const closeModal=()=>$('modalHost').innerHTML='';
function confirmModal(msg,sub,onYes,okLabel){
  openModal('확인',`<div style="font-size:14px;font-weight:700;margin-bottom:6px">${esc(msg)}</div><div class="hint">${esc(sub||'')}</div>`,
    `<button class="btn" data-close>취소</button><button class="btn primary" id="cfmYes">${okLabel||'삭제'}</button>`,{w:460});
  $('cfmYes').onclick=()=>{closeModal();onYes();};}
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

const selHTML=(id,label,opts,cur)=>`<span class="lbl">${label}</span><select id="${id}"><option value="all">전체</option>`
  +opts.map(o=>`<option ${o===cur?'selected':''}>${esc(o)}</option>`).join('')+'</select>';
/* 기간 필터 — 달력에서 시작·종료일을 직접 고른다 (비우면 자동 = 선택한 항목의 집행 구간) */
const rangeSel=p=>{const sc=viewScope();
  return `<span class="lbl">기간</span>
  <span class="daterange">
    <input type="date" id="${p}From" value="${FILTER.from||sc.startIso}" min="${campStart()}" max="${campEnd()}">
    <span class="tilde">~</span>
    <input type="date" id="${p}To" value="${FILTER.to||sc.endIso}" min="${campStart()}" max="${campEnd()}">
    <button class="btn sm primary" id="${p}Apply" title="선택한 기간을 대시보드에 반영">적용</button>
  </span>`;};
function buildFilters(){
  const dimSels=p=>selHTML(p+'Segment','구분',segments(),FILTER.segment)
    +selHTML(p+'Media','매체',[...new Set(LINES.map(l=>l.media))],FILTER.media)
    +selHTML(p+'Line','제품',[...new Set(LINES.map(l=>l.line))],FILTER.line);
  const wire=p=>{
    ['Segment','Media','Line'].forEach((s,i)=>{
      const e2=$(p+s);if(!e2)return;
      const key=['segment','media','line'][i];
      /* 차원을 바꾸면 사용자가 잡아둔 날짜는 풀고 그 항목의 집행 구간으로 다시 맞춘다 */
      e2.onchange=ev=>{FILTER[key]=ev.target.value;FILTER.from='';FILTER.to='';buildFilters();renderAll();};});
    /* 날짜는 [적용] 을 눌러야 반영된다 (고르는 중에 화면이 바뀌지 않도록) */
    const ap=$(p+'Apply');
    if(ap)ap.onclick=()=>{
      let f=($(p+'From')||{}).value||'',t=($(p+'To')||{}).value||'';
      if(f&&t&&t<f){const x=f;f=t;t=x;}
      FILTER.from=f;FILTER.to=t;
      buildFilters();renderAll();};};
  $('perfFilters').innerHTML=rangeSel('p')+dimSels('p')
    +'<div class="spacer"></div><span class="hint" id="perfUpdated"></span>';
  wire('p');
  $('rawFilters').innerHTML=rangeSel('r')+dimSels('r');
  wire('r');
  const mf=$('mixFilters');
  if(mf){mf.innerHTML=dimSels('m');wire('m');}
  /* 소재·간트·트리맵은 효율 탭 안으로 들어왔으므로 위의 공통 필터를 그대로 쓴다 */
}
function buildSelects(){
  const fill=(id,arr,cur,lab)=>{const s=$(id);s.innerHTML=arr.map(k=>
    `<option value="${k}" ${k===cur?'selected':''}>${lab(k)}</option>`).join('');};
  fill('barSel',BAR_METRICS,'imp',k=>METRICS[k].l);
  fill('lineSel',LINE_METRICS,'ctr',k=>k==='none'?'없음':METRICS[k].l);
  fill('dimSel',SERIES_DIMS.map(d=>d.k),'media',k=>SERIES_DIMS.find(d=>d.k===k).l);
  fill('ganttMetric',['imp','click','view','cost'],'imp',k=>METRICS[k].l);
  fill('tmapMetric',TMAP_METRICS,TMAP.metric,k=>METRICS[k].l);
  $('tmapMetric').onchange=e=>{TMAP.metric=e.target.value;renderTreemap();};
  $('tmapMode').value=TMAP.dims.join('|');
  $('tmapMode').onchange=e=>{TMAP.dims=e.target.value.split('|');renderTreemap();};
  /* 효율 버블 — 축 선택 */
  ['x','y'].forEach(ax=>{
    const sel=$(ax==='x'?'bubX':'bubY');if(!sel)return;
    sel.innerHTML=BUB_AXES.map(a=>`<option value="${a.k}" ${BUB[ax]===a.k?'selected':''}>${a.l}</option>`).join('');
    sel.onchange=e=>{BUB[ax]=e.target.value;renderBubble();};});
  const bd=$('bubDim');
  if(bd){bd.value=BUB.dim;bd.onchange=e=>{BUB.dim=e.target.value;renderBubble();};}
  $('crTopN').value=CR_TOPN;
  $('crTopN').onchange=e=>{CR_TOPN=+e.target.value||5;renderCreatives();};
  const am=$('crAllMedia');
  if(am){am.classList.toggle('on',!!CR_ALL_MEDIA);
    am.onclick=()=>{CR_ALL_MEDIA=!CR_ALL_MEDIA;
      am.classList.toggle('on',CR_ALL_MEDIA);renderCreatives();};}
  const ab=$('crAllBtn');if(ab)ab.onclick=openCrAll;
  renderRankPick();
  $('rawSeg').innerHTML=SEG_OPTS.map(s=>`<option value="${s.k}" ${s.k===RAW_SEG?'selected':''}>${s.l}</option>`).join('');
  $('rawHSeg').innerHTML=SEG_OPTS.map(s=>`<option value="${s.k}" ${s.k===RAW_HSEG?'selected':''}>${s.l}</option>`).join('');
  $('barSel').onchange=renderDaily;$('lineSel').onchange=renderDaily;
  $('dimSel').onchange=e=>{SERIES_DIM=e.target.value;renderDaily();};
  $('ganttMetric').onchange=e=>{GANTT.metric=e.target.value;renderGantt();};
  const gr=$('ganttRange');
  if(gr){gr.value=GANTT_RANGE;gr.onchange=e=>{GANTT_RANGE=e.target.value;renderGantt();};}
  $('rawSeg').onchange=e=>{RAW_SEG=e.target.value;renderRaw();};
  $('rawHSeg').onchange=e=>{RAW_HSEG=e.target.value;renderRaw();};
  $('kpiGroupSel').onchange=renderDonuts;
}
let pendingLeave=false;
function switchTab(name){
  if(!$('tab-input').classList.contains('hidden')&&name!=='input'&&SHEET.some(rowBad)&&!pendingLeave){
    const n=SHEET.filter(rowBad).length;
    confirmModal(`집행 기간을 벗어난 행이 ${n}개 있습니다.`,
      '붉게 표시된 행의 일자 또는 라인 정보를 확인해 주세요. 그대로 이동하면 해당 행은 저장되지 않습니다.',
      ()=>{pendingLeave=true;switchTab(name);pendingLeave=false;},'그대로 이동');
    return;}
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===name));
  ['dash','input','setup'].forEach(n=>$('tab-'+n).classList.toggle('hidden',n!==name));
  $('subbar').classList.toggle('hidden',name!=='dash');
  scrollTo({top:0});}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.querySelectorAll('#subbar button[data-sub]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#subbar button[data-sub]').forEach(x=>x.classList.toggle('on',x===b));
  ['perf','table','mix'].forEach(n=>$('sub-'+n).classList.toggle('hidden',n!==b.dataset.sub));
  if(b.dataset.sub==='perf'){renderCreatives();renderGantt();renderStrip();renderBubble();
    equalizeDuo();renderTreemap();}
  if(b.dataset.sub==='table')renderRaw();
  if(b.dataset.sub==='mix')renderMix();});
/* 역할은 고르는 것이 아니라 로그인 상태로 정해진다.
   · 클라우드가 설정되지 않은 데모(로컬 파일)  → 시행사 (시안을 그대로 둘러볼 수 있게)
   · 클라우드가 있는데 로그인 안 함 · 조회 권한 → 광고주 (대시보드만)
   · 로그인 + 마스터/편집 권한                  → 시행사 */
/* 화면 모드는 둘뿐 — agency(시행사: 전체 화면) / client(광고주: 대시보드 + 엑셀만).
   4단계 권한을 이 둘에 매핑한다. */
function currentRole(){
  /* CLOUD 는 뒤쪽 파일에서 선언되므로 아직 없을 수 있다 */
  let C=null;try{C=CLOUD;}catch(e){return 'agency';}
  if(!C)return 'agency';
  /* 샘플 둘러보기는 시행사 전용 화면 */
  if(C.sample&&!C.user)return 'agency';
  /* 코드로 들어온 경우 — 운영진 코드는 시행사 화면, 뷰어 코드는 광고주 화면 */
  if(C.shareView&&!C.user)return C.shareRole==='staff'?'agency':'client';
  if(!C.on)return 'agency';
  if(!C.user)return 'client';
  return (C.role==='master'||C.role==='editor'||!C.campaign)?'agency':'client';
}
/* 지금 사람의 권한 이름 — 슈퍼마스터 / 마스터 / 운영진 / 광고주 */
function roleName(){
  let C=null;try{C=CLOUD;}catch(e){return '시행사';}
  if(!C)return '시행사';
  if(C.user){
    if(C.appRole==='super')return '슈퍼마스터';
    if(C.campaign&&C.role==='editor')return '운영진';
    if(C.campaign&&C.role==='viewer')return '광고주';
    if(C.appRole==='master')return '마스터';
    return '게스트';}
  if(C.sample)return '샘플 (시행사 화면)';
  if(C.shareView)return C.shareRole==='staff'?'운영진':'광고주';
  return currentRole()==='client'?'광고주':'시행사';
}
let __lastRole=null;
function applyRole(){
  const role=currentRole(),c=role==='client';
  document.body.dataset.role=role;
  const chip=$('roleChip');
  if(chip){chip.textContent=roleName();chip.classList.toggle('agency',!c);
    chip.title=c?'대시보드 열람과 엑셀 다운로드만 가능합니다'
      :'슈퍼마스터 · 마스터 · 운영진은 전체 화면을 볼 수 있습니다';}
  /* 슈퍼마스터에게만 계정 관리 버튼을 보여 준다 */
  let sup=false,sample=false,needReq=false;
  try{sup=CLOUD&&CLOUD.user&&CLOUD.appRole==='super';
      sample=!!(CLOUD&&CLOUD.sample&&!CLOUD.user);
      needReq=sample||!!(CLOUD&&CLOUD.user&&CLOUD.appRole==='guest');}catch(e){}
  const ab=$('acctBtn');if(ab)ab.classList.toggle('hidden',!sup);
  /* 샘플 둘러보기 중이거나 아직 등급이 없으면 권한 요청 버튼을 보여 준다 */
  document.body.dataset.mode=sample?'sample':'';
  const rb=$('reqBtn');if(rb)rb.classList.toggle('hidden',!needReq);
  const st=document.querySelector('#tabs [data-tab="setup"]');
  const it=document.querySelector('#tabs [data-tab="input"]');
  if(st)st.classList.toggle('hidden',c);
  if(it)it.classList.toggle('hidden',c);
  document.querySelectorAll('.agency-only').forEach(x=>x.classList.toggle('hidden',c));
  if(c&&document.querySelector('#tabs [data-tab="dash"]')&&!$('tab-dash').classList.contains('hidden')===false)switchTab('dash');
  if(c)switchTab('dash');
  /* 권한이 바뀌면 화면 구성 버튼이 붙어 있는 영역을 다시 그린다
     (서머리·소재 카드는 그릴 때 isClient() 로 버튼 유무를 정하기 때문) */
  if(__lastRole!==null&&__lastRole!==role){
    try{renderSummaries();}catch(e){}
    try{renderCreatives();}catch(e){}
    try{if(typeof applyHidden==='function')applyHidden();}catch(e){}}
  __lastRole=role;
}
setTimeout(applyRole,0);
$('statCfgBtn').onclick=()=>openBuilder($('statCfgBox'),STAT_CFG,{useRows:false,catalog:STAT_CATALOG,onApply:renderStrip});
$('rawCfgBtn').onclick=()=>openBuilder($('rawCfgBox'),RAW_CFG,{useRows:false,catalog:RAW_CATALOG,onApply:renderRaw});
$('ganttCfgBtn').onclick=()=>openBuilder($('ganttCfgBox'),GANTT,{rowFields:DIMS,useSub:false,catalog:GANTT_CATALOG,onApply:renderGantt});
/* 소재 카드의 표시 항목은 소재 팝업 안에서 설정한다 (별도 "표시 항목" 버튼 없음) */
$('mixCfgBtn').onclick=()=>openBuilder($('mixCfgBox'),MIX_CFG,
  {rowFields:DIMS.filter(d=>d.k!=='month'),catalog:MIX_CATALOG,onApply:renderMix});
$('sumAdd').onclick=()=>{SUMMARIES.push({id:uid(),name:'새 서머리',...SUM_PRESET()});renderSummaries();};
/* 서머리 복제 — 어떤 서머리를 베낄지 먼저 고른다 */
$('sumDup').onclick=()=>{
  if(!SUMMARIES.length){confirmModal('복제할 서머리가 없습니다.','먼저 새로운 써머리를 추가해 주세요.',()=>{},'확인');return;}
  openModal('서머리 복제',
    `<div class="hint" style="margin-bottom:10px">복사할 서머리를 고르세요. 행 헤더 · 열 그룹 구성이 그대로 복사됩니다.</div>`
    +`<div style="display:grid;gap:7px">`
    +SUMMARIES.map((s2,i)=>`<label class="tagchip" style="justify-content:flex-start;cursor:pointer;padding:9px 12px">
        <input type="radio" name="sdup" value="${i}" ${i===0?'checked':''} style="margin-right:8px">
        <b>${esc(s2.name)}</b>
        <span class="hint" style="margin-left:8px">헤더 ${s2.rows.map(r=>(DIMS.find(d=>d.k===r.k)||{l:r.k}).l).join(' › ')||'없음'}
          · 열 ${cfgCols(s2).length}개</span></label>`).join('')
    +`</div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="sdupGo">복제</button>',{w:640});
  $('sdupGo').onclick=()=>{
    const pick=document.querySelector('#modalHost [name=sdup]:checked');
    const src=SUMMARIES[+(pick?pick.value:0)];if(!src)return;
    const copy=JSON.parse(JSON.stringify(src));
    copy.id=uid();copy.name=src.name+' 사본';
    copy.groups=copy.groups.map(g=>({...g,id:uid()}));
    SUMMARIES.push(copy);closeModal();renderSummaries();};};
$('addRow').onclick=()=>addRow(1);$('addRow2').onclick=()=>addRow(1);
/* KPI 판정 기준 (%p) */
(function(){const b=$('verdictBand');if(!b)return;b.value=VERDICT_BAND;
  b.onchange=e=>{const v=parseFloat(e.target.value);
    if(isFinite(v)&&v>0){VERDICT_BAND=v;renderDonuts();}else e.target.value=VERDICT_BAND;};})();
/* 저장 버튼은 없앴다 — 시트를 고치면 syncSheet() 가 바로 반영한다.
   전체 저장은 상단바 오른쪽 ☁ 저장 하나로 통일 */
$('colCfgBtn').onclick=openColCfg;
$('histBtn').onclick=openHistory;
$('campHistBtn').onclick=openCampHist;
/* 계정 · 권한은 상단 ⚙ 캠페인 관리 → 👥 초대 로 옮겼다 */
if($('permBtn'))$('permBtn').onclick=openPerm;
/* 📘 사용 가이드 — 배포 폴더의 PDF 를 내려받는다 */
const GUIDE_PDF='guide/사용가이드.pdf';
if($('guideBtn'))$('guideBtn').onclick=async()=>{
  try{
    const r=await fetch(GUIDE_PDF,{method:'HEAD'});
    if(!r.ok)throw new Error('없음');
    const a=document.createElement('a');
    a.href=GUIDE_PDF;a.download='Digital Media Dashboard 사용 가이드.pdf';
    document.body.appendChild(a);a.click();a.remove();
  }catch(e){
    confirmModal('가이드 파일을 찾지 못했습니다.',
      '배포 폴더의 guide/사용가이드.pdf 를 함께 올려 주세요. '
      +'(내려받은 zip 안에 들어 있습니다. 파일 하나만 열어 보는 중이라면 같은 폴더에 guide 폴더를 두면 됩니다.)',
      ()=>{},'확인');}
};
$('holBtn').onclick=openHolidays;

$('issueFold').onclick=()=>{const b=$('issueBox'),open=b.classList.toggle('hidden');
  $('issueFold').textContent=open?'▾ 펼치기':'▴ 접기';};
$('fcToggle').onclick=()=>{SHOW_FORECAST=!SHOW_FORECAST;$('fcToggle').classList.toggle('on',SHOW_FORECAST);renderDaily();};
$('benchToggle').onclick=()=>{SHOW_BENCH=!SHOW_BENCH;$('benchToggle').classList.toggle('on',SHOW_BENCH);renderDaily();};
$('issueToggle').onclick=()=>{SHOW_ISSUES=!SHOW_ISSUES;$('issueToggle').classList.toggle('on',SHOW_ISSUES);renderDaily();};
$('addIssue').onclick=()=>{ISSUES.push({s:YESTERDAY,e:YESTERDAY,scope:'전체',type:'기타',txt:''});renderIssues();renderDaily();};
/* 라인 추가 — 기본값 없이 전부 공란으로 (같은 값이 필요하면 행 우측 ⧉ 복제 버튼) */
function blankLine(){
  const base=LINES[LINES.length-1]||{};
  const n=JSON.parse(JSON.stringify({...base,daily:undefined}));
  n.id='L'+Math.random().toString(36).slice(2,7);
  ['segment','media','product','slot','target','line','note','startT','endT','start','end','sub'].forEach(k=>n[k]='');
  n.targets=[];n.creatives=[];n.products=[];n.slots=[];n.creativeTxt='';n.device=[];
  n.sec=0;n.price=0;n.gross=0;n.bonus=0;n.feeA=0;n.feeR=0;n.bid='';n.kpi='imp';
  n.e={};AMET.forEach(m=>n.e[m]=0);
  n.a={};AMET.forEach(m=>n.a[m]=0);
  n.g={};n.daily={};
  return n;}
$('addLine').onclick=()=>{
  pushLineUndo();LINES.push(blankLine());
  rebuildPeriod();buildFacts();renderKpiTable();renderCampForm();renderMix();renderAll();
  LSEL={r:LINES.length-1,c:0};paintLSel();};

$('lineHistBtn').onclick=openLineHistory;
$('lineColCfgBtn').onclick=openLineColCfg;
addEventListener('resize',()=>renderDaily());
function renderIssueAlert(){
  const box=$('issueAlert');if(!box)return;
  if(ISSUE_OVERFLOW>0){box.classList.remove('hidden');
    box.innerHTML=`<span>⚠</span><div>이슈 문구가 많아 그래프에 <b>${ISSUE_OVERFLOW}건</b>이 표시되지 못했습니다.
      기간이 겹치는 이슈의 내용을 짧게 줄이거나 통합해 주세요. (그래프에는 최대 5줄까지 표시됩니다)</div>`;}
  else box.classList.add('hidden');
}
/* 아직 아무 데이터도 없는 캠페인은 0% · 1일차 같은 숫자 대신 안내만 보여 준다 */
function dashEmpty(){
  const on=!LINES.length||!FACTS.length;
  const host=$('tab-dash');if(!host)return on;
  let box=$('dashEmpty');
  if(!box){
    box=el('div','emptybox');box.id='dashEmpty';
    host.insertBefore(box,host.firstChild);}
  const client=isClient();
  box.innerHTML=`<div class="ttl">아직 표시할 데이터가 없습니다</div>`
    +`<div class="txt">${client
      ? '시행사에서 실적을 입력하면 이 화면에 대시보드가 나타납니다.'
      : '<b>캠페인 설정</b>에서 예상 효율(라인)을 먼저 넣고, <b>데이터 입력</b>에서 일자별 실적을 채워 주세요.'}</div>`
    +(client?'':`<div class="acts">
        <button class="btn primary" data-go="setup">캠페인 설정으로</button>
        <button class="btn" data-go="input">데이터 입력으로</button></div>`);
  box.classList.toggle('hidden',!on);
  box.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchTab(b.dataset.go));
  /* 데이터가 없으면 대시보드 본문은 감춘다 */
  ['sub-perf','sub-table','sub-mix'].forEach(id=>{const e=$(id);if(e)e.classList.toggle('nodata',on);});
  const sb=$('subbar');if(sb)sb.classList.toggle('nodata',on);
  /* 캠페인 정보 · 필터 줄도 함께 감춘다 (₩0 만 남으면 오히려 헷갈린다) */
  const bar=$('campBar');
  if(bar){bar.classList.toggle('nodata',on);
    const lbl=bar.previousElementSibling;if(lbl)lbl.classList.toggle('nodata',on);}

  return on;
}
function renderAll(){
  renderCampBar();
  if(dashEmpty())return;
  renderPace();renderDonuts();renderStrip();renderDaily();renderSummaries();
  renderCampForm();renderMix();
  if(!$('sub-perf').classList.contains('hidden')){renderGantt();renderHeat();renderCreatives();renderBubble();
    equalizeDuo();renderTreemap();}
  if(!$('sub-table').classList.contains('hidden'))renderRaw();}
buildFilters();buildSelects();renderAll();renderSheet();renderIssues();renderKpiTable();renderIssueAlert();renderRaw();renderCreatives();renderGantt();renderHeat();renderBubble();
setTimeout(()=>{equalizeDuo();renderTreemap();},0);
/* 예상 효율 히스토리는 실제로 저장할 때만 쌓인다 (예시 값 없음) */
