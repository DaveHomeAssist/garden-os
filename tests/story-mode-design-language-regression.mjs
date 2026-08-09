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

const outputDir = process.env.GOS_DESIGN_OUTPUT_DIR
  || join(tmpdir(), `garden-os-design-language-${Date.now()}`);
const timeoutMs = Number(process.env.GOS_DESIGN_TIMEOUT_MS ?? 240000);
const hardTimeout = setTimeout(() => {
  console.error(`Story Mode design-language regression timed out after ${timeoutMs}ms.`);
  process.exit(124);
}, timeoutMs);
hardTimeout.unref?.();

const VIEWPORTS = [
  { name: 'desktop-1280x720', width: 1280, height: 720, mobile: false },
  { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false },
  { name: 'desktop-1920x1080', width: 1920, height: 1080, mobile: false },
  { name: 'ultrawide-2560x1080', width: 2560, height: 1080, mobile: false },
  { name: 'mobile-430x932', width: 430, height: 932, mobile: true },
  { name: 'mobile-375x812', width: 375, height: 812, mobile: true },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function makeFreePlayPlanningSave() {
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
  const timestamp = '2026-08-09T12:00:00.000Z';
  return {
    campaign: {
      version: 8,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentChapter: 1,
      currentSeason: 'spring',
      cropsUnlocked: ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'],
      seenCutsceneIds: ['ch1-intro', 'sandbox-intro'],
      worldState: {
        currentZone: 'player_plot',
        visitedZones: ['player_plot'],
        lastSpawnPoint: null,
        forageState: { cooldowns: {}, history: {} },
      },
      gameMode: 'sandbox',
      sandbox: true,
    },
    season: {
      chapter: 1,
      season: 'spring',
      month: 3,
      phase: 'PLANNING',
      beatIndex: 0,
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
  return { stop: () => vite.close() };
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
  await page.waitForSelector('#viewport canvas', { timeout: 180000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#viewport canvas');
    return Boolean(canvas && canvas.width > 100 && canvas.height > 100);
  }, null, { timeout: 180000 });
}

function rectanglesOverlap(first, second, gap = 0) {
  if (!first || !second) return false;
  return !(
    first.right + gap <= second.left
    || second.right + gap <= first.left
    || first.bottom + gap <= second.top
    || second.bottom + gap <= first.top
  );
}

async function readLayout(page) {
  return page.evaluate(() => {
    function visibleRect(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0.01
        && rect.width > 0
        && rect.height > 0;
      if (!visible) return null;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }

    const helper = document.querySelector('#phase-helper');
    const fab = document.querySelector('#fab-advance');
    const hudAction = document.querySelector('#hud-action');
    const calendar = document.querySelector('#season-calendar');
    const canvas = document.querySelector('#viewport canvas');
    const toolHud = document.querySelector('.tool-hud');
    const focusable = [fab, hudAction].filter(Boolean).filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width >= 1 && rect.height >= 1;
    });

    return {
      designLanguage: document.body.dataset.designLanguage,
      storyScreen: document.body.dataset.storyScreen,
      helperText: helper?.textContent?.trim() ?? '',
      helperFontSize: helper ? Number.parseFloat(getComputedStyle(helper).fontSize) : 0,
      helperVisible: Boolean(visibleRect('#phase-helper')),
      fabLabel: fab?.getAttribute('aria-label') ?? '',
      fabDescription: fab?.getAttribute('aria-describedby') ?? '',
      fabInteractive: !fab?.disabled && getComputedStyle(fab).pointerEvents !== 'none',
      calendarRole: calendar?.getAttribute('role') ?? '',
      calendarLabel: calendar?.getAttribute('aria-label') ?? '',
      primaryVisibleCount: focusable.length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      canvas: canvas ? {
        width: canvas.getBoundingClientRect().width,
        height: canvas.getBoundingClientRect().height,
      } : null,
      helper: visibleRect('#phase-helper'),
      calendar: visibleRect('#season-calendar'),
      fab: visibleRect('#fab-advance'),
      toolHud: toolHud && !toolHud.hidden ? visibleRect('.tool-hud') : null,
    };
  });
}

async function assertViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.waitForTimeout(180);

  const layout = await readLayout(page);
  const label = viewport.name;

  assert(layout.designLanguage === 'v0.10', `${label}: design-language marker is ${layout.designLanguage}.`);
  assert(layout.storyScreen === 'play', `${label}: expected play screen, got ${layout.storyScreen}.`);
  assert(layout.helperVisible, `${label}: current-task helper is not visible.`);
  assert(layout.helperText.includes('Start Season'), `${label}: helper does not name Start Season: ${layout.helperText}`);
  assert(!layout.helperText.includes('Commit Plan'), `${label}: stale Commit Plan copy remains.`);
  assert(layout.fabDescription === 'phase-helper', `${label}: progression action is not linked to the current task.`);
  assert(layout.fabLabel.includes('Start Season'), `${label}: progression action lacks a useful accessible name.`);
  assert(layout.fabInteractive, `${label}: progression action is not interactive.`);
  assert(layout.calendarRole === 'status', `${label}: season calendar is not exposed as status.`);
  assert(layout.calendarLabel.includes('March'), `${label}: season calendar lacks an aggregate accessible label.`);
  assert(layout.primaryVisibleCount === 1, `${label}: expected one visible progression action, got ${layout.primaryVisibleCount}.`);
  assert(!layout.overflowX, `${label}: page has horizontal overflow.`);
  assert(layout.canvas?.width >= viewport.width * 0.98, `${label}: garden scene does not fill the viewport width.`);
  assert(layout.canvas?.height >= viewport.height * 0.98, `${label}: garden scene does not fill the viewport height.`);
  assert(layout.fab?.width >= 44 && layout.fab?.height >= 44, `${label}: progression target is smaller than 44px.`);
  assert(layout.helperFontSize >= (viewport.mobile ? 12 : 13), `${label}: helper text is too small at ${layout.helperFontSize}px.`);

  for (const [name, rect] of Object.entries({ helper: layout.helper, calendar: layout.calendar, fab: layout.fab, toolHud: layout.toolHud })) {
    if (!rect) continue;
    assert(rect.left >= -1 && rect.top >= -1, `${label}: ${name} leaves the top or left viewport edge.`);
    assert(rect.right <= viewport.width + 1, `${label}: ${name} leaves the right viewport edge.`);
    assert(rect.bottom <= viewport.height + 1, `${label}: ${name} leaves the bottom viewport edge.`);
  }

  assert(!rectanglesOverlap(layout.calendar, layout.helper, 4), `${label}: season calendar overlaps the current task.`);
  if (layout.toolHud) {
    assert(!rectanglesOverlap(layout.toolHud, layout.fab, 3), `${label}: tool dock overlaps the primary action.`);
  }

  await page.locator('#fab-advance').focus();
  const focus = await page.locator('#fab-advance').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  assert(focus.outlineStyle !== 'none' && focus.outlineWidth >= 3, `${label}: keyboard focus is not clearly visible.`);

  await page.screenshot({ path: join(outputDir, `${label}.png`), fullPage: false });
  return layout;
}

