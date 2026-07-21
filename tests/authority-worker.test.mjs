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
    newRecipes: [],
    pantryCount: 1,
    totalCount: 1,
    yieldCount: 1,
  });
  assert.deepEqual(first.state.data.pantry, { basil: 1 });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].cropId, null);
});

test('authority action routes remove crop through canonical grid state once', async () => {
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
    id: 'action-remove',
    idempotencyKey: 'idem-remove',
    payload: { cellIndex: 2, cropId: 'basil', removedAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_CROP',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: { cellIndex: 2, cropId: 'radish', removedAt: 1783379999999 },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'REMOVE_CROP');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].cropId, null);
  assert.deepEqual(first.state.data.lastRemoval, {
    cellIndex: 2,
    cropId: 'basil',
    removedAt: 1783370000000,
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].cropId, null);
});

test('authority action routes protection through canonical grid state once', async () => {
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
    id: 'action-protect',
    idempotencyKey: 'idem-protect',
    payload: { cellIndex: 2, protected: true },
    playerId: 'local',
    sessionId,
    type: 'SET_PROTECTION',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: { cellIndex: 2, protected: false },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'SET_PROTECTION');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].protected, true);
  assert.deepEqual(first.state.data.lastProtection, {
    cellIndex: 2,
    protected: true,
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].protected, true);
});

test('authority action routes tool interventions as one canonical transaction', async () => {
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

  const action = {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-protect-intervention',
    idempotencyKey: 'idem-protect-intervention',
    payload: {
      appliedAt: 1783370000000,
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      itemCount: 1,
      itemId: 'pest_spray',
      protected: true,
      toolId: 'protect',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: {
      ...action.payload,
      cooldownUntil: 1783370099999,
      itemCount: 3,
    },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'APPLY_TOOL_INTERVENTION');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].protected, true);
  assert.equal(first.state.data.inventory.slots[3].count, 2);
  assert.equal(first.state.data.toolCooldowns.protect_2, 1783370030000);
  assert.deepEqual(first.state.data.lastToolIntervention, {
    appliedAt: 1783370000000,
    bonus: 0,
    carryForwardType: null,
    cellIndex: 2,
    cooldown: {
      cellIndex: 2,
      key: 'protect_2',
      toolId: 'protect',
      until: 1783370030000,
    },
    interventionBonus: 0,
    itemCount: 1,
    itemId: 'pest_spray',
    protected: true,
    remainingCount: 2,
    toolId: 'protect',
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.inventory.slots[3].count, 2);
});

test('authority action routes mulch interventions as one canonical transaction', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-mulch-intervention',
    idempotencyKey: 'idem-mulch-intervention',
    payload: {
      appliedAt: 1783370000000,
      bonus: 0.2,
      carryForwardType: 'enriched',
      cellIndex: 3,
      cooldownUntil: 1783370045000,
      itemCount: 1,
      itemId: 'mulch_bag',
      mulched: true,
      toolId: 'mulch',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ack.accepted, true);
  assert.equal(body.ack.actionType, 'APPLY_TOOL_INTERVENTION');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
  assert.equal(body.state.data.grid[3].mulched, true);
  assert.equal(body.state.data.grid[3].carryForwardType, 'enriched');
  assert.equal(body.state.data.grid[3].interventionBonus, 0.2);
  assert.equal(body.state.data.inventory.slots[4].count, 2);
  assert.equal(body.state.data.toolCooldowns.mulch_3, 1783370045000);
  assert.deepEqual(body.state.data.lastToolIntervention, {
    appliedAt: 1783370000000,
    bonus: 0.2,
    carryForwardType: 'enriched',
    cellIndex: 3,
    cooldown: {
      cellIndex: 3,
      key: 'mulch_3',
      toolId: 'mulch',
      until: 1783370045000,
    },
    interventionBonus: 0.2,
    itemCount: 1,
    itemId: 'mulch_bag',
    mulched: true,
    remainingCount: 2,
    toolId: 'mulch',
  });
});

