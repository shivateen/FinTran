#!/usr/bin/env python3
"""
CloseIQ build script
Assembles public/index.html from src/ parts.
Run:  python scripts/build.py
"""
import json, os, pathlib, re, sys, textwrap
from datetime import datetime

ROOT   = pathlib.Path(__file__).parent.parent
SRC    = ROOT / 'src'
OUT    = ROOT / 'public'
SCRIPT = pathlib.Path(__file__).parent

def read(p): return pathlib.Path(p).read_text(encoding='utf-8')

def main():
    print("CloseIQ build starting…")

    css     = read(SRC / 'css' / 'app.css')
    app_js  = read(SRC / 'js'  / 'app.js')
    data_js = json.dumps(json.loads(read(SRC / 'data' / 'closeiq_data.json')), separators=(',', ':'))
    bundle  = read(SCRIPT / 'pptxgen.bundle.js')
    body_html = read(SRC / 'html' / 'closeiq_body.html')
    emailjs_cdn = '<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>'

    # Inject data into app.js
    app_js = app_js.replace('__CLOSEIQ_DATA__', data_js)

    # Build the HTML
    favicon = (
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Crect width='32' height='32' rx='7' fill='%23F08C1E'/%3E"
        "%3Ctext x='16' y='22' font-family='Poppins,Arial' font-size='17' font-weight='700' "
        "fill='white' text-anchor='middle'%3ET%3C/text%3E%3C/svg%3E"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CloseIQ · Autonomous Month-End Close</title>
<link rel="icon" href="{favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
{emailjs_cdn}
<style>
{css}
</style>
</head>
<body>
{body_html}
<!-- PptxGenJS 4.0.1 — inlined, no CDN dependency -->
<script>
{bundle}
</script>
<!-- CloseIQ app — built {datetime.now().strftime('%Y-%m-%d %H:%M UTC')} -->
<script>
{app_js}
</script>
</body>
</html>"""

    OUT.mkdir(parents=True, exist_ok=True)
    out_file = OUT / 'index.html'
    out_file.write_text(html, encoding='utf-8')
    size_kb = out_file.stat().st_size // 1024
    print(f"✓ Built public/index.html ({size_kb} KB)")
    print(f"  CSS:    {len(css)//1024} KB")
    print(f"  App JS: {len(app_js)//1024} KB")
    print(f"  Bundle: {len(bundle)//1024} KB")
    print(f"  Data:   {len(data_js)//1024} KB")

if __name__ == '__main__':
    main()
