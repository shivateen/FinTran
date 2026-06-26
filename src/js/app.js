// DATA injected at build time — edit src/data/closeiq_data.json
const DATA = __CLOSEIQ_DATA__;
const fmt = n => { const a=Math.abs(n); const s=n<0?'-':''; 
  if(a>=1e9)return s+'AED '+(a/1e9).toFixed(2)+'B';
  if(a>=1e6)return s+'AED '+(a/1e6).toFixed(1)+'M';
  if(a>=1e3)return s+'AED '+(a/1e3).toFixed(0)+'K'; return s+'AED '+a.toFixed(0);}
const fmtN = n => { const a=Math.abs(n); const s=n<0?'-':''; return s+(a).toLocaleString('en-US',{maximumFractionDigits:0});}
const pct = (a,b)=> b===0?0:((a-b)/Math.abs(b)*100);
const el = id => { const e=document.getElementById(id); if(!e){ const s={classList:{toggle:()=>{},add:()=>{},remove:()=>{}},style:{},innerHTML:'',textContent:'',value:'',disabled:false,children:[],focus:()=>{}}; return s; } return e; };

/* ============ AGENT RAIL ENGINE ============ */
const AGENTS = [
 {id:'EXTRACT',name:'Data Extraction'},
 {id:'MAP',name:'Mapping'},
 {id:'VARIANCE',name:'Variance'},
 {id:'COMMENTARY',name:'Commentary'},
 {id:'SCRUTINY',name:'TB Scrutiny'},
 {id:'RECON',name:'Reconciliation'},
 {id:'FORECAST',name:'Projection'},
];
let feedSeq=0;
// 7 standing capabilities — circular radial layout around Sage hub
// hub=(155,107), radius=72, nodes evenly spaced starting at top (-90°)
const MAPPOS={
  VARIANCE:[155,35], FORECAST:[211,62], COMMENTARY:[225,123],
  RECON:[186,172],   SCRUTINY:[124,172], MAP:[85,123],        EXTRACT:[99,62]
};
const CAP_LABEL={EXTRACT:'EXTR',MAP:'MAP',VARIANCE:'VARI',SCRUTINY:'SCRU',COMMENTARY:'COMM',RECON:'RECO',FORECAST:'FCST'};
const AGENT_FULL={
  EXTRACT:'Data Extraction', MAP:'Mapping', VARIANCE:'Variance',
  COMMENTARY:'Commentary',   SCRUTINY:'TB Scrutiny', RECON:'Reconciliation', FORECAST:'Projection'
};
// [labelX, labelY, textAnchor] — placed outside the ring, away from hub
const LABEL_POS={
  VARIANCE:  [155, 16,  'middle'],
  FORECAST:  [228, 52,  'start'],
  COMMENTARY:[243, 123, 'start'],
  RECON:     [186, 193, 'middle'],
  SCRUTINY:  [124, 193, 'middle'],
  MAP:       [67,  123, 'end'],
  EXTRACT:   [82,  52,  'end']
};
function renderRoster(){
  const hub=[155,107];
  el('roster').className='agent-map';
  const edges=Object.entries(MAPPOS).map(([id,[x,y]])=>
    `<line class="medge" id="edge-${id}" x1="${hub[0]}" y1="${hub[1]}" x2="${x}" y2="${y}"/>`
  ).join('');
  const nodes=Object.entries(MAPPOS).map(([id,[x,y]])=>{
    const[lx,ly,anc]=LABEL_POS[id];
    return `<g class="mnode" id="node-${id}">
        <circle cx="${x}" cy="${y}" r="14"/>
        <text x="${x}" y="${y+3.5}">${CAP_LABEL[id]}</text>
      </g>
      <text class="mnode-label" id="label-${id}" x="${lx}" y="${ly}" text-anchor="${anc}">${AGENT_FULL[id]}</text>`;
  }).join('');
  el('roster').innerHTML=`<svg viewBox="0 0 310 207" class="mesh-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="meshHubGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(240,140,30,.22)"/>
        <stop offset="100%" stop-color="rgba(240,140,30,0)"/>
      </radialGradient>
    </defs>
    <circle cx="${hub[0]}" cy="${hub[1]}" r="73" class="orbit-ring"/>
    <circle cx="${hub[0]}" cy="${hub[1]}" r="34" fill="url(#meshHubGrad)" class="hub-glow-ring"/>
    ${edges}
    ${nodes}
    <g class="mhub">
      <circle cx="${hub[0]}" cy="${hub[1]}" r="21"/>
      <text x="${hub[0]}" y="${hub[1]-2}">SAGE</text>
      <text x="${hub[0]}" y="${hub[1]+7}">ORCH</text>
    </g>
    <g id="spawnLayer"></g>
  </svg>
  <div class="mesh-tip" id="meshTip"><b>dormant</b> · glowing nodes are active now</div>`;
}
function setActive(ids){
  Object.keys(MAPPOS).forEach(id=>{
    const n=el('node-'+id),e=el('edge-'+id),l=el('label-'+id);
    const on=ids.includes(id);
    if(n)n.classList.toggle('active',on);
    if(e)e.classList.toggle('active',on);
    if(l)l.classList.toggle('mlabel-active',on);
  });
}
function mapPulse(id,on=true){
  const n=el('node-'+id),e=el('edge-'+id),l=el('label-'+id);
  if(n)n.classList.toggle('live',on);
  if(e)e.classList.toggle('live',on);
  if(l)l.classList.toggle('mlabel-live',on);
}
function liveChip(id,on=true){mapPulse(id,on);}
function spawnAgent(label,fromId){
  const sl=el('spawnLayer');if(!sl)return;
  const base=MAPPOS[fromId]||[155,107];
  const sx=base[0]+(base[0]<155?-32:base[0]>155?32:0),sy=base[1]+(base[1]<107?-24:24);
  const id='spawn-'+Date.now();
  sl.innerHTML=`<line class="medge spawn" x1="${base[0]}" y1="${base[1]}" x2="${sx}" y2="${sy}" id="${id}-e"/>
    <g class="mnode spawn" id="${id}-n"><circle cx="${sx}" cy="${sy}" r="12"/>
    <text x="${sx}" y="${sy+2}">NEW</text>
    <text x="${sx}" y="${sy+9}" style="font-size:5.5px">${label.slice(0,10)}</text></g>`;
  const tip=el('meshTip');if(tip)tip.innerHTML='<b style="color:var(--ok)">'+label+'</b> spawned for this task';
  setTimeout(()=>{const n=el(id+'-n'),e=el(id+'-e');if(n)n.classList.add('fade');if(e)e.classList.add('fade');
    setTimeout(()=>{sl.innerHTML='';if(tip)tip.innerHTML='<b>dormant</b> · glowing nodes are active now';},700);},3200);
}
function clk(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');}
const AUDIT=[];
function chainHash(s){let h=AUDIT.length?parseInt(AUDIT[AUDIT.length-1].h.slice(0,8),16):2166136261;for(const c of s)h=((h^c.charCodeAt(0))*16777619)>>>0;return (h>>>0).toString(16).padStart(8,'0')+((h*2654435761)>>>0).toString(16).padStart(8,'0');}
function emit(agent,msg,reason,kind){
  liveChip(agent,true);
  const f=el('feed'); feedSeq++;
  AUDIT.push({seq:feedSeq,t:clk(),agent,msg,h:chainHash(feedSeq+agent+msg+(reason||''))});
  const div=document.createElement('div');
  div.className='fitem '+(kind||'');
  div.innerHTML=`<span class="tm">${clk()}</span><span class="ag">${agent}</span> ${msg}`+
    (reason?`<div class="reason">${reason}</div>`:'');
  if(reason)div.onclick=()=>div.classList.toggle('open');
  f.appendChild(div); f.scrollTop=f.scrollHeight;
  el('feedCount').textContent=feedSeq+' events';
  // keep feed bounded
  while(f.children.length>60)f.removeChild(f.firstChild);
  setTimeout(()=>liveChip(agent,false),1800);
}
// scripted boot sequence
const BOOT=[
 ['EXTRACT','connected → Oracle Fusion OTBI','source: FAH.GL_BALANCES\nentities: 10 · periods: May-26, Apr-26, May-25\nrows pulled: 487 · checksum ✓','done'],
 ['MAP','applied L1/L2/L3 grouping','mapping table: GRP_STRUCT v12\nunmapped GL heads: 0 · coverage 100%','done'],
 ['VARIANCE','computed 7 comparison layers','MoM · QoQ · YTD/YTD · MvM-LY · QvQ-LY · Bud(M) · Bud(YTD)\nmaterial movements (>AED 1.5M): 14','done'],
 ['SCRUTINY','scanned 487 balances → flagged 12','aging × materiality × anomaly model\nhigh-risk: 5 · medium: 4 · low: 3\nrecoverable identified: AED 43.1M','flag'],
 ['COMMENTARY','drafted 14 controller-style notes','grounded in GL narration + vendor + PO\nstyle model: controller-tone v3','done'],
 ['RECON','matched 7/10 IC pairs','fuzzy match: amount±date±reference\nunmatched: 3 · net diff AED 2.6M','flag'],
];
let bootIx=0;
function boot(){ if(window._bootStarted&&bootIx===0)return; window._bootStarted=true; if(bootIx>=BOOT.length)return; const[a,m,r,k]=BOOT[bootIx++]; emit(a,m,r,k); setTimeout(boot, 700);}

/* ============ INGESTION STATE ============ */
const INGESTED = {};   // sourceId -> {mode, file, ts}
function allIngested(){return DATA.sources.every(s=>INGESTED[s.id]);}
function anyIngested(){return DATA.sources.some(s=>INGESTED[s.id]);}
function ingestCount(){return DATA.sources.filter(s=>INGESTED[s.id]).length;}
function freshness(){
  if(!anyIngested())return 'no sources loaded';
  return ingestCount()+'/'+DATA.sources.length+' sources · loaded '+clk();
}
function updateFreshness(){
  const p=el('barFresh'); if(p)p.innerHTML='<span class="live-dot"></span>'+freshness();
}

/* ============ NAV ============ */
const TITLES={
 sources:['Data Sources','Connect or upload source-system extracts · agents ingest and map'],
 exec:['Executive Close Summary','Group consolidated · 10 entities · live drill-down enabled'],
 modB:['Variance Analysis','7 comparison layers · MoM · QoQ · YTD · Budget · multi-audience output'],
 modA:['Trial Balance Scrutiny','Module A · balance-sheet cleanup · recommended actions'],
 modC:['Intercompany Reconciliation','Module C · ~400 entities · extensible matching platform'],
 je:['JE Accrual Sub-Process','16-step PO-accrual automation · human-in-the-loop posting'],
 fc:['Cash Flow Forecast','Art of the possible · construction payment projections · Phase 2'],
 p13:['Period 13 · Consolidation Adjustments','Top-sided entries · group level only · dual sign-off required · not in legal entity books'],
 flow:['Month-End Process Flow','Agent-by-agent timeline · AI vs manual breakdown · time savings dashboard']};
let curView='sources';
function go(v){
  curView=v;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  el('barT').textContent=TITLES[v][0]; el('barS').textContent=TITLES[v][1];
  el('main').scrollTop=0;
  render(v);
}
function toggleRail(){el('app').classList.toggle('rail-collapsed');}

/* ============ RENDER ROUTER ============ */
function gateHtml(name){
  return `<div class="big-empty"><div class="ic"><svg viewBox="0 0 24 24"><path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/></svg></div>
   <h2>No source data yet</h2><p>${name} runs on ingested data. Connect or upload the source-system extracts and the agents will populate this view automatically.</p>
   <button class="btn pri" onclick="go('sources')"><svg viewBox='0 0 24 24'><path d='M5 12h14M12 5v14'/></svg>Go to data sources</button></div>`;
}
function render(v){
  const c=el('content');
  if(v==='sources'){renderSources();return;}
  if(!anyIngested()){c.innerHTML=gateHtml(TITLES[v][0]);return;}
  // skeleton → agents fire during load → real content + count-up
  c.innerHTML=viewSkeleton();
  const seqAgents={
    modB: [['VARIANCE','recomputing 7 comparison layers','MoM · QoQ · YTD · MvM · QvQ · Bud · BudY','act'],
           ['COMMENTARY','refreshing variance narratives','14 movements above materiality threshold','act']],
    modA: [['SCRUTINY','re-scanning 487 balance-sheet items','aging × materiality × anomaly model','act'],
           ['VARIANCE','cross-referencing movement drivers','MoM delta recalculation complete','done']],
    modC: [['RECON','refreshing IC match matrix','fuzzy match: amount ± date ± reference','act'],
           ['EXTRACT','polling entity sub-ledgers for late postings','2 timing items still open','act']],
    je:   [['EXTRACT','pulling PO accrual journal','Oracle Payables · may-26 · 1,450 lines','act'],
           ['SCRUTINY','validating accrual integrity','16-step automation chain verified','done']],
    fc:   [['FORECAST','projecting 6-month construction cash flow','PO milestones × consumption curves','act'],
           ['COMMENTARY','refreshing cash position narrative','6-month horizon computed','done']],
    p13:  [['SCRUTINY','scanning P13 consolidation entries','IFRS 16 · goodwill · IC dividend eliminations','act'],
           ['VARIANCE','validating cross-period adjustment integrity','MoM + QoQ consistency check complete','done']],
    flow: [['VARIANCE','computing agent-by-agent timeline','step durations · 13 steps · 5 phases','act'],
           ['SCRUTINY','calculating time saved vs manual baseline','58 hours reclaimed this close cycle','done']],
    exec: [['VARIANCE','loading group consolidated summary','7 comparison layers · 10 entities','act'],
           ['COMMENTARY','refreshing CFO executive narrative','controller-tone v3 · pack ready','done']],
  };
  (seqAgents[v]||[]).forEach(([a,m,r,k],i)=>setTimeout(()=>emit(a,m,r,k),i*210));
  setTimeout(()=>{
    if(v==='modB')renderModB();
    else if(v==='modA')renderModA();
    else if(v==='modC')renderModC();
    else if(v==='je')renderJE();
    else if(v==='fc')renderForecast();
    else if(v==='p13')renderP13();
    else if(v==='flow')renderProcessFlow();
    else if(v==='exec'){c.innerHTML='';c.appendChild(buildExec());}
    countUpAll();
  },360);
}
function viewSkeleton(){
  return `<div class="sk-wrap">
    <div class="sk-line sk-title"></div>
    <div class="sk-line sk-sub"></div>
    <div class="sk-kpis">
      <div class="sk-line sk-kpi"></div><div class="sk-line sk-kpi"></div>
      <div class="sk-line sk-kpi"></div><div class="sk-line sk-kpi"></div>
    </div>
    <div class="sk-line sk-block"></div>
    <div class="sk-rows">
      <div class="sk-line sk-row" style="width:92%"></div>
      <div class="sk-line sk-row" style="width:74%"></div>
      <div class="sk-line sk-row" style="width:86%"></div>
      <div class="sk-line sk-row" style="width:65%"></div>
    </div>
  </div>`;
}

/* ---------- HELPERS: charts, count-up, deterministic rng ---------- */
function hashStr(s){let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;}
function rng(seed){return function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function countUpAll(){
  const els=Array.from(new Set([
    ...document.querySelectorAll('.cu'),
    ...document.querySelectorAll('.kpi-val'),
    ...document.querySelectorAll('.pf-kpi-val'),
  ]));
  let idx=0;
  els.forEach(e=>{
    const txt=e.textContent.trim();
    const m=txt.match(/(-?[\d,]+\.?\d*)/);
    if(!m)return;
    const raw=m[1].replace(/,/g,'');
    const target=parseFloat(raw);
    if(!target||isNaN(target))return;
    const pre=txt.slice(0,txt.indexOf(m[1]));
    const post=txt.slice(txt.indexOf(m[1])+m[1].length);
    const dec=(raw.split('.')[1]||'').length;
    const useCommas=/,/.test(m[1]);
    const delay=(idx++)*45;
    const dur=820;
    setTimeout(()=>{
      const t0=performance.now();
      const tick=t=>{
        const p=Math.min(1,(t-t0)/dur);
        const ease=1-Math.pow(1-p,3);
        const v=target*ease;
        e.textContent=pre+(useCommas?Math.round(v).toLocaleString('en-US'):v.toFixed(dec))+post;
        if(p<1)requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },delay);
  });
}
function svgWaterfall(steps,w,h){
  w=w||640;h=h||210;
  let cum=0;const pts=steps.map(s=>{
    if(s.t==='d'){const a=cum;cum+=s.v;return{...s,lo:Math.min(a,cum),hi:Math.max(a,cum),neg:s.v<0};}
    cum=s.v;return{...s,lo:Math.min(0,s.v),hi:Math.max(0,s.v)};});
  const max=Math.max(...pts.map(p=>p.hi))*1.08, min=Math.min(0,...pts.map(p=>p.lo));
  const padL=10,padB=30,padT=16;const gw=(w-padL*2)/steps.length;const bw=gw*0.58;
  const Y=v=>padT+(max-v)/(max-min)*(h-padT-padB);
  let out=`<svg viewBox="0 0 ${w} ${h}" class="wf">`;
  out+=`<line class="ch-axis" x1="${padL}" y1="${Y(0)}" x2="${w-padL}" y2="${Y(0)}"/>`;
  pts.forEach((p,i)=>{
    const x=padL+gw*i+(gw-bw)/2;
    const cls=p.t==='b'?'wf-base':p.t==='t'?'wf-total':(p.neg?'wf-neg':'wf-pos');
    out+=`<rect class="${cls}" x="${x}" y="${Y(p.hi)}" width="${bw}" height="${Math.max(2,Y(p.lo)-Y(p.hi))}" rx="3"/>`;
    const vtxt=p.t==='d'?((p.v>=0?'+':'')+(p.v/1e6).toFixed(0)+'M'):((p.v/1e6).toFixed(0)+'M');
    out+=`<text class="ch-val" x="${x+bw/2}" y="${Y(p.hi)-5}" text-anchor="middle">${vtxt}</text>`;
    out+=`<text class="ch-lbl" x="${x+bw/2}" y="${h-10}" text-anchor="middle">${p.l}</text>`;
  });
  return out+'</svg>';
}
function svgLine(series,w,h,opts){
  w=w||640;h=h||180;opts=opts||{};
  const padL=34,padB=24,padT=12,padR=10;
  const vals=series.map(s=>s.v);
  const max=Math.max(...vals)*1.05, min=Math.min(...vals)*0.95;
  const X=i=>padL+i/(series.length-1)*(w-padL-padR);
  const Y=v=>padT+(max-v)/(max-min)*(h-padT-padB);
  const path=series.map((s,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(s.v).toFixed(1)).join(' ');
  let out=`<svg viewBox="0 0 ${w} ${h}"><defs><linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F08C1E" stop-opacity=".35"/><stop offset="100%" stop-color="#F08C1E" stop-opacity="0"/></linearGradient></defs>`;
  [0,.5,1].forEach(f=>{const v=min+(max-min)*f;out+=`<line class="ch-grid" x1="${padL}" y1="${Y(v)}" x2="${w-padR}" y2="${Y(v)}"/><text class="ch-lbl" x="${padL-5}" y="${Y(v)+3}" text-anchor="end">${opts.fmt?opts.fmt(v):v.toFixed(0)}</text>`;});
  out+=`<path class="ch-area" d="${path} L ${X(series.length-1)} ${Y(min)} L ${X(0)} ${Y(min)} Z"/>`;
  out+=`<path class="ch-line" d="${path}"/>`;
  series.forEach((s,i)=>{out+=`<circle class="ch-dot ${s.alert?'alert':''}" cx="${X(i)}" cy="${Y(s.v)}" r="${s.alert?4.5:3}"/>`;
    out+=`<text class="ch-lbl" x="${X(i)}" y="${h-8}" text-anchor="middle">${s.l}</text>`;});
  return out+'</svg>';
}
function svgDonut(parts,size){
  size=size||120;const r=44,cx=size/2,cy=size/2,C=2*Math.PI*r;
  const total=parts.reduce((s,p)=>s+p.v,0);let off=0;
  let out=`<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;flex:none">`;
  parts.forEach(p=>{const frac=p.v/total;
    out+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.c}" stroke-width="13" stroke-dasharray="${(frac*C).toFixed(1)} ${C}" stroke-dashoffset="${(-off*C).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off+=frac;});
  out+=`<text x="${cx}" y="${cy-2}" text-anchor="middle" style="fill:var(--ink);font-family:var(--mono);font-size:17px;font-weight:600">${Math.round(parts[0].v/total*100)}%</text>`;
  out+=`<text x="${cx}" y="${cy+13}" text-anchor="middle" class="ch-lbl">${parts[0].l}</text>`;
  return out+'</svg>';
}

/* ---------- SOURCES (front door) ---------- */
const SRCMODE={};  // id -> 'upload' | 'api'
function renderSources(){
  DATA.sources.forEach(s=>{if(!SRCMODE[s.id])SRCMODE[s.id]='upload';});
  el('content').innerHTML=`
   <div class="eyebrow">Step 1 · data ingestion</div>
   <div class="h1">Connect your systems, or drop in the extracts.</div>
   <p class="lead">The close engine runs the same way whether data arrives by file upload (raw export) or live API. Load the four source systems below — agents parse, map to the canonical schema, and validate each one. Everything downstream reads from what you ingest here.</p>

   <div class="ingest-all">
     <span class="tag-ag">QUICK ACTIONS</span>
     <button class="btn pri" onclick="ingestAll()"><svg viewBox='0 0 24 24'><path d='M21 12a9 9 0 11-6.2-8.5'/><path d='M21 3v6h-6'/></svg>Sync all sources</button>
     <button class="btn" onclick="preloadAll()">Restore last session</button>
     <span class="mini muted" id="ingestSummary" style="margin-left:auto">${ingestCount()}/${DATA.sources.length} sources ingested</span>
   </div>

   <div class="src-grid" id="srcGrid">
     ${DATA.sources.map(s=>srcCard(s)).join('')}
   </div>

   <div id="qualityPanel"></div>
   <div id="tbVersionPanel"></div>
   <div id="gateBanner"></div>`;
  DATA.sources.forEach(s=>bindDrop(s.id));
  renderQualityPanel();
  renderTBVersionPanel();
  refreshGate();
}
function renderQualityPanel(){
  const p=el('qualityPanel');if(!p)return;
  const mismatches=DATA.sources.filter(s=>s.glSubledgerMatch===false);
  const unmapped=(DATA.gl||[]).filter(g=>!g.l1||!g.l2||!g.l3);
  if(!mismatches.length&&!unmapped.length){p.innerHTML='';return;}
  let html='<div style="margin-top:20px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="tag-ag">SOURCE QUALITY</span><span class="mini muted">issues detected before month-end processing begins</span></div>';
  if(mismatches.length){const m=mismatches[0];
    html+=`<div class="quality-issue quality-mismatch">
      <div class="qi-head"><span class="chip warn">GL ↔ SUBLEDGER MISMATCH</span><span class="qi-val">${fmt(m.mismatchAED)}</span></div>
      <div class="qi-body">${m.mismatchDetail}</div>
      <div class="qi-note">How this is handled: the semantic layer holds the discrepancy and applies a governed reconciliation rule before the close engine processes the data. The controller sees this for awareness — no manual intervention required.</div>
    </div>`;}
  if(unmapped.length){
    html+=`<div class="quality-issue quality-unmapped">
      <div class="qi-head"><span class="chip risk">UNMAPPED GL ACCOUNTS</span><span class="qi-val">${unmapped.length} account${unmapped.length>1?'s':''}</span></div>
      <div class="qi-body">The following GL codes have no L1/L2/L3 hierarchy mapping — they will cause the trial balance extraction to fail if not resolved before the next close run:</div>
      <div style="margin-top:10px">${unmapped.map(g=>`<div class="qi-account"><span class="num" style="color:var(--ink-3)">${g.code}</span>&nbsp;·&nbsp;${g.desc}&nbsp;<span class="chip risk" style="font-size:9px;padding:1px 7px">unmapped</span></div>`).join('')}</div>
      <div class="qi-note">Action required: assign L1/L2/L3 codes in the GL mapping table and re-run the extraction.</div>
    </div>`;}
  html+='</div>';
  p.innerHTML=html;
}
function renderTBVersionPanel(){
  const p=el('tbVersionPanel');if(!p)return;
  const vs=(DATA.tbVersions||[]);if(!vs.length){p.innerHTML='';return;}
  const approved=vs.find(v=>v.status==='approved');
  let html=`<div style="margin-top:20px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <span class="tag-ag">TRIAL BALANCE · VERSION CONTROL</span>
    <span class="mini muted">${vs.length} extractions logged this close cycle</span>
    ${approved?`<span class="chip ok" style="margin-left:auto;font-size:10px">✓ Approved: ${approved.version}</span>`:''}
  </div>
  <div class="tv-timeline">`;
  vs.slice().reverse().forEach(v=>{
    const isApproved=v.status==='approved';
    const d=new Date(v.ts);
    const ds=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' GST';
    const diff=(DATA.tbDiffs||[]).find(di=>di.to===v.version);
    html+=`<div class="tv-entry${isApproved?' tv-approved-entry':''}">
      <div class="tv-dot${isApproved?' tv-dot-approved':''}"></div>
      <div class="tv-main">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="tv-badge${isApproved?' tv-badge-approved':' tv-badge-super'}">${v.version}</span>
          <b style="color:var(--ink);font-size:12px">${v.label}</b>
          ${isApproved?`<span class="chip ok" style="font-size:9px;padding:1px 7px">APPROVED · LOCKED</span>`:'<span class="mini muted">superseded</span>'}
          <span class="mini muted" style="margin-left:auto">${ds}</span>
        </div>
        <div class="mini muted" style="margin-top:4px;line-height:1.5">${v.note}${isApproved&&v.approvalNote?`<br><span style="color:var(--ok)">${v.approvalNote}</span>`:''}</div>
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px">
          <span class="mini muted">${v.rows} rows · ${v.extractedBy}</span>
          ${diff?`<button class="btn" style="padding:3px 9px;font-size:10px" onclick="openVersionDiff('${diff.from}','${diff.to}')">View changes from ${diff.from} (${diff.changes.length}) ↗</button>`:''}
          ${isApproved?`<span class="mini" style="color:var(--ok);margin-left:4px">Approval locked to this snapshot — re-extraction requires re-certification</span>`:''}
        </div>
      </div>
    </div>`;
  });
  html+=`</div></div>`;
  p.innerHTML=html;
}
function openVersionDiff(fromV,toV){
  const diff=(DATA.tbDiffs||[]).find(d=>d.from===fromV&&d.to===toV);
  if(!diff){toast('No diff data available for this version pair');return;}
  emit('EXTRACT','TB diff '+fromV+' → '+toV,'comparing snapshots · '+diff.changes.length+' GL lines changed\naudit chain preserved · versions immutable','done');
  const rows=diff.changes.map(c=>{
    const d=c.prev?((c.delta/Math.abs(c.prev))*100):0;
    return `<tr><td class="mini" style="color:var(--ink-3)">${c.entity}</td>
      <td class="mini">${c.gl} · ${c.gd}</td>
      <td class="r num">${fmtN(Math.abs(c.prev))}</td>
      <td class="r num">${fmtN(Math.abs(c.curr))}</td>
      <td class="r num ${c.delta>=0?'pos':'neg'}">${c.delta>=0?'+':''}${fmtN(c.delta)}</td>
      <td class="r num ${d>=0?'pos':'neg'}">${d>=0?'+':''}${d.toFixed(1)}%</td>
      <td class="mini muted" style="max-width:180px">${c.reason}</td></tr>`;
  }).join('');
  openDrawer(`<div class="drawer-head"><div>
    <span class="tag-ag">TB DIFF VIEW</span>
    <div class="h2" style="margin-top:10px">${fromV} → ${toV}: what changed</div>
    <div class="mini muted">${diff.changes.length} GL lines changed · approval locked to ${toV} snapshot</div>
  </div><div class="x" onclick="closeDrawer()">×</div></div>
  <div class="drawer-body">
    <div class="reason-box" style="margin-bottom:14px"><span class="k">Governance note.</span> John's approval on <b>v2.0</b> is a commitment to <i>this exact dataset</i>. If Oracle Fusion is re-extracted after sign-off, the platform voids the approval and requires re-certification — preventing silent post-approval changes from reaching CFO reporting.</div>
    <table><thead><tr><th>Entity</th><th>Account</th><th class="r">v${fromV}</th><th class="r">v${toV}</th><th class="r">Δ AED</th><th class="r">Δ%</th><th>Business reason</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="mini muted" style="margin-top:12px">Diff generated by EXTRACT agent · both snapshots are immutable · changes above are the controller-confirmed differences between draft and approved TB.</p>
  </div>`);
}
function srcCard(s){
  const ing=INGESTED[s.id];
  const mode=SRCMODE[s.id];
  return `<div class="src-card ${ing?'ingested':''}" id="card-${s.id}">
    <div class="src-head">
      <div class="src-ico">${s.id.slice(0,3)}</div>
      <div><div class="src-name">${s.name}</div><div class="src-sub">${s.sub} · ${s.feed}</div></div>
      <div class="src-status ${ing?'ok':''}" id="status-${s.id}">${ing?'✓ ingested':'not connected'}</div>
    </div>
    <div class="src-body">
      <div class="mode-toggle">
        <button class="${mode==='upload'?'on':''}" onclick="setMode('${s.id}','upload')">⬆ Upload extract</button>
        <button class="${mode==='api'?'on':''}" onclick="setMode('${s.id}','api')">⇄ API connection</button>
      </div>
      <div id="modebody-${s.id}">${mode==='upload'?uploadUI(s):apiUI(s)}</div>
      <div class="ingest-prog" id="prog-${s.id}">
        ${['Reading file','Detecting schema','Mapping to canonical model','Validating','Loaded'].map((t,i)=>
          `<div class="istep" id="istep-${s.id}-${i}"><span class="dot">${i+1}</span>${t}</div>`).join('')}
      </div>
      <div class="src-result" id="result-${s.id}"></div>
    </div></div>`;
}
function uploadUI(s){
  return `<div class="dropzone" id="dz-${s.id}" onclick="document.getElementById('fi-${s.id}').click()">
    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 5v12"/></svg>
    <div class="dz-t">Drop ${s.fmt} extract or click to browse</div>
    <div class="dz-s">expected: ${s.file}</div>
    <div class="dz-file" id="dzfile-${s.id}"></div>
    <input type="file" id="fi-${s.id}" style="display:none" accept=".csv,.xlsx,.xls" onchange="onFile('${s.id}',this.files[0])">
  </div>`;
}
function apiUI(s){
  return `<div class="api-box">
    <div class="api-row"><span class="lbl">endpoint</span><span class="val">${s.endpoint}</span></div>
    <div class="api-row"><span class="lbl">schema / object</span><span class="val">${s.schema}</span></div>
    <div class="api-row"><span class="lbl">scope</span><span class="val">${s.entity}</span></div>
    <div class="api-row"><span class="lbl">auth</span><span class="val" style="color:var(--ok)">● OAuth2 · token valid</span></div>
    <button class="btn pri" style="width:100%;justify-content:center;margin-top:10px" onclick="testApi('${s.id}')">
      <svg viewBox='0 0 24 24'><path d='M13 2L3 14h7l-1 8 10-12h-7l1-8z'/></svg>Test connection & pull</button>
  </div>`;
}
function setMode(id,m){SRCMODE[id]=m;el('modebody-'+id).innerHTML=m==='upload'?uploadUI(DATA.sources.find(s=>s.id===id)):apiUI(DATA.sources.find(s=>s.id===id));if(m==='upload')bindDrop(id);}
function bindDrop(id){
  const dz=el('dz-'+id); if(!dz)return;
  dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
  dz.ondragleave=()=>dz.classList.remove('drag');
  dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');if(e.dataTransfer.files[0])onFile(id,e.dataTransfer.files[0]);};
}
function onFile(id,file){
  if(!file)return;
  const s=DATA.sources.find(x=>x.id===id);
  el('dzfile-'+id).textContent='▣ '+file.name+' ('+(file.size/1024).toFixed(0)+' KB)';
  // real parse: count rows/cols for CSV; for xlsx we read bytes and show size (parser-agnostic demo)
  const isCsv=/\.csv$/i.test(file.name);
  const rd=new FileReader();
  rd.onload=()=>{
    let rows=s.rows, cols=s.cols;
    if(isCsv){const lines=rd.result.split(/\r?\n/).filter(x=>x.trim());rows=Math.max(0,lines.length-1);cols=(lines[0]||'').split(',').length;}
    runIngest(id,'upload',file.name,rows,cols);
  };
  if(isCsv)rd.readAsText(file); else rd.readAsArrayBuffer(file);
}
function testApi(id){
  const s=DATA.sources.find(x=>x.id===id);
  el('status-'+id).className='src-status live';el('status-'+id).textContent='● pulling…';
  emit('EXTRACT','API pull → '+s.name,'GET '+s.endpoint+'\nauth: OAuth2 ✓ · 200 OK','act');
  setTimeout(()=>runIngest(id,'api',s.endpoint,s.rows,s.cols),500);
}
function runIngest(id,mode,via,rows,cols){
  const s=DATA.sources.find(x=>x.id===id);
  el('prog-'+id).classList.add('on');
  el('status-'+id).className='src-status live';el('status-'+id).textContent='● ingesting';
  emit('EXTRACT',(mode==='api'?'API stream':'file')+' → '+s.name,'source: '+via+'\nrows: '+rows+' · cols: '+cols,'act');
  const steps=5; let i=0;
  const stepMsgs=[
    ['EXTRACT','read '+rows+' rows from '+s.name,'parser: '+(s.fmt)+'\nbytes streamed ok','done'],
    ['MAP','detected schema '+s.schema,'header signature matched\ncandidate columns: '+cols,'done'],
    ['MAP','mapped '+s.name+' → canonical model','L1/L2/L3 + entity keys aligned\nunmapped: 0','done'],
    ['EXTRACT','validated '+s.name,'type checks ✓ · null checks ✓\nbalance integrity ✓','done'],
    ['MAP',s.name+' loaded','available to all downstream agents','done'],
  ];
  const tick=()=>{
    if(i>0)el(`istep-${id}-${i-1}`).className='istep done';
    if(i<steps){el(`istep-${id}-${i}`).className='istep run';emit(...stepMsgs[i]);i++;setTimeout(tick,420);}
    else{finishIngest(id,mode,via,rows,cols);}
  };
  tick();
}
function finishIngest(id,mode,via,rows,cols){
  const s=DATA.sources.find(x=>x.id===id);
  INGESTED[id]={mode,via,rows,cols,ts:Date.now()};
  el('card-'+id).classList.add('ingested');
  el('status-'+id).className='src-status ok';el('status-'+id).textContent='✓ ingested';
  const r=el('result-'+id);r.className='src-result on';
  r.innerHTML=`<span class="num">${rows.toLocaleString()}</span> rows · <span class="num">${cols}</span> columns mapped to <b>${s.schema}</b> · via ${mode==='api'?'API':'upload'} · 0 errors`;
  el('ingestSummary').textContent=ingestCount()+'/'+DATA.sources.length+' sources ingested';
  updateFreshness();refreshGate();
}
function ingestAll(){
  let d=0;
  DATA.sources.forEach(s=>{ if(!INGESTED[s.id]){setTimeout(()=>runIngest(s.id,SRCMODE[s.id]||'upload',SRCMODE[s.id]==='api'?s.endpoint:s.file,s.rows,s.cols),d);d+=600;} });
}
function preloadAll(){
  DATA.sources.forEach(s=>{INGESTED[s.id]={mode:'preload',via:s.file,rows:s.rows,cols:s.cols,ts:Date.now()};});
  emit('EXTRACT','session restored — 4 sources mounted','last ingestion replayed from cache\ncanonical model ready','done');
  renderSources();updateFreshness();
  // seed the agent rail with the analysis boot so downstream looks alive
  setTimeout(boot,300);schedulePing();
  toast('Session restored — close engine ready');
}
function refreshGate(){
  const b=el('gateBanner'); if(!b)return;
  if(allIngested()){
    b.innerHTML=`<div class="gate-banner"><svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2'><path d='M20 6L9 17l-5-5'/></svg>
      All four sources ingested. The close engine is live — <b style="cursor:pointer;text-decoration:underline" onclick="go('exec')">open the CFO summary</b> to see what the agents found.</div>`;
    if(!window._booted){window._booted=true;setTimeout(boot,300);
      setTimeout(()=>{ if(!sageOpened){
        const fab=el('sageFab'); if(fab&&!fab.querySelector('.badge')){const b=document.createElement('span');b.className='badge';b.textContent='3';fab.appendChild(b);}
        emit('COMMENTARY','Sage briefing ready','3 strategic observations prepared for CFO\nmargin · write-backs · IC timing','flag');
        toast('Sage: I have 3 observations on this close — ask me');
      }},5200);
    }
  } else if(anyIngested()){
    b.innerHTML=`<div class="gate-banner" style="background:var(--panel);border-color:var(--line);color:var(--ink-2)">${ingestCount()} of ${DATA.sources.length} sources in. Downstream modules are live on partial data — load the rest for full coverage.</div>`;
  } else b.innerHTML='';
}

/* ---------- EXEC (CFO landing) ---------- */
function consol(field){ // group totals by P&L heads
  let rev=0,cost=0,opex=0;
  DATA.tb.forEach(r=>{ if(r.typ!=='PL')return;
    if(r.l2==='Revenue')rev+=r[field];
    else if(r.l2==='Direct Cost')cost+=r[field];
    else opex+=r[field];});
  return {rev:-rev,cost,opex,ebitda:-rev-cost-opex,pat:(-rev-cost-opex)*0.82};
}
function buildExec(){
  const cur=consol('cur'),prior=consol('prior'),bud=consol('bud');
  const wrap=document.createElement('div');
  const revD=pct(cur.rev,prior.rev), ebD=pct(cur.ebitda,prior.ebitda), budD=pct(cur.ebitda,bud.ebitda);
  const hosRevC=-DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Revenue').reduce((s,r)=>s+r.cur,0);
  const hosRevP=-DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Revenue').reduce((s,r)=>s+r.prior,0);
  const hosCostC=DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Direct Cost').reduce((s,r)=>s+r.cur,0);
  const hosCostP=DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Direct Cost').reduce((s,r)=>s+r.prior,0);
  const marginC=(hosRevC-hosCostC)/hosRevC*100, marginP=(hosRevP-hosCostP)/hosRevP*100;

  // Group KPIs (Command Centre style)
  const groupKpis=[
    {l:'YTD Revenue',v:'AED 12.3B',c:'+18% YoY',ok:true},
    {l:'YTD EBITDA',v:'AED 4.1B',c:'+23% YoY',ok:true},
    {l:'EBITDA Margin',v:'34.2%',c:'+1.4 pts YoY',ok:true},
    {l:'Group Cash',v:'AED 8.4B',c:'+0.6B vs plan',ok:true},
    {l:'Liquidity',v:'AED 12.1B',c:'9.2 mo opex cover',ok:true},
    {l:'CT Compliance',v:'100% on-time',c:'CT readiness 45%',ok:false}
  ];

  // Finance function tiles
  const fnTiles=[
    {icon:'<path d="M9 11l3 3 8-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',label:'Controllership',metric:'Close day 3 · 96% confidence',status:'ok',nav:"go('sources')"},
    {icon:'<path d="M3 13h4v8H3zM10 3h4v18h-4zM17 9h4v12h-4z"/>',label:'FP&A · Variance',metric:'7 layers · budget vs actual',status:'ok',nav:"go('modB')"},
    {icon:'<path d="M9 11l3 3 8-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',label:'Trial Balance · Scrutiny',metric:'487 balances · 12 exceptions',status:'ok',nav:"go('modA')"},
    {icon:'<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h10M5 8v8M19 8v8M7 18h10"/>',label:'Intercompany · Recon',metric:`${DATA.stats.ic_matched}/${DATA.stats.ic_total} matched · ${fmt(DATA.stats.ic_unmatched_val)} open`,status:'warn',nav:"go('modC')"},
    {icon:'<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',label:'P13 · Consolidation',metric:'Pending sign-off items',status:'warn',nav:"go('p13')"},
    {icon:'<path d="M3 17l5-6 4 3 5-7 4 5M3 21h18"/>',label:'Cash Flow Forecast',metric:'6-month projection · live',status:'ok',nav:"go('fc')"}
  ];

  const kpiCards=groupKpis.map(k=>`
    <div class="card" style="padding:14px 16px">
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val num" style="font-size:20px;margin:4px 0">${k.v}</div>
      <div class="mini" style="color:${k.ok?'var(--ok)':'var(--risk)'}">${k.c}</div>
    </div>`).join('');

  const fnCards=fnTiles.map(t=>`
    <div class="card tap" style="padding:14px 16px;cursor:pointer" onclick="${t.nav}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--orange-dim,rgba(240,140,30,.15));display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--orange-soft,#F5A93E)" stroke-width="1.8">${t.icon}</svg>
        </div>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--ink-3)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:3px;color:var(--ink)">${t.label}</div>
      <div class="mini muted">${t.metric}</div>
      <div style="width:100%;height:3px;border-radius:2px;background:var(--line);margin-top:10px;overflow:hidden">
        <div style="height:100%;width:${t.status==='ok'?'92':'48'}%;background:${t.status==='ok'?'var(--ok)':'var(--risk)'}"></div>
      </div>
    </div>`).join('');

  wrap.innerHTML=`
  <!-- ═══ SECTION 1: GROUP COMMAND CENTRE KPIs ═══ -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div>
      <div class="eyebrow">Group CFO Dashboard · May 2026 · FY2026 YTD</div>
      <div class="h1" style="margin-bottom:0">Key Performance Indicators</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn pri" onclick="downloadPack()" style="display:flex;align-items:center;gap:6px;padding:9px 16px;font-size:12.5px">
        <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'/></svg>Download Pack
      </button>
      <button class="btn" onclick="emailPack()" style="display:flex;align-items:center;gap:6px;padding:9px 14px;font-size:12.5px">
        <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,12 2,6'/></svg>Email to CFO
      </button>
    </div>
  </div>
  <div class="grid" style="grid-template-columns:repeat(6,1fr);margin-bottom:22px">${kpiCards}</div>

  <!-- ═══ SECTION 2: FINANCE FUNCTIONS ═══ -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
    <span class="tag-ag">FINANCE FUNCTIONS</span>
    <span class="muted mini">click any function to open its analysis</span>
  </div>
  <div class="grid" style="grid-template-columns:repeat(6,1fr);margin-bottom:26px">${fnCards}</div>

  <!-- ═══ SECTION 3: CLOSE ANALYSIS ═══ -->
  <div class="insight-band">
    <div class="ib-head">
      <div class="ib-avatar"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 2.4 1.2 4.5 3 5.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 00-7-7z"/><path d="M9 21h6"/></svg></div>
      <div><div class="ib-title">Sage · strategic read on this close</div><div class="ib-by">synthesised from variance, scrutiny & recon agents · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div></div>
      <button class="btn" style="margin-left:auto" onclick="openSage()">Ask a follow-up</button>
    </div>
    <div class="ib-commentary">This is a clean close on the topline — Real Estate handover recognition carried group revenue to <b>${fmt(cur.rev)}</b>, slightly ahead of budget. The story underneath is mix, not magnitude. <b>Hospitality margin compressed ${(marginP-marginC).toFixed(1)} points</b> as operating cost ran ahead of flat revenue, quietly offsetting development gains; left unexamined it will reset the run-rate. Separately, the balance sheet is carrying <b>${fmt(DATA.stats.recoverable)}</b> of recoverable positions that have aged past the point of comfort — a real P&L and cash opportunity this period, not next. None of this is a fire. All of it is worth a decision before you sign.</div>
    <div class="ib-actions">
      <div class="ib-act" onclick="go('modA')"><div class="ib-rank">1</div><div><div class="ib-act-t">Approve the high-confidence write-backs</div><div class="ib-act-s">3 aged balances >90% confidence · clean P&L pickup this period</div></div><div class="ib-act-n">+${fmt(DATA.stats.writeback)}</div></div>
      <div class="ib-act" onclick="askSage('Why did Hospitality margin compress and is it structural?')"><div class="ib-rank">2</div><div><div class="ib-act-t">Pressure-test the Hospitality labour cost</div><div class="ib-act-s">Confirm structural vs one-off before it sets FY forecast</div></div><div class="ib-act-n">margin risk</div></div>
      <div class="ib-act" onclick="go('modC')"><div class="ib-rank">3</div><div><div class="ib-act-t">Clear the intercompany timing items</div><div class="ib-act-s">3 unmatched pairs · resolvable before consolidation locks</div></div><div class="ib-act-n">${fmt(DATA.stats.ic_unmatched_val)}</div></div>
    </div>
  </div>

  <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:22px">
    <div class="card tap" onclick="drillRevenue()"><div class="kpi-label">Group Revenue · May</div><div class="kpi-val num cu">${fmt(cur.rev)}</div>
      <div class="kpi-sub"><span class="${revD>=0?'pos':'neg'}">${revD>=0?'▲':'▼'} ${Math.abs(revD).toFixed(1)}%</span> vs prior month</div></div>
    <div class="card tap" onclick="drillEbitda()"><div class="kpi-label">EBITDA · May</div><div class="kpi-val num cu">${fmt(cur.ebitda)}</div>
      <div class="kpi-sub"><span class="${ebD>=0?'pos':'neg'}">${ebD>=0?'▲':'▼'} ${Math.abs(ebD).toFixed(1)}%</span> MoM · <span class="${budD>=0?'pos':'neg'}">${budD>=0?'+':''}${budD.toFixed(1)}%</span> vs budget</div></div>
    <div class="card"><div class="kpi-label">Recoverable on BS</div><div class="kpi-val num cu" style="color:var(--orange-soft)">${fmt(DATA.stats.recoverable)}</div>
      <div class="kpi-sub">flagged by scrutiny agent · 8 items</div></div>
    <div class="card"><div class="kpi-label">Close Confidence</div><div class="kpi-val num cu">96%</div>
      <div class="kpi-sub" style="margin-bottom:8px">3 items pending human sign-off</div>
      <div class="close-cal"><i class="done"></i><i class="done"></i><i class="cur"></i><i></i><i></i></div>
      <div class="mini muted" style="margin-top:5px;font-size:10px">close calendar · day 3 of 5</div></div>
  </div>

  <div class="value-strip">
    <div class="vs-item"><div class="vs-n"><span class="was">1.5–2 days</span>~4 hrs</div><div class="vs-l">Pack & commentary cycle</div></div>
    <div class="vs-item"><div class="vs-n">AED 45.7M</div><div class="vs-l">Findings surfaced this close</div></div>
    <div class="vs-item"><div class="vs-n">487 → 12</div><div class="vs-l">Balances auto-triaged to exceptions</div></div>
    <div class="vs-item"><div class="vs-n">100%</div><div class="vs-l">Drill-down to transaction</div></div>
  </div>

  <!-- ═══ SECTION 4: STRATEGIC FINDINGS ═══ -->
  <div style="display:flex;align-items:center;gap:10px;margin:26px 0 12px">
    <span class="tag-ag">AGENTS · STRATEGIC FINDINGS</span>
    <span class="muted mini">ranked by impact · click any card to drill to evidence</span>
  </div>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="card tap" onclick="findingHospitality(${marginC.toFixed(1)},${marginP.toFixed(1)})">
      <span class="chip risk">MARGIN EROSION</span>
      <div class="h2" style="margin-top:12px">Hospitality margin down ${(marginP-marginC).toFixed(1)} pts</div>
      <p class="mini muted">FinTran Hotels operating margin fell from ${marginP.toFixed(1)}% to ${marginC.toFixed(1)}% — revenue flat while operating cost rose 34%. No one flagged this manually.</p>
      <div class="divider" style="margin:14px 0"></div>
      <div class="mini"><span class="muted">Driver →</span> agency labour & utilities · <span class="pos">commentary drafted</span></div>
    </div>
    <div class="card tap" onclick="go('modA')">
      <span class="chip warn">BALANCE-SHEET CLEANUP</span>
      <div class="h2" style="margin-top:12px">${fmt(DATA.stats.recoverable)} recoverable</div>
      <p class="mini muted">8 aged balances across contractor advances, refund suspense and DLD deposits. ${fmt(DATA.stats.writeback)} eligible for write-back to income this period.</p>
      <div class="divider" style="margin:14px 0"></div>
      <div class="mini"><span class="muted">Action →</span> 3 high-risk awaiting your approval</div>
    </div>
    <div class="card tap" onclick="go('modC')">
      <span class="chip ag">CASH TRAPPED</span>
      <div class="h2" style="margin-top:12px">${fmt(DATA.stats.ic_unmatched_val)} IC mismatch</div>
      <p class="mini muted">3 of 10 intercompany pairs unmatched across the 400-entity group. Timing and FX gaps isolated by the recon agent — resolvable before consolidation.</p>
      <div class="divider" style="margin:14px 0"></div>
      <div class="mini"><span class="muted">Status →</span> ${DATA.stats.ic_matched}/${DATA.stats.ic_total} auto-matched</div>
    </div>
  </div>

  <!-- ═══ SECTION 5: CHARTS ═══ -->
  <div class="grid" style="grid-template-columns:1.15fr .85fr;margin-top:18px">
    <div class="card chart-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="tag-ag">VARIANCE</span>
      <div class="h2" style="font-size:14px;margin:0">EBITDA bridge — May vs April</div></div>
      ${svgWaterfall([
        {l:'Apr EBITDA',v:prior.ebitda,t:'b'},
        {l:'Revenue',v:cur.rev-prior.rev,t:'d'},
        {l:'Direct cost',v:-(cur.cost-prior.cost),t:'d'},
        {l:'Opex',v:-(cur.opex-prior.opex),t:'d'},
        {l:'May EBITDA',v:cur.ebitda,t:'t'}])}
      <div class="mini muted" style="margin-top:8px">Agent-decomposed movement · every driver traces to entity and transaction in the pack view.</div>
    </div>
    <div class="card chart-card" style="cursor:pointer" onclick="findingHospitality(${marginC.toFixed(1)},${marginP.toFixed(1)})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="chip risk">WATCH</span>
      <div class="h2" style="font-size:14px;margin:0">Hospitality margin — 6-month trend</div></div>
      ${svgLine([
        {l:'Dec',v:marginP+1.2},{l:'Jan',v:marginP+0.4},{l:'Feb',v:marginP-0.5},
        {l:'Mar',v:marginP+0.7},{l:'Apr',v:marginP},{l:'May',v:marginC,alert:true}],640,180,{fmt:v=>v.toFixed(0)+'%'})}
      <div class="mini muted" style="margin-top:8px">May break in trend flagged by variance agent · click for commentary and drivers.</div>
    </div>
  </div>

  <!-- ═══ SECTION 6: ENTITY TABLE ═══ -->
  <div class="card" style="margin-top:18px;padding:0;overflow:hidden">
    <div style="display:flex;align-items:center;gap:10px;padding:18px 20px 12px">
      <span class="tag-ag">ENTITY PERFORMANCE</span>
      <span class="muted mini">all 10 entities · click any row for the entity P&L and open items</span>
    </div>
    <table><thead><tr><th>Entity</th><th>Vertical</th><th class="r">Revenue</th><th class="r">EBITDA</th><th class="r">Margin</th><th class="r">MoM</th><th class="r">Open items</th></tr></thead><tbody>
    ${DATA.entities.map(e=>{const a=entAgg(e.code);const exc=DATA.scrutiny.filter(s=>s.entity===e.code).length;
      return `<tr class="tap" onclick="entityDrawer('${e.code}')"><td><b style="color:var(--ink)">${e.code}</b><br><span class="muted" style="font-size:10px">${e.name}</span></td>
      <td class="mini">${e.vertical}</td><td class="r num">${fmt(a.rev)}</td><td class="r num">${fmt(a.eb)}</td>
      <td class="r num">${a.mgn.toFixed(1)}%</td><td class="r num ${a.mom>=0?'pos':'neg'}">${a.mom>=0?'+':''}${a.mom.toFixed(1)}%</td>
      <td class="r num">${exc||'—'}</td></tr>`}).join('')}
    </tbody></table>
  </div>

  <!-- ═══ SECTION 7: AGENTS AT WORK ═══ -->
  <div class="card" style="margin-top:18px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span class="tag-ag">AGENTS AT WORK</span>
      <span class="muted mini">what the close engine did in the last 4 hours — vs. the 1.5–2 days this took manually</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr)">
      ${[['487','GL balances analysed','EXTRACT'],['14','material variances explained','VARIANCE'],['12','exceptions classified','SCRUTINY'],['7','IC pairs auto-matched','RECON']].map(([n,l,a])=>
        `<div><div class="kpi-val num" style="font-size:24px">${n}</div><div class="mini muted">${l}</div><div class="tag-ag" style="margin-top:6px">${a}</div></div>`).join('')}
    </div>
    <div class="divider" style="margin:16px 0 14px"></div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span class="chip ok">WHAT THIS MEANS FOR YOU</span>
      <span class="muted mini">the business case, in this period alone</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr)">
      <div><div class="kpi-val num" style="font-size:24px;color:var(--ok)">4 hrs</div><div class="mini muted">close analysis runtime — vs 1.5–2 days manual, every month</div></div>
      <div><div class="kpi-val num" style="font-size:24px;color:var(--ok)">~22 days</div><div class="mini muted">controller capacity returned per month across 10 entities</div></div>
      <div><div class="kpi-val num" style="font-size:24px;color:var(--orange-soft)">${fmt(45700000)}</div><div class="mini muted">P&L + cash opportunity surfaced in month one — exceeds the cost of the programme</div></div>
    </div>
  </div>

  <!-- ═══ SECTION 8: CFO PACK + DOWNLOAD ═══ -->
  <div class="card" style="margin-top:18px;background:linear-gradient(135deg,var(--panel) 0%,rgba(240,140,30,.06) 100%);border-color:var(--orange-dim,rgba(240,140,30,.22))">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="tag-ag">CFO PACK</span>
          <span class="chip ok" style="font-size:10px">READY</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:var(--ink)">Month-End Close Pack · May 2026</div>
        <div class="mini muted" style="line-height:1.6">Commentary drafted by Sage · data live from TB ${(()=>{const av=(DATA.tbVersions||[]).find(v=>v.status==='approved');return av?av.version:'—';})()}  · audience: ${(()=>typeof bAudience!=='undefined'?bAudience:'CFO')()} view<br>Includes: executive narrative · EBITDA bridge · entity scorecard · 3 strategic findings · agent audit chain</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <button class="btn pri" onclick="downloadPack()" style="display:flex;align-items:center;gap:7px;padding:10px 20px;font-size:13px;font-weight:600">
          <svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'/></svg>Download Pack (PPTX)
        </button>
        <button class="btn" onclick="emailPack()" style="display:flex;align-items:center;gap:7px;padding:8px 16px;font-size:12.5px">
          <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,12 2,6'/></svg>Email to CFO
        </button>
        <button class="btn" onclick="exportPack()" style="display:flex;align-items:center;gap:7px;padding:8px 16px;font-size:12.5px">
          <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'/><path d='M17 8l-5-5-5 5M12 3v12'/></svg>Export Pack (PPT)
        </button>
      </div>
    </div>
  </div>`;
  return wrap;
}
function downloadPack(){
  emit('COMMENTARY','CFO pack download initiated','generating PPTX · Sage commentary + data live\nentity scorecard · EBITDA bridge · 3 findings','act');
  toast('CFO pack download started — PPTX generating');
  setTimeout(()=>exportPack(),400);
}
function findingHospitality(mc,mp){
  emit('COMMENTARY','CFO opened Hospitality margin finding','re-grounding narrative on GL 5100 drivers\nvendor-level cost attribution running','act');
  const rows=DATA.tb.filter(r=>r.entity==='HOS-01'&&(r.l2==='Revenue'||r.l2==='Direct Cost'));
  openDrawer(`
   <div class="drawer-head">
     <div><span class="chip risk">MARGIN EROSION</span>
     <div class="h2" style="margin-top:10px">FinTran Hotels & Resorts — operating margin</div>
     <div class="mini muted">HOS-01 · May 2026 · flagged by Variance + Commentary agents</div></div>
     <div class="x" onclick="closeDrawer()">×</div>
   </div>
   <div class="drawer-body">
     <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:18px">
       <div class="card" style="padding:14px"><div class="kpi-label">Margin this month</div><div class="kpi-val num" style="font-size:24px;color:var(--risk)">${mc}%</div></div>
       <div class="card" style="padding:14px"><div class="kpi-label">Prior month</div><div class="kpi-val num" style="font-size:24px">${mp}%</div></div>
     </div>
     <div class="h2" style="font-size:13px;margin-bottom:8px">Agent commentary <span class="tag-ag">COMMENTARY · GenAI</span></div>
     <div class="reason-box" style="margin-bottom:18px"><span class="k">Finding.</span> <span class="v">Hospitality operating margin compressed ${(mp-mc).toFixed(1)} points MoM.</span> Room and F&B revenue were essentially flat (+2%), while operating cost rose +34%. Decomposition of GL 5100 attributes the spike to (a) agency / contract labour replacing vacant permanent roles ahead of peak season, and (b) a utilities true-up booked in May. The pattern is concentrated in HOS-01 and does not appear in the JV (HOS-02), suggesting an entity-specific staffing decision rather than market movement.
<span class="k">Recommendation.</span> Confirm whether the labour cost is structural or one-off before it sets the run-rate. If structural, the FY forecast margin needs a downward revision in Hospitality.</div>
     <div class="h2" style="font-size:13px;margin-bottom:8px">Underlying movement (drill-down)</div>
     <table><thead><tr><th>GL</th><th>Head</th><th class="r">Prior</th><th class="r">Current</th><th class="r">Δ%</th></tr></thead><tbody>
     ${rows.map(r=>{const d=pct(Math.abs(r.cur),Math.abs(r.prior));return `<tr><td class="num">${r.gl}</td><td>${r.gd}</td><td class="r num">${fmtN(Math.abs(r.prior))}</td><td class="r num">${fmtN(Math.abs(r.cur))}</td><td class="r num ${r.l2==='Direct Cost'&&d>0?'neg':'pos'}">${d>=0?'+':''}${d.toFixed(0)}%</td></tr>`}).join('')}
     </tbody></table>
     <div style="display:flex;gap:10px;margin-top:20px">
       <button class="btn pri" onclick="toast('Margin note added to CFO pack');closeDrawer()"><svg viewBox='0 0 24 24'><path d='M5 12h14M12 5v14'/></svg>Add to CFO pack</button>
       <button class="btn" onclick="closeDrawer()">Close</button>
     </div>
   </div>`);
}

/* ---------- MODULE B: PACK + VARIANCE + AUDIENCE ---------- */
let bLayer='MoM', bAudience='CFO';
const LAYERS=[['MoM','Month / Month','prior'],['QoQ','Quarter / Quarter','prior'],['YTD','YTD vs PY','ly'],
 ['MvM','Month vs LY','ly'],['QvQy','Qtr vs Qtr LY','ly'],['Bud','Budget (Month)','bud'],['BudY','Budget (YTD)','bud']];
const AUD=['Entity Controller','Vertical Controller','FP&A','CFO'];
function availableLayers(){
  return ['Entity Controller','Vertical Controller'].includes(bAudience)
    ?LAYERS.filter(l=>!['Bud','BudY'].includes(l[0])):LAYERS;
}
function renderModB(){
  el('content').innerHTML=`
   <div class="eyebrow">Module B · primary demo</div>
   <div class="h1">One dataset. Seven variance layers. Four audiences.</div>
   <p class="lead">The same trial balance, re-expressed for whoever is asking — from a controller who needs every GL head to the CFO who needs the one-page story. Switch the lens; the agents recompute the narrative.</p>

   <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:22px 0 18px">
     <div><div class="mini muted" style="margin-bottom:6px">Comparison layer</div>
     <div class="seg" id="layerSeg">${availableLayers().map(l=>`<button onclick="setLayer('${l[0]}')" class="${l[0]===bLayer?'on':''}">${l[1]}</button>`).join('')}</div></div>
     <div><div class="mini muted" style="margin-bottom:6px">Audience view <span class="tag-ag">agent re-narrates</span></div>
     <div class="seg" id="audSeg">${AUD.map(a=>`<button onclick="setAud('${a}')" class="${a===bAudience?'on':''}">${a}</button>`).join('')}</div></div>
     <div style="display:flex;gap:8px;margin-left:auto;align-items:center">
       ${(()=>{const av=(DATA.tbVersions||[]).find(v=>v.status==='approved');return av?`<span class="tv-ver-pill" onclick="go('sources')" title="Click to view TB version history">TB ${av.version} · Approved ✓</span>`:'';})()}
     </div>
   </div>
   <div id="bBody"></div>
   <div id="custPanel"></div>`;
  renderBBody();
}
function setLayer(l){bLayer=l;document.querySelectorAll('#layerSeg button').forEach(b=>b.classList.toggle('on',b.textContent===LAYERS.find(x=>x[0]===l)[1]));emit('VARIANCE','switched to '+l+' layer','recomputing material movements for new basis','act');renderBBody();}
function setAud(a){
  bAudience=a;
  document.querySelectorAll('#audSeg button').forEach(b=>b.classList.toggle('on',b.textContent===a));
  if(['Entity Controller','Vertical Controller'].includes(a)&&['Bud','BudY'].includes(bLayer)){bLayer='MoM';}
  const ls=el('layerSeg');
  if(ls)ls.innerHTML=availableLayers().map(l=>`<button onclick="setLayer('${l[0]}')" class="${l[0]===bLayer?'on':''}">${l[1]}</button>`).join('');
  emit('COMMENTARY','re-narrating for '+a,'adjusting granularity + materiality filter\n'+(a==='CFO'?'one-page strategic summary':a==='FP&A'?'budget-centric, KPI focus, budget layers active':a==='Vertical Controller'?'vertical roll-up · 4 business types · no budget layer':'single entity granular GL · no budget layer'),'act');
  renderBBody();
}
function cmpField(){return LAYERS.find(x=>x[0]===bLayer)[2];}
function renderBBody(){
  const f=cmpField();
  const groups={};
  DATA.tb.filter(r=>r.typ==='PL').forEach(r=>{const k=r.l2;groups[k]=groups[k]||{cur:0,cmp:0};groups[k].cur+=r.cur;groups[k].cmp+=r[f];});
  let html='';
  if(bAudience==='CFO'){
    const c=consol('cur'),cmp=consol(f);
    html=`<div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="tag-ag">CFO ONE-PAGER</span><span class="mini muted">${LAYERS.find(x=>x[0]===bLayer)[1]} basis</span></div>
     <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:14px 0">
       ${[['Revenue',c.rev,cmp.rev],['EBITDA',c.ebitda,cmp.ebitda],['PAT',c.pat,cmp.pat]].map(([l,a,b])=>{const d=pct(a,b);return `<div><div class="kpi-label">${l}</div><div class="kpi-val num" style="font-size:24px">${fmt(a)}</div><div class="mini ${d>=0?'pos':'neg'}">${d>=0?'▲':'▼'} ${Math.abs(d).toFixed(1)}%</div></div>`}).join('')}
     </div>
     <div class="reason-box"><span class="k">Executive narrative.</span> Group revenue ${pct(c.rev,cmp.rev)>=0?'grew':'declined'} ${Math.abs(pct(c.rev,cmp.rev)).toFixed(1)}% on a ${LAYERS.find(x=>x[0]===bLayer)[1].toLowerCase()} basis, led by Real Estate handover recognition. EBITDA ${pct(c.ebitda,cmp.ebitda)>=0?'expanded':'contracted'} to ${fmt(c.ebitda)}. The single watch-item is Hospitality, where margin compression offsets development gains — see strategic findings on the CFO summary.</div></div>`;
  } else if(bAudience==='Entity Controller'){
    html=renderEntityCtrlBody(f);
  } else if(bAudience==='Vertical Controller'){
    html=renderVerticalCtrlBody(f);
  } else {
    // FP&A — full group, budget layers active, operational metrics
    const matThresh=3e6;
    const f2=cmpField();
    const movers=DATA.tb.filter(r=>r.typ==='PL').map(r=>({n:r.entity+' · '+r.gd,v:(Math.abs(r.cur)-Math.abs(r[f2]))*(r.l2==='Revenue'?1:-1)}))
      .sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,6);
    const mmax=Math.max(...movers.map(m=>Math.abs(m.v)));
    const scopeBanner=`<div class="aud-scope-banner aud-fpa">
      <div class="aud-scope-icon">FP&A</div>
      <div style="flex:1"><div class="aud-scope-title">FP&A · Full Group Visibility</div>
      <div class="aud-scope-sub">All 7 comparison layers active including Budget · switch to Bud or BudY for BvA analysis · operational metrics shown below</div></div></div>`;
    const moversHtml=`<div class="card" style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span class="tag-ag">VARIANCE</span><div class="h2" style="font-size:14px;margin:0">Top movers — EBITDA impact (${bLayer} basis)</div></div>
      ${movers.map(m=>{const wpc=Math.abs(m.v)/mmax*48;const pos=m.v>=0;
        return `<div class="hbar-row"><div class="hbar-lbl">${m.n}</div>
        <div class="hbar-track"><div class="hbar-mid"></div>
          <div class="hbar-bar ${pos?'pos':'neg'}" style="width:${wpc}%;margin-left:${pos?50:50-wpc}%"></div></div>
        <div class="hbar-val ${pos?'pos':'neg'}">${pos?'+':''}${fmt(m.v)}</div></div>`}).join('')}
    </div>`;
    const tableHtml=`<div class="card" style="padding:0;overflow:hidden">
     <table><thead><tr><th>P&L group</th><th class="r">Current</th><th class="r">${bLayer} basis</th><th class="r">Variance</th><th class="r">Δ%</th><th>Agent commentary</th></tr></thead><tbody>
     ${Object.entries(groups).map(([g,v])=>{const va=v.cur-v.cmp;const d=pct(v.cur,v.cmp);
       if(Math.abs(va)<matThresh)return '';
       return `<tr class="tap" onclick="drillGroup('${g}')"><td><b style="color:var(--ink)">${g}</b></td>
         <td class="r num">${fmtN(Math.abs(v.cur))}</td><td class="r num">${fmtN(Math.abs(v.cmp))}</td>
         <td class="r num ${va>=0?'pos':'neg'}">${fmtN(va)}</td><td class="r num ${d>=0?'pos':'neg'}">${d>=0?'+':''}${d.toFixed(1)}%</td>
         <td class="mini muted"><span class="tag-ag" style="margin-right:6px">AI</span>${commentaryFor(g,d)}</td></tr>`}).join('')}
     </tbody></table></div>
     <p class="mini muted" style="margin-top:10px">Showing movements above ${fmt(matThresh)} materiality threshold · FP&A view. Click a row to drill to entity → GL → transaction.</p>`;
    const opMetrics=`<div class="card" style="margin-top:16px;border-color:var(--orange-dim)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="tag-ag">FP&A ONLY · OPERATIONAL METRICS</span>
      <span class="mini muted">not visible in Entity Controller or Vertical Controller views</span></div>
      <div class="grid" style="grid-template-columns:repeat(4,1fr)">
        <div><div class="kpi-label">Units Sold (May)</div><div class="kpi-val num" style="font-size:22px">412</div><div class="mini muted">vs 380 prior · +8.4%</div></div>
        <div><div class="kpi-label">Avg Selling Price</div><div class="kpi-val num" style="font-size:22px">AED 2.1M</div><div class="mini muted">Hills 2 driving mix</div></div>
        <div><div class="kpi-label">Collection Rate</div><div class="kpi-val num" style="font-size:22px">94%</div><div class="mini muted">vs 91% budget · +3pp</div></div>
        <div><div class="kpi-label">NPS · Hospitality</div><div class="kpi-val num" style="font-size:22px">72</div><div class="mini muted">staffing pressure visible</div></div>
      </div></div>`;
    html=scopeBanner+moversHtml+tableHtml+opMetrics;
  }
  el('bBody').innerHTML=html;
  renderCustomerPanel();
}
function renderCustomerPanel(){
  const p=el('custPanel');if(!p)return;
  if(!['FP&A','CFO'].includes(bAudience)){p.innerHTML='';return;}
  const custs=DATA.customers||[];if(!custs.length){p.innerHTML='';return;}
  const grpRev=consol('cur').rev||1;
  const sorted=custs.map(c=>{
    const total=c.breakdown.reduce((s,b)=>s+b.revenue,0);
    return {...c,total,pct:total/grpRev*100};
  }).sort((a,b)=>b.total-a.total);
  const top3pct=sorted.slice(0,3).reduce((s,c)=>s+c.pct,0);
  const typeChip=t=>t==='Institutional'?'ag':t==='Individual (HNW)'?'ok':t==='Hospitality'?'warn':'';
  let html=`<div style="margin-top:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span class="tag-ag">CUSTOMER REVENUE · CONSOLIDATED</span>
      <span class="mini muted">${sorted.length} tracked customers · cross-entity · ${bLayer} basis</span>
      <span class="chip ${top3pct>=40?'risk':'warn'}" style="margin-left:auto;font-size:10px">Top 3 = ${top3pct.toFixed(1)}% of group revenue${top3pct>=40?' · concentration watch':''}</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr>
        <th>Customer</th><th>Type</th><th>Entities</th>
        <th class="r">Revenue (AED)</th><th class="r">% of group</th><th>Segment</th>
      </tr></thead><tbody>
      ${sorted.map((c,i)=>{
        const entTags=c.breakdown.map(b=>`<span class="cust-ent-dot">${b.entity}</span>`).join('');
        return `<tr class="tap" onclick="customerDrawer('${c.id}')">
          <td><b style="color:var(--ink)">${i===0?'<span style="color:var(--orange-soft);font-size:10px;font-family:var(--mono);margin-right:4px">#1</span>':''}${c.name}</b></td>
          <td><span class="chip ${typeChip(c.type)}" style="font-size:9.5px;padding:1px 8px;white-space:nowrap">${c.type}</span></td>
          <td style="white-space:nowrap">${entTags}</td>
          <td class="r num">${fmt(c.total)}</td>
          <td class="r">
            <span class="num ${c.pct>=15?'neg':''}">${c.pct.toFixed(1)}%</span>
            <div class="cust-pct-bar"><div class="cust-pct-fill" style="width:${Math.min(c.pct/top3pct*100,100)}%"></div></div>
          </td>
          <td class="mini muted">${c.segment}</td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>
    <p class="mini muted" style="margin-top:10px">Consolidated view — the same customer appearing in multiple entities is aggregated here. Retail / walk-in buyers and untracked bookings sit in the residual. Click any row for full entity breakdown and unit-level detail.</p>
  </div>`;
  p.innerHTML=html;
}
function customerDrawer(id){
  const c=(DATA.customers||[]).find(x=>x.id===id);if(!c)return;
  const total=c.breakdown.reduce((s,b)=>s+b.revenue,0);
  const grpRev=consol('cur').rev||1;
  const maxRev=Math.max(...c.breakdown.map(b=>b.revenue));
  emit('VARIANCE','customer drill → '+c.name,'aggregating cross-entity revenue\nsingle-customer consolidated view','act');
  const rows=c.breakdown.map(b=>{
    const ent=DATA.entities.find(e=>e.code===b.entity)||{name:b.entity,vertical:''};
    const pct=total>0?b.revenue/total*100:0;
    const barW=maxRev>0?b.revenue/maxRev*80:0;
    return `<tr>
      <td class="mini"><b style="color:var(--ink)">${b.entity}</b><div class="mini muted" style="font-size:10px">${ent.name}</div></td>
      <td class="mini muted">${ent.vertical}</td>
      <td class="mini muted" style="max-width:180px">${b.desc}</td>
      <td class="r">${b.units>0?`<span class="mini muted">${b.units} units</span>`:'<span class="mini muted">income</span>'}</td>
      <td class="r num">${fmt(b.revenue)}</td>
      <td style="width:90px">
        <div style="background:var(--line);border-radius:3px;height:6px;overflow:hidden">
          <div style="background:var(--orange);height:100%;width:${barW}%;border-radius:3px"></div>
        </div>
        <div class="mini muted" style="text-align:right;margin-top:2px">${pct.toFixed(1)}%</div>
      </td>
    </tr>`;
  }).join('');
  openDrawer(`<div class="drawer-head"><div>
    <span class="tag-ag">CUSTOMER · CONSOLIDATED DRILL-DOWN</span>
    <div class="h2" style="margin-top:10px">${c.name}</div>
    <div class="mini muted">${c.type} · ${c.segment} · ${c.breakdown.length} entities</div>
  </div><div class="x" onclick="closeDrawer()">×</div></div>
  <div class="drawer-body">
    <div class="grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="card"><div class="kpi-label">Total revenue</div><div class="kpi-val num" style="font-size:20px">${fmt(total)}</div></div>
      <div class="card"><div class="kpi-label">% of group revenue</div><div class="kpi-val num" style="font-size:20px">${(total/grpRev*100).toFixed(1)}%</div></div>
      <div class="card"><div class="kpi-label">Entities</div><div class="kpi-val num" style="font-size:20px">${c.breakdown.length}</div><div class="mini muted">of 10 total</div></div>
    </div>
    <div class="reason-box" style="margin-bottom:14px"><span class="k">Cross-entity view.</span> This is the consolidated revenue from <b>${c.name}</b> summed across all FinTran legal entities where they are a customer. No individual entity controller sees the full picture — only the Group Controller and FP&A have this consolidated lens.</div>
    <table><thead><tr><th>Entity</th><th>Vertical</th><th>Description</th><th class="r">Units</th><th class="r">Revenue</th><th>Share</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="mini muted" style="margin-top:12px">Revenue shown on ${bLayer} basis at TB ${(DATA.tbVersions||[]).find(v=>v.status==='approved')?.version||'—'} (approved). Click entity in the Pack tab to see GL-level detail.</p>
  </div>`);
}
function renderEntityCtrlBody(f){
  const entityCode='RE-01';
  const entity=DATA.entities.find(e=>e.code===entityCode)||{name:'FinTran Properties LLC',code:entityCode,vertical:'Real Estate'};
  const lyr=LAYERS.find(l=>l[0]===bLayer);
  const rows=DATA.tb.filter(r=>r.entity===entityCode&&r.typ==='PL');
  const byL2={};
  rows.forEach(r=>{if(!byL2[r.l2])byL2[r.l2]=[];byL2[r.l2].push(r);});
  let html=`<div class="aud-scope-banner aud-entity">
    <div class="aud-scope-icon">EC</div>
    <div style="flex:1"><div class="aud-scope-title">${entity.name} &nbsp;<span class="mini muted" style="font-weight:400">${entity.code} · ${entity.vertical}</span></div>
    <div class="aud-scope-sub">Legal entity · Granular GL · No budget layer · ${lyr[1]} basis</div></div>
    <span class="mini muted" style="font-size:9.5px;max-width:180px;text-align:right;line-height:1.5">In production each controller sees only their assigned entity</span>
  </div>`;
  html+=`<div class="card" style="padding:0;overflow:hidden"><table><thead><tr>
    <th>GL</th><th>Account</th><th>L3 group</th>
    <th class="r">Current (AED)</th><th class="r">${lyr[1]}</th>
    <th class="r">Variance</th><th class="r">Δ%</th>
  </tr></thead><tbody>`;
  Object.entries(byL2).forEach(([l2,l2rows])=>{
    const l2cur=l2rows.reduce((s,r)=>s+r.cur,0);
    const l2cmp=l2rows.reduce((s,r)=>s+r[f],0);
    const l2va=l2cur-l2cmp;const l2d=pct(l2cur,l2cmp);
    html+=`<tr style="background:var(--panel-2)">
      <td colspan="2"><b style="color:var(--ink)">${l2}</b></td><td></td>
      <td class="r num"><b>${fmtN(Math.abs(l2cur))}</b></td><td class="r num"><b>${fmtN(Math.abs(l2cmp))}</b></td>
      <td class="r num ${l2va>=0?'pos':'neg'}"><b>${fmtN(l2va)}</b></td>
      <td class="r num ${l2d>=0?'pos':'neg'}"><b>${l2d>=0?'+':''}${l2d.toFixed(1)}%</b></td></tr>`;
    l2rows.slice().sort((a,b)=>Math.abs(b.cur)-Math.abs(a.cur)).forEach(r=>{
      const va=r.cur-r[f];const d=pct(r.cur,r[f]);
      html+=`<tr class="tap" onclick="drillTxn('${r.entity}','${r.gl}')">
        <td class="mini num" style="color:var(--ink-3)">${r.gl}</td><td class="mini">${r.gd}</td>
        <td class="mini muted">${r.l3||'—'}</td>
        <td class="r num">${fmtN(Math.abs(r.cur))}</td><td class="r num">${fmtN(Math.abs(r[f]))}</td>
        <td class="r num ${va>=0?'pos':'neg'}">${fmtN(va)}</td>
        <td class="r num ${d>=0?'pos':'neg'}">${d>=0?'+':''}${d.toFixed(1)}%</td></tr>`;
    });
  });
  html+=`</tbody></table></div>
  <p class="mini muted" style="margin-top:10px">${rows.length} P&L accounts · ${entityCode} · click any row to see journal-level detail and vendor attribution. No budget layer — switch to FP&A view for BvA.</p>`;
  return html;
}
function renderVerticalCtrlBody(f){
  const lyr=LAYERS.find(l=>l[0]===bLayer);
  const verticalMap={};
  DATA.entities.forEach(e=>{if(!verticalMap[e.vertical])verticalMap[e.vertical]=[];verticalMap[e.vertical].push(e.code);});
  const vAgg={};
  Object.entries(verticalMap).forEach(([v,codes])=>{
    let rev=0,cost=0,opex=0,revCmp=0,costCmp=0,opexCmp=0;
    DATA.tb.filter(r=>r.typ==='PL'&&codes.includes(r.entity)).forEach(r=>{
      if(r.l2==='Revenue'){rev+=r.cur;revCmp+=r[f];}
      else if(r.l2==='Direct Cost'){cost+=r.cur;costCmp+=r[f];}
      else{opex+=r.cur;opexCmp+=r[f];}
    });
    const revA=-rev,ebitda=revA-cost-opex,revCmpA=-revCmp,ebitdaCmp=revCmpA-costCmp-opexCmp;
    vAgg[v]={rev:revA,cost,opex,ebitda,ebitdaCmp,
      margin:revA>0?ebitda/revA*100:0,mom:pct(ebitda,ebitdaCmp),entities:codes.length,codes};
  });
  let html=`<div class="aud-scope-banner aud-vertical">
    <div class="aud-scope-icon">VC</div>
    <div style="flex:1"><div class="aud-scope-title">Group · ${Object.keys(verticalMap).length} Business Verticals · ${DATA.entities.length} Entities</div>
    <div class="aud-scope-sub">Multi-entity consolidation by vertical · No budget layer · ${lyr[1]} basis</div></div>
    <span class="mini muted" style="font-size:9.5px;max-width:200px;text-align:right;line-height:1.5">e.g. Real Estate Controller owns all ${(verticalMap['Real Estate']||[]).length} RE entities consolidated</span>
  </div>`;
  html+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:16px"><table><thead><tr>
    <th>Vertical</th><th>Entities</th>
    <th class="r">Revenue</th><th class="r">Direct Cost</th><th class="r">EBITDA</th>
    <th class="r">Margin</th><th class="r">EBITDA ${lyr[1]} Δ</th>
  </tr></thead><tbody>`;
  ['Real Estate','Hospitality','Investments','Corporate'].forEach(v=>{
    if(!vAgg[v])return;
    const va=vAgg[v];const isWatch=v==='Hospitality';
    html+=`<tr class="tap" onclick="verticalDrillDown('${v}')">
      <td><b style="color:var(--ink)">${v}</b>${isWatch?` <span class="chip risk" style="font-size:9px;padding:1px 7px">watch</span>`:''}
        <div class="mini muted" style="font-size:10px">${va.codes.join(' · ')}</div></td>
      <td class="mini" style="color:var(--ink-3)">${va.entities}</td>
      <td class="r num">${fmt(va.rev)}</td><td class="r num">${fmt(va.cost)}</td>
      <td class="r num">${fmt(va.ebitda)}</td>
      <td class="r num ${va.margin>=15?'pos':va.margin<5?'neg':''}">${va.margin.toFixed(1)}%</td>
      <td class="r num ${va.mom>=0?'pos':'neg'}">${va.mom>=0?'+':''}${va.mom.toFixed(1)}%</td></tr>`;
  });
  const totalRev=Object.values(vAgg).reduce((s,v)=>s+v.rev,0);
  const totalEB=Object.values(vAgg).reduce((s,v)=>s+v.ebitda,0);
  const totalEBCmp=Object.values(vAgg).reduce((s,v)=>s+v.ebitdaCmp,0);
  const totalMom=pct(totalEB,totalEBCmp);
  html+=`<tr style="border-top:2px solid var(--line-2);background:var(--panel-2)">
    <td colspan="2"><b style="color:var(--ink)">Group Total</b></td>
    <td class="r num"><b>${fmt(totalRev)}</b></td><td></td>
    <td class="r num"><b>${fmt(totalEB)}</b></td>
    <td class="r num"><b>${totalRev>0?(totalEB/totalRev*100).toFixed(1):0}%</b></td>
    <td class="r num ${totalMom>=0?'pos':'neg'}"><b>${totalMom>=0?'+':''}${totalMom.toFixed(1)}%</b></td></tr>`;
  html+=`</tbody></table></div>
  <p class="mini muted">Click any vertical to see entity breakdown. Hospitality margin is the current watch-item. No budget layer — switch to FP&A for BvA.</p>`;
  return html;
}
function verticalDrillDown(vertical){
  emit('VARIANCE','drill-down → '+vertical,'expanding to entity breakdown · no budget layer','act');
  const lyr=LAYERS.find(l=>l[0]===bLayer);
  const entities=DATA.entities.filter(e=>e.vertical===vertical);
  let rows='';
  entities.forEach(e=>{
    const a=entAgg(e.code);
    rows+=`<tr class="tap" onclick="entityDrawer('${e.code}')">
      <td><b style="color:var(--ink)">${e.code}</b></td><td class="mini">${e.name}</td>
      <td class="r num">${fmt(a.rev)}</td><td class="r num">${fmt(a.eb)}</td>
      <td class="r num ${a.mgn>=15?'pos':a.mgn<5?'neg':''}">${a.mgn.toFixed(1)}%</td>
      <td class="r num ${a.mom>=0?'pos':'neg'}">${a.mom>=0?'+':''}${a.mom.toFixed(1)}%</td></tr>`;
  });
  openDrawer(`<div class="drawer-head"><div>
    <span class="tag-ag">VERTICAL DRILL-DOWN</span>
    <div class="h2" style="margin-top:10px">${vertical} — entity breakdown</div>
    <div class="mini muted">${entities.length} entities · ${lyr[1]} basis · no budget layer</div>
  </div><div class="x" onclick="closeDrawer()">×</div></div>
  <div class="drawer-body">
    <table><thead><tr><th>Code</th><th>Entity</th><th class="r">Revenue</th><th class="r">EBITDA</th><th class="r">Margin</th><th class="r">${bLayer} Δ</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="mini muted" style="margin-top:12px">Click any entity for full P&L and open items. Budget layer not available in Vertical Controller view.</p>
  </div>`);
}
function commentaryFor(g,d){
  const m={'Revenue':'Real Estate handover milestones drove recognition; Hospitality flat.',
   'Direct Cost':'Construction cost tracked volume; Hospitality operating cost +34% (labour).',
   'Operating Expense':'S&M up ahead of new launches; finance cost stable on fixed facilities.'};
  return m[g]||'Movement explained from GL narration + vendor detail.';
}
function drillGroup(g){
  emit('VARIANCE','drill-down → '+g,'expanding to entity × GL head\ntracing to transaction layer','act');
  const f=cmpField();
  const rows=DATA.tb.filter(r=>r.l2===g).sort((a,b)=>Math.abs(b.cur-b[f])-Math.abs(a.cur-a[f])).slice(0,12);
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">DRILL-DOWN</span>
    <div class="h2" style="margin-top:10px">${g} — entity × GL head</div>
    <div class="mini muted">consolidated → entity → GL · ${bLayer} basis</div></div><div class="x" onclick="closeDrawer()">×</div></div>
    <div class="drawer-body"><table><thead><tr><th>Entity</th><th>GL</th><th class="r">Current</th><th class="r">Var</th></tr></thead><tbody>
    ${rows.map(r=>{const va=r.cur-r[f];return `<tr class="tap" onclick="drillTxn('${r.entity}','${r.gl}')"><td class="mini">${r.entity}</td><td class="mini">${r.gd}</td><td class="r num">${fmtN(Math.abs(r.cur))}</td><td class="r num ${va>=0?'pos':'neg'}">${fmtN(va)}</td></tr>`}).join('')}
    </tbody></table><p class="mini muted" style="margin-top:12px">Click any row to reach transaction-level GL detail with vendor, PO and narration — the answer to "show me the transaction behind that variance".</p></div>`);
}
function drillTxn(entity,gl){
  emit('EXTRACT','fetched GL detail '+entity+'/'+gl,'pulling journal lines + narration\nvendor + PO enrichment applied','done');
  const v=DATA.vendors, p=DATA.projects;
  const tbRow=DATA.tb.find(r=>r.entity===entity&&r.gl===gl);
  const bal=tbRow?Math.abs(tbRow.cur):12000000;
  const rnd=rng(hashStr(entity+'|'+gl));   // deterministic: same drill always shows same lines
  // weights normalised so the 6 visible lines tie exactly to the closing balance
  const w=[...Array(6)].map(()=>0.4+rnd()); const tw=w.reduce((a,b)=>a+b,0);
  let rows='',run=0;
  for(let i=0;i<6;i++){
    const amt=(i<5)?Math.round(bal*w[i]/tw):Math.round(bal-run); run+=amt;
    const vd=v[Math.floor(rnd()*v.length)];const pr=p[Math.floor(rnd()*p.length)];const po='PO-'+(44000+Math.floor(rnd()*999));
    const day=String(1+Math.floor(rnd()*28)).padStart(2,'0');
    rows+=`<tr><td class="mini num">JE-${82140+i}</td><td class="mini num">${day}-May-26</td><td class="mini">${vd}</td><td class="mini num">${po}</td><td class="mini">${pr} · ${['progress billing','milestone certification','monthly recharge','retention release'][Math.floor(rnd()*4)]}</td><td class="r num">${fmtN(amt)}</td></tr>`;}
  rows+=`<tr style="border-top:2px solid var(--line-2)"><td colspan="5"><b style="color:var(--ink)">Closing balance — ties to TB</b></td><td class="r num"><b style="color:var(--orange-soft)">${fmtN(bal)}</b></td></tr>`;
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">TRANSACTION LAYER</span>
   <div class="h2" style="margin-top:10px">${entity} · GL ${gl}</div><div class="mini muted">journal lines · auto-enriched narration</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body"><table><thead><tr><th>JE</th><th>Date</th><th>Vendor</th><th>PO</th><th>Narration <span class="tag-ag">AI</span></th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
   <div class="reason-box" style="margin-top:16px"><span class="k">Narration agent.</span> Free-text narration at entry was sparse ("payment"). The agent re-derived each line from invoice + PO + contract into a structured form — vendor, PO, value, service, period, department — which is what makes this drill-down answerable at all.</div></div>`);
}
function exportPack(){
  emit('COMMENTARY','building '+bAudience+' PPTX pack','PptxGenJS · Tiger brand · live data','act');
  const pptx=new PptxGenJS();
  pptx.defineLayout({name:'WIDE',width:13.33,height:7.5});
  pptx.layout='WIDE';

  // ── Tiger brand palette ──────────────────────────────────────────
  const ONG='F08C1E', DRK='1C1C1C', WHT='FFFFFF', GRY='F2F2F2',
        GRY2='E4E4E0', INK='404040', TEAL='1E5F8E', OK='1E7E54', RISK='C03A2B';
  const hFont='Arial'; const bFont='Arial';

  // helper: orange bottom border bar on every slide
  function brand(sl){
    sl.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
    sl.addText('Tiger Analytics · Confidential',{x:0.3,y:7.38,w:6,h:0.12,fontSize:6,color:'AAAAAA',fontFace:bFont,align:'left'});
    sl.addText('May 2026 Close · '+bAudience,{x:7,y:7.38,w:6.03,h:0.12,fontSize:6,color:'AAAAAA',fontFace:bFont,align:'right'});
  }

  // helper: section eyebrow
  function eyebrow(sl,t,x,y){sl.addText(t,{x,y,w:12,h:0.22,fontSize:8,bold:true,color:ONG,fontFace:hFont,charSpacing:1.5});}

  // helper: draw a simple bar chart inline using rectangles
  function inlineBar(sl,items,x,y,w,h,maxV){
    const bw=w/items.length*0.6, gap=w/items.length;
    items.forEach((it,i)=>{
      const bh=h*(it.v/maxV); const bx=x+i*gap+(gap-bw)/2; const by=y+h-bh;
      sl.addShape(pptx.ShapeType.rect,{x:bx,y:by,w:bw,h:bh,fill:{color:it.c||ONG}});
      sl.addText(it.l,{x:bx-0.1,y:y+h+0.01,w:bw+0.2,h:0.16,fontSize:6,color:INK,fontFace:bFont,align:'center'});
    });
  }

  const c=consol('cur'), p=consol('prior'), b=consol('bud');
  const f=cmpField(); const lyr=LAYERS.find(l=>l[0]===bLayer);
  const md=hosMarginDelta().toFixed(1);

  // ── SLIDE 1: COVER ─────────────────────────────────────────────
  const s1=pptx.addSlide();
  s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:DRK}});
  s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:ONG}});
  s1.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
  s1.addText('CloseIQ',{x:0.6,y:1.8,w:12,h:0.7,fontSize:42,bold:true,color:ONG,fontFace:hFont});
  s1.addText('Month-End Close — Executive Pack',{x:0.6,y:2.55,w:12,h:0.45,fontSize:22,color:WHT,fontFace:hFont});
  s1.addText('FinTran Group · May 2026',{x:0.6,y:3.15,w:12,h:0.32,fontSize:15,color:'AAAAAA',fontFace:bFont});
  s1.addShape(pptx.ShapeType.line,{x:0.6,y:3.6,w:11,h:0,line:{color:ONG,width:0.75}});
  s1.addText('Audience: '+bAudience,{x:0.6,y:3.75,w:6,h:0.26,fontSize:11,color:'CCCCCC',fontFace:bFont});
  s1.addText('Generated by Tiger Analytics · CloseIQ v2.4.1',{x:0.6,y:6.9,w:12,h:0.2,fontSize:8,color:'888888',fontFace:bFont});

  // ── SLIDE 2: HEADLINE KPIs ──────────────────────────────────────
  const s2=pptx.addSlide(); s2.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:WHT}});
  brand(s2); eyebrow(s2,'EXECUTIVE SUMMARY',0.4,0.28);
  s2.addText('Group close is on track. Three items need your attention.',{x:0.4,y:0.55,w:12.5,h:0.5,fontSize:20,bold:true,color:DRK,fontFace:hFont});
  // KPI boxes
  const kpis=[
    {l:'Group Revenue',v:fmt(c.rev),s:pct(c.rev,p.rev).toFixed(1)+'% vs prior',c:ONG},
    {l:'EBITDA',v:fmt(c.ebitda),s:pct(c.ebitda,b.ebitda).toFixed(1)+'% vs budget',c:OK},
    {l:'Recoverable (BS)',v:fmt(DATA.stats.recoverable),s:'8 items flagged',c:'A8731B'},
    {l:'IC Matched',v:DATA.stats.ic_matched+'/'+DATA.stats.ic_total,s:fmt(DATA.stats.ic_unmatched_val)+' in review',c:TEAL},
  ];
  kpis.forEach((k,i)=>{
    const bx=0.4+i*3.2;
    s2.addShape(pptx.ShapeType.rect,{x:bx,y:1.2,w:3.0,h:1.5,fill:{color:GRY},line:{color:GRY2,width:0.5}});
    s2.addShape(pptx.ShapeType.rect,{x:bx,y:1.2,w:3.0,h:0.06,fill:{color:k.c}});
    s2.addText(k.l,{x:bx+0.12,y:1.3,w:2.76,h:0.22,fontSize:8,bold:true,color:INK,fontFace:bFont,charSpacing:.5});
    s2.addText(k.v,{x:bx+0.12,y:1.55,w:2.76,h:0.52,fontSize:20,bold:true,color:DRK,fontFace:hFont});
    s2.addText(k.s,{x:bx+0.12,y:2.1,w:2.76,h:0.22,fontSize:8,color:INK,fontFace:bFont});
  });
  // Sage strategic read
  s2.addShape(pptx.ShapeType.rect,{x:0.4,y:2.85,w:12.5,h:1.7,fill:{color:'FFF8F0'},line:{color:ONG,width:0.8}});
  s2.addShape(pptx.ShapeType.rect,{x:0.4,y:2.85,w:0.06,h:1.7,fill:{color:ONG}});
  s2.addText('SAGE · Strategic read',{x:0.6,y:2.92,w:12,h:0.22,fontSize:8,bold:true,color:ONG,fontFace:bFont,charSpacing:.5});
  s2.addText('This is a clean close on the topline — Real Estate handover recognition carried group revenue to '+fmt(c.rev)+', slightly ahead of budget. The story underneath is mix, not magnitude. Hospitality margin compressed '+md+' points as operating cost rose +34% on flat revenue; left unexamined it will reset the run-rate. The balance sheet carries '+fmt(DATA.stats.recoverable)+' of recoverable aged positions — a real P&L opportunity this period.',
    {x:0.6,y:3.18,w:12.2,h:1.2,fontSize:10,color:DRK,fontFace:bFont,valign:'top'});
  // Recommended actions
  eyebrow(s2,'RECOMMENDED ACTIONS (ranked)',0.4,4.7);
  const acts=[
    ['1','Approve high-confidence write-backs','Clean P&L pickup this period · 3 items >90% confidence','+'+fmt(DATA.stats.writeback)],
    ['2','Pressure-test Hospitality labour cost','Confirm structural vs one-off before FY forecast reset','Margin risk'],
    ['3','Clear intercompany timing items','3 unmatched pairs · resolvable before consolidation locks',fmt(DATA.stats.ic_unmatched_val)],
  ];
  acts.forEach((a,i)=>{
    const ay=4.95+i*0.68;
    s2.addShape(pptx.ShapeType.rect,{x:0.4,y:ay,w:12.5,h:0.58,fill:{color:GRY},line:{color:GRY2,width:0.5}});
    s2.addShape(pptx.ShapeType.rect,{x:0.4,y:ay,w:0.32,h:0.58,fill:{color:ONG}});
    s2.addText(a[0],{x:0.4,y:ay,w:0.32,h:0.58,fontSize:12,bold:true,color:WHT,fontFace:hFont,align:'center',valign:'middle'});
    s2.addText(a[1],{x:0.82,y:ay+0.06,w:8.5,h:0.24,fontSize:10,bold:true,color:DRK,fontFace:hFont});
    s2.addText(a[2],{x:0.82,y:ay+0.3,w:8.5,h:0.2,fontSize:8,color:INK,fontFace:bFont});
    s2.addText(a[3],{x:9.5,y:ay+0.1,w:3.2,h:0.3,fontSize:11,bold:true,color:ONG,fontFace:hFont,align:'right'});
  });

  // ── SLIDE 3: P&L VARIANCE TABLE ─────────────────────────────────
  const s3=pptx.addSlide(); s3.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:WHT}}); brand(s3);
  eyebrow(s3,'P&L VARIANCE · '+lyr[1].toUpperCase()+' BASIS · '+bAudience.toUpperCase(),0.4,0.28);
  s3.addText('Group Consolidated — '+bLayer+' comparison',{x:0.4,y:0.55,w:12.5,h:0.4,fontSize:16,bold:true,color:DRK,fontFace:hFont});

  // table headers
  const tCols=[{w:4.2},{w:2.4},{w:2.4},{w:2.2},{w:2.13}];
  const hdr=['P&L Group','Current (AED)','Prior (AED)','Variance','Δ%'];
  const hx=[0.4,4.7,7.1,9.5,11.7];
  s3.addShape(pptx.ShapeType.rect,{x:0.4,y:1.1,w:12.5,h:0.32,fill:{color:DRK}});
  hdr.forEach((h,i)=>s3.addText(h,{x:hx[i],y:1.12,w:tCols[i].w,h:0.28,fontSize:8.5,bold:true,color:WHT,fontFace:bFont,align:i>0?'right':'left'}));

  const groups={};
  DATA.tb.filter(r=>r.typ==='PL').forEach(r=>{groups[r.l2]=groups[r.l2]||{cur:0,cmp:0};groups[r.l2].cur+=r.cur;groups[r.l2].cmp+=r[f];});
  let ry=1.48;
  Object.entries(groups).forEach(([g,v],idx)=>{
    const va=v.cur-v.cmp; const d=pct(v.cur,v.cmp); const bg=idx%2===0?WHT:GRY;
    s3.addShape(pptx.ShapeType.rect,{x:0.4,y:ry,w:12.5,h:0.36,fill:{color:bg}});
    s3.addText(g,{x:hx[0],y:ry+0.06,w:4.0,h:0.26,fontSize:9,bold:true,color:DRK,fontFace:bFont});
    s3.addText(fmtN(Math.abs(v.cur)),{x:hx[1],y:ry+0.06,w:2.2,h:0.26,fontSize:9,color:INK,fontFace:bFont,align:'right'});
    s3.addText(fmtN(Math.abs(v.cmp)),{x:hx[2],y:ry+0.06,w:2.2,h:0.26,fontSize:9,color:INK,fontFace:bFont,align:'right'});
    const vaCol=va>=0?OK:RISK;
    s3.addText(fmtN(va),{x:hx[3],y:ry+0.06,w:2.0,h:0.26,fontSize:9,bold:true,color:vaCol,fontFace:bFont,align:'right'});
    s3.addText((d>=0?'+':'')+d.toFixed(1)+'%',{x:hx[4],y:ry+0.06,w:1.9,h:0.26,fontSize:9,bold:true,color:vaCol,fontFace:bFont,align:'right'});
    ry+=0.36;
  });
  // EBITDA total row
  s3.addShape(pptx.ShapeType.rect,{x:0.4,y:ry,w:12.5,h:0.38,fill:{color:DRK}});
  s3.addText('EBITDA',{x:hx[0],y:ry+0.07,w:4.0,h:0.26,fontSize:9.5,bold:true,color:WHT,fontFace:hFont});
  s3.addText(fmtN(c.ebitda),{x:hx[1],y:ry+0.07,w:2.2,h:0.26,fontSize:9.5,bold:true,color:WHT,fontFace:hFont,align:'right'});
  s3.addText(fmtN(p.ebitda),{x:hx[2],y:ry+0.07,w:2.2,h:0.26,fontSize:9.5,bold:true,color:WHT,fontFace:hFont,align:'right'});
  const ebD=c.ebitda-p.ebitda;
  s3.addText(fmtN(ebD),{x:hx[3],y:ry+0.07,w:2.0,h:0.26,fontSize:9.5,bold:true,color:ebD>=0?'5fe0b0':RISK,fontFace:hFont,align:'right'});
  s3.addText((ebD>=0?'+':'')+pct(c.ebitda,p.ebitda).toFixed(1)+'%',{x:hx[4],y:ry+0.07,w:1.9,h:0.26,fontSize:9.5,bold:true,color:ebD>=0?'5fe0b0':RISK,fontFace:hFont,align:'right'});
  ry+=0.56;
  // agent commentary per group (if enough space)
  if(ry<5.8){eyebrow(s3,'AI COMMENTARY',0.4,ry+0.1);ry+=0.38;
    const comms={'Revenue':'Real Estate handover milestones drove recognition; Hospitality flat.',
     'Direct Cost':'Construction cost tracked volume; Hospitality operating cost +34% (labour spike).',
     'Operating Expense':'S&M up ahead of new launches; finance cost stable on fixed facilities.'};
    Object.entries(comms).forEach(([g,t])=>{
      if(ry>6.8)return;
      s3.addShape(pptx.ShapeType.rect,{x:0.4,y:ry,w:0.06,h:0.42,fill:{color:ONG}});
      s3.addText(g+': '+t,{x:0.58,y:ry+0.06,w:12.3,h:0.32,fontSize:8.5,color:INK,fontFace:bFont});ry+=0.46;});}

  // ── SLIDE 4: BALANCE-SHEET CLEANUP ──────────────────────────────
  const s4=pptx.addSlide(); s4.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:WHT}}); brand(s4);
  eyebrow(s4,'TRIAL BALANCE SCRUTINY · RECOVERABLE POSITIONS',0.4,0.28);
  s4.addText(fmt(DATA.stats.recoverable)+' sitting on the balance sheet — agents found it.',{x:0.4,y:0.55,w:12.5,h:0.4,fontSize:16,bold:true,color:DRK,fontFace:hFont});
  // sub-KPIs
  [{l:'Total Recoverable',v:fmt(DATA.stats.recoverable),c:ONG},{l:'Write-back this period',v:fmt(DATA.stats.writeback),c:OK},{l:'High-risk items',v:'3',c:RISK},{l:'Avg age',v:'14 mo',c:'A8731B'}].forEach((k,i)=>{
    const bx=0.4+i*3.2;
    s4.addShape(pptx.ShapeType.rect,{x:bx,y:1.1,w:3.0,h:0.9,fill:{color:GRY},line:{color:GRY2,width:0.5}});
    s4.addShape(pptx.ShapeType.rect,{x:bx,y:1.1,w:3.0,h:0.05,fill:{color:k.c}});
    s4.addText(k.l,{x:bx+0.1,y:1.18,w:2.8,h:0.2,fontSize:7.5,bold:true,color:INK,fontFace:bFont,charSpacing:.5});
    s4.addText(k.v,{x:bx+0.1,y:1.4,w:2.8,h:0.38,fontSize:18,bold:true,color:DRK,fontFace:hFont});
  });
  // scrutiny table
  s4.addShape(pptx.ShapeType.rect,{x:0.4,y:2.12,w:12.5,h:0.3,fill:{color:DRK}});
  ['ID','Account','Vendor','Amount','Age','Risk','Recommendation'].forEach((h,i)=>{const xs=[0.48,1.18,3.5,6.3,8.1,8.8,9.6];
    s4.addText(h,{x:xs[i],y:2.15,w:[0.62,2.2,2.7,1.7,0.6,0.7,3.2][i],h:0.24,fontSize:7.5,bold:true,color:WHT,fontFace:bFont,align:i>=3?'right':'left'});});
  DATA.scrutiny.forEach((s,i)=>{
    const sy=2.47+i*0.44; if(sy>6.85)return;
    const bg=i%2===0?WHT:GRY;
    s4.addShape(pptx.ShapeType.rect,{x:0.4,y:sy,w:12.5,h:0.4,fill:{color:bg}});
    const rc=s.risk==='High'?RISK:s.risk==='Medium'?'A8731B':OK;
    const xs=[0.48,1.18,3.5,6.3,8.1,8.8,9.6];
    [s.id,s.acct,s.vendor,fmtN(s.amount),s.age+'mo',s.risk,s.rec].forEach((v,j)=>{
      s4.addText(v,{x:xs[j],y:sy+0.08,w:[0.62,2.2,2.7,1.7,0.6,0.7,3.2][j],h:0.26,fontSize:8,bold:j===5,color:j===5?rc:INK,fontFace:bFont,align:j>=3?'right':'left'});});
  });

  // ── SLIDE 5: ENTITY PERFORMANCE ─────────────────────────────────
  const s5=pptx.addSlide(); s5.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:WHT}}); brand(s5);
  eyebrow(s5,'ENTITY PERFORMANCE',0.4,0.28);
  s5.addText('All 10 entities · May 2026 · click any in CloseIQ to drill to transaction',{x:0.4,y:0.55,w:12.5,h:0.35,fontSize:12,color:INK,fontFace:bFont});
  s5.addShape(pptx.ShapeType.rect,{x:0.4,y:1.02,w:12.5,h:0.3,fill:{color:DRK}});
  ['Entity','Name','Vertical','Revenue','EBITDA','Margin','MoM'].forEach((h,i)=>{const xs=[0.48,1.1,3.0,5.2,7.4,9.4,10.8];const ws=[0.55,1.8,2.1,2.1,1.9,1.3,1.8];
    s5.addText(h,{x:xs[i],y:1.05,w:ws[i],h:0.24,fontSize:7.5,bold:true,color:WHT,fontFace:bFont,align:i>=3?'right':'left'});});
  DATA.entities.forEach((e,i)=>{
    const a=entAgg(e.code); const ey=1.37+i*0.55; if(ey>7.1)return;
    const bg=i%2===0?WHT:GRY;
    s5.addShape(pptx.ShapeType.rect,{x:0.4,y:ey,w:12.5,h:0.5,fill:{color:bg}});
    const momC=a.mom>=0?OK:RISK;
    const xs=[0.48,1.1,3.0,5.2,7.4,9.4,10.8];const ws=[0.55,1.8,2.1,2.1,1.9,1.3,1.8];
    [e.code,e.name,e.vertical,fmtN(a.rev),fmtN(a.eb),a.mgn.toFixed(1)+'%',(a.mom>=0?'+':'')+a.mom.toFixed(1)+'%'].forEach((v,j)=>{
      s5.addText(v,{x:xs[j],y:ey+0.12,w:ws[j],h:0.26,fontSize:8,color:j===6?momC:INK,bold:j===0,fontFace:bFont,align:j>=3?'right':'left'});});
    // margin mini-bar
    const mw=Math.min(Math.abs(a.mgn)/60*1.1,1.1);
    s5.addShape(pptx.ShapeType.rect,{x:9.4,y:ey+0.33,w:mw,h:0.08,fill:{color:a.mgn>15?OK:a.mgn>5?ONG:RISK}});
  });

  // ── SLIDE 6: ROI & CLOSE ─────────────────────────────────────────
  const s6=pptx.addSlide(); s6.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:DRK}}); 
  s6.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
  s6.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:ONG}});
  eyebrow(s6,'THE BUSINESS CASE',0.6,1.0);
  s6.addText('Month one findings exceed the cost of the programme.',{x:0.6,y:1.28,w:12,h:0.6,fontSize:22,bold:true,color:WHT,fontFace:hFont});
  [{l:'Close runtime',v:'4 hours',s:'vs 1.5–2 days manual'},{l:'Capacity returned',v:'~22 days',s:'controller days/month · 10 entities'},{l:'Value surfaced',v:fmt(45700000),s:'P&L + cash · month one alone'}].forEach((k,i)=>{
    const bx=0.6+i*4.2;
    s6.addShape(pptx.ShapeType.rect,{x:bx,y:2.3,w:3.8,h:2.2,fill:{color:'292724'},line:{color:'3A3835',width:0.5}});
    s6.addShape(pptx.ShapeType.rect,{x:bx,y:2.3,w:3.8,h:0.06,fill:{color:i===2?ONG:OK}});
    s6.addText(k.l,{x:bx+0.15,y:2.45,w:3.5,h:0.24,fontSize:8.5,bold:true,color:'AAAAAA',fontFace:bFont,charSpacing:.5});
    s6.addText(k.v,{x:bx+0.15,y:2.75,w:3.5,h:0.8,fontSize:26,bold:true,color:i===2?ONG:OK,fontFace:hFont});
    s6.addText(k.s,{x:bx+0.15,y:3.62,w:3.5,h:0.35,fontSize:8,color:'AAAAAA',fontFace:bFont});
  });
  s6.addShape(pptx.ShapeType.line,{x:0.6,y:5.05,w:12,h:0,line:{color:'3A3835',width:0.5}});
  s6.addText('Three questions answered.',{x:0.6,y:5.2,w:12,h:0.35,fontSize:13,bold:true,color:ONG,fontFace:hFont});
  s6.addText('Can it do the close — yes, in hours.   Can you trust it enough to sign — every number drills to the transaction and every action is signed and audited.   Is it smarter than your report — you just talked to it.',{x:0.6,y:5.6,w:12,h:0.85,fontSize:10,color:'CCCCCC',fontFace:bFont});
  s6.addText('Powered by Tiger Analytics · CloseIQ · Autonomous Month-End Close',{x:0.6,y:6.95,w:12,h:0.22,fontSize:8,color:'666666',fontFace:bFont,align:'center'});

  // ── EXPORT ───────────────────────────────────────────────────────
  const fn='CloseIQ_FinTran_'+bAudience.replace(/\s+/g,'_')+'_May2026.pptx';
  pptx.writeFile({fileName:fn}).then(()=>{
    emit('COMMENTARY','PPTX exported · '+fn,'6 slides · Tiger brand · audience: '+bAudience,'done');
    toast('✓ Exported: '+fn);
  }).catch(e=>{toast('Export failed: '+e.message);console.error(e);});
}

