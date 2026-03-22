# Codex Prompt — Phase 5C: Zone Gate Logic

## Task

Extend `src/scene/zone-manager.js` to enforce reputation and skill requirements before allowing zone transitions.

## Context

Expansion zones are gated: some require NPC reputation tiers, others require skill levels. The zone manager (Phase 2H) handles transitions — this task adds the gating check.

## Deliverable

### Extend zone-manager.js

```js
// Add zone gate definitions
registerZoneGate(zoneId, requirements) {
  // requirements: { reputation?: { [npcId]: tierName }, skills?: { [skillId]: level }, quests?: string[] }
}

// Check if player can enter a zone
canEnterZone(zoneId) {
  // Returns { allowed: boolean, blockers: [{ type, requirement, current, needed }] }
}

// Override transitionTo to check gates
async transitionTo(zoneId, spawnPoint = null) {
  const check = this.canEnterZone(zoneId);
  if (!check.allowed) {
    // Don't transition — return blockers for UI to display
    return { blocked: true, blockers: check.blockers };
  }
  // ... existing transition logic
}
```

### Zone Gate Definitions

| Zone | Requirements |
|------|-------------|
| player_plot | None (always accessible) |
| neighborhood | None (always accessible) |
| meadow | Foraging skill level 3 |
| riverside | Complete quest "gus_river_path" |
| forest_edge | Old Gus reputation: Friend (50+) |
| greenhouse | Crafting skill level 5 |
| festival_grounds | Active festival only |
| market_square | Social skill level 2 |

### Blocker UI

When a gate blocks transition, the UI should show:
- "This area requires [requirement description]"
- Current progress toward requirement
- What to do to unlock (e.g., "Complete quests for Old Gus to build friendship")

The zone-manager returns blocker data; a UI component (not in this task) will render it.

### Integration

- ReputationSystem (Phase 2G) provides `getTier(npcId)` for reputation checks
- SkillSystem (Phase 4C) provides `getLevel(skillId)` for skill checks
- QuestEngine (Phase 2D) provides quest completion checks
- FestivalEngine (Phase 3E) provides `getActiveFestival()` for festival gate

## Constraints

- No external dependencies
- Gates are checked every transition attempt (not cached)
- Gate definitions are data-driven (easy to add new gates without code changes)
- Failed gate check does NOT trigger a zone transition (no flicker)

## Testing

- Unit test: canEnterZone with met requirements → allowed
- Unit test: canEnterZone with unmet reputation → blocked with correct blocker
- Unit test: canEnterZone with unmet skill → blocked with correct blocker
- Unit test: festival-gated zone → blocked when no festival, allowed during festival
- Unit test: transitionTo blocked zone → returns blockers, no transition
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add zone gate logic with reputation, skill, and quest requirements`
- Do NOT push
