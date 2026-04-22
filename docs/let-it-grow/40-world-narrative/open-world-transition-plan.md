# Open World Transition Plan

## From Story Mode to Let It Grow

### What Changes

| Aspect | Story Mode | Let It Grow |
|--------|-----------|-------------|
| Movement | Click grid cells | Free-roam (WASD/touch) |
| Scope | Single 8×4 bed | Neighborhood + zones |
| Time | Turn-based (6 phases/season) | Real-time option |
| NPCs | Commentators | Quest-givers |
| Camera | Fixed presets | Player-controlled |
| Progression | 12 chapters → done | Open-ended |

### What Stays

| System | Why |
|--------|-----|
| Scoring algorithm | Core quality mechanic, proven |
| Crop data + factions | Content foundation |
| Event deck + engine | Weather/challenge system |
| Save architecture | Multi-slot pattern works |
| Seasonal rendering | Visual identity |
| Character portraits | Reusable + extendable |
| Cutscene machine | Quest dialogue foundation |
| Design system (CSS) | Brand consistency |

## World Map Architecture

### Zones

```
Player Plot (start)
├── Front Yard → Neighborhood Hub
│   ├── Old Gus's Garden (reputation-gated)
│   ├── Maya's Workshop (quest-gated)
│   ├── Lila's Kitchen Garden (chapter-gated)
│   └── Community Plot (seasonal events)
├── Back Gate → Expansion Zones
│   ├── Meadow (Foraging 3 required)
│   ├── Riverside (Exploration quest)
│   ├── Forest Edge (Reputation: Gus Friend)
│   └── Greenhouse (Crafting 5 required)
└── Side Path → Event Areas
    ├── Festival Grounds (seasonal)
    └── Market Square (trading)
```

### Zone Loading Strategy
- Each zone is an independent Three.js scene
- Transition via fade-out → load → fade-in
- Player state persists across zones
- Only active zone renders (no background loading initially)

## Implementation Phases

### Phase 1: Free-Roam on Existing Plot
- Add player character (sprite or low-poly model)
- WASD/touch movement within garden boundaries
- Camera follows player
- Interact with bed cells by proximity (not click)
- Tools as equipped items

### Phase 2: Neighborhood
- Add zone transitions (walk to edge → fade → new scene)
- NPC locations as interactive spots
- Quest system active
- 3–4 zones total

### Phase 3: Expansion
- Unlock gates via reputation/skills
- New biome scenes with unique crops
- Foraging mechanic in wild zones
- 6–8 zones total

### Phase 4: Events + Polish
- Festival grounds with seasonal activities
- Market/trading area
- Dynamic NPC movement between zones
- Full audio integration

## Technical Risks

| Risk | Mitigation |
|------|------------|
| Scene memory — too many zones loaded | Strict single-scene-at-a-time, dispose on exit |
| Player movement feel — janky on mobile | Start with simple top-down, iterate on feel |
| State complexity — zone + quest + inventory | Central state store, strict mutation flow |
| Backward compat — Story Mode breaks | Story Mode runs as isolated mode, shared data only |

## Current Phase 5 Preproduction Gate

### Slice Order

1. Zone registry and world map contract
   - Lock zone ids, gate metadata, and travel graph in `specs/WORLD_MAP.json`
   - Keep current `player_plot` and `neighborhood` ids stable as the migration baseline
2. Scene dispose and navigation smoke
   - Define the load, unload, and dispose contract for every zone scene before content expansion
   - Add one smoke path that travels away from `player_plot`, returns, and verifies no leaked references or broken HUD state
3. Multi-bed persistence contract
   - Treat per-zone beds as additive save data under the existing game namespace
   - Keep `activeBedId` authoritative for the currently mounted bed
4. Foraging and material loop
   - Introduce foraging as the first open-world gameplay loop because it feeds crafting without changing the core scoring contract
   - Validate material pickup, inventory entry, and save round-trip before biome crop expansion
5. Biome crop rollout
   - Add biome crops to the shared crop data only after zone, bed, and foraging persistence are stable
   - Keep additions additive so planner and Story Mode can read the same data without a rename window

### Migration and Rollback Rules

- `specs/CROP_SCORING_DATA.json` remains additive-only during Phase 5
- Shared scoring function inputs stay frozen after planner Phase 5; game-side biome work may add inputs but not remove or rename them
- Save changes stay inside the game namespace unless a separate cross-track review approves a shared-field change
- Rollback path for partial open-world work is single-bed mode with the new zone data ignored on load

### First Smoke Script

1. Start in `player_plot`
2. Travel to one unlocked non-home zone
3. Forage one material pickup
4. Return to the home plot
5. Save and reload
6. Verify active zone, inventory pickup, and home bed state persisted
