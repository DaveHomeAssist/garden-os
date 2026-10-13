import { describe, expect, it } from 'vitest';

import marketSpec from 'specs/MARKET_PRICES.json';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions, Store } from '../game/store.js';
import { createGameState } from '../game/state.js';
import { addItemToInventoryState, getInventoryItemCount } from '../game/inventory.js';
import {
  AUTHORITY_MARKET_ITEMS,
  AUTHORITY_MARKET_SEED,
  AUTHORITY_MARKET_STARTING_BALANCE,
  MARKET_SEASONS,
  computeMarketPriceTable,
  computePriceEntry,
  quoteMarketTrade,
} from './authority-market.js';
import {
  createAuthorityService,
  createMemoryLedgerStore,
} from './authority-service.js';

const ITEM_IDS = Object.keys(AUTHORITY_MARKET_ITEMS);
const SEEDS = [AUTHORITY_MARKET_SEED, 'smoke-seed', 'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];

function price(itemId, season, seed) {
  return computePriceEntry(itemId, season, seed);
}

describe('market price table mirrors specs/MARKET_PRICES.json', () => {
  it('mirrors every priced item, the default seed, and the starting balance', () => {
    expect(AUTHORITY_MARKET_SEED).toBe(marketSpec.seedDefault);
    expect(AUTHORITY_MARKET_STARTING_BALANCE).toBe(marketSpec.currency.startingBalance);
    expect(Object.keys(AUTHORITY_MARKET_ITEMS).sort()).toEqual(Object.keys(marketSpec.items).sort());
    for (const [itemId, item] of Object.entries(marketSpec.items)) {
      expect(AUTHORITY_MARKET_ITEMS[itemId].basePrice).toBe(item.basePrice);
      expect(AUTHORITY_MARKET_ITEMS[itemId].seasonMultipliers).toEqual(item.seasonMultipliers);
      expect(AUTHORITY_MARKET_ITEMS[itemId].type).toBe(item.type);
    }
  });
});

// Doctrine rule 3 (docs/PROGRESSION_SYSTEMS.md §12): cycling transactions can
// never generate credits. These checks sweep every item, pair, season, and a
// spread of campaign seeds instead of sampling one happy path.
describe('market no-profit invariant', () => {
  it('never sells anything for more than the cheapest it can be bought', () => {
    for (const seed of SEEDS) {
      for (const itemId of ITEM_IDS) {
        const cheapestBuy = Math.min(...MARKET_SEASONS.map((season) => price(itemId, season, seed).buy));
        for (const season of MARKET_SEASONS) {
          expect(price(itemId, season, seed).sell).toBeLessThan(cheapestBuy);
        }
      }
    }
  });

  it('never profits from buy, barter, then sell across any seasons', () => {
    for (const seed of SEEDS) {
      for (const offerId of ITEM_IDS) {
        for (const wantId of ITEM_IDS) {
          if (offerId === wantId) continue;
          for (const buySeason of MARKET_SEASONS) {
            for (const tradeSeason of MARKET_SEASONS) {
              for (const sellSeason of MARKET_SEASONS) {
                for (let count = 1; count <= 6; count += 1) {
                  const cost = price(offerId, buySeason, seed).buy * count;
                  const barter = quoteMarketTrade(
                    { kind: 'barter', itemId: offerId, wantItemId: wantId, count, season: tradeSeason },
                    { seed },
                  );
                  if (!barter.ok) continue;
                  const revenue = price(wantId, sellSeason, seed).sell * barter.wantCount;
                  expect(revenue).toBeLessThan(cost);
                }
              }
            }
          }
        }
      }
    }
  });

  it('never multiplies goods through a barter round trip', () => {
    for (const seed of SEEDS) {
      for (const offerId of ITEM_IDS) {
        for (const wantId of ITEM_IDS) {
          if (offerId === wantId) continue;
          for (const outSeason of MARKET_SEASONS) {
            for (const backSeason of MARKET_SEASONS) {
              for (let count = 1; count <= 12; count += 1) {
                const out = quoteMarketTrade({ kind: 'barter', itemId: offerId, wantItemId: wantId, count, season: outSeason }, { seed });
                if (!out.ok) continue;
                const back = quoteMarketTrade({ kind: 'barter', itemId: wantId, wantItemId: offerId, count: out.wantCount, season: backSeason }, { seed });
                if (!back.ok) continue;
                expect(back.wantCount).toBeLessThanOrEqual(count);
              }
            }
          }
        }
      }
    }
  });

  it('keeps a greedy trader from ending with more credits than it started', () => {
    // Greedy agent: every step takes whichever single legal trade leaves it
    // with the most credits plus settlement value, across 200 steps and all
    // four seasons. Settlement value is a ceiling on what goods can return.
    for (const seed of [AUTHORITY_MARKET_SEED, 'smoke-seed']) {
      let balance = AUTHORITY_MARKET_STARTING_BALANCE;
      const holdings = Object.fromEntries(ITEM_IDS.map((itemId) => [itemId, 0]));
      let bestCredits = balance;
      for (let step = 0; step < 200; step += 1) {
        const season = MARKET_SEASONS[step % 4];
        const options = [];
        for (const itemId of ITEM_IDS) {
          const opts = { balance, getItemCount: (id) => holdings[id], seed };
          options.push(quoteMarketTrade({ kind: 'buy', itemId, count: 1, season }, opts));
          options.push(quoteMarketTrade({ kind: 'sell', itemId, count: 1, season }, opts));
          for (const wantItemId of ITEM_IDS) {
            if (wantItemId !== itemId) {
              options.push(quoteMarketTrade({ kind: 'barter', itemId, wantItemId, count: Math.max(1, holdings[itemId]), season }, opts));
            }
          }
        }
        const legal = options.filter((quote) => quote.ok);
        const sell = legal.filter((quote) => quote.kind === 'sell').sort((a, b) => b.revenue - a.revenue)[0];
        const pick = sell ?? legal[step % legal.length];
        if (!pick) break;
        balance += pick.balanceDelta;
        pick.gives.forEach(({ itemId, count }) => { holdings[itemId] -= count; });
        pick.gets.forEach(({ itemId, count }) => { holdings[itemId] += count; });
        bestCredits = Math.max(bestCredits, balance);
      }
      expect(bestCredits).toBeLessThanOrEqual(AUTHORITY_MARKET_STARTING_BALANCE);
    }
  });
});

describe('market trade validation', () => {
  it('refuses a barter that would return less than one unit instead of rounding up', () => {
    const table = computeMarketPriceTable({ season: 'spring' });
    const cheapest = ITEM_IDS.reduce((a, b) => (table.prices[a].barterValue <= table.prices[b].barterValue ? a : b));
    const dearest = ITEM_IDS.reduce((a, b) => (table.prices[a].barterValue >= table.prices[b].barterValue ? a : b));
    const quote = quoteMarketTrade({ kind: 'barter', itemId: cheapest, wantItemId: dearest, count: 1, season: 'spring' });
    expect(quote.ok).toBe(false);
    expect(quote.code).toBe('BARTER_TOO_SMALL');
  });

  it('rejects client-submitted totals, unknown items, bad seasons, and bad counts', () => {
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'compost', season: 'spring', cost: 1 }).code).toBe('CLIENT_TRADE_TOTAL');
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'compost', season: 'spring', wantCount: 9 }).code).toBe('CLIENT_TRADE_TOTAL');
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'golden_trowel', season: 'spring' }).code).toBe('BAD_ITEM_ID');
    expect(quoteMarketTrade({ kind: 'steal', itemId: 'compost', season: 'spring' }).code).toBe('BAD_TRADE_KIND');
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'compost', season: 'monsoon' }).code).toBe('BAD_SEASON');
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'compost', season: 'spring', count: 0 }).code).toBe('BAD_ITEM_COUNT');
    expect(quoteMarketTrade({ kind: 'buy', itemId: 'compost', season: 'spring', count: 1.5 }).code).toBe('BAD_ITEM_COUNT');
  });
});

