import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WORLD_MAP from 'specs/WORLD_MAP.json';

import { Actions } from '../game/store.js';
import { ZoneManager, DEFAULT_ZONE_GATES, buildZoneGateRequirements } from './zone-manager.js';

beforeEach(() => {
  vi.useFakeTimers();
  const body = {
    appendChild: vi.fn(),
  };
  vi.stubGlobal('document', {
    body,
    createElement() {
      return {
        style: {},
        remove: vi.fn(),
      };
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ZoneManager', () => {
  it('registers zones and reports the active zone after transition', async () => {
    const renderer = { render: vi.fn() };
    const store = { dispatch: vi.fn() };
    const tracker = { disposeAll: vi.fn() };
    const manager = new ZoneManager(renderer, store, tracker);

    const disposeA = vi.fn();
    const disposeB = vi.fn();
    manager.registerZone('player_plot', () => ({ scene: {}, camera: {}, dispose: disposeA }));
    manager.registerZone('neighborhood', () => ({ scene: {}, camera: {}, dispose: disposeB }));

    const promise = manager.transitionTo('player_plot');
    await vi.runAllTimersAsync();
    await promise;

    expect(manager.getActiveZone()).toBe('player_plot');
    expect(store.dispatch).toHaveBeenCalled();

    const second = manager.transitionTo('neighborhood', { x: 1, z: 2 });
    await vi.runAllTimersAsync();
    await second;

    expect(disposeA).toHaveBeenCalled();
    expect(tracker.disposeAll).toHaveBeenCalled();
    expect(manager.getActiveZone()).toBe('neighborhood');
  });

  it('registers active zone interactables and unregisters them on the next transition', async () => {
    const renderer = { render: vi.fn() };
    const store = {
      dispatch: vi.fn(),
      getState: () => ({ campaign: {}, season: { season: 'spring' } }),
    };
    const tracker = { disposeAll: vi.fn() };
    const manager = new ZoneManager(renderer, store, tracker);
    const register = vi.fn((id) => id);
    const unregister = vi.fn();

    manager.setInteractableRegistry({ register, unregister });
    manager.registerZone('player_plot', () => ({
      scene: {},
      camera: {},
      registerInteractables(callback) {
        callback({
          id: 'npc_old_gus',
          type: 'npc',
          label: 'Old Gus',
          position: { x: 1, y: 0, z: 2 },
          radius: 1,
        });
      },
      dispose: vi.fn(),
    }));
    manager.registerZone('neighborhood', () => ({
      scene: {},
      camera: {},
      registerInteractables(callback) {
        callback({
          id: 'stall_seeds',
          type: 'custom',
          label: 'Seed Stall',
          position: { x: -2, y: 0, z: 0 },
          radius: 1,
        });
      },
      dispose: vi.fn(),
    }));

    const first = manager.transitionTo('player_plot');
    await vi.runAllTimersAsync();
    await first;

    expect(register).toHaveBeenCalledWith(
      'active-zone:player_plot:npc_old_gus',
      expect.objectContaining({ label: 'Old Gus' }),
    );

    const second = manager.transitionTo('neighborhood');
    await vi.runAllTimersAsync();
    await second;

    expect(unregister).toHaveBeenCalledWith('active-zone:player_plot:npc_old_gus');
    expect(register).toHaveBeenCalledWith(
      'active-zone:neighborhood:stall_seeds',
      expect.objectContaining({ label: 'Seed Stall' }),
    );
  });

  it('renders the active zone through the configured renderer', async () => {
    const renderer = { render: vi.fn(), domElement: { clientWidth: 100, clientHeight: 80 } };
    const store = {
      dispatch: vi.fn(),
      getState: () => ({ campaign: {}, season: { season: 'spring' } }),
    };
    const tracker = { disposeAll: vi.fn() };
    const manager = new ZoneManager(renderer, store, tracker);
    const scene = {};
    const camera = {};

    manager.registerZone('player_plot', () => ({ scene, camera }));

    const transition = manager.transitionTo('player_plot');
    await vi.runAllTimersAsync();
    await transition;

    expect(manager.render()).toBe(true);
    expect(renderer.render).toHaveBeenCalledWith(scene, camera);
  });

  it('transitions when the live player position enters an exit during update', async () => {
    const renderer = { render: vi.fn() };
    const store = {
      dispatch: vi.fn(),
      getState: () => ({ campaign: {}, season: { season: 'spring' } }),
    };
    const tracker = { disposeAll: vi.fn() };
    const manager = new ZoneManager(renderer, store, tracker);
    const nextSpawn = { x: 0, y: 0, z: 7.5 };

    manager.registerZone('player_plot', () => ({ scene: {}, camera: {} }));
    manager.registerZone('neighborhood', () => ({ scene: {}, camera: {} }));
    manager.addZoneExit(
      'player_plot',
      { minX: -1, maxX: 1, minZ: -9, maxZ: -8 },
      'neighborhood',
      nextSpawn,
    );

    const transition = manager.transitionTo('player_plot');
    await vi.runAllTimersAsync();
    await transition;

    manager.update(1 / 60, { position: { x: 0, y: 0, z: -8.5 } });
    await vi.runAllTimersAsync();

    expect(manager.getActiveZone()).toBe('neighborhood');
    expect(store.dispatch).toHaveBeenCalledWith({
      type: Actions.ZONE_CHANGED,
      payload: { fromZone: 'player_plot', toZone: 'neighborhood', spawnPoint: nextSpawn },
    });
  });

  it('blocks gated zones until requirements are met', () => {
    const renderer = { render: vi.fn() };
    const store = {
      dispatch: vi.fn(),
      getState: () => ({
        campaign: {
          reputation: { old_gus: 25 },
          skills: { crafting: { level: 1 }, foraging: { level: 1 }, social: { level: 1 } },
          questLog: {},
          activeFestival: null,
        },
        season: {},
      }),
    };
    const tracker = { disposeAll: vi.fn() };
    const manager = new ZoneManager(renderer, store, tracker);

    expect(manager.canEnterZone('forest_edge').allowed).toBe(false);
    expect(manager.canEnterZone('meadow').allowed).toBe(false);
    expect(manager.canEnterZone('festival_grounds').allowed).toBe(false);
  });

  it('derives the default zone gate map from WORLD_MAP.json', () => {
    expect(DEFAULT_ZONE_GATES).toEqual(buildZoneGateRequirements(WORLD_MAP));
    expect(Object.keys(DEFAULT_ZONE_GATES).sort()).toEqual(Object.keys(WORLD_MAP.zones).sort());
    expect(DEFAULT_ZONE_GATES.player_plot).toEqual({});
    expect(DEFAULT_ZONE_GATES.neighborhood).toEqual({});
    expect(DEFAULT_ZONE_GATES.meadow).toEqual({
      message: WORLD_MAP.zones.meadow.gate.blockerMessage,
      skills: { foraging: 2 },
    });
    expect(DEFAULT_ZONE_GATES.riverside).toEqual({
      message: WORLD_MAP.zones.riverside.gate.blockerMessage,
      quests: ['gus_river_path'],
    });
    expect(DEFAULT_ZONE_GATES.forest_edge).toEqual({
      message: WORLD_MAP.zones.forest_edge.gate.blockerMessage,
      reputation: { old_gus: 'friend' },
    });
    expect(DEFAULT_ZONE_GATES.greenhouse).toEqual({
      message: WORLD_MAP.zones.greenhouse.gate.blockerMessage,
      skills: { crafting: 5 },
    });
    expect(DEFAULT_ZONE_GATES.market_square).toEqual({
      message: WORLD_MAP.zones.market_square.gate.blockerMessage,
      skills: { social: 2 },
    });
    expect(DEFAULT_ZONE_GATES.festival_grounds).toEqual({
      message: WORLD_MAP.zones.festival_grounds.gate.blockerMessage,
      festival: true,
    });
  });
});
