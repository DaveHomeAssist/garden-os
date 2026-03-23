# Codex Prompt — Phase 1B: Explainable Score Breakdown

## Task

Add a "Why this score?" panel to the Inspect tab in `garden-planner-v4.html` that shows the weighted factor breakdown for the currently selected cell.

## Context

The planner's scoring engine (`scoreCropInCell()` at line ~1945) computes a 0–10 score per cell by combining 6 factors, but only shows the final number. Users can't see why a crop scores well or poorly.

## Current Scoring Architecture

The score is computed in `scoreCropInCell(ck, cell, inputs)` (line 1945–1971):

```
finalScore = min(10, max(0, (sunFit*2 + supFit + shadeFit + accFit + seaFit) / 3 + structBonus))
```

### Factor breakdown:

| Factor | Variable | Weight | Range | How it's computed |
|--------|----------|--------|-------|-------------------|
| Sun Fit | `sunFit` | 2x | 0–5 | Maps `cell.effectiveLight` against crop's `sunMin`/`sunIdeal` |
| Support Fit | `supFit` | 1x | 1–5 | Checks `cell.hasVerticalSupport` vs crop habit (vining/trellis) |
| Shade Tolerance | `shadeFit` | 1x | 0–5 | Crop's `shadeScore`, reduced if light < sunMin |
| Access Fit | `accFit` | 1x | 3–5 | Based on cell position + crop height (low/very low get bonus) |
| Season Fit | `seaFit` | 1x | 1–5 | Cross-references season setting with `coolSeason` flag |
| Structural Bonus | `structBonus` | additive | -2 to +3 | Trellis row, protected zone, critter-safe, succession bonuses |

After `scoreCropInCell`, an adjacency score is added via `adjScore(cell)` (line 1986–2004):
- Companion tags: +0.5 per match (weighted by `companionWeight`)
- Conflict tags: -1.2 per match
- Same crop adjacent: -0.2
- Tall-tall adjacent: -0.75
- Water incompatibility (2+ gap): -0.5
- Clamped to [-2, +2]

Final cell score = `scoreCropInCell() + adjScore()`, clamped 0–10.

## Requirements

### 1. Score Explanation Panel
- Add a new section inside the existing Inspect tab (`#rpane-inspect`)
- Only visible when a cell with a crop is selected
- Show each factor as a labeled row with:
  - Factor name
  - Raw value (e.g., "4.2 / 5")
  - Visual bar (proportional fill, colored green/yellow/red by quality)
  - One-line explanation of why (e.g., "6.5 hrs sun vs 5.5 hr minimum — good fit")
- Highlight the **limiting factor** (lowest scoring) with a distinct style (border or icon)

### 2. Adjacency Section
- Separate subsection below the 6 factors
- Show each neighbor interaction: companion bonus, conflict penalty, water mismatch
- Net adjacency score with +/- indicator

### 3. Score Summary
- Show the formula visually: `(Sun×2 + Support + Shade + Access + Season) / 3 + Structure + Adjacency = Final`
- Final score displayed prominently with the existing color scale

## Implementation Constraints

- All changes in `garden-planner-v4.html` only — single file
- No new dependencies, no external libraries
- Use existing CSS variables (`--soil`, `--leaf`, `--sun`, `--warn`, `--good`, `--bad`, etc.)
- Use existing font stack (`DM Sans`, `DM Mono`, `Fraunces`)
- Match the existing panel style (`.tab-pane` padding, spacing, typography)
- Must work with the existing tab switching logic (`tab-btn` / `tab-pane` classes)
- Must update when user changes crop, moves to different cell, or changes site settings
- Accessible: use semantic HTML, ensure contrast ratios pass WCAG AA

## Function to modify

Create a new function `renderScoreExplanation(cell, inputs)` that:
1. Recomputes each factor individually (extract from `scoreCropInCell` logic — don't duplicate, call a shared helper or re-derive)
2. Computes adjacency breakdown per-neighbor
3. Renders into a container inside `#rpane-inspect`
4. Is called from the existing cell selection/render pipeline

Hook it into the existing `render()` cycle — look for where `#rpane-inspect` content is currently populated.

## Existing Inspect Tab

The Inspect tab (`#rpane-inspect`) currently shows cell properties and crop info. Add the score explanation below existing inspect content, separated by a subtle divider (`border-top: 1px solid var(--border-light)`).

## After completing changes

- Commit with message: `feat: add explainable score breakdown to Inspect tab`
- Do NOT push — leave for manual review
