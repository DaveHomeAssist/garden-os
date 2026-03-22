# Garden OS — Agent Instructions

## Architecture — Hard Constraints

- **Zero backend.** No servers, no APIs, no databases. Everything runs in the browser.
- **Single-file HTML tools.** Each tool is one self-contained `.html` file with inline CSS and JS. No external JS/CSS files, no imports, no modules.
- **No build step.** No npm, no bundlers, no transpilers, no frameworks. Vanilla HTML/CSS/JS only.
- **No dependencies.** No React, Vue, Svelte, Tailwind, Bootstrap, jQuery, or any library unless already present in the file (D3 is used in system-topology.html only).
- **localStorage persistence.** All state saved to localStorage. Cross-tool data exchange via `.gos.json` file export/import.
- **Offline-capable.** Every tool must work without network access (except Google Fonts, which degrade gracefully).
- **Schema-first.** All tools validate against `gos-schema.json`. Increment the version field on breaking changes. See `docs/MIGRATION-CONTRACT.md` for migration rules.

## Scoring — Sacred Rules

- **Deterministic.** Same inputs must always produce the same outputs. Never add randomness to scoring.
- **Six factors:** sun fit (2x weight), support fit, shade tolerance, access fit, season fit, adjacency (additive).
- **Canonical spec:** `specs/SCORING_RULES.md` is the single source of truth for the algorithm. If code and spec disagree, the spec wins — fix the code.
- **Crop data:** `specs/CROP_SCORING_DATA.json` is canonical. 50 crops (20 campaign + 30 expansion), 8 factions, 8 scoring recipes. See `specs/PROGRESSION_SPEC.md` for the 7 campaign recipes + 5 hidden Mom recipes.

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
- Test locally: `python3 -m http.server 8000`
- After pushing, provide the live URL.

## Key References

| Domain | Canonical Source |
|--------|-----------------|
| Data model | `gos-schema.json` |
| Scoring algorithm | `specs/SCORING_RULES.md` |
| Season engine | `specs/SEASON_ENGINE_SPEC.md` |
| Crop definitions | `specs/CROP_SCORING_DATA.json` |
| Progression & unlocks | `specs/PROGRESSION_SPEC.md` |
| Narrative (12 chapters) | `specs/NARRATIVE_SPEC.md` |
| Dialogue system | `specs/DIALOGUE_SYSTEM.md` |
| Character voice | `docs/VOICE_BIBLE.md` |
| Event deck | `specs/EVENT_DECK.json` |
| Dialogue triggers | `specs/DIALOGUE_ENGINE.json` |
| Intervention logic | `specs/INTERVENTION_LOGIC_TABLE.md` |
| UI specification | `specs/UI_SPEC.md` |
| Audio design | `specs/AUDIO_SPEC.md` |
| Full project context | `docs/HANDOFF.md` |
| Live URLs | `docs/active-hosted-urls.md` |
| Roadmap | `IMPLEMENTATION_PLAN.md` |

## What Not To Do

- Do not add a backend, database, or server requirement.
- Do not introduce npm, package.json, or any build tooling.
- Do not add external JS/CSS dependencies.
- Do not merge the user and dev nav tracks.
- Do not add randomness to scoring.
- Do not modify specs/ JSON files without updating the corresponding HTML tool.
- Do not create new overview/summary docs — `docs/HANDOFF.md` is the intake document.
