import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromiumLaunchOptions } from './playwright-launch-options.mjs';

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : 'playwright';
const { chromium } = await import(playwrightSpecifier);

const LIVE_URL = process.env.LIVE_URL || 'https://davehomeassist.github.io/garden-os/story-mode/';
const outputDir = process.env.SMOKE_OUTPUT_DIR || join(tmpdir(), 'garden-os-live-smoke');

// Test fixture only: a sandbox campaign with every gate pre-opened so the
// smoke run can walk all zones in one pass. Pre-completing gus_river_path here
// opens Riverside for zone-travel coverage; it says nothing about whether the
// quest is reachable in play. Quest reachability is covered by
// story-mode/src/test/quest-reachability-*.test.js, which starts from a fresh
// campaign and completes every quest through player actions.
function seededCampaign() {
  return {
    version: 8,
    sandbox: true,
    currentChapter: 99,
    currentSeason: 'spring',
    updatedAt: new Date().toISOString(),
    questLog: {
      gus_river_path: { state: 'COMPLETED' }, // fixture: unlocks Riverside for travel coverage
    },
    choiceLog: {},
    storyLog: [],
    reputation: {
      old_gus: 100,
      maya: 100,
      lila: 100,
    },
    zoneReputation: {},
    activeFestival: { id: 'smoke_festival' },
    skills: {
      gardening: { level: 10, xp: 5200 },
      soil_science: { level: 10, xp: 5200 },
      crafting: { level: 10, xp: 5200 },
      foraging: { level: 10, xp: 5200 },
      tool_use: { level: 10, xp: 5200 },
      social: { level: 10, xp: 5200 },
    },
    worldState: {
      currentZone: 'player_plot',
      visitedZones: ['player_plot'],
      lastSpawnPoint: null,
      forageState: {
        cooldowns: {},
        history: {},
      },
    },
    currency: { balance: 100, ledger: [] },
    market: { seed: 'garden-os-market', priceHistory: [], transactions: [] },
    contentPacks: { loaded: [], rejected: [] },
    contentProvenance: [],
    // Fixture: a second bed parked with a crop in it, so the smoke can prove
    // beds persist independently across zone travel and reload.
    beds: {
      bed_2: {
        id: 'bed_2',
        name: 'Smoke Bed',
        zone: 'player_plot',
        grid: Array.from({ length: 32 }, (_, index) => ({
          cropId: index === 5 ? 'lettuce' : null,
          protected: false,
          mulched: false,
          damageState: null,
          carryForwardType: null,
          eventModifier: 0,
          interventionBonus: 0,
          soilFatigue: 0,
          lastWateredAt: null,
        })),
        gridCols: 8,
        gridRows: 4,
        harvestResult: null,
        soilHealth: null,
        previousGrid: null,
        history: [],
      },
    },
    activeBedId: 'player_plot',
    biomeCropsUnlocked: [],
    gameMode: 'sandbox',
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForRenderedZone(page, zoneId, label = 'zone render') {
  try {
    await page.waitForFunction(
      (nextZoneId) => {
        const renderer = window.gardenOS?.render_game_to_text;
        if (!renderer) return false;
        return JSON.parse(renderer()).currentZone === nextZoneId;
      },
      zoneId,
      { timeout: 60000 },
    );
  } catch (error) {
    const current = await page.evaluate(() => {
      const renderer = window.gardenOS?.render_game_to_text;
      if (!renderer) return { currentZone: 'unavailable' };
      return JSON.parse(renderer());
    }).catch(() => ({ currentZone: 'unavailable' }));
    throw new Error(`${label}: expected ${zoneId}, got ${current.currentZone}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function snapshot(page) {
  return JSON.parse(await page.evaluate(() => window.gardenOS.render_game_to_text()));
}

async function waitForWorldMapClosed(page) {
  await page.locator('#world-map-panel').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
}

async function readSavedCampaign(page) {
  return page.evaluate(async () => {
    async function readAuthorityCampaign() {
      const sessionId = localStorage.getItem('gos-story-authority-session-0');
      if (!sessionId || !indexedDB?.open) return null;
      if (typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases();
        if (!databases.some((database) => database.name === 'gos-story-authority-v1')) {
          return null;
        }
      }

      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('gos-story-authority-v1', 1);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
        request.onsuccess = () => resolve(request.result);
      });

      try {
        if (!db.objectStoreNames.contains('snapshots')) return null;
        return await new Promise((resolve, reject) => {
          const request = db.transaction('snapshots').objectStore('snapshots').get(sessionId);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
          request.onsuccess = () => resolve(request.result?.state?.campaign ?? null);
        });
      } finally {
        db.close?.();
      }
    }

    const authorityCampaign = await readAuthorityCampaign().catch(() => null);
    if (authorityCampaign) return authorityCampaign;

    return JSON.parse(localStorage.getItem('gos-story-slot-0-campaign') ?? '{}');
  });
}

async function waitForSavedCampaign(page, predicate, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const campaign = await readSavedCampaign(page).catch(() => null);
    if (campaign && predicate(campaign)) return campaign;
    await page.waitForTimeout(250);
  }
  return null;
}

async function travel(page, zoneId) {
  await waitForWorldMapClosed(page);
  await page.keyboard.press('m');
  await page.locator('#world-map-panel').waitFor({ state: 'visible', timeout: 15000 });
  const zoneButton = page.locator(`#world-map-panel [data-zone-id="${zoneId}"]`);
  await zoneButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction((targetZoneId) => {
    const button = document.querySelector(`#world-map-panel [data-zone-id="${targetZoneId}"]`);
    return button && !button.disabled;
  }, zoneId, { timeout: 15000 });
  await zoneButton.click({ force: true });
  await page.waitForTimeout(350);
  await waitForWorldMapClosed(page);
  await waitForRenderedZone(page, zoneId, `travel to ${zoneId}`);
  await page.waitForTimeout(700);
}

async function activateForage(page, spotId) {
  const result = await page.evaluate((targetSpotId) => {
    const activate = window.gardenOS?.activateForageForSmoke;
    if (typeof activate !== 'function') {
      return { success: false, message: 'Forage smoke helper unavailable.' };
    }
    return activate(targetSpotId);
  }, spotId);
  const saved = await waitForSavedCampaign(
    page,
    (campaign) => Boolean(campaign.worldState?.forageState?.history?.[spotId]),
    5000,
  );
  if (result?.success && saved) return;
  const current = await snapshot(page).catch(() => null);
  throw new Error(`Forage smoke helper did not persist. Result: ${JSON.stringify(result)} State: ${JSON.stringify({
    currentZone: current?.currentZone,
    highlightedInteraction: current?.highlightedInteraction,
    player: current?.player,
  })}`);
}

const browser = await chromium.launch(chromiumLaunchOptions({ headless: process.env.HEADLESS !== '0' }));
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.addInitScript((campaign) => {
    if (localStorage.getItem('gos-live-smoke-seeded') === '1') {
      return;
    }
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(campaign));
    localStorage.setItem('gos-live-smoke-seeded', '1');
  }, seededCampaign());

  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForRenderedZone(page, 'player_plot');

  // Phase 5 smoke from docs/GAME_PHASE_TIMELINE.md: travel 6+ zones, forage
  // in 3, return, and verify bed state.
  await travel(page, 'neighborhood');
  await travel(page, 'market_square');
  await travel(page, 'greenhouse');
  await travel(page, 'meadow');
  await activateForage(page, 'meadow_flowers');
  await travel(page, 'forest_edge');
  await activateForage(page, 'forest_mushrooms');
  await travel(page, 'riverside');
  await activateForage(page, 'riverside_driftwood');
  await travel(page, 'festival_grounds');
  await travel(page, 'meadow');

  const savedBeforeReload = await readSavedCampaign(page);
  assert(savedBeforeReload.worldState.currentZone === 'meadow', 'Save should persist current zone before reload.');
  assert(Object.keys(savedBeforeReload.worldState.forageState.history).length > 0, 'Forage history should save before reload.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForRenderedZone(page, 'meadow');

  const afterReload = await snapshot(page);
  const savedAfterReload = await readSavedCampaign(page);
  assert(afterReload.currentZone === 'meadow', `Expected meadow after reload, got ${afterReload.currentZone}.`);
  const smokePath = ['player_plot', 'neighborhood', 'market_square', 'greenhouse', 'meadow', 'forest_edge', 'riverside', 'festival_grounds'];
  assert(
    smokePath.every((zoneId) => savedAfterReload.worldState.visitedZones.includes(zoneId)),
    `Visited zone history should include the traveled smoke path, got ${savedAfterReload.worldState.visitedZones.join(', ')}.`,
  );
  assert(
    ['meadow_flowers', 'forest_mushrooms', 'riverside_driftwood'].every((spotId) => savedAfterReload.worldState.forageState.history[spotId]),
    'Forage history should persist for all three foraged zones after reload.',
  );
  assert(savedAfterReload.activeBedId === 'player_plot', `Home bed should stay active, got ${savedAfterReload.activeBedId}.`);
  assert(savedAfterReload.beds?.bed_2?.grid?.[5]?.cropId === 'lettuce', 'The parked second bed should keep its crop across travel and reload.');

  console.log(JSON.stringify({
    ok: true,
    liveUrl: LIVE_URL,
    currentZone: afterReload.currentZone,
    visitedZones: savedAfterReload.worldState.visitedZones,
    forageHistoryCount: Object.keys(savedAfterReload.worldState.forageState.history).length,
    beds: Object.keys(savedAfterReload.beds ?? {}),
  }, null, 2));
} catch (error) {
  await mkdir(outputDir, { recursive: true });
  const screenshotPath = join(outputDir, 'failure.png');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw new Error(`${error instanceof Error ? error.message : String(error)} Screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
}
