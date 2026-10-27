import { describe, expect, it } from 'vitest';

import { createSandboxState } from '../state.js';
import { Store } from '../store.js';
import { Inventory } from '../inventory.js';
import { SkillSystem } from '../skills.js';
import { CraftingSystem } from '../crafting.js';
import {
  COMPOST_RECIPE_ID,
  depositForCompost,
  getCompostBatchesAvailable,
  getCompostableItems,
} from './compost.js';

function make() {
  const store = new Store(createSandboxState());
  const inventory = new Inventory(store);
  const skillSystem = new SkillSystem(store);
  const crafting = new CraftingSystem(store, inventory, skillSystem);
  return { store, inventory, crafting };
}

describe('village compost', () => {
  it('uses the existing compost_batch crafting recipe', () => {
    const { crafting } = make();
    const recipe = crafting.getRecipe(COMPOST_RECIPE_ID);
    expect(recipe.output.itemId).toBe('compost');
  });

  it('lists the recipe materials as compostable items with counts', () => {
    const { inventory, crafting } = make();
    inventory.addItem('dried_leaves', 3);
    const items = getCompostableItems(crafting, inventory);
    expect(items.map((i) => i.itemId)).toEqual(['dried_leaves', 'plant_matter']);
    expect(items[0]).toMatchObject({ have: 3, perBatch: 2 });
    expect(items[1]).toMatchObject({ have: 0, perBatch: 1 });
  });

  it('does nothing without enough scraps', () => {
    const { inventory, crafting } = make();
    inventory.addItem('dried_leaves', 1);
    const result = depositForCompost(crafting, inventory);
    expect(result.made).toBe(0);
    expect(result.message).toBe('Not enough scraps yet.');
    expect(inventory.getItemCount('dried_leaves')).toBe(1);
  });

  it('deposits scraps and produces compost through crafting', () => {
    const { store, inventory, crafting } = make();
    inventory.addItem('dried_leaves', 2);
    inventory.addItem('plant_matter', 1);
    const xpBefore = store.getState().campaign.skills.crafting?.xp ?? 0;
    const result = depositForCompost(crafting, inventory);
    expect(result).toMatchObject({ made: 1, compostTotal: 1 });
    expect(inventory.getItemCount('dried_leaves')).toBe(0);
    expect(inventory.getItemCount('plant_matter')).toBe(0);
    expect(inventory.getItemCount('compost')).toBe(1);
    expect(store.getState().campaign.skills.crafting?.xp ?? 0).toBeGreaterThanOrEqual(xpBefore);
  });

  it('"all" makes as many batches as the scraps allow', () => {
    const { inventory, crafting } = make();
    inventory.addItem('dried_leaves', 7);
    inventory.addItem('plant_matter', 5);
    expect(getCompostBatchesAvailable(crafting, inventory)).toBe(3);
    const result = depositForCompost(crafting, inventory, { count: 'all' });
    expect(result.made).toBe(3);
    expect(inventory.getItemCount('compost')).toBe(3);
    expect(inventory.getItemCount('dried_leaves')).toBe(1);
    expect(inventory.getItemCount('plant_matter')).toBe(2);
    expect(getCompostBatchesAvailable(crafting, inventory)).toBe(0);
  });
});
