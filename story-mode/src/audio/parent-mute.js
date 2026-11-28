/**
 * Mute All from the mixmash.games wrapper (mixmash PR #206).
 *
 * The parent page posts { type: 'mixmash:mute', muted: boolean } to the Garden
 * iframe. It can't reach our AudioContext across origins, so Story Mode
 * listens and applies the mute through AudioManager.setMuted, which covers
 * every Garden OS source (SFX, ambient and music gains plus the <audio>
 * layers). The wrapper's mute is combined with the player's own mute setting:
 * an unmute from the wrapper never unmutes a player who muted in-game.
 *
 * Only https://mixmash.games and https://www.mixmash.games are trusted, plus
 * localhost / 127.0.0.1 in a dev build. Anything else, and any message with a
 * different shape, is ignored silently.
 */
export const PARENT_MUTE_MESSAGE = 'mixmash:mute';
export const PARENT_MUTE_EVENT = 'gos:parent-mute';
const TRUSTED_ORIGINS = new Set(['https://mixmash.games', 'https://www.mixmash.games']);
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const IS_DEV_BUILD = Boolean(import.meta.env?.DEV);

let parentMuted = false;

export function isTrustedMuteOrigin(origin, { dev = IS_DEV_BUILD } = {}) {
  if (typeof origin !== 'string') return false;
  if (TRUSTED_ORIGINS.has(origin)) return true;
  return dev && DEV_ORIGIN.test(origin);
}

/** Returns the boolean `muted` for a valid message, or null. */
export function parseMuteMessage(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.type !== PARENT_MUTE_MESSAGE) return null;
  if (typeof data.muted !== 'boolean') return null;
  return data.muted;
}

export function isParentMuted() {
  return parentMuted;
}

/**
 * Listen for the wrapper's mute message. `onMute(muted)` runs for each valid
 * message; the latest value is also kept (isParentMuted) and re-broadcast as a
 * `gos:parent-mute` window event so a session that starts later picks it up.
 */
export function installParentMuteListener({
  target = globalThis.window,
  onMute = null,
  dev = IS_DEV_BUILD,
} = {}) {
  if (!target?.addEventListener) return () => {};
  const handler = (event) => {
    if (!isTrustedMuteOrigin(event?.origin, { dev })) return;
    const muted = parseMuteMessage(event.data);
    if (muted === null) return;
    parentMuted = muted;
    try { onMute?.(muted); } catch { /* never surface to the page */ }
    try {
      const Ctor = globalThis.CustomEvent;
      if (typeof Ctor === 'function') target.dispatchEvent?.(new Ctor(PARENT_MUTE_EVENT, { detail: { muted } }));
    } catch { /* best effort */ }
  };
  target.addEventListener('message', handler);
  return () => target.removeEventListener('message', handler);
}

/** Player setting OR wrapper mute. */
export function effectiveMuted(settingMuted) {
  return Boolean(settingMuted) || parentMuted;
}

/** Test-only reset. */
export function resetParentMuteForTests() {
  parentMuted = false;
}
