# Codex Prompt — Phase 3A: Audio Manager

## Task

Create `src/audio/audio-manager.js` — a centralized audio system using Web Audio API for SFX and `<audio>` elements for ambient/music tracks.

## Context

Garden OS is currently completely silent. This phase adds ambient seasonal soundscapes and SFX for player actions. Audio files will be loaded from an `assets/audio/` directory.

## Deliverable

Create `src/audio/audio-manager.js`:

```js
export class AudioManager {
  constructor() {
    // Lazy-init AudioContext on first user interaction (browser policy)
  }

  // Initialize — call after first user gesture (click/tap)
  async init() { ... }

  // --- SFX ---

  // Register a sound effect
  // options: { volume: 0-1, pitch: 1.0, cooldownMs: 0 }
  registerSFX(id, url, options = {}) { ... }

  // Play a registered SFX (fire-and-forget)
  playSFX(id) { ... }

  // --- Ambient/Music ---

  // Set the ambient track (crossfades if one is playing)
  // Loops automatically
  setAmbient(url, { fadeInMs = 2000, volume = 0.3 } = {}) { ... }

  // Stop ambient with fade-out
  stopAmbient(fadeOutMs = 2000) { ... }

  // --- Volume Controls ---

  // Master volume (affects everything)
  setMasterVolume(v) { ... } // 0–1

  // SFX volume multiplier
  setSFXVolume(v) { ... } // 0–1

  // Ambient volume multiplier
  setAmbientVolume(v) { ... } // 0–1

  // Mute all
  setMuted(muted) { ... }

  // --- Lifecycle ---

  // Suspend audio (when tab hidden, pause menu)
  suspend() { ... }

  // Resume audio
  resume() { ... }

  // Cleanup
  dispose() { ... }
}
```

### SFX Registry (Default Set)

| ID | Trigger | Description |
|----|---------|-------------|
| `plant` | Player plants a crop | Soft earth/dig sound |
| `water` | Player waters a cell | Water splash |
| `harvest` | Player harvests | Pluck/pop |
| `event_good` | Positive event resolves | Chime |
| `event_bad` | Negative event resolves | Low thud |
| `ui_click` | UI button press | Soft click |
| `ui_tab` | Tab switch | Paper shuffle |
| `tool_switch` | Tool selection change | Metal clink |
| `footstep` | Player movement | Soft grass step |
| `quest_accept` | Quest accepted | Bright ding |
| `quest_complete` | Quest turned in | Fanfare chime |

### Ambient Tracks (Per Season)

| Season | Mood | Description |
|--------|------|-------------|
| Spring | Fresh, birdsong | Birds, gentle breeze, water trickle |
| Summer | Warm, insects | Cicadas, warm wind, distant lawnmower |
| Fall | Crisp, rustling | Leaves, geese, cool breeze |
| Winter | Quiet, sparse | Snow ambience, distant wind, indoor warmth |

### Integration

- AudioManager is a singleton instantiated at boot
- `init()` called on first user click/tap (create a one-time click handler)
- SFX triggered by store subscription (listen for specific actions)
- Ambient changed on season transition
- Volume controls exposed in pause menu UI
- `suspend()`/`resume()` tied to `document.visibilitychange` event

### Audio Files

Since we can't include actual audio files, use the following approach:
- Create `assets/audio/` directory with placeholder `.txt` files documenting expected audio
- AudioManager should gracefully handle missing audio files (console.warn, no crash)
- Use Web Audio API oscillators as fallback SFX if files aren't loaded (simple beeps/tones)

## Constraints

- No external dependencies (no Howler.js, no Tone.js)
- Must handle browser autoplay policy (AudioContext starts suspended)
- Must not crash if audio files are missing
- Crossfade between ambient tracks (no silence gap)
- SFX must be low-latency (Web Audio API buffers, not `<audio>` elements)
- Memory: don't pre-load all audio at once — load on demand, cache after first use

## Testing

- Manual: trigger SFX — sound plays (or fallback tone plays)
- Manual: change season — ambient crossfades
- Manual: mute/unmute — works correctly
- Manual: switch tabs and back — audio suspends/resumes
- Unit test: volume clamping, mute state, registration
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add audio manager with SFX and seasonal ambient tracks`
- Do NOT push
