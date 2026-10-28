// Village V0 browser test (Free Play; not part of `npm test`).
// Yard -> "Back to village" -> village (home plot exit) -> keyboard walk -> tap-to-move on the
// shared canvas (must not touch the hidden garden bed) -> shop via E (Enter / Space do not open
// it) -> home plot via E -> back -> save -> reload -> Continue restores the village pose.
// Also: garden HUD hidden + Enter inert in the village, V0 objective text, tapping the
// shop stand opens its prompt (V2), and a fixture save (tokens + scraps) for buying (V8)
// and composting (V9), plus the phone crop counter (no bare "--").
// Usage (from story-mode/): npx vite --port 4318 --strictPort
//   GOS_URL=http://localhost:4318/garden-os/story-mode/ node tests/village-e2e.mjs
// Env: GOS_OUT (screenshots + results, default <tmpdir>/gos-village-e2e).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.GOS_URL || 'http://localhost:4318/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || join(tmpdir(), 'gos-village-e2e');
mkdirSync(OUT, { recursive: true });
const checks = [];
const pass = (name, detail = {}) => { checks.push({ name, ...detail }); console.log(`ok - ${name}`, Object.keys(detail).length ? JSON.stringify(detail) : ''); };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const dbg = () => page.evaluate(() => window.gardenOS?.village?.getDebugState?.() ?? null);
  const game = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const waitFor = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
  const waitZone = (zone) => waitFor((z) => {
    const d = window.gardenOS?.village?.getDebugState?.();
    return d && d.zone === z && !d.travelling && (z !== 'village' || d.bound);
  }, zone);
  const walkTo = async (id) => {
    const target = await page.evaluate((tid) => window.gardenOS.village.getInteractables().find((t) => t.id === tid), id);
    assert.ok(target, `interactable ${id}`);
    assert.ok(await page.evaluate(([x, z]) => window.gardenOS.village.walkTo(x, z), [target.position.x, target.position.z]), `path to ${id}`);
    await waitFor((tid) => window.gardenOS.village.getDebugState().activeTrigger === tid, id, 90000);
    return target;
  };

  await page.goto(URL);
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Start Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await waitZone('player_plot');
  await page.locator('#village-back').waitFor({ state: 'visible' });
  await page.locator('#hud-pause').click({ trial: true });
  pass('yard shows Back to village; pause button still clickable');

  // Arm a crop so a stray click on the hidden bed would plant it.
  await page.locator('#fab-plant').click();
  await page.locator('.palette-item').first().click();
  const armed = (await game()).selectedCropId;
  assert.ok(armed, 'a crop is selected');
  // Close the crop picker if it is still open (Esc would open pause when it is not).
  if (await page.locator('.palette-dismiss:visible').count()) await page.locator('.palette-dismiss:visible').first().click();
  await page.waitForTimeout(300);
  assert.equal((await game()).pauseMenuOpen, false);

  await page.locator('#village-back').click();
  await waitZone('village');
  await page.waitForTimeout(600);
  const home = (await page.evaluate(() => window.gardenOS.village.getInteractables().find((t) => t.id === 'plot_home'))).exit;
  let d = await dbg();
  assert.ok(Math.hypot(d.pose.x - home.x, d.pose.z - home.z) < 0.5, `landed at home exit ${JSON.stringify(d.pose)}`);
  assert.equal(await page.locator('#village-back').count(), 0);
  await page.screenshot({ path: `${OUT}/01-village-arrive.png` });
  pass('travel yard -> village lands on the home plot exit', { pose: d.pose });

  // Regression (live playtest 2026-10-28): taps on plot soil used to walk to
  // the plot's trigger centre, so the first tap after arriving (next to the
  // home plot) overshot by ~6 m and every tap inside a plot stalled ~0.5 m out.
  // The end of each walk must also settle without a back-and-forth.
  const tapAndTrace = async (goal, ms = 6000) => {
    const at = await page.evaluate(([x, z]) => window.gardenOS.village.project(x, z), [goal.x, goal.z]);
    assert.ok(at?.visible, `tap target on screen ${JSON.stringify(goal)}`);
    const from = (await dbg()).pose;
    await page.mouse.click(at.x, at.y);
    const trace = [];
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { await page.waitForTimeout(200); trace.push((await dbg()).pose); }
    const end = trace.at(-1);
    const ux = goal.x - from.x; const uz = goal.z - from.z; const len = Math.hypot(ux, uz) || 1;
    // progress along the approach, and how far it ever got past the goal
    const along = trace.map((p) => ((p.x - from.x) * ux + (p.z - from.z) * uz) / len);
    const overshoot = Math.max(0, ...along.map((a) => a - len));
    let reversals = 0;
    for (let i = 2; i < along.length; i += 1) {
      const a = along[i - 1] - along[i - 2]; const b = along[i] - along[i - 1];
      if (Math.abs(a) > 0.03 && Math.abs(b) > 0.03 && Math.sign(a) !== Math.sign(b)) reversals += 1;
    }
    return { left: Math.hypot(end.x - goal.x, end.z - goal.z), overshoot, reversals, from, end };
  };
  const plotHome = await page.evaluate(() => window.gardenOS.village.getInteractables().find((t) => t.id === 'plot_home'));
  {
    const p0 = (await dbg()).pose;
    const cx = plotHome.position.x - p0.x; const cz = plotHome.position.z - p0.z; const cl = Math.hypot(cx, cz);
    // 2.8 m from the exit toward the plot: on the home plot's soil, well outside its trigger
    const goal = { x: p0.x + (cx / cl) * 2.8, z: p0.z + (cz / cl) * 2.8 };
    const r = await tapAndTrace(goal);
    assert.ok(r.left < 0.35, `first tap after arrival lands on target (${r.left.toFixed(2)} m left, end ${JSON.stringify(r.end)})`);
    assert.ok(r.overshoot < 0.35, `first tap after arrival does not overshoot (${r.overshoot.toFixed(2)} m)`);
    assert.equal(r.reversals, 0, 'no back-and-forth at the end of the walk');
    pass('first tap after arrival (on plot soil) lands within tolerance, no oscillation', { left: +r.left.toFixed(2), overshoot: +r.overshoot.toFixed(2) });
    // now standing inside the plot: a 2 m tap sideways must get there too
    const g2 = { x: r.end.x + (-cz / cl) * 2, z: r.end.z + (cx / cl) * 2 };
    const r2 = await tapAndTrace(g2);
    assert.ok(r2.left < 0.35, `tap inside a plot reaches its target (${r2.left.toFixed(2)} m left)`);
    assert.equal(r2.reversals, 0, 'no back-and-forth inside the plot');
    pass('tap inside a plot reaches the tapped point', { left: +r2.left.toFixed(2) });
    // back to the exit spot so the rest of the run starts where it always did
    assert.ok(await page.evaluate(([x, z]) => window.gardenOS.village.walkTo(x, z), [p0.x, p0.z]));
    await waitFor(([x, z]) => { const q = window.gardenOS.village.getDebugState().pose; return Math.hypot(q.x - x, q.z - z) < 0.2; }, [p0.x, p0.z], 60000);
  }

  // Garden HUD hidden in the village; objective describes V0.
  const hudHidden = await page.evaluate(() => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && r.width > 0 && r.height > 0
        && !(el.classList.contains('fab') && !el.classList.contains('is-visible'));
    };
    return {
      // Rendered at all (the inactive state is a faded ghost, which must not show either).
      plant: getComputedStyle(document.querySelector('#fab-plant')).display !== 'none',
      advance: getComputedStyle(document.querySelector('#fab-advance')).display !== 'none',
      hudAction: getComputedStyle(document.querySelector('#hud-action')).display !== 'none',
      crops: shown('#hud-crops'),
      score: shown('.hud-score-wrap'),
      objective: document.querySelector('#phase-helper')?.textContent ?? '',
    };
  });
  assert.deepEqual({ ...hudHidden, objective: undefined }, { plant: false, advance: false, hudAction: false, crops: false, score: false, objective: undefined }, `garden HUD hidden ${JSON.stringify(hudHidden)}`);
  assert.match(hudHidden.objective, /seed stand.*compost bin.*plot/);
  assert.doesNotMatch(hudHidden.objective, /neighbo|Talk to/i);
  pass('village hides Plant / Start Season / crop counter; objective describes V0', { objective: hudHidden.objective });

  // Keyboard walk.
  const before = (await dbg()).pose;
  await page.keyboard.down('s');
  await page.waitForTimeout(900);
  await page.keyboard.up('s');
  await page.waitForTimeout(300);
  const after = (await dbg()).pose;
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  assert.ok(moved > 0.4, `keyboard moved ${moved}`);
  pass('keyboard walk', { moved: Number(moved.toFixed(2)) });

  // Tap-to-move on the shared canvas.
  const plantedBefore = (await game()).plantedCount;
  const start = (await dbg()).pose;
  const goal = { x: start.x + 2.5, z: start.z - 2.5 };
  const screen = await page.evaluate(([x, z]) => window.gardenOS.village.project(x, z), [goal.x, goal.z]);
  assert.ok(screen?.visible, 'tap target on screen');
  await page.mouse.click(screen.x, screen.y);
  await page.waitForTimeout(3500);
  const tapped = (await dbg()).pose;
  const toGoal = Math.hypot(tapped.x - goal.x, tapped.z - goal.z);
  const g = await game();
  assert.equal(g.plantedCount, plantedBefore, 'tap in the village must not plant in the hidden bed');
  assert.ok(toGoal < 0.6, `tap-to-move reached the goal (${toGoal.toFixed(2)} m left)`);
  pass('tap-to-move walks; garden click handlers ignore the village tap', { toGoal: Number(toGoal.toFixed(2)), planted: g.plantedCount });

  // Shop: Enter / Space do not open it, E does.
  await walkTo('shop_stand');
  await page.locator('#village-prompt.is-visible').waitFor();
  const phaseBefore = (await game()).phase;
  const toastsBefore = await page.locator('#toast-container > *').count();
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#shop-panel').count(), 0, 'Space must not open the shop');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#shop-panel').count(), 0, 'Enter must not open the shop');
  const phaseAfterEnter = (await game()).phase;
  assert.equal(phaseAfterEnter, phaseBefore, 'Enter must not advance a phase in the village');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#toast-container > *').count(), toastsBefore, 'Enter must not toast in the village');
  await page.screenshot({ path: `${OUT}/02-shop-prompt.png` });
  const promptBox = await page.locator('#village-prompt').boundingBox();
  assert.ok(promptBox && promptBox.y > 0 && promptBox.y + promptBox.height < 600 && promptBox.x > 0, `prompt on screen ${JSON.stringify(promptBox)}`);
  await page.keyboard.press('e');
  await page.locator('#shop-panel').waitFor({ state: 'visible' });
  const locked = (await dbg()).pose;
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const stillLocked = (await dbg()).pose;
  assert.ok(Math.hypot(stillLocked.x - locked.x, stillLocked.z - locked.z) < 0.05, 'movement locked while the shop is open');
  await page.screenshot({ path: `${OUT}/03-shop-open.png` });
  await page.locator('#shop-dismiss').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#shop-panel').count(), 0);
  assert.equal(await page.locator('#village-prompt.is-visible').count(), 1);
  pass('shop: Space/Enter pass through, E opens, movement locked, close restores prompt', { phaseBefore, phaseAfterEnter });

  // Home plot in and out.
  await walkTo('plot_home');
  await page.keyboard.press('e');
  await waitZone('player_plot');
  await page.locator('#village-back').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-garden-screen.png` });
  assert.equal((await dbg()).village.insidePlot, true);
  await page.locator('#village-back').click();
  await waitZone('village');
  await page.waitForTimeout(400);
  d = await dbg();
  assert.ok(Math.hypot(d.pose.x - home.x, d.pose.z - home.z) < 0.5, 'back at the home exit');
  assert.ok(Math.abs(d.pose.facingY - home.facingY) < 0.05, `facing restored ${d.pose.facingY} vs ${home.facingY}`);
  assert.equal(await page.locator('#village-prompt.is-visible').count(), 0, `no stale prompt after returning ${JSON.stringify({ d, zone: await page.evaluate(() => window.gardenOS.village.getZoneDebug()?.inside) })}`);
  pass('enter plot -> garden screen -> back to village (exit spot + facing)');

  // V2: tapping the shop stand itself (not the ground) walks to it and opens its prompt.
  const standPos = { x: -23.22, z: 5.1 };
  const shopItem = await page.evaluate(() => window.gardenOS.village.getInteractables().find((t) => t.id === 'shop_stand'));
  // Stand-off point ~5 m from the stand on the anchor side, so the stand is on screen and not yet in range.
  const away = { x: shopItem.position.x + (shopItem.position.x - standPos.x) * 3, z: shopItem.position.z + (shopItem.position.z - standPos.z) * 3 };
  assert.ok(await page.evaluate(([x, z]) => window.gardenOS.village.walkTo(x, z), [away.x, away.z]), 'path to stand-off point');
  await waitFor(([x, z]) => {
    const p = window.gardenOS.village.getDebugState().pose;
    return Math.hypot(p.x - x, p.z - z) < 0.8;
  }, [away.x, away.z], 90000);
  await page.waitForTimeout(500);
  assert.notEqual((await dbg()).activeTrigger, 'shop_stand', 'not in range before the tap');
  const standScreen = await page.evaluate(([x, z]) => window.gardenOS.village.project(x, z), [standPos.x, standPos.z]);
  assert.ok(standScreen?.visible, `stand on screen ${JSON.stringify(standScreen)}`);
  await page.mouse.click(standScreen.x, standScreen.y);
  await waitFor(() => window.gardenOS.village.getDebugState().activeTrigger === 'shop_stand', null, 90000);
  await page.locator('#village-prompt.is-visible').waitFor();
  await page.screenshot({ path: `${OUT}/04b-tap-stand-prompt.png` });
  pass('V2: tapping the shop stand walks to it and opens its prompt', { from: away, standScreen });

  // Save + reload + Continue.
  await page.evaluate(() => window.gardenOS.village.walkTo(-20.5, 10.5));
  await page.waitForTimeout(4500);
  const savedPose = (await dbg()).pose;
  await page.evaluate(() => window.gardenOS.village.savePosition());
  await page.waitForTimeout(1500);
  await page.reload();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await waitZone('village');
  await page.waitForTimeout(600);
  const restored = (await dbg()).pose;
  const drift = Math.hypot(restored.x - savedPose.x, restored.z - savedPose.z);
  assert.ok(drift < 0.5, `restored within 0.5 m (${drift.toFixed(2)})`);
  await page.screenshot({ path: `${OUT}/05-restored.png` });
  pass('village pose survives reload + Continue', { savedPose, restored, drift: Number(drift.toFixed(3)) });

  // Reload while inside the garden comes back to the garden.
  await walkTo('plot_home');
  await page.keyboard.press('e');
  await waitZone('player_plot');
  await page.waitForTimeout(1500);
  await page.reload();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await waitZone('player_plot');
  await page.locator('#village-back').waitFor({ state: 'visible' });
  pass('reload inside the garden resumes the garden screen');

  // Fixture save with tokens + scraps: V8 buying and V9 composting. Leave the running
  // session first (main menu) so its own save cannot overwrite the fixture.
  await page.locator('#hud-pause').click();
  await page.locator('#pause-main-menu').click();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).waitFor();
  await page.evaluate(async () => {
    const { seedVillageFixture } = await import('./src/debug/village-fixture.js');
    await seedVillageFixture();
  });
  await page.reload();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await waitZone('player_plot');
  await page.locator('#village-back').click();
  await waitZone('village');
  await page.waitForTimeout(400);
  const ITEMS = ['dried_leaves', 'plant_matter', 'compost'];
  const econ = (extra = []) => page.evaluate((ids) => window.gardenOS.village.getEconomy(ids), [...ITEMS, ...extra]);
  const e0 = await econ();
  assert.equal(e0.tokens, 200, `fixture tokens ${JSON.stringify(e0)}`);

  await walkTo('shop_stand');
  await page.keyboard.press('e');
  await page.locator('#shop-panel').waitFor({ state: 'visible' });
  const buyBtn = page.locator('#shop-panel [data-buy-item]:not([disabled])').first();
  const buyId = await buyBtn.getAttribute('data-buy-item');
  const buyPrice = Number(await buyBtn.getAttribute('data-buy-price'));
  const seedBefore = (await econ([buyId])).items[buyId];
  await buyBtn.click();
  await page.waitForTimeout(300);
  const e1 = await econ([buyId]);
  assert.equal(e1.tokens, 200 - buyPrice, 'tokens spent');
  assert.equal(e1.items[buyId], seedBefore + 1, 'seed added');
  await page.screenshot({ path: `${OUT}/06-v8-bought.png` });
  await page.locator('#shop-dismiss').click();
  await page.waitForTimeout(300);
  pass('V8: buy at the seed stand (fixture tokens)', { item: buyId, price: buyPrice, tokens: e1.tokens, count: e1.items[buyId] });

  await walkTo('compost_bin');
  await page.keyboard.press('e');
  await page.locator('#compost-panel').waitFor({ state: 'visible' });
  await page.locator('#compost-panel [data-compost-make="1"]').click();
  await page.waitForTimeout(300);
  const e2 = await econ();
  assert.equal(e2.items.dried_leaves, e0.items.dried_leaves - 2, 'leaves spent');
  assert.equal(e2.items.plant_matter, e0.items.plant_matter - 1, 'plant matter spent');
  assert.equal(e2.items.compost, e0.items.compost + 1, 'compost made');
  await page.screenshot({ path: `${OUT}/07-v9-composted.png` });
  await page.locator('#compost-dismiss').click();
  await page.waitForTimeout(300);
  pass('V9: compost bin turns scraps into compost (fixture scraps)', { before: e0.items, after: e2.items });

  // Bought seed's crop is in the planting menu back home.
  await walkTo('plot_home');
  await page.keyboard.press('e');
  await waitZone('player_plot');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#fab-plant.is-visible').count(), 1, 'Plant is back in the garden');
  await page.locator('#fab-plant').click();
  const cropId = buyId.replace(/_seed$/, '');
  const inPalette = await page.locator(`.palette-item[data-crop^="${cropId}"]`).count();
  assert.ok(inPalette > 0, `bought crop ${cropId} in the planting menu`);
  if (await page.locator('.palette-dismiss:visible').count()) await page.locator('.palette-dismiss:visible').first().click();
  pass('garden HUD returns at home; bought crop is plantable', { cropId });

  // Phone: the counter shows the crop count, not a bare "--".
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const phone = await page.evaluate(() => {
    const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const crops = document.querySelector('#hud-crops');
    const score = document.querySelector('#hud-score');
    return { crops: vis(crops) ? crops.textContent : null, score: vis(score) ? score.textContent : null };
  });
  await page.screenshot({ path: `${OUT}/08-phone-counter.png` });
  assert.match(phone.crops ?? '', /^\d+ \/ \d+$/, `phone crop counter ${JSON.stringify(phone)}`);
  assert.notEqual(phone.score, '--', 'no bare "--" on the phone');
  pass('phone HUD shows the crop counter, no bare "--"', phone);

  assert.deepEqual(errors, []);
  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ passed: true, checks, pageErrors: errors }, null, 2));
  console.log('PASS: village travel, tap-to-move, keys, save/restore');
} finally {
  await browser.close();
}
