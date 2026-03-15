# Season Engine Specification

**Status:** Implementation-ready
**Date:** 2026-03-15
**Depends on:** SCHEMA.md (workspace/bed/cell model), CLAUDE-G1 (workspace schema v2), CLAUDE-G4 (crop lifecycle)
**Consumed by:** Prompt 6 (Event Deck), Prompt 8 (Core Engine Build)

---

## State Diagram

```
                          ┌─────────────────────────────────────────────┐
                          │              SINGLE SEASON LOOP             │
                          │                                             │
  ┌──────────┐   commit   │  ┌──────────┐  advance  ┌──────────────┐   │
  │ PLANNING ├───────────►│  │  COMMIT  ├─────────►│ EARLY_SEASON │   │
  │ (mutable)│◄── undo ───┤  │ (confirm)│          │  (beat 1)    │   │
  └──────────┘            │  └──────────┘          └──────┬───────┘   │
       ▲                  │                               │ advance   │
       │                  │                        ┌──────▼───────┐   │
       │                  │                        │  MID_SEASON  │   │
       │                  │                        │  (beat 2)    │   │
       │                  │                        └──────┬───────┘   │
       │                  │                               │ advance   │
       │                  │                        ┌──────▼───────┐   │
       │                  │                        │ LATE_SEASON  │   │
       │                  │                        │  (beat 3)    │   │
       │                  │                        └──────┬───────┘   │
       │                  │                               │ advance   │
       │                  │                        ┌──────▼───────┐   │
       │                  │                        │   HARVEST    │   │
       │                  │                        │  (scoring)   │   │
       │                  │                        └──────┬───────┘   │
       │                  │                               │ advance   │
       │                  │                        ┌──────▼───────┐   │
       │                  │                        │    REVIEW    │   │
       │                  │                        │  (summary)   │   │
       │                  │                        └──────┬───────┘   │
       │                  │                               │ advance   │
       │                  │                        ┌──────▼───────┐   │
       │                  └────────────────────────┤  TRANSITION  │   │
       │                                           │(carry-forward│   │
       └───────────────── next season ─────────────┤  + hand off) │   │
                                                   └──────────────┘   │
                                                                      │
                          └───────────────────────────────────────────-┘
```

**Valid transitions (exhaustive):**

| From | To | Trigger | Reversible |
|------|----|---------|------------|
| `PLANNING` | `COMMIT` | Player presses Commit | Yes (back to PLANNING) |
| `COMMIT` | `PLANNING` | Player cancels confirmation | Yes |
| `COMMIT` | `EARLY_SEASON` | Player confirms commit | **No** |
| `EARLY_SEASON` | `MID_SEASON` | Player presses Advance after event resolves | No |
| `MID_SEASON` | `LATE_SEASON` | Player presses Advance after event resolves | No |
| `LATE_SEASON` | `HARVEST` | Player presses Advance after event resolves | No |
| `HARVEST` | `REVIEW` | Score animation completes | No |
| `REVIEW` | `TRANSITION` | Player presses Continue | No |
| `TRANSITION` | `PLANNING` | Next season loads | No |

No state may be skipped. No backward transitions after COMMIT confirmation.

---

## 1. State Machine

### 1.1 SeasonState Object

The single source of truth for the current season. Persisted to localStorage on every state change.

```
SeasonState {
  phase:            enum PLANNING | COMMIT | EARLY_SEASON | MID_SEASON |
                         LATE_SEASON | HARVEST | REVIEW | TRANSITION
  season:           enum "spring" | "summer" | "fall"
  chapter:          integer 1..12
  beatIndex:        integer 0..2          // 0 = early, 1 = mid, 2 = late
  grid:             CellState[32]         // 8 cols x 4 rows, row-major
  committedGrid:    CellState[32] | null  // snapshot at commit; null before commit
  drawnEventIds:    string[]              // event IDs drawn this season (max 3)
  currentEvent:     SeasonEvent | null    // active event for current beat
  interventionTokens: integer 0..3       // tokens remaining this season
  interventionLog:  InterventionRecord[]  // actions taken this season
  eventLog:         ResolvedEvent[]       // events resolved this season
  harvestResult:    HarvestResult | null  // computed at HARVEST phase
  carryForward:     CarryForwardState     // accumulated from previous seasons
}
```

