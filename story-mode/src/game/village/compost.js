/**
 * Compost bin rules (Free Play village). The conversion rate lives in the
 * existing crafting recipe `compost_batch` (specs/CRAFTING_RECIPES.json) and
 * every deposit goes through CraftingSystem.craft(), so material spend,
 * skill cost reductions, XP and authority routing stay in one place.
 */
import { getItemDef } from '../inventory.js';

export const COMPOST_RECIPE_ID = 'compost_batch';
export const COMPOST_ITEM_ID = 'compost';

// Mirrors CraftingSystem's adjustMaterialCount so the panel shows the real cost.
function materialNeed(craftingSystem, count) {
  const reduction = Number(craftingSystem.skillSystem?.getBuffValue?.('material_cost_reduction')) || 0;
  return Math.max(1, Math.ceil(count * (1 - reduction)));
}

/** What the bin accepts and how many of each the player carries. */
export function getCompostableItems(craftingSystem, inventory) {
  const recipe = craftingSystem.getRecipe(COMPOST_RECIPE_ID);
  if (!recipe) return [];
  return (recipe.materials ?? []).map((material) => {
    const def = getItemDef(material.itemId);
    return {
      itemId: material.itemId,
      name: def.name,
      icon: def.icon ?? '📦',
      have: inventory.getItemCount(material.itemId),
      perBatch: materialNeed(craftingSystem, material.count),
    };
  });
}

/** How many batches the player could make right now (the bin's "fill level"). */
export function getCompostBatchesAvailable(craftingSystem, inventory, cap = 99) {
  const recipe = craftingSystem.getRecipe(COMPOST_RECIPE_ID);
  if (!recipe) return 0;
  let batches = cap;
  for (const material of recipe.materials ?? []) {
    const need = materialNeed(craftingSystem, material.count);
    batches = Math.min(batches, Math.floor(inventory.getItemCount(material.itemId) / need));
  }
  return Math.max(0, batches);
}

/**
 * Deposit scraps and make compost. `count` batches (default 1, 'all' = as
 * many as possible). Returns { made, compostTotal, message }.
 */
export function depositForCompost(craftingSystem, inventory, { count = 1 } = {}) {
  const target = count === 'all'
    ? getCompostBatchesAvailable(craftingSystem, inventory)
    : Math.max(0, Math.floor(Number(count) || 0));
  let made = 0;
  let lastMessage = null;
  for (let i = 0; i < target; i += 1) {
    const result = craftingSystem.craft(COMPOST_RECIPE_ID);
    if (!result.success) {
      lastMessage = result.message;
      break;
    }
    made += result.producedItem?.count ?? 1;
  }
  const compostTotal = inventory.getItemCount(COMPOST_ITEM_ID);
  let message;
  if (made > 0) message = `Made ${made} compost. You have ${compostTotal}.`;
  else message = lastMessage === 'Inventory full.' ? 'Your backpack is full.' : 'Not enough scraps yet.';
  return { made, compostTotal, message };
}
