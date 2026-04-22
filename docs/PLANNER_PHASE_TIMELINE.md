# Garden OS · Planner Phase Timeline

Active repo-grounded phase timeline for the planner intelligence track.
Use `PLANNER_PHASE_TIMELINE_TEMPLATE.md` when drafting a new scaffold.

Last verified: 2026-04-22

---

## 1. Timeline Template

Reusable shape. Copy the block below into a new phase spec and fill every field.

```text
Phase ID        : Phase N · v0.N
Goal Sentence   : One sentence. Names the capability, not the implementation.
Duration        : N weeks from kickoff to ship gate.
Dependencies    : Prior phases that must be stable. List by ID.
Exit Criteria   : 3 to 5 measurable conditions. Each observable by opening the app or reading a test.
Deliverables    : Files affected, grouped by subsystem (derivation, reasoner, UI, scoring, save, tests).
Risk Ledger     : Schema changes. Save migration path. Rollback mechanism. Known unknowns.
Test Gate       : All prior suites green. One new integration test per exit criterion. Determinism check.
```

### Field Rules

| Field | Rule |
|-------|------|
| Goal Sentence | If it contains the word "thinking" or "smart" it is not specific enough. Rewrite. |
| Duration | Planner phases should land in 3 to 6 weeks. Anything over 6 is two phases pretending to be one. |
| Exit Criteria | Must be verifiable without the author present. Example: "Inspect panel shows derived zone for every cell." |
| Risk Ledger | If the phase touches the save format, rollback path is required, not optional. |
| Test Gate | Reasoner outputs must be deterministic. Assert on fixed inputs. |

---

## 2. Per Phase Week Shape

Default 5 week shape. Compressed or extended per phase below.

```text
W1  Scope lock. Spec draft. Risk ledger fill. Dependency check against prior phase ship state.
W2  Build pass 1. Pure logic (derivation, reasoner). No UI wiring. Unit tests written alongside.
W3  Build pass 2. UI wiring. Store integration. Save schema touches (if any) land behind a flag.
W4  Integration. Regression suite green. New integration tests for every exit criterion.
W5  Validation. Smoke pass. Migration rehearsal if schema moved. Rollback verified. CLAUDE.md + today.csv entries.
```

Short phases fold W3 into W2. Long phases add a second W2. W1 and W5 are not optional.

---

## 3. Next 5 Phases, Applied

### Phase 4 · v0.4 · Structure-Aware Planner

```text
Goal            : Inspect panel surfaces derived zone and derived traits with a one sentence reason per trait.
Duration        : 4 weeks (4A contract lock, 4B extraction, and 4C validation complete 2026-04-20)
Dependencies    : Phase 3 scoring pipeline stable
Exit Criteria   :
  1. Every grid cell resolves a derived zone with no stored zone field
  2. Every crop resolves 2+ derived traits from existing CROPS fields
  3. Reasoner returns fit, caution, or conflict deterministically
  4. Strict suggestion mode returns only fit alternatives
  5. No change to save format
Deliverables    : garden-planner-v4.html reasoning helpers and inspect render, docs/phase-reasoning-smoke.mjs, output/web-game/planner-phase4-contract/*
Risk Ledger     : Reasoning remains repo-root and additive. Mitigation: shared snapshot parity is locked and rollback was rehearsed against the legacy helper chain. Deferred risk: browser-click automation still flakes on #autoFillBtn even though planner behavior is intact.
Test Gate       : Browser contract fixtures for fit, caution, and conflict stay identical; broader weakest-cell smoke stays readable; no save schema change
```

### Phase 5 · v0.5 · Scoring Integration

```text
Goal            : Reasoning becomes a sibling payload of scoring inside the repo-root planner without altering numeric scores.
Duration        : 3 weeks (5A selected-cell score payload contract complete 2026-04-20; inspect and score-story convergence complete 2026-04-22)
Dependencies    : Phase 4 shipped
Exit Criteria   :
  1. Shared planner helpers return numeric score data and reasoning from one call path for selected cells
  2. All locked Phase 4 fixtures keep the same numeric scores and status outputs
  3. Inspect panel and score story read from the same reasoning payload, not parallel logic
  4. No new build step or framework is introduced for the repo-root planner
Deliverables    : garden-planner-v4.html scoring and reasoning helpers, docs/phase-reasoning-smoke.mjs, fixture parity artifacts in output/web-game/
Risk Ledger     : Duplicate logic risk between getScoreBreakdown(), renderScoreExplanation(), and reasoning helpers. Mitigation: selected-cell score payload now feeds both the inspect lead and score story, fixture parity held, and the smoke harness has a deterministic DOM-trigger fallback when the generic browser click path stalls on #autoFillBtn.
Test Gate       : Numeric score parity across locked fixtures, reasoning attachment assertions, browser smoke pass with deterministic fallback allowed for the auto-fill harness path
```