test('authority action routes water interventions with cooldown as one canonical transaction', async () => {
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

  const action = {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-water-intervention',
    idempotencyKey: 'idem-water-intervention',
    payload: {
      appliedAt: 1783370000000,
      bonus: 0.25,
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      toolId: 'water',
      toolDurabilityCost: 1,
      toolItemId: 'watering_can',
      toolSlotIndex: 0,
      wateredAt: 1783370000000,
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: {
      ...action.payload,
      bonus: 1,
      cooldownUntil: 1783370099999,
      toolDurabilityCost: 50,
      wateredAt: 1783379999999,
    },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'APPLY_TOOL_INTERVENTION');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.equal(first.state.data.grid[2].cropId, 'basil');
  assert.equal(first.state.data.grid[2].interventionBonus, 0.25);
  assert.equal(first.state.data.grid[2].lastWateredAt, 1783370000000);
  assert.equal(first.state.data.toolCooldowns.water_2, 1783370030000);
  assert.equal(first.state.data.inventory.slots[0].itemId, 'watering_can');
  assert.equal(first.state.data.inventory.slots[0].durability, 99);
  assert.deepEqual(first.state.data.lastToolIntervention, {
    appliedAt: 1783370000000,
    bonus: 0.25,
    carryForwardType: null,
    cellIndex: 2,
    cooldown: {
      cellIndex: 2,
      key: 'water_2',
      toolId: 'water',
      until: 1783370030000,
    },
    interventionBonus: 0.25,
    itemCount: 0,
    itemId: null,
    remainingCount: null,
    toolDurability: 99,
    toolDurabilityCost: 1,
    toolId: 'water',
    toolItemId: 'watering_can',
    toolSlotIndex: 0,
    wateredAt: 1783370000000,
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 2);
  assert.equal(second.state.data.grid[2].interventionBonus, 0.25);
  assert.equal(second.state.data.toolCooldowns.water_2, 1783370030000);
  assert.equal(second.state.data.inventory.slots[0].durability, 99);
});

test('authority action routes cell conditions through canonical grid state', async () => {
  const { env, sessionId } = await createSession();

  const damageResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-damage',
    idempotencyKey: 'idem-damage',
    payload: { cellIndex: 2, damageState: 'frost' },
    playerId: 'local',
    sessionId,
    type: 'SET_DAMAGE',
  }), env);
  const damage = await damageResponse.json();

  const soilResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-soil',
    idempotencyKey: 'idem-soil',
    payload: { cellIndex: 2, soilFatigue: 0.3 },
    playerId: 'local',
    sessionId,
    type: 'UPDATE_SOIL',
  }), env);
  const soil = await soilResponse.json();

  const carryResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 2,
    gameId: 'garden',
    id: 'action-carry',
    idempotencyKey: 'idem-carry',
    payload: { carryForwardType: 'enriched', cellIndex: 2, mulched: true },
    playerId: 'local',
    sessionId,
    type: 'CARRY_FORWARD',
  }), env);
  const carry = await carryResponse.json();

  assert.equal(damageResponse.status, 200);
  assert.equal(damage.ack.accepted, true);
  assert.equal(damage.ack.actionType, 'SET_DAMAGE');
  assert.deepEqual(damage.state.data.lastDamage, { cellIndex: 2, damageState: 'frost' });
  assert.equal(soilResponse.status, 200);
  assert.equal(soil.ack.accepted, true);
  assert.equal(soil.ack.actionType, 'UPDATE_SOIL');
  assert.deepEqual(soil.state.data.lastSoil, { cellIndex: 2, soilFatigue: 0.3 });
  assert.equal(carryResponse.status, 200);
  assert.equal(carry.ack.accepted, true);
  assert.equal(carry.ack.actionType, 'CARRY_FORWARD');
  assert.equal(await verifyServerAckSignature(carry.ack, SECRET), true);
  assert.deepEqual(carry.state.data.lastCarryForward, {
    carryForwardType: 'enriched',
    cellIndex: 2,
    mulched: true,
  });
  assert.equal(carry.state.data.grid[2].damageState, 'frost');
  assert.equal(carry.state.data.grid[2].soilFatigue, 0.3);
  assert.equal(carry.state.data.grid[2].carryForwardType, 'enriched');
  assert.equal(carry.state.data.grid[2].mulched, true);
});

