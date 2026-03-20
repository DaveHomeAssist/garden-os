# Garden OS — Crop Reconciliation Test Report

**Generated:** 2026-03-20
**Feature:** Crop data reconciliation (19 → 38 crops)
**Commit:** ec188dc
**Spec Version:** CROP_SCORING_DATA.json v2

---

## Summary

| Metric | Count |
|--------|-------|
| **Test Suites** | 14 |
| **Total Tests** | ~420 (38 crops × ~8 field checks + scoring + edge + perf) |
| **Categories** | Unit, Integration, Edge Case, Performance |

---

## Test Coverage Matrix

### Unit Tests (Schema & Data Integrity)

| Suite | What It Tests | Crop Coverage |
|-------|--------------|---------------|
| Crop Schema Completeness | All 11 spec fields + 6 planner fields present on each crop | 38/38 |
| Field Type Validation | id match, boolean types, water range, array types, faction enum, seasonalMultipliers range | 38/38 × 7 checks |
| Key Normalization | Old keys (cherry_tomato, leaf_lettuce, etc.) removed; new keys exist | 7 renames verified |
| Recipe Cross-References | Every recipe→crop and crop→recipe link resolves | 6 recipes × bidirectional |
| Faction Distribution | 8 factions, 2-8 crops each, no empty/overpopulated factions | All factions |

### Integration Tests (Scoring Functions)

| Suite | What It Tests | Conditions |
|-------|--------------|------------|
| Scoring Determinism | Same inputs → same scores, 10 iterations per crop | 38 crops × 10 runs |
| Season Multiplier Effect | Cool-season crops score higher in spring; warm-season in summer | 5+5 sentinel crops |
| Companion/Conflict Adjacency | basil↔cherry_tom positive, peas+onion negative, same-crop penalty, tall×tall penalty | Targeted pairs |
| Support Fit | Climbers get 5 with trellis, 1 without; non-support get neutral 3 | All crops by support type |
| Access Fit by Height | Short crops prefer front rows; tall crops neutral | All crops by tall boolean |

### Edge Case Tests

| Suite | What It Tests | Risk Addressed |
|-------|--------------|----------------|
| Boundary Conditions | 0 light, 10 light, unknown crop, "none" crop, unknown neighbor, all 4 seasons | Crash prevention |
| Spec ↔ Planner Consistency | faction, support, tall, water, companions, seasonalMultipliers match between files | Data drift detection |
| tall/support/height Consistency | tall boolean matches height enum; support boolean matches trellisRequired | Schema alignment |
| localStorage Migration Map | All 7 old keys map to valid new keys | Saved bed preservation |

### Performance Tests

| Suite | What It Tests | Target |
|-------|--------------|--------|
| Scoring Throughput | 38 crops × 32 cells × 10 iterations | < 500ms |
| Adjacency Calculation | 38² = 1,444 crop pairs | < 200ms |

---

## How to Run

### Browser (visual test runner)

```bash
cd garden-os
python3 -m http.server 8000
# Open http://localhost:8000/tests/crop_reconciliation_tests.html
```

The test page loads the planner HTML and spec JSON, extracts the CROPS object, runs all suites, and renders pass/fail results with a summary dashboard.

### What to Look For

1. **Summary bar** — should read "ALL PASS"
2. **Red FAIL badges** — any failure indicates a data integrity or scoring regression issue
3. **Performance detail** — timing shown for throughput tests
4. **Spec ↔ Planner Consistency** — if these fail, the two files have drifted again

---

## Test Design Rationale

### Why these tests exist

The crop reconciliation touched 3 files and 5 independent phases. Each phase introduced specific risks:

| Phase | Risk | Test Coverage |
|-------|------|--------------|
| 1. Key normalization | Old keys break saved beds, hardcoded references missed | Key Normalization suite, Migration Map suite |
| 2. Schema alignment | Missing fields crash scoring; wrong types produce NaN | Schema Completeness, Field Type Validation |
| 3. Scoring migration | Regression in scoring algorithm; NaN propagation | Determinism, Boundary Conditions, all Integration suites |
| 4. Spec update | Spec and planner drift apart | Spec ↔ Planner Consistency |
| 5. Cross-reference integrity | Recipes reference nonexistent crops; companions point to old keys | Recipe Cross-References, Companion/Conflict validation |

### Edge cases specifically targeted

- **0 effective light**: Some crops have sunMin < 1; division-by-near-zero risk in sunFit calc
- **10 effective light**: All crops should reach sunFit=5 (ceiling test)
- **Unknown crop key**: Scoring must return null, not crash
- **"none" crop key**: Used as empty-cell sentinel in the planner
- **All 4 season values**: Each season path in seaFit must produce valid 1-5 output
- **Water diff boundary**: water values are 2 or 3; max diff is 1, so the ≥2 penalty should never fire (validates the water mapping was correct)

---

## Known Limitations

1. **No E2E browser automation** — tests run in a static HTML page, not Playwright/Puppeteer. Visual rendering and click interactions are not tested.
2. **localStorage migration** — tested structurally (key mapping) but not with actual localStorage data. Manual verification recommended with a pre-migration saved bed.
3. **League simulator** — not updated in this reconciliation; its 19-crop C object still uses the old roster. Expanding it is a separate task.
4. **companionWeight()** — still uses category-based weights to modulate companion bonus magnitude. Not broken, but could produce different bonus amounts than a pure crop-keyed system.

---

## Recommendation

Run the test suite after any future changes to:
- `CROPS` object in garden-planner-v4.html
- `specs/CROP_SCORING_DATA.json`
- `computeScoreBreakdown()`, `computeAdjacencyBreakdown()`, or `scoreBed()`

If any test fails, the change introduced a regression. Do not ship until all tests pass.
