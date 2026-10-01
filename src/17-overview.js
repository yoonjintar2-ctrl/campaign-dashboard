
/* ===== 17. 전체 캠페인 (v81) =====
   같은 광고주의 모든 캠페인을 한 화면에 — 광고비(예산 · 집행)와 디지털 · TV · OOH 캠페인 목록, 타임라인.
   · 지금 캠페인은 화면의 값(저장 전 변경 포함)으로, 다른 캠페인은 서버에 저장된 값으로 계산한다
   · 시행사(로그인) — overview_by_code RPC(있으면) → 없으면 내가 볼 수 있는 캠페인을 직접 읽는다
   · 광고주(뷰어 코드) — overview_by_code RPC 만. 그 캠페인에서 이 메뉴를 광고주에게 보이게 켠 경우에만 서버가 돌려준다
   · 같은 광고주 = 광고주 이름이 같은 캠페인(대소문자 · 앞뒤 공백 무시)
   설정 › 메뉴 설정에서 캠페인마다 켜고 끄며, 광고주에게는 기본으로 숨겨 둔다(MENUS vdef:false). */

var OV={key:'',at:0,rows:null,busy:false,src:'',err:'',seq:0};
const OV_AREAS=[{k:'digital',get l(){return L('디지털','Digital');}},{k:'tv',l:'TV'},{k:'ooh',l:'OOH'}];
const ovIso=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'');
const ovNorm=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();

/* 이 캠페인의 전체 기간 — 켜 둔 영역(디지털 라인 · TV 방송일 · OOH 게재일)을 모두 본다 */
function campPeriodAll(){
  const md=campMedia(),ds=[],de=[];
  if(md.digital)(LINES||[]).forEach(l=>{if(ovIso(l.start))ds.push(l.start);if(ovIso(l.end))de.push(l.end);});
  if(md.tv)(TV_SPOTS||[]).forEach(r=>{if(ovIso(r.date)){ds.push(r.date);de.push(r.date);}});
  if(md.ooh)(OOH_PLAN||[]).forEach(r=>{if(ovIso(r.start))ds.push(r.start);if(ovIso(r.end))de.push(r.end);});
  ds.sort();de.sort();
  return {start:ds[0]||'',end:de[de.length-1]||''};}

/* 저장된 문서 조각 → 캠페인 한 줄 */
function ovRow(p){
  const m=p.media||{};
  const md=(m.digital||m.tv||m.ooh)?{digital:!!m.digital,tv:!!m.tv,ooh:!!m.ooh}:{digital:true,tv:false,ooh:false};
  const lines=Array.isArray(p.lines)?p.lines:[];
  const tvp=Array.isArray(p.tv&&p.tv.plan)?p.tv.plan:[],tvs=Array.isArray(p.tv&&p.tv.spots)?p.tv.spots:[];
  const oo=Array.isArray(p.ooh)?p.ooh:[];
  /* 예산 — 예전 저장본(net 기준)은 net 을 그대로 (수수료 0) */
  const lb=l=>{const g=l&&l.gross;return Math.round((g===undefined||g===null||g==='')?(+l.net||0):(+g||0))||0;};
  const TP=tvPlanTotal(tvp),TA=tvSpotTotal(tvs),O=oohTotal(oo);
  const per=(s,e)=>{s=s.filter(ovIso).sort();e=e.filter(ovIso).sort();return {start:s[0]||'',end:e[e.length-1]||''};};
  const dP=per(lines.map(l=>l.start),lines.map(l=>l.end));
  const tD=tvs.map(r=>r.date);const tP=per(tD,tD);
  const a={
    digital:{on:md.digital,budget:sum(lines.map(lb)),spend:Math.round(+p.net||0),imp:+p.imp||0,click:+p.click||0,view:+p.view||0,
      n:lines.length,...dP},
    tv:{on:md.tv,plan:Math.round(TP.amt||0),spend:Math.round(TA.cost||0),pgrp:TP.grp||0,grp:TA.grp||0,n:tvp.length+tvs.length,...tP},
    ooh:{on:md.ooh,budget:Math.round(O.cost||0),slots:O.n,media:O.media,n:oo.length,start:O.start,end:O.end}};
  a.digital.has=a.digital.n>0||a.digital.spend>0;
  a.tv.budget=a.tv.plan>0?a.tv.plan:a.tv.spend;          /* 계획이 없으면 집행 광고비를 광고비로 */
  a.tv.has=a.tv.n>0;
  a.ooh.has=a.ooh.n>0;
  const any=OV_AREAS.some(x=>a[x.k].on&&a[x.k].has);
  /* 목록에 넣을 영역 — 켜 둔 영역 중 데이터가 있는 것 (아무 데이터도 없으면 켜 둔 영역 그대로) */
  OV_AREAS.forEach(x=>{a[x.k].inc=a[x.k].on&&(a[x.k].has||!any);});
  const S=[],E=[];
  OV_AREAS.forEach(x=>{if(a[x.k].inc){if(a[x.k].start)S.push(a[x.k].start);if(a[x.k].end)E.push(a[x.k].end);}});
  if(!S.length&&ovIso(p.start_date))S.push(p.start_date);
  if(!E.length&&ovIso(p.end_date))E.push(p.end_date);
  S.sort();E.sort();
  const budget=sum(OV_AREAS.map(x=>a[x.k].inc?a[x.k].budget:0));
  return {id:p.id||null,code:p.code||'',name:p.name||'(이름 없음)',self:!!p.self,updated:p.updated_at||'',
    start:S[0]||'',end:E[E.length-1]||'',a,budget};}
/* 지금 캠페인 — 화면의 값 그대로 */
function ovSelfRow(){
  let net=0,imp=0,click=0,view=0;
  (FACTS||[]).forEach(f=>{net+=+f.cost||0;imp+=+f.imp||0;click+=+f.click||0;view+=+f.view||0;});
  return ovRow({id:(CLOUD&&CLOUD.campaign&&CLOUD.campaign.id)||'self',name:CAMPAIGN.name,self:true,media:campMedia(),
    lines:LINES,tv:{plan:TV_PLAN,spots:TV_SPOTS},ooh:OOH_PLAN,net,imp,click,view,updated_at:new Date().toISOString()});}
function ovStatus(r,today){
  if(!r.start||!r.end)return '';
  return today<r.start?'pre':today>r.end?'done':'live';}
const OV_ST={get live(){return L('진행 중','Live');},get pre(){return L('예정','Upcoming');},get done(){return L('종료','Ended');}};

