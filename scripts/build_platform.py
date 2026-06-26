#!/usr/bin/env python3
"""
CloseIQ Platform — consolidated build
Assembles a single platform.html (the shell) plus three standalone app files,
injecting shell-navigation hooks into Evolution and Command Center.

Run:  python scripts/build_platform.py
Output: public/index.html (shell) + public/app-*.html (the three apps)
"""
import json, pathlib, re, shutil
from datetime import datetime

ROOT   = pathlib.Path(__file__).parent.parent
SRC    = ROOT / 'src'
APPS   = SRC / 'apps'
OUT    = ROOT / 'public'
SCRIPT = pathlib.Path(__file__).parent

def read(p):  return pathlib.Path(p).read_text(encoding='utf-8')
def write(p, s): pathlib.Path(p).write_text(s, encoding='utf-8')


# ── 1. Build the CloseIQ app (data + css + js + pptx bundle inline) ──────────
def build_closeiq():
    css     = read(SRC / 'css' / 'app.css')
    app_js  = read(SRC / 'js'  / 'app.js')
    data_js = json.dumps(json.loads(read(SRC / 'data' / 'closeiq_data.json')), separators=(',', ':'))
    bundle  = read(SCRIPT / 'pptxgen.bundle.js')
    body_html = read(SRC / 'html' / 'closeiq_body.html')
    app_js  = app_js.replace('__CLOSEIQ_DATA__', data_js)
    favicon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
               "%3Crect width='32' height='32' rx='7' fill='%23F08C1E'/%3E%3Ctext x='16' y='22' "
               "font-family='Poppins,Arial' font-size='17' font-weight='700' fill='white' "
               "text-anchor='middle'%3ET%3C/text%3E%3C/svg%3E")
    return f"""<!DOCTYPE html>
<html lang="en" class="theme-light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CloseIQ · Autonomous Month-End Close</title>
<link rel="icon" href="{favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<style>
{css}
</style>
</head>
<body>
{body_html}
<script>
{bundle}
</script>
<script>
{app_js}
</script>
</body>
</html>"""


# ── 2. Inject shell hooks into Evolution ─────────────────────────────────────
def build_evolution():
    html = read(APPS / 'evolution.html')
    # Replace the CTA link to talk to the shell instead of a missing file
    html = html.replace(
        '<a class="btn" href="fintran-command-center_v3.html"><i class="ti ti-arrow-right"></i> Open the command center</a>',
        '<a class="btn" href="#" onclick="if(window.parent!==window){window.parent.postMessage({__navTo:\'command\'},\'*\');return false;}"><i class="ti ti-arrow-right"></i> Open the command center</a>'
    )
    # Inject: reveal the platform bar once the user scrolls past the hero
    inject = """
<script>
(function(){
  if(window.parent===window) return;  // only when embedded in shell
  var sent=false;
  window.addEventListener('scroll', function(){
    if(!sent && window.scrollY>400){ sent=true; window.parent.postMessage({__showBar:true},'*'); }
  }, {passive:true});
})();
</script>
"""
    return html.replace('</body>', inject + '</body>')


