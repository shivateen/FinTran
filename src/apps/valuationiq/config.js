/* ============================================================================
 * config.js — Frontend runtime config for the ValuationIQ voice module
 * ----------------------------------------------------------------------------
 * Exposes window.VALUATION_CONFIG (contract §2). Tiny, dependency-free, loaded
 * as a plain <script src> before realtime-copilot.js / index.html boot.
 *
 *   API_BASE      "" on localhost/127.0.0.1 (same-origin to the dev server),
 *                 the Render origin otherwise.
 *   tokenEndpoint getter = API_BASE + '/api/v02/realtime-token'.
 *   model / voice defaults handed to RealtimeCopilot.
 *
 * A consumer (e.g. the master-app shell) MAY override
 *   window.VALUATION_CONFIG.tokenEndpoint = '...'
 * before boot — assigning to the property shadows the getter, so the override
 * wins. Do the same for API_BASE/model/voice if needed.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var host = (root.location && root.location.hostname) || '';
  var isLocal = (host === 'localhost' || host === '127.0.0.1');

  root.VALUATION_CONFIG = {
    // "" on localhost (relative calls hit the dev server); Render URL in prod.
    API_BASE: isLocal ? '' : 'https://fintran-valuation-app.onrender.com',

    // Derived from API_BASE unless a consumer overrides this property directly.
    get tokenEndpoint() { return this.API_BASE + '/api/v02/realtime-token'; },

    model: 'gpt-realtime-2',
    voice: 'marin'
  };

  // Node test harness support (mirrors the other browser scripts).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.VALUATION_CONFIG;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
