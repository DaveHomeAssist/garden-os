// Browser verification for Mom Garden data handoff.
//
// Run with a static server:
//   BASE=http://127.0.0.1:8774 node .playwright-cli/verify-mom-garden-data.mjs

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8774';
const OUT_DIR = path.resolve('.playwright-cli/mom-garden');
fs.mkdirSync(OUT_DIR, { recursive: true });

const failures = [];
function note(label, ok, detail = '') {
  const line = `[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' - ' + detail : ''}`;
  console.log(line);
  if (!ok) failures.push(line);
}

function wireConsole(page, label) {
  const messages = [];
  page.on('pageerror', e => messages.push('pageerror: ' + e.message));
  page.on('console', m => {
    const text = m.text();
    if (m.type() !== 'error') return;
    if (text.includes('You are using the in-browser Babel transformer')) return;
    if (text.includes("unsupported MIME type ('text/plain')")) return;
    messages.push('console.error: ' + text);
  });
  return async () => {
    if (messages.length) {
      fs.writeFileSync(path.join(OUT_DIR, `${label}.log`), messages.join('\n'));
    }
    return messages;
  };
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleCheck = wireConsole(page, 'console');
  page.on('dialog', d => d.accept());

  await page.goto(BASE + '/index-v5.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  note('Hub renders Mom tile', await page.getByText("Mom's Garden").count() > 0);
  await page.getByText("Mom's Garden").click();
  await page.waitForURL(/garden-painting\.html/, { timeout: 10000 });
  await page.waitForTimeout(1000);

  const loadState = await page.evaluate(() => ({
    bedCount: window.GosBed.readAll().length,
    active: window.GosBed.getActive() && window.GosBed.getActive().id,
    plantings: window.GosBed.readAll().reduce((sum, bed) => sum + (bed.painted || []).length, 0),
    isMomLoaded: window.GosBed.mom.isLoaded(),
  }));
  note('Mom data loads to localStorage', loadState.bedCount === 3 && loadState.plantings === 40 && loadState.isMomLoaded, JSON.stringify(loadState));
  note('Beds page title is Beds', await page.locator('text=Beds').count() > 0);
  note('Paint tool label remains', await page.locator('button:has-text("Paint")').count() > 0);
  note('Variety/status visible on Beds page', await page.locator('text=Wando').count() > 0 && await page.locator('text=Sprouted').count() > 0);

  await page.getByText('Grow Bags').click();
  await page.waitForTimeout(500);
  note('Grow Bags renders bag data', await page.locator('text=Bag 1').count() > 0 && await page.locator('text=Garlic').count() > 0);
  await page.evaluate(() => window.GosBed.setActive('raised_bed_left'));

  await page.goto(BASE + '/garden-planner-v5.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  note('Planner sees Mom beds', await page.locator('text=Raised Bed Left').count() > 0 && await page.locator('text=Grow Bags').count() > 0);
  const plannerState = await page.evaluate(() => {
    const left = window.GosBed.read('raised_bed_left');
    return {
      leftCells: left?.painted?.length || 0,
      hasWando: !!left?.painted?.some((p) => p.varietyName === 'Wando'),
      hasMarvel: !!left?.painted?.some((p) => p.varietyName === 'Marvel of Four Seasons'),
    };
  });
  note('Planner storage preserves Mom cell data', plannerState.leftCells === 16 && plannerState.hasWando && plannerState.hasMarvel, JSON.stringify(plannerState));

  await page.goto(BASE + '/garden-doctor-v5.html?crop=peas&variety=Wando&cell=r0c0&bed=raised_bed_left', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  note('Doctor renders URL context', await page.locator('text=TRIAGING').count() > 0 && await page.locator('text=Wando').count() > 0);

  await page.goto(BASE + '/journal.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  note('Journal renders Mom entries', await page.locator('text=Mom Garden').count() > 0 && await page.locator('text=Loaded Mom Garden data').count() > 0);

  await page.goto(BASE + '/sw.js', { waitUntil: 'domcontentloaded' });
  const swText = await page.textContent('body');
  note('Service worker precaches Mom JSON', swText.includes('data/mom-garden-data.json'));

  const errors = await consoleCheck();
  note('No browser console errors', errors.length === 0, errors.length ? `${errors.length} errors` : '');
  await ctx.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nFailures:\n' + failures.join('\n'));
  process.exit(1);
}
