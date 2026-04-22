// today.dev.js
// REFERENCE ONLY as of Garden OS v4.5 (2026-04-22).
// The authoritative today engine is now inlined inside
// garden-planner-v4.html (Phase 3 shipped together with 5B closure).
// This module stays checked in as:
//   1. A clean reference of the TASK_RULES table and pure
//      buildTodayTasks(state, weather, now) contract.
//   2. The harness backing for tests/today.test.html.
// If you change behavior, update BOTH the inlined copy in the planner
// and this file; otherwise the reference drifts.
//
// Pure function:
//   todayEngine.buildTodayTasks(state, weather, now, opts?) -> Task[]
//
// Task shape:
//   { id, cellId, crop, action, priority, reason, factors[], dueWindow }
//
// Action enum v1 (subset active until frostSensitive lands in Phase 4):
//   water, check, harvest, cover_frost, shade_heat,
//   succession_plant, thin, trellis_check
//
// TASK_RULES covers 8 factions x 3 stages x 4 weather signals.
// Frost rules are drafted but require the `frostSensitive` crop field
// which does not exist yet; they emit tasks only when the crop has
// `frostSensitive === true`, otherwise they no-op.

(function (global) {
  "use strict";

  const STAGES = Object.freeze(["sprout", "growing", "harvest"]);
  const FACTIONS = Object.freeze([
    "brassicas", "climbers", "companions", "fast_cycles",
    "fruiting", "greens", "herbs", "roots",
  ]);

  // Weighted rules. Higher priority surfaces first.
  // Each rule: { when: { faction, stage?, signal }, action, priority, reasonTemplate }
  const TASK_RULES = Object.freeze([
    // Water under heat across all factions
    { when: { faction: "greens",        signal: "heatHigh24" }, action: "water",        priority: 90,  reasonTemplate: "High heat forecast. Water ${crop} deeply tonight." },
    { when: { faction: "fruiting",      signal: "heatHigh24" }, action: "water",        priority: 85,  reasonTemplate: "High heat forecast. Water ${crop} deeply tonight." },
    { when: { faction: "brassicas",     signal: "heatHigh24" }, action: "shade_heat",   priority: 82,  reasonTemplate: "Heat stress risk. Shade ${crop} this afternoon." },
    { when: { faction: "roots",         signal: "heatHigh24" }, action: "water",        priority: 70,  reasonTemplate: "Keep ${crop} soil evenly moist during heat." },
    { when: { faction: "herbs",         signal: "heatHigh24" }, action: "water",        priority: 60,  reasonTemplate: "Water ${crop} at the base to prevent leaf scorch." },
    { when: { faction: "climbers",      signal: "heatHigh24" }, action: "water",        priority: 78,  reasonTemplate: "Heat today. Water ${crop} and check trellis shade." },
    { when: { faction: "companions",    signal: "heatHigh24" }, action: "water",        priority: 55,  reasonTemplate: "Water companion ${crop} during heat." },
    { when: { faction: "fast_cycles",   signal: "heatHigh24" }, action: "water",        priority: 75,  reasonTemplate: "Fast-cycle ${crop} bolts under heat. Water and check." },

    // Rain signals
    { when: { faction: "brassicas",     signal: "rainHigh24" }, action: "check",        priority: 40,  reasonTemplate: "Rain incoming. Check ${crop} for splash damage tomorrow." },
    { when: { faction: "fruiting",      signal: "rainHigh24" }, action: "check",        priority: 50,  reasonTemplate: "Rain incoming. Stake or support ${crop}." },
    { when: { faction: "herbs",         signal: "rainHigh24" }, action: "check",        priority: 30,  reasonTemplate: "Rain soon. Check ${crop} for rot risk." },
    { when: { faction: "fast_cycles",   signal: "rainHigh24" }, action: "check",        priority: 45,  reasonTemplate: "Rain soon. Fast-cycle ${crop} benefits; check drainage." },

    // Stage-specific: harvest-ready
    { when: { stage: "harvest" },                                action: "harvest",      priority: 95,  reasonTemplate: "${crop} is at harvest window." },

    // Stage-specific: sprout care
    { when: { stage: "sprout", signal: "calm" },                 action: "check",        priority: 35,  reasonTemplate: "Check ${crop} sprouts for thinning and pest pressure." },
    { when: { faction: "roots", stage: "sprout" },               action: "thin",         priority: 50,  reasonTemplate: "Thin ${crop} seedlings to target spacing." },
    { when: { faction: "greens", stage: "sprout" },              action: "thin",         priority: 45,  reasonTemplate: "Thin ${crop} to the healthiest starts." },

    // Growing-stage upkeep
    { when: { faction: "climbers", stage: "growing" },           action: "trellis_check", priority: 48, reasonTemplate: "Guide ${crop} up the trellis; check ties." },
    { when: { faction: "fruiting", stage: "growing", signal: "calm" }, action: "check",   priority: 38, reasonTemplate: "Check ${crop} for early fruit set." },

    // Succession planting trigger
    { when: { faction: "fast_cycles", stage: "harvest" },        action: "succession_plant", priority: 65, reasonTemplate: "${crop} finishing. Plant the next succession now." },
    { when: { faction: "greens",      stage: "harvest" },        action: "succession_plant", priority: 60, reasonTemplate: "${crop} finishing. Start a new row." },

    // Frost rules (require frostSensitive=true on the crop record)
    { when: { faction: "fruiting", signal: "frostTonight", requiresFrostSensitive: true }, action: "cover_frost", priority: 99, reasonTemplate: "Frost tonight. Cover ${crop} before sundown." },
    { when: { faction: "greens",   signal: "frostTonight", requiresFrostSensitive: true }, action: "cover_frost", priority: 90, reasonTemplate: "Frost tonight. Cover ${crop}." },
    { when: { faction: "herbs",    signal: "frostTonight", requiresFrostSensitive: true }, action: "cover_frost", priority: 85, reasonTemplate: "Frost tonight. Bring ${crop} in or cover." },
  ]);

  // Derive planting stage from crop metadata and plantedAt date.
  // Returns one of STAGES or null if the crop cannot be staged.
  function deriveStage(crop, plantedAtIso, nowMs) {
    if (!crop || !plantedAtIso) return null;
    const dtm = typeof crop.daysToMaturity === "number" ? crop.daysToMaturity : null;
    if (!dtm || dtm <= 0) return null;

    const planted = Date.parse(plantedAtIso);
    if (Number.isNaN(planted)) return null;
    const ageDays = Math.max(0, (nowMs - planted) / (24 * 60 * 60 * 1000));
    const pct = ageDays / dtm;
    if (pct < 0.15) return "sprout";
    if (pct < 0.95) return "growing";
    return "harvest";
  }

  // Classify the current weather snapshot into the signals the rules use.
  function weatherSignals(weather, opts) {
    opts = opts || {};
    const frostThresholdF = typeof opts.frostThresholdF === "number" ? opts.frostThresholdF : 36;
    const heatThresholdF  = typeof opts.heatThresholdF  === "number" ? opts.heatThresholdF  : 92;

    if (!weather) return ["calm"];

    const signals = [];
    if (weather.daily && Array.isArray(weather.daily.tMinF) && weather.daily.tMinF.length &&
        weather.daily.tMinF[0] < frostThresholdF) {
      signals.push("frostTonight");
    }
    let maxH = 0;
    if (weather.hourly && Array.isArray(weather.hourly.tF) && weather.hourly.tF.length) {
      for (const v of weather.hourly.tF.slice(0, 24)) if (typeof v === "number" && v > maxH) maxH = v;
    } else if (weather.daily && Array.isArray(weather.daily.tMaxF) && weather.daily.tMaxF.length) {
      maxH = weather.daily.tMaxF[0];
    }
    if (maxH > heatThresholdF) signals.push("heatHigh24");

    let maxR = 0;
    if (weather.hourly && Array.isArray(weather.hourly.rainProb) && weather.hourly.rainProb.length) {
      for (const v of weather.hourly.rainProb.slice(0, 24)) if (typeof v === "number" && v > maxR) maxR = v;
    } else if (weather.daily && Array.isArray(weather.daily.rainProb) && weather.daily.rainProb.length) {
      maxR = weather.daily.rainProb[0];
    }
    if (maxR >= 60) signals.push("rainHigh24");

    if (signals.length === 0) signals.push("calm");
    return signals;
  }

  function ruleMatches(rule, ctx) {
    const when = rule.when || {};
    if (when.faction && when.faction !== ctx.faction) return false;
    if (when.stage && when.stage !== ctx.stage) return false;
    if (when.signal && !ctx.signals.includes(when.signal)) return false;
    if (when.requiresFrostSensitive && !ctx.cropRecord.frostSensitive) return false;
    return true;
  }

  function renderReason(template, vars) {
    return template.replace(/\$\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? String(vars[k]) : "";
    });
  }

  // Main entry. State shape expected:
  //   { beds: [ { id, cells: [ { id, row, col, crop: 'cherry_tom' | null, plantedAt?: ISO } ] } ],
  //     crops: { [cropKey]: { name, faction, daysToMaturity, frostSensitive? } } }
  // weather: normalized snapshot from gardenWeather.normalizePayload, or null.
  // now: Date or number (ms).
  // opts: { frostThresholdF, heatThresholdF, limit }
  function buildTodayTasks(state, weather, now, opts) {
    opts = opts || {};
    const limit = typeof opts.limit === "number" ? opts.limit : 5;
    const nowMs = (now instanceof Date) ? now.getTime() : (typeof now === "number" ? now : Date.now());
    if (!state || !Array.isArray(state.beds)) return [];

    const signals = weatherSignals(weather, opts);
    const crops = state.crops || {};
    const candidates = [];

    for (const bed of state.beds) {
      if (!bed || !Array.isArray(bed.cells)) continue;
      for (const cell of bed.cells) {
        if (!cell || !cell.crop) continue;
        const cropRecord = crops[cell.crop];
        if (!cropRecord) continue;
        const faction = cropRecord.faction || null;
        const stage = deriveStage(cropRecord, cell.plantedAt, nowMs);

        const ctx = { faction, stage, signals, cropRecord };

        for (const rule of TASK_RULES) {
          if (!ruleMatches(rule, ctx)) continue;
          const estimated = !cell.plantedAt;
          const id = (bed.id || "bed") + ":" + (cell.id || (cell.row + ":" + cell.col)) + ":" + rule.action;
          const reason = renderReason(rule.reasonTemplate, {
            crop: cropRecord.name || cell.crop,
            faction: faction || "",
          });
          candidates.push({
            id: id,
            cellId: cell.id || null,
            crop: cell.crop,
            action: rule.action,
            priority: rule.priority,
            reason: reason + (estimated ? " (timing estimated)" : ""),
            factors: [faction, stage || "unknown", ...signals].filter(Boolean),
            dueWindow: "today",
          });
        }
      }
    }

    candidates.sort(function (a, b) { return b.priority - a.priority; });

    // Deduplicate: one task per (cell, action) pair, keep highest priority.
    const seen = new Set();
    const out = [];
    for (const t of candidates) {
      const key = (t.cellId || "") + ":" + t.action;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length >= limit) break;
    }
    return out;
  }

  const api = {
    STAGES: STAGES,
    FACTIONS: FACTIONS,
    TASK_RULES: TASK_RULES,
    deriveStage: deriveStage,
    weatherSignals: weatherSignals,
    buildTodayTasks: buildTodayTasks,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.todayEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
