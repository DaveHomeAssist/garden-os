# Modernization Roadmap

## Current Architecture Strengths

| Strength | Detail |
|----------|--------|
| Clean separation | Engine / narrative / rendering / UI |
| Pure scoring | No side effects in math layer |
| Build-time data | Offline-capable, no runtime fetch |
| Modular files | 34 files, single responsibility each |
| Test coverage | Cutscene test suite with 154+ scenarios |

## Technical Debt / Gaps

| Area | Issue | Priority |
|------|-------|----------|
| No TypeScript | All vanilla JS — no type safety | Medium |
| No component framework | UI is raw DOM manipulation | Low |
| No audio | Complete silence | High for v0.3 |
| No input abstraction | Input handling baked into main.js | High for v0.1 |
| Single entry point | main.js does too much orchestration | Medium |
| No asset management | Three.js objects created inline | Medium |
| No error boundary | Runtime errors crash silently | Low |

## Recommended Modernization (In Order)

### 1. Extract Input System (v0.1 prerequisite)
- Pull keyboard/mouse/touch handling out of main.js
- Create `src/input/input-manager.js`
- Support: WASD movement, tool switching, cell interaction, gesture recognition
- Abstract: pointer events, keyboard events, gamepad (future)

### 2. Audio System (v0.3)
- Create `src/audio/audio-manager.js`
- Web Audio API for SFX, `<audio>` for music/ambience
- Per-season ambient tracks
- SFX: plant, water, harvest, event, UI feedback
- Volume controls in pause menu

### 3. State Store Refactor (v0.2)
- Centralize state mutations through a store pattern
- Current: main.js directly modifies state objects
- Target: `dispatch(action)` → reducer → new state → notify subscribers
- Enables: undo, replay, debug tools, multiplayer sync

### 4. TypeScript Migration (opportunistic)
- Not a blocker for any phase
- Migrate file-by-file as touched
- Start with `src/game/state.js` (most important to type)
- Add `tsconfig.json` with strict mode

### 5. Main.js Decomposition (v0.2)
- Extract: game initialization, phase routing, UI binding, input handling
- Target: main.js becomes a thin boot + wire-up file
- Each concern gets its own module

### 6. Asset Pipeline (v0.3+)
- Centralize Three.js geometry/material creation
- Reuse materials across scene objects
- Texture atlas for crop sprites
- Dispose tracking to prevent memory leaks on zone transitions

## Non-Goals

- **No framework migration** — React/Vue/Svelte add complexity without value for this project
- **No SSR** — this is a client-side game
- **No monorepo tooling** — single project, single build
- **No GraphQL** — localStorage + simple REST (if multiplayer) is sufficient
