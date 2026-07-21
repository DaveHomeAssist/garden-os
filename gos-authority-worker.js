// Garden OS authority worker skeleton.
// Deploy target: Cloudflare Worker or any Web Fetch compatible runtime with KV.
//
// Routes:
//   GET  /health
//   POST /session
//   GET  /session/:sessionId
//   POST /action
//
// Env:
//   GOS_AUTHORITY: KV namespace with get/put
//   GOS_AUTHORITY_SECRET: HMAC-SHA256 secret for ServerAck signatures

import {
  applyAuthoritativeAction,
  createActionEnvelope,
  createEngineState,
  stableStringify,
} from './story-mode/src/engine/authoritative-engine.js';
import {
  AUTHORITY_FESTIVAL_ACTIVITY_REWARDS,
  AUTHORITY_FESTIVALS,
  AUTHORITY_QUEST_REWARDS,
  AUTHORITY_RECIPE_TABLE,
} from './story-mode/src/server/authority-reward-tables.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 64 * 1024;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const AUTHORITY_GRID_SIZE = 32;
const AUTHORITY_INVENTORY_CAPACITY = 20;
const AUTHORITY_ITEM_CATEGORIES = {
  MATERIALS: 'materials',
  TOOLS: 'tools',
};
const AUTHORITY_ITEM_DEFS = {
  auto_composter: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 5, stackable: true },
  companion_patch_kit: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 10, stackable: true },
  compost: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  dried_leaves: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  fertilizer_bag: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 20, stackable: true },
  crystal_shard: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  garden_twine: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 50, stackable: true },
  greenhouse_panel: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 5, stackable: true },
  herb_extract: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 30, stackable: true },
  legendary_trowel: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, stackable: false },
  lens: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 20, stackable: true },
  masterwork_fertilizer: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 20, stackable: true },
  mechanism: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 20, stackable: true },
  mulch_bag: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 10, stackable: true },
  plant_fiber: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  plant_matter: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  pest_spray: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 10, stackable: true },
  pruning_shears: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 50, stackable: false },
  rare_earth: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 25, stackable: true },
  scrap_metal: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
  seed_hybridizer: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 20, stackable: false },
  smart_watering_can: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 80, stackable: false },
  soil_scanner: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 30, stackable: false },
  trellis_kit: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 5, stackable: true },
  watering_can: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 100, stackable: false },
  wood: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 99, stackable: true },
};
const AUTHORITY_REPAIR_COSTS = {
  pruning_shears: [{ itemId: 'scrap_metal', count: 1 }],
  smart_watering_can: [
    { itemId: 'plant_matter', count: 2 },
    { itemId: 'crystal_shard', count: 1 },
  ],
  soil_scanner: [{ itemId: 'crystal_shard', count: 1 }],
  watering_can: [{ itemId: 'plant_matter', count: 2 }],
};
// Mirrors specs/CRAFTING_RECIPES.json; the worker must stay import-free of browser spec aliases.
const AUTHORITY_CRAFTING_RECIPES = {
  basic_fertilizer: {
    materials: [{ itemId: 'compost', count: 2 }, { itemId: 'plant_matter', count: 3 }],
    output: { itemId: 'fertilizer_bag', count: 1, durability: null },
  },
  pest_spray: {
    materials: [{ itemId: 'herb_extract', count: 2 }, { itemId: 'plant_matter', count: 1 }],
    output: { itemId: 'pest_spray', count: 1, durability: null },
  },
  garden_twine: {
    materials: [{ itemId: 'plant_fiber', count: 3 }],
    output: { itemId: 'garden_twine', count: 1, durability: null },
  },
  improved_watering_can: {
    materials: [{ itemId: 'scrap_metal', count: 1 }, { itemId: 'plant_fiber', count: 2 }, { itemId: 'crystal_shard', count: 1 }],
    output: { itemId: 'watering_can', count: 1, durability: 100 },
  },
  pruning_shears: {
    materials: [{ itemId: 'scrap_metal', count: 2 }, { itemId: 'garden_twine', count: 1 }],
    output: { itemId: 'pruning_shears', count: 1, durability: 50 },
  },
  mulch_bag: {
    materials: [{ itemId: 'compost', count: 3 }, { itemId: 'dried_leaves', count: 2 }],
    output: { itemId: 'mulch_bag', count: 2, durability: null },
  },
  trellis_extension: {
    materials: [{ itemId: 'wood', count: 4 }, { itemId: 'garden_twine', count: 2 }],
    output: { itemId: 'trellis_kit', count: 1, durability: null },
  },
  soil_scanner: {
    materials: [{ itemId: 'crystal_shard', count: 1 }, { itemId: 'scrap_metal', count: 2 }, { itemId: 'lens', count: 1 }],
    output: { itemId: 'soil_scanner', count: 1, durability: 30 },
  },
  smart_watering_can: {
    materials: [{ itemId: 'watering_can', count: 1 }, { itemId: 'crystal_shard', count: 2 }, { itemId: 'mechanism', count: 1 }],
    output: { itemId: 'smart_watering_can', count: 1, durability: 80 },
  },
  companion_patch_kit: {
    materials: [{ itemId: 'herb_extract', count: 3 }, { itemId: 'compost', count: 2 }, { itemId: 'plant_fiber', count: 1 }],
    output: { itemId: 'companion_patch_kit', count: 1, durability: null },
  },
  greenhouse_panel: {
    materials: [{ itemId: 'crystal_shard', count: 4 }, { itemId: 'scrap_metal', count: 2 }],
    output: { itemId: 'greenhouse_panel', count: 1, durability: null },
  },
  seed_hybridizer: {
    materials: [{ itemId: 'crystal_shard', count: 3 }, { itemId: 'mechanism', count: 2 }, { itemId: 'rare_earth', count: 1 }],
    output: { itemId: 'seed_hybridizer', count: 1, durability: 20 },
  },
  masterwork_fertilizer: {
    materials: [{ itemId: 'fertilizer_bag', count: 3 }, { itemId: 'crystal_shard', count: 2 }],
    output: { itemId: 'masterwork_fertilizer', count: 1, durability: null },
  },
  auto_composter: {
    materials: [{ itemId: 'mechanism', count: 4 }, { itemId: 'scrap_metal', count: 3 }, { itemId: 'crystal_shard', count: 2 }],
    output: { itemId: 'auto_composter', count: 1, durability: null },
  },
  legendary_trowel: {
    materials: [{ itemId: 'rare_earth', count: 5 }, { itemId: 'crystal_shard', count: 3 }, { itemId: 'mechanism', count: 2 }],
    output: { itemId: 'legendary_trowel', count: 1, durability: null },
  },
};
// Bounds derived from specs/SKILL_TREE.json crafting buffs; skills stay client-side until skill authority lands.
const AUTHORITY_MAX_MATERIAL_REDUCTION = 0.2;
const AUTHORITY_MAX_CRAFTED_DURABILITY_BONUS = 10;
const BLOCKED_HARVEST_PAYLOAD_KEYS = new Set(['currency', 'harvestResult', 'inventory', 'pantry', 'recipesCompleted', 'yield', 'yieldCount']);
const BLOCKED_CRAFT_PAYLOAD_KEYS = new Set(['craftedItems', 'itemProduced', 'output']);
const BLOCKED_QUEST_PAYLOAD_KEYS = new Set(['currency', 'inventory', 'outcome', 'pantry', 'reputation', 'rewards', 'skills', 'slots']);
const BLOCKED_FESTIVAL_PAYLOAD_KEYS = new Set(['activitiesCompleted', 'inventory', 'mechanics', 'rewards', 'slots']);
const COOLDOWN_KEY_RE = /^[A-Za-z0-9_-]+_[0-9]+$/;
const STARTER_AUTHORITY_ITEMS = [
  { itemId: 'watering_can', category: 'tools', count: 1, durability: 100, maxDurability: 100 },
  { itemId: 'pruning_shears', category: 'tools', count: 1, durability: 50, maxDurability: 50 },
  { itemId: 'fertilizer_bag', category: 'materials', count: 3, durability: null, maxDurability: null },
  { itemId: 'pest_spray', category: 'materials', count: 3, durability: null, maxDurability: null },
  { itemId: 'mulch_bag', category: 'materials', count: 3, durability: null, maxDurability: null },
];
const DEFAULT_AUTHORITY_CELL = {
  carryForwardType: null,
  cropId: null,
  damageState: null,
  interventionBonus: 0,
  lastWateredAt: null,
  mulched: false,
  protected: false,
  soilFatigue: 0,
};

function clampUnitNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function cloneSlot(slot) {
  return slot ? structuredClone(slot) : null;
}

function getAuthorityItemDef(itemId) {
  return AUTHORITY_ITEM_DEFS[itemId] ?? {
    category: AUTHORITY_ITEM_CATEGORIES.MATERIALS,
    maxStack: 99,
    stackable: true,
  };
}

function normalizeAuthoritySlot(slot) {
  if (!slot?.itemId) return null;
  const itemDef = getAuthorityItemDef(slot.itemId);
  const durability = Number(slot.durability);
  const maxDurability = Number(slot.maxDurability);
  return {
    itemId: String(slot.itemId),
    category: typeof slot.category === 'string' ? slot.category : itemDef.category,
    count: Math.max(1, Number(slot.count ?? 1)),
    durability: Number.isFinite(durability) ? durability : itemDef.durability ?? null,
    maxDurability: Number.isFinite(maxDurability) ? maxDurability : itemDef.durability ?? null,
    metadata: slot.metadata && typeof slot.metadata === 'object' ? structuredClone(slot.metadata) : {},
  };
}

function createStarterAuthorityInventory() {
  const slots = Array.from({ length: AUTHORITY_INVENTORY_CAPACITY }, () => null);
  STARTER_AUTHORITY_ITEMS.forEach((item, index) => {
    slots[index] = normalizeAuthoritySlot(item);
  });
  return {
    slots,
    capacity: AUTHORITY_INVENTORY_CAPACITY,
    tier: 1,
    equippedToolId: null,
  };
}

