
/* ===== 데이터 투어 (v116) =====
   디지털 대시보드 › 서머리의 그래프를 한 장씩 전체 화면으로 — 바로 발표할 수 있게.
   ■ 장면 — 표지 → 화면에 보이는 영역(숨긴 영역 · 숨긴 서머리는 빠짐) 하나씩 → 마무리(핵심 요약 · PPT 저장)
     유입 분석은 세 장(흐름 · 랜딩/체류 · 상세 표)으로 나눈다
   ■ 위쪽 제목 · 부제목 = 그 영역에서 자동으로 뽑은 시사점(한/영). 제목 속 숫자는 강조색
   ■ 그래프는 화면 가운데에서 떠오르며 채워지고(23-anim 규칙 그대로) · 눈에 띄는 곳을 강조(나머지를 조금 투명하게 · 이름표, v119 테두리 없앰)
     차례가 여럿이면(유입 분석의 그래프 세 개) 하나씩 넘어가며 강조하고 끝나면 모두 다시 진하게
   ■ 제목 = 전체 효과(합계 · 평균 · 몇 개 중 몇 개), 부제목 = 눈에 띄는 것(가장 높은 · 낮은 곳) (v119)
   ■ 위 오른쪽 — 문구 편집(E · 그 자리에서 고쳐 쓰기 · Ctrl+B 강조) · 다운로드(PPT · 파일) · 자동 재생 · 닫기 (v119)
   ■ 좌우 단추 · ← → · Space · PageUp/Down(발표용 리모컨) · 스와이프 · 진행 막대 클릭 · P 자동 재생 · Esc 닫기
   ■ 넘어갈 때 3D 로 돌아 나가고 들어온다. 바닥 격자도 함께 흘러 카메라가 옆 전시물로 옮겨 가는 느낌
   ■ 마지막 장 = 갈래별 핵심 요약(v119) · 'PPT로 저장' — 장마다 위쪽에 편집할 수 있는 글(Pretendard) + 바탕 없는(누끼) 그래프 그림(강조 모습 그대로) + 이름표
   ■ 화면의 그래프는 원본을 복제해 쓴다 — 원본은 건드리지 않는다(저장 · 클라우드와 무관) */
const TU={el:null,deck:null,slides:[],i:-1,node:null,timers:[],play:false,playT:0,fs:false,fx:0,rm:false,ppt:0,daily:null,hintT:0,raf:0,rz:0};
const TU_PLAY=9000;
const TU_CONTENT='.card,.stat,.donut,svg,table,.cr,.cmt,.tile,.infk,canvas,img';
const tuTx=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
const tuNum=s=>{s=String(s==null?'':s).replace(/[−–]/g,'-');const m=/-?\d[\d,]*(?:\.\d+)?/.exec(s);return m?parseFloat(m[0].replace(/,/g,'')):NaN;};
const tuPc=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
const tuCost=l=>/^\s*(목표\s*)?C(P[A-Z]|TC|PM)|단가|cost/i.test(l||'');
const tuSelTx=id=>{const s=$(id);return s&&s.selectedOptions&&s.selectedOptions[0]?tuTx(s.selectedOptions[0]):'';};
const tuVis=n=>!!(n&&n.getClientRects().length&&!n.classList.contains('hidden'));
/* 제목에서 강조할 값 — E(값) 으로 감싸 둔다(이름 속 숫자 '6초 범퍼' 같은 것은 강조하지 않게) */
const E=v=>`\u0002${v}\u0003`;
const tuPlain=t=>String(t||'').replace(/[\u0002\u0003]/g,'');
function tuWords(t){
  const words=[];let w='',em=false;
  const end=()=>{if(w.replace(/<\/?em>/g,''))words.push(w+(em?'</em>':''));w=em?'<em>':'';};
  for(const ch of String(t||'')){
    if(ch==='\u0002'){em=true;w+='<em>';continue;}
    if(ch==='\u0003'){em=false;w+='</em>';continue;}
    if(/\s/.test(ch)){end();continue;}
    w+=esc(ch);}
  end();
  return words.map(x=>`<span class="w"><span>${x}</span></span>`).join(' ');}
/* PPT 제목 — 강조한 값만 강조색 글자 */
function tuRuns(t,col,acc){
  return String(t||'').split(/[\u0002\u0003]/).map((p,k)=>({text:p,options:{color:k%2?acc:col}})).filter(r=>r.text!=='');}
/* 큰 수는 읽기 쉽게 — 2,009,041 → 201만 / 2.01M (₩ 는 그대로) */
function tuBig(v,f){
  const s=f?String(f(v)):String(v),pre=/^₩/.test(s)?'₩':'',a=Math.abs(v);
  if(!(a>=1e4))return s;
  if(LANG==='en'){const [d,u]=a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:[1e3,'K'];const x=v/d;return pre+(Math.abs(x)>=100?x.toFixed(0):x.toFixed(Math.abs(x)>=10?1:2))+u;}
  if(a>=1e8){const x=v/1e8;return pre+(Math.abs(x)>=100?x.toFixed(0):x.toFixed(1))+'억';}
  const x=v/1e4;return pre+(Math.abs(x)>=100?Math.round(x).toLocaleString('en-US'):x.toFixed(1))+'만';}

/* ---------- 1. 장면 모으기 ---------- */
/* 서머리 화면을 위에서 아래로 — 영역 제목(.sec) + 그 아래 보이는 내용 묶음 */
function tuGroups(){
  const host=$('sub-perf');if(!host)return [];
  const out=[];let cur=null;
  const walk=c=>{for(const n of c.children){
    if(n.nodeType!==1||!tuVis(n))continue;
    if(n.classList.contains('sec')){cur={sec:n,els:[]};out.push(cur);continue;}
    if(!n.classList.contains('card')&&n.querySelector('.sec')){walk(n);continue;}
    if(n.matches('.filters,.hiddenbar,.barlbl,[id$="CfgBox"],.hint'))continue;
    if(!n.matches(TU_CONTENT)&&!n.querySelector(TU_CONTENT))continue;   /* 단추만 있는 줄 등 */
    if(cur)cur.els.push(n);}};
  walk(host);
  return out.filter(g=>g.els.length);}
/* 원본 → 복제 (화면용 원본 그대로 · 조작 단추는 CSS 로 감춤) */
const tuPath=(root,el)=>{const p=[];while(el&&el!==root){p.unshift([...el.parentNode.children].indexOf(el));el=el.parentNode;}return p;};
const tuAt=(root,p)=>p.reduce((e,i)=>e&&e.children[i],root);
function tuClone(els,keep){
  const src=document.createElement('div');src.className='tu-src';
  let W=0,extra=0,tblX=0;
  els.forEach(o=>{
    W=Math.max(W,o.getBoundingClientRect().width);
    const c=o.cloneNode(true);
    /* 가로로 넘겨 보는 상자 — 표는 그대로(투어에서 강조할 칸으로 옮겨 간다), 카드 줄은 펼친다 */
    const scs=[o,...o.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);
      return /auto|scroll/.test(cs.overflowX)&&e.scrollWidth>e.clientWidth+1&&tuVis(e);});
    scs.forEach(e=>{const d=e.scrollWidth-e.clientWidth;
      if(e.querySelector('table')||e.tagName==='TABLE')tblX=Math.max(tblX,d);
      else{extra=Math.max(extra,d);const ce=tuAt(c,tuPath(o,e));if(ce){ce.classList.add('tu-xp');ce.classList.remove('hpover');}}});
    src.appendChild(c);});
  if(keep)keep(src);
  /* 애니메이션 · 변화량 배지 흔적, 편집 · 끌기 속성은 지운다 */
  src.querySelectorAll('.axdelta').forEach(n=>n.remove());
  src.querySelectorAll('.ax,.ax-wait,.axhasdelta').forEach(n=>{[...n.classList].forEach(k=>{if(/^ax/.test(k))n.classList.remove(k);});n.style.removeProperty('--axd');});
  src.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  src.querySelectorAll('[draggable]').forEach(n=>n.removeAttribute('draggable'));
  src.querySelectorAll('[pathLength="1"]').forEach(n=>n.removeAttribute('pathLength'));
  W=Math.ceil(W+extra);src.style.width=W+'px';
  return {src,W,tblX};}
/* 장면 하나 만들기 + 시사점 */
/* 사람이 고친 문구 — 이 창을 닫기 전까지 캠페인 · 장면마다 기억한다(투어를 다시 열어도 · PPT · HTML 에도 그대로) (v119) */
const TU_EDITS=new Map();
const tuEditKey=sl=>`${(typeof CAMPAIGN!=='undefined'&&(CAMPAIGN.id||CAMPAIGN.name))||''}|${LANG}|${sl.key}|${sl.label}`;
/* 자동 문구는 t0 · s0 에 남겨 두고('원래대로'), 고친 문구가 있으면 그것으로 */
function tuApplyEdit(sl){sl.t0=sl.t;sl.s0=sl.s||'';const ed=TU_EDITS.get(tuEditKey(sl));if(ed){sl.t=ed.t;sl.s=ed.s;}return sl;}
function tuMk(key,label,els,keep){
  const {src,W,tblX}=tuClone(els,keep);
  const sl={kind:'body',key,label,src,W,tblX,chips:[]};
  /* 강조할 곳 — step 이 다르면 차례로(유입 분석의 그래프 세 개처럼) */
  const h=(el,chip,step)=>{if(!el)return;el.setAttribute('data-tuhl',String(sl.chips.length));
    if(step)el.setAttribute('data-tust',String(step));sl.chips.push(chip||'');};
  let r=null;
  try{const f=TU_INS[key];r=f?f(sl,h):null;}catch(e){console.warn('tour insight',key,e);}
  if(r&&r.skip)return null;
  /* 시사점도 없고 그래프 · 표도 없으면(데이터 없음 안내뿐) 장면을 뺀다 */
  if(!r&&!src.querySelector('svg,table,canvas,img,.stat,.donut,.cr,.tile,.infk,.cmt'))return null;
  if(!r||!r.t){src.querySelectorAll('[data-tuhl]').forEach(n=>{n.removeAttribute('data-tuhl');n.removeAttribute('data-tust');});sl.chips=[];r={t:label,s:''};}
  sl.t=r.t;sl.s=r.s||'';
  if(LANG==='en'&&sl.s)sl.s=sl.s.charAt(0).toUpperCase()+sl.s.slice(1);
  return tuApplyEdit(sl);}
function tuBuild(){
  const out=[];
  tuGroups().forEach(g=>{
    const sec=g.sec;
    const key=sec.dataset.sect||(sec.closest('#summaryHost')?'sum':'misc');
    const label=(typeof snLabel==='function'?snLabel(sec):tuTx(sec))||key;
    if(key==='inflow'){
      /* 유입 분석은 세 장 — ① 지표 + 흐름 ② 지도 · 랜딩 · 체류 ③ 상세 표 */
      const card=g.els.find(e=>e.querySelector('#infBody'));
      const body=card&&card.querySelector('#infBody');
      if(body){
        const kids=[...body.children].filter(tuVis);
        const pick=sel=>kids.filter(k=>k.matches(sel));
        const parts=[['infA',pick('.infkpis,.infflow')],['infB',pick('.infgrid')],['infC',pick('.infcell.hpcard')]];
        parts.forEach(([k,keepEls])=>{
          if(!keepEls.length)return;
          const ks=new Set(keepEls);
          const subs=[...new Set(keepEls.flatMap(e=>[...e.querySelectorAll('.infh>b')].filter(tuVis).map(tuTx)).filter(Boolean))];
          let sub=subs.slice(0,2).join(' · ');if(sub.length>26)sub=subs[0];
          const sl=tuMk(k,sub?`${label} · ${sub}`:label,[card],src=>{
            const b=src.querySelector('#infBody');if(!b)return;
            [...b.children].filter((c,i)=>!ks.has(body.children[i])).forEach(c=>c.remove());});
          if(sl)out.push(sl);});
        return;}}
    const sl=tuMk(key,label,g.els);
    if(sl)out.push(sl);});
  return out;}

/* ---------- 2. 시사점 — 영역마다 제목 · 부제목 · 강조할 곳 ---------- */
const tuDay=d=>L(`${d.getMonth()+1}/${d.getDate()}(${'일월화수목금토'[d.getDay()]})`,
  `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`);
const tuJoin=a=>a.filter(Boolean).join(' · ');
/* (v119) 제목 = 전체 효과(합계 · 평균 · 몇 개 중 몇 개), 부제목 = 눈에 띄는 것(가장 높은 · 낮은 곳).
   강조는 부제목에 나온 '눈에 띄는 것' — 나머지를 옅게 해서 상대적으로 진하게 */
const tuMean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
/* 큰 금액 · 수 글자 → 짧게(₩249,866,835 → ₩2.5억 / 8,644만) · % 는 그대로 */
const tuShortTx=v=>{const t=String(v||'').trim();if(/%\s*$/.test(t))return t;const n=tuNum(t);if(!isFinite(n))return t;
  const pre=/^₩/.test(t)?'₩':'';return Math.abs(n)>=1e4?tuBig(n,x=>pre+Math.round(x).toLocaleString('en-US')):t;};
