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
const WR_NEU='#9fb2c9',WR_NEU2='#6f86a3';
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
function tvSumNow(){
  if(wrOn()){const W=TV_WR,t=W.wtot||{};return {plan:Math.round((+t.bud||+W.tot.bud||0)*1000),spend:Math.round((+t.cost||0)*1000),grp:+W.tot.grp||0,pgrp:0,mon:{[W.ym]:Math.round((+t.bud||+W.tot.bud||0)*1000)}};}
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
    l.onclick=()=>go(-1);r.onclick=()=>go(1);sc.addEventListener('scroll',paint,{passive:true});
    try{new ResizeObserver(paint).observe(sc);}catch(e){}paint();setTimeout(paint,120);});}

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
function wrCueCol(n){const ym=String((TV_WR&&TV_WR.ym)||'').slice(0,7),ks=Object.keys(WR_CUECOL).sort();
  if(WR_CUECOL[ym]&&WR_CUECOL[ym][n])return wrCalm(WR_CUECOL[ym][n]);
  const prev=ks.filter(k=>k<=ym).reverse(),next=ks.filter(k=>k>ym);
  for(const k of [...prev,...next])if(WR_CUECOL[k][n])return wrCalm(WR_CUECOL[k][n]);
  return '#7f8b97';}
const wrInk=h=>{const n=parseInt(String(h).slice(1),16),l=(.299*(n>>16&255)+.587*(n>>8&255)+.114*(n&255))/255;return l>.68?'#2a2f36':'#fff';};
function renderWrMix(){
  const h=wrHost('tab-tvmix','wrMix');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  const W=TV_WR,items=W.items.filter(it=>wrN(it.sub&&it.sub.bud)>0||it.cr.some(c=>wrN(c.bud)>0));
  const tot=W.tot&&wrN(W.tot.bud)>0?W.tot.bud:items.reduce((s,it)=>s+(wrN(it.sub&&it.sub.bud)||0),0);
  /* ① 소재별 월 예산 — 품목마다 막대 하나, 소재로 나눠 쌓는다(단색 톤) */
  const maxB=Math.max(1,...items.map(it=>wrN(it.sub&&it.sub.bud)||it.cr.reduce((s,c)=>s+(wrN(c.bud)||0),0)));
  const bars=items.map((it,ii)=>{
    const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    /* 한 품목 = 한 색(큐시트) · 소재는 같은 색으로 이어 쌓고 사이만 흰 틈 */
    const ic=wrCueCol(it.n),ink=wrInk(ic);
    const segs=crs.map((c,j)=>{const w=c.bud/maxB*100;
      return `<span class="seg" style="width:${w}%;--d:${(ii*60+j*90)}ms;background:${ic};color:${ink}" data-wrtip="${esc(it.n)}|${esc(c.n)}|${c.bud}|${ib}">
        ${w>9?`<b>${esc(c.n)}</b><i>${wrEok(c.bud)}</i>`:''}</span>`;}).join('');
    return `<div class="wrsb"><div class="nm">${esc(it.n)}</div>
      <div class="bar">${segs}</div><div class="v"><b>${wrEok(ib)}</b><em>${(ib/tot*100).toFixed(0)}%</em></div></div>`;}).join('');
  /* 표 — 머리: 품목(맨 위) › 소재 + 온에어(줄바꿈) · 품목마다 맨 오른쪽 '계'(굵게) */
  let hr1='<th class="stk c0" rowspan="2">'+L('구분','')+'</th>',hr2='',r1='',r2='';
  items.forEach(it=>{const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    hr1+=`<th colspan="${crs.length+1}" class="gs">${esc(it.n)}</th>`;
    crs.forEach((c,j)=>{hr2+=`<th class="${j===0?'gs':''}">${esc(c.n)}${c.on?`<span class="on">${L('온에어','On-air')} ${wrD(c.on)}</span>`:''}</th>`;
      r1+=`<td class="mono${j===0?' gs':''}">${wrF(c.bud)}</td>`;r2+=`<td class="mono${j===0?' gs':''}">${(c.bud/tot*100).toFixed(1)}%</td>`;});
    hr2+=`<th class="sum">${L('계','Total')}</th>`;r1+=`<td class="mono sum">${wrF(ib)}</td>`;r2+=`<td class="mono sum">${(ib/tot*100).toFixed(1)}%</td>`;});
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
      if(pl.length>1&&g==='케이블')body+=`<tr class="sub"><td class="stk c2 head">${L('계','Subtotal')}</td><td class="mono">${wrF(pb)}</td><td class="mono">${(pb/cT*100).toFixed(1)}%</td><td class="mono">${wrF(pe?pb/pe:NaN)}</td><td class="mono">${wrF(pe,1)}</td></tr>`;
      gb+=pb;ge+=pe;});
    body+=`<tr class="gtot"><td class="stk c1 head" colspan="2">${g==='지상파'?L('지상파 계','Terrestrial total'):L('케이블 · 종편 계','Cable · GP total')}</td><td class="mono">${wrF(gb)}</td><td class="mono">${(gb/cT*100).toFixed(1)}%</td><td class="mono">${wrF(ge?gb/ge:NaN)}</td><td class="mono">${wrF(ge,1)}</td></tr>`;
    T.bud+=gb;T.eq+=ge;});
  const chTbl=`<table class="tbl lite wrt wrch"><thead><tr><th class="stk c0">${L('구분','Type')}</th><th class="stk c1">PP</th><th class="stk c2">${L('채널','Channel')}</th>
      <th>${L('월 예산','Budget')} <span class="u">(${L('천원','K KRW')})</span></th><th>${L('비중','Share')}</th><th>${L('목표 CPRP','Target CPRP')} <span class="u">(${L('천원','K')})</span></th><th>${L('목표 eq.GRP','Target eq.GRP')}</th></tr></thead>
    <tbody>${body}<tr class="total"><td class="stk c0 head" colspan="3">TOTAL</td><td class="mono">${wrF(T.bud)}</td><td class="mono">100%</td><td class="mono">${wrF(T.eq?T.bud/T.eq:NaN)}</td><td class="mono">${wrF(T.eq,1)}</td></tr></tbody></table>`;
  h.innerHTML=wrHead(L('TV 미디어믹스','TV media mix'),`${wrMonth()} · ${W.period||''}`)
    +`<div class="sec gap sm">${L('소재별 월 예산','Budget by creative')} <span class="note">${L('품목 막대를 소재로 나눠 쌓음 · TV 요약 기준','Each product bar split by creative · from TV summary')}</span></div>
      <div class="card wrcard"><div class="wrsbs">${bars}</div></div>
      ${wrHs(crTbl,'tbl')}
      <div class="sec gap sm">${L('채널별 월 예산','Budget by channel')} <span class="note">${L('당월_주별 시트 예산 · PP별 비중 · 5% 미만은 기타로','Weekly sheet budget · share by PP · under 5% grouped as Other')}</span></div>
      <div class="card wrcard"><div class="wrdn" id="wrDn"></div><div class="wrdn-etc hidden" id="wrDnEtc"></div></div>
      ${wrHs(chTbl,'tbl')}`;
  wrHsWire(h);wrDnMount();
  h.querySelectorAll('[data-wrtip]').forEach(el=>{el.onmousemove=e=>{const [it,cr,b,ib]=el.dataset.wrtip.split('|');
    showTip(e.clientX,e.clientY,`<div class="t">${esc(it)} · ${esc(cr)}</div><div class="r"><span class="l">${L('월 예산','Budget')}</span><b>${wrF(+b)} ${L('천원','K')}</b></div>
      <div class="r"><span class="l">${L('품목 안 비중','Share in product')}</span><b>${(b/ib*100).toFixed(1)}%</b></div>`);};el.onmouseleave=hideTip;});
  return true;}

