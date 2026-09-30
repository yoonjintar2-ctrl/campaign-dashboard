
/* ===== 14. TV 캠페인 · 운영 매체 (v71) =====
   캠페인마다 운영한 매체(디지털 · TV)를 고르고, 고른 매체의 메뉴만 보인다.
   TV 는 우선 **기본 틀**만 — 예상효율(계획) · 리포트 데이터(실적) 입력 표와
   예산 · GRP · CPRP · 집행 횟수 카드, 채널별 표.
   데이터는 캠페인 문서(doc.tv) 한 덩어리에 담긴다 → 서버 스키마를 바꾸지 않는다. */

/* ---------- 운영 매체 ---------- */
/* 문서에 없으면(예전 캠페인) 디지털만 운영한 것으로 본다 */
function campMedia(){
  const m=CAMPAIGN.media||{};
  const d=m.digital!==false, t=!!m.tv;
  return (d||t)?{digital:d,tv:t}:{digital:true,tv:false};}
function setCampMedia(m){
  const d=!!m.digital,t=!!m.tv;
  if(!d&&!t)return false;                      /* 최소 한 개는 있어야 캠페인이 성립한다 */
  CAMPAIGN.media={digital:d,tv:t};
  return true;}
/* 탭 줄 — 운영하지 않는 매체의 메뉴를 감춘다 */
function applyMediaTabs(){
  const m=campMedia();
  document.querySelectorAll('#tabs [data-med]').forEach(b=>{
    const need=(b.dataset.med||'').split(/\s+/).filter(Boolean);
    /* 구분선(data-med="digital tv")은 둘 다 켜졌을 때만 */
    const on=b.classList.contains('tabsep')?(m.digital&&m.tv):need.some(k=>m[k]);
    b.classList.toggle('medoff',!on);});
  /* 디지털 전용 도구 — 영역 관리 · 리포트 엑셀 · 다크 보기 */
  ['sectMngBtn'].forEach(id=>{const e=$(id);if(e)e.classList.toggle('medoff',!m.digital);});
  const dl=document.querySelector('#tabs .dlgrp');if(dl)dl.classList.toggle('medoff',!m.digital);
  /* 지금 보고 있는 탭이 사라졌으면 남아 있는 첫 대시보드로 */
  const cur=document.querySelector('#tabs button[data-tab].on');
  if(cur&&cur.classList.contains('medoff'))switchTab(firstDashTab());
  try{fitTabs();}catch(e){}
}
/* 보이는 첫 대시보드 탭 — 디지털이 꺼져 있으면 TV 대시보드 */
function firstDashTab(){return campMedia().digital?'dash':'tvdash';}
/* 탭이 한 줄에 안 들어가면 글자·여백을 줄인다(.dense) — 그래도 넘치면 두 줄로 */
function fitTabs(){
  const t=$('tabs');if(!t)return;
  /* 보이는 칸들이 몇 줄로 놓였는지 — 가운데 높이가 앞 줄 안에 들면 같은 줄 */
  const rows=()=>{const rs=[];
    [...t.children].filter(e=>!e.classList.contains('tabsep')&&!e.classList.contains('spacer'))
      .map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)
      .sort((x,y)=>x.top-y.top).forEach(r=>{const c=(r.top+r.bottom)/2,l=rs[rs.length-1];
        if(l&&c<=l.b)l.b=Math.max(l.b,r.bottom);else rs.push({b:r.bottom});});
    return rs.length;};
  const ok=n=>t.scrollWidth<=t.clientWidth+2&&rows()<=n;
  const set=(...c)=>{t.classList.remove('dense','wrap2','wrapn','tl2');c.forEach(x=>t.classList.add(x));};
  const md=campMedia();
  /* 한 줄 → 한 줄·작게 → 두 줄(매체별) → 두 줄·도구는 2줄로 → 두 줄·작게 → 두 줄·작게·도구 2줄
     (TV만 운영하면 매체별로 나눌 것이 없으니 순서 그대로 접는다) */
  const steps=md.digital
    ?[[[],1],[['dense'],1],[['wrap2'],2],[['wrap2','tl2'],2],[['wrap2','dense'],2],[['wrap2','dense','tl2'],2]]
    :[[[],1],[['dense'],1],[['wrapn'],2],[['wrapn','dense'],2]];
  /* 대시보드에서만 보이는 것(하위 메뉴 서머리 · 일자별 · 미디어믹스, 🌙 다크)이 **보일 때**를 기준으로 맞춘다
     — 어느 탭에서 맞추든, 탭을 옮겨도 줄 모양이 그대로 */
  const tmp=(md.digital?[$('subbar'),$('darkToggle')]:[]).filter(e=>e&&e.classList.contains('hidden'));
  tmp.forEach(e=>e.classList.remove('hidden'));
  try{for(const [c,n] of steps){set(...c);if(ok(n))break;}}
  finally{tmp.forEach(e=>e.classList.add('hidden'));}
  done();
  function done(){try{if(typeof syncStick==='function')syncStick();}catch(e){}try{fitTop();}catch(e){}}
}
/* 머리줄(로고 · 캠페인 · 상태 · 저장 · 로그인 · 언어 · 설정) — 좁으면 언어 칩을 KO/EN 으로 줄인다 */
const LANG_LONG={ko:'한국어',en:'English'},LANG_SHORT={ko:'KO',en:'EN'};
function fitTop(){
  const t=document.querySelector('.topbar'),sel=$('langSel'),cs=$('cloudState');if(!t||!sel)return;
  const put=m=>[...sel.options].forEach(o=>{const v=m[o.value];if(v&&o.textContent!==v)o.textContent=v;});
  t.classList.remove('tcompact','tcompact2','tcompact3');put(LANG_LONG);
  const over=()=>t.scrollWidth>t.clientWidth+1;
  const tight=()=>over()||!!(cs&&cs.textContent.trim()&&cs.offsetParent&&cs.scrollWidth>cs.clientWidth+1);
  if(tight()){t.classList.add('tcompact');put(LANG_SHORT);}
  /* 그래도 넘치거나 상태 글씨가 거의 안 보이면 — 여백을 줄이고 제품 이름을 감춘다(로고는 남김) → 베타 표시 감춤 */
  const cramped=()=>over()||!!(cs&&cs.textContent.trim()&&cs.offsetParent&&cs.scrollWidth>cs.clientWidth+1&&cs.clientWidth<70);
  if(cramped())t.classList.add('tcompact2');
  if(cramped())t.classList.add('tcompact3');
  if(cs)cs.title=cs.textContent.trim();}
