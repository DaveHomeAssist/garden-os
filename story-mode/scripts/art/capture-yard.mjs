// Capture the Story Mode opening yard from the default camera and measure
// draw calls + loaded art weight. Local-only art review tool.
// Usage: node scripts/art/capture-yard.mjs <outDir> [label] [--quality=low|high]
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const storyDir = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const outDir = resolve(process.argv[2] || '/tmp/yard-shots');
const label = process.argv[3] || 'shot';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
// Default camera matches the reference frame (current-yard.png): orbit swung
// right so the cottage sits back-right, pulled out toward max zoom.
const cam = { theta: Number(arg('theta', '0.8')), phi: Number(arg('phi', '0.2')), wheel: Number(arg('wheel', '500')) };
const only = arg('only', '');
const qualityArg = (process.argv.find((a) => a.startsWith('--quality=')) || '').split('=')[1] || '';
const { chromium } = await import(pathToFileURL(join(storyDir, 'node_modules/playwright/index.mjs')).href);
const { createServer: createVite } = await import(pathToFileURL(join(storyDir, 'node_modules/vite/dist/node/index.js')).href);

async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}

const port = await freePort();
const vite = await createVite({ root: storyDir, configFile: join(storyDir, 'vite.config.js'), logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true } });
await vite.listen();
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'],
});
const viewports = [
  { name: 'desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const report = {};
try {
  for (const vp of viewports.filter((v) => !only || v.name === only)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const q = qualityArg ? `?quality=${qualityArg}` : '';
    await page.addInitScript(() => { globalThis.GARDEN_OS_PRESERVE_DRAWING_BUFFER = true; });
    await page.goto(`http://127.0.0.1:${port}/${q}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#title-screen', { state: 'visible', timeout: 120000 });
    await page.locator('[data-action="new"][data-slot="0"]').first().click();
    await page.getByRole('button', { name: 'Start Story' }).click({ timeout: 20000 });
    try {
      await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 150000 });
    } catch (e) {
      await page.screenshot({ path: join(outDir, `${label}-${vp.name}-FAIL.png`) });
      throw e;
    }
    // Let intro/cutscenes settle; skip any dialogue so the HUD matches the reference frame.
    await page.waitForTimeout(6000);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
    // Close anything modal that might be left (pause menu opened by Escape)
    await page.evaluate(() => {
      document.querySelectorAll('[data-action="resume"], .pause-resume, #pause-resume').forEach((b) => b.click());
    });
    await page.evaluate(({ theta, phi }) => window.gardenOS._sceneDebug.applyCameraOrbitDelta?.(-theta, -phi), cam);
    if (cam.wheel) {
      await page.mouse.move(vp.width / 2, vp.height / 2);
      await page.evaluate((dy) => document.querySelector('#viewport canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true })), cam.wheel);
    }
    await page.waitForTimeout(4000);
    const stats = await page.evaluate(async () => {
      const scene = window.gardenOS?._sceneDebug;
      const renderer = scene?.getRenderer?.();
      if (!renderer) return { error: 'no renderer' };
      // Count draw calls for one full frame (all render() passes).
      let calls = 0, tris = 0, passes = 0;
      const orig = renderer.render.bind(renderer);
      renderer.info.autoReset = false;
      renderer.info.reset();
      await new Promise((r) => requestAnimationFrame(() => r()));
      renderer.info.reset();
      await new Promise((r) => requestAnimationFrame(() => r()));
      calls = renderer.info.render.calls; tris = renderer.info.render.triangles;
      renderer.info.autoReset = true;
      const mem = { ...renderer.info.memory };
      const res = performance.getEntriesByType('resource');
      const art = res.filter((e) => /\.(png|jpe?g|webp|ktx2|glb|gltf|bin|basis)(\?|$)/i.test(e.name));
      const artBytes = art.reduce((s, e) => s + (e.decodedBodySize || e.transferSize || 0), 0);
      return { calls, tris, mem, artCount: art.length, artBytes, artFiles: art.map((e) => [e.name.replace(location.origin, ''), e.decodedBodySize]), quality: document.body.dataset.artQuality || null, yardArt: scene.getYardArtDebug?.() ?? null, text: JSON.parse(window.gardenOS.render_game_to_text()).currentZone };
    });
    const file = join(outDir, `${label}-${vp.name}.png`);
    await page.screenshot({ path: file });
    report[vp.name] = { file, ...stats, errors: errors.slice(0, 10) };
    console.log(vp.name, JSON.stringify({ calls: stats.calls, tris: stats.tris, artBytes: stats.artBytes, artCount: stats.artCount, zone: stats.text, quality: stats.quality, errors: errors.length }));
    await ctx.close();
  }
} finally {
  await browser.close();
  await vite.close();
}
await writeFile(join(outDir, `${label}-report.json`), JSON.stringify(report, null, 2));
