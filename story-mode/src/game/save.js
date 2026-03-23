/**
 * Save System — Multi-slot localStorage persistence.
 * 3 independent save slots, each storing campaign + season state.
 */
import { createCampaignState } from './state.js';

const SAVE_SLOTS = 3;
const ACTIVE_SLOT_KEY = 'gos-story-active-slot';

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
  campaign.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(campaignKey(slot), JSON.stringify(campaign));
  } catch (e) {
    console.warn('[GOS] Save failed:', e.message);
  }
}

export function loadCampaign(slot) {
  try {
    const raw = localStorage.getItem(campaignKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Merge defaults for old-format saves missing newer fields
    const defaults = createCampaignState();
    return {
      ...defaults,
      ...parsed,
      questLog: parsed.questLog ?? defaults.questLog,
      reputation: { ...defaults.reputation, ...(parsed.reputation ?? {}) },
      worldState: {
        ...defaults.worldState,
        ...(parsed.worldState ?? {}),
        visitedZones: parsed.worldState?.visitedZones ?? defaults.worldState.visitedZones,
      },
      inventory: parsed.inventory ?? defaults.inventory,
      skills: parsed.skills ?? defaults.skills,
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
  try {
    const grid = Array.isArray(season.grid)
      ? { cells: [...season.grid], cols: season.gridCols ?? season.grid.cols ?? 8, rows: season.gridRows ?? season.grid.rows ?? 4 }
      : season.grid;
    const toSave = { ...season, campaign: undefined, grid };
    localStorage.setItem(seasonKey(slot), JSON.stringify(toSave));
  } catch (e) {
    console.warn('[GOS] Season save failed:', e.message);
  }
}

export function loadSeasonState(slot) {
  try {
    const raw = localStorage.getItem(seasonKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate old array grids to { cells, cols, rows }
    if (parsed.grid && Array.isArray(parsed.grid)) {
      parsed.grid = {
        cells: parsed.grid,
        cols: parsed.gridCols ?? 8,
        rows: parsed.gridRows ?? 4,
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
      const questLog = campaign.questLog ?? {};
      const activeQuests = Object.values(questLog).filter(
        (q) => q.state === 'ACCEPTED' || q.state === 'IN_PROGRESS',
      ).length;
      const zonesVisited = (campaign.worldState?.visitedZones ?? ['player_plot']).length;
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
        gradeHistory: (campaign.journalEntries ?? []).map((e) => ({
          chapter: e.chapter,
          grade: e.grade,
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
 *
 * @param {object} store — Store instance with subscribe/getState
 * @param {() => number} getSlot — returns the active save slot
 * @param {{ shouldPersist?: (state, action) => boolean }} options
 */
export function subscribeToStoreSaves(store, getSlot, options = {}) {
  const { shouldPersist } = options;
  return store.subscribe((nextState, action) => {
    if (typeof shouldPersist === 'function' && !shouldPersist(nextState, action)) return;
    const slot = typeof getSlot === 'function' ? getSlot() : 0;
    if (nextState.campaign) saveCampaign(nextState.campaign, slot);
    if (nextState.season) saveSeasonState(nextState.season, slot);
  });
}

export { SAVE_SLOTS };
