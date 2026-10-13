// Shared market math for the client store, the Node authority service, and the
// fetch-compatible worker. Pure functions over the generated price table, so
// every runtime prices and settles a trade the same way.
//
// Bounded Stewardship Exchange Doctrine (docs/PROGRESSION_SYSTEMS.md §12):
// cycling buy, sell, and barter must never create credits. This module makes
// that provable instead of tuned:
//   - Each item has one settlement value: its lowest buy price across all four
//     seasons for the campaign seed. Every buy costs at least that much.
//   - Sell prices stay strictly below the settlement value.
//   - Barter converts settlement value to settlement value, rounded down, and a
//     trade that would hand back less than one unit is refused instead of
//     rounded up.
// Any sequence of trades therefore ends with no more credits than it started.

import {
  AUTHORITY_MARKET_ITEMS,
  AUTHORITY_MARKET_SEED,
  AUTHORITY_MARKET_STARTING_BALANCE,
} from './authority-market-tables.js';

const MARKET_SEASONS = ['spring', 'summer', 'fall', 'winter'];
const MARKET_TRADE_KINDS = ['buy', 'sell', 'barter'];
const MARKET_MAX_TRADE_COUNT = 99;
const SELL_RATIO = 0.6;
// Payload keys a client may never submit: totals and state are server derived.
const BLOCKED_MARKET_PAYLOAD_KEYS = [
  'balance',
  'barterValue',
  'cost',
  'currency',
  'inventory',
  'price',
  'prices',
  'revenue',
  'seed',
  'slots',
  'total',
  'unitPrice',
  'wantCount',
];

