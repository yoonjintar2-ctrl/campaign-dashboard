
/* ===== 16. OOH 캠페인 (v81) =====
   옥외광고는 실적 리포트가 따로 없어 **계획(예상효율)만** 받는다 — 매체 · 지면 · 지면 정보 · 시작일 · 종료일 · 광고비.
   소재는 이미지로 따로 올려 두고(지면 표의 '소재' 칸에 같은 이름을 적으면 이어진다), 서머리는 그 내용과 소재만 보여 준다.
   입력 표는 TV 와 같은 틀(TV_TBL)을 쓰고, 데이터는 캠페인 문서(doc.ooh) 한 덩어리에 담는다 → 서버 스키마 변경 없음. */

/* ---------- 데이터 ---------- */
var OOH_PLAN=[], OOH_CR=[];
const OOH_COLS=[
  {k:'media',l:'매체',type:'text',w:130},
  {k:'slot',l:'지면',type:'text',w:190},
  {k:'info',l:'지면 정보',type:'text',w:240},
  {k:'start',l:'시작일',type:'date',w:112},
  {k:'end',l:'종료일',type:'date',w:112},
  {k:'days',l:'일수',type:'calc',w:64},
  {k:'cost',l:'광고비',type:'num',w:130},
  {k:'cr',l:'소재',type:'text',w:150},
  {k:'note',l:'비고',type:'text',w:160}];
const ISO_D=/^\d{4}-\d{2}-\d{2}$/;
/* 집행 일수 — 시작 · 종료일이 다 있어야 센다 */
function oohDays(r){
  if(!ISO_D.test(r.start||'')||!ISO_D.test(r.end||''))return NaN;
  const a=new Date(r.start+'T00:00:00'),b=new Date(r.end+'T00:00:00');
  const n=Math.round((b-a)/86400000)+1;return n>0?n:NaN;}
function oohCalc(r){return {days:oohDays(r)};}
function oohTotal(rows){
  rows=rows||OOH_PLAN;
  const st=rows.map(r=>r.start).filter(d=>ISO_D.test(d||'')).sort();
  const en=rows.map(r=>r.end).filter(d=>ISO_D.test(d||'')).sort();
  const start=st[0]||'',end=en[en.length-1]||'';
  const media=new Set(rows.map(r=>String(r.media||'').trim()).filter(Boolean));
  return {cost:sum(rows.map(r=>tvNum(r.cost))),n:rows.filter(r=>String(r.slot||r.media||'').trim()).length,
    media:media.size,start,end,
    days:(start&&end)?oohDays({start,end}):NaN};}

/* TV 와 같은 입력 표 틀에 OOH 표를 더한다 */
TV_TBL.ooh={id:'oohPlanTbl',name:'OOH 예상효율',base:OOH_COLS,get cols(){return tblCols('ooh');},scope:'ooh',
  rows:()=>OOH_PLAN,set:v=>{OOH_PLAN=v;},calc:oohCalc,total:rs=>oohTotal(rs),
  blank:()=>({media:'',slot:'',info:'',start:'',end:'',cost:'',cr:'',note:''}),
  note:'oohPlanNote',changed:()=>oohChanged(),
  foot:(c,t)=>c.k==='cost'?fmt(Math.round(t.cost)):''};
/* 엑셀 머리글 이름 (TV_HDR 에 더한다 — 열쇠가 겹치지 않는 것만) */
Object.assign(TV_HDR,{
  media:['매체','매체명','매체사','media','vendor'],
  slot:['지면','지면명','위치','장소','구좌','slot','location','placement'],
  info:['지면정보','지면 정보','상세','상세정보','규격','사이즈','크기','형태','info','spec','size'],
  start:['시작일','시작','집행시작','집행 시작','게재시작','start','startdate'],
  end:['종료일','종료','집행종료','집행 종료','게재종료','end','enddate']});
