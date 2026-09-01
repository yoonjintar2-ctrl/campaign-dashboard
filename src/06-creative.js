/* ===== 7. 표 (로우 데이터) ===== */
/* 표 탭 열 — 항목 사전 중 팩트에서 바로 계산 가능한 항목만 */
const RAW_CATALOG=fieldCatalog('dash',f=>!!METRICS[f.k]);
const RAW_DEF={};RAW_CATALOG.forEach(g=>g.cols.forEach(c=>RAW_DEF[c.k]=c));
let RAW_CFG={rows:[],groups:(function(){
  const d=fieldDefaults('dash').filter(k=>METRICS[k]);
  const vol=d.filter(k=>FLD[k].kind==='in'&&FLD[k].cat!=='비용');
  const eff=d.filter(k=>FLD[k].kind==='calc'&&FLD[k].cat!=='비용');
  const cost=d.filter(k=>FLD[k].cat==='비용');
  return [{id:uid(),name:'볼륨',cols:vol},{id:uid(),name:'효율',cols:eff},{id:uid(),name:'비용',cols:cost}]
    .filter(g=>g.cols.length);})()};
let RAW_ALLDAYS=false;    /* true 면 캠페인 시작~종료 전 기간을 모두 행으로 (리포트용) */
let RAW_SEG='none';       /* 세로 세그먼트 — 표를 위아래로 나눈다 */
let RAW_HSEG='none';      /* 가로 세그먼트 — 한 표 안에서 좌우로 나눈다 */
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
    const days=RAW_ALLDAYS
      ? [...Array(TOTAL_DAYS)].map((_,i)=>i).sort((a2,b2)=>b2-a2)
      : [...new Set(sub.map(f=>f.d))].sort((a2,b2)=>b2-a2);
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
  });
  const note=[`${totalRows}행`,`${cols.length}개 열`];
  if(vSegs.length)note.push(`세로 ${SEG_OPTS.find(s=>s.k===RAW_SEG).l} ${vSegs.length}개`);
  if(hSegs.length)note.push(`가로 ${SEG_OPTS.find(s=>s.k===RAW_HSEG).l} ${hSegs.length}개`);
  $('rawNote').textContent=note.join(' · ');
}
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
function filteredCreatives(){
  /* 매체·구분·제품은 대시보드 공통 필터를 따른다 */
  let a=CREATIVES.filter(c=>(CR_FILTER.type==='all'||c.type===CR_FILTER.type)
    &&['segment','media','line'].every(k=>FILTER[k]==='all'||c[k]===FILTER[k]));
  const sv=c=>{const b=crAgg(c);return CR_FILTER.sort==='ctr'?b.click/b.imp:b[CR_FILTER.sort];};
  a.sort((x,y)=>(sv(y)||0)-(sv(x)||0));
  return a;}

/* ===== 우수 소재 — 효율 기준별 TOP N =====
   단가(CPV·CPM·CPC·CPA)는 낮을수록 우수하므로 오름차순.
   분모(조회·노출·클릭·전환)가 0인 소재는 순위에서 제외한다. */
