# Garden OS · Game Track Phase Timeline

Canonical scaffold for the Let It Grow game expansion track.
Uses the same template as the planner intelligence track. Phases listed here correspond to UPGRADE_PHASES.md plus three post v1.0 additions.

Last verified: 2026-04-20

---

## 1. Timeline Template

Reusable shape. Copy the block below into a new phase spec and fill every field.

```
Phase ID        : Phase N · vN.N
Goal Sentence   : One sentence. Names the capability, not the implementation.
Duration        : N weeks from kickoff to ship gate.
Dependencies    : Prior phases that must be stable. List by ID.
Exit Criteria   : 3 to 5 measurable conditions. Each observable by opening the game or reading a test.
Deliverables    : Files affected, grouped by subsystem (scene, game, UI, store, save, specs, tests).
Risk Ledger     : Save migration path. Scene dispose risk. Performance budget. Rollback mechanism.
Test Gate       : All prior suites green. Integration test per exit criterion. Save round trip verified.
```

### Field Rules (game track specific)

| Field | Rule |
|-------|------|
| Goal Sentence | Must be playable. If the sentence describes a system, not a player action, rewrite. |
| Duration | Game phases land in 4 to 8 weeks. Open world phase is allowed 10 weeks, one time. |
| Exit Criteria | Must include a smoke test script a player can follow. |
| Risk Ledger | Save migration is the highest risk in this track. Every schema change carries a rollback path. |
| Test Gate | Story Mode remains fully playable at every phase. Regression required. |

---

## 2. Per Phase Week Shape

Default 6 week shape. Compressed or extended per phase below.

```
W1   Scope lock. Spec draft. Save schema review. Dispose plan for any new scene.
W2   Build pass 1. Data and state changes. Store actions added. Reducer tests.
W3   Build pass 2. Scene and UI integration. Input wiring.
W4   Build pass 3. Content authoring (quests, recipes, skill trees, zone data).
W5   Integration. Regression pass. Smoke test script executed twice.
W6   Validation. Save migration rehearsal. Rollback verified. CLAUDE.md + today.csv entries.
```

Short phases fold W3 and W4. Open world phase adds a second W4 for biome content.

---

## 3. Next 5 Phases, Applied

### Phase 4 · v0.4 · Inventory and Skills

```
Goal            : Player manages a slot based inventory, earns XP across 6 skills, crafts tools, and watches them degrade.
Duration        : 6 weeks (in progress, many tasks completed 2026-03-22)
Dependencies    : Phase 3 festivals and day/night stable
Exit Criteria   :
  1. Slot grid inventory with drag and drop works at 20 to 40 slots
  2. All 6 skills earn XP from matching actions, buffs apply at threshold levels
  3. Crafting bench consumes materials, produces tools, and records recipe use
  4. Tool durability degrades on use, repair mechanic restores it
  5. Save round trip preserves inventory, skill XP, crafting log, durability
Deliverables    : src/game/inventory.js, src/game/skills.js, src/game/crafting.js, src/ui/backpack-panel.js, src/ui/skill-panel.js, src/ui/crafting-panel.js, specs/SKILL_TREE.json, specs/CRAFTING_RECIPES.json
Risk Ledger     : First save schema extension since Phase 2. Migration for existing saves with no inventory. Rollback: feature flag hides inventory UI but leaves data dormant.
Test Gate       : inventory.test.js, skills.test.js, crafting.test.js, save round trip, smoke script: plant, harvest, craft, repair
```

### Phase 5 · v1.0 · Open World Expansion

```
Goal            : Player explores 6 or more biome zones with reputation and skill gates, biome specific crops, and foraging.
Duration        : 10 weeks (extended, content heavy)
Dependencies    : Phase 4 shipped
Exit Criteria   :
  1. World map UI lets the player travel between 6 or more zones
  2. Zone gates enforce reputation and skill minimums with clear UI messaging
  3. Each biome scene renders, disposes correctly on exit, and has at least 2 unique crops
  4. Foraging mechanic yields biome specific materials that feed crafting
  5. Multiple garden beds persist independently across zones
  6. Save round trip preserves current zone, bed states, foraged materials
Deliverables    : src/scene/zone-manager.js, src/scene/zones/*.js (meadow, riverside, forest, greenhouse), src/ui/world-map.js, src/game/foraging.js, src/game/bed-manager.js, specs/WORLD_MAP.json, specs/CROP_SCORING_DATA.json additions, specs/QUEST_DECK.json additions
Risk Ledger     : Scene dispose leaks if any zone retains references. Memory budget 200MB per zone. Save schema gains zone state and multiple bed entries. Rollback: default to single bed mode via feature flag.
Test Gate       : Zone navigation integration test, dispose tracking assertion, smoke script: travel 6 zones, forage in 3, return and verify bed state
```

### Phase 6 · v1.1 · Narrative Depth

```
Goal            : Player choices in quests carry reputation and unlock consequences across the world.
Duration        : 6 weeks
Dependencies    : Phase 5 shipped
Exit Criteria   :
  1. Quest engine supports choice branching with at least 2 outcomes per branching quest
  2. Reputation changes from choices propagate to NPC dialogue in other zones
  3. At least 10 quests with meaningful branches land in the deck
  4. Choice log viewable in a new "story" UI tab
  5. Save round trip preserves choice history with version field
Deliverables    : src/game/quest-engine.js (extended), src/game/reputation.js (extended), src/ui/story-log.js, specs/QUEST_DECK.json (branches), src/data/npcs.js (choice aware dialogue)
Risk Ledger     : Reputation matrix complexity grows. Mitigation: cap per NPC changes at 5 events per quest. Save schema gains choice log. Rollback: ignore unknown choices on load, default to neutral.
Test Gate       : Choice propagation test, dialogue variant test, save round trip, smoke script: complete 3 branching quests, verify NPC reactions in second zone
```