/* ---------- EMAIL PACK ---------- */
// EmailJS config — uses free public service. Works in browser, no backend needed.
// Service/template IDs below are pre-configured for CloseIQ demo sends.
const EJS = {
  svcId:  'service_closiq',     // EmailJS service ID
  tplId:  'template_closiq',    // EmailJS template ID
  pubKey: 'demo_public_key'     // EmailJS public key (set to your own for live sending)
};
let _pptxBase64 = null;  // cached after generation

function emailBodyText(){
  const c=consol('cur'), p=consol('prior'), md=hosMarginDelta().toFixed(1);
  return `Dear Colleague,

Please find attached the CloseIQ Month-End Close Pack for May 2026 — ${bAudience} view.

EXECUTIVE SUMMARY
─────────────────
Group Revenue:  ${fmt(c.rev)}  (${pct(c.rev,p.rev)>=0?'▲':'▼'} ${Math.abs(pct(c.rev,p.rev)).toFixed(1)}% MoM)
EBITDA:         ${fmt(c.ebitda)}  (${pct(c.ebitda,consol('bud').ebitda)>=0?'+':''}${pct(c.ebitda,consol('bud').ebitda).toFixed(1)}% vs budget)
Recoverable BS: ${fmt(DATA.stats.recoverable)}  (8 aged items flagged by scrutiny agent)

STRATEGIC FINDINGS — REQUIRES YOUR ATTENTION
─────────────────────────────────────────────
1. Approve high-confidence write-backs (${fmt(DATA.stats.writeback)}) — clean P&L pickup this period
2. Hospitality margin compressed ${md} points — confirm structural vs one-off before FY forecast
3. Clear ${fmt(DATA.stats.ic_unmatched_val)} intercompany timing differences before consolidation locks

CLOSE CONFIDENCE: 96%  ·  3 items pending human sign-off

This pack was generated by CloseIQ — Tiger Analytics Autonomous Month-End Close engine.
Agents analysed 487 GL balances across 10 entities and surfaced AED 45.7M of P&L and cash opportunity.

—
Powered by Tiger Analytics · CloseIQ v2.4.1
Audience: ${bAudience}  ·  Period: May 2026  ·  Generated: ${new Date().toLocaleString('en-GB')}`;
}

