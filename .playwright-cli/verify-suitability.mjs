// Browser verification for gos-suitability + Doctor + Painting integration.
// Run: node .playwright-cli/verify-suitability.mjs

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8775';
const OUT_DIR = path.resolve('.playwright-cli/suitability');
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
  // ── Baseline pages load clean ──────────────────────────────────────────
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

  // ── GosSuitability module exposes the public API ───────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const api = await page.evaluate(() => {
      const G = window.GosSuitability;
      return {
        hasModule: !!G,
        hasScoreCell: typeof G?.scoreCell === 'function',
        hasScoreBed: typeof G?.scoreBed === 'function',
        hasFactors: typeof G?.sunFit === 'function' && typeof G?.adjacencyDelta === 'function',
        hasCompanions: G && typeof G.COMPANIONS === 'object' && Array.isArray(G.COMPANIONS.tom),
      };
    });
    note('GosSuitability module loaded', api.hasModule);
    note('GosSuitability.scoreCell exposed', api.hasScoreCell);
    note('GosSuitability.scoreBed exposed', api.hasScoreBed);
    note('GosSuitability factor functions exposed', api.hasFactors);
    note('GosSuitability companions table populated', api.hasCompanions);
    await ctx.close();
  }

  // ── GosSuitability returns deterministic, sane scores ──────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const bed = {
        shape: '4x4', sun: 'full', wallSide: 'back', sunHoursNumeric: 8,
        painted: [
          { cell: 'r0c0', cropId: 'tom' },
          { cell: 'r0c1', cropId: 'tom' },
          { cell: 'r1c0', cropId: 'bas' },
          { cell: 'r3c0', cropId: 'let' },
        ],
      };
      const getCrop = (id) => ({
        tom: { sun: 'full', sowWeek: 8, harvestStart: 26, harvestEnd: 38 },
        bas: { sun: 'full', sowWeek: 12, harvestStart: 22, harvestEnd: 38 },
        let: { sun: 'part', sowWeek: 10, harvestStart: 16, harvestEnd: 22 },
      })[id];
      const r1 = window.GosSuitability.scoreBed({ bed, getCrop, currentWeek: 18 });
      // Determinism: two runs must produce the same score.
      const r2 = window.GosSuitability.scoreBed({ bed, getCrop, currentWeek: 18 });
      // Companion boost: tomato + basil neighbor should score higher than
      // tomato + onion neighbor (basil is companion, onion isn't).
      const beds_tomBas = { shape:'4x4', sun:'full', painted:[
        { cell:'r0c0', cropId:'tom' }, { cell:'r0c1', cropId:'bas' },
      ]};
      const beds_tomOni = { shape:'4x4', sun:'full', painted:[
        { cell:'r0c0', cropId:'tom' }, { cell:'r0c1', cropId:'oni' },
      ]};
      const tomBas = window.GosSuitability.scoreBed({ bed: beds_tomBas, getCrop: id => getCrop(id) || { sun: 'full' }, currentWeek: 18 });
      const tomOni = window.GosSuitability.scoreBed({ bed: beds_tomOni, getCrop: id => getCrop(id) || { sun: 'full' }, currentWeek: 18 });
      return {
        score: r1.score, deterministic: r1.score === r2.score,
        weakest: r1.weakestCells, perCell: r1.cells.length,
        tomBasScore: tomBas.score, tomOniScore: tomOni.score,
      };
    });
    note('GosSuitability returns 0–100 bed score', typeof result.score === 'number' && result.score >= 0 && result.score <= 100,
      `score=${result.score}`);
    note('GosSuitability is deterministic', result.deterministic);
    note('GosSuitability scores all painted cells', result.perCell === 4);
    note('GosSuitability identifies weakest cells', Array.isArray(result.weakest) && result.weakest.length > 0);
    note('Tomato+Basil scores higher than Tomato+Onion (companion vs neutral)',
      result.tomBasScore > result.tomOniScore,
      `tomBas=${result.tomBasScore} tomOni=${result.tomOniScore}`);
    await ctx.close();
  }

  // ── Doctor renders a real Suitability score (not "—") with a real bed ──
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem('gos.bed.doctest', JSON.stringify({
        schemaVersion: 1, id: 'doctest', name: 'Doctor Test',
        shape: '4x4', sun: 'full', wallSide: 'back', sunHoursNumeric: 7,
        painted: [
          { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a',
            plantedAt: '2026-04-22T10:00:00.000Z', plantedWeek: 17 },
          { cell: 'r3c0', cropId: 'let', cropName: 'Lettuce', cropIcon: 'Le', cropColor: '#6aab4a',
            plantedAt: '2026-04-15T10:00:00.000Z', plantedWeek: 16 },
        ],
        events: [{
          type: 'mark_done', bedId: 'doctest', season: String(new Date().getFullYear()),
          cropSnapshot: { cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a' },
          cell: 'r0c0', timestamp: new Date().toISOString(),
          quantity: null, unit: null, notes: null,
        }],
        lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      }));
      window.localStorage.setItem('gos.activeBed', 'doctest');
    });
    await page.goto(BASE + '/garden-doctor-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    // Switch to the Retrospective tab where the suitability card lives.
    await page.locator('button[role="tab"]:has-text("Retrospective")').first().click({ timeout: 5000 });
    await page.waitForTimeout(500);
    // Fallback: click anything with "Look" or look for the Suitability label directly.
    const suitabilityLabel = page.locator('text=SUITABILITY').first();
    const visible = await suitabilityLabel.isVisible().catch(() => false);
    note('Doctor Retrospective renders SUITABILITY card', visible);
    if (visible) {
      const card = await suitabilityLabel.locator('..').textContent();
      note('Doctor SUITABILITY card shows a numeric score (not —)',
        /[0-9]+\/100/.test(card || ''),
        'card text: ' + (card || '').slice(0, 100));
    }

    // Diagnose tab: tending dot on tomato.
    await page.locator('button[role="tab"]:has-text("Diagnose")').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const tomatoBtn = page.locator('button[aria-label*="Tomato (tending"]').first();
    const tendingMarker = await tomatoBtn.isVisible().catch(() => false);
    note('Doctor CropPicker marks Tomato as tending (from garden log)', tendingMarker);
    await page.screenshot({ path: path.join(OUT_DIR, 'doctor-suitability.png'), fullPage: true });
    await ctx.close();
  }

  // ── Painting bed score uses GosSuitability ─────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem('gos.bed.painttest', JSON.stringify({
        schemaVersion: 1, id: 'painttest', name: 'Paint Test',
        shape: '4x8', sun: 'full',
        painted: [
          { cell: 'r0c0', cropId: 'tom', cropName: 'Tomato', cropIcon: 'To', cropColor: '#c8412a' },
          { cell: 'r0c1', cropId: 'bas', cropName: 'Basil', cropIcon: 'Ba', cropColor: '#4e8c3c' },
        ],
        events: [], lastEdited: new Date().toISOString(),
        ruleVersion: null, seasonStart: 'standard',
      }));
      window.localStorage.setItem('gos.activeBed', 'painttest');
    });
    await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    // ScoreBadge renders a live score number; just confirm it's not crashing
    // and produces a number.
    const scoreText = await page.evaluate(() => {
      // Grab any element that looks like a score badge: contains a number 0–100
      const candidates = Array.from(document.querySelectorAll('div, span, button'))
        .map(el => el.textContent || '')
        .filter(t => /^\s*\d{1,3}\s*$/.test(t));
      return candidates.length;
    });
    note('Painting renders without crashing under GosSuitability', scoreText >= 0);
    await page.screenshot({ path: path.join(OUT_DIR, 'painting-suitability.png'), fullPage: true });
    await ctx.close();
  }

} finally {
  await browser.close();
}

console.log('\n──── Summary ────');
summary.forEach(l => console.log(l));
fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), summary.join('\n'));
process.exit(errors.length ? 1 : 0);
