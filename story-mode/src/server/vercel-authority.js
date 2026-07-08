import { createAuthorityFetchHandler } from './authority-http.js';
import {
  createAuthorityService,
  createUpstashLedgerStore,
  createUpstashSessionStore,
} from './authority-service.js';
import { handleNodeAuthorityRequest } from './authority-node-adapter.js';

const JSON_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function firstPresent(env, keys) {
  for (const key of keys) {
    if (env[key]) return env[key];
  }
  return '';
}

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    headers: JSON_HEADERS,
    status,
  });
}

function resolveAuthorityEnv(env = process.env) {
  const secret = firstPresent(env, ['GOS_AUTHORITY_HMAC_SECRET']);
  const token = firstPresent(env, ['GOS_AUTHORITY_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);
  const url = firstPresent(env, ['GOS_AUTHORITY_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
  const missing = [];
  if (!secret) missing.push('GOS_AUTHORITY_HMAC_SECRET');
  if (!url) missing.push('GOS_AUTHORITY_REDIS_REST_URL, UPSTASH_REDIS_REST_URL, or KV_REST_API_URL');
  if (!token) missing.push('GOS_AUTHORITY_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_TOKEN');
  return {
    keyPrefix: env.GOS_AUTHORITY_REDIS_PREFIX ?? 'gos:story-authority',
    missing,
    secret,
    token,
    url,
  };
}

function createConfiguredAuthorityService({
  env = process.env,
  fetchFn = globalThis.fetch,
  now,
  sessionIdFactory,
} = {}) {
  const config = resolveAuthorityEnv(env);
  if (config.missing.length > 0) {
    return { missing: config.missing, service: null };
  }
  const storeConfig = {
    fetchFn,
    keyPrefix: config.keyPrefix,
    token: config.token,
    url: config.url,
  };
  return {
    missing: [],
    service: createAuthorityService({
      ledgerStore: createUpstashLedgerStore(storeConfig),
      now,
      secret: config.secret,
      sessionIdFactory,
      sessionStore: createUpstashSessionStore(storeConfig),
    }),
  };
}

function createVercelAuthorityFetchHandler(options = {}) {
  return async function handleVercelAuthorityRequest(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: JSON_HEADERS, status: 204 });
    }

    const { missing, service } = createConfiguredAuthorityService(options);
    if (!service) {
      return jsonResponse({
        error: 'AUTHORITY_STORE_UNCONFIGURED',
        missing,
        ok: false,
      }, { status: 503 });
    }
    return createAuthorityFetchHandler(service)(request);
  };
}

function createVercelAuthorityNodeHandler(options = {}) {
  const handle = createVercelAuthorityFetchHandler(options);
  return async function handleVercelNodeRequest(req, res) {
    try {
      const host = req.headers.host ?? 'localhost';
      const origin = options.origin ?? `https://${host}`;
      await handleNodeAuthorityRequest(req, res, { handle, origin });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error?.message ?? 'Authority API failed.',
        ok: false,
      }));
    }
  };
}

export {
  createConfiguredAuthorityService,
  createVercelAuthorityFetchHandler,
  createVercelAuthorityNodeHandler,
  resolveAuthorityEnv,
};
