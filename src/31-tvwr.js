/* ===== 31. TV 위클리 리포트 화면 (v146) =====
   코웨이처럼 매달 'Weekly Report'(TV 요약 · 당월_품목별 세부 · 당월_주별 · 당월_시청률) 엑셀을 받는 캠페인은
   그 내용을 doc.tv.wr 하나로 들고(TV_WR), TV 미디어믹스 · 서머리 · 주차별 퍼포먼스를 이 리포트 전용 화면으로 그린다.
   TV_WR 이 없는 캠페인(BMW 등)은 예전 화면 그대로.
   금액 단위는 리포트와 같은 천원. 숨김 행 · 열은 들여올 때 이미 걸렀다(tools 쪽 wkparse · wrbuild).

   TV_WR = {v, ym, period, tgt,
     items:[{n, raw, cr:[{n, on(온에어 yyyy-mm-dd), bud, grp, eq, r1, r3, c:{grp,eq,r1,r3}(온에어 이후 누적)}], sub:{…}}],
     tot:{bud,grp,eq,r1,r3},
     chs:[{g:'지상파'|'케이블', pp, ch, tc(목표 CPRP), bud, cost, eq, w:[[eq,cost],…]}],   ← 당월_주별
     weeks:[{l,s,e}], wtot:{bud,cost,eq,w:[[eq,cost],…]},
     dorder:[{n, cr:[{n, raw, on, k, sn}]}], det:{k:{cells:[[chIdx,cnt,grp,eq,r1,r3]…], t:{지상파,케이블,T}}},   ← 당월_품목별 세부
     rt:{지상파|종편|케이블:[{ch, cw, avg, cww[], avgw[]}]},                                 ← 당월_시청률
     hist:[{ym, weeks, tot, pp:{'지상파|KBS2':[[eq,cost],…]}}]}                               ← 직전 몇 달 주차(연속 그래프) */
var TV_WR=null;   // var — 03-data 의 campStart 가 불러올 때(파일이 아직 안 읽혔어도) typeof 로 볼 수 있게
const wrOn=()=>!!(TV_WR&&Array.isArray(TV_WR.items)&&TV_WR.items.length);
let WR_SEL={item:'',cr:''},WR_WK={mode:'eq',pp:'all'},WR_ETC=null;

/* ---------- 도우미 ---------- */
const wrN=v=>v==null||!isFinite(v)?NaN:+v;
const wrF=(v,d=0)=>!isFinite(wrN(v))?'–':(+v).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
/* 천원 → 억 · 만 */
const wrEok=k=>{const v=wrN(k);if(!isFinite(v))return '–';const e=v/1e5;
  return e>=100?Math.round(e).toLocaleString()+'억':e>=.1?(Math.round(e*10)/10).toLocaleString()+'억':Math.round(v/10).toLocaleString()+'만';};
const wrD=s=>{const m=String(s||'').match(/(\d{4})-(\d\d)-(\d\d)/);return m?`${m[1].slice(2)}.${+m[2]}.${+m[3]}`:'';};
const wrPct=(a,b)=>isFinite(a)&&isFinite(b)&&b>0?a/b:NaN;
/* 품목 색 — 같은 품목은 어느 달에서나 같은 색 (차분한 색 10개) */
/* v147 — 알록달록하지 않게: 채도를 낮춘 회청 · 청록 · 회갈 계열로 서로 비슷한 톤 */
const WR_PAL=['#4f6b8f','#8a7b68','#5d8580','#7d7090','#93876f','#5f84a3','#8c6f73','#6c7b8e','#748a6d','#7f8796'];
const WR_ICOL={'아이콘3':0,'아이콘얼음정수기':1,'카페얼음정수기':5,'안마매트리스':3,'음식물처리기':2,'페블체어2':8,'트리플체어2':6,
  '스마트매트리스':7,'아이콘프로':8,'노블청정기':9,'비데':2,'히티브':6,'마사지셋/코어셋':4,'코웨이페스타':3};
