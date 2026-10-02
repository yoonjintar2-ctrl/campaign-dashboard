/* ===== 11. 클라우드 — 구글 로그인 · 캠페인 저장/불러오기 (Supabase) =====
   config.js 와 supabase-js 가 둘 다 있을 때만 켜진다. 없으면 지금까지처럼 데모(더미) 모드. */
/* 접속 권한 4단계 (v24)
   appRole  = 계정 등급 : super(슈퍼마스터) / master(마스터) / guest(게스트)
   role     = 이 캠페인 안에서의 권한 : master(마스터) / editor(운영진) / viewer(광고주)
   shareRole= 코드로 들어온 경우의 권한 : 'staff'(운영진 코드) / 'viewer'(뷰어 코드) */
const CLOUD={on:false,sb:null,user:null,campaign:null,role:null,list:[],busy:false,
  shareView:false,sample:false,appRole:'guest',shareRole:null,savedAt:null,dirty:false,
  /* 코드로 들어온 사람이 옮겨 갈 수 있는 같은 광고주 캠페인 [{id,name,code,is_self}] (v82) */
  advList:[]};
/* 광고주 열쇠 — 서버 adv_key() 와 같은 규칙(공백 정리 · 소문자). 빈 이름은 null — 묶지 않는다 (v82) */
function advKey(a){const k=String(a==null?'':a).replace(/\s+/g,' ').trim().toLowerCase();return k||null;}
const APP_ROLE_LABEL={super:'슈퍼마스터',master:'마스터',guest:'게스트'};
const cfgOf=()=>(typeof window!=='undefined'&&window.CLOUD_CONFIG)||null;
/* config.js 와 supabase-js 는 비동기로 붙으므로 준비될 때까지 기다린다.
   ⚠ 예전에는 3초만 기다려서, 회사망 등에서 라이브러리가 늦게 오면 **영구 데모 모드**가 되고
   올바른 뷰어 코드도 "그런 코드를 찾지 못했습니다" 로 나왔다 (v78) → 받는 중이면 15초까지 기다린다.
   실패가 확실하면(onerror 로 __noConfig · __noSupabase) 바로 넘어간다. */
function cloudReady(cb){
  if(window.__offline||window.__noConfig||window.__noSupabase)return cb();
  let n=0;
  (function tick(){
    const ok=cfgOf()&&typeof supabase!=='undefined'&&supabase.createClient;
    if(ok||n>300||window.__noConfig||window.__noSupabase)return cb();
    if(n===30)try{cloudState('클라우드 연결 중…');}catch(e){}
    n++;setTimeout(tick,50);})();
}
const LINE_KEY=l=>['segment','media','product','target','line'].map(k=>String(l[k]||'')).join('|');
const cloudState=t=>{const e=$('cloudState');if(e)e.textContent=t;};
/* 진행 중 문구("저장 중…")를 걷어 내고 평소 문구로 되돌린다 (v51).
   예전에는 저장이 끝나도 상단에 "저장 중…" 이 그대로 남아 안 끝난 것처럼 보였다. */
function cloudStateIdle(){
  try{
    if(!CLOUD.on){cloudState('데모 모드 · 클라우드 미설정');return;}
    if(!CLOUD.user){cloudState('로그인하면 내 캠페인이 열립니다');return;}
    if(!CLOUD.campaign){cloudState('캠페인이 없습니다 · ＋ 새 캠페인으로 시작하세요');return;}
    const r=(typeof ROLE_LABEL!=='undefined'&&ROLE_LABEL[CLOUD.role])||CLOUD.role||'';
    cloudState(`${CLOUD.campaign.name} · ${r} · 저장됨`);
  }catch(e){}
}
/* 지금 상단 문구가 "…중…" 진행 표시면 평소 문구로 되돌린다 (오류 문구는 그대로 둔다) */
function cloudStateDone(){
  try{const e=$('cloudState');
    /* 진행 문구는 한국어 「…중…」, 영어 「Saving…」 처럼 말줄임표로 끝난다 (v71) */
    if(!e||/(중…|…)\s*$/.test(e.textContent||''))cloudStateIdle();}catch(x){}
}

/* ---------- 직렬화 ----------
   캠페인 설정·소재·이슈·화면 구성은 JSON 문서 한 덩어리(campaigns.doc),
   일별 실적만 별도 정규화 테이블(daily_stats)에 넣는다. */
function serializeDoc(){
  const stripCr=c=>{const o={...c};delete o.daily;
    AMET.concat(['cost']).forEach(m=>delete o['t_'+m]);return o;};
  return {
    v:1,
    campaign:{name:CAMPAIGN.name,advertiser:CAMPAIGN.advertiser,today:CAMPAIGN.today,
      advLogo:CAMPAIGN.advLogo||'',theme:(typeof THEME!=='undefined'?THEME:''),
      /* 배경 로고 — 'none'(앰비언트) · 'adv'(광고주) · 'agency'(대행사). 캠페인마다 따로 */
      bgMode:(typeof bgModeNow==='function'?bgModeNow():'adv'),
      /* 배경 로고가 흘러다닐지 고정될지 (v56) */
      bgMotion:(typeof bgMotionNow==='function'?bgMotionNow():'float'),
      agencyLogo:CAMPAIGN.agencyLogo||'',
      /* 운영 매체 (v71) — {digital, tv}. 없으면 디지털만 */
      media:(typeof campMedia==='function'?campMedia():{digital:true,tv:false,ooh:false}),
      /* 메뉴 설정 (v72) — 켜 둔 기본값과 다른 것만 { 메뉴: {on:false, viewer:false} } */
      menus:JSON.parse(JSON.stringify(CAMPAIGN.menus||{}))},
    /* TV 캠페인 — 예상효율(plan) · 리포트 데이터(spots) (v71) */
    tv:(typeof tvForDoc==='function'?tvForDoc():{plan:[],spots:[]}),
    /* OOH 캠페인 — 지면 계획(plan) · 소재(cr) (v81) */
    ooh:(typeof oohForDoc==='function'?oohForDoc():{plan:[],cr:[]}),
    /* TV · OOH 입력 표의 열 설정 — 숨김 · 이름 · 직접 만든 열 (v81) */
    tblCols:(typeof tblCfgForDoc==='function'?tblCfgForDoc():{}),
    /* daily · cdaily · cdet 은 입력 시트에서 매번 다시 만들어지는 값이라 담지 않는다
       (특히 cdaily 는 소재 × 날짜 × 지표라 그대로 담으면 문서가 몇 배로 커진다) */
    lines:LINES.map(l=>{const o={...l};delete o.daily;delete o.cdaily;delete o.cdet;delete o.lsplit;delete o.ldays;delete o.landDom;return o;}),
    creatives:CREATIVES.map(stripCr),
    /* 소재 자료함 — 예상 효율을 지웠다 다시 넣어도 이미지가 살아 있게 (이름이 열쇠) */
    crAssets:(typeof crAssetsForSave==='function'?crAssetsForSave():{}),
    /* __sig 는 저장 상태 표시용 임시 값이라 문서에는 담지 않는다 (v58) */
    issues:ISSUES.map(x=>{const o={...x};delete o.__sig;return o;}),
    holidays:HOLIDAYS,bidTypes:BID_TYPES,verdictBand:VERDICT_BAND,
    /* 이 캠페인이 쓰는 사용자 열 — 공유받은 사람(광고주 · 다른 계정)도 같은 열로 보도록 (v57) */
    userCols:(typeof USER_COLS!=='undefined'?USER_COLS.map(x=>({...x})):[]),
    cols:{line:LINE_COLS,sheet:SHEET_COLS},
    /* 입력 시트를 그대로 담는다 — 일별 실적의 원본이라 이게 있어야 다시 열어도 남는다.
       **반드시 복사본으로** 넘긴다 — 원본 배열을 그대로 넘기면 문서를 적용하기 전에
       화면 상태를 비우는 순간(clearWorkState) 문서 안의 시트까지 같이 지워진다. */
    sheet:(typeof SHEET!=='undefined'?SHEET.map(r=>({...r})):[]),
    /* 운영 코멘트 본문 — v51 부터 문서에 같이 담는다.
       예전에는 어디에도 저장되지 않아 새로고침하면 사라졌다. */
    comment:(function(){try{const e=$('cmtBody');return e?e.innerHTML:'';}catch(x){return '';}})(),
    views:{summaries:SUMMARIES,mix:MIX_CFG,raw:RAW_CFG,rawSeg:RAW_SEG,rawHSeg:RAW_HSEG,
           /* 유입 분석 — 상세 표 구성 · 묶음 (v93) */
           inflow:(typeof INF_TBL!=='undefined'?INF_TBL:null),inflowDim:(typeof INF!=='undefined'?INF.dim:'media'),
           inflowSeg:(typeof INF!=='undefined'?!!INF.seg:false),   /* 유입 흐름 — 구분 포함 (v100) */
           gantt:GANTT,creative:CR_CFG,stat:STAT_CFG,bub:BUB,bubColors:BUB_COLORS,
           perfOrder:(typeof PERF_ORDER!=='undefined'?PERF_ORDER:'sum'),
           donutOrder:(typeof DONUT_ORDER!=='undefined'?DONUT_ORDER:{}),
           donutHide:(typeof DONUT_HIDE!=='undefined'?DONUT_HIDE:{}),
           /* 효율 우수 소재 — 매체 구분 없이 비교 토글 · 표시 기준(CTR 등) */
           crAllMedia:(typeof CR_ALL_MEDIA!=='undefined'?!!CR_ALL_MEDIA:false),
           /* 효율 우수 소재 — 매체 고르기 (v55) */
           crMedia:(typeof CR_FILTER!=='undefined'?(CR_FILTER.media||'all'):'all'),
           /* 효율 우수 소재 — 구분 고르기 (v59) */
           crSeg:(typeof CR_FILTER!=='undefined'?(CR_FILTER.segment||'all'):'all'),
           crRankOn:(typeof CR_RANK_ON!=='undefined'?CR_RANK_ON:null),
           ganttSort:(typeof GANTT_SORT!=='undefined'?GANTT_SORT:'budget'),
           /* 끌어서 바꾼 순서 — 일자별 비교 계열 · 일자별 상세 효율 세그먼트 */
           dailyOrder:(typeof DAILY_ORDER!=='undefined'?DAILY_ORDER:{}),
           rawOrder:(typeof RAW_ORDER!=='undefined'?RAW_ORDER:{}),
           rawHide:(typeof RAW_HIDE!=='undefined'?RAW_HIDE:{}),
           /* 노출 분포(트리맵) 의 기준 지표 · 묶음 · KPI 달성 현황 묶음 기준 */
           tmap:(typeof TMAP!=='undefined'?{metric:TMAP.metric,dims:(TMAP.dims||[]).slice()}:null),
           kpiGroup:(function(){try{const e=$('kpiGroupSel');return e?e.value:null;}catch(x){return null;}})(),
           heatDaily:(typeof HEAT_DAILY!=='undefined'?!!HEAT_DAILY:false),
           /* 일자별 효율 비교의 두 토글 — 예상 효율선 · 남은 기간 예측 (v51) */
           bench:(typeof SHOW_BENCH!=='undefined'?!!SHOW_BENCH:true),
           forecast:(typeof SHOW_FORECAST!=='undefined'?!!SHOW_FORECAST:true),
           /* 일자별 효율 비교 그래프 전용 필터 (v54) */
           dailyFilt:(typeof DAILY_FILT!=='undefined'?{...DAILY_FILT}:null),
           /* 트렌드 리포트를 광고주에게 보일지 (v66) */
           trendViewer:(typeof TREND_VIEWER!=='undefined'?!!TREND_VIEWER:true),
           /* 일자별 캠페인 효율 비교 — 데이터 선택 · 막대 값 · 꺾은선 값 (v65).
              예전에는 저장에 안 실려서 새로고침하면 매체 · 노출 · CTR 로 돌아갔다 */
           seriesDim:(typeof SERIES_DIM!=='undefined'?SERIES_DIM:null),
           barMetric:(typeof BAR_METRIC!=='undefined'?BAR_METRIC:null),
           lineMetric:(typeof LINE_METRIC!=='undefined'?LINE_METRIC:null),
           /* 영역 숨김 · 순서 (v49) */
           hidden:(typeof HIDDEN!=='undefined'?[...HIDDEN]:[]),
           sectOrder:(typeof SECT_ORDER!=='undefined'?SECT_ORDER.slice():[]),
           /* 전체 캠페인 › 소재 콜라주 보이기 (v83) */
           ovCollage:(typeof OV_COLLAGE!=='undefined'?!!OV_COLLAGE:true),
           /* 캠페인 진행 현황에서 숨긴 지표 (v82) */
           paceHide:(typeof PACE_HIDE!=='undefined'?PACE_HIDE.slice():[]),
           /* 조회 기간 (v71) — 마스터가 고른 기간을 광고주도 그대로 보도록. null 이면 기본 구간 */
           range:(typeof rangeForDoc==='function'?rangeForDoc():null)}
  };
}
/* keepToday=true 는 예시(샘플) 복원 전용 — 샘플은 만들어 둔 날짜 그대로 보여 준다.
   실제 캠페인은 저장된 날짜를 절대 쓰지 않는다. 저장본에 박힌 옛 날짜(예: 2026-09-25)를 되살리면
   "오늘"이 그 날로 굳어져 기간 필터 종료일이 계속 그 전날(9/24)로 잡혔다. */
/* 클립보드 복사 — navigator.clipboard 는 https(또는 localhost)가 아니면 막힌다.
   그럴 때를 대비해 숨긴 textarea + execCommand 로 한 번 더 시도한다. */
