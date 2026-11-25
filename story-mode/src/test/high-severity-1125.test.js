// @vitest-environment jsdom
/**
 * Regression tests for the Garden OS high-severity bug pass (2026-11-25):
 * H2 blocked storage, H3 save-derived markup, H4 non-array save fields,
 * H5 service-worker navigation fallback.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STORAGE_FALLBACK_EVENT,
  isStorageFallbackActive,
  resetSafeStorageForTests,
  safeLocalStorage,
} from '../game/safe-storage.js';
import {
  awardKeepsake,
  deleteCampaign,
  getActiveSaveSlot,
  hasSaveTarget,
  listSaves,
  loadBestAvailableSave,
  loadCampaign,
  loadSeasonState,
  migrateCampaignSave,
  pushJournalEntry,
  saveCampaign,
  saveSeasonState,
  setActiveSaveSlot,
  writeSlotSave,
} from '../game/save.js';
import { createGameState, createSandboxState } from '../game/state.js';
import { initGame, showTitleScreen } from '../game/game-init.js';
import { IndexedDbAuthorityJournal, ensureSessionPointer } from '../engine/authority-cache.js';
import { createOverlayScreens } from '../ui/overlay-screens.js';
import { renderSessionError } from '../ui/session-error.js';
import { showStorageFallbackNotice } from '../ui/storage-notice.js';

const REPO_ROOT = resolve(__dirname, '../../..');
const XSS = '<img src=x onerror="window.__gosXss=1">';

function securityError() {
  const error = new Error('The operation is insecure.');
  error.name = 'SecurityError';
  return error;
}

/** A localStorage whose getter AND every method throw, as in a blocked iframe. */
function stubBlockedLocalStorage() {
  const throwing = {
    getItem: vi.fn(() => { throw securityError(); }),
    setItem: vi.fn(() => { throw securityError(); }),
    removeItem: vi.fn(() => { throw securityError(); }),
    key: vi.fn(() => { throw securityError(); }),
    clear: vi.fn(() => { throw securityError(); }),
    get length() { throw securityError(); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw securityError(); },
  });
  return throwing;
}

function createMemoryStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

let originalDescriptor;

beforeEach(() => {
  originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  resetSafeStorageForTests();
  delete window.__gosXss;
});