# ── 3. Inject shell hooks into Command Center ────────────────────────────────
def build_command():
    html = read(APPS / 'command-center.html')
    inject = """
<script>
(function(){
  if(window.parent===window) return;  // only when embedded in shell

  // ── Wire DEMO_LINKS to platform shell navigation ──────────────────────────
  // launchActivity() and demoBtn() both use DEMO_LINKS[key] to route actions.
  // Sentinel hrefs trigger either a hashchange (launchActivity path) or a
  // click intercept (demoBtn <a> path), both of which postMessage to the shell.
  if(typeof DEMO_LINKS !== 'undefined'){
    DEMO_LINKS.monthend = '#__closeiq';  // Controllership launchActivity key
    DEMO_LINKS.tb       = '#__closeiq';  // CFO engagements demoBtn key (backward compat)
    DEMO_LINKS.variance = '#__closeiq';
    DEMO_LINKS.recon    = '#__reconiq';
    DEMO_LINKS.payments = '#__paymentsiq';
  }

  // hashchange: catches launchActivity()'s window.location.href = '#__...'
  window.addEventListener('hashchange', function(){
    var h = window.location.hash;
    var ov = document.getElementById('activityOverlay');
    if(h === '#__closeiq'){
      if(ov) ov.style.display = 'none';
      history.replaceState(null,'',window.location.pathname);
      window.parent.postMessage({__navTo:'closeiq'},'*');
    } else if(h === '#__reconiq'){
      if(ov) ov.style.display = 'none';
      history.replaceState(null,'',window.location.pathname);
      window.parent.postMessage({__navTo:'reconiq'},'*');
    } else if(h === '#__paymentsiq'){
      if(ov) ov.style.display = 'none';
      history.replaceState(null,'',window.location.pathname);
      window.parent.postMessage({__navTo:'paymentsiq'},'*');
    }
  });

  // click interceptor: catches demoBtn <a href="#__..."> links (CFO engagements)
  document.addEventListener('click', function(e){
    var t = e.target;
    while(t && t.tagName !== 'A') t = t.parentElement;
    if(!t || !t.href) return;
    if(t.href.indexOf('#__closeiq') !== -1){
      e.preventDefault(); window.parent.postMessage({__navTo:'closeiq'},'*');
    } else if(t.href.indexOf('#__reconiq') !== -1){
      e.preventDefault(); window.parent.postMessage({__navTo:'reconiq'},'*');
    } else if(t.href.indexOf('#__paymentsiq') !== -1){
      e.preventDefault(); window.parent.postMessage({__navTo:'paymentsiq'},'*');
    }
  }, true);

  // ── Beta tiles → navigate within the shell ───────────────────────────────
  // Forecasting & Scenario Planning -> ForecastIQ ; Dialogue with Data -> ValuationIQ.
  // Capture phase + stopImmediatePropagation overrides the app's default window.open.
  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.betaLaunch, #fcBeta') : null;
    if(!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var app = (b.id === 'fcBeta') ? 'forecast' : b.getAttribute('data-app');
    window.parent.postMessage({__navTo: (app === 'valuations') ? 'valuationiq' : 'forecastiq'}, '*');
  }, true);

  // ── CloseIQ launcher on Controllership tower detail page ──────────────────
  function addCloseIQLauncher(){
    var main = document.getElementById('main');
    if(!main || !main.querySelector('.back')) return;  // not on a detail page
    if(!/Controllership/i.test(main.textContent||'')) return;
    if(document.getElementById('__closeiqLauncher')) return;

    var banner = document.createElement('div');
    banner.id = '__closeiqLauncher';
    banner.style.cssText = 'margin:14px 0;padding:16px 18px;border-radius:12px;'
      + 'background:linear-gradient(135deg,#1C1C1C,#262624);border:1px solid #F08C1E;'
      + 'display:flex;align-items:center;gap:14px;cursor:pointer;transition:.15s';
    banner.onmouseover=function(){banner.style.transform='translateY(-2px)';};
    banner.onmouseout =function(){banner.style.transform='none';};
    banner.innerHTML =
      '<div style="width:42px;height:42px;border-radius:10px;background:#F08C1E;display:flex;'
      + 'align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:20px;flex:none">T</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:#fff">'
      + 'CloseIQ — Autonomous Month-End Close <span style="font-size:10px;color:#F5A93E;'
      + 'background:rgba(240,140,30,.16);padding:2px 8px;border-radius:10px;margin-left:6px">WAVE 1 · LIVE</span></div>'
      + '<div style="font-size:12px;color:#B4B2A9;margin-top:3px">Open the full close cockpit — TB scrutiny, '
      + 'variance, intercompany recon, and the Sage assistant. Day 7 → day 3.</div></div>'
      + '<div style="color:#F5A93E;font-size:13px;font-weight:600;white-space:nowrap">Open CloseIQ →</div>';
    banner.onclick = function(){ window.parent.postMessage({__navTo:'closeiq'},'*'); };
    var ref = main.querySelector('.back');
    main.insertBefore(banner, ref ? ref.nextSibling : main.firstChild);
  }

  // ── ReconIQ launcher on FSSC / Shared services tower detail page ──────────
  function addReconIQLauncher(){
    var main = document.getElementById('main');
    if(!main || !main.querySelector('.back')) return;  // not on a detail page
    if(!/Shared services|FSSC/i.test(main.textContent||'')) return;
    if(document.getElementById('__reconiqLauncher')) return;

    var banner = document.createElement('div');
    banner.id = '__reconiqLauncher';
    banner.style.cssText = 'margin:14px 0;padding:16px 18px;border-radius:12px;'
      + 'background:linear-gradient(135deg,#0d1418,#141c20);border:1px solid #2EA86D;'
      + 'display:flex;align-items:center;gap:14px;cursor:pointer;transition:.15s';
    banner.onmouseover=function(){banner.style.transform='translateY(-2px)';};
    banner.onmouseout =function(){banner.style.transform='none';};
    banner.innerHTML =
      '<div style="width:42px;height:42px;border-radius:10px;background:#2EA86D;display:flex;'
      + 'align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:20px;flex:none">T</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:#fff">'
      + 'ReconIQ — Intercompany Reconciliation <span style="font-size:10px;color:#5dcaa5;'
      + 'background:rgba(46,168,109,.18);padding:2px 8px;border-radius:10px;margin-left:6px">WAVE 1 · LIVE</span></div>'
      + '<div style="font-size:12px;color:#B4B2A9;margin-top:3px">IC matching · 400+ entities · 2,420 combinations · '
      + 'AED 2.6M open items · counter-party resolution engine.</div></div>'
      + '<div style="color:#5dcaa5;font-size:13px;font-weight:600;white-space:nowrap">Open ReconIQ →</div>';
    banner.onclick = function(){ window.parent.postMessage({__navTo:'reconiq'},'*'); };
    var ref = main.querySelector('.back');
    main.insertBefore(banner, ref ? ref.nextSibling : main.firstChild);
  }

  // ── PaymentsIQ launcher on FSSC / Payments detail page ───────────────────
  function addPaymentsIQLauncher(){
    var main = document.getElementById('main');
    if(!main || !main.querySelector('.back')) return;  // not on a detail page
    if(!/Shared services|FSSC|Payment/i.test(main.textContent||'')) return;
    if(document.getElementById('__paymentsiqLauncher')) return;

    var banner = document.createElement('div');
    banner.id = '__paymentsiqLauncher';
    banner.style.cssText = 'margin:14px 0;padding:16px 18px;border-radius:12px;'
      + 'background:linear-gradient(135deg,#1a1108,#221a0a);border:1px solid #F08C1E;'
      + 'display:flex;align-items:center;gap:14px;cursor:pointer;transition:.15s';
    banner.onmouseover=function(){banner.style.transform='translateY(-2px)';};
    banner.onmouseout =function(){banner.style.transform='none';};
    banner.innerHTML =
      '<div style="width:42px;height:42px;border-radius:10px;background:#F08C1E;display:flex;'
      + 'align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:20px;flex:none">T</div>'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:#fff">'
      + 'PaymentsIQ — IPC Validation <span style="font-size:10px;color:#F5A93E;'
      + 'background:rgba(240,140,30,.16);padding:2px 8px;border-radius:10px;margin-left:6px">WAVE 1 · LIVE</span></div>'
      + '<div style="font-size:12px;color:#B4B2A9;margin-top:3px">IPC certificate validation · 10 IPCs · AED 28M queue · '
      + 'AI benchmark analysis · aberration detection.</div></div>'
      + '<div style="color:#F5A93E;font-size:13px;font-weight:600;white-space:nowrap">Open PaymentsIQ →</div>';
    banner.onclick = function(){ window.parent.postMessage({__navTo:'paymentsiq'},'*'); };
    var ref = main.querySelector('.back');
    main.insertBefore(banner, ref ? ref.nextSibling : main.firstChild);
  }

  // ── Watch #main for navigation changes ────────────────────────────────────
  function onMainMutation(){
    setTimeout(function(){
      addCloseIQLauncher();
      addReconIQLauncher();
      addPaymentsIQLauncher();
    }, 80);
  }
  var mo = new MutationObserver(onMainMutation);
  function start(){
    var main = document.getElementById('main');
    if(main){ mo.observe(main, {childList:true, subtree:false}); }
    else setTimeout(start, 300);
  }
  start();

  window.__openCloseIQ    = function(){ window.parent.postMessage({__navTo:'closeiq'},'*'); };
  window.__openReconIQ    = function(){ window.parent.postMessage({__navTo:'reconiq'},'*'); };
  window.__openPaymentsIQ = function(){ window.parent.postMessage({__navTo:'paymentsiq'},'*'); };
})();
</script>
"""
    return html.replace('</body>', inject + '</body>')


