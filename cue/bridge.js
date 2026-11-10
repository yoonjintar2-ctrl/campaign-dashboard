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
