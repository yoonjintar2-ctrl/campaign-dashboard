/* ===== 32. 리포트 그래프 부품 (v151) =====
   ① rpBarDonut — 평소엔 막대. 마우스를 올리면 그 막대가 세로로 선 3D 도넛의 옆면이었다는 듯 가로로 돌면서
      도넛 정면이 나오고, 조각이 벌어지며 카드(안내선)로 내역을 보여 준다. 마우스가 떠나면 다시 막대로.
      처음 그려질 때 막대들이 살짝 돌다 말아 '돌아가는 그래프'라는 걸 알려 준다.
   ② rp3dDonut — 비스듬히 기운 3D 도넛 + 코웨이 조각만 살짝 떼어 냄 + 얇고 옅은 안내선 카드
   ③ rpAreaChart — 부드러운 곡선 영역 그래프(위에서 아래로 옅어지는 그라데이션) */
const rpEase=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const rpLerp=(a,b,t)=>a+(b-a)*t;
const rpClamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/* 모노톤 — 경쟁사(회색 명도만) · 품목(회청 명도만) */
function rpMono(i,n){const a=[0x5b,0x66,0x72],b=[0xc6,0xcc,0xd3],t=n<=1?.35:i/(n-1);return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(',')})`;}
function rpSteel(i,n){const a=[0x3d,0x5a,0x80],b=[0xc4,0xd2,0xe2],t=n<=1?.3:i/(n-1);return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(',')})`;}
function rpShadeC(c,k){const m=String(c).match(/rgb\((\d+),(\d+),(\d+)\)/);if(m)return `rgb(${[m[1],m[2],m[3]].map(v=>Math.round(Math.min(255,v*k))).join(',')})`;return wrShade(c,k);}