/* 머리글 설명 (v72 머리글 팝업) */
const OOH_DESC={media:'옥외광고 매체(매체사)입니다.',slot:'광고가 걸리는 지면(위치 · 구좌)입니다.',
  info:'지면의 규격 · 형태 · 노출 시간 같은 상세 정보입니다.',start:'게재 시작일입니다.',end:'게재 종료일입니다.',
  days:'시작일부터 종료일까지 게재 일수입니다.',cost:'그 지면에 쓰는 광고비입니다.',
  cr:'그 지면에 거는 소재입니다 — 아래 소재 목록의 이름과 같으면 이미지가 이어집니다.',note:'자유롭게 적은 메모입니다.'};

/* 값이 바뀌면 — 서머리를 다시 그리고 저장 대상으로 */
function oohChanged(){
  try{if(!$('tab-oohdash').classList.contains('hidden'))renderOohDash();}catch(e){}
  try{renderOohCrEdit();}catch(e){}
  try{markDirty();saveLocal();}catch(e){}}

/* ---------- 소재 ---------- */
const oohKey=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();
function oohCrOf(name){const k=oohKey(name);return k?OOH_CR.find(c=>oohKey(c.name)===k):null;}
/* 한 칸에 소재를 여러 개 적을 수 있다 (쉼표 · 가운뎃점) */
function oohCrNames(r){return String(r&&r.cr||'').split(/\s*[,·•/]\s*/).map(x=>x.trim()).filter(Boolean);}
function oohCrUse(c){const k=oohKey(c.name);
  return OOH_PLAN.filter(r=>oohCrNames(r).some(n=>oohKey(n)===k));}
function oohImgPick(cb,multi){
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=!!multi;
  inp.style.display='none';document.body.appendChild(inp);
  inp.onchange=()=>{const fs=[...(inp.files||[])];inp.remove();if(fs.length)cb(fs);};
  inp.click();}
