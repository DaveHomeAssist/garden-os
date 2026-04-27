// Browser verification for mobile Details bottom sheet.
//
// Run with a static server:
//   BASE=http://127.0.0.1:8775 node .playwright-cli/verify-mobile-details-sheet.mjs

import fs from 'node:fs';
import path from 'node:path';

const PW_PATH = process.env.PLAYWRIGHT_PATH ||
  'C:/Users/Dave RambleOn/AppData/Local/Temp/garden-os-pw/node_modules/playwright/index.mjs';
const pwUrl = 'file:///' + PW_PATH.replace(/\\/g, '/').replace(/^\/+/, '');
const { chromium } = await import(pwUrl);

const BASE = process.env.BASE || 'http://127.0.0.1:8775';
const OUT_DIR = path.resolve('.playwright-cli/mobile-details');
fs.mkdirSync(OUT_DIR, { recursive: true });

const failures = [];
function note(label, ok, detail = '') {
  const line = `[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' - ' + detail : ''}`;
  console.log(line);
  if (!ok) failures.push(line);
}
function wireConsole(page) {
  const messages = [];
  page.on('pageerror', e => messages.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (text.includes('You are using the in-browser Babel transformer')) return;
    messages.push('console.error: ' + text);
  });
  return () => messages;
}

async function scoreOverlapsUndo(page) {
  return page.evaluate(() => {
    const undo = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Undo last action');
    const score = Array.from(document.querySelectorAll('button')).find(b => /^Bed score/.test(b.getAttribute('aria-label') || ''));
    if (!undo || !score) return true;
    const a = undo.getBoundingClientRect();
    const b = score.getBoundingClientRect();
    return !(b.right <= a.left || b.left >= a.right || b.bottom <= a.top || b.top >= a.bottom);
  });
}

async function scoreOverlapsBedCells(page) {
  return page.evaluate(() => {
    const score = Array.from(document.querySelectorAll('button')).find(b => /^Bed score/.test(b.getAttribute('aria-label') || ''));
    const cells = Array.from(document.querySelectorAll('[data-cell]'));
    if (!score || !cells.length) return true;
    const b = score.getBoundingClientRect();
    return cells.some(cell => {
      const a = cell.getBoundingClientRect();
      return !(b.right <= a.left || b.left >= a.right || b.bottom <= a.top || b.top >= a.bottom);
    });
  });
}

async function seedMomGarden(page) {
  await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    const res = await fetch('data/mom-garden-data.json');
    const data = await res.json();
    window.GosBed.mom.loadFromData(data, { overwrite: true, loadedAt: '2026-04-27T12:00:00.000Z' });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
}

