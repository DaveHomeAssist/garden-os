import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../gos-authority-worker.js';

const {
  SESSION_TTL_SECONDS,
  signServerAck,
  verifyServerAckSignature,
} = worker.__test;

const SECRET = 'test-authority-secret-minimum-24-chars';

class MemoryKv {
  constructor(seed = {}) {
    this.store = new Map(Object.entries(seed));
    this.puts = [];
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async put(key, value, options) {
    this.store.set(key, value);
    this.puts.push({ key, value, options });
  }
}

function envWithKv(kv = new MemoryKv()) {
  return {
    GOS_AUTHORITY: kv,
    GOS_AUTHORITY_SECRET: SECRET,
  };
}

function jsonRequest(path, body) {
  return new Request('https://authority.example.test' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createSession(kv = new MemoryKv(), sessionId = 'test-session-0001') {
  const env = envWithKv(kv);
  const response = await worker.fetch(jsonRequest('/session', { sessionId }), env);
  assert.equal(response.status, 200);
  return { body: await response.json(), env, kv, sessionId };
}

test('authority session persists canonical state with ttl', async () => {
  const kv = new MemoryKv();
  const { body } = await createSession(kv);

  assert.equal(body.ok, true);
  assert.equal(body.state.sessionId, 'test-session-0001');
  const sessionPut = kv.puts.find((entry) => entry.key === 'session:test-session-0001');
  assert.ok(sessionPut, 'expected session write');
  assert.deepEqual(sessionPut.options, { expirationTtl: SESSION_TTL_SECONDS });
});

test('authority action signs ack and mutates canonical state once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-1',
    idempotencyKey: 'idem-1',
    payload: { cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'SET_SELECTED_CROP',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', action), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'SET_SELECTED_CROP');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.selectedCropId, 'basil');
  assert.equal(first.state.tick, 1);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 1);
  assert.equal(second.state.data.selectedCropId, 'basil');
});

test('authority action routes plant crop through canonical grid state once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: { cellIndex: 2, cropId: 'radish' },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'PLANT_CROP');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].cropId, 'basil');
  assert.deepEqual(first.state.data.lastPlanting, { cellIndex: 2, cropId: 'basil' });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 1);
  assert.equal(second.state.data.grid[2].cropId, 'basil');
});

test('authority action routes water cell through canonical grid state once', async () => {
  const { env, sessionId } = await createSession();
  const plantAction = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  };
  await worker.fetch(jsonRequest('/action', plantAction), env);

  const action = {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-water',
    idempotencyKey: 'idem-water',
    payload: { bonus: 0.25, cellIndex: 2, wateredAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'WATER_CELL',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: { bonus: 1, cellIndex: 2, wateredAt: 1783379999999 },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'WATER_CELL');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].cropId, 'basil');
  assert.equal(first.state.data.grid[2].interventionBonus, 0.25);
  assert.equal(first.state.data.grid[2].lastWateredAt, 1783370000000);
  assert.deepEqual(first.state.data.lastWatering, {
    bonus: 0.25,
    cellIndex: 2,
    interventionBonus: 0.25,
    wateredAt: 1783370000000,
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].interventionBonus, 0.25);
});

test('authority action routes harvest cell through canonical grid state once', async () => {
  const { env, sessionId } = await createSession();
  const plantAction = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  };
  await worker.fetch(jsonRequest('/action', plantAction), env);

  const action = {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-harvest',
    idempotencyKey: 'idem-harvest',
    payload: { cellIndex: 2, cropId: 'basil', harvestedAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'HARVEST_CELL',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: { cellIndex: 2, cropId: 'radish', harvestedAt: 1783379999999 },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'HARVEST_CELL');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].cropId, null);
  assert.deepEqual(first.state.data.lastHarvesting, {
    cellIndex: 2,
    cropId: 'basil',
    harvestedAt: 1783370000000,
    yieldCount: 1,
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].cropId, null);
});

test('authority rejects malformed plant crop payload before mutation', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-plant',
    idempotencyKey: 'idem-bad-plant',
    payload: { cellIndex: 99, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.actionType, 'PLANT_CROP');
  assert.equal(body.ack.rejection.code, 'BAD_CELL_INDEX');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.grid.every((cell) => cell.cropId === null), true);
});

test('authority rejects water cell for empty cells before mutation', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-water',
    idempotencyKey: 'idem-bad-water',
    payload: { bonus: 0.25, cellIndex: 2, wateredAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'WATER_CELL',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.actionType, 'WATER_CELL');
  assert.equal(body.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.grid[2].interventionBonus, 0);
});