const TU_INS={
  /* 캠페인 구조 (v119 마인드맵) — 구성 개수 · 구분별 예산 비중 */
  struct(sl){
    const cs=[...sl.src.querySelectorAll('.cs-cnt span')].map(x=>({n:tuTx(x.querySelector('b')),l:tuTx(x).replace(tuTx(x.querySelector('b')),'').trim()})).filter(x=>x.n);
    if(!cs.length)return null;
    const seg=[...sl.src.querySelectorAll('.cs-lg span')].filter(x=>x.querySelector('i')&&!x.classList.contains('cs-scale'))
      .map(x=>{const b=tuTx(x.querySelector('b'));return b?`${b} ${tuTx(x).replace(b,'').trim()}`:'';}).filter(Boolean);
    const bud=[...document.querySelectorAll('#campBar .it')].find(i=>/예산|budget/i.test(tuTx(i.querySelector('.k'))));
    return {t:cs.map(x=>`${x.l} ${E(x.n)}`).join(' · '),
      s:tuJoin([bud&&L(`총 예산 ${tuShortTx(tuTx(bud.querySelector('.v')).split(' ')[0])}`,`Total budget ${tuShortTx(tuTx(bud.querySelector('.v')).split(' ')[0])}`),
        seg.length?L(`예산 비중 ${seg.join(' · ')}`,`budget split ${seg.join(' · ')}`):''])};},
  /* 캠페인 진행 현황 — 목표 페이스를 넘은 지표 수 / 가장 앞선 · 더딘 지표 */
  pace(sl,h){
    const rows=[...sl.src.querySelectorAll('.pline')].map(line=>{
      const b=line.querySelector('.pbar[data-tip]');let d=null;
      try{d=b&&JSON.parse(b.getAttribute('data-tip'));}catch(e){}
      return d&&d.goal>0&&isFinite(d.pr)?{line,pr:d.pr,l:tuTx(line.querySelector('.pside .nm1'))||d.l}:null;}).filter(Boolean);
    if(!rows.length)return null;
    const n=rows.length,okR=rows.filter(x=>x.pr>=0.995),ok=okR.length,avg=tuMean(rows.map(x=>x.pr));
    const best=rows.reduce((a,b)=>b.pr>a.pr?b:a),worst=rows.reduce((a,b)=>b.pr<a.pr?b:a);
    const m=/(\d+(?:\.\d+)?)\s*%/.exec(tuTx(sl.src.querySelector('.phead'))),el=m?m[1]+'%':'';
    h(best.line,L(`최고 ${tuPc(best.pr)}`,`Top ${tuPc(best.pr)}`));
    if(worst!==best)h(worst.line,L(`최저 ${tuPc(worst.pr)}`,`Low ${tuPc(worst.pr)}`));
    const t=ok===n?L(`주요 지표 ${E(n+'개')} 모두 목표 페이스 달성`,`All ${E(n)} key metrics on target pace`)
      :ok?L(`주요 지표 ${n}개 중 ${E(ok+'개')} 목표 페이스 달성`,`${E(ok)} of ${n} key metrics on target pace`)
      :L(`주요 지표 평균 페이스 ${E(tuPc(avg))}`,`Key metrics at ${E(tuPc(avg))} of pace on average`);
    return {t,s:tuJoin([el&&L(`캠페인 ${el} 경과`,`${el} of the flight elapsed`),
      L(`가장 앞선 ${best.l} ${tuPc(best.pr)}`,`ahead: ${best.l} ${tuPc(best.pr)}`),
      worst!==best&&L(`가장 더딘 ${worst.l} ${tuPc(worst.pr)}`,`slowest: ${worst.l} ${tuPc(worst.pr)}`)])};},
  /* 주요 지표 — 합계 숫자 / 페이스 대비 가장 앞선 · 뒤처진 지표 */
  stat(sl,h){
    const pp=s=>{const m=/[+−-]\s?\d[\d.,]*\s?%p?/.exec(s||'');return m?m[0].replace(/\s/g,''):'';};
    const cs=[...sl.src.querySelectorAll('.stat')].map(c=>{const dl=c.querySelector('.dl');
      return {c,k:tuTx(c.querySelector('.k')),v:tuTx(c.querySelector('.v')),r:tuTx(c.querySelector('.r b')),
        dt:dl?pp(tuTx(dl)):'',d:dl?tuNum(pp(tuTx(dl))):NaN};}).filter(x=>x.k&&x.v);
    if(!cs.length)return null;
    const t=cs.slice(0,3).map(x=>`${x.k} ${E(tuShortTx(x.v))}`).join(' · ');
    const wd=cs.filter(x=>isFinite(x.d));
    if(!wd.length)return {t,s:tuJoin(cs.slice(3,6).map(x=>`${x.k} ${tuShortTx(x.v)}`))};
    const best=wd.reduce((a,b)=>b.d>a.d?b:a),worst=wd.reduce((a,b)=>b.d<a.d?b:a),up=wd.filter(x=>x.d>=0).length;
    h(best.c,L(`페이스 대비 ${best.dt}`,`${best.dt} vs pace`));
    if(worst!==best)h(worst.c,L(`페이스 대비 ${worst.dt}`,`${worst.dt} vs pace`));
    return {t,s:tuJoin([L(`페이스 이상 ${up}/${wd.length}개`,`${up} of ${wd.length} at or above pace`),
      L(`가장 앞선 ${best.k} ${best.dt}`,`ahead: ${best.k} ${best.dt}`),
      worst!==best&&L(`가장 뒤처진 ${worst.k} ${worst.dt}`,`furthest behind: ${worst.k} ${worst.dt}`)])};},
  /* KPI 달성 현황 — 몇 개 중 몇 개 달성 · 평균 / 최고 · 최저 */
  kpi(sl,h){
    const ds=[...sl.src.querySelectorAll('.donut')];
    const sp=ds.find(d=>d.classList.contains('spend'));
    const it=ds.filter(d=>d!==sp).map(d=>{const a=d.querySelector('.achv');
      return {d,nm:tuTx(d.querySelector('.dhd .k')),vt:tuTx(a),v:tuNum(tuTx(a))};}).filter(x=>x.nm&&isFinite(x.v));
    const spv=sp?tuTx(sp.querySelector('.achv')):'';
    if(!it.length){if(!sp)return null;return {t:L(`예산 소진율 ${E(spv)}`,`Budget spent: ${E(spv)}`),s:''};}
    const n=it.length,hit=it.filter(x=>x.v>=100).length,avg=tuMean(it.map(x=>x.v)).toFixed(1)+'%';
    const top=it.reduce((a,b)=>b.v>a.v?b:a),low=it.reduce((a,b)=>b.v<a.v?b:a);
    h(top.d,L(`최고 ${top.vt}`,`Top ${top.vt}`));if(low!==top)h(low.d,L(`최저 ${low.vt}`,`Low ${low.vt}`));
    const t=hit===n&&n>1?L(`KPI ${E(n+'개')} 모두 목표 달성 · 평균 ${E(avg)}`,`All ${E(n)} KPIs on target · ${E(avg)} on average`)
      :L(`KPI ${n}개 중 ${E(hit+'개')} 목표 달성 · 평균 ${E(avg)}`,`${E(hit)} of ${n} KPIs on target · ${E(avg)} on average`);
    return {t,s:tuJoin([L(`최고 ${top.nm} ${top.vt}`,`top: ${top.nm} ${top.vt}`),low!==top&&L(`최저 ${low.nm} ${low.vt}`,`lowest: ${low.nm} ${low.vt}`),
      spv&&L(`예산 소진율 ${spv}`,`budget spent ${spv}`)])};},
  /* 일자별 — 기간 합계 · 일평균 / 최고일 · 꺾은선 최고일 */
  daily(sl){
    /* (v119) 제목 = 큰 그림(일평균 · 꺾은선 평균) — 특정 하루를 강조하지 않는다.
       부제목 = 눈에 띄는 것만 골라서 — 주말·공휴일 vs 평일 차이, 유난히 높았던 날, 전반 vs 후반 흐름, 유난히 낮았던 날.
       운영 이슈(그래프의 ① ② ③)는 그래프 아래에 작게 목록으로(CSS — .tu-src #dailyIssues) */
    const D=TU.daily;if(!D||!D.ds||!D.EL)return null;
    const n=Math.min(D.EL,D.ds.length);
    const days=D.totals.slice(0,n).map((v,i)=>({v,d:D.ds[i],i})).filter(x=>x.v>0);
    if(!days.length)return null;
    const fk=v=>tuBig(v,D.bf),bl=tuSelTx('barSel'),ll=tuSelTx('lineSel');
    const sum=days.reduce((a,x)=>a+x.v,0),avg=sum/days.length;
    const lv=D.lineVals&&D.lf&&ll?days.map(x=>D.lineVals[x.i]).filter(isFinite):[];
    const lavg=lv.length?tuMean(lv):NaN;
    const pc=x=>Math.abs(x*100).toFixed(0)+'%';
    const t=L(`일평균 ${bl} ${E(fk(avg))}`,`${E(fk(avg))} ${bl} a day`)
      +(isFinite(lavg)?L(` · 평균 ${ll} ${E(D.lf(lavg))}`,` · ${ll} ${E(D.lf(lavg))} on average`)
                      :L(` · ${days.length}일 누적 ${E(fk(sum))}`,` · ${E(fk(sum))} over ${days.length} days`));
    const bits=[];                                   /* [눈에 띄는 정도, 글] */
    /* 주말·공휴일 vs 평일 */
    const rest=d=>typeof isRest==='function'?isRest(d):(d.getDay()===0||d.getDay()===6);
    const re=days.filter(x=>rest(x.d)),wk=days.filter(x=>!rest(x.d));
    if(re.length>=2&&wk.length>=2){
      const r=tuMean(re.map(x=>x.v))/tuMean(wk.map(x=>x.v))-1;
      const hol=typeof holName==='function'&&re.some(x=>holName(x.d));
      const nm=hol?L('주말·공휴일','weekends & holidays'):L('주말','weekends');
      if(Math.abs(r)>=.05)bits.push([Math.abs(r)*1.2,L(`${nm} 평균이 평일보다 ${pc(r)} ${r>0?'높음':'낮음'}`,`${nm} ran ${pc(r)} ${r>0?'above':'below'} weekdays`)]);
      else bits.push([.02,L(`${nm}·평일 차이 거의 없음`,`${nm} on par with weekdays`)]);}
    /* 유난히 높았던 날 */
    const pk=days.reduce((a,x)=>x.v>a.v?x:a);
    const pr=pk.v/avg;
    bits.push([pr>=1.2?pr-1:.03,L(`최고 ${tuDay(pk.d)} ${fk(pk.v)}(평균의 ${pr.toFixed(1)}배)`,`peak ${fk(pk.v)} on ${tuDay(pk.d)} (${pr.toFixed(1)}× avg)`)]);
    /* 전반 vs 후반 */
    if(days.length>=8){const hf=Math.floor(days.length/2),a1=tuMean(days.slice(0,hf).map(x=>x.v)),a2=tuMean(days.slice(hf).map(x=>x.v)),g=a2/a1-1;
      if(Math.abs(g)>=.1)bits.push([Math.abs(g),L(`후반 ${days.length-hf}일 평균이 전반보다 ${pc(g)} ${g>0?'높음':'낮음'}`,`second half ${pc(g)} ${g>0?'above':'below'} the first`)]);}
    /* 유난히 낮았던 날(시작 · 끝 언저리 하루는 빼고) */
    const lo=days.slice(1,-1).reduce((a,x)=>!a||x.v<a.v?x:a,null);
    if(lo&&lo.v/avg<=.6)bits.push([(1-lo.v/avg)*.8,L(`최저 ${tuDay(lo.d)} ${fk(lo.v)}(평균의 ${(lo.v/avg).toFixed(1)}배)`,`low ${fk(lo.v)} on ${tuDay(lo.d)}`)]);
    const sub=bits.sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
    return {t,s:tuJoin(sub)};},
  /* 서머리 표 — KPI 목표를 맞춘 라인 수(또는 합계 줄) / 목표 대비 가장 좋은 · 나쁜 라인 */
  sum(sl,h){
    const t=sl.src.querySelector('table');if(!t||!t.tHead||!t.tBodies.length)return null;
    const hr=[...t.tHead.rows],labs=[...hr[hr.length-1].cells].map(tuTx);
    const hc=[...hr[0].cells].filter(c=>c.classList.contains('lfz')).length||1;
    const carry=Array.from({length:hc},()=>({t:'',left:0}));
    const rows=[];
    [...t.tBodies].forEach(tb=>[...tb.rows].forEach(r=>{
      const heads=[...r.cells].filter(c=>c.classList.contains('head')),vals=[...r.cells].filter(c=>!c.classList.contains('head'));
      let k=0;
      for(let c=0;c<hc&&k<heads.length;c++){if(carry[c].left>0)continue;
        const hd=heads[k++],sp=Math.max(1,hd.colSpan||1),rs=Math.max(1,hd.rowSpan||1);
        carry[c]={t:tuTx(hd),left:rs};for(let z=1;z<sp&&c+z<hc;z++)carry[c+z]={t:'',left:rs};c+=sp-1;}
      const parts=carry.map(x=>x.t).filter(Boolean);
      carry.forEach(x=>{if(x.left>0)x.left--;});
      rows.push({r,vals,det:!r.classList.contains('sub')&&!r.classList.contains('total'),tot:r.classList.contains('total'),
        name:parts.slice(-2).join(' · ')});}));
    const det=rows.filter(x=>x.det&&x.vals.length===labs.length);
    const tot=rows.find(x=>x.tot&&x.vals.length===labs.length);
    const keepRow=x=>[...x.r.cells].filter(c=>c.classList.contains('head')).forEach(c=>c.setAttribute('data-tukeep',''));
    const pct=j=>det.some(x=>/%\s*$/.test(tuTx(x.vals[j])));
    const totOf=re=>{if(!tot)return null;const j=labs.findIndex(l=>re.test(l));return j>=0?{l:labs[j],v:tuTx(tot.vals[j])}:null;};
    const spend=totOf(/소진율|spend\s*%|spend rate|burn/i);
    const achs=tot?labs.map((l,j)=>/달성|achv|achiev/i.test(l)?{l,v:tuTx(tot.vals[j])}:null).filter(Boolean).slice(0,2):[];
    /* KPI 열(kpicol) — 목표 · 실적 한 쌍 */
    const kp=[];
    det.forEach(x=>{const ks=x.vals.map((c,j)=>c.classList.contains('kpicol')?j:-1).filter(j=>j>=0);
      if(ks.length<2)return;
      const a=ks[0],b=ks[1],tg=tuNum(tuTx(x.vals[a])),ac=tuNum(tuTx(x.vals[b]));
      if(!(tg>0&&ac>0))return;
      const cost=tuCost(labs[b]);
      kp.push({x,j:b,m:labs[b],cost,tgt:tuTx(x.vals[a]),act:tuTx(x.vals[b]),g:cost?(tg-ac)/tg:(ac-tg)/tg});});
    if(kp.length){
      const met=kp.filter(z=>z.g>=0).length;
      const best=kp.reduce((a,b)=>b.g>a.g?b:a),worst=kp.reduce((a,b)=>b.g<a.g?b:a);
      const say=z=>{const pr=Math.abs(z.g*100).toFixed(1)+'%';
        return z.g>=0?L(`${z.x.name} ${z.m} ${z.act}(목표 대비 ${pr} ${z.cost?'절감':'초과'})`,`${z.x.name} ${z.m} ${z.act} (${pr} ${z.cost?'under':'over'} target)`)
          :L(`${z.x.name} ${z.m} ${z.act}(목표 대비 ${pr} ${z.cost?'높음':'미달'})`,`${z.x.name} ${z.m} ${z.act} (${pr} ${z.cost?'over':'short of'} target)`);};
      h(best.x.vals[best.j],L(`목표 ${best.tgt} → ${best.act}`,`Target ${best.tgt} → ${best.act}`));keepRow(best.x);
      if(worst!==best&&worst.g<0){h(worst.x.vals[worst.j],L(`목표 ${worst.tgt} → ${worst.act}`,`Target ${worst.tgt} → ${worst.act}`));keepRow(worst.x);}
      return {t:met===kp.length?L(`${E(kp.length+'개')} 라인 모두 KPI 목표 달성`,`All ${E(kp.length)} lines on KPI target`)
                 :L(`${kp.length}개 라인 중 ${E(met+'개')} KPI 목표 달성`,`${E(met)} of ${kp.length} lines on KPI target`)
                  +(spend?L(` · 예산 소진율 ${E(spend.v)}`,` · ${E(spend.v)} spent`):''),
        s:tuJoin([L(`가장 좋은 ${say(best)}`,`best: ${say(best)}`),worst!==best&&worst.g<0&&L(`가장 아쉬운 ${say(worst)}`,`weakest: ${say(worst)}`)])};}
    /* KPI 열이 없으면 — 달성률 열 */
    let best=null,worst=null;
    labs.forEach((l,j)=>{if(!/달성|achv|achiev/i.test(l))return;
      det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(!isFinite(v))return;
        if(!best||v>best.v)best={x,j,v,l,vt:tuTx(x.vals[j])};if(!worst||v<worst.v)worst={x,j,v,l,vt:tuTx(x.vals[j])};});});
    if(best){
      h(best.x.vals[best.j],best.vt);keepRow(best.x);
      if(worst&&worst!==best){h(worst.x.vals[worst.j],worst.vt);keepRow(worst.x);}
      return {t:achs.length?achs.map(a=>`${a.l} ${E(a.v)}`).join(' · '):L(`${det.length}개 라인 효율 비교`,`${det.length} lines compared`),
        s:tuJoin([L(`최고 ${best.x.name} ${best.l} ${best.vt}`,`top: ${best.x.name} ${best.l} ${best.vt}`),
          worst&&worst!==best&&L(`최저 ${worst.x.name} ${worst.l} ${worst.vt}`,`lowest: ${worst.x.name} ${worst.l} ${worst.vt}`),spend&&`${spend.l} ${spend.v}`])};}
    /* 목표 · 달성률 열이 없는 표 — 합계 줄의 KPI/단가 · 비율 열 / 그 열에서 가장 좋은 · 나쁜 라인 */
    const colBest=(j,low)=>{let b=null,w=null;det.forEach(x=>{const v=tuNum(tuTx(x.vals[j]));if(!isFinite(v)||v<=0)return;
      if(!b||(low?v<b.v:v>b.v))b={x,j,v,vt:tuTx(x.vals[j]),l:labs[j]};if(!w||(low?v>w.v:v<w.v))w={x,j,v,vt:tuTx(x.vals[j]),l:labs[j]};});return [b,w];};
    const cnt=new Map();det.forEach(x=>x.vals.forEach((c,j)=>{if(c.classList.contains('kpicol'))cnt.set(j,(cnt.get(j)||0)+1);}));
    let j0=[...cnt].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0];
    if(j0==null)j0=labs.findIndex((l,j)=>tuCost(l)&&!pct(j));
    if(j0==null||j0<0)j0=labs.findIndex((l,j)=>pct(j));
    if(j0==null||j0<0||det.length<2)return null;
    const low=tuCost(labs[j0])&&!pct(j0),[b0,w0]=colBest(j0,low);
    if(!b0)return null;
    h(b0.x.vals[j0],`${b0.l} ${b0.vt}`);keepRow(b0.x);
    if(w0&&w0!==b0){h(w0.x.vals[j0],`${w0.l} ${w0.vt}`);keepRow(w0.x);}
    const j1=labs.findIndex((l,j)=>j!==j0&&pct(j)&&/유입률|CTR|VTR|inflow|rate/i.test(l));
    const head=[tot&&`${labs[j0]} ${E(tuTx(tot.vals[j0]))}`,tot&&j1>=0&&`${labs[j1]} ${E(tuTx(tot.vals[j1]))}`].filter(Boolean);
    return {t:head.length?L(`전체 ${head.join(' · ')}`,`Overall ${head.join(' · ')}`):L(`${det.length}개 라인 효율 비교`,`${det.length} lines compared`),
      s:tuJoin([L(`${b0.l} ${low?'최저':'최고'} ${b0.x.name} ${b0.vt}`,`${low?'lowest':'highest'} ${b0.l}: ${b0.x.name} ${b0.vt}`),
        w0&&w0!==b0&&L(`${low?'최고':'최저'} ${w0.x.name} ${w0.vt}`,`${low?'highest':'lowest'}: ${w0.x.name} ${w0.vt}`)])};},
  /* 운영 코멘트 — 비어 있으면 장면을 뺀다 */
  comment(sl){
    const c=sl.src.querySelector('.cmt');const tx=tuTx(c);if(!tx)return {skip:1};
    const leaf=[...c.querySelectorAll('*')].filter(e=>!e.querySelector('div,p,li')).map(tuTx).filter(x=>x.length>=8);
    const first=(leaf.find(x=>x.length>=14)||leaf[0]||tx);
    return {t:L('이번 기간 운영 포인트','Key notes from this period'),s:first.length>120?first.slice(0,118)+'…':first};},
  /* 소재 × 일자 — 게재 소재 수 · 기준 지표 합계 / 1위 · 가장 오래 게재 */
  gantt(sl,h){
    const t=sl.src.querySelector('table.gantt')||sl.src.querySelector('table');if(!t||!t.tBodies.length)return null;
    const hr=t.tHead?[...t.tHead.rows]:[];
    const ml=hr.length?[...hr[hr.length-1].cells].filter(c=>c.classList.contains('mcol')).map(tuTx):[];
    const rows=[...t.tBodies[0].rows].map(r=>{const nm=r.querySelector('td.nm');if(!nm)return null;
      const ms=[...r.querySelectorAll('td.mcol')];
      return {r,nm:tuTx(nm),ms,hi:ms.findIndex(c=>c.classList.contains('hl')),days:r.querySelectorAll('td.day>.b').length};}).filter(Boolean);
    if(!rows.length)return null;
    const j=Math.max(0,rows[0].hi),lab=ml[j]||'',cost=tuCost(lab);
    const v=x=>tuNum(tuTx(x.ms[j]));
    const ok=rows.filter(x=>x.ms[j]&&isFinite(v(x))&&v(x)>0);
    const long=rows.reduce((a,b)=>b.days>a.days?b:a);
    if(!ok.length){h(long.r,L(`${long.days}일 게재`,`${long.days} days`));
      return {t:L(`소재 ${E(rows.length+'개')} 게재`,`${E(rows.length)} creatives ran`),s:L(`가장 오래 게재 ${long.nm} ${long.days}일`,`longest: ${long.nm}, ${long.days} days`)};}
    const top=ok.reduce((a,b)=>(cost?v(b)<v(a):v(b)>v(a))?b:a),vt=tuShortTx(tuTx(top.ms[j]));
    h(top.r,`${lab} ${vt}`);
    const sum=ok.reduce((a,x)=>a+v(x),0);
    return {t:cost?L(`소재 ${E(rows.length+'개')} 게재`,`${E(rows.length)} creatives ran`)
                  :L(`소재 ${E(rows.length+'개')} · ${lab} 합계 ${E(tuBig(sum))}`,`${E(rows.length)} creatives · ${lab} ${E(tuBig(sum))} in total`),
      s:tuJoin([cost?L(`${lab} 최저 ${top.nm} ${vt}`,`lowest ${lab}: ${top.nm} ${vt}`):L(`${lab} 최다 ${top.nm} ${vt}`,`most ${lab}: ${top.nm} ${vt}`),
        L(`가장 오래 게재 ${long.nm} ${long.days}일`,`longest: ${long.nm}, ${long.days} days`)])};},
  /* 효율 우수 소재 — 기준별 1위 모아 보기 */
  creative(sl,h){
    const cols=[...sl.src.querySelectorAll('.crcol')].map(c=>{const ld=c.querySelector('.cr.lead')||c.querySelector('.cr');
      return ld&&{m:tuTx(c.querySelector('.crband .t')),ld,nm:tuTx(ld.querySelector('.meta .nm')),v:tuTx(ld.querySelector('.eff b')),md:tuTx(ld.querySelector('.media'))};})
      .filter(x=>x&&x.nm);
    if(!cols.length)return null;
    cols.forEach(x=>h(x.ld,L(`${x.m} 1위`,`#1 ${x.m}`)));
    const by=new Map();cols.forEach(x=>{if(!by.has(x.nm))by.set(x.nm,[]);by.get(x.nm).push(x.m);});
    const t=[...by].map(([nm,ms])=>`${ms.join(' · ')} ${E(nm)}`).join(' / ');
    return {t:L(`효율 1위 — ${t}`,`#1 by efficiency — ${t}`),s:tuJoin(cols.map(x=>`${x.m} ${x.v}`).concat(cols[0].md?[cols[0].md]:[]))};},
  /* 히트맵 — 평일 · 휴일 단가 차이 / 가장 효율 좋은 · 비싼 요일 */
  heat(sl,h){
    const t=sl.src.querySelector('table.heat')||sl.src.querySelector('table');if(!t||!t.tBodies.length)return null;
    const groups=[];let cur=null;
    for(const r of t.tBodies[0].rows){
      if(r.classList.contains('hcat')){cur={cat:tuTx(r),rows:[]};groups.push(cur);continue;}
      if(r.querySelector('td.hm')&&cur)cur.rows.push(r);}
    const grp=(groups.find(g=>/요일|week/i.test(g.cat))||groups[0]||{rows:[]}).rows;
    if(grp.length<2)return null;
    const val=(r,j)=>tuNum(tuTx(r.querySelectorAll('td.hm')[j]));
    const nc=grp[0].querySelectorAll('td.hm').length,win=new Map(),lose=new Map();
    for(let j=0;j<nc;j++){let lo=null,hi=null;
      grp.forEach(r=>{const v=val(r,j);if(!isFinite(v)||v<=0)return;if(!lo||v<lo.v)lo={r,v};if(!hi||v>hi.v)hi={r,v};});
      if(lo)win.set(lo.r,(win.get(lo.r)||0)+1);if(hi)lose.set(hi.r,(lose.get(hi.r)||0)+1);}
    if(!win.size)return null;
    const best=[...win].sort((a,b)=>b[1]-a[1])[0],worst=[...lose].sort((a,b)=>b[1]-a[1])[0];
    const nm=r=>tuTx(r.querySelector('td.head'));
    h(best[0],L(`최저 단가 ${best[1]}/${nc}`,`Lowest cost ${best[1]}/${nc}`));
    if(worst&&worst[0]!==best[0])h(worst[0],L(`최고 단가 ${worst[1]}/${nc}`,`Highest cost ${worst[1]}/${nc}`));
    /* 평일 · 휴일 줄이 있으면 — 열마다 평일 ÷ 휴일 단가의 평균 */
    const hw=groups.find(g=>g!==groups.find(x=>/요일|week/i.test(x.cat))&&g.rows.length===2);
    let title='';
    if(hw){const [a,b]=hw.rows,rs=[];
      for(let j=0;j<nc;j++){const x=val(a,j),y=val(b,j);if(x>0&&y>0)rs.push(y/x);}
      const rr=tuMean(rs);
      if(isFinite(rr)){const d=Math.abs(1-rr)*100,wk=nm(b),hol=nm(a).replace(/\s*\(.*\)\s*/,'');
        title=d<1?L(`${wk} · ${hol} 단가가 거의 같아요`,`${wk} and ${hol} cost about the same`)
          :rr<1?L(`${wk} 단가가 ${hol}보다 평균 ${E(d.toFixed(1)+'%')} 낮아요`,`${wk} costs ${E(d.toFixed(1)+'%')} less than ${hol} on average`)
          :L(`${hol} 단가가 ${wk}보다 평균 ${E(d.toFixed(1)+'%')} 낮아요`,`${hol} costs ${E(d.toFixed(1)+'%')} less than ${wk} on average`);}}
    if(!title){const avg=grp.map(r=>{const vs=[];for(let j=0;j<nc;j++){const v=val(r,j);if(v>0)vs.push(v);}return tuMean(vs);});
      const mx=Math.max(...avg.filter(isFinite)),mn=Math.min(...avg.filter(isFinite));
      title=isFinite(mx)&&mn>0?L(`요일에 따라 단가 차이 최대 ${E(((mx/mn-1)*100).toFixed(0)+'%')}`,`Cost varies up to ${E(((mx/mn-1)*100).toFixed(0)+'%')} by day`)
        :L(`요일별 단가 비교`,`Cost by day of week`);}
    return {t:title,s:tuJoin([L(`가장 효율 좋은 ${nm(best[0])}(최저 단가 ${best[1]}/${nc})`,`most efficient: ${nm(best[0])} (lowest cost ${best[1]}/${nc})`),
      worst&&worst[0]!==best[0]&&L(`가장 비싼 ${nm(worst[0])}`,`priciest: ${nm(worst[0])}`)])};},
  /* 분포(트리맵) — 상위 몇 곳이 얼마나 차지하는지 / 각 비중 */
  treemap(sl,h){
    const ss=[...sl.src.querySelectorAll('.sect')].map(s=>{const m=/^(.*?)\s*(\d[\d.,]*%)$/.exec(tuTx(s.querySelector('.sh')));
      return m&&{s,nm:m[1].trim(),p:m[2],v:tuNum(m[2])};}).filter(Boolean).sort((a,b)=>b.v-a.v);
    if(!ss.length)return null;
    const met=tuTx($('tmapTitle')).replace(/\s*(분포|distribution|breakdown)\s*$/i,'')||L('값','value');
    const k=ss[0].v>=60||ss.length<3?1:2,top=ss.slice(0,k),sum=top.reduce((a,x)=>a+x.v,0).toFixed(1)+'%';
    top.forEach(x=>h(x.s,x.p));
    return {t:k===1?L(`${met}의 ${E(ss[0].p)}가 ${ss[0].nm} 한 곳에`,`${ss[0].nm} alone holds ${E(ss[0].p)} of ${met}`)
                   :L(`상위 2곳이 ${met}의 ${E(sum)}`,`Top 2 hold ${E(sum)} of ${met}`),
      s:tuJoin(ss.slice(0,4).map(x=>`${x.nm} ${x.p}`).concat(ss.length>4?[L(`나머지 ${ss.length-4}곳`,`${ss.length-4} more`)]:[]))};},
  /* 효율 버블 — 두 효율 모두 상위권인 원의 수 / 가장 오른쪽 위 */
  bubble(sl,h){
    const cs=[...sl.src.querySelectorAll('circle.bub[data-g]')];if(!cs.length)return null;
    const ax=[...sl.src.querySelectorAll('text.axt')].map(tuTx);
    const gx=c=>+c.getAttribute('data-gx'),gy=c=>+c.getAttribute('data-gy');
    const both=cs.filter(c=>gx(c)>=.5&&gy(c)>=.5);
    const b=cs.reduce((a,c)=>+c.getAttribute('data-g')>+a.getAttribute('data-g')?c:a);
    const nm=c=>c.getAttribute('data-nm')||L('(미지정)','(Unassigned)');
    (both.length?both:[b]).forEach(c=>h(c,c===b?L('효율 최상','Most efficient'):''));
    return {t:both.length?L(`${cs.length}개 중 ${E(both.length+'개')}가 두 효율 모두 상위권`,`${E(both.length)} of ${cs.length} lead on both efficiency axes`)
                         :L(`${cs.length}개 중 효율 1위 ${E(nm(b))}`,`Most efficient of ${cs.length}: ${E(nm(b))}`),
      s:tuJoin([L(`가장 앞선 ${nm(b)}`,`best: ${nm(b)}`),ax[0]&&`${ax[0]} ${b.getAttribute('data-xf')||''}`,ax[1]&&`${ax[1]} ${b.getAttribute('data-yf')||''}`])};},
  /* 유입 ① — 유입당 단가(IWV 단가)가 제목, 유입률 · 체류는 부제목 (유입률은 보통 아주 낮게 나온다) */
  infA(sl,h){
    const ks=[...sl.src.querySelectorAll('.infk')].map(k=>({k:tuTx(k.querySelector('span')).replace(/\s*\([^)]*\)\s*$/,''),v:tuTx(k.querySelector('b')),el:k}))
      .filter(x=>x.k&&x.v);
    if(!ks.length)return null;
    const cp=ks.find(x=>/유입당 단가|단가|cost per/i.test(x.k)),iw=ks.find(x=>/IWV/i.test(x.k));
    if(cp)h(cp.el,'');if(iw)h(iw.el,'');
    /* 사람들이 부르는 이름 그대로 — 'IWV 단가' */
    const head=[cp&&L(`IWV 단가 ${E(cp.v)}`,`Cost per IWV ${E(cp.v)}`),iw&&L(`IWV ${E(iw.v)}`,`${E(iw.v)} IWV`)].filter(Boolean);
    return {t:head.length?head.join(' · '):`${ks[0].k} ${E(ks[0].v)}`,s:tuJoin(ks.filter(x=>x!==cp&&x!==iw).map(x=>`${x.k} ${x.v}`))};},
  /* 유입 ② — 그래프 세 개(효율 지도 · 랜딩별 체류 · 매체별 체류)를 하나씩 차례로 강조 */
  infB(sl,h){
    const cells=[...sl.src.querySelectorAll('.infgrid>.infcell')];
    const bits=[];
    /* 효율 지도 — 오른쪽 위(단가 낮고 유입률 높음)에 가장 가까운 원 */
    const mp=cells.find(c=>c.classList.contains('infmapc'));
    if(mp){const dots=[...mp.querySelectorAll('circle.mc')],labs=[...mp.querySelectorAll('text.mlab')];
      const sv=mp.querySelector('svg'),vb=sv&&sv.viewBox&&sv.viewBox.baseVal;
      let best=null;dots.forEach(c=>{const x=+c.getAttribute('cx'),y=+c.getAttribute('cy'),sc=x-(vb?y*vb.width/vb.height:y);if(!best||sc>best.sc)best={c,x,y,sc};});
      let nm='';if(best&&labs.length){const near=labs.map(t=>({t,d:Math.hypot(+t.getAttribute('x')-best.x,+t.getAttribute('y')-best.y)})).sort((a,b)=>a.d-b.d)[0];nm=near?tuTx(near.t):'';}
      h(mp,nm?L(`효율 최고 ${nm}`,`Best: ${nm}`):L('유입 효율 지도','Efficiency map'),0);if(nm)bits.push(L(`유입 효율 최고 ${nm}`,`most efficient: ${nm}`));}
    /* 랜딩별 체류 — 가장 긴 랜딩 */
    const ld=cells.find(c=>c.classList.contains('infldc'));
    const dur=t=>{const m=/(\d+)\s*(?:분|m)/.exec(t),s=/(\d+)\s*(?:초|s)/.exec(t);return (m?+m[1]*60:0)+(s?+s[1]:0);};
    const txt=b=>b?[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).filter(Boolean).join(' '):'';
    if(ld){const ls=[...ld.querySelectorAll('.ldcol')].map(c=>({nm:tuTx(c.querySelector('.ldname')),t:txt(c.querySelector('.ldavg b'))})).filter(x=>x.nm&&dur(x.t)>0);
      const b=ls.length?ls.reduce((a,x)=>dur(x.t)>dur(a.t)?x:a):null;
      h(ld,b?`${b.nm} ${b.t}`:L('랜딩별 체류','Time by landing'),1);if(b)bits.push(L(`가장 오래 머문 랜딩 ${b.nm} ${b.t}`,`longest landing: ${b.nm} ${b.t}`));}
    /* 매체별 체류 — 가장 긴 매체 */
    const dw=cells.find(c=>c.classList.contains('infdwc'));
    if(dw){const rs=[...dw.querySelectorAll('.dwrow')].map(r=>({nm:tuTx(r.querySelector('.dwl b')),t:txt(r.querySelector('.dwr b'))})).filter(x=>dur(x.t)>0);
      const b=rs.length?rs.reduce((a,x)=>dur(x.t)>dur(a.t)?x:a):null;
      h(dw,b?`${b.nm} ${b.t}`.trim():L('매체별 체류','Time by media'),2);
      if(b&&b.nm)bits.push(L(`가장 오래 머문 매체 ${b.nm} ${b.t}`,`longest media: ${b.nm} ${b.t}`));}
    if(!cells.length)return null;
    /* 제목 — 전체 평균 체류(원래 화면의 유입 지표 칸) */
    const ks=[...document.querySelectorAll('#infBody .infk')].map(k=>({k:tuTx(k.querySelector('span')),v:tuTx(k.querySelector('b')),e:tuTx(k.querySelector('em'))}));
    const dk=ks.find(x=>/체류|time on site|dwell/i.test(x.k));
    return {t:dk?L(`평균 체류 ${E(dk.v)}${dk.e?' · '+dk.e:''}`,`Avg. time on site ${E(dk.v)}${dk.e?' · '+dk.e:''}`):L('유입 효율 · 랜딩 · 체류','Efficiency, landing and time on site'),
      s:tuJoin(bits)};},
  /* 유입 ③ — 상세 표 */
  infC(sl){
    if(!sl.src.querySelector('table'))return null;
    return {t:tuTx(sl.src.querySelector('.infh b'))||L('유입 효율 상세','Inflow detail'),
      s:L('매체별 유입 · 체류 · 단가를 한 표로','Inflow, dwell time and cost by media in one table')};}};

