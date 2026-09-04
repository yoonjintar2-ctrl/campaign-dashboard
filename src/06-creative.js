/* ===== 7. 표 (로우 데이터) ===== */
/* 표 탭 열 — 항목 사전 중 팩트에서 바로 계산 가능한 항목만 */
const RAW_CATALOG=fieldCatalog('dash',f=>!!METRICS[f.k]);
const RAW_DEF={};RAW_CATALOG.forEach(g=>g.cols.forEach(c=>RAW_DEF[c.k]=c));
/* 기본 열에서 빼는 항목 — 매출은 켜고 싶을 때 열 구성에서 켠다 */
const RAW_DEF_OUT=['rev'];
let RAW_CFG={rows:[],groups:(function(){
  const d=fieldDefaults('dash').filter(k=>METRICS[k]&&RAW_DEF_OUT.indexOf(k)<0);
  const vol=d.filter(k=>FLD[k].kind==='in'&&FLD[k].cat!=='비용');
  const eff=d.filter(k=>FLD[k].kind==='calc'&&FLD[k].cat!=='비용');
  const cost=d.filter(k=>FLD[k].cat==='비용');
  return [{id:uid(),name:'볼륨',cols:vol},{id:uid(),name:'효율',cols:eff},{id:uid(),name:'비용',cols:cost}]
    .filter(g=>g.cols.length);})()};
let RAW_ALLDAYS=false;    /* true 면 캠페인 시작~종료 전 기간을 모두 행으로 (리포트용) */
let RAW_SEG='media';      /* 세로 세그먼트 — 표를 위아래로 나눈다 (기본 매체별) */
let RAW_HSEG='product';   /* 가로 세그먼트 — 한 표 안에서 좌우로 나눈다 (기본 상품별) */
const SEG_OPTS=[{k:'none',l:'없음'},{k:'segment',l:'구분별'},{k:'media',l:'매체별'},
  {k:'product',l:'상품별'},{k:'target',l:'타겟팅별'},{k:'creative',l:'소재별'}];
function renderRaw(){
  const cols=cfgCols(RAW_CFG),seps=gsepSet(RAW_CFG);
  const fs=factFilter();
  const host=$('rawHost');host.innerHTML='';
  const vSegs=RAW_SEG==='none'?[]:[...new Set(fs.map(f=>f[RAW_SEG]))].filter(Boolean).sort();
  const hSegs=RAW_HSEG==='none'?[]:[...new Set(fs.map(f=>f[RAW_HSEG]))].filter(Boolean).sort();
  /* 가로 블록 — 맨 왼쪽은 언제나 합계(상위), 그 오른쪽이 하위 세그먼트 */
  const blocks=[{name:'합계',all:true}].concat(hSegs.map(v=>({name:v,all:false,val:v})));
  let totalRows=0;
  /* 세로 블록 — 맨 위가 합계, 아래가 하위 세그먼트 */
  const vBlocks=[{name:'합계',all:true}].concat(vSegs.map(v=>({name:v,all:false,val:v})));
  vBlocks.forEach((vb,vi)=>{
    if(!vb.all&&!vSegs.length)return;
    const sub=vb.all?fs:fs.filter(f=>f[RAW_SEG]===vb.val);
    if(!sub.length)return;
    /* 화면·엑셀 모두 예전 날짜가 위 (오름차순) */
    const ord=(a2,b2)=>a2-b2;
    const days=RAW_ALLDAYS
      ? [...Array(TOTAL_DAYS)].map((_,i)=>i).sort(ord)
      : [...new Set(sub.map(f=>f.d))].sort(ord);
    totalRows+=days.length;
    const wrapDiv=el('div','rawblock'+(vi>0?' vsep':''),host);
    if(vSegs.length){
      const t=el('div','subsec',wrapDiv);
      t.innerHTML=`<span>${esc(vb.all?'전체 합계':vb.val)}</span>`
        +`<span class="cnt">${days.length}일</span>`
        +(vb.all?'<span class="hint">아래 세로 세그먼트들의 합계</span>':'');}
    /* 블록별 팩트 · 일자별 버킷 */
    const bf=blocks.map(bk=>bk.all?sub:sub.filter(f=>f[RAW_HSEG]===bk.val));
    const bDay=bf.map(arr=>{const m=new Map();
      arr.forEach(f=>{if(!m.has(f.d))m.set(f.d,[]);m.get(f.d).push(f);});return m;});
    const bTot=bf.map(arr=>aggFacts(arr));
    const card=el('div','card fit',wrapDiv);
    const wrap=el('div','tbl-wrap',card);
    const tbl=el('table','tbl gln fit'+(vb.all?'':' sublv'),wrap);
    /* 열 너비 — 실제 값 길이에 맞춘다 */
    const wOf=k=>{
      let mx=RAW_DEF[k].l.length*1.55;
      bDay.forEach((m,bi)=>{days.forEach(di=>{const g=m.get(di);
        if(g)mx=Math.max(mx,METRICS[k].f(mval(k,aggFacts(g))).length);});
        mx=Math.max(mx,METRICS[k].f(mval(k,bTot[bi])).length);});
      return Math.round(Math.max(46,mx*7.6+16));};
    const widths=cols.map(wOf);
    const many=blocks.length>1;
    let h='<thead>';
    if(many){
      /* 가로 세그먼트 — 첫 블록(합계)은 진한 헤더, 하위 블록은 연한 헤더 */
      h+='<tr><th colspan="2" rowspan="2" style="min-width:120px">일자</th>'
        +blocks.map((bk,bi)=>`<th class="g${bi>0?' hsep subhd':''}" colspan="${cols.length}">`
          +`${esc(bk.name)}</th>`).join('')
        +'</tr><tr>'
        +blocks.map((bk,bi)=>cols.map((k,i)=>
          `<th class="${bi>0?(i===0?'hsep subhd':'subhd'):(seps.has(i)?'gsep':'')}"`
          +` style="min-width:${widths[i]}px">${RAW_DEF[k].l}</th>`).join('')).join('')
        +'</tr>';
    }else{
      h+='<tr><th colspan="2" style="min-width:120px">일자</th>'
        +cols.map((k,i)=>`<th class="${seps.has(i)?'gsep':''}" style="min-width:${widths[i]}px">${RAW_DEF[k].l}</th>`).join('')
        +'</tr>';}
    h+=`<tr class="total"><td class="head" colspan="2">합계</td>`
      +blocks.map((bk,bi)=>cols.map((k,i)=>
        `<td class="mono${bi>0&&i===0?' hsep':seps.has(i)?' gsep':''}">${METRICS[k].f(mval(k,bTot[bi]))}</td>`).join('')).join('')
      +'</tr></thead><tbody>';
    let prevY=null;
    days.forEach(di=>{
      const d=ALLDATES[di],wd=d.getDay(),hol=holName(d),rest=wd===0||wd===6||!!hol;
      const y=d.getFullYear(),showY=prevY===null||y!==prevY;prevY=y;
      const label=(showY?String(y).slice(2)+'/':'')+`${d.getMonth()+1}/${d.getDate()}`;
      const cls=rest?' hol':'';
      h+=`<tr><td class="head mono${cls}" style="min-width:72px" title="${dFull(d)}${hol?' · '+hol:''}">${label}</td>`
        +`<td class="head${cls}" style="min-width:40px">${WD[wd]}</td>`
        +blocks.map((bk,bi)=>{const g=bDay[bi].get(di);
          const b2=g?aggFacts(g):null;
          return cols.map((k,i)=>`<td class="mono${bi>0&&i===0?' hsep':seps.has(i)?' gsep':''}${cls}">`
            +(b2?METRICS[k].f(mval(k,b2)):(RAW_ALLDAYS?'':'<span class="na">–</span>'))+'</td>').join('');}).join('')
        +'</tr>';});
    tbl.innerHTML=h+'</tbody>';
    markBlanks(tbl);
    /* 가로 세그먼트가 많으면 좌우 스크롤이 길어진다 — 블록 단위로 건너뛰는 미니맵을 붙인다 */
    if(many)mountHNav(wrapDiv,card,wrap,tbl,blocks);
  });
  const note=[`${totalRows}행`,`${cols.length}개 열`];
  if(vSegs.length)note.push(`세로 ${SEG_OPTS.find(s=>s.k===RAW_SEG).l} ${vSegs.length}개`);
  if(hSegs.length)note.push(`가로 ${SEG_OPTS.find(s=>s.k===RAW_HSEG).l} ${hSegs.length}개`);
  $('rawNote').textContent=note.join(' · ');
}

/* 일자별 상세 효율 — 가로 세그먼트 미니맵 · 좌우 이동 버튼
   블록(가로 세그먼트) 하나씩 건너뛰고, 지금 보고 있는 블록을 칩으로 표시한다. */
function mountHNav(wrapDiv,card,wrap,tbl,blocks){
  /* 좌우로 길어지므로 일자 · 요일 두 열은 왼쪽에 붙여 둔다 */
  wrap.classList.add('hfrozen');
  const setFz=()=>{const r=tbl.querySelector('tbody tr');
    if(r&&r.children[0])wrap.style.setProperty('--fz1',r.children[0].getBoundingClientRect().width+'px');};
  setFz();setTimeout(setFz,0);addEventListener('resize',setFz);
  const nav=document.createElement('div');
  nav.className='hnav';
  nav.innerHTML='<button class="nvb" data-step="-1" title="이전 세그먼트로">◀</button>'
    +'<div class="nvmap"><div class="nvchips">'
    +blocks.map((b,i)=>`<button class="nvc" data-go="${i}">${esc(b.name)}</button>`).join('')
    +'</div><div class="nvbar"><i></i></div></div>'
    +'<button class="nvb" data-step="1" title="다음 세그먼트로">▶</button>';
  card.parentNode.insertBefore(nav,card);
  /* 각 블록의 왼쪽 좌표 — 스크롤 영역 안에서의 위치 */
  const lefts=()=>{const wr=wrap.getBoundingClientRect();
    return [...tbl.querySelectorAll('thead tr:first-child th.g')]
      .map(th=>Math.round(th.getBoundingClientRect().left-wr.left+wrap.scrollLeft));};
  /* 왼쪽에 붙어 있는 일자 · 요일 두 열의 폭만큼 빼 줘야 블록 첫 열이 바로 보인다 */
  const frozen=()=>{const r=tbl.querySelector('tbody tr');
    if(!r)return 0;
    return Math.round([...r.children].slice(0,2).reduce((a,c)=>a+c.getBoundingClientRect().width,0));};
  const chips=[...nav.querySelectorAll('.nvc')];
  const fill=nav.querySelector('.nvbar>i');
  const goTo=i=>{const L=lefts();if(!L.length)return;
    const k=Math.max(0,Math.min(L.length-1,i));
    wrap.scrollTo({left:Math.max(0,L[k]-frozen()),behavior:'smooth'});};
  /* 지금 보고 있는 블록 — 스크롤 위치와 가장 가까운 블록 */
  const cur=()=>{const L=lefts();if(!L.length)return 0;
    const fz=frozen(),x=wrap.scrollLeft;let k=0,best=Infinity;
    L.forEach((v,i)=>{const d=Math.abs(Math.max(0,v-fz)-x);if(d<best){best=d;k=i;}});
    return k;};
  const paint=()=>{
    const k=cur();
    chips.forEach((c,i)=>c.classList.toggle('on',i===k));
    const max=Math.max(1,wrap.scrollWidth-wrap.clientWidth);
    const vis=wrap.clientWidth/Math.max(1,wrap.scrollWidth);
    fill.style.width=Math.max(8,vis*100)+'%';
    fill.style.left=(wrap.scrollLeft/max)*(100-Math.max(8,vis*100))+'%';
    nav.querySelector('[data-step="-1"]').disabled=wrap.scrollLeft<=1;
    nav.querySelector('[data-step="1"]').disabled=wrap.scrollLeft>=max-1;
    const on=wrap.scrollWidth-wrap.clientWidth>4;
    nav.classList.toggle('idle',!on);};
  chips.forEach((c,i)=>c.onclick=()=>goTo(i));
  nav.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>goTo(cur()+ +b.dataset.step));
  wrap.addEventListener('scroll',paint,{passive:true});
  addEventListener('resize',paint);
  paint();setTimeout(paint,0);
}
/* ===== 요일별 · 일자별 효율 히트맵 =====
   열 = 매체 × 광고상품 × KPI 지표, 값 = 그 KPI 의 단가.
   색은 스케일 그룹(요일 · 휴일평일 = 한 묶음 / 일자별 = 따로) 안에서만 비교한다 —
   초록(싸다=좋다) → 회색(중간) → 빨강(비싸다=나쁘다). */
const KPI_UNIT={imp:'cpm',click:'cpc',view:'cpv',conv:'cpa',eng:'cpe',install:'cpi',
  lead:'cpa',like:'cpe',share:'cpe'};
