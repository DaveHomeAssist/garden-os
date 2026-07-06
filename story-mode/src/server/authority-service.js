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
const BLOCKED_SESSION_KEYS = new Set(['data', 'entityTotals', 'entities', 'fullState', 'gameState', 'players', 'resourceTotals', 'resources', 'state']);
const ACTIONS = {
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
  SET_SELECTED_CROP: 'SET_SELECTED_CROP',
};
const ROUTED_ACTION_TYPES = new Set([ACTIONS.SET_SELECTED_CROP, ACTIONS.SET_ACTIVE_TOOL]);

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
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

function createMemoryLedgerStore() {
  const entries = [];
  return {
    async append(entry) {
      entries.push(cloneValue(entry));
    },
    entries,
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

function reduceStoryAction(data, payload, envelope) {
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
  return data;
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
} = {}) {
  const sessions = new Map();
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
      data: { activeTool: 'hand', selectedCropId: null },
      gameId: body.gameId ?? DEFAULT_GAME_ID,
      seed: body.seed ?? `garden-os:${sessionId}`,
      sessionId,
      now: serverTime,
    });
    sessions.set(sessionId, state);
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

  function getSessionState(envelope) {
    if (!envelope?.sessionId) return null;
    let state = sessions.get(envelope.sessionId);
    if (!state) {
      state = createEngineState({
        data: { activeTool: 'hand', selectedCropId: null },
        gameId: envelope.gameId ?? DEFAULT_GAME_ID,
        seed: `garden-os:${envelope.sessionId}`,
        sessionId: envelope.sessionId,
        now: isoNow(now),
      });
      sessions.set(envelope.sessionId, state);
    }
    return state;
  }

  async function applyAction(envelope = {}) {
    const previousState = getSessionState(envelope);
    if (!previousState) {
      const ack = createRejectedAck({
        actionId: envelope?.id,
        code: 'BAD_SESSION',
        message: 'Session id is required.',
        serverTime: isoNow(now),
        sessionId: envelope?.sessionId,
      }, hmacSecret);
      return { ack, ok: false, session: null };
    }

    const serverTime = isoNow(now);
    if (!ROUTED_ACTION_TYPES.has(envelope?.type)) {
      const ack = createRejectedAck({
        actionId: envelope?.id,
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

    const result = applyAuthoritativeAction(previousState, envelope, reduceStoryAction, { now: serverTime });
    const signedAck = signAck(result.ack, hmacSecret);
    const nextState = {
      ...result.state,
      ledger: {
        ...(result.state.ledger ?? { acks: {}, cursor: '0', entries: [] }),
        acks: { ...(result.state.ledger?.acks ?? {}) },
      },
    };
    const ackKey = envelope?.idempotencyKey ?? envelope?.id;
    if (ackKey && signedAck.accepted) {
      nextState.ledger.acks[ackKey] = signedAck;
    }
    sessions.set(nextState.sessionId, nextState);
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
    sessions,
    verifyAck,
  };
}

export {
  ACK_SIGNATURE_PREFIX,
  createAuthorityService,
  createFileLedgerStore,
  createMemoryLedgerStore,
  signAuthorityAck,
  verifyAuthorityAckSignature,
};
