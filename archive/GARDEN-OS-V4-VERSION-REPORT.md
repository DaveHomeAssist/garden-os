# Garden OS v4.1 — Version Report

**File:** `garden-planner-v4.html`
**Date:** 2026-03-11
**Type:** Single-file client-side web app (HTML + CSS + JS, no build step)

---

## Overview

Garden OS v4 is a raised bed garden planner that lets users configure a bed (size, sun, orientation, season), paint crops onto a grid, and receive live scoring with companion planting analysis, variety recommendations, and actionable warnings.

| Metric | Value |
|--------|-------|
| Total lines | 1,495 |
| File size | 86.4 KB |
| HTML | 142 lines |
| CSS | 223 lines |
| JavaScript | 1,119 lines |
| Functions | 50 |
| Crops in database | 43 (8 categories) |
| External dependencies | Google Fonts (3 families) |
| Framework | None — vanilla JS, no build tools |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  HEADER   Garden OS  v4                                  │
├────────────┬────────────────────────┬────────────────────┤
│ LEFT 240px │     CENTER (flex)      │   RIGHT 268px      │
│            │                        │                    │
│ [Site]     │  Toolbar               │ [Score]            │
│  Bed size  │   Auto-fill | Clear    │  Overall /100      │
│  Sun hours │   Paint | Erase       │  Per-crop bars     │
│  Wall side │   Undo | Redo | Share  │  Plant counts      │
│  Orient.   │                        │                    │
│  Trellis   │  ┌──────────────────┐  │ [Inspect]          │
│  Season    │  │   BED GRID       │  │  Cell details      │
│  Goal      │  │   (W × H cells)  │  │  Variety ranking   │
│  Zone      │  │   click to paint │  │  Swap suggestion   │
│            │  └──────────────────┘  │                    │
│ [Crops]    │  Fill bar              │ [Notes]            │
│  Search    │                        │  Warnings          │
│  Category  │                        │  Tips              │
│  43 items  │                        │  Companion notes   │
└────────────┴────────────────────────┴────────────────────┘
```

### Data flow

```
User input ──► State (bed[], ui{}, DOM settings)
                 │
                 ├──► saveState() ──► localStorage
                 ├──► render()
                 │     ├──► buildZoneMap() ──► applyZones()
                 │     ├──► cellIssues() (computed once)
                 │     ├──► renderBed()
                 │     └──► renderRight() ──► warnings(), scoreBed()
                 └──► shareLayout() ──► URL hash ──► clipboard
```

### Persistence

| Store | Key | Contents |
|-------|-----|----------|
| localStorage | `gardenOS_v4` | Bed dimensions, crop grid, UI state, all settings |
| URL hash | `#bed=...` | Encoded JSON payload (shareable, read-only on load) |

---

## Crop Database

43 crops across 8 categories, each with:

- Sun requirements (min/ideal hours)
- Height class, growth habit, trellis needs
- Shade tolerance score, spacing per sq ft
- Season preference, heat tolerance, water need
- Companion/conflict tags for adjacency scoring
- 2–3 ranked varieties with descriptions

| Category | Count | Examples |
|----------|-------|---------|
| Greens | 11 | Lettuce, Spinach, Kale, Arugula, Chard, Bok Choy, Mizuna, Tatsoi, Mustard |
| Roots | 7 | Radish, Carrots, Beets, Scallions, Turnips, Onions, Garlic |
| Herbs | 5 | Basil, Cilantro, Parsley, Dill, Chives |
| Legumes | 3 | Bush Beans, Pole Beans, Peas |
| Cucurbits | 3 | Beit Alpha Cucumber, Slicing Cucumber, Bush Pickle Cucumber |
| Fruiting | 4 | Peppers, Compact Tomato, Eggplant, Zucchini |
| Brassica | 3 | Compact Cabbage, Broccoli, Kohlrabi |
| Companion | 2 | Marigold, Nasturtium |

---

## Scoring Model

### Per-cell score (0–10)