/* 중앙값은 회색 — 좋고 나쁨이 뚜렷한 양 끝만 색으로 */
const HM_GOOD=[111,155,131],HM_MID=[164,172,180],HM_BAD=[176,106,99];
const HM_COLW=132;        /* 값 열 최대 폭 — 매체가 적어도 너무 벌어지지 않게 */
const HM_LEADW=190;       /* 구분 열 폭 */
let HEAT_DAILY=false;     /* 일자별은 기본으로 접어 둔다 */
let HEAT_TIP=[];
/* 나쁜 쪽은 세게 누른다 — 저조한 칸이 화면을 잡아먹지 않고 잘 되는 칸이 먼저 보이게.
   HM_BAD_GAMMA 가 클수록 붉은 기가 늦게 붙고, HM_BAD_CAP 이 낮을수록 가장 나쁜 칸도 옅다. */
const HM_GOOD_GAMMA=1.35, HM_BAD_GAMMA=1.9, HM_BAD_CAP=.62;
const cl01=t=>Math.min(1,Math.max(0,isFinite(t)?t:0));
function hmFill(v,mn,md,mx){
  if(!isFinite(v))return null;
  let a,b,t;
  if(v<=md){a=HM_GOOD;b=HM_MID;
    t=Math.pow(cl01(md>mn?(v-mn)/(md-mn):0),HM_GOOD_GAMMA);}
  else{a=HM_MID;b=HM_BAD;
    t=Math.pow(cl01(mx>md?(v-md)/(mx-md):0),HM_BAD_GAMMA)*HM_BAD_CAP;}
  const rgb=a.map((x,i)=>Math.round(x+(b[i]-x)*cl01(t)));
  return 'rgb('+mixWhite(rgb,.46).join(',')+')';
}
const median=a=>{if(!a.length)return NaN;const b=a.slice().sort((x,y)=>x-y),h=b.length>>1;
  return b.length%2?b[h]:(b[h-1]+b[h])/2;};
/* 열 정의 — 지금 필터에 걸린 라인에서 매체 × 광고상품 × KPI 조합을 뽑는다 */
function heatCols(){
  const seen=new Map();
  activeLines().forEach(l=>{
    const lk=kpiOf(l);
    if(!l.media||!l.product||!lk)return;
    const k=[l.media,l.product,lk].join(SEP);
    if(!seen.has(k))seen.set(k,{media:l.media,product:l.product,kpi:lk,
      unit:KPI_UNIT[lk]||'cpm',lids:new Set()});
    seen.get(k).lids.add(l.id);});
  return [...seen.values()];
}
function renderHeat(){
  const tbl=$('heatTbl');if(!tbl)return;
  const cols=heatCols();
  const fs=factFilter();
  HEAT_TIP=[];
  if(!cols.length||!fs.length){
    tbl.style.maxWidth='';
    tbl.innerHTML='<tbody><tr><td class="head" style="text-align:center;padding:26px">'
      +'표시할 데이터가 없습니다.</td></tr></tbody>';return;}
  const bucket=cols.map(c=>fs.filter(f=>f.media===c.media&&f.product===c.product&&c.lids.has(f.lid)));
  const aggOf=(list)=>(list&&list.length)?aggFacts(list):null;
  const valOf=(ci,b)=>{
    if(!b)return NaN;
    const m=METRICS[cols[ci].unit];
    if(!m||!m.c)return NaN;
    const v=m.c(b);
    return isFinite(v)&&v>0?v:NaN;};
  /* ---- 카테고리 (scale = 색 비교 묶음) ---- */
  const cats=[];
  cats.push({name:'요일별',scale:'wd',rows:WD.map((w,i)=>({label:w+'요일',rest:i===0||i===6,
    pick:list=>list.filter(f=>ALLDATES[f.d].getDay()===i)}))});
  cats.push({name:'휴일 · 평일',scale:'wd',rows:[
    {label:'휴일 (주말 · 공휴일)',rest:true,pick:list=>list.filter(f=>isRest(ALLDATES[f.d]))},
    {label:'평일',pick:list=>list.filter(f=>!isRest(ALLDATES[f.d]))}]});
  if(HEAT_DAILY){
    const days=[...new Set(fs.map(f=>f.d))].sort((a,b)=>a-b);
    cats.push({name:'일자별',scale:'day',rows:days.map(di=>{const d=ALLDATES[di],h=holName(d);
      return {label:`${d.getMonth()+1}/${d.getDate()} (${WD[d.getDay()]})${h?' · '+h:''}`,
        rest:isRest(d),pick:list=>list.filter(f=>f.d===di)};})});}
  /* 값·집계를 미리 계산 (툴팁에서 다시 쓴다) */
  cats.forEach(cat=>{
    cat.agg=cat.rows.map(r=>cols.map((c,ci)=>aggOf(r.pick(bucket[ci]))));
    cat.grid=cat.agg.map(row=>row.map((b,ci)=>valOf(ci,b)));});
  /* 스케일 묶음별 최소 · 중앙 · 최대 */
  const scales={};
  cats.forEach(cat=>{
    if(!scales[cat.scale])scales[cat.scale]=cols.map(()=>[]);
    cat.grid.forEach(row=>row.forEach((v,ci)=>{if(isFinite(v))scales[cat.scale][ci].push(v);}));});
  const stat={};
  Object.keys(scales).forEach(k=>stat[k]=scales[k].map(vs=>
    ({mn:Math.min(...vs),md:median(vs),mx:Math.max(...vs),n:vs.length})));
  /* ---- 헤더 3줄 ---- */
  const mSpan=[];let last=null;
  cols.forEach(c=>{if(last&&last.media===c.media)mSpan[mSpan.length-1].n++;
    else mSpan.push({media:c.media,n:1});last=c;});
  let h='<colgroup>'+`<col style="width:${HM_LEADW}px">`
    +cols.map(()=>`<col style="width:${Math.floor(100/cols.length)}%">`).join('')+'</colgroup>'
    +'<thead>'
    +`<tr><th class="lead" rowspan="3">구분</th>`
    +mSpan.map(m=>`<th class="h1" colspan="${m.n}">${esc(m.media)}</th>`).join('')+'</tr>'
    +'<tr>'+cols.map(c=>`<th class="h2" title="${esc(c.product)}">${esc(c.product)}</th>`).join('')+'</tr>'
    +'<tr>'+cols.map(c=>`<th class="h3" title="KPI ${esc(KPI_LABEL[c.kpi]||c.kpi)}">`
        +`KPI : ${METRICS[c.unit].l}</th>`).join('')+'</tr></thead><tbody>';
  /* ---- 본문 ---- */
  cats.forEach(cat=>{
    const st=stat[cat.scale];
    h+=`<tr class="hcat"><td class="head" colspan="${cols.length+1}">${esc(cat.name)}</td></tr>`;
    cat.rows.forEach((r,ri)=>{
      h+=`<tr><td class="head${r.rest?' hol':''}" title="${esc(r.label)}">${esc(r.label)}</td>`
        +cols.map((c,ci)=>{
          const v=cat.grid[ri][ci],b=cat.agg[ri][ci],s=st[ci];
          if(!isFinite(v))return '<td class="hm"><span class="c na">–</span></td>';
          const bg=s.n>1?hmFill(v,s.mn,s.md,s.mx):null;
          const ti=HEAT_TIP.length;
          HEAT_TIP.push({label:r.label,cat:cat.name,c,b,v});
          return `<td class="hm" data-ti="${ti}">`
            +`<span class="c"${bg?` style="background:${bg}"`:''}>${METRICS[c.unit].f(v)}</span></td>`;}).join('')
        +'</tr>';});});
  tbl.innerHTML=h+'</tbody>';
  /* 매체가 적어도 열이 과하게 벌어지지 않도록 표 전체 폭에 상한을 둔다 */
  tbl.style.maxWidth=(HM_LEADW+cols.length*HM_COLW)+'px';
  wireHeatTip(tbl);
  mountHeatHead(tbl);
}
/* 칸에 마우스를 올리면 그 구간의 세부 실적을 보여준다 */
function wireHeatTip(tbl){
  const MET=['imp','click','view','conv','cost'];
  tbl.querySelectorAll('td.hm[data-ti]').forEach(td=>{
    td.addEventListener('mousemove',e=>{
      const t=HEAT_TIP[+td.dataset.ti];if(!t)return;
      const rows=MET.filter(k=>t.b&&isFinite(t.b[k])&&t.b[k]>0)
        .map(k=>`<div class="r"><span class="l">${METRICS[k].l}</span><b>${METRICS[k].f(t.b[k])}</b></div>`);
      const eff=['ctr','vtr','cvr'].filter(k=>{const v=METRICS[k].c(t.b);return isFinite(v)&&v>0;})
        .map(k=>`<div class="r"><span class="l">${METRICS[k].l}</span><b>${METRICS[k].f(METRICS[k].c(t.b))}</b></div>`);
      showTip(e.clientX,e.clientY,
        `<div class="t">${esc(t.c.media)} · ${esc(t.c.product)}</div>`
        +`<div class="r"><span class="l">${esc(t.cat)}</span><b>${esc(t.label)}</b></div>`
        +`<div class="r"><span class="l">${METRICS[t.c.unit].l} (KPI ${esc(KPI_LABEL[t.c.kpi]||t.c.kpi)})</span>`
        +`<b>${METRICS[t.c.unit].f(t.v)}</b></div>`
        +rows.join('')+eff.join(''));});
    td.addEventListener('mouseleave',hideTip);});
}
/* 세로 스크롤 없이 전부 보여주므로, 머리글은 화면에 떠 있는 복사본으로 고정한다
   (게재 히스토리와 같은 방식 — overflow-x:auto 안에서는 sticky 가 페이지에 붙지 않는다) */
function mountHeatHead(tbl){
  const wrap=tbl.closest('.heatwrap');if(!wrap||!tbl.tHead)return;
  let bar=$('heatHead');
  if(!bar){bar=el('div','ghfix');bar.id='heatHead';document.body.appendChild(bar);}
  const inner=el('div','inner');
  const clone=document.createElement('table');
  clone.className=tbl.className;
  clone.style.tableLayout='fixed';
  const cg=tbl.querySelector('colgroup');
  if(cg)clone.appendChild(cg.cloneNode(true));
  clone.appendChild(tbl.tHead.cloneNode(true));
  clone.querySelectorAll('th').forEach(th=>{th.style.position='static';});
  inner.appendChild(clone);
  bar.innerHTML='';bar.appendChild(inner);
  const stick=()=>parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--stick'),10)||144;
  const place=()=>{
    const sec=document.querySelector('.card[data-sect="heat"]');
    if(!sec||!sec.offsetParent){bar.classList.remove('on');return;}
    const r=wrap.getBoundingClientRect(),top=stick();
    const headH=tbl.tHead.getBoundingClientRect().height;
    const on=r.top<top&&r.bottom>top+headH+20;
    bar.classList.toggle('on',on);
    if(!on)return;
    bar.style.left=Math.round(r.left)+'px';
    bar.style.top=top+'px';
    bar.style.width=Math.round(r.width)+'px';
    bar.style.height=Math.round(headH)+'px';
    inner.style.width=Math.round(r.width)+'px';
    clone.style.width=Math.round(tbl.getBoundingClientRect().width)+'px';
    clone.style.minWidth=clone.style.width;
    clone.style.maxWidth=clone.style.width;
    inner.scrollLeft=wrap.scrollLeft;};
  wrap.onscroll=()=>{inner.scrollLeft=wrap.scrollLeft;};
  window.__heatPlace=place;
  if(!window.__heatHeadWired){
    window.__heatHeadWired=1;
    const run=()=>{if(window.__heatPlace)window.__heatPlace();};
    addEventListener('scroll',run,true);
    addEventListener('resize',run);}
  setTimeout(place,0);setTimeout(place,300);
}
(function wireHeat(){
  const b=$('heatDay');if(!b)return;
  b.classList.toggle('on',HEAT_DAILY);
  b.onclick=()=>{HEAT_DAILY=!HEAT_DAILY;b.classList.toggle('on',HEAT_DAILY);renderHeat();};
})();

/* ===== 8. 소재 운영 ===== */
let CR_FILTER={media:'all',type:'all',sort:'imp'};
const CR_CATALOG=fieldCatalog('dash',f=>!!METRICS[f.k]);
const CR_DEF={};CR_CATALOG.forEach(g=>g.cols.forEach(c=>CR_DEF[c.k]=c));
let CR_CFG={video:{rows:[],groups:[{id:uid(),name:'영상 소재',cols:['imp','view','vtr','cpv']}]},
            image:{rows:[],groups:[{id:uid(),name:'이미지 소재',cols:['imp','click','ctr','cpc']}]}};
const crAgg=c=>{const s=viewScope(),a=s.i0,b2=Math.min(s.i1+1,ELAPSED);
  const b=zeroB();
  AMET.concat(['cost']).forEach(k=>b[k]=sum((c.daily[k]||[]).slice(a,b2)));
  return b;};
const crVal=(c,k)=>{const b=crAgg(c);
  return METRICS[k].kind==='abs'?METRICS[k].f(b[k]):METRICS[k].f(METRICS[k].c(b));};
