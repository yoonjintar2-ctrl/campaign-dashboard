/* =====================================================================
   데이터 접수함 (v160 · v166 이름 바꿈) — 데이터 입력 메뉴
   · 받은 엑셀 · PDF 를 그대로 올려 둔다. 사이트가 이미 아는 형식(TV 실적 표 · 디지털 일자별 실적)은
     그 자리에서 "바로 넣기" 로 넣고, 나머지(위클리 · 먼슬리 리포트, 큐시트 …)는 접수만 해 둔다.
   · 접수된 자료는 Claude 가 확인해 일괄 반영하고 상태를 '반영 완료' 로 바꾼다.
     같은 형식이 쌓여 읽는 규칙이 정해지면 그 형식은 "바로 넣기" 목록(INBX_DETECT)에 추가한다.
   · v171 — 영역(TV · OTT · 리포트)을 가리지 않는 메뉴 하나. 맨 오른쪽 · 운영 권한 계정만 · 모든 캠페인 공통(목록은 캠페인과 무관하게 전부).
     파일 없이 요청 글만 남길 수도 있다.
   · 저장 — 비공개 버킷 intake + 표 intake_files (supabase/2026-11-11_intake.sql).
     로그인 전 · 샘플 화면에서는 이 세션 안에서만 보관한다.
   ===================================================================== */
var INBX_AREA='tv';   // var — 14-tv 의 areaOfTab 이 먼저 볼 수 있게
const INBX={meta:{},rows:[],demo:[],cid:null,missing:false,err:'',busy:false,pend:[],open:{}};
const INBX_BUCKET='intake',INBX_MAX_MB=30;
const INBX_KINDS={
  tv:['TV 위클리 리포트','TV 실적 (채널 · 일자 · 주차)','큐시트 · 편성표 (예상효율)','기타'],
  digital:['디지털 데일리 리포트','미디어믹스','먼슬리 리포트 (PDF)','기타'],
  ott:['OTT 리포트 (일별 실적)','미디어믹스 · 예상효율','기타'],
  report:['먼슬리 리포트 (PDF)','경쟁사 소재 · 인쇄물','기타'],
  all:['TV 큐시트 · 편성표','TV 위클리 리포트','TV 실적 (채널 · 일자 · 주차)','OTT 리포트 (일별 실적)','디지털 데일리 리포트','미디어믹스 · 예상효율','먼슬리 리포트 (PDF)','경쟁사 소재 · 인쇄물','기타']};
/* v166 — 어떤 매체의 자료인지 (고르거나 직접 적는다) */
const INBX_MEDIA={tv:['TV 전체','지상파','케이블 · 종편'],digital:['디지털 전체'],ott:['OTT 전체','Netflix','TVING','Coupang Play','Wavve'],
  report:['전체','TV','디지털','OTT','인쇄 · 잡지'],all:['TV','OTT','디지털','OOH','먼슬리 리포트','전체 · 기타']};
/* 지금 캠페인 이름(광고주 · 캠페인) — 접수 줄에 어느 캠페인 자료인지 적어 둔다 */
function inbxCampName(){try{return [CAMPAIGN.advertiser,(CLOUD.campaign&&CLOUD.campaign.name)||CAMPAIGN.name].filter(Boolean).join(' · ');}catch(e){return '';}}
function inbxMedias(area){let m=(INBX_MEDIA[area]||[]).slice();
  if(area==='digital'||area==='ott'){try{[...new Set((S.lines||[]).map(l=>String(l.media||'').trim()).filter(Boolean))].forEach(x=>{if(!m.includes(x))m.push(x);});}catch(e){}}
  return m;}
