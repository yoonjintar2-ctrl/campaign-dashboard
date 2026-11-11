/* =====================================================================
   캠페인 투어 (v175) — TV · OTT · 디지털 · OOH 를 한 번에 훑는 전체 화면 애니메이션
   · 순서: 표지 → 캠페인 요약 → 매체마다 [목표(계획)] → [실제 집행 · 달성 현황] → 매체별 달성 한 장
   · 값은 화면에 이미 있는 것만(전체 캠페인의 지금 캠페인 줄 · TV 리포트 · 큐시트 · 라인 예상효율). 없는 값은 칸을 만들지 않는다.
   · 조작: ← → · 스페이스(다음) · P(자동 넘김) · Esc(닫기) · 화면 클릭(다음)
   ===================================================================== */
const CT={i:0,slides:[],el:null,auto:false,t:0,rafs:[]};
const ctPct=(a,b)=>b>0&&isFinite(a)?a/b:NaN;
const ctP1=v=>isFinite(v)?(v*100).toFixed(v>=.9995?0:1)+'%':'–';
const ctN=(v,d)=>isFinite(v)?(+v).toLocaleString('ko-KR',{maximumFractionDigits:d||0,minimumFractionDigits:d||0}):'–';
const ctWon=v=>isFinite(v)&&v>0?manUnit(v)+(v<1e8?'':''):'–';
const ctD=s=>s?s.slice(2).replace(/-/g,'.'):'';
async function ctData(){
  const r=ovSelfRow(),a=r.a,today=CAMPAIGN.today||iso(new Date());
  const day=d=>Date.parse(d+'T00:00:00')/864e5;
  const tot=r.start&&r.end?day(r.end)-day(r.start)+1:0,done=tot?Math.max(0,Math.min(tot,day(today)-day(r.start)+1)):0;
  const D={name:CAMPAIGN.name||'',adv:CAMPAIGN.advertiser||'',start:r.start,end:r.end,days:tot,done,elapsed:tot?done/tot:NaN,
    status:ovStatus(r,today),budget:r.budget,media:[]};
  /* --- TV --- */
  let wrHas=false;try{wrHas=wrOn();}catch(e){}
  const cueHas=typeof TV_CUE!=='undefined'&&!!(TV_CUE&&TV_CUE.z);
  /* 리포트형 TV(코웨이)는 계획 · 실적 표가 없어 전체 캠페인 줄에는 안 잡힌다 → 리포트 · 큐시트가 있으면 TV 로 본다 */
  if(campMedia().tv&&(a.tv.has||wrHas||cueHas)){
    const T={k:'tv',l:'TV',plan:a.tv.plan||0,spend:a.tv.spend||0,start:a.tv.start||r.start,end:a.tv.end||r.end,goal:[],act:[],bars:[],split:[],weeks:[]};
    const st=(typeof TV_CUE!=='undefined'&&TV_CUE&&TV_CUE.st)||null;
    let W=null;try{W=wrOn()?TV_WR:null;}catch(e){}
    if(!(T.plan>0)&&W&&wrN((W.wtot||{}).bud)>0)T.plan=W.wtot.bud*1000;
    if(!(T.plan>0)&&W&&wrN((W.tot||{}).bud)>0)T.plan=W.tot.bud*1000;
    if(!(T.plan>0)&&st&&st.budget>0)T.plan=+st.budget;
    const eqT=W?wrEqTarget():NaN,peq=isFinite(eqT)?eqT:(st&&+st.peq)||NaN;
    const pgrp=(st&&+st.pgrp)||a.tv.pgrp||(W&&isFinite(eqT)&&W.tot&&W.tot.eq>0?eqT*W.tot.grp/W.tot.eq:NaN);
    T.goal.push({l:'계획 광고비',v:ctWon(T.plan),n:T.plan,f:'won'});
    if(pgrp>0)T.goal.push({l:'계획 GRP',v:ctN(pgrp,1),n:pgrp,f:'d1'});
    if(peq>0)T.goal.push({l:'목표 eq.GRP',v:ctN(peq,1),n:peq,f:'d1',s:'15초 환산'});
    if(st&&(st.g||st.c))T.goal.push({l:'편성 횟수',v:ctN((st.g||0)+(st.c||0))+'회',n:(st.g||0)+(st.c||0),f:'cnt',u:'회',s:`지상파 ${ctN(st.g||0)} · 케이블 ${ctN(st.c||0)}`});
    /* 품목 · 지상파/케이블 — 큐시트 예산 */
    try{if(TV_CUE&&TV_CUE.z){if(CUE.key!==cueKeyOf()){CUE.json=await cueUngz(TV_CUE.z);CUE.key=cueKeyOf();}
      const M=cueMixData();if(M){T.bars=M.items.slice(0,7).map(x=>({l:x.n,v:x.sub.bud*1000,c:x.col||'#8b9097'}));
        const g={지상파:0,케이블:0};M.chs.forEach(c=>g[c.g]+=c.bud*1000);T.split=[['지상파',g.지상파],['케이블 · 종편',g.케이블]].filter(x=>x[1]>0);}}}catch(e){}
    if(!T.bars.length&&W)T.bars=W.items.map(it=>({l:it.n,v:(wrN(it.sub&&it.sub.bud)||0)*1000,c:wrCueCol(it.n)})).filter(x=>x.v>0).sort((x,y)=>y.v-x.v).slice(0,7);
    if(W){const t=W.tot||{},wt=W.wtot||{};
      if(!(T.spend>0)&&wrN(wt.cost)>0)T.spend=wt.cost*1000;
      T.act.push({l:'집행 광고비',v:ctWon(T.spend),p:ctPct(T.spend,T.plan),s:`계획 ${ctWon(T.plan)}`});
      if(wrN(t.grp)>0)T.act.push({l:'GRP',v:ctN(t.grp,1),p:ctPct(t.grp,pgrp),s:pgrp>0?`계획 ${ctN(pgrp,1)}`:''});
      if(wrN(t.eq)>0)T.act.push({l:'eq.GRP',v:ctN(t.eq,1),p:ctPct(t.eq,peq),s:peq>0?`목표 ${ctN(peq,1)}`:''});
      if(isFinite(wrN(t.r1)))T.act.push({l:'Reach 1+',v:t.r1.toFixed(1)+'%',p:t.r1/100,s:'타깃 도달률',rch:1});
      if(isFinite(wrN(t.r3)))T.act.push({l:'Reach 3+',v:t.r3.toFixed(1)+'%',p:t.r3/100,s:'유효 도달률',rch:1});
      T.weeks=(W.weeks||[]).map((w,i)=>({l:w.l,v:(((wt.w||[])[i]||[])[1]||0)*1000})).filter(x=>x.v>0);
      T.tgt=W.tgt||'';}
    else if(T.spend>0){T.act.push({l:'집행 광고비',v:ctWon(T.spend),p:ctPct(T.spend,T.plan),s:`계획 ${ctWon(T.plan)}`});
      if(a.tv.grp>0)T.act.push({l:'GRP',v:ctN(a.tv.grp,1),p:ctPct(a.tv.grp,pgrp),s:pgrp>0?`계획 ${ctN(pgrp,1)}`:''});}
    T.rate=ctPct(T.spend,T.plan);D.media.push(T);}
  /* --- 디지털 · OTT (같은 엔진) --- */
  [['digital','디지털'],['ott','OTT']].forEach(([k,l])=>{const x=a[k];if(!x.inc||!x.has)return;
    const ls=LINES.filter(q=>(k==='ott')===isOttMedia(q.media));let E=null;try{E=aggExp(ls);}catch(e){}
    const M={k,l,plan:x.budget||0,spend:x.spend||0,start:x.start,end:x.end,goal:[],act:[],bars:[],split:[],weeks:[]};
    M.goal.push({l:'예산',v:ctWon(M.plan),n:M.plan,f:'won'});
    const ex={imp:E&&+E.imp||0,view:E&&+E.view||0,click:E&&+E.click||0};
    if(ex.imp>0)M.goal.push({l:'예상 노출',v:ctN(ex.imp),n:ex.imp,f:'cnt'});
    if(ex.view>0)M.goal.push({l:'예상 조회',v:ctN(ex.view),n:ex.view,f:'cnt'});
    if(ex.click>0)M.goal.push({l:'예상 클릭',v:ctN(ex.click),n:ex.click,f:'cnt'});
    const by={};ls.forEach(q=>{const n=String(q.media||'기타').trim()||'기타';by[n]=(by[n]||0)+(+lineGross(q)||0);});
    const tones=['#3e4248','#5d626a','#7c8189','#9a9fa6','#b5b9be','#cdd0d4','#dddfe2'];
    M.bars=Object.entries(by).filter(z=>z[1]>0).sort((p,q)=>q[1]-p[1]).slice(0,7).map(([n,v],i)=>({l:n,v,c:tones[Math.min(i,6)]}));
    M.act.push({l:'집행 금액',v:ctWon(M.spend),p:ctPct(M.spend,M.plan),s:`예산 ${ctWon(M.plan)}`});
    if(x.imp>0)M.act.push({l:'노출',v:ctN(x.imp),p:ctPct(x.imp,ex.imp),s:ex.imp>0?`예상 ${ctN(ex.imp)}`:''});
    if(x.view>0)M.act.push({l:'조회',v:ctN(x.view),p:ctPct(x.view,ex.view),s:ex.view>0?`예상 ${ctN(ex.view)}`:''});
    if(x.click>0)M.act.push({l:'클릭',v:ctN(x.click),p:ctPct(x.click,ex.click),s:ex.click>0?`예상 ${ctN(ex.click)}`:''});
    if(x.view>0&&x.imp>0)M.act.push({l:'VTR',v:(x.view/x.imp*100).toFixed(1)+'%',p:x.view/x.imp,s:'조회 ÷ 노출',rch:1});
    M.rate=ctPct(M.spend,M.plan);D.media.push(M);});
  /* --- OOH (계획만) --- */
  if(a.ooh.inc&&a.ooh.has){const O={k:'ooh',l:'OOH',plan:a.ooh.budget||0,spend:0,start:a.ooh.start,end:a.ooh.end,
    goal:[{l:'광고비',v:ctWon(a.ooh.budget),n:a.ooh.budget,f:'won'},{l:'지면',v:ctN(a.ooh.slots||a.ooh.n)+'곳',n:a.ooh.slots||a.ooh.n,f:'cnt',u:'곳'}],act:[],bars:[],split:[],weeks:[],rate:NaN};D.media.push(O);}
  D.media.sort((x,y)=>['tv','ott','digital','ooh'].indexOf(x.k)-['tv','ott','digital','ooh'].indexOf(y.k));
  D.budget=D.media.reduce((s,m)=>s+(m.plan||0),0)||D.budget;
  D.spend=D.media.reduce((s,m)=>s+(m.spend||0),0);
  return D;}

