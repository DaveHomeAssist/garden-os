# Codex Prompt — Phase 4F: Crafting System

## Task

Create `src/game/crafting.js` — a recipe-based crafting system that consumes materials from inventory to produce tools, consumables, and decor.

## Deliverable

Create `src/game/crafting.js`:

```js
export class CraftingSystem {
  constructor(store, inventory, skillSystem, recipeSpec) {
    // store — from Phase 0B
    // inventory — from Phase 4A
    // skillSystem — from Phase 4C (for material cost reduction buff)
    // recipeSpec — loaded from specs/CRAFTING_RECIPES.json (Phase 4G)
  }

  // Get all recipes the player can see (unlocked by skill level)
  getAvailableRecipes() { ... }

  // Check if player has materials for a specific recipe
  canCraft(recipeId) { ... } // { craftable: boolean, missing: [{ itemId, need, have }] }

  // Craft an item — consumes materials, produces output
  // Returns { success: boolean, producedItem: { itemId, count }, message: string }
  craft(recipeId) { ... }

  // Get recipe details
  getRecipe(recipeId) { ... }

  // Get recipes that produce a specific item
  getRecipesFor(itemId) { ... }
}
```

### Recipe Shape (from CRAFTING_RECIPES.json)

```json
{
  "id": "basic_fertilizer",
  "name": "Basic Fertilizer",
  "description": "Enriches soil for one season.",
  "materials": [
    { "itemId": "compost", "count": 2 },
    { "itemId": "plant_matter", "count": 3 }
  ],
  "output": { "itemId": "fertilizer_bag", "count": 1 },
  "skillRequirement": { "composting": 1 },
  "craftingXP": 20,
  "craftTime": 0
}
```

### Crafting Rules

1. Check skill requirement — recipe visible only if met
2. Check material availability (adjusted by Crafting skill buff: material_cost_reduction)
3. Remove materials from inventory
4. Add output to inventory (fail if inventory full)
5. Award crafting XP
6. Dispatch to store

### Skill Integration

- Crafting level 3: `-20% material cost` (round up — minimum 1 of each)
- Crafting level 5: `+1 durability` on produced tools
- Crafting level 7: unlocks rare recipes
- Crafting level 10: `masterwork` flag on produced items (visual badge, +10% effect)

### Store Integration

Add actions:
- `CRAFT_ITEM` — { recipeId, materialsConsumed, itemProduced }

## Constraints

- No external dependencies
- Crafting is instant (no timers) — `craftTime` field reserved for future use
- Material cost reduction rounds up (never free)
- If inventory is full after crafting, the crafted item is lost (warn player before crafting)
- Deterministic — same inputs = same outputs
- All mutations through Store

## Testing

Write `src/game/crafting.test.js`:
- canCraft: true when materials available, false when missing
- craft: removes correct materials, adds correct output
- Skill-based material reduction: 2 materials → 2 (at L1), → 2 (at L3, ceil of 1.6)
- Skill-based recipe visibility: hidden recipes shown at correct level
- Full inventory: crafting fails gracefully
- XP awarded after crafting
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add recipe-based crafting system with skill integration`
- Do NOT push