/* 켜면 매체 구분 없이 같은 이름의 소재를 하나로 합쳐서 견준다 */
let CR_ALL_MEDIA=false;
let GANTT_SORT='budget';   /* 게재 히스토리 정렬 — 같은 매체 안에서만 적용 */
/* 소재 레코드는 라인마다 따로 만들어지기 때문에 같은 매체·같은 소재가 표에 두 번 나올 수 있다.
   집계 차원이 같은 것끼리 일별 실적을 더해 한 줄로 합친다.
   byName=true 면 매체까지 무시하고 이름만으로 합친다(매체 구분 없이 비교). */
/* 합쳐진 소재의 매체 표시 — 예산을 많이 쓴 매체부터, 길면 …으로 줄인다 */
function mediaLabel(c,maxN){
  const list=c.medias&&c.medias.length?c.medias:[c.media].filter(Boolean);
  if(list.length<=1)return list[0]||'';
  const bud={};
  LINES.forEach(l=>{bud[l.media]=(bud[l.media]||0)+lineGross(l);});
  const sorted=list.slice().sort((a,b)=>(bud[b]||0)-(bud[a]||0));
  const n=Math.max(1,maxN||2);
  return sorted.length<=n?sorted.join(' · '):sorted.slice(0,n).join(' · ')+' …';
}
function mergeCreatives(list,byName){
  const KEYS=AMET.concat(['cost']);
  const m=new Map();
  list.forEach(c=>{
    const k=byName?c.name:[c.segment,c.media,c.line,c.name].join(SEP);
    let o=m.get(k);
    if(!o){
      o={...c,id:'mg'+m.size,lids:[c.lid],medias:[c.media],daily:{}};
      KEYS.forEach(x=>o.daily[x]=[]);
      m.set(k,o);
    }else{
      o.lids.push(c.lid);
      if(o.medias.indexOf(c.media)<0)o.medias.push(c.media);
      if(!o.img&&c.img)o.img=c.img;
      if(!o.clip&&c.clip)o.clip=c.clip;
      if(!o.yt&&c.yt)o.yt=c.yt;
      if(!o.g&&c.g)o.g=c.g;
    }
    KEYS.forEach(x=>{const a=c.daily[x]||[];
      for(let i=0;i<a.length;i++)o.daily[x][i]=(o.daily[x][i]||0)+(+a[i]||0);});});
  const out=[...m.values()];
  out.forEach(o=>{if(o.medias.length>1)o.media=o.medias.join(' · ');});
  return out;
}
function filteredCreatives(){
  /* 매체·구분·제품은 대시보드 공통 필터를 따른다 (매체는 토글로 풀 수 있다) */
  const keys=CR_ALL_MEDIA?['segment','line']:['segment','media','line'];
  let a=mergeCreatives(CREATIVES.filter(c=>(CR_FILTER.type==='all'||c.type===CR_FILTER.type)
    &&keys.every(k=>FILTER[k]==='all'||c[k]===FILTER[k])),CR_ALL_MEDIA);
  const sv=c=>{const b=crAgg(c);return CR_FILTER.sort==='ctr'?b.click/b.imp:b[CR_FILTER.sort];};
  a.sort((x,y)=>(sv(y)||0)-(sv(x)||0));
  return a;}

/* ===== 효율 우수 소재 — 효율 기준별 TOP N =====
   단가(CPV·CPM·CPC·CPA)는 낮을수록 우수하므로 오름차순.
   분모(조회·노출·클릭·전환)가 0인 소재는 순위에서 제외한다. */
const CR_RANKS=[
  {k:'cpv',l:'조회 효율',sub:'CPV 낮은 순',base:'view'},
  {k:'cpm',l:'노출 효율',sub:'CPM 낮은 순',base:'imp'},
  {k:'cpc',l:'클릭 효율',sub:'CPC 낮은 순',base:'click'},
  {k:'cpa',l:'전환 효율',sub:'CPA 낮은 순',base:'conv'},
  /* 반응률 — 높을수록 좋으므로 hi:true */
  {k:'ctr',l:'CTR',sub:'클릭률 높은 순',base:'click',hi:true},
  {k:'vtr',l:'VTR',sub:'조회율 높은 순',base:'view',hi:true}
];
/* 지금 데이터로 값이 나오는 기준만 남긴다 — 조회수가 아직 0이면 조회 효율 칸 자체를 감춘다 */
function crRanksLive(){
  const pool=filteredCreatives();
  return CR_RANKS.filter(r=>{
    if(!CR_RANK_ON.includes(r.k))return false;
    return pool.some(c=>{const b=crAgg(c);
      const v=METRICS[r.k].c(b);
      return (b[r.base]||0)>0&&isFinite(v)&&v>0;});});
}
/* 기본은 조회 · 클릭 · 노출 세 가지 — 좌 · 중 · 우 세 칸으로 나란히 놓는다.
   순서는 이 배열의 순서를 따른다. 다른 지표를 켜면 아래에 한 줄씩 더 붙는다. */
