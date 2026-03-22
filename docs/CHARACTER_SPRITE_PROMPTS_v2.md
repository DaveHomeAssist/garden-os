# Garden OS — Character Sprite Generation Prompts v2

Target runtime folder:
`story-mode/assets/textures/`

Style target:
- stylized low-poly 3D translations of the 2D comic characters
- anthropomorphic vegetable/plant characters, NOT human
- proportions matching `player-character.js` (blocky limbs, simplified geometry)
- dark earthy palette matching scene materials
- warm ambient overhead light, soft cel-shading
- transparent background, isolated subject
- crisp readable silhouette at small display size (portraits render ~96x96)
- no text, no UI chrome

Reference assets:
- `story-mode/src/scene/player-character.js` — proportional reference for body scale
- `garden-os-sprites/source/beds/bed-4x8-blank-v0-gemini-full-res.png` — scene palette
- `garden-os-sprites/beds/bed-grid-1.png` — material tone and lighting angle

Character reference:
- `docs/VOICE_BIBLE.md` — personality and gameplay function
- Garden League comic series (ChatGPT-generated) — canonical visual designs:
  - Vegeman: spring onion with white bulb head, green limbs, leaf sprout
  - GardenGurl: plant hero with vine hair, leaf tunic, watering-can backpack
  - Onion Man: onion bulb head, Phillies gear, cape
  - Critters: pest antagonists

## Sprite-loader manifest additions

```js
// SINGLE_ASSETS additions
'char-gurl':       { file: 'char-gurl.png',       w: 256,  h: 256 },
'char-onion':      { file: 'char-onion.png',       w: 256,  h: 256 },
'char-vegeman':    { file: 'char-vegeman.png',     w: 256,  h: 256 },
'char-critters':   { file: 'char-critters.png',    w: 256,  h: 256 },
'char-calvin':     { file: 'char-calvin.png',      w: 256,  h: 256 },

// SHEET_ASSETS additions
'expr-gurl':       { file: 'expr-gurl.png',        w: 1536, h: 256, cols: 6, rows: 1 },
'expr-onion':      { file: 'expr-onion.png',       w: 1536, h: 256, cols: 6, rows: 1 },
'expr-vegeman':    { file: 'expr-vegeman.png',     w: 1536, h: 256, cols: 6, rows: 1 },
'expr-critters':   { file: 'expr-critters.png',    w: 1536, h: 256, cols: 6, rows: 1 },
'expr-calvin':     { file: 'expr-calvin.png',      w: 1536, h: 256, cols: 6, rows: 1 },
```

```js
/** Named expression indices for character sheets */
export const EXPR_INDEX = {
  NEUTRAL: 0, NEG_MILD: 1, NEG_STRONG: 2,
  POS_MILD: 3, POS_STRONG: 4, SPECIAL: 5,
};
```

---

## char-vegeman.png

Loader key: `char-vegeman`
Target filename: `char-vegeman.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Vegeman in tutorial and risk moments

```text
Stylized low-poly 3D portrait bust of an anthropomorphic spring onion
character, white-cream bulb head tapering to a point at the chin, bright
green leaf sprout shooting up from the top of the head like a mohawk tuft,
simple friendly face — two round black dot eyes and a wide curved smile,
the head fades from white at the top to green at the neck, thin green
scallion-stalk body visible at the shoulders, expression cocky and cheerful
with reckless energy, the character is a vegetable not a human, blocky
simplified proportions matching a stylized mobile game aesthetic, warm
overhead light, soft cel-shading, dark earthy soil-brown card background,
clean readable silhouette, transparent background, isolated subject, no
text, no labels, high-resolution PNG
```

---

## char-gurl.png

Loader key: `char-gurl`
Target filename: `char-gurl.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Garden GURL in cutscene and scoring UI
- personality modeled after a 65-year-old Brooklyn Jewish woman — stern,
  sharp, seen-it-all — but the visual is a plant character, not human

```text
Stylized low-poly 3D portrait bust of an anthropomorphic plant hero
character, a feminine plant-person with long flowing green vine-like hair
made of leaves sweeping back dramatically, confident sharp face with
determined eyes and a slight knowing smirk, leaf-shaped tunic collar visible
at the shoulders in deep forest green, small dark gardening gloves on her
hands if visible, she has the stern composed expression of someone who has
already found three things wrong with your garden, the character is a plant
creature not a human, blocky simplified proportions matching a stylized
mobile game aesthetic, warm overhead light, soft cel-shading, dark earthy
soil-brown card background, clean readable silhouette, transparent
background, isolated subject, no text, no labels, high-resolution PNG
```

