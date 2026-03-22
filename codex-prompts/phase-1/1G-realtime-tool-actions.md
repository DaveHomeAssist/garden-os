# Codex Prompt — Phase 1G: Real-Time Tool Actions

## Task

Modify `src/game/intervention.js` to support real-time tool usage (water, plant, harvest, protect, mulch) triggered by the tool HUD + proximity interaction, in addition to the existing turn-based token system.

## Context

Story Mode uses turn-based intervention tokens: player gets N tokens per season, spends them during events. Let It Grow mode lets players use tools freely in real-time — walk to a cell, equip a tool, interact.

## Current State

`src/game/intervention.js` exports 6 actions: protect, mulch, companion_patch, prune, swap, accept_loss. Each:
1. Takes a cell index + game state
2. Modifies cell state (protection flag, intervention bonus, carry-forward)
3. Deducts an intervention token

## Deliverable

Extend `intervention.js` with real-time tool action support:

```js
// New: execute a tool action (real-time mode)
// Returns { success: boolean, message: string, effects: object }
export function executeToolAction(store, toolId, cellIndex) {
  const state = store.getState();
  const cell = state.season.grid[cellIndex];

  switch (toolId) {
    case 'water':
      // Applies +0.3 intervention bonus (caps at 1.0)
      // Requires: cell has a crop
      // Cooldown: cell.lastWatered must be > 30 seconds ago (real time)
      break;

    case 'plant':
      // Returns { success: false, action: 'open_crop_picker' } if cell is empty
      // The UI layer handles showing the crop picker
      // After picker selection, dispatches PLANT_CROP to store
      break;

    case 'harvest':
      // Harvests if crop is mature (season phase >= LATE_SEASON or growth timer complete)
      // Dispatches harvest scoring for this cell
      // Adds to pantry
      break;

    case 'protect':
      // Sets cell.protection = true
      // Lasts until next event or season end
      break;

    case 'mulch':
      // Sets cell.carryForward = 'enriched'
      // Applies +0.2 intervention bonus
      break;

    case 'hand':
      // Opens inspect panel for the cell
      // Returns { success: true, action: 'inspect', cellIndex }
      break;
  }
}

// New: check if a tool action is valid for a given cell
export function canUseTool(state, toolId, cellIndex) {
  // Returns { valid: boolean, reason: string }
  // Checks: cell has crop (for water/harvest), cell is empty (for plant), cooldowns, etc.
}
```

### Cooldown System

Add a simple cooldown tracker to prevent spamming:

```js
const cooldowns = new Map(); // key: `${toolId}_${cellIndex}`, value: timestamp

export function isOnCooldown(toolId, cellIndex) { ... }
export function setCooldown(toolId, cellIndex, durationMs) { ... }
```

| Tool | Cooldown |
|------|----------|
| water | 30s per cell |
| plant | None (one-time) |
| harvest | None (one-time, removes crop) |
| protect | 60s per cell |
| mulch | 120s per cell |
| hand | None |

### Integration

- InteractionSystem (Phase 1D) calls `executeToolAction(store, toolHUD.getSelectedTool(), cellIndex)` when player interacts
- `canUseTool()` is checked before showing the interaction prompt — if tool can't be used on this cell, show "Can't use X here" instead
- Story Mode continues using the existing token-based system unchanged

### Store Actions to Add

Add to `src/game/store.js` Actions:
- `WATER_CELL` — { cellIndex, bonus }
- `HARVEST_CELL` — { cellIndex }
- `SET_COOLDOWN` — { toolId, cellIndex, until }

## Constraints

- Do not break the existing token-based intervention system
- Real-time actions must dispatch through the Store (Phase 0B)
- Cooldowns use `Date.now()` — no setTimeout
- All effects must be deterministic given the same inputs (no randomness)

## Testing

- Unit test each tool action: valid cell, invalid cell, cooldown, result
- Unit test `canUseTool` for each tool type
- Manual: in Let It Grow mode — water a crop, wait 30s, water again
- Manual: try to harvest an empty cell — should be rejected
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add real-time tool actions for Let It Grow mode`
- Do NOT push
