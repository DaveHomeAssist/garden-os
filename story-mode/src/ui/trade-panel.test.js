// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createTradePanel, buildPriceHistoryRows } from './trade-panel.js';
import { Actions, Store } from '../game/store.js';
import { createGameState } from '../game/state.js';
import { getInventoryItemCount } from '../game/inventory.js';
import { getMarketOffer, getTraderStock } from '../data/market-schedule.js';

// Monday 2026-10-12 local noon: Lila trades at the market on Mondays.
const MONDAY = new Date(2026, 9, 12, 12, 0, 0).getTime();

beforeEach(() => {
  document.body.replaceChildren();
});

function openPanel({ balance = 100, zoneId = 'market_square', season = 'spring' } = {}) {
  const state = createGameState();
  state.campaign.currency.balance = balance;
  state.season.season = season;
  const store = new Store(state);
  const panel = createTradePanel(document.body, { zoneId, now: () => MONDAY });
  panel.open({ name: 'Seed Exchange' }, store);
  return { panel, store, sheet: document.getElementById('trade-panel') };
}

function button(sheet, label) {
  return [...sheet.querySelectorAll('button')].find((node) => node.textContent === label);
}

describe('trade panel', () => {
  it('shows scheduled traders by name with their rotating stock', () => {
    const { sheet } = openPanel();
    const offer = getMarketOffer(createGameState(), 'market_square', { now: MONDAY });
    expect(offer.traders.map((trader) => trader.traderId)).toContain('lila');
    expect(sheet.textContent).toContain('Lila');
    expect(sheet.textContent).not.toContain('old_gus');
  });

  it('previews a purchase and commits it only on Confirm', () => {
    const { sheet, store } = openPanel();
    const before = store.getState().campaign.currency.balance;
    button(sheet, 'Buy').click();
    const preview = document.querySelector('.trade-panel__preview');
    expect(preview.textContent).toMatch(/Balance after/);
    expect(store.getState().campaign.currency.balance).toBe(before);

    button(document.getElementById('trade-panel'), 'Confirm').click();
    expect(store.getState().campaign.currency.balance).toBeLessThan(before);
    expect(store.getState().campaign.market.transactions.at(-1).type).toBe('buy');
  });

  it('lets the player choose what to barter for and refuses an underpriced offer', () => {
    const { store } = openPanel();
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'lettuce_seed', count: 1 } });
    const panel = createTradePanel(document.body, { now: () => MONDAY });
    document.getElementById('trade-panel')?.remove();
    panel.open({ name: 'Exchange' }, store);
    const sheet = document.getElementById('trade-panel');
    const select = sheet.querySelector('.trade-panel__select');
    expect(select.options.length).toBeGreaterThan(1);
    select.value = 'watering_can';
    button(sheet, 'Barter').click();
    const preview = document.querySelector('.trade-panel__preview');
    expect(preview.classList.contains('is-blocked')).toBe(true);
    expect(button(document.getElementById('trade-panel'), 'Confirm').disabled).toBe(true);
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'lettuce_seed')).toBeGreaterThanOrEqual(1);
  });

  it('records one price history entry per season and renders them', () => {
    const rows = buildPriceHistoryRows([
      { season: 'spring', prices: { compost: { buy: 12 } } },
      { season: 'summer', prices: { compost: { buy: 11 } } },
    ]);
    expect(rows.seasons).toEqual(['spring', 'summer']);
    expect(rows.rows[0].buys).toEqual([12, 11]);

    const { panel, store } = openPanel();
    panel.close();
    panel.open({ name: 'Again' }, store);
    expect(store.getState().campaign.market.priceHistory.filter((entry) => entry.season === 'spring')).toHaveLength(1);
  });

  it('rotates trader stock deterministically by day and season', () => {
    const monday = getTraderStock('lila', { season: 'spring', daySlot: 1 });
    expect(getTraderStock('lila', { season: 'spring', daySlot: 1 })).toEqual(monday);
    const allDays = new Set([1, 3, 5].flatMap((daySlot) => getTraderStock('lila', { season: 'spring', daySlot })));
    expect(allDays.size).toBeGreaterThan(monday.length);
  });

  it('builds the sheet without innerHTML', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/ui/trade-panel.js'), 'utf8');
    expect(source).not.toMatch(/innerHTML/);
  });
});
