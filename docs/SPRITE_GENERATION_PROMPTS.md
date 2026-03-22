# Garden OS — 3D Sprite Generation Prompts
**Engine:** Three.js / WebGL
**Style:** Stylised 3D, dark earthy, warm ambient, deep green grass, cedar wood
**Reference:** davehomeassist.github.io/garden-os
**All assets:** PNG with transparent background, 2x intended display size

---

## GENERATION ORDER

1. **Crop icon sheet (2G)** — establishes the visual language for all icons
2. **Raised bed empty (1A)** — establishes the scene scale and material language
3. **Individual crop icons (2A-2F)** — reference 2G for consistency
4. **Raised bed rain variant (1C)** — matches screenshot chapter 1 state
5. **Growth stage sheets** — one per crop after icons are locked
6. **Environment objects** — after scene language is established
7. **UI elements** — last, can be refined independently

## NAMING CONVENTION
```
bed-empty.png            1024x512
bed-grid.png             1024x512
bed-rain.png             1024x512
bed-cell.png             256x256
bed-seasons.png          2048x512
crop-sheet.png           1536x256
crop-lettuce.png         256x256
crop-spinach.png         256x256
crop-arugula.png         256x256
crop-radish.png          256x256
crop-basil.png           256x256
crop-marigold.png        256x256
grow-lettuce.png         1024x256
grow-spinach.png         1024x256
grow-arugula.png         1024x256
grow-radish.png          1024x256
grow-basil.png           1024x256
grow-marigold.png        1024x256
env-spigot.png           128x256
env-fence.png            256x512
env-path.png             512x512
env-grass.png            512x512
ui-badges.png            512x64
ui-month-card.png        320x96
ui-nav-pills.png         320x48
```

---

## 1. RAISED BED — 4 WIDE x 8 LONG

### 1A — Empty raised bed, isometric view
**The most critical asset. Get this right first.**
**Dimensions:** 1024x512 | **Filename:** `bed-empty.png`

```
Stylised 3D raised garden planter bed, 4 units wide by 8 units long, strongly
rectangular and low-profile, viewed from isometric camera angle approximately
35 degrees above and slightly to the left, dark weathered cedar wood planks
forming the outer frame walls, the frame is low — only about 12 inches tall,
interior filled with very dark rich moist soil, interior divided into a visible
4x8 grid by shallow wooden dividers flush with soil surface creating 32 planting
cells, each cell shows slightly different soil texture, stone and gravel path
running alongside the long edge of the bed on the left side, the bed is the
dominant subject occupying most of the frame, stylised 3D render, dark earthy
organic aesthetic, warm low ambient light from upper-left, soft cel-shading
with subtle ambient occlusion, rich dark soil tones, deep forest green,
weathered natural materials, cohesive with a premium mobile garden simulation
game, transparent background, no ground plane shadow, isolated subject only,
1024x512 --ar 2:1 --style raw --q 2
```

---

### 1B — Raised bed with planning grid (glowing)
**Use:** Planning phase overlay, same bed + highlighted grid
**Dimensions:** 1024x512 | **Filename:** `bed-grid.png`

```
Stylised 3D raised garden planter bed 4 wide by 8 long, isometric view 35
degrees, dark cedar wood frame, dark moist soil interior, 4x8 planting cell
grid glowing with soft pale green bioluminescent light projected onto the soil,
each of the 32 cells individually lit with a faint green hover-ready glow,
some cells brighter suggesting hover/selection state, the grid lines are slightly
raised translucent planes above the soil surface, planning phase UI feel,
warm ambient light plus green cell glow, stylised 3D render, dark earthy
organic aesthetic, warm low ambient light from upper-left, soft cel-shading
with subtle ambient occlusion, rich dark soil tones, deep forest green,
weathered natural materials, cohesive with a premium mobile garden simulation
game, transparent background, no ground plane shadow, isolated subject only,
1024x512 --ar 2:1 --style raw --q 2
```

---

### 1C — Raised bed in rain
**Use:** March / Chapter 1 scene state — matches the screenshot
**Dimensions:** 1024x512 | **Filename:** `bed-rain.png`

