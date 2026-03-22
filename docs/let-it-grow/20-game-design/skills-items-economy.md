# Skills, Items, and Economy

## Skill Tree

| Skill | Effect | XP Source |
|-------|--------|-----------|
| Gardening | Faster growth, higher yields | Planting, harvesting |
| Soil Science | Boost soil quality, reduce fatigue | Composting, soil management |
| Composting | Create fertilizers from waste | Crafting compost |
| Foraging | Find rare seeds/materials in the wild | Exploring zones |
| Social | Better NPC rewards, unlock quests faster | Completing quests, dialogue |
| Crafting | Build tools, decor, advanced items | Building items |

### Skill Progression
- Each skill has 10 levels
- XP earned passively from matching actions
- Each level unlocks a passive buff or new ability
- Skills are independent (no prerequisites between trees)

### Passive Buff Examples
- Gardening 3: +10% yield on basic crops
- Soil Science 5: Soil fatigue decays 25% faster
- Foraging 7: Rare seed chance doubled in exploration
- Social 10: NPC quest rewards include exclusive seeds

## Item System

### Core Categories

| Type | Examples | Source |
|------|----------|--------|
| Seeds | Basic, hybrid, rare, heirloom | Shop, quests, foraging, crafting |
| Tools | Watering can, shovel, scanner, pruners | Crafting, quest rewards |
| Consumables | Fertilizer, boosters, pest spray | Crafting, shop |
| Quest Items | NPC-specific deliverables | Quest drops |
| Decor | Fences, signs, pots, lights | Crafting |

### Special Items
- **Smart Watering Can** — auto-waters adjacent tiles (Crafting 5)
- **Soil Scanner** — reveals hidden cell stats (Crafting 3)
- **Heirloom Seeds** — multi-season crops with bonus scoring
- **Companion Patch Kit** — pre-made companion planting boost

### Existing Foundation
Story Mode already has:
- Crop data with factions (climbers, fast_cycles, greens, roots, herbs, fruiting, brassicas, companions)
- Intervention items (protect, mulch, companion_patch, prune, swap)
- Keepsakes (7 collectibles)
- Recipe matching system
- Pantry/stock tracking

## Inventory (RuneScape Style)

| Feature | Spec |
|---------|------|
| Slots | 20 base (upgradeable to 40) |
| Categories | Seeds, Tools, Materials, Quest Items, Decor |
| Actions | Drag/drop, stack (consumables), quick-use |
| Upgrades | Backpack Tier 1→2→3, Toolbelt (free tool slots) |

### Existing Foundation
`backpack-panel.js` renders keepsakes, recipes, pantry, and season trail. Needs extension to grid-based slot system with drag/drop.

## Economy

| Currency | Source | Sink |
|----------|--------|------|
| Seeds | Harvest, foraging, quests | Planting |
| Materials | Foraging, harvest byproducts | Crafting |
| Reputation | Quest completion | Zone access, NPC shops |
| (No gold coin) | — | Economy is barter + reputation based |

The economy is deliberately non-monetary. Players trade crops, materials, and labor — not coins. This reinforces the cozy, community-garden feel.
