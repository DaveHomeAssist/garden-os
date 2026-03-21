/**
 * Save System — Multi-slot localStorage persistence.
 * 3 independent save slots, each storing campaign + season state.
 */
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
    return JSON.parse(raw);
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
    // Save a copy without the circular campaign reference
    const toSave = { ...season, campaign: undefined };
    localStorage.setItem(seasonKey(slot), JSON.stringify(toSave));
  } catch (e) {
    console.warn('[GOS] Season save failed:', e.message);
  }
}

export function loadSeasonState(slot) {
  try {
    const raw = localStorage.getItem(seasonKey(slot));
    if (!raw) return null;
    return JSON.parse(raw);
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

export { SAVE_SLOTS };
