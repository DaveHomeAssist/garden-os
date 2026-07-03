import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const timeoutMs = Number(process.env.GOS_SCREENSHOT_TIMEOUT_MS ?? 180000);
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

async function readDialogueIdentity(page) {
  return page.evaluate(() => {
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

async function captureDialogueThenDismiss(page, screenshotName) {
  const panel = page.locator('.dp-panel.dp-panel--visible').first();
  const visible = await panel.isVisible().catch(() => false);
  if (!visible) return;

  await assertDialogueIdentity(page);
  await page.screenshot({ path: join(outputDir, screenshotName), fullPage: true });
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

const port = await getOpenPort();
const baseUrl = `http://127.0.0.1:${port}/`;
const server = await startDevServer(port);
const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });

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

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    outputDir,
    screenshots: [
      'desktop-title.png',
      'desktop-dialogue.png',
      'desktop-play-event.png',
      'mobile-dialogue.png',
      'mobile-play-event.png',
    ],
  }, null, 2));
} finally {
  clearTimeout(hardTimeout);
  await browser.close();
  await server.stop();
}
