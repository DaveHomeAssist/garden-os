/**
 * Save System — Multi-slot localStorage persistence.
 * 3 independent save slots, each storing campaign + season state.
 */
import {
  CAMPAIGN_SCHEMA_VERSION,
  DEFAULT_CONTENT_PACK_STATE,
  DEFAULT_CURRENCY_STATE,
  DEFAULT_MARKET_STATE,
  DEFAULT_REPUTATION,
  DEFAULT_WORLD_STATE,
} from './state.js';
import {
  IndexedDbAuthorityJournal,
  sessionPointerKey,
} from '../engine/authority-cache.js';
import { normalizePlayerProfile } from '../data/player-profile.js';

const SAVE_SLOTS = 3;
const ACTIVE_SLOT_KEY = 'gos-story-active-slot';
const corruptCampaignSlots = new Set();
const corruptSeasonSlots = new Set();

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 0 && slot < SAVE_SLOTS;
}

function campaignKey(slot) {
  return `gos-story-slot-${slot}-campaign`;
}

function seasonKey(slot) {
  return `gos-story-slot-${slot}-season`;
}

function normalizeCampaignSave(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    ...parsed,
    version: CAMPAIGN_SCHEMA_VERSION,
    playerProfile: normalizePlayerProfile(parsed.playerProfile),
    questLog: parsed.questLog ?? {},
    choiceLog: parsed.choiceLog ?? {},
    storyLog: Array.isArray(parsed.storyLog) ? [...parsed.storyLog] : [],
    reputation: { ...DEFAULT_REPUTATION, ...(parsed.reputation ?? {}) },
    zoneReputation: { ...(parsed.zoneReputation ?? {}) },
    worldState: {
      ...DEFAULT_WORLD_STATE,
      ...(parsed.worldState ?? {}),
      visitedZones: [...new Set(parsed.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones)],
    },
    currency: {
      ...DEFAULT_CURRENCY_STATE,
      ...(parsed.currency ?? {}),
      ledger: Array.isArray(parsed.currency?.ledger) ? [...parsed.currency.ledger] : [],
    },
    market: {
      ...DEFAULT_MARKET_STATE,
      ...(parsed.market ?? {}),
      priceHistory: Array.isArray(parsed.market?.priceHistory) ? [...parsed.market.priceHistory].slice(-3) : [],
      transactions: Array.isArray(parsed.market?.transactions) ? [...parsed.market.transactions] : [],
    },
    contentPacks: {
      ...DEFAULT_CONTENT_PACK_STATE,
      ...(parsed.contentPacks ?? {}),
      loaded: Array.isArray(parsed.contentPacks?.loaded) ? [...parsed.contentPacks.loaded] : [],
      rejected: Array.isArray(parsed.contentPacks?.rejected) ? [...parsed.contentPacks.rejected] : [],
    },
    contentProvenance: Array.isArray(parsed.contentProvenance) ? [...parsed.contentProvenance] : [],
    beds: parsed.beds ?? {},
    activeBedId: parsed.activeBedId ?? 'player_plot',
    biomeCropsUnlocked: Array.isArray(parsed.biomeCropsUnlocked)
      ? [...parsed.biomeCropsUnlocked]
      : [],
    gameMode: parsed.gameMode ?? 'story',
  };
}

function normalizeSeasonSave(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (Array.isArray(parsed?.grid)) {
    return {
      ...parsed,
      grid: {
        cells: parsed.grid,
        cols: parsed.gridCols ?? 8,
        rows: parsed.gridRows ?? 4,
      },
    };
  }
  return parsed;
}

function getSessionPointer(slot, storage = globalThis.localStorage) {
  if (!isValidSlot(slot) || !storage?.getItem) return null;
  return storage.getItem(sessionPointerKey(slot));
}

function deleteAuthoritySessionPointer(slot, storage = globalThis.localStorage) {
  if (!isValidSlot(slot) || !storage?.removeItem) return;
  storage.removeItem(sessionPointerKey(slot));
}

