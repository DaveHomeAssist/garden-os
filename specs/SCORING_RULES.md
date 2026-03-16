---
Status: Active
Document Version: 1.0
Compatible With: Garden OS v4.3, Season Engine v3
Owner: Dave Robertson
Last Updated: 2026-03-16
Artifact Class: Spec
---

# Garden OS — Scoring Rules Specification

Determinism is sacred. Same inputs = same outputs. No hidden modifiers. No randomness.

---

## 1. Grid Model

- **Grid**: 8 columns x 4 rows = 32 cells, row-major index (cell 0 = row 0 col 0).
- **Rows**: Row 0 is the back row (wall side). Row 3 is the front (access side).
- **Orientation**: `ew` (east-west, long side faces south) or `ns` (north-south).
- **Wall side**: `back` | `front` | `left` | `right` | `none`. Determines trellis row and shade source.

---

## 2. Per-Cell Light Model

Light is deterministic and derived from site settings. No randomness.

```
baseSunHours = site.sunHours                          // user input, range 2-10
```

### 2a. Row-based light gradient

The wall casts a shadow. Rows closer to the wall receive less light.

```
if wallSide == "back":
    rowFromWall = row                                 // row 0 = at wall, row 3 = far
elif wallSide == "front":
    rowFromWall = (totalRows - 1) - row
elif wallSide == "left":
    rowFromWall = col                                 // col 0 = at wall
elif wallSide == "right":
    rowFromWall = (totalCols - 1) - col
else:
    rowFromWall = totalRows - 1                       // no wall = no shadow
```

```
shadowPenalty = max(0, (2 - rowFromWall) * 0.75)      // 0-1.5 hrs lost near wall
effectiveLight = max(1, baseSunHours - shadowPenalty)
```

### 2b. Tall-crop shading

Tall crops in northern rows cast shade on the row behind them (toward front). Applied after wall shadow. Only relevant if a tall crop occupies an adjacent row closer to the light source.

```
for each cell with a tall crop:
    shadedCell = cell one row further from the wall
    shadedCell.effectiveLight -= 0.5
```

---

## 3. Cell Properties (derived, not stored)

Each cell has these computed properties used by scoring:

| Property | Derivation |
|----------|-----------|
| `effectiveLight` | See section 2 |
| `hasVerticalSupport` | `true` if cell is in trellis row AND `site.trellis == true` |
| `isTrellisRow` | `true` if cell's row/col is adjacent to `wallSide` (row 0 for `back`, etc.) |
| `accessScore` | `rowFromFront / (totalRows - 1)` where front = access side. Range 0.0-1.0, 1.0 = most accessible |

---

## 4. The Six Scoring Factors

Each factor produces a value on a 0-5 scale. These are combined into a weighted cell score (see section 5).

---

### Factor 1: Sun Fit (`sunFit`)

How well the cell's effective light matches the crop's sun requirements.

```
L = cell.effectiveLight
sunRange = crop.sunIdeal - crop.sunMin

if L >= crop.sunIdeal:
    sunFit = 5.0
elif L >= crop.sunMin:
    sunFit = 3.0 + 2.0 * ((L - crop.sunMin) / sunRange)     // sunRange > 0 always
else:
    sunFit = 1.0 + max(0, (L / crop.sunMin) * 2.0)

sunFit = clamp(sunFit, 0, 5)
```

**Design rationale**: Full sun crops like cherry_tom (sunMin=6, sunIdeal=8) score 5 at 8+ hrs, 3-5 in the 6-8 range, and drop sharply below 6. Shade-tolerant crops like lettuce (sunMin=4) score well even in partial shade, giving every faction a viable niche.

---

### Factor 2: Support Fit (`supFit`)

Whether a support-requiring crop has access to a trellis.

```
if crop.support == true:
    if cell.hasVerticalSupport:
        supFit = 5.0
    else:
        supFit = 1.0                                   // hard penalty: climber without trellis
elif crop.support == false:
    supFit = 3.0                                       // neutral: no trellis needed
```

**Note**: Placing a non-climber in the trellis row is not penalized in this factor but the trellis row is wasted opportunity (captured by adjacency/crowding dynamics).

---

### Factor 3: Shade Tolerance (`shadeFit`)

How well the crop tolerates reduced light. Uses the crop's `shadeScore` (1-5, higher = more shade tolerant).

