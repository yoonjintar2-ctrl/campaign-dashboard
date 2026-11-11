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
function rpRgb(c){c=String(c);let m=c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);if(m)return [+m[1],+m[2],+m[3]];
  m=c.replace('#','');if(m.length===3)m=m.split('').map(x=>x+x).join('');const n=parseInt(m,16);return isFinite(n)?[n>>16&255,n>>8&255,n&255]:[140,150,160];}
function rpMix(a,b,t){const A=rpRgb(a),B2=rpRgb(b);return `rgb(${A.map((v,k)=>Math.round(v+(B2[k]-v)*t)).join(',')})`;}
function rpShadeC(c,k){const m=String(c).match(/rgb\((\d+),(\d+),(\d+)\)/);if(m)return `rgb(${[m[1],m[2],m[3]].map(v=>Math.round(Math.min(255,v*k))).join(',')})`;return wrShade(c,k);}

/* ---------------- ① 막대 ↔ 도넛 ---------------- */
function rpBarDonut(box,bars,opt){
  if(!box)return;opt=opt||{};
  /* 4% 미만 조각은 '기타'로 — 안내선이 엉키지 않게 */
  bars=bars.map(b=>({...b,slices:rpGroupSmall(b.slices.filter(z=>z.v>0),'')}));
  const W=Math.max(420,box.clientWidth||600),H=opt.H||340,B=H-34,T=30,n=bars.length,gw=(W-16)/Math.max(n,1);
  const mx=Math.max(...bars.map(b=>b.v),1),d=Math.min(30,gw*.5),RB=Math.min(H*.3,(W*.5-150)*.75,118),CX=W/2,CY=B-RB-4;   /* v155 — 도넛도 막대처럼 바닥에 붙어서 */
  /* v154 — 옆 막대는 도넛이 넓어진 만큼만 밀려난다(카드는 막대 위에 겹쳐 띄운다) */
  const fmt=opt.fmt||wrEok,PHI=72*Math.PI/180,RBX=RB*Math.sin(PHI)+12,ZC=Math.min(W/2,RBX+8),PUSH=Math.max(0,RBX+d*.5+8-gw);
  const st=bars.map((b,i)=>({t:0,tg:0,x:8+gw*i+gw/2,cx:8+gw*i+gw/2,h:Math.max(b.v>0?3:0,(B-T-24)*b.v/mx)}));
  /* v157 — 카드가 한쪽 열에 다 안 들어가면(조각이 많으면) 도넛을 안쪽으로 더 들여 양쪽에 카드 열을 둔다 */
  const CWc=150,need2=bars.map(b=>{const k=b.slices.filter(z=>z.v>0).length,ch=b.slices.some(z=>z.sub)?46:34;return k*(ch+6)>H-10;});
  /* v160 — 카드는 항상 조각이 있는 쪽 근처(좌우 두 열) — 도넛을 양쪽 카드 열이 들어갈 만큼 안쪽에 둔다 */
  const two=bars.map(b=>b.slices.filter(z=>z.v>0).length>1);
  const ZCi=i=>two[i]?Math.min(W/2,RBX+18+CWc+14):ZC,cxT=i=>rpClamp(st[i].x,ZCi(i),W-ZCi(i));
  /* 막대 a 를 다 펼쳤을 때 막대 j 가 비켜설 거리 — 도넛 폭 밖으로, 남는 자리에 고르게 좁혀 앉는다 */
  const offFor=(j,a)=>{if(j===a)return 0;const c=cxT(a),half=(two[a]?RBX+18+CWc:RBX)+d/2+8;
    if(j<a){const lim=c-half,last=st[a-1].x;if(last<=lim)return 0;const l0=8+d/2,k=Math.max(.12,(lim-l0)/Math.max(1,last-l0));return l0+(st[j].x-l0)*k-st[j].x;}
    const lim=c+half,first=st[a+1].x;if(first>=lim)return 0;const r0=W-8-d/2,k=Math.max(.12,(r0-lim)/Math.max(1,r0-first));return r0-(r0-st[j].x)*k-st[j].x;};
  const svgNS='http://www.w3.org/2000/svg';
  box._uid=(rpBarDonut._n=(rpBarDonut._n||0)+1);
  box.classList.add('rpbdbox');
  box.innerHTML=`<svg class="rpbd" viewBox="0 0 ${W} ${H}" width="100%" height="${H}"><defs><linearGradient id="rpbdhl${box._uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="rpbdsh${box._uid}" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="5"/></filter></defs><g class="bl"></g><g class="act"></g></svg>
    <button type="button" class="rpbdcl" aria-label="${L('닫기','Close')}" title="${L('막대로 돌아가기 (Esc)','Back to bars (Esc)')}"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>${L('닫기','Close')}<kbd>Esc</kbd></button>
    ${opt.legend||''}`;
  const svg=box.querySelector('svg'),gB=svg.querySelector('.bl'),gA=svg.querySelector('.act');
  const t0=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let act=-1,raf=0,alive=true;const cardC={};
  /* 한 막대(도넛) 그리기 — t: 0 막대 … 1 펼친 도넛, grow: 처음 솟아오르기.
     v152 — 속이 꽉 찬 하나의 고리처럼: 앞면(조각) · 바깥 옆면(조각마다 같은 색의 어두운 톤) · 구멍 안 벽이
     같은 각도 · 같은 두께로 맞물리게 그린다. 옆면은 앞면 오른쪽 반 타원과 뒷면 오른쪽 반 타원 사이의 띠 */
  function draw(i,t,grow,off){
    const b=bars[i],s=st[i],sx=s.x+(off||0);if(!(b.v>0)&&t<=0)return `<rect x="${(sx-d/2).toFixed(1)}" y="${B-2}" width="${d.toFixed(1)}" height="2" class="nil"/>`;
    const r=rpEase(rpClamp(t/.62,0,1)),q=rpEase(rpClamp((t-.55)/.45,0,1));
    /* 도넛은 제 자리에서 돌고(카드 자리만큼 안쪽으로), 옆 막대들이 밀려난다 */
    const h0=s.h*grow,R=rpLerp(h0/2,RB,r),cx=rpLerp(sx,cxT(i),r),cy=rpLerp(B-h0/2,CY,r);
    const phi=r*PHI,rx=Math.max(R*Math.sin(phi),.001),dd=rpLerp(d,34,r),dx=dd*Math.cos(phi),col=b.col||'#8ea3bd';
    const f=v=>v.toFixed(2),fx=cx-dx/2,bx=cx+dx/2,ri=.56,HP=Math.PI/2;
    const F=(an,k)=>[fx+Math.cos(an)*rx*k,cy+Math.sin(an)*R*k],Bk=(an,k)=>[bx+Math.cos(an)*rx*k,cy+Math.sin(an)*R*k];
    const tot=b.slices.reduce((a,x)=>a+x.v,0)||1;let a=-HP;
    const segs=b.slices.filter(z=>z.v>0).map(z=>{const sp=z.v/tot*Math.PI*2,o={z,a0:a,a1:a+sp};a+=sp;return o;});
    if(!segs.length)segs.push({z:{col},a0:-HP,a1:3*HP});
    /* 막대일 때는 막대 색, 돌수록 조각 색으로 */
    const wallC=z=>rpMix(rpShadeC(col,.86),rpShadeC(z.col,.72),r),faceC=z=>rpMix(col,z.col,Math.min(1,r*1.4));
    let g=`<g class="bd${t>.02?' on':''}${hov===i&&act!==i?' hv':''}" data-i="${i}">`;
    /* 바닥 그림자 — 도넛이 설수록 짙게, 가로로 납작한 부드러운 그림자 */
    if(r>.04)g+=`<ellipse cx="${f(cx)}" cy="${f(B-1)}" rx="${f(rx+dx*.6+6)}" ry="${f(4+5*r)}" fill="rgba(16,28,44,${(.26*r).toFixed(3)})" filter="url(#rpbdsh${box._uid})"/>`;
    /* ① 바깥 옆면 — 보이는 쪽(오른쪽 반, -90°~90°)을 조각별로 */
    const wallSeg=(c0,c1,z)=>{const [x0,y0]=F(c0,1),[x1,y1]=F(c1,1),[x2,y2]=Bk(c1,1),[x3,y3]=Bk(c0,1);
      return `<path d="M${f(x0)},${f(y0)} A${f(rx)},${f(R)} 0 0 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${f(rx)},${f(R)} 0 0 0 ${f(x3)},${f(y3)} Z" fill="${wallC(z)}" stroke="${wallC(z)}" stroke-width=".6" stroke-linejoin="round"/>`;};
    /* 막대 상태(아직 돌지 않음)는 한 장의 사각형 — 조각 경계 실선이 비치지 않게 */
    if(r<.004)g+=`<rect x="${f(cx-dd/2)}" y="${f(cy-R)}" width="${f(dd)}" height="${f(2*R)}" fill="${rpShadeC(col,.86)}"/>`;
    else segs.forEach(sg=>{const A0=Math.max(sg.a0,-HP),A1=Math.min(sg.a1,HP);if(A1>A0+1e-4)g+=wallSeg(A0,A1,sg.z);});
    /* 옆면 위아래 가장자리 하이라이트 · 그늘 — 둥근 두께감 */
    g+=`<path d="M${f(fx)},${f(cy-R)} L${f(bx)},${f(cy-R)}" stroke="rgba(255,255,255,${(.35*(1-r)+.2).toFixed(2)})" stroke-width="1"/>`;
    if(rx>.4){
      /* ② 앞면 — 조각 고리. 조각 사이는 아주 가는 틈만 */
      segs.forEach((sg,k)=>{const sp=sg.a1-sg.a0,lg=sp>Math.PI?1:0,[x0,y0]=F(sg.a0,1),[x1,y1]=F(sg.a1,1),[x2,y2]=F(sg.a1,ri),[x3,y3]=F(sg.a0,ri);
        const c=faceC(sg.z),pth=sp>=Math.PI*2-1e-6?`M${f(fx)},${f(cy-R)} A${f(rx)},${f(R)} 0 1 1 ${f(fx-.01)},${f(cy-R)} Z M${f(fx)},${f(cy-R*ri)} A${f(rx*ri)},${f(R*ri)} 0 1 0 ${f(fx-.01)},${f(cy-R*ri)} Z`:
          `M${f(x0)},${f(y0)} A${f(rx)},${f(R)} 0 ${lg} 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${f(rx*ri)},${f(R*ri)} 0 ${lg} 0 ${f(x3)},${f(y3)} Z`;
        g+=`<path d="${pth}" fill="${c}" fill-rule="evenodd" stroke="${c}" stroke-width=".6" stroke-linejoin="round" data-s="${k}"/>`;});
      /* 앞면 살짝 빛 — 왼쪽 위가 밝게 */
      g+=`<ellipse cx="${f(fx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(R)}" fill="url(#rpbdhl${box._uid})" pointer-events="none"/>`;
      /* ③ 구멍 — 앞 구멍 안에 안쪽 벽(왼쪽 초승달), 뒤 구멍과 겹치는 곳은 뚫려 보이게 */
      const cid=`rpbdc${box._uid}_${i}`;
      g+=`<clipPath id="${cid}"><ellipse cx="${f(fx)}" cy="${f(cy)}" rx="${f(rx*ri)}" ry="${f(R*ri)}"/></clipPath><g clip-path="url(#${cid})">`;
      /* 안쪽 벽은 보이는 왼쪽 반(90°~270°)을 조각별 색(어두운 톤)으로 — 조각이 앞면 · 바깥 옆면 · 안쪽 벽까지 한 덩어리 */
      const inC=z=>rpMix(rpShadeC(col,.62),rpShadeC(z.col,.58),r);
      segs.forEach(sg=>{const A0=Math.max(sg.a0,HP),A1=Math.min(sg.a1,3*HP);if(A1<=A0+1e-4)return;
        const [x0,y0]=F(A0,ri),[x1,y1]=F(A1,ri),[x2,y2]=Bk(A1,ri),[x3,y3]=Bk(A0,ri),k=ri;
        g+=`<path d="M${f(x0)},${f(y0)} A${f(rx*k)},${f(R*k)} 0 0 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${f(rx*k)},${f(R*k)} 0 0 0 ${f(x3)},${f(y3)} Z" fill="${inC(sg.z)}" stroke="${inC(sg.z)}" stroke-width=".6"/>`;});
      g+=`<ellipse cx="${f(bx)}" cy="${f(cy)}" rx="${f(rx*ri)}" ry="${f(R*ri)}" fill="var(--surface)"/></g>`;
    }
    /* 막대 아래 이름 — 막대와 함께 밀려난다 */
    if(b.lab&&grow>.3)g+=`<text class="bxl${opt.cur===i?' cur':''}" x="${f(sx)}" y="${f(B+20)}" text-anchor="middle" opacity="${(1-r).toFixed(2)}">${esc(b.lab)}</text>`;
    /* 막대일 때 값 */
    if(t<.15&&grow>.98)g+=`<text class="bv${opt.cur===i?' cur':''}" x="${f(sx)}" y="${f(B-s.h-8)}" text-anchor="middle" opacity="${(1-t/.15).toFixed(2)}">${fmt(b.v)}</text>`;
    /* 펼친 뒤 — 가운데 합계 + 안내선 카드 */
    if(q>.01){
      /* v170 — topLab: 이름(월)은 도넛 위에 크게, 도넛 안에는 값만 */
      if(opt.topLab){const tw=String(b.label||'').length*17+30,ty=Math.max(17,cy-R-24);
        g+=`<g opacity="${q.toFixed(2)}"><rect class="dtl" x="${f(fx-tw/2)}" y="${f(ty-15)}" width="${tw}" height="28" rx="14"/><text class="dtlt" x="${f(fx)}" y="${f(ty+5)}" text-anchor="middle">${esc(b.label)}</text></g>
          <text class="dc2" x="${f(fx)}" y="${f(cy+6)}" text-anchor="middle" opacity="${q.toFixed(2)}">${fmt(b.v)}</text>`;}
      else g+=`<text class="dc1" x="${f(fx)}" y="${f(cy-4)}" text-anchor="middle" opacity="${q.toFixed(2)}">${esc(b.label)}</text>
        <text class="dc2" x="${f(fx)}" y="${f(cy+15)}" text-anchor="middle" opacity="${q.toFixed(2)}">${fmt(b.v)}</text>`;
      /* 카드 배치(교차 없는 자리 찾기)는 무거워 — 다 선 도넛이면 한 번만 계산해 두고 불투명도만 바꾼다 */
      if(r>=.999){if(!cardC[i])cardC[i]=rpBdCards(b,fx,cy,rx,R,'__Q__',W,H);g+=cardC[i].split('__Q__').join(q.toFixed(2));}
      else g+=rpBdCards(b,fx,cy,rx,R,q,W,H);
    }
    return g+'</g>';}
  function frame(now){
    if(!alive||!box.isConnected)return;
    let busy=false;const el=now-t0;
    /* v157 — 천천히(약 0.8초) 펼치고 닫는다 */
    const dtS=Math.min(.1,Math.max(0,(now-(frame._last||now))/1000))||1/60;frame._last=now;
    /* v160 — 마우스를 올린 막대는 살짝살짝 옆으로 돌려는 듯 흔들린다(누르면 펼쳐진다는 힌트) */
    st.forEach((s,i)=>{if(i===hov&&i!==act&&!reduce){s.tg=.045+.04*Math.sin(now/230);busy=true;}else if(i!==act&&s.tg<.5)s.tg=0;});
    st.forEach((s,i)=>{const sp=1.25*dtS;if(s.t<s.tg){s.t=Math.min(s.tg,s.t+sp);busy=true;}else if(s.t>s.tg){s.t=Math.max(s.tg,s.t-sp*1.25);busy=true;}});
    let hb='',ha='';
    const rs=st.map(s=>rpEase(rpClamp(s.t/.62,0,1)));
    st.forEach((s,i)=>{
      const dl=i*70,grow=reduce?1:rpEase(rpClamp((el-dl)/700,0,1));
      if(grow<1)busy=true;
      let off=0;rs.forEach((r2,j)=>{if(j!==i&&r2>0)off+=offFor(i,j)*r2;});s.cx=s.x+off;
      const html=draw(i,s.t,grow,off);
      if(i===act||s.t>.02)ha+=html;else hb+=html;});
    gB.innerHTML=hb;gA.innerHTML=ha;svg.classList.toggle('hot',act>=0);box.classList.toggle('open',act>=0);
    if(busy)raf=requestAnimationFrame(frame);else raf=0;}
  const kick=()=>{if(!raf){frame._last=0;raf=requestAnimationFrame(frame);}};
  let hov=-1;
  /* v157 — 마우스를 올리면 '누르면 펼친다'만 알리고, 누르면 펼친다. 닫기(×) · Esc · 펼친 도넛을 다시 누르면 막대로 */
  const pick=e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width;
    if(act>=0&&st[act].t>.4&&Math.abs(x-cxT(act))<RBX)return act;
    let bi=-1,bd=1e9;st.forEach((s,k)=>{if(k===act||!(bars[k].v>0))return;const dd=Math.abs(x-s.cx);if(dd<bd){bd=dd;bi=k;}});
    return bd<=Math.max(d*.9,gw*.45)?bi:-1;};
  const open=i=>{act=i;st.forEach((s,k)=>s.tg=k===i?1:0);hideTip();kick();};
  const close=()=>{act=-1;st.forEach(s=>s.tg=0);kick();};
  svg.addEventListener('mousemove',e=>{const i=pick(e);if(i!==hov){hov=i;kick();}
    svg.style.cursor=i>=0?'pointer':'';
    if(i>=0&&i!==act){const h=opt.tip?opt.tip(bars[i]):'';showTip(e.clientX,e.clientY,`${h||`<div class="t">${esc(bars[i].label||'')}</div>${rpTr(L('합계','Total'),fmt(bars[i].v))}`}<div class="hint">${L('누르면 내역이 펼쳐집니다','Click to open the breakdown')}</div>`);}
    else hideTip();});
  svg.addEventListener('mouseleave',()=>{hov=-1;svg.style.cursor='';hideTip();kick();});
  /* v162 — 호버 흔들림이 매 프레임 막대 그림을 새로 그려서 mousedown 과 mouseup 대상이 달라지면 'click' 이 안 생긴다
     → 누름 · 뗌(pointer)으로 직접 판단 */
  let pd=null;
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;pd={x:e.clientX,y:e.clientY,i:pick(e)};});
  svg.addEventListener('pointerup',e=>{const d=pd;pd=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8)return;
    const i=pick(e);const k=i>=0?i:d.i;if(k<0)return;if(k===act)close();else open(k);});
  svg.addEventListener('pointercancel',()=>{pd=null;});
  box.querySelector('.rpbdcl').onclick=e=>{e.stopPropagation();close();};
  const esc2=e=>{if(!box.isConnected){removeEventListener('keydown',esc2);return;}if(e.key==='Escape'&&act>=0)close();};addEventListener('keydown',esc2);
  kick();}
