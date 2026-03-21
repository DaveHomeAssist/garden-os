/**
 * Save System — localStorage with optional cloud sync adapter.
 */
const SAVE_KEY = 'gos-story-campaign';
const SEASON_SAVE_KEY = 'gos-story-season';

export function saveCampaign(campaign) {
  campaign.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(campaign));
  } catch (e) {
    console.warn('[GOS] Save failed:', e.message);
  }
}

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteCampaign() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SEASON_SAVE_KEY);
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function saveSeasonState(season) {
  try {
    // Save a copy without the circular campaign reference
    const toSave = { ...season, campaign: undefined };
    localStorage.setItem(SEASON_SAVE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[GOS] Season save failed:', e.message);
  }
}

export function loadSeasonState() {
  try {
    const raw = localStorage.getItem(SEASON_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
