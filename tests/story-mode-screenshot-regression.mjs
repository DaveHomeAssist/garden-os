import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromiumLaunchOptions } from './playwright-launch-options.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const storyModeDir = join(repoRoot, 'story-mode');
const localPlaywrightPath = join(storyModeDir, 'node_modules', 'playwright', 'index.mjs');
const localVitePath = join(storyModeDir, 'node_modules', 'vite', 'dist', 'node', 'index.js');
const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : pathToFileURL(localPlaywrightPath).href;
const { chromium } = await import(playwrightSpecifier);

const outputDir = process.env.GOS_SCREENSHOT_OUTPUT_DIR
  || join(tmpdir(), `garden-os-story-screens-${Date.now()}`);
const timeoutMs = Number(process.env.GOS_SCREENSHOT_TIMEOUT_MS ?? 240000);
const hardTimeout = setTimeout(() => {
  console.error(`Story Mode screenshot regression timed out after ${timeoutMs}ms.`);
  process.exit(124);
}, timeoutMs);
hardTimeout.unref?.();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function getOpenPort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  await new Promise((resolveClose) => server.close(resolveClose));
  assert(address && typeof address !== 'string', 'Could not allocate a local Vite port.');
  return address.port;
}

async function startDevServer(port) {
  const { createServer: createViteServer } = await import(pathToFileURL(localVitePath).href);
  const vite = await createViteServer({
    root: storyModeDir,
    configFile: join(storyModeDir, 'vite.config.js'),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
  });
  await vite.listen();
  return {
    stop: () => vite.close(),
  };
}

async function waitForServer(url) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < 45000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function waitForCanvasPaint(page) {
  await page.waitForSelector('#viewport canvas', { timeout: 60000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#viewport canvas');
    if (!canvas || canvas.width < 10 || canvas.height < 10) return false;
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 64;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(canvas, 0, 0, probe.width, probe.height);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let lit = 0;
    let varied = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      if (r + g + b > 30) lit += 1;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 8) varied += 1;
    }
    return lit > 120 && varied > 40;
  }, null, { timeout: 60000 });
}

async function waitForReadableCanvas(page, { minAverage = 28, minLit = 220 } = {}) {
  await page.waitForFunction(({ minAverage: minAvg, minLit: litFloor }) => {
    const canvas = document.querySelector('#viewport canvas');
    if (!canvas || canvas.width < 10 || canvas.height < 10) return false;
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 64;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(canvas, 0, 0, probe.width, probe.height);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let lit = 0;
    let varied = 0;
    let total = 0;
    let samples = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const brightness = (r + g + b) / 3;
      total += brightness;
      samples += 1;
      if (brightness > 22) lit += 1;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 8) varied += 1;
    }
    return (total / Math.max(samples, 1)) >= minAvg && lit >= litFloor && varied > 60;
  }, { minAverage, minLit }, { timeout: 60000 });
}