const port = await getOpenPort();
const baseUrl = `http://127.0.0.1:${port}/`;
const server = await startDevServer(port);
const browser = await chromium.launch(chromiumLaunchOptions({ headless: process.env.HEADLESS !== '0' }));

try {
  await mkdir(outputDir, { recursive: true });
  await waitForServer(baseUrl);

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });

  const seed = makeFreePlayPlanningSave();
  await page.addInitScript((save) => {
    globalThis.GARDEN_OS_PRESERVE_DRAWING_BUFFER = true;
    localStorage.clear();
    localStorage.setItem('gos-story-active-slot', '0');
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(save.campaign));
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify(save.season));
  }, seed);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  await page.locator('[data-action="continue"][data-slot="0"]').click();
  await page.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 120000 });
  await waitForCanvasPaint(page);
  await page.waitForFunction(() => {
    const helper = document.querySelector('#phase-helper');
    const fab = document.querySelector('#fab-advance');
    return document.body.dataset.designLanguage === 'v0.10'
      && helper?.classList.contains('is-visible')
      && fab?.classList.contains('is-visible');
  }, null, { timeout: 60000 });

  const results = [];
  for (const viewport of VIEWPORTS) {
    results.push({ viewport: viewport.name, layout: await assertViewport(page, viewport) });
  }

  assert(browserErrors.length === 0, `Browser emitted errors: ${browserErrors.join(' | ')}`);

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    outputDir,
    testedViewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
    results,
  }, null, 2));
} finally {
  clearTimeout(hardTimeout);
  await browser.close();
  await server.stop();
}
