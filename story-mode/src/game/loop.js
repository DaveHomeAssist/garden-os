/**
 * Game Loop — requestAnimationFrame render loop.
 * Game logic is event-driven (turn-based), loop is for rendering/animation only.
 *
 * Work-avoidance (3D BOT perf sprint, 2026-10-17):
 * - hold(reason) / release(reason): while any hold is active (tab hidden,
 *   pause menu open) no frames are scheduled at all. requestRender() still
 *   draws a single frame on demand (e.g. a resize or a state change behind the
 *   menu), so the last image is never stale.
 * - services.getMinFrameIntervalMs(): lets the session cap the frame rate
 *   while the player is idle. Skipped rAF callbacks do no sync/render work;
 *   the next real step gets the full elapsed dt so ambient animation keeps
 *   its speed, just at a lower rate.
 */
const MAX_ACTIVE_DT = 0.05;
const MAX_IDLE_DT = 0.1;
const ON_DEMAND_DT = 0.0001;

export function createLoop(services) {
  let rafId = 0;
  let lastTime = performance.now();
  let running = false;
  let renderRequested = false;
  const holds = new Set();
  const stats = { steps: 0, skipped: 0, onDemand: 0 };

  function runStep(dt, { manual = false } = {}) {
    services.update?.(dt, { manual });
    renderOnly(dt);
    services.onFrame?.({ dt, manual });
    stats.steps += 1;
  }

  function renderOnly(dt) {
    services.scene.setFrameDelta?.(dt);
    services.scene.sync(services.getState());
    if (typeof services.render === 'function') {
      services.render();
    } else {
      services.scene.render();
    }
  }

  function schedule() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    if (!running) return;
    if (holds.size) {
      if (renderRequested) {
        renderRequested = false;
        stats.onDemand += 1;
        renderOnly(ON_DEMAND_DT);
      }
      lastTime = now;
      return; // nothing rescheduled until release() or requestRender()
    }
    const minInterval = Math.max(0, Number(services.getMinFrameIntervalMs?.() ?? 0) || 0);
    const elapsedMs = now - lastTime;
    // 1 ms of slack so a 50 ms cap isn't missed by rAF jitter.
    if (minInterval > 0 && elapsedMs < minInterval - 1 && !renderRequested) {
      stats.skipped += 1;
      schedule();
      return;
    }
    renderRequested = false;
    const maxDt = minInterval > 0 ? Math.max(MAX_ACTIVE_DT, Math.min(MAX_IDLE_DT, minInterval / 1000)) : MAX_ACTIVE_DT;
    const dt = Math.min(elapsedMs / 1000, maxDt);
    lastTime = now;
    runStep(dt);
    schedule();
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      schedule();
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
    tick(dt = 1 / 60) {
      runStep(dt, { manual: true });
    },
    hold(reason) {
      holds.add(reason);
    },
    release(reason) {
      if (!holds.delete(reason) || holds.size) return;
      // Resume with a fresh clock so the first frame doesn't jump by the
      // whole time we were held.
      lastTime = performance.now();
      if (running) schedule();
    },
    isHeld(reason) {
      return reason ? holds.has(reason) : holds.size > 0;
    },
    requestRender() {
      renderRequested = true;
      if (running) schedule();
    },
    getStats() {
      return { ...stats, holds: [...holds], running };
    },
  };
}