test('authority rejects malformed cell condition payloads before mutation', async () => {
  const { env, sessionId } = await createSession();

  const damageResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-damage',
    idempotencyKey: 'idem-bad-damage',
    payload: { cellIndex: 2, damageState: '' },
    playerId: 'local',
    sessionId,
    type: 'SET_DAMAGE',
  }), env);
  const damage = await damageResponse.json();

  const soilResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-soil',
    idempotencyKey: 'idem-bad-soil',
    payload: { cellIndex: 2, soilFatigue: 1.5 },
    playerId: 'local',
    sessionId,
    type: 'UPDATE_SOIL',
  }), env);
  const soil = await soilResponse.json();

  const carryResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-carry',
    idempotencyKey: 'idem-bad-carry',
    payload: { carryForwardType: 'enriched', cellIndex: 2, mulched: 'true' },
    playerId: 'local',
    sessionId,
    type: 'CARRY_FORWARD',
  }), env);
  const carry = await carryResponse.json();

  assert.equal(damageResponse.status, 422);
  assert.equal(damage.ack.accepted, false);
  assert.equal(damage.ack.rejection.code, 'BAD_DAMAGE_STATE');
  assert.equal(soilResponse.status, 422);
  assert.equal(soil.ack.accepted, false);
  assert.equal(soil.ack.rejection.code, 'BAD_SOIL_FATIGUE');
  assert.equal(carryResponse.status, 422);
  assert.equal(carry.ack.accepted, false);
  assert.equal(carry.ack.rejection.code, 'BAD_MULCHED_VALUE');
  assert.equal(await verifyServerAckSignature(carry.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.grid[2].damageState, null);
  assert.equal(session.state.data.grid[2].soilFatigue, 0);
  assert.equal(session.state.data.grid[2].carryForwardType, null);
  assert.equal(session.state.data.grid[2].mulched, false);
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

test('authority rejects remove crop for empty or mismatched cells before mutation', async () => {
  const { env, sessionId } = await createSession();
  const emptyResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-empty-remove',
    idempotencyKey: 'idem-empty-remove',
    payload: { cellIndex: 2, cropId: 'basil', removedAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_CROP',
  }), env);
  const empty = await emptyResponse.json();

  await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  }), env);

  const mismatchResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-mismatch-remove',
    idempotencyKey: 'idem-mismatch-remove',
    payload: { cellIndex: 2, cropId: 'radish', removedAt: 1783370000000 },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_CROP',
  }), env);
  const mismatch = await mismatchResponse.json();

  assert.equal(emptyResponse.status, 422);
  assert.equal(empty.ack.accepted, false);
  assert.equal(empty.ack.actionType, 'REMOVE_CROP');
  assert.equal(empty.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(mismatchResponse.status, 422);
  assert.equal(mismatch.ack.accepted, false);
  assert.equal(mismatch.ack.actionType, 'REMOVE_CROP');
  assert.equal(mismatch.ack.rejection.code, 'CROP_MISMATCH');
  assert.equal(await verifyServerAckSignature(mismatch.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 1);
  assert.equal(session.state.data.grid[2].cropId, 'basil');
});

test('authority rejects protection for empty cells and malformed values before mutation', async () => {
  const { env, sessionId } = await createSession();
  const emptyResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-empty-protect',
    idempotencyKey: 'idem-empty-protect',
    payload: { cellIndex: 2, protected: true },
    playerId: 'local',
    sessionId,
    type: 'SET_PROTECTION',
  }), env);
  const empty = await emptyResponse.json();

  const malformedResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-protect',
    idempotencyKey: 'idem-bad-protect',
    payload: { cellIndex: 2, protected: 'true' },
    playerId: 'local',
    sessionId,
    type: 'SET_PROTECTION',
  }), env);
  const malformed = await malformedResponse.json();

  assert.equal(emptyResponse.status, 422);
  assert.equal(empty.ack.accepted, false);
  assert.equal(empty.ack.actionType, 'SET_PROTECTION');
  assert.equal(empty.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(malformedResponse.status, 422);
  assert.equal(malformed.ack.accepted, false);
  assert.equal(malformed.ack.actionType, 'SET_PROTECTION');
  assert.equal(malformed.ack.rejection.code, 'BAD_PROTECTION_VALUE');
  assert.equal(await verifyServerAckSignature(malformed.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.grid[2].protected, false);
});

