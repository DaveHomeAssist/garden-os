/**
 * Art quality tiers for the yard art pass.
 *
 * high: soft PCF shadows, MSAA colour-grade pass, full grass/flower density.
 * low (phones): no realtime shadows (contact shading is painted into the
 * ground and baked into assets instead), no post pass, capped pixel ratio,
 * thinner scatter. Choose with ?quality=low|high, the pause-menu Graphics
 * toggle (stored in localStorage), or let auto-detect pick.
 */
export const ART_QUALITY_STORAGE_KEY = 'gos-art-quality';
export const ART_QUALITY_CHOICES = ['auto', 'high', 'low'];

export const ART_QUALITY_PRESETS = Object.freeze({
  high: Object.freeze({
    name: 'high', shadows: true, shadowMapSize: 2048, post: true, msaa: 4, maxPixelRatio: 2,
    grassClumps: 2600, flowers: 520, treeline: 96, farTrees: 240, skyOctaves: 5,
  }),
  low: Object.freeze({
    name: 'low', shadows: false, shadowMapSize: 1024, post: false, msaa: 0, maxPixelRatio: 1.25,
    grassClumps: 900, flowers: 200, treeline: 56, farTrees: 120, skyOctaves: 3,
  }),
});

function safeGet(storage, key) {
  try { return storage?.getItem?.(key) ?? null; } catch { return null; }
}

/** Heuristic: touch-first small screens or low-memory devices get `low`. */
export function detectDefaultArtQuality(env = globalThis) {
  const coarse = Boolean(env?.matchMedia?.('(pointer: coarse)')?.matches);
  const screenMin = Math.min(env?.screen?.width ?? 1920, env?.screen?.height ?? 1080);
  const memory = env?.navigator?.deviceMemory;
  if (typeof memory === 'number' && memory <= 4) return 'low';
  if (coarse && screenMin <= 900) return 'low';
  return 'high';
}

/**
 * Resolve the active tier. Order: URL ?quality=, stored choice, auto-detect.
 * Returns { tier, choice, source }.
 */
export function resolveArtQuality({ search = globalThis?.location?.search ?? '', storage = globalThis?.localStorage, env = globalThis } = {}) {
  let fromUrl = null;
  try { fromUrl = new URLSearchParams(search).get('quality'); } catch { fromUrl = null; }
  if (fromUrl === 'low' || fromUrl === 'high') return { tier: fromUrl, choice: fromUrl, source: 'url' };
  const stored = safeGet(storage, ART_QUALITY_STORAGE_KEY);
  if (stored === 'low' || stored === 'high') return { tier: stored, choice: stored, source: 'stored' };
  return { tier: detectDefaultArtQuality(env), choice: 'auto', source: 'auto' };
}

export function storeArtQualityChoice(choice, storage = globalThis?.localStorage) {
  const value = ART_QUALITY_CHOICES.includes(choice) ? choice : 'auto';
  try {
    if (value === 'auto') storage?.removeItem?.(ART_QUALITY_STORAGE_KEY);
    else storage?.setItem?.(ART_QUALITY_STORAGE_KEY, value);
  } catch { /* storage may be unavailable (private mode); the choice still applies this session */ }
  return value;
}

export function nextArtQualityChoice(choice) {
  const i = ART_QUALITY_CHOICES.indexOf(choice);
  return ART_QUALITY_CHOICES[(i + 1) % ART_QUALITY_CHOICES.length];
}

export function getArtQualityPreset(tier) {
  return ART_QUALITY_PRESETS[tier] ?? ART_QUALITY_PRESETS.high;
}