function wrCol(n){if(n in WR_ICOL)return WR_PAL[WR_ICOL[n]];let h=0;for(const c of String(n))h=(h*31+c.charCodeAt(0))>>>0;return WR_PAL[h%WR_PAL.length];}
/* v151 — 서머리에는 품목 고유 색을 쓰지 않는다(색 체계 합의 전) — 차분한 회청 한 가지 */
const WR_NEU='#afafb1',WR_NEU2='#828284';
/* 지상파 · 케이블 톤 — 지상파는 푸른 기 도는 짙은 회청, 케이블은 무채 회색. 같은 톤 안에서 PP 마다 밝기만 */
const WR_TONE={t:['#24406f','#3d5f99','#6b8cc4','#9db6e0','#c4d4ee'],c:['#3f4a54','#58636e','#717c87','#8a949e','#a3acb5','#bcc3ca','#d2d7dc','#e1e5e8']};
function wrShade(h,k){const n=parseInt(h.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(c*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
/* 지상파 방송사 이름 — KBS2 → KBS */
const wrBc=ch=>String(ch||'').replace(/\d+$/,'').trim()||ch;
/* 광고비를 쓴 채널 */
const wrPaid=c=>(wrN(c.bud)>0)||(wrN(c.cost)>0);
/* 목표 eq.GRP — 채널 예산 ÷ 목표 CPRP 의 합 */
function wrEqTarget(){let t=0,ok=false;(TV_WR.chs||[]).forEach(c=>{if(wrN(c.bud)>0&&wrN(c.tc)>0){t+=c.bud/c.tc;ok=true;}});return ok?t:NaN;}

/* 전체 캠페인(광고주 화면)용 TV 요약 — 저장할 때 media.tvSum 으로 (v148). 금액은 원 */
function tvSumNow(){const r=tvSumNow0();
  /* v170 — 큐시트가 있으면 계획 GRP(예산 ÷ 목표 CPRP × 초수 환산)를, 리포트가 아직 없는 달은 계획 금액도 큐시트 예산으로 */
  try{const c=TV_CUE&&TV_CUE.st;if(c&&TV_CUE.z){const o=r||{plan:0,spend:0,grp:0,pgrp:0,mon:{}};
    if(+c.pgrp>0)o.pgrp=+c.pgrp;if(!(o.plan>0)&&+c.budget>0){o.plan=Math.round(+c.budget);o.mon={[TV_CUE.ym]:o.plan};}
    /* v179 — 품목별 금액(원): 리포트가 없으면 큐시트 예산으로 */
    if(Array.isArray(c.it)&&c.it.length){o.it=c.it;if(!o.ym)o.ym=TV_CUE.ym;}   /* v182 — 큐시트(최종 편성) 예산이 있으면 그것을 쓴다 */
    return (o.plan||o.spend||o.pgrp)?o:r;}}catch(e){}
  return r;}
function wrItemBud(items){return (Array.isArray(items)?items:[]).map(i=>[i&&i.n,Math.round((i&&i.cr||[]).reduce((s,c)=>s+(+c.bud||0),0)*1000)]).filter(x=>x[0]&&x[1]>0);}
function tvSumNow0(){
  if(wrOn()){const W=TV_WR,t=W.wtot||{};return {plan:Math.round((+t.bud||+W.tot.bud||0)*1000),spend:Math.round((+t.cost||0)*1000),grp:+W.tot.grp||0,pgrp:0,mon:{[W.ym]:Math.round((+t.bud||+W.tot.bud||0)*1000)},
    /* v169 — 주차별 값(천원) — 앞 달 캠페인의 주차별 그래프 오른쪽에 '다음 달'로 비친다 */
    ym:W.ym,wk:(W.weeks||[]).map((w,i)=>{const x=(t.w||[])[i]||[];return [w.l,w.s,w.e,+x[0]||0,+x[1]||0];}),
    /* v179 — 품목별 금액(원) — 전체 캠페인 '월별 광고 구분' */
    it:wrItemBud(W.items)};}
  try{const T=tvMixTotal?tvMixTotal():null;let plan=0,mon={};(TV_MIX||[]).forEach(r=>{const a=tvMixCalc(r).amt||0;plan+=a;if(/^\d{4}-\d{2}$/.test(r.ym||''))mon[r.ym]=(mon[r.ym]||0)+a;});
    const spend=(TV_CH||[]).reduce((s,r)=>s+(tvNum(r.cost)||0),0),grp=(TV_CH||[]).reduce((s,r)=>s+(tvNum(r.grp)||0),0);
    return plan||spend?{plan,spend,grp,pgrp:0,mon}:null;}catch(e){return null;}}
/* ---------- 가로 스크롤: 막대는 숨기고 좌우 가운데에 떠 있는 화살표로 ---------- */
function wrHs(inner,cls){return `<div class="wrhs ${cls||''}"><div class="wrhs-in">${inner}</div>
  <button type="button" class="wrhs-b l" aria-label="${L('왼쪽으로','Scroll left')}"><svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg></button>
  <button type="button" class="wrhs-b r" aria-label="${L('오른쪽으로','Scroll right')}"><svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg></button></div>`;}
function wrHsWire(root){
  (root||document).querySelectorAll('.wrhs').forEach(w=>{
    const sc=w.querySelector('.wrhs-in'),l=w.querySelector('.wrhs-b.l'),r=w.querySelector('.wrhs-b.r');if(!sc||w.__w)return;w.__w=1;
    const paint=()=>{const max=sc.scrollWidth-sc.clientWidth;l.classList.toggle('on',sc.scrollLeft>2);r.classList.toggle('on',sc.scrollLeft<max-2);};
    const go=d=>sc.scrollBy({left:d*Math.max(220,sc.clientWidth*.7),behavior:'smooth'});
    l.onclick=()=>go(-1);r.onclick=()=>go(1);
    /* v170 — 긴 표에서도 찾기 쉽게: 좌우 버튼이 마우스 높이를 따라온다 */
    w.addEventListener('mousemove',e=>{const rc=w.getBoundingClientRect(),y=Math.max(28,Math.min(rc.height-28,e.clientY-rc.top))+'px';l.style.top=y;r.style.top=y;},{passive:true});sc.addEventListener('scroll',paint,{passive:true});
    /* v158 — 머리 둘째 줄의 고정 위치 = 실제 첫 줄 높이(두 줄짜리 소재 이름 · 날짜가 가려지던 문제) */
    const fit=()=>sc.querySelectorAll('table.wrt').forEach(t=>{const r=t.tHead&&t.tHead.rows[0];if(r)t.style.setProperty('--wrh1',Math.round(r.getBoundingClientRect().height)+'px');});
    fit();try{new ResizeObserver(()=>{paint();fit();}).observe(sc);}catch(e){}paint();setTimeout(()=>{paint();fit();},120);
    if(w.classList.contains('full'))wrFloatHead(w,sc);});}
/* v160 — 표 안 세로 스크롤 없이 펼친 표: 화면을 내리면 머리만 화면 위(상단 바 아래)에 떠서 따라온다.
   가로 스크롤은 원래 표와 같이 움직인다(머리 복제본의 scrollLeft 를 맞춤) */
function wrFloatHead(w,sc){
  const t=sc.querySelector('table');if(!t||!t.tHead)return;
  const fl=document.createElement('div');fl.className='wrfh';fl.innerHTML='<div class="wrfh-in"></div>';document.body.appendChild(fl);const inn=fl.firstChild;
  let built=0;
  const build=()=>{/* 칸 너비 — 몸통 · 머리의 칸 위치를 격자로 펴서(행 · 열 합침 고려) 1칸짜리 칸의 실제 너비를 잰다 */
    const rows=[...t.rows],grid=[],cw=[];
    rows.forEach((r,ri)=>{grid[ri]=grid[ri]||[];let ci=0;[...r.cells].forEach(c=>{while(grid[ri][ci])ci++;const cs=c.colSpan||1,rs=c.rowSpan||1;
      for(let a=0;a<rs;a++){grid[ri+a]=grid[ri+a]||[];for(let b=0;b<cs;b++)grid[ri+a][ci+b]=1;}
      if(cs===1&&!(cw[ci]>0))cw[ci]=c.getBoundingClientRect().width;ci+=cs;});});
    const c=t.cloneNode(false);c.removeAttribute('id');c.style.width=t.getBoundingClientRect().width+'px';c.style.tableLayout='fixed';c.style.minWidth='0';
    c.innerHTML=`<colgroup>${cw.map(x=>`<col style="width:${(x||60).toFixed(2)}px">`).join('')}</colgroup>`;c.appendChild(t.tHead.cloneNode(true));
    inn.innerHTML='';inn.appendChild(c);c.querySelectorAll('th').forEach(th=>{th.style.top='0';th.style.position=th.classList.contains('stk')?'sticky':'static';});
    c.style.setProperty('--wrh1',t.style.getPropertyValue('--wrh1'));built=1;};
  /* 화면 위에 붙어 있는 바(상단 바 · 메뉴 줄) 아래 */
  const topY=()=>{let y=0;document.querySelectorAll('.topbar,#tabs').forEach(e=>{const cs=getComputedStyle(e);if(cs.position==='sticky'||cs.position==='fixed'){const b=e.getBoundingClientRect().bottom;if(b>y&&b<240)y=b;}});return y;};
  const upd=()=>{if(!w.isConnected){removeEventListener('scroll',upd,true);removeEventListener('resize',onRs);fl.remove();return;}
    const r=t.getBoundingClientRect(),hh=t.tHead.getBoundingClientRect().height,ty=topY(),vis=w.offsetParent!==null&&r.top<ty&&r.bottom>ty+hh+30;
    if(vis){if(!built)build();const sr=sc.getBoundingClientRect();fl.style.cssText=`top:${ty}px;left:${sr.left}px;width:${sc.clientWidth}px`;inn.scrollLeft=sc.scrollLeft;fl.classList.add('on');}
    else fl.classList.remove('on');};
  const onRs=()=>{built=0;upd();};
  addEventListener('scroll',upd,{passive:true,capture:true});addEventListener('resize',onRs);
  try{new ResizeObserver(onRs).observe(t);}catch(e){}
  upd();}

/* ---------- 탭에 리포트 화면 자리 ---------- */
function wrHost(tab,id){
  const t=$(tab);if(!t)return null;
  t.classList.toggle('wr',wrOn());
  let h=$(id);if(!h){h=document.createElement('div');h.id=id;h.className='wrhost';t.insertBefore(h,t.firstChild);}
  return h;}
function wrHead(title,note){
  return `<div class="sec">${title}${TV_WR.tgt?` <span class="tvtgt">${esc(TV_WR.tgt)}</span>`:''} <span class="note">${esc(note||'')}</span></div>`;}
const wrMonth=()=>{const m=String(TV_WR.ym||'').match(/(\d{4})-(\d\d)/);return m?L(`${+m[2]}월`,`M${+m[2]}`):'';};

/* 선택 칩 — 드롭다운 없이 한 번에 고르는 알약 줄 */
function wrChips(list,cur,attr){
  return `<div class="wrchips" role="tablist">${list.map(x=>`<button type="button" role="tab" class="wrchip${x.k===cur?' on':''}" ${attr}="${esc(x.k)}"
    aria-selected="${x.k===cur}">${x.c?`<i style="background:${x.c}"></i>`:''}${esc(x.l)}${x.s?`<em>${esc(x.s)}</em>`:''}</button>`).join('')}</div>`;}

/* ================================================================
   미디어믹스 — ① 소재별 월 예산(누적 막대 + 표) ② 채널별 월 예산(3D 도넛 + 표)
   ================================================================ */
/* v157 — 미디어믹스 품목 색: 그 달 큐시트 지상파 시트의 소재 채움색(조건부 서식)에서. 큐시트가 없는 달은 가까운 달 색 */
const WR_CUECOL={"2026-06": {"아이콘얼음정수기": "#275d9f", "비데": "#1a3e6a", "스마트매트리스": "#f8a35c", "페블체어2": "#c86562"}, "2026-07": {"아이콘얼음정수기": "#275d9f", "아이콘3": "#999999", "비데": "#1a3e6a", "스마트매트리스": "#f8a35c", "페블체어2": "#c86562"}, "2026-08": {"아이콘얼음정수기": "#275d9f", "아이콘3": "#999999", "스마트매트리스": "#f8a35c"}, "2026-09": {"아이콘얼음정수기": "#275d9f", "아이콘3": "#999999", "카페얼음정수기": "#c86562", "음식물처리기": "#61b6cd", "스마트매트리스": "#f8a35c", "안마매트리스": "#a7c36d", "페블체어2": "#6490c5"}, "2026-10": {"아이콘3": "#999999", "카페얼음정수기": "#c86562", "음식물처리기": "#61b6cd", "안마매트리스": "#a7c36d", "페블체어2": "#8f77ad", "트리플체어2": "#FFFF66"}};
/* 큐시트 색 그대로는 채도가 높아 어지럽다 — 색상(hue)만 따르고 채도는 낮추고 명도는 가운데로 모은 차분한 톤 */
function wrCalm(hex){const n=parseInt(String(hex).slice(1),16);let r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,sat=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;sat=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}
  sat=Math.min(sat*.42,.34);l=Math.max(.5,Math.min(.66,l));
  const q=l<.5?l*(1+sat):l+sat-l*sat,p=2*l-q,f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};
  const hx=v=>Math.round(v*255).toString(16).padStart(2,'0');return '#'+hx(f(h+1/3))+hx(f(h))+hx(f(h-1/3));}
/* v161 — 큐시트에서 회색으로 칠한 품목(아이콘3 #999999 등)은 무채색이라 다른 품목과 안 갈린다 → 고정 색을 입힌다 */
const WR_COL_FIX={'아이콘3':'#3f9a86'};
function wrCueCol(n){const ym=String((TV_WR&&TV_WR.ym)||'').slice(0,7),ks=Object.keys(WR_CUECOL).sort();
  if(WR_COL_FIX[n])return wrCalm(WR_COL_FIX[n]);
  if(WR_CUECOL[ym]&&WR_CUECOL[ym][n])return wrCalm(WR_CUECOL[ym][n]);
  const prev=ks.filter(k=>k<=ym).reverse(),next=ks.filter(k=>k>ym);
  for(const k of [...prev,...next])if(WR_CUECOL[k][n])return wrCalm(WR_CUECOL[k][n]);
  return '#7f8b97';}
const wrInk=h=>{const n=parseInt(String(h).slice(1),16),l=(.299*(n>>16&255)+.587*(n>>8&255)+.114*(n&255))/255;return l>.68?'#2a2f36':'#fff';};
function wrMixBars(items,tot){
  /* ① 소재별 월 예산 — 품목마다 막대 하나, 소재로 나눠 쌓는다(단색 톤) */
  const maxB=Math.max(1,...items.map(it=>wrN(it.sub&&it.sub.bud)||it.cr.reduce((s,c)=>s+(wrN(c.bud)||0),0)));
  const bars=items.map((it,ii)=>{
    const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    /* 한 품목 = 한 색(큐시트) · 소재는 같은 색으로 이어 쌓고 사이만 흰 틈 */
    const ic=it.col||wrCueCol(it.n),ink=wrInk(ic);
    const segs=crs.map((c,j)=>{const w=c.bud/maxB*100;
      return `<span class="seg" style="width:${w}%;--d:${(ii*60+j*90)}ms;background:${ic};color:${ink}" data-wrtip="${esc(it.n)}|${esc(c.n)}|${c.bud}|${ib}">
        ${w>9?`<b>${esc(c.n)}</b><i>${wrEok(c.bud)}</i>`:''}</span>`;}).join('');
    /* v170 — 막대가 좁아 안에 못 적은 소재는 막대 오른쪽 바깥에 */
    const outs=crs.filter(c=>c.bud/maxB*100<=9).map(c=>`${esc(c.n)} <i>${wrEok(c.bud)}</i>`).join(' · ');
    return `<div class="wrsb"><div class="nm">${esc(it.n)}</div>
      <div class="bar">${segs}${outs?`<span class="out">${outs}</span>`:''}</div><div class="v"><b>${wrEok(ib)}</b><em>${(ib/tot*100).toFixed(0)}%</em></div></div>`;}).join('');
  return bars;}
/* v170 — 캠페인 퍼포먼스 맨 위: 품목별 월 예산 · 채널별 월 예산 그래프 */
function wrMixTopHtml(src){
  const W=TV_WR,items=src?src.items:W.items.filter(it=>wrN(it.sub&&it.sub.bud)>0||it.cr.some(c=>wrN(c.bud)>0));
  const tot=src?src.tot:(W.tot&&wrN(W.tot.bud)>0?W.tot.bud:items.reduce((s,it)=>s+(wrN(it.sub&&it.sub.bud)||0),0));
  return `<div class="sec gap sm">${L('품목별 월 예산','Budget by product')} <span class="note">${src?L('큐시트 예산 · 품목 막대를 소재 금액 비중으로 나눠 쌓음','Cue sheet budget · split by creative share'):L('품목 막대를 소재로 나눠 쌓음 · TV 요약 기준','Each product bar split by creative · from TV summary')}</span></div>
      <div class="card wrcard"><div class="wrsbs">${wrMixBars(items,tot)}</div></div>
      <div class="sec gap sm">${L('채널별 월 예산','Budget by channel')} <span class="note">${src?L('큐시트 예산 · PP별 비중 · 5% 미만은 기타로','Cue sheet budget · share by PP · under 5% grouped as Other'):L('당월_주별 시트 예산 · PP별 비중 · 5% 미만은 기타로','Weekly sheet budget · share by PP · under 5% grouped as Other')}</span></div>
      <div class="card wrcard"><div class="wrdn" id="wrDn"></div><div class="wrdn-etc hidden" id="wrDnEtc"></div></div>`;}
function wrMixTipWire(h){
  h.querySelectorAll('[data-wrtip]').forEach(el=>{el.onmousemove=e=>{const [it,cr,b,ib]=el.dataset.wrtip.split('|');
    showTip(e.clientX,e.clientY,`<div class="t">${esc(it)} · ${esc(cr)}</div><div class="r"><span class="l">${L('월 예산','Budget')}</span><b>${wrF(+b)} ${L('천원','K')}</b></div>
      <div class="r"><span class="l">${L('품목 안 비중','Share in product')}</span><b>${(b/ib*100).toFixed(1)}%</b></div>`);};el.onmouseleave=hideTip;});}
var WR_GOWK=0;
function renderWrMix(){
  const h=wrHost('tab-tvmix','wrMix');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  {const d=$('cueTop');if(d)d.innerHTML='';WR_DN_SRC=null;}   // 같은 id(wrDn)를 쓰는 미디어믹스(큐시트) 쪽은 비운다
  const W=TV_WR,items=W.items.filter(it=>wrN(it.sub&&it.sub.bud)>0||it.cr.some(c=>wrN(c.bud)>0));
  const tot=W.tot&&wrN(W.tot.bud)>0?W.tot.bud:items.reduce((s,it)=>s+(wrN(it.sub&&it.sub.bud)||0),0);
  const bars=wrMixBars(items,tot);
  /* 표 — 머리: 품목(맨 위) › 소재 + 온에어(줄바꿈) · 품목마다 맨 오른쪽 '계'(굵게) */
  let hr1='<th class="stk c0" rowspan="2">'+L('구분','')+'</th>',hr2='',r1='',r2='';
  items.forEach(it=>{const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    /* v160 — 품목마다 머리 색: 첫 줄 = 품목 색을 어둡게, 둘째 줄 = 조금 덜 어둡게 */
    const ic=wrCueCol(it.n),d1=wrShade(ic,.42),d2=wrShade(ic,.58);
    hr1+=`<th colspan="${crs.length+1}" class="gs" style="background:${d1}">${esc(it.n)}</th>`;
    crs.forEach((c,j)=>{hr2+=`<th class="${j===0?'gs':''}" style="background:${d2}">${esc(c.n)}${c.on?`<span class="on">${L('온에어','On-air')} ${wrD(c.on)}</span>`:''}</th>`;
      r1+=`<td class="mono${j===0?' gs':''}">${wrF(c.bud)}</td>`;r2+=`<td class="mono${j===0?' gs':''}">${(c.bud/tot*100).toFixed(1)}%</td>`;});
    hr2+=`<th class="sum" style="background:${d2}">Total</th>`;r1+=`<td class="mono sum">${wrF(ib)}</td>`;r2+=`<td class="mono sum">${(ib/tot*100).toFixed(1)}%</td>`;});
  hr1+=`<th class="gs tot" rowspan="2">${L('전체','All')}</th>`;r1+=`<td class="mono gs tot">${wrF(tot)}</td>`;r2+=`<td class="mono gs tot">100%</td>`;
  const crTbl=`<table class="tbl lite wrt wrcr"><thead><tr>${hr1}</tr><tr>${hr2}</tr></thead><tbody>
    <tr><td class="stk c0 head">${L('월 예산','Budget')} <span class="u">(${L('천원','K KRW')})</span></td>${r1}</tr>
    <tr><td class="stk c0 head">${L('비중','Share')}</td>${r2}</tr></tbody></table>`;
  /* ② 채널별 월 예산 */
  const chs=(W.chs||[]).filter(c=>wrN(c.bud)>0);
  const cT=chs.reduce((s,c)=>s+c.bud,0);
  const ppOrder=[];chs.forEach(c=>{const k=c.g+'|'+c.pp;if(!ppOrder.includes(k))ppOrder.push(k);});
  let body='';const gsum={},T={bud:0,eq:0};
  ['지상파','케이블'].forEach(g=>{
    const gl=chs.filter(c=>c.g===g);if(!gl.length)return;let gb=0,ge=0;
    const pps=[...new Set(gl.map(c=>c.pp))];
    pps.forEach((pp,pi)=>{const pl=gl.filter(c=>c.pp===pp);let pb=0,pe=0;
      pl.forEach((c,ci)=>{const te=wrN(c.tc)>0?c.bud/c.tc:NaN;pb+=c.bud;if(isFinite(te))pe+=te;
        body+=`<tr>${pi===0&&ci===0?`<td class="stk c0 head g" rowspan="${gl.length+(g==='케이블'?pps.filter(p=>gl.filter(c=>c.pp===p).length>1).length:0)+1}">${g==='지상파'?L('지상파','Terrestrial'):L('케이블 · 종편','Cable · GP')}</td>`:''}
          ${ci===0?`<td class="stk c1 head" rowspan="${pl.length+(pl.length>1&&g==='케이블'?1:0)}">${esc(g==='지상파'?wrBc(pp):pp)}</td>`:''}<td class="stk c2 head">${esc(c.ch)}</td>
          <td class="mono">${wrF(c.bud)}</td><td class="mono">${(c.bud/cT*100).toFixed(1)}%</td><td class="mono">${wrF(c.tc)}</td><td class="mono">${wrF(te,1)}</td></tr>`;});
      if(pl.length>1&&g==='케이블')body+=`<tr class="sub"><td class="stk c2 head">${esc(pp)} Total</td><td class="mono">${wrF(pb)}</td><td class="mono">${(pb/cT*100).toFixed(1)}%</td><td class="mono">${wrF(pe?pb/pe:NaN)}</td><td class="mono">${wrF(pe,1)}</td></tr>`;
      gb+=pb;ge+=pe;});
    body+=`<tr class="gtot"><td class="stk c1 head" colspan="2">${g==='지상파'?L('지상파 Total','Terrestrial total'):L('케이블 · 종편 Total','Cable · GP total')}</td><td class="mono">${wrF(gb)}</td><td class="mono">${(gb/cT*100).toFixed(1)}%</td><td class="mono">${wrF(ge?gb/ge:NaN)}</td><td class="mono">${wrF(ge,1)}</td></tr>`;
    T.bud+=gb;T.eq+=ge;});
  const chTbl=`<table class="tbl lite wrt wrch eqw"><thead><tr><th class="stk c0">${L('구분','Type')}</th><th class="stk c1">PP</th><th class="stk c2">${L('채널','Channel')}</th>
      <th>${L('월 예산','Budget')} <span class="u">(${L('천원','K KRW')})</span></th><th>${L('비중','Share')}</th><th>${L('목표 CPRP','Target CPRP')} <span class="u">(${L('천원','K')})</span></th><th>${L('목표 eq.GRP','Target eq.GRP')}</th></tr></thead>
    <tbody>${body}<tr class="total"><td class="stk c0 head" colspan="3">TOTAL</td><td class="mono">${wrF(T.bud)}</td><td class="mono">100%</td><td class="mono">${wrF(T.eq?T.bud/T.eq:NaN)}</td><td class="mono">${wrF(T.eq,1)}</td></tr></tbody></table>`;
  h.innerHTML=wrHead(L('TV 미디어믹스','TV media mix'),`${wrMonth()} · ${W.period||''}`)
    +`<div class="sec gap sm">${L('품목별 월 예산','Budget by product')} <span class="note">${L('품목 막대를 소재로 나눠 쌓음 · TV 요약 기준','Each product bar split by creative · from TV summary')}</span></div>
      <div class="card wrcard"><div class="wrsbs">${bars}</div></div>
      ${wrHs(crTbl,'tbl full')}
      <div class="sec gap sm">${L('채널별 월 예산','Budget by channel')} <span class="note">${L('당월_주별 시트 예산 · PP별 비중 · 5% 미만은 기타로','Weekly sheet budget · share by PP · under 5% grouped as Other')}</span></div>
      <div class="card wrcard"><div class="wrdn" id="wrDn"></div><div class="wrdn-etc hidden" id="wrDnEtc"></div></div>
      ${wrHs(chTbl,'tbl full fit')}`;
  wrHsWire(h);wrDnMount();
  h.querySelectorAll('[data-wrtip]').forEach(el=>{el.onmousemove=e=>{const [it,cr,b,ib]=el.dataset.wrtip.split('|');
    showTip(e.clientX,e.clientY,`<div class="t">${esc(it)} · ${esc(cr)}</div><div class="r"><span class="l">${L('월 예산','Budget')}</span><b>${wrF(+b)} ${L('천원','K')}</b></div>
      <div class="r"><span class="l">${L('품목 안 비중','Share in product')}</span><b>${(b/ib*100).toFixed(1)}%</b></div>`);};el.onmouseleave=hideTip;});
  return true;}

/* ---------- 3D 도넛 — 경쟁사 분석 대시보드(v41) 방식: 왼쪽 지상파 · 오른쪽 케이블, 앞뒤 순서대로 벽 → 윗면 ---------- */
var WR_DN_SRC=null;   // v173 — 큐시트 예산으로 그릴 때(미디어믹스 화면)
function wrDnData(){
  const chs=(WR_DN_SRC||(TV_WR&&TV_WR.chs)||[]).filter(c=>wrN(c.bud)>0);
  const t={},c={};chs.forEach(x=>{const o=x.g==='지상파'?t:c,k=x.g==='지상파'?x.ch:x.pp||x.ch;o[k]=(o[k]||0)+x.bud;});
  const tot=chs.reduce((s,x)=>s+x.bud,0)||1;
  const pack=o=>{let a=Object.entries(o).filter(([,v])=>v>0).sort((p,q)=>q[1]-p[1]);const small=a.filter(([,v])=>v/tot<.05);
    if(small.length>1){a=a.filter(([,v])=>v/tot>=.05);a.push(['기타',small.reduce((s,[,v])=>s+v,0)]);return [a,small];}return [a,[]];};
  const [T,et]=pack(t),[C,ec]=pack(c);
  return {t:T,c:C,etc:{t:et,c:ec}};}
function wrDnSvg(D,T,W){
  const tT=D.t.reduce((s,[,v])=>s+v,0),tC=D.c.reduce((s,[,v])=>s+v,0),tot=tT+tC;if(!tot)return '';
  const R=Math.min(150,W*.15),K=.56,r=R*.5,DEP=30,ROT=13,TAU=Math.PI*2,GAP=(tT&&tC)?10:0,BW=Math.min(184,Math.max(150,W*.19)),BH=44,PITCH=52,top0=38;
  const n=Math.max(D.t.length,D.c.length),cy=top0+18+R*.9,H=Math.max(top0+n*PITCH+4,cy+R*K+DEP+70),cx=W/2,rc=cy+DEP/2,cs=Math.cos(ROT*Math.PI/180),sn=Math.sin(ROT*Math.PI/180);
  const rot=([x,y])=>[cx+(x-cx)*cs-(y-rc)*sn,rc+(x-cx)*sn+(y-rc)*cs],P=(a,rr,ox,dz)=>[cx+(ox||0)+Math.cos(a)*rr,cy+Math.sin(a)*rr*K+(dz||0)];
  const fT=tT/tot,S=[];let a=Math.PI-fT*Math.PI;const sep=GAP?.018:0;
  const tn=D.t.length;
  D.t.map((x,i)=>[x,i]).reverse().forEach(([[nm,v],i],j)=>{const sp=v/tot*TAU*T;S.push({k:'t'+i,n:nm,v,g:'t',col:nm==='기타'?'#c4d4ee':WR_TONE.t[Math.min(i,3)],ox:-GAP,a0:a+(j===0?sep:0),a1:a+sp-(j===tn-1?sep:0)});a+=sp;});
  a=-(1-fT)*Math.PI;
  D.c.forEach(([nm,v],i)=>{const sp=v/tot*TAU*T;S.push({k:'c'+i,n:nm,v,g:'c',col:nm==='기타'?'#d7dce0':WR_TONE.c[Math.min(i,6)],ox:GAP,a0:a+(i===0?sep:0),a1:a+sp-(i===D.c.length-1?sep:0)});a+=sp;});
  if(!(tT&&tC)){const G=S.splice(0);let acc=0,ra=-Math.PI/2,la=-Math.PI/2;
    if(G.length===1){const z=G[0],sp=z.a1-z.a0;z.ox=0;z.side=1;z.a0=-sp/2;z.a1=sp/2;S.push(z);G.length=0;}
    G.forEach(z=>{const sp=z.a1-z.a0;z.ox=0;if(acc<.5||z===G[0]){z.side=1;z.a0=ra;z.a1=ra+sp;ra+=sp;acc+=z.v/tot;}else{z.side=-1;z.a1=la;z.a0=la-sp;la-=sp;}S.push(z);});}
  S.forEach(s=>{if(s.a1<s.a0)s.a1=s.a0;});
  const arc=(s,rr,b0,b1,dz,rev)=>{const st=rev?b1:b0,en=rev?b0:b1,mid=(b0+b1)/2,[x0,y0]=P(st,rr,s.ox,dz),[xm,ym]=P(mid,rr,s.ox,dz),[x1,y1]=P(en,rr,s.ox,dz),sw=rev?0:1,ry=(rr*K).toFixed(1);
    return [`${x0.toFixed(1)},${y0.toFixed(1)}`,`A${rr},${ry} 0 0 ${sw} ${xm.toFixed(1)},${ym.toFixed(1)} A${rr},${ry} 0 0 ${sw} ${x1.toFixed(1)},${y1.toFixed(1)}`];};
  const clips=(b0,b1,lo,hi)=>{const o=[];for(const k of [-1,0,1,2]){const x=Math.max(b0,lo+k*TAU),y=Math.min(b1,hi+k*TAU);if(y>x+1e-6)o.push([x,y]);}return o;};
  const wallD=(s,rr,c)=>{const [m,aa]=arc(s,rr,c[0],c[1],0),[mb,ab]=arc(s,rr,c[0],c[1],DEP,true);return `M${m} ${aa} L${mb} ${ab} Z`;};
  let back={t:'',c:''},walls='',tops='',caps='',bcap={t:'',c:''};
  S.forEach(s=>{if(s.a1-s.a0<1e-4)return;
    clips(s.a0,s.a1,Math.PI,TAU).forEach(c=>{const d=wallD(s,r,c);back[s.g]+=`<g class="sl" data-wrk="${s.k}"><path d="${d}" fill="${wrShade(s.col,.58)}" stroke="${wrShade(s.col,.58)}" stroke-width=".8" stroke-linejoin="round"/></g>`;});
    const fw=clips(s.a0,s.a1,0,Math.PI).map(c=>wallD(s,R,c));fw.forEach(d=>walls+=`<g class="sl" data-wrk="${s.k}"><path d="${d}" fill="${wrShade(s.col,.8)}"/><path d="${d}" fill="url(#wrwd)"/></g>`);
    const [m,aa]=arc(s,R,s.a0,s.a1,0),[mi,ai]=arc(s,r,s.a0,s.a1,0,true);const td=`M${m} ${aa} L${mi} ${ai} Z`;
    tops+=`<g class="sl" data-wrk="${s.k}"><path d="${td}" fill="${s.col}" stroke="${s.col}" stroke-width=".6" stroke-linejoin="round"/><path d="${td}" fill="url(#wrhl)"/></g>`;});
  const cap=(s,ang,start)=>{const vis=start?Math.cos(ang)<0:Math.cos(ang)>0;if(!vis)return '';const p=[P(ang,r,s.ox),P(ang,R,s.ox),P(ang,R,s.ox,DEP),P(ang,r,s.ox,DEP)];
    return `<g class="sl" data-wrk="${s.k}"><path d="M${p.map(q=>q.map(z=>z.toFixed(1)).join(',')).join(' L')} Z" fill="${wrShade(s.col,.68)}"/></g>`;};
  const gT=S.filter(s=>s.g==='t'),gC=S.filter(s=>s.g==='c');
  const addCap=(s,ang,start)=>{const hh=cap(s,ang,start);if(!hh)return;if(Math.sin(ang)<0)bcap[s.g]+=hh;else caps+=hh;};
  if(!(tT&&tC)){if(T<1){const Rs=S.filter(z=>z.side>0),Ls=S.filter(z=>z.side<0);if(Rs.length)addCap(Rs.at(-1),Rs.at(-1).a1,false);if(Ls.length)addCap(Ls.at(-1),Ls.at(-1).a0,true);}}
  else if(GAP||T<1){if(gT.length){addCap(gT[0],gT[0].a0,true);addCap(gT.at(-1),gT.at(-1).a1,false);}if(gC.length){addCap(gC[0],gC[0].a0,true);addCap(gC.at(-1),gC.at(-1).a1,false);}}
  const bOrd=bcap.t&&!bcap.c?['t','c']:bcap.c&&!bcap.t?['c','t']:['t','c'],backH=bOrd.map(g=>back[g]+bcap[g]).join('');
  /* 카드 + 연결선 — 다 펼쳐진 뒤에만. 선끼리 닿지 않는 배치를 여러 순서로 찾아 고른다 */
  let lab='';
  if(T>=1){
    const ordr=a=>[...a].sort((p,q)=>(p.n==='기타')-(q.n==='기타')||q.v-p.v),cols=[];
    const TL=L('지상파','Terrestrial'),CL=L('케이블 · 종편','Cable · GP');
    if(gT.length&&gC.length)cols.push([-1,ordr(gT),TL,tT,'#24406f'],[1,ordr(gC),CL,tC,'#4a545e']);
    else{const G=gT.length?gT:gC,nm=gT.length?TL:CL,tc=gT.length?'#24406f':'#4a545e',Lh=G.filter(z=>z.side<0),Rh=G.filter(z=>z.side>0);
      cols.push([-1,ordr(Lh),gT.length?nm:'',tT+tC,tc],[1,ordr(Rh),gT.length?'':nm,tT+tC,tc]);}
    const rim=(s,f)=>{const m=s.a0+(s.a1-s.a0)*f,fr=Math.sin(m)>0;return {A:rot(P(m,R,s.ox,fr?DEP*.5:0)),E:rot(P(m,R+16,s.ox,fr?DEP*.5+Math.sin(m)*12:-2))};};
    const inDn=(x,y)=>{const u=(x-cx)*cs+(y-rc)*sn,v=-(x-cx)*sn+(y-rc)*cs,e=dv=>(u/(R+GAP+4))**2+((v-dv)/(R*K+4))**2<1;return e(-DEP/2)||e(DEP/2)||(Math.abs(u)<R+GAP&&Math.abs(v)<DEP/2);};
    const dd=(p,q,rr)=>{const dx=q[0]-p[0],dy=q[1]-p[1],l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((rr[0]-p[0])*dx+(rr[1]-p[1])*dy)/l));return Math.hypot(p[0]+t*dx-rr[0],p[1]+t*dy-rr[1]);};
    const oo=(a1,b,c)=>{const v=(b[0]-a1[0])*(c[1]-a1[1])-(b[1]-a1[1])*(c[0]-a1[0]);return Math.abs(v)<1e-6?0:Math.sign(v);};
    const segD=(a1,b,c,d)=>(oo(a1,b,c)*oo(a1,b,d)<0&&oo(c,d,a1)*oo(c,d,b)<0)?0:Math.min(dd(a1,b,c),dd(a1,b,d),dd(c,d,a1),dd(c,d,b));
    let bot=0;for(let t=0;t<=Math.PI;t+=.05)for(const ox of [-GAP,GAP])bot=Math.max(bot,rot(P(t,R,ox,DEP))[1]);
    const MIN=10,GAPL=12,ALLSEG=[];
    cols.forEach(([side,ord,tl,tv,tc])=>{if(!ord.length)return;const colx=side<0?BW:W-BW,bx0=side<0?0:W-BW;
      let ext=0;ord.forEach(s=>{for(let f=0;f<=1;f+=.1){const {E}=rim(s,f);ext=Math.max(ext,Math.abs(E[0]-cx));}});
      const X0=cx+side*(ext+10),lim=Math.abs(colx-cx)-8,maxK=Math.max(0,Math.floor((lim-Math.abs(X0-cx))/GAPL));
      const ys=ord.map((s,i)=>top0+i*PITCH+BH/2);
      const run=seq=>{const segs=[...ALLSEG],used=new Set(),out=new Array(ord.length);let total=0;
        for(const i of seq){const s=ord[i],y=ys[i];let best=null,bs=1e12;
          for(const f of [.5,.35,.65,.2,.8,.1,.9,.03,.97]){const {A,E}=rim(s,f);const bk=Math.sin(s.a0+(s.a1-s.a0)*f)<0,drops=[0,12,24,36,48];
            if(bk)drops.push(-12,-24,-36,-48);else for(const z of [0,12,24,36,48])drops.push(Math.max(0,Math.round(bot+12+z-E[1])));
            for(const d of new Set(drops))for(let k=0;k<=Math.max(maxK,ord.length-1);k++){const ku=used.has(k)||k>maxK?3000:0;const x=X0+side*k*GAPL,Dp=[E[0],E[1]+d],B1=[x,Dp[1]],B2=[x,y],C=[colx,y];
              const pts=d?[A,E,Dp,B1,B2,C]:[A,E,B1,B2,C],sg=[];for(let z=1;z<pts.length;z++)if(Math.hypot(pts[z][0]-pts[z-1][0],pts[z][1]-pts[z-1][1])>.5)sg.push([pts[z-1],pts[z]]);
              let pen=ku+Math.abs(f-.5)*60+k*.5+Math.abs(d)*.2;for(const [p1,p2] of sg)for(const [p3,p4] of segs){const g=segD(p1,p2,p3,p4);if(g<MIN)pen+=1000+(MIN-g)*50;}
              if(pen>=bs)continue;sg.slice(1).forEach(([p1,p2])=>{for(let t=.1;t<1;t+=.1){if(inDn(p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t))pen+=60;}});
              if(pen<bs){bs=pen;best={s,A,y,k,sg,pts};}}}
          used.add(best.k);segs.push(...best.sg);out[i]=best;total+=bs;}
        return {out,total};};
      const idx=ord.map((_,i)=>i),cand=[idx,[...idx].reverse(),[...idx].sort((p,q)=>rim(ord[p],.5).A[1]-rim(ord[q],.5).A[1]),[...idx].sort((p,q)=>rim(ord[q],.5).A[1]-rim(ord[p],.5).A[1])];
      let bestRun=null;for(const sq of cand){const rr=run(sq);if(!bestRun||rr.total<bestRun.total)bestRun=rr;if(rr.total<1000)break;}
      const Lr=bestRun.out;Lr.forEach(q=>ALLSEG.push(...q.sg));
      if(tl)lab+=`<text x="${side<0?bx0:W}" ${side>0?'text-anchor="end"':''} y="${top0-14}" font-size="14.5" font-weight="900" fill="${tc}">${tl} <tspan fill="var(--ink)">${wrEok(tv)}</tspan> <tspan font-size="12" font-weight="700" fill="var(--muted)">${Math.round(tv/tot*100)}%</tspan></text>`;
      Lr.forEach(q=>{const s=q.s,y=q.y,st=s.g==='t'?'#8fa3c8':'#b3bcc4',f=v=>v.toFixed(1);const etc=s.n==='기타'&&(D.etc[s.g]||[]).length;
        lab+=`<g class="cd${etc?' etc':''}" data-wrk="${s.k}"><path class="ln" d="M${q.pts.map(p=>f(p[0])+','+f(p[1])).join(' L')}" fill="none" stroke="${st}" stroke-width="1.3" stroke-linejoin="round"/>
          <circle cx="${q.A[0].toFixed(1)}" cy="${q.A[1].toFixed(1)}" r="2.6" fill="${st}"/>
          <rect class="bx" x="${bx0+.5}" y="${y-BH/2}" width="${BW-1}" height="${BH}" rx="10" fill="var(--surface)" stroke="${s.g==='t'?'#cdd6e8':'#dfe3e7'}"/>
          <rect x="${bx0+11}" y="${y-5}" width="10" height="10" rx="2.5" fill="${s.col}"/>
          <text x="${bx0+29}" y="${y-3}" font-size="12.5" font-weight="800" fill="var(--ink)">${esc(s.n)}</text>
          <text x="${bx0+29}" y="${y+13}" font-size="11.5" font-weight="700" fill="var(--muted)">${wrEok(s.v)} · ${(s.v/tot*100).toFixed(s.v/tot<.1?1:0)}%</text>
          ${etc?`<text x="${bx0+BW-12}" y="${y+4}" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--acc)">${D.etc[s.g].length}${L('개 보기 ›',' more ›')}</text>`:''}</g>`;});});}
  WR_DN_S=S.map(s=>({k:s.k,n:s.n,v:s.v,g:s.g,tot}));
  const defs=`<defs><linearGradient id="wrhl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="wrwd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#0c1a2a" stop-opacity=".18"/></linearGradient>
    <radialGradient id="wrsh"><stop offset="0" stop-color="#0c1a2a" stop-opacity=".14"/><stop offset="1" stop-color="#0c1a2a" stop-opacity="0"/></radialGradient></defs>`;
  return `<svg class="wr-dn${T>=1?' done':''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}<g class="dn" transform="rotate(${ROT} ${cx} ${rc})">
    <ellipse cx="${cx}" cy="${cy+DEP+14}" rx="${R*1.2}" ry="${R*K*.8}" fill="url(#wrsh)" opacity="${Math.min(1,T*1.5).toFixed(2)}"/>${backH}${caps}${walls}${tops}</g>${lab}</svg>`;}
let WR_DN_S=[];
function wrDnMount(){
  const box=$('wrDn');if(!box)return;const D=wrDnData();
  if(!D.t.length&&!D.c.length){box.innerHTML=`<div class="hint" style="padding:30px;text-align:center">${L('채널 예산이 없습니다','No channel budget')}</div>`;return;}
  const W=Math.max(820,Math.min(1080,box.clientWidth||1000));
  const id=(box._a=(box._a||0)+1),t0=performance.now(),DUR=1000,ease=x=>1-Math.pow(1-x,3);
  const done=()=>{const svg=box.querySelector('svg');if(!svg)return;
    svg.addEventListener('mouseover',e=>{const g=e.target.closest('[data-wrk]');wrDnHot(svg,g?g.dataset.wrk:null,e);});
    svg.addEventListener('mousemove',e=>{const g=e.target.closest('[data-wrk]');if(g)wrDnTip(g.dataset.wrk,e);});
    svg.addEventListener('mouseleave',()=>{wrDnHot(svg,null);hideTip();});
    svg.addEventListener('click',e=>{const g=e.target.closest('.cd.etc,[data-wrk]');if(!g)return;const s=WR_DN_S.find(x=>x.k===g.dataset.wrk);
      if(s&&s.n==='기타')wrDnEtc(s.g,D);});};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){box.innerHTML=wrDnSvg(D,1,W);done();return;}
  const fr=now=>{if(box._a!==id)return;const x=Math.min(1,(now-t0)/DUR);box.innerHTML=wrDnSvg(D,x<1?ease(x):1,W);if(x<1)requestAnimationFrame(fr);else done();};
  requestAnimationFrame(fr);}
function wrDnHot(svg,k){svg.classList.toggle('hot',!!k);svg.querySelectorAll('[data-wrk]').forEach(e=>e.classList.toggle('on',e.dataset.wrk===k));if(!k)hideTip();}
function wrDnTip(k,e){const s=WR_DN_S.find(x=>x.k===k);if(!s)return;
  const D=wrDnData(),list=s.n==='기타'?(D.etc[s.g]||[]):[];
  showTip(e.clientX,e.clientY,`<div class="t">${esc(s.n)} · ${s.g==='t'?L('지상파','Terrestrial'):L('케이블 · 종편','Cable · GP')}</div>
    <div class="r"><span class="l">${L('월 예산','Budget')}</span><b>${wrF(s.v)} ${L('천원','K')}</b></div>
    <div class="r"><span class="l">${L('비중','Share')}</span><b>${(s.v/s.tot*100).toFixed(1)}%</b></div>
    ${list.length?`<div class="tsec">${L('기타에 묶인 PP','Grouped in Other')}</div>${list.map(([n,v])=>`<div class="r"><span class="l">${esc(n)}</span><b>${wrEok(v)} <span class="sm">${(v/s.tot*100).toFixed(1)}%</span></b></div>`).join('')}`:''}`);}
function wrDnEtc(g,D){const box=$('wrDnEtc');if(!box)return;const list=D.etc[g]||[];
  if(WR_ETC===g&&!box.classList.contains('hidden')){box.classList.add('hidden');WR_ETC=null;return;}WR_ETC=g;
  const tot=WR_DN_S.length?WR_DN_S[0].tot:1;
  box.innerHTML=`<div class="h">${L('기타','Other')} — ${g==='t'?L('지상파','Terrestrial'):L('케이블 · 종편','Cable · GP')} <button type="button" class="x" aria-label="${L('닫기','Close')}">×</button></div>
    <div class="l">${list.map(([n,v])=>`<div class="it"><span>${esc(n)}</span><b>${wrEok(v)}</b><em>${(v/tot*100).toFixed(1)}%</em></div>`).join('')}</div>`;
  box.classList.remove('hidden');box.querySelector('.x').onclick=()=>{box.classList.add('hidden');WR_ETC=null;};}

/* ================================================================
   GRP 달성 현황 (v184) — 위클리 리포트 '당월_광고비 기준별 효율' 시트. 화면 이름은 엑셀처럼 'GRP 달성률'(노출량 ÷ Total 목표).
   TV_WR.eff = {asof:'~11/8', days:집행일수, span:운영 일, prog:진척률,
                rows:[[구분, 이름, 목표 CPRP, 예산(천원), eq.GRP, 목표 eq.GRP, 달성률]…],   ← 지상파는 채널, 케이블은 PP Total 줄
                gt:{지상파:[…5], 케이블:[…5]}, tot:[…5]}
   시트 값을 그대로 쓰고, 옛 양식처럼 합계 줄에 목표 · 달성률이 비어 있으면 줄들을 더해 채운다.
   eff 가 아직 없는 캠페인은 당월_주별 채널 값(예산 ÷ 목표 CPRP)으로 같은 모양을 만든다.
   ================================================================ */
function wrEff(){
  const W=TV_WR||{},E=W.eff,num=v=>{const n=wrN(v);return isFinite(n)?n:NaN;};
  let rows=[],prog=NaN,days=NaN,span=NaN,asof='',src='eff';
  if(E&&Array.isArray(E.rows)&&E.rows.length){
    rows=E.rows.map(r=>({g:r[0],n:r[1],tc:num(r[2]),bud:num(r[3]),eq:num(r[4])||0,tg:num(r[5]),rate:num(r[6])}));
    prog=num(E.prog);days=num(E.days);span=num(E.span);asof=E.asof||'';
  }else{src='chs';const m={};(W.chs||[]).forEach(c=>{const k=c.g+'|'+(c.g==='지상파'?c.ch:(c.pp||c.ch)),o=m[k]||(m[k]={g:c.g,n:c.g==='지상파'?c.ch:(c.pp||c.ch),bud:0,eq:0,tg:0});
      o.bud+=wrN(c.bud)||0;o.eq+=wrN(c.eq)||0;if(wrN(c.bud)>0&&wrN(c.tc)>0)o.tg+=c.bud/c.tc;});
    rows=Object.values(m).filter(o=>o.bud>0||o.eq>0).map(o=>({...o,tc:o.tg>0?o.bud/o.tg:NaN,tg:o.tg>0?o.tg:NaN,rate:NaN}));}
  rows.forEach(r=>{if(!isFinite(r.rate))r.rate=r.tg>0?r.eq/r.tg:NaN;});
  rows=rows.filter(r=>r.tg>0||r.eq>0);if(!rows.length)return null;
  const grp=g=>{const rs=rows.filter(r=>r.g===g),x=E&&E.gt&&E.gt[g]||[];let bud=num(x[1]),eq=num(x[2]),tg=num(x[3]),rate=num(x[4]);
    if(!isFinite(bud))bud=rs.reduce((s,r)=>s+(r.bud||0),0);if(!isFinite(eq))eq=rs.reduce((s,r)=>s+r.eq,0);
    if(!(tg>0))tg=rs.reduce((s,r)=>s+(r.tg>0?r.tg:0),0);if(!isFinite(rate))rate=tg>0?eq/tg:NaN;return {g,n:g+' Total',bud,eq,tg,rate,tot:1,k:rs.length};};
  const G=['지상파','케이블'].map(grp).filter(x=>x.k);
  const x=E&&E.tot||[];let bud=num(x[1]),eq=num(x[2]),tg=num(x[3]),rate=num(x[4]);
  if(!isFinite(bud))bud=G.reduce((s,g)=>s+g.bud,0);if(!isFinite(eq))eq=wrN((W.wtot||{}).eq)>0?W.wtot.eq:G.reduce((s,g)=>s+g.eq,0);
  if(!(tg>0))tg=G.reduce((s,g)=>s+g.tg,0);if(!isFinite(rate))rate=tg>0?eq/tg:NaN;
  /* 진척률 — 시트에 없으면 리포트 기간으로 */
  if(!(span>0)){try{const [y,m]=String(W.ym).split('-').map(Number);span=new Date(y,m,0).getDate();}catch(e){}}
  if(!(days>0)){const we=(W.weeks||[]).map(w=>w.e).filter(Boolean).sort().pop();days=we?+String(we).slice(8,10):span;}
  if(!isFinite(prog))prog=span>0?Math.min(1,days/span):1;
  /* v185 — 목표 페이스 = 미디어믹스(큐시트)의 채널×품목 예산을 품목(소재)별 집행 기간으로 일할한 값.
     (11/10 에 시작하는 품목의 예산은 11/8 까지 0% · 11/1~9 품목은 8/9) 큐시트가 없으면 달 전체 일할(진척률) */
  const X=wrCueX();let psrc='prog';
  rows.forEach(r=>{const p=X?X.pace(r.g,r.n,days):NaN;if(isFinite(p)){r.pace=p;psrc='cue';}else r.pace=prog;});
  const wp=rs=>{let a=0,b=0;rs.forEach(r=>{const w=r.tg>0?r.tg:0;a+=w*r.pace;b+=w;});return b>0?a/b:prog;};
  G.forEach(g=>{g.pace=wp(rows.filter(r=>r.g===g.g));});
  /* v189 — 날짜별 목표 페이스(주요 지표 카드의 점선) · 예산 기준 페이스 */
  const pBud=X?X.paceBud(days):NaN;
  const paceAt=d=>{if(!X)return span>0?Math.min(1,d/span):1;let a=0,b=0;rows.forEach(r=>{const w=r.tg>0?r.tg:0;if(!w)return;const p=X.pace(r.g,r.n,d);a+=w*(isFinite(p)?p:Math.min(1,d/span));b+=w;});return b>0?a/b:Math.min(1,d/span);};
  const paceBudAt=d=>{const p=X?X.paceBud(d):NaN;return isFinite(p)?p:(span>0?Math.min(1,d/span):1);};
  rows.forEach(r=>{r.span=X?X.span(r.g,r.n):null;});
  return {rows,G,tot:{bud,eq,tg,rate,pace:wp(rows),paceB:isFinite(pBud)?pBud:prog},prog,days,span,asof,src,psrc,paceAt,paceBudAt,spots:!!(X&&X.hasSpots)};}

/* ---------- v185 — 미디어믹스(큐시트)에서 읽는 값: 채널×품목 예산 · 품목(소재)별 집행 기간 ---------- */
var WR_CX={key:'',d:null,q:''};
const wrNz=s=>String(s==null?'':s).replace(/\s+/g,'').toLowerCase();
const WR_CHAL={kbs:'kbs2','tv조선':'tvchosun'};   /* 큐시트 채널 이름 → 위클리 채널 이름 */
const wrChK=s=>{const k=wrNz(s);return WR_CHAL[k]||k;};
function wrCueX(){
  try{
    if(typeof TV_CUE==='undefined'||!TV_CUE||!TV_CUE.z||!TV_WR||String(TV_CUE.ym)!==String(TV_WR.ym).slice(0,7))return null;
    const key=cueKeyOf();
    if(WR_CX.key===key)return WR_CX.d;
    if(typeof CUE!=='undefined'&&CUE.json&&CUE.key===key){WR_CX={key,d:wrCueParse(CUE.json,TV_CUE.ym),q:''};return WR_CX.d;}
    if(WR_CX.q!==key){WR_CX.q=key;const z=TV_CUE.z,ym=TV_CUE.ym;
      cueUngz(z).then(js=>{if(cueKeyOf()!==key)return;WR_CX={key,d:wrCueParse(js,ym),q:''};
        /* 다 읽으면 달성 현황만 다시 그린다(페이지 전체를 다시 그리지 않는다) */
        try{if($('wrPace'))wrEffPaint();}catch(e){}}).catch(()=>{WR_CX={key,d:null,q:''};});}
    return null;
  }catch(e){return null;}}
function wrCueParse(js,ym){
  const S=JSON.parse(js).sheets||{},B=S['예산']||[],hd=(B[0]||[]).slice(1).map(x=>String(x||'').trim());
  const [Y,M]=String(ym).split('-').map(Number),last=new Date(Y,M,0).getDate();
  const full={},cat={};(S['품목']||[]).forEach(r=>{if(r&&r[0]){full[r[0]]=String(r[1]||r[0]).trim();cat[r[0]]=String(r[2]||'').trim();}});
  /* 소재 시트 — 품목 칸이 빈 줄은 윗줄 품목 · 기간 칸이 빈 줄은 윗줄 기간 · '… 계' 줄은 뺀다. 기간은 '11/10~30' · '9/18~9/30' */
  const per={};let cur='',pd=null;
  (S['소재']||[]).forEach(r=>{if(!r)return;if(r[0]){cur=wrNz(r[0]);pd=null;}
    const m=String(r[1]||'').match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*[~\-–]\s*(?:(\d{1,2})\s*\/\s*)?(\d{1,2})/);
    if(m){const m1=+m[1],m2=m[3]?+m[3]:m1;pd=(m1>M||m2<M)?null:[m1<M?1:Math.min(+m[2],last),m2>M?last:Math.min(+m[4],last)];}
    const nm=String(r[3]||'').trim();if(!cur||!nm||/\s계$/.test(nm))return;
    const w=+r[4];(per[cur]||(per[cur]=[])).push({n:nm,s:pd?pd[0]:1,e:pd?Math.max(pd[0],pd[1]):last,w:w>0?w:0,has:!!pd});});
  /* v189 — 매체(채널)별 집행 기간 = 큐시트 편성의 첫 날~마지막 날 (채널×품목 · 없으면 채널 전체 · 그래도 없으면 소재 시트의 품목 기간)
     지상파 시트: [채널,…,일자(10),품목(11)] · 케이블 시트: [채널,품목(1),…,일자(18)] */
  const sp={},spc={};
  const addSp=(ch,it,dt)=>{const m=/^(\d{1,2})\/(\d{1,2})$/.exec(String(dt||'').trim());if(!m||+m[1]!==M)return;const d=Math.min(+m[2],last),c=wrChK(ch),k=c+'|'+wrNz(it);
    const o=sp[k]||(sp[k]=[d,d]);if(d<o[0])o[0]=d;if(d>o[1])o[1]=d;const q=spc[c]||(spc[c]=[d,d]);if(d<q[0])q[0]=d;if(d>q[1])q[1]=d;};
  (S['지상파']||[]).forEach(r=>{if(r&&r[0])addSp(r[0],r[11],r[10]);});
  (S['케이블']||[]).forEach(r=>{if(r&&r[0])addSp(r[0],r[1],r[18]);});
  const pk=Object.keys(per);
  const items=hd.map(h=>{const a=wrNz(h),f=wrNz(full[h]||h),c=wrNz(cat[h]||'');
    let k=pk.find(x=>x===a)||pk.find(x=>x===f)||pk.find(x=>x.startsWith(a)||a.startsWith(x))||(c?pk.find(x=>x.includes(c)&&!hd.some(o=>wrNz(o)===x)):null);
    const cr=k?per[k]:[];const ws=cr.reduce((s,x)=>s+x.w,0);
    const frac=d=>{if(!cr.length)return Math.min(1,Math.max(0,d/last));let t=0,W=0;
      cr.forEach(x=>{const w=ws>0?x.w:1;W+=w;t+=w*Math.min(1,Math.max(0,(d-x.s+1)/(x.e-x.s+1)));});return W>0?t/W:0;};
    return {n:h,fn:full[h]||h,cat:cat[h]||'',cr,frac,s:cr.length?Math.min(...cr.map(x=>x.s)):1,e:cr.length?Math.max(...cr.map(x=>x.e)):last};});
  const meta={};(S['채널']||[]).forEach(r=>{if(r&&r[0])meta[r[0]]={g:r[2]==='지상파'?'지상파':'케이블',pp:String(r[3]||r[0])};});
  const rows=B.slice(1).map(r=>{const m=meta[r[0]]||{g:'케이블',pp:String(r[0])};return {ch:String(r[0]),k:wrChK(r[0]),g:m.g,pp:m.pp,v:hd.map((_,i)=>{const v=+r[i+1];return v>0?v:0;})};}).filter(r=>r.v.some(v=>v>0));
  /* 위클리 품목 이름(카페얼음정수기 · 노블청정기 …) → 큐시트 품목(카페 얼음 · 노블 …) */
  const itemIx=n=>{const a=wrNz(n);let i=items.findIndex(x=>wrNz(x.fn)===a||wrNz(x.n)===a);
    if(i<0)i=items.findIndex(x=>a.startsWith(wrNz(x.n))||wrNz(x.fn).startsWith(a)||a.startsWith(wrNz(x.fn)));return i;};
  const PPAL={kbs:'kbsn',mbc:'mbc+',sbs:'sbs미디어넷'};
  /* 한 채널 × 한 품목이 그 날까지 집행했어야 할 비율 */
  const spanOf=(r,i)=>sp[r.k+'|'+wrNz(items[i].n)]||spc[r.k]||null;
  const fr=(r,i,day)=>{const x=spanOf(r,i);return x?Math.min(1,Math.max(0,(day-x[0]+1)/(x[1]-x[0]+1))):items[i].frac(day);};
  const hitOf=(g,n)=>{const want=wrNz(n),wpp={};((TV_WR&&TV_WR.chs)||[]).forEach(c=>{wpp[wrNz(c.ch)]=wrNz(c.pp||c.ch);});
    return rows.filter(r=>r.g===g&&(g==='지상파'?r.k===want:(wpp[r.k]||PPAL[wrNz(r.pp)]||wrNz(r.pp))===want));};
  return {items,rows,last,itemIx,hasSpots:Object.keys(spc).length>0,
    /* 예산 기준 전체 페이스(소진 예산 카드) */
    paceBud(day){let a=0,b=0;rows.forEach(r=>r.v.forEach((v,i)=>{if(v>0){a+=v*fr(r,i,day);b+=v;}}));return b>0?a/b:NaN;},
    /* 채널(지상파) · PP(케이블) 한 칸의 집행 기간(첫 날~마지막 날) */
    span(g,n){let s=99,e=0;hitOf(g,n).forEach(r=>r.v.forEach((v,i)=>{if(!(v>0))return;const x=spanOf(r,i)||[items[i].s,items[i].e];if(x[0]<s)s=x[0];if(x[1]>e)e=x[1];}));return e?[s,e]:null;},
    /* 위클리의 채널(지상파) · PP(케이블) 한 칸의 목표 페이스 */
    pace(g,n,day){let a=0,b=0;
      hitOf(g,n).forEach(r=>{r.v.forEach((v,i)=>{if(v>0){a+=v*fr(r,i,day);b+=v;}});});
      return b>0?a/b:NaN;},
    /* 품목 × 채널 예산(천원) */
    bud(item,ch){const i=itemIx(item);if(i<0)return NaN;const k=wrNz(ch),r=rows.find(x=>x.k===k);return r?r.v[i]/1000:0;},
    item(n){const i=itemIx(n);return i<0?null:items[i];}};}

/* 맨 위 큰 막대 — 디지털 '캠페인 진행 현황'과 같은 틀(날짜 칸 · 막대 · 목표 페이스 점) */
function wrPaceHtml(F){
  const W=TV_WR,[y,m]=String(W.ym).split('-').map(Number),WDK=['일','월','화','수','목','금','토'];
  const cells=[...Array(F.span)].map((_,i)=>{const d=new Date(y,m-1,i+1),hol=(typeof holName==='function')?holName(d):null,rest=d.getDay()===0||d.getDay()===6||!!hol;
    return `<i class="${i<F.days?'on':''}${rest?' rest':''}" data-wrd="${esc(`${m}/${i+1} (${WDK[d.getDay()]})${hol?' · '+hol:''}`)}"></i>`;}).join('');
  const T=F.tot,r=isFinite(T.rate)?T.rate:0,f=Math.min(Math.max(r,0),1)*100,pv=isFinite(T.pace)?T.pace:F.prog,pace=Math.min(Math.max(pv,0),1)*100;
  const pr=pv>0?r/pv:1,ahead=pr>=1,c=PACE_SEG[0],amb=ambLevel(pr),C=ahead?AMB_OK:AMB_NG;
  const tone=mixHex(PACE_TONE,ahead?TONE_OK:TONE_NG,Math.min(Math.abs(pr-1)/.06,1));
  /* v189 — 막대는 지상파 · 케이블 두 구간만(PP 로 쪼개면 너무 잘다) */
  const SG=F.G.filter(x=>x.eq>0),segT=SG.reduce((s,x)=>s+x.eq,0)||1;
  const R1=wrN((W.tot||{}).r1),R3=wrN((W.tot||{}).r3);
  const segs=SG.map((x,i)=>`<i style="width:${(x.eq/segT*100).toFixed(4)}%" data-wrseg="${i}"><span class="nm">${esc(x.g==='지상파'?L('지상파','Terrestrial'):L('케이블','Cable'))}</span><span class="pc">${T.tg>0?(x.eq/T.tg*100).toFixed(1)+'%':''}</span></i>`).join('');
  const last=new Date(y,m-1,F.span);
  return `<div class="pacescroll"><div class="pacebody">
      <div class="phead">${L(`집행 ${F.days}일차`,`Day ${F.days}`)} <span class="sep">/</span> ${L(`총 ${F.span}일`,`of ${F.span}`)}
        <span class="el">${Math.round(F.prog*100)}% ${L('경과','elapsed')} · ${L('목표 페이스','target pace')} ${(pv*100).toFixed(1)}%</span></div>
      <div class="pline days">
        <div class="pside"><div class="nm1">${L('시작일','Start')}</div><div class="sub1">${y}.${String(m).padStart(2,'0')}.01(${WDK[new Date(y,m-1,1).getDay()]})</div></div>
        <div class="pmid"><div class="dgauge">${cells}</div></div>
        <div class="pside r"><div class="nm1">${L('종료일','End')}</div><div class="sub1">${y}.${String(m).padStart(2,'0')}.${String(F.span).padStart(2,'0')}(${WDK[last.getDay()]})</div></div>
      </div>
      <div class="pline">
        <div class="pside"><div class="nm1">GRP</div><div class="sub1">${L('노출량','Delivered')} ${wrF(T.eq,1)}</div></div>
        <div class="pmid">
          <div class="pdotrow"><i style="left:${pace}%"></i></div>
          <div class="pbar" id="wrPaceBar">
            <div class="mstack" style="width:${f}%;--segbg:linear-gradient(150deg,${adjust(c,.08,.05)},${c});--ambc:transparent;--ambrgb:${C[0]} ${C[1]} ${C[2]};--amba:${(amb*.62).toFixed(3)}">${segs}</div>
            <div class="sheen" style="width:${f}%"></div>
          </div>
        </div>
        <div class="pside r"><div class="nm1" style="color:${tone}">${isFinite(T.rate)?(T.rate*100).toFixed(1)+'%':'–'}</div><div class="sub1">${L('Total 목표','Total target')} ${wrF(T.tg,0)}</div></div>
      </div>
      ${isFinite(R3)?`<div class="pline">
        <div class="pside"><div class="nm1">R3+</div><div class="sub1">${isFinite(R1)?'R1+ '+R1.toFixed(1)+'%':L('유효 도달률','Effective reach')}</div></div>
        <div class="pmid">
          <div class="pbar rch" id="wrRchBar">${isFinite(R1)?`<div class="r1" style="width:${Math.min(R1,100).toFixed(2)}%"><span>R1+ ${R1.toFixed(1)}%</span></div>`:''}
            <div class="mstack" style="width:${Math.min(Math.max(R3,0),100).toFixed(2)}%;--segbg:linear-gradient(150deg,${adjust(c,.08,.05)},${c});--ambc:transparent;--ambrgb:${C[0]} ${C[1]} ${C[2]};--amba:0"><i style="width:100%"><span class="nm">R3+</span><span class="pc">${R3.toFixed(1)}%</span></i></div>
          </div>
        </div>
        <div class="pside r"><div class="nm1">${R3.toFixed(1)}%</div><div class="sub1">${L('유효 도달률 · 목표 없음','Effective reach · no target')}</div></div>
      </div>`:''}
      <div class="pfoot"><i></i>${L('막대 위의 점 =','Dot above the bar =')} <b>${L('목표 페이스','target pace')}</b>
        <span>${L(`GRP 달성률 = 노출량 ÷ Total 목표(예산 ÷ 목표 CPRP) · 점 = ${F.asof?F.asof.replace('~','')+'까지 ':''}채웠어야 할 수준 ${(pv*100).toFixed(1)}%${F.psrc==='cue'?(F.spots?' — 매체(채널)마다 큐시트의 첫 편성일~마지막 편성일로 일할해 더한 값':' — 미디어믹스의 품목별 집행 기간으로 일할'):' (달 전체 일할)'} · 막대 구간 = 지상파 · 케이블이 채운 양 · R3+ 는 도달률 그대로(옅은 막대 = R1+)`,`GRP achievement = delivered ÷ total target (budget ÷ target CPRP) · dot = share due by now ${(pv*100).toFixed(1)}%${F.psrc==='cue'?' — prorated by each product\'s flight in the media mix':''} · segments = channels / PPs`)}</span></div>
    </div></div>`;}

/* ---------- v189 — 주요 지표 카드: 소진 예산 · GRP · Reach 1+ · Reach 3+ (eq.GRP 는 뺐다)
   값 · 페이스 판정(우세/저조) · 아래에 주차별 누적 그래프(실선 = 실제 누적, 점선 = 목표 페이스) ---------- */
function wrKpiPaint(F){
  const el=$('wrKs');if(!el)return;const W=TV_WR,T=W.tot||{},wt=W.wtot||{};
  const bud=wrN(wt.bud)>0?wt.bud:wrN(T.bud),spent=wrN(wt.cost),eqT=F&&F.tot.tg>0?F.tot.tg:wrEqTarget();
  const k=wrN(T.eq)>0&&wrN(T.grp)>0?T.grp/T.eq:NaN,grpT=isFinite(eqT)&&isFinite(k)?eqT*k:NaN;
  const [y,m]=String(W.ym).split('-').map(Number),span=F?F.span:new Date(y,m,0).getDate(),days=F?F.days:span;
  const wks=(W.weeks||[]).map((w,i)=>({l:w.l,s:+String(w.s).slice(8,10),e:+String(w.e).slice(8,10),v:(wt.w||[])[i]||[0,0]}));
  /* 주차 끝 날짜마다 누적 */
  const cum=f=>{let a=0;const o=[{d:0,v:0,l:''}];wks.forEach(w=>{a+=f(w.v)||0;o.push({d:w.e,v:a,l:`${w.l} (${m}/${w.s}${w.e>w.s?'~'+w.e:''})`});});return o;};
  const rs=(W.rs||[]).filter(x=>x&&x[0]>0&&x[0]<days).sort((a,b)=>a[0]-b[0]);   /* 지난 위클리의 도달률(있으면) [일,R1,R3] */
  const rch=i=>[{d:0,v:0,l:''}].concat(rs.map(x=>({d:x[0],v:x[i],l:`${m}/${x[0]}`})),[{d:days,v:wrN(T[i===1?'r1':'r3']),l:`${m}/${days}`}]).filter(p=>isFinite(p.v));
  const paceG=F?F.tot.pace:NaN,paceB=F?F.tot.paceB:NaN;
  const C=[
    {k:'bud',l:L('소진 예산','Budget spent'),v:wrEok(spent),rate:wrPct(spent,bud),pace:paceB,tg:bud,fmt:wrEok,pts:cum(x=>x[1]),pf:F&&F.paceBudAt,
      s1:`${L('목표','Target')} <b>${wrEok(bud)}</b>`,rl:L('소진율','Spent')},
    {k:'grp',l:'GRP',v:wrF(T.grp,1),rate:F&&isFinite(F.tot.rate)?F.tot.rate:wrPct(T.grp,grpT),pace:paceG,tg:grpT,fmt:v=>wrF(v,1),pts:isFinite(k)?cum(x=>x[0]*k):[],pf:F&&F.paceAt,
      s1:isFinite(grpT)?`${L('목표(환산)','Target(conv.)')} <b>${wrF(grpT,0)}</b>`:L('목표 없음','No target'),rl:L('달성률','Achieved')},
    {k:'r1',l:'Reach 1+',v:isFinite(wrN(T.r1))?T.r1.toFixed(1)+'%':'–',fmt:v=>v.toFixed(1)+'%',pts:rch(1),s1:L('타깃 도달률','Target reach'),pct:1},
    {k:'r3',l:'Reach 3+',v:isFinite(wrN(T.r3))?T.r3.toFixed(1)+'%':'–',fmt:v=>v.toFixed(1)+'%',pts:rch(2),s1:L('유효 도달률','Effective reach'),pct:1}];
  const VW=300,VH=104,X=d=>d/span*VW;
  el.innerHTML=C.map((c,ci)=>{
    const has=isFinite(c.rate)&&isFinite(c.pace),df=has?(c.rate-c.pace)*100:NaN,up=df>=0;
    const bd=has&&Math.abs(df)<.05?`<span class="bd no">${L('페이스와 같음','on pace')}</span>`:has?`<span class="bd ${up?'up':'dn'}">${L('페이스 대비','vs pace')} ${up?'+':'−'}${Math.abs(df).toFixed(1)}%p ${up?'↑':'↓'} · ${up?L('우세','ahead'):L('저조','behind')}</span>`:(c.pct?`<span class="bd no">${L('목표 없음','no target')}</span>`:'');
    const pts=c.pts.filter(p=>p.d<=span),pace=[];
    if(c.pf&&c.tg>0)for(let d=0;d<=span;d++)pace.push({d,v:c.tg*c.pf(d)});
    const mx=Math.max(...pts.map(p=>p.v),...pace.map(p=>p.v),c.tg>0?c.tg:0,1e-9)*1.08,Y=v=>VH-4-(v/mx)*(VH-12);
    const ln=pts.length>1?pts.map((p,i)=>(i?'L':'M')+X(p.d).toFixed(1)+' '+Y(p.v).toFixed(1)).join(''):'';
    const last=pts[pts.length-1];
    const svg=ln?`<svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none" aria-hidden="true">
        ${pace.length?`<path class="pc" d="${pace.map((p,i)=>(i?'L':'M')+X(p.d).toFixed(1)+' '+Y(p.v).toFixed(1)).join('')}"/>`:''}
        <path class="ar" d="${ln}L${X(last.d).toFixed(1)} ${VH}L0 ${VH}Z"/><path class="ln" d="${ln}"/></svg>
        ${pts.slice(1).map((p,i)=>`<i class="pt${i===pts.length-2?' end':''}" style="left:${(p.d/span*100).toFixed(2)}%;top:${(Y(p.v)/VH*100).toFixed(2)}%"></i>`).join('')}
        <span class="ax">${m}/1</span><span class="ax r">${m}/${span}</span>`:`<span class="none">${L('주차별 값 없음','No weekly values')}</span>`;
    return `<div class="wrk" data-k="${c.k}" style="--d:${ci*60}ms">
      <span class="l">${c.l}</span><b class="v">${c.v}</b>${bd}
      <span class="s">${c.s1}</span>
      <span class="s">${has?`${c.rl} <b>${(c.rate*100).toFixed(1)}%</b> (${L('목표 페이스','target pace')} ${(c.pace*100).toFixed(1)}%)`:(c.pct?L(`${m}/${days} 기준 누적`,`cumulative as of ${m}/${days}`):'&nbsp;')}</span>
      <div class="ch" data-ci="${ci}">${svg}</div></div>`;}).join('');
  el.querySelectorAll('.ch').forEach(ch=>{const c=C[+ch.dataset.ci],pts=c.pts.filter(p=>p.d>0&&p.d<=span);if(!pts.length)return;
    ch.addEventListener('mousemove',e=>{const r=ch.getBoundingClientRect(),d=(e.clientX-r.left)/r.width*span;let b=pts[0];pts.forEach(p=>{if(Math.abs(p.d-d)<Math.abs(b.d-d))b=p;});
      ch.querySelectorAll('.pt').forEach((x,i)=>x.classList.toggle('on',pts[i]===b));
      const pv=c.pf&&c.tg>0?c.tg*c.pf(b.d):NaN;
      showTip(e.clientX,e.clientY,`<div class="t">${esc(c.l)} <span style="font-weight:600;opacity:.6">· ${esc(b.l)}</span></div>
        <div class="r hi"><span class="l">${L('누적','Cumulative')}</span><b>${c.fmt(b.v)}</b></div>
        ${isFinite(pv)?`<div class="r"><span class="l">${L('목표 페이스','Target pace')}</span><b>${c.fmt(pv)}</b></div><div class="r"><span class="l">${L('페이스 대비','vs pace')}</span><b>${pv>0?(b.v/pv*100).toFixed(0)+'%':'–'}</b></div>`:''}
        ${c.tg>0?`<div class="r"><span class="l">${L('목표 대비','Of target')}</span><b>${(b.v/c.tg*100).toFixed(1)}%</b></div>`:''}
        ${c.k==='grp'?`<div class="r"><span class="l" style="opacity:.7">${L('주차별 GRP 는 eq.GRP 비율로 나눈 값','weekly GRP split by eq.GRP share')}</span></div>`:''}`);});
    ch.addEventListener('mouseleave',()=>{hideTip();ch.querySelectorAll('.pt').forEach(x=>x.classList.remove('on'));});});}

/* PP별 도넛 카드 — 디지털 'KPI 달성 현황' 카드와 같은 틀 */
function wrEffCards(box,F,grp){
  if(!box)return;box.innerHTML='';
  /* v185 — 한 줄에 한 묶음: 맨 앞에 Total, 그 오른쪽으로 채널(지상파) · PP(케이블) */
  const list=[];F.G.filter(g=>!grp||g.g===grp).forEach(g=>{list.push(g);F.rows.filter(r=>r.g===g.g).forEach(r=>list.push(r));});
  box.classList.toggle('hidden',!list.length);
  const CC=136,VB=272,TH=27,rad=VB/2-TH/2-24,cir=2*Math.PI*rad;
  const pxy=(deg,rr)=>{const a=(deg-90)*Math.PI/180;return [CC+Math.cos(a)*rr,CC+Math.sin(a)*rr];};
  const arcPath=(d1,d2)=>{const [x1,y1]=pxy(d1,rad),[x2,y2]=pxy(d2,rad);return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rad} ${rad} 0 ${Math.abs(d2-d1)>180?1:0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;};
  list.forEach((r,i)=>{
    const c=el('div','card donut wrdn'+(r.tot?' tot':''),box);
    const pf=Math.min(Math.max(isFinite(r.pace)?r.pace:F.prog,0),1);
    const af=Math.min(Math.max(isFinite(r.rate)?r.rate:0,0),1);
    c.innerHTML=`<div class="dhd"><div class="k">${esc(r.n)}</div><div class="kpitag">${r.tot?L(`${r.k}개 ${r.g==='지상파'?'채널':'PP'}`,`${r.k} ${r.g==='지상파'?'channels':'PPs'}`):esc(r.g)}</div></div><div class="ring"></div>`;
    const ring=c.querySelector('.ring'),svg=S('svg',{viewBox:`0 0 ${VB} ${VB}`,width:'100%',height:'100%'}),defs=S('defs',{},svg);
    S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:DONUT_TRACK,'stroke-width':TH},svg);
    if(pf<.9995)S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:PACE,'stroke-width':TH,opacity:.9,...capDash(cir,pf,TH),'data-axarc':`${cir},${pf},${TH}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
    S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:ringGrad(defs,KPI_RING[0]),'stroke-width':TH,'stroke-opacity':af>=1?1:ACH_OPACITY,...capDash(cir,af,TH),'data-axarc':`${cir},${af},${TH}`,transform:`rotate(-90 ${CC} ${CC})`},svg);
    /* 호를 따라 흐르는 글 — 집행 eq.GRP */
    const label=`${L('노출량','Delivered')} ${wrF(r.eq,1)}`,need=label.length*7.4+18,inArc=cir*af>need,id='wrdn'+(++WR_DNID);
    const d0=inArc?0:360*af;S('path',{id,d:arcPath(d0,d0+179),fill:'none'},defs);
    const t=S('text',{'font-size':inArc?12:11.5,'font-weight':800,fill:'#fff','dominant-baseline':'central'},svg);
    if(!inArc){t.setAttribute('stroke','rgba(38,52,68,.42)');t.setAttribute('stroke-width','2.4');t.setAttribute('paint-order','stroke');}
    const tp=document.createElementNS(NS,'textPath');tp.setAttribute('href','#'+id);tp.setAttribute('startOffset',inArc?'12':'10');tp.textContent=label;t.appendChild(tp);
    if(pf>.0005&&pf<.9995){const [dx,dy]=pxy(360*pf,rad+TH/2+4.5);S('circle',{cx:dx.toFixed(2),cy:dy.toFixed(2),r:3.1,fill:PACE,stroke:'var(--surface)','stroke-width':1.2,class:'pacedot'},svg);}
    const hit=S('circle',{cx:CC,cy:CC,r:rad,fill:'none',stroke:'transparent','stroke-width':TH,style:'pointer-events:stroke;cursor:default'},svg);
    hit.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(r.n)}</div>`
      +(r.bud>0?`<div class="r"><span class="l">${L('예산','Budget')}</span><b>${wrEok(r.bud)}</b></div>`:'')
      +(isFinite(r.tc)&&r.tc>0?`<div class="r"><span class="l">${L('목표 CPRP','Target CPRP')}</span><b>${wrF(r.tc*1000,0)}${L('원','')}</b></div>`:'')
      +`<div class="r"><span class="l">${L('Total 목표','Total target')}</span><b>${r.tg>0?wrF(r.tg,1):'–'}</b></div>`
      +`<div class="r"><span class="l">${L('노출량','Delivered')}</span><b>${wrF(r.eq,1)}</b></div>`
      +`<div class="r"><span class="l">${L('GRP 달성률','GRP achievement')}</span><b>${isFinite(r.rate)?(r.rate*100).toFixed(1)+'%':'–'}</b></div>`
      +`<div class="r"><span class="l">${L('목표 페이스','Target pace')}</span><b>${(pf*100).toFixed(1)}%</b></div>`
      +(r.span?`<div class="r"><span class="l">${L('집행 기간','Flight')}</span><b>${String(TV_WR.ym).slice(5)*1}/${r.span[0]}~${r.span[1]}</b></div>`:'')
      +(isFinite(r.rate)?`<div class="r"><span class="l">${L('페이스 대비','vs pace')}</span><b>${(r.rate-pf>=0?'+':'−')+Math.abs((r.rate-pf)*100).toFixed(1)}%p</b></div>`:'')));
    hit.addEventListener('mouseleave',hideTip);
    ring.appendChild(svg);
    const ctr=el('div','ctr',ring);ctr.innerHTML=`<div class="ctrbox"><span class="achk">${L('달성률','Achieved')}</span><b class="achv mono">${isFinite(r.rate)?(r.rate*100).toFixed(1)+'%':'–'}</b></div>`;
    const lg=el('div','dlgd',c);lg.innerHTML=`<span class="lg ach"><span class="sw"></span>${L('GRP 달성률','GRP achievement')}</span><span class="lg mute"><span class="sw"></span>${L('목표 페이스','Target pace')} ${(pf*100).toFixed(1)}%</span>`;});}
