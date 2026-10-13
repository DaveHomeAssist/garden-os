# Garden OS · Game Track Phase Timeline

Canonical scaffold for the Let It Grow game expansion track.
Uses the same template as the planner intelligence track. Phases listed here correspond to UPGRADE_PHASES.md plus three post v1.0 additions.

Last verified: 2026-10-13

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
Duration        : 6 weeks (shipped and revalidated 2026-04-22)
Dependencies    : Phase 3 festivals and day/night stable
Exit Criteria   :
  1. Slot grid inventory with drag and drop works at 20 to 40 slots
  2. All 6 skills earn XP from matching actions, buffs apply at threshold levels
  3. Crafting bench consumes materials, produces tools, and records recipe use
  4. Tool durability degrades on use, repair mechanic restores it
  5. Save round trip preserves inventory, skill XP, crafting log, durability
Deliverables    : src/game/inventory.js, src/game/skills.js, src/game/crafting.js, src/game/tool-manager.js, src/ui/backpack-panel.js, src/ui/skill-panel.js, src/ui/crafting-panel.js, specs/SKILL_TREE.json, specs/CRAFTING_RECIPES.json, story-mode/src/test/integration.test.js
Risk Ledger     : First save schema extension since Phase 2. Migration for existing saves with no inventory was validated through the v3 -> v4 save tests, and the perf HUD remains debug-only so it does not leak into normal play or save state. Rollback: feature flag hides inventory UI but leaves data dormant.
Test Gate       : inventory.test.js, skills.test.js, crafting.test.js, tool-manager.test.js, save.test.js, and integration smoke `plant -> harvest -> XP -> craft -> use tool -> repair -> quest complete`
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

Status on 2026-10-13: all six exit criteria observable in the game.
1. World map travels 8 zones. Locked zones show the reason under the card.
2. Gates: skill, reputation, quest, and festival gates block travel with the WORLD_MAP blocker message. The save authority also refuses quest and festival gated trips (`ZONE_GATED`); skill and reputation gates are checked on the device only, because the authority does not hold skills or reputation yet.
3. Scope reconciled: the 4 biome zones (meadow, riverside, forest_edge, greenhouse) each carry 3 exclusive crops. Neighborhood, market_square, festival_grounds, and player_plot are hubs, not biomes, so they carry starter crops only. The map shows wild crop progress per biome.
4. Forage spots per zone come from `specs/FORAGE_TABLES.json`. `material-sources.test.js` proves every crafting recipe can be made from items play hands out.
5. A craftable raised bed kit adds up to 3 beds in the home plot (`bedSlots: 3`). Beds switch from the pause menu, keep their own grid, soil, and history, and roll into the next season while parked. Only one bed renders in the scene at a time.
6. Current zone, visited zones, forage history, and parked beds survive reload.

Smoke script (player followable, automated in `tests/live-story-mode-smoke.mjs`, runs after every deploy):
1. Continue a save with a second bed holding lettuce.
2. Press M and travel: neighborhood, market square, greenhouse, meadow.
3. Forage the meadow flowers, travel to the forest edge, forage mushrooms, travel to the riverside, forage driftwood.
4. Travel to the festival grounds, then back to the meadow.
5. Reload and continue. You are in the meadow, all 8 zones are visited, 3 forage spots are on cooldown, the home bed is active, and the second bed still holds its lettuce.

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

Status on 2026-10-13: all five exit criteria observable in the game.
1. All 25 quests in `specs/QUEST_DECK.json` offer two authored outcomes with their own ids, labels, rewards, world state flags, and story log lines. `quest-deck-validator.js` refuses decks filled from a template.
2. Outcomes carry echoes: lines a different neighbor says about your choice. Talking to that neighbor folds the newest echo into their greeting (`src/data/quest-echoes.js`).
3. 25 branching quests (target was 10).
4. The story log lists recorded choices.
5. `campaign.choiceLog` saves inside the versioned campaign save.

Smoke script (player followable):
1. In spring, talk to Old Gus in the neighborhood, accept Grandpa's Tomatoes, and finish it with "Keep the seed line pure".
2. Travel to the meadow and talk to Maya. Her greeting mentions you keeping his grandfather's tomato true to type.
3. On a save where you chose "Share the seed with the block" instead, Lila mentions the tomato in half the yards on the block, and Maya says nothing about it.

