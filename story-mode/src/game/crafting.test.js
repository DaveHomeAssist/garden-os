import { describe, expect, it } from 'vitest';

import { createGameState } from './state.js';
import { Store } from './store.js';
import { Inventory } from './inventory.js';
import { SkillSystem } from './skills.js';
import { CraftingSystem } from './crafting.js';

function makeCrafting(level = 1) {
  const state = createGameState();
  state.campaign.skills.crafting = { xp: 0, level };
  const store = new Store(state);
  const inventory = new Inventory(store);
  const skillSystem = new SkillSystem(store);
  return { store, inventory, skillSystem, crafting: new CraftingSystem(store, inventory, skillSystem) };
}

describe('CraftingSystem', () => {
  it('reports missing materials when unavailable', () => {
    const { crafting } = makeCrafting();
    const result = crafting.canCraft('basic_fertilizer');
    expect(result.craftable).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('crafts an item and consumes materials', () => {
    const { inventory, crafting } = makeCrafting();
    inventory.addItem('compost', 2);
    inventory.addItem('plant_matter', 3);
    const result = crafting.craft('basic_fertilizer');
    expect(result.success).toBe(true);
    expect(inventory.getItemCount('fertilizer_bag')).toBeGreaterThan(0);
    expect(inventory.getItemCount('compost')).toBe(0);
  });

  it('applies crafting material reduction at level 3', () => {
    const { inventory, crafting } = makeCrafting(3);
    inventory.addItem('compost', 2);
    inventory.addItem('plant_matter', 3);
    expect(crafting.canCraft('basic_fertilizer').craftable).toBe(true);
  });

  it('applies crafted tool durability bonus and masterwork metadata at high skill', () => {
    const { store, inventory, crafting } = makeCrafting(10);
    inventory.addItem('scrap_metal', 1);
    inventory.addItem('plant_fiber', 2);
    inventory.addItem('crystal_shard', 1);

    const result = crafting.craft('improved_watering_can');

    expect(result.success).toBe(true);
    expect(result.producedItem).toMatchObject({
      durability: 110,
      itemId: 'watering_can',
      masterwork: true,
    });
    const craftedSlot = store.getState().campaign.inventory.slots.find((slot) => (
      slot?.itemId === 'watering_can' && slot.durability === 110
    ));
    expect(craftedSlot).toMatchObject({
      durability: 110,
      maxDurability: 110,
      metadata: { masterwork: true },
    });
    expect(inventory.getItemCount('scrap_metal')).toBe(0);
    expect(store.getState().campaign.craftedItems.watering_can).toBe(1);
  });

  it('shows gated recipes only when skill requirements are met', () => {
    const base = makeCrafting(1).crafting.getAvailableRecipes().map((recipe) => recipe.id);
    const advanced = makeCrafting(5).crafting.getAvailableRecipes().map((recipe) => recipe.id);
    expect(base.includes('soil_scanner')).toBe(false);
    expect(advanced.includes('soil_scanner')).toBe(true);
  });
});
