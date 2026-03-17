# Garden OS Engine Audit — Codex Test Suite

**Target:** `garden-league-simulator-v4.html`
**Generated:** 2026-03-16
**Purpose:** 10 independent tests for Codex to audit the Season Engine's scoring, events, state, and dialogue systems. All tests are read-only analysis — no file modifications.

---

## Test 1: Scoring Determinism

```
CODEX TASK — Scoring Determinism Verification

FILE: /Users/daverobertson/Desktop/Code/10-active-projects/garden-os/garden-league-simulator-v4.html

OBJECTIVE: Verify that identical grid states produce identical scores.

METHOD:
1. Read the file and locate: scoreCell(), bedScore(), effectiveLight(),
   sunFit(), supFit(), shadeFit(), accFit(), seaFit(), adjScore()
2. Construct a test grid in memory:
   - Cell 0 (r0,c0): cherry_tom
   - Cell 1 (r0,c1): basil
   - Cell 8 (r1,c0): lettuce
   - Cell 16 (r2,c0): carrot
   - All other cells: null/empty
3. Call bedScore(grid, 'spring') 100 times
4. Verify every call returns the exact same:
   - bedAverage (to 10 decimal places)
   - finalScore
   - grade
   - per-cell factor values (sun, support, shade, access, season, adjacency)

PASS: All 100 results are bit-identical.
FAIL: Any variance between runs.

Also check: grep the entire file for Math.random. The ONLY acceptable
location is inside wRand() as a fallback when _seededRng is null. If
Math.random appears anywhere in scoring, event targeting, or dialogue
selection, that is a FAIL.

REPORT: List every Math.random() call site with line number and context.
```

---

## Test 2: Light Model Correctness

```
CODEX TASK — Light Model Verification

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify effectiveLight() produces correct values for all 32 cells
given the shadow model (row position + tall-crop occlusion).

METHOD:
1. Read effectiveLight(idx, grid)
2. Test with empty grid: compute light for all 32 cells
   Expected: row 0 = BASE_SUN - max(0,(2-0)*.75) = 6 - 1.5 = 4.5
             row 1 = BASE_SUN - max(0,(2-1)*.75) = 6 - 0.75 = 5.25
             row 2 = BASE_SUN - max(0,(2-2)*.75) = 6
             row 3 = BASE_SUN - max(0,(2-3)*.75) = 6

3. Test with tall crop in row 0, col 0:
   Cell (1,0) should lose 0.5 additional light from tall crop shadow
   Cell (0,0) should NOT lose shadow from itself

4. Test edge case: tall crop in row 3 (front row)
   No cell below it to shadow — should have no effect

PASS: All computed light values match the mathematical model.
FAIL: Any cell has unexpected light value.

REPORT: Table of all 32 cells with expected vs actual light values
for both empty grid and tall-crop-in-r0c0 scenarios.
```

---

## Test 3: Factor Function Range Validation

```
CODEX TASK — Factor Function Range Testing

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify all 6 scoring factor functions return values within
their documented ranges and handle edge cases.

METHOD:
For each function, test with boundary inputs:

sunFit(crop, L):
  - L = 0 (no light) → should return value in [0, 5]
  - L = crop.sunMin (exact minimum) → should return 3
  - L = crop.sunIdeal (ideal) → should return 5
  - L = 10 (above ideal) → should return 5
  - Test with every crop in C{}

supFit(crop, row):
  - Support crop in trellis row (0, 1) → should return 5
  - Support crop in non-trellis row (2, 3) → should return 1
  - Non-support crop in any row → should return 3

shadeFit(crop, L):
  - L < crop.sunMin → should return max(1, crop.shadeScore * 0.6)
  - L >= crop.sunMin → should return crop.shadeScore

accFit(crop, row):
  - Tall crop in any row → should return 3
  - Non-tall crop in row 0 → should return 3 (back)
  - Non-tall crop in row 3 → should return 5 (front)

seaFit(crop, season):
  - Cool-season crop in spring → 5
  - Cool-season crop in summer → 2
  - Warm-season crop in spring → 3
  - Warm-season crop in summer → 5
  - Any crop in winter → 3

adjScore(idx, cropId, grid):
  - Companion adjacent → raw should increase by 0.5
  - Conflict adjacent → raw should decrease by 1.2
  - Two tall crops adjacent → raw should decrease by 0.75
  - Same crop adjacent → raw should decrease by 0.2
  - Water difference >= 2 → raw should decrease by 0.5
  - Return clamped to [-2, 2]

PASS: Every function returns values within its valid range for all inputs.
FAIL: Any out-of-range value or unexpected behavior on edge cases.

REPORT: Table per function with input, expected output, actual output.
```

---

## Test 4: Event Engine Determinism

