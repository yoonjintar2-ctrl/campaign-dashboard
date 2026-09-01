/* ===== 3. 공용 구성 빌더 (그룹형) ===== */
const cfgCols=cfg=>cfg.groups.flatMap(g=>g.cols);
function groupHeaderHTML(cfg,cdef,leadCols){
  const gs=cfg.groups.filter(g=>g.cols.length);
  /* solo 그룹(열 1개)은 헤더 두 줄을 합쳐 열 이름만 한 번 표시 */
  const isSolo=g=>!!g.solo&&g.cols.length===1;
  const g1=gs.map((g,i)=>isSolo(g)
    ? `<th class="g solo${i>0?' gsep':''}" rowspan="2">${esc(cdef[g.cols[0]]?cdef[g.cols[0]].l:g.name)}</th>`
    : `<th class="g${i>0?' gsep':''}" colspan="${g.cols.length}">${esc(g.name)}</th>`).join('');
  let g2='';
  gs.forEach((g,gi)=>{if(isSolo(g))return;
    g.cols.forEach((k,ci)=>{
      g2+=`<th class="${gi>0&&ci===0?'gsep':''}">${cdef[k]?cdef[k].l:k}</th>`;});});
  return `<tr>${leadCols.join('')}${g1}</tr><tr>${g2}</tr>`;
}
const gsepSet=cfg=>{const s=new Set();let i=0;
  cfg.groups.filter(g=>g.cols.length).forEach((g,gi)=>{if(gi>0)s.add(i);i+=g.cols.length;});return s;};

/* 값 열 너비 규칙 —
   자릿수가 큰 열(노출·조회·광고비 등)은 내용에 비례해서 넓게,
   그 외 짧은 열들은 모두 같은 너비로 맞춰 표가 고르게 보이도록 한다. */
function applyColWidths(tbl,cfg,cols){
  if(!cols||!cols.length)return;
  const leadN=(cfg.rows&&cfg.rows.length?cfg.rows.length:1);
  const nCol=leadN+cols.length;
  const wide=new Set(['m_note','note']);
  /* 헤더 라벨 + 본문 값 중 가장 긴 문자열 길이 (한글은 1.75자 폭으로 계산) */
  const wOf=s=>{let w=0;for(const ch of String(s))w+=/[ㄱ-힝]/.test(ch)?1.75:(/[0-9.,%₩]/.test(ch)?1:1.12);return w;};
  const len=cols.map(()=>0);
  if(!tbl.tBodies[0])return;
  [...tbl.tBodies[0].rows].forEach(tr=>{
    const cs=tr.cells;if(cs.length<cols.length)return;
    const off=cs.length-cols.length;
    cols.forEach((k,i)=>{const c=cs[off+i];if(!c)return;
      len[i]=Math.max(len[i],wOf((c.textContent||'').trim().split('\n')[0]));});});
  /* 값 열 헤더를 cfg 순서대로 모은다 (solo 그룹은 1행에, 나머지는 2행에 있음) */
  const gs=(cfg.groups||[]).filter(g=>g.cols.length);
  const soloThs=[...tbl.querySelectorAll('thead th.g.solo')];
  const row2=tbl.tHead&&tbl.tHead.rows[1]?[...tbl.tHead.rows[1].cells]:[];
  const valHs=[];let si=0,ri=0;
  gs.forEach(g=>{
    if(g.solo&&g.cols.length===1)valHs.push(soloThs[si++]);
    else g.cols.forEach(()=>valHs.push(row2[ri++]));});
  valHs.forEach((th,i)=>{if(th&&len[i]!==undefined)len[i]=Math.max(len[i],wOf(th.textContent.trim())+.6);});
  const CH=7.15,PAD=22;
  const px=len.map(l=>Math.round(l*CH+PAD));
  const BIG=96;                                   /* 이보다 넓으면 "큰 값" 열 */
  const small=px.filter((v,i)=>v<BIG&&!wide.has(cols[i]));
  const uni=small.length?Math.max(...small):0;
  /* 비고 같은 서술형 열은 폭을 고정하지 않고 남는 폭을 흡수하도록 둔다 (최소 폭만 지정) */
  const finalW=px.map((v,i)=>wide.has(cols[i])?0:(v<BIG?uni:v));
  let cg=tbl.querySelector('colgroup');
  if(cg)cg.remove();
  cg=document.createElement('colgroup');
  for(let i=0;i<nCol;i++){
    const c=document.createElement('col');
    if(i>=leadN){const w=finalW[i-leadN];if(w)c.style.width=w+'px';}
    cg.appendChild(c);}
  tbl.insertBefore(cg,tbl.firstChild);
  /* colgroup 폭은 표가 컨테이너보다 넓어지면 눌리므로 헤더에 min-width도 함께 건다 */
  valHs.forEach((th,i)=>{if(!th)return;
    th.style.minWidth=(wide.has(cols[i])?250:finalW[i])+'px';});
}
/* 열 그룹 이름 변경 — 모든 표에서 동일하게 동작 (헤더 클릭 → 인라인 입력) */
function wireGroupRename(tbl,cfg,rerender){
  if(isClient())return;
  const gs=cfg.groups.filter(g=>g.cols.length);
  [...tbl.querySelectorAll('thead th.g')].forEach((th,gi)=>{
    const g=gs[gi];if(!g||g.solo)return;
    th.style.cursor='text';th.title='클릭해서 그룹 이름 변경';
    th.onclick=()=>{
      if(th.querySelector('input'))return;
      const old=g.name;
      th.innerHTML=`<input class="ghdr" value="${esc(old)}">`;
      const inp=th.querySelector('input');inp.focus();inp.select();
      const done=save=>{const v=inp.value.trim();
        if(save&&v&&v!==old){g.name=v;rerender&&rerender();}
        else{th.textContent=old;}};
      inp.onblur=()=>done(true);
      inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}
        if(e.key==='Escape'){inp.onblur=null;th.textContent=old;}};};});
}

/* 값이 0 인 칸은 – 로, 아예 비어 있는 칸은 옅은 회색으로 표시해 "해당 없음"을 분명히 한다.
   입력·칩·게이지가 들어 있는 칸은 건드리지 않는다. */
