# Scoring Algorithm Reference

## Architecture

Scoring is split into two layers:
- **Cell-level** (`cell-score.js`): Individual cell quality on a 0–10 scale
- **Bed-level** (`bed-score.js`): Aggregate evaluation with bonuses and penalties

Both are **pure math** — no side effects, no state mutation.

## Cell Score (0–10)

### Six Factors

| # | Factor | Weight | Range | Description |
|---|--------|--------|-------|-------------|
| 1 | Sun Fit | 2× | 0–1 | How well cell's light matches crop needs |
| 2 | Support Fit | 1× | 0–1 | Climbing crop near trellis? |
| 3 | Shade Tolerance | 1× | 0–1 | Crop's resilience to low light |
| 4 | Access Fit | 1× | 0–1 | Position suitability (height × row) |
| 5 | Season Fit | 1× | 0–1 | Cool-season bonus spring/fall, warm bonus summer |
| 6 | Adjacency | ±2 | additive | Companion bonuses, conflict penalties, tall-crop crowding, water mismatches |

### Formula
```
base = (sunFit×2 + supportFit + shadeTolerance + accessFit + seasonFit) / 3
score = base × seasonalFactors + adjacency + eventModifiers + interventionBonus - soilFatigue
final = clamp(score, 0, 10)
```

### Adjacency Rules
- Companion crops adjacent: positive bonus
- Conflicting crops adjacent: negative penalty
- Tall crops crowding shorter crops: penalty
- Water-need mismatches: penalty

## Bed Score (0–100)

### Components

| Component | Calculation | Range |
|-----------|-------------|-------|
| Cell Average | Mean score of occupied cells | 0–10 |
| Fill Ratio | sqrt(planted/total) penalty for sparse beds | 0–1 |
| Diversity Bonus | Scales from 0 at 1 type to 0.7 at 4+ types | 0–0.7 |
| Recipe Bonus | Matched recipe ingredients | 0–0.8 |
| Tall Crop Penalty | Multiple tall crops | -0.8 |
| Support Penalty | Multiple support structures | -0.6 |

### Grade Thresholds

| Grade | Min Score |
|-------|-----------|
| A+ | 90 |
| A | 80 |
| B+ | 75 |
| B | 65 |
| C+ | 60 |
| C | 50 |
| D | 40 |
| F | <40 |

### Output Object
```js
{
  score: 78,
  grade: "B+",
  breakdown: { cellAvg, fillRatio, diversity, recipe, tallPenalty, supportPenalty },
  yields: [...],        // predicted harvest amounts
  recipeMatches: [...]  // completed recipes
}
```

## Soil Fatigue

- Heavy feeders (tomatoes, peppers, leafy greens, herbs) accumulate fatigue
- Fatigue caps at 0.9 (never fully dead soil)
- Carry-forward: mulch can enrich, compacting degrades
- Winter review shows per-cell fatigue percentages
- Fatigue subtracts directly from cell score
