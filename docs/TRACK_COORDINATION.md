# Garden OS · Track Coordination Charter

How the planner intelligence track and the game expansion track share resources and stay aligned as they evolve in parallel.

Last verified: 2026-04-20
Companion docs: PLANNER_PHASE_TIMELINE.md · GAME_PHASE_TIMELINE.md · specs/UPGRADE_PHASES.md

---

## 1. Purpose

Garden OS is two products growing out of one codebase. The planner is a deterministic scoring and reasoning tool. The game (Let It Grow, Story Mode) is a playable world that consumes the same scoring engine, crop data, and save format.

Without a coordination charter, the two tracks drift. Shared specs rename fields unilaterally, scoring contracts evolve in incompatible ways, save formats lose backward compatibility. This doc defines the rules that prevent that.

---

## 2. The Two Tracks at a Glance

| Dimension | Planner Track | Game Track |
|-----------|---------------|------------|
| Primary surface | garden-planner-v4.html, phase4-demo.html | story-mode/, Let It Grow entry points |
| Primary user | Gardener planning a real plot | Player progressing through narrative |
| Default cycle | 3 to 5 weeks per phase | 6 to 10 weeks per phase |
| Data footprint | Small, mostly derived | Large, content heavy |
| Change risk | Scoring contract, reasoner determinism | Save migration, scene dispose, content balance |
| Source of truth | PLANNER_PHASE_TIMELINE.md | GAME_PHASE_TIMELINE.md, specs/UPGRADE_PHASES.md |

They are separate release trains with shared track infrastructure.

---

## 3. Shared Resources

### 3.1 Data Specs

Files under `specs/` and top level JSON owned jointly. Any change to these requires a cross track review (see Section 6).

| Resource | Purpose | Owner of schema | Consumers |
|----------|---------|-----------------|-----------|
| specs/CROP_SCORING_DATA.json | Intrinsic crop fields (sun, trellis, harvest, maintenance) | Planner track | Both |
| specs/SCORING_RULES.md | Canonical scoring logic documentation | Planner track | Both |
| scoring-api.json | External contract for scoring output | Planner track | Both + third party |
| crop-roster.json | Runtime crop registry used by both planner and game | Planner track | Both |
| specs/SKILL_TREE.json | Skill XP tables and buff definitions | Game track | Both (planner may show skill effect on score) |
| specs/CRAFTING_RECIPES.json | Craftable items and material costs | Game track | Game only today, planner consumer possible post v1.0 |
| specs/QUEST_DECK.json | Quest content and branching | Game track | Game only |
| specs/WORLD_MAP.json | Zones, gates, connections | Game track | Game only today, planner bed context post v1.0 |
| pest-profiles.json | Pest data and treatments | Shared | Both |
| achievement-registry.json | Achievement definitions | Game track | Both |
| gos-schema.json | Top level schema declarations | Shared | Both |

### 3.2 Code Modules

| Module / current location | Role | Owner | Change rule |
|--------|------|-------|-------------|
| `garden-planner-v4.html` scoring functions and `story-mode/src/scoring/{cell-score,bed-score,score-explain}.js` | Canonical scoring pipeline | Planner track | Game track may add inputs through additive branches. Signature frozen after planner Phase 5. |
| `garden-planner-v4.html` derive helpers (future extraction target: `src/planner/derive.js`) | Zone and trait derivation | Planner track | Pure functions. Game may call but not modify. |
| `garden-planner-v4.html` reasoning snapshot and inspect helpers (future extraction target: `src/planner/reasoner.js`) | Fit assessment and suggestions | Planner track | Same rule as derive helpers. |
| `story-mode/src/game/store.js` | State store (dispatch, reducer, notify) | Game track | Planner may add action types through additive registration. |
| `story-mode/src/game/state.js` | Canonical state shape | Game track | Extensions additive. Field rename requires both track sign off. |
| `story-mode/src/game/save.js` | Save serialization and migration | Game track | See Section 5. |
| Current per-track inspector UI in `garden-planner-v4.html` and `story-mode/src/ui/*` (future shared target: `src/ui/inspect-panel.js`) | Shared inspector pattern | Shared | Adapter pattern. Each track owns its own adapters. |
| `story-mode/src/game/intervention.js` | Tool actions, crop mutations | Game track | Planner may read, not mutate. |
| `story-mode/src/scene/*` | Three.js scenes, zone manager, bed model | Game track | Planner does not depend. |

Planner extraction targets such as `src/planner/derive.js`, `src/planner/reasoner.js`, and `src/ui/inspect-panel.js` are planned module boundaries, not current repo paths.

### 3.3 UI Patterns

| Pattern | Owner | Notes |
|---------|-------|-------|
| Inspector panel | Shared (SHARED_INSPECTOR_PANEL.md) | Renderer generic. Adapters live in each track. |
| Grid view | Shared | Planner uses it standalone, game uses via bed-model. |
| Score breakdown | Planner track | Game embeds as a sibling of gameplay HUD. |
| Dialogue panel | Game track | Planner does not render dialogue. |
| World map | Game track | Planner does not render world map. |

