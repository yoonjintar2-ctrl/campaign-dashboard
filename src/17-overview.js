
/* ===== 17. 전체 캠페인 (v81) =====
   같은 광고주의 모든 캠페인을 한 화면에 — 광고비(예산 · 집행)와 디지털 · TV · OOH 캠페인 목록, 타임라인.
   · 지금 캠페인은 화면의 값(저장 전 변경 포함)으로, 다른 캠페인은 서버에 저장된 값으로 계산한다
   · 시행사(로그인) — overview_by_code RPC(있으면) → 없으면 내가 볼 수 있는 캠페인을 직접 읽는다
   · 광고주(뷰어 코드) — overview_by_code RPC 만. 그 캠페인에서 이 메뉴를 광고주에게 보이게 켠 경우에만 서버가 돌려준다
   · 같은 광고주 = 광고주 이름이 같은 캠페인(대소문자 · 앞뒤 공백 무시)
   설정 › 메뉴 설정에서 캠페인마다 켜고 끄며, 광고주에게는 기본으로 숨겨 둔다(MENUS vdef:false). */

var OV={key:'',at:0,rows:null,busy:false,src:'',err:'',seq:0};
/* c = 색 · 모양 클래스 글자 (v143 — OTT 가 들어와 첫 글자(o)가 OOH 와 겹쳐 따로 둔다) */
const OV_AREAS=[{k:'digital',c:'d',get l(){return L('디지털','Digital');}},{k:'tv',c:'t',l:'TV'},{k:'ott',c:'v',l:'OTT'},{k:'ooh',c:'o',l:'OOH'}];
let OV_VIS=OV_AREAS;
const ovC=k=>(OV_AREAS.find(x=>x.k===k)||{c:'d'}).c;
const ovIso=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'');
const ovNorm=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();

/* 이 캠페인의 전체 기간 — 켜 둔 영역(디지털 라인 · TV 방송일 · OOH 게재일)을 모두 본다 */
function campPeriodAll(){
  const md=campMedia(),ds=[],de=[];
  if(md.digital||md.ott)(LINES||[]).forEach(l=>{if(ovIso(l.start))ds.push(l.start);if(ovIso(l.end))de.push(l.end);});
  if(md.tv)(TV_SPOTS||[]).concat(typeof TV_DAY!=='undefined'?TV_DAY:[]).forEach(r=>{if(ovIso(r.date)){ds.push(r.date);de.push(r.date);}});
  if(md.ooh)(OOH_PLAN||[]).forEach(r=>{if(ovIso(r.start))ds.push(r.start);if(ovIso(r.end))de.push(r.end);});
  ds.sort();de.sort();
  return {start:ds[0]||'',end:de[de.length-1]||''};}

