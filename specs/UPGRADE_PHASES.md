# Garden OS → Let It Grow — Upgrade Phases

> Canonical upgrade plan. Each phase is a self-contained milestone with clear deliverables.
> Phases are sequential — each builds on the previous. No phase ships without the prior phase stable.

## Architecture Principles

- **Web-native** — Three.js + Vite, no Unity port (revisit at v1.0 only)
- **Monorepo** — Story Mode and Let It Grow share specs, scoring, and save patterns
- **Backward compatible** — Story Mode must remain fully playable at every phase
- **Single-scene rendering** — one zone loaded at a time, dispose on exit
- **State store pattern** — all mutations through dispatch → reducer → notify
- **Offline-first** — localStorage persistence, no server dependency until v1.0

---

## Phase 0 — Foundation Hardening (Pre-Expansion)

**Goal:** Prepare the existing codebase for expansion without changing gameplay.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 0A. Extract Input System | New: `src/input/input-manager.js` / Modify: `main.js` | Codex |
| 0B. Centralize State Store | New: `src/game/store.js` / Modify: `state.js`, `main.js` | Codex |
| 0C. Decompose main.js | Modify: `main.js` → extract boot, routing, UI binding | Codex |
| 0D. Add Asset Dispose Tracking | Modify: `garden-scene.js`, `bed-model.js`, `scenery.js` | Codex |
| 0E. Write Integration Test Harness | New: `src/test/integration.test.js` | Claude |

**Exit criteria:** All 34 source files still pass existing tests. main.js is under 200 lines. State mutations flow through store. Input is abstracted.

**Dependencies:** None — this is the prerequisite for everything.

---

## Phase 1 — Free-Roam Garden Loop (v0.1)

**Goal:** Walk around your existing garden plot in real-time, interact with cells by proximity.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 1A. Player Character Model | New: `src/scene/player-model.js` | Codex |
| 1B. WASD/Touch Movement | Modify: `src/input/input-manager.js` | Codex |
| 1C. Camera Follow System | Modify: `src/scene/camera-controller.js` | Codex |
| 1D. Proximity Interaction | New: `src/game/interaction.js` | Codex |
| 1E. Tool Equip HUD | New: `src/ui/tool-hud.js` / Modify: `index.html` | Codex |
| 1F. Mode Selector (Story vs Let It Grow) | Modify: `index.html`, `main.js` | Claude |
| 1G. Real-Time Tool Actions | Modify: `src/game/intervention.js` | Codex |
| 1H. Phase 1 Integration Testing | Tests for movement, interaction, tools | Claude |

**Exit criteria:** Player avatar walks the garden plot. WASD + touch work. Cells highlight on proximity. Tools (water, plant, harvest) work in real-time. Story Mode still launchable separately.

**Dependencies:** Phase 0 complete.

---

## Phase 2 — NPC + Quest System (v0.2)

**Goal:** Three quest-giving NPCs in a neighborhood zone with reputation tracking.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 2A. NPC Data Registry | New: `src/data/npcs.js` (Gus, Maya, Lila, neighbor templates) | Codex |
| 2B. NPC Portrait Artwork | Modify: `src/data/portraits.js` | Claude |
| 2C. NPC Scene Placement | Modify: `src/scene/garden-scene.js` or new zone scene | Codex |
| 2D. Quest State Machine | New: `src/game/quest-engine.js` (AVAILABLE → ACCEPTED → IN_PROGRESS → COMPLETE) | Codex |
| 2E. Quest Data (Initial 13) | New: `specs/QUEST_DECK.json` (9 core + 4 neighbor quests) | Claude |
| 2F. Dialogue Branching | Modify: `src/game/cutscene-machine.js`, `src/ui/dialogue-panel.js` | Codex |
| 2G. Reputation System | New: `src/game/reputation.js` (per-NPC 0–100 scale, 5 tiers) | Codex |
| 2H. Zone Transition System | New: `src/scene/zone-manager.js` (fade → load → fade) | Codex |
| 2I. Neighborhood Zone Scene | New: `src/scene/zones/neighborhood.js` | Codex |
| 2J. State Store Extensions | Modify: `src/game/store.js` — add quest log, reputation | Codex |
| 2K. Save System Extensions | Modify: `src/game/save.js` — persist quests + reputation | Codex |
| 2L. Phase 2 Integration Testing | Quest flows, reputation gates, zone transitions | Claude |

**Exit criteria:** Player can walk to neighborhood. Talk to Gus/Maya/Lila. Accept and complete quests. Reputation tracks independently per NPC. Saves persist across sessions.

**Dependencies:** Phase 1 complete.

---

## Phase 3 — Seasonal Enhancements (v0.3)

**Goal:** Day/night cycle, audio system, seasonal festivals, monthly event rotations.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 3A. Audio Manager | New: `src/audio/audio-manager.js` (Web Audio SFX + `<audio>` ambient) | Codex |
| 3B. Ambient Sound Design | Spec: season-specific ambient tracks + SFX triggers | Claude |
| 3C. Day/Night Lighting Cycle | Modify: `src/scene/weather-fx.js`, `garden-scene.js` | Codex |
| 3D. Monthly Event Rotation | Modify: `src/data/events.js` — monthly filtering, rotation logic | Codex |
| 3E. Festival System | New: `src/game/festivals.js` — 4 seasonal festivals with mechanics | Codex |
| 3F. Festival Zone Scene | New: `src/scene/zones/festival-grounds.js` | Codex |
| 3G. Season Calendar Upgrade | Modify: `src/ui/season-calendar.js` — real-time countdown option | Codex |
| 3H. NPC Schedules | Modify: `src/data/npcs.js` — location by season/time | Codex |
| 3I. Phase 3 Integration Testing | Audio, day/night, festivals, schedules | Claude |

