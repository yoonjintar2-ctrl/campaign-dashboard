#!/usr/bin/env python3
"""src/ 의 조각들을 이어붙여 단일 HTML 을 만든다.

    python tools/build.py            -> index.html
    python tools/build.py dist/index.html
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

PARTS = ['01-head.html', '02-body.html', '03-data.js', '04-builder.js',
         '05-chart.js', '06-creative.js', '07-input.js', '08-setup.js', '09-cloud.js', '10-xlsx.js', '11-comment.js', '12-export.js']


def build(dest):
    chunks = [open(os.path.join(SRC, p), encoding='utf-8').read() for p in PARTS]
    html = ''.join(chunks) + "\n</script>\n</body>\n</html>\n"

    # SEP 은 소스에 실제 제어문자(U+0001)로 들어 있다. 산출물에는 이스케이프로 남긴다.
    new = "const SEP='" + chr(92) + "u0001';"
    html = re.sub(r"const SEP='.{0,2}';", lambda m: new, html, count=1)
    assert new in html, 'SEP 치환 실패 — src/03-data.js 의 SEP 선언을 확인하세요.'

    d = os.path.dirname(dest)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(html)
    print('built ->', dest, f'({len(html):,} bytes)')


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
    build(out)