/* ---------- 3. 표지 · 마무리 ---------- */
function tuCover(){
  const its=[...document.querySelectorAll('#campBar .it')].map(i=>{const v=i.querySelector('.v');
    const main=v?[...v.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(' ').replace(/\s+/g,' ').trim():'';
    return {k:tuTx(i.querySelector('.k')),v:main||tuTx(v),sub:v&&v.querySelector('span')?tuTx(v.querySelector('span')):''};});
  const get=re=>its.find(x=>re.test(x.k));
  const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||(get(/캠페인|campaign/i)||{}).v||'Campaign';
  const adv=(get(/광고주|advertiser/i)||{}).v||'';
  const tiles=[];
  const per=get(/기간|period|flight/i);
  if(per)tiles.push({k:per.k,v:per.v.replace(/^(\d{4})\.(\d{1,2}\.\d{1,2})\s*[–~-]\s*\1\.(\d{1,2}\.\d{1,2})$/,'$1.$2 – $3')});
  const bud=get(/예산|budget/i);if(bud)tiles.push({k:bud.k,v:bud.v});
  const sp=document.querySelector('#donuts .donut.spend');
  if(sp&&tuVis(sp))tiles.push({k:tuTx(sp.querySelector('.dhd .k'))||L('예산 소진율','Budget spent'),v:tuTx(sp.querySelector('.achv'))});
  else{const val=get(/value/i);if(val)tiles.push({k:val.k,v:val.v,s:val.sub});}
  const ph=document.querySelector('#paceBox .phead');
  if(ph&&tuVis(ph)){const m=/(\d+(?:\.\d+)?)\s*%/.exec(tuTx(ph));if(m)tiles.push({k:L('기간 경과','Flight elapsed'),v:m[1]+'%'});}
  const src=document.createElement('div');src.className='tu-src tu-ch';src.setAttribute('data-noi18n','');
  src.innerHTML=`<div class="tu-tiles">${tiles.map((x,i)=>`<div class="tu-tile" style="--i:${i}"><div class="k">${esc(x.k)}</div><div class="v">${esc(x.v)}</div>${x.s?`<div class="s">${esc(x.s)}</div>`:''}</div>`).join('')}</div>`;
  return tuApplyEdit({kind:'cover',key:'cover',label:L('데이터 투어','Data tour'),src,W:0,tblX:0,chips:[],t:nm,s:tuJoin([adv,L('캠페인 성과 리뷰','Campaign performance review')]),noEm:1,tiles});}
/* 핵심 요약 — 장면을 갈래로 묶어 짧게(v119). 갈래에 없는 영역은 '운영 · 기타' 로 */
const TU_CATS=[
  {ko:'개요 · 달성',en:'Overview & delivery',keys:['struct','pace','stat','kpi']},
  {ko:'추이 · 분포',en:'Trends & mix',keys:['daily','raw','trend','treemap','heat','bubble']},
  {ko:'매체 · 상품 효율',en:'Media & product efficiency',keys:['sum','mix']},
  {ko:'소재',en:'Creatives',keys:['creative','gantt']},
  {ko:'사이트 유입',en:'Site traffic',keys:['infA','infB','infC']},
  {ko:'운영 · 기타',en:'Notes & more',keys:['comment','misc']}];
function tuCats(body){
  const out=TU_CATS.map(c=>({n:L(c.ko,c.en),items:[]})),other=out[out.length-1];
  body.forEach((s,k)=>{const i=TU_CATS.findIndex(c=>c.keys.includes(s.key));(i>=0?out[i]:other).items.push({s,k,go:TU.slides.indexOf(s)});});
  /* 같은 갈래에 같은 종류가 여럿이면(서머리 표 여러 개) 영역 이름을 작게 붙여 구분 */
  out.forEach(c=>c.items.forEach(x=>{x.lab=c.items.filter(y=>y.s.key===x.s.key).length>1;}));
  return out.filter(c=>c.items.length);}
function tuEnd(){
  const body=TU.slides.filter(s=>s.kind==='body');
  const cats=tuCats(body),nc=cats.length<=3?cats.length:cats.length===4?2:3;
  const src=document.createElement('div');src.className='tu-src tu-ch';src.setAttribute('data-noi18n','');
  src.innerHTML=`<div class="tu-cats" style="--nc:${nc}">${cats.map((c,ci)=>
      `<div class="tu-cat" style="--i:${ci}"><div class="tu-cath"><span class="d"></span><b>${esc(c.n)}</b><span class="c">${c.items.length}</span></div>`
      +c.items.map(x=>`<button type="button" class="tu-rc" data-go="${x.go}" title="${esc(x.s.label)}"><span class="n">${String(x.k+1).padStart(2,'0')}</span>`
        +`<span class="tx">${x.lab?`<span class="l">${esc(x.s.label)}</span>`:''}<span class="t">${tuWords(x.s.t)}</span></span></button>`).join('')+`</div>`).join('')}</div>
    <div class="tu-acts">
      <button type="button" class="tu-btn pri" data-act="ppt">${TU_IC.ppt}<span data-lab>${esc(L('PPT로 저장','Save as PPT'))}</span></button>
      <button type="button" class="tu-btn" data-act="html" title="${esc(L('이 투어를 파일 하나(HTML)로 — 인터넷 없이도 브라우저에서 바로 발표할 수 있습니다','This tour as one HTML file — present from any browser, even offline'))}">${TU_IC.html}<span data-lab>${esc(L('파일로 저장 (HTML)','Save as file (HTML)'))}</span></button>
      <button type="button" class="tu-btn" data-act="restart"><span>↺ ${esc(L('처음부터','From the start'))}</span></button>
      <button type="button" class="tu-btn" data-act="close"><span>${esc(L('닫기','Close'))}</span></button>
    </div>`;
  return tuApplyEdit({kind:'end',key:'end',label:L('핵심 요약','Key takeaways'),src,W:0,tblX:0,chips:[],cats,
    t:L('오늘의 핵심, 한 장으로','Today’s takeaways at a glance'),
    s:L(`${body.length}개 장면을 ${cats.length}갈래로 · 항목을 누르면 그 장면으로 돌아갑니다`,`${body.length} scenes in ${cats.length} groups · click any item to jump back`),noEm:1});}
/* 아이콘 */
const TU_IC={
  ppt:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 1.4h6.5l3.6 3.6v9a.8.8 0 0 1-.8.8H3.2a.8.8 0 0 1-.8-.8V2.2a.8.8 0 0 1 .8-.8z" fill="#d35230"/><path d="M9.7 1.4v2.9a.7.7 0 0 0 .7.7h2.9z" fill="#f2a58d"/><path d="M5.6 12V7h2.1a1.6 1.6 0 0 1 0 3.2H5.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  html:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.8 5.6h12.4" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 8.3l2.9 1.6-2.9 1.6z" fill="currentColor"/></svg>',
  edit:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.4 2.7l2.9 2.9-7.7 7.7-3.5.6.6-3.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 4.1l2.9 2.9" stroke="currentColor" stroke-width="1.6"/></svg>',
  dl:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2v7.9M4.7 6.9L8 10.2l3.3-3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.8 11v1.8c0 .6.4 1 1 1h8.4c.6 0 1-.4 1-1V11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'};

/* ---------- 4. 화면 ---------- */
function tuHint(){return L('← → 넘기기 · P 자동 재생 · E 문구 편집 · M 배경음 · Esc 닫기','← → to move · P autoplay · E edit text · M music · Esc to close');}
function tuShell(){
  /* data-noi18n — 영어 화면에서 번역기가 투어 글(이미 L() 로 만든 글 · 캠페인 이름)을 다시 옮기지 않게 */
  const el=document.createElement('div');el.className='tu';el.setAttribute('data-noi18n','');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label',L('데이터 투어','Data tour'));
  const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'';
  el.innerHTML=`<div class="tu-floorw"><div class="tu-floor"></div></div><div class="tu-glow"></div>
    <div class="tu-top tu-ch">
      <div class="tu-prog">${TU.slides.map((s,i)=>`<i data-go="${i}" title="${esc(s.kind==='body'?s.label:s.kind==='cover'?L('표지','Cover'):L('핵심 요약','Key takeaways'))}"></i>`).join('')}</div>
      <div class="tu-meta"><span class="tu-brand"><span class="dot"></span><b>DATA TOUR</b><span class="cn">${esc(nm)}</span></span>
        <span class="sp"></span><span class="tu-cnt"></span>
        <button type="button" class="tu-ib tu-ed" title="${esc(L('이 장 문구 편집 (E)','Edit this slide’s text (E)'))}" aria-pressed="false">${TU_IC.edit}</button>
        <span class="tu-dlw"><button type="button" class="tu-ib tu-dl" title="${esc(L('다운로드','Download'))}" aria-haspopup="menu" aria-expanded="false">${TU_IC.dl}</button>
          <span class="tu-dlm" role="menu">
            <button type="button" class="tu-mi" role="menuitem" data-act="ppt"><span class="ic">${TU_IC.ppt}</span><span class="tx"><b data-lab>${esc(L('PPT로 저장','Save as PPT'))}</b><small>${esc(L('PowerPoint · 글은 고쳐 쓸 수 있게','PowerPoint · editable text'))}</small></span></button>
            <button type="button" class="tu-mi" role="menuitem" data-act="html"><span class="ic">${TU_IC.html}</span><span class="tx"><b data-lab>${esc(L('파일로 저장 (HTML)','Save as file (HTML)'))}</b><small>${esc(L('인터넷 없이도 브라우저에서 바로 발표','Present from any browser, even offline'))}</small></span></button>
          </span></span>
        <button type="button" class="tu-ib tu-snd" aria-pressed="false"></button>
        <button type="button" class="tu-ib tu-play" title="${esc(L('자동 재생 (P)','Autoplay (P)'))}" aria-pressed="false"></button>
        <button type="button" class="tu-ib tu-x" title="${esc(L('닫기 (Esc)','Close (Esc)'))}"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div></div>
    <div class="tu-deck"></div>
    <button type="button" class="tu-nav prev" aria-label="${esc(L('이전','Previous'))}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button type="button" class="tu-nav next" aria-label="${esc(L('다음','Next'))}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="tu-hint tu-ch">${esc(tuHint())}</div>`;
  return el;}
function tuPaintPlay(){
  const b=TU.el&&TU.el.querySelector('.tu-play');if(!b)return;
  b.setAttribute('aria-pressed',TU.play?'true':'false');
  b.innerHTML=TU.play?'<svg viewBox="0 0 16 16"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
    :'<svg viewBox="0 0 16 16"><path d="M5.2 3.4v9.2l7.3-4.6z" fill="currentColor"/></svg>';}
function tuPaintChrome(){
  const el=TU.el;if(!el)return;
  const n=TU.slides.length,i=TU.i;
  el.querySelectorAll('.tu-prog i').forEach((s,k)=>{s.classList.toggle('done',k<i);s.classList.toggle('cur',k===i);
    s.classList.toggle('play',k===i&&TU.play);if(k===i&&TU.play)s.style.setProperty('--dur',tuDur(TU.slides[i])+'ms');});
  el.querySelector('.tu-cnt').textContent=`${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}`;
  el.querySelector('.tu-nav.prev').disabled=i<=0;
  el.querySelector('.tu-nav.next').disabled=i>=n-1;
  el.querySelector('.tu-ed').setAttribute('aria-pressed',TU.ed?'true':'false');
  tuPaintPlay();}
/* 장면 하나를 무대에 */
function tuMount(sl){
  const node=document.createElement('section');node.className='tu-sl tu-'+sl.kind;node.setAttribute('data-noi18n','');
  const no=TU.slides.filter(s=>s.kind==='body').indexOf(sl)+1;
  const eye=sl.kind==='body'?`<span class="no">${String(no).padStart(2,'0')}</span>${esc(sl.label)}`
    :sl.kind==='cover'?`<span class="no">▶</span>DATA TOUR`:`<span class="no">✓</span>${esc(sl.label)}`;
  node.innerHTML=`<div class="tu-head tu-ch"><div class="tu-eye">${eye}</div>
      <h2 class="tu-title">${tuWords(sl.t)}</h2>${sl.s?`<p class="tu-sub">${esc(sl.s)}</p>`:''}</div>
    <div class="tu-stage"><div class="tu-par"><div class="tu-in"><div class="tu-fit"></div></div></div></div>`;
  const src=sl.src.cloneNode(true);
  node.querySelector('.tu-fit').appendChild(src);
  TU.deck.appendChild(node);
  tuLayout(node,sl);
  return node;}
/* 무대 크기에 맞춰 줄이고 늘리기 — 표는 글자가 읽힐 만큼(0.86배 이상) 두고 옆으로 옮겨 가며 본다 */
function tuLayout(node,sl){
  const head=node.querySelector('.tu-head'),stage=node.querySelector('.tu-stage');
  const fit=node.querySelector('.tu-fit'),src=fit.firstElementChild;
  const top=head.offsetTop+head.offsetHeight+Math.max(14,innerHeight*.028);
  stage.style.top=top+'px';
  const sw=Math.max(200,stage.clientWidth),sh=Math.max(160,stage.clientHeight);
  let s;
  src.style.transform='none';
  if(sl.kind!=='body'){
    src.style.width=Math.round(sw)+'px';
    s=Math.min(1,sh/src.offsetHeight);}
  else if(sl.tblX>0){
    const full=sl.W+sl.tblX;
    s=Math.max(.86,Math.min(1.15,sw/full));
    src.style.width=Math.round(Math.max(sl.W,Math.min(full,sw/s)))+'px';
    const h=src.offsetHeight;if(h*s>sh)s=sh/h;
    s=Math.min(s,sw/src.offsetWidth);}
  else{src.style.width=sl.W+'px';s=tuWrap(src,sl,sw,sh,1.25);}
  s=Math.max(.2,s);
  const w=src.offsetWidth,h=src.offsetHeight;
  src.style.transform=`scale(${s})`;
  fit.style.width=Math.round(w*s)+'px';fit.style.height=Math.round(h*s)+'px';
  /* 남는 세로 여백은 위 30% · 아래 70% — 제목과 가깝게 */
  node.querySelector('.tu-in').style.marginTop=sl.kind==='body'?Math.max(0,Math.round((sh-h*s)*.3))+'px':'';
  node.__s=s;}
/* 카드 줄(지표 · KPI 도넛)이 길어 한 줄이면 너무 작아질 때 — 2~4줄로 접어 가장 크게 보이는 쪽을 고른다 */
function tuWrap(src,sl,sw,sh,cap){
  src.classList.remove('tu-wrapx');src.style.width=sl.W+'px';
  const fitS=()=>Math.min(cap,sw/src.offsetWidth,sh/src.offsetHeight);
  let best={s:fitS(),w:sl.W,wrap:false};
  const xp=src.querySelector('.tu-xp');
  const kids=xp?[...xp.children].filter(k=>k.offsetWidth>0):[];
  if(kids.length>2&&best.s<.92){
    const step=kids[1].offsetLeft-kids[0].offsetLeft,n=kids.length;
    if(step>0){src.classList.add('tu-wrapx');
      for(let r=2;r<=4;r++){const c=Math.ceil(n/r);if(c<2)break;
        const w=Math.round(sl.W-(n-c)*step);src.style.width=w+'px';
        const s2=fitS();if(s2>best.s*1.08)best={s:s2,w,wrap:true};}
      src.classList.toggle('tu-wrapx',best.wrap);src.style.width=best.w+'px';}}
  return best.s;}
/* 그래프 채우기 — 23-anim 규칙을 복제본에 처음부터(0 에서) */
function tuAnimate(root,base){
  if(TU.rm||typeof AX_RULES==='undefined')return;
  for(const [sel0,kind,gap,b0] of AX_RULES){
    const sel=sel0.replace(/^#tab-(dash|overview|tvdash|oohdash)\s+/,'');
    let list;try{list=[...root.querySelectorAll(sel)];}catch(e){continue;}
    list.forEach((el,i)=>{
      let d=(b0||0)+base;
      if(gap==='row'){const tr=el.closest('tr');d+=Math.min(900,(tr?tr.sectionRowIndex:0)*22);}
      else if(gap==='di'){const td=el.closest('td');d+=Math.min(700,(+(td&&td.dataset.di)||0)*9);}
      else d+=Math.min(1100,i*(gap||0));
      if(kind==='arc'){try{axArc(el,root,d,null);}catch(e){}return;}
      if(kind==='count'){try{axCount(el,root,d,null);}catch(e){}return;}
      if(kind==='draw'){try{el.setAttribute('pathLength','1');}catch(e){}}
      el.style.setProperty('--axd',d+'ms');el.classList.add('ax','ax-'+kind);});}
  /* 표지 숫자 */
  root.querySelectorAll('.tu-tile .v').forEach((v,i)=>{try{axCount(v,root,base+180+i*110,null);}catch(e){}});}
const tuLater=(f,ms)=>{const t=setTimeout(f,ms);TU.timers.push(t);return t;};
function tuClear(){TU.timers.forEach(clearTimeout);TU.timers=[];clearTimeout(TU.playT);}
function tuAnim(el,kf,o){if(!el||!el.animate)return null;try{return el.animate(kf,o);}catch(e){return null;}}
/* 들어온 장면의 차례 — 제목 글자 → 부제목 → 그래프가 떠오르며 채워짐 → 강조 */
function tuPlaySlide(node,sl){
  const rm=TU.rm,E='cubic-bezier(.16,1,.3,1)';
  const ws=[...node.querySelectorAll('.tu-title .w>span')];
  tuAnim(node.querySelector('.tu-eye'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:rm?150:600,delay:rm?0:200,easing:E,fill:'backwards'});
  ws.forEach((w,k)=>tuAnim(w,[{opacity:0,transform:'translateY(105%) rotateX(-80deg)'},{opacity:1,transform:'none'}],
    {duration:rm?150:820,delay:rm?0:280+k*60,easing:'cubic-bezier(.2,.85,.25,1)',fill:'backwards'}));
  tuAnim(node.querySelector('.tu-sub'),[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],
    {duration:rm?150:760,delay:rm?0:520+ws.length*45,easing:E,fill:'backwards'});
  tuAnim(node.querySelector('.tu-in'),[{opacity:0,transform:'translateY(56px) scale(.95)'},{opacity:1,transform:'none'}],
    {duration:rm?150:1150,delay:rm?0:330,easing:E,fill:'backwards'});
  const src=node.querySelector('.tu-src');
  if(sl.kind==='cover')src.querySelectorAll('.tu-tile').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(40px) rotateX(35deg)'},{opacity:1,transform:'none'}],
    {duration:rm?150:900,delay:rm?0:520+i*110,easing:E,fill:'backwards'}));
  if(sl.kind==='end'){
    src.querySelectorAll('.tu-cat').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:760,delay:rm?0:420+i*90,easing:E,fill:'backwards'}));
    src.querySelectorAll('.tu-cat').forEach((c,i)=>c.querySelectorAll('.tu-rc').forEach((t,j)=>tuAnim(t,[{opacity:0,transform:'translateX(-10px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:560,delay:rm?0:620+i*90+j*55,easing:E,fill:'backwards'})));
    src.querySelectorAll('.tu-btn').forEach((t,i)=>tuAnim(t,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],
      {duration:rm?150:620,delay:rm?0:900+i*60,easing:E,fill:'backwards'}));}
  tuAnimate(src,rm?0:520);
  /* 강조 — 그래프가 다 찬 뒤에. 차례가 있으면(유입 분석 그래프 세 개) 하나씩 넘어가고, 끝나면 모두 다시 진하게 */
  const t0=rm?300:tuSlow(src),steps=tuSteps(src);
  tuLater(()=>tuSpot(node,steps[0]),t0);
  if(steps.length>1){steps.slice(1).forEach((st,k)=>tuLater(()=>tuSpot(node,st),t0+(k+1)*TU_STEP));
    tuLater(()=>tuSpot(node,-1),t0+steps.length*TU_STEP);}
  if(TU.play)TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},tuDur(sl));}