```
CODEX TASK — Event Engine Determinism

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify that the seeded PRNG produces deterministic event
selection and target resolution.

METHOD:
1. Read seedRng(), gridHash(), seedEventRng(), wRand(), drawEvent(),
   resolveTargets()

2. Create a fixed game state:
   - chapter: 6, beatIndex: 0, season: 'summer'
   - grid: cherry_tom in cells 0-7, basil in cells 8-15, empty 16-31
   - drawnEventIds: []

3. Call seedEventRng(state) then drawEvent(eventPool('summer'), state)
   Record the selected event ID.

4. Reset state to identical values.
   Call seedEventRng(state) then drawEvent(eventPool('summer'), state)
   Record the selected event ID.

5. Repeat 50 times with identical state.

PASS: Same event selected all 50 times.
FAIL: Any different event selection.

6. For the selected event, call resolveTargets(event, grid).
   Verify target cells are in grid index order (ascending),
   NOT random order.

PASS: Targets sorted by index.
FAIL: Targets in random or inconsistent order.

REPORT: Event ID selected, target cells returned, confirmation of
determinism across all 50 runs.
```

---

## Test 5: Carry-Forward Integrity

```
CODEX TASK — Carry-Forward Data Integrity

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify that completeChapter() and doTransition() produce
identical carry-forward data for the same input state.

METHOD:
1. Read both completeChapter() and doTransition()
2. Check if both call a shared buildCarryForward() function,
   or if carry-forward logic is still duplicated
3. If shared function exists: PASS on deduplication
   If duplicated: list every line that differs between the two copies

4. For carry-forward data shape, verify:
   - soilFatigueMap: keys are "row,col" strings, values are numbers
   - lastFamilyMap: keys are "row,col" strings, values are faction strings
   - infrastructureMap: keys are "row,col" strings, values are string arrays
   - eventMemory: array of objects with eventId, chapter, effectType,
     modifier, affectedCells, expiresAfter
   - seasonHistory: array with chapter, season, finalScore, grade,
     yieldList, eventsDrawn, interventionsUsed
   - recipePantry: array of crop ID strings

5. Verify soil fatigue rules:
   - Same crop family in same cell: fatigue increases
   - Different family: fatigue resets to 0
   - Heavy crops (HEAVY array) get -0.3 base fatigue
   - Fatigue clamped to -1.5 minimum

PASS: Carry-forward shape is consistent and rules match spec.
FAIL: Shape mismatch, missing fields, or incorrect fatigue calculation.

REPORT: Carry-forward schema documentation + any discrepancies found.
```

---

## Test 6: Crop Data Consistency

```
CODEX TASK — Crop Database Validation

FILE: garden-league-simulator-v4.html

OBJECTIVE: Validate the crop database (C object) for internal
consistency and spec compliance.

METHOD:
1. Read the C object (all 20 crops)
2. For every crop, verify required fields exist:
   id, name, emoji, short, faction, sunMin, sunIdeal, support,
   shadeScore, coolSeason, tall, water, companions, conflicts,
   chapterUnlock, recipes, ev, sm

3. Companion symmetry check:
   For every crop A with companion B:
   Does crop B list A as a companion?
   If not, document the asymmetry.
   (Note: asymmetric companions may be intentional — report, don't fix)

4. Conflict symmetry check:
   Same as above for conflicts array.

5. Recipe ingredient check:
   For every recipe in RECIPES:
   Does every ingredient crop ID exist in C?
   Does every crop that lists a recipe ID actually appear
   in that recipe's crop list?

6. Season multiplier check:
   Every crop.sm must have spring, summer, fall keys.
   Values should be in [0, 1] range.

7. Faction membership check:
   Every crop.faction must match one of the FACTIONS array entries.

8. Chapter unlock check:
   chapterUnlock values should be in [1, 12] range.

PASS: All validations pass, or asymmetries are documented.
FAIL: Missing fields, broken recipe references, out-of-range values.

REPORT: Validation table per crop + list of asymmetries + any failures.
```

---

## Test 7: State Persistence Integrity

```
CODEX TASK — Save/Load State Integrity

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify that save/load cycle preserves all state without
data loss or corruption.

METHOD:
1. Read save(), load(), saveCampaign(), loadCampaign(), saveH(), loadH()
2. Identify all localStorage keys used:
   - SKEY (garden_os_v3_state)
   - HKEY (garden_os_v3_hist)
   - CKEY (garden_os_v3_campaign)

3. Verify save() serializes the complete S object
4. Verify load() deserializes and patches missing fields:
   - eventAffectedCells (array)
   - carryForward (object)
   - beatTokenAvailable (boolean)

5. Check: does saved state include _version field?
   If yes: verify migrateState() exists and handles version upgrades
   If no: flag as missing

6. Check: what happens when localStorage.setItem throws
   (quota exceeded)?
   - Does save() catch the error?
   - Does it show a user-visible warning?

7. Check: what happens when localStorage contains invalid JSON?
   - Does load() handle JSON.parse failure?
   - Does it return null or a safe default?

8. Key collision check:
   Verify these keys don't collide with planner keys
   (gardenOS_workspace, gardenOS_tutorialDone, etc.)

PASS: All save/load paths handle errors gracefully, version field exists,
no key collisions.
FAIL: Unhandled errors, missing version field, key collisions.

REPORT: State persistence map with all keys, error handling assessment,
migration function status.
```

