# Claude Prompt — Phase 5K: Phase 5 Integration Testing

## Task

Write integration tests for the open world expansion: zone navigation, gating, foraging, expanded grids, multiple beds, and biome content.

## What to Test

### 1. Zone Navigation
- All 8 zones loadable via zone manager
- Connections are bidirectional (can go and return)
- Zone exit triggers correct transition
- Player spawn point correct after each transition

### 2. Zone Gating
- Ungated zones (player_plot, neighborhood) always accessible
- Skill-gated zones: blocked at L2, allowed at L3+ (meadow)
- Reputation-gated zones: blocked below Friend, allowed at Friend+ (forest)
- Quest-gated zones: blocked until quest complete (riverside)
- Festival-gated zone: blocked when no festival, open during festival
- Blocker data returned with correct details

### 3. Foraging
- Foraging spots exist in correct zones (meadow, riverside, forest)
- Forage produces items from correct biome loot table
- Skill modifiers affect loot quantity
- Cooldowns prevent re-foraging
- Items added to inventory

### 4. Expanded Grid
- 8×4 grid works (default, regression)
- 8×6 grid works (48 cells, correct scoring)
- 8×8 grid works (64 cells, correct scoring)
- Grid expansion persists in save
- Old save (32-cell array) loads correctly with migration

### 5. Multiple Beds
- Can own multiple bed instances
- Each bed has independent grid, scoring, soil state
- Switching between beds works
- All beds saved/loaded correctly

### 6. Biome Crops
- New crops have valid scoring data
- Biome crops appear in correct zone foraging loot
- New recipes work with scoring system
- Total crop count is 50

### 7. Full Game Loop (End-to-End)
- Start Let It Grow → plant garden → harvest → gain XP
- Level up Foraging → unlock meadow → forage materials
- Craft tool → use in garden → tool durability tracks
- Complete NPC quest → gain reputation → unlock forest
- Expand grid to 8×6 → fill with biome crops → score
- Save/load → all state intact

## Deliverable

- Extended `src/test/integration.test.js` with Phase 5 test suite
- All tests passing: `npx vitest run`

## After completing changes

- Commit with message: `test: add Phase 5 integration tests for open world, zones, foraging, and grid expansion`
- Do NOT push
