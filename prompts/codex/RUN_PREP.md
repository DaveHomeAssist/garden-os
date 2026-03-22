# Codex Prompt Status

Status: Active  
Last Updated: 2026-03-22

This file is the current "where are we now?" snapshot for the indexed Codex upgrade chain.
It replaces the earlier assumption-based run prep with the actual repo state as of today.

Primary source files checked:

- `prompts/codex/PROMPT_INDEX.md`
- `specs/UPGRADE_PHASES.md`
- `progress.md`
- `story-mode/package.json`
- `story-mode/src/**`

## Current Position

We are no longer at "Queue A not started."

The codebase is currently here:

- Phase 0A: complete enough to treat as landed
- Phase 0B: landed
- Phase 0C: landed
- Phase 0D: landed
- Phase 1A / 1B / 1C: landed in code, but still need cleaner runtime verification
- Phase 1D: partially scaffolded
- Phase 1E: landed in code, with placeholder tool behaviors still deferring deeper mechanics to 1G
- Phase 1G: not yet implemented as a full gameplay system
- Planner Mode: conceptually prioritized, scene-style groundwork landed, not yet a real selectable mode
- Let It Grow Phase 2+: not started in earnest

## Completed

These prompts are no longer the "next to run" queue because the corresponding work already exists in the repo.

### Phase 0 Foundation

1. `phase-0/0A-extract-input-system.md`
2. `phase-0/0B-centralize-state-store.md`
3. `phase-0/0C-decompose-main.md`
4. `phase-0/0D-asset-dispose-tracking.md`

Evidence in code:

- `story-mode/src/input/input-manager.js`
- `story-mode/src/game/store.js`
- `story-mode/src/game/game-init.js`
- `story-mode/src/game/phase-router.js`
- `story-mode/src/ui/ui-binder.js`
- `story-mode/src/scene/resource-tracker.js`

### Phase 1 Embodiment Base

1. `phase-1/1A-player-character-model.md`
2. `phase-1/1B-wasd-touch-movement.md`
3. `phase-1/1C-camera-follow.md`
4. `phase-1/1E-tool-equip-hud.md`

Evidence in code:

- `story-mode/src/scene/player-character.js`
- `story-mode/src/game/player-controller.js`
- `story-mode/src/ui/touch-stick.js`
- `story-mode/src/ui/tool-hud.js`
- updated `story-mode/src/scene/camera-controller.js`
- updated `story-mode/src/scene/garden-scene.js`
- updated `story-mode/src/ui/ui-binder.js`

What `1E` now gives us:

- bottom Let It Grow tool bar
- `hand`, `water`, `plant`, `harvest`, `protect`, `mulch`
- keyboard cycling via `1-6`, `Tab` / `Shift+Tab`, `[` / `]`
- click/tap selection
- tool-aware interaction routing and labels
- placeholder feedback for non-plant tools while deeper mechanics wait on `1G`

### Planning-vs-Story Visual Layer

This is not one of the indexed prompts, but it matters for status because it changes what the next product steps should be.

Landed:

- `story-mode/src/scene/scene-style.js`
- `story-mode/src/scene/scene-style.test.js`
- phase-driven scene style switching wired through:
  - `story-mode/src/scene/garden-scene.js`
  - `story-mode/src/ui/ui-binder.js`

This gives the project a real foundation for:

- flatter planner readability during planning/inspect
- richer story presentation during cutscenes
- more elevated harvest/reveal presentation

## Partial

These areas exist in scaffold or partial form, but should not yet be treated as finished prompt completions.

### Phase 1D — Proximity Interaction

Partial evidence:

- `story-mode/src/game/interaction.js`
- progress note:
  - `feat Add Let It Grow proximity interaction system scaffold`

Why this is still partial:

- the interaction system exists as a scaffold, but it is not yet clearly wired as a complete, validated player-facing mode
- integration tests still contain TODO notes around proximity/tool HUD work

### Phase 1G Dependency Reality

Current evidence:

- progress note:
  - `Phase 1E keeps tool state runtime-local in ui-binder.js; water/protect/mulch/harvest currently show tool-aware feedback and flashes, with deeper mechanics deferred to 1G`

What this means:

- tool selection now exists
- tool semantics are not fully implemented yet
- `1G` is now the correct next indexed gameplay prompt

### Planner Mode

Partial evidence:

- shared scoring engine already exists in `story-mode/src/scoring/*`
- planning-vs-story scene-style split now exists

Why this is still partial:

- title screen still exposes only Story Mode as active
- there is no real planner-mode boot path inside `story-mode`
- no dedicated planner reasoning UI has been integrated into Story Mode yet

