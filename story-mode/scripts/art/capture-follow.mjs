// Headless shots + one-frame perf for the gardener follow camera.
// Usage: node scripts/art/capture-follow.mjs <url> <outDir> <label>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const url = process.argv[2];
const outDir = process.argv[3];
const label = process.argv[4] || 'shot';
if (!url || !outDir) {
  console.error('usage: node scripts/art/capture-follow.mjs <url> <outDir> <label>');
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'],
});

const viewports = [
  { name: 'phone-portrait', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 800 },
];

async function enterFreePlay(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Start Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 120000 });
  await page.waitForFunction(() => {
    const d = window.gardenOS?.village?.getDebugState?.();
    return d && d.zone === 'player_plot' && !d.travelling;
  }, null, { timeout: 60000 });
  await page.waitForTimeout(800);
}

async function sample(page) {
  return page.evaluate(async () => {
    const renderer = window.gardenOS?._sceneDebug?.getRenderer?.();
    if (!renderer) return null;
    const frames = [];
    for (let i = 0; i < 12; i += 1) {
      renderer.info.autoReset = false;
      renderer.info.reset();
      const t0 = performance.now();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const t1 = performance.now();
      frames.push({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        frameMs: t1 - t0,
      });
    }
    renderer.info.autoReset = true;
    const mid = frames.slice().sort((a, b) => a.frameMs - b.frameMs)[Math.floor(frames.length / 2)];
    return mid;
  });
}

const report = { label, viewports: {} };
try {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await enterFreePlay(page);
    await page.screenshot({ path: join(outDir, `${label}-yard-${vp.name}.png`) });
    const yard = await sample(page);
    const yardCam = await page.evaluate(() => window.gardenOS.getCameraDebug?.() ?? null);
    await page.locator('#village-back').click();
    await page.waitForFunction(() => window.gardenOS?.village?.getDebugState?.()?.zone === 'village', null, { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(outDir, `${label}-village-${vp.name}.png`) });
    const village = await sample(page);
    const villageCam = await page.evaluate(() => window.gardenOS.village?.getDebugState?.()?.camera ?? null);
    report.viewports[vp.name] = { yard, village, yardCam, villageCam, errors };
    await page.close();
  }

  // Walk / turn strip in the yard, phone portrait.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await enterFreePlay(page);
  const frames = [];
  await page.keyboard.down('d');
  for (let i = 0; i < 8; i += 1) {
    await page.waitForTimeout(160);
    const file = join(outDir, `${label}-turn-${i}.png`);
    await page.screenshot({ path: file });
    frames.push(file);
  }
  await page.keyboard.up('d');
  report.turnFrames = frames;
  await page.close();
} finally {
  await browser.close();
}
await writeFile(join(outDir, `${label}-perf.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
