# Garden OS — Juice Layer Design Document

*Internal Game Feel Documentation v1.0*

---

## 1. Feedback Priority Matrix

| Priority | Action | Why It Needs Juice |
|----------|--------|--------------------|
| 1 | **Harvest** | The payoff moment. If this feels flat, the whole loop deflates. |
| 2 | **Crop placement** | The most-repeated action. Must feel precise, tactile, and satisfying every single time. |
| 3 | **Invalid placement** | Players hit this often during experimentation. Must redirect without punishing. |
| 4 | **Score reveal** | The reflective capstone. Needs to feel earned and readable. |
| 5 | **Seasonal transition** | Marks the passage of time. Grounds the fiction. |
| 6 | **Commit (lock in layout)** | The moment of no return. Needs weight without anxiety. |
| 7 | **Event card arrival** | Disruptions must announce themselves clearly but not feel hostile. |
| 8 | **Character commentary** | Warmth and personality. Timing matters more than spectacle. |
| 9 | **Menu / navigation** | Ambient polish. Should feel like handling real things. |
| 10 | **Undo** | Relief valve. Quick, clean, no shame. |

---

## 2. Placement Feedback

### The Feel Target
Placing a crop should feel like pressing a seed into soft, giving soil — a small, satisfying, grounded moment.

### Visual

- **Grid cell highlight on hover:** Subtle warm glow, `background-color` shifts to slightly lighter, warmer tone. Transition: `150ms ease-out`.
- **On place:** Crop sprite enters with gentle **scale-up from 0.85 to 1.0** over `180ms`, eased with `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot that settles.
- **Soil response:** Tiny radial ripple from placement point — two concentric rings of slightly darker soil that expand `8px` and fade over `300ms`. Water absorbing into earth, not a shockwave.
- **Neighboring crops:** Adjacent occupied cells get a micro-nudge — `1px` shift toward the new placement and back, over `200ms ease-in-out`. The bed feels like a living arrangement.
- **Companion bonus indicator:** If good companion, a thin golden thread fades in between them over `400ms`. Subtle. No particle effects.

### Audio

- Soft, dry **press** sound — cloth on soil, thumb into damp earth. Short attack, almost no sustain. Pitch-shifted slightly per crop type for natural variation.
- Companion bonus: gentle two-note ascending chime, soft woodblock or kalimba. `200ms` after placement. Quiet enough to feel like a secret.

---

## 3. Invalid Placement Feedback

### The Feel Target
A gentle "not here" — like trying to place a puzzle piece that almost fits. The game is on your side.

### Visual

- **No violent red flash.** Cell shows soft desaturated overlay, crop sprite does **horizontal micro-shake**: `3px` left, `3px` right, center, over `250ms`. Two oscillations maximum.
- Crop sprite ghosts back to cursor at `0.6` opacity — "you still have this, try somewhere else."
- If spatial conflict: occupied neighbors gently pulse once — `5%` brightness shift over `300ms`.
- **Tooltip:** Small, warm-toned label fades in `200ms` after shake: "Tomatoes need more sun" or "Too close to the edge for squash." Conversational, not error-coded. Fades after `2s`.

### Audio

- Soft hollow **tok** — like tapping a clay pot. Not a buzzer. Same family as placement sound but emptier, slightly lower pitch.

### What to Avoid

Red X icons, screen shake, error beeps, modal popups. Nothing that makes the player feel they did something wrong. They are experimenting. The garden is patient.

---

## 4. Harvest Feedback

### The Feel Target
A deep exhale. The satisfaction of pulling a ripe tomato off the vine. This is the game's most emotionally loaded moment.

### Sequence (total ~1.8s per crop, staggered across bed)

**Phase 1 — Readiness (0-200ms)**
Ripe crop has gentle breathing animation — `2%` scale oscillation at `1.2s` period. On harvest trigger, this pauses.

**Phase 2 — The Pull (200-500ms)**
Crop lifts `4px` upward over `150ms ease-out`, then releases with satisfying **pop**: scale to `1.08` then back to `1.0` over `150ms cubic-bezier(0.34, 1.56, 0.64, 1)`. Small puff of soil particles (3-5 tiny brown circles) drift outward and fade over `400ms`.

**Phase 3 — The Collect (500-1000ms)**
Crop sprite floats upward toward harvest tally area. Gentle arc path (quadratic bezier). `500ms ease-in`. Fades to `0.0` opacity in last `150ms`.

**Phase 4 — The Tally (1000-1200ms)**
Harvest counter increments with small **bounce**: number scales `1.0` to `1.15` and back over `200ms`. Good yield: warm golden glow pulses behind counter once.

**Phase 5 — Soil Rest (1000-1800ms)**
Empty cell transitions: soil color shifts from rich worked brown to softer resting tone over `800ms`. The cell isn't empty; it's resting.

### Stagger Timing
Crops don't harvest simultaneously. `120ms` delays, sweeping diagonally from top-left. Full bed: ~3.8s. Player can skip with tap/click (completes in `300ms` fast-forward).

### Audio — The Harvest Song

- **Per-crop:** Gentle pluck — nylon guitar string or soft marimba. Each crop type maps to a note in pentatonic scale. Root: Eb. Scale: Eb, F, Ab, Bb, Db.
- **Stagger creates melody:** Because harvests are staggered and crops are spatially arranged, different garden layouts produce different harvest songs. This is a consequence of the player's design. This is the deepest piece of juice in the game and should never be called out explicitly. Let players discover it.
- **Ambient swell:** Soft pad chord swells over `2s`, fades over `3s`. Warm, major-leaning. Bowed vibraphone or harmonium if budget allows.

---

## 5. Score Reveal Feedback

### The Feel Target
Quiet pride. Stepping back from a finished garden and seeing it whole. Not a slot machine — a considered evaluation.

### Sequence (total ~8-10s, unhurried)

**The Six Factors — Count-Up Phase (0-6000ms)**

Each factor gets its own moment. One at a time, `800ms` between each.

Per factor:
1. **Label fades in** — `200ms ease-out`
2. **Score counts up** — 0 to final over `600ms ease-out`
3. **Ring gauge fills** — proportionally over same `600ms`. Stroke: `3px`. Color: desaturated gold for high, warm grey for low. `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
4. **Settle** — `1px` downward shift, `100ms ease-out`

