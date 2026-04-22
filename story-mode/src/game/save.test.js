// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState } from './state.js';
import { listSaves, loadCampaign, loadSeasonState, saveCampaign, saveSeasonState } from './save.js';

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

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal('localStorage', localStorageMock);
});

afterEach(() => {
  localStorageMock.clear();
  vi.unstubAllGlobals();
});

describe('save', () => {
  it('persists and restores quest, reputation, and world data', () => {
    const state = createGameState();
    state.campaign.questLog.gus_tomatoes = { state: 'ACCEPTED' };
    state.campaign.reputation.old_gus = 20;
    state.campaign.worldState.currentZone = 'neighborhood';
    state.campaign.worldState.visitedZones.push('neighborhood');

    saveCampaign(state.campaign, 0);
    const loaded = loadCampaign(0);

    expect(loaded.questLog.gus_tomatoes.state).toBe('ACCEPTED');
    expect(loaded.reputation.old_gus).toBe(20);
    expect(loaded.worldState.currentZone).toBe('neighborhood');
    expect(loaded.version).toBe(4);
  });

  it('applies defaults when loading an old-format save', () => {
    localStorage.setItem('gos-story-slot-1-campaign', JSON.stringify({
      currentChapter: 2,
      currentSeason: 'summer',
    }));

    const loaded = loadCampaign(1);

    expect(loaded.questLog).toEqual({});
    expect(loaded.reputation).toMatchObject({ old_gus: 0, maya: 0, lila: 0 });
    expect(loaded.worldState.currentZone).toBe('player_plot');
  });

  it('surfaces quest and zone summary fields in listSaves', () => {
    const state = createGameState();
    state.campaign.questLog.a = { state: 'ACCEPTED' };
    state.campaign.questLog.b = { state: 'IN_PROGRESS' };
    state.campaign.questLog.c = { state: 'COMPLETED' };
    state.campaign.worldState.visitedZones.push('neighborhood', 'forest_edge');
    saveCampaign(state.campaign, 2);

    const slot = listSaves()[2];
    expect(slot.activeQuests).toBe(2);
    expect(slot.zonesVisited).toBe(3);
  });

  it('migrates old season grid arrays into versioned grid objects', () => {
    localStorage.setItem('gos-story-slot-0-season', JSON.stringify({
      season: 'spring',
      gridCols: 8,
      gridRows: 4,
      grid: Array.from({ length: 32 }, () => ({ cropId: null })),
    }));

    const loaded = loadSeasonState(0);
    expect(Array.isArray(loaded.grid.cells)).toBe(true);
    expect(loaded.grid.cols).toBe(8);
    expect(loaded.grid.rows).toBe(4);
  });

  it('persists new season grid objects with dimensions intact', () => {
    const state = createGameState();
    state.season.gridCols = 8;
    state.season.gridRows = 6;
    saveSeasonState(state.season, 0);
    const loaded = loadSeasonState(0);
    expect(loaded.grid.cols).toBe(8);
    expect(loaded.grid.rows).toBe(6);
  });

  it('v3 save migrates to v4 with new fields', () => {
    // Simulate a v3 save that lacks beds, activeBedId, biomeCropsUnlocked, gameMode
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify({
      version: 3,
      currentChapter: 3,
      currentSeason: 'fall',
      questLog: { quest_a: { state: 'ACCEPTED' } },
      reputation: { old_gus: 10 },
      worldState: { currentZone: 'player_plot', visitedZones: ['player_plot'] },
    }));

    const loaded = loadCampaign(0);

    expect(loaded.version).toBe(4);
    expect(loaded.beds).toEqual({});
    expect(loaded.activeBedId).toBe('player_plot');
    expect(loaded.biomeCropsUnlocked).toEqual([]);
    expect(loaded.gameMode).toBe('story');
    // Existing fields preserved
    expect(loaded.currentChapter).toBe(3);
    expect(loaded.questLog.quest_a.state).toBe('ACCEPTED');
  });

  it('v4 save round-trips beds and biome crops', () => {
    const state = createGameState();
    state.campaign.beds = {
      forest_bed: { gridCols: 6, gridRows: 3, grid: [], biome: 'forest_edge' },
    };
    state.campaign.activeBedId = 'forest_bed';
    state.campaign.biomeCropsUnlocked = ['wild_garlic', 'shiitake_mushroom'];
    state.campaign.gameMode = 'sandbox';

    saveCampaign(state.campaign, 1);
    const loaded = loadCampaign(1);

    expect(loaded.version).toBe(4);
    expect(loaded.beds).toEqual({
      forest_bed: { gridCols: 6, gridRows: 3, grid: [], biome: 'forest_edge' },
    });
    expect(loaded.activeBedId).toBe('forest_bed');
    expect(loaded.biomeCropsUnlocked).toEqual(['wild_garlic', 'shiitake_mushroom']);
    expect(loaded.gameMode).toBe('sandbox');
  });

  it('round-trips forage cooldown and history state inside worldState', () => {
    const state = createGameState();
    state.campaign.worldState.currentZone = 'meadow';
    state.campaign.worldState.forageState = {
      cooldowns: {
        meadow_herbs: 1_700_000_300_000,
      },
      history: {
        meadow_herbs: {
          zoneId: 'meadow',
          items: [{ itemId: 'basil_seed', count: 2 }],
          xpGained: 20,
          timestamp: 1_700_000_000_000,
        },
      },
    };

    saveCampaign(state.campaign, 2);
    const loaded = loadCampaign(2);

    expect(loaded.worldState.currentZone).toBe('meadow');
    expect(loaded.worldState.forageState.cooldowns).toEqual({
      meadow_herbs: 1_700_000_300_000,
    });
    expect(loaded.worldState.forageState.history.meadow_herbs).toEqual({
      zoneId: 'meadow',
      items: [{ itemId: 'basil_seed', count: 2 }],
      xpGained: 20,
      timestamp: 1_700_000_000_000,
    });
  });
});
