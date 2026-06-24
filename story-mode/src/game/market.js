import MARKET_PRICES from 'specs/MARKET_PRICES.json';
import { Actions } from './store.js';
import {
  addItemToInventoryState,
  getInventoryItemCount,
  removeItemFromInventoryState,
} from './inventory.js';

const SEASONS = ['spring', 'summer', 'fall', 'winter'];

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clampCount(count) {
  return Math.max(1, Math.floor(Number(count ?? 1)));
}

function getPriceEntry(itemId, season, seed, definition) {
  const multiplier = Number(definition.seasonMultipliers?.[season] ?? 1);
  const variance = (hashString(`${seed}:${season}:${itemId}`) % 21) - 10;
  const buy = Math.max(1, Math.round(definition.basePrice * multiplier * ((100 + variance) / 100)));
  return {
    itemId,
    label: definition.label ?? itemId,
    type: definition.type ?? 'material',
    season,
    seed,
    buy,
    sell: Math.max(1, Math.floor(buy * 0.6)),
    barterValue: Math.max(1, Math.round(buy * 0.8)),
  };
}

export function computeMarketPrices({ seed = MARKET_PRICES.seedDefault, season = 'spring', priceSpec = MARKET_PRICES } = {}) {
  const normalizedSeason = SEASONS.includes(season) ? season : 'spring';
  const entries = {};
  Object.keys(priceSpec.items ?? {}).sort().forEach((itemId) => {
    entries[itemId] = getPriceEntry(itemId, normalizedSeason, seed, priceSpec.items[itemId]);
  });
  return {
    version: priceSpec.version,
    seed,
    season: normalizedSeason,
    prices: entries,
  };
}

function getBalance(state) {
  return Math.max(0, Number(state?.campaign?.currency?.balance ?? 0));
}

function replaceStoreState(store, state) {
  store.dispatch({
    type: Actions.REPLACE_STATE,
    payload: { state },
  });
}

export class MarketSystem {
  constructor(store, options = {}) {
    this.store = store;
    this.seed = options.seed ?? store.getState().campaign?.market?.seed ?? MARKET_PRICES.seedDefault;
  }

  getSeason() {
    const state = this.store.getState();
    return state.season?.season ?? state.campaign?.currentSeason ?? 'spring';
  }

  getPriceTable(season = this.getSeason()) {
    return computeMarketPrices({ seed: this.seed, season });
  }

  recordSeasonPrices(season = this.getSeason()) {
    const table = this.getPriceTable(season);
    this.store.dispatch({
      type: Actions.RECORD_MARKET_PRICES,
      payload: table,
    });
    return table;
  }

  buy(itemId, count = 1) {
    const amount = clampCount(count);
    const state = this.store.getState();
    const table = this.getPriceTable(state.season?.season);
    const price = table.prices[itemId];
    if (!price) return { success: false, reason: 'Item is not sold here.' };

    const cost = price.buy * amount;
    const balance = getBalance(state);
    if (balance < cost) return { success: false, reason: 'Not enough credits.' };

    const added = addItemToInventoryState(state.campaign.inventory, itemId, amount);
    if (!added.success) return { success: false, reason: added.reason ?? 'Inventory full.' };

    state.campaign.inventory = added.inventory;
    state.campaign.currency = {
      ...(state.campaign.currency ?? {}),
      balance: balance - cost,
    };
    replaceStoreState(this.store, state);
    this.store.dispatch({
      type: Actions.RECORD_MARKET_TRANSACTION,
      payload: {
        balance: balance - cost,
        transaction: { type: 'buy', itemId, count: amount, unitPrice: price.buy, total: cost },
      },
    });
    return { success: true, itemId, count: amount, balanceBefore: balance, balanceAfter: balance - cost, total: cost };
  }

  sell(itemId, count = 1) {
    const amount = clampCount(count);
    const state = this.store.getState();
    const table = this.getPriceTable(state.season?.season);
    const price = table.prices[itemId];
    if (!price) return { success: false, reason: 'Item is not priced here.' };
    if (getInventoryItemCount(state.campaign.inventory, itemId) < amount) {
      return { success: false, reason: 'Not enough inventory.' };
    }

    const removed = removeItemFromInventoryState(state.campaign.inventory, itemId, amount);
    const balance = getBalance(state);
    const revenue = price.sell * amount;
    state.campaign.inventory = removed.inventory;
    state.campaign.currency = {
      ...(state.campaign.currency ?? {}),
      balance: balance + revenue,
    };
    replaceStoreState(this.store, state);
    this.store.dispatch({
      type: Actions.RECORD_MARKET_TRANSACTION,
      payload: {
        balance: balance + revenue,
        transaction: { type: 'sell', itemId, count: amount, unitPrice: price.sell, total: revenue },
      },
    });
    return { success: true, itemId, count: amount, balanceBefore: balance, balanceAfter: balance + revenue, total: revenue };
  }

  barter(offerItemId, wantItemId, offerCount = 1) {
    const amount = clampCount(offerCount);
    const state = this.store.getState();
    const table = this.getPriceTable(state.season?.season);
    const offerPrice = table.prices[offerItemId];
    const wantPrice = table.prices[wantItemId];
    if (!offerPrice || !wantPrice) return { success: false, reason: 'Both items must be priced.' };
    if (getInventoryItemCount(state.campaign.inventory, offerItemId) < amount) {
      return { success: false, reason: 'Not enough inventory.' };
    }

    const wantCount = Math.max(1, Math.floor((offerPrice.barterValue * amount) / wantPrice.barterValue));
    const removed = removeItemFromInventoryState(state.campaign.inventory, offerItemId, amount);
    const added = addItemToInventoryState(removed.inventory, wantItemId, wantCount);
    if (!added.success) return { success: false, reason: added.reason ?? 'Inventory full.' };

    state.campaign.inventory = added.inventory;
    replaceStoreState(this.store, state);
    this.store.dispatch({
      type: Actions.RECORD_MARKET_TRANSACTION,
      payload: {
        balance: getBalance(state),
        transaction: { type: 'barter', offerItemId, wantItemId, offerCount: amount, wantCount },
      },
    });
    return { success: true, offerItemId, wantItemId, offerCount: amount, wantCount, balanceAfter: getBalance(state) };
  }
}
