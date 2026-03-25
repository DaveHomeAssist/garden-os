Original prompt: can you write it and save it

- Initialized game scaffolding task for a single-file Garden OS game prototype.
- Target output file: garden-league-simulator.html in this repo root.
- Next: implement full game loop (place crops, simulate, score, retry) and run Playwright sanity test.

- Implemented full single-file game: `garden-league-simulator.html`.
- Included deterministic scoring engine, 8x4 grid placement, season selector, simulation, retry, narrator commentary, event log.
- Added automation compatibility hooks: `window.render_game_to_text` and `window.advanceTime(ms)`.
- Ran skill Playwright client via `web_game_playwright_client.js` against local server.
  - Artifacts: `/tmp/garden-game-output/shot-0.png`, `shot-1.png`, `state-0.json`, `state-1.json`.
  - No console/page errors captured.
- Ran additional direct Playwright full-loop test (place -> simulate).
  - Result: `score_avg: 6.989`, `planted_cells: 1`, `mode: results`, `errors: []`.
  - Screenshot: `/tmp/garden-game-output/full-loop.png`.

TODO / next-agent suggestions:
- Add difficulty presets (easy/standard/hard) to adjust penalties and companion weighting.
- Add small campaign mode with 3 fixed challenges and target score thresholds.
- Optionally wire this page into `index.html` and Garden OS docs navigation.

- Merged best-of features from all provided prototypes into `garden-league-simulator.html`.
- Added richer faction-based roster (Climbers, Fast Cycles, Brassicas, Roots, Greens, Herbs, Fruiting, Companions).
- Added challenge mode with modal accept flow and active challenge strip.
- Added hard/advisory/buff counters and detailed violation panel.
- Added score grade badges (A-F style) and preserved factor breakdown bars.
- Added score history persistence (last 10 simulations) using localStorage.
- Added auto-fill action for rapid iteration and debugging layouts.
- Preserved automation hooks: `window.render_game_to_text` + `window.advanceTime(ms)`.

Validation:
- Playwright client run with screenshots and state JSON (`/tmp/garden-game-merge-output`).
- Direct full-loop test (place -> simulate -> challenge -> autofill -> simulate) passed.
- Final loop state sample: mode=results, planted=32, score=7.113, challenge=diplomats, history_count=2, errors=[].

- Created non-destructive v2 variant: `garden-league-simulator-v2.html` (left original file untouched).
- Updated v2 title/header/meta tag to clearly indicate v2.
- Quick Playwright sanity test on v2 passed: mode=results, planted=1, score=7, errors=[].

- Applied visual skin upgrade to `garden-league-simulator-v2.html` only (original and non-v2 files untouched).
- New look: parchment panels, soil backdrop, higher-contrast controls, warmer board styling, refined buttons/chips, cleaner card hierarchy.
- Kept all gameplay logic intact.
- Regression check passed via Playwright: place -> simulate on v2 with no console/runtime errors.
- Screenshot artifact: `/tmp/garden-game-merge-output/v2-skin.png`.
- Fixed roster text overlap in v2 skin by converting crop buttons to explicit two-line layout (`.name-line` + `.meta-line`) and increasing min-height.
- Verified at narrow viewport (307x818) and standard simulation flow; no errors.
- Screenshot: `/tmp/garden-game-merge-output/v2-overlap-fix.png`.

Group A + Group B execution (v2 only):
- A11y/input safety: roving tabindex + arrow/Home/End/Enter grid keyboard navigation; modal focus trap and focus restore; global shortcut guards (ignore in modal and form controls); board eraser cursor mode.
- CSS quick wins: muted contrast token updated, duplicate hover rule removed, prefers-reduced-motion added, grade B color softened, good-cell background tint, button label updated to include (R).
- Semantics: factor bars switched from `<i>` to `<span class="bar-fill">` with progressbar ARIA attributes; legend no longer aria-hidden.
- Visual identity + feedback: score ring gauge added, score count-up animation, cell just-planted animation, richer trellis/access cell textures, simulate loading state (`simulating...`).

Validation:
- Targeted regression script passed (keyboard nav, modal trap, shortcut guard, sim loading state).
- No console/runtime errors.
- Screenshots: `/tmp/garden-game-merge-output/v2-groupAB.png`, `/tmp/garden-game-merge-output/v2-mobile-after-groupAB.png`.

Responsive + typography/polish verification pass (v2):
- Confirmed responsive breakpoints present and active at 960/600/480 + short-landscape handling (`max-height:500` + landscape).
- Confirmed typography/polish updates present: larger heading hierarchy, score ring sizing on mobile, modal opacity/scale transition model, and explicit empty-state component.
- Ran develop-web-game Playwright client loop on v2 and captured screenshots/state:
  - `/tmp/garden-game-merge-output/v2-skill-loop/shot-0.png`
  - `/tmp/garden-game-merge-output/v2-skill-loop/shot-1.png`
  - `/tmp/garden-game-merge-output/v2-skill-loop/state-0.json`
- Ran targeted multi-viewport regression with interaction flow (select crop -> place x2 -> simulate -> challenge modal tab cycle):
  - `/tmp/garden-game-merge-output/v2-regression-check/results.json`
  - screenshots: `desktop1400.png`, `tablet960.png`, `mobile600.png`, `mobile480.png`, `landscape812x375.png`
- Regression status: all 5 viewports reached `mode=results`, `planted_cells=2`, `score_avg=6.503`, `modalTabTrap=true`, shortcut guard held on `#seasonSelect`, no console/page errors.

TODO / next-agent suggestions:
- Optional visual follow-up: add explicit horizontal scroll hint on mobile board when axis overflows.
- Optional UX follow-up: keep challenge modal from opening in automated viewport checks unless specifically testing modal behavior, to keep screenshots cleaner.

