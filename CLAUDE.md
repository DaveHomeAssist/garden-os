# Garden OS — Agent Instructions

## Architecture — Hard Constraints

- **Zero backend.** No servers, no APIs, no databases. Everything runs in the browser.
- **Root tool suite stays single-file HTML.** Repo-root tools are self-contained `.html` files with inline CSS and JS. No external JS/CSS files, no imports, no modules for those root surfaces.
- **`story-mode/` is the single runtime exception.** It is an active Vite + Three.js app with Vitest coverage and its own `package.json`.
- **Build tooling is allowed only inside `story-mode/`.** Use `npm ci` or `npm install`, `npm test`, `npm run build`, and `npm run dev` from `story-mode/` when working on that app surface.
- **No new framework/toolchain sprawl outside `story-mode/`.** Do not introduce React, Vue, Svelte, Tailwind, Bootstrap, jQuery, or additional bundlers into the root tool suite unless the implementation plan explicitly changes.
- **localStorage persistence.** All state saved to localStorage. Cross-tool data exchange via `.gos.json` file export/import.
- **Offline-capable.** Every tool must work without network access (except Google Fonts, which degrade gracefully).
- **Schema-first.** All tools validate against `gos-schema.json`. Increment the version field on breaking changes. See `docs/MIGRATION-CONTRACT.md` for migration rules.

## Scoring — Sacred Rules

- **Deterministic.** Same inputs must always produce the same outputs. Never add randomness to scoring.
- **Six factors:** sun fit (2x weight), support fit, shade tolerance, access fit, season fit, adjacency (additive).
- **Canonical spec:** `specs/SCORING_RULES.md` is the single source of truth for the algorithm. If code and spec disagree, the spec wins — fix the code.
- **Crop data:** `specs/CROP_SCORING_DATA.json` is canonical. 50 crops, 8 factions, 8 recipes.

## Navigation — Two-Track Model

- **User track:** Home → Play Game → Planner → Build Guide → Ops Guide → How It Thinks → [Dev Tools →]
- **Dev track:** [← Garden] → Visualizer → Scoring Map → Fairness Tester → System Map → Topology
- Bridge links connect the tracks. Do not merge them into a single nav.
- Nav bar: dark soil background (`#5c3d1e`), DM Mono font, sun accent (`#e8c84a`).

## Design System — User Track Pages

**Fonts:** Fraunces (headings, weight 600), DM Sans (body, weight 300-500), DM Mono (labels, weight 400-500).

**Colors:**
- `--soil: #5c3d1e` | `--leaf: #3d7a4f` | `--leaf-bright: #5aab6b` | `--sun: #e8c84a`
- `--cream: #f7f2ea` | `--cream-dark: #ede5d8` | `--text: #1e110a` | `--text-mid: #5a3e2b`

**Border radius:** 8px for cards/panels. Pill (999px) for badges only.

**Dev track pages** use their own aesthetic (Inter/Georgia for data pages, system-ui for dark-mode pages). Do not force user-track fonts onto dev tools.

## Character Voice

Four characters with fixed speaking order: Garden GURL → Onion Man → Vegeman → Garden Critters. All dialogue is trigger-driven and deterministic — never add random chatter. See `docs/VOICE_BIBLE.md` for tone rules and `specs/DIALOGUE_ENGINE.json` for trigger mapping.

## File Conventions

- **Kebab-case** for all HTML filenames (e.g., `scoring-visualizer.html`, not `scoring_visualizer.html`).
- **UPPER_SNAKE_CASE** for spec files (e.g., `SCORING_RULES.md`, `EVENT_DECK.json`).
- New tools go in repo root. Specs go in `specs/`. Design docs go in `docs/`.
- Archive old versions in `archive/` with version suffix.

## Deployment

- GitHub Pages from `main` branch, repo root. Auto-deploys on push via `.github/workflows/pages.yml`.
- Live at: `davehomeassist.github.io/garden-os/`
- Root tools local test: `python3 -m http.server 8000`
- `story-mode/` local runtime: run from `story-mode/` with `npm run dev`, `npm test`, and `npm run build`
- After pushing, provide the live URL.