/* ---------------- ① 막대 ↔ 도넛 ---------------- */
function rpBarDonut(box,bars,opt){
  if(!box)return;opt=opt||{};
  const W=Math.max(420,box.clientWidth||600),H=opt.H||340,B=H-30,T=30,n=bars.length,gw=(W-16)/Math.max(n,1);
  const mx=Math.max(...bars.map(b=>b.v),1),d=Math.min(30,gw*.5),RB=Math.min(H*.3,(W*.5-150)*.75,118),CX=W/2,CY=T+RB+12;
  const fmt=opt.fmt||wrEok,PHI=72*Math.PI/180;
  const st=bars.map((b,i)=>({t:0,tg:0,x:8+gw*i+gw/2,h:Math.max(b.v>0?3:0,(B-T-24)*b.v/mx)}));
  const svgNS='http://www.w3.org/2000/svg';
  box.innerHTML=`<svg class="rpbd" viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><g class="bl"></g><g class="act"></g></svg>
    ${opt.legend||''}`;
  const svg=box.querySelector('svg'),gB=svg.querySelector('.bl'),gA=svg.querySelector('.act');
  const t0=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let act=-1,raf=0,alive=true;
  /* 한 막대(도넛) 그리기 — t: 0 막대 … 1 펼친 도넛, wig: 처음에 살짝 도는 각(라디안), grow: 처음 솟아오르기 */
  function draw(i,t,wig,grow){
    const b=bars[i],s=st[i];if(!(b.v>0)&&t<=0)return `<rect x="${(s.x-d/2).toFixed(1)}" y="${B-2}" width="${d.toFixed(1)}" height="2" class="nil"/>`;
    const r=rpEase(rpClamp(t/.62,0,1)),q=rpEase(rpClamp((t-.55)/.45,0,1));
    const h0=s.h*grow,R=rpLerp(h0/2,RB,r),cx=rpLerp(s.x,CX,r),cy=rpLerp(B-h0/2,CY,r);
    const phi=Math.min(PHI,r*PHI+wig),rx=R*Math.sin(phi),dd=rpLerp(d,30,r),dx=dd*Math.cos(phi),col=b.col||'#8ea3bd';
    const f=v=>v.toFixed(1),side=rpShadeC(col,.72),fx=cx-dx/2;
    let g=`<g class="bd${t>.02?' on':''}" data-i="${i}">`;
    /* 옆면 — 뒷면 타원 + 위아래 테두리 */
    g+=`<path d="M${f(fx)},${f(cy-R)} L${f(cx+dx/2)},${f(cy-R)} A${f(Math.max(rx,.01))},${f(R)} 0 0 1 ${f(cx+dx/2)},${f(cy+R)} L${f(fx)},${f(cy+R)} Z" fill="${side}"/>`;
    if(rx>.6){
      /* 정면 — 조각마다 고리 · 벌어지기(q) */
      const tot=b.slices.reduce((a,x)=>a+x.v,0)||1,ri=.56;let a=-Math.PI/2;
      const P=(an,k,ox,oy)=>[fx+ox+Math.cos(an)*rx*k,cy+oy+Math.sin(an)*R*k];
      b.slices.forEach((z,k)=>{const sp=z.v/tot*Math.PI*2;if(sp<=0)return;const a0=a,a1=a+sp;a=a1;const mid=(a0+a1)/2,E=q*7,ox=Math.cos(mid)*E*Math.sin(phi),oy=Math.sin(mid)*E;
        const lg=sp>Math.PI?1:0,[x0,y0]=P(a0,1,ox,oy),[x1,y1]=P(a1,1,ox,oy),[x2,y2]=P(a1,ri,ox,oy),[x3,y3]=P(a0,ri,ox,oy);
        const pth=sp>=Math.PI*2-1e-6?`M${f(x0)},${f(y0)} A${f(rx)},${f(R)} 0 1 1 ${f(x0-.01)},${f(y0)} Z`:
          `M${f(x0)},${f(y0)} A${f(rx)},${f(R)} 0 ${lg} 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${f(rx*ri)},${f(R*ri)} 0 ${lg} 0 ${f(x3)},${f(y3)} Z`;
        g+=`<path d="${pth}" fill="${z.col}" stroke="var(--surface)" stroke-width="${(q*1.4).toFixed(2)}" data-s="${k}"/>`;});
      /* 구멍 안쪽 벽 */
      g+=`<ellipse cx="${f(fx)}" cy="${f(cy)}" rx="${f(rx*.56)}" ry="${f(R*.56)}" fill="${rpShadeC(col,.5)}" opacity="${(.35*r).toFixed(2)}"/>
        <ellipse cx="${f(fx+Math.min(dx,rx*.3))}" cy="${f(cy)}" rx="${f(rx*.56)}" ry="${f(R*.56)}" fill="var(--surface)"/>`;
    }else g+=`<rect x="${f(fx-.5)}" y="${f(cy-R)}" width="1" height="${f(2*R)}" fill="${rpShadeC(col,1.15)}"/>`;
    /* 막대일 때 값 */
    if(t<.15&&grow>.98)g+=`<text class="bv${opt.cur===i?' cur':''}" x="${f(s.x)}" y="${f(B-s.h-8)}" text-anchor="middle" opacity="${(1-t/.15).toFixed(2)}">${fmt(b.v)}</text>`;
    /* 펼친 뒤 — 가운데 합계 + 안내선 카드 */
    if(q>.01){
      g+=`<text class="dc1" x="${f(fx)}" y="${f(cy-4)}" text-anchor="middle" opacity="${q.toFixed(2)}">${esc(b.label)}</text>
        <text class="dc2" x="${f(fx)}" y="${f(cy+15)}" text-anchor="middle" opacity="${q.toFixed(2)}">${fmt(b.v)}</text>`;
      g+=rpBdCards(b,fx,cy,rx,R,q,W,H);
    }
    return g+'</g>';}
  function frame(now){
    if(!alive||!box.isConnected)return;
    let busy=false;const el=now-t0;
    st.forEach((s,i)=>{const sp=.055;if(s.t<s.tg){s.t=Math.min(s.tg,s.t+sp);busy=true;}else if(s.t>s.tg){s.t=Math.max(s.tg,s.t-sp*1.2);busy=true;}});
    let hb='',ha='';
    st.forEach((s,i)=>{
      const dl=i*70,grow=reduce?1:rpEase(rpClamp((el-dl)/700,0,1));
      /* 처음 한 번 — 살짝 돌다가 막대로 돌아온다 */
      const w=reduce?0:Math.sin(Math.PI*rpClamp((el-dl-650)/900,0,1))*.15;
      if(grow<1||(w>0&&el<dl+1600))busy=true;
      const html=draw(i,s.t,w,grow);
      if(i===act||s.t>.02)ha+=html;else hb+=html;});
    gB.innerHTML=hb;gA.innerHTML=ha;svg.classList.toggle('hot',act>=0);
    if(busy)raf=requestAnimationFrame(frame);else raf=0;}
  const kick=()=>{if(!raf)raf=requestAnimationFrame(frame);};
  const pick=e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width,y=(e.clientY-pt.top)*H/pt.height;
    if(act>=0&&st[act].t>.4&&Math.hypot(x-CX,y-CY)<RB+10)return act;
    const i=Math.floor((x-8)/gw);return i>=0&&i<n&&bars[i].v>0?i:-1;};
  svg.addEventListener('mousemove',e=>{const i=pick(e);if(i!==act){act=i;st.forEach((s,k)=>s.tg=k===i?1:0);kick();}
    if(i>=0&&opt.tip){const h=opt.tip(bars[i]);if(h&&st[i].t<.3)showTip(e.clientX,e.clientY,h);else hideTip();}});
  svg.addEventListener('mouseleave',()=>{act=-1;st.forEach(s=>s.tg=0);hideTip();kick();});
  kick();}