```
if cell.effectiveLight < crop.sunMin:
    shadeFit = max(1.0, crop.shadeScore * 0.6)        // partial credit for shade-lovers
else:
    shadeFit = crop.shadeScore                         // direct value, 1.0-5.0
```

**Design rationale**: Lettuce (shadeScore=5) thrives in shade. Pepper (shadeScore=1) is punished. This ensures shade-heavy beds still have viable crop choices.

---

### Factor 4: Access Fit (`accFit`)

How much the crop benefits from being in an accessible row (front rows). Only matters for low/short crops that need frequent harvesting.

```
if crop.tall == false:
    accFit = 3.0 + cell.accessScore * 2.0              // range 3.0-5.0
else:
    accFit = 3.0                                       // tall crops: neutral
```

**Design rationale**: Short crops like radish and lettuce score higher in front rows where the player can reach them. Tall crops are indifferent to access position.

---

### Factor 5: Season Fit (`seaFit`)

Whether the crop suits the selected planting season.

```
if season == "spring":
    if crop.coolSeason:    seaFit = 5.0
    else:                  seaFit = 3.0

if season == "summer":
    if crop.coolSeason:    seaFit = 2.0
    else:                  seaFit = 5.0

if season == "latesummer":
    if crop.coolSeason:    seaFit = 1.0
    else:                  seaFit = 5.0

if season == "fall":
    if crop.coolSeason:    seaFit = 5.0
    else:                  seaFit = 2.0
```

**Design rationale**: Cool-season crops dominate spring/fall. Warm-season crops dominate summer. Late summer is the hardest season for cool crops. This creates distinct seasonal metas.

---

### Factor 6: Adjacency (`adjScore`)

Evaluates all 4 orthogonal neighbors (up, down, left, right). Sum of interaction deltas, clamped to [-2, +2].

For each occupied neighbor:

```
delta = 0

// Companion bonus
if neighbor.id is in crop.companions:
    delta += 0.5

// Conflict penalty
if neighbor.id is in crop.conflicts:
    delta -= 1.2

// Tall x tall crowding
if crop.tall AND neighbor.tall:
    delta -= 0.75

// Same-crop adjacency (monoculture penalty)
if neighbor.id == crop.id:
    delta -= 0.2

// Water mismatch
waterDiff = abs(crop.water - neighbor.water)
if waterDiff >= 2:
    delta -= 0.5
```

```
rawAdj = sum of all neighbor deltas
adjScore = clamp(rawAdj, -2, +2)
```

**Note on companion symmetry**: Companions are NOT automatically symmetric. If basil lists cherry_tom as a companion, basil gets +0.5 next to cherry_tom. Cherry_tom only benefits if it also lists basil. (It does, in this roster. But asymmetry is allowed by design.)

---

## 5. Weighted Cell Score

The six factors combine into a single cell score on a 0-10 scale.

### 5a. Factor weights

```
Sun     (sunFit):   weight = 2     // most important: light drives everything
Support (supFit):   weight = 1
Shade   (shadeFit): weight = 1
Access  (accFit):   weight = 1
Season  (seaFit):   weight = 1
```

Total weight = 6.

### 5b. Core score calculation

```
weightedCore = (sunFit * 2 + supFit + shadeFit + accFit + seaFit) / 3
```

This produces a range of roughly 0-10 (theoretical max: 5*6/3 = 10).

### 5c. Seasonal multiplier (from CROP_SCORING_DATA)

Each crop has per-season multipliers (0.0-1.0) that scale the core score:

```
seasonMult = crop.seasonalMultipliers[site.season]     // spring, summer, or fall
                                                       // latesummer uses summer multiplier
```

### 5d. Adjacency integration

```
preAdjScore = weightedCore * seasonMult
cellScore = clamp(preAdjScore + adjScore, 0, 10)
```

---

## 6. Event Modifiers

Events are deterministic game-state changes. Each crop has `eventVulnerabilities` tags. Events check these tags.

### 6a. Event types and effects

| Event | Affected tags | Modifier | Duration |
|-------|--------------|----------|----------|
| Heat wave | `heat-sensitive` crops lose score | -1.5 to cellScore | 1 round |
| Heat wave | `heat-tolerant` crops unaffected | +0.0 | — |
| Late frost | `frost-sensitive` crops lose score | -2.0 to cellScore | 1 round |
| Late frost | `frost-hardy` crops unaffected | +0.0 | — |
| Pest surge | `pest-target` crops lose score | -1.0 to cellScore | 1 round |
| Pest surge | `pest-repellent` adjacent nullifies for neighbors | nullifies -1.0 | — |
| Pest surge | `pest-decoy` crop absorbs penalty for neighbors | absorbs -1.0, self takes -1.5 | 1 round |
| Wind storm | `wind-sensitive` crops lose score | -1.0 to cellScore | 1 round |
| Blight | `blight-prone` crops lose score | -1.5 to cellScore | 2 rounds |

