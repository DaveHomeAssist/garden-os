# Garden OS Full Project Report

Report date: 2026-04-19
Repository: `garden-os`
Audit basis: local repository inspection, canonical docs/specs review, targeted source reads, and current `story-mode` verification commands

## 1. Executive Summary

Garden OS is a hybrid browser-native garden product with two distinct layers:

1. A root-level static tool suite made of self-contained HTML pages for planning, guides, explainers, and developer tooling.
2. A richer `story-mode/` browser app built with Vite, Three.js, and Vitest, published as the static `story-mode-live/` bundle.

The project is larger and more mature than a simple planner site. It now includes:

- A flagship landing site and product hub.
- A very large single-file garden planner with simulation, forecasting, experiments, succession planning, and retrospective tooling.
- A legacy deterministic season simulator that still functions as a playable sandbox.
- A modern Story Mode runtime with campaign play, free play, and a 3D planner mode.
- Physical build and operations guides.
- Explanation and debugging tools for the scoring system.
- A significant documentation/spec layer and a smaller auxiliary sync integration for Notion.

Current repo health is strong at the `story-mode` level:

- `git status --short`: clean
- `npm test` in `story-mode/`: `28` test files passed, `329` tests passed
- `npm run build` in `story-mode/`: success on 2026-04-19

The main project risk is no longer basic breakage. It is drift:

- Some docs still describe older versions, smaller crop counts, or older package versions.
- Some public/reference pages are current, while others are acknowledged in-repo as outdated.
- The service worker manifest looks stale relative to current routes.

## 2. Methodology And Scope

This report is based on:

- Canonical guidance: `CLAUDE.md`, `docs/HANDOFF.md`, `specs/SCORING_RULES.md`, `specs/CROP_SCORING_DATA.json`, `specs/SEASON_ENGINE_SPEC.md`
- Product/docs review: `README.md`, `IMPLEMENTATION_PLAN.md`, `docs/active-hosted-urls.md`, `docs/README.md`, `docs/INTRO.md`, `PROJECT_SPEC.md`
- Runtime/source review across:
  - root HTML surfaces
  - `story-mode/src/`
  - `manifest.json`
  - `sw.js`
  - `sync/`
- Verification commands:
  - `npm test` in `story-mode/`
  - `npm run build` in `story-mode/`

Not included in this pass:

- Live browser/manual smoke testing
- External website verification over the public internet
- Pixel-level design QA

Where this report says "live" or cites deploy routes, that information comes from repo docs, not an external fetch during this audit.

## 3. Architecture Overview

### 3.1 High-level architecture

Garden OS is intentionally zero-backend for the end-user product. The dominant architectural pattern is:

- Static HTML/CSS/JS root tools
- localStorage persistence
- `.gos.json` export/import for durable user-controlled data portability
- Canonical specs in `specs/`
- Canonical repo orientation in `docs/HANDOFF.md`
- One controlled runtime exception in `story-mode/`

Hard constraints from `CLAUDE.md` remain clear:

- No backend for the product.
- Root tools stay single-file HTML.
- Build tooling is allowed only inside `story-mode/`.
- Runtime data remains local-first and offline-capable.

### 3.2 Runtime/package structure

There is no root `package.json`.

The repo has two package-level code islands:

- `story-mode/package.json`
  - runtime app package
  - scripts: `dev`, `build`, `build:single`, `preview`, `preview:dist`, `test`, `test:watch`
  - dependencies: `three`
  - dev dependencies: `vite`, `vitest`, `jsdom`
- `sync/package.json`
  - auxiliary Notion sync connector
  - not part of the browser runtime
  - depends on `@notionhq/client`

### 3.3 Storage model

User-facing product storage is local-first:

- planner and root tools: localStorage plus `.gos.json` import/export
- Story Mode: save-slot localStorage
- schema authority: `gos-schema.json`

Auxiliary integration exists in `sync/`, but it is optional and external to the runtime experience.

## 4. Product Surface Inventory

