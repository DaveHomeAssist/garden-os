import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGameState } from './state.js';
import { Store } from './store.js';
import { Inventory } from './inventory.js';
import { SkillSystem } from './skills.js';
import { ForagingSystem } from './foraging.js';

function makeForaging({ level = 1, zone = 'meadow' } = {}) {
  const state = createGameState();
  state.campaign.worldState.currentZone = zone;
  state.campaign.skills.foraging = { xp: 0, level };
  const store = new Store(state);
  const inventory = new Inventory(store);
  const skillSystem = new SkillSystem(store);
  return { store, inventory, skillSystem, foraging: new ForagingSystem(store, inventory, skillSystem) };
}

describe('ForagingSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces deterministic loot for the same day and skill level', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const a = makeForaging({ level: 1 }).foraging.forage('meadow_herbs');
    const b = makeForaging({ level: 1 }).foraging.forage('meadow_herbs');
    expect(a.items).toEqual(b.items);
  });

  it('respects cooldowns', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { foraging } = makeForaging({ level: 1 });
    const first = foraging.forage('meadow_rocks');
    const second = foraging.forage('meadow_rocks');
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
  });

  it('hydrates persisted cooldowns from campaign world state', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { store, inventory, skillSystem, foraging } = makeForaging({ level: 1 });
    const first = foraging.forage('meadow_rocks');

    expect(first.success).toBe(true);

    const reloaded = new ForagingSystem(store, inventory, skillSystem);
    const blocked = reloaded.forage('meadow_rocks');

    expect(reloaded.serializeCooldowns().meadow_rocks).toBeGreaterThan(1_700_000_000_000);
    expect(blocked.success).toBe(false);
  });

  it('increases loot output at higher foraging levels', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const low = makeForaging({ level: 1 }).foraging.forage('meadow_flowers');
    const high = makeForaging({ level: 7 }).foraging.forage('meadow_flowers');
    const lowTotal = low.items.reduce((sum, entry) => sum + entry.count, 0);
    const highTotal = high.items.reduce((sum, entry) => sum + entry.count, 0);
    expect(highTotal).toBeGreaterThan(lowTotal);
  });

  it('lets a new player earn the meadow gate level from neighborhood forage spots', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { foraging, skillSystem, store } = makeForaging({ zone: 'neighborhood' });
    const spots = foraging.getForagingSpots('neighborhood');

    expect(spots.length).toBeGreaterThanOrEqual(2);

    const first = foraging.forage(spots[0].id);
    const second = foraging.forage(spots[1].id);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(skillSystem.getLevel('foraging')).toBe(2);
    expect(store.getState().campaign.worldState.lastForage.zoneId).toBe('neighborhood');
  });
});