function openEmailModal(){
  // pre-fill content
  el('emailSubject').value = `CloseIQ · ${bAudience} Pack · FinTran Month-End Close · May 2026`;
  el('emailBody').value = emailBodyText();
  el('emailTo').value = '';
  el('emailStatus').textContent = '';
  el('emailStatus').className = 'email-status';
  el('sendEmailBtn').disabled = false;
  el('emailModal').classList.add('on');
  setTimeout(()=>el('emailTo').focus(), 200);
}
function closeEmailModal(){
  el('emailModal').classList.remove('on');
  _pptxBase64 = null;
}
// click outside to close
document.addEventListener('click', e=>{
  if(e.target===el('emailModal')) closeEmailModal();
});

function emailPack(){
  emit('COMMENTARY','preparing pack for email delivery','generating PPTX · encoding · composing body','act');
  openEmailModal();
}

async function buildPptxBase64(){
  if(_pptxBase64) return _pptxBase64;
  const pptx=new PptxGenJS();
  pptx.defineLayout({name:'WIDE',width:13.33,height:7.5});pptx.layout='WIDE';
  const ONG='F08C1E',DRK='1C1C1C',WHT='FFFFFF',GRY='F2F2F2',GRY2='E4E4E0',INK='404040',OK='1E7E54',RISK='C03A2B',TEAL='1E5F8E';
  const hFont='Arial',bFont='Arial';
  const c=consol('cur'),p=consol('prior'),b=consol('bud');
  const f=cmpField();
  // Cover
  const s1=pptx.addSlide();
  s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:DRK}});
  s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:ONG}});
  s1.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
  s1.addText('CloseIQ',{x:0.6,y:1.8,w:12,h:0.7,fontSize:42,bold:true,color:ONG,fontFace:hFont});
  s1.addText('Month-End Close — '+bAudience+' Pack',{x:0.6,y:2.55,w:12,h:0.45,fontSize:22,color:WHT,fontFace:hFont});
  s1.addText('FinTran Group · May 2026',{x:0.6,y:3.15,w:12,h:0.32,fontSize:15,color:'AAAAAA',fontFace:bFont});
  s1.addText('Powered by Tiger Analytics · CloseIQ v2.4.1',{x:0.6,y:6.9,w:12,h:0.2,fontSize:8,color:'888888',fontFace:bFont});
  // Summary slide
  const s2=pptx.addSlide();s2.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:WHT}});
  s2.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
  s2.addText('EXECUTIVE SUMMARY',{x:0.4,y:0.28,w:12,h:0.22,fontSize:8,bold:true,color:ONG,fontFace:bFont,charSpacing:1.5});
  s2.addText('Group close is on track. Three items need your attention.',{x:0.4,y:0.55,w:12.5,h:0.5,fontSize:20,bold:true,color:DRK,fontFace:hFont});
  [{l:'Revenue',v:fmt(c.rev),s:pct(c.rev,p.rev).toFixed(1)+'% MoM',c:ONG},{l:'EBITDA',v:fmt(c.ebitda),s:pct(c.ebitda,b.ebitda).toFixed(1)+'% vs budget',c:OK},{l:'Recoverable',v:fmt(DATA.stats.recoverable),s:'8 items · write-back '+fmt(DATA.stats.writeback),c:'A8731B'},{l:'IC Matched',v:DATA.stats.ic_matched+'/'+DATA.stats.ic_total,s:fmt(DATA.stats.ic_unmatched_val)+' in review',c:TEAL}].forEach((k,i)=>{
    const bx=0.4+i*3.2;
    s2.addShape(pptx.ShapeType.rect,{x:bx,y:1.2,w:3.0,h:1.5,fill:{color:GRY},line:{color:GRY2,width:0.5}});
    s2.addShape(pptx.ShapeType.rect,{x:bx,y:1.2,w:3.0,h:0.06,fill:{color:k.c}});
    s2.addText(k.l,{x:bx+0.12,y:1.3,w:2.76,h:0.22,fontSize:8,bold:true,color:INK,fontFace:bFont});
    s2.addText(k.v,{x:bx+0.12,y:1.55,w:2.76,h:0.52,fontSize:20,bold:true,color:DRK,fontFace:hFont});
    s2.addText(k.s,{x:bx+0.12,y:2.1,w:2.76,h:0.22,fontSize:8,color:INK,fontFace:bFont});
  });
  const md=hosMarginDelta().toFixed(1);
  s2.addShape(pptx.ShapeType.rect,{x:0.4,y:2.85,w:12.5,h:1.5,fill:{color:'FFF8F0'},line:{color:ONG,width:0.8}});
  s2.addShape(pptx.ShapeType.rect,{x:0.4,y:2.85,w:0.06,h:1.5,fill:{color:ONG}});
  s2.addText('SAGE · Strategic read on this close',{x:0.6,y:2.92,w:12,h:0.22,fontSize:8,bold:true,color:ONG,fontFace:bFont});
  s2.addText('Clean on the topline — Real Estate carried group revenue to '+fmt(c.rev)+', slightly ahead of budget. Hospitality margin compressed '+md+' pts on flat revenue (+34% operating cost). Balance sheet holds '+fmt(DATA.stats.recoverable)+' of recoverable aged positions — a real P&L opportunity. None of this is a fire. All of it is worth a decision before you sign.',
    {x:0.6,y:3.18,w:12.2,h:1.1,fontSize:10,color:DRK,fontFace:bFont,valign:'top'});
  s2.addText('RECOMMENDED ACTIONS',{x:0.4,y:4.45,w:12,h:0.22,fontSize:8,bold:true,color:ONG,fontFace:bFont,charSpacing:1.5});
  [{r:'Approve high-confidence write-backs',d:'3 items >90% confidence · clean P&L pickup',n:'+'+fmt(DATA.stats.writeback)},
   {r:'Pressure-test Hospitality labour cost',d:'Confirm structural vs one-off before FY forecast',n:'Margin risk'},
   {r:'Clear intercompany timing items',d:'3 pairs · resolvable before consolidation locks',n:fmt(DATA.stats.ic_unmatched_val)}].forEach((a,i)=>{
    const ay=4.7+i*0.68;
    s2.addShape(pptx.ShapeType.rect,{x:0.4,y:ay,w:12.5,h:0.58,fill:{color:GRY},line:{color:GRY2,width:0.5}});
    s2.addShape(pptx.ShapeType.rect,{x:0.4,y:ay,w:0.32,h:0.58,fill:{color:ONG}});
    s2.addText(String(i+1),{x:0.4,y:ay,w:0.32,h:0.58,fontSize:13,bold:true,color:WHT,fontFace:hFont,align:'center',valign:'middle'});
    s2.addText(a.r,{x:0.82,y:ay+0.06,w:8.5,h:0.24,fontSize:10,bold:true,color:DRK,fontFace:hFont});
    s2.addText(a.d,{x:0.82,y:ay+0.3,w:8.5,h:0.2,fontSize:8,color:INK,fontFace:bFont});
    s2.addText(a.n,{x:9.5,y:ay+0.1,w:3.2,h:0.3,fontSize:11,bold:true,color:ONG,fontFace:hFont,align:'right'});
  });
  // ROI close
  const s3=pptx.addSlide();
  s3.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:7.5,fill:{color:DRK}});
  s3.addShape(pptx.ShapeType.rect,{x:0,y:7.38,w:13.33,h:0.12,fill:{color:ONG}});
  s3.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:ONG}});
  s3.addText('The Business Case',{x:0.6,y:1.3,w:12,h:0.6,fontSize:28,bold:true,color:ONG,fontFace:hFont});
  s3.addText('Month one findings exceed the cost of the programme.',{x:0.6,y:2.0,w:12,h:0.4,fontSize:17,color:WHT,fontFace:hFont});
  [{l:'Close runtime',v:'4 hours',s:'vs 1.5–2 days manual'},{l:'Capacity returned',v:'~22 days/mo',s:'controller days · 10 entities'},{l:'Value surfaced',v:fmt(45700000),s:'P&L + cash · month one'}].forEach((k,i)=>{
    const bx=0.6+i*4.2;
    s3.addShape(pptx.ShapeType.rect,{x:bx,y:2.8,w:3.8,h:2.0,fill:{color:'292724'},line:{color:'3A3835',width:0.5}});
    s3.addShape(pptx.ShapeType.rect,{x:bx,y:2.8,w:3.8,h:0.05,fill:{color:i===2?ONG:OK}});
    s3.addText(k.l,{x:bx+0.15,y:2.94,w:3.5,h:0.22,fontSize:8,bold:true,color:'AAAAAA',fontFace:bFont});
    s3.addText(k.v,{x:bx+0.15,y:3.2,w:3.5,h:0.7,fontSize:24,bold:true,color:i===2?ONG:OK,fontFace:hFont});
    s3.addText(k.s,{x:bx+0.15,y:3.96,w:3.5,h:0.3,fontSize:8,color:'AAAAAA',fontFace:bFont});
  });
  s3.addText('Powered by Tiger Analytics · CloseIQ · Autonomous Month-End Close',{x:0.6,y:7.1,w:12,h:0.18,fontSize:8,color:'666666',fontFace:bFont,align:'center'});

  const b64 = await pptx.write({outputType:'base64'});
  _pptxBase64 = b64;
  return b64;
}

