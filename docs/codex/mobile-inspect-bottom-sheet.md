# Codex spec: Mobile Inspect → Cell Details bottom sheet (Garden OS Beds)

**Status:** Ready for Codex execution
**Author:** Claude (orchestrator handoff)
**Date authored:** 2026-04-27
**Repo path on Mac:** `/Users/daverobertson/Desktop/Code/10-projects/active/garden-os-fresh`
**Repo path on Windows (Duncan):** `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os\`
**Predecessor spec:** `docs/codex/mom-first-garden-data.md` (Mom data load is already partially wired — `resetMomGardenAndReload` is called from `garden-painting.html:1999`).

---

## Goal

Inspect on mobile is broken because it lives as a third radio tool alongside Paint and Erase. Users have to switch modes to read a cell, mode-switching is fragile on touch, and tapping an occupied cell in Paint mode silently overwrites it.

Replace the mode-based Inspect with a contextual bottom sheet (Cell Details) that opens on cell tap. Keep desktop Inspect mode if useful but unify naming as "Details."

---

## Scope

### Files to touch

| File | Action | Why |
|---|---|---|
| `garden-painting.html` | MODIFY | Primary surface: tool buttons, `paintCell` tap handler, `InspectBox`, mobile breakpoint behavior |
| `garden-os-theme.css` | MODIFY | Add bottom-sheet, backdrop, focus-trap-utility, safe-area-inset rules. Reuse existing tokens. |
| `garden-planner-v5.html` | MODIFY only if confirmed shared | Has its own CropSheet (line 869) which already IS a bottom sheet. Reuse the same visual pattern; do NOT import code across files. Apply only naming consistency: any "Inspect" labels become "Details." |
| `garden-doctor-v5.html` | MODIFY | "Ask Doctor" action from the bottom sheet links here with `?bed={id}&cell={r}c{c}&crop={cropId}&variety={name}` URL params (already specified in the Mom-first spec). Confirm Doctor reads these params. |
| `gos-bed.js` | NO CHANGE expected | If a new helper is needed (e.g., `getCellSnapshot(bedId, r, c)`), add it here. Otherwise leave alone. |

### Files to NOT touch

- `garden-planner-v4.html` — production v4 surface, untouched.
- `specs/*` — scoring stays canonical. The Details sheet reads scoring output, doesn't compute new factors.
- `gos-schema.json` — no schema change needed for this spec.
- `story-mode/` — out of scope.

---

## Current state (from reading garden-painting.html, 2008 lines)

Key code locations Codex needs:

- [garden-painting.html:1773](../../garden-painting.html#L1773) — `paintCell(r, c)` is the unified cell-tap handler. Lines 1783-1789 handle erase/paint branches. **The bug:** in paint mode, `if (idx >= 0) list[idx] = { r, c, crop: brush }` silently overwrites without confirmation.
- [garden-painting.html:1836-1838](../../garden-painting.html#L1836) — `ToolBtn` for Paint / Erase / Inspect. Inspect is the third radio.
- [garden-painting.html:1868-1871](../../garden-painting.html#L1868) — `InspectBox` rendered as an inline panel below the bed grid.
- [garden-painting.html:1923-1989](../../garden-painting.html#L1923) — `InspectBox` component. When `tool === 'inspect'` AND `selected` is set, shows cell info or top-3 recs for empty cells.
- [garden-painting.html:1875-1910](../../garden-painting.html#L1875) — Crop palette is hidden when `tool === 'inspect'`. New design: palette is hidden only when Paint is NOT the active tool (as today, but Inspect is gone).
- `recsForCell(bed, r, c)` — existing helper that returns top fits for an empty cell. Reuse in Details sheet.
- `garden-planner-v5.html` already has a working bottom-sheet pattern in `CropSheet` (around line 869) — Codex should mirror that visual structure (rounded top corners, drag handle, `position: absolute, bottom: 0`, backdrop with rgba(44,27,11,0.55)). Do NOT import code; replicate the pattern locally in `garden-painting.html` to keep the file self-contained.

---

## Required behavior

### 1. Mobile breakpoint

- Use `@media (max-width: 700px)` (existing CSS in this file uses 480px and 900px; 700px is between and matches the user's spec). Add the breakpoint constant in `garden-os-theme.css` as `--bp-mobile: 700px` if a token approach is preferred; otherwise inline media queries are fine.
- On mobile, tapping a cell opens the bottom sheet directly. There is no "Inspect mode" the user has to enter first.
- On desktop, the existing Inspect-as-tool flow may stay (preserve keyboard rhythm, hover-inspect feel). But the user-visible label is "Details," not "Inspect." Internal `tool === 'inspect'` value can stay to minimize churn.

### 2. Rename Inspect → Details (user-facing copy)

- Tool button label: `"Inspect"` → `"Details"`.
- All visible copy in `InspectBox`, tweaks, and tooltips: `"Inspect"` → `"Details"`, `"inspect"` → `"details"`, `"READ ONLY · NO CHANGES"` → `"DETAILS · READ ONLY"`.
- Keep `tool === 'inspect'` as the internal state value (no rename in JS) to avoid touching every reference.
- Icon: `Icons.inspect` stays; rename in code optional, but the rendered button label is "Details."

### 3. Cell tap behavior on mobile (max-width: 700px)

| State | Cell type | Behavior |
|---|---|---|
| Paint active | Empty | Place selected crop (current behavior, preserved). |
| Paint active | Occupied | Open Cell Action Sheet for that cell. Do NOT overwrite. |
| Erase active | Empty | No-op, ignore tap. |
| Erase active | Occupied | Erase + show undo toast (5s). If toast infra not present, build it (see #6 below). |
| Details active | Any | Open Cell Details Sheet. Empty cells show top-3 recs (reuse `recsForCell`); occupied cells show full details. |

**Implementation hint:** keep `paintCell` as the dispatcher. Add a viewport-width check (`window.matchMedia('(max-width: 700px)').matches`) at the top. On mobile + paint + occupied → open sheet instead of overwriting. On mobile + details → always open sheet.

### 4. Cell Action Sheet (bottom sheet for occupied cells, mobile)

Triggered when: mobile + occupied cell tapped + (Paint active OR Details active OR Erase active with destructive-confirm path).

**Visual:**
- `position: absolute; bottom: 0; left: 0; right: 0;` inside the phone frame container.
- Border-radius `20px 20px 0 0`, background `T.cream`, padding `12px 20px 24px`.
- Drag handle bar at top (`width: 40, height: 4`, `aria-hidden="true"`).
- Backdrop: `position: absolute; inset: 0; background: rgba(44,27,11,0.55); z-index: 40;`. Sheet z-index 41.
- `padding-bottom: max(24px, env(safe-area-inset-bottom))`.
- `max-height: 82%; overflow-y: auto`.

**Content:**
- Header row: CropChip (size 36) + display name (Disp, size 18) + variety chip (`{cropDisplay} · {varietyName}`) + status pill (Mom taxonomy color).
- Metadata row: bed name · location label (`Row 3` / `Bag 4`) · row/col coords (`R3 · C4`).
- Score row: `SCORE · 7.4/10` from `scoreCell` (or wherever the existing score lives) — neutral if not available.
- One-sentence placement explanation if `recsForCell` or equivalent provides one (e.g., "Good fit · trellis row matches climber requirement"). If no explanation available, omit the line — do not fabricate.

**Actions (button row, wraps to multi-line on narrow):**
| Action | Implementation | Disabled-when |
|---|---|---|
| Details | Replace sheet content with the Details Sheet (#5 below). Same modal stays open. | Never disabled. |
| Replace | Set tool to paint, set brush, then close sheet. User taps next to confirm — or open a crop picker mini-sheet inline. Choose the inline picker for tap-economy. | Disabled if there is no current `brush` selected. |
| Move | Reserve UI slot but mark `disabled` with title "Coming soon." Do NOT wire functionality this pass. | Always disabled this pass. |
| Log harvest | Append a `harvest` event to gosBed.events for this cell. Reuse the planner's harvest form pattern (see `garden-planner-v5.html:994-1032` for shape). Open inline. | Disabled if cell has no recorded crop. |
| Ask Doctor | Navigate to `garden-doctor-v5.html?bed={bedId}&cell=r{r}c{c}&crop={cropId}&variety={varietyName}`. Doctor must accept these params (see Doctor change below). | Disabled if `garden-doctor-v5.html` is not present. |
| Erase | Calls existing erase logic + toast with undo. | Never disabled in occupied-cell context. |

**Critical rule:** "Keep unavailable actions disabled or hidden if not wired yet. Do not create fake buttons." So Move stays visibly disabled with the caption "Coming soon." Don't ship a button that does nothing silently.

### 5. Cell Details Sheet (the deeper view)

Replaces the action sheet content when "Details" tapped, OR opens directly when in Details mode + cell tapped.

**Content (read-only):**
- Same header row as the Action Sheet.
- Section: "Why this placement"
  - Light fit: number + label (`SUN FIT · 4.2/5 · matches partial-shade tolerance`)
  - Support fit
  - Access fit
  - Protection fit (if applicable for the bed/crop)
  - Season fit
- Section: "Companions / conflicts" if `CROPS[cropId].companions` or `.conflicts` includes neighbors of this cell. Render each as a small chip with the neighbor's CropChip + name + relationship label.
- Section: "Related Journal entries" — query the journal/event log for this bed+cell. Show last 3 entries (timestamp + label). If none, render `"No journal entries yet."`. Do NOT omit the section silently.
- Footer: Close button (44px tap target).

**Reads from:** scoring output (do NOT recompute factors here; pull existing factor values from `scoreCell` or the planner's score breakdown helper). Companion data: `CROPS[cropId].companions` and `.conflicts` per CROP_SCORING_DATA.json. Journal: gosBed events for this bed/cell/crop combo.

### 6. Toast + undo infrastructure (if missing)

If no toast component exists, add one:
- `position: fixed; bottom: max(16px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); z-index: 70;`
- Background `T.soil`, color `T.cream`, padding `10px 14px`, border-radius `999px`.
- 5-second auto-dismiss, dismissable by tap.
- "Cleared {cropName} from R{r}·C{c}. [Undo]"
- Undo button calls the existing `undo()` action (line 1840 already wires it as a tool button).

### 7. Accessibility (hard requirements)

- Sheet root: `role="dialog" aria-modal="true" aria-label="{cropName} cell details"`.
- Focus trap: on open, focus the first interactive element (Details button or Close button if Action Sheet skipped). Tab/Shift+Tab cycles within the sheet only. On close, restore focus to the cell that triggered.
- Escape key closes the sheet.
- Backdrop tap closes the sheet (existing pattern matches `CropSheet` in `garden-planner-v5.html:928-930`).
- All buttons: `type="button"`. Sweep the modified file for any `<button` lacking `type` and add it.
- Decorative SVGs and the drag handle bar: `aria-hidden="true"`.
- Aria-live: when the sheet opens with cell info, announce via `<div role="status" aria-live="polite" className="sr-only">{summary}</div>` mounted inside the sheet root.

### 8. Mobile layout polish

- Sheet padding: `padding-bottom: max(24px, env(safe-area-inset-bottom))`.
- Sheet content scrolls (`overflow-y: auto`) if taller than `82%` of viewport.
- Primary action buttons minimum 44×44 px (matches `garden-planner-v5.html:1006` harvest input convention).
- No text smaller than 11px (current InspectBox uses 9px Labels — bump to 10-11 for visibility on mobile per the prior audit item #39).
- Save/destructive actions inside the sheet must use `position: sticky; bottom: 0` if the form has inputs that trigger virtual keyboard (matches the harvest form pattern). For Action/Details sheets without inputs, sticky not required.

### 9. Desktop behavior

- Desktop (`min-width: 701px`): keep the existing inline Inspect-as-tool flow if it works.
- The tool button label is still "Details" (consistent naming).
- Tapping a cell on desktop in Details mode renders the existing inline `InspectBox` (no bottom sheet).
- Tapping a cell on desktop in Paint mode on an occupied cell: same overwrite-without-confirm behavior is preserved — desktop users are accustomed to it. Optional: also show the action sheet on desktop. **Decision: do NOT add desktop sheet this pass; mobile-only.**
- Desktop keyboard flows untouched. Tab still works through tool buttons → palette → bed grid.

### 10. Data safety

- Mobile + Paint + occupied cell: opening the sheet instead of overwriting fixes the silent-overwrite data bug. **Verify:** undo stack is unchanged (Action Sheet's "Replace" goes through the existing `pushHistory` + setPainted path, so undo still works after replace).
- All sheet content rendering: use React text nodes only, never `innerHTML` or `dangerouslySetInnerHTML`. Mom data (varietyName, notes) is treated as untrusted display text. Confirm with a grep: `grep -n "dangerouslySetInnerHTML\|innerHTML" garden-painting.html` should return zero matches in modified code.

---

## Acceptance criteria

A run is successful when ALL of these hold in DevTools mobile viewport (390 × 844, "iPhone 14"):

1. Tool button row shows: Paint, Erase, **Details** (no longer "Inspect"). Undo on the right.
2. Tap an empty cell with Paint active → crop is placed (current behavior preserved).
3. Tap an occupied cell with Paint active → bottom action sheet opens with the cell's crop, variety, bed, and actions. Cell is NOT overwritten.
4. Tap any cell with Details active → bottom details sheet opens with the cell's full info, including Why-this-placement section.
5. Tap an occupied cell with Erase active → cell is cleared AND a toast appears: "Cleared {crop} from R{r}·C{c}. [Undo]". Undo restores the cell.
6. Bottom sheet has rounded top corners, drag handle, backdrop, opens from the bottom, padding accommodates iPhone home indicator (env safe-area-inset-bottom).
7. Action sheet shows: Details, Replace, Move (disabled "Coming soon"), Log harvest, Ask Doctor, Erase.
8. "Ask Doctor" navigates to garden-doctor-v5.html with the cell's params (verify URL).
9. "Details" within the action sheet swaps the same modal to the Details Sheet view.
10. Details Sheet shows light/support/access/protection/season fit values pulled from scoring (not invented).
11. Companions/conflicts section appears only when relevant; otherwise omitted.
12. Related Journal entries section always present; says "No journal entries yet." when empty.
13. Tap backdrop → sheet closes.
14. Press Escape (desktop dev tools mobile mode supports this) → sheet closes.
15. Open a sheet → focus jumps to first button. Tab cycles within the sheet.
16. Close a sheet → focus returns to the cell that was tapped.
17. All sheet `<button>` elements have `type="button"` (grep `garden-painting.html` for `<button` without `type`, expect zero hits in the modified component).
18. Decorative drag handle and SVG icons in the sheet have `aria-hidden="true"`.
19. No text in the sheet is smaller than 11px.
20. Console shows zero errors. Run on a fresh incognito session.
21. Desktop viewport (1200 × 900): Details mode still works as today (inline InspectBox below the bed). No regression.
22. Mom Garden data (loaded via `resetMomGardenAndReload` from TweaksPanel): peas/scallion/garlic plantings open the sheet correctly with variety chips.

---

## Verification commands

```bash
# 1. Local serve
python3 -m http.server 8000

# 2. Open Chrome DevTools, toggle device mode to iPhone 14 (390x844)
# Walk acceptance criteria 1-22

# 3. Static checks
grep -n "innerHTML\|dangerouslySetInnerHTML" garden-painting.html   # expect 0 matches
grep -nE '<button(?![^>]*type=)' garden-painting.html               # expect 0 matches in modified component
grep -n 'href="#"' garden-painting.html                             # expect 0 matches

# 4. Lighthouse mobile a11y on garden-painting.html
# - No new violations vs baseline
```

---

## Rollback

If anything breaks:

1. `git checkout HEAD -- garden-painting.html garden-os-theme.css garden-doctor-v5.html`.
2. The change is purely UI-layer; no data migration. localStorage state untouched.
3. If a partial sheet renders broken, the existing `selected` state and `paintCell` flow still works on desktop; mobile users get the broken sheet but their bed data stays intact.

---

## Non-goals (do NOT do these in this pass)

- Do NOT implement the Move action. UI slot only, marked disabled.
- Do NOT add long-press / swipe gestures. Tap-only. Swipe-down to dismiss is tempting but adds complexity — backdrop tap and Escape are sufficient.
- Do NOT redesign the Paint/Erase tool buttons themselves. Only Inspect → Details.
- Do NOT change scoring logic. Details sheet reads existing score outputs.
- Do NOT extend gos-schema.json. New events (if any) reuse existing types.
- Do NOT register a service worker. Mom-first spec already addresses sw.js separately.
- Do NOT change desktop Inspect behavior beyond the label rename.
- Do NOT modify garden-planner-v5.html's CropSheet — it's already a working bottom sheet on its own page. Only touch v5 if there's a stray "Inspect" label there that needs renaming to "Details" for consistency.

---

## Path note

This spec was authored on Duncan (Windows). Codex should pull on Mac before starting. If both clones get edits in parallel, expect merge conflicts on `garden-painting.html` (largest surface area).

Coordinate with the in-flight Mom-first spec (`docs/codex/mom-first-garden-data.md`) — both touch `garden-painting.html`. Recommended order: complete Mom-first first, then this spec on top.

---

## Reference: prior context

- Prior audit item #26 (Per-cell harvest mode is desktop-only) is partially addressed by this spec's Action Sheet "Log harvest" item. Per-cell harvest now has a touch-friendly path.
- Prior audit item #27 (Modals don't trap focus or close on Escape) is addressed by this spec's accessibility section.
- Prior audit item #28 (iPhone notch/island can overlap header) is addressed by `env(safe-area-inset-*)` rules.
- Prior audit item #38/#39 (color contrast / 8-10px text below readable) — bumped to 11px minimum in this sheet. Does not fix the rest of the planner; separate sweep.
- The Mom-first spec at `docs/codex/mom-first-garden-data.md` defines `varietyName`, `displayName`, and Mom status taxonomy. This spec assumes those are loaded.

---

## Return to Dave (after Codex run)

Codex should respond with:

1. Files changed (paths + lines added/removed).
2. Before/after interaction summary (mobile + desktop, per-mode, per-cell-state).
3. Mobile verification results: pass/fail per acceptance criteria 1-22.
4. Any actions intentionally hidden or disabled (expected: Move shows "Coming soon"; others wire-through).
