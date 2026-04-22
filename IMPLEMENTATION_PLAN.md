# Garden OS — 30 / 60 / 90 Day Implementation Plan

**Last verified:** 2026-04-20

## Immediate Stabilization Plan — 2026-03-31

### Verified Baseline

- Fresh clone path: `/Users/daverobertson/Desktop/Code/garden-os-fresh`
- Active app surface: `story-mode/` Vite + Three.js runtime
- `npm ci`: complete in `story-mode/`
- `npm test`: `28` files passed, `329` tests passed, `0` failed
- `npm run build`: succeeds and writes `dist/build-meta.json`
- Primary published Story Mode route: `/garden-os/story-mode-live/`
- Canonical docs now distinguish root static tools from the built `story-mode/` runtime; remaining drift is limited to lower-priority docs and inventory details

### Phase 0 — Fresh Clone Recovery

**Theme:** Restore a clean green baseline before any new feature work.
**Status:** COMPLETE — 2026-03-31

### 0A. Unblock Story Mode Build

**What:** Remove the duplicate `zoneManager` binding in `src/ui/ui-binder.js`.

**Scope:**
- Inspect the `bindUI(...)` parameter list and downstream zone-manager wiring
- Reuse the injected `zoneManager` or rename the local instance so the function has only one binding
- Re-run `node --check src/ui/ui-binder.js`
- Re-run `npm run build`

**Why now:** The current source does not parse, so the flagship runtime cannot build or ship.

**Deliverable:** `story-mode` builds successfully from a fresh clone.
**Status:** complete.

### 0B. Repair Save Test Harness

**What:** Fix the `localStorage` teardown bug in `src/game/save.test.js`.

**Scope:**
- Stop calling `localStorage.clear()` after `vi.unstubAllGlobals()`
- Replace the shared mock with a per-test reset path or clear the mock before unstubbing globals
- Preserve the existing save/load assertions; do not weaken coverage
- Re-run `npx vitest run src/game/save.test.js`

**Why now:** The suite is mostly green, but the failing save tests hide whether persistence logic is healthy.

**Deliverable:** All 7 save tests pass without warnings caused by the mock lifecycle.
**Status:** complete.

### 0C. Re-run Full Verification Gate

**What:** Revalidate the fresh clone after the two blocking fixes.

**Scope:**
- Run `npm test`
- Run `npm run build`
- Confirm no new syntax or runtime warnings are introduced by the fixes

**Why now:** The repo needs one trusted baseline before any additional work lands.

**Deliverable:** A fresh-clone verification result with green tests and a passing production build.
**Status:** complete.

### 0D. Documentation Alignment Pass

**What:** Reconcile the repo instructions after the runtime is healthy again.

**Scope:**
- Update `STATUS_CHECK.md` with the current test/build expectations if counts have drifted
- Align public docs and nav links on `/story-mode-live/` and `system-map.html`
- Reconcile `CLAUDE.md` with the reality documented in `docs/HANDOFF.md` so agents are not told both "no npm" and "use story-mode/"
- Keep root-tool constraints intact for the static HTML surfaces; only clarify the `story-mode/` exception

**Why now:** The current docs are internally contradictory and will keep producing bad assumptions in future sessions.

**Deliverable:** One coherent instruction set for root tools vs `story-mode/`.
**Status:** complete.

### Phase 0 Exit Criteria

- `src/ui/ui-binder.js` parses and builds
- `src/game/save.test.js` passes
- `npm test` returns green for the fresh clone
- `npm run build` completes successfully
- Runtime guidance for `story-mode/` is no longer in conflict across repo docs
- Public Story Mode and System Map routes are aligned across top-level docs and nav surfaces

## Progress Log

