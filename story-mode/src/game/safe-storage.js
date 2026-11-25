/**
 * Safe localStorage access (H2, bug pass 2026-11-25).
 *
 * Inside a cross-origin iframe (mixmash.games/garden/) with third-party
 * storage blocked, Safari private mode, or a sandboxed frame, merely reading
 * `window.localStorage` can throw a SecurityError, and so can every
 * getItem / setItem / removeItem call. Story Mode must still boot and play,
 * so every storage access goes through this module:
 *
 * - Reads never throw; they return the fallback (null by default).
 * - When the real storage is missing or blocked, values go to an in-memory
 *   map for the rest of the page session, so saving and loading still work
 *   until the tab closes. A one-time `gos:storage-fallback` event lets the UI
 *   show a quiet notice.
 * - A quota (or any non-SecurityError) write failure is NOT a block: setItem
 *   returns false so callers can report the failed save, and nothing is
 *   silently moved to memory.
 *
 * The real storage is resolved on every call (not cached) so tests that stub
 * `globalThis.localStorage` keep working.
 */

const memory = new Map();
let fallbackActive = false;
let fallbackReason = null;

export const STORAGE_FALLBACK_EVENT = 'gos:storage-fallback';

function isQuotaError(error) {
  if (!error) return false;
  return error.name === 'QuotaExceededError'
    || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error.code === 22
    || error.code === 1014;
}

/** Browsers report blocked (not full) storage as a SecurityError. */
function isBlockedError(error) {
  return error?.name === 'SecurityError' || error?.code === 18;
}

function noteFallback(error) {
  if (fallbackActive) return;
  fallbackActive = true;
  fallbackReason = error?.name ?? error?.message ?? 'unavailable';
  try {
    console.info('[GOS] Browser storage is blocked here; saves will last until this tab closes.', fallbackReason);
  } catch { /* console may be missing */ }
  try {
    const target = globalThis.window ?? globalThis;
    const Ctor = globalThis.CustomEvent;
    if (typeof target?.dispatchEvent === 'function' && typeof Ctor === 'function') {
      target.dispatchEvent(new Ctor(STORAGE_FALLBACK_EVENT, { detail: { reason: fallbackReason } }));
    }
  } catch { /* notice is best effort */ }
}

function resolveStorage(resolver) {
  // Accessing the getter itself can throw (blocked third-party storage).
  const storage = resolver();
  if (!storage || typeof storage.getItem !== 'function') {
    const err = new Error('localStorage is unavailable');
    err.name = 'StorageUnavailable';
    throw err;
  }
  return storage;
}

/**
 * Build a never-throwing Storage-like wrapper around `resolver()`.
 * `resolver` defaults to the page's localStorage.
 */
export function createSafeStorage(resolver = () => globalThis.localStorage, { silentWhenMissing = false } = {}) {
  const onBlocked = (error) => {
    // Node / test environments simply have no localStorage; they still get the
    // memory store, but there is no player-facing notice to raise.
    if (silentWhenMissing && error?.name === 'StorageUnavailable') return;
    noteFallback(error);
  };
  return {
    getItem(key) {
      try {
        return resolveStorage(resolver).getItem(String(key));
      } catch (error) {
        onBlocked(error);
        const value = memory.get(String(key));
        return value === undefined ? null : value;
      }
    },
    setItem(key, value) {
      let storage;
      try {
        storage = resolveStorage(resolver);
      } catch (error) {
        onBlocked(error);
        memory.set(String(key), String(value));
        return true;
      }
      try {
        storage.setItem(String(key), String(value));
        return true;
      } catch (error) {
        if (isBlockedError(error)) {
          onBlocked(error);
          memory.set(String(key), String(value));
          return true;
        }
        // Quota or any other write failure: report it, do not hide it in memory.
        console.warn(isQuotaError(error) ? '[GOS] Storage is full:' : '[GOS] Storage write failed:', error?.message ?? error);
        return false;
      }
    },
    removeItem(key) {
      memory.delete(String(key));
      try {
        resolveStorage(resolver).removeItem(String(key));
      } catch (error) {
        onBlocked(error);
      }
      return true;
    },
    key(index) {
      try {
        return resolveStorage(resolver).key(index);
      } catch (error) {
        onBlocked(error);
        return Array.from(memory.keys())[index] ?? null;
      }
    },
    get length() {
      try {
        return resolveStorage(resolver).length;
      } catch (error) {
        onBlocked(error);
        return memory.size;
      }
    },
  };
}

/** Page-wide safe localStorage. Use this instead of `localStorage` directly. */
export const safeLocalStorage = createSafeStorage(() => globalThis.localStorage, { silentWhenMissing: true });

/**
 * Wrap a caller-supplied storage. Returns the page-wide safe storage when the
 * caller passed nothing, and null when the caller passed something that is not
 * a Storage (explicit opt-out).
 */
export function asSafeStorage(storage) {
  if (storage === undefined || storage === safeLocalStorage) return safeLocalStorage;
  if (!storage || typeof storage.getItem !== 'function') return null;
  if (storage === readGlobalLocalStorage()) return safeLocalStorage;
  return createSafeStorage(() => storage);
}

function readGlobalLocalStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function safeGetItem(key, fallback = null) {
  const value = safeLocalStorage.getItem(key);
  return value === null ? fallback : value;
}

export function safeSetItem(key, value) {
  return safeLocalStorage.setItem(key, value);
}

export function safeRemoveItem(key) {
  return safeLocalStorage.removeItem(key);
}

export function isStorageFallbackActive() {
  return fallbackActive;
}

/** Test-only: forget the memory store and the notice flag. */
export function resetSafeStorageForTests() {
  memory.clear();
  fallbackActive = false;
  fallbackReason = null;
}

/** `globalThis.indexedDB` can throw in a blocked or opaque-origin frame. */
export function readGlobalIndexedDB() {
  try { return globalThis.indexedDB; } catch { return undefined; }
}
