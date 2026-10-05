# Crop Art Prompt Pack (Draft)

Status: COMPLETE 2026-10-05, all 40 textures delivered in four Grok batches (prompt rules locked 2026-10-04). Covers the 40 spec crops with no `story-mode/assets/textures/crop-<id>.png`.
Goal: match the 12 existing photo cutout textures so new crops sit beside them without a style break.

Reference set (use as style anchors): `crop-arugula.png`, `crop-basil.png`, `crop-carrot.png`, `crop-cherry_tom.png`, `crop-radish.png`, `crop-marigold.png`.

---

## 1. Design System (derived from existing assets)

| Attribute | Rule |
|---|---|
| Subject | ONE plant (or one cluster for mushroom), whole specimen, cleanly cropped at the base. Climbers are a short upright vine with a visible base, not a floating segment. No stake, trellis, or support. |
| Pose | Centered, slight 3/4 front view, upright growth habit. Subject fills about 80 to 85 percent of frame height. |
| Scale | Normalize visual weight in the frame, not botanical size. A kale and a radish occupy the same frame share. Do not depict real world scale. |
| Read | Identity must survive at 64x64. Silhouette plus one color mass carry the crop. Fine leaf detail is secondary. |
| Roots | Show the edible root or bulb for root crops (radish, carrot style). Leafy and fruiting crops end at a short clean stem. |
| Rendering | Photoreal, crisp detail, natural leaf veining, gentle specular on fruit. Not illustrated, not cartoon, not 3D render glossy. |
| Light | Soft natural daylight from upper left, mild fill. No hard cast shadow. |
| Color | Saturated but natural. Greens span yellow green to deep blue green. Fruit and flowers are the color accent. |
| Background | Pure flat white (#FFFFFF) at generation. Alpha cutout is done in post. Keep white so the fuzz command stays valid. Defringe in post. |
| Excluded | Pot, soil, ground, grass, hands, text, labels, watermarks, frames, props, stake, trellis, support pole, other plants, drop shadow, reflection |
| Canvas | Square. Generate at 1024x1024 or larger, downscale to 256x256 RGBA. |
| Margin | At least 6 percent empty margin on all sides so nothing clips at the cell edge. |
| Mood | Healthy, mid season, peak harvest ready. No wilt, pests, or damage. |

Faction mood is NOT encoded in color grading. Keep one global look so the bed reads as one garden.

---

## 2. Master Prompt Template

Assemble each prompt as `PREFIX + SUBJECT + SUFFIX`.

**PREFIX**

```
Photorealistic botanical cutout photograph of a single
```

**SUBJECT** (per crop, section 4)

**SUFFIX**

```
, whole plant centered in frame, slight three-quarter front view, soft natural daylight from the upper left, crisp natural detail, saturated natural color, isolated on a pure flat white background, no shadow, no soil, no pot, no ground, no stake, no trellis, no text, no watermark, square composition, 6 percent margin around the plant, subject fills 80 to 85 percent of frame height, identity readable at 64 pixels from silhouette and one color mass
```

**NEGATIVE** (for tools that support it)

```
pot, soil, dirt, grass, hands, text, label, watermark, frame, border, drop shadow, reflection, cartoon, illustration, 3d render, painting, multiple plants, wilted, damaged, blurry, cropped, stake, trellis, support pole, vine segment, floating plant
```

### Consistency tactics

1. Attach 2 to 3 reference images (carrot, basil, cherry_tom) to every generation and say "match the lighting and rendering style of the reference images" if the tool supports image references.
2. Lock one seed per batch where the tool allows it. Vary only the SUBJECT.
3. Generate in batches by faction (section 5) so related crops share framing.
4. Generate 4 candidates per crop, pick the one closest to the reference set.
5. Run batch 1 as the style lock. Do not generate batches 2 through 7 until those five sit beside carrot and basil.

---

## 3. Post-Processing Pipeline

1. Remove white background to alpha (rembg, Photoshop Select Subject, or `magick -fuzz 8% -transparent white` then manual cleanup of fringing).
2. Defringe: erode alpha 1px, remove white halo on leaf edges.
3. Trim to bounds, re-center on a square canvas with 6 percent margin.
4. Downscale to 256x256 RGBA PNG (Lanczos).
5. Save as `story-mode/assets/textures/crop-<id>.png`. The id must match the key in `specs/CROP_SCORING_DATA.json` exactly.
6. Verify in story-mode (`npm run dev` in `story-mode/`) that the sprite-loader picks it up with no fallback to `crop-sheet`.

### QA checklist per image

- [ ] Single subject, upright, centered, visible base
- [ ] No pot, soil, shadow, text, stake, or trellis
- [ ] Clean alpha, no white halo
- [ ] Same visual weight as neighbors (frame share matched, not botanical scale)
- [ ] Recognizable at 64x64 (silhouette and one color mass carry the identity)
- [ ] Filename matches spec id

---

## 4. Per-Crop SUBJECT Lines (40)

Each line drops into the template as the SUBJECT.

### Climbers (4)
| id | SUBJECT |
|---|---|
| beit_cucumber | short upright Beit Alpha cucumber plant with a visible base, two pale green smooth slender slightly curved cucumbers as the color mass, broad lobed leaves, one curling tendril, one small yellow flower, no stake |
| slicing_cucumber | short upright slicing cucumber plant with a visible base, two long dark green glossy cucumbers as the color mass, large rough lobed leaves, one curling tendril, one yellow flower, no stake |
| pole_beans | short upright pole bean plant with a visible base, heart shaped trifoliate leaves, a hanging cluster of slender green bean pods as the color mass, one small white flower, vine twining on itself, no stake and no support |
| vanilla_orchid | short upright vanilla orchid with a visible base, thick fleshy dark green oval leaves, one pale yellow green orchid flower, two thick green vanilla pods as the color mass, no stake |

### Fruiting (8)
| id | SUBJECT |
|---|---|
| bush_cucumber | compact bush pickle cucumber plant with a visible base, three small stout bumpy green pickling cucumbers as the color mass, serrated lobed leaves, one yellow flower |
| pepper | sweet bell pepper plant with blocky lobed red and green bell peppers as the color mass, distinct from round tomatoes, lance shaped dark green leaves, short stem |
| compact_tomato | compact determinate tomato plant, bushy, with a cluster of four round ripe red slicing tomatoes as the color mass, jagged compound green leaves, short stem |
| eggplant | eggplant plant with two glossy deep purple oblong fruits as the color mass, broad lobed gray green leaves, purple flushed stem, green calyx on each fruit |
| zucchini | zucchini plant with two glossy dark green speckled zucchini fruits as the color mass, one with a yellow blossom attached, large spiky edged mottled leaves on thick stems |
| woodland_strawberry | woodland strawberry plant with small trifoliate serrated leaves, one white five petal flower, several tiny bright red strawberries as the color mass |
| lemon_tree | compact dwarf lemon tree with a short woody trunk base, glossy dark green oval leaves, a few white blossoms, four bright yellow lemons as the color mass |
| ghost_pepper | ghost pepper plant with wrinkled tapered orange red pods as the color mass, pointed dark green leaves, one small white flower |

### Leafy fast cycles (2)
| id | SUBJECT |
|---|---|
| head_lettuce | head of butterhead lettuce, tight rosette of soft ruffled bright green leaves forming a loose round head, pale yellow green heart as the color mass, cut base |
| red_lettuce | red leaf lettuce, loose rosette of frilly ruffled leaves in burgundy red fading to green at the base, burgundy mass as the color mass, cut base |

### Greens (7)
| id | SUBJECT |
|---|---|
| kale | curly kale plant, upright rosette of deeply ruffled blue green leaves on thick pale stems, blue green mass as the color mass |
| chard | Swiss chard plant with glossy crinkled dark green leaves and thick bright red pink stems as the color mass |
| bok_choy | bok choy, white green crisp thick spoon shaped stalks as the color mass, smooth dark green leaf blades, compact vase shape, cut base |
| mustard_greens | mustard greens plant, frilly serrated bright green leaves with pale midribs, loose upright rosette, bright green mass as the color mass |
| tatsoi | tatsoi, flat low rosette of dark green spoon shaped glossy leaves with white petioles as the color mass, viewed slightly from above |
| mizuna | mizuna, dense clump of bright green leaves on thin white stems, white stem fan as the color mass, leaves readable as a mass not as lace |
| watercress | watercress bunch with small round glossy dark green leaves as the color mass, hollow stems, a few tiny white flowers, short rooting base |

### Roots (7)
| id | SUBJECT |
|---|---|
| scallion | bunch of three scallions, slender hollow dark green tops tapering from white shafts, white shafts as the color mass, small white roots at the base |
| beet | beet plant with a round deep crimson root bulb as the color mass, fine taproot, dark green leaves with red veins and red stems |
| turnip | turnip plant with a round white bulb with purple flushed shoulders as the color mass, slender taproot, green rough textured leaves |
| garlic | garlic plant with a white papery bulb as the color mass, a few small roots, a flat green stem and long flat blades above |
| prairie_onion | prairie onion plant, small pale purple white bulb with fine roots as the color mass, slender grass like green leaves, no flower head |
| wild_rice | wild rice plant with a visible base, long arching blade leaves, one drooping seed panicle of green and brown grains as the color mass |
| shiitake_mushroom | cluster of three shiitake mushrooms with broad tan brown domed caps as the color mass, pale flecks, cream gills, short stout stems, no log |

### Herbs (6)
| id | SUBJECT |
|---|---|
| cilantro | cilantro plant with a bright green leaf mass as the color mass, leaves readable as a clump not as lace, thin pale green stems |
| parsley | flat leaf parsley plant, rosette of glossy dark green divided leaves as the color mass, long stems |
| dill | dill plant with a yellow umbel flower head as the color mass, blue green foliage kept as a simple mass, slender stem |
| chives | chive clump, dense upright tubular dark green blades, two round lavender pink pom pom flowers as the color mass |
| meadow_sage | meadow sage plant, upright stems with wrinkled gray green oval leaves and spikes of violet blue flowers as the color mass |
| wild_garlic | wild garlic (ramsons) plant with broad lance shaped bright green leaves as the color mass, one round white flower umbel, small white bulb base |

### Brassicas (3)
| id | SUBJECT |
|---|---|
| compact_cabbage | small compact green cabbage head with tightly wrapped pale green inner leaves and a few veined blue green outer wrapper leaves, round pale head as the color mass |
| broccoli | broccoli plant with one dense dark green crown of tight buds as the color mass, thick pale green stalk, large veined blue green leaves |
| kohlrabi | kohlrabi with a round pale green swollen stem bulb as the color mass and several slender stalks bearing blue green leaves radiating from the top |

### Companions (3)
| id | SUBJECT |
|---|---|
| nasturtium | nasturtium plant with round lily pad shaped bright green leaves and several orange red trumpet flowers as the color mass |
| wild_clover | wild clover plant with trifoliate leaves bearing pale chevron markings and two round pink white flower heads as the color mass |
| marsh_marigold | marsh marigold plant with glossy round kidney shaped dark green leaves and several bright buttercup yellow flowers as the color mass |

(The grouped counts above follow the spec `faction` field; ids are the canonical keys.)

---

## 5. Suggested Batch Order

Prioritized by how often a crop appears in default beds and recipes, then by faction so framing stays consistent.
Batch 1 is the style lock. Stop after batch 1 and compare to `crop-carrot.png` and `crop-basil.png` before continuing.

1. Fruiting staples: `compact_tomato`, `pepper`, `slicing_cucumber`, `zucchini`, `eggplant`
2. Greens: `kale`, `chard`, `head_lettuce`, `red_lettuce`, `bok_choy`
3. Roots: `beet`, `garlic`, `scallion`, `turnip`
4. Herbs: `parsley`, `cilantro`, `dill`, `chives`
5. Brassicas and remaining climbers: `broccoli`, `compact_cabbage`, `kohlrabi`, `pole_beans`, `beit_cucumber`, `bush_cucumber`
6. Companions and specials: `nasturtium`, `mizuna`, `tatsoi`, `mustard_greens`
7. Exotic and wild set (lowest frequency): `ghost_pepper`, `lemon_tree`, `vanilla_orchid`, `wild_rice`, `shiitake_mushroom`, `watercress`, `wild_clover`, `wild_garlic`, `woodland_strawberry`, `prairie_onion`, `meadow_sage`, `marsh_marigold`

---

## 6. Decisions

1. Generator is not locked. First run is batch 1 only, 4 candidates per crop, then a style check.
2. Delivery stays per file `crop-<id>.png` at 256x256 RGBA. Sheet packing is out of scope. `sprite-loader.js` resolves `crop-<id>` first.
3. Wild and exotic crops stay whole specimens with a visible base. No floating branch and no vine segment.
4. Cucumber split at 64px: Beit Alpha pale and slender, slicing dark and long, bush pickle short and bumpy.
5. Pepper must read as blocky lobes, not round fruit, so it does not collide with `compact_tomato`.
