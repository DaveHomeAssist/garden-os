import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  applyAuthoritativeAction,
  createEngineState,
  stableStringify,
} from '../engine/authoritative-engine.js';

const ACK_SIGNATURE_PREFIX = 'hmac-sha256:';
const DEFAULT_GAME_ID = 'garden';
const DEFAULT_SECRET = 'dev-only-garden-os-authority-secret';
const AUTHORITY_GRID_SIZE = 32;
const AUTHORITY_INVENTORY_CAPACITY = 20;
const AUTHORITY_ITEM_CATEGORIES = {
  MATERIALS: 'materials',
  TOOLS: 'tools',
};
const AUTHORITY_ITEM_DEFS = {
  fertilizer_bag: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 20, stackable: true },
  mulch_bag: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 10, stackable: true },
  pest_spray: { category: AUTHORITY_ITEM_CATEGORIES.MATERIALS, maxStack: 10, stackable: true },
  pruning_shears: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 50, stackable: false },
  watering_can: { category: AUTHORITY_ITEM_CATEGORIES.TOOLS, durability: 100, stackable: false },
};
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
const BLOCKED_SESSION_KEYS = new Set(['data', 'entityTotals', 'entities', 'fullState', 'gameState', 'players', 'resourceTotals', 'resources', 'state']);
const BLOCKED_HARVEST_PAYLOAD_KEYS = new Set(['currency', 'harvestResult', 'inventory', 'pantry', 'recipesCompleted', 'yield', 'yieldCount']);
const ACTIONS = {
  APPLY_TOOL_INTERVENTION: 'APPLY_TOOL_INTERVENTION',
  CARRY_FORWARD: 'CARRY_FORWARD',
  HARVEST_CELL: 'HARVEST_CELL',
  PLANT_CROP: 'PLANT_CROP',
  REMOVE_CROP: 'REMOVE_CROP',
  REMOVE_ITEM: 'REMOVE_ITEM',
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
  SET_COOLDOWN: 'SET_COOLDOWN',
  SET_DAMAGE: 'SET_DAMAGE',
  SET_PROTECTION: 'SET_PROTECTION',
  SET_SELECTED_CROP: 'SET_SELECTED_CROP',
  UPDATE_SOIL: 'UPDATE_SOIL',
  USE_TOOL: 'USE_TOOL',
  WATER_CELL: 'WATER_CELL',
  ZONE_CHANGED: 'ZONE_CHANGED',
};
const ROUTED_ACTION_TYPES = new Set([
  ACTIONS.APPLY_TOOL_INTERVENTION,
  ACTIONS.CARRY_FORWARD,
  ACTIONS.HARVEST_CELL,
  ACTIONS.PLANT_CROP,
  ACTIONS.REMOVE_CROP,
  ACTIONS.REMOVE_ITEM,
  ACTIONS.SET_DAMAGE,
  ACTIONS.SET_SELECTED_CROP,
  ACTIONS.SET_ACTIVE_TOOL,
  ACTIONS.SET_COOLDOWN,
  ACTIONS.SET_PROTECTION,
  ACTIONS.UPDATE_SOIL,
  ACTIONS.USE_TOOL,
  ACTIONS.WATER_CELL,
  ACTIONS.ZONE_CHANGED,
]);
const COOLDOWN_KEY_RE = /^[A-Za-z0-9_-]+_[0-9]+$/;

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

function clampUnitNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function getAuthorityItemDef(itemId) {
  return AUTHORITY_ITEM_DEFS[itemId] ?? {
    category: AUTHORITY_ITEM_CATEGORIES.MATERIALS,
    maxStack: 99,
    stackable: true,
  };
}

function createAuthorityInventoryState(capacity = AUTHORITY_INVENTORY_CAPACITY, tier = 1) {
  return {
    capacity,
    equippedToolId: null,
    slots: Array.from({ length: capacity }, () => null),
    tier,
  };
}

