---
Status: Active
Document Version: 1.0
Compatible With: Garden OS v4.3
Owner: Dave Robertson
Last Updated: 2026-03-22
Artifact Class: Spec
---

# Audio Design Specification — Garden OS

> Canonical reference for all audio in Garden OS. The AudioManager (Phase 3A) implements this spec.

## 1. Seasonal Ambient Tracks

### Spring
- **Primary:** Robin song (melodic, every 8–12 s), sparrow chatter (soft, continuous), gentle breeze (low hum, looped)
- **Secondary:** Water trickle (faint, 15 s loop), distant church bell (single toll every 60 s, very low)
- **Mood:** Fresh, hopeful, awakening
- **Mix:** Robin at −6 dB, sparrow at −12 dB, breeze at −18 dB, trickle at −20 dB, bell at −24 dB
- **Cadence:** Birds more active at cycle start, taper slightly mid-loop, swell again before loop restart

### Summer
- **Primary:** Cicadas (rhythmic pulse, 4 s on / 2 s off, looped), warm wind (deeper than spring breeze, continuous)
- **Secondary:** Sprinkler (tsk-tsk-tsk pattern, every 20 s), distant lawnmower (low drone, fades in/out over 30 s), bees (gentle buzz, continuous)
- **Mood:** Warm, industrious, full of life
- **Mix:** Cicadas at −8 dB, wind at −14 dB, sprinkler at −18 dB, mower at −22 dB, bees at −16 dB
- **Cadence:** Cicadas peak intensity mid-loop, mower drifts in and out

### Fall
- **Primary:** Rustling leaves (continuous, papery texture), geese honking overhead (V-formation call, every 45 s, pans left to right)
- **Secondary:** Cool breeze (sharper than summer wind, intermittent gusts every 10 s), acorn drops (random single thuds, 2–3 per minute)
- **Mood:** Crisp, nostalgic, winding down
- **Mix:** Leaves at −10 dB, geese at −12 dB, breeze at −16 dB, acorns at −20 dB
- **Cadence:** Gusts create natural crescendo/decrescendo; geese distant then close then fade

### Winter
- **Primary:** Quiet snowfall ambience (very soft white noise, continuous), distant wind (hollow, low, looped)
- **Secondary:** Fireplace crackle (indoor zones only, warm pops), crow caw (single call, every 30–40 s)
- **Mood:** Peaceful, sparse, contemplative
- **Mix:** Snow at −20 dB, wind at −16 dB, fireplace at −10 dB (indoor only), crow at −14 dB
- **Cadence:** Minimal variation — winter is deliberately quiet to contrast other seasons

---

## 2. SFX Catalog

| ID | Trigger | Duration | Priority | Description |
|----|---------|----------|----------|-------------|
| `plant` | PLANT_CROP | 300 ms | Medium | Soft earth thud + seed drop |
| `water` | WATER_CELL | 500 ms | Medium | Water splash + gentle trickle |
| `harvest` | HARVEST_CELL | 400 ms | High | Satisfying pluck/pop + rustle |
| `tool_select` | TOOL_SELECT | 150 ms | Low | Metallic click/clink |
| `ui_click` | ui_click | 80 ms | Low | Soft button tap |
| `ui_tab` | ui_tab | 120 ms | Low | Paper page turn |
| `quest_accept` | ACCEPT_QUEST | 500 ms | High | Bright chime ascending |
| `quest_complete` | COMPLETE_QUEST | 800 ms | High | Triumphant fanfare (3-note rising) |
| `rep_gain` | REP_GAIN | 400 ms | Medium | Warm sparkle shimmer |
| `level_up` | LEVEL_UP | 1200 ms | High | Ascending arpeggio + shimmer burst |
| `event_positive` | EVENT_POSITIVE | 600 ms | High | Bright major chord swell |
| `event_negative` | EVENT_NEGATIVE | 600 ms | High | Low minor chord + rumble |
| `festival_start` | FESTIVAL_START | 1500 ms | High | Celebratory horn + crowd cheer |
| `zone_transition` | ZONE_TRANSITION | 1000 ms | High | Whoosh + soft chime |
| `step_grass` | step_grass | 150 ms | Low | Soft crunch, randomize pitch ±10% |
| `step_dirt` | step_dirt | 150 ms | Low | Firm thud, drier than grass |
| `step_stone` | step_stone | 150 ms | Low | Hard tap, slight echo |
| `npc_greet` | npc_greet | 300 ms | Medium | Friendly two-note chime |
| `dialogue_next` | dialogue_next | 100 ms | Low | Soft blip/tick |
| `choice_select` | choice_select | 200 ms | Medium | Confirmatory click + subtle tone |
| `inv_open` | inv_open | 250 ms | Low | Bag/pouch opening rustle |
| `inv_close` | inv_close | 200 ms | Low | Bag/pouch closing snap |
| `item_pickup` | item_pickup | 200 ms | Medium | Light chime + swoosh |
| `item_use` | item_use | 300 ms | Medium | Context-dependent (mapped per item type) |
| `craft_start` | craft_start | 400 ms | Medium | Hammer tap + material shuffle |
| `craft_complete` | craft_complete | 600 ms | High | Anvil ring + sparkle |
| `save_game` | save_game | 400 ms | Medium | Pen scratch + page close |
| `ui_error` | ui_error | 250 ms | Medium | Low buzz/denied tone |

