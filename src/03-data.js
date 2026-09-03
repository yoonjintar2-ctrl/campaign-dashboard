/* ===== 0. 유틸 ===== */
const NS='http://www.w3.org/2000/svg';
const S=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;};
const el=(t,c,p)=>{const e=document.createElement(t);if(c)e.className=c;if(p)p.appendChild(e);return e;};
const $=id=>document.getElementById(id);
const num=n=>isFinite(n)?n:0;
const fmt=n=>(!isFinite(n)?'–':Math.round(n).toLocaleString('ko-KR'));
const pct=(n,d=2)=>(!isFinite(n)?'–':(n*100).toFixed(d)+'%');
const won=n=>(!isFinite(n)?'–':'₩'+Math.round(n).toLocaleString('ko-KR'));
const sum=a=>a.reduce((x,y)=>x+y,0);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>'x'+Math.random().toString(36).slice(2,8);
const SEP='';
const ACC='#495e72',ACC2='#486a75',GRAY='#9aa4b0';
const PACE='#b06a63',PACE_LT='#d9aca7';   /* 목표 페이스 — 붉은 계열 */
const HIDDEN=new Set();                   /* 숨긴 대시보드 항목 (p11) */
const AXIS={fill:'#98a3b1',size:10.5,weight:400};

/* ===== 1. 캠페인 · 라인 ===== */
const CAMPAIGN={name:'2026 하반기 브랜드 통합 캠페인',advertiser:'Digital Media Dashboard',today:'2026-09-25'};
const KPI_KEYS=['imp','click','view','eng','conv','lead','install'];
const KPI_LABEL={imp:'노출',click:'클릭',view:'조회',eng:'참여',conv:'전환',lead:'양식제출',install:'설치'};
const RATE_LABEL={ctr:'CTR',vtr:'VTR',cvr:'CVR',cpm:'CPM',cpc:'CPC',cpv:'CPV',cpa:'CPA',roas:'ROAS'};
let BID_TYPES=['CPM','CPC','CPT','CPD','CPV','CPA','CPI','CPE'];
/* 비드 타입에 맞는 KPI 기본값 — 자동으로 채우되 이후 직접 수정할 수 있다 */
/* 비드 타입 → KPI 지표. KPI 를 따로 고르지 않았을 때 이걸로 판단한다.
   CPM·CPT·CPD = 노출 / CPC = 클릭 / CPV = 조회 / CPE = 참여 / CPI·CPA = 전환 / 그 외 = 노출 */
const BID_KPI={CPM:'imp',CPT:'imp',CPD:'imp',CPC:'click',CPV:'view',CPE:'eng',CPI:'conv',CPA:'conv'};
/* 라인의 실제 KPI — 비워 두면 비드 타입으로 정하고, 그것도 없으면 노출 */
const kpiOf=l=>{
  if(!l)return 'imp';
  if(l.kpi&&KPI_KEYS.includes(l.kpi))return l.kpi;
  const b=String(l.bid||'').toUpperCase().match(/CP[MCVAIETD]/);
  return (b&&BID_KPI[b[0]])||'imp';};
const DEVICES=['PC','MO','CTV'];

