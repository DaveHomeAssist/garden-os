# Agent Prompt Index

> Quick reference for all Codex and Claude agent prompts organized by phase.
> See `specs/UPGRADE_PHASES.md` for the full upgrade plan.

## How to Use

- **Codex agents**: Self-contained code tasks. Feed the prompt + referenced source files. Agent produces working code.
- **Claude agents**: Design, content authoring, integration testing, and cross-system reasoning. Agent reads codebase, produces specs or tests.

## Phase 0 — Foundation Hardening

| Task | Agent | Prompt |
|------|-------|--------|
| 0A. Extract Input System | Codex | `codex-prompts/phase-0/0A-extract-input-system.md` |
| 0B. Centralize State Store | Codex | `codex-prompts/phase-0/0B-centralize-state-store.md` |
| 0C. Decompose main.js | Codex | `codex-prompts/phase-0/0C-decompose-main.md` |
| 0D. Asset Dispose Tracking | Codex | `codex-prompts/phase-0/0D-asset-dispose-tracking.md` |
| 0E. Integration Test Harness | Claude | `claude-prompts/phase-0/0E-integration-test-harness.md` |

## Phase 1 — Free-Roam Garden Loop (v0.1)

| Task | Agent | Prompt |
|------|-------|--------|
| 1A. Player Character Model | Codex | `codex-prompts/phase-1/1A-player-character-model.md` |
| 1B. WASD/Touch Movement | Codex | `codex-prompts/phase-1/1B-wasd-touch-movement.md` |
| 1C. Camera Follow System | Codex | `codex-prompts/phase-1/1C-camera-follow.md` |
| 1D. Proximity Interaction | Codex | `codex-prompts/phase-1/1D-proximity-interaction.md` |
| 1E. Tool Equip HUD | Codex | `codex-prompts/phase-1/1E-tool-equip-hud.md` |
| 1F. Mode Selector | Claude | `claude-prompts/phase-1/1F-mode-selector.md` |
| 1G. Real-Time Tool Actions | Codex | `codex-prompts/phase-1/1G-realtime-tool-actions.md` |
| 1H. Integration Testing | Claude | `claude-prompts/phase-1/1H-phase1-integration-testing.md` |

## Phase 2 — NPC + Quest System (v0.2)

| Task | Agent | Prompt |
|------|-------|--------|
| 2A. NPC Data Registry | Codex | `codex-prompts/phase-2/2A-npc-data-registry.md` |
| 2B. NPC Portrait Artwork | Claude | `claude-prompts/phase-2/2B-npc-portrait-artwork.md` |
| 2D. Quest State Machine | Codex | `codex-prompts/phase-2/2D-quest-state-machine.md` |
| 2E. Quest Data (13 quests) | Claude | `claude-prompts/phase-2/2E-quest-data.md` |
| 2F. Dialogue Branching | Codex | `codex-prompts/phase-2/2F-dialogue-branching.md` |
| 2G. Reputation System | Codex | `codex-prompts/phase-2/2G-reputation-system.md` |
| 2H. Zone Transition System | Codex | `codex-prompts/phase-2/2H-zone-transition-system.md` |
| 2I. Neighborhood Zone | Codex | `codex-prompts/phase-2/2I-neighborhood-zone.md` |
| 2J. State Store Extensions | Codex | `codex-prompts/phase-2/2J-state-store-extensions.md` |
| 2K. Save System Extensions | Codex | `codex-prompts/phase-2/2K-save-system-extensions.md` |
| 2L. Integration Testing | Claude | `claude-prompts/phase-2/2L-phase2-integration-testing.md` |

## Phase 3 — Seasonal Enhancements (v0.3)

| Task | Agent | Prompt |
|------|-------|--------|
| 3A. Audio Manager | Codex | `codex-prompts/phase-3/3A-audio-manager.md` |
| 3B. Ambient Sound Design | Claude | `claude-prompts/phase-3/3B-ambient-sound-design.md` |
| 3C. Day/Night Cycle | Codex | `codex-prompts/phase-3/3C-day-night-cycle.md` |
| 3D. Monthly Event Rotation | Codex | `codex-prompts/phase-3/3D-monthly-event-rotation.md` |
| 3E. Festival System | Codex | `codex-prompts/phase-3/3E-festival-system.md` |
| 3I. Integration Testing | Claude | `claude-prompts/phase-3/3I-phase3-integration-testing.md` |

## Phase 4 — Inventory + Skills (v0.4)

| Task | Agent | Prompt |
|------|-------|--------|
| 4A. Inventory System | Codex | `codex-prompts/phase-4/4A-inventory-system.md` |
| 4B. Inventory UI | Codex | `codex-prompts/phase-4/4B-inventory-ui.md` |
| 4C. Skill Tree Engine | Codex | `codex-prompts/phase-4/4C-skill-tree-engine.md` |
| 4D. Skill Tree Spec | Claude | `claude-prompts/phase-4/4D-skill-tree-spec.md` |
| 4F. Crafting System | Codex | `codex-prompts/phase-4/4F-crafting-system.md` |
| 4G. Crafting Recipes Spec | Claude | `claude-prompts/phase-4/4G-crafting-recipes-spec.md` |
| 4I. Tool Durability | Codex | `codex-prompts/phase-4/4I-tool-durability.md` |
| 4M. Integration Testing | Claude | `claude-prompts/phase-4/4M-phase4-integration-testing.md` |

## Phase 5 — Open World Expansion (v1.0 Prep)

| Task | Agent | Prompt |
|------|-------|--------|
| 5A. World Map Data | Claude | `claude-prompts/phase-5/5A-world-map-data.md` |
| 5C. Zone Gate Logic | Codex | `codex-prompts/phase-5/5C-zone-gate-logic.md` |
| 5E. Biome Crops | Claude | `claude-prompts/phase-5/5E-biome-crops.md` |
| 5F. Foraging Mechanic | Codex | `codex-prompts/phase-5/5F-foraging-mechanic.md` |
| 5G. Expanded Grid | Codex | `codex-prompts/phase-5/5G-expanded-grid.md` |
| 5J. Expanded Quest Deck | Claude | `claude-prompts/phase-5/5J-expanded-quest-deck.md` |
| 5K. Integration Testing | Claude | `claude-prompts/phase-5/5K-phase5-integration-testing.md` |

## Summary

| | Codex Prompts | Claude Prompts | Total |
|--|--------------|----------------|-------|
| Phase 0 | 4 | 1 | 5 |
| Phase 1 | 5 | 2 | 7 |
| Phase 2 | 6 | 3 | 9 |
| Phase 3 | 3 | 2 | 5 |
| Phase 4 | 4 | 3 | 7 |
| Phase 5 | 3 | 3 | 6 |
| **Total** | **25** | **14** | **39** |