/* ---------- 안내선 — 서로 겹치지 않게 (v156) ----------
   점(조각 가운데 바깥 테두리) → 바깥쪽으로 조금 나간 꺾임점 → 카드 모서리. 같은 쪽 카드 자리들을 놓고
   선끼리 교차하면 두 카드의 자리를 맞바꾼다(교차가 없어질 때까지) */
function rpSegX(a,b,c,d){const o=(p,q,r)=>{const v=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return Math.abs(v)<1e-9?0:Math.sign(v);};
  return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;}
/* 양쪽 카드 수 맞추기 — 한쪽이 너무 많으면 위 · 아래 끝(가운데 세로선에 가까운) 점부터 반대쪽으로 */
function rpBalance(pts,cx){
  for(let it=0;it<20;it++){const l=pts.filter(p=>p.side<0),r=pts.filter(p=>p.side>0);
    if(Math.abs(l.length-r.length)<=1)break;const big=l.length>r.length?l:r;
    big.sort((a,b)=>Math.abs(a.ax-cx)-Math.abs(b.ax-cx))[0].side*=-1;}
  return pts;}
function rpLeaderPath(p,ex,ey){return [[p.ax,p.ay],[p.ox,p.oy],[ex,ey]];}
/* 교차하거나 2px 안으로 붙으면 겹친 것으로 본다 */
function rpPtSeg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l));return Math.hypot(a[0]+t*dx-p[0],a[1]+t*dy-p[1]);}
function rpSegNear(a,b,c,d,m){return rpSegX(a,b,c,d)||Math.min(rpPtSeg(a,c,d),rpPtSeg(b,c,d),rpPtSeg(c,a,b),rpPtSeg(d,a,b))<m;}
function rpCrossing(P1,P2){for(let i=0;i<P1.length-1;i++)for(let j=0;j<P2.length-1;j++)if(rpSegNear(P1[i],P1[i+1],P2[j],P2[j+1],2.5))return true;return false;}
/* 탐색 배치 — 점마다 꺾임 거리(바깥으로 얼마나 나갈지) · 카드 자리를 후보로 놓고, 이미 그린 선과 교차하지 않는 것 중
   자리 차이가 가장 작은 것을 고른다. 전부 교차하면 교차가 가장 적은 것 */
