# Garden OS — Migration Contract

> Rules for the persistence API and how legacy state becomes schema v1.

---

## 1. Persistence API

Five functions. Every read path goes through all five in order.
Every write path calls `save()`.

```
load() → validateRaw() → migrate() → validateWorkspace() → save()
```

Two validation passes: `validateRaw` protects `migrate()` from garbage;
`validateWorkspace` enforces the full schema contract after migration.

### `load(): RawPayload | null`

**Source priority** (first match wins):

1. URL hash (`#bed=…`) — parse JSON from decoded value.
2. `localStorage.getItem('gardenOS')` — schema v1+ payload.
3. `localStorage.getItem('gardenOS_v4')` — legacy payload.

**Fallback chain on failure:**

- Hash present but malformed → `console.warn`, strip hash from URL, fall back to localStorage sources.
- localStorage malformed → `console.warn`, return `null` (fresh workspace).
- **Never** mix partial state from two sources. Each source either provides the full payload or is skipped entirely.
- **Never** throw — bad data means fresh start.

### `validateRaw(raw): { ok, payload?, errors? }`

Lightweight structural gate — safe to pass to `migrate()`:

- Is it a non-null, non-array object?
- Does it have *either* `schemaVersion` (v1+) or `bedW`+`bed` (legacy v4)?
- Is the payload size within `MAX_SHARE_PAYLOAD`?
- Returns `{ ok: true, payload }` or `{ ok: false, errors }`.
- On `ok: false`, the app starts with a fresh workspace and logs errors to console.

### `migrate(payload): Workspace`

- If `schemaVersion` is missing → legacy v4.3 payload. Run `migrateFromV4(payload)`.
- If `schemaVersion === CURRENT_SCHEMA` → return as-is.
- If `schemaVersion > CURRENT_SCHEMA` → refuse to load (newer app wrote this). Fresh start + console warning.
- Future: chain migrations (`1→2`, `2→3`, …). Each migration is a pure function.

### `validateWorkspace(workspace): { ok, workspace?, errors? }`

Full schema enforcement after migration:

- `schemaVersion` is a positive integer.
- `beds.length >= 1`.
- `selectedBedId` points to an existing bed (falls back to `beds[0].id`).
- `cells.length === width * height` (pads with `null` or truncates).
- Every non-null cell is a known crop key (unknown → `null`).
- Settings fields are within valid enums/ranges (clamp/fallback to defaults).
- Unknown fields are **preserved but ignored** (forward-compat).
- Returns `{ ok: true, workspace }` or `{ ok: false, errors }`.

### `save(workspace): void`

- Set `meta.updatedAt` to now.
- Set `meta.appVersion` to current app version.
- `JSON.stringify` → `localStorage.setItem('gardenOS', …)`.
- **Delete** `gardenOS_v4` if it still exists (one-time cleanup after successful migration).

---

## 2. Migration: v4.3 → Schema v1

### Detection

A legacy payload has **no `schemaVersion` field** and has top-level `bedW`, `bedH`, `bed`, `settings`.

### Transform: `migrateFromV4(legacy) → Workspace`

```js
function migrateFromV4(legacy) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: {
      createdAt: now,
      updatedAt: now,
      appVersion: APP_VERSION
    },
    selectedBedId: 'bed-0',
    beds: [{
      id: 'bed-0',
      name: 'Main Bed',
      width:  Math.min(10, Math.max(2, Math.floor(+legacy.bedW) || 8)),
      height: Math.min(10, Math.max(2, Math.floor(+legacy.bedH) || 4)),
      cells:  Array.isArray(legacy.bed)
                ? legacy.bed.map(c => (typeof c === 'string' && CROPS[c]) ? c : null)
                : [],
      settings: {
        sunHours:    parseFloat(legacy.settings?.sunHours) || 6,
        orientation: legacy.settings?.orientation || 'ew',
        wallSide:    legacy.settings?.wallSide    || 'back',
        trellis:     legacy.settings?.trellis     ?? true,
        season:      legacy.settings?.season      || 'spring',
        goal:        legacy.settings?.goal        || 'balanced',
        zone:        legacy.settings?.zone        || '',
        cage: {
          enabled:      legacy.settings?.cage?.enabled      ?? false,
          rearTrellis:  legacy.settings?.cage?.rearTrellis  ?? true,
          wireSides:    legacy.settings?.cage?.wireSides    ?? true,
          height:       legacy.settings?.cage?.height       || '24',
          doorStyle:    legacy.settings?.cage?.doorStyle    || 'double'
        }
      }
    }],
    ui: legacy.ui ? {
      selectedCrop: legacy.ui.selectedCrop || null,
      tool:         legacy.ui.tool         || 'paint',
      selCell:      legacy.ui.selCell      || null,
      catFilter:    legacy.ui.catFilter    || 'all'
    } : {}
  };
}
```

### Post-migration