/* 샘플 화면 — 같은 광고주의 예시 캠페인 셋 */
function ovDemoRows(){
  const y=String(CAMPAIGN.today||'2026').slice(0,4);
  const mk=(name,md,o)=>ovRow({name,media:md,...o});
  return [
    mk(L(`${y} 상반기 신제품 런칭`,`${y} H1 new product launch`),{digital:true,tv:true},{
      lines:[{gross:420000000,start:`${y}-03-02`,end:`${y}-04-30`}],net:417800000,imp:96500000,click:412000,view:21800000,
      tv:{plan:[{ch:'KBS2',cnt:40,price:9500000,rating:5.2},{ch:'SBS',cnt:36,price:8800000,rating:4.6}],
          spots:[{date:`${y}-03-04`,ch:'KBS2',cnt:39,cost:370000000,rating:5.0},{date:`${y}-04-28`,ch:'SBS',cnt:36,cost:316000000,rating:4.7}]}}),
    mk(L(`${y} 여름 시즌 옥외광고`,`${y} summer OOH`),{ooh:true},{
      ooh:[{media:'포커스미디어',slot:'강남 오피스 엘리베이터',start:`${y}-06-15`,end:`${y}-08-31`,cost:62000000},
           {media:'제일기획 OOH',slot:'코엑스 K-POP 스퀘어',start:`${y}-07-01`,end:`${y}-07-31`,cost:85000000},
           {media:'나스미디어',slot:'지하철 2호선 스크린도어',start:`${y}-06-15`,end:`${y}-08-15`,cost:33000000}]}),
    mk(L(`${y} 연말 브랜드 캠페인`,`${y} year-end brand campaign`),{tv:true,ooh:true},{
      tv:{plan:[{ch:'MBC',cnt:50,price:10500000,rating:5.5},{ch:'tvN',cnt:60,price:6200000,rating:2.8}],spots:[]},
      ooh:[{media:'포커스미디어',slot:'수도권 아파트 엘리베이터',start:`${y}-11-16`,end:`${y}-12-31`,cost:120000000}],
      start_date:`${y}-11-16`,end_date:`${y}-12-31`})];}

/* ---------- 불러오기 ---------- */
function ovKey(){
  const c=(CLOUD&&CLOUD.campaign&&CLOUD.campaign.id)||'';
  return [CLOUD&&CLOUD.sample?'S':'',CLOUD&&CLOUD.shareView?'V':'',c,ovNorm(CAMPAIGN.advertiser)].join('|');}
function ovDemoMode(){
  try{return !CLOUD.on||CLOUD.sample||(CLOUD.shareView&&(CLOUD.shareCode===SAMPLE_VIEW_CODE||CLOUD.shareCode===SAMPLE_CODE))
    ||!(CLOUD.campaign&&CLOUD.campaign.id);}catch(e){return true;}}
const ovNoFn=e=>!!e&&/PGRST202|could not find the function|does not exist|schema cache/i.test(String(e.code||'')+' '+String(e.message||''));
async function ovFetch(){
  if(ovDemoMode())return {rows:ovDemoRows(),src:'demo'};
  const selfId=CLOUD.campaign.id;
  /* ① 서버 함수 — 광고주 화면과 같은 규칙 */
  const code=CLOUD.shareView?CLOUD.shareCode
    :(CLOUD.campaign.share_code||((CLOUD.list||[]).find(x=>x.id===selfId)||{}).share_code||'');
  let rpcErr=null;
  if(code){
    try{const {data,error}=await withTimeout(CLOUD.sb.rpc('overview_by_code',{p_code:code}),20000,'전체 캠페인');
      if(!error&&Array.isArray(data))return {rows:data.map(d=>ovRow({...d,self:d.is_self})),src:'rpc'};
      rpcErr=error;}catch(e){rpcErr={message:String(e&&e.message||e)};}}
  /* ② 시행사 — 내가 볼 수 있는 캠페인을 직접 */
  if(CLOUD.user&&!CLOUD.shareView){
    const adv=ovNorm(CAMPAIGN.advertiser);
    const ids=[...new Set((CLOUD.list||[]).filter(c=>adv&&ovNorm(c.advertiser)===adv).map(c=>c.id).concat([selfId]))];
    const {data,error}=await withTimeout(CLOUD.sb.from('campaigns')
      .select('id,name,start_date,end_date,updated_at,media:doc->campaign->media,lines:doc->lines,tv:doc->tv,ooh:doc->ooh->plan')
      .in('id',ids),20000,'전체 캠페인');
    if(error)return {rows:null,err:error.message};
    const agg={};
    for(let from=0;from<50000;from+=1000){
      const {data:st,error:e2}=await withTimeout(CLOUD.sb.from('daily_stats').select('campaign_id,net,imp,click,view')
        .in('campaign_id',ids).range(from,from+999),20000,'전체 캠페인 실적');
      if(e2)break;
      (st||[]).forEach(r=>{const o=agg[r.campaign_id]||(agg[r.campaign_id]={net:0,imp:0,click:0,view:0});
        o.net+=+r.net||0;o.imp+=+r.imp||0;o.click+=+r.click||0;o.view+=+r.view||0;});
      if(!st||st.length<1000)break;}
    return {rows:(data||[]).map(d=>ovRow({...d,...(agg[d.id]||{}),self:d.id===selfId})),src:'direct',
      rpcMissing:ovNoFn(rpcErr)};}
  /* ③ 광고주 화면인데 서버 함수가 없거나 막혀 있다 — 이 캠페인만 */
  return {rows:[],src:'none',err:rpcErr?(ovNoFn(rpcErr)?'nofn':rpcErr.message):''};}
function ovLoad(force){
  const key=ovKey();
  if(!force&&OV.key===key&&OV.rows&&Date.now()-OV.at<5*60*1000)return Promise.resolve();
  const seq=++OV.seq;OV.busy=true;OV.key=key;
  return ovFetch().then(r=>{if(seq!==OV.seq)return;
      OV.rows=r.rows||[];OV.src=r.src;OV.err=r.err||'';OV.rpcMissing=!!r.rpcMissing;OV.at=Date.now();})
    .catch(e=>{if(seq!==OV.seq)return;OV.rows=[];OV.src='none';OV.err=String(e&&e.message||e);OV.at=Date.now();})
    .finally(()=>{if(seq===OV.seq)OV.busy=false;});}

/* ---------- 그리기 ---------- */
function renderOverview(force){
  const box=$('ovKpis');if(!box)return;
  const need=force||OV.key!==ovKey()||!OV.rows||Date.now()-OV.at>5*60*1000;
  if(need&&!OV.busy){
    if(!OV.rows||OV.key!==ovKey())paintOverview(true);
    ovLoad(true).then(()=>{const t=$('tab-overview');if(t&&!t.classList.contains('hidden'))paintOverview();});
    return;}
  paintOverview(OV.busy&&!OV.rows);}