/* v185 — 달성 막대 + 카드 두 줄(지상파 · 케이블)을 그린다. 큐시트를 뒤늦게 읽었을 때도 이것만 다시 부른다 */
function wrEffPaint(){
  const h=$('wrDash');if(!h||!$('wrPace'))return;let F=null;try{F=wrEff();}catch(e){console.warn(e);}if(!F)return;
  $('wrPace').innerHTML=wrPaceHtml(F);
  try{wrKpiPaint(F);}catch(e){}
  wrEffCards($('wrEffT'),F,'지상파');wrEffCards($('wrEffC'),F,'케이블');
  wrPaceWire(h,F);
  /* 가로로 넘치면 양옆에 ‹ › 단추(디지털 KPI 카드 줄과 같은 것) */
  try{hpStrip('wrEffT');hpStrip('wrEffC');}catch(e){}}
var WR_DNID=0;
/* 막대 구간 글자 — 좁으면 % → 이름 순으로 지운다 · 날짜 칸 · 구간 툴팁 */
function wrPaceWire(h,F){
  const bar=h.querySelector('#wrPaceBar');if(!bar)return;
  const fit=()=>bar.querySelectorAll('.mstack>i').forEach(i=>{const w=i.getBoundingClientRect().width,nm=i.querySelector('.nm');i.classList.remove('nolb','nopc','nopad');
    const need=nm?nm.textContent.length*7.2+20:40;if(w<need){i.classList.add('nolb','nopad');}else if(w<need+6){i.classList.add('nopc');}});
  fit();setTimeout(fit,400);
  if(!WR_PACE_RO&&typeof ResizeObserver!=='undefined'){WR_PACE_RO=new ResizeObserver(()=>{const b=document.getElementById('wrPaceBar');if(b)b.querySelectorAll('.mstack>i').forEach(i=>{const w=i.getBoundingClientRect().width,nm=i.querySelector('.nm');i.classList.remove('nolb','nopc','nopad');const need=nm?nm.textContent.length*7.2+20:40;if(w<need)i.classList.add('nolb','nopad');});});}
  try{WR_PACE_RO&&WR_PACE_RO.observe(bar);}catch(e){}
  const segs=F.G.filter(x=>x.eq>0);
  bar.querySelectorAll('[data-wrseg]').forEach(i=>{const r=segs[+i.dataset.wrseg];if(!r)return;
    i.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(r.g)}</div>`
      +`<div class="r"><span class="l">${L('노출량','Delivered')}</span><b>${wrF(r.eq,1)}</b></div>`
      +`<div class="r"><span class="l">${L('Total 목표','Total target')}</span><b>${r.tg>0?wrF(r.tg,1):'–'}</b></div>`
      +`<div class="r"><span class="l">${L('GRP 달성률','GRP achievement')}</span><b>${isFinite(r.rate)?(r.rate*100).toFixed(1)+'%':'–'}</b></div>`
      +`<div class="r"><span class="l">${L('목표 페이스','Target pace')}</span><b>${isFinite(r.pace)?(r.pace*100).toFixed(1)+'%':'–'}</b></div>`
      +`<div class="r"><span class="l">${L('전체 목표 중','Of total target')}</span><b>${F.tot.tg>0?(r.eq/F.tot.tg*100).toFixed(1)+'%':'–'}</b></div>`));
    i.addEventListener('mouseleave',hideTip);});
  h.querySelectorAll('[data-wrd]').forEach(i=>{i.addEventListener('mousemove',e=>showTip(e.clientX,e.clientY,`<div class="t">${esc(i.dataset.wrd)}</div><div class="r"><span class="l">${L('리포트','Report')}</span><b>${i.classList.contains('on')?L('반영','included'):L('아직','not yet')}</b></div>`));i.addEventListener('mouseleave',hideTip);});}
var WR_PACE_RO=null;

/* ================================================================
   서머리 — 게이지 카드 · R3+ × eq.GRP 소재 지도 · 품목 세부 표 · 시청률 · 소재 타임라인
   (모든 그래프는 y축 값 표시 없음)
   ================================================================ */
function renderWrDash(){
  const h=wrHost('tab-tvdash','wrDash');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  ['wrMix','wrWeek'].forEach(id=>{const d=$(id);if(d)d.innerHTML='';});
  const W=TV_WR,T=W.tot||{},wt=W.wtot||{};
  /* 게이지 카드 */
  const bud=wrN(wt.bud)>0?wt.bud:wrN(T.bud),spent=wrN(wt.cost),eqT=wrEqTarget();
  const grpT=isFinite(eqT)&&wrN(T.eq)>0&&wrN(T.grp)>0?eqT*T.grp/T.eq:NaN;
  let F=null;try{F=wrEff();}catch(e){console.warn(e);}
  const kpis=`<div class="sec sm">${L('주요 지표','Key metrics')} <span class="note">${L('아래 그래프 = 주차별 누적 · 점선 = 목표 페이스(매체별 집행 기간 일할) · 페이스보다 앞서면 우세, 뒤지면 저조','chart = cumulative by week · dashed = target pace')}</span></div><div class="wrks" id="wrKs"></div>`;
  /* 소재 목록 (당월 값이 있는 것) */
  const pts=[];W.items.forEach(it=>it.cr.forEach(c=>{if(wrN(c.eq)>0&&isFinite(wrN(c.r3)))pts.push({it:it.n,c});}));
  if(!WR_SEL.item||!W.items.some(i=>i.n===WR_SEL.item)){const f=pts[0]||{it:W.items[0].n,c:W.items[0].cr[0]};WR_SEL={item:f.it,cr:f.c?f.c.n:''};}
  /* v184 — 캠페인 전체 GRP 달성 막대 + PP별 도넛 카드 (v189 — 주요 지표 아래로) */
  const eff=F?`<div class="sec gap sm">${L('캠페인 진행 현황','Campaign progress')} <span class="note">${L(`GRP 달성률 · 당월_광고비 기준별 효율${F.asof?' · '+F.asof.replace('~','')+' 기준':''}`,'GRP achievement · efficiency sheet')}</span></div>
      <div class="card"><div class="bd" id="wrPace"></div></div>
      <div class="sec gap sm">${L('PP별 GRP 달성 현황','GRP achievement by PP')} <span class="note">${L('Total 목표 = 예산 ÷ 목표 CPRP · 윗줄 지상파(Total → 채널) · 아랫줄 케이블(Total → PP) · 회색 고리 = 목표 페이스(매체별 집행 기간 일할) · 고리에 올리면 예산 · 목표 · 노출량','total target = budget ÷ target CPRP · top row terrestrial, bottom row cable · grey ring = prorated target pace · hover a ring for details')}</span></div>
      <div class="grid donuts wrefs" id="wrEffT"></div>
      <div class="grid donuts wrefs" id="wrEffC"></div>`:'';
  h.innerHTML=wrHead(L('TV 캠페인 퍼포먼스','TV campaign performance'),`${wrMonth()} · ${W.period||''}`)+kpis+eff
    +`<div class="sec gap sm">${L('소재별 효율','Efficiency by creative')} <span class="note">${L('가로 eq.GRP(15초 환산 노출량) · 세로 R3+(유효 도달률) · 점 크기 = 월 예산 · 점이나 카드를 누르면 그 품목의 채널별 그래프가 펼쳐집니다','x eq.GRP · y R3+ · dot size = budget · click a dot to open its channel view')}</span></div>
      <div class="card wrcard"><div class="wrsc" id="wrSc"></div></div>
      <div class="sec gap sm">${L('시청률','Ratings')} <span class="note">${L('타깃 평균(회색) 위에 코웨이(색)를 겹침 · 월 Total','Coway (color) over target average (gray) · month total')}</span></div>
      <div id="wrRt"></div>
      <div class="sec gap sm">${L('소재 타임라인','Creative timeline')} <span class="note">${L('카드 = 온에어 이후 누적 효율 · 배경 = 소재 영상 장면(없으면 먼슬리 리포트 스토리보드) · 온에어 날짜를 알 수 없는 소재는 뺌','Cards = cumulative since on-air · background = storyboard · creatives without an on-air date are left out')}</span></div>
      <div id="wrTl"></div>
      <div class="sec gap sm" id="wrWkSec">${L('주차별 데이터','Weekly data')} <span class="note">${L('당월_주별 · 집행금액 · eq.GRP · CPRP · 오른쪽 도넛 = 이번 달 누적 PP별 금액','Weekly sheet · spend · eq.GRP · CPRP · donut = month-to-date by PP')}</span></div>
      ${wrWkCard()}`;
  try{wrKpiPaint(F);}catch(e){console.warn(e);}
  if(F){try{wrEffPaint();}catch(e){console.warn(e);}}
  requestAnimationFrame(()=>h.querySelectorAll('.wrg').forEach(g=>g.classList.add('go')));
  wrScRender();wrRatings();wrTimeline();wrWeekChart();wrWkDonut();wrHsWire(h);wrNextLoad();
  if(WR_GOWK){WR_GOWK=0;setTimeout(()=>{const e=$('wrWkSec');if(e)window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY-110});},120);}
  return true;}

/* ---------- R3+ × eq.GRP 소재 지도 — 점마다 카드, 선은 서로 닿지 않게 ---------- */
/* v160 — 소재별 효율: 오른쪽 위 고르기 — 소재별(전체 · 한 품목만) / 품목별(품목 Total 로 묶음) */
var WR_SC={mode:'it',item:''};   // v161 — 기본은 품목별
function wrScRender(){
  const W=TV_WR;if(!W)return;const items=W.items.filter(it=>it.cr.some(c=>wrN(c.eq)>0));
  if(WR_SC.item&&!items.some(i=>i.n===WR_SC.item))WR_SC.item='';
  let pts=[];
  if(WR_SC.mode==='it')items.forEach(it=>{const sb=it.sub||{},n=it.cr.filter(c=>wrN(c.eq)>0).length;if(wrN(sb.eq)>0&&isFinite(wrN(sb.r3)))pts.push({it:it.n,c:{...sb,n:it.n},grp:1,nc:n});});
  else items.forEach(it=>{if(WR_SC.item&&it.n!==WR_SC.item)return;it.cr.forEach(c=>{if(wrN(c.eq)>0&&isFinite(wrN(c.r3)))pts.push({it:it.n,c});});});
  wrScatter(pts);
  const box=$('wrSc');if(!box)return;
  const tb=document.createElement('div');tb.className='wrsctb';
  tb.innerHTML=`<div class="seg wrseg" role="tablist"><button type="button" data-wrsm="cr" class="${WR_SC.mode==='cr'?'on':''}">${L('소재별','By creative')}</button><button type="button" data-wrsm="it" class="${WR_SC.mode==='it'?'on':''}">${L('품목별','By product')}</button></div>
    <label class="wrscsel${WR_SC.mode==='it'?' dis':''}"><select data-wrsi ${WR_SC.mode==='it'?'disabled':''} aria-label="${L('품목 고르기','Pick product')}"><option value="">${L('전체 품목','All products')}</option>${items.map(it=>`<option value="${esc(it.n)}"${WR_SC.item===it.n?' selected':''}>${esc(it.n)}</option>`).join('')}</select></label>`;
  box.prepend(tb);
  tb.querySelectorAll('[data-wrsm]').forEach(b=>b.onclick=()=>{WR_SC.mode=b.dataset.wrsm;wrScRender();});
  tb.querySelector('[data-wrsi]').onchange=e=>{WR_SC.item=e.target.value;wrScRender();};}
function wrScatter(pts){
  const box=$('wrSc');if(!box)return;
  if(!pts.length){box.innerHTML=`<div class="hint" style="padding:30px;text-align:center">${L('당월 소재 실적이 없습니다','No creative results this month')}</div>`;return;}
  /* v158 — 그래프를 영역 전체에 깔고, 카드는 점 바로 옆(오른쪽 아래 · 왼쪽 위)에 붙인다.
     붙일 자리가 다른 카드 · 점과 겹칠 때만 근처 빈 곳으로 옮기고 안내선으로 잇는다 */
  const Wd=Math.max(900,box.clientWidth||1100),Hd=Math.max(600,Math.min(760,Math.round(Wd*.54))),CW=176,CH=60;
  const x0=58,x1=Wd-24,y0=74,y1=Hd-44;   /* v161 — 위쪽 40px 는 고르기 단추 줄(그래프 판 안) */
  const mxE=Math.max(...pts.map(p=>p.c.eq)),mxR=Math.max(...pts.map(p=>p.c.r3))||10;
  /* 눈금 — 최대값에 바짝(너무 크게 올리지 않아 점 사이가 벌어지게) */
  const stepOf=v=>{const e=Math.pow(10,Math.floor(Math.log10(v/7))),f=v/7/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e;};
  const sxs=stepOf(mxE*1.04),XM=Math.ceil(mxE*1.04/sxs)*sxs,sys=stepOf(mxR*1.1),YM=Math.ceil(mxR*1.1/sys)*sys;
  const X=v=>x0+(v/XM)*(x1-x0),Y=v=>y1-(v/YM)*(y1-y0);
  const mxB=Math.max(...pts.map(p=>wrN(p.c.bud)).filter(isFinite),0);
  const rad=p=>{const b=wrN(p.c.bud);return mxB>0&&b>0?Math.max(5,22*Math.sqrt(b/mxB)):5;};
  pts.forEach((p,i)=>{p.i=i;p.x=X(p.c.eq);p.y=Y(p.c.r3);p.r=rad(p);});
  /* v161 — 카드는 오른쪽 아래(먼저) · 왼쪽 위 두 방향만. 안내선은 점에서 대각선으로 나간 뒤 한 번 꺾어 수평으로 카드까지
     (왼쪽 아래 · 오른쪽 위로 뻗는 선이 없어 덜 복잡하다) */
  const S2=Math.SQRT1_2;
  const cands=p=>{const o=[];
    [0,1].forEach(sd=>{const dir=sd?-1:1;
      [p.r+12,p.r+30,p.r+54,p.r+84,p.r+120,p.r+165].forEach((dd,di)=>[12,36,70,120,190,280].forEach((hh,hi)=>{
        const ex=p.x+dir*dd*S2,ey=p.y+dir*dd*S2,cx=sd?ex-hh-CW:ex+hh,cy=ey-CH/2;
        o.push({x:cx,y:cy,ex,ey,sd,att:di===0&&hi<=1?1:0,pen:(sd?6:0)+dd*.32+hh*.22});}));});
    /* 축 눈금 글자를 가리지 않게 — 그래프 판 안쪽만 */
    const ok=o.filter(c=>c.x>=x0+3&&c.y>=y0+2&&c.x+CW<=x1-2&&c.y+CH<=y1-3&&c.ey>=y0&&c.ey<=y1);
    if(ok.length)return ok;
    /* 가장자리 점 — 판 안으로 밀어 넣은 자리 하나라도 */
    return o.slice(0,12).map(c=>{const nx=Math.max(x0+3,Math.min(x1-2-CW,c.x)),ny=Math.max(y0+2,Math.min(y1-3-CH,c.y));return {...c,x:nx,y:ny,ey:Math.max(ny+6,Math.min(ny+CH-6,c.ey)),pen:c.pen+60};});};
  /* 카드끼리 18px 안으로 붙어도 겹친 것으로 본다(덜 빽빽하게) */
  const ovl=(a,b)=>Math.max(0,Math.min(a.x+CW,b.x+CW)-Math.max(a.x,b.x)+18)*Math.max(0,Math.min(a.y+CH,b.y+CH)-Math.max(a.y,b.y)+18);
  const cHit=(c,q)=>{const nx=Math.max(c.x,Math.min(q.x,c.x+CW)),ny=Math.max(c.y,Math.min(q.y,c.y+CH));return Math.hypot(nx-q.x,ny-q.y)<q.r+4;};
  /* 안내선 = 점 가장자리 → 꺾는 점 → 카드 가장자리(수평) */
  const lead=(p,c)=>{const dir=c.sd?-1:1;return [[p.x+dir*p.r*S2,p.y+dir*p.r*S2],[c.ex,c.ey],[c.sd?c.x+CW:c.x,c.ey]];};
  const segs=L=>[[L[0],L[1]],[L[1],L[2]]];
  const sx=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const d1=o(c,d,a),d2=o(c,d,b),d3=o(a,b,c),d4=o(a,b,d);return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));};
  const psd=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  const segRect=(a,b,c)=>{const ins=q=>q[0]>c.x+1&&q[0]<c.x+CW-1&&q[1]>c.y+1&&q[1]<c.y+CH-1;if(ins(a)||ins(b))return true;const R=[[c.x,c.y],[c.x+CW,c.y],[c.x+CW,c.y+CH],[c.x,c.y+CH]];for(let i=0;i<4;i++)if(sx(a,b,R[i],R[(i+1)%4]))return true;return false;};
  const C=pts.map(cands);
  const costOne=(i,c,sel)=>{let v=c.pen;const p=pts[i];
    pts.forEach((q,j)=>{if(j!==i&&cHit(c,q))v+=900;});
    const S1=segs(lead(p,c));
    sel.forEach((d,j)=>{if(j===i||!d)return;v+=ovl(c,d)*4;const S3=segs(lead(pts[j],d));
      S1.forEach(([a1,b1])=>{if(segRect(a1,b1,d))v+=500;S3.forEach(([a3,b3])=>{if(sx(a1,b1,a3,b3))v+=700;});});
      S3.forEach(([a3,b3])=>{if(segRect(a3,b3,c))v+=500;});});
    pts.forEach((q,j)=>{if(j===i)return;S1.forEach(([a1,b1])=>{if(psd([q.x,q.y],a1,b1)<q.r+3)v+=300;});});
    return v;};
  /* 큰 점(예산)부터 자리 잡고, 몇 번 돌며 서로 맞춘다 */
  const ord=[...pts].sort((a,b)=>b.r-a.r).map(p=>p.i);const sel=pts.map(()=>null);
  ord.forEach(i=>{let bc=null,bv=1e18;C[i].forEach(c=>{const v=costOne(i,c,sel);if(v<bv){bv=v;bc=c;}});sel[i]=bc;});
  for(let it=0;it<5;it++)ord.forEach(i=>{let bc=sel[i],bv=costOne(i,sel[i],sel);C[i].forEach(c=>{const v=costOne(i,c,sel);if(v<bv-.5){bv=v;bc=c;}});sel[i]=bc;});
  const tot=pts.reduce((s2,p,i)=>s2+costOne(i,sel[i],sel)-sel[i].pen,0);
  /* 격자 · 축 */
  let grid='';for(let v=0;v<=YM+1e-9;v+=sys){const yy=Y(v);grid+=`<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}" class="gl"/><text x="${x0-8}" y="${yy+4}" class="tk" text-anchor="end">${wrF(v,sys<1?1:0)}%</text>`;}
  for(let v=0;v<=XM+1e-9;v+=sxs){const xx=X(v);grid+=`<line x1="${xx}" x2="${xx}" y1="${y0}" y2="${y1}" class="gl"/><text x="${xx}" y="${y1+18}" class="tk" text-anchor="middle">${wrF(v)}</text>`;}
  const lines=pts.map((p,i)=>{const c=sel[i];const [a2,m2,b2]=lead(p,c),f=v=>v.toFixed(1);return `<path class="ln" data-i="${i}" d="M${f(a2[0])},${f(a2[1])} L${f(m2[0])},${f(m2[1])} L${f(b2[0])},${f(b2[1])}"/><circle class="lnd" data-i="${i}" cx="${f(b2[0])}" cy="${f(b2[1])}" r="2.2"/>`;}).join('');
  const dots=[...pts].sort((a,b)=>b.r-a.r).map(p=>{const r=p.r,i=p.i;
    return `<g class="pt${WR_SEL.item===p.it&&WR_SEL.cr===p.c.n?' sel':''}" data-i="${i}" style="--d:${i*60}ms">
      <circle r="${(r*2.4).toFixed(1)}" class="halo" fill="${WR_NEU}" cx="${p.x}" cy="${p.y}"/><circle r="${(r*2.4).toFixed(1)}" class="halo h2" fill="${WR_NEU}" cx="${p.x}" cy="${p.y}"/>
      <circle r="${r.toFixed(1)}" class="core" cx="${p.x}" cy="${p.y}"/><circle r="${(r+4).toFixed(1)}" class="ring" cx="${p.x}" cy="${p.y}"/></g>`;}).join('');
  const cards=pts.map((p,i)=>{const c=p.c,o=sel[i];
    return `<div class="wrscc v2${o.att?' att':''}${WR_SEL.item===p.it&&WR_SEL.cr===c.n?' sel':''}" data-i="${i}" data-it="${esc(p.it)}" data-cr="${esc(c.n)}" style="left:${o.x.toFixed(0)}px;top:${o.y.toFixed(0)}px;width:${CW}px;height:${CH}px;--d:${200+i*50}ms">
      <div class="t"><b>${esc(c.n)}</b><span>${p.grp?L(`소재 ${p.nc}개`,`${p.nc} creatives`):esc(p.it)}</span></div>
      <div class="big"><span><em>R3+</em><b>${wrF(c.r3,1)}<i>%</i></b></span><span><em>eq.GRP</em><b>${wrF(c.eq,1)}</b></span></div>
      <div class="m"><span>${L('월 예산','Budget')} ${wrEok(c.bud)}</span><span>GRP ${wrF(c.grp,1)}</span><span>R1+ ${wrF(c.r1,1)}%</span></div></div>`;}).join('');
  box.innerHTML=`<div class="wrsc-in v2" style="width:${Wd}px;height:${Hd}px">
    <svg width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}">${grid}
      <text x="${x0}" y="${y0-14}" class="ax">${L('유효 도달률 (R3+)','Effective reach (R3+)')}</text>
      <text x="${x1}" y="${y1+36}" class="ax" text-anchor="end">${L('15초 환산 노출량 (eq.GRP)','15s-equivalent GRP (eq.GRP)')}</text>
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" class="axl"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" class="axl"/>
      <g class="lns">${lines}</g>${dots}</svg>${cards}</div>`;
  box.dataset.cost=Math.round(tot)+'/moved'+sel.filter(c=>!c.att).length;
  const root=box.querySelector('.wrsc-in');
  const hot=i=>{root.classList.toggle('hot',i!=null);root.querySelectorAll('[data-i]').forEach(e=>e.classList.toggle('on',i!=null&&e.dataset.i===String(i)));};
  root.querySelectorAll('[data-i]').forEach(e=>{e.addEventListener('mouseenter',()=>hot(e.dataset.i));e.addEventListener('mouseleave',()=>hot(null));
    e.addEventListener('click',()=>{const p=pts[+e.dataset.i];WR_SEL={item:p.it,cr:p.grp?'':p.c.n};wrScSync();wrItemPop(p.it,p.x,p.y);});});}

