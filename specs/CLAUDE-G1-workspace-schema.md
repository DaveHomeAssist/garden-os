# CLAUDE-G1 — Garden OS: Multi Bed Workspace Schema Spec

**Status:** Codex handoff ready
**Date:** 2026-03-14
**Blocks:** CODEX-1, CODEX-2, CODEX-3, CODEX-4, CODEX-5

---

## 1. Top-Level Workspace Object

```json
{
  "id": "ws_<nanoid>",
  "version": 2,
  "schemaVersion": 2,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "meta": {
    "appVersion": "4.3.0",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "activeBedId": "bed_<nanoid>",
  "workspaceSettings": {
    "defaultSeason": "spring",
    "defaultZone": "7b",
    "defaultGoal": "variety"
  },
  "beds": [],
  "guideProgress": []
}
```

**Notes:**
- `version` tracks the workspace schema version for migration (current: 2, legacy v4.3 format: 1)
- `schemaVersion` is the field name already used in the existing codebase (kept for backward compat)
- `guideProgress` is an empty array until CODEX-4 (Guide Engine) ships

---

## 2. Bed Record

```json
{
  "id": "bed_<nanoid>",
  "name": "Main Bed",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "size": {
    "cols": 8,
    "rows": 4
  },
  "cage": { },
  "settings": {
    "sunHours": 8,
    "orientation": "north-south",
    "wallSide": "none",
    "trellis": "none",
    "season": "spring",
    "goal": "variety",
    "zone": "7b"
  },
  "plannerState": {
    "cells": [],
    "selectedCrop": null,
    "activeTool": "paint"
  },
  "scoreSummaryCache": null,
  "notes": ""
}
```

**Notes:**
- `cells` is a flat array of crop IDs (or `null`), length = cols * rows, row-major order
- `scoreSummaryCache` is `{ total, breakdown, computedAt }` or `null`; set to `null` on any cell change (invalidation)
- `settings` mirrors the existing per-bed settings object from v4.3

---

## 3. Cage Raw Config

```json
{
  "enabled": true,
  "trellis": {
    "enabled": true,
    "side": "north",
    "heightIn": 67,
    "climbZones": ["row-0", "row-1"]
  },
  "protection": {
    "enabled": true,
    "wireSides": ["south", "east", "west"],
    "lowerBandHeightIn": 24,
    "protectedZones": ["row-2", "row-3"]
  },
  "doors": {
    "enabled": true,
    "side": "south",
    "style": "hinged"
  }
}
```

**Rules:**
- All zone arrays store explicit row identifiers (`"row-0"`, `"row-1"`, etc.)
- All height/dimension fields use explicit unit suffixes (`heightIn`, `lowerBandHeightIn`)
- `climbZones` and `protectedZones` are user-editable in v1, with a "Reset to defaults" action that recomputes from cage geometry
- `side` values are compass directions: `"north"`, `"south"`, `"east"`, `"west"`
- `style` enum: `"hinged"` | `"lift-off"`

---

## 4. Derived Bed Traits (Computed, Never Persisted)

```json
{
  "zones": {
    "trellisRows": ["row-0", "row-1"],
    "protectedRows": ["row-2", "row-3"]
  },
  "perCell": {
    "0,0": {
      "isTrellisRow": true,
      "isProtected": false,
      "hasVerticalSupport": true,
      "accessPriority": "rear"
    },
    "3,7": {
      "isTrellisRow": false,
      "isProtected": true,
      "hasVerticalSupport": false,
      "accessPriority": "front"
    }
  },
  "capabilities": {
    "hasVerticalSupport": true,
    "hasCritterProtection": true,
    "hasEasyAccessFront": true
  }
}
```

**Rules:**
- `perCell` is keyed by `"row,col"` (e.g., `"0,0"`)
- `accessPriority`: `"front"` | `"rear"` | `"side"` — derived from door side and cell position
- Scoring and recommendations read ONLY from `deriveBedTraits()` output, NEVER from `bed.cage.*` directly
- This object is recomputed on cage config change; never written to localStorage

---

## 5. localStorage Migration Spec

### Key names
| Key | Format | Status |
|-----|--------|--------|
| `gardenOS_v4` | Legacy v4.0–v4.3 single-bed format | Read-only, deleted after migration |
| `gardenOS` | Current workspace format (v4.3+) | Active read/write key |