## Key References

| Domain | Canonical Source |
|--------|-----------------|
| Data model | `gos-schema.json` |
| Scoring algorithm | `specs/SCORING_RULES.md` |
| Season engine | `specs/SEASON_ENGINE_SPEC.md` |
| Crop definitions | `specs/CROP_SCORING_DATA.json` |
| Character voice | `docs/VOICE_BIBLE.md` |
| Event deck | `specs/EVENT_DECK.json` |
| Dialogue triggers | `specs/DIALOGUE_ENGINE.json` |
| Full project context | `docs/HANDOFF.md` |
| Live URLs | `docs/active-hosted-urls.md` |
| Roadmap | `IMPLEMENTATION_PLAN.md` |

## Documentation Maintenance

- **Issues**: `docs/UI_ISSUES_TABLE.html` — update the JSON data array when opening, resolving, or deferring issues. AGENTS.md issue tracker is deprecated.
- **Session log**: Append to `/Users/daverobertson/Desktop/Code/95-docs-personal/today.csv` after each meaningful change
- **Implementation plan**: `IMPLEMENTATION_PLAN.md` — update `Last verified:` date when reviewing
- **Handoff**: `docs/HANDOFF.md` — update when architecture or key decisions change

## Issue Archive (from AGENTS.md)

> Historical reference only. New issues go in `docs/UI_ISSUES_TABLE.html`.

| ID | Severity | Status | Title | Notes |
|----|----------|--------|-------|-------|
| 014 | P2 | resolved | Reduce planner right sidebar overload | Summary now stays compact, dashboard moved behind its own reveal, and switching sections collapses stale side content |
| 001 | P2 | resolved | Replace planner confirm flows with reversible recovery | Clear, reset, delete, import replace, and harvest delete now use undo or restore paths |
| 002 | P2 | resolved | Separate home and hub roles | `home.html` is the guided start page and `index.html` is the live launcher |
| 003 | P2 | resolved | Surface one dominant simulator action per phase | Added objective strip with current phase CTA and kept existing engine logic intact |
| 004 | P2 | resolved | Share planner manage menu pattern with Season Engine | Added a matching manage drawer in the game shell with tool and learn routes |
| 005 | P2 | resolved | Repair tutorial tomato targeting | Tutorial step 1 now forces the crop palette open before pointing at the tomato item |
| 006 | P2 | resolved | Add deterministic scenario harness prompts | Garden OS prompt pack now includes scenario harness and stronger regression guarantees |
| 007 | P2 | resolved | Unify planner reasoning into one surface | Summary panel now combines score direction, top risk, tradeoff, and next move |
| 008 | P2 | resolved | Harden simulator phase restore and split review semantics | Legacy REVIEW saves now normalize to explicit review phases and UI copy distinguishes harvest review from winter review |
| 009 | P2 | resolved | Surface Accept Loss in simulator beat UI | Unresolved event phases now name Accept Loss directly in the objective strip, status text, and action toolbar |
| 010 | P2 | resolved | Surface planner severity summary and inspect next moves | Planner now shows severity counts above the bed and per cell risk guidance in Inspect |
| 011 | P3 | resolved | Confirm restore success after import and reset | Restore flows now show a success banner after recovery completes |
| 012 | P2 | resolved | Add deterministic scenario pack and regression clauses | Prompt assets now include a fixed scenario pack and stronger regression checks for phase migration and Accept Loss clarity |
| 013 | P2 | resolved | Add phase and reasoning smoke script | Browser smoke script now checks planner reasoning surface and simulator legacy review migration |

## What Not To Do

- Do not add a backend, database, or server requirement.
- Do not introduce new npm/build-tool requirements for the repo-root HTML tools.
- Do not add external JS/CSS dependencies to the repo-root HTML tools.
- Do not merge the user and dev nav tracks.
- Do not add randomness to scoring.
- Do not modify specs/ JSON files without updating the corresponding HTML tool.
- Do not create new overview/summary docs — `docs/HANDOFF.md` is the intake document.