function normalizeAuthorityInventorySlot(slot) {
  if (!slot?.itemId) return null;
  const itemDef = getAuthorityItemDef(slot.itemId);
  return {
    category: slot.category ?? itemDef.category,
    count: Math.max(1, Number(slot.count ?? 1)),
    durability: slot.durability ?? itemDef.durability ?? null,
    itemId: slot.itemId,
    maxDurability: slot.maxDurability ?? itemDef.durability ?? null,
    metadata: cloneValue(slot.metadata ?? {}),
  };
}

function normalizeAuthorityInventoryState(raw) {
  if (raw?.slots && Array.isArray(raw.slots)) {
    const capacity = Math.max(Number(raw.capacity ?? raw.slots.length ?? AUTHORITY_INVENTORY_CAPACITY), AUTHORITY_INVENTORY_CAPACITY);
    const inventory = createAuthorityInventoryState(capacity, Number(raw.tier ?? 1));
    raw.slots.slice(0, capacity).forEach((slot, index) => {
      inventory.slots[index] = normalizeAuthorityInventorySlot(slot);
    });
    inventory.equippedToolId = raw.equippedToolId ?? null;
    return inventory;
  }

  let inventory = createAuthorityInventoryState();
  for (const [itemId, count] of Object.entries(raw ?? {})) {
    if (['capacity', 'equippedToolId', 'slots', 'tier'].includes(itemId) || Number(count) <= 0) continue;
    inventory = addAuthorityInventoryItem(inventory, itemId, Number(count)).inventory;
  }
  return inventory;
}

function cloneAuthorityInventory(inventoryState) {
  const inventory = normalizeAuthorityInventoryState(inventoryState);
  return {
    ...inventory,
    slots: inventory.slots.map((slot) => cloneValue(slot)),
  };
}

function addAuthorityInventoryItem(inventoryState, itemId, count = 1) {
  const inventory = cloneAuthorityInventory(inventoryState);
  const itemDef = getAuthorityItemDef(itemId);
  let remaining = Math.max(1, Number(count ?? 1));

  if (itemDef.stackable) {
    for (const slot of inventory.slots) {
      if (!slot || slot.itemId !== itemId || remaining <= 0) continue;
      const room = Math.max(0, (itemDef.maxStack ?? 99) - (slot.count ?? 0));
      const added = Math.min(room, remaining);
      slot.count += added;
      remaining -= added;
    }
  }

  while (remaining > 0) {
    const emptyIndex = inventory.slots.findIndex((slot) => !slot);
    if (emptyIndex < 0) break;
    const added = itemDef.stackable ? Math.min(itemDef.maxStack ?? 99, remaining) : 1;
    inventory.slots[emptyIndex] = normalizeAuthorityInventorySlot({
      itemId,
      category: itemDef.category,
      count: added,
      durability: itemDef.durability ?? null,
      maxDurability: itemDef.durability ?? null,
    });
    remaining -= added;
  }

  return {
    added: Math.max(0, Number(count ?? 1) - remaining),
    inventory,
    success: remaining === 0,
  };
}

function getAuthorityInventoryItemCount(inventoryState, itemId) {
  const inventory = normalizeAuthorityInventoryState(inventoryState);
  return inventory.slots.reduce((total, slot) => (
    slot?.itemId === itemId ? total + Number(slot.count ?? 0) : total
  ), 0);
}

function removeAuthorityInventoryItem(inventoryState, itemId, count = 1) {
  const inventory = cloneAuthorityInventory(inventoryState);
  let remaining = Math.max(1, Math.floor(Number(count ?? 1)));
  const before = getAuthorityInventoryItemCount(inventory, itemId);

  for (let index = inventory.slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const slot = inventory.slots[index];
    if (!slot || slot.itemId !== itemId) continue;
    const removed = Math.min(Number(slot.count ?? 0), remaining);
    const nextCount = Number(slot.count ?? 0) - removed;
    remaining -= removed;
    inventory.slots[index] = nextCount > 0 ? { ...slot, count: nextCount } : null;
  }

  return {
    inventory,
    removed: before - getAuthorityInventoryItemCount(inventory, itemId),
    success: remaining === 0,
  };
}