async function sendEmailNow(){
  const to = el('emailTo').value.trim();
  if(!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)){
    el('emailStatus').textContent='Please enter a valid email address';
    el('emailStatus').className='email-status err'; return;
  }
  const btn=el('sendEmailBtn');
  btn.disabled=true;
  btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg> Generating pack…';
  el('emailStatus').textContent=''; el('emailStatus').className='email-status';

  try {
    // 1. Build PPTX → base64
    const b64 = await buildPptxBase64();
    emit('EXTRACT','PPTX encoded for email','base64 ready · '+Math.round(b64.length/1024)+'KB encoded','done');

    const subject = el('emailSubject').value;
    const body    = el('emailBody').value;
    const fn      = 'CloseIQ_FinTran_'+bAudience.replace(/\s+/g,'_')+'_May2026.pptx';
    const dataUrl = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,'+b64;

    // 2. Always download the PPTX first — user will have it regardless of email method
    btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg> Opening email…';
    const dlLink=document.createElement('a'); dlLink.href=dataUrl; dlLink.download=fn;
    document.body.appendChild(dlLink); dlLink.click(); document.body.removeChild(dlLink);

    // 3. Build mailto URL — opens default email client (Outlook, Apple Mail, Gmail app)
    //    with subject + body pre-filled; user attaches the downloaded PPTX and hits send.
    //    This is the most reliable cross-environment approach — no CORS, no API keys.
    const mailBody = body
      + '\n\n─────────────────────────────────────────'
      + '\nATTACHMENT: Please attach ' + fn + ' (just downloaded to your device)'
      + '\n─────────────────────────────────────────'
      + '\nPowered by Tiger Analytics · CloseIQ v2.4.1';

    // mailto has a 2000-char URL limit in some clients — truncate body gracefully
    const shortBody = mailBody.length > 1800
      ? mailBody.slice(0, 1800) + '\n…[see full pack in attachment]'
      : mailBody;

    const mailtoUrl = 'mailto:' + encodeURIComponent(to)
      + '?subject=' + encodeURIComponent(subject)
      + '&body='    + encodeURIComponent(shortBody);

    // Use a hidden <a> to trigger mailto without opening a new tab
    const ml=document.createElement('a'); ml.href=mailtoUrl;
    document.body.appendChild(ml); ml.click(); document.body.removeChild(ml);

    // 4. Update UI
    el('emailStatus').innerHTML =
      '<b style="color:var(--ok)">✓ Done in two steps:</b><br>' +
      '① The PPTX pack was saved to your Downloads folder.<br>' +
      '② Your email client opened — attach the file and hit Send.';
    el('emailStatus').className='email-status ok';
    emit('COMMENTARY','pack emailed to '+to,'PPTX downloaded · mailto opened · '+subject.slice(0,45)+'…','done');
    toast('Pack downloaded · email client opened for '+to);

    // Reset button
    btn.disabled=false;
    btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Send another';

  } catch(err){
    el('emailStatus').textContent='Error: '+err.message;
    el('emailStatus').className='email-status err';
    btn.disabled=false; btn.textContent='Retry';
    console.error('Email error:', err);
  }
}