- Round 2 non-overlap tasks completed while other agents run:
  - Added `docs/README.md` as a master docs/spec index with one-line descriptions and status labels.
  - Added `specs/V2_REUSE_AUDIT.md` mapping v2 functions/data/UI into reuse vs refactor vs rewrite for v3.
  - Added `garden-league-simulator-v3.html` scaffold (HTML + Google Fonts + CSS custom properties only; no JS).

- 2026-03-21 root landing/public-entry update:
  - Reframed the root `index.html` around Story Mode as the primary CTA.
  - Replaced the stale `home.html` nav target with a direct Story Mode link and removed the duplicate play-game nav item.
  - Updated landing copy to mention Calvin, the sheepdog intro, month-aware seasons, winter review, and richer 3D scenes/dialogue.
  - Updated `manifest.json` so installs open directly to Story Mode and the shortcut list puts Story Mode first.
  - Updated `docs/active-hosted-urls.md` so the active Garden OS route registry no longer lists `home.html` as a live entry point.
  - Validation:
    - `jq . manifest.json` passed.
    - `git diff --check -- index.html manifest.json docs/active-hosted-urls.md` passed.

Validation notes:
- Confirmed v2 references used in the audit by function/line anchors.
- Confirmed no JS was added to v3 scaffold (prompt 8-safe).
- Current git status includes active-agent outputs landing in `specs/` (dialogue/event/UI specs) plus these new files.

TODO / next-agent suggestions:
- Reconcile `docs/README.md` statuses once active prompt rounds finish and all generated specs settle.
- If desired, add a `specs/README.md` mirroring docs index style for agent-friendly discovery.
- Wire v3 scaffold IDs/classes to final P8 engine contracts once those specs are final.
- Ran develop-web-game Playwright smoke pass on v3 scaffold:
  - URL: `garden-league-simulator-v3.html`
  - Artifacts: `/tmp/garden-os-v3-smoke/shot-0.png`
  - Expected outcome: screenshot captured; no `state-0.json` because scaffold intentionally has no JS hooks yet.
- Per user request, ran a parallel-safe UI/graphics analysis while other agents execute.
- Added `docs/UI_GRAPHICAL_IMPROVEMENT_AUDIT.md` with:
  - strengths, high-impact gaps, severity-ranked issues
  - phased improvement plan (fast wins, identity pass, premium pass)
  - v3 Prompt-8 readiness checklist and parallel execution order
- Updated `docs/README.md` index to include the new UI audit doc.
- Captured fresh visual smoke artifacts used for this pass:
  - v2: `/tmp/garden-os-ui-audit/v2/shot-0.png` + `state-0.json`
  - v3: `/tmp/garden-os-ui-audit/v3/shot-0.png`
- Implemented 4 critical pre-P9 fixes in `garden-league-simulator-v3.html`:
  1) Added missing 20th crop: `cucumber` (climber, support=true, Chapter 2 unlock).
  2) Infrastructure carry-forward applied in `mkSeason()` with persistent mulch flag and compacted/enriched modifiers.
  3) Soil fatigue reset logic added for crop rotation/empty cells using `lastFamilyMap`; fatigue now resets to 0 on family change or empty, accumulates only on repeated heavy-feeder family use.
  4) Event memory is now applied in `mkSeason()` and decremented there; memory records now persist affected cell positions.
- Validation run:
  - Static checks: crop count=20, event count=40, `lastFamilyMap` present, event-memory apply/decrement code present.
  - Runtime checks via Playwright:
    - Hooks present under `window.gardenOS`.
    - Phase progression reaches HARVEST/REVIEW.
    - Rotation reset verified (`fatigue00` became 0 when family changed from climbers to roots).
    - Event memory applied to next season (`eventMod00=-0.4`) and expiration decremented to removal (`eventMemoryLen=0`).
- Residual note (non-blocking but real): `eventLog` can exceed 3 entries in one season due duplicate logging when an event affects 0 cells and then logs again on advance.

- Added initial How-to-Play framework to `garden-league-simulator-v3.html`:
  - New header Help CTA (`How to Play`) visible in all states.
  - New menu action button (`How to Play`) on main menu.
  - Multi-section how-to overlay with tabs:
    - Quick Start
    - Season Flow
    - Scoring
    - Campaign
  - Added section content model (`HOWTO_SECTIONS`) so copy/structure can be expanded without UI rewrites.
  - Added keyboard shortcut support: `H` / `?` opens help; `Esc` closes active overlay.
  - Added overlay backdrop click-to-close behavior.
- Validation:
  - Playwright client run against local server with screenshots:
    - `output/web-game/howto-test/shot-0.png`
    - `output/web-game/howto-test/shot-1.png`
  - Direct Playwright flow check (menu -> chapter -> place crop -> open help -> close help):
    - Result: `{ open: true, closed: true, phase: "PLANNING", planted: 1, errorCount: 0 }`
    - Screenshot: `output/web-game/howto-test/flow-check.png`
- Suggested next step:
  - Add context-sensitive deep links (e.g., clicking `Support` factor opens How-to-Play at `Scoring` section).
- Added global automation shims for compatibility with skill test loop:
  - `window.render_game_to_text` now proxies to `window.gardenOS.render_game_to_text()`.
  - `window.advanceTime` now proxies to `window.gardenOS.advanceTime()`.
- Re-ran develop-web-game Playwright client after shim update:
  - `output/web-game/howto-test/shot-0.png`
  - `output/web-game/howto-test/shot-1.png`
  - `output/web-game/howto-test/state-0.json`
  - `output/web-game/howto-test/state-1.json`
  - State export now present and readable.

- 2026-03-16 stability refactor in progress for planner + season engines.
- Planner phase work so far:
  - Hardened snapshot restore and selection normalization.
  - Added storage-safe legacy cleanup and restored `sunDirection` persistence on save.
  - Centralized planner render context for zone/issue/score reuse.
  - Reset transient interaction state during workspace restore.
  - Replaced manual tool-button syncing with shared sync path.
  - Tutorial targets now track live cell ids instead of stale object refs.
  - Layout shell updated for medium widths and mobile board-first ordering.
  - Settings menu and confirm dialog now focus the first actionable control and restore focus on close.
