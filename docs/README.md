# Garden OS Docs Index

Status snapshot: 2026-03-16
Purpose: single entry point for design docs, implementation specs, and canonical source-of-truth references.

## Status Legend
- `Canonical`: source of truth — if code and doc disagree, the doc wins.
- `Committed`: tracked in git and ready for reference.
- `Active`: under active development or maintenance.
- `Scaffolding`: prompt-runner or planning framework, not a final deliverable.
- `Historical`: reference only, not actively maintained.

## Source-of-Truth Documents

These are canonical. Do not duplicate their content elsewhere — point to them.

| Document | Domain | Location |
|---|---|---|
| [CLAUDE.md](../CLAUDE.md) | Agent behavior & constraints | Root |
| [gos-schema.json](../gos-schema.json) + [SCHEMA.md](../SCHEMA.md) | Data model | Root |
| [SCORING_RULES.md](../specs/SCORING_RULES.md) | Scoring algorithm | specs/ |
| [SEASON_ENGINE_SPEC.md](../specs/SEASON_ENGINE_SPEC.md) | Season engine state machine | specs/ |
| [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json) | Crop definitions & factions | specs/ |
| [DIALOGUE_ENGINE.json](../specs/DIALOGUE_ENGINE.json) | Character dialogue triggers | specs/ |
| [EVENT_DECK.json](../specs/EVENT_DECK.json) | Event card definitions | specs/ |
| [VOICE_BIBLE.md](./VOICE_BIBLE.md) | Character voice & tone | docs/ |
| [HANDOFF.md](./HANDOFF.md) | AI project intake (full context) | docs/ |

## Core Design Docs (`docs/`)

| Document | One-line description | Status |
|---|---|---|
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Visual language, rendering rules, seasonal color/texture system. | Committed |
| [CAMPAIGN_DESIGN.md](./CAMPAIGN_DESIGN.md) | 12-chapter campaign structure tying mechanics, score targets, and beats. | Committed |
| [CONCEPT_BOARD_COHESION.md](./CONCEPT_BOARD_COHESION.md) | Cohesion pass for art pillars and concept-board alignment. | Committed |
| [GAME_DESIGN_ANALYSIS.md](./GAME_DESIGN_ANALYSIS.md) | Strategic analysis of core loop, systems density, and viability. | Committed |
| [GAME_DESIGN_CRITIQUE.md](./GAME_DESIGN_CRITIQUE.md) | Brutal risk audit with anti-boring redesign recommendations. | Committed |
| [GAME_FEEL.md](./GAME_FEEL.md) | Feedback/motion/microinteraction spec for tasteful juice. | Committed |
| [MARKETING_STRATEGY.md](./MARKETING_STRATEGY.md) | Steam/trailer/store-facing framing, tags, hooks. | Committed |
| [PROGRESSION_SYSTEMS.md](./PROGRESSION_SYSTEMS.md) | Progression architecture without grind loops. | Committed |
| [REPLAYABILITY.md](./REPLAYABILITY.md) | Retention/replay systems and challenge framing. | Committed |
| [SEASONAL_EVENT_SYSTEM.md](./SEASONAL_EVENT_SYSTEM.md) | Seasonal event taxonomy, triggers, effects, and commentary. | Committed |
| [VOICE_BIBLE.md](./VOICE_BIBLE.md) | Character voice constraints and role boundaries. | Canonical |
| [MIGRATION-CONTRACT.md](./MIGRATION-CONTRACT.md) | Schema migration contract and forward-compat policy. | Committed |
| [UI_GRAPHICAL_IMPROVEMENT_AUDIT.md](./UI_GRAPHICAL_IMPROVEMENT_AUDIT.md) | Prioritized UI/graphics improvement backlog. | Active |
| [HANDOFF.md](./HANDOFF.md) | Comprehensive AI handoff document. | Canonical |
| [active-hosted-urls.md](./active-hosted-urls.md) | Live deployment audit — all URLs, nav structure. | Active |
| [DOCUMENTATION_AUDIT_2026-03-16.md](./DOCUMENTATION_AUDIT_2026-03-16.md) | Documentation synthesis and source-of-truth audit. | Committed |

## Design Subfolders

| Path | One-line description | Status |
|---|---|---|
| [garden-os-writers-room/](./garden-os-writers-room/) | Prompt-runner kit for creative/system passes (01–16). | Scaffolding |
| [game-timeline/](./game-timeline/) | Time-based planning artifacts and sprint scaffolding. | Scaffolding |
| [launch-pack/](./launch-pack/) | External-facing launch prep (HN, Reddit, diagram spec). | Committed |
| [garden-os-architecture-diagram.svg](./garden-os-architecture-diagram.svg) | Component relationships and data flow diagram. | Committed |

## Canonical Specs (`specs/`)

| Spec | One-line description | Status |
|---|---|---|
| [SCORING_RULES.md](../specs/SCORING_RULES.md) | Deterministic scoring model, factor weights, and formulas. | Canonical |
| [SEASON_ENGINE_SPEC.md](../specs/SEASON_ENGINE_SPEC.md) | Season state machine, interventions, draw rules, carry-forward. | Canonical |
| [NARRATIVE_SPEC.md](../specs/NARRATIVE_SPEC.md) | Chapter-by-chapter narrative with trigger-tied beats. | Canonical |
| [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json) | Crop identities, constraints, and scoring parameters. | Canonical |
| [DIALOGUE_ENGINE.json](../specs/DIALOGUE_ENGINE.json) | Character lines keyed by trigger ID (80+ triggers). | Canonical |
| [DIALOGUE_SYSTEM.md](../specs/DIALOGUE_SYSTEM.md) | Dialogue orchestration, speaking order, timing rules. | Committed |
| [EVENT_DECK.json](../specs/EVENT_DECK.json) | 40+ event cards with modifiers and conditions. | Canonical |
| [PROGRESSION_SPEC.md](../specs/PROGRESSION_SPEC.md) | Progression matrix across chapters, unlocks, persistence. | Committed |
| [UI_SPEC.md](../specs/UI_SPEC.md) | Complete UI layout, components, and interaction model. | Committed |
| [PROMPT_CHAIN.md](../specs/PROMPT_CHAIN.md) | 10-prompt execution chain for parallel agent production. | Scaffolding |
| [V2_REUSE_AUDIT.md](../specs/V2_REUSE_AUDIT.md) | v2 prototype reuse vs rewrite audit for v3 planning. | Historical |
| [CLAUDE-G1–G4](../specs/) | Earlier schema/engine generation artifacts. | Historical |

## Other

| Path | One-line description | Status |
|---|---|---|
| [audit/validate-before-commit.md](../audit/validate-before-commit.md) | Pre-commit QA checklist for v4.3. | Active |
| [codex-prompts/](../codex-prompts/) | Implementation task specs for Phase 1B, 1C, system map, diagram. | Committed |
| [archive/](../archive/) | Versioned HTML snapshots (v1–v7) and obsolete planning docs. | Historical |
