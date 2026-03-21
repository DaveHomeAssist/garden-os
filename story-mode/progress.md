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
