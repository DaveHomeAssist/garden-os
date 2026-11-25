import '../assets/css/hud-foundation.css';
import '../assets/css/hud-controls.css';
import '../assets/css/hud-interactions.css';
import '../assets/css/village-overlays.css';
import '../assets/css/mobile-a11y.css';
import '../assets/css/phone-controls.css';
import '../assets/css/phone-hud.css';
import '../../garden-theme.js';
import '../../garden-pwa.js';
import { initGame, showTitleScreen } from './game/game-init.js';
import { loadContentPacks } from './game/pack-loader.js';
import { installPackContent, resetPackContent } from './content/content-registry.js';
import { loadInstalledPacks } from './content/installed-packs.js';
import { isOfficialContent } from './content/official-content.js';
import { installModalFocus } from './ui/modal-focus.js';
import { STORAGE_FALLBACK_EVENT, isStorageFallbackActive } from './game/safe-storage.js';
import { showStorageFallbackNotice } from './ui/storage-notice.js';
import { renderSessionError } from './ui/session-error.js';

document.body.dataset.designLanguage = 'field-kit';
installModalFocus();

// H2: when the browser blocks storage (for example third-party storage in the
// mixmash.games iframe) saves live in memory for this tab. Say so once, quietly.
window.addEventListener(STORAGE_FALLBACK_EVENT, () => showStorageFallbackNotice(), { once: true });
if (isStorageFallbackActive()) showStorageFallbackNotice();

// Theme on the title screen lives in the title actions grid (#title-theme),
// not in the shared floating toggle: on phones that pill sat on top of Import
// Save and the setup swatches. garden-theme.js sees this button (it carries
// data-garden-theme-toggle), skips the floating one and keeps its icon and
// label in sync; in play, Theme lives in the pause menu.
document.getElementById('title-theme')?.addEventListener('click', () => {
  const theme = window.GardenTheme;
  if (!theme?.setTheme) return;
  theme.setTheme(theme.getTheme() === 'dark' ? 'light' : 'dark');
});

let runtimeModulesPromise = null;

function loadRuntimeModules() {
  if (!runtimeModulesPromise) {
    runtimeModulesPromise = Promise.all([
      import('./input/input-manager.js'),
      import('./scene/garden-scene.js'),
      import('./ui/ui-binder.js'),
      import('./scene/zone-manager.js'),
      import('./scene/zones/zone-registry.js'),
      import('./scene/resource-tracker.js'),
    ]).then(([inputManagerModule, sceneModule, uiModule, zmModule, zrModule, rtModule]) => ({
      InputManager: inputManagerModule.InputManager,
      createGardenScene: sceneModule.createGardenScene,
      bindUI: uiModule.bindUI,
      ZoneManager: zmModule.ZoneManager,
      registerAllZones: zrModule.registerAllZones,
      registerVillageZone: zrModule.registerVillageZone,
      ResourceTracker: rtModule.ResourceTracker,
    }));
  }
  return runtimeModulesPromise;
}

function scheduleRuntimePreload() {
  // Warm the runtime chunk eagerly the moment the title mounts. This work
  // (module eval + texture decode + first GPU upload) is ~1.8s of main-thread
  // time; if it is deferred to the New Game click it coalesces into one frozen
  // task and the intro looks broken. Kicking it off immediately lets it run —
  // and mostly settle — while the player is still reading the static title.
  const preload = () => { void loadRuntimeModules().catch(() => {}); };
  // A near-immediate timeout (not requestIdleCallback, which a fast click beats,
  // and not synchronous, so the title paints first).
  window.setTimeout(preload, 0);
}

function showViewportLoading(viewport) {
  if (!viewport) return () => {};

  const loading = document.createElement('div');
  loading.setAttribute('data-loading-garden', 'true');
  loading.style.position = 'absolute';
  loading.style.inset = '0';
  loading.style.display = 'grid';
  loading.style.placeItems = 'center';
  loading.style.fontFamily = "'DM Mono', monospace";
  loading.style.fontSize = '11px';
  loading.style.letterSpacing = '0.12em';
  loading.style.textTransform = 'uppercase';
  loading.style.color = 'rgba(232,200,74,0.82)';
  loading.style.background = 'radial-gradient(circle at center, rgba(42,25,16,0.2), rgba(30,17,10,0.78))';
  loading.style.pointerEvents = 'none';
  loading.textContent = 'Loading Garden';
  viewport.appendChild(loading);

  return () => loading.remove();
}

