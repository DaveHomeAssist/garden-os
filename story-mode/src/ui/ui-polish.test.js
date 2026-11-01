// @vitest-environment jsdom
// fix/ui-aesthetics-pass: the shop uses field-kit classes (no hard-coded dark
// inline colours), and the polish sheet keeps motion behind reduced-motion.
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createShopPanel } from './shop-panel.js';
import { Store } from '../game/store.js';
import { createGameState } from '../game/state.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../../assets/css/ui-polish.css'), 'utf8');
const mainJs = readFileSync(join(here, '../main.js'), 'utf8');

beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; });

function openShop(balance) {
  const state = createGameState();
  state.campaign.currency.balance = balance;
  const container = document.getElementById('root');
  const shop = createShopPanel(container);
  shop.open({ name: 'Seed Stand', chapter: 1 }, new Store(state));
  return { shop, panel: container.querySelector('#shop-panel'), container };
}

describe('ui polish: shop sheet', () => {
  it('renders with classes, not dark inline colours', () => {
    const { shop, panel, container } = openShop(100);
    expect(panel.classList.contains('shop-panel')).toBe(true);
    expect(panel.getAttribute('style') ?? '').toBe('');
    expect(container.querySelector('#shop-backdrop').classList.contains('shop-backdrop')).toBe(true);
    expect(panel.innerHTML).not.toMatch(/#3a2516|#f7f2ea|rgba\(247,\s*242,\s*234/);
    expect(panel.querySelectorAll('.shop-item-card').length).toBeGreaterThan(0);
    const tabs = [...panel.querySelectorAll('.shop-tab')];
    expect(tabs.filter((t) => t.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    shop.dispose();
  });

  it('marks cards the player cannot afford and disables their Buy', () => {
    const { shop, panel } = openShop(0);
    const cards = [...panel.querySelectorAll('.shop-item-card')];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.classList.contains('is-unaffordable')).toBe(true);
      expect(card.querySelector('.shop-buy-btn').disabled).toBe(true);
    }
    shop.dispose();
  });

  it('shows the purchase message in a highlighted status line', () => {
    const { shop, panel } = openShop(100);
    panel.querySelector('.shop-buy-btn:not([disabled])').click();
    const msg = document.querySelector('#shop-panel [data-shop-message]');
    expect(msg.classList.contains('has-message')).toBe(true);
    expect(msg.textContent).toMatch(/Bought/);
    shop.dispose();
  });
});

describe('ui polish: stylesheet', () => {
  it('is loaded by main.js', () => {
    expect(mainJs).toMatch(/import '\.\.\/assets\/css\/ui-polish\.css'/);
  });

  it('keeps transforms and keyframe motion behind prefers-reduced-motion', () => {
    const noPref = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    const reduce = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(noPref).toBeGreaterThan(-1);
    expect(reduce).toBeGreaterThan(-1);
    const outside = css.slice(0, noPref);
    expect(outside).not.toMatch(/animation:\s*ui-/);
    expect(outside).not.toMatch(/:hover\s*\{[^}]*transform/);
  });

  it('drops the hairline rule under the play HUD', () => {
    expect(css).toMatch(/\[data-story-screen="play"\] #hud \{\s*border-bottom: 0;/);
  });
});