1. `save()` writes the new shape to `gardenOS`.
2. `localStorage.removeItem('gardenOS_v4')` — old key is gone.
3. User sees no difference. The planner loads exactly as before.

---

## 3. Invariants

These must always be true after the full pipeline:

| Invariant | Enforced by |
|-----------|-------------|
| `schemaVersion` is a positive integer | `validateWorkspace()` |
| `beds.length >= 1` | `validateWorkspace()` |
| `selectedBedId` points to an existing bed | `validateWorkspace()` (falls back to `beds[0].id`) |
| `cells.length === width * height` | `validateWorkspace()` (pads with `null` or truncates) |
| Every non-null cell is a known crop key | `validateWorkspace()` (unknown → `null`) |
| Settings fields are within valid enums/ranges | `validateWorkspace()` (clamp/fallback to defaults) |
| `meta.updatedAt` is current | `save()` |

### Runtime derivation rules

These fields are **stored as the user set them** but **overridden at runtime** when cage mode is active. This preserves the user's choice so toggling cage off restores their previous setting.

| Field | Stored value | Effective value when `cage.enabled` |
|-------|-------------|-------------------------------------|
| `wallSide` | User's last manual selection | Always `"back"` (cage bolts to back wall) |
| `trellis` | User's last manual toggle | Ignored — `hasVerticalSupport` is derived from `isTrellisRow` in `buildZoneMap` |

---

## 4. Adding a New Schema Version (future)

1. Bump `CURRENT_SCHEMA` to N+1.
2. Write `migrateFromVN(payload) → Workspace` — a pure function, no side effects.
3. Chain: `migrate()` calls `migrateFromV1` then `migrateFromV2` etc. as needed.
4. Update `WORKSPACE-SCHEMA.md` with the new shape.
5. Old payloads auto-upgrade on next load. No user action required.

---

## 5. Export / Import Pipeline

```
                     ┌──────────────┐
                     │  Workspace   │  (in-memory, validated)
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         JSON export    Print view    CSV export
         (full state)   (read-only)   (cells + scores)
              │
              ▼
         JSON import → validateRaw() → migrate() → validateWorkspace() → save()
```

- **JSON** is the source of truth. Full round-trip fidelity.
- **Print** and **CSV** are derived, read-only views of the validated state.
- **Import** always goes through the same `validate → migrate` pipeline, so it handles old exports, shared URLs, or hand-edited JSON safely.

---

## 6. Implementation Order

1. Add `CURRENT_SCHEMA = 1` and `APP_VERSION` constants.
2. Write `migrateFromV4()`.
3. Write `validateRaw()` and `validateWorkspace()`.
4. Refactor existing `loadState()` / `saveState()` to use the five-function pipeline.
5. Move wallSide/trellis cage overrides from storage writes to runtime derivation (in `syncCageUI` and `buildZoneMap`).
6. Run acceptance tests (§7), then build v5.0 features on top of the clean contract.

---

## 7. Acceptance Tests

These must pass before the persistence refactor ships. All tests verify **user-visible behavior is identical** before and after migration.

### Test 1: localStorage migration round-trip

1. Seed `gardenOS_v4` with a known v4.3 payload (8×4 bed, 6 crops placed, cage enabled, zone 7).
2. Run the full pipeline: `load → validateRaw → migrate → validateWorkspace → save`.
3. Assert `gardenOS` key exists with `schemaVersion: 1`.
4. Assert `gardenOS_v4` key is deleted.
5. Assert cell contents, bed dimensions, and all settings match the seed exactly.
6. Reload — assert the app renders identically.

### Test 2: v4 shared URL loads into schema v1

1. Encode the same v4.3 payload as a URL hash: `#bed=<encodeURIComponent(JSON.stringify(v4payload))>`.
2. Load via the hash path.
3. Assert the resulting workspace matches the expected schema v1 shape.
4. Assert cell contents, scores, and settings are identical to a direct migration of the same payload.
5. Assert the hash is stripped from the URL after load.

### Test 3: malformed hash falls back to localStorage

1. Seed `gardenOS` with a valid schema v1 workspace.
2. Set URL hash to `#bed=%%%GARBAGE`.
3. Run load pipeline.
4. Assert the app loads from localStorage (not fresh workspace).
5. Assert `console.warn` was called with a hash-related message.

### Test 4: wallSide preserved across cage toggle

1. Set `wallSide: "left"`, `cage.enabled: false`. Save.
2. Toggle cage on. Assert effective wallSide is `"back"` in UI.
3. Assert stored `wallSide` is still `"left"`.
4. Toggle cage off. Assert wallSide UI reverts to `"left"`.

### Test 5: future schema rejection

1. Seed `gardenOS` with `{ schemaVersion: 999, ... }`.
2. Run load pipeline.
3. Assert fresh workspace is created (not a crash).
4. Assert `console.warn` was called about unsupported schema version.