---

## Test 8: Campaign State Machine

```
CODEX TASK — Campaign State Machine Validation

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify the campaign state machine has no unreachable states,
no stuck states, and transitions are all valid.

METHOD:
1. Document all CAM.mode values:
   menu, campaign, freeplay, chapter_start, chapter_end,
   sauce_sequence, epilogue, winter_review

2. Document all S.phase values:
   PLANNING, EARLY_SEASON, MID_SEASON, LATE_SEASON, HARVEST,
   REVIEW, TRANSITION

3. For each mode, document:
   - What triggers entry into this mode
   - What actions are available
   - What triggers exit from this mode
   - What mode(s) it can transition to

4. For each phase, document:
   - Entry condition
   - Available user actions
   - Exit condition
   - Next phase

5. Verify: from every reachable state, there exists at least
   one valid transition to another state (no dead ends).

6. Verify: chapter 12 correctly transitions to epilogue,
   not chapter_end.

7. Verify: winter chapters (4, 8, 12) skip PLANNING phase
   and go directly to REVIEW.

8. Verify: completedChapters never contains duplicates
   (guard exists before push).

PASS: All states reachable, no dead ends, transitions correct.
FAIL: Unreachable state, dead end, or incorrect transition.

REPORT: State machine diagram (text format) with all transitions.
```

---

## Test 9: Dialogue System Coverage

```
CODEX TASK — Dialogue System Coverage Audit

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify every trigger key in the code has a matching
entry in DIALOGUE_DB, and no DIALOGUE_DB entries are orphaned.

METHOD:
1. Extract all fireDialogue('trigger_key') calls from the JS
2. Extract all keys from DIALOGUE_DB
3. Cross-reference:
   - Triggers called in code but missing from DIALOGUE_DB = FAIL
   - DIALOGUE_DB keys never called in code = orphaned (document)

4. For each DIALOGUE_DB entry, verify:
   - At least 'gurl' and 'onion' pools exist
   - Each pool has >= 1 line
   - No empty strings in any pool
   - No duplicate lines within a pool

5. Check selectLine() deduplication:
   - Does it avoid repeating the same line within 3 uses?
   - Does it reset when all lines are exhausted?

6. Verify player-facing text contains NO instances of:
   - "beat" (should be "phase")
   - "token" (should be "action")
   - "faction" (should be "crop type")

PASS: All triggers mapped, no orphans, no jargon leaks.
FAIL: Missing trigger mapping, empty pools, or jargon in player text.

REPORT: Trigger coverage matrix + orphan list + jargon scan results.
```

---

## Test 10: Intervention Logic Safety

```
CODEX TASK — Intervention Logic Audit

FILE: garden-league-simulator-v4.html

OBJECTIVE: Verify all 5 intervention types work correctly and
don't corrupt state.

METHOD:
For each intervention type (protect, mulch, companion_patch,
prune, swap):

1. Verify the cell modification is correct:
   - protect: sets interventionFlag = 'protected'
   - mulch: sets interventionFlag = 'mulched'
   - companion_patch: sets interventionFlag = 'companion_patched'
   - prune: sets cropId = null
   - swap: exchanges cropId between two adjacent cells

2. Verify swap also moves eventModifier with the cropId
   (this was a bug — confirm the fix is in place)

3. Verify: after any intervention, beatTokenAvailable = false
   (one action per phase)

4. Verify: S.currentEvent is not null after intervention
   (event still needs to resolve)

5. Verify: protected cells are skipped by applyEvent()
   (check the if(c.interventionFlag==='protected') continue guard)

6. Verify: swap only works between adjacent cells
   (nbs() check in execIntervention)

7. Verify: intervention state (protected, mulched, companion_patched)
   is cleared at the start of each new beat phase
   (check startBeat())

8. Verify: doAcceptLoss() nulls S.currentEvent after applying
   (prevents double event application)

PASS: All interventions modify state correctly, one-per-phase enforced,
protected cells immune, swap moves modifiers, no double application.
FAIL: Any state corruption, missing guard, or incorrect behavior.

REPORT: Per-intervention verification matrix with pass/fail per check.
```

---

## Execution Notes

- Each test is independent — run in any order
- All tests are read-only analysis, no file modifications
- Tests reference actual function and variable names in the codebase
- Tests can be validated at runtime via `window.gardenOS.getState()` in browser console
- Line numbers are approximate — locate functions by name, not line number
- Canonical scoring spec: `specs/SCORING_RULES.md`
- Canonical crop data: `specs/CROP_SCORING_DATA.json`
- Canonical event deck: `specs/EVENT_DECK.json`