function createAuthorityInventory(inventory) {
  if (!inventory?.slots || !Array.isArray(inventory.slots)) return createStarterAuthorityInventory();
  const capacity = Math.max(Number(inventory.capacity ?? inventory.slots.length ?? AUTHORITY_INVENTORY_CAPACITY), AUTHORITY_INVENTORY_CAPACITY);
  return {
    slots: Array.from({ length: capacity }, (_, index) => normalizeAuthoritySlot(inventory.slots[index])),
    capacity,
    tier: Number.isFinite(Number(inventory.tier)) ? Number(inventory.tier) : 1,
    equippedToolId: typeof inventory.equippedToolId === 'string' ? inventory.equippedToolId : null,
  };
}

function cloneAuthorityInventory(inventory) {
  const normalized = createAuthorityInventory(inventory);
  return {
    ...normalized,
    slots: normalized.slots.map(cloneSlot),
  };
}

function applyAuthorityToolDurability(inventory, slotIndex, durabilityCost = 1) {
  const next = cloneAuthorityInventory(inventory);
  const slot = next.slots[slotIndex];
  if (!slot || slot.category !== 'tools') {
    return { inventory: next, success: false };
  }
  const maxDurability = Number.isFinite(slot.maxDurability) ? slot.maxDurability : slot.durability ?? 0;
  const current = Number.isFinite(slot.durability) ? slot.durability : maxDurability;
  next.slots[slotIndex] = {
    ...slot,
    durability: Math.max(0, current - durabilityCost),
    maxDurability,
  };
  return { inventory: next, success: true };
}

function repairAuthorityTool(inventory, slotIndex) {
  const next = cloneAuthorityInventory(inventory);
  const slot = next.slots[slotIndex];
  if (!slot || slot.category !== 'tools') {
    return { inventory: next, success: false };
  }
  const itemDef = getAuthorityItemDef(slot.itemId);
  const restoredTo = Number.isFinite(slot.maxDurability)
    ? slot.maxDurability
    : (itemDef.durability ?? slot.durability ?? 0);
  next.slots[slotIndex] = {
    ...slot,
    durability: restoredTo,
    maxDurability: restoredTo,
  };
  return { inventory: next, restoredTo, success: true };
}

function addAuthorityInventoryItem(inventory, itemId, count = 1, options = {}) {
  const next = cloneAuthorityInventory(inventory);
  const itemDef = getAuthorityItemDef(itemId);
  let remaining = Math.max(1, Math.floor(Number(count ?? 1)));
  let firstSlotIndex = -1;

  if (itemDef.stackable) {
    for (let index = 0; index < next.slots.length; index += 1) {
      const slot = next.slots[index];
      if (!slot || slot.itemId !== itemId || remaining <= 0) continue;
      const room = Math.max(0, (itemDef.maxStack ?? 99) - (slot.count ?? 0));
      const added = Math.min(room, remaining);
      slot.count += added;
      remaining -= added;
      if (added > 0 && firstSlotIndex < 0) firstSlotIndex = index;
    }
  }

  while (remaining > 0) {
    const emptyIndex = next.slots.findIndex((slot) => !slot);
    if (emptyIndex < 0) break;
    const added = itemDef.stackable ? Math.min(itemDef.maxStack ?? 99, remaining) : 1;
    next.slots[emptyIndex] = normalizeAuthoritySlot({
      itemId,
      category: itemDef.category,
      count: added,
      durability: options.durability ?? itemDef.durability ?? null,
      maxDurability: options.maxDurability ?? itemDef.durability ?? null,
      metadata: options.metadata ?? {},
    });
    remaining -= added;
    if (firstSlotIndex < 0) firstSlotIndex = emptyIndex;
  }

  return {
    added: Math.max(0, Number(count ?? 1) - remaining),
    inventory: next,
    slotIndex: firstSlotIndex,
    success: remaining === 0,
  };
}

function getAuthorityInventoryItemCount(inventory, itemId) {
  return createAuthorityInventory(inventory).slots.reduce((total, slot) => (
    slot?.itemId === itemId ? total + Number(slot.count ?? 0) : total
  ), 0);
}

function removeAuthorityInventoryItem(inventory, itemId, count = 1) {
  const next = cloneAuthorityInventory(inventory);
  let remaining = Math.max(1, Math.floor(Number(count ?? 1)));
  const before = getAuthorityInventoryItemCount(next, itemId);

  for (let index = next.slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const slot = next.slots[index];
    if (!slot || slot.itemId !== itemId) continue;
    const removed = Math.min(Number(slot.count ?? 0), remaining);
    const nextCount = Number(slot.count ?? 0) - removed;
    remaining -= removed;
    next.slots[index] = nextCount > 0 ? { ...slot, count: nextCount } : null;
  }

  return {
    inventory: next,
    removed: before - getAuthorityInventoryItemCount(next, itemId),
    success: remaining === 0,
  };
}

function createAuthorityCell(cell = {}) {
  return {
    ...DEFAULT_AUTHORITY_CELL,
    carryForwardType: typeof cell.carryForwardType === 'string' && cell.carryForwardType.trim() ? cell.carryForwardType : null,
    cropId: typeof cell.cropId === 'string' ? cell.cropId : null,
    damageState: typeof cell.damageState === 'string' && cell.damageState.trim() ? cell.damageState : null,
    interventionBonus: clampUnitNumber(cell.interventionBonus),
    lastWateredAt: Number.isFinite(cell.lastWateredAt) ? cell.lastWateredAt : null,
    mulched: Boolean(cell.mulched),
    protected: Boolean(cell.protected),
    soilFatigue: clampUnitNumber(cell.soilFatigue),
  };
}

function createAuthorityGrid(grid = []) {
  const cells = Array.isArray(grid) ? grid : [];
  return Array.from({ length: AUTHORITY_GRID_SIZE }, (_, index) => createAuthorityCell(cells[index]));
}

function createAuthorityCooldowns(cooldowns = {}) {
  return Object.fromEntries(
    Object.entries(cooldowns ?? {}).filter(([key, until]) => (
      COOLDOWN_KEY_RE.test(key) && Number.isFinite(until) && until >= 0
    )),
  );
}

function createInitialAuthorityData({
  activeFestival = null,
  activeTool = null,
  claimedQuests = {},
  currentZone = 'player_plot',
  grid = [],
  inventory = null,
  lastCarryForward = null,
  lastCooldown = null,
  lastCrafting = null,
  lastDamage = null,
  lastFestivalEnd = null,
  lastFestivalReward = null,
  lastFestivalStart = null,
  lastHarvesting = null,
  lastQuestReward = null,
  lastItemAddition = null,
  lastItemRemoval = null,
  lastPlanting = null,
  lastProtection = null,
  lastRemoval = null,
  lastSoil = null,
  lastToolIntervention = null,
  lastToolRepair = null,
  lastToolUse = null,
  lastWatering = null,
  lastSpawnPoint = null,
  pantry = {},
  recipesCompleted = [],
  selectedCropId = null,
  toolCooldowns = {},
  visitedZones = ['player_plot'],
} = {}) {
  return {
    activeFestival: createAuthorityActiveFestival(activeFestival),
    activeTool,
    claimedQuests: createAuthorityClaimedQuests(claimedQuests),
    currentZone,
    grid: createAuthorityGrid(grid),
    inventory: createAuthorityInventory(inventory),
    lastCarryForward,
    lastCooldown,
    lastCrafting,
    lastDamage,
    lastFestivalEnd,
    lastFestivalReward,
    lastFestivalStart,
    lastHarvesting,
    lastQuestReward,
    lastItemAddition,
    lastItemRemoval,
    lastPlanting,
    lastProtection,
    lastRemoval,
    lastSoil,
    lastToolIntervention,
    lastToolRepair,
    lastToolUse,
    lastWatering,
    lastSpawnPoint,
    pantry: createAuthorityPantry(pantry),
    recipesCompleted: Array.isArray(recipesCompleted) ? [...new Set(recipesCompleted)] : [],
    selectedCropId,
    toolCooldowns: createAuthorityCooldowns(toolCooldowns),
    visitedZones: Array.isArray(visitedZones) && visitedZones.length ? [...new Set(visitedZones)] : ['player_plot'],
  };
}

function normalizeCooldownPayload(payload = {}) {
  const explicitKey = typeof payload.key === 'string' && payload.key.trim() ? payload.key.trim() : null;
  const toolId = typeof payload.toolId === 'string' && payload.toolId.trim() ? payload.toolId.trim() : null;
  const cellIndex = Number.isInteger(payload.cellIndex) && payload.cellIndex >= 0 ? payload.cellIndex : null;
  const key = explicitKey ?? (toolId && cellIndex != null ? `${toolId}_${cellIndex}` : null);
  const until = Number(payload.until ?? 0);
  return {
    cellIndex,
    key,
    toolId,
    until,
  };
}

