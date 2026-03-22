# Garden OS — System Map Proposal

Status: Active  
Last Updated: 2026-03-22  
Purpose: define the canonical structure for the next revision of `system-map.html` so it reflects the actual hybrid repo, not only the legacy planner stack.

## Why This Needs To Change

The current [system-map.html](../system-map.html) is useful, but it is no longer an accurate top-level map of the repo:

- it is centered on the planner and scoring engine
- it underrepresents `story-mode/` as the active flagship runtime
- it does not show the canonical-source hierarchy across `specs/`, root `docs/`, and `docs/story-mode/`
- it does not distinguish shared resources from runtime-local assets and data
- it does not distinguish active runtime code from generated files, historical artifacts, and staging docs
- it still reads like Garden OS is one static tool chain instead of a hybrid repo

## Proposal Summary

The next system map should describe Garden OS in six layers:

1. **Public Surfaces**  
   What users and developers can open directly on GitHub Pages.
2. **Runtime Systems**  
   The actual executable branches: root static tools and the `story-mode` app.
3. **Canonical Data + Docs**  
   What is source of truth versus planning/supporting material.
4. **Shared Resources**  
   Shared runtime data, brand assets, and media that should not be duplicated per line.
5. **Persistence + Delivery**  
   localStorage, `.gos.json`, GitHub Pages, PWA assets, build output.
6. **Legacy + Future Boundaries**  
   What is historical, what is active, and what may become shared-core later.

## Proposed Canonical Map

```text
Garden OS
├─ Public Surfaces
│  ├─ Hub / index.html
│  ├─ Story Mode
│  ├─ Planner v4.3
│  ├─ Legacy Season Engine v4
│  ├─ Build + Ops + Brand + Explainers
│  └─ Dev Tools
│     ├─ Scoring Visualizer
│     ├─ Scoring Map
│     ├─ Fairness Tester
│     ├─ System Map
│     └─ System Topology
├─ Runtime Systems
│  ├─ Root Static Tools
│  │  ├─ planner logic
│  │  ├─ legacy season simulator
│  │  └─ diagnostics / explainability pages
│  └─ story-mode app
│     ├─ game state + phase machine
│     ├─ cutscene machine
│     ├─ Three.js scene layer
│     ├─ UI sheets / dialogue / review flows
│     └─ persistence + save/load
├─ Canonical Data + Docs
│  ├─ specs/
│  ├─ docs/HANDOFF.md
│  ├─ root docs/
│  └─ docs/story-mode/
├─ Shared Resources
│  ├─ future data/shared/
│  ├─ future data/<mode>/
│  ├─ assets/shared/
│  ├─ story-mode/assets/
│  └─ story-mode/src/data/
├─ Persistence + Delivery
│  ├─ localStorage
│  ├─ .gos.json import/export
│  ├─ manifest.json / sw.js
│  ├─ GitHub Pages root
│  └─ story-mode/dist
└─ Legacy + Future Boundaries
   ├─ archive/ archives/
   ├─ garden-league-simulator lineage
   ├─ output/ reports/
   └─ possible future shared-core extraction
```

## Recommended Page Sections

### 01. What Garden OS Is

Open with a short, honest framing:

- Garden OS is a browser-native garden planning and simulation repo
- the root repo ships explainability tools and legacy play surfaces
- `story-mode/` is the active flagship runtime

This section should replace planner-only framing.

### 02. Public Surface Map

Show the live routes and their user roles:

- `index.html` as launcher
- `story-mode/` as flagship playable experience
- planner, build guide, ops guide, brand guide, how-it-thinks as support surfaces
- dev tools as diagnostics and architecture views

This should map directly to the current live route registry in `docs/active-hosted-urls.md`.

### 03. Runtime Architecture

Split runtime architecture into two branches:

#### Root Static Branch

- single-file HTML tools
- no build step
- deterministic planner/scoring utilities
- legacy season sandbox

#### Story Mode Branch

- `story-mode/src/`
- Vite build
- Three.js scene layer
- phase machine
- cutscene machine
- responsive HUD/sheet UI

The current system map does not make this distinction clearly enough.

### 04. Canonical Source Hierarchy

The page should explicitly name the order of truth:

1. `specs/`
2. `docs/HANDOFF.md`
3. root `docs/`
4. `docs/story-mode/`
5. progress logs and output artifacts

This is important because the repo now contains overlapping documentation sets.

### 05. Shared Resource Boundaries

The page should explicitly show resource ownership:

- shared canon in `specs/`
- shared runtime JSON in a future `data/shared/`
- root shared brand/media under `assets/shared/`
- story-mode-only runtime assets in `story-mode/assets/`
- story-mode-only authored data in `story-mode/src/data/`

It should also show the current problem cases:

- loose root JSON/config files
- duplicate archive trees
- generated `dist/` and `output/` paths sitting near source

### 06. State + Persistence

Show where state lives and how it moves:

- planner and root tools: localStorage + `.gos.json`
- story mode: localStorage campaign/save state
- generated build: `story-mode/dist`
- hosted delivery: GitHub Pages

This should also call out that root tools and story-mode use different runtime packaging models.

### 07. Current Risks / Friction

The map should name the current architectural tensions, not hide them:

- root repo instructions still assume single-file-only architecture
- story-mode is now a built app inside the same repo
- legacy simulator and story-mode overlap in mechanics and campaign concepts
- resources are still mixed by version, scope, and lifecycle in the top-level tree
- docs are richer than the current system map suggests

### 08. Future Extraction Boundaries

This section should stay explicitly provisional.

Potential future shared-core candidates:

- deterministic scoring primitives
- phase / progression helpers
- persistence schemas
- shared garden data and event interpretation

Do not present these as an existing shared engine yet. Reuse is still mostly conceptual, not packaged. Shared resource boundaries should be cleaned up before shared-core extraction is presented as real architecture.

## Visual Proposal

The next `system-map.html` should keep the dark operator aesthetic, but shift from a single pipeline diagram to a layered topology view:

- top row: public surfaces
- middle row: runtime systems
- lower row: canonical data/docs
- footer row: persistence, deployment, legacy, and future boundaries

Recommended label colors:

- green: active user-facing surfaces
- blue: runtime systems
- amber: canonical docs/specs
- muted red: legacy or risk boundaries

## Content Rules For The New Map

- Do not describe `theme-organizer-resource` as a Garden OS system.
- Do not imply the root single-file rules apply unchanged to `story-mode/`.
- Do not present historical simulators as the primary runtime.
- Do not imply all current root-level JSON/config files are correctly placed.
- Do not collapse docs, specs, and progress logs into one undifferentiated “documentation” block.
- Do explicitly show that Story Mode is the current flagship branch.

## Minimal Implementation Plan

1. Reframe the hero and summary around the hybrid repo.
2. Replace planner-only layer blocks with a split root-tools / story-mode runtime section.
3. Add canonical-source hierarchy and shared-resource boundary sections.
4. Add live-route registry and current-risks sections.
5. Keep topology detail links pointing to `scoring-map.html` and `system-topology.html` for deep dives.

## Decision

Garden OS should be mapped as:

- a **hybrid repo**
- with **Story Mode as the flagship runtime**
- **root tools as stable support and explainability surfaces**
- **shared resources stored by scope, not by version label**
- and **specs/docs as the actual canonical backbone**

That is the clearest description of the repo as it exists on 2026-03-22.