test('authority rejects malformed tool intervention payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const emptyResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-empty-protect-intervention',
    idempotencyKey: 'idem-empty-protect-intervention',
    payload: {
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      itemId: 'pest_spray',
      protected: true,
      toolId: 'protect',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const empty = await emptyResponse.json();

  const emptyWaterResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-empty-water-intervention',
    idempotencyKey: 'idem-empty-water-intervention',
    payload: {
      cellIndex: 3,
      cooldownUntil: 1783370030000,
      toolId: 'water',
      wateredAt: 1783370000000,
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const emptyWater = await emptyWaterResponse.json();

  await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-plant',
    idempotencyKey: 'idem-plant',
    payload: { cellIndex: 2, cropId: 'basil' },
    playerId: 'local',
    sessionId,
    type: 'PLANT_CROP',
  }), env);

  const trustedTotalResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 4,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-trusted-intervention-total',
    idempotencyKey: 'idem-trusted-intervention-total',
    payload: {
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      interventionBonus: 99,
      itemId: 'pest_spray',
      protected: true,
      toolId: 'protect',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const trustedTotal = await trustedTotalResponse.json();

  const badWateredAtResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 5,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-bad-watered-at',
    idempotencyKey: 'idem-bad-watered-at',
    payload: {
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      toolId: 'water',
      wateredAt: 'bad-timestamp',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const badWateredAt = await badWateredAtResponse.json();

  const toolMismatchResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 6,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-water-tool-mismatch',
    idempotencyKey: 'idem-water-tool-mismatch',
    payload: {
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      toolId: 'water',
      toolItemId: 'pruning_shears',
      toolSlotIndex: 0,
      wateredAt: 1783370000000,
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const toolMismatch = await toolMismatchResponse.json();

  const wrongItemResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 7,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-wrong-intervention-item',
    idempotencyKey: 'idem-wrong-intervention-item',
    payload: {
      cellIndex: 2,
      cooldownUntil: 1783370030000,
      itemId: 'mulch_bag',
      protected: true,
      toolId: 'protect',
    },
    playerId: 'local',
    sessionId,
    type: 'APPLY_TOOL_INTERVENTION',
  }), env);
  const wrongItem = await wrongItemResponse.json();

  assert.equal(emptyResponse.status, 422);
  assert.equal(empty.ack.accepted, false);
  assert.equal(empty.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(emptyWaterResponse.status, 422);
  assert.equal(emptyWater.ack.accepted, false);
  assert.equal(emptyWater.ack.rejection.code, 'CELL_EMPTY');
  assert.equal(trustedTotalResponse.status, 422);
  assert.equal(trustedTotal.ack.accepted, false);
  assert.equal(trustedTotal.ack.rejection.code, 'CLIENT_INTERVENTION_TOTAL');
  assert.equal(badWateredAtResponse.status, 422);
  assert.equal(badWateredAt.ack.accepted, false);
  assert.equal(badWateredAt.ack.rejection.code, 'BAD_WATERED_AT');
  assert.equal(toolMismatchResponse.status, 422);
  assert.equal(toolMismatch.ack.accepted, false);
  assert.equal(toolMismatch.ack.rejection.code, 'TOOL_MISMATCH');
  assert.equal(wrongItemResponse.status, 422);
  assert.equal(wrongItem.ack.accepted, false);
  assert.equal(wrongItem.ack.rejection.code, 'ITEM_MISMATCH');
  assert.equal(await verifyServerAckSignature(wrongItem.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 1);
  assert.equal(session.state.data.grid[2].protected, false);
  assert.equal(session.state.data.inventory.slots[3].count, 3);
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

test('authority action routes cooldowns through canonical state once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-cooldown',
    idempotencyKey: 'idem-cooldown',
    payload: {
      cellIndex: 2,
      key: 'water_2',
      toolId: 'water',
      until: 1783370005000,
    },
    playerId: 'local',
    sessionId,
    type: 'SET_COOLDOWN',
  };

  const response = await worker.fetch(jsonRequest('/action', action), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ack.accepted, true);
  assert.equal(body.ack.actionType, 'SET_COOLDOWN');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
  assert.deepEqual(body.state.data.lastCooldown, {
    cellIndex: 2,
    key: 'water_2',
    toolId: 'water',
    until: 1783370005000,
  });
  assert.equal(body.state.data.toolCooldowns.water_2, 1783370005000);
});

test('authority action routes tool durability through canonical inventory once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-tool-use',
    idempotencyKey: 'idem-tool-use',
    payload: {
      durabilityCost: 5,
      itemId: 'watering_can',
      slotIndex: 0,
    },
    playerId: 'local',
    sessionId,
    type: 'USE_TOOL',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: {
      durabilityCost: 50,
      itemId: 'watering_can',
      slotIndex: 0,
    },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'USE_TOOL');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastToolUse, {
    durability: 95,
    durabilityCost: 5,
    itemId: 'watering_can',
    slotIndex: 0,
  });
  assert.equal(first.state.data.inventory.slots[0].itemId, 'watering_can');
  assert.equal(first.state.data.inventory.slots[0].durability, 95);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 1);
  assert.equal(second.state.data.inventory.slots[0].durability, 95);
});

test('authority action routes consumable item removal through canonical inventory once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-remove-item',
    idempotencyKey: 'idem-remove-item',
    payload: {
      count: 1,
      itemId: 'pest_spray',
    },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_ITEM',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: {
      count: 2,
      itemId: 'pest_spray',
    },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'REMOVE_ITEM');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastItemRemoval, {
    count: 1,
    itemId: 'pest_spray',
    remainingCount: 2,
  });
  assert.equal(first.state.data.inventory.slots[3].itemId, 'pest_spray');
  assert.equal(first.state.data.inventory.slots[3].count, 2);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 1);
  assert.equal(second.state.data.inventory.slots[3].count, 2);
});

test('authority action routes item additions through canonical inventory once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-add-item',
    idempotencyKey: 'idem-add-item',
    payload: {
      count: 2,
      itemId: 'plant_matter',
    },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    payload: {
      count: 20,
      itemId: 'plant_matter',
    },
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'ADD_ITEM');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastItemAddition, {
    addedCount: 2,
    count: 2,
    itemId: 'plant_matter',
    slotIndex: 5,
    totalCount: 2,
  });
  assert.equal(first.state.data.inventory.slots[5].itemId, 'plant_matter');
  assert.equal(first.state.data.inventory.slots[5].count, 2);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 1);
  assert.equal(second.state.data.inventory.slots[5].count, 2);
});

