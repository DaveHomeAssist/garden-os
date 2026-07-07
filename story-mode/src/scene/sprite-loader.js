/**
 * Sprite Loader — loads PNG sprite assets and sprite sheets for Three.js.
 *
 * All textures live in assets/textures/ and are resolved by Vite at build time.
 * Sprite sheets are sliced into individual frames via canvas offscreen rendering.
 *
 * Usage:
 *   import { loadSprites, getTexture, getFrame, getSpriteMap } from './sprite-loader.js';
 *   await loadSprites();                        // call once at init
 *   const tex = getTexture('crop-lettuce');      // single PNG
 *   const frame = getFrame('grow-lettuce', 2);   // frame 2 of sprite sheet
 */
import * as THREE from 'three';
import { getCropById } from '../data/crops.js';

/* ── Asset Manifest ─────────────────────────────────────────────────── */

const SINGLE_ASSETS = {
  'bed-empty':     { file: 'bed-empty.png',     w: 1024, h: 512 },
  'bed-grid':      { file: 'bed-grid.png',      w: 1024, h: 512 },
  'bed-cell':      { file: 'bed-cell.png',      w: 256,  h: 256 },
  'crop-lettuce':  { file: 'crop-lettuce.png',  w: 256,  h: 256 },
  'crop-spinach':  { file: 'crop-spinach.png',  w: 256,  h: 256 },
  'crop-arugula':  { file: 'crop-arugula.png',  w: 256,  h: 256 },
  'crop-radish':   { file: 'crop-radish.png',   w: 256,  h: 256 },
  'crop-basil':    { file: 'crop-basil.png',    w: 256,  h: 256 },
  'crop-marigold': { file: 'crop-marigold.png', w: 256,  h: 256 },
  'env-spigot':    { file: 'env-spigot.png',    w: 128,  h: 256 },
  'env-path':      { file: 'env-path.png',      w: 512,  h: 512 },
  'env-grass':     { file: 'env-grass.png',     w: 512,  h: 512 },
  'ui-badges':     { file: 'ui-badges.png',     w: 512,  h: 64  },
  'ui-month-card': { file: 'ui-month-card.png', w: 320,  h: 96  },
  'ui-nav-pills':  { file: 'ui-nav-pills.png',  w: 320,  h: 48  },
};

