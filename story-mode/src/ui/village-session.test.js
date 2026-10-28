// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameState, createSandboxState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import { Inventory } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { createMockTriggerEmitter } from '../game/village/village-trigger-adapter.js';
import { getVillageLayout } from '../scene/village/village-layout.js';
import { createVillageSession, getHomePlotExit, isGardenInputBlocked, resolveVillageRestorePose } from './village-session.js';

const layout = getVillageLayout();
const sessions = [];
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; });
afterEach(() => { while (sessions.length) sessions.pop()?.dispose(); });

/** ZoneManager + ui-binder travelToZone stand-in: swaps a fresh village instance in on every visit. */
function makeWorld(state) {
  const store = new Store(state);
  const instances = [];
  let active = state.campaign.worldState?.currentZone ?? 'player_plot';
  let instance = null;
  const zoneManager = {
    getActiveZone: () => active,
    getActiveZoneInstance: () => instance,
  };
  function arrive(zoneId, spawnPoint) {
    active = zoneId;
    instance = null;
    if (zoneId === 'village') {
      instance = createMockTriggerEmitter({ pose: { x: spawnPoint?.x ?? 0, z: spawnPoint?.z ?? 0, facingY: 0 } });
      instance.setTapToMoveEnabled = vi.fn();
      instances.push(instance);
    }
    store.dispatch({ type: Actions.ZONE_CHANGED, payload: { toZone: zoneId, spawnPoint } });
  }
  const travelToZone = vi.fn(async (zoneId, { spawnPoint = null } = {}) => {
    await Promise.resolve();
    arrive(zoneId, spawnPoint);
    return true;
  });
  const inventory = new Inventory(store);
  const craftingSystem = new CraftingSystem(store, inventory, new SkillSystem(store));
  return { store, zoneManager, travelToZone, arrive, instances, inventory, craftingSystem, current: () => instance };
}

function start(world) {
  const session = createVillageSession({
    store: world.store,
    zoneManager: world.zoneManager,
    travelToZone: world.travelToZone,
    container: document.getElementById('app'),
    inventory: world.inventory,
    craftingSystem: world.craftingSystem,
    saveIntervalMs: 0,
  });
  if (session) sessions.push(session);
  return session;
}

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };
const homeTrigger = () => {
  const t = layout.interactables.find((i) => i.id === 'plot_home');
  return { id: t.id, type: t.type, prompt: t.prompt, exit: t.exit };
};