### 4.1 Root HTML inventory

Root HTML files present in the repo:

- `index.html`
- `garden-planner-v4.html`
- `garden-league-simulator-v4.html`
- `garden-doctor.html`
- `garden-cage-build-guide.html`
- `garden-cage-ops-guide.html`
- `how-it-thinks.html`
- `scoring-visualizer.html`
- `scoring-map.html`
- `fairness-tester.html`
- `system-map.html`
- `system-topology.html`
- `brand-guide.html`
- `garden-os-build-state.html`
- `garden-os-sprite-viewer.html`
- `prompt-explorer.html`
- `home.html`
- `system-map copy.html`

### 4.2 Major surface sizes

Key page sizes by line count:

| Surface | File | Lines |
|---|---|---:|
| Hub | `index.html` | 1419 |
| Planner | `garden-planner-v4.html` | 10345 |
| Legacy simulator | `garden-league-simulator-v4.html` | 3548 |
| Build guide | `garden-cage-build-guide.html` | 2036 |
| Ops guide | `garden-cage-ops-guide.html` | 1211 |
| Garden Doctor | `garden-doctor.html` | 554 |
| How It Thinks | `how-it-thinks.html` | 490 |
| Brand guide | `brand-guide.html` | 1860 |
| Scoring visualizer | `scoring-visualizer.html` | 759 |
| Scoring map | `scoring-map.html` | 854 |
| Fairness tester | `fairness-tester.html` | 1225 |
| System map | `system-map.html` | 1227 |
| System topology | `system-topology.html` | 573 |

Interpretation:

- The planner is a very large single-file application.
- The legacy simulator is also a sizable monolith.
- The guides/reference pages are substantial, not marketing stubs.

## 5. Playable Modes And Interactive Experiences

### 5.1 Mode summary

Garden OS currently has multiple genuine interactive modes, not just one app:

1. Root planner experience: `garden-planner-v4.html`
2. Legacy simulator experience: `garden-league-simulator-v4.html`
3. Story Mode campaign runtime: `story-mode-live/`
4. Story Mode free play runtime: menu-presented in `story-mode`
5. Story Mode planner runtime: menu-presented in `story-mode`

There are also partially implemented or future-facing mode concepts:

- Let It Grow / proximity-world systems inside `story-mode`
- locked title-screen cards for `Daily Challenge`
- locked title-screen cards for `Speedrun`

### 5.2 Story Mode title-screen modes

`story-mode/src/game/game-init.js` shows the title screen currently exposes:

- `Story Mode`
- `Free Play`
- `Planner`
- `Daily Challenge` locked
- `Speedrun` locked

The mode wiring is real, not placeholder-only:

- `Story Mode` uses save slots and standard runtime start.
- `Free Play` starts `createSandboxState()`.
- `Planner` starts `createPlannerState()` and binds planner UI in the 3D scene.

### 5.3 Story Mode runtime states

From `story-mode/src/game/state.js`:

- Story campaign state uses `gameMode: 'story'`
- Planner mode uses `gameMode: 'planner'`, `plannerMode = true`, 8x6 grid, locked to `PLANNING`
- Sandbox/free play uses `sandbox = true`, chapter `99`, 8x8 grid, all crops unlocked

### 5.4 Legacy simulator structure

The legacy simulator remains a real playable experience with:

- planning
- seasonal beats
- event draws
- one-action intervention economy
- harvest
- harvest review
- winter review
- chapter transitions

It is best thought of as a deterministic campaign sandbox that predates Story Mode but still preserves important game logic and reference value.

## 6. Garden Planner Deep Dive

### 6.1 Current identity

The root planner declares:

- title: `Garden OS · Raised Bed Planner v4.4`

This matters because several repo docs still call it `v4.3`, so the file itself is ahead of parts of the documentation layer.

### 6.2 What the planner is now

The planner is no longer just an 8x4 paint-and-score grid. It includes:

- crop placement via paint/erase/inspect tools
- deterministic per-cell scoring
- right-side tabs and insight panels
- import/export/recovery
- simulation scratch mode
- undo/redo
- crop reasoning and severity guidance
- planting calendar and harvest forecast
- succession planning
- A/B experiment logging
- season retrospective/export
- harvest logging
- sync snapshot export for Notion connector workflows

### 6.3 Planner tools and tabs

Observed tool modes:

- `paint`
- `erase`
- `inspect`

Observed right-tab inventory from source:

- `dashboard`
- `score`
- `inspect`
- `notes`
- `companions`
- `calendar`
- `harvest`
- `today`
- `experiment`
- `retrospective`

### 6.4 Planner feature detail

Features directly evidenced in `garden-planner-v4.html`:

- `Simulate / Apply / Discard` scratch mode
- `Undo` and `Redo`
- import via hidden file input accepting `.gos.json`
- inspector with severity summaries and next actions
- yield forecast and harvest windows
- succession timeline with staged next-wave actions
- experiment linking between beds with observations
- season retrospective with export
- harvest logging and harvest restore flows
- sync snapshot export

### 6.5 Planner maturity assessment

This is the most mature product surface in the repo.

Strengths:

- large feature footprint
- deterministic scoring transparency
- serious operational workflows
- recovery and undo patterns
- planning plus longitudinal tooling

Tradeoffs:

- very large single-file monolith
- complex UI state surface
- documentation version labels lag the file

## 7. Story Mode Deep Dive

### 7.1 Runtime purpose

Story Mode is the active flagship runtime and the main forward path for the project. It is the repository's one explicit build-tooling exception.

The title screen describes it as:

- a 12-chapter story about soil, seasons, and sauce

### 7.2 Story Mode feature profile

Based on source, docs, and current tests, Story Mode includes:

- title screen with 3-slot save system
- 12-chapter campaign framing
- cutscene and chapter intro system
- character portraits and dialogue panels
- event system
- intervention targeting
- harvest reveal
- winter review
- backpack/inventory
- crafting
- keepsakes
- recipes and pantry
- quests
- reputation
- world zones and travel
- foraging
- festivals
- multi-bed support
- tool management
- biome crop unlocking

### 7.3 Source organization

Current `story-mode/src/` file counts by area:

| Area | Path | Files |
|---|---|---:|
| Data | `story-mode/src/data` | 11 |
| Game | `story-mode/src/game` | 40 |
| Scene | `story-mode/src/scene` | 15 |
| Scoring | `story-mode/src/scoring` | 4 |
| UI | `story-mode/src/ui` | 25 |

The runtime is substantially larger than a prototype.

### 7.4 Story Mode subsystem notes

Important subsystems visible in code:

- pure scoring layer in `src/scoring/`
- scene/render layer in `src/scene/`
- gameplay/state systems in `src/game/`
- heavy UI composition in `src/ui/`
- canonical crop/event/dialogue imports from repo-level specs

The design rule from `docs/let-it-grow/50-technical/source-file-map.md` is sound and visible in code:

- game engine owns facts
- narrative layer owns presentation
- scoring stays pure
- scene mirrors state rather than mutating it

### 7.5 Story Mode implementation status

This runtime is in a strong but still transitional state:

- campaign mode is clearly playable
- free play and planner modes are wired
- world/proximity systems are present
- some future modes remain locked
- docs still refer to some gated or partial systems as not-yet-full menu modes

Practical read:

- Story Mode is more than a prototype
- it is not yet a completely frozen product
- some adjacent systems are ahead in code relative to public framing

## 8. Legacy Season Engine Deep Dive

### 8.1 Current role

`garden-league-simulator-v4.html` is still part of the package and still relevant. It serves as:

- a playable deterministic season sandbox
- a legacy campaign/reference runtime
- a bridge between the planner-first era and Story Mode

### 8.2 Feature highlights

Directly visible in source:

- objective strip
- beat indicator
- one-action-per-beat intervention flow
- explicit `Accept Loss` option
- event cards and outcome summaries
- harvest review and winter review
- keyboard shortcuts
- save warnings
- deterministic event handling

### 8.3 Role in the full package

This file remains important for:

- preserving mature game logic in a simpler runtime
- regression comparison against Story Mode
- documentation/history of the game's seasonal logic

It is no longer the flagship, but it is still materially part of Garden OS.

## 9. Public Website And Page Coverage

### 9.1 Main user-facing pages

The main user-facing website package includes:

| Page | Purpose | Status |
|---|---|---|
| `index.html` | hub/landing page | primary public entry |
| `story-mode-live/` | flagship runtime | primary CTA |
| `garden-planner-v4.html` | planner | mature core tool |
| `garden-doctor.html` | symptom triage | active support tool |
| `garden-cage-build-guide.html` | physical construction guide | active guide |
| `garden-cage-ops-guide.html` | operations/maintenance guide | active guide |
| `how-it-thinks.html` | plain-language explainer | active explainer |
| `brand-guide.html` | visual/verbal system | active reference |

### 9.2 Developer/reference pages

The developer/reference track includes:

| Page | Purpose |
|---|---|
| `scoring-visualizer.html` | inspect score factors interactively |
| `scoring-map.html` | explain scoring architecture |
| `fairness-tester.html` | compare and validate score behavior across crop sets |
| `system-map.html` | ecosystem architecture map |
| `system-topology.html` | topology/graph view of system relationships |

### 9.3 Secondary or auxiliary root pages

These exist in the package but are not central public user pages:

| Page | Purpose | Read |
|---|---|---|
| `home.html` | redirect/compatibility alias to `index.html` | compatibility utility |
| `garden-os-build-state.html` | build state document | internal/status reference |
| `garden-os-sprite-viewer.html` | sprite loader/viewer | art/asset tooling |
| `prompt-explorer.html` | prompt exploration tool | creative/internal tooling |
| `system-map copy.html` | draft system map v2 | draft, not canonical |

### 9.4 Navigation model

The repo consistently documents a two-track navigation model:

- User track
- Developer track

This is a strong conceptual organizing system and appears broadly implemented.

## 10. Guides, Explainers, And Content Surfaces

### 10.1 Build Guide

`garden-cage-build-guide.html` is a serious build document, not a marketing page.

Observed structure includes:

- materials
- front access and doors
- multiple illustrated sheets
- expand/collapse document controls
- task/checklist style content

### 10.2 Ops Guide

`garden-cage-ops-guide.html` provides operational guidance across:

- structure overview
- planting zones
- seasonal playbook
- maintenance
- critter defense
- harvest and succession
- shutdown/winter prep

### 10.3 Garden Doctor

`garden-doctor.html` is an interactive symptom triage tool.

Observed capabilities:

- crop selection
- season selection
- symptom selection
- ranked likely causes
- action guidance
- maintenance linkouts inside Garden OS

### 10.4 How It Thinks

`how-it-thinks.html` serves the core explainability mission:

- plain-English explanation of planner logic
- bridge between technical scoring and user trust

### 10.5 Brand Guide

`brand-guide.html` is unusually comprehensive and sets:

- brand statement
- typography
- token system
- component tone
- voice rules
- explicit single-theme policy

This is a real system artifact, not decorative documentation.

## 11. Scoring, Data, And Canonical Specs

### 11.1 Canonical scoring/data layer

The key canonical sources are correctly centralized:

- `specs/SCORING_RULES.md`
- `specs/CROP_SCORING_DATA.json`
- `specs/SEASON_ENGINE_SPEC.md`
- `gos-schema.json`
- `docs/VOICE_BIBLE.md`
- `docs/HANDOFF.md`

### 11.2 Crop data snapshot

From `specs/CROP_SCORING_DATA.json`:

- version: `3`
- last updated: `2026-03-22`
- crop count: `50`
- faction count: `8`
- recipe count: `8`

