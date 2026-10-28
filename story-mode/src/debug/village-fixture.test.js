import { describe, expect, it } from 'vitest';
import { createVillageFixtureState, VILLAGE_FIXTURE_DEFAULTS } from './village-fixture.js';

function count(inventoryState, itemId) {
  return inventoryState.slots.filter(Boolean).filter((slot) => slot.itemId === itemId)
    .reduce((sum, slot) => sum + (slot.count ?? 1), 0);
}

describe('village fixture save', () => {
  it('is a Free Play save with coins to spend and scraps for one or more compost batches', () => {
    const state = createVillageFixtureState();
    expect(state.campaign.sandbox).toBe(true);
    expect(state.campaign.currency.balance).toBe(VILLAGE_FIXTURE_DEFAULTS.tokens);
    expect(state.campaign.tokens).toBe(0);
    expect(count(state.campaign.inventory, 'dried_leaves')).toBe(4);
    expect(count(state.campaign.inventory, 'plant_matter')).toBe(2);
    // Starting tools are kept.
    expect(count(state.campaign.inventory, 'watering_can')).toBe(1);
  });

  it('accepts overrides', () => {
    const state = createVillageFixtureState({ tokens: 5, driedLeaves: 0 });
    expect(state.campaign.currency.balance).toBe(5);
    expect(count(state.campaign.inventory, 'dried_leaves')).toBe(0);
  });
});
