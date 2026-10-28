// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { CAMPAIGN_SCHEMA_VERSION, createGameState, createSandboxState } from '../state.js';
import { loadCampaign, migrateCampaignSave, prepareCampaignForSave, saveCampaign } from '../save.js';
import { Actions, Store } from '../store.js';
import {
  VILLAGE_DEFAULT_SPAWN,
  createDefaultVillageState,
  normalizeVillageState,
  resolveVillageSpawn,
} from './village-state.js';

const DEFAULT = { position: [VILLAGE_DEFAULT_SPAWN.x, VILLAGE_DEFAULT_SPAWN.z], facingY: VILLAGE_DEFAULT_SPAWN.facingY, insidePlot: false };

beforeEach(() => {
  localStorage.clear();
});

describe('save schema v10: village', () => {
  it('is schema v10 and new campaigns start at the village spawn', () => {
    expect(CAMPAIGN_SCHEMA_VERSION).toBe(10);
    expect(createSandboxState().campaign.village).toEqual(DEFAULT);
    expect(createDefaultVillageState()).toEqual(DEFAULT);
  });

  it('migrates a v9 Free Play save with no village to the default spawn', () => {
    localStorage.setItem('gos-freeplay-campaign', JSON.stringify({
      version: 9,
      sandbox: true,
      gameMode: 'story',
      currentChapter: 99,
      worldState: { currentZone: 'player_plot', visitedZones: ['player_plot'], lastSpawnPoint: null },
      inventory: { slots: [], capacity: 20, tier: 1 },
      tokens: 42,
    }));
    const loaded = loadCampaign('freeplay');
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(10);
    expect(loaded.village).toEqual(DEFAULT);
    expect(loaded.tokens).toBe(42);
    expect(loaded.worldState.currentZone).toBe('player_plot');
  });

  it('migrates a v9 Story save too (village is inert there)', () => {
    localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify({ version: 9, currentChapter: 3 }));
    const loaded = loadCampaign(0);
    expect(loaded.version).toBe(10);
    expect(loaded.village).toEqual(DEFAULT);
    expect(loaded.currentChapter).toBe(3);
  });

  it('round-trips a saved village position', () => {
    const state = createSandboxState();
    state.campaign.village = { position: [4.25, -3.5], facingY: 1.57, insidePlot: true };
    saveCampaign(state.campaign, 'freeplay');
    const loaded = loadCampaign('freeplay');
    expect(loaded.village).toEqual({ position: [4.25, -3.5], facingY: 1.57, insidePlot: true });
    expect(JSON.parse(localStorage.getItem('gos-freeplay-campaign')).version).toBe(10);
  });

  it('repairs garbage village data instead of failing the load', () => {
    expect(migrateCampaignSave({ version: 10, village: { position: ['a', null], facingY: 'x', insidePlot: 'yes' } }).village)
      .toEqual(DEFAULT);
    expect(normalizeVillageState({ position: [1, 2] })).toEqual({ position: [1, 2], facingY: VILLAGE_DEFAULT_SPAWN.facingY, insidePlot: false });
    expect(normalizeVillageState('nope')).toEqual(DEFAULT);
    expect(prepareCampaignForSave({ version: 9 }).village).toEqual(DEFAULT);
  });
});

describe('SET_VILLAGE_STATE', () => {
  it('updates the village in Free Play', () => {
    const store = new Store(createSandboxState());
    store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: { position: [2, 3], facingY: 0.25, insidePlot: true } });
    expect(store.getState().campaign.village).toEqual({ position: [2, 3], facingY: 0.25, insidePlot: true });
    store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: { insidePlot: false } });
    expect(store.getState().campaign.village).toEqual({ position: [2, 3], facingY: 0.25, insidePlot: false });
  });

  it('is ignored in Story Mode', () => {
    const store = new Store(createGameState());
    const before = store.getState().campaign.village;
    store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: { position: [9, 9] } });
    expect(store.getState().campaign.village).toEqual(before);
  });
});

describe('resolveVillageSpawn', () => {
  const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
  const blockers = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }];

  it('uses the saved position when valid', () => {
    expect(resolveVillageSpawn({ position: [5, 5], facingY: 2 }, { bounds, blockers }))
      .toEqual({ x: 5, z: 5, facingY: 2, insidePlot: false });
  });

  it('falls back to the spawn when out of bounds or inside a blocker', () => {
    expect(resolveVillageSpawn({ position: [50, 0] }, { bounds })).toMatchObject({ x: VILLAGE_DEFAULT_SPAWN.x, z: VILLAGE_DEFAULT_SPAWN.z });
    expect(resolveVillageSpawn({ position: [0, 0] }, { bounds, blockers })).toMatchObject({ x: VILLAGE_DEFAULT_SPAWN.x, z: VILLAGE_DEFAULT_SPAWN.z });
  });
});