```
Stylised 3D raised garden planter bed 4 wide by 8 long, isometric view 35
degrees, dark weathered cedar frame, dark damp soil interior with 4x8 cell
grid dividers, fine diagonal rain streaks falling across the scene, wet sheen
on the cedar wood surfaces, small water droplets beading on the frame edges,
moody overcast cool lighting replacing the usual warm ambient, the stone path
beside the bed has darkened wet patches, early spring atmosphere, no plants
in the soil cells, stylised 3D render, dark earthy organic aesthetic,
soft cel-shading with subtle ambient occlusion, rich dark soil tones,
deep forest green, weathered natural materials, cohesive with a premium mobile
garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 1024x512 --ar 2:1 --style raw --q 2
```

---

### 1D — Individual planting cell (single tile)
**Use:** Tiling asset for the grid, one 1x1 planting cell close-up
**Dimensions:** 256x256 | **Filename:** `bed-cell.png`

```
Stylised 3D top-down view of a single raised garden bed planting cell, square
tile, dark rich moist soil surface with subtle pebble and texture variation,
shallow wooden divider walls visible on all four edges forming the cell boundary,
soil is dark near-black brown with warm undertones, slight depth visible inside
the cell, no plant, warm soft overhead light, stylised 3D render, dark earthy
organic aesthetic, warm low ambient light from upper-left, soft cel-shading
with subtle ambient occlusion, rich dark soil tones, deep forest green,
weathered natural materials, cohesive with a premium mobile garden simulation
game, transparent background, no ground plane shadow, isolated subject only,
256x256 --ar 1:1 --style raw --q 2
```

---

### 1E — Season state sprite sheet (4 panels)
**Use:** Bed appearance across spring / summer / autumn / winter
**Dimensions:** 2048x512 | **Filename:** `bed-seasons.png`

```
Four-panel horizontal sprite sheet of the same raised garden bed 4 wide by 8
long in isometric view, each panel a different season:
panel 1 SPRING — empty cells with tiny green seedling sprouts emerging in
several cells, light overcast sky;
panel 2 SUMMER — most cells filled with full lush plants at varying heights,
bright warm directional light;
panel 3 AUTUMN — mix of harvest-ready plants and harvested bare cells, warm
amber side light;
panel 4 WINTER — all cells bare soil, frost crystals on cedar frame, light
dusting of snow on dividers, cold grey light;
consistent isometric angle and bed proportions across all panels, dark cedar
frame throughout, stylised 3D render, dark earthy organic aesthetic, warm low
ambient light from upper-left, soft cel-shading with subtle ambient occlusion,
rich dark soil tones, deep forest green, weathered natural materials, cohesive
with a premium mobile garden simulation game, transparent background, no ground
plane shadow, isolated subject only, 2048x512 --ar 4:1 --style raw --q 2
```

---

## 2. CROP ICONS — 3D RENDERED

### 2G — Full crop icon sprite sheet (generate first)
**Use:** Master reference for all individual crop icons
**Dimensions:** 1536x256 | **Filename:** `crop-sheet.png`

```
Horizontal sprite sheet of 6 stylised 3D crop icons, each in its own 256x256
dark brown rounded-square card, slight 10-degree overhead tilt, all from same
camera angle and lighting, left to right:
1 leaf lettuce — ruffled bright lime-green leaves;
2 spinach — deep forest green oval leaves on stems;
3 arugula — jagged deeply lobed medium green leaves;
4 radish — magenta-red round root, green leafy tops;
5 basil — compact glossy bright green bush;
6 marigold — orange-yellow pompom bloom, feathery green leaves;
each plant in a small dark soil mound, consistent warm overhead lighting,
consistent dark brown card background, stylised 3D render, dark earthy organic
aesthetic, warm low ambient light from upper-left, soft cel-shading with subtle
ambient occlusion, rich dark soil tones, deep forest green, weathered natural
materials, cohesive with a premium mobile garden simulation game, transparent
background, no ground plane shadow, isolated subject only, 1536x256 sprite
sheet --ar 6:1 --style raw --q 2
```

---

### 2A — Leaf Lettuce
**Dimensions:** 256x256 | **Filename:** `crop-lettuce.png`

```
Stylised 3D crop plant icon of a leaf lettuce plant, slight 10-degree overhead
tilt showing plant depth, loosely ruffled bright lime-green leaves fanning
outward from centre, each leaf has visible veining and slight curl at edges,
fresh and lush full head of lettuce, plant growing from a small dark soil mound
at card centre, dark rich brown rounded-square card background matching premium
mobile game UI, warm soft overhead light with subtle rim highlight, clean
readable silhouette, no text, no label, no shadow outside card, stylised 3D
render, dark earthy organic aesthetic, warm low ambient light from upper-left,
soft cel-shading with subtle ambient occlusion, rich dark soil tones, deep
forest green, weathered natural materials, cohesive with a premium mobile
garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 256x256 --ar 1:1 --style raw --q 2
```

