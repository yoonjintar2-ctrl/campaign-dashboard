/* 대시보드(부모 창) ↔ 큐시트 틀 연결 — 보기는 REPORT 모드(읽기 전용), 넣기는 ?imp=1 */
window.cueGo = function (t) { try { if (App.tabAllowed(t)) App.go(t); } catch (e) { } };
window.cueSheetNames = function (ab) { return XLSX.read(new Uint8Array(ab), { type: 'array', bookSheets: true }).SheetNames || []; };
window.cueImport = async function (ab, year) {
  const r = await cueLegacyImport(ab, year);
  const bad = r.cmp.filter(x => x.bad.length);
  return JSON.parse(JSON.stringify({ ym: r.ym, ws: r.ws, notes: r.notes, fixed: r.fixed, unkItems: r.unkItems, unkChs: r.unkChs, cmpN: r.cmp.length, cmpBad: bad.length,
    stats: { g: r.stats.g, c: r.stats.c, grp: r.stats.grp, eq: r.stats.eq, budget: r.stats.budget, value: r.stats.value, bonus: r.stats.bonus, err: r.stats.err, items: r.stats.items } }));
};
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    try { if (window.__REPORT__ && window.__CUE_TAB__) window.cueGo(window.__CUE_TAB__); } catch (e) { }
    try { if (!window.__CUE_POP__ && parent !== window && parent.cueFrameReady) parent.cueFrameReady(window, !!window.__CUE_IMP__); } catch (e) { }
    /* v170 — 계획 GRP(예산 ÷ 목표 CPRP × 초수 환산) · eq.GRP 를 대시보드에 알려 준다(전체 캠페인 표) */
    try { if (window.__REPORT__ && !window.__CUE_POP__ && parent.cueFrameStats) { var A = aggCells(M.cells); parent.cueFrameStats({ grp: A.grp, eq: A.eq, budget: A.budget }); } } catch (e) { }
  }, 0);
});

/* 큐시트 캘린더 — 채널 이름을 같은 너비 칸에 맞춘다(v168). 긴 이름은 줄이되 서로 다른 채널이 같은 글자가 되지 않게 한다. 전체 이름은 마우스를 올리면 나온다. */
var CUE_CH_AB = { 'tvN Show': 'tvN SH', 'tvN Drama': 'tvN DR', 'tvN Story': 'tvN ST', 'tvN SPORTS': 'tvN SP',
  'JTBC GOLF&SPORTS': 'JTBC GS', 'JTBC Golf': 'JTBC GF', 'ENA Drama': 'ENA DR', 'ENA Play': 'ENA PL',
  'KBS Drama': 'KBS DR', 'KBSN스포츠': 'KBSN SP', 'KBS Sports': 'KBS SP', 'MBC every1': 'MBC ev1', 'MBC드라마넷': 'MBC DN', 'MBC Drama': 'MBC DR', 'MBC SPORTS+': 'MBC SP+',
  'SBS Plus': 'SBS PL', 'SBS Golf': 'SBS GF', 'SBS FunE': 'SBS FE', 'SBS Sports': 'SBS SP',
  'DRAMAcube': 'D.cube', 'Discovery': 'Discov', 'OCN Movies': 'OCN MV', 'SANDBOX+': 'SANDBX+', 'SPOTV PRIME,PRIME2,PRIME+': 'SPO PRM', 'iHQ drama': 'iHQ DR', 'iHQ show': 'iHQ SH' };
