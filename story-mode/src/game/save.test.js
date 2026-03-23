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
  vi.stubGlobal('localStorage', localStorageMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
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
    expect(loaded.version).toBe(3);
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
});
