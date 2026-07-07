import { createActionEnvelope } from './authoritative-engine.js';

const DB_NAME = 'gos-story-authority-v1';
const DB_VERSION = 1;
const STORES = {
  ACKS: 'acks',
  META: 'meta',
  OUTBOUND: 'outbound',
  SNAPSHOTS: 'snapshots',
};
const SESSION_POINTER_PREFIX = 'gos-story-authority-session';
const AUTHORITY_URL_KEY = 'gos-story-authority-url';
const AUTHORITY_META_NAME = 'garden-os-authority-url';
const BUILD_AUTHORITY_URL = import.meta.env?.VITE_GARDEN_OS_AUTHORITY_URL ?? null;
const AUTHORITY_ROUTED_REMOVE_ITEM_IDS = new Set(['fertilizer_bag', 'mulch_bag', 'pest_spray']);
const ROUTED_ACTION_TYPES = new Set(['APPLY_TOOL_INTERVENTION', 'CARRY_FORWARD', 'HARVEST_CELL', 'PLANT_CROP', 'REMOVE_CROP', 'REMOVE_ITEM', 'SET_ACTIVE_TOOL', 'SET_COOLDOWN', 'SET_DAMAGE', 'SET_PROTECTION', 'SET_SELECTED_CROP', 'UPDATE_SOIL', 'USE_TOOL', 'WATER_CELL', 'ZONE_CHANGED']);
const MAX_DRAIN_ACTIONS = 20;

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

function isoNow(now = Date.now) {
  const value = typeof now === 'function' ? now() : now;
  return new Date(value).toISOString();
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionStore(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function storeKey(sessionId, id) {
  return `${sessionId}:${id}`;
}

function isValidSnapshot(record, sessionId) {
  return (
    record
    && record.sessionId === sessionId
    && record.state
    && typeof record.state === 'object'
  );
}

function getStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === 'function' ? storage : null;
}

function getGlobalIndexedDB(indexedDB = globalThis.indexedDB) {
  return indexedDB && typeof indexedDB.open === 'function' ? indexedDB : null;
}

function normalizeAuthorityUrl(url) {
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/$/, '') : null;
}

function sessionPointerKey(slot) {
  return `${SESSION_POINTER_PREFIX}-${slot}`;
}

function randomSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function ensureSessionPointer(slot, storage = globalThis.localStorage) {
  const safeStorage = getStorage(storage);
  const key = sessionPointerKey(slot);
  const existing = safeStorage?.getItem(key);
  if (existing) return existing;
  const sessionId = randomSessionId();
  safeStorage?.setItem(key, sessionId);
  return sessionId;
}

function resolveAuthorityUrl({
  authorityUrl,
  document = globalThis.document,
  globalScope = globalThis,
  storage = globalThis.localStorage,
} = {}) {
  const explicit = normalizeAuthorityUrl(authorityUrl);
  if (explicit) return explicit;

  const configured = normalizeAuthorityUrl(getStorage(storage)?.getItem(AUTHORITY_URL_KEY));
  if (configured) return configured;

  const runtimeGlobal = normalizeAuthorityUrl(globalScope?.GARDEN_OS_AUTHORITY_URL);
  if (runtimeGlobal) return runtimeGlobal;

  const metaUrl = normalizeAuthorityUrl(
    document?.querySelector?.(`meta[name="${AUTHORITY_META_NAME}"]`)?.getAttribute?.('content'),
  );
  if (metaUrl) return metaUrl;

  return normalizeAuthorityUrl(BUILD_AUTHORITY_URL);
}

