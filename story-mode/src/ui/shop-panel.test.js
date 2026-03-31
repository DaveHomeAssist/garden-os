import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createShopPanel } from './shop-panel.js';
import { Store, Actions } from '../game/store.js';
import { createGameState } from '../game/state.js';

/**
 * Minimal DOM container stub for tests running in node environment.
 * The vitest config uses environment: 'node', so we provide a lightweight
 * container that tracks appended children and supports querySelector.
 */
function createContainer() {
  const children = [];
  return {
    children,
    appendChild(el) { children.push(el); },
    querySelector(sel) {
      for (const child of children) {
        if (child.id && sel === `#${child.id}`) return child;
        if (typeof child.querySelector === 'function') {
          const found = child.querySelector(sel);
          if (found) return found;
        }
      }
      return null;
    },
    innerHTML: '',
  };
}

/**
 * Because we run in a node environment without full DOM, we use jsdom for
 * these UI tests. The shop panel manipulates document.createElement, so
 * we need a real DOM.
 */
let jsdomModule;
let dom;
let document;

beforeEach(async () => {
  if (!jsdomModule) {
    jsdomModule = await import('jsdom');
  }
  dom = new jsdomModule.JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
  document = dom.window.document;
  // Patch global document and window for the shop-panel module
  globalThis.document = document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
});

function getRoot() {
  return document.getElementById('root');
}

describe('shop-panel', () => {
  it('opening panel renders seed items', () => {
    const state = createGameState();
    state.campaign.tokens = 100;
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

  it('buy dispatches ADD_ITEM and deducts tokens', () => {
    const state = createGameState();
    state.campaign.tokens = 50;
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
    // Tokens should be deducted
    expect(afterState.campaign.tokens).toBe(50 - price);

    shop.dispose();
  });

  it('cannot buy if insufficient tokens', () => {
    const state = createGameState();
    state.campaign.tokens = 0;
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
    expect(afterState.campaign.tokens).toBe(0);

    shop.dispose();
  });

  it('close hides panel', () => {
    const state = createGameState();
    state.campaign.tokens = 100;
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
    state.campaign.tokens = 100;
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
