const ENGINE_VERSION = 1;
const DEFAULT_MAX_PAYLOAD_BYTES = 64_000;
const DEFAULT_PREDICTION_WINDOW = 2;
const BLOCKED_PAYLOAD_KEYS = new Set([
  'entityTotals',
  'entities',
  'fullState',
  'gameState',
  'players',
  'resourceTotals',
  'resources',
  'state',
]);

function cloneValue(value) {
  if (value == null) return value;
  return structuredClone(value);
}

function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function byteLength(value) {
  return new TextEncoder().encode(stableStringify(value)).length;
}

function deriveRngState(seed) {
  let state = Number.parseInt(hashString(String(seed)), 16) >>> 0;
  state = (state + 0x9e3779b9) >>> 0;
  let mixed = state;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85ebca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2b2ae35);
  mixed ^= mixed >>> 16;
  return (mixed >>> 0).toString(16).padStart(8, '0');
}

function coreStateForChecksum(state) {
  return {
    data: state.data ?? {},
    gameId: state.gameId,
    players: state.players ?? {},
    rngState: state.rngState,
    seed: state.seed,
    sessionId: state.sessionId,
    tick: state.tick,
    version: state.version,
  };
}

function checksumState(state) {
  return hashString(stableStringify(coreStateForChecksum(state)));
}

function signAck(ack) {
  return `local-${hashString(stableStringify({
    accepted: ack.accepted,
    actionId: ack.actionId,
    checksum: ack.checksum,
    rejection: ack.rejection ?? null,
    sessionId: ack.sessionId,
    tick: ack.tick,
  }))}`;
}

function createEngineState({
  data = {},
  gameId = 'garden',
  players = { local: {} },
  seed = 'garden-os',
  sessionId = 'local-session',
  now = new Date().toISOString(),
} = {}) {
  const state = {
    data: cloneValue(data),
    gameId,
    ledger: { acks: {}, cursor: '0', entries: [] },
    players: cloneValue(players),
    rngState: deriveRngState(seed),
    seed,
    sessionId,
    tick: 0,
    updatedAt: now,
    version: ENGINE_VERSION,
  };
  return { ...state, checksum: checksumState(state) };
}

function createActionEnvelope({
  clientSentAt = new Date().toISOString(),
  clientSeq = 0,
  expectedTick,
  gameId = 'garden',
  id,
  idempotencyKey,
  payload = {},
  playerId = 'local',
  sessionId = 'local-session',
  type,
} = {}) {
  const actionId = id ?? `${playerId}:${clientSeq}:${type ?? 'UNKNOWN'}`;
  return {
    clientSentAt,
    clientSeq,
    expectedTick,
    gameId,
    id: actionId,
    idempotencyKey: idempotencyKey ?? actionId,
    payload: cloneValue(payload),
    playerId,
    sessionId,
    type,
  };
}

function validateActionEnvelope(envelope, state, {
  maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES,
  predictionWindow = DEFAULT_PREDICTION_WINDOW,
} = {}) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object') {
    return [{ code: 'BAD_ACTION', message: 'Action envelope is required.' }];
  }
  if (envelope.sessionId !== state.sessionId) errors.push({ code: 'SESSION_MISMATCH', message: 'Session does not match.' });
  if (envelope.gameId !== state.gameId) errors.push({ code: 'GAME_MISMATCH', message: 'Game does not match.' });
  if (!envelope.id || typeof envelope.id !== 'string') errors.push({ code: 'BAD_ACTION_ID', message: 'Action id is required.' });
  if (!envelope.idempotencyKey || typeof envelope.idempotencyKey !== 'string') errors.push({ code: 'BAD_IDEMPOTENCY_KEY', message: 'Idempotency key is required.' });
  if (!envelope.playerId || typeof envelope.playerId !== 'string') errors.push({ code: 'BAD_PLAYER_ID', message: 'Player id is required.' });
  if (!envelope.type || typeof envelope.type !== 'string') errors.push({ code: 'BAD_ACTION_TYPE', message: 'Action type is required.' });
  if (!Number.isInteger(envelope.clientSeq) || envelope.clientSeq < 0) errors.push({ code: 'BAD_CLIENT_SEQ', message: 'Client sequence must be a non-negative integer.' });
  if (byteLength(envelope.payload ?? {}) > maxPayloadBytes) errors.push({ code: 'PAYLOAD_TOO_LARGE', message: 'Action payload is too large.' });
  if (Object.keys(envelope.payload ?? {}).some((key) => BLOCKED_PAYLOAD_KEYS.has(key))) {
    errors.push({ code: 'TRUSTED_STATE_PAYLOAD', message: 'Action payload cannot include trusted state fields.' });
  }
  if (
    envelope.expectedTick != null
    && (!Number.isInteger(envelope.expectedTick) || Math.abs(envelope.expectedTick - state.tick) > predictionWindow)
  ) {
    errors.push({ code: 'TICK_OUT_OF_WINDOW', message: 'Expected tick is outside the prediction window.' });
  }
  return errors;
}