/* 펼친 도넛의 카드 — 조각 가운데에서 얇은 안내선, 왼쪽 · 오른쪽 열 */
function rpBdCards(b,cx,cy,rx,R,q,W,H){
  const tot=b.slices.reduce((a,x)=>a+x.v,0)||1;let a=-Math.PI/2;const pts=[];
  b.slices.forEach((z,k)=>{const sp=z.v/tot*Math.PI*2;const mid=a+sp/2;a+=sp;if(z.v<=0)return;
    pts.push({k,z,ax:cx+Math.cos(mid)*rx*.98,ay:cy+Math.sin(mid)*R*.98,side:Math.cos(mid)>=0?1:-1});});
  const CW=Math.min(150,(W-2*rx)/2-34),CH=34,GAP=6,out=[];
  if(CW<90)return '';
  [-1,1].forEach(sd=>{const L=pts.filter(p=>p.side===sd).sort((p,q2)=>p.ay-q2.ay);
    let ys=L.map(p=>p.ay-CH/2);for(let i=1;i<ys.length;i++)ys[i]=Math.max(ys[i],ys[i-1]+CH+GAP);
    const over=ys.length?ys[ys.length-1]+CH-(H-4):0;if(over>0)ys=ys.map(y=>y-over);for(let i=0;i<ys.length;i++)ys[i]=Math.max(4+i*(CH+GAP),ys[i]);
    L.forEach((p,i)=>{const bx=sd>0?Math.min(W-CW-2,cx+rx+30):Math.max(2,cx-rx-30-CW),y=ys[i],ex=sd>0?bx:bx+CW,ey=y+CH/2,f=v=>v.toFixed(1);
      out.push(`<g class="bdc" opacity="${q.toFixed(2)}"><path d="M${f(p.ax)},${f(p.ay)} L${f(p.ax+sd*10)},${f(ey)} L${f(ex)},${f(ey)}" class="bdl"/>
        <rect x="${f(bx)}" y="${f(y)}" width="${f(CW)}" height="${CH}" rx="8" class="bdx"/><rect x="${f(bx+8)}" y="${f(y+CH/2-4)}" width="8" height="8" rx="2" fill="${p.z.col}"/>
        <text x="${f(bx+21)}" y="${f(y+14)}" class="bdn">${esc(p.z.n)}</text>
        <text x="${f(bx+21)}" y="${f(y+27)}" class="bds">${wrEok(p.z.v)} · ${(p.z.v/tot*100).toFixed(p.z.v/tot<.1?1:0)}%${p.z.sub?` · ${esc(p.z.sub)}`:''}</text></g>`);});});
  return out.join('');}

