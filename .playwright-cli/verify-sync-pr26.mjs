// Browser verification for PR #26 sync fixes.
//
// Covers:
//   - Baseline page loads, no console errors
//   - Dev Tools Sync & Share UI renders
//   - Import collision behavior (overwrite path + rename path)
//   - Revoke failure preserves retry metadata
//   - Worker GET TTL refresh (mocked at network layer)
//
// Run via:  node .playwright-cli/verify-sync-pr26.mjs
// Requires: a static server running with the repo root at the URL below.

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8771';
const OUT_DIR = path.resolve('.playwright-cli/pr26');
fs.mkdirSync(OUT_DIR, { recursive: true });

const baselinePages = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'how-it-thinks-v5.html',
];

const errors = [];
const summary = [];

function note(label, ok, detail) {
  const icon = ok ? 'PASS' : 'FAIL';
  const line = `[${icon}] ${label}${detail ? ' — ' + detail : ''}`;
  summary.push(line);
  console.log(line);
  if (!ok) errors.push(line);
}

const browser = await chromium.launch();
try {
  // ── Baseline page loads ────────────────────────────────────────────────
  for (const file of baselinePages) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text());
    });
    const resp = await page.goto(BASE + '/' + file, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(800);
    const ok = resp && resp.ok() && consoleErrors.length === 0;
    note('baseline ' + file, ok,
      resp ? ('HTTP ' + resp.status() + (consoleErrors.length ? ' / errors: ' + consoleErrors.length : ''))
           : 'no response');
    if (consoleErrors.length) {
      fs.writeFileSync(path.join(OUT_DIR, 'console-' + file + '.log'),
        consoleErrors.join('\n'));
    }
    await ctx.close();
  }

  // ── Helper: open Dev Tools panel on index-v5 ───────────────────────────
  async function openDevTools(page) {
    // Seed a minimal bed so the Hub doesn't open the cold-start bed creator
    // overlay, which would block the More-tools button on main.
    await page.addInitScript(() => {
      if (!localStorage.getItem('gos.activeBed')) {
        const bed = {
          schemaVersion: 1, id: 'devtools-seed', name: 'Dev Tools Seed',
          shape: '4x4', sun: 'full', painted: [], events: [],
          lastEdited: new Date().toISOString(),
          ruleVersion: null, seasonStart: 'standard',
        };
        localStorage.setItem('gos.bed.devtools-seed', JSON.stringify(bed));
        localStorage.setItem('gos.activeBed', 'devtools-seed');
      }
    });
    await page.goto(BASE + '/index-v5.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    // The hub exposes Dev Tools via a "More tools" button → "Dev Tools" row.
    const moreBtn = page.getByText('More tools', { exact: false }).first();
    await moreBtn.click({ timeout: 8000 });
    // The MoreToolsSheet plays a fade-in transition; wait it out before
    // clicking inside the sheet, otherwise the overlay intercepts the click.
    await page.waitForTimeout(450);
    const devRow = page.locator('[role="dialog"][aria-label="More tools"]')
      .getByText('Dev Tools', { exact: false }).first();
    await devRow.click({ timeout: 8000 });
    await page.waitForTimeout(500);
  }

  // ── Sync UI renders ─────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await openDevTools(page);
    const syncLabel = page.locator('text=SYNC & SHARE');
    const joinLabel = page.locator('text=JOIN A SHARED BED');
    const syncOk = await syncLabel.first().isVisible().catch(() => false);
    const joinOk = await joinLabel.first().isVisible().catch(() => false);
    note('Dev Tools shows SYNC & SHARE label', syncOk);
    note('Dev Tools shows JOIN A SHARED BED', joinOk);
    await page.screenshot({ path: path.join(OUT_DIR, 'devtools-sync-ui.png'), fullPage: true });
    await ctx.close();
  }

  // ── Import collision: rename path ──────────────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Pre-seed an existing local bed before scripts even run.
    await page.addInitScript(() => {
      const id = 'demo-bed';
      window.localStorage.setItem('gos.bed.' + id, JSON.stringify({
        schemaVersion: 1, id, name: 'Local Demo Bed',
        shape: '4x4', sun: 'full', painted: [], events: [],
        lastEdited: new Date().toISOString(), ruleVersion: null,
        seasonStart: 'standard',
      }));
    });

    // Mock the worker GET to return a bed with the same id.
    await page.route('**/beds/COLLIDE-AAAA', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          ok: true,
          updatedAt: new Date().toISOString(),
          data: {
            schemaVersion: 1, id: 'demo-bed', name: 'Shared Demo Bed',
            shape: '4x4', sun: 'partial', painted: [], events: [],
            lastEdited: new Date().toISOString(), ruleVersion: null,
            seasonStart: 'standard',
          },
        }),
      });
    });

    // Cancel the confirm — rename path.
    page.once('dialog', (d) => d.dismiss());

    await openDevTools(page);
    await page.fill('input[placeholder*="Sync code"]', 'COLLIDE-AAAA');
    await page.fill('input[placeholder="Worker URL"]', 'http://example.invalid');
    await page.click('button:has-text("Import")');
    await page.waitForTimeout(900);

    const renamed = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('gos.bed.') === 0 && k !== 'gos.bed.pending') out.push(k);
      }
      return out.sort();
    });
    const hasRenamed = renamed.includes('gos.bed.demo-bed-imported');
    const keepsLocal = renamed.includes('gos.bed.demo-bed');
    note('collision rename: created demo-bed-imported', hasRenamed,
      'keys = ' + renamed.join(','));
    note('collision rename: preserved local demo-bed', keepsLocal);

    // Verify name was annotated.
    if (hasRenamed) {
      const renamedName = await page.evaluate(() => {
        const r = JSON.parse(localStorage.getItem('gos.bed.demo-bed-imported'));
        return r ? r.name : null;
      });
      note('collision rename: name annotated', !!renamedName && /imported/i.test(renamedName),
        'name = ' + renamedName);
    }

    await ctx.close();
  }

  // ── Import collision: overwrite path ───────────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.addInitScript(() => {
      window.localStorage.setItem('gos.bed.demo-bed', JSON.stringify({
        schemaVersion: 1, id: 'demo-bed', name: 'Local Demo Bed',
        shape: '4x4', sun: 'full', painted: [], events: [],
        lastEdited: new Date().toISOString(), ruleVersion: null,
        seasonStart: 'standard',
      }));
    });

    await page.route('**/beds/COLLIDE-BBBB', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          ok: true,
          updatedAt: new Date().toISOString(),
          data: {
            schemaVersion: 1, id: 'demo-bed', name: 'Shared Demo Bed',
            shape: '6x6', sun: 'partial', painted: [], events: [],
            lastEdited: new Date().toISOString(), ruleVersion: null,
            seasonStart: 'standard',
          },
        }),
      });
    });

    page.once('dialog', (d) => d.accept());

    await openDevTools(page);
    await page.fill('input[placeholder*="Sync code"]', 'COLLIDE-BBBB');
    await page.fill('input[placeholder="Worker URL"]', 'http://example.invalid');
    await page.click('button:has-text("Import")');
    await page.waitForTimeout(900);

    const overwritten = await page.evaluate(() => {
      const r = JSON.parse(localStorage.getItem('gos.bed.demo-bed'));
      return r ? { name: r.name, shape: r.shape, sun: r.sun } : null;
    });
    note('collision overwrite: name updated to shared',
      overwritten && overwritten.name === 'Shared Demo Bed',
      'overwritten = ' + JSON.stringify(overwritten));
    note('collision overwrite: shape updated', overwritten && overwritten.shape === '6x6');

    await ctx.close();
  }

  // ── Revoke failure preserves metadata ──────────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Pre-seed sync metadata so the Revoke button shows up.
    await page.addInitScript(() => {
      window.localStorage.setItem('gos.bed.shared-bed', JSON.stringify({
        schemaVersion: 1, id: 'shared-bed', name: 'Shared Bed',
        shape: '4x4', sun: 'full', painted: [], events: [],
        lastEdited: new Date().toISOString(), ruleVersion: null,
        seasonStart: 'standard',
      }));
      window.localStorage.setItem('gos.sync.shared-bed', JSON.stringify({
        code: 'TEST-AAAA',
        secret: 'super-secret-32-hex-chars-fake0000',
        workerUrl: 'https://example.invalid',
        lastPushedAt: new Date().toISOString(),
      }));
      window.localStorage.setItem('gos.sync.workerUrl', 'https://example.invalid');
    });

    // Mock DELETE to simulate a failure that is NOT not_found — e.g. 500.
    await page.route('**/beds/TEST-AAAA', async (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ ok: false, error: 'kv_unavailable' }),
        });
      }
      return route.continue();
    });

    page.once('dialog', (d) => d.accept()); // accept the "Revoke?" confirm

    await openDevTools(page);
    await page.click('button:has-text("Revoke")');
    await page.waitForTimeout(800);

    const meta = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gos.sync.shared-bed') || 'null')
    );
    const ok = meta && meta.code === 'TEST-AAAA' && typeof meta.secret === 'string';
    note('revoke failure preserves sync metadata', ok,
      'meta = ' + JSON.stringify(meta));

    // Toast should show a failure message.
    const toast = await page.locator('[role="status"]').first().textContent().catch(() => '');
    note('revoke failure surfaces toast', /fail|error/i.test(toast || ''),
      'toast = ' + JSON.stringify(toast));

    await ctx.close();
  }

  // ── Revoke success on remote 404 still clears metadata ─────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.addInitScript(() => {
      window.localStorage.setItem('gos.bed.shared-bed', JSON.stringify({
        schemaVersion: 1, id: 'shared-bed', name: 'Shared Bed',
        shape: '4x4', sun: 'full', painted: [], events: [],
        lastEdited: new Date().toISOString(), ruleVersion: null,
        seasonStart: 'standard',
      }));
      window.localStorage.setItem('gos.sync.shared-bed', JSON.stringify({
        code: 'TEST-BBBB',
        secret: 'super-secret-32-hex-chars-fake0000',
        workerUrl: 'https://example.invalid',
        lastPushedAt: new Date().toISOString(),
      }));
      window.localStorage.setItem('gos.sync.workerUrl', 'https://example.invalid');
    });

    await page.route('**/beds/TEST-BBBB', async (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ ok: false, error: 'not_found' }),
        });
      }
      return route.continue();
    });

    page.once('dialog', (d) => d.accept());

    await openDevTools(page);
    await page.click('button:has-text("Revoke")');
    await page.waitForTimeout(800);

    const meta = await page.evaluate(() =>
      localStorage.getItem('gos.sync.shared-bed')
    );
    note('revoke remote-404 clears metadata', meta === null,
      'meta = ' + JSON.stringify(meta));

    await ctx.close();
  }

  // ── Worker TTL refresh on GET (unit-style test against the worker) ─────
  // The worker file is an ES module exporting `default`. Import it and
  // simulate a GET to confirm a put-back with expirationTtl runs.
  {
    const tag = '[worker-ttl] ';
    try {
      // Worker file ships as `.js` with `export default`. Node treats `.js`
      // as CommonJS unless overridden, so copy it to a `.mjs` shim before
      // importing.
      const workerSrc = fs.readFileSync(path.resolve('gos-sync-worker.js'), 'utf8');
      const shim = path.resolve('.playwright-cli/_worker-shim.mjs');
      fs.writeFileSync(shim, workerSrc);
      const mod = await import('file://' + shim.replace(/\\/g, '/'));
      const calls = [];
      const fakeKv = {
        async get(key) {
          if (key === 'bed:TEST-CCCC') {
            return JSON.stringify({
              data: { id: 'shared-bed' },
              updatedAt: '2026-01-01T00:00:00.000Z',
            });
          }
          return null;
        },
        async put(key, value, opts) {
          calls.push({ op: 'put', key, opts });
        },
      };
      const env = { GOS_SYNC: fakeKv };
      const req = new Request('http://example.invalid/beds/TEST-CCCC', { method: 'GET' });
      const res = await mod.default.fetch(req, env);
      const body = await res.json();
      const refreshed = calls.find(
        (c) => c.key === 'bed:TEST-CCCC' && c.opts && c.opts.expirationTtl
      );
      note(tag + 'GET returned ok body', body && body.ok === true);
      note(tag + 'GET refreshed TTL via put with expirationTtl', !!refreshed,
        refreshed ? 'ttl=' + refreshed.opts.expirationTtl : 'no put call seen');
    } catch (e) {
      note(tag + 'worker module test', false, 'threw: ' + (e.stack || e.message || e));
    }
  }
} finally {
  await browser.close();
}

console.log('\n──── Summary ────');
summary.forEach((l) => console.log(l));
fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), summary.join('\n'));
process.exit(errors.length ? 1 : 0);
