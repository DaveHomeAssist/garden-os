# Garden OS — Implementation Plan (v4.1 → v5.0)

**Date:** 2026-03-12
**Baseline:** v4.1 (1,495 lines, single-file, vanilla JS)
**Target:** v5.0 — 10 features across 3 phases

---

## Architecture Decision

**Stay single-file.** The app is ~86 KB. All 10 features fit comfortably in one HTML file (~2,200–2,500 lines projected). No build step, no dependencies, instant deployment via GitHub Pages. Split to multi-file only if we exceed ~3,500 lines.

---

## Phase 1 — Core UX (High Impact)

### 1.1 Print / Export Layout
**Why:** Users plan indoors then garden outdoors. No phone-friendly export exists.
**Scope:** ~60 lines

| Step | Detail |
|------|--------|
| CSS | Add `@media print` block: hide header, left panel, right panel, toolbar. Show bed grid at full width. Below grid, render a crop legend table (emoji + name + count + variety) and planting notes. |
| JS | `printLayout()` function: inject a temporary `<div class="print-only">` with legend + notes markup, call `window.print()`, remove the div on `afterprint` event. |
| Button | Add a 🖨 button to the toolbar row next to Share. Wire via `addEventListener`. |
| Edge cases | Ensure grid cell colors print correctly (`-webkit-print-color-adjust: exact`). Test beds from 2×2 to 10×10 fit on one page (scale grid font-size down for >6 columns). |

**Files touched:** `garden-planner-v4.html` (CSS + JS + 1 HTML element)
**Dependencies:** None
**Risk:** Low

---

### 1.2 Multi-Bed Support
**Why:** Real gardens have 2–4 beds with different conditions.
**Scope:** ~180 lines

| Step | Detail |
|------|--------|
| Data model | New `gardens` array: `[{name, bedW, bedH, bed, settings}]`. Current globals (`bed`, `bedW`, `bedH`) become getters into `gardens[activeIdx]`. Max 4 beds. |
| UI | Horizontal tab bar above the bed grid: `[Bed 1] [Bed 2] [+]`. Each tab shows bed name (editable on double-click). `[+]` adds a new bed (copies current site settings as defaults). `[×]` deletes (confirm if planted). |
| State | `saveState` serializes full `gardens` array + `activeIdx`. `loadState` restores. URL share encodes all beds. |
| Scoring | `scoreBed` already works per-bed. Add `scoreGarden()` that averages across beds + bonuses for cross-bed diversity. Show garden-level score in header. |
| Undo | Per-bed undo stacks: `gardens[i].undoStack`. Switch bed = switch stack. |
| Migration | On load, if old single-bed state detected (no `gardens` key), wrap it: `gardens = [{...currentState}]`. |

**Files touched:** `garden-planner-v4.html` (data model, state, UI, scoring)
**Dependencies:** None — but must be done before 1.3 (calendar needs multi-bed awareness)
**Risk:** Medium — largest refactor. Globals → per-bed state requires careful scoping.

**Implementation order:**
1. Extract globals into a `gardens` array + `activeIdx`
2. Update `saveState`/`loadState`/`applyLoadedState` for new shape
3. Add migration path for old localStorage format
4. Build tab bar UI with add/rename/delete
5. Wire tab switching to update all panels
6. Update `shareLayout` for multi-bed payload
7. Add garden-level score

---

### 1.3 Monthly Planting Calendar
**Why:** Zone + season data already exists. Users need "when to plant" guidance.
**Scope:** ~120 lines

| Step | Detail |
|------|--------|
| Data | Add to each crop in `CROPS`: `plantWeeks: {indoor: [weekStart, weekEnd], transplant: [w1, w2], direct: [w1, w2]}` keyed by zone. Use USDA zones 5–10. Week numbers relative to last frost date. |
| Frost dates | Lookup table: `FROST_DATES = {'5': {last: '05-15', first: '10-01'}, '6': {last: '04-25', ...}, ...}`. ~7 entries. |
| UI | New right-panel tab: **Calendar** (4th tab). Shows a 12-month horizontal timeline (Jan–Dec) with one row per planted crop. Each row has colored bars: blue = start indoors, green = transplant/direct sow, orange = harvest window. |
| Interaction | Hover bar → tooltip with exact date range. Click crop row → select that crop in the palette. If no zone selected, show "Set your USDA zone to see planting dates." |
| Render | `renderCalendar(inputs)` builds the timeline. Called from `renderRight`. Only re-renders when zone or crop set changes. |

**Files touched:** `garden-planner-v4.html` (CROPS data, new tab, render function)
**Dependencies:** USDA zone must be set (already in UI). Multi-bed: show calendar for active bed.
**Risk:** Low-Medium — data entry is the bulk of work (43 crops × zone lookup). Can start with 10 most common crops and add rest incrementally.

---

## Phase 2 — Interaction & Intelligence

### 2.1 Drag to Paint
**Why:** Clicking 80 cells one-by-one is tedious on large beds.
**Scope:** ~35 lines

