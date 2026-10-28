// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { createShopPanel } from './shop-panel.js';
import { Store, Actions } from '../game/store.js';
import { createGameState } from '../game/state.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

function getRoot() {
  return document.getElementById('root');
}

describe('shop-panel', () => {
  it('opening panel renders seed items', () => {
    const state = createGameState();
    state.campaign.currency.balance = 100;
    const store = new Store(state);
    const container = getRoot();
    const shop = createShopPanel(container);

    shop.open({ name: 'Test Stall', chapter: 1 }, store);

    expect(shop.isOpen()).toBe(true);
    const panel = container.querySelector('#shop-panel');
    expect(panel).not.toBeNull();
    // Should display at least one buy button for seeds
    const buyButtons = panel.querySelectorAll('[data-buy-item]');
    expect(buyButtons.length).toBeGreaterThan(0);

    shop.dispose();
  });

  it('buy deducts coins from currency.balance and adds the item', () => {
    const state = createGameState();
    state.campaign.currency.balance = 50;
    const store = new Store(state);
    const container = getRoot();
    const shop = createShopPanel(container);

    shop.open({ name: 'Test Stall', chapter: 1 }, store);

    const panel = container.querySelector('#shop-panel');
    const buyButton = panel.querySelector('[data-buy-item]');
    expect(buyButton).not.toBeNull();

    const itemId = buyButton.dataset.buyItem;
    const price = Number(buyButton.dataset.buyPrice);

    // Click the buy button
    buyButton.click();

    const afterState = store.getState();
    // Coins come out of the shared balance; the seed goes in the backpack.
    expect(afterState.campaign.currency.balance).toBe(50 - price);
    expect(afterState.campaign.tokens).toBe(0);
    const owned = afterState.campaign.inventory.slots.filter(Boolean)
      .filter((slot) => slot.itemId === itemId).reduce((n, slot) => n + (slot.count ?? 1), 0);
    expect(owned).toBe(1);
    expect(afterState.campaign.currency.ledger.at(-1)).toMatchObject({ type: 'village_shop', itemId, delta: -price });
    expect(panel.querySelector('[data-shop-message]').textContent).toContain('Bought');

    shop.dispose();
  });

  it('cannot buy with too few coins', () => {
    const state = createGameState();
    state.campaign.currency.balance = 0;
    const store = new Store(state);
    const container = getRoot();
    const shop = createShopPanel(container);

    shop.open({ name: 'Test Stall', chapter: 1 }, store);

    const panel = container.querySelector('#shop-panel');
    const buyButtons = panel.querySelectorAll('[data-buy-item]');
    // All buy buttons should be disabled
    const allDisabled = Array.from(buyButtons).every((btn) => btn.disabled);
    expect(allDisabled).toBe(true);

    // Click a disabled button and confirm no token change
    if (buyButtons.length > 0) {
      buyButtons[0].click();
    }
    const afterState = store.getState();
    expect(afterState.campaign.currency.balance).toBe(0);

    shop.dispose();
  });

  it('close hides panel', () => {
    const state = createGameState();
    state.campaign.currency.balance = 100;
    const store = new Store(state);
    const container = getRoot();
    const shop = createShopPanel(container);

    shop.open({ name: 'Test Stall', chapter: 1 }, store);
    expect(shop.isOpen()).toBe(true);
    expect(container.querySelector('#shop-panel')).not.toBeNull();

    shop.close();

    expect(shop.isOpen()).toBe(false);
    expect(container.querySelector('#shop-panel')).toBeNull();
  });

  it('switches tabs to tools and recipes', () => {
    const state = createGameState();
    state.campaign.currency.balance = 100;
    const store = new Store(state);
    const container = getRoot();
    const shop = createShopPanel(container);

    shop.open({ name: 'Test Stall', chapter: 1 }, store);

    const panel = container.querySelector('#shop-panel');

    // Switch to tools tab
    const toolsTab = panel.querySelector('[data-shop-tab="tools"]');
    expect(toolsTab).not.toBeNull();
    toolsTab.click();

    // Should now show tool items — look for watering_can
    const toolButtons = panel.querySelectorAll('[data-buy-item]');
    const toolIds = Array.from(toolButtons).map((btn) => btn.dataset.buyItem);
    expect(toolIds).toContain('watering_can');

    // Switch to recipes tab
    const recipesTab = panel.querySelector('[data-shop-tab="recipes"]');
    expect(recipesTab).not.toBeNull();
    recipesTab.click();

    const recipeButtons = panel.querySelectorAll('[data-buy-item]');
    expect(recipeButtons.length).toBeGreaterThan(0);

    shop.dispose();
  });
});
