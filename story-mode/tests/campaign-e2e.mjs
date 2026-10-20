// Full-campaign browser test (not part of `npm test`): a fresh save played from New Game to the
// ending with real inputs (clicks on Plant / crops / bed cells / Next / Continue, Space for dialogue).
// "Fast-forward" = the scene Skip button and event-driven waits, so a full 12-chapter run takes
// minutes, not the ~40 a person would spend reading.
// Asserts along the way:
//   - the HUD never shows "Ch 13"; the objective banner and event cards carry no dev jargon
//   - the quest box is hidden whenever the harvest reveal, winter review, season card or recap is up
//   - the written ending scene plays, the recap lists 12 chapters, Keep gardening lands in Free Play
//   - the title slot then reads "Free Play · story complete"
// Usage (from story-mode/):
//   npm run build && npx vite preview --port 4175 --host 127.0.0.1
//   GOS_URL=http://127.0.0.1:4175/garden-os/story-mode/ node tests/campaign-e2e.mjs
// Env: GOS_SHOTS (screenshot dir, default <tmpdir>/gos-campaign-e2e), GOS_TIMEOUT_MIN (default 30),
//      GOS_FAST=1 (fast-forward: plant the minimum 8 squares instead of all 32, with shorter
//      click gaps; use it when the box is loaded and a full run would pass ~10 min),
//      GOS_STOP_AT_CHAPTER=N (quick partial run: stop when chapter N is finished; skips the ending checks).
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.GOS_URL || 'http://127.0.0.1:4175/garden-os/story-mode/';
const SHOTS = process.env.GOS_SHOTS || join(tmpdir(), 'gos-campaign-e2e');
const TIMEOUT_MIN = Number(process.env.GOS_TIMEOUT_MIN || 30);
const FAST = process.env.GOS_FAST === '1';
const PLANT_CELLS = FAST ? 8 : 32;
const STOP_AT = Number(process.env.GOS_STOP_AT_CHAPTER || 0);
mkdirSync(SHOTS, { recursive: true });
const JARGON = /Paths \d|Zone: |current_beat|rest_of_season|carry_forward|[+-]\d+(\.\d+)? · /;

const failures = [];
const fail = (msg) => { if (!failures.includes(msg)) { failures.push(msg); console.log('FAIL', msg); } };
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 600 } })).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const saveWarnings = [];
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push(m.text());
  // Save failures are only console.warn'd by the game, so a broken save would otherwise pass silently.
  else if (m.type() === 'warning' && /\[GOS\].*(save|Save|snapshot|Authority)/.test(m.text())) saveWarnings.push(m.text());
});