/* ---------------- ② 기운 3D 도넛 + 떼어 낸 코웨이 조각 + 안내선 카드 ---------------- */
function rp3dDonutSvg(S0,T,W,meKey){
  const tot=S0.reduce((s,x)=>s+x.v,0);if(!tot)return {svg:'',S:[]};
  const R=Math.min(W*.2,118),K=.56,r=R*.52,DEP=22,ROT=13*Math.PI/180,TAU=Math.PI*2,CW=Math.min(170,W*.27),CH=38,PITCH=44,cs=Math.cos(ROT),sn=Math.sin(ROT);
  /* 카드 줄 수 — 다 펼친 각도로 왼쪽 · 오른쪽에 몇 개씩 가는지 */
  let aa=-Math.PI/2,nl=0,nr=0;S0.forEach(s=>{const sp=s.v/tot*TAU,mid=aa+sp/2;aa+=sp;const x=Math.cos(mid)*cs-Math.sin(mid)*K*sn;if(x>=0)nr++;else nl++;});
  const n=Math.max(nl,nr),Hc=Math.max(n,3)*PITCH+16,cx=W/2,cy=Math.max(R*K+30,Hc/2),H=Math.max(cy+R*K+DEP+40,Hc+10),rc=cy+DEP/2;
  const rot=([x,y])=>[cx+(x-cx)*cs-(y-rc)*sn,rc+(x-cx)*sn+(y-rc)*cs];
  let a=-Math.PI/2;const S=S0.map((s,i)=>{const sp=s.v/tot*TAU*T,o={...s,i,a0:a,a1:a+sp};a+=sp;const mid=(o.a0+o.a1)/2,E=s.n===meKey?12*T:0;o.ox=Math.cos(mid)*E;o.oy=Math.sin(mid)*E*K;return o;});
  const P=(s,an,rr,dz)=>[cx+s.ox+Math.cos(an)*rr,cy+s.oy+Math.sin(an)*rr*K+(dz||0)];
  const arc=(s,rr,b0,b1,dz,rev)=>{const st=rev?b1:b0,en=rev?b0:b1,mid=(b0+b1)/2,[x0,y0]=P(s,st,rr,dz),[xm,ym]=P(s,mid,rr,dz),[x1,y1]=P(s,en,rr,dz),sw=rev?0:1,ry=(rr*K).toFixed(1);
    return [`${x0.toFixed(1)},${y0.toFixed(1)}`,`A${rr},${ry} 0 0 ${sw} ${xm.toFixed(1)},${ym.toFixed(1)} A${rr},${ry} 0 0 ${sw} ${x1.toFixed(1)},${y1.toFixed(1)}`];};
  const clips=(b0,b1,lo,hi)=>{const o=[];for(const k of [-1,0,1,2]){const x=Math.max(b0,lo+k*TAU),y=Math.min(b1,hi+k*TAU);if(y>x+1e-6)o.push([x,y]);}return o;};
  const wall=(s,rr,c)=>{const [m,aa]=arc(s,rr,c[0],c[1],0),[mb,ab]=arc(s,rr,c[0],c[1],DEP,true);return `M${m} ${aa} L${mb} ${ab} Z`;};
  let back='',walls='',tops='',caps='';
  S.forEach(s=>{if(s.a1-s.a0<1e-4)return;
    clips(s.a0,s.a1,Math.PI,TAU).forEach(c=>back+=`<path class="sl" data-k="${s.i}" d="${wall(s,r,c)}" fill="${rpShadeC(s.col,.55)}"/>`);
    clips(s.a0,s.a1,0,Math.PI).forEach(c=>walls+=`<path class="sl" data-k="${s.i}" d="${wall(s,R,c)}" fill="${rpShadeC(s.col,.78)}"/>`);
    if(s.n===meKey&&T>.5){/* 떼어 낸 조각의 양쪽 단면 */
      [s.a0,s.a1].forEach(an=>{const p=[P(s,an,r),P(s,an,R),P(s,an,R,DEP),P(s,an,r,DEP)];caps+=`<path class="sl" data-k="${s.i}" d="M${p.map(q=>q.map(z=>z.toFixed(1)).join(',')).join(' L')} Z" fill="${rpShadeC(s.col,.66)}"/>`;});}
    const [m,aa]=arc(s,R,s.a0,s.a1,0),[mi,ai]=arc(s,r,s.a0,s.a1,0,true);
    tops+=`<path class="sl" data-k="${s.i}" d="M${m} ${aa} L${mi} ${ai} Z" fill="${s.col}" stroke="${s.col}" stroke-width=".5"/>`;});
  /* 카드 — 다 펼친 뒤에만 */
  let lab='';
  if(T>=1){
    const pts=S.filter(s=>s.v>0).map(s=>{const mid=(s.a0+s.a1)/2,fr=Math.sin(mid)>0,[x,y]=rot(P(s,mid,R+2,fr?DEP*.45:0));return {s,x,y,side:x>=cx?1:-1};});
    [-1,1].forEach(sd=>{const L=pts.filter(p=>p.side===sd).sort((p,q)=>p.y-q.y);let ys=L.map(p=>p.y-CH/2);
      for(let i=1;i<ys.length;i++)ys[i]=Math.max(ys[i],ys[i-1]+PITCH);const over=ys.length?ys[ys.length-1]+CH-(H-4):0;if(over>0)ys=ys.map(y=>y-over);
      for(let i=0;i<ys.length;i++)ys[i]=Math.max(4+i*PITCH,ys[i]);
      L.forEach((p,i)=>{const bx=sd>0?W-CW-2:2,y=ys[i],ex=sd>0?bx:bx+CW,ey=y+CH/2,f=v=>v.toFixed(1),me=p.s.n===meKey,elbow=p.x+sd*Math.max(14,Math.min(40,Math.abs(ex-p.x)*.35));
        lab+=`<g class="cd${me?' mine':''}" data-k="${p.s.i}"><path class="ln" d="M${f(p.x)},${f(p.y)} L${f(elbow)},${f(ey)} L${f(ex)},${f(ey)}"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="2" class="lnd"/>
          <rect class="bx" x="${f(bx)}" y="${f(y)}" width="${f(CW)}" height="${CH}" rx="9"/><rect x="${f(bx+10)}" y="${f(ey-4.5)}" width="9" height="9" rx="2.5" fill="${p.s.col}"/>
          <text x="${f(bx+26)}" y="${f(y+15)}" class="cn">${esc(p.s.n)}</text><text x="${f(bx+26)}" y="${f(y+30)}" class="cv">${(p.s.v/tot*100).toFixed(p.s.v/tot<.1?1:0)}% · ${wrEok(p.s.v)}</text></g>`;});});}
  return {svg:`<svg class="rp3d${T>=1?' done':''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g transform="rotate(13 ${cx} ${rc})"><ellipse cx="${cx}" cy="${cy+DEP+10}" rx="${R*1.15}" ry="${R*K*.7}" fill="rgba(12,26,42,.07)"/>${back}${caps}${walls}${tops}
    <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R*K}" fill="url(#rp3hl)" pointer-events="none" opacity="${Math.min(1,T).toFixed(2)}"/></g>${lab}
    <defs><radialGradient id="rp3hl" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`,S};}