async function copyText(t){
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(t);return true;}
  }catch(e){}
  try{
    const ta=document.createElement('textarea');
    ta.value=t;ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();ta.setSelectionRange(0,ta.value.length);
    const ok=document.execCommand('copy');
    ta.remove();
    return ok;
  }catch(e){return false;}
}
function applyDoc(d,keepToday){
  if(!d||!d.lines)return;
  CAMPAIGN.name=d.campaign?.name||CAMPAIGN.name;
  CAMPAIGN.advertiser=d.campaign?.advertiser||'';
  CAMPAIGN.today=keepToday&&d.campaign?.today?d.campaign.today:todaySeoul();   /* 서울 날짜 (v78) */
  CAMPAIGN.advLogo=d.campaign?.advLogo||'';
  CAMPAIGN.bgMode=d.campaign?.bgMode||(d.campaign?.bgLogo===false?'none':'adv');
  /* 배경 움직임 (v56) — 없던 저장본은 지금까지의 동작(흘러다니기)으로 본다 */
  CAMPAIGN.bgMotion=d.campaign?.bgMotion==='still'?'still':'float';
  try{if(typeof applyBgMotion==='function')applyBgMotion();}catch(e){}
  delete CAMPAIGN.bgLogo;
  CAMPAIGN.agencyLogo=d.campaign?.agencyLogo||'';
  /* 운영 매체 · TV 데이터 (v71) — 예전 저장본은 디지털만 */
  {const m=d.campaign&&d.campaign.media;
   CAMPAIGN.media=(m&&(m.digital||m.tv||m.ooh))?{digital:!!m.digital,tv:!!m.tv,ooh:!!m.ooh}:{digital:true,tv:false,ooh:false};}
  {const mm=d.campaign&&d.campaign.menus;CAMPAIGN.menus=(mm&&typeof mm==='object')?JSON.parse(JSON.stringify(mm)):{};}
  try{if(typeof tvFromDoc==='function')tvFromDoc(d);}catch(e){}
  try{if(typeof oohFromDoc==='function')oohFromDoc(d);}catch(e){}
  try{if(typeof tblCfgFromDoc==='function')tblCfgFromDoc(d);}catch(e){}
  /* 전체 캠페인 — 다른 캠페인을 열었으니 다시 읽는다 */
  try{if(typeof OV!=='undefined')OV.key='';}catch(e){}
  /* 문서에 없으면 이 브라우저에 남겨 둔 대행사 로고를 쓴다 */
  try{if(!CAMPAIGN.agencyLogo&&typeof agencyLogo==='function')CAMPAIGN.agencyLogo=agencyLogo();}catch(e){}
  if(typeof applyTheme==='function')applyTheme(d.campaign?.theme||'',true);
  if(typeof renderBrand==='function')renderBrand();
  LINES=d.lines.map(l=>({...l,daily:{}}));
  migrateBudget(LINES);            /* 예전 net 기준 저장본을 Gross 기준으로 */
  if(typeof CR_ASSETS!=='undefined')CR_ASSETS=d.crAssets&&typeof d.crAssets==='object'?d.crAssets:{};
  CREATIVES=(d.creatives||[]).map(c=>({...c,daily:{}}));
  /* 지금 등록된 소재에 자료함을 다시 붙인다 (이름이 같으면 이미지가 되살아난다) */
  try{if(typeof crAssetRelink==='function'){CREATIVES.forEach(c=>crAssetSave(c));crAssetRelink();}}catch(e){}
  /* 문서에 담겨 온 사용자 열을 내 것과 합친다 (v57) —
     내가 만든 열은 그대로 두고, 이 캠페인에만 있던 열을 더한다 */
  if(Array.isArray(d.userCols)&&typeof regUserCols==='function'){
    try{const merged=ucMerge(USER_COLS,d.userCols);
      if(JSON.stringify(merged)!==JSON.stringify(USER_COLS)){saveUserCols(merged);regUserCols(merged);}
    }catch(e){}}
  /* 문서에서 온 이슈는 '저장된 상태'로 표시한다 */
  if(d.issues){ISSUES=d.issues;try{markIssuesSaved();}catch(e){}}
  if(d.holidays)HOLIDAYS=d.holidays;
  if(d.bidTypes)BID_TYPES=d.bidTypes;
  if(isFinite(d.verdictBand))VERDICT_BAND=d.verdictBand;
  if(d.cols?.line)LINE_COLS=mergeCols(d.cols.line,lineColsDefault());
  if(d.cols?.sheet)SHEET_COLS=mergeCols(d.cols.sheet,sheetColsDefault());
  /* 저장해 둔 입력 시트를 되살린다 (없으면 건드리지 않는다) */
  if(Array.isArray(d.sheet))SHEET=d.sheet.map(r=>({...r}));
  /* 운영 코멘트 (v51) */
  if(typeof d.comment==='string'){try{const e=$('cmtBody');
    if(e){e.innerHTML=d.comment;
      if(typeof CMT_SAVED!=='undefined')CMT_SAVED=d.comment;
      if(typeof cmtSnap==='function')cmtSnap();
      const cs=$('cmtState');if(cs)cs.textContent='';}}catch(x){}}
  const v=d.views||{};
  /* 조회 기간 (v71) — 실제 적용은 데이터가 다 붙은 뒤 resetDateFilter 가 한다 */
  try{DOC_RANGE=(v.range&&ISO_RE.test(v.range.from||'')&&ISO_RE.test(v.range.to||''))
      ?{from:v.range.from,to:v.range.to}:null;
    FILTER_TOUCHED=false;}catch(e){}
  /* v72 — 예전 구성에 남아 있는 수수료 · Net 열은 뺀다 */
  const dropCfg=c=>{try{(c&&c.groups||[]).forEach(g=>{if(Array.isArray(g.cols))g.cols=g.cols.filter(k=>!DROP_COLS.has(k));});}catch(e){}return c;};
  if(v.summaries){SUMMARIES=v.summaries;SUMMARIES.forEach(dropCfg);}
  if(v.mix)MIX_CFG=dropCfg(v.mix);
  /* 유입 분석 상세 표 (v93) — 없던 저장본은 기본 구성으로 (다른 캠페인 구성이 남지 않게) */
  try{INF_TBL=v.inflow&&Array.isArray(v.inflow.groups)?dropCfg(v.inflow):null;
    INF.dim=['media','product','creative'].includes(v.inflowDim)?v.inflowDim:'media';
    INF.seg=!!v.inflowSeg;INF.step=2;INF.mapSeg='';}catch(e){}
  if(v.raw)RAW_CFG=v.raw;
  if(v.rawSeg)RAW_SEG=v.rawSeg;
  if(v.rawHSeg)RAW_HSEG=v.rawHSeg;
  if(v.rawOrder&&typeof RAW_ORDER!=='undefined')RAW_ORDER=v.rawOrder;
  if(v.rawHide&&typeof RAW_HIDE!=='undefined')RAW_HIDE=v.rawHide;
  if(v.donutHide&&typeof DONUT_HIDE!=='undefined')DONUT_HIDE=v.donutHide;
  try{OV_COLLAGE=v.ovCollage!==false;if(typeof OVC!=='undefined')OVC.key='';}catch(e){}
  /* 캠페인 진행 현황 숨긴 지표 (v82) — 없던 저장본은 모두 보이게 */
  try{PACE_HIDE=Array.isArray(v.paceHide)?v.paceHide.filter(k=>typeof k==='string'):[];}catch(e){}
  if(typeof v.crAllMedia==='boolean'&&typeof CR_ALL_MEDIA!=='undefined')CR_ALL_MEDIA=v.crAllMedia;
  if(typeof v.crMedia==='string'&&typeof CR_FILTER!=='undefined')CR_FILTER.media=v.crMedia;
  if(typeof v.crSeg==='string'&&typeof CR_FILTER!=='undefined')CR_FILTER.segment=v.crSeg;
  if(Array.isArray(v.crRankOn)&&v.crRankOn.length&&typeof CR_RANK_ON!=='undefined')CR_RANK_ON=v.crRankOn;
  if(v.ganttSort&&typeof GANTT_SORT!=='undefined')GANTT_SORT=v.ganttSort;
  /* 저장해 둔 토글·기준을 화면 컨트롤에도 되돌려 놓는다 */
  try{const am=$('crAllMedia');if(am)am.classList.toggle('on',!!CR_ALL_MEDIA);
      if(typeof renderRankPick==='function')renderRankPick();}catch(e){}
  if(v.dailyOrder&&typeof DAILY_ORDER!=='undefined')DAILY_ORDER=v.dailyOrder;
  /* 노출 분포 기준 · KPI 묶음 기준도 되돌린다 (예전에는 새로고침하면 기본값으로 돌아갔다) */
  if(v.tmap&&typeof TMAP!=='undefined'){
    if(v.tmap.metric)TMAP.metric=v.tmap.metric;
    if(Array.isArray(v.tmap.dims)&&v.tmap.dims.length)TMAP.dims=v.tmap.dims.slice();
    try{const m=$('tmapMetric');if(m)m.value=TMAP.metric;
        const d2=$('tmapMode');if(d2)d2.value=TMAP.dims.join('|');}catch(e){}}
  if(v.kpiGroup){try{const g=$('kpiGroupSel');
    if(g&&[...g.options].some(o=>o.value===v.kpiGroup))g.value=v.kpiGroup;}catch(e){}}
  if(typeof v.heatDaily==='boolean'&&typeof HEAT_DAILY!=='undefined')HEAT_DAILY=v.heatDaily;
  /* 예상 효율선 · 예측선 토글 (v51) — 화면 버튼 표시까지 함께 되돌린다 */
  if(typeof v.bench==='boolean'&&typeof SHOW_BENCH!=='undefined')SHOW_BENCH=v.bench;
  if(typeof v.forecast==='boolean'&&typeof SHOW_FORECAST!=='undefined')SHOW_FORECAST=v.forecast;
  try{const bt=$('benchToggle');if(bt)bt.classList.toggle('on',SHOW_BENCH);
      const ft=$('fcToggle');if(ft)ft.classList.toggle('on',SHOW_FORECAST);}catch(e){}
  /* 일자별 효율 비교 그래프 전용 필터 (v54) */
  if(v.dailyFilt&&typeof DAILY_FILT!=='undefined'){
    DAILY_FILT={segment:'',media:'',product:'',...v.dailyFilt};
    try{paintDailyFiltBtn();}catch(e){}}
  if(typeof v.trendViewer==='boolean'&&typeof TREND_VIEWER!=='undefined'){
    TREND_VIEWER=v.trendViewer;try{paintTrendToggle();}catch(e){}}
  /* 데이터 선택 · 막대 값 · 꺾은선 값 (v65) — 지금 고를 수 있는 값일 때만 되돌린다.
     buildSelects 가 이 값들을 보고 드롭다운을 맞추므로 여기서 먼저 넣어 둔다. */
  try{
    if(v.seriesDim&&typeof SERIES_DIM!=='undefined'
      &&SERIES_DIMS.some(d=>d.k===v.seriesDim))SERIES_DIM=v.seriesDim;
    if(v.barMetric&&typeof BAR_METRIC!=='undefined'
      &&BAR_METRICS.includes(v.barMetric))BAR_METRIC=v.barMetric;
    if(v.lineMetric&&typeof LINE_METRIC!=='undefined'
      &&LINE_METRICS.includes(v.lineMetric))LINE_METRIC=v.lineMetric;
  }catch(e){}
  if(Array.isArray(v.sectOrder)&&typeof SECT_ORDER!=='undefined')SECT_ORDER=v.sectOrder.slice();
  if(Array.isArray(v.hidden)&&typeof HIDDEN!=='undefined'){
    HIDDEN.clear();v.hidden.forEach(k=>HIDDEN.add(k));}
  try{if(typeof applyHidden==='function')applyHidden();}catch(e){}
  if(v.perfOrder&&typeof PERF_ORDER!=='undefined'){PERF_ORDER=v.perfOrder;
    if(typeof applyPerfOrder==='function')applyPerfOrder();}
  if(v.gantt)GANTT=v.gantt;
  if(v.creative)CR_CFG=v.creative;
  if(v.stat)STAT_CFG=v.stat;
  if(v.bub)BUB=v.bub;
  if(v.bubColors)BUB_COLORS=v.bubColors;
  if(v.donutOrder&&typeof DONUT_ORDER!=='undefined')DONUT_ORDER=v.donutOrder;
}
/* 일별 실적 행 → 라인의 daily 배열 · 누적 a 로 되돌린다 */
function applyDaily(rows){
  SHEET_COVER=null;                       /* 서버에서 통째로 새로 채운다 (v78) */
  const byKey={};LINES.forEach(l=>{
    byKey[LINE_KEY(l)]=l;
    l.daily={};AMET.forEach(m=>l.daily[m]=new Array(TOTAL_DAYS).fill(0));
    l.a={};AMET.forEach(m=>l.a[m]=0);});
  (rows||[]).forEach(r=>{
    const l=byKey[r.line_key];if(!l)return;
    const i=Math.round((new Date(r.stat_date+'T00:00:00')-d0)/DAY);
    if(i<0||i>=TOTAL_DAYS)return;
    const src={...(r.extra||{}),imp:r.imp,click:r.click,view:r.view,eng:r.eng,conv:r.conv,
      lead:r.lead,install:r.install,rev:r.rev,net:r.net};
    AMET.forEach(m=>{const v=+src[m]||0;l.daily[m][i]+=v;l.a[m]+=v;});});
}
/* 데이터 입력 시트 → daily_stats upsert 행 */
const DAILY_COLS=['imp','click','view','eng','conv','lead','install','rev','net'];
/* daily_stats 의 기본키는 (캠페인 · 날짜 · 라인) 하나뿐이다.
   시트에서 같은 라인·같은 날짜를 소재별로 나눠 적으면 행이 여러 개 나오는데,
   그대로 upsert 하면 "ON CONFLICT DO UPDATE command cannot affect row a second time" 로 저장이 통째로 실패한다.
   → 저장 직전에 (날짜 × 라인) 으로 합쳐서 한 행만 보낸다. 소재별 구분은 doc 의 입력 시트에 그대로 남는다. */
function sheetToRows(){
  const by=new Map();
  SHEET.forEach(r=>{
    const l=rowLine(r);if(!l||!r.date)return;
    const key=r.date+''+LINE_KEY(l);
    let row=by.get(key);
    if(!row){
      row={campaign_id:CLOUD.campaign.id,stat_date:r.date,line_key:LINE_KEY(l),
        creative:'',extra:{}};
      DAILY_COLS.forEach(k=>row[k]=0);
      by.set(key,row);}
    DAILY_COLS.forEach(k=>{if(k!=='net')row[k]+=+r[k]||0;});
    /* 시트는 Gross 소진비용을 받고, 저장은 Net 기준(DB 열이 net)이다 */
    row.net+=((+r.cost||0)*(1-feeOf(l)))||0;
    if(+r.net&&!+r.cost)row.net+=+r.net||0;
    AMET.forEach(m=>{if(!DAILY_COLS.includes(m))row.extra[m]=(+row.extra[m]||0)+(+r[m]||0);});
    /* 사용자가 열 설정에서 새로 만든 열도 함께 보관 */
    SHEET_COLS.forEach(c=>{if(c.type==='num'&&!AMET.includes(c.k)&&!DAILY_COLS.includes(c.k))
      row.extra[c.k]=(+row.extra[c.k]||0)+(+r[c.k]||0);});
  });
  /* ⚠ DB 의 실적 열은 정수(bigint)다 (v78). 엑셀 서식만 정수이고 실제 값에 소수점이 있으면(1234.6)
     저장이 실패하는데, 그 전에 옛 일별 실적을 지워 버려 서버가 빈 채로 남았다 → 여기서 정수로 맞춘다 */
  const rows=[...by.values()];
  /* 원 단위 맞추기 (v79) — 라인마다 날짜순으로 누적값을 반올림한 차이를 담는다.
     행마다 따로 반올림하면 소수점 있는 소진비용의 합이 엑셀과 몇 원씩 어긋났다 */
  const byLine=new Map();
  rows.forEach(row=>{const a=byLine.get(row.line_key)||[];a.push(row);byLine.set(row.line_key,a);});
  byLine.forEach(list=>{list.sort((x,y)=>x.stat_date<y.stat_date?-1:x.stat_date>y.stat_date?1:0);
    DAILY_COLS.forEach(k=>{let acc=0,prev=0;
      list.forEach(row=>{acc+=(+row[k]||0);const c=Math.round(acc);row[k]=c-prev;prev=c;});});});
  return rows;
}


