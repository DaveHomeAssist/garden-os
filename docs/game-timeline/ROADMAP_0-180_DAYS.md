# Garden OS Game Timeline (0-180 Days)

This roadmap scaffolds the three game concepts in recommended ship order:
1. Plant Strategy Simulator
2. Rescue Mission: Pest Outbreak
3. Garden League Draft

## Timeline Summary

| Window | Theme | Primary Outcome |
|---|---|---|
| Days 0-30 | Simulator foundation | Playable single-player loop on top of planner scoring |
| Days 31-60 | Simulator launch + Rescue preproduction | Public simulator beta + scenario engine ready |
| Days 61-90 | Rescue Mission launch | Scenario onboarding mode shipped |
| Days 91-120 | League architecture | Rules engine + scoring normalization + private league alpha |
| Days 121-150 | League gameplay | Draft flow + weekly scoring + achievements |
| Days 151-180 | League launch | Multiplayer season 1 launch + recap pipeline |

## Week 0 Quick Wins (30-120 minutes each)

- Add mode selector shell with disabled toggles for non-shipped modes
- Add starter mission cards with placeholder copy and state badges
- Add one reusable challenge-complete toast pattern
- Add mode empty-state guidance blocks for Simulator, Rescue, and League
- Add centralized mode feature flags (`simulator`, `rescue`, `league`)

## Phase 1 (Days 0-30): Plant Strategy Simulator Foundation

### Deliverables
- `simulator-mode` toggle and campaign wrapper in planner UI
- 10 tutorial beats (Garden GURL voice)
- 3 difficulty tiers (Starter, Ops, Brutal)
- Deterministic season simulation pass using existing scoring model
- Post-run debrief: limiting factor report + recommended moves

### Workstreams
- Engine: convert static score outputs into turn/season simulation ticks
- UX: mission start, run, debrief, retry loop
- Content: tutorial copy, challenge prompts, unlock text
- QA: deterministic re-run test for same seed inputs

### Exit Criteria
- User can complete one full simulation run in less than 10 minutes
- Score changes are explainable for every key event
- Zero backend dependencies introduced

## Phase 2 (Days 31-60): Simulator Launch + Rescue Preproduction

### Deliverables
- Public beta for simulator mode
- Challenge board with daily and weekly tasks
- Rescue incident framework:
  - incident definition schema
  - trigger conditions
  - branch outcomes
- 5 prototype rescue scenarios

### Workstreams
- Engine: challenge objective evaluation and outcome tracking
- Content: pest incident writing pack, consequence copy
- UX: challenge cards, retry flow, completion badges
- Docs: scenario authoring spec and QA checklist

### Exit Criteria
- Simulator beta stable on desktop and mobile
- Scenario framework supports at least 3 branch decisions per incident
- First rescue pack approved for production

## Phase 3 (Days 61-90): Rescue Mission Launch

### Deliverables
- Rescue mode shipped with 12 scenarios:
  - 4 early-season
  - 4 mid-season
  - 4 late-season
- Incident report UI with:
  - problem summary
  - suspected causes
  - response options
  - final outcome and lessons
- Onboarding path from Rescue into Simulator

### Workstreams
- Engine: branch resolution and deterministic consequence scoring
- UX: response selection, feedback reveal, progression map
- Content: Onion Man/Garden GURL reaction lines + incident cards
- QA: branch matrix validation for all scenarios

### Exit Criteria
- New user can finish first rescue scenario in less than 4 minutes
- Each scenario has at least 2 meaningful outcomes
- Completion data persists locally and survives reload

## Phase 4 (Days 91-120): Garden League Architecture

### Deliverables
- League scoring contract (normalized across climates/zones)
- Draft model and roster constraints
- Weekly scoring pipeline (manual and optional structured import)
- Private league setup flow (invite code, local-hosted state)

### Workstreams
- Engine: scoring normalization and anti-gaming constraints
- Data: weekly snapshot schema for standings
- UX: draft board and roster screen
- Docs: fairness policy and scoring FAQ

### Exit Criteria
- Simulated 8-team league can run full 6-week season locally
- Scoring remains stable across test zones

## Phase 5 (Days 121-150): League Gameplay

### Deliverables
- Draft day flow with pick timer and auto-pick fallback
- Weekly leaderboard and trend deltas
- Achievement system:
  - consistency
  - comeback
  - max-yield
  - lowest-risk
- End-of-week recap generator

### Workstreams
- Engine: roster lock, scoring windows, tie-break rules
- UX: standings board, player cards, achievement gallery
- Content: faction banter and weekly commentary lines
- QA: season simulation replay tests

### Exit Criteria
- League playtest with at least 4 participants completed
- Weekly recap generated automatically from league state

## Phase 6 (Days 151-180): League Launch

### Deliverables
- Season 1 launch pack
- Public docs for league rules and onboarding
- Community hub templates for:
  - team rosters
  - standings
  - challenge recaps
- Post-season report export

### Workstreams
- Ops: launch checklist, issue triage, rollback plan
- Community: starter league kit and moderator guide
- Analytics: retention and completion instrumentation
- QA: launch smoke suite

### Exit Criteria
- 1 full season completes without score corruption
- Launch blocker issue count is 0
- Reusable season template published

## Dependencies and Sequence Rules

- Rescue cannot ship before simulator campaign/debrief loop is stable.
- League cannot ship before rescue content pipeline exists.
- Schema changes must remain backward compatible with `gos-schema.json`.
- Every mode must degrade gracefully to planner core if a mode flag is off.

## Non-Negotiables

- Offline-first operation remains intact.
- Deterministic outcomes, no random score mutations.
- "A score is a diagnosis" remains the feedback principle.
- No backend lock-in in this timeline.

## Risk Register and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Simulator feels like planner duplicate | Medium | Add mission goals, fail states, and unlock progression before beta |
| Rescue scenarios become linear quiz content | High | Require branching consequences and deterministic explanations |
| League fairness disputes across zones | High | Publish normalization and tie-break policy before alpha |
| Manual data entry fatigue in League | Medium | Keep weekly workflow minimal and automate recap generation |
| Scope sprawl across three modes | High | Enforce launch gates and freeze non-critical backlog per phase |
