# Save State and Data Model

## State Architecture (`state.js`)

### Phase Enum
```
PLANNING → EARLY_SEASON → MID_SEASON → LATE_SEASON → HARVEST → TRANSITION
```

Beat phases: early, mid, late (each draws one event)

### Game State
Top-level container holding campaign + season references.

### Campaign State
Persists across the full 12-chapter playthrough:

| Field | Type | Description |
|-------|------|-------------|
| chapter | number | Current chapter (1–12+) |
| season | string | Current season |
| cropUnlocks | array | Crops available to plant |
| pantry | object | Harvested crop inventory |
| keepsakes | array | Unlocked collectibles with timestamps |
| journal | array | Chapter completion records |
| soilHealth | array | Per-cell fatigue values |

### Season State
Resets each chapter/season:

| Field | Type | Description |
|-------|------|-------------|
| phase | enum | Current phase |
| grid | array[32] | Cell states (crop, soil, damage, protection, bonuses) |
| interventionTokens | number | Available actions this season |
| events | array | Events drawn this season |
| beatScores | object | Per-beat scoring snapshots |

### Grid Cell Structure
```js
{
  cropId: "tomato_01" | null,
  soilHealth: 0.35,          // fatigue (0 = fresh, 0.9 = max)
  damageState: "frost" | null,
  protection: false,
  interventionBonus: 0.5,
  carryForward: "enriched" | "compacted" | null
}
```

## Save System (`save.js`)

### Storage
- **Backend**: localStorage
- **Slots**: 3 independent save slots
- **Keys**: `campaign_slot_N`, `season_slot_N`

### Operations

| Function | Description |
|----------|-------------|
| `saveCampaign(slot)` | Persist campaign state + timestamp |
| `loadCampaign(slot)` | Restore campaign state |
| `saveSeasonState(slot)` | Store current season (excludes circular refs) |
| `deleteCampaign(slot)` | Remove slot data |
| `listSaves()` | Summary of all slots: chapter, season, score, grade, history |
| `awardKeepsake(id, meta)` | Add collectible with timestamp + context |
| `pushJournalEntry(entry)` | Record chapter completion (score, grade, events, crops) |

### Persistence Strategy
- Campaign state rebuilds fresh `SeasonState` from saved chapter/season data
- No engine objects stored (avoids serialization issues)
- Try-catch with localStorage quota warnings

### Journal Entry Structure
```js
{
  chapter: 5,
  season: "spring",
  score: 78,
  grade: "B+",
  events: ["late_frost", "spring_rain"],
  crops: ["tomato_01", "basil_02", "lettuce_01"]
}
```

## Data Dependencies (Build-Time)

| Source | File | Loaded By |
|--------|------|-----------|
| Crop definitions | `specs/CROP_SCORING_DATA.json` | `loader.js` via Vite alias |
| Event deck | `specs/EVENT_DECK.json` | `loader.js` via Vite alias |
| Dialogue routing | `specs/DIALOGUE_ENGINE.json` | `loader.js` via Vite alias |

All imported at build time — no runtime fetch. Works fully offline.

## Let It Grow Save Extensions

### Additional State Needed

| Data | Description |
|------|-------------|
| Player position | Current zone + coordinates |
| Quest log | Active/completed quests per NPC |
| Reputation | Per-NPC reputation values |
| Skills | XP + level per skill |
| Full inventory | Slot-based item list |
| Zone state | Per-zone persistent changes |
| World clock | Real-time sync offset (if enabled) |

### Migration Path
- Extend `campaignState` with new fields (backward-compatible defaults)
- Existing saves load normally — new fields initialize to defaults
- Version field in save data for future migrations