| Step | Detail |
|------|--------|
| Events | Add `mousedown`, `mousemove`, `mouseup` listeners on `#bedGrid`. Track `isDragging` flag. On `mousedown`, set flag + paint cell + `pushUndo()`. On `mousemove` while dragging, paint hovered cell (no additional undo push). On `mouseup`, clear flag. |
| Touch | Add `touchstart`, `touchmove`, `touchend` with `e.preventDefault()` to prevent scroll. Use `document.elementFromPoint(touch.clientX, touch.clientY)` to find cell. |
| Cell ID | Each grid cell already has a click listener. Add `data-cell-id` attribute to each cell div in `renderBed` for hit detection during drag. |
| Erase | Same logic applies when `ui.tool === 'erase'` — drag erases. |
| Guard | Ignore drag if pointer leaves the grid (`mouseleave` clears flag). |

**Files touched:** `garden-planner-v4.html` (renderBed + event listeners)
**Dependencies:** None
**Risk:** Low — touch event handling on mobile needs testing.

---

### 2.2 Crop Rotation Memory
**Why:** Planting nightshades where nightshades grew last year invites disease.
**Scope:** ~80 lines

| Step | Detail |
|------|--------|
| Data | Add `family` field to each crop: `'nightshade'`, `'brassica'`, `'cucurbit'`, `'legume'`, `'allium'`, `'umbellifers'`, `'chenopodia'`, `'misc'`. ~8 families. |
| History | New localStorage key: `gardenOS_v4_history`. Stores `{season, year, beds: [{bedW, bedH, grid: [cropKey|null]}]}`. On "Save to history" button click, snapshot current layout with season + year tag. Keep last 4 seasons. |
| Warnings | In `cellIssues()`, check if the current crop's family matches the family of any crop in the same cell position from the previous season's history. If match → new warning: "⟲ Tomato was here last season (nightshade family). Rotate to avoid soil-borne disease." |
| UI | Add "History" button in toolbar. Dropdown shows past seasons with "Load" and "Delete" options. "Compare" mode overlays previous season's crops as faded icons behind current grid. |

**Files touched:** `garden-planner-v4.html` (CROPS data, cellIssues, new UI, localStorage)
**Dependencies:** Multi-bed support (history is per-bed)
**Risk:** Low — localStorage is the only persistence needed.

---

### 2.3 Yield Estimates
**Why:** "How much will I harvest?" is the #1 user question after planning.
**Scope:** ~50 lines

| Step | Detail |
|------|--------|
| Data | Add to each crop: `yieldPerSqFt: {min, max, unit}`. E.g., tomato: `{min: 3, max: 5, unit: 'lbs'}`, lettuce: `{min: 0.5, max: 1, unit: 'lbs'}`, radish: `{min: 15, max: 25, unit: 'roots'}`. |
| Calculation | `estimateYield(inputs)`: for each occupied cell, `yieldPerSqFt.min * scoreFactor` to `yieldPerSqFt.max * scoreFactor` where `scoreFactor = scoreCell / 10` (poor placement reduces yield). Group by crop, sum ranges. |
| UI | New section at bottom of Score pane: "Estimated Harvest" table. Each row: crop emoji + name + "~3–5 lbs" or "~20 roots". Total weight in lbs at bottom (exclude count-based crops or convert with avg weight). |
| Print | Include yield table in print layout. |

**Files touched:** `garden-planner-v4.html` (CROPS data, scoring, renderRight)
**Dependencies:** None
**Risk:** Low — accuracy of yield data is the main concern. Use conservative USDA Extension averages.

---

### 2.4 Custom Crops
**Why:** Users grow varieties not in the 43-crop database.
**Scope:** ~90 lines

| Step | Detail |
|------|--------|
| UI | "Add Custom Crop" button at bottom of palette. Opens a modal form: name, emoji (picker or text input), category (dropdown of existing categories), sun min/ideal, water need, height, cool season (checkbox), companions (multi-select from existing categories), conflicts (multi-select). |
| Validation | Name must be unique, 2–30 chars. Sun min ≤ sun ideal. At least one companion or conflict recommended but not required. |
| Storage | Custom crops stored in `CROPS` object with key `custom_[slugified_name]`. Persisted to localStorage under `gardenOS_v4_customCrops`. On load, merged into `CROPS` before first render. |
| Defaults | Auto-generate: `short` (first 8 chars), `color` (hash of name → HSL), `varieties: []`, `spacingPerSqFt: 1`, `successionFriendly: false`. User can override these in an "Advanced" collapse. |
| Delete | Right-click or long-press on custom crop in palette → "Delete custom crop" (confirm if any cells use it). |
| Scoring | Custom crops flow through the existing scoring engine with no changes — `scoreCropInCell`, `adjScore`, `companions`, etc. all work on CROPS entries generically. |

**Files touched:** `garden-planner-v4.html` (modal, CROPS merge, localStorage, palette)
**Dependencies:** None
**Risk:** Low-Medium — modal UI is the most work. Emoji input can be a simple text field.