| Date | Task | Commit | Owner | Notes |
|------|------|--------|-------|-------|
| 2026-03-15 | 1A. Canonical Schema | `614225a` | Claude | `gos-schema.json` + `SCHEMA.md` delivered |
| 2026-03-15 | 1B. Explainable Score Breakdown | `ddcc11a` | Codex | "Why this score?" panel in Inspect tab. +10 functions, ~440 lines added. |
| 2026-03-15 | 1C. Export/Import .gos.json | `acda512` | Codex | Header export/import buttons, file validation, confirm-on-replace. |
| 2026-03-15 | Archive naming migration | `614225a` | Claude | DOC/WEB/IMG prefix convention applied to archive + images. |
| 2026-03-15 | Production HTML updates | `f807445` | Claude | Planner, cage guide, scoring map updates. |

**Phase 1 status: COMPLETE** — all three deliverables shipped on day 1. Not yet pushed.

---

## Current Baseline (post-Phase 1)

| Asset | Lines | Functions | Role |
|-------|-------|-----------|------|
| garden-planner-v4.html | 3,398 | 113 | Core planner — grid, crops, scoring, persistence, score explanation, export/import |
| garden-cage-build-guide.html | 2,270 | 12 | Interactive build guide with specs |
| garden-cage-ops-guide.html | 1,313 | 5 | Operational checklist |
| garden_planner_scoring_system_map.html | 845 | 0 | Static scoring reference |
| garden_planner_scoring_visualizer.html | 748 | 14 | Score visualization |
| index.html | 106 | 0 | Landing/nav page |
| gos-schema.json | 310 | — | Canonical JSON Schema (new) |
| SCHEMA.md | 170 | — | Human-readable schema reference (new) |
| **Total** | **9,160** | **144** | |

Architecture: zero-backend, single-file HTML tools, localStorage persistence, URL hash sharing, .gos.json file export/import. 50 crops, 8 categories, 5 scoring factors (sun, support, shade, access, season) + structural bonuses + adjacency scoring. Explainable score breakdown in Inspect tab.

---

## Phase 1 — Days 1–30: "Trust the Score" — COMPLETE

**Theme:** Make the existing scoring engine transparent and the data model explicit. No new features — strengthen what's already built.

### 1A. Canonical Schema Document (Week 1–2) — DONE

**What:** Create `gos-schema.json` — a formal contract defining the data structures shared across all 5 tools.

**Scope:**
- Document the workspace object shape (beds → cells → crops → scores)
- Document the CROPS database fields and valid values
- Document settings/inputs shape (orientation, walls, season, goal, zone, cage config)
- Document the scoring output shape (per-cell, per-crop, per-bed, goal bonus)
- Add version field matching `WORKSPACE_VERSION`

**Why now:** The planner has 352 top-level constants and an implicit schema buried in `loadWorkspace()`, `saveWorkspace()`, and `scoreCropInCell()`. The visualizer and scoring map reference overlapping data but don't validate against the same contract. Schema-first prevents drift as you add tools.

**Deliverable:** `gos-schema.json` + a `SCHEMA.md` narrative doc. No code changes to existing tools yet.

**Effort:** 2–3 sessions.

---

### 1B. Explainable Score Breakdown (Week 2–4) — DONE

**What:** Add a "Why this score?" panel to the planner's Inspect tab that shows the weighted factor breakdown for the selected cell.

**Scope:**
- Decompose `scoreCropInCell()` output into its 6 visible factors:
  - Sun fit (weight: 2x) — raw value + how `sunMin`/`sunIdeal` maps
  - Support fit (1x) — trellis row presence vs crop requirement
  - Shade tolerance (1x) — `shadeScore` adjustment
  - Access fit (1x) — based on cell position + crop height
  - Season fit (1x) — season × cool-season flag logic
  - Structural bonus — trellis row, protected zone, critter-safe, succession
- Show adjacency score separately (companion/conflict/water compatibility)
- Display as a stacked bar or factor list with +/- contributions
- Highlight the limiting factor (the one dragging score down most)

**Why now:** The scoring engine is the product's core value. Users see a number (0–10) but can't learn from it. Transparency turns a score into a teaching tool.

**Deliverable:** New UI in the Inspect tab of `garden-planner-v4.html`. ~150 lines of JS + HTML/CSS.