**The Total — Summation Phase (6000-7500ms)**
- Thin rule line draws itself across score panel: `400ms ease-in-out`
- Total counts up: `800ms ease-out`. Slightly larger type.
- Total ring gauge fills: thicker arc (`5px` stroke)

**The Grade Badge (7500-9000ms)**
- Letter grade fades in and scales `0.9` to `1.0` over `500ms ease-out`
- No fanfare for any grade. An A gets the same entrance as a C. The warmth is consistent.
- One-line authored comment fades in `400ms`, delayed `300ms` after grade

### Audio
- Per-factor: soft ascending tick pattern — quiet ratchet or fingernail on wooden beads
- Total reveal: single warm chord. IV-I cadence on fingerpicked acoustic guitar or Rhodes. `2s` sustain.
- Grade badge: silence. Let the visual speak.

---

## 6. Seasonal Transition Feedback

### The Feel Target
Time passing gently. Not a hard cut — a slow dissolve.

### Visual (3.0-4.0s total)

1. **Light shift (0-2000ms):** Global color grading shifts. Spring-to-summer: cool greens warm to golden. Summer-to-fall: golds deepen to ambers.
2. **Crop growth (500-3000ms):** Plants cross-fade to next growth state over `400ms`, staggered with `80ms` delays (diagonal sweep).
3. **Ambient details (1000-3500ms):**
   - Spring: faint mist dissipates, bird crosses background
   - Summer: `1px` heat shimmer at `0.3Hz`
   - Fall: one single leaf drifts across. One. Not a shower.

