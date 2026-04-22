/**
 * Game Loop — requestAnimationFrame render loop.
 * Game logic is event-driven (turn-based), loop is for rendering/animation only.
 */
export function createLoop(services) {
  let rafId = 0;
  let lastTime = performance.now();
  let running = false;

function runStep(dt) {
  services.update?.(dt);
  services.scene.sync(services.getState());
  services.scene.render();
  services.onFrame?.({ dt });
}

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    runStep(dt);

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    tick(dt = 1 / 60) {
      runStep(dt);
    },
  };
}
