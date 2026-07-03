import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : 'playwright';
const { chromium } = await import(playwrightSpecifier);

const LIVE_URL = process.env.LIVE_URL || 'https://davehomeassist.github.io/garden-os/story-mode/';
const outputDir = process.env.SMOKE_OUTPUT_DIR || join(tmpdir(), 'garden-os-live-smoke');
const PLAYER_SPEED_UNITS_PER_SECOND = 1.85;
const MEADOW_FLOWERS_POSITION = { x: 2.7, z: 2.4 };

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

async function waitForRenderedZone(page, zoneId) {
  await page.waitForFunction(
    (nextZoneId) => {
      const renderer = window.gardenOS?.render_game_to_text;
      if (!renderer) return false;
      return JSON.parse(renderer()).currentZone === nextZoneId;
    },
    zoneId,
    { timeout: 60000 },
  );
}

async function snapshot(page) {
  return JSON.parse(await page.evaluate(() => window.gardenOS.render_game_to_text()));
}

async function travel(page, zoneId) {
  await page.keyboard.press('m');
  await page.locator(`#world-map-panel [data-zone-id="${zoneId}"]`).click();
  await waitForRenderedZone(page, zoneId);
}

async function moveAxis(page, key, durationMs) {
  if (durationMs <= 0) return;
  await page.keyboard.down(key);
  await page.evaluate((duration) => window.advanceTime(duration), durationMs);
  await page.keyboard.up(key);
}

async function moveToward(page, target) {
  const state = await snapshot(page);
  const position = state.player?.position;
  assert(position, 'Player position should be available for live smoke movement.');

  const dx = target.x - position.x;
  await moveAxis(
    page,
    dx > 0 ? 'd' : 'a',
    Math.round((Math.abs(dx) / PLAYER_SPEED_UNITS_PER_SECOND) * 1000),
  );

  const afterX = await snapshot(page);
  const dz = target.z - afterX.player.position.z;
  await moveAxis(
    page,
    dz > 0 ? 's' : 'w',
    Math.round((Math.abs(dz) / PLAYER_SPEED_UNITS_PER_SECOND) * 1000),
  );
}

const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });
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

  await moveToward(page, MEADOW_FLOWERS_POSITION);

  await page.locator('.interaction-prompt', { hasText: 'Forage' }).waitFor({ state: 'visible', timeout: 30000 });
  await page.keyboard.press('e');

  await page.waitForFunction(() => {
    const campaign = JSON.parse(localStorage.getItem('gos-story-slot-0-campaign') ?? '{}');
    return Object.keys(campaign.worldState?.forageState?.history ?? {}).length > 0;
  }, null, { timeout: 30000 });

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
