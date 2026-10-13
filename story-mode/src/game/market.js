import { Actions } from './store.js';
import { getInventoryItemCount } from './inventory.js';
import {
  AUTHORITY_MARKET_SEED,
  computeMarketPriceTable,
  quoteMarketTrade,
} from '../server/authority-market.js';

// Client facade over the shared market math in src/server/authority-market.js.
// Every trade is one MARKET_TRADE action: the store reducer settles it from the
// canonical price table, and the authority runtimes re-derive the same totals
// from the same module before signing.

export function computeMarketPrices({ seed = AUTHORITY_MARKET_SEED, season = 'spring' } = {}) {
  return computeMarketPriceTable({ seed, season });
}

function getBalance(state) {
  return Math.max(0, Number(state?.campaign?.currency?.balance ?? 0));
}

export class MarketSystem {
  constructor(store, options = {}) {
    this.store = store;
    this.seed = options.seed ?? store.getState().campaign?.market?.seed ?? AUTHORITY_MARKET_SEED;
    this.now = options.now ?? (() => Date.now());
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
      payload: { ...table, timestamp: this.now() },
    });
    return table;
  }

  /** Preview a trade without committing it. */
  quote(kind, itemId, count = 1, wantItemId = undefined) {
    const state = this.store.getState();
    return quoteMarketTrade({
      count,
      itemId,
      kind,
      season: this.getSeason(),
      wantItemId,
    }, {
      balance: getBalance(state),
      getItemCount: (id) => getInventoryItemCount(state.campaign.inventory, id),
      seed: this.seed,
    });
  }

  trade(kind, itemId, count = 1, wantItemId = undefined) {
    const amount = Math.floor(Number(count ?? 1));
    const before = this.store.getState();
    const balanceBefore = getBalance(before);
    const quote = this.quote(kind, itemId, amount, wantItemId);
    if (!quote.ok) return { success: false, reason: quote.message, code: quote.code };

    const transactionsBefore = before.campaign.market?.transactions?.length ?? 0;
    this.store.dispatch({
      type: Actions.MARKET_TRADE,
      payload: {
        count: amount,
        itemId,
        kind,
        season: quote.season,
        timestamp: this.now(),
        ...(kind === 'barter' ? { wantItemId } : {}),
      },
    });
    const after = this.store.getState();
    if ((after.campaign.market?.transactions?.length ?? 0) === transactionsBefore) {
      return { success: false, reason: 'Inventory full.', code: 'INVENTORY_FULL' };
    }
    const balanceAfter = getBalance(after);
    if (kind === 'barter') {
      return {
        success: true,
        offerItemId: itemId,
        wantItemId,
        offerCount: amount,
        wantCount: quote.wantCount,
        balanceAfter,
      };
    }
    return {
      success: true,
      itemId,
      count: amount,
      balanceBefore,
      balanceAfter,
      total: kind === 'buy' ? quote.cost : quote.revenue,
    };
  }

  buy(itemId, count = 1) {
    return this.trade('buy', itemId, count);
  }

  sell(itemId, count = 1) {
    return this.trade('sell', itemId, count);
  }

  barter(offerItemId, wantItemId, offerCount = 1) {
    return this.trade('barter', offerItemId, offerCount, wantItemId);
  }
}