test('authority action routes tool repairs through canonical inventory once', async () => {
  const { env, sessionId } = await createSession();
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-add-repair-material',
    idempotencyKey: 'idem-add-repair-material',
    payload: {
      count: 2,
      itemId: 'plant_matter',
    },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-damage-tool',
    idempotencyKey: 'idem-damage-tool',
    payload: {
      durabilityCost: 40,
      itemId: 'watering_can',
      slotIndex: 0,
    },
    playerId: 'local',
    sessionId,
    type: 'USE_TOOL',
  }), env);

  const action = {
    clientSeq: 3,
    expectedTick: 2,
    gameId: 'garden',
    id: 'action-repair-tool',
    idempotencyKey: 'idem-repair-tool',
    payload: {
      itemId: 'watering_can',
      materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
      slotIndex: 0,
    },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    id: 'action-repair-tool-retry',
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'REPAIR_TOOL');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastToolRepair, {
    durability: 100,
    itemId: 'watering_can',
    materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
    maxDurability: 100,
    remainingMaterials: { plant_matter: 0 },
    slotIndex: 0,
  });
  assert.equal(first.state.data.inventory.slots[0].durability, 100);
  assert.equal(first.state.data.inventory.slots[5], null);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 3);
  assert.equal(second.state.data.inventory.slots[0].durability, 100);
  assert.equal(second.state.data.inventory.slots[5], null);
});

test('authority action routes crafting through canonical inventory once', async () => {
  const { env, sessionId } = await createSession();
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-add-compost',
    idempotencyKey: 'idem-add-compost',
    payload: {
      count: 2,
      itemId: 'compost',
    },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-add-plant-matter',
    idempotencyKey: 'idem-add-plant-matter',
    payload: {
      count: 3,
      itemId: 'plant_matter',
    },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);

  const action = {
    clientSeq: 3,
    expectedTick: 2,
    gameId: 'garden',
    id: 'action-craft-fertilizer',
    idempotencyKey: 'idem-craft-fertilizer',
    payload: {
      materialsConsumed: [{ count: 2, itemId: 'compost' }, { count: 3, itemId: 'plant_matter' }],
      recipeId: 'basic_fertilizer',
      xpGained: 15,
    },
    playerId: 'local',
    sessionId,
    type: 'CRAFT_ITEM',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const secondResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    id: 'action-craft-fertilizer-retry',
  }), env);
  const second = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'CRAFT_ITEM');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastCrafting, {
    count: 1,
    durability: null,
    itemId: 'fertilizer_bag',
    materialsConsumed: [{ count: 2, itemId: 'compost' }, { count: 3, itemId: 'plant_matter' }],
    maxDurability: null,
    recipeId: 'basic_fertilizer',
    remainingMaterials: { compost: 0, plant_matter: 0 },
    slotIndex: 2,
    totalCount: 4,
  });
  assert.equal(first.state.data.inventory.slots[2].count, 4);
  assert.equal(first.state.data.inventory.slots[5], null);
  assert.equal(first.state.data.inventory.slots[6], null);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.tick, 3);
  assert.equal(second.state.data.inventory.slots[2].count, 4);
});

test('authority rejects malformed or client-owned crafting payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const cases = [
    {
      code: 'TRUSTED_INVENTORY_PAYLOAD',
      id: 'craft-trusted',
      payload: { inventory: { slots: [] }, recipeId: 'basic_fertilizer' },
    },
    {
      code: 'CLIENT_CRAFT_TOTAL',
      id: 'craft-output',
      payload: { itemProduced: { count: 99, itemId: 'legendary_trowel' }, recipeId: 'basic_fertilizer' },
    },
    {
      code: 'BAD_RECIPE_ID',
      id: 'craft-unknown',
      payload: { recipeId: 'duplication_glitch' },
    },
    {
      code: 'CRAFT_COST_MISMATCH',
      id: 'craft-underpaid',
      payload: {
        materialsConsumed: [{ count: 1, itemId: 'compost' }, { count: 3, itemId: 'plant_matter' }],
        recipeId: 'basic_fertilizer',
      },
    },
    {
      code: 'BAD_DURABILITY_BONUS',
      id: 'craft-bonus',
      payload: { durabilityBonus: 25, recipeId: 'improved_watering_can' },
    },
    {
      code: 'BAD_MASTERWORK_VALUE',
      id: 'craft-masterwork',
      payload: { masterwork: 'yes', recipeId: 'basic_fertilizer' },
    },
    {
      code: 'NOT_ENOUGH_ITEM',
      id: 'craft-missing',
      payload: { recipeId: 'basic_fertilizer' },
    },
  ];

  for (const [index, entry] of cases.entries()) {
    const response = await worker.fetch(jsonRequest('/action', {
      clientSeq: index + 1,
      expectedTick: 0,
      gameId: 'garden',
      id: `action-${entry.id}`,
      idempotencyKey: `idem-${entry.id}`,
      payload: entry.payload,
      playerId: 'local',
      sessionId,
      type: 'CRAFT_ITEM',
    }), env);
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.equal(body.ack.accepted, false);
    assert.equal(body.ack.rejection.code, entry.code);
    assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
  }

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.lastCrafting, null);
});