function isAuthorityRoutedAction(action) {
  if (action?.type === 'REMOVE_ITEM') {
    return AUTHORITY_ROUTED_REMOVE_ITEM_IDS.has(action.payload?.itemId);
  }
  return ROUTED_ACTION_TYPES.has(action?.type);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildAuthorityEnvelope(action, state, {
  clientSeq,
  now = Date.now,
  sessionId,
} = {}) {
  return createActionEnvelope({
    clientSentAt: isoNow(now),
    clientSeq,
    expectedTick: state?.authorityTick,
    id: `${sessionId}:${clientSeq}:${action.type}`,
    idempotencyKey: `${sessionId}:${clientSeq}:${action.type}`,
    payload: action.payload ?? {},
    sessionId,
    type: action.type,
  });
}

function clonePosition(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const z = Number(value.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z };
}

function inferAckActionType(ack) {
  if (typeof ack?.actionType === 'string') return ack.actionType;
  const actionId = String(ack?.actionId ?? '');
  if (actionId.endsWith(':APPLY_TOOL_INTERVENTION')) return 'APPLY_TOOL_INTERVENTION';
  if (actionId.endsWith(':PLANT_CROP')) return 'PLANT_CROP';
  if (actionId.endsWith(':REMOVE_CROP')) return 'REMOVE_CROP';
  if (actionId.endsWith(':REMOVE_ITEM')) return 'REMOVE_ITEM';
  if (actionId.endsWith(':HARVEST_CELL')) return 'HARVEST_CELL';
  if (actionId.endsWith(':SET_DAMAGE')) return 'SET_DAMAGE';
  if (actionId.endsWith(':SET_SELECTED_CROP')) return 'SET_SELECTED_CROP';
  if (actionId.endsWith(':SET_ACTIVE_TOOL')) return 'SET_ACTIVE_TOOL';
  if (actionId.endsWith(':SET_COOLDOWN')) return 'SET_COOLDOWN';
  if (actionId.endsWith(':SET_PROTECTION')) return 'SET_PROTECTION';
  if (actionId.endsWith(':UPDATE_SOIL')) return 'UPDATE_SOIL';
  if (actionId.endsWith(':CARRY_FORWARD')) return 'CARRY_FORWARD';
  if (actionId.endsWith(':USE_TOOL')) return 'USE_TOOL';
  if (actionId.endsWith(':WATER_CELL')) return 'WATER_CELL';
  if (actionId.endsWith(':ZONE_CHANGED')) return 'ZONE_CHANGED';
  return null;
}

function samePosition(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.x === right.x && left.z === right.z;
}

function getInventoryItemCount(inventoryState, itemId) {
  return (inventoryState?.slots ?? []).reduce((total, slot) => (
    slot?.itemId === itemId ? total + Number(slot.count ?? 0) : total
  ), 0);
}

function sameToolIntervention(intervention, currentState) {
  const toolId = intervention?.toolId;
  const cellIndex = Number(intervention?.cellIndex);
  if (!['protect', 'mulch', 'water'].includes(toolId) || !Number.isInteger(cellIndex)) return false;
  const cell = currentState?.season?.grid?.[cellIndex];
  if (!cell) return false;

  if (toolId === 'protect' && Boolean(cell.protected) !== Boolean(intervention.protected)) return false;
  if (toolId === 'mulch') {
    if (Boolean(cell.mulched) !== Boolean(intervention.mulched)) return false;
    if ((cell.carryForwardType ?? null) !== (intervention.carryForwardType ?? null)) return false;
    if (Number(cell.interventionBonus ?? 0) !== Number(intervention.interventionBonus ?? 0)) return false;
  }
  if (toolId === 'water') {
    const wateredAt = Number.isFinite(intervention.wateredAt) ? intervention.wateredAt : null;
    if (Number(cell.interventionBonus ?? 0) !== Number(intervention.interventionBonus ?? 0)) return false;
    if ((cell.lastWateredAt ?? null) !== wateredAt) return false;
  }

  const cooldown = intervention.cooldown ?? {};
  if (typeof cooldown.key === 'string' && Number.isFinite(cooldown.until)) {
    if ((currentState?.season?.toolCooldowns?.[cooldown.key] ?? 0) !== cooldown.until) return false;
  }

  const itemId = typeof intervention.itemId === 'string' ? intervention.itemId : null;
  const remainingCount = Number(intervention.remainingCount);
  if (itemId && Number.isFinite(remainingCount)) {
    return getInventoryItemCount(currentState?.campaign?.inventory, itemId) <= remainingCount;
  }
  return true;
}

function authorityAckToStoreAction(ack, currentState = null) {
  if (!ack?.accepted) return null;
  const data = ack.authoritativePatch?.data;
  if (!data || typeof data !== 'object') return null;
  const actionType = inferAckActionType(ack);

  if (actionType === 'PLANT_CROP') {
    const planting = data.lastPlanting;
    const cellIndex = Number(planting?.cellIndex);
    const cropId = typeof planting?.cropId === 'string' ? planting.cropId : null;
    if (!Number.isInteger(cellIndex) || !cropId) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if (currentCell?.cropId === cropId && (currentCell.damageState ?? null) === null) return null;
    return {
      meta: { authorityAck: true },
      payload: { cellIndex, cropId },
      type: 'PLANT_CROP',
    };
  }

  if (actionType === 'APPLY_TOOL_INTERVENTION') {
    const intervention = data.lastToolIntervention;
    const toolId = typeof intervention?.toolId === 'string' ? intervention.toolId : null;
    const cellIndex = Number(intervention?.cellIndex);
    const itemId = typeof intervention?.itemId === 'string' ? intervention.itemId : null;
    const remainingCount = Number(intervention?.remainingCount);
    if (!['protect', 'mulch', 'water'].includes(toolId) || !Number.isInteger(cellIndex)) return null;
    if (sameToolIntervention(intervention, currentState)) return null;
    const currentCount = itemId ? getInventoryItemCount(currentState?.campaign?.inventory, itemId) : 0;
    const itemCount = itemId && Number.isFinite(remainingCount)
      ? Math.max(0, currentCount - remainingCount)
      : Number(intervention?.itemCount ?? 0);
    return {
      meta: { authorityAck: true },
      payload: {
        appliedAt: Number.isFinite(intervention?.appliedAt) ? intervention.appliedAt : undefined,
        bonus: Number.isFinite(intervention?.bonus) ? intervention.bonus : undefined,
        carryForwardType: intervention?.carryForwardType ?? undefined,
        cellIndex,
        cooldown: intervention?.cooldown ?? undefined,
        cooldownUntil: intervention?.cooldown?.until,
        interventionBonus: Number.isFinite(intervention?.interventionBonus) ? intervention.interventionBonus : undefined,
        itemCount,
        itemId,
        mulched: typeof intervention?.mulched === 'boolean' ? intervention.mulched : undefined,
        protected: typeof intervention?.protected === 'boolean' ? intervention.protected : undefined,
        toolId,
        wateredAt: Number.isFinite(intervention?.wateredAt) ? intervention.wateredAt : undefined,
      },
      type: 'APPLY_TOOL_INTERVENTION',
    };
  }

  if (actionType === 'REMOVE_CROP') {
    const removal = data.lastRemoval;
    const cellIndex = Number(removal?.cellIndex);
    const cropId = typeof removal?.cropId === 'string' ? removal.cropId : null;
    const removedAt = Number.isFinite(removal?.removedAt) ? removal.removedAt : null;
    if (!Number.isInteger(cellIndex) || !cropId) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if (!currentCell?.cropId) return null;
    if (currentCell.cropId !== cropId) return null;
    return {
      meta: { authorityAck: true },
      payload: { cellIndex, cropId, removedAt },
      type: 'REMOVE_CROP',
    };
  }

  if (actionType === 'SET_PROTECTION') {
    const protection = data.lastProtection;
    const cellIndex = Number(protection?.cellIndex);
    if (!Number.isInteger(cellIndex) || typeof protection?.protected !== 'boolean') return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if (!currentCell) return null;
    if (Boolean(currentCell.protected) === protection.protected) return null;
    return {
      meta: { authorityAck: true },
      payload: { cellIndex, protected: protection.protected },
      type: 'SET_PROTECTION',
    };
  }

  if (actionType === 'SET_DAMAGE') {
    const damage = data.lastDamage;
    const cellIndex = Number(damage?.cellIndex);
    const damageState = typeof damage?.damageState === 'string' ? damage.damageState : null;
    if (!Number.isInteger(cellIndex)) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if ((currentCell?.damageState ?? null) === damageState) return null;
    return {
      meta: { authorityAck: true },
      payload: { cellIndex, damageState },
      type: 'SET_DAMAGE',
    };
  }

  if (actionType === 'UPDATE_SOIL') {
    const soil = data.lastSoil;
    const cellIndex = Number(soil?.cellIndex);
    const soilFatigue = Number(soil?.soilFatigue);
    if (!Number.isInteger(cellIndex) || !Number.isFinite(soilFatigue)) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if ((currentCell?.soilFatigue ?? 0) === soilFatigue) return null;
    return {
      meta: { authorityAck: true },
      payload: { cellIndex, soilFatigue },
      type: 'UPDATE_SOIL',
    };
  }

  if (actionType === 'CARRY_FORWARD') {
    const carryForward = data.lastCarryForward;
    const cellIndex = Number(carryForward?.cellIndex);
    const carryForwardType = typeof carryForward?.carryForwardType === 'string' ? carryForward.carryForwardType : null;
    const hasMulched = hasOwn(carryForward ?? {}, 'mulched');
    const mulched = Boolean(carryForward?.mulched);
    if (!Number.isInteger(cellIndex)) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    const sameCarryForward = (currentCell?.carryForwardType ?? null) === carryForwardType;
    const sameMulched = !hasMulched || Boolean(currentCell?.mulched) === mulched;
    if (sameCarryForward && sameMulched) return null;
    return {
      meta: { authorityAck: true },
      payload: {
        carryForwardType,
        cellIndex,
        ...(hasMulched ? { mulched } : {}),
      },
      type: 'CARRY_FORWARD',
    };
  }

  if (actionType === 'WATER_CELL') {
    const watering = data.lastWatering;
    const cellIndex = Number(watering?.cellIndex);
    const interventionBonus = Number(watering?.interventionBonus);
    const wateredAt = Number.isFinite(watering?.wateredAt) ? watering.wateredAt : null;
    if (!Number.isInteger(cellIndex) || !Number.isFinite(interventionBonus)) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    const currentBonus = currentCell?.interventionBonus ?? 0;
    if (currentBonus === interventionBonus && (currentCell?.lastWateredAt ?? null) === wateredAt) return null;
    return {
      meta: { authorityAck: true },
      payload: {
        bonus: Math.max(0, interventionBonus - currentBonus),
        cellIndex,
        wateredAt,
      },
      type: 'WATER_CELL',
    };
  }

  if (actionType === 'HARVEST_CELL') {
    const harvesting = data.lastHarvesting;
    const cellIndex = Number(harvesting?.cellIndex);
    const cropId = typeof harvesting?.cropId === 'string' ? harvesting.cropId : null;
    const harvestedAt = Number.isFinite(harvesting?.harvestedAt) ? harvesting.harvestedAt : null;
    const yieldCount = Number.isFinite(harvesting?.yieldCount) ? harvesting.yieldCount : 1;
    if (!Number.isInteger(cellIndex) || !cropId || yieldCount !== 1) return null;
    const currentCell = currentState?.season?.grid?.[cellIndex];
    if (!currentCell?.cropId) return null;
    if (currentCell.cropId !== cropId) return null;
    return {
      meta: { authorityAck: true },
      payload: {
        cellIndex,
        cropId,
        harvestedAt,
        yieldCount,
      },
      type: 'HARVEST_CELL',
    };
  }

  if (actionType === 'SET_SELECTED_CROP' && hasOwn(data, 'selectedCropId')) {
    return {
      meta: { authorityAck: true },
      payload: { cropId: typeof data.selectedCropId === 'string' ? data.selectedCropId : null },
      type: 'SET_SELECTED_CROP',
    };
  }

  if (actionType === 'SET_ACTIVE_TOOL' && hasOwn(data, 'activeTool')) {
    return {
      meta: { authorityAck: true },
      payload: { toolId: typeof data.activeTool === 'string' ? data.activeTool : null },
      type: 'SET_ACTIVE_TOOL',
    };
  }

  if (actionType === 'SET_COOLDOWN') {
    const cooldown = data.lastCooldown;
    const key = typeof cooldown?.key === 'string' && cooldown.key ? cooldown.key : null;
    const until = Number(cooldown?.until);
    if (!key || !Number.isFinite(until)) return null;
    if ((currentState?.season?.toolCooldowns?.[key] ?? 0) === until) return null;
    const payload = { key, until };
    if (Number.isInteger(cooldown.cellIndex)) payload.cellIndex = cooldown.cellIndex;
    if (typeof cooldown.toolId === 'string') payload.toolId = cooldown.toolId;
    return {
      meta: { authorityAck: true },
      payload,
      type: 'SET_COOLDOWN',
    };
  }

  if (actionType === 'REMOVE_ITEM') {
    const itemRemoval = data.lastItemRemoval;
    const itemId = typeof itemRemoval?.itemId === 'string' ? itemRemoval.itemId : null;
    const remainingCount = Number(itemRemoval?.remainingCount);
    if (!itemId || !Number.isFinite(remainingCount)) return null;
    const currentCount = getInventoryItemCount(currentState?.campaign?.inventory, itemId);
    if (currentCount <= remainingCount) return null;
    return {
      meta: { authorityAck: true },
      payload: { count: currentCount - remainingCount, itemId },
      type: 'REMOVE_ITEM',
    };
  }

  if (actionType === 'USE_TOOL') {
    const toolUse = data.lastToolUse;
    const slotIndex = Number(toolUse?.slotIndex);
    const durability = Number(toolUse?.durability);
    const itemId = typeof toolUse?.itemId === 'string' ? toolUse.itemId : null;
    if (!Number.isInteger(slotIndex) || !Number.isFinite(durability)) return null;
    const currentSlot = currentState?.campaign?.inventory?.slots?.[slotIndex];
    if (!currentSlot || (itemId && currentSlot.itemId !== itemId)) return null;
    const currentDurability = Number(currentSlot.durability ?? 0);
    if (!Number.isFinite(currentDurability) || currentDurability <= durability) return null;
    return {
      meta: { authorityAck: true },
      payload: {
        durabilityCost: currentDurability - durability,
        itemId,
        slotIndex,
      },
      type: 'USE_TOOL',
    };
  }

  if (actionType === 'ZONE_CHANGED' && typeof data.currentZone === 'string' && data.currentZone) {
    const spawnPoint = clonePosition(data.lastSpawnPoint);
    const worldState = currentState?.campaign?.worldState ?? {};
    const alreadyApplied = (
      worldState.currentZone === data.currentZone
      && samePosition(clonePosition(worldState.lastSpawnPoint), spawnPoint)
      && (Array.isArray(data.visitedZones)
        ? data.visitedZones.every((zoneId) => worldState.visitedZones?.includes(zoneId))
        : true)
    );
    if (alreadyApplied) return null;
    return {
      meta: { authorityAck: true },
      payload: { spawnPoint, toZone: data.currentZone },
      type: 'ZONE_CHANGED',
    };
  }

  if (!actionType && hasOwn(data, 'selectedCropId') && !hasOwn(data, 'activeTool')) {
    return {
      meta: { authorityAck: true },
      payload: { cropId: typeof data.selectedCropId === 'string' ? data.selectedCropId : null },
      type: 'SET_SELECTED_CROP',
    };
  }

  if (!actionType && hasOwn(data, 'activeTool') && !hasOwn(data, 'selectedCropId')) {
    return {
      meta: { authorityAck: true },
      payload: { toolId: typeof data.activeTool === 'string' ? data.activeTool : null },
      type: 'SET_ACTIVE_TOOL',
    };
  }

  return null;
}

class IndexedDbAuthorityJournal {
  constructor({ databaseName = DB_NAME, indexedDB = globalThis.indexedDB } = {}) {
    this.databaseName = databaseName;
    this.indexedDB = getGlobalIndexedDB(indexedDB);
    this.openPromise = null;
  }

  get available() {
    return Boolean(this.indexedDB);
  }

  async open() {
    if (!this.indexedDB) {
      throw new Error('IndexedDB is unavailable');
    }
    if (!this.openPromise) {
      this.openPromise = new Promise((resolve, reject) => {
        const request = this.indexedDB.open(this.databaseName, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const storeName of Object.values(STORES)) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'key' });
            }
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    }
    return this.openPromise;
  }

  async close() {
    if (!this.openPromise) return;
    const db = await this.openPromise;
    db.close?.();
    this.openPromise = null;
  }

  async putSnapshot({ ledgerCursor = '0', savedAt = isoNow(), sessionId, slot, state }) {
    if (!sessionId || !state) return null;
    const db = await this.open();
    const record = {
      key: sessionId,
      ledgerCursor,
      savedAt,
      sessionId,
      slot,
      state: cloneValue(state),
    };
    await requestResult(transactionStore(db, STORES.SNAPSHOTS, 'readwrite').put(record));
    return cloneValue(record);
  }

  async readSnapshot(sessionId) {
    if (!sessionId) return null;
    const db = await this.open();
    const store = transactionStore(db, STORES.SNAPSHOTS, 'readwrite');
    const record = await requestResult(store.get(sessionId));
    if (!record) return null;
    if (!isValidSnapshot(record, sessionId)) {
      await requestResult(store.delete(sessionId));
      return null;
    }
    return cloneValue(record);
  }

  async enqueueAction(envelope, { queuedAt = isoNow() } = {}) {
    if (!envelope?.sessionId || !envelope?.id) return null;
    const db = await this.open();
    const store = transactionStore(db, STORES.OUTBOUND, 'readwrite');
    const key = storeKey(envelope.sessionId, envelope.idempotencyKey ?? envelope.id);
    const existing = await requestResult(store.get(key));
    if (existing?.status === 'acked') return cloneValue(existing);
    const record = {
      ...(existing ?? {}),
      actionId: envelope.id,
      attempts: existing?.attempts ?? 0,
      envelope: cloneValue(envelope),
      idempotencyKey: envelope.idempotencyKey ?? envelope.id,
      key,
      queuedAt: existing?.queuedAt ?? queuedAt,
      sessionId: envelope.sessionId,
      status: 'pending',
    };
    await requestResult(store.put(record));
    return cloneValue(record);
  }

  async listPendingActions(sessionId) {
    const db = await this.open();
    const records = await requestResult(transactionStore(db, STORES.OUTBOUND).getAll());
    return records
      .filter((record) => record.sessionId === sessionId && record.status === 'pending')
      .sort((left, right) => (
        (left.envelope?.clientSeq ?? 0) - (right.envelope?.clientSeq ?? 0)
        || String(left.queuedAt).localeCompare(String(right.queuedAt))
      ))
      .map((record) => cloneValue(record));
  }

  async markActionAcked(record, ack, { ackedAt = isoNow() } = {}) {
    const db = await this.open();
    const outbound = {
      ...record,
      ackedAt,
      attempts: (record.attempts ?? 0) + 1,
      status: 'acked',
    };
    const ackRecord = {
      ack: cloneValue(ack),
      ackedAt,
      actionId: ack.actionId,
      key: storeKey(ack.sessionId, ack.actionId),
      sessionId: ack.sessionId,
    };
    await requestResult(transactionStore(db, STORES.OUTBOUND, 'readwrite').put(outbound));
    await requestResult(transactionStore(db, STORES.ACKS, 'readwrite').put(ackRecord));
    return cloneValue(ackRecord);
  }

  async recordAttempt(record, { attemptedAt = isoNow() } = {}) {
    const db = await this.open();
    const updated = {
      ...record,
      attempts: (record.attempts ?? 0) + 1,
      lastAttemptAt: attemptedAt,
    };
    await requestResult(transactionStore(db, STORES.OUTBOUND, 'readwrite').put(updated));
    return cloneValue(updated);
  }

  async listAcks(sessionId) {
    const db = await this.open();
    const records = await requestResult(transactionStore(db, STORES.ACKS).getAll());
    return records
      .filter((record) => record.sessionId === sessionId)
      .sort((left, right) => String(left.ackedAt).localeCompare(String(right.ackedAt)))
      .map((record) => cloneValue(record));
  }
}

