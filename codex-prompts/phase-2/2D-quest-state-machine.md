# Codex Prompt — Phase 2D: Quest State Machine

## Task

Create `src/game/quest-engine.js` — the quest state machine that manages quest lifecycle from availability through completion.

## Context

Let It Grow introduces 25 quests across 7 NPCs (see `specs/QUEST_DECK.json`). Each quest follows a state machine: AVAILABLE → ACCEPTED → IN_PROGRESS → READY_TO_TURN_IN → COMPLETED, with branches to ABANDONED and FAILED.

## Deliverable

Create `src/game/quest-engine.js`:

```js
// Quest states
export const QuestStates = {
  AVAILABLE: 'AVAILABLE',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  READY_TO_TURN_IN: 'READY_TO_TURN_IN',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  FAILED: 'FAILED',
};

export class QuestEngine {
  constructor(store, questDeck) {
    // store — from Phase 0B
    // questDeck — loaded from specs/QUEST_DECK.json (Phase 2E)
  }

  // Check which quests are available given current state
  // Filters by: chapter, season, reputation, prerequisites
  getAvailableQuests() { ... }

  // Get active quests (ACCEPTED or IN_PROGRESS)
  getActiveQuests() { ... }

  // Get quests for a specific NPC
  getQuestsForNPC(npcId) { ... }

  // Accept a quest — transitions AVAILABLE → ACCEPTED
  acceptQuest(questId) { ... }

  // Abandon a quest — transitions ACCEPTED/IN_PROGRESS → ABANDONED
  abandonQuest(questId) { ... }

  // Check progress on all active quests against current state
  // Automatically transitions IN_PROGRESS → READY_TO_TURN_IN when requirements met
  evaluateProgress() { ... }

  // Turn in a completed quest — transitions READY_TO_TURN_IN → COMPLETED
  // Returns rewards to be applied
  turnInQuest(questId) { ... }

  // Check for timed quest failures
  // Transitions timed quests past deadline → FAILED
  checkTimedQuests() { ... }

  // Get quest log (for UI display)
  getQuestLog() { ... }
}
```

### Quest Data Shape (from QUEST_DECK.json)

```js
{
  id: "gus_tomatoes",
  npc: "old_gus",
  type: "discover",       // fetch | assist | discover | timed | craft
  title: "Grandpa's Tomatoes",
  description: "Old Gus remembers a cherry tomato his grandfather used to grow...",
  acceptDialogue: "Used to be a tomato my granddad grew...",
  progressDialogue: "Back when I was small, those tomatoes came in by the bushel...",
  completeDialogue: "Well I'll be. That's the one...",
  requirements: [
    { type: "crop_harvested", id: "cherry_tom", count: 3 }
  ],
  rewards: [
    { type: "seed", id: "heritage_pepper", amount: 1 },
    { type: "reputation", id: "old_gus", amount: 15 }
  ],
  prerequisites: {
    chapter_min: 3,
    season: "summer",          // null = any season
    reputation: {},             // minimum reputation required
    quests_completed: []        // quest IDs that must be done first
  },
  timed: false,
  deadline: null,  // for timed quests: number of phases or real-time seconds
}
```

### Requirement Evaluation

Requirements are checked against game state:

| Requirement Type | Check Against |
|-----------------|---------------|
| `crop_harvested` | campaign.pantry — has player harvested N of crop `id`? |
| `crop_planted` | season.grid — are N cells planted with crop `id`? |
| `reputation` | reputation store — is NPC reputation >= threshold? |
| `item_crafted` | inventory — has player crafted item `id`? |
| `zone_visited` | world state — has player entered zone `id`? |
| `season` | campaign.season — is it the required season? |

### Store Integration

Add these actions to the store:
- `ACCEPT_QUEST` — { questId }
- `ABANDON_QUEST` — { questId }
- `UPDATE_QUEST_STATE` — { questId, newState }
- `COMPLETE_QUEST` — { questId, rewards }

Quest state is stored in `campaign.questLog: { [questId]: { state, acceptedAt, completedAt } }`

### Calling Pattern

1. When player approaches an NPC: `questEngine.getQuestsForNPC(npcId)` → show available/turn-in quests
2. When player accepts: `questEngine.acceptQuest(questId)` → dispatches to store
3. Each phase transition: `questEngine.evaluateProgress()` → auto-detects completion
4. Each phase: `questEngine.checkTimedQuests()` → fails expired quests
5. When player returns to NPC: `questEngine.turnInQuest(questId)` → grants rewards

## Constraints

- No external dependencies
- Deterministic — same state + same action = same result
- All mutations go through the Store
- Quest requirements checked against canonical state (never cached/stale data)
- Max 3 active quests at once (configurable constant)

## Testing

Write `src/game/quest-engine.test.js`:
- Test state transitions: AVAILABLE → ACCEPTED → IN_PROGRESS → READY → COMPLETED
- Test ABANDONED path
- Test FAILED path (timed quest)
- Test prerequisite filtering (chapter gate, season gate, reputation gate)
- Test requirement evaluation for each type
- Test reward structure is returned correctly
- Test max-active-quests limit
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add quest state machine with requirement evaluation and rewards`
- Do NOT push
