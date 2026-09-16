/* ===== 13. 트렌드 리포트 — 모든 캠페인이 함께 쓰는 자료 게시판 (v66) =====
   · 캠페인마다 "뷰어에게 보일지"를 켜고 끌 수 있다 (기본 켜짐).
   · 로그인하면 바로 올리고, 로그인하지 않으면 수정·삭제용 ID/PW 를 정해서 올린다.
   · 파일은 한 개당 10MB 까지. 클라우드가 붙어 있으면 Supabase Storage,
     붙어 있지 않으면(데모) 이 브라우저 안에서만 도는 임시 보관소를 쓴다. */

const TREND_MAX_MB=10;                      /* 파일 한 개 최대 용량 — Supabase 버킷 설정과 같게 */
/* 한 자료에 파일을 무한정 붙이면 글 하나가 저장 공간을 크게 먹는다.
   한 개 한도만으로는 막히지 않아 **자료 하나의 합계**도 함께 막아 둔다 (v67). */
const TREND_MAX_TOTAL_MB=50;
const TREND_BUCKET='trend';
const TREND_CATS_DEFAULT=['디지털','옥외광고','TV','PPL','OTT','분석 리포트'];
const TREND_ETC='기타';
/* 세부 매체명을 받는 카테고리 — 나머지는 매체 칸을 숨긴다 */
const TREND_MEDIA_CATS=['디지털','옥외광고','TV','TV광고','OTT'];
const TREND_NEW_DAYS=3;
/* 무료 플랜 기준 저장 한도 — 사용량 막대의 분모로만 쓴다 */
const TREND_QUOTA=1024*1024*1024;

const TREND={posts:[],cats:TREND_CATS_DEFAULT.slice(),media:[],
  q:'',cat:'all',ready:false,loading:false,err:''};
/* 데모(클라우드 미설정)에서 올린 파일은 이 세션 안에서만 산다 */
const TREND_BLOBS={};

const trendOn=()=>{try{return !!(CLOUD&&CLOUD.on&&CLOUD.sb);}catch(e){return false;}};
/* 이 게시판을 고칠 수 있는 사람 = 마스터 · 슈퍼마스터 · 운영진 */
function trendAdmin(){
  try{
    if(CLOUD&&CLOUD.user&&(CLOUD.appRole==='super'||CLOUD.appRole==='master'))return true;
    if(CLOUD&&CLOUD.user&&CLOUD.campaign&&(CLOUD.role==='master'||CLOUD.role==='editor'))return true;
    if(!trendOn())return true;                /* 데모에서는 시안을 만져 볼 수 있게 */
    if(CLOUD&&CLOUD.shareView&&CLOUD.shareRole==='staff')return true;
  }catch(e){}
  return false;
}
/* 뷰어(광고주)에게 이 탭을 보일지 — 캠페인마다 정한다. 기본은 보임 */
let TREND_VIEWER=true;
const trendVisibleToViewer=()=>TREND_VIEWER!==false;

/* ---------- 작은 도구들 ---------- */
const trendUid=()=>'tp'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const trendNow=()=>new Date().toISOString();
function trendDays(iso){
  const t=Date.parse(iso);if(!isFinite(t))return 999;
  return (Date.now()-t)/86400000;}