const browser = await chromium.launch();
try {
  {
    const firstRun = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const firstRunPage = await firstRun.newPage();
    const firstRunErrors = wireConsole(firstRunPage);
    firstRunPage.on('dialog', d => d.accept());
    await firstRunPage.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
    await firstRunPage.evaluate(() => localStorage.clear());
    await firstRunPage.reload({ waitUntil: 'domcontentloaded' });
    await firstRunPage.waitForTimeout(500);
    await firstRunPage.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent && b.textContent.includes('Load Mom Garden'))
        .click();
    });
    await firstRunPage.waitForTimeout(1000);
    const loaded = await firstRunPage.evaluate(() => window.GosBed && window.GosBed.mom.isLoaded());
    note('First-run Load Mom Garden does not trip React hook order', loaded && firstRunErrors().length === 0, firstRunErrors().join(' | '));
    await firstRun.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  const getErrors = wireConsole(page);
  await seedMomGarden(page);

  note('Tool row says Details', await page.getByText('Details').count() > 0 && await page.getByText('Inspect').count() === 0);
  const scoreOverlap = await scoreOverlapsUndo(page);
  note('Bed score badge does not cover Undo', scoreOverlap === false);
  note('Bed score badge does not cover bed cells', await scoreOverlapsBedCells(page) === false);

  const redLettuceColor = await page.locator('[data-cell="1-0"]').first().getAttribute('data-crop-color');
  const greenLettuceColor = await page.locator('[data-cell="2-0"]').first().getAttribute('data-crop-color');
  note('Red butterhead lettuce renders red', redLettuceColor === '#a83a3a', redLettuceColor || '');
  note('Romaine lettuce stays green', greenLettuceColor === '#6aab4a', greenLettuceColor || '');

  const lettuce = page.locator('[data-cell="2-0"]').first();
  await lettuce.click();
  await page.waitForTimeout(300);
  await page.getByRole('dialog').getByRole('button', { name: 'Details' }).click();
  await page.waitForTimeout(300);
  note('Mobile Details surfaces lettuce variety', await page.getByText('Parris Island Cos').count() > 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const occupied = page.locator('[data-cell="3-0"]').first();
  await occupied.click();
  await page.waitForTimeout(500);
  const cropAfterTap = await page.evaluate(() => {
    const bed = window.GosBed.getActive();
    return bed.painted.find(p => p.cell === 'r3c0')?.cropId;
  });
  note('Paint-mode occupied tap does not overwrite', cropAfterTap === 'peas', cropAfterTap);
  note('Action sheet opens', await page.locator('[role="dialog"][aria-modal="true"]').count() === 1);
  note('Action sheet shows required actions',
    await page.getByText('Details').count() > 0 &&
    await page.getByText('Replace').count() > 0 &&
    await page.getByText('Coming soon').count() > 0 &&
    await page.getByText('Log harvest').count() > 0 &&
    await page.getByText('Ask Doctor').count() > 0 &&
    await page.getByText('Erase').count() > 0);
  const activeText = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
  note('Focus jumps to first sheet button', /Details/.test(activeText || ''), activeText || '');

  await page.getByText('Details').last().click();
  await page.waitForTimeout(300);
  note('Details view shows placement factors', await page.getByText('WHY THIS PLACEMENT').count() > 0 && await page.getByText('RELATED JOURNAL ENTRIES').count() > 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  note('Escape closes sheet', await page.locator('[role="dialog"]').count() === 0);
  const focusCell = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cell'));
  note('Close restores focus to tapped cell', focusCell === '3-0', focusCell || '');

  await occupied.click();
  await page.waitForTimeout(300);
  await page.getByText('Ask Doctor').click();
  await page.waitForURL(/garden-doctor-v5\.html\?/, { timeout: 10000 });
  note('Ask Doctor includes cell params', /bed=raised_bed_left/.test(page.url()) && /cell=r3c0/.test(page.url()) && /crop=peas/.test(page.url()), page.url());

  await page.goto(BASE + '/garden-painting.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await occupied.click();
  await page.waitForTimeout(300);
  await page.getByRole('dialog').getByRole('button', { name: 'Erase' }).click();
  await page.waitForTimeout(500);
  note('Erase shows undo toast', await page.getByText(/Cleared .* from R4·C1/).count() > 0);
  let erased = await page.evaluate(() => !window.GosBed.getActive().painted.some(p => p.cell === 'r3c0'));
  note('Erase removes the cell', erased);
  await page.getByText('Undo').last().click();
  await page.waitForTimeout(700);
  const restored = await page.evaluate(() => window.GosBed.getActive().painted.find(p => p.cell === 'r3c0')?.cropId);
  note('Undo restores erased cell', restored === 'peas', restored || '');

  const desktop = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const desktopPage = await desktop.newPage();
  const desktopErrors = wireConsole(desktopPage);
  await seedMomGarden(desktopPage);
  await desktopPage.getByText('Details').click();
  await desktopPage.locator('[data-cell="3-0"]').first().click();
  await desktopPage.waitForTimeout(500);
  note('Desktop Details stays inline', await desktopPage.locator('[role="dialog"]').count() === 0 && await desktopPage.getByText('Pea, Shelling').count() > 0);
  note('Desktop score badge does not cover Undo', await scoreOverlapsUndo(desktopPage) === false);
  note('Desktop score badge does not cover bed cells', await scoreOverlapsBedCells(desktopPage) === false);
  await desktop.close();

  const narrow = await browser.newContext({ viewport: { width: 800, height: 512 } });
  const narrowPage = await narrow.newPage();
  const narrowErrors = wireConsole(narrowPage);
  await seedMomGarden(narrowPage);
  note('Narrow viewport score badge does not cover Undo', await scoreOverlapsUndo(narrowPage) === false);
  note('Narrow viewport score badge does not cover bed cells', await scoreOverlapsBedCells(narrowPage) === false);
  await narrow.close();

  const wide = await browser.newContext({ viewport: { width: 2048, height: 1209 } });
  const widePage = await wide.newPage();
  const wideErrors = wireConsole(widePage);
  await seedMomGarden(widePage);
  note('Wide viewport score badge does not cover Undo', await scoreOverlapsUndo(widePage) === false);
  note('Wide viewport score badge does not cover bed cells', await scoreOverlapsBedCells(widePage) === false);
  await wide.close();

  const errors = getErrors().concat(desktopErrors()).concat(narrowErrors()).concat(wideErrors());
  if (errors.length) fs.writeFileSync(path.join(OUT_DIR, 'console.log'), errors.join('\n'));
  note('No browser console errors', errors.length === 0, String(errors.length));
  await ctx.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\nFailures:\n' + failures.join('\n'));
  process.exit(1);
}
