import { getAllCrops } from '../data/crops.js';

export const ItemCategories = {
  SEEDS: 'seeds',
  TOOLS: 'tools',
  MATERIALS: 'materials',
  QUEST_ITEMS: 'quest_items',
  DECOR: 'decor',
};

const CAPACITY_BY_TIER = {
  1: 20,
  2: 30,
  3: 40,
};

const ITEM_BASE = {
  watering_can: { id: 'watering_can', name: 'Watering Can', icon: '💧', category: ItemCategories.TOOLS, stackable: false, durability: 100, description: 'Waters a planted cell.' },
  smart_watering_can: { id: 'smart_watering_can', name: 'Smart Watering Can', icon: '🚿', category: ItemCategories.TOOLS, stackable: false, durability: 80, description: 'Advanced watering tool.' },
  pruning_shears: { id: 'pruning_shears', name: 'Pruning Shears', icon: '✂️', category: ItemCategories.TOOLS, stackable: false, durability: 50, description: 'Trim and maintain crops.' },
  soil_scanner: { id: 'soil_scanner', name: 'Soil Scanner', icon: '📡', category: ItemCategories.TOOLS, stackable: false, durability: 30, description: 'Reads hidden soil conditions.' },
  fertilizer_bag: { id: 'fertilizer_bag', name: 'Fertilizer', icon: '🧪', category: ItemCategories.MATERIALS, stackable: true, maxStack: 20, description: 'Consumable soil booster.' },
  pest_spray: { id: 'pest_spray', name: 'Pest Spray', icon: '🪲', category: ItemCategories.MATERIALS, stackable: true, maxStack: 10, description: 'Consumable pest protection.' },
  mulch_bag: { id: 'mulch_bag', name: 'Mulch Bag', icon: '🪵', category: ItemCategories.MATERIALS, stackable: true, maxStack: 10, description: 'Consumable moisture-retaining mulch.' },
  compost: { id: 'compost', name: 'Compost', icon: '♻️', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  plant_matter: { id: 'plant_matter', name: 'Plant Matter', icon: '🌿', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  dried_leaves: { id: 'dried_leaves', name: 'Dried Leaves', icon: '🍂', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  plant_fiber: { id: 'plant_fiber', name: 'Plant Fiber', icon: '🧵', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  herb_extract: { id: 'herb_extract', name: 'Herb Extract', icon: '🧴', category: ItemCategories.MATERIALS, stackable: true, maxStack: 30 },
  scrap_metal: { id: 'scrap_metal', name: 'Scrap Metal', icon: '🔩', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  wood: { id: 'wood', name: 'Wood', icon: '🪵', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', icon: '🔷', category: ItemCategories.MATERIALS, stackable: true, maxStack: 50 },
  lens: { id: 'lens', name: 'Lens', icon: '🔍', category: ItemCategories.MATERIALS, stackable: true, maxStack: 20 },
  mechanism: { id: 'mechanism', name: 'Mechanism', icon: '⚙️', category: ItemCategories.MATERIALS, stackable: true, maxStack: 20 },
  rare_earth: { id: 'rare_earth', name: 'Rare Earth', icon: '💎', category: ItemCategories.MATERIALS, stackable: true, maxStack: 25 },
  garden_twine: { id: 'garden_twine', name: 'Garden Twine', icon: '🪢', category: ItemCategories.MATERIALS, stackable: true, maxStack: 50 },
  stone: { id: 'stone', name: 'Stone', icon: '🪨', category: ItemCategories.MATERIALS, stackable: true, maxStack: 99 },
  fresh_berries: { id: 'fresh_berries', name: 'Fresh Berries', icon: '🫐', category: ItemCategories.MATERIALS, stackable: true, maxStack: 40 },
  dried_herbs: { id: 'dried_herbs', name: 'Dried Herbs', icon: '🌾', category: ItemCategories.MATERIALS, stackable: true, maxStack: 40 },
  mushroom_spores: { id: 'mushroom_spores', name: 'Mushroom Spores', icon: '🍄', category: ItemCategories.MATERIALS, stackable: true, maxStack: 40 },
  trellis_kit: { id: 'trellis_kit', name: 'Trellis Kit', icon: '🪜', category: ItemCategories.DECOR, stackable: true, maxStack: 5 },
  festival_token: { id: 'festival_token', name: 'Festival Token', icon: '🎟️', category: ItemCategories.QUEST_ITEMS, stackable: true, maxStack: 99 },
  festival_seed_bundle: { id: 'festival_seed_bundle', name: 'Festival Seed Bundle', icon: '🎁', category: ItemCategories.QUEST_ITEMS, stackable: true, maxStack: 10 },
  heirloom_herb_seed: { id: 'heirloom_herb_seed', name: 'Heirloom Herb Seeds', icon: '🌿', category: ItemCategories.SEEDS, stackable: true, maxStack: 25 },
};

function toTitleCase(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSeedItemId(cropId) {
  return `${String(cropId).replace(/_\d+$/, '')}_seed`;
}

function buildSeedRegistry() {
  const entries = {};
  for (const crop of getAllCrops()) {
    const itemId = getSeedItemId(crop.id);
    if (entries[itemId]) continue;
    entries[itemId] = {
      id: itemId,
      name: `${crop.name} Seeds`,
      icon: crop.emoji ?? '🌱',
      category: ItemCategories.SEEDS,
      stackable: true,
      maxStack: 99,
      cropId: crop.id,
      description: `Seeds for ${crop.name}.`,
    };
  }
  return entries;
}

export const ITEM_REGISTRY = {
  ...buildSeedRegistry(),
  ...ITEM_BASE,
};

function cloneSlot(slot) {
  return slot ? structuredClone(slot) : null;
}

function createEmptySlots(capacity) {
  return Array.from({ length: capacity }, () => null);
}

export function getItemDef(itemId) {
  if (ITEM_REGISTRY[itemId]) return ITEM_REGISTRY[itemId];
  if (String(itemId).endsWith('_seed')) {
    return {
      id: itemId,
      name: `${toTitleCase(itemId.replace(/_seed$/, ''))} Seeds`,
      icon: '🌱',
      category: ItemCategories.SEEDS,
      stackable: true,
      maxStack: 99,
      cropId: itemId.replace(/_seed$/, ''),
      description: 'Seeds for planting.',
    };
  }
  return {
    id: itemId,
    name: toTitleCase(itemId),
    icon: '📦',
    category: ItemCategories.MATERIALS,
    stackable: true,
    maxStack: 99,
    description: 'Stored material.',
  };
}

function withCapacityInfo(slots, capacity, tier, extra = {}) {
  return {
    slots,
    capacity,
    tier,
    equippedToolId: extra.equippedToolId ?? null,
  };
}

export function createInventoryState(capacity = CAPACITY_BY_TIER[1], tier = 1) {
  return withCapacityInfo(createEmptySlots(capacity), capacity, tier);
}

function normalizeSlot(slot) {
  if (!slot?.itemId) return null;
  const itemDef = getItemDef(slot.itemId);
  return {
    itemId: slot.itemId,
    category: slot.category ?? itemDef.category,
    count: Math.max(1, Number(slot.count ?? 1)),
    durability: slot.durability ?? itemDef.durability ?? null,
    maxDurability: slot.maxDurability ?? itemDef.durability ?? null,
    metadata: slot.metadata ? structuredClone(slot.metadata) : {},
  };
}

function getTierFromCapacity(capacity) {
  if (capacity >= CAPACITY_BY_TIER[3]) return 3;
  if (capacity >= CAPACITY_BY_TIER[2]) return 2;
  return 1;
}

function bagToEntries(raw) {
  return Object.entries(raw ?? {})
    .filter(([key, value]) => (
      key !== 'slots'
      && key !== 'capacity'
      && key !== 'tier'
      && key !== 'equippedToolId'
      && Number(value) > 0
    ))
    .map(([itemId, count]) => ({ itemId, count: Number(count) }));
}

export function normalizeInventoryState(raw) {
  if (raw?.slots && Array.isArray(raw.slots)) {
    const capacity = Math.max(Number(raw.capacity ?? raw.slots.length ?? CAPACITY_BY_TIER[1]), CAPACITY_BY_TIER[1]);
    const tier = Number(raw.tier ?? getTierFromCapacity(capacity));
    const slots = createEmptySlots(capacity);
    raw.slots.slice(0, capacity).forEach((slot, index) => {
      slots[index] = normalizeSlot(slot);
    });
    return withCapacityInfo(slots, capacity, tier, raw);
  }

  const legacyEntries = bagToEntries(raw);
  const next = createInventoryState();
  for (const entry of legacyEntries) {
    const result = addItemToInventoryState(next, entry.itemId, entry.count);
    next.slots = result.inventory.slots;
  }
  return next;
}

export function getInventoryItemCount(inventoryState, itemId) {
  const inventory = normalizeInventoryState(inventoryState);
  return inventory.slots.reduce((total, slot) => (
    slot?.itemId === itemId ? total + (slot.count ?? 0) : total
  ), 0);
}

export function hasInventoryItem(inventoryState, itemId, count = 1) {
  return getInventoryItemCount(inventoryState, itemId) >= count;
}

export function getInventoryItemsByCategory(inventoryState, category) {
  return normalizeInventoryState(inventoryState).slots
    .map((slot, index) => (slot ? { ...slot, index, itemDef: getItemDef(slot.itemId) } : null))
    .filter((slot) => slot?.category === category);
}

function cloneInventory(inventoryState) {
  const inventory = normalizeInventoryState(inventoryState);
  return withCapacityInfo(inventory.slots.map(cloneSlot), inventory.capacity, inventory.tier, inventory);
}

function countAvailableSpace(inventory, itemId) {
  const def = getItemDef(itemId);
  let space = 0;
  inventory.slots.forEach((slot) => {
    if (!slot) {
      space += def.stackable ? def.maxStack ?? 99 : 1;
      return;
    }
    if (def.stackable && slot.itemId === itemId) {
      space += Math.max(0, (def.maxStack ?? 99) - (slot.count ?? 0));
    }
  });
  return space;
}

export function addItemToInventoryState(inventoryState, itemId, count = 1, options = {}) {
  const inventory = cloneInventory(inventoryState);
  const def = getItemDef(itemId);
  const targetCount = Math.max(1, Number(count ?? 1));
  if (countAvailableSpace(inventory, itemId) < targetCount) {
    return {
      inventory,
      success: false,
      added: 0,
      slotIndex: -1,
      reason: 'Inventory full',
    };
  }

  let remaining = targetCount;
  let firstSlotIndex = -1;

  if (def.stackable) {
    inventory.slots.forEach((slot, index) => {
      if (remaining <= 0 || !slot || slot.itemId !== itemId) return;
      const maxStack = def.maxStack ?? 99;
      const room = Math.max(0, maxStack - (slot.count ?? 0));
      if (!room) return;
      const add = Math.min(room, remaining);
      slot.count += add;
      remaining -= add;
      if (firstSlotIndex < 0) firstSlotIndex = index;
    });
  }

  while (remaining > 0) {
    const emptyIndex = inventory.slots.findIndex((slot) => !slot);
    if (emptyIndex < 0) break;
    const add = def.stackable ? Math.min(def.maxStack ?? 99, remaining) : 1;
    inventory.slots[emptyIndex] = normalizeSlot({
      itemId,
      category: def.category,
      count: add,
      durability: options.durability ?? def.durability ?? null,
      maxDurability: options.maxDurability ?? def.durability ?? null,
      metadata: options.metadata ?? {},
    });
    remaining -= add;
    if (firstSlotIndex < 0) firstSlotIndex = emptyIndex;
  }

  return {
    inventory,
    success: remaining === 0,
    added: targetCount - remaining,
    slotIndex: firstSlotIndex,
  };
}

export function removeItemFromInventoryState(inventoryState, itemId, count = 1) {
  const inventory = cloneInventory(inventoryState);
  let remaining = Math.max(1, Number(count ?? 1));
  let removed = 0;

  for (let index = inventory.slots.length - 1; index >= 0; index -= 1) {
    const slot = inventory.slots[index];
    if (!slot || slot.itemId !== itemId) continue;
    const take = Math.min(slot.count ?? 0, remaining);
    slot.count -= take;
    removed += take;
    remaining -= take;
    if (slot.count <= 0) {
      inventory.slots[index] = null;
    }
    if (remaining <= 0) break;
  }

  return {
    inventory,
    success: removed >= count,
    removed,
  };
}

export function moveInventorySlot(inventoryState, fromIndex, toIndex) {
  const inventory = cloneInventory(inventoryState);
  if (fromIndex === toIndex) {
    return { inventory, success: true };
  }
  const from = inventory.slots[fromIndex];
  const to = inventory.slots[toIndex];
  if (!from || toIndex < 0 || toIndex >= inventory.capacity || fromIndex < 0 || fromIndex >= inventory.capacity) {
    return { inventory, success: false, reason: 'Invalid slot move' };
  }

  if (!to) {
    inventory.slots[toIndex] = from;
    inventory.slots[fromIndex] = null;
    return { inventory, success: true };
  }

  if (from.itemId === to.itemId) {
    const def = getItemDef(from.itemId);
    if (def.stackable) {
      const maxStack = def.maxStack ?? 99;
      const room = Math.max(0, maxStack - to.count);
      const moved = Math.min(room, from.count);
      inventory.slots[toIndex].count += moved;
      inventory.slots[fromIndex].count -= moved;
      if (inventory.slots[fromIndex].count <= 0) {
        inventory.slots[fromIndex] = null;
      }
      return { inventory, success: true };
    }
  }

  inventory.slots[fromIndex] = to;
  inventory.slots[toIndex] = from;
  return { inventory, success: true };
}

export function splitInventoryStack(inventoryState, fromIndex, count, toIndex) {
  const inventory = cloneInventory(inventoryState);
  const from = inventory.slots[fromIndex];
  if (!from || toIndex < 0 || toIndex >= inventory.capacity || inventory.slots[toIndex]) {
    return { inventory, success: false, reason: 'Split requires an empty slot' };
  }
  const splitCount = Math.max(1, Number(count ?? 1));
  if ((from.count ?? 0) <= splitCount) {
    return { inventory, success: false, reason: 'Not enough items to split' };
  }

  inventory.slots[fromIndex].count -= splitCount;
  inventory.slots[toIndex] = normalizeSlot({
    ...from,
    count: splitCount,
  });
  return { inventory, success: true };
}

export function upgradeInventoryState(inventoryState) {
  const inventory = cloneInventory(inventoryState);
  if (inventory.tier >= 3) {
    return { inventory, success: false, reason: 'Inventory is already max size' };
  }
  const nextTier = inventory.tier + 1;
  const nextCapacity = CAPACITY_BY_TIER[nextTier];
  while (inventory.slots.length < nextCapacity) {
    inventory.slots.push(null);
  }
  inventory.capacity = nextCapacity;
  inventory.tier = nextTier;
  return { inventory, success: true };
}

export function findToolSlotIndex(inventoryState, itemId) {
  const inventory = normalizeInventoryState(inventoryState);
  return inventory.slots.findIndex((slot) => slot?.itemId === itemId);
}

export function applyToolDurabilityToInventoryState(inventoryState, slotIndex, durabilityCost = 1) {
  const inventory = cloneInventory(inventoryState);
  const slot = inventory.slots[slotIndex];
  if (!slot) return { inventory, success: false, reason: 'Missing tool slot' };
  const def = getItemDef(slot.itemId);
  if (def.category !== ItemCategories.TOOLS) {
    return { inventory, success: false, reason: 'Not a tool' };
  }
  const nextDurability = Math.max(0, (slot.durability ?? slot.maxDurability ?? def.durability ?? 0) - durabilityCost);
  inventory.slots[slotIndex] = {
    ...slot,
    durability: nextDurability,
    maxDurability: slot.maxDurability ?? def.durability ?? null,
  };
  return { inventory, success: true };
}

export function repairToolInInventoryState(inventoryState, slotIndex, restoredTo) {
  const inventory = cloneInventory(inventoryState);
  const slot = inventory.slots[slotIndex];
  if (!slot) return { inventory, success: false, reason: 'Missing tool slot' };
  inventory.slots[slotIndex] = {
    ...slot,
    durability: restoredTo,
    maxDurability: restoredTo,
  };
  return { inventory, success: true };
}

export class Inventory {
  constructor(store, capacity = CAPACITY_BY_TIER[1]) {
    this.store = store;
    this.capacity = capacity;
  }

  getState() {
    return normalizeInventoryState(this.store.getState().campaign.inventory);
  }

  getSlots() {
    return this.getState().slots;
  }

  addItem(itemId, count = 1, options = {}) {
    const preview = addItemToInventoryState(this.getState(), itemId, count, options);
    if (!preview.success) return preview;
    this.store.dispatch({ type: 'ADD_ITEM', payload: { itemId, count, ...options } });
    return preview;
  }

  removeItem(itemId, count = 1) {
    const preview = removeItemFromInventoryState(this.getState(), itemId, count);
    if (!preview.removed) return preview;
    this.store.dispatch({ type: 'REMOVE_ITEM', payload: { itemId, count } });
    return preview;
  }

  hasItem(itemId, count = 1) {
    return hasInventoryItem(this.getState(), itemId, count);
  }

  getItemCount(itemId) {
    return getInventoryItemCount(this.getState(), itemId);
  }

  moveSlot(fromIndex, toIndex) {
    const preview = moveInventorySlot(this.getState(), fromIndex, toIndex);
    if (!preview.success) return preview;
    this.store.dispatch({ type: 'MOVE_SLOT', payload: { fromIndex, toIndex } });
    return preview;
  }

  splitStack(fromIndex, count, toIndex) {
    const preview = splitInventoryStack(this.getState(), fromIndex, count, toIndex);
    if (!preview.success) return preview;
    this.store.dispatch({ type: 'SPLIT_STACK', payload: { fromIndex, count, toIndex } });
    return preview;
  }

  getCapacity() {
    const inventory = this.getState();
    return {
      used: inventory.slots.filter(Boolean).length,
      total: inventory.capacity,
      canUpgrade: inventory.tier < 3,
    };
  }

  upgradeCapacity() {
    const preview = upgradeInventoryState(this.getState());
    if (!preview.success) return preview;
    this.store.dispatch({ type: 'UPGRADE_INVENTORY', payload: {} });
    return preview;
  }

  getItemsByCategory(category) {
    return getInventoryItemsByCategory(this.getState(), category);
  }

  dispose() {}
}
