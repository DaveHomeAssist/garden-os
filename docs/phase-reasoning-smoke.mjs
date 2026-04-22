import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : 'playwright';
const { chromium } = await import(playwrightSpecifier);

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const BROWSER_PATH = process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve(process.cwd(), 'output/web-game/planner-phase4-contract');
const SIM_KEY = 'garden_os_v4_state';
const TUTORIAL_KEY = 'gardenOS_tutorialDone';

const PLANNER_FIXTURES = [
  {
    key: 'fit_trellis_cherry',
    size: { cols: 4, rows: 4 },
    inputs: {
      sunHours: 8,
      orientation: 'eastwest',
      sunDirection: 'south',
      season: 'summer',
      goal: 'balanced',
      zone: '7a',
      trellis: true,
      cage: { enabled: true, rearTrellis: true, wireSides: true, height: '24', doorStyle: 'mesh' }
    },
    cells: [{ cellId: 'r0c0', cropKey: 'cherry_tom' }],
    targetCellId: 'r0c0',
    expected: {
      status: 'fit',
      zoneLabel: 'Trellis row',
      minTraits: 3,
      cellScore: 8.3,
      bedScore: 72,
      bestFitCrop: 'beit_cucumber'
    }
  },
  {
    key: 'caution_trellis_lettuce',
    size: { cols: 4, rows: 4 },
    inputs: {
      sunHours: 8,
      orientation: 'eastwest',
      sunDirection: 'south',
      season: 'summer',
      goal: 'balanced',
      zone: '7a',
      trellis: true,
      cage: { enabled: true, rearTrellis: true, wireSides: true, height: '24', doorStyle: 'mesh' }
    },
    cells: [{ cellId: 'r0c1', cropKey: 'lettuce' }],
    targetCellId: 'r0c1',
    expected: {
      status: 'caution',
      zoneLabel: 'Trellis row',
      minTraits: 3,
      cellScore: 2.2,
      bedScore: 11,
      bestFitCrop: 'beit_cucumber'
    }
  },
  {
    key: 'conflict_off_trellis_cherry',
    size: { cols: 4, rows: 4 },
    inputs: {
      sunHours: 8,
      orientation: 'eastwest',
      sunDirection: 'south',
      season: 'summer',
      goal: 'balanced',
      zone: '7a',
      trellis: true,
      cage: { enabled: true, rearTrellis: true, wireSides: true, height: '24', doorStyle: 'mesh' }
    },
    cells: [{ cellId: 'r1c1', cropKey: 'cherry_tom' }],
    targetCellId: 'r1c1',
    expected: {
      status: 'conflict',
      zoneLabel: 'Protected row',
      minTraits: 3,
      cellScore: 4.2,
      bedScore: 31,
      bestFitCrop: 'woodland_strawberry'
    }
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function capturePage(page, filename) {
  const target = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: target, fullPage: true, timeout: 60000 });
  return target;
}

function makeGenericClientShim() {
  return `(() => {
    const pending = new Set();
    const origSetTimeout = window.setTimeout.bind(window);
    const origSetInterval = window.setInterval.bind(window);
    const origRequestAnimationFrame = window.requestAnimationFrame.bind(window);

    window.__vt_pending = pending;

    window.setTimeout = (fn, t, ...rest) => {
      const task = {};
      pending.add(task);
      return origSetTimeout(() => {
        pending.delete(task);
        fn(...rest);
      }, t);
    };

    window.setInterval = (fn, t, ...rest) => {
      const task = {};
      pending.add(task);
      return origSetInterval(() => {
        fn(...rest);
      }, t);
    };

    window.requestAnimationFrame = (fn) => {
      const task = {};
      pending.add(task);
      return origRequestAnimationFrame((ts) => {
        pending.delete(task);
        fn(ts);
      });
    };

    window.advanceTime = (ms) => {
      return new Promise((resolve) => {
        const start = performance.now();
        function step(now) {
          if (now - start >= ms) return resolve();
          origRequestAnimationFrame(step);
        }
        origRequestAnimationFrame(step);
      });
    };

    window.__drainVirtualTimePending = () => pending.size;
  })();`;
}

