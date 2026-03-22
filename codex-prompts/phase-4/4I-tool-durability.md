# Codex Prompt — Phase 4I: Tool Durability

## Task

Modify `src/game/intervention.js` to add durability tracking for tools — each use decrements durability, tools break at 0, and repair is possible.

## Context

Phase 1G added real-time tool actions. Phase 4A added inventory with durability fields on tool items. This task connects them: tool usage costs durability, broken tools can't be used, repair consumes materials.

## Deliverable

### Extend intervention.js

```js
// Modify executeToolAction to check and decrement durability
export function executeToolAction(store, toolId, cellIndex) {
  const inventory = store.getState().campaign.inventory;

  // Find equipped tool in inventory
  const toolSlot = findEquippedTool(inventory, toolId);
  if (!toolSlot) return { success: false, reason: 'Tool not in inventory' };

  // Check durability
  if (toolSlot.durability <= 0) return { success: false, reason: 'Tool is broken — repair needed' };

  // ... existing tool action logic ...

  // Deduct durability
  store.dispatch({ type: 'USE_TOOL', payload: { slotIndex: toolSlot.index, durabilityCost: 1 } });

  return result;
}

// Repair a tool — consumes materials, restores durability
export function repairTool(store, inventory, slotIndex) {
  const slot = inventory.getSlots()[slotIndex];
  if (!slot || slot.category !== 'tools') return { success: false, reason: 'Not a tool' };

  const repairCost = getRepairCost(slot.itemId);
  // Check materials in inventory
  for (const mat of repairCost) {
    if (!inventory.hasItem(mat.itemId, mat.count)) {
      return { success: false, reason: `Need ${mat.count}x ${mat.name}` };
    }
  }

  // Remove materials and restore durability
  for (const mat of repairCost) {
    inventory.removeItem(mat.itemId, mat.count);
  }
  store.dispatch({ type: 'REPAIR_TOOL', payload: { slotIndex, restoredTo: getMaxDurability(slot.itemId) } });

  return { success: true, message: 'Tool repaired!' };
}
```

### Durability Table

| Tool | Max Durability | Uses Per Point | Repair Materials |
|------|---------------|----------------|-----------------|
| watering_can | 100 | 1 water = 1 point | 2x plant_matter |
| pruning_shears | 50 | 1 prune = 1 point | 1x scrap_metal |
| soil_scanner | 30 | 1 scan = 1 point | 1x crystal_shard |
| fertilizer_bag | N/A | Consumable (stacks) | N/A |
| pest_spray | N/A | Consumable (stacks) | N/A |

### Store Actions

- `USE_TOOL` — { slotIndex, durabilityCost }
- `REPAIR_TOOL` — { slotIndex, restoredTo }

### Skill Integration

- Crafting level 5 buff: produced tools get `+10 max durability`
- Crafting level 10: masterwork tools have `1.5x durability`

### Warning States

| Durability % | State | Visual |
|-------------|-------|--------|
| > 50% | Good | Green bar |
| 25–50% | Worn | Yellow bar |
| 1–25% | Critical | Red bar, pulse animation |
| 0% | Broken | Grey, strikethrough icon |

## Constraints

- Hand tool (id: 'hand') has infinite durability (no tracking)
- Consumable items (fertilizer, pest spray) are used by removing from inventory, not durability
- Durability can't exceed max (repair restores to max, not beyond)
- All mutations through Store
- No external dependencies

## Testing

- Unit test: tool use decrements durability
- Unit test: broken tool (0 durability) can't be used
- Unit test: repair restores durability, consumes materials
- Unit test: repair fails if missing materials
- Unit test: hand tool never breaks
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add tool durability system with use tracking and repair`
- Do NOT push