describe('village session (yard <-> village travel)', () => {
  it('is Free Play only', () => {
    const world = makeWorld(createGameState());
    expect(start(world)).toBeNull();
  });

  it('yard shows Back to village; it travels to the village on the home plot exit', async () => {
    const world = makeWorld(createSandboxState());
    const session = start(world);
    const back = document.getElementById('village-back');
    expect(back).not.toBeNull();
    back.click();
    await flush();
    const exit = getHomePlotExit(layout);
    expect(world.travelToZone).toHaveBeenLastCalledWith('village', { spawnPoint: { x: exit.x, y: 0, z: exit.z, facing: exit.facingY } });
    expect(world.current().getPlayerPose()).toEqual({ x: exit.x, z: exit.z, facingY: exit.facingY });
    expect(document.getElementById('village-back')).toBeNull();
    expect(world.store.getState().campaign.village.insidePlot).toBe(false);
    expect(session.getDebugState()).toMatchObject({ zone: 'village', bound: true, insidePlot: false });
  });

  it('enter_plot in the village travels to the yard and back, 10 times, with no stale prompt', async () => {
    const world = makeWorld(createSandboxState());
    const session = start(world);
    for (let i = 0; i < 10; i += 1) {
      document.getElementById('village-back').click();
      await flush();
      const prompt = document.getElementById('village-prompt');
      expect(prompt.hidden).toBe(true); // landed on the exit spot, outside the plot trigger
      world.current().enter(homeTrigger());
      expect(prompt.hidden).toBe(false);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      await flush();
      expect(session.getDebugState()).toMatchObject({ zone: 'player_plot', bound: false, insidePlot: true, activeTrigger: null });
      expect(document.querySelectorAll('#village-back')).toHaveLength(1);
    }
    expect(world.instances).toHaveLength(10);
    world.instances.slice(0, -1).forEach((inst) => expect(inst.listenerCount()).toBe(0));
  });

  it('a shop panel locks movement and tap-to-move until it closes', async () => {
    const world = makeWorld(createSandboxState());
    const session = start(world);
    document.getElementById('village-back').click();
    await flush();
    world.current().enter({ id: 'shop_stand', type: 'open_shop' });
    expect(session.isMovementLocked()).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    expect(session.isMovementLocked()).toBe(true);
    expect(world.current().setTapToMoveEnabled).toHaveBeenLastCalledWith(false);
    document.querySelector('#shop-dismiss').click();
    expect(session.isMovementLocked()).toBe(false);
    expect(world.current().setTapToMoveEnabled).toHaveBeenLastCalledWith(true);
  });

  it('saves the village pose and restores it on the next load', async () => {
    const world = makeWorld(createSandboxState());
    const session = start(world);
    document.getElementById('village-back').click();
    await flush();
    world.current().setPlayerPose({ x: -20, z: 10, facingY: 1.2 });
    expect(session.savePosition()).toBe(true);
    const saved = world.store.getState();
    expect(saved.campaign.village).toEqual({ position: [-20, 10], facingY: 1.2, insidePlot: false });
    expect(saved.campaign.worldState.currentZone).toBe('village');
    session.dispose();
    sessions.length = 0;
    document.body.innerHTML = '<div id="app"></div>';

    // Reload: main.js transitions to the saved zone after bindUI.
    const reloaded = makeWorld(JSON.parse(JSON.stringify(saved)));
    const next = start(reloaded);
    expect(document.getElementById('village-back')).toBeNull();
    reloaded.arrive('village', saved.campaign.worldState.lastSpawnPoint);
    expect(reloaded.current().getPlayerPose()).toEqual({ x: -20, z: 10, facingY: 1.2 });
    expect(next.getDebugState()).toMatchObject({ zone: 'village', insidePlot: false });
  });

  it('a save made inside the garden reopens the garden', async () => {
    const state = createSandboxState();
    state.campaign.worldState = { ...state.campaign.worldState, currentZone: 'village' };
    state.campaign.village = { position: [-20, 10], facingY: 0, insidePlot: true };
    const world = makeWorld(state);
    start(world);
    await flush();
    expect(world.travelToZone).toHaveBeenCalledWith('player_plot');
    expect(document.getElementById('village-back')).not.toBeNull();
  });

  it('restore falls back to the village spawn for out-of-bounds or blocked saves', () => {
    const spawn = { x: layout.spawn.x, z: layout.spawn.z, facingY: layout.spawn.facing };
    expect(resolveVillageRestorePose({ position: [9999, 0], facingY: 0 }, layout)).toMatchObject(spawn);
    const shop = layout.blockers.find((b) => b.id === 'shop_stand');
    const cx = (shop.minX + shop.maxX) / 2;
    const cz = (shop.minZ + shop.maxZ) / 2;
    expect(resolveVillageRestorePose({ position: [cx, cz], facingY: 0 }, layout)).toMatchObject(spawn);
    expect(resolveVillageRestorePose(undefined, layout)).toMatchObject({ insidePlot: false });
  });

  it('Story Mode state is untouched by SET_VILLAGE_STATE', () => {
    const store = new Store(createGameState());
    const before = store.getState().campaign.village;
    store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: { position: [1, 2], facingY: 0, insidePlot: true } });
    expect(store.getState().campaign.village).toEqual(before);
  });
});

describe('garden phase input in the village', () => {
  it('is blocked only in the village', () => {
    expect(isGardenInputBlocked('village')).toBe(true);
    expect(isGardenInputBlocked('player_plot')).toBe(false);
    expect(isGardenInputBlocked('neighborhood')).toBe(false);
  });
});