# ── 4. Build ReconIQ (pass-through with shell nav hook) ─────────────────────
def build_reconiq():
    html = read(APPS / 'reconiq.html')
    inject = """
<script>
(function(){
  if(window.parent===window) return;
  window.parent.postMessage({__showBar:true},'*');
})();
</script>
"""
    return html.replace('</body>', inject + '</body>')


# ── 5. Build PaymentsIQ (pass-through with shell nav hook) ──────────────────
def build_paymentsiq():
    html = read(APPS / 'paymentsiq.html')
    inject = """
<script>
(function(){
  if(window.parent===window) return;
  window.parent.postMessage({__showBar:true},'*');
})();
</script>
"""
    return html.replace('</body>', inject + '</body>')


# ── 5b. Build ForecastIQ (pass-through with shell nav hook) ─────────────────
def build_forecastiq():
    html = read(APPS / 'forecastiq.html')
    inject = """
<script>
(function(){
  if(window.parent===window) return;
  window.parent.postMessage({__showBar:true},'*');
  function addBack(){
    if(document.getElementById('__backToConsole')) return;
    var a=document.createElement('button'); a.id='__backToConsole'; a.type='button';
    a.innerHTML='&larr; Finance AI Console';
    a.style.cssText='position:fixed;left:14px;bottom:14px;z-index:2147483600;background:#1C1C1C;color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:9px;padding:8px 13px;font:500 12.5px system-ui,-apple-system,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);';
    a.onmouseover=function(){a.style.background='#F08C1E';}; a.onmouseout=function(){a.style.background='#1C1C1C';};
    a.onclick=function(){window.parent.postMessage({__navTo:'command'},'*');};
    document.body.appendChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBack); else addBack();
})();
</script>
"""
    return html.replace('</body>', inject + '</body>')


