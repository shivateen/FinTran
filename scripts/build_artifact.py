#!/usr/bin/env python3
"""
Build a SINGLE-FILE consolidated artifact (no iframes, no external files).
Each app is mounted in its own Shadow DOM root for full CSS+JS isolation.

Run:  python scripts/build_artifact.py
Out:  public/artifact.html  (one self-contained file)
"""
import json, pathlib, re
from datetime import datetime

ROOT   = pathlib.Path(__file__).parent.parent
SRC    = ROOT / 'src'
APPS   = SRC / 'apps'
OUT    = ROOT / 'public'
SCRIPT = pathlib.Path(__file__).parent

def read(p):  return pathlib.Path(p).read_text(encoding='utf-8')
def write(p, s): pathlib.Path(p).write_text(s, encoding='utf-8')


def split_html(html):
    """Return (head_styles, body_html, scripts[list]) from a full HTML doc."""
    # collect <style> blocks
    styles = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))
    # collect <script> blocks that have inline content (not src=)
    scripts = []
    for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S):
        if m.group(1).strip():
            scripts.append(m.group(1))
    # external scripts (src=) — keep their URLs
    ext = re.findall(r'<script[^>]*\bsrc="([^"]+)"[^>]*>', html)
    # body content: strip out <script>, <style>, head
    body_m = re.search(r'<body[^>]*>(.*?)</body>', html, re.S)
    body = body_m.group(1) if body_m else html
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    body = re.sub(r'<style.*?</style>', '', body, flags=re.S)
    # head links (fonts, icons) — collect <link> tags
    links = re.findall(r'<link[^>]+>', html)
    return styles, body, scripts, ext, links


def build_closeiq_doc():
    """Reconstruct the CloseIQ full HTML (same as build.py) so we can split it."""
    css     = read(SRC / 'css' / 'app.css')
    app_js  = read(SRC / 'js'  / 'app.js')
    data_js = json.dumps(json.loads(read(SRC / 'data' / 'closeiq_data.json')), separators=(',', ':'))
    bundle  = read(SCRIPT / 'pptxgen.bundle.js')
    app_js  = app_js.replace('__CLOSEIQ_DATA__', data_js)
    return css, [bundle, app_js]


