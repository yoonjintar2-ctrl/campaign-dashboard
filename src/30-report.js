/* ===== 30. 리포트 (v143) — 연도 › 월별 리포트 메뉴 틀 =====
   상위 메뉴 '리포트'. 연도를 고르고 그 해의 달(1~12월)을 고르면 그 달의 리포트가 보인다.
   ⚠ 아직 틀만 있다 — 달마다 보여 줄 구성(표 · 그래프 · 문구)은 받은 자료 양식에 맞춰 채운다.
   기본으로 광고주(뷰어)에게는 숨긴다(MENUS vdef:false) — 내용이 채워지면 메뉴 설정에서 켠다. */
var RPT={y:0,m:0};
function rptYears(){
  const t=String(CAMPAIGN.today||iso(new Date())).slice(0,10);
  const ds=[campStart(),campEnd(),t].map(d=>String(d||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)).map(Number);
  const y0=Math.min(...ds),y1=Math.max(...ds);
  const out=[];for(let y=y0;y<=y1&&out.length<10;y++)out.push(y);
  return out.length?out:[new Date().getFullYear()];}
function renderReport(){
  const host=$('rptBody');if(!host)return;
  const ys=rptYears(),t=String(CAMPAIGN.today||iso(new Date())).slice(0,10);
  if(!ys.includes(RPT.y))RPT.y=ys.includes(+t.slice(0,4))?+t.slice(0,4):ys[ys.length-1];
  if(!(RPT.m>=1&&RPT.m<=12))RPT.m=+t.slice(0,4)===RPT.y?+t.slice(5,7):1;
  const yb=$('rptYears');
  if(yb)yb.innerHTML=ys.map(y=>`<button type="button" class="rpt-y${y===RPT.y?' on':''}" data-rpty="${y}">${L(`${y}년`,String(y))}</button>`).join('');
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mb=$('rptMonths');
  if(mb)mb.innerHTML=[...Array(12)].map((_,i)=>{const m=i+1,ym=`${RPT.y}-${String(m).padStart(2,'0')}`,fut=ym>t.slice(0,7);
    return `<button type="button" class="rpt-m${m===RPT.m?' on':''}${fut?' fut':''}" data-rptm="${m}">${L(`${m}월`,MON[i])}</button>`;}).join('');
  const nt=$('rptNote');if(nt)nt.textContent=L(`${RPT.y}년 ${RPT.m}월`,`${MON[RPT.m-1]} ${RPT.y}`);
  host.innerHTML=`<div class="rpt-empty"><div class="ttl">${L(`${RPT.y}년 ${RPT.m}월 리포트`,`${MON[RPT.m-1]} ${RPT.y} report`)}</div>
    <div class="txt">${L('리포트 구성을 준비하고 있습니다. 연도 · 월별 데이터 양식이 정해지면 이 자리에 표와 그래프가 채워집니다.',
      'The report layout is being prepared. Tables and charts will appear here once the yearly · monthly data format is set.')}</div></div>`;
  document.querySelectorAll('#tab-report [data-rpty]').forEach(b=>b.onclick=()=>{RPT.y=+b.dataset.rpty;RPT.m=0;renderReport();});
  document.querySelectorAll('#tab-report [data-rptm]').forEach(b=>b.onclick=()=>{RPT.m=+b.dataset.rptm;renderReport();});}