test('authority action routes quest reward claims through canonical state once', async () => {
  const { env, sessionId } = await createSession();
  const action = {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-claim-quest',
    idempotencyKey: 'idem-claim-quest',
    payload: { choiceId: 'community', questId: 'pat_watering' },
    playerId: 'local',
    sessionId,
    type: 'COMPLETE_QUEST',
  };

  const firstResponse = await worker.fetch(jsonRequest('/action', action), env);
  const first = await firstResponse.json();
  const retryResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    id: 'action-claim-quest-retry',
  }), env);
  const retry = await retryResponse.json();
  const reclaimResponse = await worker.fetch(jsonRequest('/action', {
    ...action,
    id: 'action-claim-quest-again',
    idempotencyKey: 'idem-claim-quest-again',
    payload: { choiceId: 'stewardship', questId: 'pat_watering' },
  }), env);
  const reclaim = await reclaimResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(first.ack.accepted, true);
  assert.equal(first.ack.actionType, 'COMPLETE_QUEST');
  assert.equal(await verifyServerAckSignature(first.ack, SECRET), true);
  assert.deepEqual(first.state.data.lastQuestReward, {
    choiceId: 'community',
    completedAt: null,
    itemTotals: { plant_matter: 5 },
    questId: 'pat_watering',
    rewards: [
      { amount: 5, id: 'plant_matter', type: 'item' },
      { amount: 10, id: 'neighbor_pat', type: 'reputation' },
      { amount: 3, id: 'neighbor_pat', type: 'reputation' },
    ],
  });
  assert.deepEqual(first.state.data.claimedQuests, { pat_watering: { choiceId: 'community' } });
  assert.equal(retry.duplicate, true);
  assert.equal(reclaimResponse.status, 422);
  assert.equal(reclaim.ack.rejection.code, 'QUEST_ALREADY_CLAIMED');

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 1);
});

test('authority rejects client-owned quest and festival reward payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const cases = [
    {
      code: 'CLIENT_REWARD_PAYLOAD',
      id: 'quest-fake-rewards',
      payload: {
        choiceId: 'community',
        questId: 'pat_watering',
        rewards: [{ amount: 99, id: 'legendary_trowel', type: 'item' }],
      },
      type: 'COMPLETE_QUEST',
    },
    {
      code: 'BAD_QUEST_ID',
      id: 'quest-unknown',
      payload: { questId: 'duplication_glitch' },
      type: 'COMPLETE_QUEST',
    },
    {
      code: 'BAD_QUEST_CHOICE',
      id: 'quest-bad-choice',
      payload: { choiceId: 'jackpot', questId: 'pat_watering' },
      type: 'COMPLETE_QUEST',
    },
    {
      code: 'BAD_FESTIVAL_ID',
      id: 'festival-unknown',
      payload: { festivalId: 'jackpot_festival' },
      type: 'FESTIVAL_START',
    },
    {
      code: 'NO_ACTIVE_FESTIVAL',
      id: 'festival-no-active',
      payload: { activityId: 'shade_building' },
      type: 'FESTIVAL_ACTIVITY',
    },
    {
      code: 'NO_ACTIVE_FESTIVAL',
      id: 'festival-end-idle',
      payload: {},
      type: 'FESTIVAL_END',
    },
  ];

  for (const [index, entry] of cases.entries()) {
    const response = await worker.fetch(jsonRequest('/action', {
      clientSeq: index + 1,
      expectedTick: 0,
      gameId: 'garden',
      id: `action-${entry.id}`,
      idempotencyKey: `idem-${entry.id}`,
      payload: entry.payload,
      playerId: 'local',
      sessionId,
      type: entry.type,
    }), env);
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.equal(body.ack.accepted, false);
    assert.equal(body.ack.rejection.code, entry.code);
    assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);
  }

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.deepEqual(session.state.data.claimedQuests, {});
  assert.equal(session.state.data.activeFestival, null);
});