function rpPlace(L,ys,ex,CH){
  const cnt=r=>{const P=r.map(x=>x.P);let c=0;for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++)if(rpCrossing(P[i],P[j]))c++;return c;};
  const asg=rpUncross(L,ys,ex,CH),A=L.map((p,i)=>({k:asg[i],ox:p.ox,oy:p.oy,P:rpLeaderPath(p,ex,ys[asg[i]]+CH/2)}));
  let best=A,bc=cnt(A);if(!bc)return A;
  const ords=[L.map((_,i)=>i),L.map((_,i)=>L.length-1-i)];let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let t=0;t<200;t++){const o=L.map((_,i)=>i);for(let i=o.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[o[i],o[j]]=[o[j],o[i]];}ords.push(o);}
  for(const ord of ords){const r=rpPlaceG(L,ys,ex,CH,ord),c=cnt(r);if(c<bc){best=r;bc=c;}if(!bc)break;}
  return best;}
function rpPlaceG(L,ys,ex,CH,order){
  const used=new Set(),placed=[],res=new Array(L.length);
  for(const i of order){const p=L[i];let best=null;
    for(const dd of [10,14,20,28,38,50,66])for(let k=0;k<ys.length;k++){if(used.has(k))continue;
      const [ox,oy]=p.out?p.out(dd):[p.ox,p.oy],P=[[p.ax,p.ay],[ox,oy],[ex,ys[k]+CH/2]];
      let cr=0;for(const Q of placed)if(rpCrossing(P,Q))cr++;
      const sc=cr*10000+Math.abs(ys[k]+CH/2-oy)+dd*.8+Math.abs(k-i)*3;
      if(!best||sc<best.sc)best={sc,k,ox,oy,P};}
    used.add(best.k);placed.push(best.P);res[i]=best;}
  return res;}