### 1.2 CellState

```
CellState {
  cropId:           string | null         // crop key from CROPS roster, or null if empty
  position:         { row: integer 0..3, col: integer 0..7 }
  locked:           boolean               // true after COMMIT
  eventModifier:    float                 // cumulative penalty/buff from events this season
  interventionFlag: enum null | "protected" | "mulched" | "companion_patched"
  soilFatigue:      float                 // carried from previous season; 0.0 default
}
```

### 1.3 Phase Definitions

#### PLANNING

- Grid is fully mutable. Player places and removes crops freely.
- No timer. No turn limit.
- Player selects season and sees chapter objective.
- Scoring preview runs live (non-binding; uses base scoring only, no event modifiers).
- All cells have `locked: false`.
- Exit condition: player presses Commit.

#### COMMIT

- Confirmation dialog displays:
  - Planted cell count (must be >= 8; see Edge Cases)
  - Chapter objective reminder
  - Warning: "Placements lock after this point. You cannot freely rearrange."
- Player confirms or cancels.
- On confirm:
  - All cells set `locked: true`.
  - `committedGrid` = deep copy of `grid`.
  - `interventionTokens` = 3.
  - `drawnEventIds` = [].
  - `beatIndex` = 0.
  - Phase transitions to `EARLY_SEASON`.
- On cancel:
  - Return to `PLANNING`. No state changes.

#### EARLY_SEASON (Beat 1)

1. Draw one event from the seasonal pool (see Section 3).
2. Display event card with: title, description, affected targets, mechanical effect.
3. Player chooses one intervention OR advances without acting.
4. If intervention used: apply immediately, decrement `interventionTokens`.
5. Resolve event: apply `mechanicalEffect` to targeted cells.
6. Log event to `eventLog`.
7. Player presses Advance to move to `MID_SEASON`.

#### MID_SEASON (Beat 2)

Identical flow to EARLY_SEASON. `beatIndex` = 1.

#### LATE_SEASON (Beat 3)

Identical flow to EARLY_SEASON. `beatIndex` = 2. After resolution, Advance moves to `HARVEST`.

#### HARVEST

1. Run final scoring pass across all planted cells (see Section 4).
2. Calculate yield: list of distinct `cropId` values present in grid.
3. Check yield against recipe ingredient lists.
4. Display: per-cell scores, bed average, grade, factor breakdown, yield list, recipe matches.
5. Auto-advance to `REVIEW` after score reveal animation completes (or player skips).

#### REVIEW

1. Display season summary:
   - Final score and grade.
   - Events that occurred and their net impact.
   - Interventions used (or note that none were used).
   - Narrator commentary (GURL assessment, Onion Man reaction).
   - Journal entry generated from season data.
2. Compute carry-forward state (see Section 5).
3. Player presses Continue to advance.

#### TRANSITION

1. Apply carry-forward to next season's initial state.
2. Update recipe pantry.
3. Update chapter progress.
4. If final chapter: route to campaign end instead of PLANNING.
5. Otherwise: initialize next season's `SeasonState` and enter `PLANNING`.

---

## 2. Intervention System

### 2.1 Token Economy

```
InterventionToken {
  total_per_season: 3       // one granted at each beat
  granted_at:       beat start (before event draw)
  expires:          end of current beat (use-or-lose per beat)
  accumulation:     none across beats, none across seasons
  accept_loss:      does NOT save the token; token is simply forfeited
}
```

Clarification: each beat grants exactly 1 token. That token must be spent or forfeited during that beat. There is no token pool. `interventionTokens` in SeasonState tracks how many have been granted-and-not-yet-used within the current beat only. Rewritten for clarity:

```
beatTokenAvailable: boolean   // true at beat start, false after use or advance
```

