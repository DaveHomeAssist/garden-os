# Claude Prompt — Phase 3I: Phase 3 Integration Testing

## Task

Write integration tests for audio, day/night cycle, festivals, monthly events, and NPC schedules.

## What to Test

### 1. Audio Integration
- AudioManager initializes after first user gesture
- Season change triggers ambient crossfade
- Store actions trigger correct SFX (mock AudioContext)
- Mute/unmute preserves state
- Volume controls affect correct layers

### 2. Day/Night Cycle
- Cycle disabled by default
- Enabling cycle: lighting interpolates through day phases
- Time of day affects visual elements (fireflies at night, sun rays at noon)
- Event mood override pauses cycle, resumes after
- Disabling cycle restores preset lighting

### 3. Festival System
- Festival activates at correct season/month
- Festival mechanics modify scoring/growth correctly
- Festival activities return correct rewards
- Activities can only be completed once per festival
- Festival ends at correct time, mechanics removed

### 4. Monthly Event Rotation
- Month-restricted events appear in correct months only
- General events appear in all months of their season
- No-duplicate rule works within season
- Chapter gating works with monthly system

### 5. NPC Schedule Integration
- NPCs appear in correct zone for current season
- Season transition moves NPCs to new locations
- NPCs at festival grounds during active festival

## Deliverable

- Extended `src/test/integration.test.js` with Phase 3 test suite
- All tests passing: `npx vitest run`

## After completing changes

- Commit with message: `test: add Phase 3 integration tests for audio, festivals, and seasonal systems`
- Do NOT push
