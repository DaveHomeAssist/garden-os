import { describe, expect, it, vi } from 'vitest';

import {
  createMockTriggerEmitter,
  createVillageTriggerAdapter,
  normalizeTriggerEvent,
} from './village-trigger-adapter.js';
import {
  DEFAULT_TRIGGER_PROMPTS,
  VILLAGE_TRIGGER_TYPES,
  createVillageTriggerRouter,
} from './village-trigger-router.js';

const T = {
  plot: { id: 'plot_home', type: 'enter_plot', prompt: 'Your garden — tend your bed', exit: { x: 0, z: 6, facingY: Math.PI } },
  shop: { id: 'shop_stand', type: 'open_shop', prompt: 'Seed stand — buy seeds' },
  seeds: { id: 'seed_box', type: 'open_seeds', prompt: 'Seed box — check your seeds' },
  compost: { id: 'compost_bin', type: 'open_compost', prompt: 'Compost bin — add scraps' },
  tools: { id: 'tool_shed', type: 'open_tools', prompt: 'Tool shed — swap tools' },
  np1: { id: 'np_1', type: 'neighbour_plot_reserved', prompt: 'Reserved for a neighbour' },
};

function makeUi() {
  const closers = {};
  const ui = {
    showPrompt: vi.fn(),
    hidePrompt: vi.fn(),
    setMovementEnabled: vi.fn(),
    openShop: vi.fn((opts) => { closers.shop = opts.onClose; }),
    openTools: vi.fn((opts) => { closers.tools = opts.onClose; }),
    openCompost: vi.fn((opts) => { closers.compost = opts.onClose; }),
    enterPlot: vi.fn((opts) => { closers.plot = opts.onExit; }),
    exitPlot: vi.fn(),
  };
  return { ui, closers };
}

function setup({ initialVillage = null } = {}) {
  const engine = createMockTriggerEmitter({ pose: { x: 1, z: 2, facingY: 0.5 } });
  const adapter = createVillageTriggerAdapter(engine);
  const { ui, closers } = makeUi();
  const saves = [];
  const router = createVillageTriggerRouter({
    adapter, ui, initialVillage, saveVillage: (v) => saves.push(v),
  });
  return { engine, ui, closers, saves, router };
}

