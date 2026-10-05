/**
 * Quest ledger: the per-campaign record of quest-relevant events that the
 * rest of the campaign state does not keep (what was found where, what was
 * delivered to whom, plantings outside the home bed, festivals completed).
 *
 * Persisted as `campaign.questLedger`. Saves written before the ledger
 * existed have no such field; `normalizeQuestLedger` turns anything
 * (undefined, partial, malformed) into a valid empty-or-merged ledger, so old
 * saves load safely and simply start with an empty history.
 *
 * Pure module: imported by the store reducer, so it must not import store.js.
 */
import { addItemToInventoryState, getInventoryItemCount, removeItemFromInventoryState } from './inventory.js';
import { getQuestSite, getSiteCrop } from '../data/quest-sites.js';
import { FESTIVALS } from '../data/festivals-data.js';

const QUEST_LEDGER_VERSION = 1;

function createQuestLedger() {
  return {
    version: QUEST_LEDGER_VERSION,
    found: {},
    foundByZone: {},
    delivered: {},
    plantings: [],
    harvestedByZone: {},
    festivalsCompleted: [],
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCountMap(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, count]) => [key, Math.max(0, Math.floor(Number(count) || 0))])
      .filter(([key, count]) => key && count > 0),
  );
}

function normalizeNestedCountMap(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, inner]) => [key, normalizeCountMap(inner)])
      .filter(([key, inner]) => key && Object.keys(inner).length > 0),
  );
}

function normalizePlanting(entry) {
  if (!isPlainObject(entry) || typeof entry.cropId !== 'string' || typeof entry.siteId !== 'string') return null;
  const plantedChapter = Number.isInteger(entry.plantedChapter) ? entry.plantedChapter : 1;
  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `${entry.siteId}:${entry.cropId}:${plantedChapter}`,
    siteId: entry.siteId,
    zoneId: typeof entry.zoneId === 'string' ? entry.zoneId : (getQuestSite(entry.siteId)?.zoneId ?? null),
    cropId: entry.cropId,
    plantedChapter,
    harvestedChapter: Number.isInteger(entry.harvestedChapter) ? entry.harvestedChapter : null,
  };
}

function normalizeFestivalCompletion(entry) {
  if (!isPlainObject(entry) || typeof entry.festivalId !== 'string') return null;
  const chapter = Number.isInteger(entry.chapter) ? entry.chapter : null;
  return {
    festivalId: entry.festivalId,
    season: entry.season ?? FESTIVALS[entry.festivalId]?.season ?? null,
    year: Number.isInteger(entry.year) ? entry.year : (chapter ? getCampaignYear(chapter) : 1),
    chapter,
  };
}

function normalizeQuestLedger(value) {
  const base = createQuestLedger();
  if (!isPlainObject(value)) return base;
  return {
    version: QUEST_LEDGER_VERSION,
    found: normalizeCountMap(value.found),
    foundByZone: normalizeNestedCountMap(value.foundByZone),
    delivered: normalizeNestedCountMap(value.delivered),
    plantings: Array.isArray(value.plantings) ? value.plantings.map(normalizePlanting).filter(Boolean) : [],
    harvestedByZone: normalizeNestedCountMap(value.harvestedByZone),
    festivalsCompleted: Array.isArray(value.festivalsCompleted)
      ? value.festivalsCompleted.map(normalizeFestivalCompletion).filter(Boolean)
      : [],
  };
}

function getCampaignYear(chapter = 1) {
  return Math.max(1, Math.ceil((Number(chapter) || 1) / 4));
}

function bump(map, key, amount) {
  map[key] = (map[key] ?? 0) + amount;
}

function bumpNested(map, outer, key, amount) {
  map[outer] = { ...(map[outer] ?? {}) };
  bump(map[outer], key, amount);
}

function ledgerOf(campaign) {
  campaign.questLedger = normalizeQuestLedger(campaign.questLedger);
  return campaign.questLedger;
}

function recordFound(campaign, itemId, zoneId, count = 1) {
  const amount = Math.max(0, Math.floor(Number(count) || 0));
  if (!itemId || amount <= 0) return;
  const ledger = ledgerOf(campaign);
  bump(ledger.found, itemId, amount);
  if (zoneId) bumpNested(ledger.foundByZone, zoneId, itemId, amount);
}

/** FORAGE reducer hook: everything pulled from a forage spot counts as found in that zone. */
function recordForagedItems(campaign, payload = {}) {
  (payload.items ?? []).forEach((item) => {
    recordFound(campaign, item?.itemId, payload.zoneId ?? null, item?.count ?? 1);
  });
}

/** QUEST_ITEM_FOUND: a one-off discovery at a quest site. */
function applyQuestItemFound(campaign, payload = {}) {
  if (!payload.itemId) return false;
  const count = Math.max(1, Math.floor(Number(payload.count) || 1));
  recordFound(campaign, payload.itemId, payload.zoneId ?? null, count);
  if (payload.addToInventory !== false) {
    const added = addItemToInventoryState(campaign.inventory, payload.itemId, count);
    if (added.success) campaign.inventory = added.inventory;
  }
  return true;
}

