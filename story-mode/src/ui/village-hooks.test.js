// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState, createSandboxState } from '../game/state.js';
import { Store } from '../game/store.js';
import { Inventory } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { createMockTriggerEmitter } from '../game/village/village-trigger-adapter.js';
import { attachVillageHooks, createVillageEngineFacade } from './village-hooks.js';
import { InputManager } from '../input/input-manager.js';

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
    showToast: vi.fn(),
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
    key('e');
    shop = container.querySelector('#shop-panel');
    expect([...shop.querySelectorAll('[data-shop-tab]')].map((b) => b.dataset.shopTab)).toEqual(['tools']);
    expect(deps.toolHUD.setVisible).toHaveBeenLastCalledWith(true);
    shop.querySelector('#shop-dismiss').click();
    expect(deps.toolHUD.setVisible).toHaveBeenLastCalledWith(false);
  });

  it('compost bin opens the compost panel', () => {
    const { engine, container } = make();
    engine.enter({ id: 'compost_bin', type: 'open_compost' });
    key('E');
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

  it('neighbour plots show the reserved prompt, toast on E, and open nothing', () => {
    const { engine, container, deps } = make();
    engine.enter({ id: 'np_1', type: 'neighbour_plot_reserved' });
    expect(container.querySelector('#village-prompt').textContent).toContain('Reserved for a neighbour');
    key('e');
    expect(deps.showToast).toHaveBeenCalledWith('Neighbours coming soon');
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

describe('village keys leave Enter / Space to the existing actions', () => {
  let input;
  afterEach(() => input?.dispose?.());

  function withInput() {
    const ctx = make();
    input = new InputManager(ctx.container, { keyboardTarget: window });
    // Same bindings as ui-binder.js
    input.registerAction('cutscene_next', { keys: ['Enter', 'Space'] });
    input.registerAction('advance', { keys: ['Enter'] });
    input.registerAction('select_cell', { keys: ['Enter', 'Space'], pointer: true, touch: true });
    input.registerAction('interact', { keys: ['e'] });
    const fired = [];
    ['cutscene_next', 'advance', 'select_cell', 'interact'].forEach((name) => input.on(name, () => fired.push(name)));
    return { ...ctx, fired };
  }
  const press = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  it('Enter reaches select_cell, cutscene_next and advance while a village trigger is active', () => {
    const { engine, container, fired } = withInput();
    engine.enter({ id: 'shop_stand', type: 'open_shop' });
    press('Enter');
    expect(fired).toEqual(expect.arrayContaining(['cutscene_next', 'advance', 'select_cell']));
    expect(container.querySelector('#shop-panel')).toBeNull();
    expect(container.querySelector('#village-prompt').hidden).toBe(false);
  });

  it('Space reaches select_cell and cutscene_next while a village trigger is active', () => {
    const { engine, container, fired } = withInput();
    engine.enter({ id: 'compost_bin', type: 'open_compost' });
    press(' ');
    expect(fired).toEqual(expect.arrayContaining(['cutscene_next', 'select_cell']));
    expect(container.querySelector('#compost-panel')).toBeNull();
  });

  it('E opens the village panel and is consumed; with no trigger active E still reaches interact', () => {
    const { engine, container, fired } = withInput();
    press('e');
    expect(fired).toEqual(['interact']);
    fired.length = 0;
    engine.enter({ id: 'shop_stand', type: 'open_shop' });
    press('e');
    expect(container.querySelector('#shop-panel')).not.toBeNull();
    expect(fired).toEqual([]);
  });

  it('E inside the plot (garden screen) is not taken by the village', () => {
    const { engine, deps, fired } = withInput();
    engine.enter({ id: 'plot_home', type: 'enter_plot' });
    press('e');
    expect(deps.enterGardenScreen).toHaveBeenCalledTimes(1);
    fired.length = 0;
    press('e');
    expect(fired).toEqual(['interact']);
  });
});

describe('createVillageEngineFacade', () => {
  it('forwards triggers from the bound instance and sends leaves on unbind', () => {
    const facade = createVillageEngineFacade();
    const events = [];
    facade.onTrigger((phase, trigger) => events.push(`${phase}:${trigger.id}`));
    const a = createMockTriggerEmitter();
    facade.registerInteractables([{ id: 'shop_stand', type: 'open_shop', prompt: 'x' }]);
    facade.bind(a);
    expect(a.getRegistered()).toEqual([{ id: 'shop_stand', type: 'open_shop', prompt: 'x' }]);
    a.enter({ id: 'shop_stand', type: 'open_shop' });
    facade.unbind();
    expect(events).toEqual(['enter:shop_stand', 'leave:shop_stand']);
    expect(a.listenerCount()).toBe(0);
    a.enter({ id: 'shop_stand', type: 'open_shop' });
    expect(events).toHaveLength(2);
  });

  it('pose calls go to the bound instance and are no-ops when unbound', () => {
    const facade = createVillageEngineFacade();
    expect(facade.getPlayerPose()).toBeNull();
    facade.setPlayerPose({ x: 1, z: 1, facingY: 0 });
    const b = createMockTriggerEmitter({ pose: { x: 3, z: 4, facingY: 1 } });
    facade.bind(b);
    expect(facade.getPlayerPose()).toEqual({ x: 3, z: 4, facingY: 1 });
    facade.setPlayerPose({ x: 5, z: 6, facingY: 2 });
    expect(b.getPlayerPose()).toEqual({ x: 5, z: 6, facingY: 2 });
  });
});
