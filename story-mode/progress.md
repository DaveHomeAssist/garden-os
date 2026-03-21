Original prompt: Build the Garden OS Story Mode cutscene and character animation layer with chapter intros, event reveals, harvest result scenes, animated 2D portraits, camera choreography, and mobile-friendly dialogue flow. Keep the game engine responsible for facts and the narrative layer responsible for presentation.

- Added Phase 2 engine work earlier: chapter rollover, real event draws, harvest journaling, crop growth stages.
- Current pass is replacing prototype narrative UI with the cutscene-machine + render-only dialogue panel architecture.
- Existing secondary UI like `event-card.js` and `harvest-reveal.js` may remain for intervention choice and score breakdown after cutscene playback.
- Playwright/browser automation is still unreliable in this environment due Chrome sandbox/GPU failure; use `npx vite build` as the hard gate and do local manual smoke tests in browser.
- Be careful with saved campaigns: only campaign data is persisted, so `main.js` must rebuild a fresh `SeasonState` from saved campaign chapter/season on continue.

Update 2026-03-21:
- Added `src/data/speakers.js`, `src/data/portraits.js`, `src/data/cutscenes.js`, and `src/game/cutscene-machine.js`.
- Replaced the old phase-specific dialogue helper with a render-only `createDialoguePanel()` implementation.
- `phase-machine.advance()` now returns structured result objects with narrative triggers instead of just mutating season state silently.
- `garden-scene` now exposes camera preset and mood APIs for cutscene playback.
- `main.js` now wires cutscene triggers, input gating, skip/advance/fast-forward, and uses chapter start cutscenes instead of the previous hardcoded intro overlay.
- Build verification passed: `npx vite build`.
- Remaining follow-up: local manual smoke test for queue interruption rules and mood persistence, since headless browser validation is still blocked in this environment.

Update 2026-03-21 keepsakes pass:
- Added canonical keepsake registry in `src/data/keepsakes.js`.
- Campaign state now persists `keepsakes`, and season state now stores the last resolved event plus newly earned keepsakes for the current chapter flow.
- Harvest scoring now exposes `yieldList` and `recipeMatches`, which are used to update pantry/recipes and evaluate keepsake triggers after harvest.
- `main.js` now awards canonical keepsakes for the first save, first crop in the first cell, chapter 8 review, Mom's Sauce in chapter 11+, block-party recipe completion, frost damage, and the Phillies failure approximation from the live event deck.
- `harvest-reveal.js` now shows recipe matches and newly earned keepsakes so unlocks are visible in the results flow.
- Note: some keepsake triggers are approximate against the current event deck wording. `first_frost_marker` keys off frost-themed events plus negative affected cells, and `onion_mans_scorecard` keys off a Phillies-themed non-positive event plus poor row performance.

Update 2026-03-21 intervention targeting pass:
- Intervention choice is no longer auto-targeted/random. `protect`, `mulch`, `companion_patch`, and `prune` now require an explicit cell click, while `swap` is a two-step pick flow.
- Added `getTargetableCells()` to `src/game/intervention.js` so the UI can request valid targets before applying an intervention.
- `garden-scene` now exposes persistent target highlighting via `setTargetableCells()` / `clearTargeting()` and keeps hover visuals constrained to valid target cells during targeting.
- `main.js` now owns an `interventionTargetState`, shows a dedicated targeting prompt sheet, blocks unrelated panel toggles during targeting, and only persists state after the target is confirmed and the event effect is resolved.
- `event-card.js` now explicitly tells the player that choosing an intervention type may require a follow-up cell pick.
- Validation: `npx vite build` passed after the targeting changes. The `develop-web-game` Playwright client also produced screenshots successfully, but full browser-tool validation is still blocked in this environment by the same Chrome sandbox / GPU crash when opening an interactive Playwright page.

Update 2026-03-21 mobile pass:
- Relaxed the global touch policy so sheets can scroll again: `html/body` now use `touch-action: manipulation`, while `#viewport` keeps `touch-action: none`.
- Bottom sheets now use touch scrolling (`-webkit-overflow-scrolling`, `overscroll-behavior`, `touch-action: pan-y`) so event cards, backpack, and bug reports behave better on phones.
- Enlarged touch targets for dismiss buttons, crop cards, intervention cards, and the mobile FAB cluster.
- Added mobile-specific layout rules for the HUD, toasts, pause menu, bug panel, and panel heights at <= 640px / 420px / 380px.
- Event cards now use reusable intervention-button classes and explicit “tap a card, then tap the highlighted bed cell” chips.
- Intervention targeting prompt now shows valid-target count, step count for swap, and touch-oriented copy rather than desktop-flavored instructions.
- Validation: `npx vite build` passed, and the `develop-web-game` screenshot capture still renders the HUD / cutscene / FAB layout cleanly after the responsive changes.

Update 2026-03-21 review-flow cleanup:
- Fixed a dead-feeling season-end path in `src/main.js`: after the harvest reveal closes, story mode now auto-consumes the passive `REVIEW` hop and goes straight into the season-complete transition trigger.
- This removes the extra Enter/Next presses that previously walked `HARVEST -> REVIEW -> TRANSITION` even though `REVIEW` had no dedicated screen of its own.
- Confirmed the current winter screenshot confusion is not crop carry-over: `story-mode` creates a fresh grid on rollover. Visible plants are always from the current season grid; the pale/gray look comes from the winter scene treatment and the specific crop mesh being rendered.
- Validation: `npx vite build` passed after the phase-flow patch.