---

## char-onion.png

Loader key: `char-onion`
Target filename: `char-onion.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Onion Man in cutscene and harvest moments

```text
Stylized low-poly 3D portrait bust of an anthropomorphic onion character,
large round golden-brown onion bulb head with papery skin texture and subtle
layered rings visible, bright green leaf sprouts growing from the top of
the head like messy hair, warm gentle face with big round expressive eyes
that look slightly damp as if about to cry — because he is an onion, small
hopeful half-smile, wearing a faded burgundy baseball cap with a P logo
pushed back on the bulb head at an angle, small red bandana or cape tied
at the neck, the character is a vegetable not a human, expression earnest
and tender, blocky simplified proportions matching a stylized mobile game
aesthetic, warm overhead light, soft cel-shading, dark earthy soil-brown
card background, clean readable silhouette, transparent background, isolated
subject, no text, no labels, high-resolution PNG
```

---

## char-critters.png

Loader key: `char-critters`
Target filename: `char-critters.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Garden Critters collective in event cards

```text
Stylized low-poly 3D group portrait of garden pest antagonists arranged as
a deadpan ensemble: centre a fat grey-brown cottontail rabbit sitting
upright with half-lidded bored eyes, front-left a glossy dark slug with
glistening trail, front-right a tight cluster of pale green aphids on a
leaf fragment, behind the rabbit a small brown squirrel peering over its
shoulder, all creatures have flat indifferent expressions as if posing for
a mugshot they have been through before, these are realistic garden pests
not anthropomorphic vegetables, blocky simplified proportions matching a
stylized mobile game aesthetic, warm overhead light, soft cel-shading, dark
earthy soil-brown card background, clean readable silhouette, transparent
background, isolated subject, no text, no labels, high-resolution PNG
```

---

## expr-vegeman.png

Loader key: `expr-vegeman`
Target filename: `expr-vegeman.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Vegeman dialogue

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D spring
onion character (white bulb head, green leaf sprout top, dot eyes, curved
mouth), each frame 256x256 with identical framing, dark soil-brown card
background:

frame 1 NEUTRAL — wide cheerful smile, dot eyes bright, default cocky
energy;
frame 2 SCHEMING — eyes narrowed to slits, grin widened, leaf sprout
tilted forward, he has an idea and it is probably bad;
frame 3 BUSTED — smile frozen, eyes shifted to the side, caught mid-bad-
decision, leaf sprout drooping slightly;
frame 4 HYPED — mouth wide open circle, eyes huge, leaf sprout standing
straight up with excitement;
frame 5 VICTORIOUS — eyes squeezed shut with delight, enormous grin, leaf
sprout fanned out triumphantly;
frame 6 DEFLECTING — sheepish lopsided smile, one eye squinted shut, leaf
sprout wilted to one side, pretending a disaster was worth testing;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## expr-gurl.png

Loader key: `expr-gurl`
Target filename: `expr-gurl.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Garden GURL dialogue

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D plant hero
woman (flowing green vine hair, leaf tunic, sharp confident face), each
frame 256x256 with identical framing, dark soil-brown card background:

frame 1 NEUTRAL — composed, slight knowing smirk, one vine-brow raised,
resting judgment face;
frame 2 DISAPPROVAL — vine hair bristling outward, eyes narrowed, mouth
pressed into a tight line, full municipal contempt;
frame 3 VERDICT — eyes narrowed further, slow nod, the face of someone
writing a citation against your basil placement;
frame 4 GRUDGING APPROVAL — one corner of mouth turned up, vine hair
relaxed and flowing gently, the closest she gets to praise;
frame 5 ALARMED — eyes wide, vine hair flared upward like startled leaves,
mouth slightly open, she has spotted something structurally unsound;
frame 6 RARE WARMTH — eyes softened, genuine small smile, vine hair draped
gently, an expression her Brooklyn mother would never admit to making;

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
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D onion
character (golden-brown onion bulb head, green leaf sprouts, Phillies cap,
damp expressive eyes), each frame 256x256 with identical framing, dark
soil-brown card background:

frame 1 NEUTRAL — earnest half-smile, eyes warm and slightly glistening,
leaf sprouts relaxed;
frame 2 WORRIED — eyes wide and extra watery, leaf sprouts drooping, mouth
pulled to one side, watching something wilt;
frame 3 DISAPPOINTED — full tears streaming down the bulb — he is an onion
so he cries easily, mouth turned down, leaf sprouts limp, cap pulled low;
frame 4 PROUD — genuine wide smile, eyes crinkled and sparkling, cap pushed
back, leaf sprouts standing up with pride;
frame 5 MOVED — tears streaming but smiling, overwhelmed by beauty, the
face of a man watching a perfect harvest come in, Phillies-level emotion;
frame 6 FIRED UP — eyes blazing, mouth open mid-cheer, cap askew, leaf
sprouts bristling upward, full sports fan energy about a really good tomato
row;

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

## char-calvin.png

Loader key: `char-calvin`
Target filename: `char-calvin.png`
Dimensions: 256x256

Intended use:
- dialogue portrait for Calvin the dog in home/family scenes
- the household chaos agent — lovable, enormous, zero impulse control

```text
Stylized low-poly 3D portrait bust of a big shaggy Old English Sheepdog,
massive round head almost entirely covered in long messy white and grey fur
hanging over his eyes, big wet black nose poking out from the fur, wide
happy open-mouthed panting grin with tongue lolling to one side, floppy
ears buried somewhere in the fur mass, thick fluffy chest and shoulders
visible, he looks like he just knocked something over and is thrilled about
it, the dog is large and takes up most of the frame, cheerful oblivious
energy, blocky simplified proportions matching a stylized mobile game
aesthetic, warm overhead light, soft cel-shading, dark earthy soil-brown
card background, clean readable silhouette, transparent background, isolated
subject, no text, no labels, high-resolution PNG
```

---

## expr-calvin.png

Loader key: `expr-calvin`
Target filename: `expr-calvin.png`
Dimensions: 1536x256 (6 frames, 256x256 each)

Intended use:
- expression sprite sheet for Calvin dialogue and home event scenes

```text
Horizontal 6-frame sprite sheet of the same stylized low-poly 3D shaggy
Old English Sheepdog (massive fur-covered head, black nose, floppy ears),
each frame 256x256 with identical framing, dark soil-brown card background:

frame 1 NEUTRAL — happy open-mouthed pant, tongue out, default lovable
chaos energy;
frame 2 GUILTY — head tilted down slightly, eyes peeking up through the
fur, mouth closed, tail-between-legs energy without showing the tail, he
knows what he did;
frame 3 ZOOMIES — eyes wide and wild through the fur, mouth open in a
manic grin, fur blown back as if mid-sprint, pure uncontrollable velocity;
frame 4 BEGGING — head tilted to one side, one ear slightly raised, big
sad eyes visible through parted fur, mouth closed in a hopeful pout;
frame 5 ASLEEP — eyes closed, head resting to one side, tongue slightly
out, peaceful snoring face, fur draped everywhere, taking up someone
else's spot on the couch;
frame 6 ALERT — ears perked up as much as sheepdog ears can, eyes wide and
bright through the fur, mouth closed, head turned slightly — he heard
something and it might be a squirrel;

consistent warm overhead lighting across all frames, soft cel-shading, clean
readable silhouettes, transparent background, isolated subjects, no text,
no labels, even frame spacing, high-resolution PNG
```

---

## Notes

- Characters are anthropomorphic vegetables/plants (Vegeman, GardenGurl,
  Onion Man), realistic garden pests (Critters), and one real dog (Calvin).
  No human characters.
- Visual designs originate from the Garden League comic series. The 2D comic
  style (retro newspaper, crosshatched, warm amber tones) is the canonical
  look. These prompts translate those designs into the 3D game aesthetic.
- GardenGurl's personality is modeled after Dave's mom (65-year-old Brooklyn
  Jewish woman) but her visual is a plant hero with vine hair and leaf armor.
- Onion Man cries because he is literally an onion. This is both his defining
  visual trait and his emotional hook.
- Vegeman's leaf sprout acts as an expressive antenna — it reacts to his
  mood (perks up when excited, wilts when sheepish, fans out in triumph).
- The dark soil-brown card background (`~#3d2410`) matches the soil material
  colour used in the Three.js scene.
- Expression sheets use a standardized 6-slot layout so the dialogue engine
  can map emotional beats to frame indices without per-character branching.
- Calvin is a big shaggy Old English Sheepdog. He is not anthropomorphic —
  he is just a dog who causes problems. His fur is his expressive element
  the way Vegeman's leaf sprout is his.
- Portraits display at roughly 96x96 in the dialogue UI — silhouettes must
  read clearly at that size.
