import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import {
  IndexedDbAuthorityJournal,
  authorityAckToStoreAction,
  buildAuthorityEnvelope,
  createStoryAuthorityPersistence,
  drainAuthorityQueue,
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
  it('maps accepted authority patches back into safe store actions', () => {
    expect(authorityAckToStoreAction({
      accepted: true,
      authoritativePatch: { data: { selectedCropId: 'basil' } },
    })).toEqual({
      meta: { authorityAck: true },
      payload: { cropId: 'basil' },
      type: Actions.SET_SELECTED_CROP,
    });

    expect(authorityAckToStoreAction({
      accepted: true,
      authoritativePatch: { data: { activeTool: 'water' } },
    })).toEqual({
      meta: { authorityAck: true },
      payload: { toolId: 'water' },
      type: Actions.SET_ACTIVE_TOOL,
    });

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

    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
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

    await drainAuthorityQueue({
      authorityUrl: 'https://authority.example.test',
      fetchFn,
      journal,
      now: () => NOW,
      sessionId: 'session-2',
    });
    expect(calls).toBe(1);
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

  it('reconciles configured authority acks back into the live store once', async () => {
    const indexedDB = createFakeIndexedDB();
    const storage = createLocalStorage();
    const store = new Store(createGameState());
    let fetchCalls = 0;
    const fetchFn = async (_url, init) => {
      fetchCalls += 1;
      const envelope = JSON.parse(init.body);
      return new Response(JSON.stringify({
        ack: {
          ...ackFor(envelope),
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
});
