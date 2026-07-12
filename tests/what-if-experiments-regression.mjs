import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { chromiumLaunchOptions } from './playwright-launch-options.mjs';

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : 'playwright';
const { chromium } = await import(playwrightSpecifier);
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = process.env.OUTPUT_DIR || join(tmpdir(), `garden-os-what-if-${Date.now()}`);
await mkdir(outputDir, { recursive: true });

function bed(id, name, revision, painted) {
  return {
    schemaVersion: 1,
    revision,
    id,
    name,
    shape: '4x2',
    dimensions: { rows: 2, cols: 4 },
    sun: 'full',
    painted,
    events: [],
    seasonStart: 'standard',
    lastEdited: '2026-07-11T20:00:00.000Z',
  };
}

const beds = [
  bed('bed-a', 'Front Bed', 4, [
    { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato' },
    { cell: 'r0c1', cropId: 'bas', cropName: 'Basil' },
  ]),
  bed('bed-b', 'Side Bed', 2, [
    { cell: 'r0c0', cropId: 'let', cropName: 'Lettuce' },
    { cell: 'r0c1', cropId: 'rad', cropName: 'Radish' },
  ]),
];

const browser = await chromium.launch(chromiumLaunchOptions({ headless: process.env.HEADLESS !== '0' }));
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
page.on('console', message => {
  const location = message.location().url || '';
  if (message.type() === 'error' && !location.endsWith('/favicon.ico')) {
    errors.push(`console: ${message.text()}`);
  }
});

await page.addInitScript(seed => {
  if (sessionStorage.getItem('gos.phase9.seeded') === 'true') return;
  localStorage.clear();
  seed.forEach(record => localStorage.setItem(`gos.bed.${record.id}`, JSON.stringify(record)));
  localStorage.setItem('gos.bed.order.v1', JSON.stringify(seed.map(record => record.id)));
  localStorage.setItem('gos.activeBed', 'bed-a');
  localStorage.setItem('gos.painting.paintLock.v1', 'false');
  sessionStorage.setItem('gos.phase9.seeded', 'true');
}, beds);

try {
  await page.goto(`${baseUrl}/garden-painting.html`, { waitUntil: 'networkidle' });
  await page.locator('.v5-editor-header').waitFor();
  await page.waitForTimeout(700);

  const savedBefore = await page.evaluate(() => localStorage.getItem('gos.bed.bed-a'));
  const revisionBefore = JSON.parse(savedBefore).revision;

  await page.getByRole('button', { name: 'Start What-If trial' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('gos.bed.bed-a')), savedBefore, 'starting a trial must not write the bed');
  await page.locator('[data-cell="0-2"]').click();
  await page.locator('[data-cell="0-2"][data-trial-changed="true"]').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('gos.bed.bed-a')), savedBefore, 'trial edits must not write the bed');
  await page.screenshot({ path: join(outputDir, 'what-if-mobile.png'), fullPage: true });

  await page.getByRole('button', { name: 'Discard' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('gos.bed.bed-a')), savedBefore, 'discard must restore the exact saved bed');
  assert.equal(await page.locator('[data-trial-changed="true"]').count(), 0, 'discard must clear change markers');

  await page.getByRole('button', { name: 'Start What-If trial' }).click();
  await page.locator('[data-cell="0-2"]').click();
  await page.getByRole('button', { name: 'Apply trial' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gos.bed.bed-a')).painted.some(item => item.cell === 'r0c2'));
  const applied = await page.evaluate(() => JSON.parse(localStorage.getItem('gos.bed.bed-a')));
  assert.equal(applied.revision, revisionBefore + 1, 'apply must increment the bed revision exactly once');
  assert.equal(applied.painted.filter(item => item.cell === 'r0c2').length, 1, 'apply must persist the trial cell once');

  await page.getByRole('button', { name: 'Open A/B bed experiments' }).click();
  await page.getByRole('heading', { name: 'Bed Experiments' }).waitFor();
  await page.getByLabel('CONTROLLED VARIABLE').selectOption('spacing');
  await page.getByLabel('HYPOTHESIS').fill('Wider spacing will improve airflow.');
  await page.getByRole('button', { name: 'Start experiment' }).click();
  await page.locator('[data-experiment-id]').waitFor();
  const experimentId = await page.locator('[data-experiment-id]').getAttribute('data-experiment-id');
  assert.ok(experimentId, 'experiment should receive a stable id');
  await page.getByLabel('DATED OBSERVATION').fill('Front bed leaves look less crowded.');
  await page.getByRole('button', { name: 'Save observation' }).click();
  await page.getByText(/1 observation\./).waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem('gos.journal.v1')), 'experiment lifecycle should append to Journal');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open A/B bed experiments' }).click();
  const persistedExperimentIds = await page.evaluate(() => GosExperiments.readAll().map(item => item.id));
  assert.ok(persistedExperimentIds.includes(experimentId), `experiment should survive refresh; found ${persistedExperimentIds.join(', ')}`);
  await page.locator(`[data-experiment-id="${experimentId}"]`).waitFor();
  await page.locator(`[data-experiment-id="${experimentId}"]`).getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByText('CLOSED', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Relink and reopen' }).click();
  await page.getByText('ACTIVE', { exact: true }).waitFor();
  await page.screenshot({ path: join(outputDir, 'experiment-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close experiments' }).click();

  await page.goto(`${baseUrl}/garden-planner-v5.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (await page.locator('[data-testid="planner-experiment-summary"]').count() === 0) {
    const diagnostics = await page.evaluate(() => ({
      active: localStorage.getItem('gos.activeBed'),
      bed: typeof GosBed !== 'undefined' && GosBed.getActive(),
      experiments: typeof GosExperiments !== 'undefined' && GosExperiments.readAll(),
      body: document.body.innerText.slice(0, 1000),
    }));
    throw new Error(`Planner experiment summary missing: ${JSON.stringify(diagnostics)}; errors=${errors.join('; ')}`);
  }
  await page.locator('[data-testid="planner-experiment-summary"]').waitFor();
  await page.screenshot({ path: join(outputDir, 'planner-experiment-mobile.png'), fullPage: true });

  await page.goto(`${baseUrl}/garden-painting.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start What-If trial' }).click();
  await page.locator('[data-cell="1-2"]').click();
  await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem('gos.bed.bed-a'));
    record.revision += 1;
    record.name = 'Front Bed changed elsewhere';
    localStorage.setItem('gos.bed.bed-a', JSON.stringify(record));
  });
  await page.getByRole('button', { name: 'Apply trial' }).click();
  await page.getByText(/changed in another tab/i).waitFor();
  await page.locator('[data-testid="what-if-bar"]').waitFor();
  await page.getByRole('button', { name: 'Discard' }).click();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start What-If trial' }).click();
  await page.locator('[data-cell="1-3"]').click();
  const revisionBeforeJournalFailure = await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem('gos.bed.bed-a'));
    GardenJournal.append = () => { throw new Error('fixture journal failure'); };
    return record.revision;
  });
  await page.getByRole('button', { name: 'Apply trial' }).click();
  await page.getByText(/applied, but Journal could not be updated/i).waitFor();
  assert.equal(await page.locator('[data-testid="what-if-bar"]').count(), 0, 'journal failure must not roll back a valid Apply');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gos.bed.bed-a')).revision), revisionBeforeJournalFailure + 1, 'journal failure Apply must still persist once');

  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto(`${baseUrl}/garden-painting.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start What-If trial' }).click();
  await page.locator('[data-testid="what-if-bar"]').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'desktop Beds view must not overflow horizontally');
  await page.screenshot({ path: join(outputDir, 'what-if-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Discard' }).click();

  await page.goto(`${baseUrl}/garden-planner-v5.html`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="planner-experiment-summary"]').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'desktop Planner view must not overflow horizontally');
  await page.screenshot({ path: join(outputDir, 'planner-experiment-desktop.png'), fullPage: true });

  assert.deepEqual(errors, [], errors.join('\n'));
  console.log(JSON.stringify({
    ok: true,
    experimentId,
    appliedRevision: applied.revision,
    outputDir,
  }, null, 2));
} finally {
  await browser.close();
}