function oohAddFiles(files){
  const imgs=[...files].filter(f=>/^image\//.test(f.type||'')||/\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name||''));
  if(!imgs.length)return;
  let left=imgs.length;
  imgs.forEach(f=>shrinkImage(f,url=>{
    let nm=String(f.name||'소재').replace(/\.[a-z0-9]+$/i,'').trim()||'소재';
    /* 이름이 겹치면 (2) (3) … */
    if(oohCrOf(nm)){let i=2;while(oohCrOf(`${nm} (${i})`))i++;nm=`${nm} (${i})`;}
    OOH_CR.push({id:'oc'+Math.random().toString(36).slice(2,9),name:nm,img:url});
    if(--left===0){renderOohCrEdit();oohChanged();}}));}
function oohCrBig(c){
  if(!c||!c.img)return;
  const use=oohCrUse(c).map(r=>[r.media,r.slot].filter(Boolean).join(' · ')).filter(Boolean);
  openModal(c.name,`<div class="oohbig"><img src="${c.img}" alt="${esc(c.name)}"></div>`
    +(use.length?`<div class="hint" style="margin-top:10px">${L('게재 지면','Placements')} — ${esc(use.join(' / '))}</div>`:''),
    '<button class="btn primary" data-close>닫기</button>',{w:980});}
/* 입력 화면의 소재 목록 — 이름 고치기 · 이미지 바꾸기 · 지우기 */
function renderOohCrEdit(){
  const box=$('oohCrEdit');if(!box)return;
  const n=$('oohCrCount');if(n)n.textContent=OOH_CR.length?L(`${fmt(OOH_CR.length)}개`,`${fmt(OOH_CR.length)}`):'';
  if(!OOH_CR.length){
    box.innerHTML=`<div class="oohdrop" id="oohDrop">${L('소재 이미지를 여기로 끌어다 놓거나 <b>+ 소재 추가</b>를 누르세요. 여러 장을 한 번에 올릴 수 있습니다.',
      'Drag creative images here or click <b>+ Add creative</b>. You can upload several at once.')}</div>`;
  }else{
    box.innerHTML=`<div class="oohcrs edit" id="oohDrop">`+OOH_CR.map((c,i)=>{
      const use=oohCrUse(c).length;
      return `<div class="oohcr" data-oc="${i}">
        <div class="ph" data-ocbig="${i}">${c.img?`<img src="${c.img}" alt="">`:`<span>${L('이미지 없음','No image')}</span>`}</div>
        <div class="bd"><input class="txt" data-ocn="${i}" value="${esc(c.name)}" title="${L("소재 이름 — 지면 표의 '소재' 칸과 같은 이름이면 이어집니다","Creative name — links to placements whose Creative cell has the same name")}">
          <div class="mt"><span class="hint">${use?L(`지면 ${fmt(use)}곳`,`${fmt(use)} placements`):L('지면 미연결','Not linked')}</span><span class="spacer"></span>
          <button class="btn sm" data-ocimg="${i}" title="${L('이미지 바꾸기','Replace image')}">${L('이미지','Image')}</button>
          <button class="btn sm danger" data-ocdel="${i}" title="${L('소재 삭제','Delete creative')}">✕</button></div></div></div>`;}).join('')+`</div>`;}
  const dz=$('oohDrop');
  if(dz&&!dz.__w){dz.__w=1;
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');
      if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)oohAddFiles(e.dataTransfer.files);});}
  box.querySelectorAll('[data-ocn]').forEach(inp=>inp.onchange=()=>{
    const c=OOH_CR[+inp.dataset.ocn];if(!c)return;
    const nv=inp.value.trim();if(!nv||nv===c.name){inp.value=c.name;return;}
    if(oohCrOf(nv)&&oohCrOf(nv)!==c){confirmModal('같은 이름의 소재가 이미 있습니다.','다른 이름을 적어 주세요.',()=>{},'확인');inp.value=c.name;return;}
    /* 지면 표에 적힌 옛 이름도 함께 바꾼다 */
    const ok=oohKey(c.name);
    OOH_PLAN.forEach(r=>{const ns=oohCrNames(r);if(ns.some(x=>oohKey(x)===ok))r.cr=ns.map(x=>oohKey(x)===ok?nv:x).join(', ');});
    c.name=nv;try{renderTvTable('ooh');}catch(e){}oohChanged();});
  box.querySelectorAll('[data-ocbig]').forEach(b=>b.onclick=()=>oohCrBig(OOH_CR[+b.dataset.ocbig]));
  box.querySelectorAll('[data-ocimg]').forEach(b=>b.onclick=()=>oohImgPick(fs=>{
    const c=OOH_CR[+b.dataset.ocimg];if(!c)return;
    shrinkImage(fs[0],url=>{c.img=url;renderOohCrEdit();oohChanged();});}));
  box.querySelectorAll('[data-ocdel]').forEach(b=>b.onclick=()=>{
    const c=OOH_CR[+b.dataset.ocdel];if(!c)return;
    confirmModal(`"${c.name}" 소재를 삭제할까요?`,'지면 표에 적힌 소재 이름은 그대로 남습니다.',
      ()=>{OOH_CR=OOH_CR.filter(x=>x!==c);renderOohCrEdit();oohChanged();});});
}

/* ---------- OOH 서머리 ---------- */
let OOH_SORT=null;
function oohStatus(r,today){
  if(!ISO_D.test(r.start||'')||!ISO_D.test(r.end||''))return '';
  return today<r.start?'pre':today>r.end?'done':'live';}
