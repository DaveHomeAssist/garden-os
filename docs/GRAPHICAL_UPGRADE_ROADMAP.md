# Garden OS Graphical Upgrade Roadmap

Status: Active execution plan
Last verified: 2026-07-03
Scope: `story-mode/` visual system, screenshot proof, and later asset wiring

## Visual Thesis

Garden OS should read as a South Philly garden journal produced through small press print language. The target is Zine Press first, with almanac structure for UI and observed backyard detail for place.

The core move is physical print: paper fiber, ink line, limited seasonal plates, slight registration offset, and visible urban garden context. The game should not read as a generic cozy farm interface.

## Roadmap

| Phase | Goal | Work | Done When |
| --- | --- | --- | --- |
| 1 | Visual foundation | Lock typography, paper and ink surfaces, seasonal color tokens, UI texture rules | Story Mode reads like a printed garden journal |
| 2 | UI clarity pass | Upgrade event cards, dialogue panels, zone labels, HUD hierarchy, mobile board spacing | Mobile and desktop screens are legible without explanatory copy |
| 3 | Character identity | Add portrait and reaction system for Garden GURL, Onion Man, Vegeman, critters | Dialogue and events show visible cast identity with missing asset fallback |
| 4 | Hybrid crop rendering | Wire crop sprites and growth sheets into cosmetic billboard layers | Procedural grid remains gameplay truth, sprites add visual identity |
| 5 | Place and season | Add Philly backyard cues, seasonal palettes, weather and light variants | Screenshots clearly read the season at thumbnail scale |
| 6 | Game feel | Improve placement, invalid move, harvest, score reveal, event arrival, season transition | Actions feel tactile without becoming noisy |
| 7 | Screenshot readiness | Canonical screenshot set, trailer visual beats, asset budget checks | Live Pages can produce clean public screenshots |

## Priority

P0:
Typography tokens, paper surfaces, zone readability, event and dialogue card polish, desktop and mobile screenshot verification.

P1:
Character portrait strip, reaction states, and cast specific fallback treatment.

P2:
Crop accent layer using `story-mode/assets/textures/*`, with sprites cosmetic only.

P3:
Philly environment detail, seasonal texture variants, critters, recipe reward visuals.

P4:
Trailer polish and marketing screenshot templates.

## Phase 1 Gates

| Requirement | Evidence |
| --- | --- |
| Zine Press tokens exist in runtime CSS | `story-mode/assets/css/layout.css` and `story-mode/assets/css/theme.css` |
| Event cards read as printed artifacts | Event card surface uses category stamp, paper fiber, ink border, and valence accent |
| Dialogue panels read as field notes | Dialogue panel uses paper stock, portrait frame, speaker badge, and ink offset |
| Zone semantics are visible | `body[data-zone]`, `#phase-helper[data-zone]`, and zone accent tokens update from runtime state |
| Mobile and desktop visuals are checked | `tests/story-mode-screenshot-regression.mjs` captures both widths and checks canvas pixels |

## Phase 3 Character Identity Gates

| Requirement | Evidence |
| --- | --- |
| Core cast has one source of truth | `CORE_CAST_IDS` in `story-mode/src/data/speakers.js` |
| Dialogue shows active cast identity | `story-mode/src/ui/dialogue-panel.js` renders `.dp-cast-strip` and syncs active speaker/emotion |
| Missing portrait assets fail gracefully | CSS-only portraits use `data-asset-state="css-fallback"` instead of broken image layers |
| Garden GURL, Onion Man, Vegeman, and Critters have distinct silhouettes | `story-mode/assets/css/theme.css` Zine Press Sprint 2 character identity layer |
| Screenshot regression proves the strip | `tests/story-mode-screenshot-regression.mjs` checks active portrait, emotion, fallback state, and strip bounds |

## Phase 4 Hybrid Crop Gates

| Requirement | Evidence |
| --- | --- |
| Crop sprite art remains cosmetic | `story-mode/src/scene/garden-scene.js` keeps procedural crop meshes as gameplay truth and mounts sprite accents separately in `accentMeshes` |
| Growth sheets appear after async texture load | `loadSprites()` resyncs crop accents after sprite assets become ready |
| Story phases show crop identity accents | `tests/story-mode-screenshot-regression.mjs` seeds `MID_SEASON` crops and verifies growth billboard accents |
| Planner mode stays sprite-free | Planner keeps procedural crop meshes visible while `syncCropAccents()` suppresses sprite accents for planner style |
| Screenshot regression proves both sides | The screenshot harness captures `desktop-crop-accents.png` and `planner-procedural-no-accents.png` |

## Phase 5 Place And Season Gates

| Requirement | Evidence |
| --- | --- |
| Philly backyard cues are runtime-visible | `story-mode/src/scene/scenery.js` tags rowhouse siding, porch screen door, rain barrel, utility pole, alley strip, concrete walkway, and Phillies pennant as place cues |
| Seasonal layers are deterministic | `story-mode/src/scene/garden-scene.js` exposes `seasonalAtmosphere` debug state and uses deterministic grass tint variation |
| July has a distinct summer read | Summer enables butterflies plus porch string lights in the Story scene |
| March, July, October, and winter states are screenshot-proven | `tests/story-mode-screenshot-regression.mjs` captures `season-place-spring.png`, `season-place-summer.png`, `season-place-fall.png`, and `season-place-winter.png` |

## Asset Rule

Future portrait art should live under `story-mode/assets/textures/portraits/` and use:

```text
{speaker-id}-{emotion}.png
```

Examples: `garden_gurl-neutral.png`, `onion_man-sad.png`, `vegeman-smirk.png`, `critters-surprised.png`.

Until an asset exists, `portraits.js` should keep the speaker on the CSS fallback path. Do not add loose portrait files at the root of `story-mode/assets/textures/`.

Crop identity art should stay in the existing `story-mode/assets/textures/` crop family:

```text
crop-{crop-id}.png
grow-{crop-id}.png
```

Examples: `crop-lettuce.png`, `grow-lettuce.png`, `crop-radish.png`, `grow-radish.png`.

Use `grow-{crop-id}.png` for the four-stage cosmetic billboard layer. Procedural crop meshes remain the gameplay source of truth, and Planner mode should not display the sprite accents.

## Guardrails

Do not replace procedural board logic with sprites. Sprites remain cosmetic.

Do not show sprite accents in Planner mode.

Do not add asset sprawl without a storage and naming rule.

Do not drift toward pastel farm game styling. Muted urban grit plus earned crop saturation is the identity.

## Verification

Local:

```bash
node scripts/verify-all.mjs
```

Live after deploy:

```bash
node scripts/verify-all.mjs --live-only --live-url https://davehomeassist.github.io/garden-os/story-mode/
```