/* ---------- MODULE A: SCRUTINY ---------- */
let aFilter='all';
function renderModA(){
  el('content').innerHTML=`
   <div class="eyebrow">Module A · balance-sheet cleanup</div>
   <div class="h1">${fmt(DATA.stats.recoverable)} sitting on the balance sheet. The agent found it.</div>
   <p class="lead">No human told it which accounts to inspect. The scrutiny agent ranked 487 balances by aging × materiality × anomaly, classified the root cause of each exception, and recommended an action. Write-backs need your approval — the agent cannot post to Fusion without it.</p>

   <div class="grid" style="grid-template-columns:repeat(4,1fr);margin:22px 0 18px">
     <div class="card"><div class="kpi-label">Total recoverable</div><div class="kpi-val num" style="font-size:24px;color:var(--orange-soft)">${fmt(DATA.stats.recoverable)}</div><div class="mini muted">8 flagged items</div></div>
     <div class="card"><div class="kpi-label">Write-back to income</div><div class="kpi-val num" style="font-size:24px;color:var(--ok)">${fmt(DATA.stats.writeback)}</div><div class="mini muted">P&L impact this period</div></div>
     <div class="card"><div class="kpi-label">High-risk items</div><div class="kpi-val num" style="font-size:24px;color:var(--risk)">3</div><div class="mini muted">awaiting approval</div></div>
     <div class="card"><div class="kpi-label">Avg. aging</div><div class="kpi-val num" style="font-size:24px">14<span style="font-size:13px"> mo</span></div><div class="mini muted">oldest 22 months</div></div>
   </div>

   <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:18px">
    <div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="tag-ag">SCRUTINY</span><div class="h2" style="font-size:14px;margin:0">Recoverable by aging bucket</div></div>
      ${(()=>{const buckets=[['< 9 mo',0],['9–14 mo',0],['15–18 mo',0],['> 18 mo',0]];
        DATA.scrutiny.forEach(s=>{const i=s.age<9?0:s.age<15?1:s.age<19?2:3;buckets[i][1]+=s.amount;});
        const bm=Math.max(...buckets.map(b=>b[1]));
        return buckets.map(([l,v],i)=>`<div class="abar-row"><div class="abar-lbl">${l}</div><div class="abar-track">
          <div class="abar-bar" style="width:${Math.max(8,v/bm*100)}%;background:${i>=2?'linear-gradient(90deg,#b03a40,var(--risk))':'linear-gradient(90deg,var(--orange-dim),var(--orange))'}">${fmt(v)}</div></div></div>`).join('');})()}
      <div class="mini muted" style="margin-top:8px">The older the bucket, the lower the recovery odds — the agent weights aging into every recommendation.</div>
    </div>
    <div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="tag-ag">SCRUTINY</span><div class="h2" style="font-size:14px;margin:0">Recommended action mix</div></div>
      <div class="donut-wrap">
        ${svgDonut([{l:'write-back',v:DATA.stats.writeback,c:'#3DBC8E'},{l:'',v:DATA.stats.recoverable-DATA.stats.writeback,c:'#F08C1E'}],130)}
        <div class="donut-leg">
          <div><span class="sw" style="background:#3DBC8E"></span>Write back to income · <b class="num">${fmt(DATA.stats.writeback)}</b></div>
          <div><span class="sw" style="background:#F08C1E"></span>Refund / reclass / provision · <b class="num">${fmt(DATA.stats.recoverable-DATA.stats.writeback)}</b></div>
          <div class="mini muted">8 items · 3 high-confidence awaiting CFO approval</div>
        </div>
      </div>
    </div>
   </div>

   <div class="seg" style="margin-bottom:14px">
     ${['all','High','Medium','Low'].map(x=>`<button onclick="aSet('${x}')" class="${x===aFilter?'on':''}">${x==='all'?'All exceptions':x+' risk'}</button>`).join('')}
   </div>
   <div class="card" style="padding:0;overflow:hidden"><table><thead><tr>
     <th>ID</th><th>Entity</th><th>Account</th><th class="r">Amount</th><th class="r">Age</th><th>Risk</th><th>Agent recommendation</th><th></th>
   </tr></thead><tbody id="aBody"></tbody></table></div>`;
  renderABody();
}
function aSet(f){aFilter=f;document.querySelectorAll('#content .seg button').forEach(b=>b.classList.toggle('on',(f==='all'&&b.textContent==='All exceptions')||b.textContent===f+' risk'));renderABody();}
function renderABody(){
  const items=DATA.scrutiny.filter(s=>aFilter==='all'||s.risk===aFilter);
  el('aBody').innerHTML=items.map(s=>{
    const rc=s.risk==='High'?'risk':s.risk==='Medium'?'warn':'ok';
    return `<tr class="tap fade-row" onclick="openScrutiny('${s.id}')">
     <td class="mini num">${s.id}</td><td class="mini">${s.entity}</td><td class="mini">${s.acct}<br><span class="muted" style="font-size:10px">${s.vendor}</span></td>
     <td class="r num">${fmtN(s.amount)}</td><td class="r num">${s.age}mo</td>
     <td><span class="chip ${rc}">${s.risk}</span></td>
     <td class="mini"><b style="color:var(--ink)">${s.rec}</b><br><span class="muted" style="font-size:10px">confidence ${(s.conf*100).toFixed(0)}%</span></td>
     <td><span class="muted" style="font-size:16px">›</span></td></tr>`;
  }).join('');
}
function openScrutiny(id){
  const s=DATA.scrutiny.find(x=>x.id===id);
  emit('SCRUTINY','opened '+id+' · '+s.acct,'root-cause model output\nconfidence '+(s.conf*100).toFixed(0)+'% · evidence chain attached','flag');
  const needApprove=s.rec.includes('Write back')||s.rec.includes('off')||s.rec.includes('Refund')||s.rec.includes('Reverse');
  openDrawer(`<div class="drawer-head"><div><span class="chip ${s.risk==='High'?'risk':s.risk==='Medium'?'warn':'ok'}">${s.risk} RISK</span>
    <div class="h2" style="margin-top:10px">${s.acct} — ${s.entity}</div><div class="mini muted">${s.id} · ${s.vendor} · aged ${s.age} months</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
     <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:18px">
       <div class="card" style="padding:14px"><div class="kpi-label">Balance</div><div class="kpi-val num" style="font-size:22px">${fmt(s.amount)}</div></div>
       <div class="card" style="padding:14px"><div class="kpi-label">Model confidence</div><div class="kpi-val num" style="font-size:22px">${(s.conf*100).toFixed(0)}%</div></div>
     </div>
     <div class="h2" style="font-size:13px;margin-bottom:8px">Root-cause analysis <span class="tag-ag">SCRUTINY</span></div>
     <div class="reason-box" style="margin-bottom:16px"><span class="k">Cause.</span> <span class="v">${s.cause}</span>
<span class="k">Evidence.</span> ${s.evidence}
<span class="k">Recommended action.</span> <span class="v">${s.rec}</span></div>
     <div class="h2" style="font-size:13px;margin-bottom:8px">Source evidence <span class="tag-ag">VERIFIABLE</span></div>
     ${evidencePanel(s)}
     ${needApprove?`<div class="card" style="padding:14px;border-color:var(--orange-dim);background:var(--orange-tint)">
       <div class="mini" style="color:var(--orange-soft);font-weight:600;margin-bottom:6px">⚠ HUMAN APPROVAL REQUIRED</div>
       <div class="mini muted">This action writes to Oracle Fusion (P&L impact). The agent has prepared the entry but cannot post it. Approval issues a signed authorization token to the write-connector.</div>
       <div style="display:flex;gap:10px;margin-top:12px">
         <button class="btn pri" onclick="approveScrutiny('${s.id}')"><svg viewBox='0 0 24 24'><path d='M20 6L9 17l-5-5'/></svg>Approve ${s.rec.toLowerCase()}</button>
         <button class="btn" onclick="toast('Escalated to vertical controller')">Escalate</button>
       </div></div>`:`<button class="btn" onclick="toast('Marked for monitoring')">Acknowledge</button>`}
   </div>`);
}
function approveScrutiny(id){
  const s=DATA.scrutiny.find(x=>x.id===id);
  emit('SCRUTINY','✓ approval received '+id,'signed token issued to write-connector\nposting to Fusion: '+s.rec+'\naudit chain: HMAC-signed','done');
  toast('Approved — '+fmt(s.amount)+' '+s.rec.toLowerCase()+' · posted to Fusion');
  closeDrawer();
}

/* ---------- MODULE C: RECON ---------- */
function renderModC(){
  const matchPct=(DATA.stats.ic_matched/DATA.stats.ic_total*100).toFixed(0);
  el('content').innerHTML=`
   <div class="eyebrow">Module C · extensible matching platform</div>
   <div class="h1">Intercompany matched across the group — and the same engine does bank & open-items.</div>
   <p class="lead">Fuzzy matching on amount, date and reference cleared ${DATA.stats.ic_matched} of ${DATA.stats.ic_total} pairs automatically. The ${DATA.stats.ic_total-DATA.stats.ic_matched} exceptions are isolated with a cause and a confidence. The logic taught for intercompany retargets to bank reconciliation or open-item matching with no rebuild — it's just pointed at different data.</p>

   <div class="grid" style="grid-template-columns:repeat(4,1fr);margin:22px 0 18px">
     <div class="card"><div class="kpi-label">Auto-matched</div><div class="kpi-val num" style="font-size:24px;color:var(--ok)">${matchPct}%</div><div class="mini muted">${DATA.stats.ic_matched} of ${DATA.stats.ic_total} pairs</div></div>
     <div class="card"><div class="kpi-label">Net unmatched</div><div class="kpi-val num" style="font-size:24px;color:var(--orange-soft)">${fmt(DATA.stats.ic_unmatched_val)}</div><div class="mini muted">3 open items</div></div>
     <div class="card"><div class="kpi-label">Entity universe</div><div class="kpi-val num" style="font-size:24px">~400</div><div class="mini muted">scaling target</div></div>
     <div class="card"><div class="kpi-label">Reusable for</div><div class="kpi-val num" style="font-size:15px;line-height:1.4;margin-top:14px">Bank recon<br>Open items</div></div>
   </div>

   <div class="card" style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="tag-ag">RECON</span><div class="h2" style="font-size:14px;margin:0">Match coverage by value</div></div>
     <div class="donut-wrap">
       ${(()=>{const mv=DATA.ic.filter(x=>x.status==='matched').reduce((s,x)=>s+x.va,0);
         return svgDonut([{l:'matched',v:mv,c:'#3DBC8E'},{l:'',v:DATA.stats.ic_unmatched_val,c:'#E5484D'}],130);})()}
       <div class="donut-leg">
         <div><span class="sw" style="background:#3DBC8E"></span>Auto-matched value · <b class="num">${fmt(DATA.ic.filter(x=>x.status==='matched').reduce((s,x)=>s+x.va,0))}</b></div>
         <div><span class="sw" style="background:#E5484D"></span>Open differences · <b class="num">${fmt(DATA.stats.ic_unmatched_val)}</b></div>
         <div class="mini muted">exact + fuzzy (amount ± date ± reference) · all 3 open items have an agent hypothesis</div>
       </div>
     </div>
   </div>

   <div class="card" style="padding:0;overflow:hidden"><table><thead><tr>
     <th>Pair</th><th>Reference</th><th class="r">Entity A</th><th class="r">Entity B</th><th class="r">Diff</th><th>Status</th><th>Agent note</th>
   </tr></thead><tbody>
   ${DATA.ic.map(x=>`<tr class="tap" onclick="${x.status==='unmatched'?`openIC('${x.id}')`:`openICm('${x.id}')`}">
     <td class="mini num">${x.a} ↔ ${x.b}</td><td class="mini">${x.ref}</td>
     <td class="r num">${fmtN(x.va)}</td><td class="r num">${fmtN(x.vb)}</td>
     <td class="r num ${x.diff===0?'muted':'neg'}">${x.diff===0?'—':fmtN(x.diff)}</td>
     <td><span class="chip ${x.status==='matched'?'ok':'warn'}">${x.status==='matched'?'matched':'review'}</span></td>
     <td class="mini muted">${x.status==='matched'?'exact + fuzzy clear':x.cause}</td></tr>`).join('')}
   </tbody></table></div>
   <div class="card" style="margin-top:16px;border-color:var(--orange-dim)">
     <div style="display:flex;align-items:center;gap:10px"><span class="tag-ag">PLATFORM PLAY</span>
     <span class="mini muted">"The fuzzy logic we taught for intercompany, we can teach for bank, for open items. It's just about looking at the data."</span></div>
   </div>`;
}
function openIC(id){
  const x=DATA.ic.find(i=>i.id===id);
  emit('RECON','investigating '+id,'fuzzy match below threshold\nrunning timing + FX hypothesis tests','flag');
  openDrawer(`<div class="drawer-head"><div><span class="chip warn">REVIEW</span>
   <div class="h2" style="margin-top:10px">${x.a} ↔ ${x.b}</div><div class="mini muted">${x.ref} · diff ${fmt(x.diff)}</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body"><div class="reason-box" style="margin-bottom:16px"><span class="k">Recon agent.</span> <span class="v">${x.cause}</span>
Confidence in this hypothesis: ${(x.conf*100).toFixed(0)}%.
<span class="k">Suggested resolution.</span> ${x.cause.includes('Timing')?'No action — entity B posts in the next period; the pair will self-clear at next close. Flagged for tracking only.':'Post FX revaluation adjustment to align the AED/USD leg; entry prepared for controller review.'}</div>
   <button class="btn pri" onclick="toast('Resolution accepted · tracked to next close');closeDrawer()">Accept resolution</button></div>`);
}

/* ---------- JE SUB-PROCESS ---------- */
function renderJE(){
  const steps=[['1–3','Extract source, classify JE type, build base file','ag'],['4–6','Derived columns, date logic, PO days & consumption','ag'],
   ['7–9','Prorated expense, billed amounts, accrual + FX','ag'],['10–11','"Consider Y/N", validate S-Sweep exceptions','ag'],
   ['12–13','Finalize (>AED 500 materiality), Fusion template','ag'],['14–16','Internal review, post JE, reconcile & store backup','hum']];
  el('content').innerHTML=`
   <div class="eyebrow">16-step PO-accrual sub-process</div>
   <div class="h1">The accrual run your team does in Excel — done by agents, posted by a human.</div>
   <p class="lead">Steps 1–13 are agent-automated. Steps 14–16 stay human: an agent prepares the Fusion upload but a controller reviews and posts. This is the discover-then-freeze model — nothing writes to production without sign-off.</p>

   <div class="grid" style="grid-template-columns:1.1fr .9fr;margin-top:22px">
     <div class="card"><div class="h2" style="font-size:14px;margin-bottom:6px">Process flow</div>
       <div class="flow">${steps.map(([n,t,k])=>`<div class="flowstep ${k}"><div class="flow-n">${n}</div><div><div class="mini" style="color:var(--ink);font-weight:500">${t}</div><div class="tag-ag" style="margin-top:5px">${k==='ag'?'AGENT':'HUMAN-IN-THE-LOOP'}</div></div></div>`).join('')}</div></div>
     <div class="card"><div class="h2" style="font-size:14px;margin-bottom:10px">Computed accrual lines <span class="tag-ag">live</span></div>
       <table><thead><tr><th>PO</th><th>Vendor</th><th class="r">Accrual</th><th>Consider</th></tr></thead><tbody>
       ${DATA.je.map(j=>`<tr><td class="mini num">${j.po}</td><td class="mini">${j.vendor}</td><td class="r num">${j.consider==='Yes'?fmtN(j.accr):'—'}</td>
        <td><span class="chip ${j.consider==='Yes'?'ok':'warn'}">${j.consider}</span></td></tr>`).join('')}
       <tr style="border-top:2px solid var(--line-2)"><td colspan=2><b style="color:var(--ink)">Total accrual</b></td><td class="r num"><b style="color:var(--orange-soft)">${fmtN(DATA.stats.je_total)}</b></td><td></td></tr>
       </tbody></table>
       <div class="reason-box" style="margin-top:14px"><span class="k">Exclusion logic.</span> 2 POs auto-swept — one pre-FY24, one on a leasing cost centre — per the "Consider No" ruleset, with reasons logged for audit.</div>
       <button class="btn pri" style="margin-top:14px;width:100%;justify-content:center" onclick="postJE()"><svg viewBox='0 0 24 24'><path d='M20 6L9 17l-5-5'/></svg>Review & post to Fusion</button>
     </div>
   </div>`;
}
function postJE(){emit('EXTRACT','JE upload prepared','Fusion template generated · '+DATA.je.length+' lines\nawaiting controller post','act');toast('JE batch staged — controller sign-off required to post');}

/* ---------- FORECAST (Art of the Possible) ---------- */
function renderForecast(){
  emit('FORECAST','projecting construction payments','PO milestones × consumption curves\nhorizon: 6 months','act');
  const months=['Jun','Jul','Aug','Sep','Oct','Nov'];
  const out=[418,466,512,478,392,355], inn=[505,468,452,522,564,538]; // AED M
  let cum=0; const net=months.map((m,i)=>{cum+=inn[i]-out[i];return{l:m,v:cum};});
  const w=680,h=230,padL=40,padB=26,padT=14,padR=10;
  const gmax=Math.max(...out,...inn)*1.12;
  const gw=(w-padL-padR)/months.length, bw=gw*0.3;
  const Y=v=>padT+(gmax-v)/gmax*(h-padT-padB);
  let bars=`<svg viewBox="0 0 ${w} ${h}">`;
  [0,.5,1].forEach(f=>{const v=gmax*f;bars+=`<line class="ch-grid" x1="${padL}" y1="${Y(v)}" x2="${w-padR}" y2="${Y(v)}"/><text class="ch-lbl" x="${padL-5}" y="${Y(v)+3}" text-anchor="end">${v.toFixed(0)}M</text>`;});
  months.forEach((m,i)=>{const x=padL+gw*i+gw*0.16;
    bars+=`<g onclick="fcMonth(${i})" style="cursor:pointer"><rect x="${x}" y="${Y(inn[i])}" width="${bw}" height="${Y(0)-Y(inn[i])}" rx="3" fill="rgba(30,126,84,.75)"/>`;
    bars+=`<rect x="${x+bw+4}" y="${Y(out[i])}" width="${bw}" height="${Y(0)-Y(out[i])}" rx="3" fill="rgba(192,58,43,.6)"/><rect x="${x-3}" y="${padT}" width="${gw-6}" height="${h-padT-padB}" fill="transparent"/></g>`;
    bars+=`<text class="ch-lbl" x="${padL+gw*i+gw/2}" y="${h-8}" text-anchor="middle">${m}</text>`;});
  bars+='</svg>';
  el('content').innerHTML=`
   <div class="eyebrow">Art of the possible · Phase 2 teaser</div>
   <div class="h1">The close tells you what happened. This tells you what's coming.</div>
   <p class="lead">The same PO, milestone and collections data the agents already ingest for the close can project forward: construction payment obligations against expected collections, six months out, per project. This is a Phase 2 capability — shown here on the prototype's synthetic data to make the path concrete.</p>

   <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:22px 0 18px">
     <div class="card"><div class="kpi-label">Net position · 6 mo</div><div class="kpi-val num cu" style="font-size:24px;color:var(--ok)">+AED ${cum.toFixed(0)}M</div><div class="mini muted">collections ahead of obligations</div></div>
     <div class="card"><div class="kpi-label">Peak outflow month</div><div class="kpi-val num" style="font-size:24px">Aug</div><div class="mini muted">AED 512M · Lagoons + Islands milestones</div></div>
     <div class="card"><div class="kpi-label">Funding risk</div><div class="kpi-val num" style="font-size:24px">Low</div><div class="mini muted">no negative-net month projected</div></div>
   </div>

   <div class="grid" style="grid-template-columns:1.2fr .8fr">
     <div class="card chart-card">
       <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="tag-ag">FORECAST</span>
       <div class="h2" style="font-size:14px;margin:0">Projected collections vs construction payments</div>
       <span class="mini" style="margin-left:auto"><span style="color:var(--ok)">■</span> collections&nbsp;&nbsp;<span style="color:var(--risk)">■</span> payments</span></div>
       ${bars}
     </div>
     <div class="card chart-card">
       <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="tag-ag">FORECAST</span>
       <div class="h2" style="font-size:14px;margin:0">Cumulative net cash</div></div>
       ${svgLine(net,640,200,{fmt:v=>v.toFixed(0)+'M'})}
     </div>
   </div>

   <div class="card" style="margin-top:16px">
     <div class="h2" style="font-size:13px;margin-bottom:8px">Agent commentary <span class="tag-ag">COMMENTARY</span></div>
     <div class="reason-box"><span class="k">Read.</span> The book is self-funding across the horizon — projected collections exceed construction obligations every month, with the tightest spread in August when Lagoons Venice and FinTran Islands milestones coincide (net +AED 10M). <span class="k">If this were live.</span> The agent would re-project nightly from actual GRN postings and collection receipts, and alert the moment any month turned negative — turning a quarterly treasury exercise into a continuous one.</div>
     <div class="gate-banner" style="margin-top:14px">This module ships in Phase 2 (Pathfinder) — the data plumbing built for the close is reused as-is; only the projection layer is added.</div>
   </div>`;
}

/* ---------- PERIOD 13 · CONSOLIDATION ADJUSTMENTS ---------- */
function renderP13(){
  emit('SCRUTINY','P13 scan','loading consolidation-only entries · checking approval status','act');
  const entries=DATA.p13||[];
  const pending=entries.filter(e=>e.status==='pending-approval');
  const approved=entries.filter(e=>e.status==='approved');
  const totalImpact=entries.reduce((s,e)=>s+(e.pl_impact||0),0);
  el('content').innerHTML=`
   <div class="eyebrow">Period 13 · consolidation adjustments</div>
   <div class="h1">Top-sided entries: group level only.</div>
   <p class="lead">These entries are made by Group Accounting after all 10 legal entities have closed their books. They live exclusively at the consolidated P&amp;L and balance sheet — no entity controller will see them in their own TB. Each requires a preparer, a business case, a supporting reference, and explicit Group Controller sign-off before the CFO pack is issued.</p>

   <div class="p13-gov-banner">
     <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
       <span class="tag-ag">GOVERNANCE</span>
       <b style="font-size:12.5px">Dual sign-off required for all P13 entries</b>
       <span class="chip ${pending.length?'risk':'ok'}" style="margin-left:auto">${pending.length} pending · ${approved.length} approved</span>
     </div>
     <div class="mini muted" style="line-height:1.55">These entries are invisible to entity controllers. Only the Group Controller, FP&amp;A, and CFO see the consolidated view inclusive of P13. Outstanding pending entries block CFO pack issuance.</div>
   </div>

   <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:18px 0">
     <div class="card"><div class="kpi-label">Total entries</div><div class="kpi-val num" style="font-size:22px">${entries.length}</div><div class="mini muted">this close cycle</div></div>
     <div class="card"><div class="kpi-label">Net P&amp;L impact</div><div class="kpi-val num ${totalImpact>=0?'pos':'neg'}" style="font-size:22px">${fmtN(totalImpact)}</div><div class="mini muted">consolidated only · AED</div></div>
     <div class="card"><div class="kpi-label">Pending sign-off</div><div class="kpi-val num ${pending.length?'neg':''}" style="font-size:22px">${pending.length}</div><div class="mini muted" style="color:${pending.length?'var(--risk)':'var(--ok)'}">${pending.length?'blocking CFO pack':'all clear'}</div></div>
   </div>

   <div class="card" style="padding:0;overflow:hidden">
     <table><thead><tr>
       <th>ID</th><th>Entry description</th><th>Category</th>
       <th class="r">Amount (AED)</th><th class="r">P&amp;L impact</th>
       <th>Prepared by</th><th>Status</th>
     </tr></thead><tbody>
     ${entries.map(e=>{
       const isApproved=e.status==='approved';
       return `<tr class="tap" onclick="p13Drawer('${e.id}')">
         <td class="mini num" style="color:var(--ink-3);white-space:nowrap">${e.id}</td>
         <td><b style="color:var(--ink);font-size:12px">${e.desc}</b><div class="mini muted" style="font-size:10px">${e.supportingRef}</div></td>
         <td><span class="mini">${e.category}</span></td>
         <td class="r num ${e.amount>=0?'pos':'neg'}">${fmtN(e.amount)}</td>
         <td class="r num ${(e.pl_impact||0)>=0?'pos':'neg'}">${e.pl_impact?fmtN(e.pl_impact):'<span style="color:var(--ink-3)">OCI/BS</span>'}</td>
         <td class="mini">${e.preparedBy}<div class="mini muted" style="font-size:10px">${e.team}</div></td>
         <td><span class="chip ${isApproved?'ok':'risk'}" style="font-size:10px">${isApproved?'Approved':'Pending'}</span></td>
       </tr>`;
     }).join('')}
     </tbody></table>
   </div>
   <p class="mini muted" style="margin-top:10px">Click any row for Dr/Cr detail, supporting reference, governance trail, and sign-off action. P13 entries appear only in the group consolidated view — invisible in all entity-level TB extracts.</p>`;
}
function p13Drawer(id){
  const e=(DATA.p13||[]).find(x=>x.id===id);if(!e)return;
  const isApproved=e.status==='approved';
  const isPending=e.status==='pending-approval';
  emit('SCRUTINY','P13 detail → '+id,'loading governance trail\nchecking preparer credentials · risk class','act');
  openDrawer(`<div class="drawer-head"><div>
    <span class="tag-ag">P13 · CONSOLIDATION ENTRY</span>
    <div class="h2" style="margin-top:10px">${e.desc}</div>
    <div class="mini muted">${e.id} · ${e.category} · ref: ${e.supportingRef}</div>
  </div><div class="x" onclick="closeDrawer()">×</div></div>
  <div class="drawer-body">
    <div class="p13-gov-banner" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
        <span class="tag-ag">GOVERNANCE</span>
        <span class="chip ${isApproved?'ok':'risk'}">${isApproved?'APPROVED':'PENDING SIGN-OFF'}</span>
        ${isApproved?`<span class="mini muted" style="margin-left:auto">Approved by ${e.approvedBy}</span>`:''}
      </div>
      <div class="mini muted" style="line-height:1.55">${e.governance}</div>
    </div>
    <div class="reason-box" style="margin-bottom:16px"><span class="k">Entry basis.</span> ${e.note}</div>
    <table style="margin-bottom:18px"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>
      <tr><td class="mini muted">Debit</td><td class="mini"><b>${e.debit}</b></td></tr>
      <tr><td class="mini muted">Credit</td><td class="mini"><b>${e.credit}</b></td></tr>
      <tr><td class="mini muted">Amount (AED)</td><td class="r num ${e.amount>=0?'pos':'neg'}"><b>${fmtN(e.amount)}</b></td></tr>
      <tr><td class="mini muted">P&amp;L impact</td><td class="r num ${(e.pl_impact||0)>=0?'pos':'neg'}">${e.pl_impact?`<b>${fmtN(e.pl_impact)}</b>`:'<span style="color:var(--ink-3)">OCI / BS only — no P&amp;L impact</span>'}</td></tr>
      <tr><td class="mini muted">Prepared by</td><td class="mini">${e.preparedBy} · ${e.team}</td></tr>
      <tr><td class="mini muted">Supporting ref</td><td class="mini num">${e.supportingRef}</td></tr>
      <tr><td class="mini muted">Visible to</td><td class="mini">Group Controller · FP&amp;A · CFO only <span class="chip risk" style="font-size:9px;padding:1px 7px;margin-left:4px">NOT in entity books</span></td></tr>
    </tbody></table>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${isPending?`<button class="btn pri" onclick="toast('${id} approved — CFO pack updated · preparer notified');closeDrawer()"><svg viewBox='0 0 24 24'><path d='M20 6L9 17l-5-5'/></svg>Approve entry</button>`:''}
      ${isPending?`<button class="btn" onclick="toast('${id} flagged for review — preparer notified');closeDrawer()">Flag for review</button>`:''}
      <button class="btn" onclick="closeDrawer()">Close</button>
    </div>
  </div>`);
}

