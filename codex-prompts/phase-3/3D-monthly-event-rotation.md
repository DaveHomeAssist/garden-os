# Codex Prompt — Phase 3D: Monthly Event Rotation

## Task

Modify `src/data/events.js` to support monthly event rotations in addition to the existing per-phase event draws.

## Current State

`events.js` implements:
- Weighted random draw from `specs/EVENT_DECK.json`
- Filtered by chapter gate and season
- No-duplicate rule within same season
- 3 draws per season (one per beat phase: early, mid, late)

## Deliverable

### Extend events.js

```js
// NEW: monthly event rotation for Let It Grow mode
// Returns events available for a specific month within a season
export function getMonthlyEvents(season, month, chapter, drawnThisSeason = []) {
  // month: 1, 2, or 3 (within the season)
  // Filter EVENT_DECK by:
  //   1. Season match
  //   2. Chapter gate (chapter_min <= chapter)
  //   3. Not in drawnThisSeason
  //   4. Monthly rotation rules (see below)
  // Return: array of eligible event objects, sorted by draw weight
}

// NEW: monthly rotation rules
// Some events only appear in specific months:
//   - "late_frost": spring month 1 only
//   - "heat_wave": summer month 2–3 only
//   - "first_frost": fall month 3 only
//   - "holiday_feast": winter month 3 only
// Events without month restrictions appear in any month of their season.
```

### Add Month Restrictions to EVENT_DECK.json

Add optional `months` field to event entries in `specs/EVENT_DECK.json`:

```json
{
  "id": "late_frost",
  "season": "spring",
  "months": [1],
  ...
}
```

Events without `months` field are available all months of their season (backward compatible).

### Monthly Draw Logic

In Let It Grow mode (not Story Mode):
1. Each in-game month, draw 1–2 events from the monthly pool
2. Events are weighted by `drawWeight` (existing field)
3. No-duplicate rule: same event can't occur twice in one season
4. Higher chapters unlock more event variety
5. Monthly rotation creates more variety than the per-phase system

### Integration

- Story Mode continues using existing `drawEvent()` function (no change)
- Let It Grow mode calls `getMonthlyEvents()` for its event scheduling
- Both modes read from the same EVENT_DECK.json
- Monthly rotation is additive — doesn't remove events, just filters timing

## Constraints

- Do NOT break existing `drawEvent()` function or Story Mode event behavior
- EVENT_DECK.json changes must be backward compatible (new fields are optional)
- Deterministic given same inputs (weighted selection uses seeded index, not Math.random)
- No external dependencies

## Testing

- Unit test: `getMonthlyEvents('spring', 1, ...)` includes "late_frost" but not "heat_wave"
- Unit test: `getMonthlyEvents('summer', 2, ...)` includes "heat_wave" but not "late_frost"
- Unit test: no-duplicate filtering works
- Unit test: chapter gating works
- Unit test: events without month restrictions appear in all months
- Verify existing tests still pass: `npx vitest run`

## After completing changes

- Commit with message: `feat: add monthly event rotation for Let It Grow mode`
- Do NOT push
