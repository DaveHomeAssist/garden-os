# Garden OS — Workspace Schema v1

> Canonical reference for the persisted state contract.
> All tools (planner, visualizer, future multi-bed) read and write this shape.

---

## 1. Top-Level Envelope

```jsonc
{
  "schemaVersion": 1,            // integer, always present
  "meta": {
    "createdAt": "2026-03-14T…", // ISO-8601, set once on first save
    "updatedAt": "2026-03-14T…", // ISO-8601, updated every save
    "appVersion": "4.3"          // semver string of the app that last wrote
  },
  "selectedBedId": "bed-0",      // which bed is active in the UI
  "beds": [ /* …Bed objects… */ ],
  "ui": { /* …transient UI state… */ }
}
```

### Field rules

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `schemaVersion` | `integer` | yes | — | Bump only when the shape changes in a non-additive way |
| `meta.createdAt` | `string (ISO-8601)` | yes | now | Set once, never overwritten |
| `meta.updatedAt` | `string (ISO-8601)` | yes | now | Updated on every `save()` |
| `meta.appVersion` | `string` | yes | — | Semver of writing app (`"4.3"`, `"5.0"`, …) |
| `selectedBedId` | `string` | yes | `"bed-0"` | Must match a `beds[].id` |
| `beds` | `Bed[]` | yes | — | At least one bed |
| `ui` | `object` | no | `{}` | Transient; losing it is fine |

---

## 2. Bed Object

```jsonc
{
  "id": "bed-0",                  // stable unique id
  "name": "Main Bed",            // user-facing label
  "width": 8,                    // columns (2–10)
  "height": 4,                   // rows (2–10)
  "cells": ["tomato", null, …],  // flat array, length = width × height, row-major
  "settings": {
    "sunHours": 6,               // 2–10
    "orientation": "ew",         // "ew" | "ns"
    "wallSide": "back",          // "back" | "front" | "left" | "right" | "none"
    "trellis": true,             // legacy toggle (overridden when cage.enabled)
    "season": "spring",          // "spring" | "summer" | "latesummer" | "fall"
    "goal": "balanced",          // "balanced" | "yield" | "easy" | "salad" | "pickling" | "herbs" | "sanctuary"
    "zone": "7",                 // "" | "5"–"10"
    "cage": {
      "enabled": false,
      "rearTrellis": true,
      "wireSides": true,
      "height": "24",            // "18" | "24" | "36"
      "doorStyle": "double"      // "double" | "single" | "none"
    }
  }
}
```

### Cell array encoding

- Index `i` maps to `row = floor(i / width)`, `col = i % width`.
- Each entry is either a **crop key** (string matching a key in `CROPS`) or `null` (empty).
- Unknown crop keys are treated as `null` on load (forward-compat for custom crops later).

### Settings constraints

All settings are **per-bed** — when multi-bed lands, each bed carries its own environment.

### Runtime overrides (not stored)

When `cage.enabled` is true, two settings are **overridden at runtime** but their stored values are preserved so toggling cage off restores the user's previous choice:

| Field | Stored | Effective when cage on | Why |
|-------|--------|----------------------|-----|
| `wallSide` | User's last selection | `"back"` | Cage physically bolts to back wall |
| `trellis` | User's last toggle | Ignored | `hasVerticalSupport` derived from `isTrellisRow` in `buildZoneMap` |

---

## 3. UI Object (transient)

```jsonc
{
  "selectedCrop": "tomato",      // crop key or null
  "tool": "paint",               // "paint" | "erase"
  "selCell": "r0c2",             // selected cell id or null
  "catFilter": "all"             // palette category filter
}
```

This block is **nice-to-have**. If it's missing or corrupt, the app falls back to defaults. It is **not versioned** separately — it rides inside the same envelope.

---

## 4. Storage Keys

| Key | Contents | Notes |
|-----|----------|-------|
| `gardenOS` | Full workspace JSON (schema v1+) | New canonical key |
| `gardenOS_v4` | Legacy v4.3 payload (no schemaVersion) | Read-only during migration, deleted after |

The key change from `gardenOS_v4` → `gardenOS` is intentional: the new key is version-agnostic because `schemaVersion` lives *inside* the payload.

---

## 5. URL Share Format

### Outgoing (new URLs)

Same envelope, but **stripped** before encoding:

- Remove `ui` (transient, don't share someone else's selection state)
- Remove `meta.createdAt` / `meta.updatedAt` (irrelevant to recipient)
- Keep `schemaVersion`, `selectedBedId`, `beds`

Encoded as: `#bed=<encodeURIComponent(JSON.stringify(stripped))>`

### Incoming (backward compat)

Old v4 URLs have no `schemaVersion` — they contain `{ bedW, bedH, bed, settings }`.
The load pipeline detects this and runs `migrateFromV4()` automatically.
User-visible behavior is identical to the old app. See MIGRATION-CONTRACT.md §7 Test 2.

---

## 6. What This Unlocks

| v5.0 Feature | How schema supports it |
|---------------|----------------------|
| Multi-bed | `beds[]` array + `selectedBedId` — add beds, switch between them |
| Crop rotation memory | Add `beds[].history: [{ season, year, cells }]` — additive, no version bump |
| Custom crops | Add top-level `customCrops: {}` — additive, no version bump |
| Yield estimates | Derived at render time from `cells` + `CROPS` — no schema change |
| Print/export | Serialize from validated workspace state — single source of truth |
| PWA/offline | Cache the workspace key — one key, one shape |