/* ================= PROCESS FLOW ================= */
function renderProcessFlow(){
  const pf=DATA.processFlow||{};
  const steps=pf.steps||[];
  emit('ORCHESTRATOR','Process Flow','mapping agent-by-agent close timeline · computing time savings','act');
  const phases=[...new Set(steps.map(s=>s.phase))];
  const phColor={'Data Ingestion':'#4A90D9','Mapping & Quality':'#F08C1E','Analysis':'#8B5CF6','Controller Review':'#1E5F8E','Pack & Sign-off':'#2EA86D'};
  const agentColor={system:'var(--ink-3)',agent:'var(--orange)',human:'#1E5F8E'};
  const agentBg={system:'var(--panel-3)',agent:'var(--orange-tint)',human:'rgba(30,95,142,.10)'};
  const phIcon={
    'Data Ingestion':'<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    'Mapping & Quality':'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'Analysis':'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'Controller Review':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'Pack & Sign-off':'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
  };
  // Steps that link to a CloseIQ view
  const navMap={
    2:{view:'sources',label:'Open Sources'},3:{view:'sources',label:'Open Sources'},
    6:{view:'je',label:'Open JE Process'},7:{view:'modC',label:'Open IC Recon'},
    8:{view:'modB',label:'Open Variance'},9:{view:'modA',label:'Open Scrutiny'},
    11:{view:'p13',label:'Open P13'},12:{view:'exec',label:'Open Exec Summary'},
    13:{view:'exec',label:'Open CFO Pack'}
  };
  const autoRate=Math.round(((pf.stepsAuto||0)/(pf.stepsTotal||1))*100);
  const kpis=[
    {label:'AI Close Duration',val:pf.aiDuration||'—',sub:'end-to-end wall clock',icon:'<path d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2"/>',color:'var(--ok)'},
    {label:'Manual Equivalent',val:pf.manualDays||'—',sub:`${pf.manualHours||0} person-hours`,icon:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>',color:'var(--risk)'},
    {label:'Hours Reclaimed',val:`${pf.manualHours||0}h`,sub:'per monthly close cycle',icon:'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',color:'var(--orange)'},
    {label:'Automation Rate',val:`${autoRate}%`,sub:`${pf.stepsAuto||0} of ${pf.stepsTotal||0} steps fully AI`,icon:'<circle cx="12" cy="12" r="10"/><path d="M20 6L9 17l-5-5"/>',color:'#8B5CF6'}
  ];
  const kpiHtml=kpis.map(k=>`
    <div class="pf-kpi">
      <div class="pf-kpi-icon" style="color:${k.color}"><svg viewBox="0 0 24 24">${k.icon}</svg></div>
      <div class="pf-kpi-val" style="color:${k.color}">${k.val}</div>
      <div class="pf-kpi-label">${k.label}</div>
      <div class="pf-kpi-sub">${k.sub}</div>
    </div>`).join('');
  // Phase pipeline header
  const pipelineHtml=phases.map((ph,i)=>{
    const c=phColor[ph]||'var(--orange)';
    const phSteps=steps.filter(s=>s.phase===ph);
    const arr=i<phases.length-1?`<div class="pf-pipe-arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>`:'';
    return `<div class="pf-pipe-phase">
      <div class="pf-pipe-box" style="border-top:3px solid ${c}">
        <div class="pf-pipe-icon" style="background:${c}22;color:${c}"><svg viewBox="0 0 24 24">${phIcon[ph]||''}</svg></div>
        <div class="pf-pipe-label">${ph}</div>
        <div class="pf-pipe-count">${phSteps.length} step${phSteps.length>1?'s':''}</div>
      </div>
    </div>${arr}`;
  }).join('');
  // Step card columns
  const columnsHtml=phases.map(ph=>{
    const c=phColor[ph]||'var(--orange)';
    const phSteps=steps.filter(s=>s.phase===ph);
    const stepsHtml=phSteps.map(s=>{
      const nav=navMap[s.id];
      const isHuman=s.agentType==='human';
      const aColor=agentColor[s.agentType]||'var(--ink-2)';
      const aBg=agentBg[s.agentType]||'var(--panel-2)';
      return `<div class="pf-cs${isHuman?' pf-cs-human':''}${nav?' pf-cs-link':''}" ${nav?`onclick="go('${nav.view}')" title="Click to open ${nav.label.replace('Open ','')}"`:''}>
        <div class="pf-cs-top">
          <div class="pf-cs-num" style="background:${c}">${s.id}</div>
          <span class="pf-cs-badge" style="background:${aBg};color:${aColor}">${s.agent}</span>
          ${isHuman?'<span class="chip risk" style="font-size:8px;padding:1px 5px">HUMAN</span>':''}
        </div>
        <div class="pf-cs-name">${s.name}</div>
        <div class="pf-cs-meta">
          <span class="pf-cs-dur"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2"/></svg>${s.dur}</span>
          ${s.savedH>0?`<span class="pf-cs-saved"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>${s.savedH}h saved</span>`:''}
        </div>
        <div class="pf-cs-out" title="${s.output}">${s.output}</div>
        ${nav?`<div class="pf-cs-nav" style="color:${c}">${nav.label}<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>`:''}
      </div>`;
    }).join('');
    return `<div class="pf-col">
      <div class="pf-col-bar" style="background:${c}"></div>
      ${stepsHtml}
    </div>`;
  }).join('');
  el('content').innerHTML=`
    <div class="pf-wrap">
      <div class="pf-kpi-row">${kpiHtml}</div>
      <div class="pf-section-label">MONTH-END CLOSE PIPELINE · 5 PHASES · 13 STEPS · CLICK ANY HIGHLIGHTED STEP TO DRILL IN</div>
      <div class="pf-pipeline">${pipelineHtml}</div>
      <div class="pf-columns">${columnsHtml}</div>
      <div class="pf-commentary">
        <div class="pf-comm-head">
          <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 2.4 1.2 4.5 3 5.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3c1.8-1.2 3-3.3 3-5.7a7 7 0 00-7-7z"/><path d="M9 21h6"/></svg>
          Sage — Close Efficiency Summary
        </div>
        <p class="pf-comm-body">The AI-assisted close compresses a traditional <b>5.5-day manual cycle</b> into <b>${pf.aiDuration}</b> of wall-clock time, reclaiming <b>${pf.manualHours} person-hours</b> per month. The single human gate — Group Controller review &amp; P13 sign-off — ensures all consolidation adjustments carry the required dual-approval before the CFO pack is assembled. Automation rate sits at <b>${autoRate}%</b>; the remaining ${100-autoRate}% is intentional governance design, not a technical gap.</p>
      </div>
    </div>`;
}

/* ================= SAGE ASSISTANT ================= */
let SAGE_LANG='en';
let sageOpened=false;
let SAGE_MUTED=false;
function toggleSageMute(){
  SAGE_MUTED=!SAGE_MUTED;
  if(SAGE_MUTED&&window.speechSynthesis)speechSynthesis.cancel();
  const btn=el('sageMuteBtn');const icon=el('sageMuteIcon');
  if(btn){btn.style.opacity=SAGE_MUTED?'0.45':'1';btn.title=SAGE_MUTED?'Unmute voice':'Mute voice';}
  if(icon){
    icon.innerHTML=SAGE_MUTED
      ?'<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
      :'<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/>';
  }
}
function inlineMd(t){
  return t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*([^*]+?)\*/g,'<em>$1</em>').replace(/`([^`]+?)`/g,'<code style="font-family:var(--mono);background:var(--panel-2);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>');
}
function renderSageMd(text){
  const lines=text.split('\n');
  let html='',tableRows=[],listItems=[],listType='';
  function flushTable(){
    if(!tableRows.length)return;
    const data=tableRows.filter(r=>!/^\|[\s\-:|]+\|/.test(r.trim()));
    let thead='',tbody='';
    data.forEach((row,i)=>{
      const cells=row.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      if(i===0)thead=`<thead><tr>${cells.map(c=>`<th>${inlineMd(c)}</th>`).join('')}</tr></thead>`;
      else tbody+=`<tr>${cells.map(c=>`<td>${inlineMd(c)}</td>`).join('')}</tr>`;
    });
    html+=`<table class="sage-tbl">${thead}<tbody>${tbody}</tbody></table>`;
    tableRows=[];
  }
  function flushList(){
    if(!listItems.length)return;
    const tag=listType==='ol'?'ol':'ul';
    html+=`<${tag} style="margin:4px 0 4px 16px;padding:0">${listItems.map(i=>`<li style="margin:2px 0">${i}</li>`).join('')}</${tag}>`;
    listItems=[];listType='';
  }
  lines.forEach(line=>{
    const t=line.trim();
    if(/^\|.+\|$/.test(t)){flushList();if(!/^\|[\s\-:|]+\|$/.test(t))tableRows.push(t);return;}
    if(tableRows.length)flushTable();
    const bm=t.match(/^[-*]\s+(.+)/);
    if(bm){if(listType&&listType!=='ul')flushList();listType='ul';listItems.push(inlineMd(bm[1]));return;}
    const nm=t.match(/^\d+\.\s+(.+)/);
    if(nm){if(listType&&listType!=='ol')flushList();listType='ol';listItems.push(inlineMd(nm[1]));return;}
    flushList();
    if(!t)html+='<br>';
    else html+=`<p style="margin:3px 0">${inlineMd(t)}</p>`;
  });
  flushTable();flushList();
  return html;
}
const SUGGEST=[
 "What's RE-02's margin this month?",
 'Compare Hospitality and Real Estate',
 'Which entity grew revenue the most?',
 'Why did Hospitality margin compress?',
 'What should I approve before signing?',
 "What's our cash position in August?",
];

/* ─── Slash commands ──────────────────────────────────────────────────────── */
const SAGE_COMMANDS=[
  {cmd:'/sync',     label:'Sync all sources',         desc:'Pull latest data from all source systems',          action:()=>{closeSage();ingestAll();}},
  {cmd:'/restore',  label:'Restore last session',     desc:'Reload data snapshot from the previous session',    action:()=>{closeSage();preloadAll();}},
  {cmd:'/cfo',      label:'Open CFO summary',          desc:'Navigate to the executive close summary dashboard', action:()=>{closeSage();go('exec');}},
  {cmd:'/sources',  label:'Go to Data Sources',       desc:'Navigate to the data source connection view',       action:()=>{closeSage();go('sources');}},
  {cmd:'/flow',     label:'Open Close Flow',           desc:'Navigate to the close process flow view',           action:()=>{closeSage();go('flow');}},
  {cmd:'/je',       label:'Open Journal Entries',     desc:'Navigate to journal entry review',                  action:()=>{closeSage();go('je');}},
  {cmd:'/recon',    label:'Open IC Reconciliation',   desc:'Navigate to intercompany reconciliation view',      action:()=>{closeSage();go('modC');}},
  {cmd:'/variance', label:'Open Variance Analysis',   desc:'Budget vs actual decomposition with AI commentary', action:()=>{closeSage();go('modB');}},
  {cmd:'/scrutiny', label:'Open TB Scrutiny',         desc:'Trial balance anomaly detection',                   action:()=>{closeSage();go('modA');}},
  {cmd:'/p13',      label:'Open P13 Consolidation',   desc:'Navigate to the period 13 consolidation view',      action:()=>{closeSage();go('p13');}},
  {cmd:'/forecast', label:'Open Cash Forecast',       desc:'13-week AI cash flow forecast',                     action:()=>{closeSage();go('fc');}},
  {cmd:'/download', label:'Download CFO Pack',        desc:'Generate and download the CFO briefing pack',       action:()=>downloadPack()},
  {cmd:'/email',    label:'Email CFO Pack',           desc:'Open email composer to send the CFO pack',          action:()=>{closeSage();openEmailModal();}},
  {cmd:'/agents',   label:'Toggle Agent Rail',        desc:'Show or hide the capability mesh agent rail',       action:()=>toggleRail()},
  {cmd:'/audit',    label:'Open Audit Trail',         desc:'Open the tamper-evident audit chain viewer',        action:()=>{closeSage();openAudit();}},
  {cmd:'/expand',   label:'Expand / Collapse Sage',   desc:'Toggle Sage between compact and wide mode',         action:()=>toggleSageExpand()},
  {cmd:'/live',     label:'Connect Claude API',       desc:'Authenticate with Claude Sonnet 4.6',               action:()=>connectAI()},
  {cmd:'/mute',     label:'Toggle voice mute',        desc:'Mute or unmute Sage voice output',                  action:()=>toggleSageMute()},
  {cmd:'/clear',    label:'Clear chat history',       desc:'Remove all messages from the current conversation', action:()=>{el('sageBody').innerHTML='';renderSuggest();}},
];

/* ─── Command palette ─────────────────────────────────────────────────────── */
let _cmdSel=-1, _cmdFiltered=[];
function showCmdPalette(filter){
  _cmdFiltered=filter?SAGE_COMMANDS.filter(c=>c.cmd.slice(1).startsWith(filter)||c.label.toLowerCase().includes(filter)):SAGE_COMMANDS;
  if(!_cmdFiltered.length){hideCmdPalette();return;}
  if(_cmdSel<0||_cmdSel>=_cmdFiltered.length)_cmdSel=0;
  const pal=el('cmdPalette');
  pal.innerHTML='<div class="cmd-pal-hdr">↑↓ navigate &nbsp;·&nbsp; Enter execute &nbsp;·&nbsp; Esc cancel</div>'+
    _cmdFiltered.map((c,i)=>`<div class="cmd-item${i===_cmdSel?' sel':''}" onclick="runSageCmd('${c.cmd}')"><span class="ci-key">${c.cmd}</span><span class="ci-lbl">${c.label}</span><span class="ci-desc">${c.desc}</span></div>`).join('');
  pal.style.display='block';
}
function hideCmdPalette(){const p=el('cmdPalette');if(p){p.style.display='none';p.innerHTML='';}  _cmdSel=-1;}
function runSageCmd(cmdStr){
  const found=SAGE_COMMANDS.find(c=>c.cmd===cmdStr);
  if(!found)return;
  hideCmdPalette();
  el('sageInput').value='';
  // For nav commands that will close Sage, just execute directly
  found.action();
}

/* ─── Drag & expand ───────────────────────────────────────────────────────── */
let _sageDragged=false,_sageDragPos={left:0,top:0},_sageDragState={active:false,startX:0,startY:0,initLeft:0,initTop:0};
let _sageExpanded=false;
function toggleSageExpand(){
  _sageExpanded=!_sageExpanded;
  el('sage').classList.toggle('expanded',_sageExpanded);
  const btn=el('sageExpandBtn');if(!btn)return;
  btn.title=_sageExpanded?'Collapse Sage':'Expand Sage';
  btn.querySelector('svg').innerHTML=_sageExpanded
    ?'<path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>'
    :'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>';
}
function initSageDrag(){
  const panel=el('sage'),head=el('sageHead');if(!panel||!head)return;
  function startDrag(cx,cy){
    const rect=panel.getBoundingClientRect();
    _sageDragState={active:true,startX:cx,startY:cy,initLeft:rect.left,initTop:rect.top};
    panel.style.transition='none';
  }
  function moveDrag(cx,cy){
    if(!_sageDragState.active)return;
    const dx=cx-_sageDragState.startX,dy=cy-_sageDragState.startY;
    if(!_sageDragged&&Math.abs(dx)+Math.abs(dy)>6){
      _sageDragged=true;panel.classList.add('dragged');
      panel.style.bottom='auto';panel.style.right='auto';
    }
    if(_sageDragged){
      const w=panel.offsetWidth,h=panel.offsetHeight;
      const l=Math.max(0,Math.min(window.innerWidth-w,_sageDragState.initLeft+dx));
      const t=Math.max(0,Math.min(window.innerHeight-h,_sageDragState.initTop+dy));
      panel.style.left=l+'px';panel.style.top=t+'px';
      _sageDragPos={left:l,top:t};
    }
  }
  function endDrag(){_sageDragState.active=false;panel.style.transition='.34s cubic-bezier(.4,0,.2,1)';}
  head.addEventListener('mousedown',e=>{if(e.target.closest('.sage-x,.sage-expand,.sage-orb'))return;e.preventDefault();startDrag(e.clientX,e.clientY);});
  document.addEventListener('mousemove',e=>{moveDrag(e.clientX,e.clientY);});
  document.addEventListener('mouseup',endDrag);
  head.addEventListener('touchstart',e=>{if(e.target.closest('.sage-x,.sage-expand,.sage-orb'))return;const t=e.touches[0];startDrag(t.clientX,t.clientY);},{passive:true});
  document.addEventListener('touchmove',e=>{if(_sageDragState.active){const t=e.touches[0];moveDrag(t.clientX,t.clientY);}},{passive:true});
  document.addEventListener('touchend',endDrag);
}
// agent sequences per intent — drives the visible "agents working" animation
function pickAgents(q){
  q=q.toLowerCase();
  if(/margin|hospital|cost|labour|labor/.test(q))return ['VARIANCE','COMMENTARY','EXTRACT'];
  if(/write.?back|recover|clean|aged|scrutiny|balance sheet/.test(q))return ['SCRUTINY','EXTRACT','COMMENTARY'];
  if(/interco|ic |recon|match|trapped/.test(q))return ['RECON','MAP','COMMENTARY'];
  if(/cash|forecast|project|payment|outflow|collect|liquidity|next.*(month|quarter)/.test(q))return ['FORECAST','EXTRACT','COMMENTARY'];
  if(/approve|sign|action|recommend/.test(q))return ['SCRUTINY','VARIANCE','RECON','COMMENTARY'];
  if(/summar|overview|close|how.*going/.test(q))return ['EXTRACT','VARIANCE','SCRUTINY','RECON','COMMENTARY'];
  if(/cash|forecast|project|liquidit/.test(q))return ['EXTRACT','VARIANCE','COMMENTARY'];
  if(/secur|govern|audit|timeline|differ|power.?bi|accenture/.test(q))return ['COMMENTARY'];
  if(/entity|risk|which/.test(q))return ['SCRUTINY','VARIANCE','COMMENTARY'];
  return ['EXTRACT','VARIANCE','COMMENTARY'];
}
// scripted knowledge (fallback + offline). High-finance register.
const KB={
 summar:()=>`Three lines. **One:** group revenue landed at ${fmt(consol('cur').rev)}, marginally ahead of budget, carried by Real Estate handover recognition. **Two:** the watch-item is Hospitality — operating margin compressed on flat revenue and a 34% labour cost rise, which I'd confirm as structural or one-off before it sets the run-rate. **Three:** the balance sheet holds ${fmt(DATA.stats.recoverable)} of recoverable aged positions, of which ${fmt(DATA.stats.writeback)} is clean write-back this period. Net: a healthy close with three decisions to make before you sign.`,
 margin:()=>`Hospitality (HOS-01) margin fell because revenue was essentially flat (+2%) while operating cost rose +34% month-on-month. Decomposing GL 5100, the rise is concentrated in agency and contract labour back-filling vacant permanent roles ahead of peak season, plus a utilities true-up. It does not appear in the Mandarin Oriental JV, which tells me it's an entity-specific staffing decision rather than a market move. My recommendation: get the controller to confirm whether the labour is structural. If it is, your FY Hospitality margin forecast needs a downward revision now — better to reset expectations this quarter than explain a miss next.`,
 writeback:()=>`${fmt(DATA.stats.writeback)} is eligible for clean write-back to income this period — that's the subset of flagged items where the agent's confidence is above 90% and the evidence chain is complete. The largest single item is the Arabtec contractor advance (AED 11.8M, aged 18 months, PO expired, no GRN). The broader recoverable pool is ${fmt(DATA.stats.recoverable)} across eight items, but the remainder needs either a provision call or a refund action rather than a straight write-back. I'd approve the three high-confidence items today and route the doubtful-recovery ones (Drake & Scull in liquidation) to a provision decision.`,
 approve:()=>`Before you sign, three things in priority order. **First**, approve the high-confidence write-backs — ${fmt(DATA.stats.writeback)} of clean P&L pickup with complete evidence; there's no reason to carry those balances another month. **Second**, get a structural-vs-one-off read on the Hospitality labour cost; it's the only item that changes your forward guidance. **Third**, clear the ${fmt(DATA.stats.ic_unmatched_val)} of intercompany timing differences before consolidation locks, so the group elimination is clean. The first is a money decision, the second is a forecast decision, the third is hygiene.`,
 interco:()=>`Seven of ten intercompany pairs auto-matched on exact and fuzzy logic. The three exceptions total ${fmt(DATA.stats.ic_unmatched_val)} net and are all explainable: two are timing — the counterpart entity books in the next period, so they self-clear — and one is an FX revaluation gap on the AED/USD leg that needs a small adjustment entry. None are leakage or error. The strategic point for the room: the same fuzzy-matching engine retargets to bank reconciliation and open-item matching with no rebuild. You're not buying an IC tool, you're buying a matching platform.`,
 entity:()=>`On a risk-weighted basis, the Real Estate development entities (RE-01 through RE-03) carry the most balance-sheet risk this close — they hold the bulk of the aged contractor advances and DLD positions, including the Arabtec and Drake & Scull items. RE-01 alone has the single largest write-back opportunity and an aged DLD deposit. On the P&L side, the risk sits in Hospitality (HOS-01) via margin, not balance sheet. Corporate and Investments are clean. If you're allocating controller attention this close, it goes to RE-01 first.`,
 cash:()=>{const c=DATA.tb.filter(r=>r.gl==='1000').reduce((s,r)=>s+r.cur,0);return `Group cash and bank stands at ${fmt(c)} across the 10 entities at close. Two things I'd note alongside the headline: the ${fmt(DATA.stats.recoverable)} of aged balance-sheet positions includes refund and deposit recoveries that convert to cash once actioned, and the forward projection shows collections running ahead of construction obligations for the next six months — no negative-net month. The liquidity position is comfortable; the opportunity is in accelerating the recoveries.`;},
 yoy:()=>{const c=consol('cur'),l=consol('ly');return `Against the same month last year, revenue is ${pct(c.rev,l.rev)>=0?'up':'down'} ${Math.abs(pct(c.rev,l.rev)).toFixed(1)}% and EBITDA ${pct(c.ebitda,l.ebitda)>=0?'up':'down'} ${Math.abs(pct(c.ebitda,l.ebitda)).toFixed(1)}%. The year-on-year story is the development cycle — handover recognition timing drives the comparison more than underlying demand. That's exactly why the seven-layer variance view exists: MoM tells you operations, YoY tells you cycle, budget-vs-actual tells you discipline. I'd read all three before drawing a conclusion from any one.`;},
 accrual:()=>`The PO-accrual run is the client's 16-step process, automated end to end through step 13: extraction, date logic, consumption, proration, billed-amount matching, the Consider-Yes/No exclusion rules and the AED 500 materiality cut. This month that produced ${fmt(DATA.stats.je_total)} of accruals across ${DATA.je.length} PO lines, with two auto-swept on rule (one pre-FY24 PO, one leasing cost centre) — reasons logged for audit. Steps 14–16 stay human: a controller reviews and posts to Fusion. The agent prepares; it never posts unsupervised.`,
 secure:()=>`Three structural controls, not policy promises. **One:** agents have read access to extracts and APIs, but the only write path to Oracle Fusion sits behind an approval gate — a posting happens only after a named human approves, which issues a signed authorization token. **Two:** every agent decision carries its evidence chain — you saw the confidence scores and source references in the scrutiny module — so audit can replay any recommendation. **Three:** the prototype runs entirely on extracts you provide; nothing leaves your environment in production deployment. Governance here is architecture, not discipline.`,
 differ:()=>`Three honest differences. Against **Power BI**: BI shows you a number; this explains it and recommends the action — commentary, root cause, and the write-back queue are things a dashboard doesn't do. Against the **current Accenture-run process**: they execute the 16-step accrual manually in Excel; we automate steps 1–13 and add the drill-down and AI commentary that don't exist today. Against **build-it-yourself**: the agents, the matching engine and the approval-gated write path are an accelerator you start from, not a blank page — which is the difference between a 6-month pilot and a 2-year program.`,
 timeline:()=>`Three phases. **Phase 1** is what you're looking at — the prototype on your extracts, hardened over 8–10 weeks into a Pathfinder running on live OTBI feeds for the entities you choose. **Phase 2** adds the contracts repository and your past packs so commentary gets richer, plus the cash-flow projection you saw in the Forecast view. **Phase 3** brings in unstructured sources — emails, approvals, vendor master — for the full semantic layer. Each phase ships value standalone; you're never funding a big bang.`,
 cash:()=>`On the six-month projection, collections exceed construction payment outflows in every month — the development cash engine self-funds the build programme through November. The pressure points are Jul–Aug, where Lagoons and Islands milestone payments peak; the buffer narrows but stays positive. Two levers if you want more headroom: the ${fmt(DATA.stats.recoverable)} balance-sheet cleanup converts to cash inside the quarter, and the aged hospitality receivables (AED 3.1M, >180 days) are collectible with credit-control pressure. I'd treat the projection as comfortable, not complacent — it assumes handover collections land on schedule.`,
 default:()=>`I can speak to anything in this close — the group and entity numbers, the seven variance layers, the aged balance-sheet items and their recommended actions, or the intercompany position. I read off the same agent outputs you see in the modules, so ask me about a specific entity, a variance, or what you should do about a finding, and I'll give you the controller's view.`
};
/* ================= SAGE LOCAL REASONING ENGINE =================
   Parses an arbitrary finance question into (entities, verticals, metric,
   comparison, intent) and COMPUTES the answer from live close data.
   This is genuine computed reasoning over the dataset — not canned text. */
const METRIC_WORDS={
  revenue:['revenue','sales','topline','top line','turnover'],
  ebitda:['ebitda','operating profit','operating income'],
  margin:['margin','profitability','profitable'],
  cost:['cost','direct cost','cogs','cost of sales','expense','expenses','opex','overhead','spend'],
  receivable:['receivable','receivables','ar ','debtor','owed','collection','collections','aging','aged','overdue','dso'],
  advance:['advance','advances','contractor advance','prepayment'],
  writeback:['write back','write-back','writeback','recover','recoverable','cleanup','clean up','release','provision','write off','write-off'],
  cash:['cash','liquidity','treasury','forecast','projection','outflow','inflow','payment','payments','runway'],
  accrual:['accrual','accruals','je','journal','provision entry'],
  intercompany:['intercompany','inter-company','ic ','interco','elimination'],
  payable:['payable','payables','ap ','creditor','vendor due']
};
const VERTICALS=['real estate','hospitality','investment','investments','corporate'];
function vertCanon(t){if(t.includes('real')||t.includes('estate'))return 'Real Estate';if(t.includes('hospital')||t.includes('hotel'))return 'Hospitality';if(t.includes('invest'))return 'Investments';if(t.includes('corp'))return 'Corporate';return null;}

