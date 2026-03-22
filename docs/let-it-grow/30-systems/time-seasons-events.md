# Time, Seasons, and Events

## Time Structure

The game operates on a 12-chapter framework representing 4 seasons across 3 years.

### Phase Progression (Per Season)
```
PLANNING → EARLY_SEASON → MID_SEASON → LATE_SEASON → HARVEST → TRANSITION
```

Three beat phases (early, mid, late) each draw from the event deck.

### Season Calendar

| Year | Spring | Summer | Fall | Winter |
|------|--------|--------|------|--------|
| 1 | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
| 2 | Ch 5 | Ch 6 | Ch 7 | Ch 8 |
| 3 | Ch 9 | Ch 10 | Ch 11 | Ch 12 |

## Event System

### Event Selection
- Weighted random draw from canonical deck (`specs/EVENT_DECK.json`)
- Filtered by chapter gate and season
- No-duplicate rule within same season

### Event Targeting

| Target Type | Description |
|-------------|-------------|
| All cells | Affects entire bed |
| Random | Hits random subset of planted cells |
| Vulnerable | Targets crops without protection |
| Faction-specific | Affects one crop faction |
| Row | Targets entire row |

### Event Resolution Flow
1. Event card presented to player
2. Player selects intervention (if tokens available)
3. Effects applied to targeted cells
4. Summary report with damage/protection results

## Visual Seasons

### Sky Colors (Per Season)
- Spring: light blue, soft clouds
- Summer: deep blue, clear
- Fall: amber, warm
- Winter: grey, overcast

### Weather Effects
- **Rain**: 300-particle system
- **Frost**: Ground plane overlay
- **Sun rays**: Volumetric light beams
- Triggered by event keywords

### Scenery Adjustments
- Tree palettes shift per season
- Seasonal props (flowers, leaves, snow)
- Animated particles (fireflies summer, snow winter)

## Let It Grow Extensions

### Day/Night Cycle
- Optional visual day/night transitions
- Gameplay impact toggle (some crops need night rest)
- Lighting rig shifts from warm to cool

### Real-Time Sync
- Optional server-based clock
- Crops grow during offline play
- Configurable time scale (1 real hour = 1 game day, adjustable)

### Seasonal Festivals
| Season | Festival | Mechanic |
|--------|----------|----------|
| Spring | Bloom Festival | Bonus seed drops, planting bonuses |
| Summer | Growth Surge | Faster timers, heat challenges |
| Fall | Harvest Week | Scoring multipliers, recipe bonuses |
| Winter | Dormancy Challenge | Soil management mini-game |

### Monthly Event Rotations
- Events rotate monthly instead of per-phase
- NPC schedules tied to monthly calendar
- Festival grounds open during specific months