**Effort:** 3–4 sessions.

---

### 1C. Export/Import as JSON File (Week 3–4) — DONE

**What:** Add download/upload buttons for the workspace as a `.gos.json` file, complementing the existing URL hash sharing.

**Scope:**
- "Export" button → downloads workspace as `garden-os-workspace-{date}.gos.json`
- "Import" button → file picker, validates against schema version, loads workspace
- Validate using the schema from 1A (version check, required fields, crop key validation)
- Keep existing localStorage persistence and URL sharing unchanged

**Why now:** localStorage is fragile (browser clears, device-bound). File export is the simplest durable persistence — no backend needed. Also unblocks future sharing workflows.

**Deliverable:** 2 buttons + ~100 lines of JS in planner. File uses the schema from 1A.

**Effort:** 1–2 sessions.

---

### Phase 1 Exit Criteria
- Schema document exists and matches actual planner data structures
- Every score in the planner can be explained factor-by-factor
- Users can save/load their workspace as a file
- Zero new tools, zero new dependencies, zero backend

---

## Phase 2 — Days 31–60: "What If?"

**Theme:** Let users simulate and compare before committing. Turn the planner from a recorder into a decision tool.

### 2A. Layout Simulator / What-If Mode (Week 5–7)

**Status:** implemented locally — 2026-03-31

**What:** Add a "Simulate" toggle that lets users try alternative layouts without overwriting their saved bed.

**Scope:**
- "Simulate" button clones the current bed state into a scratch buffer
- All edits in simulate mode are visually distinct (dashed border or tinted overlay)
- Score comparison: show current score vs simulated score side-by-side
- "Apply" commits the simulation to the real bed; "Discard" reverts
- Works entirely in memory — no localStorage writes during simulation

**Why now:** The planner now has undo/redo, but it still needed a true scratch mode for risk-free comparison before commit. Users can now trial alternate layouts without touching saved workspace data.

**Deliverable:** Planner scratch mode with Simulate / Apply / Discard controls, visible simulation styling, saved-vs-simulated score comparison, and autosave suppression during trials.

**Effort:** 4–5 sessions.

---

### 2B. Garden Doctor — Symptom Triage Tool (Week 6–8)

**Status:** implemented locally — 2026-03-31

**What:** New single-file HTML tool. User selects symptoms → gets ranked likely causes + recommended actions.

**Scope:**
- Symptom picker: leaf curl, yellowing, wilting, spots, holes, stunting, blossom drop (8–12 symptoms)
- Cross-reference against: crop category, season, common pests/diseases for that crop
- Output: ranked diagnosis list with confidence level + action steps
- Link back to relevant ops guide checklists where applicable
- Data: static decision tree (30–40 rules), no API calls

**Why now:** Users hit problems mid-season and currently leave Garden OS to Google symptoms. This keeps them in the ecosystem and connects diagnosis to the scoring penalties they're already seeing.

**Deliverable:** New `garden-doctor.html` (~600–800 lines). Add to index.html nav.

**Effort:** 4–5 sessions.

---

### 2C. Yield Forecast + Harvest Window (Week 7–8)

**Status:** implemented locally — 2026-03-31

**What:** Add a forecast card to the planner showing estimated harvest dates and yield confidence per crop.

**Scope:**
- Add `daysToMaturity` and `yieldPerSqFt` fields to CROPS database (50 crops)
- Calculate harvest window: planting date (user sets or defaults to season start) + days-to-maturity ± variance
- Show per-crop forecast cards in the Score tab: "Harvest: June 12–25 (high confidence)"
- Confidence based on: score (high score = high confidence), season fit, sun fit
- Summary timeline view: horizontal bar chart showing all crops' harvest windows

**Why now:** "When do I pick this?" is the most common question after planting. The data model already has season and crop attributes — this just extends them with maturity timing.

**Deliverable:** CROPS data additions + ~150 lines JS/CSS in planner.

**Effort:** 3–4 sessions.

