# Codex Prompt — Phase 1E: Tool Equip HUD

## Task

Create a toolbar HUD that shows the player's currently equipped tool and allows switching between tools.

## Context

In Let It Grow mode, players use tools (water, plant, harvest, protect, etc.) by equipping them and then interacting with cells. This replaces the turn-based intervention token system with a real-time tool-use flow.

## Deliverable

Create `src/ui/tool-hud.js`:

```js
export class ToolHUD {
  constructor(container, inputManager, store) {
    // container — DOM element to render into
    // inputManager — for next/prev tool actions
    // store — for reading available tools
  }

  // Set the list of available tools
  setTools(tools) { ... }
  // tools: [{ id: 'water', label: 'Water', icon: '💧', shortcut: '1' }, ...]

  // Get currently selected tool
  getSelectedTool() { ... }

  // Programmatically select a tool
  selectTool(toolId) { ... }

  // Show/hide the HUD
  setVisible(visible) { ... }

  // Cleanup
  dispose() { ... }
}
```

### Default Tools (v0.1)

| ID | Label | Icon | Shortcut | Action |
|----|-------|------|----------|--------|
| `hand` | Hand | ✋ | 1 | Select/inspect cell |
| `water` | Water | 💧 | 2 | Water a cell (applies growth bonus) |
| `plant` | Plant | 🌱 | 3 | Opens crop picker for empty cell |
| `harvest` | Harvest | 🌾 | 4 | Harvest a ready cell |
| `protect` | Protect | 🛡️ | 5 | Apply protection to cell |
| `mulch` | Mulch | 🍂 | 6 | Apply mulch for soil enrichment |

### Visual Design

- Horizontal bar anchored to bottom-center of screen
- Each tool is a 48×48 rounded square (8px radius)
- Active tool has `--sun` (#e8c84a) border + slight scale-up (1.1)
- Inactive tools have `--soil` (#5c3d1e) background, `--cream` (#f7f2ea) icon
- Shortcut number shown in top-right corner of each slot (DM Mono, 10px)
- On mobile: tools are 56×56 for touch targets
- Hover tooltip shows tool name
- Transition: scale + border-color animate on select (150ms ease)

### Input Bindings

- Number keys 1–6 select tools directly
- Tab / ] cycles to next tool (already registered in InputManager)
- Shift+Tab / [ cycles to previous tool
- Click/tap on tool icon selects it

### Integration

- When player interacts with a cell (Phase 1D), the action depends on the selected tool
- InteractionSystem reads `toolHUD.getSelectedTool()` to determine what happens
- PlayerModel (Phase 1A) gets `setEquippedTool(toolId)` called when selection changes

## Constraints

- No external dependencies
- Responsive: works on 320px width mobile screens
- Does not block interaction with the 3D canvas below
- Z-index above canvas but below modals/panels
- Accessible: keyboard navigable, high contrast

## Testing

- Manual: number keys switch tools
- Manual: Tab cycles through tools
- Manual: click/tap selects tool
- Manual: active tool is visually distinct
- Manual: on mobile — all tools reachable, touch targets sufficient
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add tool equip HUD with keyboard and touch support`
- Do NOT push
