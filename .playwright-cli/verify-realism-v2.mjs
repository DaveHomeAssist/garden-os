// Browser verification for the realism schema v2 PR.
//
// Covers:
//   - Baseline page loads (no console errors)
//   - GosBed accepts and round-trips plantedAt + plantedWeek on painted entries
//   - GosBed accepts and round-trips bedContext fields
//   - Planner v5 reads plantedWeek from a real bed and surfaces it via the
//     PLANTED line in the bottom sheet
//   - Planner v5 enters preview mode when weekOffset != 0 and hides the
//     Done today / Harvested CTAs, showing a Previewing... banner instead
//   - Planner v5 renders an SVG check icon (no ✓ glyph) on the done lane
//
// Run: node .playwright-cli/verify-realism-v2.mjs

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8773';
const OUT_DIR = path.resolve('.playwright-cli/realism');
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
  // ── Baseline page loads, no console errors ─────────────────────────────
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

  // ── GosBed round-trips plantedAt + plantedWeek + bedContext ────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/index-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const written = window.GosBed.write({
        id: 'realism-test',
        name: 'Realism Test',
        shape: '4x4',
        sun: 'full',
        zone: '7a',
        wallSide: 'back',
        sunHoursNumeric: 6.5,
        water: 'drip',
        orientation: 'ew',
        painted: [
          { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a',
            plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17 },
          { cell: 'r0c1', cropId: 'bas', cropName: 'Basil', cropIcon: 'Ba', cropColor: '#4e8c3c' }
        ]
      });
      const round = window.GosBed.read('realism-test');
      const w0 = window.GosBed.plantedWeekOf(round.painted[0]);
      const w1 = window.GosBed.plantedWeekOf(round.painted[1]);
      return {
        zone: round.zone, wallSide: round.wallSide, sunHoursNumeric: round.sunHoursNumeric,
        water: round.water, orientation: round.orientation,
        p0PlantedAt: round.painted[0].plantedAt, p0PlantedWeek: round.painted[0].plantedWeek,
        p1PlantedAt: round.painted[1].plantedAt || null,
        helperW0: w0, helperW1: w1,
        currentIsoWeekIsNumber: typeof window.GosBed.currentIsoWeek() === 'number',
      };
    });

    note('GosBed round-trips bedContext (zone)', result.zone === '7a', `zone=${result.zone}`);
    note('GosBed round-trips bedContext (wallSide)', result.wallSide === 'back');
    note('GosBed round-trips bedContext (sunHoursNumeric)', result.sunHoursNumeric === 6.5);
    note('GosBed round-trips bedContext (water)', result.water === 'drip');
    note('GosBed round-trips bedContext (orientation)', result.orientation === 'ew');
    note('GosBed round-trips plantedAt on painted[0]', result.p0PlantedAt === '2026-04-22T10:00:00.000Z');
    note('GosBed round-trips plantedWeek on painted[0]', result.p0PlantedWeek === 17);
    note('GosBed omits plantedAt on painted[1] (no input)', result.p1PlantedAt === null);
    note('GosBed.plantedWeekOf returns the recorded week', result.helperW0 === 17);
    note('GosBed.plantedWeekOf returns null for missing data', result.helperW1 === null);
    note('GosBed.currentIsoWeek returns a number', result.currentIsoWeekIsNumber);

    await ctx.close();
  }

  // ── Planner v5 reads plantedWeek and surfaces PLANTED line ─────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // Pre-seed a bed with a real plantedAt and an explicit plantedWeek that
    // differs from the catalog's tomato sowWeek (8) so we can detect the
    // PLANTED line is reading from the bed, not the catalog.
    await page.addInitScript(() => {
      const bed = {
        schemaVersion: 1, id: 'plantedweek-test', name: 'PlantedWeek Test',
        shape: '4x4', sun: 'full',
        painted: [{
          cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To',
          cropColor: '#c8412a',
          plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17,
        }],
        events: [], lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      };
      window.localStorage.setItem('gos.bed.plantedweek-test', JSON.stringify(bed));
      window.localStorage.setItem('gos.activeBed', 'plantedweek-test');
    });
    await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    // Click the tomato lane to open the bottom sheet.
    const tomLane = page.locator('[role="button"][aria-label*="Tomato"]').first();
    await tomLane.click();
    await page.waitForTimeout(400);

    const sheet = page.locator('[role="dialog"][aria-label*="Tomato"]').first();
    const sheetText = await sheet.textContent();
    note('Planner CropSheet shows PLANTED line', /PLANTED/i.test(sheetText || ''),
      'sheet snippet: ' + (sheetText || '').slice(0, 200).replace(/\s+/g, ' '));
    note('Planner shows the recorded W17 (not catalog W8)', /W17/.test(sheetText || ''));
    await page.screenshot({ path: path.join(OUT_DIR, 'planner-cropsheet-planted-line.png'), fullPage: false });
    await ctx.close();
  }

  // ── Planner v5 preview mode disables care-action CTAs ──────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const bed = {
        schemaVersion: 1, id: 'preview-test', name: 'Preview Test',
        shape: '4x4', sun: 'full',
        painted: [{
          cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To',
          cropColor: '#c8412a',
          plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17,
        }],
        events: [], lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      };
      window.localStorage.setItem('gos.bed.preview-test', JSON.stringify(bed));
      window.localStorage.setItem('gos.activeBed', 'preview-test');
      // Force preview by setting weekOffset on the planner's tweaks.
      window.localStorage.setItem('gos.planner-v5.tweaks',
        JSON.stringify({ density: 'comfortable', showEnded: true, weekOffset: 6 }));
    });
    await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    const tomLane = page.locator('[role="button"][aria-label*="Tomato"]').first();
    await tomLane.click();
    await page.waitForTimeout(400);

    const sheet = page.locator('[role="dialog"][aria-label*="Tomato"]').first();
    const sheetText = await sheet.textContent();
    const hasPreviewBanner = /Previewing W/i.test(sheetText || '');
    const doneTodayBtnVisible = await page.locator('button:has-text("Done today")').first().isVisible().catch(() => false);
    const harvestedBtnVisible = await page.locator('button:has-text("Harvested")').first().isVisible().catch(() => false);

    note('Planner preview shows Previewing banner', hasPreviewBanner,
      'sheet snippet: ' + (sheetText || '').slice(0, 200).replace(/\s+/g, ' '));
    note('Planner preview hides Done today CTA', !doneTodayBtnVisible);
    note('Planner preview hides Harvested CTA', !harvestedBtnVisible);
    await page.screenshot({ path: path.join(OUT_DIR, 'planner-preview-banner.png'), fullPage: false });
    await ctx.close();
  }

  // ── Planner v5 renders SVG check icon, no ✓ glyph ──────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    // The "Done today" CTA exists in fixture mode (no real bed). Click a lane.
    const anyLane = page.locator('[role="button"][aria-label*="Tomato"]').first();
    await anyLane.click();
    await page.waitForTimeout(400);
    const sheet = page.locator('[role="dialog"][aria-label*="Tomato"]').first();
    const sheetHtml = await sheet.innerHTML();
    const hasUnicodeCheck = /[✓]/.test(sheetHtml);
    const hasSvgCheckPath = /M2\.5 7\.5l3 3 6-6\.5/.test(sheetHtml);
    note('Planner CropSheet has no ✓ glyph', !hasUnicodeCheck);
    note('Planner CropSheet renders SVG check icon', hasSvgCheckPath);
    await ctx.close();
  }

} finally {
  await browser.close();
}

console.log('\n──── Summary ────');
summary.forEach(l => console.log(l));
fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), summary.join('\n'));
process.exit(errors.length ? 1 : 0);