const SHEET_ASSETS = {
  'crop-sheet':    { file: 'crop-sheet.png',    w: 1536, h: 256, cols: 6, rows: 1 },
  'grow-lettuce':  { file: 'grow-lettuce.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-spinach':  { file: 'grow-spinach.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-arugula':  { file: 'grow-arugula.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-radish':   { file: 'grow-radish.png',   w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-basil':    { file: 'grow-basil.png',    w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-marigold': { file: 'grow-marigold.png', w: 1024, h: 256, cols: 4, rows: 1 },
};

/** Named growth stage indices */
export const GROWTH_STAGE = { SEED: 0, SPROUT: 1, GROWING: 2, HARVEST: 3 };

/** Reserved season indices for future bed-season sheets */
export const SEASON_INDEX = { SPRING: 0, SUMMER: 1, AUTUMN: 2, WINTER: 3 };

/** Named crop indices for crop-sheet */
export const CROP_SHEET_INDEX = {
  LETTUCE: 0, SPINACH: 1, ARUGULA: 2, RADISH: 3, BASIL: 4, MARIGOLD: 5,
};

/* ── Internal State ─────────────────────────────────────────────────── */

const texLoader = new THREE.TextureLoader();
const textureCache = new Map();   // key → THREE.Texture
const frameCache = new Map();     // 'sheetKey:frameIndex' → THREE.Texture
let loaded = false;
let loadPromise = null;
let missingAssets = [];

/* ── Texture path resolution ────────────────────────────────────────── */

/** Resolve asset path relative to Vite base */
function assetPath(filename) {
  return new URL(`../../assets/textures/${filename}`, import.meta.url).href;
}

/* ── Loading ────────────────────────────────────────────────────────── */

function loadOne(key, filename) {
  if (!filename) {
    console.warn(`[sprite-loader] missing texture filename for: ${key}`);
    missingAssets.push(key);
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    texLoader.load(
      assetPath(filename),
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        textureCache.set(key, texture);
        resolve(texture);
      },
      undefined,
      () => {
        console.warn(`[sprite-loader] missing texture: ${filename}`);
        missingAssets.push(key);
        resolve(null);
      },
    );
  });
}

/**
 * Load all sprite assets. Call once during scene init.
 * Safe to call multiple times — subsequent calls return the cached promise.
 * Missing PNGs are silently skipped (returns null for those keys).
 */
export function loadSprites() {
  if (loadPromise) return loadPromise;

  const singles = Object.entries(SINGLE_ASSETS).map(
    ([key, { file }]) => loadOne(key, file),
  );
  const sheets = Object.entries(SHEET_ASSETS).map(
    ([key, { file }]) => loadOne(key, file),
  );

  missingAssets = [];
  loadPromise = Promise.all([...singles, ...sheets]).then(() => {
    loaded = true;
  });
  return loadPromise;
}

/* ── Accessors ──────────────────────────────────────────────────────── */

/**
 * Get a loaded single texture by key (e.g. 'crop-lettuce', 'bed-empty').
 * Returns null if the asset was missing or not yet loaded.
 */
export function getTexture(key) {
  return textureCache.get(key) ?? null;
}

/**
 * Slice a single frame from a sprite sheet.
 * Uses UV offset/repeat on a cloned texture — no canvas copy needed.
 *
 * @param {string} sheetKey  e.g. 'grow-lettuce', 'bed-seasons', 'crop-sheet'
 * @param {number} index     0-based frame index (left to right, top to bottom)
 * @returns {THREE.Texture|null}
 */
export function getFrame(sheetKey, index) {
  const cacheKey = `${sheetKey}:${index}`;
  if (frameCache.has(cacheKey)) return frameCache.get(cacheKey);

  const sheet = SHEET_ASSETS[sheetKey];
  if (!sheet) return null;

  const baseTex = textureCache.get(sheetKey);
  if (!baseTex) return null;

  const { cols, rows } = sheet;
  const col = index % cols;
  const row = Math.floor(index / cols);

  const frame = baseTex.clone();
  frame.repeat.set(1 / cols, 1 / rows);
  frame.offset.set(col / cols, 1 - (row + 1) / rows);
  frame.needsUpdate = true;

  frameCache.set(cacheKey, frame);
  return frame;
}

/**
 * Convenience: get the crop icon texture for a crop ID.
 * Tries the individual PNG first, falls back to the sprite sheet.
 *
 * @param {string} cropId  e.g. 'lettuce', 'basil'
 * @returns {THREE.Texture|null}
 */
export function getCropIcon(cropId) {
  const key = `crop-${cropId}`;
  const single = getTexture(key);
  if (single) return single;

  // Fall back to crop-sheet by name
  const sheetIndex = CROP_SHEET_INDEX[cropId.toUpperCase()];
  if (sheetIndex !== undefined) return getFrame('crop-sheet', sheetIndex);

  return null;
}

/**
 * Get a growth-stage texture for a crop at a given stage.
 *
 * @param {string} cropId  e.g. 'lettuce'
 * @param {number} stage   GROWTH_STAGE.SEED through GROWTH_STAGE.HARVEST
 * @returns {THREE.Texture|null}
 */
export function getGrowthTexture(cropId, stage) {
  const sheetKey = `grow-${cropId}`;
  return getFrame(sheetKey, stage) ?? getCropIcon(cropId) ?? getProceduralGrowthTexture(cropId, stage);
}

/* ── Procedural crop sprites ─────────────────────────────────────────
 * 43 of 50 crops have no hand-drawn sheets. Rather than rendering blobs,
 * synthesize a stylized billboard per crop: faction-tinted foliage plus the
 * crop's emoji glyph, staged by growth. Deterministic (seeded by crop id),
 * cached, zero binary assets. Hand-drawn sheets still win when present. */

const FACTION_STYLE = {
  greens:      { leaf: '#5d9c4a', deep: '#40763a', shape: 'rosette' },
  brassicas:   { leaf: '#4f8f5a', deep: '#35673f', shape: 'rosette' },
  roots:       { leaf: '#5b8f46', deep: '#3d6a32', shape: 'tuft' },
  herbs:       { leaf: '#6aa457', deep: '#4a7a3e', shape: 'sprigs' },
  fruiting:    { leaf: '#4f7f42', deep: '#365e2f', shape: 'bush' },
  climbers:    { leaf: '#55904c', deep: '#3a6a36', shape: 'vine' },
  fast_cycles: { leaf: '#66a355', deep: '#47793c', shape: 'tuft' },
  companions:  { leaf: '#5d9c4a', deep: '#40763a', shape: 'sprigs' },
};

function cropSeed(id) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h >>> 0);
}

