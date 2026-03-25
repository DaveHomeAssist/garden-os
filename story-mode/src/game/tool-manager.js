import {
  findToolSlotIndex,
  applyToolDurabilityToInventoryState,
  repairToolInInventoryState,
  normalizeInventoryState,
} from './inventory.js';

const DEFAULT_TOOLS = [
  { id: 'watering_can', name: 'Watering Can', icon: '\u{1F4A7}', action: 'WATER_CELL', durability: 100, cooldownMs: 0 },
  { id: 'pruning_shears', name: 'Pruning Shears', icon: '\u{2702}\u{FE0F}', action: 'PRUNE_CELL', durability: 50, cooldownMs: 0 },
  { id: 'soil_scanner', name: 'Soil Scanner', icon: '\u{1F4E1}', action: 'SCAN_CELL', durability: 30, cooldownMs: 0 },
  { id: 'smart_watering_can', name: 'Smart Watering Can', icon: '\u{1F6BF}', action: 'WATER_CELL', durability: 80, cooldownMs: 0 },
];

export class ToolManager {
  constructor(store, inventory) {
    this.store = store;
    this.inventory = inventory;
    this._registry = new Map();
    this._selectedToolId = null;

    for (const tool of DEFAULT_TOOLS) {
      this.registerTool(tool.id, {
        name: tool.name,
        icon: tool.icon,
        action: tool.action,
        durability: tool.durability,
        cooldownMs: tool.cooldownMs,
      });
    }
  }

  registerTool(id, { name, icon, action, durability, cooldownMs = 0 }) {
    this._registry.set(id, {
      id,
      name,
      icon,
      action,
      durability,
      cooldownMs,
    });
  }

  getTool(id) {
    return this._registry.get(id) ?? null;
  }

  getAllTools() {
    return [...this._registry.values()];
  }

  selectTool(toolId) {
    const def = this.getTool(toolId);
    this._selectedToolId = def ? toolId : null;
    return def;
  }

  getSelectedTool() {
    if (!this._selectedToolId) return null;
    return this.getTool(this._selectedToolId);
  }

  canUseTool(toolId, cellIndex) {
    const def = this.getTool(toolId);
    if (!def) return false;

    const durability = this.getToolDurability(toolId);
    if (!durability || durability.current <= 0) return false;

    const state = this.store.getState();
    const cooldowns = state.season?.toolCooldowns ?? {};
    const key = `${toolId}_${cellIndex}`;
    const until = cooldowns[key] ?? 0;
    if (until > Date.now()) return false;

    return true;
  }

  useTool(toolId, cellIndex) {
    if (!this.canUseTool(toolId, cellIndex)) {
      return { success: false };
    }

    const def = this.getTool(toolId);
    const inventoryState = this._getInventoryState();
    const slotIndex = findToolSlotIndex(inventoryState, toolId);

    if (slotIndex < 0) {
      return { success: false };
    }

    this.store.dispatch({
      type: 'USE_TOOL',
      payload: { slotIndex, durabilityCost: 1 },
    });

    if (def.cooldownMs > 0) {
      this.store.dispatch({
        type: 'SET_COOLDOWN',
        payload: {
          toolId,
          cellIndex,
          key: `${toolId}_${cellIndex}`,
          until: Date.now() + def.cooldownMs,
        },
      });
    }

    return { success: true, costDurability: 1 };
  }

  getToolDurability(toolId) {
    const inventoryState = this._getInventoryState();
    const slotIndex = findToolSlotIndex(inventoryState, toolId);
    if (slotIndex < 0) return null;

    const slot = inventoryState.slots[slotIndex];
    if (!slot) return null;

    return {
      current: slot.durability ?? slot.maxDurability ?? 0,
      max: slot.maxDurability ?? slot.durability ?? 0,
    };
  }

  repairTool(toolId, restoredTo) {
    const inventoryState = this._getInventoryState();
    const slotIndex = findToolSlotIndex(inventoryState, toolId);
    if (slotIndex < 0) return { success: false };

    this.store.dispatch({
      type: 'REPAIR_TOOL',
      payload: { slotIndex, restoredTo },
    });

    return { success: true };
  }

  dispose() {
    this._registry.clear();
    this._selectedToolId = null;
  }

  _getInventoryState() {
    const state = this.store.getState();
    return normalizeInventoryState(state.campaign?.inventory);
  }
}