- Season Engine v3/v4 phase work so far:
  - Added safe JSON parse helpers and normalized restore guards for state/history/campaign payloads.
  - Standardized inspect/paint/erase helper flows.
  - Planning clicks now save only on real grid mutations; same-crop/empty-erase clicks inspect without fake edits.
  - Added `aria-pressed` parity on crop buttons.
- Next:
  - update docs/UI issue tracker with completed hardening items
  - add compact smoke checklist
  - run Playwright/browser smoke checks and capture any regressions
- Validation 2026-03-16:
  - Planner Playwright client pass: `output/web-game/planner-stability/shot-0.png`, `state-0.json`.
  - Engine v3 Playwright client pass: `output/web-game/engine-v3-stability/shot-0.png`, `state-0.json`.
  - Engine v4 Playwright client pass: `output/web-game/engine-v4-stability/shot-0.png`, `state-0.json`.
  - Planner direct checks passed: settings menu initial focus `menuSave`, focus restore `menuGearBtn`, mobile viewport stacks board before side rails, no console/page errors.
  - Planner malformed localStorage JSON fallback stayed non-crashing with no console/page errors.
  - Engine direct checks passed in v3/v4: neutral click after `Escape` changed selection only, did not mutate grid or rewrite saved state; `E` enabled eraser and `Escape` returned to neutral inspect mode.
- Docs updated:
  - `docs/UI_ISSUES_TABLE.html` updated with newly completed stability/layout/focus items.
  - `README.md` updated with compact smoke checklist.

- 2026-03-16 targeted patch pass:
  - Fixed planner reset-bed action to restore the 4×8 preset instead of 8×4 and aligned the confirmation copy.
  - Review result: planner companion-panel flat-bed iteration fix and tutorial `cherry_tomato` references were already present in the active file; no code change needed there.
  - Review result: season-engine `bedScore.finalScore.toFixed(...)` crash pattern was not present in active v3/v4 files; no code change needed there.

