import recipeSpecData from 'specs/CRAFTING_RECIPES.json';

import { Actions } from './store.js';
import { addItemToInventoryState, getItemDef } from './inventory.js';

function meetsSkillRequirement(skillSystem, requirement = {}) {
  return Object.entries(requirement).every(([skillId, level]) => skillSystem.getLevel(skillId) >= level);
}

function adjustMaterialCount(count, reduction) {
  return Math.max(1, Math.ceil(count * (1 - reduction)));
}

export class CraftingSystem {
  constructor(store, inventory, skillSystem, recipeSpec = recipeSpecData) {
    this.store = store;
    this.inventory = inventory;
    this.skillSystem = skillSystem;
    this.recipeSpec = recipeSpec;
  }

  getRecipe(recipeId) {
    return (this.recipeSpec.recipes ?? []).find((entry) => entry.id === recipeId) ?? null;
  }

  getAvailableRecipes() {
    return (this.recipeSpec.recipes ?? []).filter((recipe) => meetsSkillRequirement(this.skillSystem, recipe.skillRequirement));
  }

  canCraft(recipeId) {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { craftable: false, missing: [{ itemId: recipeId, need: 1, have: 0 }] };
    }
    if (!meetsSkillRequirement(this.skillSystem, recipe.skillRequirement)) {
      return { craftable: false, missing: [{ itemId: 'skill_requirement', need: 1, have: 0 }] };
    }
    const reduction = this.skillSystem.getBuffValue('material_cost_reduction');
    const missing = (recipe.materials ?? []).map((material) => {
      const need = adjustMaterialCount(material.count, reduction);
      const have = this.inventory.getItemCount(material.itemId);
      return { itemId: material.itemId, need, have };
    }).filter((entry) => entry.have < entry.need);
    return { craftable: missing.length === 0, missing };
  }

  craft(recipeId) {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, producedItem: null, message: 'Recipe not found.' };
    }
    const check = this.canCraft(recipeId);
    if (!check.craftable) {
      return { success: false, producedItem: null, message: 'Missing materials.' };
    }

    const reduction = this.skillSystem.getBuffValue('material_cost_reduction');
    const adjustedMaterials = (recipe.materials ?? []).map((material) => ({
      ...material,
      count: adjustMaterialCount(material.count, reduction),
    }));

    const output = recipe.output ?? {};
    const itemDef = getItemDef(output.itemId);
    const durabilityBonus = this.skillSystem.getBuffValue('crafted_tool_max_durability');
    const masterwork = Boolean(this.skillSystem.getBuffValue('crafting_masterwork'));
    const craftedDurability = output.durability == null
      ? null
      : output.durability + (durabilityBonus || 0);

    const preview = addItemToInventoryState(
      this.store.getState().campaign.inventory,
      output.itemId,
      output.count ?? 1,
      {
        durability: craftedDurability,
        maxDurability: craftedDurability,
        metadata: masterwork ? { masterwork: true } : {},
      },
    );
    if (!preview.success) {
      return { success: false, producedItem: null, message: 'Inventory full.' };
    }

    adjustedMaterials.forEach((material) => {
      this.inventory.removeItem(material.itemId, material.count);
    });
    this.inventory.addItem(output.itemId, output.count ?? 1, {
      durability: craftedDurability,
      maxDurability: craftedDurability,
      metadata: masterwork ? { masterwork: true } : {},
    });

    const producedItem = {
      itemId: output.itemId,
      count: output.count ?? 1,
      durability: itemDef.category === 'tools' ? craftedDurability : null,
      masterwork,
    };

    this.store.dispatch({
      type: Actions.CRAFT_ITEM,
      payload: {
        recipeId,
        materialsConsumed: adjustedMaterials,
        itemProduced: producedItem,
        xpGained: recipe.craftingXP ?? 20,
      },
    });

    return {
      success: true,
      producedItem,
      message: `${recipe.name} crafted.`,
    };
  }

  getRecipesFor(itemId) {
    return (this.recipeSpec.recipes ?? []).filter((recipe) => recipe.output?.itemId === itemId);
  }
}
