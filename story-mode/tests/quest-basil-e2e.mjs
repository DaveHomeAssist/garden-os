// Browser smoke test (not part of `npm test`): plays Lila's "Fresh Basil, Please" end to end on a
// production build: new game -> walk to the Neighborhood -> accept -> plant 3 basil and play the
// season -> Continue to Chapter 2 -> walk back and turn in -> Main Menu > Continue.
// Real inputs only: held-key walking, E to talk, clicks on dialogue choices / HUD / bed cells.
// window.render_game_to_text() and window.gardenOS.quests are read for assertions, never written.
// Takes about 5-6 minutes headless (swiftshader). Exit code 1 if any step fails.
// Usage (from story-mode/):
//   npm run build && npx vite preview --port 4175 --host 127.0.0.1
//   GOS_URL=http://127.0.0.1:4175/garden-os/story-mode/ node tests/quest-basil-e2e.mjs
// Screenshots and results.json go to $GOS_SHOTS (default: <tmpdir>/gos-quest-basil-e2e).
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const SHOTS = process.env.GOS_SHOTS || join(tmpdir(), 'gos-quest-basil-e2e');
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.GOS_URL || 'http://127.0.0.1:4175/garden-os/story-mode/';
const pageErrors = [];
async function launch(vp) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: vp });
  // Record every toast shown (they fade quickly) so rewards can be reported exactly.
  await ctx.addInitScript(() => {
    window.__toasts = [];
    new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) { if (n.nodeType === 1 && n.parentElement?.id === 'toast-container') window.__toasts.push(n.innerText?.trim()); } })
      .observe(document, { childList: true, subtree: true });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { pageErrors.push(e.message); console.log('PAGEERR', e.message); });
  p.on('console', (m) => { if (m.type() === 'error') { pageErrors.push(m.text()); console.log('CONSOLE', m.text()); } });
  return { b, p };
}
const st = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function pos(p) { const s = await st(p); return { ...s.player.position, zone: s.currentZone }; }
const dialog = (p) => p.evaluate(() => ({
  visible: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'),
  speaker: document.querySelector('#dp-panel')?.dataset.speaker,
  text: document.querySelector('#dp-text')?.textContent?.trim(),
  choices: [...document.querySelectorAll('#dp-choice-row .dp-choice-btn')].map((b) => b.textContent.trim()),
}));
// Per-axis pulse walker: ~0.9 m per 400 ms pulse at 480x320 headless; feedback after each pulse.
const K = 0.9 / 400;
async function pulse(p, key, ms) { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(250); }
async function axisTo(p, axis, target, tol = 0.25) {
  let last = null; let same = 0;
  for (let i = 0; i < 40; i++) {
    const c = await pos(p);
    if (last && c.zone !== last.zone) return { ok: true, at: c, zoneChanged: true };
    const delta = target - c[axis];
    if (Math.abs(delta) <= tol) return { ok: true, at: c };
    if (last && Math.abs(c[axis] - last[axis]) < 0.01) { if (++same >= 3) return { ok: false, blocked: true, at: c }; } else same = 0;
    last = c;
    const key = axis === 'z' ? (delta < 0 ? 'w' : 's') : (delta > 0 ? 'd' : 'a');
    await pulse(p, key, Math.round(Math.min(500, Math.max(40, Math.abs(delta) / K * 0.85))));
  }
  return { ok: false, at: await pos(p) };
}
async function goTo(p, x, z, { order = 'xz', tol = 0.25 } = {}) {
  for (const axis of order) { const r = await axisTo(p, axis, axis === 'x' ? x : z, tol); if (!r.ok || r.zoneChanged) return { ...r, target: [x, z] }; }
  return { ok: true, at: await pos(p) };
}
async function pulseUntilZone(p, key, zone, max = 20) {
  for (let i = 0; i < max; i++) { const c = await pos(p); if (c.zone === zone) return { ok: true, at: c }; await pulse(p, key, 300); }
  const c = await pos(p); return { ok: c.zone === zone, at: c };
}
const hudText = (p) => p.evaluate(() => ({
  tracker: document.querySelector('.quest-tracker')?.innerText?.replace(/\s+\n/g, '\n').trim() ?? null,
  log: document.querySelector('#quest-log-panel')?.innerText?.trim() ?? null,
  toasts: [...document.querySelectorAll('#toast-container > *')].map((t) => t.innerText.trim()).filter(Boolean),
}));
async function openLogText(p) {
  if (!(await p.locator('#quest-log-panel').count())) { await p.keyboard.press('q'); await p.waitForTimeout(900); }
  const t = await hudText(p);
  return t;
}
async function closeLog(p) { if (await p.locator('#quest-log-panel').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(600); } }
// Options: GOS_BASIL=back|front (back = cells 0-2, front = cells 24-26), GOS_MAX_SEASONS (default 4).
const BASIL_ROW = process.env.GOS_BASIL || 'back'; // cells 0-7 are the 'Back · Wall' row, 24-31 'Front · Access'
const MAX_SEASONS = Number(process.env.GOS_MAX_SEASONS || 4);
const SMALL = { width: 480, height: 320 }; // swiftshader: small viewport keeps the frame rate usable for walking
const BIG = { width: 1280, height: 800 };
const { b, p } = await launch(SMALL);
const results = []; const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
async function shot(name) { await p.setViewportSize(BIG); await p.waitForTimeout(1800); await p.screenshot({ path: `${SHOTS}/${name}.png` }); await p.setViewportSize(SMALL); await p.waitForTimeout(600); }
async function step(name, fn) {
  let ok = false, detail = null;
  try { detail = await fn(); ok = detail?.ok !== false; } catch (e) { detail = { error: e.message.split('\n')[0] }; }
  results.push({ step: name, pass: ok, detail }); log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail)?.slice(0, 300));
  writeFileSync(`${SHOTS}/results.json`, JSON.stringify(results, null, 2));
  if (!ok) { await shot(`FAIL-${name.replace(/\W+/g, '-')}`); throw new Error(`step failed: ${name}`); }
}
const snap = () => p.evaluate(() => window.gardenOS.quests.getSnapshot());
const basil = async () => { const s = await snap(); const q = s.active.find((x) => x.id === 'lila_basil'); return { state: q?.state ?? (s.completed.includes('lila_basil') ? 'COMPLETED' : 'none'), current: q?.progress?.[0]?.current ?? null }; };
async function waitChoices(timeout = 15000) { const t = Date.now(); while (Date.now() - t < timeout) { const d = await dialog(p); if (d.choices.length || !d.visible) return d; await p.waitForTimeout(400); } return dialog(p); }
async function pick(re) { const d = await waitChoices(); const btn = p.locator('#dp-choice-row .dp-choice-btn').filter({ hasText: re }); if (!(await btn.count())) return { picked: null, choices: d.choices }; const label = (await btn.first().textContent()).trim(); await btn.first().click(); await p.waitForTimeout(800); return { picked: label }; }
async function closeDialog() { for (let i = 0; i < 8; i++) { const d = await waitChoices(6000); if (!d.visible) return; if (d.choices.length) await p.locator('#dp-choice-row .dp-choice-btn').last().click(); else await p.keyboard.press('Space'); await p.waitForTimeout(900); } }
// Event cards: take the "Accept" (accept_loss) response so no bed targeting is needed.
async function chooseAccept() {
  const acc = p.locator('#event-card-panel [data-intervention="accept_loss"]');
  eventsSeen.push(await p.evaluate(() => document.querySelector('#event-card-panel h2, #event-card-panel .event-card__title')?.textContent?.trim() ?? document.querySelector('#event-card-panel')?.innerText?.split('\n').slice(0, 3).join(' | ')));
  if (await acc.count()) await acc.first().click(); else await p.locator('#event-card-panel button:not([disabled])').first().click();
}
const eventsSeen = [];
async function homeToNeighborhood() {
  await goTo(p, 3.0, 2.2); await goTo(p, 3.0, -4.5, { order: 'z' }); await goTo(p, 0.8, -7.4);
  const r = await pulseUntilZone(p, 'w', 'neighborhood'); await p.waitForTimeout(2000); return r;
}
async function neighborhoodToLila() { return goTo(p, -1, -2.3, { order: 'zx', tol: 0.2 }); }
async function talkToLila() {
  const hl = (await st(p)).highlightedInteraction?.label ?? null;
  await p.keyboard.press('e'); await p.waitForTimeout(1500);
  return hl;
}

