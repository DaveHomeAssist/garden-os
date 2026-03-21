/**
 * Save System — localStorage with optional cloud sync adapter.
 */
const SAVE_KEY = 'gos-story-campaign';

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
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
