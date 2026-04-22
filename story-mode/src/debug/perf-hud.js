function getDebugFlags(search = '') {
  const params = new URLSearchParams(search);
  const flags = new Set();

  for (const value of params.getAll('debug')) {
    for (const part of value.split(',')) {
      const normalized = part.trim().toLowerCase();
      if (normalized) flags.add(normalized);
    }
  }

  return flags;
}

export function isPerfDebugEnabled(search = window.location.search) {
  return getDebugFlags(search).has('perf');
}

export function createPerfHud({ renderer, mount = document.body } = {}) {
  if (!mount) {
    return {
      sample() {},
      dispose() {},
    };
  }

  const root = document.createElement('aside');
  root.setAttribute('data-debug-perf', 'true');
  root.setAttribute('aria-live', 'off');
  root.style.position = 'fixed';
  root.style.top = '12px';
  root.style.right = '12px';
  root.style.zIndex = '9999';
  root.style.minWidth = '150px';
  root.style.padding = '10px 12px';
  root.style.border = '1px solid rgba(232, 200, 74, 0.28)';
  root.style.borderRadius = '12px';
  root.style.background = 'rgba(19, 13, 9, 0.88)';
  root.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.28)';
  root.style.backdropFilter = 'blur(10px)';
  root.style.fontFamily = "'DM Mono', monospace";
  root.style.fontSize = '11px';
  root.style.lineHeight = '1.45';
  root.style.letterSpacing = '0.03em';
  root.style.color = 'rgba(247, 242, 234, 0.92)';
  root.style.pointerEvents = 'none';
  root.innerHTML = `
    <div style="margin-bottom:6px;color:rgba(232,200,74,0.92);text-transform:uppercase;">Perf</div>
    <div data-perf-fps>FPS --</div>
    <div data-perf-frame>Frame -- ms</div>
    <div data-perf-calls>Calls --</div>
    <div data-perf-tris>Tris --</div>
    <div data-perf-memory>Geo -- | Tex --</div>
  `;
  mount.appendChild(root);

  const fpsEl = root.querySelector('[data-perf-fps]');
  const frameEl = root.querySelector('[data-perf-frame]');
  const callsEl = root.querySelector('[data-perf-calls]');
  const trisEl = root.querySelector('[data-perf-tris]');
  const memoryEl = root.querySelector('[data-perf-memory]');

  let sampleFrames = 0;
  let sampleSeconds = 0;
  let updateCountdown = 0;

  function update({ dt }) {
    sampleFrames += 1;
    sampleSeconds += dt;
    updateCountdown += dt;

    if (updateCountdown < 0.2) return;

    const fps = sampleSeconds > 0 ? sampleFrames / sampleSeconds : 0;
    const frameMs = dt * 1000;
    const info = renderer?.info;
    const render = info?.render ?? {};
    const memory = info?.memory ?? {};

    if (fpsEl) fpsEl.textContent = `FPS ${fps.toFixed(1)}`;
    if (frameEl) frameEl.textContent = `Frame ${frameMs.toFixed(1)} ms`;
    if (callsEl) callsEl.textContent = `Calls ${render.calls ?? '--'}`;
    if (trisEl) trisEl.textContent = `Tris ${render.triangles ?? '--'}`;
    if (memoryEl) {
      memoryEl.textContent = `Geo ${memory.geometries ?? '--'} | Tex ${memory.textures ?? '--'}`;
    }

    sampleFrames = 0;
    sampleSeconds = 0;
    updateCountdown = 0;
  }

  return {
    sample({ dt }) {
      update({ dt });
    },
    dispose() {
      root.remove();
    },
  };
}
