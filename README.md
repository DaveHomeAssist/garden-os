# Garden OS

> A local-first raised-bed planning and story system. Root tools run entirely in
> the browser; Story Mode can also use an optional signed authority service while
> retaining local offline persistence.

## Problem Statement

Most garden planners answer "where should I plant this?" with weak reasoning transparency.

Garden OS focuses on explainable decisions:
- sun fit
- support fit
- shade tolerance
- access fit
- seasonal fit
- structural bonus
- adjacency effects

The system also highlights the limiting factor so users can make high-leverage changes quickly.

## Features

- Active v5 Beds What-If trials with zero persistent writes before Apply
- Cross-bed A/B experiments with immutable baselines, dated observations, and read-only Planner summaries
- Explainable scoring panel in Inspect tab
- Limiting-factor detection for each selected crop/cell
- Adjacency analysis (companion/conflict/water mismatch)
- Workspace export/import with `.gos.json`
- Export-only reasoned summaries for temporal context, multi-bed comparison, companion findings, and active-cell explanation
- Canonical data contract in `gos-schema.json`
- Light-default, user-selectable light/dark themes shared across public routes
- Installable PWA with verified first-visit registration and offline reload
- Story Mode, Free Play, and Story Planner with explicit persistence boundaries

## Quick Start

1. Clone the repo.
2. Open `index.html` in a modern browser.
3. Launch the active v5 surfaces: `garden-painting.html` for Beds and
   `garden-planner-v5.html` for the seasonal Planner.

The current root surfaces can run without install, build, or runtime services.
That is a shipping mode, not a permanent architecture rule.

## Usage Example

1. Select a crop in the palette.
2. Paint cells in the bed.
3. Open Inspect tab on a planted cell.
4. Read the `Why this score?` breakdown.
5. Move the crop based on limiting-factor diagnostics.
6. Export workspace to `.gos.json` for backup or sharing.

## Structure

```
garden-os/
├── index.html                          # Canonical Home redirect
├── index-v5.html                       # Current product Home implementation
├── garden-painting.html                # Active v5 Beds editor and experiments
├── garden-planner-v5.html              # Active v5 seasonal planner
├── garden-doctor-v5.html               # Active symptom triage
├── journal.html                        # Local-first garden journal
├── how-it-thinks-v5.html               # Plain-English scoring walkthrough
├── garden-theme.js                     # Shared light/dark preference + visible toggle
├── garden-pwa.js                       # Shared service-worker registration
├── gos-experiments.js                  # Cross-bed experiment contract/store
├── garden-cage-build-guide.html        # Cage construction guide
├── garden-cage-ops-guide.html          # Operations and maintenance guide
├── scoring-map.html                    # Scoring architecture reference
├── scoring-visualizer.html             # Scoring debugger
├── system-topology.html                # Ecosystem topology map
├── brand-guide.html                    # Brand token and component reference
├── specs/                              # Data schemas and reference JSON
├── docs/                               # Design docs, audits, roadmaps
├── AGENTS.md                           # Agent instructions (issue tracker deprecated; see docs/UI_ISSUES_TABLE.html)
├── CLAUDE.md                           # Architecture constraints
└── README.md                           # This file
```

## Deployment

- **Host:** GitHub Pages
- **Live URL:** https://davehomeassist.github.io/garden-os/
- **Build step:** None for current root surfaces; build tooling is allowed for
  app-quality surfaces when the product needs it.

## Tech

- HTML5, CSS3, JavaScript, and vendored React for active v5 surfaces
- localStorage/file persistence for root tools; IndexedDB/local fallback plus an
  optional signed authority API for Story Mode
- JSON Schema for contract validation
- Offline-capable (no network required except Google Fonts)

## Smoke Checklist

- Run the full predeploy verifier:
  ```bash
  cd story-mode && npm ci
  npx playwright install chromium
  cd ..
  node scripts/verify-all.mjs
  ```
- Run the live postdeploy smoke:
  ```bash
  node scripts/verify-all.mjs --live-only --live-url https://davehomeassist.github.io/garden-os/story-mode/
  ```
- Planner reloads cleanly with existing saved workspaces.
- Planner recovers to a safe empty workspace if localStorage JSON is malformed.
- Planner tool state stays in sync across click, keyboard, reload, and bed switching.
- Planner mobile shell shows the board before side panels and sidebar toggles still work.
- Season Engine v4 (`garden-league-simulator-v4.html`, archived) neutral clicks inspect/select without mutating the grid.
- Season Engine v4 `E` toggles eraser and `Escape` returns to neutral inspect behavior.
- Menus and dialogs open with focus on an action, trap Tab where expected, and close on `Escape`.
- Phase reasoning smoke verifies score payload parity, temporal context, multi-bed experiment summaries, companion findings, and deterministic reasoned export output.

## Roadmap

- Recover the printable garden plan on the active v5 bed contract
- Re-plan the live weather coach with explicit privacy, cache, offline, CSP, and
  permission behavior
- Close the remaining Story Mode touch-drag and window-SFX backlog items

## Links

- Live: https://davehomeassist.github.io/garden-os/
- Source: https://github.com/DaveHomeAssist/garden-os

## Conventions

This project follows the shared naming conventions in `30-shared-resources/shared-standards/NAMING_CONVENTIONS.md`.

## License

MIT (project-level convention).
