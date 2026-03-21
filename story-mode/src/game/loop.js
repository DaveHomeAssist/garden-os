/**
 * Game Loop — requestAnimationFrame render loop.
 * Game logic is event-driven (turn-based), loop is for rendering/animation only.
 */
export function createLoop(services) {
  let rafId = 0;
  let lastTime = performance.now();
  let running = false;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    services.scene.sync(services.getState());
    services.scene.render();

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
  };
}