### 2B — Spinach
**Dimensions:** 256x256 | **Filename:** `crop-spinach.png`

```
Stylised 3D crop plant icon of a spinach plant, slight 10-degree overhead tilt
showing plant depth, cluster of deep forest green oval leaves on short red-green
stems radiating from centre, leaves have prominent veining, slightly crinkled
texture, plant growing from a small dark soil mound at card centre, dark rich
brown rounded-square card background matching premium mobile game UI, warm soft
overhead light with subtle rim highlight, clean readable silhouette, no text,
no label, no shadow outside card, stylised 3D render, dark earthy organic
aesthetic, warm low ambient light from upper-left, soft cel-shading with subtle
ambient occlusion, rich dark soil tones, deep forest green, weathered natural
materials, cohesive with a premium mobile garden simulation game, transparent
background, no ground plane shadow, isolated subject only, 256x256
--ar 1:1 --style raw --q 2
```

### 2C — Arugula
**Dimensions:** 256x256 | **Filename:** `crop-arugula.png`

```
Stylised 3D crop plant icon of an arugula plant, slight 10-degree overhead tilt
showing plant depth, medium green deeply lobed jagged oak-leaf shaped leaves,
spiky and wild leaf silhouette radiating from centre, slightly smaller and more
delicate than lettuce, plant growing from a small dark soil mound at card centre,
dark rich brown rounded-square card background matching premium mobile game UI,
warm soft overhead light with subtle rim highlight, clean readable silhouette,
no text, no label, no shadow outside card, stylised 3D render, dark earthy
organic aesthetic, warm low ambient light from upper-left, soft cel-shading
with subtle ambient occlusion, rich dark soil tones, deep forest green,
weathered natural materials, cohesive with a premium mobile garden simulation
game, transparent background, no ground plane shadow, isolated subject only,
256x256 --ar 1:1 --style raw --q 2
```

### 2D — Radish
**Dimensions:** 256x256 | **Filename:** `crop-radish.png`

```
Stylised 3D crop plant icon of a radish, slight 10-degree overhead tilt showing
plant depth, bold bright magenta-red round root visible partially above soil
surface, green leafy tops with serrated edges sprouting upward, strong colour
contrast between red root and green tops, plant growing from a small dark soil
mound at card centre, dark rich brown rounded-square card background matching
premium mobile game UI, warm soft overhead light with subtle rim highlight,
clean readable silhouette, no text, no label, no shadow outside card, stylised
3D render, dark earthy organic aesthetic, warm low ambient light from upper-left,
soft cel-shading with subtle ambient occlusion, rich dark soil tones, deep
forest green, weathered natural materials, cohesive with a premium mobile
garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 256x256 --ar 1:1 --style raw --q 2
```

### 2E — Basil
**Dimensions:** 256x256 | **Filename:** `crop-basil.png`

```
Stylised 3D crop plant icon of a fresh basil plant, slight 10-degree overhead
tilt showing plant depth, compact bushy mound of bright medium-green oval leaves,
leaves have slight glossy sheen suggesting essential oils, symmetrical rounded
bush shape, plant growing from a small dark soil mound at card centre, dark rich
brown rounded-square card background matching premium mobile game UI, warm soft
overhead light with subtle rim highlight, clean readable silhouette, no text,
no label, no shadow outside card, stylised 3D render, dark earthy organic
aesthetic, warm low ambient light from upper-left, soft cel-shading with subtle
ambient occlusion, rich dark soil tones, deep forest green, weathered natural
materials, cohesive with a premium mobile garden simulation game, transparent
background, no ground plane shadow, isolated subject only, 256x256
--ar 1:1 --style raw --q 2
```

### 2F — Marigold
**Dimensions:** 256x256 | **Filename:** `crop-marigold.png`

