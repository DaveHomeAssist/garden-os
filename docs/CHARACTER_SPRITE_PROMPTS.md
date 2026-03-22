# Garden OS — Character Sprite Generation Prompts

Target runtime folder:
`story-mode/assets/textures/`

Style target:
- stylized low-poly 3D game character, same proportions as `player-character.js`
  (blocky limbs, sphere head, ~0.7 unit tall, box geometry torso)
- dark earthy palette matching scene materials
- warm ambient overhead light, soft cel-shading
- transparent background, isolated subject
- crisp readable silhouette at small display size
- no text, no UI chrome

Reference assets:
- `story-mode/src/scene/player-character.js` — proportional reference for body shape
- `garden-os-sprites/source/beds/bed-4x8-blank-v0-gemini-full-res.png` — scene palette
- `garden-os-sprites/beds/bed-grid-1.png` — material tone and lighting angle

Character reference:
- `docs/VOICE_BIBLE.md` — personality, visual identity, gameplay function

## Sprite-loader manifest additions

```js
// SINGLE_ASSETS additions
'char-gurl':       { file: 'char-gurl.png',       w: 256,  h: 256 },
'char-onion':      { file: 'char-onion.png',       w: 256,  h: 256 },
'char-vegeman':    { file: 'char-vegeman.png',     w: 256,  h: 256 },
'char-critters':   { file: 'char-critters.png',    w: 256,  h: 256 },

// SHEET_ASSETS additions
'expr-gurl':       { file: 'expr-gurl.png',        w: 1536, h: 256, cols: 6, rows: 1 },
'expr-onion':      { file: 'expr-onion.png',       w: 1536, h: 256, cols: 6, rows: 1 },
'expr-vegeman':    { file: 'expr-vegeman.png',     w: 1536, h: 256, cols: 6, rows: 1 },
'expr-critters':   { file: 'expr-critters.png',    w: 1536, h: 256, cols: 6, rows: 1 },
```

```js
/** Named expression indices for character sheets */
export const EXPR_INDEX = {
  NEUTRAL: 0, NEG_MILD: 1, NEG_STRONG: 2,
  POS_MILD: 3, POS_STRONG: 4, SPECIAL: 5,
};
```

---

## char-gurl.png

Loader key: `char-gurl`
Target filename: `char-gurl.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Garden GURL in cutscene and scoring UI
- default neutral expression, used when no expression sheet frame is specified

```text
Stylized low-poly 3D portrait bust of a stern 65-year-old white woman with
fair skin, silver-grey hair cut in a sharp practical bob, narrow rectangular
reading glasses sitting low on her nose, the no-nonsense face of a Brooklyn
woman who has seen every mistake you are about to make, dark olive-green
canvas vest with visible stitching over a cream collared shirt, small brass
pin on the vest lapel, expression composed and unimpressed — thin-lipped
neutral mouth, one eyebrow raised in quiet judgment, eyes sharp and focused,
faint laugh lines that only show when she is not laughing, blocky simplified
proportions matching a stylized mobile game character, warm overhead light,
soft cel-shading, dark earthy soil-brown card background, clean readable
silhouette, transparent background, isolated subject, no text, no labels,
high-resolution PNG
```

---

## char-onion.png

Loader key: `char-onion`
Target filename: `char-onion.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Onion Man in cutscene and harvest moments

```text
Stylized low-poly 3D portrait bust of a warm soft-featured man with medium
brown skin, round friendly face, gentle brown eyes that look slightly damp,
short messy brown hair with a few grey streaks at the temples, faded burgundy
baseball cap worn slightly askew, worn flannel shirt in muted red-brown plaid
over a plain cream tee with a slightly frayed collar, expression earnest and
slightly worried — mouth curved in a tentative hopeful half-smile, brow
furrowed just enough to suggest he cares too much, blocky simplified
proportions matching a stylized mobile game character, warm overhead light,
soft cel-shading, dark earthy soil-brown card background, clean readable
silhouette, transparent background, isolated subject, no text, no labels,
high-resolution PNG
```

---

## char-vegeman.png

Loader key: `char-vegeman`
Target filename: `char-vegeman.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Vegeman in tutorial and risk moments

```text
Stylized low-poly 3D portrait bust of a broad energetic man with light olive
skin, strong square jaw, wide confident grin showing teeth, thick dark
expressive eyebrows, short spiky dark hair sticking up with restless energy,
a small leaf caught in his hair he has not noticed, bright leaf-green t-shirt
slightly tight across broad shoulders, soil smudges on one cheek and
forearms, expression cocky and enthusiastic — chin tilted up, eyes bright
with reckless optimism, blocky simplified proportions matching a stylized
mobile game character, warm overhead light, soft cel-shading, dark earthy
soil-brown card background, clean readable silhouette, transparent
background, isolated subject, no text, no labels, high-resolution PNG
```

---

## char-critters.png

Loader key: `char-critters`
Target filename: `char-critters.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Garden Critters collective in event cards