---

### Phase 2 Exit Criteria

**Phase 2 status: COMPLETE — 2026-03-31**

- Users can simulate layout changes risk-free and see score deltas
- Symptom triage works for the 50 existing crops with no external dependencies
- Every planted crop shows an estimated harvest window
- Still zero-backend, still single-file per tool

---

## Phase 3 — Days 61–90: "Season Intelligence"

**Theme:** Add the time dimension. Garden OS starts understanding seasons as arcs, not snapshots.

### 3A. Experiment Mode — A/B Beds (Week 9–10)

**Status:** implemented locally — 2026-03-31

**What:** Let users tag two beds as an "experiment" pair and track comparative outcomes.

**Scope:**
- UI to link two beds as experiment (A/B)
- Controlled variable label: "spacing", "mulch", "fertilizer", "variety", "sun exposure" (user picks)
- Side-by-side score comparison view with delta highlighting
- Outcome log: user records weekly observations per bed (text + score snapshot)
- Summary card: "Bed A outperformed Bed B by X points — likely due to [limiting factor]"
- All data in localStorage, exportable via the Phase 1 JSON export

**Why now:** This is what makes Garden OS a *learning system* rather than a static planner. Experiments create data that feeds future recommendations.

**Deliverable:** ~300 lines JS/CSS in planner + experiment panel.

**Effort:** 4–5 sessions.

---

### 3B. Succession Planting Timeline (Week 10–11)

**Status:** implemented locally — 2026-03-31

**What:** Visual timeline showing when to replant succession-friendly crops for continuous harvest.

**Scope:**
- Filter to `successionFriendly: true` crops in the current bed (lettuce, radish, arugula, spinach, bush beans, cilantro, etc.)
- Calculate replanting windows: harvest date → next sow date → next harvest
- Display as a Gantt-style timeline per crop, color-coded by category
- "Add next succession" button pre-fills the planting for the next window
- Integrates with yield forecast from Phase 2

**Why now:** Succession planting is the highest-leverage technique for small raised beds, and 25 of the 50 crops are flagged `successionFriendly`. The data is there, the UI isn't.

**Deliverable:** New panel in planner (~200 lines) or standalone `garden-succession.html`.

**Effort:** 3–4 sessions.

---

### 3C. Season Retrospective View (Week 11–12)

**Status:** implemented locally — 2026-03-31

**What:** End-of-season summary comparing planned vs actual performance.

**Scope:**
- Snapshot workspace state at "season start" (auto-save when season is first set)
- At any point, user can view "Season Report": planned layout vs current state
- Metrics: crops that stayed vs were replaced, average score trend, best/worst performing cells
- Export as a printable HTML summary
- Feeds into next season's planning (highlight what worked)

**Why now:** This closes the loop. Plan → grow → measure → learn → plan better. Without retrospectives, each season starts from scratch.

**Deliverable:** ~250 lines JS/CSS in planner. Relies on schema + export from Phase 1.

**Effort:** 3–4 sessions.

---

### Phase 3 Exit Criteria

**Phase 3 status: COMPLETE — 2026-03-31**

- Users can run controlled A/B experiments between beds
- Succession planting is visually planned, not manually calculated
- Each season produces a retrospective that informs the next
- Full data lifecycle: schema → plan → simulate → grow → experiment → review → export

---

## Summary

| Phase | Days | Theme | Deliverables | New Files |
|-------|------|-------|-------------|-----------|
| **1** | 1–30 | Trust the Score | Schema doc, explainable scores, JSON export | `gos-schema.json`, `SCHEMA.md` |
| **2** | 31–60 | What If? | Layout simulator, Garden Doctor, yield forecast | `garden-doctor.html` |
| **3** | 61–90 | Season Intelligence | A/B experiments, succession timeline, retrospective | None (all in planner) |

**Constraints held throughout:** zero backend, single-file tools, localStorage + file export, no frameworks, no CDN dependencies.

