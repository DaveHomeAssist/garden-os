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
const DEFAULT_AUTHORITY_CELL = {
  cropId: null,
  damageState: null,
  interventionBonus: 0,
  lastWateredAt: null,
};
const BLOCKED_SESSION_KEYS = new Set(['data', 'entityTotals', 'entities', 'fullState', 'gameState', 'players', 'resourceTotals', 'resources', 'state']);
const BLOCKED_HARVEST_PAYLOAD_KEYS = new Set(['currency', 'harvestResult', 'inventory', 'pantry', 'recipesCompleted', 'yield', 'yieldCount']);
const ACTIONS = {
  HARVEST_CELL: 'HARVEST_CELL',
  PLANT_CROP: 'PLANT_CROP',
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
  SET_COOLDOWN: 'SET_COOLDOWN',
  SET_SELECTED_CROP: 'SET_SELECTED_CROP',
  WATER_CELL: 'WATER_CELL',
  ZONE_CHANGED: 'ZONE_CHANGED',
};
const ROUTED_ACTION_TYPES = new Set([
  ACTIONS.HARVEST_CELL,
  ACTIONS.PLANT_CROP,
  ACTIONS.SET_SELECTED_CROP,
  ACTIONS.SET_ACTIVE_TOOL,
  ACTIONS.SET_COOLDOWN,
  ACTIONS.WATER_CELL,
  ACTIONS.ZONE_CHANGED,
]);
const COOLDOWN_KEY_RE = /^[A-Za-z0-9_-]+_[0-9]+$/;

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

function createAuthorityCell(cell = {}) {
  return {
    ...DEFAULT_AUTHORITY_CELL,
    cropId: typeof cell.cropId === 'string' ? cell.cropId : null,
    damageState: cell.damageState ?? null,
    interventionBonus: Number.isFinite(cell.interventionBonus) ? Math.min(1, Math.max(0, cell.interventionBonus)) : 0,
    lastWateredAt: Number.isFinite(cell.lastWateredAt) ? cell.lastWateredAt : null,
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
  lastCooldown = null,
  lastHarvesting = null,
  lastPlanting = null,
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
    lastCooldown,
    lastHarvesting,
    lastPlanting,
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
  if (envelope?.type === ACTIONS.PLANT_CROP) {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= grid.length) {
      return { code: 'BAD_CELL_INDEX', message: 'Plant action requires a valid starter-grid cell index.' };
    }
    if (typeof envelope.payload?.cropId !== 'string' || !envelope.payload.cropId.trim()) {
      return { code: 'BAD_CROP_ID', message: 'Plant action requires a crop id.' };
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