### 2.2 Intervention Types

| ID | Name | Target | Effect | Constraints |
|----|------|--------|--------|-------------|
| `swap` | Swap | Two adjacent cells (orthogonal) | Exchange cropId between the two cells. Both cells must be planted. | Adjacency = sharing an edge (not diagonal). Both cells must contain crops. |
| `prune` | Prune | One planted cell | Set `cropId` to `null`. Removes the crop entirely. | Cell must be planted. Cannot prune an empty cell. |
| `protect` | Protect | One planted cell | Set `interventionFlag` to `"protected"`. Cell ignores the current beat's event effect. | Only shields against the current beat's event. Flag clears at beat end. |
| `mulch` | Mulch | One planted cell | Set `interventionFlag` to `"mulched"`. Cell receives +0.5 to its score for all remaining scoring passes this season. | Persists through remaining beats. Does not stack (mulching an already-mulched cell has no additional effect). |
| `companion_patch` | Companion Patch | One planted cell | Set `interventionFlag` to `"companion_patched"`. Cell receives a +1.0 adjacency bonus for the current beat only, as if it had a perfect companion neighbor. | Clears at beat end. |
| `accept_loss` | Accept Loss | None | No effect. Token is forfeited. | Always valid. Does not save the token. |

### 2.3 InterventionRecord

```
InterventionRecord {
  beatIndex:    integer 0..2
  type:         enum "swap" | "prune" | "protect" | "mulch" |
                     "companion_patch" | "accept_loss"
  targetCells:  { row: integer, col: integer }[]   // 0 for accept_loss,
                                                    // 1 for most, 2 for swap
  timestamp:    ISO-8601
}
```

### 2.4 Intervention Resolution Order

Within a single beat:

1. Player sees event card.
2. Player selects intervention (or accept_loss).
3. Intervention applies to grid state.
4. Event mechanical effect resolves against the (now-modified) grid.
5. Scoring snapshot taken for the beat.

This means: PROTECT works because it sets the flag before the event resolves. SWAP works because the crop moves before the event targets resolve. PRUNE works because the crop is gone before the event checks for it.

---

## 3. Event Draw Rules

### 3.1 Pool Structure

Each season (spring, summer, fall) has a pool of 10 events. Winter is narrative-only (no active bed). Total: 40 events across 4 pools.

```
EventPool {
  season:     enum "spring" | "summer" | "fall" | "winter"
  events:     SeasonEvent[10]
}

SeasonEvent {
  id:                   string          // e.g., "S01", "U07", "F03"
  title:                string
  season:               enum
  category:             enum "weather" | "critter" | "neighbor" | "family" |
                             "phillies" | "infrastructure" | "soil"
  valence:              enum "negative" | "positive" | "mixed" | "neutral"
  description:          string
  mechanicalEffect:     MechanicalEffect
  interventionOptions:  string[]        // which intervention types are relevant
  carryForward:         CarryForwardEffect | null
  chapterAvailability:  integer[]       // chapters where this event can appear
  drawWeight:           float 0.1..3.0  // base draw weight
  commentary:           { gurl: string, onion: string, vegeman: string, critters: string }
}

MechanicalEffect {
  channel:    enum "cell_penalty" | "cell_buff" | "zone_lockout" |
                   "resource_cost" | "carry_forward"
  target:     TargetSelector
  modifier:   float           // negative for penalties, positive for buffs
  duration:   enum "current_beat" | "rest_of_season" | "carry_forward"
}

TargetSelector {
  type:       enum "crop_filter" | "row" | "column" | "zone" | "faction" | "random_cells"
  filter:     string          // e.g., "coolSeason === false", "row-0", "fruiting"
  maxCells:   integer | null  // cap on affected cells; null = all matching
}
```

### 3.2 Draw Algorithm

Called once per beat. Draws one event per beat, three total per season.