afterEach(() => {
  if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  resetSafeStorageForTests();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function mountTitleScreenDom() {
  document.body.innerHTML = `
    <div id="title-screen" style="display:none;">
      <div id="title-modes"></div>
      <div id="save-slots"></div>
      <div id="title-actions"><button id="title-how-to-play" type="button">How to Play</button></div>
    </div>
    <div id="viewport"></div>
    <div id="overlay-container"></div>`;
}

describe('H2: storage that throws on every call', () => {
  it('never throws from the save API and keeps saves in memory for the tab', () => {
    stubBlockedLocalStorage();
    const onFallback = vi.fn();
    window.addEventListener(STORAGE_FALLBACK_EVENT, onFallback);

    expect(() => getActiveSaveSlot()).not.toThrow();
    expect(getActiveSaveSlot()).toBe(0);
    expect(() => setActiveSaveSlot(2)).not.toThrow();
    expect(getActiveSaveSlot()).toBe(2);
    expect(hasSaveTarget(0)).toBe(false);
    expect(listSaves()).toHaveLength(3);
    expect(listSaves().every((entry) => entry.isEmpty)).toBe(true);

    const state = createGameState();
    state.campaign.currency.balance = 42;
    expect(saveCampaign(state.campaign, 1)).toBeTruthy();
    expect(saveSeasonState(state.season, 1)).toBeTruthy();
    expect(loadCampaign(1).currency.balance).toBe(42);
    expect(loadSeasonState(1)).toBeTruthy();
    expect(hasSaveTarget(1)).toBe(true);
    expect(listSaves()[1].isEmpty).toBe(false);

    expect(writeSlotSave(0, { campaign: state.campaign, season: state.season }).ok).toBe(true);
    expect(() => deleteCampaign(0)).not.toThrow();
    expect(loadCampaign(0)).toBeNull();

    expect(isStorageFallbackActive()).toBe(true);
    expect(onFallback).toHaveBeenCalledTimes(1);
    window.removeEventListener(STORAGE_FALLBACK_EVENT, onFallback);
  });

  it('loadBestAvailableSave resolves when both storage and IndexedDB are blocked', async () => {
    stubBlockedLocalStorage();
    const indexedDB = { open: () => { throw securityError(); } };
    const result = await loadBestAvailableSave(0, { indexedDB });
    expect(result.source).toBe('empty');
  });

  it('still reports a real write failure (quota) instead of hiding it', () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      const error = new Error('quota');
      error.name = 'QuotaExceededError';
      throw error;
    };
    vi.stubGlobal('localStorage', storage);
    expect(safeLocalStorage.setItem('k', 'v')).toBe(false);
    expect(isStorageFallbackActive()).toBe(false);
  });

  it('boots the title screen and starts Story when storage is blocked', async () => {
    vi.useFakeTimers();
    stubBlockedLocalStorage();
    vi.stubGlobal('confirm', vi.fn(() => true));
    mountTitleScreenDom();
    const onStart = vi.fn();
    expect(() => showTitleScreen(onStart)).not.toThrow();
    expect(document.querySelectorAll('.save-slot-card')).toHaveLength(3);
    expect(document.querySelector('.freeplay-start-btn').textContent).toBe('Start Free Play');

    document.querySelector('[data-mode="freeplay"]').click();
    document.querySelector('.freeplay-start-btn').click();
    await vi.runAllTimersAsync();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0].slot).toBe('freeplay');
  });

  it('shows one quiet text-only notice', () => {
    expect(showStorageFallbackNotice({ durationMs: 0 })).toBeTruthy();
    expect(showStorageFallbackNotice({ durationMs: 0 })).toBeNull();
    const notice = document.getElementById('gos-storage-notice');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toMatch(/until you close this tab/);
    expect(parseFloat(notice.style.font)).toBeGreaterThanOrEqual(12);
  });

  it('ensureSessionPointer works on blocked storage', () => {
    stubBlockedLocalStorage();
    const id = ensureSessionPointer(0);
    expect(id).toBeTruthy();
    expect(ensureSessionPointer(0)).toBe(id);
  });
});