let LINES=[
 {id:'L1',segment:'Phase 1',media:'YouTube',product:'VRC',target:'카테고리 관심 오디언스',line:'신제품 A',
  device:['PC','MO'],bid:'CPV',price:19,start:'2026-08-01',end:'2026-09-30',
  kpi:'view',sub:'vtr',feeA:.10,feeR:.05,gross:30000000,bonus:3000000,sec:6,
  g:{imp:false,click:false,view:true},note:'PC+MO 디바이스 최적화 운영'},
 {id:'L2',segment:'Phase 1',media:'YouTube',product:'VVC',target:'구매 의향 IM',line:'신제품 B',
  device:['PC','MO','CTV'],bid:'CPV',price:20,start:'2026-08-01',end:'2026-09-30',
  kpi:'view',sub:'cpv',feeA:.10,feeR:.05,gross:60000000,bonus:6000000,sec:15,
  g:{imp:false,click:false,view:true},note:'CTV 포함 확장 운영'},
 {id:'L3',segment:'Phase 1',media:'YouTube',product:'Demand Gen (구독)',target:'리마케팅 · 유사',line:'신제품 B',
  device:['MO'],bid:'CPC',price:1000,start:'2026-08-01',end:'2026-09-30',
  kpi:'click',sub:'ctr',feeA:.10,feeR:.05,gross:35000000,bonus:0,sec:0,
  g:{imp:false,click:true,view:false},note:'관심사 타겟 확장'},
 {id:'L4',segment:'Phase 2',media:'YouTube',product:'Demand Gen (구독)',target:'리마케팅 · 유사',line:'신제품 A',
  device:['MO'],bid:'CPC',price:1050,start:'2026-08-15',end:'2026-09-30',
  kpi:'click',sub:'ctr',feeA:.10,feeR:.05,gross:25000000,bonus:0,sec:0,
  g:{imp:false,click:true,view:false},note:'2차 런칭 구간'},
 {id:'L5',segment:'Phase 2',media:'Meta',product:'IG (View)',target:'2049 남성 · 관심사',line:'신제품 C',
  device:['MO'],bid:'CPM',price:8500,start:'2026-08-01',end:'2026-09-30',
  kpi:'imp',sub:'cpm',feeA:.13,feeR:.07,gross:50000000,bonus:5000000,sec:15,
  g:{imp:true,click:false,view:false},note:'페이스북+인스타 노출'},
 {id:'L6',segment:'Phase 1',media:'네이버',product:'성과형 DA',target:'리타겟팅 · 유사',line:'신제품 A',
  device:['PC','MO'],bid:'CPC',price:700,start:'2026-08-01',end:'2026-09-30',
  kpi:'click',sub:'ctr',feeA:.10,feeR:.05,gross:30000000,bonus:0,sec:0,
  g:{imp:false,click:true,view:false},note:'검색 리타겟 연계'},
 {id:'L7',segment:'Phase 2',media:'카카오',product:'비즈보드',target:'2039 여성 · 관심사',line:'신제품 C',
  device:['MO'],bid:'CPC',price:850,start:'2026-08-08',end:'2026-09-30',
  kpi:'click',sub:'ctr',feeA:.10,feeR:.05,gross:25000000,bonus:0,sec:0,
  g:{imp:false,click:true,view:false},note:'톡 비즈보드 상단 고정'},
 {id:'L8',segment:'Phase 1',media:'Teads',product:'inRead 동영상',target:'프리미엄 매체 지면',line:'신제품 B',
  device:['PC','MO'],bid:'CPM',price:6500,start:'2026-08-01',end:'2026-09-30',
  kpi:'imp',sub:'cpm',feeA:.12,feeR:.05,gross:20000000,bonus:2000000,sec:15,
  g:{imp:true,click:false,view:false},note:'프리미엄 지면 브랜드 세이프티'}
];
const feeOf=l=>(+l.feeA||0)+(+l.feeR||0);
/* 예산은 Gross 를 직접 넣고 Net 을 수수료로 역산한다
   (수수료가 정해지기 전에 Gross 만 아는 경우가 많아 v17 에서 방향을 뒤집었다) */
const lineGross=l=>Math.round(+l.gross||0);
const lineNet=l=>Math.round(lineGross(l)*(1-feeOf(l)));
/* 밸류는 직접 입력(v21) — 값이 없으면 Gross + 보너스로 본다 */
const lineValue=l=>(l.value===undefined||l.value===null||l.value==='')
  ? lineGross(l)+(+l.bonus||0) : Math.round(+l.value||0);
const toGross=(net,fee)=>net/(1-fee);
/* 예전 저장본(net 기준)을 열면 Gross 로 옮겨 담는다 */
function migrateBudget(ls){(ls||[]).forEach(l=>{
  if(l.gross===undefined||l.gross===null||l.gross===''){
    const f=feeOf(l);l.gross=Math.round((+l.net||0)/(1-(f<1?f:0)))||0;}
  delete l.net;});}
const bonusRate=ls=>{const g=sum(ls.map(lineGross));return g?sum(ls.map(l=>+l.bonus||0))/g:0;};
/* ---- 더미 예상 수치 · 실집행 — 판매단가와 Gross 예산으로 일관되게 만든다 ---- */
(function seedNumbers(){
  const rng=s0=>{let x=s0;return()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};};
  LINES.forEach((l,i)=>{
    const r=rng(97+i*137),g=lineGross(l);
    const ctr=[.0006,.0003,.003,.003,.001,.0035,.004,.0008][i];
    const vtr=[.056,.29,.01,.01,.10,.004,.005,.09][i];
    let imp,click,view;
    if(l.bid==='CPM'){imp=g/l.price*1000;click=imp*ctr;view=imp*vtr;}
    else if(l.bid==='CPC'){click=g/l.price;imp=click/ctr;view=imp*vtr;}
    else {view=g/l.price;imp=view/vtr;click=imp*ctr;}
    const R=n=>Math.round(n);
    l.e={imp:R(imp),click:R(click),view:R(view),eng:R(imp*.0027),
      conv:R(click*.04),lead:R(click*.016),rev:R(g*.45),install:R(click*.064),
      like:R(imp*.0011),share:R(imp*.00024),
      v25:R(view*.78),v50:R(view*.55),v75:R(view*.38),v100:R(view*.29),
      v3:R(view*1.9),v15:R(view*.62),v30:R(view*.41)};
    /* 실집행 = 예상의 88~94%(경과 일수에 맞춘 페이스) × 라인별 성과 계수.
       광고비는 페이스대로 쓰고 물량만 계수만큼 달라지므로 매체마다 단가 효율이 갈린다. */
    const k=.885+r()*.05;
    const perf=[1.15,1.06,1.10,1.02,0.96,1.20,1.00,1.08][i];
    l.a={};Object.keys(l.e).forEach(m=>l.a[m]=Math.round(l.e[m]*k*perf*(.96+r()*.08)));
    l.a.net=Math.round(lineNet(l)*k);});
})();
const segments=()=>[...new Set(LINES.map(l=>l.segment))];

