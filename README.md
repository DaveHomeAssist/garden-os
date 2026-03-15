# Garden OS

Garden OS is a local-first raised-bed planning system that runs entirely in the browser.

It is designed to explain placement decisions, not just produce layouts. The planner computes crop fit per cell and now exposes *why* each score is high or low.

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

## Key Features
- Explainable scoring panel in Inspect tab
- Limiting-factor detection for each selected crop/cell
- Adjacency analysis (companion/conflict/water mismatch)
- Workspace export/import with `.gos.json`
- Canonical data contract in `gos-schema.json`
- Zero-backend, offline-capable architecture

## Tool Suite
- `index.html` - Garden OS hub
- `garden-planner-v4.html` - core planner and scoring engine
- `garden-cage-build-guide.html` - cage construction guide
- `garden-cage-ops-guide.html` - operations and maintenance guide
- `garden_planner_scoring_system_map.html` - scoring architecture reference
- `garden_planner_scoring_visualizer.html` - scoring debugger
- `system-topology.html` - ecosystem topology map

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

## Technical Stack
- HTML5
- CSS3
- Vanilla JavaScript
- localStorage for persistence
- JSON Schema for contract validation

## Architecture Highlights
- Local-first data ownership
- Deterministic scoring logic
- Schema-validated workspace model
- Portable workspace files
- Single-file tool architecture

See:
- `docs/garden-os-system-map.html`
- `docs/garden-os-architecture-diagram.svg`
- `docs/DOCUMENTATION_CATALOG.md`
- `docs/game-timeline/README.md`

## Contribution Guidelines
Contributions are welcome.

Please open an issue or PR for:
- crop model improvements
- scoring model refinements
- UX/a11y hardening
- documentation quality
- testing and validation improvements

Guidelines:
- Keep tools browser-native and offline-capable.
- Avoid backend dependencies unless explicitly scoped.
- Preserve schema compatibility or document migrations clearly.

## Roadmap (Near-Term)
- Planner accessibility hardening (ARIA, keyboard clarity)
- Scoring visualization polish and diagnostics depth
- Workspace lifecycle improvements
- Additional decision-support modules

## License
MIT (project-level convention).

## Links
- Live: https://davehomeassist.github.io/garden-os/
- Source: https://github.com/DaveHomeAssist/garden-os