describe('H2: IndexedDB failures are non-fatal', () => {
  it('does not cache a rejected open, and retries next time', async () => {
    let calls = 0;
    const indexedDB = {
      open() {
        calls += 1;
        if (calls === 1) throw securityError();
        const request = {};
        queueMicrotask(() => {
          request.result = {
            objectStoreNames: { contains: () => true },
            close() {},
          };
          request.onsuccess?.();
        });
        return request;
      },
    };
    const journal = new IndexedDbAuthorityJournal({ indexedDB });
    await expect(journal.open()).rejects.toThrow(/insecure/);
    expect(journal.openPromise).toBeNull();
    await expect(journal.open()).resolves.toBeTruthy();
    expect(calls).toBe(2);
    await expect(journal.close()).resolves.toBeUndefined();
  });

  it('rejects instead of hanging when the open is blocked, and close() never throws', async () => {
    const indexedDB = {
      open() {
        const request = {};
        queueMicrotask(() => request.onblocked?.());
        return request;
      },
    };
    const journal = new IndexedDbAuthorityJournal({ indexedDB });
    await expect(journal.open()).rejects.toThrow(/blocked/);
    await expect(journal.close()).resolves.toBeUndefined();
  });

  it('initGame falls back to local saves when IndexedDB cannot be opened', async () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('indexedDB', { open: () => { throw securityError(); } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = createGameState();
    state.campaign.currency.balance = 77;
    const session = initGame(state, { slot: 1 });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(loadCampaign(1)?.currency.balance).toBe(77);
    session.cleanup();
    warn.mockRestore();
  });
});

describe('gos-bed.js with blocked storage', () => {
  it('lists beds and estimates usage without throwing', () => {
    const source = readFileSync(resolve(REPO_ROOT, 'gos-bed.js'), 'utf8');
    const global = {
      console,
      Date,
      Math,
      JSON,
      crypto: globalThis.crypto,
      sessionStorage: undefined,
      setTimeout,
      clearTimeout,
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(global, 'localStorage', { get() { throw securityError(); } });
    global.window = global;
    global.self = global;
    global.globalThis = global;
    vm.createContext(global);
    vm.runInContext(source, global);
    const api = global.GosBed;
    expect(api).toBeTruthy();
    expect(api.readAll()).toEqual([]);
    expect(api.estimateStorageUsage().usedBytes).toBe(0);
  });
});

describe('H3: save-derived strings never become markup', () => {
  it('renders a crafted save on the title screen as text', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', createMemoryStorage());
    mountTitleScreenDom();
    const state = createGameState();
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify({
      ...state.campaign,
      currentSeason: XSS,
      journalEntries: [
        { chapter: `1${XSS}`, grade: `"><script>window.__gosXss=1</script>`, score: XSS, season: 'spring' },
      ],
    }));
    showTitleScreen(vi.fn());
    const slots = document.getElementById('save-slots');
    expect(slots.querySelector('img')).toBeNull();
    expect(slots.querySelector('script')).toBeNull();
    expect(slots.querySelectorAll('.sparkline-dot')).toHaveLength(1);
    expect(slots.querySelector('.sparkline-dot').getAttribute('title')).toContain('<script>');
    expect(slots.textContent).toContain('Score <img');
    expect(window.__gosXss).toBeUndefined();
  });

  it('shows err.stack as text on the session error screen', () => {
    const host = document.createElement('div');
    const err = new Error(XSS);
    err.stack = `Error: ${XSS}\n    at <script>bad()</script>`;
    renderSessionError(host, err);
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('pre').textContent).toContain(XSS);
  });

  it('escapes the season-complete overlay', () => {
    document.body.innerHTML = '<div id="overlay-container"></div>';
    const state = createGameState();
    state.campaign.currentChapter = XSS;
    state.season.season = XSS;
    const screens = createOverlayScreens({
      scene: {},
      getState: () => state,
      setGameInputEnabled: vi.fn(),
      phaseRouter: { doAdvance: vi.fn() },
    });
    screens.openSeasonTransition();
    const overlay = document.getElementById('season-transition-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('img')).toBeNull();
    expect(overlay.textContent).not.toContain('undefined');
    expect(overlay.textContent).toMatch(/Chapter 1 Complete/);
  });
});