try {
  await step('0. New game, skip the intro', async () => {
    await p.goto(URL); await p.waitForTimeout(1500);
    await p.locator('button:has-text("New Game")').first().click(); await p.waitForTimeout(800);
    await p.locator('button:has-text("Start Story")').click();
    await p.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 30000 }); await p.waitForTimeout(2500);
    const before = await dialog(p);
    await p.locator('#dp-skip-btn').click(); await p.waitForTimeout(1200);
    const after = await dialog(p); const s = await st(p);
    await shot('00-intro-skipped');
    return { ok: !after.visible && !s.cutsceneActive && s.player.enabled !== false, introText: before.text?.slice(0, 160), dialogAfterSkip: after.visible, phase: s.phase, zone: s.currentZone, controlsEnabled: s.player.enabled, hud: await hudText(p) };
  });

  await step('1. Walk to the neighborhood', async () => {
    const r = await homeToNeighborhood();
    await shot('01-neighborhood');
    return { ok: r.at.zone === 'neighborhood', at: r.at };
  });

  await step('2. Talk to Lila and accept', async () => {
    const near = await neighborhoodToLila();
    const prompt = await talkToLila();
    const greet = await waitChoices();
    await shot('02a-lila-greeting');
    const a = await pick(/New request/);
    const offer = await waitChoices();
    await shot('02b-lila-offer');
    const c = await pick(/I'll do it/);
    const afterAccept = await dialog(p);
    await closeDialog();
    const q = await basil();
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    const hud = await hudText(p);
    await p.screenshot({ path: `${SHOTS}/02c-accepted-tracker.png` });
    const lg = await openLogText(p);
    await p.screenshot({ path: `${SHOTS}/02d-quest-log-active.png` });
    await closeLog(p); await p.setViewportSize(SMALL); await p.waitForTimeout(600);
    const trackerOk = /Fresh Basil, Please/i.test(hud.tracker ?? '') && /0\/3/.test(hud.tracker ?? '');
    const logOk = /Active\s*1[\s\S]*Fresh Basil, Please[\s\S]*In progress[\s\S]*0\/3/i.test(lg.log ?? '');
    return { ok: q.state === 'IN_PROGRESS' && trackerOk && logOk, trackerOk, logOk, prompt, greet, a, offer, c, afterAccept, quest: q, tracker: hud.tracker, toasts: hud.toasts, log: lg.log, at: near.at };
  });

  // One season: plant 3 basil (+ filler until Start Season is enabled), play every phase, click
  // "Continue to Chapter N", and stop in the next PLANNING. Returns what happened.
  async function playSeason(n) {
    const out = { n, basilIdx: null, planted: 0, events: [], chapterCard: null, progress: [], reveal: null };
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    await p.locator('#fab-plant').click(); await p.waitForTimeout(800);
    const crops = await p.evaluate(() => [...document.querySelectorAll('#crop-palette-panel [data-crop]')].map((e) => e.dataset.crop));
    out.crops = crops;
    if (!crops.includes('basil')) { out.error = 'basil not in crop picker'; return out; }
    await p.locator('#crop-palette-panel [data-crop="basil"]').click(); await p.waitForTimeout(500);
    const ordered = (await p.evaluate(() => window.gardenOS.getVisualDebug().gridCells)).sort((a, b) => a.index - b.index);
    const basilIdx = BASIL_ROW === 'front' ? ordered.slice(24, 27) : ordered.slice(0, 3);
    out.basilIdx = basilIdx.map((c) => c.index);
    for (const c of basilIdx) { await p.mouse.click(c.screenX, c.screenY); await p.waitForTimeout(350); }
    const filler = crops.find((id) => id !== 'basil');
    await p.locator('#fab-plant').click(); await p.waitForTimeout(800);
    await p.locator(`#crop-palette-panel [data-crop="${filler}"]`).click(); await p.waitForTimeout(500);
    for (const c of ordered.slice(8, 20)) {
      const ready = await p.evaluate(() => { const a = document.querySelector('#fab-advance'); return a && a.classList.contains('is-visible') && !a.disabled && a.getAttribute('aria-disabled') !== 'true'; });
      if (ready) break;
      await p.mouse.click(c.screenX, c.screenY); await p.waitForTimeout(350);
    }
    const planted = await p.evaluate(() => JSON.parse(window.render_game_to_text()).plantedCells);
    out.planted = planted.length; out.basilPlanted = planted.filter((c) => JSON.stringify(c).includes('basil')).length;
    await p.screenshot({ path: `${SHOTS}/03-s${n}a-planted.png` });
    await p.setViewportSize(SMALL); await p.waitForTimeout(600);
    let idle = 0;
    for (let i = 0; i < 120; i++) {
      const s = JSON.parse(await p.evaluate(() => window.render_game_to_text()));
      const ui = await p.evaluate(() => ({
        dp: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'),
        choices: document.querySelectorAll('#dp-choice-row .dp-choice-btn').length,
        event: Boolean(document.querySelector('#event-card-panel')),
        harvest: Boolean(document.querySelector('#harvest-continue')),
        adv: (() => { const a = document.querySelector('#fab-advance'); return a && getComputedStyle(a).display !== 'none' && !a.disabled && a.getAttribute('aria-disabled') !== 'true' ? a.textContent.trim() : null; })(),
      }));
      const q = await basil(); if (q.current !== out.progress.at(-1)) out.progress.push(q.current);
      const chapterBtn = p.locator('button', { hasText: /Continue to Chapter/ });
      if (await chapterBtn.count()) {
        await p.setViewportSize(BIG); await p.waitForTimeout(1200);
        out.chapterCard = { text: await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Continue to Chapter/.test(b.textContent))?.parentElement?.innerText?.trim()), basil: q.current };
        await p.screenshot({ path: `${SHOTS}/03-s${n}c-chapter-complete.png` });
        await chapterBtn.first().click(); await p.waitForTimeout(2500);
        await p.setViewportSize(SMALL); await p.waitForTimeout(600);
        continue;
      }
      if (out.chapterCard && s.phase === 'PLANNING' && !s.cutsceneActive && !ui.dp) { out.endPhase = s.phase; out.chapter = s.chapter; out.season = s.season; return out; }
      if (ui.harvest) {
        await p.setViewportSize(BIG); await p.waitForTimeout(1200);
        out.reveal = await p.evaluate(() => document.querySelector('#harvest-continue')?.closest('[class*="harvest"]')?.innerText?.replace(/\n+/g, ' | ').slice(0, 400));
        await p.screenshot({ path: `${SHOTS}/03-s${n}b-harvest-reveal.png` });
        await p.locator('#harvest-continue').click(); await p.waitForTimeout(1500);
        await p.setViewportSize(SMALL); await p.waitForTimeout(600);
      } else if (s.cutsceneActive || ui.dp) {
        if (ui.choices) await p.locator('#dp-choice-row .dp-choice-btn').first().click();
        else if (await p.locator('#dp-skip-btn').isVisible()) await p.locator('#dp-skip-btn').click();
        else await p.keyboard.press('Space');
        await p.waitForTimeout(1200);
      } else if (ui.event) { await chooseAccept(); out.events.push(eventsSeen.at(-1)); await p.waitForTimeout(1200); }
      else if (ui.adv) { idle = 0; await p.locator('#fab-advance').click(); await p.waitForTimeout(1800); }
      else if (++idle >= 25) {
        // Controls never came back (no cutscene, no event card, advance button hidden): record and stop.
        await p.screenshot({ path: `${SHOTS}/STUCK-controls-disabled.png` });
        out.stuckDiag = await p.evaluate(() => ({
          text: window.render_game_to_text(),
          cutsceneLayer: document.querySelector('#cutscene-layer')?.outerHTML?.slice(0, 300),
          overlay: document.querySelector('#overlay-container')?.innerText?.slice(0, 300),
          panels: document.querySelector('#panel-container')?.innerText?.slice(0, 300),
          dpPanel: document.querySelector('#dp-panel')?.className,
          phaseHelper: document.querySelector('#phase-helper')?.textContent,
          banner: document.querySelector('.objective-banner, [class*="objective"]')?.innerText?.slice(0, 200),
          active: document.activeElement?.id || document.activeElement?.className,
        }));
        out.stuck = { phase: s.phase, fabs: await p.evaluate(() => [...document.querySelectorAll('#fab-advance, #fab-plant')].map((b) => ({ id: b.id, text: b.textContent.trim(), visible: b.classList.contains('is-visible'), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true' }))) };
        return out;
      } else await p.waitForTimeout(1000);
    }
    out.error = 'season did not finish in 120 iterations';
    return out;
  }

  await step('3. Plant basil, run seasons until Harvest Basil reaches 3/3', async () => {
    await goTo(p, 0, 6.2, { order: 'xz' }); // gate post at (0.7, 7.1) since #63
    const home = await pulseUntilZone(p, 's', 'player_plot'); await p.waitForTimeout(2000);
    await goTo(p, 0.8, -7.4, { order: 'xz' }); await goTo(p, 3.0, -4.5, { order: 'xz' }); await goTo(p, 3.0, 2.4, { order: 'z' }); await goTo(p, 0, 2.55, { order: 'x' });
    const seasons = [];
    for (let n = 1; n <= MAX_SEASONS; n++) {
      const r = await playSeason(n); seasons.push(r);
      log('season', n, JSON.stringify(r).slice(0, 600));
      if (r.error || r.stuck || !r.chapterCard) break;
      if (((await basil()).current ?? 0) >= 3) break;
      const at = await pos(p);
      if (at.zone === 'player_plot' && Math.hypot(at.x, at.z - 2.55) > 0.6) await goTo(p, 0, 2.55, { order: 'xz' });
    }
    const q = await basil();
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    const hud = await hudText(p);
    await p.screenshot({ path: `${SHOTS}/03d-after-seasons-tracker.png` });
    const lg = await openLogText(p);
    await p.screenshot({ path: `${SHOTS}/03e-quest-log-after-seasons.png` });
    await closeLog(p); await p.setViewportSize(SMALL); await p.waitForTimeout(800);
    const s = await st(p);
    return { ok: (q.current ?? 0) >= 3 && home.at.zone === 'player_plot', BASIL_ROW, home: home.at, quest: q, seasonsPlayed: seasons.length, seasons, chapter: s.chapter, season: s.season, phase: s.phase, tracker: hud.tracker, log: lg.log };
  });

  await step('4. Return and turn in', async () => {
    const at = await pos(p);
    if (at.zone === 'player_plot') {
      // Next chapter may respawn the player in front of the bed; route round it.
      await goTo(p, 3.0, at.z > 0 ? 2.4 : at.z, { order: 'xz' });
      await homeToNeighborhood();
    }
    const before = await st(p); const toastMark = await p.evaluate(() => window.__toasts.length);
    const near = await neighborhoodToLila();
    const prompt = await talkToLila();
    const readyDlg = await dialog(p);
    await shot('04a-lila-ready');
    const d = await waitChoices();
    const r = await pick(/basil|turn in|hand|deliver|fresh/i);
    const d2 = await waitChoices();
    await shot('04b-turn-in-choice');
    const outcome = d2.choices.length ? await pick(/./) : null;
    const afterDlg = await dialog(p);
    await closeDialog();
    const q = await basil(); const s = await snap(); const after = await st(p); const turnInToasts = await p.evaluate((m) => window.__toasts.slice(m), toastMark);
    await p.setViewportSize(BIG); await p.waitForTimeout(1200);
    const hud = await hudText(p);
    await p.screenshot({ path: `${SHOTS}/04c-turned-in-tracker.png` });
    const lg = await openLogText(p);
    await p.screenshot({ path: `${SHOTS}/04d-quest-log-completed.png` });
    await closeLog(p); await p.setViewportSize(SMALL); await p.waitForTimeout(600);
    writeFileSync(`${SHOTS}/state-before-turnin.json`, JSON.stringify(before, null, 2));
    writeFileSync(`${SHOTS}/state-after-turnin.json`, JSON.stringify(after, null, 2));
    return { ok: s.completed.includes('lila_basil') && /Completed\s*1[\s\S]*Fresh Basil, Please/i.test(lg.log ?? ''), prompt, readyDlg, d, r, d2, outcome, afterDlg, turnInToasts, quest: q, completed: s.completed, tracker: hud.tracker, toasts: hud.toasts, log: lg.log, at: near.at };
  });

  await step('5. Main Menu > Continue shows the quest completed', async () => {
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
    await p.locator('#pause-main-menu').click(); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${SHOTS}/05a-main-menu.png` });
    await p.locator('button:has-text("Continue")').first().click();
    await p.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 30000 }); await p.waitForTimeout(3000);
    const s = await snap(); const where = await st(p);
    await p.keyboard.press('q'); await p.waitForTimeout(1200);
    const logText = await p.evaluate(() => document.querySelector('#quest-log-panel')?.innerText ?? null);
    const tracker = (await hudText(p)).tracker;
    await p.screenshot({ path: `${SHOTS}/05b-continue-quest-log.png` });
    return { ok: s.completed.includes('lila_basil') && !s.active.some((q) => q.id === 'lila_basil') && /Completed\s*1[\s\S]*Fresh Basil, Please/i.test(logText ?? ''), completed: s.completed, active: s.active.map((q) => q.id), logCompleted: /Completed\s*1[\s\S]*Fresh Basil, Please/i.test(logText ?? ''), tracker, logText, chapter: where.chapter, season: where.season, phase: where.phase, zone: where.currentZone };
  });
} catch (e) { log('stopped:', e.message); process.exitCode = 1; }
finally { writeFileSync(`${SHOTS}/page-errors.json`, JSON.stringify(pageErrors, null, 2)); log(results.every((r) => r.pass) && results.length === 6 ? 'ALL PASS' : 'FAILED', 'total', ((Date.now() - t0) / 1000).toFixed(0) + 's'); if (!(results.every((r) => r.pass) && results.length === 6)) process.exitCode = 1; await b.close(); }