[2026-03-18] [GardenOS] [feat] Replace planner confirmations with undo and restore
[2026-03-18] [GardenOS] [refactor] Split home and hub entry roles
[2026-03-18] [GardenOS] [feat] Add simulator objective strip
[2026-03-18] [GardenOS] [feat] Share manage menu pattern with Season Engine
[2026-03-18] [GardenOS] [fix] Open crop palette before tutorial tomato step
[2026-03-18] [GardenOS] [feat] Add deterministic scenario harness prompts
[2026-03-18] [GardenOS] [feat] Unify planner reasoning into one surface
[2026-03-18] [GardenOS] [fix] Normalize legacy simulator review saves
[2026-03-18] [GardenOS] [refactor] Split simulator review copy by phase
[2026-03-22] [GardenOS] [feat] Add Let It Grow proximity interaction system scaffold
[2026-03-22] [GardenOS] [feat] Add floating interact prompt and dedicated cell highlight lane
[2026-03-22] [GardenOS] [note] Let It Grow proximity mode is gated behind query params `?mode=let-it-grow`, `?let-it-grow=1`, or `?proximity=1`, plus optional localStorage key `garden-os:let-it-grow-mode=1`
[2026-03-22] [GardenOS] [feat] Add Let It Grow tool HUD with number-key, tab-cycle, and touch selection
[2026-03-22] [GardenOS] [feat] Wire equipped-tool visuals into player avatar and scene API
[2026-03-22] [GardenOS] [note] Phase 1E keeps tool state runtime-local in `ui-binder.js`; water/protect/mulch/harvest currently show tool-aware feedback and flashes, with deeper mechanics deferred to 1G
[2026-03-22] [GardenOS] [validation] `node --check` passed for `tool-hud.js`, `ui-binder.js`, `player-character.js`, and `garden-scene.js`; browser automation still hangs after title-screen boot when entering a new game headlessly
[2026-03-22] [GardenOS] [feat] Add real-time tool execution API to `intervention.js` with `canUseTool`, `executeToolAction`, and store-backed cooldowns
[2026-03-22] [GardenOS] [feat] Extend reducer/state for `WATER_CELL`, `HARVEST_CELL`, `SET_COOLDOWN`, `toolCooldowns`, and per-cell `lastWateredAt`
[2026-03-22] [GardenOS] [feat] Replace 1E placeholder tool toasts with real store-driven water/harvest/protect/mulch/inspect behavior in `ui-binder.js`
[2026-03-22] [GardenOS] [test] Add `story-mode/src/game/intervention.test.js` covering tool validity, cooldowns, harvest, protect, and mulch flows
[2026-03-22] [GardenOS] [validation] `node --check` passed for `intervention.js`, `store.js`, `ui-binder.js`, and `intervention.test.js`; direct Node imports still fail outside Vite because of the existing `specs` alias, and targeted vitest remained non-responsive in this shell
[2026-03-22] [GardenOS] [feat] Add `story-mode/src/data/npcs.js` with canonical NPC registry, schedules, neighbor templates, and greeting accessors
[2026-03-22] [GardenOS] [feat] Add `story-mode/src/game/reputation.js` and extend state/store/save for quest log, reputation, world state, and zone persistence
[2026-03-22] [GardenOS] [feat] Add `story-mode/src/game/quest-engine.js` with prerequisite filtering, progress evaluation, turn-in rewards, and timed quest failure checks
[2026-03-22] [GardenOS] [feat] Extend dialogue runtime for branching beats via `cutscene-machine.js` and `dialogue-panel.js`
[2026-03-22] [GardenOS] [feat] Add `story-mode/src/scene/zone-manager.js` and `story-mode/src/scene/zones/neighborhood.js`
[2026-03-22] [GardenOS] [test] Add Phase 2 coverage in `npcs.test.js`, `reputation.test.js`, `quest-engine.test.js`, `save.test.js`, `zone-manager.test.js`, and expanded `store.test.js`
[2026-03-22] [GardenOS] [validation] Phase 2 `node --check` passed for code and test files; whitespace/conflict-marker scan passed; targeted vitest remained non-responsive in this shell
[2026-03-22] [GardenOS] [feat] Add monthly event rotation in `story-mode/src/data/events.js` and month metadata to `specs/EVENT_DECK.json`
[2026-03-24] [GardenOS] [audit] Compared planner scoring, Story Mode scoring, and `specs/SCORING_RULES.md`
[2026-03-24] [GardenOS] [doc] Added `docs/SCORING_MISMATCH_REPORT_2026-03-24.md` with canonical source decisions, drift buckets, and convergence path
[2026-03-24] [GardenOS] [feat] Hardened planner score explanation in `garden-planner-v4.html` with explicit Rules core / Planner layer / Story Mode later provenance, plus a visible planner rollup breakdown card
[2026-03-24] [GardenOS] [feat] Added mobile quick-action dock and stronger mobile HUD/sheet styling to `garden-planner-v4.html`
[2026-03-24] [GardenOS] [fix] Story Mode now maps `latesummer` to the `summer` seasonal multiplier key in `story-mode/src/scoring/cell-score.js`
[2026-03-24] [GardenOS] [fix] Story Mode event targeting no longer uses random per-cell selection; `random_cells` is now deterministic in `story-mode/src/game/event-engine.js`
[2026-03-24] [GardenOS] [fix] Story Mode event drawing in `story-mode/src/data/events.js` now uses deterministic seeded weighted selection instead of `Math.random()`
[2026-03-24] [GardenOS] [validation] `node --check` passed for `story-mode/src/scoring/cell-score.js`, `story-mode/src/game/event-engine.js`, and `story-mode/src/data/events.js`
[2026-03-24] [GardenOS] [validation] Inline planner script parse passed via `new Function(...)` extraction check: `inline-script-parse-ok 2`
[2026-03-24] [GardenOS] [validation] Browser automation remains blocked in this shell: Playwright MCP crashes on the cached Chrome bundle, and the `develop-web-game` client fails because the local Playwright headless shell is missing
[2026-03-22] [GardenOS] [feat] Add slot-based inventory core in `story-mode/src/game/inventory.js` with stacking, drag-targetable slot movement helpers, durability fields, and legacy bag migration
[2026-03-22] [GardenOS] [feat] Add skill progression core in `story-mode/src/game/skills.js` and normalize campaign skill state for XP/level tracking
[2026-03-22] [GardenOS] [feat] Add recipe crafting system in `story-mode/src/game/crafting.js` and zone foraging system in `story-mode/src/game/foraging.js`
[2026-03-22] [GardenOS] [feat] Extend reducer/save/state for inventory actions, skill XP, crafting bookkeeping, foraging state, and versioned season grid persistence
[2026-03-22] [GardenOS] [feat] Extend `intervention.js` for tool durability, consumable usage, and repair support; starter campaign inventory now seeds the baseline tool kit
[2026-03-22] [GardenOS] [feat] Rebuild `story-mode/src/ui/backpack-panel.js` as a tabbed slot inventory panel with selection, keyboard navigation, pointer drag/drop, and keepsake/pantry preservation
[2026-03-22] [GardenOS] [feat] Instantiate `SkillSystem` in the Story Mode binder so Phase 4 XP hooks are live against store actions during gameplay
[2026-03-22] [GardenOS] [feat] Add zone gate enforcement in `story-mode/src/scene/zone-manager.js` and dynamic grid/scoring support in `state.js`, `bed-model.js`, `cell-score.js`, and `bed-score.js`
[2026-03-22] [GardenOS] [test] Add Phase 4/5 coverage in `inventory.test.js`, `skills.test.js`, `crafting.test.js`, `foraging.test.js`, plus durability/save/zone gate updates
[2026-03-22] [GardenOS] [validation] `node --check` passed for touched Phase 4/5 code and test files; hygiene scan passed; direct Playwright tooling remained flaky in this shell (client completed without artifacts and MCP browser transport was closed), but the local Vite server booted on `127.0.0.1:4174`
[2026-03-22] [GardenOS] [feat] Add seasonal festival engine in `story-mode/src/game/festivals.js` with store-backed active festival state
[2026-03-22] [GardenOS] [feat] Add placeholder-capable `story-mode/src/audio/audio-manager.js` and `story-mode/assets/audio/` placeholder docs
[2026-03-22] [GardenOS] [feat] Add optional `DayNightCycle` to `weather-fx.js` and wire garden-scene support via `setDayNightEnabled(...)`
[2026-03-22] [GardenOS] [test] Add Phase 3 coverage in `events.test.js`, `festivals.test.js`, and `audio-manager.test.js`
[2026-03-22] [GardenOS] [validation] Phase 3 `node --check` passed for code and test files; whitespace/conflict-marker scan passed; targeted vitest remained non-responsive in this shell
[2026-03-22] [GardenOS] [feat] Add title-screen gameplay guide scaffold in `story-mode/src/ui/gameplay-guide.js`
[2026-03-22] [GardenOS] [feat] Wire a `How To Play` launcher into `story-mode/src/game/game-init.js` and `story-mode/index.html`
[2026-03-22] [GardenOS] [note] Guide content is grounded in current code: Story Mode season loop, live bed-score bonuses/penalties, intervention carry-forward, and the gated Let It Grow tool layer/cooldowns
[2026-03-22] [GardenOS] [validation] `node --check` passed for `gameplay-guide.js` and `game-init.js`; `git diff --check` passed for `gameplay-guide.js`, `game-init.js`, and `index.html`
[2026-03-22] [GardenOS] [validation] Static source serving on `http://127.0.0.1:4191/` confirms the new `title-actions` slot and `/src/main.js` entry are present in source HTML
[2026-03-22] [GardenOS] [validation] Browser automation remains unreliable in this shell: the develop-web-game client produced screenshots only against stale preview ports, and both the client and direct Playwright probes timed out against a clean static server before full guide-open verification completed
[2026-03-22] [GardenOS] [feat] Add standalone root tool `garden-os-sprite-viewer.html` for local sprite-folder loading and inspection
[2026-03-22] [GardenOS] [feat] Sprite viewer supports folder/file loading, search, folder filtering, metadata inspection, zoom/background controls, and manual sheet slicing into frames
[2026-03-22] [GardenOS] [validation] Static source serving on `http://127.0.0.1:4192/garden-os-sprite-viewer.html` confirms the expected viewer UI hooks (`pick-folder-btn`, `asset-list`, `preview-canvas`, `frames-grid`) are present
[2026-03-22] [GardenOS] [validation] The develop-web-game Playwright client still stalled before writing smoke screenshots for the standalone viewer in this shell, so runtime DOM/source checks are complete but browser-loop verification is still partial
[2026-03-18] [GardenOS] [feat] Surface Accept Loss in simulator beat UI
[2026-03-18] [GardenOS] [feat] Add deterministic scenario harness prompts
[2026-03-18] [GardenOS] [feat] Unify planner reasoning into one surface
[2026-03-18] [GardenOS] [feat] Add planner severity summary and inspect next moves
[2026-03-18] [GardenOS] [feat] Add deterministic scenario pack and regression clauses
[2026-03-18] [GardenOS] [test] Add phase and reasoning smoke script
- 2026-03-16 follow-up quality pass:
  - Added shared focus-visible outline/offset handling and reduced-motion `.pulse` fallback in `DaveHomeAssist.github.io/assets/css/base.css`.
  - Tightened shared muted text tokens in `DaveHomeAssist.github.io/assets/css/tokens.css` for better low-contrast copy legibility.
  - Added `tests/planner-reset-regression.mjs` to assert the planner reset flow restores `bedW=4` and `bedH=8`.