function savedAtMs(value) {
  const ms = Date.parse(value ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

function campaignSavedAtMs(campaign) {
  return savedAtMs(campaign?.updatedAt ?? campaign?.createdAt);
}

function snapshotSavedAtMs(snapshot) {
  return savedAtMs(
    snapshot?.savedAt
      ?? snapshot?.state?.campaign?.updatedAt
      ?? snapshot?.state?.campaign?.createdAt,
  );
}

function buildSaveEntry(slot, campaign, { isCorrupt = false } = {}) {
  if (!campaign) {
    return { slot, campaign: null, isEmpty: !isCorrupt, isCorrupt };
  }

  const seasonOrder = ['spring', 'summer', 'fall', 'winter'];
  const seasonIdx = ((campaign.currentChapter - 1) % 4);
  const season = campaign.currentSeason ?? seasonOrder[seasonIdx] ?? 'spring';
  const lastEntry = (campaign.journalEntries ?? []).slice(-1)[0] ?? null;
  return {
    slot,
    campaign,
    playerProfile: normalizePlayerProfile(campaign.playerProfile),
    isEmpty: false,
    isCorrupt,
    chapter: campaign.currentChapter,
    season,
    seasonEmoji: SEASON_EMOJIS[season] ?? '🌱',
    score: lastEntry?.score ?? 0,
    grade: lastEntry?.grade ?? null,
    updatedAt: campaign.updatedAt ?? campaign.createdAt,
    activeQuests: Object.values(campaign.questLog ?? {}).filter((entry) => (
      entry?.state === 'ACCEPTED' || entry?.state === 'IN_PROGRESS'
    )).length,
    zonesVisited: (campaign.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones).length,
    gradeHistory: (campaign.journalEntries ?? []).map((e) => ({
      chapter: e.chapter,
      grade: e.grade,
    })),
  };
}

export function getActiveSaveSlot() {
  const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
  const slot = raw !== null ? parseInt(raw, 10) : 0;
  return slot >= 0 && slot < SAVE_SLOTS ? slot : 0;
}

export function setActiveSaveSlot(slot) {
  localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
}

export function saveCampaign(campaign, slot) {
  if (!campaign || !isValidSlot(slot)) return null;
  const worldState = {
    ...DEFAULT_WORLD_STATE,
    ...(campaign.worldState ?? {}),
    visitedZones: [...new Set(campaign.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones)],
  };
  const toSave = {
    ...campaign,
    version: CAMPAIGN_SCHEMA_VERSION,
    playerProfile: normalizePlayerProfile(campaign.playerProfile),
    questLog: { ...(campaign.questLog ?? {}) },
    choiceLog: { ...(campaign.choiceLog ?? {}) },
    storyLog: Array.isArray(campaign.storyLog) ? [...campaign.storyLog] : [],
    reputation: { ...DEFAULT_REPUTATION, ...(campaign.reputation ?? {}) },
    zoneReputation: { ...(campaign.zoneReputation ?? {}) },
    worldState,
    currency: {
      ...DEFAULT_CURRENCY_STATE,
      ...(campaign.currency ?? {}),
      ledger: Array.isArray(campaign.currency?.ledger) ? [...campaign.currency.ledger] : [],
    },
    market: {
      ...DEFAULT_MARKET_STATE,
      ...(campaign.market ?? {}),
      priceHistory: Array.isArray(campaign.market?.priceHistory) ? [...campaign.market.priceHistory].slice(-3) : [],
      transactions: Array.isArray(campaign.market?.transactions) ? [...campaign.market.transactions] : [],
    },
    contentPacks: {
      ...DEFAULT_CONTENT_PACK_STATE,
      ...(campaign.contentPacks ?? {}),
      loaded: Array.isArray(campaign.contentPacks?.loaded) ? [...campaign.contentPacks.loaded] : [],
      rejected: Array.isArray(campaign.contentPacks?.rejected) ? [...campaign.contentPacks.rejected] : [],
    },
    contentProvenance: Array.isArray(campaign.contentProvenance) ? [...campaign.contentProvenance] : [],
    beds: campaign.beds ?? {},
    activeBedId: campaign.activeBedId ?? 'player_plot',
    biomeCropsUnlocked: Array.isArray(campaign.biomeCropsUnlocked)
      ? [...campaign.biomeCropsUnlocked]
      : [],
    gameMode: campaign.gameMode ?? 'story',
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(campaignKey(slot), JSON.stringify(toSave));
    corruptCampaignSlots.delete(slot);
    return toSave;
  } catch (e) {
    console.warn('[GOS] Save failed:', e.message);
    return null;
  }
}

export function loadCampaign(slot) {
  if (!isValidSlot(slot)) return null;
  try {
    const raw = localStorage.getItem(campaignKey(slot));
    if (!raw) {
      corruptCampaignSlots.delete(slot);
      return null;
    }
    const parsed = JSON.parse(raw);
    return normalizeCampaignSave(parsed);
  } catch (error) {
    corruptCampaignSlots.add(slot);
    console.warn('[GOS] Campaign save unreadable:', error?.message ?? error);
    return null;
  }
}

export function deleteCampaign(slot) {
  localStorage.removeItem(campaignKey(slot));
  localStorage.removeItem(seasonKey(slot));
  deleteAuthoritySessionPointer(slot);
  corruptCampaignSlots.delete(slot);
  corruptSeasonSlots.delete(slot);
}

export function saveSeasonState(season, slot) {
  if (!season || !isValidSlot(slot)) return null;
  try {
    // Save a copy without the circular campaign reference
    const toSave = {
      ...season,
      campaign: undefined,
      grid: {
        cells: Array.isArray(season.grid) ? season.grid : (season.grid?.cells ?? []),
        cols: season.gridCols ?? season.grid?.cols ?? 8,
        rows: season.gridRows ?? season.grid?.rows ?? 4,
      },
    };
    localStorage.setItem(seasonKey(slot), JSON.stringify(toSave));
    corruptSeasonSlots.delete(slot);
    return toSave;
  } catch (e) {
    console.warn('[GOS] Season save failed:', e.message);
    return null;
  }
}

export function loadSeasonState(slot) {
  if (!isValidSlot(slot)) return null;
  try {
    const raw = localStorage.getItem(seasonKey(slot));
    if (!raw) {
      corruptSeasonSlots.delete(slot);
      return null;
    }
    const parsed = JSON.parse(raw);
    return normalizeSeasonSave(parsed);
  } catch (error) {
    corruptSeasonSlots.add(slot);
    console.warn('[GOS] Season save unreadable:', error?.message ?? error);
    return null;
  }
}

const SEASON_EMOJIS = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };

export async function loadAuthoritySnapshotSave(slot, {
  indexedDB = globalThis.indexedDB,
  storage = globalThis.localStorage,
} = {}) {
  const sessionId = getSessionPointer(slot, storage);
  if (!sessionId) return null;
  const journal = new IndexedDbAuthorityJournal({ indexedDB });
  if (!journal.available) return null;

  try {
    const snapshot = await journal.readSnapshot(sessionId);
    if (!snapshot?.state) return null;
    return {
      campaign: normalizeCampaignSave(snapshot.state.campaign),
      season: normalizeSeasonSave(snapshot.state.season),
      sessionId,
      snapshot,
    };
  } catch (error) {
    console.warn('[GOS] Authority snapshot unreadable:', error?.message ?? error);
    return null;
  } finally {
    await journal.close().catch(() => {});
  }
}

export async function listSavesWithAuthoritySnapshots(options = {}) {
  const authoritySaves = {};
  await Promise.all(Array.from({ length: SAVE_SLOTS }, async (_entry, slot) => {
    const authority = await loadAuthoritySnapshotSave(slot, options);
    if (authority?.campaign) authoritySaves[slot] = authority.campaign;
  }));
  return listSaves({ authoritySaves });
}

export async function loadBestAvailableSave(slot, options = {}) {
  const localCampaign = loadCampaign(slot);
  const authority = await loadAuthoritySnapshotSave(slot, options);

  if (!authority?.campaign) {
    return {
      campaign: localCampaign,
      season: localCampaign ? loadSeasonState(slot) : null,
      source: localCampaign ? 'localStorage' : 'empty',
    };
  }

  if (!localCampaign || campaignSavedAtMs(localCampaign) <= snapshotSavedAtMs(authority.snapshot)) {
    return {
      campaign: authority.campaign,
      season: authority.season,
      source: 'authority',
    };
  }

  return {
    campaign: localCampaign,
    season: loadSeasonState(slot),
    source: 'localStorage',
  };
}

export function listSaves({ authoritySaves = {} } = {}) {
  const saves = [];
  for (let slot = 0; slot < SAVE_SLOTS; slot++) {
    const rawCampaign = localStorage.getItem(campaignKey(slot));
    const campaign = loadCampaign(slot) ?? authoritySaves[slot] ?? null;
    if (!campaign) {
      const hasPointer = Boolean(getSessionPointer(slot));
      const isCorrupt = rawCampaign !== null || corruptCampaignSlots.has(slot) || hasPointer;
      saves.push(buildSaveEntry(slot, null, { isCorrupt }));
    } else {
      const rawSeason = localStorage.getItem(seasonKey(slot));
      const seasonCorrupt = rawSeason !== null && loadSeasonState(slot) === null;
      saves.push(buildSaveEntry(slot, campaign, { isCorrupt: seasonCorrupt }));
    }
  }
  return saves;
}

export function awardKeepsake(campaign, keepsakeId, meta = {}) {
  if (!campaign.keepsakes) {
    campaign.keepsakes = [];
  }
  const existing = campaign.keepsakes.find((entry) => entry.id === keepsakeId);
  if (existing) return null;

  const awarded = {
    id: keepsakeId,
    earnedAt: new Date().toISOString(),
    ...meta,
  };
  campaign.keepsakes.push(awarded);
  return awarded;
}

export function pushJournalEntry(campaign, entry) {
  if (!campaign.journalEntries) {
    campaign.journalEntries = [];
  }

  campaign.journalEntries.push({
    chapter: entry.chapter,
    season: entry.season,
    score: entry.score,
    grade: entry.grade,
    eventsEncountered: [...(entry.eventsEncountered ?? [])],
    cropsPlanted: [...(entry.cropsPlanted ?? [])],
    timestamp: entry.timestamp ?? new Date().toISOString(),
  });
}

export function subscribeToStoreSaves(store, resolveSlot, options = {}) {
  if (!store?.subscribe) {
    return () => {};
  }

  const shouldPersist = options.shouldPersist ?? (() => true);

  return store.subscribe((state, action) => {
    const slot = typeof resolveSlot === 'function' ? resolveSlot(action, state) : resolveSlot;
    if (!isValidSlot(slot)) return;
    if (!shouldPersist(state, action)) return;
    saveCampaign(state.campaign, slot);
    saveSeasonState(state.season, slot);
  });
}

export { SAVE_SLOTS };