---

## 3. Audio Layers and Mixing

| Layer | Name | Base Level | Content | Behavior |
|-------|------|-----------|---------|----------|
| 1 | Base Ambient | −12 dB | Seasonal loop | Always playing, loops seamlessly |
| 2 | Atmosphere | −18 dB | Day/night modifiers | Crossfades with cycle; birds fade at night, insects rise |
| 3 | Events | −6 dB | Weather/event SFX | Ducks ambient by 6 dB while active |
| 4 | SFX | 0 dB (ref) | Player action sounds | One-shot, highest priority |
| 5 | UI | −6 dB | Interface sounds | One-shot, never ducks other layers |

### Polyphony Rules
- Maximum 4 simultaneous SFX (Layer 4)
- Maximum 2 simultaneous UI sounds (Layer 5)
- If limit reached, lowest-priority sound is dropped
- Footsteps never interrupt action SFX

---

## 4. Transition Rules

### Season Change
- **Method:** 3-second linear crossfade
- **Implementation:** Two `<audio>` elements; outgoing ramps from current to 0, incoming ramps from 0 to target
- **Timing:** Triggered on SEASON_TRANSITION store action

### Zone Transition
- **Method:** Fade out (500 ms) → silence (200 ms) → fade in (500 ms)
- **Implementation:** Current ambient fades to 0, new zone ambient starts from 0
- **Zone-specific tracks:** Each zone has its own ambient variant (see zone `ambientAudio` field in WORLD_MAP.json)

### Event Start/End
- **Start:** Duck ambient (Layer 1) by 6 dB over 500 ms, layer weather SFX (Layer 3)
- **End:** Remove weather SFX, restore ambient over 500 ms
- **Mood override:** Event mood lighting may also trigger atmosphere layer change

### Festival
- **Activation:** Add festival ambient sub-layer (crowd murmur, distant music) at −12 dB
- **Deactivation:** Fade festival layer out over 2 s, restore normal ambient

### Day/Night Cycle
- **Method:** Gradual volume shift over 10 s when cycle phase changes
- **Dawn:** Bird volume rises from −24 to −6 dB; insect volume drops from −8 to −20 dB
- **Dusk:** Reverse of dawn
- **Night:** Insects prominent, birds silent; add cricket layer at −12 dB
- **Disabled by default:** When cycle is off, use season-default ambient (daytime levels)

---

## 5. Accessibility

### Controls
- **Master volume:** 0–100%, default 80%
- **SFX volume:** 0–100%, default 100% (applied on top of master)
- **Ambient volume:** 0–100%, default 100% (applied on top of master)
- **Mute toggle:** Single button mutes all audio; state persists in localStorage

### Visual Indicators
- Planting/harvesting: particle burst accompanies SFX
- Events: screen flash/border glow for positive/negative
- Level up: text banner + particle effect
- Quest complete: notification badge + text
- **No gameplay-critical information is conveyed only through audio**

### Reduced Motion
- When `prefers-reduced-motion` is set, skip audio-triggered animations but still play sounds

---

## 6. Technical Notes

### SFX Playback (Layer 4 & 5)
- **API:** Web Audio API (`AudioContext`)
- **Buffer management:** Pre-decode all SFX into `AudioBuffer` on first user gesture
- **Playback:** `AudioBufferSourceNode` → `GainNode` → `AudioContext.destination`
- **Latency:** < 10 ms for pre-loaded buffers

### Ambient Playback (Layer 1 & 2)
- **API:** HTML `<audio>` element with `loop` attribute
- **Streaming:** No pre-load; streams from file
- **Crossfade:** Two elements per layer, inverse gain ramps via `Web Audio API` `MediaElementSourceNode`

### AudioContext Initialization
- **Lazy init:** Create `AudioContext` on first user gesture (`click`, `touchstart`, `keydown`)
- **Resume:** If context is suspended (autoplay policy), resume on gesture
- **State check:** Before any play call, verify `audioContext.state === 'running'`

### File Formats
- **Primary:** `.ogg` (Vorbis) — broad browser support, good compression
- **Fallback:** `.mp3` — for Safari/older browsers
- **Detection:** Test `Audio.canPlayType('audio/ogg')`, fall back to `.mp3`

### File Size Budget
- Ambient tracks: < 500 KB each (30–60 s loops, mono, 64 kbps)
- SFX: < 50 KB each (most under 10 KB)
- Total audio budget: < 5 MB

### Memory Management
- Decode SFX buffers once, reuse
- Only one ambient track loaded per layer at a time
- On zone transition: release previous zone's ambient `<audio>` element `src`