/* 기간 = 라인 시작/종료의 최소·최대 */
const DAY=86400000;
/* 새로 추가한 빈 라인(날짜 미입력)은 기간 계산에서 제외한다 */
const campStart=()=>LINES.map(l=>l.start).filter(Boolean).sort()[0]||CAMPAIGN.today;
const campEnd=()=>LINES.map(l=>l.end).filter(Boolean).sort().slice(-1)[0]||CAMPAIGN.today;
let d0=new Date(campStart()+'T00:00:00'),dE=new Date(campEnd()+'T00:00:00');
const dT=new Date(CAMPAIGN.today+'T00:00:00');
let TOTAL_DAYS=Math.round((dE-d0)/DAY)+1,ELAPSED=Math.round((dT-d0)/DAY)+1;
let ALLDATES=[...Array(TOTAL_DAYS)].map((_,i)=>new Date(d0.getTime()+i*DAY));
let dates=ALLDATES.slice(0,ELAPSED);
const WD=['일','월','화','수','목','금','토'];
const dFull=d=>`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const YESTERDAY=iso(new Date(dT.getTime()-DAY));

/* ===== 공휴일 (편집 가능) ===== */
let HOLIDAYS=[
 ['2026-01-01','신정'],['2026-02-16','설날 연휴'],['2026-02-17','설날'],['2026-02-18','설날 연휴'],
 ['2026-03-02','삼일절 대체'],['2026-05-05','어린이날'],['2026-05-24','부처님오신날'],['2026-05-25','부처님오신날 대체'],
 ['2026-06-06','현충일'],['2026-08-15','광복절'],['2026-08-17','광복절 대체'],
 ['2026-09-24','추석 연휴'],['2026-09-25','추석'],['2026-09-26','추석 연휴'],
 ['2026-10-03','개천절'],['2026-10-05','개천절 대체'],['2026-10-09','한글날'],['2026-12-25','성탄절'],
 ['2027-01-01','신정'],['2027-02-06','설날 연휴'],['2027-02-07','설날'],['2027-02-08','설날 연휴'],['2027-02-09','설날 대체'],
 ['2027-03-01','삼일절'],['2027-05-05','어린이날'],['2027-05-13','부처님오신날'],['2027-06-06','현충일'],['2027-06-07','현충일 대체'],
 ['2027-08-15','광복절'],['2027-08-16','광복절 대체'],['2027-09-14','추석 연휴'],['2027-09-15','추석'],['2027-09-16','추석 연휴'],
 ['2027-10-03','개천절'],['2027-10-04','개천절 대체'],['2027-10-09','한글날'],['2027-10-11','한글날 대체'],['2027-12-25','성탄절'],
 ['2028-01-01','신정'],['2028-01-26','설날 연휴'],['2028-01-27','설날'],['2028-01-28','설날 연휴'],
 ['2028-03-01','삼일절'],['2028-05-02','부처님오신날'],['2028-05-05','어린이날'],['2028-06-06','현충일'],
 ['2028-08-15','광복절'],['2028-10-02','추석 연휴'],['2028-10-03','추석 · 개천절'],['2028-10-04','추석 연휴'],
 ['2028-10-09','한글날'],['2028-12-25','성탄절']
];
const holName=d=>{const s=iso(d),h=HOLIDAYS.find(x=>x[0]===s);return h?h[1]:null;};
const isRest=d=>d.getDay()===0||d.getDay()===6||!!holName(d);   // 토·일·공휴일

function seeded(s){return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};}
function spread(total,n,rnd,ramp){
  const w=[...Array(n)].map((_,i)=>{const d=new Date(d0.getTime()+i*DAY);
    return (0.72+0.56*rnd())*(isRest(d)?0.76:1)*(1+ramp*(i/Math.max(n-1,1)));});
  const t=sum(w);let acc=0,out=[];
  for(let i=0;i<n;i++){out.push(Math.round(total*(acc+w[i])/t)-Math.round(total*acc/t));acc+=w[i];}
  return out;
}
const AMET=['imp','click','view','eng','conv','lead','install','like','share',
  'v25','v50','v75','v100','v3','v15','v30','rev','net'];
LINES.forEach((l,i)=>{l.daily={};AMET.forEach((m,j)=>l.daily[m]=spread(l.a[m],ELAPSED,seeded(17+i*131+j*29),.3+.05*j));});

let CREATIVES=[
 {id:'c1',lid:'L1',name:'6초 범퍼',type:'video',yt:'M7lc1UVf-VE',ratio:'16:9',
  g:'linear-gradient(140deg,#93a9bf,#354758)',run:[[0,32]],share:1},
 {id:'c2',lid:'L1',name:'15초 스토리',type:'video',yt:'ScMzIvxBSi4',ratio:'9:16',
  g:'linear-gradient(140deg,#b3c1cf,#495e72)',run:[[30,55]],share:1},
 {id:'c3',lid:'L2',name:'마스터 A',type:'video',yt:'dQw4w9WgXcQ',ratio:'16:9',
  g:'linear-gradient(140deg,#93a2b1,#354758)',run:[[0,55]],share:.55},
 {id:'c4',lid:'L2',name:'마스터 B',type:'video',yt:'aqz-KE-bpKQ',ratio:'16:9',
  g:'linear-gradient(140deg,#a5b7c8,#495e72)',run:[[6,55]],share:.45},
 {id:'c5',lid:'L3',name:'구독 B',type:'image',ratio:'1:1',
  g:'linear-gradient(140deg,#aabbcb,#495e72)',run:[[0,55]],share:1},
 {id:'c6',lid:'L4',name:'구독 A',type:'image',ratio:'4:5',
  g:'linear-gradient(140deg,#bfcad6,#495e72)',run:[[0,55]],share:1},
 {id:'c7',lid:'L5',name:'릴스 9:16',type:'video',yt:'aqz-KE-bpKQ',ratio:'9:16',
  g:'linear-gradient(140deg,#93a2b1,#35536f)',run:[[3,55]],share:.6},
 {id:'c8',lid:'L5',name:'피드 1:1',type:'image',ratio:'1:1',
  g:'linear-gradient(140deg,#b3c1cf,#354758)',run:[[0,40]],share:.4},
 {id:'c9',lid:'L6',name:'DA 640',type:'image',ratio:'16:9',
  g:'linear-gradient(140deg,#9fb3a8,#3d5b4c)',run:[[0,55]],share:.57},
 {id:'c10',lid:'L6',name:'DA 1200',type:'image',ratio:'16:9',
  g:'linear-gradient(140deg,#b7c7bd,#4c6a5b)',run:[[4,55]],share:.43},
 {id:'c11',lid:'L7',name:'보드 A',type:'image',ratio:'16:9',
  g:'linear-gradient(140deg,#c8bda0,#6b5c3c)',run:[[7,55]],share:.6},
 {id:'c12',lid:'L7',name:'보드 B',type:'image',ratio:'16:9',
  g:'linear-gradient(140deg,#d3ccb6,#7a6c4d)',run:[[12,55]],share:.4},
 {id:'c13',lid:'L8',name:'인리드 16:9',type:'video',yt:'ScMzIvxBSi4',ratio:'16:9',
  g:'linear-gradient(140deg,#a9a3bd,#4e4766)',run:[[0,55]],share:1}
];
let FACTS=[];
function buildFacts(){
  FACTS=[];
  CREATIVES.forEach(c=>{c.daily={};AMET.forEach(m=>c.daily[m]=[]);c.daily.cost=[];});
  LINES.forEach(l=>{
    const cs=CREATIVES.filter(c=>c.lid===l.id);
    for(let i=0;i<ELAPSED;i++){
      const act=cs.filter(c=>c.run.some(([a,b])=>i>=a&&i<=b));
      const tot=sum(act.map(c=>c.share))||1;
      cs.forEach(c=>{
        const k=act.includes(c)?c.share/tot:0, d=ALLDATES[i];
        const f={d:i,lid:l.id,cid:c.id,segment:l.segment,media:l.media,product:l.product,slot:l.slot||'',target:l.target,
          line:l.line,creative:c.name,month:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
        AMET.forEach(m=>f[m]=Math.round(((l.daily[m]&&l.daily[m][i])||0)*k));
        f.cost=toGross(f.net,feeOf(l));
        AMET.forEach(m=>c.daily[m].push(f[m]));c.daily.cost.push(f.cost);
        FACTS.push(f);
      });
    }
  });
  CREATIVES.forEach(c=>{AMET.concat(['cost']).forEach(m=>c['t_'+m]=sum(c.daily[m]));
    const l=LINES.find(x=>x.id===c.lid)||{};
    c.segment=l.segment;c.media=l.media;c.product=l.product;c.slot=l.slot||'';c.target=l.target;c.line=l.line;});
}
buildFacts();

let SHOW_ISSUES=true;
let ISSUES=[
 {s:'2026-08-04',e:'2026-08-06',scope:'YouTube · VVC',type:'소재',txt:'A/B 소재 교체 및 초기 학습 구간 — 노출 단가 일시 상승'},
 {s:'2026-08-05',e:'2026-08-09',scope:'Meta',type:'매체',txt:'Meta 계정 심사로 일부 광고그룹 승인 지연, 예산 이월 집행'},
 {s:'2026-08-09',e:'2026-08-10',scope:'YouTube · VRC',type:'홀딩',txt:'브랜드 검수 요청으로 VRC 일시 홀딩'},
 {s:'2026-08-17',e:'2026-08-17',scope:'Meta',type:'매체',txt:'Meta 광고관리자 개편, 반나절 집행 중단'},
 {s:'2026-08-18',e:'2026-08-21',scope:'전체',type:'기타',txt:'트래픽 감소로 일 예산 하향 조정 후 재분배'},
 {s:'2026-08-22',e:'2026-08-25',scope:'전체',type:'단가',txt:'경쟁 브랜드 신차 런칭으로 비딩 심화 → CPM 상승, 입찰가 상향 대응'},
 {s:'2026-08-28',e:'2026-08-29',scope:'YouTube · Demand Gen (구독)',type:'소재',txt:'신규 소재 교체 (Story 버전 투입)'},
 {s:'2026-09-03',e:'2026-09-05',scope:'전체',type:'기타',txt:'추석 프로모션 메시지로 카피 일괄 교체'},
 {s:'2026-09-10',e:'2026-09-12',scope:'네이버',type:'단가',txt:'성과형 DA 입찰가 상향으로 클릭 물량 확대'},
 {s:'2026-09-18',e:'2026-09-19',scope:'Meta',type:'소재',txt:'릴스 소재 리프레시 — 초기 학습 구간'},
 {s:'2026-09-24',e:'2026-09-25',scope:'전체',type:'기타',txt:'추석 연휴 트래픽 감소 대비 일 예산 조정'}
];
const dIdx=s=>Math.round((new Date(s+'T00:00:00')-d0)/DAY);
/* 캠페인 정보 변경 히스토리 — 실제로 값을 바꿀 때만 쌓인다 (예시 값 없음) */
let CAMP_HIST=[];

/* ===== 2. 지표 ===== */
/* ===== 항목 사전 — "열설정북.xlsx" 기준 =====
   [키, 국문명, 영문명, 카테고리, 유형(in=수동입력 / calc=계산),
    미디어믹스·예상효율 기본표시, 미디어믹스·예상효율 사용가능,
    대시보드·데이터입력 기본표시, 대시보드·데이터입력 사용가능]                       */
const CAT_ORDER=['운영','노출','클릭','조회','전환','설치','참여','비용','기타'];
const FIELDS=[
  ['date','일자','date','운영','in',0,0,1,1],
  ['start','시작일','start date','운영','in',1,1,0,1],
  ['end','종료일','end date','운영','in',1,1,0,1],
  ['startT','시작 시간','start time','운영','in',0,1,0,0],
  ['endT','종료 시간','end time','운영','in',0,1,0,0],

  ['imp','노출','imps.','노출','in',0,0,1,1],
  ['e_imp','목표 노출','est.imps.','노출','in',1,1,0,1],
  ['imp_r','노출 달성률','imps. achv.','노출','calc',0,0,1,1],
  ['cpm','CPM','CPM','노출','calc',0,1,1,1],

  ['click','클릭','click','클릭','in',0,0,1,1],
  ['e_click','목표 클릭','est.click','클릭','in',1,1,0,1],
  ['click_r','클릭 달성률','click achv.','클릭','calc',0,0,1,1],
  ['ctr','CTR','CTR','클릭','calc',0,1,1,1],
  ['cpc','CPC','CPC','클릭','calc',0,1,1,1],

  ['view','조회','view','조회','in',0,0,1,1],
  ['e_view','목표 조회','est.view','조회','in',1,1,0,1],
  ['view_r','조회 달성률','view achv.','조회','calc',0,0,1,1],
  ['vtr','VTR','VTR','조회','calc',0,1,1,1],
  ['cpv','CPV','CPV','조회','calc',0,1,1,1],
  ['v25','25% 조회','25% view','조회','in',0,0,0,1],
  ['v50','50% 조회','50% view','조회','in',0,0,0,1],
  ['v75','75% 조회','75% view','조회','in',0,0,0,1],
  ['v100','100% 조회','100% view','조회','in',0,0,0,1],
  ['v3','3초 조회','3s view','조회','in',0,0,0,1],
  ['v15','15초 조회','15s view','조회','in',0,0,0,1],
  ['v30','30초 조회','30s view','조회','in',0,0,0,1],
  ['e_v25','목표 25% 조회','est.25% view','조회','in',0,1,0,1],
  ['e_v50','목표 50% 조회','est.50% view','조회','in',0,1,0,1],
  ['e_v75','목표 75% 조회','est.75% view','조회','in',0,1,0,1],
  ['e_v100','목표 100% 조회','est.100% view','조회','in',0,1,0,1],
  ['e_v3','목표 3초 조회','est.3s view','조회','in',0,1,0,1],
  ['e_v15','목표 15초 조회','est.15s view','조회','in',0,1,0,1],
  ['e_v30','목표 30초 조회','est.30s view','조회','in',0,1,0,1],

  ['conv','전환','conversion','전환','in',0,0,0,1],
  ['e_conv','목표 전환','est.conversion','전환','in',0,1,0,1],
  ['conv_r','전환 달성률','conv. achv.','전환','calc',0,0,0,1],
  ['cvr','CVR','CVR','전환','calc',0,1,0,1],
  ['cpa','CPA','CPA','전환','calc',0,1,0,1],
  ['lead','양식제출','lead','전환','in',0,0,0,1],

  ['install','설치','install','설치','in',0,0,0,1],
  ['e_install','목표 설치','est.install','설치','in',0,1,0,1],
  ['cpi','CPI','CPI','설치','calc',0,1,0,1],

  ['eng','참여','Engagement','참여','in',0,0,0,1],
  ['e_eng','목표 참여','est.engagement','참여','in',0,1,0,1],
  ['etr','ETR','ETR','참여','calc',0,1,0,1],
  ['cpe','CPE','CPE','참여','calc',0,1,0,1],
  ['like','공감','like','참여','in',0,0,0,1],
  ['e_like','목표 공감','est.like','참여','in',0,1,0,1],
  ['share','공유','share','참여','in',0,0,0,1],
  ['e_share','목표 공유','est.share','참여','in',0,1,0,1],

  ['rev','매출','revenue','비용','in',0,0,1,1],
  ['e_rev','목표 매출','est.revenue','비용','in',0,1,0,1],
  ['budget','예산','budget','비용','calc',1,1,1,1],
  ['feeA','대행사 수수료율','agency fee','비용','in',1,1,0,1],
  ['feeR','렙사 수수료율','rep fee','비용','in',1,1,0,1],
  ['net','예산(net)','budget(net)','비용','in',1,1,0,1],
  ['cost','소진금액','spend','비용','in',0,1,1,1],
  ['value','밸류','value','비용','in',1,1,0,1],
  ['bonus','보너스 밸류','bonus','비용','in',0,1,0,1],
  ['bonusRate','보너스율','bonus rate','비용','calc',1,1,0,1],
  ['spend_r','예산 소진율','spend rate','비용','calc',0,0,1,1],
  ['roas','ROAS','ROAS','비용','calc',0,0,0,1],

  ['progress','진도율','progress','기타','calc',0,0,1,1]
].map(a=>({k:a[0],l:a[1],en:a[2],cat:a[3],kind:a[4],
  mixDef:!!a[5],mixOk:!!a[6],dashDef:!!a[7],dashOk:!!a[8]}));
const FLD={};FIELDS.forEach(f=>FLD[f.k]=f);
/* 사용 가능 여부에 따라 헤더 편집 카탈로그를 만든다 (카테고리별 묶음) */
function fieldCatalog(scope,extra){
  const ok=f=>scope==='mix'?f.mixOk:f.dashOk;
  const out=[];
  CAT_ORDER.forEach(c=>{
    const cols=FIELDS.filter(f=>f.cat===c&&ok(f)&&(!extra||extra(f))).map(f=>({k:f.k,l:f.l}));
    if(cols.length)out.push({g:c+' 관련',cols});});
  return out;
}
const fieldDefaults=scope=>FIELDS.filter(f=>scope==='mix'?f.mixDef:f.dashDef).map(f=>f.k);

const METRICS={
  imp:{l:'노출',f:fmt,kind:'abs'},click:{l:'클릭',f:fmt,kind:'abs'},view:{l:'조회',f:fmt,kind:'abs'},
  eng:{l:'참여',f:fmt,kind:'abs'},conv:{l:'전환',f:fmt,kind:'abs'},lead:{l:'양식제출',f:fmt,kind:'abs'},
  rev:{l:'매출',f:won,kind:'abs'},cost:{l:'광고비',f:won,kind:'abs'},
  install:{l:'설치',f:fmt,kind:'abs'},
  cpi:{l:'CPI',f:won,kind:'rate',c:d=>d.cost/d.install},
  ctr:{l:'CTR',f:v=>pct(v),kind:'rate',c:d=>d.click/d.imp},
  vtr:{l:'VTR',f:v=>pct(v),kind:'rate',c:d=>d.view/d.imp},
  cvr:{l:'CVR',f:v=>pct(v),kind:'rate',c:d=>d.conv/d.click},
  cpm:{l:'CPM',f:won,kind:'rate',c:d=>d.cost/d.imp*1000},
  cpc:{l:'CPC',f:won,kind:'rate',c:d=>d.cost/d.click},
  cpv:{l:'CPV',f:won,kind:'rate',c:d=>d.cost/d.view},
  cpa:{l:'CPA',f:won,kind:'rate',c:d=>d.cost/d.conv},
  cpe:{l:'CPE',f:won,kind:'rate',c:d=>d.cost/d.eng},
  etr:{l:'ETR',f:v=>pct(v),kind:'rate',c:d=>d.eng/d.imp},
  like:{l:'공감',f:fmt,kind:'abs'},share:{l:'공유',f:fmt,kind:'abs'},
  v25:{l:'25% 조회',f:fmt,kind:'abs'},v50:{l:'50% 조회',f:fmt,kind:'abs'},
  v75:{l:'75% 조회',f:fmt,kind:'abs'},v100:{l:'100% 조회',f:fmt,kind:'abs'},
  v3:{l:'3초 조회',f:fmt,kind:'abs'},v15:{l:'15초 조회',f:fmt,kind:'abs'},v30:{l:'30초 조회',f:fmt,kind:'abs'},
  roas:{l:'ROAS',f:v=>(!isFinite(v)?'–':v.toFixed(2)+'x'),kind:'rate',c:d=>d.rev/d.cost}
};
/* METRICS 라벨은 항목 사전을 따른다 */
Object.keys(METRICS).forEach(k=>{if(FLD[k])METRICS[k].l=FLD[k].l;});
const mval=(k,b)=>METRICS[k].kind==='abs'?b[k]:METRICS[k].c(b);
const zeroB=()=>{const b={cost:0};AMET.forEach(m=>b[m]=0);return b;};
const aggFacts=fs=>{const b=zeroB();fs.forEach(f=>{AMET.forEach(m=>b[m]+=f[m]);b.cost+=f.cost;});return b;};
const aggExp=ls=>{const b=zeroB();b.budget=0;b.value=0;b.netSum=0;b.bonusSum=0;
  b.dstart=null;b.dend=null;let wa=0,wr=0;
  ls.forEach(l=>{Object.keys(l.e).forEach(m=>b[m]=(b[m]||0)+l.e[m]);
    const gr=lineGross(l);b.cost+=gr;b.budget+=gr;b.value+=lineValue(l);
    b.netSum+=lineNet(l);b.bonusSum+=(l.bonus||0);
    wa+=gr*(+l.feeA||0);wr+=gr*(+l.feeR||0);
    if(!b.dstart||l.start<b.dstart)b.dstart=l.start;
    if(!b.dend||l.end>b.dend)b.dend=l.end;});
  b.feeA=b.budget?wa/b.budget:0;b.feeR=b.budget?wr/b.budget:0;
  return b;};
/* 날짜를 M/D 로 (앞자리 0 없이). 연도가 올해와 다르면 YY/M/D */
const mdy=s=>{if(!s)return '–';const [y,m,d]=String(s).split('-').map(Number);
  const cy=new Date(CAMPAIGN.today+'T00:00:00').getFullYear();
  return (y!==cy?String(y).slice(2)+'/':'')+m+'/'+d;};

const DIMS=[{k:'segment',l:'구분'},{k:'media',l:'매체'},{k:'product',l:'광고상품'},{k:'slot',l:'광고 지면'},
  {k:'target',l:'타겟팅 그룹'},
  {k:'line',l:'제품'},{k:'creative',l:'소재'},{k:'month',l:'월'}];
const NO_EXP_DIMS=['creative','month'];
/* from/to = 사용자가 달력으로 직접 고른 시작·종료일 (비우면 자동) */
let FILTER={segment:'all',media:'all',line:'all',from:'',to:''};
/* 기간 기본값 — 시작일은 캠페인 첫날, 종료일은 어제(데이터가 확정된 마지막 날) */
function resetDateFilter(){
  const p=campScope();
  FILTER.from=p.startIso;
  FILTER.to=p.endIso>YESTERDAY?(YESTERDAY>=p.startIso?YESTERDAY:p.startIso):p.endIso;
}
const activeLines=()=>LINES.filter(l=>['segment','media','line'].every(k=>FILTER[k]==='all'||l[k]===FILTER[k]));

/* ===== 조회 기간(스코프) =====
   구분·매체·제품을 고르면 그 라인들이 실제로 집행되는 가장 빠른 날 ~ 가장 늦은 날로 좁힌다.
   대시보드의 효율/표/소재 운영 탭이 모두 이 스코프를 공유한다. */
const mkScope=(s,e)=>{
  let i0=Math.max(dIdx(s),0),i1=Math.min(dIdx(e),TOTAL_DAYS-1);
  if(i1<i0)i1=i0;
  const days=i1-i0+1;
  return {i0,i1,days,elapsed:Math.max(0,Math.min(ELAPSED-i0,days)),
    start:ALLDATES[i0],end:ALLDATES[i1],startIso:iso(ALLDATES[i0]),endIso:iso(ALLDATES[i1])};
};
/* 집행 스코프 — 선택한 항목(구분·매체·제품)이 실제로 집행되는 전체 구간.
   달력 선택의 상한·하한을 정하는 바탕이다. */
function campScope(){
  const ls=activeLines().filter(l=>l.start&&l.end);
  return mkScope(ls.length?ls.map(l=>l.start).sort()[0]:campStart(),
                 ls.length?ls.map(l=>l.end).sort().slice(-1)[0]:campEnd());
}
/* 조회 스코프 — 집행 스코프에 달력으로 고른 시작·종료일을 적용한 "보고 있는 구간".
   기본값은 캠페인 첫날 ~ 어제(데이터가 확정된 마지막 날). */
function viewScope(){
  const p=campScope();
  let s=p.startIso,e=p.endIso>YESTERDAY?(YESTERDAY>=s?YESTERDAY:s):p.endIso;
  if(FILTER.from&&FILTER.from>s)s=FILTER.from;
  if(FILTER.to)e=FILTER.to<p.endIso?FILTER.to:p.endIso;
  if(e<s)e=s;
  return mkScope(s,e);
}
/* 진행 스코프 = 캠페인 설정에 적힌 집행 구간.
   기간·날짜 게이지·시작/종료일·목표 페이스는 달력 선택과 무관하게 늘 여기를 기준으로 말한다.
   (실적 수치는 아래 paceSum · paceFacts 처럼 달력으로 고른 구간만 더한다) */
function paceScope(){return campScope();}
/* 목표는 캠페인 전체 목표 그대로 — 기간을 좁혀도 목표가 줄지 않는다 */
function goalIn(l,k){return (+(l&&l.e&&l.e[k]))||0;}
const viewDates=()=>{const s=viewScope();return ALLDATES.slice(s.i0,s.i1+1);};
const paceRatio=()=>{const s=paceScope();return s.days?s.elapsed/s.days:0;};
function factFilter(extra){
  const s=viewScope();
  return FACTS.filter(f=>f.d>=s.i0&&f.d<=s.i1
    &&['segment','media','line'].every(k=>FILTER[k]==='all'||f[k]===FILTER[k])&&(!extra||extra(f)));
}
/* 실적 팩트 — 달력으로 고른 구간만. 대시보드의 집행 수치·금액은 모두 이걸 쓴다 */
function paceFacts(){
  const s=viewScope();
  return FACTS.filter(f=>f.d>=s.i0&&f.d<=s.i1
    &&['segment','media','line'].every(k=>FILTER[k]==='all'||f[k]===FILTER[k]));
}
const isClient=()=>document.body.dataset.role==='client';
/* 집행 실적 합계 — 달력으로 고른 구간만 더한다 */
const paceSum=arr=>{const s=viewScope();return sum((arr||[]).slice(s.i0,Math.min(s.i1+1,ELAPSED)));};
const kpiAch=l=>{const k=kpiOf(l);return paceSum(l.daily[k])/goalIn(l,k);};