function paintOverview(loading){
  const box=$('ovKpis');if(!box)return;
  const today=CAMPAIGN.today||iso(new Date());
  /* 지금 캠페인은 늘 화면 값으로 바꿔 끼운다 */
  const others=(OV.rows||[]).filter(r=>!r.self&&!(CLOUD&&CLOUD.campaign&&r.id&&r.id===CLOUD.campaign.id));
  const rows=others.concat([ovSelfRow()]).sort((a,b)=>(a.start||'9999').localeCompare(b.start||'9999')||a.name.localeCompare(b.name));
  const adv=CAMPAIGN.advertiser||'';
  const won0=v=>isFinite(v)&&v?won(Math.round(v)):'–';
  const pc1=v=>isFinite(v)?(v*100).toFixed(1)+'%':'–';
  /* 머리줄 */
  const S=rows.map(r=>r.start).filter(Boolean).sort(),E=rows.map(r=>r.end).filter(Boolean).sort();
  const st={live:0,pre:0,done:0};rows.forEach(r=>{const s=ovStatus(r,today);if(s)st[s]++;});
  const it=(k,v)=>`<div class="it"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const bar=$('ovBar');
  if(bar)bar.innerHTML=it(L('광고주','Advertiser'),esc(adv||L('(광고주 없음)','(no advertiser)')))
    +it(L('캠페인','Campaigns'),L(`${fmt(rows.length)}개`,fmt(rows.length)))
    +it(L('전체 기간','Overall period'),S.length?`${S[0].replace(/-/g,'.')} – ${E[E.length-1].replace(/-/g,'.')}`:'–')
    +it(L('진행 중','Live'),L(`${fmt(st.live)}개`,fmt(st.live))+(st.pre?` <span class="ovsm">${L(`예정 ${fmt(st.pre)}`,`upcoming ${fmt(st.pre)}`)}</span>`:''));
  /* 안내 */
  const msg=$('ovMsg');
  if(msg){let h='';
    const ag=!(typeof isClient==='function'&&isClient());
    if(loading)h=`<div class="hint ovload">${L('다른 캠페인을 불러오는 중…','Loading other campaigns…')}</div>`;
    else if(OV.src==='demo'&&!(CLOUD&&CLOUD.campaign&&CLOUD.campaign.id))h=`<div class="notice"><span>ⓘ</span><div>${L('샘플 화면입니다 — 지금 캠페인 말고는 <b>예시 캠페인</b>입니다.','This is a sample — other than the current campaign, these are <b>example campaigns</b>.')}</div></div>`;
    else if(ag&&OV.rpcMissing)h=`<div class="notice"><span>ⓘ</span><div>${L(
      '광고주(뷰어) 화면에서도 이 메뉴가 보이게 하려면 Supabase › SQL Editor 에서 <b>supabase/2026-10-01_advertiser_access.sql</b> 을 한 번 실행해 주세요. 지금은 시행사 화면에서만 다른 캠페인이 보입니다.',
      'To show this menu on the advertiser (viewer) screen too, run <b>supabase/2026-10-01_advertiser_access.sql</b> once in Supabase › SQL Editor. For now, other campaigns appear only on the agency screen.')}</div></div>`;
    else if(OV.err&&OV.src!=='demo')h=`<div class="notice"><span>ⓘ</span><div>${L('다른 캠페인 정보를 불러오지 못해 지금 캠페인만 보입니다.','Couldn\'t load other campaigns, so only the current campaign is shown.')}${ag&&OV.err!=='nofn'?` <span class="hint">(${esc(OV.err)})</span>`:''}</div></div>`;
    msg.innerHTML=h;msg.classList.toggle('hidden',!h);}
  /* 광고비 카드 */
  const tot={};OV_AREAS.forEach(x=>{const rs=rows.filter(r=>r.a[x.k].inc);
    tot[x.k]={n:rs.length,budget:sum(rs.map(r=>r.a[x.k].budget)),spend:sum(rs.map(r=>r.a[x.k].spend||0)),
      slots:sum(rs.map(r=>r.a[x.k].slots||0))};});
  const all=sum(OV_AREAS.map(x=>tot[x.k].budget));
  /* 소진율 — 실적이 들어오는 디지털 · TV 만 (OOH 는 실적 입력이 없다) */
  const sb=tot.digital.budget+tot.tv.budget,sp=tot.digital.spend+tot.tv.spend;
  const shr=k=>all?tot[k].budget/all:NaN;
  const Bn=v=>`<b class="mono">${fmt(v)}</b>`;
  /* v84 — 총 광고비: 큰 도넛. 비중(%)은 도넛 조각 안에, 이름은 아래 범례에만, 가운데 구멍에 총 광고비 · 집행 · 소진율.
     매체 카드: 큰 단색 아이콘 + 막대 하나 — 아래 왼쪽 집행금액 · 오른쪽 잔여금액 · 가운데 작은 회색 소진율.
     OOH 는 실적이 없어 막대가 집행 기간(시작~종료 중 지난 비율) */
  const donut=()=>{
    const CX=120,R=92,SW=25,C=2*Math.PI*R;let acc=0;
    const live=OV_AREAS.filter(x=>tot[x.k].budget>0);
    const segs=live.map(x=>{const f=tot[x.k].budget/all,len=f*C,off=acc;acc+=len;
      return `<circle r="${R}" cx="${CX}" cy="${CX}" fill="none" stroke="var(--ov-${x.k})" stroke-width="${SW}"
        stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" data-ovpie="${x.k}"></circle>`;}).join('');
    /* 조각 안의 % — 작은 조각(5% 미만)은 고리 바깥에 */
    let a0=0;
    const labs=live.map(x=>{const f=tot[x.k].budget/all,mid=(a0+f/2)*2*Math.PI-Math.PI/2;a0+=f;
      const out=f<0.05,r=out?R+SW/2+13:R;
      const tx=CX+r*Math.cos(mid),ty=CX+r*Math.sin(mid)+4;
      return `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" class="dp${out?' out':' in-'+x.k[0]}">${(f*100).toFixed(f<0.1?1:0)}%</text>`;}).join('');
    /* 가운데 구멍 폭에 맞춰 글자 크기를 줄인다 */
    const fit=(t,base,w)=>Math.min(base,w/(String(t).replace(/<[^>]+>/g,'').length*.56)).toFixed(1);
    const t3=`${L('집행','Spent')} ${won0(sp)}`;
    const t4=(sb?L(`소진 ${pc1(sp/sb)}`,`${pc1(sp/sb)} spent`)+' · ':'')+L(`캠페인 ${fmt(rows.length)}개`,`${fmt(rows.length)} campaigns`);
    return `<div class="kdonut2"><svg viewBox="0 0 240 240" width="246" height="246" role="img">
        <circle r="${R}" cx="${CX}" cy="${CX}" fill="none" stroke="var(--line2)" stroke-width="${SW}"></circle>
        <g transform="rotate(-90 ${CX} ${CX})">${segs}</g>${labs}
        <text x="${CX}" y="${CX-27}" text-anchor="middle" class="dc1">${L('총 광고비','Total ad spend')}</text>
        <text x="${CX}" y="${CX-3}" text-anchor="middle" class="dc2" style="font-size:${Math.min(18,148/(won0(all).length*.6)).toFixed(1)}px">${won0(all)}</text>
        <text x="${CX}" y="${CX+19}" text-anchor="middle" class="dc3" style="font-size:${fit(t3,10.5,140)}px">${t3}</text>
        <text x="${CX}" y="${CX+36}" text-anchor="middle" class="dc4" style="font-size:${fit(t4,10,126)}px">${t4}</text></svg>
      <div class="klegend2">${OV_AREAS.map(x=>`<span class="${tot[x.k].budget?'':'zero'}" data-ovpie="${x.k}"><i class="ovdot ${x.k[0]}"></i>${x.l}</span>`).join('')}</div></div>`;};
  /* v86 — 매체 아이콘: 단색 선, 굵게. 디지털은 휴대폰이 모니터 앞에 오고(흰 바탕으로 덮음) 둘 사이에 틈을 둔다 */
  const ICON={
    digital:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="8" width="31" height="21" rx="2.5"/><path d="M14 37h12M20 29v8"/><rect class="cut" x="29.5" y="16.5" width="14" height="25" rx="3.2"/><rect class="fg" x="29.5" y="16.5" width="14" height="25" rx="3.2"/><path d="M34.5 37.2h4"/></svg>',
    tv:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="13" width="39" height="26" rx="3.5"/><path d="M17 5.5l7 7.5 7-7.5M15 43.5h18"/><path d="M37 20v5"/></svg>',
    ooh:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="6.5" width="39" height="23" rx="2.5"/><path d="M15 29.5v13M33 29.5v13M9 42.5h30M11.5 14h15M11.5 21h9"/></svg>'};
  const gauge=(ratio,l1,v1,mid,l2,v2)=>`<div class="kbar">${isFinite(ratio)?`<i style="width:${(Math.min(Math.max(ratio,0),1)*100).toFixed(2)}%"></i>`:''}</div>
    <div class="kfoot"><div class="kf l"><span>${l1}</span><b class="mono">${v1}</b></div>
      <div class="kf r"><span>${l2}</span><b class="mono">${v2}</b></div>${mid?`<div class="kf c">${mid}</div>`:''}</div>`;
  /* 매체 줄 카드 — [아이콘] [이름 · 비중 / 금액 / 캠페인 수] [막대 + 집행 · 잔여] 가로 한 줄 (좁으면 막대가 아래로) */
  const rowCard=(x,body)=>`<div class="ovk ovm ov${x.k[0]}${tot[x.k].budget?'':' zero'}" data-ovk="${x.k}"><div class="ovri">
      <span class="kic">${ICON[x.k]}</span>
      <div class="kinfo"><div class="kt"><span class="tt">${x.l}</span><span class="kr">${L(`비중 ${pc1(shr(x.k))}`,`share ${pc1(shr(x.k))}`)}</span></div>
        <div class="kv mono">${won0(tot[x.k].budget)}</div><div class="ks">${L(`캠페인 ${Bn(tot[x.k].n)}개`,`${Bn(tot[x.k].n)} campaigns`)}</div></div>
      <div class="kg">${body}</div></div></div>`;
  const spentCard=k=>{const b=tot[k].budget,sv=tot[k].spend;
    return gauge(b?sv/b:NaN,L('집행금액','Spent'),won0(sv),b?L(`소진율 ${pc1(sv/b)}`,`${pc1(sv/b)} spent`):'',L('잔여금액','Remaining'),won0(Math.max(b-sv,0)));};
  /* OOH — 집행 기간 게이지: 가장 이른 시작 ~ 가장 늦은 종료 중 오늘까지 지난 비율 */
  const oohCard=()=>{
    const rs=rows.filter(r=>r.a.ooh.inc);
    const ss=rs.map(r=>r.a.ooh.start||r.start).filter(Boolean).sort(),ee=rs.map(r=>r.a.ooh.end||r.end).filter(Boolean).sort();
    const s0=ss[0],e0=ee[ee.length-1];
    if(!s0||!e0)return gauge(NaN,L('시작일','Start'),'–','',L('종료일','End'),'–');
    const D=x=>new Date(x+'T00:00:00').getTime(),days=Math.round((D(e0)-D(s0))/864e5)+1;
    const done=today<s0?0:today>e0?days:Math.round((D(today)-D(s0))/864e5)+1;
    const rt=days?done/days:NaN;
    return gauge(rt,L('시작일','Start'),s0.replace(/-/g,'.'),
      today<s0?L('집행 전','Not started'):today>e0?L('집행 종료','Ended'):L(`기간 ${pc1(rt)} 경과`,`${pc1(rt)} of flight`),
      L('종료일','End'),e0.replace(/-/g,'.'));};
  /* 총 광고비 → 디지털 · TV · OOH 로 갈라지는 연결선 (파생 관계) */
  const tree=`<div class="ovtree" aria-hidden="true"><i class="tin"></i><i class="tv"></i>
      ${OV_AREAS.map((x,i)=>`<i class="tout t${i} ov${x.k[0]}${tot[x.k].budget?'':' zero'}" data-ovk="${x.k}"></i>`).join('')}</div>`;
  box.innerHTML=
    `<div class="ovk ovall">${all?donut():`<div class="kh"><span class="tt">${L('총 광고비','Total ad spend')}</span></div><div class="kfill"></div><div class="hint">${L('광고비가 아직 없습니다.','No ad spend yet.')}</div>`}</div>`
   +tree
   +`<div class="ovrows">${rowCard(OV_AREAS[0],spentCard('digital'))}${rowCard(OV_AREAS[1],spentCard('tv'))}${rowCard(OV_AREAS[2],oohCard())}</div>`;
  /* 도넛 · 범례에 마우스를 올리면 그 매체 금액 */
  box.querySelectorAll('[data-ovpie]').forEach(el=>{const k=el.dataset.ovpie,x=OV_AREAS.find(a=>a.k===k);
    el.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(x.l)}</div>`
      +`<div class="r"><span class="l">${L('광고비','Ad spend')}</span><b>${won0(tot[k].budget)}</b></div>`
      +`<div class="r"><span class="l">${L('비중','Share')}</span><b>${pc1(all?tot[k].budget/all:0)}</b></div>`
      +`<div class="r"><span class="l">${L('캠페인','Campaigns')}</span><b>${fmt(tot[k].n)}</b></div>`));
    el.addEventListener('mouseleave',hideTip);});
  /* 매체 줄 · 도넛 조각 · 연결선을 함께 강조 */
  const hl=(k,on)=>box.querySelectorAll(`[data-ovk="${k}"],circle[data-ovpie="${k}"]`).forEach(e=>e.classList.toggle('hl',on));
  box.querySelectorAll('.ovm[data-ovk],[data-ovpie]').forEach(el=>{const k=el.dataset.ovk||el.dataset.ovpie;
    el.addEventListener('mouseenter',()=>hl(k,true));el.addEventListener('mouseleave',()=>hl(k,false));});
  const nt=$('ovNote');if(nt)nt.textContent=L('광고비 = 디지털 예산 + TV 계획 금액 + OOH 광고비 · 집행 = 디지털 소진 + TV 방송 광고비','Ad spend = digital budget + TV plan + OOH · Spent = digital spend + TV aired');
  /* 타임라인 */
  const tl=$('ovTimeline');
  if(tl){
    const t0=S[0],t1=E[E.length-1];
    if(!rows.length||!t0||!t1){tl.innerHTML=`<div class="hint" style="padding:14px;text-align:center">${L('기간이 잡힌 캠페인이 없습니다.','No campaigns with dates yet.')}</div>`;}
    else{
      const D=s=>new Date(s+'T00:00:00').getTime();
      /* 달 단위로 맞춰 축을 그린다 */
      const a0=new Date(t0+'T00:00:00');a0.setDate(1);
      const a1=new Date(t1+'T00:00:00');a1.setMonth(a1.getMonth()+1,1);
      const A=a0.getTime(),Z=a1.getTime(),W=Z-A;
      const X=s=>(D(s)-A)/W*100;
      const months=[];for(const d=new Date(a0);d<a1;d.setMonth(d.getMonth()+1))months.push(new Date(d));
      const step=months.length>18?3:months.length>9?2:1;
      const ticks=months.map((d,i)=>{const l=(d.getTime()-A)/W*100;
        const yy=String(d.getFullYear()).slice(2),mo=d.getMonth(),first=mo===0||i===0;
        const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const lb=(i%step===0)?`<span>${L(first?`${yy}년 ${mo+1}월`:`${mo+1}월`,first?`${MON[mo]} '${yy}`:MON[mo])}</span>`:'';
        return `<i style="left:${l.toFixed(3)}%">${lb}</i>`;}).join('');
      const tx=(today>=iso(a0)&&D(today)<Z)?X(today):NaN;
      const row=r=>{
        const segs=OV_AREAS.filter(x=>r.a[x.k].inc&&r.a[x.k].budget>0);
        const bt=sum(segs.map(x=>r.a[x.k].budget));
        let acc=0;const grad=segs.length?segs.map(x=>{const a=acc/bt*100;acc+=r.a[x.k].budget;
          return `var(--ov-${x.k}) ${a.toFixed(2)}% ${(acc/bt*100).toFixed(2)}%`;}).join(','):'var(--line) 0 100%';
        const l=r.start?X(r.start):NaN,w=r.start&&r.end?Math.max(X(r.end)-X(r.start)+(86400000/W*100),0.6):NaN;
        const tags=OV_AREAS.filter(x=>r.a[x.k].inc).map(x=>`<em class="ovtag ${x.k[0]}">${x.l}</em>`).join('');
        const tip=esc(JSON.stringify({n:r.name,p:r.start?`${r.start.replace(/-/g,'.')} – ${r.end.replace(/-/g,'.')}`:'',
          a:OV_AREAS.filter(x=>r.a[x.k].inc).map(x=>[x.l,r.a[x.k].budget]),t:r.budget}));
        /* v82 — 타임라인은 보기만: 이름은 누를 수 없고, '지금 캠페인' · 진행 상태 표시는 뺐다(날짜 축으로 보인다) */
        return `<div class="ovrow">
          <div class="ovl"><span class="ovname">${esc(r.name)}</span><div class="ovsub">${tags}</div></div>
          <div class="ovtrack">${isFinite(l)?`<b class="ovbar" style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%;background:linear-gradient(90deg,${grad})" data-ovtip="${tip}"></b>`:''}</div>
          <div class="ovr mono">${r.budget?manUnit(r.budget):'–'}</div></div>`;};
      tl.innerHTML=`<div class="ovtl"><div class="ovrow axis"><div class="ovl"></div><div class="ovtrack ovaxis">${ticks}</div><div class="ovr">${L('광고비','Ad spend')}</div></div>
        <div class="ovrows">${rows.map(row).join('')}
        <div class="ovgrid"><div class="ovl"></div><div class="ovtrack">${months.map(d=>`<i style="left:${((d.getTime()-A)/W*100).toFixed(3)}%"></i>`).join('')}
          ${isFinite(tx)?`<b class="ovtoday" style="left:${tx.toFixed(3)}%"><span>${L('오늘','Today')}</span></b>`:''}</div><div class="ovr"></div></div></div>
        <div class="ovleg">${OV_AREAS.map(x=>`<span><i class="ovdot ${x.k[0]}"></i>${x.l}</span>`).join('')}</div></div>`;
      tl.querySelectorAll('[data-ovtip]').forEach(b=>{let o=null;try{o=JSON.parse(b.dataset.ovtip);}catch(e){return;}
        b.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(o.n)}</div>`
          +(o.p?`<div class="r"><span class="l">${L('기간','Period')}</span><b>${esc(o.p)}</b></div>`:'')
          +o.a.map(([l,v])=>`<div class="r"><span class="l">${esc(l)}</span><b>${won0(v)}</b></div>`).join('')
          +`<div class="r"><span class="l">${L('합계','Total')}</span><b>${won0(o.t)}</b></div>`));
        b.addEventListener('mouseleave',hideTip);});}}
  /* 매체별 목록 — 캠페인 이름을 누르면 묻고 나서 그 캠페인의 그 매체 서머리로 (v82) */
  const ls=$('ovLists');
  if(ls){
    const per=r=>r.start?`${mdy(r.start)} ~ ${mdy(r.end)}`:'–';
    const stc=r=>{const s=ovStatus(r,today);return s?`<span class="ost ${s}">${OV_ST[s]}</span>`:'–';};
    OV_GO.length=0;
    const nmc=(r,area)=>{const can=ovCanGo(r);let i=-1;if(can){i=OV_GO.length;OV_GO.push({r,area});}
      return `<td class="head tl">${can?`<button type="button" class="ovname lnk" data-ovgo="${i}" title="${L('눌러서 이 캠페인의 서머리로 이동','Click to go to this campaign\'s summary')}">${esc(r.name)}</button>`:`<span class="ovname">${esc(r.name)}</span>`}${r.self?` <em class="ovme">${L('지금','Current')}</em>`:''}</td>`;};
    const sbar=(a,b)=>{const v=b?a/b:NaN;return `<td class="mono ovpct">${isFinite(v)?`<span class="ovmini"><i style="width:${Math.min(Math.max(v,0),1)*100}%"></i></span>${pc1(v)}`:'–'}</td>`;};
    const n0=v=>v?fmt(v):'–';
    const sect=(x,head,body,foot)=>{const rs=rows.filter(r=>r.a[x.k].inc);
      return `<div class="card ovcard"><div class="ovch"><i class="ovdot ${x.k[0]}"></i><b>${L(`${x.l} 캠페인`,`${x.l} campaigns`)}</b>
          <span class="hint">${L(`${fmt(rs.length)}개`,`${fmt(rs.length)}`)}${rs.length?` · ${won0(tot[x.k].budget)}`:''}</span></div>
        ${rs.length?`<div class="tbl-wrap noy"><table class="tbl lite ovtbl"><thead><tr>${head.map(h=>`<th${h[1]?' class="num"':''}>${h[0]}</th>`).join('')}</tr></thead>
          <tbody>${rs.map(r=>`<tr${r.self?' class="self"':''}>${body(r)}</tr>`).join('')}${rs.length>1?`<tr class="total">${foot(rs)}</tr>`:''}</tbody></table></div>`
          :`<div class="hint ovnone">${L(`이 광고주의 ${x.l} 캠페인이 아직 없습니다.`,`No ${x.l} campaigns for this advertiser yet.`)}</div>`}</div>`;};
    const showImp=rows.some(r=>r.a.digital.inc&&(r.a.digital.imp||r.a.digital.click||r.a.digital.view));
    const dg=sect(OV_AREAS[0],[['캠페인'],['상태'],['기간'],['예산',1],[L('집행 금액','Spent'),1],['소진율',1]].concat(showImp?[['노출',1],['클릭',1],['조회',1]]:[]),
      r=>{const d=r.a.digital;return nmc(r,'digital')+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:d.start||r.start,end:d.end||r.end})}</td>`
        +`<td class="mono">${won0(d.budget)}</td><td class="mono">${won0(d.spend)}</td>${sbar(d.spend,d.budget)}`
        +(showImp?`<td class="mono">${n0(d.imp)}</td><td class="mono">${n0(d.click)}</td><td class="mono">${n0(d.view)}</td>`:'');},
      rs=>{const b=sum(rs.map(r=>r.a.digital.budget)),s=sum(rs.map(r=>r.a.digital.spend));
        return `<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(b)}</td><td class="mono">${won0(s)}</td>${sbar(s,b)}`
          +(showImp?['imp','click','view'].map(k=>`<td class="mono">${n0(sum(rs.map(r=>r.a.digital[k])))}</td>`).join(''):'');});
    const tv=sect(OV_AREAS[1],[['캠페인'],['상태'],['기간'],['계획 금액',1],['집행 광고비',1],['소진율',1],[L('계획 GRP','Plan GRP'),1],[L('실적 GRP','Actual GRP'),1]],
      r=>{const t=r.a.tv;return nmc(r,'tv')+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:t.start||r.start,end:t.end||r.end})}</td>`
        +`<td class="mono">${won0(t.plan)}</td><td class="mono">${won0(t.spend)}</td>${sbar(t.spend,t.plan)}`
        +`<td class="mono">${t.pgrp?tvFmt1(t.pgrp):'–'}</td><td class="mono">${t.grp?tvFmt1(t.grp):'–'}</td>`;},
      rs=>{const p=sum(rs.map(r=>r.a.tv.plan)),s=sum(rs.map(r=>r.a.tv.spend));
        const pg=sum(rs.map(r=>r.a.tv.pgrp)),g=sum(rs.map(r=>r.a.tv.grp));
        return `<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(p)}</td><td class="mono">${won0(s)}</td>${sbar(s,p)}`
          +`<td class="mono">${pg?tvFmt1(pg):'–'}</td><td class="mono">${g?tvFmt1(g):'–'}</td>`;});
    const oh=sect(OV_AREAS[2],[['캠페인'],['상태'],['기간'],['광고비',1],['매체',1],[L('지면','Placements'),1]],
      r=>{const o=r.a.ooh;return nmc(r,'ooh')+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:o.start||r.start,end:o.end||r.end})}</td>`
        +`<td class="mono">${won0(o.budget)}</td><td class="mono">${n0(o.media)}</td><td class="mono">${n0(o.slots)}</td>`;},
      rs=>`<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(sum(rs.map(r=>r.a.ooh.budget)))}</td>`
        +`<td class="mono"></td><td class="mono">${n0(sum(rs.map(r=>r.a.ooh.slots)))}</td>`);
    ls.innerHTML=`<div class="ovlists">${dg}${tv}${oh}</div>`;}
  /* 캠페인별 광고비 (v84) — 세로 막대(입체) · 시작한 순서. 막대 하나에 디지털 + TV + OOH 를 쌓는다.
     캠페인 이름은 막대 위에 지그재그(2~3단)로 놓고 가는 선으로 막대와 잇는다 — 긴 이름도 겹치지 않게 */
  const bx=$('ovBars');
  if(bx)paintOvColumns(bx,rows,won0);
  /* 소재 콜라주 (v83) */
  try{paintCollage(rows);}catch(e){console.warn(e);}
  document.querySelectorAll('#tab-overview [data-ovgo]').forEach(b=>b.onclick=()=>{const g=OV_GO[+b.dataset.ovgo];if(g)ovGoAsk(g.r,g.area);});
  const rl=$('ovReload');if(rl)rl.onclick=()=>{OV.at=0;renderOverview(true);};
}
/* ---------- 다른 캠페인 · 매체 서머리로 이동 (v82) ---------- */
var OV_GO=[];
const OV_SUM={digital:'d_sum',tv:'t_sum',ooh:'o_sum'};
/* 갈 수 있는가 — 지금 캠페인은 언제나, 다른 캠페인은 시행사(로그인)면 id 로 · 코드로 들어왔으면 그 광고주 코드로 */
function ovCanGo(r){
  if(r.self)return true;
  try{if(CLOUD.user&&!CLOUD.shareView)return !!r.id;
      if(CLOUD.shareView)return !!r.code;}catch(e){}
  return false;}
function ovGoAsk(r,area){
  const al=(OV_AREAS.find(x=>x.k===area)||{}).l||'';
  let sub='';
  if(!r.self){sub=L('다른 캠페인을 엽니다.','This opens another campaign.');
    try{if(CLOUD.dirty&&CLOUD.user&&CLOUD.role!=='viewer')sub+=' '+L('저장하지 않은 변경은 먼저 저장합니다.','Unsaved changes will be saved first.');}catch(e){}}
  confirmModal(L(`'${r.name}' ${al} 서머리로 이동할까요?`,`Go to the ${al} summary of '${r.name}'?`),sub,()=>ovGo(r,area),L('이동','Go'));}
async function ovGo(r,area){
  const mid=OV_SUM[area];
  const land=()=>{try{if(!goMenu(mid)){const t=areaHome(area);if(tabVisible(t))switchTab(t);}}catch(e){}};
  if(r.self){land();return;}
  if(CLOUD.user&&!CLOUD.shareView&&r.id){
    try{if(CLOUD.dirty&&CLOUD.role!=='viewer')await cloudSave(true);}catch(e){}
    await openCampaign(r.id);}
  else if(CLOUD.shareView&&r.code){
    startBoot();
    let ok=false;try{ok=await tryCode(r.code);}catch(e){}
    if(!ok){endBoot();confirmModal(L('캠페인을 열지 못했습니다.','Couldn\'t open the campaign.'),'',()=>{},L('확인','OK'));return;}}
  else return;
  land();}

/* ---------- 소재 콜라주 (v83) ----------
   같은 광고주 캠페인들의 소재(디지털 소재 · OOH 소재)를 한 상자 안에 모자이크로 깐다.
   이미지가 있으면 이미지(유튜브 링크면 썸네일), 없으면 소재 그라데이션 위에 이름.
   마우스를 올리면 그 소재가 강조되고 어느 캠페인 · 어느 소재인지, 누르면 그 캠페인 서머리로 갈지 묻는다.
   관리자만 보이는 [숨기기] — 소재가 적은 광고주는 꺼 둔다(캠페인 문서 views.ovCollage). */
var OV_COLLAGE=true;
var OVC={key:'',items:null,busy:false,seq:0};
const OVC_MAX=48;
/* 소재 한 벌 → 칸 목록. src = 캠페인 줄(ovRow) */
function ovcTiles(src,crs,oohcr){
  const out=[],seen=new Set();
  const add=(c,area)=>{const nm=String(c&&c.name||'').trim();if(!nm)return;
    const k=area+'\u0001'+nm.toLowerCase();if(seen.has(k))return;seen.add(k);
    out.push({r:src,area,name:nm,img:c.img||'',yt:c.yt||'',g:c.g||'',media:c.media||''});};
  (Array.isArray(crs)?crs:[]).forEach(c=>c&&typeof c==='object'&&add(c,'digital'));
  (Array.isArray(oohcr)?oohcr:[]).forEach(c=>c&&typeof c==='object'&&add(c,'ooh'));
  return out;}
function ovcSelf(selfRow){
  return ovcTiles(selfRow,(CREATIVES||[]).map(c=>({name:c.name,img:c.img,yt:c.yt,g:c.g,media:c.media})),
    campMedia().ooh?(OOH_CR||[]):[]);}
async function ovcFetch(rows){
  const self=rows.find(r=>r.self),others=rows.filter(r=>!r.self);
  if(ovDemoMode()||!others.length)return [];
  const byId=new Map(others.filter(r=>r.id).map(r=>[r.id,r]));
  const code=CLOUD.shareView?CLOUD.shareCode
    :(CLOUD.campaign&&(CLOUD.campaign.share_code||((CLOUD.list||[]).find(x=>x.id===CLOUD.campaign.id)||{}).share_code))||'';
  /* ① 서버 함수 — 광고주 화면과 같은 규칙(전체 캠페인 메뉴를 광고주에게 켠 캠페인) */
  if(code){try{const {data,error}=await withTimeout(CLOUD.sb.rpc('creatives_by_code',{p_code:code}),20000,'소재 콜라주');
      if(!error&&Array.isArray(data)){const out=[];
        data.forEach(d=>{if(d.is_self)return;const r=byId.get(d.id)||others.find(x=>x.name===d.name);if(r)out.push(...ovcTiles(r,d.creatives,d.ooh));});
        return out;}}catch(e){}}
  /* ② 시행사 — 내가 볼 수 있는 캠페인 문서에서 직접 */
  if(CLOUD.user&&!CLOUD.shareView&&byId.size){
    const {data,error}=await withTimeout(CLOUD.sb.from('campaigns').select('id,crs:doc->creatives,oohcr:doc->ooh->cr,media:doc->campaign->media')
      .in('id',[...byId.keys()]),25000,'소재 콜라주');
    if(error)return [];
    const out=[];(data||[]).forEach(d=>{const r=byId.get(d.id);if(r)out.push(...ovcTiles(r,d.crs,(d.media&&d.media.ooh)?d.oohcr:[]));});
    return out;}
  return [];}
function paintCollage(rows){
  const wrap=$('ovCrWrap'),box=$('ovCollage'),tg=$('ovCrTgl'),nt=$('ovCrNote');if(!wrap||!box)return;
  const client=(typeof isClient==='function'&&isClient());
  if(tg){tg.textContent=OV_COLLAGE?L('숨기기','Hide'):L('보이기','Show');
    tg.title=OV_COLLAGE?L('소재가 적으면 콜라주를 숨깁니다 — 광고주 화면에서도 사라집니다','Hide the collage when there are few creatives — it disappears for advertisers too')
      :L('콜라주를 다시 보이게 합니다','Show the collage again');
    tg.onclick=()=>{OV_COLLAGE=!OV_COLLAGE;try{markDirty();saveLocal();}catch(e){}paintCollage(rows);};}
  if(!OV_COLLAGE){
    wrap.classList.toggle('hidden',client);
    if(nt)nt.textContent='';
    box.innerHTML=client?'':`<div class="ovcoff">${L('콜라주를 숨겨 두었습니다 — 광고주 화면에도 보이지 않습니다. 오른쪽 <b>보이기</b>로 다시 켤 수 있습니다.','The collage is hidden — advertisers don\'t see it either. Turn it back on with <b>Show</b> on the right.')}</div>`;
    return;}
  wrap.classList.remove('hidden');
  const key=ovKey()+'|'+rows.filter(r=>!r.self).map(r=>r.id||r.name).join(',');
  const self=rows.find(r=>r.self);
  const draw=()=>{
    const items=ovcSelf(self).concat(OVC.items||[]);
    const nCamp=new Set(items.map(t=>t.r.name)).size;
    if(nt)nt.textContent=items.length?L(`소재 ${fmt(items.length)}개 · 캠페인 ${fmt(nCamp)}개 · 누르면 그 캠페인 서머리로 이동`,`${fmt(items.length)} creatives · ${fmt(nCamp)} campaigns · click to open that campaign's summary`):'';
    if(!items.length){
      if(client){wrap.classList.add('hidden');return;}
      box.innerHTML=`<div class="ovcoff">${OVC.busy?L('소재를 불러오는 중…','Loading creatives…')
        :L('이 광고주의 캠페인에 등록된 소재가 없습니다. 디지털 <b>소재 관리</b>에서 이미지 · 유튜브 링크를, <b>OOH › 예상효율 입력</b>에서 소재 이미지를 올리면 여기에 모입니다.',
          'No creatives in this advertiser\'s campaigns yet. Add images · YouTube links in Digital <b>Creative management</b>, or images in <b>OOH › Forecast input</b>.')}</div>`;return;}
    /* 이미지 있는 소재를 앞으로 — 큰 칸은 이미지가 차지하게 */
    const list=items.slice().sort((a,b)=>((b.img||b.yt)?1:0)-((a.img||a.yt)?1:0));
    const shown=list.slice(0,OVC_MAX),more=list.length-shown.length;
    /* 줄마다 폭을 꽉 채우는 모자이크 — 빈 칸 없이 네모 하나가 된다.
       이미지 소재는 넓게(1.7), 이름만 있는 소재는 1. 한 줄 = 화면 폭에 맞춘 단위 수 */
    const W=Math.max(box.clientWidth||($('tab-overview')||{}).clientWidth||1000,320);
    const U=Math.max(3,Math.round(W/150));
    const wt=(t,i)=>(t.img||t.yt)?(i===0?2.4:1.7):1;
    const rowsL=[];let cur=[],acc=0;
    shown.forEach((t,i)=>{cur.push(i);acc+=wt(t,i);if(acc>=U){rowsL.push(cur);cur=[];acc=0;}});
    if(more>0)cur.push(-1);
    if(cur.length){if(rowsL.length&&cur.reduce((a,i)=>a+(i<0?1:wt(shown[i],i)),0)<U/2)rowsL[rowsL.length-1].push(...cur);else rowsL.push(cur);}
    const HS=[200,138,160,124];
    box.innerHTML=`<div class="ovcol">${rowsL.map((rw,ri)=>`<div class="ocrw" style="height:${HS[ri%HS.length]}px">${rw.map(i=>{
        if(i<0)return `<div class="oct more" style="flex:1 1 0"><b>+${fmt(more)}</b><span>${L('소재 더 있음','more creatives')}</span></div>`;
        const t=shown[i],pic=t.img||t.yt,bg=pic?crBg(t):crGrad(t);
        return `<button type="button" class="oct${pic?'':' noimg'}" data-oct="${i}" style="flex:${wt(t,i)} 1 0;background-image:${bg}">
          ${pic?'':`<span class="ocn">${esc(t.name)}</span>`}<span class="ocb">${esc(t.r.name)}</span></button>`;}).join('')}</div>`).join('')}</div>`;
    box.querySelectorAll('[data-oct]').forEach(el=>{const t=shown[+el.dataset.oct];
      const al=(OV_AREAS.find(x=>x.k===t.area)||{}).l||'';
      const can=ovCanGo(t.r);
      el.classList.toggle('nogo',!can);
      el.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(t.name)}</div>`
        +`<div class="r"><span class="l">${L('캠페인','Campaign')}</span><b>${esc(t.r.name)}</b></div>`
        +`<div class="r"><span class="l">${L('매체','Media')}</span><b>${esc(al+(t.media&&t.area==='digital'?' · '+t.media:''))}</b></div>`
        +(can?`<div class="r"><span class="l"></span><b>${L('누르면 서머리로 이동','Click to open summary')}</b></div>`:'')));
      el.addEventListener('mouseleave',hideTip);
      el.onclick=()=>{hideTip();if(can)ovGoAsk(t.r,t.area);};});};
  if(OVC.key!==key&&!OVC.busy){
    OVC.key=key;OVC.items=null;OVC.busy=true;const seq=++OVC.seq;
    draw();
    ovcFetch(rows).then(items=>{if(seq!==OVC.seq)return;OVC.items=items;})
      .catch(()=>{if(seq===OVC.seq)OVC.items=[];})
      .finally(()=>{if(seq!==OVC.seq)return;OVC.busy=false;const t=$('tab-overview');if(t&&!t.classList.contains('hidden'))draw();});
    return;}
  draw();}

/* ---------- 캠페인별 광고비 — 세로 입체 막대 (v84) ---------- */
var OVCOL_LAST=null;
function paintOvColumns(bx,rows,won0){
  OVCOL_LAST={rows,won0,w:bx.clientWidth};
  if(!rows.length){bx.innerHTML=`<div class="hint" style="padding:14px;text-align:center">${L('캠페인이 없습니다.','No campaigns.')}</div>`;return;}
  const cs=getComputedStyle(bx),pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
  const W=Math.max((bx.clientWidth||($('tab-overview')||{}).clientWidth||1000)-pad,300);
  const YW=52,RP=28,n=rows.length;
  /* 칸이 너무 좁아지면(84px 미만) 좌우로 스크롤 */
  const cellW=Math.max(Math.min((W-YW-RP)/n,220),84);
  const plotW=cellW*n;
  /* 이름은 두 단 지그재그 — 이름 폭이 좌우 이웃 막대의 줄에 닿지 않도록 2칸 폭 이내, 길면 두 줄까지 */
  const LV=2,LH=52,labZ=LV*LH+12,plotH=230,DEP=10;
  /* 바닥판 — 막대가 서 있는 연회색 판(깊이 FD, 앞 두께 SLAB). 막대는 판 깊이의 가운데에 선다.
     x축 선은 판에서 GAP 만큼 띄워 아래에 */
  const FD=22,SLAB=4,GAP=12,off=(FD-DEP)/2;
  const B=labZ+plotH+off,AX=B+SLAB+GAP;
  const mx=Math.max(1,...rows.map(r=>r.budget||0));
  /* 눈금 — 보기 좋은 단위로 4칸 */
  const raw=mx/4,mag=Math.pow(10,Math.floor(Math.log10(raw))),stp=[1,2,2.5,5,10].map(k=>k*mag).find(v=>v>=raw)||raw;
  const top=Math.ceil(mx/stp)*stp,ticks=[];for(let v=0;v<=top+1e-6;v+=stp)ticks.push(v);
  const Y=v=>B-off-v/top*plotH;
  const labW=Math.min(2*cellW-12,300);
  const cols=rows.map((r,i)=>{
    const cx=YW+cellW*i+cellW/2,bw=Math.max(Math.min(cellW*.42,58),14),bl=cx-(bw+DEP)/2;
    const segs=OV_AREAS.filter(x=>r.a[x.k].inc&&r.a[x.k].budget>0);
    const h=r.budget?Math.max(r.budget/top*plotH,3):0;
    const lv=i%LV,lt=lv*LH+2;
    /* 이름은 늘 자기 막대 줄 위 가운데 — 양 끝 캠페인은 폭을 줄여 옆 캠페인의 줄을 덮지 않게 */
    const hw=Math.min(labW/2,cx,YW+plotW+RP-cx),ll=cx-hw,lw=hw*2;
    const tip=esc(JSON.stringify({n:r.name,p:r.start?`${r.start.replace(/-/g,'.')} – ${r.end.replace(/-/g,'.')}`:'',
      a:segs.map(x=>[x.l,r.a[x.k].budget]),t:r.budget}));
    return `<div class="ocl" style="left:${ll.toFixed(1)}px;top:${lt}px;width:${lw.toFixed(1)}px;height:${LH-8}px" data-oci="${i}">
        <b title="${esc(r.name)}">${esc(r.name)}</b><span class="mono">${r.budget?manUnit(r.budget):'–'}</span></div>
      <i class="ocln" style="left:${cx.toFixed(1)}px;top:${lt+LH-5}px;height:${Math.max(Y(r.budget||0)-DEP-(lt+LH-5)-2,0).toFixed(1)}px" data-oci="${i}"></i>
      <div class="ocbar" style="left:${bl.toFixed(1)}px;width:${bw.toFixed(1)}px;top:${(Y(0)-h).toFixed(1)}px;height:${h.toFixed(1)}px" data-ovtip="${tip}" data-oci="${i}">
        ${segs.slice().reverse().map(x=>`<i class="${x.k[0]}" style="flex:${r.a[x.k].budget} 1 0"></i>`).join('')}</div>
      <i class="ocxt" style="left:${cx.toFixed(1)}px;top:${AX}px" data-oci="${i}"></i>
      <div class="ocx mono" style="left:${(cx-cellW/2).toFixed(1)}px;width:${cellW.toFixed(1)}px;top:${AX+8}px" data-oci="${i}">${r.start?mdy(r.start):'–'}</div>`;}).join('');
  const grid=ticks.map(v=>(v?`<i class="ocg" style="top:${Y(v).toFixed(1)}px;left:${YW}px;width:${plotW.toFixed(1)}px"></i>`:'')
      +`<span class="ocy mono" style="top:${(Y(v)-7).toFixed(1)}px;width:${YW-8}px">${v?manUnit(v):'0'}</span>`).join('')
    /* 바닥판(윗면 · 앞 두께 · 옆 두께) + 띄운 x축 */
    +`<i class="ocf" style="left:${YW}px;top:${(B-FD).toFixed(1)}px;width:${plotW.toFixed(1)}px;height:${FD}px"></i>
      <i class="ocfs" style="left:${YW}px;top:${B.toFixed(1)}px;width:${plotW.toFixed(1)}px;height:${SLAB}px"></i>
      <i class="ocfr" style="left:${(YW+plotW).toFixed(1)}px;top:${B.toFixed(1)}px;width:${FD}px;height:${SLAB}px"></i>
      <i class="ocax" style="left:${YW}px;top:${AX.toFixed(1)}px;width:${plotW.toFixed(1)}px"></i>`;
  bx.innerHTML=`<div class="ovcols" style="height:${(AX+30).toFixed(0)}px;width:${(YW+plotW+RP).toFixed(1)}px">${grid}${cols}</div>
    <div class="ovleg">${OV_AREAS.map(x=>`<span><i class="ovdot ${x.k[0]}"></i>${x.l}</span>`).join('')}<span class="ocnote">${L('막대 아래 날짜 = 캠페인 시작일','Date under bar = campaign start')}</span></div>`;
  const C=bx.querySelector('.ovcols');
  bx.querySelectorAll('[data-oci]').forEach(el=>{const i=el.dataset.oci;
    el.addEventListener('mouseenter',()=>C.querySelectorAll(`[data-oci="${i}"]`).forEach(x=>x.classList.add('hl')));
    el.addEventListener('mouseleave',()=>C.querySelectorAll(`[data-oci="${i}"]`).forEach(x=>x.classList.remove('hl')));});
  bx.querySelectorAll('.ocbar[data-ovtip]').forEach(b=>{let o=null;try{o=JSON.parse(b.dataset.ovtip);}catch(e){return;}
    b.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(o.n)}</div>`
      +(o.p?`<div class="r"><span class="l">${L('기간','Period')}</span><b>${esc(o.p)}</b></div>`:'')
      +o.a.map(([l,v])=>`<div class="r"><span class="l">${esc(l)}</span><b>${won0(v)} · ${o.t?((v/o.t)*100).toFixed(1)+'%':''}</b></div>`).join('')
      +`<div class="r"><span class="l">${L('합계','Total')}</span><b>${won0(o.t)}</b></div>`));
    b.addEventListener('mouseleave',hideTip);});
}
/* 창 폭이 바뀌면 막대 폭 · 이름 단수를 다시 계산 */
window.addEventListener('resize',(()=>{let t=0;return ()=>{clearTimeout(t);t=setTimeout(()=>{
  const bx=$('ovBars'),tab=$('tab-overview');
  if(!bx||!OVCOL_LAST||!tab||tab.classList.contains('hidden')||bx.clientWidth===OVCOL_LAST.w)return;
  paintOvColumns(bx,OVCOL_LAST.rows,OVCOL_LAST.won0);},160);};})());
