/* =====================================================================
   v205 — 먼슬리 리포트 › 품목 선택 바로 위
   ① TV 실집행 추정금액 (먼슬리 리포트 PDF 5~13p '월별 경쟁사 TV 광고비')
      RPT_DOC.tvx = {m, src, cats:[{k,l,hl,b:{브랜드:[1~12월 천원]}}]}
      · 왼쪽 = 1~12월 막대(합계) · 이번 달 강조 · 다음 달부터는 빈 칸
        막대에 마우스를 올리면 블록이 갈라지며 광고주별 금액
      · 오른쪽 = 이번 달 광고주별 3D 도넛 · 토글로 누적
   ② TV KPI 요약 (PDF 14p) — 지상파 · 케이블 두 장
      RPT_DOC.kpi = {m, hl, rows:[{g:'t'|'c'|'s', t:종류, n:이름, tl:목표 이름, tg:목표값, v:[12], c:누적, st}]}
      · 위 = 전품목 실집행 CPRP(경쟁사 대비 우위 %) 꺾은선 — 큰 표식 안에 값
      · 아래 = 같은 칸 안에서 다른 세로축(로그) — PP별 보너스율의 최고~최저를 잇는 떠 있는 막대,
        막대 안 가로선 = PP마다(이름 표기) · 나머지 값은 마우스를 올리면
   ===================================================================== */
const RPX={c:'',d:'m'};
const RPX_PAL=['#7f8994','#a08b6e','#6d958f','#8a7ca3','#b28a62','#7b8ea6','#a77786','#7f9875','#968f72'];
function rpxCols(cat){const bs=Object.keys(cat.b).sort((a,b)=>(b==='코웨이')-(a==='코웨이')||rpSum(cat.b[b])-rpSum(cat.b[a]));const m={};let i=0;
  bs.forEach(b=>m[b]=b==='코웨이'?RPT_CW:RPX_PAL[i++%RPX_PAL.length]);return {bs,m};}
function rpTvx(){
  const h=$('rpTvx');if(!h)return;const D=RPT_DOC&&RPT_DOC.tvx;
  if(!D||!(D.cats||[]).length){h.innerHTML='';return;}
  const M=RPT_DOC.m||D.m,cats=D.cats;
  if(!cats.some(c=>c.k===RPX.c)){const f=cats.find(c=>rpSum(Object.values(c.b).map(a=>rN(a[M-1])))>0)||cats[0];RPX.c=f.k;}
  const cat=cats.find(c=>c.k===RPX.c),mAmt=c=>rpSum(Object.values(c.b).map(a=>rN(a[M-1])));
  h.innerHTML=`<div class="sec">${L('TV 실집행 추정금액','TV estimated actual spend')} <span class="note">${L(`${M}월 · 코웨이 = 실집행, 경쟁사 = 닐슨 모니터링 기반 SM C&C 추정 · 단위 천원`,`M${M} · Coway = actual, others = estimated`)}</span></div>
    ${rpChips(cats.map(c=>({k:c.k,l:c.l,s:mAmt(c)>0?wrEok(mAmt(c)):'–'})),RPX.c,'data-rpxc')}
    ${cat.hl?`<div class="rpxhl">${esc(cat.hl)}</div>`:''}
    <div class="rpgrid2 w64">
      ${rpCard(L('월별 광고비','Monthly spend'),L('막대에 마우스를 올리면 광고주별로 나뉩니다','hover a bar to split by advertiser'),`<div id="rpxBars" class="rpxbars"></div>`)}
      ${rpCard(RPX.d==='m'?L(`${M}월 광고주별 비중`,`M${M} share`):L(`1~${M}월 누적 광고주별 비중`,`YTD share`),'',`<div id="rpxDn" class="rp3dbox"></div>`,rpSeg([{k:'m',l:L(`${M}월`,`M${M}`)},{k:'ytd',l:L('누적','YTD')}],RPX.d,'data-rpxd'),'rpfill')}</div>`;
  h.querySelectorAll('[data-rpxc]').forEach(b=>b.onclick=()=>{RPX.c=b.dataset.rpxc;rpTvx();});
  h.querySelectorAll('[data-rpxd]').forEach(b=>b.onclick=()=>{RPX.d=b.dataset.rpxd;rpTvx();});
  rpxBars(cat,M);rpxDonut(cat,M);rpGo(h);}
