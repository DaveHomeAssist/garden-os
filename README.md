# Garden OS

> A local-first raised-bed planning system that runs entirely in the browser. Explains placement decisions, not just layouts.

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

- Explainable scoring panel in Inspect tab
- Limiting-factor detection for each selected crop/cell
- Adjacency analysis (companion/conflict/water mismatch)
- Workspace export/import with `.gos.json`
- Canonical data contract in `gos-schema.json`
- Zero-backend, offline-capable architecture

## Quick Start

1. Clone the repo.
2. Open `index.html` in a modern browser.
3. Launch `garden-planner-v4.html` from the hub.

No install step, no build step, no runtime services.

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
├── index.html                          # Hub / landing page
├── garden-planner-v4.html              # Core planner and scoring engine
├── garden-cage-build-guide.html        # Cage construction guide
├── garden-cage-ops-guide.html          # Operations and maintenance guide
├── garden_planner_scoring_system_map.html  # Scoring architecture reference
├── garden_planner_scoring_visualizer.html  # Scoring debugger
├── system-topology.html                # Ecosystem topology map
├── brand-guide.html                    # Brand token and component reference
├── specs/                              # Data schemas and reference JSON
├── docs/                               # Design docs, audits, roadmaps
├── AGENTS.md                           # Agent instructions and issue tracker
├── CLAUDE.md                           # Architecture constraints
└── README.md                           # This file
```

## Deployment

- **Host:** GitHub Pages
- **Live URL:** https://davehomeassist.github.io/garden-os/
- **Build step:** None (static)

## Tech

- HTML5, CSS3, Vanilla JavaScript — no dependencies
- localStorage for persistence
- JSON Schema for contract validation
- Offline-capable (no network required except Google Fonts)

## Smoke Checklist

- Planner reloads cleanly with existing saved workspaces.
- Planner recovers to a safe empty workspace if localStorage JSON is malformed.
- Planner tool state stays in sync across click, keyboard, reload, and bed switching.
- Planner mobile shell shows the board before side panels and sidebar toggles still work.
- Season Engine v4 neutral clicks inspect/select without mutating the grid.
- Season Engine v4 `E` toggles eraser and `Escape` returns to neutral inspect behavior.
- Menus and dialogs open with focus on an action, trap Tab where expected, and close on `Escape`.

## Roadmap

- Planner accessibility hardening (ARIA, keyboard clarity)
- Scoring visualization polish and diagnostics depth
- Workspace lifecycle improvements
- Additional decision-support modules

## Links

- Live: https://davehomeassist.github.io/garden-os/
- Source: https://github.com/DaveHomeAssist/garden-os

## Conventions

This project follows the shared naming conventions in `30-shared-resources/shared-standards/NAMING_CONVENTIONS.md`.

## License

MIT (project-level convention).
