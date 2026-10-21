// Free Play browser test (not part of `npm test`): Start Unsaved Free Play, then 3 seasons
// (spring → summer → fall → winter) with mouse-only input: Plant button, crop picker, bed cell
// clicks, Start Season / Next / Harvest / Continue. Dialogue is advanced by clicking the panel
// (Space only if the click misses while the panel animates).
// Fails (exit 1) on: Plant hidden after a season rollover (the old softlock), a stuck phase,
// a counter other than "0 / 32" at start, scene cells != 32, campaign-only text
// ("Year 3 of 3", "Chapter closed", "Paths n", "Zone:", "Quests n/3", festival toasts), or page errors.
// Usage (from story-mode/):
//   npm run build && npx vite preview --port 4317 --strictPort
//   GOS_URL=http://localhost:4317/garden-os/story-mode/ npm run e2e:freeplay
// Env: GOS_OUT (screenshot + log dir, default <tmpdir>/gos-freeplay-e2e), SEASONS (default 3).
import { writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const URL = process.env.GOS_URL || 'http://localhost:4317/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || join(tmpdir(), 'gos-freeplay-e2e'); mkdirSync(OUT, { recursive: true });
const SEASONS = Number(process.env.SEASONS || 3);
const MOUSE_ONLY = process.env.MOUSE_ONLY !== '0'; const keyUses = [];
const t0 = Date.now(); const el = () => Math.round((Date.now() - t0) / 1000);
const LOG = `${OUT}/log.jsonl`; writeFileSync(LOG, '');
const log = (o) => { const r = { t: el(), ...o }; appendFileSync(LOG, JSON.stringify(r) + '\n'); console.log(JSON.stringify(r).slice(0, 300)); };
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 600 } });
await ctx.addInitScript(() => { window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.parentElement?.id === 'toast-container') window.__toasts.push(n.innerText?.trim()); }).observe(document, { childList: true, subtree: true }); });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const st = async () => JSON.parse(await p.evaluate(() => window.render_game_to_text()));
let n = 0; const shot = async (name) => { const f = `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`; await p.screenshot({ path: f }).catch((e) => log({ k: 'shotErr', name, e: e.message.slice(0, 100) })); return f; };
const visBtns = () => p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.offsetParent && x.getClientRects().length).map((x) => (x.innerText || x.getAttribute('aria-label') || x.id || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60));
const ui = () => p.evaluate(() => ({
  dp: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'),
  text: document.querySelector('#dp-text')?.textContent?.trim(),
  event: document.querySelector('#event-card-panel')?.innerText?.replace(/\n+/g, ' | ').slice(0, 400) || null,
  harvest: !!document.querySelector('#harvest-continue'),
  adv: (() => { const a = document.getElementById('fab-advance'); return a ? { shown: a.classList.contains('is-visible'), dis: a.disabled || a.getAttribute('aria-disabled') === 'true', text: a.textContent.trim() } : null; })(),
  plant: (() => { const a = document.getElementById('fab-plant'); return a ? { shown: a.classList.contains('is-visible'), text: a.textContent.trim() } : null; })(),
  helper: document.querySelector('#phase-helper')?.textContent?.trim(), action: document.querySelector('#hud-action')?.textContent?.trim(),
  hud: document.querySelector('#hud, .hud, [class*="hud-top"]')?.innerText?.replace(/\s+/g, ' ').slice(0, 300),
  tracker: document.querySelector('.quest-tracker')?.innerText?.replace(/\s+/g, ' ').trim() || null,
  overlay: document.querySelector('#overlay-container')?.innerText?.replace(/\n+/g, ' | ').slice(0, 600) || null,
}));
const toasts = () => p.evaluate(() => window.__toasts.slice());
const cells = async () => (await p.evaluate(() => window.gardenOS.getVisualDebug().gridCells)).sort((a, b) => a.index - b.index);
const openPalette = async () => { const vis = await p.evaluate(() => document.getElementById('fab-plant')?.classList.contains('is-visible')); if (vis) await p.locator('#fab-plant').click(); else { log({ k: 'NO_PLANT_BUTTON' }); if (MOUSE_ONLY) throw new Error('Plant button hidden: mouse-only player is stuck'); keyUses.push('p'); await p.mouse.move(480, 560); await p.keyboard.press('p'); } await p.waitForTimeout(800); };
async function plantBed(tag, cropOffset = 0, rowsToPlant = 8) {
  await openPalette();
  const crops = await p.evaluate(() => [...document.querySelectorAll('#crop-palette-panel [data-crop]')].map((e) => ({ id: e.dataset.crop, dis: e.disabled || e.getAttribute('aria-disabled') === 'true', txt: e.innerText.replace(/\s+/g, ' ').slice(0, 60) })));
  await shot(`${tag}-crop-picker`);
  log({ k: 'cropPicker', tag, count: crops.length, usable: crops.filter((c) => !c.dis).length, sample: crops.slice(0, 12).map((c) => c.txt) });
  const usable = crops.filter((c) => !c.dis).map((c) => c.id);
  const cs = await cells(); const cols = 8; const rows = Math.round(cs.length / cols);
  log({ k: 'grid', cells: cs.length, rows });
  for (let row = 0; row < Math.min(rows, rowsToPlant); row++) {
    const crop = usable[(row + cropOffset) % usable.length];
    if (row > 0) await openPalette();
    const pick = p.locator(`#crop-palette-panel [data-crop="${crop}"]`);
    if (!(await pick.count())) { log({ k: 'plantMiss', crop }); continue; }
    await pick.click(); await p.waitForTimeout(350);
    for (const c of cs.slice(row * cols, row * cols + cols)) { await p.mouse.click(c.screenX, c.screenY); await p.waitForTimeout(180); }
  }
  await p.waitForTimeout(500);
  const pal = await p.evaluate(() => { const e = document.querySelector('#crop-palette-panel'); return !!(e && e.offsetParent); });
  if (pal) { const x = p.locator('#crop-palette-panel button[aria-label*="Close" i], #crop-palette-panel .close, #crop-palette-close'); if (await x.count()) await x.first().click(); }
  const s = await st(); log({ k: 'planted', tag, planted: s.plantedCells?.length, idx: (s.plantedCells||[]).map((c) => c.index ?? c), paletteOpenAfter: pal, phase: s.phase, score: s.score });
  return s.plantedCells?.length ?? 0;
}
async function runSeason(i, opts = {}) {
  const tS = Date.now(); const s0 = await st(); const info = { i, season: s0.season, startPhase: s0.phase, events: [], toastsBefore: (await toasts()).length };
  log({ k: 'seasonStart', i, season: s0.season, chapter: s0.chapter, phase: s0.phase, ui: await ui() });
  if (opts.plant !== false) info.planted = await plantBed(`s${i}-${s0.season}`, opts.offset ?? 0, opts.rows ?? 8);
  if (i === 1) await shot(`s${i}-planted`);
  let idle = 0, guard = 0;
  while (guard++ < 80) {
    const s = await st(); const u = await ui();
    if (u.dp || s.cutsceneActive) { log({ k: 'dialogue', text: u.text }); await p.locator('#dp-panel').click({ position: { x: 40, y: 20 } }).catch(async () => { keyUses.push('Space'); await p.keyboard.press('Space'); }); await p.waitForTimeout(700); continue; }
    if (u.event) {
      info.events.push(u.event.slice(0, 160)); if (info.events.length === 1) await shot(`s${i}-event`);
      log({ k: 'event', i, text: u.event });
      const acc = p.locator('#event-card-panel [data-intervention="accept_loss"]');
      if (await acc.count()) await acc.first().click(); else await p.locator('#event-card-panel button:not([disabled])').first().click();
      await p.waitForTimeout(1500); continue;
    }
    if (u.harvest) {
      info.harvest = await p.evaluate(() => document.querySelector('#harvest-continue')?.closest('[class*="harvest"]')?.innerText?.replace(/\n+/g, ' | ').slice(0, 700));
      log({ k: 'harvest', i, rev: info.harvest, score: s.harvestResult ?? s.season?.harvestResult ?? null });
      await shot(`s${i}-harvest`);
      await p.locator('#harvest-continue').click(); await p.waitForTimeout(2500); continue;
    }
    const cont = p.locator('button', { hasText: /Continue to|^\s*Continue\s*$/ }).filter({ visible: true });
    if (await cont.count()) {
      const txt = u.overlay || await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent) && x.offsetParent)?.closest('section,[class*="panel"],[class*="overlay"],[role="dialog"]')?.innerText?.replace(/\n+/g, ' | ').slice(0, 700));
      info.complete = txt; log({ k: 'seasonComplete', i, txt }); await shot(`s${i}-season-complete`);
      await cont.first().click(); await p.waitForTimeout(3000);
      const f = await p.evaluate(() => ['fab-advance', 'fab-plant'].map((id) => { const a = document.getElementById(id); return { id, shown: a.classList.contains('is-visible'), dis: a.disabled, text: a.textContent.trim() }; }));
      info.calYear = await p.evaluate(() => document.getElementById('cal-year')?.textContent?.trim()); info.fabAfterRollover = f; log({ k: 'fabAfterRollover', i, f, phase: (await st()).phase });
      if (!f[1].shown) { if (i === 1) await shot(`s${i + 1}-SOFTLOCK-hud-dead`); log({ k: 'SOFTLOCK', i, note: 'Plant hidden after rollover: mouse-only player is stuck' });
        await p.keyboard.press('Escape'); await p.waitForTimeout(1500); await shot(`s${i}-pause-during-softlock`); await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
        log({ k: 'afterPauseWorkaround', f: await p.evaluate(() => ['fab-advance', 'fab-plant'].map((id) => { const a = document.getElementById(id); return { id, shown: a.classList.contains('is-visible'), text: a.textContent.trim() }; })) }); }
      break;
    }
    if (u.adv?.shown && !u.adv.dis) { log({ k: 'advance', phase: s.phase, label: u.adv.text, helper: u.helper }); await p.locator('#fab-advance').click(); await p.waitForTimeout(2200); idle = 0; continue; }
    if (!MOUSE_ONLY && s.phase === 'PLANNING' && !u.adv?.shown && idle === 3) { log({ k: 'workaroundEnter', note: 'Start Season hidden; pressing Enter' }); keyUses.push('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(2200); }
    if (++idle >= 15) { await shot(`STUCK-s${i}`); log({ k: 'STUCK', i, s: JSON.stringify(s).slice(0, 800), u }); break; }
    await p.waitForTimeout(1000);
  }
  info.sec = Math.round((Date.now() - tS) / 1000); info.toasts = (await toasts()).slice(info.toastsBefore);
  const s1 = await st(); info.after = { season: s1.season, phase: s1.phase, planted: s1.plantedCells?.length };
  log({ k: 'seasonDone', ...info });
  return info;
}
const seasons = [];
const require_log = () => readFileSync(LOG, 'utf8').split('\n').filter((l) => !l.includes('CHECK_strings')).join('\n');
try {
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await shot('title'); log({ k: 'title', buttons: await visBtns() });
  // (New Game opens the Story gardener setup; Free Play is chosen from the mode cards)
  await p.locator('[data-mode="freeplay"]').first().click(); await p.waitForTimeout(800);
  await shot('freeplay-selected');
  log({ k: 'setup', text: await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 1500)) });
  const tStart = Date.now();
  await p.locator('.freeplay-start-btn').click();
  await p.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 90000 }); await p.waitForTimeout(4000);
  log({ k: 'loadSec', sec: Math.round((Date.now() - tStart) / 1000) });
  await shot('first-frame');
  const s0 = await st(); writeFileSync(`${OUT}/state-start.json`, JSON.stringify(s0, null, 2));
  log({ k: 'start', ui: await ui(), buttons: await visBtns(), keys: Object.keys(s0), toasts: await toasts() });
  const fx = await p.evaluate(() => ({ crops: document.getElementById('hud-crops')?.textContent?.trim(), year: document.getElementById('cal-year')?.textContent?.trim(), advShown: document.getElementById('fab-advance')?.classList.contains('is-visible'), helper: document.getElementById('phase-helper')?.textContent?.trim(), tracker: (() => { const t = document.querySelector('.quest-tracker'); return t ? { hidden: t.hidden || !t.offsetParent, text: t.innerText.trim() } : null; })() }));
  log({ k: 'CHECK_start', ...fx, stateCells: s0.grid?.length ?? s0.season?.grid?.length ?? null, sceneCells: (await cells()).length });
  // Right-click menu on an empty cell and a world spot
  const cs = await cells();
  const c = cs[cs.length - 1];
  await p.mouse.click(c.screenX, c.screenY, { button: 'right' }); await p.waitForTimeout(900);
  const menu = await p.evaluate(() => document.querySelector('.world-context-menu')?.innerText?.replace(/\n+/g, ' | ') || null);
  log({ k: 'rightClickCell', menu }); await shot('rightclick-empty-cell');
  const ex = p.locator('.world-context-menu button', { hasText: /Examine/ });
  if (await ex.count()) { await ex.first().click(); await p.waitForTimeout(1200); log({ k: 'examine', toasts: (await toasts()).slice(-2) }); } else await p.keyboard.press('Escape');
  await p.mouse.click(120, 520, { button: 'right' }); await p.waitForTimeout(900);
  log({ k: 'rightClickGround', menu: await p.evaluate(() => document.querySelector('.world-context-menu')?.innerText?.replace(/\n+/g, ' | ') || null) }); await shot('rightclick-ground');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  // Pause menu
  await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
  log({ k: 'pause', text: await p.evaluate(() => (document.querySelector('#pause-overlay, [class*="pause"]')?.innerText || '').replace(/\n+/g, ' | ').slice(0, 1200)), buttons: await visBtns() });
  await shot('pause');
  log({ k: 'CHECK_pauseMainMenu', copy: await p.evaluate(() => document.querySelector('#pause-main-menu .pause-action__copy')?.textContent?.trim()) });
  await p.keyboard.press('Escape'); await p.waitForTimeout(1000);
  // Seasons
  for (let i = 1; i <= SEASONS; i++) {
    const opts = { offset: (i - 1) * 4 };
    seasons.push(await runSeason(i, opts));
    if (i === 1) {
      // right-click a planted cell after rollover (should be empty again)
      const cs2 = await cells(); const c2 = cs2[3];
      await p.mouse.click(c2.screenX, c2.screenY, { button: 'right' }); await p.waitForTimeout(900);
      log({ k: 'rightClickAfterRollover', menu: await p.evaluate(() => document.querySelector('.world-context-menu')?.innerText?.replace(/\n+/g, ' | ') || null), planted: (await st()).plantedCells?.length });
      await shot('s2-start-bed'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    }
  }
  // Mid-season right-click + world tools
  await shot('before-refresh'); const sPre = await st();
  log({ k: 'preRefresh', season: sPre.season, chapter: sPre.chapter, history: sPre.campaign?.seasonHistory ?? sPre.seasonHistory ?? null, inv: JSON.stringify(sPre.inventory ?? sPre.pantry ?? null).slice(0, 400) });
  const allToasts = await toasts(); const logText = require_log();
  const banned = /Year 3 of 3|Chapter closed|Winter chapter|Paths \d|Zone:|Quests \d\/3|Festival is on|Festival Grounds/;
  log({ k: 'CHECK_strings', bannedInToasts: allToasts.filter((t) => banned.test(t)), bannedInLog: (logText.match(new RegExp(banned.source, 'g')) || []).slice(0, 10), plantingToasts: allToasts.filter((t) => /planted/.test(t)).length, keyUses, endYear: await p.evaluate(() => document.getElementById('cal-year')?.textContent?.trim()), endHelper: await p.evaluate(() => document.getElementById('phase-helper')?.textContent?.trim()) });
  log({ k: 'summary', min: ((Date.now() - tStart) / 60000).toFixed(1), seasons: seasons.map((s) => ({ i: s.i, season: s.season, sec: s.sec, events: s.events.length, planted: s.planted, harvest: s.harvest?.slice(0, 200) })), errs: errs.slice(0, 20) });
} catch (e) { log({ k: 'ERROR', msg: e.message.split('\n')[0] }); await shot('ERROR'); }
finally { writeFileSync(`${OUT}/seasons.json`, JSON.stringify(seasons, null, 2)); writeFileSync(`${OUT}/errors.json`, JSON.stringify(errs, null, 2)); await b.close(); }
// Verdict
const rows = readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const failures = [];
for (const r of rows) {
  if (['SOFTLOCK', 'STUCK', 'NO_PLANT_BUTTON', 'ERROR'].includes(r.k)) failures.push(`${r.k}: ${r.note || r.msg || ''}`);
  if (r.k === 'CHECK_start') {
    if (r.crops !== '0 / 32') failures.push(`counter reads "${r.crops}", expected "0 / 32"`);
    if (r.sceneCells !== 32) failures.push(`scene draws ${r.sceneCells} cells, expected 32`);
    if (!/^Year 1 · Spring$/.test(r.year || '')) failures.push(`calendar reads "${r.year}"`);
  }
  if (r.k === 'CHECK_strings') {
    if (r.bannedInToasts.length || r.bannedInLog.length) failures.push(`campaign text in Free Play: ${[...r.bannedInToasts, ...r.bannedInLog].join(' | ')}`);
  }
}
if (seasons.length < SEASONS) failures.push(`finished ${seasons.length}/${SEASONS} seasons`);
if (errs.length) failures.push(`page errors: ${errs.slice(0, 3).join(' | ')}`);
console.log(failures.length ? `FAIL\n- ${failures.join('\n- ')}` : `PASS: ${seasons.length} Free Play seasons, mouse only`);
process.exit(failures.length ? 1 : 0);