let CR_RANK_ON=['cpv','cpc','cpm'];
let CR_TOPN=5;
function renderRankPick(){
  const host=$('crRankPick');if(!host)return;
  host.innerHTML=CR_RANKS.map(r=>
    `<button data-rk="${r.k}" class="${CR_RANK_ON.includes(r.k)?'on':''}" title="${r.sub}">${r.l}</button>`).join('');
  host.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.rk;
    CR_RANK_ON=CR_RANK_ON.includes(k)?CR_RANK_ON.filter(x=>x!==k):CR_RANK_ON.concat([k]);
    if(!CR_RANK_ON.length)CR_RANK_ON=[k];
    renderRankPick();renderCreatives();});
}
/* 유튜브 썸네일 · 미리보기 */
const ytThumb=id=>`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/* 썸네일 뒤에는 항상 그라데이션을 깔아 둔다 —
   네트워크가 막힌 환경(사내망 · 오프라인)에서 이미지가 안 떠도 빈 칸이 되지 않는다 */
/* 소재 배경 — 그라데이션이 없는 소재(엑셀로 불러온 것 등)도 빈 칸이 되지 않게 한다 */
const crGrad=c=>{
  if(c&&c.g)return c.g;
  let h=0;const n2=String((c&&c.name)||'');
  for(const ch of n2)h=(h*31+ch.charCodeAt(0))>>>0;
  return GRADS[h%GRADS.length];};
function crBg(c){
  /* 큰따옴표를 쓰면 style="…" 속성이 그 자리에서 끊겨 배경이 통째로 사라진다 —
     반드시 홑따옴표로 감쌀 것 (업로드한 이미지가 안 보이던 원인) */
  if(c.img)return `url('${c.img.slice(0,5)==='data:'?c.img:encodeURI(c.img)}'), ${crGrad(c)}`;
  if(c.yt)return `url('${ytThumb(ytId(c.yt))}'), ${crGrad(c)}`;
  return crGrad(c);
}
/* 유튜브 플레이어는 file:// 로 열면 출처가 없어 "구성 오류 153" 을 낸다.
   그래서 http(s) 로 열렸을 때만 미리보기를 붙이고, 로컬 파일에서는 썸네일만 보여준다. */
const CAN_YT=/^https?:$/.test(location.protocol);
/* 영상 소재는 마우스를 올리면 썸네일 자리에서 소리 없이 잠깐 재생된다 */
function wireCrPlay(thumb,c){
  /* 올려 둔 저용량 클립이 있으면 그걸 튼다 — 인터넷도, https 도 필요 없다 */
  if(c.clip){
    thumb.classList.add('playable');
    let v=null,t=null;
    thumb.addEventListener('mouseenter',()=>{clearTimeout(t);
      t=setTimeout(()=>{if(v)return;
        v=document.createElement('video');
        v.className='ytprev clip';v.src=c.clip;v.muted=true;v.loop=true;
        v.playsInline=true;v.autoplay=true;
        thumb.appendChild(v);v.play().catch(()=>{});},200);});
    thumb.addEventListener('mouseleave',()=>{clearTimeout(t);
      if(v){v.pause();v.remove();v=null;}});
    return;}
  if(!c.yt)return;
  const id=ytId(c.yt);if(!id)return;
  thumb.classList.add('playable');
  if(!CAN_YT)return;
  let fr=null,t=null;
  thumb.addEventListener('mouseenter',()=>{
    clearTimeout(t);
    t=setTimeout(()=>{
      if(fr)return;
      fr=document.createElement('iframe');
      fr.className='ytprev';
      fr.setAttribute('allow','autoplay; encrypted-media');
      fr.setAttribute('frameborder','0');
      fr.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0`
        +`&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`;
      thumb.appendChild(fr);},260);});
  thumb.addEventListener('mouseleave',()=>{
    clearTimeout(t);
    if(fr){fr.remove();fr=null;}});
}
function renderCreatives(){
  const host=$('creatives');if(!host)return;
  host.innerHTML='';
  const pool=filteredCreatives();
  if(!pool.length){
    host.innerHTML='<div class="card"><div class="bd hint">조건에 맞는 소재가 없습니다.</div></div>';return;}
  /* 기준마다 한 칸 — 1위는 왼쪽에 크게, 2위부터는 오른쪽에 한 줄로 작게 */
  const cols=el('div','crcols',host);
  const live=crRanksLive();
  if(!live.length){
    host.innerHTML='<div class="card"><div class="bd hint">아직 효율을 계산할 수 있는 지표가 없습니다.</div></div>';return;}
  live.forEach(r=>{
    const rows=pool.map(c=>{const b=crAgg(c);
        return {c,b,base:b[r.base]||0,eff:METRICS[r.k].c(b)};})
      .filter(x=>x.base>0&&isFinite(x.eff)&&x.eff>0)
      .sort((a,b)=>r.hi?b.eff-a.eff:a.eff-b.eff)
      .slice(0,CR_TOPN);
    const g=el('div','crcol',cols);
    const hd=el('div','crband',g);
    hd.innerHTML=`<span class="t">${r.l}</span>`
      +`<span class="n">${r.sub} · 상위 ${rows.length}개</span>`;
    if(!rows.length){el('div','hint',g).textContent=`${METRICS[r.k].l}를 계산할 수 있는 소재가 없습니다.`;return;}
    const duo=el('div','crduo',g);
    /* --- 1위 --- */
    const x0=rows[0],c0=x0.c;
    const lead=el('div','cr lead',duo);
    lead.innerHTML=`<div class="thumb"><div class="fill" style="background-image:${crBg(c0)}"></div>
        <div class="ribbon"><i>1위</i></div>
        <div class="media" title="${esc(c0.media)}">${esc(mediaLabel(c0,2))}</div>
        <div class="rt">${c0.type==='video'?'▶ 영상':'🖼 이미지'}</div></div>
      <div class="meta"><div class="nm" title="${esc(c0.name)}">${esc(c0.name)}</div>
        <div class="eff"><span>${METRICS[r.k].l}</span><b>${METRICS[r.k].f(x0.eff)}</b></div></div>`;
    wireCrPlay(lead.querySelector('.thumb'),c0);
    lead.onclick=()=>openLightbox(c0);
    /* --- 2위 이하 --- */
    const rest=el('div','crrest',duo);
    /* 칸 수는 늘 CR_TOPN 기준으로 고정 — 소재가 적어도 카드 크기가 들쭉날쭉하지 않게 */
    const slots=Math.max(CR_TOPN-1,1);
    rest.style.gridTemplateRows=`repeat(${slots},1fr)`;
    rows.slice(1).forEach((x,i)=>{
      const c=x.c;
      const d=el('div','cr mini',rest);
      d.innerHTML=`<div class="thumb"><div class="fill" style="background-image:${crBg(c)}"></div>
          <div class="rankno">${i+2}</div></div>
        <div class="meta"><div class="nm" title="${esc(c.name)}">${esc(c.name)}</div>
          <div class="mm" title="${esc(c.media)}">${esc(mediaLabel(c,2))}</div>
          <div class="eff"><span>${METRICS[r.k].l}</span><b>${METRICS[r.k].f(x.eff)}</b></div></div>`;
      wireCrPlay(d.querySelector('.thumb'),c);
      d.onclick=()=>openLightbox(c);});
    /* 남는 칸은 빈 슬롯으로 채워 카드 크기를 고정한다 */
    for(let k=Math.max(rows.length-1,0);k<slots;k++)el('div','cr mini empty',rest);
  });
}
/* 전체 소재 보기 — 지금 조건에 걸린 소재를 지표와 함께 한 표로 (광고주도 볼 수 있다) */
function openCrAll(){
  const pool=filteredCreatives();
  const ranks=CR_RANKS.filter(r=>CR_RANK_ON.includes(r.k));
  const rows=pool.map(c=>{const b=crAgg(c);
    return {c,b,eff:ranks.map(r=>({k:r.k,l:METRICS[r.k].l,v:METRICS[r.k].c(b)}))};});
  let h=`<div class="hint" style="margin-bottom:9px">지금 화면 조건(${CR_ALL_MEDIA?'매체 구분 없음':'매체 필터 적용'})에 걸린 소재 ${rows.length}개입니다.
      소재를 누르면 원본과 지표를 볼 수 있습니다.</div>`;
  if(!rows.length){h+='<div class="card" style="padding:20px;text-align:center">표시할 소재가 없습니다.</div>';}
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:52px">미리보기</th><th style="min-width:190px">소재</th>
      <th style="min-width:110px">매체 · 상품</th><th style="width:96px">노출</th>
      <th style="width:88px">클릭</th><th style="width:88px">조회</th>
      ${ranks.map(r=>`<th style="width:92px">${METRICS[r.k].l}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(x=>{
      h+=`<tr data-crid="${esc(x.c.id)}" style="cursor:pointer">
        <td><span class="crthumb-sm" style="background-image:${crBg(x.c)}"></span></td>
        <td><b>${esc(x.c.name)}</b></td>
        <td class="hint">${esc(x.c.media||'')}${x.c.product?' · '+esc(x.c.product):''}</td>
        <td class="mono">${fmt(x.b.imp)}</td><td class="mono">${fmt(x.b.click)}</td><td class="mono">${fmt(x.b.view)}</td>
        ${x.eff.map(e=>`<td class="mono">${isFinite(e.v)&&e.v>0?METRICS[e.k].f(e.v):'<span class="na">–</span>'}</td>`).join('')}
      </tr>`;});
    h+='</tbody></table>';}
  openModal('전체 소재',h,'<button class="btn" data-close>닫기</button>',{w:1080});
  $('modalHost').querySelectorAll('[data-crid]').forEach(tr=>tr.onclick=()=>{
    const c=CREATIVES.find(x=>x.id===tr.dataset.crid);if(c){closeModal();openLightbox(c);}});
}
/* 소재 관리 — 캠페인 설정에 입력된 소재명을 이름 기준으로 모아 보여준다.
   같은 이름은 여러 매체·상품·타겟팅에 함께 쓰인 하나의 소재로 본다. */
function crNameGroups(){
  const m=new Map();
  CREATIVES.forEach(c=>{const k=c.name;
    if(!m.has(k))m.set(k,[]);m.get(k).push(c);});
  /* 순서는 CREATIVES 에 담긴 순서 그대로 — 소재 관리에서 ▲▼ 로 바꾼 순서가 유지된다 */
  return [...m.entries()].map(([name,list])=>({name,list}));
}
/* 소재 관리 목록에서 한 칸 위/아래로 옮긴다.
   실제 순서는 CREATIVES 배열 자체를 재정렬해서 캠페인과 함께 저장된다. */
function moveCrGroup(name,dir){
  const order=crNameGroups().map(g=>g.name);
  const i=order.indexOf(name), j=i+dir;
  if(i<0||j<0||j>=order.length)return false;
  order.splice(j,0,order.splice(i,1)[0]);
  const rank={};order.forEach((n,k)=>rank[n]=k);
  CREATIVES.sort((a,b)=>(rank[a.name]??999)-(rank[b.name]??999));
  return true;
}
/* ---------- 소재 파일 인코딩 ----------
   원본 영상은 보통 수백 MB~GB 라 그대로 담을 수 없다.
   대시보드에서는 "이렇게 생긴 소재"만 확인하면 되므로 브라우저 안에서
   ① 대표 컷(썸네일 JPEG)과 ② 아주 짧은 무음 미리보기(webm)로 줄여서 담는다.
   서버도, 인터넷도 필요 없고 원본은 올라가지 않는다. */
const CLIP_W=360;        /* 미리보기 가로 (세로는 비율대로) */
const CLIP_SEC=4;        /* 미리보기 길이 */
const CLIP_FPS=15;
const CLIP_KBPS=420;     /* 4초 × 420kbps ≈ 210KB */
const CLIP_MAXCHARS=1100000;  /* data URL 이 이보다 크면 클립은 버리고 대표 컷만 남긴다 */
const clipMime=()=>['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
  .find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||'';
/* 영상 → {poster, clip, w, h, dur}. onProgress(문구) 로 진행 상황을 알린다. */
function encodeVideo(file,onProgress,cb){
  const url=URL.createObjectURL(file);
  const v=document.createElement('video');
  v.preload='auto';v.muted=true;v.playsInline=true;v.src=url;
  const fail=msg=>{URL.revokeObjectURL(url);cb(null,msg);};
  v.onerror=()=>fail('이 브라우저가 읽을 수 없는 영상 형식입니다 (mp4 · mov · webm 을 권장합니다)');
  v.onloadedmetadata=()=>{
    const sc=Math.min(1,CLIP_W/Math.max(v.videoWidth||CLIP_W,1));
    const cw=Math.max(2,Math.round((v.videoWidth||CLIP_W)*sc)&~1);
    const ch=Math.max(2,Math.round((v.videoHeight||CLIP_W)*sc)&~1);
    const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
    const cx=cv.getContext('2d');
    const dur=isFinite(v.duration)?v.duration:0;
    const start=dur>CLIP_SEC+1?Math.min(dur*0.1,dur-CLIP_SEC-.2):0;
    /* 1) 대표 컷 — 시작 지점의 한 프레임 */
    onProgress&&onProgress('대표 컷을 뽑는 중…');
    v.currentTime=start+.05;
    v.onseeked=()=>{
      v.onseeked=null;
      cx.drawImage(v,0,0,cw,ch);
      let poster='';try{poster=cv.toDataURL('image/jpeg',.8);}catch(e){}
      const mime=clipMime();
      if(!mime||!cv.captureStream){URL.revokeObjectURL(url);
        return cb({poster,clip:'',w:cw,h:ch,dur},'미리보기 영상은 이 브라우저에서 만들 수 없어 대표 컷만 담았습니다');}
      /* 2) 짧은 무음 미리보기 — 캔버스에 그린 화면만 녹화한다 (소리는 담지 않는다) */
      onProgress&&onProgress('미리보기를 만드는 중… 0%');
      const stream=cv.captureStream(CLIP_FPS);
      let rec;
      try{rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:CLIP_KBPS*1000});}
      catch(e){URL.revokeObjectURL(url);
        return cb({poster,clip:'',w:cw,h:ch,dur},'미리보기 영상은 이 브라우저에서 만들 수 없어 대표 컷만 담았습니다');}
      const parts=[];
      rec.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data);};
      rec.onstop=()=>{
        try{v.pause();}catch(e){}
        URL.revokeObjectURL(url);
        const blob=new Blob(parts,{type:mime});
        const fr=new FileReader();
        fr.onload=()=>{const s2=String(fr.result||'');
          if(s2.length>CLIP_MAXCHARS)cb({poster,clip:'',w:cw,h:ch,dur},
            '미리보기가 너무 커서 대표 컷만 담았습니다');
          else cb({poster,clip:s2,w:cw,h:ch,dur},'');};
        fr.onerror=()=>cb({poster,clip:'',w:cw,h:ch,dur},'미리보기 저장에 실패해 대표 컷만 담았습니다');
        fr.readAsDataURL(blob);};
      const t0=performance.now();
      const draw=()=>{
        if(rec.state!=='recording')return;
        cx.drawImage(v,0,0,cw,ch);
        const el2=(performance.now()-t0)/1000;
        onProgress&&onProgress(`미리보기를 만드는 중… ${Math.min(99,Math.round(el2/CLIP_SEC*100))}%`);
        if(el2>=CLIP_SEC||(dur&&v.currentTime>=dur-.05)){try{rec.stop();}catch(e){}return;}
        requestAnimationFrame(draw);};
      v.play().then(()=>{rec.start();requestAnimationFrame(draw);})
        .catch(()=>{URL.revokeObjectURL(url);
          cb({poster,clip:'',w:cw,h:ch,dur},'영상을 재생할 수 없어 대표 컷만 담았습니다');});};
  };
}
/* 업로드한 이미지는 긴 변 720px 로 줄여 data URL 로 담는다 (문서가 과도하게 커지지 않도록) */
function shrinkImage(file,cb){
  const fr=new FileReader();
  fr.onload=()=>{const im=new Image();
    im.onload=()=>{const MX=720,sc=Math.min(1,MX/Math.max(im.width,im.height));
      const cv=document.createElement('canvas');
      cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);
      cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      let out;try{out=cv.toDataURL('image/jpeg',.82);}catch(e){out=fr.result;}
      cb(out.length>fr.result.length?fr.result:out);};
    im.onerror=()=>cb(fr.result);
    im.src=fr.result;};
  fr.readAsDataURL(file);
}
function openCrManage(){
  const groups=crNameGroups();
  let h=`<div class="hint" style="margin-bottom:10px">캠페인 설정에 입력된 <b>소재명</b>을 그대로 불러옵니다.
      같은 이름은 매체·상품·타겟팅이 달라도 하나의 소재로 봅니다.
      이름·유형·이미지를 고치면 그 이름을 쓰는 모든 라인에 함께 반영됩니다.</div>`;
  if(!groups.length){
    h+=`<div class="card" style="padding:22px;text-align:center">
        <div style="font-weight:700;margin-bottom:6px">등록된 소재가 없습니다</div>
        <div class="hint">먼저 <b>캠페인 설정</b> 탭에서 라인을 추가하고 그 라인의 <b>소재</b> 항목에 소재명을 입력하세요.</div></div>`;
  }else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:56px">순서</th>
      <th style="width:52px">미리보기</th><th style="min-width:220px">소재명</th>
      <th style="min-width:240px">사용 중인 매체 · 상품</th>
      <th style="width:96px">유형</th><th style="min-width:280px">소재 파일 · 링크</th>
      <th style="width:60px"></th></tr></thead><tbody>`;
    groups.forEach(g=>{
      const c0=g.list[0];
      const used=[...new Set(g.list.map(c=>c.media+' · '+c.product))];
      const bg=c0.img?`url(&quot;${c0.img.slice(0,4)==='data'?c0.img:encodeURI(c0.img)}&quot;)`:c0.g;
      h+=`<tr data-cn="${esc(g.name)}">
        <td style="white-space:nowrap;padding-left:4px;padding-right:4px">
          <button class="btn sm" data-cup2="${esc(g.name)}" title="위로" style="padding:0 5px">▲</button>
          <button class="btn sm" data-cdn="${esc(g.name)}" title="아래로" style="padding:0 5px;margin-left:2px">▼</button></td>
        <td><span class="crthumb-sm" style="background-image:${bg}"></span></td>
        <td><input class="txt" data-cf="name" value="${esc(g.name)}"></td>
        <td class="hint" style="line-height:1.5">${used.map(esc).join('<br>')}
            <span class="cnt2">라인 ${g.list.length}개</span></td>
        <td><select data-cf="type"><option value="video"${c0.type==='video'?' selected':''}>영상</option>
          <option value="image"${c0.type==='image'?' selected':''}>이미지</option></select></td>
        <td>${c0.type==='video'
          ? `<input class="txt" data-cf="yt" value="${esc(c0.yt||'')}" placeholder="YouTube 링크 또는 영상 ID">
             <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px">
               <label class="btn sm" style="cursor:pointer;margin:0">영상 파일 올리기
                 <input type="file" accept="video/*" data-cvid hidden></label>
               <span class="hint" data-cst>${c0.clip?'미리보기 있음':(c0.img?'대표 컷만 있음':'없음')}</span>
               ${(c0.clip||c0.img)?'<button class="btn sm" data-cclr>지우기</button>':''}</div>`
          : `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
               <label class="btn sm" style="cursor:pointer;margin:0">이미지 업로드
                 <input type="file" accept="image/*" data-cup hidden></label>
               <span class="hint" data-cst>${c0.img?'업로드됨':'없음'}</span>
               ${c0.img?'<button class="btn sm" data-cclr>지우기</button>':''}</div>`}</td>
        <td><button class="btn sm danger" data-cdel="${esc(g.name)}">삭제</button></td></tr>`;});
    h+=`</tbody></table>`;
  }
  h+=`<div class="hint" style="margin-top:12px">소재를 새로 추가하려면 <b>캠페인 설정</b> 탭에서
      해당 라인을 먼저 추가한 뒤 <b>소재</b> 칸에 이름을 적어 주세요.</div>
    <div class="hint" style="margin-top:6px">영상은 <b>원본이 올라가지 않습니다.</b>
      브라우저 안에서 대표 컷 한 장과 ${CLIP_SEC}초짜리 무음 미리보기(가로 ${CLIP_W}px)로 줄여서 담기 때문에
      2GB 짜리 원본을 골라도 저장되는 용량은 보통 <b>0.3MB 안팎</b>입니다.
      유튜브 링크를 넣어 두면 파일을 올리지 않아도 됩니다.</div>`;
  openModal('소재 관리',h,'<button class="btn" data-close>닫기</button>',{w:1080});
  const host=$('modalHost');
  const redraw=()=>{buildFacts();renderCreatives();renderGantt();renderTreemap();renderAll();};
  const reopen=()=>{redraw();closeModal();openCrManage();};
  host.querySelectorAll('tr[data-cn]').forEach(tr=>{
    const list=CREATIVES.filter(x=>x.name===tr.dataset.cn);
    if(!list.length)return;
    tr.querySelectorAll('[data-cf]').forEach(inp=>inp.onchange=e=>{
      const f=e.target.dataset.cf,v=e.target.value;
      if(f==='name'){const nv=v.trim();if(!nv)return;
        LINES.forEach(l=>{if(Array.isArray(l.creatives))
          l.creatives=l.creatives.map(n=>n===tr.dataset.cn?nv:n);});
        list.forEach(c=>c.name=nv);}
      else if(f==='yt'){const id=ytId(v);list.forEach(c=>c.yt=id);}
      else list.forEach(c=>c[f]=v);
      reopen();});
    const st=tr.querySelector('[data-cst]');
    const say=t=>{if(st)st.textContent=t;};
    const up=tr.querySelector('[data-cup]');
    if(up)up.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
      say('줄이는 중…');
      shrinkImage(f,url=>{list.forEach(c=>{c.img=url;c.type='image';});reopen();});};
    /* 영상은 원본을 담지 않는다 — 대표 컷 + 4초 무음 미리보기로 줄여서 담는다 */
    const vup=tr.querySelector('[data-cvid]');
    if(vup)vup.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
      say('영상을 읽는 중…');
      encodeVideo(f,say,(r,msg)=>{
        if(!r){say(msg||'변환에 실패했습니다');return;}
        list.forEach(c=>{c.img=r.poster||'';c.clip=r.clip||'';c.type='video';});
        if(msg)say(msg);
        reopen();});};
    const clr=tr.querySelector('[data-cclr]');
    if(clr)clr.onclick=()=>{list.forEach(c=>{c.img='';c.clip='';});reopen();};});
  host.querySelectorAll('[data-cup2]').forEach(b=>b.onclick=()=>{
    if(moveCrGroup(b.dataset.cup2,-1))reopen();});
  host.querySelectorAll('[data-cdn]').forEach(b=>b.onclick=()=>{
    if(moveCrGroup(b.dataset.cdn,1))reopen();});
  host.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{
    const nm=b.dataset.cdel;
    confirmModal(`"${nm}" 소재를 삭제할까요?`,
      '이 이름을 쓰는 모든 라인에서 소재가 빠지고 일별 실적도 함께 사라집니다.',()=>{
      LINES.forEach(l=>{if(Array.isArray(l.creatives))l.creatives=l.creatives.filter(n=>n!==nm);});
      CREATIVES=CREATIVES.filter(x=>x.name!==nm);
      LINES.forEach(l=>{const cs=CREATIVES.filter(x=>x.lid===l.id);
        cs.forEach(x=>x.share=1/Math.max(cs.length,1));});
      reopen();},'삭제');});
}
/* 유튜브 링크에서 영상 ID만 뽑아낸다 (전체 URL을 붙여넣어도 되도록) */
function ytId(s){
  s=String(s||'').trim();
  const m=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m?m[1]:s.replace(/[^A-Za-z0-9_-]/g,'');
}
function openLightbox(c){
  const mediaHTML=()=>c.type==='video'
    ? (c.clip
        ? `<video src="${c.clip}" controls loop muted autoplay playsinline
             style="max-width:100%;max-height:52vh;border-radius:10px;box-shadow:var(--shadow2)"></video>
           <div class="hint" style="margin-top:8px">화면만 담은 ${CLIP_SEC}초 미리보기입니다 (소리 없음)</div>`
        : c.yt
        ? (CAN_YT
            ?`<iframe src="https://www.youtube-nocookie.com/embed/${esc(ytId(c.yt))}?rel=0" allowfullscreen></iframe>`
            :`<div class="lbph">파일을 직접 열면 유튜브가 재생을 막습니다(구성 오류 153).<br>
               웹 주소(https)로 올린 뒤 열면 정상 재생됩니다.
               <a href="https://youtu.be/${esc(ytId(c.yt))}" target="_blank" rel="noopener"
                  style="display:inline-block;margin-top:9px;color:var(--acc);font-weight:800">유튜브에서 열기 ↗</a></div>`)
        :`<div class="lbph">영상 링크를 입력하면 여기에서 재생됩니다</div>`)
    : (c.img?`<img src="${esc(c.img)}" alt="${esc(c.name)}" style="max-width:100%;max-height:52vh;border-radius:10px;box-shadow:var(--shadow2)">`
           :`<div style="background:${c.g};border-radius:10px;display:grid;place-items:center;color:#fff;font-weight:800;
              width:${c.ratio==='9:16'?'270px':c.ratio==='4:5'?'350px':'440px'};aspect-ratio:${c.ratio.replace(':','/')};
              box-shadow:var(--shadow2)">원본 이미지 ${c.ratio}</div>`);
  const cfg=CR_CFG[c.type],picked=new Set(cfgCols(cfg));
  const allCols=CR_CATALOG.flatMap(g=>g.cols);
  const body=`
    <div class="lbwrap">
      <div class="lbmedia" id="lbMedia">${mediaHTML()}</div>
      <div class="lbside">
        <div class="lbsec">전체 효율</div>
        <div class="lbstats">
          ${allCols.map(x=>`<div class="lbst"><span>${x.l}</span><b class="mono">${crVal(c,x.k)}</b></div>`).join('')}
        </div>
        <div class="lbsec" style="margin-top:16px">카드에 표시할 항목
          <span class="hint" style="font-weight:500">${c.type==='video'?'영상':'이미지'} 소재 전체에 적용</span></div>
        <div class="lbpick">
          ${allCols.map(x=>`<label class="tagchip${picked.has(x.k)?' on':''}">
            <input type="checkbox" data-ck="${x.k}" ${picked.has(x.k)?'checked':''}> ${x.l}</label>`).join('')}
        </div>
        <div class="lbsec" style="margin-top:16px">소재 링크</div>
        <div class="lblink">
          ${c.type==='video'
            ? `<label>YouTube 링크 또는 영상 ID</label>
               <input id="lbYt" value="${esc(c.yt||'')}" placeholder="https://youtu.be/... 또는 dQw4w9WgXcQ">`
            : `<label>이미지 파일</label>
               <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                 <label class="btn sm" style="cursor:pointer;margin:0">이미지 업로드
                   <input type="file" accept="image/*" id="lbUp" hidden></label>
                 <span class="hint" id="lbImgMsg">${c.img?'업로드된 이미지가 있습니다':'등록된 이미지가 없습니다'}</span>
               </div>`}
          <div class="hint" style="margin-top:6px">${c.media} · ${c.product} · ${c.target} · ${c.line}</div>
        </div>
      </div>
    </div>`;
  openModal(c.name,body,
    `<div class="spacer"></div><button class="btn" data-close>닫기</button>
     <button class="btn primary" id="lbSave">적용</button>`,{w:1080});
  const host=$('modalHost');
  host.querySelectorAll('[data-ck]').forEach(cb=>cb.onchange=e=>{
    const k=e.target.dataset.ck;
    e.target.closest('label').classList.toggle('on',e.target.checked);
    const g=cfg.groups[0]||(cfg.groups[0]={id:uid(),name:'소재 지표',cols:[]});
    g.cols=e.target.checked?[...new Set([...cfgCols(cfg),k])].filter(x=>x!==undefined)
                           :cfgCols(cfg).filter(x=>x!==k);
    cfg.groups=[{id:g.id,name:g.name,cols:g.cols}];
    renderCreatives();});
  const up=host.querySelector('#lbUp');
  if(up)up.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
    shrinkImage(f,url=>{
      /* 같은 이름의 소재 전체에 반영 */
      CREATIVES.filter(x=>x.name===c.name).forEach(x=>x.img=url);
      const m=host.querySelector('#lbImgMsg');if(m)m.textContent='업로드된 이미지가 있습니다';
      $('lbMedia').innerHTML=mediaHTML();renderCreatives();renderGantt();});};
  $('lbSave').onclick=()=>{
    const y=host.querySelector('#lbYt');
    if(y)CREATIVES.filter(x=>x.name===c.name).forEach(x=>x.yt=ytId(y.value));
    $('lbMedia').innerHTML=mediaHTML();
    renderCreatives();renderGantt();};
}
const GANTT_CATALOG=fieldCatalog('dash',f=>!!METRICS[f.k])
  .concat([{g:'기타',cols:[{k:'days',l:'게재일수'}]}]);
