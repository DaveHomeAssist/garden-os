# Codex Prompt — Phase 2K: Save System Extensions

## Task

Extend `src/game/save.js` to persist quest log, reputation, and world state alongside existing campaign data.

## Current State

`save.js` handles:
- `saveCampaign(slot)` — serializes campaign state to localStorage
- `loadCampaign(slot)` — deserializes campaign state
- `saveSeasonState(slot)` — stores current season
- `deleteCampaign(slot)` — removes slot data
- `listSaves()` — summary of all slots
- Keys: `campaign_slot_N`, `season_slot_N`

## Deliverable

### 1. Extend saveCampaign

Add the new campaign fields to serialization:

```js
function saveCampaign(slot) {
  const data = {
    // ... existing fields
    questLog: campaign.questLog,       // NEW
    reputation: campaign.reputation,   // NEW
    worldState: {                      // NEW
      currentZone: campaign.worldState.currentZone,
      visitedZones: [...campaign.worldState.visitedZones],
    },
    version: 2,  // Bump version for migration detection
  };
  localStorage.setItem(`campaign_slot_${slot}`, JSON.stringify(data));
}
```

### 2. Extend loadCampaign

Add backward-compatible loading with defaults:

```js
function loadCampaign(slot) {
  const raw = JSON.parse(localStorage.getItem(`campaign_slot_${slot}`));
  if (!raw) return null;

  return {
    // ... existing fields
    questLog: raw.questLog || {},
    reputation: raw.reputation || { old_gus: 0, maya: 0, lila: 0 },
    worldState: raw.worldState || { currentZone: 'player_plot', visitedZones: ['player_plot'] },
  };
}
```

### 3. Extend listSaves

Add quest/reputation summary to save slot display:

```js
// Add to each slot summary:
{
  // ... existing: chapter, season, score, grade
  activeQuests: Object.values(questLog).filter(q => q.state === 'ACCEPTED' || q.state === 'IN_PROGRESS').length,
  zonesVisited: worldState.visitedZones.length,
}
```

### 4. Migration

If `version` field is missing or < 2, apply defaults for new fields when loading. Never lose existing data.

## Constraints

- localStorage quota handling preserved (try-catch)
- No circular references in serialized data
- visitedZones stored as Array (not Set)
- Old saves (version 1 or no version) load without errors
- New fields have sensible defaults

## Testing

- Save with new fields, reload — all data present
- Load an old-format save (no questLog/reputation) — defaults applied, no crash
- listSaves includes new summary fields
- localStorage quota warning still works
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: extend save system to persist quests, reputation, and world state`
- Do NOT push
