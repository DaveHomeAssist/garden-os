# Claude Prompt — Phase 4D: Skill Tree Specification

## Task

Author `specs/SKILL_TREE.json` — the canonical skill tree data defining all 6 skills, their 10 levels, XP requirements, and buff unlocks.

## What to Define

### Structure

```json
{
  "version": 1,
  "skills": {
    "gardening": {
      "name": "Gardening",
      "description": "Master the art of growing plants.",
      "icon": "🌱",
      "xpSources": [
        { "action": "PLANT_CROP", "xp": 10, "description": "Plant a crop" },
        { "action": "HARVEST_CELL", "xp": 25, "description": "Harvest a crop" },
        { "action": "WATER_CELL", "xp": 5, "description": "Water a cell" }
      ],
      "levels": [
        { "level": 1, "xpRequired": 0, "totalXP": 0, "buff": null },
        { "level": 2, "xpRequired": 100, "totalXP": 100, "buff": null },
        { "level": 3, "xpRequired": 150, "totalXP": 250, "buff": { "id": "yield_bonus_1", "name": "+10% Yield", "effect": { "type": "multiply", "target": "harvest_yield", "value": 1.1 } } },
        ...
      ]
    },
    ...
  }
}
```

### Design Principles

1. **Meaningful progression** — each buff should feel impactful, not trivial
2. **Balanced XP curves** — Level 1–3 fast (learn the skill), 4–7 moderate (develop), 8–10 slow (master)
3. **Clear buff descriptions** — players should immediately understand what they're getting
4. **No overlap** — each skill's buffs target different game systems
5. **Deterministic** — no percentage chances (except where clearly stated as a modifier to existing systems)

### Skills to Fully Spec

**Gardening** — affects growth, yield, crop quality
- L3: +10% harvest yield
- L5: +20% harvest yield
- L7: Growth speed +25% (reduce time between phases)
- L10: Chance to discover rare crop variants on harvest

**Soil Science** — affects soil health, fatigue, analysis
- L3: Soil fatigue reduced 15% per season
- L5: Soil fatigue reduced 25% per season
- L7: Can see hidden soil stats (pH, composition) without scanner
- L10: Auto-enrich: soil slowly recovers between seasons

**Composting** — affects fertilizer quality, resource efficiency
- L3: Crafted fertilizer 50% more effective
- L5: Compost recipes yield 2x output
- L7: Rare material appears in compost (crystal shards, etc.)
- L10: Auto-compost: plant waste auto-converts to compost

**Foraging** — affects exploration loot, discovery
- L3: +1 item per foraging spot
- L5: Rare seed chance 2x in wild zones
- L7: All foraging yields doubled
- L10: Legendary items added to loot tables

**Social** — affects NPC relations, quest rewards
- L3: +25% reputation gain from all sources
- L5: Quest rewards increased by 20%
- L7: Exclusive high-tier quests unlocked
- L10: Instant access to all NPC family-tier dialogue

**Crafting** — affects tool quality, material costs, recipes
- L3: Crafting material costs reduced 20%
- L5: Crafted tools get +10 max durability
- L7: Rare crafting recipes unlocked
- L10: Masterwork quality on all crafted items (+10% effectiveness)

### XP Table

Design a cumulative XP table that makes early levels fast and late levels slow:

| Level | XP for Level | Cumulative | Approx. Actions to Reach |
|-------|-------------|------------|-------------------------|
| 1 | 0 | 0 | Start |
| 2 | 100 | 100 | ~10 plants or 4 harvests |
| 3 | 150 | 250 | ~25 plants total |
| 4 | 250 | 500 | — |
| 5 | 350 | 850 | — |
| 6 | 450 | 1300 | — |
| 7 | 600 | 1900 | — |
| 8 | 800 | 2700 | — |
| 9 | 1100 | 3800 | — |
| 10 | 1400 | 5200 | ~520 plants or ~208 harvests |

## Deliverable

- `specs/SKILL_TREE.json` — complete skill tree data
- All 6 skills with 10 levels each
- Every buff has a clear `effect` object that game systems can consume
- XP sources mapped to store action types

## After completing changes

- Commit with message: `spec: author complete skill tree with 6 skills × 10 levels`
- Do NOT push