### Phase 7 · v1.2 · Economic Depth

```
Goal            : Player buys, sells, and barters seeds, tools, and garden materials with NPC traders under seasonal price pressure.
Duration        : 5 weeks
Dependencies    : Phase 6 shipped
Exit Criteria   :
  1. Market system prices each market item by season, deterministic for a fixed seed
  2. NPC traders appear on zone schedules with rotating stock
  3. Player can buy, sell, and barter with price preview before commit
  4. Currency (or barter balance) persists in save
  5. Market history viewable across last 3 seasons
Deliverables    : src/game/market.js, src/ui/trade-panel.js, src/data/market-schedule.js, specs/MARKET_PRICES.json
Risk Ledger     : Economy balance risk. Mitigation: tunable price curves, playtest at least twice before ship. Save schema gains currency and market history. Rollback: disable market zone entry, currency remains 0.
Test Gate       : Deterministic price test, trade round trip, smoke script: sell 3 market items across 2 seasons, verify price delta
```

Scope reconciled 2026-10-13: the goal first read "crops and crafted goods". The Bounded Stewardship Exchange Doctrine (`docs/PROGRESSION_SYSTEMS.md` §12, rule 5, logged 2026-06-24) limits the market to seeds, tools, and garden materials, so harvests stay in the pantry and recipes. The goal, criterion 1, and the smoke script now match the doctrine.

Status on 2026-10-13: all five exit criteria observable in the game.
1. Prices come from `specs/MARKET_PRICES.json`, deterministic per seed and season (`src/server/authority-market.js`). Sell price stays below the cheapest buy price across seasons and barter converts at that settlement value, so no buy, sell, or barter cycle makes credits (property tests in `authority-market.test.js`).
2. Lila, Old Gus, Maya, and the festival steward keep weekday schedules with rotating stock (`src/data/market-schedule.js`). Stock limits are checked on the device; the authority checks prices, balance, and inventory.
3. The trade panel previews every buy, sell, and barter and waits for Confirm. Each trade is one signed `MARKET_TRADE` action; the client never sends a price or total.
4. Credits persist in the save and in the signed authority record.
5. The trade panel shows prices recorded for the last 3 distinct seasons.

Smoke script (player followable):
1. In spring, open the market and sell 1 lettuce seed, 1 basil seed, and 1 compost. Note each price.
2. Play into summer, open the market again, and sell the same three items. Prices differ by season.
3. Open the price history. Both seasons appear.
4. Try to buy and sell the same item back. You end with fewer credits.

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

Status on 2026-10-13: all five exit criteria observable in the game, with one wording change.
1. `specs/CONTENT_PACK_SCHEMA.json` revision 1.1.0, manifest `formatVersion` 1. `docs/CREATOR_GUIDE.md` documents it.
2. A browser page cannot read a local directory, so packs install from the pause menu (Content Packs, then Install, pick `.json` files) and load at boot from browser storage. Developers can inject packs through `globalThis.GARDEN_OS_CONTENT_PACKS`. Malformed packs and packs that reuse an official id are refused with the reasons listed.
3. `examples/packs/` ships a crop pack, a quest pack, a full neighbor pack, and a malformed pack.
4. Modded crops, quests, and neighbors carry a Modded tag in the palette, quest tracker, quest log, and world labels.
5. `campaign.contentPacks` and `campaign.contentProvenance` save one provenance row per pack entry, without duplicates across boots.

Known limits: pack places are listed but cannot be visited (no scene format for them yet), and pack quest rewards stay on the device because the authority signs official quests only.

Smoke script (player followable):
1. Open Content Packs, install `spring-herbs.json`, `porch-quest.json`, and `riverside-neighbor.json`, then Save and reload.
2. In chapter 2 or later, find Lemon Balm in the crop palette with a Modded tag.
3. Read the notice board, accept the porch cuttings quest, harvest basil, and turn it in.
4. Travel to the riverside in spring and meet Rhea.

---

## 4. Milestone Calendar

Default assumes sequential delivery. Content heavy phases (5 and 8) include content authoring weeks baked into duration.

| Phase | Version | Start | Ship gate | Cumulative weeks |
|-------|---------|-------|-----------|------------------|
| 4 | v0.4 | 2026-03-09 | 2026-04-22 | 6 |
| 5 | v1.0 | 2026-04-22 | 2026-07-01 | 16 |
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
