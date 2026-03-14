# Garden OS v4.0 — Version Report (Baseline)

**File:** `garden-planner-v4.html`
**Date:** 2026-03-11 (pre-patch baseline)
**Type:** Single-file client-side web app (HTML + CSS + JS, no build step)

---

## Overview

Garden OS v4.0 is the original release of the raised bed garden planner. Users configure a bed (size, sun, orientation, season), paint crops onto a grid, and receive live scoring with companion planting analysis, variety recommendations, and warnings.

| Metric | Value |
|--------|-------|
| Total lines | ~1,338 |
| File size | ~78 KB |
| HTML | ~140 lines |
| CSS | ~202 lines |
| JavaScript | ~985 lines |
| Functions | ~40 |
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
                 │     ├──► cellIssues() (called twice — renderBed + warnings)
                 │     ├──► renderBed()
                 │     └──► renderRight() ──► warnings(), scoreBed()
                 └──► shareLayout() ──► URL hash ──► clipboard
```

### Persistence

| Store | Key | Contents |
|-------|-----|----------|
| localStorage | `gardenOS_v4` | Bed dimensions, crop grid, UI state, all settings |
| URL hash | `#bed=...` | Encoded JSON payload (shareable, read-only on load) — **missing USDA zone** |

---

## Scoring Model

Same formula as v4.1 (no scoring logic changed in the patch).

---

## Features

| Feature | Status |
|---------|--------|
| Variable bed sizes (2×2 to 10×10) | Working |
| 6 preset bed sizes | Working |
| Custom W×H input | Working |
| Click-to-paint / click-to-erase tools | Working |
| Auto-fill by goal (6 goals) | Working |
| Undo / Redo (40-deep stack, Ctrl+Z/Y) | Working (but first undo blanks auto-fill) |
| Live bed score (0–100) | Working |
| Per-crop placement score bars | Working |
| Cell inspect with variety ranking | Working |
| "Better crop here" suggestions | Working (mutates live bed temporarily) |
| Crop substitution recommendations | Working |
| Water mismatch detection | Working (but duplicates warnings) |
| Per-cell issue icons on grid | Working |
| Notes tab with warnings/tips/good signals | Working |
| Season-aware scoring (4 seasons) | Working |
| 6 planning goals | Working |
| USDA zone selection | Working (but lost on share) |
| Sun hours slider | Working |
| Wall/shade side selector | Working |
| Bed orientation (E-W / N-S) | Working (but broken for 2-wide beds) |
| Trellis toggle | Working |
| Zone map with wall + orientation penalty | Working (orientation penalty over-applied on narrow beds) |
| Crop search + category filter | Working |
| Succession planting badges | Working |
| Share layout via URL hash | Working (missing zone; prompt fallback) |
| localStorage persistence | Working (no input validation) |
| Fill progress bar | Working |
| Responsive mobile layout | Working |

---

## Known Bugs (v4.0)

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | `shareLayout` omits USDA zone — shared links lose zone setting | Medium | `shareLayout()` settings object |
| 2 | N-S orientation penalty hits ALL columns in 2-wide beds | Medium | `buildZoneMap()` orientation formula |
| 3 | Division by zero in `scoreCropInCell` when `sunIdeal === sunMin` | Low | `scoreCropInCell()` sunFit calculation |
| 4 | `ui.selCell` not cleared on bed resize — stale ghost reference persisted | Low | `applyBedSize()` |
| 5 | Duplicate water-mismatch warnings — A↔B produces two separate messages | Low | `cellIssues()` water check |
| 6 | First auto-fill pushes empty bed to undo — Ctrl+Z blanks the grid | Low | `loadRec()` / init sequence |
| 7 | `cellIssues` computed twice per render cycle | Low | `render()` → `renderBed` + `renderRight` |
| 8 | `betterCropForCell` temporarily mutates live bed state during render | Low | `betterCropForCell()` crop swap loop |

## Known Security Issues (v4.0)

| # | Issue | Severity |
|---|-------|----------|
| 1 | All dynamic content rendered via `innerHTML` with no HTML escaping | Medium |
| 2 | No Content Security Policy | Medium |
| 3 | 22 inline `onclick`/`onchange`/`oninput` handlers prevent CSP lockdown | Medium |
| 4 | No size validation on URL hash payload — DoS via giant JSON | Medium |
| 5 | Google Fonts loaded without `crossorigin` attribute | Low |
| 6 | `applyLoadedState` sets DOM values from untrusted data with no type/allowlist validation | Low |
| 7 | `JSON.parse` of URL input with no prototype pollution guard | Low |
| 8 | `window.prompt` fallback in `shareLayout` leaks URL to screen observers | Low |
| 9 | No indicator when layout loaded from a shared link (spoofing risk) | Low |
| 10 | Malformed `decodeURIComponent` errors swallowed silently | Low |

---

*Garden OS v4.0 · Baseline pre-patch · ~1,338 lines · ~78 KB · 8 known bugs · 10 security issues*