def main():
    print("Building single-file artifact (Shadow DOM isolation)…")

    # ---- gather each app's parts ----
    ev_html  = read(APPS / 'evolution.html')
    cc_html  = read(APPS / 'command-center.html')

    ev_styles, ev_body, ev_scripts, ev_ext, ev_links = split_html(ev_html)
    cc_styles, cc_body, cc_scripts, cc_ext, cc_links = split_html(cc_html)
    ciq_css, ciq_scripts = build_closeiq_doc()
    # CloseIQ body is the markup the app expects; pull from a fresh built doc
    ciq_full = read(OUT / 'app-closeiq.html') if (OUT / 'app-closeiq.html').exists() else None
    if ciq_full:
        _, ciq_body, _, _, _ = split_html(ciq_full)
    else:
        ciq_body = '<div id="app"></div>'  # app builds its own DOM

    # Inline onclick="go(...)" handlers (both in the static body AND generated at
    # runtime by the app's JS) resolve in GLOBAL scope. The app's functions live in
    # window.__app_closeiq (scoped to its shadow root). We install global shim
    # functions (see GLOBAL_SHIMS in the shell script) that forward to the active
    # app's namespace — so no call-site rewriting is needed.



    # all external script URLs we need at top level (dedup)
    all_ext = []
    for u in ev_ext + cc_ext + ['https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js']:
        if u not in all_ext: all_ext.append(u)
    # all head links (fonts / icon CSS) dedup
    all_links = []
    for l in ev_links + cc_links:
        if 'stylesheet' in l and l not in all_links:
            all_links.append(l)
    # ensure fonts present
    if not any('fonts.googleapis' in l for l in all_links):
        all_links.append('<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">')

    def js_string(s):
        """Encode a JS source string as a safe template-literal-free string via base64."""
        import base64
        b = base64.b64encode(s.encode('utf-8')).decode('ascii')
        return b

    # Encode all parts as base64 to avoid any escaping nightmares
    import base64
    def enc(s): return base64.b64encode(s.encode('utf-8')).decode('ascii')

    payload = {
        'evolution': {
            'styles': enc(ev_styles), 'body': enc(ev_body),
            'scripts': [enc(s) for s in ev_scripts],
        },
        'command': {
            'styles': enc(cc_styles), 'body': enc(cc_body),
            'scripts': [enc(s) for s in cc_scripts],
        },
        'closeiq': {
            'styles': enc(ciq_css), 'body': enc(ciq_body),
            'scripts': [enc(s) for s in ciq_scripts],
        },
    }
    payload_json = json.dumps(payload)

    links_html = '\n'.join(all_links)
    ext_html   = '\n'.join(f'<script src="{u}"></script>' for u in all_ext)

    shell_css = read(APPS / 'shell.html')
    shell_css = re.search(r'<style>(.*?)</style>', shell_css, re.S).group(1)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FinTran × Tiger — Finance AI Platform</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23F08C1E'/%3E%3Ctext x='16' y='22' font-family='Arial' font-size='17' font-weight='700' fill='white' text-anchor='middle'%3ET%3C/text%3E%3C/svg%3E">
{links_html}
{ext_html}
<style>
{shell_css}
/* host containers for the shadow roots */
.app-host{{position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;transition:opacity .35s;overflow:auto;background:#fff}}
.app-host.active{{opacity:1;pointer-events:auto;z-index:5}}
</style>
</head>
<body>

<div class="boot" id="boot">
  <div class="logo">T</div>
  <div class="t">FinTran × Tiger — Finance AI Platform</div>
  <div class="s" id="bootMsg">initialising…</div>
</div>

<div class="switcher" id="switcher">
  <div class="brand"><span class="logo">T</span><div>FinTran × Tiger<div class="by">Finance AI Platform</div></div></div>
  <div class="tabs">
    <button class="sw-tab" data-app="evolution"><span class="n">1</span>Vision</button>
    <button class="sw-tab" data-app="command"><span class="n">2</span>Command Center</button>
    <button class="sw-tab" data-app="closeiq"><span class="n">3</span>CloseIQ · Month-End Close</button>
  </div>
  <div class="spacer"></div>
  <div class="hint">1 / 2 / 3 to switch</div>
</div>

<div class="reveal-tab hide" id="revealTab" title="Show app switcher">
  <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
</div>

<div class="stage" id="stage">
  <div class="app-host" id="host-evolution"></div>
  <div class="app-host" id="host-command"></div>
  <div class="app-host" id="host-closeiq"></div>
</div>

<script>
const __PAYLOAD__ = {payload_json};

function b64dec(s){{ return decodeURIComponent(escape(atob(s))); }}

// ---- Mount an app inside a shadow root with a scoped document proxy ----
const __mounted__ = {{}};
function mountApp(key, navTo){{
  if(__mounted__[key]) return;
  __mounted__[key] = true;
  const host = document.getElementById('host-'+key);
  const root = host.attachShadow({{mode:'open'}});
  const P = __PAYLOAD__[key];

  // styles
  const st = document.createElement('style');
  st.textContent = b64dec(P.styles);
  root.appendChild(st);

  // body markup
  const wrap = document.createElement('div');
  wrap.innerHTML = b64dec(P.body);
  root.appendChild(wrap);

  // scoped document proxy: DOM lookups resolve inside the shadow root,
  // everything else passes through to the real document.
  const docProxy = new Proxy(document, {{
    get(target, prop){{
      switch(prop){{
        case 'getElementById':       return id => root.getElementById ? root.getElementById(id) : root.querySelector('#'+CSS.escape(id));
        case 'querySelector':        return sel => root.querySelector(sel);
        case 'querySelectorAll':     return sel => root.querySelectorAll(sel);
        case 'getElementsByClassName': return cls => root.querySelectorAll('.'+cls);
        case 'getElementsByTagName':   return tg => root.querySelectorAll(tg);
        case 'body':                 return wrap;          // app's "body" is its wrapper
        case 'documentElement':      return wrap;
        case 'head':                 return root;
        case 'createElement':        return (...a)=>target.createElement(...a);
        case 'createElementNS':      return (...a)=>target.createElementNS(...a);
        case 'createTextNode':       return (...a)=>target.createTextNode(...a);
        case 'addEventListener':     return (...a)=>target.addEventListener(...a);
        case 'removeEventListener':  return (...a)=>target.removeEventListener(...a);
        default: {{
          const v = target[prop];
          return (typeof v === 'function') ? v.bind(target) : v;
        }}
      }}
    }}
  }});

  // run each script in a closure with the proxied document + a platform bridge.
  // Inline onclick="go(...)" handlers in the body resolve in GLOBAL scope, so we
  // capture each app's top-level functions into window.__app_<key> and rewrite the
  // body handlers to route through it (done at build time + a runtime dispatcher).
  const ns = {{}};
  window['__app_'+key] = ns;
  const platform = {{
    navTo: (a)=>window.__platformGo(a),
    showBar: ()=>window.__platformShowBar(true),
  }};
  P.scripts.forEach((b64, idx)=>{{
    const code = b64dec(b64);
    // After the app code runs, capture all function names it declared by scanning
    // for `function NAME(` and assigning them into ns via an appended export block.
    const fnNames = (code.match(/function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g)||[])
      .map(s=>s.replace(/function\\s+/,'').replace(/\\s*\\($/,''))
      .filter((v,i,a)=>a.indexOf(v)===i);
    const exportBlock = '\\n;try{{var __ns=arguments[2];['
      + fnNames.map(n=>'"'+n+'"').join(',')
      + '].forEach(function(__n){{try{{if(typeof eval(__n)==="function")__ns[__n]=eval(__n);}}catch(e){{}}}});}}catch(e){{}}';
    try {{
      const runner = new Function('document','window','__ns','platform','shadowRoot', code + exportBlock);
      runner(docProxy, window, ns, platform, root);
    }} catch(e){{ console.error('['+key+'] script error:', e); }}
  }});

  // post-mount hook: wire cross-app navigation
  if(key==='evolution'){{
    // CTA → command
    const cta = root.querySelector('a.btn[href*="command"], a.btn[onclick*="command"]') || root.querySelector('#cta a.btn');
    root.querySelectorAll('a.btn').forEach(a=>{{
      if(/command|arrow-right/i.test(a.outerHTML)){{
        a.addEventListener('click', e=>{{ e.preventDefault(); window.__platformGo('command'); }});
      }}
    }});
    // reveal bar on scroll
    host.addEventListener('scroll', ()=>{{ if(host.scrollTop>300) window.__platformShowBar(true); }}, {{passive:true}});
  }}
  if(key==='command'){{
    // inject CloseIQ launcher when controllership page renders
    const tryInject = ()=>{{
      const main = root.getElementById ? root.getElementById('main') : root.querySelector('#main');
      if(!main) return;
      const txt = main.textContent||'';
      if(/Controllership/.test(txt) && /day 7|continuous close|trial-balance/i.test(txt)){{
        if(root.querySelector('#__ciqLauncher')) return;
        const b = document.createElement('div');
        b.id='__ciqLauncher';
        b.style.cssText='margin:14px 0;padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#1C1C1C,#262624);border:1px solid #F08C1E;display:flex;align-items:center;gap:14px;cursor:pointer';
        b.innerHTML='<div style="width:42px;height:42px;border-radius:10px;background:#F08C1E;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:20px;flex:none">T</div>'
          +'<div style="flex:1"><div style="font-size:14px;font-weight:600;color:#fff">CloseIQ — Autonomous Month-End Close <span style="font-size:10px;color:#F5A93E;background:rgba(240,140,30,.16);padding:2px 8px;border-radius:10px;margin-left:6px">WAVE 1 · LIVE</span></div>'
          +'<div style="font-size:12px;color:#B4B2A9;margin-top:3px">Open the full close cockpit — TB scrutiny, variance, intercompany recon, and the Sage assistant. Day 7 &rarr; day 3.</div></div>'
          +'<div style="color:#F5A93E;font-size:13px;font-weight:600;white-space:nowrap">Open CloseIQ &rarr;</div>';
        b.addEventListener('click', ()=>window.__platformGo('closeiq'));
        main.insertBefore(b, main.firstChild && main.firstChild.nextSibling);
      }}
    }};
    const mo = new MutationObserver(()=>setTimeout(tryInject,60));
    const startObs = ()=>{{ const m = root.querySelector('#main'); if(m){{ mo.observe(m,{{childList:true}}); tryInject(); }} else setTimeout(startObs,200); }};
    startObs();
  }}
}}

// ---- platform navigation ----
let __cur__='evolution', __barShown__=false;
function __setBar__(show){{
  __barShown__=show;
  document.getElementById('switcher').classList.toggle('show',show);
  document.getElementById('stage').classList.toggle('with-bar',show);
  document.getElementById('revealTab').classList.toggle('hide',show);
}}
window.__platformShowBar = __setBar__;

// ---- Global shims for inline on* handlers ----
// CloseIQ's markup (static + runtime-generated) uses inline onclick="go(...)" etc.
// These resolve in global scope. We forward them to the currently-active app's
// captured namespace (window.__app_<key>) so they work inside the shadow DOM.
['go','openSage','closeSage','sendSage','toggleMic','setLang','setVoice','connectAI',
 'toggleRail','openAudit','closeDrawer','dismissPing','pingFollow','sendEmailNow',
 'closeEmailModal','emailPack','exportPack','toast'].forEach(function(fn){{
  if(typeof window[fn] === 'undefined'){{
    window[fn] = function(){{
      var ns = window['__app_'+__cur__];
      if(ns && typeof ns[fn] === 'function') return ns[fn].apply(ns, arguments);
    }};
  }}
}});

window.__platformGo = function(app){{
  if(!['evolution','command','closeiq'].includes(app)) return;
  mountApp(app);
  __cur__=app;
  ['evolution','command','closeiq'].forEach(a=>{{
    document.getElementById('host-'+a).classList.toggle('active', a===app);
  }});
  document.querySelectorAll('.sw-tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-app')===app));
  __setBar__(app!=='evolution');
}};

document.querySelectorAll('.sw-tab').forEach(t=>{{
  t.addEventListener('click', ()=>window.__platformGo(t.getAttribute('data-app')));
}});
document.getElementById('revealTab').addEventListener('click', ()=>__setBar__(true));
document.addEventListener('keydown', e=>{{
  if(e.key==='1'){{ window.__platformGo('evolution'); }}
  if(e.key==='2'){{ window.__platformGo('command'); }}
  if(e.key==='3'){{ window.__platformGo('closeiq'); }}
}});

// boot
const __msgs__=['initialising…','loading vision…','mounting command center…','wiring CloseIQ…','ready'];
let __i__=0; const __bm__=document.getElementById('bootMsg');
const __iv__=setInterval(()=>{{
  __i__++; if(__i__<__msgs__.length)__bm__.textContent=__msgs__[__i__];
  if(__i__>=__msgs__.length-1){{
    clearInterval(__iv__);
    setTimeout(()=>{{ document.getElementById('boot').classList.add('gone'); window.__platformGo('evolution'); }},400);
  }}
}},380);
</script>
</body>
</html>"""

    OUT.mkdir(parents=True, exist_ok=True)
    write(OUT / 'artifact.html', html)
    size = (OUT / 'artifact.html').stat().st_size
    print(f"✓ Built public/artifact.html ({size//1024} KB)")

if __name__ == '__main__':
    main()
