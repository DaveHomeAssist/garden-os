import { initGame, showTitleScreen } from './game/game-init.js';

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
      ResourceTracker: rtModule.ResourceTracker,
    }));
  }
  return runtimeModulesPromise;
}

function scheduleRuntimePreload() {
  const preload = () => {
    void loadRuntimeModules().catch(() => {});
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(preload, { timeout: 1500 });
    return;
  }

  window.setTimeout(preload, 80);
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
      ZoneManager, registerAllZones, ResourceTracker,
    } = await loadRuntimeModules();
    clearLoading();

    if (viewport) {
      viewport.innerHTML = '';
    }

    const scene = createGardenScene(viewport);
    const inputManager = new InputManager(scene.canvas, { keyboardTarget: document });
    const { store, data, cleanup } = initGame(initialState, { slot });

    if (planner) {
      const { bindPlannerUI } = await import('./ui/planner-binder.js');
      bindPlannerUI(store, scene, inputManager, viewport);
      return;
    }

    // Create zone manager and register all zone factories + exit triggers
    const zoneResourceTracker = new ResourceTracker();
    const zoneManager = new ZoneManager(null, store, zoneResourceTracker);
    registerAllZones(zoneManager, store, zoneResourceTracker);

    // Transition to the player's current zone (or default to player_plot)
    const startZone = initialState.campaign?.worldState?.currentZone ?? 'player_plot';
    const startSpawn = initialState.campaign?.worldState?.lastSpawnPoint ?? null;
    zoneManager.transitionTo(startZone, startSpawn);

    bindUI({
      store,
      data,
      scene,
      inputManager,
      viewport,
      slot,
      destroyInit: cleanup,
      remount: mount,
      zoneManager,
    });
  } catch (err) {
    clearLoading();
    console.error('[GOS] Session failed:', err);
    const host = viewport ?? document.getElementById('app');
    if (host) {
      host.innerHTML = `
        <div style="padding:32px;max-width:480px;margin:auto;text-align:center;font-family:'DM Sans',sans-serif;color:#f7f2ea">
          <h2 style="color:#e8c84a;font-family:'Fraunces',serif;font-size:1.4rem;margin-bottom:12px">Something went wrong</h2>
          <p style="font-size:0.875rem;line-height:1.5;color:rgba(247,242,234,0.7);margin-bottom:20px">
            The garden couldn't load. This usually resolves with a refresh.
          </p>
          <button onclick="location.reload()" style="padding:10px 20px;border-radius:999px;border:1px solid rgba(232,200,74,0.3);background:rgba(232,200,74,0.1);color:#e8c84a;font-family:'DM Sans',sans-serif;font-size:0.875rem;cursor:pointer">
            Reload
          </button>
          <details style="margin-top:20px;text-align:left;font-size:0.75rem;color:rgba(247,242,234,0.35)">
            <summary style="cursor:pointer">Technical details</summary>
            <pre style="margin-top:8px;white-space:pre-wrap;word-break:break-word">${err.stack || err.message}</pre>
          </details>
        </div>`;
    }
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
