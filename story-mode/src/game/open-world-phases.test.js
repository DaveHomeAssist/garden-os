// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import { getCropById } from '../data/crops.js';
import { buildWorldMapModel } from '../ui/world-map.js';
import { WORLD_ZONE_INTERACTABLES } from '../ui/zone-travel.js';
import { ZONE_FACTORIES } from '../scene/zones/zone-registry.js';
import { createGameState, CAMPAIGN_SCHEMA_VERSION } from './state.js';
import { Actions, Store } from './store.js';
import { BedManager } from './bed-manager.js';
import { saveCampaign, loadCampaign } from './save.js';
import { QuestEngine } from './quest-engine.js';
import { assertValidQuestDeck } from './quest-deck-validator.js';
import { computeMarketPrices, MarketSystem } from './market.js';
import { loadContentPacks } from './pack-loader.js';
import { validateContentPack } from './pack-validator.js';

const repoRoot = `${process.cwd()}/../`;
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] ?? null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

function readRepoFile(relativePath) {
  return readFileSync(`${repoRoot}${relativePath}`, 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readRepoFile(relativePath));
}

function createUnlockedState() {
  const state = createGameState();
  state.campaign.skills.foraging.level = 10;
  state.campaign.skills.crafting.level = 10;
  state.campaign.skills.social.level = 10;
  state.campaign.questLog.gus_river_path = { state: 'COMPLETED' };
  state.campaign.activeFestival = { id: 'test_festival' };
  state.campaign.reputation.old_gus = 100;
  return state;
}

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal('localStorage', localStorageMock);
});

afterEach(() => {
  localStorageMock.clear();
  vi.unstubAllGlobals();
});

