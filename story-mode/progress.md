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