const GANTT_DEF={};GANTT_CATALOG.forEach(g=>g.cols.forEach(c=>GANTT_DEF[c.k]=c));
let GANTT_RANGE='all';
let GANTT={rows:[{k:'media',sub:false},{k:'creative',sub:false}],order:null,
  groups:[{id:uid(),name:'소재 효율',cols:['imp','click','ctr','cpc','view','vtr','cpv']}],metric:'imp'};
/* 정렬 기준 — 예산(Gross)이 큰 매체가 위로, 그 안에서도 예산이 큰 소재가 위로 */
const mediaBudget=m=>sum(LINES.filter(l=>l.media===m).map(lineGross));
const creativeBudget=c=>{
  const ids=Array.isArray(c.lids)?c.lids:[c.lid];
  return sum(ids.map(id=>{const l=LINES.find(x=>x.id===id);
    if(!l)return 0;
    const n=CREATIVES.filter(x=>x.lid===l.id).length||1;
    return lineGross(l)/n;}));};
/* 차원별 정렬 키 (클수록 위) — 없으면 null 로 두고 이름순을 쓴다 */
function ganttRank(dim,val,c){
  if(dim==='media')return mediaBudget(val);
  if(dim==='creative')return creativeBudget(c);
  if(dim==='product'||dim==='segment'||dim==='target'||dim==='line')
    return sum(LINES.filter(l=>l[dim]===val).map(lineGross));
  return null;}
/* 값 비율(0~1)을 연한 남색 → 짙은 남색으로 보간 */
/* 단일 붉은색 톤 — 값이 낮으면 아주 연한 빨강, 높을수록 진한 빨강.
   농도 기준은 "그 행(소재)의 최댓값"이므로 행마다 독립적으로 읽는다. */
/* 효율(단가)을 못 구할 때만 쓰는 값 크기 농도 — 좋고 나쁨과 헷갈리지 않게 무채색 남색 계열 */
let SHADE_LOW=[0xe7,0xec,0xf1],
    SHADE_HIGH=[0x4c,0x72,0x9a];
const mixRGB=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function shade(t){
  const k=Math.max(0,Math.min(1,isFinite(t)?t:0));
  /* 한 행 안의 값 차이가 크지 않아도 강약이 보이도록 대비를 세운다 */
  return `rgb(${mixRGB(SHADE_LOW,SHADE_HIGH,Math.pow(k,1.7)).join(',')})`;
}
/* 게재 히스토리 칸 색 — 표에 나온 모든 소재·모든 날을 통틀어 한 스케일로 본다.
   (행마다 따로 재면 하루치만 있는 소재는 비교 대상이 없어 색이 안 나왔다)
   기준은 그 소재의 KPI 단가(낮을수록 좋음)이고, 금액이 없으면 반응률(높을수록 좋음)을 쓴다. */
