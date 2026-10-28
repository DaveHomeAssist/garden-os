// Village V0 capture + budget gate (local art review tool and CI phone gate).
// Boots village-lab.html under Vite, then for each viewport: player view +
// overview screenshots, one full frame of draw calls/triangles, and optionally
// a 60 s seeded random walk with frame-time stats.
// Usage: node scripts/art/capture-village.mjs <outDir> [label] [--quality=low|high]
//          [--only=desktop|phone] [--gate] [--walk=60] [--max-calls=150] [--max-tris=150000]
// --gate exits 1 if the phone view (low tier) is at/over the budget.
// FPS here comes from whatever GL the browser has; on a box without a GPU that
// is SwiftShader (software) and is reported as such.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const storyDir = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const outDir = resolve(positional[0] || '/tmp/village-shots');
const label = positional[1] || 'village';
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const flag = (k) => args.includes(`--${k}`);
const quality = arg('quality', 'low');
const only = arg('only', '');
const walkSeconds = Number(arg('walk', '0'));
const maxCalls = Number(arg('max-calls', '150'));
const maxTris = Number(arg('max-tris', '150000'));
const gate = flag('gate');

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
const vite = await createVite({ root: storyDir, configFile: join(storyDir, 'vite.config.js'), logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, hmr: false } });
await vite.listen();
await mkdir(outDir, { recursive: true });

// Playwright's bundled Chromium first (what CI installs), then a system Chrome.
const launchArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'];
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: launchArgs });
} catch (err) {
  if (!existsSync('/usr/bin/google-chrome')) throw err;
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: launchArgs });
}
const viewports = [
  { name: 'desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const report = { quality, budget: { maxCalls, maxTris } };
let failed = false;
try {
  for (const vp of viewports.filter((v) => !only || v.name === only)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().replace(`http://127.0.0.1:${port}`, '')}`); });
    await page.addInitScript(() => { globalThis.GARDEN_OS_PRESERVE_DRAWING_BUFFER = true; });
    await page.goto(`http://127.0.0.1:${port}/garden-os/story-mode/village-lab.html?quality=${quality}&hud=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.villageLab, null, { timeout: 120000 });
    await page.evaluate(() => window.villageLab.ready);
    await page.waitForTimeout(1500);
    const gl = await page.evaluate(() => {
      const ctx = window.villageLab.renderer.getContext();
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      return ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER);
    });
    const measure = () => page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return window.villageLab.renderInfo();
    });
    const player = await measure();
    const playerShot = join(outDir, `${label}-${vp.name}-player.png`);
    await page.screenshot({ path: playerShot });
    await page.evaluate(() => window.villageLab.setOverview(true));
    const over = await measure();
    const overShot = join(outDir, `${label}-${vp.name}-overview.png`);
    await page.screenshot({ path: overShot });
    await page.evaluate(() => window.villageLab.setOverview(false));
    // cutaway: stand just in front of the home house so it sits between camera and player
    const cut = await page.evaluate(async () => {
      const lab = window.villageLab;
      const h = lab.layout.entries.find((e) => e.id === 'house_home');
      const ahead = h.footprint.d / 2 + 0.9;
      lab.teleport(h.x + Math.sin(h.rotation) * ahead, h.z + Math.cos(h.rotation) * ahead);
      await new Promise((r) => setTimeout(r, 1500));
      return { cutaway: lab.debug().cutaway, ...lab.renderInfo() };
    });
    const cutShot = join(outDir, `${label}-${vp.name}-cutaway.png`);
    await page.screenshot({ path: cutShot });
    await page.evaluate(() => { const s = window.villageLab.layout.spawn; window.villageLab.teleport(s.x, s.z); });
    await page.waitForTimeout(500);
    let walk = null;
    if (walkSeconds > 0) {
      walk = await page.evaluate(async (seconds) => {
        const lab = window.villageLab;
        let seed = 20261027;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        lab.resetFrameStats();
        const t0 = performance.now();
        let maxCallsSeen = 0; let maxTrisSeen = 0;
        let lastPos = lab.getPlayer(); let stillFor = 0; let stuckMax = 0;
        while (performance.now() - t0 < seconds * 1000) {
          const a = rnd() * Math.PI * 2;
          lab.setScriptedInput(Math.cos(a), Math.sin(a));
          const until = performance.now() + 600 + rnd() * 1400;
          while (performance.now() < until) {
            await new Promise((r) => requestAnimationFrame(r));
            const info = lab.renderInfo();
            maxCallsSeen = Math.max(maxCallsSeen, info.calls);
            maxTrisSeen = Math.max(maxTrisSeen, info.triangles);
          }
          const p = lab.getPlayer();
          const moved = Math.hypot(p.x - lastPos.x, p.z - lastPos.z);
          stillFor = moved < 0.05 ? stillFor + 1 : 0;
          stuckMax = Math.max(stuckMax, stillFor);
          lastPos = p;
        }
        lab.setScriptedInput(0, 0);
        return { seconds, ...lab.frameStats(), maxCalls: maxCallsSeen, maxTris: maxTrisSeen, longestStillLegs: stuckMax };
      }, walkSeconds);
    }
    const debug = await page.evaluate(() => window.villageLab.debug());
    report[vp.name] = { gl, software: /swiftshader|llvmpipe|software/i.test(gl), player, overview: over, cutaway: cut, walk, files: { player: playerShot, overview: overShot, cutaway: cutShot }, debug, errors: errors.slice(0, 10) };
    console.log(vp.name, JSON.stringify({ gl, player, overview: over, cutaway: cut, walk, errors: errors.length }));
    if (gate && vp.name === 'phone') {
      const worst = { calls: Math.max(player.calls, walk?.maxCalls ?? 0), tris: Math.max(player.triangles, walk?.maxTris ?? 0) };
      if (worst.calls >= maxCalls || worst.tris >= maxTris || errors.length) {
        console.error(`village phone gate FAILED: calls ${worst.calls} (< ${maxCalls}), tris ${worst.tris} (< ${maxTris}), errors ${errors.length}`);
        failed = true;
      } else {
        console.log(`village phone gate ok: calls ${worst.calls} < ${maxCalls}, tris ${worst.tris} < ${maxTris}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await vite.close();
}
await writeFile(join(outDir, `${label}-report.json`), JSON.stringify(report, null, 2));
if (failed) process.exit(1);
