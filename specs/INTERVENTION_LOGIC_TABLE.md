# Garden OS — Intervention Logic Table

Generated: 2026-03-21
Source: SCORING_RULES.md, SEASON_ENGINE_SPEC.md, EVENT_DECK.json, CROP_SCORING_DATA.json

---

## Token Economy

| Rule | Value |
|------|-------|
| Tokens per beat | 1 |
| Beats per season | 3 (early, mid, late) |
| Max tokens per season | 3 |
| Accumulation | None — use-or-lose per beat |
| Cost per intervention | 1 token |

---

## Intervention × Outcome Matrix

| Intervention | Target | Immediate Effect | Score Impact | Duration | Carry-Forward | Best Against |
|---|---|---|---|---|---|---|
| **Protect** | 1 planted cell | Sets `interventionFlag = "protected"` | Nullifies current beat's event penalty on that cell | Current beat only | None | Frost (-2.0), Pest surge (-1.5), Wind (-1.0), Heat (-1.0) |
| **Mulch** | 1 planted cell | Sets `interventionFlag = "mulched"` | +0.5 to cell score for rest of season | Rest of season | +0.25 to cell next season ("enriched") | Any negative event; also works preemptively on positive beats |
| **Companion Patch** | 1 planted cell | Sets `interventionFlag = "companion_patched"` | +1.0 adjacency bonus | Current beat only | None | Crops with bad/missing neighbors; slug/pest events targeting isolated cells |
| **Swap** | 2 adjacent cells | Exchanges `cropId` between cells | Indirect — moves crop to safer/better position before event resolves | Permanent | Inherits new position's scoring context | Multi-row events, moving crop out of event target zone |
| **Prune** | 1 planted cell | Sets `cropId = null` | Cell scores 0 (removed from bed average) | Permanent | Cell is fallow next season (no fatigue) | Terminal blight, pest infestation on low-value crop — prevents dragging down average |
| **Accept Loss** | None | Token forfeited | None | N/A | None | Low-damage events, positive events, saving mental effort |

---

## Event Valence × Optimal Intervention

| Event Type | Example | Penalty | Protect | Mulch | Companion Patch | Swap | Prune | Accept Loss |
|---|---|---|---|---|---|---|---|---|
| **Frost** (targeted) | Late Frost Advisory | -2.0 | **Best** | OK | Weak | OK | Drastic | If low-value |
| **Pest surge** (filtered) | Tomato Hornworm | -1.5 | **Best** on high-value | OK | **Good** | OK if adjacent safe | OK for damaged crop | If low-value cells |
| **Heat wave** (zone) | August Scorcher | -1.0 | **Best** on exposed | **Good** | Weak | **Good** to shaded row | Overkill | If few exposed |
| **Wind** (structural) | Thunderstorm | -1.5 | **Best** | OK | Irrelevant | **Good** to sheltered | OK if no trellis | If all supported |
| **Positive** (buff) | Spring Rain Streak | +0.75 | Waste | **Best** (stack) | **Good** | Waste | Waste | **Default** |
| **Mixed** | Neighbor's Compost | +0.5/-0.3 | OK on penalty row | **Best** on bonus row | OK on penalty row | **Good** | Never | If minor |
| **Carry-forward** | Frozen Pipe Scare | -0.5 next season | Doesn't work | **Best** (carries +0.25) | Doesn't carry | Doesn't affect | Doesn't help | **Default** |

---

## Intervention Frequency in Event Deck (40 events)

| Intervention | Events Offering It | % of Deck |
|---|---|---|
| Accept Loss | 40 | 100% |
| Mulch | 20 | 50% |
| Protect | 19 | 48% |
| Companion Patch | 14 | 35% |
| Prune | 12 | 30% |
| Swap | 11 | 28% |

---

## Decision Framework (Per Beat)

```
1. Is the event POSITIVE?
   → Yes: MULCH the best cell (stack bonuses) or ACCEPT LOSS
   → No: continue

2. How many cells are affected?
   → 1 cell: PROTECT it (complete nullification)
   → 2-4 cells: PROTECT the highest-value one
   → 5+ cells: Consider SWAP or MULCH (protect can't cover all)

3. Is the penalty > 1.5?
   → Yes: PROTECT is essential (saves 1.5+ points)
   → No: MULCH may be better (permanent +0.5 vs temporary shield)

4. Is the affected crop already low-scoring?
   → Yes: PRUNE it (removing a 3.0 cell from a 7.5 average raises the average)
   → No: PROTECT or COMPANION PATCH

5. Is the event a carry-forward type?
   → Yes: MULCH (only intervention with carry-forward benefit)
   → No: Choose based on magnitude

6. Remaining beats this season?
   → 2+ beats left: MULCH preferred (persistent value)
   → Last beat: PROTECT preferred (immediate save, no future value needed)
```

---

## Score Impact Scenarios

| Scenario | Without Intervention | With Best Intervention | Delta |
|---|---|---|---|
| Frost hits 2 basil cells (-2.0 each) | Bed avg drops ~0.5 | Protect 1: avg drops ~0.25 | +0.25 saved |
| Pest hits 4 tomato cells (-1.5 each) | Bed avg drops ~0.75 | Protect best tomato: avg drops ~0.56 | +0.19 saved |
| Rain buffs 3 cells (+0.75) + mulch best | 3 cells get +0.75 | 1 cell gets +1.25, 2 get +0.75 | +0.06 gained |
| Low-value crop (3.0) in 8-cell bed pruned | Avg = (sum)/8 | Avg = (sum - 3.0)/7 | +0.61 if avg > 3.0 |
| Companion patch on isolated crop | adjScore = -0.5 | adjScore = +0.5 | +1.0 for that cell |

---

## Carry-Forward Effects

| Source | Effect Next Season | Duration | Stacking | Implementation |
|---|---|---|---|---|
| Mulch intervention | +0.25 to cell eventModifier | 1 season | No — flag not restored, one-time modifier | `grid[idx].eventModifier += 0.25` |
| Enriched event | +0.30 to affected cells | 1 season | No | `grid[idx].eventModifier += 0.3` |
| Compacted event | -0.50 to affected cells | 1 season | No | `grid[idx].eventModifier -= 0.5` |
| Heavy-feeder fatigue | -0.30 per consecutive season | Cumulative (max -1.5) | Yes — resets on rotation/fallow | `grid[idx].soilFatigue = v` |
| Frozen pipe carry-forward | -0.50 to row-3 | 1 season | No | Via eventMemory system |
