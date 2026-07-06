// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CAMPAIGN_SCHEMA_VERSION, createGameState } from './state.js';
import {
  deleteCampaign,
  listSaves,
  listSavesWithAuthoritySnapshots,
  loadAuthoritySnapshotSave,
  loadBestAvailableSave,
  loadCampaign,
  loadSeasonState,
  saveCampaign,
  saveSeasonState,
} from './save.js';
import { IndexedDbAuthorityJournal, sessionPointerKey } from '../engine/authority-cache.js';

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

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createSuccessRequest(value) {
  const request = { error: null, result: undefined };
  queueMicrotask(() => {
    request.result = clone(value);
    request.onsuccess?.({ target: request });
  });
  return request;
}

function createFakeIndexedDB() {
  const databases = new Map();

  class FakeObjectStore {
    constructor(store) {
      this.store = store;
    }

    createIndex() {
      return {};
    }

    delete(key) {
      this.store.records.delete(key);
      return createSuccessRequest(undefined);
    }

    get(key) {
      return createSuccessRequest(this.store.records.get(key));
    }

    getAll() {
      return createSuccessRequest([...this.store.records.values()]);
    }

    put(record) {
      const key = record[this.store.keyPath];
      this.store.records.set(key, clone(record));
      return createSuccessRequest(key);
    }
  }

  class FakeTransaction {
    constructor(entry) {
      this.entry = entry;
    }

    objectStore(storeName) {
      const store = this.entry.stores.get(storeName);
      if (!store) throw new Error(`Missing object store: ${storeName}`);
      return new FakeObjectStore(store);
    }
  }

  class FakeDatabase {
    constructor(entry) {
      this.entry = entry;
      this.objectStoreNames = {
        contains: (storeName) => this.entry.stores.has(storeName),
      };
    }

    close() {}

    createObjectStore(storeName, { keyPath }) {
      const store = { keyPath, records: new Map() };
      this.entry.stores.set(storeName, store);
      return new FakeObjectStore(store);
    }

    transaction(storeName) {
      return new FakeTransaction(this.entry, storeName);
    }
  }

  return {
    open(databaseName, version) {
      const request = { error: null, result: undefined };
      queueMicrotask(() => {
        let entry = databases.get(databaseName);
        const oldVersion = entry?.version ?? 0;
        const needsUpgrade = !entry || oldVersion < version;
        if (!entry) {
          entry = { stores: new Map(), version };
          databases.set(databaseName, entry);
        }
        entry.version = version;
        request.result = new FakeDatabase(entry);
        if (needsUpgrade) request.onupgradeneeded?.({ oldVersion, target: request });
        request.onsuccess?.({ target: request });
      });
      return request;
    },
  };
}

async function writeAuthoritySnapshot({ indexedDB, sessionId, slot, state }) {
  const journal = new IndexedDbAuthorityJournal({ indexedDB });
  await journal.putSnapshot({
    ledgerCursor: '9',
    savedAt: '2026-07-06T15:00:00.000Z',
    sessionId,
    slot,
    state,
  });
  await journal.close();
}

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
    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
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

  it('reports corrupt campaign data as unreadable instead of empty', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('gos-story-slot-0-campaign', '{bad-json');

    expect(loadCampaign(0)).toBeNull();

    const slot = listSaves()[0];
    expect(slot.isEmpty).toBe(false);
    expect(slot.isCorrupt).toBe(true);
  });

  it('restores campaign and season data from an authority snapshot', async () => {
    const indexedDB = createFakeIndexedDB();
    const state = createGameState();
    state.campaign.currentChapter = 4;
    state.campaign.currentSeason = 'winter';
    state.campaign.questLog.gus_tomatoes = { state: 'IN_PROGRESS' };
    state.season.chapter = 4;
    state.season.season = 'winter';
    localStorage.setItem(sessionPointerKey(0), 'session-restore');

    await writeAuthoritySnapshot({
      indexedDB,
      sessionId: 'session-restore',
      slot: 0,
      state,
    });

    const restored = await loadAuthoritySnapshotSave(0, { indexedDB, storage: localStorage });

    expect(restored.sessionId).toBe('session-restore');
    expect(restored.campaign.currentChapter).toBe(4);
    expect(restored.campaign.questLog.gus_tomatoes.state).toBe('IN_PROGRESS');
    expect(restored.season.season).toBe('winter');
  });

  it('lists an authority snapshot save when local campaign storage is empty', async () => {
    const indexedDB = createFakeIndexedDB();
    const state = createGameState();
    state.campaign.currentChapter = 2;
    state.campaign.currentSeason = 'summer';
    state.campaign.updatedAt = '2026-07-06T15:00:00.000Z';
    localStorage.setItem(sessionPointerKey(1), 'session-list');

    await writeAuthoritySnapshot({
      indexedDB,
      sessionId: 'session-list',
      slot: 1,
      state,
    });

    const saves = await listSavesWithAuthoritySnapshots({ indexedDB, storage: localStorage });

    expect(saves[1]).toMatchObject({
      chapter: 2,
      isCorrupt: false,
      isEmpty: false,
      season: 'summer',
      slot: 1,
    });
  });

  it('deleting a slot removes its authority snapshot pointer', () => {
    localStorage.setItem(sessionPointerKey(2), 'session-delete');

    deleteCampaign(2);

    expect(localStorage.getItem(sessionPointerKey(2))).toBeNull();
  });

  it('prefers newer local storage over a stale authority snapshot on restore', async () => {
    const indexedDB = createFakeIndexedDB();
    const authorityState = createGameState();
    authorityState.campaign.updatedAt = '2026-07-06T15:00:00.000Z';
    authorityState.campaign.worldState.currentZone = 'meadow';
    authorityState.campaign.worldState.forageState = { cooldowns: {}, history: {} };
    localStorage.setItem(sessionPointerKey(0), 'session-stale');

    await writeAuthoritySnapshot({
      indexedDB,
      sessionId: 'session-stale',
      slot: 0,
      state: authorityState,
    });

    const localState = createGameState();
    localState.campaign.updatedAt = '2026-07-06T15:05:00.000Z';
    localState.campaign.worldState.currentZone = 'meadow';
    localState.campaign.worldState.forageState = {
      cooldowns: { meadow_flowers: 1_783_363_000_000 },
      history: {
        meadow_flowers: {
          items: [{ count: 1, itemId: 'wildflower' }],
          timestamp: 1_783_363_000_000,
          xpGained: 20,
          zoneId: 'meadow',
        },
      },
    };
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(localState.campaign));

    const restored = await loadBestAvailableSave(0, { indexedDB, storage: localStorage });

    expect(restored.source).toBe('localStorage');
    expect(restored.campaign.worldState.forageState.history.meadow_flowers.zoneId).toBe('meadow');
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

    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
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

    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
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