function applyAuthorityToolDurability(inventoryState, slotIndex, durabilityCost = 1) {
  const inventory = cloneAuthorityInventory(inventoryState);
  const slot = inventory.slots[slotIndex];
  if (!slot) return { inventory, reason: 'Missing tool slot', success: false };
  const itemDef = getAuthorityItemDef(slot.itemId);
  if ((slot.category ?? itemDef.category) !== AUTHORITY_ITEM_CATEGORIES.TOOLS) {
    return { inventory, reason: 'Not a tool', success: false };
  }
  inventory.slots[slotIndex] = {
    ...slot,
    durability: Math.max(0, (slot.durability ?? slot.maxDurability ?? itemDef.durability ?? 0) - durabilityCost),
    maxDurability: slot.maxDurability ?? itemDef.durability ?? null,
  };
  return { inventory, success: true };
}

function createStarterAuthorityInventory() {
  let inventory = createAuthorityInventoryState();
  inventory = addAuthorityInventoryItem(inventory, 'watering_can', 1).inventory;
  inventory = addAuthorityInventoryItem(inventory, 'pruning_shears', 1).inventory;
  inventory = addAuthorityInventoryItem(inventory, 'fertilizer_bag', 3).inventory;
  inventory = addAuthorityInventoryItem(inventory, 'pest_spray', 3).inventory;
  inventory = addAuthorityInventoryItem(inventory, 'mulch_bag', 3).inventory;
  return inventory;
}

function createAuthorityInventory(inventory) {
  return normalizeAuthorityInventoryState(inventory ?? createStarterAuthorityInventory());
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
  activeTool = 'hand',
  currentZone = 'player_plot',
  grid = [],
  inventory = null,
  lastCarryForward = null,
  lastCooldown = null,
  lastDamage = null,
  lastHarvesting = null,
  lastItemRemoval = null,
  lastPlanting = null,
  lastProtection = null,
  lastRemoval = null,
  lastSoil = null,
  lastToolIntervention = null,
  lastToolUse = null,
  lastWatering = null,
  lastSpawnPoint = null,
  selectedCropId = null,
  toolCooldowns = {},
  visitedZones = ['player_plot'],
} = {}) {
  return {
    activeTool,
    currentZone,
    grid: createAuthorityGrid(grid),
    inventory: createAuthorityInventory(inventory),
    lastCarryForward,
    lastCooldown,
    lastDamage,
    lastHarvesting,
    lastItemRemoval,
    lastPlanting,
    lastProtection,
    lastRemoval,
    lastSoil,
    lastToolIntervention,
    lastToolUse,
    lastWatering,
    lastSpawnPoint,
    selectedCropId,
    toolCooldowns: createAuthorityCooldowns(toolCooldowns),
    visitedZones: Array.isArray(visitedZones) && visitedZones.length ? [...new Set(visitedZones)] : ['player_plot'],
  };
}

function isoNow(now = Date.now) {
  const value = typeof now === 'function' ? now() : now;
  return new Date(value).toISOString();
}

function normalizeSecret(secret = process.env.GOS_AUTHORITY_HMAC_SECRET) {
  return String(secret || DEFAULT_SECRET);
}

function ackSigningPayload(ack) {
  const { signature, ...unsigned } = ack ?? {};
  return unsigned;
}

function signAuthorityAck(ack, secret = process.env.GOS_AUTHORITY_HMAC_SECRET) {
  const digest = createHmac('sha256', normalizeSecret(secret))
    .update(stableStringify(ackSigningPayload(ack)))
    .digest('hex');
  return `${ACK_SIGNATURE_PREFIX}${digest}`;
}