function rpUncross(L,ys,exOf,CH){
  const asg=L.map((_,i)=>i),path=i=>rpLeaderPath(L[i],exOf,ys[asg[i]]+CH/2);
  for(let it=0;it<60;it++){let ch=false;
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)if(rpCrossing(path(i),path(j))){const t=asg[i];asg[i]=asg[j];asg[j]=t;ch=true;}
    if(!ch)break;}
  return asg;}
/* 펼친 도넛의 카드 — 조각 가운데에서 얇은 안내선, 왼쪽 · 오른쪽 열 */
function rpBdCards(b,cx,cy,rx,R,q,W,H){
  const tot=b.slices.reduce((a,x)=>a+x.v,0)||1;let a=-Math.PI/2;const pts=[];
  b.slices.forEach((z,k)=>{const sp=z.v/tot*Math.PI*2;const mid=a+sp/2;a+=sp;if(z.v<=0)return;
    pts.push({k,z,ax:cx+Math.cos(mid)*rx*.98,ay:cy+Math.sin(mid)*R*.98,ox:cx+Math.cos(mid)*(rx+14),oy:cy+Math.sin(mid)*(R+14),out:dd=>[cx+Math.cos(mid)*(rx+dd),cy+Math.sin(mid)*(R+dd)],side:Math.cos(mid)>=0?1:-1});});
  const CW=150,CH=pts.some(p=>p.z.sub)?46:34,GAP=6,out=[];
  const roomL=cx-rx-30-CW>=2,roomR=cx+rx+30+CW<=W-2;
  if(!roomL&&!roomR)return '';
  pts.forEach(p=>{if(p.side<0&&!roomL)p.side=1;if(p.side>0&&!roomR)p.side=-1;});
  /* 조각이 있는 쪽에 둔다 — 한쪽 열이 넘칠 때만 가운데(위 · 아래 끝)에 가까운 것부터 반대쪽으로 */
  if(roomL&&roomR){const cap=Math.max(1,Math.floor((H-8+GAP)/(CH+GAP)));
    for(let it=0;it<20;it++){const l=pts.filter(p=>p.side<0),r=pts.filter(p=>p.side>0),big=l.length>cap?l:r.length>cap?r:null;if(!big)break;
      big.sort((a2,b2)=>Math.abs(a2.ax-cx)-Math.abs(b2.ax-cx))[0].side*=-1;}}
  [-1,1].forEach(sd=>{const L=pts.filter(p=>p.side===sd).sort((p,q2)=>p.ay-q2.ay);
    let ys=L.map(p=>p.ay-CH/2);for(let i=1;i<ys.length;i++)ys[i]=Math.max(ys[i],ys[i-1]+CH+GAP);
    const over=ys.length?ys[ys.length-1]+CH-(H-4):0;if(over>0)ys=ys.map(y=>y-over);for(let i=0;i<ys.length;i++)ys[i]=Math.max(4+i*(CH+GAP),ys[i]);
    const bx0=sd>0?cx+rx+30:cx-rx-30-CW,ex0=sd>0?bx0:bx0+CW,pl=rpPlace(L,ys,ex0,CH);
    L.forEach((p,i)=>{const bx=bx0,y=ys[pl[i].k],ex=ex0,ey=y+CH/2,f=v=>v.toFixed(1);
      out.push(`<g class="bdc" opacity="${typeof q==='string'?q:q.toFixed(2)}"><path d="M${f(p.ax)},${f(p.ay)} L${f(pl[i].ox)},${f(pl[i].oy)} L${f(ex)},${f(ey)}" class="bdl"/>
        <rect x="${f(bx)}" y="${f(y)}" width="${f(CW)}" height="${CH}" rx="8" class="bdx"/><rect x="${f(bx+8)}" y="${f(y+CH/2-4)}" width="8" height="8" rx="2" fill="${p.z.col}"/>
        <text x="${f(bx+21)}" y="${f(y+14)}" class="bdn">${esc(p.z.n)}</text>
        <text x="${f(bx+21)}" y="${f(y+27)}" class="bds">${wrEok(p.z.v)} · ${(p.z.v/tot*100).toFixed(p.z.v/tot<.1?1:0)}%</text>${p.z.sub?`<text x="${f(bx+21)}" y="${f(y+40)}" class="bds">${esc(p.z.sub)}</text>`:''}</g>`);});});
  return out.join('');}