```
function drawEvent(pool: SeasonEvent[], state: SeasonState): SeasonEvent

  1. Filter pool to eligible events:
     - event.id NOT IN state.drawnEventIds           (no repeats this season)
     - state.chapter IN event.chapterAvailability     (chapter-gated)

  2. If this is beat 2 (beatIndex === 2) and all previously drawn events
     are negative or mixed:
       - Filter to valence === "positive" OR valence === "neutral"
       - (Guarantees at least 1 positive/neutral per season)

  3. If this is beat 2 (beatIndex === 2) and all previously drawn events
     are positive or neutral:
       - Filter to valence === "negative" OR valence === "mixed"
       - (Guarantees at least 1 negative/mixed per season)

  4. Compute weighted probability for each eligible event:
       weight = event.drawWeight
               * seasonalCropBonus(event, state.grid)
               * chapterScaling(event, state.chapter)

     seasonalCropBonus: if event targets a crop type present in the grid,
                        weight *= 1.5; otherwise weight *= 1.0

     chapterScaling:    chapters 1-3: weight *= 0.7 (gentler early game)
                        chapters 4-8: weight *= 1.0
                        chapters 9-12: weight *= 1.3 (higher stakes late game)

  5. Select one event via weighted random from eligible set.

  6. Push event.id to state.drawnEventIds.

  7. Return selected event.
```

### 3.3 Valence Guarantee

The draw algorithm enforces two hard constraints:

- **At least 1 negative or mixed event per season.** If beats 0 and 1 drew only positive/neutral, beat 2 forces a negative/mixed draw.
- **At least 1 positive or neutral event per season.** If beats 0 and 1 drew only negative/mixed, beat 2 forces a positive/neutral draw.

This means the "all-negative season" edge case is structurally impossible.

### 3.4 Event Resolution

```
function resolveEvent(event: SeasonEvent, state: SeasonState): void

  1. Identify target cells using event.mechanicalEffect.target:
     - crop_filter: iterate grid, select cells where crop matches filter
     - row: select all cells in specified row index
     - column: select all cells in specified column index
     - zone: select cells in trellis zone or protection zone
     - faction: select cells whose crop belongs to the named category
     - random_cells: select N random planted cells

  2. If target.maxCells is set, truncate target list to maxCells
     (random selection among matches).

  3. For each target cell:
     - If cell.interventionFlag === "protected": skip this cell.
     - Otherwise: cell.eventModifier += event.mechanicalEffect.modifier

  4. If event.mechanicalEffect.channel === "zone_lockout":
     - Mark targeted cells as locked for the remainder of the season
       (no further interventions can target them).

  5. If event.mechanicalEffect.channel === "resource_cost":
     - No cell modification. Instead, reduce a season-level resource
       (e.g., lose an intervention token from a future beat).
       Implementation: set state.beatTokenAvailable = false for next beat.

  6. Log to state.eventLog:
     { eventId, beatIndex, affectedCells, netModifier, wasInterventionUsed }
```

---

## 4. Scoring Integration

### 4.1 Base Cell Score (Pre-Event)

The existing scoring formula from SCHEMA.md, computed per planted cell:

```
rawScore = (sunFit * 2 + supportFit + shadeFit + accessFit + seasonFit) / 3
baseScore = clamp(0, 10, rawScore + structuralBonus + adjacencyScore)
```

| Factor | Weight | Range | Derivation |
|--------|--------|-------|------------|
| `sunFit` | 2x | 0.0 -- 5.0 | `effectiveLight` vs crop `sunMin`/`sunIdeal` |
| `supportFit` | 1x | 1.0 -- 5.0 | `hasVerticalSupport` vs crop `habit`/`trellisRequired` |
| `shadeFit` | 1x | 0.0 -- 5.0 | crop `shadeScore`, reduced when light < `sunMin` |
| `accessFit` | 1x | 3.0 -- 5.0 | cell position relative to front/door side, scaled by crop height |
| `seasonFit` | 1x | 1.0 -- 5.0 | bed `season` vs crop `coolSeason` flag |
| `structuralBonus` | additive | -2.0 -- +3.0 | trellis row, protected zone, critter-safe, succession |
| `adjacencyScore` | additive | -2.0 -- +2.0 | companion, conflict, same-crop, tall-tall, water mismatch |

