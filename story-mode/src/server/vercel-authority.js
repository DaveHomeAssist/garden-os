import { createAuthorityFetchHandler } from './authority-http.js';
import {
  createAuthorityService,
  createUpstashLedgerStore,
  createUpstashSessionStore,
  upstashCommand,
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

// Admission controls for the public endpoint: a fixed-window per-caller rate
// limit backed by the same Upstash store, and an optional origin allowlist.
const DEFAULT_RATE_LIMIT = 120;
const DEFAULT_RATE_WINDOW_SECONDS = 60;

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveAdmissionEnv(env = process.env) {
  return {
    allowedOrigins: (env.GOS_AUTHORITY_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    rateLimit: parseNonNegativeInt(env.GOS_AUTHORITY_RATE_LIMIT, DEFAULT_RATE_LIMIT),
    rateWindowSeconds: parseNonNegativeInt(env.GOS_AUTHORITY_RATE_WINDOW_SECONDS, 0) || DEFAULT_RATE_WINDOW_SECONDS,
  };
}

function requestClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

async function checkRateLimit({ admission, keyPrefix, now, request, storeConfig }) {
  if (admission.rateLimit <= 0) return null;
  const timestamp = typeof now === 'function' ? now() : Date.now();
  const windowIndex = Math.floor(timestamp / (admission.rateWindowSeconds * 1000));
  const key = `${keyPrefix}:rate:${requestClientKey(request)}:${windowIndex}`;
  try {
    const count = await upstashCommand(storeConfig, ['INCR', key]);
    if (count === 1) {
      await upstashCommand(storeConfig, ['EXPIRE', key, String(admission.rateWindowSeconds)]);
    }
    if (count > admission.rateLimit) {
      return jsonResponse({
        error: 'RATE_LIMITED',
        ok: false,
        retryAfterSeconds: admission.rateWindowSeconds,
      }, { status: 429 });
    }
  } catch {
    // Fail open: a rate-limit store hiccup must not take the authority down.
  }
  return null;
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
    return { keyPrefix: config.keyPrefix, missing: config.missing, service: null, storeConfig: null };
  }
  const storeConfig = {
    fetchFn,
    keyPrefix: config.keyPrefix,
    token: config.token,
    url: config.url,
  };
  return {
    keyPrefix: config.keyPrefix,
    missing: [],
    service: createAuthorityService({
      ledgerStore: createUpstashLedgerStore(storeConfig),
      now,
      secret: config.secret,
      sessionIdFactory,
      sessionStore: createUpstashSessionStore(storeConfig),
    }),
    storeConfig,
  };
}

function createVercelAuthorityFetchHandler(options = {}) {
  return async function handleVercelAuthorityRequest(request) {
    const admission = resolveAdmissionEnv(options.env ?? process.env);
    const origin = (request.headers.get('origin') ?? '').replace(/\/$/, '');
    if (admission.allowedOrigins.length > 0 && origin && !admission.allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'ORIGIN_NOT_ALLOWED', ok: false }, { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: JSON_HEADERS, status: 204 });
    }

    const { keyPrefix, missing, service, storeConfig } = createConfiguredAuthorityService(options);
    if (!service) {
      return jsonResponse({
        error: 'AUTHORITY_STORE_UNCONFIGURED',
        missing,
        ok: false,
      }, { status: 503 });
    }

    const limited = await checkRateLimit({
      admission,
      keyPrefix,
      now: options.now,
      request,
      storeConfig,
    });
    if (limited) return limited;

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