/* ---------------- ② 기운 3D 도넛 + 떼어 낸 코웨이 조각 + 안내선 카드 ---------------- */
function rp3dDonutSvg(S0,T,W,meKey,opt){
  const tot=S0.reduce((s,x)=>s+x.v,0);if(!tot)return {svg:'',S:[]};
  const CW=Math.min(170,W*.27),below0=!!(opt&&opt.below),R=Math.min((opt&&opt.R)||Math.min(W*.2,118),below0?1e9:(W/2-CW-34)/1.06),K=.56,r=R*.52,DEP=22,ROT=13*Math.PI/180,TAU=Math.PI*2,CH=38,PITCH=48,cs=Math.cos(ROT),sn=Math.sin(ROT);
  /* 카드 줄 수 — 다 펼친 각도로 왼쪽 · 오른쪽에 몇 개씩 가는지 */
  /* v162 — opt.lr: 조각 가운데가 위 · 아래(12시 · 6시)에 몰리지 않고 좌우(3시 · 9시)로 가도록 시작 각을 고른다.
     자사 조각(meKey)은 오른쪽. 안내선이 위로 꺾여 뭉치지 않게 */
  const lrStart=()=>{let best=-Math.PI/2,bc=1e9;
    for(let k=0;k<180;k++){const st=-Math.PI+k*TAU/180;let a=st,c=0;
      S0.forEach(z=>{const sp=z.v/tot*TAU,m=a+sp/2;a+=sp;const x=Math.cos(m)*cs-Math.sin(m)*K*sn,y=Math.cos(m)*sn+Math.sin(m)*K*cs,yn=y*y/((x*x+y*y)||1);
        c+=yn*(sp<TAU*.5?1:.3);if(meKey&&z.n===meKey&&x<0)c+=2;});
      if(c<bc-1e-9){bc=c;best=st;}}
    return best;};
  const A0=(opt&&opt.start!=null)?opt.start:(opt&&opt.lr)?lrStart():-Math.PI/2;
  const SG=opt&&opt.sideGrp!=null?opt.sideGrp:null;
  let aa=A0,nl=0,nr=0;S0.forEach(s=>{const sp=s.v/tot*TAU,mid=aa+sp/2;aa+=sp;const x=Math.cos(mid)*cs-Math.sin(mid)*K*sn;if(SG!=null?s.grp!==SG:x>=0)nr++;else nl++;});
  const below=!!(opt&&opt.below);
  const n=Math.max(Math.ceil((nl+nr)/2)+1,(SG!=null||(opt&&opt.lr))?Math.max(nl,nr):0),Hc=Math.max(n,3)*PITCH+16,cx=W/2,cy=below?R*K+18:Math.max(R*K+30,Hc/2),H=below?cy+R*K+DEP+30+CH+8:Math.max(cy+R*K+DEP+40,Hc+10),rc=cy+DEP/2;
  const rot=([x,y])=>[cx+(x-cx)*cs-(y-rc)*sn,rc+(x-cx)*sn+(y-rc)*cs];
  let a=A0;const S=S0.map((s,i)=>{const sp=s.v/tot*TAU*T,o={...s,i,a0:a,a1:a+sp};a+=sp;const mid=(o.a0+o.a1)/2,E=s.n===meKey?12*T:0;o.ox=Math.cos(mid)*E;o.oy=Math.sin(mid)*E*K;return o;});
  /* v157 — 묶음(grp) 단위로 떼어 내기: 묶음 전체 호의 가운데 방향으로 조금씩 벌린다 */
  if(opt&&opt.grp){const gs=[...new Set(S.map(x=>x.grp))];if(gs.length>1)gs.forEach(gk=>{const L2=S.filter(x=>x.grp===gk);if(!L2.length)return;
    const g0=L2[0].a0,g1=L2[L2.length-1].a1,mid=(g0+g1)/2,E=8*T;L2.forEach((x,k)=>{x.ox=Math.cos(mid)*E;x.oy=Math.sin(mid)*E*K;x.capA=k===0;x.capB=k===L2.length-1;});});}
  const P=(s,an,rr,dz)=>[cx+s.ox+Math.cos(an)*rr,cy+s.oy+Math.sin(an)*rr*K+(dz||0)];
  const arc=(s,rr,b0,b1,dz,rev)=>{const st=rev?b1:b0,en=rev?b0:b1,mid=(b0+b1)/2,[x0,y0]=P(s,st,rr,dz),[xm,ym]=P(s,mid,rr,dz),[x1,y1]=P(s,en,rr,dz),sw=rev?0:1,ry=(rr*K).toFixed(1);
    return [`${x0.toFixed(1)},${y0.toFixed(1)}`,`A${rr},${ry} 0 0 ${sw} ${xm.toFixed(1)},${ym.toFixed(1)} A${rr},${ry} 0 0 ${sw} ${x1.toFixed(1)},${y1.toFixed(1)}`];};
  const clips=(b0,b1,lo,hi)=>{const o=[];for(const k of [-1,0,1,2]){const x=Math.max(b0,lo+k*TAU),y=Math.min(b1,hi+k*TAU);if(y>x+1e-6)o.push([x,y]);}return o;};
  const wall=(s,rr,c)=>{const [m,aa]=arc(s,rr,c[0],c[1],0),[mb,ab]=arc(s,rr,c[0],c[1],DEP,true);return `M${m} ${aa} L${mb} ${ab} Z`;};
  let back='',walls='',tops='',caps='';
  /* v158 — 떼어 낸 조각 옆 이웃 조각의 맞닿은 단면도 그린다(떼어 내면 드러나는 면 — 비어 보이던 곳) */
  const meI=S.findIndex(x=>x.n===meKey);
  if(meI>=0&&S.length>1&&T>.5){const pv=S[(meI-1+S.length)%S.length],nx=S[(meI+1)%S.length];pv.capB2=1;nx.capA2=1;}
  S.forEach(s=>{if(s.a1-s.a0<1e-4)return;
    if((s.capA2||s.capB2)&&s.n!==meKey)[s.capA2?s.a0:null,s.capB2?s.a1:null].filter(x=>x!=null).forEach(an=>{const p=[P(s,an,r),P(s,an,R),P(s,an,R,DEP),P(s,an,r,DEP)];caps+=`<path class="sl" data-k="${s.i}" d="M${p.map(q=>q.map(z=>z.toFixed(1)).join(',')).join(' L')} Z" fill="${rpShadeC(s.col,.62)}"/>`;});
    clips(s.a0,s.a1,Math.PI,TAU).forEach(c=>back+=`<path class="sl" data-k="${s.i}" d="${wall(s,r,c)}" fill="${rpShadeC(s.col,.55)}"/>`);
    clips(s.a0,s.a1,0,Math.PI).forEach(c=>walls+=`<path class="sl" data-k="${s.i}" d="${wall(s,R,c)}" fill="${rpShadeC(s.col,.78)}"/>`);
    if((s.n===meKey||s.capA||s.capB)&&T>.5){/* 떼어 낸 조각(묶음)의 양쪽 단면 */
      (s.n===meKey?[s.a0,s.a1]:[s.capA?s.a0:null,s.capB?s.a1:null].filter(x=>x!=null)).forEach(an=>{const p=[P(s,an,r),P(s,an,R),P(s,an,R,DEP),P(s,an,r,DEP)];caps+=`<path class="sl" data-k="${s.i}" d="M${p.map(q=>q.map(z=>z.toFixed(1)).join(',')).join(' L')} Z" fill="${rpShadeC(s.col,.66)}"/>`;});}
    const [m,aa]=arc(s,R,s.a0,s.a1,0),[mi,ai]=arc(s,r,s.a0,s.a1,0,true);
    tops+=`<path class="sl" data-k="${s.i}" d="M${m} ${aa} L${mi} ${ai} Z" fill="${s.col}" stroke="${s.col}" stroke-width=".5"/>`;});
  /* 카드 — 다 펼친 뒤에만 */
  let lab='';
  if(T>=1&&below){
    /* 카드는 도넛 아래 한 줄 */
    const L=S.filter(s=>s.v>0),gap=10,cw=Math.min(170,(W-gap*(L.length-1)-4)/L.length),x0=(W-(cw*L.length+gap*(L.length-1)))/2,y=H-CH-4,f=v=>v.toFixed(1);
    L.forEach((s,i)=>{const bx=x0+i*(cw+gap);
      lab+=`<g class="cd" data-k="${s.i}"><rect class="bx" x="${f(bx)}" y="${f(y)}" width="${f(cw)}" height="${CH}" rx="9"/><rect x="${f(bx+10)}" y="${f(y+CH/2-4.5)}" width="9" height="9" rx="2.5" fill="${s.col}"/>
        <text x="${f(bx+26)}" y="${f(y+15)}" class="cn">${esc(s.n)}</text><text x="${f(bx+26)}" y="${f(y+30)}" class="cv">${(s.v/tot*100).toFixed(s.v/tot<.1?1:0)}% · ${wrEok(s.v)}</text></g>`;});}
  else if(T>=1){
    const pts=S.filter(s=>s.v>0).map(s=>{const mid=(s.a0+s.a1)/2,fr=Math.sin(mid)>0,[x,y]=rot(P(s,mid,R+2,fr?DEP*.45:0)),[ox,oy]=rot(P(s,mid,R+16,fr?DEP*.6:0));return {s,x,y,ax:x,ay:y,ox,oy,out:dd=>rot(P(s,mid,R+2+dd,fr?DEP*.6:0)),side:x>=cx?1:-1};});
    /* 균형 맞춘 배치 · 그대로 배치 · 위아래 끝 점 하나씩 뒤집은 배치 중 교차가 가장 적은 것 */
    const lay=sides=>{let html='';const paths=[];
      /* v158 — 카드는 양쪽 모두 같은 간격으로 쌓고, 묶음을 도넛 가운데 높이에 맞춘다(정돈된 열) */
      [-1,1].forEach(sd=>{const L=pts.filter((p,ii)=>sides[ii]===sd).sort(SG!=null?(p,q)=>sd>0?p.s.i-q.s.i:q.s.i-p.s.i:(p,q)=>p.oy-q.oy),GP=PITCH,tH=L.length*CH+Math.max(0,L.length-1)*(GP-CH);
        const y0=Math.max(4,Math.min(H-4-tH,rc-tH/2));let ys=L.map((p,i)=>y0+i*GP);
        /* v160 — 묶음(지상파 | 케이블) 도넛은 카드 순서 = 조각 순서(시계 방향). 그 밖에는 교차가 없도록 고른 배치 */
        const pl=SG!=null?L.map((p,i)=>({k:i,ox:p.ox,oy:p.oy})):rpPlace(L,ys,sd>0?W-CW-2:2+CW,CH);
        L.forEach((p,i)=>{const bx=sd>0?W-CW-2:2,y=ys[pl[i].k],ex=sd>0?bx:bx+CW,ey=y+CH/2,f=v=>v.toFixed(1),me=p.s.n===meKey;
          paths.push([[p.x,p.y],[pl[i].ox,pl[i].oy],[ex,ey]]);
          html+=`<g class="cd${me?' mine':''}" data-k="${p.s.i}"><path class="ln" d="M${f(p.x)},${f(p.y)} L${f(pl[i].ox)},${f(pl[i].oy)} L${f(ex)},${f(ey)}"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="2" class="lnd"/>
            <rect class="bx" x="${f(bx)}" y="${f(y)}" width="${f(CW)}" height="${CH}" rx="9"/><rect x="${f(bx+10)}" y="${f(ey-4.5)}" width="9" height="9" rx="2.5" fill="${p.s.col}"/>
            <text x="${f(bx+26)}" y="${f(y+15)}" class="cn">${esc(p.s.n)}</text><text x="${f(bx+26)}" y="${f(y+30)}" class="cv">${(p.s.v/tot*100).toFixed(p.s.v/tot<.1?1:0)}% · ${wrEok(p.s.v)}</text></g>`;});});
      let cr=0;for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++)if(rpCrossing(paths[i],paths[j]))cr++;
      return {html,cr,bal:Math.abs(sides.filter(x=>x<0).length-sides.filter(x=>x>0).length)};};
    const raw=pts.map(p=>p.side);
    if(SG!=null){const fx=pts.map(p=>p.s.grp===SG?-1:1);lab+=lay(fx).html;}
    else if(opt&&opt.lr){lab+=lay(raw).html;}   /* v162 — 좌우 배치 도넛은 카드도 조각이 있는 쪽 그대로 */
    else{rpBalance(pts,cx);const bal=pts.map(p=>p.side);
    const cands=[bal,raw];const near=pts.map((p,i)=>i).sort((a,b)=>Math.abs(pts[a].ax-cx)-Math.abs(pts[b].ax-cx)).slice(0,3);
    for(let m=1;m<(1<<near.length);m++){const c=bal.slice();near.forEach((i,b)=>{if(m>>b&1)c[i]*=-1;});cands.push(c);}
    let best=null;for(const c of cands){if(Math.abs(c.filter(x=>x<0).length-c.filter(x=>x>0).length)>3)continue;const r=lay(c);if(!best||r.cr<best.cr||(r.cr===best.cr&&r.bal<best.bal))best=r;if(!best.cr&&c===bal)break;}
    lab+=best.html;}}
  return {svg:`<svg class="rp3d${T>=1?' done':''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><filter id="rp3sh" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <g transform="rotate(13 ${cx} ${rc})"><path d="M${cx-R*1.02},${cy+DEP+7} a${R*1.02},${R*K*1.02} 0 1 0 ${R*2.04},0 a${R*1.02},${R*K*1.02} 0 1 0 ${-R*2.04},0 Z M${cx-r*.92},${cy+DEP+7} a${r*.92},${r*K*.92} 0 1 1 ${r*1.84},0 a${r*.92},${r*K*.92} 0 1 1 ${-r*1.84},0 Z" fill-rule="evenodd" fill="rgba(16,28,44,${(.2*Math.min(1,T)).toFixed(3)})" filter="url(#rp3sh)"/>${back}${caps}${walls}${tops}
    <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R*K}" fill="url(#rp3hl)" pointer-events="none" opacity="${Math.min(1,T).toFixed(2)}"/></g>${lab}
    <defs><radialGradient id="rp3hl" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`,S};}
