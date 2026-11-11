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
window.addEventListener('DOMContentLoaded', function () {
  var v = document.getElementById('view') || document.body, t = 0;
  new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; cueCalFix(v); }, 30); }).observe(v, { childList: true, subtree: true });
});