/* ---------- v185 — 품목 팝업: 누른 점이 커지며 그래프를 덮는다(배경색이 바뀌고 오른쪽 끝에 × 단추).
   그 품목의 채널마다 점 하나 — 가로 eq.GRP · 세로 R3+ · 점 크기 = 예산(미디어믹스의 채널×품목 예산을 소재 비중으로 나눔) · 색 = 소재.
   모든 점을 감싸는 아주 옅은 큰 동그라미 = 품목 전체. (예전의 '품목 세부' 표를 대신한다) ---------- */
const WR_CRC=['#2f7fd0','#e08a2e','#2f9f7d','#9363c4','#cf5a7c','#6f7b88'];
function wrPopData(itn){
  const W=TV_WR,ent=(W.dorder||[]).find(e=>e.n===itn),it=(W.items||[]).find(i=>i.n===itn)||{cr:[]};
  const X=wrCueX(),pts=[],crs=ent?ent.cr.filter(c=>c.n!=='계'&&W.det&&W.det[c.k]):[];
  const bOf=c=>{const m=it.cr.find(x=>x.n===c.n||x.n===c.sn);return m&&wrN(m.bud)>0?m.bud:0;},bs=crs.reduce((s,c)=>s+bOf(c),0);
  crs.forEach((c,ci)=>{const sh=bs>0?bOf(c)/bs:1/crs.length;
    (W.det[c.k].cells||[]).forEach(x=>{const ch=(W.chs||[])[x[0]];if(!ch||!(wrN(x[3])>0))return;
      const cb=X?X.bud(itn,ch.ch):NaN;
      pts.push({ci,cr:c.n,ch:ch.ch,pp:ch.pp||ch.ch,g:ch.g,cnt:x[1],grp:x[2],eq:x[3],r1:x[4],r3:wrN(x[5])||0,bud:isFinite(cb)?cb*sh:NaN});});});
  return {it,crs,pts,per:X?X.item(itn):null,hasBud:pts.some(p=>p.bud>0)};}
