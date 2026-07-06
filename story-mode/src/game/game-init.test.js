// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Actions } from './store.js';
import { createGameState } from './state.js';
import { initGame, showTitleScreen } from './game-init.js';
import { loadAuthoritySnapshotSave } from './save.js';

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

function mountTitleScreenDom() {
  document.body.innerHTML = `
    <div id="title-screen" style="display:none;">
      <div id="title-modes"></div>
      <div id="save-slots"></div>
      <div id="title-actions">
        <button id="title-how-to-play" type="button">How to Play</button>
      </div>
    </div>
    <div id="viewport"></div>
  `;
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

function createFakeIndexedDB() {
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('confirm', vi.fn(() => true));
  localStorage.clear();
  mountTitleScreenDom();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('game-init title screen', () => {
  it('switches between story and free play without duplicating the free-play start button', () => {
    const onStart = vi.fn();

    showTitleScreen(onStart);
    showTitleScreen(onStart);

    expect(document.querySelectorAll('.freeplay-start-btn')).toHaveLength(1);

    document.querySelector('[data-mode="freeplay"]').click();

    expect(document.getElementById('save-slots').style.display).toBe('none');
    expect(document.querySelector('.freeplay-start-btn').style.display).toBe('');
  });

  it('launches sandbox free play from the title screen', async () => {
    const onStart = vi.fn();

    showTitleScreen(onStart);
    document.querySelector('[data-mode="freeplay"]').click();
    document.querySelector('.freeplay-start-btn').click();
    await vi.runAllTimersAsync();

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        slot: -1,
        sandbox: true,
        initialState: expect.objectContaining({
          campaign: expect.objectContaining({
            sandbox: true,
            currentChapter: 99,
          }),
        }),
      }),
    );
  });
});

describe('game-init persistence', () => {
  it('stores runtime saves in IndexedDB and leaves localStorage as a session pointer', async () => {
    const indexedDB = createFakeIndexedDB();
    vi.stubGlobal('indexedDB', indexedDB);

    const initialState = createGameState();
    const { cleanup, persistGameState, store } = initGame(initialState, { slot: 0 });

    store.dispatch({
      type: Actions.SET_ACTIVE_TOOL,
      payload: { toolId: 'inspect' },
    });
    await persistGameState(store.getState());

    expect(localStorage.getItem('gos-story-slot-0-campaign')).toBeNull();
    expect(localStorage.getItem('gos-story-slot-0-season')).toBeNull();
    expect(localStorage.getItem('gos-story-authority-session-0')).toMatch(/[a-z0-9-]+/i);

    const restored = await loadAuthoritySnapshotSave(0, { indexedDB, storage: localStorage });
    expect(restored.campaign.currentChapter).toBe(initialState.campaign.currentChapter);
    expect(restored.season.activeTool).toBe('inspect');

    cleanup();
  });

  it('falls back to localStorage runtime saves when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', null);

    const { cleanup, persistGameState, store } = initGame(createGameState(), { slot: 1 });
    store.dispatch({
      type: Actions.SET_ACTIVE_TOOL,
      payload: { toolId: 'plant' },
    });
    await persistGameState(store.getState());

    expect(localStorage.getItem('gos-story-slot-1-campaign')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('gos-story-slot-1-season')).activeTool).toBe('plant');
    expect(localStorage.getItem('gos-story-authority-session-1')).toBeNull();

    cleanup();
  });
});