/* 저장된 문서 조각 → 캠페인 한 줄 */
function ovRow(p){
  const m=p.media||{};
  const md=(m.digital||m.tv||m.ooh||m.ott)?{digital:!!m.digital,tv:!!m.tv,ott:!!m.ott,ooh:!!m.ooh}:{digital:true,tv:false,ott:false,ooh:false};
  const lines=Array.isArray(p.lines)?p.lines:[];
  /* OTT (v143) — OTT 를 켠 캠페인은 OTT 매체(넷플릭스 · 쿠팡플레이 · 티빙 · 디즈니플러스) 라인을 따로.
     라인에 매체 이름이 없으면(광고주 화면 서버 함수) 저장할 때 적어 둔 요약(media.ottSum)을 쓴다 */
  const isO=l=>typeof isOttMedia==='function'&&isOttMedia(l&&l.media);
  let dL=lines,oL=[],oS=null;
  if(md.ott){
    if(lines.some(l=>l&&l.media!=null)){oL=lines.filter(isO);dL=lines.filter(l=>!isO(l));}
    else if(m.ottSum&&typeof m.ottSum==='object')oS=m.ottSum;
    else if(!md.digital){oL=lines;dL=[];}}
  const tvp=Array.isArray(p.tv&&p.tv.plan)?p.tv.plan:[];let tvs=Array.isArray(p.tv&&p.tv.spots)?p.tv.spots:[],tvn=0;const tvMon={};
  const oo=Array.isArray(p.ooh)?p.ooh:[];
  /* 예산 — 예전 저장본(net 기준)은 net 을 그대로 (수수료 0) */
  const lb=l=>{const g=l&&l.gross;return Math.round((g===undefined||g===null||g==='')?(+l.net||0):(+g||0))||0;};
  const TP=tvPlanTotal(tvp),TA=tvSpotTotal(tvs),O=oohTotal(oo);
  /* v132 — 요약형 TV(채널별 계획 · 채널별 실적 · 일자별 실적)가 있으면 그걸 쓴다 */
  {const t=p.tv||{},mx=Array.isArray(t.mix)?t.mix:[],chs=Array.isArray(t.ch)?t.ch:[],dy=Array.isArray(t.day)?t.day:[];
   if(mx.length){let amt=0,grp=0;mx.forEach(r=>{amt+=tvMixCalc(r).amt;grp+=tvNum(r.grp);
       Object.keys(r).forEach(k=>{const m=/^a@(\d{4}-\d{2})$/.exec(k);if(m&&tvNum(r[k]))tvMon[m[1]]=(tvMon[m[1]]||0)+tvNum(r[k]);});
       /* v132.2 — 월 한 열(ym · amt) */
       if(/^\d{4}-\d{2}$/.test(r.ym||'')&&tvNum(r.amt))tvMon[r.ym]=(tvMon[r.ym]||0)+tvNum(r.amt);});
     TP.amt=amt;TP.grp=grp;}
   if(chs.length){TA.cost=sum(chs.map(r=>tvNum(r.cost)));TA.grp=sum(chs.map(r=>tvNum(r.grp)));}
   else if(dy.length)TA.grp=sum(dy.map(r=>tvNum(r.grp)));
   tvs=tvs.concat(dy.filter(r=>ovIso(r.date)).map(r=>({date:r.date})));
   tvn=mx.length+chs.length+dy.length;}
  /* v148 — 광고주 화면 서버 함수는 TV 계획 · 채널 표를 주지 않는다 → 저장할 때 적어 둔 요약(media.tvSum) */
  if(!(TP.amt>0)&&!(TA.cost>0)&&m.tvSum&&typeof m.tvSum==='object'){const s=m.tvSum;
    TP.amt=+s.plan||0;TP.grp=+s.pgrp||0;TA.cost=+s.spend||0;TA.grp=+s.grp||0;tvn=Math.max(tvn,1);
    Object.entries(s.mon||{}).forEach(([ym,v])=>{if(/^\d{4}-\d{2}$/.test(ym)&&+v)tvMon[ym]=(tvMon[ym]||0)+(+v);});}
  /* v170 — 계획 GRP: 큐시트(예산 ÷ 목표 CPRP)에서 온 값 */
  if(!(TP.grp>0)&&m.tvSum&&+m.tvSum.pgrp>0)TP.grp=+m.tvSum.pgrp;
  const per=(s,e)=>{s=s.filter(ovIso).sort();e=e.filter(ovIso).sort();return {start:s[0]||'',end:e[e.length-1]||''};};
  const dP=per(lines.map(l=>l.start),lines.map(l=>l.end));
  const tD=tvs.map(r=>r.date);let tP=per(tD,tD);
  /* v132.1 — 채널별 계획에 월 예산이 있으면 TV 기간 · 일별 예산은 그 달들로 (실적 날짜만으로 잡으면 예산이 열흘에 몰렸다).
     첫 달 · 마지막 달은 캠페인(디지털 라인) 시작 · 종료일에 맞춘다 */
  const tvMs=Object.keys(tvMon).sort(),tvMonSpan=[];
  if(tvMs.length){const s0=[dP.start,p.start_date].find(ovIso)||'',e0=[dP.end,p.end_date].find(ovIso)||'';
    tvMs.forEach(ym=>{const last=new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate();
      let a=ym+'-01',z=ym+'-'+String(last).padStart(2,'0');
      if(s0&&s0.slice(0,7)===ym&&s0>a)a=s0;if(e0&&e0.slice(0,7)===ym&&e0<z)z=e0;
      tvMonSpan.push([a,z,tvMon[ym],'tv']);});
    tP={start:[tvMonSpan[0][0],tP.start].filter(ovIso).sort()[0],end:[tvMonSpan[tvMonSpan.length-1][1],tP.end].filter(ovIso).sort().slice(-1)[0]};}
  /* 디지털 · OTT 나누기 — 금액 · 노출 · 클릭 · 조회 */
  const allBud=sum(lines.map(lb));
  const oBud=oS?Math.round(+oS.gross||0):sum(oL.map(lb)),dBud=Math.max(allBud-oBud,0);
  const oP=oS?{start:ovIso(oS.start)?oS.start:'',end:ovIso(oS.end)?oS.end:''}:per(oL.map(l=>l.start),oL.map(l=>l.end));
  const dPd=oS?dP:per(dL.map(l=>l.start),dL.map(l=>l.end));
  const oAgg=p.ottAgg||(oS&&isFinite(+oS.net)?oS:null);
  const share=allBud?oBud/allBud:(oL.length&&!dL.length?1:0);
  const oV=k=>oAgg?(+oAgg[k]||0):(+p[k]||0)*share;
  const a={
    digital:{on:md.digital,budget:dBud,spend:Math.round(Math.max((+p.net||0)-oV('net'),0)),imp:Math.max((+p.imp||0)-oV('imp'),0),
      click:Math.max((+p.click||0)-oV('click'),0),view:Math.max((+p.view||0)-oV('view'),0),n:oS?Math.max(lines.length-(+oS.n||0),0):dL.length,...dPd},
    ott:{on:md.ott,budget:oBud,spend:Math.round(oV('net')),imp:oV('imp'),click:oV('click'),view:oV('view'),n:oS?(+oS.n||0):oL.length,...oP},
    tv:{on:md.tv,plan:Math.round(TP.amt||0),spend:Math.round(TA.cost||0),pgrp:TP.grp||0,grp:TA.grp||0,n:tvp.length+tvs.length+tvn,...tP},
    ooh:{on:md.ooh,budget:Math.round(O.cost||0),slots:O.n,media:O.media,n:oo.length,start:O.start,end:O.end}};
  a.digital.has=a.digital.n>0||a.digital.spend>0;
  a.ott.has=a.ott.n>0||a.ott.spend>0;
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
  /* 일별 집행 예산 흐름(v89) — [시작, 종료, 금액, 영역]. 금액을 그 기간에 고르게 나눠 날마다 더한다.
     디지털 = 라인별 예산 · 기간, OOH = 지면별 광고비 · 기간, TV = 계획(없으면 방송) 금액을 방송 기간(없으면 캠페인 기간)에 */
  const spans=[];
  /* 서버 함수 줄(라인 매체 없음)은 디지털 라인 금액을 OTT 몫만큼 줄이고 OTT 는 요약 기간에 고르게 */
  const dk=oS&&allBud?dBud/allBud:1;
  if(a.digital.inc)dL.forEach(l=>{const v=lb(l)*dk;if(v>0&&ovIso(l.start)&&ovIso(l.end)&&l.end>=l.start)spans.push([l.start,l.end,v,'digital']);});
  if(a.ott.inc){if(oS){if(oBud>0&&oP.start&&oP.end&&oP.end>=oP.start)spans.push([oP.start,oP.end,oBud,'ott']);}
    else oL.forEach(l=>{const v=lb(l);if(v>0&&ovIso(l.start)&&ovIso(l.end)&&l.end>=l.start)spans.push([l.start,l.end,v,'ott']);});}
  if(a.ooh.inc)oo.forEach(r=>{const v=tvNum(r.cost);if(v>0&&ovIso(r.start)&&ovIso(r.end)&&r.end>=r.start)spans.push([r.start,r.end,v,'ooh']);});
  /* v169 — TV 주차별 값(다음 달 캠페인을 앞 달 그래프에 비출 때) */
  let tvWk=null;try{const w=p.wr;if(w&&w.ym&&Array.isArray(w.weeks)&&w.wtot&&Array.isArray(w.wtot.w))tvWk={ym:w.ym,wk:w.weeks.map((k,i)=>{const x=w.wtot.w[i]||[];return [k.l,k.s,k.e,+x[0]||0,+x[1]||0];})};
    else if(m.tvSum&&m.tvSum.ym&&Array.isArray(m.tvSum.wk))tvWk={ym:m.tvSum.ym,wk:m.tvSum.wk};}catch(e){}
  /* v170 — TV 일별 흐름: 주차별 집행금액(천원)이 있으면 그 주 안에서 고르게 */
  const wkSp=tvWk?tvWk.wk.filter(k=>+k[4]>0&&ovIso(k[1])&&ovIso(k[2])&&k[2]>=k[1]).map(k=>[k[1],k[2],k[4]*1000,'tv']):[];
  if(a.tv.inc&&wkSp.length)wkSp.forEach(x=>spans.push(x));
  else if(a.tv.inc&&tvMonSpan.length&&a.tv.plan>0)tvMonSpan.forEach(x=>spans.push(x));
  else if(a.tv.inc&&a.tv.budget>0){
    const ts=[tP.start,dP.start,p.start_date].find(ovIso),te=[tP.end,dP.end,p.end_date].find(ovIso);
    if(ts&&te&&te>=ts)spans.push([ts,te,a.tv.budget,'tv']);}
  /* v179 — 월별 광고 구분: TV 는 품목별 금액(위클리 리포트 → 저장해 둔 요약 → 없으면 품목 미상), 디지털 · OTT 는 라인의 구분 */
  const cats=[];try{
    const ymOf=d=>String(d||'').slice(0,7),okYm=y=>/^\d{4}-\d{2}$/.test(y||'');
    if(a.tv.on){
      const ym=[tvWk&&tvWk.ym,m.tvSum&&m.tvSum.ym,ymOf(tP.start),ymOf(S[0]),ymOf(p.start_date)].find(okYm);
      /* v182 — 품목별 금액은 큐시트(최종 편성) 예산 → 저장해 둔 요약 → 위클리 리포트 순 */
      let it=Array.isArray(p.tvIt)?p.tvIt:[];
      if(!it.length&&m.tvSum&&Array.isArray(m.tvSum.it))it=m.tvSum.it;
      if(!it.length&&p.wr&&Array.isArray(p.wr.items)&&typeof wrItemBud==='function')it=wrItemBud(p.wr.items);
      if(ym){if(it.length)it.forEach(x=>{if(x&&x[0]&&+x[1]>0)cats.push(['tv',String(x[0]),ym,+x[1]]);});else if(a.tv.inc&&a.tv.budget>0)cats.push(['tv','',ym,a.tv.budget]);}}
    const byMon=(st,en,v)=>{const o={};if(!(ovIso(st)&&ovIso(en)&&en>=st))return o;const D=x=>new Date(x+'T00:00:00'),n=Math.round((D(en)-D(st))/864e5)+1;
      for(const d=D(st);d<=D(en);d.setDate(d.getDate()+1)){const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');o[k]=(o[k]||0)+v/n;}return o;};
    const addL=(k,L2,scale)=>L2.forEach(l=>{const v=lb(l)*scale;if(!(v>0))return;const o=byMon(l.start,l.end,v),nm=String(l.segment||'').trim();
      Object.keys(o).forEach(y=>cats.push([k,nm,y,o[y]]));});
    const cl=Array.isArray(p.catLines)?p.catLines:null;
    if(cl){if(a.digital.inc)addL('digital',md.ott?cl.filter(l=>!isO(l)):cl,1);if(a.ott.inc)addL('ott',cl.filter(isO),1);}
    else{if(a.digital.inc)addL('digital',dL,dk);
      if(a.ott.inc){if(oS){if(oBud>0){const o=byMon(oP.start,oP.end,oBud);Object.keys(o).forEach(y=>cats.push(['ott','',y,o[y]]));}}else addL('ott',oL,1);}}
  }catch(e){}
  return {cats,tvWk,id:p.id||null,code:p.code||'',name:p.name||'(이름 없음)',self:!!p.self,updated:p.updated_at||'',
    start:S[0]||'',end:E[E.length-1]||'',a,budget,spans};}
/* 지금 캠페인 — 화면의 값 그대로 */
function ovSelfRow(){
  let net=0,imp=0,click=0,view=0;
  (FACTS||[]).forEach(f=>{net+=+f.cost||0;imp+=+f.imp||0;click+=+f.click||0;view+=+f.view||0;});
  const ottAgg=campMedia().ott?ottSumNow():null;
  return ovRow({id:(CLOUD&&CLOUD.campaign&&CLOUD.campaign.id)||'self',name:CAMPAIGN.name,self:true,media:campMedia(),
    lines:LINES,tv:{plan:TV_PLAN,spots:TV_SPOTS,mix:TV_MIX,ch:TV_CH,day:TV_DAY},ooh:OOH_PLAN,net,imp,click,view,ottAgg,updated_at:new Date().toISOString(),
    tvIt:(()=>{try{const c=TV_CUE&&TV_CUE.st;if(c&&Array.isArray(c.it)&&c.it.length)return c.it;return (typeof wrOn==='function'&&wrOn())?wrItemBud(TV_WR.items):null;}catch(e){return null;}})()});}
function ovStatus(r,today){
  if(!r.start||!r.end)return '';
  return today<r.start?'pre':today>r.end?'done':'live';}
const OV_ST={get live(){return L('진행 중','Live');},get pre(){return L('예정','Upcoming');},get done(){return L('종료','Ended');}};

/* 샘플 화면 — 같은 광고주의 예시 캠페인 셋 */
function ovDemoRows(){
  const y=String(CAMPAIGN.today||'2026').slice(0,4);
  const mk=(name,md,o)=>ovRow({name,media:md,...o});
  return [
    mk(L(`${y} 상반기 신제품 런칭`,`${y} H1 new product launch`),{digital:true,tv:true,ott:true},{
      lines:[{gross:420000000,start:`${y}-03-02`,end:`${y}-04-30`,media:'YouTube'},{gross:96000000,start:`${y}-03-09`,end:`${y}-04-19`,media:'Netflix'}],net:417800000,imp:96500000,click:412000,view:21800000,
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
      if(!error&&Array.isArray(data)){
        /* v181 — 운영 계정은 '월별 광고 구분'에 쓸 품목 · 구분만 가볍게 더 읽는다(서버 함수는 품목을 주지 않는다) */
        let ex={};
        if(CLOUD.user&&!CLOUD.shareView){try{const ids=data.map(d=>d.id).filter(Boolean);
          if(ids.length){const r2=await withTimeout(CLOUD.sb.from('campaigns').select('id,wri:doc->tv->wr->items,cit:doc->tv->cue->st->it,lines:doc->lines').in('id',ids),15000,'월별 광고 구분');
            (r2.data||[]).forEach(x=>{ex[x.id]={wri:x.wri,tvIt:Array.isArray(x.cit)?x.cit:null,catLines:Array.isArray(x.lines)?x.lines:null};});}}catch(e){}}
        return {rows:data.map(d=>{const x=ex[d.id]||{};return ovRow({...d,self:d.is_self,...(x.wri?{wr:{...(d.wr||{}),items:x.wri}}:{}),...(x.tvIt?{tvIt:x.tvIt}:{}),...(x.catLines?{catLines:x.catLines}:{})});}),src:'rpc'};}
      rpcErr=error;}catch(e){rpcErr={message:String(e&&e.message||e)};}}
  /* ② 시행사 — 내가 볼 수 있는 캠페인을 직접 */
  if(CLOUD.user&&!CLOUD.shareView){
    const adv=ovNorm(CAMPAIGN.advertiser);
    const ids=[...new Set((CLOUD.list||[]).filter(c=>adv&&ovNorm(c.advertiser)===adv).map(c=>c.id).concat([selfId]))];
    const {data,error}=await withTimeout(CLOUD.sb.from('campaigns')
      /* v169 — TV 는 쓰는 표만(큐시트 묶음 tv.cue 는 커서 빼고 읽는다) */
      .select('id,name,start_date,end_date,updated_at,media:doc->campaign->media,lines:doc->lines,tvp:doc->tv->plan,tvs:doc->tv->spots,tvm:doc->tv->mix,tvc:doc->tv->ch,tvd:doc->tv->day,wry:doc->tv->wr->ym,wrw:doc->tv->wr->weeks,wrt:doc->tv->wr->wtot,wri:doc->tv->wr->items,ooh:doc->ooh->plan')
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
    return {rows:(data||[]).map(d=>ovRow({...d,tv:{plan:d.tvp,spots:d.tvs,mix:d.tvm,ch:d.tvc,day:d.tvd},wr:{ym:d.wry,weeks:d.wrw,wtot:d.wrt,items:d.wri},...(agg[d.id]||{}),self:d.id===selfId})),src:'direct',
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
  /* v144 — 광고비 · 집행이 하나도 없는 영역(예: 코웨이 디지털 0원)은 줄 · 범례 · 목록에서 숨긴다 */
  const AV=OV_AREAS.filter(x=>tot[x.k].budget>0||tot[x.k].spend>0);OV_VIS=AV.length?AV:OV_AREAS;
  /* 소진율 — 실적이 들어오는 디지털 · TV 만 (OOH 는 실적 입력이 없다) */
  const sb=tot.digital.budget+tot.tv.budget+tot.ott.budget,sp=tot.digital.spend+tot.tv.spend+tot.ott.spend;
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
      return `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" class="dp${out?' out':' in-'+x.c}">${(f*100).toFixed(f<0.1?1:0)}%</text>`;}).join('');
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
      <div class="klegend2">${OV_VIS.map(x=>`<span class="${tot[x.k].budget?'':'zero'}" data-ovpie="${x.k}"><i class="ovdot ${x.c}"></i>${x.l}</span>`).join('')}</div></div>`;};
  /* v86 — 매체 아이콘: 단색 선, 굵게. 디지털은 휴대폰이 모니터 앞에 오고(흰 바탕으로 덮음) 둘 사이에 틈을 둔다 */
  const ICON={
    digital:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="8" width="31" height="21" rx="2.5"/><path d="M14 37h12M20 29v8"/><rect class="cut" x="29.5" y="16.5" width="14" height="25" rx="3.2"/><rect class="fg" x="29.5" y="16.5" width="14" height="25" rx="3.2"/><path d="M34.5 37.2h4"/></svg>',
    tv:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="13" width="39" height="26" rx="3.5"/><path d="M17 5.5l7 7.5 7-7.5M15 43.5h18"/><path d="M37 20v5"/></svg>',
    ott:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="8.5" width="39" height="28" rx="4"/><path d="M20 16.5v12l10-6z"/><path d="M14 42.5h20"/></svg>',
    ooh:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="6.5" width="39" height="23" rx="2.5"/><path d="M15 29.5v13M33 29.5v13M9 42.5h30M11.5 14h15M11.5 21h9"/></svg>'};
  const gauge=(ratio,l1,v1,mid,l2,v2)=>`<div class="kbar">${isFinite(ratio)?`<i style="width:${(Math.min(Math.max(ratio,0),1)*100).toFixed(2)}%"></i>`:''}</div>
    <div class="kfoot"><div class="kf l"><span>${l1}</span><b class="mono">${v1}</b></div>
      <div class="kf r"><span>${l2}</span><b class="mono">${v2}</b></div>${mid?`<div class="kf c">${mid}</div>`:''}</div>`;
  /* 매체 줄 카드 — [아이콘] [이름 · 비중 / 금액 / 캠페인 수] [막대 + 집행 · 잔여] 가로 한 줄 (좁으면 막대가 아래로) */
  /* 매체 카드(v88 컴팩트) — [아이콘] | 이름 · 비중 / 캠페인 수  ·  금액(오른쪽) / 막대 / 집행 · 소진율 · 잔여 */
  const rowCard=(x,body)=>`<div class="ovk ovm ov${x.c}${tot[x.k].budget?'':' zero'}" data-ovk="${x.k}"><div class="ovri">
      <span class="kic">${ICON[x.k]}</span>
      <div class="kmain"><div class="khd"><div class="ktl"><div class="kt"><span class="tt">${x.l}</span><span class="kr">${L(`비중 ${pc1(shr(x.k))}`,`share ${pc1(shr(x.k))}`)}</span></div>
          <div class="ks">${L(`캠페인 ${Bn(tot[x.k].n)}개`,`${Bn(tot[x.k].n)} campaigns`)}</div></div>
        <div class="kv mono">${won0(tot[x.k].budget)}</div></div>
      <div class="kg">${body}</div></div></div></div>`;
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
  /* 줄 수(n)에 맞춰 각 줄 가운데 높이 — 줄 사이 틈 12px (v143 — OTT 가 들어와 넷) */
  const NR=OV_VIS.length,GP=12,yAt=i=>`calc((100% - ${(NR-1)*GP}px) * ${((i+.5)/NR).toFixed(5)} + ${i*GP}px)`;
  const tree=`<div class="ovtree" aria-hidden="true"><i class="tin"></i><i class="tv" style="top:${yAt(0)};bottom:${yAt(0)}"></i>
      ${OV_VIS.map((x,i)=>`<i class="tout ov${x.c}${tot[x.k].budget?'':' zero'}" style="top:${yAt(i)}" data-ovk="${x.k}"></i>`).join('')}</div>`;
  box.innerHTML=
    `<div class="ovk ovall">${all?donut():`<div class="kh"><span class="tt">${L('총 광고비','Total ad spend')}</span></div><div class="kfill"></div><div class="hint">${L('광고비가 아직 없습니다.','No ad spend yet.')}</div>`}</div>`
   +tree
   +`<div class="ovrows" style="grid-template-rows:repeat(${NR},minmax(0,1fr))">${OV_VIS.map(x=>rowCard(x,x.k==='ooh'?oohCard():spentCard(x.k))).join('')}</div>`
   +`<div class="ovk ovflow"><div class="flh"><span class="tt">${L('일별 집행 예산','Daily budget')}</span><span class="fln" id="ovFlowRange"></span></div><div class="flc" id="ovFlow"></div><div class="flnote">${L('일별 예산 = 캠페인 · 매체별 예산을 집행 기간의 날 수로 고르게 나눈 값(TV는 주차별 집행금액이 있으면 그 주 안에서 나눔) · 선은 흐름이 보이게 다듬은 것, 마우스를 올리면 그날 값','Daily budget = each budget spread evenly over its flight (TV by week when weekly spend exists) · the line is smoothed, hover for the day')}</div></div>`;
  paintOvFlow($('ovFlow'),rows,won0);
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
  const nt=$('ovNote');if(nt)nt.textContent='';
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
      const step=1;   /* v179 — 달을 건너뛰지 않고 모두 적는다 */
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
        const tags=OV_AREAS.filter(x=>r.a[x.k].inc).map(x=>`<em class="ovtag ${x.c}">${x.l}</em>`).join('');
        const tip=esc(JSON.stringify({n:r.name,p:r.start?`${r.start.replace(/-/g,'.')} – ${r.end.replace(/-/g,'.')}`:'',
          a:OV_AREAS.filter(x=>r.a[x.k].inc).map(x=>[x.l,r.a[x.k].budget]),t:r.budget}));
        /* v82 — 타임라인은 보기만: 이름은 누를 수 없고, '지금 캠페인' · 진행 상태 표시는 뺐다(날짜 축으로 보인다) */
        return `<div class="ovrow${ovStatus(r,today)==='live'?' live':''}">
          <div class="ovl one"><span class="ovname">${esc(r.name)}</span><div class="ovsub">${tags}</div></div>
          <div class="ovtrack">${isFinite(l)?`<b class="ovbar" style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%;background:linear-gradient(90deg,${grad})" data-ovtip="${tip}"></b>`:''}</div>
          <div class="ovr mono">${r.budget?manUnit(r.budget):'–'}</div></div>`;};
      tl.innerHTML=`<div class="ovtl"><div class="ovrow axis"><div class="ovl"></div><div class="ovtrack ovaxis">${ticks}</div><div class="ovr">${L('광고비','Ad spend')}</div></div>
        <div class="ovrows">${rows.map(row).join('')}
        <div class="ovgrid"><div class="ovl"></div><div class="ovtrack">${months.map(d=>`<i style="left:${((d.getTime()-A)/W*100).toFixed(3)}%"></i>`).join('')}
          ${isFinite(tx)?`<b class="ovtoday" style="left:${tx.toFixed(3)}%"><span>${L('오늘','Today')}</span></b>`:''}</div><div class="ovr"></div></div></div>
        <div class="ovleg">${OV_VIS.map(x=>`<span><i class="ovdot ${x.c}"></i>${x.l}</span>`).join('')}</div></div>`;
      tl.querySelectorAll('[data-ovtip]').forEach(b=>{let o=null;try{o=JSON.parse(b.dataset.ovtip);}catch(e){return;}
        b.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(o.n)}</div>`
          +(o.p?`<div class="r"><span class="l">${L('기간','Period')}</span><b>${esc(o.p)}</b></div>`:'')
          +o.a.map(([l,v])=>`<div class="r"><span class="l">${esc(l)}</span><b>${won0(v)}</b></div>`).join('')
          +`<div class="r"><span class="l">${L('합계','Total')}</span><b>${won0(o.t)}</b></div>`));
        b.addEventListener('mouseleave',hideTip);});}}
  try{paintOvItems(rows,won0);}catch(e){console.warn(e);}
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
    const sect=(x,head,body,foot)=>{if(!OV_VIS.includes(x))return '';const rs=rows.filter(r=>r.a[x.k].inc);
      return `<div class="card ovcard"><div class="ovch"><i class="ovdot ${x.c}"></i><b>${L(`${x.l} 캠페인`,`${x.l} campaigns`)}</b>
          <span class="hint">${L(`${fmt(rs.length)}개`,`${fmt(rs.length)}`)}${rs.length?` · ${won0(tot[x.k].budget)}`:''}</span></div>
        ${rs.length?`<div class="tbl-wrap noy"><table class="tbl lite ovtbl"><thead><tr>${head.map(h=>`<th${h[1]?' class="num"':''}>${h[0]}</th>`).join('')}</tr></thead>
          <tbody>${rs.map(r=>`<tr class="${r.self?'self':''}${ovStatus(r,today)==='live'?' live':''}">${body(r)}</tr>`).join('')}${rs.length>1?`<tr class="total">${foot(rs)}</tr>`:''}</tbody></table></div>`
          :`<div class="hint ovnone">${L(`이 광고주의 ${x.l} 캠페인이 아직 없습니다.`,`No ${x.l} campaigns for this advertiser yet.`)}</div>`}</div>`;};
    /* 디지털 · OTT 목록은 같은 모양 (v143) */
    const dgSect=k=>{const X=OV_AREAS.find(x=>x.k===k);
      const showImp=rows.some(r=>r.a[k].inc&&(r.a[k].imp||r.a[k].click||r.a[k].view));
      return sect(X,[['캠페인'],['상태'],['기간'],['예산',1],[L('집행 금액','Spent'),1],['소진율',1]].concat(showImp?[['노출',1],['클릭',1],['조회',1]]:[]),
      r=>{const d=r.a[k];return nmc(r,k)+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:d.start||r.start,end:d.end||r.end})}</td>`
        +`<td class="mono">${won0(d.budget)}</td><td class="mono">${won0(d.spend)}</td>${sbar(d.spend,d.budget)}`
        +(showImp?`<td class="mono">${n0(Math.round(d.imp))}</td><td class="mono">${n0(Math.round(d.click))}</td><td class="mono">${n0(Math.round(d.view))}</td>`:'');},
      rs=>{const b=sum(rs.map(r=>r.a[k].budget)),s=sum(rs.map(r=>r.a[k].spend));
        return `<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(b)}</td><td class="mono">${won0(s)}</td>${sbar(s,b)}`
          +(showImp?['imp','click','view'].map(m=>`<td class="mono">${n0(Math.round(sum(rs.map(r=>r.a[k][m]))))}</td>`).join(''):'');});};
    const dg=dgSect('digital'),ot=dgSect('ott');
    const tv=sect(OV_AREAS[1],[['캠페인'],['상태'],['기간'],['계획 금액',1],['집행 광고비',1],['소진율',1],[L('계획 GRP','Plan GRP'),1],[L('실적 GRP','Actual GRP'),1]],
      r=>{const t=r.a.tv;return nmc(r,'tv')+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:t.start||r.start,end:t.end||r.end})}</td>`
        +`<td class="mono">${won0(t.plan)}</td><td class="mono">${won0(t.spend)}</td>${sbar(t.spend,t.plan)}`
        +`<td class="mono">${t.pgrp?tvFmt1(t.pgrp):'–'}</td><td class="mono">${t.grp?tvFmt1(t.grp):'–'}</td>`;},
      rs=>{const p=sum(rs.map(r=>r.a.tv.plan)),s=sum(rs.map(r=>r.a.tv.spend));
        const pg=sum(rs.map(r=>r.a.tv.pgrp)),g=sum(rs.map(r=>r.a.tv.grp));
        return `<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(p)}</td><td class="mono">${won0(s)}</td>${sbar(s,p)}`
          +`<td class="mono">${pg?tvFmt1(pg):'–'}</td><td class="mono">${g?tvFmt1(g):'–'}</td>`;});
    const oh=sect(OV_AREAS[3],[['캠페인'],['상태'],['기간'],['광고비',1],['매체',1],[L('지면','Placements'),1]],
      r=>{const o=r.a.ooh;return nmc(r,'ooh')+`<td>${stc(r)}</td><td class="mono nowrap">${per({start:o.start||r.start,end:o.end||r.end})}</td>`
        +`<td class="mono">${won0(o.budget)}</td><td class="mono">${n0(o.media)}</td><td class="mono">${n0(o.slots)}</td>`;},
      rs=>`<td class="head" colspan="3">TOTAL</td><td class="mono">${won0(sum(rs.map(r=>r.a.ooh.budget)))}</td>`
        +`<td class="mono"></td><td class="mono">${n0(sum(rs.map(r=>r.a.ooh.slots)))}</td>`);
    ls.innerHTML=`<div class="ovlists">${dg}${tv}${ot}${oh}</div>`;}
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
const OV_SUM={digital:'d_sum',tv:'t_sum',ott:'ot_sum',ooh:'o_sum'};
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
const OVC_MAX=80;
/* 소재 한 벌 → 칸 목록. src = 캠페인 줄(ovRow) */
function ovcTiles(src,crs,oohcr){
  const out=[],seen=new Map();
  /* 같은 이름의 소재는 한 칸 — 여러 라인(매체)에 걸쳐 있으면 매체를 모아 둔다 (팝업에 표시) */
  const add=(c,area)=>{const nm=String(c&&c.name||'').trim();if(!nm)return;
    const k=area+'\u0001'+nm.toLowerCase(),md=String(c.media||'').trim();
    const ex=seen.get(k);
    if(ex){if(md&&!ex.medias.includes(md))ex.medias.push(md);if(!ex.img&&c.img)ex.img=c.img;if(!ex.yt&&c.yt)ex.yt=c.yt;return;}
    const t={r:src,area,name:nm,img:c.img||'',yt:c.yt||'',g:c.g||'',media:md,medias:md?[md]:[],ratio:c.ratio||'',type:c.type||''};
    seen.set(k,t);out.push(t);};
  const ottOn=!!(src&&src.a&&src.a.ott&&src.a.ott.on);
  (Array.isArray(crs)?crs:[]).forEach(c=>c&&typeof c==='object'&&add(c,ottOn&&typeof isOttMedia==='function'&&isOttMedia(c.media)?'ott':'digital'));
  (Array.isArray(oohcr)?oohcr:[]).forEach(c=>c&&typeof c==='object'&&add(c,'ooh'));
  return out;}