```
cellScore = clamp(0, 10,
    (sunFit×2 + supportFit + shadeFit + accessFit + seasonFit) / 3
  + adjScore
)
```

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| sunFit | ×2 | Effective light vs crop's sunMin/sunIdeal |
| supportFit | ×1 | Vine/trellis match |
| shadeFit | ×1 | Crop's innate shade tolerance |
| accessFit | ×1 | Distance from accessible edges |
| seasonFit | ×1 | Cool-season crop in hot season penalty |
| adjScore | additive (−2 to +2) | Companion bonuses, conflict penalties, water mismatch, height stacking |

### Bed score (0–100)

```
bedScore = avg(cellScores) × 10
         + diversityBonus (0/3/5/7)
         + goalBonus (0–5)
         − tallCropPenalty
         − trellisConflictPenalty
         − coolSeasonInHeatPenalty
         − emptyFillPenalty
```

### Companion weight matrix

| Pair | Weight |
|------|--------|
| legume ↔ greens | 1.0 |
| legume ↔ brassica | 1.0 |
| allium ↔ greens | 0.8 |
| companion ↔ cucurbit | 0.8 |
| companion ↔ fruiting | 0.8 |
| companion ↔ brassica | 1.0 |
| herbs ↔ fruiting | 0.7 |
| greens ↔ roots | 0.5 |

---

## Features

| Feature | Status |
|---------|--------|
| Variable bed sizes (2×2 to 10×10) | Working |
| 6 preset bed sizes | Working |
| Custom W×H input | Working |
| Click-to-paint / click-to-erase tools | Working |
| Auto-fill by goal (6 goals) | Working |
| Undo / Redo (40-deep stack, Ctrl+Z/Y) | Working |
| Live bed score (0–100) | Working |
| Per-crop placement score bars | Working |
| Cell inspect with variety ranking | Working |
| "Better crop here" suggestions | Working |
| Crop substitution recommendations | Working |
| Water mismatch detection | Working |
| Per-cell issue icons on grid | Working |
| Notes tab with warnings/tips/good signals | Working |
| Season-aware scoring (4 seasons) | Working |
| 6 planning goals (balanced, yield, easy, salad, pickling, herbs) | Working |
| USDA zone selection | Working |
| Sun hours slider (2–10 hrs) | Working |
| Wall/shade side selector (5 options) | Working |
| Bed orientation (E-W / N-S) | Working |
| Trellis toggle | Working |
| Zone map with wall penalty + orientation penalty | Working |
| Crop search + category filter | Working |
| Succession planting badges | Working |
| Share layout via URL hash | Working |
| localStorage persistence | Working |
| Fill progress bar | Working |
| Responsive mobile layout | Working |

---

## Bugs Fixed (8)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | `shareLayout` omitted USDA zone from payload | Medium | Added `zone` to share settings object |
| 2 | N-S orientation penalty hit ALL columns in 2-wide beds | Medium | Skip penalty for `bedW ≤ 2`; single center column for odd widths |
| 3 | Division by zero when `sunIdeal === sunMin` | Low | Guard denominator with `\|\| 1` fallback |
| 4 | `ui.selCell` not cleared on bed resize (stale ghost reference) | Low | Set `ui.selCell = null` in `applyBedSize` |
| 5 | Duplicate water-mismatch warnings (A↔B emits two warnings) | Low | Emit only from lower cell ID; normalize pair with `.sort()` |
| 6 | First auto-fill pushed empty bed to undo (Ctrl+Z blanks grid) | Low | `loadRec(skipUndo)` parameter; skip on init |
| 7 | `cellIssues` computed twice per render cycle | Low | Compute once in `render()`, pass to both `renderBed` and `renderRight` |
| 8 | `betterCropForCell` temporarily mutated live bed during render | Low | Score on a shallow-cloned cell `{...cell}` instead |

---

## Security Hardening (10 patches)