function normalizeToolInterventionPayload(payload = {}) {
  const toolId = typeof payload.toolId === 'string' ? payload.toolId.trim() : '';
  const cellIndex = Number.isInteger(payload.cellIndex) ? payload.cellIndex : null;
  const defaultItemId = toolId === 'protect' ? 'pest_spray' : (toolId === 'mulch' ? 'mulch_bag' : null);
  const itemId = typeof payload.itemId === 'string' && payload.itemId.trim()
    ? payload.itemId.trim()
    : defaultItemId;
  const countValue = payload.itemCount ?? payload.count ?? (itemId ? 1 : 0);
  const itemCount = Number.isInteger(countValue) ? countValue : Number(countValue);
  const cooldown = payload.cooldown ?? {};
  const explicitKey = typeof payload.cooldownKey === 'string' && payload.cooldownKey.trim()
    ? payload.cooldownKey.trim()
    : (typeof cooldown.key === 'string' && cooldown.key.trim() ? cooldown.key.trim() : null);
  const key = explicitKey ?? (toolId && cellIndex != null ? `${toolId}_${cellIndex}` : null);
  const until = Number(payload.cooldownUntil ?? cooldown.until);
  const toolSlotIndex = Number.isInteger(payload.toolSlotIndex)
    ? payload.toolSlotIndex
    : (Number.isInteger(payload.slotIndex) ? payload.slotIndex : null);
  const toolItemId = typeof payload.toolItemId === 'string' && payload.toolItemId.trim()
    ? payload.toolItemId.trim()
    : null;
  const toolDurabilityCostValue = payload.toolDurabilityCost ?? payload.durabilityCost;
  const toolDurabilityCost = Number.isFinite(toolDurabilityCostValue)
    ? Math.max(0, Number(toolDurabilityCostValue))
    : (toolSlotIndex != null ? 1 : null);
  return {
    appliedAt: Number.isFinite(payload.appliedAt) ? payload.appliedAt : null,
    bonus: Number.isFinite(payload.bonus) ? payload.bonus : (toolId === 'mulch' ? 0.2 : 0),
    carryForwardType: typeof payload.carryForwardType === 'string' && payload.carryForwardType.trim()
      ? payload.carryForwardType.trim()
      : 'enriched',
    cellIndex,
    cooldown: {
      cellIndex,
      key,
      toolId,
      until,
    },
    itemCount,
    itemId,
    toolDurabilityCost,
    toolId,
    toolItemId,
    toolSlotIndex,
    wateredAt: Number.isFinite(payload.wateredAt)
      ? payload.wateredAt
      : (Number.isFinite(payload.appliedAt) ? payload.appliedAt : null),
  };
}

function normalizeAddItemPayload(payload = {}) {
  const itemId = typeof payload.itemId === 'string' && payload.itemId.trim()
    ? payload.itemId.trim()
    : null;
  const count = Number(payload.count ?? 1);
  const durability = Number(payload.durability);
  const maxDurability = Number(payload.maxDurability);
  return {
    count,
    durability: Number.isFinite(durability) ? durability : null,
    itemId,
    maxDurability: Number.isFinite(maxDurability) ? maxDurability : null,
    metadata: payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
      ? structuredClone(payload.metadata)
      : {},
  };
}

function normalizeRepairMaterialPayload(value) {
  if (!Array.isArray(value)) return null;
  return value.map((material) => ({
    count: Number(material?.count ?? 1),
    itemId: typeof material?.itemId === 'string' && material.itemId.trim()
      ? material.itemId.trim()
      : null,
  }));
}

function normalizeRepairToolPayload(payload = {}) {
  const slotIndex = Number.isInteger(payload.slotIndex) ? payload.slotIndex : null;
  const itemId = typeof payload.itemId === 'string' && payload.itemId.trim()
    ? payload.itemId.trim()
    : (typeof payload.toolItemId === 'string' && payload.toolItemId.trim() ? payload.toolItemId.trim() : null);
  const materialPayload = hasOwn(payload, 'materialsConsumed')
    ? payload.materialsConsumed
    : (hasOwn(payload, 'repairCost') ? payload.repairCost : null);
  return {
    itemId,
    materialsConsumed: normalizeRepairMaterialPayload(materialPayload),
    slotIndex,
  };
}

function getAuthorityRepairCost(itemId) {
  return (AUTHORITY_REPAIR_COSTS[itemId] ?? []).map((material) => ({ ...material }));
}

function normalizeCraftItemPayload(payload = {}) {
  const recipeId = typeof payload.recipeId === 'string' && payload.recipeId.trim()
    ? payload.recipeId.trim()
    : null;
  const durabilityBonusValue = Number(payload.durabilityBonus ?? 0);
  return {
    durabilityBonus: Number.isFinite(durabilityBonusValue) ? durabilityBonusValue : null,
    masterwork: payload.masterwork === true,
    materialsConsumed: hasOwn(payload, 'materialsConsumed')
      ? normalizeRepairMaterialPayload(payload.materialsConsumed)
      : null,
    recipeId,
  };
}

function reducedCraftMaterialFloor(count) {
  return Math.max(1, Math.ceil(count * (1 - AUTHORITY_MAX_MATERIAL_REDUCTION)));
}

function resolveCraftMaterials(submitted, recipe) {
  const base = (recipe?.materials ?? []).map((material) => ({ ...material }));
  if (submitted == null) return base;
  if (!Array.isArray(submitted) || submitted.length !== base.length) return null;
  const submittedCounts = new Map();
  for (const material of submitted) {
    if (
      typeof material?.itemId !== 'string'
      || !Number.isInteger(material.count)
      || material.count <= 0
      || submittedCounts.has(material.itemId)
    ) {
      return null;
    }
    submittedCounts.set(material.itemId, material.count);
  }
  const resolved = [];
  for (const material of base) {
    const count = submittedCounts.get(material.itemId);
    if (!Number.isInteger(count) || count < reducedCraftMaterialFloor(material.count) || count > material.count) {
      return null;
    }
    resolved.push({ count, itemId: material.itemId });
  }
  return resolved;
}

function resolveCraftedDurability(recipe, durabilityBonus) {
  if (recipe?.output?.durability == null) return null;
  const bonus = Number.isInteger(durabilityBonus) ? durabilityBonus : 0;
  return recipe.output.durability + bonus;
}

function createAuthorityPantry(pantry = {}) {
  return Object.fromEntries(
    Object.entries(pantry ?? {}).filter(([cropId, count]) => (
      typeof cropId === 'string' && cropId && Number.isInteger(count) && count > 0
    )),
  );
}

function createAuthorityClaimedQuests(claimedQuests = {}) {
  return Object.fromEntries(
    Object.entries(claimedQuests ?? {}).filter(([questId, entry]) => (
      typeof questId === 'string' && questId && entry && typeof entry === 'object'
    )).map(([questId, entry]) => [questId, { choiceId: entry.choiceId ?? null }]),
  );
}

function createAuthorityActiveFestival(activeFestival) {
  if (!activeFestival?.id || !AUTHORITY_FESTIVALS[activeFestival.id]) return null;
  return {
    activitiesCompleted: [...new Set((activeFestival.activitiesCompleted ?? []).filter((id) => typeof id === 'string' && id))],
    id: activeFestival.id,
  };
}

function getAuthorityQuestRewards(questId, choiceId) {
  const quest = AUTHORITY_QUEST_REWARDS[questId];
  if (!quest) return null;
  const outcomeRewards = choiceId ? quest.outcomes?.[choiceId] : null;
  return (outcomeRewards ?? quest.rewards ?? []).map((reward) => ({ ...reward }));
}

function getAuthorityFestivalActivityRewards(festivalId, activityId) {
  const rewardType = AUTHORITY_FESTIVALS[festivalId]?.activities?.[activityId];
  if (!rewardType) return null;
  return (AUTHORITY_FESTIVAL_ACTIVITY_REWARDS[rewardType] ?? []).map((reward) => ({ ...reward }));
}

function grantAuthorityItemRewards(inventoryState, rewards = []) {
  let inventory = cloneAuthorityInventory(inventoryState);
  const itemTotals = {};
  let success = true;
  for (const reward of rewards) {
    if (reward?.type !== 'item' || typeof reward.id !== 'string' || !reward.id) continue;
    const amount = Math.max(1, Math.floor(Number(reward.amount ?? 1)));
    const result = addAuthorityInventoryItem(inventory, reward.id, amount);
    inventory = result.inventory;
    if (!result.success) success = false;
    itemTotals[reward.id] = getAuthorityInventoryItemCount(inventory, reward.id);
  }
  return { inventory, itemTotals, success };
}

function deriveAuthorityRecipes(pantry = {}) {
  return Object.entries(AUTHORITY_RECIPE_TABLE)
    .filter(([, crops]) => crops.every((cropId) => (pantry[cropId] ?? 0) > 0))
    .map(([recipeId]) => recipeId);
}

function repairMaterialsMatch(submitted, expected) {
  if (submitted == null) return true;
  if (
    submitted.length !== expected.length
    || submitted.some((material) => (
      typeof material.itemId !== 'string'
      || !Number.isInteger(material.count)
      || material.count <= 0
    ))
  ) {
    return false;
  }
  const key = (material) => `${material.itemId}:${material.count}`;
  return submitted.map(key).sort().join('|') === expected.map(key).sort().join('|');
}