function ovcSelf(selfRow){
  return ovcTiles(selfRow,(CREATIVES||[]).map(c=>({name:c.name,img:c.img,yt:c.yt,g:c.g,media:c.media,ratio:c.ratio,type:c.type})),
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
/* 소재 크게 보기 (v90) — 왼쪽 이미지 전체, 오른쪽 캠페인 · 소재 정보. ← → 로 앞뒤 소재, 캠페인 서머리로 이동 단추 */
function ovcOpen(list,i){
  const t=list[i];if(!t)return;
  const al=(OV_AREAS.find(x=>x.k===t.area)||{}).l||'';
  const r=t.r,today=CAMPAIGN.today||iso(new Date());
  const st=ovStatus(r,today),can=ovCanGo(r);
  const ytUrl=t.yt?`https://www.youtube.com/watch?v=${encodeURIComponent(t.yt)}`:'';
  const src=t.img?(t.img.slice(0,5)==='data:'?t.img:encodeURI(t.img)):(t.yt?ytThumb(t.yt):'');
  const pic=src?`<img src="${esc(src)}" alt="${esc(t.name)}">`
    :`<div class="ovlbn" style="background:${crGrad(t)}"><span>${esc(t.name)}</span></div>`;
  const per=r.start?`${r.start.replace(/-/g,'.')} – ${(r.end||r.start).replace(/-/g,'.')}`:'–';
  const mds=(t.medias&&t.medias.length?t.medias:(t.media?[t.media]:[]));
  const row=(l,v)=>`<div class="ovlr"><span>${l}</span><b>${v}</b></div>`;
  const body=`<div class="ovlb">
      <div class="ovlpic">${pic}${t.yt?`<a class="ovlyt" href="${esc(ytUrl)}" target="_blank" rel="noopener">▶ ${L('유튜브에서 보기','Watch on YouTube')}</a>`:''}
        ${list.length>1?`<button type="button" class="ovlnav p" data-ovln="-1" aria-label="${L('이전 소재','Previous')}">‹</button><button type="button" class="ovlnav n" data-ovln="1" aria-label="${L('다음 소재','Next')}">›</button>`:''}</div>
      <div class="ovlinfo">
        <div class="ovltag"><i class="ovdot ${ovC(t.area)}"></i>${esc(al)}${st?` <em class="ovlst ${st}">${OV_ST[st]}</em>`:''}</div>
        <div class="ovlname">${esc(t.name)}</div>
        ${row(L('캠페인','Campaign'),esc(r.name))}
        ${row(L('캠페인 기간','Flight'),esc(per))}
        ${mds.length?row(L('게재 매체','Media'),esc(mds.join(' · '))):''}
        ${row(L('캠페인 광고비','Campaign spend'),won(Math.round(r.budget||0)))}
        ${(t.area==='digital'||t.area==='ott')&&r.a&&r.a[t.area]&&r.a[t.area].imp?row(L('캠페인 노출','Campaign impressions'),fmt(Math.round(r.a[t.area].imp))):''}
        <div class="ovlfill"></div>
        ${can?`<button type="button" class="btn primary ovlgo">${L(`${al} 서머리로 이동`,`Open ${al} summary`)} →</button>`:''}
        <div class="ovlcnt">${fmt(i+1)} / ${fmt(list.length)}</div>
      </div></div>`;
  closeAllModals();
  const box=openModal(L('소재 보기','Creative'),body,'',{w:1080});
  box.classList.add('ovlmodal');
  /* 이미지를 못 불러오면(유튜브 썸네일 차단 등) 소재 색 칸으로 */
  const im=box.querySelector('.ovlpic img');
  if(im)im.onerror=()=>{const d=document.createElement('div');d.className='ovlbn';d.style.background=crGrad(t);
    d.innerHTML=`<span>${esc(t.name)}</span>`;im.replaceWith(d);};
  const go=box.querySelector('.ovlgo');
  if(go)go.onclick=()=>{closeAllModals();ovGo(r,t.area);};
  box.querySelectorAll('[data-ovln]').forEach(b=>b.onclick=()=>ovcOpen(list,(i+(+b.dataset.ovln)+list.length)%list.length));
  const key=e=>{if(!document.body.contains(box)){removeEventListener('keydown',key);return;}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();removeEventListener('keydown',key);
      ovcOpen(list,(i+(e.key==='ArrowLeft'?-1:1)+list.length)%list.length);}
    else if(e.key==='Escape'){removeEventListener('keydown',key);closeAllModals();}};
  if(list.length>1)addEventListener('keydown',key);
}
/* v160 — TV 소재(먼슬리 리포트 스토리보드 장면)도 콜라주에 — 그 소재가 마지막으로 실린 달의 캠페인에 붙인다.
   이 광고주(코웨이) 캠페인일 때만(지금 캠페인의 TV 위클리 리포트 품목이 대응표에 있을 때) */
function ovcTv(rows){
  try{if(typeof WR_CRIMG==='undefined'||!TV_WR||!(TV_WR.items||[]).some(it=>Object.keys(WR_CRIMG).some(k=>k.startsWith(it.n+'|'))))return [];}catch(e){return [];}
  const self=rows.find(r=>r.self),ym=r=>String(r.start||'').slice(0,7),seen=new Set(),out=[];
  Object.entries(WR_CRIMG).forEach(([k,id])=>{if(seen.has(id))return;seen.add(id);const [it,cr]=k.split('|'),ms=WR_CRMO[id]||[],m=ms.length?Math.max(...ms):0;
    const r=(m&&rows.find(x=>ym(x)===`2026-${String(m).padStart(2,'0')}`))||self;if(!r)return;
    out.push({r,area:'tv',name:`${it} · ${cr}`,img:`assets/cr/${id}_k.jpg`,yt:'',g:'',media:'TV',medias:['TV'],ratio:'',type:''});});
  return out;}
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
    const items=ovcSelf(self).concat(OVC.items||[]).concat(ovcTv(rows));
    const nCamp=new Set(items.map(t=>t.r.name)).size;
    if(nt)nt.textContent=items.length?L(`소재 ${fmt(items.length)}개 · 캠페인 ${fmt(nCamp)}개 · 누르면 크게 보기`,`${fmt(items.length)} creatives · ${fmt(nCamp)} campaigns · click to enlarge`):'';
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
        +`<div class="r"><span class="l">${L('매체','Media')}</span><b>${esc(al+(t.media&&(t.area==='digital'||t.area==='ott')?' · '+t.media:''))}</b></div>`
        +`<div class="r"><span class="l"></span><b>${L('누르면 크게 보기','Click to enlarge')}</b></div>`));
      el.addEventListener('mouseleave',hideTip);
      el.onclick=()=>{hideTip();ovcOpen(shown,+el.dataset.oct);};});};
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
  bx.classList.add('ovfloor');
  /* v91 — 무대(.ovstage) 안에 이름 · 막대를 놓고, 바닥(.ovfl)은 카드 좌우 · 아래 끝까지 꽉 차게.
     회색 테마 바탕과 섞이지 않도록 바닥은 옅은 갈색(웜 토프) 톤. 위쪽 여백을 넓혀 이름이 가운데 쪽에 오게 */
  const SPX=18,PT=46,BI=0;
  const W=Math.max((bx.clientWidth||($('tab-overview')||{}).clientWidth||1000)-SPX*2,300);
  /* v87 — 축 · 눈금 · 날짜 줄 없이: 위쪽 이름 상자(이름 · 금액 · 기간) → 줄 → 입체 막대 → 카드 아래 25% 를 덮는 바닥 */
  const PX=16,n=rows.length;
  /* 칸이 너무 좁아지면(92px 미만) 좌우로 스크롤 */
  const cellW=Math.max(Math.min((W-PX*2)/n,240),92);
  const plotW=cellW*n;
  /* 이름은 두 단 지그재그 — 이름 폭이 좌우 이웃 막대의 줄에 닿지 않도록 2칸 폭 이내, 길면 두 줄까지 */
  const LV=2,LH=66,labZ=LV*LH+8,plotH=220,DEP=10;
  const Bb=labZ+plotH;                                   /* 막대 앞면 바닥 */
  /* 바닥 — 카드(이 칸) 높이의 25%. 막대는 바닥 깊이의 42% 지점에 선다 */
  const SINK=.42;
  const F=Math.round(.25*(PT+Bb+BI)/(1-.25*(1-SINK)));
  const Hc=Math.round(Bb+(1-SINK)*F);
  const mx=Math.max(1,...rows.map(r=>r.budget||0));
  const Y=v=>Bb-v/mx*plotH;
  const labW=Math.min(2*cellW-12,300);
  const per=r=>r.start?`${mdy(r.start)} ~ ${mdy(r.end||r.start)}`:'';
  const cols=rows.map((r,i)=>{
    const cx=PX+cellW*i+cellW/2,bw=Math.max(Math.min(cellW*.4,58),14),bl=cx-(bw+DEP)/2;
    const segs=OV_AREAS.filter(x=>r.a[x.k].inc&&r.a[x.k].budget>0);
    const h=r.budget?Math.max(r.budget/mx*plotH,3):0;
    const lv=i%LV,lt=lv*LH+2;
    /* 이름은 늘 자기 막대 줄 위 가운데 — 양 끝 캠페인은 폭을 줄여 옆 캠페인의 줄을 덮지 않게 */
    const hw=Math.min(labW/2,cx,PX*2+plotW-cx),ll=cx-hw,lw=hw*2;
    const tip=esc(JSON.stringify({n:r.name,p:r.start?`${r.start.replace(/-/g,'.')} – ${r.end.replace(/-/g,'.')}`:'',
      a:segs.map(x=>[x.l,r.a[x.k].budget]),t:r.budget}));
    return `<div class="ocl" style="left:${ll.toFixed(1)}px;top:${lt}px;width:${lw.toFixed(1)}px;height:${LH-8}px" data-oci="${i}">
        <b title="${esc(r.name)}">${esc(r.name)}</b><span class="mono">${r.budget?manUnit(r.budget):'–'}</span>${per(r)?`<em class="mono">${per(r)}</em>`:''}</div>
      <i class="ocln" style="left:${cx.toFixed(1)}px;top:${lt+LH-5}px;height:${Math.max(Bb-h-DEP-(lt+LH-5)-2,0).toFixed(1)}px" data-oci="${i}"></i>
      <i class="ocsh" style="left:${(bl-8).toFixed(1)}px;width:${(bw+DEP+26).toFixed(1)}px;top:${(Bb-DEP/2-8).toFixed(1)}px"></i>
      <div class="ocbar" style="left:${bl.toFixed(1)}px;width:${bw.toFixed(1)}px;top:${(Bb-h).toFixed(1)}px;height:${h.toFixed(1)}px" data-ovtip="${tip}" data-oci="${i}">
        ${segs.slice().reverse().map(x=>`<i class="${x.c}" style="flex:${r.a[x.k].budget} 1 0"></i>`).join('')}</div>`;}).join('');
  bx.innerHTML=`<div class="ovstage" style="padding:${PT}px ${SPX}px ${BI}px">
      <i class="ovfl" style="height:${F}px;bottom:${BI}px"></i>
      <div class="ovcols" style="height:${Hc}px;width:${(PX*2+plotW).toFixed(1)}px">${cols}</div>
      <div class="ovleg onfloor" style="bottom:12px">${OV_VIS.map(x=>`<span><i class="ovdot ${x.c}"></i>${x.l}</span>`).join('')}</div></div>`;
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