### 3.4 Save Format

One save file, two namespaces.

```
{
  "version": { "save": 4, "planner": 2, "game": 4 },
  "planner": { ...planner owned fields },
  "game":    { ...game owned fields },
  "shared":  { ...fields both tracks read (plot, crops placed, season) }
}
```

Rules:

1. Each track increments its own version independently.
2. Fields inside `planner` are invisible to game code and vice versa.
3. `shared` requires cross track review for any schema change.
4. Loader ignores unknown fields inside either namespace to allow forward compatibility between tracks at slightly different versions.

---

## 4. Ownership Matrix

Ownership means "writes the spec, reviews the PRs, decides on breaking changes." Either track may still contribute code.

| Area | Primary owner | Secondary reviewer |
|------|---------------|---------------------|
| Scoring engine numeric output | Planner track | Game track |
| Reasoning output (findings, suggestions) | Planner track | Game track (consumes for tutorial content) |
| Save format root shape | Game track | Planner track |
| `shared` save namespace | Joint | Both sign off |
| Crop roster and scoring data | Planner track | Game track (adds biome specific crops) |
| Quests, NPCs, world map | Game track | Planner track (none) |
| Skill buffs that touch scoring | Game track | Planner track (sign off required on scoring effect) |
| Inspector adapters | Whichever track uses the adapter | N/A |

---

## 5. Change Propagation Protocol

Three change tiers. The friction scales with blast radius.

### Tier 1 — Additive (low friction)

- New field on `planner` or `game` save namespace.
- New crop added to crop-roster.json without renaming existing fields.
- New trait added to deriveTraits.
- New finding kind added to reasoner output.
- New action registered on the store.
- New reducer case.

Rule: one track owner approval. Other track notified via commit message tag `[cross-track:additive]`.

### Tier 2 — Backward Compatible Schema Evolution (medium friction)

- New field in `shared` save namespace.
- New optional parameter on scoring function.
- New optional parameter on reasoner function.
- Deprecation marker added to an existing field (field remains functional).

Rule: both track owners approve. Migration path documented. Both timelines' ship gate checklists apply.

### Tier 3 — Breaking (high friction)

- Rename or remove a field in `shared`, `crop-roster.json`, `scoring-api.json`, or `gos-schema.json`.
- Change the return shape of a scoring or reasoner function.
- Change the save file root shape.
- Change the inspector panel adapter contract.

Rule: both track owners approve in writing (commit message, Linear ticket, or doc entry). Migration path includes:
1. Read side accepts both old and new for at least one phase.
2. Write side emits both old and new for at least one phase.
3. Old path removed in a named cleanup phase after both tracks consume the new path.
4. Rollback plan tested before removal.

No Tier 3 change starts without a migration entry in both timeline docs.

---

## 6. Coordination Mechanisms

### 6.1 Weekly Cadence

Every Monday, one track coordination pass:

- Review change tier tags on prior week commits
- Flag any Tier 2 or Tier 3 change missing sign off
- Update risk ledger in active phase docs

### 6.2 Phase Boundary Review

When either track approaches ship gate:

- Run the full regression suite from both tracks, not one
- Verify save round trip with a save produced by the other track's prior phase
- Update cross track coordination matrix (Section 3) with any new shared resource introduced
- Write a cross track handoff note in today.csv

### 6.3 Quarterly Architecture Review

Every 3 months, reassess:

- Whether any owned module has grown into shared territory
- Whether any Tier 3 change is queued and should be scheduled against both timelines
- Whether the ownership matrix needs rebalancing
- Whether `shared` save namespace has bloated and should be split

### 6.4 Conflict Resolution

If both tracks disagree on a Tier 3 change:

1. Document both positions in the active cross track review note.
2. Propose a migration path that satisfies both tracks even at the cost of a longer deprecation window.
3. If still deadlocked, defer the change to the next quarterly review. Neither side ships the change until resolved.

---

## 7. Versioning Strategy

Three version streams, tracked independently.

| Stream | Example | Increment rule |
|--------|---------|----------------|
| Planner phase | v0.4, v0.5, v0.6 | New capability ships |
| Game phase | v0.4, v1.0, v1.1 | Playable release |
| Save root | 4, 5, 6 | `shared` namespace changes or root shape changes |

Planner phases and game phases do not share numbers. They may coincidentally overlap (both are at v0.4 today) but drift over time.

Save root version increments only on `shared` changes. Per track namespace versions increment independently inside each namespace object.

---

## 8. Release Cadence and Sync Points

Planner releases fast. Game releases slow. They meet at deliberate sync points.

### 8.1 Pre v1.0 (now through mid 2026)

