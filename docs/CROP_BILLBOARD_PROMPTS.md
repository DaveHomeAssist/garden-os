# Garden OS — Crop Billboard Sprite Prompts

**Purpose:** Replace existing crop icons and growth sheets that have opaque card
backgrounds baked into the PNGs. The current assets render as dark rectangles
when used as billboard sprites over the 3D bed.

**Problem:** Existing `crop-*.png` and `grow-*.png` files were generated with
"dark rich brown rounded-square card background" in the prompt. This worked for
UI cards but breaks when composited as transparent billboards in the Three.js
scene.

**Fix:** Re-generate as grid sheets that match available generator aspect ratios
(3:2 or 16:9). Fully transparent backgrounds — plant and soil mound only, no
card, no backing, no text labels.

Target runtime folder:
`story-mode/assets/textures/`

Generator aspect ratios available: **3:2** and **16:9**

Style target:
- stylized 3D plant, same art quality as existing crop icons
- small dark soil mound at the base of the plant (anchors to the bed visually)
- fully transparent background — NO card, NO backing panel, NO rounded rectangle
- NO text labels (the existing growth sheets have "SEED" / "SPROUT" etc. baked in)
- warm overhead light, soft cel-shading
- clean readable silhouette — must read at ~32px display size on the bed
- top-down with slight 10-degree overhead tilt

Reference (what to match, minus the card):
- `story-mode/assets/textures/crop-lettuce.png` — plant style and quality
- `story-mode/assets/textures/grow-lettuce.png` — growth stage progression

---

## Option 1 — crop-sheet.png (3x2 grid, 3:2 aspect)

**All 6 crop icons in one generation.**
Loader key: `crop-sheet`
Target filename: `crop-sheet.png`
Layout: 3 columns x 2 rows
Aspect ratio: **3:2**

```text
Sprite sheet grid of 6 stylized 3D crop plants arranged in a 3-column by
2-row grid, each cell contains one plant on a small dark soil mound, slight
10-degree overhead tilt, all from same camera angle and lighting, fully
transparent background — no cards, no backing panels, no frames:

row 1 left: leaf lettuce — ruffled bright lime-green leaves fanning outward;
row 1 centre: spinach — deep forest green oval leaves on short stems;
row 1 right: arugula — jagged deeply lobed medium green spiky leaves;
row 2 left: radish — magenta-red round root with green leafy tops above;
row 2 centre: basil — compact glossy bright green bushy mound;
row 2 right: marigold — vibrant orange-yellow pompom bloom with feathery
dark green leaves;

each plant on its own small dark soil mound, equal cell spacing across the
grid, consistent warm overhead lighting, soft cel-shading, clean readable
silhouettes, fully transparent background around each plant, no frames, no
cards, no labels, no text, 3:2 aspect ratio, high-resolution PNG with
alpha channel
```

**sprite-loader update:**
```js
'crop-sheet': { file: 'crop-sheet.png', w: 1536, h: 1024, cols: 3, rows: 2 },
```

**Index mapping:**
| Index | Col | Row | Crop |
|-------|-----|-----|------|
| 0 | 0 | 0 | Lettuce |
| 1 | 1 | 0 | Spinach |
| 2 | 2 | 0 | Arugula |
| 3 | 0 | 1 | Radish |
| 4 | 1 | 1 | Basil |
| 5 | 2 | 1 | Marigold |

---

## Option 2 — grow-master.png (6x4 grid, 3:2 aspect)

**All 6 crops x 4 growth stages in one generation.**
Loader key: `grow-master`
Target filename: `grow-master.png`
Layout: 6 columns (one per crop) x 4 rows (SEED → SPROUT → GROWING → HARVEST)
Aspect ratio: **3:2**

```text
Sprite sheet grid of crop growth stages arranged in a 6-column by 4-row
grid, each cell contains one plant at one growth stage on a small dark soil
mound, slight 10-degree overhead tilt, fully transparent background — no
cards, no backing panels, no frames, no text labels:

columns left to right: lettuce, spinach, arugula, radish, basil, marigold

row 1 SEED — each cell shows only a small bare dark soil mound with a tiny
seed dimple barely visible, minimal and subtle;

row 2 SPROUT — each cell shows two tiny bright green cotyledon leaves just
emerging from the soil mound, delicate and small, same for all crops at
this stage;

row 3 GROWING — each cell shows the crop at half size, recognisable but
not fully grown:
lettuce: loose rosette of small ruffled green leaves;
spinach: 4-5 oval leaves on stems;
arugula: small jagged lobed leaves, spiky but delicate;
radish: green serrated tops visible, no root yet;
basil: 3-4 leaf pairs on short stem;
marigold: green stem with feathery leaves and tight bud;

row 4 HARVEST — each cell shows the crop at full maturity with slight warm
glow suggesting readiness:
lettuce: full head, leaves fanning wide;
spinach: dense cluster of full deep green oval leaves;
arugula: full spiky rosette radiating outward;
radish: magenta-red root breaking soil, full green tops;
basil: compact full bushy mound of glossy green leaves;
marigold: full orange-yellow pompom bloom open;

all plants on small dark soil mounds, equal cell spacing, consistent warm
overhead lighting across entire grid, soft cel-shading, clean readable
silhouettes, fully transparent background, no cards, no frames, no labels,
no text, 3:2 aspect ratio, high-resolution PNG with alpha channel
```

**sprite-loader update:**
```js
'grow-master': { file: 'grow-master.png', w: 3072, h: 2048, cols: 6, rows: 4 },
```

**Index mapping:**
| Stage \ Crop | Col 0: Lettuce | Col 1: Spinach | Col 2: Arugula | Col 3: Radish | Col 4: Basil | Col 5: Marigold |
|---|---|---|---|---|---|---|
| Row 0: SEED | 0 | 1 | 2 | 3 | 4 | 5 |
| Row 1: SPROUT | 6 | 7 | 8 | 9 | 10 | 11 |
| Row 2: GROWING | 12 | 13 | 14 | 15 | 16 | 17 |
| Row 3: HARVEST | 18 | 19 | 20 | 21 | 22 | 23 |

**Lookup helper:**
```js
const CROP_COL = { lettuce: 0, spinach: 1, arugula: 2, radish: 3, basil: 4, marigold: 5 };
const STAGE_ROW = { seed: 0, sprout: 1, growing: 2, harvest: 3 };

function getGrowthFrame(cropId, stage) {
  return STAGE_ROW[stage] * 6 + CROP_COL[cropId];
}
```

---

## Notes

- **Generator ratios:** Both sheets target 3:2, which matches the user's
  available generation options. If 16:9 works better for the growth master,
  a 6x3 layout (omitting the SEED row, which is just soil) could work at
  roughly 16:9 — but 4 rows at 3:2 is preferred for completeness.
- The existing card-backed versions can be kept for UI contexts (inventory
  icons, crop palette, backpack slots) where an opaque card background is
  appropriate. The transparent versions are specifically for in-world
  billboard rendering.
- If the generator produces any background artifacts (gradient halos, faint
  rectangles), add `alphaTest: 0.05` to the SpriteMaterial to clip them.
- Consider naming the transparent variants with a `-t` suffix
  (e.g. `crop-sheet-t.png`) during transition so both versions coexist.
  Once verified in-scene, the transparent versions become the default and
  the old card-backed versions move to a `ui/` subdirectory.