/* ===== 접속 화면 — 공유 코드 / 샘플 둘러보기 =====
   시행사가 캠페인마다 자동으로 받는 8자리 코드를 광고주에게 알려 주면
   로그인 없이 그 캠페인 대시보드를 "조회 전용(광고주 모드)"으로 볼 수 있다. */
const CODE_ALPHABET='ACDEFGHJKLMNPQRTUVWXY34679';   /* 헷갈리는 글자(I·O·0·1·S·5·B·8·2·Z) 제외 */
function makeShareCode(){
  let a='';for(let i=0;i<8;i++)a+=CODE_ALPHABET[Math.floor(Math.random()*CODE_ALPHABET.length)];
  return a.slice(0,4)+'-'+a.slice(4);}
const normCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)
  .replace(/^(.{4})(.{1,4})$/,'$1-$2');
/* 샘플(데모) 캠페인의 코드 — 클라우드가 없을 때 이 코드로도 들어올 수 있다 */
const SAMPLE_CODE='DEMO-2026';        /* 샘플 둘러보기 (시행사 화면) */
const SAMPLE_VIEW_CODE='VIEW-2026';   /* 샘플을 광고주 화면으로 보고 싶을 때 */
/* 처음 켰을 때의 예시 데이터를 그대로 떠 놓는다 —
   로그인·로그아웃을 거친 뒤 샘플로 돌아와도 새로고침 없이 다시 보여 주기 위해서.
   샘플은 이 스냅샷에서만 복원되므로 로그인 후 내 캠페인에는 절대 섞이지 않는다. */
let DEMO_SNAP=null;
(function keepDemo(){
  const grab=()=>{try{DEMO_SNAP=JSON.parse(JSON.stringify(serializeDoc()));
    DEMO_SNAP.__daily=LINES.map(l=>({k:LINE_KEY(l),daily:JSON.parse(JSON.stringify(l.daily))}));
  }catch(e){}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',grab):setTimeout(grab,0);
})();
/* ---------- 새로고침에도 남기기 ----------
   클라우드에 저장하지 않아도(또는 저장 전에 새로고침해도) 입력한 값이 사라지지 않도록
   이 브라우저에 마지막 상태를 적어 둔다. 캠페인마다 따로 저장한다. */
const LS_KEY=()=>'dmd:doc:'+((CLOUD&&CLOUD.campaign&&CLOUD.campaign.id)||'local');
let LS_T=null;
/* 일별 실적은 doc(설정 문서)에 넣지 않는다 — 클라우드에서는 daily_stats 테이블이 원본이기 때문.
   대신 브라우저 저장본에만 따로 담는다. 이게 없으면 새로고침할 때 라인의 daily 가 비고
   입력 시트에 적힌 줄만 살아남아 화면이 텅 비어 보였다. */
function packDaily(){
  return LINES.map(l=>{
    const d={};
    AMET.forEach(m=>{const a=l.daily&&l.daily[m];
      if(Array.isArray(a)&&a.some(v=>+v))d[m]=a.map(v=>Math.round((+v||0)*1000)/1000);});
    return {k:LINE_KEY(l),d};});
}
function unpackDaily(list){
  if(!Array.isArray(list)||!list.length)return false;
  const by={};list.forEach(x=>{if(x&&x.k)by[x.k]=x.d||{};});
  let hit=0;
  LINES.forEach(l=>{
    const d=by[LINE_KEY(l)];if(!d)return;hit++;
    l.daily=l.daily||{};l.a=l.a||{};
    AMET.forEach(m=>{
      if(!Array.isArray(l.daily[m]))l.daily[m]=[];
      const src=d[m];
      for(let i=0;i<TOTAL_DAYS;i++)l.daily[m][i]=src?(+src[i]||0):(+l.daily[m][i]||0);
      l.daily[m].length=TOTAL_DAYS;
      l.a[m]=sum(l.daily[m]);});});
  return hit>0;
}
const lsPack=()=>JSON.stringify({t:Date.now(),doc:serializeDoc(),daily:packDaily()});
function saveLocal(){
  clearTimeout(LS_T);
  LS_T=setTimeout(()=>{try{localStorage.setItem(LS_KEY(),lsPack());}catch(e){}},500);
}
function loadLocal(){
  try{
    const raw=localStorage.getItem(LS_KEY());if(!raw)return false;
    const o=JSON.parse(raw);if(!o||!o.doc||!o.doc.lines)return false;
    applyDoc(o.doc);
    SHEET_COVER=null;DAILY_D0=null;       /* 불러오기 — 날짜 밀기 없이 새로 맞춘다 (v78) */
    rebuildPeriod();resetDateFilter();
    unpackDaily(o.daily);                 /* 저장해 둔 일별 실적을 먼저 되살리고 */
    if(typeof applySheet==='function')applySheet();   /* 시트에 적힌 날짜만 덮어쓴다 */
    /* ⚠ 조회 기간은 **데이터가 다 올라온 뒤에** 다시 잡는다 (v60).
     예전에는 applyDoc 직후(시트·일별 실적이 붙기 전)에 한 번만 잡아서
     종료일이 옛 값(어제)에 눌러앉았다. 사람이 직접 고른 적이 있으면 resetDateFilter 가 알아서 비켜 준다. */
  buildFacts();resetDateFilter();renderEverything();
    return true;
  }catch(e){return false;}
}
function clearLocal(){try{localStorage.removeItem(LS_KEY());}catch(e){}}
/* 값이 바뀔 때마다 조용히 적어 둔다 */
addEventListener('beforeunload',()=>{try{localStorage.setItem(LS_KEY(),lsPack());}catch(e){}});
function restoreDemo(){
  if(!DEMO_SNAP)return false;
  clearWorkState();
  applyDoc(DEMO_SNAP,true);
  rebuildPeriod();resetDateFilter(true);
  const by={};(DEMO_SNAP.__daily||[]).forEach(x=>by[x.k]=x.daily);
  LINES.forEach(l=>{const d=by[LINE_KEY(l)];if(d)l.daily=JSON.parse(JSON.stringify(d));});
  /* ⚠ 조회 기간은 **데이터가 다 올라온 뒤에** 다시 잡는다 (v60).
     예전에는 applyDoc 직후(시트·일별 실적이 붙기 전)에 한 번만 잡아서
     종료일이 옛 값(어제)에 눌러앉았다. 사람이 직접 고른 적이 있으면 resetDateFilter 가 알아서 비켜 준다. */
  buildFacts();resetDateFilter();renderEverything();
  clearLocal();
  return true;
}
const gateEl=()=>$('gate');
/* 게이트(접속 화면)만 감춘다. 가림막(booting)은 **실제 데이터가 화면에 올라간 뒤에** 걷는다 —
   그러지 않으면 내 캠페인을 불러오는 동안 예시 데이터가 잠깐 보인다. */
function hideGate(){const g=gateEl();if(g)g.classList.add('hidden');}
/* 가림막 걷기 — 화면이 실제로 그려진 다음 프레임에 */
function startBoot(){try{document.body.classList.add('booting');}catch(e){}}
function endBoot(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.body.classList.remove('booting');}));
}
function gateMsg(t,ok){const m=$('gateMsg');if(!m)return;m.textContent=t||'';m.classList.toggle('ok',!!ok);}
/* 코드로 들어온 사람 —
   뷰어 코드  → 광고주 (대시보드 열람 + 엑셀 다운로드만)
   운영진 코드 → 운영진 (그 캠페인 안에서는 마스터와 동등, 저장은 구글 로그인 후) */
function enterShareView(name,kind){
  CLOUD.shareView=true;CLOUD.shareRole=kind||'viewer';
  if(name&&!CLOUD.campaign)CLOUD.campaign={id:null,name};
  hideGate();endBoot();
  try{paintMockBadge();}catch(e){}       /* 뷰어 화면에는 더미 배지를 남기지 않는다 (v53) */
  if(typeof applyRole==='function')applyRole();
  /* 상단바 캠페인 이름·광고주 표시를 지금 열린 캠페인으로 맞춘다 */
  try{paintCampSel();renderBrand&&renderBrand();renderCampBar&&renderCampBar();}catch(e){}
  const bar=$('demoBar');if(bar)bar.classList.add('hidden');
  cloudState(kind==='staff'
    ? `${name||CAMPAIGN.name} · 운영진 코드로 접속 — 저장하려면 구글 로그인이 필요합니다`
    : `${name||CAMPAIGN.name} · 뷰어 코드로 열람 (조회 전용)`);
  try{urlSettled();}catch(e){}
}
/* 샘플 둘러보기는 시행사 전용 — 데이터 입력 · 캠페인 설정까지 다 열어 둔다.
   (공유 코드로 들어온 광고주와 달리 화면 전체를 둘러볼 수 있어야 하기 때문) */
function enterSample(){
  CLOUD.shareView=false;CLOUD.sample=true;CLOUD.campaign=null;CLOUD.role=null;
  /* 로그인·로그아웃을 거쳐 화면이 비어 있을 수 있으므로 예시 데이터를 되살린다 */
  restoreDemo();
  /* 샘플은 언제나 무채색 화이트로 (v53) */
  try{if(typeof applyTheme==='function')applyTheme('mono',true);}catch(e){}
  hideGate();
  try{paintMockBadge();}catch(e){}
  if(typeof applyRole==='function')applyRole();
  cloudState('샘플 데이터 둘러보기 · 시행사 화면');
  endBoot();
  const bar=$('demoBar');
  if(bar&&!sessionStorage.getItem('demoBarHidden'))bar.classList.remove('hidden');
  try{urlSettled();}catch(e){}
}
/* 코드 확인 — 클라우드가 있으면 RPC(open_by_code)로, 없으면 샘플 코드만 */
async function tryCode(raw){
  const code=normCode(raw);
  if(code.replace('-','').length<8){gateMsg('8자리 코드를 모두 입력해 주세요.');return false;}
  CLOUD.shareCode=code;CLOUD.advList=[];                  /* 주소창에 실을 코드 (syncUrl) */
  if(code===SAMPLE_CODE){enterSample();return true;}
  if(code===SAMPLE_VIEW_CODE){enterShareView('샘플 캠페인','viewer');return true;}
  if(!CLOUD.on){
    gateMsg('그런 코드를 찾지 못했습니다. 시행사에서 받은 코드를 다시 확인해 주세요.');return false;}
  gateMsg('확인 중…',true);
  const seq=++OPEN_SEQ;                  /* 캠페인 열기 순번 (v80) — openCampaign 과 같은 규칙 */
  const {data,error}=await CLOUD.sb.rpc('open_by_code',{p_code:code});
  const c=Array.isArray(data)?data[0]:data;
  if(seq!==OPEN_SEQ)return false;
  if(error||!c){gateMsg('그런 코드를 찾지 못했습니다. 시행사에서 받은 코드를 다시 확인해 주세요.');return false;}
  const kind=c.code_kind==='staff'?'staff':'viewer';
  /* 일별 실적까지 받아 둔 뒤 한 번에 갈아 끼운다 (v80) */
  const {data:rows}=await CLOUD.sb.rpc('stats_by_code',{p_code:code});
  if(seq!==OPEN_SEQ)return false;
  CLOUD.campaign={id:c.id,name:c.name};
  CLOUD.role=kind==='staff'?'editor':'viewer';
  CLOUD.dirty=false;
  /* 코드로 연 화면도 저장 시각을 알아 둔다 (로그인해 있고 볼 수 있을 때만 — 없으면 예전처럼 검사 없이 저장) */
  CLOUD.baseAt=null;CLOUD.conflict=false;
  if(CLOUD.user){try{const {data:ua}=await CLOUD.sb.from('campaigns').select('updated_at').eq('id',c.id).maybeSingle();
    if(seq!==OPEN_SEQ)return false;if(ua&&ua.updated_at)CLOUD.baseAt=ua.updated_at;}catch(e){}}
  /* 이 브라우저에 남아 있던 다른 캠페인의 입력 시트·소재·이슈를 먼저 비운다.
     (예전에는 이걸 빼먹어서 운영진 코드로 들어가면 데이터 입력 탭에
      전에 보던 캠페인의 시트가 그대로 남아 있었다) */
  clearWorkState();
  applyDoc(c.doc);
  DOC_CID=c.id;
  rebuildPeriod();resetDateFilter(true);
  if(rows&&rows.length)applyDaily(rows);
  /* 저장해 둔 입력 시트가 있으면 그걸로 일별 실적을 다시 채운다 (시트가 원본) */
  try{if(Array.isArray(c.doc&&c.doc.sheet)&&c.doc.sheet.length&&typeof applySheet==='function')applySheet();}catch(e){}
  CREATIVES.forEach(c2=>{const cs=CREATIVES.filter(x=>x.lid===c2.lid);
    if(!c2.run)c2.run=[[0,Math.max(TOTAL_DAYS-1,0)]];
    if(!isFinite(c2.share))c2.share=1/Math.max(cs.length,1);});
  /* ⚠ 공유 코드 경로에만 v60 의 "데이터가 다 붙은 뒤 조회 기간 다시 잡기" 가 빠져 있었다 (v71).
     일별 실적이 붙기 전에 잡은 종료일(=실적 없음 → 시작일)이 그대로 남아
     광고주 화면이 엉뚱한 기간으로 열릴 수 있었다. 저장된 조회 기간(DOC_RANGE)도 여기서 적용된다. */
  buildFacts();resetDateFilter();
  renderEverything();
  try{renderCampForm&&renderCampForm();}catch(e){}
  enterShareView(c.name,kind);
  endBoot();
  /* 운영진 코드는 다음 로그인 때 정식 멤버로 등록할 수 있게 기억해 둔다 */
  if(kind==='staff'){try{sessionStorage.setItem('staffCode',code);}catch(e){}}
  /* 운영진 코드는 주소창에 싣지 않는다(복사해 보내도 권한이 퍼지지 않게) — 같은 탭 새로고침만 이어 준다 (v75) */
  try{if(kind==='staff')sessionStorage.setItem('staffResume',code);else sessionStorage.removeItem('staffResume');}catch(e){}
  /* 같은 광고주의 캠페인 목록 (v82 — 권한은 광고주 단위) — 상단 캠페인 고르기에서 옮겨 갈 수 있게 */
  loadAdvList(code);
  return true;
}
/* 코드로 들어온 사람의 "같은 광고주 캠페인" 목록 — 서버 함수(adv_campaigns_by_code)가 없으면 지금 캠페인만 */
async function loadAdvList(code){
  CLOUD.advList=[];
  if(!CLOUD.on||!code||code===SAMPLE_CODE||code===SAMPLE_VIEW_CODE)return;
  try{const {data,error}=await withTimeout(CLOUD.sb.rpc('adv_campaigns_by_code',{p_code:code}),15000,'광고주 캠페인 목록');
    if(!error&&Array.isArray(data)&&CLOUD.shareCode===code)CLOUD.advList=data;}catch(e){}
  try{paintCampSel();}catch(e){}}
