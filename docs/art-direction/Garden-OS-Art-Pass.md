# Garden OS Story Mode: Art Pass Proposal

**Prepared by:** 3D BOT, with input from GardenerBot
**Date:** October 17, 2026
**Build reviewed:** live mixmash.games/garden/ (three.js r180), opening yard, Chapter 1, March

![Current opening yard](current-yard.png)

## 1. Where we are

Today's sprint fixed menus, navigation and performance. A full bed now draws 434 calls, down from 1016, rendering stops when the game is paused or hidden, and there's no memory leak. The world itself is still placeholder art. Its job was to prove gameplay and frame budget, and it does that, but it doesn't look like a finished game.

## 2. What's wrong in the current frame

| Area | Problem | Why it matters |
|---|---|---|
| Cottage | A stretched cream box. The door and windows float on the wall, the chimney isn't attached to the roof, and there are no roof eaves, trim, step depth or sills. | It's the biggest object in the opening shot, so it sets the quality bar for everything else. |
| World edge | Past the fence there's only a flat beige gradient. There's no sky, distant hills or treeline, and the fences end in empty space. | The world feels unfinished and small. |
| Ground | One flat dark green. Grass cards are sparse, and there's no color variation, paths, worn dirt or edge detail. | Most of the screen is ground, and right now it reads as empty. |
| Lighting | Flat midday everywhere. Shadows are hard, with no soft shading where objects meet the ground, no bounce light, haze or color grade. | Lighting is the cheapest big win and drives most of the "finished" feeling. |
| Garden bed | A plain flat slab with a tiled soil texture and no wood grain, soil mounding or wear. | It's the main thing the player interacts with. |
| Trees and bushes | Smooth lollipop shapes, all with the same silhouette. | They look generic. |
| Props and set dressing | The pots and basket are tiny and few. There are no flowers, tools, clutter or signs of neighbors. | The yard feels empty, with nothing hinting at the story. |
| Consistency | Every asset is made to a different standard. | Even good individual pieces won't look like they belong together. |

## 3. Plan

The order is chosen so the cheapest, biggest improvements land first and each step can be judged from the same camera.

1. **Pick a look.** Dave chooses one of the three directions in section 5. GardenerBot writes a one-page art brief tying mood to chapter and season.
2. **Vertical slice of the opening yard,** shot from this exact camera:
   - Lighting: a sky dome, a warm key light and cool fill, soft shadows, ground-contact shading, fog that matches the horizon, filmic tone mapping and a light color grade.
   - World edge: distant hills and a treeline (cheap cut-out cards or low-poly meshes), and the fence closing off the yard.
   - Ground: a shader that blends grass, dirt and worn-path textures, a mask for paths and the area around the bed, and instanced grass clumps.
   - Cottage: modeled in Blender with roof eaves, trim, an attached chimney, inset windows and a door step. Lighting baked into its textures, exported as compressed glTF.
   - Garden bed: wood-grain boards and mounded soil, reusing the existing collision.
   - Trees and bushes: one family of 3 or 4 varied silhouettes, instanced.
   - Props: a small kit of a watering can, tools, a crate, flower pots and a path stepping stone.
3. **Review.** Before-and-after shots from the same camera, desktop and phone frame-rate numbers, and one PR that stays unmerged until Dave signs off.
4. **Roll out** to the meadow, market square and neighborhood using the same asset kit.
5. **Seasons and time of day:** sky, palette and foliage tint by chapter, driven by GardenerBot's brief.

## 4. Budget and guardrails

- **Draw calls:** stay at or below today's 434 for a full bed. New repeated assets are instanced or merged.
- **Memory:** compressed textures; the current sprite set is 4.73 MB, and new texture weight is reported in each PR.
- **Phones:** a lower-quality setting that turns off soft shadows and post effects. Checked on a phone-sized viewport before any merge.
- **Gameplay stays as-is:** collision, walkable areas, interactables and saves stay the same, and the existing walkability tests must keep passing.
- **Actions minutes:** tests run locally first, and each PR is pushed once.