const AUTHORITY_REDUCERS = {
  NOOP: (data) => data,
  ADD_ITEM: (data, payload) => {
    const addition = normalizeAddItemPayload(payload);
    const result = addAuthorityInventoryItem(data.inventory, addition.itemId, addition.count, {
      durability: addition.durability ?? undefined,
      maxDurability: addition.maxDurability ?? undefined,
      metadata: addition.metadata,
    });
    return {
      ...data,
      inventory: result.inventory,
      lastItemAddition: {
        addedCount: result.added,
        count: addition.count,
        durability: addition.durability ?? undefined,
        itemId: addition.itemId,
        maxDurability: addition.maxDurability ?? undefined,
        metadata: Object.keys(addition.metadata ?? {}).length ? addition.metadata : undefined,
        slotIndex: result.slotIndex,
        totalCount: getAuthorityInventoryItemCount(result.inventory, addition.itemId),
      },
    };
  },
  APPLY_TOOL_INTERVENTION: (data, payload) => {
    const intervention = normalizeToolInterventionPayload(payload);
    const grid = createAuthorityGrid(data.grid);
    const cell = grid[intervention.cellIndex];
    const nextCell = { ...cell };
    if (intervention.toolId === 'protect') {
      nextCell.protected = true;
    }
    if (intervention.toolId === 'mulch') {
      nextCell.carryForwardType = intervention.carryForwardType;
      nextCell.mulched = true;
      nextCell.interventionBonus = Math.min(1, Math.max(0, (nextCell.interventionBonus ?? 0) + intervention.bonus));
    }
    if (intervention.toolId === 'water') {
      nextCell.interventionBonus = Math.min(1, Math.max(0, (nextCell.interventionBonus ?? 0) + intervention.bonus));
      nextCell.lastWateredAt = intervention.wateredAt;
    }
    grid[intervention.cellIndex] = nextCell;

    const baseInventory = createAuthorityInventory(data.inventory);
    const itemCount = intervention.itemId ? Math.max(1, Math.floor(Number(intervention.itemCount ?? 1))) : 0;
    const itemRemoval = intervention.itemId
      ? removeAuthorityInventoryItem(baseInventory, intervention.itemId, itemCount)
      : { inventory: baseInventory, success: true };
    let inventory = itemRemoval.inventory;
    let toolUse = null;
    if (intervention.toolSlotIndex != null) {
      const beforeSlot = inventory.slots[intervention.toolSlotIndex];
      const toolResult = applyAuthorityToolDurability(
        inventory,
        intervention.toolSlotIndex,
        intervention.toolDurabilityCost ?? 1,
      );
      inventory = toolResult.inventory;
      const afterSlot = inventory.slots[intervention.toolSlotIndex];
      toolUse = {
        durability: Number.isFinite(afterSlot?.durability) ? afterSlot.durability : null,
        durabilityCost: intervention.toolDurabilityCost ?? 1,
        itemId: beforeSlot?.itemId ?? intervention.toolItemId ?? null,
        slotIndex: intervention.toolSlotIndex,
      };
    }
    const toolCooldowns = {
      ...createAuthorityCooldowns(data.toolCooldowns),
      [intervention.cooldown.key]: intervention.cooldown.until,
    };

    return {
      ...data,
      grid,
      inventory,
      lastToolIntervention: {
        appliedAt: intervention.appliedAt,
        bonus: ['mulch', 'water'].includes(intervention.toolId) ? intervention.bonus : 0,
        carryForwardType: intervention.toolId === 'mulch' ? intervention.carryForwardType : null,
        cellIndex: intervention.cellIndex,
        cooldown: intervention.cooldown,
        interventionBonus: nextCell.interventionBonus,
        itemCount,
        itemId: intervention.itemId,
        mulched: intervention.toolId === 'mulch' ? true : undefined,
        protected: intervention.toolId === 'protect' ? true : undefined,
        remainingCount: intervention.itemId
          ? getAuthorityInventoryItemCount(inventory, intervention.itemId)
          : null,
        toolDurability: toolUse?.durability ?? undefined,
        toolDurabilityCost: toolUse?.durabilityCost ?? undefined,
        toolId: intervention.toolId,
        toolItemId: toolUse?.itemId ?? undefined,
        toolSlotIndex: toolUse?.slotIndex ?? undefined,
        wateredAt: intervention.toolId === 'water' ? intervention.wateredAt : undefined,
      },
      toolCooldowns,
    };
  },
  CARRY_FORWARD: (data, payload) => {
    const carryForwardType = typeof payload.carryForwardType === 'string' ? payload.carryForwardType : null;
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      carryForwardType,
    };
    if (hasOwn(payload, 'mulched')) {
      grid[payload.cellIndex].mulched = Boolean(payload.mulched);
    }
    return {
      ...data,
      grid,
      lastCarryForward: {
        carryForwardType,
        cellIndex: payload.cellIndex,
        mulched: grid[payload.cellIndex].mulched,
      },
    };
  },
  PLANT_CROP: (data, payload) => {
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      cropId: payload.cropId,
      damageState: null,
    };
    return {
      ...data,
      grid,
      lastPlanting: { cellIndex: payload.cellIndex, cropId: payload.cropId },
    };
  },
  REMOVE_CROP: (data, payload) => {
    const grid = createAuthorityGrid(data.grid);
    const cropId = grid[payload.cellIndex]?.cropId;
    const removedAt = Number.isFinite(payload.removedAt) ? payload.removedAt : null;
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      cropId: null,
      damageState: null,
    };
    return {
      ...data,
      grid,
      lastRemoval: { cellIndex: payload.cellIndex, cropId, removedAt },
    };
  },
  SET_PROTECTION: (data, payload) => {
    const protectedValue = Boolean(payload.protected);
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      protected: protectedValue,
    };
    return {
      ...data,
      grid,
      lastProtection: { cellIndex: payload.cellIndex, protected: protectedValue },
    };
  },
  WATER_CELL: (data, payload) => {
    const bonus = Number.isFinite(payload.bonus) ? payload.bonus : 0;
    const wateredAt = Number.isFinite(payload.wateredAt) ? payload.wateredAt : null;
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      interventionBonus: Math.min(1, Math.max(0, (grid[payload.cellIndex].interventionBonus ?? 0) + bonus)),
      lastWateredAt: wateredAt,
    };
    return {
      ...data,
      grid,
      lastWatering: {
        bonus,
        cellIndex: payload.cellIndex,
        interventionBonus: grid[payload.cellIndex].interventionBonus,
        wateredAt,
      },
    };
  },
  HARVEST_CELL: (data, payload) => {
    const grid = createAuthorityGrid(data.grid);
    const cropId = grid[payload.cellIndex]?.cropId;
    const harvestedAt = Number.isFinite(payload.harvestedAt) ? payload.harvestedAt : null;
    grid[payload.cellIndex] = createAuthorityCell();
    const pantry = createAuthorityPantry(data.pantry);
    pantry[cropId] = (pantry[cropId] ?? 0) + 1;
    const inventoryResult = addAuthorityInventoryItem(createAuthorityInventory(data.inventory), cropId, 1);
    const previousRecipes = new Set(Array.isArray(data.recipesCompleted) ? data.recipesCompleted : []);
    const recipesCompleted = [...new Set([...previousRecipes, ...deriveAuthorityRecipes(pantry)])];
    const newRecipes = recipesCompleted.filter((recipeId) => !previousRecipes.has(recipeId));
    return {
      ...data,
      grid,
      inventory: inventoryResult.inventory,
      lastHarvesting: {
        cellIndex: payload.cellIndex,
        cropId,
        harvestedAt,
        newRecipes,
        pantryCount: pantry[cropId],
        totalCount: getAuthorityInventoryItemCount(inventoryResult.inventory, cropId),
        yieldCount: 1,
      },
      pantry,
      recipesCompleted,
    };
  },
  COMPLETE_QUEST: (data, payload) => {
    const questId = payload.questId;
    const choiceId = typeof payload.choiceId === 'string' && payload.choiceId ? payload.choiceId : null;
    const rewards = getAuthorityQuestRewards(questId, choiceId) ?? [];
    const grant = grantAuthorityItemRewards(data.inventory, rewards);
    return {
      ...data,
      claimedQuests: {
        ...createAuthorityClaimedQuests(data.claimedQuests),
        [questId]: { choiceId },
      },
      inventory: grant.inventory,
      lastQuestReward: {
        choiceId,
        completedAt: Number.isFinite(payload.completedAt) ? payload.completedAt : null,
        itemTotals: grant.itemTotals,
        questId,
        rewards,
      },
    };
  },
  FESTIVAL_START: (data, payload) => ({
    ...data,
    activeFestival: { activitiesCompleted: [], id: payload.festivalId },
    lastFestivalStart: { festivalId: payload.festivalId },
  }),
  FESTIVAL_ACTIVITY: (data, payload) => {
    const activeFestival = createAuthorityActiveFestival(data.activeFestival);
    const activityId = payload.activityId;
    const rewards = getAuthorityFestivalActivityRewards(activeFestival?.id, activityId) ?? [];
    const grant = grantAuthorityItemRewards(data.inventory, rewards);
    return {
      ...data,
      activeFestival: {
        activitiesCompleted: [...new Set([...(activeFestival?.activitiesCompleted ?? []), activityId])],
        id: activeFestival?.id ?? null,
      },
      inventory: grant.inventory,
      lastFestivalReward: {
        activityId,
        festivalId: activeFestival?.id ?? null,
        itemTotals: grant.itemTotals,
        rewards,
      },
    };
  },
  FESTIVAL_END: (data) => {
    const activeFestival = createAuthorityActiveFestival(data.activeFestival);
    return {
      ...data,
      activeFestival: null,
      lastFestivalEnd: { festivalId: activeFestival?.id ?? null },
    };
  },
  SET_DAMAGE: (data, payload) => {
    const damageState = typeof payload.damageState === 'string' ? payload.damageState : null;
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      damageState,
    };
    return {
      ...data,
      grid,
      lastDamage: { cellIndex: payload.cellIndex, damageState },
    };
  },
  SET_ACTIVE_TOOL: (data, payload) => ({
    ...data,
    activeTool: typeof payload.toolId === 'string' ? payload.toolId : null,
  }),
  SET_COOLDOWN: (data, payload) => {
    const cooldown = normalizeCooldownPayload(payload);
    return {
      ...data,
      lastCooldown: cooldown,
      toolCooldowns: {
        ...createAuthorityCooldowns(data.toolCooldowns),
        [cooldown.key]: cooldown.until,
      },
    };
  },
  SET_SELECTED_CROP: (data, payload) => ({
    ...data,
    selectedCropId: typeof payload.cropId === 'string' ? payload.cropId : null,
  }),
  REMOVE_ITEM: (data, payload) => {
    const inventory = createAuthorityInventory(data.inventory);
    const itemId = payload.itemId;
    const count = Math.max(1, Math.floor(Number(payload.count ?? 1)));
    const result = removeAuthorityInventoryItem(inventory, itemId, count);
    return {
      ...data,
      inventory: result.inventory,
      lastItemRemoval: {
        count,
        itemId,
        remainingCount: getAuthorityInventoryItemCount(result.inventory, itemId),
      },
    };
  },
  UPDATE_SOIL: (data, payload) => {
    const soilFatigue = clampUnitNumber(payload.soilFatigue);
    const grid = createAuthorityGrid(data.grid);
    grid[payload.cellIndex] = {
      ...grid[payload.cellIndex],
      soilFatigue,
    };
    return {
      ...data,
      grid,
      lastSoil: { cellIndex: payload.cellIndex, soilFatigue },
    };
  },
  USE_TOOL: (data, payload) => {
    const inventory = createAuthorityInventory(data.inventory);
    const slotIndex = payload.slotIndex;
    const durabilityCost = Number.isFinite(payload.durabilityCost) ? Math.max(0, payload.durabilityCost) : 1;
    const beforeSlot = inventory.slots[slotIndex];
    const result = applyAuthorityToolDurability(inventory, slotIndex, durabilityCost);
    const afterSlot = result.inventory.slots[slotIndex];
    return {
      ...data,
      inventory: result.inventory,
      lastToolUse: {
        durability: Number.isFinite(afterSlot?.durability) ? afterSlot.durability : null,
        durabilityCost,
        itemId: beforeSlot?.itemId ?? null,
        slotIndex,
      },
    };
  },
  REPAIR_TOOL: (data, payload) => {
    const repair = normalizeRepairToolPayload(payload);
    let inventory = createAuthorityInventory(data.inventory);
    const beforeSlot = inventory.slots[repair.slotIndex];
    const repairCost = getAuthorityRepairCost(beforeSlot?.itemId);
    const materialsConsumed = [];
    const remainingMaterials = {};
    repairCost.forEach((material) => {
      const result = removeAuthorityInventoryItem(inventory, material.itemId, material.count);
      inventory = result.inventory;
      materialsConsumed.push({ count: material.count, itemId: material.itemId });
      remainingMaterials[material.itemId] = getAuthorityInventoryItemCount(inventory, material.itemId);
    });
    const result = repairAuthorityTool(inventory, repair.slotIndex);
    const afterSlot = result.inventory.slots[repair.slotIndex];
    return {
      ...data,
      inventory: result.inventory,
      lastToolRepair: {
        durability: Number.isFinite(afterSlot?.durability) ? afterSlot.durability : null,
        itemId: afterSlot?.itemId ?? beforeSlot?.itemId ?? repair.itemId ?? null,
        materialsConsumed,
        maxDurability: Number.isFinite(afterSlot?.maxDurability) ? afterSlot.maxDurability : null,
        remainingMaterials,
        slotIndex: repair.slotIndex,
      },
    };
  },
  CRAFT_ITEM: (data, payload) => {
    const craft = normalizeCraftItemPayload(payload);
    const recipe = AUTHORITY_CRAFTING_RECIPES[craft.recipeId];
    const materials = resolveCraftMaterials(craft.materialsConsumed, recipe) ?? [];
    let inventory = createAuthorityInventory(data.inventory);
    const materialsConsumed = [];
    const remainingMaterials = {};
    materials.forEach((material) => {
      const result = removeAuthorityInventoryItem(inventory, material.itemId, material.count);
      inventory = result.inventory;
      materialsConsumed.push({ count: material.count, itemId: material.itemId });
      remainingMaterials[material.itemId] = getAuthorityInventoryItemCount(inventory, material.itemId);
    });
    const durability = resolveCraftedDurability(recipe, craft.durabilityBonus);
    const outputItemId = recipe?.output?.itemId ?? null;
    const outputCount = recipe?.output?.count ?? 1;
    const result = addAuthorityInventoryItem(inventory, outputItemId, outputCount, {
      durability: durability ?? undefined,
      maxDurability: durability ?? undefined,
      metadata: craft.masterwork ? { masterwork: true } : {},
    });
    return {
      ...data,
      inventory: result.inventory,
      lastCrafting: {
        count: outputCount,
        durability,
        itemId: outputItemId,
        masterwork: craft.masterwork ? true : undefined,
        materialsConsumed,
        maxDurability: durability,
        recipeId: craft.recipeId,
        remainingMaterials,
        slotIndex: result.slotIndex,
        totalCount: getAuthorityInventoryItemCount(result.inventory, outputItemId),
      },
    };
  },
  ZONE_CHANGED: (data, payload) => {
    const currentZone = typeof payload.toZone === 'string' && payload.toZone
      ? payload.toZone
      : data.currentZone;
    const visitedZones = new Set(Array.isArray(data.visitedZones) ? data.visitedZones : ['player_plot']);
    if (currentZone) visitedZones.add(currentZone);
    const spawnX = Number(payload.spawnPoint?.x);
    const spawnZ = Number(payload.spawnPoint?.z);
    const lastSpawnPoint = Number.isFinite(spawnX) && Number.isFinite(spawnZ)
      ? { x: spawnX, z: spawnZ }
      : null;
    return {
      ...data,
      currentZone,
      lastSpawnPoint,
      visitedZones: [...visitedZones],
    };
  },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function problem(code, message, status = 400) {
  return jsonResponse({ ok: false, error: code, message }, status);
}

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

