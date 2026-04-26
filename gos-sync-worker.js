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
//   KV "bed:<code>"    = { data: <bed JSON>, updatedAt: <ISO> }   (90-day TTL)
//   KV "secret:<code>" = "<32 hex chars>"                          (no TTL)
//
// CORS: every response sets Access-Control-Allow-Origin: * so a static page
// served from any domain (or file://) can call it. No cookies, no auth
// headers — secrets travel in the JSON body.

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

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
    let body;
    try { body = await request.json(); }
    catch (_) { return jsonResponse({ ok: false, error: 'bad_json' }, 400); }

    if (!body || typeof body !== 'object' || !body.data) {
      return jsonResponse({ ok: false, error: 'missing_data' }, 400);
    }

    // Try a few times in case of (extremely unlikely) collision.
    let code = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode();
      const existing = await env.GOS_SYNC.get('bed:' + candidate);
      if (!existing) { code = candidate; break; }
    }
    if (!code) {
      return jsonResponse({ ok: false, error: 'code_collision' }, 503);
    }

    const secret = generateSecret();
    const record = { data: body.data, updatedAt: new Date().toISOString() };
    await env.GOS_SYNC.put('bed:' + code, JSON.stringify(record),
      { expirationTtl: TTL_SECONDS });
    await env.GOS_SYNC.put('secret:' + code, secret);

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
      const stored = await env.GOS_SYNC.get('secret:' + code);
      if (!stored) return jsonResponse({ ok: false, error: 'not_found' }, 404);
      if (stored !== body.secret) {
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
      if (stored !== body.secret) {
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

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'server_error', detail: String(err) }, 500);
    }
  },
};
