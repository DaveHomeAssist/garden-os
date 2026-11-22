// Phone controls / landscape layout check (manual, not a CI gate).
// Free Play on a touch phone at landscape and portrait sizes: yard HUD,
// village HUD, the village prompt card and the pause menu opened by tapping ☰.
// Fails (exit 1) when, with the Move stick showing:
//   - ☰ is not hit-testable (elementFromPoint at its centre is not #hud-pause),
//   - the stick overlaps ☰, the season calendar, the objective card, the
//     prompt card, the tool hotbar or the Plant / Backpack / Next buttons,
//   - the hotbar overlaps the objective card or the prompt card,
//   - the prompt's Tap chip is covered or under 44x44,
//   - a tap on ☰ does not open the pause menu.
//
//   npx vite --port 5341 --strictPort &
//   GOS_URL=http://localhost:5341/garden-os/story-mode/ GOS_OUT=/tmp/phone-controls node tests/phone-controls-check.mjs
// Env: VPS=844x390,740x360,932x430,390x844,360x800  LABEL=after  NO_FAIL=1 (report only).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.env.GOS_URL || 'http://localhost:5341/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || join(tmpdir(), 'gos-phone-controls');
const LABEL = process.env.LABEL || 'check';
mkdirSync(OUT, { recursive: true });
const VPS = (process.env.VPS || '844x390,740x360,932x430,390x844,360x800').split(',').map((s) => {
  const [width, height] = s.split('x').map(Number);
  return { width, height, tag: s };
});

// Runs in the page: rects of the touch controls and the HUD pieces around them.
const layout = () => {
  const vis = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return null;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return null;
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };
  const stickRoot = document.querySelector('.touch-stick');
  const stickOn = Boolean(stickRoot && getComputedStyle(stickRoot).pointerEvents === 'auto' && parseFloat(getComputedStyle(stickRoot).opacity) > 0.5);
  const rects = {
    stick: stickOn ? vis(stickRoot) : null,
    pause: vis(document.querySelector('#hud-pause')),
    calendar: vis(document.querySelector('#season-calendar')),
    objective: vis(document.querySelector('#phase-helper.is-visible')),
    prompt: vis(document.querySelector('#village-prompt.is-visible')),
    chip: vis(document.querySelector('#village-prompt.is-visible .interaction-prompt__hint')),
    hotbar: vis(document.querySelector('.tool-hud.is-visible')),
    plant: vis(document.querySelector('#fab-plant')),
    backpack: vis(document.querySelector('#fab-backpack')),
    advance: vis(document.querySelector('#fab-advance')),
    back: vis(document.querySelector('#village-back')),
    bug: vis(document.querySelector('#fab-bug')),
    tracker: vis(document.querySelector('.quest-tracker')),
  };
  const hits = {};
  for (const [key, sel] of [['pause', '#hud-pause'], ['chip', '#village-prompt .interaction-prompt__hint'], ['backpack', '#fab-backpack'], ['plant', '#fab-plant'], ['advance', '#fab-advance'], ['back', '#village-back']]) {
    const r = rects[key]; if (!r) continue;
    const target = document.querySelector(sel);
    // Disabled / click-through controls (e.g. a greyed-out Start Season) take no taps anyway.
    if (target.disabled || getComputedStyle(target).pointerEvents === 'none') continue;
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    hits[key] = Boolean(el && document.querySelector(sel)?.contains(el));
  }
  const slots = [...document.querySelectorAll('.tool-hud.is-visible .tool-hud__slot')];
  hits.hotbarSlots = slots.length ? slots.every((s) => { const r = s.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(el && s.contains(el)); }) : null;
  const ring = stickRoot?.firstElementChild;
  if (stickOn && ring) { const r = ring.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); hits.stickRing = Boolean(el && ring.contains(el)); }
  return { rects, hits, stickOn };
};

const overlap = (a, b, pad = 0) => Boolean(a && b && a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad);

