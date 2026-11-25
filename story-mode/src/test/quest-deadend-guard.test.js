import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import questDeck from 'specs/QUEST_DECK.json';
import { getCropById } from '../data/crops.js';
import { ITEM_REGISTRY, getItemDef } from '../game/inventory.js';
import { QuestEngine, QuestStates } from '../game/quest-engine.js';
import { createGameState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import { QuestPlaythrough, formatPlaythroughFailure } from './quest-playthrough.js';

// D7 dead-end guard. Three checks so a quest can't quietly become impossible:
// 1. every quest in the deck is offered, accepted and turned in, in that
//    order, by a headless player using only player actions;
// 2. a timed quest whose work is done before the deadline stays turn-in-able
//    after the season turns;
// 3. every quest reward points at real content, except the rewards listed in
//    REWARD_CONTENT_PENDING, which are waiting on a content decision from Dave.

// questId -> reward ids with no crop or item behind them yet. Keep this list
// exact: a new dangling reward fails, and so does fixing one without removing
// it here.
const REWARD_CONTENT_PENDING = {
  gus_tomatoes: ['seed:heritage_pepper'],
  gus_compost: ['item:compost_supplies'],
  gus_frost: ['seed:rare_seed_bundle'],
  maya_hybrid: ['seed:hybrid_seeds'],
  lila_basil: ['seed:herb_seeds'],
  lila_recipe: ['seed:exclusive_seed'],
  sam_bees: ['item:honey_jar'],
  robin_birds: ['seed:rare_wildflower_seeds'],
  explore_meadow: ['seed:rare_wildflower_seeds'],
  gus_river_path: ['item:riverside_access'],
  greenhouse_access: ['item:greenhouse_access'],
  gus_mushroom_logs: ['seed:shiitake_spores'],
  vanilla_challenge: ['seed:legendary_seed'],
  maya_masterpiece: ['item:ability_crop_crossbreeding'],
  gus_legacy: ['item:legendary_trowel_recipe', 'seed:heirloom_seeds'],
  lila_cookbook: ['item:exclusive_cosmetics'],
  market_day: ['item:rare_materials_bundle'],
  festival_champion: ['item:scoring_buff_global_5pct', 'item:trophy_festival_champion'],
};

function rewardResolves(reward) {
  if (reward.type === 'seed') return Boolean(getCropById(reward.id));
  if (reward.type === 'item') {
    if (ITEM_REGISTRY[reward.id]) return true;
    return Boolean(getItemDef(reward.id)?.recipeId);
  }
  return true;
}

function danglingRewards(quest) {
  const rewards = [...(quest.rewards ?? []), ...(quest.outcomes ?? []).flatMap((outcome) => outcome.rewards ?? [])];
  return [...new Set(rewards.filter((reward) => !rewardResolves(reward)).map((reward) => `${reward.type}:${reward.id}`))].sort();
}

describe('quest dead-end guard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('walks every quest from accept to turn-in', () => {
    const run = new QuestPlaythrough({ setNow: (ms) => vi.setSystemTime(ms) });
    const report = run.run();
    expect(formatPlaythroughFailure(report)).toBe('');
    const walkedOut = questDeck.quests.filter((quest) => {
      const accepted = report.log.findIndex((line) => line.endsWith(`accepted ${quest.id}`));
      const completed = report.log.findIndex((line) => / completed (\S+)( on delivery)?$/.exec(line)?.[1] === quest.id);
      return accepted < 0 || completed < 0 || completed < accepted;
    }).map((quest) => quest.id);
    expect(walkedOut).toEqual([]);
    expect(report.completed.sort()).toEqual(questDeck.quests.map((quest) => quest.id).sort());
  }, 120_000);

  it('keeps a finished timed quest turn-in-able after its season ends (gus_frost)', () => {
    const store = new Store(createGameState());
    const engine = new QuestEngine(store);
    const setSeason = (season, mutate = () => {}) => {
      const state = store.getState();
      state.campaign.currentChapter = 7;
      state.campaign.currentSeason = season;
      state.season.season = season;
      mutate(state);
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    };

    setSeason('fall', (state) => { state.campaign.pantry = {}; });
    expect(engine.acceptQuest('gus_frost')).toBe(true);
    engine.evaluateProgress();
    expect(engine.getQuestEntry('gus_frost').state).toBe(QuestStates.IN_PROGRESS);

    // The fall harvest lands at season end.
    setSeason('fall', (state) => {
      state.campaign.pantry = { carrot: 1, beet: 1, kale: 1, broccoli: 1, turnip: 1 };
    });
    engine.evaluateProgress();
    expect(engine.getQuestEntry('gus_frost').state).toBe(QuestStates.READY_TO_TURN_IN);

    setSeason('winter');
    expect(engine.checkTimedQuests()).toEqual([]);
    expect(engine.turnInQuest('gus_frost')).not.toBeNull();
    expect(engine.getQuestEntry('gus_frost').state).toBe(QuestStates.COMPLETED);
  });

  it('still fails a timed quest that was not finished in its season', () => {
    const store = new Store(createGameState());
    const engine = new QuestEngine(store);
    const state = store.getState();
    state.campaign.currentChapter = 7;
    state.campaign.currentSeason = 'fall';
    state.season.season = 'fall';
    state.campaign.pantry = {};
    store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    expect(engine.acceptQuest('gus_frost')).toBe(true);
    engine.evaluateProgress();

    const next = store.getState();
    next.campaign.currentSeason = 'winter';
    next.season.season = 'winter';
    store.dispatch({ type: Actions.REPLACE_STATE, payload: { state: next } });
    expect(engine.checkTimedQuests()).toEqual(['gus_frost']);
  });

  it('points every quest reward at real content, apart from the pending list', () => {
    const dangling = Object.fromEntries(
      questDeck.quests
        .map((quest) => [quest.id, danglingRewards(quest)])
        .filter(([, ids]) => ids.length),
    );
    const pending = Object.fromEntries(
      Object.entries(REWARD_CONTENT_PENDING).map(([questId, ids]) => [questId, [...ids].sort()]),
    );
    expect(dangling).toEqual(pending);
  });
});