# ── 5c. Build ValuationIQ (multi-file ES-module app, copied as a folder) ────
def build_valuationiq():
    src = APPS / 'valuationiq'
    dst = OUT / 'valuationiq'
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    # Inject shell nav hook into the app's index.html (reveal the switcher bar)
    idx = dst / 'index.html'
    inject = """
<script>
(function(){
  if(window.parent===window) return;
  window.parent.postMessage({__showBar:true},'*');
  function addBack(){
    if(document.getElementById('__backToConsole')) return;
    var a=document.createElement('button'); a.id='__backToConsole'; a.type='button';
    a.innerHTML='&larr; Finance AI Console';
    a.style.cssText='position:fixed;left:14px;bottom:14px;z-index:2147483600;background:#1C1C1C;color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:9px;padding:8px 13px;font:500 12.5px system-ui,-apple-system,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);';
    a.onmouseover=function(){a.style.background='#F08C1E';}; a.onmouseout=function(){a.style.background='#1C1C1C';};
    a.onclick=function(){window.parent.postMessage({__navTo:'command'},'*');};
    document.body.appendChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBack); else addBack();
})();
</script>
"""
    write(idx, read(idx).replace('</body>', inject + '</body>'))


# ── 6. Build the shell ───────────────────────────────────────────────────────
def build_shell():
    shell = read(APPS / 'shell.html')
    shell = shell.replace('__EVOLUTION_SRC__',  'app-evolution.html')
    shell = shell.replace('__COMMAND_SRC__',    'app-command.html')
    shell = shell.replace('__CLOSEIQ_SRC__',    'app-closeiq.html')
    shell = shell.replace('__RECONIQ_SRC__',    'app-reconiq.html')
    shell = shell.replace('__PAYMENTSIQ_SRC__', 'app-paymentsiq.html')
    shell = shell.replace('__FORECASTIQ_SRC__', 'app-forecastiq.html')
    shell = shell.replace('__VALUATIONIQ_SRC__', 'valuationiq/index.html')
    return shell


def main():
    print("Building consolidated FinTran × Tiger platform…")
    OUT.mkdir(parents=True, exist_ok=True)

    write(OUT / 'app-closeiq.html',    build_closeiq());     print("  ✓ app-closeiq.html")
    write(OUT / 'app-evolution.html',  build_evolution());   print("  ✓ app-evolution.html")
    write(OUT / 'app-command.html',    build_command());     print("  ✓ app-command.html")
    write(OUT / 'app-reconiq.html',    build_reconiq());     print("  ✓ app-reconiq.html")
    write(OUT / 'app-paymentsiq.html', build_paymentsiq());  print("  ✓ app-paymentsiq.html")
    write(OUT / 'app-forecastiq.html', build_forecastiq());  print("  ✓ app-forecastiq.html")
    build_valuationiq();                                      print("  ✓ valuationiq/ (M&A valuation co-pilot)")
    write(OUT / 'index.html',          build_shell());        print("  ✓ index.html (shell)")

    files = ['index.html','app-closeiq.html','app-evolution.html','app-command.html',
             'app-reconiq.html','app-paymentsiq.html','app-forecastiq.html']
    val = OUT / 'valuationiq'
    total = sum((OUT / f).stat().st_size for f in files)
    total += sum(p.stat().st_size for p in val.glob('*') if p.is_file())
    print(f"\n✓ Platform built — {total//1024} KB total across 7 apps + ValuationIQ")
    print(f"  Built {datetime.now().strftime('%Y-%m-%d %H:%M')}")

if __name__ == '__main__':
    main()