- Planner: Phase 4 (shipping), Phase 5 (scoring integration)
- Game: Phase 4 (inventory and skills), Phase 5 (open world, v1.0)
- Sync point: game Phase 5 ship (v1.0). Planner Phase 5 must be stable or the game's scoring display breaks.

### 8.2 v1.0 to v1.3 (mid 2026 through late 2026)

- Planner: Phase 6 (temporal reasoning), Phase 7 (multi plot), Phase 8 (export)
- Game: Phase 6 (narrative), Phase 7 (economy), Phase 8 (creator tools)
- Sync point: planner Phase 6 introduces season field to `shared`. Game Phase 6 consumes season field for branching unlocks.
- Sync point: planner Phase 7 multi plot concepts align with game Phase 5 multi bed storage (which shipped earlier).

### 8.3 Post v1.3 (2027)

- Tracks can fork more aggressively. Planner may explore third party integrations. Game may explore multiplayer or live ops.
- Re evaluate ownership matrix at that point. A third track may emerge (for example, a content pipeline track).

---

## 9. Evolution Themes

Where the tracks converge and where they diverge over time.

### 9.1 Convergence Themes

Reasoning becomes gameplay. Planner Phase 4 reasoning output appears in game dialogue as NPC advice. By game Phase 6, NPCs quote planner findings verbatim for tutorial moments.

Skill buffs become scoring inputs. Game Phase 4 skills modify scoring in simple ways. By planner Phase 7, the reasoner explicitly cites active buffs as findings ("your composting skill boosts this cell").

Content packs load shared data. Game Phase 8 creator tools produce packs that extend crop-roster.json. Planner reads these packs in the same pass, so new crops show up in the planner without a separate import.

### 9.2 Divergence Themes

Game expands in content (quests, zones, NPCs). Planner expands in analytics (history, export, API). Neither needs the other's expansion.

Planner stays single file friendly for embedding elsewhere. Game grows into a multi module Three.js app. The source tree reflects this: `garden-planner-v4.html` stays self contained, `story-mode/` has its own bundler pipeline.

---

## 10. Failure Modes and Mitigations

| Failure | How it shows up | Mitigation |
|---------|------------------|------------|
| Track A ships Tier 3 change without sign off | Other track breaks on next rebuild | Revert requirement in change protocol. Weekly cadence catches this within 7 days. |
| Scoring contract drifts | Numeric scores differ between planner and game for the same plot | Shared snapshot test fixture in `tests/cross-track-scoring.test.js`. Must pass on every phase ship. |
| Save migration breaks older saves | Player opens v0.8 save on v1.1 build and crashes | Both tracks run `tests/save-compat.test.js` against a corpus of saves from every shipped version. |
| Crop roster race condition | Planner references crop that game hasn't added yet | Crop roster is additive only. Missing crop returns a stub with a logged warning, never throws. |
| Inspector adapter contract drift | Game adapter renders broken panel on planner screen | Adapter interface exported from shared module. TypeScript style JSDoc typedef enforces shape. |

---

## 11. Cross Track Test Infrastructure

Living set of tests that neither track can ship without.

| Test file | Asserts |
|-----------|---------|
| tests/cross-track-scoring.test.js | Numeric scoring unchanged across both tracks for fixture plots |
| tests/save-compat.test.js | Saves from every shipped version load on current build without data loss |
| tests/reasoner-determinism.test.js | Reasoner produces identical output for identical inputs across 100 iterations |
| tests/crop-roster-integrity.test.js | crop-roster.json loads without missing fields for every crop referenced anywhere in specs |
| tests/inspector-adapter-contract.test.js | Every registered adapter returns the standard shape |

These run in both track CI pipelines. A red test in cross track suite blocks both trains.

---

## 12. Ownership and Escalation

Today the project is solo, so "track owner" is you wearing two hats. When it becomes a team:

- Planner track owner: approves scoring, reasoning, derivation changes
- Game track owner: approves save, scene, content changes
- Architecture owner (this doc): approves ownership matrix and Tier 3 migrations

Until the team grows, treat the owner roles as distinct mental modes. A Tier 3 change requires literally writing out both positions in a doc comment before acting on it. That friction is the feature.

---

## 13. Living Document

This charter evolves with the tracks. Review and revise:

- At every phase ship (both tracks)
- At each quarterly architecture review
- Any time a Tier 3 change lands

Keep the ownership matrix in Section 3 and the failure modes in Section 10 current. Stale entries are worse than missing ones.

---

## Documentation Maintenance

Issues: garden-os/docs/UI_ISSUES_TABLE.html
Session log: /Users/daverobertson/Desktop/Code/90-governance/docs/today.csv
Related:
- garden-os/docs/PLANNER_PHASE_TIMELINE.md
- garden-os/docs/GAME_PHASE_TIMELINE.md
- garden-os/specs/UPGRADE_PHASES.md
- garden-os/docs/SHARED_INSPECTOR_PANEL.md
