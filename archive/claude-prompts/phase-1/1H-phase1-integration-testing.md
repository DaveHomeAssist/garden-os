# Claude Prompt — Phase 1H: Phase 1 Integration Testing

## Task

Write integration tests that validate all Phase 1 features work together: player movement, camera follow, proximity interaction, tool usage, and mode selection.

## What to Test

### 1. Movement Integration
- Player model spawns at correct position in Let It Grow mode
- WASD input moves player within bounds
- Player stops at walkable area boundaries
- Player rotation matches movement direction
- Walk animation plays during movement, idle during stop

### 2. Camera Follow Integration
- Camera tracks player position in Let It Grow mode
- Camera orbit still works while following
- Camera zoom still works while following
- Switching to Story Mode: camera uses fixed presets (no follow)
- Transition into/out of follow mode is smooth (no snap)

### 3. Proximity Interaction Integration
- Walking near a cell highlights it
- Walking away removes highlight
- Pressing interact with correct tool → tool action executes
- Interaction prompt shows correct tool action label
- Multiple interactables: closest one is highlighted

### 4. Tool System Integration
- Tool HUD visible in Let It Grow mode, hidden in Story Mode
- Number keys switch tools
- Selected tool determines interaction result
- Cooldowns prevent rapid re-use
- Tool actions dispatch correct store actions

### 5. Mode Selector Integration
- New game shows mode selection
- Story Mode boots without movement/tools
- Let It Grow boots with movement/tools
- Save includes mode, load restores correct mode
- Old saves (no mode field) default to Story Mode

### 6. Story Mode Regression
- Full season playthrough still works in Story Mode
- Phase machine, events, interventions, scoring all unchanged
- Cutscenes play correctly
- Save/load works as before

## Approach

1. Review all Phase 1 code (Phases 1A through 1G + mode selector)
2. Identify integration points between systems
3. Write tests that exercise cross-system flows
4. Add to `src/test/integration.test.js` (extend Phase 0E harness)
5. Use test helpers for setup/teardown

## Constraints

- Use Vitest
- Mock Three.js renderer if needed (GPU not available in test env)
- Mock InputManager key events with simulated dispatch
- Tests must run in < 10 seconds
- No flaky tests (no timing-dependent assertions)

## Deliverable

- Extended `src/test/integration.test.js` with Phase 1 test suite
- All tests passing: `npx vitest run`

## After completing changes

- Commit with message: `test: add Phase 1 integration tests for movement, tools, and mode selection`
- Do NOT push