### Phase 6 · v0.6 · Temporal Reasoning

```text
Goal            : Reasoner accepts current season and produces season-appropriate findings and suggestions.
Duration        : 5 weeks
Dependencies    : Phase 5 shipped
Exit Criteria   :
  1. Derived-zone and fit assessment accept season as an explicit input parameter
  2. Suggestions shift by season for fixed fixtures and are documented in test artifacts
  3. Inspect panel renders a "season context" row
  4. Succession hints appear when a crop is near end of viable window
  5. plannerState.site.season remains the canonical persisted field unless a separate migration phase is approved
Deliverables    : garden-planner-v4.html seasonal reasoning and inspect context, docs/phase-reasoning-smoke.mjs, specs/CROP_SCORING_DATA.json if new seasonal metadata is required
Risk Ledger     : Main risk is inventing a second season field. Mitigation: keep plannerState.site.season authoritative; require explicit migration review before any schema change.
Test Gate       : Seasonal fixture suite, no-migration default, rollback dry run if schema moves
```

### Phase 7 · v0.7 · Multi Plot and Companion Logic

```text
Goal            : Reasoner operates across the existing multi-bed workspace and surfaces companion or antagonist adjacency findings.
Duration        : 4 weeks
Dependencies    : Phase 6 shipped
Exit Criteria   :
  1. Reasoner accepts bed context and neighboring cell references from the existing beds model
  2. Companion pairs and bad neighbors produce explicit findings (e.g. "basil next to tomato, flavor boost")
  3. Inspect panel shows a "neighbors" section with adjacency reasons
  4. Multi-bed reasoning does not leak findings or cache state between beds
Deliverables    : garden-planner-v4.html multi-bed reasoning updates, docs/phase-reasoning-smoke.mjs or dedicated perf harness, existing workspace schema only if bed-context persistence changes
Risk Ledger     : Performance and stale cross-bed cache risk. Mitigation: benchmark current max-bed scenario and memoize per bed per scenario.
Test Gate       : Adjacency fixture suite, benchmark artifact for current max planner bed, browser regression across bed switching
```

### Phase 8 · v0.8 · Reasoned Export

```text
Goal            : Reasoning output is portable as a derived export alongside .gos.json and can be consumed by external tools.
Duration        : 3 weeks
Dependencies    : Phase 7 shipped
Exit Criteria   :
  1. Derived reasoning export schema is versioned and explicitly secondary to .gos.json
  2. Export is produced from a fixed plot and season without requiring planner code at read time
  3. Existing .gos.json workspace export/import remains authoritative and unchanged
  4. Export is deterministic for a fixed plot and season
  5. If replay import is added, it is analysis-only and does not replace workspace import
Deliverables    : garden-planner-v4.html derived export path, versioned reasoning export schema or doc, export fixtures, optional replay helper only if analysis import is approved
Risk Ledger     : Secondary export can drift from authoritative workspace export. Mitigation: document it as non-authoritative and pin both contracts in tests.
Test Gate       : Derived export determinism, contract version gate, no-regression check for .gos.json export/import
```

---

## 4. Milestone Calendar

Default assumes sequential delivery starting 2026-04-20 at 1 phase boundary per cycle. Parallelism is possible where risk ledgers do not overlap.

| Phase | Start | Ship gate | Cumulative weeks |
|-------|-------|-----------|------------------|
| 4 | 2026-04-20 | 2026-05-08 | 3 |
| 5 | 2026-05-11 | 2026-05-29 | 6 |
| 6 | 2026-06-01 | 2026-07-03 | 11 |
| 7 | 2026-07-06 | 2026-07-31 | 15 |
| 8 | 2026-08-03 | 2026-08-21 | 18 |

Roughly 4 months end to end. Any approved schema migration in Phase 6 still pushes every later phase by the same amount since save compatibility is shared.

---

## 5. Gate Checklist (applies to every phase)

Before declaring ship:

- [ ] All exit criteria observable without the author running the app
- [ ] Integration test exists for each exit criterion
- [ ] Risk ledger has a rollback path that was actually executed in dry run
- [ ] CLAUDE.md updated with phase entry
- [ ] today.csv line written with project, problem, impact, implementation, follow up
- [ ] UI_ISSUES_TABLE.html updated for any deferred work

---

## Documentation Maintenance

Issues: garden-os/docs/UI_ISSUES_TABLE.html
Session log: /Users/daverobertson/Desktop/Code/90-governance/docs/today.csv
Implementation plan: garden-os/IMPLEMENTATION_PLAN.md
Canonical upgrade phases (game track, separate): garden-os/specs/UPGRADE_PHASES.md