### Audio
- `3s` ambient crossfade between seasonal soundscapes
- Single transitional sound: wind chimes (spring-to-summer), crickets fading (summer-to-fall), distant screen door (fall's end)

---

## 7. Event Card Feedback

### The Feel Target
A knock at the door. Not an alarm — an arrival.

### Entry (~800ms)
1. Garden dims to `70%` brightness, `300ms ease-out`
2. Card slides in from bottom, `60px` travel, `500ms cubic-bezier(0.16, 1, 0.3, 1)`
3. Content fades in with `50ms` stagger between title and body

### Event Type Differentiation
- **Positive:** Warm gold border. Ascending two-note figure.
- **Neutral:** No border. Soft page-turn sound.
- **Negative:** Muted terracotta border (not red). Low soft wooden thud.

### Dismissal
Slides down `40px`, fades out `300ms`. Garden returns to `100%` brightness.

---

## 8. Character Reaction Timing

### Timing Rules

| Trigger | Delay Before Character Speaks | Why |
|---------|-------------------------------|-----|
| Crop placed | `600-800ms` after animation | Observing, then reacting |
| Invalid placement | `400ms` after shake | Trying to help, but after visual |
| Harvest begins | `1.5s` after first crop | Let player absorb the wave |
| Score revealed | `500ms` after grade badge | Comment IS the reaction |
| Seasonal transition | `1.0s` after completion | Remarks on what changed |
| Event card | `300ms` after card visible | Reacts alongside player |

### Frequency Cap
**1-in-3 rule:** Characters react to roughly one in three placements. Favor companion bonuses, unusual choices, first/last placement. Silence is part of the personality.

---

## 9. Sound Design Suggestions

### Ambient Bed (always running, low volume)

| Season | Soundscape |
|--------|------------|
| **Spring** | Distant city hum. House sparrows (not generic chirps). Neighbor's screen door. Light wind. |
| **Summer** | Cicadas (Philadelphia has them). Window AC unit in distance. Kids on a far-off block. |
| **Fall** | Wind through dry leaves. Fewer birds. Church bell from a few blocks over, very faint, once per session. |

Loops: `90-120s` with gentle crossfade. Volume: `-18dB` below UI sounds. Mono or narrow stereo — small backyard, not nature documentary.

### UI Sound Palette

| Element | Sound Character | Duration |
|---------|----------------|----------|
| Button hover | Soft cloth brush | `50ms` |
| Button press | Wooden latch, soft click | `80ms` |
| Menu open | Paper unfold | `200ms` |
| Menu close | Paper fold (reverse) | `150ms` |
| Undo | Reverse placement, pitched down | `120ms` |
| Commit (lock layout) | Satisfying clasp — closing wooden box lid | `300ms` |
| Tab switch | Soft page turn | `150ms` |

### Principles
- **Material palette:** Wood, soil, clay, cloth, paper, nylon string. Nothing metallic except wind chimes. Nothing digital.
- **Pitch variation:** `±2 semitones` random per play on frequent sounds
- **Spatial:** Subtle stereo panning by cell position. `±15%` maximum.

---

## 10. Music Identity

### Instrumentation
- **Core:** Fingerpicked nylon-string guitar. This is the voice of the game.
- **Support:** Soft upright piano (slightly detuned for warmth). Bowed vibraphone. Single cello.
- **Texture:** Field recordings woven in — pencil on paper, watering can set down, soil turned. Threshold of perception.
- **Avoid:** Synths, electronic drums, orchestral swells, chiptune.

### Seasonal Variation (same melody, different arrangement)

| Season | Shift |
|--------|-------|
| **Spring** | Guitar alone or + light piano. Major key. Open, tentative. |
| **Summer** | Fuller — add cello, vibraphone. More confident. `+5 BPM`. |
| **Fall** | Strip back to near-solo guitar. Modal. More knowing. `-5 BPM` from spring. |

### Dynamic Rules
- **Layout phase:** Music plays. Ambient up slightly.
- **Harvest:** Music fades to `-12dB` to make room for harvest pluck melody. Resumes after score.
- **Score reveal:** Music absent during count-up. Grade badge triggers gentle resolution phrase, `4-6s`.
- **Idle (15s no input):** Music fades to `50%`. Ambience rises. The garden breathes.

---

## 11. Motion Design Guidelines

### Easing Reference

| Use Case | Curve | Character |
|----------|-------|-----------|
| Elements entering | `cubic-bezier(0.16, 1, 0.3, 1)` | Arrives with momentum, settles gently |
| Elements exiting | `cubic-bezier(0.55, 0, 1, 0.45)` | Accelerates away, no lingering |
| State changes | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Smooth natural deceleration |
| Bouncy/organic | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot, life-like |
| Looping/breathing | `ease-in-out` (sine) | Calm, continuous, meditative |

### Duration Reference

| Category | Range | Notes |
|----------|-------|-------|
| Micro-interactions | `50-150ms` | Must feel instant |
| Small feedback | `150-300ms` | Perceptible but quick. The "tactile" range. |
| Medium transitions | `300-600ms` | Deliberate. Player watches these. |
| Large transitions | `1000-4000ms` | Cinematic. Player absorbs these. |
| Stagger delays | `60-120ms` | Creates wave/cascade without feeling slow |

### Principles

1. **Nothing moves without reason.** Every animation communicates something.
2. **Settle, don't snap.** Elements ease into position. But quick enough to never feel sluggish.
3. **Stagger creates life.** Simultaneous changes feel mechanical. Staggered changes feel organic — like a garden.
4. **Overshoot is for joy.** The bounce easing is reserved for positive moments only.
5. **Exits are faster than entrances.** `60-70%` of entrance duration.
6. **Opacity is not a transition.** Pair fades with position or scale shifts.

---

## 12. Keeping It Tasteful

### The Overanimation Checklist

Before shipping any animation, ask:

- **"Would I notice this on the 50th time?"** If yes, probably too much. Frequent animations should be nearly subliminal.
- **"Does this delay the player?"** If it prevents next input, must be skippable or under `300ms`.
- **"Am I animating this because it is cool or because it communicates?"** If cool: cut it.
- **"Does this match the emotional register?"** If it would feel at home in a match-3 game, it does not belong here.

### Specific Restraints

- **No screen shake.** Ever.
- **No particle systems** except soil puff on harvest (3-5 hand-placed circles, not an emitter).
- **No score popups floating from placement.** "+10" rising from a tomato is arcade language.
- **No achievement toasts during gameplay.** End of session only.
- **No looping idle animations on UI elements.** Only looping animation: gentle breathing of ripe crops.
- **Maximum one thing moving at a time during layout phase.** Character waits until placement animation completes.

---

## 13. Reduced-Motion Accessibility

### Detection
- Respect `prefers-reduced-motion: reduce`
- In-game toggle: **Settings > Accessibility > Reduce motion**. Default: follow system preference.

### What Changes

| Normal | Reduced Motion |
|--------|---------------|
| Scale/position animations | Instant state change with `150ms` opacity crossfade only |
| Staggered grid animations | All cells change simultaneously with `200ms` crossfade |
| Card slide-in | Appears in place with `200ms` fade-in |
| Seasonal transition (3-4s dissolve) | Hard cut with `500ms` color crossfade only |
| Score count-up | Numbers appear at final value immediately; gauges appear filled |
| Crop breathing | Static sprite |
| Background ambient details | Removed entirely |
| Micro-shake on invalid | No shake; border highlights in muted warm tone for `300ms` |

### What Does NOT Change
- **Sound design** — All audio identical. Sound is primary feedback in reduced-motion mode.
- **Timing/delays** — Character reactions still wait their delays. Pacing preserved.
- **Color shifts** — Seasonal grading, companion indicators, score fills all remain.
- **Content** — All dialogue, scores, events identical.

### Testing Standard
The game must be fully playable and emotionally coherent with all motion disabled. If feedback only works as animation with no static/audio equivalent, it is a gap that must be filled before shipping.