/* 3% 미만 작은 조각은 '기타'로 묶는다(코웨이는 묶지 않음) — 안내선 · 카드가 엉키지 않게 */
function rpGroupSmall(segs,keep,th){th=th||.04;const tot=segs.reduce((s2,x)=>s2+x.v,0)||1;
  /* 코웨이도 0.5% 미만이면(조각이 안 보일 만큼) 함께 묶는다 */
  const small=segs.filter(x=>x.v/tot<th&&(x.n!==keep||x.v/tot<.005));if(small.length<2)return segs;
  return segs.filter(x=>!small.includes(x)).concat([{n:L(`기타 ${small.length}개`,`Other (${small.length})`),v:small.reduce((s2,x)=>s2+x.v,0),col:'#c9ced4',etc:small}]);}
function rp3dDonut(box,segs,meKey,opt){
  if(opt&&opt.grp){const gs=[...new Set(segs.map(x=>x.grp))];segs=gs.flatMap(gk=>{const L2=segs.filter(x=>x.grp===gk),tot=segs.reduce((a,x)=>a+x.v,0);
      /* 묶음마다 작은 조각 합치기 — 비율은 전체 기준 */
      const small=L2.filter(x=>x.v/tot<.04);if(small.length<2)return L2;
      return L2.filter(x=>!small.includes(x)).concat([{n:L(`기타 ${small.length}개`,`Other (${small.length})`),v:small.reduce((a,x)=>a+x.v,0),col:gk==='t'?'#c7d5e8':'#d4d8dc',grp:gk,etc:small}]);});
    /* v160 — 둘째 묶음부터는 큰 조각을 양끝(왼쪽으로 감기는 자리)에, 작은 조각을 가운데(오른쪽 정면)에 —
       오른쪽 카드로 가는 안내선이 도넛을 가로지르지 않게 */
    {const g0=segs.length?segs[0].grp:null,head=segs.filter(x=>x.grp===g0),rest=segs.filter(x=>x.grp!==g0).sort((a,b)=>b.v-a.v),F=[],B=[];
     rest.forEach((x,i)=>(i%2?B:F).push(x));segs=head.concat(F,B.reverse());}
    /* v160 — 첫 묶음(지상파 계열)은 왼쪽, 나머지(케이블)는 오른쪽 — 첫 묶음 호의 가운데 = 정확히 왼쪽(180°).
       카드도 묶음대로 지상파는 왼쪽 열, 케이블은 오른쪽 열에 둔다 (rp3dDonutSvg 의 opt.sideGrp) */
    const tot2=segs.reduce((a,x)=>a+x.v,0),g0=segs.length?segs[0].grp:null,share=tot2?segs.filter(x=>x.grp===g0).reduce((a,x)=>a+x.v,0)/tot2:0;
    opt={...opt,start:Math.PI-Math.PI*share,sideGrp:g0};}
  else segs=rpGroupSmall(segs,meKey);
  if(!box)return;const W=Math.max(480,box.clientWidth||600),id=(box._a=(box._a||0)+1),t0=performance.now(),DUR=1100;
  const tot=segs.reduce((s,x)=>s+x.v,0);
  const wire=()=>{const svg=box.querySelector('svg');if(!svg)return;
    const hot=k=>{svg.classList.toggle('hot',k!=null);svg.querySelectorAll('[data-k]').forEach(e=>e.classList.toggle('on',e.dataset.k===String(k)));};
    svg.addEventListener('mousemove',e=>{const g=e.target.closest('[data-k]');if(!g){hot(null);hideTip();return;}hot(g.dataset.k);const s=segs[+g.dataset.k];
      showTip(e.clientX,e.clientY,`<div class="t">${esc(s.n)}</div>${rpTr(L('광고비','Spend'),wrEok(s.v))}${rpTr(L('점유율','Share'),rpP(s.v/tot*100,1))}${s.etc?`<div class="tsec">${L('묶인 항목','Grouped')}</div>`+s.etc.map(x=>rpTr(esc(x.n),wrEok(x.v))).join(''):''}`);});
    svg.addEventListener('mouseleave',()=>{hot(null);hideTip();});};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){box.innerHTML=rp3dDonutSvg(segs,1,W,meKey,opt).svg;wire();return;}
  const fr=now=>{if(box._a!==id)return;const x=Math.min(1,(now-t0)/DUR);box.innerHTML=rp3dDonutSvg(segs,x<1?1-Math.pow(1-x,3):1,W,meKey,opt).svg;if(x<1)requestAnimationFrame(fr);else wire();};
  requestAnimationFrame(fr);}