/* ---------- 3D 도넛 — 경쟁사 분석 대시보드(v41) 방식: 왼쪽 지상파 · 오른쪽 케이블, 앞뒤 순서대로 벽 → 윗면 ---------- */
function wrDnData(){
  const chs=(TV_WR.chs||[]).filter(c=>wrN(c.bud)>0);
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
   서머리 — 게이지 카드 · R3+ × eq.GRP 소재 지도 · 품목 세부 표 · 시청률 · 소재 온에어 타임라인
   (모든 그래프는 y축 값 표시 없음)
   ================================================================ */
function renderWrDash(){
  const h=wrHost('tab-tvdash','wrDash');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  const W=TV_WR,T=W.tot||{},wt=W.wtot||{};
  /* 게이지 카드 */
  const bud=wrN(wt.bud)>0?wt.bud:wrN(T.bud),spent=wrN(wt.cost),eqT=wrEqTarget();
  const grpT=isFinite(eqT)&&wrN(T.eq)>0&&wrN(T.grp)>0?eqT*T.grp/T.eq:NaN;
  /* v147 — 카드 바탕은 그대로, 카드 안에 작은 게이지 막대 */
  const card=(l,v,p,sub,cls)=>{const pp=isFinite(p)?Math.max(0,p):0,pc=Math.min(pp,1);
    return `<div class="wrg ${cls||''}" style="--p:${Math.max(pc,.0001).toFixed(4)}">
      <div class="tx"><span class="l">${l}</span><b>${v}</b><span class="s">${sub}</span></div>
      <div class="gb"><div class="gt"><i></i></div><span class="pc mono">${isFinite(p)?(p*100).toFixed(1)+'%':'–'}</span></div></div>`;};
  const kpis=`<div class="wrgs">
    ${card(L('목표 대비 소진 예산','Budget spent vs target'),wrEok(spent),wrPct(spent,bud),`${L('목표','Target')} ${wrEok(bud)}`)}
    ${card('GRP',wrF(T.grp,1),wrPct(T.grp,grpT),isFinite(grpT)?`${L('목표(환산)','Target(conv.)')} ${wrF(grpT,0)}`:L('목표 없음','No target'))}
    ${card('eq.GRP',wrF(T.eq,1),wrPct(T.eq,eqT),isFinite(eqT)?`${L('목표','Target')} ${wrF(eqT,0)} · ${L('예산÷목표 CPRP','budget÷target CPRP')}`:L('목표 없음','No target'))}
    ${card('Reach 1+',isFinite(wrN(T.r1))?T.r1.toFixed(1)+'%':'–',wrN(T.r1)/100,L('타깃 도달률','Target reach'),'rch')}
    ${card('Reach 3+',isFinite(wrN(T.r3))?T.r3.toFixed(1)+'%':'–',wrN(T.r3)/100,L('유효 도달률','Effective reach'),'rch')}</div>`;
  /* 소재 목록 (당월 값이 있는 것) */
  const pts=[];W.items.forEach(it=>it.cr.forEach(c=>{if(wrN(c.eq)>0&&isFinite(wrN(c.r3)))pts.push({it:it.n,c});}));
  if(!WR_SEL.item||!W.items.some(i=>i.n===WR_SEL.item)){const f=pts[0]||{it:W.items[0].n,c:W.items[0].cr[0]};WR_SEL={item:f.it,cr:f.c?f.c.n:''};}
  h.innerHTML=wrHead(L('TV 서머리','TV summary'),`${wrMonth()} · ${W.period||''}`)+kpis
    +`<div class="sec gap sm">${L('소재별 효율','Efficiency by creative')} <span class="note">${L('가로 eq.GRP(15초 환산 노출량) · 세로 R3+(유효 도달률) · 점 크기 = 월 예산 · 점이나 카드를 누르면 아래 표가 그 품목으로','x eq.GRP · y R3+ · dot size = budget · click to show its table below')}</span></div>
      <div class="card wrcard"><div class="wrsc" id="wrSc"></div></div>
      <div class="sec gap sm">${L('품목 세부','Product detail')} <span class="note">${L('당월_품목별 세부 · 광고비를 쓴 채널만 · 채널 순서는 엑셀 그대로','Product detail sheet · paid channels only · Excel order')}</span></div>
      <div id="wrItem"></div>
      <div class="sec gap sm">${L('시청률','Ratings')} <span class="note">${L('타깃 평균(회색) 위에 코웨이(색)를 겹침 · 월 계','Coway (color) over target average (gray) · month total')}</span></div>
      <div id="wrRt"></div>
      <div class="sec gap sm">${L('소재 온에어 타임라인','Creative on-air timeline')} <span class="note">${L('카드 = 온에어 이후 누적 효율 · 배경 = 먼슬리 리포트 스토리보드 · 온에어 날짜를 알 수 없는 소재는 뺌','Cards = cumulative since on-air · background = storyboard · creatives without an on-air date are left out')}</span></div>
      <div id="wrTl"></div>`;
  requestAnimationFrame(()=>h.querySelectorAll('.wrg').forEach(g=>g.classList.add('go')));
  wrScatter(pts);wrItemTbl();wrRatings();wrTimeline();wrHsWire(h);
  return true;}

/* ---------- R3+ × eq.GRP 소재 지도 — 점마다 카드, 선은 서로 닿지 않게 ---------- */
function wrScatter(pts){
  const box=$('wrSc');if(!box)return;
  if(!pts.length){box.innerHTML=`<div class="hint" style="padding:30px;text-align:center">${L('당월 소재 실적이 없습니다','No creative results this month')}</div>`;return;}
  /* v157 — 같은 품목 카드는 한 묶음(테두리 · 품목 이름 머리)으로 붙여 놓고, 묶음을 왼쪽 · 오른쪽 열에 나눈다.
     어느 열 · 어떤 순서로 놓을지는 여러 배치를 견줘 안내선이 서로 · 다른 점과 겹치지 않는 것을 고른다 */
  const Wd=Math.max(980,box.clientWidth||1100),CW=236,CH=88,IG=6,GG=14,FP=6,LH=22,PAD=40;
  const COLW=CW+FP*2,x0=COLW+PAD,x1=Wd-COLW-PAD;
  const gmap={};pts.forEach((p,i)=>{p.i=i;(gmap[p.it]||(gmap[p.it]={n:p.it,ps:[]})).ps.push(p);});
  const groups=Object.values(gmap);groups.forEach(g=>g.h=LH+g.ps.length*CH+(g.ps.length-1)*IG+FP);
  const colH=arr=>arr.reduce((s,g)=>s+g.h,0)+Math.max(0,arr.length-1)*GG;
  const G=groups.length,NA=1<<G;
  let best0=1e9;for(let m=0;m<NA;m++){const L0=groups.filter((g,j)=>!(m>>j&1)),R0=groups.filter((g,j)=>m>>j&1);best0=Math.min(best0,Math.max(colH(L0),colH(R0)));}
  /* 높이를 조금 키우면 교차가 풀리는 경우가 있어 몇 가지 높이로 풀어 보고 고른다 */
  const solve=Hd=>{const y0=26,y1=Hd-40,LIM=Hd-12;
  const mx=Math.max(...pts.map(p=>p.c.eq))*1.12,my=Math.max(...pts.map(p=>p.c.r3))*1.18||10;
  const nice=v=>{const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return (f<=1.5?1.5:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e;};
  const XM=nice(mx),X=v=>x0+(v/XM)*(x1-x0),Y=v=>y1-(v/my)*(y1-y0);
  const mxB=Math.max(...pts.map(p=>wrN(p.c.bud)).filter(isFinite),0);
  const rad=p=>{const b=wrN(p.c.bud);return mxB>0&&b>0?Math.max(5,24*Math.sqrt(b/mxB)):5;};
  pts.forEach(p=>{p.x=X(p.c.eq);p.y=Y(p.c.r3);p.r=rad(p);});
  groups.forEach(g=>{g.my=g.ps.reduce((s,p)=>s+p.y,0)/g.ps.length;g.mx=g.ps.reduce((s,p)=>s+p.x,0)/g.ps.length;});
  /* 열 안 배치 — 묶음 가운데를 점들 평균 높이에 두고, 겹치면 밀고 넘치면 당긴다 */
  const stack=arr=>{const n=arr.length;let ys=arr.map(g=>Math.min(Math.max(g.my-g.h/2,6),LIM-g.h));
    for(let i=1;i<n;i++)ys[i]=Math.max(ys[i],ys[i-1]+arr[i-1].h+GG);
    const over=n?ys[n-1]+arr[n-1].h-LIM:0;if(over>0){ys[n-1]-=over;for(let i=n-2;i>=0;i--)ys[i]=Math.min(ys[i],ys[i+1]-arr[i].h-GG);}
    return ys;};
  const sx=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
    const d1=o(c,d,a),d2=o(c,d,b),d3=o(a,b,c),d4=o(a,b,d);return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));};
  const xpt=(a,b,c,d)=>{const r=[b[0]-a[0],b[1]-a[1]],q=[d[0]-c[0],d[1]-c[1]],den=r[0]*q[1]-r[1]*q[0]||1e-9,t=((c[0]-a[0])*q[1]-(c[1]-a[1])*q[0])/den;return [a[0]+t*r[0],a[1]+t*r[1]];};
  const psd=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  /* 한 열의 선 · 점수 — 교차 1000 · 다른 점을 지남 300 · 2.5px 안으로 붙음 60 · 길이. 왼쪽 · 오른쪽 열은 서로 안 만나니 따로 고른다 */
  const evalCol=(arr,side,ord)=>{const P=[],ys=stack(arr);
    arr.forEach((g,gi)=>ord[gi].forEach((p,k)=>{const cy=ys[gi]+LH+k*(CH+IG),ey=cy+CH/2,ex=side<0?FP+CW+2:Wd-COLW+FP-2,elx=side<0?x0-14:x1+14;
      P.push({p,g,gy:ys[gi],side,cy,ey,ex,elx});}));
    let cost=0,hit=0,crs=0;
    for(let i=0;i<P.length;i++){const A=P[i],a1=[A.p.x,A.p.y],a2=[A.elx,A.ey];
      cost+=Math.hypot(a2[0]-a1[0],a2[1]-a1[1])*.02;
      /* 서로 겹친 점(거의 같은 자리)은 어쩔 수 없으니 빼고 본다 */
      pts.forEach(q=>{if(q===A.p||Math.hypot(q.x-A.p.x,q.y-A.p.y)<q.r+A.p.r+2)return;const d=psd([q.x,q.y],a1,a2);if(d<q.r+3){cost+=300;hit++;}});
      for(let j=i+1;j<P.length;j++){const B=P[j],b1=[B.p.x,B.p.y],b2=[B.elx,B.ey];
        /* 교차점이 점(원) 안이면 점에 가려 보이지 않으니 셈하지 않는다 */
        if(sx(a1,a2,b1,b2)){const ip=xpt(a1,a2,b1,b2);if(!pts.some(q=>Math.hypot(q.x-ip[0],q.y-ip[1])<q.r-1)){cost+=1000;crs++;}}else if(Math.min(psd(b1,a1,a2),psd(b2,a1,a2),psd(a1,b1,b2),psd(a2,b1,b2))<2.5)cost+=60;}}
    return {cost,P,hit,crs};};
  const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(r=>[x,...r]));
  const prod=ls=>ls.reduce((acc,l)=>acc.flatMap(a=>l.map(x=>[...a,x])),[[]]);
  const memo={};
  const bestCol=(mask,side)=>{const key=mask+'|'+side;if(memo[key])return memo[key];
    const arr=groups.filter((g,j)=>mask>>j&1);let bst=null;
    if(!arr.length)return memo[key]={cost:0,P:[],hit:0,crs:0};
    let gps=perms(arr);if(gps.length>720){gps=[[...arr].sort((a,b)=>a.my-b.my)];}
    gps.forEach(ga=>{let ords=prod(ga.map(g=>{const s=[...g.ps].sort((a,b)=>a.y-b.y);return s.length<=3?perms(s):[s,[...s].reverse()];}));
      if(ords.length>36)ords=ords.slice(0,36);
      ords.forEach(o=>{const r=evalCol(ga,side,o);if(!bst||r.cost<bst.cost)bst=r;});});
    return memo[key]=bst;};
  let best=null;const full=NA-1;
  for(let m=0;m<NA;m++){
    const Lg=groups.filter((g,j)=>!(m>>j&1)),Rg=groups.filter((g,j)=>m>>j&1);
    if(colH(Lg)>LIM-6||colH(Rg)>LIM-6)continue;
    /* 왼쪽 열은 x 가 작은 묶음, 오른쪽은 큰 묶음이 자연스럽다 — 반대로 가면 조금 벌점 */
    const sidePen=Lg.reduce((s,g)=>s+Math.max(0,g.mx-(x0+x1)/2),0)*.02+Rg.reduce((s,g)=>s+Math.max(0,(x0+x1)/2-g.mx),0)*.02+Math.abs(Lg.length-Rg.length)*4;
    const l=bestCol(full&~m,-1),r=bestCol(m,1),c=l.cost+r.cost+sidePen;
    if(!best||c<best.cost)best={cost:c,P:[...l.P,...r.P],hit:l.hit+r.hit,crs:l.crs+r.crs};}
    return {best,Hd,y0,y1,XM,X,Y};};
  let S0=null;[0,90,180,280,400].forEach(e=>{const h=Math.max(460,best0+56)+e,r=solve(h),c=r.best.cost+e*2;if(!S0||c<S0.c)S0={h,c};});
  const {best,Hd,y0,y1,XM,X,Y}=solve(S0.h);
  const P=best.P;
  /* 격자 — y 값 표시 없음 */
  let grid='';for(let i=0;i<=5;i++){const yy=y0+(y1-y0)*i/5;grid+=`<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}" class="gl"/>`;}
  for(let i=0;i<=5;i++){const v=XM*i/5,xx=X(v);grid+=`<line x1="${xx}" x2="${xx}" y1="${y0}" y2="${y1}" class="gl"/><text x="${xx}" y="${y1+18}" class="tk" text-anchor="middle">${wrF(v)}</text>`;}
  /* 선은 제 점 가장자리에서 시작 */
  const lines=P.map(o=>{const dx=o.elx-o.p.x,dy=o.ey-o.p.y,dl=Math.hypot(dx,dy)||1,sx0=o.p.x+dx/dl*o.p.r,sy0=o.p.y+dy/dl*o.p.r;
    return `<path class="ln" data-i="${o.p.i}" d="M${sx0.toFixed(1)},${sy0.toFixed(1)} L${o.elx},${o.ey.toFixed(1)} L${o.ex},${o.ey.toFixed(1)}"/>`;}).join('');
  /* 점 크기 = 월 예산(넓이 비례 · 가장 큰 소재 반지름 24) · 큰 점부터 그려 작은 점이 위로 */
  const dots=[...pts].sort((a,b)=>b.r-a.r).map(p=>{const r=p.r,i=p.i;
    return `<g class="pt${WR_SEL.item===p.it&&WR_SEL.cr===p.c.n?' sel':''}" data-i="${i}" style="--d:${i*60}ms">
      <circle r="${(r*2.4).toFixed(1)}" class="halo" fill="${WR_NEU}" cx="${p.x}" cy="${p.y}"/><circle r="${(r*2.4).toFixed(1)}" class="halo h2" fill="${WR_NEU}" cx="${p.x}" cy="${p.y}"/>
      <circle r="${r.toFixed(1)}" class="core" cx="${p.x}" cy="${p.y}"/></g>`;}).join('');
  /* 품목 묶음 틀 — 품목 이름 머리 + 옅은 바탕 */
  const seen=new Set();const frames=P.filter(o=>!seen.has(o.g.n)&&seen.add(o.g.n)).map((o,gi)=>{const g=o.g,l=o.side<0?0:Wd-COLW;
    return `<div class="wrscg${o.side<0?' l':' r'}" data-g="${esc(g.n)}" style="left:${l}px;top:${o.gy}px;width:${COLW}px;height:${g.h}px;--d:${120+gi*50}ms">
      <div class="gh"><b>${esc(g.n)}</b>${g.ps.length>1?`<span>${L(g.ps.length+'개 소재',g.ps.length+' creatives')}</span>`:''}</div></div>`;}).join('');
  const cards=P.map(o=>{const p=o.p,c=p.c,cc=c.c||{},i=p.i;
    return `<div class="wrscc${WR_SEL.item===p.it&&WR_SEL.cr===c.n?' sel':''}" data-i="${i}" data-it="${esc(p.it)}" data-cr="${esc(c.n)}" style="left:${(o.side<0?0:Wd-COLW)+FP}px;top:${o.cy}px;width:${CW}px;height:${CH}px;--d:${200+i*50}ms">
      <div class="t"><b>${esc(c.n)}</b></div>
      <div class="big"><span><em>R3+</em><b>${wrF(c.r3,1)}<i>%</i></b></span><span><em>eq.GRP</em><b>${wrF(c.eq,1)}</b></span></div>
      <div class="m"><span>${L('월 예산','Budget')} ${wrEok(c.bud)}</span><span>GRP ${wrF(c.grp,1)}</span><span>R1+ ${wrF(c.r1,1)}%</span></div>
      <div class="cum">${L('온에어 이후','Since on-air')} GRP ${wrF(cc.grp,1)} · eq ${wrF(cc.eq,1)} · R1 ${wrF(cc.r1,1)} · R3 ${wrF(cc.r3,1)}</div></div>`;}).join('');
  box.innerHTML=`<div class="wrsc-in" style="width:${Wd}px;height:${Hd}px">${frames}
    <svg width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}">${grid}
      <text x="${x0}" y="${y0-10}" class="ax">${L('유효 도달률 (R3+)','Effective reach (R3+)')}</text>
      <text x="${x1}" y="${y1+34}" class="ax" text-anchor="end">${L('15초 환산 노출량 (eq.GRP)','15s-equivalent GRP (eq.GRP)')}</text>
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" class="axl"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" class="axl"/>
      <g class="lns">${lines}</g>${dots}</svg>${cards}</div>`;
  box.dataset.cost=Math.round(best.cost)+'/x'+best.crs+'/h'+best.hit;box.__best=best;
  const root=box.querySelector('.wrsc-in');
  const hot=i=>{root.classList.toggle('hot',i!=null);root.querySelectorAll('[data-i]').forEach(e=>e.classList.toggle('on',i!=null&&e.dataset.i===String(i)));
    const it=i!=null?pts[+i].it:null;root.querySelectorAll('.wrscg').forEach(f=>f.classList.toggle('on',f.dataset.g===it));};
  root.querySelectorAll('[data-i]').forEach(e=>{e.addEventListener('mouseenter',()=>hot(e.dataset.i));e.addEventListener('mouseleave',()=>hot(null));
    e.addEventListener('click',()=>{const p=pts[+e.dataset.i];WR_SEL={item:p.it,cr:p.c.n};wrScSync();
      wrItemTbl();const t=$('wrItem');if(t)t.scrollIntoView({behavior:'smooth',block:'nearest'});});});}

