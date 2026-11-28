// WebGL context loss / restore browser check (not part of `npm test`).
// Bug pass 2026-11-25 (Scaler engine items): a lost GPU context mid-session
// (tab discard, driver reset) must not leave a permanently blank bed, and bed
// clicks must still plant after the context comes back.
// Starts Unsaved Free Play, forces WEBGL_lose_context lose -> restore on the
// game canvas, and fails (exit 1) when the restored frame is blank, the bed
// no longer accepts a planting click, or the page throws.
// Usage (from story-mode/):
//   node node_modules/vite/bin/vite.js --port 4318 --strictPort &
//   GOS_URL=http://localhost:4318/garden-os/story-mode/ node tests/context-loss-e2e.mjs
// Env: GOS_OUT (screenshot dir, default <tmpdir>/gos-context-loss-e2e).
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.GOS_URL || 'http://localhost:4318/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || join(tmpdir(), 'gos-context-loss-e2e');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 600 } })).newPage();
const errors = [];
const logs = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { logs.push(m.text()); if (m.type() === 'error') errors.push(m.text()); });

// Mean luminance + distinct-colour count of the WebGL canvas, read back via a
// 2D canvas so it works without preserveDrawingBuffer.
async function canvasStats(name) {
  const file = join(OUT, `${name}.png`);
  const buf = await page.locator('canvas').first().screenshot({ path: file });
  const stats = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 96; c.height = 60;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 96, 60);
    const d = g.getImageData(0, 0, 96, 60).data;
    const colours = new Set();
    let lum = 0;
    for (let i = 0; i < d.length; i += 4) {
      lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      colours.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
    }
    return { meanLum: Math.round(lum / (d.length / 4)), colours: colours.size };
  }, buf.toString('base64'));
  return { file, ...stats };
}

const fail = [];
try {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.locator('[data-mode="freeplay"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('.freeplay-start-btn').click();
  await page.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(3000);

  const before = await canvasStats('1-before-loss');
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    window.__gosLoseExt = ext;
    ext.loseContext();
    return true;
  });
  if (!lost) throw new Error('WEBGL_lose_context unavailable');
  await page.waitForTimeout(1200);
  const during = await canvasStats('2-context-lost');
  const lostFlag = await page.evaluate(() => document.querySelector('canvas').getContext('webgl2')?.isContextLost?.() ?? null);

  await page.evaluate(() => window.__gosLoseExt.restoreContext());
  await page.waitForTimeout(3000);
  const after = await canvasStats('3-after-restore');

  // Plant one cell after the restore: pick the first usable crop and click a
  // bed cell located by the scene's own projection.
  const fab = page.locator('#fab-plant');
  if (await fab.isVisible().catch(() => false)) await fab.click();
  await page.waitForTimeout(700);
  const crop = page.locator('#crop-palette-panel [data-crop]:not([disabled])').first();
  let planted = null;
  if (await crop.count()) {
    await crop.click();
    await page.waitForTimeout(300);
    const cells = (await page.evaluate(() => window.gardenOS.getVisualDebug().gridCells)).sort((a, b) => a.index - b.index);
    const target = cells[Math.floor(cells.length / 2)];
    await page.mouse.click(target.screenX, target.screenY);
    await page.waitForTimeout(800);
    const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    planted = s.plantedCells?.length ?? null;
  }
  const afterPlant = await canvasStats('4-after-restore-planted');

  const result = { before, during, lostFlag, after, planted, afterPlant, threeLogs: logs.filter((l) => /Context (Lost|Restored)|graphics/i.test(l)).slice(0, 6), errors };
  console.log(JSON.stringify(result, null, 2));
  if (after.colours < Math.max(8, before.colours * 0.3)) fail.push(`restored frame looks blank (colours ${after.colours} vs ${before.colours} before)`);
  if (!(planted >= 1)) fail.push(`bed did not accept a planting click after restore (planted=${planted})`);
  if (errors.length) fail.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
} catch (err) {
  fail.push(err.message);
} finally {
  await browser.close();
}
if (fail.length) { console.error('context_loss_e2e=FAIL\n' + fail.join('\n')); process.exit(1); }
console.log('context_loss_e2e=ok');
