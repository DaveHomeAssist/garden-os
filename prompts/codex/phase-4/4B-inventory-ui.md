# Codex Prompt — Phase 4B: Inventory UI (Backpack Panel Rebuild)

## Task

Rebuild `src/ui/backpack-panel.js` from a simple keepsake/recipe display into a full slot-based inventory grid with drag-and-drop.

## Current State

`backpack-panel.js` renders:
- Keepsakes (7 collectible items)
- Recipes (matched recipe display)
- Pantry (harvested crop counts)
- Season trail (chapter progress)

These existing views should be preserved as tabs within the panel.

## Deliverable

Rebuild `src/ui/backpack-panel.js`:

### Panel Structure

```
┌─────────────────────────────────┐
│ [Inventory] [Keepsakes] [Pantry]│  ← Tab bar
├─────────────────────────────────┤
│ ┌──┬──┬──┬──┬──┐               │
│ │🍅│🌿│💧│  │  │  Row 1        │
│ ├──┼──┼──┼──┼──┤               │
│ │🔧│  │  │  │  │  Row 2        │
│ ├──┼──┼──┼──┼──┤               │  ← 5-column grid
│ │  │  │  │  │  │  Row 3        │
│ ├──┼──┼──┼──┼──┤               │
│ │  │  │  │  │  │  Row 4        │
│ └──┴──┴──┴──┴──┘               │
│ Capacity: 8/20  [▓▓▓▓░░░░░░]   │  ← Capacity bar
├─────────────────────────────────┤
│ Selected: Tomato Seeds (x12)    │  ← Detail row
│ [Use] [Drop]                    │
└─────────────────────────────────┘
```

### Grid Specs

| Property | Value |
|----------|-------|
| Columns | 5 |
| Rows | capacity / 5 (4 at 20, 6 at 30, 8 at 40) |
| Cell size | 48×48px (56×56px on mobile) |
| Cell gap | 4px |
| Cell radius | 8px |
| Empty cell bg | `var(--cream-dark)` with dashed border |
| Filled cell bg | `var(--cream)` with solid border |
| Selected cell | `var(--sun)` border (2px) |

### Drag and Drop

- Pointer down on filled slot: pick up item (slot shows ghosted)
- Drag: item icon follows pointer (absolutely positioned, z-index 1000)
- Drop on empty slot: move item
- Drop on same-type stackable slot: merge stacks (up to maxStack)
- Drop on different-item slot: swap items
- Drop outside grid: cancel (return to original slot)
- Touch: long-press (300ms) to pick up, drag, release to drop

### Item Display in Slot

- Category-colored background tint (seeds: green, tools: brown, materials: grey, quest: gold)
- Item icon (emoji from ITEM_REGISTRY)
- Stack count badge (bottom-right, DM Mono 10px, if count > 1)
- Durability bar (bottom, thin 2px bar, green→yellow→red) for tools

### Detail Row (on select)

- Shows: item name, count, description
- Action buttons: [Use] (context-dependent), [Drop] (not for quest items)
- Use action depends on item type:
  - Seeds: opens planting mode
  - Tools: equips in tool HUD
  - Materials: no direct use
  - Quest items: "Needed for: [quest name]"

### Tab Integration

- Tab bar at top: Inventory (new), Keepsakes (existing), Pantry (existing)
- Default tab: Inventory
- Keepsakes and Pantry tabs render existing content unchanged

## Constraints

- No external dependencies
- Drag-and-drop must work on mobile (touch) and desktop (mouse)
- Must not conflict with game canvas interactions (pointer events properly contained)
- Panel opens/closes with existing backpack button
- Accessible: keyboard navigation through grid (arrow keys + Enter to select)
- Responsive: works at 320px width

## Testing

- Manual: drag item to empty slot — moves
- Manual: drag stackable onto same type — merges
- Manual: drag to different item — swaps
- Manual: touch drag works on mobile
- Manual: select item — detail row shows correct info
- Manual: keepsakes and pantry tabs still work
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: rebuild backpack panel as slot-based inventory grid with drag-and-drop`
- Do NOT push