function wrPopClose(now){
  const box=$('wrSc');if(!box)return;const pop=box.querySelector('.wrpop');box.classList.remove('pop');
  if(WR_POPK){document.removeEventListener('keydown',WR_POPK);WR_POPK=null;}
  if(!pop)return;hideTip();if(now){pop.remove();return;}
  pop.classList.remove('open');setTimeout(()=>pop.remove(),480);}
var WR_POPK=null;
function wrItemPop(itn,ox,oy){
  const box=$('wrSc'),root=box&&box.querySelector('.wrsc-in');if(!root)return;
  wrPopClose(true);
  const D=wrPopData(itn),sb=D.it.sub||{},col=wrCueCol(itn),Wd=root.offsetWidth,Hd=root.offsetHeight,f=v=>v.toFixed(1);
  const pop=document.createElement('div');pop.className='wrpop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',itn);
  pop.style.cssText=`--c:${col};--ox:${Math.round(ox)}px;--oy:${Math.round(oy)}px`;
  const [,mm]=String(TV_WR.ym).split('-').map(Number),per=D.per&&D.per.cr.length?` · ${L('집행 기간','Flight')} ${mm}/${D.per.s}~${D.per.e}`:'';
  const st=[['eq.GRP',wrF(sb.eq,1)],['R3+',isFinite(wrN(sb.r3))?wrF(sb.r3,1)+'%':'–'],['R1+',isFinite(wrN(sb.r1))?wrF(sb.r1,1)+'%':'–'],['GRP',wrF(sb.grp,1)],[L('월 예산','Budget'),wrEok(sb.bud)]];
  const lg=D.crs.map((c,i)=>{const m=D.it.cr.find(x=>x.n===c.n||x.n===c.sn)||{};
    return `<button type="button" class="lg" data-ci="${i}"><i style="background:${WR_CRC[i%WR_CRC.length]}"></i>${esc(c.n)}<em>eq.GRP ${wrF(m.eq,1)} · R3+ ${isFinite(wrN(m.r3))?wrF(m.r3,1)+'%':'–'}</em></button>`;}).join('');
  let svg='';
  const x0=64,x1=Wd-34,y0=132,y1=Hd-46,P=D.pts;
  if(P.length){
    const mxE=Math.max(...P.map(p=>p.eq)),mxR=Math.max(...P.map(p=>p.r3),.5);
    const stepOf=v=>{const e=Math.pow(10,Math.floor(Math.log10(v/6))),q=v/6/e;return (q<=1?1:q<=2?2:q<=2.5?2.5:q<=5?5:10)*e;};
    const sxs=stepOf(mxE*1.12),XM=Math.ceil(mxE*1.12/sxs)*sxs,sys=stepOf(mxR*1.18),YM=Math.ceil(mxR*1.18/sys)*sys;
    const X=v=>x0+(v/XM)*(x1-x0),Y=v=>y1-(v/YM)*(y1-y0);
    const mxB=Math.max(...P.map(p=>p.bud).filter(isFinite),0);
    P.forEach((p,i)=>{p.i=i;p.x=X(p.eq);p.y=Y(p.r3);p.r=!D.hasBud?8:p.bud>0?Math.max(5.5,28*Math.sqrt(p.bud/mxB)):4;});
    let grid='';const dy=sys<1?(sys<.1?2:1):0,dx=sxs<1?1:0;
    for(let v=0;v<=YM+1e-9;v+=sys){const yy=Y(v);grid+=`<line x1="${x0}" x2="${x1}" y1="${f(yy)}" y2="${f(yy)}" class="gl"/><text x="${x0-8}" y="${f(yy+4)}" class="tk" text-anchor="end">${wrF(v,dy)}%</text>`;}
    for(let v=0;v<=XM+1e-9;v+=sxs){const xx=X(v);grid+=`<line x1="${f(xx)}" x2="${f(xx)}" y1="${y0}" y2="${y1}" class="gl"/><text x="${f(xx)}" y="${y1+18}" class="tk" text-anchor="middle">${wrF(v,dx)}</text>`;}
    /* 품목 전체 — 모든 점을 감싸는 옅은 동그라미 */
    const bx0=Math.min(...P.map(p=>p.x-p.r)),bx1=Math.max(...P.map(p=>p.x+p.r)),by0=Math.min(...P.map(p=>p.y-p.r)),by1=Math.max(...P.map(p=>p.y+p.r));
    const ecx=(bx0+bx1)/2,ecy=(by0+by1)/2,er=Math.max(...P.map(p=>Math.hypot(p.x-ecx,p.y-ecy)+p.r))+22;
    const cap=`${itn} ${L('전체','total')} · eq.GRP ${wrF(sb.eq,1)} · R3+ ${isFinite(wrN(sb.r3))?wrF(sb.r3,1)+'%':'–'}`;
    const capY=Math.max(y0+16,Math.min(y1-10,ecy-er+20));
    const all=`<circle class="all" cx="${f(ecx)}" cy="${f(ecy)}" r="${f(er)}"/><circle class="all2" cx="${f(ecx)}" cy="${f(ecy)}" r="${f(er)}"/>
      <text class="allt" x="${f(Math.max(x0+90,Math.min(x1-90,ecx)))}" y="${f(capY)}" text-anchor="middle">${esc(cap)}</text>`;
    /* 채널 이름 — 큰 점부터, 서로 · 점과 겹치지 않는 자리에만 */
    const ord=[...P].sort((a,b)=>b.r-a.r||b.eq-a.eq),placed=[];let labs='';
    ord.slice(0,26).forEach(p=>{const w=String(p.ch).length*6.6+8;
      const tries=[[p.x+p.r+5,p.y+4,'start'],[p.x-p.r-5,p.y+4,'end'],[p.x,p.y-p.r-6,'middle'],[p.x,p.y+p.r+13,'middle']];
      for(const [tx,ty,an] of tries){const lx=an==='start'?tx:an==='end'?tx-w:tx-w/2,box2={x:lx,y:ty-11,w,h:14};
        if(box2.x<x0+2||box2.x+w>x1+26||box2.y<y0-4||box2.y+14>y1+2)continue;
        if(placed.some(q=>box2.x<q.x+q.w+3&&q.x<box2.x+w+3&&box2.y<q.y+q.h+1&&q.y<box2.y+15))continue;
        if(P.some(q=>q!==p&&q.x+q.r>box2.x-1&&q.x-q.r<box2.x+w+1&&q.y+q.r>box2.y&&q.y-q.r<box2.y+14))continue;
        placed.push(box2);labs+=`<text class="nm" data-i="${p.i}" x="${f(tx)}" y="${f(ty)}" text-anchor="${an}">${esc(p.ch)}</text>`;break;}});
    const dots=ord.map(p=>`<g class="pd" data-i="${p.i}" data-ci="${p.ci}" style="--d:${260+p.i*14}ms"><circle class="core" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="${WR_CRC[p.ci%WR_CRC.length]}"/><circle class="hit" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(Math.max(p.r,9))}"/></g>`).join('');
    svg=`<svg width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}"><defs><clipPath id="wrpopc"><rect x="0" y="${y0-34}" width="${Wd}" height="${Hd-y0+34}"/></clipPath></defs>
      <g clip-path="url(#wrpopc)">${all}</g>${grid}
      <text x="${x0}" y="${y0-14}" class="ax">${L('유효 도달률 (R3+)','Effective reach (R3+)')}</text>
      <text x="${x1}" y="${y1+36}" class="ax" text-anchor="end">${L('15초 환산 노출량 (eq.GRP)','15s-equivalent GRP (eq.GRP)')}</text>
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" class="axl"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" class="axl"/>
      ${dots}<g class="nms">${labs}</g></svg>`;
  }else svg=`<div class="none">${L('이 품목은 아직 채널별 실적이 없습니다','No channel results for this product yet')}</div>`;
  pop.innerHTML=`<div class="hd"><i class="sw"></i><div class="ttl"><b>${esc(itn)}</b><span>${L(`채널별 R3+ × eq.GRP · 점 = 채널 · 점 크기 = ${D.hasBud?'예산':'같은 크기(예산 자료 없음)'} · 색 = 소재${per}`,'R3+ × eq.GRP by channel · dot = channel · size = budget · colour = creative')}</span></div>
      <div class="st">${st.map(x=>`<span><em>${x[0]}</em><b>${x[1]}</b></span>`).join('')}</div>
      <button type="button" class="x" aria-label="${L('닫기','Close')}" title="${L('닫기 (Esc)','Close (Esc)')}"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
    <div class="lgs">${lg}<span class="lg tot"><i></i>${L('옅은 큰 동그라미 = 품목 전체','faint large circle = product total')}</span></div>${svg}`;
  root.appendChild(pop);box.classList.add('pop');
  requestAnimationFrame(()=>requestAnimationFrame(()=>pop.classList.add('open')));
  pop.querySelector('.x').onclick=()=>wrPopClose();
  WR_POPK=e=>{if(e.key==='Escape')wrPopClose();};document.addEventListener('keydown',WR_POPK);
  const hot=(i,ci)=>{pop.classList.toggle('hot',i!=null||ci!=null);pop.querySelectorAll('.pd,.nm').forEach(e=>{const p=P[+e.dataset.i];e.classList.toggle('on',i!=null?+e.dataset.i===i:ci!=null&&p&&p.ci===ci);});
    pop.querySelectorAll('.lg[data-ci]').forEach(e=>e.classList.toggle('on',ci!=null?+e.dataset.ci===ci:i!=null&&P[i].ci===+e.dataset.ci));};
  pop.querySelectorAll('.pd').forEach(g=>{const p=P[+g.dataset.i];
    g.addEventListener('mousemove',e=>{hot(p.i,null);showTip(e.clientX,e.clientY,`<div class="t">${esc(p.ch)} <span style="font-weight:600;opacity:.6">· ${esc(p.g==='지상파'?L('지상파','Terrestrial'):p.pp)}</span></div>
      <div class="r"><span class="l">${L('소재','Creative')}</span><b><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${WR_CRC[p.ci%WR_CRC.length]};margin-right:5px"></i>${esc(p.cr)}</b></div>
      ${isFinite(p.bud)?`<div class="r"><span class="l">${L('예산','Budget')}</span><b>${p.bud>0?wrEok(p.bud):L('없음(보너스)','none (bonus)')}</b></div>`:''}
      <div class="r hi"><span class="l">eq.GRP</span><b>${wrF(p.eq,1)}</b></div><div class="r hi"><span class="l">R3+</span><b>${wrF(p.r3,1)}%</b></div>
      <div class="r"><span class="l">R1+</span><b>${wrF(p.r1,1)}%</b></div><div class="r"><span class="l">GRP</span><b>${wrF(p.grp,1)}</b></div>
      <div class="r"><span class="l">${L('횟수','Spots')}</span><b>${wrF(p.cnt)}</b></div>`);});
    g.addEventListener('mouseleave',()=>{hot(null,null);hideTip();});});
  pop.querySelectorAll('.lg[data-ci]').forEach(b=>{b.addEventListener('mouseenter',()=>hot(null,+b.dataset.ci));b.addEventListener('mouseleave',()=>hot(null,null));});}
