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

Update 2026-03-21 Calvin opener visibility fix:
- Chapter 1's `sheepdog-run` cue now uses a bed-to-access diagonal path that stays in the visible middle of the `chapter-intro` frame instead of running along the lower edge under the dialogue box.
- After the first opener capture still missed him, moved Calvin's cue start even farther into the center-left soil area and increased the sheepdog scale again so the very first intro frame already contains him.
- Reworked the chapter 1 opener into two explicit Calvin cues: `sheepdog-bed` on the narrator beat so Calvin is visibly sitting in the bed, then `sheepdog-run` on GURL's line so she is yelling at an actual on-screen dog instead of an off-screen reference.
- Added a floating Calvin thought bubble to the `sheepdog-bed` hold cue so the opener still reads clearly even in the wide chapter-intro camera where the dog model alone can get visually lost against the bed.
- Extended the opener cue duration so Calvin remains on screen through the first line exchange instead of vanishing before GURL calls him out.
- `garden-scene.playSceneCue()` now fully resets Calvin's mesh opacity, dust puff pool, tongue visibility, and fade state before every run, so a prior fade-out cannot leave him effectively invisible on the next trigger.
- Slightly increased the sheepdog scale for readability in the wide intro framing.

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

Update 2026-03-21 season-opening sheepdog animation:
- Added `sceneCue: 'sheepdog-run'` to season-opening intro beats in `src/data/cutscenes.js` and surfaced `sceneCue` through the cutscene machine UI state.
- Added a visible sheepdog run overlay to `src/ui/dialogue-panel.js` / `assets/css/theme.css` so the intro beat gets a readable cross-screen motion pass even when 3D scene animation is subtle.
- Kept a matching in-scene sheepdog cue path in `src/scene/garden-scene.js`, but the dialogue-layer animation is now the reliable presentation layer for the opening-season beat.
- Validation: `npx vite build` passed, and a fresh screenshot at `story-mode/output/web-game/shot-0.png` now shows the sheepdog crossing during the opening narration.

Update 2026-03-21 in-scene sheepdog rebuild:
- Removed the dialogue-layer sheepdog overlay entirely from `src/ui/dialogue-panel.js` and `assets/css/theme.css`. The season-opening dog beat is now scene-only.
- Rebuilt the sheepdog in `src/scene/garden-scene.js` as an articulated world actor with a shadow blob, torso/head/tail pivots, and four two-segment legs animated procedurally during the run.
- Season-opening narrator beats now use a dedicated `chapter-intro` camera preset so the dog reads in the opening frame without covering the bed UI.
- Validation: `npx vite build` passed, and Playwright capture against the preview build shows the real in-scene sheepdog in `story-mode/output/web-game/shot-0.png`.

Update 2026-03-21 winter review usability pass:
- `story-mode` already had the winter review port in place, but the overlay behaved like another dead screen on laptop-height viewports because the action row could fall below the fold.

Update 2026-03-27 Phase 0 baseline check:
- Verified `story-mode` production build passes from the current working tree with `npm run build`.
- Verified `node --check src/ui/ui-binder.js` passes, so the earlier duplicate `zoneManager` parse blocker is no longer present in the current tree.
- Confirmed `src/game/save.test.js` already contains the intended localStorage teardown ordering fix (`clear()` before `vi.unstubAllGlobals()`), so the code side of the save-harness repair appears to be landed.
- Full `vitest` runs did not return usable output in this shell, so suite-level verification is still outstanding and should be rerun in a cleaner test shell before declaring Phase 0 fully complete.
- Did not edit the root docs because `CLAUDE.md`, `IMPLEMENTATION_PLAN.md`, and `STATUS_CHECK.md` were already dirty in the repo; treat those as in-progress user-owned changes and align them only after confirming the intended working copy.

TODO / next-agent suggestions:
- Re-run `npx vitest run src/game/save.test.js` and full `npx vitest run` in a shell that produces deterministic output; capture exact pass/fail counts.
- Once tests are confirmed, update the already-dirty root docs to reflect the now-green build baseline and the `story-mode/` toolchain reality.
- After Phase 0 is explicitly closed, take only one new feature slice next: planner What-If / Simulate mode.

