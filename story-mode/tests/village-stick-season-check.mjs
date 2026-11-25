// Village Move stick by season/phase (manual, not a CI gate), 390x844
// (isMobile, hasTouch, DPR 3). Seeds a Free Play save (needs the vite dev
// server: it imports ./src), optionally presses the phase button ADVANCE
// times, travels to the village and drags the stick up / right / down through
// real CDP touch events. Nov 23 live playthrough: the stick moved 0 m in the
// winter Early Season village on the build before #99/#103.
//   SEASON=winter PHASE=EARLY_SEASON ADVANCE=2 GOS_URL=http://127.0.0.1:5411/garden-os/story-mode/ \
//     node tests/village-stick-season-check.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL = process.env.GOS_URL || 'http://127.0.0.1:5411/garden-os/story-mode/';
const SEASON = process.env.SEASON || 'winter';
const PHASE = process.env.PHASE || 'EARLY_SEASON';
const OUT = process.env.GOS_OUT || process.env.OUT || 'village-stick-check';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(p);
await p.goto(URL);
await p.waitForTimeout(1500);
// Seed a Free Play save in the requested season/phase.
await p.evaluate(async ([season, phase]) => {
  const { createSandboxState } = await import('./src/game/state.js');
  const { initGame, waitForSessionFlush } = await import('./src/game/game-init.js');
  await waitForSessionFlush();
  const s = createSandboxState();
  s.campaign.playerProfile.displayName = 'Repro';
  s.season.season = season; s.season.phase = phase;
  const session = initGame(s, { slot: 'freeplay' });
  await session.persistGameState(); session.cleanup(); await waitForSessionFlush();
}, [SEASON, PHASE]);
await p.reload(); await p.waitForTimeout(1500);
await p.locator('[data-mode="freeplay"]').tap();
const cont = p.getByRole('button', { name: /Continue Free Play/i });
await cont.waitFor({ timeout: 15000 }); await cont.tap();
await p.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 30000 });
await p.waitForFunction(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'player_plot' && !d.travelling; }, null, { timeout: 60000 });
await sleep(2000);
const g = await p.evaluate(() => { const s = JSON.parse(window.render_game_to_text()); return { season: s.season, phase: s.phase, zone: s.currentZone, cut: s.cutsceneActive }; });
console.log('state', JSON.stringify(g));
const why = await p.evaluate(() => { const b = document.querySelector('#dp-skip-btn'); if (!b) return null; const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { rect: [r.left, r.top, r.width, r.height].map(Math.round), hit: hit ? (hit.id || String(hit.className)).slice(0, 60) : null, panelVisible: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'), disabled: b.disabled, inert: !!b.closest('[inert]'), pe: getComputedStyle(b).pointerEvents }; });
console.log('skip-why', JSON.stringify(why));
if (process.env.ADVANCE) {
  for (let i = 0; i < Number(process.env.ADVANCE); i++) {
    const adv = await p.evaluate(() => { const a = document.getElementById('fab-advance'); return a ? { shown: a.classList.contains('is-visible'), dis: a.disabled || a.getAttribute('aria-disabled') === 'true', text: a.textContent.trim() } : null; });
    console.log('adv', JSON.stringify(adv));
    if (adv?.shown && !adv.dis) { await p.locator('#fab-advance').tap({ timeout: 5000 }).catch((e) => console.log('adv-fail', e.message.split('\n')[0])); await sleep(3000); }
    const after = await p.evaluate(() => { const s = JSON.parse(window.render_game_to_text()); return { phase: s.phase, cut: s.cutsceneActive, overlays: [...document.querySelectorAll('#overlay-container > *')].map((e) => e.id || e.className).slice(0, 5), dp: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible') }; });
    console.log('after-adv', JSON.stringify(after));
  }
}
// dismiss any dialogue
for (let i = 0; i < 6; i++) { const sk = p.locator('#dp-panel.dp-panel--visible :is(#dp-skip-btn, #dp-next-btn):visible'); if (await sk.count()) { await sk.first().tap({ timeout: 3000 }).catch(() => {}); await sleep(400); } else break; }
await p.locator('#village-back').tap({ noWaitAfter: true });
await p.waitForFunction(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'village' && !d.travelling && d.bound; }, null, { timeout: 90000 });
await sleep(2500);
for (let i = 0; i < 6; i++) { const sk = p.locator('#dp-panel.dp-panel--visible :is(#dp-skip-btn, #dp-next-btn):visible'); if (await sk.count()) { await sk.first().tap({ timeout: 3000 }).catch(() => {}); await sleep(400); } else break; }
const pose = () => p.evaluate(() => JSON.parse(window.render_game_to_text()).player.position);
async function stick(dx, dy, ms = 1500) {
  const ring = await p.evaluate(() => { const r = document.querySelector('.touch-stick'); const ring = r?.firstElementChild; const cs = getComputedStyle(r); const b = ring.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const hit = document.elementFromPoint(cx, cy); return { x: cx, y: cy, on: cs.pointerEvents === 'auto' && parseFloat(cs.opacity) > 0.5, hit: hit ? (hit.id || hit.className || hit.tagName) : null, hitOk: !!hit?.closest('.touch-stick') }; });
  const pre = await pose();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ring.x, y: ring.y, id: 1 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ring.x + dx * i / 6, y: ring.y + dy * i / 6, id: 1 }] }); await sleep(30); }
  await sleep(300);
  const mid = await p.evaluate(() => { const s = JSON.parse(window.render_game_to_text()); const knob = document.querySelector('.touch-stick')?.firstElementChild?.firstElementChild; return { player: s.player?.position, moving: s.player?.moving, enabled: s.player?.enabled, knob: knob?.style.transform, walk: window.gardenOS.village.getDebugState() }; });
  const tEnd = Date.now() + ms; while (Date.now() < tEnd) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ring.x + dx + (Math.random() - 0.5), y: ring.y + dy, id: 1 }] }); await sleep(120); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(400);
  const post = await pose();
  return { ring, pre, post, mid, moved: +Math.hypot(post.x - pre.x, post.z - pre.z).toFixed(2) };
}
const dbgExtra = await p.evaluate(() => { const s = JSON.parse(window.render_game_to_text()); return { phase: s.phase, season: s.season, zone: s.currentZone, cut: s.cutsceneActive, pause: s.pauseMenuOpen, player: s.player }; });
console.log('village', JSON.stringify(dbgExtra));
const moves = [];
for (const [dx, dy] of [[0, -45], [45, 0], [0, 45]]) { const r = await stick(dx, dy); moves.push(r.moved); console.log('stick', JSON.stringify(r)); }
await p.screenshot({ path: `${OUT}/${SEASON}-${PHASE}-${process.env.LABEL || 'run'}.png` });
console.log('errors', errs.length, errs.slice(0, 3));
await browser.close();
if (moves.some((m) => m < 1) || errs.length) { console.error('FAIL stick moved', moves); process.exit(1); }
console.log('ok - stick moved', moves.join(' / '), 'm in the', SEASON, PHASE, 'village');
