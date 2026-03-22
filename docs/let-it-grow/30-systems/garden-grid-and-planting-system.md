# Garden Grid and Planting System

## Current Implementation

### Grid Specification
- **Size**: 8 columns × 4 rows = 32 cells
- **Model**: Cedar raised bed with beveled edges, height 0.15, thickness 0.06
- **Features**: Back lattice trellis, front critter guard with chicken wire, row labels
- **Source**: `src/scene/bed-model.js`

### Cell Data Structure (from `state.js`)
Each cell tracks:
- `cropId` — planted crop (null if empty)
- `soilHealth` — accumulated fatigue (0–0.9 cap)
- `damageState` — frost/storm/flood/heat/blight/pest/impact
- `protection` — boolean flag (cleared after event resolution)
- `interventionBonus` — modifier from player actions
- `carryForward` — enriched/compacted from previous season

### Crop Factions (8 types)
| Faction | Examples | Behavior |
|---------|----------|----------|
| Climbers | Tomatoes, beans | Need trellis support |
| Fast Cycles | Lettuce, radish | Quick harvest |
| Greens | Spinach, kale | Shade tolerant |
| Roots | Carrots, beets | Low maintenance |
| Herbs | Basil, cilantro | Companion benefits |
| Fruiting | Peppers, squash | Heavy feeders |
| Brassicas | Broccoli, cabbage | Cool-season |
| Companions | Marigolds, nasturtiums | Adjacency bonuses |

### Planting Rules
- Minimum 8 crops required before advancing from PLANNING phase
- Crops are chapter-gated (unlock progressively)
- Heavy feeders (tomatoes, peppers, leafy greens, herbs) accumulate soil fatigue

## Scoring (6-Factor Model)

### Cell Score (`cell-score.js`)
| Factor | Weight | Description |
|--------|--------|-------------|
| Sun Fit | 2× | Light availability vs crop requirements |
| Support Fit | 1× | Climbing crops near trellis |
| Shade Tolerance | 1× | Crop's resilience to shade |
| Access Fit | 1× | Height/row position suitability |
| Season Fit | 1× | Cool-season bonus (spring/fall), summer bonus |
| Adjacency | ±2 additive | Companion bonuses, conflict penalties, crowding |

**Formula**: `(sf×2 + sup + shd + acc + sea) / 3 × seasonal_factors + adjacency + events + intervention + soil_fatigue`

### Bed Score (`bed-score.js`)
| Component | Effect |
|-----------|--------|
| Cell average | Mean of occupied cell scores |
| Fill ratio | Penalty for sparse planting (sqrt formula) |
| Diversity bonus | +0.7 at 4+ crop types |
| Recipe bonus | Up to +0.8 for recipe completion |
| Tall crop penalty | -0.8 if multiple tall crops |
| Support crop penalty | -0.6 if multiple supports |

### Grade Scale
A+ (90+), A (80+), B+ (75+), B (65+), C+ (60+), C (50+), D (40+), F (<40)

## Let It Grow Extensions

### Grid Expansion
- Start with 8×4 → unlock 8×6 → 8×8 → multiple beds
- Different bed types: raised, in-ground, container, greenhouse

### Real-Time Planting
- Transition from turn-based "place crop" to real-time "dig hole, drop seed, water"
- Tool-based interaction replacing click-to-plant

### Soil System Depth
- Visible soil composition (sand/clay/loam)
- pH levels affecting crop viability
- Composting input affects soil stats over time
