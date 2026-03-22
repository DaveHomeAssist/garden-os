# Intervention System

## Current Implementation

The intervention system enables player actions during seasonal events. Players allocate tokens to protect crops or enhance growth on specific grid cells.

### Available Actions (6 types)

| Action | Effect | Target |
|--------|--------|--------|
| Protect | Shields cell from event damage | Single cell |
| Mulch | Growth bonus + carry-forward enrichment | Single cell |
| Companion Patch | Intervention bonus modifier | Single cell |
| Prune | Remove crop from cell | Single cell |
| Swap | Exchange adjacent crops | Two adjacent cells |
| Accept Loss | No-op (skip action) | None |

### Targeting Rules
- `getTargetableCells()` and `getPlantedIndices()` validate targets
- Adjacency uses cardinal directions only (no diagonals)
- Source: `src/game/intervention.js`

### Token Economy
- Players receive tokens at season start
- Each action costs one token
- Unused tokens expire at season end
- Token count scales with chapter progression

### Persistence
- Mulch creates "enriched" carry-forward (positive)
- Event damage creates "compacted" carry-forward (negative)
- Effects persist across seasons via `carryForward` cell field

## Let It Grow Extensions

### Tool-Based System
Shift from abstract tokens to inventory-based tools:

| Tool | Replaces | Source |
|------|----------|--------|
| Watering Can | (new) | Crafting / starter |
| Fertilizer Bag | Mulch token | Crafting |
| Pest Spray | Protect token | Crafting / shop |
| Pruning Shears | Prune token | Quest reward |
| Transplant Trowel | Swap token | Crafting |

### New Interventions
- **Transplanting** — move crop to different cell/bed
- **Grafting** — combine crop variants
- **Cover Cropping** — plant nitrogen-fixers between seasons
- **Barrier Construction** — permanent protection structures

### Real-Time Events
- Events trigger in real-time (not just phase transitions)
- Player responds with equipped tools
- Response time affects outcome severity
