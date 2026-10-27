# Style Kit: "A on B" (painted texture on clean low-poly)

A generic kit for building stylised game environments with three.js and Blender, written so it can become a skill later. The Garden OS opening yard is the worked example (paths in brackets).

## 1. Look in one line
Low-poly shapes come from **Look B**: faceted, readable silhouettes with chunky bevels and no noisy micro-geometry. Painted surface, warm light and soft air come from **Look A**: hand-painted textures, a warm key, cool fill and hazy depth.
References: `look-b-clean-low-poly.jpg` (shape), `look-a-cozy-hand-painted.jpg` (paint and light).

## 2. Palette (linear working space, authored as sRGB hex)
One palette object per season is the single source of truth [`src/scene/yard-art/yard-palette.js`].

| Role | Spring hex | Notes |
|---|---|---|
| zenith / sky / horizon | 6fa3d6 / a9cbe6 / f0dcbc | horizon = fog colour |
| sun / fill / rim | ffd49a / 9fb8e0 / ffd09a | warm key, cool fill |
| hemi sky / ground | b4cce6 / 8a7a52 | ground bounce is earthy |
| hills near / mid / far | 7fa356 / 8fae74 / a3b9a8 | lighter and bluer with distance |
| leaf dark / mid / light | 3f6b35 / 5f8f45 / 95bb5c | 3-step ramp, painted per face |
| grass dark / mid / tip | 4f7334 / 76a046 / c4c870 | tips warm |
| wood / soil / path / dirt | tex means ~98653a / 6b4b30 / c3a57b / 9c7650 | painted WebP tiles |
| accents (flowers) | f4efe0 f0c94a a68ad0 e89ab0 | used sparingly at edges |

Rules:
- Keep saturation in the mid-tones and let light do the contrast. No pure black and no pure white.
- Shadows lean cool (blue fill and the split-tone grade). Lights lean warm.
- Each season swaps the whole palette, never single colours.

## 3. Budgets per asset type
| Asset type | Tris (LOD0) | Texture | Draw calls | Notes |
|---|---|---|---|---|
| Hero building | ≤ 2.5k | one 1024 baked atlas (colour × AO) | 1 (instanced for repeats) | inset windows and door via boolean |
| Prop | 30–750 each | shared 512 atlas | all props merged = 1 | origin at base centre |
| Tree / bush variant | 90–600 | vertex colour only | 1 per variant (instanced) | 3–4 variants form a family |
| Far tree dot | ≤ 40 | none | 1 per shape | sits on hill layers |
| Grass clump | ≤ 60 | vertex colour | 1 (instanced, 900–2600) | double-wound, FrontSide, up normals |
| Ground | the existing plane | 3 tiling 512 WebP + 256 mask | 1 | blend in the shader |
| Tiling texture | — | 512² WebP, ≤ 20 KB each | — | periodic noise plus wrapped brush dabs |
| Whole scene | high: ≤ 450 draws; low: ≤ 250 | total new art ≤ 4.7 MB | — | the gate script enforces this |

## 4. Lighting and atmosphere recipe (three.js r180)
- Directional sun at elevation ~35°, coming in from the camera's front-left. PCFSoft 2048 shadows, frustum fitted to the play area, shadow intensity ~0.8.
- Hemisphere light (sky to earth) is the main fill, plus a weak cool directional fill and a warm rim from behind.
- Physically based /π lighting needs roughly sun 5–6 and hemi 2 at exposure 1.0.
- Use NeutralToneMapping (ACES greys warm paint out).
- FogExp2 with colour = horizon colour, so the yard stays clear while distant layers fade into the horizon.
- Sky dome: vertex-colour gradient (no texture seam) plus a shader sun glow and fbm two-tone clouds.
- Grade pass (high tier only): MSAA half-float target, then one triangle doing tone map, split tone, +6% saturation and a soft vignette.

## 5. Low tier (phones)
No realtime shadows (contact darkening is painted into the ground mask and baked AO is in the atlases). No post pass. Pixel ratio capped at 1.25, scatter at ~35%, sky fbm at 3 octaves. Choose by URL `?quality=`, a stored menu choice, or auto (coarse pointer and small screen, or deviceMemory ≤ 4).

## 6. Pipeline
1. Textures: a numpy script writes tileable masters and WebP output [`art-src/textures/make_textures.py`].
2. Models: a headless Blender script uses bmesh with bevels and boolean insets, smart UV projects, and EMIT-bakes colour × AO into one atlas. It exports a geometry-only .glb plus atlas PNG [`art-src/blender/build_yard_assets.py`]. Blender's -Y front becomes three's +Z.
3. Export and budget: `gltf-transform optimize --compress meshopt --prune-attributes false --join false --flatten false`, then atlas PNG to WebP. The script fails above the byte budget, and with `--capture` above the draw budget [`scripts/art/export-and-budget.mjs`].
4. Runtime: load with GLTFLoader + MeshoptDecoder. Convert quantized attributes to float before merging or transforming. Instance repeats and merge statics.

Pitfalls to check first:
- The CSP needs `'wasm-unsafe-eval'` for the meshopt decoder.
- Embedded glb images use blob: URLs, which a strict connect-src blocks, so ship atlases as separate files.
- DoubleSide flips "up" normals on foliage cards.
- Shader texture reads are linear, so calibrate masks to the tile means.

## 7. Render-and-compare loop
1. Fix the camera (same orbit, pitch and zoom as the reference frame). Probe-project known world points to prove before and after match.
2. Capture headless Chrome with SwiftShader at 1280×800 and at a phone viewport (390×844 @2x) [`scripts/art/capture-yard.mjs`].
3. Record draw calls (info.autoReset=false over one frame, shadow passes included), triangles, and loaded art bytes (raise the resource-timing buffer).
4. Put the shot next to both references and check, in order:
   - silhouette readability
   - value structure: sky lightest, the yard mid-tones, darks only in contact and shade
   - warm/cool split
   - depth layering: fog on hills
   - edge clutter: scatter thick at edges and thin in open lawn
   - finish: no placeholder primitives, no black faces, no floating props
5. Change one family of parameters per iteration, re-run, and keep notes.
