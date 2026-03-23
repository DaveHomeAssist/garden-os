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

/* ── Asset Manifest ─────────────────────────────────────────────────── */

const SINGLE_ASSETS = {
  'bed-empty':     { file: 'bed-empty.png',     w: 1024, h: 512 },
  'bed-grid':      { file: 'bed-grid.png',      w: 1024, h: 512 },
  'bed-rain':      { file: 'bed-rain.png',      w: 1024, h: 512 },
  'bed-cell':      { file: 'bed-cell.png',      w: 256,  h: 256 },
  'crop-lettuce':  { file: 'crop-lettuce.png',  w: 256,  h: 256 },
  'crop-spinach':  { file: 'crop-spinach.png',  w: 256,  h: 256 },
  'crop-arugula':  { file: 'crop-arugula.png',  w: 256,  h: 256 },
  'crop-radish':   { file: 'crop-radish.png',   w: 256,  h: 256 },
  'crop-basil':    { file: 'crop-basil.png',    w: 256,  h: 256 },
  'crop-marigold': { file: 'crop-marigold.png', w: 256,  h: 256 },
  'env-spigot':    { file: 'env-spigot.png',    w: 128,  h: 256 },
  'env-fence':     { file: 'env-fence.png',     w: 256,  h: 512 },
  'env-path':      { file: 'env-path.png',      w: 512,  h: 512 },
  'env-grass':     { file: 'env-grass.png',     w: 512,  h: 512 },
  'ui-badges':     { file: 'ui-badges.png',     w: 512,  h: 64  },
  'ui-month-card': { file: 'ui-month-card.png', w: 320,  h: 96  },
  'ui-nav-pills':  { file: 'ui-nav-pills.png',  w: 320,  h: 48  },
};

const SHEET_ASSETS = {
  'crop-sheet':    { file: 'crop-sheet.png',    w: 1536, h: 256, cols: 6, rows: 1 },
  'bed-seasons':   { file: 'bed-seasons.png',   w: 2048, h: 512, cols: 4, rows: 1 },
  'grow-lettuce':  { file: 'grow-lettuce.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-spinach':  { file: 'grow-spinach.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-arugula':  { file: 'grow-arugula.png',  w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-radish':   { file: 'grow-radish.png',   w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-basil':    { file: 'grow-basil.png',    w: 1024, h: 256, cols: 4, rows: 1 },
  'grow-marigold': { file: 'grow-marigold.png', w: 1024, h: 256, cols: 4, rows: 1 },
};

/** Named growth stage indices */
export const GROWTH_STAGE = { SEED: 0, SPROUT: 1, GROWING: 2, HARVEST: 3 };

/** Named season indices for bed-seasons sheet */
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

/* ── Texture path resolution ────────────────────────────────────────── */

/** Resolve asset path relative to Vite base */
function assetPath(filename) {
  return new URL(`../../assets/textures/${filename}`, import.meta.url).href;
}

/* ── Loading ────────────────────────────────────────────────────────── */

function loadOne(key, filename) {
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
        // Asset not yet generated — skip silently, return null placeholder
        console.warn(`[sprite-loader] missing texture: ${filename}`);
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
  return getFrame(sheetKey, stage) ?? getCropIcon(cropId);
}

/**
 * Get the bed texture for a given season.
 *
 * @param {number} seasonIndex  SEASON_INDEX.SPRING through SEASON_INDEX.WINTER
 * @returns {THREE.Texture|null}
 */
export function getSeasonBed(seasonIndex) {
  return getFrame('bed-seasons', seasonIndex);
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
