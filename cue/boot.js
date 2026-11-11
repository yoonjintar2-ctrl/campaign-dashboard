(function () {
  var q = new URLSearchParams(location.search), qh = new URLSearchParams(String(location.hash || '').replace(/^#/, '')); /* v184 — 탭·열쇠는 # 뒤로(주소가 같아야 브라우저가 cue.html 을 다시 받지 않는다) */
  var qget = q.get.bind(q); q.get = function (k) { var v = qh.get(k); return v != null ? v : qget(k); }; window.__CUE_IMP__ = q.get('imp') === '1';
  var d = null; try { d = !window.__CUE_IMP__ && parent !== window && parent.cueFrameData && parent.cueFrameData(); } catch (e) { }
  /* 품목 색 — 큐시트 엑셀의 색상(hue)은 그대로, 톤만 대시보드 미디어믹스 시트처럼 차분하게 (채도 ↓ · 명도는 가운데로) */
  function calm(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return hex;
    var n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { var dd = mx - mn; s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h /= 6; }
    s = Math.min(s * .6, .44); l = Math.max(.36, Math.min(.74, l));
    var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    var hx = function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }; return '#' + hx(f(h + 1 / 3)) + hx(f(h)) + hx(f(h - 1 / 3));
  }
  try { if (d && d.ws && d.ws.sheets && Array.isArray(d.ws.sheets['품목'])) d.ws.sheets['품목'].forEach(function (r) { if (r && r[3]) r[3] = calm(r[3]); }); } catch (e) { }
  /* 아이콘 얼음 = 아이콘3 와 같은 계열의 더 연한 색 (v169) */
  try { if (d && d.ws) { var rows = d.ws.sheets['품목'], a3 = rows.find(function (r) { return r && r[0] === '아이콘3'; }), ic = rows.find(function (r) { return r && r[0] === '아이콘 얼음'; });
    if (ic) { var base = (a3 && a3[3]) || '#4f73a3', n = parseInt(base.slice(1), 16), mix = function (v) { return Math.round(v + (255 - v) * .42).toString(16).padStart(2, '0'); };
      ic[3] = '#' + mix(n >> 16 & 255) + mix(n >> 8 & 255) + mix(n & 255); } } } catch (e) { }
  if (d && d.ws) { window.__REPORT__ = { ws: d.ws, title: d.title || '', at: d.at || Date.now() }; window.__CUE_TAB__ = q.get('t') || 'summary'; }
  document.documentElement.classList.add('embed');
  try { if (parent !== window) document.documentElement.style.setProperty('--pvh', Math.max(480, parent.innerHeight - 170) + 'px'); } catch (e) { }
  /* 대시보드 테마 색을 그대로 받는다 */
  try { if (parent !== window) { var cs = parent.getComputedStyle(parent.document.documentElement), st = document.documentElement.style;
    ['plane', 'plane2', 'surface', 'ink', 'ink2', 'muted', 'sec', 'line', 'line2', 'gline', 'cell', 'acc', 'acc-d', 'acc-lt', 'acc-soft', 'acc-soft2', 'hdr', 'hdr2', 'tot', 'hdr-sub', 'tot-sub', 'sub0', 'sub1', 'sub2', 'sub3', 'b1', 'b2', 'b3', 'b4', 'b5'].forEach(function (k) { var v = cs.getPropertyValue('--' + k).trim(); if (v) st.setProperty('--p-' + k, v); });
    var th = parent.document.documentElement.getAttribute('data-theme'); if (th) document.documentElement.setAttribute('data-ptheme', th); } } catch (e) { }
})();
