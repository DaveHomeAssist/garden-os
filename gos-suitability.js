/* gos-suitability.js - compatibility facade for Garden OS v5 surfaces.
 *
 * Load gos-suitability-core.js before this file. The core owns the deterministic
 * scoring implementation; this facade preserves the historical window
 * `GosSuitability` API used by the root HTML tools.
 */
(function (global) {
  'use strict';

  var core = global.GardenScoringCore;
  if (!core && typeof require === 'function') {
    core = require('./gos-suitability-core.js');
  }
  if (!core) {
    throw new Error('GardenScoringCore is missing. Load gos-suitability-core.js before gos-suitability.js.');
  }

  global.GosSuitability = core;
})(typeof window !== 'undefined' ? window : globalThis);
