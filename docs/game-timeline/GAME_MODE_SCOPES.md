# Game Mode Scopes and Backlog Seeds

## 1) Plant Strategy Simulator (Ship First)

### Product Goal
Turn planner scoring into a repeatable optimization game loop:
Plan -> Simulate -> Diagnose -> Iterate.

### Core Loop
1. Choose mission
2. Build or import layout
3. Run season simulation
4. Review diagnostic debrief
5. Apply changes and re-run

### Must-Have Scope
- Mission selector (starter set: 8 missions)
- Difficulty tiers and reward multipliers
- Simulation run control (start, pause, reset)
- Debrief panel with limiting-factor ranking
- Progress state saved locally

### Nice-to-Have Scope
- Replay timeline scrubber
- Seeded run IDs for reproducible comparisons
- Personal best board

### Content Requirements
- 10 onboarding lines (Garden GURL)
- 40 scoring commentary lines
- 24 challenge prompts

### Acceptance Criteria
- Same inputs produce same outcomes across reload
- Every score drop in debrief maps to an explicit factor
- User can restart any mission without corrupting workspace

## 2) Rescue Mission: Pest Outbreak (Ship Second)

### Product Goal
Teach risk recognition and intervention logic with scenario-based play.

### Core Loop
1. Receive incident report
2. Review clues and conditions
3. Select intervention plan
4. Resolve deterministic outcome
5. Review lesson and carry forward to simulator

### Must-Have Scope
- Incident card renderer
- Branch decision engine (minimum 3 branches)
- Outcome report with score impact summary
- Scenario progression map
- Save state for completed incidents

### Nice-to-Have Scope
- Time-pressure mode for advanced players
- Regional scenario packs
- "Retry with hint" mode

### Content Requirements
- 12 production scenarios
- 3 branch outcomes per scenario (min)
- Onion Man and Garden GURL reaction lines for each branch

### Acceptance Criteria
- Scenario outcome remains deterministic for same decisions
- Incident report clearly explains why the outcome occurred
- Branch coverage test exists for all scenario paths

## 3) Garden League Draft (Ship Third)

### Product Goal
Create multiplayer seasonal competition with fair normalized scoring.

### Core Loop
1. Draft crops to roster
2. Lock weekly lineup
3. Score from performance metrics
4. View standings and recaps
5. Adjust strategy for next week

### Must-Have Scope
- Draft board and pick order system
- Weekly scoring engine with normalization
- Standings table with tie-break logic
- Achievement tracker
- End-of-week recap output

### Nice-to-Have Scope
- Live draft commentary feed
- Faction-specific banter packs
- Season archive browser

### Content Requirements
- Draft day copy and prompts
- Weekly recap templates
- Achievement names and descriptions

### Acceptance Criteria
- 6-week simulated season runs without score drift
- Tie-break outcomes are deterministic and documented
- Weekly recap can be generated from stored state only

## Shared Technical Scope

### Engine and Data
- Maintain compatibility with `gos-schema.json`
- Add mode-specific schemas under `specs/` before implementation
- Introduce feature flags for mode rollout

### UX and A11Y
- Keyboard-complete flows for all mode actions
- Focus management and visible states
- Mobile support for primary loops

### QA
- Deterministic regression tests for each mode
- Save/load integrity tests per mode
- Launch smoke test matrix by viewport

## Suggested Epic Breakdown

### Epic A: Runtime Mode Shell
- Add mode selector and routing context
- Persist mode-specific state keys
- Feature-flag toggles for gradual rollout

### Epic B: Simulation Core
- Time-step runner
- Rule evaluation pipeline
- Debrief calculation and ranking

### Epic C: Scenario Framework
- Incident schema
- Branch resolver
- Outcome renderer

### Epic D: League Engine
- Draft mechanics
- Scoring normalization
- Standings and recap generation

### Epic E: Narrative Layer
- Character voice packs
- Contextual copy hooks
- Achievement and event text