async function readPlannerReasoningState(page, targetCellId) {
  return page.evaluate((targetCellId) => {
    const serializeFits = (fits) => (Array.isArray(fits) ? fits : []).map((candidate) => ({
      cropKey: candidate.cropKey,
      score: Number(candidate.score.toFixed(1)),
      gain: Number(candidate.gain.toFixed(1)),
      fit: candidate.fit,
      reason: candidate.reason
    }));
    const serializeTraits = (traits) => (Array.isArray(traits) ? traits : []).map((trait) => ({
      label: trait.label,
      tone: trait.tone,
      reason: trait.reason
    }));
    const serializeZone = (zone) => ({
      label: zone?.label || '',
      reason: zone?.reason || '',
      chips: Array.isArray(zone?.chips) ? [...zone.chips] : []
    });
    const serializeIssue = (issue) => issue ? {
      msg: issue.msg,
      severity: issue.severity || 'low',
      code: issue.code || null
    } : null;
    const serializeDelta = (delta) => delta ? {
      current: Number(delta.current.toFixed(1)),
      betterCropKey: delta.betterCropKey,
      betterScore: Number(delta.betterScore.toFixed(1)),
      gain: Number(delta.gain.toFixed(1)),
      reasons: Array.isArray(delta.reasons) ? [...delta.reasons] : []
    } : null;
    const serializeFactor = (factor) => factor ? {
      label: factor.label,
      description: factor.description || ''
    } : null;

    const buildLegacySnapshot = (target, inputs, issueList) => {
      const targetIssues = (issueList || [])
        .filter((issue) => issue.cellId === target.id)
        .sort((a, b) => issueSeverityRank(a) - issueSeverityRank(b));
      const primaryIssue = targetIssues[0] || null;
      const inspectLead = summarizeInspectLead(target, inputs, issueList);
      const derivedZone = describeDerivedZone(target);
      const derivedTraits = deriveInspectTraits(target.crop, target, inputs);
      const strictFits = rankFitCandidatesForCell(target, inputs, { mode: 'strict', limit: 3 });
      const scoreBreakdown = getScoreBreakdown(target, inputs);
      const currentScore = scoreCell(target, inputs);
      const score = scoreBreakdown ? scoreBreakdown.total : currentScore;
      const delta = cellScoreDelta(target, inputs);
      const factorRows = scoreBreakdown && Array.isArray(scoreBreakdown.factors) ? scoreBreakdown.factors : [];
      const scoredFactors = factorRows
        .filter((factor) => typeof factor.value === 'number' && typeof factor.weight === 'number')
        .map((factor) => ({
          label: factor.label,
          ratio: clamp(factor.value / 5, 0, 1),
          description: factor.description
        }))
        .sort((a, b) => a.ratio - b.ratio);
      const weakestFactor = scoredFactors[0] || null;
      const strongestFactor = [...scoredFactors].sort((a, b) => b.ratio - a.ratio)[0] || null;
      const scoreDirection = score >= 7
        ? 'Stable. The current placement is working, but one weak factor still limits upside.'
        : score >= 4
          ? 'Mixed. This cell is workable, but one structural or environmental penalty is dragging it down.'
          : 'At risk. This placement is losing points fast and should be corrected before it compounds.';
      const tradeoff = primaryIssue
        ? `${primaryIssue.msg} ${reasonFix(primaryIssue, target, inputs)}`
        : weakestFactor && strongestFactor && weakestFactor.label !== strongestFactor.label
          ? `${strongestFactor.label} is carrying this cell, but ${weakestFactor.label} is limiting the score.`
          : 'No major violation is active. Use the score breakdown to fine tune the placement.';
      const nextMove = reasonFix(primaryIssue, target, inputs);
      const scoreTone = score >= 7 ? 'Stable score' : score >= 4 ? 'Mixed score' : 'At risk score';
      return {
        inspectLead: inspectLead ? {
          status: inspectLead.status,
          kicker: inspectLead.kicker,
          summary: inspectLead.summary
        } : null,
        derivedZone: serializeZone(derivedZone),
        derivedTraits: serializeTraits(derivedTraits),
        strictFits: serializeFits(strictFits),
        primaryIssue: serializeIssue(primaryIssue),
        score: Number(score.toFixed(1)),
        delta: serializeDelta(delta),
        weakestFactor: serializeFactor(weakestFactor),
        strongestFactor: serializeFactor(strongestFactor),
        scoreDirection,
        tradeoff,
        nextMove,
        scoreTone
      };
    };

    const buildSharedSnapshot = (snapshot) => ({
      inspectLead: snapshot?.inspectLead ? {
        status: snapshot.inspectLead.status,
        kicker: snapshot.inspectLead.kicker,
        summary: snapshot.inspectLead.summary
      } : null,
      derivedZone: serializeZone(snapshot?.derivedZone),
      derivedTraits: serializeTraits(snapshot?.derivedTraits),
      strictFits: serializeFits(snapshot?.strictFits),
      primaryIssue: serializeIssue(snapshot?.primaryIssue),
      score: snapshot?.score == null ? null : Number(snapshot.score.toFixed(1)),
      delta: serializeDelta(snapshot?.delta),
      weakestFactor: serializeFactor(snapshot?.weakestFactor),
      strongestFactor: serializeFactor(snapshot?.strongestFactor),
      scoreDirection: snapshot?.scoreDirection || '',
      tradeoff: snapshot?.tradeoff || '',
      nextMove: snapshot?.nextMove || '',
      scoreTone: snapshot?.scoreTone || ''
    });

    const target = bed.find((cell) => cell.id === targetCellId);
    if (!target) return null;

    const inputs = inp();
    const issues = cellIssues(inputs);
    const lead = summarizeInspectLead(target, inputs, issues);
    const zone = describeDerivedZone(target);
    const traits = deriveInspectTraits(target.crop, target, inputs);
    const strictFits = rankFitCandidatesForCell(target, inputs, { mode: 'strict', limit: 3 });
    const sharedSnapshot = buildPlannerReasoningSnapshot(target, inputs, issues);
    const shared = buildSharedSnapshot(sharedSnapshot);
    const legacy = buildLegacySnapshot(target, inputs, issues);
    const inspectRoot = document.getElementById('rpaneInspect');
    const reasoningRoot = document.getElementById('rpaneReasoning');
    const reasoningText = reasoningRoot?.innerText || '';

    return {
      targetCellId,
      internal: {
        cellScore: Number(scoreCell(target, inputs).toFixed(1)),
        bedScore: scoreBed(inputs),
        lead,
        zone,
        traitCount: traits.length,
        strictFits: serializeFits(strictFits)
      },
      parity: {
        allMatch: JSON.stringify(shared) === JSON.stringify(legacy),
        shared,
        legacy
      },
      dom: {
        reasoningTitle: reasoningRoot?.querySelector('.ichdr')?.textContent?.trim() || '',
        inspectHeader: inspectRoot?.querySelector('.insph')?.textContent?.trim() || '',
        inspectTitle: inspectRoot?.querySelector('.inspect-hero-title')?.textContent?.trim() || '',
        statusChip: inspectRoot?.querySelector('.inspect-status-chip')?.textContent?.trim().toLowerCase() || '',
        lead: inspectRoot?.querySelector('.inspect-lead')?.textContent?.trim() || '',
        derivedZoneLabel: inspectRoot?.querySelector('.inspect-section-title')?.textContent?.trim() || '',
        traitCount: inspectRoot?.querySelectorAll('.inspect-trait-item').length || 0,
        suggestionCount: inspectRoot?.querySelectorAll('.inspect-suggestion-item').length || 0,
        hasQuietSuggestion: Boolean(inspectRoot?.querySelector('.inspect-quiet')),
        reasoningText,
        hasReasoningSections: /score direction/i.test(reasoningText) && /top risk/i.test(reasoningText) && /next move/i.test(reasoningText)
      }
    };
  }, targetCellId);
}

