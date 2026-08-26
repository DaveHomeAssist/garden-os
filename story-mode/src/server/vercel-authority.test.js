import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions } from '../game/store.js';
import { verifyAuthorityAckSignature } from './authority-service.js';
import {
  createVercelAuthorityFetchHandler,
  createVercelAuthorityNodeHandler,
} from './vercel-authority.js';

const NOW = Date.parse('2026-07-06T20:30:00.000Z');
const SECRET = 'vercel-hmac-secret';

async function postJson(handle, path, body) {
  const response = await handle(new Request(`https://authority.example.test${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }));
  return {
    body: await response.json(),
    status: response.status,
  };
}

function createRedisFetchHarness() {
  const calls = [];
  const records = new Map();
  const fetchFn = async (url, init) => {
    const command = JSON.parse(init.body);
    calls.push({ command, headers: init.headers, method: init.method, url });
    const [operation, key, value] = command;
    if (operation === 'GET') {
      return Response.json({ result: records.get(key) ?? null });
    }
    if (operation === 'SET') {
      records.set(key, value);
      return Response.json({ result: 'OK' });
    }
    if (operation === 'RPUSH') {
      records.set(key, [...(records.get(key) ?? []), value]);
      return Response.json({ result: records.get(key).length });
    }
    if (operation === 'INCR') {
      const next = (Number(records.get(key)) || 0) + 1;
      records.set(key, next);
      return Response.json({ result: next });
    }
    if (operation === 'LTRIM' || operation === 'EXPIRE') {
      return Response.json({ result: operation === 'LTRIM' ? 'OK' : 1 });
    }
    return Response.json({ error: `Unsupported command ${operation}` }, { status: 400 });
  };
  return { calls, fetchFn, records };
}

function createNodeRequest({
  body = {},
  headers = {},
  method = 'POST',
  parsedBody,
  streamBody = JSON.stringify(body),
  url = '/api/session',
} = {}) {
  const req = Readable.from([streamBody]);
  req.headers = { 'content-type': 'application/json', host: 'authority.example.test', ...headers };
  req.method = method;
  req.url = url;
  if (parsedBody !== undefined) req.body = parsedBody;
  return req;
}

function createNodeResponse() {
  return {
    body: '',
    headers: null,
    statusCode: null,
    writableEnded: false,
    end(body) {
      this.body = Buffer.isBuffer(body) ? body.toString('utf8') : String(body ?? '');
      this.writableEnded = true;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

function envelope(overrides = {}) {
  return createActionEnvelope({
    clientSeq: 1,
    clientSentAt: '2026-07-06T20:30:00.000Z',
    expectedTick: 0,
    id: 'vercel-action-1',
    idempotencyKey: 'vercel-idem-1',
    payload: { toolId: 'water' },
    sessionId: 'session-vercel',
    type: Actions.SET_ACTIVE_TOOL,
    ...overrides,
  });
}

describe('vercel authority handler', () => {
  it('answers CORS preflight before requiring authority storage env', async () => {
    const handle = createVercelAuthorityFetchHandler({ env: {}, fetchFn: async () => Response.json({}) });
    const response = await handle(new Request('https://authority.example.test/api/session', {
      headers: {
        'Access-Control-Request-Headers': 'content-type',
        'Access-Control-Request-Method': 'POST',
        Origin: 'https://davehomeassist.github.io',
      },
      method: 'OPTIONS',
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
  });

  it('fails closed when production authority storage is not configured', async () => {
    const handle = createVercelAuthorityFetchHandler({ env: {}, fetchFn: async () => Response.json({}) });

    const response = await postJson(handle, '/api/session', { sessionId: 'session-vercel' });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: 'AUTHORITY_STORE_UNCONFIGURED',
      ok: false,
    });
    expect(response.body.missing).toEqual([
      'GOS_AUTHORITY_HMAC_SECRET',
      'GOS_AUTHORITY_REDIS_REST_URL, UPSTASH_REDIS_REST_URL, or KV_REST_API_URL',
      'GOS_AUTHORITY_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_TOKEN',
    ]);
  });

  it('serves sessions, actions, and ack verification through Redis REST storage', async () => {
    const { calls, fetchFn } = createRedisFetchHarness();
    const handle = createVercelAuthorityFetchHandler({
      env: {
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        GOS_AUTHORITY_REDIS_PREFIX: 'test:vercel-authority',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
      },
      fetchFn,
      now: () => NOW,
    });

    const created = await postJson(handle, '/api/session', { sessionId: 'session-vercel' });
    const applied = await postJson(handle, '/api/action', envelope());
    const resumed = await postJson(handle, '/api/session', { sessionId: 'session-vercel' });
    const verified = await postJson(handle, '/api/ack/verify', { ack: applied.body.ack });

    expect(created.status).toBe(200);
    expect(created.body.session.sessionId).toBe('session-vercel');
    expect(applied.status).toBe(200);
    expect(applied.body.ack.accepted).toBe(true);
    expect(applied.body.ack.authoritativePatch.data.activeTool).toBe('water');
    expect(resumed.status).toBe(200);
    expect(resumed.body.session).toMatchObject({
      checksum: applied.body.ack.checksum,
      ledgerCursor: '1',
      sessionId: 'session-vercel',
      tick: 1,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(verified).toMatchObject({ body: { verified: true }, status: 200 });
    expect(calls.map((call) => call.command[0])).toEqual([
      'INCR',
      'EXPIRE',
      'GET',
      'SET',
      'RPUSH',
      'LTRIM',
      'RPUSH',
      'EXPIRE',
      'INCR',
      'GET',
      'SET',
      'RPUSH',
      'LTRIM',
      'RPUSH',
      'EXPIRE',
      'INCR',
      'GET',
      'INCR',
    ]);
    expect(calls[0]).toMatchObject({
      headers: {
        Authorization: 'Bearer redis-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      url: 'https://redis.example.test',
    });
  });

  it('accepts Vercel Marketplace KV_REST_API env aliases for Upstash Redis', async () => {
    const { calls, fetchFn } = createRedisFetchHarness();
    const handle = createVercelAuthorityFetchHandler({
      env: {
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        GOS_AUTHORITY_REDIS_PREFIX: 'test:vercel-kv-alias',
        KV_REST_API_TOKEN: 'kv-token',
        KV_REST_API_URL: 'https://kv.example.test',
      },
      fetchFn,
      now: () => NOW,
    });

    const created = await postJson(handle, '/api/session', { sessionId: 'session-kv-alias' });

    expect(created.status).toBe(200);
    expect(created.body.session.sessionId).toBe('session-kv-alias');
    expect(calls[0]).toMatchObject({
      headers: {
        Authorization: 'Bearer kv-token',
        'Content-Type': 'application/json',
      },
      url: 'https://kv.example.test',
    });
  });

  it('writes and ends Node ServerResponse for Vercel API routes', async () => {
    const handler = createVercelAuthorityNodeHandler({ env: {}, fetchFn: async () => Response.json({}) });
    const req = createNodeRequest({ body: { sessionId: 'session-vercel' } });
    const res = createNodeResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(res.writableEnded).toBe(true);
    expect(JSON.parse(res.body)).toMatchObject({
      error: 'AUTHORITY_STORE_UNCONFIGURED',
      ok: false,
    });
  });

  it('uses Vercel parsed Node request bodies before stream fallback', async () => {
    const { fetchFn } = createRedisFetchHarness();
    const handler = createVercelAuthorityNodeHandler({
      env: {
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        KV_REST_API_TOKEN: 'kv-token',
        KV_REST_API_URL: 'https://kv.example.test',
      },
      fetchFn,
      now: () => NOW,
    });
    const req = createNodeRequest({
      parsedBody: { sessionId: 'session-parsed-body' },
      streamBody: '{',
    });
    const res = createNodeResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      ok: true,
      session: {
        sessionId: 'session-parsed-body',
        tick: 0,
      },
    });
  });

  it('rate limits repeated requests from one caller through the Redis store', async () => {
    const { fetchFn } = createRedisFetchHarness();
    const handle = createVercelAuthorityFetchHandler({
      env: {
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        GOS_AUTHORITY_RATE_LIMIT: '2',
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
      },
      fetchFn,
      now: () => NOW,
    });

    const first = await postJson(handle, '/api/session', { sessionId: 'session-rate-limit' });
    const second = await postJson(handle, '/api/session', { sessionId: 'session-rate-limit' });
    const third = await postJson(handle, '/api/session', { sessionId: 'session-rate-limit' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toMatchObject({ error: 'RATE_LIMITED', ok: false });
  });

  it('rejects requests from origins outside a configured allowlist', async () => {
    const { fetchFn } = createRedisFetchHarness();
    const handle = createVercelAuthorityFetchHandler({
      env: {
        GOS_AUTHORITY_ALLOWED_ORIGINS: 'https://davehomeassist.github.io',
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
      },
      fetchFn,
      now: () => NOW,
    });

    const blocked = await handle(new Request('https://authority.example.test/api/session', {
      body: JSON.stringify({ sessionId: 'session-origin-check' }),
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.test' },
      method: 'POST',
    }));
    const allowed = await handle(new Request('https://authority.example.test/api/session', {
      body: JSON.stringify({ sessionId: 'session-origin-check' }),
      headers: { 'Content-Type': 'application/json', Origin: 'https://davehomeassist.github.io' },
      method: 'POST',
    }));

    expect(blocked.status).toBe(403);
    expect((await blocked.json()).error).toBe('ORIGIN_NOT_ALLOWED');
    expect(allowed.status).toBe(200);
  });

  it('rejects malformed session ids and oversized bodies before storage writes', async () => {
    const { calls, fetchFn } = createRedisFetchHarness();
    const handle = createVercelAuthorityFetchHandler({
      env: {
        GOS_AUTHORITY_HMAC_SECRET: SECRET,
        UPSTASH_REDIS_REST_TOKEN: 'redis-token',
        UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
      },
      fetchFn,
      now: () => NOW,
    });

    const badId = await postJson(handle, '/api/session', { sessionId: 'no' });
    expect(badId.status).toBe(400);
    expect(badId.body.rejection.code).toBe('BAD_SESSION_ID');

    const badAction = await postJson(handle, '/api/action', envelope({ sessionId: '../../etc' }));
    expect(badAction.status).toBe(200);
    expect(badAction.body.ok).toBe(false);
    expect(badAction.body.ack.rejection.code).toBe('BAD_SESSION');

    const oversized = await postJson(handle, '/api/session', {
      seed: 'x'.repeat(70 * 1024),
      sessionId: 'session-too-big',
    });
    expect(oversized.status).toBe(413);

    expect(calls.filter((call) => call.command[0] === 'SET' || call.command[0] === 'RPUSH')).toEqual([]);
  });
});