function drawLeaf(ctx, x, y, len, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -len / 2, len / 4.2, len / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const proceduralCache = new Map();

export function getProceduralGrowthTexture(cropId, stage) {
  const key = `${cropId}:${stage}`;
  if (proceduralCache.has(key)) return proceduralCache.get(key);
  const crop = getCropById(cropId);
  if (!crop || typeof document === 'undefined') return null;

  const style = FACTION_STYLE[crop.faction] ?? FACTION_STYLE.greens;
  const seed = cropSeed(cropId);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const cx = size / 2;
  const groundY = size * 0.86;

  // Soft contact shadow
  ctx.fillStyle = 'rgba(30, 22, 12, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, size * (0.14 + stage * 0.05), size * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  if (stage === 0) {
    // Seed mound + fleck
    ctx.fillStyle = '#6b4e33';
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 10, 5, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Foliage: leaf fan scaled by stage, layout varied per crop + faction shape
    const growth = stage / 3;
    const leafCount = style.shape === 'sprigs' ? 5 + (seed % 3) : 6 + (seed % 4);
    const spread = style.shape === 'vine' ? 1.35 : style.shape === 'rosette' ? 1.0 : 0.8;
    const maxLen = size * (0.16 + growth * (style.shape === 'bush' ? 0.30 : 0.36));
    for (let i = 0; i < leafCount; i++) {
      const t = leafCount === 1 ? 0.5 : i / (leafCount - 1);
      const angle = (t - 0.5) * Math.PI * spread + ((seed >> (i % 8)) % 7 - 3) * 0.03;
      const len = maxLen * (0.7 + (((seed >> i) % 5) / 5) * 0.45);
      drawLeaf(ctx, cx, groundY - 2, len, angle, i % 2 ? style.leaf : style.deep);
    }
    // Emoji glyph — the recognizable identity, appears as the plant matures
    if (crop.emoji && stage >= 2) {
      const em = size * (0.22 + growth * 0.16);
      ctx.font = `${em}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(25, 18, 10, 0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillText(crop.emoji, cx, groundY - maxLen * 0.72);
      ctx.shadowColor = 'transparent';
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  proceduralCache.set(key, texture);
  return texture;
}

/**
 * Get the bed texture for a given season.
 *
 * @param {number} seasonIndex  SEASON_INDEX.SPRING through SEASON_INDEX.WINTER
 * @returns {THREE.Texture|null}
 */
export function getSeasonBed(seasonIndex) {
  return getFrame('bed-seasons', seasonIndex) ?? getTexture('bed-grid') ?? getTexture('bed-empty');
}

/**
 * Get the tileable texture for ground/path surfaces.
 * Sets wrap mode to RepeatWrapping for seamless tiling.
 *
 * @param {'path'|'grass'} surface
 * @returns {THREE.Texture|null}
 */
export function getTileable(surface) {
  const key = `env-${surface}`;
  const tex = getTexture(key);
  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/**
 * Returns a flat map of all loaded texture keys and their status.
 * Useful for debugging which assets are present.
 */
export function getSpriteMap() {
  const map = {};
  for (const key of Object.keys(SINGLE_ASSETS)) {
    map[key] = textureCache.has(key) && textureCache.get(key) !== null;
  }
  for (const key of Object.keys(SHEET_ASSETS)) {
    map[key] = textureCache.has(key) && textureCache.get(key) !== null;
  }
  return map;
}

/**
 * Returns the list of asset keys that failed to load.
 * Useful for showing user-facing feedback after loadSprites() resolves.
 */
export function getMissingAssets() {
  return [...missingAssets];
}

/**
 * Dispose all loaded textures. Call on scene teardown.
 */
export function disposeSprites() {
  for (const tex of textureCache.values()) {
    if (tex) tex.dispose();
  }
  for (const tex of frameCache.values()) {
    if (tex) tex.dispose();
  }
  textureCache.clear();
  frameCache.clear();
  loaded = false;
  loadPromise = null;
}