/* 그래프가 다 차는 데 걸리는 시간 · 장면에 머무는 시간(자동 재생) */
const TU_STEP=3000;
const tuSlow=src=>src.querySelector('.dbar,circle[data-axarc]')?2500:src.querySelector('table')?1800:2000;
const tuStepOf=e=>+(e.getAttribute('data-tust')||0);
const tuSteps=src=>[...new Set([...src.querySelectorAll('[data-tuhl]')].map(tuStepOf))].sort((a,b)=>a-b);
function tuDur(sl){if(!sl||!sl.src)return TU_PLAY;const n=tuSteps(sl.src).length;
  return n>1?Math.max(TU_PLAY,tuSlow(sl.src)+n*TU_STEP+1800):TU_PLAY;}
/* ---------- 5. 강조 — 강조할 곳은 그대로 두고 나머지를 조금 투명하게(상대적으로 진하게 보이게) · 이름표 (v119: 테두리 없앰) ---------- */
function tuScroller(el,root){
  for(let p=el.parentElement;p&&p!==root;p=p.parentElement){
    const cs=getComputedStyle(p);if(/auto|scroll/.test(cs.overflowX)&&p.scrollWidth>p.clientWidth+1)return p;}
  return null;}
/* 옅게 하기 — 강조할 곳까지 이어지는 줄기는 그대로 두고, 그 형제들만 흐리게(덮개 상자를 씌우지 않아 배경 결이 그대로).
   표 — 줄(tr)을 통째로 흐리면 줄마다 겹 하나가 생겨, 여러 줄에 걸친 고정 칸(rowspan) 위로 옆 칸이 비쳐 보인다.
   칸마다 흐리고, 고정 칸(sticky)은 바탕을 덮는 방식(.tu-fadeS)으로. hls 가 비면 모두 다시 진하게 */
function tuFade(src,hls){
  src.querySelectorAll('.tu-fade,.tu-fadeS').forEach(n=>n.classList.remove('tu-fade','tu-fadeS'));
  if(!hls.length)return;
  const keep=new Set();hls.concat([...src.querySelectorAll('[data-tukeep]')]).forEach(e=>{for(let p=e;p&&p!==src;p=p.parentElement)keep.add(p);});
  const fade=new Set();
  keep.forEach(p=>{const par=p.parentElement;if(!par)return;
    for(const c of par.children)if(!keep.has(c)&&!/^(defs|style|linearGradient|radialGradient|clipPath|mask)$/i.test(c.tagName))fade.add(c);});
  const add=(c,sticky)=>{c.classList.add('tu-ft',sticky?'tu-fadeS':'tu-fade');};
  fade.forEach(c=>{
    if(/^(TR|THEAD|TBODY|TFOOT)$/.test(c.tagName)){
      c.querySelectorAll('td,th').forEach(td=>{if(!keep.has(td))add(td,getComputedStyle(td).position==='sticky');});
      return;}
    add(c,/^(TD|TH)$/.test(c.tagName)&&getComputedStyle(c).position==='sticky');});}
