# Rendering Architecture

## Stack

- **Engine**: Three.js 0.180.x (WebGL)
- **Shadow mapping**: WebGL shadow maps
- **Tone mapping**: ACES filmic
- **Canvas**: Responsive, resizes with viewport

## Architecture Separation

Game logic is **event-driven** (phase machine, interventions, cutscene triggers). Rendering is **frame-driven** (requestAnimationFrame). The scene syncs to game state each frame but never mutates it.

## Lighting Rig

| Light | Type | Purpose |
|-------|------|---------|
| Hemisphere | Ambient | Base illumination (sky + ground) |
| Directional | Sun | Primary shadow-casting light |
| Fill | Point/Spot | Soften harsh shadows |
| Rim | Directional | Edge definition on crops/bed |

### Mood Presets (8 states)

| Mood | Context |
|------|---------|
| Dawn | Spring mornings, chapter opens |
| Calm | Default gameplay |
| Storm | Weather events |
| Heat | Summer peak, drought events |
| Harvest Gold | Harvest phase scoring |
| Night | Winter, dormancy |
| Celebration | High scores, recipe completion |
| Loss | Crop damage, failure beats |

## Garden Bed Model

- 8×4 cedar frame with beveled edges
- 32 soil cells with procedural height/color variation
- Back lattice trellis (wire + cedar posts)
- Front chicken wire critter guard
- Grid overlay with row/column labels
- Source: `src/scene/bed-model.js`

## Crop Visualization

### 8 Faction Render Styles

| Faction | Visual |
|---------|--------|
| Climbers | Tall stems, vine geometry on trellis |
| Fast Cycles | Low, spread leaf clusters |
| Greens | Broad leaf canopy |
| Roots | Minimal above-ground, soil mound |
| Herbs | Small bushy clusters |
| Fruiting | Medium height, fruit geometry |
| Brassicas | Rosette leaf pattern |
| Companions | Flower head geometry |

### Support Props
- Stakes (for climbing crops)
- Mulch (brown ground cover)
- Protection domes (translucent shield)
- Damage indicators (wilt, frost, pest marks)

## Scenery System

### Static Props
- House facade with porch
- Fence (picket or chain-link)
- Landscape (grass plane, distant trees)

### Animated Elements
- Drifting clouds (seasonal palette)
- Particle smoke (chimney)
- Fireflies (summer, pulsing opacity)
- Butterflies (sine-wave flight path)
- Seasonal leaves (fall, drift + settle)
- Snow particles (winter)
- Reflective puddles (after rain)

### Seasonal Swaps
- Tree color palettes shift per season
- Props appear/disappear (flower pots spring, pumpkins fall)
- Ground plane color temperature changes

## Camera System

### Controls
- Orbit with spherical coordinate clamping
- Zoom range: 4.4–11.5
- Touch support (pinch zoom, drag orbit)

### Preset Poses (6)

| Preset | Use |
|--------|-----|
| Overview | Default gameplay view |
| Closeup | Cell inspection, scoring detail |
| Side | Trellis visibility, row context |
| Birds | Full bed from above |
| Chapter Intro | Cinematic opening angle |
| Harvest Hero | Low dramatic angle for scoring |

### Transitions
- Lerp-based smooth interpolation between presets
- Duration configurable per transition
- Triggered by phase changes and cutscene cues

## Interaction

- **Raycaster**: Cell picking via Three.js Raycaster
- **Hover**: Highlight cell on mouseover/touch
- **Mobile**: Enlarged touch targets for accessibility
- Source: `src/scene/garden-scene.js`