---

## Phase 3 — Polish

### 3.1 Undo Toast
**Why:** Ctrl+Z has no visual feedback. Users don't know if it worked.
**Scope:** ~20 lines

| Step | Detail |
|------|--------|
| CSS | `.undo-toast` — fixed bottom-center, 28px height, rounded, translucent dark background, white text, `opacity` transition. |
| JS | `showToast(msg)`: create element, append to body, fade in, `setTimeout(800)` fade out, remove. Call from `undo()` → "Undone" and `redo()` → "Redone". |
| Edge | Don't stack toasts — remove any existing toast before showing new one. |

**Files touched:** `garden-planner-v4.html` (CSS + JS)
**Dependencies:** None
**Risk:** None

---

### 3.2 Dark Mode
**Why:** Evening garden planning. Reduces eye strain.
**Scope:** ~40 lines CSS, ~10 lines JS

| Step | Detail |
|------|--------|
| CSS | Duplicate `:root` variables under `@media (prefers-color-scheme: dark)` and a `.dark` class. Swap: `--cream → #1a1a1a`, `--text → #e8e0d4`, `--soil → #2a1f15`, `--panel → #242420`, etc. All existing code uses CSS variables, so no individual element changes needed. |
| Toggle | Moon/sun icon button in header. Clicking adds/removes `.dark` class on `<html>`. Persist choice to localStorage key `gardenOS_theme`. |
| Crop colors | Crop `color` fields are used for cell backgrounds with alpha (`+ '28'`). These already work on both light and dark backgrounds — verify and adjust alpha if needed. |

**Files touched:** `garden-planner-v4.html` (CSS variables + toggle button + 3 lines JS)
**Dependencies:** None
**Risk:** Low — CSS variable architecture makes this clean.

---

### 3.3 PWA / Offline Support
**Why:** No internet needed in the garden. Installable on phone home screen.
**Scope:** ~50 lines (manifest + service worker + registration)

| Step | Detail |
|------|--------|
| Manifest | New file `manifest.json`: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color`, `theme_color`, icons (generate 192px + 512px from emoji 🌱 or a simple SVG). |
| Service worker | New file `sw.js`: `install` event caches `index.html` + `manifest.json` + Google Fonts CSS. `fetch` event serves cache-first, network-fallback. No API calls to intercept. |
| Registration | In `<script>`: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`. |
| CSP update | Add `worker-src 'self'` to the Content Security Policy meta tag. |
| Fonts | Consider self-hosting the 3 Google Font families (~150 KB) to make offline truly offline. Bundle as base64 in CSS or as separate cached files. |

**Files touched:** `garden-planner-v4.html` (manifest link, SW registration, CSP), new `manifest.json`, new `sw.js`
**Dependencies:** None — but do this last since it caches aggressively and complicates dev iteration.
**Risk:** Low — but cache invalidation needs a version string in SW to bust on updates.

---

## Execution Order

```
Phase 1 (core):
  1.1 Print/Export ──────────── ~60 lines   (standalone)
  1.2 Multi-Bed ─────────────── ~180 lines  (standalone, do before 1.3)
  1.3 Planting Calendar ─────── ~120 lines  (needs zone + multi-bed)

Phase 2 (interaction):
  2.1 Drag to Paint ─────────── ~35 lines   (standalone)
  2.2 Crop Rotation ─────────── ~80 lines   (needs multi-bed + history)
  2.3 Yield Estimates ───────── ~50 lines   (standalone)
  2.4 Custom Crops ──────────── ~90 lines   (standalone)

Phase 3 (polish):
  3.1 Undo Toast ────────────── ~20 lines   (standalone)
  3.2 Dark Mode ─────────────── ~50 lines   (standalone)
  3.3 PWA/Offline ───────────── ~50 lines   (standalone, do last)
```

**Parallelizable:** 1.1, 2.1, 2.3, 2.4, 3.1, 3.2 have zero dependencies on each other and can be built in any order.

**Critical path:** 1.2 (Multi-Bed) → 1.3 (Calendar) → 2.2 (Rotation)

---

## Projected Final Size

| Metric | v4.1 | v5.0 (projected) |
|--------|------|-------------------|
| Lines | 1,495 | ~2,300 |
| File size | 86 KB | ~130 KB |
| Functions | 50 | ~75 |
| Crops | 43 | 43 + custom |
| Files | 1 | 3 (+ manifest.json, sw.js) |

---

## What's NOT in scope

- **Backend / user accounts** — no server, no auth, localStorage only
- **Database** — crop data stays hardcoded in JS
- **Mobile app** — PWA covers this
- **AI recommendations** — scoring engine is deterministic, no LLM calls
- **Social features** — share via URL is sufficient
- **Seed ordering integration** — out of scope, could be v6

---

*Garden OS Implementation Plan · v4.1 → v5.0 · 10 features · 3 phases · ~800 new lines*