(function(){const go=()=>{fitTop();const cs=$('cloudState');
    if(cs)new MutationObserver(()=>{clearTimeout(window.__fitTopM);window.__fitTopM=setTimeout(()=>{try{fitTop();}catch(e){}},60);})
      .observe(cs,{childList:true,characterData:true,subtree:true});};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):go();})();
addEventListener('resize',()=>{clearTimeout(window.__fitTabsT);window.__fitTabsT=setTimeout(()=>{try{fitTabs();}catch(e){}try{fitTop();}catch(e){}},120);});

/* 설정 › 운영 매체 */
function openMediaSettings(){
  const m=campMedia();
  const card=(k,t,d)=>`<label class="medcard${m[k]?' on':''}" data-mk="${k}">
      <input type="checkbox" data-mk="${k}"${m[k]?' checked':''}>
      <b>${t}</b><i>${d}</i></label>`;
  const box=openModal('운영 매체',
    `<div class="hint" style="margin:-2px 0 12px">이번 캠페인에서 운영한 매체를 고릅니다. 고른 매체의 메뉴만 위쪽 탭에 보입니다.
      <b>최소 한 개</b>는 골라야 합니다.</div>
     <div class="medgrid">${card('digital','Digital','디지털 캠페인 대시보드 · 디지털 리포트 데이터 입력 · 디지털 예상효율 입력')}
       ${card('tv','TV','TV캠페인 대시보드 · TV캠페인 리포트 데이터 입력 · TV캠페인 예상효율 입력')}</div>
     <div class="hint" id="medMsg" style="margin-top:10px;min-height:18px"></div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="medOk">적용</button>',{w:560});
  const read=()=>({digital:box.querySelector('input[data-mk="digital"]').checked,
                   tv:box.querySelector('input[data-mk="tv"]').checked});
  box.querySelectorAll('input[data-mk]').forEach(cb=>cb.onchange=()=>{
    const v=read();
    if(!v.digital&&!v.tv){cb.checked=true;
      $('medMsg').innerHTML='<span style="color:var(--neg)">TV 와 Digital 중 <b>최소 한 개</b>는 선택해야 합니다.</span>';}
    else $('medMsg').textContent='';
    box.querySelectorAll('label.medcard').forEach(l=>l.classList.toggle('on',
      box.querySelector(`input[data-mk="${l.dataset.mk}"]`).checked));});
  const ok=$('medOk');
  if(ok)ok.onclick=()=>{
    if(!setCampMedia(read())){$('medMsg').textContent='TV 와 Digital 중 최소 한 개는 선택해야 합니다.';return;}
    closeModal();applyMediaTabs();
    try{if(campMedia().tv)renderTV();}catch(e){}
    try{markDirty();saveLocal();}catch(e){}};
}

/* ---------- 데이터 ---------- */
let TV_PLAN=[], TV_SPOTS=[];
/* 열 정의 — type: text · num · pct(시청률 %) · date · calc(자동 계산) */
const TV_PLAN_COLS=[
  {k:'ch',l:'채널',type:'text',w:118},
  {k:'prog',l:'프로그램',type:'text',w:220},
  {k:'grade',l:'시급',type:'text',w:66},
  {k:'dur',l:'초수',type:'num',w:66},
  {k:'cnt',l:'횟수',type:'num',w:66},
  {k:'price',l:'단가',type:'num',w:112},
  {k:'rating',l:'예상 시청률(%)',type:'pct',w:108},
  {k:'amt',l:'금액',type:'calc',w:124},
  {k:'grp',l:'예상 GRP',type:'calc',w:96},
  {k:'cprp',l:'예상 CPRP',type:'calc',w:110},
  {k:'note',l:'비고',type:'text',w:170}];
const TV_SPOT_COLS=[
  {k:'date',l:'방송일',type:'date',w:112},
  {k:'time',l:'방송시간',type:'text',w:80},
  {k:'ch',l:'채널',type:'text',w:112},
  {k:'prog',l:'프로그램',type:'text',w:210},
  {k:'grade',l:'시급',type:'text',w:62},
  {k:'dur',l:'초수',type:'num',w:62},
  {k:'cr',l:'소재',type:'text',w:140},
  {k:'cnt',l:'횟수',type:'num',w:62},
  {k:'cost',l:'광고비(Gross)',type:'num',w:120},
  {k:'rating',l:'시청률(%)',type:'pct',w:92},
  {k:'grp',l:'GRP',type:'calc',w:80}];
const tvNum=v=>{const n=parseFloat(String(v==null?'':v).replace(/[,\s₩원%]/g,''));return isFinite(n)?n:0;};
const tvR=(n,d)=>{const p=Math.pow(10,d||0);return Math.round((+n||0)*p)/p;};
const tvFmt1=n=>(isFinite(n)&&n)?(+n).toLocaleString('en-US',{maximumFractionDigits:1,minimumFractionDigits:1}):'';
/* 행 하나의 계산값 */
function tvPlanCalc(r){
  const cnt=tvNum(r.cnt),price=tvNum(r.price),rt=tvNum(r.rating);
  const amt=cnt*price,grp=cnt*rt;
  return {amt,grp,cprp:grp?amt/grp:NaN};}
function tvSpotCalc(r){
  const cnt=r.cnt===''||r.cnt==null?1:tvNum(r.cnt);
  return {cnt,grp:cnt*tvNum(r.rating),cost:tvNum(r.cost)};}
/* 합계 */
function tvPlanTotal(rows){
  let cnt=0,amt=0,grp=0;
  (rows||TV_PLAN).forEach(r=>{const c=tvPlanCalc(r);cnt+=tvNum(r.cnt);amt+=c.amt;grp+=c.grp;});
  return {cnt,amt,grp,cprp:grp?amt/grp:NaN};}
function tvSpotTotal(rows){
  let cnt=0,cost=0,grp=0;
  (rows||TV_SPOTS).forEach(r=>{const c=tvSpotCalc(r);cnt+=c.cnt;cost+=c.cost;grp+=c.grp;});
  return {cnt,cost,grp,cprp:grp?cost/grp:NaN};}
/* 날짜 — 2026-09-01 · 2026.9.1 · 9/1 (캠페인 연도) · 20260901 */
function tvDate(s){
  s=String(s==null?'':s).trim();if(!s)return '';
  let m=/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(s);
  if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=/^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=/^(\d{1,2})[-./](\d{1,2})$/.exec(s);
  if(m){const y=String(campStart()||iso(new Date())).slice(0,4);
    return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
  return s;}

/* ---------- 입력 표 (예상효율 · 리포트 데이터 공용) ---------- */
const TV_TBL={
  plan:{id:'tvPlanTbl',rows:()=>TV_PLAN,set:v=>{TV_PLAN=v;},cols:TV_PLAN_COLS,calc:tvPlanCalc,
    blank:()=>({ch:'',prog:'',grade:'',dur:'',cnt:'',price:'',rating:'',note:''}),
    sum:'tvPlanSum',note:'tvPlanNote'},
  spot:{id:'tvSpotTbl',rows:()=>TV_SPOTS,set:v=>{TV_SPOTS=v;},cols:TV_SPOT_COLS,calc:tvSpotCalc,
    blank:()=>({date:'',time:'',ch:'',prog:'',grade:'',dur:'',cr:'',cnt:'',cost:'',rating:''}),
    sum:'tvSpotSum',note:'tvSpotNote'}};
/* 칸에 보여 줄 값 */
function tvCellShow(c,r,cv){
  if(c.type==='calc'){
    const v=cv[c.k];
    if(c.k==='grp')return tvFmt1(v);
    return isFinite(v)&&v?fmt(Math.round(v)):'';}
  const v=r[c.k];
  if(v===''||v==null)return '';
  if(c.type==='num')return fmt(tvNum(v));
  if(c.type==='pct')return String(tvR(tvNum(v),2));
  return String(v);}
function tvCalcCells(key,tr,r){
  const T=TV_TBL[key],cv=T.calc(r);
  tr.querySelectorAll('td[data-calc]').forEach(td=>{
    const c=T.cols.find(x=>x.k===td.dataset.calc);if(c)td.textContent=tvCellShow(c,r,cv);});}
function tvFootHTML(key){
  const T=TV_TBL[key],rows=T.rows();
  const tot=key==='plan'?tvPlanTotal(rows):tvSpotTotal(rows);
  return '<tr class="total"><td class="rm"></td>'+T.cols.map((c,i)=>{
    let v='';
    if(i===0)v='TOTAL';
    else if(c.k==='cnt')v=fmt(tot.cnt);
    else if(c.k==='amt')v=fmt(Math.round(tot.amt));
    else if(c.k==='cost')v=fmt(Math.round(tot.cost));
    else if(c.k==='grp')v=tvFmt1(tot.grp);
    else if(c.k==='cprp')v=isFinite(tot.cprp)?fmt(Math.round(tot.cprp)):'';
    return `<td class="mono">${v}</td>`;}).join('')+'</tr>';}
function renderTvTable(key){
  const T=TV_TBL[key],t=$(T.id);if(!t)return;
  const rows=T.rows();
  let h='<thead><tr><th class="rm" style="width:50px"></th>'
    +T.cols.map(c=>`<th style="min-width:${c.w}px"${c.type==='calc'?' class="tvcalc" title="자동 계산"':''}>${c.l}${c.type==='calc'?' ƒ':''}</th>`).join('')
    +'</tr></thead><tbody>';
  rows.forEach((r,i)=>{
    const cv=T.calc(r);
    h+=`<tr data-rd="${i}"><td class="rm">${RGRIP}<button data-tvdel="${i}" title="행 삭제">✕</button></td>`
      +T.cols.map((c,ci)=>{
        if(c.type==='calc')return `<td class="calc mono" data-calc="${c.k}">${tvCellShow(c,r,cv)}</td>`;
        const num=c.type==='num'||c.type==='pct';
        return `<td><input data-i="${i}" data-k="${c.k}" data-c="${ci}"${num?' inputmode="decimal" class="mono"':''}`
          +` value="${esc(tvCellShow(c,r,cv))}"${c.type==='date'?' placeholder="YYYY-MM-DD"':''}></td>`;}).join('')+'</tr>';});
  if(!rows.length)h+=`<tr class="tvempty"><td colspan="${T.cols.length+1}">${L('아직 입력한 행이 없습니다 — <b>+ 행 추가</b>를 누르거나 엑셀에서 복사해 첫 칸에 붙여 넣으세요.','No rows yet — click <b>+ Add row</b>, or copy cells in Excel and paste them into the first cell.')}</td></tr>`;
  h+='</tbody><tfoot>'+tvFootHTML(key)+'</tfoot>';
  t.innerHTML=h;
  const n=$(T.note);if(n)n.textContent=rows.length?`${fmt(rows.length)}행`:'';
  tvWire(key);
  enableRowMove(t,()=>({why:()=>'',apply:(from,to)=>{moveItem(T.rows(),from,to);renderTvTable(key);tvChanged();}}));
}
/* 값이 바뀌었을 때 — 대시보드 · 저장 */
function tvChanged(){
  try{if(!$('tab-tvdash').classList.contains('hidden'))renderTvDash();}catch(e){}
  try{markDirty();saveLocal();}catch(e){}}
/* 표 하나에 리스너를 한 번만 (위임) */
function tvWire(key){
  const T=TV_TBL[key],t=$(T.id);if(!t||t.__tvWired)return;
  t.__tvWired=1;
  t.addEventListener('change',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp)return;
    const i=+inp.dataset.i,k=inp.dataset.k,r=T.rows()[i];if(!r)return;
    const c=T.cols.find(x=>x.k===k);
    let v=inp.value.trim();
    if(c.type==='num')v=v===''?'':tvNum(v);
    else if(c.type==='pct')v=v===''?'':tvR(tvNum(v),3);
    else if(c.type==='date')v=tvDate(v);
    r[k]=v;
    inp.value=tvCellShow(c,r,T.calc(r));
    tvCalcCells(key,inp.closest('tr'),r);
    const tf=t.tFoot;if(tf)tf.innerHTML=tvFootHTML(key);
    tvChanged();});
  /* Enter = 아래 칸으로 (엑셀처럼) */
  t.addEventListener('keydown',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp||e.key!=='Enter')return;
    e.preventDefault();
    const i=+inp.dataset.i+(e.shiftKey?-1:1);
    const nx=t.querySelector(`input[data-i="${i}"][data-k="${inp.dataset.k}"]`);
    inp.blur();if(nx){nx.focus();nx.select();}});
  t.addEventListener('click',e=>{
    const d=e.target.closest('[data-tvdel]');if(!d)return;
    T.rows().splice(+d.dataset.tvdel,1);renderTvTable(key);tvChanged();});
  /* 엑셀에서 여러 칸을 복사해 붙이면 그 칸부터 펼친다 (모자라는 행은 새로 만든다) */
  t.addEventListener('paste',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp)return;
    const txt=(e.clipboardData||window.clipboardData).getData('text');
    if(!txt||!/[\t\n]/.test(txt.replace(/\n$/,'')))return;        /* 한 칸짜리는 평소대로 */
    e.preventDefault();
    const grid=txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));
    const edit=T.cols.filter(c=>c.type!=='calc');
    const c0=edit.findIndex(c=>c.k===inp.dataset.k),r0=+inp.dataset.i;
    const rows=T.rows();
    grid.forEach((line,dr)=>{
      while(rows.length<=r0+dr)rows.push(T.blank());
      const r=rows[r0+dr];
      line.forEach((v,dc)=>{const c=edit[c0+dc];if(!c)return;
        v=String(v).trim();
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)):c.type==='pct'?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):v;});});
    renderTvTable(key);tvChanged();});
}
function tvAddRow(key){
  const T=TV_TBL[key];T.rows().push(T.blank());renderTvTable(key);
  const t=$(T.id),last=t&&t.querySelector(`tbody tr[data-rd="${T.rows().length-1}"] input`);
  if(last){last.focus();last.scrollIntoView({block:'nearest'});}
  tvChanged();}
function tvWipe(key){
  const T=TV_TBL[key],n=T.rows().length;if(!n)return;
  confirmModal(`${key==='plan'?'TV 예상효율':'TV 리포트 데이터'}을 모두 지울까요?`,`${fmt(n)}행이 모두 사라집니다.`,
    ()=>{T.set([]);renderTvTable(key);tvChanged();},'모두 지우기');}
/* 엑셀 불러오기 — 첫 시트에서 머리글 줄을 찾아 이름으로 열을 맞춘다 (행을 이어 붙인다) */
const TV_HDR={
  date:['방송일','일자','날짜','방송일자','date'],time:['방송시간','시간','시작','시작시간','time'],
  ch:['채널','채널명','매체','channel'],prog:['프로그램','프로그램명','program'],
  grade:['시급','등급','grade'],dur:['초수','초','길이','sec','초(sec)'],
  cr:['소재','소재명','품목','creative'],cnt:['횟수','회수','집행횟수','count'],
  cost:['광고비','광고비(gross)','금액','집행금액','청약금액','cost'],
  price:['단가','price'],rating:['시청률','시청률(%)','예상시청률','예상시청률(%)','rating'],
  note:['비고','메모','note']};
const tvKey=s=>String(s==null?'':s).replace(/\s+/g,'').toLowerCase();
function tvImport(key,file){
  const run=f=>readGrid(f).then(grid=>{
    const T=TV_TBL[key],want=T.cols.filter(c=>c.type!=='calc');
    let hi=-1,map=null;
    for(let i=0;i<Math.min(grid.length,30)&&hi<0;i++){
      const row=grid[i]||[],m={};
      want.forEach(c=>{const names=(TV_HDR[c.k]||[c.l]).concat([c.l]).map(tvKey);
        const j=row.findIndex(v=>names.includes(tvKey(v)));if(j>=0&&!Object.values(m).includes(j))m[c.k]=j;});
      if(Object.keys(m).length>=2){hi=i;map=m;}}
    if(hi<0){confirmModal('머리글을 찾지 못했습니다.',
      `첫 시트에서 ${want.map(c=>c.l).join(' · ')} 같은 머리글 줄을 찾지 못했습니다.`,()=>{},'확인');return;}
    const out=[];
    grid.slice(hi+1).forEach(row=>{
      if(!row||!row.some(v=>String(v==null?'':v).trim()!==''))return;
      const r=T.blank();
      want.forEach(c=>{if(map[c.k]==null)return;let v=row[map[c.k]];v=v==null?'':String(v).trim();
        r[c.k]=c.type==='num'?(v===''?'':tvNum(v)):c.type==='pct'?(v===''?'':tvR(tvNum(v),3))
          :c.type==='date'?tvDate(v):v;});
      out.push(r);});
    T.rows().push(...out);renderTvTable(key);tvChanged();
    confirmModal(`${fmt(out.length)}행을 불러왔습니다.`,
      `맞춘 열: ${want.filter(c=>map[c.k]!=null).map(c=>c.l).join(' · ')}`,()=>{},'확인');
  }).catch(err=>confirmModal('파일을 읽지 못했습니다.',esc(String(err&&err.message||err)),()=>{},'확인'));
  (file instanceof Blob)?run(file):pickFile(run);}

/* ---------- TV 대시보드 ---------- */
function renderTvDash(){
  const box=$('tvKpis'),tb=$('tvChTbl');if(!box||!tb)return;
  const P=tvPlanTotal(),A=tvSpotTotal();
  const pc=(a,b)=>b?a/b:NaN;
  const card=(t,act,goal,fmtv,rate,sub)=>`<div class="tvkpi">
      <div class="tt">${t}</div>
      <div class="vv mono">${fmtv(act)}</div>
      <div class="gg">${goal!=null?`계획 <b class="mono">${fmtv(goal)}</b>`:''}${sub||''}</div>
      ${rate!=null?`<div class="bar"><i style="width:${Math.min(isFinite(rate)?rate:0,1)*100}%"></i></div>
      <div class="rr mono">${isFinite(rate)?(rate*100).toFixed(1)+'%':'–'}</div>`:''}</div>`;
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const g1=v=>isFinite(v)&&v?tvFmt1(v):'–';
  const n0=v=>isFinite(v)&&v?fmt(v):'–';
  const cprpDiff=(isFinite(A.cprp)&&isFinite(P.cprp)&&P.cprp)?(A.cprp/P.cprp-1):NaN;
  box.innerHTML=
    card('예산 소진',A.cost,P.amt,won0,pc(A.cost,P.amt))
   +card('GRP 달성',A.grp,P.grp,g1,pc(A.grp,P.grp))
   +card('CPRP',A.cprp,P.cprp,won0,null,isFinite(cprpDiff)
      ?` · <span class="${cprpDiff>0?'neg':'pos'}">계획 대비 ${cprpDiff>0?'+':''}${(cprpDiff*100).toFixed(1)}%</span>`:'')
   +card('집행 횟수',A.cnt,P.cnt,n0,pc(A.cnt,P.cnt));
  /* 채널별 */
  const chs=[...new Set(TV_PLAN.map(r=>r.ch).concat(TV_SPOTS.map(r=>r.ch)).map(v=>String(v||'').trim()).filter(Boolean))];
  const by=ch=>({p:tvPlanTotal(TV_PLAN.filter(r=>String(r.ch||'').trim()===ch)),
                 a:tvSpotTotal(TV_SPOTS.filter(r=>String(r.ch||'').trim()===ch))});
  const rows=chs.map(ch=>({ch,...by(ch)})).sort((x,y)=>(y.p.amt+y.a.cost)-(x.p.amt+x.a.cost));
  const pct1=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
  const tr=(nm,p,a,cls)=>`<tr${cls?` class="${cls}"`:''}><td class="head">${esc(nm)}</td>
      <td class="mono">${won0(p.amt)}</td><td class="mono">${won0(a.cost)}</td><td class="mono">${pct1(pc(a.cost,p.amt))}</td>
      <td class="mono gsep">${g1(p.grp)}</td><td class="mono">${g1(a.grp)}</td><td class="mono">${pct1(pc(a.grp,p.grp))}</td>
      <td class="mono gsep">${won0(p.cprp)}</td><td class="mono">${won0(a.cprp)}</td>
      <td class="mono gsep">${n0(p.cnt)}</td><td class="mono">${n0(a.cnt)}</td></tr>`;
  tb.innerHTML=`<thead><tr><th rowspan="2">채널</th><th colspan="3">예산</th><th colspan="3" class="gsep">GRP</th>
      <th colspan="2" class="gsep">CPRP</th><th colspan="2" class="gsep">집행 횟수</th></tr>
    <tr><th>계획 금액</th><th>집행 광고비</th><th>소진율</th><th class="gsep">계획</th><th>실적</th><th>달성률</th>
      <th class="gsep">계획</th><th>실적</th><th class="gsep">계획</th><th>실적</th></tr></thead><tbody>`
    +(rows.length?rows.map(r=>tr(r.ch,r.p,r.a)).join('')+tr('TOTAL',P,A,'total')
      :`<tr><td colspan="11" class="hint" style="padding:22px;text-align:center">아직 TV 데이터가 없습니다.</td></tr>`)
    +'</tbody>';
  /* 비어 있으면 어디서 넣는지 알려 준다 */
  const em=$('tvEmpty');
  if(em){const none=!TV_PLAN.length&&!TV_SPOTS.length;
    em.classList.toggle('hidden',!none);
    em.innerHTML=none?`<div class="notice"><span>ⓘ</span><div>${L(
      `TV 데이터가 아직 없습니다.
      <b>TV캠페인 예상효율 입력</b>에 채널별 계획(횟수 · 단가 · 예상 시청률)을,
      <b>TV캠페인 리포트 데이터 입력</b>에 실제 방송 실적(광고비 · 시청률)을 넣으면 여기에 모입니다.`,
      `No TV data yet. Enter per-channel plans (spots · unit price · expected rating) in
      <b>TV Campaign Forecast Input</b> and actual airing results (ad spend · rating) in
      <b>TV Campaign Report Data Input</b> — they'll be gathered here.`)}
      <span class="agency-only"><button class="btn sm" id="tvGoPlan">TV 예상효율 입력으로</button>
      <button class="btn sm" id="tvGoSpot">TV 리포트 데이터 입력으로</button></span></div></div>`:'';
    const gp=$('tvGoPlan'),gs=$('tvGoSpot');
    if(gp)gp.onclick=()=>switchTab('tvplan');if(gs)gs.onclick=()=>switchTab('tvinput');
    try{if(isClient())em.querySelectorAll('.agency-only').forEach(x=>x.classList.add('hidden'));}catch(e){}}
  const nt=$('tvDashNote');
  if(nt){const ds=TV_SPOTS.map(r=>r.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')).sort();
    nt.textContent=ds.length?`방송일 ${mdy(ds[0])}~${mdy(ds[ds.length-1])} · 실적 ${fmt(TV_SPOTS.length)}행`:'';}
}
function renderTV(){
  try{renderTvTable('plan');}catch(e){console.warn(e);}
  try{renderTvTable('spot');}catch(e){console.warn(e);}
  try{renderTvDash();}catch(e){console.warn(e);}}
/* 문서에 담기 · 되살리기 — serializeDoc / applyDoc 이 부른다 */
function tvForDoc(){return {plan:TV_PLAN.map(r=>({...r})),spots:TV_SPOTS.map(r=>({...r}))};}
function tvFromDoc(d){
  const t=d&&d.tv;
  TV_PLAN=Array.isArray(t&&t.plan)?t.plan.map(r=>({...r})):[];
  TV_SPOTS=Array.isArray(t&&t.spots)?t.spots.map(r=>({...r})):[];}

/* ---------- 연결 ---------- */
(function initTV(){
  const go=()=>{
    const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
    on('tvPlanAdd',()=>tvAddRow('plan'));on('tvSpotAdd',()=>tvAddRow('spot'));
    on('tvPlanAdd2',()=>tvAddRow('plan'));on('tvSpotAdd2',()=>tvAddRow('spot'));
    on('tvPlanWipe',()=>tvWipe('plan'));on('tvSpotWipe',()=>tvWipe('spot'));
    on('tvPlanUp',()=>tvImport('plan'));on('tvSpotUp',()=>tvImport('spot'));
    renderTV();applyMediaTabs();};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();