- 2026-03-17 engine diagnostics pass:
  - Rebuilt `docs/engine-console-tests.js` as a working browser-console harness for `garden-league-simulator-v4.html`.
  - Important implementation detail: v4 engine internals live inside an IIFE, so the harness now builds a private test bridge from the page source instead of assuming direct global access to `bedScore`, `mkSeason`, `C`, etc.
  - Expanded coverage to 36 tests across:
    - P0 scoring/light/event determinism
    - P1 factor ranges, event safety, intervention transitions, dialogue trigger behavior
    - P2 utilities, crop data integrity, bed-score aggregation, carry-forward logic, persistence round-trips
    - P3 dialogue/HOWTO copy scans
  - Validation:
    - `node --check docs/engine-console-tests.js`
    - develop-web-game Playwright client run against `garden-league-simulator-v4.html`
      - `output/web-game/engine-v4-console-tests-rerun/shot-0.png`
      - `output/web-game/engine-v4-console-tests-rerun/shot-1.png`
      - `output/web-game/engine-v4-console-tests-rerun/state-0.json`
      - `output/web-game/engine-v4-console-tests-rerun/state-1.json`
    - direct Playwright execution of `runAllTests()` after loading the harness via script tag:
      - result: `36/36 passed, 0 failed`
      - screenshot: `output/web-game/engine-v4-console-tests/final-screen.png`
      - console/page errors: none

- 2026-03-18 builder-mode simulator artifact pass:
  - Added new single-file prototype: `garden-os-simulator.html`.
  - Scope is intentionally smaller than the league/season engine files:
    - 8x4 deterministic builder board
    - crop palette + erase + simulate + reset
    - diagnostic scoring with hard/advisory/buff reasons
    - Garden Gurl / Onion Man narration
    - local-first persistence for current board, last report, and score history
    - automation hooks: `window.render_game_to_text` and `window.advanceTime()`

- 2026-03-22 Story Mode Phase 0A refactor pass:
  - Added `story-mode/src/input/input-manager.js`.
  - Moved gameplay keyboard + canvas pointer routing in Story Mode off inline `main.js` listeners and through `InputManager`.
  - Rewired `story-mode/src/scene/garden-scene.js` hover tracking so pointer position is fed in externally instead of the scene owning `pointermove` / `pointerleave` listeners.
  - Updated `story-mode/src/game/loop.js` to support per-frame `update(dt)` plus `tick(dt)` for deterministic stepping.
  - Added lightweight Story Mode automation hooks in `story-mode/src/main.js`:
    - `window.render_game_to_text`
    - `window.advanceTime(ms)`
    - `window.gardenOS`
  - Added input cleanup on return-to-title flows so the extracted keyboard/pointer listeners do not stack across sessions.

- 2026-03-22 validation notes for Story Mode input refactor:
  - Syntax check passed:
    - `node --check story-mode/src/input/input-manager.js`
    - `node --check story-mode/src/game/loop.js`
    - `node --check story-mode/src/scene/garden-scene.js`
    - `node --check story-mode/src/main.js`
  - `npm test` and `npm run build` in `story-mode/` did not complete with usable output in this environment; status remains unverified.
  - develop-web-game Playwright client run against Vite dev server:
    - URL: `http://127.0.0.1:5174/garden-os/story-mode-live/`
    - click target: new game slot 1
    - artifacts:
      - `/tmp/garden-os-story-input-smoke/shot-0.png`
      - `/tmp/garden-os-story-input-smoke/state-0.json`
      - `/tmp/garden-os-story-input-smoke/errors-0.json`
    - observed state export:
      - `phase=PLANNING`
      - `cutsceneActive=true`
      - pointer position updated from canvas click
    - observed runtime note:
      - one `404` resource error was captured during the smoke run; input-path regression not confirmed from that error alone

