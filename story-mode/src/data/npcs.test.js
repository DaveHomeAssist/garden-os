import { describe, expect, it } from 'vitest';

import { getActiveNeighbors, getNPC, getNPCGreeting, getNPCsInZone } from './npcs.js';

describe('npcs', () => {
  it('returns known NPC data', () => {
    expect(getNPC('old_gus')).toMatchObject({
      id: 'old_gus',
      name: 'Old Gus',
      role: 'Veteran Gardener',
    });
  });

  it('returns NPCs for a zone and season', () => {
    const springNeighborhood = getNPCsInZone('neighborhood', 'spring').map((npc) => npc.id);
    expect(springNeighborhood).toEqual(expect.arrayContaining(['old_gus', 'maya', 'lila']));
  });

  it('returns reputation-aware greetings', () => {
    expect(getNPCGreeting('old_gus', 'stranger')).toBe('Hmm? New around here?');
    expect(getNPCGreeting('old_gus', 'friend')).toBe('Good to see you, kid.');
  });

  it('returns deterministic active neighbors', () => {
    expect(getActiveNeighbors({}).map((entry) => entry.id)).toEqual([
      'neighbor_gardener',
      'neighbor_beekeeper',
    ]);
  });
});