| # | Vulnerability | Severity | Patch |
|---|--------------|----------|-------|
| 1 | DOM XSS via `innerHTML` with no escaping | Medium | Added `escapeHtml()` — applied 24 times across all render paths |
| 2 | No Content Security Policy | Medium | Added `<meta http-equiv="Content-Security-Policy">` with locked-down directives |
| 3 | 22 inline `onclick`/`onchange`/`oninput` handlers blocked CSP hardening | Medium | Removed all inline handlers; migrated to 29 `addEventListener` calls + event delegation via `data-*` attributes |
| 4 | No input size validation on URL hash (DoS via giant payload) | Medium | Added `MAX_SHARE_PAYLOAD` (50 KB) guard on URL hash and localStorage |
| 5 | Google Fonts CDN loaded without `crossorigin` | Low | Added `crossorigin="anonymous"` to font `<link>` |
| 6 | `localStorage` settings values unvalidated (type confusion) | Low | Full type-checked allowlist validation in `applyLoadedState` (orientation, wall, season, goal, zone, tool, cell ID regex, numeric range clamping) |
| 7 | Prototype pollution risk from `JSON.parse` of URL input | Low | `Object.freeze(p)` on URL-sourced parsed JSON + schema shape validation |
| 8 | `window.prompt` fallback leaked share URL to screen observers | Low | Replaced with in-page `showShareFallback()` — styled panel with read-only input + select-all |
| 9 | No indicator when loading from a shared link (spoofing risk) | Low | Added `showShareBanner()` — 4-second toast: "Loaded from shared link" |
| 10 | Malformed `decodeURIComponent` errors swallowed silently | Low | Explicit try/catch around `decodeURIComponent` with early return before `JSON.parse` |

### CSP policy

```
default-src 'none';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
script-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self';
```

> Note: `'unsafe-inline'` is required for the embedded `<style>` block and `<script>` block. To remove it, the CSS and JS would need to be extracted to external files with nonce or hash-based CSP — a future improvement.

---

## File structure (single file)

```
garden-planner-v4.html
├── <head>
│   ├── CSP meta tag
│   ├── Google Fonts link (crossorigin)
│   └── <style> (223 lines)
│       ├── CSS variables (color palette)
│       ├── Layout (3-column grid)
│       ├── Components (nav, tabs, cards, forms, tooltips)
│       ├── Bed grid cells (hover, selected, weak states)
│       ├── Score/inspect/notes panes
│       ├── Share banner + fallback UI
│       └── Responsive breakpoints
├── <body> (142 lines)
│   ├── Header
│   ├── Left sidebar (site + palette tabs)
│   ├── Center (toolbar + bed grid + fill bar)
│   └── Right sidebar (score + inspect + notes tabs)
└── <script> (1,119 lines)
    ├── Security helpers (escapeHtml, allowlists)
    ├── Crop database (43 entries)
    ├── Substitution table
    ├── State management (bed, ui, undo/redo)
    ├── Persistence (localStorage, URL hash, validation)
    ├── Input helpers
    ├── Bed size presets + custom
    ├── Zone map builder (light, wall penalty, orientation, trellis, access)
    ├── Scoring model (cell, adjacency, bed, goal bonus)
    ├── Recommendations engine (auto-fill, variety ranking, substitutions)
    ├── Cell issue detection
    ├── Warning system
    ├── Share + fallback UI
    ├── UI actions
    ├── Render functions (bed, palette, right pane)
    ├── Event binding (29 addEventListener + 3 delegation zones)
    └── Boot sequence
```

---

## Known limitations / future work

| Area | Notes |
|------|-------|
| `'unsafe-inline'` in CSP | Extract CSS/JS to external files + use nonce-based CSP |
| Google Fonts dependency | Self-host Fraunces, DM Mono, DM Sans as WOFF2 for offline + SRI |
| `getCell` performance | Uses `Array.find()` O(n) — replace with index math `bed[r*bedW+c]` for 10×10 beds |
| No drag-to-paint | Single click only; drag painting would improve UX for large beds |
| Crop data hardcoded | Could load from external JSON for easier community contributions |
| No export | Add PNG/PDF export of bed layout |
| No multi-bed | Single bed per session; multi-bed planning would be valuable |
| Accessibility | Keyboard navigation of grid cells, ARIA labels for score regions |

---

*Generated 2026-03-11 · Garden OS v4.1 · 1,495 lines · 86.4 KB · 8 bugs fixed · 10 security patches*