function evaluate(state, tag, l, failures) {
  const f = (msg) => failures.push(`${tag} ${state}: ${msg}`);
  const { rects: r, hits } = l;
  if (r.pause && hits.pause === false) f('☰ is not hit-testable at its centre');
  if (l.stickOn) {
    for (const k of ['pause', 'calendar', 'objective', 'prompt', 'hotbar', 'plant', 'backpack', 'advance', 'back']) if (overlap(r.stick, r[k])) f(`Move stick overlaps ${k}`);
    if (hits.stickRing === false) f('Move stick ring is covered');
  }
  if (overlap(r.hotbar, r.objective)) f('hotbar overlaps the objective card');
  if (overlap(r.hotbar, r.prompt)) f('hotbar overlaps the prompt card');
  if (overlap(r.objective, r.calendar)) f('objective card overlaps the season calendar');
  if (overlap(r.objective, r.pause)) f('objective card overlaps ☰');
  if (r.chip && (r.chip.width < 43.5 || r.chip.height < 43.5)) f(`prompt Tap chip is ${Math.round(r.chip.width)}x${Math.round(r.chip.height)} (< 44)`);
  for (const k of ['chip', 'backpack', 'plant', 'advance', 'back']) if (hits[k] === false) f(`${k} is covered at its centre`);
  if (hits.hotbarSlots === false) f('a hotbar slot is covered');
  for (const [k, v] of Object.entries(r)) if (v && (v.left < -0.5 || v.top < -0.5 || v.right > innerWidthOf(tag) + 0.5)) f(`${k} is off screen`);
}
const innerWidthOf = (tag) => Number(tag.split('x')[0]);

const report = { url: URL, states: {}, failures: [], errors: [] };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => report.errors.push(`${vp.tag} pageerror ${e.message}`));
    const waitFor = (fn, arg, timeout = 90000) => p.waitForFunction(fn, arg, { timeout, polling: 100 });
    const snap = async (state) => {
      await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-${state}.png` });
      const l = await p.evaluate(layout);
      report.states[`${vp.tag}-${state}`] = l;
      evaluate(state, vp.tag, l, report.failures);
      console.log('state', vp.tag, state, 'stick', l.stickOn, JSON.stringify(l.hits));
      return l;
    };
    try {
      await p.goto(URL);
      await p.locator('[data-mode="freeplay"]').click();
      await p.getByRole('button', { name: 'Start Free Play', exact: true }).click();
      await waitFor(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'player_plot' && !d.travelling; });
      await p.waitForTimeout(1800);
      await snap('00-yard-hud');
      await p.locator('#village-back').tap();
      await waitFor(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'village' && !d.travelling && d.bound; });
      await p.waitForTimeout(1500);
      await snap('01-village-hud');
      await p.evaluate(() => document.querySelectorAll('#toast-container > *').forEach((e) => e.remove()));
      const target = await p.evaluate(() => window.gardenOS.village.getInteractables().find((t) => t.id === 'shop_stand'));
      await p.evaluate(([x, z]) => window.gardenOS.village.walkTo(x, z), [target.position.x, target.position.z]);
      await waitFor(() => window.gardenOS.village.getDebugState().activeTrigger === 'shop_stand');
      await p.locator('#village-prompt.is-visible').waitFor();
      await p.waitForTimeout(800);
      await p.evaluate(() => document.querySelectorAll('#toast-container > *').forEach((e) => e.remove()));
      await snap('02-prompt-card');
      // Tap ☰ (a real touch at its centre) and expect the pause menu.
      const box = await p.locator('#hud-pause').boundingBox();
      await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      const opened = await waitFor(() => document.querySelector('#pause-menu')?.getAttribute('aria-hidden') === 'false', null, 5000).then(() => true, () => false);
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-03-pause-tap.png` });
      report.states[`${vp.tag}-03-pause-tap`] = { opened };
      console.log('state', vp.tag, '03-pause-tap opened', opened);
      if (!opened) report.failures.push(`${vp.tag}: tapping ☰ did not open the pause menu`);
    } catch (e) {
      report.errors.push(`${vp.tag} ${e.message.split('\n')[0]}`);
      await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-ERR.png` }).catch(() => {});
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/report-${LABEL}.json`, JSON.stringify(report, null, 2));
console.log('FAILURES', report.failures.length, JSON.stringify(report.failures, null, 1));
console.log('ERRORS', JSON.stringify(report.errors));
if (!process.env.NO_FAIL && (report.failures.length || report.errors.length)) process.exit(1);
console.log('PASS: phone controls');
