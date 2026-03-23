/**
 * Save System — Multi-slot localStorage persistence.
 * 3 independent save slots, each storing campaign + season state.
 */
import { createCampaignState, DEFAULT_REPUTATION, DEFAULT_WORLD_STATE } from './state.js';

const SAVE_SLOTS = 3;
const ACTIVE_SLOT_KEY = 'gos-story-active-slot';

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 0 && slot < SAVE_SLOTS;
}

function campaignKey(slot) {
  return `gos-story-slot-${slot}-campaign`;
}

function seasonKey(slot) {
  return `gos-story-slot-${slot}-season`;
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
    version: Math.max(3, Number(campaign.version ?? 0)),
    questLog: { ...(campaign.questLog ?? {}) },
    reputation: { ...DEFAULT_REPUTATION, ...(campaign.reputation ?? {}) },
    worldState,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(campaignKey(slot), JSON.stringify(toSave));
    return toSave;
  } catch (e) {
    console.warn('[GOS] Save failed:', e.message);
    return null;
  }
}

export function loadCampaign(slot) {
  try {
    const raw = localStorage.getItem(campaignKey(slot));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const defaults = createCampaignState();
    const version = parsed.version ?? defaults.version ?? 1;
    return {
      ...defaults,
      ...parsed,
      version: Math.max(defaults.version ?? 3, version),
      questLog: parsed.questLog ?? defaults.questLog,
      reputation: { ...defaults.reputation, ...DEFAULT_REPUTATION, ...(parsed.reputation ?? {}) },
      worldState: {
        ...defaults.worldState,
        ...DEFAULT_WORLD_STATE,
        ...(parsed.worldState ?? {}),
        visitedZones: [...new Set(parsed.worldState?.visitedZones ?? defaults.worldState.visitedZones)],
      },
      activeNeighbors: parsed.activeNeighbors ?? defaults.activeNeighbors,
      inventory: parsed.inventory ?? defaults.inventory,
      craftedItems: parsed.craftedItems ?? defaults.craftedItems,
      skills: parsed.skills ?? defaults.skills,
      skillXp: parsed.skillXp ?? defaults.skillXp,
    };
  } catch {
    return null;
  }
}

export function deleteCampaign(slot) {
  localStorage.removeItem(campaignKey(slot));
  localStorage.removeItem(seasonKey(slot));
}

export function saveSeasonState(season, slot) {
  if (!season || !isValidSlot(slot)) return null;

  try {
    const cells = Array.isArray(season.grid)
      ? [...season.grid]
      : [...(season.grid?.cells ?? [])];
    const toSave = {
      ...season,
      campaign: undefined,
      grid: {
        cells,
        cols: season.gridCols ?? season.grid?.cols ?? 8,
        rows: season.gridRows ?? season.grid?.rows ?? 4,
      },
    };
    localStorage.setItem(seasonKey(slot), JSON.stringify(toSave));
    return toSave;
  } catch (e) {
    console.warn('[GOS] Season save failed:', e.message);
    return null;
  }
}

export function loadSeasonState(slot) {
  try {
    const raw = localStorage.getItem(seasonKey(slot));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.grid)) {
      parsed.grid = {
        cells: parsed.grid,
        cols: parsed.gridCols ?? 8,
        rows: parsed.gridRows ?? 4,
      };
    } else if (parsed?.grid) {
      parsed.grid = {
        ...parsed.grid,
        cells: Array.isArray(parsed.grid.cells) ? parsed.grid.cells : [],
        cols: parsed.grid.cols ?? parsed.gridCols ?? 8,
        rows: parsed.grid.rows ?? parsed.gridRows ?? 4,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

const SEASON_EMOJIS = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };

export function listSaves() {
  const saves = [];
  for (let slot = 0; slot < SAVE_SLOTS; slot++) {
    const campaign = loadCampaign(slot);
    if (!campaign) {
      saves.push({ slot, campaign: null, isEmpty: true });
    } else {
      const seasonOrder = ['spring', 'summer', 'fall', 'winter'];
      const seasonIdx = ((campaign.currentChapter - 1) % 4);
      const season = campaign.currentSeason ?? seasonOrder[seasonIdx] ?? 'spring';
      const lastEntry = (campaign.journalEntries ?? []).slice(-1)[0] ?? null;
      const activeQuests = Object.values(campaign.questLog ?? {}).filter((entry) => (
        entry?.state === 'ACCEPTED' || entry?.state === 'IN_PROGRESS'
      )).length;
      const zonesVisited = (campaign.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones).length;

      saves.push({
        slot,
        campaign,
        isEmpty: false,
        chapter: campaign.currentChapter,
        season,
        seasonEmoji: SEASON_EMOJIS[season] ?? '🌱',
        score: lastEntry?.score ?? 0,
        grade: lastEntry?.grade ?? null,
        updatedAt: campaign.updatedAt ?? campaign.createdAt,
        activeQuests,
        zonesVisited,
        gradeHistory: (campaign.journalEntries ?? []).map((entry) => ({
          chapter: entry.chapter,
          grade: entry.grade,
        })),
      });
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

/**
 * Subscribe to store changes and auto-persist campaign + season state.
 * Returns an unsubscribe function.
 */
export function subscribeToStoreSaves(store, resolveSlot, options = {}) {
  if (!store?.subscribe) {
    return () => {};
  }

  const shouldPersist = options.shouldPersist ?? (() => true);

  return store.subscribe((state, action) => {
    if (!shouldPersist(state, action)) return;
    const slot = typeof resolveSlot === 'function' ? resolveSlot(action, state) : resolveSlot;
    if (!isValidSlot(slot)) return;
    if (state.campaign) saveCampaign(state.campaign, slot);
    if (state.season) saveSeasonState(state.season, slot);
  });
}

export { SAVE_SLOTS };