var CUE_CH_USED = {};
function cueChAbbr(n) {
  if (CUE_CH_AB[n]) return CUE_CH_AB[n];
  var w = 0, i; for (i = 0; i < n.length; i++) w += n.charCodeAt(i) > 0x2e80 ? 2 : 1;
  if (w <= 7) return n;
  var p = n.split(/[\s,&]+/).filter(Boolean), head = p[0].slice(0, 4), tail = (p[1] || p[0].slice(4)), a, k = 2, taken = {};
  Object.keys(CUE_CH_AB).forEach(function (x) { taken[CUE_CH_AB[x]] = x; }); Object.keys(CUE_CH_USED).forEach(function (x) { taken[CUE_CH_USED[x]] = x; });
  do { a = head + ' ' + tail.slice(0, k).toUpperCase(); k++; } while (taken[a] && taken[a] !== n && k <= tail.length + 1);
  CUE_CH_USED[n] = a; CUE_CH_AB[n] = a; return a;
}
/* 품목 약칭(v169) — 기본은 앞 두 글자. 같은 약칭이 둘이면 뒤 낱말의 두 글자('아이콘 얼음' → '얼음') */
var CUE_IT_AB = { '아이콘 얼음': '얼음' }, CUE_IT_DONE = false;
function cueItemAbbr(nm) {
  if (!CUE_IT_DONE) { CUE_IT_DONE = true; try { var seen = {}; Array.from(M.MS.items.keys()).forEach(function (k) {
    var a = CUE_IT_AB[k] || Array.from(k.replace(/\s+/g, '')).slice(0, 2).join('');
    if (seen[a] && !CUE_IT_AB[k]) { var w = k.trim().split(/\s+/); a = Array.from(w[w.length - 1]).slice(0, 2).join(''); if (seen[a]) a = Array.from(k.replace(/\s+/g, '')).slice(-2).join(''); }
    seen[a] = k; CUE_IT_AB[k] = a; }); } catch (e) { CUE_IT_DONE = false; } }
  return CUE_IT_AB[nm];
}
var CUE_CM_AB = { '전후CM': '전후' };
function cueCalFix(root) {
  (root || document).querySelectorAll('.cale:not([data-ab])').forEach(function (row) {
    row.setAttribute('data-ab', '1');
    var c = row.querySelector('.c'); if (c) { var n = c.textContent, a = cueChAbbr(n); if (a !== n) c.textContent = a; }
    var ic = row.querySelector('.ic'); if (ic) { var nm = (row.getAttribute('title') || '').split(' · ')[2], b = nm && cueItemAbbr(nm); if (b && b !== ic.textContent) ic.textContent = b; }
    var m = row.querySelector('.m'); if (m && CUE_CM_AB[m.textContent]) m.textContent = CUE_CM_AB[m.textContent];
  });
}
/* v188 — 캘린더를 그리자마자 같은 차례에 약칭을 넣는다.
   예전에는 30ms 뒤에 2,000줄의 글자를 바꿔서 달력 전체를 한 번 더 배치하고 다시 칠했다(여는 데 걸리는 시간의 큰 몫) */
function renderCal(root) { var x = renderCal0(root); try { cueCalFix(root); } catch (e) { } try { cuePopFit(); } catch (e) { } return x; }
window.addEventListener('DOMContentLoaded', function () {
  var v = document.getElementById('view') || document.body, t = 0;
  /* 혹시 다른 길로 그려진 줄이 있으면 그때만 고친다(없으면 아무 일도 하지 않는다) */
  new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; if (v.querySelector('.cale:not([data-ab])')) cueCalFix(v); }, 30); }).observe(v, { childList: true, subtree: true });
});

/* ===== v170 — 대시보드 안에서는 틀 높이 = 내용 높이(틀 안 세로 스크롤 없음 → 이중 스크롤 없음) ===== */
var CUE_EMB = false; try { CUE_EMB = parent !== window && !!window.__REPORT__ && !window.__CUE_POP__; } catch (e) { }
function cueTellH() {
  if (!CUE_EMB) return; var m = document.querySelector('main') || document.body;
  var h = Math.ceil(m.getBoundingClientRect().bottom + (window.scrollY || 0)) + 4;
  try { parent.cueFrameH && parent.cueFrameH(h); } catch (e) { }
}
/* 요약 = 큐시트 요약 + 당월 소재 */
function renderSummary(root) {
  if (!CUE_EMB || root.classList.contains('cue-part')) return renderSummary0(root);
  var a = root.querySelector(':scope>.cue-part.s0'), b = root.querySelector(':scope>.cue-part.s1');
  if (!a) { root.innerHTML = '<div class="cue-part s0"></div><h3 class="cue-sec">당월 소재</h3><div class="cue-part s1"></div>'; a = root.querySelector('.s0'); b = root.querySelector('.s1'); }
  renderSummary0(a); try { renderCreView(b); } catch (e) { }
}
/* 표 머리 고정 — 틀이 스크롤되지 않으므로 대시보드 스크롤 위치를 받아 머리줄을 내려 붙인다 */
/* v190 — 전체 큐시트(수천 줄)는 보이는 줄만 그린다. 틀 안에서는 스크롤이 일어나지 않아 처음 그린 줄 아래가 비어 보였다
   → 대시보드(부모 창)가 알려 주는 보이는 위치(cueStick 의 off)로 보이는 범위를 정하고, 스크롤할 때마다 다시 그린다 */
