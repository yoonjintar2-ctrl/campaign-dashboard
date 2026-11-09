/* ===== 29. TV 월별 퍼포먼스 (v142) =====
   달마다 계획(채널별 월 계획 TV_MIX) 대비 실적을 본다.
   실적은 아래 순서로 찾는다 — 값마다 따로(예: 일자표에 광고비가 없으면 광고비만 주차표에서)
     ① 월별 실적 표(TV_MON) — 채널을 비운 줄 = 그 달 전체, 채널을 적은 줄 = 그 달 · 그 채널
     ② 일자별 퍼포먼스(TV_DAY) — 방송일의 달로 더한다. 누적 Reach 는 그 달 마지막 날 값
     ③ 주차별 퍼포먼스(TV_WEEK) — 주가 두 달에 걸치면 날 수 비율로 나눈다. 누적 Reach 는 그 달 안에서 끝나는 마지막 주
   채널 × 월 실적은 ① 의 채널 줄 → 주차 × 채널 표(TV_WKCH, 주차 이름으로 주차표의 날짜를 찾아 나눔).
   Reach 는 더하지 않는다. 금액은 천원으로 보인다(TV 화면 규칙). */
const TV_MON_COLS=[
  {k:'ym',l:'월',type:'month',w:80},
  {k:'ch',l:'채널(비우면 전체)',type:'text',w:140},
  {k:'cost',l:'집행 광고비',type:'num',unit:'k',w:120},
  {k:'cnt',l:'횟수',type:'num',w:80},
  {k:'grp',l:'GRP',type:'dec',w:90},
  {k:'eqgrp',l:'eq.GRP',type:'dec',w:90},
  {k:'reach',l:'그 달 Reach 1+(%)',type:'pct',w:128},
  {k:'cumreach',l:'누적 Reach 1+(%)',type:'pct',w:128},
  {k:'note',l:'비고',type:'text',w:150}];
TV_TBL.mon={id:'tvMonInTbl',name:'TV 월별 실적',base:TV_MON_COLS,get cols(){return tblCols('mon');},
  rows:()=>TV_MON,set:v=>{TV_MON=v;},calc:()=>({}),
  /* 합계는 전체 줄(채널 비움)이 있으면 그 줄들만 — 채널 줄까지 더하면 두 번 센다 */
  total:rs=>{rs=rs||TV_MON;const tot=rs.filter(r=>!String(r.ch||'').trim());const use=tot.length?tot:rs;
    const o={cost:0,cnt:0,grp:0,eqgrp:0};use.forEach(r=>Object.keys(o).forEach(k=>o[k]+=tvNum(r[k])));return o;},
  foot:(c,t)=>{
    if(c.k==='cost')return t.cost?fmt(t.cost/1000):'';
    if(c.k==='cnt')return t.cnt?fmt(t.cnt):'';
    if(c.k==='grp'||c.k==='eqgrp')return t[c.k]?String(tvR(t[c.k],3)):'';
    if(c.k==='cumreach'){const v=tvActReach();return isFinite(v)?String(tvR(v,2)):'';}
    return '';},
  blank:()=>({ym:'',ch:'',cost:'',cnt:'',grp:'',eqgrp:'',reach:'',cumreach:'',note:''}),
  note:'tvMonInNote',changed:()=>tvChanged()};
TBL_FIXED.mon=['ym'];