### Migration: `migrateV0toV1(legacyState)`
- **Detection:** On app load, check `localStorage.getItem('gardenOS')` first. If found and valid, use it. If not found, check `localStorage.getItem('gardenOS_v4')`.
- **Transform:** Wrap the legacy single-bed state into a workspace with one bed:
  ```
  legacy { bedW, bedH, bed[], settings, ui }
  →
  workspace { version: 2, activeBedId: <new>, beds: [<wrapped bed>], ... }
  ```
- **Cleanup:** After successful migration, `localStorage.removeItem('gardenOS_v4')`
- **Note:** The existing codebase already performs this migration at lines 1048–1068 of `garden-planner-v4.html`. CODEX-1 should preserve and extend this logic, not replace it.

### Migration: `migrateV1toV2(workspace)`
- **When:** Workspace has `version: 1` or `schemaVersion: 1`
- **Transform:** Add `guideProgress: []`, normalize cage config to new schema shape, bump version to 2
- **Backward compat:** If fields already exist, skip; migration is idempotent

### Malformed data recovery
- If JSON parse fails or required fields are missing:
  - Load a minimal empty workspace (`{ version: 2, beds: [], activeBedId: null }`)
  - Show a recovery banner with two actions:
    - **"Reset"** — clears localStorage, starts fresh
    - **"Try to recover"** — attempts to extract any valid bed data from the malformed JSON, wraps into workspace
  - Banner persists until user acts; does not auto-dismiss

---

## 6. Function Boundary Definitions

```
loadWorkspace() → Workspace | null
  Reads from localStorage key 'gardenOS'
  Returns null if key missing
  Returns minimal empty workspace + triggers recovery banner if malformed

saveWorkspace(workspace: Workspace) → void
  Writes to localStorage key 'gardenOS' with try/catch
  Updates workspace.updatedAt and workspace.meta.updatedAt
  Silently fails if storage quota exceeded (log warning, do not crash)

createBed(name: string, size: { cols, rows }, cageConfig?: CageConfig) → Bed
  Generates new bed ID
  Defaults: cage disabled, empty cells, no notes
  Does NOT save workspace — caller is responsible for save

duplicateBed(bedId: string) → Bed
  Deep clones bed, generates new ID, appends " (copy)" to name
  Clears scoreSummaryCache on the clone
  Does NOT save workspace — caller is responsible for save

setActiveBed(bedId: string) → void
  Updates workspace.activeBedId
  Triggers re-render of active bed only
  Saves workspace

deriveBedTraits(bed: Bed) → BedTraits
  Pure function — no side effects
  Computes zones, perCell, capabilities from bed.cage + bed.size
  Result is never persisted

invalidateScoreCache(bedId: string) → void
  Sets bed.scoreSummaryCache = null
  Does NOT trigger score recomputation (lazy — recomputes on next read)

migrateV0toV1(legacyState: object) → Workspace
  Transforms legacy gardenOS_v4 format to workspace v2
  Generates new IDs for workspace and bed
  Preserves all cell data and settings

migrateV1toV2(workspace: Workspace) → Workspace
  Adds guideProgress[], normalizes cage config shape
  Idempotent — safe to call on already-migrated data
```

---

## 7. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Is the crop catalog global or per-bed? | **v1: Global.** All beds share the same crop definitions. Per-bed overrides (custom crops) deferred to v2. |
| 2 | Should climbZones/protectedZones be user-editable? | **v1: Yes**, with "Reset to defaults" that recomputes from geometry. |
| 3 | Max beds per workspace? | **v1: 8.** Soft limit in UI (disable "Add bed" button), not a hard schema constraint. |

---

## 8. Output Contract

**Changed files:** `garden-planner-v4.html` (single file)

**Verification steps:**
1. Fresh load with no localStorage → empty workspace, add bed modal appears
2. Load with existing `gardenOS` key → migrates cleanly, all cell data preserved
3. Load with legacy `gardenOS_v4` key → migrates to workspace, legacy key deleted
4. Load with malformed JSON → recovery banner appears with Reset and Try to recover
5. Create bed, duplicate bed, switch beds → each renders correctly
6. Cage config change → `deriveBedTraits()` recomputes, score invalidates
7. Undo/redo still works per-bed
8. Inspect panel still works
9. Score updates still work
10. No console errors on any of the above

**Known risks:**
- Storage quota: 8 beds × large cell arrays could approach 5MB localStorage limit on some browsers
- Performance: deriveBedTraits() runs on every cage change; must stay under 16ms for 20×20 grid
- Migration: if user has manually edited localStorage JSON, recovery path must not crash
