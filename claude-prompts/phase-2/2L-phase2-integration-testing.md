# Claude Prompt — Phase 2L: Phase 2 Integration Testing

## Task

Write integration tests for the NPC, quest, reputation, dialogue branching, and zone transition systems introduced in Phase 2.

## What to Test

### 1. Quest Lifecycle
- Quest appears as AVAILABLE when prerequisites are met
- Accepting quest transitions to ACCEPTED
- Planting required crops transitions to IN_PROGRESS then READY_TO_TURN_IN
- Turning in quest grants rewards (seeds, reputation, XP)
- Quest state persists across save/load

### 2. Reputation Integration
- Quest completion grants correct reputation amount
- Reputation tier thresholds work (0→Stranger, 25→Acquaintance, etc.)
- Reputation unlocks new quest availability
- Reputation decay applies at season transition
- Reputation-gated dialogue variants work

### 3. Dialogue Branching
- Scene with choices: buttons appear after text
- Selecting "accept quest" choice dispatches ACCEPT_QUEST
- Branch plays correct follow-up dialogue
- Scene without choices: plays linearly (no regression)
- Keyboard navigation through choices works

### 4. Zone Transitions
- Walking to zone exit triggers transition
- Fade effect plays (mock DOM check)
- Previous zone resources disposed (tracker.count = 0)
- New zone loaded with correct seasonal variation
- Player spawn point correct after transition
- Store dispatches ZONE_CHANGED and ZONE_VISITED

### 5. NPC Schedules
- NPCs appear in correct zone for current season
- NPC greeting matches reputation tier
- NPC interaction triggers quest dialogue when quest available

### 6. Save/Load with Phase 2 Data
- Save with active quests, reputation, visited zones
- Load restores all Phase 2 state correctly
- Old save without Phase 2 fields loads with defaults

## Deliverable

- Extended `src/test/integration.test.js` with Phase 2 test suite
- All tests passing: `npx vitest run`

## After completing changes

- Commit with message: `test: add Phase 2 integration tests for quests, NPCs, reputation, and zones`
- Do NOT push