function wrScSync(){const root=document.querySelector('#wrSc .wrsc-in');if(!root)return;
  root.querySelectorAll('.wrscc').forEach(c=>{const on=c.dataset.it===WR_SEL.item&&c.dataset.cr===WR_SEL.cr;c.classList.toggle('sel',on);root.querySelectorAll(`g.pt[data-i="${c.dataset.i}"]`).forEach(g=>g.classList.toggle('sel',on));});}

/* ---------- 시청률 — 지상파 · 종편 · 케이블, 무채 막대(타깃 평균) 위에 유채 막대(코웨이) 겹침 ---------- */
const WR_CW='#1d6fc2';
function wrRatings(){
  const box=$('wrRt');if(!box)return;const R=TV_WR.rt||{};
  const groups=[['지상파',L('지상파','Terrestrial')],['종편',L('종편','General programming')],['케이블',L('케이블','Cable')]].filter(([k])=>(R[k]||[]).length);
  if(!groups.length){box.innerHTML=`<div class="card wrcard hint">${L('시청률 시트가 없습니다','No ratings sheet')}</div>`;return;}
  /* v157 — 막대 위 숫자 = 엑셀 그대로 시청률(0.000) · 코웨이는 진하게, 타깃 평균은 작고 옅은 회색 · 묶음 계는 더 짙은 색 */
  const f3=v=>isFinite(v)?(+v).toFixed(3):'–';
  /* v162 — 묶음 계(Total)는 막대로 그리지 않고 칸 아래 글로 */
  /* v169 — 막대 칸 너비를 화면 폭에 맞춘다(케이블이 오른쪽으로 넘치지 않게) · 채널이 적은 묶음은 Total 글이 들어갈 최소 폭 */
  const nOf=k=>R[k].filter(r=>!/계|total/i.test(r.ch)).length,MINW=118,CP=22,GAP=14;
  const Wc=(box.clientWidth||1100)-GAP*(groups.length-1)-CP*groups.length;
  let BW=74;for(let t=0;t<3;t++){let fix=0,n=0;groups.forEach(([k])=>{const c=nOf(k);if(c*BW+16<MINW)fix+=MINW;else{n+=c;fix+=16;}});BW=n?Math.max(52,Math.min(110,(Wc-fix)/n)):74;}
  const nmFit=(t,mw)=>{const cw=ch=>ch.charCodeAt(0)>255?10.6:6.5;let w=0;for(const ch of t)w+=cw(ch);if(w<=mw)return t;let o='',x=6;for(const ch of t){x+=cw(ch);if(x>mw)break;o+=ch;}return o+'…';};
  const chart=([k,lab])=>{const all=R[k],tot=all.find(r=>/계|total/i.test(r.ch)),rows=all.filter(r=>r!==tot);const H=226,PB=46,PT=34,w=Math.max(MINW,Math.floor(rows.length*BW+16)),x0=(w-rows.length*BW)/2;
    /* 묶음마다 제 눈금 — 케이블처럼 값이 작은 묶음도 차이가 보이게 */
    const mx=Math.max(...rows.map(r=>Math.max(wrN(r.cw)||0,wrN(r.avg)||0)))*1.12||1;
    const bars=rows.map((r,i)=>{const cx=x0+i*BW+BW/2,isT=/계/.test(r.ch),a=wrN(r.avg)||0,c=wrN(r.cw)||0,ha=a/mx*(H-PB-PT),hc=c/mx*(H-PB-PT);
      const ya=H-PB-ha,yc=H-PB-hc,cTall=hc>=ha;
      /* 라벨 — 높은 막대는 제 막대 위 가운데, 낮은 막대는 옆으로 비켜(겹치지 않게) */
      const lc=cTall?`<text x="${cx+7}" y="${yc-6}" class="iv" text-anchor="middle">${f3(c)}</text>`:`<text x="${cx+8}" y="${yc-5}" class="iv" text-anchor="start">${f3(c)}</text>`;
      const la=cTall?`<text x="${cx-8}" y="${ya-4}" class="ia" text-anchor="end">${f3(a)}</text>`:`<text x="${cx-7}" y="${ya-5}" class="ia" text-anchor="middle">${f3(a)}</text>`;
      return `<g class="rb${isT?' tot':''}" data-ch="${esc(r.ch)}" data-a="${a}" data-c="${c}" style="--d:${i*40}ms">
        <rect class="av" x="${cx-19}" y="${ya}" width="24" height="${ha}" rx="3"/>
        <rect class="cw" x="${cx-5}" y="${yc}" width="24" height="${hc}" rx="3"/>
        ${a>0?la:''}${c>0?lc:''}
        <text x="${cx}" y="${H-PB+15}" class="nm" text-anchor="middle">${esc(nmFit(r.ch,BW-4))}</text></g>`;}).join('');
    const ta=tot?wrN(tot.avg):NaN,tc=tot?wrN(tot.cw):NaN;
    const totTx=tot?`<div class="tt"><span class="k">${lab} Total</span><span>${L('코웨이','Coway')} <b class="c">${f3(tc)}%</b></span><span>${L('타깃 평균','Target avg')} <b>${f3(ta)}%</b></span>${ta>0&&isFinite(tc)?`<span>${L('지수','Index')} <b>${Math.round(tc/ta*100)}</b></span>`:''}</div>`:'';
    return `<div class="wrrt" style="flex:${rows.length*BW>=MINW?rows.length:0} 0 ${w+CP}px"><div class="h">${lab}</div><svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">
      <line x1="0" x2="${w}" y1="${H-PB}" y2="${H-PB}" class="axl"/>${bars}</svg>${totTx}</div>`;};
  box.innerHTML=`<div class="wrleg top"><span><i class="cw"></i>${L('코웨이','Coway')}</span><span><i class="av"></i>${L('타깃 평균','Target avg')}</span>
      <span class="n">${L('막대 위 숫자 = 시청률(%) · 엑셀 그대로','Number = rating (%) as in Excel')}</span></div>`
    +wrHs(`<div class="wrrts">${groups.map(chart).join('')}</div>`);
  box.querySelectorAll('g.rb').forEach(g=>{g.onmousemove=e=>{const a=+g.dataset.a,c=+g.dataset.c;
    showTip(e.clientX,e.clientY,`<div class="t">${esc(g.dataset.ch)}</div><div class="r"><span class="l">${L('코웨이','Coway')}</span><b>${c.toFixed(3)}%</b></div>
      <div class="r"><span class="l">${L('타깃 평균','Target avg')}</span><b>${a.toFixed(3)}%</b></div><div class="r hi"><span class="l">${L('지수','Index')}</span><b>${a>0?Math.round(c/a*100):'–'}</b></div>`);};g.onmouseleave=hideTip;});}