function rpxBars(cat,M){
  const box=$('rpxBars');if(!box)return;const {bs,m:col}=rpxCols(cat);
  const W=Math.max(560,box.clientWidth||700),H=270,padL=14,padR=14,base=H-30,top=44,slot=(W-padL-padR)/12,bw=Math.min(46,slot*.56);
  const tot=[...Array(12)].map((_,i)=>rpSum(bs.map(b=>rN(cat.b[b][i])))),mx=Math.max(...tot,1);
  const y=v=>base-(base-top)*v/mx,f=v=>v.toFixed(1),tw2=t=>[...String(t)].reduce((a,ch)=>a+(/[가-힣]/.test(ch)?12:7.4),0);
  let g='';
  for(let i=0;i<12;i++){const cx=padL+slot*(i+.5),x0=cx-bw/2,cur=i===M-1,fut=i>=M,t=tot[i];
    if(fut){g+=`<rect class="fut" x="${f(x0)}" y="${base-26}" width="${f(bw)}" height="26" rx="5"/>`;}
    else if(t>0){let acc=0,rects='',txts='';const ord=bs.filter(b=>rN(cat.b[b][i])>0);
      ord.forEach((b,k)=>{const v=rN(cat.b[b][i]),y1=y(acc+v),y0=y(acc),last=k===ord.length-1,ext=last?0:3;acc+=v;
        /* 아래 블록부터 그리고 위 블록이 아래 블록 꼭대기(3px)를 덮는다 → 평소에는 한 덩어리 막대 */
        rects+=`<rect class="sg" x="${f(x0)}" y="${f(y1-ext)}" width="${f(bw)}" height="${f(Math.max(1,y0-y1+ext))}" rx="${last?5:2}" style="--bc:${col[b]};--k:${k}"/>`;
        if(y0-y1>=15)txts+=`<text class="sl" x="${f(cx)}" y="${f((y0+y1)/2+3.5)}" text-anchor="middle" style="--k:${k}">${esc(Array.from(b).slice(0,4).join(''))}</text>`;});
      g+=`<g class="tb${cur?' cur':''}" data-tip="${i}" style="--d:${i*45}ms">${rects}${txts}</g>`
        +(cur?(()=>{const tx=wrEok(t),w2=tw2(tx)+18,yy=y(t)-30;return `<g class="tvc" style="--d:${i*45+300}ms"><rect x="${f(cx-w2/2)}" y="${f(yy)}" width="${f(w2)}" height="22" rx="11"/><path d="M${f(cx-5)},${f(yy+21.5)} L${f(cx)},${f(yy+27)} L${f(cx+5)},${f(yy+21.5)} Z"/><text x="${f(cx)}" y="${f(yy+15.5)}" text-anchor="middle">${tx}</text></g>`;})()
          :`<text class="tv" x="${f(cx)}" y="${f(y(t)-9)}" text-anchor="middle" style="--d:${i*45+300}ms">${wrEok(t)}</text>`);}
    else g+=`<text class="tv nil" x="${f(cx)}" y="${base-8}" text-anchor="middle">–</text>`;
    g+=`<text class="mo${cur?' cur':''}${fut?' fut':''}" x="${f(cx)}" y="${base+20}" text-anchor="middle">${L(`${i+1}월`,String(i+1))}</text>`;}
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpxsvg"><line class="bl" x1="${padL}" x2="${W-padR}" y1="${base}" y2="${base}"/>${g}</svg>`;
  const svg=box.querySelector('svg');
  svg.querySelectorAll('.tb').forEach(t=>{t.onmouseenter=()=>{t.classList.add('on');svg.classList.add('hot');};t.onmouseleave=()=>{t.classList.remove('on');svg.classList.remove('hot');};});
  rpTipWire(box,i=>{i=+i;const t=tot[i];if(!t)return '';const rows=bs.filter(b=>rN(cat.b[b][i])>0).sort((a,b)=>rN(cat.b[b][i])-rN(cat.b[a][i]));
    return `<div class="t">${esc(cat.l)} · ${L(`${i+1}월`,`M${i+1}`)}</div>${rows.map(b=>`<div class="r"><span class="l"><i class="sw" style="background:${col[b]}"></i>${esc(b)}</span><b>${wrEok(cat.b[b][i])} · ${rpP(rN(cat.b[b][i])/t*100)}</b></div>`).join('')}${rpTr(L('합계','Total'),wrEok(t))}`;});
  rpGo(box);}
