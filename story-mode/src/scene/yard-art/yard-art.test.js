import { describe, expect, it } from 'vitest';
import { getZoneMovementBlockers, getZoneMovementBounds, WORLD_ZONE_INTERACTABLES } from '../../ui/zone-travel.js';
import {
  COTTAGE, YARD_TREES, YARD_BUSHES, PROP_PLACEMENTS, PROP_SET1_PLACEMENTS, PATHS, GATE,
  buildTreeline, buildGroundScatter, isScatterBlocked, distanceToPath, groundMaskAt, makeRng,
} from './yard-layout.js';
import {
  ART_QUALITY_PRESETS, ART_QUALITY_STORAGE_KEY, resolveArtQuality, storeArtQualityChoice,
  nextArtQualityChoice, detectDefaultArtQuality, getArtQualityPreset,
} from './art-quality.js';

// The art pass is visual only. These tests pin the gameplay data it must not
// move and prove the art is laid out around it.
const blockers = getZoneMovementBlockers('player_plot');
const bounds = getZoneMovementBounds('player_plot');
const inside = (b, x, z, pad = 0) => x >= b.minX - pad && x <= b.maxX + pad && z >= b.minZ - pad && z <= b.maxZ + pad;

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
}

describe('yard art: gameplay data is unchanged', () => {
  it('keeps the player_plot bounds, blockers and exit', () => {
    expect(bounds).toEqual({ minX: -9, maxX: 9, minZ: -9, maxZ: 9 });
    expect(blockers).toEqual([
      { minX: -2.28, maxX: 2.28, minZ: -1.42, maxZ: 1.42 },
      { minX: -4.4, maxX: -0.3, minZ: -9.3, maxZ: -6.15 },
      { minX: 4.68, maxX: 4.92, minZ: -0.02, maxZ: 0.22 },
      { minX: -4.82, maxX: -4.58, minZ: 3.68, maxZ: 3.92 },
    ]);
    const exit = WORLD_ZONE_INTERACTABLES.player_plot.find((e) => e.zoneId === 'neighborhood');
    expect(exit.position).toMatchObject({ x: 0, z: -8.5 });
  });
});

describe('yard art layout', () => {
  it('seats the cottage walls inside the rowhouse blocker', () => {
    const house = blockers[1];
    const { x, z } = COTTAGE.position;
    expect(inside(house, x - COTTAGE.halfWidth, z - COTTAGE.halfDepth)).toBe(true);
    expect(inside(house, x + COTTAGE.halfWidth, z + COTTAGE.halfDepth)).toBe(true);
    expect(z + COTTAGE.halfDepth).toBeCloseTo(house.maxZ, 5); // front wall on the blocker edge
    expect(COTTAGE.doorX).toBeGreaterThan(house.minX);
    expect(COTTAGE.doorX).toBeLessThan(house.maxX);
  });

  it('plants the two yard trees on their trunk blockers', () => {
    for (const tree of YARD_TREES) {
      const hit = blockers.filter((b) => inside(b, tree.x, tree.z));
      expect(hit.length, `${tree.variant} at ${tree.x},${tree.z}`).toBe(1);
      const b = hit[0];
      expect(tree.x).toBeCloseTo((b.minX + b.maxX) / 2, 5);
      expect(tree.z).toBeCloseTo((b.minZ + b.maxZ) / 2, 5);
    }
  });

  it('keeps props and bushes off every blocker and the bed', () => {
    for (const p of PROP_PLACEMENTS) {
      for (const b of blockers) expect(inside(b, p.x, p.z, 0.15), `${p.prop} at ${p.x},${p.z}`).toBe(false);
      expect(Math.abs(p.x) <= bounds.maxX && Math.abs(p.z) <= bounds.maxZ).toBe(true);
    }
    for (const b of YARD_BUSHES) {
      for (const bl of blockers) expect(inside(bl, b.x, b.z, 0.2), `bush at ${b.x},${b.z}`).toBe(false);
    }
  });

  it('keeps prop set 1 off blockers, paths, interactables and the exit lane', () => {
    const interactables = [{ x: 0, z: 0.5, r: 2.8 }, { x: -3, z: -1, r: 1.1 }, { x: 0, z: -8.5, r: 1.6 }];
    expect(PROP_SET1_PLACEMENTS.map((p) => p.prop).sort()).toEqual(['birdhouse', 'garden_bench', 'rain_barrel', 'wheelbarrow']);
    for (const p of PROP_SET1_PLACEMENTS) {
      for (const b of blockers) expect(inside(b, p.x, p.z, 0.3), `${p.prop} at ${p.x},${p.z}`).toBe(false);
      expect(Math.abs(p.x) <= bounds.maxX - 0.5 && Math.abs(p.z) <= bounds.maxZ - 0.5).toBe(true);
      for (const path of PATHS) expect(distanceToPath(path, p.x, p.z), `${p.prop} on ${path.id}`).toBeGreaterThan(path.width / 2 + 0.6);
      for (const i of interactables) expect(Math.hypot(p.x - i.x, p.z - i.z), `${p.prop} near ${i.x},${i.z}`).toBeGreaterThan(i.r);
    }
  });

  it('keeps bushes off the worn paths and the exit lane', () => {
    for (const b of YARD_BUSHES) {
      for (const path of PATHS) expect(distanceToPath(path, b.x, b.z), `bush ${b.x},${b.z} on ${path.id}`).toBeGreaterThan(path.width / 2 + 0.2);
      expect(Math.hypot(b.x - 0, b.z + 8.5)).toBeGreaterThan(1.6);
    }
    expect(GATE.halfWidth).toBeGreaterThan(1.1); // exit radius fits through the gate
  });

  it('scatters grass and flowers away from the bed, the cottage and the paths', () => {
    const grass = buildGroundScatter(600, { seed: 1 });
    const flowers = buildGroundScatter(200, { seed: 2, flowers: true });
    expect(grass.length).toBe(600);
    for (const p of [...grass, ...flowers]) {
      expect(isScatterBlocked(p.x, p.z)).toBe(false);
      expect(groundMaskAt(p.x, p.z).path).toBeLessThanOrEqual(0.08);
    }
  });

  it('keeps the treeline outside the fence and is deterministic', () => {
    const a = buildTreeline(60);
    const b = buildTreeline(60);
    expect(a).toEqual(b);
    for (const t of a) expect(Math.abs(t.x) > 10.6 || Math.abs(t.z) > 10.6).toBe(true);
  });

  it('has a deterministic rng', () => {
    const r1 = makeRng(7); const r2 = makeRng(7);
    for (let i = 0; i < 10; i++) expect(r1()).toBe(r2());
  });
});