const trendIsNew=p=>trendDays(p.created_at)<=TREND_NEW_DAYS;
function trendDate(iso){
  const d=new Date(iso);if(isNaN(d))return '';
  const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())}`;}
const trendMB=b=>(b/1048576).toFixed(b>=10485760?0:1)+'MB';
/* 비로그인 수정·삭제용 암호는 그대로 두지 않고 섞어서 흔적만 저장한다 */
async function trendHash(id,pw){
  const s=`dmd-trend|${id}|${pw}`;
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }catch(e){
    let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;}
    return 'x'+(h>>>0).toString(16);}
}
const trendFileKind=n=>{
  const e=String(n||'').split('.').pop().toLowerCase();
  if(['jpg','jpeg','png','gif','webp','bmp','svg'].includes(e))return 'image';
  if(e==='pdf')return 'pdf';
  if(['xls','xlsx','csv'].includes(e))return 'excel';
  if(['doc','docx'].includes(e))return 'word';
  if(['ppt','pptx'].includes(e))return 'ppt';
  if(['mp4','mov','webm','avi','mkv'].includes(e))return 'video';
  return 'file';};
const TREND_KIND_LABEL={image:'이미지',pdf:'PDF',excel:'엑셀',word:'워드',ppt:'PPT',
  video:'영상',link:'링크',file:'파일'};

/* ---------- 매체명이 갈라지지 않게 (v66) ----------
   "NAVER GFA" 와 "네이버 GFA" 는 사람 눈에는 같은 매체지만 글자로는 남남이다.
   그래서 견줄 때만 한글 브랜드 이름을 영문으로 바꿔 놓고 띄어쓰기·대소문자를 털어 낸다.
   (저장은 사람이 쓴 그대로 하고, 겹칠 때만 "이 이름으로 맞추기" 를 권한다) */
const TREND_ALIAS={
  '네이버':'naver','네어버':'naver','카카오':'kakao','다음':'daum','구글':'google',
  '유튜브':'youtube','유투브':'youtube','메타':'meta','페이스북':'facebook','페북':'facebook',
  '인스타그램':'instagram','인스타':'instagram','틱톡':'tiktok','토스':'toss','당근':'daangn',
  '쿠팡플레이':'coupangplay','쿠팡':'coupang','넷플릭스':'netflix','넷플':'netflix',
  '티빙':'tving','웨이브':'wavve','왓챠':'watcha','디즈니':'disney','디즈니플러스':'disney',
  '아프리카':'soop','숲':'soop','크리테오':'criteo','몰로코':'moloco','애드저스트':'adjust',
  '앱러빈':'applovin','트위터':'x','엑스':'x','라인':'line','배달의민족':'baemin','배민':'baemin',
  '지상파':'terrestrial','종편':'cable','케이블':'cable','지하철':'subway','버스':'bus',
  '옥외':'ooh','전광판':'billboard'};
function trendNormMedia(s){
  let v=String(s||'').toLowerCase().trim();
  /* 긴 이름부터 바꿔야 "쿠팡플레이" 가 "쿠팡"+"플레이" 로 쪼개지지 않는다 */
  Object.keys(TREND_ALIAS).sort((a,b)=>b.length-a.length)
    .forEach(k=>{v=v.split(k).join(TREND_ALIAS[k]);});
  return v.replace(/[\s_\-.·]/g,'');
}
/* 이미 쓰인 이름 중 같은 매체로 보이는 것 */
function trendSameMedia(v){
  const n=trendNormMedia(v);
  if(!n)return '';
  return (TREND.media||[]).find(m=>m!==v&&trendNormMedia(m)===n)||'';
}

/* ---------- 썸네일 — 이미지는 그대로, 나머지는 제목으로 표지를 그린다 ---------- */
function trendMakeThumb(title,kind){
  try{
    const W=480,H=270,c=document.createElement('canvas');
    c.width=W;c.height=H;
    const x=c.getContext('2d');
    /* 제목마다 늘 같은 색이 나오도록 글자에서 색을 뽑는다 */
    let h=0;for(const ch of String(title||'')){h=(h*31+ch.charCodeAt(0))|0;}
    const hue=Math.abs(h)%360;
    const g=x.createLinearGradient(0,0,W,H);
    g.addColorStop(0,`hsl(${hue} 22% 34%)`);
    g.addColorStop(1,`hsl(${(hue+28)%360} 26% 22%)`);
    x.fillStyle=g;x.fillRect(0,0,W,H);
    x.fillStyle='rgba(255,255,255,.93)';
    x.font='700 30px -apple-system,"Malgun Gothic",sans-serif';
    x.textBaseline='top';
    /* 제목을 칸 안에서 줄바꿈 — 최대 세 줄 */
    const words=String(title||'자료').split(/\s+/);
    const lines=[];let cur='';
    words.forEach(w=>{
      const t=cur?cur+' '+w:w;
      if(x.measureText(t).width>W-64&&cur){lines.push(cur);cur=w;}else cur=t;});
    if(cur)lines.push(cur);
    const show=lines.slice(0,3);
    if(lines.length>3)show[2]=show[2].slice(0,Math.max(0,show[2].length-1))+'…';
    show.forEach((l,i)=>x.fillText(l,32,64+i*40));
    x.fillStyle='rgba(255,255,255,.55)';
    x.font='600 17px -apple-system,"Malgun Gothic",sans-serif';
    x.fillText(TREND_KIND_LABEL[kind]||'자료',32,H-42);
    return c.toDataURL('image/jpeg',0.72);
  }catch(e){return '';}
}
/* 올린 이미지를 카드 크기로 줄여 썸네일로 쓴다 (원본을 그대로 쓰면 목록이 무거워진다) */
function trendShrink(file){
  return new Promise(res=>{
    try{
      const fr=new FileReader();
      fr.onload=()=>{
        const im=new Image();
        im.onload=()=>{
          try{
            const W=480,H=Math.round(W*im.height/im.width)||270;
            const c=document.createElement('canvas');c.width=W;c.height=H;
            c.getContext('2d').drawImage(im,0,0,W,H);
            res(c.toDataURL('image/jpeg',0.72));
          }catch(e){res('');}};
        im.onerror=()=>res('');
        im.src=fr.result;};
      fr.onerror=()=>res('');
      fr.readAsDataURL(file);
    }catch(e){res('');}});
}

/* ---------- 보관소 — 클라우드가 있으면 Supabase, 없으면 이 브라우저 ---------- */
const TREND_LS='dmd_trend_demo_v1';
function trendLocalRead(){
  try{const s=localStorage.getItem(TREND_LS);if(!s)return null;return JSON.parse(s);}catch(e){return null;}}
function trendLocalWrite(){
  try{localStorage.setItem(TREND_LS,JSON.stringify(
    {posts:TREND.posts,cats:TREND.cats,media:TREND.media}));}catch(e){}}

async function trendLoad(force){
  if(TREND.loading)return;
  if(TREND.ready&&!force)return;
  TREND.loading=true;TREND.err='';
  try{
    if(trendOn()){
      const sb=CLOUD.sb;
      const [a,b]=await Promise.all([
        sb.from('trend_posts_pub').select('*').order('created_at',{ascending:false}),
        sb.from('trend_meta').select('*')]);
      if(a.error)throw a.error;
      TREND.posts=(a.data||[]).map(trendNorm);
      const meta={};(b.data||[]).forEach(r=>{meta[r.k]=r.v;});
      TREND.cats=Array.isArray(meta.categories)&&meta.categories.length
        ?meta.categories.slice():TREND_CATS_DEFAULT.slice();
      TREND.media=Array.isArray(meta.media)?meta.media.slice():[];
    }else{
      const s=trendLocalRead();
      if(s&&Array.isArray(s.posts)){
        TREND.posts=s.posts.map(trendNorm);
        TREND.cats=(s.cats&&s.cats.length)?s.cats.slice():TREND_CATS_DEFAULT.slice();
        TREND.media=s.media||[];
      }else{
        TREND.posts=trendDemoSeed();
        TREND.cats=TREND_CATS_DEFAULT.slice();
        TREND.media=['NAVER GFA','Meta','YouTube','카카오모먼트','Teads'];
        trendLocalWrite();}
    }
    TREND.ready=true;
  }catch(e){
    const m=(e&&e.message)||String(e);
    /* 아직 스키마를 안 올렸을 때가 가장 흔하다 — 그때는 무엇을 하면 되는지 알려 준다 */
    TREND.err=/trend_posts|schema cache|does not exist|relation/i.test(m)
      ? '게시판 저장소가 아직 만들어지지 않았습니다. Supabase > SQL Editor 에서 '
        +'supabase/schema.sql 의 "v66 — 트렌드 리포트 게시판" 블록을 실행하고, '
        +`Storage 에 trend 버킷(Public, ${TREND_MAX_MB}MB)을 만들어 주세요.`
      : m;
    TREND.posts=TREND.posts||[];
  }
  TREND.loading=false;
  /* 매체 사전은 지금까지 올라온 자료에서도 긁어 모은다 (자동완성용) */
  trendLearnMedia();
  renderTrend();
}
function trendNorm(r){
  return {id:r.id,title:r.title||'',body:r.body||'',category:r.category||TREND_ETC,
    medium:r.medium||'',tags:Array.isArray(r.tags)?r.tags:[],
    secret:!!r.secret,files:Array.isArray(r.files)?r.files:[],
    link:r.link||'',thumb:r.thumb||'',
    author_id:r.author_id||null,author_name:r.author_name||'',
    guest_id:r.guest_id||'',guest_hash:r.guest_hash||'',
    /* 클라우드에서는 비밀번호 흔적을 내려받지 않는다 — 있는지 여부만 온다 */
    has_pw:(r.has_pw!==undefined)?!!r.has_pw:!!r.guest_hash,
    bytes:+r.bytes||0,created_at:r.created_at||trendNow(),updated_at:r.updated_at||r.created_at};
}
function trendLearnMedia(){
  const set=new Set(TREND.media||[]);
  (TREND.posts||[]).forEach(p=>{if(p.medium)set.add(p.medium);});
  TREND.media=[...set].sort((a,b)=>a.localeCompare(b,'ko'));
}

/* ---------- 데모용 예시 자료 ---------- */
function trendDemoSeed(){
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  const mk=(t,b,c,m,tags,sec,day,who,kind)=>({
    id:trendUid(),title:t,body:b,category:c,medium:m,tags,secret:sec,
    files:[{name:t+(kind==='pdf'?'.pdf':kind==='ppt'?'.pptx':'.xlsx'),size:1_200_000,kind}],
    link:'',thumb:trendMakeThumb(t,kind),author_id:null,author_name:who,
    guest_id:'',guest_hash:'',bytes:1_200_000,created_at:d(day),updated_at:d(day)});
  return [
    mk('2026년 9월 Google Analytics 소식지 — 수명 주기 보고서 심층 분석',
      '탐색 보고서의 코호트·잔존율 지표를 캠페인 리포팅에 붙이는 방법을 정리했습니다. GA4 표준 리포트와 어떤 값이 어긋나는지도 함께 담았습니다.',
      '분석 리포트','',['GA4','리포팅','잔존율'],false,1,'jin@nasmedia.co.kr','pdf'),
    mk('[SOOP] 2026 LOL WORLDS 롤드컵 패키지 소개서',
      '롤드컵 기간 SOOP 스트리밍 패키지 단가와 인벤토리 구성입니다. 결승 주간은 별도 견적입니다.',
      '디지털','SOOP',['롤드컵','스포츠','스트리밍'],false,2,'media@nasmedia.co.kr','ppt'),
    mk('구글 AwG Q3 Product Session — AI Max & App',
      'AI Max 캠페인 구조와 iOS 앱 캠페인 변경 사항 세션 자료입니다.',
      '디지털','Google',['구글','AIMax','앱'],true,2,'jin@nasmedia.co.kr','ppt'),
    mk('OOH 제안 — 지하철 도면 ZIP',
      '2호선·9호선 주요 역사 도면과 매체 위치를 한 파일에 모았습니다.',
      '옥외광고','지하철',['OOH','지하철','도면'],false,4,'ooh@nasmedia.co.kr','pdf'),
    mk('ADVoost 플레이스 상품 소개서',
      '네이버 플레이스 광고를 간편하게 집행하는 베타 상품 안내입니다.',
      '디지털','NAVER GFA',['네이버','플레이스','베타'],false,6,'media@nasmedia.co.kr','pdf'),
    mk('2026 상반기 TV 시청률 트렌드',
      '지상파·종편 시간대별 시청률 변화와 광고 단가 흐름을 정리했습니다.',
      'TV','지상파',['TV','시청률'],false,9,'tv@nasmedia.co.kr','xlsx'),
    mk('OTT 오리지널 PPL 집행 사례집',
      '최근 6개월 OTT 오리지널 시리즈 PPL 집행 사례와 노출 효과를 모았습니다.',
      'PPL','',['PPL','OTT','사례'],true,12,'ppl@nasmedia.co.kr','ppt'),
    mk('넷플릭스 광고형 요금제 인벤토리 안내',
      '광고형 요금제 가입자 추이와 국내 인벤토리 구매 조건입니다.',
      'OTT','Netflix',['OTT','넷플릭스'],false,15,'ott@nasmedia.co.kr','pdf')];
}

/* ---------- 지금 사람이 이 글을 고칠 수 있는가 ---------- */
const trendIsOwner=p=>{try{return !!(CLOUD&&CLOUD.user&&p.author_id&&CLOUD.user.id===p.author_id);}
  catch(e){return false;}};
function trendCanEdit(p){
  if(trendAdmin())return true;
  if(trendIsOwner(p))return true;
  return !!p.has_pw;              /* 비로그인 글은 ID/PW 를 맞히면 고칠 수 있다 */
}
const trendNeedPw=p=>!trendAdmin()&&!trendIsOwner(p)&&!!p.has_pw;
/* 확인한 비밀번호 흔적을 이 글에 잠깐 들고 있는다 (저장·삭제할 때 서버가 다시 본다) */
const TREND_PW={};

/* ---------- 목록 거르기 ---------- */
function trendList(){
  const q=TREND.q.trim().toLowerCase();
  return (TREND.posts||[])
    .filter(p=>TREND.cat==='all'||p.category===TREND.cat)
    .filter(p=>{
      if(!q)return true;
      const hay=[p.title,p.body,p.medium,(p.tags||[]).join(' '),p.author_name]
        .join(' ').toLowerCase();
      return hay.includes(q);})
    .slice()
    .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
}
const trendUsedBytes=()=>(TREND.posts||[]).reduce((a,p)=>a+(+p.bytes||0),0);

/* ---------- 화면 그리기 ---------- */
function renderTrend(){
  const host=$('trendBody');if(!host)return;
  const canPost=true;                    /* 업로드는 누구나 */
  const admin=trendAdmin();
  const list=trendList();
  const counts={};(TREND.posts||[]).forEach(p=>{counts[p.category]=(counts[p.category]||0)+1;});
  const cats=TREND.cats.concat(TREND.cats.includes(TREND_ETC)?[]:[TREND_ETC]);
  const used=trendUsedBytes();
  host.innerHTML=
   `<aside class="tsidebar">
      ${canPost?'<button class="btn primary tpost" id="trendNew">＋ 자료 등록</button>':''}
      <div class="tcats">
        <div class="tct">카테고리</div>
        <button class="tcat${TREND.cat==='all'?' on':''}" data-cat="all">
          <span>전체</span><i>${(TREND.posts||[]).length}</i></button>
        ${cats.map(c=>`<button class="tcat${TREND.cat===c?' on':''}" data-cat="${esc(c)}">
          <span>${esc(c)}</span><i>${counts[c]||0}</i></button>`).join('')}
      </div>
      ${admin?`<button class="btn sm tcatedit" id="trendCatEdit"
        title="카테고리를 추가·삭제하고 순서를 바꿉니다">⚙ 카테고리 편집</button>`:''}
      ${admin?`<div class="tusage" title="게시판에 올라온 파일 용량의 합계입니다">
        <div class="tuh"><span>저장 공간</span><b>${trendMB(used)}</b></div>
        <div class="tubar"><i style="width:${Math.min(100,used/TREND_QUOTA*100).toFixed(2)}%"></i></div>
        <div class="tun">무료 한도 1GB · 파일 한 개 ${TREND_MAX_MB}MB 까지
          <br>남은 공간으로 ${TREND_MAX_MB}MB 자료 약 ${Math.max(0,Math.floor((TREND_QUOTA-used)/(TREND_MAX_MB*1048576)))}건</div>
      </div>`:''}
    </aside>
    <section class="tmain">
      <div class="tbar">
        <div class="tsearch">
          <input id="trendQ" type="search" placeholder="제목 · 내용 · 해시태그 · 매체로 찾기"
            value="${esc(TREND.q)}">
          <span class="tmag" aria-hidden="true">⌕</span>
        </div>
        <span class="thint">조회결과 <b>${list.length}</b>건</span>
        <div class="spacer"></div>
        <span class="thint">최신순</span>
      </div>
      ${TREND.err?`<div class="tempty"><b>자료를 불러오지 못했습니다.</b><span>${esc(TREND.err)}</span></div>`:''}
      ${TREND.loading?'<div class="tempty"><b>불러오는 중…</b></div>'
        :list.length?`<div class="tgrid">${list.map(trendCardHTML).join('')}</div>`
        :`<div class="tempty"><b>${TREND.q||TREND.cat!=='all'?'조건에 맞는 자료가 없습니다.':'아직 올라온 자료가 없습니다.'}</b>
           <span>${TREND.q||TREND.cat!=='all'?'검색어나 카테고리를 바꿔 보세요.':'＋ 자료 등록 으로 첫 자료를 올려 보세요.'}</span></div>`}
    </section>`;
  /* 손잡이 달기 */
  const q=$('trendQ');
  if(q){
    q.oninput=()=>{TREND.q=q.value;
      clearTimeout(q._t);q._t=setTimeout(()=>{const at=document.activeElement===q;
        renderTrend();if(at){const n=$('trendQ');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}}},180);};
  }
  host.querySelectorAll('.tcat').forEach(b=>b.onclick=()=>{TREND.cat=b.dataset.cat;renderTrend();});
  host.querySelectorAll('.tcard').forEach(c=>c.onclick=()=>openTrendPost(c.dataset.id));
  {const b=$('trendNew');if(b)b.onclick=()=>openTrendForm(null);}
  {const b=$('trendCatEdit');if(b)b.onclick=openTrendCats;}
}
function trendCardHTML(p){
  const kind=(p.files&&p.files[0]&&p.files[0].kind)||(p.link?'link':'file');
  const th=p.thumb||'';
  return `<article class="tcard" data-id="${esc(p.id)}" tabindex="0">
    <div class="tthumb">${th?`<img src="${esc(th)}" alt="">`
      :`<div class="tnothumb">${esc(TREND_KIND_LABEL[kind]||'자료')}</div>`}
      ${trendIsNew(p)?'<span class="tnew">NEW</span>':''}
      ${p.secret?'<span class="tsecret">대외비</span>':''}</div>
    <div class="tbodybox">
      <div class="ttitle">${esc(p.title)}</div>
      <div class="tdesc">${esc(p.body||' ')}</div>
      ${(p.tags&&p.tags.length)?`<div class="ttags">${p.tags.slice(0,5)
        .map(t=>`<span>#${esc(t)}</span>`).join('')}</div>`:''}
      <div class="tmeta"><span>${trendDate(p.created_at)}</span>
        <span class="tdot">·</span><span class="tby">${esc(p.author_name||p.guest_id||'익명')}</span>
        ${p.medium?`<span class="tdot">·</span><span>${esc(p.medium)}</span>`:''}</div>
    </div></article>`;
}

/* ---------- 상세 보기 — 가운데에서 자료를 넘겨 본다 ---------- */
let TREND_VIEW={id:null,i:0};
function openTrendPost(id){
  const p=(TREND.posts||[]).find(x=>x.id===id);if(!p)return;
  TREND_VIEW={id,i:0};
  const ov=trendOverlay('tdetail');
  const draw=()=>{
    const items=trendItems(p);
    const it=items[TREND_VIEW.i]||null;
    ov.querySelector('.tdbody').innerHTML=
      `<div class="tdview">
         ${items.length>1?`<button class="tnav prev" aria-label="이전">‹</button>`:''}
         <div class="tstage">${trendStageHTML(it,p)}</div>
         ${items.length>1?`<button class="tnav next" aria-label="다음">›</button>`:''}
         ${items.length>1?`<div class="tdots">${items.map((_,i)=>
            `<i class="${i===TREND_VIEW.i?'on':''}" data-i="${i}"></i>`).join('')}</div>`:''}
       </div>
       <div class="tdside">
         <div class="tdhead">
           ${p.secret?'<span class="tsecret sm">대외비</span>':''}
           ${trendIsNew(p)?'<span class="tnew sm">NEW</span>':''}
           <span class="tdcat">${esc(p.category)}${p.medium?' · '+esc(p.medium):''}</span>
         </div>
         <h3 class="tdtitle">${esc(p.title)}</h3>
         <div class="tdmeta">${trendDate(p.created_at)} · ${esc(p.author_name||p.guest_id||'익명')}</div>
         ${(p.tags&&p.tags.length)?`<div class="ttags big">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>`:''}
         <div class="tdtext">${esc(p.body||'').replace(/\n/g,'<br>')||'<span class="na">본문이 없습니다.</span>'}</div>
         <div class="tdfiles">
           ${(p.files||[]).map((f,i)=>`<button class="tfile" data-dl="${i}">
              <span class="tfk">${esc(TREND_KIND_LABEL[f.kind]||'파일')}</span>
              <span class="tfn">${esc(f.name)}</span>
              <span class="tfs">${trendMB(f.size||0)}</span><span class="tfd">내려받기</span></button>`).join('')}
           ${p.link?`<a class="tfile" href="${esc(p.link)}" target="_blank" rel="noopener">
              <span class="tfk">링크</span><span class="tfn">${esc(p.link)}</span>
              <span class="tfd">열기</span></a>`:''}
         </div>
         <div class="tdact">
           ${trendCanEdit(p)?`<button class="btn sm" id="tdEdit">수정</button>
             <button class="btn sm danger" id="tdDel">삭제</button>`:''}
           <div class="spacer"></div>
           <button class="btn sm" id="tdClose">닫기</button>
         </div>
       </div>`;
    const go=d=>{const n=trendItems(p).length;if(!n)return;
      TREND_VIEW.i=(TREND_VIEW.i+d+n)%n;draw();};
    const pv=ov.querySelector('.tnav.prev');if(pv)pv.onclick=e=>{e.stopPropagation();go(-1);};
    const nx=ov.querySelector('.tnav.next');if(nx)nx.onclick=e=>{e.stopPropagation();go(1);};
    ov.querySelectorAll('.tdots i').forEach(d=>d.onclick=e=>{e.stopPropagation();
      TREND_VIEW.i=+d.dataset.i;draw();});
    ov.querySelectorAll('[data-dl]').forEach(b=>b.onclick=e=>{e.stopPropagation();
      trendDownload(p,+b.dataset.dl);});
    {const b=ov.querySelector('#tdClose');if(b)b.onclick=()=>ov.remove();}
    {const b=ov.querySelector('#tdEdit');if(b)b.onclick=async()=>{
      if(await trendAuth(p)){ov.remove();openTrendForm(p);}};}
    {const b=ov.querySelector('#tdDel');if(b)b.onclick=async()=>{
      if(!(await trendAuth(p)))return;
      confirmModal('이 자료를 삭제할까요?',
        `<b>${esc(p.title)}</b><br>삭제하면 되돌릴 수 없습니다.`,
        async()=>{await trendDelete(p);ov.remove();},'삭제',true);};}
    /* 손가락으로 넘기기 */
    const st=ov.querySelector('.tstage');
    if(st){let x0=null;
      st.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
      st.addEventListener('touchend',e=>{
        if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;
        if(Math.abs(dx)>40)go(dx<0?1:-1);},{passive:true});}
  };
  draw();
  ov.addEventListener('keydown',e=>{
    const items=trendItems(p);
    if(e.key==='ArrowRight'&&items.length>1){TREND_VIEW.i=(TREND_VIEW.i+1)%items.length;draw();}
    if(e.key==='ArrowLeft'&&items.length>1){TREND_VIEW.i=(TREND_VIEW.i-1+items.length)%items.length;draw();}
    if(e.key==='Escape')ov.remove();});
  ov.tabIndex=-1;ov.focus();
}
function trendItems(p){
  const out=(p.files||[]).map((f,i)=>({f,i}));
  if(p.link)out.push({link:p.link});
  if(!out.length&&p.thumb)out.push({thumbOnly:true});
  return out;
}
function trendStageHTML(it,p){
  if(!it)return `<div class="tnofile">미리 볼 자료가 없습니다.</div>`;
  if(it.link)return `<div class="tnofile"><b>링크 자료</b>
    <span>${esc(it.link)}</span>
    <a class="btn sm" href="${esc(it.link)}" target="_blank" rel="noopener">새 창에서 열기</a></div>`;
  const f=it.f;
  const url=trendFileURL(p,it.i);
  if(f.kind==='image'&&url)return `<img class="tstageimg" src="${esc(url)}" alt="${esc(f.name)}">`;
  if(f.kind==='video'&&url)return `<video class="tstageimg" src="${esc(url)}" controls></video>`;
  if(f.kind==='pdf'&&url)return `<iframe class="tstagepdf" src="${esc(url)}#toolbar=0" title="${esc(f.name)}"></iframe>`;
  return `<div class="tnofile">
    ${p.thumb?`<img class="tstageimg soft" src="${esc(p.thumb)}" alt="">`:''}
    <b>${esc(TREND_KIND_LABEL[f.kind]||'파일')} — ${esc(f.name)}</b>
    <span>브라우저에서 바로 볼 수 없는 형식입니다. 오른쪽에서 내려받아 확인해 주세요.</span></div>`;
}
function trendFileURL(p,i){
  const f=(p.files||[])[i];if(!f)return '';
  if(TREND_BLOBS[p.id+'|'+i])return TREND_BLOBS[p.id+'|'+i];
  if(f.url)return f.url;
  if(f.path&&trendOn()){
    try{const {data}=CLOUD.sb.storage.from(TREND_BUCKET).getPublicUrl(f.path);
      return (data&&data.publicUrl)||'';}catch(e){return '';}}
  return '';
}
function trendDownload(p,i){
  const f=(p.files||[])[i];if(!f)return;
  const url=trendFileURL(p,i);
  if(!url){alert('이 자료는 데모 화면에서 만든 것이라 내려받을 파일이 없습니다.');return;}
  const a=document.createElement('a');a.href=url;a.download=f.name||'자료';
  a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
}

/* ---------- 비로그인 글의 ID/PW 확인 ---------- */
function trendAuth(p){
  return new Promise(res=>{
    if(!trendNeedPw(p)){res(true);return;}
    const ov=trendOverlay('tsmall');
    ov.querySelector('.tdbody').innerHTML=
      `<div class="tform sm">
        <h3>수정·삭제 확인</h3>
        <p class="thint">이 자료를 올릴 때 정한 ID 와 비밀번호를 넣어 주세요.</p>
        <label class="tfrow"><span>ID</span><input id="taId" value="${esc(p.guest_id||'')}"></label>
        <label class="tfrow"><span>비밀번호</span><input id="taPw" type="password"></label>
        <div class="terr" id="taErr"></div>
        <div class="tdact"><div class="spacer"></div>
          <button class="btn sm" id="taCancel">취소</button>
          <button class="btn sm primary" id="taOk">확인</button></div>
      </div>`;
    const done=v=>{ov.remove();res(v);};
    ov.querySelector('#taCancel').onclick=()=>done(false);
    ov.querySelector('#taOk').onclick=async()=>{
      const id=ov.querySelector('#taId').value.trim();
      const pw=ov.querySelector('#taPw').value;
      const h=await trendHash(id,pw);
      let ok=false;
      if(trendOn()){
        try{
          const r=await CLOUD.sb.rpc('trend_check',{p_id:p.id,p_hash:h});
          ok=!r.error&&r.data===true;
        }catch(e){ok=false;}
      }else ok=(h===p.guest_hash);
      if(ok){TREND_PW[p.id]=h;done(true);}
      else ov.querySelector('#taErr').textContent='ID 또는 비밀번호가 맞지 않습니다.';};
    setTimeout(()=>{const e=ov.querySelector('#taPw');if(e)e.focus();},30);});
}

/* ---------- 올리기 · 고치기 ---------- */
function openTrendForm(post){
  const edit=!!post;
  const p=post||{id:trendUid(),title:'',body:'',category:TREND.cats[0]||TREND_ETC,
    medium:'',tags:[],secret:false,files:[],link:'',thumb:'',bytes:0};
  let picked=[];                    /* 이번에 새로 고른 파일들 */
  let thumbFile=null;
  const logged=(()=>{try{return !!(CLOUD&&CLOUD.user);}catch(e){return false;}})();
  const cats=TREND.cats.concat(TREND.cats.includes(TREND_ETC)?[]:[TREND_ETC]);
  const ov=trendOverlay('tform-ov');
  const needMedia=c=>TREND_MEDIA_CATS.includes(c);
  ov.querySelector('.tdbody').innerHTML=
   `<div class="tform">
      <h3>${edit?'자료 수정':'자료 등록'}</h3>
      <label class="tfrow"><span>제목 <b class="req">*</b></span>
        <input id="tfTitle" maxlength="120" value="${esc(p.title)}" placeholder="자료 이름"></label>
      <label class="tfrow top"><span>본문</span>
        <textarea id="tfBody" rows="4" maxlength="2000"
          placeholder="자료 설명 — 카드에는 첫 줄만 보입니다">${esc(p.body)}</textarea></label>
      <label class="tfrow"><span>카테고리</span>
        <select id="tfCat">${cats.map(c=>`<option value="${esc(c)}"${c===p.category?' selected':''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="tfrow" id="tfMediaRow"><span>세부 매체명</span>
        <input id="tfMedium" list="tfMediaList" value="${esc(p.medium)}"
          placeholder="예: NAVER GFA (선택)" autocomplete="off">
        <datalist id="tfMediaList">${(TREND.media||[]).map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>
      <div class="tfnote" id="tfMediaNote"></div>
      <label class="tfrow"><span>해시태그</span>
        <input id="tfTags" value="${esc((p.tags||[]).join(', '))}"
          placeholder="쉼표로 구분 · 최대 5개"></label>
      <label class="tfrow"><span>파일</span>
        <input id="tfFiles" type="file" multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.csv,.doc,.docx,.ppt,.pptx,.mp4,.mov,.webm"></label>
      <div class="tfnote">파일 한 개당 ${TREND_MAX_MB}MB · 한 자료 합계 ${TREND_MAX_TOTAL_MB}MB 까지
        · PDF · 이미지 · 엑셀 · 워드 · PPT · 영상</div>
      <div class="tflist" id="tfList"></div>
      <div class="tfsum" id="tfSum"></div>
      <label class="tfrow"><span>링크</span>
        <input id="tfLink" value="${esc(p.link)}" placeholder="https:// (선택)"></label>
      <label class="tfrow"><span>썸네일</span>
        <input id="tfThumb" type="file" accept="image/*"></label>
      <div class="tfnote">비워 두면 제목으로 표지를 만들어 줍니다.</div>
      <label class="tfchk"><input id="tfSecret" type="checkbox"${p.secret?' checked':''}>
        <span>대외비 — 카드에 <b>대외비</b> 표시가 붙습니다</span></label>
      ${(!logged&&!edit)?`<div class="tguest">
        <div class="tgh">로그인하지 않고 올립니다</div>
        <p class="thint">나중에 이 자료를 고치거나 지울 때 쓸 ID 와 비밀번호를 정해 주세요.
          잊어버리면 마스터·운영진만 지울 수 있습니다.</p>
        <label class="tfrow"><span>ID <b class="req">*</b></span>
          <input id="tfGid" maxlength="40" placeholder="표시될 이름"></label>
        <label class="tfrow"><span>비밀번호 <b class="req">*</b></span>
          <input id="tfGpw" type="password" maxlength="60"></label>
      </div>`:''}
      <div class="terr" id="tfErr"></div>
      <div class="tdact">
        <span class="thint" id="tfState"></span><div class="spacer"></div>
        <button class="btn sm" id="tfCancel">취소</button>
        <button class="btn sm primary" id="tfOk">${edit?'수정 저장':'올리기'}</button>
      </div>
    </div>`;
  const q=s=>ov.querySelector(s);
  const err=m=>{q('#tfErr').textContent=m||'';};
  const syncMedia=()=>{
    const on=needMedia(q('#tfCat').value);
    q('#tfMediaRow').style.display=on?'':'none';
    q('#tfMediaNote').textContent=on
      ?'이미 쓰인 이름이 있으면 그대로 골라 주세요 — 같은 매체가 여러 이름으로 갈리지 않게 합니다.':'';
  };
  q('#tfCat').onchange=()=>{syncMedia();try{mediaCheck();}catch(e){}};
  /* 이미 쓰인 매체명과 같은 매체로 보이면 알려 주고, 한 번에 맞출 수 있게 한다 */
  const MEDIA_TIP='이미 쓰인 이름이 있으면 그대로 골라 주세요 — 같은 매체가 여러 이름으로 갈리지 않게 합니다.';
  const mediaCheck=()=>{
    const v=q('#tfMedium').value.trim();
    const note=q('#tfMediaNote');
    if(!v){note.textContent=needMedia(q('#tfCat').value)?MEDIA_TIP:'';return;}
    const hit=trendSameMedia(v);
    if(!hit){note.textContent=MEDIA_TIP;return;}
    note.innerHTML=`이미 <b>${esc(hit)}</b> 로 쓰고 있는 매체 같습니다. `
      +`<button type="button" class="tfix" id="tfMediaFix">${esc(hit)} 로 맞추기</button>`;
    const fx=q('#tfMediaFix');
    if(fx)fx.onclick=()=>{q('#tfMedium').value=hit;mediaCheck();};};
  q('#tfMedium').oninput=mediaCheck;
  syncMedia();mediaCheck();
  const drawFiles=()=>{
    const keep=(p.files||[]).map((f,i)=>`<div class="tfitem"><span class="tfk">${esc(TREND_KIND_LABEL[f.kind]||'파일')}</span>
      <span class="tfn">${esc(f.name)}</span><span class="tfs">${trendMB(f.size||0)}</span>
      <button class="tfx" data-old="${i}" title="빼기">✕</button></div>`).join('');
    const add=picked.map((f,i)=>`<div class="tfitem new"><span class="tfk">${esc(TREND_KIND_LABEL[trendFileKind(f.name)]||'파일')}</span>
      <span class="tfn">${esc(f.name)}</span><span class="tfs">${trendMB(f.size)}</span>
      <button class="tfx" data-new="${i}" title="빼기">✕</button></div>`).join('');
    q('#tfList').innerHTML=keep+add;
    q('#tfList').querySelectorAll('[data-old]').forEach(b=>b.onclick=()=>{
      p.files.splice(+b.dataset.old,1);drawFiles();});
    q('#tfList').querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{
      picked.splice(+b.dataset.new,1);drawFiles();});
    /* 첨부 합계를 늘 보여 준다 — 10MB 짜리를 여럿 붙이면 금방 커진다 */
    const tot=totalBytes();
    const sum=q('#tfSum');
    if(sum){
      const over=tot>TREND_MAX_TOTAL_MB*1048576;
      sum.className='tfsum'+(over?' over':'');
      sum.textContent=(tot?`첨부 합계 ${trendMB(tot)} / ${TREND_MAX_TOTAL_MB}MB`:'')
        +(over?' — 합계를 넘어 올릴 수 없습니다':'');}};
  const totalBytes=()=>(p.files||[]).reduce((a,f)=>a+(+f.size||0),0)
    +picked.reduce((a,f)=>a+f.size,0);
  drawFiles();
  q('#tfFiles').onchange=e=>{
    const over=[],full=[];
    [...e.target.files].forEach(f=>{
      if(f.size>TREND_MAX_MB*1048576){over.push(`${f.name} (${trendMB(f.size)})`);return;}
      if(totalBytes()+f.size>TREND_MAX_TOTAL_MB*1048576){full.push(f.name);return;}
      picked.push(f);});
    e.target.value='';
    err([over.length?`${TREND_MAX_MB}MB 를 넘어 뺐습니다 — ${over.join(', ')}`:'',
         full.length?`한 자료 합계 ${TREND_MAX_TOTAL_MB}MB 를 넘어 뺐습니다 — ${full.join(', ')}`:'']
        .filter(Boolean).join(' / '));
    drawFiles();};
  q('#tfThumb').onchange=e=>{
    const f=e.target.files[0];
    if(f&&f.size>TREND_MAX_MB*1048576){err(`썸네일도 ${TREND_MAX_MB}MB 까지입니다.`);e.target.value='';return;}
    thumbFile=f||null;};
  q('#tfCancel').onclick=()=>ov.remove();
  q('#tfOk').onclick=async()=>{
    const title=q('#tfTitle').value.trim();
    if(!title){err('제목을 넣어 주세요.');return;}
    const tags=q('#tfTags').value.split(',').map(s=>s.trim().replace(/^#/,''))
      .filter(Boolean).slice(0,5);
    const link=q('#tfLink').value.trim();
    if(link&&!/^https?:\/\//i.test(link)){err('링크는 http:// 또는 https:// 로 시작해야 합니다.');return;}
    let gid='',ghash=p.guest_hash||'';
    if(!logged&&!edit){
      gid=q('#tfGid').value.trim();
      const gpw=q('#tfGpw').value;
      if(!gid||!gpw){err('ID 와 비밀번호를 넣어 주세요.');return;}
      ghash=await trendHash(gid,gpw);}
    if(totalBytes()>TREND_MAX_TOTAL_MB*1048576){
      err(`첨부 합계가 ${TREND_MAX_TOTAL_MB}MB 를 넘습니다. 파일을 덜어 주세요.`);return;}
    q('#tfOk').disabled=true;
    /* 10MB 짜리는 올라가는 데 시간이 걸린다 — 몇 번째를 올리고 있는지 보여 준다 */
    const say=m=>{const e2=q('#tfState');if(e2)e2.textContent=m;};
    say('올리는 중…');
    try{
      const rec={...p,title,body:q('#tfBody').value.trim(),
        category:q('#tfCat').value,
        medium:needMedia(q('#tfCat').value)?q('#tfMedium').value.trim():'',
        tags,secret:q('#tfSecret').checked,link,
        guest_id:gid||p.guest_id||'',guest_hash:ghash};
      await trendPut(rec,picked,thumbFile,edit,say);
      ov.remove();
    }catch(e){
      err((e&&e.message)||String(e));
      q('#tfOk').disabled=false;q('#tfState').textContent='';}
  };
  setTimeout(()=>{const e=q('#tfTitle');if(e)e.focus();},30);
}

/* ---------- 저장 ---------- */
async function trendPut(rec,picked,thumbFile,edit,say){
  say=say||(()=>{});
  /* 썸네일 — 직접 올린 그림 > 첨부한 이미지 > 제목으로 만든 표지 */
  let thumb=rec.thumb||'';
  if(thumbFile)thumb=await trendShrink(thumbFile);
  else if(!thumb){
    const im=picked.find(f=>trendFileKind(f.name)==='image');
    thumb=im?await trendShrink(im):trendMakeThumb(rec.title,
      picked.length?trendFileKind(picked[0].name):(rec.link?'link':'file'));}
  const newFiles=[];
  if(trendOn()){
    let i=0;
    for(const f of picked){
      i++;say(`파일 올리는 중… ${i}/${picked.length} · ${f.name} (${trendMB(f.size)})`);
      const path=`${rec.id}/${Date.now()}_${f.name.replace(/[^\w.\-가-힣]/g,'_')}`;
      const {error}=await CLOUD.sb.storage.from(TREND_BUCKET)
        .upload(path,f,{upsert:false,contentType:f.type||undefined});
      if(error)throw new Error(trendUploadMsg(error,f));
      newFiles.push({name:f.name,size:f.size,kind:trendFileKind(f.name),path});}
    say('저장하는 중…');
  }else{
    /* 데모 — 파일은 이 세션 안에서만 볼 수 있다 */
    picked.forEach(f=>{
      const i=(rec.files||[]).length+newFiles.length;
      try{TREND_BLOBS[rec.id+'|'+i]=URL.createObjectURL(f);}catch(e){}
      newFiles.push({name:f.name,size:f.size,kind:trendFileKind(f.name)});});
  }
  const files=(rec.files||[]).concat(newFiles);
  const bytes=files.reduce((a,f)=>a+(+f.size||0),0);
  const row={id:rec.id,title:rec.title,body:rec.body,category:rec.category,
    medium:rec.medium,tags:rec.tags,secret:rec.secret,files,link:rec.link,thumb,
    guest_id:rec.guest_id,guest_hash:rec.guest_hash,bytes,
    author_id:rec.author_id||null,author_name:rec.author_name||'',
    created_at:rec.created_at||trendNow(),updated_at:trendNow()};
  if(!edit){
    try{if(CLOUD&&CLOUD.user){row.author_id=CLOUD.user.id;
      row.author_name=CLOUD.user.email||CLOUD.user.user_metadata?.name||'';}}catch(e){}
    if(!row.author_name)row.author_name=row.guest_id||'익명';}
  if(trendOn()){
    if(edit){
      /* 남의 글을 함부로 못 고치게 — 서버 함수가 권한과 비밀번호를 다시 본다 */
      const {error}=await CLOUD.sb.rpc('trend_edit',
        {p_row:row,p_hash:TREND_PW[row.id]||null});
      if(error)throw new Error('저장 실패 — '+error.message);
    }else{
      const {error}=await CLOUD.sb.from('trend_posts').insert(row);
      if(error)throw new Error('저장 실패 — '+error.message);}
  }
  const i=TREND.posts.findIndex(x=>x.id===row.id);
  if(i>=0)TREND.posts[i]=trendNorm(row);else TREND.posts.unshift(trendNorm(row));
  if(!trendOn())trendLocalWrite();
  trendLearnMedia();
  await trendSaveMeta();
  renderTrend();
}
async function trendDelete(p){
  try{
    if(trendOn()){
      const paths=(p.files||[]).map(f=>f.path).filter(Boolean);
      if(paths.length){try{await CLOUD.sb.storage.from(TREND_BUCKET).remove(paths);}catch(e){}}
      const {error}=await CLOUD.sb.rpc('trend_remove',
        {p_id:p.id,p_hash:TREND_PW[p.id]||null});
      if(error)throw error;}
    TREND.posts=TREND.posts.filter(x=>x.id!==p.id);
    if(!trendOn())trendLocalWrite();
    renderTrend();
  }catch(e){alert('삭제하지 못했습니다 — '+((e&&e.message)||e));}
}
async function trendSaveMeta(){
  if(!trendOn()){trendLocalWrite();return;}
  try{
    await CLOUD.sb.from('trend_meta').upsert([
      {k:'categories',v:TREND.cats},{k:'media',v:TREND.media}]);
  }catch(e){}
}

/* 저장소가 돌려준 영문 오류를 무엇을 하면 되는지로 바꿔 준다 (v67) */
function trendUploadMsg(error,f){
  const m=(error&&error.message)||String(error);
  if(/exceeded the maximum allowed size|payload too large|413/i.test(m))
    return `${f.name} (${trendMB(f.size)}) 이(가) 저장소 한도를 넘었습니다. `
      +`Supabase > Storage > trend 버킷의 File size limit 이 ${TREND_MAX_MB}MB 이상인지 확인해 주세요.`;
  if(/Bucket not found|does not exist/i.test(m))
    return `저장소(trend 버킷)를 찾지 못했습니다. Supabase > Storage 에서 `
      +`trend 버킷(Public, ${TREND_MAX_MB}MB)을 만들어 주세요.`;
  if(/row-level security|violates|not authorized|permission/i.test(m))
    return '저장소에 올릴 권한이 없습니다. schema.sql 의 storage 정책이 실행됐는지 확인해 주세요.';
  return '파일 올리기 실패 — '+m;
}

/* ---------- 카테고리 편집 (관리자) ---------- */
function openTrendCats(){
  const ov=trendOverlay('tsmall');
  let list=TREND.cats.slice();
  const draw=()=>{
    ov.querySelector('.tdbody').innerHTML=
     `<div class="tform sm">
        <h3>카테고리 편집</h3>
        <p class="thint">순서를 바꾸고, 더하거나 뺄 수 있습니다.
          어느 카테고리에도 넣지 않은 자료는 <b>기타</b> 로 모입니다.</p>
        <div class="tcatlist">${list.map((c,i)=>`<div class="tcatrow">
          <input data-i="${i}" value="${esc(c)}" maxlength="20">
          <button class="btn sm" data-up="${i}"${i===0?' disabled':''}>▲</button>
          <button class="btn sm" data-dn="${i}"${i===list.length-1?' disabled':''}>▼</button>
          <button class="btn sm danger" data-rm="${i}">삭제</button></div>`).join('')}</div>
        <button class="btn sm" id="tcAdd">＋ 카테고리 추가</button>
        <div class="tdact"><div class="spacer"></div>
          <button class="btn sm" id="tcCancel">취소</button>
          <button class="btn sm primary" id="tcOk">저장</button></div>
      </div>`;
    const q=s=>ov.querySelector(s);
    ov.querySelectorAll('[data-i]').forEach(inp=>inp.oninput=()=>{list[+inp.dataset.i]=inp.value;});
    ov.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.up;[list[i-1],list[i]]=[list[i],list[i-1]];draw();});
    ov.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.dn;[list[i+1],list[i]]=[list[i],list[i+1]];draw();});
    ov.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.rm;list.splice(i,1);draw();});
    q('#tcAdd').onclick=()=>{list.push('새 카테고리');draw();};
    q('#tcCancel').onclick=()=>ov.remove();
    q('#tcOk').onclick=async()=>{
      const clean=list.map(s=>s.trim()).filter(Boolean);
      const uniq=[...new Set(clean)];
      if(!uniq.length){alert('카테고리를 하나 이상 남겨 주세요.');return;}
      /* 없어진 카테고리에 있던 자료는 기타로 옮긴다 */
      TREND.posts.forEach(p=>{if(!uniq.includes(p.category))p.category=TREND_ETC;});
      TREND.cats=uniq;
      if(TREND.cat!=='all'&&!uniq.concat([TREND_ETC]).includes(TREND.cat))TREND.cat='all';
      await trendSaveMeta();
      if(trendOn()){try{
        const moved=TREND.posts.filter(p=>p.category===TREND_ETC).map(p=>p.id);
        if(moved.length)await CLOUD.sb.rpc('trend_recat',{p_ids:moved,p_cat:TREND_ETC});
      }catch(e){}}
      ov.remove();renderTrend();};
  };
  draw();
}

