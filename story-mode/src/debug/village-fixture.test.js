// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSandboxState } from '../game/state.js';
import { initGame } from '../game/game-init.js';
import { loadBestAvailableSave } from '../game/save.js';
import { getCurrencyBalance } from '../game/village/village-economy.js';
import { getInventoryItemCount } from '../game/inventory.js';
import {
  createVillageFixtureState,
  seedVillageFixture,
  VILLAGE_FIXTURE_DEFAULTS,
} from './village-fixture.js';

function count(inventoryState, itemId) {
  return inventoryState.slots.filter(Boolean).filter((slot) => slot.itemId === itemId)
    .reduce((sum, slot) => sum + (slot.count ?? 1), 0);
}

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

/** Same shape as game-init.test.js, with an optional gate that holds put()s. */
function createFakeIndexedDB({ holdPuts } = {}) {
  const databases = new Map();

  class FakeObjectStore {
    constructor(store) {
      this.store = store;
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
      const write = () => {
        const key = record[this.store.keyPath];
        this.store.records.set(key, clone(record));
        return key;
      };
      // Hold only the prior 100-coin snapshot so a late flush can overwrite
      // a 200-coin fixture if seedVillageFixture does not wait first.
      const balance = record?.state?.campaign?.currency?.balance;
      if (holdPuts?.current && balance === 100) {
        const request = { error: null, result: undefined };
        holdPuts.current.then(() => {
          request.result = write();
          request.onsuccess?.({ target: request });
        });
        return request;
      }
      return createSuccessRequest(write());
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

    transaction() {
      return new FakeTransaction(this.entry);
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

describe('village fixture save', () => {
  it('is a Free Play save with coins to spend and scraps for one or more compost batches', () => {
    const state = createVillageFixtureState();
    expect(state.campaign.sandbox).toBe(true);
    expect(state.campaign.currency.balance).toBe(VILLAGE_FIXTURE_DEFAULTS.tokens);
    expect(state.campaign.tokens).toBe(0);
    expect(count(state.campaign.inventory, 'dried_leaves')).toBe(4);
    expect(count(state.campaign.inventory, 'plant_matter')).toBe(2);
    expect(count(state.campaign.inventory, 'watering_can')).toBe(1);
  });

  it('accepts overrides', () => {
    const state = createVillageFixtureState({ tokens: 5, driedLeaves: 0 });
    expect(state.campaign.currency.balance).toBe(5);
    expect(count(state.campaign.inventory, 'dried_leaves')).toBe(0);
  });
});

describe('seedVillageFixture persistence', () => {
  const holdPuts = { current: null };

  beforeEach(() => {
    holdPuts.current = null;
    localStorage.clear();
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ holdPuts }));
  });

  afterEach(() => {
    holdPuts.current = null;
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('writes 200 coins and compost scraps that Continue loads back', async () => {
    await seedVillageFixture();
    const saved = await loadBestAvailableSave('freeplay');
    expect(getCurrencyBalance(saved.campaign)).toBe(200);
    expect(getInventoryItemCount(saved.campaign.inventory, 'dried_leaves')).toBe(4);
    expect(getInventoryItemCount(saved.campaign.inventory, 'plant_matter')).toBe(2);
    expect(saved.campaign.playerProfile.displayName).toBe('Village fixture');
  });

  it('waits for a prior session flush so a late 100-coin snapshot cannot overwrite the fixture', async () => {
    const priorState = createSandboxState();
    priorState.campaign.currency.balance = 100;
    const prior = initGame(priorState, { slot: 'freeplay' });
    await prior.persistGameState();

    let release;
    holdPuts.current = new Promise((resolve) => { release = resolve; });
    void prior.persistGameState();
    prior.cleanup();

    const seeded = seedVillageFixture();
    // Release the late 100-coin snapshot after the fixture has had a chance
    // to either wait (correct) or write 200 first (the CI race).
    await new Promise((resolve) => setTimeout(resolve, 30));
    release();
    await seeded;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const saved = await loadBestAvailableSave('freeplay');
    expect(getCurrencyBalance(saved.campaign)).toBe(200);
    expect(getInventoryItemCount(saved.campaign.inventory, 'dried_leaves')).toBe(4);
  });
});
