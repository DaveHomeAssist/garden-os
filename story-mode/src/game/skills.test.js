import { describe, expect, it } from 'vitest';

import {
  awardXPToSkillsState,
  calculateSkillLevel,
  getDefaultSkillsState,
  getSkillXpMap,
  normalizeSkillsState,
  SkillSystem,
} from './skills.js';
import { Store } from './store.js';
import { createGameState } from './state.js';

describe('skills helpers', () => {
  it('accumulates xp and levels at thresholds', () => {
    const result = awardXPToSkillsState(getDefaultSkillsState(), 'gardening', 250);
    expect(result.newLevel).toBe(3);
    expect(result.levelsGained).toBe(2);
  });

  it('supports multiple level gains from one award', () => {
    const result = awardXPToSkillsState(getDefaultSkillsState(), 'crafting', 1900);
    expect(result.newLevel).toBe(7);
  });

  it('caps level at 10', () => {
    expect(calculateSkillLevel(99999)).toBe(10);
  });

  it('normalizes legacy xp maps', () => {
    const next = normalizeSkillsState({ gardening: 500 });
    expect(next.gardening.level).toBe(4);
    expect(getSkillXpMap(next).gardening).toBe(500);
  });
});

describe('SkillSystem', () => {
  it('returns active buffs and aggregate buff values', () => {
    const state = createGameState();
    state.campaign.skills.gardening = { xp: 250, level: 3 };
    state.campaign.skills.crafting = { xp: 250, level: 3 };
    const store = new Store(state);
    const system = new SkillSystem(store);

    expect(system.getActiveBuffs().length).toBeGreaterThan(0);
    expect(system.getBuffValue('yield_bonus')).toBeGreaterThan(0);
    expect(system.getBuffValue('material_cost_reduction')).toBe(0.2);

    system.dispose();
  });
});
