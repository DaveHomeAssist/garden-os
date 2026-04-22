# Garden OS · Planner Phase Timeline Template

Canonical scaffold for drafting future planner intelligence phases.
Use `PLANNER_PHASE_TIMELINE.md` for the active repo-grounded timeline.

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
| Deliverables | Name actual repo files. Do not invent `src/...` modules if the work lives in repo-root HTML or existing docs. |
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

## 3. Planner-Specific Fill Rules

- Repo-root planner work should name `garden-planner-v4.html` when that is the real implementation surface.
- Reasoning and regression work should name `docs/phase-reasoning-smoke.mjs` when the browser contract is part of the ship gate.
- Browser artifacts should point at the real `output/web-game/...` directory when those files are part of verification evidence.
- Export work must keep `.gos.json` authoritative unless a replacement contract is explicitly approved.
- Save-field changes must name the existing canonical field first and state the rollback path in plain language.

---

## 4. Example Filled Phase Block

```text
Phase ID        : Phase N · Capability Name
Goal Sentence   : One sentence describing what the planner can now do.
Duration        : 3 weeks
Dependencies    : Prior shipped planner phase
Exit Criteria   :
  1. Observable planner behavior
  2. Deterministic fixed-fixture output
  3. No regression to existing save/export contract
Deliverables    : garden-planner-v4.html, docs/phase-reasoning-smoke.mjs, output/web-game/example/*
Risk Ledger     : Main technical risk, rollback path, and any save/export caveat
Test Gate       : Existing suites green plus one new deterministic planner check
```

---

## 5. Gate Checklist

Before declaring ship:

- [ ] All exit criteria observable without the author running the app
- [ ] Integration or browser contract checks exist for each exit criterion
- [ ] Risk ledger includes a rollback path that was actually exercised when needed
- [ ] Actual repo files are named in Deliverables
- [ ] `.gos.json` authority remains explicit if export work is involved
- [ ] CLAUDE.md updated with phase entry if behavior or process changed
- [ ] UI_ISSUES_TABLE.html updated for any deferred work

---

## Documentation Maintenance

Issues: garden-os/docs/UI_ISSUES_TABLE.html
Session log: /Users/daverobertson/Desktop/Code/90-governance/docs/today.csv
Implementation plan: garden-os/IMPLEMENTATION_PLAN.md
Canonical active timeline: garden-os/docs/PLANNER_PHASE_TIMELINE.md