All values are `float`. No rounding until final display.

### 4.2 Event-Modified Cell Score

Applied after each beat's event resolves:

```
modifiedScore = baseScore + cell.eventModifier
```

`eventModifier` is cumulative across beats within a season. A cell hit by two events stacks both modifiers.

### 4.3 Intervention-Modified Cell Score

Applied on top of event modifications:

```
if cell.interventionFlag === "mulched":
    modifiedScore += 0.5

if cell.interventionFlag === "companion_patched":
    adjacencyScore += 1.0   // recalculate modifiedScore with boosted adjacency
```

### 4.4 Final Harvest Score

Computed once at the HARVEST phase, after all 3 beats have resolved.

```
function computeHarvestScore(state: SeasonState): HarvestResult

  plantedCells = state.grid.filter(cell => cell.cropId !== null)

  for each cell in plantedCells:
    cell.finalScore = clamp(0, 10,
      baseScore(cell)
      + cell.eventModifier
      + mulchBonus(cell)       // +0.5 if mulched
      + cell.soilFatigue       // negative value, see Section 5
    )

  bedAverage   = mean(plantedCells.map(c => c.finalScore))   // float 0.0..10.0
  seasonScore  = bedAverage * 10                              // float 0.0..100.0
  goalBonus    = computeGoalBonus(state)                      // float 0.0..5.0
  finalScore   = clamp(0, 100, seasonScore + goalBonus)       // float 0.0..100.0

  return HarvestResult {
    finalScore:     float 0.0..100.0
    grade:          enum (see below)
    bedAverage:     float 0.0..10.0
    cellScores:     { position, cropId, finalScore, breakdown }[]
    yieldList:      string[]     // distinct cropId values present at harvest
    recipeMatches:  string[]     // recipe IDs whose ingredients are all in yieldList
    factorSummary:  { sun, support, shade, access, season, adjacency }  // averages
    eventImpact:    float        // mean of all eventModifier values across planted cells
  }
```

### 4.5 Grade Thresholds

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+ | 90.0 -- 100.0 | Exceptional |
| A | 80.0 -- 89.9 | Strong |
| B | 70.0 -- 79.9 | Solid |
| C | 60.0 -- 69.9 | Adequate |
| D | 50.0 -- 59.9 | Struggling |
| F | 0.0 -- 49.9 | Failed |

Grade is derived from `finalScore`. Thresholds are inclusive on the lower bound, exclusive on the upper bound (except A+ which includes 100.0).

### 4.6 Yield Calculation

```
yieldList = unique(state.grid
  .filter(cell => cell.cropId !== null)
  .map(cell => cell.cropId))
```

Yield is a set of crop types, not a count. A bed with 8 tomato cells yields `["cherry_tom"]`, not 8 tomatoes. Recipe matching checks for presence of required crop types in the yield set.

---

## 5. Carry-Forward Rules

### 5.1 CarryForwardState

```
CarryForwardState {
  soilFatigueMap:     { [cellKey: string]: float }   // cellKey = "row,col"
  infrastructureMap:  { [cellKey: string]: string[] } // persistent flags per cell
  recipePantry:       string[]                        // all crop types ever harvested
  eventMemory:        EventMemoryEntry[]              // lasting effects from events
  seasonHistory:      SeasonHistoryEntry[]            // scores from all played seasons
}
```

### 5.2 Soil Fatigue

Heavy feeders deplete the soil. Consecutive heavy-feeder placement in the same cell compounds the penalty.

```
Heavy feeder crops: cherry_tom, pepper, zucchini, broccoli, kale

After each season, for each cell:
  if cell.cropId is a heavy feeder AND
     previousSeason.grid[same position].cropId is a heavy feeder:
       soilFatigueMap[cellKey] = previous fatigue - 0.3
       // Cumulative: -0.3 after 2 consecutive, -0.6 after 3, etc.
  else:
       soilFatigueMap[cellKey] = 0.0   // reset if rotated or left fallow

Fatigue floor: -1.5 (5 consecutive heavy-feeder seasons in same cell)
```