test('authority action routes festival activity claims through canonical state once', async () => {
  const { env, sessionId } = await createSession();
  await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-festival-start',
    idempotencyKey: 'idem-festival-start',
    payload: { festivalId: 'growth_surge' },
    playerId: 'local',
    sessionId,
    type: 'FESTIVAL_START',
  }), env);

  const claimResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 1,
    gameId: 'garden',
    id: 'action-festival-activity',
    idempotencyKey: 'idem-festival-activity',
    payload: { activityId: 'shade_building', festivalId: 'growth_surge' },
    playerId: 'local',
    sessionId,
    type: 'FESTIVAL_ACTIVITY',
  }), env);
  const claim = await claimResponse.json();
  const reclaimResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 2,
    gameId: 'garden',
    id: 'action-festival-activity-again',
    idempotencyKey: 'idem-festival-activity-again',
    payload: { activityId: 'shade_building', festivalId: 'growth_surge' },
    playerId: 'local',
    sessionId,
    type: 'FESTIVAL_ACTIVITY',
  }), env);
  const reclaim = await reclaimResponse.json();

  assert.equal(claimResponse.status, 200);
  assert.deepEqual(claim.state.data.lastFestivalReward, {
    activityId: 'shade_building',
    festivalId: 'growth_surge',
    itemTotals: { festival_token: 1 },
    rewards: [{ amount: 1, id: 'festival_token', type: 'item' }],
  });
  assert.deepEqual(claim.state.data.activeFestival, {
    activitiesCompleted: ['shade_building'],
    id: 'growth_surge',
  });
  assert.equal(reclaimResponse.status, 422);
  assert.equal(reclaim.ack.rejection.code, 'ACTIVITY_ALREADY_CLAIMED');

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 2);
  assert.deepEqual(session.state.data.activeFestival.activitiesCompleted, ['shade_building']);
});

test('authority rejects malformed cooldown payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const response = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-cooldown',
    idempotencyKey: 'idem-bad-cooldown',
    payload: { key: '__proto__', until: -1 },
    playerId: 'local',
    sessionId,
    type: 'SET_COOLDOWN',
  }), env);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ack.accepted, false);
  assert.equal(body.ack.actionType, 'SET_COOLDOWN');
  assert.equal(body.ack.rejection.code, 'BAD_COOLDOWN_KEY');
  assert.equal(await verifyServerAckSignature(body.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.deepEqual(session.state.data.toolCooldowns, {});
});

test('authority rejects malformed or client-owned tool durability payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const trustedResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-trusted-tool-use',
    idempotencyKey: 'idem-trusted-tool-use',
    payload: { inventory: { slots: [] }, slotIndex: 0 },
    playerId: 'local',
    sessionId,
    type: 'USE_TOOL',
  }), env);
  const trusted = await trustedResponse.json();

  const notToolResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-not-tool',
    idempotencyKey: 'idem-not-tool',
    payload: { durabilityCost: 1, slotIndex: 2 },
    playerId: 'local',
    sessionId,
    type: 'USE_TOOL',
  }), env);
  const notTool = await notToolResponse.json();

  const mismatchResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-tool-mismatch',
    idempotencyKey: 'idem-tool-mismatch',
    payload: { durabilityCost: 1, itemId: 'pruning_shears', slotIndex: 0 },
    playerId: 'local',
    sessionId,
    type: 'USE_TOOL',
  }), env);
  const mismatch = await mismatchResponse.json();

  assert.equal(trustedResponse.status, 422);
  assert.equal(trusted.ack.accepted, false);
  assert.equal(trusted.ack.rejection.code, 'TRUSTED_INVENTORY_PAYLOAD');
  assert.equal(notToolResponse.status, 422);
  assert.equal(notTool.ack.accepted, false);
  assert.equal(notTool.ack.rejection.code, 'NOT_TOOL');
  assert.equal(mismatchResponse.status, 422);
  assert.equal(mismatch.ack.accepted, false);
  assert.equal(mismatch.ack.rejection.code, 'TOOL_MISMATCH');
  assert.equal(await verifyServerAckSignature(mismatch.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.inventory.slots[0].durability, 100);
});

test('authority rejects malformed or client-owned tool repair payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const trustedResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-trusted-tool-repair',
    idempotencyKey: 'idem-trusted-tool-repair',
    payload: { inventory: { slots: [] }, itemId: 'watering_can', slotIndex: 0 },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  }), env);
  const trusted = await trustedResponse.json();

  const clientTotalResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-client-repair-total',
    idempotencyKey: 'idem-client-repair-total',
    payload: { itemId: 'watering_can', restoredTo: 100, slotIndex: 0 },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  }), env);
  const clientTotal = await clientTotalResponse.json();

  const mismatchResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-repair-mismatch',
    idempotencyKey: 'idem-repair-mismatch',
    payload: { itemId: 'pruning_shears', slotIndex: 0 },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  }), env);
  const mismatch = await mismatchResponse.json();

  const badCostResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 4,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-repair-bad-cost',
    idempotencyKey: 'idem-repair-bad-cost',
    payload: {
      itemId: 'watering_can',
      materialsConsumed: [{ count: 1, itemId: 'plant_matter' }],
      slotIndex: 0,
    },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  }), env);
  const badCost = await badCostResponse.json();

  const notEnoughResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 5,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-repair-not-enough',
    idempotencyKey: 'idem-repair-not-enough',
    payload: {
      itemId: 'watering_can',
      materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
      slotIndex: 0,
    },
    playerId: 'local',
    sessionId,
    type: 'REPAIR_TOOL',
  }), env);
  const notEnough = await notEnoughResponse.json();

  assert.equal(trustedResponse.status, 422);
  assert.equal(trusted.ack.accepted, false);
  assert.equal(trusted.ack.rejection.code, 'TRUSTED_INVENTORY_PAYLOAD');
  assert.equal(clientTotalResponse.status, 422);
  assert.equal(clientTotal.ack.accepted, false);
  assert.equal(clientTotal.ack.rejection.code, 'CLIENT_REPAIR_TOTAL');
  assert.equal(mismatchResponse.status, 422);
  assert.equal(mismatch.ack.accepted, false);
  assert.equal(mismatch.ack.rejection.code, 'TOOL_MISMATCH');
  assert.equal(badCostResponse.status, 422);
  assert.equal(badCost.ack.accepted, false);
  assert.equal(badCost.ack.rejection.code, 'REPAIR_COST_MISMATCH');
  assert.equal(notEnoughResponse.status, 422);
  assert.equal(notEnough.ack.accepted, false);
  assert.equal(notEnough.ack.rejection.code, 'NOT_ENOUGH_ITEM');
  assert.equal(await verifyServerAckSignature(notEnough.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.inventory.slots[0].durability, 100);
});