function rpxDonut(cat,M){
  const box=$('rpxDn');if(!box)return;const {bs,m:col}=rpxCols(cat);
  const val=b=>RPX.d==='m'?rN(cat.b[b][M-1]):rpSum(cat.b[b].slice(0,M).map(rN));
  const segs=bs.map(b=>({n:b,v:val(b),col:col[b]})).filter(x=>x.v>0).sort((a,b)=>(b.n==='코웨이')-(a.n==='코웨이')||b.v-a.v);
  if(!segs.length){box.innerHTML=`<div class="hint rpnil">${RPX.d==='m'?L(`${M}월 TV 집행 없음`,'No TV spend this month'):L('집행 없음','No spend')}</div>`;return;}
  rp3dDonut(box,segs,'코웨이',{lr:true});}   /* v206 — 카드는 조각이 있는 쪽에(안내선이 도넛을 가로지르지 않게) */

/* ---------------- ② TV KPI 요약 ---------------- */
function rpKpi(){
  const h=$('rpKpi');if(!h)return;const K=RPT_DOC&&RPT_DOC.kpi;
  if(!K||!(K.rows||[]).length){h.innerHTML='';return;}
  const M=RPT_DOC.m||K.m;
  h.innerHTML=`<div class="sec">${L('TV KPI 요약','TV KPI summary')} <span class="note">${L(`F30-45 · 1~${M}월`,`F30-45 · M1–${M}`)}</span></div>
    ${K.hl?`<div class="rpxhl">${esc(K.hl)}</div>`:''}
    <div class="rpgrid2">
      ${rpCard(L('지상파 TV','Terrestrial'),L('꺾은선 = 실집행 CPRP 경쟁사 대비 우위 · 막대 = 채널별 보너스율(위 최고 · 아래 최저) · 아래 = 시급 · CM 위치','line = CPRP advantage · bar = bonus range'),`<div class="rpkpi" data-g="t"></div>`)}
      ${rpCard(L('케이블 TV','Cable'),L('꺾은선 = 실집행 CPRP 경쟁사 대비 우위 · 막대 = PP별 보너스율(위 최고 · 아래 최저) · 아래 = 중CM 비중','line = CPRP advantage · bar = bonus range'),`<div class="rpkpi" data-g="c"></div>`)}</div>`;
  h.querySelectorAll('.rpkpi').forEach(b=>rpKpiChart(b,K,M));
  rpGo(h);}
