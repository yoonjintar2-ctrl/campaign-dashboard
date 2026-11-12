#!/usr/bin/env python3
"""TV 큐시트 틀(cue.html) 빌드 — cue/src(큐시트 17차 그대로) + 대시보드 연결 · 디자인 덮어쓰기.
    python3 cue/build.py  ->  cue.html (저장소 루트)
계산 규칙(src/04-model.js 등)은 고치지 않는다. 디자인은 embed.css, 연결은 boot.js · bridge.js."""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).parent
def read(p): return pathlib.Path(p).read_text(encoding='utf-8')
def safe(js, name):
    if re.search(r'</script', js, re.I): sys.exit(f'{name} 안에 </script 문자열이 있어요')
    return js
import colorsys
def tint(css):
    return css   # v172 — 표 머리 · 소계 · 그래프 바탕은 무채색 그대로(큐시트 원본 회색). 강조만 파랑(PINK 맵)
def tint_old(css):
    """무채색 회색을 대시보드의 회청 톤으로 — 밝기는 그대로, 색상만 살짝 (큐시트 원본 CSS 는 고치지 않는다)"""
    def f(m):
        h = m.group(1)
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        if max(r, g, b) - min(r, g, b) > 0.04 or (r, g, b) == (1, 1, 1): return m.group(0)
        l = (max(r, g, b) + min(r, g, b)) / 2
        sat = 0.20 if l < 0.4 else 0.14 if l < 0.75 else 0.24
        r, g, b = colorsys.hls_to_rgb(213 / 360, l, sat)
        return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
    return re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])', f, css)
# 분홍 강조(본방 · 중CM · 오늘) → 대시보드 강조색에 맞춘 푸른 계열 (v168)
PINK = {'#e0005a': '#2a6fba', '#fceef4': '#e9f1fb', '#c00045': '#1f5c9e', '#fffafc': '#f5f9fe', '#f9dde9': '#d5e5f7', '#fbf4f6': '#eef4fb', '#b0607e': '#2a6fba', '#5a2b3a': '#2b2b2b'}
def blue(t):
    return re.sub('|'.join(PINK), lambda m: PINK[m.group(0).lower()], t, flags=re.I)
# v169 — 큐시트 요약 도넛을 대시보드 도넛 톤으로 (조각 흰 테두리 · 매체 바깥 띠 없앰, 회청 · 파랑 계열 색)
PATCH = [
  ("ctx.fill(p); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke(p); }", "ctx.fill(p); }"),
  ("if (nb && st.sweep > 0.98) for (const e of grpEnds) {", "if (false) for (const e of grpEnds) {"),
  ("const DN_BASE = '#3a3a3c';", "const DN_BASE = '#3d4046';"),
  ("const MIXC = { s15: '#d99a3d', s30: '#13958a', etc: '#cbcbcb', wd: '#7563a8', we: '#d97f74' };", "const MIXC = { s15: '#b9bcc1', s30: '#4a4e55', etc: '#dcdee1', wd: '#4a4e55', we: '#b9bcc1' };"),
  # v170 — 요약 화면 아래에 당월 소재를 잇는다(bridge.js 의 renderSummary 가 감싼다) · 캘린더 '지금' 위치로는 대시보드(부모 창)를 움직인다
  ("function renderSummary(root) {", "function renderSummary0(root) {"),
  # v172 — 케이블: PP 전체를 고르면 채널별 표 대신 표 하나(bridge.js 가 합친다) · 일별 막대를 누르면 그날 품목 비중 도넛
  ("function renderCueC(root) {", "function renderCueC0(root) {"),
  # v188 — 캘린더: 그린 직후(화면에 나가기 전)에 약칭을 넣는다(bridge.js 의 renderCal 이 감싼다)
  ("function renderCal(root) {", "function renderCal0(root) {"),
  ("cv.addEventListener('click', e => { const rc = cv.getBoundingClientRect(); const d = Math.floor((e.clientX - rc.left - left) / bw) + 1; if (d >= 1 && d <= days) {",
   "cv.addEventListener('click', e => { const rc = cv.getBoundingClientRect(); const d = Math.floor((e.clientX - rc.left - left) / bw) + 1; if (window.cueDayDonut && e.clientY - rc.top >= topP && d >= 1 && d <= days && tot[d] > 0) { tip.style.display = 'none'; window.cueDayDonut(pane, { title: `${ym.m}/${d} (${dowOf(ym.y, ym.m, d)})`, total: tot[d], x: left + (d - .5) * bw, rows: order.filter(k => byDay[d].get(k)).map(k => ({ n: k, v: byDay[d].get(k), c: itemColor(k) })) }); return; } if (d >= 1 && d <= days) {"),
  ("const goToday = smooth => { const td", "const goToday = smooth => { if (window.cueCalJump) return window.cueCalJump(root, smooth); const td"),
  ("const SECC = { 10: '#8a9a3a', 15: '#d99a3d', 20: '#4f7fbf', 30: '#13958a', 40: '#a0702a', 45: '#c25b8f', 60: '#6d6d6d' };", "const SECC = { 10: '#d6d8db', 15: '#b9bcc1', 20: '#8b9097', 30: '#4a4e55', 40: '#2f3237', 45: '#9a9ea4', 60: '#666a70' };"),
]
USED = set()
def patch(js):
    for a, b in PATCH:
        if a in js: js = js.replace(a, b); USED.add(a)
    return js
app_js = ('\n'.join(blue(tint(patch(read(p))) if p.name in ('07-views.js', '10-charts.js', '16-cueall.js', '18-cal.js') else patch(read(p))) for p in sorted((ROOT / 'src').glob('*.js'))))
if len(USED) != len(PATCH): sys.exit('패치 대상이 없어요: ' + str([a[:40] for a, _ in PATCH if a not in USED]))
extra = '\n'.join(read(ROOT / p) for p in ['tools/legacy.js', 'tools/import.js', 'bridge.js'])
parts = ['<!doctype html><html lang="ko"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">',
  '<title>TV 큐시트</title>',
  f'<style id="css-app">{blue(tint(read(ROOT / "src/app.css")))}</style>',
  f'<style id="css-embed">{read(ROOT / "embed.css")}</style>',
  f'<script id="cue-boot">{safe(read(ROOT / "boot.js"), "boot")}</script>',
  f'<script id="lib-chart">{safe(read(ROOT / "lib/chart.umd.js"), "chart")}</script>',
  f'<script id="lib-xlsx">{safe(read(ROOT / "lib/xlsx.bundle.js"), "xlsx")}</script>',
  f'<script id="app-js">{safe(app_js, "app")}</script>',
  f'<script id="cue-extra">{safe(extra, "extra")}</script>',
  '</head><body><div id="root"></div></body></html>']
out = ROOT.parent / 'cue.html'
out.write_text('\n'.join(parts), encoding='utf-8')
print('built ->', out, f'{out.stat().st_size/1024/1024:.2f} MB')
