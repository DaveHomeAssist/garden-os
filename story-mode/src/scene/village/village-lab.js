/**
 * Village Lab (dev page, not part of the production build): boots the village
 * scene standalone with its own walk sim so it can be walked, captured and
 * measured without a save. Keyboard (WASD / arrows), tap-to-move and the touch
 * stick; no fades. `?quality=low|high`, `?hud=0` to hide the stats line.
 * window.villageLab exposes hooks for the capture/perf scripts.
 */
import * as THREE from 'three';
import { createVillageScene } from './village-scene.js';
import { resolveArtQuality, getArtQualityPreset } from '../yard-art/art-quality.js';
import { createSimulationState, stepSimulationState, FIXED_SIMULATION_DT } from '../../engine/simulation-core.js';
import { createTouchStick } from '../../ui/touch-stick.js';

const app = document.getElementById('app');
const hudEl = document.getElementById('lab-hud');
const params = new URLSearchParams(location.search);
if (params.get('hud') === '0') hudEl.style.display = 'none';
const quality = resolveArtQuality();
const preset = getArtQualityPreset(quality.tier);
const renderer = new THREE.WebGLRenderer({
  antialias: quality.tier !== 'low',
  preserveDrawingBuffer: Boolean(globalThis.GARDEN_OS_PRESERVE_DRAWING_BUFFER),
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, preset.maxPixelRatio));
app.appendChild(renderer.domElement);

const village = createVillageScene({ renderer, quality, inputElement: renderer.domElement });
const { layout } = village;
const simConfig = { bounds: layout.bounds, blockers: layout.blockers };
let sim = createSimulationState({ ...simConfig, initialPosition: layout.spawn, facing: layout.spawn.facing });
village.setPlayerState(sim);
// setPlayerPose (game layer / restore) moves this sim too
village.setPoseHandler(({ x, z, facingY }) => {
  sim = { ...createSimulationState({ ...simConfig, initialPosition: { x, z }, facing: facingY }) };
});

const keys = new Set();
const scripted = { x: 0, z: 0 };
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); });
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });
addEventListener('blur', () => keys.clear());
const stick = createTouchStick();
stick.mount(app);
stick.setEnabled(true);

const triggerLog = [];
village.onTrigger((phase, trigger) => { triggerLog.push({ t: performance.now(), phase, ...trigger }); if (triggerLog.length > 200) triggerLog.shift(); });

function resize() {
  const w = app.clientWidth || innerWidth;
  const h = app.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  village.camera.aspect = w / h;
  village.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function inputVector(dt) {
  let x = 0; let z = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) z -= 1;
  if (keys.has('s') || keys.has('arrowdown')) z += 1;
  const s = stick.getVector();
  if (s.active && Math.hypot(s.x, s.y) >= Math.hypot(x, z)) { x = s.x; z = s.y; }
  if (scripted.x || scripted.z) { x = scripted.x; z = scripted.z; }
  if (x || z) {
    village.clearWalk();
    // fixed-yaw follow camera: camera-relative input is the identity at azimuth 0
    const a = village.getCameraAzimuth();
    if (a) { const c = Math.cos(a); const sn = Math.sin(a); return { x: x * c + z * sn, z: -x * sn + z * c }; }
    return { x, z };
  }
  return village.getMovementVector(dt);
}

// frame stats (wall-clock frame times)
let frameTimes = [];
let overview = false;
let acc = 0;
let last = performance.now();
let frames = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 20000) frameTimes.shift();
  acc += dt;
  let steps = 0;
  while (acc >= FIXED_SIMULATION_DT && steps < 6) {
    sim = stepSimulationState(sim, { config: simConfig, dt: FIXED_SIMULATION_DT, input: inputVector(FIXED_SIMULATION_DT) });
    acc -= FIXED_SIMULATION_DT;
    steps += 1;
  }
  if (steps === 6) acc = 0;
  village.setPlayerState(sim);
  village.update(dt);
  if (overview) applyOverview();
  renderer.info.reset();
  village.render(renderer);
  frames += 1;
  if (hudEl.style.display !== 'none' && frames % 15 === 0) {
    hudEl.textContent = `village V0 · ${quality.tier} · calls ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}\npos ${sim.position.x.toFixed(1)}, ${sim.position.z.toFixed(1)}`;
  }
  requestAnimationFrame(frame);
}
renderer.info.autoReset = false;

function applyOverview() {
  const b = layout.bounds;
  const cx = (b.minX + b.maxX) / 2; const cz = (b.minZ + b.maxZ) / 2;
  village.camera.position.set(cx, 78, cz + 52);
  village.camera.lookAt(cx, 0, cz + 2);
}

function stats(list) {
  const fps = list.map((ms) => 1000 / ms).sort((a, b) => a - b);
  const n = fps.length;
  if (!n) return null;
  const avgMs = list.reduce((s, v) => s + v, 0) / n;
  const low1 = fps.slice(0, Math.max(1, Math.floor(n * 0.01)));
  return {
    frames: n,
    avgFps: 1000 / avgMs,
    medianFps: fps[Math.floor(n / 2)],
    low1Fps: low1.reduce((s, v) => s + v, 0) / low1.length,
    worstMs: Math.max(...list),
  };
}

window.villageLab = {
  ready: village.ready,
  quality,
  layout,
  village,
  renderer,
  getPlayer: () => ({ ...sim.position, facing: sim.facing, moving: sim.moving }),
  teleport(x, z, facingY) { village.setPlayerPose({ x, z, facingY }); },
  getPlayerPose: () => village.getPlayerPose(),
  walkTo: (x, z) => village.walkTo({ x, z }),
  setScriptedInput(x, z) { scripted.x = x; scripted.z = z; },
  setOverview(on) { overview = Boolean(on); },
  resetFrameStats() { frameTimes = []; },
  frameStats: () => stats(frameTimes),
  triggerLog,
  renderInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
  debug: () => village.getDebugState(),
};
requestAnimationFrame(frame);
