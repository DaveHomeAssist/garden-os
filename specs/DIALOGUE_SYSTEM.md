# Garden OS -- Dialogue System Specification

Version: 1.0 / Date: 2026-03-15
Depends on: NARRATIVE_SPEC.md, SEASON_ENGINE_SPEC.md, SCORING_RULES.md, DIALOGUE_ENGINE.json

---

## 1. Overview

The dialogue system selects and displays character lines from `DIALOGUE_ENGINE.json` based on deterministic game-state triggers. Every line fires from a specific condition. No random chatter. No ambient dialogue. Characters speak when the game gives them a reason to speak.

---

## 2. Speaking Order and Timing

Characters always speak in this fixed order. No exceptions.

| Order | Character | Timing Delay (from trigger) | Condition |
|-------|-----------|----------------------------|-----------|
| 1 | Garden GURL | 500-800ms after trigger event | Always speaks first |
| 2 | Onion Man | 400-600ms after GURL finishes | Always speaks second |
| 3 | Vegeman | 300-500ms after Onion Man finishes | Only in Chapters 2, 10; placement triggers only outside those chapters |
| 4 | Garden Critters | 200-400ms after last speaker | Only in event triggers, Chapters 6+ |

### Timing by Trigger Type

These delays are measured from the triggering game event, not from the previous speaker.

| Trigger Type | GURL Delay | Notes |
|-------------|------------|-------|
| Placement (valid) | 600-800ms after placement animation | Allows the crop-drop animation to land |
| Placement (invalid/shake) | 400ms after shake animation | Fast feedback on errors |
| Harvest (first crop of season) | 1500ms after first crop scored | Allows the harvest moment to breathe |
| Score reveal | 500ms after grade letter appears | Lets the player read the grade |
| Season transition | 1000ms after transition screen loads | Gives visual transition time |
| Event card | 300ms after card becomes visible | Quick reaction to event news |

### Display Rules

- One line per character per trigger. Never two lines from the same character on the same trigger.
- Lines display as text overlays with character label (GURL:, Onion Man:, etc.).
- Each line remains on screen for `max(2000ms, wordCount * 120ms)` before fading.
- Lines queue sequentially. The next speaker's line appears after the current line fades or after the player clicks/taps to dismiss.
- Player can tap/click to advance through queued lines immediately.

---

## 3. Trigger Fire Rules

### 3.1 Trigger Categories

Every trigger key in `DIALOGUE_ENGINE.json` maps to a specific game-state condition.

| Trigger Key | Fire Condition | Phase |
|-------------|---------------|-------|
| `placement_trellis_correct` | Climbing crop placed in a trellis row | PLANNING |
| `placement_trellis_wrong` | Climbing crop placed outside trellis row | PLANNING |
| `placement_companion_found` | Crop placed adjacent to a listed companion | PLANNING |
| `placement_conflict_found` | Crop placed adjacent to a listed conflict | PLANNING |
| `placement_generic` | Any crop placed, no special condition | PLANNING |
| `placement_first_crop` | First crop placed in the season | PLANNING |
| `placement_full_bed` | 32nd cell filled | PLANNING |
| `simulation_score_high` | Bed average >= 8.0 at harvest | HARVEST |
| `simulation_score_mid` | Bed average 5.5-7.9 at harvest | HARVEST |
| `simulation_score_low` | Bed average < 5.5 at harvest | HARVEST |
| `simulation_hard_violation` | Climber without trellis detected at scoring | HARVEST |
| `event_positive` | Positive-valence event drawn | EARLY/MID/LATE_SEASON |
| `event_negative` | Negative-valence event drawn | EARLY/MID/LATE_SEASON |
| `event_mixed` | Mixed-valence event drawn | EARLY/MID/LATE_SEASON |
| `intervention_used` | Player spends intervention token | EARLY/MID/LATE_SEASON |
| `intervention_skipped` | Player advances without using token | EARLY/MID/LATE_SEASON |
| `harvest_good_yield` | Yield multiplier >= 1.0 on majority of cells | HARVEST |
| `harvest_poor_yield` | Yield multiplier < 0.7 on majority of cells | HARVEST |
| `harvest_sauce_ingredients_complete` | All 5 Mom's Sauce crops present in yield | HARVEST (Ch11 only) |
| `challenge_accepted` | Player activates a challenge modifier | PLANNING (Ch9+) |
| `challenge_passed` | Challenge constraint honored through harvest | HARVEST |
| `challenge_failed` | Challenge constraint violated | HARVEST |
| `season_spring_start` | Spring season loads into PLANNING | PLANNING |
| `season_summer_start` | Summer season loads into PLANNING | PLANNING |
| `season_fall_start` | Fall season loads into PLANNING | PLANNING |
| `season_winter_review` | Winter chapter loads into REVIEW | REVIEW |
| `chapter_11_sauce_moment` | Ch11 sauce sequence fires | HARVEST (Ch11 only) |
| `chapter_12_epilogue` | Ch12 Legacy View loads | REVIEW (Ch12 only) |
| `phillies_spring` | Any spring season, 1-in-3 chance | PLANNING |
| `phillies_summer` | Any summer season, 1-in-3 chance | PLANNING |
| `phillies_fall` | Any fall season, 1-in-3 chance | PLANNING |
| `phillies_winter` | Any winter review, 1-in-3 chance | REVIEW |
| `mom_memory` | Triggered per chapter rules (see Section 6) | Variable |

