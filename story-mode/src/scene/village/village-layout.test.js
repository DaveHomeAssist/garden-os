import { describe, expect, it } from 'vitest';
import PLACEMENTS from '../../data/village-placements.json';
import {
  MIN_PLOT_SIZE, TRIGGER_HYSTERESIS, TRIGGER_TYPES, VillageLayoutError, loadVillageLayout, pointInsideBlocker,
  validateVillagePlacements,
} from './village-layout.js';

const clone = () => structuredClone(PLACEMENTS);
const FICTIONAL_STREETS = ['Bramble Lane', 'Clover Street', 'Creekside Way', 'Hollyhock Avenue'];

describe('village placements loader', () => {
  const layout = loadVillageLayout(PLACEMENTS);

  it('accepts the shipped layout', () => {
    expect(validateVillagePlacements(PLACEMENTS)).toEqual([]);
    expect(layout.zoneId).toBe('village');
  });

  it('ships the home plot and six neighbour plots, all 10 x 10 m', () => {
    const ids = layout.plots.map((p) => p.plotId).sort();
    expect(ids).toEqual(['home', 'np_1', 'np_2', 'np_3', 'np_4', 'np_5', 'np_6']);
    layout.plots.forEach((p) => {
      expect(p.footprint.w).toBeGreaterThanOrEqual(MIN_PLOT_SIZE);
      expect(p.footprint.d).toBeGreaterThanOrEqual(MIN_PLOT_SIZE);
    });
  });

  it('derives blockers, bounds, spawn and interactables', () => {
    expect(layout.blockers.length).toBe(PLACEMENTS.entries.filter((e) => e.collides).length);
    layout.blockers.forEach((b) => {
      expect(b.maxX).toBeGreaterThan(b.minX);
      expect(b.maxZ).toBeGreaterThan(b.minZ);
    });
    const types = layout.interactables.map((i) => i.type);
    for (const t of TRIGGER_TYPES) expect(types).toContain(t);
    expect(types.filter((t) => t === 'neighbour_plot_reserved')).toHaveLength(6);
    const shop = layout.interactables.find((i) => i.type === 'open_shop');
    expect(shop.target).toBe('seeds');
    expect(layout.interactables.find((i) => i.type === 'enter_plot').plotId).toBe('home');
  });

  it('keeps the spawn clear of every blocker and outside every trigger (+ hysteresis)', () => {
    const { spawn } = layout;
    layout.blockers.forEach((b) => expect(pointInsideBlocker(spawn.x, spawn.z, b, 0.25)).toBe(false));
    layout.interactables.forEach((i) => {
      expect(Math.hypot(spawn.x - i.position.x, spawn.z - i.position.z)).toBeGreaterThan(i.radius + TRIGGER_HYSTERESIS);
    });
  });

  it('gives the four props_set1 props collision boxes from their bounding boxes', () => {
    const props = layout.entries.filter((e) => String(e.asset).startsWith('props_set1.glb#'));
    expect(props.map((p) => p.asset.split('#')[1]).sort()).toEqual(['birdhouse', 'garden_bench', 'rain_barrel', 'wheelbarrow']);
    props.forEach((p) => expect(p.footprint?.source).toBe('bbox'));
    const colliding = props.filter((p) => p.collides).map((p) => p.id);
    colliding.forEach((id) => expect(layout.blockers.some((b) => b.id === id)).toBe(true));
  });

  it('uses only the fictional street names and carries the OSM credit', () => {
    expect(layout.paths.map((p) => p.displayName).sort()).toEqual(FICTIONAL_STREETS);
    expect(layout.credits).toContain('\u00a9 OpenStreetMap contributors (ODbL)');
  });

  it('rejects bad documents with specific problems', () => {
    const dup = clone(); dup.entries.push({ ...dup.entries[5] });
    expect(validateVillagePlacements(dup).join('\n')).toMatch(/duplicate id/);

    const kind = clone(); kind.entries[5].kind = 'tower';
    expect(validateVillagePlacements(kind).join('\n')).toMatch(/kind "tower"/);

    const trig = clone(); trig.entries.find((e) => e.trigger).trigger.type = 'open_portal';
    expect(validateVillagePlacements(trig).join('\n')).toMatch(/vocabulary/);

    const radius = clone(); radius.entries.find((e) => e.trigger).trigger.radius = 3;
    expect(validateVillagePlacements(radius).join('\n')).toMatch(/radius must be 1.2-1.8/);

    const nofoot = clone(); const solid = nofoot.entries.find((e) => e.collides); solid.footprint = null;
    expect(validateVillagePlacements(nofoot).join('\n')).toMatch(/collides but has no footprint/);

    const small = clone(); small.entries.find((e) => e.kind === 'plot').footprint.d = 6;
    expect(validateVillagePlacements(small).join('\n')).toMatch(/8x8 bed/);

    const spawnOnSeeds = clone();
    const seeds = spawnOnSeeds.entries.find((e) => e.trigger?.type === 'open_seeds');
    const sp = spawnOnSeeds.entries.find((e) => e.kind === 'spawn');
    const anchor = layout.interactables.find((i) => i.id === seeds.id).position;
    sp.x = anchor.x + 0.6; sp.z = anchor.z;
    expect(validateVillagePlacements(spawnOnSeeds).join('\n')).toMatch(/spawn sits inside the seed_box trigger/);

    const nocredit = clone(); nocredit.credits = [];
    expect(validateVillagePlacements(nocredit).join('\n')).toMatch(/OpenStreetMap/);

    expect(() => loadVillageLayout(nocredit)).toThrow(VillageLayoutError);
  });
});
