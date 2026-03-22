# Claude Prompt — Phase 4M: Phase 4 Integration Testing

## Task

Write integration tests for inventory, skills, crafting, and tool durability systems.

## What to Test

### 1. Inventory + Tool Integration
- Equipping a tool from inventory makes it available in tool HUD
- Using a tool decrements its durability in inventory
- Broken tool (0 durability) prevents use
- Repairing tool consumes materials from inventory

### 2. Skill + Action Integration
- Planting a crop awards Gardening XP
- Harvesting awards Gardening XP
- Completing a quest awards Social XP
- Crafting an item awards Crafting XP
- Level-up correctly unlocks buffs
- Buffs apply to game systems (yield bonus on harvest, fatigue reduction)

### 3. Crafting + Inventory Integration
- Crafting consumes correct materials from inventory
- Crafted item appears in inventory
- Skill-based material cost reduction works
- Can't craft with insufficient materials
- Can't craft if inventory is full

### 4. Full Loop Test
- Start Let It Grow, plant crops, harvest
- Gain Gardening XP, level up
- Forage materials in wild zone
- Craft a tool from foraged materials (Crafting XP gained)
- Use crafted tool (durability tracked)
- Repair when worn (materials consumed)
- Complete quest requiring crafted item
- Verify all state persists in save/load

### 5. Backward Compatibility
- Load pre-Phase-4 save (no inventory/skills)
- Defaults initialized correctly
- Game playable without breaking

## Deliverable

- Extended `src/test/integration.test.js` with Phase 4 test suite
- All tests passing: `npx vitest run`

## After completing changes

- Commit with message: `test: add Phase 4 integration tests for inventory, skills, crafting, and durability`
- Do NOT push