const ZERO_RE=/^₩?-?0(\.0+)?%?$/;
function markBlanks(tbl){
  if(!tbl)return;
  tbl.querySelectorAll('tbody td, thead tr.total td').forEach(td=>{
    if(td.classList.contains('head'))return;
    /* 게재 히스토리의 날짜 칸은 글자가 아니라 색 농도로 값을 보여준다 — 건드리지 않는다 */
    if(td.classList.contains('day'))return;
    if(td.querySelector('input,select,textarea,button,.chip,.gauge,.crthumb-sm,.b,svg'))return;
    const t=(td.textContent||'').replace(/\s+/g,'').trim();
    /* 값이 아예 없는 칸(빈칸 또는 렌더러가 넣은 –)은 회색으로 꽉 채운다 */
    if(t===''||t==='–'||t==='-'){td.classList.add('blank');td.innerHTML='<span class="na">–</span>';return;}
    /* 값이 0 인 칸은 – 로만 바꾸고 배경은 그대로 (데이터가 있는 칸이므로) */
    if(ZERO_RE.test(t.replace(/,/g,'')))td.innerHTML='<span class="na">–</span>';});
}
let DRAG=null;
const clearIns=()=>document.querySelectorAll('.ins-l,.ins-r').forEach(e=>e.classList.remove('ins-l','ins-r'));
function openBuilder(host,cfg,opts){
  const draft={rows:(cfg.rows||[]).map(r=>({...r})),
    groups:(cfg.groups||[]).map(g=>({id:g.id,name:g.name,solo:g.solo,cols:[...g.cols]}))};
  if(!draft.groups.length)draft.groups=[{id:uid(),name:'예상 효율',cols:[]}];
  let selG=draft.groups[0].id;
  const cdef={};(opts.catalog||[]).forEach(c=>c.cols.forEach(x=>cdef[x.k]={...x,cat:c.g}));
  host.innerHTML='';host.classList.remove('hidden');
  const b=el('div','builder',host);
  const used=k=>draft.groups.some(g=>g.cols.includes(k));
  function draw(){
    b.innerHTML='';
    if(opts.useRows!==false){
      const r1=el('div','brow',b);r1.innerHTML='<div class="bkey">행 헤더</div>';
      const pool=el('div','pool',r1);
      opts.rowFields.forEach(f=>{
        if(draft.rows.some(r=>r.k===f.k))return;
        const c=el('span','chip',pool);c.textContent='+ '+f.l;
        c.onclick=()=>{draft.rows.push({k:f.k,sub:false});draw();};});
      const r2=el('div','brow',b);r2.innerHTML='<div class="bkey">순서 · 소계</div>';
      const z=el('div','zone',r2);z.dataset.zone='rows';
      if(!draft.rows.length)z.innerHTML='<span class="ph">위에서 항목을 눌러 추가하세요 (드래그로 순서 변경)</span>';
      draft.rows.forEach((r,i)=>{
        const f=opts.rowFields.find(x=>x.k===r.k)||{l:r.k};
        const c=el('span','chip on',z);c.draggable=true;c.dataset.kind='row';c.dataset.i=i;
        c.innerHTML=`<span class="ord">${i+1}</span>⠿ ${f.l}`
          +(opts.useSub!==false?`<label><input type="checkbox" ${r.sub?'checked':''}> 소계</label>`:'')
          +`<span class="x">✕</span>`;
        c.querySelector('.x').onclick=e=>{e.stopPropagation();draft.rows.splice(i,1);draw();};
        const cb=c.querySelector('input');if(cb)cb.onchange=e=>r.sub=e.target.checked;
        wireChip(c,'row');});
      z.ondragover=e=>{if(DRAG&&DRAG.kind==='row'){e.preventDefault();z.classList.add('over');}};
      z.ondragleave=()=>z.classList.remove('over');
      z.ondrop=e=>{z.classList.remove('over');if(!DRAG||DRAG.kind!=='row')return;
        e.preventDefault();const it=draft.rows.splice(DRAG.i,1)[0];draft.rows.push(it);DRAG=null;draw();};
    }
    const r3=el('div','brow',b);
    r3.innerHTML='<div class="bkey">값 열 목록<span class="bhint">끌어다 그룹에 놓기</span></div>';
    const pool2=el('div','pool',r3);
    (opts.catalog||[]).forEach(cat=>{
      const box=el('div','catbox',pool2);box.innerHTML=`<div class="t">${cat.g}</div>`;
      cat.cols.forEach(x=>{
        const on=used(x.k);
        const a=el('div','cb'+(on?' used':''),box);a.textContent=(on?'✓ ':'⠿ ')+x.l;
        if(on)return;
        a.title='눌러서 선택한 그룹에 추가 · 드래그해서 원하는 그룹에 놓기';
        a.draggable=true;
        a.ondragstart=e=>{DRAG={kind:'cat',k:x.k};a.classList.add('dragging');
          e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','n');};
        a.ondragend=()=>{a.classList.remove('dragging');DRAG=null;clearIns();};
        a.onclick=()=>{(draft.groups.find(g=>g.id===selG)||draft.groups[0]).cols.push(x.k);draw();};});});
    const r4=el('div','brow',b);r4.innerHTML='<div class="bkey">열 그룹</div>';
    const gz=el('div','groups',r4);
    draft.groups.forEach((g,gi)=>{
      const card=el('div','gcard'+(g.id===selG?' sel':''),gz);card.dataset.gi=gi;
      /* 헤더 자체를 draggable로 두면 안의 input에 커서를 놓을 수 없어 이름 편집이 막힌다.
         → 손잡이(⠿)만 draggable로 만들고, 이름 입력은 draw() 없이 모델만 갱신한다. */
      const hd=el('div','ghd',card);hd.draggable=false;
      hd.innerHTML=`<span class="ghandle" draggable="true" title="드래그해서 그룹 순서 변경">⠿</span>`
        +`<input class="gname" value="${esc(g.name)}" placeholder="그룹 이름" title="열 그룹 이름을 직접 입력하세요">`
        +(g.cols.length===1
          ? `<button class="btn sm gmerge" title="열이 하나뿐이라 그룹명 대신 항목명을 두 줄에 걸쳐 보여 줍니다">이름 합치기</button>`:'')
        +(draft.groups.length>1?'<span class="x" style="cursor:pointer;color:#9ba6b4" title="그룹과 그 안의 열을 함께 삭제">✕</span>':'');
      const nameInp=hd.querySelector('input.gname');
      nameInp.oninput=e=>{g.name=e.target.value;};
      nameInp.onfocus=()=>{selG=g.id;
        gz.querySelectorAll('.gcard').forEach(x=>x.classList.remove('sel'));card.classList.add('sel');};
      nameInp.onmousedown=e=>e.stopPropagation();
      nameInp.onclick=e=>e.stopPropagation();
      nameInp.onkeydown=e=>{if(e.key==='Enter')e.target.blur();};
      const mg=hd.querySelector('.gmerge');
      if(mg)mg.onclick=e=>{e.stopPropagation();
        g.solo=!g.solo;
        if(g.solo)g.name=(cdef[g.cols[0]]||{l:g.cols[0]}).l;
        draw();};
      if(mg&&g.solo)mg.classList.add('primary');
      const x=hd.querySelector('.x');
      /* 그룹을 지우면 그 안의 열도 함께 사라진다 */
      if(x)x.onclick=()=>{
        const rest=draft.groups.filter(z=>z.id!==g.id);
        draft.groups=rest.length?rest:[{id:uid(),name:'새 그룹',cols:[]}];
        selG=draft.groups[0].id;draw();};
      const handle=hd.querySelector('.ghandle');
      handle.ondragstart=e=>{DRAG={kind:'group',gi};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','g');};
      handle.ondragend=()=>{DRAG=null;clearIns();};
      card.ondragover=e=>{if(!DRAG)return;e.preventDefault();
        if(DRAG.kind==='group'){clearIns();const r=card.getBoundingClientRect();
          card.classList.add(e.clientX<r.left+r.width/2?'ins-l':'ins-r');}
        else card.classList.add('dropok');};
      card.ondragleave=()=>card.classList.remove('dropok');
      card.ondrop=e=>{if(!DRAG)return;e.preventDefault();e.stopPropagation();
        if(DRAG.kind==='group'){const before=card.classList.contains('ins-l');clearIns();
          const it=draft.groups.splice(DRAG.gi,1)[0];
          let to=draft.groups.findIndex(z=>z.id===g.id);if(to<0)to=draft.groups.length;
          draft.groups.splice(before?to:to+1,0,it);DRAG=null;draw();}
        else if(DRAG.kind==='col'){clearIns();
          const it=draft.groups[DRAG.gi].cols.splice(DRAG.ci,1)[0];g.cols.push(it);DRAG=null;draw();}
        else if(DRAG.kind==='cat'){clearIns();
          if(!used(DRAG.k))g.cols.push(DRAG.k);
          selG=g.id;DRAG=null;draw();}};
      card.onclick=e=>{if(e.target===card||e.target.classList.contains('gbd')){selG=g.id;draw();}};
      const bd=el('div','gbd',card);
      if(!g.cols.length)bd.innerHTML='<span style="color:#aab6c5;font-size:11px">위 목록에서 항목을 끌어다 놓거나 눌러서 추가</span>';
      g.cols.forEach((k,ci)=>{
        const c=el('span','chip on',bd);c.draggable=true;c.dataset.kind='col';c.dataset.gi=gi;c.dataset.ci=ci;
        c.innerHTML=`⠿ ${cdef[k]?cdef[k].l:k} <span class="x">✕</span>`;
        c.querySelector('.x').onclick=e=>{e.stopPropagation();g.cols.splice(ci,1);draw();};
        wireChip(c,'col');});});
    const add=el('button','btn sm',gz);add.textContent='＋ 그룹 추가';add.style.alignSelf='flex-start';
    add.onclick=()=>{const g={id:uid(),name:'새 그룹',cols:[]};draft.groups.push(g);selG=g.id;draw();};
    const ft=el('div','bfoot',b);
    ft.innerHTML='<button class="btn sm" data-a="reset" title="드래그로 바꾼 행 순서를 기본(가나다) 순서로 되돌립니다">행 순서 초기화</button>'
      +'<span class="spacer"></span>'
      +'<button class="btn sm" data-a="close">닫기</button><button class="btn sm primary" data-a="apply">적용</button>';
    ft.querySelector('[data-a=close]').onclick=()=>{host.classList.add('hidden');host.innerHTML='';};
    ft.querySelector('[data-a=reset]').onclick=()=>{cfg.order=null;opts.onApply&&opts.onApply();};
    ft.querySelector('[data-a=apply]').onclick=()=>{
      /* 행 기준(차원)이 그대로면 드래그로 정한 행 순서를 유지한다 */
      const same=cfg.rows.length===draft.rows.length&&cfg.rows.every((r,i)=>r.k===draft.rows[i].k);
      cfg.rows=draft.rows.map(r=>({...r}));
      cfg.groups=draft.groups.filter(g=>g.cols.length)
        .map(g=>({id:g.id,name:g.name,solo:!!g.solo&&g.cols.length===1,cols:[...g.cols]}));
      if(!cfg.groups.length)cfg.groups=[{id:uid(),name:'예상 효율',cols:[]}];
      if(!same)cfg.order=null;
      opts.onApply&&opts.onApply();};
  }
  function wireChip(c,kind){
    c.ondragstart=e=>{DRAG=kind==='row'?{kind:'row',i:+c.dataset.i}:{kind:'col',gi:+c.dataset.gi,ci:+c.dataset.ci};
      c.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','c');};
    c.ondragend=()=>{c.classList.remove('dragging');DRAG=null;clearIns();};
    c.ondragover=e=>{if(!DRAG||DRAG.kind!==kind)return;e.preventDefault();e.stopPropagation();clearIns();
      const r=c.getBoundingClientRect();c.classList.add(e.clientX<r.left+r.width/2?'ins-l':'ins-r');};
    c.ondrop=e=>{if(!DRAG||DRAG.kind!==kind)return;e.preventDefault();e.stopPropagation();
      const before=c.classList.contains('ins-l');clearIns();
      if(kind==='row'){const to=+c.dataset.i,it=draft.rows.splice(DRAG.i,1)[0];
        let idx=to>DRAG.i?to-1:to;draft.rows.splice(before?idx:idx+1,0,it);}
      else{const tg=+c.dataset.gi,tc=+c.dataset.ci;
        const it=draft.groups[DRAG.gi].cols.splice(DRAG.ci,1)[0];
        let idx=tc;if(DRAG.gi===tg&&DRAG.ci<tc)idx--;
        draft.groups[tg].cols.splice(before?idx:idx+1,0,it);}
      DRAG=null;draw();};
  }
  draw();
}
function mergeSpans(keys,depth){
  const span=keys.map(()=>Array(depth).fill(1));
  for(let c=0;c<depth;c++){let start=0;
    for(let r=1;r<=keys.length;r++){
      const same=r<keys.length&&keys[r].slice(0,c+1).join(SEP)===keys[start].slice(0,c+1).join(SEP);
      if(!same){span[start][c]=r-start;for(let x=start+1;x<r;x++)span[x][c]=0;start=r;}}}
  return span;
}

/* 소계 행까지 포함해 rowspan을 정확히 계산 (소계가 끼어도 열이 밀리지 않음) */
function pivotLayout(keys,rows){
  const D=rows.length,out=[];
  keys.forEach((vals,ri)=>{
    out.push({kind:'data',ri,vals});
    for(let L=D-1;L>=0;L--){
      if(!rows[L].sub)continue;
      const nk=keys[ri+1];
      if(nk&&nk.slice(0,L+1).join(SEP)===vals.slice(0,L+1).join(SEP))continue;
      out.push({kind:'sub',level:L,vals:vals.slice(0,L+1)});}});
  const span=out.map(()=>Array(D).fill(0));
  for(let c=0;c<D;c++){
    let i=0;
    while(i<out.length){
      const r=out[i];
      if(r.kind==='sub'&&r.level<=c){i++;continue;}
      const key=r.vals.slice(0,c+1).join(SEP);
      let j=i+1;
      while(j<out.length){
        const q=out[j];
        if(q.kind==='sub'&&q.level<=c)break;
        if(q.vals.slice(0,c+1).join(SEP)!==key)break;
        j++;}
      span[i][c]=j-i;i=j;}}
  return {out,span};
}
const dimDisp=(k,v)=>k==='month'?(+String(v).slice(5))+'월':v;
/* 행 드래그 정렬 — 상위 그룹(마지막 차원을 제외한 prefix)이 같을 때만 */
let RDRAG=null;
/* 행 순서 드래그.
   · 말단 행: 같은 상위 그룹(data-pre) 안에서만 이동
   · 병합된 상위 셀(매체·광고상품 등): 그 계층의 블록 전체가 같은 부모 안에서만 이동
     → 소재 행은 광고상품 안에서만, 광고상품 행은 같은 매체 안에서만 움직인다 */
let BDRAG=null;
function enableRowDrag(tbl,cfg,rerender){
  if(isClient())return;
  const ROWS='tbody tr[data-key]';
  const clearIns=()=>tbl.querySelectorAll('.ins-top,.ins-bot').forEach(x=>x.classList.remove('ins-top','ins-bot'));
  const allKeys=()=>[...tbl.querySelectorAll(ROWS)].map(x=>x.dataset.key);
  tbl.querySelectorAll(ROWS).forEach(tr=>{
    tr.classList.add('drag');tr.draggable=true;
    tr.ondragstart=e=>{if(BDRAG)return;RDRAG={key:tr.dataset.key,pre:tr.dataset.pre};tr.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','r');};
    tr.ondragend=()=>{tr.classList.remove('dragging');RDRAG=null;clearIns();};
    tr.ondragover=e=>{
      if(!RDRAG||RDRAG.pre!==tr.dataset.pre||RDRAG.key===tr.dataset.key)return;
      e.preventDefault();clearIns();
      const r=tr.getBoundingClientRect();
      tr.classList.add(e.clientY<r.top+r.height/2?'ins-top':'ins-bot');};
    tr.ondrop=e=>{
      if(!RDRAG||RDRAG.pre!==tr.dataset.pre)return;
      e.preventDefault();const before=tr.classList.contains('ins-top');
      const keys=allKeys();
      const from=keys.indexOf(RDRAG.key);let to;
      keys.splice(from,1);to=keys.indexOf(tr.dataset.key);
      keys.splice(before?to:to+1,0,RDRAG.key);
      cfg.order=keys;RDRAG=null;rerender();};
  });
  /* 상위 계층 블록 이동 */
  tbl.querySelectorAll('tbody td[data-pk]').forEach(td=>{
    if(td.dataset.lvl===undefined)return;
    td.draggable=true;td.classList.add('bdrag');
    td.title='끌어서 순서 변경 (같은 상위 그룹 안에서만)';
    td.ondragstart=e=>{e.stopPropagation();
      BDRAG={pk:td.dataset.pk,pp:td.dataset.pp,lvl:td.dataset.lvl};
      td.classList.add('bdragging');
      e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','b');};
    td.ondragend=e=>{e.stopPropagation();td.classList.remove('bdragging');BDRAG=null;clearIns();};
    td.ondragover=e=>{
      if(!BDRAG)return;e.stopPropagation();
      if(BDRAG.lvl!==td.dataset.lvl||BDRAG.pp!==td.dataset.pp||BDRAG.pk===td.dataset.pk)return;
      e.preventDefault();clearIns();
      const r=td.getBoundingClientRect();
      td.classList.add(e.clientY<r.top+r.height/2?'ins-top':'ins-bot');};
    td.ondrop=e=>{
      if(!BDRAG)return;e.stopPropagation();
      if(BDRAG.lvl!==td.dataset.lvl||BDRAG.pp!==td.dataset.pp||BDRAG.pk===td.dataset.pk)return;
      e.preventDefault();
      const before=td.classList.contains('ins-top');
      const keys=allKeys();
      const inBlk=(k,pk)=>k===pk||k.indexOf(pk+SEP)===0;
      const moving=keys.filter(k=>inBlk(k,BDRAG.pk));
      const rest=keys.filter(k=>!inBlk(k,BDRAG.pk));
      const tgt=td.dataset.pk;
      const first=rest.findIndex(k=>inBlk(k,tgt));
      const last=rest.length-1-[...rest].reverse().findIndex(k=>inBlk(k,tgt));
      const at=before?first:last+1;
      rest.splice(at<0?rest.length:at,0,...moving);
      cfg.order=rest;BDRAG=null;rerender();};
  });
}
/* 같은 상위 그룹 안에서 값이 같은(또는 빈) 세로 구간을 하나의 셀로 합친다 */
function mergeVertical(tbl,key){
  const rows=[...tbl.querySelectorAll('tbody tr')];
  let a=null,aGrp=null,aVal=null,span=0;
  const flush=()=>{if(a&&span>1)a.setAttribute('rowspan',span);a=null;aGrp=null;aVal=null;span=0;};
  rows.forEach(tr=>{
    if(!tr.dataset.key){flush();return;}                 /* 소계·합계 행에서 끊는다 */
    const grp=tr.dataset.key.split(SEP)[0];
    const td=tr.querySelector(`td[data-mk="${key}"]`);
    if(!td){if(a&&aGrp===grp)span++;else flush();return;} /* 이미 병합된 구간의 후속 행 */
    const v=td.getAttribute('data-mv')||'';
    if(a&&aGrp===grp&&aVal===v){td.remove();span++;return;}
    flush();a=td;aGrp=grp;aVal=v;span=1;});
  flush();
}
const applyOrder=(entries,cfg)=>{
  if(!cfg.order)return entries;
  const idx=k=>{const i=cfg.order.indexOf(k);return i<0?1e9:i;};
  return entries.slice().sort((a,b)=>idx(a[0])-idx(b[0]));
};

/* ===== 4. 캠페인 요약 · 진행 현황 · 도넛 · 타일 ===== */
const tip=$('tip');
function showTip(x,y,html){tip.innerHTML=html;tip.style.opacity=1;
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.min(x+14,innerWidth-w-10)+'px';tip.style.top=Math.max(10,y-h-14)+'px';}
const hideTip=()=>tip.style.opacity=0;

const PATTERN="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='46'%3E%3Crect x='4' y='7' width='38' height='30' rx='5' fill='%23ffffff' fill-opacity='0.11'/%3E%3Ccircle cx='15' cy='17' r='3.6' fill='%23ffffff' fill-opacity='0.17'/%3E%3Cpath d='M8 33 L19 20 L27 28 L32 23 L38 33 Z' fill='%23ffffff' fill-opacity='0.17'/%3E%3C/svg%3E\")";

function renderCampBar(){
  const gross=sum(LINES.map(lineGross));
  const it=(k,v)=>`<div class="it"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  $('campBar').innerHTML=it('캠페인',CAMPAIGN.name)+it('광고주',CAMPAIGN.advertiser)
    +it('집행 기간',`${campStart().replace(/-/g,'.')} – ${campEnd().replace(/-/g,'.')}`)
    +it('총 예산',won(gross))
    +it('총 Value',`${won(sum(LINES.map(lineValue)))} <span style="color:var(--muted);font-weight:600;font-size:11.5px">보너스율 ${pct(bonusRate(LINES),1)}</span>`);
}
function renderPace(){
  const ls=activeLines(),w=sum(ls.map(lineGross));
  const ach=sum(ls.map(l=>kpiAch(l)*lineGross(l)))/w;
  const b=aggFacts(paceFacts());
  const budget=sum(ls.map(lineGross)),pr=paceRatio(),gap=ach-pr;
  const sc=paceScope();
  const aP=Math.min(ach,1)*100,gP=Math.min(pr,1)*100,overlap=Math.abs(aP-gP)<12;
  /* 집행 일자 게이지 — 총 집행일수만큼 작은 칸, 경과분은 진하게 */
  const cells=[...Array(sc.days)].map((_,i)=>{
    const d=ALLDATES[sc.i0+i],done=i<sc.elapsed;
    return `<i class="${done?'on':''}" title="${dFull(d)} (${WD[d.getDay()]})"></i>`;}).join('');
  $('paceBox').innerHTML=`
    <div style="display:flex;align-items:center;gap:30px;flex-wrap:wrap">
      <div class="pside">
        <div class="ps-k">집행 경과</div>
        <div class="ps-v"><b>${sc.elapsed}일차</b><span>/ ${sc.days}일 · ${pct(pr,1)}</span></div>
        <div class="ps-s">데이터 기준일자 ${dFull(dT)}까지</div>
      </div>
      <div style="flex:1;min-width:440px">
        <div style="font-size:13px;margin-bottom:7px;color:var(--ink2);font-weight:700">종합 KPI 달성률</div>
        <div class="pbar">
          <i class="goal" style="width:${gP}%"></i>
          <i class="real" style="width:${aP}%"></i>
        </div>
        <div class="goalout">
          <span class="lg"><span class="sw" style="background:var(--acc)"></span>종합 KPI 달성률</span>
          <span class="lg pace"><span class="sw"></span>목표 페이스</span>
        </div>
        <div class="daygauge">
          <span class="dg-cells">${cells}</span>
          <div class="dg-ends">
            <span>${dFull(sc.start)} (${WD[sc.start.getDay()]})</span>
            <span>${dFull(sc.end)} (${WD[sc.end.getDay()]})</span>
          </div>
        </div>
      </div>
      <div class="pside">
        <div class="ps-k">예산 소진</div>
        <div class="ps-v"><b>${pct(b.cost/budget,1)}</b><span>/ ${won(budget)}</span></div>
        <div class="ps-s">소진 광고비 ${won(b.cost)}</div>
      </div>
    </div>`;
}
/* 맨 앞 카드 — 전체 매체 기준 예산 소진율 */
function renderSpendDonut(box,pr){
  const ls=activeLines();
  const budget=sum(ls.map(lineGross));
  const spent=aggFacts(paceFacts()).cost;
  const rate=budget?spent/budget:0;
  const c=el('div','card donut spend',box);
  c.innerHTML=`<div class="dhd"><div class="k">예산 소진율</div>
      <div class="kpitag">전체 매체</div></div><div class="ring"></div>`;
  const ring=c.querySelector('.ring');
  const CC=136,VB=272,TH=27;
  const svg=S('svg',{viewBox:`0 0 ${VB} ${VB}`,width:VB,height:VB});
  const defs=S('defs',{},svg);
  const rad=VB/2-TH/2-24,cir=2*Math.PI*rad;
  const f=Math.min(Math.max(rate,0),1),pf=Math.min(Math.max(pr,0),1);
  S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'#eaedf1','stroke-width':TH},svg);
  S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:PACE,'stroke-width':TH,opacity:.9,
    'stroke-linecap':'round','stroke-dasharray':`${cir*pf} ${cir}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
  /* 게이지 색은 다른 KPI 카드와 동일 */
  S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'#495e72','stroke-width':TH,'stroke-linecap':'round',
    'stroke-dasharray':`${cir*f} ${cir}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
  /* 호 위에 소진 금액을 곡선으로 (다른 카드의 "집행 …" 라벨과 같은 방식) */
  (function(){
    const pxy=(deg,r2)=>{const a=(deg-90)*Math.PI/180;return [CC+Math.cos(a)*r2,CC+Math.sin(a)*r2];};
    const arcPath=(r2,d1,d2)=>{const [x1,y1]=pxy(d1,r2),[x2,y2]=pxy(d2,r2);
      const large=Math.abs(d2-d1)>180?1:0,sweep=d2>d1?1:0;
      return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r2} ${r2} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;};
    const label=`집행 ${won(spent)}`;
    const need=label.length*7.0+16;
    const id=uid();
    if(cir*f>need){
      S('path',{id,d:arcPath(rad,0,179),fill:'none'},defs);
      const t=S('text',{'font-size':11.5,'font-weight':800,fill:'#fff','dominant-baseline':'central'},svg);
      const tp=document.createElementNS(NS,'textPath');
      tp.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+id);
      tp.setAttribute('href','#'+id);tp.setAttribute('startOffset','12');
      tp.setAttribute('text-anchor','start');tp.textContent=label;t.appendChild(tp);
    }else{
      const [tx,ty]=pxy(360*f/2,rad+TH/2+9);
      const t=S('text',{x:Math.max(4,Math.min(VB-4,tx)),y:ty,'dominant-baseline':'central',
        'text-anchor':tx>=CC?'start':'end','font-size':11.5,'font-weight':800,fill:'#495e72'},svg);
      t.textContent=label;}
  })();
  const hit=S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'transparent','stroke-width':TH,
    style:'pointer-events:stroke'},svg);
  hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
    `<div class="t">예산 소진율 · 전체 매체</div>`
    +`<div class="r"><span class="l">소진 광고비</span><b>${won(spent)}</b></div>`
    +`<div class="r"><span class="l">전체 예산 (Gross)</span><b>${won(budget)}</b></div>`
    +`<div class="r"><span class="l">소진율</span><b>${pct(rate,1)}</b></div>`
    +`<div class="r"><span class="l">목표 페이스</span><b>${pct(pr,1)}</b></div>`
    +`<div class="r"><span class="l">페이스 대비</span><b>${(rate-pr>=0?'+':'−')+Math.abs((rate-pr)*100).toFixed(1)}%p</b></div>`));
  hit.addEventListener('mouseleave',hideTip);
  ring.appendChild(svg);
  const ctr=el('div','ctr',ring);
  ctr.innerHTML=`<div class="ctrbox"><span class="achk">소진율</span>`
    +`<b class="achv mono">${pct(rate,1)}</b></div>`;
  const lg=el('div','dlgd',c);
  lg.innerHTML=`<span class="lg"><span class="sw"></span>목표 페이스 <b class="mono">${pct(pr,1)}</b></span>`
    +`<span class="lg spend"><span class="sw"></span>소진 <b class="mono">${pct(rate,1)}</b>`
    +` <span style="color:var(--muted);font-weight:600">/ ${won(budget)}</span></span>`;
}
function renderDonuts(){
  const box=$('donuts');box.innerHTML='';
  const mode=$('kpiGroupSel').value||'media';
  const ls=activeLines(),pr=paceRatio();
  const keys=[...new Set(ls.map(l=>mode==='product'?l.media+' · '+l.product:l[mode]))];
  renderSpendDonut(box,pr);

  const COL=['#495e72','#677b8d','#8897a6'];
  keys.forEach(name=>{
    const items=ls.filter(l=>(mode==='product'?l.media+' · '+l.product:l[mode])===name);
    /* KPI가 섞여 있으면 예산이 큰 순으로 최대 2개까지만 겹쳐 그린다 (3개 이상은 판독이 어려움) */
    const MAXRING=2;
    const allKpis=[...new Set(items.map(l=>l.kpi))]
      .map(k=>({k,w:sum(items.filter(l=>l.kpi===k).map(lineGross))}))
      .sort((a,b)=>b.w-a.w);
    const kpis=allKpis.slice(0,MAXRING).map(x=>x.k);
    const restKpis=allKpis.slice(MAXRING).map(x=>x.k);
    const safe=v=>isFinite(v)?v:0;
    const mk=k=>{
      const it=items.filter(l=>l.kpi===k),w=sum(it.map(lineGross));
      return {k,ach:safe(sum(it.map(l=>safe(kpiAch(l))*lineGross(l)))/w),
        act:safe(sum(it.map(l=>paceSum(l.daily[k])))),goal:safe(sum(it.map(l=>l.e[k])))};};
    const rings=kpis.map((k,i)=>({...mk(k),color:COL[i%COL.length]}));
    const restRows=restKpis.map(k=>({...mk(k),color:'var(--gray)'}));
    const c=el('div','card donut',box);
    /* 제목은 좌측 상단에 (전체 지표 타일과 같은 스타일) */
    c.innerHTML=`<div class="dhd"><div class="k">${esc(name)}</div>
        <div class="kpitag">KPI · ${allKpis.map(x=>KPI_LABEL[x.k]).join(' · ')}${restKpis.length?` <span style="opacity:.7">(상위 ${MAXRING})</span>`:''}</div></div>
      <div class="ring"></div>`;
    const ring=c.querySelector('.ring');
    /* 링 두께(TH)는 그대로 두고 전체 지름만 키워 가운데 구멍을 넓힌다 */
    const CC=136,VB=272;                     /* v18 — 카드 크기 80% */
    const svg=S('svg',{viewBox:`0 0 ${VB} ${VB}`,width:VB,height:VB});
    const defs=S('defs',{},svg);
    /* 링 두께 — 링이 여러 개면 얇게 해서 가운데 구멍을 넓힌다 (안쪽 라벨 자리 확보) */
    const TH=rings.length>1?21:27, GAPR=rings.length>1?6:7;
    /* 중심각(도, 12시=0) 기준 좌표 */
    const pxy=(deg,rad)=>{const a=((isFinite(deg)?deg:0)-90)*Math.PI/180;
      return [CC+Math.cos(a)*rad, CC+Math.sin(a)*rad];};
    /* 호 path — 텍스트를 곡률에 태우기 위한 경로. d1>d2 이면 반시계 방향으로 그린다. */
    const arcPath=(rad,d1,d2)=>{
      const [x1,y1]=pxy(d1,rad),[x2,y2]=pxy(d2,rad);
      const large=Math.abs(d2-d1)>180?1:0, sweep=d2>d1?1:0;
      return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rad} ${rad} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;};
    /* 12시에서 시작해 시계 방향으로 흐르는 라벨 (호 안쪽 문구용) */
    const curvedFrom=(rad,degFrom,label,fill,size,weight,op,offPx)=>{
      const id=uid();
      S('path',{id,d:arcPath(rad,degFrom,degFrom+179),fill:'none'},defs);
      const t=S('text',{'font-size':size,'font-weight':weight,fill,'dominant-baseline':'central',
        opacity:op===undefined?1:op},svg);
      const tp=document.createElementNS(NS,'textPath');
      tp.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+id);
      tp.setAttribute('href','#'+id);
      tp.setAttribute('startOffset',(offPx===undefined?10:offPx)+'');
      tp.setAttribute('text-anchor','start');
      tp.textContent=label;t.appendChild(tp);return t;};
    /* 어느 각도에 두어도 글자가 뒤집히지 않는 아치 라벨.
       위쪽 반원은 시계 방향, 아래쪽 반원은 반시계 방향 경로에 태워 항상 글자 윗면이 바깥(위)을 향한다. */
    /* align='end' 면 글자의 "오른쪽 끝"이 degCenter 각도에 정확히 붙는다
       (목표 페이스 게이지가 끝나는 지점에 레이블 끝을 맞추기 위한 것) */
    const arcLabel=(rad,degCenter,label,fill,size,weight,spanDeg,align)=>{
      const id=uid();
      const d=((degCenter%360)+360)%360;
      const bottom=d>90&&d<270;
      /* 경로가 글자보다 짧으면 textPath 가 잘리므로 필요한 만큼 호를 넓힌다 */
      const need=label.length*(size*0.62)+8;
      const span=Math.min(330,Math.max(spanDeg||150,need/Math.max(rad,1)*180/Math.PI));
      const endAlign=align==='end';
      /* 글자가 흐르는 방향: 위쪽 반원은 시계, 아래쪽 반원은 반시계 (뒤집히지 않도록) */
      const path=endAlign
        ? (bottom?arcPath(rad,d+span,d):arcPath(rad,d-span,d))
        : (bottom?arcPath(rad,d+span/2,d-span/2):arcPath(rad,d-span/2,d+span/2));
      S('path',{id,fill:'none',d:path},defs);
      const t=S('text',{'font-size':size,'font-weight':weight,fill,'dominant-baseline':'central'},svg);
      const tp=document.createElementNS(NS,'textPath');
      tp.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+id);
      tp.setAttribute('href','#'+id);
      tp.setAttribute('startOffset',endAlign?'100%':'50%');
      tp.setAttribute('text-anchor',endAlign?'end':'middle');
      tp.textContent=label;t.appendChild(tp);return t;};
    const paceLegend=[];
    rings.forEach((r,i)=>{
      const rad=(VB/2-TH/2-24)-i*(TH+GAPR),cir=2*Math.PI*rad;
      const pf=Math.min(Math.max(pr,0),1), af=Math.min(Math.max(r.ach,0),1);
      S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'#eaedf1','stroke-width':TH},svg);
      /* 목표 페이스 — 붉은 계열로 하단에 진하게 깔린다 */
      S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:PACE,'stroke-width':TH,opacity:.9,
        'stroke-linecap':'round','stroke-dasharray':`${cir*pf} ${cir}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
      S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:r.color,'stroke-width':TH,'stroke-linecap':'round',
        'stroke-dasharray':`${cir*af} ${cir}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
      const pDeg=360*pf, aDeg=360*af;
      /* 호 안쪽 — 집행 실적 */
      const label=`집행 ${KPI_LABEL[r.k]} ${fmt(r.act)}건`;
      const need=label.length*7.4+18;
      if(cir*af>need){
        curvedFrom(rad,0,label,'#fff',12,800,1,12);
      }else{
        const rr=rad+TH/2+9,[tx,ty]=pxy(aDeg/2,rr);
        const t=S('text',{x:Math.max(4,Math.min(VB-4,tx)),y:ty,'dominant-baseline':'central',
          'text-anchor':tx>=CC?'start':'end','font-size':12,'font-weight':800,fill:r.color},svg);
        t.textContent=label;}
      /* 목표 페이스 — 호 끝 바깥쪽에 말풍선으로 (지시선 + 흰 박스) */
      /* 목표 페이스는 카드 왼쪽 아래 범례로 뺀다 (도넛 안이 좁아 읽기 어려웠다) */
      paceLegend.push({k:r.k,v:r.goal*pr,color:r.color});
      });
    /* 마우스를 올리면 그 KPI의 세부 데이터를 보여준다 (하단 목록 대신) */
    rings.concat(restRows).forEach((r,i)=>{
      const rad=(VB/2-TH/2-24)-Math.min(i,rings.length-1)*(TH+GAPR);
      const hit=S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'transparent','stroke-width':TH,
        style:'pointer-events:stroke;cursor:default'},svg);
      hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,
        `<div class="t">${esc(name)} · ${KPI_LABEL[r.k]}</div>`
        +`<div class="r"><span class="l">집행</span><b>${fmt(r.act)}</b></div>`
        +`<div class="r"><span class="l">목표</span><b>${fmt(r.goal)}</b></div>`
        +`<div class="r"><span class="l">달성률</span><b>${pct(r.ach,1)}</b></div>`
        +`<div class="r"><span class="l">목표 페이스</span><b>${pct(pr,1)} (${fmt(r.goal*pr)})</b></div>`
        +`<div class="r"><span class="l">페이스 대비</span><b>${(r.ach-pr>=0?'+':'−')+Math.abs((r.ach-pr)*100).toFixed(1)}%p</b></div>`));
      hit.addEventListener('mouseleave',hideTip);});
    ring.appendChild(svg);
    /* 가운데 — 달성률만 (KPI가 여러 개면 예산 가중 평균) */
    const totW=sum(items.map(lineGross));
    const total=totW?sum(items.map(l=>(isFinite(kpiAch(l))?kpiAch(l):0)*lineGross(l)))/totW:0;
    const ctr=el('div','ctr',ring);
    const lg=el('div','dlgd',c);
    lg.innerHTML=paceLegend.map(x=>
      `<span class="lg"><span class="sw"></span>${rings.length>1?esc(KPI_LABEL[x.k])+' ':''}목표 페이스`
      +` <b class="mono">${fmt(x.v)}건</b></span>`).join('');
    const ctr2=null;
    ctr.innerHTML=`<div class="ctrbox"><span class="achk">달성률</span>`
      +`<b class="achv mono" title="${rings.length===1?KPI_LABEL[rings[0].k]:'KPI 종합'} 기준">${pct(total,1)}</b></div>`;
  });
}
/* 페이스 대비 판정 기준 (%p) — 시행사 모드에서 변경 가능 */
let VERDICT_BAND=5;
function verdictOf(ach,pace){
  const gap=(isFinite(ach)?ach:0)-pace, p=gap*100;
  if(p>VERDICT_BAND)return {cls:'good',label:'우수',gap};
  if(p<-VERDICT_BAND)return {cls:'bad',label:'저조',gap};
  return {cls:'ok',label:'양호',gap};
}
const STAT_CATALOG=fieldCatalog('dash',f=>!!METRICS[f.k]);
/* 전체 지표 기본 열 — 사전의 기본값에서 매출은 빼고 전환을 넣는다 */
const STAT_DEF_OUT=['rev'],STAT_DEF_IN=['conv'];
let STAT_CFG={rows:[],groups:[{id:uid(),name:'기본',
  cols:fieldDefaults('dash').filter(k=>METRICS[k]&&FLD[k].kind==='in'&&!STAT_DEF_OUT.includes(k))
    .concat(STAT_DEF_IN.filter(k=>METRICS[k]))}]};
/* 지표별 일자 시계열 — 진행 스코프 안에서, 집행이 끝난 날까지만 값을 만든다.
   (남은 집행일은 값 없이 비워 둔다 = 오른쪽이 비는 이유) */
function dailySeries(k){
  const sc=paceScope();
  const fs=paceFacts();
  const byDay=new Map();
  fs.forEach(f=>{if(!byDay.has(f.d))byDay.set(f.d,zeroB());
    const b=byDay.get(f.d);AMET.forEach(m=>b[m]+=f[m]);b.cost+=f.cost;});
  const done=Math.max(Math.min(sc.i1+1,ELAPSED)-sc.i0,0);   /* 값이 있는 날 수 */
  const vals=[];
  for(let i=0;i<done;i++){
    const b=byDay.get(sc.i0+i);
    vals.push(b?mval(k,b):(METRICS[k].kind==='abs'?0:NaN));}
  return {vals,days:sc.days,done,i0:sc.i0};
}
function renderStrip(){
  /* 달성률·페이스를 함께 보여주므로 진행 스코프 기준으로 (도넛·진행 현황과 동일) */
  const a=aggFacts(paceFacts()),e=aggExp(activeLines()),pr=paceRatio();
  const box=$('statStrip');box.innerHTML='';
  const cols=cfgCols(STAT_CFG);
  box.style.gridTemplateColumns=`repeat(${Math.min(Math.max(cols.length,2),5)},minmax(0,1fr))`;
  cols.forEach(k=>{
    const av=mval(k,a),ev=mval(k,e),isAbs=METRICS[k].kind==='abs';
    const rate=isAbs?av/ev:(['cpm','cpc','cpv','cpa'].includes(k)?ev/av:av/ev);
    const S=dailySeries(k);
    const ok=S.vals.filter(isFinite);
    const last=ok.length?ok[ok.length-1]:NaN;                /* 어제 획득분 */
    const avg=ok.length?sum(ok)/ok.length:NaN;               /* 지금까지 일평균 */
    /* 낮을수록 좋은 지표(CPM·CPC·CPV·CPA)는 부호를 뒤집어 읽는다 */
    const lower=['cpm','cpc','cpv','cpa','cpi','cpe'].includes(k);
    /* 제안 대비 — "지금쯤 제안대로면 여기까지" 와 비교해 얼마나 앞서 있는가
       (볼륨·금액은 예상×목표 페이스, 단가는 제안 단가와 직접 비교) */
    const due=isAbs?ev*pr:ev;
    const d=isAbs
      ? (isFinite(av)&&isFinite(due)&&due?av/due-1:NaN)
      : (lower?(isFinite(ev)&&isFinite(av)&&av?ev/av-1:NaN)
              :(isFinite(av)&&isFinite(ev)&&ev?av/ev-1:NaN));
    const good=d>0;
    const c=el('div','card stat',box);
    c.innerHTML=`<div class="sbody">
        <div class="k">${METRICS[k].l}</div>
        <div class="v mono${(()=>{const n=METRICS[k].f(av).length;return n>13?' lng2':n>10?' lng':'';})()}">${METRICS[k].f(av)}</div>
        ${isFinite(d)?`<div class="dl ${good?'up':'down'}" title="${
            isAbs?`제안(${METRICS[k].f(due)})보다 ${pct(Math.abs(d),1)} ${d>0?'앞서 있습니다':'뒤처져 있습니다'}`
                 :`제안 ${METRICS[k].f(ev)} 대비 ${pct(Math.abs(d),1)} ${d>0?'좋습니다':'나쁩니다'}`}">
            제안 대비 ${d>0?'+':'−'}${pct(Math.abs(d),1)} <i>${d>0?'↑':'↓'}</i></div>`
          :'<div class="dl na">제안 대비 –</div>'}
        <div class="e">${k==='cost'?'예산':'예상'} <b class="mono">${METRICS[k].f(ev)}</b></div>
        <div class="r">${k==='cost'?'소진율':'현재 달성률'} <b class="mono">${pct(rate,1)}</b>
          <span class="sub">(목표 페이스 ${pct(pr,1)})</span></div>
        <div class="r2">어제 <b class="mono">${isFinite(last)?METRICS[k].f(last):'–'}</b>
          <span class="sub">(일평균 ${isFinite(avg)?METRICS[k].f(avg):'–'})</span></div>
      </div>
      <div class="spark"></div><div class="sppill" hidden></div>`;
    drawSpark(c.querySelector('.spark'),c.querySelector('.sppill'),S,k);});
}
/* 카드 배경에 깔리는 일별 추이 — 축·범례·여백 없이 추세만.
   오늘(데이터 기준일)에 작은 원 표식, 마우스를 올리면 그 날의 값을 알약으로 보여준다. */
function drawSpark(host,pill,ser,k){
  const W=300,H=112;                                  /* viewBox — 카드 폭에 맞춰 늘어난다 */
  const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none',class:'spk'},host);
  const n=Math.max(ser.days,1);
  if(!ser.done){return;}
  const ok=ser.vals.filter(isFinite);
  if(!ok.length)return;
  let lo=Math.min(...ok),hi=Math.max(...ok);
  if(hi===lo){hi=lo+(Math.abs(lo)||1);lo=lo-(Math.abs(lo)||1)*.15;}
  else{const pad=(hi-lo)*.22;hi+=pad*.6;lo-=pad;}
  const X=i=>n<=1?0:(i/(n-1))*W;
  const Y=v=>H-((v-lo)/(hi-lo))*(H-8)-4;
  const pts=[];
  ser.vals.forEach((v,i)=>{if(isFinite(v))pts.push([X(i),Y(v)]);});
  if(pts.length<2)pts.push([X(0)+.01,pts[0]?pts[0][1]:H/2]);
  const line=smoothPath(pts);
  const gid=uid();
  const g=S('linearGradient',{id:gid,x1:'0',y1:'0',x2:'0',y2:'1'},svg);
  S('stop',{offset:'0%','stop-color':'var(--acc)','stop-opacity':'.13'},g);
  S('stop',{offset:'100%','stop-color':'var(--acc)','stop-opacity':'0'},g);
  S('path',{d:`${line} L${pts[pts.length-1][0]} ${H} L${pts[0][0]} ${H} Z`,fill:`url(#${gid})`},svg);
  S('path',{d:line,fill:'none',stroke:'var(--acc)','stroke-width':1.8,opacity:.42,
    'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},svg);
  /* 오늘(마지막 집행일) 표식 */
  const lastPt=pts[pts.length-1];
  S('circle',{cx:lastPt[0],cy:lastPt[1],r:3.4,fill:'var(--surface)',stroke:'var(--acc)',opacity:.75,
    'stroke-width':2,'vector-effect':'non-scaling-stroke',class:'spk-now'},svg);
  /* hover — 점선 + 점 + 알약 */
  const hl=S('line',{x1:0,y1:0,x2:0,y2:H,stroke:'var(--acc)','stroke-width':1,
    'stroke-dasharray':'3 3','vector-effect':'non-scaling-stroke',opacity:0},svg);
  const hd=S('circle',{r:3.6,fill:'var(--acc)',stroke:'var(--surface)','stroke-width':2,
    'vector-effect':'non-scaling-stroke',opacity:0},svg);
  const card=host.closest('.stat');
  const move=ev=>{
    const r=host.getBoundingClientRect();
    const rel=(ev.clientX-r.left)/Math.max(r.width,1);
    let i=Math.round(rel*(n-1));
    i=Math.max(0,Math.min(i,ser.done-1));
    const v=ser.vals[i];
    if(!isFinite(v)){hl.setAttribute('opacity',0);hd.setAttribute('opacity',0);pill.hidden=true;return;}
    const x=X(i),y=Y(v);
    hl.setAttribute('x1',x);hl.setAttribute('x2',x);hl.setAttribute('y1',y);hl.setAttribute('opacity',.55);
    hd.setAttribute('cx',x);hd.setAttribute('cy',y);hd.setAttribute('opacity',1);
    const d=ALLDATES[ser.i0+i];
    pill.hidden=false;
    pill.innerHTML=`<span class="d">${d.getMonth()+1}월 ${d.getDate()}일</span>`
      +`<b class="mono">${METRICS[k].f(v)}</b>`;
    const px=(x/W)*r.width;
    const cw=card.getBoundingClientRect().width;
    pill.style.left=Math.max(6,Math.min(px-pill.offsetWidth/2,cw-pill.offsetWidth-6))+'px';
    pill.style.bottom=(r.height-(y/H)*r.height+10)+'px';};
  const leave=()=>{hl.setAttribute('opacity',0);hd.setAttribute('opacity',0);pill.hidden=true;};
  card.addEventListener('mousemove',move);
  card.addEventListener('mouseleave',leave);
}