Factions present:

- `brassicas`
- `climbers`
- `companions`
- `fast_cycles`
- `fruiting`
- `greens`
- `herbs`
- `roots`

### 11.3 Scoring identity

Garden OS remains anchored on deterministic explainable scoring. That identity is consistent across:

- planner
- Story Mode scoring layer
- reference/debug pages
- docs

This is one of the strongest areas of product coherence in the repo.

## 12. Packaging, Offline Behavior, And Deployment

### 12.1 Manifest/PWA layer

`manifest.json` is present and frames the product as:

- `Garden OS - Story Mode and Planner`
- standalone display
- start URL `/garden-os/index.html`
- shortcuts for:
  - Story Mode
  - Planner

### 12.2 Service worker

`sw.js` exists and describes:

- network-first for HTML
- cache-first for fonts
- stale-while-revalidate for assets

However, the precache list appears stale relative to the current repo:

- it includes `tools/how-it-thinks.html`
- it includes `tools/scoring-visualizer.html`
- it includes `tools/scoring-map.html`
- it includes `tools/fairness-tester.html`

Those paths do not match the current root-file layout, where these pages live at repo root.

Inference from source:

- offline support likely exists
- root-tool precaching is probably incomplete or partially broken until `sw.js` is refreshed

### 12.3 Deployment model

Repo docs consistently describe:

- GitHub Pages deployment from `main`
- root tools served directly from repo root
- Story Mode built and published through `story-mode-live/`

This model is coherent.

## 13. Auxiliary Packages And Non-User Runtime Systems

### 13.1 Notion sync connector

The `sync/` package is an auxiliary workflow, not part of the core runtime contract.

What it does:

- planner exports sync snapshot JSON
- connector diffs and upserts into Notion
- GitHub Actions can run the sync manually

Safety profile from `sync/README.md`:

- dry run by default
- no deletes
- idempotent
- schema guard

This is a sensible integration boundary because it keeps the product itself backend-free while allowing operator workflows outside the runtime.

### 13.2 Prompt/art tooling

The repo includes prompt and asset-support tooling:

- `prompt-explorer.html`
- `garden-os-sprite-viewer.html`
- `codex-prompts/`
- `claude-prompts/`
- `prompts/`

These reinforce that Garden OS is also a production system for content/design iteration, not just a shipped web app.

## 14. Documentation And Repo Context Layer

### 14.1 Scale

Observed documentation footprint:

- `docs/`: `96` files
- `specs/`: `22` files

This is a documentation-heavy repo with substantial planning and narrative context.

### 14.2 Strong docs

The strongest repo-orientation documents are:

- `CLAUDE.md`
- `docs/HANDOFF.md`
- `docs/INTRO.md`
- `docs/README.md`
- `IMPLEMENTATION_PLAN.md`

### 14.3 Documentation role

The docs are not mere notes. They actively define:

- scoring contracts
- navigation rules
- voice and tone
- art direction
- migration policy
- architecture boundaries
- roadmap framing

## 15. Current Verification Snapshot

### 15.1 Git/worktree

- Working tree status during this audit: clean

### 15.2 Story Mode tests

Executed on 2026-04-19:

- command: `npm test`
- result: success
- summary: `28` test files passed, `329` tests passed

### 15.3 Story Mode build

Executed on 2026-04-19:

- command: `npm run build`
- result: success

Notable build output observations:

- build uses Vite `3.2.11`
- `garden-scene` chunk: `410.90 KiB`
- `ui-binder` chunk: `274.78 KiB`
- several texture assets are multi-megabyte PNGs, including:
  - `bed-empty` about `7503.67 KiB`
  - `bed-cell` about `7401.74 KiB`
  - `env-path` about `7473.90 KiB`

Interpretation:

- functionally healthy
- packaging/performance still deserves attention

### 15.4 Code hygiene spot-check

Search across `story-mode/src/ui` and `story-mode/src/scene` for `TODO|FIXME|HACK`:

- result: no matches

### 15.5 Issue backlog snapshot

From `docs/UI_ISSUES_TABLE.html`:

- `27` done
- `7` open
- `4` partial
- `6` deferred

Open backlog emphasis is mostly UX/accessibility and clarity, not core engine instability.

## 16. Gaps, Drift, And Risk Areas

### 16.1 Documentation drift

Confirmed drift examples:

1. Planner version drift
   - `garden-planner-v4.html` says `v4.4`
   - several docs still say `v4.3`

2. Package version drift
   - `docs/let-it-grow/50-technical/source-file-map.md` says `vite@7.1, vitest@3.2`
   - actual package is `vite ^3.2.8`, `vitest ^0.28.5`
   - current build output reports Vite `3.2.11`

3. Architecture drift in older overview docs
   - `README.md` and `docs/FEATURES.md` still describe an older, more purely single-file-only product shape
   - these lag behind the hybrid root-tools plus `story-mode/` reality

4. System map drift
   - `docs/HANDOFF.md` explicitly says `system-map.html` is outdated
   - `system-map copy.html` exists as a draft response to that gap

5. Crop-count drift in older docs
   - some older docs still describe smaller rosters such as 20 or 44 crops
   - canonical data now clearly says 50

### 16.2 Offline/cache drift

`sw.js` appears out of sync with the current route layout. This is a product-quality risk because it affects one of the repo's core promises: offline-capable root tools.

### 16.3 Bundle/asset weight

Story Mode is passing verification, but the asset footprint is heavy. Large textures are likely to affect:

- first load
- memory pressure
- mobile performance
- cache pressure

### 16.4 Monolithic root tools

The root planner and legacy simulator are powerful but structurally dense:

- planner is over 10k lines in one file
- simulator is over 3.5k lines in one file

This is aligned with project constraints, but it raises maintainability pressure.

## 17. Overall Assessment By Area

| Area | Assessment | Notes |
|---|---|---|
| Core product concept | Strong | clear identity around explainable garden intelligence |
| Planner | Very strong | largest, most mature surface |
| Story Mode | Strong and expanding | real runtime, green tests/build, still evolving |
| Legacy simulator | Valuable legacy/live subsystem | still relevant and playable |
| Guides/explainers | Strong | unusually robust supporting surfaces |
| Dev/reference tools | Strong | scoring/debug architecture well supported |
| Documentation quality | Strong but unevenly synchronized | good canon, some drift |
| Offline/package hygiene | Mixed | manifest is present, service worker looks stale |
| Performance/package size | Moderate risk | large textures and sizable runtime chunks |

## 18. Recommended Next Actions

### High priority

1. Refresh `sw.js` precache paths to match current root routes.
2. Reconcile version drift across `README.md`, `docs/FEATURES.md`, `docs/INTRO.md`, and other overview docs.
3. Update references that still describe older planner versions or older crop counts.

### Medium priority

4. Decide whether `system-map.html` or `system-map copy.html` becomes the authoritative current system map.
5. Do a bundle/asset optimization pass for Story Mode textures and large scene assets.

### Nice to have

6. Consolidate the distinction between:
   - flagship public surfaces
   - developer/reference tools
   - internal creative/production tools

This would make the package easier to explain to new contributors and less reliant on repo familiarity.

## 19. Final Conclusion

Garden OS is best understood as a full local-first garden platform, not a single tool.

It currently combines:

- a mature static planner ecosystem
- a still-live legacy simulation branch
- a fully real build-based Story Mode app
- physical construction and operations guidance
- scoring/debug/reference pages
- strong spec and documentation infrastructure
- auxiliary sync and creative tooling

The repo is in a good state functionally. The biggest work now is coherence:

- keeping docs synchronized with implementation
- tightening offline/runtime packaging
- clarifying which surfaces are canonical, flagship, legacy, draft, or internal

If that coherence work is done, Garden OS already has the bones of a polished, distinctive, and unusually complete garden software package.
