import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ZoneManager } from './zone-manager.js';

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
});
