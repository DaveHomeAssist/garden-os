# Claude Prompt — Phase 3B: Ambient Sound Design Spec

## Task

Design the complete audio specification for Garden OS: seasonal ambient tracks, SFX triggers, and audio integration points. Output as `specs/AUDIO_SPEC.md`.

## What to Design

### 1. Seasonal Ambient Tracks

For each season, describe the ambient soundscape:

| Season | Primary Sounds | Secondary Sounds | Mood |
|--------|---------------|-----------------|------|
| Spring | Bird songs (robin, sparrow), gentle breeze | Water trickle, distant church bell | Fresh, hopeful |
| Summer | Cicadas, warm wind | Sprinkler, distant lawnmower, bees | Warm, industrious |
| Fall | Rustling leaves, geese honking overhead | Cool breeze, acorn drops | Crisp, nostalgic |
| Winter | Quiet snowfall ambience, distant wind | Fireplace crackle (indoor zones), crow caw | Peaceful, sparse |

### 2. SFX Catalog

Define every sound effect with trigger, duration, priority, and description:

| ID | Trigger | Duration | Priority | Description |
|----|---------|----------|----------|-------------|
| plant | PLANT_CROP action | 0.3s | Medium | Soft earth thud + seed drop |
| water | WATER_CELL action | 0.5s | Medium | Water splash + trickle |
| harvest | HARVEST_CELL action | 0.4s | High | Satisfying pluck/pop |
| ... | ... | ... | ... | ... |

Include SFX for: planting, watering, harvesting, tool switching, UI clicks, tab switches, quest accept, quest complete, reputation gain, level up, event positive, event negative, festival start, zone transition, footsteps (grass, dirt, stone), NPC greeting, dialogue advance, choice select.

### 3. Audio Layers and Mixing

Define the audio mix hierarchy:
- Layer 1 (base): Seasonal ambient loop (-12dB)
- Layer 2 (atmosphere): Day/night modifiers (-18dB)
- Layer 3 (events): Weather SFX during events (-6dB, duck ambient)
- Layer 4 (SFX): Player action sounds (0dB reference)
- Layer 5 (UI): Interface sounds (-6dB)

### 4. Transition Rules

- Season change: crossfade ambient over 3 seconds
- Zone transition: fade out → silence → fade in new zone ambient
- Event start: duck ambient by 6dB, layer weather SFX
- Festival: add festival-specific ambient layer (music, crowd)
- Day/night: gradual volume shift of bird/insect sounds

### 5. Accessibility

- All audio optional (mute/unmute)
- Separate volume sliders for: Master, SFX, Ambient
- Visual indicators for audio events (for hearing-impaired players)
- No gameplay-critical information conveyed only through audio

### 6. Technical Notes for Implementation

- SFX via Web Audio API (low latency, buffer-based)
- Ambient via `<audio>` element (streaming, loop)
- Crossfade: two audio elements, inverse volume ramps
- AudioContext lazy-init (browser autoplay policy)
- File formats: `.ogg` primary (broad support), `.mp3` fallback
- File size budget: ambient tracks < 500KB each, SFX < 50KB each

### 7. Placeholder Strategy

Until real audio assets are produced:
- Web Audio API oscillator-based placeholder SFX (sine/square/noise)
- Define exact frequency, duration, envelope for each placeholder
- Document which placeholders to replace with real assets later

## Deliverable

- `specs/AUDIO_SPEC.md` — complete audio design document
- Covers all 4 sections above
- Includes placeholder oscillator definitions for all SFX
- Ready for AudioManager implementation (Phase 3A) to reference

## After completing changes

- Commit with message: `spec: add comprehensive audio design specification`
- Do NOT push
