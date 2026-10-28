// Village V0 browser test (Free Play; not part of `npm test`).
// Yard -> "Back to village" -> village (home plot exit) -> keyboard walk -> tap-to-move on the
// shared canvas (must not touch the hidden garden bed) -> shop via E (Enter / Space do not open
// it) -> home plot via E -> back -> save -> reload -> Continue restores the village pose.
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
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#shop-panel').count(), 0, 'Space must not open the shop');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#shop-panel').count(), 0, 'Enter must not open the shop');
  const phaseAfterEnter = (await game()).phase;
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

  assert.deepEqual(errors, []);
  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ passed: true, checks, pageErrors: errors }, null, 2));
  console.log('PASS: village travel, tap-to-move, keys, save/restore');
} finally {
  await browser.close();
}