var CUE_OFF = 0;
window.cueAllVp = function (wrap) {
  /* v212 — 대시보드 안에서는 모든 줄을 한 번에 그린다(표 하나가 길게 · 이중 스크롤 없음).
     v190 의 '보이는 줄만' 방식은 필터를 바꾸거나 빨리 내리면 위치가 어긋나 줄이 비었다 */
  if (CUE_EMB) return [0, 1e9];
  return null;
  var vh = 900; try { vh = parent.innerHeight || vh; } catch (e) { }
  var top = wrap.getBoundingClientRect().top;          /* 틀 안에서 표가 시작하는 높이 */
  return [Math.max(0, CUE_OFF - top - 40), vh + 80];
};
window.cueStick = function (off) {
  CUE_OFF = off;
  document.querySelectorAll('.pane:not([hidden]) table.calt, .pane:not([hidden]) table.t').forEach(function (tb) {
    var hd = tb.tHead; if (!hd) return; var r = tb.getBoundingClientRect(), d = Math.max(0, Math.min(off - r.top, r.height - hd.offsetHeight - 60));
    if (tb.__d === d) return; tb.__d = d; hd.style.transform = d ? 'translateY(' + Math.round(d) + 'px)' : ''; hd.classList.toggle('stuck', d > 0);
  });
};
/* 캘린더 — 오늘 · 지금 시간대로 가서 3초 강조 */
window.cueCalJump = function (root, smooth) {
  /* v188 — 캘린더를 열 때는 바로 그 자리로(부드럽게 내려가면 지나가는 구간마다 달력을 다시 칠해 버벅인다). '오늘로' 단추만 부드럽게 */
  setTimeout(function () {
    var td = root.querySelector('#cal-td-today'); if (!td) return; var now = td.querySelector('[data-now]') || td;
    try { cueTellH(); } catch (e) { }
    /* v209 — 팝업(캘린더로 보기)에서는 틀 안에서 그 자리로 */
    if (window.__CUE_POP__) { try { now.scrollIntoView({ block: 'center', inline: 'center', behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { } }
    else try { parent.cueScrollTo && parent.cueScrollTo(now.getBoundingClientRect().top, td.getBoundingClientRect().left + td.offsetWidth / 2, !!smooth); } catch (e) { }
    [td, now].forEach(function (x) { x.classList.remove('cue-flash'); void x.offsetWidth; x.classList.add('cue-flash'); });
    setTimeout(function () { [td, now].forEach(function (x) { x.classList.remove('cue-flash'); }); }, 3200);
  }, smooth ? 0 : 150);
};
/* 캘린더 폭 — 프로그램 이름 칸은 화면 폭에 따라 늘고 줄되 한글 8자까지만 줄인다(그 아래로는 가로 스크롤) */
window.addEventListener('DOMContentLoaded', function () {
  if (!CUE_EMB) return;
  try { new ResizeObserver(cueTellH).observe(document.querySelector('main') || document.body); } catch (e) { }
  var v = document.getElementById('view') || document.body, t = 0;
  new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; cueTellH(); }, 60); }).observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', cueTellH); setTimeout(cueTellH, 300); setTimeout(cueTellH, 1200);
});

