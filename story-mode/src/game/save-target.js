export const STORY_SAVE_SLOT_COUNT = 3;
export const FREEPLAY_SAVE_TARGET = 'freeplay';

export function isStorySaveSlot(target) {
  return Number.isInteger(target) && target >= 0 && target < STORY_SAVE_SLOT_COUNT;
}

export function isPersistentSaveTarget(target) {
  return isStorySaveSlot(target) || target === FREEPLAY_SAVE_TARGET;
}

export function campaignStorageKey(target) {
  if (isStorySaveSlot(target)) return `gos-story-slot-${target}-campaign`;
  if (target === FREEPLAY_SAVE_TARGET) return 'gos-freeplay-campaign';
  return null;
}

export function seasonStorageKey(target) {
  if (isStorySaveSlot(target)) return `gos-story-slot-${target}-season`;
  if (target === FREEPLAY_SAVE_TARGET) return 'gos-freeplay-season';
  return null;
}

// Post-campaign Free Play deliberately remains in its original Story slot.
export function isCampaignCompatibleWithTarget(campaign, target) {
  if (!campaign || !isPersistentSaveTarget(target)) return false;
  if (campaign.sandbox !== undefined && typeof campaign.sandbox !== 'boolean') return false;
  return target === FREEPLAY_SAVE_TARGET
    ? campaign.sandbox === true && campaign.postCampaign !== true
    : campaign.sandbox !== true || campaign.postCampaign === true;
}