async function capturePlannerFixture(browser, fixture) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.addInitScript((tutorialKey) => {
    try {
      localStorage.clear();
      localStorage.setItem(tutorialKey, '1');
    } catch (error) {
      console.warn(error);
    }
  }, TUTORIAL_KEY);
  await page.goto(`${BASE_URL}/garden-planner-v4.html`, { waitUntil: 'networkidle' });

  await page.evaluate((fixture) => {
    const setSelect = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = String(value);
    };
    const setToggle = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('on', !!on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    setPreset(fixture.size.cols, fixture.size.rows);
    setSelect('sunHours', fixture.inputs.sunHours);
    document.getElementById('sunVal').textContent = `${fixture.inputs.sunHours} hrs`;
    setSelect('orientation', fixture.inputs.orientation);
    setSelect('sunDirection', fixture.inputs.sunDirection);
    setSelect('season', fixture.inputs.season);
    setSelect('goal', fixture.inputs.goal);
    setSelect('zone', fixture.inputs.zone);
    setToggle('trellisToggle', fixture.inputs.trellis);

    cage.enabled = fixture.inputs.cage.enabled;
    cage.rearTrellis = fixture.inputs.cage.rearTrellis;
    cage.wireSides = fixture.inputs.cage.wireSides;
    cage.height = fixture.inputs.cage.height;
    cage.doorStyle = fixture.inputs.cage.doorStyle;
    syncCageUI();

    bed.forEach((cell) => {
      cell.crop = null;
    });
    fixture.cells.forEach((entry) => {
      const cell = bed.find((candidate) => candidate.id === entry.cellId);
      if (cell) cell.crop = entry.cropKey;
    });

    ui.selCell = fixture.targetCellId;
    ui.selectedCrop = fixture.cells[0]?.cropKey || 'lettuce';
    setTool('inspect');
    saveState();
    render();
  }, fixture);
  const reasoning = await readPlannerReasoningState(page, fixture.targetCellId);
  const result = { fixture: fixture.key, ...reasoning };

  assert(result.dom.reasoningTitle === 'Why this score', `${fixture.key}: reasoning title mismatch`);
  assert(result.dom.inspectHeader === 'Inspect & explain', `${fixture.key}: inspect header mismatch`);
  assert(result.dom.reasoningText.length > 0, `${fixture.key}: reasoning copy missing`);
  assert(result.dom.hasReasoningSections, `${fixture.key}: reasoning sections missing`);
  assert(result.parity.allMatch, `${fixture.key}: shared snapshot drifted from legacy helper output`);
  assert(result.internal.lead.status === fixture.expected.status, `${fixture.key}: expected status ${fixture.expected.status}, got ${result.internal.lead.status}`);
  assert(result.dom.statusChip === fixture.expected.status, `${fixture.key}: inspect chip expected ${fixture.expected.status}, got ${result.dom.statusChip}`);
  assert(result.internal.zone.label === fixture.expected.zoneLabel, `${fixture.key}: expected zone ${fixture.expected.zoneLabel}, got ${result.internal.zone.label}`);
  assert(result.dom.derivedZoneLabel === fixture.expected.zoneLabel, `${fixture.key}: DOM zone expected ${fixture.expected.zoneLabel}, got ${result.dom.derivedZoneLabel}`);
  assert(result.internal.traitCount >= fixture.expected.minTraits, `${fixture.key}: internal trait count too low`);
  assert(result.dom.traitCount >= fixture.expected.minTraits, `${fixture.key}: DOM trait count too low`);
  assert(result.internal.strictFits.every((candidate) => candidate.fit === 'fit'), `${fixture.key}: strict suggestions included a non-fit candidate`);
  assert(result.internal.cellScore === fixture.expected.cellScore, `${fixture.key}: expected cell score ${fixture.expected.cellScore}, got ${result.internal.cellScore}`);
  assert(result.internal.bedScore === fixture.expected.bedScore, `${fixture.key}: expected bed score ${fixture.expected.bedScore}, got ${result.internal.bedScore}`);
  assert(result.internal.strictFits[0]?.cropKey === fixture.expected.bestFitCrop, `${fixture.key}: expected best fit ${fixture.expected.bestFitCrop}, got ${result.internal.strictFits[0]?.cropKey}`);
  assert(result.dom.suggestionCount > 0 || result.dom.hasQuietSuggestion, `${fixture.key}: strict suggestions did not render`);

  const screenshot = await capturePage(page, `${fixture.key}.png`);
  await page.close();
  return { ...result, screenshot };
}