const OOH_ST={get live(){return L('게재 중','Live');},get pre(){return L('게재 예정','Upcoming');},get done(){return L('게재 종료','Ended');}};
function renderOohDash(){
  const kp=$('oohKpis');if(!kp)return;
  const today=CAMPAIGN.today||iso(new Date());
  const rows=OOH_PLAN.filter(r=>Object.keys(r).some(k=>String(r[k]==null?'':r[k]).trim()!==''));
  const T=oohTotal(rows);
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const st={live:0,pre:0,done:0};rows.forEach(r=>{const s=oohStatus(r,today);if(s)st[s]++;});
  /* 기간 경과 */
  let el=NaN;
  if(T.start&&T.end){const tot=T.days,done=today<T.start?0:today>T.end?tot:oohDays({start:T.start,end:today});el=tot?done/tot:NaN;}
  const card=(t,v,g,rate,rr)=>`<div class="tvkpi"><div class="tt">${t}</div><div class="vv mono">${v}</div><div class="gg">${g||''}</div>
    ${rate!=null?`<div class="bar"><i style="width:${Math.min(Math.max(isFinite(rate)?rate:0,0),1)*100}%"></i></div><div class="rr mono">${rr||''}</div>`:''}</div>`;
  const crLinked=OOH_CR.filter(c=>oohCrUse(c).length).length;
  const B=v=>`<b class="mono">${fmt(v)}</b>`;
  kp.innerHTML=
    card(L('총 광고비','Total ad spend'),won0(T.cost),L(`매체 ${B(T.media)}곳 · 지면 ${B(T.n)}개`,`${B(T.media)} media · ${B(T.n)} placements`))
   +card(L('게재 기간','Flight'),T.start?`<span class="vsm">${mdy(T.start)} ~ ${mdy(T.end)}</span>`:'–',
      T.start?L(`총 ${B(T.days)}일`,`${B(T.days)} days`):'',T.start?el:null,isFinite(el)?L((el*100).toFixed(0)+'% 경과',(el*100).toFixed(0)+'% elapsed'):'')
   +card(L('게재 현황','Placement status'),`${fmt(st.live)}<span class="vsm"> / ${fmt(rows.length)}</span>`,
      L(`게재 중 지면 · 예정 ${B(st.pre)} · 종료 ${B(st.done)}`,`live now · upcoming ${B(st.pre)} · ended ${B(st.done)}`),
      rows.length?st.live/rows.length:null,'')
   +card(L('소재','Creatives'),`${fmt(OOH_CR.length)}<span class="vsm">${L(' 개','')}</span>`,OOH_CR.length?L(`지면에 연결 ${B(crLinked)}개`,`${B(crLinked)} linked to placements`):L('아직 올린 소재가 없습니다','No creatives uploaded yet'));
  const nt=$('oohDashNote');if(nt)nt.textContent=T.start?`${mdy(T.start)}~${mdy(T.end)} · `+L(`지면 ${fmt(rows.length)}개`,`${fmt(rows.length)} placements`):'';
  /* 매체별 광고비 */
  const byM=new Map();
  const NOM=L('(매체 없음)','(no media)');
  rows.forEach(r=>{const m=String(r.media||'').trim()||NOM;const o=byM.get(m)||{m,cost:0,n:0};o.cost+=tvNum(r.cost);o.n++;byM.set(m,o);});
  const ms=[...byM.values()].sort((a,b)=>b.cost-a.cost);
  const mb=$('oohMediaBox');
  if(mb){const mx=Math.max(1,...ms.map(x=>x.cost));
    mb.innerHTML=ms.length?`<div class="oohbars">`+ms.map(x=>`<div class="ob">
        <div class="nm" title="${esc(x.m)}">${esc(x.m)}<span>${L(`지면 ${fmt(x.n)}개`,`${fmt(x.n)} placements`)}</span></div>
        <div class="tr"><i style="width:${(x.cost/mx*100).toFixed(2)}%"></i></div>
        <div class="vv mono">${won0(x.cost)}</div><div class="pc mono">${T.cost?(x.cost/T.cost*100).toFixed(1)+'%':'–'}</div></div>`).join('')+`</div>`
      :`<div class="hint" style="padding:14px;text-align:center">${L('매체별로 모을 데이터가 아직 없습니다.','No data to group by media yet.')}</div>`;}
  /* 집행 지면 — 입력 표에서 보이는 열 그대로(설정 › 열 설정을 따른다) + 일정 막대 · 비중 */
  const tb=$('oohTbl');
  if(tb){
    const cols=tblCols('ooh').filter(c=>c.k!=='days');
    const t0=T.start,t1=T.end,span=(t0&&t1)?oohDays({start:t0,end:t1}):NaN;
    const pos=d=>isFinite(span)&&ISO_D.test(d||'')?Math.max(0,Math.min(1,(oohDays({start:t0,end:d})-1)/span)):NaN;
    const tpos=(t0&&t1&&today>=t0&&today<=t1)?(oohDays({start:t0,end:today})-0.5)/span:NaN;
    const list=rows.slice();
    const mOrder=new Map(ms.map((x,i)=>[x.m,i]));
    const mk=r=>String(r.media||'').trim()||NOM;
    if(OOH_SORT&&OOH_SORT.dir){const c=OOH_SORT.k;
      const val=r=>c==='share'||c==='cost'?tvNum(r.cost):c==='days'||c==='sched'?(oohDays(r)||0):c==='st'?({live:0,pre:1,done:2}[oohStatus(r,today)]??3):String(r[c]==null?'':r[c]);
      list.sort((a,b)=>hpCmp(val(a),val(b),OOH_SORT.dir));}
    else list.sort((a,b)=>(mOrder.get(mk(a))-mOrder.get(mk(b)))||String(a.start||'').localeCompare(String(b.start||''))||tvNum(b.cost)-tvNum(a.cost));
    const group=!(OOH_SORT&&OOH_SORT.dir);
    const head=[];
    cols.forEach(c=>{
      if(c.k==='start'||c.k==='end'){if(!head.some(h=>h.k==='period'))head.push({k:'period',l:L('게재 기간','Flight')});return;}
      if(c.k==='cost'){head.push({k:'cost',l:c.l,num:1},{k:'share',l:L('비중','Share'),num:1});return;}
      head.push({k:c.k,l:c.l,num:c.type==='num'});});
    /* 일정 막대는 기간 바로 뒤 */
    const pi=head.findIndex(h=>h.k==='period');
    if(pi>=0)head.splice(pi+1,0,{k:'sched',l:L('일정','Schedule')},{k:'st',l:L('상태','Status')});
    const cell=(h,r,i,span2)=>{
      const v=r[h.k];
      if(h.k==='media')return group?(span2?`<td class="head" rowspan="${span2}">${esc(mk(r))}</td>`:''):`<td class="head">${esc(mk(r))}</td>`;
      if(h.k==='period')return `<td class="mono nowrap">${ISO_D.test(r.start||'')?mdy(r.start):'–'} ~ ${ISO_D.test(r.end||'')?mdy(r.end):'–'}${isFinite(oohDays(r))?`<span class="dd">${L(fmt(oohDays(r))+'일',fmt(oohDays(r))+'d')}</span>`:''}</td>`;
      if(h.k==='sched'){const a=pos(r.start),b=pos(r.end);
        return `<td class="sched"><div class="otl">${isFinite(a)&&isFinite(b)?`<i style="left:${(a*100).toFixed(2)}%;width:${Math.max((b-a)*100+100/span,1.2).toFixed(2)}%"></i>`:''}${isFinite(tpos)?`<b style="left:${(tpos*100).toFixed(2)}%"></b>`:''}</div></td>`;}
      if(h.k==='st'){const s=oohStatus(r,today);return `<td>${s?`<span class="ost ${s}">${OOH_ST[s]}</span>`:'–'}</td>`;}
      if(h.k==='cost')return `<td class="mono">${won0(tvNum(v))}</td>`;
      if(h.k==='share')return `<td class="mono">${T.cost&&tvNum(r.cost)?(tvNum(r.cost)/T.cost*100).toFixed(1)+'%':'–'}</td>`;
      if(h.k==='cr'){const ns=oohCrNames(r);if(!ns.length)return '<td>–</td>';
        return `<td class="ocr">`+ns.map(n=>{const c=oohCrOf(n);
          return c&&c.img?`<button type="button" class="othumb" data-ocb="${esc(c.id)}" title="${esc(c.name)} — ${L('크게 보기','enlarge')}"><img src="${c.img}" alt=""><span>${esc(c.name)}</span></button>`
            :`<span class="oname">${esc(n)}</span>`;}).join('')+`</td>`;}
      if(h.num)return `<td class="mono">${v===''||v==null?'–':fmt(tvNum(v))}</td>`;
      return `<td class="${h.k==='slot'?'head ':''}tl">${v===''||v==null?'–':esc(v)}</td>`;};
    let h=`<thead><tr>${head.map(x=>`<th${x.num?' class="num"':''}>${x.l}</th>`).join('')}</tr></thead><tbody>`;
    if(list.length){
      let i=0;
      while(i<list.length){
        let j=i;if(group)while(j+1<list.length&&mk(list[j+1])===mk(list[i]))j++;
        /* 매체 칸은 소계 줄까지 덮는다 */
        for(let q=i;q<=j;q++)h+=`<tr>${head.map(x=>cell(x,list[q],q,q===i?(j-i+1+(j>i?1:0)):0)).join('')}</tr>`;
        if(group&&j>i){const sub=list.slice(i,j+1);const sc=sum(sub.map(r=>tvNum(r.cost)));
          h+=`<tr class="sub">${head.map(x=>x.k==='media'?'':x.k==='slot'?`<td class="head tl">${L(esc(mk(list[i]))+' 소계',esc(mk(list[i]))+' subtotal')}</td>`
            :x.k==='cost'?`<td class="mono">${won0(sc)}</td>`:x.k==='share'?`<td class="mono">${T.cost?(sc/T.cost*100).toFixed(1)+'%':'–'}</td>`:'<td></td>').join('')}</tr>`;}
        i=j+1;}
      h+=`<tr class="total">${head.map((x,qi)=>qi===0?`<td class="head">TOTAL</td>`:x.k==='cost'?`<td class="mono">${won0(T.cost)}</td>`
        :x.k==='share'?`<td class="mono">100.0%</td>`:x.k==='period'?`<td class="mono nowrap">${T.start?mdy(T.start)+' ~ '+mdy(T.end):''}</td>`:'<td></td>').join('')}</tr>`;
    }else h+=`<tr><td colspan="${head.length}" class="hint" style="padding:22px;text-align:center">${L('OOH 계획이 아직 없습니다.','No OOH plan yet.')}</td></tr>`;
    tb.innerHTML=h+'</tbody>';
    tb.querySelectorAll('[data-ocb]').forEach(b=>b.onclick=()=>oohCrBig(OOH_CR.find(c=>c.id===b.dataset.ocb)));
    const ths=[...tb.tHead.rows[0].cells];
    wireHeadPops(head.map((x,i)=>({th:ths[i],k:x.k,label:x.l,sortable:x.k!=='sched'})),{cur:OOH_SORT,scope:'ooh',
      onSort:(k,d)=>{OOH_SORT=d?{k:k==='period'?'start':k,dir:d}:null;renderOohDash();}});}
  /* 소재 */
  const cg=$('oohCrs'),cn=$('oohCrNote');
  if(cn)cn.textContent=OOH_CR.length?L(`${fmt(OOH_CR.length)}개 · 누르면 크게 봅니다`,`${fmt(OOH_CR.length)} · click to enlarge`):'';
  if(cg){
    cg.innerHTML=OOH_CR.length?OOH_CR.map(c=>{const use=oohCrUse(c);
      const where=use.map(r=>[String(r.media||'').trim(),String(r.slot||'').trim()].filter(Boolean).join(' · ')).filter(Boolean);
      return `<button type="button" class="oohcr view" data-ocb="${esc(c.id)}">
        <div class="ph">${c.img?`<img src="${c.img}" alt="">`:`<span>${L('이미지 없음','No image')}</span>`}</div>
        <div class="bd"><b>${esc(c.name)}</b><span class="hint">${where.length?esc(where.slice(0,3).join(' / '))+(where.length>3?L(` 외 ${where.length-3}곳`,` +${where.length-3} more`):''):L('지면 미연결','Not linked to a placement')}</span></div></button>`;}).join('')
      :`<div class="hint oohnocr">${L('올린 소재가 없습니다.','No creatives uploaded.')}<span class="agency-only"> ${L('<b>OOH › 예상효율 입력</b> 아래에서 소재 이미지를 올릴 수 있습니다.','You can upload creative images under <b>OOH › Forecast input</b>.')}</span></div>`;
    cg.querySelectorAll('[data-ocb]').forEach(b=>b.onclick=()=>oohCrBig(OOH_CR.find(c=>c.id===b.dataset.ocb)));
    try{if(isClient())cg.querySelectorAll('.agency-only').forEach(x=>x.classList.add('hidden'));}catch(e){}}
  /* 비어 있으면 어디서 넣는지 */
  const em=$('oohEmpty');
  if(em){const none=!rows.length&&!OOH_CR.length;
    em.classList.toggle('hidden',!none);
    em.innerHTML=none?`<div class="notice"><span>ⓘ</span><div>${L(
      `OOH 데이터가 아직 없습니다. <b>OOH › 예상효율 입력</b>에 매체 · 지면 · 지면 정보 · 게재 기간 · 광고비를 적고 소재 이미지를 올리면 여기에 모입니다.`,
      `No OOH data yet. Enter media · placement · details · period · ad spend in <b>OOH › Forecast input</b> and upload creative images — they'll be gathered here.`)}
      <span class="agency-only"><button class="btn sm" id="oohGoPlan">${L('OOH 예상효율 입력으로','Go to OOH forecast input')}</button></span></div></div>`:'';
    const gp=$('oohGoPlan');if(gp)gp.onclick=()=>switchTab('oohplan');
    try{if(isClient())em.querySelectorAll('.agency-only').forEach(x=>x.classList.add('hidden'));}catch(e){}}
}
function renderOOH(){
  try{renderTvTable('ooh');}catch(e){console.warn(e);}
  try{renderOohCrEdit();}catch(e){console.warn(e);}
  try{renderOohDash();}catch(e){console.warn(e);}}
/* 문서에 담기 · 되살리기 — serializeDoc / applyDoc 이 부른다 */
function oohForDoc(){return {plan:OOH_PLAN.map(r=>({...r})),cr:OOH_CR.map(c=>({...c}))};}
function oohFromDoc(d){
  const o=d&&d.ooh;
  OOH_PLAN=Array.isArray(o&&o.plan)?o.plan.map(r=>({...r})):[];
  OOH_CR=Array.isArray(o&&o.cr)?o.cr.filter(c=>c&&typeof c==='object').map(c=>({id:c.id||('oc'+Math.random().toString(36).slice(2,9)),name:String(c.name||'소재'),img:c.img||''})):[];
  OOH_SORT=null;}

/* ---------- 연결 ---------- */
(function initOOH(){
  const go=()=>{
    const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn;};
    on('oohPlanAdd',()=>tvAddRow('ooh'));on('oohPlanAdd2',()=>tvAddRow('ooh'));
    on('oohPlanWipe',()=>tvWipe('ooh'));on('oohPlanUp',()=>tvImport('ooh'));
    on('oohCrAdd',()=>oohImgPick(oohAddFiles,true));
    on('oohPlanCols',()=>openColSettings('ooh'));
    renderOOH();};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();