/* step — 몇 번째 차례를 강조할지(-1 이면 강조를 거둔다) */
function tuSpot(node,step){
  if(!node.isConnected)return;
  node.classList.add('hl');
  const fit=node.querySelector('.tu-fit'),src=fit&&fit.firstElementChild;if(!src)return;
  const all=[...src.querySelectorAll('[data-tuhl]')];if(!all.length)return;
  if(step==null)step=tuSteps(src)[0];
  node.__step=step;
  const old=[...fit.querySelectorAll('.tu-chip')];
  const drop=()=>old.forEach(c=>{const a=tuAnim(c,[{opacity:getComputedStyle(c).opacity},{opacity:0}],{duration:TU.rm?60:260,fill:'forwards'});
    if(a)a.onfinish=()=>c.remove();else c.remove();});
  const hls=all.filter(e=>tuStepOf(e)===step);
  if(!hls.length){drop();tuFade(src,[]);return;}
  /* 장면 들어오기 · 그래프 채우기가 아직 덜 끝났으면(느린 컴퓨터 · 뒤에 있던 탭) 끝 모습으로 맞춘 뒤 잰다 — 반복 효과는 그대로 */
  try{node.getAnimations({subtree:true}).forEach(a=>{try{const it=a.effect&&a.effect.getTiming().iterations;
    if(it!==Infinity&&!(a.effect.target&&a.effect.target.classList&&a.effect.target.classList.contains('tu-chip')))a.finish();}catch(e){}});}catch(e){}
  try{if(typeof axFinish==='function')axFinish(src);}catch(e){}
  /* 표 — 강조할 칸이 가려져 있으면 그쪽으로 부드럽게 옮긴 뒤 */
  const sc=tuScroller(hls[0],src);
  if(sc&&node.__pan!==step){
    node.__pan=step;
    const k=sc.getBoundingClientRect().width/sc.offsetWidth||1;
    const er=hls[0].getBoundingClientRect(),cr=sc.getBoundingClientRect();
    const x=(er.left-cr.left)/k+sc.scrollLeft,w=er.width/k;
    const fzW=sc.querySelector('.lfz')?Math.max(...[...sc.querySelectorAll('thead .lfz')].map(c=>(c.getBoundingClientRect().right-cr.left)/k),0):0;
    const vis0=sc.scrollLeft+fzW,vis1=sc.scrollLeft+sc.clientWidth;
    if(x<vis0||x+w>vis1){
      const to=Math.max(0,Math.min(sc.scrollWidth-sc.clientWidth,x-fzW-(sc.clientWidth-fzW-w)/2));
      sc.scrollTo({left:to,behavior:TU.rm?'auto':'smooth'});
      /* 다 옮겨 간 뒤(위치가 멈춘 뒤)에 */
      let n=0;
      const wait=()=>{if(Math.abs(sc.scrollLeft-to)<2||n>30)return tuSpot(node,step);n++;tuLater(wait,100);};
      tuLater(wait,TU.rm?40:250);return;}}
  drop();
  tuFade(src,hls);
  /* 이름표 — 강조할 곳의 오른쪽 위 모서리 */
  const fr=fit.getBoundingClientRect(),kx=fit.offsetWidth/(fr.width||1),ky=fit.offsetHeight/(fr.height||1);
  const FW=fit.offsetWidth,FH=fit.offsetHeight;
  const hd=node.querySelector('.tu-head'),hb=hd?hd.getBoundingClientRect().bottom:0;
  hls.forEach((e,k)=>{
    const chip=node.__chips?node.__chips[+e.getAttribute('data-tuhl')]:'';if(!chip)return;
    let r=e.getBoundingClientRect();
    /* 넘겨 보는 상자 밖으로 나간 부분은 자른다 */
    const s2=tuScroller(e,src);
    if(s2){const c=s2.getBoundingClientRect();r={left:Math.max(r.left,c.left),right:Math.min(r.right,c.right),top:Math.max(r.top,c.top),bottom:Math.min(r.bottom,c.bottom)};}
    const x=(r.left-fr.left)*kx,y=(r.top-fr.top)*ky,w=(r.right-r.left)*kx,h=(r.bottom-r.top)*ky;
    if(!(w>4&&h>4&&x<FW&&y<FH))return;
    const c=document.createElement('div');c.className='tu-chip tu-ch';c.setAttribute('data-noi18n','');c.textContent=chip;
    /* 위에 붙일 자리(부제목과 겹치지 않게)가 있으면 위, 없으면 아래 — 강조한 글자를 가리지 않게 바깥에 */
    const above=r.top-38>hb;
    c.style.left=Math.min(FW,Math.max(0,x+w))+'px';c.style.top=(above?y:y+h)+'px';
    c.style.setProperty('--ty',above?'calc(-100% - 5px)':'5px');c.style.setProperty('--k',k);
    fit.appendChild(c);void c.offsetWidth;c.classList.add('on');});}
/* ---------- 6. 넘기기 ---------- */
function tuGo(i,dir){
  if(!TU.el||i<0||i>=TU.slides.length||i===TU.i)return;
  if(TU.ed)tuEditEnd(true);
  tuMenu(false);
  tuClear();
  dir=dir||(i>TU.i?1:-1);
  const old=TU.node,sl=TU.slides[i];
  TU.i=i;
  const node=tuMount(sl);node.__chips=sl.chips;
  TU.node=node;
  TU.fx-=dir*288;{const f=TU.el.querySelector('.tu-floor');if(f)f.style.backgroundPosition=`${TU.fx}px 0`;}
  const rm=TU.rm;
  if(old){
    old.classList.add('out');old.style.pointerEvents='none';
    const a=tuAnim(old,[{opacity:1,transform:'none'},{opacity:0,transform:`translate3d(${-dir*32}%,0,-560px) rotateY(${dir*34}deg)`}],
      {duration:rm?200:820,easing:'cubic-bezier(.7,0,.25,1)',fill:'forwards'});
    const rmv=()=>{if(old.isConnected)old.remove();};
    if(a)a.onfinish=rmv;setTimeout(rmv,rm?260:1000);}
  tuAnim(node,[{opacity:0,transform:`translate3d(${dir*36}%,0,-640px) rotateY(${-dir*36}deg)`},{opacity:1,transform:'none'}],
    {duration:rm?220:1050,delay:rm?0:old?120:0,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  tuPaintChrome();
  tuPlaySlide(node,sl);
  /* 마지막 장이 가까우면 PPT 도구를 미리 불러 둔다 */
  if(i>=TU.slides.length-2)tuLoadPptx().catch(()=>{});}
const tuNext=()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1,1);};
const tuPrev=()=>{if(TU.i>0)tuGo(TU.i-1,-1);};
function tuPlay(on){
  TU.play=!!on;clearTimeout(TU.playT);
  if(TU.play){if(TU.i>=TU.slides.length-1){tuGo(0,1);return;}
    if(TU.ed)tuEditEnd(true);
    TU.playT=setTimeout(()=>{if(TU.i<TU.slides.length-1)tuGo(TU.i+1);else tuPlay(false);},tuDur(TU.slides[TU.i]));}
  tuPaintChrome();}
/* ---------- 7. 열기 · 닫기 ---------- */
function tuFont(){
  if(document.getElementById('tuFont'))return;
  const l=document.createElement('link');l.id='tuFont';l.rel='stylesheet';
  l.href='https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
  document.head.appendChild(l);}
function tuOpen(){
  if(TU.el||document.body.classList.contains('booting'))return;
  const perf=$('sub-perf');
  if(!perf||perf.classList.contains('hidden')||!tuVis(perf)){showToast(L('서머리 화면에서 열 수 있어요','Open it from the summary view'),'',{kind:'warn'});return;}
  TU.rm=typeof reduceMotion==='function'?reduceMotion():false;
  try{if(typeof axFinish==='function')axFinish(perf);}catch(e){}
  try{hideTip();}catch(e){}
  /* 일자별 그래프는 전체 기간을 한 폭에 담아 복제(페이지 저장과 같은 방식) — 복제 뒤 바로 원래대로 */
  window.__axHold=(window.__axHold||0)+1;
  let fitOn=false;
  try{if(!window.__DAILY_FIT&&$('chartDaily')&&tuVis($('chartDaily'))){window.__DAILY_FIT=1;fitOn=true;renderDaily();}}catch(e){console.warn(e);}
  TU.daily=window.__DAILY_INFO||null;
  let body=[];
  try{body=tuBuild();}catch(e){console.warn('tour build',e);}
  if(fitOn){window.__DAILY_FIT=0;try{renderDaily();}catch(e){}}
  if(!body.length){window.__axHold=Math.max(0,window.__axHold-1);
    showToast(L('보여 줄 그래프가 없어요','Nothing to show yet'),L('데이터가 들어오면 다시 눌러 주세요','Try again once there is data'),{kind:'warn'});return;}
  TU.slides=[tuCover(),...body];
  TU.slides.push(tuEnd());
  TU.i=-1;TU.node=null;TU.fx=0;TU.play=false;TU.ppt=0;
  tuFont();
  const el=tuShell();TU.el=el;TU.deck=el.querySelector('.tu-deck');
  document.body.appendChild(el);
  document.documentElement.classList.add('tu-on');
  /* 전체 화면 — 문서 전체를(알림 · 툴팁도 함께 보이게). 안 되면 화면 위 덮개로만 */
  try{const de=document.documentElement;
    if(de.requestFullscreen&&!document.fullscreenElement)de.requestFullscreen({navigationUI:'hide'}).then(()=>{TU.fs=true;}).catch(()=>{});}catch(e){}
  tuWire(el);
  /* 배경음 — 투어를 연 누름(사용자 동작) 안에서 시작해야 브라우저가 소리를 낸다 */
  try{if(TU_SND.on)tuSound(true,true);}catch(e){console.warn('tour music',e);}
  tuPaintSnd();
  requestAnimationFrame(()=>{el.classList.add('on');});
  tuGo(0,1);
  TU.hintT=setTimeout(()=>{const h=el.querySelector('.tu-hint');if(h)h.classList.add('off');},5200);}
function tuClose(){
  const el=TU.el;if(!el)return;
  if(TU.ed)tuEditEnd(true);
  try{if(TU_SND.m)TU_SND.m.stop();}catch(e){}
  tuClear();clearTimeout(TU.hintT);
  TU.el=null;TU.deck=null;TU.node=null;TU.play=false;
  document.removeEventListener('keydown',tuKey,true);
  removeEventListener('resize',tuResize);
  document.removeEventListener('fullscreenchange',tuFsChange);
  if(TU.fs&&document.fullscreenElement){try{document.exitFullscreen();}catch(e){}}
  TU.fs=false;
  window.__axHold=Math.max(0,(window.__axHold||0)-1);
  el.classList.remove('on');el.classList.add('closing');
  document.documentElement.classList.remove('tu-on');
  setTimeout(()=>el.remove(),TU.rm?60:420);
  try{const b=$('tourBtn');if(b)b.focus({preventScroll:true});}catch(e){}}
function tuKey(e){
  if(!TU.el)return;
  const k=e.key,onBtn=e.target&&e.target.closest&&e.target.closest('.tu-btn,.tu-rc,.tu-mi,.tu-eb');
  const stop=()=>{e.preventDefault();e.stopPropagation();};
  /* 문구 편집 중 — 글자 입력은 그대로 두고(대시보드 단축키만 막는다) Enter 완료 · Esc 취소 · Ctrl+B 강조 */
  if(TU.ed){
    if(e.isComposing||e.keyCode===229){e.stopPropagation();return;}     /* 한글 조합 중 */
    if(k==='Escape'){stop();tuEditEnd(false);return;}
    if(k==='Enter'&&!onBtn){stop();tuEditEnd(true);return;}
    if((e.ctrlKey||e.metaKey)&&(k==='b'||k==='B')){stop();tuEmToggle();return;}
    if(k==='Tab'){stop();const to=document.activeElement===TU.ed.title?TU.ed.sub:TU.ed.title;tuCaretEnd(to);return;}
    /* 제목 전체를 고른 채 새로 쓰면 — 첫 글자의 강조색이 새 글 전체로 번지지 않게 먼저 비운다(한글 조합 시작 전 keydown 에서) */
    const ti=TU.ed.title;
    if(document.activeElement===ti&&!e.ctrlKey&&!e.metaKey&&(k.length===1||k==='Process'||e.keyCode===229||k==='Backspace'||k==='Delete')){
      const sel=getSelection(),all=x=>String(x||'').replace(/\s/g,'');
      if(sel.rangeCount&&!sel.isCollapsed&&all(sel.toString())===all(ti.textContent)){
        ti.textContent='';tuCaretEnd(ti);if(k==='Backspace'||k==='Delete')e.preventDefault();}}
    e.stopPropagation();return;}
  const menu=TU.el.querySelector('.tu-dlw.open');
  if(k==='Escape'){stop();if(menu)tuMenu(false);else tuClose();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(menu&&e.target.closest&&e.target.closest('.tu-dlw'))return;      /* 메뉴 안에서는 Enter · Space 가 단추를 누르게 */
  if(k==='ArrowRight'||k==='PageDown'||((k===' '||k==='Enter')&&!onBtn)){stop();tuNext();return;}
  if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){stop();tuPrev();return;}
  if(k==='Home'){stop();tuGo(0,-1);return;}
  if(k==='End'){stop();tuGo(TU.slides.length-1,1);return;}
  if(k==='p'||k==='P'){stop();tuPlay(!TU.play);return;}
  if(k==='e'||k==='E'){stop();tuEditStart();return;}
  if(k==='m'||k==='M'){stop();tuSound();return;}}
/* 크기가 바뀌거나 제목 줄 수가 바뀌면 — 다시 맞추고 지금 차례의 강조를 다시 */
function tuRelayout(n,sl){
  n.querySelectorAll('.tu-chip').forEach(x=>x.remove());
  n.querySelectorAll('.tu-fade,.tu-fadeS').forEach(x=>x.classList.remove('tu-fade','tu-fadeS'));
  tuLayout(n,sl);
  if(n.classList.contains('hl')&&n.__step!=null&&n.__step>=0)tuSpot(n,n.__step);}
function tuResize(){
  clearTimeout(TU.rz);
  TU.rz=setTimeout(()=>{const n=TU.node;if(!n||!TU.el)return;tuRelayout(n,TU.slides[TU.i]);},140);}
function tuFsChange(){if(TU.fs&&!document.fullscreenElement){TU.fs=false;tuClose();}}
function tuWire(el){
  document.addEventListener('keydown',tuKey,true);
  addEventListener('resize',tuResize);
  document.addEventListener('fullscreenchange',tuFsChange);
  el.addEventListener('click',e=>{
    /* 편집 중 머리글 밖을 누르면 고친 대로 끝낸다 · 다운로드 메뉴는 밖을 누르면 닫힌다 */
    if(TU.ed&&!e.target.closest('.tu-head,.tu-ed'))tuEditEnd(true);
    if(!e.target.closest('.tu-dlw'))tuMenu(false);
    const ed=e.target.closest('[data-ed]');if(ed)return tuEditCmd(ed.dataset.ed);
    const t=e.target.closest('[data-go],[data-act],.tu-nav,.tu-x,.tu-play,.tu-ed,.tu-dl,.tu-snd');if(!t)return;
    if(e.detail&&!t.classList.contains('tu-mi'))try{t.blur();}catch(x){}
    if(t.classList.contains('tu-ed'))return TU.ed?tuEditEnd(true):tuEditStart();
    if(t.classList.contains('tu-dl'))return tuMenu();
    if(t.classList.contains('tu-snd'))return tuSound();
    if(t.classList.contains('tu-x'))return tuClose();
    if(t.classList.contains('tu-play'))return tuPlay(!TU.play);
    if(t.classList.contains('tu-nav'))return t.classList.contains('prev')?tuPrev():tuNext();
    if(t.dataset.go!=null){tuPlay(false);return tuGo(+t.dataset.go);}
    const a=t.dataset.act;
    if(a==='close')return tuClose();
    if(a==='restart')return tuGo(0,-1);
    if(a==='ppt')return tuPpt(t);
    if(a==='html')return tuHtml(t);});
  /* 휠은 장면 안 표를 옆으로 넘길 때만 — 뒤 페이지가 스크롤되지 않게 */
  el.addEventListener('wheel',e=>{const sc=e.target.closest&&e.target.closest('.tu-src .tbl-wrap,.tu-src .gantt-wrap,.tu-src .hpwrap');
    if(sc&&Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    if(sc&&e.shiftKey)return;
    e.preventDefault();},{passive:false});
  /* 터치 — 좌우로 밀어 넘기기 */
  let sx=null,sy=0;
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){sx=e.clientX;sy=e.clientY;}});
  el.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4){dx<0?tuNext():tuPrev();}});
  /* (v118) 마우스를 따라 무대를 기울이던 효과는 뺐다 — 표 · 카드가 비스듬해져 강조 테두리와 어긋나 보였다. 그래프는 늘 평평하게 */
}

/* 다운로드 메뉴 (v119) — 위 오른쪽. PPT · 파일(HTML) */
function tuMenu(open){
  const w=TU.el&&TU.el.querySelector('.tu-dlw');if(!w)return;
  open=open==null?!w.classList.contains('open'):!!open;
  if(!open&&TU.ppt&&w.contains(document.activeElement))return;
  w.classList.toggle('open',open);w.querySelector('.tu-dl').setAttribute('aria-expanded',open?'true':'false');
  if(open){tuPlay(false);const f=w.querySelector('.tu-mi');if(f)try{f.focus({preventScroll:true});}catch(e){}}}
/* ---------- 문구 편집 (v119) — 지금 장의 제목 · 부제목을 그 자리에서 고쳐 쓴다 ----------
   강조(강조색 숫자)는 글자를 고른 뒤 '강조' 또는 Ctrl+B. 고친 문구는 이 창을 닫기 전까지 남고 PPT · 파일 저장 · 핵심 요약에도 그대로 */
const tuEditHtml=t=>esc(t||'').replace(/\u0002/g,'<em>').replace(/\u0003/g,'</em>');
function tuEditRead(el){
  let out='';
  const walk=(n,em)=>{for(const c of n.childNodes){
    if(c.nodeType===3){out+=c.nodeValue;continue;}
    if(c.nodeType!==1)continue;
    if(c.tagName==='BR'){out+=' ';continue;}
    const isEm=/^(EM|B|STRONG)$/.test(c.tagName)||/bold|^[6-9]00$/.test(c.style&&c.style.fontWeight||'');
    if(isEm&&!em){out+='\u0002';walk(c,true);out+='\u0003';}
    else{walk(c,em);if(/^(DIV|P)$/.test(c.tagName))out+=' ';}}};
  walk(el,false);
  return out.replace(/[\s\u00a0]+/g,' ').replace(/\u0002\s+/g,' \u0002').replace(/\s+\u0003/g,'\u0003 ')
    .replace(/\u0002\u0003/g,'').replace(/ {2,}/g,' ').trim();}
