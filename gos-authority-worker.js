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

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 64 * 1024;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const AUTHORITY_GRID_SIZE = 32;
const AUTHORITY_INVENTORY_CAPACITY = 20;
const BLOCKED_HARVEST_PAYLOAD_KEYS = new Set(['currency', 'harvestResult', 'inventory', 'pantry', 'recipesCompleted', 'yield', 'yieldCount']);
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

function normalizeAuthoritySlot(slot) {
  if (!slot?.itemId) return null;
  const durability = Number(slot.durability);
  const maxDurability = Number(slot.maxDurability);
  return {
    itemId: String(slot.itemId),
    category: typeof slot.category === 'string' ? slot.category : 'materials',
    count: Math.max(1, Number(slot.count ?? 1)),
    durability: Number.isFinite(durability) ? durability : null,
    maxDurability: Number.isFinite(maxDurability) ? maxDurability : null,
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
  activeTool = null,
  currentZone = 'player_plot',
  grid = [],
  inventory = null,
  lastCarryForward = null,
  lastCooldown = null,
  lastDamage = null,
  lastHarvesting = null,
  lastPlanting = null,
  lastProtection = null,
  lastRemoval = null,
  lastSoil = null,
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
    lastPlanting,
    lastProtection,
    lastRemoval,
    lastSoil,
    lastToolUse,
    lastWatering,
    lastSpawnPoint,
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

const AUTHORITY_REDUCERS = {
  NOOP: (data) => data,
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
    return {
      ...data,
      grid,
      lastHarvesting: {
        cellIndex: payload.cellIndex,
        cropId,
        harvestedAt,
        yieldCount: 1,
      },
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
