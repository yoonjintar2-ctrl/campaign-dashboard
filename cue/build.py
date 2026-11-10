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
PINK = {'#e0005a': '#2a6fba', '#fceef4': '#e9f1fb', '#c00045': '#1f5c9e', '#fffafc': '#f5f9fe'}
def blue(t):
    return re.sub('|'.join(PINK), lambda m: PINK[m.group(0).lower()], t, flags=re.I)
app_js = '\n'.join(blue(tint(read(p)) if p.name in ('07-views.js', '10-charts.js', '16-cueall.js', '18-cal.js') else read(p)) for p in sorted((ROOT / 'src').glob('*.js')))
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