function ganttEff(list,SC){
  const val={};let mode='cost';
  const unitOf=c=>{const l=LINES.find(x=>x.id===((c.lids&&c.lids[0])||c.lid));
    return KPI_UNIT[kpiOf(l)]||'cpm';};
  const baseOf=u=>({cpm:'imp',cpc:'click',cpv:'view',cpa:'conv',cpe:'eng',cpi:'install'}[u]||'imp');
  const collect=how=>{const v=[];
    list.forEach(c=>{
      const u=unitOf(c),bk=baseOf(u);
      for(let i=SC.i0;i<=SC.i1&&i<ELAPSED;i++){
        const x=how(c,i,u,bk);
        if(x!==null&&isFinite(x)){val[c.id+'|'+i]=x;v.push(x);}}});
    return v;};
  let vals=collect((c,i,u,bk)=>{
    const cost=(c.daily.cost&&c.daily.cost[i])||0;
    const base=(c.daily[bk]&&c.daily[bk][i])||0;
    if(!(cost>0&&base>0))return null;
    return u==='cpm'?cost/base*1000:cost/base;});
  if(vals.length<2){
    mode='rate';for(const k in val)delete val[k];
    vals=collect((c,i,u,bk)=>{
      const num=(c.daily[bk==='imp'?'click':bk]&&c.daily[bk==='imp'?'click':bk][i])||0;
      const den=(c.daily.imp&&c.daily.imp[i])||0;
      if(!(num>0&&den>0))return null;
      return -(num/den);});}          /* 반응률은 높을수록 좋으므로 부호를 뒤집는다 */
  if(!vals.length)return {ok:false};
  const mn=Math.min(...vals),mx=Math.max(...vals),md=median(vals);
  return {ok:true,mode,
    color:(c,i)=>{const v=val[c.id+'|'+i];
      return v===undefined?'#dfe4ea':(hmFill(v,mn,md,mx)||'#dfe4ea');}};
}
/* 게재 히스토리 정렬 값 — 같은 매체 안에서만 견준다 */
function ganttSortVal(c){
  const b=crAgg(c);
  switch(GANTT_SORT){
    case 'ctr':  return -(b.imp?b.click/b.imp:-1);
    case 'vtr':  return -(b.imp?b.view/b.imp:-1);
    case 'cpc':  return b.click?b.cost/b.click:Infinity;
    case 'cpv':  return b.view?b.cost/b.view:Infinity;
    case 'imp':  return -(b.imp||0);
    case 'click':return -(b.click||0);
    case 'view': return -(b.view||0);
    default:     return 0;}
}
function renderGantt(){
  const t=$('ganttTbl');
  /* 노출이 한 번도 없던 소재는 표에 올리지 않는다 */
  const list=filteredCreatives().filter(c=>sum(c.daily.imp||[])>0);
  const dims=GANTT.rows.map(r=>r.k),cols=cfgCols(GANTT),seps=gsepSet(GANTT);
  let rowsData=list.map(c=>({c,key:dims.map(d=>d==='creative'?c.name:c[d]).join(SEP),
    vals:dims.map(d=>d==='creative'?c.name:c[d])}));
  /* 예산이 큰 순서로 (같으면 이름순) — 차원 순서대로 비교 */
  rowsData.sort((a,b)=>{
    for(let i=0;i<dims.length;i++){
      /* 소재 열에 오면 사용자가 고른 정렬 기준을 적용한다 (같은 매체·같은 그룹 안에서만) */
      if(dims[i]==='creative'&&GANTT_SORT!=='budget'){
        if(GANTT_SORT==='name')
          return String(a.vals[i]).localeCompare(String(b.vals[i]),'ko');
        const av=ganttSortVal(a.c),bv=ganttSortVal(b.c);
        if(av!==bv)return av-bv;
        return String(a.vals[i]).localeCompare(String(b.vals[i]),'ko');}
      const ra=ganttRank(dims[i],a.vals[i],a.c),rb=ganttRank(dims[i],b.vals[i],b.c);
      if(ra!==null&&rb!==null&&ra!==rb)return rb-ra;
      if(a.vals[i]!==b.vals[i])return String(a.vals[i]).localeCompare(String(b.vals[i]),'ko');}
    return 0;});
  if(GANTT.order&&GANTT_SORT==='budget'){const idx=k=>{const i=GANTT.order.indexOf(k);return i<0?1e9:i;};
    rowsData.sort((a,b)=>idx(a.key)-idx(b.key));}
  const span=mergeSpans(rowsData.map(r=>r.vals),dims.length);
  /* 기본은 캠페인 전체 일정, 설정에서 조회 기간으로 좁힐 수 있다 */
  const SC=GANTT_RANGE==='view'?viewScope():mkScope(campStart(),campEnd());
  const VD=ALLDATES.slice(SC.i0,SC.i1+1);
  const months=[];let cm=null;
  VD.forEach(d=>{const m=d.getMonth()+1;if(!cm||cm.m!==m){cm={m,n:0};months.push(cm);}cm.n++;});
  const leadW={segment:88,media:74,product:126,target:132,line:96,creative:196,month:80};
  let lefts=[],acc=0;dims.forEach(d=>{lefts.push(acc);acc+=leadW[d]||110;});
  const metricW=76,leadTotal=acc+cols.length*metricW;
  const mk=GANTT.metric;
  /* 색 기준은 표 전체를 한 번에 잡는다 */
  const EFF=ganttEff(rowsData.map(r=>r.c),SC);
  /* 효율을 못 구하는 경우에만 쓰는 예비 농도 — 그 행의 최댓값 기준 */
  const rowMax=c=>{const a=c.daily[mk]||[];
    let m=0;for(let i=SC.i0;i<=SC.i1&&i<ELAPSED;i++)if((a[i]||0)>m)m=a[i];return m||1;};
  let h='<thead><tr>';
  dims.forEach((d,i)=>h+=`<th class="lead" rowspan="2" style="left:${lefts[i]}px;min-width:${leadW[d]||110}px">${(DIMS.find(x=>x.k===d)||{l:d}).l}</th>`);
  h+=GANTT.groups.filter(g=>g.cols.length).map((g,gi)=>`<th class="g${gi>0?' gsep':''}" colspan="${g.cols.length}" style="position:static">${esc(g.name)}</th>`).join('');
  h+=months.map(m=>`<th class="mo gsep" colspan="${m.n}" style="position:static">${m.m}월</th>`).join('')+'</tr><tr>';
  cols.forEach((k,i)=>h+=`<th class="mcol ${seps.has(i)?'gsep':''}" style="position:static;min-width:${metricW}px">${GANTT_DEF[k].l}</th>`);
  VD.forEach((d,i)=>h+=`<th data-di="${i}" style="position:static;min-width:13px;font-size:9px;padding:0;color:${isRest(d)?'#98a3b1':'#dbe4ee'}" class="dhd ${i===0?'gsep':''}">${d.getDate()}</th>`);
  h+='</tr></thead><tbody>';
  rowsData.forEach((rd,ri)=>{
    const c=rd.c;
    h+=`<tr data-key="${esc(rd.key)}" data-pre="${esc(rd.vals.slice(0,-1).join(SEP))}">`;
    rd.vals.forEach((v,ci)=>{const sp=span[ri][ci];if(sp===0)return;
      const isCr=dims[ci]==='creative';
      h+=`<td class="lead ${isCr?'nm':''}" data-lvl="${ci}" data-pk="${esc(rd.vals.slice(0,ci+1).join(SEP))}"`
        +` data-pp="${esc(rd.vals.slice(0,ci).join(SEP))}"${sp>1?` rowspan="${sp}"`:''} style="left:${lefts[ci]}px;min-width:${leadW[dims[ci]]||110}px">`
        +(isCr?`<span style="display:flex;align-items:center;gap:8px"><span class="crthumb-sm" style="background-image:${c.g}"></span>
           <span style="overflow:hidden;text-overflow:ellipsis">${esc(v)}</span></span>`:esc(v))+'</td>';});
    cols.forEach((k,i)=>{
      const days=c.daily.imp.filter(v=>v>0).length;
      const v=k==='days'?days+'일':crVal(c,k);
      h+=`<td class="mono mcol${k===mk?' hl':''}${seps.has(i)?' gsep':''}" style="padding:0 9px;min-width:${metricW}px">${v}</td>`;});
    const maxV=rowMax(c);                                /* 이 행(소재)의 최댓값 */
    VD.forEach((d,i)=>{
      const gi=SC.i0+i;                                  /* 캠페인 전체 기준 인덱스 */
      const arr=c.daily[mk]||[],v=gi<ELAPSED?(arr[gi]||0):0;
      const hol=!!holName(d),we=d.getDay()%6===0;
      /* 색은 그 날의 효율 — 좋을수록 초록, 나쁠수록 붉은색 (히트맵과 같은 기준) */
      const bg=EFF.ok?EFF.color(c,gi):shade(v/maxV);
      h+=`<td class="day${hol?' hol':we?' we':''}${i===0?' gsep':''}" data-di="${i}" data-gi="${gi}" data-cid="${c.id}">`
        +(v>0?`<span class="b" style="background:${bg}"></span>`:'')+'</td>';});
    h+='</tr>';});
  t.innerHTML=h+'</tbody>';
  markBlanks(t);
  t.style.minWidth=(leadTotal+VD.length*13)+'px';
  enableRowDrag(t,GANTT,renderGantt);
  wireGanttHover(t,SC);
  mountGanttHead(t);
}
/* ---- 떠 있는 머리글 막대 ----
   게재 히스토리는 세로 스크롤 없이 전체 높이를 보여 주므로(소재 비교가 중요) 표 안에서
   position:sticky 로는 머리글을 붙일 수 없다. 대신 머리글만 복사해 화면 위쪽에 띄우고,
   가로 스크롤은 원래 표와 서로 맞춘다. */
function mountGanttHead(tbl){
  const wrap=tbl.closest('.gantt-wrap');if(!wrap)return;
  let bar=$('ganttHead');
  if(!bar){bar=el('div','ghfix');bar.id='ganttHead';document.body.appendChild(bar);}
  const inner=el('div','inner');
  const clone=document.createElement('table');
  clone.className=tbl.className;
  clone.style.tableLayout='fixed';
  clone.appendChild(tbl.tHead.cloneNode(true));
  /* 원본 열 너비를 그대로 옮긴다.
     본문 첫 행은 rowspan 때문에 칸 수가 모자랄 수 있어(머리글보다 적다) 폭이 어긋났다 —
     머리글 자체에서 잰다: 1행의 lead 칸들 + 2행의 나머지 칸들이 정확히 전체 열이다 */
  const cg=document.createElement('colgroup');
  const leadTh=[...tbl.tHead.rows[0].cells].filter(th=>th.classList.contains('lead'));
  const restTh=tbl.tHead.rows[1]?[...tbl.tHead.rows[1].cells]:[];
  leadTh.concat(restTh).forEach(th=>{
    const c=document.createElement('col');
    c.style.width=Math.round(th.getBoundingClientRect().width)+'px';
    cg.appendChild(c);});
  clone.insertBefore(cg,clone.firstChild);
  /* 복사본에서는 고정(sticky)과 좌표를 모두 푼다 — 안 그러면 앞쪽 칸이 서로 겹친다 */
  clone.querySelectorAll('th').forEach(th=>{
    th.style.position='static';th.style.left='auto';th.style.zIndex='auto';});
  inner.appendChild(clone);
  bar.innerHTML='';bar.appendChild(inner);
  const stick=()=>parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--stick'),10)||144;
  const place=()=>{
    const sec=document.querySelector('.card[data-sect="gantt"]');
    if(!sec||!sec.offsetParent){bar.classList.remove('on');return;}
    const r=wrap.getBoundingClientRect(),top=stick();
    const headH=tbl.tHead.getBoundingClientRect().height;
    const on=r.top<top&&r.bottom>top+headH+20;
    bar.classList.toggle('on',on);
    if(!on)return;
    bar.style.left=Math.round(r.left)+'px';
    bar.style.top=top+'px';
    bar.style.width=Math.round(r.width)+'px';
    bar.style.height=Math.round(headH)+'px';
    inner.style.width=Math.round(r.width)+'px';
    /* 복사본 표의 폭을 원본과 똑같이 맞춰야 가로 스크롤 위치가 어긋나지 않는다 */
    clone.style.width=Math.round(tbl.getBoundingClientRect().width)+'px';
    clone.style.minWidth=clone.style.width;
    inner.scrollLeft=wrap.scrollLeft;};
  wrap.onscroll=()=>{inner.scrollLeft=wrap.scrollLeft;};
  window.__ganttPlace=place;
  if(!window.__ganttHeadWired){
    window.__ganttHeadWired=1;
    const run=()=>{if(window.__ganttPlace)window.__ganttPlace();};
    addEventListener('scroll',run,true);
    addEventListener('resize',run);}
  setTimeout(place,0);setTimeout(place,300);
}
/* 날짜 칸·날짜 헤더에 마우스를 올리면 해당 행·열을 살짝 강조하고,
   칸 위에서는 그 날짜·그 소재의 광고 효율을 툴팁으로 보여준다 */
function wireGanttHover(t,SC){
  const paint=(di,on)=>{
    t.querySelectorAll(`[data-di="${di}"]`).forEach(e=>e.classList.toggle('colhi',on));};
  const dayEff=(c,gi)=>{
    const g=k=>(c.daily[k]&&c.daily[k][gi])||0;
    const b={imp:g('imp'),click:g('click'),view:g('view'),conv:g('conv'),
      lead:g('lead'),eng:g('eng'),rev:g('rev'),net:g('net'),cost:g('cost')};
    return b;};
  t.querySelectorAll('td.day').forEach(td=>{
    const di=td.dataset.di,gi=+td.dataset.gi,cid=td.dataset.cid;
    td.addEventListener('mouseenter',()=>{paint(di,true);td.closest('tr').classList.add('rowhi');});
    td.addEventListener('mouseleave',()=>{paint(di,false);td.closest('tr').classList.remove('rowhi');hideTip();});
    td.addEventListener('mousemove',e=>{
      const c=CREATIVES.find(x=>x.id===cid);if(!c)return;
      const d=ALLDATES[gi],hol=holName(d);
      if(gi>=ELAPSED){showTip(e.clientX,e.clientY,
        `<div class="t">${dFull(d)} (${WD[d.getDay()]})</div><div class="r"><span class="l">${esc(c.name)}</span><b>미집행</b></div>`);return;}
      const b=dayEff(c,gi);
      const row=(l,v)=>`<div class="r"><span class="l">${l}</span><b>${v}</b></div>`;
      showTip(e.clientX,e.clientY,
        `<div class="t">${dFull(d)} (${WD[d.getDay()]})${hol?' · '+hol:''}</div>`
        +`<div class="r" style="border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:5px;margin-bottom:5px">
            <span class="l">${esc(c.name)}</span><b>${esc(c.media)}</b></div>`
        +row('노출',fmt(b.imp))+row('클릭',fmt(b.click))+row('조회',fmt(b.view))
        +row('CTR',pct(b.click/b.imp))+row('VTR',pct(b.view/b.imp))
        +row('CPM',won(b.cost/b.imp*1000))+row('CPC',won(b.cost/b.click))+row('CPV',won(b.cost/b.view))
        +row('광고비',won(b.cost)));});});
  t.querySelectorAll('th.dhd').forEach(th=>{
    const di=th.dataset.di;
    th.addEventListener('mouseenter',()=>paint(di,true));
    th.addEventListener('mouseleave',()=>paint(di,false));});
}

