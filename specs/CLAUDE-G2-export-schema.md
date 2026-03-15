# CLAUDE-G2 — Garden OS: Export Schema Spec (Codex Handoff — Phase 3)

**Status:** Codex handoff ready
**Date:** 2026-03-14
**Blocks:** CODEX-3
**Depends on:** CLAUDE-G1 (workspace object schema)

---

## 1. Export Bundle Schema

```json
{
  "appVersion": "4.3.0",
  "exportVersion": 1,
  "exportedAt": "ISO-8601",
  "workspace": { },
  "generatedSummaries": {
    "beds": [
      {
        "bedId": "bed_<id>",
        "bedName": "Main Bed",
        "cropCounts": { "tomato": 4, "basil": 6 },
        "scoreTotal": 82,
        "scoreBreakdown": { "diversity": 18, "companion": 22, "spacing": 20, "sunMatch": 12, "structure": 10 }
      }
    ]
  },
  "notes": "",
  "guideProgress": []
}
```

**Rules:**
- `workspace` is a full snapshot of the workspace object per G1 schema
- `generatedSummaries` is optional derived data — generated at export time, not persisted in workspace
- `guideProgress` is included from workspace if present (Phase 4+); empty array if not yet implemented
- `exportVersion` is separate from workspace schema version — tracks the export format itself

---

## 2. Import Validation Rules

All imported JSON is **untrusted**. Validate before any rendering or state mutation.

### Field validation
| Field type | Rule |
|-----------|------|
| Enums (season, goal, orientation, wallSide, tool, style, side) | Must match allowed values; reject unknown |
| Numeric: cols, rows | Integer, 1–20 |
| Numeric: heightIn, lowerBandHeightIn | Integer, 0–120 |
| Strings (name, notes) | No raw HTML; max 500 chars; strip leading/trailing whitespace |
| Arrays (cells, climbZones, protectedZones) | Must be arrays; validate each element type |
| IDs | Regenerate ALL IDs on import — never trust imported IDs |

### Import flow
1. Parse JSON — if parse fails, show error, do not proceed
2. Check `exportVersion` — if missing or unsupported, show error with version info
3. Validate all fields per rules above — collect all errors, show as list
4. If valid: regenerate all IDs (workspace, beds, cells references), import into app state
5. If invalid: show error list, offer "Try again" — do NOT overwrite current workspace

### Large payload handling
- If raw JSON > 500KB, validate asynchronously using `setTimeout` chunking
- Show progress indicator during validation
- Do not freeze the UI thread

---

## 3. Output Format Specs

### JSON Export
- Full bundle schema above, pretty-printed (`JSON.stringify(bundle, null, 2)`)
- Filename: `gardenOS-export-YYYY-MM-DD.json`
- Trigger: `<a>` element with `download` attribute + `URL.createObjectURL`
- Cleanup: `URL.revokeObjectURL` after click

### CSV Summary
- One row per bed
- Columns: `bedName, cols, rows, totalCells, plantedCells, scoreTotal, topCrop`
- `topCrop` = crop with highest cell count in that bed (tie: alphabetical first)
- Filename: `gardenOS-summary-YYYY-MM-DD.csv`
- UTF-8 BOM prefix for Excel compatibility

### Print View
- `triggerPrintView()` applies `print-mode` class to `<body>`
- Print CSS:
  - Hides: nav bar, toolbar, settings panel, score details, inspect panel
  - Shows: bed layout grid (sized to fit page), crop counts table, score summary, build notes
  - Forces: white background, black text, no shadows/gradients
- Uses `window.print()` after class application
- Removes `print-mode` class on `afterprint` event

---

## 4. Sharing — v1 Scope

**v1: JSON import/export only.**

- No URL-encoded state
- No clipboard share
- No cloud sync

**Open question resolved:** URL-encoded state (lightweight shareable links) is deferred to v2. The only remaining open question from the original prompt pack is the crop catalog scope (resolved in G1: global in v1).

---

## 5. Security Rules

| Rule | Implementation |
|------|---------------|
| No raw HTML injection | Use `textContent` or `createElement` only — never `innerHTML` with imported values |
| Enum validation | Check against allowlist before use; fall back to default on invalid |
| ID regeneration | Generate new nanoid for every workspace, bed, and guide progress entry on import |
| Pre-render validation | Validate complete bundle before any state mutation or DOM update |
| Large payload safety | Async validation with `setTimeout` chunking for payloads > 500KB |

---

## 6. Function Boundary Definitions

```
exportWorkspace(workspace: Workspace) → ExportBundle
  Computes generatedSummaries from current workspace state
  Returns full bundle object
  Triggers browser download as JSON file

validateImport(raw: string) → { valid: boolean, errors: string[] }
  Parses JSON
  Validates all fields per Section 2 rules
  Returns collected errors (not fail-fast — collect all)
  Pure function — no side effects

importWorkspace(bundle: ExportBundle) → Workspace
  Calls validateImport first — aborts if invalid
  Regenerates all IDs
  Returns new Workspace object ready to save
  Does NOT save — caller is responsible

generateCSVSummary(workspace: Workspace) → string
  Returns CSV string with UTF-8 BOM prefix
  One header row + one row per bed
  Triggers browser download as CSV file

triggerPrintView() → void
  Adds print-mode class to body
  Calls window.print()
  Removes class on afterprint
```

---

## 7. Output Contract

**Changed files:** `garden-planner-v4.html` (single file)

**Hard constraint:** No framework or build-tool migration. Remain single-file Vanilla JS/HTML/CSS.

**Verification steps:**
1. Export JSON — file downloads, valid JSON, all beds present
2. Re-import exported JSON — all beds, cells, settings, scores match original
3. Import with tampered enum value — validation catches it, shows error, does not corrupt state
4. Import with injected HTML in name field — rendered safely via textContent
5. Import with all IDs set to "ATTACK" — all IDs regenerated, no collision
6. Export CSV — opens in Excel/Sheets with correct columns and UTF-8 characters
7. Print view — hides chrome, shows grid + scores, reverts on cancel
8. Import 2MB file — UI does not freeze during validation
9. No regressions: undo/redo, inspect panel, score updates, bed switching all still work

**Known risks:**
- Very large workspaces (8 beds × 20×20) could produce JSON files that are slow to validate
- CSV topCrop tie-breaking is alphabetical — may not match user expectations
- Print layout depends on browser print CSS support — test Chrome, Firefox, Safari