- TODO / next-agent suggestions for Story Mode:
  - run `npm test` and `npm run build` again in a cleaner shell to confirm there is no hidden runtime/module failure
  - identify the Playwright smoke `404` resource and confirm whether it is pre-existing or introduced
  - continue with Phase 0B (`src/game/store.js`) once Phase 0A is accepted
  - if sticking with the develop-web-game loop, add a more targeted action burst that fully exits the opening cutscene before asserting gameplay interactions
  - Added seed/config placeholders at repo root:
    - `game-voice-guide.md`
    - `scoring-api.json`
    - `scenario-schema.json`
    - `pest-profiles.json`
    - `crop-roster.json`
    - `achievement-registry.json`
    - `league-config.json`
  - Validation:
    - develop-web-game Playwright client smoke run against `http://127.0.0.1:4173/garden-os-simulator.html`
      - artifacts: `/tmp/garden-os-simulator-smoke/shot-0.png`, `shot-1.png`, `state-0.json`, `state-1.json`
      - smoke state confirmed empty deterministic board with hooks present
    - direct Playwright interaction pass:
      - flow: select Tomato -> place, select Basil -> place adjacent, select Corn -> place off trellis, simulate
      - result: `score=2`, `hardCount=1`, `buffCount=1`, `historyCount=1`, `errors=[]`
      - screenshot: `/tmp/garden-os-simulator-smoke/manual-flow.png`
  - Notes:
    - `node --check` does not apply directly to `.html`, so browser validation is the source of truth for this artifact.
    - Current artifact is intentionally standalone and not yet linked from repo navigation.

TODO / next-agent suggestions:
- If the engine is ever modularized, replace the source-bridge approach with direct module imports or exported debug hooks.
- If `docs/ENGINE_TEST_PLAN.md` is still intended to reflect exact executable coverage, update the test count from the original 26-test draft to the current 36-test harness.

- 2026-03-17 engine console harness update:
  - Patched `docs/engine-console-tests.js` so the console suite can run against the IIFE-scoped v4 engine by booting a hidden `srcdoc` harness with injected read-only test hooks.
  - Isolated harness persistence from live app data by rewriting test iframe storage keys with an `__engine_test_*` suffix.
  - Added explicit `accFit` regression coverage and updated usage/logging to `await runAllTests()`.
  - Validation: served `garden-league-simulator-v4.html`, injected the updated console script in a headless browser, and confirmed `78/78` tests passed with no page errors.

- 2026-03-17 event log duplication fix:
  - Patched `garden-league-simulator-v4.html` to prevent `advanceBeat()` from re-applying/re-logging an event that was already resolved earlier in the same beat with zero affected cells.
  - Added `hasLoggedCurrentEventForBeat()` guard instead of changing intervention/event architecture.
  - Validation:
    - Console diagnostic suite still passed after the patch.

- 2026-03-18 seeded RNG fix:
  - Patched `garden-league-simulator-v4.html` so `wRand()` uses a seeded mulberry32 PRNG instead of falling back to `Math.random()`.
  - Added `seed` and `rngState` to season state, with load normalization for older saves.
  - Added a commented deterministic replay proof block at the bottom of the file.
  - Validation:
    - develop-web-game smoke run: `/tmp/garden-v4-seed-fix/shot-0.png`, `/tmp/garden-v4-seed-fix/state-0.json`
    - direct RNG extraction check passed with identical same-seed output: `d,b,b,d`
    - Targeted headless regression reproduced the old risk path (`protect` -> zero affected cells -> advance) and confirmed `eventLog.length` stayed at `1` after phase advance.

TODO / next-agent suggestions:
- If the engine export surface changes again, update the injected `__engineTestHooks` block in `docs/engine-console-tests.js` instead of widening `window.gardenOS`.

- 2026-03-18 continued Garden OS patch sequence:
  - Planner: added explicit issue codes and ordering for unsupported climbers, front-access tall blockers, access-lane blockers, and advisory crowding.
  - Planner: upgraded reasoning surface with cell facts and ordered issue stack.
  - Simulator: exposed `window.gardenOS.getPhaseContract()` for regression-safe phase checks.
  - Added deterministic prompt/spec docs: `garden-os-mode-contract.txt`, `garden-os-scenario-spec.txt`, `garden-os-mode-regression.txt`.
  - Validation in progress: extracted JS syntax checks + Playwright/browser smoke pass for planner/simulator.

- 2026-03-21 soil-fatigue visibility pass on `garden-league-simulator-v4.html`:
  - Confirmed `soilFatigue` is stored as a negative additive penalty, so visibility logic should key off values below `-0.1`.
  - Upgraded the cell fatigue marker from a small warning glyph to a readable pill badge: `FT -0.x`.
  - Strengthened the fatigued-cell treatment with a red-tinted inset outline + subtle background wash so the penalty reads without a tooltip.
  - Updated tooltip/ARIA copy to describe the mechanic as a penalty from repeated heavy-feeder planting instead of exposing a raw unexplained number.
  - Validation:
    - develop-web-game smoke run completed against `garden-league-simulator-v4.html`
    - boot artifacts: `output/web-game/shot-0.png`, `output/web-game/state-0.json`
    - state hook still present and returned `Chapter 1 | spring | PLANNING`