describe('H4: non-array save fields', () => {
  const malformed = () => ({
    ...createGameState().campaign,
    keepsakes: 'x',
    journalEntries: { 0: { grade: 'A' } },
    completedChapters: 5,
    recipesCompleted: null,
    seasonHistory: 'nope',
    seenCutsceneIds: {},
    cropsUnlocked: 'basil',
    currentChapter: '3',
    currentSeason: 7,
  });

  it('normalizeCampaignSave coerces every array field', () => {
    const campaign = migrateCampaignSave(malformed());
    expect(campaign.keepsakes).toEqual([]);
    expect(campaign.journalEntries).toEqual([]);
    expect(campaign.completedChapters).toEqual([]);
    expect(campaign.recipesCompleted).toEqual([]);
    expect(campaign.seasonHistory).toEqual([]);
    expect(campaign.seenCutsceneIds).toEqual([]);
    expect(campaign.cropsUnlocked).toBeUndefined();
    expect(campaign.currentChapter).toBe(3);
    expect(campaign.currentSeason).toBe('fall');
    expect(migrateCampaignSave({ ...malformed(), keepsakes: [null, 'id', { id: 'k1' }] }).keepsakes).toEqual([{ id: 'k1' }]);
  });

  it('awardKeepsake and pushJournalEntry survive a non-array field', () => {
    const campaign = { keepsakes: 'x', journalEntries: {} };
    expect(awardKeepsake(campaign, 'first_harvest')?.id).toBe('first_harvest');
    expect(() => pushJournalEntry(campaign, { chapter: 1, season: 'spring', score: 3, grade: 'B' })).not.toThrow();
    expect(campaign.journalEntries).toHaveLength(1);
    expect(() => pushJournalEntry(campaign, null)).not.toThrow();
  });

  it('a stored malformed save lists and loads', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    localStorage.setItem('gos-story-slot-2-campaign', JSON.stringify(malformed()));
    const entry = listSaves()[2];
    expect(entry.isEmpty).toBe(false);
    expect(entry.gradeHistory).toEqual([]);
    expect(loadCampaign(2).keepsakes).toEqual([]);
  });

  function harvestCtx(state, overrides = {}) {
    return {
      scene: {},
      closePanelSheets: vi.fn(),
      getState: () => state,
      setGameInputEnabled: vi.fn(),
      updateHUD: vi.fn(),
      hudScore: null,
      finalizeHarvestProgression: vi.fn(),
      getKeepsakeById: (id) => (id ? { id, name: id } : null),
      getKeepsakeSlots: () => [],
      getRecipeById: () => null,
      getCropById: () => null,
      showBackpack: vi.fn(),
      persistState: vi.fn(),
      produceState: vi.fn(() => ({ advanced: false })),
      phaseRouter: { handleNarrativeTrigger: vi.fn() },
      ...overrides,
    };
  }

  it('harvest reveal opens with non-array keepsakes and continue re-enables input', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="overlay-container"></div>';
    const state = createGameState();
    state.campaign.keepsakes = 'x';
    state.season.newlyEarnedKeepsakes = null;
    state.season.harvestResult = {
      grade: 'B',
      score: 3,
      recipeMatches: [],
      yieldList: [],
      cellScores: [],
      occupiedCount: 0,
      details: { diversityBonus: 0, recipeBonus: 0, fillPenalty: 0, uniqueCrops: 0, fillRatio: 0 },
    };
    const ctx = harvestCtx(state);
    const error = vi.spyOn(console, 'error');
    expect(() => createOverlayScreens(ctx).openHarvestReveal()).not.toThrow();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    const overlay = document.querySelector('.harvest-reveal-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.dataset.keepsakeCount ?? overlay.querySelector('[data-keepsake-count]')?.dataset.keepsakeCount).toBe('0');
    // Continue: input comes back even though nothing advanced.
    ctx.persistState.mockImplementation(() => { throw new Error('persist failed'); });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    overlay.querySelector('#harvest-continue').click();
    vi.advanceTimersByTime(400);
    quiet.mockRestore();
    expect(ctx.setGameInputEnabled).toHaveBeenCalledWith(true);
  });

  it('harvest re-enables input when the reveal throws', () => {
    document.body.innerHTML = '<div id="overlay-container"></div>';
    const state = createGameState();
    state.season.harvestResult = { grade: 'B', score: 3, recipeMatches: [] };
    const ctx = harvestCtx(state, {
      finalizeHarvestProgression: vi.fn(() => { throw new TypeError('keepsakes.find is not a function'); }),
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => createOverlayScreens(ctx).openHarvestReveal()).not.toThrow();
    expect(ctx.setGameInputEnabled).toHaveBeenCalledWith(true);
    error.mockRestore();
  });
});

