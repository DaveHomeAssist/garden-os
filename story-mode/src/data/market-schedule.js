import MARKET_PRICES from 'specs/MARKET_PRICES.json';

import { getNPC } from './npcs.js';
import { hashMarketSeed } from '../server/authority-market.js';

// Trader schedule and rotating stock, read from specs/MARKET_PRICES.json.
// The market keeps a real weekly rhythm: day slot 1 is Monday and 7 is Sunday,
// on the player's own calendar, the same clock foraging cooldowns use.

const MARKET_SCHEDULE = MARKET_PRICES.schedule ?? [];
const MARKET_TRADERS = MARKET_PRICES.traders ?? {};
const MARKET_BASE_STOCK = MARKET_PRICES.baseStock ?? [];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMarketDaySlot(timestamp = Date.now()) {
  const weekday = new Date(timestamp).getDay(); // 0 Sunday .. 6 Saturday
  return weekday === 0 ? 7 : weekday;
}

function getSeasonFromState(state) {
  return state?.season?.season ?? state?.campaign?.currentSeason ?? 'spring';
}

export function getScheduledTraders({ zoneId = 'market_square', season = 'spring', daySlot = 1 } = {}) {
  return MARKET_SCHEDULE.filter((entry) => (
    entry.zoneId === zoneId
    && entry.seasons.includes(season)
    && entry.days.includes(daySlot)
  )).map((entry) => entry.traderId);
}

export function getTraderName(traderId) {
  return MARKET_TRADERS[traderId]?.name ?? getNPC(traderId)?.name ?? String(traderId).replace(/_/g, ' ');
}

/** Deterministic rotating picks from a trader's stock for one season and day. */
export function getTraderStock(traderId, { season = 'spring', daySlot = 1, seed = MARKET_PRICES.seedDefault } = {}) {
  const trader = MARKET_TRADERS[traderId];
  if (!trader) return [];
  const stock = [...(trader.stock ?? [])];
  const take = Math.min(stock.length, Math.max(1, trader.rotation ?? stock.length));
  return stock
    .map((itemId) => ({ itemId, order: hashMarketSeed(`${seed}:${traderId}:${season}:${daySlot}:${itemId}`) }))
    .sort((left, right) => left.order - right.order || left.itemId.localeCompare(right.itemId))
    .slice(0, take)
    .map((entry) => entry.itemId);
}

/** What the market offers to buy right now in one zone. */
export function getMarketOffer(state, zoneId = 'market_square', { now = Date.now() } = {}) {
  const season = getSeasonFromState(state);
  const daySlot = getMarketDaySlot(now);
  const seed = state?.campaign?.market?.seed ?? MARKET_PRICES.seedDefault;
  const traders = getScheduledTraders({ zoneId, season, daySlot }).map((traderId) => ({
    traderId,
    name: getTraderName(traderId),
    stock: getTraderStock(traderId, { season, daySlot, seed }),
  }));
  const baseStock = zoneId === 'market_square' ? [...MARKET_BASE_STOCK] : [];
  const buyable = [...new Set([...baseStock, ...traders.flatMap((trader) => trader.stock)])];
  return {
    zoneId,
    season,
    daySlot,
    dayName: DAY_NAMES[daySlot - 1],
    traders,
    baseStock,
    buyable,
  };
}

export function getScheduledTradersForState(state, zoneId = 'market_square', options = {}) {
  return getMarketOffer(state, zoneId, options).traders.map((trader) => trader.traderId);
}

/** Next day slots a trader keeps a stall in this zone, for the panel copy. */
export function getTraderDays(traderId, zoneId = 'market_square', season = 'spring') {
  const entry = MARKET_SCHEDULE.find((candidate) => (
    candidate.traderId === traderId && candidate.zoneId === zoneId && candidate.seasons.includes(season)
  ));
  return (entry?.days ?? []).map((slot) => DAY_NAMES[slot - 1]);
}

export {
  DAY_NAMES,
  MARKET_BASE_STOCK,
  MARKET_SCHEDULE,
  MARKET_TRADERS,
  getMarketDaySlot,
};
