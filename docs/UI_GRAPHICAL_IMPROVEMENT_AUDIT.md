# Garden OS UI + Graphics Improvement Audit

Date: 2026-03-15  
Scope: `garden-league-simulator-v2.html` and `garden-league-simulator-v3.html` shell  
Purpose: identify high-leverage UI/art-direction upgrades that can proceed in parallel with active spec-generation agents.

## Snapshot
- v2 has strong mechanical readability and decent visual hierarchy for a prototype.
- v2 misses several art-direction identity goals (typed character integration, seasonal visual language, gritty place cues, premium typography system).
- v3 scaffold is a good structural start because it introduces season tokens and stronger type families, but it still needs component-level identity and data-state visuals.

## What Is Already Working
| Area | Evidence | Why it helps |
|---|---|---|
| 3-rail information architecture | `controls / board / results` layout in [garden-league-simulator-v2.html:53](../garden-league-simulator-v2.html#L53) | Keeps strategy loop legible and scan-friendly. |
| Board feedback states | Cell status classes (`hard/warn/good`) in [garden-league-simulator-v2.html:384](../garden-league-simulator-v2.html#L384) | Immediate tactical read on fit quality. |
| Motion restraint | Light animations only (`pop-in`, score ring) in [garden-league-simulator-v2.html:610](../garden-league-simulator-v2.html#L610) | Avoids arcade noise and keeps tone grounded. |
| Accessibility foundations | Keyboard grid nav + modal trap in [garden-league-simulator-v2.html:1563](../garden-league-simulator-v2.html#L1563), [garden-league-simulator-v2.html:1879](../garden-league-simulator-v2.html#L1879) | Good base for premium polish without regressions. |
| v3 tokenized styling | season/type/elevation variables in [garden-league-simulator-v3.html:13](../garden-league-simulator-v3.html#L13) | Makes art-direction iteration safer and faster. |

## Highest-Impact Gaps (Ordered)
| Severity | Gap | Evidence | Effect |
|---|---|---|---|
| High | Typography does not match target voice in v2 | Body uses Trebuchet/system stack in [garden-league-simulator-v2.html:32](../garden-league-simulator-v2.html#L32) | Reads like utility software, not authored indie strategy. |
| High | Zone semantics are too subtle and text-dependent | Trellis/access rely on tiny `T`/`A` markers in [garden-league-simulator-v2.html:346](../garden-league-simulator-v2.html#L346) | New players miss board constraints and blame scoring. |
| High | Character layer is text-only | Narration is plain copy block in [garden-league-simulator-v2.html:881](../garden-league-simulator-v2.html#L881) | Loses signature cast presence and market identity. |
| High | Seasonal color logic is static in v2 | Single root palette in [garden-league-simulator-v2.html:8](../garden-league-simulator-v2.html#L8) | No lived seasonal shift, weaker campaign arc feeling. |
| Medium | Mobile board overflow is functional but not guided | Horizontal overflow hack at [garden-league-simulator-v2.html:749](../garden-league-simulator-v2.html#L749) | Feels cramped and unfinished on small screens. |
| Medium | Event affordance looks like generic log feed | `event-log` style in [garden-league-simulator-v2.html:564](../garden-league-simulator-v2.html#L564) | Events feel administrative, not authored beats. |
| Medium | Background lacks Philly-place specificity | Generic radial pattern in [garden-league-simulator-v2.html:35](../garden-league-simulator-v2.html#L35) | Loses “South Philly backyard” signature at first glance. |
| Low | v3 shell has strong tokens but weak component semantics | Placeholder sections in [garden-league-simulator-v3.html:290](../garden-league-simulator-v3.html#L290) | Needs component contract alignment before engine integration. |

## Recommended Improvements

### Phase A: Fast Wins (same day, low risk)
1. Port v3 font stack into v2 now: display/body/mono tokens from [garden-league-simulator-v3.html:14](../garden-league-simulator-v3.html#L14) and replace v2 hardcoded families.
2. Upgrade zone readability: add persistent left-edge row bands and corner badges for trellis/access (not just `T`/`A` glyphs).
3. Add “scroll hint” chip for mobile board overflow when viewport is `<600px`.
4. Convert event log container to card-list style with category chips (`Weather`, `Critter`, `Neighbor`, `Household`) for faster parsing.

### Phase B: Identity Layer (1-2 days)
1. Implement season theme switching in v2 using `data-season` variables (already scaffolded in v3 at [garden-league-simulator-v3.html:70](../garden-league-simulator-v3.html#L70)).
2. Add character portrait strip with deterministic slots for Garden GURL / Onion Man / Vegeman reactions.
3. Restyle challenge/event surfaces as printed card artifacts (paper edge, halftone tint, stamp labels).
4. Separate “analysis” and “flavor” panels so data density and voice lines do not compete.

### Phase C: Premium Pass (2-4 days)
1. Introduce backyard context layer: subtle brick/fence/alley silhouettes behind board stage.
2. Add chapter-specific accent color token so each chapter screenshot has unique identity.
3. Add scored recap card layout optimized for sharing (`best row`, `weakest cell`, `save of the season`, `chapter target`).
4. Build screenshot template rules: one character, one board state overlay, one city context cue in every marketing capture.

## v3 Scaffold Readiness (for Prompt 8)
| Ready | Needs next |
|---|---|
| Google fonts + tokenized typography | Replace placeholder rails with engine-bound components (`crop selector`, `phase timeline`, `event card`, `review panel`) |
| Season-based color variables | Data-driven season switch and chapter accent mapping |
| 8x4 board shell with trellis/access visual split | Live cell states (`selected`, `locked`, `stressed`, `protected`, `mulched`) |
| Modal scaffold container | Commit confirmation + intervention/event modal variants |

## Suggested Parallel Execution Order
1. Do typography + zone-readability patch first (highest clarity gain, minimal logic risk).
2. Do season token switch + event card style second (largest art-direction gain).
3. Do character portrait strip third (brand signature + trailer value).
4. Leave deeper background polish for after Prompt 8 contracts stabilize.
