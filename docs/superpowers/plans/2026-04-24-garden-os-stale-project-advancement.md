# Garden OS Stale Project Advancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance every major Garden OS workstream whose last meaningful update is older than three days as of 2026-04-24, starting with verification-blocked runtime work and ending with roadmap expansion and canonical doc refresh.

**Architecture:** Treat stale work as six tracks: Story Mode runtime closure, legacy Season Engine UX debt, planner and user-track polish, dev-tool and system-map refresh, family recipe bridge activation, and final spec/test/audit closure. Execute blocking verification first, then user-facing gaps, then roadmap expansion, and only then freeze the repo state in docs and reports.

**Tech Stack:** Vanilla HTML/CSS/JS, Vite + Three.js + Vitest in `story-mode/`, Node harnesses, Playwright/browser smoke scripts, GitHub Pages, localStorage, markdown/html docs.

---

## Stale Threshold

As of `2026-04-24`, treat any surface with a last meaningful update on or before `2026-04-21` as stale.

## Evidence Snapshot

| Surface | Last meaningful update | Evidence | Age on 2026-04-24 |
|---|---|---|---|
| Story Mode source | 2026-04-16 | `story-mode/src/main.js`, `story-mode/src/ui/ui-binder.js` | 8 days |
| Story Mode live bundle | 2026-04-05 | `story-mode-live/index.html` | 19 days |
| Planner | 2026-04-16 | `garden-planner-v4.html`, `test-planner-v4.js` | 8 days |
| Legacy Season Engine | 2026-04-16 merge, open issues last touched 2026-03-22 | `garden-league-simulator-v4.html`, `docs/UI_ISSUES_TABLE.html` | 8-33 days |
| Garden Doctor and support guides | 2026-03-31 | `garden-doctor.html`, `garden-cage-build-guide.html`, `garden-cage-ops-guide.html`, `how-it-thinks.html` | 24 days |
| Hub and install surface | 2026-03-31 | `index.html`, `STATUS_CHECK.md`, `IMPLEMENTATION_PLAN.md`, `docs/HANDOFF.md` | 24 days |
| Dev tools | 2026-03-18 to 2026-03-31 | `scoring-visualizer.html`, `scoring-map.html`, `fairness-tester.html`, `system-map.html`, `system-topology.html` | 24-37 days |
| Specs | 2026-03-24 | `specs/SCORING_RULES.md`, `specs/CROP_SCORING_DATA.json` | 31 days |
| Root tests | 2026-03-20 | `tests/`, `test-planner-v4.js` | 35 days |
| Family recipe bridge plan | 2026-04-20 | `docs/superpowers/specs/2026-04-20-garden-os-family-recipe-bridge-design.md`, `docs/superpowers/plans/2026-04-20-garden-os-family-recipe-bridge.md` | 4 days |
| Current report layer | 2026-04-24 | `reports/` | fresh, do not prioritize |
| `CLAUDE.md` | 2026-04-22 | `CLAUDE.md` | fresh, use as canon |

## Recommended Phase Order

1. Phase 1 closes Story Mode verification debt so the flagship runtime is trusted again.
2. Phases 2, 3, and 4 can run in parallel once Phase 1 has a clean baseline.
3. Phase 5 starts only after planner and doc surfaces are back in sync.
4. Phase 6 is the repo freeze and reporting pass after the earlier phases land.

### Task 1: Close Story Mode Verification Debt

**Why now:** `story-mode/` is the flagship runtime, but `story-mode/progress.md` still records unresolved verification debt around deterministic `vitest` closure, final visual QA, and doc alignment even though source work last moved on `2026-04-16`.

**Files:**
- Modify: `story-mode/src/main.js`
- Modify: `story-mode/src/ui/ui-binder.js`
- Modify: `story-mode/scripts/local-dist-transform-server.mjs`
- Modify: `story-mode-live/index.html`
- Modify: `story-mode/progress.md`
- Modify: `STATUS_CHECK.md`
- Modify: `docs/HANDOFF.md`
- Modify: `IMPLEMENTATION_PLAN.md`

- [ ] **Step 1: Re-establish the runtime baseline in a clean shell**