```
Stylised 3D crop plant icon of a marigold flower, slight 10-degree overhead
tilt showing plant depth, single vibrant orange-yellow pompom bloom at centre
surrounded by dark green deeply-cut feathery leaves, tight layered petals on
the flower head, strong warm colour against dark card, plant growing from a
small dark soil mound at card centre, dark rich brown rounded-square card
background matching premium mobile game UI, warm soft overhead light with subtle
rim highlight, clean readable silhouette, no text, no label, no shadow outside
card, stylised 3D render, dark earthy organic aesthetic, warm low ambient light
from upper-left, soft cel-shading with subtle ambient occlusion, rich dark soil
tones, deep forest green, weathered natural materials, cohesive with a premium
mobile garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 256x256 --ar 1:1 --style raw --q 2
```

---

## 3. GROWTH STAGES — Billboard Sprites (transparent background)

**Purpose:** 3D billboard overlays that float above procedural crop meshes in story mode.
**Critical:** These must have **fully transparent backgrounds** — NO card frame, NO rounded-rect border, NO dark panel. Just the isolated plant on a small soil mound with alpha=0 everywhere else.

**One 4-frame sprite sheet per crop type**
**Each frame 256x256, sheet is 1024x256**

### 3A — Leaf Lettuce growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-lettuce.png`

```
Horizontal 4-frame sprite sheet showing leaf lettuce growth stages on a
FULLY TRANSPARENT background. Each frame 256x256, slight 10-degree overhead
tilt, consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame, barely
visible seed dimple on top. No green growth. The soil mound is about 30% of
frame width, anchored in the bottom third.

Frame 2 SPROUT — two small pale-green rounded cotyledon leaves emerging from
the soil mound. Tiny stem barely visible. The sprout is about 20% of the
final plant height. Same soil mound position.

Frame 3 GROWING — a mid-sized rosette of 5-6 ruffled light green lettuce
leaves (#96cc5c to #6dbf4a), loosely open with visible vein detail and curled
edges. About 60% of final size. Recognisable as lettuce.

Frame 4 HARVEST — a full lush butter lettuce head, dense rosette of broad
ruffled bright lime-green leaves (#5aaa55). Subtle warm golden rim-light glow
around outer leaves signalling harvest readiness. About 2.5x the sprout size.

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

### 3B — Spinach growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-spinach.png`

```
Horizontal 4-frame sprite sheet showing spinach growth stages on a FULLY
TRANSPARENT background. Each frame 256x256, slight 10-degree overhead tilt,
consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame with
faint seed scatter. No visible plant.

Frame 2 SPROUT — two narrow elongated cotyledon leaves on a thin stem, darker
green than lettuce with a slight gloss. Small and delicate.

Frame 3 GROWING — a mid-sized cluster of 6-8 oval spinach leaves in a loose
rosette. Deep green (#3a7a4f) with prominent veins and slight glossy sheen.
Leaves point slightly upward. About 60% of final size.

Frame 4 HARVEST — a full bushy spinach plant with 12+ thick, healthy dark
green oval leaves (#2d6b3e) in a dense rosette. Lighter vein highlights.
Subtle warm rim glow on outermost leaves. About 2.5x the sprout size.

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

### 3C — Arugula growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-arugula.png`

```
Horizontal 4-frame sprite sheet showing arugula growth stages on a FULLY
TRANSPARENT background. Each frame 256x256, slight 10-degree overhead tilt,
consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame. No
visible plant.

Frame 2 SPROUT — two small simple rounded cotyledon leaves on a thin stem.
Bright green, delicate and tiny.

Frame 3 GROWING — a mid-sized arugula plant with 5-6 deeply lobed oak-leaf
shaped leaves (#6dbf6d). Elongated with pointed lobes, growing outward in a
loose rosette. About 60% of final size.

Frame 4 HARVEST — a full arugula rosette with 10+ mature deeply lobed leaves
splaying wide. Rich green with lighter new growth at centre. Subtle warm rim
glow. About 2.5x the sprout size.

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

### 3D — Radish growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-radish.png`

```
Horizontal 4-frame sprite sheet showing radish growth stages on a FULLY
TRANSPARENT background. Each frame 256x256, slight 10-degree overhead tilt,
consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame with a
faint dimple. No visible plant.

Frame 2 SPROUT — two small heart-shaped cotyledon leaves on a thin reddish-
tinged stem. Bright green with a hint of red at the stem base where the root
starts below soil.

Frame 3 GROWING — a mid-sized radish with 4-5 deeply lobed serrated leaves
fanning upward. The top of a pinkish-red radish bulb (#c47a8a) just visible
emerging from the soil. About 60% of final size.

Frame 4 HARVEST — a full radish with 6-8 mature lobed leaves and a plump
round cherry-red bulb (#cc3344) prominently visible above soil. Subtle warm
sheen and rim glow on the bulb. About 2x the sprout size (radishes stay
compact).

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

### 3E — Basil growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-basil.png`

