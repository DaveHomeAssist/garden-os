# Codex Prompt — Phase 1C: Export/Import as JSON File

## Task

Add workspace export (download) and import (upload) buttons to `garden-planner-v4.html`, allowing users to save and restore their workspace as a `.gos.json` file.

## Context

The planner currently persists to localStorage only (`LS_KEY = 'gardenOS_workspace_v1'`), with URL hash sharing for single beds. There is no durable file-based save. localStorage is fragile — browser clears, device-bound, no backup.

## Current Persistence Architecture

- `saveWorkspace(workspace)` — serializes to localStorage (line ~1574)
- `loadWorkspace()` — reads from localStorage with fallback chain (line ~1545)
- `validateWorkspace(ws)` — validates and normalizes workspace object (line ~1442)
- `migrateV0toV1(legacyState)` — handles legacy format migration (line ~1472)
- `WORKSPACE_VERSION = 1` — current schema version
- `MAX_SHARE_PAYLOAD = 50000` — size limit for URL sharing

### Workspace Shape (from validateWorkspace + normalizeBedRecord):

```json
{
  "id": "workspace-xxxxx",
  "version": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "activeBedId": "bed-xxxxx",
  "workspaceSettings": {
    "catFilter": "all",
    "rightTab": "score"
  },
  "beds": [
    {
      "id": "bed-xxxxx",
      "name": "Main Bed",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "size": { "cols": 8, "rows": 4 },
      "cage": {
        "enabled": false,
        "trellis": { "enabled": true, "side": "back", "heightIn": 54, "climbZones": ["row-1"] },
        "protection": { "enabled": true, "wireSides": true, "lowerBandHeightIn": 24, "protectedZones": ["row-2", "row-3"] },
        "doors": { "enabled": true, "side": "front", "style": "double" }
      },
      "plannerState": {
        "cells": ["leaf_lettuce", null, "bush_beans", ...],
        "selectedCrop": "leaf_lettuce",
        "activeTool": "paint",
        "site": {
          "sunHours": 6,
          "orientation": "ew",
          "wallSide": "back",
          "trellis": true,
          "season": "summer",
          "goal": "balanced",
          "zone": ""
        }
      },
      "scoreSummaryCache": { "scoreTotal": 72, "filledCells": 20, "totalCells": 32, "updatedAt": "ISO-8601" },
      "notes": ""
    }
  ],
  "guideProgress": []
}
```

## Requirements

### 1. Export Button
- Add an "Export" button in the header area (near the existing bed switcher controls)
- On click:
  - Call `saveState()` to ensure current UI state is captured
  - Read the current `_workspace` object
  - Strip `scoreSummaryCache` from each bed (it's regenerated on load)
  - Add an `exportedAt` timestamp and `appVersion: APP_VERSION` to the root
  - Download as `garden-os-{workspace-name}-{YYYY-MM-DD}.gos.json`
  - Use `Blob` + `URL.createObjectURL` + temporary anchor click pattern
- Button style: match existing header buttons (small, `DM Mono` font, soil/cream color scheme)

### 2. Import Button
- Add an "Import" button next to Export
- On click:
  - Open a hidden `<input type="file" accept=".gos.json,.json">` file picker
  - Read the file as text, parse as JSON
  - Run through `validateWorkspace()` — this already handles normalization and validation
  - If validation fails, show an error message (use existing recovery banner pattern or a simple alert)
  - If validation succeeds:
    - Confirm with the user: "This will replace your current workspace. Continue?" (use `confirm()`)
    - Set `_workspace` to the validated result
    - Call `applyWorkspaceToUI(_workspace)` + `renderWorkspaceSwitcher()` + `saveWorkspace(_workspace)` + `render()`
  - Handle edge cases: empty file, non-JSON, oversized file (>500KB warning), wrong version

### 3. Security
- Sanitize all string fields through the existing `escapeHtml()` when rendering
- Validate crop keys against the `CROPS` object (already handled by `normalizeCellArray`)
- Don't eval or execute anything from the file — pure data only
- Respect existing `MAX_SHARE_PAYLOAD` limit or use a larger one (500KB) for file imports

## Implementation Constraints

- All changes in `garden-planner-v4.html` only — single file
- No new dependencies, no external libraries
- Use existing CSS variables and font stack
- Buttons must be accessible: keyboard focusable, focus-visible ring, aria-labels
- Must not interfere with existing localStorage persistence or URL hash sharing
- Export should work offline (no network calls)

## Button Placement

The header (line ~29–38 in the HTML) has a `.hd-left` div with the title. Add Export/Import buttons to the header's right side, matching the existing compact header style. If there's already a right-side area with controls, add them there.

Look at the existing bed switcher area and the header layout to find the right insertion point. The buttons should feel like utility actions, not primary actions.

## After completing changes

- Commit with message: `feat: add workspace export/import as .gos.json file`
- Do NOT push — leave for manual review

## Dependency

This task depends on Phase 1A (canonical schema) being complete. However, the implementation uses the existing `validateWorkspace()` function which already enforces the schema programmatically. The formal `gos-schema.json` document is a reference artifact — this code doesn't need to read it at runtime.

You can proceed independently.