async function readJson(request) {
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (contentType && !contentType.includes('application/json')) {
    throw Object.assign(new Error('Use application/json'), { status: 415, code: 'unsupported_media_type' });
  }
  const text = await request.text();
  if (byteLength(text) > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Request body too large'), { status: 413, code: 'body_too_large' });
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Malformed JSON body'), { status: 400, code: 'bad_json' });
  }
}

function randomSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cleanSessionId(value) {
  return typeof value === 'string' && SESSION_ID_RE.test(value) ? value : randomSessionId();
}

function getKv(env) {
  if (!env?.GOS_AUTHORITY) {
    throw Object.assign(new Error('GOS_AUTHORITY KV namespace is required'), {
      status: 503,
      code: 'storage_unavailable',
    });
  }
  return env.GOS_AUTHORITY;
}

function getSecret(env) {
  const secret = env?.GOS_AUTHORITY_SECRET;
  if (typeof secret !== 'string' || secret.length < 24) {
    throw Object.assign(new Error('GOS_AUTHORITY_SECRET is required'), {
      status: 503,
      code: 'secret_unavailable',
    });
  }
  return secret;
}

function sessionKey(sessionId) {
  return `session:${sessionId}`;
}

async function loadSession(env, sessionId) {
  const raw = await getKv(env).get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Stored session is corrupt'), { status: 500, code: 'corrupt_session' });
  }
}

async function saveSession(env, state) {
  await getKv(env).put(sessionKey(state.sessionId), JSON.stringify(state), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function ackSigningPayload(ack) {
  const { signature: _signature, ...payload } = ack;
  return stableStringify(payload);
}

async function importHmacKey(secret, usages = ['sign']) {
  return globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  );
}

async function signServerAck(ack, secret) {
  const key = await importHmacKey(secret, ['sign']);
  const signed = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(ackSigningPayload(ack)),
  );
  return {
    ...ack,
    signature: `hmac-sha256:${bytesToBase64Url(new Uint8Array(signed))}`,
  };
}

