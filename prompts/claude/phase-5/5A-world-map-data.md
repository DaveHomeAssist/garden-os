# Claude Prompt — Phase 5A: World Map Data Specification

## Task

Author `specs/WORLD_MAP.json` — the canonical world map defining all zones, their connections, gate requirements, and content.

## What to Define

### Zone Registry

```json
{
  "version": 1,
  "zones": {
    "player_plot": {
      "id": "player_plot",
      "name": "Your Garden",
      "description": "Home base — your 8×4 raised cedar bed.",
      "biome": "suburban",
      "connections": ["neighborhood"],
      "gate": null,
      "features": ["garden_bed", "tool_shed"],
      "bounds": { "minX": -2.5, "maxX": 2.5, "minZ": -2.0, "maxZ": 2.0 },
      "spawnPoint": { "x": 0, "z": 1.5 },
      "foraging": false,
      "npcs": [],
      "seasonalVariation": true
    },
    ...
  }
}
```

### Zones to Define (8 total)

| Zone | Biome | Gate | Features | Foraging |
|------|-------|------|----------|----------|
| player_plot | Suburban | None | Garden bed, tool shed | No |
| neighborhood | Suburban | None | NPC locations, community plot | No |
| meadow | Grassland | Foraging L3 | Wildflowers, herb patches, rock piles | Yes |
| riverside | Wetland | Quest "gus_river_path" | Driftwood, reeds, fish pond | Yes |
| forest_edge | Woodland | Gus reputation: Friend | Mushroom logs, berry bushes, shade garden | Yes |
| greenhouse | Indoor | Crafting L5 | Year-round growing, rare seeds | No (shop) |
| festival_grounds | Festive | Active festival | Seasonal activities, market stalls | No |
| market_square | Urban | Social L2 | NPC trading, seed exchange | No (trade) |

### Connection Graph

```
player_plot ←→ neighborhood
neighborhood ←→ meadow
neighborhood ←→ forest_edge
neighborhood ←→ market_square
meadow ←→ riverside
forest_edge ←→ greenhouse
neighborhood ←→ festival_grounds (seasonal)
```

### Zone Details

For each zone, specify:
1. **Visual theme** — colors, primary elements, atmosphere
2. **Walkable bounds** — rectangular area in world units
3. **Exit points** — where transitions trigger (edge positions + destination)
4. **NPC slots** — positions where NPCs can appear (season-dependent)
5. **Interactable points** — foraging spots, objects, signs
6. **Ambient audio** — which track to play (references AUDIO_SPEC.md)
7. **Seasonal variation** — what changes per season

### Biome-Specific Crops (define per zone)

| Zone | Exclusive Crops | Why |
|------|----------------|-----|
| meadow | Wildflower varieties, clover | Grassland habitat |
| riverside | Watercress, wild rice | Wetland habitat |
| forest_edge | Mushrooms, ferns, woodland herbs | Shade habitat |
| greenhouse | Tropical crops (no frost penalty) | Controlled environment |

## Deliverable

- `specs/WORLD_MAP.json` — complete zone registry
- All 8 zones fully specified
- Connection graph defines all valid transitions
- Gate requirements reference existing systems (reputation, skills, quests)
- Biome crops documented for CROP_SCORING_DATA.json extension

## After completing changes

- Commit with message: `spec: author world map with 8 zones, connections, and gate requirements`
- Do NOT push
