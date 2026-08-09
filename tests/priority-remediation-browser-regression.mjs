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
const outputDir = process.env.OUTPUT_DIR || join(tmpdir(), `garden-os-priority-${Date.now()}`);
const routes = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'journal.html',
];
const navLabels = ['Home', 'Beds', 'Planner', 'Doctor', 'Journal'];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function assertProductSurface(page, route, width) {
  const errors = watchErrors(page);
  await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('main');
  const result = await page.evaluate((expectedLabels) => {
    const exactNavLinks = [...document.querySelectorAll('nav a, nav span[aria-current="page"]')]
      .filter((link) => expectedLabels.includes(link.textContent.trim()));
    return {
      mainCount: document.querySelectorAll('main').length,
      h1Count: document.querySelectorAll('h1').length,
      hasSkip: Boolean(document.querySelector('.skip-link')),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      nav: exactNavLinks.map((link) => {
        const rect = link.getBoundingClientRect();
        return {
          label: link.textContent.trim(),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      }),
    };
  }, navLabels);
  assert.equal(result.mainCount, 1, `${route} should render one main landmark at ${width}px`);
  assert.equal(result.h1Count, 1, `${route} should render one h1 at ${width}px`);
  assert.equal(result.hasSkip, true, `${route} should render a skip link at ${width}px`);
  assert.equal(result.horizontalOverflow, false, `${route} should not overflow horizontally at ${width}px`);
  assert.deepEqual(result.nav.map((entry) => entry.label), navLabels, `${route} should keep all five product destinations visible`);
  assert(
    result.nav.every((entry) => entry.height >= 44 && entry.width >= 44 && entry.left >= -1 && entry.right <= width + 1),
    `${route} product navigation should use reachable 44px targets at ${width}px`,
  );
  assert.deepEqual(errors, [], `${route} emitted browser errors at ${width}px`);
}

try {
  for (const width of [320, 375, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    const landing = await context.newPage();
    await landing.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    assert.match(landing.url(), /\/index-v5\.html(?:[?#]|$)/, 'canonical root should route into the one current Home implementation');
    assert.equal(
      await landing.locator('link[rel="canonical"]').getAttribute('href'),
      'https://davehomeassist.github.io/garden-os/',
      'current Home implementation should declare the public root canonical',
    );
    await landing.close();

    for (const route of routes) {
      const page = await context.newPage();
      await assertProductSurface(page, route, width);
      await page.close();
    }
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto(`${baseUrl}/garden-painting.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => GosBed.readAll().length), 0, 'fresh Beds must remain honestly empty');
  assert.match(await page.locator('body').innerText(), /NO SAVED GARDEN/i);
  await page.getByRole('button', { name: "Try Mom's sample garden" }).click();
  await page.waitForTimeout(500);
  const sample = await page.evaluate(() => GosBed.readAll().map((bed) => ({ sample: bed.sampleGarden, count: bed.painted.length })));
  assert.equal(sample.length, 3, 'explicit sample action should load all three sample beds');
  assert(sample.every((bed) => bed.sample === true), 'every sample bed should remain labelled in storage');
  assert.equal(sample.reduce((sum, bed) => sum + bed.count, 0), 44, 'explicit sample should preserve 44 planted cells');

  await page.goto(`${baseUrl}/garden-planner-v5.html`, { waitUntil: 'networkidle' });
  const cells = page.locator('.planner-bed-cell');
  assert.equal(await cells.count(), 16, 'Planner should render the active 4x4 sample bed in full');
  const cellTargets = await cells.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, label: element.getAttribute('aria-label'), text: element.textContent.trim() };
  }));
  assert(cellTargets.every((cell) => cell.width >= 44 && cell.height >= 44), 'Planner bed cells must be at least 44px');
  assert(cellTargets.every((cell) => /suitability/i.test(cell.label)), 'planted cells should explain their score to assistive tech');
  assert(cellTargets.every((cell) => /GREAT|OK|WEAK/.test(cell.text)), 'cell state must include a non-color score label');

  await page.getByRole('button', { name: 'Edit bed' }).click();
  await page.getByRole('button', { name: /Erase/ }).click();
  const before = await page.evaluate(() => GosBed.getActive().painted.length);
  await cells.first().click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => GosBed.getActive().painted.length), before - 1, 'touch edit mode should edit a full bed');
  await page.getByRole('button', { name: /Undo/ }).click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => GosBed.getActive().painted.length), before, 'Planner undo should restore the latest cell edit');
  assert.deepEqual(errors, [], 'sample and Planner edit journey should not emit browser errors');
  await page.screenshot({ path: join(outputDir, 'planner-mobile-edit.png'), fullPage: true });
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  for (const route of ['garden-painting.html', 'garden-planner-v5.html']) {
    const desktopPage = await desktop.newPage();
    await desktopPage.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
    const width = await desktopPage.locator('.v5-frame-outer').evaluate((element) => element.getBoundingClientRect().width);
    assert(width >= 1000, `${route} should use desktop space instead of a phone-width frame`);
    await desktopPage.close();
  }
  await desktop.close();

  console.log(JSON.stringify({ ok: true, widths: [320, 375, 430, 1440], outputDir }, null, 2));
} finally {
  await browser.close();
}
