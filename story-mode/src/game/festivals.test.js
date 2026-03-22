import { describe, expect, it } from 'vitest';

import { FestivalEngine } from './festivals.js';
import { createGameState } from './state.js';
import { Store } from './store.js';

function makeEngine(season = 'spring', month = 2) {
  const state = createGameState();
  state.season.season = season;
  state.season.month = month;
  return new FestivalEngine(new Store(state));
}

describe('FestivalEngine', () => {
  it('returns the correct seasonal festival', () => {
    const engine = makeEngine('fall', 2);
    expect(engine.checkFestivalStart()?.id).toBe('harvest_week');
    expect(engine.getActiveFestival()?.id).toBe('harvest_week');
  });

  it('starts and ends festivals through the store', () => {
    const engine = makeEngine('summer', 2);
    expect(engine.startFestival('growth_surge')).toBe(true);
    expect(engine.getActiveFestival()?.id).toBe('growth_surge');
    expect(engine.endFestival()).toBe(true);
    expect(engine.getActiveFestival()).toBeNull();
  });

  it('completes festival activities once and returns rewards', () => {
    const engine = makeEngine('winter', 2);
    engine.startFestival('dormancy_challenge');

    const rewards = engine.doActivity('soil_workshop');
    expect(rewards).toEqual([{ type: 'xp', id: 'festival', amount: 15 }]);
    expect(engine.doActivity('soil_workshop')).toBeNull();
  });
});