/* ---------- 덮개 ---------- */
function trendOverlay(cls){
  document.querySelectorAll('.tov').forEach(x=>x.remove());
  const ov=document.createElement('div');
  ov.className='tov '+(cls||'');
  ov.innerHTML='<div class="tdcard"><div class="tdbody"></div></div>';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
  return ov;
}

/* ---------- 뷰어 노출 토글 (캠페인 설정에 저장된다) ---------- */
function paintTrendToggle(){
  const t=$('trendViewerTgl');
  if(t){
    t.classList.toggle('on',trendVisibleToViewer());
    t.title=trendVisibleToViewer()
      ?'지금은 광고주(조회모드)에게도 트렌드 리포트 탭이 보입니다'
      :'지금은 마스터·운영진에게만 보입니다';}
  paintTrendTab();
}
/* 탭 자체의 보임·회색 — 저장본을 되살렸을 때도 바로 맞도록 따로 떼어 둔다 (v66) */
function paintTrendTab(){
  const tab=document.querySelector('#tabs [data-tab="trend"]');
  if(!tab)return;
  let c=false;try{c=isClient();}catch(e){}
  const tv=trendVisibleToViewer();
  tab.classList.toggle('hidden',c&&!tv);
  tab.classList.toggle('vhide',!c&&!tv);
}
function toggleTrendViewer(){
  TREND_VIEWER=!trendVisibleToViewer();
  paintTrendToggle();
  try{applyRole();}catch(e){}
  try{markDirty();saveLocal();}catch(e){}
}