/* ---------- 소재 타임라인 ---------- */
/* v157 — 카드 배경: 먼슬리 리포트 PDF 의 코웨이 TVC 스토리보드 마지막 장면(assets/cr/{id}_k.jpg) · 품목|소재 → 그림 */
const WR_CRIMG={'아이콘프로|혁신':'6820104d94','아이콘프로|마이워터':'df03f73c74','아이콘프로|종합':'6e77872e62','히티브|눈사람_30초(NA)':'2caa47bf95',
  '비데|위생':'684461aa5d','비데|뮤지컬 예고편':'63e5861535','스마트매트리스|스마트 경도 조절':'c7c0ebb7ad','스마트매트리스|듀얼 경도 조절':'3398d694ee',
  '트리플체어2|서재편':'d1888fefd3','마사지셋/코어셋|마사지셋_기능편':'bef70ecb56','마사지셋/코어셋|마사지셋_디자인편':'883a285f5e','마사지셋/코어셋|코어셋_효능편':'ee3f3548bd',
  '아이콘3|Song편':'bf85cbaf7b','아이콘3|미니미요원편':'c2f60aa16f','노블청정기|라인업':'5e66546471','노블청정기|40평 출시':'f12532f2fe',
  '아이콘얼음정수기|스탠다드 소비자':'b2a78b9213','아이콘얼음정수기|미니 소비자':'7fef7e7c7c','아이콘얼음정수기|라인업 소비자':'40100454f5',
  '아이콘얼음정수기|라인업 소비자 (26년)':'1fbf1d7d6b','아이콘얼음정수기|미니 캐릭터':'e0cf37f75d','아이콘얼음정수기|라인업 캐릭터':'e220da2c08',
  '페블체어2|퍼포먼스':'0a98222e5c','페블체어2|공간':'a72e8ef4bc','코웨이페스타|코웨이페스타':'448718d163','카페얼음정수기|제품':'03a5f17ec7',
  '음식물처리기|관리':'eb114aa87a','안마매트리스|혁신편':'77869d2cd6','안마매트리스|CEO':'9b65d62606'};
/* 그림이 실린 먼슬리 리포트 달(2026년) — 전체 캠페인 소재 콜라주에서 어느 달 캠페인 소재인지 */
const WR_CRMO={"6820104d94": [1], "df03f73c74": [1], "2caa47bf95": [1, 2], "684461aa5d": [1, 2], "c7c0ebb7ad": [1, 2, 3, 4, 5, 6, 7, 8, 9], "3398d694ee": [1, 2, 3], "bef70ecb56": [1, 2], "883a285f5e": [1], "ee3f3548bd": [1, 2], "d1888fefd3": [1], "6e77872e62": [2], "bf85cbaf7b": [2, 3, 4, 5, 7, 8, 9], "5e66546471": [2, 3, 4], "f12532f2fe": [2, 3, 4], "448718d163": [3, 4], "c2f60aa16f": [3, 4, 9], "7fef7e7c7c": [3, 4, 5, 6], "b2a78b9213": [3], "a72e8ef4bc": [3], "0a98222e5c": [3, 4, 5, 6, 7, 9], "40100454f5": [4, 5, 6], "395f5351b2": [6], "8fdf8c78b8": [6], "63e5861535": [6, 7], "e220da2c08": [7, 8], "e0cf37f75d": [7, 8, 9], "1fbf1d7d6b": [7, 8, 9], "03a5f17ec7": [9], "77869d2cd6": [9], "9b65d62606": [9], "eb114aa87a": [9]};
const wrCrImg=(it,cr)=>{const id=WR_CRIMG[it+'|'+cr];return id?`assets/cr/${id}_k.jpg`:'';};
function wrTimeline(){
  const box=$('wrTl');if(!box)return;
  const list=[];TV_WR.items.forEach(it=>it.cr.forEach(c=>{if(/^\d{4}-\d\d-\d\d$/.test(c.on||''))list.push({it:it.n,c});}));
  list.sort((a,b)=>a.c.on.localeCompare(b.c.on)||a.it.localeCompare(b.it,'ko'));
  if(!list.length){box.innerHTML=`<div class="card wrcard hint">${L('온에어 날짜가 있는 소재가 없습니다','No creative with an on-air date')}</div>`;return;}
  /* 실제 날짜 간격을 반영(가까운 소재는 최소 간격만큼은 벌린다) — 간격 = 최소 간격 + √(벌어진 날 수) */
  const day=d=>Date.parse(d+'T00:00:00')/864e5;
  const MIN=118,gaps=list.map((x,i)=>i?Math.sqrt(Math.max(0,day(x.c.on)-day(list[i-1].c.on))):0),gs=gaps.reduce((a,b)=>a+b,0)||1;
  const room=Math.max(0,Math.max(list.length*185,1100)-80-MIN*(list.length-1)),xs=[];
  list.forEach((x,i)=>xs.push(i?xs[i-1]+MIN+gaps[i]/gs*room:40));
  const w=xs[xs.length-1]+240;
  let lastY='';
  const nodes=list.map((x,i)=>{const up=i%2===0,c=x.c,cc=c.c||{},y=c.on.slice(0,4),mo=+c.on.slice(5,7),showY=y!==lastY;lastY=y;const img=wrCrImg(x.it,c.n);
    return `<div class="tn ${up?'up':'dn'}" style="left:${xs[i].toFixed(0)}px;--c:${WR_NEU2};--d:${i*70}ms">
      <div class="stem"></div><div class="dot"><span>${L(mo+'월','M'+mo)}</span></div>${showY?`<div class="yr">${y}</div>`:''}
      <div class="dt">${wrD(c.on)}</div>
      <div class="cd${img?' im':''}" data-i="${i}" role="button" tabindex="0">${img?`<div class="st"><img src="${img}" alt="" loading="lazy" decoding="async"></div>`:''}<div class="t">${esc(x.it)}</div><b>${esc(c.n)}</b>
        <div class="kv"><span>${L('누적','Cum.')} GRP</span><em>${wrF(cc.grp,1)}</em><span>${L('누적','Cum.')} eq.GRP</span><em>${wrF(cc.eq,1)}</em><span>${L('누적','Cum.')} R1+</span><em>${wrF(cc.r1,1)}%</em><span>${L('누적','Cum.')} R3+</span><em>${wrF(cc.r3,1)}%</em></div></div></div>`;}).join('');
  box.innerHTML=wrHs(`<div class="wrtl" style="width:${w}px"><div class="axis"></div>${nodes}</div>`,'tl');
  box.querySelectorAll('.cd[data-i]').forEach(el=>{const go=()=>wrCrPop(list[+el.dataset.i]);el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};});
  /* 처음엔 가장 최신 소재(오른쪽 끝)가 보이게 */
  const sc=box.querySelector('.wrhs-in');if(sc){const go=()=>{sc.scrollLeft=sc.scrollWidth;};go();requestAnimationFrame(go);setTimeout(go,150);}}

/* v169 — 소재 카드를 누르면 자세히: 스토리보드 · 온에어 · 이번 달 / 누적 효율 · 달별 흐름 */
function wrCrPop(x){
  if(!x)return;const W=TV_WR,c=x.c,cc=c.c||{},it=W.items.find(i=>i.n===x.it)||{},sub=it.sub||{};
  const id=WR_CRIMG[x.it+'|'+c.n],day=d=>Date.parse(d+'T00:00:00')/864e5;
  const end=(W.weeks&&W.weeks.length?W.weeks[W.weeks.length-1].e:'')||new Date().toISOString().slice(0,10),days=Math.max(0,Math.round(day(end)-day(c.on))+1);
  const pct=(a,b)=>wrN(a)>0&&wrN(b)>0?Math.round(a/b*100)+'%':'–';
  const row=(l,a,b,u)=>`<tr><th>${l}</th><td>${a}${u||''}</td><td>${b}${u||''}</td></tr>`;
  /* 달별 흐름 — 먼슬리 리포트 소재 아카이브(있을 때) */
  let mo=[];try{const A=((RPT_DOC||{}).arch||[]).find(a=>a.n===x.it),r=A&&(A.cr||[]).find(k=>k.n===c.n);if(r&&Array.isArray(r.mo))mo=r.mo.filter(m=>wrN(m[2])>0||wrN(m[1])>0);}catch(e){}
  const mx=Math.max(1,...mo.map(m=>wrN(m[2])||0));
  const body=`<div class="wrcp">
    ${id?`<div class="sb"><img src="assets/cr/${id}.jpg" alt="" onerror="this.onerror=null;this.src='assets/cr/${id}_k.jpg'"></div>`:''}
    <div class="inf">
      <div class="chips"><span><i>${L('품목','Product')}</i>${esc(x.it)}</span><span><i>${L('온에어','On air')}</i>${wrD(c.on)}</span><span><i>${L('온에어 후','Since on air')}</i>${wrF(days)}${L('일','d')}</span>${wrN(c.bud)>0?`<span><i>${wrMonth()} ${L('예산','budget')}</i>${wrEok(c.bud)}</span>`:''}</div>
      <table class="kt"><thead><tr><th></th><th>${wrMonth()}</th><th>${L('온에어 후 누적','Cumulative')}</th></tr></thead><tbody>
        ${row('GRP',wrF(c.grp,1),wrF(cc.grp,1))}${row('eq.GRP',wrF(c.eq,1),wrF(cc.eq,1))}${row('Reach 1+',wrF(c.r1,1),wrF(cc.r1,1),'%')}${row('Reach 3+',wrF(c.r3,1),wrF(cc.r3,1),'%')}
      </tbody></table>
      <div class="sh"><span>${L('품목 안 비중','Share in product')} <em>(eq.GRP)</em></span><b>${wrMonth()} ${pct(c.eq,sub.eq)}</b><b>${L('누적','Cum.')} ${pct(cc.eq,(sub.c||{}).eq)}</b></div>
      ${mo.length?`<div class="mh">${L('달별 eq.GRP','Monthly eq.GRP')}</div><div class="mb">${mo.map(m=>`<div class="m"><em>${wrF(m[2],0)}</em><i style="height:${Math.max(3,Math.round((wrN(m[2])||0)/mx*54))}px"></i><span>${L(m[0]+'월','M'+m[0])}</span></div>`).join('')}</div>`:''}
    </div></div>`;
  openModal(`${x.it} · ${c.n}`,body,'',{w:id?860:520});}

/* ================================================================
   주차별 퍼포먼스 — PP 별 누적 막대(지상파 · 케이블 톤) 20개 · 지난 캠페인은 흐리게 · 위에 CPRP 꺾은선
   ================================================================ */
const wrPPKey=c=>(c.g==='지상파'?'지상파|':'케이블|')+(c.pp||c.ch);
function wrWeekSeries(){
  const W=TV_WR,out=[];
  (W.hist||[]).forEach(hm=>(hm.weeks||[]).forEach((wk,i)=>{const pp={};Object.entries(hm.pp||{}).forEach(([k,a])=>{if(a[i])pp[k]=a[i];});
    const t=hm.tot&&hm.tot.w&&hm.tot.w[i]?hm.tot.w[i]:null;out.push({ym:hm.ym,...wk,pp,eq:t?t[0]:Object.values(pp).reduce((s,x)=>s+(x[0]||0),0),cost:t?t[1]:Object.values(pp).reduce((s,x)=>s+(x[1]||0),0),past:true});}));
  (W.weeks||[]).forEach((wk,i)=>{const pp={};(W.chs||[]).forEach(c=>{const x=c.w&&c.w[i];if(!x)return;const k=wrPPKey(c),o=pp[k]||(pp[k]=[0,0]);o[0]+=wrN(x[0])||0;o[1]+=wrN(x[1])||0;});
    const t=W.wtot&&W.wtot.w&&W.wtot.w[i];out.push({ym:W.ym,...wk,pp,eq:t?t[0]:Object.values(pp).reduce((s,x)=>s+x[0],0),cost:t?t[1]:Object.values(pp).reduce((s,x)=>s+x[1],0),past:false});});
  /* v185 — 가장 오래된 달 하나를 뺀다(그 자리에 누적 PP 도넛) */
  let a=out.slice(-20);const yms=[...new Set(a.map(b=>b.ym))];if(yms.length>=3)a=a.filter(b=>b.ym!==yms[0]);
  return a.concat(wrNextWeeks());}
function wrWkCard(){return `<div class="card wrcard"><div class="wrwk-top"><div class="rplg rpisolg wkleg" id="wrWkLeg"></div></div>
    <div class="wrwk-row"><div class="wrwk" id="wrWk"></div><div class="wrwkdn" id="wrWkDn"></div></div></div>`;}
