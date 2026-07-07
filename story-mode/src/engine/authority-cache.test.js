import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import {
  IndexedDbAuthorityJournal,
  AUTHORITY_URL_KEY,
  authorityAckToStoreAction,
  buildAuthorityEnvelope,
  createAuthoritySession,
  createStoryAuthorityPersistence,
  drainAuthorityQueue,
  resolveAuthorityUrl,
  verifyAuthorityAck,
} from './authority-cache.js';

const NOW = Date.parse('2026-07-06T15:00:00.000Z');

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createLocalStorage() {
  let store = {};
  return {
    clear() {
      store = {};
    },
    getItem(key) {
      return store[key] ?? null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
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
    getRaw(databaseName, storeName, key) {
      return databases.get(databaseName)?.stores.get(storeName)?.records.get(key);
    },
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
    putRaw(databaseName, storeName, key, value) {
      const store = databases.get(databaseName)?.stores.get(storeName);
      if (!store) throw new Error(`Missing raw object store: ${storeName}`);
      store.records.set(key, clone(value));
    },
  };
}

function ackFor(envelope) {
  return {
    accepted: true,
    actionId: envelope.id,
    checksum: 'checksum-after-action',
    serverTime: '2026-07-06T15:00:01.000Z',
    sessionId: envelope.sessionId,
    signature: 'hmac-sha256:test',
    stateVersion: 1,
    tick: 1,
  };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authority IndexedDB cache', () => {
  it('resolves authority URL from operator settings, runtime globals, and meta tags', () => {
    const storage = createLocalStorage();
    const document = {
      querySelector: (selector) => (
        selector === 'meta[name="garden-os-authority-url"]'
          ? { getAttribute: () => 'https://meta-authority.example.test/' }
          : null
      ),
    };
    const globalScope = { GARDEN_OS_AUTHORITY_URL: 'https://runtime-authority.example.test/' };

    expect(resolveAuthorityUrl({
      authorityUrl: 'https://explicit-authority.example.test/',
      document,
      globalScope,
      storage,
    })).toBe('https://explicit-authority.example.test');

    storage.setItem(AUTHORITY_URL_KEY, 'https://stored-authority.example.test/');
    expect(resolveAuthorityUrl({ document, globalScope, storage })).toBe('https://stored-authority.example.test');

    storage.clear();
    expect(resolveAuthorityUrl({ document, globalScope, storage })).toBe('https://runtime-authority.example.test');

    expect(resolveAuthorityUrl({ document, globalScope: {}, storage })).toBe('https://meta-authority.example.test');
  });

  it('maps accepted authority patches back into safe store actions', () => {
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.PLANT_CROP,
      authoritativePatch: {
        data: {
          lastPlanting: { cellIndex: 2, cropId: 'basil' },
        },
      },
    }, createGameState())).toEqual({
      meta: { authorityAck: true },
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    });

    const alreadyPlanted = createGameState();
    alreadyPlanted.season.grid[2].cropId = 'basil';
    alreadyPlanted.season.grid[2].damageState = null;
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.PLANT_CROP,
      authoritativePatch: {
        data: {
          lastPlanting: { cellIndex: 2, cropId: 'basil' },
        },
      },
    }, alreadyPlanted)).toBeNull();

    const removeReady = createGameState();
    removeReady.season.grid[2].cropId = 'basil';
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.REMOVE_CROP,
      authoritativePatch: {
        data: {
          lastRemoval: {
            cellIndex: 2,
            cropId: 'basil',
            removedAt: NOW,
          },
        },
      },
    }, removeReady)).toEqual({
      meta: { authorityAck: true },
      payload: { cellIndex: 2, cropId: 'basil', removedAt: NOW },
      type: Actions.REMOVE_CROP,
    });

    const alreadyRemoved = createGameState();
    alreadyRemoved.season.grid[2].cropId = null;
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.REMOVE_CROP,
      authoritativePatch: {
        data: {
          lastRemoval: {
            cellIndex: 2,
            cropId: 'basil',
            removedAt: NOW,
          },
        },
      },
    }, alreadyRemoved)).toBeNull();

    const mismatchedRemoval = createGameState();
    mismatchedRemoval.season.grid[2].cropId = 'radish';
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.REMOVE_CROP,
      authoritativePatch: {
        data: {
          lastRemoval: {
            cellIndex: 2,
            cropId: 'basil',
            removedAt: NOW,
          },
        },
      },
    }, mismatchedRemoval)).toBeNull();

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.WATER_CELL,
      authoritativePatch: {
        data: {
          lastWatering: {
            cellIndex: 2,
            interventionBonus: 0.3,
            wateredAt: NOW,
          },
        },
      },
    }, createGameState())).toEqual({
      meta: { authorityAck: true },
      payload: { bonus: 0.3, cellIndex: 2, wateredAt: NOW },
      type: Actions.WATER_CELL,
    });

    const alreadyWatered = createGameState();
    alreadyWatered.season.grid[2].interventionBonus = 0.3;
    alreadyWatered.season.grid[2].lastWateredAt = NOW;
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.WATER_CELL,
      authoritativePatch: {
        data: {
          lastWatering: {
            cellIndex: 2,
            interventionBonus: 0.3,
            wateredAt: NOW,
          },
        },
      },
    }, alreadyWatered)).toBeNull();

    const harvestReady = createGameState();
    harvestReady.season.grid[2].cropId = 'basil';
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.HARVEST_CELL,
      authoritativePatch: {
        data: {
          lastHarvesting: {
            cellIndex: 2,
            cropId: 'basil',
            harvestedAt: NOW,
            yieldCount: 1,
          },
        },
      },
    }, harvestReady)).toEqual({
      meta: { authorityAck: true },
      payload: {
        cellIndex: 2,
        cropId: 'basil',
        harvestedAt: NOW,
        yieldCount: 1,
      },
      type: Actions.HARVEST_CELL,
    });

    const alreadyHarvested = createGameState();
    alreadyHarvested.season.grid[2].cropId = null;
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.HARVEST_CELL,
      authoritativePatch: {
        data: {
          lastHarvesting: {
            cellIndex: 2,
            cropId: 'basil',
            harvestedAt: NOW,
            yieldCount: 1,
          },
        },
      },
    }, alreadyHarvested)).toBeNull();

    const mismatchedHarvest = createGameState();
    mismatchedHarvest.season.grid[2].cropId = 'radish';
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.HARVEST_CELL,
      authoritativePatch: {
        data: {
          lastHarvesting: {
            cellIndex: 2,
            cropId: 'basil',
            harvestedAt: NOW,
            yieldCount: 1,
          },
        },
      },
    }, mismatchedHarvest)).toBeNull();

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.SET_SELECTED_CROP,
      authoritativePatch: { data: { selectedCropId: 'basil' } },
    })).toEqual({
      meta: { authorityAck: true },
      payload: { cropId: 'basil' },
      type: Actions.SET_SELECTED_CROP,
    });

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.SET_ACTIVE_TOOL,
      authoritativePatch: { data: { activeTool: 'water' } },
    })).toEqual({
      meta: { authorityAck: true },
      payload: { toolId: 'water' },
      type: Actions.SET_ACTIVE_TOOL,
    });

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.SET_COOLDOWN,
      authoritativePatch: {
        data: {
          lastCooldown: {
            cellIndex: 2,
            key: 'water_2',
            toolId: 'water',
            until: NOW + 5_000,
          },
        },
      },
    }, createGameState())).toEqual({
      meta: { authorityAck: true },
      payload: {
        cellIndex: 2,
        key: 'water_2',
        toolId: 'water',
        until: NOW + 5_000,
      },
      type: Actions.SET_COOLDOWN,
    });

    const alreadyCooledDown = createGameState();
    alreadyCooledDown.season.toolCooldowns.water_2 = NOW + 5_000;
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.SET_COOLDOWN,
      authoritativePatch: {
        data: {
          lastCooldown: {
            cellIndex: 2,
            key: 'water_2',
            toolId: 'water',
            until: NOW + 5_000,
          },
        },
      },
    }, alreadyCooledDown)).toBeNull();

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.SET_ACTIVE_TOOL,
      authoritativePatch: {
        data: {
          activeTool: 'water',
          currentZone: 'player_plot',
          selectedCropId: null,
          visitedZones: ['player_plot'],
        },
      },
    })).toEqual({
      meta: { authorityAck: true },
      payload: { toolId: 'water' },
      type: Actions.SET_ACTIVE_TOOL,
    });

    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.ZONE_CHANGED,
      authoritativePatch: {
        data: {
          currentZone: 'meadow',
          lastSpawnPoint: { x: -6, z: 0 },
          visitedZones: ['player_plot', 'meadow'],
        },
      },
    }, createGameState())).toEqual({
      meta: { authorityAck: true },
      payload: { spawnPoint: { x: -6, z: 0 }, toZone: 'meadow' },
      type: Actions.ZONE_CHANGED,
    });

    const alreadyInMeadow = createGameState();
    alreadyInMeadow.campaign.worldState.currentZone = 'meadow';
    alreadyInMeadow.campaign.worldState.visitedZones = ['player_plot', 'meadow'];
    alreadyInMeadow.campaign.worldState.lastSpawnPoint = { x: -6, z: 0 };
    expect(authorityAckToStoreAction({
      accepted: true,
      actionType: Actions.ZONE_CHANGED,
      authoritativePatch: {
        data: {
          currentZone: 'meadow',
          lastSpawnPoint: { x: -6, z: 0 },
          visitedZones: ['player_plot', 'meadow'],
        },
      },
    }, alreadyInMeadow)).toBeNull();

    expect(authorityAckToStoreAction({
      accepted: false,
      authoritativePatch: { data: { selectedCropId: 'basil' } },
    })).toBeNull();
  });

  it('persists snapshots and deletes corrupt cached snapshots', async () => {
    const indexedDB = createFakeIndexedDB();
    const journal = new IndexedDbAuthorityJournal({ databaseName: 'snapshot-test', indexedDB });

    await journal.putSnapshot({
      ledgerCursor: '4',
      savedAt: '2026-07-06T15:00:00.000Z',
      sessionId: 'session-1',
      slot: 0,
      state: { selectedCropId: 'basil' },
    });

    const loaded = await journal.readSnapshot('session-1');
    expect(loaded).toMatchObject({
      ledgerCursor: '4',
      sessionId: 'session-1',
      state: { selectedCropId: 'basil' },
    });

    indexedDB.putRaw('snapshot-test', 'snapshots', 'session-1', {
      key: 'session-1',
      sessionId: 'session-1',
      state: null,
    });

    await expect(journal.readSnapshot('session-1')).resolves.toBeNull();
    expect(indexedDB.getRaw('snapshot-test', 'snapshots', 'session-1')).toBeUndefined();
  });

  it('keeps offline outbound actions pending, then drains each action once', async () => {
    const indexedDB = createFakeIndexedDB();
    const journal = new IndexedDbAuthorityJournal({ databaseName: 'drain-test', indexedDB });
    const envelope = buildAuthorityEnvelope(
      { payload: { cropId: 'basil' }, type: Actions.SET_SELECTED_CROP },
      {},
      { clientSeq: 1, now: () => NOW, sessionId: 'session-2' },
    );

    await journal.enqueueAction(envelope);
    await journal.enqueueAction(envelope);
    expect(await journal.listPendingActions('session-2')).toHaveLength(1);

    const offline = await drainAuthorityQueue({
      authorityUrl: 'https://authority.example.test',
      fetchFn: async () => {
        throw new Error('offline');
      },
      journal,
      now: () => NOW,
      sessionId: 'session-2',
    });
    expect(offline).toMatchObject({ acked: 0, online: false, sent: 0 });
    expect(await journal.listPendingActions('session-2')).toHaveLength(1);

    let actionCalls = 0;
    let verifyCalls = 0;
    const fetchFn = async (url) => {
      if (url.endsWith('/ack/verify')) {
        verifyCalls += 1;
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({ ack: ackFor(envelope), ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };

    const drained = await drainAuthorityQueue({
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      journal,
      now: () => NOW,
      sessionId: 'session-2',
    });
    expect(drained).toMatchObject({ acked: 1, online: true, sent: 1 });
    expect(await journal.listPendingActions('session-2')).toHaveLength(0);
    expect(await journal.listAcks('session-2')).toHaveLength(1);
    expect(actionCalls).toBe(1);
    expect(verifyCalls).toBe(1);

    await drainAuthorityQueue({
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      journal,
      now: () => NOW,
      sessionId: 'session-2',
    });
    expect(actionCalls).toBe(1);
    expect(verifyCalls).toBe(1);
  });

  it('leaves actions pending when server ack verification fails', async () => {
    const indexedDB = createFakeIndexedDB();
    const journal = new IndexedDbAuthorityJournal({ databaseName: 'verify-fail-test', indexedDB });
    const envelope = buildAuthorityEnvelope(
      { payload: { toolId: 'water' }, type: Actions.SET_ACTIVE_TOOL },
      {},
      { clientSeq: 1, now: () => NOW, sessionId: 'session-verify-fail' },
    );

    await journal.enqueueAction(envelope);

    const drained = await drainAuthorityQueue({
      authorityUrl: 'https://authority.example.test',
      fetchFn: async (url) => {
        if (url.endsWith('/ack/verify')) {
          return new Response(JSON.stringify({ ok: false, verified: false }), {
            headers: { 'Content-Type': 'application/json' },
            status: 422,
          });
        }
        return new Response(JSON.stringify({ ack: ackFor(envelope), ok: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      },
      journal,
      now: () => NOW,
      sessionId: 'session-verify-fail',
    });

    expect(drained).toMatchObject({ acked: 0, sent: 1, verificationFailed: true });
    expect(await journal.listPendingActions('session-verify-fail')).toHaveLength(1);
    expect(await journal.listAcks('session-verify-fail')).toHaveLength(0);
  });

  it('supports injected ack verification for local authority tests', async () => {
    const ack = ackFor({ id: 'action-injected', sessionId: 'session-injected' });

    await expect(verifyAuthorityAck(ack, {
      verifyAck: async (candidate) => candidate.actionId === 'action-injected',
    })).resolves.toBe(true);
    await expect(verifyAuthorityAck({ ...ack, signature: 'local-test' }, {
      verifyAck: async () => true,
    })).resolves.toBe(false);
  });

  it('creates a configured authority session before draining queued actions', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    const calls = [];
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push({ body, url });
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          authoritativePatch: { data: { activeTool: 'water' } },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.SET_ACTIVE_TOOL,
      payload: { toolId: 'water' },
    });
    await persistence.flush();

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual(['/session', '/action', '/ack/verify']);
    expect(calls[0].body).toEqual({ sessionId: persistence.sessionId });
    expect(store.getState().season.activeTool).toBe('water');

    persistence.cleanup();
  });

  it('surfaces configured authority session failures and leaves queued actions pending', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      error: 'AUTHORITY_STORE_UNCONFIGURED',
      ok: false,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    }));
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.SET_SELECTED_CROP,
      payload: { cropId: 'basil' },
    });
    await persistence.flush();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('https://authority.example.test/session');
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(1);

    persistence.cleanup();
  });

  it('posts authority session requests and validates the returned session id', async () => {
    const fetchFn = vi.fn(async (url, init) => {
      expect(url).toBe('https://authority.example.test/session');
      expect(JSON.parse(init.body)).toEqual({ sessionId: 'session-post' });
      return new Response(JSON.stringify({
        ok: true,
        session: { sessionId: 'session-post', tick: 0 },
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    });

    await expect(createAuthoritySession({
      authorityUrl: 'https://authority.example.test/',
      fetchFn,
      sessionId: 'session-post',
    })).resolves.toMatchObject({ sessionId: 'session-post' });
  });

  it('mirrors live store snapshots and queues routed actions without blocking render', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    const persistence = createStoryAuthorityPersistence(store, {
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    expect(persistence.sessionId).toBe(storage.getItem('gos-story-authority-session-0'));

    store.dispatch({
      type: Actions.SET_SELECTED_CROP,
      payload: { cropId: 'basil' },
    });

    await persistence.flush();
    const snapshot = await persistence.journal.readSnapshot(persistence.sessionId);
    const pending = await persistence.journal.listPendingActions(persistence.sessionId);

    expect(snapshot.state.selectedCropId).toBe('basil');
    expect(pending).toHaveLength(1);
    expect(pending[0].envelope.payload).toEqual({ cropId: 'basil' });

    persistence.cleanup();
  });

  it('flushes an explicit snapshot even when cleanup follows immediately', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    const persistence = createStoryAuthorityPersistence(store, {
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    const nextState = {
      ...store.getState(),
      selectedCropId: 'shutdown-basil',
    };

    const savePromise = persistence.saveSnapshot(nextState);
    persistence.cleanup();
    await savePromise;

    const snapshot = await persistence.journal.readSnapshot(persistence.sessionId);
    expect(snapshot.state.selectedCropId).toBe('shutdown-basil');
  });

  it('reconciles configured authority acks back into the live store once', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    let fetchCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      fetchCalls += 1;
      const envelope = body;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(envelope),
          actionType: envelope.type,
          authoritativePatch: { data: { selectedCropId: 'server-basil' } },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.SET_SELECTED_CROP,
      payload: { cropId: 'optimistic-basil' },
    });
    await persistence.flush();
    await persistence.flush();

    expect(fetchCalls).toBe(1);
    expect(store.getState().selectedCropId).toBe('server-basil');
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);
    expect(await persistence.journal.listAcks(persistence.sessionId)).toHaveLength(1);

    persistence.cleanup();
  });

  it('queues zone changes and skips duplicate server zone reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              currentZone: body.payload.toZone,
              lastSpawnPoint: body.payload.spawnPoint,
              visitedZones: ['player_plot', body.payload.toZone],
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.ZONE_CHANGED,
      payload: { spawnPoint: { x: -6, z: 0 }, toZone: 'meadow' },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().campaign.worldState.currentZone).toBe('meadow');
    expect(store.getState().campaign.worldState.visitedZones).toEqual(['player_plot', 'meadow']);
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });

  it('queues plant crop gameplay actions and skips duplicate server reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              lastPlanting: {
                cellIndex: body.payload.cellIndex,
                cropId: body.payload.cropId,
              },
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.PLANT_CROP,
      payload: { cellIndex: 2, cropId: 'basil' },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().season.grid[2].cropId).toBe('basil');
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });

  it('queues remove crop gameplay actions and skips duplicate server reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const initialState = createGameState();
    initialState.season.grid[2].cropId = 'basil';
    const store = new Store(initialState);
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              lastRemoval: {
                cellIndex: body.payload.cellIndex,
                cropId: body.payload.cropId,
                removedAt: body.payload.removedAt,
              },
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.REMOVE_CROP,
      payload: { cellIndex: 2, cropId: 'basil', removedAt: NOW },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().season.grid[2].cropId).toBeNull();
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });

  it('queues water cell gameplay actions and skips duplicate server reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const initialState = createGameState();
    initialState.season.grid[2].cropId = 'basil';
    const store = new Store(initialState);
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              lastWatering: {
                cellIndex: body.payload.cellIndex,
                interventionBonus: body.payload.bonus,
                wateredAt: body.payload.wateredAt,
              },
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.WATER_CELL,
      payload: { bonus: 0.3, cellIndex: 2, wateredAt: NOW },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().season.grid[2].interventionBonus).toBe(0.3);
    expect(store.getState().season.grid[2].lastWateredAt).toBe(NOW);
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });

  it('queues harvest cell gameplay actions and skips duplicate server reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const initialState = createGameState();
    initialState.season.grid[2].cropId = 'basil';
    const store = new Store(initialState);
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              lastHarvesting: {
                cellIndex: body.payload.cellIndex,
                cropId: 'basil',
                harvestedAt: body.payload.harvestedAt,
                yieldCount: 1,
              },
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.HARVEST_CELL,
      payload: { cellIndex: 2, cropId: 'basil', harvestedAt: NOW },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().season.grid[2].cropId).toBeNull();
    expect(store.getState().campaign.inventory.slots.some((slot) => slot?.itemId === 'basil')).toBe(true);
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });

  it('queues cooldown gameplay actions and skips duplicate server reconciliation', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    let actionCalls = 0;
    const fetchFn = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/session')) {
        return new Response(JSON.stringify({
          ok: true,
          session: { ledgerCursor: '0', sessionId: body.sessionId, tick: 0 },
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      if (url.endsWith('/ack/verify')) {
        return new Response(JSON.stringify({ ok: true, verified: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      actionCalls += 1;
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(body),
          actionType: body.type,
          authoritativePatch: {
            data: {
              lastCooldown: {
                cellIndex: body.payload.cellIndex,
                key: body.payload.key,
                toolId: body.payload.toolId,
                until: body.payload.until,
              },
            },
          },
        },
        ok: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    };
    const persistence = createStoryAuthorityPersistence(store, {
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      indexedDB,
      now: () => NOW,
      slot: 0,
      storage,
    });

    await persistence.flush();
    store.dispatch({
      type: Actions.SET_COOLDOWN,
      payload: {
        cellIndex: 2,
        key: 'water_2',
        toolId: 'water',
        until: NOW + 5_000,
      },
    });
    await persistence.flush();

    expect(actionCalls).toBe(1);
    expect(store.getState().season.toolCooldowns.water_2).toBe(NOW + 5_000);
    expect(await persistence.journal.listPendingActions(persistence.sessionId)).toHaveLength(0);

    persistence.cleanup();
  });
});
