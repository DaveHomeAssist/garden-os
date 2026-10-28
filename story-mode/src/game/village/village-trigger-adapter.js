/**
 * Village trigger adapter — the only seam between 3D BOT's village engine and
 * the Free Play game layer. The engine never opens UI; it only emits events.
 *
 * Assumed engine API (to confirm with 3D BOT):
 *
 *   engine.onTrigger(listener) -> unsubscribe()
 *     listener(phase, trigger)
 *       phase:   'enter' | 'leave'
 *       trigger: { id: string, type: string, prompt?: string, target?: string,
 *                  radius?: number, position?: { x, z }, exit?: { x, z, facingY } }
 *   engine.registerInteractables(list) -> void   (optional)
 *       list: [{ id, type, prompt }] — the game layer tells the engine which
 *       trigger ids it handles (so the engine can highlight only those).
 *   engine.getPlayerPose?() -> { x, z, facingY }    (optional, for saving)
 *   engine.setPlayerPose?({ x, z, facingY }) -> void (optional, for restore)
 *
 * Accepted variants so small API drift doesn't need a game-layer change:
 *   - listener(event) with event = { phase|kind|type: 'enter'|'leave', trigger|...trigger }
 *   - engine.on('trigger', listener) instead of engine.onTrigger(listener)
 */

export const TRIGGER_PHASES = Object.freeze({ ENTER: 'enter', LEAVE: 'leave' });

function normalizeTrigger(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    type: typeof raw.type === 'string' ? raw.type : 'unknown',
    prompt: typeof raw.prompt === 'string' ? raw.prompt : null,
    target: typeof raw.target === 'string' ? raw.target : null,
    exit: raw.exit && Number.isFinite(raw.exit.x) && Number.isFinite(raw.exit.z)
      ? { x: raw.exit.x, z: raw.exit.z, facingY: Number.isFinite(raw.exit.facingY) ? raw.exit.facingY : 0 }
      : null,
  };
}

/** Normalize the engine's listener arguments into { phase, trigger } or null. */
export function normalizeTriggerEvent(a, b) {
  let phase = null;
  let trigger = null;
  if (typeof a === 'string') {
    phase = a;
    trigger = b;
  } else if (a && typeof a === 'object') {
    phase = a.phase ?? a.kind ?? (a.type === 'enter' || a.type === 'leave' ? a.type : null);
    trigger = a.trigger ?? (a.id ? a : null);
  }
  if (phase !== TRIGGER_PHASES.ENTER && phase !== TRIGGER_PHASES.LEAVE) return null;
  const normalized = normalizeTrigger(trigger);
  return normalized ? { phase, trigger: normalized } : null;
}

/**
 * Wrap a village engine (or anything exposing the API above) in the small
 * interface the router uses:
 *   { subscribe(fn) -> unsubscribe, registerInteractables(list), getPlayerPose(), setPlayerPose(pose) }
 */
export function createVillageTriggerAdapter(engine) {
  if (!engine) throw new Error('createVillageTriggerAdapter: engine is required');
  return {
    subscribe(fn) {
      const listener = (a, b) => {
        const event = normalizeTriggerEvent(a, b);
        if (event) fn(event);
      };
      let off = null;
      if (typeof engine.onTrigger === 'function') off = engine.onTrigger(listener);
      else if (typeof engine.on === 'function') off = engine.on('trigger', listener);
      else throw new Error('Village engine has no onTrigger()');
      return () => {
        if (typeof off === 'function') off();
        else engine.off?.('trigger', listener);
      };
    },
    registerInteractables(list) {
      engine.registerInteractables?.(list);
    },
    getPlayerPose() {
      return engine.getPlayerPose?.() ?? null;
    },
    setPlayerPose(pose) {
      engine.setPlayerPose?.(pose);
    },
  };
}

/** In-memory stand-in for the engine, used by tests and dev until V0 lands. */
export function createMockTriggerEmitter({ pose = { x: 0, z: 2.55, facingY: 0 } } = {}) {
  const listeners = new Set();
  let registered = [];
  let currentPose = { ...pose };
  return {
    onTrigger(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    registerInteractables(list) {
      registered = Array.isArray(list) ? list.map((entry) => ({ ...entry })) : [];
    },
    getRegistered() {
      return registered;
    },
    getPlayerPose() {
      return { ...currentPose };
    },
    setPlayerPose(next) {
      currentPose = { ...currentPose, ...next };
    },
    enter(trigger) {
      listeners.forEach((fn) => fn(TRIGGER_PHASES.ENTER, trigger));
    },
    leave(trigger) {
      listeners.forEach((fn) => fn(TRIGGER_PHASES.LEAVE, trigger));
    },
    listenerCount() {
      return listeners.size;
    },
  };
}