### Verification / Build Confidence

Partial evidence:

- many syntax checks passed and are recorded in `progress.md`
- several targeted browser smokes succeeded earlier

Why this is still partial:

- `npm test` is not consistently completing in this shell
- `npm run build` / `vite build` has also stalled in this shell
- some verification is therefore "code landed" rather than "fully validated"

## Blocked

These are the next major indexed areas that are still blocked by missing systems.

### Phase 2 — NPC / Quest / Neighborhood

Still missing:

- `src/data/npcs.js`
- `src/game/quest-engine.js`
- `src/game/reputation.js`
- `src/scene/zone-manager.js`
- `src/scene/zones/`

Indexed prompts still blocked:

1. `phase-2/2A-npc-data-registry.md`
2. `phase-2/2D-quest-state-machine.md`
3. `phase-2/2F-dialogue-branching.md`
4. `phase-2/2G-reputation-system.md`
5. `phase-2/2H-zone-transition-system.md`
6. `phase-2/2I-neighborhood-zone.md`
7. `phase-2/2J-state-store-extensions.md`
8. `phase-2/2K-save-system-extensions.md`

### Phase 3 — Audio / Day-Night / Festivals

Still missing:

- `src/audio/`
- `src/game/festivals.js`

These should wait until Phase 2 is properly in place.

### Phase 4 — Inventory / Skills / Crafting

Still missing:

- `src/game/inventory.js`
- `src/game/skills.js`
- `src/game/crafting.js`

These are still future-phase systems, not ready for direct indexed prompt execution yet.

## Best Next Work

This is the actual next recommendation now, not the original Queue A.

### Queue A — Finish Phase 1 Properly

Run these next if the goal is staying on the indexed Story Mode -> Let It Grow path:

1. `phase-1/1D-proximity-interaction.md`
2. `phase-1/1G-realtime-tool-actions.md`

Why:

- Phase 0 is already landed
- 1A / 1B / 1C already pushed the repo into embodied movement
- 1E has now landed the tool HUD and selection layer
- 1D still needs to be treated as partial, and 1G is now the main missing gameplay-mechanics step before later Let It Grow systems

Suggested context packet:

- `story-mode/src/game/interaction.js`
- `story-mode/src/game/player-controller.js`
- `story-mode/src/input/input-manager.js`
- `story-mode/src/game/interaction.js`
- `story-mode/src/scene/garden-scene.js`
- `story-mode/src/scene/player-character.js`
- `story-mode/src/ui/ui-binder.js`
- `story-mode/src/ui/tool-hud.js`
- `story-mode/src/game/intervention.js`

### Queue B — Product Detour: Planner Mode

Run this branch next if the priority is product usefulness over strict prompt order.

Recommended work:

1. make Planner Mode a real title-screen mode
2. reuse Story Mode scoring inside a planner-specific interaction flow
3. add real garden-planning help surfaces:
   - selected-cell score explanation
   - limiting factor
   - recommended next move
   - crop swap suggestions

Why this detour is now reasonable:

- planning-vs-story scene presets already exist
- scoring already exists
- the repo needs a clean split between:
  - Story Mode
  - Planner Mode
  - Let It Grow / open-world later

## Root-Surface Prompts Still Runnable Now

These remain valid, but they are outside the Story Mode / Let It Grow chain.

### Planner HTML Surface

1. `phase-1b-explainable-scores.md`
2. `phase-1c-export-import.md`

Target file:

- `garden-planner-v4.html`

### Docs / Map Surface

1. `garden-os-system-map-prompt.md`
2. `garden-os-architecture-diagram-prompt.md`

## Validation Reality

In a normal local shell, the next clean checkpoint should be:

```bash
cd story-mode
npm test
npm run build
```

In this current shell environment, those commands have been unreliable or stalled, so repo status should be read as:

- implementation progress: real
- runtime confidence: partial

## Practical Recommendation

If the goal is Let It Grow implementation:

1. treat Phase 0 as done
2. treat 1A / 1B / 1C / 1E as done-in-code
3. run `1D` and `1G` next
4. validate outside this shell before opening Phase 2

If the goal is short-term product value:

1. pause the indexed chain
2. make Planner Mode real inside `story-mode`
3. keep Let It Grow Phase 2+ queued behind that

## Prompt Count Note

`PROMPT_INDEX.md` still undercounts the indexed prompt set.

- Indexed Codex prompts present: `30`
- Extra standalone Codex prompts present: `4`
- Index file itself: `1`
- Total Codex markdown files under `prompts/codex`: `35`
