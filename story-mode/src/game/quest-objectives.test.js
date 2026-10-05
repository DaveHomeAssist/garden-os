import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import questDeckData from 'specs/QUEST_DECK.json';
import { FestivalEngine } from './festivals.js';
import { getInventoryItemCount } from './inventory.js';
import { MarketSystem } from './market.js';
import { QuestEngine, QuestStates } from './quest-engine.js';
import { createQuestLedger, getCampaignYear, normalizeQuestLedger } from './quest-ledger.js';
import { createGameState } from './state.js';
import { Actions, Store } from './store.js';

const PREREQS = { chapter_min: 1, season: null, reputation: {}, quests_completed: [] };
const OUTCOMES = [{ id: 'community', label: 'Share it', rewards: [] }, { id: 'stewardship', label: 'Keep it', rewards: [] }];

function quest(id, requirements, extra = {}) {
  return { id, npc: 'lila', title: id, requirements, rewards: [], outcomes: OUTCOMES, prerequisites: PREREQS, timed: false, ...extra };
}

function setup(deck, mutate = null) {
  const state = createGameState();
  mutate?.(state);
  const store = new Store(state);
  const engine = new QuestEngine(store, deck);
  return { store, engine };
}

function patch(store, mutate) {
  const state = store.getState();
  mutate(state);
  store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
}

