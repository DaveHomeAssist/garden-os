// @vitest-environment jsdom
// A pose restored (or spawned) inside a station trigger must still show the prompt
// and let E open the station: the scene re-seeds triggers silently on a pose snap,
// so the facade has to tell the router where the player already stands.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSandboxState } from '../game/state.js';
import { Store } from '../game/store.js';
import { Inventory } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { createVillageScene } from '../scene/village/village-scene.js';
import { getVillageLayout } from '../scene/village/village-layout.js';
import { attachVillageHooks, createVillageEngineFacade } from './village-hooks.js';
import { resolveVillageRestorePose } from './village-session.js';

const QUALITY = { tier: 'low', choice: 'low', source: 'test' };
const layout = getVillageLayout();
const live = [];

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(() => {
  while (live.length) live.pop()();
});

const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
const trigger = (id) => layout.interactables.find((item) => item.id === id);

/** Same order as the game: hooks attach to the facade first, the scene binds later. */
function mount({ bindScene = true } = {}) {
  const store = new Store(createSandboxState());
  const inventory = new Inventory(store);
  const craftingSystem = new CraftingSystem(store, inventory, new SkillSystem(store));
  const scene = createVillageScene({ renderer: null, quality: QUALITY, overlayParent: null, loadProps: false });
  const facade = createVillageEngineFacade();
  const container = document.getElementById('root');
  const hooks = attachVillageHooks({
    engine: facade, store, inventory, craftingSystem, container, toolHUD: { setVisible: vi.fn() },
    setMovementEnabled: vi.fn(), enterGardenScreen: vi.fn(), exitGardenScreen: vi.fn(), showToast: vi.fn(),
  });
  live.push(() => { hooks.dispose(); facade.dispose(); scene.dispose(); });
  if (bindScene) facade.bind(scene);
  const prompt = () => container.querySelector('#village-prompt');
  return { store, scene, facade, hooks, container, prompt };
}

function walkInto(scene, item) {
  scene.setPlayerState({ position: { x: item.position.x + item.radius + 3, z: item.position.z }, facing: 0 });
  scene.update(1 / 60);
  scene.setPlayerState({ position: { ...item.position }, facing: 0 });
  scene.update(1 / 60);
}

describe('restoring a saved pose inside a station', () => {
  for (const [id, panel] of [['shop_stand', '#shop-panel'], ['compost_bin', '#compost-panel']]) {
    it(`${id}: the prompt shows and E opens the station after a reload`, () => {
      const item = trigger(id);

      // First session: walk in and open the station. Opening a panel saves the pose.
      const first = mount();
      walkInto(first.scene, item);
      expect(first.prompt().hidden).toBe(false);
      key('e');
      expect(first.container.querySelector(panel)).not.toBeNull();
      const saved = first.store.getState().campaign.village;
      expect(Math.hypot(saved.position[0] - item.position.x, saved.position[1] - item.position.z)).toBeLessThanOrEqual(item.radius);
      while (live.length) live.pop()();
      document.body.innerHTML = '<div id="root"></div>';

      // Reload: build a fresh village and restore the saved pose, as bindActiveZone() does.
      const second = mount();
      const pose = resolveVillageRestorePose(saved, layout);
      expect({ x: pose.x, z: pose.z }).toEqual({ x: saved.position[0], z: saved.position[1] });
      second.facade.setPlayerPose(pose);
      expect(second.prompt().hidden).toBe(false);
      expect(second.container.querySelector(panel)).toBeNull();

      // The walk sim keeps feeding the same position every frame.
      for (let frame = 0; frame < 5; frame += 1) {
        second.scene.setPlayerState({ position: { x: pose.x, z: pose.z }, facing: pose.facingY });
        second.scene.update(1 / 60);
      }
      expect(second.prompt().hidden).toBe(false);
      key('e');
      expect(second.container.querySelector(panel)).not.toBeNull();
    });
  }
});

describe('arriving in the village already inside a station', () => {
  it('binding a scene whose player already stands in a trigger shows the prompt', () => {
    const item = trigger('shop_stand');
    const mounted = mount({ bindScene: false });
    mounted.scene.setPlayerPose({ x: item.position.x, z: item.position.z, facingY: 0 });
    mounted.facade.bind(mounted.scene);
    expect(mounted.prompt().hidden).toBe(false);
    key('e');
    expect(mounted.container.querySelector('#shop-panel')).not.toBeNull();
  });
});

describe('facade trigger sync', () => {
  function watch(facade) {
    const events = [];
    facade.onTrigger((phase, t) => events.push(`${phase}:${t.id}`));
    return events;
  }

  it('does not repeat an enter the scene already forwarded', () => {
    const { scene, facade } = mount();
    const events = watch(facade);
    const item = trigger('shop_stand');
    walkInto(scene, item);
    facade.setPlayerPose({ x: item.position.x, z: item.position.z, facingY: 0 });
    expect(events).toEqual(['enter:shop_stand']);
  });

  it('sends a leave when a pose snap moves the player out of a trigger the router knew', () => {
    const { scene, facade } = mount();
    const events = watch(facade);
    const item = trigger('shop_stand');
    walkInto(scene, item);
    facade.setPlayerPose({ x: layout.spawn.x, z: layout.spawn.z, facingY: 0 });
    expect(events).toEqual(['enter:shop_stand', 'leave:shop_stand']);
  });

  it('scene.getInsideTriggers reports the payload of the trigger a pose snap lands in', () => {
    const { scene } = mount({ bindScene: false });
    const item = trigger('compost_bin');
    expect(scene.getInsideTriggers()).toEqual([]);
    scene.setPlayerPose({ x: item.position.x, z: item.position.z, facingY: 0 });
    expect(scene.getInsideTriggers()).toEqual([
      expect.objectContaining({ id: 'compost_bin', type: 'open_compost', radius: item.radius, position: { x: item.position.x, z: item.position.z } }),
    ]);
  });
});