function verifyAuthorityAckSignature(ack, secret = process.env.GOS_AUTHORITY_HMAC_SECRET) {
  if (!ack?.signature?.startsWith(ACK_SIGNATURE_PREFIX)) return false;
  const expected = Buffer.from(signAuthorityAck(ack, secret));
  const actual = Buffer.from(ack.signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signAck(ack, secret) {
  return {
    ...ack,
    signature: signAuthorityAck(ack, secret),
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
    toolId,
    wateredAt: Number.isFinite(payload.wateredAt)
      ? payload.wateredAt
      : (Number.isFinite(payload.appliedAt) ? payload.appliedAt : null),
  };
}

function createMemoryLedgerStore() {
  const entries = [];
  return {
    async append(entry) {
      entries.push(cloneValue(entry));
    },
    entries,
  };
}

function createMemorySessionStore() {
  const sessions = new Map();
  return {
    async get(sessionId) {
      return cloneValue(sessions.get(sessionId));
    },
    async set(state) {
      sessions.set(state.sessionId, cloneValue(state));
      return cloneValue(state);
    },
    sessions,
  };
}

function createFileLedgerStore({
  directory = process.env.GOS_AUTHORITY_LEDGER_DIR ?? join(process.cwd(), '.garden-os-authority'),
  filename = 'ledger.jsonl',
} = {}) {
  const filePath = join(directory, filename);
  return {
    async append(entry) {
      await mkdir(directory, { recursive: true });
      await appendFile(filePath, `${stableStringify(entry)}\n`, 'utf8');
    },
    filePath,
  };
}

function resolveUpstashConfig({
  fetchFn = globalThis.fetch,
  token = process.env.GOS_AUTHORITY_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  url = process.env.GOS_AUTHORITY_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_REST_URL,
} = {}) {
  return {
    fetchFn,
    token,
    url: typeof url === 'string' ? url.replace(/\/$/, '') : '',
  };
}

async function upstashCommand(config, command) {
  if (!config.url || !config.token) {
    throw new Error('Upstash REST URL and token are required.');
  }
  if (typeof config.fetchFn !== 'function') {
    throw new Error('fetch is required for Upstash REST storage.');
  }
  const response = await config.fetchFn(config.url, {
    body: JSON.stringify(command),
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) {
    throw new Error(body?.error ?? `Upstash command failed with HTTP ${response.status}.`);
  }
  return body?.result;
}

function createUpstashSessionStore({
  keyPrefix = process.env.GOS_AUTHORITY_REDIS_PREFIX ?? 'gos:story-authority',
  ...configOptions
} = {}) {
  const config = resolveUpstashConfig(configOptions);
  const keyFor = (sessionId) => `${keyPrefix}:session:${sessionId}`;
  return {
    async get(sessionId) {
      if (!sessionId) return null;
      const result = await upstashCommand(config, ['GET', keyFor(sessionId)]);
      if (!result) return null;
      return JSON.parse(result);
    },
    async set(state) {
      if (!state?.sessionId) return null;
      await upstashCommand(config, ['SET', keyFor(state.sessionId), stableStringify(state)]);
      return cloneValue(state);
    },
  };
}

function createUpstashLedgerStore({
  keyPrefix = process.env.GOS_AUTHORITY_REDIS_PREFIX ?? 'gos:story-authority',
  ...configOptions
} = {}) {
  const config = resolveUpstashConfig(configOptions);
  return {
    async append(entry) {
      const serialized = stableStringify(entry);
      await upstashCommand(config, ['RPUSH', `${keyPrefix}:ledger`, serialized]);
      if (entry?.sessionId) {
        await upstashCommand(config, ['RPUSH', `${keyPrefix}:ledger:${entry.sessionId}`, serialized]);
      }
    },
  };
}

function reduceStoryAction(data, payload, envelope) {
  if (envelope.type === ACTIONS.APPLY_TOOL_INTERVENTION) {
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

    const inventory = createAuthorityInventory(data.inventory);
    const itemCount = intervention.itemId ? Math.max(1, Math.floor(Number(intervention.itemCount ?? 1))) : 0;
    const itemRemoval = intervention.itemId
      ? removeAuthorityInventoryItem(inventory, intervention.itemId, itemCount)
      : { inventory, success: true };
    const toolCooldowns = {
      ...createAuthorityCooldowns(data.toolCooldowns),
      [intervention.cooldown.key]: intervention.cooldown.until,
    };

    return {
      ...data,
      grid,
      inventory: itemRemoval.inventory,
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
          ? getAuthorityInventoryItemCount(itemRemoval.inventory, intervention.itemId)
          : null,
        toolId: intervention.toolId,
        wateredAt: intervention.toolId === 'water' ? intervention.wateredAt : undefined,
      },
      toolCooldowns,
    };
  }
  if (envelope.type === ACTIONS.SET_DAMAGE) {
    const cellIndex = payload.cellIndex;
    const damageState = typeof payload.damageState === 'string' ? payload.damageState : null;
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      damageState,
    };
    return {
      ...data,
      grid,
      lastDamage: { cellIndex, damageState },
    };
  }
  if (envelope.type === ACTIONS.UPDATE_SOIL) {
    const cellIndex = payload.cellIndex;
    const soilFatigue = clampUnitNumber(payload.soilFatigue);
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      soilFatigue,
    };
    return {
      ...data,
      grid,
      lastSoil: { cellIndex, soilFatigue },
    };
  }
  if (envelope.type === ACTIONS.CARRY_FORWARD) {
    const cellIndex = payload.cellIndex;
    const carryForwardType = typeof payload.carryForwardType === 'string' ? payload.carryForwardType : null;
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      carryForwardType,
    };
    if (hasOwn(payload, 'mulched')) {
      grid[cellIndex].mulched = Boolean(payload.mulched);
    }
    return {
      ...data,
      grid,
      lastCarryForward: {
        carryForwardType,
        cellIndex,
        mulched: grid[cellIndex].mulched,
      },
    };
  }
  if (envelope.type === ACTIONS.PLANT_CROP) {
    const cellIndex = payload.cellIndex;
    const cropId = payload.cropId;
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      cropId,
      damageState: null,
    };
    return {
      ...data,
      grid,
      lastPlanting: { cellIndex, cropId },
    };
  }
  if (envelope.type === ACTIONS.REMOVE_CROP) {
    const cellIndex = payload.cellIndex;
    const grid = createAuthorityGrid(data.grid);
    const cropId = grid[cellIndex]?.cropId;
    const removedAt = Number.isFinite(payload.removedAt) ? payload.removedAt : null;
    grid[cellIndex] = {
      ...grid[cellIndex],
      cropId: null,
      damageState: null,
    };
    return {
      ...data,
      grid,
      lastRemoval: { cellIndex, cropId, removedAt },
    };
  }
  if (envelope.type === ACTIONS.SET_PROTECTION) {
    const cellIndex = payload.cellIndex;
    const protectedValue = Boolean(payload.protected);
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      protected: protectedValue,
    };
    return {
      ...data,
      grid,
      lastProtection: { cellIndex, protected: protectedValue },
    };
  }
  if (envelope.type === ACTIONS.WATER_CELL) {
    const cellIndex = payload.cellIndex;
    const bonus = Number.isFinite(payload.bonus) ? payload.bonus : 0;
    const wateredAt = Number.isFinite(payload.wateredAt) ? payload.wateredAt : null;
    const grid = createAuthorityGrid(data.grid);
    grid[cellIndex] = {
      ...grid[cellIndex],
      interventionBonus: Math.min(1, Math.max(0, (grid[cellIndex].interventionBonus ?? 0) + bonus)),
      lastWateredAt: wateredAt,
    };
    return {
      ...data,
      grid,
      lastWatering: {
        bonus,
        cellIndex,
        interventionBonus: grid[cellIndex].interventionBonus,
        wateredAt,
      },
    };
  }
  if (envelope.type === ACTIONS.HARVEST_CELL) {
    const cellIndex = payload.cellIndex;
    const grid = createAuthorityGrid(data.grid);
    const cropId = grid[cellIndex]?.cropId;
    const harvestedAt = Number.isFinite(payload.harvestedAt) ? payload.harvestedAt : null;
    grid[cellIndex] = createAuthorityCell();
    return {
      ...data,
      grid,
      lastHarvesting: {
        cellIndex,
        cropId,
        harvestedAt,
        yieldCount: 1,
      },
    };
  }
  if (envelope.type === ACTIONS.SET_SELECTED_CROP) {
    return {
      ...data,
      selectedCropId: payload.cropId ?? null,
    };
  }
  if (envelope.type === ACTIONS.SET_ACTIVE_TOOL) {
    return {
      ...data,
      activeTool: payload.toolId ?? null,
    };
  }
  if (envelope.type === ACTIONS.SET_COOLDOWN) {
    const cooldown = normalizeCooldownPayload(payload);
    return {
      ...data,
      lastCooldown: cooldown,
      toolCooldowns: {
        ...createAuthorityCooldowns(data.toolCooldowns),
        [cooldown.key]: cooldown.until,
      },
    };
  }
  if (envelope.type === ACTIONS.REMOVE_ITEM) {
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
  }
  if (envelope.type === ACTIONS.USE_TOOL) {
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
  }
  if (envelope.type === ACTIONS.ZONE_CHANGED) {
    const currentZone = typeof payload.toZone === 'string' && payload.toZone
      ? payload.toZone
      : data.currentZone;
    const visitedZones = new Set(Array.isArray(data.visitedZones) ? data.visitedZones : ['player_plot']);
    if (currentZone) visitedZones.add(currentZone);
    return {
      ...data,
      currentZone,
      lastSpawnPoint: cloneValue(payload.spawnPoint ?? null),
      visitedZones: [...visitedZones],
    };
  }
  return data;
}