describe('MARKET_TRADE settles atomically in the store', () => {
  function storeWith(balance = 100) {
    const state = createGameState();
    state.campaign.currency.balance = balance;
    return new Store(state);
  }

  it('buys, sells, and barters as single actions with derived totals', () => {
    const store = storeWith(100);
    const spring = computeMarketPriceTable({ seed: store.getState().campaign.market.seed, season: 'spring' });
    store.dispatch({ type: Actions.MARKET_TRADE, payload: { kind: 'buy', itemId: 'compost', count: 2, season: 'spring', timestamp: 1 } });
    let campaign = store.getState().campaign;
    expect(campaign.currency.balance).toBe(100 - (spring.prices.compost.buy * 2));
    expect(getInventoryItemCount(campaign.inventory, 'compost')).toBeGreaterThanOrEqual(2);
    expect(campaign.market.transactions.at(-1)).toMatchObject({ type: 'buy', itemId: 'compost', count: 2 });

    const compostBefore = getInventoryItemCount(campaign.inventory, 'compost');
    store.dispatch({ type: Actions.MARKET_TRADE, payload: { kind: 'barter', itemId: 'compost', wantItemId: 'lettuce_seed', count: 1, season: 'spring', timestamp: 2 } });
    campaign = store.getState().campaign;
    expect(getInventoryItemCount(campaign.inventory, 'compost')).toBe(compostBefore - 1);
    expect(campaign.market.transactions.at(-1)).toMatchObject({ type: 'barter', offerItemId: 'compost', wantItemId: 'lettuce_seed' });
  });

  it('ignores a trade the player cannot afford and leaves state untouched', () => {
    const store = storeWith(0);
    const before = store.getState();
    store.dispatch({ type: Actions.MARKET_TRADE, payload: { kind: 'buy', itemId: 'watering_can', count: 1, season: 'spring' } });
    expect(store.getState().campaign.currency.balance).toBe(0);
    expect(store.getState().campaign.market.transactions).toEqual(before.campaign.market.transactions);
  });

  it('reconciles credits and item totals to a signed authority ack', () => {
    const state = createGameState();
    state.campaign.currency.balance = 40;
    state.campaign.inventory = addItemToInventoryState(state.campaign.inventory, 'compost', 5).inventory;
    const store = new Store(state);
    store.dispatch({ type: Actions.MARKET_RECONCILE, meta: { authorityAck: true }, payload: { balance: 55, itemTotals: { compost: 2 } } });
    const campaign = store.getState().campaign;
    expect(campaign.currency.balance).toBe(55);
    expect(getInventoryItemCount(campaign.inventory, 'compost')).toBe(2);
  });
});