Run:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os\story-mode
npm test
npm run build
```

Expected: exact test counts captured, build succeeds, and `dist/` reflects the current source tree.

- [ ] **Step 2: Verify the published route and asset-path behavior**

Run:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os\story-mode
node scripts/local-dist-transform-server.mjs
```

Then check:

```bash
curl -I http://127.0.0.1:4174/garden-os/story-mode-live/
curl -I http://127.0.0.1:4174/garden-os/story-mode/
```

Expected: both routes return `200`, and no stale-bundle drift remains between `story-mode/dist/` and `story-mode-live/`.

- [ ] **Step 3: Fix any remaining runtime or preview drift before feature work resumes**

Focus first on:

- `story-mode/src/main.js`
- `story-mode/src/ui/ui-binder.js`
- `story-mode/vite.config.js`
- `story-mode/scripts/local-dist-transform-server.mjs`

Expected: no unresolved build-path or boot-path blocker remains.

- [ ] **Step 4: Update the canonical repo docs after the runtime is green**

Refresh:

- `STATUS_CHECK.md`
- `docs/HANDOFF.md`
- `IMPLEMENTATION_PLAN.md`

Expected: docs stop referring to an unresolved Story Mode baseline and reflect the real verification counts and routes.

- [ ] **Step 5: Commit Story Mode closure separately**

```bash
git add story-mode story-mode-live STATUS_CHECK.md docs/HANDOFF.md IMPLEMENTATION_PLAN.md
git commit -m "chore: close story mode verification debt"
```

### Task 2: Finish the Legacy Season Engine Interaction and Accessibility Backlog

**Why now:** `docs/UI_ISSUES_TABLE.html` still shows open or partial engine issues `028` through `038`, including missing inspect mode, hidden inspection UI, unclear token economy, below-the-fold results content, and missing landmark roles.

**Files:**
- Modify: `garden-league-simulator-v4.html`
- Modify: `docs/UI_ISSUES_TABLE.html`
- Modify: `docs/ENGINE_TEST_PLAN.md`
- Modify: `docs/phase-reasoning-smoke.mjs`

- [ ] **Step 1: Lock the issue list into an implementation checklist**

Review issue IDs:

- `028`
- `029`
- `030`
- `031`
- `032`
- `033`
- `034`
- `035`
- `038`

Expected: each issue is mapped to a concrete code area inside `garden-league-simulator-v4.html`.

- [ ] **Step 2: Ship mode safety and inspect discoverability first**

Implement, in order:

- inspect or neutral mode
- visible inspect button
- keyboard shortcut for inspect mode
- click safety parity with planner behavior

Run:

```bash
node docs/phase-reasoning-smoke.mjs
```

Expected: safe cell inspection works without accidental placement.

- [ ] **Step 3: Fix information hierarchy and screen-reader context**

Implement:

- landmark roles for full-screen story states
- persistent objective or scoreboard HUD
- token economy explanation
- right-panel results visibility above the fold

Expected: the engine is usable without guessing where status and progress live.

- [ ] **Step 4: Re-run engine verification and update the issue tracker**

Run:

```bash
node docs/phase-reasoning-smoke.mjs
```

Then update `docs/UI_ISSUES_TABLE.html` statuses for any closed or partial items.

- [ ] **Step 5: Commit the engine backlog pass**

```bash
git add garden-league-simulator-v4.html docs/UI_ISSUES_TABLE.html docs/ENGINE_TEST_PLAN.md docs/phase-reasoning-smoke.mjs
git commit -m "feat: close season engine interaction backlog"
```

### Task 3: Refresh Planner and User-Track Surfaces

**Why now:** the planner last moved on `2026-04-16`, but planner tutorial issues `036` and `037` are still open; the hub, build guide, ops guide, and explainer surfaces have not had a meaningful refresh since `2026-03-31`.

**Files:**
- Modify: `garden-planner-v4.html`
- Modify: `test-planner-v4.js`
- Modify: `index.html`
- Modify: `garden-doctor.html`
- Modify: `garden-cage-build-guide.html`
- Modify: `garden-cage-ops-guide.html`
- Modify: `how-it-thinks.html`
- Modify: `docs/UI_ISSUES_TABLE.html`
- Modify: `docs/active-hosted-urls.md`