- 2026-03-22 Story Mode Phase 0B store refactor pass:
  - Added `story-mode/src/game/store.js` with a centralized `Store`, `Actions`, `gameReducer`, and state normalization/clone helpers.
  - Added `story-mode/src/game/store.test.js` to cover reducer actions and subscriber notifications.
  - Patched `story-mode/src/main.js` so live Story Mode state now flows through the store:
    - created a single store owner per session
    - subscribed local runtime state to store updates
    - routed crop selection, planting/removal, restart, winter-review completion, intervention resolution, harvest progression, and phase advancement through `dispatch(...)`
    - kept existing imperative systems (`phase-machine.js`, `event-engine.js`, `intervention.js`) operating on cloned draft state before replacement dispatch
  - Patched `story-mode/src/game/save.js`:
    - `saveCampaign()` / `saveSeasonState()` now ignore invalid slots and no longer mutate the passed-in state object
    - added `subscribeToStoreSaves()` for store-driven autosave wiring
  - Validation:
    - syntax checks passed:
      - `node --check story-mode/src/game/store.js`
      - `node --check story-mode/src/game/store.test.js`
      - `node --check story-mode/src/game/save.js`
      - `node --check story-mode/src/main.js`
    - `git diff --check -- story-mode/src/game/store.js story-mode/src/game/store.test.js story-mode/src/game/save.js story-mode/src/main.js` passed
    - `vitest` runner remains unreliable in this environment:
      - `npx vitest ...` and the local `./node_modules/.bin/vitest --help` both stalled without producing usable output
      - reducer test file was still authored and left in place for normal local execution
    - develop-web-game browser validation succeeded after forcing software GL flags in a direct Playwright pass:
      - boot/title smoke: `/tmp/garden-os-story-store-smoke-swiftshader/page.png`, `state.json`, `errors.json`
      - interaction smoke: `/tmp/garden-os-story-store-flow/page.png`, `state.json`, `errors.json`
      - verified flow: start new game -> skip intro -> open plant palette -> select lettuce -> plant one crop
      - resulting state: `phase=PLANNING`, `cutsceneActive=false`, `selectedCropId=lettuce`, `plantedCount=1`, `plantedCells[0].index=0`, `errors=[]`

TODO / next-agent suggestions:
- Phase `0C` is the clean next step now that input and state ownership are extracted.
- If you want reducer tests to run cleanly in CI/local shells, investigate why the Vitest CLI stalls in this environment even for `--help`.

- 2026-03-22 Story Mode Phase 0C main decomposition pass:
  - Added `story-mode/src/game/game-init.js`:
    - extracted title-screen rendering/start flow
    - centralized save-slot boot logic into `showTitleScreen(...)`
    - added `initGame(initialState, { slot })` to create the store, attach autosave persistence, and return canonical data refs
  - Added `story-mode/src/game/phase-router.js`:
    - moved advance/cutscene routing into a dedicated phase router
    - centralizes `doAdvance()`, cutscene finish routing, and narrative trigger handling
  - Added `story-mode/src/ui/ui-binder.js`:
    - moved the Story Mode session orchestration out of `main.js`
    - owns HUD updates, panels, pause/bug UI, interaction wiring, loop startup, automation hooks, and cleanup
    - wires the extracted phase router into the existing cutscene/event/harvest/transition flow
  - Replaced `story-mode/src/main.js` with a thin boot file:
    - title screen -> scene creation -> input manager -> `initGame(...)` -> `bindUI(...)`
    - added small fallback if `viewport` is unexpectedly missing during scene init failure
  - Validation:
    - syntax checks passed:
      - `node --check story-mode/src/game/game-init.js`
      - `node --check story-mode/src/game/phase-router.js`
      - `node --check story-mode/src/ui/ui-binder.js`
      - `node --check story-mode/src/main.js`
    - `git diff --check -- story-mode/src/game/game-init.js story-mode/src/game/phase-router.js story-mode/src/ui/ui-binder.js story-mode/src/main.js` passed
    - software-GL Playwright smoke still passes through the decomposed boot path:
      - artifacts: `/tmp/garden-os-story-0c-flow/page.png`, `state.json`, `errors.json`
      - verified flow: start new game -> skip intro -> open plant palette -> select lettuce -> plant one crop
      - resulting state: `phase=PLANNING`, `cutsceneActive=false`, `selectedCropId=lettuce`, `plantedCount=1`, `plantedCells[0].index=0`, `errors=[]`

TODO / next-agent suggestions:
- The prompt target of a ~150-line binder split is now structurally in place; the next refactor should slice `ui-binder.js` into smaller sub-binders instead of touching `main.js` again.
- The same `vitest` CLI stall remains unresolved in this environment.

- 2026-03-22 Story Mode Phase 0D asset disposal tracking pass:
  - Added `story-mode/src/scene/resource-tracker.js`:
    - central `ResourceTracker` with `track(...)`, `trackObject(...)`, `dispose(...)`, `disposeObject(...)`, and `disposeAll()`
    - handles geometries, materials, nested textures, and render targets without double-disposal
  - Added `story-mode/src/scene/resource-tracker.test.js`:
    - covers object graph tracking, nested texture disposal, duplicate tracking, render target disposal, and parent detachment for runtime objects
  - Updated `story-mode/src/scene/bed-model.js`:
    - switched frame/grid/soil materials to per-build instances so they can be disposed safely on scene teardown
    - wired optional tracker injection and tracks the returned bed group
  - Updated `story-mode/src/scene/scenery.js` and `story-mode/src/scene/weather-fx.js`:
    - accept a tracker instance and register created scene resources
    - weather FX now exposes `dispose()` so zone teardown removes transient weather objects from the scene
  - Updated `story-mode/src/scene/camera-controller.js`:
    - normalized all DOM listeners through tracked handler refs
    - added `dispose()` so scene teardown removes pointer/touch/wheel listeners cleanly
  - Updated `story-mode/src/scene/garden-scene.js`:
    - creates a shared `ResourceTracker` per scene
    - passes the tracker into bed/scenery/weather creation
    - adds exported `disposeGardenScene(...)` helper for teardown
    - tracks static scene resources plus runtime crop/support meshes
    - immediately disposes replaced/removed crop and support props instead of letting them linger until full scene teardown
  - Validation:
    - syntax checks passed:
      - `node --check story-mode/src/scene/resource-tracker.js`
      - `node --check story-mode/src/scene/resource-tracker.test.js`
      - `node --check story-mode/src/scene/bed-model.js`
      - `node --check story-mode/src/scene/scenery.js`
      - `node --check story-mode/src/scene/weather-fx.js`
      - `node --check story-mode/src/scene/camera-controller.js`
      - `node --check story-mode/src/scene/garden-scene.js`
    - file sanity check passed via `rg`:
      - no trailing-whitespace hits
      - no conflict-marker hits
    - local Story Mode route responds:
      - `curl -I http://127.0.0.1:4174/garden-os/story-mode-live/` -> `HTTP/1.1 200 OK`
    - unresolved tool limits in this environment:
      - `vitest` CLI still stalls instead of completing, even when targeting only `src/scene/resource-tracker.test.js` and `src/game/store.test.js`
      - Playwright browser launch is currently stalling before first-page automation, so a post-0D browser smoke was not completed in this shell