/* ---------- 품목 세부 표 — 품목 · 소재 칩으로 고름 ---------- */
function wrItemTbl(){
  const box=$('wrItem');if(!box)return;const W=TV_WR;
  const ord=(W.dorder||[]).filter(e=>e.n!=='__ALL__');
  if(!ord.length){box.innerHTML=`<div class="card wrcard hint">${L('이 달 리포트에는 품목별 세부 시트가 없습니다','No product detail sheet in this report')}</div>`;return;}
  let ent=ord.find(e=>e.n===WR_SEL.item)||ord[0];
  const crs=ent.cr.filter(c=>c.n!=='계'),sumK=(ent.cr.find(c=>c.n==='계')||{}).k,allK=(((W.dorder||[]).find(e=>e.n==='__ALL__')||{}).cr||[{}])[0].k;
  let selK=(crs.find(c=>c.n===WR_SEL.cr||c.sn===WR_SEL.cr)||{}).k||'';
  const chips=wrChips(ord.map(e=>({k:e.n,l:e.n})),ent.n,'data-wri')
    +wrChips([...crs.map(c=>({k:c.k,l:c.n,s:c.on?wrD(c.on):''})),{k:sumK||'',l:L('품목 계','Product total')}],selK||sumK,'data-wrc');
  const blocks=[...crs.map(c=>({k:c.k,l:c.n,on:c.on})),{k:sumK,l:L('품목 계','Product total'),sum:1},{k:allK,l:L('전체 합계','All products'),all:1}].filter(b=>b.k&&W.det[b.k]);
  const chs=W.chs||[];
  /* 광고비를 쓴 채널만 · 엑셀 순서 */
  const ppKey=c=>c.g+'|'+(c.g==='지상파'?wrBc(c.pp||c.ch):c.pp);
  const ppFirst={};chs.forEach((c,i)=>{const k=ppKey(c);if(!(k in ppFirst))ppFirst[k]=i;});
  /* PP 묶음이 이어지게 — 주별 시트에만 있는 채널(뒤에 붙음)도 제 PP 자리로 */
  const used=chs.map((c,i)=>({c,i})).filter(({c})=>wrPaid(c)).sort((a,b)=>(a.c.g===b.c.g?0:a.c.g==='지상파'?-1:1)||ppFirst[ppKey(a.c)]-ppFirst[ppKey(b.c)]||a.i-b.i);
  const cellOf=(k,i)=>{const d=W.det[k];if(!d)return null;return d.cells.find(x=>x[0]===i)||null;};
  const M=['cnt','grp','eq','r1','r3'],ML={cnt:L('횟수','Spots'),grp:'GRP',eq:'eq.GRP',r1:'R1+',r3:'R3+'};
  const fv=(v,m)=>!isFinite(wrN(v))||(+v===0&&m!=='cnt')?'<span class="z">–</span>':m==='cnt'?wrF(v):m==='r1'||m==='r3'?wrF(v,1):wrF(v,1);
  let h1=`<th class="stk c0" rowspan="2">${L('구분','Type')}</th><th class="stk c1" rowspan="2">PP</th><th class="stk c2" rowspan="2">${L('채널','Channel')}</th>`,h2='';
  blocks.forEach(b=>{h1+=`<th colspan="5" class="gs${b.k===selK?' hi':''}${b.sum?' sum':''}">${esc(b.l)}${b.on?`<span class="on">${L('온에어','On-air')} ${wrD(b.on)}</span>`:''}</th>`;
    M.forEach((m,j)=>h2+=`<th class="${j===0?'gs':''}${b.k===selK?' hi':''}${b.sum?' sum':''}">${ML[m]}</th>`);});
  let body='';let lastG='',lastPP='';
  const gRows=g=>used.filter(x=>x.c.g===g);
  ['지상파','케이블'].forEach(g=>{const rs=gRows(g);if(!rs.length)return;
    rs.forEach(({c,i},ri)=>{const ppN=g==='지상파'?wrBc(c.pp||c.ch):c.pp;const ppRows=rs.filter(x=>(g==='지상파'?wrBc(x.c.pp||x.c.ch):x.c.pp)===ppN);
      const firstPP=ppRows[0].i===i;
      body+=`<tr>${ri===0?`<td class="stk c0 head g" rowspan="${rs.length+1}">${g==='지상파'?L('지상파','Terrestrial'):L('케이블 · 종편','Cable · GP')}</td>`:''}
        ${firstPP?`<td class="stk c1 head" rowspan="${ppRows.length}">${esc(ppN)}</td>`:''}<td class="stk c2 head">${esc(c.ch)}</td>
        ${blocks.map(b=>{const x=cellOf(b.k,i);return M.map((m,j)=>`<td class="mono${j===0?' gs':''}${b.k===selK?' hi':''}${b.sum?' sum':''}">${x?fv(x[j+1],m):'<span class="z">–</span>'}</td>`).join('');}).join('')}</tr>`;});
    body+=`<tr class="gtot"><td class="stk c1 head" colspan="2">${g==='지상파'?L('지상파 Total','Terrestrial total'):L('케이블 Total','Cable total')}</td>
      ${blocks.map(b=>{const t=(W.det[b.k].t||{})[g];return M.map((m,j)=>`<td class="mono${j===0?' gs':''}${b.k===selK?' hi':''}">${t?fv(t[j],m):'–'}</td>`).join('');}).join('')}</tr>`;});
  body+=`<tr class="total"><td class="stk c0 head" colspan="3">TV Set Total</td>${blocks.map(b=>{const t=(W.det[b.k].t||{}).T;return M.map((m,j)=>`<td class="mono${j===0?' gs':''}${b.k===selK?' hi':''}">${t?fv(t[j],m):'–'}</td>`).join('');}).join('')}</tr>`;
  box.innerHTML=`<div class="wrsel one">${chips}</div>`+wrHs(`<table class="tbl lite wrt writ"><thead><tr>${h1}</tr><tr>${h2}</tr></thead><tbody>${body}</tbody></table>`,'tbl');
  box.querySelectorAll('[data-wri]').forEach(b=>b.onclick=()=>{const e=ord.find(x=>x.n===b.dataset.wri);WR_SEL={item:e.n,cr:((e.cr.find(c=>c.n!=='계')||{}).n)||''};wrItemTbl();wrScSync();});
  box.querySelectorAll('[data-wrc]').forEach(b=>b.onclick=()=>{const c=ent.cr.find(x=>x.k===b.dataset.wrc);WR_SEL={item:ent.n,cr:c&&c.n!=='계'?c.n:''};wrItemTbl();wrScSync();});
  wrHsWire(box);
  /* 선택한 소재 열로 스크롤 */
  const hi=box.querySelector('th.hi'),sc=box.querySelector('.wrhs-in');if(hi&&sc){const x=hi.offsetLeft-360;if(x>0)sc.scrollTo({left:x,behavior:'smooth'});}}
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
  const chart=([k,lab])=>{const rows=R[k];const BW=74,H=226,PB=46,PT=34,w=rows.length*BW+16;
    /* 묶음마다 제 눈금 — 케이블처럼 값이 작은 묶음도 차이가 보이게 */
    const mx=Math.max(...rows.map(r=>Math.max(wrN(r.cw)||0,wrN(r.avg)||0)))*1.12||1;
    const bars=rows.map((r,i)=>{const cx=8+i*BW+BW/2,isT=/계/.test(r.ch),a=wrN(r.avg)||0,c=wrN(r.cw)||0,ha=a/mx*(H-PB-PT),hc=c/mx*(H-PB-PT);
      const ya=H-PB-ha,yc=H-PB-hc,cTall=hc>=ha;
      /* 라벨 — 높은 막대는 제 막대 위 가운데, 낮은 막대는 옆으로 비켜(겹치지 않게) */
      const lc=cTall?`<text x="${cx+7}" y="${yc-6}" class="iv" text-anchor="middle">${f3(c)}</text>`:`<text x="${cx+8}" y="${yc-5}" class="iv" text-anchor="start">${f3(c)}</text>`;
      const la=cTall?`<text x="${cx-8}" y="${ya-4}" class="ia" text-anchor="end">${f3(a)}</text>`:`<text x="${cx-7}" y="${ya-5}" class="ia" text-anchor="middle">${f3(a)}</text>`;
      return `<g class="rb${isT?' tot':''}" data-ch="${esc(r.ch)}" data-a="${a}" data-c="${c}" style="--d:${i*40}ms">
        <rect class="av" x="${cx-19}" y="${ya}" width="24" height="${ha}" rx="3"/>
        <rect class="cw" x="${cx-5}" y="${yc}" width="24" height="${hc}" rx="3"/>
        ${a>0?la:''}${c>0?lc:''}
        <text x="${cx}" y="${H-PB+15}" class="nm" text-anchor="middle">${esc(r.ch.length>10?r.ch.slice(0,9)+'…':r.ch)}</text></g>`;}).join('');
    return `<div class="wrrt" style="flex:${rows.length} 0 ${w}px"><div class="h">${lab}</div><svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">
      <line x1="0" x2="${w}" y1="${H-PB}" y2="${H-PB}" class="axl"/>${bars}</svg></div>`;};
  box.innerHTML=`<div class="wrleg top"><span><i class="cw"></i>${L('코웨이','Coway')}</span><span><i class="av"></i>${L('타깃 평균','Target avg')}</span>
      <span><i class="cw t"></i><i class="av t"></i>${L('계','Total')}</span><span class="n">${L('막대 위 숫자 = 시청률(%) · 엑셀 그대로','Number = rating (%) as in Excel')}</span></div>`
    +wrHs(`<div class="wrrts">${groups.map(chart).join('')}</div>`);
  box.querySelectorAll('g.rb').forEach(g=>{g.onmousemove=e=>{const a=+g.dataset.a,c=+g.dataset.c;
    showTip(e.clientX,e.clientY,`<div class="t">${esc(g.dataset.ch)}</div><div class="r"><span class="l">${L('코웨이','Coway')}</span><b>${c.toFixed(3)}%</b></div>
      <div class="r"><span class="l">${L('타깃 평균','Target avg')}</span><b>${a.toFixed(3)}%</b></div><div class="r hi"><span class="l">${L('지수','Index')}</span><b>${a>0?Math.round(c/a*100):'–'}</b></div>`);};g.onmouseleave=hideTip;});}