/* ---------- 일별 집행 예산 흐름 (v89) ----------
   캠페인마다 예산을 집행 기간에 고르게 나눠 날짜별로 더한 값. 선은 7일 이동평균을 부드러운 곡선으로(값이 튀지 않게
   단조 보간), 아래는 그라데이션 면. 마우스를 올리면 그날의 실제 일 예산 · 매체별 · 진행 중 캠페인 */
var OVFLOW_LAST=null;
function ovMonoPath(P){
  const n=P.length;if(n<2)return '';
  const dx=[],m=[],t=[];
  for(let i=0;i<n-1;i++){dx[i]=P[i+1][0]-P[i][0];m[i]=(P[i+1][1]-P[i][1])/(dx[i]||1);}
  t[0]=m[0];t[n-1]=m[n-2];
  for(let i=1;i<n-1;i++)t[i]=m[i-1]*m[i]<=0?0:(m[i-1]+m[i])/2;
  for(let i=0;i<n-1;i++){if(m[i]===0){t[i]=t[i+1]=0;continue;}
    const a=t[i]/m[i],b=t[i+1]/m[i],h=a*a+b*b;if(h>9){const k=3/Math.sqrt(h);t[i]=k*a*m[i];t[i+1]=k*b*m[i];}}
  let d=`M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for(let i=0;i<n-1;i++){const h=dx[i]/3;
    d+=` C${(P[i][0]+h).toFixed(1)} ${(P[i][1]+t[i]*h).toFixed(1)} ${(P[i+1][0]-h).toFixed(1)} ${(P[i+1][1]-t[i+1]*h).toFixed(1)} ${P[i+1][0].toFixed(1)} ${P[i+1][1].toFixed(1)}`;}
  return d;}
function paintOvFlow(host,rows,won0){
  if(!host)return;
  OVFLOW_LAST={rows,won0,w:host.clientWidth};
  const D=x=>new Date(x+'T00:00:00'),DAYMS=864e5;
  const sp=[];rows.forEach((r,ri)=>(r.spans||[]).forEach(x=>{if(r.a[x[3]]&&r.a[x[3]].inc)sp.push({s:x[0],e:x[1],v:x[2],k:x[3],ri});}));
  const rg=$('ovFlowRange');
  if(!sp.length){host.innerHTML=`<div class="hint flempty">${L('기간과 예산이 들어간 캠페인이 없습니다.','No campaigns with dates and budget yet.')}</div>`;if(rg)rg.textContent='';return;}
  const s0=sp.map(x=>x.s).sort()[0],e0=sp.map(x=>x.e).sort().pop();
  const t0=D(s0).getTime(),N=Math.round((D(e0).getTime()-t0)/DAYMS)+1;
  const day=[...Array(N)].map(()=>({t:0,k:{digital:0,tv:0,ott:0,ooh:0},c:{}}));
  sp.forEach(x=>{const a=Math.round((D(x.s).getTime()-t0)/DAYMS),b=Math.round((D(x.e).getTime()-t0)/DAYMS),per=x.v/(b-a+1);
    for(let i=a;i<=b;i++){const o=day[i];o.t+=per;o.k[x.k]+=per;o.c[x.ri]=(o.c[x.ri]||0)+per;}});
  /* 흐름선 — 가우스 평활(기간이 길수록 넓게). 캠페인 시작 · 종료의 계단이 완만한 언덕이 된다.
     정확한 그날 값은 툴팁으로 */
  const sg=N>60?Math.max(4,N/32):N>20?2:0,R=Math.ceil(sg*3);
  const sm=sg?day.map((_,i)=>{let s=0,c=0;for(let j=i-R;j<=i+R;j++){if(j<0||j>=N)continue;const w=Math.exp(-((j-i)*(j-i))/(2*sg*sg));s+=day[j].t*w;c+=w;}return s/c;})
    :day.map(d=>d.t);
  const W=Math.max(host.clientWidth,240),H=Math.max(host.clientHeight,150);
  const PL=6,PR=6,PT=14,PB=24;
  const top=Math.max(...sm)*1.12||1;
  const X=i=>PL+(N>1?i/(N-1):.5)*(W-PL-PR),Y=v=>PT+(1-v/top)*(H-PT-PB);
  const pts=sm.map((v,i)=>[X(i),Y(v)]);
  /* 선은 몇 날 간격으로 짚어 그린다 (점이 너무 촘촘하면 잔물결이 생긴다) */
  const stp=Math.max(1,Math.round(N/60)),pp=pts.filter((_,i)=>i%stp===0||i===N-1);
  const line=ovMonoPath(pp);
  const area=line+` L${X(N-1).toFixed(1)} ${H-PB} L${X(0).toFixed(1)} ${H-PB} Z`;
  const gid='ovfg'+Math.random().toString(36).slice(2,7);
  /* 가로축 — 달 경계(기간이 짧으면 주 단위) */
  const ticks=[];
  if(N>45){for(let i=0;i<N;i++){const d=new Date(t0+i*DAYMS);if(d.getDate()===1||i===0){
      const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      ticks.push([i,L(`${d.getMonth()+1}월`,MON[d.getMonth()])]);}}
    if(ticks.length>1&&ticks[1][0]-ticks[0][0]<12)ticks.shift();}
  else{for(let i=0;i<N;i+=7){const d=new Date(t0+i*DAYMS);ticks.push([i,`${d.getMonth()+1}/${d.getDate()}`]);}}
  const thin=Math.ceil(ticks.length/Math.max(2,Math.floor((W-20)/48)));
  const today=CAMPAIGN.today||iso(new Date()),ti=Math.round((D(today).getTime()-t0)/DAYMS);
  host.innerHTML=`<svg class="flsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--fl-line)" stop-opacity=".30"></stop>
        <stop offset="100%" stop-color="var(--fl-line)" stop-opacity="0"></stop></linearGradient></defs>
      ${ti>=0&&ti<N?`<line class="fltoday" x1="${X(ti).toFixed(1)}" x2="${X(ti).toFixed(1)}" y1="${PT-4}" y2="${H-PB}"></line>
        <text class="fltd" x="${X(ti).toFixed(1)}" y="${PT-5}" text-anchor="${ti>N*.9?'end':ti<N*.1?'start':'middle'}">${L('오늘','Today')}</text>`:''}
      <path d="${area}" fill="url(#${gid})"></path>
      <path class="flline" d="${line}"></path>
      ${ticks.filter((_,k)=>k%thin===0).map(([i,t])=>`<text class="flx" x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="${i<N*.04?'start':'middle'}">${t}</text>`).join('')}
      <line class="flguide" y1="${PT}" y2="${H-PB}" x1="-10" x2="-10"></line>
      <circle class="fldot" r="5" cx="-10" cy="-10"></circle>
      <rect class="flhit" x="0" y="0" width="${W}" height="${H}"></rect></svg>`;
  if(rg)rg.textContent=`${s0.replace(/-/g,'.')} – ${e0.replace(/-/g,'.')}`;
  const svg=host.querySelector('svg'),gl=svg.querySelector('.flguide'),dot=svg.querySelector('.fldot');
  const WD=[L('일','Sun'),L('월','Mon'),L('화','Tue'),L('수','Wed'),L('목','Thu'),L('금','Fri'),L('토','Sat')];
  const hit=svg.querySelector('.flhit');
  hit.addEventListener('mousemove',e=>{
    const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*(W/r.width);
    const i=Math.max(0,Math.min(N-1,Math.round((x-PL)/((W-PL-PR)/Math.max(N-1,1)))));
    const cx=X(i),cy=pts[i][1];
    gl.setAttribute('x1',cx);gl.setAttribute('x2',cx);dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);
    svg.classList.add('on');
    const d=new Date(t0+i*DAYMS),o=day[i];
    const ks=OV_AREAS.filter(a=>o.k[a.k]>0);
    const cs=Object.entries(o.c).sort((a,b)=>b[1]-a[1]);
    showTip(e.clientX,e.clientY,`<div class="t">${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} (${WD[d.getDay()]})${i===ti?' · '+L('오늘','today'):''}</div>`
      +`<div class="r"><span class="l">${L('일 집행 예산','Daily budget')}</span><b>${won0(o.t)}</b></div>`
      +(ks.length>1?ks.map(a=>`<div class="r"><span class="l"><i class="ovdot ${a.c}"></i>${esc(a.l)}</span><b>${won0(o.k[a.k])}</b></div>`).join(''):'')
      +(cs.length?`<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:5px"><span class="l">${L(`진행 중 캠페인 ${cs.length}개`,`${cs.length} live campaigns`)}</span><b></b></div>`
        +cs.slice(0,5).map(([ri,v])=>`<div class="r"><span class="l">${esc(rows[ri].name)}</span><b>${won0(v)}</b></div>`).join('')
        +(cs.length>5?`<div class="r"><span class="l">${L(`외 ${cs.length-5}개`,`+${cs.length-5} more`)}</span><b></b></div>`:''):''));});
  hit.addEventListener('mouseleave',()=>{svg.classList.remove('on');hideTip();});
}
/* 창 폭이 바뀌면 막대 폭 · 이름 단수를 다시 계산 */
window.addEventListener('resize',(()=>{let t=0;return ()=>{clearTimeout(t);t=setTimeout(()=>{
  const bx=$('ovBars'),tab=$('tab-overview');
  if(!bx||!OVCOL_LAST||!tab||tab.classList.contains('hidden')||bx.clientWidth===OVCOL_LAST.w)return;
  paintOvColumns(bx,OVCOL_LAST.rows,OVCOL_LAST.won0);},160);};})());