/* ===== 8-2. 트리맵 — 어느 매체·상품·소재에서 물량이 나오는지 =====
   면적 = 값의 크기, 색 = 매체, 농도 = 선택한 KPI의 단가 효율(낮을수록 진함). */
const TMAP_METRICS=['imp','click','view','conv','cost'];
const TMAP_UNIT={imp:'cpm',click:'cpc',view:'cpv',conv:'cpa'};
let TMAP={metric:'imp',dims:['media','product','creative']};
/* 매체별 색 — 전체 톤과 어울리는 저채도 계열 */
/* 색이 서로 확실히 구분되도록 색상환에서 골고루 뽑은 값 (효율 버블과 같은 팔레트) */
const MEDIA_HUES=[[58,102,140],[176,106,99],[79,124,101],[139,110,160],[186,143,74],
                  [64,130,138],[118,120,132],[196,120,150],[96,116,72],[150,96,84]];
/* "기타"로 묶인 작은 매체들 — 무채색으로 뒤로 물린다 */
const TM_ETC=[150,157,166];
const mixWhite=(rgb,t)=>rgb.map(v=>Math.round(v+(255-v)*t));
const inkOn=rgb=>(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)>168?'#26313c':'#fff';
/* 매체는 목록 순서대로 색을 배정한다 — 해시로 뽑으면 서로 겹치거나 비슷해진다.
   효율 버블에서 고른 매체 색(BUB_COLORS)을 그대로 따라가므로 두 그래프의 색이 항상 같다. */
const hueOf=name=>{
  const ms=[...new Set(LINES.map(l=>l.media))];
  const i=ms.indexOf(name);
  if(i>=0){
    let idx=i;
    try{if(BUB_COLORS[name]===undefined)BUB_COLORS[name]=i%BUB_HUES.length;idx=BUB_COLORS[name];}catch(e){}
    return (typeof BUB_HUES!=='undefined'?BUB_HUES:MEDIA_HUES)[idx%MEDIA_HUES.length]||MEDIA_HUES[0];}
  let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;
  return MEDIA_HUES[h%MEDIA_HUES.length];};
/* squarified treemap — 타일이 최대한 정사각형에 가깝게 */
function squarify(items,x,y,w,h){
  const out=[];
  const rows=items.filter(r=>r.v>0);
  if(!rows.length||w<=0||h<=0)return out;
  const total=sum(rows.map(r=>r.v))||1;
  const scale=(w*h)/total;
  const worst=(row,len)=>{
    const s=sum(row.map(r=>r.v))*scale;
    if(!s||!len)return Infinity;
    const mx=Math.max(...row.map(r=>r.v))*scale, mn=Math.min(...row.map(r=>r.v))*scale;
    return Math.max(len*len*mx/(s*s),(s*s)/(len*len*mn));};
  let cx=x,cy=y,cw=w,ch=h,i=0;
  while(i<rows.length){
    const len=Math.min(cw,ch);
    let row=[rows[i]],j=i+1;
    while(j<rows.length&&worst(row.concat([rows[j]]),len)<=worst(row,len)){row.push(rows[j]);j++;}
    const s=sum(row.map(r=>r.v))*scale;
    if(cw>=ch){
      const rw=Math.min(s/Math.max(ch,.001),cw);let oy=cy;
      row.forEach(r=>{const rh=(r.v*scale)/Math.max(rw,.001);
        out.push({...r,x:cx,y:oy,w:rw,h:rh});oy+=rh;});
      cx+=rw;cw-=rw;
    }else{
      const rh=Math.min(s/Math.max(cw,.001),ch);let ox=cx;
      row.forEach(r=>{const rw2=(r.v*scale)/Math.max(rh,.001);
        out.push({...r,x:ox,y:cy,w:rw2,h:rh});ox+=rw2;});
      cy+=rh;ch-=rh;}
    i=j;}
  return out;
}
const tmapVal=(k,b)=>k==='cost'?b.cost:(b[k]||0);
function renderTreemap(){
  const host=$('treemap');if(!host)return;
  host.innerHTML='';
  const box=el('div','tmap',host);
  const dims=TMAP.dims, mk=TMAP.metric, uk=TMAP_UNIT[mk];
  const dLabel=k=>(DIMS.find(d=>d.k===k)||{l:k}).l;
  const secName=$('tmapSecName');
  if(secName)secName.textContent=dims.map(dLabel).join(' › ');
  const ttl=$('tmapTitle');
  if(ttl)ttl.textContent=`${METRICS[mk].l} 분포`;
  const lg=$('tmapLegend');
  if(lg)lg.textContent=uk?`색이 진할수록 ${METRICS[uk].l} 우수`:'색은 매체 구분';
  const fs=factFilter();
  /* 계층 집계 — 마지막 차원이 타일 */
  const root=new Map();
  fs.forEach(f=>{
    let node=root;
    const path=dims.map(d=>f[d]||'(미지정)');
    path.forEach((key,i)=>{
      if(!node.has(key))node.set(key,i===path.length-1?{v:0,c:0}:new Map());
      if(i===path.length-1){const o=node.get(key);o.v+=tmapVal(mk,f);o.c+=f.cost;}
      else node=node.get(key);});});
  const walk=(m)=>[...m.entries()].map(([name,val])=>{
    if(val instanceof Map){const kids=walk(val);
      return {name,kids,v:sum(kids.map(k=>k.v)),c:sum(kids.map(k=>k.c))};}
    return {name,v:val.v,c:val.c};}).filter(n=>n.v>0).sort((a,b)=>b.v-a.v);
  let sects=walk(root);
  const grand=sum(sects.map(s=>s.v));
  /* 너무 작아 이름조차 줄어 버리는 매체는 "기타" 하나로 묶어 회색으로 보여 준다 —
     칸이 많아질수록 큰 매체를 읽기 어려워지기 때문 */
  const TM_MIN=.03;
  if(grand>0){
    const small=sects.filter(s=>s.v/grand<TM_MIN);
    if(small.length>1){
      sects=sects.filter(s=>s.v/grand>=TM_MIN);
      sects.push({name:'기타',etc:1,kids:small,
        v:sum(small.map(s=>s.v)),c:sum(small.map(s=>s.c))});
      sects.sort((a,b)=>b.v-a.v);}}
  if(!grand){box.innerHTML='<div class="tmap-empty">표시할 값이 없습니다.</div>';return;}
  const W=box.clientWidth||box.offsetWidth||1000, H=box.clientHeight||460;
  const HEAD=21, SUBHEAD=17;
  /* 단가(낮을수록 우수)를 0~1 로 — 섹터 안에서 순위를 매긴다 */
  const shadeT=(leaves)=>{
    const vals=leaves.map(l=>uk&&l.v>0?(l.c/l.v)*(mk==='imp'?1000:1):NaN)
      .filter(v=>isFinite(v)&&v>0);
    if(!uk||vals.length<2)return ()=>.20;
    const lo=Math.min(...vals),hi=Math.max(...vals);
    return leaf=>{
      const u=leaf.v>0?(leaf.c/leaf.v)*(mk==='imp'?1000:1):NaN;
      if(!isFinite(u)||hi===lo)return .22;
      return .02+((u-lo)/(hi-lo))*.40;};};   /* 단가가 낮을수록 t 작음 = 진함 */
  const collect=n=>n.kids?n.kids.flatMap(collect):[n];
  const tip=(names,leaf,sect)=>e=>showTip(e.clientX,e.clientY,
    `<div class="t">${names.map(esc).join(' · ')}</div>`
    +`<div class="r"><span class="l">${METRICS[mk].l}</span><b>${METRICS[mk].f(leaf.v)}</b></div>`
    +(uk?`<div class="r"><span class="l">${METRICS[uk].l}</span><b>${METRICS[uk].f(
        (leaf.c/leaf.v)*(mk==='imp'?1000:1))}</b></div>`:'')
    +`<div class="r"><span class="l">${esc(names[0])} 안에서</span><b>${pct(leaf.v/sect.v,1)}</b></div>`
    +`<div class="r"><span class="l">전체 대비</span><b>${pct(leaf.v/grand,1)}</b></div>`);
  squarify(sects,0,0,W,H).forEach(sc=>{
    const base=sc.etc?TM_ETC:hueOf(sc.name);
    const tOf=shadeT(collect(sc));
    /* 섹터 — 굵은 테두리를 border-box 로 그려 폭이 균일하게 */
    const sec=el('div','sect',box);
    sec.style.cssText=`left:${sc.x}px;top:${sc.y}px;width:${sc.w}px;height:${sc.h}px`;
    const inner=el('div','sin',sec);
    if(sc.h>HEAD+10){
      const hd=el('div','sh',sec);
      const sA=mixWhite(base,0),sB=mixWhite(base,.18);
      hd.style.background=`linear-gradient(100deg,rgb(${sA.join(',')}),rgb(${sB.join(',')}))`;
      hd.innerHTML=`<span>${esc(sc.name)}</span><span class="sv">${pct(sc.v/grand,1)}</span>`;
      inner.style.top=HEAD+'px';}
    /* 타일 배치는 섹터의 실제 안쪽 크기(테두리 제외)를 그대로 쓴다 —
       예전처럼 sc.w-6 을 쓰면 오른쪽이 2px 잘려 매체명 띠와 어긋난다 */
    const iw=sec.clientWidth||Math.max(sc.w-8,0), ih=sec.clientHeight||Math.max(sc.h-8,0);
    const tile=(node,x,y,w,h,names,parent)=>{
      /* 글자를 모두 흰색으로 통일하기 위해 타일이 너무 밝아지지 않게 농도를 묶는다 */
      const t=Math.min(tOf(node),.42), rgb=mixWhite(base,t);
      const lite=mixWhite(rgb,.14);
      const d=el('div','tile',inner);
      d.className='tile'+(h<34?' sm':'')+(h<24||w<52?' xs':'')+(h<15||w<34?' tiny':'');
      d.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;`
        +`background:linear-gradient(152deg,rgb(${lite.join(',')}),rgb(${rgb.join(',')}));color:#fff`;
      d.innerHTML=`<div class="tn">${esc(node.name)}</div>`
        +`<div class="tv">${METRICS[mk].f(node.v)}</div>`;
      d.addEventListener('mousemove',tip(names,node,sc));
      d.addEventListener('mouseleave',hideTip);};
    const layout=(nodes,x,y,w,h,names,depth)=>{
      squarify(nodes,x,y,w,h).forEach(n=>{
        if(n.kids&&n.kids.length&&n.h>SUBHEAD+12&&n.w>46){
          const g=el('div','grp',inner);
          g.style.cssText=`left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px`;
          const gh=el('div','gh',g);
          const gA=mixWhite(base,.06),gB=mixWhite(base,.24);
          gh.style.background=`linear-gradient(100deg,rgb(${gA.join(',')}),rgb(${gB.join(',')}))`;
          gh.style.color='#fff';
          gh.textContent=n.name;
          layout(n.kids,n.x,n.y+SUBHEAD,n.w,n.h-SUBHEAD,names.concat([n.name]),depth+1);
        }else if(n.kids&&n.kids.length){
          layout(n.kids,n.x,n.y,n.w,n.h,names.concat([n.name]),depth+1);
        }else{
          tile(n,n.x,n.y,n.w,n.h,names.concat([n.name]));}});};
    const y0=sc.h>HEAD+10?HEAD:0;
    layout(sc.kids||[sc],0,0,Math.max(iw,0),Math.max(ih-y0,0),[sc.name],1);
  });
}
addEventListener('resize',()=>{clearTimeout(window.__tmapT);
  window.__tmapT=setTimeout(()=>{if(!$('sub-perf').classList.contains('hidden'))renderTreemap();},180);});

/* ===== 12. 효율 버블 =====
   x·y = 효율 지표 (단가는 낮을수록 좋으므로 축 방향을 뒤집어 "좋을수록 오른쪽·위")
   색 = 매체 · 진하기 = 광고상품 · 크기 = 소진 광고비 · 회색 = 리포트 시점에 꺼져 있는 소재 */
const BUB_AXES=[
  {k:'cpm',l:'노출 효율 (CPM)',base:'imp'},
  {k:'cpc',l:'클릭 효율 (CPC)',base:'click'},
  {k:'cpv',l:'조회 효율 (CPV)',base:'view'},
  {k:'cpa',l:'전환 효율 (CPA)',base:'conv'},
  {k:'ctr',l:'클릭률 (CTR)',base:'click'},
  {k:'vtr',l:'조회율 (VTR)',base:'view'}
];
let BUB={x:'cpc',y:'cpm',dim:'creative'};
/* 매체별 색 계열 — 사용자가 바꿀 수 있고 캠페인 문서에 함께 저장된다 */
let BUB_HUES=[[58,102,140],[176,106,99],[79,124,101],[139,110,160],[186,143,74],
                [64,130,138],[118,120,132],[196,120,150]];
