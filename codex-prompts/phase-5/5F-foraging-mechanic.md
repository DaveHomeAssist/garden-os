# Codex Prompt — Phase 5F: Foraging Mechanic

## Task

Create `src/game/foraging.js` — a gathering system for wild zones where players find seeds, materials, and rare items.

## Context

Expansion zones (meadow, riverside, forest) contain foraging spots where players can gather resources. Foraging is influenced by the Foraging skill, season, and zone type.

## Deliverable

Create `src/game/foraging.js`:

```js
export class ForagingSystem {
  constructor(store, inventory, skillSystem) { ... }

  // Get foraging spots in current zone
  // Returns: [{ id, position, type, available: boolean, cooldownRemaining }]
  getForagingSpots(zoneId) { ... }

  // Attempt to forage at a spot
  // Returns: { success, items: [{ itemId, count }], xpGained, message }
  forage(spotId) { ... }

  // Check if a spot is available (not on cooldown)
  isAvailable(spotId) { ... }

  // Apply seasonal modifiers to loot tables
  getSeasonalLoot(zoneId, season) { ... }

  // Reset daily foraging spots
  resetDaily() { ... }
}
```

### Foraging Spot Types

| Type | Zones | Loot |
|------|-------|------|
| herb_patch | meadow, forest | Herb seeds, dried herbs |
| berry_bush | forest, riverside | Berry seeds, fresh berries |
| rock_pile | meadow | Minerals, stone, crystal shards |
| driftwood | riverside | Wood, scrap metal, rare seeds |
| mushroom_log | forest | Mushroom spores, compost material |
| wildflower_field | meadow | Flower seeds, plant matter |

### Loot Table Structure

```js
const LOOT_TABLES = {
  herb_patch: {
    common: [{ itemId: 'basil_seed', count: [1, 3], weight: 40 }, { itemId: 'cilantro_seed', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'rosemary_seed', count: [1, 1], weight: 20 }],
    rare: [{ itemId: 'heirloom_herb_seed', count: [1, 1], weight: 10 }],
  },
  // ...
};
```

### Loot Selection (Deterministic)

Loot is selected using a seeded index based on: `zoneId + spotId + season + dayNumber + foragingLevel`. This ensures:
- Same inputs = same output (deterministic)
- Different visits to same spot give variety (day number changes)
- Higher foraging skill shifts weights toward better loot

### Skill Integration

| Foraging Level | Effect |
|---------------|--------|
| 1 | Base loot only |
| 3 | +1 item per forage |
| 5 | Rare seed chance doubled (weight multiplied) |
| 7 | 2x all item counts |
| 10 | Legendary items added to loot tables |

### Cooldowns

- Each spot has a real-time cooldown after being foraged
- Base cooldown: 300 seconds (5 minutes)
- Cooldowns stored in session state (not campaign — reset on reload is OK)

### Store Integration

- `FORAGE` — { spotId, items, xpGained }
- Items added to inventory via inventory system

## Constraints

- No external dependencies
- Deterministic loot selection (seeded, not Math.random())
- Foraging spots are registered as interactables (Phase 1D)
- Cooldown timer uses `Date.now()`, not setInterval
- If inventory is full, foraged items are dropped (warn player)

## Testing

Write `src/game/foraging.test.js`:
- Forage produces items from correct loot table
- Same seed produces same loot (deterministic)
- Skill modifiers increase loot correctly
- Cooldown prevents re-foraging
- Cooldown expires correctly
- Full inventory handling
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add foraging mechanic with zone-specific loot tables and skill scaling`
- Do NOT push