async function capturePlannerBroaderSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.addInitScript((tutorialKey) => {
    try {
      localStorage.clear();
      localStorage.setItem(tutorialKey, '1');
    } catch (error) {
      console.warn(error);
    }
  }, TUTORIAL_KEY);
  await page.goto(`${BASE_URL}/garden-planner-v4.html`, { waitUntil: 'networkidle' });
  await page.click('#autoFillBtn', { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const state = typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null;
      return state ? state.filled === 32 : false;
    } catch (error) {
      return Array.isArray(window.bed) ? window.bed.filter((cell) => cell.crop).length === 32 : false;
    }
  }, { timeout: 5000 });

  const prep = await page.evaluate(() => {
    const inputs = inp();
    const weakest = weakestCells(inputs, 1)[0];
    if (!weakest || !weakest.cell) return null;
    ui.selCell = weakest.cell.id;
    ui.selectedCrop = weakest.cell.crop;
    setTool('inspect');
    render();
    return {
      weakestCellId: weakest.cell.id,
      weakestScore: Number(weakest.score.toFixed(1)),
      filled: bed.filter((cell) => cell.crop).length,
      bedScore: scoreBed(inputs),
      state: typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null
    };
  });

  assert(prep && prep.weakestCellId, 'broader smoke: weakest cell selection missing');
  assert(prep.filled === 32, `broader smoke: expected filled bed, got ${prep.filled}`);
  assert(prep.state && prep.state.filled === 32, 'broader smoke: state export did not reflect filled bed');

  const reasoning = await readPlannerReasoningState(page, prep.weakestCellId);
  assert(reasoning.parity.allMatch, 'broader smoke: shared snapshot drifted from legacy helper output');
  assert(reasoning.dom.reasoningTitle === 'Why this score', 'broader smoke: reasoning title mismatch');
  assert(reasoning.dom.inspectHeader === 'Inspect & explain', 'broader smoke: inspect header mismatch');
  assert(reasoning.dom.hasReasoningSections, 'broader smoke: reasoning sections missing');

  const screenshot = await capturePage(page, 'broader_autofill_weakest.png');
  await page.close();
  return {
    ...prep,
    reasoning,
    screenshot,
    notes: 'Auto-fill click succeeded under the repo smoke harness and the weakest-cell inspect surface stayed in parity with the legacy helper chain.'
  };
}