/* ---------- 날짜 도우미 ---------- */
const tvmD=s=>new Date(s+'T00:00:00');
const tvmDays=(a,b)=>Math.round((tvmD(b)-tvmD(a))/86400000)+1;
const tvmEnd=ym=>`${ym}-${String(new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate()).padStart(2,'0')}`;
/* 기간 [s, e] 를 달마다 날 수 비율로 — [[ym, 비율], …] */
function tvmSplit(s,e){
  if(!tvIsoOk(s))return [];if(!tvIsoOk(e)||e<s)e=s;
  const n=tvmDays(s,e),out=[];let cur=s;
  while(cur<=e&&out.length<24){const ym=cur.slice(0,7),me=tvmEnd(ym),z=me<e?me:e;
    out.push([ym,tvmDays(cur,z)/n]);const d=tvmD(me);d.setDate(d.getDate()+1);
    cur=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  return out;}
const tvmMonRows=()=>TV_MON.filter(r=>tvYmOk(tvYm(r.ym)));

/* ---------- 달별 실적 ---------- */
function tvMonAct(){
  const M=new Map(),get=ym=>{let o=M.get(ym);if(!o){o={ym,cost:NaN,cnt:NaN,grp:NaN,eqgrp:NaN,reach:NaN,cumreach:NaN,src:{}};M.set(ym,o);}return o;};
  const add=(o,k,v,src)=>{if(!isFinite(v))return;if(o.src[k]&&o.src[k]!==src)return;o[k]=(isFinite(o[k])?o[k]:0)+v;o.src[k]=src;};
  const KS=['cost','cnt','grp','eqgrp'];
  /* ① 월별 실적 표 */
  const mr=tvmMonRows();
  if(mr.length){
    const by=new Map();mr.forEach(r=>{const ym=tvYm(r.ym);if(!by.has(ym))by.set(ym,[]);by.get(ym).push(r);});
    by.forEach((rs,ym)=>{const o=get(ym),tot=rs.filter(r=>!String(r.ch||'').trim()),use=tot.length?tot:rs;
      KS.forEach(k=>{if(use.some(r=>tvHas(r[k])))add(o,k,sum(use.map(r=>tvNum(r[k]))),'mon');});
      const rr=tot.filter(r=>tvHas(r.reach));if(rr.length)o.reach=tvNum(rr[rr.length-1].reach);
      const cr=tot.filter(r=>tvHas(r.cumreach));if(cr.length)o.cumreach=tvNum(cr[cr.length-1].cumreach);});}
  /* ② 일자별 */
  const ds=tvDays();
  if(ds.length){
    const by=new Map();ds.forEach(r=>{const ym=r.date.slice(0,7);if(!by.has(ym))by.set(ym,[]);by.get(ym).push(r);});
    by.forEach((rs,ym)=>{const o=get(ym);
      ['cnt','grp'].forEach(k=>{if(rs.some(r=>tvHas(r[k])))add(o,k,sum(rs.map(r=>tvNum(r[k]))),'day');});
      if(!isFinite(o.cumreach)){const c=rs.filter(r=>tvHas(r.cumreach));if(c.length)o.cumreach=tvNum(c[c.length-1].cumreach);}});}
  /* ③ 주차별 — 날짜가 있는 주만 */
  const ws=tvWeeks().filter(r=>tvIsoOk(r.start));
  if(ws.length){
    const tmp=new Map();
    ws.forEach(r=>{tvmSplit(r.start,tvIsoOk(r.end)?r.end:r.start).forEach(([ym,f])=>{
      let t=tmp.get(ym);if(!t){t={};tmp.set(ym,t);}
      KS.forEach(k=>{if(tvHas(r[k]))t[k]=(t[k]||0)+tvNum(r[k])*f;});});});
    tmp.forEach((t,ym)=>{const o=get(ym);KS.forEach(k=>{if(k in t&&!o.src[k])add(o,k,t[k],'week');});});
    /* 누적 Reach — 그 달 안에서 끝나는 마지막 주 */
    M.forEach(o=>{if(isFinite(o.cumreach))return;
      const c=ws.filter(r=>tvHas(r.cumreach)&&String(tvIsoOk(r.end)?r.end:r.start).slice(0,7)===o.ym);
      if(c.length)o.cumreach=tvNum(c[c.length-1].cumreach);});}
  return M;}
/* 달 × 채널 실적 — Map(chId → {ch, m: {ym: {cost,cnt,grp,eqgrp}}}) */
function tvMonChAct(){
  const out=new Map(),put=(ch,ym,k,v)=>{if(!isFinite(v))return;const id=tvChId(ch);let o=out.get(id);
    if(!o){o={ch,m:{}};out.set(id,o);}const x=o.m[ym]||(o.m[ym]={});x[k]=(x[k]||0)+v;};
  const KS=['cost','cnt','grp','eqgrp'];
  const chRows=tvmMonRows().filter(r=>String(r.ch||'').trim());
  if(chRows.length){chRows.forEach(r=>KS.forEach(k=>{if(tvHas(r[k]))put(String(r.ch).trim(),tvYm(r.ym),k,tvNum(r[k]));}));return out;}
  if(typeof TV_WKCH!=='undefined'&&TV_WKCH.length){
    const wk=new Map();tvWeeks().filter(r=>tvIsoOk(r.start)).forEach((r,i)=>wk.set(tvKey(tvWkLabel(r,i)),r));
    TV_WKCH.forEach(r=>{const ch=String(r.ch||'').trim(),w=wk.get(tvKey(String(r.wk||'').trim()));if(!ch||!w)return;
      tvmSplit(w.start,tvIsoOk(w.end)?w.end:w.start).forEach(([ym,f])=>KS.forEach(k=>{if(tvHas(r[k]))put(ch,ym,k,tvNum(r[k])*f);}));});}
  return out;}
/* 달별 계획 — 채널별 월 계획(달이 적힌 줄) */
function tvMonPlan(){
  const M=new Map();
  TV_MIX.forEach(r=>{if(!tvYmOk(r.ym))return;let o=M.get(r.ym);if(!o){o={amt:0,cnt:0,grp:0,has:{}};M.set(r.ym,o);}
    ['amt','cnt','grp'].forEach(k=>{if(tvHas(r[k])){o[k]+=tvNum(r[k]);o.has[k]=1;}});});
  return M;}

/* ---------- 화면 ---------- */
let TVM_METRIC='cost';
function renderTvMonthly(){
  const host=$('tvMonCards'),tb=$('tvMonTbl');if(!host||!tb)return;
  tvPaintTarget();
  const PM=tvMonPlan(),AM=tvMonAct();
  const yms=[...new Set([...PM.keys(),...AM.keys()])].filter(tvYmOk).sort();
  const today=String(CAMPAIGN.today||'').slice(0,10);
  const n0=v=>isFinite(v)&&v?fmt(Math.round(v)):'–';
  const P=ym=>PM.get(ym)||{amt:NaN,cnt:NaN,grp:NaN,has:{}},A=ym=>AM.get(ym)||{cost:NaN,cnt:NaN,grp:NaN,eqgrp:NaN,reach:NaN,cumreach:NaN};
  const pv=(p,k)=>p.has&&p.has[k]?p[k]:NaN;
  const hasEq=yms.some(ym=>isFinite(A(ym).eqgrp)),hasMR=yms.some(ym=>isFinite(A(ym).reach));
  /* 달 상태 — 지난 달 · 이번 달 · 다음 달 */
  const st=ym=>!tvIsoOk(today)?'':today.slice(0,7)>ym?'done':today.slice(0,7)===ym?'live':'pre';
  const ST={done:L('종료','Ended'),live:L('진행 중','Live'),pre:L('예정','Upcoming')};
  /* ---- 달 카드 ---- */
  const bar=(lab,a,p,fa)=>{const r=tvPc(a,p);
    return `<div class="tvm-r"><span class="l">${lab}</span><span class="v mono">${fa(a)}<i> / ${fa(p)}</i></span>
      <span class="b"><i style="width:${Math.min(isFinite(r)?r:0,1)*100}%"></i></span><b class="mono">${isFinite(r)?(r*100).toFixed(1)+'%':'–'}</b></div>`;};
  host.innerHTML=yms.map(ym=>{const p=P(ym),a=A(ym),s=st(ym);
    return `<div class="tvm-c ${s}"><div class="tvm-h"><b>${tvMonthLabel(ym,true)}</b>${s?`<em>${ST[s]}</em>`:''}</div>
      ${bar(L('예산 소진','Budget spent'),a.cost,pv(p,'amt'),tvKw)}
      ${bar(L('GRP 달성','GRP achv.'),a.grp,pv(p,'grp'),tvG)}
      ${bar(L('집행 횟수','Spots'),a.cnt,pv(p,'cnt'),n0)}
      <div class="tvm-f"><span>${L('누적 Reach 1+','Cum. Reach 1+')}</span><b class="mono">${tvRc(a.cumreach)}</b>
        ${hasEq?`<span>eq.GRP</span><b class="mono">${tvG(a.eqgrp)}</b>`:''}</div></div>`;}).join('');
  host.classList.toggle('hidden',!yms.length);
  /* ---- 달 표 ---- */
  const T={amt:0,cost:0,pg:0,g:0,eq:0,pc:0,c:0};
  yms.forEach(ym=>{const p=P(ym),a=A(ym);T.amt+=pv(p,'amt')||0;T.cost+=a.cost||0;T.pg+=pv(p,'grp')||0;T.g+=a.grp||0;T.eq+=a.eqgrp||0;T.pc+=pv(p,'cnt')||0;T.c+=a.cnt||0;});
  const cprp=(c,g)=>isFinite(c)&&isFinite(g)&&g?c/g:NaN;
  const row=(lab,o,cls)=>`<tr${cls?` class="${cls}"`:''}><td class="head">${lab}</td>
    <td class="mono">${tvKw(o.amt)}</td><td class="mono">${tvKw(o.cost)}</td><td class="mono">${tvP1(tvPc(o.cost,o.amt))}</td>
    <td class="mono gsep">${tvG(o.pg)}</td><td class="mono">${tvG(o.g)}</td><td class="mono">${tvP1(tvPc(o.g,o.pg))}</td>
    ${hasEq?`<td class="mono">${tvG(o.eq)}</td>`:''}
    <td class="mono gsep">${n0(o.pc)}</td><td class="mono">${n0(o.c)}</td><td class="mono">${tvP1(tvPc(o.c,o.pc))}</td>
    <td class="mono gsep">${tvKw(cprp(o.amt,o.pg))}</td><td class="mono">${tvKw(cprp(o.cost,o.g))}</td>
    ${hasMR?`<td class="mono gsep">${tvRc(o.mr)}</td>`:''}<td class="mono${hasMR?'':' gsep'}">${tvRc(o.cr)}</td></tr>`;
  const ncol=13+(hasEq?1:0)+(hasMR?1:0);
  tb.innerHTML=`<thead><tr><th rowspan="2">${L('월','Month')}</th><th colspan="3">${L('예산','Budget')} <span class="tvunit">(${L('천원','K KRW')})</span></th>
      <th colspan="${hasEq?4:3}" class="gsep">GRP</th><th colspan="3" class="gsep">${L('집행 횟수','Spots')}</th>
      <th colspan="2" class="gsep">CPRP <span class="tvunit">(${L('천원','K KRW')})</span></th><th colspan="${hasMR?2:1}" class="gsep">Reach 1+</th></tr>
    <tr><th>${L('계획','Plan')}</th><th>${L('집행 광고비','Spent')}</th><th>${L('소진율','Spent %')}</th>
      <th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th><th>${L('달성률','Achv.')}</th>${hasEq?'<th>eq.GRP</th>':''}
      <th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th><th>${L('달성률','Achv.')}</th>
      <th class="gsep">${L('계획','Plan')}</th><th>${L('실적','Actual')}</th>
      ${hasMR?`<th class="gsep">${L('그 달','Month')}</th>`:''}<th${hasMR?'':' class="gsep"'}>${L('누적','Cum.')}</th></tr></thead><tbody>`
    +(yms.length?yms.map(ym=>{const p=P(ym),a=A(ym);
        return row(tvMonthLabel(ym,true),{amt:pv(p,'amt'),cost:a.cost,pg:pv(p,'grp'),g:a.grp,eq:a.eqgrp,pc:pv(p,'cnt'),c:a.cnt,mr:a.reach,cr:a.cumreach});}).join('')
      +row('TOTAL',{amt:T.amt||NaN,cost:T.cost||NaN,pg:T.pg||NaN,g:T.g||NaN,eq:T.eq||NaN,pc:T.pc||NaN,c:T.c||NaN,mr:NaN,cr:tvActReach()},'total')
      :`<tr><td colspan="${ncol}" class="hint" style="padding:22px;text-align:center">${L('달이 적힌 계획 · 실적이 아직 없습니다.','No monthly plan or results yet.')}</td></tr>`)
    +'</tbody>';
  /* 실적을 어디서 가져왔는지 */
  const srcs=new Set();AM.forEach(o=>Object.values(o.src).forEach(s=>srcs.add(s)));
  const SN={mon:L('월별 실적 표','monthly results'),day:L('일자별 퍼포먼스','daily performance'),week:L('주차별 퍼포먼스(주가 두 달에 걸치면 날 수 비율로 나눔)','weekly performance (weeks spanning two months split by days)')};
  const fn=$('tvMonFoot');
  if(fn)fn.textContent=yms.length?L('계획 = TV 채널별 월 계획 · 실적 = ','Plan = TV monthly channel plan · Actual = ')
    +([...srcs].map(s=>SN[s]).join(' · ')||L('아직 없음','none yet'))+L(' · TOTAL 의 Reach 는 전체(중복 제거) 값',' · TOTAL Reach is the de-duplicated overall value'):'';
  const nt=$('tvMonNote');if(nt)nt.textContent=yms.length?`${tvMonthLabel(yms[0])}~${tvMonthLabel(yms[yms.length-1])} · ${yms.length}${L('개월',' months')}`:'';
  renderTvMonCh(yms,PM);
  tvEmptyNote('tvMonEmpty',!yms.length,
    'TV 월별 데이터가 아직 없습니다. <b>TV › 예상효율 입력</b>의 채널별 월 계획에 달을 적고, <b>TV › 데이터 입력</b>의 월별 실적(또는 일자별 · 주차별 퍼포먼스)을 넣으면 달마다 모입니다.',
    'No monthly TV data yet. Enter months in the monthly channel plan of <b>TV › Forecast input</b>, and monthly (or daily · weekly) results in <b>TV › Data input</b>.');
}
/* 채널 × 월 — 고른 값(예산 · GRP · 횟수)의 계획 / 실적 */
function renderTvMonCh(yms,PM){
  const box=$('tvMonChBox'),tb=$('tvMonChTbl');if(!box||!tb)return;
  const plan=new Map();
  TV_MIX.forEach(r=>{const ch=String(r.ch||'').trim();if(!ch||!tvYmOk(r.ym))return;const id=tvChId(ch);
    let o=plan.get(id);if(!o){o={ch,m:{}};plan.set(id,o);}const x=o.m[r.ym]||(o.m[r.ym]={});
    ['amt','cnt','grp'].forEach(k=>{if(tvHas(r[k]))x[k]=(x[k]||0)+tvNum(r[k]);});});
  const act=tvMonChAct();
  const ids=[...plan.keys()];act.forEach((o,id)=>{if(!ids.includes(id))ids.push(id);});
  box.classList.toggle('hidden',!ids.length||!yms.length);
  if(!ids.length||!yms.length){tb.innerHTML='';return;}
  const M=TVM_METRIC,PK={cost:'amt',grp:'grp',cnt:'cnt'}[M];
  const f=M==='cost'?tvKw:M==='grp'?tvG:(v=>isFinite(v)&&v?fmt(Math.round(v)):'–');
  const hasAct=act.size>0;
  const cell=(p,a)=>`<td class="mono gsep">${f(p)}</td>`+(hasAct?`<td class="mono">${f(a)}</td><td class="mono tvm-rt">${tvP1(tvPc(a,p))}</td>`:'');
  const tot={};
  const body=ids.map(id=>{const p=plan.get(id),a=act.get(id),nm=(p||a).ch;let sp=0,sa=0;
    const tds=yms.map(ym=>{const pv=p&&p.m[ym]&&isFinite(p.m[ym][PK])?p.m[ym][PK]:NaN,av=a&&a.m[ym]&&isFinite(a.m[ym][M])?a.m[ym][M]:NaN;
      const t=tot[ym]||(tot[ym]={p:0,a:0});if(isFinite(pv)){t.p+=pv;sp+=pv;}if(isFinite(av)){t.a+=av;sa+=av;}return cell(pv,av);}).join('');
    return `<tr><td class="head">${esc(nm)}</td>${tds}${cell(sp||NaN,sa||NaN)}</tr>`;}).join('');
  let gp=0,ga=0;yms.forEach(ym=>{gp+=tot[ym]?tot[ym].p:0;ga+=tot[ym]?tot[ym].a:0;});
  const span=hasAct?3:1;
  const sub=`<th class="gsep">${L('계획','Plan')}</th>`+(hasAct?`<th>${L('실적','Actual')}</th><th>%</th>`:'');
  tb.innerHTML=`<thead><tr><th rowspan="2">${L('채널','Channel')}</th>${yms.map(ym=>`<th colspan="${span}" class="gsep">${tvMonthLabel(ym)}</th>`).join('')}<th colspan="${span}" class="gsep">${L('계','Total')}</th></tr>
    <tr>${yms.map(()=>sub).join('')}${sub}</tr></thead><tbody>${body}
    <tr class="total"><td class="head">TOTAL</td>${yms.map(ym=>cell(tot[ym]&&tot[ym].p||NaN,tot[ym]&&tot[ym].a||NaN)).join('')}${cell(gp||NaN,ga||NaN)}</tr></tbody>`;
  const nt=$('tvMonChNote');
  if(nt)nt.textContent=hasAct?(tvmMonRows().some(r=>String(r.ch||'').trim())?L('실적 = 월별 실적 표의 채널 줄','Actual = channel rows of monthly results')
      :L('실적 = 주차 × 채널 표를 달로 나눔','Actual = week × channel table split by month'))
    :L('채널별 달 실적이 없어 계획만 보입니다','Plan only — no monthly results by channel');
  const sel=$('tvMonChSel');
  if(sel&&!sel.__w){sel.__w=1;sel.onchange=()=>{TVM_METRIC=sel.value;renderTvMonCh(yms,PM);};}
  if(sel){sel.innerHTML=[['cost',L('예산 · 광고비 (천원)','Budget (K KRW)')],['grp','GRP'],['cnt',L('횟수','Spots')]]
    .map(([k,l])=>`<option value="${k}"${k===M?' selected':''}>${l}</option>`).join('');}
}
(function(){const go=()=>{const e=$('tvMonAdd');if(e)e.onclick=()=>tvAddRow('mon');
    try{renderTvTable('mon');}catch(er){}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',go):setTimeout(go,0);})();
