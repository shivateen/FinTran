/* ============================================================================
 * ui-registry.js — UI Surface Registry (single source of truth)
 * ----------------------------------------------------------------------------
 * Catalogues every addressable surface in the ValuationIQ dashboard so the
 * Realtime voice/text co-pilot can reference screens, KPIs, assumption levers
 * and panels by STABLE ID — instead of our code re-discovering the UI each turn.
 *
 * This one object feeds five consumers:
 *   1. Tool arg enums      (navigate/show_surface/change_assumption pull ids here)
 *   2. The calc engine     (valuation-model.js reads SURFACES.levers[*].modelKey)
 *   3. The dispatcher       (applyToolResult maps id -> state slice + screen + anchor)
 *   4. The model's "map"    (a compact summary is injected into session.instructions)
 *   5. Grounding reads      (get_screen_state / get_valuation resolve surfaces here)
 *
 * Loaded as a plain <script> (no bundler). Exposes window.UI_REGISTRY.
 * Also supports `module.exports` so Node test harnesses / the calc engine can
 * import the lever list directly.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // ── Screens ───────────────────────────────────────────────────────────────
  // id matches this.setScreen(id) in the DCLogic subclass.
  var screens = [
    { id: 'portfolio',   label: 'Portfolio Overview',  section: 'tracking',  anchor: '#screen-portfolio',  desc: 'Capital allocation across the data-center portfolio.' },
    { id: 'decisions',   label: 'Decision Queue',      section: 'tracking',  anchor: '#screen-decisions',  desc: 'Investment decisions awaiting CFO approval.' },
    { id: 'tracker',     label: 'Assumption Tracker',  section: 'tracking',  anchor: '#screen-tracker',    desc: 'Original vs actual assumption variance across the portfolio.' },
    { id: 'library',     label: 'Valuation Library',   section: 'tracking',  anchor: '#screen-library',    desc: 'Reusable valuation cases and benchmarks.' },
    { id: 'casesummary', label: 'Investment Summary',  section: 'workbench', anchor: '#screen-casesummary',desc: 'Headline recommendation, KPIs, thesis and risks for the active case.' },
    { id: 'studio',      label: 'Financial Model',     section: 'workbench', anchor: '#screen-studio',     desc: 'Assumptions, 10-year forecast, DCF, sensitivities and scenarios.' },
    { id: 'capital',     label: 'Funding Strategy',    section: 'workbench', anchor: '#screen-capital',    desc: 'Debt/equity structure, DSCR, covenant and rating impact.' },
    { id: 'ic',          label: 'IC Approval',         section: 'workbench', anchor: '#screen-ic',         desc: 'Investment Committee memorandum / approval pack.' },
    { id: 'dataroom',    label: 'Data Room',           section: 'ops',       anchor: '#screen-dataroom',   desc: 'Land, legal and contract documents.' },
    { id: 'memory',      label: 'AI Copilot Memory',   section: 'ops',       anchor: '#screen-memory',     desc: 'Saved CFO preferences (e.g. baseline hurdle rate).' },
    { id: 'audit',       label: 'Audit Trail',         section: 'ops',       anchor: '#screen-audit',      desc: 'Immutable log of assumption changes and approvals.' }
  ];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // source = dot-path into the computeValuation() result for the active case.
  // baseline:true KPIs get a pinned baseline snapshot so we can render/speak deltas.
  var kpis = [
    { id: 'kpi.ev',        screen: 'casesummary', label: 'Enterprise Value',  source: 'evMid',     format: 'usdB',  baseline: true,  anchor: '#kpi-ev' },
    { id: 'kpi.evPerMW',   screen: 'casesummary', label: 'EV per MW',         source: 'evPerMW',   format: 'usdM',  baseline: true,  anchor: '#kpi-evpermw' },
    { id: 'kpi.projIRR',   screen: 'casesummary', label: 'Project IRR',       source: 'projIRR',   format: 'pct',   baseline: true,  anchor: '#kpi-projirr' },
    { id: 'kpi.equityIRR', screen: 'casesummary', label: 'Equity IRR',        source: 'equityIRR', format: 'pct',   baseline: true,  anchor: '#kpi-equityirr' },
    { id: 'kpi.npv',       screen: 'casesummary', label: 'NPV',               source: 'npv',       format: 'usdMsigned', baseline: true, anchor: '#kpi-npv' },
    { id: 'kpi.moic',      screen: 'casesummary', label: 'MOIC',              source: 'moic',      format: 'x',     baseline: true,  anchor: '#kpi-moic' },
    { id: 'kpi.payback',   screen: 'casesummary', label: 'Payback',           source: 'paybackYrs',format: 'yrs',   baseline: false, anchor: '#kpi-payback' },
    { id: 'kpi.hurdle',    screen: 'casesummary', label: 'Hurdle status',     source: 'hurdlePass',format: 'bool',  baseline: false, anchor: '#kpi-hurdle' }
  ];

  // ── Levers (adjustable assumptions) ───────────────────────────────────────
  // modelKey = the input key computeValuation(caseId, overrides) understands.
  // Values mirror the dubaiAI base column shown in studioVals().
  var levers = [
    { id: 'lever.utilizationRamp', screen: 'studio', label: 'Yr1-Yr5 utilization ramp', modelKey: 'utilizationRamp', units: '%[]', kind: 'array', base: [40,55,68,78,85], anchor: '#assum-utilramp' },
    { id: 'lever.terminalUtil',    screen: 'studio', label: 'Terminal utilization',     modelKey: 'terminalUtil',    units: '%',   kind: 'number', base: 88,   min: 70,  max: 95,  step: 1,    anchor: '#assum-termutil' },
    { id: 'lever.revenuePerMW',    screen: 'studio', label: 'Revenue per MW / yr',      modelKey: 'revenuePerMW',    units: '$M',  kind: 'number', base: 1.45, min: 1.0, max: 2.0, step: 0.01, anchor: '#assum-revpermw' },
    { id: 'lever.escalation',      screen: 'studio', label: 'Annual revenue escalation',modelKey: 'escalation',      units: '%',   kind: 'number', base: 2.5,  min: 0,   max: 6,   step: 0.1,  anchor: '#assum-escalation' },
    { id: 'lever.pue',             screen: 'studio', label: 'PUE',                      modelKey: 'pue',             units: '',    kind: 'number', base: 1.28, min: 1.1, max: 1.6, step: 0.01, anchor: '#assum-pue' },
    { id: 'lever.powerCost',       screen: 'studio', label: 'Power cost',               modelKey: 'powerCost',       units: '$/kWh',kind: 'number',base: 0.072,min: 0.04,max: 0.12,step: 0.001,anchor: '#assum-powercost' },
    { id: 'lever.powerEscalation', screen: 'studio', label: 'Power cost escalation',    modelKey: 'powerEscalation', units: '%',   kind: 'number', base: 3.0,  min: 0,   max: 8,   step: 0.1,  anchor: '#assum-poweresc' },
    { id: 'lever.constructionPerMW',screen:'studio', label: 'Construction $ per MW',    modelKey: 'constructionPerMW',units:'$M',  kind: 'number', base: 7.5,  min: 5,   max: 10,  step: 0.1,  anchor: '#assum-constrpermw' },
    { id: 'lever.fixedOpex',       screen: 'studio', label: 'Fixed opex / yr',          modelKey: 'fixedOpex',       units: '$M',  kind: 'number', base: 110,  min: 60,  max: 180, step: 5,    anchor: '#assum-fixedopex' },
    { id: 'lever.variableOpexPct', screen: 'studio', label: 'Variable opex (% revenue)',modelKey: 'variableOpexPct', units: '%',   kind: 'number', base: 18,   min: 10,  max: 30,  step: 0.5,  anchor: '#assum-varopex' },
    { id: 'lever.debtRatio',       screen: 'capital',label: 'Debt ratio',               modelKey: 'debtRatio',       units: '%',   kind: 'number', base: 60,   min: 0,   max: 80,  step: 1,    anchor: '#assum-debtratio' },
    { id: 'lever.costOfDebt',      screen: 'capital',label: 'Cost of debt',             modelKey: 'costOfDebt',      units: '%',   kind: 'number', base: 6.8,  min: 4,   max: 10,  step: 0.1,  anchor: '#assum-costofdebt' },
    { id: 'lever.costOfEquity',    screen: 'capital',label: 'Cost of equity',           modelKey: 'costOfEquity',    units: '%',   kind: 'number', base: 12.5, min: 8,   max: 18,  step: 0.1,  anchor: '#assum-costofequity' },
    { id: 'lever.wacc',            screen: 'studio', label: 'WACC',                     modelKey: 'wacc',            units: '%',   kind: 'number', base: 8.9,  min: 6,   max: 14,  step: 0.1,  anchor: '#assum-wacc' },
    { id: 'lever.terminalGrowth',  screen: 'studio', label: 'Terminal growth',          modelKey: 'terminalGrowth',  units: '%',   kind: 'number', base: 2.5,  min: 0,   max: 5,   step: 0.1,  anchor: '#assum-termgrowth' },
    { id: 'lever.exitMultiple',    screen: 'studio', label: 'Exit EBITDA multiple',     modelKey: 'exitMultiple',    units: 'x',   kind: 'number', base: 17.0, min: 10,  max: 22,  step: 0.5,  anchor: '#assum-exitmultiple' },
    { id: 'lever.hurdleRate',      screen: 'memory', label: 'CFO baseline hurdle rate', modelKey: 'hurdleRate',      units: '%',   kind: 'number', base: 10.0, min: 6,   max: 16,  step: 0.5,  anchor: '#assum-hurdlerate' }
  ];

  // ── Panels (charts/tables a tool result fills) ────────────────────────────
  // slice = the this.state key the dispatcher writes; type hints the renderer.
  var panels = [
    { id: 'panel.assumptions',    screen: 'studio',      type: 'table', slice: 'assumptionsByCase', anchor: '#panel-assumptions',   resultTypes: ['assumption_update','scenario'] },
    { id: 'panel.kpiStrip',       screen: 'casesummary', type: 'kpis',  slice: 'lastToolResult',    anchor: '#panel-kpistrip',      resultTypes: ['scenario','assumption_update','stress_test','custom_scenario'] },
    { id: 'panel.forecast',       screen: 'studio',      type: 'table', slice: 'forecast',          anchor: '#panel-forecast',      resultTypes: ['cashflow'] },
    { id: 'panel.footballField',  screen: 'studio',      type: 'chart', slice: 'footballField',     anchor: '#panel-football',      resultTypes: ['football_field'] },
    { id: 'panel.sensitivity',    screen: 'studio',      type: 'chart', slice: 'sensitivity',       anchor: '#panel-sensitivity',   resultTypes: ['sensitivity','ev_sensitivity'] },
    { id: 'panel.scenarios',      screen: 'studio',      type: 'table', slice: 'scenarios',          anchor: '#panel-scenarios',     resultTypes: ['comparison','custom_scenario'] },
    { id: 'panel.waccStack',      screen: 'studio',      type: 'grid',  slice: 'waccStack',         anchor: '#panel-wacc',          resultTypes: ['wacc_stack'] },
    { id: 'panel.riskDrivers',    screen: 'tracker',     type: 'list',  slice: 'risks',             anchor: '#panel-risks',         resultTypes: ['risk','value_drivers'] },
    { id: 'panel.capital',        screen: 'capital',     type: 'panel', slice: 'capitalStructure',  anchor: '#panel-capital',       resultTypes: ['capital_structure'] },
    { id: 'panel.committee',      screen: 'ic',          type: 'panel', slice: 'committeeSummary',  anchor: '#panel-committee',     resultTypes: ['committee_summary','board_memo'] }
  ];

  // ── result.type -> { slice, screen } dispatch map ─────────────────────────
  // The dispatcher uses this to know WHERE a tool result lands. Screen is the
  // destination tab; slice is the this.state key to write.
  var resultRouting = {
    scenario:          { slice: 'lastToolResult',  screen: 'casesummary', kpi: true },
    assumption_update: { slice: 'lastToolResult',  screen: 'studio',      kpi: true },
    custom_scenario:   { slice: 'lastToolResult',  screen: 'casesummary', kpi: true },
    stress_test:       { slice: 'lastToolResult',  screen: 'casesummary', kpi: true },
    cashflow:          { slice: 'forecast',        screen: 'studio' },
    football_field:    { slice: 'footballField',   screen: 'studio' },
    sensitivity:       { slice: 'sensitivity',     screen: 'studio' },
    ev_sensitivity:    { slice: 'sensitivity',     screen: 'studio' },
    wacc_stack:        { slice: 'waccStack',       screen: 'studio' },
    risk:              { slice: 'risks',           screen: 'tracker' },
    value_drivers:     { slice: 'risks',           screen: 'tracker' },
    capital_structure: { slice: 'capitalStructure',screen: 'capital' },
    committee_summary: { slice: 'committeeSummary',screen: 'ic' },
    board_memo:        { slice: 'committeeSummary',screen: 'ic' },
    navigation:        { slice: null,              screen: null },   // navigate/show_surface: screen comes from args
    preference:        { slice: 'preferences',     screen: 'memory' },
    case_created:      { slice: null,              screen: 'casesummary' },
    document:          { slice: null,              screen: 'dataroom' },
    valuation_read:    { slice: null,              screen: null }    // grounding only, no UI change
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  var registry = {
    screens: screens,
    kpis: kpis,
    levers: levers,
    panels: panels,
    resultRouting: resultRouting,

    // lookups
    screen:  function (id) { return byId(screens, id); },
    kpi:     function (id) { return byId(kpis, id); },
    lever:   function (id) { return byId(levers, id); },
    panel:   function (id) { return byId(panels, id); },
    leverByModelKey: function (k) { for (var i = 0; i < levers.length; i++) if (levers[i].modelKey === k) return levers[i]; return null; },

    // enum helpers for tool schemas
    screenIds: function () { return screens.map(function (s) { return s.id; }); },
    leverIds:  function () { return levers.map(function (l) { return l.id; }); },
    surfaceIds: function () {
      return screens.map(function (s) { return s.id; })
        .concat(kpis.map(function (k) { return k.id; }))
        .concat(levers.map(function (l) { return l.id; }))
        .concat(panels.map(function (p) { return p.id; }));
    },
    // a surface (kpi/lever/panel/screen) -> the screen that owns it (for show_surface)
    screenOfSurface: function (id) {
      var s = byId(screens, id); if (s) return s.id;
      var k = byId(kpis, id);    if (k) return k.screen;
      var l = byId(levers, id);  if (l) return l.screen;
      var p = byId(panels, id);  if (p) return p.screen;
      return null;
    },
    anchorOfSurface: function (id) {
      var hit = byId(screens, id) || byId(kpis, id) || byId(levers, id) || byId(panels, id);
      return hit ? hit.anchor : null;
    },

    // compact text map injected into session.instructions so the model knows the app
    summaryForPrompt: function () {
      var s = 'SCREENS: ' + screens.map(function (x) { return x.id + ' (' + x.label + ')'; }).join(', ') + '.\n';
      s += 'ADJUSTABLE LEVERS (use change_assumption with these lever ids): '
        + levers.map(function (l) { return l.id + ' [' + l.label + (l.units ? ', ' + l.units : '') + ']'; }).join('; ') + '.\n';
      s += 'KPIs you can reference/ground: ' + kpis.map(function (k) { return k.id + ' (' + k.label + ')'; }).join(', ') + '.\n';
      s += 'PANELS / sections (reach with show_surface using the panel id — most live on the studio screen): '
        + panels.map(function (p) { return p.id + ' (on ' + p.screen + ')'; }).join(', ') + '.';
      return s;
    }
  };

  root.UI_REGISTRY = registry;
  root.SURFACES = registry; // alias used in some call sites
  if (typeof module !== 'undefined' && module.exports) module.exports = registry;
})(typeof window !== 'undefined' ? window : globalThis);