const INBX_ST={wait:'반영 대기',done:'반영 완료',hold:'보류'};
const inbxMB=b=>b<1048576?Math.max(1,Math.round(b/1024))+'KB':(b/1048576).toFixed(1)+'MB';
/* 파일 이름으로 자료 종류 짐작 — 사용자가 고칠 수 있다 */
function inbxGuess(name,kinds){const n=String(name||'');
  const pick=re=>kinds.find(k=>re.test(k));
  return (/큐시트|편성/.test(n)&&pick(/큐시트/))||(/위클리|weekly|주간|주차/i.test(n)&&pick(/위클리/))||(/\.pdf$/i.test(n)&&pick(/먼슬리/))
    ||(/데일리|daily|일별/i.test(n)&&pick(/데일리|일별/))||(/OTT|넷플릭스|리포트|report/i.test(n)&&pick(/OTT 리포트|데일리 리포트/))
    ||(/믹스|mix|예상/i.test(n)&&pick(/미디어믹스/))||kinds[kinds.length-1];}
function inbxOn(){try{return !!(CLOUD&&CLOUD.on&&CLOUD.sb&&CLOUD.user&&CLOUD.campaign&&CLOUD.campaign.id&&!CLOUD.shareView);}catch(e){return false;}}
function inbxEdit(){try{return inbxOn()?CLOUD.role!=='viewer':!(CLOUD&&CLOUD.shareView);}catch(e){return true;}}
function inbxCid(){try{return inbxOn()?CLOUD.campaign.id:'demo';}catch(e){return 'demo';}}
/* 요청자 이름 — 마지막에 적은 이름(이 브라우저) → 계정 이름 */
function inbxWho(){let w='';try{w=localStorage.getItem('inbx_who')||'';}catch(e){}
  if(!w){try{w=(CLOUD.user&&(CLOUD.user.user_metadata?.name||CLOUD.user.user_metadata?.full_name||String(CLOUD.user.email||'').split('@')[0]))||'';}catch(e){}}return w;}