function rp3dDonut(box,segs,meKey){
  if(!box)return;const W=Math.max(480,box.clientWidth||600),id=(box._a=(box._a||0)+1),t0=performance.now(),DUR=1100;
  const tot=segs.reduce((s,x)=>s+x.v,0);
  const wire=()=>{const svg=box.querySelector('svg');if(!svg)return;
    const hot=k=>{svg.classList.toggle('hot',k!=null);svg.querySelectorAll('[data-k]').forEach(e=>e.classList.toggle('on',e.dataset.k===String(k)));};
    svg.addEventListener('mousemove',e=>{const g=e.target.closest('[data-k]');if(!g){hot(null);hideTip();return;}hot(g.dataset.k);const s=segs[+g.dataset.k];
      showTip(e.clientX,e.clientY,`<div class="t">${esc(s.n)}</div>${rpTr(L('광고비','Spend'),wrEok(s.v))}${rpTr(L('점유율','Share'),rpP(s.v/tot*100,1))}`);});
    svg.addEventListener('mouseleave',()=>{hot(null);hideTip();});};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){box.innerHTML=rp3dDonutSvg(segs,1,W,meKey).svg;wire();return;}
  const fr=now=>{if(box._a!==id)return;const x=Math.min(1,(now-t0)/DUR);box.innerHTML=rp3dDonutSvg(segs,x<1?1-Math.pow(1-x,3):1,W,meKey).svg;if(x<1)requestAnimationFrame(fr);else wire();};
  requestAnimationFrame(fr);}