Update 2026-03-22 scene/UI polish pass from live screenshot baseline:
- Removed the clothesline wire + hanging towel from `src/scene/scenery.js` while keeping the poles. In the current camera framing they were reading as stray debug geometry across the yard.
- Reworked row labels in `src/scene/bed-model.js` into darker pill-backed sprites with brighter text and stronger opacity so `Back (Wall)` / `Front (Access)` remain readable against the soil and gravel.
- Softened the crop accent sticker layer in `src/scene/garden-scene.js` by reducing opacity/scale/lift and re-enabling depth testing, so the procedural crop meshes carry more of the scene and the sprite cards stop dominating mid-season beds.
- Slimmed the backpack rail in `src/ui/backpack-panel.js` and `index.html` by narrowing the desktop panel container and shrinking inventory slot tiles.
- Validation:
  - `node --check` passed for `src/scene/bed-model.js`, `src/scene/scenery.js`, `src/scene/garden-scene.js`, and `src/ui/backpack-panel.js`.
  - `git diff --check` passed for the touched files.
  - `npm run build` was started under Node 22 and reached `vite build`, but remained silent/stalled in this shell before completion, so local manual smoke is still the practical next check.

Update 2026-03-22 gameplay guide layout port:
- Rebuilt `src/ui/gameplay-guide.js` around the stronger standalone guide mock instead of the older stacked-card sheet.
- The live overlay now uses a left-nav + section-content shell with richer section styles: overview status table, story loop steps, scoring factors + grade grid, intervention carry-forward table, scene-style cards, tool matrix, and controls tables.
- Kept the guide grounded in the actual current build contract: Story Mode live, Planner Mode not yet a menu path, Let It Grow tool layer gated/experimental, and the new planner/story/celebration scene preset framing.
- Extended `index.html` with dedicated gameplay-guide nav/table/callout/grade/tool styles and widened the sheet shell so the guide reads like a real in-game manual rather than a dev note stack.
- Validation:
  - `node --check` should be run for `src/ui/gameplay-guide.js`.
  - `git diff --check` should be run for the guide files.
  - Manual smoke next: open title screen -> `How To Play`, click each left-nav section, confirm section switching and mobile collapse behavior.

Update 2026-03-22 follow-up 3D cleanup after guide port:
- Removed the remaining clothesline poles from `src/scene/scenery.js`; the lane was still reading as a stray diagonal guide in the active camera framing.
- Removed the right-side neighbor-wall / roof plane from `src/scene/scenery.js`; it was reading like a floating panel more than a believable backdrop.
- Pulled row markers and label sprites inward in `src/scene/bed-model.js` so the left labels are less likely to clip off-screen.
- Increased sprite accent scale in `src/scene/garden-scene.js` so planted cells read a bit more clearly from the default camera without bringing back the old card-overlay problem.
- Tightened `src/ui/winter-review.js` into a bounded review panel with an internal scroll region, persistent explanatory footer copy, and a pinned action row so `Open Backpack` / `Continue` stay visible while the review content scrolls.
- The winter review now reads like an actual tool: year recap, soil + carry-forward map, last harvest summary, recipes/keepsakes, strongest/weakest cells, next-spring hints, and a visible exit into the next chapter.
- Validation: `npx vite build` passed. Forced-winter Playwright fixtures confirmed both the review screen layout (`output/web-game/winter-review-direct-oneshot/shot-0.png`) and the follow-through into the season-complete transition (`output/web-game/winter-review-continue/shot-0.png`).

Update 2026-03-21 Calvin intro/talk bubble pass:
- Calvin is now a real speaker in the portrait system instead of dead data in `src/data/speakers.js`. Added `calvin` to `src/data/portraits.js`, surfaced `thoughtBubble` through `src/game/cutscene-machine.js`, and gave `src/ui/dialogue-panel.js` / `assets/css/theme.css` a dedicated thought-bubble presentation so Calvin reads as instinctive inner monologue rather than a normal narrator badge.
- Re-timed the Chapter 1 intro in `src/data/cutscenes.js` so the sheepdog run starts on the opening narrator beat and persists into Garden GURL's callout. The GURL yell now stays on the wider intro framing instead of triggering the run too late on a tighter shot.
- Updated `src/data/cutscenes.test.js` to recognize Calvin as a valid authored speaker.
- Validation: `npx vite build` passed and `node --experimental-vm-modules src/data/cutscenes.test.js` passed (`1827 passed, 0 failed`).
- Automation note: the Playwright client still captured the updated opening frame (`output/web-game/shot-0.png`), but this environment remained flaky for deterministic mid-cutscene advancement, so the narrator-opener screenshot is verified while the exact Calvin callout frame still needs one quick headed/manual smoke check next pass.

