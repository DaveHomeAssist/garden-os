// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { CAMPAIGN_SCHEMA_VERSION, createSandboxState } from '../state.js';
import { loadCampaign, migrateCampaignSave, prepareCampaignForSave, saveCampaign } from '../save.js';
import { Actions, Store } from '../store.js';
import { getInventoryItemCount, getItemDef, getSeedItemId } from '../inventory.js';
import { getCropsForChapter } from '../../data/crops.js';
import {
  LEGACY_TOKENS_LEDGER_TYPE,
  SEASON_END_DRIED_LEAVES,
  foldLegacyTokens,
  getCurrencyBalance,
  getHarvestCompostScraps,
} from './village-economy.js';

beforeEach(() => {
  localStorage.clear();
});

function firstSeed() {
  const crop = getCropsForChapter(1)[0];
  return { itemId: getSeedItemId(crop.id), price: (crop.chapterUnlock ?? 1) * 5 };
}

describe('village economy: one coin balance', () => {
  it('a new Free Play player has 100 coins to spend at the village shops', () => {
    const state = createSandboxState();
    expect(getCurrencyBalance(state.campaign)).toBe(100);
    expect(state.campaign.tokens).toBe(0);
  });

  it('VILLAGE_SHOP_BUY takes coins and adds the item in one step', () => {
    const store = new Store(createSandboxState());
    const { itemId, price } = firstSeed();
    store.dispatch({ type: Actions.VILLAGE_SHOP_BUY, payload: { itemId, price } });
    const after = store.getState().campaign;
    expect(after.currency.balance).toBe(100 - price);
    expect(getInventoryItemCount(after.inventory, itemId)).toBe(1);
    expect(after.currency.ledger.at(-1)).toMatchObject({ type: 'village_shop', itemId, delta: -price, before: 100, after: 100 - price });
  });

  it('VILLAGE_SHOP_BUY changes nothing when the player cannot pay', () => {
    const state = createSandboxState();
    state.campaign.currency.balance = 3;
    const store = new Store(state);
    const before = store.getState();
    store.dispatch({ type: Actions.VILLAGE_SHOP_BUY, payload: { itemId: 'soil_scanner', price: 25 } });
    expect(store.getState().campaign.currency).toEqual(before.campaign.currency);
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'soil_scanner')).toBe(0);
  });

  it('VILLAGE_SHOP_BUY keeps the coins when the backpack is full', () => {
    const state = createSandboxState();
    const cap = state.campaign.inventory.capacity ?? 20;
    state.campaign.inventory.slots = Array.from({ length: cap }, (_, i) => ({ itemId: `filler_${i}`, count: 99 }));
    const store = new Store(state);
    store.dispatch({ type: Actions.VILLAGE_SHOP_BUY, payload: { itemId: 'soil_scanner', price: 25 } });
    expect(store.getState().campaign.currency.balance).toBe(100);
  });

  it('a bought seed survives save and reload', () => {
    const store = new Store(createSandboxState());
    const { itemId, price } = firstSeed();
    store.dispatch({ type: Actions.VILLAGE_SHOP_BUY, payload: { itemId, price } });
    saveCampaign(store.getState().campaign, 'freeplay');
    const reloaded = new Store({ ...createSandboxState(), campaign: loadCampaign('freeplay') }).getState().campaign;
    expect(reloaded.currency.balance).toBe(100 - price);
    expect(getInventoryItemCount(reloaded.inventory, itemId)).toBe(1);
    // The seed is plantable back in the yard (backpack "Use" selects its crop).
    expect(getItemDef(itemId)).toMatchObject({ category: 'seeds', cropId: expect.any(String) });
  });

  it('recipe cards bought at the stand have a real name and description', () => {
    const def = getItemDef('recipe_moms_sauce');
    expect(def.icon).toBe('📜');
    expect(def.name).toMatch(/Recipe$/);
    expect(def.description).toMatch(/^Grow /);
  });
});