**Explicitly deferred:** weather APIs, photo processing, ML recommendations, public API, gamification. These require a backend decision that isn't on the table yet.

---

## Planner Intelligence Track — Execution Plan (2026-04-20)

### Request Summary

- Create a phased implementation plan for the planner intelligence track with milestones, resources, timeline, owner, dependencies, and open risks.
- Inspect repo reality first, then define the next concrete execution step inside the canonical plan.
- Keep Phase 4 additive: no save migration, no scoring-contract break, no architecture rewrite.

### Current State Snapshot

- Phases 1 through 3 above remain the canonical shipped baseline.
- `garden-planner-v4.html` already reflects `v4.4`, dynamic 50-crop copy, explanation-first inspect UI, and strict better-fit suggestions.
- `phase4-demo.html` exists as a deterministic structure-aware planner demo and is useful as a visual spec, not as the production surface.
- Phase 4A now has a dedicated browser contract in `docs/phase-reasoning-smoke.mjs`, but the derivation and reasoner logic is still inline in the planner and rollback rehearsal is still pending.
- No Phase 4 save-format change is required.

### Owner Model

- Product owner / approval: user
- Implementation owner: Codex
- Verification owner: user + Codex

### Shared Resources

| Resource | Role in the track |
|---|---|
| `specs/CROP_SCORING_DATA.json` | Canonical crop fields and faction data |
| `specs/SCORING_RULES.md` | Scoring contract that must not drift in Phases 4 and 5 |
| `IMPLEMENTATION_PLAN.md` | Canonical execution plan and ship-gate record |
| `docs/PLANNER_PHASE_TIMELINE_TEMPLATE.md` | Planner-track scaffold and default week shape |
| `docs/phase-reasoning-smoke.mjs` | Locked browser fixtures for Phase 4 fit, caution, and conflict states |
| `garden-planner-v4.html` | Production planner surface |
| `phase4-demo.html` | Deterministic demo for Phase 4 behavior and UI expectations |
| Local browser verification | Manual validation for inspect UI, offline behavior, and regressions |

### Phase Windows, Milestones, Dependencies, and Risks

| Phase | Timeline | Owner | Milestones | Dependencies | Resources | Open risks |
|---|---|---|---|---|---|---|
| Phase 4 — Structure-Aware Planner | 2026-04-20 to 2026-05-08 | Codex implementation, user approval | 4A contract lock; 4B production extraction; 4C validation + rollback dry run | Phase 3 complete; current inspect pass stable | `garden-planner-v4.html`, `phase4-demo.html`, `specs/CROP_SCORING_DATA.json`, `docs/phase-reasoning-smoke.mjs` | Inline logic drift during extraction; rollback path not rehearsed |
| Phase 5 — Scoring Integration | 2026-05-11 to 2026-05-29 | Codex implementation, user approval | 5A reasoner payload shape; 5B score-breakdown wiring; 5C score-parity gate | Phase 4 shipped and deterministic | `garden-planner-v4.html`, `specs/SCORING_RULES.md`, `docs/phase-reasoning-smoke.mjs`, current score breakdown UI | Duplicate logic between inspect and score story until unified; numeric score drift if reasoning leaks into calculation |
| Phase 6 — Temporal Reasoning | 2026-06-01 to 2026-07-03 | Codex implementation, user approval | 6A season-input contract; 6B succession-context validation; 6C migration review only if required | Phase 5 shipped; season contract reviewed before build | `garden-planner-v4.html`, `plannerState.site.season`, `specs/CROP_SCORING_DATA.json`, current yield + succession features | Duplicate season fields if migration is attempted without review; fixture coverage needs expansion |
| Phase 7 — Multi Plot and Companion Logic | 2026-07-06 to 2026-07-31 | Codex implementation, user approval | 7A bed-context contract; 7B neighbor findings UI; 7C perf budget validation | Phase 6 shipped cleanly | Existing multi-bed planner state, adjacency code, inspect UI | Cross-bed cache drift and performance regressions on larger layouts |
| Phase 8 — Reasoned Export | 2026-08-03 to 2026-08-21 | Codex implementation, user approval | 8A derived export contract; 8B determinism gate; 8C optional replay scope decision | Phase 7 shipped; export contract frozen before code changes | `.gos.json` export/import path, `gos-schema.json`, planner reasoner output | Secondary export format drifting from authoritative workspace export |