describe('open world phases 5 to 8', () => {
  it('builds the world map from WORLD_MAP and covers every connection edge', () => {
    const state = createUnlockedState();
    const model = buildWorldMapModel(state);
    expect(model.zones).toHaveLength(8);
    expect(model.zones.map((zone) => zone.id).sort()).toEqual(Object.keys(WORLD_MAP.zones).sort());

    WORLD_MAP.connections.forEach((connection) => {
      const fromExits = WORLD_ZONE_INTERACTABLES[connection.from] ?? [];
      expect(fromExits.some((exit) => exit.zoneId === connection.to)).toBe(true);
      if (connection.bidirectional) {
        const toExits = WORLD_ZONE_INTERACTABLES[connection.to] ?? [];
        expect(toExits.some((exit) => exit.zoneId === connection.from)).toBe(true);
      }
    });

    const store = new Store(state);
    WORLD_MAP.connections.forEach((connection) => {
      store.dispatch({
        type: Actions.ZONE_CHANGED,
        payload: { fromZone: connection.from, toZone: connection.to, spawnPoint: { x: 0, z: 0 } },
      });
      expect(store.getState().campaign.worldState.currentZone).toBe(connection.to);
      if (connection.bidirectional) {
        store.dispatch({
          type: Actions.ZONE_CHANGED,
          payload: { fromZone: connection.to, toZone: connection.from, spawnPoint: { x: 0, z: 0 } },
        });
        expect(store.getState().campaign.worldState.currentZone).toBe(connection.from);
      }
    });
  });

  it('keeps active beds synced to zone travel and preserves bed state', () => {
    const store = new Store(createGameState());
    const beds = new BedManager(store);
    beds.acquireBed('player_plot_bed', { name: 'Home Bed', zone: 'player_plot' });
    beds.acquireBed('meadow_bed', { name: 'Meadow Bed', zone: 'meadow' });
    beds.switchActiveBed('player_plot_bed');

    store.dispatch({
      type: Actions.ZONE_CHANGED,
      payload: { fromZone: 'player_plot', toZone: 'meadow', spawnPoint: { x: 1, z: 1 } },
    });

    const campaign = store.getState().campaign;
    expect(campaign.activeBedId).toBe('meadow_bed');
    expect(campaign.beds.player_plot_bed.name).toBe('Home Bed');
    expect(campaign.beds.meadow_bed.name).toBe('Meadow Bed');
  });

  it('has scene factories and valid biome crops for every zone', () => {
    Object.keys(WORLD_MAP.zones).forEach((zoneId) => {
      const zone = WORLD_MAP.zones[zoneId];
      expect(ZONE_FACTORIES[zoneId]).toBeTypeOf('function');
      expect(zone.biomeCrops.length).toBeGreaterThanOrEqual(1);
      zone.biomeCrops.forEach((cropId) => {
        expect(getCropById(cropId)).toBeTruthy();
      });
    });
  });

  it('round trips forage state and legacy saves through schema version 8', () => {
    const state = createGameState();
    state.campaign.worldState.currentZone = 'meadow';
    state.campaign.worldState.forageState = {
      cooldowns: { meadow_herbs: 1_700_000_300_000 },
      history: { meadow_herbs: { zoneId: 'meadow', items: [{ itemId: 'basil_seed', count: 2 }] } },
    };
    saveCampaign(state.campaign, 0);
    const loaded = loadCampaign(0);
    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(loaded.worldState.forageState.cooldowns.meadow_herbs).toBe(1_700_000_300_000);

    localStorage.setItem('gos-story-slot-1-campaign', JSON.stringify({ version: 3, currentChapter: 2 }));
    const legacy = loadCampaign(1);
    expect(legacy.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(legacy.worldState.currentZone).toBe('player_plot');
  });

  it('keeps WORLD_MAP byte stable and avoids Math.random in deterministic paths', () => {
    const worldMapText = readRepoFile('specs/WORLD_MAP.json');
    const mapSnapshot = JSON.stringify(WORLD_MAP);
    buildWorldMapModel(createUnlockedState());
    expect(readRepoFile('specs/WORLD_MAP.json')).toBe(worldMapText);
    expect(JSON.stringify(WORLD_MAP)).toBe(mapSnapshot);

    [
      'story-mode/src/scene/zone-manager.js',
      'story-mode/src/scene/zones/world-zone-contract.js',
      'story-mode/src/ui/zone-travel.js',
      'story-mode/src/game/foraging.js',
      'story-mode/src/game/quest-engine.js',
      'story-mode/src/game/market.js',
      'story-mode/src/scoring/bed-score.js',
      'story-mode/src/scoring/cell-score.js',
    ].forEach((relativePath) => {
      expect(readRepoFile(relativePath)).not.toContain('Math.random');
    });
  });

  it('keeps market map copy out of profit-loop framing', () => {
    const market = WORLD_MAP.zones.market_square;
    const marketCopy = [
      market.description,
      ...market.interactables.map((entry) => entry.label),
    ].join(' ').toLowerCase();

    ['sell harvests', 'buy tools', 'buy and upgrade', 'best-paying', 'high-reward'].forEach((phrase) => {
      expect(marketCopy).not.toContain(phrase);
    });
  });

  it('validates quest branches and persists divergent choices', () => {
    expect(assertValidQuestDeck().branchingQuestCount).toBeGreaterThanOrEqual(10);
    const quest = readJson('specs/QUEST_DECK.json').quests.find((entry) => entry.id === 'lila_basil');
    const runChoice = (choiceId) => {
      const store = new Store(createGameState());
      const engine = new QuestEngine(store, [quest]);
      engine.acceptQuest('lila_basil');
      const state = store.getState();
      state.campaign.pantry.basil = 3;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
      engine.evaluateProgress();
      engine.turnInQuest('lila_basil', choiceId);
      return store.getState().campaign;
    };

    const community = runChoice('community');
    const stewardship = runChoice('stewardship');
    expect(community.worldState.questOutcomes.lila_basil.branch).toBe('community');
    expect(stewardship.worldState.questOutcomes.lila_basil.branch).toBe('stewardship');
    expect(community.reputation.lila).toBeGreaterThan(stewardship.reputation.lila);
    expect(community.storyLog.some((entry) => entry.outcomeId === 'community')).toBe(true);
    expect(stewardship.storyLog.some((entry) => entry.outcomeId === 'stewardship')).toBe(true);

    saveCampaign(community, 2);
    const loaded = loadCampaign(2);
    expect(loaded.choiceLog.lila_basil.outcomeId).toBe('community');
    expect(loaded.zoneReputation.neighborhood).toBeGreaterThan(0);
  });

  it('runs deterministic market prices, transactions, and price history', () => {
    const springA = computeMarketPrices({ seed: 'smoke-seed', season: 'spring' });
    const springB = computeMarketPrices({ seed: 'smoke-seed', season: 'spring' });
    const summer = computeMarketPrices({ seed: 'smoke-seed', season: 'summer' });
    expect(JSON.stringify(springA)).toBe(JSON.stringify(springB));
    expect(JSON.stringify(springA)).not.toBe(JSON.stringify(summer));

    const store = new Store(createGameState());
    const market = new MarketSystem(store, { seed: 'smoke-seed' });
    const buy = market.buy('lettuce_seed', 1);
    expect(buy.success).toBe(true);
    expect(buy.balanceAfter).toBeLessThan(buy.balanceBefore);
    const sell = market.sell('lettuce_seed', 1);
    expect(sell.success).toBe(true);
    expect(sell.balanceAfter).toBeGreaterThan(sell.balanceBefore);

    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'garden_twine', count: 2 } });
    const barter = market.barter('garden_twine', 'compost', 1);
    expect(barter.success).toBe(true);

    ['spring', 'summer', 'fall', 'winter'].forEach((season) => market.recordSeasonPrices(season));
    expect(store.getState().campaign.market.priceHistory).toHaveLength(3);

    saveCampaign(store.getState().campaign, 0);
    expect(loadCampaign(0).market.transactions.length).toBeGreaterThanOrEqual(3);
  });

  it('loads valid packs, rejects malformed packs, and preserves provenance', () => {
    const validPacks = [
      readJson('examples/packs/spring-herbs.json'),
      readJson('examples/packs/porch-quest.json'),
      readJson('examples/packs/riverside-neighbor.json'),
    ];
    const malformedPack = readJson('examples/packs/malformed-pack.json');
    validPacks.forEach((pack) => expect(validateContentPack(pack).valid).toBe(true));
    expect(validateContentPack(malformedPack).valid).toBe(false);

    const empty = loadContentPacks(createGameState(), []);
    expect(empty.loaded).toEqual([]);
    expect(empty.rejected).toEqual([]);

    const result = loadContentPacks(createGameState(), [...validPacks, malformedPack]);
    expect(result.loaded).toHaveLength(3);
    expect(result.rejected).toHaveLength(1);
    expect(result.content.crops[0].modded).toBe(true);
    expect(result.content.crops[0].provenance.packId).toBe('spring_herbs');
    expect(result.state.campaign.contentPacks.loaded).toHaveLength(3);
    expect(result.state.campaign.contentPacks.rejected[0].errors.length).toBeGreaterThan(0);
    expect(result.state.campaign.contentProvenance.some((entry) => entry.packId === 'spring_herbs')).toBe(true);
  });
});
