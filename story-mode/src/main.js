import { initGame, showTitleScreen } from './game/game-init.js';

let runtimeModulesPromise = null;

function loadRuntimeModules() {
  if (!runtimeModulesPromise) {
    runtimeModulesPromise = Promise.all([
      import('./input/input-manager.js'),
      import('./scene/garden-scene.js'),
      import('./ui/ui-binder.js'),
    ]).then(([inputManagerModule, sceneModule, uiModule]) => ({
      InputManager: inputManagerModule.InputManager,
      createGardenScene: sceneModule.createGardenScene,
      bindUI: uiModule.bindUI,
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

async function startSession({ initialState, slot, viewport }) {
  const clearLoading = showViewportLoading(viewport);

  try {
    const { InputManager, createGardenScene, bindUI } = await loadRuntimeModules();
    clearLoading();

    if (viewport) {
      viewport.innerHTML = '';
    }

    const scene = createGardenScene(viewport);
    const inputManager = new InputManager(scene.canvas, { keyboardTarget: document });
    const { store, data, cleanup } = initGame(initialState, { slot });

    bindUI({
      store,
      data,
      scene,
      inputManager,
      viewport,
      slot,
      destroyInit: cleanup,
      remount: mount,
    });
  } catch (err) {
    clearLoading();
    const host = viewport ?? document.getElementById('app');
    if (host) {
      host.innerHTML = `<div style="padding:24px;color:#e8c84a;font-family:monospace">${err.message}</div>`;
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
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<pre style="color:#e8c84a;padding:24px;font-family:monospace;white-space:pre-wrap">${err.stack || err.message}</pre>`;
  }
}