---

## 7. Placeholder Strategy

Until real audio assets are produced, the AudioManager generates all sounds using Web Audio API oscillators. Each placeholder is defined below.

### Placeholder SFX Definitions

| ID | Oscillator | Freq (Hz) | Duration (ms) | Envelope (A/D/S/R ms) | Gain | Notes |
|----|-----------|-----------|---------------|----------------------|------|-------|
| `plant` | triangle | 180 | 300 | 10/50/150/90 | 0.3 | Low thump, earthy feel |
| `water` | sine | 400→200 | 500 | 20/80/300/100 | 0.25 | Descending pitch = splash |
| `harvest` | sine | 600→800 | 400 | 5/30/200/165 | 0.35 | Ascending = pluck satisfaction |
| `tool_select` | square | 1200 | 150 | 5/20/80/45 | 0.15 | Sharp metallic click |
| `ui_click` | sine | 800 | 80 | 5/10/40/25 | 0.1 | Subtle tap |
| `ui_tab` | triangle | 500 | 120 | 10/20/60/30 | 0.12 | Soft page feel |
| `quest_accept` | sine | 400→600→800 | 500 | 10/40/350/100 | 0.3 | 3-step ascending chime |
| `quest_complete` | sine | 500→700→900→1100 | 800 | 10/50/600/140 | 0.4 | 4-step triumphant rise |
| `rep_gain` | sine | 600→900 | 400 | 20/60/220/100 | 0.25 | Warm shimmer upward |
| `level_up` | sine+square | 400→600→800→1000→1200 | 1200 | 10/50/900/240 | 0.4 | Arpeggio sweep |
| `event_positive` | sine | 500+700 (chord) | 600 | 30/100/350/120 | 0.3 | Major third chord |
| `event_negative` | sawtooth | 200+240 (chord) | 600 | 30/100/350/120 | 0.3 | Minor second = tension |
| `festival_start` | square+sine | 600→800 | 1500 | 50/200/1000/250 | 0.35 | Fanfare-like brass |
| `zone_transition` | noise→sine | noise→400 | 1000 | 100/300/400/200 | 0.2 | Whoosh into tone |
| `step_grass` | noise | — | 150 | 5/30/80/35 | 0.08 | Filtered white noise burst |
| `step_dirt` | noise | — | 150 | 5/20/90/35 | 0.1 | Slightly louder, lower filter |
| `step_stone` | square | 2000 | 150 | 2/20/80/48 | 0.08 | High click, slight reverb feel |
| `npc_greet` | sine | 500→700 | 300 | 10/40/180/70 | 0.2 | Friendly two-note |
| `dialogue_next` | sine | 900 | 100 | 5/15/50/30 | 0.1 | Quick blip |
| `choice_select` | sine | 700→900 | 200 | 5/30/120/45 | 0.15 | Confirming uptick |
| `inv_open` | noise | — | 250 | 20/50/130/50 | 0.12 | Filtered burst = rustle |
| `inv_close` | noise | — | 200 | 10/40/100/50 | 0.1 | Shorter rustle |
| `item_pickup` | sine | 800→1200 | 200 | 5/30/120/45 | 0.2 | Quick ascending chime |
| `item_use` | triangle | 400 | 300 | 10/50/160/80 | 0.2 | Neutral action tone |
| `craft_start` | square | 300→400 | 400 | 10/60/230/100 | 0.2 | Rhythmic tap feel |
| `craft_complete` | sine+square | 800→1200 | 600 | 10/50/400/140 | 0.35 | Ring + sparkle |
| `save_game` | sine | 600→500 | 400 | 10/40/250/100 | 0.15 | Descending = "settled" |
| `ui_error` | sawtooth | 150 | 250 | 5/30/150/65 | 0.2 | Low buzz = denied |

### Placeholder Ambient

For ambient placeholders, use a combination of oscillators to create minimal loops:
- **Spring:** Sine at 300 Hz (bird-like), amplitude modulated at 0.5 Hz, gain 0.05
- **Summer:** Sawtooth at 100 Hz (cicada buzz), amplitude modulated at 2 Hz, gain 0.04
- **Fall:** Filtered noise (wind), bandpass 200–600 Hz, gain 0.03
- **Winter:** Very low filtered noise, bandpass 50–200 Hz, gain 0.02

These are intentionally minimal — clearly synthetic placeholders that make it obvious when real assets haven't been loaded yet.

### Replacement Plan

When real audio assets are added:
1. Place files in `assets/audio/sfx/` and `assets/audio/ambient/`
2. AudioManager checks for file existence before falling back to oscillator
3. File naming convention: `{id}.ogg` / `{id}.mp3` (e.g., `plant.ogg`, `spring_ambient.ogg`)
4. Ambient tracks: `{season}_{zone}.ogg` (e.g., `spring_meadow.ogg`, `winter_greenhouse.ogg`)
