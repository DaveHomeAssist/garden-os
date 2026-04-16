# Claude Prompt — Phase 4G: Crafting Recipes Specification

## Task

Author `specs/CRAFTING_RECIPES.json` — the complete crafting recipe deck defining materials, outputs, skill requirements, and progression.

## What to Define

### Recipe Categories

**Tools** — player equipment with durability
**Consumables** — single-use items (fertilizer, sprays)
**Decor** — aesthetic garden items
**Upgrades** — permanent improvements (backpack, bed expansion)

### Recipe Structure

```json
{
  "id": "recipe_id",
  "name": "Human-readable name",
  "description": "What this recipe produces and why it's useful",
  "category": "tool|consumable|decor|upgrade",
  "materials": [
    { "itemId": "material_id", "count": 2, "name": "Material Name" }
  ],
  "output": {
    "itemId": "output_item_id",
    "count": 1,
    "durability": 100
  },
  "skillRequirement": { "crafting": 1 },
  "craftingXP": 20,
  "unlockCondition": null
}
```

### Recipes to Author

**Starter Recipes (Crafting 1)**
1. Basic Fertilizer — 2 compost + 3 plant matter → 1 fertilizer bag
2. Pest Spray — 2 herb extract + 1 water → 1 pest spray bottle
3. Garden Twine — 3 plant fiber → 1 twine bundle (used in other recipes)

**Intermediate Recipes (Crafting 3)**
4. Improved Watering Can — 1 scrap metal + 2 plant fiber + 1 crystal shard → watering can (100 durability)
5. Pruning Shears — 2 scrap metal + 1 garden twine → pruning shears (50 durability)
6. Mulch Bag — 3 compost + 2 dried leaves → 2 mulch bags
7. Trellis Extension — 4 wood + 2 garden twine → trellis kit (expands vertical growing area)

**Advanced Recipes (Crafting 5)**
8. Soil Scanner — 1 crystal shard + 2 scrap metal + 1 lens → soil scanner (30 durability)
9. Smart Watering Can — 1 watering can + 2 crystal shards + 1 mechanism → smart watering can (auto-waters adjacent)
10. Companion Patch Kit — 3 herb extract + 2 compost + 1 plant fiber → companion planting boost item

**Expert Recipes (Crafting 7, rare unlock)**
11. Greenhouse Panel — 4 crystal shards + 2 scrap metal → greenhouse building material
12. Seed Hybridizer — 3 crystal shards + 2 mechanisms + 1 rare earth → allows crop crossbreeding
13. Masterwork Fertilizer — 3 fertilizer bags + 2 crystal shards → premium fertilizer (2x effect)

**Master Recipes (Crafting 10)**
14. Auto-Composter — 4 mechanisms + 3 scrap metal + 2 crystal shards → passive compost generation
15. Legendary Trowel — 5 rare earth + 3 crystal shards + 2 mechanisms → unbreakable tool

### Material Sources

| Material | Source | Rarity |
|----------|--------|--------|
| plant_matter | Harvesting any crop, foraging | Common |
| compost | Composting waste, foraging | Common |
| dried_leaves | Fall foraging, harvest byproduct | Common |
| plant_fiber | Harvesting herbs/greens | Common |
| herb_extract | Processing herbs (crafting) | Uncommon |
| scrap_metal | Foraging rock piles, quest rewards | Uncommon |
| wood | Foraging forest, zone exploration | Uncommon |
| crystal_shard | Rare foraging drops, quest rewards | Rare |
| lens | Maya quest reward, rare forage | Rare |
| mechanism | Maya quest reward, advanced crafting | Rare |
| rare_earth | Deep foraging (high skill), quest reward | Very Rare |

### Design Principles

1. **Progressive complexity** — starter recipes use 2–3 common materials, expert recipes use 3–5 including rares
2. **No dead ends** — every material has multiple uses
3. **Skill-gated discovery** — higher crafting level reveals new recipes
4. **Quest rewards complement crafting** — quests give rare materials that unlock better recipes
5. **Barter economy** — no gold/coins, materials are the currency

## Deliverable

- `specs/CRAFTING_RECIPES.json` — 15 recipes in exact JSON format
- Balanced material costs (achievable but not trivial)
- Clear skill progression path through recipes

## After completing changes

- Commit with message: `spec: author crafting recipe deck with 15 recipes across 4 tiers`
- Do NOT push