describe('Node authority service settles MARKET_TRADE', () => {
  async function harness() {
    const service = createAuthorityService({
      ledgerStore: createMemoryLedgerStore(),
      now: () => Date.parse('2026-10-13T12:00:00.000Z'),
      secret: 'market-test-secret',
      sessionIdFactory: () => 'session-market',
    });
    await service.createSession({ sessionId: 'session-market' });
    let seq = 0;
    const send = (payload) => {
      seq += 1;
      return service.applyAction(createActionEnvelope({
        clientSeq: seq,
        clientSentAt: '2026-10-13T12:00:00.000Z',
        id: `market-${seq}`,
        idempotencyKey: `market-idem-${seq}`,
        payload,
        sessionId: 'session-market',
        type: Actions.MARKET_TRADE,
      }));
    };
    return { send };
  }

  it('derives the price server side and signs the settled balance', async () => {
    const { send } = await harness();
    const spring = computeMarketPriceTable({ season: 'spring' });
    const result = await send({ kind: 'buy', itemId: 'compost', count: 1, season: 'spring' });
    expect(result.ack.accepted).toBe(true);
    const trade = result.ack.authoritativePatch.data.lastMarketTrade;
    expect(trade.balance).toBe(AUTHORITY_MARKET_STARTING_BALANCE - spring.prices.compost.buy);
    expect(trade.itemTotals.compost).toBeGreaterThanOrEqual(1);
  });

  it('rejects client totals and unaffordable trades before mutation', async () => {
    const { send } = await harness();
    const forged = await send({ kind: 'buy', itemId: 'compost', count: 1, season: 'spring', cost: 0 });
    expect(forged.ack.accepted).toBe(false);
    expect(forged.ack.rejection.code).toBe('CLIENT_TRADE_TOTAL');

    const tooMany = await send({ kind: 'buy', itemId: 'watering_can', count: 99, season: 'spring' });
    expect(tooMany.ack.accepted).toBe(false);
    expect(tooMany.ack.rejection.code).toBe('NOT_ENOUGH_CREDITS');

    const sellNothing = await send({ kind: 'sell', itemId: 'pepper_seed', count: 1, season: 'spring' });
    expect(sellNothing.ack.accepted).toBe(false);
    expect(sellNothing.ack.rejection.code).toBe('NOT_ENOUGH_ITEM');
  });
});