function tuCaretEnd(el){if(!el)return;try{el.focus({preventScroll:true});const r=document.createRange();r.selectNodeContents(el);r.collapse(false);
  const s=getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}
function tuEmToggle(){
  const ed=TU.ed,t=ed&&ed.title;if(!t)return;
  const sel=getSelection();if(!sel.rangeCount)return;const r=sel.getRangeAt(0);
  if(!t.contains(r.commonAncestorContainer))return;
  const emOf=n=>{for(let p=n&&(n.nodeType===1?n:n.parentElement);p&&p!==t;p=p.parentElement)if(p.tagName==='EM')return p;return null;};
  const e0=emOf(r.startContainer);
  if(e0&&e0===emOf(r.endContainer)){            /* 강조 안 — 풀기 */
    const f=document.createDocumentFragment();while(e0.firstChild)f.appendChild(e0.firstChild);e0.replaceWith(f);t.normalize();return;}
  if(r.collapsed)return;
  const frag=r.extractContents();frag.querySelectorAll('em,b,strong').forEach(x=>x.replaceWith(...x.childNodes));
  const em=document.createElement('em');em.appendChild(frag);r.insertNode(em);
  t.querySelectorAll('em').forEach(x=>{if(!x.textContent)x.remove();});
  t.normalize();
  try{sel.removeAllRanges();const nr=document.createRange();nr.selectNodeContents(em);sel.addRange(nr);}catch(e){}}
function tuEditPaste(e){
  e.preventDefault();
  const tx=((e.clipboardData||window.clipboardData).getData('text/plain')||'').replace(/\s+/g,' ');
  if(!document.execCommand||!document.execCommand('insertText',false,tx)){
    const s=getSelection();if(!s.rangeCount)return;const r=s.getRangeAt(0);r.deleteContents();r.insertNode(document.createTextNode(tx));r.collapse(false);}}
function tuEditStart(){
  if(!TU.el||TU.ed||TU.ppt)return;
  const node=TU.node,sl=TU.slides[TU.i];if(!node||!sl)return;
  tuPlay(false);tuMenu(false);
  const head=node.querySelector('.tu-head');
  try{head.getAnimations({subtree:true}).forEach(a=>{try{a.finish();}catch(x){}});}catch(e){}
  const t=head.querySelector('.tu-title');
  let sub=head.querySelector('.tu-sub');
  if(!sub){sub=document.createElement('p');sub.className='tu-sub';t.after(sub);}
  t.innerHTML=tuEditHtml(sl.t);sub.textContent=sl.s||'';
  sub.setAttribute('data-ph',L('부제목 (비워 두면 숨겨요)','Subtitle (leave empty to hide)'));
  [t,sub].forEach(x=>{x.setAttribute('contenteditable','true');x.spellcheck=false;x.addEventListener('paste',tuEditPaste);});
  const bar=document.createElement('div');bar.className='tu-edbar tu-ch';bar.setAttribute('data-noi18n','');
  bar.innerHTML=`<span class="tip">${esc(L('글자를 바로 고쳐 쓰세요','Type to edit'))}</span>`
    +`<button type="button" class="tu-eb em" data-ed="em" title="${esc(L('고른 글자를 강조색으로 (Ctrl+B)','Highlight the selected text (Ctrl+B)'))}"><b>${esc(L('강조','Highlight'))}</b><kbd>Ctrl B</kbd></button>`
    +`<button type="button" class="tu-eb" data-ed="reset" title="${esc(L('자동으로 만든 문구로 되돌리기','Back to the generated text'))}">${esc(L('원래대로','Reset'))}</button>`
    +`<button type="button" class="tu-eb" data-ed="cancel">${esc(L('취소','Cancel'))}<kbd>Esc</kbd></button>`
    +`<button type="button" class="tu-eb pri" data-ed="done">${esc(L('완료','Done'))}<kbd>Enter</kbd></button>`;
  /* 단추를 눌러도 고른 글자(선택)가 풀리지 않게 */
  bar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
  head.appendChild(bar);
  node.classList.add('editing');TU.el.classList.add('editing');
  TU.ed={node,sl,title:t,sub,bar};
  tuPaintChrome();
  tuCaretEnd(t);}
function tuEditCmd(c){
  const ed=TU.ed;if(!ed)return;
  if(c==='em')return tuEmToggle();
  if(c==='done')return tuEditEnd(true);
  if(c==='cancel')return tuEditEnd(false);
  if(c==='reset'){ed.title.innerHTML=tuEditHtml(ed.sl.t0!=null?ed.sl.t0:ed.sl.t);ed.sub.textContent=ed.sl.s0!=null?ed.sl.s0:(ed.sl.s||'');tuCaretEnd(ed.title);}}
function tuEditEnd(save){
  const ed=TU.ed;if(!ed)return;TU.ed=null;
  const {node,sl,title,sub,bar}=ed;
  if(save){
    let t=tuEditRead(title);const s=sub.textContent.replace(/[\s\u00a0]+/g,' ').trim();
    if(!tuPlain(t).trim())t=sl.t;                  /* 제목을 다 지웠으면 그대로 */
    if(t!==sl.t||s!==(sl.s||'')){
      sl.t=t;sl.s=s;
      if(t===sl.t0&&s===(sl.s0||''))TU_EDITS.delete(tuEditKey(sl));else TU_EDITS.set(tuEditKey(sl),{t,s});
      /* 핵심 요약 장은 다시 만든다(고친 제목이 보이게) */
      const ei=TU.slides.findIndex(x=>x.kind==='end');
      if(ei>=0&&TU.slides[ei]!==sl){TU.slides[ei]=tuEnd();}}}
  bar.remove();
  [title,sub].forEach(x=>{x.removeAttribute('contenteditable');x.removeEventListener('paste',tuEditPaste);});
  title.innerHTML=tuWords(sl.t);
  if(sl.s)sub.textContent=sl.s;else sub.remove();
  node.classList.remove('editing');if(TU.el)TU.el.classList.remove('editing');
  try{const s=getSelection();if(s&&title.contains(s.anchorNode))s.removeAllRanges();}catch(e){}
  if(node.isConnected)tuRelayout(node,sl);
  if(TU.el)tuPaintChrome();}
/* ---------- 8. PPT 저장 ---------- */
let TU_PPTX=null;
function tuScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;
  const to=setTimeout(()=>{s.onload=s.onerror=null;rej(new Error('timeout'));},20000);
  s.onload=()=>{clearTimeout(to);res();};s.onerror=()=>{clearTimeout(to);s.remove();rej(new Error('load '+src));};document.head.appendChild(s);});}
function tuLoadPptx(){
  if(window.PptxGenJS)return Promise.resolve(window.PptxGenJS);
  if(TU_PPTX)return TU_PPTX;
  const urls=['./vendor/pptxgen.bundle.js','https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js'];
  TU_PPTX=(async()=>{let last=null;
    for(const u of urls){try{await tuScript(u);if(window.PptxGenJS)return window.PptxGenJS;}catch(e){last=e;}}
    TU_PPTX=null;throw last||new Error('PptxGenJS');})();
  TU_PPTX.catch(()=>{});
  return TU_PPTX;}
/* PPT 파일 묶기(JSZip)는 setTimeout(0) 을 수백 번 이어 부른다 — 탭이 뒤에 있으면 크롬이 이어진 타이머를 1초~1분 간격으로 묶어
   '파일 저장 중…'에서 멈춘 것처럼 보였다. 묶는 동안만 0ms 타이머를 메시지 채널로 바로 돌린다(앞에 있어도 더 빠름) */
async function tuFast(job){
  const ST=window.setTimeout,ch=new MessageChannel(),q=[];
  ch.port1.onmessage=()=>{const f=q.shift();if(f)try{f();}catch(e){ST(()=>{throw e;},0);}};
  window.setTimeout=function(fn,ms){
    if(!ms&&typeof fn==='function'){const a=[].slice.call(arguments,2);q.push(()=>fn.apply(window,a));ch.port2.postMessage(0);return 0;}
    return ST.apply(window,arguments);};
  try{return await job();}finally{window.setTimeout=ST;}}
/* 화면 갱신 틈 — 탭이 뒤에 있으면 타이머가 1분 단위로 묶이므로(크롬) 메시지로 넘긴다 */
const tuYield=()=>new Promise(r=>{if(document.visibilityState==='visible')setTimeout(r,16);
  else{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);}});
/* 장면의 그래프 → 바탕 없는 PNG + 강조할 곳(그림 안 좌표) */
/* o.cards — 카드 바탕은 남긴다(HTML 파일 · 투어 화면처럼). 기본은 PPT 용 누끼(카드 바탕까지 뺀다) */
/* o.fade — 강조할 곳 말고는 조금 투명하게(투어 화면과 같은 모습)를 그림에 담는다(PPT · 차례가 하나뿐인 장면) */
async function tuShot(sl,o){
  o=o||{};
  const key=(o.cards?'__shotH':'__shotP')+(o.fade?'f':'');
  if(sl[key])return sl[key];                  /* 한 번 만든 그림은 다시 쓴다(PPT · HTML 둘 다 저장할 때) */
  const hold=document.createElement('div');hold.className='tu-shot';
  const src=sl.src.cloneNode(true);src.style.width=sl.W+'px';src.style.transform='none';
  hold.appendChild(src);TU.el.appendChild(hold);
  try{
    if(!sl.tblX)tuWrap(src,sl,o.cards?1700:1213,o.cards?620:470,Infinity);
    if(o.fade)tuFade(src,[...src.querySelectorAll('[data-tuhl]')]);
    const R=src.getBoundingClientRect();
    const hl=[...src.querySelectorAll('[data-tuhl]')].map(e=>{const r=e.getBoundingClientRect();
      return {x:r.left-R.left,y:r.top-R.top,w:r.width,h:r.height,st:tuStepOf(e),chip:sl.chips[+e.getAttribute('data-tuhl')]||''};}).filter(r=>r.w>2&&r.h>2);
    const strip=e=>{e.style.setProperty('background','transparent','important');e.style.setProperty('box-shadow','none','important');
      e.style.setProperty('border-color','transparent','important');};
    const out=await ccRender(src,{zoom:2,transparent:true,meta:true,dataUrl:true,
      clean:c=>{if(o.cards)return;strip(c);c.querySelectorAll('.card,.hpbox,.infcell,.infk').forEach(strip);}});
    return (sl[key]={...out,hl});
  }finally{hold.remove();}}
/* 저장 단추(마지막 장 · 위쪽 다운로드 메뉴) — 글자로 진행 상황, 다운로드 단추도 함께 바쁨 표시 */
function tuBusy(btn,on){btn.disabled=on;btn.classList.toggle('busy',on);
  const d=TU.el&&TU.el.querySelector('.tu-dl');if(d)d.classList.toggle('busy',on);}
function tuSaved(btn){if(btn.classList.contains('tu-mi'))setTimeout(()=>tuMenu(false),1400);}
async function tuPpt(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);if(TU.ed)tuEditEnd(true);
  const lab=btn.querySelector('[data-lab]')||btn.querySelector('span'),was=lab.textContent;tuBusy(btn,true);
  const say=t=>{lab.textContent=t;};
  try{
    say(L('PPT 준비 중…','Preparing PPT…'));
    const P=await tuLoadPptx();
    const px=new P();px.layout='LAYOUT_WIDE';
    const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'Dashboard';
    px.title=`${nm} · Data Tour`;px.company='Media Dashboard';
    try{px.theme={headFontFace:'Pretendard',bodyFontFace:'Pretendard'};}catch(e){}
    /* 다크 보기에서 만들면 그림도 어두운 색이라 — 장 바탕 · 글자도 어둡게 맞춘다 */
    const DK=document.documentElement.getAttribute('data-theme')==='dark';
    const FF='Pretendard',INK=DK?'F1F2F4':'1B1F24',INK2=DK?'B3B9C1':'5B636E',MUT='8F97A2',ACC='E4573D',BG=DK?'1C1F23':'FFFFFF';
    const addSlide=()=>{const x=px.addSlide();x.background={color:BG};return x;};
    const body=TU.slides.filter(s=>s.kind==='body');
    const foot=(s,no)=>{
      s.addText(`${nm}  ·  DATA TOUR`,{x:.6,y:7.02,w:8,h:.3,fontFace:FF,fontSize:9,color:'A0A6AE',margin:0});
      if(no)s.addText(String(no),{x:11.73,y:7.02,w:1,h:.3,fontFace:FF,fontSize:9,color:'A0A6AE',align:'right',margin:0});};
    /* 표지 */
    {const c=TU.slides[0],s=addSlide();
      s.addShape(px.ShapeType.ellipse,{x:.62,y:2.12,w:.13,h:.13,fill:{color:ACC},line:{color:ACC,width:0}});
      s.addText('DATA TOUR',{x:.86,y:2.02,w:6,h:.32,fontFace:FF,fontSize:11,bold:true,color:INK,charSpacing:3,margin:0});
      s.addText(tuPlain(c.t),{x:.6,y:2.45,w:12.1,h:1.1,fontFace:FF,fontSize:40,bold:true,color:INK,margin:0,valign:'top',fit:'shrink'});
      if(c.s)s.addText(c.s,{x:.6,y:3.55,w:12.1,h:.45,fontFace:FF,fontSize:16,color:INK2,margin:0});
      const ts=c.tiles||[],tw=2.85,gap=.22;
      ts.forEach((t,k)=>{const x=.6+k*(tw+gap),y=4.45;
        s.addShape(px.ShapeType.roundRect,{x,y,w:tw,h:1.25,rectRadius:.12,fill:{color:DK?'2A2E34':'F3F4F6'},line:{color:DK?'3A3F46':'E6E8EB',width:.75}});
        s.addText(t.k,{x:x+.22,y:y+.18,w:tw-.44,h:.3,fontFace:FF,fontSize:10.5,bold:true,color:MUT,margin:0});
        s.addText(t.v,{x:x+.22,y:y+.52,w:tw-.44,h:.5,fontFace:FF,fontSize:t.v.length>14?15:20,bold:true,color:INK,margin:0,fit:'shrink'});});
      foot(s,0);}
    /* 장면마다 — 편집 가능한 글 + 누끼 그래프 + 강조 테두리(도형) */
    for(let k=0;k<body.length;k++){
      const sl=body[k];say(L(`PPT 만드는 중 ${k+1}/${body.length}`,`Building PPT ${k+1}/${body.length}`));
      await tuYield();
      const s=addSlide();
      s.addText(`${String(k+1).padStart(2,'0')}   ${sl.label}`,{x:.6,y:.42,w:12.1,h:.3,fontFace:FF,fontSize:11,bold:true,color:MUT,margin:0});
      /* 제목 길이 — 두 줄이면 아래를 내린다 */
      const est=[...tuPlain(sl.t)].reduce((a,ch)=>a+(/[가-힣ㄱ-ㅎ]/.test(ch)?.39:/[A-Z0-9₩%]/.test(ch)?.25:.21),0);
      const two=est>11.8,ty=.74,th=two?1.02:.6;
      s.addText(tuRuns(sl.t,INK,ACC),{x:.6,y:ty,w:12.13,h:th,fontFace:FF,fontSize:28,bold:true,margin:0,valign:'top',fit:'shrink'});
      const sy=ty+th+.1;
      if(sl.s)s.addText(sl.s,{x:.6,y:sy,w:12.13,h:.5,fontFace:FF,fontSize:14,color:INK2,margin:0,valign:'top',fit:'shrink'});
      s.addNotes([sl.label,tuPlain(sl.t),sl.s].filter(Boolean).join('\n'));
      /* 강조 — 나머지를 조금 투명하게 한 모습을 그림에 담는다(차례가 여럿인 장면은 그대로 · 이름표만) */
      let shot=null;
      try{shot=await tuShot(sl,{fade:tuSteps(sl.src).length===1});}catch(e){console.warn('tour shot',e);}
      if(shot){
        const AX=.6,AY=sy+(sl.s?.66:.2),AW=12.13,AH=6.92-AY;
        const a=shot.W/shot.H;let w=AW,h=w/a;if(h>AH){h=AH;w=h*a;}
        const x=AX+(AW-w)/2,y=AY+Math.max(0,(AH-h)/2)*.4,f=w/shot.W;
        s.addImage({data:shot.data.replace(/^data:/,''),x,y,w,h});
        shot.hl.forEach(r=>{
          if(r.chip){const cw=Math.min(3.6,.32+[...r.chip].reduce((a,ch)=>a+(/[가-힣]/.test(ch)?.15:.085),0));
            const cx=Math.min(x+w,x+(r.x+r.w)*f)-cw,cy=y+r.y*f-.24;
            s.addText(r.chip,{x:Math.max(.3,cx),y:Math.max(.3,cy),w:cw,h:.3,fontFace:FF,fontSize:10.5,bold:true,color:'FFFFFF',
              fill:{color:ACC},align:'center',valign:'middle',margin:0,rectRadius:.15,shape:px.ShapeType.roundRect});}});}
      foot(s,k+2);}
    /* 핵심 요약 — 갈래별 묶음(투어 마지막 장과 같게). 갈래는 세로 칸에 차례로, 가장 짧은 칸부터 채운다 */
    {const s=addSlide(),endSl=TU.slides.find(x=>x.kind==='end');
      s.addText(tuPlain(endSl?endSl.t:L('핵심 요약','Key takeaways')),{x:.6,y:.5,w:12.1,h:.6,fontFace:FF,fontSize:28,bold:true,color:INK,margin:0});
      const cats=tuCats(body),nc=cats.length<=3?cats.length:cats.length===4?2:3,G=.24,cw=(12.13-(nc-1)*G)/nc;
      const est=t=>[...t].reduce((a,ch)=>a+(/[가-힣ㄱ-ㅎ]/.test(ch)?1:/[A-Z0-9₩%]/.test(ch)?.62:.52),0);
      const lines=(t,fs)=>Math.max(1,Math.ceil(est(t)*fs/72/(cw-.62)));
      const plan=fs=>{const col=Array(nc).fill(0),out=[];
        cats.forEach(c=>{const ih=c.items.map(it=>lines((it.lab?it.s.label+'  ':'')+tuPlain(it.s.t),fs)*fs*1.32/72+fs*.5/72);
          const h=.5+ih.reduce((a,b)=>a+b,0)+.18,k=col.indexOf(Math.min(...col));
          out.push({c,k,y:col[k],h});col[k]+=h+.18;});
        return {out,H:Math.max(...col)-.18};};
      let fs=12,P=plan(fs);
      while(P.H>5.35&&fs>8.5){fs-=.5;P=plan(fs);}
      P.out.forEach(({c,k,y,h})=>{const x=.6+k*(cw+G),Y=1.38+y;
        s.addShape(px.ShapeType.roundRect,{x,y:Y,w:cw,h,rectRadius:.1,fill:{color:DK?'2A2E34':'F4F5F7'},line:{color:DK?'3A3F46':'E6E8EB',width:.75}});
        s.addShape(px.ShapeType.ellipse,{x:x+.2,y:Y+.2,w:.09,h:.09,fill:{color:ACC},line:{color:ACC,width:0}});
        s.addText([{text:c.n,options:{bold:true,color:INK}},{text:'  '+c.items.length,options:{bold:true,color:MUT}}],
          {x:x+.36,y:Y+.1,w:cw-.5,h:.3,fontFace:FF,fontSize:11,margin:0,valign:'middle'});
        const runs=[];
        c.items.forEach((it,j)=>{
          runs.push({text:String(it.k+1).padStart(2,'0')+'   ',options:{color:ACC,bold:true}});
          if(it.lab)runs.push({text:it.s.label+'  ',options:{color:MUT,bold:true}});
          const tr=tuRuns(it.s.t,INK,ACC);
          tr.forEach((r,q)=>runs.push({text:r.text,options:{...r.options,bold:r.options.color===ACC,breakLine:q===tr.length-1&&j<c.items.length-1}}));});
        s.addText(runs,{x:x+.2,y:Y+.48,w:cw-.4,h:h-.6,fontFace:FF,fontSize:fs,margin:0,valign:'top',paraSpaceAfter:fs*.5,lineSpacingMultiple:1.05});});
      foot(s,body.length+2);}
    say(L('파일 저장 중…','Saving…'));
    const buf=await tuFast(()=>px.write({outputType:'arraybuffer'}));
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.pptx`;
    saveFile(buf,fn,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('PPT로 저장했어요','Saved as PowerPoint'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);tuSaved(btn);
  }catch(e){console.warn('tour ppt',e);say(was);
    showToast(L('PPT를 만들지 못했어요','Couldn’t create the PPT'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;tuBusy(btn,false);}}
/* ---------- 9. 파일로 저장 (HTML) — v118 ----------
   투어를 파일 하나로: 장면마다 그래프 그림(카드 바탕 그대로 · 2배 해상도) + 제목/부제목 글 + 강조 위치를 담고,
   같은 모양의 작은 재생기(넘기기 · 3D 장면 전환 · 강조 · 진행 막대 · 자동 재생 · 전체 화면)를 함께 넣는다.
   인터넷 없이 어느 브라우저에서나 열린다(Pretendard 글꼴만 인터넷이 되면 받아 쓴다) */
async function tuHtml(btn){
  if(TU.ppt)return;TU.ppt=1;tuPlay(false);if(TU.ed)tuEditEnd(true);
  const lab=btn.querySelector('[data-lab]')||btn.querySelector('span'),was=lab.textContent;tuBusy(btn,true);
  const say=t=>{lab.textContent=t;};
  try{
    const body=TU.slides.filter(x=>x.kind==='body');
    const nm=(typeof CAMPAIGN!=='undefined'&&CAMPAIGN.name)||'Dashboard';
    const out=[];
    for(const sl of TU.slides){
      if(sl.kind==='body'){
        const k=body.indexOf(sl);
        say(L(`파일 만드는 중 ${k+1}/${body.length}`,`Building file ${k+1}/${body.length}`));
        await tuYield();
        let sh=null;try{sh=await tuShot(sl,{cards:true});}catch(e){console.warn('tour html shot',e);}
        out.push({k:'body',eye:`<span class="no">${String(k+1).padStart(2,'0')}</span>${esc(sl.label)}`,t:tuWords(sl.t),s:sl.s,
          img:sh?sh.data:'',w:sh?sh.W:0,h:sh?sh.H:0,
          hl:sh?sh.hl.map(r=>({x:r.x/sh.W,y:r.y/sh.H,w:r.w/sh.W,h:r.h/sh.H,c:r.chip||'',st:r.st||0})):[]});}
      else if(sl.kind==='cover')
        out.push({k:'cover',eye:`<span class="no">▶</span>DATA TOUR`,t:tuWords(sl.t),s:sl.s,tiles:(sl.tiles||[]).map(x=>({k:x.k,v:x.v,s:x.s||''}))});
      else out.push({k:'end',eye:`<span class="no">✓</span>${esc(sl.label)}`,t:tuWords(sl.t),s:sl.s,
        cats:tuCats(body).map(c=>({n:c.n,items:c.items.map(x=>({n:String(x.k+1).padStart(2,'0'),t:tuWords(x.s.t),l:x.lab?x.s.label:'',tl:x.s.label,go:x.go}))}))});}
    say(L('파일 저장 중…','Saving…'));
    const D={name:nm,lang:LANG,dark:document.documentElement.getAttribute('data-theme')==='dark',
      made:new Date().toISOString().slice(0,10),
      ui:{prev:L('이전','Previous'),next:L('다음','Next'),play:L('자동 재생 (P)','Autoplay (P)'),fs:L('전체 화면 (F)','Full screen (F)'),
        hint:L('← → 넘기기 · P 자동 재생 · M 배경음 · F 전체 화면','← → to move · P autoplay · M music · F full screen'),again:L('처음부터','From the start'),
        sndOn:L('배경음 끄기 (M)','Mute music (M)'),sndOff:L('배경음 켜기 (M)','Play music (M)')},slides:out};
    const html=tuHtmlDoc(D);
    const clean=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s*[·›]\s*/g,' ').trim().replace(/\s+/g,'_');
    const fn=`${clean(nm)||'dashboard'}_${L('데이터투어','DataTour')}_${psDay(new Date())}.html`;
    saveFile(new TextEncoder().encode(html),fn,'text/html;charset=utf-8');
    say(L('저장했어요 ✓','Saved ✓'));
    showToast(L('투어를 파일로 저장했어요','Tour saved as a file'),fn,{kind:'ok'});
    setTimeout(()=>{if(lab.isConnected)say(was);},2600);tuSaved(btn);
  }catch(e){console.warn('tour html',e);say(was);
    showToast(L('파일을 만들지 못했어요','Couldn’t create the file'),String(e&&e.message||e).slice(0,140),{kind:'warn'});}
  finally{TU.ppt=0;tuBusy(btn,false);}}
/* 저장 파일 — 문서 + 작은 재생기. 데이터는 JSON 으로 넣는다(</ 는 막아 둔다) */
function tuHtmlDoc(D){
  const json=JSON.stringify(D).replace(/</g,'\\u003c');
  const css=`
:root{--ink:#1b1f24;--ink2:#5b636e;--mut:#8f97a2;--acc:#e4573d;--accrgb:228 87 61;--bg1:#fcfcfd;--bg2:#eef0f3;--bg3:#dde1e6;
  --grid:rgba(36,44,56,.085);--glass:rgba(255,255,255,.74);--line:rgba(27,31,36,.1)}
html.dk{--ink:#f1f2f4;--ink2:#b3b9c1;--mut:#868d97;--bg1:#2d3137;--bg2:#212429;--bg3:#16181b;--grid:rgba(255,255,255,.06);--glass:rgba(44,48,54,.78);--line:rgba(255,255,255,.1)}
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden}
body{font-family:'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
  background:radial-gradient(125% 95% at 50% 34%,var(--bg1) 0%,var(--bg2) 50%,var(--bg3) 100%);-webkit-font-smoothing:antialiased}
.fw{position:fixed;inset:0;perspective:720px;perspective-origin:50% 36%;pointer-events:none;overflow:hidden}
.fl{position:absolute;left:-120%;right:-120%;bottom:0;height:230%;transform:rotateX(80deg);transform-origin:50% 100%;
  background-image:linear-gradient(var(--grid) 1.5px,transparent 1.5px),linear-gradient(90deg,var(--grid) 1.5px,transparent 1.5px);background-size:96px 96px;
  -webkit-mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.5) 22%,transparent 46%);mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.5) 22%,transparent 46%);
  transition:background-position 1.15s cubic-bezier(.65,0,.25,1)}
