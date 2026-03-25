---
Status: Active
Date: 2026-03-24
Auditor: Claude Opus 4.6 (automated diff of spec vs planner vs Story Mode)
Direction: Planner is ground truth. If it doesn't make sense in the real world, it doesn't make sense here.
---

# Garden OS — Scoring Audit

## Purpose

Diff all three scoring sources and identify divergences. The planner was the original implementation and reflects real-world gardening logic. Story Mode and the spec should converge toward the planner where the planner's behavior is more realistic.

## Sources

- **Spec:** `specs/SCORING_RULES.md`
- **Planner:** `garden-planner-v4.html` (lines ~3960-4118)
- **Story Mode:** `story-mode/src/scoring/cell-score.js` + `bed-score.js`

## Design Principle

> If it doesn't make sense in the real world, it doesn't make sense here.

The planner started this project. Its scoring model was tuned to feel right when placing real crops in a real raised bed. The spec was written to document the planner's behavior, and Story Mode was built to extend it into a game. Where the three diverge, realism wins — and the planner's real-world tuning is the closest to that.

---

## Divergence Table

| # | Factor | Source | Severity | Description | Resolution |
|---|--------|--------|----------|-------------|------------|
| 1 | sunFit | Story Mode | Low | Missing `clamp(0, 5)` on return | Fix Story Mode — add clamp |
| 2 | sunFit | Story Mode | Low | Missing `max(0, ...)` guard and div-by-zero guard | Fix Story Mode — add guards |
| 3 | supFit | Planner | Medium | Gives 2.0 (not 1.0) when crop needs support and site has trellis but cell is off trellis row | **Keep planner behavior.** Realistic: a vine near a trellis row benefits somewhat. Update spec to document 2.0 intermediate. |
| 4 | supFit | Planner | Low | Extra `trellisRequired` property | Document in spec as planner extension |
| 5 | shadeFit | Story Mode | Medium | Missing `max(1.0, ...)` floor — crops with shadeScore=1 get 0.6 | Fix Story Mode — add floor |
| 6 | accessFit | Story Mode | Low | Hard-codes row-0-is-back; no wallSide orientation handling | Fix Story Mode — derive from site config |
| 7 | seasonFit | Story Mode | Medium | `latesummer` not handled — cool crops get 3.0 instead of 1.0 | Fix Story Mode — add latesummer branch |
| 8 | seasonFit | Planner | **Realism** | `seasonalMultipliers` baked into seaFit as `1 + sm * 4` instead of multiplying weightedCore | **Keep planner behavior.** See rationale below. Update spec. |
| 9 | adjacency | Planner | Medium | Companion bonus scaled by faction weight (0.25–0.50) instead of flat 0.50 | **Keep planner behavior.** Realistic: not all companion relationships are equal. Update spec. |
| 10 | cell score | Planner | **Realism** | Seasonal multiplier never applied as scaling factor (consequence of #8) | **Keep planner behavior.** Update spec. Fix Story Mode to match. |
| 11 | cell score | Planner | Medium | structBonus (trellis-row, protected-zone, critter-safe, succession) | **Keep planner behavior.** Document as spec extensions. |
| 12 | bed score | Planner | Medium | No recipe bonus in bed scoring | Add recipe bonus to planner to match spec |
| 13 | bed score | Planner | Low | goalBonus and latesummer cool penalty are extensions | Document in spec |
| 14 | bed score | Story Mode | Low | A+ grade tier not in spec | Add to spec |
| 15 | bed score | Story Mode | Low | Recipe bonus checks pantry vs bed contents | Clarify in spec — pantry reflects accumulated harvest, bed contents reflect current placement. Story Mode recipe bonus should check current bed. |

---

## Key Decision: Seasonal Multiplier Model

### The problem

The spec says: `preAdjScore = weightedCore * seasonalMultiplier`

This means a crop with `sm = 0.3` (lettuce in summer) gets its entire core score multiplied by 0.3 — a 70% reduction. That's devastating. In practice, lettuce planted in summer still grows; it bolts faster and produces less, but it doesn't fail catastrophically.

The planner does: `seaFit = 1.0 + sm * 4.0`

This means `sm = 0.3` produces `seaFit = 2.2` — a below-average score in one factor out of six. The crop is penalized but not destroyed.

### The decision

**Keep the planner's model.** It's more realistic.

- A 70% core reduction makes out-of-season crops unplayable, which doesn't reflect how gardening actually works
- The planner's approach treats season fit as one factor among six, not as a kill switch
- Real gardeners plant lettuce in summer (with shade cloth) and tomatoes in late spring (with protection). The scoring should reflect "less ideal" not "nearly impossible"
- Story Mode should adopt the planner's `seaFit = 1.0 + sm * 4.0` approach instead of the spec's multiplier model

### Spec update required

`specs/SCORING_RULES.md` Section 5c should be rewritten:

**Before:** `preAdjScore = weightedCore * seasonalMultiplier`

**After:** Seasonal multipliers are applied within the season fit factor: `seaFit = 1.0 + seasonalMultiplier * 4.0` (range 1.0–5.0). They do NOT multiply the entire weighted core. This keeps seasonal suitability as one balanced input among six rather than an override.

---

## Fix Plan

### Story Mode fixes (code changes needed)

1. **sunFit:** Add `clamp(0, 5)` return, `max(0, ...)` guard, div-by-zero guard
2. **shadeFit:** Add `max(1.0, result)` floor in below-sunMin branch
3. **seasonFit:** Add `latesummer` branch (cool → 1.0, warm → 5.0)
4. **seasonFit:** Replace `weightedCore * seasonalMult` with `seaFit = 1.0 + sm * 4.0` to match planner
5. **accessFit:** Handle wallSide orientation instead of hard-coding row-0-is-back
6. **bed score:** Verify recipe bonus checks bed contents, not just pantry

### Spec updates needed

1. **Section 3 (Support Fit):** Document 2.0 intermediate for off-trellis-row support crops
2. **Section 5c (Seasonal Multiplier):** Rewrite to `seaFit = 1.0 + sm * 4.0` model
3. **Section 6 (Adjacency):** Document companion weight scaling by faction pair
4. **Section 10 (Bed Score):** Document A+ grade, goalBonus, latesummer cool penalty as planner extensions
5. **Add note:** Planner structBonus (trellis-row match, protected-zone, critter-safe, succession) are documented extensions not required in Story Mode

### Planner fixes (minor)

1. **Add recipe bonus** to `scoreBed()` — +0.2 per completed recipe, max 0.8

---

## Severity Summary

- **High → Resolved by design decision:** Seasonal multiplier model. Planner wins. Spec and Story Mode update.
- **Medium (4):** Story Mode bugs in shadeFit, latesummer, plus planner extensions to document.
- **Low (9):** Defensive guards, grade tiers, extensions — all straightforward.

No scoring logic is "wrong" in the sense of producing nonsensical results. The planner's extensions (structBonus, companionWeight, goalBonus) all add realism. The Story Mode gaps (missing latesummer, missing shade floor) need patching.