```
Horizontal 4-frame sprite sheet showing basil growth stages on a FULLY
TRANSPARENT background. Each frame 256x256, slight 10-degree overhead tilt,
consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame. Tiny
depression where the seed was pressed in.

Frame 2 SPROUT — a single thin stem with two small rounded cotyledon leaves.
Bright green, delicate and upright. About 20% of final height.

Frame 3 GROWING — a mid-sized basil plant with 3-4 pairs of opposite leaves
on a central stem. Broad, slightly cupped, pointed tips. Bright medium green
(#7ab85e) with visible vein texture. Bushy shape forming. About 60% of final
size.

Frame 4 HARVEST — a full bushy basil plant with multiple stems and 8+ pairs
of large aromatic leaves. Rich bright green (#5aaa55 to #7ab85e), plump,
glossy, healthy. Classic rounded bush shape. Subtle warm rim glow. About 2.5x
the sprout size.

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

### 3F — Marigold growth stages
**Dimensions:** 1024x256 | **Filename:** `grow-marigold.png`

```
Horizontal 4-frame sprite sheet showing marigold growth stages on a FULLY
TRANSPARENT background. Each frame 256x256, slight 10-degree overhead tilt,
consistent warm overhead lighting from upper left. NO card frame, NO
rounded-rect border, NO dark background panel. Only the plant and a small
dark soil mound (#3a2a1a) are visible — everything else is transparent alpha.

Frame 1 SEED — a small mound of dark garden soil centred in the frame. A tiny
light-coloured seed visible on the surface.

Frame 2 SPROUT — a single thin stem with two narrow cotyledon leaves. Bright
green, very simple and small. About 20% of final height.

Frame 3 GROWING — a mid-sized marigold plant with feathery deeply divided
dark green leaves (#3d6b3a) on a branching stem. No flower yet — just bushy
green foliage with the characteristic ferny marigold texture. About 60% of
final size.

Frame 4 HARVEST — a full marigold with a prominent round dense pompom flower
head in rich orange-gold (#e8a020 to #cc7700). Layered petals in a classic
dome, dark green feathery foliage at the base. Warm golden glow rim light
emanating from the flower. About 2.5x the sprout size.

Stylised 3D render, painterly digital illustration, dark earthy organic
aesthetic, soft cel-shading with subtle ambient occlusion. Each plant centred
in its 256x256 frame. The ONLY visible pixels are the plant and its small
soil mound — the rest MUST be fully transparent PNG alpha.
1024x256 --ar 4:1 --style raw --q 2
```

---

## 4. ENVIRONMENT OBJECTS

### 4A — Green garden spigot / water tap
**The green object visible in screenshot behind the bed, left of centre**
**Dimensions:** 128x256 | **Filename:** `env-spigot.png`

```
Stylised 3D garden water spigot mounted on a short dark metal post, isometric
view matching 35-degree garden scene camera, the spigot head is a classic
curved garden tap shape painted in deep bottle green, metal post is dark
weathered iron emerging from the ground, slight patina on the green paint,
water droplets on the spigot head, the object is tall and thin — post about
knee height, stylised 3D render, dark earthy organic aesthetic, warm low
ambient light from upper-left, soft cel-shading with subtle ambient occlusion,
rich dark soil tones, deep forest green, weathered natural materials, cohesive
with a premium mobile garden simulation game, transparent background, no ground
plane shadow, isolated subject only, 128x256 --ar 1:2 --style raw --q 2
```

---

### 4B — Dark fence panel
**The near-black vertical fence panels in the background**
**Dimensions:** 256x512 | **Filename:** `env-fence.png`

```
Stylised 3D fence panel section, isometric view, 4 vertical wooden slat
planks close together, near-black very dark brown wood, slight warm undertone
in the dark grain, planks are tall relative to width, slight weathering on
wood surface, connected by two horizontal rails, stylised 3D render, dark
earthy organic aesthetic, warm low ambient light from upper-left, soft
cel-shading with subtle ambient occlusion, rich dark soil tones, deep forest
green, weathered natural materials, cohesive with a premium mobile garden
simulation game, transparent background, no ground plane shadow, isolated
subject only, 256x512 --ar 1:2 --style raw --q 2
```

---

### 4C — Stone path tile (seamless)
**Tiling ground asset beside the bed**
**Dimensions:** 512x512 | **Filename:** `env-path.png`

```
Top-down seamlessly tileable stone path tile, light warm grey-beige irregular
flagstones, natural random shapes fitted together, narrow dark soil gaps between
stones, slight mossy patches in gaps, warm neutral tone, depth variation between
stones, cohesive with dark earthy garden game, stylised 3D render, dark earthy
organic aesthetic, warm low ambient light from upper-left, soft cel-shading
with subtle ambient occlusion, rich dark soil tones, deep forest green,
weathered natural materials, cohesive with a premium mobile garden simulation
game, 512x512 tileable, no vignette --ar 1:1 --style raw --q 2
```

---

### 4D — Grass ground tile (seamless)
**Main ground plane**
**Dimensions:** 512x512 | **Filename:** `env-grass.png`

```
Top-down seamlessly tileable grass texture, deep rich forest green short
grass, healthy dense growth, subtle blade direction variation, slight
3D depth from blade volume, warm ambient light, no bare patches, dark
earthy garden game aesthetic, stylised 3D render, dark earthy organic
aesthetic, warm low ambient light from upper-left, soft cel-shading with
subtle ambient occlusion, rich dark soil tones, deep forest green, weathered
natural materials, cohesive with a premium mobile garden simulation game,
512x512 tileable texture, no vignette --ar 1:1 --style raw --q 2
```

---

## 5. UI ELEMENTS

### 5A — Category badge set
**FAST / GREENS / HERB / COMPANION — the pill badges on crop cards**
**Dimensions:** 512x64 | **Filename:** `ui-badges.png`

```
Four small pill-shaped 3D game UI badges, each with rounded ends, slightly
raised and embossed appearance, dark background:
FAST — bright green border and text;
GREENS — forest green border and text;
HERB — sage olive-green border and text;
COMPANION — warm amber-gold border and text;
each badge has subtle inner shadow suggesting depth, premium mobile game UI,
horizontal row, stylised 3D render, dark earthy organic aesthetic, warm low
ambient light from upper-left, soft cel-shading with subtle ambient occlusion,
rich dark soil tones, deep forest green, weathered natural materials, cohesive
with a premium mobile garden simulation game, transparent background, no ground
plane shadow, isolated subject only, 512x64 --ar 8:1 --style raw --q 2
```

---

### 5B — Month/season card
**The "March / Year 1 / Planning Phase" card in the screenshot**
**Dimensions:** 320x96 | **Filename:** `ui-month-card.png`

```
Stylised 3D game UI card, dark semi-transparent brown background with rounded
corners, slight depth as if floating above scene, left side has a small bright
green seedling sprout icon, large bold white serif "March" text, smaller muted
"Year 1" below, three horizontal progress bar segments below that — first
segment filled warm gold, remaining two dim grey, "PLANNING PHASE" in small
monospaced caps at bottom, warm card glow, premium mobile garden game aesthetic,
stylised 3D render, dark earthy organic aesthetic, warm low ambient light from
upper-left, soft cel-shading with subtle ambient occlusion, rich dark soil
tones, deep forest green, weathered natural materials, cohesive with a premium
mobile garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 320x96 --ar 10:3 --style raw --q 2
```

---

### 5C — Chapter + phase navigation pills
**Dimensions:** 320x48 | **Filename:** `ui-nav-pills.png`

```
Two pill-shaped 3D UI navigation badges, left pill: "CHAPTER 1" dark brown
background light text; right pill: "PLANNING" warm amber-green accent,
slightly brighter and warmer than the chapter pill, both slightly raised
with subtle emboss, premium mobile game HUD aesthetic, horizontal pair,
stylised 3D render, dark earthy organic aesthetic, warm low ambient light from
upper-left, soft cel-shading with subtle ambient occlusion, rich dark soil
tones, deep forest green, weathered natural materials, cohesive with a premium
mobile garden simulation game, transparent background, no ground plane shadow,
isolated subject only, 320x48 --ar 7:1 --style raw --q 2
```