/* ---------- 소재 온에어 타임라인 ---------- */
/* v157 — 카드 배경: 먼슬리 리포트 PDF 의 코웨이 TVC 스토리보드 마지막 장면(assets/cr/{id}_k.jpg) · 품목|소재 → 그림 */
const WR_CRIMG={'아이콘프로|혁신':'6820104d94','아이콘프로|마이워터':'df03f73c74','아이콘프로|종합':'6e77872e62','히티브|눈사람_30초(NA)':'2caa47bf95',
  '비데|위생':'684461aa5d','비데|뮤지컬 예고편':'63e5861535','스마트매트리스|스마트 경도 조절':'c7c0ebb7ad','스마트매트리스|듀얼 경도 조절':'3398d694ee',
  '트리플체어2|서재편':'d1888fefd3','마사지셋/코어셋|마사지셋_기능편':'bef70ecb56','마사지셋/코어셋|마사지셋_디자인편':'883a285f5e','마사지셋/코어셋|코어셋_효능편':'ee3f3548bd',
  '아이콘3|Song편':'bf85cbaf7b','아이콘3|미니미요원편':'c2f60aa16f','노블청정기|라인업':'5e66546471','노블청정기|40평 출시':'f12532f2fe',
  '아이콘얼음정수기|스탠다드 소비자':'b2a78b9213','아이콘얼음정수기|미니 소비자':'7fef7e7c7c','아이콘얼음정수기|라인업 소비자':'40100454f5',
  '아이콘얼음정수기|라인업 소비자 (26년)':'1fbf1d7d6b','아이콘얼음정수기|미니 캐릭터':'e0cf37f75d','아이콘얼음정수기|라인업 캐릭터':'e220da2c08',
  '페블체어2|퍼포먼스':'0a98222e5c','페블체어2|공간':'a72e8ef4bc','코웨이페스타|코웨이페스타':'448718d163','카페얼음정수기|제품':'03a5f17ec7',
  '음식물처리기|관리':'eb114aa87a','안마매트리스|혁신편':'77869d2cd6','안마매트리스|CEO':'9b65d62606'};
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
      <div class="cd${img?' im':''}"${img?` style="--img:url('${img}')"`:''}><div class="t">${esc(x.it)}</div><b>${esc(c.n)}</b>
        <div class="kv"><span>${L('누적','Cum.')} GRP</span><em>${wrF(cc.grp,1)}</em><span>${L('누적','Cum.')} eq.GRP</span><em>${wrF(cc.eq,1)}</em><span>${L('누적','Cum.')} R1+</span><em>${wrF(cc.r1,1)}%</em><span>${L('누적','Cum.')} R3+</span><em>${wrF(cc.r3,1)}%</em></div></div></div>`;}).join('');
  box.innerHTML=wrHs(`<div class="wrtl" style="width:${w}px"><div class="axis"></div>${nodes}</div>`,'tl');
  /* 처음엔 가장 최신 소재(오른쪽 끝)가 보이게 */
  const sc=box.querySelector('.wrhs-in');if(sc){const go=()=>{sc.scrollLeft=sc.scrollWidth;};go();requestAnimationFrame(go);setTimeout(go,150);}}

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
  return out.slice(-20);}
function renderWrWeek(){
  const h=wrHost('tab-tvweekly','wrWeek');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  const W=TV_WR;
  h.innerHTML=wrHead(L('TV 주차별 퍼포먼스','TV weekly performance'),`${wrMonth()} · ${W.period||''}`)
    +`<div class="card wrcard"><div class="wrwk-top"><div class="rplg rpisolg wkleg" id="wrWkLeg"></div></div>
      <div class="wrwk" id="wrWk"></div></div>
    <div class="sec gap sm">${L('채널별 주차 데이터','Weekly data by channel')} <span class="note">${L('당월_주별 · 리포트에 품목별 주차 값이 없어 구분 · PP로 골라 봅니다','Weekly sheet · the report has no weekly split by product, so filter by type · PP')}</span></div>
    <div id="wrWkT"></div>`;
  wrWeekChart();wrWeekTbl();return true;}
/* v157 — 리포트 '품목별 집행' 그래프와 같은 구성: 2D 막대(집행금액 · 위만 둥글게) · 뒤에 eq.GRP 연한 회색 영역 · 위쪽 띠에 CPRP 굵은 곡선 + 값이 든 큰 표식 */
function wrWeekChart(){
  const box=$('wrWk');if(!box)return;const S=wrWeekSeries();if(!S.length){box.innerHTML='';return;}
  const totK={};S.forEach(b=>Object.entries(b.pp).forEach(([k,x])=>{totK[k]=(totK[k]||0)+(x[0]||0);}));
  const keys=Object.keys(totK).sort((a,b)=>(a.startsWith('지상파')?0:1)-(b.startsWith('지상파')?0:1)||totK[b]-totK[a]);
  const Wd=Math.max(900,box.clientWidth||1100),PL=18,PR=18,H=470,BOT=70,base=H-BOT,top=150,n=S.length,step=(Wd-PL-PR)/Math.max(n,1),bw=Math.min(40,step*.5);
  const cxs=S.map((_,i)=>PL+step*(i+.5));
  const mxB=Math.max(...S.map(b=>b.cost))||1,mxE=Math.max(...S.map(b=>b.eq))||1;
  /* ① 바탕 eq.GRP — 막대 영역 높이 안에서 부드러운 곡선 · 아래로 옅어짐 */
  const ey=v=>base-(base-top+40)*.92*v/mxE,ePts=S.map((b,i)=>[cxs[i],ey(b.eq)]);
  const ePath=rpSmooth([[PL-30,base-1],...ePts,[Wd+20,base-1]],false,.2);
  /* ② CPRP — 위쪽 띠(막대 위) · 최저~최고를 띠 높이에 펼침 */
  const cprp=S.map(b=>b.eq>0?b.cost/b.eq:NaN),cf=cprp.filter(isFinite),c1=Math.max(...cf),c0=Math.min(...cf),sp=(c1-c0)||c1*.2||1;
  const ry=v=>30+(1-(v-c0)/sp)*72;
  let g='',labs='',months='',seps='';
  S.forEach((b,i)=>{const cx=cxs[i],x=cx-bw/2,v=b.cost,hh=Math.max(2,(base-top)*v/mxB),rr=Math.min(5,hh/2),f=q=>q.toFixed(1);
    g+=`<g class="ib wb${b.past?' past':''}" data-i="${i}" style="--d:${i*35}ms"><path d="M${f(x)},${f(base)} V${f(base-hh+rr)} Q${f(x)},${f(base-hh)} ${f(x+rr)},${f(base-hh)} H${f(x+bw-rr)} Q${f(x+bw)},${f(base-hh)} ${f(x+bw)},${f(base-hh+rr)} V${f(base)} Z"/></g>
      <text class="iv${b.past?' past':''}" style="--d:${i*35+380}ms" x="${f(cx)}" y="${f(base-hh-7)}" text-anchor="middle">${wrEok(v)}</text>`;
    labs+=`<text x="${cx}" y="${base+17}" class="wl${b.past?' past':''}" text-anchor="middle">${esc(b.l)}</text><text x="${cx}" y="${base+30}" class="wd${b.past?' past':''}" text-anchor="middle">${wrD(b.s).slice(3)}~${wrD(b.e).slice(3).replace(/^\d+\./,'')}</text>`;});
  /* 월 — 그 달 주차들의 가운데에 */
  const grpM=[];S.forEach((b,i)=>{const l=grpM[grpM.length-1];if(l&&l.ym===b.ym)l.e=i;else grpM.push({ym:b.ym,s:i,e:i,past:b.past});});
  grpM.forEach((m,k)=>{const x0=cxs[m.s]-step/2,x1=cxs[m.e]+step/2,mo=+String(m.ym).slice(5,7);
    if(k)seps+=`<line x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${top-20}" y2="${base+48}" class="msep"/>`;
    months+=`<text x="${((x0+x1)/2).toFixed(1)}" y="${base+52}" class="mn${m.past?' past':''}" text-anchor="middle">${L(mo+'월','M'+mo)}${m.past?'':' · '+L('이번 캠페인','this campaign')}</text>`;});
  const rPts=S.map((b,i)=>isFinite(cprp[i])?[cxs[i],ry(cprp[i]),i]:null).filter(Boolean);
  const line=`<path d="${rpSmooth(rPts.map(p=>[p[0],p[1]]),true,.2)}" class="r3" pathLength="1"/>`
    +rPts.map(p=>`<g class="r3p${S[p[2]].past?' past':''}" style="--d:${900+p[2]*40}ms"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${Math.min(18.5,step*.42).toFixed(1)}"/>
      <text x="${p[0].toFixed(1)}" y="${(p[1]+3.6).toFixed(1)}" text-anchor="middle">${wrF(cprp[p[2]])}</text></g>`).join('');
  box.innerHTML=`<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" class="rpisosvg wkiso">
    <defs><linearGradient id="wreqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ad" stop-opacity=".36"/><stop offset="1" stop-color="#9aa3ad" stop-opacity="0"/></linearGradient>
      <clipPath id="wrwkc"><rect x="0" y="0" width="${Wd}" height="${base}"/></clipPath></defs>
    <path d="${ePath} L${Wd+20},${base} L${PL-30},${base} Z" fill="url(#wreqg)" class="eqa" clip-path="url(#wrwkc)"/>
    ${seps}<line x1="${PL-6}" x2="${Wd-PR+6}" y1="${base}" y2="${base}" class="bl"/>${g}${line}${labs}${months}
    ${S.map((b,i)=>`<rect class="hit" data-i="${i}" x="${(cxs[i]-step/2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${base}" fill="transparent"/>`).join('')}</svg>`;
  const leg=$('wrWkLeg');
  if(leg)leg.innerHTML=`<span><i class="sw"></i>${L('집행금액','Spend')}</span><span><i class="ln"></i>CPRP <em>(${L('천원','K')})</em></span><span><i class="ar"></i>eq.GRP</span><span class="n">${L('흐린 막대 = 지난 캠페인','faded = past campaigns')}</span>`;
  rpGo(box);
  box.querySelectorAll('rect.hit').forEach(r=>{const i=+r.dataset.i,b=S[i];
    r.onmousemove=e=>{const rows=keys.filter(k=>b.pp[k]&&(b.pp[k][0]>0||b.pp[k][1]>0)).sort((p,q)=>b.pp[q][1]-b.pp[p][1]);
      const gT=keys.filter(k=>k.startsWith('지상파')).reduce((s2,k)=>s2+((b.pp[k]||[])[1]||0),0),gC=keys.filter(k=>!k.startsWith('지상파')).reduce((s2,k)=>s2+((b.pp[k]||[])[1]||0),0);
      showTip(e.clientX,e.clientY,`<div class="t">${L(+String(b.ym).slice(5,7)+'월','M'+(+String(b.ym).slice(5,7)))} ${esc(b.l)} · ${wrD(b.s)}~${wrD(b.e)}${b.past?' · '+L('지난 캠페인','past'):''}</div>
        <div class="r hi"><span class="l">${L('집행금액','Spend')}</span><b>${wrF(b.cost)} ${L('천원','K')}</b></div><div class="r"><span class="l">eq.GRP</span><b>${wrF(b.eq,1)}</b></div>
        <div class="r"><span class="l">CPRP</span><b>${wrF(b.eq>0?b.cost/b.eq:NaN)} ${L('천원','K')}</b></div>
        <div class="r"><span class="l">${L('지상파 · 케이블','Terr. · Cable')}</span><b>${wrEok(gT)} · ${wrEok(gC)}</b></div>
        <div class="tsec">PP</div>${rows.map(k=>`<div class="r"><span class="l">${esc(k.split('|')[1])}</span><b>${wrEok(b.pp[k][1])}<span class="sm">${wrF(b.pp[k][0],1)} eq</span></b></div>`).join('')}`);
      box.querySelectorAll('g.wb').forEach(x=>x.classList.toggle('dim',+x.dataset.i!==i));};
    r.onmouseleave=()=>{hideTip();box.querySelectorAll('g.wb').forEach(x=>x.classList.remove('dim'));};});}