/* ---------------- ③ 부드러운 영역 그래프 ---------------- */
/* 디지털 영역 그래프 색 — 보내 준 예시처럼 서로 구분되는 부드러운 색(코웨이는 파랑) */
const RP_AREA=['#e3923f','#57a77a','#8a63c8','#d4566a','#3fa6b5','#b8a03a','#c46fb0','#7f8c99','#6f9a3f','#a27552'];
function rpSmooth(pts){if(pts.length<2)return pts.length?`M${pts[0][0]},${pts[0][1]}`:'';let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2,t=.18;
    /* 조절점 높이는 두 점 사이로 묶는다 — 0 아래로 꺼지거나 봉우리가 부풀지 않게 */
    const lo=Math.min(p1[1],p2[1]),hi=Math.max(p1[1],p2[1]);
    const c1=[p1[0]+(p2[0]-p0[0])*t,rpClamp(p1[1]+(p2[1]-p0[1])*t,lo,hi)],c2=[p2[0]-(p3[0]-p1[0])*t,rpClamp(p2[1]-(p3[1]-p1[1])*t,lo,hi)];
    d+=` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;}return d;}
function rpAreaChart(box,ser,labels,opt){
  if(!box)return;opt=opt||{};const off=new Set(box._off||[]);
  const draw=()=>{
    const vis=ser.filter(s=>!off.has(s.b)),W=Math.max(420,box.clientWidth||600),H=opt.H||300,L0=44,R0=W-14,T=16,B=H-28,N=labels.length,step=(R0-L0)/Math.max(1,N-1);
    const mx0=Math.max(1,...vis.flatMap(s=>s.v)),nice=v=>{const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e;},mx=nice(mx0*1.08);
    const X=i=>N===1?(L0+R0)/2:L0+step*i,Y=v=>B-(B-T)*v/mx;let g='',defs='';
    for(let k=0;k<=4;k++){const v=mx*k/4,y=Y(v);g+=`<line x1="${L0}" x2="${R0}" y1="${y}" y2="${y}" class="gl"/><text x="${L0-6}" y="${y+3.5}" text-anchor="end" class="ax">${k?wrEok(v):'0'}</text>`;}
    labels.forEach((l,i)=>g+=`<text x="${X(i)}" y="${B+18}" text-anchor="middle" class="ax">${esc(l)}</text>`);
    /* 큰 것부터 뒤에 — 작은 영역이 가려지지 않게 */
    [...vis].sort((a,b)=>rpSum(b.v)-rpSum(a.v)).forEach((s,k)=>{const id='rpag'+Math.random().toString(36).slice(2,8),pts=s.v.map((v,i)=>[X(i),Y(v)]);
      defs+=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.col}" stop-opacity="${s.mine?.5:.38}"/><stop offset="1" stop-color="${s.col}" stop-opacity="0"/></linearGradient>`;
      const dl=rpSmooth(pts);g+=`<path d="${dl} L${X(N-1)},${B} L${X(0)},${B} Z" fill="url(#${id})" class="ar" style="--d:${k*90}ms"/><path d="${dl}" class="ln${s.mine?' mine':''}" stroke="${s.col}" style="--d:${k*90}ms" pathLength="1"/>`;});
    box.innerHTML=`<div class="rpalg">${ser.map(s=>`<button type="button" class="${off.has(s.b)?'off':''}${s.mine?' mine':''}" data-b="${esc(s.b)}"><i style="background:${s.col}"></i>${esc(s.b)}</button>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rparea"><defs>${defs}</defs>${g}<line class="xh" y1="${T}" y2="${B}" x1="-10" x2="-10"/></svg>`;
    rpGo(box);
    box.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const k=b.dataset.b;if(off.has(k))off.delete(k);else off.add(k);box._off=[...off];draw();});
    const svg=box.querySelector('svg'),xh=svg.querySelector('.xh');
    svg.addEventListener('mousemove',e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width,i=rpClamp(Math.round(N===1?0:(x-L0)/step),0,N-1);
      xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));const list=vis.map(s=>[s,s.v[i]]).filter(z=>z[1]>0).sort((a,b)=>b[1]-a[1]);
      showTip(e.clientX,e.clientY,`<div class="t">${esc(labels[i])}${opt.title?` · ${esc(opt.title)}`:''}</div>${list.length?list.map(([s,v])=>rpTr(`<i class="dot" style="background:${s.col}"></i>${esc(s.b)}`,wrEok(v))).join(''):`<div class="r">${L('집행 없음','None')}</div>`}`);});
    svg.addEventListener('mouseleave',()=>{xh.setAttribute('x1',-10);xh.setAttribute('x2',-10);hideTip();});};
  draw();}