async function verifyServerAckSignature(ack, secret) {
  if (!ack?.signature?.startsWith('hmac-sha256:')) return false;
  const expected = await signServerAck({ ...ack, signature: undefined }, secret);
  return constantTimeEqual(expected.signature, ack.signature);
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function publicState(state) {
  return {
    checksum: state.checksum,
    data: state.data,
    gameId: state.gameId,
    ledgerCursor: state.ledger?.cursor ?? '0',
    sessionId: state.sessionId,
    tick: state.tick,
    updatedAt: state.updatedAt,
    version: state.version,
  };
}

function validateAuthorityPayload(envelope, state) {
  const grid = createAuthorityGrid(state?.data?.grid);
  const cellIndex = envelope.payload?.cellIndex;
  if (envelope?.type === 'ADD_ITEM') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Add item action cannot submit trusted inventory state.' };
    }
    const addition = normalizeAddItemPayload(envelope.payload);
    if (typeof addition.itemId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(addition.itemId)) {
      return { code: 'BAD_ITEM_ID', message: 'Add item action requires a valid item id.' };
    }
    if (!Number.isInteger(addition.count) || addition.count <= 0 || addition.count > 99) {
      return { code: 'BAD_ITEM_COUNT', message: 'Add item action requires an integer count from 1 to 99.' };
    }
    if (
      (hasOwn(envelope.payload, 'durability') && (addition.durability == null || addition.durability < 0 || addition.durability > 500))
      || (hasOwn(envelope.payload, 'maxDurability') && (addition.maxDurability == null || addition.maxDurability < 0 || addition.maxDurability > 500))
    ) {
      return { code: 'BAD_DURABILITY', message: 'Add item action requires bounded durability values from 0 to 500.' };
    }
    const preview = addAuthorityInventoryItem(state?.data?.inventory, addition.itemId, addition.count, {
      durability: addition.durability ?? undefined,
      maxDurability: addition.maxDurability ?? undefined,
      metadata: addition.metadata,
    });
    if (!preview.success) {
      return { code: 'INVENTORY_FULL', message: 'Add item action requires enough server-owned inventory space.' };
    }
    return null;
  }
  if (envelope?.type === 'APPLY_TOOL_INTERVENTION') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Tool intervention cannot submit trusted inventory state.' };
    }
    if (hasOwn(envelope.payload, 'grid') || hasOwn(envelope.payload, 'cell') || hasOwn(envelope.payload, 'state')) {
      return { code: 'TRUSTED_CELL_PAYLOAD', message: 'Tool intervention cannot submit trusted cell state.' };
    }
    if (hasOwn(envelope.payload, 'interventionBonus')) {
      return { code: 'CLIENT_INTERVENTION_TOTAL', message: 'Tool intervention cannot submit trusted intervention totals.' };
    }
    const intervention = normalizeToolInterventionPayload(envelope.payload);
    if (!['protect', 'mulch', 'water'].includes(intervention.toolId)) {
      return { code: 'BAD_TOOL_INTERVENTION', message: 'Tool intervention requires protect, mulch, or water.' };
    }
    if (!Number.isInteger(intervention.cellIndex) || intervention.cellIndex < 0 || intervention.cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Tool intervention requires a valid starter-grid cell index.' };
    }
    if (['protect', 'water'].includes(intervention.toolId) && !grid[intervention.cellIndex]?.cropId) {
      return {
        code: 'CELL_EMPTY',
        message: intervention.toolId === 'water'
          ? 'Water intervention requires a planted crop.'
          : 'Protect intervention requires a planted crop.',
      };
    }
    if (
      hasOwn(envelope.payload, 'protected')
      && (envelope.payload.protected !== true || intervention.toolId !== 'protect')
    ) {
      return { code: 'BAD_PROTECTION_VALUE', message: 'Protect intervention requires protected true.' };
    }
    if (
      hasOwn(envelope.payload, 'mulched')
      && (envelope.payload.mulched !== true || intervention.toolId !== 'mulch')
    ) {
      return { code: 'BAD_MULCHED_VALUE', message: 'Mulch intervention requires mulched true.' };
    }
    if (
      hasOwn(envelope.payload, 'carryForwardType')
      && (
        intervention.toolId !== 'mulch'
        || typeof envelope.payload.carryForwardType !== 'string'
        || !envelope.payload.carryForwardType.trim()
      )
    ) {
      return { code: 'BAD_CARRY_FORWARD_TYPE', message: 'Mulch intervention requires a non-empty carryForwardType.' };
    }
    if (!Number.isFinite(intervention.bonus) || intervention.bonus < 0 || intervention.bonus > 1) {
      return { code: 'BAD_INTERVENTION_BONUS', message: 'Tool intervention requires a finite bonus from 0 to 1.' };
    }
    const expectedItemId = intervention.toolId === 'protect'
      ? 'pest_spray'
      : (intervention.toolId === 'mulch' ? 'mulch_bag' : null);
    if (expectedItemId && intervention.itemId !== expectedItemId) {
      return { code: 'ITEM_MISMATCH', message: 'Tool intervention item must match the selected tool.' };
    }
    if (!expectedItemId && (intervention.itemId !== null || intervention.itemCount !== 0)) {
      return { code: 'ITEM_MISMATCH', message: 'Water intervention cannot submit an item payload.' };
    }
    if (
      expectedItemId
      && (!Number.isInteger(intervention.itemCount) || intervention.itemCount <= 0 || intervention.itemCount > 99)
    ) {
      return { code: 'BAD_ITEM_COUNT', message: 'Tool intervention requires an integer item count from 1 to 99.' };
    }
    const cooldown = intervention.cooldown;
    const expectedKey = `${intervention.toolId}_${intervention.cellIndex}`;
    if (!cooldown.key || !COOLDOWN_KEY_RE.test(cooldown.key) || cooldown.key !== expectedKey) {
      return { code: 'BAD_COOLDOWN_KEY', message: 'Tool intervention cooldown key must match toolId and cellIndex.' };
    }
    if (!Number.isFinite(cooldown.until) || cooldown.until < 0) {
      return { code: 'BAD_COOLDOWN_UNTIL', message: 'Tool intervention requires a finite non-negative cooldown expiry.' };
    }
    if ('appliedAt' in (envelope.payload ?? {}) && envelope.payload.appliedAt !== null && !Number.isFinite(envelope.payload.appliedAt)) {
      return { code: 'BAD_APPLIED_AT', message: 'Tool intervention requires appliedAt to be a finite timestamp or null.' };
    }
    if ('wateredAt' in (envelope.payload ?? {}) && envelope.payload.wateredAt !== null && !Number.isFinite(envelope.payload.wateredAt)) {
      return { code: 'BAD_WATERED_AT', message: 'Tool intervention requires wateredAt to be a finite timestamp or null.' };
    }
    const hasToolDurabilityPayload = (
      hasOwn(envelope.payload, 'durabilityCost')
      || hasOwn(envelope.payload, 'slotIndex')
      || hasOwn(envelope.payload, 'toolDurabilityCost')
      || hasOwn(envelope.payload, 'toolItemId')
      || hasOwn(envelope.payload, 'toolSlotIndex')
    );
    if (hasToolDurabilityPayload && intervention.toolId !== 'water') {
      return { code: 'BAD_TOOL_DURABILITY_PAYLOAD', message: 'Only water interventions can submit tool durability.' };
    }
    if (hasToolDurabilityPayload) {
      if (!Number.isInteger(intervention.toolSlotIndex) || intervention.toolSlotIndex < 0) {
        return { code: 'BAD_TOOL_SLOT', message: 'Water intervention requires a valid tool slot index.' };
      }
      if (!Number.isFinite(intervention.toolDurabilityCost) || intervention.toolDurabilityCost < 0 || intervention.toolDurabilityCost > 100) {
        return { code: 'BAD_DURABILITY_COST', message: 'Water intervention requires a finite tool durability cost from 0 to 100.' };
      }
      const inventory = createAuthorityInventory(state?.data?.inventory);
      if (intervention.toolSlotIndex >= inventory.slots.length) {
        return { code: 'BAD_TOOL_SLOT', message: 'Water intervention tool slot is outside the server-owned inventory.' };
      }
      const toolSlot = inventory.slots[intervention.toolSlotIndex];
      if (!toolSlot) {
        return { code: 'MISSING_TOOL_SLOT', message: 'Water intervention requires a populated server-owned tool slot.' };
      }
      if (toolSlot.category !== 'tools') {
        return { code: 'NOT_TOOL', message: 'Water intervention requires a tool slot.' };
      }
      if (intervention.toolItemId && intervention.toolItemId !== toolSlot.itemId) {
        return { code: 'TOOL_MISMATCH', message: 'Water intervention tool id must match the server-owned tool slot.' };
      }
      if ((toolSlot.durability ?? 0) <= 0) {
        return { code: 'TOOL_BROKEN', message: 'Water intervention requires a usable tool.' };
      }
    }
    if (expectedItemId) {
      const inventory = createAuthorityInventory(state?.data?.inventory);
      if (getAuthorityInventoryItemCount(inventory, intervention.itemId) < intervention.itemCount) {
        return { code: 'NOT_ENOUGH_ITEM', message: 'Tool intervention requires enough server-owned inventory.' };
      }
    }
    return null;
  }
  if (envelope?.type === 'SET_DAMAGE') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Damage action requires a valid starter-grid cell index.' };
    }
    if (
      envelope.payload?.damageState !== null
      && (typeof envelope.payload?.damageState !== 'string' || !envelope.payload.damageState.trim())
    ) {
      return { code: 'BAD_DAMAGE_STATE', message: 'Damage action requires damageState to be a non-empty string or null.' };
    }
    return null;
  }

  if (envelope?.type === 'UPDATE_SOIL') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Soil action requires a valid starter-grid cell index.' };
    }
    const soilFatigue = envelope.payload?.soilFatigue;
    if (!Number.isFinite(soilFatigue) || soilFatigue < 0 || soilFatigue > 1) {
      return { code: 'BAD_SOIL_FATIGUE', message: 'Soil action requires a finite soilFatigue from 0 to 1.' };
    }
    return null;
  }

  if (envelope?.type === 'CARRY_FORWARD') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Carry-forward action requires a valid starter-grid cell index.' };
    }
    if (!hasOwn(envelope.payload, 'carryForwardType') && !hasOwn(envelope.payload, 'mulched')) {
      return { code: 'BAD_CARRY_FORWARD_PAYLOAD', message: 'Carry-forward action requires carryForwardType or mulched.' };
    }
    if (
      hasOwn(envelope.payload, 'carryForwardType')
      && envelope.payload.carryForwardType !== null
      && (typeof envelope.payload.carryForwardType !== 'string' || !envelope.payload.carryForwardType.trim())
    ) {
      return { code: 'BAD_CARRY_FORWARD_TYPE', message: 'Carry-forward action requires carryForwardType to be a non-empty string or null.' };
    }
    if (hasOwn(envelope.payload, 'mulched') && typeof envelope.payload.mulched !== 'boolean') {
      return { code: 'BAD_MULCHED_VALUE', message: 'Carry-forward action requires mulched to be boolean.' };
    }
    return null;
  }

  if (envelope?.type === 'PLANT_CROP') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Plant action requires a valid starter-grid cell index.' };
    }
    if (typeof envelope.payload?.cropId !== 'string' || !envelope.payload.cropId.trim()) {
      return { code: 'BAD_CROP_ID', message: 'Plant action requires a crop id.' };
    }
    return null;
  }

  if (envelope?.type === 'REMOVE_CROP') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Remove crop action requires a valid starter-grid cell index.' };
    }
    if (!grid[cellIndex]?.cropId) {
      return { code: 'CELL_EMPTY', message: 'Remove crop action requires a planted crop.' };
    }
    if (
      typeof envelope.payload?.cropId === 'string'
      && envelope.payload.cropId
      && envelope.payload.cropId !== grid[cellIndex].cropId
    ) {
      return { code: 'CROP_MISMATCH', message: 'Remove crop action crop id must match the server-owned cell crop.' };
    }
    if ('removedAt' in (envelope.payload ?? {}) && envelope.payload.removedAt !== null && !Number.isFinite(envelope.payload.removedAt)) {
      return { code: 'BAD_REMOVED_AT', message: 'Remove crop action requires removedAt to be a finite timestamp or null.' };
    }
    return null;
  }

  if (envelope?.type === 'SET_PROTECTION') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Protection action requires a valid starter-grid cell index.' };
    }
    if (typeof envelope.payload?.protected !== 'boolean') {
      return { code: 'BAD_PROTECTION_VALUE', message: 'Protection action requires a boolean protected value.' };
    }
    if (envelope.payload.protected && !grid[cellIndex]?.cropId) {
      return { code: 'CELL_EMPTY', message: 'Protection action requires a planted crop.' };
    }
    return null;
  }

  if (envelope?.type === 'WATER_CELL') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Water action requires a valid starter-grid cell index.' };
    }
    if (!grid[cellIndex]?.cropId) {
      return { code: 'CELL_EMPTY', message: 'Water action requires a planted crop.' };
    }
    const bonus = envelope.payload?.bonus ?? 0;
    if (!Number.isFinite(bonus) || bonus < 0 || bonus > 1) {
      return { code: 'BAD_WATER_BONUS', message: 'Water action requires a finite bonus from 0 to 1.' };
    }
    if ('wateredAt' in (envelope.payload ?? {}) && envelope.payload.wateredAt !== null && !Number.isFinite(envelope.payload.wateredAt)) {
      return { code: 'BAD_WATERED_AT', message: 'Water action requires wateredAt to be a finite timestamp or null.' };
    }
    return null;
  }

  if (envelope?.type === 'HARVEST_CELL') {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Harvest action requires a valid starter-grid cell index.' };
    }
    if (!grid[cellIndex]?.cropId) {
      return { code: 'CELL_EMPTY', message: 'Harvest action requires a planted crop.' };
    }
    const blockedKey = Object.keys(envelope.payload ?? {}).find((key) => BLOCKED_HARVEST_PAYLOAD_KEYS.has(key));
    if (blockedKey) {
      return { code: 'CLIENT_HARVEST_TOTAL', message: `Harvest action cannot submit trusted harvest field "${blockedKey}".` };
    }
    if (
      typeof envelope.payload?.cropId === 'string'
      && envelope.payload.cropId
      && envelope.payload.cropId !== grid[cellIndex].cropId
    ) {
      return { code: 'CROP_MISMATCH', message: 'Harvest action crop id must match the server-owned cell crop.' };
    }
    if ('harvestedAt' in (envelope.payload ?? {}) && envelope.payload.harvestedAt !== null && !Number.isFinite(envelope.payload.harvestedAt)) {
      return { code: 'BAD_HARVESTED_AT', message: 'Harvest action requires harvestedAt to be a finite timestamp or null.' };
    }
    const harvestPreview = addAuthorityInventoryItem(createAuthorityInventory(state?.data?.inventory), grid[cellIndex].cropId, 1);
    if (!harvestPreview.success) {
      return { code: 'INVENTORY_FULL', message: 'Harvest action requires enough server-owned inventory space for the harvested crop.' };
    }
    return null;
  }

  if (envelope?.type === 'SET_COOLDOWN') {
    const cooldown = normalizeCooldownPayload(envelope.payload);
    const derivedKey = cooldown.toolId && cooldown.cellIndex != null ? `${cooldown.toolId}_${cooldown.cellIndex}` : null;
    if (!cooldown.key || !COOLDOWN_KEY_RE.test(cooldown.key)) {
      return { code: 'BAD_COOLDOWN_KEY', message: 'Cooldown action requires a tool_cell key.' };
    }
    if (derivedKey && cooldown.key !== derivedKey) {
      return { code: 'BAD_COOLDOWN_KEY', message: 'Cooldown key must match toolId and cellIndex.' };
    }
    if (!Number.isFinite(cooldown.until) || cooldown.until < 0) {
      return { code: 'BAD_COOLDOWN_UNTIL', message: 'Cooldown action requires a finite non-negative expiry timestamp.' };
    }
    return null;
  }

  if (envelope?.type === 'USE_TOOL') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Tool use action cannot submit trusted inventory state.' };
    }
    const slotIndex = envelope.payload?.slotIndex;
    if (!Number.isInteger(slotIndex) || slotIndex < 0) {
      return { code: 'BAD_TOOL_SLOT', message: 'Tool use action requires a valid inventory slot index.' };
    }
    const durabilityCost = envelope.payload?.durabilityCost ?? 1;
    if (!Number.isFinite(durabilityCost) || durabilityCost < 0 || durabilityCost > 100) {
      return { code: 'BAD_DURABILITY_COST', message: 'Tool use action requires a finite durability cost from 0 to 100.' };
    }
    const inventory = createAuthorityInventory(state?.data?.inventory);
    if (slotIndex >= inventory.slots.length) {
      return { code: 'BAD_TOOL_SLOT', message: 'Tool use slot index is outside the server-owned inventory.' };
    }
    const slot = inventory.slots[slotIndex];
    if (!slot) {
      return { code: 'MISSING_TOOL_SLOT', message: 'Tool use action requires a populated server-owned tool slot.' };
    }
    if (slot.category !== 'tools') {
      return { code: 'NOT_TOOL', message: 'Tool use action requires a tool slot.' };
    }
    if (typeof envelope.payload?.itemId === 'string' && envelope.payload.itemId && envelope.payload.itemId !== slot.itemId) {
      return { code: 'TOOL_MISMATCH', message: 'Tool use item id must match the server-owned tool slot.' };
    }
    if ((slot.durability ?? 0) <= 0) {
      return { code: 'TOOL_BROKEN', message: 'Tool use action requires a usable tool.' };
    }
    return null;
  }

  if (envelope?.type === 'REPAIR_TOOL') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Tool repair action cannot submit trusted inventory state.' };
    }
    if (hasOwn(envelope.payload, 'restoredTo') || hasOwn(envelope.payload, 'durability') || hasOwn(envelope.payload, 'maxDurability')) {
      return { code: 'CLIENT_REPAIR_TOTAL', message: 'Tool repair action cannot submit trusted durability totals.' };
    }
    const repair = normalizeRepairToolPayload(envelope.payload);
    if (!Number.isInteger(repair.slotIndex) || repair.slotIndex < 0) {
      return { code: 'BAD_TOOL_SLOT', message: 'Tool repair action requires a valid inventory slot index.' };
    }
    const inventory = createAuthorityInventory(state?.data?.inventory);
    if (repair.slotIndex >= inventory.slots.length) {
      return { code: 'BAD_TOOL_SLOT', message: 'Tool repair slot index is outside the server-owned inventory.' };
    }
    const slot = inventory.slots[repair.slotIndex];
    if (!slot) {
      return { code: 'MISSING_TOOL_SLOT', message: 'Tool repair action requires a populated server-owned tool slot.' };
    }
    if (slot.category !== 'tools') {
      return { code: 'NOT_TOOL', message: 'Tool repair action requires a tool slot.' };
    }
    if (repair.itemId && repair.itemId !== slot.itemId) {
      return { code: 'TOOL_MISMATCH', message: 'Tool repair item id must match the server-owned tool slot.' };
    }
    const repairCost = getAuthorityRepairCost(slot.itemId);
    if (!repairCost.length) {
      return { code: 'NO_REPAIR_RECIPE', message: 'Tool repair action requires a known repair recipe.' };
    }
    if (!repairMaterialsMatch(repair.materialsConsumed, repairCost)) {
      return { code: 'REPAIR_COST_MISMATCH', message: 'Tool repair material payload must match the server repair recipe.' };
    }
    const missing = repairCost.find((material) => getAuthorityInventoryItemCount(inventory, material.itemId) < material.count);
    if (missing) {
      return { code: 'NOT_ENOUGH_ITEM', message: 'Tool repair action requires enough server-owned repair materials.' };
    }
    return null;
  }

  if (envelope?.type === 'COMPLETE_QUEST') {
    const blockedQuestKey = Object.keys(envelope.payload ?? {}).find((key) => BLOCKED_QUEST_PAYLOAD_KEYS.has(key));
    if (blockedQuestKey) {
      return { code: 'CLIENT_REWARD_PAYLOAD', message: `Quest completion cannot submit trusted reward field "${blockedQuestKey}".` };
    }
    const questId = envelope.payload?.questId;
    if (typeof questId !== 'string' || !AUTHORITY_QUEST_REWARDS[questId]) {
      return { code: 'BAD_QUEST_ID', message: 'Quest completion requires a known quest id.' };
    }
    const claimedQuests = createAuthorityClaimedQuests(state?.data?.claimedQuests);
    if (claimedQuests[questId]) {
      return { code: 'QUEST_ALREADY_CLAIMED', message: 'Quest rewards can be claimed once per quest.' };
    }
    const quest = AUTHORITY_QUEST_REWARDS[questId];
    const outcomeIds = Object.keys(quest.outcomes ?? {});
    const choiceId = envelope.payload?.choiceId;
    if (outcomeIds.length && (typeof choiceId !== 'string' || !quest.outcomes[choiceId])) {
      return { code: 'BAD_QUEST_CHOICE', message: 'Quest completion requires a valid outcome choice id.' };
    }
    if (!outcomeIds.length && choiceId != null) {
      return { code: 'BAD_QUEST_CHOICE', message: 'Quest completion cannot submit a choice for a quest without outcomes.' };
    }
    if ('completedAt' in (envelope.payload ?? {}) && envelope.payload.completedAt !== null && !Number.isFinite(envelope.payload.completedAt)) {
      return { code: 'BAD_COMPLETED_AT', message: 'Quest completion requires completedAt to be a finite timestamp or null.' };
    }
    const rewards = getAuthorityQuestRewards(questId, typeof choiceId === 'string' ? choiceId : null) ?? [];
    const grant = grantAuthorityItemRewards(state?.data?.inventory, rewards);
    if (!grant.success) {
      return { code: 'INVENTORY_FULL', message: 'Quest completion requires enough server-owned inventory space for item rewards.' };
    }
    return null;
  }

  if (envelope?.type === 'FESTIVAL_START') {
    const blockedFestivalKey = Object.keys(envelope.payload ?? {}).find((key) => BLOCKED_FESTIVAL_PAYLOAD_KEYS.has(key));
    if (blockedFestivalKey) {
      return { code: 'CLIENT_REWARD_PAYLOAD', message: `Festival start cannot submit trusted festival field "${blockedFestivalKey}".` };
    }
    const festivalId = envelope.payload?.festivalId;
    if (typeof festivalId !== 'string' || !AUTHORITY_FESTIVALS[festivalId]) {
      return { code: 'BAD_FESTIVAL_ID', message: 'Festival start requires a known festival id.' };
    }
    if (createAuthorityActiveFestival(state?.data?.activeFestival)) {
      return { code: 'FESTIVAL_ALREADY_ACTIVE', message: 'Festival start requires no active festival.' };
    }
    return null;
  }

  if (envelope?.type === 'FESTIVAL_ACTIVITY') {
    const blockedFestivalKey = Object.keys(envelope.payload ?? {}).find((key) => BLOCKED_FESTIVAL_PAYLOAD_KEYS.has(key));
    if (blockedFestivalKey) {
      return { code: 'CLIENT_REWARD_PAYLOAD', message: `Festival activity cannot submit trusted festival field "${blockedFestivalKey}".` };
    }
    const activeFestival = createAuthorityActiveFestival(state?.data?.activeFestival);
    if (!activeFestival) {
      return { code: 'NO_ACTIVE_FESTIVAL', message: 'Festival activity requires an active festival.' };
    }
    if (
      typeof envelope.payload?.festivalId === 'string'
      && envelope.payload.festivalId
      && envelope.payload.festivalId !== activeFestival.id
    ) {
      return { code: 'FESTIVAL_MISMATCH', message: 'Festival activity festival id must match the server-owned active festival.' };
    }
    const activityId = envelope.payload?.activityId;
    if (typeof activityId !== 'string' || !AUTHORITY_FESTIVALS[activeFestival.id]?.activities?.[activityId]) {
      return { code: 'BAD_ACTIVITY_ID', message: 'Festival activity requires a known activity for the active festival.' };
    }
    if (activeFestival.activitiesCompleted.includes(activityId)) {
      return { code: 'ACTIVITY_ALREADY_CLAIMED', message: 'Festival activity rewards can be claimed once per festival.' };
    }
    const rewards = getAuthorityFestivalActivityRewards(activeFestival.id, activityId) ?? [];
    const grant = grantAuthorityItemRewards(state?.data?.inventory, rewards);
    if (!grant.success) {
      return { code: 'INVENTORY_FULL', message: 'Festival activity requires enough server-owned inventory space for item rewards.' };
    }
    return null;
  }

  if (envelope?.type === 'FESTIVAL_END') {
    if (!createAuthorityActiveFestival(state?.data?.activeFestival)) {
      return { code: 'NO_ACTIVE_FESTIVAL', message: 'Festival end requires an active festival.' };
    }
    return null;
  }

  if (envelope?.type === 'CRAFT_ITEM') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Craft action cannot submit trusted inventory state.' };
    }
    const blockedCraftKey = Object.keys(envelope.payload ?? {}).find((key) => BLOCKED_CRAFT_PAYLOAD_KEYS.has(key));
    if (blockedCraftKey) {
      return { code: 'CLIENT_CRAFT_TOTAL', message: `Craft action cannot submit trusted crafted field "${blockedCraftKey}".` };
    }
    const craft = normalizeCraftItemPayload(envelope.payload);
    if (!craft.recipeId || !AUTHORITY_CRAFTING_RECIPES[craft.recipeId]) {
      return { code: 'BAD_RECIPE_ID', message: 'Craft action requires a known crafting recipe id.' };
    }
    const recipe = AUTHORITY_CRAFTING_RECIPES[craft.recipeId];
    const materials = resolveCraftMaterials(craft.materialsConsumed, recipe);
    if (!materials) {
      return { code: 'CRAFT_COST_MISMATCH', message: 'Craft action material payload must match the server crafting recipe.' };
    }
    if (hasOwn(envelope.payload, 'durabilityBonus')) {
      if (recipe.output.durability == null) {
        return { code: 'BAD_DURABILITY_BONUS', message: 'Craft action durability bonus requires a durable tool recipe.' };
      }
      if (
        !Number.isInteger(craft.durabilityBonus)
        || craft.durabilityBonus < 0
        || craft.durabilityBonus > AUTHORITY_MAX_CRAFTED_DURABILITY_BONUS
      ) {
        return { code: 'BAD_DURABILITY_BONUS', message: `Craft action requires an integer durability bonus from 0 to ${AUTHORITY_MAX_CRAFTED_DURABILITY_BONUS}.` };
      }
    }
    if (hasOwn(envelope.payload, 'masterwork') && typeof envelope.payload.masterwork !== 'boolean') {
      return { code: 'BAD_MASTERWORK_VALUE', message: 'Craft action requires masterwork to be boolean.' };
    }
    let inventory = createAuthorityInventory(state?.data?.inventory);
    const missing = materials.find((material) => getAuthorityInventoryItemCount(inventory, material.itemId) < material.count);
    if (missing) {
      return { code: 'NOT_ENOUGH_ITEM', message: 'Craft action requires enough server-owned crafting materials.' };
    }
    materials.forEach((material) => {
      inventory = removeAuthorityInventoryItem(inventory, material.itemId, material.count).inventory;
    });
    const durability = resolveCraftedDurability(recipe, craft.durabilityBonus);
    const preview = addAuthorityInventoryItem(inventory, recipe.output.itemId, recipe.output.count ?? 1, {
      durability: durability ?? undefined,
      maxDurability: durability ?? undefined,
      metadata: craft.masterwork ? { masterwork: true } : {},
    });
    if (!preview.success) {
      return { code: 'INVENTORY_FULL', message: 'Craft action requires enough server-owned inventory space for the crafted item.' };
    }
    return null;
  }

  if (envelope?.type === 'REMOVE_ITEM') {
    if (hasOwn(envelope.payload, 'inventory') || hasOwn(envelope.payload, 'slots')) {
      return { code: 'TRUSTED_INVENTORY_PAYLOAD', message: 'Remove item action cannot submit trusted inventory state.' };
    }
    const itemId = envelope.payload?.itemId;
    if (typeof itemId !== 'string' || !itemId.trim()) {
      return { code: 'BAD_ITEM_ID', message: 'Remove item action requires an item id.' };
    }
    const count = envelope.payload?.count ?? 1;
    if (!Number.isInteger(count) || count <= 0 || count > 99) {
      return { code: 'BAD_ITEM_COUNT', message: 'Remove item action requires an integer count from 1 to 99.' };
    }
    const inventory = createAuthorityInventory(state?.data?.inventory);
    if (getAuthorityInventoryItemCount(inventory, itemId) < count) {
      return { code: 'NOT_ENOUGH_ITEM', message: 'Remove item action requires enough server-owned inventory.' };
    }
    return null;
  }

  return null;
}