Update 2026-03-21 scoped 3D polish pass:
- Tightened the front-facing 3D framing in `src/scene/garden-scene.js` and `src/scene/camera-controller.js` so the bed fills more of the frame, cutscene presets sit lower/closer, and free orbit no longer drifts back into the older high generic overview.
- Rebalanced seasonal lighting in `src/scene/garden-scene.js`: brighter front-biased sun/fill, lighter fog, and slightly hotter exposure so the bed, trellis, and side props read cleanly in the opening planning scene instead of sinking into the darker backdrop.
- Refined `src/scene/scenery.js` for background depth and readability: added a foundation strip + mulch border + hedge planting bed behind the wall, porch rail/steps, a rain barrel by the downspout, and retuned seasonal accent color updates for shrubs/flowers.
- Moved several work-zone props inward so they stop clipping against the lower frame edges, pushed the clothesline / telephone pole / distant rooftops farther out of the main composition, and rebuilt the porch screen door as an actual frame instead of a dark slab.
- Reduced the sheepdog scale and shifted its default run line farther down the access path so it reads as scene action without blocking the bed as aggressively during chapter intros.
- Validation: `npx vite build` passed. Playwright capture at `output/web-game/polish-pass/shot-0.png` confirmed the new framing and prop placement, but one limitation remains: the environment here is still noisy for repeated interactive browser checks, so the final visual sign-off is based on that static capture plus the clean build.

Update 2026-03-22 visible Let It Grow surfacing pass:
- Added a fourth `Crafting` tab to `src/ui/backpack-panel.js` with recipe cards, output badges, craftability state, material shortfall rows, and live `Craft` actions.
- Extended `src/ui/ui-binder.js` backpack payloads with recipe output defs and crafting-skill progress so the backpack can show a real workbench surface instead of just inventory/pantry.
- Surfaced Let It Grow world-state summaries in planning HUD copy and `window.render_game_to_text()`: current zone, available paths, and current foraging availability.
- Registered zone exits and foraging spots as proximity interactables in `src/ui/ui-binder.js` using `evaluateZoneAccess(...)`, so the active scene can now produce travel/gate feedback and forage prompts in the same interaction lane as bed cells.
- Validation:
  - `node --check` passed for `src/ui/backpack-panel.js`, `src/ui/ui-binder.js`, and `src/scene/zone-manager.js`.
  - `git diff --check -- src/ui/backpack-panel.js src/ui/ui-binder.js src/scene/zone-manager.js` passed.
  - Skill Playwright client ran against `http://127.0.0.1:4174/garden-os/story-mode-live/?mode=let-it-grow` and captured the title screen at `/tmp/garden-os-visible-pass/shot-0.png`, but the title-screen click still timed out in automation.
  - Direct Playwright gameplay smoke confirmed the route still boots into Chapter 1 planning/cutscene and wrote `/tmp/garden-os-visible-pass-direct/backpack.png`, `/tmp/garden-os-visible-pass-direct/state.json`, and `/tmp/garden-os-visible-pass-direct/errors.json`.
  - Important boundary: the `4174` route is serving a stale `story-mode/dist` bundle. The smoke state from that route did not include the newly added `currentZone`, `routes`, or `foraging` fields, which confirms the local served build predates this patch.
  - `npm run build` and a clean-port `vite dev` attempt both stalled in this shell before updating/serving the new bundle, so source is correct but local runtime refresh is still blocked by the environment.

Update 2026-03-22 crop billboard transparency fix:
- Diagnosed the gray crop-card artifact as an asset format issue, not a Three.js transparency flag issue: the active `grow-*.png` sheets in `assets/textures/` are plain RGB PNGs with no alpha channel, while the single-crop `crop-*.png` icons are RGBA.
- Patched `src/scene/sprite-loader.js` so `getGrowthTexture(...)` falls back to the RGBA crop icon whenever a `grow-*` sheet is marked `hasAlpha: false`.
- This keeps Story Mode / Let It Grow bed sprites visually readable immediately, while preserving the option to restore real staged growth sheets once transparent assets are regenerated.
- Validation:
  - `node --check src/scene/sprite-loader.js` passed.
  - `git diff --check -- src/scene/sprite-loader.js` passed.

Update 2026-03-22 crop stage readability pass:
- Re-enabled crop accent sprites in `src/scene/garden-scene.js` now that the growth texture loader safely falls back to RGBA crop icons.
- Accent readability is stage-driven instead of art-driven for now:
  - SEED / SPROUT / GROWING / HARVEST change icon opacity, scale, and vertical lift
  - winter cells shift cooler/desaturated
  - damaged cells tint warmer and dim further
- Added `scripts/local-dist-transform-server.mjs` so the local `4174` route can serve `dist` with targeted scene transforms while Vite build/dev remains unreliable in this shell.
- Validation:
  - `node --check src/scene/garden-scene.js` passed.
  - `git diff --check -- story-mode/src/scene/garden-scene.js` passed.
  - The current `dist` bundle now contains the stage-accent logic (`garden-scene-BsadH2ka.js`).
  - The `develop-web-game` Playwright client reaches the title screen cleanly on the refreshed `4174` route.
  - The automated click burst still did not advance into gameplay, so the final in-garden visual check remains a quick manual smoke step.