async function readDialogueIdentity(page) {
  try {
    return await page.evaluate(() => {
      const panel = document.querySelector('.dp-panel.dp-panel--visible');
      const portrait = document.querySelector('.dp-portrait');
      const strip = document.querySelector('.dp-cast-strip');
      const tokens = [...document.querySelectorAll('.dp-cast-token')].map((token) => ({
        speaker: token.getAttribute('data-speaker'),
        portrait: token.getAttribute('data-portrait'),
        emotion: token.getAttribute('data-emotion'),
        active: token.getAttribute('data-active') === 'true',
      }));
      const active = tokens.filter((token) => token.active);
      const stripRect = strip?.getBoundingClientRect();
      return {
        visible: Boolean(panel),
        speaker: panel?.getAttribute('data-speaker') ?? '',
        portrait: portrait?.getAttribute('data-portrait') ?? '',
        portraitEmotion: portrait?.getAttribute('data-emotion') ?? '',
        portraitAssetState: portrait?.getAttribute('data-asset-state') ?? '',
        castCount: tokens.length,
        castSpeakers: tokens.map((token) => token.speaker),
        activeCount: active.length,
        activeSpeaker: active[0]?.speaker ?? '',
        activeEmotion: active[0]?.emotion ?? '',
        stripWidth: stripRect?.width ?? 0,
        stripBottom: stripRect?.bottom ?? 0,
        viewportHeight: window.innerHeight,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Execution context was destroyed|Cannot find context/.test(message)) {
      throw error;
    }
    return {
      visible: false,
      speaker: '',
      portrait: '',
      portraitEmotion: '',
      portraitAssetState: '',
      castCount: 0,
      castSpeakers: [],
      activeCount: 0,
      activeSpeaker: '',
      activeEmotion: '',
      stripWidth: 0,
      stripBottom: 0,
      viewportHeight: 0,
    };
  }
}

async function waitForCharacterDialogue(page) {
  const coreCast = new Set(['garden_gurl', 'onion_man', 'vegeman', 'critters']);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const identity = await readDialogueIdentity(page);
    if (identity.visible && coreCast.has(identity.activeSpeaker)) return identity;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  const identity = await readDialogueIdentity(page);
  throw new Error(`Timed out waiting for active cast portrait. Last identity: ${JSON.stringify(identity)}`);
}

async function assertDialogueIdentity(page) {
  const identity = await waitForCharacterDialogue(page);
  assert(identity.castCount === 4, `Expected 4 core cast tokens, got ${identity.castCount}.`);
  assert(
    ['garden_gurl', 'onion_man', 'vegeman', 'critters'].every((speaker) => identity.castSpeakers.includes(speaker)),
    `Core cast strip missing expected speakers: ${identity.castSpeakers.join(', ')}.`,
  );
  assert(identity.activeCount === 1, `Expected one active cast token, got ${identity.activeCount}.`);
  assert(identity.activeSpeaker === identity.speaker, `Active strip speaker ${identity.activeSpeaker} does not match panel speaker ${identity.speaker}.`);
  assert(identity.portrait === identity.activeSpeaker, `Portrait ${identity.portrait} does not match active speaker ${identity.activeSpeaker}.`);
  assert(identity.portraitEmotion === identity.activeEmotion, `Portrait emotion ${identity.portraitEmotion} does not match strip emotion ${identity.activeEmotion}.`);
  assert(['css-fallback', 'asset'].includes(identity.portraitAssetState), `Unexpected portrait asset state ${identity.portraitAssetState}.`);
  assert(identity.stripWidth > 40, `Cast strip width too small: ${identity.stripWidth}.`);
  assert(identity.stripBottom <= identity.viewportHeight + 2, 'Cast strip extends beyond the viewport.');
}

function makeCell(cropId = null) {
  return {
    cropId,
    protected: false,
    mulched: false,
    damageState: null,
    carryForwardType: null,
    eventModifier: 0,
    interventionBonus: 0,
    soilFatigue: 0,
    lastWateredAt: null,
  };
}

function makeSeededAccentSave() {
  const cropIds = [
    'lettuce',
    'spinach',
    'arugula',
    'radish',
    'basil',
    'marigold',
    'lettuce',
    'spinach',
  ];
  const cells = Array.from({ length: 32 }, (_, index) => makeCell(cropIds[index] ?? null));
  const timestamp = '2026-07-03T12:00:00.000Z';
  return {
    campaign: {
      version: 8,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentChapter: 1,
      currentSeason: 'spring',
      cropsUnlocked: ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'],
      worldState: {
        currentZone: 'player_plot',
        visitedZones: ['player_plot'],
        lastSpawnPoint: null,
        forageState: { cooldowns: {}, history: {} },
      },
      gameMode: 'story',
    },
    season: {
      chapter: 1,
      season: 'spring',
      month: 1,
      phase: 'MID_SEASON',
      beatIndex: 1,
      gridCols: 8,
      gridRows: 4,
      grid: { cells, cols: 8, rows: 4 },
      interventionTokens: 3,
      eventsDrawn: [],
      eventTitles: [],
      eventActive: null,
      interventionChosen: null,
      harvestResult: null,
      winterReviewSeen: true,
    },
  };
}

function makeSeasonalPlaceSave(season) {
  const timestamp = '2026-07-03T12:00:00.000Z';
  const cells = Array.from({ length: 32 }, () => makeCell(null));
  const phase = {
    spring: 'EARLY_SEASON',
    summer: 'MID_SEASON',
    fall: 'MID_SEASON',
    winter: 'MID_SEASON',
  }[season] ?? 'EARLY_SEASON';
  return {
    campaign: {
      version: 8,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentChapter: 2,
      currentSeason: season,
      cropsUnlocked: ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'],
      worldState: {
        currentZone: 'player_plot',
        visitedZones: ['player_plot'],
        lastSpawnPoint: null,
        forageState: { cooldowns: {}, history: {} },
      },
      gameMode: 'story',
    },
    season: {
      chapter: 2,
      season,
      month: { spring: 3, summer: 7, fall: 10, winter: 1 }[season] ?? 3,
      phase,
      beatIndex: phase === 'EARLY_SEASON' ? 0 : 1,
      gridCols: 8,
      gridRows: 4,
      grid: { cells, cols: 8, rows: 4 },
      interventionTokens: 3,
      eventsDrawn: [],
      eventTitles: [],
      eventActive: null,
      interventionChosen: null,
      harvestResult: null,
      winterReviewSeen: true,
    },
  };
}

function makeCritterEventSave() {
  const timestamp = '2026-07-03T12:00:00.000Z';
  const cells = Array.from({ length: 32 }, () => makeCell(null));
  const eventActive = {
    id: 'critter-alley-cat-patrol',
    title: 'Alley Cat Patrol',
    category: 'critter',
    valence: 'neutral',
    description: 'The alley cat threads the fence line and tests the edge of the bed.',
    mechanicalEffect: {
      modifier: -0.2,
      target: { type: 'random_cells', maxCells: 2, filter: 'planted' },
      duration: 'current_beat',
    },
  };
  return {
    campaign: {
      version: 8,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentChapter: 2,
      currentSeason: 'summer',
      cropsUnlocked: ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'],
      seenCutsceneIds: ['ch2-intro'],
      worldState: {
        currentZone: 'player_plot',
        visitedZones: ['player_plot'],
        lastSpawnPoint: null,
        forageState: { cooldowns: {}, history: {} },
      },
      gameMode: 'story',
    },
    season: {
      chapter: 2,
      season: 'summer',
      month: 7,
      phase: 'MID_SEASON',
      beatIndex: 1,
      gridCols: 8,
      gridRows: 4,
      grid: { cells, cols: 8, rows: 4 },
      interventionTokens: 3,
      eventsDrawn: [eventActive.id],
      eventTitles: [eventActive.title],
      eventActive,
      interventionChosen: 'observe',
      harvestResult: null,
      winterReviewSeen: true,
    },
  };
}

function makeBirdCritterEventSave() {
  const timestamp = '2026-07-03T12:00:00.000Z';
  const cells = Array.from({ length: 32 }, () => makeCell(null));
  const eventActive = {
    id: 'critter-fence-sparrow-watch',
    title: 'Fence Sparrow Watch',
    category: 'critter',
    valence: 'neutral',
    description: 'A sparrow posts up on the trellis and keeps watch over the July bed.',
    mechanicalEffect: {
      modifier: 0.1,
      target: { type: 'all_cells', filter: 'planted' },
      duration: 'current_beat',
    },
  };
  return {
    campaign: {
      version: 8,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentChapter: 2,
      currentSeason: 'summer',
      cropsUnlocked: ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'],
      seenCutsceneIds: ['ch2-intro'],
      worldState: {
        currentZone: 'player_plot',
        visitedZones: ['player_plot'],
        lastSpawnPoint: null,
        forageState: { cooldowns: {}, history: {} },
      },
      gameMode: 'story',
    },
    season: {
      chapter: 2,
      season: 'summer',
      month: 7,
      phase: 'MID_SEASON',
      beatIndex: 1,
      gridCols: 8,
      gridRows: 4,
      grid: { cells, cols: 8, rows: 4 },
      interventionTokens: 3,
      eventsDrawn: [eventActive.id],
      eventTitles: [eventActive.title],
      eventActive,
      interventionChosen: 'observe',
      harvestResult: null,
      winterReviewSeen: true,
    },
  };
}

function makeHarvestRewardResult() {
  const factors = {
    sunFit: 4.7,
    supportFit: 4.1,
    shadeFit: 4.4,
    accessFit: 4.8,
    seasonFit: 5,
    adjacency: 1.2,
  };
  const cropIds = ['cherry_tom', 'basil', 'pepper', 'onion', 'carrot', 'lettuce', 'radish', 'chives'];
  return {
    score: 92,
    grade: 'A+',
    occupiedCount: cropIds.length,
    yieldList: cropIds,
    recipeMatches: ['moms_sauce', 'garden_salad'],
    details: {
      cellAvg: 8.9,
      fillRatio: cropIds.length / 32,
      fillPenalty: 0.75,
      diversityBonus: 0.7,
      recipeBonus: 0.4,
      tallPenalty: 0,
      trellisPenalty: 0,
      uniqueCrops: cropIds.length,
    },
    cellScores: cropIds.map((cropId, cellIndex) => ({
      cellIndex,
      cropId,
      total: 8.9,
      factors,
    })),
  };
}

async function readVisualDebug(page) {
  return page.evaluate(() => window.gardenOS?.getVisualDebug?.() ?? null);
}

async function seedAndStartAccentRun(page, baseUrl) {
  const seed = makeSeededAccentSave();
  await page.addInitScript((save) => {
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(save.campaign));
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify(save.season));
  }, seed);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await page.waitForFunction(() => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.cropAccents?.spriteAssetsReady && debug.cropAccents.count >= 8;
  }, null, { timeout: 60000 });
}