test('authority rejects harvest cell for empty cells before mutation', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-harvest',
    idempotencyKey: 'idem-bad-harvest',
    payload: { cellIndex: 2, cropId: 'basil', harvestedAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'HARVEST_CELL',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.actionType, 'HARVEST_CELL');
  assert.equal(body.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.grid[2].cropId, null);
});

test('authority rejects client-submitted harvest totals before mutation', async () => {
  const { env, sessionId } = await createSession();
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  }), env);

  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-bad-harvest-total',
    idempotencyKey: 'idem-bad-harvest-total',
    payload: { cellIndex: 2, cropId: 'basil', harvestedAt: 1783370000000, yieldCount: 999 },
    playerId: 'local',
    sessionId,
    type: 'HARVEST_CELL',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.actionType, 'HARVEST_CELL');
  assert.equal(body.ack.rejection.code, 'CLIENT_HARVEST_TOTAL');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 1);
  assert.equal(session.state.data.grid[2].cropId, 'basil');
});

test('authority action routes zone changes through canonical state once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-zone',
    idempotencyKey: 'idem-zone',
    payload: { spawnPoint: { x: -6, z: 0 }, toZone: 'meadow' },
    playerId: 'local',
    sessionId,
    type: 'ZONE_CHANGED',
  };

  const response = await worker.fetch(jsonRequest('/action', action), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ack.accepted, true);
  assert.equal(body.ack.actionType, 'ZONE_CHANGED');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
  assert.equal(body.state.data.currentZone, 'meadow');
  assert.deepEqual(body.state.data.visitedZones, ['player_plot', 'meadow']);
  assert.deepEqual(body.state.data.lastSpawnPoint, { x: -6, z: 0 });
});

test('authority rejects tampered full-state payload before mutation', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-2',
    payload: { state: { selectedCropId: 'trusted-client-state' } },
    playerId: 'local',
    sessionId,
    type: 'SET_SELECTED_CROP',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.rejection.code, 'TRUSTED_STATE_PAYLOAD');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.data.selectedCropId, null);
  assert.equal(session.state.tick, 0);
});

test('authority rejects unknown action types', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-3',
    payload: {},
    playerId: 'local',
    sessionId,
    type: 'REPLACE_WHOLE_GAME',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.rejection.code, 'ACTION_NOT_ALLOWED');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
});

test('authority ack signature fails after tampering', async () => {
  const ack = await signServerAck({
    accepted: true,
    actionId: 'action-4',
    checksum: 'abc123',
    serverTime: '2026-07-06T15:00:00.000Z',
    sessionId: 'test-session-0001',
    stateVersion: 1,
    tick: 1,
  }, SECRET);

  assert.equal(await verifyServerAckSignature(ack, SECRET), true);
  assert.equal(await verifyServerAckSignature({ ...ack, checksum: 'tampered' }, SECRET), false);
  assert.equal(await verifyServerAckSignature({ ...ack, signature: 'hmac-sha256:bad' }, SECRET), false);
});

test('authority verifies signed acks without exposing the hmac secret', async () => {
  const { env } = await createSession();
  const ack = await signServerAck({
    accepted: true,
    actionId: 'action-verify-1',
    checksum: 'abc123',
    serverTime: '2026-07-06T15:00:00.000Z',
    sessionId: 'test-session-0001',
    stateVersion: 1,
    tick: 1,
  }, SECRET);

  const goodResponse = await worker.fetch(jsonRequest('/ack/verify', { ack }), env);
  const good = await goodResponse.json();
  const badResponse = await worker.fetch(jsonRequest('/ack/verify', {
    ack: { ...ack, checksum: 'tampered' },
  }), env);
  const bad = await badResponse.json();

  assert.equal(goodResponse.status, 200);
  assert.equal(good.verified, true);
  assert.equal(badResponse.status, 422);
  assert.equal(bad.verified, false);
  assert.equal(Object.hasOwn(good, 'secret'), false);
});

test('authority fails closed without hmac secret', async () => {
  const kv = new MemoryKv();
  await worker.fetch(jsonRequest('/session', { sessionId: 'test-session-0001' }), {
    GOS_AUTHORITY: kv,
    GOS_AUTHORITY_SECRET: SECRET,
  });
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-5',
    payload: { cropId: 'basil' },
    playerId: 'local',
    sessionId: 'test-session-0001',
    type: 'SET_SELECTED_CROP',
  }), { GOS_AUTHORITY: kv });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, 'secret_unavailable');
});