/* ---------- 조각 ---------- */
const CT_TONE={tv:'#33373d',ott:'#6b7078',digital:'#9a9fa6',ooh:'#c2c5c9'};
function ctGauge(g,i){const p=isFinite(g.p)?Math.max(0,g.p):NaN,w=isFinite(p)?Math.min(p,1):0,over=p>1.0005;
  return `<div class="ctg${g.rch?' rch':''}${over?' over':''}" style="--p:${w.toFixed(4)};--d:${180+i*130}ms">
    <div class="tx"><span class="l">${esc(g.l)}</span><b>${esc(g.v)}</b>${g.s?`<span class="s">${esc(g.s)}</span>`:''}</div>
    ${isFinite(p)?`<div class="gb"><div class="gt"><i></i></div><span class="pc" data-n="${(p*100).toFixed(1)}" data-f="pct">0%</span></div>`:'<div class="gb none"></div>'}</div>`;}
function ctBars(bars,i0){const mx=Math.max(1,...bars.map(b=>b.v)),tot=bars.reduce((s,b)=>s+b.v,0)||1;
  return `<div class="ctbars">${bars.map((b,i)=>`<div class="r" style="--d:${(i0||0)+200+i*90}ms"><span class="n">${esc(b.l)}</span>
    <span class="bar"><i style="--w:${(b.v/mx*100).toFixed(1)}%;background:${b.c}"></i></span><span class="v"><b>${ctWon(b.v)}</b><em>${Math.round(b.v/tot*100)}%</em></span></div>`).join('')}</div>`;}