function rpKpiChart(box,K,M){
  const g=box.dataset.g,rows=K.rows.filter(r=>r.g===g),cp=rows.find(r=>r.t==='cprp'),bo=rows.filter(r=>r.t==='bonus');
  const W=Math.max(440,box.clientWidth||560),padL=16,padR=58,slot=(W-padL-padR)/12,f=v=>v.toFixed(1),has=v=>v!=null&&isFinite(+v);
  const lTop=30,lBot=136,bTop=176,bBot=376,mY=bBot+22,H=mY+8;
  const cv=cp?cp.v:[],cMax=Math.max(60,...cv.filter(has).map(v=>+v+12)),ly=v=>lBot-(lBot-lTop)*v/cMax;
  const all=bo.flatMap(r=>r.v.filter(has).map(Number).filter(v=>v>0)).concat(bo.map(r=>rN(r.tg)).filter(v=>v>0));
  const lo=Math.log10(Math.min(...all)*.8),hi=Math.log10(Math.max(...all)*1.15),by=v=>bBot-(bBot-bTop)*(Math.log10(v)-lo)/(hi-lo||1);
  let s='';
  /* 보너스 축 눈금(오른쪽) — 숫자 그대로 */
  [200,300,500,1000,2000,3000,5000,10000].filter(v=>Math.log10(v)>lo&&Math.log10(v)<hi).forEach(v=>{s+=`<text class="ax" x="${W-padR+8}" y="${f(by(v)+3.5)}">${v}%</text><line class="gl" x1="${padL}" x2="${W-padR}" y1="${f(by(v))}" y2="${f(by(v))}"/>`;});
  s+=`<text class="axt" x="${W-padR+8}" y="${bTop-14}">${L('보너스율','Bonus')}</text><text class="axt" x="${padL}" y="${lTop-12}">${L('실집행 CPRP 우위','CPRP advantage')}</text>`;
  if(cp&&rN(cp.tg)>0)s+=`<line class="tgl" x1="${padL}" x2="${W-padR}" y1="${f(ly(cp.tg))}" y2="${f(ly(cp.tg))}"/><text class="tgt" x="${W-padR+8}" y="${f(ly(cp.tg)+3.5)}">${L('목표','Target')} ${cp.tg}%</text>`;
  const sh=n=>({'tvN 외 CJ':'CJ','JTBC 외':'JTBC외'}[n]||n);
  const tw=t=>[...String(t)].reduce((a,ch)=>a+(/[가-힣]/.test(ch)?8.6:5.6),0);
  for(let i=0;i<12;i++){const cx=padL+slot*(i+.5),bw=Math.min(66,slot*.8),x0=cx-bw/2,cur=i===M-1;
    s+=`<text class="mo${cur?' cur':''}${i>=M?' fut':''}" x="${f(cx)}" y="${mY}" text-anchor="middle">${L(`${i+1}월`,String(i+1))}</text>`;
    if(i>=M){s+=`<rect class="fut" x="${f(x0)}" y="${f((bTop+bBot)/2-14)}" width="${f(bw)}" height="28" rx="7"/>`;continue;}
    const vs=bo.map(r=>({r,v:+r.v[i]})).filter(x=>has(x.r.v[i])&&x.v>0);if(!vs.length)continue;
    const mxV=Math.max(...vs.map(x=>x.v)),mnV=Math.min(...vs.map(x=>x.v));let y1=by(mxV)-5,y2=by(mnV)+5;
    const L2=vs.slice().sort((a,b)=>b.v-a.v).map(x=>({...x,y:by(x.v),ty:by(x.v)}));
    const GAP=cur?12.5:9;for(let k=1;k<L2.length;k++)if(L2[k].ty-L2[k-1].ty<GAP)L2[k].ty=L2[k-1].ty+GAP;
    if(L2.length&&!cur){y1=Math.min(y1,L2[0].ty-7);const ov=L2[L2.length-1].ty+7-y2;if(ov>0)y2+=ov;}
    let lines='',outs='';
    /* 이번 달은 이름 + % 를 막대 오른쪽 바깥에(다음 달 칸은 비어 있다) — 12월이면 왼쪽 */
    const rt=i<11;
    L2.forEach(x=>{
      if(cur){lines+=`<line class="pl" x1="${f(x0+4)}" x2="${f(x0+bw-4)}" y1="${f(x.y)}" y2="${f(x.y)}"/>`;
        const lx=rt?x0+bw+6:x0-6;outs+=`<line class="pk2" x1="${f(rt?x0+bw:x0)}" y1="${f(x.y)}" x2="${f(rt?lx-2:lx+2)}" y2="${f(x.ty)}"/><text class="po" x="${f(lx)}" y="${f(x.ty+3)}" text-anchor="${rt?'start':'end'}"><tspan class="n">${esc(sh(x.r.n))}</tspan> ${x.v.toLocaleString()}%</text>`;}
      else{const lw=Math.max(6,bw-8-tw(sh(x.r.n))-5);
        lines+=`<line class="pl" x1="${f(x0+4)}" x2="${f(x0+4+lw)}" y1="${f(x.y)}" y2="${f(x.y)}"/>`
          +(Math.abs(x.ty-x.y)>1?`<line class="pk" x1="${f(x0+4+lw)}" y1="${f(x.y)}" x2="${f(x0+6+lw)}" y2="${f(x.ty)}"/>`:'')
          +`<text class="pn" x="${f(x0+bw-4)}" y="${f(x.ty+3)}" text-anchor="end">${esc(sh(x.r.n))}</text>`;}});
    /* 맨 위 · 맨 아래 값 */
    const dl=cur?'':`<text class="dv" x="${f(cx)}" y="${f(y1-5)}" text-anchor="middle">${mxV.toLocaleString()}%</text>`+(vs.length>1?`<text class="dv" x="${f(cx)}" y="${f(y2+11)}" text-anchor="middle">${mnV.toLocaleString()}%</text>`:'');
    s+=`<g class="fb${cur?' cur':''}" data-tip="b${i}" style="--d:${i*50}ms"><rect class="fr" x="${f(x0)}" y="${f(y1)}" width="${f(bw)}" height="${f(y2-y1)}" rx="8"/>${lines}</g>${dl}${outs}`;}
  if(cp){const pts=cv.map((v,i)=>has(v)&&i<M?[padL+slot*(i+.5),ly(+v),i]:null).filter(Boolean);
    s+=`<path class="cl" d="${rpSmooth(pts.map(p=>[p[0],p[1]]),true,.2)}" pathLength="1"/>`
      +pts.map(p=>`<g class="cp${p[2]===M-1?' cur':''}" data-tip="l${p[2]}" style="--d:${700+p[2]*60}ms"><circle cx="${f(p[0])}" cy="${f(p[1])}" r="17"/><text x="${f(p[0])}" y="${f(p[1]+3.8)}" text-anchor="middle">${cv[p[2]]}%</text></g>`).join('');}
  /* 아래 — 시급 · CM 위치(작은 꺾은선) */
  const sm=rows.filter(r=>['prime','cmpos','midcm'].includes(r.t));
  const lab=r=>r.t==='prime'?L('프라임타임 (SA+A)','Prime time'):r.t==='cmpos'?L('CM위치 · ','CM pos · ')+r.n.replace(/^.*·\s*/,''):L('중CM · ','Mid-CM · ')+r.n.replace(/^중CM\s*·\s*/,'');
  const mini=r=>{const w=200,h=46,vs=r.v.map(v=>has(v)?+v:null),nums=vs.filter(v=>v!=null).concat([rN(r.tg)]),mn=Math.min(...nums)*.85,mx=Math.max(...nums)*1.08,
      X=i=>4+(w-8)*i/11,Y=v=>h-4-(h-10)*(v-mn)/(mx-mn||1),pts=vs.map((v,i)=>v!=null&&i<M?[X(i),Y(v)]:null).filter(Boolean),last=vs[M-1];
    return `<div class="rpkm"><div class="h"><b>${esc(lab(r))}</b><span>${L('목표','tgt')} ${r.tg}%</span><em>${last!=null?last+'%':'–'}</em></div>
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="rpkmsvg"><line x1="0" x2="${w}" y1="${f(Y(rN(r.tg)))}" y2="${f(Y(rN(r.tg)))}" class="t"/>
      <path d="${rpSmooth(pts,true,.2)}" class="l"/>${pts.length&&last!=null?`<circle cx="${f(X(M-1))}" cy="${f(Y(last))}" r="3.2" class="d"/>`:''}</svg></div>`;};
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rpkpisvg">${s}</svg>${sm.length?`<div class="rpkms" style="--n:${sm.length}">${sm.map(mini).join('')}</div>`:''}`;
  const gl=g==='t'?L('지상파','Terrestrial'):L('케이블','Cable');
  const row=(l,v,tg,sfx)=>`<div class="r"><span class="l">${l}${tg?` <small>(${L('목표','tgt')} ${tg})</small>`:''}</span><b>${v}${sfx||''}</b></div>`;
  rpTipWire(box.querySelector('svg'),k=>{const i=+k.slice(1);
    if(k[0]==='l'){const cs=rows.filter(r=>r.t.startsWith('cprp')&&has(r.v[i]));if(!cs.length)return '';
      return `<div class="t">${gl} · ${L(`${i+1}월`,`M${i+1}`)} · ${L('실집행 CPRP 경쟁사 대비','CPRP vs competitors')}</div>${cs.map(r=>row(esc(r.n),r.v[i]+'%',r.t==='cprp'&&r.tg?r.tg+'% '+L('우수',''):'',L(' 우위',''))).join('')}`;}
    const bs=bo.filter(r=>has(r.v[i])).sort((a,b)=>+b.v[i]-+a.v[i]);if(!bs.length)return '';
    return `<div class="t">${gl} · ${L(`${i+1}월`,`M${i+1}`)} · ${L('보너스율','Bonus rate')}</div>${bs.map(r=>row(esc(r.n),(+r.v[i]).toLocaleString()+'%',r.tg?r.tg+'%':'')).join('')}`;});}
