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

const AUTHORITY_REDUCERS = {
  NOOP: (data) => data,
  SET_ACTIVE_TOOL: (data, payload) => ({
    ...data,
    activeTool: typeof payload.toolId === 'string' ? payload.toolId : null,
  }),
  SET_SELECTED_CROP: (data, payload) => ({
    ...data,
    selectedCropId: typeof payload.cropId === 'string' ? payload.cropId : null,
  }),
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

async function signedRejection(env, state, envelope, code, message, status = 422) {
  const ack = await signServerAck({
    accepted: false,
    actionId: envelope?.id ?? 'unknown',
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
      data: { activeTool: null, selectedCropId: null },
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
  if (!AUTHORITY_REDUCERS[envelope.type]) {
    return signedRejection(env, state, envelope, 'ACTION_NOT_ALLOWED', 'Action type is not allowed');
  }

  const result = applyAuthoritativeAction(state, envelope, AUTHORITY_REDUCERS);
  const signedAck = await signServerAck(result.ack, getSecret(env));
  if (result.ack.accepted && !result.duplicate) await saveSession(env, result.state);
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