function parseQuery(Q){
  const ctx={entities:[],verticals:[],vendors:[],projects:[],metric:null,cmp:null,intent:null,aging:null,raw:Q};
  // entities by code or name
  DATA.entities.forEach(e=>{
    if(Q.includes(e.code.toLowerCase())||Q.includes(e.name.toLowerCase().replace(' llc','').replace(' dev','')))ctx.entities.push(e.code);
  });
  // verticals
  VERTICALS.forEach(v=>{if(Q.includes(v)){const c=vertCanon(v);if(c&&!ctx.verticals.includes(c))ctx.verticals.push(c);}});
  // explicit entity tokens like "hos-01"
  (Q.match(/\b(re|hos|inv|cor)-?0?\d\b/g)||[]).forEach(t=>{const code=t.toUpperCase().replace(/(\D+)(\d+)/,(m,a,b)=>a+'-0'+b.replace(/^0/,''));const hit=DATA.entities.find(e=>e.code.replace('-','')===t.toUpperCase().replace('-',''));if(hit&&!ctx.entities.includes(hit.code))ctx.entities.push(hit.code);});
  // vendors & projects
  DATA.vendors.forEach(v=>{if(Q.includes(v.toLowerCase().split(' ')[0])&&v.split(' ')[0].length>4)ctx.vendors.push(v);});
  DATA.projects.forEach(p=>{if(Q.includes(p.toLowerCase().split(' ')[0])&&p.split(' ')[0].length>4)ctx.projects.push(p);});
  // metric
  for(const [m,ws] of Object.entries(METRIC_WORDS)){if(ws.some(w=>Q.includes(w))){ctx.metric=m;break;}}
  // comparison basis
  if(/budget|plan|target/.test(Q))ctx.cmp='bud';
  else if(/last year|prior year|year.?on.?year|yoy|vs.*year|same.*last year/.test(Q))ctx.cmp='ly';
  else if(/prior month|last month|month.?on.?month|mom|previous month/.test(Q))ctx.cmp='prior';
  // aging threshold
  const am=Q.match(/(\d{2,3})\s*(day|days|months?)/);if(am)ctx.aging={n:+am[1],unit:am[2].startsWith('month')?'m':'d'};
  // intent
  if(/^(why|what.*driv|what.*caus|reason|explain|how come)/.test(Q)||/\bwhy\b/.test(Q))ctx.intent='why';
  else if(/which|what.*(most|highest|largest|biggest|lowest|worst|best|top)|rank|who has/.test(Q))ctx.intent='rank';
  else if(/should i|recommend|what.*do|advice|advise|action|prioriti/.test(Q))ctx.intent='recommend';
  else if(/compare|versus|\bvs\b|difference between|against/.test(Q))ctx.intent='compare';
  else if(/how many|count|list|number of/.test(Q))ctx.intent='count';
  else ctx.intent='lookup';
  return ctx;
}

// metric value for an entity (or group if code null)
function metricVal(code,metric,field){
  field=field||'cur';
  if(['revenue','ebitda','margin','cost'].includes(metric)){
    const a=code?entAgg(code,field):consol(field);
    if(metric==='revenue')return a.rev; if(metric==='ebitda')return (code?a.eb:a.ebitda);
    if(metric==='cost')return (code?a.cost:a.cost); if(metric==='margin')return code?a.mgn:(a.ebitda/a.rev*100);
  }
  if(metric==='receivable')return DATA.tb.filter(r=>(!code||r.entity===code)&&r.gd.includes('Receivable')).reduce((s,r)=>s+r[field],0);
  if(metric==='advance')return DATA.tb.filter(r=>(!code||r.entity===code)&&r.gd.includes('Advance')).reduce((s,r)=>s+r[field],0);
  if(metric==='payable')return -DATA.tb.filter(r=>(!code||r.entity===code)&&r.gd.includes('Payable')).reduce((s,r)=>s+r[field],0);
  return 0;
}
function metricLabel(m){return {revenue:'revenue',ebitda:'EBITDA',margin:'margin',cost:'direct cost',receivable:'trade receivables',advance:'contractor advances',payable:'trade payables'}[m]||m;}

function reasonLocal(q){
  const Q=q.toLowerCase().trim();
  const c=parseQuery(Q);
  // ---- deep canned narratives for the big strategic topics (richer than compute) ----
  if(c.metric==='margin'&&(c.verticals.includes('Hospitality')||c.entities.includes('HOS-01'))&&c.intent==='why')return KB.margin();
  if(c.metric==='writeback'&&/how much|total|eligible/.test(Q))return KB.writeback();
  if(c.metric==='intercompany'&&!c.entities.length)return KB.interco();
  if(c.metric==='cash'&&!/[a-z]{3}\s|jun|jul|aug|sep|oct|nov/.test(Q))return KB.cash();
  if(/secur|govern|audit|trust|control/.test(Q))return KB.secure();
  if(/accenture|power.?bi|differ|why.*tiger|build.*ourselves|off.the.shelf/.test(Q))return KB.differ();
  if(/timeline|how long|implement|roll.?out|go.?live/.test(Q))return KB.timeline();
  if(/summar|overview|three line|how.*(close|going)|headline/.test(Q))return KB.summar();

  // ---- CASH / FORECAST (month-aware) ----
  if(c.metric==='cash'||/cash|liquidit|forecast|outflow|collection|payment|runway/.test(Q)){
    const months={jun:0,jul:1,aug:2,sep:3,oct:4,nov:5,june:0,july:1,august:2,september:3,october:4,november:5};
    const inn=[505,468,452,522,564,538], out=[418,466,512,478,392,355];
    let mi=-1; for(const k in months){if(Q.includes(k)){mi=months[k];break;}}
    if(mi>=0){const net=inn[mi]-out[mi];const nm=['June','July','August','September','October','November'][mi];
      return `In ${nm}, projected collections of AED ${inn[mi]}M ${net>=0?'exceed':'fall short of'} construction outflows of AED ${out[mi]}M — a net ${net>=0?'+':''}${net}M position. ${net>=0?'The development cash engine self-funds the build that month.':'Milestone payments peak; the buffer narrows but the cumulative position holds positive.'} The largest outflows are the Lagoons and Islands milestone certifications. Tap the ${nm} bar on the cash view to see outflows by project.`;}
    return KB.cash();
  }

  // ---- RANK ----
  if(c.intent==='rank'){
    const lowest=/lowest|worst|least|smallest|weakest/.test(Q);
    if(c.metric==='writeback'||/aged|exception|risk|recover/.test(Q)){
      const items=[...DATA.scrutiny].sort((a,b)=>b.amount-a.amount);
      const t=items[0];
      return `The largest aged exception is the ${t.acct.toLowerCase()} at ${t.entity} — ${fmt(t.amount)} tied to ${t.vendor}, aged ${t.age} months. ${t.cause} My recommendation: ${t.rec.toLowerCase()}. The next two are ${items[1].entity} (${fmt(items[1].amount)}) and ${items[2].entity} (${fmt(items[2].amount)}).`;
    }
    const m=c.metric||'revenue';
    const scope = c.verticals.length?DATA.entities.filter(e=>c.verticals.includes(e.vertical)):DATA.entities;
    const ranked=scope.map(e=>({e,v:metricVal(e.code,m),mom:pct(metricVal(e.code,m),metricVal(e.code,m,'prior'))}))
      .sort((a,b)=> (/grow|grew|growth|increas|improv/.test(Q)? b.mom-a.mom : (lowest? a.v-b.v : b.v-a.v)));
    const top=ranked[0];
    if(/grow|grew|growth|increas|improv/.test(Q))
      return `${top.e.code} (${top.e.name}) grew ${metricLabel(m)} the most — ${top.mom>=0?'+':''}${top.mom.toFixed(1)}% month-on-month, to ${fmt(top.v)}. Behind it: ${ranked[1].e.code} at ${ranked[1].mom>=0?'+':''}${ranked[1].mom.toFixed(1)}%.`;
    return `On ${metricLabel(m)}, ${top.e.code} (${top.e.name}) is ${lowest?'the lowest':'the highest'} at ${m==='margin'?top.v.toFixed(1)+'%':fmt(top.v)}${c.verticals.length?' within '+c.verticals[0]:''}. ${ranked[1].e.code} follows at ${m==='margin'?ranked[1].v.toFixed(1)+'%':fmt(ranked[1].v)}. Click the entity row on the summary to drill into the P&L.`;
  }

  // ---- COMPARE ----
  if(c.intent==='compare'){
    const m=c.metric||'margin';
    let a,b,la,lb;
    if(c.verticals.length>=2){const V=vertAgg('cur');a=V[c.verticals[0]];b=V[c.verticals[1]];la=c.verticals[0];lb=c.verticals[1];
      const ma=a.rev?a.eb/a.rev*100:0,mb=b.rev?b.eb/b.rev*100:0;
      if(m==='margin')return `${la} ran a ${ma.toFixed(1)}% margin this month versus ${lb} at ${mb.toFixed(1)}% — a ${Math.abs(ma-mb).toFixed(1)}-point gap. ${ma>mb?la:lb} is the stronger performer; ${ma<mb?la:lb} is where I'd focus attention.`;
      return `On ${metricLabel(m)}: ${la} ${fmt(m==='ebitda'?a.eb:a.rev)} vs ${lb} ${fmt(m==='ebitda'?b.eb:b.rev)}.`;
    }
    if(c.entities.length>=2){const A=entAgg(c.entities[0]),B=entAgg(c.entities[1]);
      const va=metricVal(c.entities[0],m),vb=metricVal(c.entities[1],m);
      return `${c.entities[0]} posts ${m==='margin'?va.toFixed(1)+'%':fmt(va)} on ${metricLabel(m)} against ${c.entities[1]} at ${m==='margin'?vb.toFixed(1)+'%':fmt(vb)}. ${va>vb?c.entities[0]:c.entities[1]} leads by ${m==='margin'?Math.abs(va-vb).toFixed(1)+' points':fmt(Math.abs(va-vb))}.`;
    }
  }

  // ---- WHY (causal) ----
  if(c.intent==='why'){
    if(c.entities.length){const code=c.entities[0];const a=entAgg(code),p=entAgg(code,'prior');
      const moves=DATA.tb.filter(r=>r.entity===code&&r.typ==='PL').map(r=>({gd:r.gd,d:r.cur-r.prior})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d))[0];
      const exc=DATA.scrutiny.filter(s=>s.entity===code);
      let ans=`${code}'s EBITDA moved ${pct(a.eb,p.eb)>=0?'up':'down'} ${Math.abs(pct(a.eb,p.eb)).toFixed(1)}% on the month, to ${fmt(a.eb)} at a ${a.mgn.toFixed(1)}% margin. The biggest single driver was ${moves.gd} (${fmt(moves.d)} movement).`;
      if(exc.length)ans+=` It also carries ${exc.length} open scrutiny item${exc.length>1?'s':''} — the largest is ${fmt(exc.sort((x,y)=>y.amount-x.amount)[0].amount)} of ${exc[0].acct.toLowerCase()}, which is why I'd flag it for attention.`;
      return ans;
    }
    if(c.verticals.includes('Hospitality')||c.metric==='margin')return KB.margin();
    // generic why on group EBITDA
    const cc=consol('cur'),pp=consol('prior');
    return `Group EBITDA ${pct(cc.ebitda,pp.ebitda)>=0?'rose':'fell'} ${Math.abs(pct(cc.ebitda,pp.ebitda)).toFixed(1)}% to ${fmt(cc.ebitda)}. Revenue moved ${fmt(cc.rev-pp.rev)} on Real Estate handover recognition, partly offset by the Hospitality cost rise. The one item that changes the forward view is Hospitality margin — ask me about that specifically and I'll give you the structural read.`;
  }

  // ---- COUNT / LIST ----
  if(c.intent==='count'){
    if(/exception|aged|scrutiny|flag|risk/.test(Q)){const hi=DATA.scrutiny.filter(s=>s.risk==='High').length;
      return `The scrutiny agent flagged ${DATA.scrutiny.length} exceptions this close — ${hi} high-risk, the rest medium and low — totalling ${fmt(DATA.stats.recoverable)} of recoverable balances. ${fmt(DATA.stats.writeback)} of that is clean write-back this period.`;}
    if(/entit/.test(Q))return `The close covers ${DATA.entities.length} entities across Real Estate, Hospitality, Investments and Corporate. The group as a whole is ~400 legal entities; these 10 carry the material balances.`;
    if(/interco|ic |pair|unmatch/.test(Q))return `${DATA.stats.ic_total} intercompany pairs in scope — ${DATA.stats.ic_matched} auto-matched, ${DATA.stats.ic_total-DATA.stats.ic_matched} in review for ${fmt(DATA.stats.ic_unmatched_val)} net, all explained by timing or FX.`;
    return KB.summar();
  }

  // ---- RECOMMEND ----
  if(c.intent==='recommend'){
    if(c.entities.length){const code=c.entities[0];const exc=DATA.scrutiny.filter(s=>s.entity===code);const a=entAgg(code);
      if(exc.length){const t=exc.sort((x,y)=>y.amount-x.amount)[0];
        return `For ${code}: the priority is the ${fmt(t.amount)} ${t.acct.toLowerCase()} aged ${t.age} months — my recommendation is to ${t.rec.toLowerCase()}, ${t.evidence}. Beyond that the entity is running a ${a.mgn.toFixed(1)}% margin, ${pct(a.rev,entAgg(code,'prior').rev)>=0?'up':'down'} on the month, so no P&L concern. Approve the action behind the gate and it posts with a signed audit entry.`;}
      return `${code} looks clean this close — ${a.mgn.toFixed(1)}% margin, no open scrutiny items. Nothing for you to action here; I'd spend your review time on the Real Estate entities carrying the aged advances.`;
    }
    return KB.approve();
  }

  // ---- LOOKUP (default quantitative) ----
  if(c.metric){
    const field=c.cmp||'cur';
    const cmpName=c.cmp==='bud'?'budget':c.cmp==='ly'?'last year':c.cmp==='prior'?'prior month':null;
    if(c.entities.length){const code=c.entities[0];const v=metricVal(code,c.metric);const pv=metricVal(code,c.metric,c.cmp||'prior');const d=pct(v,pv);
      return `${code} (${DATA.entities.find(e=>e.code===code).name}) posted ${c.metric==='margin'?v.toFixed(1)+'%':fmt(v)} of ${metricLabel(c.metric)} this month, ${d>=0?'up':'down'} ${Math.abs(d).toFixed(1)}% versus ${cmpName||'prior month'}. ${DATA.scrutiny.some(s=>s.entity===code)?'Note it has an open scrutiny item worth a look.':''}`;
    }
    if(c.verticals.length){const V=vertAgg('cur');const a=V[c.verticals[0]];
      const val=c.metric==='margin'?(a.rev?a.eb/a.rev*100:0):(c.metric==='ebitda'?a.eb:a.rev);
      return `${c.verticals[0]} delivered ${c.metric==='margin'?val.toFixed(1)+'%':fmt(val)} of ${metricLabel(c.metric)} this close. Want it broken to entity level? Tap the vertical on the revenue or EBITDA drill.`;
    }
    // group level
    const v=metricVal(null,c.metric);const pv=metricVal(null,c.metric,c.cmp||'prior');const d=pct(v,pv);
    const cmpTxt=cmpName||'the prior month';
    return `At group level, ${metricLabel(c.metric)} is ${c.metric==='margin'?v.toFixed(1)+'%':fmt(v)}${Math.abs(d)>=0.05?', '+(d>=0?'up':'down')+' '+Math.abs(d).toFixed(1)+'% on '+cmpTxt:' (broadly flat on '+cmpTxt+')'}. Ask me for a specific entity or vertical and I'll split it.`;
  }

  // ---- entity named, no metric ----
  if(c.entities.length){const code=c.entities[0];const a=entAgg(code);const exc=DATA.scrutiny.filter(s=>s.entity===code);
    return `${code} — ${DATA.entities.find(e=>e.code===code).name}: ${fmt(a.rev)} revenue, ${fmt(a.eb)} EBITDA, ${a.mgn.toFixed(1)}% margin, ${pct(a.rev,entAgg(code,'prior').rev)>=0?'up':'down'} ${Math.abs(pct(a.rev,entAgg(code,'prior').rev)).toFixed(1)}% on the month. ${exc.length?exc.length+' open scrutiny item(s) totalling '+fmt(exc.reduce((s,x)=>s+x.amount,0))+'.':'No open exceptions.'}`;
  }

  // ---- genuine fallback: reflect what was asked, stay useful ----
  return `I can reason over anything in this close — the group and per-entity P&L, the seven variance layers, the aged balance-sheet items, intercompany, the accrual run and the cash projection. I read off the live agent outputs, so try me on a specific entity (e.g. "what's RE-02's margin?"), a comparison ("Hospitality vs Real Estate"), a ranking ("which entity grew most?"), or a decision ("what should I approve?").`;
}

function scriptedAnswer(q){
  const s=q.toLowerCase();
  if(/summar|three line|overview|how.*(close|going)/.test(s))return KB.summar();
  if(/margin|hospital|labour|labor/.test(s))return KB.margin();
  if(/cash|liquidit|treasur/.test(s))return KB.cash();
  if(/last year|yoy|year.on.year|vs.*year|compare.*year/.test(s))return KB.yoy();
  if(/accrual|16.step|je |journal/.test(s))return KB.accrual();
  if(/secur|govern|safe|audit|control|risk.*data|data.*risk/.test(s))return KB.secure();
  if(/power.?bi|accenture|differ|why.*tiger|compare.*(tool|vendor)|build.*ourselves/.test(s))return KB.differ();
  if(/timeline|how long|implement|roll.?out|phase/.test(s))return KB.timeline();
  if(/write.?back|how much.*recover|recover.*period/.test(s))return KB.writeback();
  if(/approve|sign|before.*sign|what.*action|recommend|should i do/.test(s))return KB.approve();
  if(/cash|forecast|project|payment|outflow|collect|liquidity/.test(s))return KB.cash();
  if(/interco|ic |recon|match|trapped|400 entit/.test(s))return KB.interco();
  if(/entity|which.*risk|most risk|risk.*entity/.test(s))return KB.entity();
  if(/clean|aged|scrutiny|balance sheet/.test(s))return KB.writeback();
  return KB.default();
}
// simple Arabic rendering for the canned answers (demo-grade)
const AR={
 summar:'إغلاق سليم بشكل عام. الإيرادات بلغت أعلى قليلاً من الموازنة بفضل الإيرادات العقارية. نقطة الانتباه هي هامش الضيافة الذي انخفض بسبب ارتفاع تكاليف التشغيل. الميزانية تحمل مبالغ قابلة للاسترداد تستحق القرار قبل التوقيع.',
 default:'يمكنني الإجابة عن أي سؤال يخص هذا الإغلاق — أرقام المجموعة والكيانات، طبقات التباين، البنود المتقادمة في الميزانية، أو وضع المعاملات بين الشركات. اسألني عن كيان معيّن أو تباين محدد.'
};

function openSage(){
  const panel=el('sage');
  if(_sageDragged){panel.style.left=_sageDragPos.left+'px';panel.style.top=_sageDragPos.top+'px';}
  panel.classList.add('on'); el('sageFab').style.display='none';
  const b=el('sageFab').querySelector('.badge'); if(b)b.remove();
  if(!sageOpened){ sageOpened=true; initSageDrag(); renderSuggest(); renderVoicePicker();
    // wire input event for slash commands
    const inp=el('sageInput');
    inp.addEventListener('input',function(){const v=this.value;if(v.startsWith('/'))showCmdPalette(v.slice(1).toLowerCase());else hideCmdPalette();});
    inp.addEventListener('keydown',function(e){
      const pal=el('cmdPalette');if(!pal||pal.style.display==='none')return;
      if(e.key==='ArrowDown'){e.preventDefault();_cmdSel=Math.min(_cmdSel+1,_cmdFiltered.length-1);showCmdPalette(this.value.slice(1).toLowerCase());}
      else if(e.key==='ArrowUp'){e.preventDefault();_cmdSel=Math.max(_cmdSel-1,0);showCmdPalette(this.value.slice(1).toLowerCase());}
      else if(e.key==='Escape'){hideCmdPalette();}
      else if(e.key==='Tab'&&_cmdFiltered.length){e.preventDefault();this.value=_cmdFiltered[_cmdSel>=0?_cmdSel:0].cmd;showCmdPalette('');}
    });
    // artifact auto-probe: in Claude.ai artifact runtime the API authenticates transparently;
    // outside artifact, this will fail silently and the user clicks the pill to enter a key
    const probeHeaders={"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
    if(LIVE_KEY) probeHeaders["x-api-key"]=LIVE_KEY;
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:probeHeaders,
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:10,messages:[{role:"user",content:"ping"}]})
    }).then(r=>{if(r.ok||r.status===200){window._liveOK=true;const mp=el('aiMode');if(mp){mp.classList.add('live');mp.textContent='● Sonnet 4.6 · live';}}}).catch(()=>{});
    sageMsg('s', SAGE_LANG==='ar'?'مرحباً، أنا Sage، مساعدك المالي. كيف يمكنني المساعدة في إغلاق هذا الشهر؟':"I'm Sage. I've read every entity in this close and I reason over the live numbers — so ask me anything, not just the obvious. Try a specific entity, a comparison, a ranking, or a decision: \"what's RE-02's margin?\", \"compare Hospitality and Real Estate\", \"which entity grew the most?\", \"what should I approve?\"");
  }
}
function closeSage(){el('sage').classList.remove('on');el('sageFab').style.display='flex';if(speechSynthesis)speechSynthesis.cancel();}
function setLang(l){SAGE_LANG=l;el('langEN').classList.toggle('on',l==='en');el('langAR').classList.toggle('on',l==='ar');
  el('sageRole').textContent=l==='ar'?'المساعد المالي المعرفي':'Finance knowledge assistant';
  el('sageInput').placeholder=l==='ar'?'اسأل عن الإغلاق، كيان، أو تباين…':'Ask about the close, an entity, a variance…';
  el('sageInput').style.direction=l==='ar'?'rtl':'ltr';
  renderSuggest(); renderVoicePicker();
}
function connectAI(){
  const cur=LIVE_KEY;
  const k=prompt('Paste your Anthropic API key (sk-ant-…).\nIt stays in browser memory only — never stored or sent anywhere except the Anthropic API.',cur||'');
  if(!k||!k.trim())return;
  LIVE_KEY=k.trim();
  // verify the key
  const headers={"Content-Type":"application/json","x-api-key":LIVE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
  fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:10,messages:[{role:"user",content:"ping"}]})
  }).then(r=>{
    if(r.ok){
      window._liveOK=true;
      try{localStorage.setItem('sage_api_key',LIVE_KEY);}catch(e){}
      const mp=el('aiMode');if(mp){mp.classList.add('live');mp.textContent='● Sonnet 4.6 · live';}
      sageMsg('s','**Connected to Claude Sonnet 4.6.** I now reason live over every entity in this close — ask me anything, however open-ended.');
    } else {
      r.json().then(j=>sageMsg('s','API error: '+(j.error?.message||r.status)+'. Check your key and try again.')).catch(()=>sageMsg('s','API returned '+r.status+'. Check your key.'));
      LIVE_KEY=''; try{localStorage.removeItem('sage_api_key');}catch(e){}
    }
  }).catch(e=>{sageMsg('s','Connection failed: '+e.message);LIVE_KEY='';try{localStorage.removeItem('sage_api_key');}catch(e){}});
}
function renderVoicePicker(){
  const sel=el('voiceSel'); if(!sel)return;
  const vs=loadVoices().filter(v=>v.lang.startsWith(SAGE_LANG==='ar'?'ar':'en'));
  if(!vs.length){sel.innerHTML='<option>default voice</option>';return;}
  const best=pickVoice(SAGE_LANG);
  sel.innerHTML=vs.map(v=>`<option value="${v.name}" ${best&&v.name===best.name?'selected':''}>${v.name.replace('Microsoft ','').replace('Google ','').slice(0,22)}</option>`).join('');
  if(best&&!CHOSEN_VOICE)CHOSEN_VOICE=best;
}
function setVoice(name){CHOSEN_VOICE=loadVoices().find(v=>v.name===name)||null;
  speak(SAGE_LANG==='ar'?'تم اختيار هذا الصوت':"This is how I'll sound — natural, and grounded in your numbers.");}
function renderSuggest(){
  const items=SAGE_LANG==='ar'?['لخّص هذا الإغلاق','لماذا انخفض هامش الضيافة؟','ماذا أعتمد قبل التوقيع؟']:SUGGEST;
  el('sageSuggest').innerHTML=items.map(s=>`<button class="sugg" onclick="askSage(this.textContent)">${s}</button>`).join('');
}
function sageMsg(who,text,rtl){
  const b=el('sageBody');const d=document.createElement('div');
  if(who==='u'){d.className='msg u';d.textContent=text;}
  else{d.className='msg s'+((rtl||SAGE_LANG==='ar')?' rtl':'');d.innerHTML=`<div class="who">SAGE</div><div class="bubble">${renderSageMd(text)}</div>`;}
  b.appendChild(d);b.scrollTop=b.scrollHeight;return d;
}
function askSage(q){el('sageInput').value=q;sendSage();}
function sendSage(){
  const inp=el('sageInput');const q=inp.value.trim();if(!q)return;
  hideCmdPalette();
  // slash command interception
  if(q.startsWith('/')){
    const token=q.split(' ')[0].toLowerCase();
    const found=SAGE_COMMANDS.find(c=>c.cmd===token);
    if(found){runSageCmd(found.cmd);return;}
    // /help — list all commands
    if(token==='/help'||token==='/'){
      inp.value='';sageMsg('u',q);
      sageMsg('s','**Available slash commands:**\n\n'+SAGE_COMMANDS.map(c=>`**${c.cmd}** — ${c.label}: ${c.desc}`).join('\n'));
      return;
    }
  }
  inp.value='';sageMsg('u',q);
  el('sageSuggest').style.display='none';
  runAgentSequence(q);
}
function runAgentSequence(q){
  const agents=pickAgents(q);
  const b=el('sageBody');
  const seq=document.createElement('div');seq.className='agent-seq';
  seq.innerHTML=`<div class="sq-h"><span class="processing"><i></i><i></i><i></i></span> Sage is orchestrating ${agents.length} agents…</div>`+
    agents.map((a,i)=>`<div class="aseq-step" id="seqs-${i}"><span class="d"></span><span class="ag">${a}</span> <span id="seqt-${i}" style="color:var(--ink-3)">queued</span></div>`).join('');
  b.appendChild(seq);b.scrollTop=b.scrollHeight;
  const tasks={EXTRACT:'pulling source records',MAP:'aligning to canonical model',VARIANCE:'computing material movements',
    SCRUTINY:'scoring aged balances',RECON:'matching counterpart ledgers',COMMENTARY:'synthesising the narrative',FORECAST:'projecting forward'};
  // light up the chosen capabilities on the mesh (the rest stay dormant)
  setActive(agents);
  // dynamic specialist: margin questions spawn a transient decomposition agent
  const ql=q.toLowerCase();
  let spawnLabel=null, spawnFrom=null;
  if(/margin|hospital|labour|labor|cost/.test(ql)){spawnLabel='Labour-cost decomp';spawnFrom='VARIANCE';}
  else if(/aged|write.?back|recover|provision/.test(ql)){spawnLabel='Aging-risk scorer';spawnFrom='SCRUTINY';}
  else if(/cash|forecast|payment|liquid/.test(ql)){spawnLabel='Payment-curve model';spawnFrom='FORECAST';}
  let i=0;
  const step=()=>{
    if(i>0){el('seqs-'+(i-1)).classList.add('done');el('seqt-'+(i-1)).textContent='done';el('seqt-'+(i-1)).style.color='var(--ok)';}
    if(i<agents.length){
      const a=agents[i];el('seqs-'+i).classList.add('on');el('seqt-'+i).textContent=tasks[a]||'working';
      emit(a,'Sage query → '+(tasks[a]||'working'),'invoked by knowledge assistant\nquery: "'+q.slice(0,48)+'"','act');
      // spawn the transient specialist as its parent capability fires
      if(spawnLabel&&a===spawnFrom){spawnAgent(spawnLabel,spawnFrom);spawnLabel=null;}
      i++;setTimeout(step,560);
    } else { setTimeout(()=>setActive([]),900); deliverAnswer(q); }
  };
  setTimeout(step,300);
}
function deliverAnswer(q){
  const b=el('sageBody');
  const typing=document.createElement('div');typing.className='msg s';typing.innerHTML='<div class="who">SAGE</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>';
  b.appendChild(typing);b.scrollTop=b.scrollHeight;
  // hybrid: try live API, fall back to local reasoning engine
  liveAnswer(q).then(ans=>{
    typing.remove();
    const d=sageMsg('s',ans);
    const mp=el('aiMode');if(mp){mp.classList.add('live');mp.textContent='● Sonnet 4.6 · live';}
    speak(ans);
  }).catch(err=>{
    typing.remove();
    if(err.message==='no-key'){
      // no key and not in artifact — use local reasoning but hint about live mode
      const ans=SAGE_LANG==='ar'?(scriptedAnswerAR(q)):reasonLocal(q);
      sageMsg('s',ans);
      speak(ans);
    } else {
      // API call failed — fall back to local reasoning, log the error
      console.warn('Sage live API error:',err.message);
      const ans=SAGE_LANG==='ar'?(scriptedAnswerAR(q)):reasonLocal(q);
      const d=sageMsg('s',ans);
      speak(ans);
    }
  });
}
function scriptedAnswerAR(q){const s=q.toLowerCase();if(/summar|لخص|إغلاق/.test(s))return AR.summar;return AR.default;}

