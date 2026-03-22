# Codex Prompt — Phase 4C: Skill Tree Engine

## Task

Create `src/game/skills.js` — a 6-skill progression system with XP tracking, leveling, and passive buffs.

## Deliverable

Create `src/game/skills.js`:

```js
export const Skills = {
  GARDENING: 'gardening',
  SOIL_SCIENCE: 'soil_science',
  COMPOSTING: 'composting',
  FORAGING: 'foraging',
  SOCIAL: 'social',
  CRAFTING: 'crafting',
};

// XP required per level (cumulative)
export const XP_TABLE = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200]; // levels 1–10

export class SkillSystem {
  constructor(store, skillSpec) {
    // store — from Phase 0B
    // skillSpec — loaded from specs/SKILL_TREE.json (Phase 4D)
  }

  // Get skill level (1–10)
  getLevel(skillId) { ... }

  // Get current XP and XP needed for next level
  getProgress(skillId) { ... } // { currentXP, nextLevelXP, level, percentage }

  // Award XP — auto-levels up
  // Returns { levelsGained: number, newLevel: number, unlockedBuffs: [] }
  awardXP(skillId, amount) { ... }

  // Get all active buffs from skills
  // Returns: [{ buffId, skill, level, effect }]
  getActiveBuffs() { ... }

  // Get a specific buff value (for use in game systems)
  // Example: getBuffValue('yield_bonus') → 0.1 (from Gardening level 3)
  getBuffValue(buffId) { ... }

  // Get full skill overview (for UI)
  getAllSkills() { ... } // [{ id, name, level, xp, buffs: [] }]
}
```

### Skill Definitions

| Skill | XP Sources | Buff Progression |
|-------|-----------|-----------------|
| Gardening | Plant (+10), Harvest (+25), Water (+5) | L3: +10% yield, L5: +20% yield, L7: faster growth, L10: rare crop chance |
| Soil Science | Mulch (+15), Compost (+20), Winter review (+30) | L3: -15% fatigue, L5: -25% fatigue, L7: soil preview, L10: auto-enrich |
| Composting | Craft compost (+20), Use fertilizer (+10) | L3: better fertilizer, L5: 2x compost yield, L7: rare material chance, L10: auto-compost |
| Foraging | Explore zone (+15), Find seed (+25), Discover area (+40) | L3: +1 item per forage, L5: rare seed chance, L7: 2x forage yield, L10: legendary finds |
| Social | Complete quest (+30), Talk to NPC (+5), Give gift (+15) | L3: +25% reputation gain, L5: better quest rewards, L7: exclusive quests, L10: all NPC family tier unlocked |
| Crafting | Craft item (+20), Repair tool (+10), Build decor (+15) | L3: -20% material cost, L5: +1 durability, L7: rare recipes, L10: masterwork quality |

### XP Award Triggers

XP is awarded by subscribing to store actions:

| Store Action | Skill | XP |
|-------------|-------|-----|
| PLANT_CROP | gardening | 10 |
| HARVEST_CELL | gardening | 25 |
| WATER_CELL | gardening | 5 |
| USE_INTERVENTION (mulch) | soil_science | 15 |
| COMPLETE_QUEST | social | 30 |
| FESTIVAL_ACTIVITY | varies | 20 |

### Store Integration

Add actions:
- `AWARD_XP` — { skillId, amount }
- `LEVEL_UP` — { skillId, newLevel, unlockedBuffs }

State: `campaign.skills: { [skillId]: { xp: number, level: number } }`

### Buff Application

Game systems check buffs when calculating:
- Scoring: `skillSystem.getBuffValue('yield_bonus')` modifies harvest amounts
- Soil: `skillSystem.getBuffValue('fatigue_reduction')` modifies soil fatigue
- Inventory: `skillSystem.getBuffValue('material_cost_reduction')` modifies crafting
- Reputation: `skillSystem.getBuffValue('reputation_gain_bonus')` modifies rep gains

## Constraints

- No external dependencies
- XP is always positive integers
- Level cap is 10 (XP above L10 requirement is still tracked but no level increase)
- Buffs are purely additive/multiplicative modifiers — no complex interactions
- Deterministic — same XP inputs = same levels
- All state through Store

## Testing

Write `src/game/skills.test.js`:
- awardXP: correct accumulation
- Level up: triggers at exact threshold
- Multiple level ups from single large XP award
- getActiveBuffs: returns correct buffs for current levels
- getBuffValue: aggregates correctly
- Level cap at 10
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add 6-skill progression system with XP tracking and passive buffs`
- Do NOT push