### 6b. Application order

```
eventModifiedScore = cellScore + sum(applicable event modifiers)
eventModifiedScore = clamp(eventModifiedScore, 0, 10)
```

Events apply AFTER the base cell score is computed. Multiple events can stack. All modifiers are visible and logged.

---

## 7. Intervention Modifiers

Player actions that modify scoring. Applied after events.

| Intervention | Effect | Scope |
|-------------|--------|-------|
| Deep water | +0.5 to cells with water >= 3 crops | selected cells |
| Mulch | +0.3 to all cells in bed, +0.5 to `heat-sensitive` during heat wave | whole bed |
| Row cover | nullifies frost event penalty | selected row |
| Companion spray (neem) | nullifies pest event for 1 round | whole bed |
| Succession replant | replaces crop, resets soil fatigue for that cell | single cell |

```
finalCellScore = clamp(eventModifiedScore + interventionBonus, 0, 10)
```

---

## 8. Harvest Yield Calculation

Yield is derived from the final cell score. Deterministic per-cell.

```
baseYield = 1.0                                         // 1.0 = expected harvest unit
yieldMultiplier = finalCellScore / 7.0                  // 7.0 is the "par" score
harvestYield = baseYield * yieldMultiplier
harvestYield = clamp(harvestYield, 0.1, 2.0)            // floor 10%, ceiling 200%
```

**Interpretation**: A cell scoring 7.0 yields exactly 1.0x. A perfect 10 yields ~1.43x. A struggling 3.5 yields 0.5x.

---

## 9. Soil Fatigue

Consecutive placement of heavy feeders (water >= 3) in the same cell across seasons degrades score.

```
heavyFeeder = (crop.water >= 3)

if heavyFeeder AND previousSeasonCrop in same cell was also heavyFeeder:
    fatiguePenalty = -0.3 per consecutive heavy-feeder season (cumulative)
    fatiguePenalty = max(fatiguePenalty, -0.9)           // caps at 3 consecutive seasons
else:
    fatiguePenalty = 0

fatigueAdjustedScore = clamp(finalCellScore + fatiguePenalty, 0, 10)
```

Heavy feeders: cherry_tom (3), lettuce (3), arugula (3), broccoli (3), kale (3), spinach (3), chard (3), basil (3), zucchini (3).

Light feeders (water <= 2): pole_beans, peas, radish, carrot, onion, beet, dill, pepper, marigold, nasturtium.

**Design rationale**: Encourages crop rotation. A bed of all-tomatoes for 3 seasons loses 0.9 points. Rotating in a light feeder resets the counter.

---

## 10. Bed Score Aggregation

### 10a. Cell average

```
occupiedCells = cells where crop != null
cellAvg = sum(fatigueAdjustedScore for each occupiedCell) / occupiedCells.length
```

### 10b. Fill bonus/penalty

Empty cells reduce the bed score.

```
fillRatio = occupiedCells.length / totalCells            // totalCells = 32
fillPenalty = (1 - sqrt(fillRatio)) * 1.5                // range 0-1.5
```

### 10c. Diversity bonus

```
uniqueCrops = count of distinct crop IDs in bed

if uniqueCrops >= 4:   diversityBonus = +0.7
elif uniqueCrops >= 3: diversityBonus = +0.5
elif uniqueCrops >= 2: diversityBonus = +0.3
else:                  diversityBonus = 0
```

### 10d. Structural penalties

```
tallCropTypes = count of distinct tall crop IDs in bed
if tallCropTypes > 1:  tallPenalty = -0.8
else:                  tallPenalty = 0

trellisTypes = count of distinct support=true crops in bed
if trellisTypes > 1:   trellisPenalty = -0.6
else:                  trellisPenalty = 0
```

### 10e. Final bed score

```
bedScore = cellAvg + diversityBonus + tallPenalty + trellisPenalty - fillPenalty
bedScore = clamp(bedScore, 0, 10)
```

---

## 11. Grade Thresholds

```
A  : bedScore >= 8.5
B  : bedScore >= 7.0
C  : bedScore >= 5.5
D  : bedScore >= 4.0
F  : bedScore <  4.0
```