async function seedAndStartSeasonalPlaceRun(page, baseUrl, season) {
  const seed = makeSeasonalPlaceSave(season);
  await page.addInitScript((save) => {
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(save.campaign));
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify(save.season));
  }, seed);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await page.waitForFunction((expectedSeason) => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.seasonalAtmosphere?.season === expectedSeason;
  }, season, { timeout: 60000 });
  await captureDialogueThenDismiss(page);
  await waitForCanvasPaint(page);
  if (season === 'summer') {
    await waitForReadableCanvas(page);
  }
  await page.waitForTimeout(500);
}

async function seedAndStartCritterRun(page, baseUrl) {
  const seed = makeCritterEventSave();
  await page.addInitScript((save) => {
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(save.campaign));
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify(save.season));
  }, seed);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await captureDialogueThenDismiss(page);
  await page.waitForFunction(() => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.creatureCompanions?.companions?.alleyCat?.visible === true;
  }, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await page.waitForTimeout(250);
}

async function seedAndStartBirdCritterRun(page, baseUrl) {
  const seed = makeBirdCritterEventSave();
  await page.addInitScript((save) => {
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(save.campaign));
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify(save.season));
  }, seed);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await captureDialogueThenDismiss(page);
  await page.waitForFunction(() => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.creatureCompanions?.companions?.trellisBird?.eventPinned === true
      && debug.creatureCompanions.companions.trellisBird.visible === true;
  }, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await page.waitForTimeout(250);
}