`soilFatigue` is applied as an additive modifier during scoring (see Section 4.4). It is always zero or negative.

### 5.3 Infrastructure Persistence

Certain interventions and events create lasting physical changes.

```
Persistent flags:
  "mulched"       - Mulch intervention. Persists to next season.
                    Grants +0.25 base score next season (half the in-season bonus).
                    Clears after one carry-forward season.
  "compacted"     - From foot-traffic event. Persists to next season.
                    Applies -0.5 penalty next season.
                    Clears after one carry-forward season.
  "enriched"      - From compost event. Persists to next season.
                    Grants +0.3 base score next season.
                    Clears after one carry-forward season.
```

All infrastructure effects last exactly one season beyond application, then clear. They do not compound.

### 5.4 Recipe Pantry

```
recipePantry: string[]

After each HARVEST:
  recipePantry = union(recipePantry, harvestResult.yieldList)
```

The pantry is append-only. Crop types are never removed. This is the cumulative set of all crops the player has ever successfully harvested across all seasons.

Recipe matching checks `recipePantry` against each recipe's `requiredIngredients[]`. A recipe is complete when all required ingredients are present in the pantry.

### 5.5 Event Memory

Some events produce effects that persist beyond the current season.

```
EventMemoryEntry {
  eventId:      string
  chapter:      integer
  effectType:   enum "soil_modifier" | "infrastructure" | "narrative_flag"
  target:       TargetSelector | null
  modifier:     float | null
  expiresAfter: integer         // number of seasons until this clears; 0 = permanent
}
```

Examples:
- "Compacted Soil" event: `{ effectType: "soil_modifier", modifier: -0.5, expiresAfter: 1 }`
- "Neighbor's Compost" event: `{ effectType: "infrastructure", modifier: +0.3, expiresAfter: 1 }`
- "Mom's Trowel Found" event: `{ effectType: "narrative_flag", expiresAfter: 0 }` (permanent)

At each TRANSITION, decrement `expiresAfter` for all memory entries. Remove entries where `expiresAfter` reaches 0 (unless originally 0, meaning permanent).

### 5.6 Season History

```
SeasonHistoryEntry {
  chapter:      integer
  season:       enum "spring" | "summer" | "fall"
  finalScore:   float 0.0..100.0
  grade:        enum
  yieldList:    string[]
  eventsDrawn:  string[]          // event IDs
  interventionsUsed: integer 0..3
}
```

Stored in `carryForward.seasonHistory`. Displayed during winter review chapters and at campaign end.

---

## 6. Edge Cases

### 6.1 Empty Bed at Commit

**Rule:** COMMIT is blocked if fewer than 8 cells are planted.

```
if countPlanted(state.grid) < 8:
  show validation error: "Plant at least 8 cells before committing."
  remain in PLANNING phase
  do not transition
```

Rationale: fewer than 8 cells (25% of the 32-cell bed) produces degenerate scoring and trivializes events.

### 6.2 Full Bed (32 Cells Planted)

**Rule:** No special scoring bonus. Enables the "Full House" chapter objective (checked in chapters that require it, e.g., Chapter 10).

```
if countPlanted(state.grid) === 32:
  state.fullHouse = true    // boolean flag, checked by chapter objective system
```

### 6.3 No Interventions Used

**Rule:** Valid play. No penalty. No bonus.

The player may choose `accept_loss` for all 3 beats or simply advance without selecting an intervention. The `interventionLog` will contain 0-3 `accept_loss` entries (or be empty if the player advanced without explicitly choosing).

Implementation: the Advance button is always available. Intervention selection is optional. If the player advances without choosing, it is equivalent to `accept_loss`.

### 6.4 All-Negative Event Draw (Prevented)

**Rule:** Structurally impossible per Section 3.3.

