/**
 * Season harvest -> pantry: one unit per planted cell, not per crop type.
 * Regression for "Fresh Basil, Please" stalling at 1/3 with three basil cells.
 */
import { describe, it, expect } from 'vitest';
import { scoreBed } from './bed-score.js';
import { addHarvestToPantry, getYieldCountsForGrid } from '../data/crops.js';
import { createGameState } from '../game/state.js';
import { QuestEngine } from '../game/quest-engine.js';
import { Actions, Store } from '../game/store.js';

function bedWith(layout) {
  const state = createGameState();
  layout.forEach((cropId, i) => { state.season.grid[i].cropId = cropId; });
  return state;
}

const LAYOUT = ['basil', 'basil', 'basil', 'lettuce', 'lettuce', 'lettuce', 'lettuce', 'lettuce'];

describe('harvest yield into the pantry', () => {
  it('counts every planted cell but keeps yieldList de-duplicated', () => {
    const state = bedWith(LAYOUT);
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring', {});
    expect(result.yieldList.sort()).toEqual(['basil', 'lettuce']);
    expect(result.yieldCounts).toEqual({ basil: 3, lettuce: 5 });
    expect(getYieldCountsForGrid(state.season.grid)).toEqual({ basil: 3, lettuce: 5 });
  });

  it('3 basil cells give pantry basil 3, added to what was there', () => {
    const state = bedWith(LAYOUT);
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring', {});
    expect(addHarvestToPantry({}, result).basil).toBe(3);
    expect(addHarvestToPantry({ basil: 1, carrot: 2 }, result)).toEqual({ basil: 4, carrot: 2, lettuce: 5 });
  });

  it('falls back to one per crop type for harvest results saved before yieldCounts', () => {
    expect(addHarvestToPantry({ basil: 1 }, { yieldList: ['basil', 'radish'] })).toEqual({ basil: 2, radish: 1 });
    expect(addHarvestToPantry(undefined, null)).toEqual({});
  });

  it('an empty bed adds nothing', () => {
    const state = createGameState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring', {});
    expect(result.yieldCounts).toEqual({});
    expect(addHarvestToPantry({ basil: 2 }, result)).toEqual({ basil: 2 });
  });

  it('meets a "harvest 3 basil" quest requirement after one season', () => {
    const store = new Store(createGameState());
    const engine = new QuestEngine(store, []);
    const state = bedWith(LAYOUT);
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring', {});
    state.campaign.pantry = addHarvestToPantry(state.campaign.pantry, result);
    store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    expect(engine.getRequirementProgress({ type: 'crop_harvested', id: 'basil', count: 3 }, store.getState()))
      .toEqual({ current: 3, target: 3, met: true });
  });
});