function buildAck(state, envelope, accepted, {
  patch = null,
  rejection = null,
  serverTime = new Date().toISOString(),
} = {}) {
  const ack = {
    accepted,
    actionId: envelope.id,
    actionType: envelope.type,
    authoritativePatch: patch ?? undefined,
    checksum: state.checksum,
    rejection: rejection ?? undefined,
    serverTime,
    sessionId: state.sessionId,
    stateVersion: state.version,
    tick: state.tick,
  };
  return { ...ack, signature: signAck(ack) };
}

function resolveReducer(reducer, type) {
  if (typeof reducer === 'function') return reducer;
  if (reducer && typeof reducer[type] === 'function') return reducer[type];
  return (data) => data;
}

function applyAuthoritativeAction(state, envelope, reducer, {
  maxLedgerEntries = 80,
  now = new Date().toISOString(),
} = {}) {
  const currentState = {
    ...state,
    checksum: state.checksum ?? checksumState(state),
    ledger: state.ledger ?? { acks: {}, cursor: '0', entries: [] },
  };
  const duplicateAck = currentState.ledger.acks?.[envelope?.idempotencyKey];
  if (duplicateAck) return { ack: duplicateAck, duplicate: true, state: currentState };

  const errors = validateActionEnvelope(envelope, currentState);
  if (errors.length) {
    const ack = buildAck(currentState, envelope ?? { id: 'unknown' }, false, {
      rejection: errors[0],
      serverTime: now,
    });
    return { ack, duplicate: false, state: currentState };
  }

  const previousChecksum = currentState.checksum;
  const reduce = resolveReducer(reducer, envelope.type);
  const nextData = reduce(cloneValue(currentState.data), cloneValue(envelope.payload), envelope);
  const nextStateBase = {
    ...currentState,
    data: nextData,
    tick: currentState.tick + 1,
    updatedAt: now,
  };
  const nextChecksum = checksumState(nextStateBase);
  const entry = {
    accepted: true,
    actionHash: hashString(stableStringify(envelope)),
    actionId: envelope.id,
    nextChecksum,
    previousChecksum,
    reducerVersion: ENGINE_VERSION,
    serverTime: now,
    tick: nextStateBase.tick,
  };
  const nextState = {
    ...nextStateBase,
    checksum: nextChecksum,
    ledger: {
      acks: { ...(currentState.ledger.acks ?? {}) },
      cursor: String(nextStateBase.tick),
      entries: [...(currentState.ledger.entries ?? []), entry].slice(-maxLedgerEntries),
    },
  };
  const ack = buildAck(nextState, envelope, true, {
    patch: { data: nextData },
    serverTime: now,
  });
  nextState.ledger.acks[envelope.idempotencyKey] = ack;
  return { ack, duplicate: false, state: nextState };
}

function replayActionLedger(initialState, envelopes, reducer, options = {}) {
  return envelopes.reduce(
    (result, envelope) => applyAuthoritativeAction(result.state, envelope, reducer, options),
    { ack: null, duplicate: false, state: initialState },
  );
}

export {
  applyAuthoritativeAction,
  checksumState,
  createActionEnvelope,
  createEngineState,
  replayActionLedger,
  stableStringify,
  validateActionEnvelope,
};
