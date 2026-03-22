# Codex Prompt — Phase 2J: State Store Extensions for Quests + Reputation

## Task

Extend `src/game/store.js` reducer to handle quest log, reputation, and zone state.

## Prerequisites

Store (Phase 0B) is already implemented with base game actions.

## Deliverable

Add these action types and reducer cases to `store.js`:

### New Actions

```js
// Quest actions
ACCEPT_QUEST: 'ACCEPT_QUEST',         // { questId }
ABANDON_QUEST: 'ABANDON_QUEST',       // { questId }
UPDATE_QUEST_STATE: 'UPDATE_QUEST_STATE', // { questId, newState }
COMPLETE_QUEST: 'COMPLETE_QUEST',      // { questId, rewards }

// Reputation actions
ADD_REPUTATION: 'ADD_REPUTATION',     // { npcId, amount }
DECAY_REPUTATION: 'DECAY_REPUTATION', // {} — applies to all NPCs

// Zone actions
ZONE_CHANGED: 'ZONE_CHANGED',        // { fromZone, toZone, spawnPoint }
ZONE_VISITED: 'ZONE_VISITED',        // { zoneId }
```

### State Shape Extensions

Add to `campaign` state:

```js
campaign: {
  // ... existing fields (chapter, season, cropUnlocks, pantry, keepsakes, journal, soilHealth)

  // NEW:
  questLog: {
    // [questId]: { state: QuestStates.X, acceptedAt: timestamp, completedAt: timestamp|null }
  },
  reputation: {
    // [npcId]: number (0–100)
    old_gus: 0,
    maya: 0,
    lila: 0,
  },
  worldState: {
    currentZone: 'player_plot',
    visitedZones: ['player_plot'],
  },
}
```

### Reducer Cases

Each reducer case must:
1. Return a new state object (shallow copy)
2. Not mutate the input state
3. Handle missing/undefined fields gracefully (backward compatibility with old saves)

```js
case Actions.ACCEPT_QUEST: {
  const { questId } = action.payload;
  return {
    ...state,
    campaign: {
      ...state.campaign,
      questLog: {
        ...state.campaign.questLog,
        [questId]: { state: 'ACCEPTED', acceptedAt: Date.now(), completedAt: null }
      }
    }
  };
}
// ... etc for each action
```

### Backward Compatibility

When loading old saves that lack the new fields, the reducer should initialize defaults:

```js
// In LOAD_SAVE reducer or in store initialization:
if (!state.campaign.questLog) state.campaign.questLog = {};
if (!state.campaign.reputation) state.campaign.reputation = { old_gus: 0, maya: 0, lila: 0 };
if (!state.campaign.worldState) state.campaign.worldState = { currentZone: 'player_plot', visitedZones: ['player_plot'] };
```

## Constraints

- Reducer remains a pure function
- No side effects in reducer (no localStorage, no DOM, no network)
- Backward compatible with existing saves
- Quest log and reputation must be serializable (no functions, no Sets — use arrays for visitedZones)

## Testing

Add tests to `src/game/store.test.js`:
- ACCEPT_QUEST creates entry in questLog
- COMPLETE_QUEST sets completedAt and state
- ADD_REPUTATION clamps to 0–100
- DECAY_REPUTATION reduces all NPCs by 1, floors at 0
- ZONE_CHANGED updates currentZone
- ZONE_VISITED adds to visitedZones (no duplicates)
- LOAD_SAVE with old format initializes defaults
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: extend state store with quest, reputation, and zone actions`
- Do NOT push