function inbxMonth(prev){const d=new Date();if(prev)d.setDate(0);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function inbxWhen(iso){const d=new Date(iso);if(!isFinite(d))return '';
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}

/* ---------- 사이트가 바로 읽는 형식 ----------
   새 형식을 익히면 여기에 한 줄 — {k, l, area, test(grid,file) → 점수, run(file)} */
const INBX_DETECT=[
  {k:'tvres',l:'TV 실적 표 (채널 · 일자 · 주차)',area:'tv',
    pick:g=>{try{return tvResScore(g);}catch(e){return 0;}},
    test:g=>{try{return tvResScore(g.slice(0,400));}catch(e){return 0;}},
    run:f=>tvResImport(f)},
  {k:'daily',l:'일자별 실적 (디지털 · OTT 표)',area:'digital',
    pick:null,
    test:g=>{try{const d=hdrDict(dailyColsOf(true),'daily'),h=findHeader(g,d,['date']);
      return h&&h.i>=0&&h.score>=3?h.score:0;}catch(e){return 0;}},
    run:f=>importDaily(f)}];
async function inbxDetect(f,area){
  if(!/\.(xlsx?|csv)$/i.test(f.name))return null;
  /* v167 — TV set 큐시트 통합 엑셀 (시트 이름으로 알아본다 · 5MB 안팎이라 크기 제한 앞에서) */
  if(area==='tv'||area==='all'){try{if(await cueIsLegacy(f))return {k:'cue',l:'TV 큐시트 (통합 엑셀)',area:'tv',s:9,run:x=>{cueImportFile(x);}};}catch(e){}}
  if(f.size>8*1048576)return null;            /* 큰 파일은 브라우저에서 훑지 않는다 */
  let best=null;
  for(const d of INBX_DETECT.filter(d=>area==null||area==='all'||d.area===area||(d.area==='digital'&&area==='ott'))){
    try{const g=await readGrid(f,d.pick||undefined);const s=+d.test(g)||0;
      if(s>0&&(!best||s>best.s))best={...d,s};}catch(e){}}
  return best;}

/* ---------- 불러오기 ---------- */
async function inbxLoad(force){
  const cid=inbxOn()?'all':'demo';   /* v171 — 모든 캠페인 공통 */
  if(!force&&INBX.cid===cid)return;
  INBX.cid=cid;INBX.err='';
  if(!inbxOn()){INBX.rows=INBX.demo;INBX.missing=false;return;}
  try{
    const {data,error}=await CLOUD.sb.from('intake_files').select('*')
      .order('created_at',{ascending:false}).limit(300);
    if(error)throw error;
    INBX.rows=data||[];INBX.missing=false;
  }catch(e){
    const m=(e&&(e.message||e.code))||String(e);
    INBX.missing=/42P01|PGRST20[45]|does not exist|Could not find the table/i.test(m+' '+(e&&e.code||''));
    INBX.err=INBX.missing?'':m;INBX.rows=INBX.demo;}
}

/* ---------- 그리기 ---------- */
function inbxHost(){
  const tv=$('tab-tvinput'),dg=$('tab-input');
  /* v171 — 접수함은 데이터 접수함 메뉴 하나에서만(입력 화면 안의 접수함은 뺐다) */
  const ib=$('tab-intake');if(ib&&!ib.classList.contains('hidden'))return {el:$('inbxMain'),area:'all'};
  return null;}
async function inbxRender(force){
  const h=inbxHost();if(!h||!h.el)return;
  await inbxLoad(force);
  inbxPaint(h.el,h.area);}
function inbxPaint(el,area){
  const kinds=INBX_KINDS[area]||INBX_KINDS.digital;
  const ed=inbxEdit(),live=inbxOn();
  /* 데이터 접수함 화면 제목 — 영역 이름 (v161) */
  if(el.id==='inbxMain'){const t=$('inbxNote');if(t)t.textContent='모든 캠페인 공통 · 운영 권한 계정만 보입니다 · 자료와 요청을 모두 여기서';}
  const DG=new Set(['digital','ott']);
  const rows=area==='all'?INBX.rows:INBX.rows.filter(r=>!r.area||r.area===area||(DG.has(area)&&DG.has(r.area)));
  const wait=rows.filter(r=>r.status==='wait').length;
  const open=el.id==='inbxMain'?true:(INBX.open[area]!=null?INBX.open[area]:true);
  const warn=INBX.missing?`<div class="inbx-warn">접수함 저장소가 아직 준비되지 않았습니다 — Supabase SQL Editor 에서 <code>supabase/2026-11-11_intake.sql</code> 을 한 번 실행해 주세요. <b>그 전까지는 이 화면을 닫으면 사라지는 임시 보관이라 접수해도 전달되지 않습니다.</b></div>`
    :INBX.err?`<div class="inbx-warn">접수 목록을 불러오지 못했습니다 — ${esc(INBX.err)}</div>`
    :!live?`<div class="inbx-warn soft">로그인 전 · 샘플 화면이라 이 세션 안에서만 보관합니다.</div>`:'';
  const mt=INBX.meta[area]||(INBX.meta[area]={media:inbxMedias(area)[0]||'',mon:'',note:''});
  const pend=INBX.pend.map((p,i)=>`<li class="inbx-pf">
      <span class="ic">${((/\.([a-z0-9]+)$/i.exec(p.f.name)||[])[1]||'FILE').toUpperCase().slice(0,4)}</span>
      <span class="nm" title="${esc(p.f.name)}">${esc(p.f.name)}</span><span class="sz">${inbxMB(p.f.size)}</span>
      ${p.det===undefined?'<span class="det wait">형식 확인 중…</span>'
        :p.det?`<span class="det ok" title="사이트가 바로 읽을 수 있는 형식입니다">✓ ${esc(p.det.l)}</span>
          <button class="btn sm pri" data-inbx-run="${i}"${p.ran?' disabled':''}>${p.ran?'넣음':'바로 넣기'}</button>`
        :'<span class="det cl">Claude 확인 후 일괄 반영</span>'}
      <select class="inbx-kind" data-inbx-kind="${i}" aria-label="쓰일 항목" title="이 자료가 쓰일 항목">${kinds.map(k=>`<option${k===p.kind?' selected':''}>${esc(k)}</option>`).join('')}</select>
      <button class="x" data-inbx-drop="${i}" title="빼기">×</button></li>`).join('');
  const list=rows.length?`<table class="inbx-list"><thead><tr><th>접수</th><th>캠페인</th><th>파일 · 요청</th><th>매체 · 항목</th><th>기준 월</th><th>요청자</th><th>상태 · 처리 결과</th>${ed?'<th></th>':''}</tr></thead><tbody>${
    rows.map(r=>`<tr data-id="${esc(r.id)}">
      <td class="mono">${esc(inbxWhen(r.created_at))}</td>
      <td>${esc(r.camp||'')}</td>
      <td class="fn">${r.path||r.blob?`<a href="#" data-inbx-get="${esc(r.id)}" title="${esc(r.name)}">${esc(r.name)}</a><small>${inbxMB(+r.size||0)}</small>`:'<b>요청</b>'}${r.note?`<small class="say">“${esc(r.note)}”</small>`:''}</td>
      <td>${esc(r.kind||'')}${r.detected?`<small class="ok">사이트 인식</small>`:''}</td>
      <td class="mono">${esc(r.month||'')}</td>
      <td>${esc(r.uploader_name||'')}</td>
      <td><span class="inbx-st ${esc(r.status)}">${INBX_ST[r.status]||r.status}</span>${r.status_note?`<small>${esc(r.status_note)}</small>`:''}</td>
      ${ed?`<td class="act"><select class="inbx-sel" data-inbx-st="${esc(r.id)}" aria-label="상태 바꾸기">${
        Object.keys(INBX_ST).map(k=>`<option value="${k}"${k===r.status?' selected':''}>${INBX_ST[k]}</option>`).join('')}</select>
        <button class="x" data-inbx-del="${esc(r.id)}" title="지우기">×</button></td>`:''}
    </tr>`).join('')}</tbody></table>`
    :'<div class="inbx-empty">아직 접수된 자료가 없습니다.</div>';
  el.innerHTML=`<div class="inbx card${open?'':' shut'}">
    <div class="inbx-hd">${el.id==='inbxMain'?'':`<button class="inbx-fold" data-inbx-fold="${area}" aria-expanded="${open}">${open?'▾':'▸'}</button>`}
      <b>${el.id==='inbxMain'?'파일 올리기':'데이터 접수함'}</b>${wait?`<span class="inbx-cnt">반영 대기 ${wait}</span>`:''}
      <span class="note">${area==='report'?'먼슬리 리포트 PDF 를 그대로 올려 두세요. Claude 가 확인해 리포트 메뉴에 일괄 반영합니다.'
        :'실적 리포트 · 큐시트 · 미디어믹스 엑셀을 그대로 올려 두세요. 사이트가 아는 형식은 바로 넣고, 나머지는 Claude 가 확인해 일괄 반영합니다.'}</span></div>
    <div class="inbx-bd">${warn}
      ${ed?`<label class="inbx-drop" tabindex="0"><input type="file" multiple accept="${area==='report'?'.pdf,.zip,.xlsx,.xls':'.xlsx,.xls,.csv,.pdf,.zip'}" hidden>
        <b>파일을 끌어다 놓거나 눌러서 고르세요</b><small>${area==='report'?'pdf · zip · xlsx':'xlsx · xls · csv · pdf · zip'} · 한 개 ${INBX_MAX_MB}MB 까지</small></label>
      ${INBX.pend.length||area==='all'?`<div class="inbx-form">${INBX.pend.length?`<ul>${pend}</ul>`:'<div class="inbx-only">파일 없이 요청만 남겨도 됩니다 — 아래에 매체와 전할 말을 적고 접수하세요.</div>'}
        <div class="inbx-row"><label>매체 <input class="txt inbx-media" list="inbxMediaL" maxlength="40" value="${esc(mt.media)}" placeholder="어떤 매체의 자료인가요">
            <datalist id="inbxMediaL">${inbxMedias(area).map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
          <label>요청자 <input class="txt inbx-who" maxlength="30" style="width:110px" value="${esc(mt.who!=null?mt.who:inbxWho())}" placeholder="이름"></label>
          <label>기준 월 <input type="month" class="inbx-mon" value="${esc(mt.mon||inbxMonth(area==='report'))}"></label>
          <label class="grow">전할 말 <textarea class="txt inbx-note" maxlength="500" rows="1" placeholder="${area==='report'?'예) 10월 먼슬리 최종본입니다. 소재 아카이브는 지난달 것 유지해 주세요':'예) 10월 4주차 수정본. 케이블 금액이 바뀌었으니 주차별 퍼포먼스에 반영해 주세요'}">${esc(mt.note)}</textarea></label>
          <button class="btn sm pri" data-inbx-up${INBX.busy?' disabled':''}>${INBX.busy?'올리는 중…':'접수하기'}</button>
          <button class="btn sm" data-inbx-cancel>취소</button></div>
        <div class="inbx-say" aria-live="polite"></div></div>`:''}`
      :'<div class="inbx-warn soft">조회 전용 권한이라 자료를 올릴 수 없습니다.</div>'}
      ${list}</div></div>`;
  inbxWire(el,area);}

/* ---------- 동작 ---------- */
function inbxWire(el,area){
  const q=s=>el.querySelector(s);
  const fold=q('[data-inbx-fold]');
  if(fold)fold.onclick=()=>{INBX.open[area]=!(INBX.open[area]!=null?INBX.open[area]:true);inbxPaint(el,area);};
  const drop=q('.inbx-drop'),inp=drop&&drop.querySelector('input');
  if(drop){
    inp.onchange=()=>{inbxAdd([...inp.files],el,area);inp.value='';};
    drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click();}};
    drop.ondragover=e=>{e.preventDefault();drop.classList.add('on');};
    drop.ondragleave=()=>drop.classList.remove('on');
    drop.ondrop=e=>{e.preventDefault();drop.classList.remove('on');inbxAdd([...(e.dataTransfer.files||[])],el,area);};}
  el.querySelectorAll('[data-inbx-drop]').forEach(b=>b.onclick=()=>{INBX.pend.splice(+b.dataset.inbxDrop,1);inbxPaint(el,area);});
  el.querySelectorAll('[data-inbx-run]').forEach(b=>b.onclick=()=>{
    const p=INBX.pend[+b.dataset.inbxRun];if(!p||!p.det)return;
    try{p.det.run(p.f);p.ran=true;}catch(e){showToast('넣지 못했습니다',(e&&e.message)||String(e),{kind:'warn'});}
    inbxPaint(el,area);});
  const c=q('[data-inbx-cancel]');if(c)c.onclick=()=>{INBX.pend=[];inbxPaint(el,area);};
  const up=q('[data-inbx-up]');
  el.querySelectorAll('[data-inbx-kind]').forEach(x=>x.onchange=()=>{const p=INBX.pend[+x.dataset.inbxKind];if(p)p.kind=x.value;});
  const mt=INBX.meta[area]||(INBX.meta[area]={media:'',mon:'',note:''});
  [['.inbx-media','media'],['.inbx-mon','mon'],['.inbx-note','note'],['.inbx-who','who']].forEach(([c,k])=>{const x=q(c);if(x)x.oninput=()=>{mt[k]=x.value;};});
  if(up)up.onclick=()=>{const md=(q('.inbx-media').value||'').trim();
    if(!INBX.pend.length&&!(q('.inbx-note').value||'').trim()){showToast('전할 말을 적어 주세요','파일 없이 접수할 때는 요청 내용을 적어야 합니다.',{kind:'warn'});q('.inbx-note').focus();return;}
    if(!md){showToast('매체를 적어 주세요','어떤 매체의 자료인지 고르거나 적어야 접수됩니다.',{kind:'warn'});q('.inbx-media').focus();return;}
    inbxUpload(el,area,{media:md,month:q('.inbx-mon').value||'',note:(q('.inbx-note').value||'').trim(),who:((q('.inbx-who')||{}).value||'').trim()});};
  el.querySelectorAll('[data-inbx-get]').forEach(a=>a.onclick=e=>{e.preventDefault();inbxGet(a.dataset.inbxGet);});
  el.querySelectorAll('[data-inbx-st]').forEach(s=>s.onchange=()=>inbxSetSt(s.dataset.inbxSt,s.value,el,area));
  el.querySelectorAll('[data-inbx-del]').forEach(b=>b.onclick=()=>{
    const r=INBX.rows.find(x=>x.id===b.dataset.inbxDel);if(!r)return;
    confirmModal('접수한 자료를 지울까요?',`${r.name} — 저장소의 파일도 함께 지워지며 되돌릴 수 없습니다.`,()=>inbxDel(r,el,area),'지우기',false);});
}
function inbxAdd(files,el,area){
  const ok=[],bad=[];
  files.forEach(f=>{
    if(!/\.(xlsx?|csv|pdf|zip)$/i.test(f.name))bad.push(`${f.name} — 형식`);
    else if(f.size>INBX_MAX_MB*1048576)bad.push(`${f.name} — ${inbxMB(f.size)} (${INBX_MAX_MB}MB 초과)`);
    else ok.push(f);});
  if(bad.length)showToast('올릴 수 없는 파일이 있습니다',bad.join(' · '),{kind:'warn',ms:5200});
  const kinds=INBX_KINDS[area]||INBX_KINDS.digital;
  const add=ok.map(f=>({f,det:undefined,ran:false,kind:inbxGuess(f.name,kinds)}));
  INBX.pend=INBX.pend.concat(add);inbxPaint(el,area);
  add.forEach(p=>inbxDetect(p.f,area).then(d=>{p.det=d;
    /* 사이트가 알아본 형식이면 그 파일의 자료 종류도 맞춰 둔다 */
    if(d){const o=kinds.find(k=>d.k==='cue'?/큐시트/.test(k):d.k==='tvres'?/TV 실적/.test(k):/데일리|일별/.test(k));if(o)p.kind=o;}
    const keep={mon:el.querySelector('.inbx-mon')?.value,note:el.querySelector('.inbx-note')?.value};
    inbxPaint(el,area);
    const m=el.querySelector('.inbx-mon'),n=el.querySelector('.inbx-note');
    if(m&&keep.mon)m.value=keep.mon;if(n&&keep.note)n.value=keep.note;}));
}
function inbxKey(cid,rid,i,name){
  const m=/\.([A-Za-z0-9]{1,8})$/.exec(name||'');
  return `${cid}/${rid}/${i}${m?'.'+m[1].toLowerCase():''}`;}