function validateStoryActionPayload(envelope, state) {
  const grid = createAuthorityGrid(state?.data?.grid);
  const cellIndex = envelope.payload?.cellIndex;
  if (envelope?.type === ACTIONS.APPLY_TOOL_INTERVENTION) {
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
    if (expectedItemId) {
      const inventory = createAuthorityInventory(state?.data?.inventory);
      if (getAuthorityInventoryItemCount(inventory, intervention.itemId) < intervention.itemCount) {
        return { code: 'NOT_ENOUGH_ITEM', message: 'Tool intervention requires enough server-owned inventory.' };
      }
    }
    return null;
  }
  if (envelope?.type === ACTIONS.SET_DAMAGE) {
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

  if (envelope?.type === ACTIONS.UPDATE_SOIL) {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Soil action requires a valid starter-grid cell index.' };
    }
    const soilFatigue = envelope.payload?.soilFatigue;
    if (!Number.isFinite(soilFatigue) || soilFatigue < 0 || soilFatigue > 1) {
      return { code: 'BAD_SOIL_FATIGUE', message: 'Soil action requires a finite soilFatigue from 0 to 1.' };
    }
    return null;
  }

  if (envelope?.type === ACTIONS.CARRY_FORWARD) {
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

  if (envelope?.type === ACTIONS.PLANT_CROP) {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Plant action requires a valid starter-grid cell index.' };
    }
    if (typeof envelope.payload?.cropId !== 'string' || !envelope.payload.cropId.trim()) {
      return { code: 'BAD_CROP_ID', message: 'Plant action requires a crop id.' };
    }
    return null;
  }

  if (envelope?.type === ACTIONS.REMOVE_CROP) {
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

  if (envelope?.type === ACTIONS.SET_PROTECTION) {
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

  if (envelope?.type === ACTIONS.WATER_CELL) {
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

  if (envelope?.type === ACTIONS.HARVEST_CELL) {
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
    return null;
  }

  if (envelope?.type === ACTIONS.SET_COOLDOWN) {
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

  if (envelope?.type === ACTIONS.USE_TOOL) {
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

  if (envelope?.type === ACTIONS.REMOVE_ITEM) {
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

function sessionSummary(state) {
  return {
    checksum: state.checksum,
    gameId: state.gameId,
    ledgerCursor: state.ledger?.cursor ?? '0',
    sessionId: state.sessionId,
    stateVersion: state.version,
    tick: state.tick,
  };
}

function ledgerActionEntry({ ack, duplicate, envelope, previousState, serverTime, state }) {
  return {
    accepted: ack.accepted,
    actionId: envelope?.id ?? ack.actionId,
    checksum: ack.checksum,
    duplicate: Boolean(duplicate),
    idempotencyKey: envelope?.idempotencyKey ?? null,
    nextTick: state.tick,
    previousChecksum: previousState?.checksum ?? null,
    recordType: 'action',
    rejection: ack.rejection ?? null,
    serverTime,
    sessionId: ack.sessionId,
    signature: ack.signature,
  };
}

function createRejectedAck({
  actionId = 'unknown',
  actionType,
  checksum = 'unavailable',
  code,
  message,
  serverTime,
  sessionId = 'unknown',
  stateVersion = 1,
  tick = 0,
}, secret) {
  return signAck({
    accepted: false,
    actionId,
    actionType,
    checksum,
    rejection: { code, message },
    serverTime,
    sessionId,
    stateVersion,
    tick,
  }, secret);
}

function createAuthorityService({
  ledgerStore = createMemoryLedgerStore(),
  now = Date.now,
  secret = process.env.GOS_AUTHORITY_HMAC_SECRET,
  sessionIdFactory = randomUUID,
  sessionStore = createMemorySessionStore(),
} = {}) {
  const hmacSecret = normalizeSecret(secret);

  async function createSession(body = {}) {
    const serverTime = isoNow(now);
    const blockedKey = Object.keys(body ?? {}).find((key) => BLOCKED_SESSION_KEYS.has(key));
    if (blockedKey) {
      return {
        ok: false,
        rejection: {
          code: 'TRUSTED_SESSION_PAYLOAD',
          message: `Session request cannot include trusted state field "${blockedKey}".`,
        },
      };
    }
    const sessionId = body.sessionId || sessionIdFactory();
    const state = createEngineState({
      data: createInitialAuthorityData(),
      gameId: body.gameId ?? DEFAULT_GAME_ID,
      seed: body.seed ?? `garden-os:${sessionId}`,
      sessionId,
      now: serverTime,
    });
    await sessionStore.set(state);
    await ledgerStore.append({
      checksum: state.checksum,
      gameId: state.gameId,
      recordType: 'session',
      seed: state.seed,
      serverTime,
      sessionId,
      tick: state.tick,
    });
    return {
      ok: true,
      session: sessionSummary(state),
    };
  }

  async function getSessionState(envelope) {
    if (!envelope?.sessionId) return null;
    let state = await sessionStore.get(envelope.sessionId);
    if (!state) {
      state = createEngineState({
        data: createInitialAuthorityData(),
        gameId: envelope.gameId ?? DEFAULT_GAME_ID,
        seed: `garden-os:${envelope.sessionId}`,
        sessionId: envelope.sessionId,
        now: isoNow(now),
      });
      await sessionStore.set(state);
    }
    return state;
  }

  async function applyAction(envelope = {}) {
    const previousState = await getSessionState(envelope);
    if (!previousState) {
      const ack = createRejectedAck({
        actionId: envelope?.id,
        actionType: envelope?.type,
        code: 'BAD_SESSION',
        message: 'Session id is required.',
        serverTime: isoNow(now),
        sessionId: envelope?.sessionId,
      }, hmacSecret);
      return { ack, ok: false, session: null };
    }

    const serverTime = isoNow(now);
    const ackKey = envelope?.idempotencyKey ?? envelope?.id;
    const duplicateAck = ackKey ? previousState.ledger?.acks?.[ackKey] : null;
    if (duplicateAck) {
      const signedAck = signAck(duplicateAck, hmacSecret);
      await ledgerStore.append(ledgerActionEntry({
        ack: signedAck,
        duplicate: true,
        envelope,
        previousState,
        serverTime,
        state: previousState,
      }));
      return { ack: signedAck, duplicate: true, ok: signedAck.accepted, session: sessionSummary(previousState) };
    }

    if (!ROUTED_ACTION_TYPES.has(envelope?.type)) {
      const ack = createRejectedAck({
        actionId: envelope?.id,
        actionType: envelope?.type,
        checksum: previousState.checksum,
        code: 'UNSUPPORTED_ACTION_TYPE',
        message: 'Action type is not routed through Story Mode authority yet.',
        serverTime,
        sessionId: previousState.sessionId,
        stateVersion: previousState.version,
        tick: previousState.tick,
      }, hmacSecret);
      await ledgerStore.append(ledgerActionEntry({
        ack,
        duplicate: false,
        envelope,
        previousState,
        serverTime,
        state: previousState,
      }));
      return { ack, duplicate: false, ok: false, session: sessionSummary(previousState) };
    }

    const payloadError = validateStoryActionPayload(envelope, previousState);
    if (payloadError) {
      const ack = createRejectedAck({
        actionId: envelope?.id,
        actionType: envelope?.type,
        checksum: previousState.checksum,
        code: payloadError.code,
        message: payloadError.message,
        serverTime,
        sessionId: previousState.sessionId,
        stateVersion: previousState.version,
        tick: previousState.tick,
      }, hmacSecret);
      await ledgerStore.append(ledgerActionEntry({
        ack,
        duplicate: false,
        envelope,
        previousState,
        serverTime,
        state: previousState,
      }));
      return { ack, duplicate: false, ok: false, session: sessionSummary(previousState) };
    }

    const result = applyAuthoritativeAction(previousState, envelope, reduceStoryAction, { now: serverTime });
    const signedAck = signAck(result.ack, hmacSecret);
    const nextState = {
      ...result.state,
      ledger: {
        ...(result.state.ledger ?? { acks: {}, cursor: '0', entries: [] }),
        acks: { ...(result.state.ledger?.acks ?? {}) },
      },
    };
    if (ackKey && signedAck.accepted) {
      nextState.ledger.acks[ackKey] = signedAck;
    }
    await sessionStore.set(nextState);
    await ledgerStore.append(ledgerActionEntry({
      ack: signedAck,
      duplicate: result.duplicate,
      envelope,
      previousState,
      serverTime,
      state: nextState,
    }));
    return {
      ack: signedAck,
      duplicate: result.duplicate,
      ok: signedAck.accepted,
      session: sessionSummary(nextState),
    };
  }

  async function verifyAck(ack) {
    return {
      ok: true,
      verified: verifyAuthorityAckSignature(ack, hmacSecret),
    };
  }

  return {
    applyAction,
    createSession,
    ledgerStore,
    sessions: sessionStore.sessions ?? null,
    sessionStore,
    verifyAck,
  };
}

export {
  ACK_SIGNATURE_PREFIX,
  createAuthorityService,
  createFileLedgerStore,
  createMemoryLedgerStore,
  createMemorySessionStore,
  createUpstashLedgerStore,
  createUpstashSessionStore,
  signAuthorityAck,
  upstashCommand,
  verifyAuthorityAckSignature,
};
