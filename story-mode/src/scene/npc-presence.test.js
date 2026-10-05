import { describe, expect, it } from 'vitest';

import { createGameState } from '../game/state.js';
import { getNPCsPresentInZone, resolveNpcPresence } from './npc-presence.js';

function stateFor(season, mutate) {
  const state = createGameState();
  state.season.season = season;
  state.campaign.currentSeason = season;
  mutate?.(state);
  return state;
}

describe('npc presence', () => {
  it('keeps NPCs at their scheduled zone when the player can enter it', () => {
    const state = stateFor('fall', (s) => { s.campaign.reputation.old_gus = 60; });
    expect(resolveNpcPresence('old_gus', state)).toMatchObject({ zone: 'forest_edge', fallback: false });
    expect(resolveNpcPresence('maya', state)).toMatchObject({ zone: 'neighborhood', fallback: true }); // market locked
  });

  it('falls back to the neighborhood when the scheduled zone is locked', () => {
    // Gus in fall before the forest opens: previously nobody could reach him.
    expect(resolveNpcPresence('old_gus', stateFor('fall'))).toMatchObject({ zone: 'neighborhood', fallback: true });
    // Maya in spring before the meadow opens.
    expect(resolveNpcPresence('maya', stateFor('spring'))).toMatchObject({ zone: 'neighborhood', fallback: true });
    // Lila in winter before the greenhouse opens.
    expect(resolveNpcPresence('lila', stateFor('winter'))).toMatchObject({ zone: 'neighborhood', fallback: true });
  });

  it('gives Maya a place to stand in winter, when her schedule has none', () => {
    const presence = resolveNpcPresence('maya', stateFor('winter'));
    expect(presence.zone).toBe('neighborhood');
    expect(Number.isFinite(presence.position.x)).toBe(true);
  });

  it('lists everyone present in a zone exactly once across all seasons', () => {
    ['spring', 'summer', 'fall', 'winter'].forEach((season) => {
      const state = stateFor(season);
      const zones = ['neighborhood', 'meadow', 'forest_edge', 'market_square', 'greenhouse', 'riverside'];
      const seen = zones.flatMap((zone) => getNPCsPresentInZone(zone, state).map((npc) => npc.id));
      expect(seen.sort()).toEqual(['lila', 'maya', 'old_gus']);
    });
  });
});
