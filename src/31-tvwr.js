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
let TV_WR=null;
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
const WR_PAL=['#3d5a8a','#b8743f','#4b8a6c','#86589e','#a8893b','#4b8aa6','#a35a68','#66788f','#7f963f','#8f6b52'];
const WR_ICOL={'아이콘3':0,'아이콘얼음정수기':1,'카페얼음정수기':5,'안마매트리스':3,'음식물처리기':2,'페블체어2':4,'트리플체어2':6,
  '스마트매트리스':7,'아이콘프로':8,'노블청정기':9,'비데':2,'히티브':6,'마사지셋/코어셋':4,'코웨이페스타':3};
function wrCol(n){if(n in WR_ICOL)return WR_PAL[WR_ICOL[n]];let h=0;for(const c of String(n))h=(h*31+c.charCodeAt(0))>>>0;return WR_PAL[h%WR_PAL.length];}
/* 지상파 · 케이블 톤 — 지상파는 푸른 기 도는 짙은 회청, 케이블은 무채 회색. 같은 톤 안에서 PP 마다 밝기만 */
const WR_TONE={t:['#24406f','#3d5f99','#6b8cc4','#9db6e0','#c4d4ee'],c:['#3f4a54','#58636e','#717c87','#8a949e','#a3acb5','#bcc3ca','#d2d7dc','#e1e5e8']};
function wrShade(h,k){const n=parseInt(h.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(c*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
/* 지상파 방송사 이름 — KBS2 → KBS */
const wrBc=ch=>String(ch||'').replace(/\d+$/,'').trim()||ch;
/* 광고비를 쓴 채널 */
const wrPaid=c=>(wrN(c.bud)>0)||(wrN(c.cost)>0);
/* 목표 eq.GRP — 채널 예산 ÷ 목표 CPRP 의 합 */
function wrEqTarget(){let t=0,ok=false;(TV_WR.chs||[]).forEach(c=>{if(wrN(c.bud)>0&&wrN(c.tc)>0){t+=c.bud/c.tc;ok=true;}});return ok?t:NaN;}

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
function renderWrMix(){
  const h=wrHost('tab-tvmix','wrMix');if(!h)return false;
  if(!wrOn()){h.innerHTML='';return false;}
  const W=TV_WR,items=W.items.filter(it=>wrN(it.sub&&it.sub.bud)>0||it.cr.some(c=>wrN(c.bud)>0));
  const tot=W.tot&&wrN(W.tot.bud)>0?W.tot.bud:items.reduce((s,it)=>s+(wrN(it.sub&&it.sub.bud)||0),0);
  /* ① 소재별 월 예산 — 품목마다 막대 하나, 소재로 나눠 쌓는다(단색 톤) */
  const maxB=Math.max(1,...items.map(it=>wrN(it.sub&&it.sub.bud)||it.cr.reduce((s,c)=>s+(wrN(c.bud)||0),0)));
  const bars=items.map((it,ii)=>{
    const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    const segs=crs.map((c,j)=>{const w=c.bud/maxB*100,sh=crs.length>1?.62+.38*(j/(crs.length-1)):.8;
      return `<span class="seg" style="width:${w}%;--d:${(ii*60+j*90)}ms;background:${wrShade('#5b6672',1/sh)}" data-wrtip="${esc(it.n)}|${esc(c.n)}|${c.bud}|${ib}">
        ${w>9?`<b>${esc(c.n)}</b><i>${wrEok(c.bud)}</i>`:''}</span>`;}).join('');
    return `<div class="wrsb"><div class="nm"><i style="background:${wrCol(it.n)}"></i>${esc(it.n)}</div>
      <div class="bar">${segs}</div><div class="v"><b>${wrEok(ib)}</b><em>${(ib/tot*100).toFixed(0)}%</em></div></div>`;}).join('');
  /* 표 — 머리: 품목(맨 위) › 소재 + 온에어(줄바꿈) · 품목마다 맨 오른쪽 '계'(굵게) */
  let hr1='<th class="stk c0" rowspan="2">'+L('구분','')+'</th>',hr2='',r1='',r2='';
  items.forEach(it=>{const crs=it.cr.filter(c=>wrN(c.bud)>0),ib=wrN(it.sub&&it.sub.bud)||crs.reduce((s,c)=>s+c.bud,0);
    hr1+=`<th colspan="${crs.length+1}" class="gs"><i class="dot" style="background:${wrCol(it.n)}"></i>${esc(it.n)}</th>`;
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
  const card=(l,v,p,sub,cls)=>{const pp=isFinite(p)?Math.max(0,p):0,pc=Math.min(pp,1);
    return `<div class="wrg ${cls||''}${pc>=.82?' full':''}" style="--p:${Math.max(pc,.0001).toFixed(4)}"><div class="fill"></div>
      <div class="tx"><span class="l">${l}</span><b>${v}</b><span class="s">${sub}</span></div>
      <div class="pc mono">${isFinite(p)?(p*100).toFixed(1)+'%':'–'}</div></div>`;};
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
    +`<div class="sec gap sm">${L('소재별 효율','Efficiency by creative')} <span class="note">${L('가로 eq.GRP(15초 환산 노출량) · 세로 R3+(유효 도달률) · 같은 품목은 같은 색 · 점이나 카드를 누르면 아래 표가 그 품목으로','x eq.GRP · y R3+ · same product = same color · click to show its table below')}</span></div>
      <div class="card wrcard"><div class="wrsc" id="wrSc"></div></div>
      <div class="sec gap sm">${L('품목 세부','Product detail')} <span class="note">${L('당월_품목별 세부 · 광고비를 쓴 채널만 · 채널 순서는 엑셀 그대로','Product detail sheet · paid channels only · Excel order')}</span></div>
      <div id="wrItem"></div>
      <div class="sec gap sm">${L('시청률','Ratings')} <span class="note">${L('타깃 평균(회색) 위에 코웨이(색)를 겹침 · 월 계','Coway (color) over target average (gray) · month total')}</span></div>
      <div id="wrRt"></div>
      <div class="sec gap sm">${L('소재 온에어 타임라인','Creative on-air timeline')} <span class="note">${L('카드 = 온에어 이후 누적 효율 · 온에어 날짜를 알 수 없는 소재는 뺌','Cards = cumulative since on-air · creatives without an on-air date are left out')}</span></div>
      <div id="wrTl"></div>`;
  requestAnimationFrame(()=>h.querySelectorAll('.wrg').forEach(g=>g.classList.add('go')));
  wrScatter(pts);wrItemTbl();wrRatings();wrTimeline();wrHsWire(h);
  return true;}

/* ---------- R3+ × eq.GRP 소재 지도 — 점마다 카드, 선은 서로 닿지 않게 ---------- */
function wrScatter(pts){
  const box=$('wrSc');if(!box)return;
  if(!pts.length){box.innerHTML=`<div class="hint" style="padding:30px;text-align:center">${L('당월 소재 실적이 없습니다','No creative results this month')}</div>`;return;}
  const Wd=Math.max(980,box.clientWidth||1100),CW=232,CH=82,GAP=10,PAD=46;
  const x0=CW+PAD,x1=Wd-CW-PAD;
  const half=Math.ceil(pts.length/2),rows=Math.max(half,4);
  const Hd=Math.max(440,rows*(CH+GAP)+40),y0=24,y1=Hd-40;
  const mx=Math.max(...pts.map(p=>p.c.eq))*1.12,my=Math.max(...pts.map(p=>p.c.r3))*1.18||10;
  const nice=v=>{const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return (f<=1.5?1.5:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e;};
  const XM=nice(mx),X=v=>x0+(v/XM)*(x1-x0),Y=v=>y1-(v/my)*(y1-y0);
  pts.forEach(p=>{p.x=X(p.c.eq);p.y=Y(p.c.r3);});
  /* 왼쪽 · 오른쪽 열 — x 순으로 반씩, 열 안은 점 높이 순 */
  const byX=[...pts].sort((a,b)=>a.x-b.x),L0=byX.slice(0,Math.floor(pts.length/2)),R0=byX.slice(Math.floor(pts.length/2));
  const place=(arr)=>{arr.sort((a,b)=>a.y-b.y);const n=arr.length;
    /* 원하는 높이 = 점 높이, 겹치면 아래로 밀고 넘치면 위로 당긴다 */
    let ys=arr.map(p=>Math.min(Math.max(p.y-CH/2,8),Hd-CH-8));
    for(let i=1;i<n;i++)ys[i]=Math.max(ys[i],ys[i-1]+CH+GAP);
    const over=ys.length?ys[n-1]+CH+8-Hd:0;if(over>0){ys[n-1]-=over;for(let i=n-2;i>=0;i--)ys[i]=Math.min(ys[i],ys[i+1]-CH-GAP);}
    arr.forEach((p,i)=>p.cy=ys[i]);};
  place(L0);place(R0);L0.forEach(p=>p.side=-1);R0.forEach(p=>p.side=1);
  /* 격자 — y 값 표시 없음 */
  let grid='';for(let i=0;i<=5;i++){const yy=y0+(y1-y0)*i/5;grid+=`<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}" class="gl"/>`;}
  for(let i=0;i<=5;i++){const v=XM*i/5,xx=X(v);grid+=`<line x1="${xx}" x2="${xx}" y1="${y0}" y2="${y1}" class="gl"/><text x="${xx}" y="${y1+18}" class="tk" text-anchor="middle">${wrF(v)}</text>`;}
  const lines=pts.map((p,i)=>{const ex=p.side<0?CW+4:Wd-CW-4,ey=p.cy+CH/2,mx2=p.side<0?x0-16:x1+16;
    return `<path class="ln" data-i="${i}" d="M${p.x.toFixed(1)},${p.y.toFixed(1)} L${mx2},${ey.toFixed(1)} L${ex},${ey.toFixed(1)}" stroke="${wrCol(p.it)}"/>`;}).join('');
  const dots=pts.map((p,i)=>`<g class="pt${WR_SEL.item===p.it&&WR_SEL.cr===p.c.n?' sel':''}" data-i="${i}" style="--d:${i*60}ms">
      <circle r="22" class="halo" fill="${wrCol(p.it)}" cx="${p.x}" cy="${p.y}"/><circle r="11" class="ring" fill="${wrCol(p.it)}" cx="${p.x}" cy="${p.y}"/>
      <circle r="6.5" class="core" fill="${wrCol(p.it)}" cx="${p.x}" cy="${p.y}"/></g>`).join('');
  const cards=pts.map((p,i)=>{const c=p.c,cc=c.c||{};
    return `<div class="wrscc${WR_SEL.item===p.it&&WR_SEL.cr===c.n?' sel':''}" data-i="${i}" style="left:${p.side<0?0:Wd-CW}px;top:${p.cy}px;width:${CW}px;height:${CH}px;--c:${wrCol(p.it)};--d:${200+i*50}ms">
      <div class="t"><i></i><b>${esc(p.it)}</b><span>${esc(c.n)}</span></div>
      <div class="m"><span>${L('월 예산','Budget')} <b>${wrEok(c.bud)}</b></span><span>eq <b>${wrF(c.eq,1)}</b></span><span>GRP <b>${wrF(c.grp,1)}</b></span><span>R1 <b>${wrF(c.r1,1)}</b></span><span>R3 <b>${wrF(c.r3,1)}</b></span></div>
      <div class="cum">${L('온에어 이후','Since on-air')} GRP ${wrF(cc.grp,1)} · eq ${wrF(cc.eq,1)} · R1 ${wrF(cc.r1,1)} · R3 ${wrF(cc.r3,1)}</div></div>`;}).join('');
  box.innerHTML=`<div class="wrsc-in" style="width:${Wd}px;height:${Hd}px">
    <svg width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}">${grid}
      <text x="${x0}" y="${y0-8}" class="ax">${L('유효 도달률 (R3+)','Effective reach (R3+)')}</text>
      <text x="${x1}" y="${y1+34}" class="ax" text-anchor="end">${L('15초 환산 노출량 (eq.GRP)','15s-equivalent GRP (eq.GRP)')}</text>
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" class="axl"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}" class="axl"/>
      <g class="lns">${lines}</g>${dots}</svg>${cards}</div>`;
  const root=box.querySelector('.wrsc-in');
  const hot=i=>{root.classList.toggle('hot',i!=null);root.querySelectorAll('[data-i]').forEach(e=>e.classList.toggle('on',i!=null&&e.dataset.i===String(i)));};
  root.querySelectorAll('[data-i]').forEach(e=>{e.addEventListener('mouseenter',()=>hot(e.dataset.i));e.addEventListener('mouseleave',()=>hot(null));
    e.addEventListener('click',()=>{const p=pts[+e.dataset.i];WR_SEL={item:p.it,cr:p.c.n};
      root.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));root.querySelectorAll(`[data-i="${e.dataset.i}"]`).forEach(x=>x.classList.add('sel'));
      wrItemTbl();const t=$('wrItem');if(t)t.scrollIntoView({behavior:'smooth',block:'nearest'});});});}

/* ---------- 품목 세부 표 — 품목 · 소재 칩으로 고름 ---------- */
function wrItemTbl(){
  const box=$('wrItem');if(!box)return;const W=TV_WR;
  const ord=(W.dorder||[]).filter(e=>e.n!=='__ALL__');
  if(!ord.length){box.innerHTML=`<div class="card wrcard hint">${L('이 달 리포트에는 품목별 세부 시트가 없습니다','No product detail sheet in this report')}</div>`;return;}
  let ent=ord.find(e=>e.n===WR_SEL.item)||ord[0];
  const crs=ent.cr.filter(c=>c.n!=='계'),sumK=(ent.cr.find(c=>c.n==='계')||{}).k,allK=(((W.dorder||[]).find(e=>e.n==='__ALL__')||{}).cr||[{}])[0].k;
  let selK=(crs.find(c=>c.n===WR_SEL.cr||c.sn===WR_SEL.cr)||{}).k||'';
  const chips=wrChips(ord.map(e=>({k:e.n,l:e.n,c:wrCol(e.n)})),ent.n,'data-wri')
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
  box.innerHTML=`<div class="wrsel">${chips}</div>`+wrHs(`<table class="tbl lite wrt writ"><thead><tr>${h1}</tr><tr>${h2}</tr></thead><tbody>${body}</tbody></table>`,'tbl');
  box.querySelectorAll('[data-wri]').forEach(b=>b.onclick=()=>{const e=ord.find(x=>x.n===b.dataset.wri);WR_SEL={item:e.n,cr:((e.cr.find(c=>c.n!=='계')||{}).n)||''};wrItemTbl();wrScSync();});
  box.querySelectorAll('[data-wrc]').forEach(b=>b.onclick=()=>{const c=ent.cr.find(x=>x.k===b.dataset.wrc);WR_SEL={item:ent.n,cr:c&&c.n!=='계'?c.n:''};wrItemTbl();wrScSync();});
  wrHsWire(box);
  /* 선택한 소재 열로 스크롤 */
  const hi=box.querySelector('th.hi'),sc=box.querySelector('.wrhs-in');if(hi&&sc){const x=hi.offsetLeft-360;if(x>0)sc.scrollTo({left:x,behavior:'smooth'});}}
function wrScSync(){const root=document.querySelector('#wrSc .wrsc-in');if(!root)return;
  root.querySelectorAll('.wrscc').forEach(c=>{const t=c.querySelector('.t');const it=t&&t.querySelector('b').textContent,cr=t&&t.querySelector('span').textContent;
    const on=it===WR_SEL.item&&cr===WR_SEL.cr;c.classList.toggle('sel',on);root.querySelectorAll(`g.pt[data-i="${c.dataset.i}"]`).forEach(g=>g.classList.toggle('sel',on));});}

/* ---------- 시청률 — 지상파 · 종편 · 케이블, 무채 막대(타깃 평균) 위에 유채 막대(코웨이) 겹침 ---------- */
const WR_CW='#1d6fc2';
function wrRatings(){
  const box=$('wrRt');if(!box)return;const R=TV_WR.rt||{};
  const groups=[['지상파',L('지상파','Terrestrial')],['종편',L('종편','General programming')],['케이블',L('케이블','Cable')]].filter(([k])=>(R[k]||[]).length);
  if(!groups.length){box.innerHTML=`<div class="card wrcard hint">${L('시청률 시트가 없습니다','No ratings sheet')}</div>`;return;}
  const chart=([k,lab])=>{const rows=R[k];const BW=66,H=210,PB=46,PT=26,w=rows.length*BW+16;
    /* 묶음마다 제 눈금 — 케이블처럼 값이 작은 묶음도 차이가 보이게 */
    const mx=Math.max(...rows.map(r=>Math.max(wrN(r.cw)||0,wrN(r.avg)||0)))*1.15||1;
    const bars=rows.map((r,i)=>{const cx=8+i*BW+BW/2,isT=/계/.test(r.ch),a=wrN(r.avg)||0,c=wrN(r.cw)||0,ha=a/mx*(H-PB-PT),hc=c/mx*(H-PB-PT),idx=a>0?c/a*100:NaN;
      return `<g class="rb${isT?' tot':''}" data-ch="${esc(r.ch)}" data-a="${a}" data-c="${c}" style="--d:${i*40}ms">
        <rect class="av" x="${cx-17}" y="${H-PB-ha}" width="34" height="${ha}" rx="4"/>
        <rect class="cw" x="${cx-10}" y="${H-PB-hc}" width="20" height="${hc}" rx="3" fill="${WR_CW}"/>
        <text x="${cx}" y="${H-PB-Math.max(ha,hc)-7}" class="iv${isFinite(idx)&&idx>=100?' up':''}" text-anchor="middle">${isFinite(idx)?Math.round(idx):'–'}</text>
        <text x="${cx}" y="${H-PB+15}" class="nm" text-anchor="middle">${esc(r.ch.length>10?r.ch.slice(0,9)+'…':r.ch)}</text></g>`;}).join('');
    return `<div class="wrrt" style="flex:${rows.length} 0 ${w}px"><div class="h">${lab}</div><svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">
      <line x1="0" x2="${w}" y1="${H-PB}" y2="${H-PB}" class="axl"/>${bars}</svg></div>`;};
  box.innerHTML=wrHs(`<div class="wrrts">${groups.map(chart).join('')}</div>`)+`<div class="wrleg"><span><i class="av"></i>${L('타깃 평균','Target avg')}</span><span><i style="background:${WR_CW}"></i>${L('코웨이','Coway')}</span><span class="n">${L('막대 위 숫자 = 코웨이 ÷ 타깃 평균 × 100','Number = Coway ÷ target avg × 100')}</span></div>`;
  box.querySelectorAll('g.rb').forEach(g=>{g.onmousemove=e=>{const a=+g.dataset.a,c=+g.dataset.c;
    showTip(e.clientX,e.clientY,`<div class="t">${esc(g.dataset.ch)}</div><div class="r"><span class="l">${L('코웨이','Coway')}</span><b>${c.toFixed(3)}%</b></div>
      <div class="r"><span class="l">${L('타깃 평균','Target avg')}</span><b>${a.toFixed(3)}%</b></div><div class="r hi"><span class="l">${L('지수','Index')}</span><b>${a>0?Math.round(c/a*100):'–'}</b></div>`);};g.onmouseleave=hideTip;});}

/* ---------- 소재 온에어 타임라인 ---------- */
function wrTimeline(){
  const box=$('wrTl');if(!box)return;
  const list=[];TV_WR.items.forEach(it=>it.cr.forEach(c=>{if(/^\d{4}-\d\d-\d\d$/.test(c.on||''))list.push({it:it.n,c});}));
  list.sort((a,b)=>a.c.on.localeCompare(b.c.on)||a.it.localeCompare(b.it,'ko'));
  if(!list.length){box.innerHTML=`<div class="card wrcard hint">${L('온에어 날짜가 있는 소재가 없습니다','No creative with an on-air date')}</div>`;return;}
  const SP=196,w=Math.max(list.length*SP+80,600);
  let lastY='';
  const nodes=list.map((x,i)=>{const up=i%2===0,c=x.c,cc=c.c||{},y=c.on.slice(0,4),showY=y!==lastY;lastY=y;
    return `<div class="tn ${up?'up':'dn'}" style="left:${40+i*SP}px;--c:${wrCol(x.it)};--d:${i*70}ms">
      <div class="dot"><span>${String(i+1).padStart(2,'0')}</span></div>${showY?`<div class="yr">${y}</div>`:''}
      <div class="dt">${wrD(c.on)}</div><div class="stem"></div>
      <div class="cd"><div class="t"><i></i>${esc(x.it)}</div><b>${esc(c.n)}</b>
        <div class="kv"><span>GRP</span><em>${wrF(cc.grp,1)}</em><span>eq.GRP</span><em>${wrF(cc.eq,1)}</em><span>R1+</span><em>${wrF(cc.r1,1)}%</em><span>R3+</span><em>${wrF(cc.r3,1)}%</em></div>
        <div class="f">${L('온에어 이후 누적','Cumulative since on-air')}</div></div></div>`;}).join('');
  box.innerHTML=wrHs(`<div class="wrtl" style="width:${w}px"><div class="axis"></div>${nodes}</div>`,'tl');}

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
    +`<div class="card wrcard"><div class="wrwk-top"><div class="wrleg" id="wrWkLeg"></div>
        <div class="seg wrseg" role="tablist"><button type="button" data-wrm="eq" class="${WR_WK.mode==='eq'?'on':''}">eq.GRP</button><button type="button" data-wrm="cost" class="${WR_WK.mode==='cost'?'on':''}">${L('집행금액','Spend')}</button></div></div>
      <div class="wrwk" id="wrWk"></div></div>
    <div class="sec gap sm">${L('채널별 주차 데이터','Weekly data by channel')} <span class="note">${L('당월_주별 · 리포트에 품목별 주차 값이 없어 구분 · PP로 골라 봅니다','Weekly sheet · the report has no weekly split by product, so filter by type · PP')}</span></div>
    <div id="wrWkT"></div>`;
  h.querySelectorAll('[data-wrm]').forEach(b=>b.onclick=()=>{WR_WK.mode=b.dataset.wrm;h.querySelectorAll('[data-wrm]').forEach(x=>x.classList.toggle('on',x===b));wrWeekChart();});
  wrWeekChart();wrWeekTbl();return true;}
function wrWeekChart(){
  const box=$('wrWk');if(!box)return;const S=wrWeekSeries();if(!S.length){box.innerHTML='';return;}
  const M=WR_WK.mode,vi=M==='eq'?0:1;
  /* PP 색 — 지상파 · 케이블 각각 큰 순서로 같은 톤 안에서 밝기 */
  const totK={};S.forEach(b=>Object.entries(b.pp).forEach(([k,x])=>{totK[k]=(totK[k]||0)+(x[0]||0);}));
  const keys=Object.keys(totK).sort((a,b)=>(a.startsWith('지상파')?0:1)-(b.startsWith('지상파')?0:1)||totK[b]-totK[a]);
  const tk=keys.filter(k=>k.startsWith('지상파')),ck=keys.filter(k=>!k.startsWith('지상파'));
  const col={};tk.forEach((k,i)=>col[k]=WR_TONE.t[Math.min(i,WR_TONE.t.length-1)]);ck.forEach((k,i)=>col[k]=WR_TONE.c[Math.min(i,WR_TONE.c.length-1)]);
  const Wd=Math.max(900,box.clientWidth||1100),PL=16,PR=16,TOPB=86,H=430,BOT=58,n=S.length,step=(Wd-PL-PR)/Math.max(n,1),bw=Math.min(46,step*.62);
  const val=b=>vi?b.cost:b.eq,mx=Math.max(...S.map(val))*1.08||1,Y=v=>H-BOT-(v/mx)*(H-BOT-TOPB);
  const cprp=S.map(b=>b.eq>0?b.cost/b.eq:NaN),cm=Math.max(...cprp.filter(isFinite))*1.12||1,cn=Math.min(...cprp.filter(isFinite))*.85||0,CY=v=>14+(1-(v-cn)/((cm-cn)||1))*(TOPB-40);
  let bars='',labs='',months='',lastYm='',grid='';
  for(let i=0;i<=4;i++){const yy=TOPB+(H-BOT-TOPB)*i/4;grid+=`<line x1="${PL}" x2="${Wd-PR}" y1="${yy}" y2="${yy}" class="gl"/>`;}
  S.forEach((b,i)=>{const cx=PL+step*(i+.5);let acc=0;
    const segs=keys.filter(k=>b.pp[k]&&b.pp[k][vi]>0).map(k=>{const v=b.pp[k][vi],y=Y(acc+v),hh=Y(acc)-y;acc+=v;
      return `<rect x="${(cx-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,hh-1).toFixed(1)}" fill="${col[k]}" rx="2"/>`;}).join('');
    const rest=val(b)-acc;const extra=rest>val(b)*.01?`<rect x="${(cx-bw/2).toFixed(1)}" y="${Y(val(b)).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Y(acc)-Y(val(b))).toFixed(1)}" fill="#c9ced3" rx="2"/>`:'';
    bars+=`<g class="wb${b.past?' past':''}" data-i="${i}" style="--d:${i*35}ms">${extra}${segs}<rect class="hit" x="${(cx-step/2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${H}" fill="transparent"/>
      <text x="${cx}" y="${(Y(val(b))-6).toFixed(1)}" class="tv" text-anchor="middle">${vi?wrEok(b.cost):wrF(b.eq,0)}</text></g>`;
    labs+=`<text x="${cx}" y="${H-BOT+16}" class="wl${b.past?' past':''}" text-anchor="middle">${esc(b.l)}</text><text x="${cx}" y="${H-BOT+29}" class="wd${b.past?' past':''}" text-anchor="middle">${wrD(b.s).slice(3)}~${wrD(b.e).slice(3).replace(/^\d+\./,'')}</text>`;
    if(b.ym!==lastYm){lastYm=b.ym;const m=+String(b.ym).slice(5,7);
      months+=`${i?`<line x1="${(cx-step/2).toFixed(1)}" x2="${(cx-step/2).toFixed(1)}" y1="${TOPB-6}" y2="${H-BOT+40}" class="msep"/>`:''}<text x="${(cx-step/2+6).toFixed(1)}" y="${H-BOT+50}" class="mn${b.past?' past':''}">${L(m+'월','M'+m)}${b.past?'':' · '+L('이번 캠페인','this campaign')}</text>`;}});
  /* CPRP 꺾은선 — 위쪽 띠. y 값 표시 없이 점 위에 값만 */
  const pts=S.map((b,i)=>isFinite(cprp[i])?[PL+step*(i+.5),CY(cprp[i]),cprp[i],b.past]:null);
  let path='';pts.forEach((p,i)=>{if(!p)return;path+=(path&&pts[i-1]?' L':' M')+p[0].toFixed(1)+','+p[1].toFixed(1);});
  const cdots=pts.map(p=>p?`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.6" class="cd${p[3]?' past':''}"/><text x="${p[0].toFixed(1)}" y="${(p[1]-8).toFixed(1)}" text-anchor="middle" class="cv${p[3]?' past':''}">${wrF(p[2])}</text>`:'').join('');
  box.innerHTML=`<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}">
    <text x="${PL}" y="10" class="ax">CPRP <tspan class="u">(${L('천원','K KRW')})</tspan></text>
    <line x1="${PL}" x2="${Wd-PR}" y1="${TOPB-12}" y2="${TOPB-12}" class="band"/>
    <path d="${path}" class="cl"/>${cdots}${grid}${months}${bars}${labs}
    <line x1="${PL}" x2="${Wd-PR}" y1="${H-BOT}" y2="${H-BOT}" class="axl"/></svg>`;
  const leg=$('wrWkLeg');
  if(leg)leg.innerHTML=keys.map(k=>`<span><i style="background:${col[k]};opacity:1"></i>${esc(k.split('|')[1])}</span>`).join('')+`<span class="n">${L('흐린 막대 = 지난 캠페인','Faded = past campaigns')}</span>`;
  box.querySelectorAll('g.wb').forEach(g=>{const b=S[+g.dataset.i];
    g.onmousemove=e=>{const rows=keys.filter(k=>b.pp[k]&&(b.pp[k][0]>0||b.pp[k][1]>0)).sort((p,q)=>b.pp[q][vi]-b.pp[p][vi]);
      showTip(e.clientX,e.clientY,`<div class="t">${L(+String(b.ym).slice(5,7)+'월','M'+(+String(b.ym).slice(5,7)))} ${esc(b.l)} · ${wrD(b.s)}~${wrD(b.e)}${b.past?' · '+L('지난 캠페인','past'):''}</div>
        <div class="r hi"><span class="l">eq.GRP</span><b>${wrF(b.eq,1)}</b></div><div class="r"><span class="l">${L('집행금액','Spend')}</span><b>${wrF(b.cost)} ${L('천원','K')}</b></div>
        <div class="r"><span class="l">CPRP</span><b>${wrF(b.eq>0?b.cost/b.eq:NaN)} ${L('천원','K')}</b></div>
        <div class="tsec">PP</div>${rows.map(k=>`<div class="r"><span class="l"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${col[k]}"></i>${esc(k.split('|')[1])}</span><b>${vi?wrEok(b.pp[k][1]):wrF(b.pp[k][0],1)}<span class="sm">${vi?wrF(b.pp[k][0],1)+' eq':wrEok(b.pp[k][1])}</span></b></div>`).join('')}`);
      box.querySelectorAll('g.wb').forEach(x=>x.classList.toggle('dim',x!==g));};
    g.onmouseleave=()=>{hideTip();box.querySelectorAll('g.wb').forEach(x=>x.classList.remove('dim'));};});}
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