### 3.2 Trigger Priority

When multiple triggers fire simultaneously (e.g., placing a crop that is both a companion match AND the first crop), priority determines which trigger fires.

Priority order (highest first):

1. `placement_first_crop` (once per season, takes precedence)
2. `placement_full_bed` (once per season, takes precedence)
3. `placement_trellis_wrong` (errors prioritized over successes)
4. `placement_trellis_correct`
5. `placement_conflict_found`
6. `placement_companion_found`
7. `placement_generic` (lowest priority, fires only when nothing else qualifies)

Score triggers do not conflict (mutually exclusive by range).
Event triggers do not conflict (mutually exclusive by valence).

### 3.3 One-in-Three Frequency Cap on Placement Triggers

Placement triggers (`placement_trellis_correct`, `placement_companion_found`, `placement_conflict_found`, `placement_generic`) are subject to a 1-in-3 frequency cap.

Implementation:

```
placementCount: integer   // incremented on every crop placement
lastDialoguePlacement: integer  // placement count when dialogue last fired

function shouldFirePlacementDialogue(trigger):
  // Always fire on these, regardless of cap:
  if trigger == "placement_first_crop": return true
  if trigger == "placement_full_bed": return true
  if trigger == "placement_trellis_wrong": return true  // errors always fire

  // For all other placement triggers:
  if (placementCount - lastDialoguePlacement) >= 3:
    lastDialoguePlacement = placementCount
    return true
  else:
    return false
```

Non-placement triggers (score, event, intervention, season, harvest, challenge) always fire. No frequency cap.

---

## 4. Pool Selection

### 4.1 Line Selection Algorithm

Each trigger key contains arrays of lines per character. Lines are selected via weighted random with a recency penalty to avoid repetition.

```
function selectLine(pool: string[], recentlyUsed: string[]): string

  1. Filter pool to exclude lines in recentlyUsed (last 3 selections for this trigger+character).

  2. If filtered pool is empty, reset recentlyUsed and use full pool.

  3. Select uniformly at random from filtered pool.

  4. Push selected line to recentlyUsed (FIFO, max length 3).

  5. Return selected line.
```

### 4.2 Recently Used Tracking

Stored in `localStorage` under `gardenOS.dialogueHistory`:

```
dialogueHistory: {
  [triggerKey]: {
    [characterKey]: string[]   // last 3 line texts used, FIFO
  }
}
```

This prevents the same line from appearing twice in consecutive triggers of the same type while keeping the pool fresh.

### 4.3 Single-Line Triggers

Some triggers have only one line per character (e.g., `chapter_11_sauce_moment`, `chapter_12_epilogue`). These are fixed narrative beats. No selection logic. The single line always fires.

---

## 5. Character Availability Rules

### 5.1 Who Speaks When

| Character | Available Chapters | Trigger Categories |
|-----------|-------------------|-------------------|
| Garden GURL | All (1-12) | All trigger categories |
| Onion Man | All (1-12) | All trigger categories |
| Vegeman | 2, 10 (full); placement-only in other chapters if present in pool | Placement, chapter-specific |
| Garden Critters | 6-12 | Event categories only (`event_positive`, `event_negative`, `event_mixed`) |

### 5.2 Vegeman Rules

- Vegeman has lines in placement trigger pools. These lines ONLY fire when `chapter == 2 OR chapter == 10`.
- In all other chapters, Vegeman's pool is skipped entirely. The speaking order goes GURL > Onion Man > (skip) > Critters (if applicable).
- Exception: `placement_first_crop` and `placement_full_bed` in Chapter 10 always include Vegeman.