### Phase 7 · v1.2 · Economic Depth

```
Goal            : Player trades crops and crafted goods with NPCs under seasonal price pressure.
Duration        : 5 weeks
Dependencies    : Phase 6 shipped
Exit Criteria   :
  1. Market system prices each crop and craftable by season, deterministic for a fixed seed
  2. NPC traders appear on zone schedules with rotating stock
  3. Player can buy, sell, and barter with price preview before commit
  4. Currency (or barter balance) persists in save
  5. Market history viewable across last 3 seasons
Deliverables    : src/game/market.js, src/ui/trade-panel.js, src/data/market-schedule.js, specs/MARKET_PRICES.json
Risk Ledger     : Economy balance risk. Mitigation: tunable price curves, playtest at least twice before ship. Save schema gains currency and market history. Rollback: disable market zone entry, currency remains 0.
Test Gate     : Deterministic price test, trade round trip, smoke script: sell 3 crops across 2 seasons, verify price delta
```

### Phase 8 · v1.3 · Creator Tools

```
Goal            : External authors can add crops, quests, and NPCs through a declarative content pack format.
Duration        : 7 weeks
Dependencies    : Phase 7 shipped
Exit Criteria   :
  1. Content pack manifest schema documented and versioned
  2. Game loads packs from a local directory at boot, validates manifests, rejects malformed packs with clear error
  3. At least 3 example packs ship (crop only, quest only, full NPC)
  4. Modded content tagged visually in UI so players know what is official
  5. Save round trip preserves pack provenance per entity
Deliverables    : src/content/pack-loader.js, src/content/pack-validator.js, specs/CONTENT_PACK_SCHEMA.json, docs/CREATOR_GUIDE.md, examples/packs/*
Risk Ledger     : Arbitrary content can break scoring and quest state. Mitigation: strict schema, no script execution in packs, hard reject on validation failure. Save schema gains provenance field. Rollback: reject all packs on load if flag set.
Test Gate       : Pack validation suite, invalid pack rejection test, round trip with 2 packs loaded, smoke script: load 3 example packs, play 1 pack quest
```

---

## 4. Milestone Calendar

Default assumes sequential delivery. Content heavy phases (5 and 8) include content authoring weeks baked into duration.

| Phase | Version | Start | Ship gate | Cumulative weeks |
|-------|---------|-------|-----------|------------------|
| 4 | v0.4 | 2026-03-09 | 2026-04-20 | 6 |
| 5 | v1.0 | 2026-04-20 | 2026-06-29 | 16 |
| 6 | v1.1 | 2026-06-29 | 2026-08-10 | 22 |
| 7 | v1.2 | 2026-08-10 | 2026-09-14 | 27 |
| 8 | v1.3 | 2026-09-14 | 2026-11-02 | 34 |

Roughly 8 months from now to v1.3. Phase 5 is the long pole and the biggest content author effort. Any slip there moves v1.0 launch, which moves every later phase.

---

## 5. Gate Checklist (applies to every phase)

Before declaring ship:

- [ ] All exit criteria observable by running the game
- [ ] Smoke test script executed twice end to end
- [ ] Integration test exists for each exit criterion
- [ ] Story Mode still playable with no regression
- [ ] Save round trip verified with a save from the prior phase
- [ ] Save migration rehearsed in dry run, rollback path executed once
- [ ] Scene dispose verified with no leaked Three.js references
- [ ] CLAUDE.md updated with phase entry
- [ ] today.csv line written with project, problem, impact, implementation, follow up
- [ ] UI_ISSUES_TABLE.html updated for any deferred work

---

## 6. Cross Track Coordination

The planner intelligence track (PLANNER_PHASE_TIMELINE.md) and the game track share three risk surfaces:

| Risk Surface | Planner Phase | Game Phase | Coordination Rule |
|--------------|---------------|------------|-------------------|
| Save format | Phase 6 (season field) | Phase 4 (inventory), Phase 5 (zones), Phase 6 (choices), Phase 7 (currency), Phase 8 (pack provenance) | Each track increments its own save version namespace. Cross track loads ignore unknown fields. |
| Scoring contract | Phase 5 (reasoning sibling) | Phase 4 (skill buffs), Phase 5 (biome crops) | Scoring function signature frozen after planner Phase 5. Game changes add inputs only, never remove. |
| Crop data | Phase 4 to 8 (traits) | Phase 5 (biome crops), Phase 8 (mod crops) | specs/CROP_SCORING_DATA.json is shared. Additive only. Field rename requires both track leads sign off. |

---

## Documentation Maintenance

Issues: garden-os/docs/UI_ISSUES_TABLE.html
Session log: /Users/daverobertson/Desktop/Code/90-governance/docs/today.csv
Implementation plan: garden-os/IMPLEMENTATION_PLAN.md
Canonical upgrade phases: garden-os/specs/UPGRADE_PHASES.md
Planner track: garden-os/docs/PLANNER_PHASE_TIMELINE.md
