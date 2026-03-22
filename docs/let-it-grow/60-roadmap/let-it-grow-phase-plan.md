# Let It Grow — Phase Plan

## Phase Overview

| Phase | Goal | Foundation |
|-------|------|------------|
| v0.1 | Playable garden loop | Story Mode already delivers this |
| v0.2 | NPC + quests | Extend speakers/cutscene system |
| v0.3 | Seasonal system enhancements | Build on existing 4-season engine |
| v0.4 | Inventory + skills | Expand backpack, add skill tree |
| v1.0 | Open-world + multiplayer | New zone system + networking |

---

## v0.1 — Playable Garden Loop

**Status**: Effectively complete via Story Mode.

### What Exists
- Plant crops on 8×4 grid
- Seasonal events affect growth
- 6-factor scoring with harvest grades
- Multi-slot save/load
- Full Three.js rendering with weather

### Gap
- Add free-roam input (WASD/touch) to replace pure grid-click
- Add real-time watering/tool use as alternative to turn-based
- Player avatar on screen

### Deliverable
A single-garden sandbox where you walk around, plant, water, and harvest in real-time — with the existing scoring and event systems running underneath.

---

## v0.2 — NPC + Quests

### New Systems
- **Quest state machine**: AVAILABLE → ACCEPTED → IN_PROGRESS → COMPLETE
- **NPC profiles**: Old Gus, Maya, Lila + 4 neighbor templates
- **Reputation tracking**: Per-NPC, 0–100 scale
- **Dialogue branching**: Choice buttons in dialogue panel
- **Neighborhood zone**: Walk to NPC locations

### Build On
- `speakers.js` → add new NPC entries
- `portraits.js` → add new character art
- `cutscene-machine.js` → add branching beat support
- `dialogue-panel.js` → add choice button rendering
- `state.js` → add quest log + reputation to campaign state

### Quest Content (Initial Set)
- 3 quests per core NPC (9 total)
- 4 rotating neighbor quests
- Mix of fetch, assist, discover types

---

## v0.3 — Seasonal System Enhancements

### New Features
- Optional day/night visual cycle
- Real-time growth toggle (server clock or local timer)
- Monthly event rotations
- 4 seasonal festivals with unique mechanics
- Audio system (ambient + SFX per season)

### Build On
- `weather-fx.js` → add day/night lighting transitions
- `events.js` → add monthly rotation logic
- `garden-scene.js` → add audio integration points
- `season-calendar.js` → show real-time countdown option

---

## v0.4 — Inventory + Skills

### New Systems
- **Full inventory**: 20–40 slot grid with drag/drop, stacking
- **Skill tree**: 6 skills × 10 levels with passive buffs
- **Crafting bench**: Combine materials → tools/items
- **Tool durability**: Use count before repair needed

### Build On
- `backpack-panel.js` → rebuild as slot grid
- `intervention.js` → tools consume from inventory
- `state.js` → add skills + inventory to campaign state

### UI Additions
- Skill tree visualization panel
- Crafting bench modal
- Tool condition indicator in HUD

---

## v1.0 — Open World + Multiplayer

### Open World
- 6–8 explorable zones with transitions
- Biome-specific crops and events
- Zone unlock via reputation/skills
- Full world map UI

### Multiplayer
- Async: visit friends' gardens (read-only snapshots)
- Co-op: shared seasonal tasks
- Server sync: persistent world state via WebSocket

### Infrastructure
- Account system (auth)
- Cloud save (replace localStorage)
- State sync protocol
- Anti-cheat for competitive elements

---

## Timeline Estimates

> These are rough ranges, not commitments.

| Phase | Solo Dev | Small Team (2–3) |
|-------|----------|-------------------|
| v0.1 gap close | 2–4 weeks | 1–2 weeks |
| v0.2 | 4–8 weeks | 2–4 weeks |
| v0.3 | 3–6 weeks | 2–3 weeks |
| v0.4 | 4–8 weeks | 2–4 weeks |
| v1.0 | 3–6 months | 2–3 months |