const CR_RANKS=[
  {k:'cpv',l:'조회 효율',sub:'CPV 낮은 순',base:'view'},
  {k:'cpm',l:'노출 효율',sub:'CPM 낮은 순',base:'imp'},
  {k:'cpc',l:'클릭 효율',sub:'CPC 낮은 순',base:'click'},
  {k:'cpa',l:'전환 효율',sub:'CPA 낮은 순',base:'conv'}
];
let CR_RANK_ON=['cpv','cpm','cpc'];
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
function renderCreatives(){
  const host=$('creatives');if(!host)return;
  host.innerHTML='';
  const pool=filteredCreatives();
  if(!pool.length){
    host.innerHTML='<div class="card"><div class="bd hint">조건에 맞는 소재가 없습니다.</div></div>';return;}
  CR_RANKS.filter(r=>CR_RANK_ON.includes(r.k)).forEach(r=>{
    const rows=pool.map(c=>{const b=crAgg(c);
        return {c,b,base:b[r.base]||0,eff:METRICS[r.k].c(b)};})
      .filter(x=>x.base>0&&isFinite(x.eff)&&x.eff>0)
      .sort((a,b)=>a.eff-b.eff)
      .slice(0,CR_TOPN);
    const g=el('div','',host);g.style.marginBottom='22px';
    const hd=el('div','crband',g);
    hd.innerHTML=`<span class="t">${r.l}이 우수한 소재</span>`
      +`<span class="n">${r.sub} · 상위 ${rows.length}개</span>`;
    if(!rows.length){el('div','hint',g).textContent=`${METRICS[r.k].l}를 계산할 수 있는 소재가 없습니다.`;return;}
    const grid=el('div','crgrid',g);
    grid.style.gridTemplateColumns=`repeat(${Math.min(Math.max(rows.length,1),5)},minmax(0,1fr))`;
    rows.forEach((x,i)=>{
      /* 순위 기준으로 쓴 지표는 위에 이미 크게 나오므로 아래 목록에서는 뺀다 */
      const c=x.c,cols=cfgCols(CR_CFG[c.type]).filter(k=>k!==r.k);
      const d=el('div','cr',grid);
      const bg=c.img?`url("${encodeURI(c.img)}")`:c.g;
      d.innerHTML=`<div class="thumb"><div class="fill" style="background-image:${bg}"></div>
          <div class="media">${esc(c.media)}</div>
          <div class="rankno">${i+1}</div>
          <div class="rt">${c.type==='video'?'▶ 영상':'🖼 이미지'} ${c.ratio}</div>
          ${c.type==='video'?'<div class="play">▶</div>':''}</div>
        <div class="meta"><div class="nm" title="${esc(c.name)}">${esc(c.name)}</div>
          <div class="eff"><span>${METRICS[r.k].l}</span><b>${METRICS[r.k].f(x.eff)}</b></div>
          ${cols.map(k=>`<div class="mt"><span>${CR_DEF[k].l}</span><b>${crVal(c,k)}</b></div>`).join('')}</div>`;
      d.onclick=()=>openLightbox(c);});});
}
/* 소재 관리 — 캠페인 설정에 입력된 소재명을 이름 기준으로 모아 보여준다.
   같은 이름은 여러 매체·상품·타겟팅에 함께 쓰인 하나의 소재로 본다. */
