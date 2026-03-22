# Garden OS — Texture Sprite Generation Prompts

These prompts cover the remaining `story-mode` texture keys that still do not
have source art after the current copy pass.

Target runtime folder:
`story-mode/assets/textures/`

Style target:
- stylized 3D game asset
- dark earthy palette
- warm cedar wood framing
- transparent background
- isometric angle matching existing bed assets
- crisp readable silhouettes
- no text
- no UI chrome outside the asset itself

Reference assets:
- `garden-os-sprites/source/beds/bed-4x8-blank-v0-gemini-full-res.png`
- `garden-os-sprites/source/beds/bed-4x8-green-highlight-v1-gemini-full-res.png`
- `garden-os-sprites/source/beds/bed-4x8-blue-highlight-v2-gemini-full-res.png`
- `garden-os-sprites/beds/bed-grid-1.png`

## bed-rain.png

Loader key:
- `bed-rain`

Target filename:
- `bed-rain.png`

Intended use:
- rainy/weather state for the main raised bed texture

Prompt:

```text
Stylized 3D isometric raised garden bed texture for a premium mobile gardening
game, same camera angle and framing as the existing 4x8 bed asset, cedar wood
frame, dark rich wet soil in evenly divided planting cells, subtle rainfall
streaks and a damp reflective surface, small puddle sheen in some cells, wet
gravel around the bed edges, moody overcast lighting, cool desaturated rain
tones without losing the warm natural wood, transparent background, isolated
asset only, no text, no labels, no extra props, clean silhouette, suitable for
overlay-free in-game use, 1024x512 equivalent framing, high-resolution PNG
```

## bed-seasons.png

Loader key:
- `bed-seasons`

Target filename:
- `bed-seasons.png`

Intended use:
- 4-frame seasonal sprite sheet for the same bed layout
- frame order must be: `SPRING`, `SUMMER`, `AUTUMN`, `WINTER`

Prompt:

```text
Horizontal 4-frame sprite sheet of the same stylized 3D isometric raised
garden bed repeated across all frames, each frame showing a different season
while keeping identical camera angle, bed proportions, and wood frame design:

frame 1 SPRING — moist dark soil, subtle fresh green edging, soft mild light;
frame 2 SUMMER — fuller brighter soil warmth, vivid healthy garden tone,
slightly drier path surround;
frame 3 AUTUMN — muted golden-brown tone, cooler light, scattered fallen leaf
accents around the gravel edge;
frame 4 WINTER — cold desaturated soil, faint frost or pale dusting on wood
and ground, subdued wintry light;

transparent background behind each frame, isolated asset only, no text, no
labels, no crops planted, no UI, no extra objects,https://chatgpt.com/g/g-p-69b578c731508191a68a69439337bda5-garden-os/c/69bf872a-bbf0-8332-a096-f33768e822c7 cohesive with premium mobile
garden simulation art, 4 columns by 1 row sprite sheet, even frame spacing,
high-resolution PNG
```

## Notes

- `bed-rain.png` should feel like a weather-state variant of `bed-empty.png`,
  not a highlighted selection state.
- `bed-seasons.png` must keep the exact same bed composition in each frame so
  the loader can swap seasons cleanly.
