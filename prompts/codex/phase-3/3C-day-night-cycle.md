# Codex Prompt — Phase 3C: Day/Night Lighting Cycle

## Task

Add an optional day/night visual cycle to the garden scene by extending `src/scene/weather-fx.js` and `src/scene/garden-scene.js`.

## Context

The garden scene has 8 mood presets (Dawn, Calm, Storm, Heat, Harvest Gold, Night, Celebration, Loss) that set lighting parameters. The day/night cycle smoothly transitions between Dawn → Calm → Heat → Night → Dawn on a configurable timer.

## Deliverable

### 1. Add to weather-fx.js: `DayNightCycle` class

```js
export class DayNightCycle {
  constructor(scene, options = {}) {
    // scene — Three.js scene with existing lighting rig
    // options.cycleDurationMs — full day cycle length (default: 300000 = 5 minutes)
    // options.enabled — whether cycle runs (default: false)
  }

  // Enable/disable the cycle
  setEnabled(enabled) { ... }

  // Set current time of day (0–1, where 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight)
  setTimeOfDay(t) { ... }

  // Get current time of day (0–1)
  getTimeOfDay() { ... }

  // Update — call each frame with delta time
  update(dt) { ... }

  // Set cycle speed
  setCycleDuration(ms) { ... }
}
```

### 2. Lighting Interpolation

Time of day (0–1) maps to lighting states:

| Time | Phase | Directional Light Color | Intensity | Hemisphere Sky | Ground | Ambient |
|------|-------|------------------------|-----------|---------------|--------|---------|
| 0.0 | Dawn | #FFB366 | 0.6 | #FFD4A3 | #5A3E20 | 0.4 |
| 0.25 | Noon | #FFFFF0 | 1.0 | #87CEEB | #8FBC8F | 0.6 |
| 0.5 | Dusk | #FF7F50 | 0.5 | #CD853F | #3E2723 | 0.35 |
| 0.75 | Night | #4169E1 | 0.15 | #1A1A3E | #0D0D1A | 0.15 |

Interpolate between these keyframes using smooth hermite curves (not linear — avoid harsh transitions).

### 3. Visual Effects by Time

| Time Range | Effect |
|------------|--------|
| 0.0–0.1 | Dawn mist (particle fog, low opacity) |
| 0.2–0.3 | Sun rays active (existing weather-fx) |
| 0.6–0.8 | Fireflies (existing from scenery.js, enable for summer) |
| 0.75–0.95 | Stars (small white points on sky dome) |
| 0.9–1.0 | Moon light (cool directional fill) |

### 4. Shadow Adjustment

- Sun direction rotates with time of day (east → overhead → west)
- Shadow intensity follows light intensity
- At night: shadow intensity near zero

### 5. Integration

- DayNightCycle instance created in garden-scene.js
- Toggled via store setting: `settings.dayNightEnabled` (default: false)
- Pause menu includes toggle switch
- When disabled: lighting uses existing mood presets as before
- When enabled: mood presets are overridden by cycle (events can still temporarily override)

### 6. Modify garden-scene.js

- Accept DayNightCycle as optional component
- In render loop: if cycle enabled, call `dayNight.update(dt)` before render
- Expose `setDayNightEnabled(bool)` method

## Constraints

- No external dependencies
- Must not break existing mood preset system (presets take priority over cycle when triggered)
- Performance: interpolation must be cheap (< 0.1ms per frame)
- Smooth transitions — no popping or flickering
- Works with existing shadow mapping
- Optional — game is fully playable with cycle disabled

## Testing

- Manual: enable cycle — lighting smoothly transitions through day/night
- Manual: disable cycle — mood presets work as before
- Manual: trigger an event during cycle — event mood takes over, then cycle resumes
- Manual: verify shadows rotate with sun direction
- Manual: verify performance stays at 60fps
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add optional day/night lighting cycle`
- Do NOT push