function hashMarketSeed(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSeason(season) {
  return MARKET_SEASONS.includes(season) ? season : null;
}

function computeBuyPrice(itemId, season, seed = AUTHORITY_MARKET_SEED, items = AUTHORITY_MARKET_ITEMS) {
  const definition = items[itemId];
  if (!definition) return null;
  const multiplier = Number(definition.seasonMultipliers?.[season] ?? 1);
  const variance = (hashMarketSeed(`${seed}:${season}:${itemId}`) % 21) - 10;
  return Math.max(1, Math.round(definition.basePrice * multiplier * ((100 + variance) / 100)));
}

function computeSettlementValue(itemId, seed = AUTHORITY_MARKET_SEED, items = AUTHORITY_MARKET_ITEMS) {
  if (!items[itemId]) return null;
  return Math.min(...MARKET_SEASONS.map((season) => computeBuyPrice(itemId, season, seed, items)));
}

function computePriceEntry(itemId, season, seed = AUTHORITY_MARKET_SEED, items = AUTHORITY_MARKET_ITEMS) {
  const definition = items[itemId];
  if (!definition) return null;
  const buy = computeBuyPrice(itemId, season, seed, items);
  const settlementValue = computeSettlementValue(itemId, seed, items);
  return {
    itemId,
    label: definition.label ?? itemId,
    type: definition.type ?? 'material',
    season,
    seed,
    buy,
    sell: Math.max(0, Math.min(Math.floor(buy * SELL_RATIO), settlementValue - 1)),
    barterValue: settlementValue,
  };
}

function computeMarketPriceTable({
  items = AUTHORITY_MARKET_ITEMS,
  season = 'spring',
  seed = AUTHORITY_MARKET_SEED,
} = {}) {
  const normalizedSeason = normalizeSeason(season) ?? 'spring';
  const prices = {};
  Object.keys(items).forEach((itemId) => {
    prices[itemId] = computePriceEntry(itemId, normalizedSeason, seed, items);
  });
  return { season: normalizedSeason, seed, prices };
}

function reject(code, message) {
  return { ok: false, code, message };
}

/**
 * Validate a trade request and derive its settlement from canonical prices.
 * Inventory and balance checks are left to the caller, which owns that state;
 * pass them in to have them checked here as well.
 */
function quoteMarketTrade(request = {}, {
  balance = null,
  getItemCount = null,
  items = AUTHORITY_MARKET_ITEMS,
  seed = AUTHORITY_MARKET_SEED,
} = {}) {
  const blockedKey = BLOCKED_MARKET_PAYLOAD_KEYS.find((key) => Object.prototype.hasOwnProperty.call(request, key));
  if (blockedKey) {
    return reject('CLIENT_TRADE_TOTAL', `Market trades cannot submit trusted field "${blockedKey}".`);
  }
  const { kind, itemId, wantItemId } = request;
  if (!MARKET_TRADE_KINDS.includes(kind)) {
    return reject('BAD_TRADE_KIND', 'Market trade kind must be buy, sell, or barter.');
  }
  const season = normalizeSeason(request.season);
  if (!season) {
    return reject('BAD_SEASON', 'Market trade requires a season of spring, summer, fall, or winter.');
  }
  if (typeof itemId !== 'string' || !items[itemId]) {
    return reject('BAD_ITEM_ID', 'Market trade requires an item the market prices.');
  }
  const count = request.count ?? 1;
  if (!Number.isInteger(count) || count <= 0 || count > MARKET_MAX_TRADE_COUNT) {
    return reject('BAD_ITEM_COUNT', `Market trade count must be an integer from 1 to ${MARKET_MAX_TRADE_COUNT}.`);
  }

  const entry = computePriceEntry(itemId, season, seed, items);
  const ownedCount = typeof getItemCount === 'function' ? getItemCount(itemId) : null;

  if (kind === 'buy') {
    const cost = entry.buy * count;
    if (Number.isFinite(balance) && balance < cost) {
      return reject('NOT_ENOUGH_CREDITS', 'Not enough credits.');
    }
    return {
      ok: true,
      kind,
      season,
      itemId,
      count,
      unitPrice: entry.buy,
      cost,
      revenue: 0,
      balanceDelta: -cost,
      gives: [],
      gets: [{ itemId, count }],
    };
  }

  if (Number.isFinite(ownedCount) && ownedCount < count) {
    return reject('NOT_ENOUGH_ITEM', 'Not enough of that item to trade.');
  }

  if (kind === 'sell') {
    const revenue = entry.sell * count;
    return {
      ok: true,
      kind,
      season,
      itemId,
      count,
      unitPrice: entry.sell,
      cost: 0,
      revenue,
      balanceDelta: revenue,
      gives: [{ itemId, count }],
      gets: [],
    };
  }

  if (typeof wantItemId !== 'string' || !items[wantItemId]) {
    return reject('BAD_WANT_ITEM_ID', 'Barter requires an item the market prices.');
  }
  if (wantItemId === itemId) {
    return reject('BAD_WANT_ITEM_ID', 'Barter must trade for a different item.');
  }
  const wantEntry = computePriceEntry(wantItemId, season, seed, items);
  const wantCount = Math.floor((entry.barterValue * count) / wantEntry.barterValue);
  if (wantCount < 1) {
    return reject('BARTER_TOO_SMALL', `Offer at least ${Math.ceil(wantEntry.barterValue / entry.barterValue)} to trade for one ${wantEntry.label}.`);
  }
  return {
    ok: true,
    kind,
    season,
    itemId,
    count,
    wantItemId,
    wantCount,
    unitPrice: entry.barterValue,
    cost: 0,
    revenue: 0,
    balanceDelta: 0,
    gives: [{ itemId, count }],
    gets: [{ itemId: wantItemId, count: wantCount }],
  };
}

/**
 * Quote and apply a trade against a runtime's own inventory helpers. Used by
 * both authority runtimes so validation and settlement share one code path.
 * Returns { ok: true, quote, inventory, balance } or a rejection.
 */
function settleMarketTrade(request, {
  addItem,
  balance = 0,
  getItemCount,
  inventory,
  items = AUTHORITY_MARKET_ITEMS,
  removeItem,
  seed = AUTHORITY_MARKET_SEED,
} = {}) {
  const startingBalance = Math.max(0, Math.round(Number(balance ?? 0)));
  const quote = quoteMarketTrade(request, {
    balance: startingBalance,
    getItemCount: (itemId) => getItemCount(inventory, itemId),
    items,
    seed,
  });
  if (!quote.ok) return quote;

  let nextInventory = inventory;
  for (const give of quote.gives) {
    const removed = removeItem(nextInventory, give.itemId, give.count);
    if (!removed.success) return reject('NOT_ENOUGH_ITEM', 'Not enough of that item to trade.');
    nextInventory = removed.inventory;
  }
  for (const get of quote.gets) {
    const added = addItem(nextInventory, get.itemId, get.count);
    if (!added.success) return reject('INVENTORY_FULL', 'Market trade requires enough inventory space.');
    nextInventory = added.inventory;
  }
  return {
    ok: true,
    quote,
    inventory: nextInventory,
    balance: startingBalance + quote.balanceDelta,
  };
}

function marketTradeAckMetadata(settlement, getItemCount) {
  const { quote } = settlement;
  const itemTotals = {};
  [...quote.gives, ...quote.gets].forEach(({ itemId }) => {
    itemTotals[itemId] = getItemCount(settlement.inventory, itemId);
  });
  return {
    balance: settlement.balance,
    count: quote.count,
    itemId: quote.itemId,
    itemTotals,
    kind: quote.kind,
    season: quote.season,
    total: quote.kind === 'buy' ? quote.cost : quote.revenue,
    wantCount: quote.wantCount,
    wantItemId: quote.wantItemId,
  };
}

export {
  AUTHORITY_MARKET_ITEMS,
  AUTHORITY_MARKET_SEED,
  AUTHORITY_MARKET_STARTING_BALANCE,
  BLOCKED_MARKET_PAYLOAD_KEYS,
  MARKET_MAX_TRADE_COUNT,
  MARKET_SEASONS,
  MARKET_TRADE_KINDS,
  computeBuyPrice,
  computeMarketPriceTable,
  computePriceEntry,
  computeSettlementValue,
  hashMarketSeed,
  marketTradeAckMetadata,
  quoteMarketTrade,
  settleMarketTrade,
};