/* 코드로 다른 캠페인 열기 — 같은 광고주 캠페인 사이를 옮겨 다닌다 */
async function switchByCode(code){
  if(!code||code===CLOUD.shareCode)return true;
  startBoot();
  let ok=false;try{ok=await tryCode(code);}catch(e){}
  if(!ok){endBoot();try{paintCampSel();}catch(e){}
    confirmModal('캠페인을 열지 못했습니다.','잠시 후 다시 시도해 주세요.',()=>{},'확인');}
  return ok;}
/* 게이트를 쓸 수 있는 상태로 (로그인 세션이 없을 때만 보인다) */
function gateReady(){
  const g=gateEl();if(!g)return;
  const lg=$('gateLogo'),tb=document.querySelector('.topbar .logo .mark');
  if(lg&&tb)lg.src=tb.src;
  const hint=$('gateHint');
  if(hint)hint.innerHTML=`코드는 두 가지입니다 — <b>운영진 코드</b>는 데이터 수정까지, `
    +`<b>뷰어 코드</b>는 대시보드 열람과 엑셀 다운로드만 됩니다. 코드 하나로 같은 광고주의 다른 캠페인도 볼 수 있습니다.`
    +`<br>둘러보기용 샘플 코드 <code>${SAMPLE_CODE}</code> (시행사 화면) · `
    +`<code>${SAMPLE_VIEW_CODE}</code> (광고주 화면)`;
  const inp=$('gateCode');
  if(inp){
    inp.oninput=e=>{const p=e.target.selectionStart;e.target.value=normCode(e.target.value);
      gateMsg('');if(p>=e.target.value.length)e.target.setSelectionRange(99,99);};
    inp.onkeydown=e=>{if(e.key==='Enter')tryCode(inp.value);};
    setTimeout(()=>inp.focus(),120);}
  const go=$('gateGo');if(go)go.onclick=()=>tryCode($('gateCode').value);
  const sm=$('gateSample');if(sm)sm.onclick=enterSample;
  const li=$('gateLogin');if(li)li.onclick=()=>{
    if(!CLOUD.on){gateMsg('클라우드가 설정되지 않아 지금은 샘플만 볼 수 있습니다.');return;}
    signInGoogle();};
  const qs=new URLSearchParams(location.search);
  /* 내려받은 파일을 그대로 열어 볼 때(file:// · localhost)는 ?nogate=1 로 건너뛸 수 있다.
     게시된 주소에서는 동작하지 않는다. */
  const local=location.protocol==='file:'||/^(localhost|127\.|\[::1\])/.test(location.hostname);
  if(local&&qs.has('nogate')){
    hideGate();
    /* 새로고침해도 입력한 값이 남아 있게 — 이 브라우저에 적어 둔 마지막 상태를 되살린다 */
    setTimeout(()=>{try{loadLocal();}catch(e){}endBoot();try{urlSettled();}catch(e){}},0);
    return;}
  /* 주소에 ?code=XXXX 가 있으면 바로 열어 준다 */
  let q=qs.get('code');
  /* 운영진 코드로 보던 탭을 새로고침한 경우 — 주소에는 코드가 없으므로 이 탭에 적어 둔 코드로 이어 연다 (v75) */
  if(!q){try{q=sessionStorage.getItem('staffResume')||'';}catch(e){q='';}}
  if(q){if(inp)inp.value=normCode(q);tryCode(q);}
}

/* 로고를 누르면 첫 화면(접속 화면)으로 — 저장하지 않은 내용이 있으면 한 번 묻는다 */
function goHome(){
  const home=()=>{try{sessionStorage.removeItem('staffResume');}catch(e){}location.href=location.pathname+'?lang='+LANG;};
  if(CLOUD.shareView&&!CLOUD.user){home();return;}     /* 조회 전용은 잃을 게 없다 */
  confirmModal('첫 화면으로 돌아갈까요?',
    '저장하지 않은 내용은 사라집니다. 먼저 ☁ 저장을 눌러 주세요.',home,'첫 화면으로');
}
(function wireLogo(){
  const go=()=>{const l=document.querySelector('.topbar .logo');
    if(l){l.title='첫 화면으로';l.onclick=goHome;}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);
})();

