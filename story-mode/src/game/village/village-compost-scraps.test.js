import { describe, expect, it } from 'vitest';

import { createSandboxState, createGameState } from '../state.js';
import {
  ITEM_REGISTRY,
  addItemToInventoryState,
  createInventoryState,
  getInventoryItemCount,
} from '../inventory.js';
import {
  SEASON_END_DRIED_LEAVES,
  addCompostScrapsToInventory,
  awardHarvestCompostScraps,
  getHarvestCompostScraps,
} from './village-economy.js';

/** A backpack with no empty slot and `plantMatter` plant matter (stack max 99). */
function fullBackpack(plantMatter) {
  let inventory = createInventoryState();
  if (plantMatter > 0) inventory = addItemToInventoryState(inventory, 'plant_matter', plantMatter).inventory;
  for (const def of Object.values(ITEM_REGISTRY)) {
    if (!inventory.slots.some((slot) => !slot)) break;
    if (def.id === 'plant_matter' || def.id === 'dried_leaves') continue;
    const result = addItemToInventoryState(inventory, def.id, def.stackable ? (def.maxStack ?? 99) : 1);
    if (result.success) inventory = result.inventory;
  }
  expect(inventory.slots.some((slot) => !slot), 'test setup: backpack has no empty slot').toBe(false);
  return inventory;
}

describe('addCompostScrapsToInventory', () => {
  it('adds what fits and leaves the rest when the backpack is nearly full', () => {
    const inventory = fullBackpack(95); // plant_matter 95/99: room for 4, no room for dried leaves
    const scraps = { plant_matter: 12, dried_leaves: 2 };
    const out = addCompostScrapsToInventory(inventory, scraps);
    expect(out.added).toEqual({ plant_matter: 4, dried_leaves: 0 });
    expect(out.leftBehind).toEqual({ plant_matter: 8, dried_leaves: 2 });
    expect(out.full).toBe(true);
    expect(getInventoryItemCount(out.inventory, 'plant_matter')).toBe(99);
    expect(getInventoryItemCount(out.inventory, 'dried_leaves')).toBe(0);
    // the input state is not touched
    expect(getInventoryItemCount(inventory, 'plant_matter')).toBe(95);
  });

  it('adds everything, with the same keys as the scraps, when there is room', () => {
    const scraps = { plant_matter: 12, dried_leaves: SEASON_END_DRIED_LEAVES };
    const out = addCompostScrapsToInventory(createInventoryState(), scraps);
    expect(out.added).toEqual(scraps);
    expect(out.leftBehind).toEqual({});
    expect(out.full).toBe(false);
    expect(getInventoryItemCount(out.inventory, 'plant_matter')).toBe(12);
    expect(getInventoryItemCount(out.inventory, 'dried_leaves')).toBe(SEASON_END_DRIED_LEAVES);
  });

  it('keeps a zero-count kind in `added` and does not call it left behind', () => {
    const out = addCompostScrapsToInventory(createInventoryState(), { plant_matter: 0, dried_leaves: 2 });
    expect(out.added).toEqual({ plant_matter: 0, dried_leaves: 2 });
    expect(out.leftBehind).toEqual({});
    expect(out.full).toBe(false);
  });

  it('copes with missing scraps', () => {
    const inventory = createInventoryState();
    expect(addCompostScrapsToInventory(inventory, undefined)).toEqual({ inventory, added: {}, leftBehind: {}, full: false });
  });
});

describe('awardHarvestCompostScraps', () => {
  function sandboxCampaign(inventory) {
    const campaign = createSandboxState().campaign;
    if (inventory) campaign.inventory = inventory;
    return campaign;
  }

  it('pays a nearly full backpack partially, reports it, and still sets the flag', () => {
    const campaign = sandboxCampaign(fullBackpack(95));
    const result = { occupiedCount: 12 };
    expect(getHarvestCompostScraps(result)).toEqual({ plant_matter: 12, dried_leaves: 2 });
    const out = awardHarvestCompostScraps(campaign, result);
    expect(out).toEqual({ awarded: true, full: true });
    expect(getInventoryItemCount(campaign.inventory, 'plant_matter')).toBe(99); // +4
    expect(getInventoryItemCount(campaign.inventory, 'dried_leaves')).toBe(0); // +0
    expect(result.compostScrapsAwarded).toBe(true);
    expect(result.compostScraps).toEqual({ plant_matter: 4, dried_leaves: 0 });
  });

  it('never pays out twice, even after scraps were left behind', () => {
    const campaign = sandboxCampaign(fullBackpack(95));
    const result = { occupiedCount: 12 };
    awardHarvestCompostScraps(campaign, result);
    // the player makes room and the reveal is opened again
    campaign.inventory = createInventoryState();
    const again = awardHarvestCompostScraps(campaign, result);
    expect(again).toEqual({ awarded: false, full: false });
    expect(getInventoryItemCount(campaign.inventory, 'plant_matter')).toBe(0);
    expect(result.compostScraps).toEqual({ plant_matter: 4, dried_leaves: 0 });
  });

  it('pays everything in an empty backpack and reports nothing left behind', () => {
    const campaign = sandboxCampaign();
    const result = { occupiedCount: 3 };
    expect(awardHarvestCompostScraps(campaign, result)).toEqual({ awarded: true, full: false });
    expect(getInventoryItemCount(campaign.inventory, 'plant_matter')).toBe(3);
    expect(getInventoryItemCount(campaign.inventory, 'dried_leaves')).toBe(SEASON_END_DRIED_LEAVES);
    expect(result.compostScraps).toEqual({ plant_matter: 3, dried_leaves: SEASON_END_DRIED_LEAVES });
  });

  it('is Free Play only: Story campaigns and missing results are untouched', () => {
    const story = createGameState().campaign;
    const before = JSON.stringify(story.inventory);
    const result = { occupiedCount: 3 };
    expect(awardHarvestCompostScraps(story, result)).toEqual({ awarded: false, full: false });
    expect(JSON.stringify(story.inventory)).toBe(before);
    expect(result.compostScrapsAwarded).toBeUndefined();
    expect(awardHarvestCompostScraps(sandboxCampaign(), null)).toEqual({ awarded: false, full: false });
  });
});
