# Claude Prompt — Phase 5J: Expanded Quest Deck

## Task

Extend `specs/QUEST_DECK.json` with zone-specific quests that encourage exploration and use biome-specific content.

## Context

Phase 2E established the initial 13 quests. Phase 5 adds expansion zones with new content. New quests should leverage zone exploration, biome crops, foraging, and the full skill/reputation systems.

## New Quests to Add (12 total)

### Exploration Quests (3)
1. **"Map the Meadow"** — Discover all 3 foraging spots in the meadow zone. Reward: rare seeds + foraging XP.
2. **"River Crossing"** — Complete Gus's riverside quest to unlock the zone. Find his old fishing spot. Reward: zone access + reputation.
3. **"The Greenhouse Key"** — Reach Crafting L5 and build a greenhouse panel. Reward: greenhouse zone access + crafting XP.

### Biome Quests (4)
4. **"Watercress for Lila"** — Forage watercress from the riverside, deliver to Lila. Reward: riverside recipe card + reputation.
5. **"Mushroom Log Inoculation"** — Help Gus set up shiitake logs in the forest. Requires wood + compost. Reward: mushroom spores + soil science XP.
6. **"The Vanilla Challenge"** — Grow vanilla orchid to full maturity in greenhouse (multi-season). Reward: legendary seed + gardening XP.
7. **"Prairie Restoration"** — Plant 5 wild clover in meadow beds to improve soil. Reward: composting XP + rare earth material.

### Advanced Quests (3, high skill/reputation gates)
8. **"Maya's Masterpiece"** (Crafting 7 + Maya Trusted) — Build the seed hybridizer. Reward: ability to crossbreed crops + 30 reputation.
9. **"Gus's Legacy Garden"** (Gus Family + Gardening 8) — Recreate Gus's grandfather's exact garden layout. Reward: legendary trowel recipe + heirloom seeds.
10. **"Lila's Cookbook"** (Lila Trusted + all recipe quests done) — Complete a full cookbook of 8 recipes. Reward: exclusive seasonal cosmetics + social XP.

### Community Quests (2, market/festival)
11. **"Market Day"** (Social 3) — Trade 10 items at the market square. Reward: rare materials + social XP.
12. **"Festival Champion"** — Complete all 4 festival activities in a single year. Reward: trophy + global +5% scoring buff.

## Quest Design Guidelines

- Zone-specific quests require visiting the zone (creates exploration incentive)
- Advanced quests are aspirational — players plan toward them
- Community quests encourage engaging with all game systems
- Dialogue should reference the specific zone's atmosphere and NPCs present
- All quests follow the same JSON format as Phase 2E

## Deliverable

- Modified `specs/QUEST_DECK.json` — 12 new quests added (total: 25)
- All quests have complete data: prerequisites, requirements, rewards, dialogue
- Quests are balanced (not all completable in one season)

## After completing changes

- Commit with message: `content: add 12 zone-specific quests for expansion zones`
- Do NOT push