/* v185 — 이번 달 누적 PP별 금액 도넛(집행금액 · 예산 고르기). 지상파는 채널(파랑 계열) · 케이블은 PP(회색 계열) */
var WR_WKDN='cost';
function wrWkDonut(){
  const box=$('wrWkDn');if(!box)return;const W=TV_WR,m={};
  (W.chs||[]).forEach(c=>{const k=wrPPKey(c),o=m[k]||(m[k]={k,g:c.g==='지상파'?'지상파':'케이블',n:c.g==='지상파'?(c.ch||c.pp):(c.pp||c.ch),cost:0,bud:0,eq:0});o.cost+=wrN(c.cost)||0;o.bud+=wrN(c.bud)||0;o.eq+=wrN(c.eq)||0;});
  const all=Object.values(m),has=k=>all.some(o=>o[k]>0);
  if(!has('cost')&&!has('bud')){box.innerHTML='';box.classList.add('hidden');return;}box.classList.remove('hidden');
  if(!has(WR_WKDN))WR_WKDN=has('cost')?'cost':'bud';const K=WR_WKDN;
  const rows=all.filter(o=>o[K]>0).sort((a,b)=>(a.g===b.g?0:a.g==='지상파'?-1:1)||b[K]-a[K]),T=rows.reduce((s,o)=>s+o[K],0)||1;
  let it=0,ic=0;rows.forEach(o=>{o.col=o.g==='지상파'?WR_TONE.t[Math.min(it++,WR_TONE.t.length-1)]:WR_TONE.c[Math.min(ic++,WR_TONE.c.length-1)];});
  const S=236,C=S/2,R=104,r0=64,gap=.012,f=v=>v.toFixed(2);let a0=-Math.PI/2,arcs='',labs='';
  const xy=(a,rr)=>[C+Math.cos(a)*rr,C+Math.sin(a)*rr];
  rows.forEach((o,i)=>{const sw=o[K]/T*Math.PI*2,g=Math.min(gap,sw*.3),s1=a0+g,e1=a0+sw-g,big=e1-s1>Math.PI?1:0;
    const [ax,ay]=xy(s1,R),[bx,by]=xy(e1,R),[cx,cy]=xy(e1,r0),[dx,dy]=xy(s1,r0);
    arcs+=`<path class="sl" data-i="${i}" fill="${o.col}" d="M${f(ax)} ${f(ay)} A${R} ${R} 0 ${big} 1 ${f(bx)} ${f(by)} L${f(cx)} ${f(cy)} A${r0} ${r0} 0 ${big} 0 ${f(dx)} ${f(dy)} Z" style="--d:${i*30}ms"/>`;
    if(o[K]/T>=.075){const [tx,ty]=xy(a0+sw/2,(R+r0)/2);labs+=`<text class="pc" data-i="${i}" x="${f(tx)}" y="${f(ty+3.5)}" text-anchor="middle" fill="${wrInk(o.col)}">${Math.round(o[K]/T*100)}%</text>`;}
    a0+=sw;});
  const gT=rows.filter(o=>o.g==='지상파').reduce((s,o)=>s+o[K],0);
  const seg=has('cost')&&has('bud')?`<div class="seg wrseg" role="tablist"><button type="button" data-wkdn="cost" class="${K==='cost'?'on':''}">${L('집행금액','Spend')}</button><button type="button" data-wkdn="bud" class="${K==='bud'?'on':''}">${L('예산','Budget')}</button></div>`:'';
  box.innerHTML=`<div class="hd"><b>${wrMonth()} ${K==='cost'?L('누적 · PP별 집행금액','to date · spend by PP'):L('PP별 예산','budget by PP')}</b>${seg}</div>
    <div class="rg"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${arcs}${labs}</svg>
      <div class="ctr"><span>${K==='cost'?L('누적 집행','Spent'):L('예산','Budget')}</span><b>${wrEok(T)}</b><em>${L('지상파','Terr.')} ${Math.round(gT/T*100)}% · ${L('케이블','Cable')} ${Math.round((1-gT/T)*100)}%</em></div></div>
    <div class="ls">${rows.map((o,i)=>`<div class="li" data-i="${i}"><i style="background:${o.col}"></i><span>${esc(o.n)}</span><b>${wrEok(o[K])}</b><em>${(o[K]/T*100).toFixed(1)}%</em></div>`).join('')}</div>`;
  box.querySelectorAll('[data-wkdn]').forEach(b=>b.onclick=()=>{WR_WKDN=b.dataset.wkdn;wrWkDonut();});
  const hot=i=>{box.classList.toggle('hot',i!=null);box.querySelectorAll('[data-i]').forEach(e=>e.classList.toggle('on',i!=null&&+e.dataset.i===i));};
  box.querySelectorAll('.sl,.li,.pc').forEach(e=>{const i=+e.dataset.i,o=rows[i];
    e.addEventListener('mousemove',ev=>{hot(i);showTip(ev.clientX,ev.clientY,`<div class="t">${esc(o.n)} <span style="font-weight:600;opacity:.6">· ${o.g==='지상파'?L('지상파','Terrestrial'):L('케이블','Cable')}</span></div>
      <div class="r${K==='cost'?' hi':''}"><span class="l">${L('누적 집행금액','Spend to date')}</span><b>${wrEok(o.cost)}</b></div>
      <div class="r${K==='bud'?' hi':''}"><span class="l">${L('예산','Budget')}</span><b>${o.bud>0?wrEok(o.bud):'–'}</b></div>
      <div class="r"><span class="l">${L('소진율','Spent')}</span><b>${o.bud>0?(o.cost/o.bud*100).toFixed(1)+'%':'–'}</b></div>
      <div class="r"><span class="l">${L('비중','Share')}</span><b>${(o[K]/T*100).toFixed(1)}%</b></div>
      <div class="r"><span class="l">eq.GRP</span><b>${wrF(o.eq,1)}</b></div>`);});
    e.addEventListener('mouseleave',()=>{hot(null);hideTip();});});}
/* v169 — 다음 달 캠페인(같은 광고주)에 주차 데이터가 있을 때만 오른쪽에 흐리게. 없으면 아무것도 그리지 않는다 */
function wrNextWeeks(){
  try{const W=TV_WR,y=+String(W.ym).slice(0,4),m=+String(W.ym).slice(5,7),ny=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;
    const r=((typeof OV!=='undefined'&&OV.rows)||[]).find(r=>!r.self&&r.tvWk&&r.tvWk.ym===ny&&Array.isArray(r.tvWk.wk));if(!r)return [];
    return r.tvWk.wk.filter(a=>(+a[3]>0)||(+a[4]>0)).map(a=>({ym:ny,l:a[0],s:a[1],e:a[2],pp:{},eq:+a[3]||0,cost:+a[4]||0,past:false,next:true}));}catch(e){return [];}}
function renderWrWeek(){
  const h=wrHost('tab-tvweekly','wrWeek');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  const W=TV_WR;
  h.innerHTML=wrHead(L('TV 주차별 퍼포먼스','TV weekly performance'),`${wrMonth()} · ${W.period||''}`)
    +wrWkCard();
  wrWeekChart();wrWkDonut();wrNextLoad();
  return true;}
/* 다음 달 캠페인 값은 전체 캠페인 목록에서 — 아직 안 읽었으면 읽고 다시 그린다 */
function wrNextLoad(){
  const W=TV_WR;
  try{if(typeof ovLoad==='function'&&typeof OV!=='undefined'&&!OV.rows&&!WR_NXQ){WR_NXQ=1;const ym=W.ym;
    Promise.resolve(ovLoad()).then(()=>{WR_NXQ=0;if(TV_WR&&TV_WR.ym===ym&&$('wrWk')&&wrNextWeeks().length)wrWeekChart();}).catch(()=>{WR_NXQ=0;});}}catch(e){}}
let WR_NXQ=0;
/* v157 — 리포트 '품목별 집행' 그래프와 같은 구성: 2D 막대(집행금액 · 위만 둥글게) · 뒤에 eq.GRP 연한 회색 영역 · 위쪽 띠에 CPRP 굵은 곡선 + 값이 든 큰 표식 */
function wrWeekChart(){
  const box=$('wrWk');if(!box)return;const S=wrWeekSeries();if(!S.length){box.innerHTML='';return;}
  const totK={};S.forEach(b=>Object.entries(b.pp).forEach(([k,x])=>{totK[k]=(totK[k]||0)+(x[0]||0);}));
  const keys=Object.keys(totK).sort((a,b)=>(a.startsWith('지상파')?0:1)-(b.startsWith('지상파')?0:1)||totK[b]-totK[a]);
  const NX=0,Wd=Math.max(600,box.clientWidth||1100),PL=18,PR=18,H=470,BOT=70,base=H-BOT,top=150,n=S.length,step=(Wd-PL-PR)/Math.max(n+NX,1),bw=Math.min(40,step*.5);
  const iCur=Math.max(0,S.findIndex(b=>!b.past)),xCut=iCur>0?PL+step*iCur:-1,iNx=S.findIndex(b=>b.next),xNx=iNx>0?PL+step*iNx:Wd+60;
  const fc=b=>b.past?' past':b.next?' nx':'';
  const cxs=S.map((_,i)=>PL+step*(i+.5));
  const mxB=Math.max(...S.map(b=>b.cost))||1,mxE=Math.max(...S.map(b=>b.eq))||1;
  /* ① 바탕 eq.GRP — 막대 영역 높이 안에서 부드러운 곡선 · 아래로 옅어짐 */
  const ey=v=>base-(base-top+40)*.92*v/mxE,ePts=S.map((b,i)=>[cxs[i],ey(b.eq)]);
  const xEnd=PL+step*n,ePath=rpSmooth([[PL-30,base-1],...ePts,[xEnd+step*.6,base-1]],false,.2);
  /* ② CPRP — 위쪽 띠(막대 위) · 최저~최고를 띠 높이에 펼침 */
  const cprp=S.map(b=>b.eq>0?b.cost/b.eq:NaN),cf=cprp.filter(isFinite),c1=Math.max(...cf),c0=Math.min(...cf),sp=(c1-c0)||c1*.2||1;
  const ry=v=>30+(1-(v-c0)/sp)*72;
  let g='',labs='',months='',seps='';
  S.forEach((b,i)=>{const cx=cxs[i],x=cx-bw/2,v=b.cost,hh=Math.max(2,(base-top)*v/mxB),rr=Math.min(5,hh/2),f=q=>q.toFixed(1);
    g+=`<g class="ib wb${fc(b)}" data-i="${i}" style="--d:${i*35}ms"><path d="M${f(x)},${f(base)} V${f(base-hh+rr)} Q${f(x)},${f(base-hh)} ${f(x+rr)},${f(base-hh)} H${f(x+bw-rr)} Q${f(x+bw)},${f(base-hh)} ${f(x+bw)},${f(base-hh+rr)} V${f(base)} Z"/></g>
      <text class="iv${fc(b)}" style="--d:${i*35+380}ms" x="${f(cx)}" y="${f(base-hh-7)}" text-anchor="middle">${wrEok(v)}</text>`;
    labs+=`<text x="${cx}" y="${base+17}" class="wl${fc(b)}" text-anchor="middle">${esc(b.l)}</text><text x="${cx}" y="${base+30}" class="wd${fc(b)}" text-anchor="middle">${wrD(b.s).slice(3)}~${wrD(b.e).slice(3).replace(/^\d+\./,'')}</text>`;});
  /* 월 — 그 달 주차들의 가운데에 */
  const grpM=[];S.forEach((b,i)=>{const l=grpM[grpM.length-1];if(l&&l.ym===b.ym)l.e=i;else grpM.push({ym:b.ym,s:i,e:i,past:b.past,next:!!b.next});});
  grpM.forEach((m,k)=>{const x0=cxs[m.s]-step/2,x1=cxs[m.e]+step/2,mo=+String(m.ym).slice(5,7);
    if(k)seps+=`<line x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${top-20}" y2="${base+48}" class="msep"/>`;
    months+=`<text x="${((x0+x1)/2).toFixed(1)}" y="${base+52}" class="mn${fc(m)}" text-anchor="middle">${L(mo+'월','M'+mo)}${m.past?'':' · '+(m.next?L('다음 캠페인','next campaign'):L('이번 캠페인','this campaign'))}</text>`;});
  const rPts=S.map((b,i)=>isFinite(cprp[i])?[cxs[i],ry(cprp[i]),i]:null).filter(Boolean);
  /* 선 · 영역 — 지난 캠페인 구간은 옅게, 이번 캠페인 구간은 진하게(같은 곡선을 둘로 잘라 칠함) */
  const rD=rpSmooth(rPts.map(p=>[p[0],p[1]]),true,.2);
  const line=(xCut>0?`<path d="${rD}" class="r3 past" pathLength="1" clip-path="url(#wrwkP)"/>`:'')+`<path d="${rD}" class="r3" pathLength="1" clip-path="url(#wrwkN)"/>`+(iNx>0?`<path d="${rD}" class="r3 nx" pathLength="1" clip-path="url(#wrwkX)"/>`:'')
    +rPts.map(p=>`<g class="r3p${fc(S[p[2]])}" style="--d:${900+p[2]*40}ms"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${Math.min(18.5,step*.42).toFixed(1)}"/>
      <text x="${p[0].toFixed(1)}" y="${(p[1]+3.6).toFixed(1)}" text-anchor="middle">${wrF(cprp[p[2]])}</text></g>`).join('');
  box.innerHTML=`<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" class="rpisosvg wkiso">
    <defs><linearGradient id="wreqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ad" stop-opacity=".36"/><stop offset="1" stop-color="#9aa3ad" stop-opacity="0"/></linearGradient>
      <linearGradient id="wreqg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f8a96" stop-opacity=".42"/><stop offset="1" stop-color="#7f8a96" stop-opacity="0"/></linearGradient>
      <clipPath id="wrwkc"><rect x="0" y="0" width="${Wd}" height="${base}"/></clipPath>
      <clipPath id="wrwkP"><rect x="-20" y="-20" width="${Math.max(0,xCut+20)}" height="${H+40}"/></clipPath>
      <clipPath id="wrwkN"><rect x="${Math.max(-20,xCut)}" y="-20" width="${xNx-Math.max(-20,xCut)}" height="${H+40}"/></clipPath>
      <clipPath id="wrwkX"><rect x="${xNx}" y="-20" width="${Wd+40}" height="${H+40}"/></clipPath>
      <clipPath id="wrwkNb"><rect x="${Math.max(-20,xCut)}" y="0" width="${xNx-Math.max(-20,xCut)}" height="${base}"/></clipPath></defs>
    <path d="${ePath} L${xEnd+step*.6},${base} L${PL-30},${base} Z" fill="url(#wreqg)" class="eqa" clip-path="url(#wrwkc)"/>
    ${xCut>0||iNx>0?`<path d="${ePath} L${xEnd+step*.6},${base} L${PL-30},${base} Z" fill="url(#wreqg2)" class="eqa" clip-path="url(#wrwkNb)"/>`:''}
    ${seps}<line x1="${PL-6}" x2="${Wd-PR+6}" y1="${base}" y2="${base}" class="bl"/>${g}${line}${labs}${months}
    ${S.map((b,i)=>`<rect class="hit" data-i="${i}" x="${(cxs[i]-step/2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${base}" fill="transparent"/>`).join('')}</svg>`;
  const leg=$('wrWkLeg');
  if(leg)leg.innerHTML=`<span><i class="sw"></i>${L('집행금액','Spend')}</span><span><i class="ln"></i>CPRP <em>(${L('천원','K')})</em></span><span><i class="ar"></i>eq.GRP</span><span class="n">${L('흐린 막대 = 지난 캠페인','faded = past campaigns')}${iNx>0?' · '+L('맨 오른쪽 옅은 막대 = 다음 캠페인(집행 중)','faintest on the right = next campaign'):''}</span>`;
  rpGo(box);
  box.querySelectorAll('rect.hit').forEach(r=>{const i=+r.dataset.i,b=S[i];
    r.onmousemove=e=>{const rows=keys.filter(k=>b.pp[k]&&(b.pp[k][0]>0||b.pp[k][1]>0)).sort((p,q)=>b.pp[q][1]-b.pp[p][1]);
      const gT=keys.filter(k=>k.startsWith('지상파')).reduce((s2,k)=>s2+((b.pp[k]||[])[1]||0),0),gC=keys.filter(k=>!k.startsWith('지상파')).reduce((s2,k)=>s2+((b.pp[k]||[])[1]||0),0);
      showTip(e.clientX,e.clientY,`<div class="t">${L(+String(b.ym).slice(5,7)+'월','M'+(+String(b.ym).slice(5,7)))} ${esc(b.l)} · ${wrD(b.s)}~${wrD(b.e)}${b.past?' · '+L('지난 캠페인','past'):b.next?' · '+L('다음 캠페인','next'):''}</div>
        <div class="r hi"><span class="l">${L('집행금액','Spend')}</span><b>${wrF(b.cost)} ${L('천원','K')}</b></div><div class="r"><span class="l">eq.GRP</span><b>${wrF(b.eq,1)}</b></div>
        <div class="r"><span class="l">CPRP</span><b>${wrF(b.eq>0?b.cost/b.eq:NaN)} ${L('천원','K')}</b></div>
        <div class="r"><span class="l">${L('지상파 · 케이블','Terr. · Cable')}</span><b>${wrEok(gT)} · ${wrEok(gC)}</b></div>
        ${rows.length?'<div class="tsec">PP</div>':''}${rows.map(k=>`<div class="r"><span class="l">${esc(k.split('|')[1])}</span><b>${wrEok(b.pp[k][1])}<span class="sm">${wrF(b.pp[k][0],1)} eq</span></b></div>`).join('')}`);
      box.querySelectorAll('g.wb').forEach(x=>x.classList.toggle('dim',+x.dataset.i!==i));};
    r.onmouseleave=()=>{hideTip();box.querySelectorAll('g.wb').forEach(x=>x.classList.remove('dim'));};});}
/* ---------- '계' → 'Total' 표기 통일 (v160) ----------
   엑셀 · PDF 에서 그대로 온 이름('지상파 계' · '스마트매트리스 계' · '코웨이 총 합계' · '계')과
   화면 문구('예산 계' · '소계' · '합계')를 화면에 그릴 때만 Total 로 바꾼다. 데이터 열쇠는 그대로 둔다.
   단어 끝의 '계'(단계 · 업계 …)는 건드리지 않도록 — 칸 전체가 '…␠계' / '계' 일 때만. */
const WR_TOT_RE=/^(?:(.*\S)\s+)?(총\s*합계|합계|총계|소계|계)$/;
function wrTotL(s){
  const t=String(s==null?'':s).replace(/\s*총\s+합계(\s*)$/,' 합계$1'),m=WR_TOT_RE.exec(t.trim());
  if(!m)return String(s==null?'':s);
  const lead=t.match(/^\s*/)[0],tail=t.match(/\s*$/)[0];
  if(!m[1])return lead+(m[2]==='소계'?'Subtotal':'Total')+tail;
  return lead+m[1]+' Total'+tail;}
(function(){
  const TABS=['tab-dash','tab-tvdash','tab-tvdaily','tab-tvweekly','tab-tvmonthly','tab-tvmix','tab-oohdash','tab-overview','tab-report'];
  const SEL='th,td,text,tspan,b,span,i,div.l,label';
  const fix=root=>{
    if(!root||!root.querySelectorAll)return;
    const els=root.matches&&root.matches(SEL)?[root,...root.querySelectorAll(SEL)]:root.querySelectorAll(SEL);
    for(const el of els){
      if(el.closest('[contenteditable],input,textarea,select,.inbx'))continue;
      /* 글자만 든 칸 — 안쪽 요소가 있으면 그 요소 차례에서 고친다 */
      for(const n of el.childNodes){
        if(n.nodeType!==3)continue;
        const v=n.nodeValue;if(!v||v.length>40||v.indexOf('계')<0)continue;
        const w=wrTotL(v);if(w!==v)n.nodeValue=w;}}};
  let q=new Set(),h=0;
  const run=()=>{h=0;const s=q;q=new Set();s.forEach(fix);};
  const start=()=>{
    const roots=TABS.map(id=>document.getElementById(id)).filter(Boolean);
    const tipEl=document.getElementById('tip');if(tipEl)roots.push(tipEl);
    if(!roots.length)return;
    const mo=new MutationObserver(ms=>{
      for(const m of ms){
        if(m.type==='characterData'){const p=m.target.parentElement;if(p)q.add(p);}
        else m.addedNodes.forEach(n=>{if(n.nodeType===1)q.add(n);else if(n.nodeType===3&&n.parentElement)q.add(n.parentElement);});}
      if(q.size&&!h)h=requestAnimationFrame(run);});
    roots.forEach(r=>{fix(r);mo.observe(r,{childList:true,subtree:true,characterData:true});});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