- [ ] **Step 1: Fix the open planner tutorial and boot-flow issues**

Implement:

- tutorial cell locking for issue `036`
- custom first-run prompt for issue `037`

Run:

```bash
node test-planner-v4.js
```

Expected: planner harness remains green and tutorial flow no longer relies on raw `confirm()`.

- [ ] **Step 2: Re-smoke the planner support surfaces**

Check:

- `index.html`
- `garden-doctor.html`
- `garden-cage-build-guide.html`
- `garden-cage-ops-guide.html`
- `how-it-thinks.html`

Expected: nav, copy, and feature claims still match the current planner and Story Mode reality.

- [ ] **Step 3: Refresh install and route metadata if any entry points changed**

Review:

- `docs/active-hosted-urls.md`
- `manifest.json`
- `sw.js`

Expected: hosted-route docs and install metadata agree with the current hub and planner experience.

- [ ] **Step 4: Update issue and freshness docs**

Update:

- `docs/UI_ISSUES_TABLE.html`
- `progress.md` if a planner note is added

Expected: open planner items are either closed or clearly reduced to a smaller next pass.

- [ ] **Step 5: Commit planner and user-track refreshes**

```bash
git add garden-planner-v4.html test-planner-v4.js index.html garden-doctor.html garden-cage-build-guide.html garden-cage-ops-guide.html how-it-thinks.html docs/UI_ISSUES_TABLE.html docs/active-hosted-urls.md manifest.json sw.js
git commit -m "feat: refresh planner and user-track surfaces"
```

### Task 4: Rebuild the Dev-Tool and System-Map Layer

**Why now:** the dev-tool track is the stalest public slice in the repo. `scoring-visualizer.html`, `scoring-map.html`, `fairness-tester.html`, and `system-topology.html` last moved on `2026-03-18`, while `docs/SYSTEM_MAP_PROPOSAL.md` has been waiting since `2026-03-31`.

**Files:**
- Modify: `system-map.html`
- Modify: `system-topology.html`
- Modify: `garden-os-build-state.html`
- Modify: `scoring-map.html`
- Modify: `scoring-visualizer.html`
- Modify: `fairness-tester.html`
- Modify: `docs/SYSTEM_MAP_PROPOSAL.md`
- Modify: `docs/HANDOFF.md`
- Modify: `IMPLEMENTATION_PLAN.md`

- [ ] **Step 1: Rebuild `system-map.html` against the active proposal**

Use `docs/SYSTEM_MAP_PROPOSAL.md` as the implementation brief.

Expected: `system-map.html` reflects the hybrid repo, Story Mode as flagship runtime, root-tool support surfaces, and canonical source hierarchy.

- [ ] **Step 2: Reconcile the rest of the dev track with the rebuilt map**

Review and update:

- `system-topology.html`
- `scoring-map.html`
- `scoring-visualizer.html`
- `fairness-tester.html`
- `garden-os-build-state.html`

Expected: labels, links, and assumptions no longer describe a planner-only repo.

- [ ] **Step 3: Refresh the canonical repo narrative after the dev-track rebuild**

Update:

- `docs/HANDOFF.md`
- `IMPLEMENTATION_PLAN.md`

Expected: the docs stop overstating stale route structures and reflect the rebuilt dev topology.

- [ ] **Step 4: Verify the dev route set locally**

Run:

```bash
python -m http.server 8000
```

Then open the dev surfaces and confirm there are no broken cross-links.

- [ ] **Step 5: Commit the dev-track refresh**

```bash
git add system-map.html system-topology.html garden-os-build-state.html scoring-map.html scoring-visualizer.html fairness-tester.html docs/SYSTEM_MAP_PROPOSAL.md docs/HANDOFF.md IMPLEMENTATION_PLAN.md
git commit -m "feat: refresh dev tools and system map"
```

### Task 5: Activate the Family Recipe Bridge

**Why now:** the family recipe bridge already has a design doc and a detailed implementation plan dated `2026-04-20`, but the work has not started. It is stale by the repo's current three-day rule and is the clearest next expansion project after core quality work.