function ctHead(step,title,sub){return `<div class="cth"><span class="st">${step}</span><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>`;}
function ctSlides(D){
  const S=[],per=D.start?`${ctD(D.start)} — ${ctD(D.end)}`:'',stL={live:'진행 중',pre:'집행 예정',done:'집행 종료'}[D.status]||'';
  const tags=D.media.map(m=>`<span class="tag">${m.l}</span>`).join('');
  /* 0 표지 */
  S.push(`<div class="cts cover"><div class="adv a1">${esc(D.adv)}</div><h1 class="a2">${esc(D.name)}</h1>
    <div class="meta a3"><span>${per}</span>${stL?`<span class="stt ${D.status}">${stL}</span>`:''}</div><div class="tags a4">${tags}</div>
    <div class="line a5"></div><div class="cap a5">CAMPAIGN TOUR</div></div>`);
  /* 1 캠페인 요약 */
  const bt=D.media.reduce((s,m)=>s+(m.plan||0),0)||1;
  S.push(`<div class="cts sum">${ctHead('캠페인 요약','한눈에 보는 캠페인',`${esc(D.adv)} · ${esc(D.name)}`)}
    <div class="grid2"><div class="hero a2"><span class="l">총 광고비</span><b data-n="${D.budget}" data-f="won">0</b>
        <span class="s">집행 ${ctWon(D.spend)}${D.budget>0&&D.spend>0?` · 소진 ${ctP1(D.spend/D.budget)}`:''}</span></div>
      <div class="hero a3"><span class="l">기간</span><b>${D.days?ctN(D.days)+'일':'–'}</b><span class="s">${per}${isFinite(D.elapsed)?` · ${D.status==='done'?'종료':D.status==='pre'?'시작 전':ctP1(D.elapsed)+' 경과'}`:''}</span>
        ${isFinite(D.elapsed)?`<div class="tl"><i style="--p:${Math.min(1,D.elapsed).toFixed(4)}"></i></div>`:''}</div></div>
    <div class="stack a4">${D.media.map((m,i)=>`<i style="--w:${((m.plan||0)/bt*100).toFixed(2)}%;background:${CT_TONE[m.k]};--d:${500+i*140}ms" title="${m.l}"></i>`).join('')}</div>
    <div class="legend a5">${D.media.map(m=>`<div class="lg"><i style="background:${CT_TONE[m.k]}"></i><span>${m.l}</span><b>${ctWon(m.plan)}</b><em>${Math.round((m.plan||0)/bt*100)}%</em></div>`).join('')}</div></div>`);
  /* 매체마다 목표 → 실제 */
  D.media.forEach(m=>{const pr=m.start?`${ctD(m.start)} — ${ctD(m.end)}`:'';
    S.push(`<div class="cts goal">${ctHead(`${m.l} · 목표`,`${m.l} 계획`,[pr,m.tgt?`타깃 ${esc(m.tgt)}`:''].filter(Boolean).join(' · '))}
      <div class="kpis">${m.goal.map((g,i)=>`<div class="kp" style="--d:${160+i*120}ms"><span class="l">${esc(g.l)}</span><b data-n="${g.n}" data-f="${g.f}" data-u="${g.u||''}">${esc(g.v)}</b>${g.s?`<span class="s">${esc(g.s)}</span>`:''}</div>`).join('')}</div>
      ${m.bars.length?`<div class="blk"><div class="bt">${m.k==='tv'?'품목별 예산':'매체별 예산'}</div>${ctBars(m.bars,m.goal.length*120)}</div>`:''}
      ${m.split.length>1?`<div class="split a5">${m.split.map(([n,v])=>`<span><i></i>${n} <b>${ctWon(v)}</b> <em>${Math.round(v/m.split.reduce((s,x)=>s+x[1],0)*100)}%</em></span>`).join('')}</div>`:''}</div>`);
    if(m.act.length){const mxw=Math.max(1,...m.weeks.map(w=>w.v));
      S.push(`<div class="cts act">${ctHead(`${m.l} · 실제 집행`,`${m.l} 달성 현황`,isFinite(m.rate)?`계획 대비 ${ctP1(m.rate)} 집행`:'')}
        <div class="gs n${Math.min(m.act.length,5)}">${m.act.map(ctGauge).join('')}</div>
        ${m.weeks.length>1?`<div class="blk"><div class="bt">주차별 집행금액</div><div class="wk">${m.weeks.map((w,i)=>`<div class="c" style="--d:${700+i*90}ms"><em>${ctWon(w.v)}</em><i style="--h:${(w.v/mxw*100).toFixed(1)}%"></i><span>${esc(w.l)}</span></div>`).join('')}</div></div>`:''}</div>`);}
    else if(m.k!=='ooh')S.push(`<div class="cts act empty">${ctHead(`${m.l} · 실제 집행`,`${m.l} 달성 현황`,'')}
        <div class="wait a2"><b>집행 데이터 집계 전</b><span>실적 자료가 올라오면 이 장에 계획 대비 달성률이 나옵니다.</span></div></div>`);});
  /* 마지막 — 매체별 달성 한 장 */
  const fin=D.media.filter(m=>m.plan>0);
  if(fin.length)S.push(`<div class="cts fin">${ctHead('종합','매체별 달성 현황',`총 광고비 ${ctWon(D.budget)} · 집행 ${ctWon(D.spend)}`)}
    <div class="rows">${fin.map((m,i)=>{const p=m.rate,w=isFinite(p)?Math.min(1,Math.max(0,p)):0;
      return `<div class="row" style="--d:${200+i*150}ms;--p:${w.toFixed(4)}"><span class="n"><i style="background:${CT_TONE[m.k]}"></i>${m.l}</span>
        <span class="tr"><i></i></span><span class="pc">${isFinite(p)&&m.spend>0?`<b data-n="${(p*100).toFixed(1)}" data-f="pct">0%</b>`:'<b class="na">집계 전</b>'}</span>
        <span class="am">${m.spend>0?ctWon(m.spend):'–'} <em>/ ${ctWon(m.plan)}</em></span></div>`;}).join('')}</div>
    <div class="end a5">${esc(D.adv)} · ${esc(D.name)}</div></div>`);
  return S;}

