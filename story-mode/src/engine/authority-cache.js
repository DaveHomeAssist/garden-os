import { createActionEnvelope } from './authoritative-engine.js';

const DB_NAME = 'gos-story-authority-v1';
const DB_VERSION = 1;
const STORES = {
  ACKS: 'acks',
  META: 'meta',
  OUTBOUND: 'outbound',
  SNAPSHOTS: 'snapshots',
};
const SESSION_POINTER_PREFIX = 'gos-story-authority-session';
const AUTHORITY_URL_KEY = 'gos-story-authority-url';
const ROUTED_ACTION_TYPES = new Set(['SET_ACTIVE_TOOL', 'SET_SELECTED_CROP']);
const MAX_DRAIN_ACTIONS = 20;

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

function isoNow(now = Date.now) {
  const value = typeof now === 'function' ? now() : now;
  return new Date(value).toISOString();
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionStore(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function storeKey(sessionId, id) {
  return `${sessionId}:${id}`;
}

function isValidSnapshot(record, sessionId) {
  return (
    record
    && record.sessionId === sessionId
    && record.state
    && typeof record.state === 'object'
  );
}

function getStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === 'function' ? storage : null;
}

function getGlobalIndexedDB(indexedDB = globalThis.indexedDB) {
  return indexedDB && typeof indexedDB.open === 'function' ? indexedDB : null;
}

function sessionPointerKey(slot) {
  return `${SESSION_POINTER_PREFIX}-${slot}`;
}

function randomSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function ensureSessionPointer(slot, storage = globalThis.localStorage) {
  const safeStorage = getStorage(storage);
  const key = sessionPointerKey(slot);
  const existing = safeStorage?.getItem(key);
  if (existing) return existing;
  const sessionId = randomSessionId();
  safeStorage?.setItem(key, sessionId);
  return sessionId;
}

function resolveAuthorityUrl({ authorityUrl, storage = globalThis.localStorage } = {}) {
  if (typeof authorityUrl === 'string' && authorityUrl.trim()) return authorityUrl.replace(/\/$/, '');
  const configured = getStorage(storage)?.getItem(AUTHORITY_URL_KEY);
  return configured ? configured.replace(/\/$/, '') : null;
}

function isAuthorityRoutedAction(action) {
  return ROUTED_ACTION_TYPES.has(action?.type);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildAuthorityEnvelope(action, state, {
  clientSeq,
  now = Date.now,
  sessionId,
} = {}) {
  return createActionEnvelope({
    clientSentAt: isoNow(now),
    clientSeq,
    expectedTick: state?.authorityTick,
    id: `${sessionId}:${clientSeq}:${action.type}`,
    idempotencyKey: `${sessionId}:${clientSeq}:${action.type}`,
    payload: action.payload ?? {},
    sessionId,
    type: action.type,
  });
}

function authorityAckToStoreAction(ack) {
  if (!ack?.accepted) return null;
  const data = ack.authoritativePatch?.data;
  if (!data || typeof data !== 'object') return null;

  if (hasOwn(data, 'selectedCropId')) {
    return {
      meta: { authorityAck: true },
      payload: { cropId: typeof data.selectedCropId === 'string' ? data.selectedCropId : null },
      type: 'SET_SELECTED_CROP',
    };
  }

  if (hasOwn(data, 'activeTool')) {
    return {
      meta: { authorityAck: true },
      payload: { toolId: typeof data.activeTool === 'string' ? data.activeTool : null },
      type: 'SET_ACTIVE_TOOL',
    };
  }

  return null;
}

class IndexedDbAuthorityJournal {
  constructor({ databaseName = DB_NAME, indexedDB = globalThis.indexedDB } = {}) {
    this.databaseName = databaseName;
    this.indexedDB = getGlobalIndexedDB(indexedDB);
    this.openPromise = null;
  }

  get available() {
    return Boolean(this.indexedDB);
  }

  async open() {
    if (!this.indexedDB) {
      throw new Error('IndexedDB is unavailable');
    }
    if (!this.openPromise) {
      this.openPromise = new Promise((resolve, reject) => {
        const request = this.indexedDB.open(this.databaseName, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const storeName of Object.values(STORES)) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'key' });
            }
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    }
    return this.openPromise;
  }

  async close() {
    if (!this.openPromise) return;
    const db = await this.openPromise;
    db.close?.();
    this.openPromise = null;
  }

  async putSnapshot({ ledgerCursor = '0', savedAt = isoNow(), sessionId, slot, state }) {
    if (!sessionId || !state) return null;
    const db = await this.open();
    const record = {
      key: sessionId,
      ledgerCursor,
      savedAt,
      sessionId,
      slot,
      state: cloneValue(state),
    };
    await requestResult(transactionStore(db, STORES.SNAPSHOTS, 'readwrite').put(record));
    return cloneValue(record);
  }

  async readSnapshot(sessionId) {
    if (!sessionId) return null;
    const db = await this.open();
    const store = transactionStore(db, STORES.SNAPSHOTS, 'readwrite');
    const record = await requestResult(store.get(sessionId));
    if (!record) return null;
    if (!isValidSnapshot(record, sessionId)) {
      await requestResult(store.delete(sessionId));
      return null;
    }
    return cloneValue(record);
  }

  async enqueueAction(envelope, { queuedAt = isoNow() } = {}) {
    if (!envelope?.sessionId || !envelope?.id) return null;
    const db = await this.open();
    const store = transactionStore(db, STORES.OUTBOUND, 'readwrite');
    const key = storeKey(envelope.sessionId, envelope.idempotencyKey ?? envelope.id);
    const existing = await requestResult(store.get(key));
    if (existing?.status === 'acked') return cloneValue(existing);
    const record = {
      ...(existing ?? {}),
      actionId: envelope.id,
      attempts: existing?.attempts ?? 0,
      envelope: cloneValue(envelope),
      idempotencyKey: envelope.idempotencyKey ?? envelope.id,
      key,
      queuedAt: existing?.queuedAt ?? queuedAt,
      sessionId: envelope.sessionId,
      status: 'pending',
    };
    await requestResult(store.put(record));
    return cloneValue(record);
  }

  async listPendingActions(sessionId) {
    const db = await this.open();
    const records = await requestResult(transactionStore(db, STORES.OUTBOUND).getAll());
    return records
      .filter((record) => record.sessionId === sessionId && record.status === 'pending')
      .sort((left, right) => (
        (left.envelope?.clientSeq ?? 0) - (right.envelope?.clientSeq ?? 0)
        || String(left.queuedAt).localeCompare(String(right.queuedAt))
      ))
      .map((record) => cloneValue(record));
  }

  async markActionAcked(record, ack, { ackedAt = isoNow() } = {}) {
    const db = await this.open();
    const outbound = {
      ...record,
      ackedAt,
      attempts: (record.attempts ?? 0) + 1,
      status: 'acked',
    };
    const ackRecord = {
      ack: cloneValue(ack),
      ackedAt,
      actionId: ack.actionId,
      key: storeKey(ack.sessionId, ack.actionId),
      sessionId: ack.sessionId,
    };
    await requestResult(transactionStore(db, STORES.OUTBOUND, 'readwrite').put(outbound));
    await requestResult(transactionStore(db, STORES.ACKS, 'readwrite').put(ackRecord));
    return cloneValue(ackRecord);
  }

  async recordAttempt(record, { attemptedAt = isoNow() } = {}) {
    const db = await this.open();
    const updated = {
      ...record,
      attempts: (record.attempts ?? 0) + 1,
      lastAttemptAt: attemptedAt,
    };
    await requestResult(transactionStore(db, STORES.OUTBOUND, 'readwrite').put(updated));
    return cloneValue(updated);
  }

  async listAcks(sessionId) {
    const db = await this.open();
    const records = await requestResult(transactionStore(db, STORES.ACKS).getAll());
    return records
      .filter((record) => record.sessionId === sessionId)
      .sort((left, right) => String(left.ackedAt).localeCompare(String(right.ackedAt)))
      .map((record) => cloneValue(record));
  }
}

async function drainAuthorityQueue({
  authorityUrl,
  fetchFn = globalThis.fetch,
  journal,
  maxActions = MAX_DRAIN_ACTIONS,
  now = Date.now,
  onAck,
  sessionId,
} = {}) {
  const url = resolveAuthorityUrl({ authorityUrl });
  if (!url || typeof fetchFn !== 'function' || !journal || !sessionId) {
    return { sent: 0, acked: 0, pending: 0, online: false };
  }

  const pending = (await journal.listPendingActions(sessionId)).slice(0, maxActions);
  let sent = 0;
  let acked = 0;

  for (const record of pending) {
    sent += 1;
    let response;
    try {
      response = await fetchFn(`${url}/action`, {
        body: JSON.stringify(record.envelope),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    } catch {
      return { sent: sent - 1, acked, pending: pending.length - acked, online: false };
    }

    const body = await response.json().catch(() => null);
    if (!body?.ack || body.ack.actionId !== record.actionId) {
      await journal.recordAttempt(record, { attemptedAt: isoNow(now) });
      return { sent, acked, pending: pending.length - acked, online: response.ok };
    }

    await journal.markActionAcked(record, body.ack, { ackedAt: isoNow(now) });
    if (onAck) await onAck(body.ack, record);
    acked += 1;
  }

  return { sent, acked, pending: Math.max(0, pending.length - acked), online: true };
}

function createStoryAuthorityPersistence(store, {
  authorityUrl,
  fetchFn = globalThis.fetch,
  indexedDB = globalThis.indexedDB,
  now = Date.now,
  slot = 0,
  storage = globalThis.localStorage,
} = {}) {
  const journal = new IndexedDbAuthorityJournal({ indexedDB });
  if (!store?.subscribe || slot < 0 || !journal.available) {
    return { cleanup() {}, drain: async () => ({ sent: 0, acked: 0, pending: 0, online: false }), journal: null };
  }

  let active = true;
  let clientSeq = 0;
  let chain = Promise.resolve();
  const sessionId = ensureSessionPointer(slot, storage);
  const resolvedAuthorityUrl = resolveAuthorityUrl({ authorityUrl, storage });

  async function reconcileAck(ack) {
    const action = authorityAckToStoreAction(ack);
    if (action) store.dispatch(action);
  }

  function enqueue(work) {
    chain = chain
      .then(() => (active ? work() : null))
      .catch((error) => {
        console.warn('[GOS] Authority cache unavailable:', error?.message ?? error);
      });
    return chain;
  }

  function persistState(state, action = null) {
    return enqueue(async () => {
      await journal.putSnapshot({
        ledgerCursor: String(state?.authorityTick ?? 0),
        savedAt: isoNow(now),
        sessionId,
        slot,
        state,
      });

      if (isAuthorityRoutedAction(action) && action?.meta?.authorityAck !== true) {
        clientSeq += 1;
        const envelope = buildAuthorityEnvelope(action, state, { clientSeq, now, sessionId });
        await journal.enqueueAction(envelope, { queuedAt: isoNow(now) });
        if (resolvedAuthorityUrl) {
          await drainAuthorityQueue({
            authorityUrl: resolvedAuthorityUrl,
            fetchFn,
            journal,
            now,
            onAck: reconcileAck,
            sessionId,
          });
        }
      }
    });
  }

  void persistState(store.getState());
  const unsubscribe = store.subscribe((state, action) => {
    if (action?.meta?.persist === false) return;
    void persistState(state, action);
  });

  return {
    cleanup() {
      active = false;
      unsubscribe();
      void journal.close();
    },
    drain() {
      return enqueue(() => drainAuthorityQueue({
        authorityUrl: resolvedAuthorityUrl,
        fetchFn,
        journal,
        now,
        onAck: reconcileAck,
        sessionId,
      }));
    },
    flush() {
      return chain;
    },
    journal,
    sessionId,
  };
}

export {
  AUTHORITY_URL_KEY,
  DB_NAME,
  IndexedDbAuthorityJournal,
  authorityAckToStoreAction,
  buildAuthorityEnvelope,
  createStoryAuthorityPersistence,
  drainAuthorityQueue,
  ensureSessionPointer,
  isAuthorityRoutedAction,
  sessionPointerKey,
};