```text
Stylized low-poly 3D group portrait of garden pests arranged as a deadpan
ensemble: centre a fat grey-brown cottontail rabbit sitting upright with
half-lidded bored eyes, front-left a glossy dark slug with glistening trail,
front-right a tight cluster of pale green aphids on a leaf fragment, behind
the rabbit a small brown squirrel peering over its shoulder, all creatures
have flat indifferent expressions as if posing for a mugshot they have been
through before, blocky simplified proportions matching a stylized mobile game
aesthetic, warm overhead light, soft cel-shading, dark earthy soil-brown card
background, clean readable silhouette, transparent background, isolated
subject, no text, no labels, high-resolution PNG
```

---

## expr-gurl.png

Loader key: `expr-gurl`
Target filename: `expr-gurl.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Garden GURL dialogue
- frame order maps to `EXPR_INDEX`: neutral, neg-mild, neg-strong, pos-mild, pos-strong, special

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D woman
(fair skin, silver-grey bob, reading glasses, olive vest, cream shirt),
each frame 256x256 with identical framing, dark soil-brown card background:

frame 1 NEUTRAL — composed, one eyebrow slightly raised, resting judgment;
frame 2 DISAPPROVAL — eyebrows lowered, mouth pressed tight, looking over
glasses with open contempt;
frame 3 VERDICT — eyes narrowed, slight knowing nod, the face of someone
writing a citation;
frame 4 GRUDGING APPROVAL — one corner of mouth turned up almost
imperceptibly, glasses pushed up slightly;
frame 5 ALARMED — eyes wide behind glasses, eyebrows raised high, mouth
slightly open, she has spotted something structurally unsound;
frame 6 RARE WARMTH — eyes softened, faint genuine smile, glasses catching
warm light;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## expr-onion.png

Loader key: `expr-onion`
Target filename: `expr-onion.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Onion Man dialogue

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D man (round
face, burgundy cap, flannel shirt, cream tee), each frame 256x256 with
identical framing, dark soil-brown card background:

frame 1 NEUTRAL — earnest half-smile, brow slightly furrowed, warm damp eyes;
frame 2 WORRIED — full furrowed brow, mouth pulled to one side, watching
something wilt;
frame 3 DISAPPOINTED — mouth turned down, eyes looking downward, sauce plans
collapsed;
frame 4 PROUD — genuine wide smile, eyes crinkled, cap pushed back slightly;
frame 5 MOVED — eyes glistening, soft open-mouthed smile, chin slightly
trembling;
frame 6 FIRED UP — eyes bright and wide, mouth open mid-sentence, full sports
fan energy;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## expr-vegeman.png

Loader key: `expr-vegeman`
Target filename: `expr-vegeman.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Vegeman dialogue

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D man (spiky
hair, leaf in hair, green tee, soil smudges), each frame 256x256 with
identical framing, dark soil-brown card background:

frame 1 NEUTRAL — cocky grin, chin up, eyes bright with reckless energy;
frame 2 SCHEMING — eyes narrowed, one eyebrow raised high, wide sly grin;
frame 3 BUSTED — frozen smile, eyes shifted to the side, caught mid-bad-
decision;
frame 4 HYPED — mouth wide open, eyes huge, maximum enthusiasm;
frame 5 VICTORIOUS — full triumphant grin, eyes blazing, chin way up;
frame 6 DEFLECTING — sheepish grin, one eye squinted shut, pretending a
disaster was a learning experience;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## expr-critters.png

Loader key: `expr-critters`
Target filename: `expr-critters.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Garden Critters event dialogue

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D pest group
(rabbit centre, slug left, aphids right, squirrel behind), each frame
256x256 with identical framing, dark soil-brown card background:

frame 1 NEUTRAL — flat bored expressions, half-lidded eyes, routine
indifference;
frame 2 INTERESTED — rabbit ears perked, squirrel leaned forward, aphids
clustered tighter, they have noticed something vulnerable;
frame 3 FEASTING — rabbit chewing with satisfied half-closed eyes, slug on
a leaf, aphids swarming, active consumption;
frame 4 THWARTED — rabbit ears flattened, squirrel scowling, slug recoiled,
garden defenses held;
frame 5 ARRIVING — all creatures facing the same direction with alert
predatory focus, the moment before they move in;
frame 6 RETREATING — rabbit looking back over shoulder, squirrel mid-exit,
slug leaving a trail, begrudging departure;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## Notes

- All character portraits must match the blocky low-poly proportions of the
  existing player character in `player-character.js` — sphere heads, box
  torsos, simplified geometry. Do not generate realistic or high-poly
  characters.
- The dark soil-brown card background (`~#3d2410`) matches the soil material
  colour used in the Three.js scene.
- Expression sheets use a standardized 6-slot layout so the dialogue engine
  can map emotional beats to frame indices without per-character branching.
- Portraits display at roughly 96x96 in the dialogue UI — silhouettes must
  read clearly at that size.
- The full-body sprites from the original draft were cut. Characters appear in
  the 3D scene as procedural geometry (like the existing player character), not
  as billboard sprites. Portraits are 2D UI only.