function wrWeekTbl(){
  const box=$('wrWkT');if(!box)return;const W=TV_WR,wk=W.weeks||[];
  const rows=(W.chs||[]).filter(c=>wrPaid(c)||(wrN(c.eq)>0));
  const pps=[];rows.forEach(c=>{const k=wrPPKey(c);if(!pps.includes(k))pps.push(k);});
  const opts=[{k:'all',l:L('전체','All')},{k:'g:지상파',l:L('지상파','Terrestrial')},{k:'g:케이블',l:L('케이블 · 종편','Cable · GP')},...pps.filter(k=>k.startsWith('케이블')).map(k=>({k,l:k.split('|')[1]}))];
  if(!opts.some(o=>o.k===WR_WK.pp))WR_WK.pp='all';
  const f=WR_WK.pp,sel=rows.filter(c=>f==='all'||(f.startsWith('g:')?c.g===f.slice(2):wrPPKey(c)===f));
  const ppFirst={};(W.chs||[]).forEach((c,i)=>{const k=wrPPKey(c);if(!(k in ppFirst))ppFirst[k]=i;});
  sel.sort((a,b)=>(a.g===b.g?0:a.g==='지상파'?-1:1)||ppFirst[wrPPKey(a)]-ppFirst[wrPPKey(b)]);
  const cp=(c,e)=>e>0&&c>0?c/e:NaN;
  let h1=`<th class="stk c0" rowspan="2">${L('구분','Type')}</th><th class="stk c1" rowspan="2">PP</th><th class="stk c2" rowspan="2">${L('채널','Channel')}</th><th rowspan="2" class="gs">${L('예산','Budget')}<br><span class="u">(${L('천원','K')})</span></th>
    <th colspan="3" class="gs sum">${wrMonth()} ${L('누적','total')}</th>`,h2=`<th class="gs sum">eq.GRP</th><th class="sum">${L('집행금액','Spend')}</th><th class="sum">CPRP</th>`;
  wk.forEach(w=>{h1+=`<th colspan="3" class="gs">${esc(w.l)}<span class="on">${wrD(w.s)}~${wrD(w.e).replace(/^\d+\.\d+\./,'')}</span></th>`;h2+=`<th class="gs">eq.GRP</th><th>${L('집행금액','Spend')}</th><th>CPRP</th>`;});
  const T={bud:0,eq:0,cost:0,w:wk.map(()=>[0,0])};
  let body='';let lastG='',lastPP='';
  sel.forEach((c,ri)=>{const gN=c.g==='지상파'?L('지상파','Terrestrial'):L('케이블 · 종편','Cable · GP'),ppN=c.g==='지상파'?wrBc(c.pp||c.ch):c.pp;
    const gSpan=sel.filter(x=>x.g===c.g).length,ppSpan=sel.filter(x=>wrPPKey(x)===wrPPKey(c)).length;
    T.bud+=wrN(c.bud)||0;T.eq+=wrN(c.eq)||0;T.cost+=wrN(c.cost)||0;
    body+=`<tr>${c.g!==lastG?`<td class="stk c0 head g" rowspan="${gSpan}">${gN}</td>`:''}${wrPPKey(c)!==lastPP?`<td class="stk c1 head" rowspan="${ppSpan}">${esc(ppN)}</td>`:''}<td class="stk c2 head">${esc(c.ch)}</td>
      <td class="mono gs">${wrF(c.bud)}</td><td class="mono gs sum">${wrF(c.eq,1)}</td><td class="mono sum">${wrF(c.cost)}</td><td class="mono sum">${wrF(cp(c.cost,c.eq))}</td>
      ${wk.map((w,i)=>{const x=(c.w||[])[i]||[];T.w[i][0]+=wrN(x[0])||0;T.w[i][1]+=wrN(x[1])||0;return `<td class="mono gs">${wrF(x[0],1)}</td><td class="mono">${wrF(x[1])}</td><td class="mono">${wrF(cp(x[1],x[0]))}</td>`;}).join('')}</tr>`;
    lastG=c.g;lastPP=wrPPKey(c);});
  body+=`<tr class="total"><td class="stk c0 head" colspan="3">TOTAL</td><td class="mono gs">${wrF(T.bud)}</td><td class="mono gs">${wrF(T.eq,1)}</td><td class="mono">${wrF(T.cost)}</td><td class="mono">${wrF(cp(T.cost,T.eq))}</td>
    ${T.w.map(x=>`<td class="mono gs">${wrF(x[0],1)}</td><td class="mono">${wrF(x[1])}</td><td class="mono">${wrF(cp(x[1],x[0]))}</td>`).join('')}</tr>`;
  box.innerHTML=`<div class="wrsel">${wrChips(opts,WR_WK.pp,'data-wrp')}</div>`+wrHs(`<table class="tbl lite wrt writ wrwt"><thead><tr>${h1}</tr><tr>${h2}</tr></thead><tbody>${body}</tbody></table>`,'tbl');
  box.querySelectorAll('[data-wrp]').forEach(b=>b.onclick=()=>{WR_WK.pp=b.dataset.wrp;wrWeekTbl();});
  wrHsWire(box);}