function inbxRid(){try{return crypto.randomUUID();}catch(e){
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16));}}
async function inbxUpload(el,area,meta){
  if(INBX.busy||(!INBX.pend.length&&!(meta&&meta.note)))return;
  INBX.busy=true;
  const say=t=>{const s=(meta&&meta.sayEl)||(el&&el.querySelector('.inbx-say'));if(s)s.textContent=t;};
  const live=inbxOn()&&!INBX.missing,cid=inbxCid();
  let who=(meta&&meta.who)||'';if(!who)who=inbxWho();
  const done=[];let okAll=false;
  try{
    let i=0;
    /* v171 — 파일 없이 요청 글만 */
    const camp=inbxCampName(),only=!INBX.pend.length;
    for(const p of (only?[{f:{name:'(요청)',size:0},kind:'요청',det:null,ran:false,memo:true}]:INBX.pend.slice())){
      i++;say(`올리는 중… ${i}/${INBX.pend.length} · ${p.f.name}`);
      const rid=inbxRid();
      const row={id:rid,campaign_id:live?cid:null,camp,area,kind:[meta.media,p.kind].filter(Boolean).join(' · '),month:meta.month,note:meta.note,
        name:p.f.name,size:p.f.size,path:p.memo?'':inbxKey('all',rid,0,p.f.name),detected:p.det?p.det.l:'',
        status:p.ran?'done':'wait',status_note:p.ran?'사이트에서 바로 넣음':'',
        uploader_name:who||'나',created_at:new Date().toISOString()};
      if(live){
        if(!p.memo){const {error:e1}=await CLOUD.sb.storage.from(INBX_BUCKET).upload(row.path,p.f,{upsert:false,contentType:p.f.type||undefined});
        if(e1)throw new Error(`${p.f.name} — ${e1.message}`);}
        const ins={...row};delete ins.created_at;ins.uploader_id=CLOUD.user.id;
        const {error:e2}=await CLOUD.sb.from('intake_files').insert(ins);
        if(e2){if(!p.memo)try{await CLOUD.sb.storage.from(INBX_BUCKET).remove([row.path]);}catch(e){}
          throw new Error(`${p.f.name} — ${e2.message}`);}
      }else{
        if(!p.memo)try{row.blob=URL.createObjectURL(p.f);}catch(e){}
        INBX.demo.unshift(row);}
      done.push(p);}
    if(INBX.meta[area])INBX.meta[area].note='';okAll=true;
    showToast(live?'접수했습니다':'임시로만 보관했습니다',`${only?'요청 1건':done.length+'개 파일'}${live?' · 반영되면 상태가 \'반영 완료\'로 바뀝니다':' — 저장소가 준비되지 않아 화면을 닫으면 사라집니다'}`,{kind:live?'ok':'warn',ms:live?3200:7000});
  }catch(e){
    showToast('접수하지 못했습니다',(e&&e.message)||String(e),{kind:'warn',ms:6000});
  }finally{
    INBX.pend=INBX.pend.filter(p=>!done.includes(p));INBX.busy=false;
    await inbxLoad(true);if(el)inbxPaint(el,area);else{try{inbxRender();}catch(e){}}}
  return okAll;
}
async function inbxGet(id){
  const r=INBX.rows.find(x=>x.id===id);if(!r)return;
  if(r.blob){window.open(r.blob,'_blank','noopener');return;}
  if(!inbxOn()||!r.path)return;
  const {data,error}=await CLOUD.sb.storage.from(INBX_BUCKET).createSignedUrl(r.path,600,{download:r.name});
  if(error){showToast('파일을 열지 못했습니다',error.message,{kind:'warn'});return;}
  window.open(data.signedUrl,'_blank','noopener');}