function crNameGroups(){
  const m=new Map();
  CREATIVES.forEach(c=>{const k=c.name;
    if(!m.has(k))m.set(k,[]);m.get(k).push(c);});
  return [...m.entries()].map(([name,list])=>({name,list}))
    .sort((a,b)=>a.name.localeCompare(b.name,'ko'));
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
      <th style="width:52px">미리보기</th><th style="min-width:220px">소재명</th>
      <th style="min-width:240px">사용 중인 매체 · 상품</th>
      <th style="width:96px">유형</th><th style="min-width:280px">소재 파일 · 링크</th>
      <th style="width:60px"></th></tr></thead><tbody>`;
    groups.forEach(g=>{
      const c0=g.list[0];
      const used=[...new Set(g.list.map(c=>c.media+' · '+c.product))];
      const bg=c0.img?`url(&quot;${c0.img.slice(0,4)==='data'?c0.img:encodeURI(c0.img)}&quot;)`:c0.g;
      h+=`<tr data-cn="${esc(g.name)}">
        <td><span class="crthumb-sm" style="background-image:${bg}"></span></td>
        <td><input class="txt" data-cf="name" value="${esc(g.name)}"></td>
        <td class="hint" style="line-height:1.5">${used.map(esc).join('<br>')}
            <span class="cnt2">라인 ${g.list.length}개</span></td>
        <td><select data-cf="type"><option value="video"${c0.type==='video'?' selected':''}>영상</option>
          <option value="image"${c0.type==='image'?' selected':''}>이미지</option></select></td>
        <td>${c0.type==='video'
          ? `<input class="txt" data-cf="yt" value="${esc(c0.yt||'')}" placeholder="YouTube 링크 또는 영상 ID">`
          : `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
               <label class="btn sm" style="cursor:pointer;margin:0">이미지 업로드
                 <input type="file" accept="image/*" data-cup hidden></label>
               <span class="hint" data-cim>${c0.img?'업로드됨':'없음'}</span>
               ${c0.img?'<button class="btn sm" data-cclr>지우기</button>':''}</div>`}</td>
        <td><button class="btn sm danger" data-cdel="${esc(g.name)}">삭제</button></td></tr>`;});
    h+=`</tbody></table>`;
  }
  h+=`<div class="hint" style="margin-top:12px">소재를 새로 추가하려면 <b>캠페인 설정</b> 탭에서
      해당 라인을 먼저 추가한 뒤 <b>소재</b> 칸에 이름을 적어 주세요.</div>`;
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
    const up=tr.querySelector('[data-cup]');
    if(up)up.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
      shrinkImage(f,url=>{list.forEach(c=>{c.img=url;c.type='image';});reopen();});};
    const clr=tr.querySelector('[data-cclr]');
    if(clr)clr.onclick=()=>{list.forEach(c=>c.img='');reopen();};});
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
    ? (c.yt?`<iframe src="https://www.youtube-nocookie.com/embed/${esc(ytId(c.yt))}?rel=0" allowfullscreen></iframe>`
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
  groups:[{id:uid(),name:'소재 효율',cols:['imp','view','ctr']}],metric:'imp'};
/* 값 비율(0~1)을 연한 남색 → 짙은 남색으로 보간 */
/* 단일 붉은색 톤 — 값이 낮으면 아주 연한 빨강, 높을수록 진한 빨강.
   농도 기준은 "그 행(소재)의 최댓값"이므로 행마다 독립적으로 읽는다. */
const SHADE_LOW=[0xfa,0xee,0xec],   /* 낮음 — 아주 연한 빨강 */
      SHADE_HIGH=[0x99,0x3f,0x37];  /* 높음 — 진한 빨강 */
const mixRGB=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function shade(t){
  const k=Math.max(0,Math.min(1,isFinite(t)?t:0));
  /* 한 행 안의 값 차이가 크지 않아도 강약이 보이도록 대비를 세운다 */
  return `rgb(${mixRGB(SHADE_LOW,SHADE_HIGH,Math.pow(k,1.7)).join(',')})`;
}
function renderGantt(){
  const t=$('ganttTbl'),list=filteredCreatives();
  const dims=GANTT.rows.map(r=>r.k),cols=cfgCols(GANTT),seps=gsepSet(GANTT);
  let rowsData=list.map(c=>({c,key:dims.map(d=>d==='creative'?c.name:c[d]).join(SEP),
    vals:dims.map(d=>d==='creative'?c.name:c[d])}));
  rowsData.sort((a,b)=>a.key.localeCompare(b.key,'ko'));
  if(GANTT.order){const idx=k=>{const i=GANTT.order.indexOf(k);return i<0?1e9:i;};
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
  /* 색 농도는 행(소재)마다 그 행의 최댓값을 기준으로 한다 — 행 안에서의 강약을 보기 위함 */
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
      /* 값이 클수록 진해지는 색 농도 (막대 높이 대신) */
      h+=`<td class="day${hol?' hol':we?' we':''}${i===0?' gsep':''}" data-di="${i}" data-gi="${gi}" data-cid="${c.id}">`
        +(v>0?`<span class="b" style="background:${shade(v/maxV)}"></span>`:'')+'</td>';});
    h+='</tr>';});
  t.innerHTML=h+'</tbody>';
  t.style.minWidth=(leadTotal+VD.length*13)+'px';
  enableRowDrag(t,GANTT,renderGantt);
  wireGanttHover(t,SC);
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
const MEDIA_HUES=[[73,94,114],[72,106,117],[79,105,95],[95,88,114],[107,91,80],[90,100,112],[68,88,100]];
const mixWhite=(rgb,t)=>rgb.map(v=>Math.round(v+(255-v)*t));
const inkOn=rgb=>(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)>168?'#26313c':'#fff';
const hueOf=name=>{let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;
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
  const sects=walk(root);
  const grand=sum(sects.map(s=>s.v));
  if(!grand){box.innerHTML='<div class="tmap-empty">표시할 값이 없습니다.</div>';return;}
  const W=box.clientWidth||box.offsetWidth||1000, H=box.clientHeight||460;
  const HEAD=21, SUBHEAD=17;
  /* 단가(낮을수록 우수)를 0~1 로 — 섹터 안에서 순위를 매긴다 */
  const shadeT=(leaves)=>{
    const vals=leaves.map(l=>uk&&l.v>0?(l.c/l.v)*(mk==='imp'?1000:1):NaN)
      .filter(v=>isFinite(v)&&v>0);
    if(!uk||vals.length<2)return ()=>.30;
    const lo=Math.min(...vals),hi=Math.max(...vals);
    return leaf=>{
      const u=leaf.v>0?(leaf.c/leaf.v)*(mk==='imp'?1000:1):NaN;
      if(!isFinite(u)||hi===lo)return .34;
      return .06+((u-lo)/(hi-lo))*.62;};};   /* 단가가 낮을수록 t 작음 = 진함 */
  const collect=n=>n.kids?n.kids.flatMap(collect):[n];
  const tip=(names,leaf,sect)=>e=>showTip(e.clientX,e.clientY,
    `<div class="t">${names.map(esc).join(' · ')}</div>`
    +`<div class="r"><span class="l">${METRICS[mk].l}</span><b>${METRICS[mk].f(leaf.v)}</b></div>`
    +(uk?`<div class="r"><span class="l">${METRICS[uk].l}</span><b>${METRICS[uk].f(
        (leaf.c/leaf.v)*(mk==='imp'?1000:1))}</b></div>`:'')
    +`<div class="r"><span class="l">${esc(names[0])} 안에서</span><b>${pct(leaf.v/sect.v,1)}</b></div>`
    +`<div class="r"><span class="l">전체 대비</span><b>${pct(leaf.v/grand,1)}</b></div>`);
  squarify(sects,0,0,W,H).forEach(sc=>{
    const base=hueOf(sc.name);
    const tOf=shadeT(collect(sc));
    /* 섹터 — 굵은 테두리를 border-box 로 그려 폭이 균일하게 */
    const sec=el('div','sect',box);
    sec.style.cssText=`left:${sc.x}px;top:${sc.y}px;width:${sc.w}px;height:${sc.h}px`;
    const inner=el('div','sin',sec);
    if(sc.h>HEAD+10){
      const hd=el('div','sh',sec);
      hd.style.background=`rgb(${base.join(',')})`;
      hd.innerHTML=`<span>${esc(sc.name)}</span><span class="sv">${pct(sc.v/grand,1)}</span>`;
      inner.style.top=HEAD+'px';}
    const iw=sec.clientWidth||sc.w-6, ih=(sc.h-(sc.h>HEAD+10?HEAD:0))-6;
    const tile=(node,x,y,w,h,names,parent)=>{
      const t=tOf(node), rgb=mixWhite(base,t);
      const d=el('div','tile',inner);
      d.className='tile'+(h<34?' sm':'')+(h<24||w<52?' xs':'')+(h<15||w<34?' tiny':'');
      d.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;`
        +`background:rgb(${rgb.join(',')});color:${inkOn(rgb)}`;
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
          gh.style.color=inkOn(mixWhite(base,.62))==='#fff'?'#fff':'var(--ink2)';
          gh.textContent=n.name;
          layout(n.kids,n.x,n.y+SUBHEAD,n.w,n.h-SUBHEAD,names.concat([n.name]),depth+1);
        }else if(n.kids&&n.kids.length){
          layout(n.kids,n.x,n.y,n.w,n.h,names.concat([n.name]),depth+1);
        }else{
          tile(n,n.x,n.y,n.w,n.h,names.concat([n.name]));}});};
    const y0=sc.h>HEAD+10?HEAD:0;
    layout(sc.kids||[sc],0,0,Math.max(sc.w-6,0),Math.max(sc.h-y0-6,0),[sc.name],1);
  });
}
addEventListener('resize',()=>{clearTimeout(window.__tmapT);
  window.__tmapT=setTimeout(()=>{if(!$('sub-perf').classList.contains('hidden'))renderTreemap();},180);});
