import { describe, expect, it } from 'vitest';

import { createGameState } from './state.js';
import { ReputationSystem, ReputationTiers } from './reputation.js';
import { Store } from './store.js';

function makeSystem() {
  return new ReputationSystem(new Store(createGameState()));
}

describe('ReputationSystem', () => {
  it('adds reputation and clamps the result', () => {
    const system = makeSystem();
    system.addReputation('old_gus', 40);
    system.addReputation('old_gus', 80);
    system.addReputation('maya', -20);

    expect(system.getReputation('old_gus')).toBe(100);
    expect(system.getReputation('maya')).toBe(0);
  });

  it('returns tier boundaries correctly', () => {
    const system = makeSystem();
    system.addReputation('lila', 25);
    expect(system.getTier('lila')).toEqual(ReputationTiers.ACQUAINTANCE);
    system.addReputation('lila', 25);
    expect(system.getTier('lila')).toEqual(ReputationTiers.FRIEND);
  });

  it('applies seasonal decay without going below zero', () => {
    const system = makeSystem();
    system.addReputation('old_gus', 2);
    system.applyDecay();
    system.applyDecay();
    system.applyDecay();

    expect(system.getReputation('old_gus')).toBe(0);
  });

  it('checks multi-npc requirements', () => {
    const system = makeSystem();
    system.addReputation('old_gus', 55);
    system.addReputation('maya', 30);

    expect(system.meetsRequirement({ old_gus: 50, maya: 25 })).toBe(true);
    expect(system.meetsRequirement({ old_gus: 50, maya: 40 })).toBe(false);
  });
});
