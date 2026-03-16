# Garden OS — Documentation Synthesis & Source-of-Truth Audit

> **Date:** 2026-03-16
> **Scope:** Full repo audit — 77 active files across root, docs/, specs/, codex-prompts/, audit/
> **Goal:** Define the minimum clean documentation stack. Eliminate overlap. Establish canonical sources.

---

## 1. Existing Documentation Inventory

### Root-Level Files

| File | Current Role | Covers | Assessment | Action |
|------|-------------|--------|------------|--------|
| `README.md` | Product overview | Problem, features, quickstart, architecture, roadmap links | Sufficient | **Keep as-is** |
| `SCHEMA.md` | Schema reference | Workspace, Bed, PlannerState, CageConfig, cell traits | Sufficient | **Keep as-is** — canonical |
| `IMPLEMENTATION_PLAN.md` | Roadmap + progress | 30/60/90 phases, progress log, baseline metrics | Sufficient | **Keep as-is** — active |
| `progress.md` | Historical work log | v1→v3 game engine development rounds | Sufficient | **Keep as-is** — reference only |
| `PRESS_RELEASE_DRAFT.md` | Marketing copy | v4.4 features, brand voice | Sufficient (80%) | **Keep as-is** |
| `DOC garden-os-implementation-plan.md` | Legacy plan | Older version of IMPLEMENTATION_PLAN.md | **Obsolete** | **Move to archive/** |
| `gos-schema.json` | JSON Schema contract | Formal validation schema, 310 lines | Sufficient | **Keep as-is** — canonical |

### docs/ — Main Level

| File | Current Role | Assessment | Action |
|------|-------------|------------|--------|
| `README.md` | Doc index hub | Sufficient — primary navigation | **Keep as-is** |
| `HANDOFF.md` | AI intake document | Sufficient — comprehensive, current | **Keep as-is** — canonical |
| `active-hosted-urls.md` | Deployment audit | Sufficient — updated today | **Keep as-is** |
| `VOICE_BIBLE.md` | Character voice guide | Sufficient — complete, authoritative | **Keep as-is** — canonical |
| `GAME_FEEL.md` | Juice/feedback spec | Sufficient | **Keep as-is** |
| `ART_DIRECTION.md` | Visual language | Sufficient | **Keep as-is** |
| `CAMPAIGN_DESIGN.md` | 12-chapter narrative | Sufficient | **Keep as-is** |
| `GAME_DESIGN_ANALYSIS.md` | Design rationale | Sufficient | **Keep as-is** |
| `GAME_DESIGN_CRITIQUE.md` | Risk audit | Sufficient — high value | **Keep as-is** |
| `PROGRESSION_SYSTEMS.md` | Progression design | Sufficient | **Keep as-is** |
| `REPLAYABILITY.md` | Retention design | Sufficient | **Keep as-is** |
| `SEASONAL_EVENT_SYSTEM.md` | Event taxonomy | Sufficient | **Keep as-is** |
| `MARKETING_STRATEGY.md` | Commercial framing | Sufficient | **Keep as-is** |
| `CONCEPT_BOARD_COHESION.md` | Visual cohesion | Sufficient | **Keep as-is** |
| `MIGRATION-CONTRACT.md` | Schema migration spec | Sufficient | **Keep as-is** |
| `UI_GRAPHICAL_IMPROVEMENT_AUDIT.md` | UI polish backlog | Sufficient — active | **Keep as-is** |
| `DOCUMENTATION_CATALOG.md` | Prior doc inventory | **Redundant** — superseded by docs/README.md | **Archive** |
| `DOCUMENTATION_CATALOG.csv` | CSV of above | **Redundant** | **Archive** |
| `WORKSPACE-SCHEMA.md` | Schema working notes | **Redundant** — superseded by root SCHEMA.md | **Archive** |
| `GARDEN_OS_STORY_BIBLE_PROMPT.md` | Prompt template stub | **Stub** — not a finished doc | **Archive** |
| `It's a custom, data-driven UI engine, no.md` | Fragment | **Fragment** — not a doc | **Delete** |
| `daily-update-2026-03-15.md` | Standup log | **Ephemeral** — not reference material | **Archive** |

### docs/ — Subfolders

| Folder | Files | Assessment | Action |
|--------|-------|------------|--------|
| `garden-os-writers-room/` | 16 + README | Prompt scaffolding kit — README explains role. Content is prompt-runner output, not canonical docs. No overlap risk because the main docs/ files are the promoted outputs. | **Keep as-is** — mark as "prompt scaffolding, not source of truth" in README |
| `game-timeline/` | 7 + README | Planning artifacts for multi-mode timeline. Scaffolding for future sprints. | **Keep as-is** |
| `launch-pack/` | 3 files | HN, Reddit, architecture diagram specs. Ready for launch. | **Keep as-is** |

### specs/

| File | Assessment | Action |
|------|------------|--------|
| `SCORING_RULES.md` | Sufficient — canonical algorithm spec | **Keep as-is** — canonical |
| `SEASON_ENGINE_SPEC.md` | Sufficient — canonical state machine | **Keep as-is** — canonical |
| `NARRATIVE_SPEC.md` | Sufficient — canonical narrative beats | **Keep as-is** — canonical |
| `DIALOGUE_SYSTEM.md` | Sufficient | **Keep as-is** |
| `PROGRESSION_SPEC.md` | Sufficient | **Keep as-is** |
| `UI_SPEC.md` | Sufficient — 50K, very comprehensive | **Keep as-is** |
| `DIALOGUE_ENGINE.json` | Data payload — canonical | **Keep as-is** — canonical |
| `EVENT_DECK.json` | Data payload — canonical | **Keep as-is** — canonical |
| `CROP_SCORING_DATA.json` | Data payload — canonical | **Keep as-is** — canonical |
| `PROMPT_CHAIN.md` | Process doc for prompt rounds | **Keep as-is** |
| `V2_REUSE_AUDIT.md` | Historical — v2→v3 mapping | **Keep as-is** — reference |
| `CLAUDE-G1` through `G4` | Schema generation artifacts | **Keep as-is** — historical reference |

### Other

| Path | Assessment | Action |
|------|------------|--------|
| `codex-prompts/` (4 files) | Implementation task specs — useful for future phases | **Keep as-is** |
| `audit/validate-before-commit.md` | Active QA checklist | **Keep as-is** |
| `archive/` (4 files) | All obsolete | **Keep as-is** — properly segregated |

---

## 2. Coverage Analysis

| Domain | Status | Source(s) | Next Step |
|--------|--------|-----------|-----------|
| Product identity | Fully covered | README.md, PRESS_RELEASE_DRAFT.md, MARKETING_STRATEGY.md | None |
| Architecture constraints | Fully covered | HANDOFF.md §1, README.md, IMPLEMENTATION_PLAN.md | None |
| Planner logic | Fully covered | HANDOFF.md §6, garden-planner-v4.html (code) | None |
| Scoring algorithm | Fully covered | specs/SCORING_RULES.md (canonical), HANDOFF.md §4 | None |
| Crop data model | Fully covered | specs/CROP_SCORING_DATA.json (canonical), HANDOFF.md §3 | None |
| Season engine | Fully covered | specs/SEASON_ENGINE_SPEC.md (canonical), HANDOFF.md §6 | None |
| Narrative/campaign | Fully covered | specs/NARRATIVE_SPEC.md, docs/CAMPAIGN_DESIGN.md, docs/VOICE_BIBLE.md | None |
| Event system | Fully covered | specs/EVENT_DECK.json, docs/SEASONAL_EVENT_SYSTEM.md | None |
| Dialogue system | Fully covered | specs/DIALOGUE_ENGINE.json, specs/DIALOGUE_SYSTEM.md | None |
| Progression | Fully covered | specs/PROGRESSION_SPEC.md, docs/PROGRESSION_SYSTEMS.md | None |
| Navigation / IA | Fully covered | docs/active-hosted-urls.md, HANDOFF.md §2 | None |
| UI specification | Fully covered | specs/UI_SPEC.md (50K comprehensive) | None |
| Art direction | Fully covered | docs/ART_DIRECTION.md, docs/CONCEPT_BOARD_COHESION.md | None |
| Game feel / juice | Fully covered | docs/GAME_FEEL.md | None |
| Character voice / tone | Fully covered | docs/VOICE_BIBLE.md (canonical) | None |
| Schema / data model | Fully covered | gos-schema.json + SCHEMA.md (canonical pair) | None |
| Schema migration | Fully covered | docs/MIGRATION-CONTRACT.md | None |
| Deployment workflow | Fully covered | .github/workflows/pages.yml, docs/active-hosted-urls.md | None |
| Pre-commit QA | Fully covered | audit/validate-before-commit.md | None |
| Roadmap / priorities | Fully covered | IMPLEMENTATION_PLAN.md | None |
| AI handoff / intake | Fully covered | docs/HANDOFF.md | None |
| Doc index / navigation | Fully covered | docs/README.md | None |
| Replayability | Fully covered | docs/REPLAYABILITY.md | None |
| Risk audit | Fully covered | docs/GAME_DESIGN_CRITIQUE.md | None |
| Marketing / launch | Fully covered | docs/MARKETING_STRATEGY.md, docs/launch-pack/ | None |
| **Assistant behavior** | **Missing** | No CLAUDE.md or project instructions doc | **Create** |
| **Doc ownership map** | **Missing** | No explicit ownership or canonical-vs-supporting labeling | **Add to docs/README.md** |
| **Shipped vs planned vs legacy** | **Partially covered** | IMPLEMENTATION_PLAN.md tracks phases but no single status view | **Add to docs/README.md** |

---

## 3. Recommended Documentation Stack

### Tier 1 — Project Instructions (CLAUDE.md)

| Item | Status | Action |
|------|--------|--------|
| `CLAUDE.md` (repo root) | **Missing** | **Create** — 8K char behavioral instructions for AI agents |

### Tier 2 — Source-of-Truth Reference Docs

| Item | File | Action |
|------|------|--------|
| AI handoff / full context | `docs/HANDOFF.md` | Keep as-is |
| JSON Schema contract | `gos-schema.json` | Keep as-is |
| Human schema reference | `SCHEMA.md` | Keep as-is |
| Scoring algorithm | `specs/SCORING_RULES.md` | Keep as-is |
| Season engine | `specs/SEASON_ENGINE_SPEC.md` | Keep as-is |
| Narrative spec | `specs/NARRATIVE_SPEC.md` | Keep as-is |
| Crop data | `specs/CROP_SCORING_DATA.json` | Keep as-is |
| Dialogue data | `specs/DIALOGUE_ENGINE.json` | Keep as-is |
| Event data | `specs/EVENT_DECK.json` | Keep as-is |
| Character voice | `docs/VOICE_BIBLE.md` | Keep as-is |

### Tier 3 — Active Planning Docs

| Item | File | Action |
|------|------|--------|
| Roadmap + progress | `IMPLEMENTATION_PLAN.md` | Keep as-is |
| Deployment audit | `docs/active-hosted-urls.md` | Keep as-is |
| UI polish backlog | `docs/UI_GRAPHICAL_IMPROVEMENT_AUDIT.md` | Keep as-is |
| Pre-commit QA | `audit/validate-before-commit.md` | Keep as-is |

### Tier 4 — Design Docs (stable reference)

| Item | File | Action |
|------|------|--------|
| Art direction | `docs/ART_DIRECTION.md` | Keep as-is |
| Game feel | `docs/GAME_FEEL.md` | Keep as-is |
| Campaign design | `docs/CAMPAIGN_DESIGN.md` | Keep as-is |
| Progression | `docs/PROGRESSION_SYSTEMS.md` | Keep as-is |
| Replayability | `docs/REPLAYABILITY.md` | Keep as-is |
| Event taxonomy | `docs/SEASONAL_EVENT_SYSTEM.md` | Keep as-is |
| Design analysis | `docs/GAME_DESIGN_ANALYSIS.md` | Keep as-is |
| Design critique | `docs/GAME_DESIGN_CRITIQUE.md` | Keep as-is |
| Visual cohesion | `docs/CONCEPT_BOARD_COHESION.md` | Keep as-is |

### Tier 5 — Marketing / Launch

| Item | File | Action |
|------|------|--------|
| Press release | `PRESS_RELEASE_DRAFT.md` | Keep as-is |
| Marketing strategy | `docs/MARKETING_STRATEGY.md` | Keep as-is |
| Launch pack | `docs/launch-pack/` | Keep as-is |

### Tier 6 — Supporting / Scaffolding

| Item | File | Action |
|------|------|--------|
| Writers room prompts | `docs/garden-os-writers-room/` | Keep as-is |
| Game timeline | `docs/game-timeline/` | Keep as-is |
| Codex prompts | `codex-prompts/` | Keep as-is |
| CLAUDE-G1 through G4 | `specs/CLAUDE-G*.md` | Keep as-is |

### Cleanup Actions

| File | Action |
|------|--------|
| `DOC garden-os-implementation-plan.md` (root) | Move to `archive/` |
| `docs/DOCUMENTATION_CATALOG.md` | Move to `archive/` |
| `docs/DOCUMENTATION_CATALOG.csv` | Move to `archive/` |
| `docs/WORKSPACE-SCHEMA.md` | Move to `archive/` |
| `docs/GARDEN_OS_STORY_BIBLE_PROMPT.md` | Move to `archive/` |
| `docs/It's a custom, data-driven UI engine, no.md` | Delete |
| `docs/daily-update-2026-03-15.md` | Move to `archive/` |

---

## 4. Source-of-Truth Recommendation

### Does Garden OS need a new canonical reference doc?

**No.** `docs/HANDOFF.md` already serves this function. It was created today and covers architecture, data model, scoring, season engine, narrative, events, schema, deployment, code entry points, and file structure in 377 lines.

### What HANDOFF.md should be

- **Purpose:** Comprehensive AI intake document. Single file a new agent reads to get full project context.
- **Belongs in it:** Architecture, data model summary, scoring algorithm summary, season engine summary, narrative overview, design system, deployment model, code entry points, file map.
- **Must stay out of it:** Behavioral instructions (that's CLAUDE.md), detailed specs (those are in specs/), full event/dialogue data (those are JSON files).
- **Points to, does not duplicate:** `specs/SCORING_RULES.md`, `specs/SEASON_ENGINE_SPEC.md`, `specs/CROP_SCORING_DATA.json`, `docs/VOICE_BIBLE.md`, `gos-schema.json`.

### What Garden OS does need: CLAUDE.md

The one genuine gap. There is no behavioral instruction file for AI agents working in this repo. This is distinct from HANDOFF.md (which is reference context) — CLAUDE.md defines *how to behave* when modifying the project.

---

## 5. Project Instructions Boundary

### Belongs in CLAUDE.md (~8000 chars)

| Category | Content |
|----------|---------|
| Architecture constraints | Zero-backend, single-file HTML, no build step, no npm, localStorage only, offline-capable |
| File conventions | Kebab-case filenames, single HTML files, specs/ for data + algorithms, docs/ for design |
| Scoring rules | Deterministic — same inputs always produce same outputs. Never add randomness to scoring. |
| Schema contract | All tools validate against `gos-schema.json`. Increment version on breaking changes. |
| Navigation model | Two-track nav (user/dev) with bridge links. Do not merge tracks. |
| Font stack | User track: Fraunces/DM Sans/DM Mono. Dev track: own aesthetic allowed. |
| Color palette | Soil/leaf/sun/cream system. Reference `docs/ART_DIRECTION.md` for full spec. |
| Voice constraints | 4 characters with fixed speaking order. Never add random dialogue. Reference `docs/VOICE_BIBLE.md`. |
| Code style | Vanilla JS, no frameworks, no transpilation. Functions over classes. Explicit over clever. |
| Testing | Local: `python3 -m http.server`. Deploy: push to main → auto-Pages. |
| What not to do | No backend, no npm, no build step, no frameworks, no random scoring, no merging nav tracks |

### Belongs in Supporting Docs (NOT in CLAUDE.md)

| Category | Where It Lives |
|----------|---------------|
| Full scoring algorithm | `specs/SCORING_RULES.md` |
| Full state machine | `specs/SEASON_ENGINE_SPEC.md` |
| Crop data fields | `specs/CROP_SCORING_DATA.json` |
| Character voice details | `docs/VOICE_BIBLE.md` |
| Art direction details | `docs/ART_DIRECTION.md` |
| Campaign chapter structure | `docs/CAMPAIGN_DESIGN.md` |
| Event deck details | `specs/EVENT_DECK.json` |
| Dialogue triggers | `specs/DIALOGUE_ENGINE.json` |
| UI component spec | `specs/UI_SPEC.md` |
| Schema field definitions | `SCHEMA.md` + `gos-schema.json` |
| Deployment URLs | `docs/active-hosted-urls.md` |
| Roadmap details | `IMPLEMENTATION_PLAN.md` |
| Full project context | `docs/HANDOFF.md` |

---

## 6. Final Recommendation

### Minimum changes needed

| # | Action | Effort |
|---|--------|--------|
| 1 | **Create `CLAUDE.md`** — behavioral instructions for AI agents | ~30 min |
| 2 | **Archive 7 redundant/obsolete files** from docs/ and root | ~5 min |
| 3 | **Update `docs/README.md`** — add canonical-vs-supporting labels and ownership column | ~15 min |
| 4 | **Delete 1 fragment** (`docs/It's a custom...`) | ~1 min |

### Single highest-value missing doc

**`CLAUDE.md`** — without it, every new AI session starts without behavioral constraints. HANDOFF.md provides *context* but not *rules*. CLAUDE.md provides the rules.

### Top sources that should be declared canonical

| Source | Domain |
|--------|--------|
| `gos-schema.json` + `SCHEMA.md` | Data model |
| `specs/SCORING_RULES.md` | Scoring algorithm |
| `specs/SEASON_ENGINE_SPEC.md` | Season engine |
| `specs/CROP_SCORING_DATA.json` | Crop definitions |
| `specs/DIALOGUE_ENGINE.json` | Dialogue data |
| `specs/EVENT_DECK.json` | Event data |
| `docs/VOICE_BIBLE.md` | Character voice |
| `docs/HANDOFF.md` | AI project intake |
| `CLAUDE.md` (to create) | Agent behavior |

### What should NOT be created

- No "master overview doc" — HANDOFF.md already serves that role
- No "architecture decision record" — constraints are stable and simple enough for CLAUDE.md
- No "style guide doc" — ART_DIRECTION.md + the font/color constants in HANDOFF.md cover this
- No "testing guide" — there's no test framework; local server + push-to-Pages is the workflow
- No "contributing guide" — single developer, AI-assisted workflow
- No "changelog" — git log is authoritative
- No consolidated "design bible" — the individual docs (voice, art, feel, campaign) are better as separate files than merged into one mega-doc

### Bottom line

Garden OS documentation is **unusually complete**. The 77 active files cover every major domain with minimal harmful overlap. The writers-room and game-timeline subfolders are properly scoped as scaffolding. The specs/ folder is clean and canonical. The one real gap is `CLAUDE.md` for behavioral guardrails. Everything else is cleanup of 7 stale files and a labeling pass on docs/README.md.