The beat-2 draw forces a positive/neutral event if beats 0 and 1 were both negative/mixed. The guarantee is enforced in `drawEvent()` at step 2.

### 6.5 No Eligible Events in Pool

**Rule:** If chapter gating and no-repeat filtering reduce the eligible pool to 0 events for a beat, skip the event for that beat.

```
if eligibleEvents.length === 0:
  state.currentEvent = null
  beat resolves with no event effect
  intervention token is still granted (player may use mulch or companion_patch proactively)
```

This should be rare and indicates an event pool design gap. Log a warning to console.

### 6.6 Pruning the Last Crop

**Rule:** If PRUNE removes the last planted cell, the season continues. HARVEST will score 0 planted cells, producing a score of 0.0 and grade F.

```
if countPlanted(state.grid) === 0 at HARVEST:
  bedAverage = 0.0
  finalScore = 0.0
  grade = "F"
  yieldList = []
  recipeMatches = []
```

No special blocking. The player chose this.

### 6.7 Swap Targeting an Empty Cell

**Rule:** SWAP requires both cells to contain crops. If either target cell is empty, the swap is invalid and the UI should prevent selection.

### 6.8 Protecting an Empty Cell

**Rule:** PROTECT requires the target cell to contain a crop. Protecting an empty cell has no meaningful effect and is blocked.

### 6.9 Multiple Events Targeting the Same Cell

**Rule:** Modifiers stack additively on `cell.eventModifier`. A cell hit by a -1.5 penalty on beat 1 and a +0.5 buff on beat 2 has `eventModifier = -1.0`.

### 6.10 Winter Seasons (Chapters 4, 8, 12)

**Rule:** Winter chapters do not run the season loop. They are review/narrative chapters only. The state machine does not enter PLANNING for winter. Instead, the chapter system routes directly to a winter review screen that displays `carryForward.seasonHistory` and journal content.

```
if chapter.season === "winter":
  skip PLANNING through HARVEST
  enter REVIEW directly with historical data
  TRANSITION advances to next chapter
```

---

## Appendix A: Data Type Reference

| Type | Definition |
|------|-----------|
| `float` | IEEE 754 double-precision. All scoring values. |
| `integer` | Whole number. Chapters, beat indices, cell counts. |
| `enum` | String literal from a fixed set. Validated on read. |
| `string` | UTF-8. Max lengths enforced per CLAUDE-G2 validation rules. |
| `ISO-8601` | Timestamp string. `"2026-03-15T12:00:00Z"` format. |
| `boolean` | `true` or `false`. |
| `string[]` | Array of strings. |
| `{ [key: string]: T }` | Object used as a map. Keys are string identifiers. |

## Appendix B: Constants

```
GRID_COLS           = 8
GRID_ROWS           = 4
GRID_SIZE           = 32        // GRID_COLS * GRID_ROWS
MIN_PLANTED_CELLS   = 8         // minimum to commit
BEATS_PER_SEASON    = 3
EVENTS_PER_SEASON   = 3
TOKENS_PER_BEAT     = 1
MULCH_BONUS         = 0.5       // per remaining beat in season
MULCH_CARRYOVER     = 0.25      // next season only
COMPANION_PATCH_BONUS = 1.0     // current beat only
SOIL_FATIGUE_RATE   = -0.3      // per consecutive heavy-feeder season
SOIL_FATIGUE_FLOOR  = -1.5      // minimum fatigue value
INFRASTRUCTURE_DURATION = 1     // seasons of persistence
SCORE_MIN           = 0.0
SCORE_MAX           = 100.0
CELL_SCORE_MIN      = 0.0
CELL_SCORE_MAX      = 10.0
GOAL_BONUS_MAX      = 5.0

HEAVY_FEEDERS = ["cherry_tom", "pepper", "zucchini", "broccoli", "kale"]

GRADE_THRESHOLDS = {
  "A+": 90.0,
  "A":  80.0,
  "B":  70.0,
  "C":  60.0,
  "D":  50.0,
  "F":  0.0
}
```
