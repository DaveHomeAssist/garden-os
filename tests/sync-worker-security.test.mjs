import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../gos-sync-worker.js';

const {
  constantTimeEqual,
  CREATE_RATE_LIMIT,
  logCollisionTelemetry,
  MAX_DATA_BYTES,
  SECRET_TTL_SECONDS,
} = worker.__test;

class MemoryKv {
  constructor(seed = {}) {
    this.store = new Map(Object.entries(seed));
    this.puts = [];
    this.deletes = [];
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async put(key, value, options) {
    this.store.set(key, value);
    this.puts.push({ key, value, options });
  }

  async delete(key) {
    this.store.delete(key);
    this.deletes.push(key);
  }
}

function envWithKv(kv = new MemoryKv()) {
  return { GOS_SYNC: kv };
}

function jsonRequest(path, body, headers = {}) {
  return new Request('https://sync.example.test' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('test_secret_kv_has_ttl', async () => {
  const kv = new MemoryKv();
  const response = await worker.fetch(jsonRequest('/beds', { data: { crop: 'peas' } }), envWithKv(kv));
  assert.equal(response.status, 200);

  const secretPut = kv.puts.find((entry) => entry.key.startsWith('secret:'));
  assert.ok(secretPut, 'expected secret KV write');
  assert.deepEqual(secretPut.options, { expirationTtl: SECRET_TTL_SECONDS });
});

test('test_body_over_64kb_returns_413', async () => {
  const response = await worker.fetch(
    jsonRequest('/beds', { data: 'x'.repeat(MAX_DATA_BYTES + 1) }),
    envWithKv(),
  );
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.error, 'payload_too_large');
  assert.equal(body.limit, MAX_DATA_BYTES);
});

test('test_rate_limit_kicks_at_31st_request', async () => {
  const kv = new MemoryKv();
  let response = null;
  for (let i = 0; i < CREATE_RATE_LIMIT + 1; i++) {
    response = await worker.fetch(
      jsonRequest('/beds', { data: { index: i } }, { 'CF-Connecting-IP': '203.0.113.9' }),
      envWithKv(kv),
    );
  }

  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.error, 'rate_limited');
  assert.equal(body.retry_after, 60);
});

test('test_secret_compare_is_constant_time', () => {
  const secret = '0123456789abcdef0123456789abcdef';

  assert.equal(constantTimeEqual(secret, secret), true);
  assert.equal(constantTimeEqual(secret, 'x123456789abcdef0123456789abcdef'), false);
  assert.equal(constantTimeEqual(secret, '0123456789abcdef0123456789abcdee'), false);
  assert.equal(constantTimeEqual(secret, 'short'), false);
});

test('test_collision_retry_logs_telemetry_without_leaking_secret', () => {
  const leakedSecret = '0123456789abcdef0123456789abcdef';
  const calls = [];
  const originalWarn = console.warn;
  try {
    console.warn = (...args) => calls.push(args);
    logCollisionTelemetry('success', leakedSecret, 2);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(calls.length, 1);
  const serialized = JSON.stringify(calls);
  assert.match(serialized, /collision_retry success/);
  assert.match(serialized, /collisions/);
  assert.doesNotMatch(serialized, new RegExp(leakedSecret));
});