let BUB_COLORS={};
const bubDef=k=>BUB_AXES.find(a=>a.k===k)||BUB_AXES[0];
const BUB_LOWER=new Set(['cpm','cpc','cpv','cpa','cpi','cpe']);
const OFF_HUE=[150,158,167];
/* 운영 중 판정 — 지금 고른 기간의 **마지막 집행일**까지 집행이 있었으면 운영 중으로 본다.
   (기준일은 그 기간에 실제로 무언가 집행된 마지막 날이라, 주말처럼 전 매체가 쉰 날이
    맨 뒤에 걸려도 모든 소재가 한꺼번에 OFF 로 뒤집히지 않는다) */
function bubLastDay(fs){
  let last=-1;
  fs.forEach(f=>{if(f.d>last&&((f.imp||0)>0||(f.cost||0)>0||(f.click||0)>0))last=f.d;});
  return last;
}
function bubIsOn(rows,last){
  if(last<0)return false;
  return rows.some(f=>f.d===last&&((f.imp||0)>0||(f.cost||0)>0||(f.click||0)>0));
}
function renderBubble(){
  const host=$('bubble');if(!host)return;
  const fs=factFilter();
  const dim=BUB.dim;
  const m=new Map();
  fs.forEach(f=>{
    const key=[f.media,f.product,f[dim]].join(SEP);
    if(!m.has(key))m.set(key,{media:f.media,product:f.product,name:f[dim],rows:[]});
    m.get(key).rows.push(f);});
  const xd=bubDef(BUB.x),yd=bubDef(BUB.y);
  const lastDay=bubLastDay(fs);
  let pts=[...m.values()].map(g=>{
    const b=aggFacts(g.rows);
    return {...g,b,cost:b.cost,on:bubIsOn(g.rows,lastDay),
      xv:METRICS[xd.k]?METRICS[xd.k].c(b):NaN,
      yv:METRICS[yd.k]?METRICS[yd.k].c(b):NaN,
      xb:b[xd.base]||0,yb:b[yd.base]||0};})
    .filter(p=>p.cost>0&&isFinite(p.xv)&&p.xv>0&&isFinite(p.yv)&&p.yv>0&&p.xb>0&&p.yb>0);
  host.innerHTML='';
  const lgd=$('bubLegend');
  if(!pts.length){
    host.innerHTML='<div class="hint" style="padding:26px 6px">두 축을 모두 계산할 수 있는 데이터가 없습니다. 축을 바꿔 보세요.</div>';
    if(lgd)lgd.innerHTML='';
    return;}
  const W=780,H=450,P={l:66,r:30,t:26,b:62};
  const PW=W-P.l-P.r,PH=H-P.t-P.b;
  const xLow=BUB_LOWER.has(xd.k),yLow=BUB_LOWER.has(yd.k);
  const bubScale=vals=>{
    const mn=Math.min(...vals),mx=Math.max(...vals);
    const log=mn>0&&mx/mn>8;
    const f=v=>log?Math.log(v):v;
    let a=f(mn),b=f(mx);
    const d=(b-a)||Math.abs(b)||1;
    a-=d*0.16;b+=d*0.16;
    return {log,n:v=>(f(v)-a)/((b-a)||1)};};
  const sx=bubScale(pts.map(p=>p.xv)),sy=bubScale(pts.map(p=>p.yv));
  const X=v=>P.l+(xLow?1-sx.n(v):sx.n(v))*PW;
  const Y=v=>P.t+(yLow?sy.n(v):1-sy.n(v))*PH;
  const maxCost=Math.max(...pts.map(p=>p.cost))||1;
  const R=c=>13+Math.sqrt(c/maxCost)*38;
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`},host);
  /* 옅은 격자만 (구간 숫자는 넣지 않는다) */
  for(let i=0;i<=4;i++){
    S('line',{x1:P.l,x2:W-P.r,y1:P.t+PH*i/4,y2:P.t+PH*i/4,stroke:'#eef1f5','stroke-width':1},svg);
    S('line',{x1:P.l+PW*i/4,x2:P.l+PW*i/4,y1:P.t,y2:P.t+PH,stroke:'#f2f5f8','stroke-width':1},svg);}
  S('line',{x1:P.l,x2:W-P.r,y1:P.t+PH,y2:P.t+PH,stroke:'#cdd5de','stroke-width':1.2},svg);
  S('line',{x1:P.l,x2:P.l,y1:P.t,y2:P.t+PH,stroke:'#cdd5de','stroke-width':1.2},svg);
  /* 축 끝 표시 — 우수 / 저조 (둘 다 옅은 푸른 계열) */
  const mark=(x,y,t,anchor,rot,good)=>{
    const e=S('text',{x,y,'text-anchor':anchor||'middle','font-size':12,'font-weight':800,
      fill:good?'#5c81a5':'#a3b6c8'},svg);
    if(rot)e.setAttribute('transform',`rotate(${rot} ${x} ${y})`);
    e.textContent=t;};
  mark(P.l-16,P.t+4,'우수','middle',-90,1);
  mark(P.l-16,P.t+PH-4,'저조','middle',-90,0);
  mark(W-P.r,P.t+PH+26,'우수','end',0,1);
  mark(P.l,P.t+PH+26,'저조','start',0,0);
  /* 축 제목 — 각 축 가운데 */
  const axTitle=(x,y,t,rot)=>{
    const e=S('text',{x,y,'text-anchor':'middle','font-size':12.5,'font-weight':700,
      fill:'#6b7c8d','letter-spacing':'-.2'},svg);
    if(rot)e.setAttribute('transform',`rotate(${rot} ${x} ${y})`);
    e.textContent=t;e.setAttribute('class','axt');};
  axTitle(P.l+PW/2,P.t+PH+52,xd.l,0);
  axTitle(P.l-52,P.t+PH/2,yd.l,-90);
  /* 색 — 매체는 색상(사용자 지정 가능), 광고상품은 그 색의 진하기 */
  const medias=[...new Set(pts.map(p=>p.media))];
  medias.forEach((md,i)=>{if(BUB_COLORS[md]===undefined)BUB_COLORS[md]=i%BUB_HUES.length;});
  const bubHue=md=>BUB_HUES[BUB_COLORS[md]%BUB_HUES.length]||BUB_HUES[0];
  const prodOf={};
  medias.forEach(md=>{prodOf[md]=[...new Set(pts.filter(p=>p.media===md).map(p=>p.product))].sort();});
  const shadeT=(md,pd)=>{const ps=prodOf[md]||[];
    const i=Math.max(0,ps.indexOf(pd)),n=Math.max(ps.length-1,1);
    return ps.length>1?0.02+0.46*(i/n):0.10;};
  const colorOf=p=>p.on
    ? `rgb(${mixWhite(bubHue(p.media),shadeT(p.media,p.product)).join(',')})`
    : `rgb(${mixWhite(OFF_HUE,shadeT(p.media,p.product)*0.6).join(',')})`;
  /* 큰 것부터 그려 작은 버블이 위로 오게 (레퍼런스처럼 겹쳐 보이도록 반투명) */
  pts.slice().sort((a,b)=>b.cost-a.cost).forEach(p=>{
    const c=S('circle',{cx:X(p.xv),cy:Y(p.yv),r:R(p.cost),fill:colorOf(p),
      'fill-opacity':p.on?.62:.5,stroke:'none',class:'bub'},svg);
    c.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
      `<div class="t">${esc(p.name||'(미지정)')}${p.on?'':' · 현재 OFF'}</div>`
      +`<div class="r"><span class="l">매체 · 상품</span><b>${esc(p.media)} · ${esc(p.product)}</b></div>`
      +`<div class="r"><span class="l">${xd.l}</span><b>${METRICS[xd.k].f(p.xv)}</b></div>`
      +`<div class="r"><span class="l">${yd.l}</span><b>${METRICS[yd.k].f(p.yv)}</b></div>`
      +`<div class="r"><span class="l">소진 광고비</span><b>${won(p.cost)}</b></div>`
      +`<div class="r"><span class="l">노출 · 클릭</span><b>${fmt(p.b.imp)} · ${fmt(p.b.click)}</b></div>`
      +`<div class="r"><span class="l">조회 · 전환</span><b>${fmt(p.b.view)} · ${fmt(p.b.conv)}</b></div>`));
    c.addEventListener('mouseleave',hideTip);});
  /* ---- 범례 (그래프 위) ---- */
  if(!lgd)return;
  const dimL={creative:'소재',target:'타겟팅 그룹',product:'광고상품'}[BUB.dim]||'소재';
  const offN=pts.filter(p=>!p.on).length;
  lgd.innerHTML=`<div class="lgtop">`
    +medias.map(md=>{
      const ps=prodOf[md]||[];
      /* 매체 색이 위, 그 아래에 광고상품별 색 (모두 동그란 점) */
      const subs=ps.map(pd=>
        `<span class="sb"><i style="background:rgb(${mixWhite(bubHue(md),shadeT(md,pd)).join(',')})"></i>`
        +`${esc(pd)}</span>`).join('');
      return `<span class="mgrp">`
        +`<span class="bl" data-hue="${esc(md)}" title="눌러서 이 매체의 색 계열 바꾸기">`
        +`<i style="background:rgb(${bubHue(md).join(',')})"></i>${esc(md)}`
        +`<span class="pen">색 변경</span></span>`
        +(subs?`<span class="subs">${subs}</span>`:'')+`</span>`;}).join('')
    +(offN?`<span class="mgrp"><span class="bl" style="cursor:default">`
      +`<i style="background:rgb(${OFF_HUE.join(',')})"></i>`
      +`현재 OFF <span class="pen">${offN}개</span></span></span>`:'')
    +`</div>`
    +`<div class="how">`
    +`<span><b>버블 하나</b> = ${dimL} 1개 (매체 × 광고상품 × ${dimL} 기준)</span>`
    +`<span><b>크기</b> = 소진 광고비 (클수록 많이 쓴 ${dimL})</span>`
    +`<span><b>색</b> = 매체 · <b>진하기</b> = 그 매체 안의 광고상품</span>`
    +`<span><b>가로</b> ${xd.l} · <b>세로</b> ${yd.l} — 오른쪽·위로 갈수록 좋습니다</span>`
    +`<span>회색 버블은 <b>고른 기간의 마지막 집행일에 집행이 없던</b> ${dimL}입니다</span>`
    +(sx.log||sy.log?`<span>값 차이가 커서 ${sx.log?'가로':''}${sx.log&&sy.log?'·':''}${sy.log?'세로':''}축은 <b>로그 눈금</b>으로 그렸습니다</span>`:'')
    +`<span>버블에 마우스를 올리면 ${dimL} 이름과 세부 값이 나옵니다</span>`
    +`</div>`;
  /* 매체 색 바꾸기 */
  lgd.querySelectorAll('[data-hue]').forEach(chip=>chip.onclick=e=>{
    e.stopPropagation();
    document.querySelectorAll('.huepick').forEach(x=>x.remove());
    const md=chip.dataset.hue;
    const box=el('div','huepick',chip);
    box.style.top='100%';box.style.left='0';box.style.marginTop='6px';
    box.innerHTML=BUB_HUES.map((h,i)=>
      `<button data-i="${i}" class="${BUB_COLORS[md]===i?'on':''}" style="background:rgb(${h.join(',')})"></button>`).join('');
    box.onclick=ev=>{ev.stopPropagation();
      const b2=ev.target.closest('button');if(!b2)return;
      BUB_COLORS[md]=+b2.dataset.i;box.remove();renderBubble();};});
  if(!window.__huePickWired){window.__huePickWired=1;
    document.addEventListener('click',()=>document.querySelectorAll('.huepick').forEach(x=>x.remove()));}
}
/* 노출 분포 · 효율 버블 — 제목 줄 높이를 맞춰 두 카드의 흰 영역이 위아래로 정확히 겹치게 */
function equalizeDuo(){
  const cols=[...document.querySelectorAll('.duo>.duocol')];
  if(cols.length<2)return;
  const secs=cols.map(c=>c.querySelector(':scope>.sec')).filter(Boolean);
  if(secs.length<2)return;
  secs.forEach(s=>s.style.minHeight='');
  const one=getComputedStyle(cols[0].parentElement).gridTemplateColumns.split(' ').length<2;
  if(one)return;                                   /* 한 단으로 접혔으면 맞출 필요 없다 */
  const mx=Math.max(...secs.map(s=>s.getBoundingClientRect().height));
  secs.forEach(s=>s.style.minHeight=Math.ceil(mx)+'px');
}
/* 흰 영역 높이가 바뀌면 트리맵을 다시 그린다 (칸 크기를 픽셀로 계산하므로) */
(function watchTreemap(){
  const start=()=>{
    const box=$('treemap');if(!box||!window.ResizeObserver)return;
    let last=0;
    new ResizeObserver(()=>{
      const h=Math.round(box.getBoundingClientRect().height);
      if(Math.abs(h-last)<6)return;last=h;
      clearTimeout(window.__tmT);
      window.__tmT=setTimeout(()=>{if(!$('sub-perf').classList.contains('hidden'))renderTreemap();},120);
    }).observe(box);};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start):setTimeout(start,0);
})();
addEventListener('resize',()=>{clearTimeout(window.__bubT);
  window.__bubT=setTimeout(()=>{equalizeDuo();
    if(!$('sub-perf').classList.contains('hidden')){renderBubble();renderTreemap();}},200);});