## 5. Three looks to choose from

### A. Cozy stylized (Tiny Glade, A Short Hike)
Soft, rounded, hand-crafted shapes; a warm pastel palette; painterly gradients instead of detailed textures; gentle soft shadows. It's forgiving, quick to build, runs well on phones and matches the game's tone. The risk is looking like many other cozy games.

### B. Painterly storybook (Ghibli-style backgrounds, gouache illustration)
Mid-poly shapes with hand-painted textures; visible brush texture in the sky and foliage; richer light with golden-hour warmth; more detailed architecture. It has the most personality and suits a story with chapters and seasons. It takes more texture painting, and the cost is mostly in authoring time, not frame rate.

### C. Grounded realistic (cozy real-world backyard, close to photographic)
Realistic materials, real-world proportions, high-detail grass and soil, image-based lighting from a sky photo, and depth of field. It's the most impressive in screenshots, but it's the heaviest on phones, the slowest to build, and it fights the stylized UI and characters.

## 6. Image-generation prompts

Use these to create one reference frame per look from the same camera. All three describe the same scene, so only the style changes.

**A. Cozy stylized**
> A cozy stylized 3D video game screenshot, three-quarter elevated view of a small backyard garden in early spring. A charming little cottage with a pitched shingle roof, wide eaves, a brick chimney, round-top wooden door, flower boxes under the windows and a stone step. In the center, a raised wooden garden bed with dark mounded soil and tiny seedlings. A young gardener in a straw hat and green shirt stands beside it. Soft rounded trees and bushes in varied shapes, a curving dirt path, clumps of grass and wildflowers, a watering can, clay pots and a wooden crate. A rustic wooden fence encloses the yard; rolling pastel hills and a soft treeline behind it. Warm morning sun, soft shadows, gentle ambient occlusion, light haze on the horizon, pastel sky with soft clouds. Clean, hand-crafted, soft-shaded style inspired by Tiny Glade and A Short Hike, low-poly with smooth gradients, harmonious warm palette, 16:9.

**B. Painterly storybook**
> A painterly storybook 3D game scene, three-quarter elevated view of a small backyard garden in early spring, in the style of a Studio Ghibli background painting and gouache illustration. A cozy weathered cottage with a mossy tiled roof, timber trim, a leaning stone chimney with a wisp of smoke, shuttered windows with flower boxes and a worn doorstep. A raised cedar garden bed with rich dark soil and small seedlings at the center; a young gardener in a straw hat beside it. Hand-painted textures with visible brushstrokes, full lush trees, a winding trodden path, tall grass, wildflowers, clay pots, a wheelbarrow and hanging tools on the wall. A crooked wooden fence; layered painted hills, a distant village rooftop and treeline behind. Golden-hour light, warm bounce light, long soft shadows, atmospheric haze, a big painted sky with cumulus clouds. Rich but harmonious palette, whimsical and nostalgic, 16:9.

**C. Grounded realistic**
> A realistic real-time 3D game render, three-quarter elevated view of a small suburban backyard garden in early spring. A small white clapboard cottage with an asphalt shingle roof, gutters, a red brick chimney, trimmed double-hung windows, a paneled door and a concrete step. In the center, a raised cedar-plank garden bed with dark damp soil and young seedlings; a gardener in a straw hat and work clothes kneels beside it. Detailed lawn with natural color variation, patchy worn dirt along a footpath, dandelions, terracotta pots, a galvanized watering can and garden tools. A weathered split-rail wooden fence; mature oak trees, neighboring rooftops and soft distant hills behind. Physically based materials, morning sun with soft realistic shadows, ambient occlusion, light atmospheric haze, image-based lighting from a clear spring sky, subtle depth of field. Unreal Engine 5–quality real-time render, natural color grade, 16:9.
