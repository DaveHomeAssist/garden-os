// Phone plant taps check (manual, not a CI gate): Free Play at 390x844
// (isMobile, hasTouch, DPR 3). Picks Leaf Lettuce, then plants the first bed
// row with mouse clicks and the second row with touch taps.
// Nov 23 live check: only 2 of 8 mouse clicks planted. Touch taps were fine;
// the right-60% camera-orbit overlay swallowed every non-touch click (mouse,
// pen, trackpad on a touch-capable device). Cells off the 390px screen are
// skipped (the bed is wider than a portrait phone at the default camera).
//
//   npx vite --port 5411 --strictPort --host 127.0.0.1 &
//   GOS_URL=http://127.0.0.1:5411/garden-os/story-mode/ GOS_OUT=/tmp/plant node tests/phone-plant-taps-check.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL = process.env.GOS_URL || 'http://127.0.0.1:5411/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || process.env.OUT || 'phone-plant-taps';
const LABEL = process.env.LABEL || 'check';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL); await p.waitForTimeout(1500);
await p.locator('[data-mode="freeplay"]').first().click();
await p.getByRole('button', { name: /Start Free Play/ }).first().click();
await p.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 60000 });
await p.waitForFunction(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'player_plot' && !d.travelling; }, null, { timeout: 60000 });
await p.waitForTimeout(2000);
const planted = () => p.evaluate(() => JSON.parse(window.render_game_to_text()).plantedCount);
const pick = async () => {
  await p.locator('#fab-plant').click();
  await p.locator('#crop-palette-panel [data-crop="lettuce"]').waitFor({ state: 'visible', timeout: 15000 });
  await p.locator('#crop-palette-panel [data-crop="lettuce"]').click();
  await p.waitForTimeout(350);
};
await pick();
await p.screenshot({ path: `${OUT}/${LABEL}-after-pick.png` });
const cells = await p.evaluate(() => (window.gardenOS.getVisualDebug()?.gridCells || []).sort((a, b) => a.index - b.index).map((c) => ({ index: c.index, x: c.screenX, y: c.screenY, hit: (() => { const el = document.elementFromPoint(c.screenX, c.screenY); return el ? (el.id || el.className || el.tagName) : null; })() })));
const res = { label: LABEL, vw: 390, mouse: [], touch: [], errs };
for (const c of cells.slice(0, 8)) {
  const before = await planted();
  await p.mouse.click(c.x, c.y); await p.waitForTimeout(160);
  res.mouse.push({ ...c, leftZone: c.x < 390 * 0.4, planted: (await planted()) > before });
}
for (const c of cells.slice(8, 16)) {
  const before = await planted();
  await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(160);
  res.touch.push({ ...c, leftZone: c.x < 390 * 0.4, planted: (await planted()) > before });
}
const onScreen = (r) => r.x >= 0 && r.x <= 390 && r.y >= 0 && r.y <= 844;
res.mouseLanded = res.mouse.filter((r) => r.planted).length;
res.touchLanded = res.touch.filter((r) => r.planted).length;
res.missed = [...res.mouse.map((r) => ({ ...r, via: 'mouse' })), ...res.touch.map((r) => ({ ...r, via: 'touch' }))].filter((r) => onScreen(r) && !r.planted);
await p.screenshot({ path: `${OUT}/${LABEL}-after-taps.png` });
writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify({ mouse: res.mouseLanded, touch: res.touchLanded, mouseRows: res.mouse.map((r) => [r.index, Math.round(r.x), Math.round(r.y), r.leftZone, r.planted, r.hit]), touchRows: res.touch.map((r) => [r.index, Math.round(r.x), Math.round(r.y), r.leftZone, r.planted, r.hit]), errs }));
await browser.close();
if (res.missed.length || errs.length) { console.error('FAIL on-screen cells that did not plant:', JSON.stringify(res.missed), errs); process.exit(1); }
console.log('ok - every on-screen bed cell planted by mouse and by touch');