async function checkLegacyReviewMigration(browser, chapter, expectedPhase) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${BASE_URL}/garden-league-simulator-v4.html`, { waitUntil: 'networkidle' });
  await page.evaluate(({ key, ch }) => {
    const state = window.gardenOS.getState();
    state.chapter = ch;
    state.phase = 'REVIEW';
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: SIM_KEY, ch: chapter });
  await page.reload({ waitUntil: 'networkidle' });

  const result = await page.evaluate(({ key }) => {
    const runtimePhase = window.gardenOS.getState()?.phase || null;
    const storedPhase = JSON.parse(localStorage.getItem(key) || 'null')?.phase || null;
    return { runtimePhase, storedPhase };
  }, { key: SIM_KEY });

  assert(result.runtimePhase === expectedPhase, `Runtime phase mismatch for chapter ${chapter}: expected ${expectedPhase}, got ${result.runtimePhase}`);
  assert(result.storedPhase === expectedPhase, `Stored phase mismatch for chapter ${chapter}: expected ${expectedPhase}, got ${result.storedPhase}`);

  await page.close();
  return result;
}

async function diagnoseGenericClientAutoFill() {
  const harnessBrowser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader']
  });
  try {
    const page = await harnessBrowser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript({ content: makeGenericClientShim() });
    await page.goto(`${BASE_URL}/garden-planner-v4.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const samples = [];
    for (let i = 0; i < 6; i += 1) {
      const sample = await page.evaluate(() => {
        const btn = document.getElementById('autoFillBtn');
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const top = document.elementFromPoint(cx, cy);
        return {
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          topId: top?.id || null,
          disabled: btn.disabled,
          hidden: btn.hidden
        };
      });
      samples.push(sample);
      await page.waitForTimeout(250);
    }

    const rectStable = samples.every((sample) =>
      JSON.stringify(sample.rect) === JSON.stringify(samples[0].rect)
    );
    const topAlwaysButton = samples.every((sample) => sample.topId === 'autoFillBtn');

    let shimClick = { clicked: false, error: null };
    try {
      await page.click('#autoFillBtn', { timeout: 5000 });
      shimClick.clicked = true;
    } catch (error) {
      shimClick.error = String(error);
    }

    await page.close();
    return {
      mode: 'generic-client-emulation',
      browserPath: 'bundled-chromium',
      reproducedTimeout: !shimClick.clicked,
      rectStable,
      topAlwaysButton,
      samples,
      shimClick,
      conclusion: !shimClick.clicked && rectStable && topAlwaysButton
        ? 'The timeout reproduces under the generic client timing/shim model in bundled Chromium; direct planner clicks under the repo smoke harness still work, so this is a harness issue rather than a planner regression.'
        : 'The generic client timeout did not reproduce under the bundled-browser emulation.'
    };
  } finally {
    await harnessBrowser.close();
  }
}

async function main() {
  ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({
    executablePath: fs.existsSync(BROWSER_PATH) ? BROWSER_PATH : undefined,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    const plannerFixtures = [];
    for (const fixture of PLANNER_FIXTURES) {
      plannerFixtures.push(await capturePlannerFixture(browser, fixture));
    }
    const plannerBroaderSmoke = await capturePlannerBroaderSmoke(browser);
    const genericClientDiagnosis = await diagnoseGenericClientAutoFill();

    const chapter3 = await checkLegacyReviewMigration(browser, 3, 'HARVEST_REVIEW');
    const chapter4 = await checkLegacyReviewMigration(browser, 4, 'WINTER_REVIEW');

    const output = {
      baseUrl: BASE_URL,
      browserPath: fs.existsSync(BROWSER_PATH) ? BROWSER_PATH : 'bundled-chromium',
      plannerFixtures,
      plannerBroaderSmoke,
      genericClientDiagnosis,
      chapter3,
      chapter4
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'phase-reasoning-results.json'),
      JSON.stringify(output, null, 2)
    );
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