**Files:**
- Existing plan: `docs/superpowers/plans/2026-04-20-garden-os-family-recipe-bridge.md`
- Existing design: `docs/superpowers/specs/2026-04-20-garden-os-family-recipe-bridge-design.md`
- Cross-repo target: `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\recipe-tracker`

- [ ] **Step 1: Verify the sibling `recipe-tracker` checkout and toolchain**

Run:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\recipe-tracker
git status --short --branch
npm ci
```

Expected: the bridge target repo is present and ready for execution.

- [ ] **Step 2: Execute Tasks 1 and 2 from the existing bridge plan in `recipe-tracker`**

Target files from the existing plan:

- `src/garden-export.js`
- `tests/unit/garden-export.test.js`
- `index.html`
- `tests/e2e/recipes.spec.js`

Expected: `recipe-tracker` can export `garden-recipes.json`.

- [ ] **Step 3: Execute Tasks 3 and 4 from the existing bridge plan in Garden OS**

Target files from the existing plan:

- `sync/family-recipes-schema.json`
- `garden-planner-v4.html`
- `test-planner-v4.js`
- `tests/family-recipes-regression.mjs`

Expected: Garden OS can import the snapshot and render full family recipe matches in the planner.

- [ ] **Step 4: Run the cross-repo verification pass from Task 5 of the existing bridge plan**

Expected: both repos pass their focused tests and docs are updated together.

- [ ] **Step 5: Commit each repo separately**

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\recipe-tracker
git add .
git commit -m "feat: add Garden OS family recipe snapshot export"

cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os
git add .
git commit -m "feat: add family recipe bridge to planner"
```

### Task 6: Freeze the Repo State in Specs, Tests, and Reports

**Why now:** the stalest canonical surfaces are the specs and root tests. This phase turns the earlier work into a trusted baseline and prevents doc or test drift from reopening immediately.

**Files:**
- Modify: `specs/SCORING_RULES.md`
- Modify: `specs/CROP_SCORING_DATA.json`
- Modify: `tests/`
- Modify: `test-planner-v4.js`
- Modify: `reports/garden-os-full-report-2026-04-19.md`
- Modify: `95-docs-personal/today.csv`

- [ ] **Step 1: Compare canon to implementation after Phases 1-5**

Review:

- `specs/SCORING_RULES.md`
- `specs/CROP_SCORING_DATA.json`
- `garden-planner-v4.html`
- `story-mode/src/scoring/cell-score.js`

Expected: any spec drift introduced by recent work is resolved before closure.

- [ ] **Step 2: Refresh or add the missing regression coverage**

Run:

```bash
node test-planner-v4.js
cd story-mode
npm test
```

Expected: root and Story Mode tests both represent the current repo state.

- [ ] **Step 3: Update the report layer with a post-phase audit**

Refresh:

- `reports/garden-os-full-report-2026-04-19.md`

or create a newer dated report in `reports/` if a fresh audit is preferred.

- [ ] **Step 4: Append the session log entry required by repo instructions**

Append to:

- `C:\Users\daverobertson\Desktop\Code\95-docs-personal\today.csv`

Expected: the external daily log reflects the meaningful project advances.

- [ ] **Step 5: Commit the baseline freeze**

```bash
git add specs tests test-planner-v4.js reports
git commit -m "chore: refresh specs tests and audit baseline"
```

## Parallelization Notes

- After Task 1 is green, Tasks 2, 3, and 4 can run in parallel because they touch different primary surfaces.
- Task 5 should wait for Task 3 or coordinate carefully because both touch `garden-planner-v4.html`.
- Task 6 is the final integration lane and should not begin until all earlier feature work is merged.

## Success Criteria

- Story Mode is fully re-verified and its docs are current.
- The legacy Season Engine open backlog is reduced materially, with `docs/UI_ISSUES_TABLE.html` updated to match.
- Planner tutorial and user-track surfaces feel current rather than frozen on `2026-03-31`.
- Dev tools and `system-map.html` describe the actual hybrid repo.
- The family recipe bridge moves from draft plan to working implementation.
- Specs, tests, and the audit layer are current enough that a new session can start from trusted canon.
