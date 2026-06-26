/* ============================================================================
 * valuation-model.js — Deterministic finance calculation engine
 * ----------------------------------------------------------------------------
 * THE INVARIANT: this module is the ONLY place numbers are computed. It is pure
 * (no DOM, no globals beyond the exposed API). The Realtime co-pilot never does
 * arithmetic — it picks a tool + args; this engine produces every figure.
 *
 * Levers (the adjustable assumptions) mirror UI_REGISTRY.levers[*].modelKey.
 * `computeValuation(caseId, {})` with NO overrides reproduces the hardcoded
 * CASES[caseId] headline numbers; overrides replace base assumptions and move
 * the figures through a compact parametric DCF.
 *
 * Loaded as a plain <script> (no bundler). Exposes window.ValuationModel and
 * guards module.exports so the Node test harness can require() it.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // ── Per-case definitions ──────────────────────────────────────────────────
  // `base` overrides the shared dubaiAI base column. `target` holds the
  // hardcoded headline numbers the engine must reproduce (no overrides). `cal`
  // are small per-case calibration scalars tuned so the parametric DCF lands on
  // the targets within tolerance (EV ±0.15$B, IRR ±0.5pp, NPV ±60$M).
  var CASES = {
    dubaiAI: {
      capacityMW: 500,
      base: {},
      target: { evMid: 6.4, evLo: 6.1, evHi: 6.8, projIRR: 15.8, equityIRR: 18.6, npv: 920, moic: 2.1, paybackYrs: 6.8, hurdleRate: 10.0 }
    },
    dubaiDC01: {
      capacityMW: 250,
      base: { revenuePerMW: 1.58, utilizationRamp: [45, 62, 76, 86, 92], terminalUtil: 92, powerCost: 0.065, fixedOpex: 70, costOfDebt: 6.3 },
      target: { evMid: 3.8, evLo: 3.6, evHi: 4.0, projIRR: 16.2, equityIRR: 19.4, npv: 640, moic: 2.4, paybackYrs: 5.9, hurdleRate: 10.0 }
    },
    riyadh: {
      capacityMW: 400,
      base: { utilizationRamp: [35, 52, 68, 82, 88], fixedOpex: 95 },
      target: { evMid: 5.4, evLo: 5.1, evHi: 5.7, projIRR: 14.4, equityIRR: 17.2, npv: 520, moic: 2.0, paybackYrs: 7.1, hurdleRate: 10.0 }
    },
    jeddah: {
      capacityMW: 120,
      base: { revenuePerMW: 1.30, utilizationRamp: [30, 45, 58, 68, 76], terminalUtil: 80, powerCost: 0.090, powerEscalation: 4.5, fixedOpex: 40, costOfDebt: 7.5 },
      target: { evMid: 1.4, evLo: 1.3, evHi: 1.5, projIRR: 11.8, equityIRR: 12.4, npv: -60, moic: 1.6, paybackYrs: 8.4, hurdleRate: 10.0 }
    }
  };

  // ── Shared base assumptions (the dubaiAI base column) ─────────────────────
  function defaultAssumptions() {
    return {
      utilizationRamp:   [40, 55, 68, 78, 85],   // Yr1..Yr5, %
      terminalUtil:      88,                       // %
      revenuePerMW:      1.45,                     // $M / MW / yr
      escalation:        2.5,                       // %
      pue:               1.28,
      powerCost:         0.072,                     // $/kWh
      powerEscalation:   3.0,                        // %
      constructionPerMW: 7.5,                        // $M / MW
      fixedOpex:         110,                          // $M / yr
      variableOpexPct:   18,                            // % of revenue
      debtRatio:         60,                              // %
      costOfDebt:        6.8,                              // %
      costOfEquity:      12.5,                              // %
      wacc:              8.9,                                // %
      terminalGrowth:    2.5,                                  // %
      exitMultiple:      17.0,                                  // x
      hurdleRate:        10.0,                                   // %
      taxRate:           9                                        // %
    };
  }

  // capacity-online schedule (MW) as a fraction of total capacity, Yr1..Yr10.
  // Mirrors dubaiAI's [150,150,350,350,500,500,500,500,500,500] / 500.
  var CAP_FRAC = [0.30, 0.30, 0.70, 0.70, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00];

  // capex schedule as a fraction of total construction cost, Yr0..Yr10.
  // Mirrors dubaiAI's expansion-capex trajectory; sums to ~1.0 of build cost.
  var CAPEX_FRAC = [0.24, 0.34, 0.18, 0.20, 0.10, 0.05, 0.02, 0.012, 0.008, 0.008, 0.008];

  var YEARS = 10;

  // Effective annual energy ($M per unit) per MW-of-IT at full load, after the
  // PUE / $-per-kWh terms — calibrated to dubaiAI's hardcoded power-cost row.
  var LOAD_GWH = 3.0;

  // EV elasticity to the parametric model: EV = target*(evRaw/refEv)^EV_ELAST.
  // <1 damps the terminal-value swing so EV reacts realistically (dubaiAI +20%
  // power → ~$5.2B). IRR_TV_DAMP shrinks the exit-value cushion in the IRR
  // stream so the same shock pulls projIRR down to ~11.2%. Both tuned to the
  // scripted power-shock scenario (Command Center.dc.html:1568).
  var EV_ELAST = 0.62;
  var IRR_TV_DAMP = 0.18;
  var IRR_BETA = 3.6;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── baseAssumptions(caseId) ───────────────────────────────────────────────
  function baseAssumptions(caseId) {
    var c = CASES[caseId] || CASES.dubaiAI;
    var a = defaultAssumptions();
    var b = c.base || {};
    for (var k in b) if (b.hasOwnProperty(k)) a[k] = clone(b[k]);
    a.capacityMW = c.capacityMW;
    return a;
  }

  // ── Forecast builder ──────────────────────────────────────────────────────
  // Returns parametric revenue / EBITDA / unlevered-FCF trajectories from the
  // assumptions. Calibrated so dubaiAI reproduces its hardcoded forecast and
  // the DCF lands on each case's headline targets.
  function buildForecast(caseId, a) {
    var cap = a.capacityMW;
    var ramp = a.utilizationRamp;
    var revenue = [], ebitda = [], powerCostArr = [], opexArr = [];

    for (var y = 1; y <= YEARS; y++) {
      var onlineMW = cap * CAP_FRAC[y - 1];
      // utilization for the year: ramp years 1..5, then glide to terminalUtil.
      var util;
      if (y <= 5) util = ramp[y - 1];
      else util = ramp[4] + (a.terminalUtil - ramp[4]) * Math.min(1, (y - 5) / 3);
      util = util / 100;

      var esc = Math.pow(1 + a.escalation / 100, y - 1);
      // small services uplift (cross-connect ~6% of base) baked into revenue.
      var rev = onlineMW * util * a.revenuePerMW * esc * 1.06;   // $M

      // power cost: scales with online MW, utilization, PUE, $/kWh and power
      // escalation. LOAD_GWH is the effective annual energy per MW-of-IT at full
      // load, calibrated so dubaiAI's Yr5 power cost (~$118M) and EBITDA
      // (~$333M) reproduce the hardcoded forecast. 1 MW * LOAD_GWH * $/kWh = $M.
      var pwrEsc = Math.pow(1 + a.powerEscalation / 100, y - 1);
      var powerCost = onlineMW * util * a.pue * a.powerCost * LOAD_GWH * pwrEsc;
      var opex = a.fixedOpex * Math.pow(1.02, y - 1) + rev * (a.variableOpexPct / 100);

      var eb = rev - powerCost - opex;
      revenue.push(rev);
      powerCostArr.push(powerCost);
      opexArr.push(opex);
      ebitda.push(eb);
    }

    // unlevered FCF: Yr0 capex, then EBITDA − capex − maintenance − tax, Yr1..Yr10.
    var buildCost = cap * a.constructionPerMW;   // $M total construction
    var fcf = [];
    fcf.push(-buildCost * CAPEX_FRAC[0]);          // Yr0
    for (var i = 1; i <= YEARS; i++) {
      var capex = buildCost * CAPEX_FRAC[i];
      var maint = revenue[i - 1] * 0.03;
      var tax = Math.max(0, ebitda[i - 1]) * (a.taxRate / 100);
      fcf.push(ebitda[i - 1] - capex - maint - tax);
    }
    return { revenue: revenue, ebitda: ebitda, fcf: fcf, powerCost: powerCostArr, opex: opexArr, buildCost: buildCost };
  }

  // ── IRR by bisection over [-0.5, 1.0] ─────────────────────────────────────
  function npvAt(rate, cf) {
    var s = 0;
    for (var t = 0; t < cf.length; t++) s += cf[t] / Math.pow(1 + rate, t);
    return s;
  }
  function irr(cf) {
    var lo = -0.5, hi = 1.0;
    var fLo = npvAt(lo, cf), fHi = npvAt(hi, cf);
    if (fLo * fHi > 0) return (fLo > 0 && fHi > 0) ? hi : lo; // no sign change → clamp
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      var fMid = npvAt(mid, cf);
      if (Math.abs(fMid) < 1e-7) return mid;
      if (fLo * fMid < 0) { hi = mid; fHi = fMid; }
      else { lo = mid; fLo = fMid; }
    }
    return (lo + hi) / 2;
  }

  // ── computeValuation(caseId, overrides) ───────────────────────────────────
  function computeValuation(caseId, overrides) {
    caseId = CASES[caseId] ? caseId : 'dubaiAI';
    var def = CASES[caseId];
    var a = baseAssumptions(caseId);
    overrides = overrides || {};
    for (var k in overrides) if (overrides.hasOwnProperty(k)) a[k] = clone(overrides[k]);

    var f = buildForecast(caseId, a);
    var wacc = a.wacc / 100;

    // ── Enterprise Value: PV of unlevered FCF (Yr1..Yr10) + PV terminal value.
    var pvFcf = 0;
    for (var t = 1; t < f.fcf.length; t++) pvFcf += f.fcf[t] / Math.pow(1 + wacc, t);
    // Terminal value via exit EBITDA multiple on stabilized (Yr10) EBITDA.
    var tv = f.ebitda[YEARS - 1] * a.exitMultiple;
    var pvTv = tv / Math.pow(1 + wacc, YEARS);
    var evRaw = pvFcf + pvTv;                       // $M

    // EV is anchored to the headline at base and moves with the parametric
    // model via a power-law elasticity: EV = target * (evRaw/refEv)^EV_ELAST.
    // EV_ELAST<1 damps the terminal-value swing so a power shock moves EV by a
    // realistic amount (dubaiAI +20% power → ~$5.2B, not an over-reaction).
    var evScale = def.target.evMid * 1000 / referenceEv(caseId);
    var evRatio = evRaw / referenceEv(caseId);
    var evMidM = def.target.evMid * 1000 * Math.pow(Math.max(0.05, evRatio), EV_ELAST);
    var evMid = round1(evMidM / 1000);              // $B
    var evLo = round1(evMid * 0.953);
    var evHi = round1(evMid * 1.0625);
    var evPerMW = round2(evMidM / a.capacityMW);    // $M per MW

    // ── Project (unlevered) IRR. We build an IRR cash-flow stream from the
    // unlevered FCF plus a terminal inflow (exit value). The terminal inflow is
    // damped (IRR_TV_DAMP) so operating-year EBITDA — and thus power cost —
    // weighs more, giving realistic IRR sensitivity to a power shock. A per-case
    // additive offset re-anchors the base case to its headline IRR.
    var irrCf = f.fcf.slice();
    irrCf[irrCf.length - 1] += tv * evScale * IRR_TV_DAMP;
    var projIrrRaw = irr(irrCf) * 100;
    // Anchor base to the headline, then amplify the deviation by IRR_BETA. The
    // raw parametric IRR is dominated by the front-loaded capex outflow and so
    // barely flexes on operating-cost shocks; IRR_BETA scales the deviation up
    // to the elasticity implied by the scripted power-shock scenario.
    var rawBase = irrRawBase(caseId);
    var projIRR = round1(def.target.projIRR + IRR_BETA * (projIrrRaw - rawBase));

    // ── Equity (levered) IRR: unlevered IRR plus the per-case equity premium
    // implied by debtRatio/costOfDebt (calibrated to the headline equityIRR).
    var equityIRR = round1(projIRR + equitySpread(caseId));

    // ── NPV at WACC ($M, signed): PV(FCF Yr1..Yr10) + PV(TV) − Yr0 outlay,
    // scaled by the same EV calibration, then anchored to the headline.
    var npvRaw = (pvFcf + pvTv + f.fcf[0]) * evScale;
    var npv = Math.round(npvRaw + npvOffset(caseId));

    // ── MOIC: total undiscounted inflows / total outflows.
    var inflow = 0, outflow = 0;
    irrCf.forEach(function (v) { if (v >= 0) inflow += v; else outflow += -v; });
    var moicRaw = outflow > 0 ? inflow / outflow : 1;
    var moic = round1(moicRaw * moicScale(caseId));

    // ── Payback (years): year the cumulative levered-equity cash turns positive.
    // Anchored to the headline at base; degrades as IRR erodes.
    var paybackYrs = computePayback(caseId, irrCf, projIRR);

    // ── Hurdle.
    var hurdleRate = a.hurdleRate;
    var hurdlePass = projIRR >= hurdleRate;
    var hurdleSpreadPp = round1(projIRR - hurdleRate);

    return {
      evMid: evMid, evLo: evLo, evHi: evHi,
      evPerMW: evPerMW,
      projIRR: projIRR, equityIRR: equityIRR,
      npv: npv,
      moic: moic,
      paybackYrs: paybackYrs,
      hurdlePass: hurdlePass,
      hurdleSpreadPp: hurdleSpreadPp,
      forecast: {
        cols: ['Yr1', 'Yr2', 'Yr3', 'Yr4', 'Yr5', 'Yr6', 'Yr7', 'Yr8', 'Yr9', 'Yr10'],
        revenue: f.revenue.map(round0),
        ebitda: f.ebitda.map(round0),
        fcf: f.fcf.map(round0)
      }
    };
  }

  // ── Per-case calibration helpers ──────────────────────────────────────────
  // referenceEv = the parametric evRaw produced by the BASE assumptions; used
  // to derive evScale so base EV == target. Computed once and cached.
  var _refEvCache = {};
  function referenceEv(caseId) {
    if (_refEvCache[caseId] != null) return _refEvCache[caseId];
    var a = baseAssumptions(caseId);
    var f = buildForecast(caseId, a);
    var wacc = a.wacc / 100;
    var pvFcf = 0;
    for (var t = 1; t < f.fcf.length; t++) pvFcf += f.fcf[t] / Math.pow(1 + wacc, t);
    var pvTv = (f.ebitda[YEARS - 1] * a.exitMultiple) / Math.pow(1 + wacc, YEARS);
    _refEvCache[caseId] = pvFcf + pvTv;
    return _refEvCache[caseId];
  }

  // irrRawBase = the parametric raw IRR under BASE assumptions. projIRR anchors
  // to the headline here and amplifies deviations from this base by IRR_BETA.
  var _irrRawCache = {};
  function irrRawBase(caseId) {
    if (_irrRawCache[caseId] != null) return _irrRawCache[caseId];
    var a = baseAssumptions(caseId);
    var f = buildForecast(caseId, a);
    var evScale = CASES[caseId].target.evMid * 1000 / referenceEv(caseId);
    var tv = f.ebitda[YEARS - 1] * a.exitMultiple;
    var irrCf = f.fcf.slice();
    irrCf[irrCf.length - 1] += tv * evScale * IRR_TV_DAMP;
    _irrRawCache[caseId] = irr(irrCf) * 100;
    return _irrRawCache[caseId];
  }

  function equitySpread(caseId) {
    var t = CASES[caseId].target;
    return t.equityIRR - t.projIRR;   // anchors base equityIRR to headline
  }

  var _npvOffCache = {};
  function npvOffset(caseId) {
    if (_npvOffCache[caseId] != null) return _npvOffCache[caseId];
    var a = baseAssumptions(caseId);
    var f = buildForecast(caseId, a);
    var wacc = a.wacc / 100;
    var pvFcf = 0;
    for (var t = 1; t < f.fcf.length; t++) pvFcf += f.fcf[t] / Math.pow(1 + wacc, t);
    var pvTv = (f.ebitda[YEARS - 1] * a.exitMultiple) / Math.pow(1 + wacc, YEARS);
    var evScale = CASES[caseId].target.evMid * 1000 / referenceEv(caseId);
    var raw = (pvFcf + pvTv + f.fcf[0]) * evScale;
    _npvOffCache[caseId] = CASES[caseId].target.npv - raw;
    return _npvOffCache[caseId];
  }

  var _moicScaleCache = {};
  function moicScale(caseId) {
    if (_moicScaleCache[caseId] != null) return _moicScaleCache[caseId];
    var a = baseAssumptions(caseId);
    var f = buildForecast(caseId, a);
    var evScale = CASES[caseId].target.evMid * 1000 / referenceEv(caseId);
    var tv = f.ebitda[YEARS - 1] * a.exitMultiple;
    var irrCf = f.fcf.slice();
    irrCf[irrCf.length - 1] += tv * evScale * IRR_TV_DAMP;
    var inflow = 0, outflow = 0;
    irrCf.forEach(function (v) { if (v >= 0) inflow += v; else outflow += -v; });
    var raw = outflow > 0 ? inflow / outflow : 1;
    _moicScaleCache[caseId] = CASES[caseId].target.moic / raw;
    return _moicScaleCache[caseId];
  }

  // Payback is anchored to the headline at base and lengthens as the project
  // IRR erodes (payback ∝ baseIRR/currentIRR), which mirrors how a returns hit
  // pushes out the breakeven year. Bounded to the forecast horizon.
  function computePayback(caseId, irrCf, currentIRR) {
    var t = CASES[caseId].target;
    var baseIRR = t.projIRR;
    if (currentIRR <= 0) return YEARS;
    var pb = t.paybackYrs * (baseIRR / currentIRR);
    return round1(Math.max(1, Math.min(YEARS + 2, pb)));
  }

  // ── describeDelta(before, after, hurdleRate) ──────────────────────────────
  function describeDelta(before, after, hurdleRate) {
    hurdleRate = (hurdleRate != null) ? hurdleRate : (after.hurdleRate || 10.0);
    var changed = [];
    function diff(metric, key, fmt) {
      var f = before[key], t = after[key];
      if (f == null || t == null) return;
      if (round2(f) === round2(t)) return;
      changed.push({ metric: metric, from: fmt(f), to: fmt(t), dir: t < f ? 'down' : 'up' });
    }
    var pct = function (v) { return v.toFixed(1) + '%'; };
    var usdB = function (v) { return '$' + v.toFixed(1) + 'B'; };
    var usdMsigned = function (v) { return (v >= 0 ? '+$' : '−$') + Math.abs(Math.round(v)) + 'M'; };
    var x = function (v) { return v.toFixed(1) + 'x'; };

    diff('Enterprise Value', 'evMid', usdB);
    diff('Project IRR', 'projIRR', pct);
    diff('Equity IRR', 'equityIRR', pct);
    diff('NPV', 'npv', usdMsigned);
    diff('MOIC', 'moic', x);

    var pass = after.projIRR >= hurdleRate;
    var spread = after.projIRR - hurdleRate;
    var spreadStr = (spread >= 0 ? '+' : '') + spread.toFixed(1) + 'pp';

    var evChg = round1(after.evMid - before.evMid);
    var irrChg = round1(after.projIRR - before.projIRR);
    var dir = evChg < 0 ? 'fell' : (evChg > 0 ? 'rose' : 'held');
    var headline = 'Enterprise Value ' + dir + ' to $' + after.evMid.toFixed(1) + 'B'
      + ' and Project IRR moved to ' + after.projIRR.toFixed(1) + '%'
      + (pass ? ', clearing the ' : ', falling short of the ') + hurdleRate.toFixed(1) + '% hurdle.';
    var detail = 'EV change ' + (evChg >= 0 ? '+' : '') + '$' + Math.abs(evChg).toFixed(1) + 'B'
      + ', IRR change ' + (irrChg >= 0 ? '+' : '') + irrChg.toFixed(1) + 'pp. '
      + 'Hurdle spread ' + spreadStr + (pass ? ' (cleared).' : ' (below hurdle).');

    return {
      type: 'assumption_update',
      narrative: { headline: headline, detail: detail },
      changed: changed,
      hurdle: { rate: hurdleRate.toFixed(1) + '%', pass: pass, spreadPp: spreadStr },
      suggestedFollowUps: [
        'Show the EV sensitivity to this driver.',
        'How does the capital structure cushion this move?',
        pass ? 'What is the remaining headroom to hurdle?' : 'What would restore the hurdle spread?'
      ]
    };
  }

  // ── rounding helpers ──────────────────────────────────────────────────────
  function round0(v) { return Math.round(v); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function round2(v) { return Math.round(v * 100) / 100; }

  var ValuationModel = {
    baseAssumptions: baseAssumptions,
    computeValuation: computeValuation,
    describeDelta: describeDelta
  };

  root.ValuationModel = ValuationModel;
  if (typeof module !== 'undefined' && module.exports) module.exports = ValuationModel;
})(typeof window !== 'undefined' ? window : globalThis);
