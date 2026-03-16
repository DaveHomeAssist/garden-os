# Garden OS — Phase 1 Smoke Test

> **Features:** Scoring Explainer (Inspect Tool) + Companion Planting Reference
> **Date:** 2026-03-16
> **Page to test:** `garden-planner-v4.html`

---

## Setup

1. Open `garden-planner-v4.html` in a browser
2. Load or create a workspace with at least one bed
3. Place several crops on the grid (mix of companions and conflicts for best coverage)
4. Good test layout: tomato + basil adjacent, tomato + dill adjacent, lettuce in front row, a climber near the trellis row

---

## Test 1: Scoring Explainer — Inspect Tool

### 1A — Inspect tool appears in toolbar

1. Look at the toolbar (Paint / Erase area)

**Expected:**
- A third tool option "Inspect" (or magnifying glass icon) appears
- Clicking it activates inspect mode
- The active tool indicator updates

### 1B — Click planted cell in inspect mode

1. Select the Inspect tool
2. Click a cell that has a crop placed

**Expected:**
- The right sidebar switches to the Inspect tab
- The score breakdown panel shows:
  - Crop name and cell position
  - Each of the 6 scoring factors with individual values
  - Weight multipliers (Sun Fit shows 2x)
  - Weighted contribution per factor
  - Brief description of WHY each factor scored as it did
  - Adjacency section showing specific neighbor bonuses/penalties
  - Total score at the bottom
- Values should match the cell's displayed score exactly

### 1C — Click empty cell in inspect mode

1. Click a cell with no crop

**Expected:**
- Sidebar shows an empty state or "Select a planted cell" message
- No console errors

### 1D — Click different cells

1. Click cell A (e.g., tomato with high score)
2. Note the breakdown
3. Click cell B (e.g., lettuce with low score)
4. Note the breakdown changes

**Expected:**
- Breakdown updates to reflect the newly selected cell
- Values are different and make sense for each crop
- No stale data from previous selection

### 1E — Verify scoring accuracy

1. Click a cell and note the total score in the breakdown
2. Compare to the score bar / tooltip on the cell itself

**Expected:**
- Total matches exactly — the explainer uses the same scoring logic, not an approximation

### 1F — Adjacency detail

1. Place basil next to tomato
2. Inspect the basil cell

**Expected:**
- Adjacency section shows the tomato companion bonus explicitly
- Bonus value matches `companionBonus` from crop data

### 1G — Switch back to Paint tool

1. After inspecting, switch back to Paint tool
2. Click a cell

**Expected:**
- Normal paint behavior resumes
- Inspect panel may still show last inspected cell (acceptable)
- Painting is not broken

---

## Test 2: Companion Planting Reference

### 2A — Companions tab exists

1. Look at the right sidebar tabs

**Expected:**
- A "Companions" tab appears alongside existing tabs (Score, etc.)
- Clicking it switches the panel content

### 2B — Select a crop

1. Click the Companions tab
2. Use the dropdown or crop list to select "Cherry Tomato"

**Expected:**
- Panel shows all relationships for Cherry Tomato:
  - Companions (green checkmark, positive bonus) — should include basil
  - Conflicts (red X, negative penalty) — should include brassicas/dill
  - Neutral (gray dash, 0) — remaining crops
- Each row shows: icon, crop emoji, crop name, bonus/penalty value

### 2C — Search / filter

1. Type "bas" in the search input

**Expected:**
- Crop list filters to show only matching crops (Basil)
- Or if search filters the relationship list, only basil appears in the results

### 2D — Check multiple crops

1. Select Basil — check its companions and conflicts
2. Select Carrot — check its relationships
3. Select Dill — check for conflicts with tomato

**Expected:**
- Relationships are bidirectional where appropriate (if tomato lists basil as companion, basil should list tomato)
- Values match the `companionBonus` / `conflictPenalty` from crop data
- Neutral relationships show for crops with no tag overlap

### 2E — Grid highlighting

1. Place tomato, basil, and carrot on the grid
2. Open Companions tab
3. Select Tomato

**Expected:**
- Crops that are currently on the grid are visually highlighted (bold or marked) in the companion list
- This helps the gardener see which relationships are active in their current layout

### 2F — Empty bed / no workspace

1. If possible, clear all crops from the grid
2. Open the Companions tab

**Expected:**
- Reference still works (it's a lookup tool, not dependent on grid state)
- No grid-highlighted crops (none are placed)
- No errors

---

## Test 3: Both features together

### 3A — Inspect then check companions

1. Inspect a cell (see adjacency bonus from basil)
2. Switch to Companions tab
3. Select the same crop

**Expected:**
- Adjacency values in the explainer match the companion reference
- The tools reinforce each other — inspect shows live score, companions shows the reference data

### 3B — Tab switching

1. Click between Score, Inspect, and Companions tabs rapidly

**Expected:**
- Each tab renders its content correctly
- No stale content bleeding between tabs
- No console errors

---

## Test 4: Save and reload

### 4A — Persist workspace

1. Place crops, inspect a cell, review companions
2. Reload the page

**Expected:**
- Grid state persists (existing behavior)
- Inspect tool is available again
- Companions tab is available again
- No data loss

### 4B — Export and import

1. Export workspace as `.gos.json`
2. Clear workspace
3. Import the file

**Expected:**
- Grid restores
- Inspect and companion features work on the imported data

---

## Test 5: Edge cases

### 5A — Single crop on grid

1. Place only one crop on an otherwise empty grid
2. Inspect it

**Expected:**
- Adjacency shows 0 (no neighbors)
- All other factors still display correctly

### 5B — Crop in corner vs center

1. Inspect a corner cell (2 neighbors max)
2. Inspect a center cell (up to 8 neighbors)

**Expected:**
- Adjacency calculation reflects actual neighbor count
- No out-of-bounds errors

### 5C — Keyboard navigation

1. Use arrow keys to navigate between cells in inspect mode

**Expected:**
- Sidebar updates as keyboard focus moves between cells
- Or keyboard navigation is not supported in inspect mode (acceptable, but no crash)

---

## Console Checks

After all tests, check the browser console for:
- No uncaught errors
- No warnings about undefined variables
- No failed assertions

---

## Pass Criteria

- [ ] Inspect tool appears and activates cleanly
- [ ] Score breakdown shows all 6 factors with correct values
- [ ] Total score matches cell's displayed score exactly
- [ ] Adjacency shows specific neighbor bonuses/penalties
- [ ] Empty cell shows appropriate empty state
- [ ] Companions tab appears in right sidebar
- [ ] Crop selection shows companions, conflicts, and neutrals
- [ ] Search/filter works on the crop list
- [ ] Relationship values match crop data
- [ ] Grid crops are highlighted in companion list
- [ ] Tab switching works without stale content
- [ ] Both features survive reload
- [ ] No console errors
- [ ] Paint/erase tools still work after using inspect
