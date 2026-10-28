/**
 * Village trigger API: the renderer only EMITS events, it never opens UI.
 * Interface matches the game layer's adapter (garden-os #77,
 * story-mode/src/game/village/village-trigger-adapter.js):
 *
 *   onTrigger(listener) -> unsubscribe()
 *   listener(phase: 'enter'|'leave', trigger: { id, type, prompt?, target?, exit?: { x, z, facingY }, radius, position })
 *
 * Every trigger is tracked on its own: overlapping triggers each get their
 * own enter/leave and the engine never picks a winner (the game layer uses the
 * most recently entered one). Enters that land in the same update fire in the
 * order the player crossed into them (deepest first). `leave` fires only once
 * the player is more than radius + hysteresis (0.3 m) away, so standing on an
 * edge or closing a panel in place can't cause a pop-up loop.
 */
import { TRIGGER_HYSTERESIS } from './village-layout.js';

export function toTriggerPayload(item) {
  const payload = {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    radius: item.radius,
    position: { x: item.position.x, z: item.position.z },
  };
  if (item.target) payload.target = item.target;
  if (item.exit) payload.exit = { x: item.exit.x, z: item.exit.z, facingY: item.exit.facingY };
  if (item.plotId) payload.plotId = item.plotId;
  return payload;
}

export function createTriggerTracker(interactables = [], { hysteresis = TRIGGER_HYSTERESIS } = {}) {
  const inside = new Set();
  const listeners = new Set();

  function emit(phase, item) {
    const payload = toTriggerPayload(item);
    listeners.forEach((fn) => { try { fn(phase, payload); } catch (err) { console.error('[village] trigger listener failed', err); } });
    return { phase, trigger: payload };
  }

  const distance = (p, item) => Math.hypot(p.x - item.position.x, p.z - item.position.z);

  return {
    onTrigger(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Feed the player position; returns [{ phase, trigger }] fired this update (leaves first, then enters in crossing order). */
    update(position) {
      if (!position) return [];
      const leaves = [];
      const enters = [];
      for (const item of interactables) {
        const d = distance(position, item);
        if (!inside.has(item.id) && d <= item.radius) enters.push({ item, depth: item.radius - d });
        else if (inside.has(item.id) && d > item.radius + hysteresis) leaves.push(item);
      }
      const events = [];
      leaves.forEach((item) => { inside.delete(item.id); events.push(emit('leave', item)); });
      enters.sort((a, b) => b.depth - a.depth).forEach(({ item }) => { inside.add(item.id); events.push(emit('enter', item)); });
      return events;
    },
    /**
     * Teleport / pose restore: re-seed the inside set from `position` with no
     * events, so nothing stale fires (no leave for where you were, no enter
     * for where you land). Walking out later still fires a normal leave.
     */
    reseed(position) {
      inside.clear();
      if (!position) return;
      for (const item of interactables) if (distance(position, item) <= item.radius) inside.add(item.id);
    },
    reset() { inside.clear(); },
    getInside: () => [...inside],
    dispose() { listeners.clear(); inside.clear(); },
  };
}