describe('save migration v10 -> v11: legacy shop tokens', () => {
  it('folds leftover campaign.tokens into currency.balance with a ledger entry', () => {
    const folded = foldLegacyTokens({ tokens: 30, currency: { balance: 80, ledger: [] } });
    expect(folded.tokens).toBe(0);
    expect(folded.currency.balance).toBe(110);
    expect(folded.currency.ledger.at(-1)).toMatchObject({ type: LEGACY_TOKENS_LEDGER_TYPE, delta: 30, before: 80, after: 110 });
  });

  it('is a no-op for 0 / missing / bad tokens and never runs twice', () => {
    const base = { tokens: 0, currency: { balance: 55, ledger: [] } };
    expect(foldLegacyTokens(base)).toBe(base);
    expect(foldLegacyTokens({ currency: { balance: 55 } }).currency.balance).toBe(55);
    expect(foldLegacyTokens({ tokens: -5, currency: { balance: 55 } }).currency.balance).toBe(55);
    expect(foldLegacyTokens({ tokens: 'x', currency: { balance: 55 } }).currency.balance).toBe(55);
    const once = foldLegacyTokens({ tokens: 10, currency: { balance: 1, ledger: [] } });
    expect(foldLegacyTokens(once).currency.balance).toBe(11);
  });

  it('a save with no currency block starts from the default 100', () => {
    expect(foldLegacyTokens({ tokens: 7 }).currency.balance).toBe(107);
  });

  it('loads a v10 Free Play save with tokens and spends nothing', () => {
    const v10 = createSandboxState().campaign;
    v10.version = 10;
    v10.tokens = 25;
    v10.currency = { balance: 60, ledger: [{ type: 'market_sell', delta: 10, before: 50, after: 60 }] };
    localStorage.setItem('gos-freeplay-campaign', JSON.stringify(v10));
    const loaded = loadCampaign('freeplay');
    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(loaded.tokens).toBe(0);
    expect(loaded.currency.balance).toBe(85);
    expect(loaded.currency.ledger).toHaveLength(2);
    // Saving and loading again keeps the total (no double fold).
    saveCampaign(loaded, 'freeplay');
    expect(loadCampaign('freeplay').currency.balance).toBe(85);
  });

  it('the store folds tokens on hydrate too (snapshots, imports)', () => {
    const state = createSandboxState();
    state.campaign.tokens = 12;
    const store = new Store(state);
    expect(store.getState().campaign.currency.balance).toBe(112);
    expect(store.getState().campaign.tokens).toBe(0);
  });

  it('migrateCampaignSave / prepareCampaignForSave keep the balance', () => {
    expect(migrateCampaignSave({ version: 10, tokens: 4, currency: { balance: 1 } }).currency.balance).toBe(5);
    expect(prepareCampaignForSave({ version: 11, tokens: 0, currency: { balance: 9, ledger: [] } }).currency.balance).toBe(9);
  });
});

describe('compost scraps from a Free Play harvest', () => {
  it('every harvested or failed cell leaves plant matter; season end leaves dried leaves', () => {
    expect(getHarvestCompostScraps({ occupiedCount: 12 })).toEqual({ plant_matter: 12, dried_leaves: SEASON_END_DRIED_LEAVES });
    expect(getHarvestCompostScraps({ cellScores: [null, { total: 1 }, { total: 0 }, null] })).toEqual({ plant_matter: 2, dried_leaves: SEASON_END_DRIED_LEAVES });
  });

  it('caps plant matter and handles an empty bed', () => {
    expect(getHarvestCompostScraps({ occupiedCount: 64 }).plant_matter).toBe(20);
    expect(getHarvestCompostScraps({ occupiedCount: 0 })).toEqual({ plant_matter: 0, dried_leaves: SEASON_END_DRIED_LEAVES });
    expect(getHarvestCompostScraps(null)).toEqual({ plant_matter: 0, dried_leaves: 0 });
  });

  it('one season of 12 cells is enough for a compost batch (2 leaves + 1 plant matter)', () => {
    const scraps = getHarvestCompostScraps({ occupiedCount: 12 });
    expect(Math.min(Math.floor(scraps.dried_leaves / 2), scraps.plant_matter)).toBeGreaterThanOrEqual(1);
  });
});
