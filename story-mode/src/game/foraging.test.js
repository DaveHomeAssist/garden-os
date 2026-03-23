import { describe, expect, it, vi } from 'vitest';

import { createGameState } from './state.js';
import { Store } from './store.js';
import { Inventory } from './inventory.js';
import { SkillSystem } from './skills.js';
import { ForagingSystem } from './foraging.js';

function makeForaging(level = 1) {
  const state = createGameState();
  state.campaign.worldState.currentZone = 'meadow';
  state.campaign.skills.foraging = { xp: 0, level };
  const store = new Store(state);
  const inventory = new Inventory(store);
  const skillSystem = new SkillSystem(store);
  return { store, inventory, skillSystem, foraging: new ForagingSystem(store, inventory, skillSystem) };
}

describe('ForagingSystem', () => {
  it('produces deterministic loot for the same day and skill level', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const a = makeForaging(1).foraging.forage('meadow_herbs');
    const b = makeForaging(1).foraging.forage('meadow_herbs');
    expect(a.items).toEqual(b.items);
  });

  it('respects cooldowns', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { foraging } = makeForaging(1);
    const first = foraging.forage('meadow_rocks');
    const second = foraging.forage('meadow_rocks');
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
  });

  it('increases loot output at higher foraging levels', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const low = makeForaging(1).foraging.forage('meadow_flowers');
    const high = makeForaging(7).foraging.forage('meadow_flowers');
    const lowTotal = low.items.reduce((sum, entry) => sum + entry.count, 0);
    const highTotal = high.items.reduce((sum, entry) => sum + entry.count, 0);
    expect(highTotal).toBeGreaterThan(lowTotal);
  });
});