describe('village trigger adapter', () => {
  it('normalizes (phase, trigger) and event-object listener shapes', () => {
    expect(normalizeTriggerEvent('enter', T.shop)).toMatchObject({ phase: 'enter', trigger: { id: 'shop_stand', type: 'open_shop' } });
    expect(normalizeTriggerEvent({ phase: 'leave', trigger: T.shop })).toMatchObject({ phase: 'leave' });
    expect(normalizeTriggerEvent({ kind: 'enter', ...T.tools })).toMatchObject({ phase: 'enter', trigger: { id: 'tool_shed' } });
    expect(normalizeTriggerEvent('hover', T.shop)).toBeNull();
    expect(normalizeTriggerEvent('enter', { type: 'open_shop' })).toBeNull();
  });

  it('supports engine.on("trigger") and unsubscribes', () => {
    const listeners = new Set();
    const engine = { on: (_n, fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
    const adapter = createVillageTriggerAdapter(engine);
    const seen = [];
    const off = adapter.subscribe((e) => seen.push(e));
    listeners.forEach((fn) => fn('enter', T.seeds));
    off();
    expect(seen).toHaveLength(1);
    expect(listeners.size).toBe(0);
  });

  it('throws on an engine without a trigger API', () => {
    expect(() => createVillageTriggerAdapter({}).subscribe(() => {})).toThrow(/onTrigger/);
  });
});

describe('village trigger router', () => {
  it('shows the prompt on enter and hides it on leave', () => {
    const { engine, ui, router } = setup();
    engine.enter(T.shop);
    expect(ui.showPrompt).toHaveBeenLastCalledWith({ id: 'shop_stand', type: 'open_shop', label: 'Seed stand — buy seeds' });
    expect(router.getActiveTrigger().id).toBe('shop_stand');
    engine.leave(T.shop);
    expect(router.getActiveTrigger()).toBeNull();
    expect(ui.hidePrompt).toHaveBeenCalled();
    expect(router.activate()).toBe(false);
  });

  it('uses the default prompt copy when the placement has none', () => {
    const { engine, ui } = setup();
    engine.enter({ id: 'np_2', type: 'neighbour_plot_reserved' });
    expect(ui.showPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ label: 'Reserved for a neighbour' }));
    expect(DEFAULT_TRIGGER_PROMPTS.neighbour_plot_reserved).toBe('Reserved for a neighbour');
  });

  it('open_shop opens the full shop on the Seeds tab and locks movement until closed', () => {
    const { engine, ui, closers, router } = setup();
    engine.enter(T.shop);
    expect(router.activate()).toBe(true);
    expect(ui.openShop).toHaveBeenCalledWith(expect.objectContaining({ tab: 'seeds', seedsOnly: false }));
    expect(ui.setMovementEnabled).toHaveBeenLastCalledWith(false);
    expect(router.getOpenPanel()).toBe('shop');
    // A second press while open does nothing (no stacked panels).
    expect(router.activate()).toBe(false);
    closers.shop();
    expect(router.getOpenPanel()).toBeNull();
    expect(ui.setMovementEnabled).toHaveBeenLastCalledWith(true);
    // Still inside the radius: prompt is back, panel does not auto-reopen.
    expect(ui.openShop).toHaveBeenCalledTimes(1);
    expect(ui.showPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'shop_stand' }));
  });

  it('open_seeds opens the shop limited to Seeds', () => {
    const { engine, ui, router } = setup();
    engine.enter(T.seeds);
    router.activate();
    expect(ui.openShop).toHaveBeenCalledWith(expect.objectContaining({ tab: 'seeds', seedsOnly: true }));
    expect(router.getOpenPanel()).toBe('seeds');
  });

  it('open_tools and open_compost open their panels', () => {
    const { engine, ui, closers, router } = setup();
    engine.enter(T.tools);
    router.activate();
    expect(ui.openTools).toHaveBeenCalledTimes(1);
    closers.tools();
    engine.leave(T.tools);
    engine.enter(T.compost);
    router.activate();
    expect(ui.openCompost).toHaveBeenCalledTimes(1);
    expect(router.getOpenPanel()).toBe('compost');
  });

  it('neighbour_plot_reserved is prompt-only: no panel, no save, no movement change', () => {
    const { engine, ui, saves, router } = setup();
    engine.enter(T.np1);
    expect(router.activate()).toBe(false);
    expect(ui.openShop).not.toHaveBeenCalled();
    expect(ui.openTools).not.toHaveBeenCalled();
    expect(ui.openCompost).not.toHaveBeenCalled();
    expect(ui.enterPlot).not.toHaveBeenCalled();
    expect(ui.setMovementEnabled).not.toHaveBeenCalled();
    expect(saves).toHaveLength(0);
  });

  it('ignores unknown trigger types', () => {
    const { engine, ui, router } = setup();
    engine.enter({ id: 'x', type: 'visit_plot' });
    expect(router.getActiveTrigger()).toBeNull();
    expect(ui.showPrompt).not.toHaveBeenCalled();
  });

  it('latest entered overlapping trigger wins and falls back on leave', () => {
    const { engine, router } = setup();
    engine.enter(T.shop);
    engine.enter(T.seeds);
    expect(router.getActiveTrigger().id).toBe('seed_box');
    engine.leave(T.seeds);
    expect(router.getActiveTrigger().id).toBe('shop_stand');
  });

  it('enter_plot saves position + insidePlot, Back to village / Esc exits at the plot exit spot', () => {
    const { engine, ui, closers, saves, router } = setup();
    engine.enter(T.plot);
    expect(router.activate()).toBe(true);
    expect(router.isInsidePlot()).toBe(true);
    expect(ui.enterPlot).toHaveBeenCalledWith(expect.objectContaining({ triggerId: 'plot_home' }));
    expect(saves.at(-1)).toEqual({ position: [1, 2], facingY: 0.5, insidePlot: true });
    expect(ui.hidePrompt).toHaveBeenCalled();

    closers.plot(); // "Back to village"
    expect(ui.exitPlot).toHaveBeenCalledTimes(1);
    expect(router.isInsidePlot()).toBe(false);
    expect(engine.getPlayerPose()).toEqual({ x: 0, z: 6, facingY: Math.PI });
    expect(saves.at(-1)).toEqual({ position: [0, 6], facingY: Math.PI, insidePlot: false });
    expect(ui.setMovementEnabled).toHaveBeenLastCalledWith(true);

    router.activate();
    expect(router.handleEscape()).toBe(true);
    expect(router.isInsidePlot()).toBe(false);
    expect(router.handleEscape()).toBe(false); // nothing left for Esc: pause can have it
  });

  it('enters and leaves the plot 10 times with no leaks', () => {
    const { engine, ui, router } = setup();
    engine.enter(T.plot);
    for (let i = 0; i < 10; i += 1) {
      expect(router.activate()).toBe(true);
      expect(router.activate()).toBe(false); // no double-enter
      expect(router.handleEscape()).toBe(true);
    }
    expect(ui.enterPlot).toHaveBeenCalledTimes(10);
    expect(ui.exitPlot).toHaveBeenCalledTimes(10);
    expect(router.isInsidePlot()).toBe(false);
    expect(engine.listenerCount()).toBe(1);
  });

  it('without an exit spot returns the player to where they entered', () => {
    const { engine, router } = setup();
    engine.enter({ id: 'plot_home', type: 'enter_plot' });
    router.activate();
    engine.setPlayerPose({ x: 99, z: 99 });
    router.exitPlot();
    expect(engine.getPlayerPose()).toMatchObject({ x: 1, z: 2, facingY: 0.5 });
  });

  it('restore() reopens the garden screen when the save says insidePlot', () => {
    const { ui, router } = setup({ initialVillage: { position: [3, 4], facingY: 1, insidePlot: true } });
    expect(router.restore()).toBe('plot');
    expect(ui.enterPlot).toHaveBeenCalledWith(expect.objectContaining({ restored: true }));
    router.handleEscape();
    expect(router.isInsidePlot()).toBe(false);
  });

  it('restore() places the player at the saved village pose', () => {
    const { engine, router } = setup({ initialVillage: { position: [3, 4], facingY: 1, insidePlot: false } });
    expect(router.restore()).toBe('village');
    expect(engine.getPlayerPose()).toEqual({ x: 3, z: 4, facingY: 1 });
  });

  it('registerFromPlacements sends only handled triggers to the engine', () => {
    const { engine, router } = setup();
    const list = router.registerFromPlacements([
      { id: 'plot_home', trigger: { type: 'enter_plot', radius: 1.8 } },
      { id: 'np_1', trigger: { type: 'neighbour_plot_reserved' } },
      { id: 'tree_1' },
      { id: 'mystery', trigger: { type: 'dance' } },
    ]);
    expect(list.map((t) => t.id)).toEqual(['plot_home', 'np_1']);
    expect(engine.getRegistered()).toEqual([
      { id: 'plot_home', type: 'enter_plot', prompt: DEFAULT_TRIGGER_PROMPTS.enter_plot },
      { id: 'np_1', type: 'neighbour_plot_reserved', prompt: 'Reserved for a neighbour' },
    ]);
  });

  it('dispose() unsubscribes from the engine', () => {
    const { engine, router } = setup();
    router.dispose();
    expect(engine.listenerCount()).toBe(0);
    engine.enter(T.shop);
    expect(router.getActiveTrigger()).toBeNull();
  });

  it('exposes the full trigger vocabulary', () => {
    expect(Object.values(VILLAGE_TRIGGER_TYPES).sort()).toEqual([
      'enter_plot', 'neighbour_plot_reserved', 'open_compost', 'open_seeds', 'open_shop', 'open_tools',
    ]);
  });
});