.top{position:fixed;left:0;right:0;top:0;padding:16px 30px 0;z-index:6}
.pg{display:flex;gap:6px}.pg i{flex:1;height:14px;position:relative;cursor:pointer}
.pg i::before,.pg i::after{content:'';position:absolute;left:0;right:0;top:5px;height:3px;border-radius:3px}
.pg i::before{background:rgba(27,31,36,.12)}html.dk .pg i::before{background:rgba(255,255,255,.14)}
.pg i::after{background:var(--ink);transform:scaleX(0);transform-origin:0 50%;transition:transform .55s cubic-bezier(.22,1,.36,1)}
.pg i.on::after{transform:scaleX(1)}.pg i.cur.play::after{transition:none;animation:pgp var(--dur,9s) linear both}
@keyframes pgp{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.mt{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:12px;font-weight:700;color:var(--ink2)}
.br{display:inline-flex;align-items:center;gap:8px;min-width:0}.br .d{width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 4px rgb(var(--accrgb) / .15);flex:none}
.br b{font-weight:900;font-size:11px;letter-spacing:.16em;color:var(--ink);white-space:nowrap}
.br .cn{color:var(--mut);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw}.br .cn::before{content:'·';margin:0 8px 0 2px}
.sp{flex:1}.ct{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:800;letter-spacing:.04em;margin-right:4px;white-space:nowrap}
.ib{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0}
.ib svg{width:14px;height:14px;display:block}.ib[aria-pressed=true]{background:var(--ink);color:var(--bg1)}
.ib.bs[aria-pressed]{background:var(--glass);color:var(--ink)}.ib.bs[aria-pressed=false]{color:var(--mut)}.bs .wv{animation:wv 2.4s ease-in-out infinite}@keyframes wv{50%{opacity:.35}}
.dk2{position:fixed;inset:0;perspective:2200px;perspective-origin:50% 46%}
.sl{position:absolute;inset:0;transform-style:preserve-3d;backface-visibility:hidden}
.hd{position:absolute;left:0;right:0;top:calc(66px + 3.2vh);padding:0 9vw;text-align:center;z-index:2;perspective:900px}
.eye{display:inline-flex;align-items:center;gap:9px;font-size:clamp(11.5px,.86vw,14px);font-weight:800;color:var(--mut)}
.eye .no{display:inline-grid;place-items:center;min-width:28px;height:21px;padding:0 8px;border-radius:999px;background:var(--ink);color:var(--bg1);font-size:11px;font-weight:800}
.tt{margin:12px 0 0;font-size:clamp(26px,2.95vw,54px);line-height:1.2;font-weight:800;letter-spacing:-.035em;word-break:keep-all;overflow-wrap:anywhere}
.tt .w{display:inline-block;overflow:hidden;vertical-align:top;padding:.04em .02em .12em;margin:-.04em 0 -.12em}.tt .w>span{display:inline-block;transform-origin:50% 100%}
.tt em{font-style:normal;color:var(--acc);position:relative}
.tt em::after{content:'';position:absolute;left:-.04em;right:-.04em;bottom:.02em;height:.16em;border-radius:.1em;z-index:-1;background:rgb(var(--accrgb) / .2);
  transform:scaleX(0);transform-origin:0 50%;transition:transform 1s cubic-bezier(.22,1,.36,1) .25s}
.sl.hl .tt em::after{transform:scaleX(1)}
.sb{margin:13px auto 0;max-width:min(1180px,84vw);font-size:clamp(14px,1.16vw,21px);line-height:1.5;font-weight:500;color:var(--ink2);letter-spacing:-.015em;word-break:keep-all}
.cover .hd{top:24vh}.cover .tt{font-size:clamp(34px,4.3vw,80px);margin-top:18px}
.st{position:absolute;left:4.5vw;right:4.5vw;bottom:5vh;display:flex;justify-content:center;align-items:flex-start;z-index:1}
.in{position:relative;transform-origin:50% 100%}
.fig{position:relative}.fig svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.fig .base{transition:opacity .9s ease}.fig.fd .base{opacity:.3}
.fig .hs{opacity:0;transition:opacity .9s ease}.fig .hs.on{opacity:1}
.chip{position:absolute;z-index:4;padding:6px 12px;border-radius:999px;background:var(--acc);color:#fff;font-size:13px;font-weight:800;white-space:nowrap;pointer-events:none;
  box-shadow:0 8px 20px rgb(var(--accrgb) / .32);transform:translate(-100%,var(--ty,-70%)) scale(.6);opacity:0;transform-origin:100% 100%}
.chip.on{animation:cp .6s cubic-bezier(.34,1.56,.64,1) .3s forwards}@keyframes cp{to{opacity:1;transform:translate(-100%,var(--ty,-70%)) scale(1)}}
.tiles{display:flex;justify-content:center;gap:clamp(12px,1.3vw,22px);flex-wrap:wrap;padding-top:4vh}
.tile{min-width:clamp(190px,15.5vw,290px);padding:clamp(16px,1.4vw,24px) clamp(18px,1.5vw,26px);border-radius:20px;text-align:left;background:var(--glass);
  border:1px solid rgba(255,255,255,.85);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 22px 44px rgba(27,31,36,.10)}
html.dk .tile{border-color:rgba(255,255,255,.08)}
.tile .k{font-size:clamp(11.5px,.82vw,14px);font-weight:700;color:var(--mut)}.tile .v{margin-top:10px;font-size:clamp(19px,1.65vw,30px);font-weight:800;letter-spacing:-.03em;white-space:nowrap}
.tile .s{margin-top:6px;font-size:12px;font-weight:600;color:var(--ink2)}
.cats{display:grid;grid-template-columns:repeat(var(--nc,3),minmax(0,1fr));gap:16px;max-width:1320px;margin:0 auto;align-items:start}
.cat{padding:14px 12px 10px;border-radius:18px;background:var(--glass);border:1px solid var(--line);box-shadow:0 14px 34px rgba(27,31,36,.07)}
.cath{display:flex;align-items:center;gap:8px;padding:0 6px 8px;font-size:13px;font-weight:800;color:var(--ink)}
.cath .d{width:7px;height:7px;border-radius:50%;background:var(--acc)}.cath .c{margin-left:auto;font-size:11.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.cat button{display:flex;gap:11px;align-items:flex-start;width:100%;padding:8px 8px;border-radius:11px;text-align:left;cursor:pointer;font:inherit;border:0;background:transparent;color:var(--ink)}
.cat button:hover{background:var(--bg1)}.cat .n{font-size:12px;font-weight:900;color:var(--acc);padding-top:2px;font-variant-numeric:tabular-nums}
.cat .x{display:flex;flex-direction:column;gap:2px;min-width:0}.cat .t{font-size:14px;font-weight:700;letter-spacing:-.02em;line-height:1.38;word-break:keep-all}
.cat .t em{font-style:normal;color:var(--acc)}.cat .t .w{display:inline}.cat .l{font-size:11px;font-weight:700;color:var(--mut)}
.ag{display:flex;justify-content:center;margin-top:26px}.ag button{height:46px;padding:0 24px;border-radius:999px;border:0;background:var(--ink);color:var(--bg1);font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.nv{position:fixed;top:56%;z-index:6;width:clamp(46px,3.7vw,62px);height:clamp(46px,3.7vw,62px);transform:translateY(-50%);border-radius:50%;border:1px solid var(--line);
  background:var(--glass);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:0 10px 30px rgba(27,31,36,.12);transition:transform .2s,opacity .3s}
.nv svg{width:42%;height:42%}.nv.p{left:1.4vw}.nv.n{right:1.4vw}.nv:hover{transform:translateY(-50%) scale(1.08)}.nv[disabled]{opacity:0;pointer-events:none}
.hn{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;font-size:12px;font-weight:600;color:var(--mut);padding:6px 14px;border-radius:999px;
  background:var(--glass);border:1px solid var(--line);transition:opacity .8s}.hn.off{opacity:0}
@media (max-width:760px){.top{padding:12px 14px 0}.hd{padding:0 6vw}.nv{top:auto;bottom:14px;transform:none}.hn{display:none}.cats{grid-template-columns:minmax(0,1fr)}}
@media print{.top,.nv,.hn{display:none}}`;
  const js=`
const D=JSON.parse(document.getElementById('tud').textContent);
/* 배경음 — 투어 화면과 같은 소리(브라우저에서 합성). 브라우저 규칙상 처음 누르거나 키를 칠 때 시작 */
${tuMusicBuild.toString()}
${tuMusic.toString()}
const MUS=tuMusic(),SIC=${TU_SNDIC.toString()};
let SND=true;try{SND=localStorage.getItem('dmd:tuSound')!=='0';}catch(e){}
if(D.dark)document.documentElement.classList.add('dk');
document.documentElement.lang=D.lang||'ko';
const $=s=>document.querySelector(s),deck=$('.dk2'),N=D.slides.length,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let I=-1,node=null,play=false,pt=0,tm=[],fx=0;
$('.cn').textContent=D.name;document.title=D.name+' · Data Tour';
$('.pg').innerHTML=D.slides.map((s,i)=>'<i data-go="'+i+'"></i>').join('');
const svgNS='http://www.w3.org/2000/svg';
function bodyHtml(s){
  if(s.k==='cover')return '<div class="tiles">'+s.tiles.map(x=>'<div class="tile"><div class="k">'+esc(x.k)+'</div><div class="v">'+esc(x.v)+'</div>'+(x.s?'<div class="s">'+esc(x.s)+'</div>':'')+'</div>').join('')+'</div>';
  if(s.k==='end')return '<div class="cats" style="--nc:'+(s.cats.length<=3?s.cats.length:s.cats.length===4?2:3)+'">'+s.cats.map(c=>'<div class="cat"><div class="cath"><span class="d"></span>'+esc(c.n)+'<span class="c">'+c.items.length+'</span></div>'
    +c.items.map(r=>'<button data-go="'+r.go+'" title="'+esc(r.tl)+'"><span class="n">'+r.n+'</span><span class="x">'+(r.l?'<span class="l">'+esc(r.l)+'</span>':'')+'<span class="t">'+r.t+'</span></span></button>').join('')+'</div>').join('')
    +'</div><div class="ag"><button data-go="0">↺ '+esc(D.ui.again)+'</button></div>';
  if(!s.img)return '';
  /* 강조 — 그림을 조금 투명하게 깔고, 강조할 곳만 원래 진하기로(차례가 여럿이면 차례마다 한 겹) */
  const W=s.w,H=s.h,id='c'+Math.random().toString(36).slice(2,7),rr=(w,h)=>Math.min(14,w/2,h/2),P=6;
  const R=s.hl.map(r=>({x:r.x*W-P,y:r.y*H-P,w:r.w*W+P*2,h:r.h*H+P*2,c:r.c,st:r.st||0,cx:(r.x+r.w)*W,cy:r.y*H,ch:r.h*H}));
  const st=[...new Set(R.map(r=>r.st))].sort((a,b)=>a-b);
  return '<div class="fig"><svg viewBox="0 0 '+W+' '+H+'"><defs>'+st.map(k=>'<clipPath id="'+id+k+'">'+R.filter(r=>r.st===k).map(r=>'<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" rx="'+rr(r.w,r.h)+'"/>').join('')+'</clipPath>').join('')+'</defs>'
    +'<image class="base" href="'+s.img+'" x="0" y="0" width="'+W+'" height="'+H+'"/>'
    +st.map(k=>'<image class="hs" data-st="'+k+'" href="'+s.img+'" x="0" y="0" width="'+W+'" height="'+H+'" clip-path="url(#'+id+k+')"/>').join('')
    +'</svg>'+R.filter(r=>r.c).map(r=>'<div class="chip" data-st="'+r.st+'" style="left:'+(r.cx/W*100)+'%;top:'+((r.cy>40?r.cy:r.cy+r.ch)/H*100)+'%;--ty:'+(r.cy>40?'calc(-100% - 5px)':'5px')+'">'+esc(r.c)+'</div>').join('')+'</div>';}
function layout(n,s){
  const hd=n.querySelector('.hd'),st=n.querySelector('.st'),fig=n.querySelector('.fig');
  st.style.top=(hd.offsetTop+hd.offsetHeight+Math.max(14,innerHeight*.028))+'px';
  if(!fig)return;
  const sw=st.clientWidth,sh=st.clientHeight,w=s.w,h=s.h;   /* s.w · s.h = 화면 크기(그림 파일은 그 2배 해상도) */
  const k=Math.max(.2,Math.min(1.25,sw/w,sh/h));
  fig.style.width=Math.round(w*k)+'px';fig.style.height=Math.round(h*k)+'px';
  n.querySelector('.in').style.marginTop=Math.max(0,Math.round((sh-h*k)*.3))+'px';}
function mount(i){
  const s=D.slides[i],n=document.createElement('section');n.className='sl '+s.k;
  n.innerHTML='<div class="hd"><div class="eye">'+s.eye+'</div><h2 class="tt">'+s.t+'</h2>'+(s.s?'<p class="sb">'+esc(s.s)+'</p>':'')+'</div><div class="st"><div class="in">'+bodyHtml(s)+'</div></div>';
  deck.appendChild(n);layout(n,s);return n;}
const an=(el,kf,o)=>el&&el.animate?el.animate(kf,o):null;
function go(i,dir){
  if(i<0||i>=N||i===I)return;tm.forEach(clearTimeout);tm=[];clearTimeout(pt);
  dir=dir||(i>I?1:-1);const old=node;I=i;node=mount(i);
  fx-=dir*288;$('.fl').style.backgroundPosition=fx+'px 0';
  if(old){old.style.pointerEvents='none';const a=an(old,[{opacity:1,transform:'none'},{opacity:0,transform:'translate3d('+(-dir*32)+'%,0,-560px) rotateY('+(dir*34)+'deg)'}],{duration:RM?200:820,easing:'cubic-bezier(.7,0,.25,1)',fill:'forwards'});
    const rm=()=>old.isConnected&&old.remove();if(a)a.onfinish=rm;setTimeout(rm,1000);}
  an(node,[{opacity:0,transform:'translate3d('+(dir*36)+'%,0,-640px) rotateY('+(-dir*36)+'deg)'},{opacity:1,transform:'none'}],{duration:RM?220:1050,delay:RM||!old?0:120,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  const E='cubic-bezier(.16,1,.3,1)',ws=[...node.querySelectorAll('.tt .w>span')];
  an(node.querySelector('.eye'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:600,delay:200,easing:E,fill:'backwards'});
  ws.forEach((w,k)=>an(w,[{opacity:0,transform:'translateY(105%) rotateX(-80deg)'},{opacity:1,transform:'none'}],{duration:RM?150:820,delay:RM?0:280+k*60,easing:'cubic-bezier(.2,.85,.25,1)',fill:'backwards'}));
  an(node.querySelector('.sb'),[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:760,delay:RM?0:520+ws.length*45,easing:E,fill:'backwards'});
  an(node.querySelector('.in'),[{opacity:0,transform:'translateY(56px) scale(.95)'},{opacity:1,transform:'none'}],{duration:RM?150:1150,delay:RM?0:330,easing:E,fill:'backwards'});
  /* 그래프는 왼쪽부터 드러난다 */
  an(node.querySelector('.fig svg'),[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:RM?150:1300,delay:RM?0:500,easing:'cubic-bezier(.45,0,.2,1)',fill:'backwards'});
  node.querySelectorAll('.tile,.cat,.ag button').forEach((t,k)=>an(t,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],{duration:RM?150:760,delay:RM?0:480+k*70,easing:E,fill:'backwards'}));
  const n=node,f=n.querySelector('.fig'),sts=f?[...new Set([...f.querySelectorAll('.hs')].map(x=>+x.dataset.st))]:[];
  const spot=k=>{if(!n.isConnected)return;n.classList.add('hl');if(!f||!sts.length)return;
    f.classList.toggle('fd',k>=0);
    f.querySelectorAll('.hs').forEach(x=>x.classList.toggle('on',+x.dataset.st===k));
    f.querySelectorAll('.chip').forEach(x=>{const on=+x.dataset.st===k;if(on&&!x.classList.contains('on')){x.classList.remove('on');void x.offsetWidth;}x.classList.toggle('on',on);});};
  const T0=RM?200:1900;
  tm.push(setTimeout(()=>spot(sts.length?sts[0]:-1),T0));
  if(sts.length>1){sts.slice(1).forEach((k,j)=>tm.push(setTimeout(()=>spot(k),T0+(j+1)*3000)));tm.push(setTimeout(()=>spot(-1),T0+sts.length*3000));}
  if(play)pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},dur(I));
  paint();}
function dur(i){const f=node&&node.querySelector('.fig'),n=f?new Set([...f.querySelectorAll('.hs')].map(x=>x.dataset.st)).size:0;return n>1?Math.max(9000,1900+n*3000+1800):9000;}
function paint(){
  document.querySelectorAll('.pg i').forEach((s,k)=>{s.classList.toggle('on',k<=I);s.classList.toggle('cur',k===I);s.classList.toggle('play',k===I&&play);if(k===I)s.style.setProperty('--dur',dur(I)+'ms');});
  $('.ct').textContent=String(I+1).padStart(2,'0')+' / '+String(N).padStart(2,'0');
  $('.nv.p').disabled=I<=0;$('.nv.n').disabled=I>=N-1;
  $('.bp').setAttribute('aria-pressed',play?'true':'false');
  $('.bp').innerHTML=play?'<svg viewBox="0 0 16 16"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 16 16"><path d="M5.2 3.4v9.2l7.3-4.6z" fill="currentColor"/></svg>';}
function setPlay(on){play=!!on;clearTimeout(pt);if(play){if(I>=N-1){go(0,1);return;}pt=setTimeout(()=>{I<N-1?go(I+1,1):setPlay(false);},dur(I));}paint();}
function fs(){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}}
function snd(on){if(on!=null){SND=on;try{localStorage.setItem('dmd:tuSound',on?'1':'0');}catch(e){}}
  if(SND)MUS.start();else MUS.stop();
  const b=$('.bs');b.setAttribute('aria-pressed',SND?'true':'false');b.innerHTML=SIC(SND);b.title=SND?D.ui.sndOn:D.ui.sndOff;}
const wake=e=>{if(e.target&&e.target.closest&&e.target.closest('.bs'))return;removeEventListener('pointerdown',wake,true);removeEventListener('keydown',wake,true);if(SND)snd();};
addEventListener('pointerdown',wake,true);addEventListener('keydown',wake,true);
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],.nv,.bp,.bf,.bs');if(!t)return;
  if(t.classList.contains('bs')){removeEventListener('pointerdown',wake,true);removeEventListener('keydown',wake,true);return snd(!(SND&&MUS.on));}
  if(t.classList.contains('nv'))return t.classList.contains('p')?go(I-1,-1):go(I+1,1);
  if(t.classList.contains('bp'))return setPlay(!play);if(t.classList.contains('bf'))return fs();
  setPlay(false);go(+t.dataset.go);});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
  if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();go(I+1,1);}
  else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'){e.preventDefault();go(I-1,-1);}
  else if(k==='Home')go(0,-1);else if(k==='End')go(N-1,1);
  else if(k==='p'||k==='P')setPlay(!play);else if(k==='f'||k==='F')fs();
  else if(k==='m'||k==='M')snd(!(SND&&MUS.on));});
