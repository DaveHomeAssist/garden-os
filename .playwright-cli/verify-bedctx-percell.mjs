// Browser verification for the bedContext editor + per-cell garden log PR.
// Run: node .playwright-cli/verify-bedctx-percell.mjs

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8777';
const OUT_DIR = path.resolve('.playwright-cli/bedctx-percell');
fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = [];
const errors = [];
function note(label, ok, detail) {
  const line = `[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`;
  summary.push(line);
  console.log(line);
  if (!ok) errors.push(line);
}

const browser = await chromium.launch();
try {
  // ── Baseline ───────────────────────────────────────────────────────────
  for (const file of ['index-v5.html', 'garden-painting.html', 'garden-planner-v5.html', 'garden-doctor-v5.html', 'how-it-thinks-v5.html']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text());
    });
    const resp = await page.goto(BASE + '/' + file, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);
    const ok = resp && resp.ok() && consoleErrors.length === 0;
    note('baseline ' + file, ok, resp ? `HTTP ${resp.status()}${consoleErrors.length ? ` / ${consoleErrors.length} errors` : ''}` : 'no response');
    if (consoleErrors.length) {
      fs.writeFileSync(path.join(OUT_DIR, 'console-' + file + '.log'), consoleErrors.join('\n'));
    }
    await ctx.close();
  }

  // ── Painting Site panel: open, edit fields, autosave persists to GosBed ─
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const bed = {
        schemaVersion: 1, id: 'sitetest', name: 'Site Test',
        shape: '4x4', sun: 'full',
        painted: [], events: [],
        lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      };
      window.localStorage.setItem('gos.bed.sitetest', JSON.stringify(bed));
      window.localStorage.setItem('gos.activeBed', 'sitetest');
    });
    await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    // Open the Site panel.
    await page.locator('button[aria-label*="Site context"]').first().click();
    await page.waitForTimeout(300);
    const panel = page.locator('[role="dialog"][aria-label="Site context"]');
    note('Painting Site panel opens', await panel.isVisible());

    // Set zone, wallSide, water, orientation.
    await page.locator('[role="dialog"] input[placeholder*="7a"]').fill('7a');
    await page.locator('[role="dialog"] select').nth(0).selectOption('back');     // wallSide
    await page.locator('[role="dialog"] select').nth(1).selectOption('drip');     // water
    await page.locator('[role="dialog"] select').nth(2).selectOption('ew');       // orientation
    // Sun hours via the range input. React tracks input values via its own
    // synthetic property, so call the native setter before dispatching the
    // event or React will ignore the change.
    const range = page.locator('[role="dialog"] input[type="range"]');
    await range.evaluate(el => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, '6.5');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for the autosave debounce + write.
    await page.waitForTimeout(900);

    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem('gos.bed.sitetest');
      return raw ? JSON.parse(raw) : null;
    });
    note('Site panel writes zone to GosBed', stored && stored.zone === '7a', `zone=${stored?.zone}`);
    note('Site panel writes wallSide to GosBed', stored && stored.wallSide === 'back');
    note('Site panel writes water to GosBed', stored && stored.water === 'drip');
    note('Site panel writes orientation to GosBed', stored && stored.orientation === 'ew');
    note('Site panel writes sunHoursNumeric to GosBed',
      stored && typeof stored.sunHoursNumeric === 'number' && stored.sunHoursNumeric === 6.5,
      `sunHoursNumeric=${stored?.sunHoursNumeric}`);

    await page.screenshot({ path: path.join(OUT_DIR, 'site-panel.png'), fullPage: false });
    await ctx.close();
  }

  // ── Per-cell strip in Planner CropSheet ────────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const bed = {
        schemaVersion: 1, id: 'percelltest', name: 'PerCell Test',
        shape: '4x4', sun: 'full',
        painted: [
          { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a',
            plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17 },
          { cell: 'r0c1', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a',
            plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17 },
          { cell: 'r0c2', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a',
            plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17 },
        ],
        events: [],
        lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      };
      window.localStorage.setItem('gos.bed.percelltest', JSON.stringify(bed));
      window.localStorage.setItem('gos.activeBed', 'percelltest');
    });
    await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    // Open the Tomato lane.
    await page.locator('[role="button"][aria-label*="Tomato"]').first().click();
    await page.waitForTimeout(400);

    const sheet = page.locator('[role="dialog"][aria-label*="Tomato"]').first();
    const sheetText = await sheet.textContent();
    note('Planner CropSheet shows PER-CELL LOG section', /PER-CELL LOG · 3 CELLS/i.test(sheetText || ''));

    // Click the r0c0 chip to mark that single cell done.
    const r0c0Btn = page.locator('button[aria-label^="r0c0"]').first();
    await r0c0Btn.click();
    await page.waitForTimeout(500);

    const events1 = await page.evaluate(() => {
      const raw = window.localStorage.getItem('gos.bed.percelltest');
      return raw ? JSON.parse(raw).events : [];
    });
    note('Per-cell tap writes a mark_done event for r0c0',
      events1.length === 1 && events1[0].type === 'mark_done' && events1[0].cell === 'r0c0',
      `events=${JSON.stringify(events1.map(e => ({ t: e.type, cell: e.cell })))}`);

    // Tap r0c0 again to undo.
    await page.locator('button[aria-label^="r0c0"]').first().click();
    await page.waitForTimeout(500);
    const events2 = await page.evaluate(() => {
      const raw = window.localStorage.getItem('gos.bed.percelltest');
      return raw ? JSON.parse(raw).events : [];
    });
    note('Tapping a marked cell undoes that cell only', events2.length === 0);

    // Alt-click r0c1 to write a harvest event for that cell.
    const r0c1Btn = page.locator('button[aria-label^="r0c1"]').first();
    await r0c1Btn.click({ modifiers: ['Alt'] });
    await page.waitForTimeout(500);
    const events3 = await page.evaluate(() => {
      const raw = window.localStorage.getItem('gos.bed.percelltest');
      return raw ? JSON.parse(raw).events : [];
    });
    note('Alt-tap on a cell writes a harvest event for that cell',
      events3.length === 1 && events3[0].type === 'harvest' && events3[0].cell === 'r0c1',
      `events=${JSON.stringify(events3.map(e => ({ t: e.type, cell: e.cell })))}`);

    await page.screenshot({ path: path.join(OUT_DIR, 'per-cell-strip.png'), fullPage: false });
    await ctx.close();
  }

  // ── Per-cell strip is hidden in preview mode ───────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const bed = {
        schemaVersion: 1, id: 'previewtest', name: 'Preview Test',
        shape: '4x4', sun: 'full',
        painted: [
          { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a' },
          { cell: 'r0c1', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a' },
        ],
        events: [],
        lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      };
      window.localStorage.setItem('gos.bed.previewtest', JSON.stringify(bed));
      window.localStorage.setItem('gos.activeBed', 'previewtest');
      window.localStorage.setItem('gos.planner-v5.tweaks', JSON.stringify({
        density: 'comfortable', showEnded: true, weekOffset: 6,
      }));
    });
    await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    await page.locator('[role="button"][aria-label*="Tomato"]').first().click();
    await page.waitForTimeout(400);

    const r0c0Btn = page.locator('button[aria-label^="r0c0"]').first();
    const isDisabled = await r0c0Btn.isDisabled().catch(() => false);
    note('Per-cell chips are disabled in preview mode', isDisabled);
    await ctx.close();
  }

} finally {
  await browser.close();
}

console.log('\n──── Summary ────');
summary.forEach(l => console.log(l));
fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), summary.join('\n'));
process.exit(errors.length ? 1 : 0);