Update 2026-03-21 winter readability pass:
- `garden-scene.js` now renders occupied winter plots as clearly dormant: frosted soil tint, desaturated crop tint, and reduced growth scale so they stop reading like active summer herbs under a dark filter.
- Winter occupied cells now intentionally look pale/frosted against the darker empty soil, which makes “occupied but dormant” legible at a glance.
- `main.js` phase helper copy now explicitly tells the player that pale plots in winter are dormant occupied cells.
- Validation: `npx vite build` passed after the winter visual pass.

Update 2026-03-21 commit phase removal:
- Removed the passive `COMMIT` phase from `story-mode` entirely. `Commit Plan` now advances directly from `PLANNING` into `EARLY_SEASON`.
- Updated phase order, phase labels, calendar/HUD logic, helper copy, and top-rail action labels to match the simplified flow.
- The top HUD still exposes an explicit action button, but the misleading `CONFIRM PLAN` phase label is gone.
- Validation: `npx vite build` passed after removing the commit phase.

Update 2026-03-21 dialogue/storyflow planning:
- Added an implementation-ready narrative rework spec at `docs/garden-os-writers-room/STORY_MODE_DIALOGUE_REWORK_SPEC.md`.
- The spec diagnoses the current repetition problem in `story-mode` reactive dialogue, especially the overuse of generic `Garden GURL <-> Critters` event exchanges.
- It defines speaker-role rules, seasonal voice distribution, event-family routing, authoring rules, and a 3-pass implementation plan.
- Recommended next content step: restructure `story-mode/src/data/cutscenes.js` before doing any prose-only polish.

Update 2026-03-21 dialogue structure pass:
- `phase-machine` event triggers now carry richer event context into the cutscene layer, including category, valence, severity, carry-forward effect, and raw deck commentary.
- `src/data/cutscenes.js` now builds dynamic `event_drawn` cutscenes from the live event deck commentary instead of always falling back to the same small set of generic event reaction scenes.
- Speaker selection is now routed by event family + season + valence, so weather / critter / neighbor / family / infrastructure beats stop defaulting to the same `Garden GURL <-> Critters` pairing every season.
- Static event scenes remain as fallback coverage, but dynamic event commentary now takes priority whenever the deck supplies character-specific lines.
- Validation: `npx vite build` passed. A Playwright smoke run still booted the chapter intro / planning scene and captured a clean screenshot after the refactor, though the client emitted one `ERR_CONNECTION_REFUSED` console artifact while running against the local preview server.

Update 2026-03-21 reactive dialogue cleanup:
- Trimmed the large static `event_drawn`, `intervention_used`, and `harvest_complete` scene banks down to lightweight fallbacks. The reactive variety now lives in dynamic builders instead of many overlapping static cutscenes.
- `main.js` now emits real `intervention_used` narrative triggers with intervention id, related event context, target summary, and target crop names, so intervention dialogue can finally vary at runtime instead of being dead data.
- `phase-machine` harvest triggers now include `yieldCount`, `yieldList`, and `recipeMatches`, allowing harvest scenes to react to recipe progress and not just letter grade.
- `cutscenes.js` now dynamically builds intervention reactions from the action + season + event family, and harvest reactions from grade + season + recipe progress, including a dedicated Mom's Sauce branch.
- Validation: `npx vite build` passed after the trigger/runtime changes. Playwright smoke still boots the game and captures the intro/planning scene without breaking the dialogue panel.

Update 2026-03-21 scenery refinement from real-bed reference:
- Tuned `src/scene/scenery.js` toward the real garden silhouette instead of the earlier generic yard backdrop.
- Replaced the chunkier fake porch/wall mass with a flatter house-wall backdrop and siding treatment so the background reads more like the real bed reference and less like a blocking foreground object.
- Kept the gravel work area / house-presence direction from the earlier scene pass, but reduced the amount of geometry fighting the camera.
- Validation: `npx vite build` passed after the scenery refinement. Browser smoke in this environment remains noisy, so build stayed the hard gate.

Update 2026-03-21 front-of-bed camera rebuild:
- Reoriented `story-mode` so the default camera and all narrative camera presets begin from the front/access side of the bed looking back toward the house wall, matching the real garden layout instead of starting from behind the trellis.
- Updated `src/scene/camera-controller.js` to use front-facing orbit defaults too, so touch/mouse camera control no longer snaps the player back to the old rear view on boot.
- Simplified `src/scene/scenery.js` by removing the extra generic rowhouse block and keeping the flatter house wall / porch / neighbor composition behind the bed as the actual backdrop.
- Validation: `npx vite build` passed, and a fresh Playwright screenshot at `story-mode/output/web-game/shot-0.png` confirmed the opening frame now shows the front guard in the foreground and the house behind the garden.

Update 2026-03-21 scene-orientation correction:
- The first front-yard pass still read wrong in play because the house wall mass sat too close to the frame and still looked like it belonged on the access side during cutscenes.
- Pushed the house wall, porch, and neighbor structures farther back behind the trellis plane in `src/scene/scenery.js`, and tightened the cutscene/default camera presets in `src/scene/garden-scene.js` so the bed stays centered and the wall reads unmistakably as the back side of the garden.
- Validation: `npx vite build` passed again, and the refreshed screenshot in `story-mode/output/web-game/shot-0.png` now shows the wall running behind the trellis rather than beside the access path.