### 5.3 Critter Rules

- Critters have lines only in `event_positive`, `event_negative`, `event_mixed`.
- Critters only speak when `chapter >= 6`.
- In chapters 1-5, event triggers fire GURL and Onion Man only.
- Critters never speak on placement, score, harvest, intervention, season, or challenge triggers.

### 5.4 Chapter 11 Override

During the sauce sequence (`chapter_11_sauce_moment`):
- GURL delivers one fixed line.
- Onion Man delivers one fixed line sequence.
- Vegeman is absent.
- Critters are silent.
- No other trigger fires during the sauce beat. The sauce moment overrides all other dialogue.

### 5.5 Chapter 12 Override

During the epilogue (`chapter_12_epilogue`):
- GURL delivers one fixed line (her longest speech).
- Onion Man's line is conditional:
  - If `gardenOS.recipes.completed` includes `moms_sauce`: use `onion_sauce_complete` pool.
  - If not: use `onion_sauce_incomplete` pool.
- Vegeman is absent.
- Critters are absent.

---

## 6. Chapter-Specific Overrides

### 6.1 Phillies Reference Triggers

Phillies lines are seasonal and fire with a 1-in-3 probability at season start.

```
function shouldFirePhilliesLine(season: string, chapter: integer): boolean
  roll = random(0.0, 1.0)
  if roll < 0.333:
    return true
  return false
```

Phillies triggers are additive: they fire IN ADDITION TO the season-start trigger, not instead of it. The player hears the season-start lines, then (1-in-3 chance) a Phillies aside from both GURL and Onion Man.

Seasonal mapping:
- Spring chapters (1, 5, 9): `phillies_spring`
- Summer chapters (2, 6, 10): `phillies_summer`
- Fall chapters (3, 7, 11): `phillies_fall`
- Winter chapters (4, 8, 12): `phillies_winter`

### 6.2 Mom Memory Triggers

Mom memory lines fire once per chapter, during a quiet moment. The trigger fires at the REVIEW phase of each season (or during winter review for winter chapters).

Frequency: maximum one `mom_memory` trigger per chapter.

Chapter gating:
- Chapters 1-2: No mom memory lines. Too early.
- Chapters 3-4: Mom memory lines available. Focus on infrastructure (trellis, cedar, bed dimensions).
- Chapters 5-8: Mom memory lines available. Focus on specific crops and habits.
- Chapters 9-11: Mom memory lines available. Focus on specific cells, routines, food.
- Chapter 12: No mom memory trigger. The epilogue handles the emotional weight.

Selection: When mom_memory fires, GURL and Onion Man each deliver one line from the `mom_memory` pool. Pool selection follows the standard algorithm (Section 4.1).

### 6.3 Sauce Sequence (Chapter 11)

The sauce moment is a scripted override that suspends normal dialogue.

Sequence:
1. Standard HARVEST scoring completes. Normal `simulation_score_*` trigger fires.
2. After score display, check: does `harvestResult.yieldList` contain all of `["cherry_tom", "basil", "pepper", "onion", "carrot"]`?
3. If yes: fire `chapter_11_sauce_moment`. This overrides `harvest_good_yield` / `harvest_poor_yield`.
4. If no: fire `harvest_poor_yield` or `harvest_good_yield` as normal. No sauce moment.
5. The sauce trigger is permanent-fail: if ingredients are not present in Chapter 11, the game does not offer a retry. The trigger cannot fire in any other chapter.

### 6.4 Hard Violation Priority

`simulation_hard_violation` fires IN ADDITION TO the score-range trigger (`simulation_score_high/mid/low`). The violation line fires first, then the score line. Both queued in standard speaking order.

---

## 7. Year 1/2/3 Pool Variants

The line pools in DIALOGUE_ENGINE.json are universal across all three years. Differentiation comes from trigger availability, not separate pools.

### 7.1 Year 1 (Chapters 1-4)

- Reduced trigger variety: no challenge triggers, no critter triggers, no full-bed trigger (32/32 unlikely in Year 1).
- Vegeman only in Chapter 2.
- Phillies lines seasonal as normal.
- Mom memory lines start at Chapter 3.
- Placement dialogue fires at standard 1-in-3 rate.

### 7.2 Year 2 (Chapters 5-8)