### Immediate Next Step — Phase 4A Contract Lock

**Owner:** Codex
**Window:** 2026-04-20 to 2026-04-22
**Goal:** Freeze the Phase 4 contract before any deeper extraction or UI expansion lands.
**Status:** COMPLETE — 2026-04-20

**Tasks:**
- Lock the production outputs for four Phase 4 surfaces: derived zone, derived traits, fit status, and strict suggestions.
- Capture fixed planner fixtures for at least three cells: one fit, one caution, one conflict.
- Define the rollback rule: if extracted reasoner output diverges from the current planner behavior, fall back to the existing inline inspect output with no save impact.
- Keep numeric scoring untouched and treat reasoning as a sibling output only.

**Validation:**
- Fixed inputs return identical outputs across refresh.
- Existing numeric score totals remain unchanged.
- No save schema fields are added or removed.
- Inspect panel still renders a primary reason, derived zone, derived traits, and strict suggestions for the selected cell.

**Evidence:**
- `docs/phase-reasoning-smoke.mjs` now locks three browser fixtures against exact Phase 4 outputs:
  - fit: trellis-row `cherry_tom` (`8.3` cell / `72` bed)
  - caution: trellis-row `lettuce` (`2.2` cell / `11` bed)
  - conflict: off-trellis `cherry_tom` (`4.2` cell / `31` bed)
- Artifacts written to `output/web-game/planner-phase4-contract/` including screenshots and `phase-reasoning-results.json`.

### Phase 4B Extraction

**Owner:** Codex
**Window:** 2026-04-20
**Goal:** Extract the current inline reasoning helpers behind one stable planner payload without changing any locked Phase 4 fixture output.
**Status:** COMPLETE — 2026-04-20

**Tasks:**
- Build one planner-side reasoning snapshot object for selected cells that owns derived zone, derived traits, fit status, primary reason, and strict suggestions.
- Route both the inspect surface and score-story reasoning surface through that shared payload instead of parallel helper chains.
- Keep numeric score calculations and save behavior unchanged.
- Preserve the current rollback path by keeping the existing inline render available until fixture parity is proven.

**Validation:**
- `docs/phase-reasoning-smoke.mjs` passes with no fixture changes.
- Locked cell scores, bed scores, status chips, and best-fit candidates remain identical.
- No save schema fields or workspace export shape change.

**Evidence:**
- `garden-planner-v4.html` now builds a shared planner-side reasoning snapshot and routes both the inspect surface and the score-story surface through it.
- The locked browser contract stayed green with unchanged outputs for:
  - fit: trellis-row `cherry_tom` (`8.3` cell / `72` bed)
  - caution: trellis-row `lettuce` (`2.2` cell / `11` bed)
  - conflict: off-trellis `cherry_tom` (`4.2` cell / `31` bed)
- Refreshed artifacts were written to `output/web-game/planner-phase4-contract/` including updated screenshots and `phase-reasoning-results.json`.

### Phase 4C Validation and Rollback Rehearsal

**Owner:** Codex
**Window:** 2026-04-20
**Goal:** Prove the extracted reasoning path is safe to keep by broadening validation beyond the three locked fixtures, rehearsing rollback, and documenting any deferred planner risks.
**Status:** COMPLETE — 2026-04-20

**Tasks:**
- Broaden planner verification beyond the three locked cells by validating the weakest cell in an auto-filled bed.
- Rehearse rollback by comparing the extracted shared snapshot against a recomputed legacy helper snapshot inside the browser harness.
- Diagnose the browser automation timeout on `#autoFillBtn` and classify whether it is a planner regression or a harness issue.
- Log the deferred automation risk in the repo trackers instead of masking it with a silent workaround.