async function assertCropAccentLayer(page) {
  const debug = await readVisualDebug(page);
  assert(debug, 'Expected visual debug state.');
  assert(debug.cropMeshCount >= 8, `Expected procedural crop meshes, got ${debug.cropMeshCount}.`);
  assert(debug.cropAccents.spriteAssetsReady, 'Expected crop sprite assets to be ready.');
  assert(debug.cropAccents.lastSync.phase === 'MID_SEASON', `Expected MID_SEASON accent sync, got ${debug.cropAccents.lastSync.phase}.`);
  assert(debug.cropAccents.lastSync.stage === 2, `Expected growing stage index 2, got ${debug.cropAccents.lastSync.stage}.`);
  assert(!debug.cropAccents.lastSync.suppressedByPlanner, 'Story crop accents should not be planner-suppressed.');
  assert(debug.cropAccents.count >= 8, `Expected at least 8 crop accents, got ${debug.cropAccents.count}.`);
  assert(
    debug.cropAccents.accents.every((accent) => accent.accentType === 'growth-billboard' && accent.opacity > 0.3 && accent.scale >= 0.3),
    `Unexpected crop accent tuning: ${JSON.stringify(debug.cropAccents.accents.slice(0, 3))}`,
  );
}

async function assertCritterCompanionLayer(page) {
  const debug = await readVisualDebug(page);
  assert(debug, 'Expected visual debug state.');
  const critters = debug.creatureCompanions;
  assert(critters?.activeEvent?.category === 'critter', `Expected critter active event, got ${critters?.activeEvent?.category}.`);
  assert(critters.activeEvent.title === 'Alley Cat Patrol', `Expected alley cat event title, got ${critters.activeEvent.title}.`);
  assert(critters.companions.alleyCat.visible, 'Expected alley cat companion to be visible.');
  assert(critters.companions.alleyCat.count >= 6, `Expected detailed alley cat mesh, got ${critters.companions.alleyCat.count} parts.`);
  assert(critters.visibleCompanionNames.includes('alleyCat'), `Expected alleyCat in visible companions, got ${critters.visibleCompanionNames.join(', ')}.`);
  assert(!critters.companions.neighborGift.visible, 'Neighbor gift should not show for a critter event.');
}

async function assertBirdCritterCompanionLayer(page) {
  const debug = await readVisualDebug(page);
  assert(debug, 'Expected visual debug state.');
  const critters = debug.creatureCompanions;
  assert(critters?.activeEvent?.category === 'critter', `Expected critter active event, got ${critters?.activeEvent?.category}.`);
  assert(critters.activeEvent.title === 'Fence Sparrow Watch', `Expected sparrow event title, got ${critters.activeEvent.title}.`);
  assert(critters.companions.trellisBird.visible, 'Expected trellis bird companion to be visible.');
  assert(critters.companions.trellisBird.eventPinned, 'Expected trellis bird to be pinned by active critter event.');
  assert(critters.companions.trellisBird.count >= 6, `Expected detailed trellis bird mesh, got ${critters.companions.trellisBird.count} parts.`);
  assert(critters.visibleCompanionNames.includes('trellisBird'), `Expected trellisBird in visible companions, got ${critters.visibleCompanionNames.join(', ')}.`);
  assert(!critters.companions.alleyCat.visible, 'Alley cat should not show for a sparrow event.');
}

function assertLayerVisible(debug, layerName) {
  const layer = debug.seasonalAtmosphere.layers[layerName];
  assert(layer, `Missing seasonal layer ${layerName}.`);
  assert(layer.visible, `Expected ${layerName} to be visible.`);
  assert(layer.count > 0, `Expected ${layerName} to have visible objects.`);
}