- Critters join at Chapter 6. Event triggers now include critter lines.
- Challenge triggers not yet available (challenges unlock at Chapter 9).
- Mom memory lines fire with crop/habit specifics.
- Phillies lines seasonal as normal.
- Full bed trigger theoretically possible but unlikely.

### 7.3 Year 3 (Chapters 9-12)

- Full trigger set available: challenges, full bed, critters, all event types.
- Vegeman returns in Chapter 10.
- Mom memory lines fire with cell-specific and food-specific content.
- Chapter 11 sauce moment is the only chapter-locked trigger in the game.
- Chapter 12 epilogue fires fixed lines with sauce-conditional branching.

### 7.4 Contextual Tone Shift

The same line pools serve all three years, but the game-state context makes identical lines land differently. A `placement_generic` line in Chapter 1 hits differently than in Chapter 10 because the player's relationship with the bed has changed. This is intentional. The lines are written to be valid at any skill level. The emotional weight comes from accumulated context, not from different words.

---

## 8. Implementation Contract

### 8.1 Data Flow

```
Game State Change (placement, score, event, etc.)
       |
       v
Trigger Evaluator (determines which trigger key fires)
       |
       v
Frequency Gate (1-in-3 check for placement triggers)
       |
       v
Character Availability Filter (chapter-based)
       |
       v
Pool Selector (weighted random with recency exclusion)
       |
       v
Display Queue (ordered by speaking priority, timed by trigger type)
       |
       v
UI Renderer (text overlay, character label, timing delays)
```

### 8.2 localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `gardenOS.dialogueHistory` | Object | Per-trigger, per-character recently-used line tracking |
| `gardenOS.dialoguePlacementCount` | Integer | Running placement count for 1-in-3 frequency cap |
| `gardenOS.dialogueLastFireCount` | Integer | Placement count at last dialogue fire |

### 8.3 Validation Rules

- Every line in DIALOGUE_ENGINE.json must contain zero em dashes.
- Every line must contain zero ellipses.
- The word "journey" must not appear in any line.
- No line should contain generic mom references ("she loved the garden," "she was a good gardener"). Every mom reference must include a specific: a crop name, a cell position, a tool, a habit, a place, a neighbor, a time of day.
- Vegeman lines must be structurally wrong or overconfident. At least one per pool should contain advice that sounds reasonable but would produce bad results.
- Critter lines must be under 12 words. Terse. Observational. No emotion.
- GURL lines must not contain softening language ("maybe," "perhaps," "I think"). She speaks in verdicts.
- Onion Man lines must not contain clinical or technical language. He speaks in food, feeling, and baseball.

### 8.4 Testing Checklist

- [ ] Voice Bible recognition test: cover character labels, read 10 random lines, identify speaker with >90% accuracy.
- [ ] Frequency cap: place 9 crops rapidly, verify dialogue fires on placements 1, 4, and 7 (approximately).
- [ ] Speaking order: verify GURL always precedes Onion Man in display queue.
- [ ] Chapter gating: verify Vegeman silent in chapters 3-9 and 11-12.
- [ ] Chapter gating: verify Critters silent in chapters 1-5.
- [ ] Sauce sequence: verify only fixed lines fire during Chapter 11 sauce moment.
- [ ] Epilogue branching: verify Onion Man's final line includes "and so are you" only when sauce was completed.
- [ ] No-repeat: trigger the same event type 4 times consecutively, verify no line repeats within 3 firings.
- [ ] Phillies frequency: run 30 season starts, verify Phillies lines appear approximately 10 times (1-in-3).
- [ ] Mom memory: verify zero mom memory lines in Chapters 1-2 and Chapter 12.
- [ ] Mom specificity: audit all mom_memory lines for concrete details (crop, cell, tool, habit).

---

## 9. Future Extensibility

The DIALOGUE_ENGINE.json structure supports:

- **New trigger keys**: Add a key to `triggers`, add evaluation logic to the trigger evaluator.
- **New characters**: Add a character key to any trigger object. Add to the speaking order table.
- **Free-play dialogue**: Post-Chapter 12, the same pools continue to fire. The system does not distinguish between campaign and free-play except for chapter-locked triggers (sauce, epilogue) which cannot re-fire.
- **Challenge-specific lines**: Future challenge modifiers can add sub-trigger keys (e.g., `event_negative_drought_year`) that override the base pool when a specific challenge is active.

The system is designed for a single HTML file with no build step. All dialogue data lives in one JSON object. All selection logic lives in one JS module. No external dependencies.