Grades are displayed to the player. The grade letter and numeric score are both shown.

---

## 12. Recipe Bonus (Bed-Level)

If all crops for a recipe are present in the bed, a bonus is applied:

```
for each recipe in RECIPES:
    if all recipe.crops are present in bed:
        recipeBonusTotal += 0.2

bedScore += recipeBonusTotal                             // applied before grade clamping
bedScore = clamp(bedScore, 0, 10)
```

Maximum possible recipe bonus: 4 recipes x 0.2 = +0.8.

---

## 13. Faction Balance Validation

Every faction must have at least one strong use case. The design guarantees:

| Faction | Strength | Best season | Key niche |
|---------|----------|-------------|-----------|
| Climbers | High yield in trellis row | Summer | Only faction that uses vertical support; massive sunFit when placed correctly |
| Fast Cycles | Best shade tolerance | Spring/Fall | shadeScore 4-5 means they thrive where others cannot; fill empty cells fast |
| Brassicas | Cool-season powerhouse | Fall | Highest fall multipliers; companion to onion/dill creates strong clusters |
| Roots | Universal compatibility | All seasons | Low water, few conflicts; backbone of any rotation; carrot enables Mom's Sauce |
| Greens | Shade kings | Spring/Fall | shadeScore 5 for spinach; fill shady back rows no one else wants |
| Herbs | Recipe enablers | Summer | Basil appears in 4 of 4 recipes; dill + basil = Herb Bowl; companion synergy hub |
| Fruiting | Sun maximizers | Summer | Highest sunMin/sunIdeal; dominate full-sun beds; pepper + basil + onion = recipe engine |
| Companions | Defense + synergy | Summer | pest-repellent/pest-decoy tags; marigold companions 3 crops; no conflicts |

No single crop can dominate because:
1. Sun requirements vary (4-8 sunMin), so bed position matters.
2. Season multipliers ensure no crop is best in all 3 seasons.
3. Adjacency conflicts punish monoculture and force mixing.
4. Soil fatigue punishes repeated heavy feeders.
5. Recipes reward specific combinations, not individual crops.

---

## 14. Constants Reference

```
SHADOW_PENALTY_PER_ROW   = 0.75      // hours lost per row from wall
TALL_SHADE_CAST          = 0.5       // hours lost to adjacent row from tall crop
COMPANION_BONUS          = 0.5       // adjacency bonus per companion neighbor
CONFLICT_PENALTY         = 1.2       // adjacency penalty per conflicting neighbor
TALL_TALL_PENALTY        = 0.75      // adjacency penalty for adjacent tall crops
SAME_CROP_PENALTY        = 0.2       // monoculture adjacency penalty
WATER_MISMATCH_PENALTY   = 0.5       // penalty when water diff >= 2
ADJACENCY_CLAMP          = [-2, +2]  // adjacency score range
CELL_SCORE_RANGE         = [0, 10]   // per-cell score range
SUN_WEIGHT               = 2         // weight for sunFit in weighted average
OTHER_WEIGHT             = 1         // weight for all other factors
WEIGHT_DIVISOR           = 3         // divisor for weighted core
YIELD_PAR                = 7.0       // score that produces 1.0x yield
YIELD_RANGE              = [0.1, 2.0]
FATIGUE_PER_SEASON       = -0.3      // per consecutive heavy-feeder season
FATIGUE_CAP              = -0.9      // max fatigue penalty
DIVERSITY_4              = +0.7
DIVERSITY_3              = +0.5
DIVERSITY_2              = +0.3
TALL_TYPE_PENALTY        = -0.8      // multiple tall types in one bed
TRELLIS_TYPE_PENALTY     = -0.6      // multiple trellis types in one bed
RECIPE_BONUS             = 0.2       // per completed recipe
GRADE_A                  = 8.5
GRADE_B                  = 7.0
GRADE_C                  = 5.5
GRADE_D                  = 4.0
```

---

## 15. Implementation Notes

1. **All scoring is synchronous**. No async operations, no timers, no network calls.
2. **All inputs come from the workspace state** (site settings + cell contents). No external data.
3. **Scoring must be re-run in full** whenever any cell or site setting changes. No partial updates.
4. **The score cache in the workspace is for display only**. It is regenerated at runtime and never trusted as source of truth.
5. **Event and intervention state** is stored in the game chapter/round state, not in the workspace schema.
6. **seasonalMultipliers for "latesummer"** use the `summer` key value.
