/**
 * Garden OS Engine — Console Diagnostic Tests
 *
 * Usage:
 *   1. Open garden-league-simulator-v4.html in a browser
 *   2. Open DevTools console
 *   3. Paste this entire file
 *   4. Call: runAllTests()
 *   5. Results appear as a table
 *
 * Updated: 2026-03-17
 *
 * Important:
 * The simulator keeps engine internals inside an IIFE, so this harness
 * builds a private test bridge from the page source before running tests.
 * That lets the diagnostics exercise the real engine code without requiring
 * the production file to expose debug globals.
 */

(function () {
  "use strict";

  const results = [];
  let bridgeCache = null;

  function record(priority, name, pass, detail) {
    results.push({ priority, name, pass: !!pass, detail: detail || (pass ? "OK" : "FAIL") });
  }

  function runTest(priority, name, fn) {
    try {
      const detail = fn();
      record(priority, name, true, detail);
    } catch (error) {
      record(priority, name, false, error && error.message ? error.message : String(error));
    }
  }

  function fail(message) {
    throw new Error(message);
  }

  function ok(condition, message) {
    if (!condition) fail(message);
  }

  function eq(actual, expected, message) {
    if (actual !== expected) {
      fail(message || `Expected ${expected}, got ${actual}`);
    }
  }

  function approx(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
      fail(message || `Expected ${expected} ±${tolerance}, got ${actual}`);
    }
  }

  function inRange(value, lo, hi, message) {
    if (value < lo || value > hi) {
      fail(message || `Expected ${value} in [${lo}, ${hi}]`);
    }
  }

  function cloneJSON(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function createBridge() {
    if (window.__gardenEngineTestBridge) return window.__gardenEngineTestBridge;

    const engineSource = Array.from(document.querySelectorAll("script"))
      .map((node) => node.textContent || "")
      .filter((text) => text.includes("window.gardenOS={") && text.includes("function bedScore("))
      .sort((a, b) => b.length - a.length)[0];

    if (!engineSource) {
      fail("Unable to locate simulator engine source in the page");
    }

    const bootMarker = "/* ===== BOOT ===== */";
    const bootIndex = engineSource.indexOf(bootMarker);
    if (bootIndex === -1) {
      fail("Unable to locate boot marker in simulator source");
    }

    const preBootSource = engineSource.slice(0, bootIndex);
    const bridgeSource = `${preBootSource}
CAM=mkCampaign();
S=mkSeason(1,mkCF());
window.__gardenEngineTestBridge={
  clamp,rc,ri,nbs,grade,countPlanted,
  effectiveLight,sunFit,supFit,shadeFit,accFit,seaFit,adjScore,scoreCell,bedScore,
  eventPool,drawEvent,resolveTargets,applyEvent,
  mkCell,mkGrid,mkCF,mkSeason,mkCampaign,
  selectLine,shouldFirePlacementDialogue,determinePlacementTrigger,
  execIntervention,doAcceptLoss,
  save,load,saveCampaign,loadCampaign,saveH,loadH,
  seedEventRng,wRand,
  getState:()=>S,
  setState:(value)=>{S=value;return S;},
  getCampaign:()=>CAM,
  setCampaign:(value)=>{CAM=value;return CAM;},
  getSeededRng:()=>_seededRng,
  setSeededRng:(value)=>{_seededRng=value;return _seededRng;},
  getRender:()=>render,
  setRender:(fn)=>{render=fn;return render;},
  getSave:()=>save,
  setSave:(fn)=>{save=fn;return save;},
  getSaveCampaign:()=>saveCampaign,
  setSaveCampaign:(fn)=>{saveCampaign=fn;return saveCampaign;},
  getSaveH:()=>saveH,
  setSaveH:(fn)=>{saveH=fn;return saveH;},
  constants:{C,ED,DIALOGUE_DB,HOWTO_SECTIONS,GRADES,TRELLIS,BASE_SUN,ROWS,COLS,SIZE,SKEY,HKEY,CKEY}
};
})();`;

    eval(bridgeSource);
    if (!window.__gardenEngineTestBridge) {
      fail("Failed to initialize Garden OS engine test bridge");
    }
    return window.__gardenEngineTestBridge;
  }

  function bridge() {
    if (!bridgeCache) bridgeCache = createBridge();
    return bridgeCache;
  }

  function constants() {
    return bridge().constants;
  }

  function snapshotStorage() {
    const keys = constants();
    return {
      state: localStorage.getItem(keys.SKEY),
      campaign: localStorage.getItem(keys.CKEY),
      history: localStorage.getItem(keys.HKEY),
    };
  }

  function restoreStorage(snapshot) {
    const keys = constants();
    const pairs = [
      [keys.SKEY, snapshot.state],
      [keys.CKEY, snapshot.campaign],
      [keys.HKEY, snapshot.history],
    ];
    for (const [key, value] of pairs) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  }

  function withSandbox(fn) {
    const api = bridge();
    const stateSnapshot = cloneJSON(api.getState());
    const campaignSnapshot = cloneJSON(api.getCampaign());
    const storageSnapshot = snapshotStorage();
    const seededSnapshot = api.getSeededRng();
    const renderSnapshot = api.getRender();
    const saveSnapshot = api.getSave();
    const saveCampaignSnapshot = api.getSaveCampaign();
    const saveHSnapshot = api.getSaveH();

    try {
      api.setRender(() => {});
      return fn(api, api.constants);
    } finally {
      api.setState(stateSnapshot);
      api.setCampaign(campaignSnapshot);
      api.setSeededRng(seededSnapshot);
      api.setRender(renderSnapshot);
      api.setSave(saveSnapshot);
      api.setSaveCampaign(saveCampaignSnapshot);
      api.setSaveH(saveHSnapshot);
      restoreStorage(storageSnapshot);
    }
  }

  function makeGrid() {
    return bridge().mkGrid();
  }

  function plant(grid, placements) {
    for (const [idx, cropId] of Object.entries(placements)) {
      grid[Number(idx)].cropId = cropId;
    }
    return grid;
  }

  function testSuiteEnvironment() {
    const api = bridge();
    const keys = api.constants;
    ok(typeof api.bedScore === "function", "bedScore missing");
    ok(typeof api.drawEvent === "function", "drawEvent missing");
    ok(typeof api.mkSeason === "function", "mkSeason missing");
    ok(typeof keys.C === "object" && !!keys.C.cherry_tom, "crop database missing");
    ok(typeof keys.DIALOGUE_DB === "object", "dialogue DB missing");
    return "engine bridge initialized";
  }

  function testScoringDeterminism() {
    const api = bridge();
    const grid = plant(makeGrid(), {
      0: "cherry_tom",
      1: "basil",
      8: "lettuce",
      16: "carrot",
    });

    const snapshots = [];
    for (let i = 0; i < 50; i++) {
      snapshots.push(JSON.stringify(api.bedScore(grid, "spring")));
    }

    const first = snapshots[0];
    ok(snapshots.every((entry) => entry === first), "bedScore output changed across repeated runs");
    return `50 identical runs, finalScore=${api.bedScore(grid, "spring").finalScore}`;
  }

  function testScoreCellShape() {
    const api = bridge();
    const grid = plant(makeGrid(), { 0: "cherry_tom" });
    const result = api.scoreCell(0, grid, "spring");
    ok(result && typeof result === "object", "scoreCell returned null for planted cell");
    inRange(result.finalScore, 0, 10, "scoreCell.finalScore out of [0, 10]");
    eq(result.cropId, "cherry_tom", "scoreCell cropId mismatch");
    ok(result.factors && typeof result.factors === "object", "scoreCell factors missing");
    for (const key of ["sun", "support", "shade", "access", "season", "adjacency"]) {
      ok(typeof result.factors[key] === "number", `scoreCell missing factor ${key}`);
    }
    return `scoreCell.finalScore=${result.finalScore.toFixed(2)}`;
  }

  function testScoreCellEmpty() {
    eq(bridge().scoreCell(0, makeGrid(), "spring"), null, "scoreCell should return null for empty cell");
    return "empty cell -> null";
  }

  function testEffectiveLightBaseline() {
    const api = bridge();
    const grid = makeGrid();
    approx(api.effectiveLight(0, grid), 4.5, 0.001, "row 0 light mismatch");
    approx(api.effectiveLight(8, grid), 5.25, 0.001, "row 1 light mismatch");
    approx(api.effectiveLight(16, grid), 6, 0.001, "row 2 light mismatch");
    approx(api.effectiveLight(24, grid), 6, 0.001, "row 3 light mismatch");
    return "rows 0-3 = 4.5, 5.25, 6, 6";
  }

  function testEffectiveLightTallShadow() {
    const api = bridge();
    const grid = plant(makeGrid(), { 0: "cherry_tom" });
    approx(api.effectiveLight(8, grid), 4.75, 0.001, "tall crop shadow did not subtract 0.5");
    return "tall crop shadow applied";
  }

  function testResolveTargetsDeterminism() {
    const api = bridge();
    const grid = plant(makeGrid(), {
      0: "cherry_tom",
      1: "basil",
      2: "pepper",
      3: "lettuce",
      4: "carrot",
      5: "onion",
      6: "radish",
      7: "marigold",
    });
    const event = {
      me: { tgt: { type: "random_cells", filter: "planted", max: 3 }, mod: -1 },
    };

    const first = api.resolveTargets(event, grid);
    const second = api.resolveTargets(event, grid);
    eq(JSON.stringify(first), JSON.stringify(second), "resolveTargets changed across identical runs");
    eq(JSON.stringify(first), JSON.stringify([...first].sort((a, b) => a - b)), "resolveTargets order was not ascending");
    return `[${first.join(", ")}]`;
  }

  function testDrawEventDeterminism() {
    const api = bridge();
    const baseState = api.mkSeason(5, api.mkCF());
    plant(baseState.grid, {
      0: "cherry_tom",
      1: "basil",
      8: "lettuce",
      9: "dill",
    });
    baseState.beatIndex = 1;

    const firstState = cloneJSON(baseState);
    const secondState = cloneJSON(baseState);
    const pool = api.eventPool(baseState.season);
    const first = api.drawEvent(pool, firstState);
    const second = api.drawEvent(pool, secondState);

    ok(first && second, "drawEvent returned null for eligible pool");
    eq(first.id, second.id, "drawEvent was not deterministic for identical seeded state");
    eq(firstState.drawnEventIds.length, 1, "drawEvent did not log chosen event");
    eq(secondState.drawnEventIds.length, 1, "drawEvent did not log chosen event");
    return first.id;
  }

  function testMathRandomUsage() {
    const scripts = Array.from(document.querySelectorAll("script"))
      .map((node) => node.textContent || "")
      .filter((text) => text.includes("function bedScore(") && text.includes("function wRand("))
      .sort((a, b) => b.length - a.length)
      .slice(0, 1);
    const source = scripts.join("\n");
    const offenders = [];
    source.split("\n").forEach((line, index) => {
      if (!line.includes("Math.random")) return;
      if (line.includes("_seededRng||Math.random")) return;
      offenders.push(`L${index + 1}: ${line.trim()}`);
    });
    ok(offenders.length === 0, `Unexpected Math.random usage: ${offenders.join("; ")}`);
    return "Math.random only used as wRand fallback";
  }

  function testSunFitRange() {
    const api = bridge();
    const crops = Object.values(constants().C);
    for (const crop of crops) {
      for (let light = 0; light <= 10; light++) {
        inRange(api.sunFit(crop, light), 0, 5, `${crop.id} sunFit(${light}) out of range`);
      }
    }
    return `${crops.length * 11} combos checked`;
  }

  function testSupFitValues() {
    const api = bridge();
    const crops = constants().C;
    eq(api.supFit(crops.cherry_tom, 0), 5, "support crop should score 5 in trellis row 0");
    eq(api.supFit(crops.cherry_tom, 1), 5, "support crop should score 5 in trellis row 1");
    eq(api.supFit(crops.cherry_tom, 2), 1, "support crop should score 1 outside trellis");
    eq(api.supFit(crops.lettuce, 3), 3, "non-support crop should score 3");
    return "trellis and non-trellis cases verified";
  }

  function testSeaFitValues() {
    const api = bridge();
    const crops = constants().C;
    eq(api.seaFit(crops.lettuce, "spring"), 5, "cool crop spring mismatch");
    eq(api.seaFit(crops.lettuce, "summer"), 2, "cool crop summer mismatch");
    eq(api.seaFit(crops.cherry_tom, "summer"), 5, "warm crop summer mismatch");
    eq(api.seaFit(crops.cherry_tom, "fall"), 2, "warm crop fall mismatch");
    eq(api.seaFit(crops.lettuce, "winter"), 3, "winter fallback mismatch");
    return "spring/summer/fall/winter cases verified";
  }

  function testShadeAndAccessRanges() {
    const api = bridge();
    const keys = constants();
    const crops = Object.values(keys.C);
    for (const crop of crops) {
      for (let light = 1; light <= 6; light++) {
        inRange(api.shadeFit(crop, light), 1, 5, `${crop.id} shadeFit(${light}) out of range`);
      }
      for (let row = 0; row < keys.ROWS; row++) {
        inRange(api.accFit(crop, row), 3, 5, `${crop.id} accFit(${row}) out of range`);
      }
    }
    return "shadeFit and accFit stayed in documented ranges";
  }

  function testAdjacencyScoring() {
    const api = bridge();
    const companionGrid = plant(makeGrid(), { 0: "cherry_tom", 1: "basil" });
    ok(api.adjScore(0, "cherry_tom", companionGrid) > 0, "companion pair did not score positive");

    const conflictGrid = plant(makeGrid(), { 0: "cherry_tom", 1: "broccoli", 8: "broccoli", 2: "broccoli" });
    ok(api.adjScore(0, "cherry_tom", conflictGrid) < 0, "conflict pair did not score negative");
    inRange(api.adjScore(1, "broccoli", conflictGrid), -2, 2, "adjScore escaped clamp range");
    return "companions positive, conflicts negative, clamp intact";
  }

  function testApplyEventProtectionAndShape() {
    const api = bridge();
    const grid = plant(makeGrid(), { 0: "cherry_tom", 1: "basil" });
    grid[0].interventionFlag = "protected";
    const keysBefore = grid.map((cell) => Object.keys(cell).sort().join("|"));
    const event = { me: { tgt: { type: "crop_filter", filter: "planted" }, mod: -2 } };
    const affected = api.applyEvent(event, grid);

    ok(!affected.includes(0), "protected cell was included in affected targets");
    eq(grid[0].eventModifier, 0, "protected cell eventModifier changed");
    eq(grid[1].eventModifier, -2, "unprotected planted cell did not receive modifier");
    grid.forEach((cell, index) => {
      eq(Object.keys(cell).sort().join("|"), keysBefore[index], `cell ${index} shape changed after applyEvent`);
    });
    return `affected=[${affected.join(", ")}]`;
  }

  function testExecInterventionSwap() {
    return withSandbox((api) => {
      api.setCampaign(null);
      const state = api.mkSeason(1, api.mkCF());
      state.beatTokenAvailable = true;
      state.interventionMode = "swap";
      plant(state.grid, { 0: "cherry_tom", 1: "basil" });
      state.grid[0].eventModifier = 1.5;
      state.grid[1].eventModifier = -0.5;
      api.setState(state);

      api.execIntervention(0);
      eq(api.getState().swapFirstCell, 0, "first swap click did not arm swap");

      api.execIntervention(1);
      const next = api.getState();
      eq(next.grid[0].cropId, "basil", "swap did not move basil into first cell");
      eq(next.grid[1].cropId, "cherry_tom", "swap did not move tomato into second cell");
      eq(next.grid[0].eventModifier, -0.5, "swap did not move eventModifier with crop");
      eq(next.grid[1].eventModifier, 1.5, "swap did not preserve first eventModifier");
      eq(next.swapFirstCell, null, "swap did not clear armed cell");
      eq(next.beatTokenAvailable, false, "swap did not consume beat token");
      eq(next.interventionLog.length, 1, "swap did not log intervention");
      return "swap preserved crops, modifiers, and log";
    });
  }

  function testDoAcceptLossSingleApplication() {
    return withSandbox((api) => {
      api.setCampaign(null);
      const state = api.mkSeason(1, api.mkCF());
      state.beatIndex = 2;
      state.beatTokenAvailable = true;
      plant(state.grid, { 0: "cherry_tom", 1: "basil" });
      state.currentEvent = {
        id: "test_accept_loss",
        me: { tgt: { type: "crop_filter", filter: "planted" }, mod: -1 },
      };
      api.setState(state);

      api.doAcceptLoss();

      const next = api.getState();
      eq(next.grid[0].eventModifier, -1, "accept-loss applied modifier more than once to cell 0");
      eq(next.grid[1].eventModifier, -1, "accept-loss applied modifier more than once to cell 1");
      eq(next.eventLog.length, 1, "accept-loss did not log exactly one event");
      eq(next.interventionLog.length, 1, "accept-loss did not log intervention choice");
      eq(next.currentEvent, null, "accept-loss did not clear currentEvent");
      eq(next.beatTokenAvailable, false, "accept-loss did not consume beat token");
      return "event applied once, logged once";
    });
  }

  function testSelectLineNoImmediateRepeat() {
    return withSandbox((api) => {
      api.setCampaign(api.mkCampaign());
      api.setState(api.mkSeason(3, api.mkCF()));
      const pool = ["alpha", "beta", "gamma"];
      const first = api.selectLine(pool, "test_trigger", "gurl");
      const second = api.selectLine(pool, "test_trigger", "gurl");
      const third = api.selectLine(pool, "test_trigger", "gurl");

      ok(new Set([first, second, third]).size === 3, "selectLine repeated before exhausting pool");
      const fourth = api.selectLine(pool, "test_trigger", "gurl");
      ok(pool.includes(fourth), "selectLine returned value outside pool");
      return `picked=${first}, ${second}, ${third}, ${fourth}`;
    });
  }

  function testPlacementDialogueThrottle() {
    return withSandbox((api) => {
      const campaign = api.mkCampaign();
      campaign.placementCount = 1;
      campaign.lastDialoguePlacement = 0;
      api.setCampaign(campaign);
      eq(api.shouldFirePlacementDialogue("placement_first_crop"), true, "first crop trigger should always fire");

      const nextCampaign = api.getCampaign();
      nextCampaign.placementCount = 3;
      nextCampaign.lastDialoguePlacement = 0;
      eq(api.shouldFirePlacementDialogue("placement_generic"), true, "third placement should fire dialogue");
      eq(api.getCampaign().lastDialoguePlacement, 3, "dialogue throttle did not update lastDialoguePlacement");

      api.getCampaign().placementCount = 4;
      eq(api.shouldFirePlacementDialogue("placement_generic"), false, "non-threshold placement should not fire");
      return "first crop + every third placement behavior verified";
    });
  }

  function testDeterminePlacementTrigger() {
    return withSandbox((api) => {
      api.setState(api.mkSeason(1, api.mkCF()));
      api.setCampaign(api.mkCampaign());

      plant(api.getState().grid, { 1: "basil", 31: "carrot" });
      eq(api.determinePlacementTrigger(0, "pepper"), "placement_companion_found", "companion trigger mismatch");

      api.setState(api.mkSeason(1, api.mkCF()));
      plant(api.getState().grid, { 1: "peas", 31: "carrot" });
      eq(api.determinePlacementTrigger(0, "pepper"), "placement_conflict_found", "conflict trigger mismatch");

      api.setState(api.mkSeason(1, api.mkCF()));
      eq(api.determinePlacementTrigger(16, "cherry_tom"), "placement_trellis_wrong", "trellis violation trigger mismatch");
      return "companion/conflict/trellis triggers verified";
    });
  }

  function testClamp() {
    const api = bridge();
    eq(api.clamp(5, 0, 10), 5, "clamp mid-range mismatch");
    eq(api.clamp(-1, 0, 10), 0, "clamp low mismatch");
    eq(api.clamp(15, 0, 10), 10, "clamp high mismatch");
    eq(api.clamp(0, 0, 10), 0, "clamp lower bound mismatch");
    eq(api.clamp(10, 0, 10), 10, "clamp upper bound mismatch");
    return "5 boundary cases";
  }

  function testRcRi() {
    const api = bridge();
    const checks = [
      [0, 0, 0],
      [7, 0, 7],
      [8, 1, 0],
      [31, 3, 7],
      [api.ri(2, 4), 2, 4],
    ];
    for (const [index, row, col] of checks) {
      const coords = api.rc(index);
      eq(coords.row, row, `rc(${index}).row mismatch`);
      eq(coords.col, col, `rc(${index}).col mismatch`);
      eq(api.ri(row, col), index, `ri(${row}, ${col}) mismatch`);
    }
    return "corner, edge, and center round-trips verified";
  }

  function testNeighbors() {
    const api = bridge();
    eq(api.nbs(0).length, 2, "top-left corner should have 2 neighbors");
    eq(api.nbs(7).length, 2, "top-right corner should have 2 neighbors");
    eq(api.nbs(api.ri(1, 0)).length, 3, "edge cell should have 3 neighbors");
    eq(api.nbs(api.ri(1, 3)).length, 4, "center cell should have 4 neighbors");
    return "corner/edge/center counts verified";
  }

  function testGradeBoundaries() {
    const api = bridge();
    const expectations = [
      [90, "A+"],
      [80, "A"],
      [70, "B"],
      [60, "C"],
      [50, "D"],
      [49.99, "F"],
    ];
    for (const [score, expected] of expectations) {
      eq(api.grade(score), expected, `grade(${score}) mismatch`);
    }
    return "all boundaries verified";
  }

  function testCountPlanted() {
    const api = bridge();
    const grid = makeGrid();
    eq(api.countPlanted(grid), 0, "empty grid planted count mismatch");
    plant(grid, { 0: "cherry_tom", 5: "basil", 31: "carrot" });
    eq(api.countPlanted(grid), 3, "partial planted count mismatch");
    return "empty=0, partial=3";
  }

  function testCropDatabaseIntegrity() {
    const keys = constants();
    const required = [
      "id",
      "name",
      "emoji",
      "short",
      "faction",
      "sunMin",
      "sunIdeal",
      "support",
      "shadeScore",
      "coolSeason",
      "tall",
      "water",
      "companions",
      "conflicts",
      "chapterUnlock",
      "recipes",
      "ev",
      "sm",
    ];
    const issues = [];

    for (const [id, crop] of Object.entries(keys.C)) {
      for (const field of required) {
        if (!(field in crop)) issues.push(`${id} missing ${field}`);
      }
      for (const season of ["spring", "summer", "fall"]) {
        ok(typeof crop.sm[season] === "number", `${id} missing sm.${season}`);
        inRange(crop.sm[season], 0, 1, `${id} sm.${season} out of range`);
      }
      inRange(crop.chapterUnlock, 1, 12, `${id} chapterUnlock out of range`);
      for (const companion of crop.companions) {
        ok(!!keys.C[companion], `${id} companion ${companion} missing from crop map`);
      }
      for (const conflict of crop.conflicts) {
        ok(!!keys.C[conflict], `${id} conflict ${conflict} missing from crop map`);
      }
    }

    eq(Object.keys(keys.C).length, 20, "crop count drifted from expected 20");
    ok(issues.length === 0, `crop database issues: ${issues.join("; ")}`);
    return "20 crops with required fields and valid references";
  }

  function testCompanionSymmetryReport() {
    const crops = constants().C;
    const asymmetric = [];
    for (const [id, crop] of Object.entries(crops)) {
      for (const companion of crop.companions) {
        if (crops[companion] && !crops[companion].companions.includes(id)) {
          asymmetric.push(`${id}->${companion}`);
        }
      }
    }
    return asymmetric.length ? `asymmetric=${asymmetric.join(", ")}` : "all companions reciprocal";
  }

  function testBedScoreEmptyGrid() {
    const result = bridge().bedScore(makeGrid(), "spring");
    eq(result.bedAverage, 0, "empty bed average mismatch");
    eq(result.finalScore, 0, "empty bed finalScore mismatch");
    eq(result.grade, "F", "empty bed grade mismatch");
    eq(result.cellScores.length, 0, "empty bed cellScores mismatch");
    return "empty bed -> 0 / F";
  }

  function testBedScoreMixedGrid() {
    const api = bridge();
    const grid = plant(makeGrid(), {
      0: "cherry_tom",
      1: "basil",
      2: "pepper",
      8: "lettuce",
      9: "carrot",
      16: "onion",
      24: "marigold",
      25: "radish",
    });
    const result = api.bedScore(grid, "summer");
    inRange(result.finalScore, 0, 100, "bedScore.finalScore out of range");
    ok(["A+", "A", "B", "C", "D", "F"].includes(result.grade), `invalid grade ${result.grade}`);
    eq(result.cellScores.length, 8, "cell score count mismatch");
    ok(typeof result.finalScore === "number" && Number.isFinite(result.finalScore), "finalScore missing or non-finite");
    ok(typeof result.factorSummary.sun === "number", "factor summary missing sun");
    return `finalScore=${result.finalScore.toFixed(2)}, grade=${result.grade}`;
  }

  function testCarryForwardApplication() {
    const api = bridge();
    const cf = api.mkCF();
    cf.infrastructureMap["0,0"] = ["mulched", "enriched"];
    cf.infrastructureMap["1,1"] = ["compacted"];
    cf.soilFatigueMap["0,0"] = -0.3;
    cf.eventMemory.push({
      eventId: "memory_test",
      effectType: "infrastructure",
      modifier: -0.4,
      affectedCells: [{ row: 0, col: 0 }],
      expiresAfter: 1,
    });

    const season = api.mkSeason(2, cf);
    eq(season.grid[0].interventionFlag, "mulched", "mulch carry-forward missing");
    approx(season.grid[0].eventModifier, 0.1, 0.001, "event/enriched carry-forward mismatch at 0,0");
    approx(season.grid[9].eventModifier, -0.5, 0.001, "compacted carry-forward mismatch at 1,1");
    approx(season.grid[0].soilFatigue, -0.3, 0.001, "soil fatigue carry-forward mismatch");
    eq(cf.eventMemory.length, 0, "event memory did not decrement to removal");
    return "infrastructure, fatigue, and event memory applied";
  }

  function testSaveLoadRoundTrip() {
    return withSandbox((api) => {
      const state = api.mkSeason(5, api.mkCF());
      plant(state.grid, { 0: "cherry_tom", 1: "basil" });
      state.phase = "BEAT_1";
      state.selectedCell = 1;
      state.eventAffectedCells = [0, 1];
      state.interventionLog.push({ beatIndex: 0, type: "protect" });
      api.setState(state);
      api.save();

      const loaded = api.load();
      ok(loaded && typeof loaded === "object", "load returned null after save");
      eq(loaded.chapter, 5, "loaded chapter mismatch");
      eq(loaded.grid[0].cropId, "cherry_tom", "loaded grid crop mismatch");
      eq(loaded.grid[1].cropId, "basil", "loaded grid crop mismatch");
      eq(loaded.selectedCell, 1, "loaded selectedCell mismatch");
      eq(loaded.eventAffectedCells.length, 2, "loaded eventAffectedCells mismatch");
      return "season state round-trip ok";
    });
  }

  function testSaveLoadCampaignRoundTrip() {
    return withSandbox((api) => {
      const campaign = api.mkCampaign();
      campaign.currentChapter = 4;
      campaign.completedChapters = [1, 2, 3];
      campaign.bestScores[3] = 87;
      campaign.dialogueHistory = { sample: ["line-a"] };
      api.setCampaign(campaign);
      api.saveCampaign();

      const loaded = api.loadCampaign();
      ok(loaded && typeof loaded === "object", "loadCampaign returned null after saveCampaign");
      eq(loaded.currentChapter, 4, "campaign chapter mismatch");
      eq(loaded.completedChapters.length, 3, "completed chapters mismatch");
      eq(loaded.bestScores[3], 87, "best score mismatch");
      eq(loaded.dialogueHistory.sample[0], "line-a", "dialogue history mismatch");
      return "campaign state round-trip ok";
    });
  }

  function testSaveLoadHistoryRoundTrip() {
    return withSandbox((api) => {
      const history = Array.from({ length: 13 }, (_, index) => ({
        chapter: index + 1,
        finalScore: 50 + index,
      }));
      api.saveH(history);
      const loaded = api.loadH();
      eq(loaded.length, 12, "history should retain last 12 entries");
      eq(loaded[0].chapter, 2, "history trim start mismatch");
      eq(loaded[11].chapter, 13, "history trim end mismatch");
      return "history round-trip and trim ok";
    });
  }

  function testDialogueNoJargon() {
    const banned = ["beat", "token", "faction"];
    const offenders = [];
    for (const [trigger, pools] of Object.entries(constants().DIALOGUE_DB)) {
      for (const [character, lines] of Object.entries(pools)) {
        if (!Array.isArray(lines)) continue;
        lines.forEach((line, index) => {
          for (const term of banned) {
            if (new RegExp(`\\b${term}\\b`, "i").test(line)) {
              offenders.push(`${trigger}.${character}[${index}]`);
            }
          }
        });
      }
    }
    ok(offenders.length === 0, `dialogue jargon found in ${offenders.join(", ")}`);
    return "dialogue free of beat/token/faction";
  }

  function testDialoguePoolsNotEmpty() {
    const problems = [];
    for (const [trigger, pools] of Object.entries(constants().DIALOGUE_DB)) {
      for (const [character, lines] of Object.entries(pools)) {
        if (!Array.isArray(lines)) continue;
        if (lines.length === 0) problems.push(`${trigger}.${character} empty`);
        lines.forEach((line, index) => {
          if (typeof line !== "string" || !line.trim()) problems.push(`${trigger}.${character}[${index}] blank`);
        });
      }
    }
    ok(problems.length === 0, `empty dialogue entries: ${problems.join(", ")}`);
    return "all dialogue pools populated";
  }

  function testHowtoNoJargon() {
    const banned = ["beat", "token", "faction"];
    const offenders = [];
    for (const section of constants().HOWTO_SECTIONS) {
      const sectionText = [section.name, section.summary]
        .concat(section.bullets || [])
        .concat((section.shortcuts || []).flat())
        .join(" ");
      for (const term of banned) {
        if (new RegExp(`\\b${term}\\b`, "i").test(sectionText)) {
          offenders.push(`${section.id}:${term}`);
        }
      }
    }
    ok(offenders.length === 0, `HOWTO jargon found in ${offenders.join(", ")}`);
    return "HOWTO copy clean";
  }

  window.runAllTests = function runAllTests() {
    results.length = 0;

    runTest("P0", "P0: Engine globals available", testSuiteEnvironment);
    runTest("P0", "P0: Scoring determinism (50 runs)", testScoringDeterminism);
    runTest("P0", "P0: scoreCell returns object for planted cell", testScoreCellShape);
    runTest("P0", "P0: scoreCell returns null for empty cell", testScoreCellEmpty);
    runTest("P0", "P0: effectiveLight baseline rows", testEffectiveLightBaseline);
    runTest("P0", "P0: tall crop shadow reduces light by 0.5", testEffectiveLightTallShadow);
    runTest("P0", "P0: resolveTargets deterministic and sorted", testResolveTargetsDeterminism);
    runTest("P0", "P0: drawEvent deterministic for identical state", testDrawEventDeterminism);
    runTest("P0", "P0: No unexpected Math.random usage", testMathRandomUsage);

    runTest("P1", "P1: sunFit range coverage", testSunFitRange);
    runTest("P1", "P1: supFit trellis rules", testSupFitValues);
    runTest("P1", "P1: seaFit season rules", testSeaFitValues);
    runTest("P1", "P1: shadeFit and accFit stay in documented ranges", testShadeAndAccessRanges);
    runTest("P1", "P1: adjScore companion/conflict/clamp behavior", testAdjacencyScoring);
    runTest("P1", "P1: applyEvent respects protection and preserves cell shape", testApplyEventProtectionAndShape);
    runTest("P1", "P1: execIntervention swap preserves crops and modifiers", testExecInterventionSwap);
    runTest("P1", "P1: doAcceptLoss applies current event once", testDoAcceptLossSingleApplication);
    runTest("P1", "P1: selectLine avoids immediate repeats", testSelectLineNoImmediateRepeat);
    runTest("P1", "P1: placement dialogue throttle behavior", testPlacementDialogueThrottle);
    runTest("P1", "P1: determinePlacementTrigger context detection", testDeterminePlacementTrigger);

    runTest("P2", "P2: clamp boundary cases", testClamp);
    runTest("P2", "P2: rc/ri round-trip checks", testRcRi);
    runTest("P2", "P2: nbs neighbor counts", testNeighbors);
    runTest("P2", "P2: grade boundaries", testGradeBoundaries);
    runTest("P2", "P2: countPlanted counts only planted cells", testCountPlanted);
    runTest("P2", "P2: crop database integrity", testCropDatabaseIntegrity);
    runTest("P2", "P2: companion symmetry report", testCompanionSymmetryReport);
    runTest("P2", "P2: bedScore empty-grid behavior", testBedScoreEmptyGrid);
    runTest("P2", "P2: bedScore mixed-grid behavior", testBedScoreMixedGrid);
    runTest("P2", "P2: carry-forward application in mkSeason", testCarryForwardApplication);
    runTest("P2", "P2: save/load season round-trip", testSaveLoadRoundTrip);
    runTest("P2", "P2: save/load campaign round-trip", testSaveLoadCampaignRoundTrip);
    runTest("P2", "P2: save/load history round-trip", testSaveLoadHistoryRoundTrip);

    runTest("P3", "P3: dialogue jargon scan", testDialogueNoJargon);
    runTest("P3", "P3: dialogue pools are non-empty", testDialoguePoolsNotEmpty);
    runTest("P3", "P3: HOWTO jargon scan", testHowtoNoJargon);

    const passed = results.filter((result) => result.pass).length;
    const failed = results.length - passed;

    console.log("\n=== Garden OS Engine Tests ===");
    console.log(`${passed}/${results.length} passed, ${failed} failed\n`);
    console.table(results);

    if (failed) {
      console.log("\nFAILURES:");
      results
        .filter((result) => !result.pass)
        .forEach((result) => console.log(`- ${result.name}: ${result.detail}`));
    }

    return { passed, failed, total: results.length, results: results.slice() };
  };

  console.log("Garden OS engine tests loaded. Run: runAllTests()");
})();
