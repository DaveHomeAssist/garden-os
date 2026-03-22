import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuestEngine, QuestStates } from './quest-engine.js';
import { PHASES, createGameState } from './state.js';
import { Actions, Store } from './store.js';

const TEST_DECK = [
  {
    id: 'quest_seed',
    npc: 'old_gus',
    title: 'Plant Basil',
    requirements: [{ type: 'crop_planted', id: 'basil', count: 1 }],
    rewards: [{ type: 'reputation', id: 'old_gus', amount: 15 }],
    prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
    timed: false,
  },
  {
    id: 'quest_zone',
    npc: 'maya',
    title: 'Visit Meadow',
    requirements: [{ type: 'zone_visited', id: 'meadow', count: 1 }],
    rewards: [],
    prerequisites: { chapter_min: 1, season: 'spring', reputation: { old_gus: 10 }, quests_completed: [] },
    timed: false,
  },
  {
    id: 'quest_timed',
    npc: 'lila',
    title: 'Fall Harvest',
    requirements: [{ type: 'crop_harvested', id: 'lettuce', count: 1 }],
    rewards: [],
    prerequisites: { chapter_min: 1, season: 'fall', reputation: {}, quests_completed: [] },
    timed: true,
    deadline: 'end_of_fall',
  },
];

function makeEngine() {
  return new QuestEngine(new Store(createGameState()), TEST_DECK);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QuestEngine', () => {
  it('walks a quest from available to completed', () => {
    const engine = makeEngine();
    expect(engine.getAvailableQuests().map((quest) => quest.id)).toContain('quest_seed');

    expect(engine.acceptQuest('quest_seed')).toBe(true);
    expect(engine.getQuestLog().find((entry) => entry.id === 'quest_seed')?.state).toBe(QuestStates.ACCEPTED);

    const state = engine.store.getState();
    state.season.grid[0].cropId = 'basil';
    engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

    expect(engine.evaluateProgress()).toEqual([{ questId: 'quest_seed', newState: QuestStates.READY_TO_TURN_IN }]);
    expect(engine.turnInQuest('quest_seed')).toEqual([{ type: 'reputation', id: 'old_gus', amount: 15 }]);
    expect(engine.getQuestLog().find((entry) => entry.id === 'quest_seed')?.state).toBe(QuestStates.COMPLETED);
  });

  it('supports the abandoned path', () => {
    const engine = makeEngine();
    engine.acceptQuest('quest_seed');
    expect(engine.abandonQuest('quest_seed')).toBe(true);
    expect(engine.getQuestLog().find((entry) => entry.id === 'quest_seed')?.state).toBe(QuestStates.ABANDONED);
  });

  it('fails a timed quest after fall ends', () => {
    const engine = makeEngine();
    const base = engine.store.getState();
    base.season.season = 'fall';
    base.campaign.currentSeason = 'fall';
    engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state: base } });
    engine.acceptQuest('quest_timed');

    const next = engine.store.getState();
    next.season.season = 'winter';
    next.campaign.currentSeason = 'winter';
    engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state: next } });

    expect(engine.checkTimedQuests()).toEqual(['quest_timed']);
    expect(engine.getQuestLog().find((entry) => entry.id === 'quest_timed')?.state).toBe(QuestStates.FAILED);
  });

  it('filters quest availability through prerequisites', () => {
    const engine = makeEngine();
    expect(engine.getAvailableQuests().map((quest) => quest.id)).not.toContain('quest_zone');

    const state = engine.store.getState();
    state.campaign.reputation.old_gus = 15;
    state.season.season = 'spring';
    engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

    expect(engine.getAvailableQuests().map((quest) => quest.id)).toContain('quest_zone');
  });

  it('evaluates each requirement type against canonical state', () => {
    const engine = makeEngine();
    const state = engine.store.getState();
    state.campaign.pantry.lettuce = 2;
    state.campaign.reputation.old_gus = 25;
    state.campaign.craftedItems.compost = 1;
    state.campaign.worldState.visitedZones.push('meadow');
    state.season.grid[3].cropId = 'basil';
    state.season.season = 'spring';
    engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

    expect(engine.meetsRequirement({ type: 'crop_harvested', id: 'lettuce', count: 1 }, engine.store.getState())).toBe(true);
    expect(engine.meetsRequirement({ type: 'crop_planted', id: 'basil', count: 1 }, engine.store.getState())).toBe(true);
    expect(engine.meetsRequirement({ type: 'reputation', id: 'old_gus', count: 20 }, engine.store.getState())).toBe(true);
    expect(engine.meetsRequirement({ type: 'item_crafted', id: 'compost', count: 1 }, engine.store.getState())).toBe(true);
    expect(engine.meetsRequirement({ type: 'zone_visited', id: 'meadow', count: 1 }, engine.store.getState())).toBe(true);
    expect(engine.meetsRequirement({ type: 'season', id: 'spring', count: 1 }, engine.store.getState())).toBe(true);
  });

  it('enforces the max active quest limit', () => {
    const extraDeck = [
      {
        id: 'quest_a',
        npc: 'old_gus',
        title: 'A',
        requirements: [],
        rewards: [],
        prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
        timed: false,
      },
      {
        id: 'quest_b',
        npc: 'maya',
        title: 'B',
        requirements: [],
        rewards: [],
        prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
        timed: false,
      },
      {
        id: 'quest_c',
        npc: 'lila',
        title: 'C',
        requirements: [],
        rewards: [],
        prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
        timed: false,
      },
      {
        id: 'quest_d',
        npc: 'old_gus',
        title: 'D',
        requirements: [],
        rewards: [],
        prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
        timed: false,
      },
    ];
    const engine = new QuestEngine(new Store(createGameState()), extraDeck);

    expect(engine.acceptQuest('quest_a')).toBe(true);
    expect(engine.acceptQuest('quest_b')).toBe(true);
    expect(engine.acceptQuest('quest_c')).toBe(true);
    expect(engine.acceptQuest('quest_d')).toBe(false);
  });
});