describe('H5: service worker navigation fallback', () => {
  const SW_URL = 'https://davehomeassist.github.io/garden-os/sw.js';

  function loadServiceWorker({ cached = {}, fetchImpl } = {}) {
    const listeners = {};
    const stores = new Map();
    const keyOf = (input) => new URL(typeof input === 'string' ? input : input.url, SW_URL).href.split('?')[0];
    for (const [path, body] of Object.entries(cached)) stores.set(keyOf(path), body);
    const cacheApi = {
      put: vi.fn(async (req, res) => { stores.set(keyOf(req), await res.text()); }),
    };
    const deleted = [];
    const caches = {
      open: vi.fn(async () => cacheApi),
      match: vi.fn(async (req) => {
        const body = stores.get(keyOf(req));
        return body === undefined ? undefined : new Response(body, { headers: { 'Content-Type': 'text/html' } });
      }),
      keys: vi.fn(async () => ['garden-os-2026-09-20-integrity-sprint', 'other-app']),
      delete: vi.fn(async (k) => { deleted.push(k); return true; }),
    };
    const self = {
      location: new URL(SW_URL),
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: vi.fn(async () => {}),
      clients: { claim: vi.fn(async () => {}) },
    };
    const RequestImpl = class extends Request {
      constructor(input, init) { super(new URL(input, SW_URL).href, init); }
    };
    const context = {
      self,
      caches,
      fetch: fetchImpl ?? vi.fn(async () => { throw new TypeError('Failed to fetch'); }),
      Request: RequestImpl,
      Response,
      URL,
      Promise,
      console: { warn: vi.fn(), log: console.log },
    };
    vm.createContext(context);
    vm.runInContext(readFileSync(resolve(REPO_ROOT, 'sw.js'), 'utf8'), context);
    return { listeners, caches, cacheApi, deleted, self, context };
  }

  async function navigate(sw, path) {
    let responded;
    sw.listeners.fetch({
      request: {
        url: new URL(path, SW_URL).href,
        method: 'GET',
        mode: 'navigate',
        headers: new Headers({ accept: 'text/html' }),
      },
      respondWith: (p) => { responded = p; },
    });
    return responded;
  }

  it('serves cached Story Mode, never the planner, for an offline Story navigation', async () => {
    const sw = loadServiceWorker({ cached: { 'index.html': 'PLANNER', 'story-mode/': 'STORY' } });
    const res = await navigate(sw, '/garden-os/story-mode/?embed=1');
    expect(await res.text()).toBe('STORY');
  });

  it('shows an offline Story page (not the planner) when Story Mode was never cached', async () => {
    const sw = loadServiceWorker({ cached: { 'index.html': 'PLANNER' } });
    const res = await navigate(sw, '/garden-os/story-mode/');
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toMatch(/Story Mode is offline/);
    expect(text).not.toContain('PLANNER');
  });

  it('keeps the planner fallback for planner pages', async () => {
    const sw = loadServiceWorker({ cached: { 'index.html': 'PLANNER' } });
    const res = await navigate(sw, '/garden-os/some-missing-page');
    expect(await res.text()).toBe('PLANNER');
  });

  it('installs even when one precache asset fails, and purges old caches on activate', async () => {
    const fetchImpl = vi.fn(async (req) => (
      String(req.url ?? req).includes('brand-guide.html')
        ? new Response('missing', { status: 404 })
        : new Response('ok', { status: 200 })
    ));
    const sw = loadServiceWorker({ fetchImpl });
    let installPromise;
    sw.listeners.install({ waitUntil: (p) => { installPromise = p; } });
    await installPromise;
    expect(sw.self.skipWaiting).toHaveBeenCalled();
    expect(sw.cacheApi.put.mock.calls.length).toBeGreaterThan(30);
    expect(sw.context.console.warn).toHaveBeenCalled();

    let activatePromise;
    sw.listeners.activate({ waitUntil: (p) => { activatePromise = p; } });
    await activatePromise;
    expect(sw.deleted).toEqual(['garden-os-2026-09-20-integrity-sprint']);
  });
});
