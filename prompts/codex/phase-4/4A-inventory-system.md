# Codex Prompt — Phase 4A: Inventory System

## Task

Create `src/game/inventory.js` — a slot-based inventory system (RuneScape style) with stacking, categories, and capacity upgrades.

## Deliverable

Create `src/game/inventory.js`:

```js
export const ItemCategories = {
  SEEDS: 'seeds',
  TOOLS: 'tools',
  MATERIALS: 'materials',
  QUEST_ITEMS: 'quest_items',
  DECOR: 'decor',
};

export class Inventory {
  constructor(store, capacity = 20) {
    // store — from Phase 0B
    // capacity — max slots (upgradeable: 20 → 30 → 40)
  }

  // Get all slots: [{ itemId, category, count, durability?, metadata? } | null]
  getSlots() { ... }

  // Add an item — finds existing stack or empty slot
  // Returns { success: boolean, slotIndex: number, reason?: string }
  addItem(itemId, count = 1) { ... }

  // Remove items from inventory
  // Returns { success: boolean, removed: number }
  removeItem(itemId, count = 1) { ... }

  // Check if player has N of an item
  hasItem(itemId, count = 1) { ... }

  // Get count of a specific item across all slots
  getItemCount(itemId) { ... }

  // Move item between slots (for drag/drop UI)
  moveSlot(fromIndex, toIndex) { ... }

  // Split a stack (move N items from one slot to an empty slot)
  splitStack(fromIndex, count, toIndex) { ... }

  // Get capacity info
  getCapacity() { return { used, total, canUpgrade } }

  // Upgrade capacity (20 → 30 → 40)
  upgradeCapacity() { ... }

  // Get items by category
  getItemsByCategory(category) { ... }

  // Cleanup
  dispose() { ... }
}
```

### Item Registry

Items are defined in a registry (similar to crop data):

```js
export const ITEM_REGISTRY = {
  // Seeds
  tomato_seed: { id: 'tomato_seed', name: 'Tomato Seeds', category: 'seeds', stackable: true, maxStack: 99, cropId: 'tomato_01' },
  basil_seed: { id: 'basil_seed', name: 'Basil Seeds', category: 'seeds', stackable: true, maxStack: 99, cropId: 'basil_01' },
  // ... one seed per crop type (50 total — see CROP_SCORING_DATA.json v3)

  // Tools
  watering_can: { id: 'watering_can', name: 'Watering Can', category: 'tools', stackable: false, durability: 100 },
  pruning_shears: { id: 'pruning_shears', name: 'Pruning Shears', category: 'tools', stackable: false, durability: 50 },
  soil_scanner: { id: 'soil_scanner', name: 'Soil Scanner', category: 'tools', stackable: false, durability: 30 },
  fertilizer_bag: { id: 'fertilizer_bag', name: 'Fertilizer', category: 'materials', stackable: true, maxStack: 20 },
  pest_spray: { id: 'pest_spray', name: 'Pest Spray', category: 'materials', stackable: true, maxStack: 10 },
  // ... more in Phase 4G crafting recipes

  // Quest items
  // These are defined by quest specs — non-stackable, non-removable until quest complete
};

export function getItemDef(itemId) { return ITEM_REGISTRY[itemId]; }
```

### Stacking Rules

- Stackable items fill existing stacks first (up to maxStack), then use new slots
- Non-stackable items always use one slot each (tools with individual durability)
- Quest items are locked — can't be dropped or moved to certain slots

### Store Integration

Add actions:
- `ADD_ITEM` — { itemId, count }
- `REMOVE_ITEM` — { itemId, count }
- `MOVE_SLOT` — { fromIndex, toIndex }
- `SPLIT_STACK` — { fromIndex, count, toIndex }
- `UPGRADE_INVENTORY` — {}

State: `campaign.inventory: { slots: Array<SlotData|null>, capacity: number, tier: 1|2|3 }`

## Constraints

- No external dependencies
- All mutations through Store
- Inventory is serializable (for save system)
- Performance: adding/removing items should be O(slots) at worst
- No item duplication bugs — counts must be exact

## Testing

Write `src/game/inventory.test.js`:
- Add stackable item: fills existing stack, overflow to new slot
- Add non-stackable item: uses new slot
- Add to full inventory: returns failure
- Remove partial stack: count decreases
- Remove more than available: returns partial removal
- moveSlot: items swap correctly
- splitStack: counts are correct in both slots
- upgradeCapacity: 20 → 30 → 40, third upgrade fails
- hasItem: true/false based on count
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add slot-based inventory system with stacking and capacity upgrades`
- Do NOT push