/** QUEST_DELIVER: hand items to a quest giver. Atomic: all-or-nothing on the inventory. */
function applyQuestDelivery(campaign, payload = {}) {
  const items = (payload.items ?? []).filter((entry) => entry?.itemId && Number(entry.count) > 0);
  if (!payload.questId || !items.length) return false;
  const hasAll = items.every((entry) => getInventoryItemCount(campaign.inventory, entry.itemId) >= entry.count);
  if (!hasAll) return false;
  let inventory = campaign.inventory;
  items.forEach((entry) => {
    inventory = removeItemFromInventoryState(inventory, entry.itemId, entry.count).inventory;
  });
  campaign.inventory = inventory;
  const ledger = ledgerOf(campaign);
  items.forEach((entry) => bumpNested(ledger.delivered, payload.questId, entry.itemId, Math.floor(entry.count)));
  return true;
}

function getActivePlanting(ledger, siteId, cropId) {
  return ledger.plantings.find((entry) => (
    entry.siteId === siteId && entry.cropId === cropId && entry.harvestedChapter == null
  )) ?? null;
}

function getSitePlantingCount(ledger, siteId) {
  return ledger.plantings.filter((entry) => entry.siteId === siteId).length;
}

function canPlantAtSite(campaign, siteId, cropId) {
  const site = getQuestSite(siteId);
  const crop = getSiteCrop(site, cropId);
  if (!site || site.kind !== 'planter' || !crop) return false;
  const ledger = normalizeQuestLedger(campaign.questLedger);
  if (Number.isInteger(site.slots) && getSitePlantingCount(ledger, siteId) >= site.slots) return false;
  // Growing crops occupy their bed until harvested; plant-only patches never block.
  if (crop.growSeasons != null && getActivePlanting(ledger, siteId, cropId)) return false;
  return true;
}

function isPlantingReady(planting, site, chapter) {
  const crop = getSiteCrop(site, planting?.cropId);
  if (!planting || !crop || crop.growSeasons == null || planting.harvestedChapter != null) return false;
  return (Number(chapter) || 1) >= planting.plantedChapter + crop.growSeasons;
}

/** QUEST_SITE_PLANT */
function applyQuestSitePlant(campaign, payload = {}) {
  const site = getQuestSite(payload.siteId);
  if (!site || !canPlantAtSite(campaign, site.id, payload.cropId)) return false;
  const ledger = ledgerOf(campaign);
  const plantedChapter = campaign.currentChapter ?? 1;
  const index = ledger.plantings.length;
  ledger.plantings.push({
    id: `${site.id}:${payload.cropId}:${plantedChapter}:${index}`,
    siteId: site.id,
    zoneId: site.zoneId,
    cropId: payload.cropId,
    plantedChapter,
    harvestedChapter: null,
  });
  return true;
}

/** QUEST_SITE_HARVEST: a grown planter crop goes to the pantry and pack, and counts for its zone. */
function applyQuestSiteHarvest(campaign, payload = {}) {
  const site = getQuestSite(payload.siteId);
  if (!site) return false;
  const ledger = ledgerOf(campaign);
  const planting = getActivePlanting(ledger, site.id, payload.cropId);
  const chapter = campaign.currentChapter ?? 1;
  if (!isPlantingReady(planting, site, chapter)) return false;
  planting.harvestedChapter = chapter;
  bumpNested(ledger.harvestedByZone, site.zoneId, planting.cropId, 1);
  campaign.pantry = { ...(campaign.pantry ?? {}), [planting.cropId]: (campaign.pantry?.[planting.cropId] ?? 0) + 1 };
  const added = addItemToInventoryState(campaign.inventory, planting.cropId, 1);
  if (added.success) campaign.inventory = added.inventory;
  return true;
}

/** FESTIVAL_ACTIVITY reducer hook: completing every activity of a festival records it for the year. */
function recordFestivalIfComplete(campaign) {
  const active = campaign.activeFestival;
  const festival = active?.id ? FESTIVALS[active.id] : null;
  if (!festival) return false;
  const done = new Set(active.activitiesCompleted ?? []);
  if (!festival.activities.every((activity) => done.has(activity.id))) return false;
  const chapter = campaign.currentChapter ?? 1;
  const year = getCampaignYear(chapter);
  const ledger = ledgerOf(campaign);
  if (ledger.festivalsCompleted.some((entry) => entry.festivalId === festival.id && entry.year === year)) return false;
  ledger.festivalsCompleted.push({ festivalId: festival.id, season: festival.season, year, chapter });
  return true;
}

export {
  QUEST_LEDGER_VERSION,
  applyQuestDelivery,
  applyQuestItemFound,
  applyQuestSiteHarvest,
  applyQuestSitePlant,
  canPlantAtSite,
  createQuestLedger,
  getActivePlanting,
  getCampaignYear,
  getSitePlantingCount,
  isPlantingReady,
  normalizeQuestLedger,
  recordFestivalIfComplete,
  recordForagedItems,
};
