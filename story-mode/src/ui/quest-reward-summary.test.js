import { describe, expect, it } from 'vitest';
import { formatSeedReward, summarizeRewards } from './quest-controller.js';

describe('quest reward summary', () => {
  it('does not double "seeds" for seed packets whose name already says seeds', () => {
    expect(formatSeedReward({ type: 'seed', id: 'herb_seeds', amount: 1 })).toBe('Herb Seeds');
    expect(formatSeedReward({ type: 'seed', id: 'hybrid_seeds', amount: 1 })).toBe('Hybrid Seeds');
    expect(formatSeedReward({ type: 'seed', id: 'rare_seed_bundle', amount: 1 })).toBe('Rare Seed Bundle');
    expect(formatSeedReward({ type: 'seed', id: 'shiitake_spores', amount: 1 })).toBe('Shiitake Spores');
  });

  it('still appends "seeds" to a crop name', () => {
    expect(formatSeedReward({ type: 'seed', id: 'basil', amount: 1 })).toBe('Basil seeds');
    expect(formatSeedReward({ type: 'seed', id: 'heritage_pepper', amount: 1 })).toBe('Heritage Pepper seeds');
  });

  it('builds the Fresh Basil, Please toast summary without "Herb Seeds seeds"', () => {
    const summary = summarizeRewards([
      { type: 'seed', id: 'herb_seeds', amount: 1 },
      { type: 'reputation', id: 'lila', amount: 10 },
      { type: 'xp', id: 'social', amount: 10 },
      { type: 'reputation', id: 'lila', amount: 5 },
    ]);
    expect(summary).toBe('+15 Lila · Herb Seeds · +10 Social XP');
    expect(summary).not.toMatch(/seeds seeds/i);
  });
});