describe('art quality setting', () => {
  it('low drops shadows and post and thins the scatter', () => {
    const { low, high } = ART_QUALITY_PRESETS;
    expect(low.shadows).toBe(false);
    expect(low.post).toBe(false);
    expect(low.maxPixelRatio).toBeLessThan(high.maxPixelRatio);
    expect(low.grassClumps).toBeLessThan(high.grassClumps);
    expect(getArtQualityPreset('nope')).toBe(high);
  });

  it('resolves url > stored > auto', () => {
    const storage = memoryStorage({ [ART_QUALITY_STORAGE_KEY]: 'low' });
    const desktop = { matchMedia: () => ({ matches: false }), screen: { width: 1920, height: 1080 }, navigator: {} };
    expect(resolveArtQuality({ search: '?quality=high', storage, env: desktop })).toEqual({ tier: 'high', choice: 'high', source: 'url' });
    expect(resolveArtQuality({ search: '', storage, env: desktop })).toEqual({ tier: 'low', choice: 'low', source: 'stored' });
    expect(resolveArtQuality({ search: '', storage: memoryStorage(), env: desktop })).toEqual({ tier: 'high', choice: 'auto', source: 'auto' });
  });

  it('auto picks low on phones and low-memory devices', () => {
    const phone = { matchMedia: () => ({ matches: true }), screen: { width: 390, height: 844 }, navigator: {} };
    expect(detectDefaultArtQuality(phone)).toBe('low');
    expect(detectDefaultArtQuality({ navigator: { deviceMemory: 2 } })).toBe('low');
    expect(detectDefaultArtQuality({ matchMedia: () => ({ matches: false }), screen: { width: 2560, height: 1440 }, navigator: { deviceMemory: 8 } })).toBe('high');
  });

  it('stores and cycles the choice', () => {
    const storage = memoryStorage();
    expect(storeArtQualityChoice('low', storage)).toBe('low');
    expect(storage.data.get(ART_QUALITY_STORAGE_KEY)).toBe('low');
    expect(storeArtQualityChoice('auto', storage)).toBe('auto');
    expect(storage.data.has(ART_QUALITY_STORAGE_KEY)).toBe(false);
    expect(nextArtQualityChoice('auto')).toBe('high');
    expect(nextArtQualityChoice('high')).toBe('low');
    expect(nextArtQualityChoice('low')).toBe('auto');
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(storeArtQualityChoice('low', broken)).toBe('low');
    expect(resolveArtQuality({ search: '', storage: broken, env: { navigator: { deviceMemory: 2 } } }).tier).toBe('low');
  });
});