/* ---------------- ③ 부드러운 영역 그래프 ---------------- */
/* 디지털 영역 그래프 색 — 보내 준 예시처럼 서로 구분되는 부드러운 색(코웨이는 파랑) */
const RP_AREA=['#e3923f','#57a77a','#8a63c8','#d4566a','#3fa6b5','#b8a03a','#c46fb0','#7f8c99','#6f9a3f','#a27552'];
function rpSmooth(pts,free,tn){if(pts.length<2)return pts.length?`M${pts[0][0]},${pts[0][1]}`:'';let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2,t=tn||.18;
    /* 조절점 높이는 두 점 사이로 묶는다 — 0 아래로 꺼지거나 봉우리가 부풀지 않게 */
    const lo=free?-1e9:Math.min(p1[1],p2[1]),hi=free?1e9:Math.max(p1[1],p2[1]);
    const c1=[p1[0]+(p2[0]-p0[0])*t,rpClamp(p1[1]+(p2[1]-p0[1])*t,lo,hi)],c2=[p2[0]-(p3[0]-p1[0])*t,rpClamp(p2[1]-(p3[1]-p1[1])*t,lo,hi)];
    d+=` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;}return d;}
/* v158 — 단조 3차 보간(Fritsch–Carlson): 값 사이를 넘치지 않으면서 꺾임 없이 매끄럽게(봉우리 · 골도 둥글게) */
function rpMonoPath(pts){const n=pts.length;if(n<2)return n?`M${pts[0][0]},${pts[0][1]}`:'';
  const dx=[],dy=[],ms=[];for(let i=0;i<n-1;i++){dx.push(pts[i+1][0]-pts[i][0]);dy.push(pts[i+1][1]-pts[i][1]);ms.push(dy[i]/(dx[i]||1));}
  const t=[ms[0]];for(let i=1;i<n-1;i++){if(ms[i-1]*ms[i]<=0)t.push(0);else{const w1=2*dx[i]+dx[i-1],w2=dx[i]+2*dx[i-1];t.push((w1+w2)/(w1/ms[i-1]+w2/ms[i]));}}t.push(ms[n-2]);
  let d=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=0;i<n-1;i++){const h=dx[i]/3;d+=` C${(pts[i][0]+h).toFixed(1)},${(pts[i][1]+t[i]*h).toFixed(1)} ${(pts[i+1][0]-h).toFixed(1)},${(pts[i+1][1]-t[i+1]*h).toFixed(1)} ${pts[i+1][0].toFixed(1)},${pts[i+1][1].toFixed(1)}`;}
  return d;}
function rpAreaChart(box,ser,labels,opt){
  if(!box)return;opt=opt||{};const off=new Set(box._off||[]);
  const draw=()=>{
    const yrs=opt.years||null,vis=ser.filter(s=>!off.has(s.b)),W=Math.max(420,box.clientWidth||600),H=opt.H||300,L0=44,R0=W-18,T=16,B=H-(yrs?46:28),N=labels.length,step=(R0-L0)/Math.max(1,N-1);
    const mx0=Math.max(1,...vis.flatMap(s=>s.v)),nice=v=>{const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e;},mx=nice(mx0*1.08);
    const X=i=>N===1?(L0+R0)/2:L0+step*i,Y=v=>B-(B-T)*v/mx;let g='',defs='';
    for(let k=0;k<=4;k++){const v=mx*k/4,y=Y(v);g+=`<line x1="${L0}" x2="${R0}" y1="${y}" y2="${y}" class="gl"/><text x="${L0-6}" y="${y+3.5}" text-anchor="end" class="ax">${k?wrEok(v):'0'}</text>`;}
    labels.forEach((l,i)=>g+=`<text x="${X(i)}" y="${B+18}" text-anchor="middle" class="ax${yrs?' mo':''}">${esc(l)}</text>`);
    /* 둘째 줄 — 연도(그 해 달들 가운데, 양옆 옅은 괄호선) */
    if(yrs){let i0=0;for(let i=1;i<=N;i++){if(i===N||yrs[i]!==yrs[i0]){const xa=X(i0),xb=X(i-1),xm=(xa+xb)/2;
      g+=`<path d="M${xa-6},${B+28} v4 H${xb+6} v-4" class="yb"/><rect x="${xm-22}" y="${B+26}" width="44" height="14" class="ybg"/><text x="${xm}" y="${B+37}" text-anchor="middle" class="ax yr">${L(yrs[i0]+'년',String(yrs[i0]))}</text>`;i0=i;}}}
    /* 큰 것부터 뒤에 — 작은 영역이 가려지지 않게 */
    [...vis].sort((a,b)=>rpSum(b.v)-rpSum(a.v)).forEach((s,k)=>{const id='rpag'+Math.random().toString(36).slice(2,8),pts=s.v.map((v,i)=>[X(i),Y(v)]);
      defs+=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.col}" stop-opacity="${s.mine?.5:.38}"/><stop offset="1" stop-color="${s.col}" stop-opacity="0"/></linearGradient>`;
      const dl=rpMonoPath(pts);g+=`<path d="${dl} L${X(N-1)},${B} L${X(0)},${B} Z" fill="url(#${id})" class="ar" style="--d:${k*90}ms"/><path d="${dl}" class="ln${s.mine?' mine':''}" stroke="${s.col}" style="--d:${k*90}ms" pathLength="1"/>`;});
    box.innerHTML=`<div class="rpalg">${ser.map(s=>`<button type="button" class="${off.has(s.b)?'off':''}${s.mine?' mine':''}" data-b="${esc(s.b)}"><i style="background:${s.col}"></i>${esc(s.b)}</button>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="rparea"><defs>${defs}</defs>${g}<line class="xh" y1="${T}" y2="${B}" x1="-10" x2="-10"/></svg>`;
    rpGo(box);
    box.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const k=b.dataset.b;if(off.has(k))off.delete(k);else off.add(k);box._off=[...off];draw();});
    const svg=box.querySelector('svg'),xh=svg.querySelector('.xh');
    svg.addEventListener('mousemove',e=>{const pt=svg.getBoundingClientRect(),x=(e.clientX-pt.left)*W/pt.width,i=rpClamp(Math.round(N===1?0:(x-L0)/step),0,N-1);
      xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));const list=vis.map(s=>[s,s.v[i]]).filter(z=>z[1]>0).sort((a,b)=>b[1]-a[1]);
      showTip(e.clientX,e.clientY,`<div class="t">${yrs?esc(L(yrs[i]+'년 ',yrs[i]+' ')):''}${esc(labels[i])}${opt.title?` · ${esc(opt.title)}`:''}</div>${list.length?list.map(([s,v])=>rpTr(`<i class="dot" style="background:${s.col}"></i>${esc(s.b)}`,wrEok(v))).join(''):`<div class="r">${L('집행 없음','None')}</div>`}`);});
    svg.addEventListener('mouseleave',()=>{xh.setAttribute('x1',-10);xh.setAttribute('x2',-10);hideTip();});};
  draw();}