window.addEventListener('resize',(()=>{let t=0;return ()=>{clearTimeout(t);t=setTimeout(()=>{
  const fl=$('ovFlow'),tab=$('tab-overview');
  if(!fl||!OVFLOW_LAST||!tab||tab.classList.contains('hidden')||fl.clientWidth===OVFLOW_LAST.w)return;
  paintOvFlow(fl,OVFLOW_LAST.rows,OVFLOW_LAST.won0);},160);};})());

/* ================================================================
   월별 광고 구분 (v179) — 달마다 어떤 품목 · 구분을 집행했는지 한 표로.
   행 = TV 품목 / OTT · 디지털 구분, 열 = 달, 칸 = 그 달 광고비(색이 진할수록 큼).
   ================================================================ */
function paintOvItems(rows,won0){
  const el=$('ovItems');if(!el)return;
  const all=[];rows.forEach(r=>(r.cats||[]).forEach(c=>{if(c&&/^\d{4}-\d{2}$/.test(c[2])&&+c[3]>0)all.push(c);}));
  const wrap=el.closest('.card'),sec=$('ovItemsSec');
  if(!all.length){el.innerHTML='';if(wrap)wrap.classList.add('hidden');if(sec)sec.classList.add('hidden');return;}
  if(wrap)wrap.classList.remove('hidden');if(sec)sec.classList.remove('hidden');
  const yms=all.map(c=>c[2]).sort(),months=[];
  for(let [y,m]=yms[0].split('-').map(Number);;){const k=y+'-'+String(m).padStart(2,'0');months.push(k);if(k>=yms[yms.length-1]||months.length>60)break;if(++m>12){m=1;y++;}}
  const AR=[['tv',L('TV 품목','TV products'),L('(품목 자료 없음)','(no product data)')],['ott','OTT',L('OTT 전체','OTT total')],['digital',L('디지털','Digital'),L('(구분 없음)','(no segment)')]];
  const G={};all.forEach(([k,n,ym,v])=>{const g=G[k]||(G[k]={}),r=g[n]||(g[n]={n,t:0,m:{}});r.m[ym]=(r.m[ym]||0)+v;r.t+=v;});
  const mt={};all.forEach(c=>{mt[c[2]]=(mt[c[2]]||0)+c[3];});
  let mx=0;Object.values(G).forEach(g=>Object.values(g).forEach(r=>Object.values(r.m).forEach(v=>{if(v>mx)mx=v;})));
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hd=months.map((k,i)=>{const [y,m]=k.split('-').map(Number),first=i===0||m===1;return `<th>${L(first?`${String(y).slice(2)}년 ${m}월`:`${m}월`,first?`${MON[m-1]} '${String(y).slice(2)}`:MON[m-1])}</th>`;}).join('');
  const tot=sum(Object.values(mt));
  const eok=v=>manUnit(Math.round(v));
  let body='';
  AR.forEach(([k,lab,none])=>{const g=G[k];if(!g)return;const rs=Object.values(g).sort((a,b)=>(a.n==='')-(b.n==='')||b.t-a.t);
    body+=`<tr class="grp"><th colspan="${months.length+2}">${esc(lab)} <span>${rs.filter(r=>r.n!=='').length?L(`${rs.filter(r=>r.n!=='').length}개`,`${rs.filter(r=>r.n!=='').length}`):''}</span></th></tr>`;
    rs.forEach(r=>{const nm=r.n===''?none:r.n,col=r.n===''?'#9aa3ad':(typeof wrCol==='function'?wrCol(String(r.n).replace(/\s+/g,'')):'#6c7b8e');
      body+=`<tr><th class="nm"><i style="background:${col}"></i>${esc(nm)}</th>`+months.map(ym=>{const v=r.m[ym]||0;if(!(v>0))return '<td class="z"></td>';
        const a=(.16+.74*Math.sqrt(v/mx)).toFixed(3);
        return `<td data-ovit="${esc(JSON.stringify([lab,nm,ym,Math.round(v),Math.round(mt[ym]||0)]))}"><b${a>.62?' class="hi"':''} style="--c:${col};--a:${a}">${eok(v)}</b></td>`;}).join('')
        +`<td class="sum mono">${eok(r.t)}</td></tr>`;});});
  body+=`<tr class="tot"><th class="nm">Total</th>${months.map(ym=>`<td class="mono">${mt[ym]>0?eok(mt[ym]):'–'}</td>`).join('')}<td class="sum mono">${eok(tot)}</td></tr>`;
  el.innerHTML=`<div class="ovitw"><table class="ovit"><thead><tr><th class="nm">${L('구분','Category')}</th>${hd}<th class="sum">${L('합계','Total')}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  el.querySelectorAll('[data-ovit]').forEach(td=>{let o=null;try{o=JSON.parse(td.dataset.ovit);}catch(e){return;}
    td.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(o[1])} <span style="font-weight:600;opacity:.6">· ${esc(o[0])}</span></div>`
      +`<div class="r"><span class="l">${esc(o[2].replace('-','.'))}</span><b>${won0(o[3])}</b></div>`
      +(o[4]>0?`<div class="r"><span class="l">${L('그 달 비중','Share of month')}</span><b>${(o[3]/o[4]*100).toFixed(1)}%</b></div>`:'')));
    td.addEventListener('mouseleave',hideTip);});}
