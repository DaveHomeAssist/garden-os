# Garden OS Scoring Audit — 2026-03-24

## Canonical decisions

- [SCORING_RULES.md](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/specs/SCORING_RULES.md) is canonical for raw scoring math:
  - deterministic inputs
  - six cell factors
  - event/intervention/fatigue order
  - 0-10 cell and bed score ranges
- Story Mode owns post-layout gameplay layers and readable factor explanations:
  - events
  - interventions
  - soil fatigue
  - chapter/month event timing
- The planner owns fast planning UX, cage-aware heuristics, and the 0-100 operator-facing rollup.

## Rules-critical drift

- Planner light model is not the spec model.
  - Spec: wall shadow is row/col based with a fixed `0.75` loss per row from wall plus `0.5` tall-crop shade cast.
  - Planner: [garden-planner-v4.html](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/garden-planner-v4.html) uses sun-direction gradients, wall-on-sun-side penalties, and cage-derived structure traits.
- Planner season handling is not the spec model.
  - Spec: season multiplier scales the weighted core after factor scoring.
  - Planner: seasonal multiplier is folded into `seaFit`, then structure bonuses are added before adjacency.
- Story Mode previously used direct randomness in score-affecting event resolution.
  - `random_cells` targeting in [event-engine.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/game/event-engine.js) used `Math.random()`.
  - This pass changed it to deterministic seeded targeting based on `event.id`, `target.filter`, and cell index.
- Story Mode previously treated `latesummer` as a separate multiplier key.
  - Spec says `latesummer` uses the `summer` multiplier.
  - This pass corrected [cell-score.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/scoring/cell-score.js).

## Deliberate planner-only behavior

- 0-100 bed score rollup in the planner UI.
- Goal bonuses in the planner rollup.
- Extra late-summer cool-crop penalty in the planner rollup.
- Cage-aware structure bonuses and penalties at cell level.
- Planner access model is tuned for fast placement guidance, not strict spec parity.

## Drift that is important but not patched in this pass

- Story Mode cell light still does not implement the full spec wall-shadow and tall-crop shade model.
- Story Mode event deck draw order in [events.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/data/events.js) is now deterministic, but it is still a game-layer draw system rather than a score-spec rule.
- Planner and Story Mode both present a 0-100 score, but they derive it from different rollup assumptions and labels.

## Cosmetic / vocabulary drift

- Planner now says `Live score`, `Why this score`, and `Garden board`.
- Story Mode uses chapter/season/HUD language and score reveal language.
- These are presentation differences, not scoring-rule differences.

## Practical operating model

- Treat the spec as the source of truth for math.
- Treat the planner as the fast deterministic planning surface.
- Treat Story Mode as the downstream simulation layer that modifies a chosen layout after planning.

## Recommended convergence path

1. Move Story Mode light/support/access derivation to spec parity.
2. Decide whether the planner should remain a tuned heuristic shell or fully converge to spec math.
3. Keep the planner explanation layer explicit about what is rules core versus planner-only versus Story Mode-later modifiers.
