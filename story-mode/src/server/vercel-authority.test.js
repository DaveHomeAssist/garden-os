import { describe, expect, it } from 'vitest';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions } from '../game/store.js';
import { verifyAuthorityAckSignature } from './authority-service.js';
import { createVercelAuthorityFetchHandler } from './vercel-authority.js';

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
    return Response.json({ error: `Unsupported command ${operation}` }, { status: 400 });
  };
  return { calls, fetchFn, records };
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
      'GOS_AUTHORITY_REDIS_REST_URL or UPSTASH_REDIS_REST_URL',
      'GOS_AUTHORITY_REDIS_REST_TOKEN or UPSTASH_REDIS_REST_TOKEN',
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
    const verified = await postJson(handle, '/api/ack/verify', { ack: applied.body.ack });

    expect(created.status).toBe(200);
    expect(created.body.session.sessionId).toBe('session-vercel');
    expect(applied.status).toBe(200);
    expect(applied.body.ack.accepted).toBe(true);
    expect(applied.body.ack.authoritativePatch.data.activeTool).toBe('water');
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(verified).toMatchObject({ body: { verified: true }, status: 200 });
    expect(calls.map((call) => call.command[0])).toEqual([
      'SET',
      'RPUSH',
      'RPUSH',
      'GET',
      'SET',
      'RPUSH',
      'RPUSH',
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
});