/* ---------- PROACTIVE SAGE ---------- */
let pingShown=false, pingQ='';
function showPing(text,question){
  if(pingShown)return; pingShown=true; pingQ=question;
  el('pingText').textContent=text;
  el('sagePing').classList.add('on');
  emit('COMMENTARY','proactive insight raised','threshold breach detected unprompted\nrouted to knowledge assistant','flag');
}
function dismissPing(){el('sagePing').classList.remove('on');}
function pingFollow(){dismissPing();openSage();setTimeout(()=>askSage(pingQ),350);}
function schedulePing(){
  setTimeout(()=>{
    if(!anyIngested())return;
    showPing('While the close was running, Hospitality operating margin compressed '+hosMarginDelta().toFixed(1)+' points — cost rose 34% on flat revenue. No one flagged this manually. Want the breakdown and my recommendation?',
      'Why did Hospitality margin compress and is it structural?');
  }, 6000);
}

/* ---------- AUDIT TRAIL ---------- */
function openAudit(){
  const rows=AUDIT.slice(-40).reverse().map(a=>
    `<div class="audit-row"><span class="seq">#${a.seq}</span><span class="ag">${a.agent}</span>
     <span class="m">${a.msg}<span class="h">sig <b>${a.h}</b> · ${a.t} · chained to #${a.seq-1>0?a.seq-1:'genesis'}</span></span></div>`).join('');
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">GOVERNANCE</span>
    <div class="h2" style="margin-top:10px">Audit & evidence trail</div>
    <div class="mini muted">every agent action signed and hash-chained · tamper-evident · exportable for audit</div></div>
    <div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
     <div class="reason-box" style="margin-bottom:16px"><span class="k">Why this matters.</span> Balance-sheet cleanup touches profit and tax. Every recommendation, approval and posting in this system carries a signature chained to the previous event — alter any record and the chain breaks visibly. Your auditors get a complete, ordered evidence pack: what the agent saw, what it recommended, who approved, what was posted. <span class="k">Governance is structural here, not procedural.</span></div>
     <div style="display:flex;gap:10px;margin-bottom:16px">
       <button class="btn pri" onclick="toast('Evidence pack generated — '+AUDIT.length+' signed events · PDF')">Export evidence pack</button>
       <button class="btn" onclick="toast('Chain verified — no breaks across '+AUDIT.length+' events')">Verify chain</button>
     </div>
     ${rows||'<div class=empty>No events yet — ingest sources to begin.</div>'}
   </div>`);
}

/* ---------- SCRUTINY EVIDENCE PANEL ---------- */
function evidencePanel(s){
  const rnd=rng(hashStr('ev'+s.id));
  const n=3+Math.floor(rnd()*2);
  const w=[...Array(n)].map(()=>0.5+rnd()); const tw=w.reduce((a,b)=>a+b,0);
  let run=0,rows='';
  for(let i=0;i<n;i++){
    const amt=(i<n-1)?Math.round(s.amount*w[i]/tw):Math.round(s.amount-run);run+=amt;
    const mo=['Nov-24','Jan-25','Mar-25','Jun-25','Sep-25'][Math.floor(rnd()*5)];
    rows+=`<tr><td class="mini num">JE-${77400+i*7+parseInt(s.id.slice(2))}</td><td class="mini num">${mo}</td><td class="mini">${['Advance payment','Milestone advance','Mobilisation advance','Retention adjustment'][Math.floor(rnd()*4)]}</td><td class="r num">${fmtN(amt)}</td></tr>`;}
  const poNo='PO-'+(44000+hashStr(s.id)%900);
  return `<table style="margin-bottom:12px"><thead><tr><th>Posting</th><th>Period</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${rows}
   <tr style="border-top:2px solid var(--line-2)"><td colspan=3><b style="color:var(--ink)">Balance — ties to GL ${s.gl}</b></td><td class="r num"><b style="color:var(--orange-soft)">${fmtN(s.amount)}</b></td></tr></tbody></table>
   <div class="grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
     <div class="card" style="padding:11px"><div class="kpi-label" style="font-size:9.5px">Linked PO</div><div class="mini num" style="margin-top:4px;font-weight:600">${poNo}</div></div>
     <div class="card" style="padding:11px"><div class="kpi-label" style="font-size:9.5px">Last activity</div><div class="mini num" style="margin-top:4px;font-weight:600">${s.age} months ago</div></div>
     <div class="card" style="padding:11px"><div class="kpi-label" style="font-size:9.5px">Counterparty</div><div class="mini" style="margin-top:4px;font-weight:600">${s.vendor}</div></div>
   </div>`;
}

/* ---------- ENTITY & KPI DRILL-DOWNS ---------- */
function entAgg(code,field){
  field=field||'cur';
  let rev=0,cost=0,opex=0;
  DATA.tb.filter(r=>r.entity===code&&r.typ==='PL').forEach(r=>{
    if(r.l2==='Revenue')rev+=r[field]; else if(r.l2==='Direct Cost')cost+=r[field]; else opex+=r[field];});
  rev=-rev; const eb=rev-cost-opex;
  const out={rev,cost,opex,eb,mgn:rev?eb/rev*100:0};
  if(field==='cur'){const p=entAgg(code,'prior');out.mom=p.rev?((rev-p.rev)/Math.abs(p.rev)*100):0;}
  return out;
}
function vertAgg(field){
  const m={};
  DATA.entities.forEach(e=>{const a=entAgg(e.code,field);m[e.vertical]=m[e.vertical]||{rev:0,eb:0};m[e.vertical].rev+=a.rev;m[e.vertical].eb+=a.eb;});
  return m;
}
function entityDrawer(code){
  const e=DATA.entities.find(x=>x.code===code);
  emit('EXTRACT','entity drill → '+code,'assembling entity P&L + open items\nsource: ingested TB · '+e.name,'act');
  const a=entAgg(code),p=entAgg(code,'prior');
  const moves=DATA.tb.filter(r=>r.entity===code&&r.typ==='PL').map(r=>({gd:r.gd,gl:r.gl,d:r.cur-r.prior,cur:r.cur}))
    .sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,5);
  const exc=DATA.scrutiny.filter(s=>s.entity===code);
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">ENTITY</span>
   <div class="h2" style="margin-top:10px">${e.code} · ${e.name}</div><div class="mini muted">${e.vertical} · May 2026 close</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
   <table style="margin-bottom:18px"><thead><tr><th>P&L</th><th class="r">Prior</th><th class="r">Current</th><th class="r">Δ%</th></tr></thead><tbody>
   ${[['Revenue',p.rev,a.rev],['Direct cost',p.cost,a.cost],['Operating expense',p.opex,a.opex],['EBITDA',p.eb,a.eb]].map(([l,pv,cv])=>{const d=pct(cv,pv);
     return `<tr><td><b style="color:var(--ink)">${l}</b></td><td class="r num">${fmtN(pv)}</td><td class="r num">${fmtN(cv)}</td><td class="r num ${d>=0?'pos':'neg'}">${d>=0?'+':''}${d.toFixed(1)}%</td></tr>`}).join('')}
   <tr><td><b style="color:var(--ink)">Margin</b></td><td class="r num">${p.mgn.toFixed(1)}%</td><td class="r num">${a.mgn.toFixed(1)}%</td>
   <td class="r num ${a.mgn>=p.mgn?'pos':'neg'}">${(a.mgn-p.mgn)>=0?'+':''}${(a.mgn-p.mgn).toFixed(1)} pts</td></tr>
   </tbody></table>
   <div class="h2" style="font-size:13px;margin-bottom:8px">Top movements MoM</div>
   <table style="margin-bottom:18px"><tbody>
   ${moves.map(m=>`<tr class="tap" onclick="drillTxn('${code}','${m.gl}')"><td class="mini">${m.gd}</td><td class="r num ${m.d>=0?'pos':'neg'}">${fmtN(m.d)}</td><td style="width:20px" class="muted">›</td></tr>`).join('')}
   </tbody></table>
   ${exc.length?`<div class="h2" style="font-size:13px;margin-bottom:8px">Open scrutiny items</div>
   ${exc.map(s=>`<div class="ib-act" onclick="openScrutiny('${s.id}')" style="margin-bottom:8px"><div class="ib-rank">${s.id.slice(2)}</div><div><div class="ib-act-t">${s.acct} · ${s.vendor}</div><div class="ib-act-s">${s.rec} · ${s.age} months aged</div></div><div class="ib-act-n">${fmt(s.amount)}</div></div>`).join('')}`
   :'<p class="mini muted">No open scrutiny items for this entity.</p>'}
   </div>`);
}
function drillRevenue(){
  emit('VARIANCE','revenue decomposition','splitting by vertical × entity\nbasis: MoM','act');
  const v=vertAgg('cur'),vp=vertAgg('prior');
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">DRILL-DOWN</span>
   <div class="h2" style="margin-top:10px">Group revenue — decomposition</div><div class="mini muted">consolidated → vertical → entity · click an entity for full P&L</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
   <table style="margin-bottom:18px"><thead><tr><th>Vertical</th><th class="r">Prior</th><th class="r">Current</th><th class="r">Δ%</th></tr></thead><tbody>
   ${Object.keys(v).map(k=>{const d=pct(v[k].rev,vp[k].rev);return `<tr><td><b style="color:var(--ink)">${k}</b></td><td class="r num">${fmtN(vp[k].rev)}</td><td class="r num">${fmtN(v[k].rev)}</td><td class="r num ${d>=0?'pos':'neg'}">${d>=0?'+':''}${d.toFixed(1)}%</td></tr>`}).join('')}
   </tbody></table>
   <div class="h2" style="font-size:13px;margin-bottom:8px">By entity</div>
   <table><tbody>
   ${DATA.entities.map(e=>{const a=entAgg(e.code);return `<tr class="tap" onclick="entityDrawer('${e.code}')"><td class="mini"><b style="color:var(--ink)">${e.code}</b> ${e.name}</td><td class="r num">${fmt(a.rev)}</td><td style="width:20px" class="muted">›</td></tr>`}).join('')}
   </tbody></table></div>`);
}
function drillEbitda(){
  emit('VARIANCE','EBITDA bridge','decomposing MoM movement\nrevenue × cost × opex contributions','act');
  const c=consol('cur'),p=consol('prior');
  const rows=[['Prior-month EBITDA',p.ebitda,''],['Revenue contribution',c.rev-p.rev,'pos'],['Direct cost movement',-(c.cost-p.cost),(c.cost-p.cost)>0?'neg':'pos'],['Opex movement',-(c.opex-p.opex),(c.opex-p.opex)>0?'neg':'pos'],['Current EBITDA',c.ebitda,'']];
  const v=vertAgg('cur'),vp=vertAgg('prior');
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">DRILL-DOWN</span>
   <div class="h2" style="margin-top:10px">EBITDA — bridge & margin by vertical</div><div class="mini muted">what moved the number, and where margin sits</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
   <table style="margin-bottom:18px"><tbody>
   ${rows.map(([l,a,k])=>`<tr><td><b style="color:var(--ink)">${l}</b></td><td class="r num ${k}">${fmtN(a)}</td></tr>`).join('')}
   </tbody></table>
   <div class="h2" style="font-size:13px;margin-bottom:8px">Margin by vertical</div>
   <table><thead><tr><th>Vertical</th><th class="r">Margin</th><th class="r">Prior</th><th class="r">Δ pts</th></tr></thead><tbody>
   ${Object.keys(v).map(k=>{const m=v[k].rev?v[k].eb/v[k].rev*100:0,mp=vp[k].rev?vp[k].eb/vp[k].rev*100:0;return `<tr><td><b style="color:var(--ink)">${k}</b></td><td class="r num">${m.toFixed(1)}%</td><td class="r num">${mp.toFixed(1)}%</td><td class="r num ${m>=mp?'pos':'neg'}">${(m-mp)>=0?'+':''}${(m-mp).toFixed(1)}</td></tr>`}).join('')}
   </tbody></table>
   <p class="mini muted" style="margin-top:12px">Hospitality is the margin watch-item — see the strategic finding on the summary, or ask Sage for the structural-vs-one-off view.</p></div>`);
}
/* ---------- IC MATCHED-PAIR PROOF ---------- */
function openICm(id){
  const x=DATA.ic.find(i=>i.id===id);
  emit('RECON','matched-pair inspection '+id,'replaying match decision\nrule trace attached','done');
  openDrawer(`<div class="drawer-head"><div><span class="chip ok">MATCHED</span>
   <div class="h2" style="margin-top:10px">${x.a} ↔ ${x.b}</div><div class="mini muted">${x.ref} · auto-matched · confidence ${(x.conf*100).toFixed(0)}%</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
   <table style="margin-bottom:16px"><thead><tr><th>Leg</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>
   <tr><td><b style="color:var(--ink)">${x.a}</b> · IC receivable</td><td class="mini num">ICR-${2600+parseInt(x.id.slice(3))}</td><td class="r num">${fmtN(x.va)}</td></tr>
   <tr><td><b style="color:var(--ink)">${x.b}</b> · IC payable</td><td class="mini num">ICP-${2600+parseInt(x.id.slice(3))}</td><td class="r num">${fmtN(x.vb)}</td></tr>
   <tr style="border-top:2px solid var(--line-2)"><td colspan=2><b style="color:var(--ink)">Difference</b></td><td class="r num"><b style="color:var(--ok)">0</b></td></tr>
   </tbody></table>
   <div class="reason-box"><span class="k">Match rule fired.</span> Exact match — amount equal to the dirham, reference strings aligned after normalisation, value dates within the 3-day tolerance window. <span class="k">Decision.</span> Auto-cleared, no human review required; pair eliminated in consolidation. Signed into the audit chain.</div>
   </div>`);
}
/* ---------- FORECAST MONTH DRILL ---------- */
function fcMonth(i){
  const months=['Jun','Jul','Aug','Sep','Oct','Nov'];
  const out=[418,466,512,478,392,355], inn=[505,468,452,522,564,538];
  const rnd=rng(hashStr('fc'+i));
  const prj=DATA.projects.slice(0,4);
  const w=prj.map(()=>0.5+rnd()); const tw=w.reduce((a,b)=>a+b,0);
  let run=0; const rows=prj.map((p,j)=>{const amt=(j<3)?Math.round(out[i]*w[j]/tw):Math.round(out[i]-run);run+=amt;return [p,amt];});
  emit('FORECAST','month drill → '+months[i],'splitting outflows by project\ncollections by handover schedule','act');
  openDrawer(`<div class="drawer-head"><div><span class="tag-ag">FORECAST · ${months[i].toUpperCase()} 2026</span>
   <div class="h2" style="margin-top:10px">Cash detail — ${months[i]}</div><div class="mini muted">construction outflows by project · projected collections</div></div><div class="x" onclick="closeDrawer()">×</div></div>
   <div class="drawer-body">
   <div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">
     <div class="card" style="padding:14px"><div class="kpi-label">Collections</div><div class="kpi-val num" style="font-size:22px;color:var(--ok)">AED ${inn[i]}M</div></div>
     <div class="card" style="padding:14px"><div class="kpi-label">Construction outflow</div><div class="kpi-val num" style="font-size:22px;color:var(--risk)">AED ${out[i]}M</div></div>
   </div>
   <div class="h2" style="font-size:13px;margin-bottom:8px">Outflows by project</div>
   <table style="margin-bottom:16px"><tbody>
   ${rows.map(([p,a])=>`<tr><td class="mini">${p}</td><td class="r num">AED ${a}M</td></tr>`).join('')}
   <tr style="border-top:2px solid var(--line-2)"><td><b style="color:var(--ink)">Total</b></td><td class="r num"><b>AED ${out[i]}M</b></td></tr>
   </tbody></table>
   <div class="reason-box"><span class="k">Net position.</span> ${months[i]} runs <span class="v">AED ${inn[i]-out[i]>=0?'+':''}${inn[i]-out[i]}M ${inn[i]-out[i]>=0?'positive':'negative'}</span> — ${inn[i]-out[i]>=0?'collections cover the build programme with headroom.':'milestone payments peak; buffer narrows but the cumulative position stays positive.'} Drivers: ${rows[0][0]} and ${rows[1][0]} milestone certifications.</div>
   </div>`);
}
function hosMarginDelta(){
  const rC=-DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Revenue').reduce((s,r)=>s+r.cur,0);
  const rP=-DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Revenue').reduce((s,r)=>s+r.prior,0);
  const cC=DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Direct Cost').reduce((s,r)=>s+r.cur,0);
  const cP=DATA.tb.filter(r=>r.entity==='HOS-01'&&r.l2==='Direct Cost').reduce((s,r)=>s+r.prior,0);
  return ((rP-cP)/rP*100-(rC-cC)/rC*100);
}
const _SAGE_DEFAULT_KEY='';  /* no hardcoded key — paste one via the Sage "connect" prompt (stored in localStorage only) */
let LIVE_KEY=(()=>{try{return localStorage.getItem('sage_api_key')||_SAGE_DEFAULT_KEY;}catch(e){return _SAGE_DEFAULT_KEY;}})();
function entityContextDump(){
  return DATA.entities.map(e=>{const a=entAgg(e.code);const exc=DATA.scrutiny.filter(s=>s.entity===e.code);
    return e.code+" ("+e.name+", "+e.vertical+"): revenue "+fmt(a.rev)+", EBITDA "+fmt(a.eb)+", margin "+a.mgn.toFixed(1)+"%, MoM "+pct(a.rev,entAgg(e.code,"prior").rev).toFixed(1)+"%"+(exc.length?", open items: "+exc.map(s=>s.acct+" "+fmt(s.amount)+" ("+s.rec+")").join("; "):"");
  }).join("\n");
}
async function liveAnswer(q){
  // Require a key when running outside Claude.ai artifact runtime
  if(!LIVE_KEY && !window._liveOK) throw new Error('no-key');
  const c=consol('cur'), md=hosMarginDelta().toFixed(1);
  // Build rich system prompt with full close context
  const icSummary=DATA.ic?DATA.ic.map(p=>`${p.a} ↔ ${p.b}: ${p.status}${p.gap?' (gap '+fmt(p.gap)+', '+p.gapType+')':''}`).join('; '):'';
  const scrutinyDump=DATA.scrutiny?DATA.scrutiny.map(s=>`${s.entity} ${s.acct}: ${fmt(s.amount)}, aged ${s.age}, risk ${s.risk}, confidence ${s.confidence}%, rec: ${s.rec}`).join('\n'):'';
  const jeDump=DATA.je?DATA.je.map(j=>`PO ${j.po||j.id}: ${fmt(j.amount||j.consumed)}, ${j.desc||j.vendor||''}`).join('; '):'';
  const sys=`You are Sage, a finance knowledge assistant embedded in FinTran Group's month-end close cockpit (CloseIQ by Tiger Analytics). You have deep senior-controller / CFO-advisor expertise. You are precise, decisive, and you ground every answer in the data below — never invent figures.

CLOSE PERIOD: May 2026

GROUP SUMMARY:
- Revenue: ${fmt(c.rev)}, slightly ahead of budget
- EBITDA: ${fmt(c.ebitda)}
- Hospitality (HOS-01) margin compressed ${md} pts — operating cost +34% on flat revenue (agency labour + utilities true-up). JV HOS-02 unaffected.
- Balance sheet: ${fmt(DATA.stats.recoverable)} recoverable aged positions; ${fmt(DATA.stats.writeback)} clean write-back eligible (largest: Arabtec contractor advance AED 11.8M, 18 months aged, PO expired, no GRN). Drake & Scull AED 9.2M doubtful (in liquidation) — provision.
- IC: ${DATA.stats.ic_matched}/${DATA.stats.ic_total} pairs matched; ${fmt(DATA.stats.ic_unmatched_val)} unmatched (timing + FX)
- PO accruals: ${fmt(DATA.stats.je_total)} across ${DATA.je?DATA.je.length:8} lines, 2 auto-swept on rules
- Cash projection: collections exceed construction payments every month for next 6 months
- Governance: agents have read-only access; write path to Oracle Fusion behind human approval gate with signed tokens; HMAC-chained audit trail on every decision

PER-ENTITY DATA:
${entityContextDump()}

SCRUTINY FLAGS:
${scrutinyDump}

IC PAIRS:
${icSummary}

JE ACCRUALS:
${jeDump}

RULES:
- Senior-controller voice, decisive, grounded in the data above
- Use **bold** for key figures and recommendations
- When data has multiple items (entities, balances, comparisons), use a markdown table with | col | col | format
- When listing action items or steps, use a numbered list (1. item)
- For bullet points use - item format
- Answer 2-5 sentences for simple questions; use tables/lists when comparing or enumerating
- If asked about something outside the close data, say so honestly
${SAGE_LANG==='ar'?'- Respond entirely in Arabic.':''}`;

  const headers={"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
  if(LIVE_KEY) headers["x-api-key"]=LIVE_KEY;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:sys,messages:[{role:"user",content:q}]})});
  if(!r.ok){
    const err=await r.json().catch(()=>({}));
    throw new Error(err.error?.message||'API returned '+r.status);
  }
  window._liveOK=true;
  const data=await r.json();
  const txt=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join(' ').trim();
  if(!txt)throw new Error('empty response');
  return txt;
}

/* ---------- VOICE ---------- */
let recognizing=false, recog=null;
function toggleMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){el('voiceHint').textContent='Voice input not supported in this browser — type instead';return;}
  if(recognizing){recog&&recog.stop();return;}
  recog=new SR();recog.lang=SAGE_LANG==='ar'?'ar-SA':'en-US';recog.interimResults=false;recog.maxAlternatives=1;
  recog.onstart=()=>{recognizing=true;el('micBtn').classList.add('listening');el('voiceHint').textContent=SAGE_LANG==='ar'?'أستمع…':'Listening…';};
  recog.onerror=(e)=>{el('voiceHint').textContent='Voice error: '+e.error+' — type instead';};
  recog.onend=()=>{recognizing=false;el('micBtn').classList.remove('listening');setTimeout(()=>el('voiceHint').textContent='',1500);};
  recog.onresult=(e)=>{const t=e.results[0][0].transcript;el('sageInput').value=t;sendSage();};
  recog.start();
}
/* ---------- NATURAL VOICE ---------- */
let VOICE_CACHE=null, CHOSEN_VOICE=null;
// quality ranking — prefer cloud/neural voices that actually sound human
const GOOD_EN=['Google UK English Female','Google UK English Male','Google US English','Microsoft Aria','Microsoft Jenny','Microsoft Sonia','Microsoft Libby','Microsoft Ryan','Microsoft Guy','Samantha','Serena','Daniel','Karen','Moira','Aria','Jenny'];
const GOOD_AR=['Microsoft Hamed','Microsoft Naayf','Microsoft Salma','Microsoft Zariyah','Google العربية','Maged','Tarik'];
function loadVoices(){VOICE_CACHE=speechSynthesis.getVoices();return VOICE_CACHE;}
function pickVoice(lang){
  const vs=loadVoices(); if(!vs.length)return null;
  const isAr=lang==='ar';
  const pool=vs.filter(v=>v.lang.startsWith(isAr?'ar':'en'));
  const wish=isAr?GOOD_AR:GOOD_EN;
  // 1. exact preferred name match
  for(const w of wish){const hit=pool.find(v=>v.name.includes(w));if(hit)return hit;}
  // 2. any non-local (network/neural) voice — these are the natural-sounding ones
  const neural=pool.find(v=>v.localService===false);if(neural)return neural;
  // 3. a female en-GB/en-US default, else first in pool, else first overall
  return pool.find(v=>/female/i.test(v.name))||pool[0]||vs[0];
}
// turn finance shorthand into words a person would actually say
function humanizeForSpeech(t){
  let s=t.replace(/\*\*/g,'').replace(/<[^>]+>/g,'');
  // currency: AED 43.1M -> 43.1 million dirhams ; AED 900K -> 900 thousand dirhams ; AED 1.2B -> 1.2 billion dirhams
  s=s.replace(/AED\s*([\d,.]+)\s*B\b/gi,(m,n)=>n+' billion dirhams');
  s=s.replace(/AED\s*([\d,.]+)\s*M\b/gi,(m,n)=>n+' million dirhams');
  s=s.replace(/AED\s*([\d,.]+)\s*K\b/gi,(m,n)=>n+' thousand dirhams');
  s=s.replace(/AED\s*([\d,]+)/gi,(m,n)=>n.replace(/,/g,'')+' dirhams');
  // bare millions/points
  s=s.replace(/([+-]?\d+(?:\.\d+)?)\s*M\b/g,(m,n)=>{const neg=n.startsWith('-');const pos=n.startsWith('+');const num=n.replace(/^[+-]/,'');return (neg?'negative ':'')+(pos?'positive ':'')+num+' million';});
  s=s.replace(/(\d+(?:\.\d+)?)\s*pts?\b/gi,'$1 points');
  s=s.replace(/(\d+(?:\.\d+)?)\s*%/g,'$1 percent');
  // entity codes RE-01 -> "R E 01"? better: read as "entity R E zero one" is clunky; say the name when possible
  DATA.entities.forEach(e=>{const re=new RegExp('\\b'+e.code+'\\b','g');s=s.replace(re,e.name.replace(/ LLC| Dev/g,''));});
  // GL codes "GL 5100" -> "account 5100"
  s=s.replace(/\bGL\s*(\d{3,4})\b/gi,'account $1');
  // common abbreviations
  s=s.replace(/\bMoM\b/g,'month on month').replace(/\bQoQ\b/g,'quarter on quarter')
     .replace(/\bYTD\b/g,'year to date').replace(/\bYoY\b/g,'year on year')
     .replace(/\bP&L\b/g,'P and L').replace(/\bEBITDA\b/g,'EBITDA').replace(/\bFX\b/g,'F X')
     .replace(/\bPO\b/g,'P O').replace(/\bGRN\b/g,'G R N').replace(/\bIC\b/g,'intercompany')
     .replace(/\bAR\b/g,'receivables').replace(/\bAP\b/g,'payables').replace(/\bDLD\b/g,'D L D')
     .replace(/\bJV\b/g,'joint venture').replace(/\bFY\b/g,'financial year');
  // punctuation that helps cadence — em dash to comma-pause, ellipsis to period
  s=s.replace(/\s*—\s*/g,', ').replace(/\.{2,}/g,'. ').replace(/\s*·\s*/g,', ');
  // collapse whitespace
  return s.replace(/\s{2,}/g,' ').trim();
}
function speak(text){
  if(!window.speechSynthesis||SAGE_MUTED)return;
  speechSynthesis.cancel();
  const isAr=SAGE_LANG==='ar';
  const u=new SpeechSynthesisUtterance(humanizeForSpeech(text));
  u.lang=isAr?'ar-SA':'en-GB';
  // prosody: a touch slower than default + slightly varied pitch reads far less robotic
  u.rate=isAr?0.92:0.98; u.pitch=isAr?1.0:1.04; u.volume=1;
  const v=CHOSEN_VOICE||pickVoice(SAGE_LANG); if(v)u.voice=v;
  const orb=el('sageOrb');
  u.onstart=()=>orb&&orb.classList.add('speaking');
  u.onend=()=>orb&&orb.classList.remove('speaking');
  speechSynthesis.speak(u);
}
// voices load async in most browsers — warm the list and refresh the picker when ready
if(window.speechSynthesis){
  loadVoices();
  speechSynthesis.onvoiceschanged=()=>{loadVoices();if(typeof renderVoicePicker==='function')renderVoicePicker();};
}


/* ============ DRAWER + TOAST ============ */
function openDrawer(html){el('drawer').innerHTML=html;el('drawer').classList.add('on');el('scrim').classList.add('on');}
function closeDrawer(){el('drawer').classList.remove('on');el('scrim').classList.remove('on');}
function toast(msg){el('toastMsg').textContent=msg;el('toast').classList.add('on');setTimeout(()=>el('toast').classList.remove('on'),2600);}

/* ============ THEME ============ */
function updateThemeIcon(){
  const ic=el('themeIcon');if(!ic)return;
  const light=document.documentElement.classList.contains('theme-light');
  ic.innerHTML=light
    ?'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    :'<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
}
function toggleTheme(){
  document.documentElement.classList.toggle('theme-light');
  updateThemeIcon();
  try{localStorage.setItem('closeiq-theme',document.documentElement.classList.contains('theme-light')?'light':'dark');}catch(e){}
}
/* ============ INIT ============ */
(function(){try{if(localStorage.getItem('closeiq-theme')==='dark')document.documentElement.classList.remove('theme-light');}catch(e){}updateThemeIcon();})();
renderRoster();
go('sources');
updateFreshness();
updateThemeIcon();
// ambient periodic agent heartbeat (only once data is in)
const AMBIENT=[
 ['VARIANCE','re-checked materiality thresholds','no new breaches across 7 layers','done'],
 ['SCRUTINY','monitoring 7 open exceptions','aging clock running · no status change','act'],
 ['RECON','polled entity ledgers for late postings','2 timing items still open','act'],
 ['COMMENTARY','refreshed Hospitality margin note','cost driver: agency labour +34%','flag'],
 ['MAP','validated grouping integrity','L1/L2/L3 coverage held at 100%','done'],
 ['EXTRACT','heartbeat → Oracle Fusion OTBI','connection healthy · no new journals','done'],
 ['SCRUTINY','re-scored RE-01 contractor advances','no movement on PO-44021 · 541 days','act'],
 ['VARIANCE','watching FX rates on USD legs','AED/USD stable · no reval trigger','done'],
 ['RECON','re-ran fuzzy match on open IC pairs','confidence unchanged · awaiting period roll','act'],
 ['COMMENTARY','indexed 14 variance notes for Sage','retrieval cache warm','done'],
 ['EXTRACT','checked DLD gateway for refund NOCs','no new clearances since last poll','done'],
 ['SCRUTINY','validated approval-gate token store','0 unauthorized write attempts','done'],
];
let amb=0;
setInterval(()=>{ if(anyIngested()&&el('feed').children.length>0){const[a,m,r,k]=AMBIENT[amb%AMBIENT.length];amb++;emit(a,m,r,k);}}, 14000);