const st = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const ui = () => page.evaluate(() => {
  const shown = (el) => Boolean(el && el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  const fab = (id) => { const b = document.getElementById(id); return b ? { shown: b.classList.contains('is-visible') && shown(b), enabled: !b.disabled && b.getAttribute('aria-disabled') !== 'true' } : null; };
  const tracker = document.querySelector('.quest-tracker');
  return {
    hudChapter: document.getElementById('hud-chapter')?.textContent?.trim() ?? '',
    helper: document.getElementById('phase-helper')?.textContent?.trim() ?? '',
    dialog: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible') ?? false,
    text: document.querySelector('#dp-text')?.textContent?.trim() ?? '',
    choices: document.querySelectorAll('#dp-choice-row .dp-choice-btn').length,
    skip: shown(document.getElementById('dp-skip-btn')),
    eventCard: document.getElementById('event-card-panel')?.innerText ?? null,
    harvest: Boolean(document.getElementById('harvest-continue')),
    winter: Boolean(document.querySelector('.winter-review-overlay')),
    seasonCard: Boolean(document.getElementById('season-transition-continue')),
    recap: document.getElementById('campaign-recap-overlay')?.innerText ?? null,
    trackerShown: shown(tracker),
    advance: fab('fab-advance'),
    plant: fab('fab-plant'),
  };
});
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

async function plantBed(chapter) {
  await page.locator('#fab-plant').click();
  await page.waitForSelector('#crop-palette-panel [data-crop]');
  const crops = await page.evaluate(() => [...document.querySelectorAll('#crop-palette-panel [data-crop]')].map((e) => e.dataset.crop));
  await page.locator(`#crop-palette-panel [data-crop="${crops[0]}"]`).click();
  await page.waitForFunction(() => !document.querySelector('#crop-palette-panel'));
  const cells = (await page.evaluate(() => window.gardenOS.getVisualDebug().gridCells)).sort((a, b) => a.index - b.index);
  for (const cell of cells.slice(0, PLANT_CELLS)) {
    await page.mouse.click(cell.screenX, cell.screenY);
    await page.waitForTimeout(FAST ? 30 : 60);
  }
  const planted = (await st()).plantedCount;
  if (planted < 8) fail(`chapter ${chapter}: only ${planted} cells planted by clicking the bed`);
  return planted;
}

const endingLines = [];
const shotsTaken = new Set();
let partial = false;
const trackerInPlanning = {};
const chapterTimes = {};
let done = false;
let lastChapter = 0;
let chapterStart = Date.now();
try {
  await page.goto(URL);
  await page.locator('button:has-text("New Game")').first().click();
  await page.locator('button:has-text("Start Story")').click();
  await page.waitForFunction(() => document.body.dataset.storyScreen === 'play' && typeof window.render_game_to_text === 'function' && window.gardenOS?.getVisualDebug, null, { timeout: 120000 });
  let idle = 0;
  let plantedFor = null;
  while (!done) {
    if ((Date.now() - t0) / 60000 > TIMEOUT_MIN) { fail(`timed out after ${TIMEOUT_MIN} min`); break; }
    const s = await st();
    const u = await ui();
    if (/Ch 13/.test(u.hudChapter)) fail(`HUD showed "${u.hudChapter}"`);
    if (u.helper && JARGON.test(u.helper)) fail(`objective banner has jargon: "${u.helper}"`);
    if ((u.harvest || u.winter || u.seasonCard || u.recap) && u.trackerShown) fail(`quest box shown over an overlay in chapter ${s.chapter} ${s.phase}`);
    if (STOP_AT && s.chapter > STOP_AT && s.chapter !== 99) { done = true; partial = true; log('stopping early at chapter', s.chapter); break; }
    if (s.chapter !== lastChapter) {
      if (lastChapter) chapterTimes[lastChapter] = Math.round((Date.now() - chapterStart) / 1000);
      lastChapter = s.chapter; chapterStart = Date.now();
      log('chapter', s.chapter, s.season);
    }

    if (u.recap) {
      await page.waitForTimeout(600);
      await shot('recap');
      if (!/12 chapters/.test(u.recap)) fail(`recap does not list 12 chapters: ${u.recap.slice(0, 160)}`);
      if (!/Keep gardening/.test(u.recap) || !/Main menu/.test(u.recap)) fail('recap is missing Keep gardening / Main menu');
      if (/Chapter 13|Ch 13/.test(u.recap)) fail('recap mentions Chapter 13');
      await page.locator('#btn-endgame-keep').click();
      await page.waitForTimeout(1500);
      const after = await ui(); const sa = await st();
      await shot('keep-gardening');
      if (after.hudChapter !== 'Free Play') fail(`after Keep gardening the HUD reads "${after.hudChapter}"`);
      if (sa.phase !== 'PLANNING' || !after.plant?.shown) fail(`after Keep gardening: phase ${sa.phase}, Plant shown ${after.plant?.shown}`);
      // Main menu: the slot now reads as a finished story in Free Play.
      await page.keyboard.press('Escape');
      await page.locator('#pause-main-menu').click();
      await page.waitForSelector('.save-slot-chapter', { timeout: 30000 });
      const slot = await page.locator('.save-slot-chapter').first().innerText();
      await shot('title-after-ending');
      if (!/Free Play · story complete/.test(slot)) fail(`title slot reads "${slot.trim()}"`);
      done = true;
      break;
    }
    if (u.dialog) {
      idle = 0;
      if (u.text && endingLines.at(-1) !== u.text && s.chapter === 12 && s.phase === 'TRANSITION') endingLines.push(u.text);
      if (u.choices) await page.locator('#dp-choice-row .dp-choice-btn').first().click();
      else if (u.skip) await page.locator('#dp-skip-btn').click();
      else await page.keyboard.press('Space');
      await page.waitForTimeout(250);
      continue;
    }
    if (u.eventCard) {
      idle = 0;
      if (!shotsTaken.has('event-card')) { shotsTaken.add('event-card'); await page.waitForTimeout(500); await shot('event-card'); }
      if (JARGON.test(u.eventCard)) fail(`event card has raw effect text: ${u.eventCard.match(JARGON)[0]}`);
      const accept = page.locator('#event-card-panel [data-intervention="accept_loss"]');
      if (await accept.count()) await accept.click(); else await page.locator('#event-card-panel button:not([disabled])').first().click();
      if (!shotsTaken.has('after-accept')) { shotsTaken.add('after-accept'); await page.waitForTimeout(2500); await shot('after-accept'); }
      await page.waitForTimeout(500);
      continue;
    }
    if (u.harvest) {
      idle = 0;
      if (s.chapter === 1) await shot('ch1-harvest');
      await page.locator('#harvest-continue').click(); await page.waitForTimeout(500); continue;
    }
    if (u.winter) {
      idle = 0;
      if (s.chapter === 4) await shot('ch4-winter-review');
      await page.locator('.winter-review-overlay button', { hasText: /^\s*Continue\s*$/ }).click(); await page.waitForTimeout(500); continue;
    }
    if (u.seasonCard) {
      idle = 0;
      if (s.chapter === 12) await shot('ch12-season-card');
      await page.locator('#season-transition-continue').click(); await page.waitForTimeout(500); continue;
    }
    if (s.phase === 'PLANNING' && u.plant?.shown && !(s.chapter in trackerInPlanning)) trackerInPlanning[s.chapter] = u.trackerShown;
    if (s.phase === 'PLANNING' && s.season !== 'winter' && plantedFor !== `${s.chapter}` && u.plant?.shown) {
      idle = 0; plantedFor = `${s.chapter}`;
      if (s.chapter === 1) await shot('ch1-objective');
      await plantBed(s.chapter);
      if (s.chapter === 1) await shot('ch1-planted');
      continue;
    }
    if (u.advance?.shown && u.advance.enabled) {
      idle = 0;
      await page.locator('#fab-advance').click(); await page.waitForTimeout(400); continue;
    }
    if (++idle > 60) { await shot('STUCK'); fail(`stuck in chapter ${s.chapter} ${s.phase}: ${JSON.stringify(u).slice(0, 300)}`); break; }
    await page.waitForTimeout(250);
  }
  const hiddenInPlay = Object.entries(trackerInPlanning).filter(([, shown]) => !shown).map(([ch]) => ch);
  if (hiddenInPlay.length) fail(`quest box missing during planning in chapter(s) ${hiddenInPlay.join(', ')}`);
  const ENDING = ['Three years. Twelve seasons.', 'The garden stays.'];
  if (!partial) for (const line of ENDING) if (!endingLines.some((t) => t.includes(line))) fail(`ending scene line missing: "${line}" (saw ${endingLines.length} lines)`);
} catch (error) {
  fail(`error: ${error.message.split('\n')[0]}`);
  await shot('ERROR').catch(() => {});
} finally {
  const realErrors = pageErrors.filter((e) => !/GPU stall|KHR_parallel|WebGL/i.test(e));
  if (realErrors.length) fail(`${realErrors.length} console/page errors: ${realErrors[0]}`);
  if (saveWarnings.length) fail(`${saveWarnings.length} save warnings, first: ${saveWarnings[0]}`);
  const minutes = ((Date.now() - t0) / 60000).toFixed(1);
  const result = { pass: failures.length === 0 && done, partial, fast: FAST, minutes, chapterSeconds: chapterTimes, endingLines, failures, saveWarnings: saveWarnings.slice(0, 5) };
  writeFileSync(join(SHOTS, 'results.json'), JSON.stringify(result, null, 2));
  log(result.pass ? 'PASS' : 'FAIL', `campaign run ${minutes} min`, failures.length ? failures.join(' | ') : '');
  if (!result.pass) process.exitCode = 1;
  await browser.close();
}
