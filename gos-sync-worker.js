// Garden OS — cross-device sync worker.
// Deploy: wrangler deploy
// Or paste into Cloudflare dashboard → Workers → Quick edit
// KV namespace: create one named GOS_SYNC and paste its ID in wrangler.toml.
//
// Routes:
//   GET    /beds/:code          → read bed
//   PUT    /beds/:code          → write bed (validates secret)
//   POST   /beds                → create new code + secret + write
//   DELETE /beds/:code          → delete bed (validates secret)
//
// Storage shape:
//   KV "bed:<code>"    = { data: <bed JSON>, updatedAt: <ISO> }   (rolling
//                        90-day TTL; refreshed on every GET, PUT, or POST)
//   KV "secret:<code>" = "<32 hex chars>"                          (60s TTL)
//
// CORS: every response sets Access-Control-Allow-Origin: * so a static page
// served from any domain (or file://) can call it. No cookies, no auth
// headers — secrets travel in the JSON body.

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const SECRET_TTL_SECONDS = 60; // Pairing secrets should only live long enough for handoff.
const MAX_DATA_BYTES = 64 * 1024;
const CREATE_RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;
const CODE_RETRY_LIMIT = 5;

// 4 alpha + dash + 4 alphanumeric, e.g. ROSE-K7X2.
function generateCode() {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < 4; i++) out += ALPHA[buf[i] % ALPHA.length];
  out += '-';
  for (let i = 4; i < 8; i++) out += ALNUM[buf[i] % ALNUM.length];
  return out;
}

function generateSecret() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonByteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function validateDataSize(data) {
  const size = jsonByteLength(data);
  if (size > MAX_DATA_BYTES) {
    return {
      ok: false,
      response: jsonResponse({
        ok: false,
        error: 'payload_too_large',
        limit: MAX_DATA_BYTES,
        actual: size,
      }, 413),
    };
  }
  return { ok: true, size };
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function maskKey(key) {
  const value = String(key || '');
  if (value.length <= 4) return value ? value[0] + '***' : '***';
  return value.slice(0, 4) + '***';
}

function logCollisionTelemetry(state, key, collisions) {
  const payload = { key: maskKey(key), collisions };
  if (state === 'success') {
    console.warn('collision_retry success', payload);
  } else {
    console.error('collision_retry exhausted', payload);
  }
}

function rateLimitKey(request) {
  const ip = request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown';
  const minute = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));
  return 'rate:create:' + ip + ':' + minute;
}

