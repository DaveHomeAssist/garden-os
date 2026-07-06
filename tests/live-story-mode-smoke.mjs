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

function seededCampaign() {
  return {
    version: 8,
    sandbox: true,
    currentChapter: 99,
    currentSeason: 'spring',
    updatedAt: new Date().toISOString(),
    questLog: {
      gus_river_path: { state: 'COMPLETED' },
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
      gardening: { level: 10, xp: 0 },
      soil_science: { level: 10, xp: 0 },
      crafting: { level: 10, xp: 0 },
      foraging: { level: 10, xp: 0 },
      tool_use: { level: 10, xp: 0 },
      social: { level: 10, xp: 0 },
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
    beds: {},
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

async function forageHistorySaved(page, timeout = 8000) {
  return page.waitForFunction(() => {
    const campaign = JSON.parse(localStorage.getItem('gos-story-slot-0-campaign') ?? '{}');
    return Object.keys(campaign.worldState?.forageState?.history ?? {}).length > 0;
  }, null, { timeout }).then(() => true).catch(() => false);
}

async function activateForage(page) {
  const result = await page.evaluate(() => {
    const activate = window.gardenOS?.activateForageForSmoke;
    if (typeof activate !== 'function') {
      return { success: false, message: 'Forage smoke helper unavailable.' };
    }
    return activate('meadow_flowers');
  });
  if (result?.success && await forageHistorySaved(page, 5000)) return;
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

  await travel(page, 'neighborhood');
  await travel(page, 'meadow');
  await travel(page, 'riverside');
  await travel(page, 'meadow');

  await activateForage(page);

  const savedBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-story-slot-0-campaign')));
  assert(savedBeforeReload.worldState.currentZone === 'meadow', 'Save should persist current zone before reload.');
  assert(Object.keys(savedBeforeReload.worldState.forageState.history).length > 0, 'Forage history should save before reload.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
  await waitForRenderedZone(page, 'meadow');

  const afterReload = await snapshot(page);
  const savedAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-story-slot-0-campaign')));
  assert(afterReload.currentZone === 'meadow', `Expected meadow after reload, got ${afterReload.currentZone}.`);
  assert(
    ['player_plot', 'neighborhood', 'meadow', 'riverside'].every((zoneId) => savedAfterReload.worldState.visitedZones.includes(zoneId)),
    'Visited zone history should include the traveled smoke path.',
  );
  assert(Object.keys(savedAfterReload.worldState.forageState.history).length > 0, 'Forage history should persist after reload.');

  console.log(JSON.stringify({
    ok: true,
    liveUrl: LIVE_URL,
    currentZone: afterReload.currentZone,
    visitedZones: savedAfterReload.worldState.visitedZones,
    forageHistoryCount: Object.keys(savedAfterReload.worldState.forageState.history).length,
  }, null, 2));
} catch (error) {
  await mkdir(outputDir, { recursive: true });
  const screenshotPath = join(outputDir, 'failure.png');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  throw new Error(`${error instanceof Error ? error.message : String(error)} Screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
}
