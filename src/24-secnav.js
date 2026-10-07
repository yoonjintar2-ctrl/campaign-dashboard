
/* ===== 영역 바로가기 (v114) =====
   긴 화면(디지털 서머리 · 전체 캠페인 · TV · OOH …) 오른쪽 가장자리에 영역 점 목록.
   · 점에 마우스를 올리면 영역 이름이 펼쳐지고, 누르면 그 영역으로 부드럽게 이동
   · 지금 보고 있는 영역은 길쭉한 점으로 표시
   · 영역이 3개 이상인 화면에서만 · 숨긴 영역(영역 관리)은 빠진다 · 좁은 화면(900px 미만) · 인쇄 · 페이지 저장 때는 안 보인다 */
const SN={nav:null,items:[],cur:-1,t:0,raf:0};
function snLabel(sec){
  let t='';
  for(const n of sec.childNodes){if(n.nodeType===3)t+=n.nodeValue;else break;}
  t=t.replace(/\s+/g,' ').trim();
  if(!t){const f=[...sec.children].find(c=>!c.matches('.tools,.note,.hint,select,button,.infowrap'));
    if(f)t=f.textContent.replace(/\s+/g,' ').trim();}
  if(!t&&sec.dataset.sect&&typeof SECT_LABEL!=='undefined')t=SECT_LABEL[sec.dataset.sect]||'';
  return t.slice(0,40);}
function snWrap(){return document.querySelector('.wrap:not(.hidden)');}
function snBuild(){
  SN.t=0;
  const nav=SN.nav;if(!nav)return;
  const w=snWrap();
  const secs=w?[...w.querySelectorAll('.sec')].filter(s=>s.getClientRects().length&&!s.closest('.hidden,.modal')):[];
  const items=secs.map(s=>({s,l:snLabel(s)})).filter(x=>x.l);
  const sig=items.map(x=>x.l).join('|');
  if(nav.__sig===sig&&SN.items.length===items.length&&SN.items.every((x,i)=>x.s===items[i].s)){snPaint();return;}
  nav.__sig=sig;SN.items=items;SN.cur=-1;
  nav.classList.toggle('on',items.length>=3);
  nav.innerHTML=items.map((x,i)=>`<button type="button" data-i="${i}"><span class="snl">${esc(x.l)}</span><i></i></button>`).join('');
  nav.querySelectorAll('button').forEach(b=>b.onclick=()=>snGo(+b.dataset.i));
  snPaint();}
function snStick(){return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stick'),10)||94;}
function snGo(i){
  const x=SN.items[i];if(!x||!x.s.isConnected)return;
  const y=x.s.getBoundingClientRect().top+scrollY-snStick()-14;
  let reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'});}
/* 지금 영역 = 머리줄 바로 아래 선을 지난 마지막 영역(맨 아래에 닿으면 마지막 영역) */
function snPaint(){
  SN.raf=0;
  const nav=SN.nav;if(!nav||!SN.items.length)return;
  const line=snStick()+innerHeight*0.28;
  let cur=0;
  SN.items.forEach((x,i)=>{if(x.s.isConnected&&x.s.getBoundingClientRect().top<=line)cur=i;});
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)cur=SN.items.length-1;
  if(cur===SN.cur)return;
  SN.cur=cur;
  nav.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('cur',i===cur));}
function snLater(){clearTimeout(SN.t);SN.t=setTimeout(snBuild,250);}
(function(){
  const nav=document.createElement('nav');
  nav.id='secNav';nav.className='secnav';nav.setAttribute('aria-label',L('영역 바로가기','Jump to section'));
  document.body.appendChild(nav);SN.nav=nav;
  addEventListener('scroll',()=>{if(!SN.raf)SN.raf=requestAnimationFrame(snPaint);},{passive:true});
  addEventListener('resize',snLater);
  /* 화면이 다시 그려지거나(필터 · 메뉴 옮김 · 숨김) 영역이 바뀌면 목록을 새로 */
  const mo=new MutationObserver(recs=>{
    for(const r of recs){
      if(r.type==='attributes'){if(r.target.classList&&(r.target.classList.contains('wrap')||r.target.matches('[data-sect],.sec')))return snLater();continue;}
      for(const n of r.addedNodes)if(n.nodeType===1&&(n.matches('.sec')||n.querySelector&&n.querySelector('.sec')))return snLater();
      for(const n of r.removedNodes)if(n.nodeType===1&&(n.matches('.sec')||n.querySelector&&n.querySelector('.sec')))return snLater();}});
  document.querySelectorAll('.wrap').forEach(w=>mo.observe(w,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']}));
  snLater();setTimeout(snBuild,1200);})();