**Exit criteria:** Garden has ambient sound per season. SFX on plant/water/harvest. Day/night cycle (toggle). 4 festivals with unique mechanics. NPCs move between locations seasonally.

**Dependencies:** Phase 2 complete.

---

## Phase 4 — Inventory + Skills (v0.4)

**Goal:** RuneScape-style inventory grid, 6-skill tree, crafting bench, tool durability.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 4A. Inventory System | New: `src/game/inventory.js` (20–40 slot grid, stacking, categories) | Codex |
| 4B. Inventory UI | Rebuild: `src/ui/backpack-panel.js` → slot grid with drag/drop | Codex |
| 4C. Skill Tree Engine | New: `src/game/skills.js` (6 skills × 10 levels, passive buffs) | Codex |
| 4D. Skill Tree Spec | New: `specs/SKILL_TREE.json` — XP tables, buff definitions | Claude |
| 4E. Skill Tree UI | New: `src/ui/skill-panel.js` — visual tree + level indicators | Codex |
| 4F. Crafting System | New: `src/game/crafting.js` — recipe combining, material costs | Codex |
| 4G. Crafting Recipes Spec | New: `specs/CRAFTING_RECIPES.json` | Claude |
| 4H. Crafting Bench UI | New: `src/ui/crafting-panel.js` — material slots + output preview | Codex |
| 4I. Tool Durability | Modify: `src/game/intervention.js` — use count, repair mechanic | Codex |
| 4J. Tool Condition HUD | Modify: `src/ui/tool-hud.js` — durability indicator | Codex |
| 4K. Integration with Interventions | Modify: `intervention.js` — tools consume from inventory | Codex |
| 4L. State + Save Extensions | Modify: `store.js`, `save.js` — skills, inventory, crafting | Codex |
| 4M. Phase 4 Integration Testing | Inventory, skills, crafting, durability | Claude |

**Exit criteria:** Full inventory grid works with drag/drop. All 6 skills gain XP from matching actions. Crafting bench produces tools from materials. Tools degrade and require repair. Everything persists in save.

**Dependencies:** Phase 3 complete.

---

## Phase 5 — Open World Expansion (v1.0 Prep)

**Goal:** 6–8 explorable zones with biome-specific content, reputation/skill gating.

| Task | Files Affected | Agent Type |
|------|---------------|------------|
| 5A. World Map Data | New: `specs/WORLD_MAP.json` — zone definitions, connections, gates | Claude |
| 5B. World Map UI | New: `src/ui/world-map.js` | Codex |
| 5C. Zone Gate Logic | Modify: `src/scene/zone-manager.js` — reputation/skill checks | Codex |
| 5D. Biome Scenes (4 new) | New: `src/scene/zones/meadow.js`, `riverside.js`, `forest.js`, `greenhouse.js` | Codex |
| 5E. Biome-Specific Crops | Modify: `specs/CROP_SCORING_DATA.json` — new crops per biome | Claude |
| 5F. Foraging Mechanic | New: `src/game/foraging.js` — wild zone gathering | Codex |
| 5G. Expanded Grid (8×6, 8×8) | Modify: `src/game/state.js`, `src/scene/bed-model.js` | Codex |
| 5H. Multiple Beds | New: `src/game/bed-manager.js` — multiple bed instances | Codex |
| 5I. NPC Movement Between Zones | Modify: `src/data/npcs.js`, `zone-manager.js` | Codex |
| 5J. Expanded Quest Deck | Modify: `specs/QUEST_DECK.json` — zone-specific quests | Claude |
| 5K. Phase 5 Integration Testing | Zone navigation, gating, foraging, expanded beds | Claude |

**Exit criteria:** Player can explore 6+ zones. Each biome has unique crops and visuals. Reputation and skill gates work. Multiple garden beds. Foraging in wild zones. Full save persistence.

**Dependencies:** Phase 4 complete.

---

## Phase Summary

| Phase | Version | Tasks | Focus |
|-------|---------|-------|-------|
| 0 | Pre | 5 | Foundation — input, state, asset tracking |
| 1 | v0.1 | 8 | Free-roam garden loop |
| 2 | v0.2 | 12 | NPCs, quests, reputation, zones |
| 3 | v0.3 | 9 | Audio, day/night, festivals, schedules |
| 4 | v0.4 | 13 | Inventory, skills, crafting, tools |
| 5 | v1.0 | 11 | Open world, biomes, foraging, expansion |
| **Total** | | **58** | |

## Agent Assignment Strategy

- **Codex agents**: Self-contained code tasks with clear file boundaries. Input: spec + file context. Output: working code committed to branch.
- **Claude agents**: Design tasks (specs, content authoring), integration testing, portrait/art direction, architectural decisions requiring cross-file reasoning.

Each prompt below provides full context so agents work autonomously without needing to explore the codebase.