async function drainAuthorityQueue({
  authorityUrl,
  fetchFn = globalThis.fetch,
  journal,
  maxActions = MAX_DRAIN_ACTIONS,
  now = Date.now,
  onAck,
  sessionId,
  verifyAck,
} = {}) {
  const url = resolveAuthorityUrl({ authorityUrl });
  if (!url || typeof fetchFn !== 'function' || !journal || !sessionId) {
    return { sent: 0, acked: 0, pending: 0, online: false };
  }

  const pending = (await journal.listPendingActions(sessionId)).slice(0, maxActions);
  let sent = 0;
  let acked = 0;

  for (const record of pending) {
    sent += 1;
    let response;
    try {
      response = await fetchFn(`${url}/action`, {
        body: JSON.stringify(record.envelope),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    } catch {
      return { sent: sent - 1, acked, pending: pending.length - acked, online: false };
    }

    const body = await response.json().catch(() => null);
    if (!body?.ack || body.ack.actionId !== record.actionId) {
      await journal.recordAttempt(record, { attemptedAt: isoNow(now) });
      return { sent, acked, pending: pending.length - acked, online: response.ok };
    }

    const verified = await verifyAuthorityAck(body.ack, { authorityUrl: url, fetchFn, verifyAck });
    if (!verified) {
      await journal.recordAttempt(record, { attemptedAt: isoNow(now) });
      return {
        acked,
        online: response.ok,
        pending: pending.length - acked,
        sent,
        verificationFailed: true,
      };
    }

    await journal.markActionAcked(record, body.ack, { ackedAt: isoNow(now) });
    if (onAck) await onAck(body.ack, record);
    acked += 1;
  }

  return { sent, acked, pending: Math.max(0, pending.length - acked), online: true };
}

async function verifyAuthorityAck(ack, {
  authorityUrl,
  fetchFn = globalThis.fetch,
  verifyAck,
} = {}) {
  if (!ack?.signature?.startsWith('hmac-sha256:')) return false;
  if (verifyAck) return Boolean(await verifyAck(ack));

  const url = resolveAuthorityUrl({ authorityUrl });
  if (!url || typeof fetchFn !== 'function') return false;

  const response = await fetchFn(`${url}/ack/verify`, {
    body: JSON.stringify({ ack }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) return false;

  const body = await response.json().catch(() => null);
  return body?.verified === true;
}

async function createAuthoritySession({
  authorityUrl,
  fetchFn = globalThis.fetch,
  sessionId,
} = {}) {
  const url = resolveAuthorityUrl({ authorityUrl });
  if (!url || typeof fetchFn !== 'function' || !sessionId) return null;

  const response = await fetchFn(`${url}/session`, {
    body: JSON.stringify({ sessionId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true || body?.session?.sessionId !== sessionId) {
    throw new Error(body?.error ?? body?.rejection?.message ?? 'Authority session creation failed.');
  }
  return body.session;
}

function createStoryAuthorityPersistence(store, {
  authorityUrl,
  fetchFn = globalThis.fetch,
  indexedDB = globalThis.indexedDB,
  now = Date.now,
  slot = 0,
  storage = globalThis.localStorage,
  verifyAck,
} = {}) {
  const journal = new IndexedDbAuthorityJournal({ indexedDB });
  if (!store?.subscribe || slot < 0 || !journal.available) {
    return {
      available: false,
      cleanup() {},
      drain: async () => ({ sent: 0, acked: 0, pending: 0, online: false }),
      flush: async () => null,
      journal: null,
      saveSnapshot: async () => null,
      sessionId: null,
    };
  }

  let active = true;
  let clientSeq = 0;
  let chain = Promise.resolve();
  const sessionId = ensureSessionPointer(slot, storage);
  const resolvedAuthorityUrl = resolveAuthorityUrl({ authorityUrl, storage });
  let sessionPromise = null;

  async function reconcileAck(ack) {
    const action = authorityAckToStoreAction(ack, store.getState?.());
    if (action) store.dispatch(action);
  }

  async function ensureServerSession() {
    if (!resolvedAuthorityUrl) return null;
    if (!sessionPromise) {
      sessionPromise = createAuthoritySession({
        authorityUrl: resolvedAuthorityUrl,
        fetchFn,
        sessionId,
      }).catch((error) => {
        sessionPromise = null;
        throw error;
      });
    }
    return sessionPromise;
  }

  function enqueue(work, { force = false } = {}) {
    chain = chain
      .then(() => (active || force ? work() : null))
      .catch((error) => {
        console.warn('[GOS] Authority cache unavailable:', error?.message ?? error);
      });
    return chain;
  }

  function persistState(state, action = null, { force = false } = {}) {
    return enqueue(async () => {
      await journal.putSnapshot({
        ledgerCursor: String(state?.authorityTick ?? 0),
        savedAt: isoNow(now),
        sessionId,
        slot,
        state,
      });

      if (isAuthorityRoutedAction(action) && action?.meta?.authorityAck !== true) {
        clientSeq += 1;
        const envelope = buildAuthorityEnvelope(action, state, { clientSeq, now, sessionId });
        await journal.enqueueAction(envelope, { queuedAt: isoNow(now) });
        if (resolvedAuthorityUrl) {
          await ensureServerSession();
          await drainAuthorityQueue({
            authorityUrl: resolvedAuthorityUrl,
            fetchFn,
            journal,
            now,
            onAck: reconcileAck,
            sessionId,
            verifyAck,
          });
        }
      }
    }, { force });
  }

  void persistState(store.getState());
  const unsubscribe = store.subscribe((state, action) => {
    if (action?.meta?.persist === false) return;
    void persistState(state, action);
  });

  return {
    available: true,
    cleanup() {
      active = false;
      unsubscribe();
      void chain.finally(() => journal.close());
    },
    drain() {
      return enqueue(async () => {
        await ensureServerSession();
        return drainAuthorityQueue({
          authorityUrl: resolvedAuthorityUrl,
          fetchFn,
          journal,
          now,
          onAck: reconcileAck,
          sessionId,
          verifyAck,
        });
      });
    },
    flush() {
      return chain;
    },
    journal,
    saveSnapshot(state = store.getState()) {
      return persistState(state, null, { force: true });
    },
    sessionId,
  };
}

export {
  AUTHORITY_URL_KEY,
  DB_NAME,
  IndexedDbAuthorityJournal,
  authorityAckToStoreAction,
  buildAuthorityEnvelope,
  createAuthoritySession,
  createStoryAuthorityPersistence,
  drainAuthorityQueue,
  ensureSessionPointer,
  isAuthorityRoutedAction,
  resolveAuthorityUrl,
  sessionPointerKey,
  verifyAuthorityAck,
};
