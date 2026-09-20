import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const playwrightPath = process.env.PLAYWRIGHT_IMPORT_PATH
  || join(repoRoot, 'story-mode', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const outputDir = process.env.OUTPUT_DIR || join(tmpdir(), `garden-os-theme-pwa-${Date.now()}`);

const routes = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'journal.html',
  'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html',
  'how-it-thinks-v5.html',
];

function luminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map((part) => Number(part) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/index-v5.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'first visit must default to light');

  const toggle = page.locator('[data-garden-theme-toggle]');
  await toggle.waitFor({ state: 'visible' });
  const box = await toggle.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, 'theme toggle must be at least 44x44 CSS px');
  assert.match(await toggle.getAttribute('aria-label'), /dark theme/i);
  await page.screenshot({ path: join(outputDir, 'home-light.png'), fullPage: true });

  await toggle.click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('garden-os-theme')), 'dark');
  await page.screenshot({ path: join(outputDir, 'home-dark.png'), fullPage: true });

  for (const route of routes) {
    await page.goto(`${baseUrl}/${route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-garden-theme-toggle]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', `${route} must retain the saved theme`);
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      const heading = document.querySelector('h1');
      let surface = heading?.parentElement ?? document.body;
      let surfaceColor = 'rgba(0, 0, 0, 0)';
      while (surface && /rgba?\(0, 0, 0(?:, 0)?\)/.test(surfaceColor)) {
        surfaceColor = getComputedStyle(surface).backgroundColor;
        surface = surface.parentElement;
      }
      return {
        background: style.backgroundColor,
        color: style.color,
        heading: heading ? getComputedStyle(heading).color : style.color,
        headingBackground: surfaceColor === 'rgba(0, 0, 0, 0)' ? style.backgroundColor : surfaceColor,
      };
    });
    assert(contrast(colors.background, colors.color) >= 4.5, `${route} dark body text must meet WCAG AA`);
    assert(contrast(colors.headingBackground, colors.heading) >= 4.5, `${route} dark h1 must meet WCAG AA`);
  }

  await page.goto(`${baseUrl}/index-v5.html`, { waitUntil: 'networkidle' });
  const registration = await page.evaluate(async () => {
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('service worker readiness timeout')), 10000)),
    ]);
    return { scope: ready.scope, scriptURL: ready.active?.scriptURL ?? '' };
  });
  assert.match(registration.scriptURL, /\/sw\.js$/);

  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('h1').count(), 1, 'Home must render from the service worker while offline');
  assert.match(await page.locator('body').innerText(), /Garden OS/i);
  await context.setOffline(false);

  console.log(JSON.stringify({
    ok: true,
    routes: routes.length + 1,
    serviceWorker: registration,
    screenshots: outputDir,
  }, null, 2));
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
}
