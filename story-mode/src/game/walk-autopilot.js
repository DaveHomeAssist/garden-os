/**
 * Walk-then-act autopilot — queues a destination the player auto-walks to,
 * with an optional action fired on arrival. RuneScape-style: manual input
 * cancels the walk (callers invoke clear()), arrivals re-validate zone and a
 * caller-supplied predicate before acting, and stall time accrues only while
 * the autopilot is actually stepping — pausing or hiding the tab never
 * cancels a walk on wall-clock time.
 */

const PROGRESS_EPSILON = 0.02;
const STALL_TIMEOUT_SECONDS = 1.2;

/**
 * Clamp a destination out of collision blockers: targets inside a blocker
 * (bed cells, click-throughs onto furniture) are pushed to the nearest edge,
 * with `clearance` covering the player's collision radius plus margin. The
 * straight-line autopilot can then actually arrive instead of grinding
 * against the wall until the stall timeout fires.
 */
export function nearestPointOutsideBlockers(x, z, blockers = [], clearance = 0.25) {
  let px = x;
  let pz = z;
  for (const blocker of blockers) {
    const minX = blocker.minX - clearance;
    const maxX = blocker.maxX + clearance;
    const minZ = blocker.minZ - clearance;
    const maxZ = blocker.maxZ + clearance;
    if (px <= minX || px >= maxX || pz <= minZ || pz >= maxZ) continue;

    const pushLeft = px - minX;
    const pushRight = maxX - px;
    const pushBack = pz - minZ;
    const pushFront = maxZ - pz;
    const smallest = Math.min(pushLeft, pushRight, pushBack, pushFront);
    if (smallest === pushLeft) px = minX;
    else if (smallest === pushRight) px = maxX;
    else if (smallest === pushBack) pz = minZ;
    else pz = maxZ;
  }
  return { x: px, z: pz };
}

export function createWalkAutopilot({ getPosition, getZoneId = () => null, onUnreachable = null }) {
  let target = null;

  function clear() {
    target = null;
  }

  function queue({ x, z, radius = 0.6, onArrive = null, stillValid = null, reachDistance = 0 }) {
    const zoneAtQueue = getZoneId();
    const arrive = onArrive
      ? () => {
        if (getZoneId() !== zoneAtQueue) return;
        if (stillValid && !stillValid()) return;
        onArrive();
      }
      : null;

    const position = getPosition();
    if (position && Math.hypot(x - position.x, z - position.z) <= radius) {
      arrive?.();
      return;
    }

    target = {
      x,
      z,
      radius,
      reachDistance,
      onArrive: arrive,
      bestDistance: Infinity,
      stallSeconds: 0,
    };
  }

  function getVector(dt = 1 / 60) {
    if (!target) return { x: 0, z: 0 };
    const position = getPosition();
    if (!position) return { x: 0, z: 0 };

    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= target.radius) {
      const arrived = target;
      clear();
      arrived.onArrive?.();
      return { x: 0, z: 0 };
    }

    if (distance < target.bestDistance - PROGRESS_EPSILON) {
      target.bestDistance = distance;
      target.stallSeconds = 0;
    } else {
      target.stallSeconds += dt;
      if (target.stallSeconds > STALL_TIMEOUT_SECONDS) {
        const stalled = target;
        clear();
        // Stalled against a wall but plausibly within arm's reach: act
        // anyway (RuneScape reaches over the bed edge). Otherwise give up.
        if (stalled.onArrive && distance <= stalled.reachDistance) {
          stalled.onArrive();
        } else if (stalled.onArrive) {
          onUnreachable?.();
        }
        return { x: 0, z: 0 };
      }
    }

    return { x: dx / distance, z: dz / distance };
  }

  return {
    queue,
    clear,
    getVector,
    hasTarget: () => target !== null,
  };
}