/* ---------- 재생 ---------- */
function ctFmt(v,f){return f==='won'?ctWon(v):f==='pct'?(v>=99.95?Math.round(v):v.toFixed(1))+'%':f==='d1'?ctN(v,1):f==='cnt'?ctN(Math.round(v)):ctN(v);}
function ctCount(root){
  CT.rafs.forEach(cancelAnimationFrame);CT.rafs=[];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('[data-n]').forEach(el=>{const to=+el.dataset.n,f=el.dataset.f,u=el.dataset.u||'';
    if(!isFinite(to)||!(to>0)){return;}
    const fin=ctFmt(to,f)+u;
    if(reduce){el.textContent=fin;return;}
    const t0=performance.now()+260,dur=1100;
    const tick=t=>{const k=Math.max(0,Math.min(1,(t-t0)/dur)),e=1-Math.pow(1-k,3);el.textContent=k>=1?fin:ctFmt(to*e,f)+u;if(k<1)CT.rafs.push(requestAnimationFrame(tick));};
    CT.rafs.push(requestAnimationFrame(tick));});}
function ctGo(i,dir){
  if(!CT.el)return;const n=CT.slides.length;i=Math.max(0,Math.min(n-1,i));
  const st=CT.el.querySelector('.ctstage'),old=st.firstElementChild;
  const nu=document.createElement('div');nu.className='ctwrap '+(dir<0?'fromL':'fromR');nu.innerHTML=CT.slides[i];
  if(old){old.classList.add(dir<0?'outR':'outL');setTimeout(()=>old.remove(),420);}
  st.appendChild(nu);CT.i=i;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{nu.classList.add('go');ctCount(nu);}));
  CT.el.querySelector('.ctdots').innerHTML=CT.slides.map((_,k)=>`<i class="${k===i?'on':k<i?'past':''}" data-k="${k}"></i>`).join('');
  CT.el.querySelectorAll('.ctdots i').forEach(d=>d.onclick=e=>{e.stopPropagation();ctGo(+d.dataset.k,+d.dataset.k<CT.i?-1:1);});
  CT.el.querySelector('.ctnum').textContent=`${i+1} / ${n}`;
  CT.el.querySelector('.ctprev').disabled=i===0;CT.el.querySelector('.ctnext').disabled=i===n-1;
  clearTimeout(CT.t);if(CT.auto&&i<n-1)CT.t=setTimeout(()=>ctGo(CT.i+1,1),6500);
  if(CT.auto&&i===n-1){CT.auto=false;ctPaintAuto();}}