let sx=null,sy=0;
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){sx=e.clientX;sy=e.clientY;}});
addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)dx<0?go(I+1,1):go(I-1,-1);});
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(node)layout(node,D.slides[I]);},120);});
$('.hn').textContent=D.ui.hint;setTimeout(()=>$('.hn').classList.add('off'),5200);
$('.nv.p').setAttribute('aria-label',D.ui.prev);$('.nv.n').setAttribute('aria-label',D.ui.next);$('.bp').title=D.ui.play;$('.bf').title=D.ui.fs;
{const b=$('.bs');b.setAttribute('aria-pressed',SND?'true':'false');b.innerHTML=SIC(SND);b.title=SND?D.ui.sndOn:D.ui.sndOff;}
go(0,1);`;
  return `<!doctype html>
<html lang="${esc(D.lang||'ko')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.name)} · Data Tour</title>
<meta name="generator" content="Media Dashboard · Data Tour (${esc(D.made)})">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${css}</style></head><body>
<div class="fw"><div class="fl"></div></div>
<div class="top"><div class="pg"></div><div class="mt"><span class="br"><span class="d"></span><b>DATA TOUR</b><span class="cn"></span></span><span class="sp"></span>
<span class="ct"></span><button class="ib bs" type="button"></button><button class="ib bp" type="button"></button><button class="ib bf" type="button"><svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>
<div class="dk2"></div>
<button class="nv p" type="button"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<button class="nv n" type="button"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
<div class="hn"></div>
<script type="application/json" id="tud">${json}</`+`script>
<script>${js}</`+`script>
</body></html>`;}
/* ---------- 10. 배경음 (v119) — 발표장 분위기를 깨지 않는 잔잔한 리듬. 브라우저에서 직접 합성(음원 파일 없음 · 저작권 걱정 없음) ----------
   76BPM · Am(add9) → Fmaj7 → C(add9) → G6 두 마디씩 되풀이(약 25초).
   부드러운 패드 + 낮은 맥박(킥 · 베이스 당김음) + 작은 아르페지오(점8분 메아리) + 아주 옅은 셰이커, 잔향.
   처음 두 마디는 패드 · 아르페지오만 — 서서히 들어오고, 닫을 때 1초 동안 줄어든다.
   위 오른쪽 스피커 단추 · M 키로 끄고 켠다(끈 것은 이 브라우저가 기억). 저장한 HTML 파일에도 같은 소리가 들어간다 */
function tuMusicBuild(ctx){
  const SR=ctx.sampleRate,E8=30/76,mf=m=>440*Math.pow(2,(m-69)/12),R=Math.random;
  /* [베이스, 패드, 아르페지오] */
  const CH=[[45,[57,60,64,71],[69,72,76,71,74]],[41,[57,60,64,67],[65,69,72,76,74]],
            [48,[55,60,62,64],[67,72,74,76,79]],[43,[55,59,62,64],[67,71,74,76,79]]];
  const PAT=[[0,-1,1,2,-1,1,3,-1,0,-1,1,2,-1,4,2,-1],[0,1,-1,2,3,-1,2,1,0,-1,2,-1,3,2,-1,1]];
  const g=v=>{const n=ctx.createGain();n.gain.value=v;return n;};
  const lp=(f,q)=>{const n=ctx.createBiquadFilter();n.type='lowpass';n.frequency.value=f;n.Q.value=q||.5;return n;};
  const master=g(0),comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-20;comp.ratio.value=3;comp.attack.value=.02;comp.release.value=.3;
  const bus=g(1);bus.connect(comp);comp.connect(master);master.connect(ctx.destination);
  /* 잔향 — 서서히 줄어드는 잡음으로 만든 공간 */
  const rv=ctx.createConvolver(),n=Math.floor(SR*3.2),ib=ctx.createBuffer(2,n,SR);
  for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<n;i++)d[i]=(R()*2-1)*Math.pow(1-i/n,2.6);}
  rv.buffer=ib;const rvo=g(.5);rv.connect(rvo);rvo.connect(bus);
  /* 메아리 — 점4분(8분 셋) 뒤, 갈수록 어둡게 */
  const dl=ctx.createDelay(2);dl.delayTime.value=E8*3;const dfb=g(.3),dlf=lp(1700);
  dl.connect(dlf);dlf.connect(dfb);dfb.connect(dl);const dlo=g(.32);dlf.connect(dlo);dlo.connect(bus);
  const send=(node,dry,rev,del)=>{const a=g(dry);node.connect(a);a.connect(bus);
    if(rev){const r=g(rev);node.connect(r);r.connect(rv);}if(del){const d=g(del);node.connect(d);d.connect(dl);}};
  const padF=lp(950,.4),lfo=ctx.createOscillator(),lfg=g(300);lfo.frequency.value=.045;lfo.connect(lfg);lfg.connect(padF.frequency);lfo.start();
  send(padF,1,.6,0);
  const arpF=lp(2400);send(arpF,.85,.45,.55);
  const bassF=lp(420);send(bassF,1,.04,0);
  const drum=g(1);send(drum,1,.12,0);
  const noise=ctx.createBuffer(1,SR,SR);{const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=R()*2-1;}
  const env=(p,t,a,v,d)=>{p.setValueAtTime(0,t);p.linearRampToValueAtTime(v,t+a);p.exponentialRampToValueAtTime(.0004,t+d);};
  function pad(ns,t,d){ns.forEach((m,k)=>{const a=g(0);a.connect(padF);
    a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(.014,t+1.6);a.gain.setValueAtTime(.014,t+d-.1);a.gain.linearRampToValueAtTime(0,t+d+2);
    [-7,7].forEach(dt=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=mf(m);o.detune.value=dt+(k%2?3:-3);o.connect(a);o.start(t);o.stop(t+d+2.1);});});}
  /* 베이스 — 사인 + 한 옥타브 위 세모파를 조금(노트북 스피커에서도 음이 들리게) */
  function bass(m,t,d,v){const a=g(0);a.connect(bassF);
    a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(v,t+.04);a.gain.setValueAtTime(v,t+d*.6);a.gain.linearRampToValueAtTime(0,t+d);
    [['sine',1,1],['triangle',2,.28]].forEach(([ty,k,lv])=>{const o=ctx.createOscillator(),b=g(lv);o.type=ty;o.frequency.value=mf(m)*k;o.connect(b);b.connect(a);o.start(t);o.stop(t+d+.05);});}
  function pluck(m,t,v){const o=ctx.createOscillator(),a=g(0);o.type='triangle';o.frequency.value=mf(m);o.connect(a);a.connect(arpF);
    env(a.gain,t,.006,v,.95);o.start(t);o.stop(t+1);}
  /* 킥 — 낮은 사인 + 짧은 윗소리(작은 스피커에서도 박이 느껴지게) */
  function kick(t,v){[[105,44,1,.5],[210,90,.3,.18]].forEach(([f0,f1,lv,d])=>{const o=ctx.createOscillator(),a=g(0);o.type='sine';
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+.17);o.connect(a);a.connect(drum);env(a.gain,t,.008,v*lv,d);o.start(t);o.stop(t+d+.05);});}
  function shk(t,v){const b=ctx.createBufferSource(),f=ctx.createBiquadFilter(),a=g(0);b.buffer=noise;f.type='bandpass';f.frequency.value=7200;f.Q.value=.9;
    b.connect(f);f.connect(a);a.connect(drum);env(a.gain,t,.004,v,.075);b.start(t,R()*.5);b.stop(t+.09);}
  let step=0,next=ctx.currentTime+.08;
  function play(s,t){
    const c=CH[Math.floor(s/16)%4],i=s%16,b=s%8,intro=s<16,pat=PAT[Math.floor(s/64)%2];
    if(i===0)pad(c[1],t,16*E8);
    if(b===0)bass(c[0],t,E8*2.8,intro?.06:.085);if(b===3)bass(c[0],t,E8*4.6,intro?.045:.07);
    const k=pat[i];if(k>=0)pluck(c[2][k],t+(R()-.5)*.008,(intro?.03:.042)*(i===0?1.3:1)*(.85+R()*.3));
    if(!intro){if(b===0||b===4)kick(t,b===0?.2:.15);if(s%2)shk(t,(b===3||b===7?.013:.008)*(.8+R()*.4));}}
  return {master,lfo,schedule(until){while(next<until){play(step,next);next+=E8;step++;}}};}
function tuMusic(){
  const AC=window.AudioContext||window.webkitAudioContext,VOL=.9;
  let ctx=null,eng=null,timer=0;
  return {
    get on(){return !!timer;},
    start(){
      if(!AC||timer)return;
      try{if(!ctx){ctx=new AC();eng=tuMusicBuild(ctx);}if(ctx.resume)ctx.resume();}catch(e){ctx=null;return;}
      const m=eng.master.gain,t=ctx.currentTime;m.cancelScheduledValues(t);m.setValueAtTime(m.value,t);m.linearRampToValueAtTime(VOL,t+2.5);
      const tick=()=>{if(ctx)eng.schedule(ctx.currentTime+1.2);};tick();timer=setInterval(tick,200);},
    stop(){
      clearInterval(timer);timer=0;if(!ctx)return;
      const c=ctx,m=eng.master.gain,t=c.currentTime;m.cancelScheduledValues(t);m.setValueAtTime(m.value,t);m.linearRampToValueAtTime(0,t+.9);
      ctx=null;eng=null;setTimeout(()=>{try{c.close();}catch(e){}},1100);}};}
/* 확인용 — 몇 초를 미리 그려 소리 크기를 잰다(오프라인) */
async function tuMusicRender(sec){
  const c=new OfflineAudioContext(2,Math.round(44100*sec),44100),e=tuMusicBuild(c);
  e.master.gain.value=.9;e.schedule(sec);return c.startRendering();}
const TU_SND={m:null,on:true};
try{TU_SND.on=localStorage.getItem('dmd:tuSound')!=='0';}catch(e){}
const TU_SNDIC=on=>'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 6h2.4L8 3.3v9.4L4.8 10H2.4z" fill="currentColor"/>'
  +(on?'<path class="wv" d="M10.4 5.7a3.2 3.2 0 0 1 0 4.6M12.2 4a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
      :'<path d="M10.6 6.2l3.4 3.6M14 6.2l-3.4 3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')+'</svg>';
function tuPaintSnd(){
  const b=TU.el&&TU.el.querySelector('.tu-snd');if(!b)return;
  b.setAttribute('aria-pressed',TU_SND.on?'true':'false');b.innerHTML=TU_SNDIC(TU_SND.on);
  b.title=TU_SND.on?L('배경음 끄기 (M)','Mute music (M)'):L('배경음 켜기 (M)','Play music (M)');}
/* on — true 켜기 · false 끄기 · 비우면 바꾸기. keep — 설정(다음에도 켤지)은 건드리지 않는다 */
function tuSound(on,keep){
  if(on==null)on=!TU_SND.on;
  if(!keep){TU_SND.on=on;try{localStorage.setItem('dmd:tuSound',on?'1':'0');}catch(e){}}
  if(on){if(!TU_SND.m)TU_SND.m=tuMusic();TU_SND.m.start();}else if(TU_SND.m)TU_SND.m.stop();
  tuPaintSnd();}
(function(){const b=$('tourBtn');if(b)b.addEventListener('click',()=>{try{tuOpen();}catch(e){console.warn('tour',e);}});})();
