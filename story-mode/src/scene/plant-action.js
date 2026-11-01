// "Gardener plants a crop" action: a short kneel-and-plant played on the
// player rig when a crop goes into a bed square. Pure state + pose curves (no
// three.js) so the trigger, queueing and timing are unit-testable.
//
// Rules:
// - The first plant plays the full action (~1.2 s). Plants made while one is
//   playing queue behind it as quicker pats (~0.7 s), at most `maxQueue`
//   pending. A further plant retargets the last queued slot, so rapid planting
//   never builds more than ~1.4 s of backlog.
// - It never blocks input: moving the player skips the action and drops the queue.
// - Reduced motion: no body animation (trigger reports `skipped`).
// - trigger() reports when the trowel hits the soil (`hitInSec`) so the
//   scene can time the existing soil poof + seedling pop-in to it.

export const PLANT_ACTION_DEFAULTS = Object.freeze({
  duration: 1.2,       // seconds, first plant
  quickDuration: 0.7,  // seconds, plants queued behind another
  hitAt: 0.5,          // fraction of the action where the trowel meets the soil
  maxQueue: 2,
  reach: 1.5,          // within this distance the gardener kneels fully
  stepMax: 0.6,       // visual lean-step toward the square (the controller owns position)
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Pose weights for progress p in [0, 1]. All weights are 0 at p = 0 and p = 1. */
export function plantPose(p) {
  const x = clamp01(p);
  const kneel = smoothstep(0, 0.25, x) * (1 - smoothstep(0.78, 1, x));
  const reach = smoothstep(0.12, 0.38, x) * (1 - smoothstep(0.7, 0.92, x));
  // Trowel pats between 0.35 and 0.65: hand on the soil at 0.35, 0.5 (= hitAt) and 0.65.
  const digWindow = x >= 0.35 && x <= 0.65 ? (x - 0.35) / 0.3 : -1;
  const dig = digWindow < 0 ? 0 : 0.5 - 0.5 * Math.cos(digWindow * Math.PI * 4);
  const turn = smoothstep(0, 0.14, x) * (1 - smoothstep(0.86, 1, x));
  return { kneel, reach, dig, turn };
}

/** Facing (rotation.y) that points a +Z-forward rig at the target. */
export function facingToward(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Shortest-path angle blend. */
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function createPlantAction(options = {}) {
  const cfg = { ...PLANT_ACTION_DEFAULTS, ...options };
  let current = null;
  const queue = [];

  const remaining = (a) => Math.max(0, a.duration - a.t);

  function trigger(target, { reducedMotion = false } = {}) {
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return { skipped: true, hitInSec: 0 };
    if (reducedMotion) return { skipped: true, hitInSec: 0 };
    if (!current) {
      current = { target: { x: target.x, z: target.z }, t: 0, duration: cfg.duration };
      return { skipped: false, queued: false, hitInSec: cfg.duration * cfg.hitAt };
    }
    const entry = { target: { x: target.x, z: target.z }, t: 0, duration: cfg.quickDuration };
    if (queue.length >= cfg.maxQueue) {
      queue[queue.length - 1].target = entry.target; // retarget the last slot
    } else {
      queue.push(entry);
    }
    // Start time of the (possibly retargeted) last slot.
    let start = remaining(current);
    for (let i = 0; i < queue.length - 1; i++) start += queue[i].duration;
    const last = queue[queue.length - 1];
    return { skipped: false, queued: true, hitInSec: start + last.duration * cfg.hitAt };
  }

  function cancel() {
    current = null;
    queue.length = 0;
  }

  /** Advance by dt seconds. Moving skips the action. Returns the live pose or null. */
  function update(dt, { moving = false } = {}) {
    if (moving) cancel();
    if (!current) return null;
    current.t += Math.max(0, dt);
    while (current && current.t >= current.duration) {
      const overflow = current.t - current.duration;
      current = queue.shift() ?? null;
      if (current) current.t = overflow;
    }
    return getPose();
  }

  function getPose() {
    if (!current) return null;
    const progress = clamp01(current.t / current.duration);
    return { progress, target: current.target, ...plantPose(progress) };
  }

  return {
    trigger,
    update,
    cancel,
    getPose,
    isActive: () => current !== null,
    queuedCount: () => queue.length,
    backlogSec: () => (current ? remaining(current) : 0) + queue.reduce((s, a) => s + a.duration, 0),
    config: cfg,
  };
}