TODO / next-agent suggestions:
- Once the local test shell is healthy again, rerun:
  - `cd story-mode && npx vitest run src/scene/resource-tracker.test.js src/game/store.test.js`
  - a software-GL Playwright smoke against `http://127.0.0.1:4174/garden-os/story-mode-live/`
- If zone transitions arrive soon, consider extending `ResourceTracker` to cover any late-created shadow maps or adding a lightweight scene teardown regression harness around `disposeGardenScene(...)`.

- 2026-03-22 Story Mode Phase 1A / 1B / 1C embodiment pass:
  - Added `story-mode/src/scene/player-character.js`:
    - low-poly gardener avatar with shadow, hat, torso/apron, limbs, idle/walk animation, and a camera focus target
  - Added `story-mode/src/game/player-controller.js`:
    - runtime movement controller with spawn position, world bounds, bed collision blocking, facing, speed, and per-frame snapshot output
  - Added `story-mode/src/ui/touch-stick.js`:
    - coarse-pointer touch joystick overlay for mobile movement input
    - hidden on non-touch devices and cleaned up on scene teardown
  - Updated `story-mode/src/scene/camera-controller.js`:
    - added optional smooth follow-target support while preserving existing orbit and preset behavior
  - Updated `story-mode/src/scene/garden-scene.js`:
    - mounts the player avatar into the world
    - exposes `setPlayerState(...)`
    - blends camera follow toward the player without fully abandoning the raised-bed framing
  - Updated `story-mode/src/ui/ui-binder.js`:
    - wires existing `move_up/down/left/right` bindings into the new player controller
    - adds touch-stick mounting and cleanup
    - updates the per-frame loop so player state advances before render
    - extends `render_game_to_text()` with player state for automation visibility
  - Validation:
    - syntax checks passed:
      - `node --check story-mode/src/scene/player-character.js`
      - `node --check story-mode/src/game/player-controller.js`
      - `node --check story-mode/src/ui/touch-stick.js`
      - `node --check story-mode/src/scene/camera-controller.js`
      - `node --check story-mode/src/scene/garden-scene.js`
      - `node --check story-mode/src/ui/ui-binder.js`
    - file sanity check passed via `rg`:
      - no trailing-whitespace hits
      - no conflict-marker hits
    - unresolved runtime verification limits in this shell:
      - Playwright browser launch is still stalling before first-page automation
      - `vitest` CLI still stalls instead of completing, so no live browser smoke was completed for 1A/1B/1C yet

TODO / next-agent suggestions:
- Run a clean Story Mode smoke once the local browser shell is healthy again and confirm:
  - avatar is visible at spawn
  - WASD/arrow movement works
  - touch-stick works on a coarse-pointer viewport
  - follow camera feels supportive rather than disorienting
- If the camera feels too eager, reduce the follow blend in `garden-scene.js` from `0.28` or lower the follow strength in `camera-controller.js`.

- 2026-03-22 scene-style preset pass for Story Mode planning vs narrative readability:
  - Added `story-mode/src/scene/scene-style.js` with three presets:
    - `planner` for flat, muted, low-shadow planning readability
    - `story` for default atmospheric gameplay/cutscenes
    - `celebration` for richer harvest/reveal moments
  - Integrated the style system into `story-mode/src/scene/garden-scene.js`:
    - scene style now layers on top of seasonal lighting instead of replacing season data
    - added `setScenePhase(...)` and `setSceneStyle(...)` on the scene API
    - material overrides are applied centrally by traversing existing scene groups instead of rewriting every material constructor
    - season lighting now only reapplies on actual season changes to avoid repeated heavy restyling
  - Integrated phase-driven style switching in `story-mode/src/ui/ui-binder.js`:
    - planning -> planner style
    - cutscenes / live beats -> story style
    - harvest -> celebration style via phase mapping
  - Added `story-mode/src/scene/scene-style.test.js` for basic phase/style mapping coverage.
  - Validation:
    - direct module import check passed for `scene-style.js` (`PLANNING -> planner`, `HARVEST -> celebration`)
    - full `node import` checks for `garden-scene.js` and `ui-binder.js` were blocked by the repo's existing Vite-only `specs` alias, not by this patch
    - `vite build` and `vitest` still stall in this shell before completion, matching earlier environment issues

- 2026-03-22 Story Mode boot-performance pass:
  - Updated `story-mode/src/main.js` to lazy-load the heavy runtime modules (`input-manager`, `garden-scene`, `ui-binder`) only after the title screen is shown.
  - Added background preload scheduling so the title/menu can appear quickly while runtime modules warm in the background.
  - Added a lightweight `Loading Garden` viewport overlay during post-title session boot.
  - Purpose:
    - reduce the initial blank wait before save slots/mode cards appear
    - keep this work off the `1G` write path while tool mechanics are being built elsewhere
  - Validation:
    - `node --check story-mode/src/main.js` passed
