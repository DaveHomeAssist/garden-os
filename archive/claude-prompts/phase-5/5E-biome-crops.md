# Claude Prompt — Phase 5E: Biome-Specific Crops

## Task

Extend `specs/CROP_SCORING_DATA.json` with new biome-specific crops that are only available in expansion zones.

## Context

The current crop data has 38 crops across 8 factions. The expansion adds 4 biome zones (meadow, riverside, forest, greenhouse), each with exclusive crops that can only be discovered by foraging or trading in those zones.

## Existing Crop Structure

Study `specs/CROP_SCORING_DATA.json` to understand the exact field format for each crop. New crops must match this format exactly.

## New Crops to Add (12 total, 3 per biome)

### Meadow Crops
1. **Wild Clover** — companion faction, nitrogen fixer, boosts adjacent crops
2. **Prairie Onion** — roots faction, hardy, excellent in fall recipes
3. **Meadow Sage** — herbs faction, drought-resistant, high companion score

### Riverside Crops
4. **Watercress** — greens faction, needs wet soil, very fast cycle
5. **Wild Rice** — roots faction, unique to wet zones, high yield
6. **Marsh Marigold** — companions faction, pest deterrent, spring-only

### Forest Edge Crops
7. **Shiitake Mushroom** — new "fungi" crops (roots faction), shade-loving, year-round
8. **Wild Garlic** — herbs faction, shade-tolerant, strong companion effects
9. **Woodland Strawberry** — fruiting faction, shade-tolerant, small but high-scoring

### Greenhouse Crops
10. **Vanilla Orchid** — climbers faction, high value, long growth time, no frost damage
11. **Lemon Tree** — fruiting faction, multi-season harvest, needs warmth
12. **Ghost Pepper** — fruiting faction, extreme heat lover, highest yield modifier

## Design Rules

- New crops use existing factions (no new factions)
- Scoring follows existing 6-factor model
- Biome crops should have unique scoring profiles (e.g., watercress has highest shade tolerance, ghost pepper has extreme sun requirement)
- Biome crops are unlocked by visiting/foraging in their zone, not by chapter progression
- All crops must have full data: sunMin, sunIdeal, coolSeason, shadeScore, heightClass, waterNeeds, companionTags, conflictTags

## Recipe Extensions

Add 2 new recipes using biome crops:
1. **Forager's Stew** — wild garlic + shiitake + watercress + prairie onion
2. **Garden Deluxe Salsa** — ghost pepper + existing tomato + existing cilantro + existing onion

## Deliverable

- Modified `specs/CROP_SCORING_DATA.json` — 12 new crops added (total: 50)
- 2 new recipes added
- All crops have complete scoring data
- Version field incremented

## After completing changes

- Commit with message: `content: add 12 biome-specific crops and 2 new recipes`
- Do NOT push