test('authority rejects malformed or client-owned item removal payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const trustedResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-trusted-remove-item',
    idempotencyKey: 'idem-trusted-remove-item',
    payload: { inventory: { slots: [] }, itemId: 'pest_spray', count: 1 },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_ITEM',
  }), env);
  const trusted = await trustedResponse.json();

  const badCountResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-remove-count',
    idempotencyKey: 'idem-bad-remove-count',
    payload: { count: 0, itemId: 'pest_spray' },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_ITEM',
  }), env);
  const badCount = await badCountResponse.json();

  const notEnoughResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-not-enough-item',
    idempotencyKey: 'idem-not-enough-item',
    payload: { count: 99, itemId: 'pest_spray' },
    playerId: 'local',
    sessionId,
    type: 'REMOVE_ITEM',
  }), env);
  const notEnough = await notEnoughResponse.json();

  assert.equal(trustedResponse.status, 422);
  assert.equal(trusted.ack.accepted, false);
  assert.equal(trusted.ack.rejection.code, 'TRUSTED_INVENTORY_PAYLOAD');
  assert.equal(badCountResponse.status, 422);
  assert.equal(badCount.ack.accepted, false);
  assert.equal(badCount.ack.rejection.code, 'BAD_ITEM_COUNT');
  assert.equal(notEnoughResponse.status, 422);
  assert.equal(notEnough.ack.accepted, false);
  assert.equal(notEnough.ack.rejection.code, 'NOT_ENOUGH_ITEM');
  assert.equal(await verifyServerAckSignature(notEnough.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.inventory.slots[3].count, 3);
});

test('authority rejects malformed or client-owned item addition payloads before mutation', async () => {
  const { env, sessionId } = await createSession();
  const trustedResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 1,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-trusted-add-item',
    idempotencyKey: 'idem-trusted-add-item',
    payload: { inventory: { slots: [] }, itemId: 'plant_matter', count: 1 },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);
  const trusted = await trustedResponse.json();

  const badCountResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 2,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-add-count',
    idempotencyKey: 'idem-bad-add-count',
    payload: { count: 0, itemId: 'plant_matter' },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);
  const badCount = await badCountResponse.json();

  const badItemResponse = await worker.fetch(jsonRequest('/action', {
    clientSeq: 3,
    expectedTick: 0,
    gameId: 'garden',
    id: 'action-bad-add-item',
    idempotencyKey: 'idem-bad-add-item',
    payload: { count: 1, itemId: '__proto__' },
    playerId: 'local',
    sessionId,
    type: 'ADD_ITEM',
  }), env);
  const badItem = await badItemResponse.json();

  assert.equal(trustedResponse.status, 422);
  assert.equal(trusted.ack.accepted, false);
  assert.equal(trusted.ack.rejection.code, 'TRUSTED_INVENTORY_PAYLOAD');
  assert.equal(badCountResponse.status, 422);
  assert.equal(badCount.ack.accepted, false);
  assert.equal(badCount.ack.rejection.code, 'BAD_ITEM_COUNT');
  assert.equal(badItemResponse.status, 422);
  assert.equal(badItem.ack.accepted, false);
  assert.equal(badItem.ack.rejection.code, 'BAD_ITEM_ID');
  assert.equal(await verifyServerAckSignature(badItem.ack, SECRET), true);

  const sessionResponse = await worker.fetch(new Request(`https://authority.example.test/session/${sessionId}`), env);
  const session = await sessionResponse.json();
  assert.equal(session.state.tick, 0);
  assert.equal(session.state.data.inventory.slots[5], null);
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
