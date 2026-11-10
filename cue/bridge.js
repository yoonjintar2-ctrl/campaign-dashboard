/* 대시보드(부모 창) ↔ 큐시트 틀 연결 — 보기는 REPORT 모드(읽기 전용), 넣기는 ?imp=1 */
window.cueGo = function (t) { try { if (App.tabAllowed(t)) App.go(t); } catch (e) { } };
window.cueSheetNames = function (ab) { return XLSX.read(new Uint8Array(ab), { type: 'array', bookSheets: true }).SheetNames || []; };
window.cueImport = async function (ab, year) {
  const r = await cueLegacyImport(ab, year);
  const bad = r.cmp.filter(x => x.bad.length);
  return JSON.parse(JSON.stringify({ ym: r.ym, ws: r.ws, notes: r.notes, fixed: r.fixed, unkItems: r.unkItems, unkChs: r.unkChs, cmpN: r.cmp.length, cmpBad: bad.length,
    stats: { g: r.stats.g, c: r.stats.c, budget: r.stats.budget, value: r.stats.value, bonus: r.stats.bonus, err: r.stats.err, items: r.stats.items } }));
};
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    try { if (window.__REPORT__ && window.__CUE_TAB__) window.cueGo(window.__CUE_TAB__); } catch (e) { }
    try { if (parent !== window && parent.cueFrameReady) parent.cueFrameReady(window, !!window.__CUE_IMP__); } catch (e) { }
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
function cueCalFix(root) {
  (root || document).querySelectorAll('.cale .c:not([data-ab])').forEach(function (e) { var n = e.textContent; e.setAttribute('data-ab', '1'); var a = cueChAbbr(n); if (a !== n) e.textContent = a; });
}
window.addEventListener('DOMContentLoaded', function () {
  var v = document.getElementById('view') || document.body, t = 0;
  new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; cueCalFix(v); }, 30); }).observe(v, { childList: true, subtree: true });
});