/* ===== v172 ===== */
/* 케이블 큐시트 — PP 만 고르고 채널은 '전체'면 채널별 표 여러 개 대신 표 하나(채널 열을 앞에 둔다) */
function renderCueC(root) {
  renderCueC0(root);
  try { if (CUE_EMB && UI.cabCh === 'all') cueCabMerge(root); } catch (e) { }
}
function cueCabMerge(root) {
  var secs = Array.prototype.filter.call(root.querySelectorAll('section.card'), function (s) { return s.querySelector('table.cue.qm[data-ch]'); });
  if (secs.length < 2) return;
  var first = secs[0], b0 = first.querySelector('.bd table.t'), q0 = first.querySelector('table.cue.qm');
  var chCell = function (name, n, sub) { var td = document.createElement('td'); td.className = 'cuech'; td.rowSpan = n; td.innerHTML = '<b></b>' + (sub ? '<small></small>' : ''); td.firstChild.textContent = name; if (sub) td.lastChild.textContent = sub; return td; };
  var th = function (t) { var x = document.createElement('th'); x.textContent = t; x.className = 'cuechh'; return x; };
  b0.tHead.rows[0].insertBefore(th('채널'), b0.tHead.rows[0].firstChild);
  q0.tHead.rows[0].insertBefore(th('채널'), q0.tHead.rows[0].firstChild);
  var tot = 0;
  secs.forEach(function (sec, i) {
    var name = sec.querySelector('.hd h3').textContent, sub = (sec.querySelector('.hd .sub') || {}).textContent || '';
    var cnt = (/([\d,]+)회/.exec(sub) || [])[1] || ''; tot += +(cnt.replace(/,/g, '')) || 0;
    var br = Array.prototype.slice.call(sec.querySelector('.bd table.t').tBodies[0].rows), qr = Array.prototype.slice.call(sec.querySelector('table.cue.qm').tBodies[0].rows);
    if (br.length) br[0].insertBefore(chCell(name, br.length), br[0].firstChild);
    if (qr.length) { qr[0].insertBefore(chCell(name, qr.length, cnt ? cnt + '회' : ''), qr[0].firstChild); qr[0].classList.add('chtop'); }
    if (br.length) br[0].classList.add('chtop');
    if (i) { br.forEach(function (r) { b0.tBodies[0].appendChild(r); }); qr.forEach(function (r) { q0.tBodies[0].appendChild(r); }); sec.remove(); }
  });
  b0.classList.add('merged'); q0.classList.add('merged'); q0.removeAttribute('data-ch');
  first.querySelector('.hd h3').textContent = UI.cabPP + ' 전체';
  var sb = first.querySelector('.hd .sub'); if (sb) sb.textContent = secs.length + '개 채널 · ' + tot.toLocaleString() + '회';
}
/* 주차별 송출 수 — 일별 막대를 누르면 그날 품목 비중을 도넛으로 */
window.cueDayDonut = function (pane, o) {
  var old = pane.querySelector('.cue-dd'); if (old) old.remove();
  var R = 78, r = 46, C = 2 * Math.PI * ((R + r) / 2), W = R - r, acc = 0, tot = o.total || 1;
  var arcs = o.rows.map(function (x, i) { var len = x.v / tot * C, s = '<circle cx="100" cy="100" r="' + ((R + r) / 2) + '" fill="none" stroke="' + x.c + '" stroke-width="' + W + '" stroke-dasharray="' + Math.max(0, len - 1.5).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" style="--d:' + (i * 60) + 'ms"/>'; acc += len; return s; }).join('');
  var leg = o.rows.slice().sort(function (a, b) { return b.v - a.v; }).map(function (x) { return '<li><i style="background:' + x.c + '"></i><span></span><b>' + x.v.toLocaleString() + '회</b><em>' + (x.v / tot * 100).toFixed(1) + '%</em></li>'; }).join('');
  var el = document.createElement('div'); el.className = 'cue-dd'; el.style.setProperty('--ox', Math.round(o.x) + 'px');
  el.innerHTML = '<div class="in"><span class="pill"></span><button type="button" class="cl" aria-label="닫기">✕ 닫기 <kbd>Esc</kbd></button>'
    + '<svg viewBox="0 0 200 200" width="200" height="200"><g transform="rotate(-90 100 100)">' + arcs + '</g><text x="100" y="97" text-anchor="middle" class="t1">' + tot.toLocaleString() + '회</text><text x="100" y="116" text-anchor="middle" class="t2">품목 비중</text></svg><ul>' + leg + '</ul></div>';
  el.querySelector('.pill').textContent = o.title;
  var names = o.rows.slice().sort(function (a, b) { return b.v - a.v; }); el.querySelectorAll('li span').forEach(function (s, i) { s.textContent = names[i].n; });
  var close = function () { el.remove(); document.removeEventListener('keydown', key); };
  var key = function (e) { if (e.key === 'Escape') close(); };
  el.onclick = function (e) { if (e.target === el || e.target.closest('.cl')) close(); };
  document.addEventListener('keydown', key); pane.appendChild(el);
};

/* v210 — 대시보드 품목 선택 줄 → 전체 큐시트 '품목' 필터 */
window.__CUE_NONE = false;
window.cueSetItems = function (list, none) {
  try { var f = cueAllUI(), want = list && list.length ? new Set(list) : null, cur = f.item;
    var same = !!none === window.__CUE_NONE && ((!want && !cur) || (want && cur && want.size === cur.size && [...want].every(function (x) { return cur.has(x); })));
    if (same) return; f.item = want; f.scroll = 0; window.__CUE_NONE = !!none;
    if (App.tab === 'cueall') { var r = document.querySelector('.pane:not([hidden])'); if (r) renderCueAll(r); } } catch (e) { }
};

/* v212 — 고른 품목이 이 달 큐시트에 없으면 빈 표(전체로 돌아가지 않게) */
(function () { var o = cueAllFilter; cueAllFilter = function (rows) { return window.__CUE_NONE ? [] : o(rows); }; })();
/* v212 — 캘린더 팝업: 가로 스크롤 없이 팝업 폭에 맞춘다 */
function cuePopFit() {
  if (!window.__CUE_POP__) return; var d = document.documentElement, b = document.body; d.style.zoom = '';
  /* 세로 스크롤바 폭까지 빼고, 줄인 뒤 다시 재서 한두 번 더 맞춘다 */
  var z = 1;
  for (var k = 0; k < 3; k++) { var w = Math.max(d.scrollWidth, b.scrollWidth), vw = d.clientWidth - 6; if (w <= vw + 1) break; z = z * vw / w; d.style.zoom = z.toFixed(4); }
}
window.addEventListener('resize', function () { clearTimeout(window.__pf); window.__pf = setTimeout(cuePopFit, 120); });
window.addEventListener('DOMContentLoaded', function () { if (window.__CUE_POP__) { setTimeout(cuePopFit, 200); setTimeout(cuePopFit, 900); } });