async function inbxSetSt(id,st,el,area){
  const r=INBX.rows.find(x=>x.id===id);if(!r)return;
  const note=st==='done'?`반영 ${inbxWhen(new Date().toISOString())}`:st==='hold'?'보류':'';
  if(inbxOn()&&!r.blob){
    const {error}=await CLOUD.sb.from('intake_files').update({status:st,status_note:note,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){showToast('상태를 바꾸지 못했습니다',error.message,{kind:'warn'});inbxPaint(el,area);return;}}
  r.status=st;r.status_note=note;inbxPaint(el,area);}
async function inbxDel(r,el,area){
  if(inbxOn()&&!r.blob){
    const {error}=await CLOUD.sb.from('intake_files').delete().eq('id',r.id);
    if(error){showToast('지우지 못했습니다',error.message,{kind:'warn'});return;}
    if(r.path)try{await CLOUD.sb.storage.from(INBX_BUCKET).remove([r.path]);}catch(e){}
  }else INBX.demo=INBX.demo.filter(x=>x!==r);
  INBX.rows=INBX.rows.filter(x=>x!==r);inbxPaint(el,area);}

/* ---------- v174 — 설정 옆 '데이터 접수' 버튼: 파일 · 설명 · 요청자 이름만 적는 작은 창 ----------
   올린 것은 데이터 접수함에 '반영 대기'로 쌓이고, Claude 가 가져가 기존 데이터와 대조해 반영한 뒤 처리 결과를 적는다 */
function inbxQuick(){
  const QF=[];
  const box=openModal('데이터 접수',`<div class="inbxq">
      <p class="lead">받은 자료(엑셀 · PDF · zip)와 설명을 올려 주세요. Claude 가 기존 데이터와 대조해 사이트에 반영하고, <b>데이터 접수함</b>에 처리 결과를 남깁니다.</p>
      <label class="inbx-drop" tabindex="0"><input type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.zip" hidden>
        <b>파일을 끌어다 놓거나 눌러서 고르세요</b><small>xlsx · xls · csv · pdf · zip · 한 개 ${INBX_MAX_MB}MB 까지 · 여러 개 가능</small></label>
      <ul class="qf"></ul>
      <label class="f">설명 <textarea class="txt q-note" rows="4" maxlength="500" placeholder="예) 코웨이 11월 큐시트 수정본입니다. 3주차 케이블 편성이 바뀌었어요"></textarea></label>
      <label class="f w">요청자 이름 <input class="txt q-who" maxlength="30" value="${esc(inbxWho())}" placeholder="이름"></label>
      <div class="inbx-say" aria-live="polite"></div></div>`,
    /* v180 — 접수함은 메인 메뉴 줄에서 빼고, 운영 계정은 여기서 들어간다 */
    `${inbxEdit()?`<button class="btn" data-close id="inbxqList" style="margin-right:auto">접수함 보기</button>`:''}<button class="btn" data-close>취소</button><button class="btn primary" id="inbxqGo">접수하기</button>`,{w:560});
  const q=s=>box.querySelector(s),drop=q('.inbx-drop'),inp=drop.querySelector('input'),ul=q('.qf');
  {const lb=(box.closest('.modal')||box.parentNode||document).querySelector('#inbxqList')||document.getElementById('inbxqList');if(lb)lb.addEventListener('click',()=>setTimeout(()=>{try{switchTab('intake');}catch(e){}},0));}
  const paint=()=>{ul.innerHTML=QF.map((f,i)=>`<li><span class="nm">${esc(f.name)}</span><span class="sz">${inbxMB(f.size)}</span><button type="button" class="x" data-i="${i}" title="빼기">×</button></li>`).join('');
    ul.querySelectorAll('.x').forEach(b=>b.onclick=()=>{QF.splice(+b.dataset.i,1);paint();});};
  const add=fs=>{const bad=[];fs.forEach(f=>{if(!/\.(xlsx?|csv|pdf|zip)$/i.test(f.name))bad.push(`${f.name} — 형식`);else if(f.size>INBX_MAX_MB*1048576)bad.push(`${f.name} — ${INBX_MAX_MB}MB 초과`);else QF.push(f);});
    if(bad.length)showToast('올릴 수 없는 파일이 있습니다',bad.join(' · '),{kind:'warn',ms:5200});paint();};
  inp.onchange=()=>{add([...inp.files]);inp.value='';};
  drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click();}};
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('on');};drop.ondragleave=()=>drop.classList.remove('on');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('on');add([...(e.dataTransfer.files||[])]);};
  q('#inbxqGo').onclick=async()=>{
    const note=q('.q-note').value.trim(),who=q('.q-who').value.trim();
    if(!QF.length&&!note){showToast('파일이나 설명을 넣어 주세요','',{kind:'warn'});return;}
    if(!who){showToast('요청자 이름을 적어 주세요','',{kind:'warn'});q('.q-who').focus();return;}
    try{localStorage.setItem('inbx_who',who);}catch(e){}
    await inbxLoad(true);
    const kinds=INBX_KINDS.all;
    INBX.pend=QF.map(f=>({f,det:null,ran:false,kind:inbxGuess(f.name,kinds)}));
    q('#inbxqGo').disabled=true;
    const ok=await inbxUpload(null,'all',{media:'',month:inbxMonth(),note,who,sayEl:q('.inbx-say')});
    if(ok)closeModal();else{const b=q('#inbxqGo');if(b)b.disabled=false;}};
}
(function(){const b=document.getElementById('upBtn');if(b)b.onclick=()=>{try{inbxQuick();}catch(e){}};})();