async function assertSeasonalPlaceLayer(page, season) {
  const debug = await readVisualDebug(page);
  assert(debug, 'Expected visual debug state.');
  assert(debug.seasonalAtmosphere?.season === season, `Expected ${season} atmosphere, got ${debug.seasonalAtmosphere?.season}.`);
  assert(debug.seasonalAtmosphere.placeCueCount >= 7, `Expected at least 7 Philly place cues, got ${debug.seasonalAtmosphere.placeCueCount}.`);
  ['back-alley-strip', 'concrete-walkway', 'overhead-utility-pole', 'phillies-pennant', 'porch-screen-door', 'rain-barrel', 'rowhouse-siding'].forEach((cue) => {
    assert(debug.seasonalAtmosphere.placeCues.includes(cue), `Missing Philly place cue ${cue}.`);
  });

  const expectations = {
    spring: ['springPuddles', 'scenerySpringFlowers', 'sceneryPuddles'],
    summer: ['summerButterflies', 'summerStringLights', 'sceneryFireflies', 'scenerySummerGrit', 'sceneryHeatHaze'],
    fall: ['fallLeaves', 'sceneryFallLeaves'],
    winter: ['winterSnow', 'sceneryWinterSnow', 'sceneryWinterSmoke'],
  }[season] ?? [];
  expectations.forEach((layerName) => assertLayerVisible(debug, layerName));

  if (season === 'summer') {
    const lighting = debug.seasonalAtmosphere.lighting;
    assert(lighting.sunColor === '#e8c84a', `Expected July sun token #e8c84a, got ${lighting.sunColor}.`);
    assert(lighting.sunIntensity >= 1.9, `Expected stronger July sun intensity, got ${lighting.sunIntensity}.`);
    assert(lighting.ambientIntensity >= 0.16, `Expected soft July ambient light, got ${lighting.ambientIntensity}.`);
    ['philly-party-wall-brick', 'july-weed-cracks', 'philly-alley-utility-tag', 'alley-oil-stain', 'blue-milk-crate-alley'].forEach((cue) => {
      assert(debug.seasonalAtmosphere.placeCues.includes(cue), `Missing July Philly place cue ${cue}.`);
    });
  }

  if (season !== 'fall') {
    assert(!debug.seasonalAtmosphere.layers.fallLeaves.visible, `${season} should not show main fall leaves.`);
  }
  if (season !== 'winter') {
    assert(!debug.seasonalAtmosphere.layers.winterSnow.visible, `${season} should not show winter snow.`);
  }
  if (season !== 'summer') {
    assert(!debug.seasonalAtmosphere.layers.summerButterflies.visible, `${season} should not show summer butterflies.`);
  }
}