async function enforceCreateRateLimit(request, env) {
  const key = rateLimitKey(request);
  const current = Number.parseInt(await env.GOS_SYNC.get(key), 10) || 0;
  if (current >= CREATE_RATE_LIMIT) {
    return {
      ok: false,
      response: jsonResponse({
        ok: false,
        error: 'rate_limited',
        retry_after: RATE_WINDOW_SECONDS,
      }, 429),
    };
  }
  await env.GOS_SYNC.put(key, String(current + 1), { expirationTtl: RATE_WINDOW_SECONDS });
  return { ok: true, count: current + 1 };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function handle(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // POST /beds — create
  if (method === 'POST' && url.pathname === '/beds') {
    const rate = await enforceCreateRateLimit(request, env);
    if (!rate.ok) return rate.response;

    let body;
    try { body = await request.json(); }
    catch (_) { return jsonResponse({ ok: false, error: 'bad_json' }, 400); }

    if (!body || typeof body !== 'object' || !body.data) {
      return jsonResponse({ ok: false, error: 'missing_data' }, 400);
    }

    const dataSize = validateDataSize(body.data);
    if (!dataSize.ok) return dataSize.response;

    // Try a few times in case of (extremely unlikely) collision.
    let code = null;
    let collisionCount = 0;
    for (let i = 0; i < CODE_RETRY_LIMIT; i++) {
      const candidate = generateCode();
      const existing = await env.GOS_SYNC.get('bed:' + candidate);
      if (!existing) { code = candidate; break; }
      collisionCount++;
    }
    if (!code) {
      logCollisionTelemetry('exhausted', 'bed:code', collisionCount);
      return jsonResponse({ ok: false, error: 'code_collision' }, 503);
    }
    if (collisionCount > 0) {
      logCollisionTelemetry('success', 'bed:' + code, collisionCount);
    }

    const secret = generateSecret();
    const record = { data: body.data, updatedAt: new Date().toISOString() };
    await env.GOS_SYNC.put('bed:' + code, JSON.stringify(record),
      { expirationTtl: TTL_SECONDS });
    await env.GOS_SYNC.put('secret:' + code, secret, { expirationTtl: SECRET_TTL_SECONDS });

    return jsonResponse({
      ok: true,
      code,
      secret,
      url: url.origin + '/beds/' + code,
      updatedAt: record.updatedAt,
    });
  }

  // /beds/:code — GET, PUT, DELETE
  const match = url.pathname.match(/^\/beds\/([A-Za-z0-9-]+)$/);
  if (match) {
    const code = match[1].toUpperCase();

    if (method === 'GET') {
      const raw = await env.GOS_SYNC.get('bed:' + code);
      if (!raw) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (_) { return jsonResponse({ ok: false, error: 'corrupt_record' }, 500); }
      // Refresh the TTL so a bed actively in use across devices doesn't
      // silently expire. KV doesn't support extending TTL in place, so write
      // the same record back with a fresh expirationTtl. Best-effort: if the
      // refresh fails, still return the data — the read itself succeeded.
      try {
        await env.GOS_SYNC.put('bed:' + code, raw, { expirationTtl: TTL_SECONDS });
      } catch (_) { /* swallow — read result is still valid */ }
      return jsonResponse({
        ok: true,
        data: parsed.data,
        updatedAt: parsed.updatedAt,
      });
    }

    if (method === 'PUT') {
      let body;
      try { body = await request.json(); }
      catch (_) { return jsonResponse({ ok: false, error: 'bad_json' }, 400); }
      if (!body || typeof body.secret !== 'string' || !body.data) {
        return jsonResponse({ ok: false, error: 'missing_fields' }, 400);
      }
      const dataSize = validateDataSize(body.data);
      if (!dataSize.ok) return dataSize.response;
      const stored = await env.GOS_SYNC.get('secret:' + code);
      if (!stored) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      if (!constantTimeEqual(stored, body.secret)) {
        return jsonResponse({ ok: false, error: 'forbidden' }, 403);
      }
      const record = { data: body.data, updatedAt: new Date().toISOString() };
      await env.GOS_SYNC.put('bed:' + code, JSON.stringify(record),
        { expirationTtl: TTL_SECONDS });
      return jsonResponse({ ok: true, updatedAt: record.updatedAt });
    }

    if (method === 'DELETE') {
      let body;
      try { body = await request.json(); }
      catch (_) { return jsonResponse({ ok: false, error: 'bad_json' }, 400); }
      if (!body || typeof body.secret !== 'string') {
        return jsonResponse({ ok: false, error: 'missing_secret' }, 400);
      }
      const stored = await env.GOS_SYNC.get('secret:' + code);
      if (!stored) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      if (!constantTimeEqual(stored, body.secret)) {
        return jsonResponse({ ok: false, error: 'forbidden' }, 403);
      }
      await env.GOS_SYNC.delete('bed:' + code);
      await env.GOS_SYNC.delete('secret:' + code);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  return jsonResponse({ ok: false, error: 'not_found' }, 404);
}

const worker = {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'server_error', detail: String(err) }, 500);
    }
  },
  __test: {
    handle,
    constantTimeEqual,
    jsonByteLength,
    validateDataSize,
    maskKey,
    logCollisionTelemetry,
    SECRET_TTL_SECONDS,
    MAX_DATA_BYTES,
    CREATE_RATE_LIMIT,
  },
};

export default worker;