async function signedRejection(env, state, envelope, code, message, status = 422) {
  const ack = await signServerAck({
    accepted: false,
    actionId: envelope?.id ?? 'unknown',
    actionType: envelope?.type,
    checksum: state.checksum,
    rejection: { code, message },
    serverTime: new Date().toISOString(),
    sessionId: state.sessionId,
    stateVersion: state.version,
    tick: state.tick,
  }, getSecret(env));
  return jsonResponse({ ok: false, ack }, status);
}

async function handleCreateSession(request, env) {
  const body = await readJson(request);
  const sessionId = cleanSessionId(body.sessionId);
  let state = await loadSession(env, sessionId);
  if (!state) {
    state = createEngineState({
      data: createInitialAuthorityData(),
      sessionId,
    });
    await saveSession(env, state);
  }
  return jsonResponse({ ok: true, state: publicState(state) });
}

async function handleGetSession(env, sessionId) {
  const state = await loadSession(env, sessionId);
  if (!state) return problem('not_found', 'Session not found', 404);
  await saveSession(env, state);
  return jsonResponse({ ok: true, state: publicState(state) });
}

async function handleAction(request, env) {
  getSecret(env);
  const body = await readJson(request);
  const envelope = createActionEnvelope(body);
  const state = await loadSession(env, envelope.sessionId);
  if (!state) return problem('not_found', 'Session not found', 404);
  const ackKey = envelope.idempotencyKey ?? envelope.id;
  const duplicateAck = ackKey ? state.ledger?.acks?.[ackKey] : null;
  if (duplicateAck) {
    const signedAck = await signServerAck(duplicateAck, getSecret(env));
    return jsonResponse({
      ok: signedAck.accepted,
      ack: signedAck,
      duplicate: true,
      state: publicState(state),
    }, signedAck.accepted ? 200 : 422);
  }
  if (!AUTHORITY_REDUCERS[envelope.type]) {
    return signedRejection(env, state, envelope, 'ACTION_NOT_ALLOWED', 'Action type is not allowed');
  }
  const payloadError = validateAuthorityPayload(envelope, state);
  if (payloadError) {
    return signedRejection(env, state, envelope, payloadError.code, payloadError.message);
  }

  const result = applyAuthoritativeAction(state, envelope, AUTHORITY_REDUCERS);
  const signedAck = await signServerAck(result.ack, getSecret(env));
  if (result.ack.accepted && !result.duplicate) {
    const nextState = {
      ...result.state,
      ledger: {
        ...(result.state.ledger ?? { acks: {}, cursor: '0', entries: [] }),
        acks: { ...(result.state.ledger?.acks ?? {}) },
      },
    };
    if (ackKey) nextState.ledger.acks[ackKey] = signedAck;
    await saveSession(env, nextState);
    return jsonResponse({
      ok: signedAck.accepted,
      ack: signedAck,
      duplicate: result.duplicate,
      state: publicState(nextState),
    }, 200);
  }
  return jsonResponse({
    ok: signedAck.accepted,
    ack: signedAck,
    duplicate: result.duplicate,
    state: publicState(result.state),
  }, signedAck.accepted ? 200 : 422);
}

async function handleVerifyAck(request, env) {
  const body = await readJson(request);
  const verified = await verifyServerAckSignature(body.ack, getSecret(env));
  return jsonResponse({ ok: verified, verified }, verified ? 200 : 422);
}

async function handle(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (method === 'GET' && url.pathname === '/health') {
    return jsonResponse({ ok: true, service: 'garden-os-authority' });
  }
  if (method === 'POST' && url.pathname === '/session') return handleCreateSession(request, env);
  const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/);
  if (method === 'GET' && sessionMatch) return handleGetSession(env, sessionMatch[1]);
  if (method === 'POST' && url.pathname === '/action') return handleAction(request, env);
  if (method === 'POST' && url.pathname === '/ack/verify') return handleVerifyAck(request, env);
  return problem('not_found', 'Endpoint not found', 404);
}

const worker = {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      return problem(error.code ?? 'server_error', error.message ?? 'Unexpected server error', error.status ?? 500);
    }
  },
  __test: {
    AUTHORITY_REDUCERS,
    constantTimeEqual,
    handle,
    MAX_BODY_BYTES,
    SESSION_TTL_SECONDS,
    signServerAck,
    verifyServerAckSignature,
  },
};

export default worker;
