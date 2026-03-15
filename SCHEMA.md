# Garden OS — Data Schema Reference

Version: 1 · App: v4.3 · Last updated: 2026-03-15

## Overview

Garden OS uses a single **Workspace** object as its canonical data container. The workspace is persisted to localStorage, shared via URL hash (single bed), and exported/imported as `.gos.json` files. All tools — Planner, Visualizer, Scoring Map, Ops Guide — read from or write to this structure.

The formal JSON Schema is in [`gos-schema.json`](gos-schema.json).

---

## Workspace

Top-level container. One workspace per browser profile.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | `workspace-xxxxx` format |
| `version` | integer | yes | Schema version. Currently `1`. |
| `createdAt` | ISO-8601 | yes | Creation timestamp |
| `updatedAt` | ISO-8601 | yes | Last save timestamp |
| `activeBedId` | string | yes | ID of the selected bed |
| `workspaceSettings` | object | yes | UI state: `catFilter`, `rightTab` |
| `beds` | Bed[] | yes | At least one bed |
| `guideProgress` | string[] | no | Completed onboarding step IDs |

Export-only fields: `exportedAt`, `appVersion`.

---

## Bed

Each bed is an independent raised bed with its own grid, crops, cage config, and site settings.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `bed-xxxxx` format |
| `name` | string | User name, max 64 chars |
| `size.cols` | int 2–10 | Grid width |
| `size.rows` | int 2–10 | Grid depth |
| `cage` | CageConfig | Cage structure settings |
| `plannerState` | PlannerState | Grid cells + site inputs |
| `scoreSummaryCache` | object | Cached bed score (regenerated at runtime) |
| `notes` | string | Free-text notes |

---

## PlannerState

Current state of the planner grid and controls for a bed.

| Field | Type | Description |
|-------|------|-------------|
| `cells` | (string\|null)[] | Flat array, length = cols×rows, row-major. Each entry is a crop key or null. |
| `selectedCrop` | string | Active crop in the palette |
| `activeTool` | `"paint"` \| `"erase"` | Active tool |
| `site` | SiteSettings | Environmental inputs |

---

## SiteSettings

Environmental inputs that drive the scoring engine.

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `sunHours` | number | 2–10 | 6 | Average daily sun hours |
| `orientation` | string | `ew`, `ns` | `ew` | Bed orientation |
| `wallSide` | string | `back`, `front`, `left`, `right`, `none` | `back` | Adjacent wall/fence |
| `trellis` | boolean | — | true | Trellis available on wall side |
| `season` | string | `spring`, `summer`, `latesummer`, `fall` | `summer` | Planting season |
| `goal` | string | `balanced`, `yield`, `easy`, `salad`, `pickling`, `herbs`, `sanctuary` | `balanced` | Garden goal |
| `zone` | string | `""`, `5`–`10` | `""` | USDA hardiness zone |

---

## CageConfig

Physical cage structure attached to a bed.

```
cage
├── enabled: boolean
├── trellis
│   ├── enabled: boolean
│   ├── side: wall enum
│   ├── heightIn: 0–120
│   └── climbZones: ["row-1", ...]
├── protection
│   ├── enabled: boolean
│   ├── wireSides: boolean
│   ├── lowerBandHeightIn: 0–120
│   └── protectedZones: ["row-2", "row-3", ...]
└── doors
    ├── enabled: boolean
    ├── side: wall enum
    └── style: "double" | "single" | "none"
```

**Derived cell traits** (computed at runtime, not stored):
- `isTrellisRow` — cell's row label is in `climbZones`
- `isProtected` — cell's row label is in `protectedZones`
- `isCritterSafe` — protection enabled + wire sides active
- `hasVerticalSupport` — trellis enabled + cell is in a climb zone
- `accessScore` — proximity to front/door side
- `accessPriority` — normalized access rank for succession bonuses

---

## Crop Database (CROPS)

38 crops across 8 categories. The CROPS object is a compile-time constant — not stored in the workspace. Crop keys in `plannerState.cells` are validated against CROPS on load.

### Categories

`cucurbit` · `greens` · `legume` · `roots` · `herbs` · `fruiting` · `brassica` · `flowers`

### Crop Record Fields

| Field | Type | Scoring Role |
|-------|------|-------------|
| `sunMin` / `sunIdeal` | number | Sun fit factor (weight 2x) |
| `height` / `habit` | string | Support fit + access fit + adjacency |
| `trellisRequired` | boolean | Hard constraint — score = 1 if unmet |
| `trellisZone` | boolean | Structural bonus in climb zones |
| `protectedZone` | boolean | Structural bonus in protected zones |
| `shadeScore` | 1–5 | Shade tolerance factor |
| `coolSeason` | boolean | Season fit factor |
| `waterNeed` | low/med/high | Adjacency water mismatch penalty |
| `companionTags` | string[] | Adjacency companion bonus |
| `conflictTags` | string[] | Adjacency conflict penalty |
| `successionFriendly` | boolean | Access priority structural bonus |

---

## Scoring Algorithm

### Cell Score (0–10)

```
rawScore = (sunFit×2 + supFit + shadeFit + accFit + seaFit) / 3
cellScore = clamp(0, 10, rawScore + structBonus + adjScore)
```

| Factor | Weight | Range | Source |
|--------|--------|-------|--------|
| Sun Fit | 2x | 0–5 | `effectiveLight` vs `sunMin`/`sunIdeal` |
| Support Fit | 1x | 1–5 | `hasVerticalSupport` vs `habit`/`trellisRequired` |
| Shade Tolerance | 1x | 0–5 | `shadeScore`, reduced when light < sunMin |
| Access Fit | 1x | 3–5 | Cell position × crop height |
| Season Fit | 1x | 1–5 | `season` × `coolSeason` |
| Structural Bonus | additive | -2 to +3 | Trellis row, protected zone, critter-safe, succession |
| Adjacency | additive | -2 to +2 | Companion, conflict, same-crop, tall-tall, water |

### Bed Score (0–100)

```
bedScore = mean(cellScores) × 10 + goalBonus
```

Goal bonus: 0–5 points based on `goal` setting and planted crop mix.

---

## Persistence Model

| Mechanism | Scope | Durability | Format |
|-----------|-------|------------|--------|
| localStorage | Full workspace | Session-bound | JSON string |
| URL hash | Single bed | Shareable link | `#bed=` + encoded JSON |
| .gos.json export | Full workspace | File on disk | JSON file |

### Migration

`migrateV0toV1()` handles legacy formats (pre-workspace structure). All loads pass through `validateWorkspace()` which normalizes, clamps, and fills defaults.

### Validation Rules

- Crop keys validated against `CROPS` object — unknown keys become `null`
- Numeric values clamped to valid ranges
- Enum values checked against allowlists (`VALID_ORIENTATIONS`, `VALID_WALLS`, etc.)
- Cell array padded/trimmed to match `cols × rows`
- Missing beds → validation failure (workspace requires ≥1 bed)