async function startSession({ initialState, slot, viewport, planner }) {
  const clearLoading = showViewportLoading(viewport);

  try {
    const {
      InputManager, createGardenScene, bindUI,
      ZoneManager, registerAllZones, registerVillageZone, ResourceTracker,
    } = await loadRuntimeModules();
    clearLoading();

    if (viewport) {
      viewport.innerHTML = '';
    }

    // Player-installed packs (pause menu > Content Packs) load at boot, plus
    // any a developer injects through globalThis.GARDEN_OS_CONTENT_PACKS.
    const packs = [...loadInstalledPacks(), ...(globalThis.GARDEN_OS_CONTENT_PACKS ?? [])];
    const packResult = loadContentPacks(initialState, packs, { isOfficial: isOfficialContent });
    resetPackContent();
    installPackContent(packResult.content, { isOfficial: isOfficialContent, packs: packResult.loaded });
    globalThis.GARDEN_OS_LOADED_CONTENT = packResult;

    const scene = createGardenScene(viewport);
    // Pre-compile shaders + upload textures off the blocking path before the
    // render loop starts. Otherwise the first frame stalls the main thread for
    // ~1.8s (the intro's frozen black screen) doing all of it synchronously.
    await scene.warmup?.();
    const inputManager = new InputManager(scene.canvas, { keyboardTarget: document });
    const { store, data, cleanup, persistGameState } = initGame(packResult.state, { slot });

    if (planner) {
      const { bindPlannerUI } = await import('./ui/planner-binder.js');
      // Planner mode exits only via page refresh today, so the dispose handle
      // returned by bindPlannerUI and the cleanup from initGame are not wired.
      // When a back-to-title flow is added, capture both and invoke them before
      // re-mounting the title screen.
      bindPlannerUI(store, scene, viewport);
      window.gardenOS = {
        getVisualDebug: () => scene.getVisualDebug?.() ?? null,
      };
      return;
    }

    // Create zone manager and register all zone factories + exit triggers
    const zoneResourceTracker = new ResourceTracker();
    const zoneManager = new ZoneManager(scene.getRenderer?.(), store, zoneResourceTracker);
    registerAllZones(zoneManager, store, zoneResourceTracker);
    // Village V0: Free Play saves only (Story Mode keeps its yard).
    registerVillageZone(zoneManager, { slot, store });

    // Transition to the player's current zone (or default to player_plot)
    const startZone = packResult.state.campaign?.worldState?.currentZone ?? 'player_plot';
    const startSpawn = packResult.state.campaign?.worldState?.lastSpawnPoint ?? null;
    zoneManager.transitionTo(startZone, startSpawn);

    bindUI({
      store,
      data,
      scene,
      inputManager,
      viewport,
      slot,
      destroyInit: cleanup,
      persistGameState,
      remount: mount,
      zoneManager,
    });
  } catch (err) {
    clearLoading();
    console.error('[GOS] Session failed:', err);
    renderSessionError(viewport ?? document.getElementById('app'), err);
  }
}

function mount() {
  showTitleScreen((payload) => {
    void startSession(payload);
  });
  scheduleRuntimePreload();
}

try {
  mount();
} catch (err) {
  console.error('[GOS] Mount failed:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="padding:32px;max-width:480px;margin:auto;text-align:center;font-family:sans-serif;color:#f7f2ea">
        <h2 style="color:#e8c84a;font-size:1.4rem;margin-bottom:12px">Garden OS couldn't start</h2>
        <p style="font-size:0.875rem;color:rgba(247,242,234,0.7);margin-bottom:20px">
          Try refreshing. If the problem persists, your browser may not support required features.
        </p>
        <button onclick="location.reload()" style="padding:10px 20px;border-radius:999px;border:1px solid rgba(232,200,74,0.3);background:rgba(232,200,74,0.1);color:#e8c84a;cursor:pointer">
          Reload
        </button>
      </div>`;
  }
}
