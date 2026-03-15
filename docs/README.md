# Garden OS Docs Index

Status snapshot: 2026-03-15  
Purpose: single entry point for design docs and implementation specs.

## Status Legend
- `Committed`: tracked in git and ready for team reference.
- `Local draft`: present locally but not committed yet.
- `In progress`: expected to change while active prompt rounds finish.

## Core Design Docs (`docs/`)
| Document | One-line description | Status |
|---|---|---|
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Visual language, rendering rules, seasonal color/texture system, and direction selection. | Committed |
| [CAMPAIGN_DESIGN.md](./CAMPAIGN_DESIGN.md) | 12-chapter campaign structure tying mechanics, score targets, beats, and unlock cadence. | Committed |
| [CONCEPT_BOARD_COHESION.md](./CONCEPT_BOARD_COHESION.md) | Cohesion pass for art pillars and concept-board alignment with approved style direction. | Committed |
| [GAME_DESIGN_ANALYSIS.md](./GAME_DESIGN_ANALYSIS.md) | Strategic analysis of core loop, systems density, and product viability framing. | Committed |
| [GAME_DESIGN_CRITIQUE.md](./GAME_DESIGN_CRITIQUE.md) | Brutal risk audit with anti-boring redesign recommendations. | Committed |
| [GAME_FEEL.md](./GAME_FEEL.md) | Feedback/motion/audio/microinteraction spec for tasteful “juice” and accessibility. | Committed |
| [GARDEN_OS_STORY_BIBLE_PROMPT.md](./GARDEN_OS_STORY_BIBLE_PROMPT.md) | Story-bible prompt scaffolding for narrative iteration workflows. | Committed |
| [MARKETING_STRATEGY.md](./MARKETING_STRATEGY.md) | Steam/trailer/store-facing framing, tags, hooks, and messaging controls. | Committed |
| [PROGRESSION_SYSTEMS.md](./PROGRESSION_SYSTEMS.md) | Chapter-to-chapter and replay progression architecture without grind loops. | Committed |
| [REPLAYABILITY.md](./REPLAYABILITY.md) | Retention/replay systems, challenge framing, fixed-vs-variable design policy. | Committed |
| [SEASONAL_EVENT_SYSTEM.md](./SEASONAL_EVENT_SYSTEM.md) | Seasonal event taxonomy, triggers, effects, and commentary behavior. | Committed |
| [UI_GRAPHICAL_IMPROVEMENT_AUDIT.md](./UI_GRAPHICAL_IMPROVEMENT_AUDIT.md) | Prioritized UI/graphics improvement backlog for v2-to-v3 transition polish. | Local draft |
| [VOICE_BIBLE.md](./VOICE_BIBLE.md) | Character voice constraints, line style, and role boundaries for cast consistency. | Committed |
| [DOCUMENTATION_CATALOG.md](./DOCUMENTATION_CATALOG.md) | Prior doc inventory and categorization index. | Committed |
| [DOCUMENTATION_CATALOG.csv](./DOCUMENTATION_CATALOG.csv) | CSV export of the documentation catalog. | Committed |
| [MIGRATION-CONTRACT.md](./MIGRATION-CONTRACT.md) | Contract/migration expectations for data or system evolution. | Committed |
| [WORKSPACE-SCHEMA.md](./WORKSPACE-SCHEMA.md) | Workspace-level schema conventions and model references. | Committed |

## Design Subfolders
| Path | One-line description | Status |
|---|---|---|
| [garden-os-writers-room/README.md](./garden-os-writers-room/README.md) | Prompt-runner kit for creative/system passes (01–16). | Committed |
| [game-timeline/](./game-timeline/) | Time-based planning artifacts and sequencing references. | Committed |
| [launch-pack/](./launch-pack/) | External-facing launch prep docs and assets. | Committed |
| [garden-os-system-map.html](./garden-os-system-map.html) | Visual system map reference for architecture communication. | Committed |
| [garden-os-architecture-diagram.svg](./garden-os-architecture-diagram.svg) | Diagram of component relationships and data flow. | Committed |
| [system-topology.html](./system-topology.html) | Broader topology reference for stack/system understanding. | Committed |

## Canonical Specs (`specs/`)
| Spec | One-line description | Status |
|---|---|---|
| [PROMPT_CHAIN.md](../specs/PROMPT_CHAIN.md) | 10-prompt execution chain and round order for parallel agent production. | Committed |
| [NARRATIVE_SPEC.md](../specs/NARRATIVE_SPEC.md) | Chapter-by-chapter narrative implementation spec with trigger-tied beats. | Committed |
| [SEASON_ENGINE_SPEC.md](../specs/SEASON_ENGINE_SPEC.md) | Season state machine, interventions, draw rules, and carry-forward mechanics. | Committed |
| [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json) | Data payload for crop identities, constraints, and scoring parameters. | Committed |
| [SCORING_RULES.md](../specs/SCORING_RULES.md) | Deterministic scoring model, factor weights, and formula definitions. | Local draft |
| [PROGRESSION_SPEC.md](../specs/PROGRESSION_SPEC.md) | Full progression matrix across chapters, unlocks, and persistence systems. | Local draft |
| [CLAUDE-G1-workspace-schema.md](../specs/CLAUDE-G1-workspace-schema.md) | Workspace schema reference generated in earlier architecture phase. | Committed |
| [CLAUDE-G2-export-schema.md](../specs/CLAUDE-G2-export-schema.md) | Export schema reference for serialized workspace/season data. | Committed |
| [CLAUDE-G3-guide-engine.md](../specs/CLAUDE-G3-guide-engine.md) | Guide engine reference for tutorial/hint architecture. | Committed |
| [CLAUDE-G4-seasonal-tasks.md](../specs/CLAUDE-G4-seasonal-tasks.md) | Seasonal task framework and operational logic notes. | Committed |
| [V2_REUSE_AUDIT.md](../specs/V2_REUSE_AUDIT.md) | v2 prototype reuse vs rewrite audit for v3 build planning. | Local draft |

## Working Notes
- Active rounds currently running in parallel can update some specs after this snapshot.
- When Round 2+ outputs land, refresh this index status column first before merging.
