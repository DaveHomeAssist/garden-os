/**
 * Village economy (Free Play): the village shops (seed stand, seed box, tool
 * shed, recipes) spend the same coins the market uses, campaign.currency.balance
 * (starts at 100). Before v11 the shops read campaign.tokens, which nothing ever
 * credited, so every Buy was disabled. Saves from v10 and earlier fold any
 * leftover campaign.tokens into the balance on load (no loss).
 *
 * Also the compost scraps a Free Play harvest leaves behind: plant matter from
 * every harvested or failed cell, plus a few dried leaves at each season end.
 */

import { addItemToInventoryState } from '../inventory.js';

export const LEGACY_TOKENS_LEDGER_TYPE = 'legacy_tokens';
export const VILLAGE_SHOP_LEDGER_TYPE = 'village_shop';
export const LEDGER_LIMIT = 50;

/** Dried leaves raked up when a Free Play season ends (one compost batch needs 2). */
export const SEASON_END_DRIED_LEAVES = 2;
/** Cap so a big bed never floods the 99-stack. */
export const MAX_PLANT_MATTER_PER_HARVEST = 20;

function coins(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The player's coins: the shared currency the market and the village shops both use. */
export function getCurrencyBalance(campaign) {
  return Math.max(0, Number(campaign?.currency?.balance ?? 0) || 0);
}

/**
 * v10 -> v11 save migration. Pure: returns a new campaign object when there
 * is something to fold, otherwise the same object with tokens cleared.
 * campaign.tokens > 0 is added to currency.balance with a ledger entry;
 * campaign.tokens is then 0 so the fold never runs twice.
 */
export function foldLegacyTokens(campaign) {
  if (!campaign || typeof campaign !== 'object') return campaign;
  const legacy = coins(campaign.tokens);
  if (!legacy) {
    return campaign.tokens === 0 ? campaign : { ...campaign, tokens: 0 };
  }
  const currency = campaign.currency && typeof campaign.currency === 'object' ? campaign.currency : null;
  // A save without a currency block starts from the default 100 like a new player.
  const before = currency && Number.isFinite(Number(currency.balance)) ? Math.max(0, Number(currency.balance)) : 100;
  const after = before + legacy;
  const ledger = Array.isArray(currency?.ledger) ? currency.ledger : [];
  return {
    ...campaign,
    tokens: 0,
    currency: {
      ...(currency ?? {}),
      balance: after,
      ledger: [
        ...ledger,
        { type: LEGACY_TOKENS_LEDGER_TYPE, delta: legacy, before, after, timestamp: Date.now() },
      ].slice(-LEDGER_LIMIT),
    },
  };
}

/**
 * Compost scraps from one harvest result (scoreBed output). Every occupied
 * cell, whether it scored well or failed, leaves plant matter; the season
 * end adds a few dried leaves. Returns { plant_matter, dried_leaves }.
 */
export function getHarvestCompostScraps(harvestResult) {
  if (!harvestResult || typeof harvestResult !== 'object') return { plant_matter: 0, dried_leaves: 0 };
  const occupied = Number.isFinite(harvestResult.occupiedCount)
    ? harvestResult.occupiedCount
    : (harvestResult.cellScores ?? []).filter(Boolean).length;
  return {
    plant_matter: Math.min(MAX_PLANT_MATTER_PER_HARVEST, Math.max(0, Math.floor(occupied))),
    dried_leaves: SEASON_END_DRIED_LEAVES,
  };
}

/**
 * Put compost scraps in the backpack, as many of each kind as fit. A single
 * all-or-nothing add dropped the whole stack when it was one short, so the
 * scraps vanished with no message. addItemToInventoryState stays the only
 * judge of capacity: try the full amount, then one fewer, until it fits.
 * `added` has the same keys as `scraps` (0 when nothing fit); `leftBehind`
 * only lists kinds that did not fully fit.
 * Returns { inventory, added, leftBehind, full }.
 */
export function addCompostScrapsToInventory(inventoryState, scraps) {
  let inventory = inventoryState;
  const added = {};
  const leftBehind = {};
  for (const [itemId, wanted] of Object.entries(scraps ?? {})) {
    added[itemId] = 0;
    if (!(wanted > 0)) continue;
    for (let count = wanted; count > 0; count -= 1) {
      const result = addItemToInventoryState(inventory, itemId, count);
      if (!result.success) continue;
      inventory = result.inventory;
      added[itemId] = count;
      break;
    }
    if (added[itemId] < wanted) leftBehind[itemId] = wanted - added[itemId];
  }
  return { inventory, added, leftBehind, full: Object.keys(leftBehind).length > 0 };
}

/**
 * Free Play harvest payout: puts the scraps for `result` in `campaign.inventory`
 * and marks the result so a re-opened reveal can never pay out twice. Scraps
 * that do not fit are left behind (the flag is still set). Mutates `campaign`
 * and `result`, so call it on a draft. Returns { awarded, full }.
 */
export function awardHarvestCompostScraps(campaign, result) {
  if (!campaign?.sandbox || !result || result.compostScrapsAwarded) return { awarded: false, full: false };
  const delivered = addCompostScrapsToInventory(campaign.inventory, getHarvestCompostScraps(result));
  campaign.inventory = delivered.inventory;
  result.compostScrapsAwarded = true;
  result.compostScraps = delivered.added;
  return { awarded: true, full: delivered.full };
}