async function openHarvestRewardOverlay(page) {
  const harvestResult = makeHarvestRewardResult();
  await page.evaluate((result) => {
    window.gardenOS.showHarvestRevealDebug(
      result,
      {
        recipeRewards: [
          {
            id: 'moms_sauce',
            name: "Mom's Sauce",
            crops: [
              { id: 'cherry_tom', name: 'Cherry Tomato', short: 'CTOM' },
              { id: 'basil', name: 'Basil', short: 'BAS' },
              { id: 'pepper', name: 'Pepper', short: 'PEP' },
              { id: 'onion', name: 'Onion', short: 'ONI' },
              { id: 'carrot', name: 'Carrot', short: 'CAR' },
            ],
          },
          {
            id: 'garden_salad',
            name: 'Garden Salad',
            crops: [
              { id: 'lettuce', name: 'Leaf Lettuce', short: 'LET' },
              { id: 'radish', name: 'Radish', short: 'RAD' },
              { id: 'carrot', name: 'Carrot', short: 'CAR' },
              { id: 'chives', name: 'Chives', short: 'CHIV' },
            ],
          },
        ],
        keepsakes: [
          { id: 'block_party_plate', name: 'Block Party Plate', shortLabel: 'Plate' },
          { id: 'handwritten_sauce_card', name: 'Handwritten Sauce Card', shortLabel: 'Sauce' },
        ],
        unlockedCount: 5,
        totalKeepsakes: 7,
        onViewBackpack: () => {},
      },
    );
  }, harvestResult);
  await page.waitForSelector('.harvest-reveal__recipe-card[data-recipe-id="moms_sauce"]', { timeout: 60000 });
  await page.waitForSelector('.harvest-reveal__keepsake[data-keepsake-id="block_party_plate"]', { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#score-counter')?.textContent === '92', null, { timeout: 60000 });
  await page.waitForSelector('#grade-badge.is-visible', { timeout: 60000 });
}

async function assertHarvestRewardOverlay(page) {
  const state = await page.evaluate(() => {
    const sheet = document.querySelector('.harvest-reveal__sheet');
    const rect = sheet?.getBoundingClientRect();
    return {
      grade: sheet?.getAttribute('data-grade'),
      recipeCount: Number(sheet?.getAttribute('data-recipe-count') ?? 0),
      keepsakeCount: Number(sheet?.getAttribute('data-keepsake-count') ?? 0),
      recipeIds: [...document.querySelectorAll('.harvest-reveal__recipe-card')].map((card) => card.getAttribute('data-recipe-id')),
      ingredientIds: [...document.querySelectorAll('.harvest-reveal__ingredient[data-crop-id]')].map((chip) => chip.getAttribute('data-crop-id')),
      keepsakeIds: [...document.querySelectorAll('.harvest-reveal__keepsake')].map((card) => card.getAttribute('data-keepsake-id')),
      rewardBurstVisible: Boolean(document.querySelector('[data-reward-burst="true"]')),
      rewardFleckCount: document.querySelectorAll('[data-reward-fleck]').length,
      rewardCardTypes: [...document.querySelectorAll('[data-reward-card]')].map((card) => card.getAttribute('data-reward-card')),
      scoreText: document.querySelector('#score-counter')?.textContent,
      gradeVisible: document.querySelector('#grade-badge')?.classList.contains('is-visible') ?? false,
      backpackButtonVisible: Boolean(document.querySelector('#harvest-backpack')),
      sheetWidth: rect?.width ?? 0,
      sheetRight: rect?.right ?? 0,
      viewportWidth: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  assert(state.grade === 'A+', `Expected A+ reward overlay, got ${state.grade}.`);
  assert(state.scoreText === '92', `Expected score 92, got ${state.scoreText}.`);
  assert(state.gradeVisible, 'Expected grade badge to settle visible.');
  assert(state.recipeCount === 2, `Expected 2 recipe rewards, got ${state.recipeCount}.`);
  assert(state.keepsakeCount === 2, `Expected 2 keepsake rewards, got ${state.keepsakeCount}.`);
  ['moms_sauce', 'garden_salad'].forEach((recipeId) => {
    assert(state.recipeIds.includes(recipeId), `Missing recipe reward ${recipeId}.`);
  });
  ['cherry_tom', 'basil', 'pepper', 'onion', 'carrot', 'lettuce', 'radish', 'chives'].forEach((cropId) => {
    assert(state.ingredientIds.includes(cropId), `Missing ingredient chip ${cropId}.`);
  });
  ['block_party_plate', 'handwritten_sauce_card'].forEach((keepsakeId) => {
    assert(state.keepsakeIds.includes(keepsakeId), `Missing keepsake card ${keepsakeId}.`);
  });
  assert(state.rewardBurstVisible, 'Expected reward burst layer when recipes or keepsakes unlock.');
  assert(state.rewardFleckCount >= 18, `Expected reward flecks, got ${state.rewardFleckCount}.`);
  assert(state.rewardCardTypes.filter((type) => type === 'recipe').length === 2, `Expected 2 recipe reward cards, got ${state.rewardCardTypes.join(', ')}.`);
  assert(state.rewardCardTypes.filter((type) => type === 'keepsake').length === 2, `Expected 2 keepsake reward cards, got ${state.rewardCardTypes.join(', ')}.`);
  assert(state.backpackButtonVisible, 'Reward overlay should offer backpack when rewards exist.');
  assert(state.sheetWidth > 0 && state.sheetRight <= state.viewportWidth + 2, 'Reward overlay extends beyond viewport width.');
  assert(!state.overflowX, 'Reward overlay creates horizontal overflow.');
}

async function scrollHarvestRewardOverlayToRewards(page) {
  await page.evaluate(() => {
    const body = document.querySelector('.harvest-reveal__body');
    const recipePanel = document.querySelector('.harvest-reveal__panel--recipes');
    if (!body || !recipePanel) return;
    const bodyRect = body.getBoundingClientRect();
    const panelRect = recipePanel.getBoundingClientRect();
    body.scrollTop += panelRect.top - bodyRect.top - 12;
  });
  await page.waitForTimeout(150);
}

async function startPlannerAndPlant(page, baseUrl) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-mode="planner"]').click();
  await page.locator('.planner-start-btn').click();
  await page.waitForSelector('[data-planner-crop-palette] [data-crop-id="lettuce"]', { timeout: 60000 });
  await waitForCanvasPaint(page);
  await page.locator('[data-planner-crop-palette] [data-crop-id="lettuce"]').click();
  const canvas = page.locator('#viewport canvas');
  const box = await canvas.boundingBox();
  assert(box, 'Expected planner canvas bounds.');
  const targetCell = await page.waitForFunction(() => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.gridCells?.find((cell) => (
      cell.visible
      && cell.screenX > 80
      && cell.screenY > 80
      && cell.screenX < window.innerWidth - 80
      && cell.screenY < window.innerHeight - 120
    )) ?? null;
  }, null, { timeout: 60000 });
  const cell = await targetCell.jsonValue();
  assert(cell, 'Expected projected planner cell target.');
  await page.mouse.click(box.x + cell.screenX, box.y + cell.screenY);
  await page.waitForFunction(() => {
    const debug = window.gardenOS?.getVisualDebug?.();
    return debug?.cropMeshCount >= 1;
  }, null, { timeout: 60000 });
}

async function assertPlannerSuppressesAccents(page) {
  const debug = await readVisualDebug(page);
  assert(debug, 'Expected planner visual debug state.');
  assert(debug.sceneStyle === 'planner', `Expected planner scene style, got ${debug.sceneStyle}.`);
  assert(debug.cropMeshCount >= 1, `Expected Planner procedural crop mesh, got ${debug.cropMeshCount}.`);
  assert(debug.cropAccents.count === 0, `Planner should not show sprite accents, got ${debug.cropAccents.count}.`);
  assert(debug.cropAccents.lastSync.suppressedByPlanner, 'Planner crop accents should be explicitly suppressed.');
}

async function captureDialogueThenDismiss(page, screenshotName) {
  const panel = page.locator('.dp-panel.dp-panel--visible').first();
  const visible = await panel.isVisible().catch(() => false);
  if (!visible) return;

  if (screenshotName) {
    await assertDialogueIdentity(page);
    await page.screenshot({ path: join(outputDir, screenshotName), fullPage: true });
  }
  const skip = page.locator('#dp-skip-btn');
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ force: true });
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForFunction(() => !document.querySelector('.dp-panel')?.classList.contains('dp-panel--visible'), null, {
    timeout: 20000,
  });
}

