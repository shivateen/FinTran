/* ============================================================================
 * voice-session.js — shared persona + tool schemas for the Realtime co-pilot
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH used by BOTH:
 *   - the backend (server/server.js) — puts instructions + tools into the
 *     /v1/realtime/client_secrets session config, so the model has them from
 *     the first token (VOICE_MODULE_SPEC §3.3 — this is what makes it work);
 *   - the browser (index.html) — re-asserts them via session.update and reuses
 *     the same tool dispatch names.
 *
 * Loaded as a plain <script> in the browser (exposes window.VOICE_SESSION) and
 * via require() in Node (module.exports). Tool format per the Realtime API:
 * { type:'function', name, description, parameters }.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // Known static investment cases (dynamic ones are created at runtime; the
  // model can still pass their id as a free string to case_id).
  var CASE_IDS = ['dubaiAI', 'dubaiDC01', 'riyadh', 'jeddah'];

  function buildTools(registry) {
    var reg = registry || root.UI_REGISTRY;
    var screenIds  = reg && reg.screenIds  ? reg.screenIds()  : [];
    var surfaceIds = reg && reg.surfaceIds ? reg.surfaceIds() : [];
    var leverIds   = reg && reg.leverIds   ? reg.leverIds()   : [];
    var fn = function (name, description, properties, required) {
      return { type: 'function', name: name, description: description,
        parameters: { type: 'object', properties: properties || {}, required: required || [] } };
    };
    return [
      fn('navigate', 'Switch the dashboard to a screen.', { screen_id: { type: 'string', enum: screenIds } }, ['screen_id']),
      fn('show_surface', 'Scroll to and highlight a specific KPI, lever or panel by id.', { surface_id: { type: 'string', enum: surfaceIds } }, ['surface_id']),
      fn('select_case', 'Make a different investment case active.', { case_id: { type: 'string', enum: CASE_IDS } }, ['case_id']),
      fn('get_valuation', 'Read the current headline valuation (EV, IRR, NPV, hurdle) for a case. ALWAYS call this before answering any numeric question.', { case_id: { type: 'string' } }, []),
      fn('get_screen_state', 'Read what is currently shown on a screen.', { screen_id: { type: 'string', enum: screenIds } }, ['screen_id']),
      fn('list_assumptions', 'List the current adjustable assumptions and their values for a case.', { case_id: { type: 'string' } }, []),
      fn('change_assumption', 'Change one assumption (lever) and recompute the valuation. Returns the before/after delta and hurdle status.', { lever_id: { type: 'string', enum: leverIds }, value: { type: 'number', description: 'New value in the lever’s units (e.g. power cost in $/kWh, WACC in %).' } }, ['lever_id', 'value']),
      fn('run_power_shock', 'Apply a percentage increase to power cost and recompute.', { pct: { type: 'number', description: 'Percent increase, e.g. 20.' } }, []),
      fn('apply_riyadh_ramp', 'Apply the faster Riyadh utilization ramp to the active case.', {}, []),
      fn('set_hurdle_rate', 'Set the CFO baseline hurdle rate (percent).', { rate: { type: 'number' } }, ['rate']),
      fn('generate_ic_pack', 'Generate the Investment Committee memorandum for the active case.', {}, []),
      fn('build_capital_structure', 'Open / optimise the funding strategy; optionally set the debt percentage.', { debtPct: { type: 'number' } }, []),
      fn('retrieve_land_docs', 'Open the data room and retrieve the land / legal documents.', {}, []),
      fn('create_investment_case', 'Create a new investment case, optionally from a template case.', { name: { type: 'string' }, location: { type: 'string' }, template_from: { type: 'string', enum: CASE_IDS } }, []),
    ];
  }

  function buildInstructions(registry) {
    var reg = registry || root.UI_REGISTRY;
    var map = (reg && reg.summaryForPrompt) ? reg.summaryForPrompt() : '';
    return [
      'Always respond in English (en-US). Regardless of the language you think you heard, speak and write ONLY in English.',
      'Greet the CFO with one short English sentence when the session begins, then wait for a question.',
      "You are FinTran's CFO valuation co-pilot for a board-level data-center investment demo.",
      'Operate like a senior valuation, FP&A and risk partner speaking directly to the CFO.',
      'INVARIANT: never invent numbers. For ANY question about IRR, EV, NPV, an assumption, a scenario, a case, or a valuation, you MUST call a tool first — the tools compute deterministically and update the live dashboard; then you narrate the result. You DO have access to the live model through these tools, so never say you lack access — call the relevant tool.',
      'After every tool result, say what changed, whether the case clears the hurdle, the top dependency, and one useful next drill-down. Speak in concise boardroom language; figures in USD millions/billions.',
      'You control a live dashboard. Use navigate / show_surface to move to the relevant screen when you answer.',
      'Sensitivity analysis, the football field, WACC, scenarios, core assumptions and the 10-year cash-flow forecast are SECTIONS of the "studio" (Financial Model) screen — they are NOT separate screens. To show one, call show_surface with its panel id (e.g. show_surface("panel.sensitivity")); never try to navigate to a screen that is not in the screen list.',
      'The dashboard map:', map,
    ].join('\n');
  }

  var api = { buildTools: buildTools, buildInstructions: buildInstructions, CASE_IDS: CASE_IDS };
  root.VOICE_SESSION = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