function progress(engine, questId) {
  return engine.getQuestProgress(questId).map((entry) => `${entry.current}/${entry.target}`);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 3, 1, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('quest objective types', () => {
  it('item_found counts finds in the named zone only (forage and quest-site discoveries)', () => {
    const { store, engine } = setup([quest('q', [{ type: 'item_found', id: 'watercress', zone: 'riverside', count: 3 }])]);
    engine.acceptQuest('q');
    store.dispatch({ type: Actions.FORAGE, payload: { spotId: 'meadow_herbs', zoneId: 'meadow', items: [{ itemId: 'watercress', count: 5 }] } });
    expect(progress(engine, 'q')).toEqual(['0/3']);
    store.dispatch({ type: Actions.FORAGE, payload: { spotId: 'riverside_watercress', zoneId: 'riverside', items: [{ itemId: 'watercress', count: 2 }] } });
    store.dispatch({ type: Actions.QUEST_ITEM_FOUND, payload: { itemId: 'watercress', zoneId: 'riverside', count: 1 } });
    expect(progress(engine, 'q')).toEqual(['3/3']);
    expect(engine.evaluateProgress()).toEqual([{ questId: 'q', newState: QuestStates.READY_TO_TURN_IN }]);
  });

  it('item_found without a zone counts finds anywhere', () => {
    const { store, engine } = setup([quest('q', [{ type: 'item_found', id: 'old_map', count: 1 }])]);
    store.dispatch({ type: Actions.QUEST_ITEM_FOUND, payload: { itemId: 'old_map', zoneId: 'neighborhood' } });
    expect(progress(engine, 'q')).toEqual(['1/1']);
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'old_map')).toBe(1);
  });

  it('item_delivered hands items over only in the required zone and removes them atomically', () => {
    const deck = [quest('q', [
      { type: 'item_delivered', id: 'wood', zone: 'forest_edge', count: 4 },
      { type: 'item_delivered', id: 'compost', zone: 'forest_edge', count: 2 },
    ], { npc: 'old_gus' })];
    const { store, engine } = setup(deck);
    engine.acceptQuest('q');
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'wood', count: 3 } });
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'compost', count: 2 } });

    expect(engine.getDeliverableItems('q', 'neighborhood')).toEqual([]);
    expect(engine.getDeliverableItems('q', 'forest_edge')).toEqual([
      { itemId: 'wood', count: 3 },
      { itemId: 'compost', count: 2 },
    ]);
    engine.deliverItems('q', 'forest_edge');
    expect(progress(engine, 'q')).toEqual(['3/4', '2/2']);
    const inventory = store.getState().campaign.inventory;
    expect(getInventoryItemCount(inventory, 'wood')).toBe(0);
    expect(getInventoryItemCount(inventory, 'compost')).toBe(0);

    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'wood', count: 5 } });
    expect(engine.getDeliverableItems('q', 'forest_edge')).toEqual([{ itemId: 'wood', count: 1 }]);
    engine.deliverItems('q', 'forest_edge');
    expect(progress(engine, 'q')).toEqual(['4/4', '2/2']);
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'wood')).toBe(4);

    // A delivery that cannot be fully paid is rejected without touching the inventory.
    store.dispatch({ type: Actions.QUEST_DELIVER, payload: { questId: 'q', items: [{ itemId: 'wood', count: 99 }] } });
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'wood')).toBe(4);
  });

  it('item_traded counts market buys and sells made after the quest was accepted', () => {
    const { store, engine } = setup([quest('q', [{ type: 'item_traded', id: 'any', count: 4 }])]);
    const market = new MarketSystem(store);
    expect(market.buy('lettuce_seed', 3).success).toBe(true);
    vi.setSystemTime(Date.UTC(2026, 3, 1, 13));
    engine.acceptQuest('q');
    expect(progress(engine, 'q')).toEqual(['0/4']);
    expect(market.sell('lettuce_seed', 2).success).toBe(true);
    expect(market.buy('basil_seed', 2).success).toBe(true);
    expect(progress(engine, 'q')).toEqual(['4/4']);
  });

  it('item_traded with a specific id ignores other items', () => {
    const { store, engine } = setup([quest('q', [{ type: 'item_traded', id: 'compost', count: 1 }])]);
    engine.acceptQuest('q');
    const market = new MarketSystem(store);
    market.buy('lettuce_seed', 2);
    expect(progress(engine, 'q')).toEqual(['0/1']);
    market.buy('compost', 1);
    expect(progress(engine, 'q')).toEqual(['1/1']);
  });

  it('festival_completed records a festival once every activity is done', () => {
    const { store, engine } = setup([quest('q', [{ type: 'festival_completed', id: 'spring', count: 1 }])]);
    const festivals = new FestivalEngine(store);
    festivals.startFestival('bloom_festival');
    const [first, second] = festivals.getAvailableActivities();
    festivals.doActivity(first.id);
    expect(progress(engine, 'q')).toEqual(['0/1']);
    festivals.doActivity(second.id);
    expect(progress(engine, 'q')).toEqual(['1/1']);
    expect(normalizeQuestLedger(store.getState().campaign.questLedger).festivalsCompleted)
      .toEqual([expect.objectContaining({ festivalId: 'bloom_festival', season: 'spring', year: 1 })]);
  });

  it('festival_completed with sameYear needs all festivals inside one campaign year', () => {
    const deck = [quest('q', ['spring', 'summer', 'fall', 'winter'].map((id) => ({ type: 'festival_completed', id, count: 1, sameYear: true })))];
    const entry = (festivalId, season, year) => ({ festivalId, season, year, chapter: (year - 1) * 4 + 1 });
    const { store, engine } = setup(deck, (state) => {
      state.campaign.questLedger = {
        ...createQuestLedger(),
        festivalsCompleted: [
          entry('bloom_festival', 'spring', 1),
          entry('growth_surge', 'summer', 1),
          entry('harvest_week', 'fall', 2),
          entry('dormancy_challenge', 'winter', 2),
        ],
      };
    });
    expect(engine.requirementsMet(deck[0], store.getState())).toBe(false);
    patch(store, (state) => {
      state.campaign.questLedger.festivalsCompleted.push(entry('bloom_festival', 'spring', 2), entry('growth_surge', 'summer', 2));
    });
    expect(engine.requirementsMet(deck[0], store.getState())).toBe(true);
  });

  it('crop_harvested with id "any" sums every harvested crop', () => {
    const { store, engine } = setup([quest('q', [{ type: 'crop_harvested', id: 'any', count: 5 }])]);
    patch(store, (state) => { state.campaign.pantry = { lettuce: 2, basil: 2 }; });
    expect(progress(engine, 'q')).toEqual(['4/5']);
    patch(store, (state) => { state.campaign.pantry.radish = 1; });
    expect(progress(engine, 'q')).toEqual(['5/5']);
  });

  it('crop_harvested with a zone only counts harvests from that zone', () => {
    const { store, engine } = setup([quest('q', [{ type: 'crop_harvested', id: 'vanilla_orchid', zone: 'greenhouse', count: 1 }])]);
    patch(store, (state) => { state.campaign.pantry = { vanilla_orchid: 3 }; });
    expect(progress(engine, 'q')).toEqual(['0/1']);

    store.dispatch({ type: Actions.QUEST_SITE_PLANT, payload: { siteId: 'greenhouse_planter', cropId: 'vanilla_orchid' } });
    store.dispatch({ type: Actions.QUEST_SITE_HARVEST, payload: { siteId: 'greenhouse_planter', cropId: 'vanilla_orchid' } });
    expect(progress(engine, 'q')).toEqual(['0/1']); // not grown yet

    patch(store, (state) => { state.campaign.currentChapter += 2; });
    store.dispatch({ type: Actions.QUEST_SITE_HARVEST, payload: { siteId: 'greenhouse_planter', cropId: 'vanilla_orchid' } });
    expect(progress(engine, 'q')).toEqual(['1/1']);
    expect(store.getState().campaign.pantry.vanilla_orchid).toBe(4);
  });

  it('crop_planted with a zone counts quest-site plantings, not the home bed', () => {
    const { store, engine } = setup([quest('q', [{ type: 'crop_planted', id: 'wild_clover', zone: 'meadow', count: 5 }])]);
    patch(store, (state) => { state.season.grid[0].cropId = 'wild_clover'; });
    expect(progress(engine, 'q')).toEqual(['0/5']);
    for (let i = 0; i < 6; i += 1) {
      store.dispatch({ type: Actions.QUEST_SITE_PLANT, payload: { siteId: 'meadow_clover_plot', cropId: 'wild_clover' } });
    }
    expect(progress(engine, 'q')).toEqual(['5/5']); // plot holds five patches
  });

  it('crop_planted with adjacentTo needs an orthogonal neighbour', () => {
    const { store, engine } = setup([quest('q', [{ type: 'crop_planted', id: 'cherry_tom', adjacentTo: 'pepper', count: 1 }])]);
    patch(store, (state) => {
      state.season.grid[0].cropId = 'cherry_tom';
      state.season.grid[2].cropId = 'pepper';
    });
    expect(progress(engine, 'q')).toEqual(['0/1']);
    patch(store, (state) => { state.season.grid[1].cropId = 'pepper'; });
    expect(progress(engine, 'q')).toEqual(['1/1']);
  });

  it('spot_foraged counts the named forage spot', () => {
    const { store, engine } = setup([quest('q', [{ type: 'spot_foraged', id: 'meadow_rocks', count: 1 }])]);
    store.dispatch({ type: Actions.FORAGE, payload: { spotId: 'meadow_herbs', zoneId: 'meadow', items: [{ itemId: 'herb_extract', count: 1 }] } });
    expect(progress(engine, 'q')).toEqual(['0/1']);
    store.dispatch({ type: Actions.FORAGE, payload: { spotId: 'meadow_rocks', zoneId: 'meadow', items: [{ itemId: 'stone', count: 1 }] } });
    expect(progress(engine, 'q')).toEqual(['1/1']);
  });

  it('a ready quest drops back to in progress if its requirement is lost', () => {
    const { store, engine } = setup([quest('q', [{ type: 'crop_planted', id: 'basil', count: 1 }])]);
    engine.acceptQuest('q');
    patch(store, (state) => { state.season.grid[0].cropId = 'basil'; });
    expect(engine.evaluateProgress()).toEqual([{ questId: 'q', newState: QuestStates.READY_TO_TURN_IN }]);
    patch(store, (state) => { state.season.grid[0].cropId = null; });
    expect(engine.evaluateProgress()).toEqual([{ questId: 'q', newState: QuestStates.IN_PROGRESS }]);
    expect(engine.evaluateProgress()).toEqual([]);
  });

  it('campaign years are four chapters long', () => {
    expect([1, 4, 5, 8, 9, 12].map(getCampaignYear)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('canonical quest deck objectives', () => {
  const KNOWN_TYPES = new Set([
    'crop_harvested', 'crop_planted', 'item_crafted', 'item_found', 'item_delivered',
    'item_traded', 'festival_completed', 'spot_foraged', 'zone_visited',
  ]);

  it('uses only objective types the engine can count', () => {
    const engine = new QuestEngine(new Store(createGameState()));
    const state = engine.store.getState();
    questDeckData.quests.forEach((entry) => {
      entry.requirements.forEach((requirement) => {
        expect(KNOWN_TYPES.has(requirement.type), `${entry.id}: ${requirement.type}`).toBe(true);
        expect(() => engine.getRequirementProgress(requirement, state, entry)).not.toThrow();
      });
    });
  });

  it('no longer references the nonexistent meadow_spot_* locations', () => {
    expect(JSON.stringify(questDeckData)).not.toMatch(/meadow_spot_/);
  });
});