**Validation:**
- The three locked fixtures stayed identical after the broader smoke pass.
- Shared vs legacy snapshot parity held for the locked fixtures and for the weakest auto-filled cell.
- The broader planner smoke still reached a 32/32 filled bed and rendered the weakest-cell inspect and score-story surfaces.
- The `#autoFillBtn` browser-click timeout remained reproducible, but DOM-triggered autofill still filled the bed, confirming planner behavior stayed intact and the remaining issue is automation-side.

**Evidence:**
- `docs/phase-reasoning-smoke.mjs` now includes broader planner smoke coverage, shared-vs-legacy parity checks, and a generic client diagnosis path for `#autoFillBtn`.
- `output/web-game/planner-phase4-contract/broader_autofill_weakest.png` captures the broadened weakest-cell review surface.
- `output/web-game/planner-phase4-contract/phase-reasoning-results.json` records the earlier 4C broadened smoke and generic-client diagnosis.
- Direct browser verification re-ran the locked fixtures after the Phase 5A refactor and kept:
  - fit: trellis-row `cherry_tom` (`8.3` cell / `72` bed)
  - caution: trellis-row `lettuce` (`2.2` cell / `11` bed)
  - conflict: off-trellis `cherry_tom` (`4.2` cell / `31` bed)

### Phase 5A Score Payload Contract

**Owner:** Codex
**Window:** 2026-04-20
**Goal:** Start Phase 5 by moving selected-cell scoring metadata behind one planner-side score payload without changing any numeric score outputs.
**Status:** COMPLETE — 2026-04-20

**Tasks:**
- Extract the selected-cell score metadata into one planner-side score payload helper.
- Compose the existing reasoning snapshot from that score payload instead of reassembling score metadata inline.
- Route the inspect hero score chip through the shared payload so the selected-cell score no longer comes from an ad hoc `scoreCell(...)` call.
- Keep numeric scoring, save behavior, and workspace export shape unchanged.

**Validation:**
- The locked fixtures kept the same status, zone, score, bed total, and best-fit outputs after the refactor.
- The inspect hero score chip now matches the shared snapshot score for the selected cell.
- The broader auto-fill smoke still reaches 32 filled cells and preserves the `Why this score` / `Inspect & explain` surfaces for the weakest cell.

**Evidence:**
- `garden-planner-v4.html` now builds a dedicated `buildPlannerScorePayload(...)` helper and composes `buildPlannerReasoningSnapshot(...)` from it.
- Direct browser verification after the refactor kept the locked fixture outputs unchanged and confirmed the inspect score chip reads `8.3/10`, `2.2/10`, and `4.2/10` for the three locked cells.

### Next Concrete Step — Phase 5B Score Breakdown Wiring

**Owner:** Codex
**Window:** 2026-04-21 to 2026-04-24
**Goal:** Finish the selected-cell Phase 5 path by routing the remaining score-breakdown surface through the shared score payload and then remove the last duplicate score assembly only after parity stays locked.

**Tasks:**
- Route score-breakdown rendering through the shared score payload instead of assembling factor state ad hoc at render time.
- Expand planner verification so the selected-cell score payload, breakdown UI, and inspect hero stay numerically aligned.
- Decide whether to harden or replace the browser-click step used for `#autoFillBtn` verification without hiding the current automation issue.

**Validation:**
- Locked fixture scores and reasoning stay identical after the score-breakdown wiring pass.
- The inspect hero, score story, and score breakdown all read the same selected-cell score payload.
- Deferred automation risk remains explicitly tracked until the click path is stable.

### Ship Gates For This Track

- Do not extend the stored crop or cell schema in Phase 4.
- Do not change scoring totals while reasoning is still being separated from the UI layer.
- Do not ship a save migration in the same pass as a new reasoning contract unless rollback has been rehearsed.
- Keep planner-track work additive to the existing planner surface; no file rename and no product-surface split during this track.
