import { describe, expect, it, vi } from 'vitest';

import { createGameState } from './state.js';
import { Store } from './store.js';
import { BiomeCropBridge } from './biome-crops.js';

function makeBridge(overrides = {}) {
  const state = createGameState();
  state.campaign.biomeCropsUnlocked = overrides.biomeCropsUnlocked ?? [];
  const store = new Store(state);
  const foragingSystem = {};
  return { store, bridge: new BiomeCropBridge(store, foragingSystem) };
}

describe('BiomeCropBridge', () => {
  it('getBiomeCropsForZone returns correct crops for forest_edge', () => {
    const { bridge } = makeBridge();
    const crops = bridge.getBiomeCropsForZone('forest_edge');
    expect(crops).toContain('wild_garlic');
    expect(crops).toContain('shiitake_mushroom');
    expect(crops).toHaveLength(2);
  });

  it('getBiomeCropsForZone returns empty for zones with no biome crops', () => {
    const { bridge } = makeBridge();
    expect(bridge.getBiomeCropsForZone('player_plot')).toEqual([]);
    expect(bridge.getBiomeCropsForZone('unknown_zone')).toEqual([]);
  });

  it('getZoneForCrop returns correct zone', () => {
    const { bridge } = makeBridge();
    expect(bridge.getZoneForCrop('wild_garlic')).toBe('forest_edge');
    expect(bridge.getZoneForCrop('shiitake_mushroom')).toBe('forest_edge');
    expect(bridge.getZoneForCrop('watercress')).toBe('riverside');
    expect(bridge.getZoneForCrop('prairie_onion')).toBe('meadow');
  });

  it('getZoneForCrop returns null for non-biome crops', () => {
    const { bridge } = makeBridge();
    expect(bridge.getZoneForCrop('cherry_tom')).toBeNull();
    expect(bridge.getZoneForCrop('basil')).toBeNull();
    expect(bridge.getZoneForCrop('nonexistent_crop')).toBeNull();
  });

  it('isCropBiomeExclusive correctly identifies biome crops', () => {
    const { bridge } = makeBridge();
    expect(bridge.isCropBiomeExclusive('wild_garlic')).toBe(true);
    expect(bridge.isCropBiomeExclusive('shiitake_mushroom')).toBe(true);
    expect(bridge.isCropBiomeExclusive('watercress')).toBe(true);
    expect(bridge.isCropBiomeExclusive('prairie_onion')).toBe(true);
    expect(bridge.isCropBiomeExclusive('cherry_tom')).toBe(false);
    expect(bridge.isCropBiomeExclusive('basil')).toBe(false);
  });

  it('unlockBiomeCrop adds crop to unlocked list', () => {
    const { store, bridge } = makeBridge();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const result = bridge.unlockBiomeCrop('wild_garlic');
    expect(result).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'UNLOCK_BIOME_CROP',
      payload: { cropId: 'wild_garlic' },
    });
  });

  it('unlockBiomeCrop returns false for non-biome crops', () => {
    const { store, bridge } = makeBridge();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const result = bridge.unlockBiomeCrop('cherry_tom');
    expect(result).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('unlockBiomeCrop returns false for already-unlocked crops', () => {
    const { store, bridge } = makeBridge({ biomeCropsUnlocked: ['wild_garlic'] });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const result = bridge.unlockBiomeCrop('wild_garlic');
    expect(result).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('isCropUnlocked checks both biome and standard unlocked lists', () => {
    const { bridge } = makeBridge({ biomeCropsUnlocked: ['watercress'] });
    expect(bridge.isCropUnlocked('watercress')).toBe(true);
    // Standard crops from chapter 1 are in cropsUnlocked
    const state = bridge.store.getState();
    if (state.campaign.cropsUnlocked.length > 0) {
      expect(bridge.isCropUnlocked(state.campaign.cropsUnlocked[0])).toBe(true);
    }
    expect(bridge.isCropUnlocked('nonexistent_crop_xyz')).toBe(false);
  });

  it('getBiomeCropRecipes returns recipes that include biome crops', () => {
    const { bridge } = makeBridge();
    const recipes = bridge.getBiomeCropRecipes();
    expect(recipes).toHaveProperty('foragers_stew');
    expect(recipes.foragers_stew.crops).toContain('wild_garlic');
  });

  it('getForageableBiomeCrops filters by season availability', () => {
    const { bridge } = makeBridge();
    const springCrops = bridge.getForageableBiomeCrops('forest_edge', 'spring');
    expect(springCrops).toContain('wild_garlic');
    expect(springCrops).toContain('shiitake_mushroom');

    const winterCrops = bridge.getForageableBiomeCrops('forest_edge', 'winter');
    expect(winterCrops).toEqual([]);
  });

  it('getForageableBiomeCrops returns empty for zones with no biome crops', () => {
    const { bridge } = makeBridge();
    expect(bridge.getForageableBiomeCrops('player_plot', 'spring')).toEqual([]);
  });

  it('dispose clears references', () => {
    const { bridge } = makeBridge();
    bridge.dispose();
    expect(bridge.store).toBeNull();
    expect(bridge.foragingSystem).toBeNull();
  });
});