function ctPaintAuto(){const b=CT.el&&CT.el.querySelector('.ctauto');if(b){b.classList.toggle('on',CT.auto);b.textContent=CT.auto?'❚❚ 자동 넘김':'▶ 자동 넘김';}}
function ctKey(e){
  if(!CT.el)return;
  if(e.key==='Escape'){e.preventDefault();ctClose();}
  else if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();ctGo(CT.i+1,1);}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();ctGo(CT.i-1,-1);}
  else if(e.key==='p'||e.key==='P'||e.key==='ㅔ'){CT.auto=!CT.auto;ctPaintAuto();ctGo(CT.i,1);}}
function ctClose(){clearTimeout(CT.t);CT.rafs.forEach(cancelAnimationFrame);CT.auto=false;
  document.removeEventListener('keydown',ctKey,true);
  if(CT.el){const e=CT.el;CT.el=null;e.classList.add('bye');setTimeout(()=>e.remove(),260);}
  document.documentElement.classList.remove('ct-on');}
async function ctOpen(){
  if(CT.el)return;
  let D;try{D=await ctData();}catch(e){showToast('캠페인 투어를 열지 못했습니다',(e&&e.message)||String(e),{kind:'warn'});return;}
  if(!D.media.length){showToast('보여 줄 매체 데이터가 없습니다','예산이나 계획이 들어간 매체가 있어야 합니다.',{kind:'warn'});return;}
  CT.slides=ctSlides(D);CT.i=0;CT.auto=false;
  const el=document.createElement('div');el.className='ct';el.setAttribute('role','dialog');el.setAttribute('aria-label','캠페인 투어');
  el.innerHTML=`<div class="ctbg"></div><div class="cttop"><span class="ctnum"></span><span class="hint">← → 넘기기 · P 자동 넘김 · Esc 닫기</span>
      <button type="button" class="ctauto">▶ 자동 넘김</button><button type="button" class="ctx" aria-label="닫기">✕</button></div>
    <div class="ctstage"></div>
    <button type="button" class="ctprev" aria-label="이전">‹</button><button type="button" class="ctnext" aria-label="다음">›</button><div class="ctdots"></div>`;
  document.body.appendChild(el);CT.el=el;document.documentElement.classList.add('ct-on');
  el.querySelector('.ctx').onclick=e=>{e.stopPropagation();ctClose();};
  el.querySelector('.ctauto').onclick=e=>{e.stopPropagation();CT.auto=!CT.auto;ctPaintAuto();ctGo(CT.i,1);};
  el.querySelector('.ctprev').onclick=e=>{e.stopPropagation();ctGo(CT.i-1,-1);};
  el.querySelector('.ctnext').onclick=e=>{e.stopPropagation();ctGo(CT.i+1,1);};
  el.querySelector('.ctstage').onclick=()=>ctGo(CT.i+1,1);
  document.addEventListener('keydown',ctKey,true);
  ctGo(0,1);}
(function(){const b=document.getElementById('ctBtn');if(b)b.onclick=()=>{try{ctOpen();}catch(e){}};})();