/* ---------- 세션 ---------- */
async function cloudInit(){
  const CFG=cfgOf();
  if(window.__offline||window.__noSupabase||window.__noConfig||!CFG||!CFG.url||!CFG.anonKey
     ||typeof supabase==='undefined'||!supabase.createClient){
    cloudState('데모 모드 · 클라우드 미설정');gateReady();endBoot();return;}
  CLOUD.sb=supabase.createClient(CFG.url,CFG.anonKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  CLOUD.on=true;
  CLOUD.sb.auth.onAuthStateChange((_e,session)=>{
    const u=session?.user||null;
    if(u&&(!CLOUD.user||CLOUD.user.id!==u.id)){CLOUD.user=u;afterSignIn();}
    else if(!u&&CLOUD.user){CLOUD.user=null;CLOUD.signedFor=null;paintAuth();cloudState('로그아웃됨 · 데모 모드');}});
  const {data}=await CLOUD.sb.auth.getSession();
  /* afterSignIn 은 같은 계정에 한 번만 돈다 (v80) — 로그인 이벤트와 세션 확인이 둘 다 부르면
     캠페인 목록 · 열기가 두 번 겹쳐 돌았다 */
  if(data?.session?.user){CLOUD.user=data.session.user;hideGate();await afterSignIn();}
  else{paintAuth();cloudState('로그인하면 내 캠페인이 열립니다');gateReady();endBoot();}
}
async function signInGoogle(){
  if(!CLOUD.on){alert('클라우드가 설정되지 않았습니다. config.js 의 Supabase URL / anon key 를 확인해 주세요.');return;}
  /* 돌아왔을 때 같은 캠페인 · 메뉴 · 언어로 — 주소 뒤를 적어 둔다 (restoreReturnUrl, p3) */
  try{sessionStorage.setItem('dmd:return',location.search||'');}catch(e){}
  await CLOUD.sb.auth.signInWithOAuth({provider:'google',
    options:{redirectTo:location.href.split('#')[0].split('?')[0],
             queryParams:{prompt:'select_account'}}});
}
async function signOutCloud(){
  if(!CLOUD.on)return;
  await CLOUD.sb.auth.signOut();
  CLOUD.user=null;CLOUD.campaign=null;CLOUD.role=null;CLOUD.list=[];CLOUD.signedFor=null;DOC_CID=null;
  CLOUD.shareView=false;CLOUD.sample=false;CLOUD.shareRole=null;CLOUD.appRole='guest';
  paintAuth();paintCampSel();cloudState('로그아웃됨');
  const g=gateEl();if(g)g.classList.remove('hidden');
  try{sessionStorage.removeItem('staffResume');}catch(e){}
  gateReady();
  try{syncUrl();}catch(e){}
}
async function afterSignIn(){
  const u=CLOUD.user;
  if(!u)return;
  if(CLOUD.signedFor===u.id)return CLOUD.signInP;
  CLOUD.signedFor=u.id;
  CLOUD.signInP=afterSignIn0();
  return CLOUD.signInP;
}
async function afterSignIn0(){
  const u=CLOUD.user;
  CLOUD.shareView=false;CLOUD.sample=false;CLOUD.shareRole=null;hideGate();
  /* 프로필 upsert — 트리거가 없어도 이름/이메일이 채워지도록 */
  await CLOUD.sb.from('profiles').upsert({
    id:u.id,email:u.email,
    name:u.user_metadata?.full_name||u.user_metadata?.name||u.email,
    avatar_url:u.user_metadata?.avatar_url||null},{onConflict:'id'});
  /* 가입 후에 받은 초대도 로그인 시점에 자동으로 수락된다 */
  try{await CLOUD.sb.rpc('accept_my_invites');}catch(err){}
  /* 운영진 코드로 들어와 있던 사람이 로그인하면 그 캠페인의 정식 운영진이 된다 */
  try{const sc=sessionStorage.getItem('staffCode');
    if(sc){await CLOUD.sb.rpc('join_by_staff_code',{p_code:sc});sessionStorage.removeItem('staffCode');}
  }catch(err){}
  /* 계정 등급 (슈퍼마스터 / 마스터 / 게스트) */
  try{const {data}=await CLOUD.sb.from('profiles').select('app_role').eq('id',u.id).maybeSingle();
    CLOUD.appRole=data?.app_role||'guest';}catch(err){CLOUD.appRole='guest';}
  /* 내가 만든 열 — 계정에 붙어 있어 어느 캠페인에서도 · 어느 기기에서도 그대로 (v57).
     profiles.prefs 열이 아직 없는 서버에서도 깨지지 않도록 조용히 넘어간다. */
  await pullUserCols();
  paintAuth();
  applyRoleLock();
  await loadCampaignList();
  /* 아직 등급이 없고 참여 중인 캠페인도 없으면 권한을 요청하도록 안내 */
  if(CLOUD.appRole==='guest'&&!CLOUD.list.length)openAccessRequest();
  /* 열 캠페인이 있으면 openCampaign 이 가림막을 걷는다. 없으면 여기서 걷는다. */
  if(!CLOUD.list.length)endBoot();
}
/* ---------- 마스터 권한 요청 (게스트 → 슈퍼마스터에게) ---------- */
async function openAccessRequest(){
  if(!CLOUD.on||!CLOUD.user)return;
  let prev=null;
  try{const {data}=await CLOUD.sb.from('access_requests')
    .select('status,message,created_at').eq('user_id',CLOUD.user.id)
    .order('created_at',{ascending:false}).limit(1);
    prev=data&&data[0];}catch(err){}
  if(prev&&prev.status==='pending'){
    confirmModal('권한 요청이 접수되어 있습니다.',
      `보내신 메시지 — “${prev.message||'(내용 없음)'}”\n승인되면 캠페인을 만들 수 있습니다.`,
      ()=>{},'확인');return;}
  openModal('캠페인 권한 요청',
    `<div class="notice" style="margin-bottom:12px"><span>ⓘ</span><div>
       이 계정에는 아직 <b>캠페인을 만들 권한</b>이 없습니다.
       아래에 <b>소속과 용도</b>를 적어 보내 주시면 확인 후 <b>마스터 권한</b>을 드립니다.<br>
       특정 캠페인만 보시는 분은 요청 대신 시행사에서 <b>운영진 코드</b> 또는 <b>뷰어 코드</b>를 받으시면 됩니다.</div></div>
     <div class="fld"><label>소속 · 이름</label>
       <input id="arOrg" placeholder="예: 미디어웍스 / 윤석진" style="width:100%"></div>
     <div class="fld" style="margin-top:10px"><label>요청 메시지</label>
       <textarea id="arMsg" rows="4" placeholder="예: 하반기 브랜드 캠페인 운영을 맡고 있어 캠페인 생성 권한이 필요합니다."
         style="width:100%;resize:vertical"></textarea></div>
     <div class="hint" id="arMsgOut" style="margin-top:8px">보낸 요청은 슈퍼마스터 화면에 그대로 표시됩니다.</div>`,
    '<button class="btn" data-close>나중에</button><button class="btn primary" id="arGo">요청 보내기</button>',{w:620});
  $('arGo').onclick=async()=>{
    const org=($('arOrg').value||'').trim(),msg=($('arMsg').value||'').trim();
    if(!msg){$('arMsgOut').textContent='요청 메시지를 적어 주세요.';return;}
    if(org){try{await CLOUD.sb.from('profiles').update({org}).eq('id',CLOUD.user.id);}catch(err){}}
    const {error}=await CLOUD.sb.rpc('request_access',{p_message:(org?org+' — ':'')+msg});
    if(error){$('arMsgOut').textContent='보내지 못했습니다: '+error.message;return;}
    closeModal();
    confirmModal('요청을 보냈습니다.','승인되면 캠페인을 만들 수 있습니다. 잠시만 기다려 주세요.',()=>{},'확인');};
}
/* ---------- 슈퍼마스터 · 계정 관리 ---------- */
async function openAccounts(){
  if(!CLOUD.on||!CLOUD.user||CLOUD.appRole!=='super'){
    confirmModal('슈퍼마스터만 열 수 있습니다.','계정 등급 관리는 슈퍼마스터 계정에서만 가능합니다.',()=>{},'확인');return;}
  const [{data:reqs},{data:accs}]=await Promise.all([
    CLOUD.sb.from('access_requests').select('*').order('created_at',{ascending:false}),
    CLOUD.sb.rpc('list_accounts')]);
  const pend=(reqs||[]).filter(r=>r.status==='pending');
  let h=`<div class="notice" style="margin-bottom:12px"><span>ⓘ</span><div>
      <b>슈퍼마스터</b>만 마스터 권한을 주거나 뺏을 수 있습니다.
      마스터는 <b>본인이 만든 캠페인만</b> 보고 관리하며, 다른 사람에게 마스터 권한을 줄 수 없습니다.</div></div>`;
  h+=`<div style="font-weight:700;margin:4px 0 8px">권한 요청 <span class="cnt2">${pend.length}건 대기</span></div>`;
  if(!pend.length)h+='<div class="card" style="padding:16px;text-align:center;color:var(--muted)">대기 중인 요청이 없습니다.</div>';
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:150px">이름</th><th style="width:200px">이메일</th><th>요청 메시지</th>
      <th style="width:110px">보낸 날</th><th style="width:150px"></th></tr></thead><tbody>`;
    pend.forEach(r=>{h+=`<tr><td>${esc(r.name||'–')}</td><td>${esc(r.email||'–')}</td>
      <td style="text-align:left">${esc(r.message||'–')}</td>
      <td class="mono">${(r.created_at||'').slice(0,10)}</td>
      <td><button class="btn sm primary" data-ok="${r.id}">마스터 승인</button>
        <button class="btn sm danger" data-no="${r.id}">거절</button></td></tr>`;});
    h+='</tbody></table>';}
  h+=`<div style="font-weight:700;margin:18px 0 8px">계정 목록</div>
    <table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="width:150px">이름</th><th style="width:210px">이메일</th><th style="width:150px">소속</th>
      <th style="width:110px">등급</th><th style="width:90px">캠페인</th>
      <th style="width:130px"></th></tr></thead><tbody>`;
  (accs||[]).forEach(a=>{
    const me=a.id===CLOUD.user.id;
    h+=`<tr><td>${esc(a.name||'–')}</td><td>${esc(a.email||'–')}</td><td>${esc(a.org||'–')}</td>
      <td><span class="tagchip ${a.app_role==='guest'?'':'on'}">${APP_ROLE_LABEL[a.app_role]||a.app_role}</span></td>
      <td class="mono">${a.campaigns||0}</td>
      <td>${a.app_role==='super'||me?'<span class="hint">–</span>'
        :a.app_role==='master'
          ?`<button class="btn sm danger" data-drop="${a.id}">마스터 해제</button>`
          :`<button class="btn sm" data-up="${a.id}">마스터 부여</button>`}</td></tr>`;});
  h+='</tbody></table>';
  openModal('계정 · 등급 관리 (슈퍼마스터)',h,'<button class="btn" data-close>닫기</button>',{w:1060});
  const host=$('modalHost'),again=()=>{closeModal();openAccounts();};
  host.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('decide_access',{p_request:b.dataset.ok,p_approve:true});again();});
  host.querySelectorAll('[data-no]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('decide_access',{p_request:b.dataset.no,p_approve:false});again();});
  host.querySelectorAll('[data-up]').forEach(b=>b.onclick=async()=>{
    await CLOUD.sb.rpc('set_app_role',{p_user:b.dataset.up,p_role:'master'});again();});
  host.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>
    confirmModal('마스터 권한을 해제할까요?','이 계정은 더 이상 캠페인을 만들 수 없습니다. 이미 만든 캠페인은 남습니다.',
      async()=>{await CLOUD.sb.rpc('set_app_role',{p_user:b.dataset.drop,p_role:'guest'});again();},'해제'));
}
function paintAuth(){
  const u=CLOUD.user;
  const av=$('meAvatar'),si=$('signIn'),bar=$('demoBar');
  const mail=$('meMail'),nameEl=$('meName'),sub=$('meSub'),wrap=$('meWrap'),menu=$('meMenu');
  if(u){
    const nm=u.user_metadata?.full_name||u.email||'';
    av.textContent=(nm[0]||'U').toUpperCase();
    if(mail)mail.textContent=u.email||nm;
    if(nameEl)nameEl.textContent=nm;
    if(sub)sub.textContent=`${u.email||''} · ${APP_ROLE_LABEL[CLOUD.appRole]||'게스트'}`;
    {const mb=$('meBtn');if(mb)mb.title=(nm&&nm!==u.email?nm+' · ':'')+(u.email||'');}
    si.classList.add('hidden');
    if(wrap)wrap.classList.remove('hidden');
    if(bar)bar.classList.add('hidden');
  }else{
    av.textContent='GU';
    if(mail)mail.textContent='게스트';
    if(nameEl)nameEl.textContent='게스트';
    if(sub)sub.textContent='로그인하지 않음';
    si.classList.remove('hidden');
    /* 로그인하지 않았으면 계정 버튼(=로그아웃 메뉴)은 숨긴다 */
    if(wrap)wrap.classList.add('hidden');
    if(bar&&!sessionStorage.getItem('demoBarHidden'))bar.classList.remove('hidden');}
  if(menu)menu.classList.add('hidden');
  if(typeof applyRoleLock==='function')applyRoleLock();
}

/* ---------- 캠페인 목록 · 열기 ---------- */
async function loadCampaignList(listOnly){
  /* RLS 가 내가 멤버인 캠페인만 돌려준다 (할당받은 캠페인만 보이는 구조) */
  const {data,error}=await CLOUD.sb.from('campaigns')
    .select('id,name,advertiser,start_date,end_date,updated_at,share_code,staff_code,created_by')
    .order('updated_at',{ascending:false});
  if(error){cloudState('목록을 불러오지 못했습니다: '+error.message);return;}
  CLOUD.list=data||[];
  paintCampSel();
  if(listOnly)return;
  /* 주소에 코드가 있으면(링크로 들어온 경우) 그 캠페인을 연다 — 내가 멤버면 내 권한으로 (v75) */
  const UB=urlBoot(),bc=UB.code?normCode(UB.code):'';UB.code='';
  const isSample=bc===SAMPLE_CODE||bc===SAMPLE_VIEW_CODE;
  const hit=bc&&CLOUD.list.find(c=>normCode(c.share_code||'')===bc||normCode(c.staff_code||'')===bc);
  if(hit){await openCampaign(hit.id);return;}
  /* 멤버가 아닌 캠페인의 링크 — 코드 권한(뷰어/운영진)으로 연다 */
  if(bc&&!isSample){try{if(await tryCode(bc))return;}catch(e){}}
  if(CLOUD.list.length)await openCampaign(CLOUD.list[0].id);
  else{
    /* 로그인은 했는데 캠페인이 없다 → 데모 데이터를 계속 보여 주면
       그대로 저장돼 버리므로 빈 캠페인으로 비운다 */
    resetToBlank('새 캠페인','');
    cloudState('캠페인이 없습니다 · ＋ 새 캠페인으로 시작하세요');}
}
function paintCampSel(){
  const s=$('campSel');if(!s)return;
  /* 공유 코드로 들어온 화면 — 지금 열려 있는 그 캠페인 하나만 보여 주고 바꿀 수 없게 한다.
     (예전에는 접속 화면에서 그려 둔 "…(데모)" 가 그대로 남아 상단바만 딴 캠페인을 가리켰다) */
  if(CLOUD.shareView){
    /* v82 — 권한은 광고주 단위: 같은 광고주 캠페인이 여럿이면 그 안에서 고를 수 있다 */
    const al=CLOUD.advList||[],cid=CLOUD.campaign&&CLOUD.campaign.id;
    if(al.length>1){
      s.innerHTML=al.map(c=>`<option value="code:${esc(c.code||'')}"${c.id===cid?' selected':''}>${esc(c.name||'')}</option>`).join('');
      s.disabled=false;return;}
    s.innerHTML=`<option>${esc((CLOUD.campaign&&CLOUD.campaign.name)||CAMPAIGN.name)}</option>`;
    s.disabled=true;return;}
  s.disabled=false;
  if(!CLOUD.user){
    s.innerHTML=`<option>${esc(CAMPAIGN.name)}${CLOUD.sample?' (샘플)':' (데모)'}</option>`;return;}
  /* 목록 맨 아래 — 고르면 설정의 "캠페인 관리" 화면이 그대로 열린다 */
  /* 광고주 - 캠페인명 순으로 (v70) — 같은 광고주 캠페인이 여러 개면 목록에서 바로 갈린다 */
  const campLabel=c=>{const a=(c.advertiser||(c.doc&&c.doc.campaign&&c.doc.campaign.advertiser)||'').trim();
    return a&&!String(c.name||'').startsWith(a)?`${a} - ${c.name}`:String(c.name||'');};
  s.innerHTML=(CLOUD.list.map(c=>
    `<option value="${c.id}"${CLOUD.campaign&&CLOUD.campaign.id===c.id?' selected':''}>${esc(campLabel(c))}</option>`).join('')
    ||'<option value="">캠페인 없음</option>')
    +'<option disabled>──────────</option><option value="__new">＋ 캠페인 추가 및 관리</option>';
}
/* 지금 화면에 올라와 있는 문서가 **어느 캠페인 것인지** (v80).
   저장할 때 CLOUD.campaign 과 다르면 멈춘다 — 캠페인 열기가 겹쳐 화면(한 캠페인)과 저장 대상(다른 캠페인)이
   어긋났을 때 다른 캠페인을 덮어쓰지 않게 하는 마지막 안전장치 */
var DOC_CID=null;
/* 캠페인 열기 순번 (v80) — 열기가 겹치면 **마지막에 시작한 것만** 화면에 반영한다.
   예전에는 주소의 캠페인과 목록 첫 캠페인을 동시에 열면서 서로 섞였다
   (상단은 BMW 이노베이션인데 데이터는 한화 — 5월 실적이 보인 원인) */
var OPEN_SEQ=0;
async function openCampaign(id){
  if(!CLOUD.on||!id)return;
  const seq=++OPEN_SEQ;
  /* 불러오는 동안 화면을 가린다 — 예전 캠페인이나 예시 데이터가 잠깐 비치지 않게 */
  startBoot();
  CLOUD.busy=true;cloudState('불러오는 중…');
  /* ① 필요한 것을 **먼저 다 받아 온 뒤** ② 한 번에 갈아 끼운다 — 중간에 다른 열기가 끼어들 틈을 없앤다 */
  const {data:c,error}=await CLOUD.sb.from('campaigns').select('*').eq('id',id).single();
  if(seq!==OPEN_SEQ)return;                /* 그 사이 다른 캠페인 열기가 시작됐다 — 그쪽이 마무리한다 */
  if(error){CLOUD.busy=false;endBoot();cloudState('열지 못했습니다: '+error.message);return;}
  const {data:mem}=await CLOUD.sb.from('campaign_members')
    .select('role').eq('campaign_id',id).eq('user_id',CLOUD.user.id).maybeSingle();
  if(seq!==OPEN_SEQ)return;
  /* 이 캠페인의 멤버가 아니면 — 같은 광고주 캠페인에서 받은 권한을 쓴다 (v82 — 권한은 광고주 단위).
     만든 사람은 마스터, 같은 광고주 캠페인의 마스터 · 운영진이면 운영진, 그 밖에는 조회 */
  let role=mem&&mem.role;
  if(!role){
    if(c.created_by&&c.created_by===CLOUD.user.id)role='master';
    else{try{
      const {data:my}=await CLOUD.sb.from('campaign_members').select('campaign_id,role').eq('user_id',CLOUD.user.id);
      const key=advKey(c.advertiser);
      if(key){const ids=new Set((CLOUD.list||[]).filter(x=>advKey(x.advertiser)===key).map(x=>x.id));
        const rs=(my||[]).filter(m=>ids.has(m.campaign_id)).map(m=>m.role);
        if(rs.some(r=>r==='master'||r==='editor'))role='editor';}
    }catch(e){}}
    if(seq!==OPEN_SEQ)return;}
  const {data:rows}=await CLOUD.sb.from('daily_stats')
    .select('stat_date,line_key,imp,click,view,eng,conv,lead,install,rev,net,extra')
    .eq('campaign_id',id);
  if(seq!==OPEN_SEQ)return;
  /* ---- 여기서부터는 기다림 없이 한 번에: 저장 대상과 화면 데이터가 늘 같은 캠페인 ---- */
  CLOUD.campaign=c;
  CLOUD.role=role||'viewer';
  CLOUD.dirty=false;
  /* 이 화면이 받은 문서의 저장 시각 (v94) — 저장할 때 서버 것과 같을 때만 덮어쓴다 */
  CLOUD.baseAt=c.updated_at||null;CLOUD.conflict=false;
  clearWorkState();
  applyDoc(c.doc);
  DOC_CID=c.id;
  rebuildPeriod();resetDateFilter(true);
  applyDaily(rows);
  /* 저장해 둔 입력 시트가 있으면 그걸로 일별 실적을 다시 채운다 (시트가 원본) */
  try{if(Array.isArray(c.doc&&c.doc.sheet)&&c.doc.sheet.length&&typeof applySheet==='function')applySheet();}catch(e){}
  CREATIVES.forEach(c2=>{const cs=CREATIVES.filter(x=>x.lid===c2.lid);
    if(!c2.run)c2.run=[[0,Math.max(TOTAL_DAYS-1,0)]];
    if(!isFinite(c2.share))c2.share=1/Math.max(cs.length,1);});
  /* ⚠ 조회 기간은 **데이터가 다 올라온 뒤에** 다시 잡는다 (v60).
     예전에는 applyDoc 직후(시트·일별 실적이 붙기 전)에 한 번만 잡아서
     종료일이 옛 값(어제)에 눌러앉았다. 사람이 직접 고른 적이 있으면 resetDateFilter 가 알아서 비켜 준다. */
  buildFacts();resetDateFilter();renderEverything();
  paintCampSel();
  applyRoleLock();
  CLOUD.busy=false;
  clearLocal();
  endBoot();
  cloudState(`${c.name} · ${ROLE_LABEL[CLOUD.role]||CLOUD.role} · 저장됨`);
  try{urlSettled();}catch(e){}
}
const ROLE_LABEL={master:'마스터',editor:'운영진',viewer:'광고주'};
/* 조회 권한이면 편집 화면을 잠근다 (광고주 모드와 동일한 처리) */
function applyRoleLock(){
  if(typeof applyRole==='function')applyRole();
  if(typeof window.__cmtLock==='function')window.__cmtLock();
  paintMockBadge();
}
/* "디자인 시안 · 더미 데이터" 배지는 **데모 화면에서만** 보여 준다 (v53).
   예전에는 로그인 여부만 봐서, 코드로 들어온 뷰어(광고주) 화면에도 그대로 남아 있었다. */
function paintMockBadge(){
  const mk=$('mockBadge');if(!mk)return;
  const real=!!(CLOUD.shareView||CLOUD.campaign||(CLOUD.on&&CLOUD.user));
  mk.classList.toggle('hidden',real);
}

/* ---------- 저장 ----------
   **한 번에 하나만 돌아야 한다.**
   자동 저장(20초 뒤)과 ☁ 저장 버튼이 겹치면 두 번 모두
   "일별 실적 전부 지우기 → 다시 넣기" 를 하다가 서로의 삽입과 부딪혀
   duplicate key … daily_stats_campaign_id_stat_date_line_key_creative_key 로 실패했다.
   지금은 ① 진행 중이면 예약만 걸고 돌아가고 ② 삽입도 upsert 라 겹쳐도 깨지지 않는다. */
/* 서버 요청이 하염없이 매달려 있지 않게 — 정해진 시간이 지나면 실패로 본다.
   (예전에는 저장이 멈추면 "저장 중…" 이 몇십 분씩 그대로 남아 있었다) */
const withTimeout=(pr,ms,what)=>Promise.race([
  Promise.resolve(pr),
  new Promise((_,rej)=>setTimeout(()=>rej(new Error((what||'요청')+' — 서버 응답이 없습니다 (시간 초과)')),ms||20000))]);
/* 일별 실적 전부 지우기 — 한 번에 지우다 서버 제한(statement timeout)에 걸리는 캠페인이 있어
   실패하면 날짜를 잘라 여러 번 나눠 지운다. */
async function wipeDaily(campId,onStep){
  const one=()=>CLOUD.sb.from('daily_stats').delete().eq('campaign_id',campId);
  try{
    const {error}=await withTimeout(one(),12000,'일별 실적 정리');
    if(!error)return null;
    if(!/timeout|시간 초과/i.test(error.message||''))return error.message;
  }catch(e){/* 시간 초과 — 아래에서 나눠 지운다 */}
  /* 날짜를 7일씩 끊어서 */
  const days=(typeof ALLDATES!=='undefined'?ALLDATES:[]).map(d=>iso(d));
  const chunks=[];
  for(let i=0;i<days.length;i+=7)chunks.push([days[i],days[Math.min(i+6,days.length-1)]]);
  for(let i=0;i<chunks.length;i++){
    if(onStep)onStep(i+1,chunks.length+2);
    try{const {error}=await withTimeout(
      CLOUD.sb.from('daily_stats').delete().eq('campaign_id',campId)
        .gte('stat_date',chunks[i][0]).lte('stat_date',chunks[i][1]),12000,'일별 실적 정리');
      if(error)return error.message;
    }catch(e){return String(e&&e.message||e);}}
  /* 캠페인 기간 밖에 남은 줄도 */
  if(days.length){
    try{
      if(onStep)onStep(chunks.length+1,chunks.length+2);
      await withTimeout(CLOUD.sb.from('daily_stats').delete().eq('campaign_id',campId)
        .lt('stat_date',days[0]),12000,'일별 실적 정리');
      if(onStep)onStep(chunks.length+2,chunks.length+2);
      await withTimeout(CLOUD.sb.from('daily_stats').delete().eq('campaign_id',campId)
        .gt('stat_date',days[days.length-1]),12000,'일별 실적 정리');
    }catch(e){return String(e&&e.message||e);}}
  return null;
}
/* 저장 충돌 (v94) — 이 화면을 연 뒤에 다른 창 · 다른 사람이 먼저 저장했다.
   예전에는 나중에 저장한 쪽이 앞의 변경(데이터 입력 · 헤더 편집 등)을 통째로 덮어썼다 */
function showSaveConflict(cur){
  CLOUD.conflict=true;
  cloudState('저장하지 않았습니다 — 다른 곳에서 먼저 저장했습니다');
  if(document.querySelector('.modal [data-conflict]'))return;
  openModal('확인',`<div data-conflict style="font-size:14px;font-weight:700;margin-bottom:6px">다른 곳에서 이 캠페인을 먼저 저장했습니다</div>`
    +`<div class="hint">이 화면을 연 뒤에 다른 창(또는 다른 사람)이 저장했습니다. 지금 저장하면 그 변경이 사라집니다.<br>`
    +`[새로고침]으로 최신 내용을 받은 뒤 다시 고쳐 주세요. 이 화면에서 고친 내용을 꼭 남겨야 하면 [덮어쓰기]를 누릅니다.</div>`,
    `<button class="btn" data-close>취소</button><button class="btn danger" id="cfOver">덮어쓰기</button><button class="btn primary" id="cfReload">새로고침</button>`,{w:480});
  $('cfReload').onclick=()=>{CLOUD.dirty=false;location.reload();};
  $('cfOver').onclick=()=>{closeModal();cloudSave(false,true);};}
async function cloudSave(silent,force){
  if(CLOUD.saving){CLOUD.saveAgain=true;return;}     /* 이미 저장 중 — 끝나면 한 번 더 */
  if(!CLOUD.on||!CLOUD.user){
    if(!silent)confirmModal('데모 모드입니다.','구글 로그인을 하면 이 캠페인을 클라우드에 저장할 수 있습니다.',
      ()=>signInGoogle(),'구글 로그인');
    return;}
  if(!CLOUD.campaign){if(!silent)await createCampaign();return;}
  if(CLOUD.role==='viewer'){cloudState('조회 권한이라 저장할 수 없습니다');return;}
  /* ⚠ 화면의 문서가 저장 대상 캠페인 것이 아니면 멈춘다 (v80 — 다른 캠페인을 덮어쓰지 않게) */
  if(DOC_CID!==CLOUD.campaign.id){
    cloudState('저장하지 않았습니다 — 화면의 데이터가 이 캠페인 것이 아닙니다. 새로고침해 주세요');
    CLOUD.dirty=false;return;}
  CLOUD.saving=true;CLOUD.saveAgain=false;
  try{
  cloudState('저장 중…');
  /* "저장 중…" 은 한 군데만 — 옆 칩은 비워 둔다 (v72: 두 번 겹쳐 보였다) */
  const chip=$('savedAgo');if(chip){chip.textContent='';chip.classList.remove('on');}
  const doc=serializeDoc();
  /* .select() 를 붙여 실제로 몇 행이 바뀌었는지 확인한다.
     권한이 없으면 RLS 가 오류 대신 "0행 수정"으로 조용히 넘어가기 때문. */
  let upd,error;
  /* 충돌을 알린 뒤에는 자동 저장을 멈춘다 — 사용자가 고르게 둔다 (덮어쓰기 = force) */
  if(CLOUD.conflict&&!force){if(!silent)showSaveConflict(null);return;}
  const savedAtIso=new Date().toISOString();
  try{let q=CLOUD.sb.from('campaigns').update({
    name:CAMPAIGN.name,advertiser:CAMPAIGN.advertiser,
    /* 디지털 · TV · OOH 를 모두 본 캠페인 기간 (v81 — 예전에는 디지털 라인만 봐서 TV · OOH 만 쓰면 오늘 날짜로 들어갔다) */
    start_date:(typeof campPeriodAll==='function'?campPeriodAll().start:'')||campStart(),
    end_date:(typeof campPeriodAll==='function'?campPeriodAll().end:'')||campEnd(),
    doc,updated_at:savedAtIso,updated_by:CLOUD.user.id
  }).eq('id',CLOUD.campaign.id);
  /* 내가 받은 뒤로 아무도 저장하지 않았을 때만 (v94) */
  if(CLOUD.baseAt&&!force)q=q.eq('updated_at',CLOUD.baseAt);
  ({data:upd,error}=await withTimeout(q.select('id,updated_at'),30000,'설정 저장'));
  }catch(e){error={message:String(e&&e.message||e)};}
  if(error){cloudState('저장 실패: '+error.message);return;}
  if(!upd||!upd.length){
    /* 0행 — 권한이 없거나, 그사이 다른 곳에서 저장했거나 */
    let cur=null;
    try{({data:cur}=await CLOUD.sb.from('campaigns').select('updated_at,updated_by').eq('id',CLOUD.campaign.id).maybeSingle());}catch(e){}
    if(cur&&CLOUD.baseAt&&cur.updated_at&&new Date(cur.updated_at).getTime()!==new Date(CLOUD.baseAt).getTime()){showSaveConflict(cur);return;}
    cloudState('저장 권한이 없습니다 (조회 전용)');return;}
  CLOUD.baseAt=upd[0].updated_at||savedAtIso;CLOUD.conflict=false;
  /* 일별 실적은 입력 시트가 원본이라 늘 통째로 다시 쓴다.
     (예전에는 upsert 만 했는데, 같은 라인·같은 날짜가 두 줄이면
      "ON CONFLICT DO UPDATE command cannot affect row a second time" 로 저장이 실패했다.
      지금은 sheetToRows() 가 날짜×라인으로 합쳐 한 줄만 만들고, 옛 행은 먼저 지운다.
      설정 문서(doc)에 시트가 이미 저장된 뒤라 중간에 실패해도 입력값은 남는다.) */
  const rows=sheetToRows();
  const eDel=await wipeDaily(CLOUD.campaign.id);
  if(eDel){cloudState('일별 실적 정리 실패: '+eDel);return;}
  /* insert 가 아니라 upsert — 같은 (캠페인·날짜·라인·소재) 가 남아 있어도 덮어쓴다.
     저장이 겹치거나 지우기가 덜 끝나도 오류로 멈추지 않는다. */
  const CH=500;
  for(let i=0;i<rows.length;i+=CH){
    if(rows.length>CH)cloudState(`일별 실적 저장 중… ${Math.min(i+CH,rows.length).toLocaleString()} / ${rows.length.toLocaleString()}행`);
    let e2=null;
    try{({error:e2}=await withTimeout(CLOUD.sb.from('daily_stats')
      .upsert(rows.slice(i,i+CH),{onConflict:'campaign_id,stat_date,line_key,creative'}),
      30000,'일별 실적 저장'));
    }catch(e){e2={message:String(e&&e.message||e)};}
    if(e2){cloudState('일별 실적 저장 실패: '+e2.message);return;}}
  try{await withTimeout(CLOUD.sb.from('campaign_history').insert({
    campaign_id:CLOUD.campaign.id,kind:'setup',doc,note:'저장',created_by:CLOUD.user.id}),
    15000,'히스토리 기록');}catch(e){}
  CLOUD.savedAt=new Date();
  CLOUD.dirty=false;
  paintSaved();
  /* 방금 저장했다는 표시를 바로 띄운다 (다음 주기까지 기다리지 않게) */
  const c2=$('savedAgo');if(c2){c2.classList.add('on');c2.textContent='방금 저장';paintCmtState('방금 저장');}
  cloudStateIdle();                       /* 상단 "저장 중…" 을 평소 문구로 (v51) */
  }catch(e){
    cloudState('저장 실패: '+String(e&&e.message||e));
  }finally{
    CLOUD.saving=false;
    /* 성공이든 실패든 "저장 중…" 표시는 반드시 걷어 낸다 */
    try{paintSaved();}catch(e){}
    cloudStateDone();
    /* 저장하는 동안 또 바뀌었으면 한 번만 더 돌린다 */
    if(CLOUD.saveAgain){CLOUD.saveAgain=false;setTimeout(()=>cloudSave(true),400);}
  }
}
/* ---------- 자동 저장 · "00분 전에 저장됨" ----------
   저장 버튼을 누르지 않아도 알아서 저장한다.
   · 값이 바뀌면 20초 뒤(추가 변경이 있으면 다시 20초 뒤)에 조용히 저장
   · 그와 별개로 최소 60초에 한 번만 실제로 올려 서버를 두드리지 않는다
   · 마지막 저장 시각은 상단 ☁ 저장 버튼 왼쪽에 "n분 전 저장" 으로 계속 보인다 */
const AUTO_SAVE_MS=60*1000;      /* 실제 저장 최소 간격 */
const DIRTY_WAIT_MS=20*1000;     /* 마지막 변경 후 기다리는 시간 */
/* 운영 코멘트 옆 문구는 상단 저장 표시를 그대로 비춘다 (v51 — 코멘트 전용 저장 없음) */
const paintCmtState=t=>{try{const e=$('cmtState');if(e)e.textContent=t||'';}catch(x){}};
function paintSaved(){
  const chip=$('savedAgo');
  if(!chip)return;
  if(!CLOUD.on||!CLOUD.user||!CLOUD.campaign){chip.textContent='';chip.classList.remove('on');
    paintCmtState('');return;}
  if(!CLOUD.savedAt){const t0=CLOUD.dirty?'저장 대기 중':'';
    chip.textContent=t0;chip.classList.remove('on');paintCmtState(t0);return;}
  const m=Math.floor((Date.now()-CLOUD.savedAt.getTime())/60000);
  const t=CLOUD.savedAt;
  const hhmm=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  chip.classList.add('on');
  chip.textContent=CLOUD.dirty?'변경됨 · 곧 저장'
    :m<1?'방금 저장':m<60?`${m}분 전 저장`
    :m<1440?`${Math.floor(m/60)}시간 전 저장`:`${hhmm} 저장`;
  chip.title=`마지막 자동 저장 ${dFull(t)} ${hhmm} · 저장 버튼을 누르지 않아도 자동으로 저장됩니다`;
  paintCmtState(chip.textContent);
}
/* 화면에 바뀐 내용이 생기면 표시해 둔다 (자동 저장 대상) */
let DIRTY_T=null;
function markDirty(){
  CLOUD.dirty=true;CLOUD.dirtyAt=Date.now();
  /* 입력 히스토리 · 로컬 백업 (07-input 의 sheetDirty — v78 전에는 이름이 겹쳐 안 돌았다) */
  try{if(typeof sheetDirty==='function')sheetDirty();}catch(e){}
  paintSaved();
  clearTimeout(DIRTY_T);
  DIRTY_T=setTimeout(tryAutoSave,DIRTY_WAIT_MS);
}
function tryAutoSave(){
  if(!CLOUD.on||!CLOUD.user||!CLOUD.campaign||CLOUD.role==='viewer')return;
  if(CLOUD.conflict)return;
  if(!CLOUD.dirty||CLOUD.busy)return;
  if(CLOUD.savedAt&&Date.now()-CLOUD.savedAt.getTime()<AUTO_SAVE_MS){
    clearTimeout(DIRTY_T);
    DIRTY_T=setTimeout(tryAutoSave,AUTO_SAVE_MS-(Date.now()-CLOUD.savedAt.getTime())+500);
    return;}
  CLOUD.dirty=false;cloudSave(true).then(paintSaved,paintSaved);
}
(function autoSave(){
  setInterval(()=>{paintSaved();tryAutoSave();},15000);
  /* 탭을 벗어나거나 창을 닫기 직전에도 한 번 */
  addEventListener('visibilitychange',()=>{if(document.hidden)tryAutoSave();});
})();
/* 빈 캠페인으로 초기화 — 새 캠페인이 데모 데이터를 그대로 안고 저장되던 문제를 막는다 */
/* 캠페인을 옮겨 다닐 때 앞 캠페인의 값이 남지 않도록 화면 상태를 통째로 비운다 */
function clearWorkState(){
  if(typeof SHEET!=='undefined')SHEET.length=0;
  /* 다른 캠페인의 "시트가 채운 칸" · 일별 배열 기준일을 들고 가지 않게 (v78) */
  SHEET_COVER=null;DAILY_D0=null;
  /* 화면이 비었으니 어느 캠페인 문서도 아니다 — 여는 쪽(openCampaign · tryCode)이 다시 적는다 (v80) */
  DOC_CID=null;
  if(typeof SHEET_HIST!=='undefined')SHEET_HIST.length=0;
  if(typeof LINE_HIST!=='undefined')LINE_HIST.length=0;
  if(typeof CAMP_HIST!=='undefined')CAMP_HIST.length=0;
  try{HIDDEN.clear();}catch(e){}
  /* 다른 캠페인의 운영 코멘트가 남지 않게 (v51) */
  try{const e=$('cmtBody');if(e)e.innerHTML='';
      const cs=$('cmtState');if(cs)cs.textContent='';}catch(e){}
  /* 그래프 전용 필터도 캠페인마다 새로 (다른 캠페인에 없는 값이 걸려 있으면 빈 그래프가 된다) */
  try{if(typeof DAILY_FILT!=='undefined'){DAILY_FILT={segment:'',media:'',product:''};
      if(typeof paintDailyFiltBtn==='function')paintDailyFiltBtn();}}catch(e){}
  try{DIRTY_AT=null;}catch(e){}
  try{LINE_DIRTY=null;}catch(e){}
  /* 다른 캠페인의 조회 기간이 따라오지 않게 (v71) */
  try{DOC_RANGE=null;FILTER_TOUCHED=false;}catch(e){}
}
function resetToBlank(name,advertiser){
  CAMPAIGN.name=name||'새 캠페인';
  CAMPAIGN.advertiser=advertiser||'';
  LINES=[];CREATIVES=[];ISSUES=[];
  /* 소재 자료함도 비운다 (v89) — 안 비우면 직전에 열어 둔 캠페인의 이미지 · 영상이 새 캠페인 문서에 같이 저장됐다 */
  try{CR_ASSETS={};}catch(e){}
  /* 새 캠페인은 디지털만 켠 채로 시작한다 — 설정 › 운영 매체에서 바꾼다 (v71) */
  CAMPAIGN.media={digital:true,tv:false,ooh:false};CAMPAIGN.menus={};
  try{TV_PLAN=[];TV_SPOTS=[];}catch(e){}
  try{OOH_PLAN=[];OOH_CR=[];TBL_CFG={};}catch(e){}
  try{PACE_HIDE=[];}catch(e){}
  try{INF_TBL=null;INF.dim='media';INF.seg=false;INF.step=2;INF.mapSeg='';}catch(e){}
  try{OV_COLLAGE=true;}catch(e){}
  try{if(typeof OV!=='undefined')OV.key='';}catch(e){}
  clearWorkState();
  rebuildPeriod();buildFacts();resetDateFilter(true);renderEverything();
}
async function createCampaign(after){
  if(!CLOUD.on||!CLOUD.user){signInGoogle();return;}
  /* ① 광고주를 먼저 고르고 ② 캠페인 이름을 정한다 */
  const st={logo:''};
  openModal('새 캠페인',
    `<div class="hint" style="margin-bottom:10px"><b>①</b> 광고주를 먼저 고르고 <b>②</b> 캠페인 이름을 정합니다.
       로고를 등록하면 이 광고주의 대시보드 왼쪽 위에 로고와 광고주명이 함께 보입니다.</div>
     <div class="form-row">${advPickerHTML('',''  )}</div>
     <div class="form-row" style="margin-top:6px">
       <div class="fld" style="flex:1;min-width:260px"><label>캠페인명</label>
         <input id="ncName" placeholder="예: 2026 하반기 브랜드 캠페인"></div>
     </div>
     <div class="hint" style="margin-top:10px"><b>빈 캠페인</b>으로 시작합니다 — 예상 효율과 일별 실적은
       만든 뒤에 엑셀로 불러오거나 직접 입력합니다.</div>`,
    '<button class="btn" data-close>취소</button><button class="btn primary" id="ncGo">만들기</button>',{w:660});
  const readAdv=wireAdvPicker(st);
  $('ncGo').onclick=async()=>{
    const av=readAdv();
    if(!av.name){confirmModal('광고주를 골라 주세요.','기존 광고주를 고르거나 새 광고주명을 적어 주세요.',()=>{},'확인');return;}
    const name=($('ncName').value||'').trim()||'새 캠페인';
    const adv=av.name;
    ADV_BOOK[adv]=ADV_BOOK[adv]||{};ADV_BOOK[adv].logo=av.logo||'';saveAdvBook();
    closeModal();                       /* 위에 얹힌 "새 캠페인" 창만 닫는다 */
    if(typeof after==='function')closeAllModals();
    cloudState('만드는 중…');
    /* ⚠ 지금 열려 있던 캠페인에서 떼어 놓고 비운다 (v79).
       예전에는 화면을 비운 뒤에도 CLOUD.campaign 이 앞 캠페인을 가리키고 있어서,
       서버 생성이 실패하면(또는 그 사이 자동 저장이 돌면) **빈 화면이 앞 캠페인에 저장될 수** 있었다.
       앞 캠페인에 저장 안 된 변경이 있으면 먼저 저장한다 */
    const prevId=CLOUD.campaign&&CLOUD.campaign.id;
    try{if(prevId&&CLOUD.dirty&&CLOUD.role!=='viewer')await cloudSave(true);}catch(e){}
    CLOUD.campaign=null;CLOUD.dirty=false;CLOUD.busy=true;
    resetToBlank(name,adv);
    CAMPAIGN.advLogo=av.logo||'';renderBrand();
    let data=null,error=null;
    try{({data,error}=await withTimeout(CLOUD.sb.from('campaigns').insert({
      name,advertiser:adv,start_date:campStart(),end_date:campEnd(),
      doc:serializeDoc(),created_by:CLOUD.user.id,updated_by:CLOUD.user.id
    }).select().single(),20000,'캠페인 만들기'));}catch(e){error={message:String(e&&e.message||e)};}
    CLOUD.busy=false;
    if(error||!data){
      cloudState('생성 실패: '+(error?error.message:'응답 없음'));
      /* 앞 캠페인으로 되돌아간다 — 빈 화면으로 남겨 두지 않는다 */
      if(prevId){try{await openCampaign(prevId);}catch(e){}}
      confirmModal('캠페인을 만들지 못했습니다.',(error?error.message:'서버 응답이 없습니다.')
        +(prevId?' 앞에 열려 있던 캠페인으로 돌아갔습니다.':''),()=>{},'확인');
      return;}
    /* 만든 사람을 마스터로 넣는 일은 DB 트리거(campaigns_add_owner)가 처리한다 */
    await loadCampaignList();
    await openCampaign(data.id);};
}
/* ---------- 캠페인 및 광고주 관리 (이름 변경 · 복제 · 삭제 · 광고주 로고) ---------- */
/* inplace=true 면 이미 떠 있는 창의 본문만 갈아 끼운다 (창이 닫혔다 열리지 않게) */
async function openCampManage(inplace){
  if(!CLOUD.on||!CLOUD.user){
    confirmModal('구글 로그인이 필요합니다.','로그인하면 내가 할당받은 캠페인만 목록에 나옵니다.',
      ()=>signInGoogle(),'구글 로그인');return;}
  await loadCampaignList(true);
  const rows=CLOUD.list;
  /* 캠페인마다 매핑된 관리자 계정을 함께 보여 준다 (v52).
     한 번 읽어 두고 캐시 — 목록 창을 다시 그릴 때마다 서버를 두드리지 않게. */
  if(!inplace)MEMBER_CACHE={};
  const need=rows.map(c=>c.id).filter(id=>!MEMBER_CACHE[id]);
  if(need.length)Object.assign(MEMBER_CACHE,await cloudMembersMany(need));
  let h=`<div class="hint" style="margin-bottom:10px">${L(`내가 <b>만들었거나 초대받은</b> 캠페인과 <b>같은 광고주</b>의 캠페인이 보입니다.
      <b>권한은 광고주 단위</b>입니다 — 한 캠페인에 초대받거나 코드를 받은 사람은 같은 광고주의 다른 캠페인도 볼 수 있습니다(운영진은 수정까지).`,
      `Campaigns you <b>created or were invited to</b>, plus those of the <b>same advertiser</b>, are shown.
      <b>Access is per advertiser</b> — anyone invited to (or given a code for) one campaign can also see that advertiser's other campaigns (staff can edit them too).`)}<br>
      이름 변경 · 복제 · 삭제는 <b>마스터</b> 권한이 있는 캠페인에서만 됩니다.<br>
      캠페인마다 <b>코드 두 개</b>가 자동으로 붙습니다 —
      <b>운영진 코드</b>는 그 캠페인의 데이터를 수정·추가할 수 있고,
      <b>뷰어 코드</b>는 대시보드 열람과 엑셀 다운로드만 됩니다.
      코드 옆 <b>⧉</b>를 누르면 접속 링크가 복사되고, <b>👥 초대</b>로 구글 계정을 직접 초대할 수 있습니다.</div>`;
  if(!rows.length)h+='<div class="card" style="padding:22px;text-align:center">아직 캠페인이 없습니다. 아래 <b>＋ 새 캠페인</b>으로 시작하세요.</div>';
  else{
    h+=`<table class="tbl lite" style="background:#fff;border-radius:10px;overflow:hidden"><thead><tr>
      <th style="min-width:190px">캠페인명</th><th style="min-width:120px">광고주</th>
      <th style="width:160px">기간</th><th style="width:96px">최근 저장</th>
      <th style="width:250px">관리자 계정</th>
      <th style="width:190px">공유 코드</th>
      <th style="width:300px"></th></tr></thead><tbody>`;
    rows.forEach(c=>{
      const cur=CLOUD.campaign&&CLOUD.campaign.id===c.id;
      h+=`<tr data-cid="${c.id}"${cur?' style="background:var(--acc-soft2)"':''}>
        <td style="text-align:left"><b>${esc(c.name||'(이름 없음)')}</b>${cur?' <span class="cnt2">열려 있음</span>':''}</td>
        <td>${esc(c.advertiser||'–')}</td>
        <td class="mono">${c.start_date||'–'} ~ ${c.end_date||'–'}</td>
        <td class="mono">${(c.updated_at||'').slice(0,10)||'–'}</td>
        <td style="text-align:left">${memberChips(MEMBER_CACHE[c.id])}</td>
        <td style="text-align:left">
          <div class="codeline"><span class="ck staff">운영진</span>
            <span class="sharecode">${esc(c.staff_code||'–')}</span>
            <button class="copyb" data-copy="${c.id}" data-kind="staff"
              title="운영진용 접속 링크를 복사합니다">⧉</button></div>
          <div class="codeline"><span class="ck view">뷰어</span>
            <span class="sharecode view">${esc(c.share_code||'–')}</span>
            <button class="copyb" data-copy="${c.id}" data-kind="viewer"
              title="광고주용 접속 링크를 복사합니다">⧉</button></div></td>
        <td class="acts">
          <div class="ln">${cur?'<button class="btn sm" disabled title="지금 열려 있는 캠페인입니다">열기</button>'
              :`<button class="btn sm" data-open="${c.id}">열기</button>`}
            <button class="btn sm" data-inv="${c.id}"
              title="이 캠페인의 관리자 계정을 보고, 마스터라면 운영진을 임명·해제합니다">👥 관리자 관리</button>
          </div>
          <div class="ln">
            <button class="btn sm" data-ren="${c.id}">이름 변경</button>
            <button class="btn sm" data-dup="${c.id}">캠페인 복제</button>
            <button class="btn sm danger" data-del="${c.id}">캠페인 삭제</button>
          </div></td></tr>`;});
    h+='</tbody></table>';}
  const foot='<button class="btn primary" id="campNew" title="새 캠페인 만들기">＋ 새 캠페인</button>'
    +'<button class="btn" id="advMng" title="광고주 목록과 로고를 관리합니다">🏷 광고주 관리</button>'
    +'<div class="spacer"></div><button class="btn" data-close>닫기</button>';
  if(!(inplace&&repaintModal(h,foot)))openModal('캠페인 및 광고주 관리',h,foot,{w:1340});
  const host=$('modalHost').querySelector('.modal#mdl')||$('modalHost');
  const redraw=()=>openCampManage(true);          /* 창은 그대로 두고 목록만 다시 */
  if($('campNew'))$('campNew').onclick=()=>createCampaign(redraw);
  if($('advMng'))$('advMng').onclick=()=>openAdvManage(redraw);
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=async()=>{
    closeAllModals();await openCampaign(b.dataset.open);});
  /* 코드 옆 ⧉ 아이콘 — 접속 링크를 클립보드로 */
  host.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.copy);if(!c)return;
    const kind=b.dataset.kind;
    const code=kind==='staff'?c.staff_code:c.share_code;if(!code)return;
    const url=location.href.split('#')[0].split('?')[0]+'?code='+code;
    if(await copyText(url)){
      b.textContent='✓';b.classList.add('ok');
      setTimeout(()=>{b.textContent='⧉';b.classList.remove('ok');},1400);}
    else prompt(kind==='staff'?'운영진에게 전달할 주소입니다.':'광고주에게 전달할 주소입니다.',url);});
  /* 👥 관리자 관리 — 캠페인을 열지 않고 **이 목록 위에 겹쳐서** 연다 (v52).
     닫으면 캠페인 관리 목록으로 돌아온다. */
  host.querySelectorAll('[data-inv]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.inv);if(!c)return;
    if(typeof openPermCloud==='function')await openPermCloud(c.id,c.name);});
  /* 이름 변경 — 위에 작은 창을 하나 더 띄운다 (목록 창은 그대로) · 광고주는 드롭다운 */
  host.querySelectorAll('[data-ren]').forEach(b=>b.onclick=()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.ren);if(!c)return;
    const st={logo:advLogo(c.advertiser)||''};
    openModal('캠페인 이름 · 광고주',
      `<div class="form-row"><div class="fld" style="flex:1;min-width:280px"><label>캠페인명</label>
         <input id="renName" value="${esc(c.name||'')}"></div></div>
       <div class="form-row" style="margin-top:6px">${advPickerHTML(c.advertiser||'',st.logo)}</div>`,
      '<button class="btn" data-close>취소</button><button class="btn primary" id="renGo">저장</button>',{w:660});
    const readAdv=wireAdvPicker(st);
    $('renGo').onclick=async()=>{
      const nm=($('renName').value||'').trim()||c.name;
      const av=readAdv();
      const adv=(av.name||'').trim();
      if(adv){ADV_BOOK[adv]=ADV_BOOK[adv]||{};ADV_BOOK[adv].logo=av.logo||'';saveAdvBook();}
      const {data,error}=await CLOUD.sb.from('campaigns')
        .update({name:nm,advertiser:adv}).eq('id',c.id).select('id');
      if(error||!data||!data.length){cloudState('이름을 바꾸지 못했습니다 (권한 확인)');return;}
      if(CLOUD.campaign&&CLOUD.campaign.id===c.id){CAMPAIGN.name=nm;CAMPAIGN.advertiser=adv;
        CAMPAIGN.advLogo=av.logo||'';renderCampForm();renderCampBar();renderBrand();
        try{refreshBgDots();}catch(e){}}
      closeModal();openCampManage(true);};});
  host.querySelectorAll('[data-dup]').forEach(b=>b.onclick=async()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.dup);if(!c)return;
    cloudState('복제 중…');
    const {data:src,error:e0}=await CLOUD.sb.from('campaigns').select('*').eq('id',c.id).single();
    if(e0){cloudState('복제 실패: '+e0.message);return;}
    const {data:ins,error}=await CLOUD.sb.from('campaigns').insert({
      name:(src.name||'캠페인')+' 사본',advertiser:src.advertiser||'',
      start_date:src.start_date,end_date:src.end_date,
      doc:src.doc,created_by:CLOUD.user.id,updated_by:CLOUD.user.id}).select().single();
    if(error){cloudState('복제 실패: '+error.message);return;}
    /* 일별 실적도 함께 복사 */
    const {data:rows}=await CLOUD.sb.from('daily_stats').select('*').eq('campaign_id',c.id);
    if(rows&&rows.length){
      const copy=rows.map(r=>{const o={...r};delete o.id;o.campaign_id=ins.id;return o;});
      await CLOUD.sb.from('daily_stats').insert(copy);}
    await loadCampaignList(true);openCampManage(true);
    cloudState('복제 완료');});
  host.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    const c=CLOUD.list.find(x=>x.id===b.dataset.del);if(!c)return;
    confirmModal(`"${c.name}" 캠페인을 삭제할까요?`,
      '이 캠페인의 설정과 일별 실적이 모두 사라집니다. 되돌릴 수 없습니다.',async()=>{
        /* ① 서버 함수로 먼저 시도한다 — 슈퍼마스터 · 만든 사람 · 그 캠페인 마스터면 지워진다.
           (예전 RLS 정책만 깔린 DB 에서는 직접 delete 가 조용히 0행이 되어
            "마스터 권한 필요" 라고만 떴다) */
        let gone=false,msg='',timedOut=false;
        /* ⓪ 일별 실적을 **먼저 나눠서** 지운다 —
           행이 많은 캠페인은 한 번에 지우다 서버 제한(statement timeout)에 걸려
           "canceling statement due to statement timeout" 으로 통째로 실패했다. */
        progOpen('캠페인을 지우는 중');
        progSet(null,'일별 실적을 정리하는 중…');
        await uiTick();
        const eW=await wipeDaily(c.id,(i,n)=>progSet(Math.round(i/n*70),
          `일별 실적을 정리하는 중… ${i} / ${n}`));
        if(eW&&/timeout|시간 초과/i.test(eW))timedOut=true;
        progSet(78,'캠페인 정보를 지우는 중…');
        await uiTick();
        try{const {data:rp,error:er}=await withTimeout(
            CLOUD.sb.rpc('delete_campaign',{p_id:c.id}),30000,'캠페인 삭제');
          if(!er&&rp)gone=true;else if(er)msg=er.message;
        }catch(e){msg=String(e&&e.message||e);}
        if(!gone){
          try{const {data,error}=await withTimeout(
              CLOUD.sb.from('campaigns').delete().eq('id',c.id).select('id'),30000,'캠페인 삭제');
            if(!error&&data&&data.length)gone=true;else msg=(error&&error.message)||msg;
          }catch(e){msg=String(e&&e.message||e);}}
        progSet(100,'');
        progClose();
        if(!gone){
          const slow=timedOut||/timeout|시간 초과/i.test(msg);
          confirmModal('삭제하지 못했습니다.',
            (slow
              ? '데이터가 많아 서버가 시간 안에 다 지우지 못했습니다.<br>'
                +'<b>한 번 더 눌러 주세요</b> — 이미 지운 만큼은 줄어 있어 대개 두세 번이면 끝납니다.<br>'
                +'계속 같은 화면이 뜨면 Supabase SQL 편집기에서 <b>schema.sql</b> 을 다시 실행해 주세요 '
                +'(<code>delete_campaign</code> 함수의 시간 제한이 늘어납니다).'
              : '이 캠페인을 지울 권한이 확인되지 않았습니다.<br>'
                +'슈퍼마스터인데도 이 창이 뜨면 Supabase SQL 편집기에서 <b>schema.sql</b> 을 다시 한 번 실행해 주세요 '
                +'(캠페인 삭제 정책과 <code>delete_campaign</code> 함수가 최신이어야 합니다).')
            +(msg?`<br><span class="hint">서버 응답: ${esc(msg)}</span>`:''),
            ()=>{},'확인',true);
          return;}
        if(CLOUD.campaign&&CLOUD.campaign.id===c.id){CLOUD.campaign=null;CLOUD.role=null;}
        await loadCampaignList(true);
        if(!CLOUD.list.length)resetToBlank('새 캠페인','');
        else await openCampaign(CLOUD.list[0].id);
        openCampManage(true);},'삭제');});
}

/* ---------- 권한 · 초대 (계정 · 권한 팝업) ---------- */
/* ---------- 캠페인 멤버(관리자) ----------
   v52 — 캠페인을 열지 않고도 목록에서 바로 보고 바꿀 수 있도록 **캠페인 id 를 받는다.**
   (인자를 안 주면 지금 열려 있는 캠페인) */
const campIdOf=id=>id||(CLOUD.campaign&&CLOUD.campaign.id)||null;
async function cloudMembers(campId){
  const id=campIdOf(campId);
  if(!CLOUD.on||!CLOUD.user||!id)return null;
  const {data}=await CLOUD.sb.from('campaign_members')
    .select('role,user_id,profiles(name,email,org)').eq('campaign_id',id);
  const {data:inv}=await CLOUD.sb.from('campaign_invites')
    .select('id,email,role,accepted_at').eq('campaign_id',id).is('accepted_at',null);
  return {members:data||[],invites:inv||[]};
}
/* 여러 캠페인의 멤버를 한 번에 — 캠페인 관리 목록에 관리자 칩을 그리기 위해 */
async function cloudMembersMany(ids){
  const out={};
  (ids||[]).forEach(id=>out[id]={members:[],invites:[]});
  if(!CLOUD.on||!CLOUD.user||!ids||!ids.length)return out;
  try{
    const {data}=await withTimeout(CLOUD.sb.from('campaign_members')
      .select('campaign_id,role,user_id,profiles(name,email,org)').in('campaign_id',ids),
      15000,'관리자 목록');
    (data||[]).forEach(m=>{(out[m.campaign_id]=out[m.campaign_id]||{members:[],invites:[]}).members.push(m);});
    const {data:inv}=await withTimeout(CLOUD.sb.from('campaign_invites')
      .select('campaign_id,email,role,accepted_at').in('campaign_id',ids).is('accepted_at',null),
      15000,'초대 목록');
    (inv||[]).forEach(v=>{(out[v.campaign_id]=out[v.campaign_id]||{members:[],invites:[]}).invites.push(v);});
  }catch(e){}
  return out;
}
/* 캠페인 관리 목록에서 쓰는 멤버 캐시 (창을 다시 그릴 때마다 서버를 두드리지 않게) */
let MEMBER_CACHE={};
/* 목록 한 칸에 들어갈 관리자 칩 — 마스터 먼저, 그다음 운영진, 광고주는 수만 */
function memberChips(d){
  if(!d)return '<span class="hint">–</span>';
  const nameOf=m=>{const p=m.profiles||{};return p.name||p.email||'(이름 없음)';};
  const ord={master:0,editor:1,viewer:2};
  const ms=(d.members||[]).slice().sort((a,b)=>(ord[a.role]??9)-(ord[b.role]??9));
  const show=ms.filter(m=>m.role!=='viewer');
  const viewers=ms.length-show.length;
  const pend=(d.invites||[]).length;
  if(!ms.length&&!pend)return '<span class="hint">–</span>';
  let h='<div class="mchips">';
  h+=show.slice(0,4).map(m=>`<span class="mchip ${m.role}" title="${esc((m.profiles||{}).email||'')}">`
    +`<b>${m.role==='master'?'마스터':'운영진'}</b>${esc(nameOf(m))}</span>`).join('');
  if(show.length>4)h+=`<span class="mchip more">+${show.length-4}</span>`;
  if(viewers)h+=`<span class="mchip viewer">광고주 ${viewers}</span>`;
  if(pend)h+=`<span class="mchip pend">초대 대기 ${pend}</span>`;
  return h+'</div>';
}
/* 그 캠페인에서 내가 마스터인가 — 목록에서 바로 판단해야 하므로 멤버 목록으로 본다 */
function isMasterOf(d){
  if(!CLOUD.user)return false;
  if(CLOUD.appRole==='super')return true;
  if(CLOUD.shareView)return false;
  const me=(d&&d.members||[]).find(m=>m.user_id===CLOUD.user.id);
  return !!me&&me.role==='master';
}
/* ---- 내가 만든 열 — 계정 저장소 (v57) ----
   로컬(localStorage)은 바로 쓰기 위한 사본이고, 계정(profiles.prefs.cols)이 원본이다.
   둘을 합칠 때는 **이름이 같으면 나중에 고친 쪽**을 남긴다(at 타임스탬프). */
function ucMerge(a,b){
  const m=new Map();
  (a||[]).concat(b||[]).forEach(c=>{
    if(!c||!c.k||!c.l)return;
    const p=m.get(c.k);
    if(!p||(+c.at||0)>=(+p.at||0))m.set(c.k,c);});
  return [...m.values()];
}
async function pullUserCols(){
  try{
    if(!CLOUD.sb||!CLOUD.user)return;
    const {data,error}=await CLOUD.sb.from('profiles').select('prefs').eq('id',CLOUD.user.id).maybeSingle();
    if(error)return;                               /* prefs 열이 없는 서버 — 로컬만 쓴다 */
    const cloud=(data&&data.prefs&&Array.isArray(data.prefs.cols))?data.prefs.cols:[];
    const merged=ucMerge(loadUserCols(),cloud);
    if(JSON.stringify(merged)!==JSON.stringify(USER_COLS)){
      saveUserCols(merged);regUserCols(merged);
      try{renderAll();renderKpiTable&&renderKpiTable();}catch(e){}}
    /* 로컬에만 있던 열은 계정에도 올려 둔다 */
    if(JSON.stringify(merged)!==JSON.stringify(cloud))await pushUserCols(merged);
  }catch(e){}
}
async function pushUserCols(list){
  try{
    if(!CLOUD.sb||!CLOUD.user)return;
    const {data}=await CLOUD.sb.from('profiles').select('prefs').eq('id',CLOUD.user.id).maybeSingle();
    const prefs=Object.assign({},(data&&data.prefs)||{},{cols:list||USER_COLS});
    await CLOUD.sb.from('profiles').update({prefs}).eq('id',CLOUD.user.id);
  }catch(e){}
}
async function inviteMember(email,role,campId){
  const id=campIdOf(campId);
  if(!id)return '캠페인을 먼저 여세요.';
  const {error}=await CLOUD.sb.from('campaign_invites').insert({
    campaign_id:id,email:email.trim().toLowerCase(),role,invited_by:CLOUD.user.id});
  return error?error.message:null;
}
async function setMemberRole(userId,role,campId){
  const id=campIdOf(campId);if(!id)return '캠페인을 먼저 여세요.';
  const {error}=await CLOUD.sb.from('campaign_members')
    .update({role}).eq('campaign_id',id).eq('user_id',userId);
  return error?error.message:null;
}
async function removeMember(userId,campId){
  const id=campIdOf(campId);if(!id)return '캠페인을 먼저 여세요.';
  const {error}=await CLOUD.sb.from('campaign_members')
    .delete().eq('campaign_id',id).eq('user_id',userId);
  return error?error.message:null;
}

/* ---------- 배선 ---------- */
(function wireCloud(){
  const b=id=>$(id);
  if(b('signIn'))b('signIn').onclick=signInGoogle;
  if(b('signOut'))b('signOut').onclick=signOutCloud;
  /* 계정 버튼 — 누르면 로그아웃 메뉴 열기/닫기 */
  if(b('meBtn'))b('meBtn').onclick=e=>{e.stopPropagation();
    $('meMenu').classList.toggle('hidden');};
  document.addEventListener('click',e=>{
    const m=$('meMenu');
    if(m&&!m.classList.contains('hidden')&&!e.target.closest('#meWrap'))m.classList.add('hidden');});
  if(b('cloudSave'))b('cloudSave').onclick=()=>{
    /* 누르는 즉시 표시부터 바꾼다 — 저장이 끝나면 "방금 저장" 으로 확정된다 */
    const c=$('savedAgo');if(c){c.classList.remove('on');c.textContent='';}
    if(typeof applySheet==='function'){try{applySheet();}catch(e){}}
    cloudSave(false);};
  if(b('campMng'))b('campMng').onclick=openCampManage;
  /* 계정 관리 — 구글 계정 메뉴 안에서 연다 */
  if(b('acctBtn'))b('acctBtn').onclick=e=>{e.stopPropagation();
    $('meMenu').classList.add('hidden');openAccounts();};
  if(b('reqBtn'))b('reqBtn').onclick=()=>{
    if(CLOUD.user){openAccessRequest();return;}
    confirmModal('먼저 구글 로그인이 필요합니다.',
      '어떤 계정에 권한을 드릴지 확인해야 하기 때문입니다. 로그인한 뒤 소속과 용도를 적어 보내 주세요.',
      ()=>{if(CLOUD.on)signInGoogle();
        else confirmModal('지금은 샘플 화면입니다.',
          '실제 사이트에 올린 뒤에는 이 버튼으로 바로 권한을 요청할 수 있습니다.',()=>{},'확인');},
      '구글 로그인');};
  if(b('campSel'))b('campSel').onchange=e=>{
    const v=e.target.value;
    if(v==='__new'){paintCampSel();openCampManage();return;}
    if(v&&v.startsWith('code:')){switchByCode(v.slice(5));return;}
    if(v)openCampaign(v);};
  if(b('demoHide'))b('demoHide').onclick=()=>{
    b('demoBar').classList.add('hidden');
    try{sessionStorage.setItem('demoBarHidden','1');}catch(err){}};
  paintCampSel();paintAuth();
  cloudReady(cloudInit);
  /* 저장 버튼들과 함께 클라우드에도 반영 */
  const chain=(id,fn)=>{const el2=$(id);if(!el2)return;const prev=el2.onclick;
    el2.onclick=async e=>{if(prev)await prev.call(el2,e);if(CLOUD.on&&CLOUD.user)cloudSave(true);};};
  /* 저장 버튼은 ☁ 저장 하나로 통일했다 */
  /* 화면에서 값을 바꾸면 자동 저장 대상으로 표시한다 */
  ['input','change'].forEach(ev=>document.addEventListener(ev,e=>{
    if(e.target.closest('#gate,#modalHost'))return;markDirty();},true));
})();