async function seedAndStart(page, baseUrl, options = {}) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  if (options.captureTitle) {
    await page.screenshot({ path: join(outputDir, 'desktop-title.png'), fullPage: true });
  }
  await page.locator('[data-action="new"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForCanvasPaint(page);
  await captureDialogueThenDismiss(page, options.dialogueScreenshot);
}

async function openSyntheticEventCard(page) {
  await page.evaluate(() => {
    const container = document.getElementById('panel-container');
    document.querySelectorAll('.tool-hud, #fab-plant, #fab-backpack, #fab-advance').forEach((element) => {
      element.style.setProperty('display', 'none', 'important');
    });
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open event-card-sheet';
    sheet.id = 'event-card-panel';
    sheet.dataset.valence = 'negative';
    sheet.dataset.category = 'weather';
    sheet.style.borderTop = '3px solid #d44a2a';
    sheet.style.setProperty('--event-accent', '#d44a2a');
    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="event-card__header">
        <div>
          <div class="event-card__eyebrow">
            <span class="event-card__category">Weather</span>
            <span>Season Event</span>
          </div>
          <div class="event-card__title">Late Frost Advisory</div>
        </div>
        <span class="event-card__valence">−</span>
      </div>
      <p class="event-card__body">
        Cold air pools near the bed overnight. Protect the tender cells before morning.
      </p>
      <div class="event-card__effect">
        <div class="event-card__effect-label">Effect</div>
        -1 · this beat
      </div>
      <div class="event-card__response">Response · 2 tokens left</div>
      <div class="targeting-hint" style="margin-bottom:10px;">
        Choose an intervention type first. If it targets the bed, you will pick the exact cell next.
      </div>
      <div class="intervention-grid" id="intervention-grid">
        <button data-intervention="protect" class="intervention-btn" aria-label="Protect: Shield one cell from this event">
          <div class="event-card__intervention-icon">🛡️</div>
          <div class="event-card__intervention-title">Protect</div>
          <div class="event-card__intervention-copy">Shield one cell from this event</div>
        </button>
        <button data-intervention="mulch" class="intervention-btn" aria-label="Mulch: +0.5 now, +0.25 next season">
          <div class="event-card__intervention-icon">🍂</div>
          <div class="event-card__intervention-title">Mulch</div>
          <div class="event-card__intervention-copy">+0.5 now, +0.25 next season</div>
        </button>
        <button data-intervention="accept_loss" class="intervention-btn" aria-label="Accept: Take the hit, save your token">
          <div class="event-card__intervention-icon">🤷</div>
          <div class="event-card__intervention-title">Accept</div>
          <div class="event-card__intervention-copy">Take the hit, save your token</div>
        </button>
      </div>
    `;
    container.innerHTML = '';
    container.appendChild(sheet);
  });
  await page.waitForSelector('.event-card-sheet[data-category="weather"]', { state: 'visible', timeout: 15000 });
}

async function assertLayout(page) {
  const result = await page.evaluate(() => {
    const helper = document.querySelector('#phase-helper');
    const hud = document.querySelector('#hud');
    const card = document.querySelector('.event-card-sheet');
    return {
      zone: document.body.dataset.zone,
      season: document.body.dataset.season,
      helperZone: helper?.getAttribute('data-zone'),
      helperLabel: helper?.getAttribute('data-zone-label'),
      hudHeight: hud?.getBoundingClientRect().height ?? 0,
      cardBottom: card?.getBoundingClientRect().bottom ?? 0,
      viewportHeight: window.innerHeight,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  assert(result.zone === 'player_plot', `Expected player plot zone, got ${result.zone}.`);
  assert(result.season === 'spring', `Expected spring season, got ${result.season}.`);
  assert(result.helperZone === 'player_plot', `Expected helper zone data, got ${result.helperZone}.`);
  assert(result.helperLabel === 'Your Garden', `Expected helper label, got ${result.helperLabel}.`);
  assert(result.hudHeight > 0 && result.hudHeight < 150, `HUD height out of range: ${result.hudHeight}.`);
  assert(result.cardBottom <= result.viewportHeight + 2, 'Event card extends beyond the viewport.');
  assert(!result.overflowX, 'Page has horizontal overflow.');
}

const suppliedBaseUrl = process.env.GOS_SCREENSHOT_BASE_URL;
const port = suppliedBaseUrl ? null : await getOpenPort();
const baseUrl = suppliedBaseUrl ? new URL(suppliedBaseUrl).href : `http://127.0.0.1:${port}/`;
const server = suppliedBaseUrl ? { stop: async () => {} } : await startDevServer(port);
const browser = await chromium.launch(chromiumLaunchOptions({ headless: process.env.HEADLESS !== '0' }));

try {
  await mkdir(outputDir, { recursive: true });
  await waitForServer(baseUrl);

  const desktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await seedAndStart(desktop, baseUrl, {
    captureTitle: true,
    dialogueScreenshot: 'desktop-dialogue.png',
  });
  await openSyntheticEventCard(desktop);
  await assertLayout(desktop);
  await desktop.screenshot({ path: join(outputDir, 'desktop-play-event.png'), fullPage: true });
  await desktop.close();

  const accentDesktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await seedAndStartAccentRun(accentDesktop, baseUrl);
  await assertCropAccentLayer(accentDesktop);
  await accentDesktop.screenshot({ path: join(outputDir, 'desktop-crop-accents.png'), fullPage: true });
  await accentDesktop.close();

  const seasonalScreenshots = [];
  for (const season of ['spring', 'summer', 'fall', 'winter']) {
    const seasonalPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await seedAndStartSeasonalPlaceRun(seasonalPage, baseUrl, season);
    await assertSeasonalPlaceLayer(seasonalPage, season);
    const screenshotName = `season-place-${season}.png`;
    await seasonalPage.screenshot({ path: join(outputDir, screenshotName), fullPage: true });
    seasonalScreenshots.push(screenshotName);
    if (season === 'summer') {
      await seasonalPage.screenshot({ path: join(outputDir, 'season-place-july.png'), fullPage: true });
      seasonalScreenshots.push('season-place-july.png');
    }
    await seasonalPage.close();
  }

  const critterPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await seedAndStartCritterRun(critterPage, baseUrl);
  await assertCritterCompanionLayer(critterPage);
  await critterPage.screenshot({ path: join(outputDir, 'critter-alley-cat.png'), fullPage: true });
  await critterPage.close();

  const birdCritterPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await seedAndStartBirdCritterRun(birdCritterPage, baseUrl);
  await assertBirdCritterCompanionLayer(birdCritterPage);
  await birdCritterPage.screenshot({ path: join(outputDir, 'critter-bird.png'), fullPage: true });
  await birdCritterPage.close();

  const rewardDesktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await seedAndStart(rewardDesktop, baseUrl);
  await openHarvestRewardOverlay(rewardDesktop);
  await assertHarvestRewardOverlay(rewardDesktop);
  await scrollHarvestRewardOverlayToRewards(rewardDesktop);
  await rewardDesktop.screenshot({ path: join(outputDir, 'harvest-reward-desktop.png'), fullPage: true });
  await rewardDesktop.close();

  const rewardMobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await seedAndStart(rewardMobile, baseUrl);
  await openHarvestRewardOverlay(rewardMobile);
  await assertHarvestRewardOverlay(rewardMobile);
  await scrollHarvestRewardOverlayToRewards(rewardMobile);
  await rewardMobile.screenshot({ path: join(outputDir, 'harvest-reward-mobile.png'), fullPage: true });
  await rewardMobile.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await seedAndStart(mobile, baseUrl, {
    dialogueScreenshot: 'mobile-dialogue.png',
  });
  await openSyntheticEventCard(mobile);
  await assertLayout(mobile);
  await mobile.screenshot({ path: join(outputDir, 'mobile-play-event.png'), fullPage: true });
  await mobile.close();

  const planner = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await startPlannerAndPlant(planner, baseUrl);
  await assertPlannerSuppressesAccents(planner);
  await planner.screenshot({ path: join(outputDir, 'planner-procedural-no-accents.png'), fullPage: true });
  await planner.close();

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    outputDir,
    screenshots: [
      'desktop-title.png',
      'desktop-dialogue.png',
      'desktop-play-event.png',
      'desktop-crop-accents.png',
      ...seasonalScreenshots,
      'critter-alley-cat.png',
      'critter-bird.png',
      'harvest-reward-desktop.png',
      'harvest-reward-mobile.png',
      'mobile-dialogue.png',
      'mobile-play-event.png',
      'planner-procedural-no-accents.png',
    ],
  }, null, 2));
} finally {
  clearTimeout(hardTimeout);
  await browser.close();
  await server.stop();
}
