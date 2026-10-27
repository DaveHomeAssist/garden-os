// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState, createSandboxState } from '../game/state.js';
import { Store } from '../game/store.js';
import { Inventory } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { createMockTriggerEmitter } from '../game/village/village-trigger-adapter.js';
import { attachVillageHooks } from './village-hooks.js';

const attached = [];
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(() => {
  while (attached.length) attached.pop()?.dispose();
});

function make(state = createSandboxState()) {
  const store = new Store(state);
  const inventory = new Inventory(store);
  const craftingSystem = new CraftingSystem(store, inventory, new SkillSystem(store));
  const engine = createMockTriggerEmitter({ pose: { x: 1, z: 1, facingY: 0 } });
  const container = document.getElementById('root');
  const toolHUD = { setVisible: vi.fn() };
  const deps = {
    container, store, inventory, craftingSystem, toolHUD,
    setMovementEnabled: vi.fn(), enterGardenScreen: vi.fn(), exitGardenScreen: vi.fn(),
  };
  const hooks = attachVillageHooks({ engine, ...deps });
  if (hooks) attached.push(hooks);
  return { store, engine, container, hooks, deps };
}

const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('village hooks (UI wiring with a mock engine)', () => {
  it('is Free Play only', () => {
    const { hooks } = make(createGameState());
    expect(hooks).toBeNull();
  });

  it('shows the prompt and opens the shop on Seeds with all tabs via E', () => {
    const { engine, container } = make();
    engine.enter({ id: 'shop_stand', type: 'open_shop', prompt: 'Seed stand — buy seeds' });
    const prompt = container.querySelector('#village-prompt');
    expect(prompt.hidden).toBe(false);
    expect(prompt.textContent).toContain('Seed stand — buy seeds');
    key('e');
    const shop = container.querySelector('#shop-panel');
    expect(shop).not.toBeNull();
    expect([...shop.querySelectorAll('[data-shop-tab]')].map((b) => b.dataset.shopTab)).toEqual(['seeds', 'tools', 'recipes']);
    expect(shop.querySelector('.palette-title').textContent).toBe('Seed stand');
    expect(prompt.hidden).toBe(true);
    shop.querySelector('#shop-dismiss').click();
    expect(prompt.hidden).toBe(false);
  });

  it('seed box opens the shop with only the Seeds tab; tool shed opens Tools + tool HUD', () => {
    const { engine, container, deps } = make();
    engine.enter({ id: 'seed_box', type: 'open_seeds' });
    container.querySelector('#village-prompt').click();
    let shop = container.querySelector('#shop-panel');
    expect([...shop.querySelectorAll('[data-shop-tab]')].map((b) => b.dataset.shopTab)).toEqual(['seeds']);
    shop.querySelector('#shop-dismiss').click();
    engine.leave({ id: 'seed_box', type: 'open_seeds' });

    engine.enter({ id: 'tool_shed', type: 'open_tools' });
    key('Enter');
    shop = container.querySelector('#shop-panel');
    expect([...shop.querySelectorAll('[data-shop-tab]')].map((b) => b.dataset.shopTab)).toEqual(['tools']);
    expect(deps.toolHUD.setVisible).toHaveBeenLastCalledWith(true);
    shop.querySelector('#shop-dismiss').click();
    expect(deps.toolHUD.setVisible).toHaveBeenLastCalledWith(false);
  });

  it('compost bin opens the compost panel', () => {
    const { engine, container } = make();
    engine.enter({ id: 'compost_bin', type: 'open_compost' });
    key(' ');
    expect(container.querySelector('#compost-panel')).not.toBeNull();
  });

  it('plot enter shows Back to village; Esc and the button both return and save', () => {
    const { engine, container, store, deps } = make();
    engine.enter({ id: 'plot_home', type: 'enter_plot', exit: { x: 0, z: 6, facingY: 3 } });
    key('e');
    expect(deps.enterGardenScreen).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#village-back').textContent).toContain('Back to village');
    expect(store.getState().campaign.village.insidePlot).toBe(true);
    key('Escape');
    expect(deps.exitGardenScreen).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#village-back')).toBeNull();
    expect(store.getState().campaign.village).toEqual({ position: [0, 6], facingY: 3, insidePlot: false });

    key('e');
    container.querySelector('#village-back').click();
    expect(deps.exitGardenScreen).toHaveBeenCalledTimes(2);
  });

  it('neighbour plots show the reserved prompt and open nothing', () => {
    const { engine, container } = make();
    engine.enter({ id: 'np_1', type: 'neighbour_plot_reserved' });
    expect(container.querySelector('#village-prompt').textContent).toContain('Reserved for a neighbour');
    key('e');
    expect(container.querySelector('#shop-panel')).toBeNull();
    expect(container.querySelector('#compost-panel')).toBeNull();
    expect(container.querySelector('#village-back')).toBeNull();
  });

  it('dispose removes listeners and DOM', () => {
    const { engine, container, hooks } = make();
    hooks.dispose();
    attached.length = 0;
    expect(engine.listenerCount()).toBe(0);
    expect(container.querySelector('#village-prompt')).toBeNull();
  });
});
