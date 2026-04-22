---
Status: Active
Document Version: 1.1
Compatible With: Season Engine v4, Garden OS v4.3
Owner: Dave Robertson
Last Updated: 2026-03-16
Artifact Class: SOP
---

# Season Engine — Phased Patch Plan

> **Status note:** Historical patch plan. Current phase tracking is superseded by `IMPLEMENTATION_PLAN.md` (System A).

Post-brand-refactor roadmap for garden-league-simulator-v4.html.
Engine integrity fixes first, then quality, then features, then UX polish.

---

## Phase 1: Engine Integrity — COMPLETE

All items verified fixed in repo v3/v4.

| Item | Status | Detail |
|------|--------|--------|
| 1A. Deterministic target selection | Fixed | `cands.slice(0,t.max)` — no random shuffle |
| 1B. Double event application | Fixed | `S.currentEvent=null` after `doAcceptLoss()` |
| 1C. Phillies deterministic trigger | Fixed | `S.chapter%3===0` replaces `Math.random()<0.333` |
| 1D. Swap modifier moves with crop | Fixed (v4) | `eventModifier` now swaps alongside `cropId` |

---

## Phase 2: Code Quality + State Hardening

| Item | Scope | Notes |
|------|-------|-------|
| 2A. Extract `buildCarryForward()` | ~30 lines → 1 function | Dedup from `completeChapter()` and `doTransition()` |
| 2B. State version field | ~15 lines | Add `_version: 3` to saved state, migration check on load |
| 2C. Epilogue duplicate guard | 1 line | `if(!CAM.completedChapters.includes(12))` before push |
| 2D. Undo/redo for crop placement | ~40 lines | State snapshot stack during PLANNING phase. Push `grid` snapshot before each mutation, pop on Ctrl+Z. Cap stack at 20. |
| 2E. Fraunces `SOFT 60, WONK 1` | 1 CSS line | `font-variation-settings: 'SOFT' 60, 'WONK' 1` on heading rules |
| 2F. Type scale CSS custom properties | ~15 CSS vars | `--fs-xs` through `--fs-3xl` using 1.25 Major Third ratio |

---

## Phase 3: State Management + Accessibility

| Item | Scope | Notes |
|------|-------|-------|
| 3A. Save failure warning | ~10 lines | Replace empty catch with visible toast |
| 3B. Focus management on dialog open | 1 line | `el.cbox.querySelector('button').focus()` |
| 3C. Crop button aria-labels | ~3 lines | Name + lock status |
| 3D. Color-blind score indicators | ~20 lines | Shape or text alongside color on cells |

---

## Phase 4: Feature Activation

Wire systems that are already half-built. No new architecture.

| Item | What exists | What's needed |
|------|-------------|---------------|
| 4A. Award orphaned keepsakes | Items defined in `KEEPSAKES` | Add trigger conditions: `onion_scorecard` on first perfect adjacency, `first_frost_marker` on surviving frost event, `block_party_plate` on completing all 4 recipes |
| 4B. Wire harvest yield dialogue | `harvest_good_yield` / `harvest_poor_yield` pools exist | Fire based on `bedAverage` threshold at harvest |
| 4C. Wire Ch11/Ch12 dialogue through `fireDialogue()` | Hardcoded text in sauce sequence and epilogue | Replace with `fireDialogue('chapter_11_sauce_moment')` etc. |
| 4D. Cache `bedScore()` during planning | Computed twice per render | Store on state, reuse in `renderRes` |
| 4E. Weakest-factor callout | Factor bars exist | Below score ring: "⚠️ Sun Fit is dragging this cell down" — ~10 lines JS |
| 4F. Companion overlay wiring | `.companion-buff` CSS exists but JS never applies it | Wire adjacency check during planning to toggle class on neighbor cells |

---

## Phase 5: Dashboard Feature Port + UX Polish

Bring dashboard concepts into the simulator's planning phase.

| Item | Where | Scope |
|------|-------|-------|
| 5A. Sun/water view overlay toggle | Planning phase grid | Score/Sun/Water buttons above grid, tint cells by crop property. ~40 CSS + ~30 JS |
| 5B. Harvest timeline (days-to-harvest) | Results panel during HARVEST | Sort planted crops by urgency with progress bars. ~30 JS |
| 5C. Zone info panel | Controls panel, collapsible | Zone 6B, frost dates, growing days. ~20 HTML/JS |
| 5D. Hover preview ghost | Planning phase cells | `::after` with `opacity: 0.35` showing selected crop. ~10 CSS |
| 5E. Score mini-bar at cell base | All cells | 3px `::after` colored by score. Always-on indicator. ~10 CSS |
| 5F. Active press state | Planning phase cells | `scale(0.96)` + inset shadow on `:active`. ~5 CSS |
| 5G. Pinch-to-zoom on mobile grid | Grid container | CSS `transform: scale(var(--zoom))` + Pointer Events, clamp 1×–3×. ~30 JS |

---

## Phase 6: Archive + Repo Cleanup

| Item | Action |
|------|--------|
| Move dashboard concept files to `archive/` | v1, v2, v3 dashboard HTMLs |
| Move `garden-league-simulator-v2.html` to `archive/` | Superseded by v4 |
| Move `garden-os-simulator-v2.html` to `archive/` | Builder Mode v0.1 |
| Update `index.html` / `home.html` links | Point to v4 |
| Update `docs/active-hosted-urls.md` | Reflect new filenames |
| Update compatibility matrix in `VERSIONING_POLICY.md` | v4 Active, v3 Deprecated |

---

## Phase 7: Future (Not Scoped)

Documented opportunities, not committed work.

| Item | Notes |
|------|-------|
| PWA conversion (sw.js + manifest.json) | Highest-value architectural improvement for outdoor use. Requires CLAUDE.md exception for companion file. |
| Challenge constraint system (Ch9+) | Biggest feature add — dialogue pools exist, needs scoring rules |
| Custom SVG crop icons | Replace emoji with branded illustrations |
| Layout templates / starter gardens | Presets for common planting patterns |
| Export/share layout as `.gos.json` or image | Schema exists, needs UI |
| Real dark mode with season-aware palette | Remove inverted block, implement actual dark tokens |
| Lifetime achievements beyond keepsakes | Track milestones across campaigns |
| Separate campaign history from free-play history | Currently shared localStorage keys |
| Mobile crosshair/indirect pointer (Dotpict pattern) | Alternative to pinch-to-zoom if touch targets remain problematic after 5G |

---

## Execution Order

Phase 1 → done.
Phase 2 was the next step at draft time — smallest scope, highest structural impact.
Phase 3 alongside 2 — both are hardening, clean test surface.
Phase 4 before 5 — activate what's built before porting new features.
Phase 5 is the UX polish pass.
Phase 6 after 5 — cleanup after all file changes are stable.
Phase 7 as opportunities arise.
