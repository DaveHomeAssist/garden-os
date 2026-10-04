# Crop Art Prompt Pack (Draft)

Status: DRAFT. Covers the 40 spec crops with no `story-mode/assets/textures/crop-<id>.png`.
Goal: match the 12 existing photo-cutout textures so new crops sit beside them without a style break.

Reference set (use as style anchors): `crop-arugula.png`, `crop-basil.png`, `crop-carrot.png`, `crop-cherry_tom.png`, `crop-radish.png`, `crop-marigold.png`.

---

## 1. Design System (derived from existing assets)

| Attribute | Rule |
|---|---|
| Subject | ONE plant (or one cluster for mushroom), whole specimen, cleanly cropped at the base |
| Pose | Centered, slight 3/4 front view, upright growth habit, fills ~80-85% of frame height |
| Roots | Show the edible root/bulb for root crops (radish, carrot style). Leafy and fruiting crops end at a short clean stem |
| Rendering | Photoreal, crisp detail, natural leaf veining, gentle specular on fruit. Not illustrated, not cartoon, not 3D-render glossy |
| Light | Soft natural daylight from upper left, mild fill. No hard cast shadow |
| Color | Saturated but natural. Greens span yellow-green to deep blue-green. Fruit and flowers are the color accent |
| Background | Pure flat white (#FFFFFF) at generation. Alpha cutout is done in post |
| Excluded | Pot, soil, ground, grass, hands, text, labels, watermarks, frames, props, other plants, drop shadow, reflection |
| Canvas | Square. Generate at 1024x1024 or larger, downscale to 256x256 RGBA |
| Margin | At least 6% empty margin on all sides so nothing clips at the cell edge |
| Mood | Healthy, mid-season, peak-harvest-ready. No wilt, pests, or damage |

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
, whole plant centered in frame, slight three-quarter front view, soft natural daylight from the upper left, crisp natural detail, saturated natural color, isolated on a pure flat white background, no shadow, no soil, no pot, no ground, no text, no watermark, square composition, 6 percent margin around the plant
```

**NEGATIVE** (for tools that support it)

```
pot, soil, dirt, grass, hands, text, label, watermark, frame, border, drop shadow, reflection, cartoon, illustration, 3d render, painting, multiple plants, wilted, damaged, blurry, cropped
```

### Consistency tactics

1. Attach 2-3 reference images (carrot, basil, cherry_tom) to every generation and say "match the lighting and rendering style of the reference images" if the tool supports image references.
2. Lock one seed per batch where the tool allows it. Vary only the SUBJECT.
3. Generate in batches by faction (section 5) so related crops share framing.
4. Generate 4 candidates per crop, pick the one closest to the reference set.

---

## 3. Post-Processing Pipeline

1. Remove white background to alpha (rembg, Photoshop Select Subject, or `magick -fuzz 8% -transparent white` then manual cleanup of fringing).
2. Defringe: erode alpha 1px, remove white halo on leaf edges.
3. Trim to bounds, re-center on a square canvas with 6% margin.
4. Downscale to 256x256 RGBA PNG (Lanczos).
5. Save as `story-mode/assets/textures/crop-<id>.png`. The id must match the key in `specs/CROP_SCORING_DATA.json` exactly.
6. Verify in story-mode (`npm run dev` in `story-mode/`) that the sprite-loader picks it up with no fallback to `crop-sheet`.

### QA checklist per image

- [ ] Single subject, upright, centered
- [ ] No pot, soil, shadow, text
- [ ] Clean alpha, no white halo
- [ ] Scale reads similar to neighbors (a kale plant is not smaller than a radish)
- [ ] Recognizable at 64x64 (silhouette and color carry the identity)
- [ ] Filename matches spec id

---

## 4. Per-Crop SUBJECT Lines (40)

Each line drops into the template as the SUBJECT.

### Climbers (4)
| id | SUBJECT |
|---|---|
| beit_cucumber | Beit Alpha cucumber vine segment with two pale green, smooth, slender slightly curved cucumbers hanging, broad lobed leaves, a curling tendril and one small yellow flower |
| slicing_cucumber | slicing cucumber vine segment with two long dark green glossy cucumbers hanging, large rough-textured lobed leaves, curling tendrils and a yellow flower |
| pole_beans | pole bean vine segment twining upward around a thin bare stem, heart-shaped trifoliate leaves, several slender green bean pods hanging in a cluster, small white flower |
| vanilla_orchid | vanilla orchid vine segment with thick fleshy dark green oval leaves, aerial roots, and a pale yellow-green orchid flower, a few green vanilla pods hanging |

### Fruiting (8)
| id | SUBJECT |
|---|---|
| bush_cucumber | compact bush pickle cucumber plant with short bushy vines, three small stout bumpy green pickling cucumbers, serrated lobed leaves, a yellow flower |
| pepper | sweet bell pepper plant with glossy green and red bell peppers hanging from sturdy branches, lance-shaped dark green leaves |
| compact_tomato | compact determinate tomato plant, bushy, with a cluster of four round ripe red slicing tomatoes, jagged compound green leaves, short stem |
| eggplant | eggplant plant with two glossy deep purple oblong fruits hanging under broad lobed gray-green leaves, purple-flushed stem, green calyx on each fruit |
| zucchini | zucchini plant with two glossy dark green speckled zucchini fruits, one with a yellow blossom attached, large spiky-edged mottled leaves on thick stems |
| woodland_strawberry | woodland strawberry plant with small trifoliate serrated leaves, a white five-petal flower, and several tiny bright red strawberries on thin stems |
| lemon_tree | compact dwarf lemon tree branch with glossy dark green oval leaves, white blossoms and four bright yellow lemons, short woody trunk base |
| ghost_pepper | ghost pepper plant with wrinkled tapered orange-red pods hanging from branches, pointed dark green leaves, small white flower |

### Leafy fast cycles (2)
| id | SUBJECT |
|---|---|
| head_lettuce | head of butterhead lettuce, tight rosette of soft ruffled bright green leaves forming a loose round head, pale yellow-green heart, cut base |
| red_lettuce | red leaf lettuce, loose rosette of frilly ruffled leaves in burgundy red fading to green at the base, cut base |

### Greens (7)
| id | SUBJECT |
|---|---|
| kale | curly kale plant, upright rosette of deeply ruffled blue-green leaves on thick pale stems |
| chard | Swiss chard plant with glossy crinkled dark green leaves and thick bright red-pink stems with prominent veins |
| bok_choy | bok choy, white-green crisp thick spoon-shaped stalks with smooth dark green leaf blades, compact vase shape, cut base |
| mustard_greens | mustard greens plant, frilly serrated bright green leaves with pale midribs, loose upright rosette |
| tatsoi | tatsoi, flat low rosette of dark green spoon-shaped glossy leaves with white petioles, viewed slightly from above |
| mizuna | mizuna, dense clump of finely cut feathery bright green leaves on thin white stems |
| watercress | watercress sprig bunch with small round glossy dark green compound leaves on hollow stems, tiny white flowers, rooting nodes at the base |

### Roots (7)
| id | SUBJECT |
|---|---|
| scallion | bunch of three scallions, slender hollow dark green tops tapering from white shafts with small white roots at the base |
| beet | beet plant with a round deep crimson root bulb with fine taproot, dark green leaves with red veins and red stems |
| turnip | turnip plant with a round white bulb with purple-flushed shoulders, slender taproot, and green rough-textured leaves |
| garlic | garlic plant with a white papery bulb showing a few small roots, a flat green stem and long flat blades above |
| prairie_onion | prairie onion plant, small pale purple-white bulb with fine roots, slender grass-like green leaves, a round pink-lavender flower head |
| wild_rice | wild rice stalk, tall slender plant with long arching blade leaves and a drooping seed panicle of green and brown grains |
| shiitake_mushroom | cluster of three shiitake mushrooms with broad tan-brown domed caps with pale flecks and cream gills, short stout stems, no log |

### Herbs (6)
| id | SUBJECT |
|---|---|
| cilantro | cilantro plant with delicate lacy lower leaves and feathery upper leaves, thin pale green stems |
| parsley | flat-leaf parsley plant, rosette of glossy dark green deeply divided leaves on long stems |
| dill | dill plant with thin feathery thread-like blue-green foliage on a slender stem, topped with a yellow umbel flower head |
| chives | chive clump, dense upright tubular dark green blades with two round lavender-pink pom-pom flowers |
| meadow_sage | meadow sage plant, upright stems with wrinkled gray-green oval leaves and spikes of violet-blue whorled flowers |
| wild_garlic | wild garlic (ramsons) plant with broad lance-shaped bright green leaves and a round white star-flower umbel, small white bulb base |

### Brassicas (3)
| id | SUBJECT |
|---|---|
| compact_cabbage | small compact green cabbage head with tightly wrapped pale green inner leaves and a few veined blue-green outer wrapper leaves |
| broccoli | broccoli plant with one dense dark green crown of tight buds on a thick pale green stalk, large veined blue-green leaves |
| kohlrabi | kohlrabi with a round pale green swollen stem bulb and several slender stalks bearing blue-green leaves radiating from the top |

### Companions (3)
| id | SUBJECT |
|---|---|
| nasturtium | nasturtium plant with round lily-pad shaped bright green leaves with radiating veins and several orange-red trumpet flowers |
| wild_clover | wild clover plant with trifoliate leaves bearing pale chevron markings and two round pink-white flower heads on thin stems |
| marsh_marigold | marsh marigold plant with glossy round kidney-shaped dark green leaves and several bright buttercup-yellow flowers |

(The grouped counts above follow the spec `faction` field; ids are the canonical keys.)

---

## 5. Suggested Batch Order

Prioritized by how often a crop appears in default beds and recipes, then by faction so framing stays consistent:

1. Fruiting staples: `compact_tomato`, `pepper`, `slicing_cucumber`, `zucchini`, `eggplant`
2. Greens: `kale`, `chard`, `head_lettuce`, `red_lettuce`, `bok_choy`
3. Roots: `beet`, `garlic`, `scallion`, `turnip`
4. Herbs: `parsley`, `cilantro`, `dill`, `chives`
5. Brassicas and remaining climbers: `broccoli`, `compact_cabbage`, `kohlrabi`, `pole_beans`, `beit_cucumber`, `bush_cucumber`
6. Companions and specials: `nasturtium`, `mizuna`, `tatsoi`, `mustard_greens`
7. Exotic and wild set (lowest frequency): `ghost_pepper`, `lemon_tree`, `vanilla_orchid`, `wild_rice`, `shiitake_mushroom`, `watercress`, `wild_clover`, `wild_garlic`, `woodland_strawberry`, `prairie_onion`, `meadow_sage`, `marsh_marigold`

---

## 6. Open Questions for Dave

1. Which generator? Tools with image-reference input (and a lockable seed) hold style best.
2. Is the 256x256 single-sprite size final, or should new crops also be packed into a sheet like `crop-sheet.png`? `sprite-loader.js` resolves `crop-<id>` first, then the sheet, so per-file PNGs are sufficient.
3. Wild/exotic crops (vanilla_orchid, lemon_tree, wild_rice) are not typical raised-bed plants. OK to depict a branch or segment instead of a whole plant?
4. Cucumber duplication: three cucumber crops need to be visually distinguishable at 64px. Keep Beit Alpha pale and slender, slicing dark and long, bush pickle short and bumpy.
