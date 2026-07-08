import { describe, expect, it } from 'vitest';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions } from '../game/store.js';
import { createAuthorityFetchHandler } from './authority-http.js';
import {
  createAuthorityService,
  createMemoryLedgerStore,
  createMemorySessionStore,
  createUpstashLedgerStore,
  createUpstashSessionStore,
  verifyAuthorityAckSignature,
} from './authority-service.js';

const NOW = Date.parse('2026-07-06T20:00:00.000Z');
const SECRET = 'test-hmac-secret';

function createHarness() {
  const ledgerStore = createMemoryLedgerStore();
  const service = createAuthorityService({
    ledgerStore,
    now: () => NOW,
    secret: SECRET,
    sessionIdFactory: () => 'session-http',
  });
  const handle = createAuthorityFetchHandler(service);
  return { handle, ledgerStore, service };
}

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

function envelope(overrides = {}) {
  return createActionEnvelope({
    clientSeq: 1,
    clientSentAt: '2026-07-06T20:00:00.000Z',
    expectedTick: 0,
    id: 'action-1',
    idempotencyKey: 'idem-1',
    payload: { cropId: 'basil' },
    sessionId: 'session-http',
    type: Actions.SET_SELECTED_CROP,
    ...overrides,
  });
}

describe('authority service', () => {
  it('creates server-owned sessions and rejects client-submitted state', async () => {
    const { handle } = createHarness();

    const blocked = await postJson(handle, '/api/session', {
      sessionId: 'bad-session',
      state: { selectedCropId: 'client-owned' },
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.rejection.code).toBe('TRUSTED_SESSION_PAYLOAD');

    const created = await postJson(handle, '/api/session', { sessionId: 'session-http' });
    expect(created.status).toBe(200);
    expect(created.body.session).toMatchObject({
      gameId: 'garden',
      sessionId: 'session-http',
      tick: 0,
    });
  });

  it('accepts an action envelope and returns a signed server ack', async () => {
    const { handle, ledgerStore } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope());

    expect(applied.status).toBe(200);
    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack).toMatchObject({
      accepted: true,
      actionId: 'action-1',
      actionType: Actions.SET_SELECTED_CROP,
      sessionId: 'session-http',
      tick: 1,
    });
    expect(applied.body.ack.signature).toMatch(/^hmac-sha256:/);
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(applied.body.ack.authoritativePatch.data.selectedCropId).toBe('basil');
    expect(ledgerStore.entries.map((entry) => entry.recordType)).toEqual(['session', 'action']);
    expect(ledgerStore.entries[1].signature).toBe(applied.body.ack.signature);
  });

  it('does not mutate twice for duplicate idempotency keys', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const first = await postJson(handle, '/api/action', envelope());
    const second = await postJson(handle, '/api/action', envelope({
      payload: { cropId: 'client-duplicate' },
    }));
    const state = service.sessions.get('session-http');

    expect(first.body.ack.accepted).toBe(true);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.session.tick).toBe(1);
    expect(state.data.selectedCropId).toBe('basil');
    expect(state.ledger.entries).toHaveLength(1);
    expect(second.body.ack.signature).toBe(first.body.ack.signature);
  });

  it('resumes an existing session without resetting authoritative state', async () => {
    const { handle, ledgerStore, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const first = await postJson(handle, '/api/action', envelope());
    const resumed = await postJson(handle, '/api/session', { sessionId: 'session-http' });
    const duplicate = await postJson(handle, '/api/action', envelope({
      payload: { cropId: 'client-reset-attempt' },
    }));
    const state = service.sessions.get('session-http');

    expect(first.body.ack.accepted).toBe(true);
    expect(resumed.status).toBe(200);
    expect(resumed.body.session).toMatchObject({
      checksum: first.body.ack.checksum,
      ledgerCursor: '1',
      sessionId: 'session-http',
      tick: 1,
    });
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(1);
    expect(state.data.selectedCropId).toBe('basil');
    expect(state.ledger.entries).toHaveLength(1);
    expect(ledgerStore.entries.map((entry) => entry.recordType)).toEqual(['session', 'action', 'action']);
    expect(ledgerStore.entries[2].duplicate).toBe(true);
  });

  it('routes plant crop gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.PLANT_CROP);
    expect(applied.body.ack.authoritativePatch.data.lastPlanting).toEqual({ cellIndex: 2, cropId: 'basil' });
    expect(applied.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: 'basil',
      damageState: null,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(state.data.grid[2].cropId).toBe('basil');
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes water cell gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-water',
      idempotencyKey: 'idem-water',
      payload: { bonus: 0.25, cellIndex: 2, wateredAt: NOW },
      type: Actions.WATER_CELL,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.WATER_CELL);
    expect(applied.body.ack.authoritativePatch.data.lastWatering).toEqual({
      bonus: 0.25,
      cellIndex: 2,
      interventionBonus: 0.25,
      wateredAt: NOW,
    });
    expect(applied.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: 'basil',
      interventionBonus: 0.25,
      lastWateredAt: NOW,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(state.data.grid[2].interventionBonus).toBe(0.25);
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('routes harvest cell gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-harvest',
      idempotencyKey: 'idem-harvest',
      payload: { cellIndex: 2, cropId: 'basil', harvestedAt: NOW },
      type: Actions.HARVEST_CELL,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-harvest-retry',
      idempotencyKey: 'idem-harvest',
      payload: { cellIndex: 2, cropId: 'radish', harvestedAt: NOW + 1 },
      type: Actions.HARVEST_CELL,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.HARVEST_CELL);
    expect(applied.body.ack.authoritativePatch.data.lastHarvesting).toEqual({
      cellIndex: 2,
      cropId: 'basil',
      harvestedAt: NOW,
      yieldCount: 1,
    });
    expect(applied.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: null,
      damageState: null,
      interventionBonus: 0,
      lastWateredAt: null,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(2);
    expect(state.data.grid[2].cropId).toBeNull();
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('routes remove crop gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-remove',
      idempotencyKey: 'idem-remove',
      payload: { cellIndex: 2, cropId: 'basil', removedAt: NOW },
      type: Actions.REMOVE_CROP,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-remove-retry',
      idempotencyKey: 'idem-remove',
      payload: { cellIndex: 2, cropId: 'radish', removedAt: NOW + 1 },
      type: Actions.REMOVE_CROP,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.REMOVE_CROP);
    expect(applied.body.ack.authoritativePatch.data.lastRemoval).toEqual({
      cellIndex: 2,
      cropId: 'basil',
      removedAt: NOW,
    });
    expect(applied.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: null,
      damageState: null,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(2);
    expect(state.data.grid[2].cropId).toBeNull();
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('routes protection gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-protect',
      idempotencyKey: 'idem-protect',
      payload: { cellIndex: 2, protected: true },
      type: Actions.SET_PROTECTION,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-protect-retry',
      idempotencyKey: 'idem-protect',
      payload: { cellIndex: 2, protected: false },
      type: Actions.SET_PROTECTION,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.SET_PROTECTION);
    expect(applied.body.ack.authoritativePatch.data.lastProtection).toEqual({
      cellIndex: 2,
      protected: true,
    });
    expect(applied.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: 'basil',
      protected: true,
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(2);
    expect(state.data.grid[2].protected).toBe(true);
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('routes cell condition gameplay actions through canonical grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const damaged = await postJson(handle, '/api/action', envelope({
      id: 'action-damage',
      idempotencyKey: 'idem-damage',
      payload: { cellIndex: 2, damageState: 'frost' },
      type: Actions.SET_DAMAGE,
    }));
    const soil = await postJson(handle, '/api/action', envelope({
      id: 'action-soil',
      idempotencyKey: 'idem-soil',
      payload: { cellIndex: 2, soilFatigue: 0.3 },
      type: Actions.UPDATE_SOIL,
    }));
    const carried = await postJson(handle, '/api/action', envelope({
      id: 'action-carry',
      idempotencyKey: 'idem-carry',
      payload: { carryForwardType: 'enriched', cellIndex: 2, mulched: true },
      type: Actions.CARRY_FORWARD,
    }));
    const state = service.sessions.get('session-http');

    expect(damaged.body.ok).toBe(true);
    expect(damaged.body.ack.actionType).toBe(Actions.SET_DAMAGE);
    expect(damaged.body.ack.authoritativePatch.data.lastDamage).toEqual({
      cellIndex: 2,
      damageState: 'frost',
    });
    expect(soil.body.ok).toBe(true);
    expect(soil.body.ack.actionType).toBe(Actions.UPDATE_SOIL);
    expect(soil.body.ack.authoritativePatch.data.lastSoil).toEqual({
      cellIndex: 2,
      soilFatigue: 0.3,
    });
    expect(carried.body.ok).toBe(true);
    expect(carried.body.ack.actionType).toBe(Actions.CARRY_FORWARD);
    expect(carried.body.ack.authoritativePatch.data.lastCarryForward).toEqual({
      carryForwardType: 'enriched',
      cellIndex: 2,
      mulched: true,
    });
    expect(carried.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      carryForwardType: 'enriched',
      damageState: 'frost',
      mulched: true,
      soilFatigue: 0.3,
    });
    expect(verifyAuthorityAckSignature(carried.body.ack, SECRET)).toBe(true);
    expect(state.data.grid[2]).toMatchObject({
      carryForwardType: 'enriched',
      damageState: 'frost',
      mulched: true,
      soilFatigue: 0.3,
    });
    expect(state.ledger.entries).toHaveLength(3);
  });

  it('rejects malformed cell condition payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const badDamage = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-damage',
      idempotencyKey: 'idem-bad-damage',
      payload: { cellIndex: 2, damageState: '' },
      type: Actions.SET_DAMAGE,
    }));
    const badSoil = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-soil',
      idempotencyKey: 'idem-bad-soil',
      payload: { cellIndex: 2, soilFatigue: 1.5 },
      type: Actions.UPDATE_SOIL,
    }));
    const badCarry = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-carry',
      idempotencyKey: 'idem-bad-carry',
      payload: { carryForwardType: 'enriched', cellIndex: 2, mulched: 'true' },
      type: Actions.CARRY_FORWARD,
    }));
    const state = service.sessions.get('session-http');

    expect(badDamage.body.ok).toBe(false);
    expect(badDamage.body.ack.rejection.code).toBe('BAD_DAMAGE_STATE');
    expect(badSoil.body.ok).toBe(false);
    expect(badSoil.body.ack.rejection.code).toBe('BAD_SOIL_FATIGUE');
    expect(badCarry.body.ok).toBe(false);
    expect(badCarry.body.ack.rejection.code).toBe('BAD_MULCHED_VALUE');
    expect(verifyAuthorityAckSignature(badCarry.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.grid[2]).toMatchObject({
      carryForwardType: null,
      damageState: null,
      mulched: false,
      soilFatigue: 0,
    });
  });

  it('rejects malformed plant crop payloads without changing grid state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-plant',
      idempotencyKey: 'idem-bad-plant',
      payload: { cellIndex: 99, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.actionType).toBe(Actions.PLANT_CROP);
    expect(blocked.body.ack.rejection.code).toBe('BAD_CELL_INDEX');
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.grid.every((cell) => cell.cropId === null)).toBe(true);
  });

  it('rejects water cell actions for empty cells before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-water',
      idempotencyKey: 'idem-bad-water',
      payload: { bonus: 0.25, cellIndex: 2, wateredAt: NOW },
      type: Actions.WATER_CELL,
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.actionType).toBe(Actions.WATER_CELL);
    expect(blocked.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.grid[2].interventionBonus).toBe(0);
  });

  it('rejects harvest cell actions for empty cells before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-harvest',
      idempotencyKey: 'idem-bad-harvest',
      payload: { cellIndex: 2, cropId: 'basil', harvestedAt: NOW },
      type: Actions.HARVEST_CELL,
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.actionType).toBe(Actions.HARVEST_CELL);
    expect(blocked.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.grid[2].cropId).toBeNull();
  });

  it('rejects remove crop actions for empty or mismatched cells before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const empty = await postJson(handle, '/api/action', envelope({
      id: 'action-empty-remove',
      idempotencyKey: 'idem-empty-remove',
      payload: { cellIndex: 2, cropId: 'basil', removedAt: NOW },
      type: Actions.REMOVE_CROP,
    }));
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));
    const mismatch = await postJson(handle, '/api/action', envelope({
      id: 'action-mismatch-remove',
      idempotencyKey: 'idem-mismatch-remove',
      payload: { cellIndex: 2, cropId: 'radish', removedAt: NOW },
      type: Actions.REMOVE_CROP,
    }));
    const state = service.sessions.get('session-http');

    expect(empty.body.ok).toBe(false);
    expect(empty.body.ack.actionType).toBe(Actions.REMOVE_CROP);
    expect(empty.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(mismatch.body.ok).toBe(false);
    expect(mismatch.body.ack.actionType).toBe(Actions.REMOVE_CROP);
    expect(mismatch.body.ack.rejection.code).toBe('CROP_MISMATCH');
    expect(verifyAuthorityAckSignature(mismatch.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(1);
    expect(state.data.grid[2].cropId).toBe('basil');
  });

  it('rejects protection actions for empty cells and malformed values before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const empty = await postJson(handle, '/api/action', envelope({
      id: 'action-empty-protect',
      idempotencyKey: 'idem-empty-protect',
      payload: { cellIndex: 2, protected: true },
      type: Actions.SET_PROTECTION,
    }));
    const malformed = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-protect',
      idempotencyKey: 'idem-bad-protect',
      payload: { cellIndex: 2, protected: 'true' },
      type: Actions.SET_PROTECTION,
    }));
    const state = service.sessions.get('session-http');

    expect(empty.body.ok).toBe(false);
    expect(empty.body.ack.actionType).toBe(Actions.SET_PROTECTION);
    expect(empty.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(malformed.body.ok).toBe(false);
    expect(malformed.body.ack.actionType).toBe(Actions.SET_PROTECTION);
    expect(malformed.body.ack.rejection.code).toBe('BAD_PROTECTION_VALUE');
    expect(verifyAuthorityAckSignature(malformed.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.grid[2].protected).toBe(false);
  });

  it('rejects client-submitted harvest totals before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-harvest-total',
      idempotencyKey: 'idem-bad-harvest-total',
      payload: { cellIndex: 2, cropId: 'basil', harvestedAt: NOW, yieldCount: 999 },
      type: Actions.HARVEST_CELL,
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.actionType).toBe(Actions.HARVEST_CELL);
    expect(blocked.body.ack.rejection.code).toBe('CLIENT_HARVEST_TOTAL');
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(1);
    expect(state.data.grid[2].cropId).toBe('basil');
  });

  it('persists session state through an injected session store across service instances', async () => {
    const ledgerStore = createMemoryLedgerStore();
    const sessionStore = createMemorySessionStore();
    const firstService = createAuthorityService({
      ledgerStore,
      now: () => NOW,
      secret: SECRET,
      sessionIdFactory: () => 'session-http',
      sessionStore,
    });
    const secondService = createAuthorityService({
      ledgerStore,
      now: () => NOW,
      secret: SECRET,
      sessionStore,
    });
    const firstHandle = createAuthorityFetchHandler(firstService);
    const secondHandle = createAuthorityFetchHandler(secondService);

    await postJson(firstHandle, '/api/session', { sessionId: 'session-http' });
    const first = await postJson(firstHandle, '/api/action', envelope());
    const second = await postJson(secondHandle, '/api/action', envelope({
      payload: { cropId: 'client-duplicate' },
    }));
    const state = await sessionStore.get('session-http');

    expect(second.body.duplicate).toBe(true);
    expect(second.body.session.tick).toBe(1);
    expect(state.data.selectedCropId).toBe('basil');
    expect(state.ledger.entries).toHaveLength(1);
    expect(second.body.ack.signature).toBe(first.body.ack.signature);
  });

  it('rejects trusted full-state and resource totals in action payloads', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      payload: { resourceTotals: { coins: 999 }, state: { selectedCropId: 'client-owned' } },
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.rejection.code).toBe('TRUSTED_STATE_PAYLOAD');
    expect(blocked.body.ack.signature).toMatch(/^hmac-sha256:/);
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.selectedCropId).toBeNull();
  });

  it('rejects unsupported action types without changing session state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-unsupported',
      idempotencyKey: 'idem-unsupported',
      payload: { cropId: 'basil' },
      type: Actions.FORAGE,
    }));

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.rejection.code).toBe('UNSUPPORTED_ACTION_TYPE');
    expect(service.sessions.get('session-http').tick).toBe(0);
  });

  it('verifies signed acks and rejects tampered signatures', async () => {
    const { handle } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    const applied = await postJson(handle, '/api/action', envelope());

    const verified = await postJson(handle, '/api/ack/verify', { ack: applied.body.ack });
    expect(verified.status).toBe(200);
    expect(verified.body.verified).toBe(true);

    const tampered = await postJson(handle, '/api/ack/verify', {
      ack: {
        ...applied.body.ack,
        authoritativePatch: { data: { selectedCropId: 'tampered' } },
      },
    });
    expect(tampered.status).toBe(422);
    expect(tampered.body.verified).toBe(false);
  });

  it('routes zone changes through the authoritative session ledger', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-zone',
      idempotencyKey: 'idem-zone',
      payload: { spawnPoint: { x: -6, z: 0 }, toZone: 'meadow' },
      type: Actions.ZONE_CHANGED,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.ZONE_CHANGED);
    expect(applied.body.ack.authoritativePatch.data.currentZone).toBe('meadow');
    expect(applied.body.ack.authoritativePatch.data.visitedZones).toEqual(['player_plot', 'meadow']);
    expect(state.data.currentZone).toBe('meadow');
    expect(state.data.lastSpawnPoint).toEqual({ x: -6, z: 0 });
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes tool cooldowns through the authoritative session ledger', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-cooldown',
      idempotencyKey: 'idem-cooldown',
      payload: {
        cellIndex: 2,
        key: 'water_2',
        toolId: 'water',
        until: NOW + 5_000,
      },
      type: Actions.SET_COOLDOWN,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.SET_COOLDOWN);
    expect(applied.body.ack.authoritativePatch.data.lastCooldown).toEqual({
      cellIndex: 2,
      key: 'water_2',
      toolId: 'water',
      until: NOW + 5_000,
    });
    expect(applied.body.ack.authoritativePatch.data.toolCooldowns.water_2).toBe(NOW + 5_000);
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(state.data.toolCooldowns.water_2).toBe(NOW + 5_000);
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes tool durability through canonical inventory state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-tool-use',
      idempotencyKey: 'idem-tool-use',
      payload: {
        durabilityCost: 5,
        itemId: 'watering_can',
        slotIndex: 0,
      },
      type: Actions.USE_TOOL,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-tool-use-retry',
      idempotencyKey: 'idem-tool-use',
      payload: {
        durabilityCost: 50,
        itemId: 'watering_can',
        slotIndex: 0,
      },
      type: Actions.USE_TOOL,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.USE_TOOL);
    expect(applied.body.ack.authoritativePatch.data.lastToolUse).toEqual({
      durability: 95,
      durabilityCost: 5,
      itemId: 'watering_can',
      slotIndex: 0,
    });
    expect(applied.body.ack.authoritativePatch.data.inventory.slots[0]).toMatchObject({
      durability: 95,
      itemId: 'watering_can',
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(1);
    expect(state.data.inventory.slots[0].durability).toBe(95);
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes consumable item removal through canonical inventory state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-remove-item',
      idempotencyKey: 'idem-remove-item',
      payload: {
        count: 1,
        itemId: 'pest_spray',
      },
      type: Actions.REMOVE_ITEM,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-remove-item-retry',
      idempotencyKey: 'idem-remove-item',
      payload: {
        count: 2,
        itemId: 'pest_spray',
      },
      type: Actions.REMOVE_ITEM,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.REMOVE_ITEM);
    expect(applied.body.ack.authoritativePatch.data.lastItemRemoval).toEqual({
      count: 1,
      itemId: 'pest_spray',
      remainingCount: 2,
    });
    expect(applied.body.ack.authoritativePatch.data.inventory.slots[3]).toMatchObject({
      count: 2,
      itemId: 'pest_spray',
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(1);
    expect(state.data.inventory.slots[3].count).toBe(2);
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes item additions through canonical inventory state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const applied = await postJson(handle, '/api/action', envelope({
      id: 'action-add-item',
      idempotencyKey: 'idem-add-item',
      payload: {
        count: 2,
        itemId: 'plant_matter',
      },
      type: Actions.ADD_ITEM,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      id: 'action-add-item-retry',
      idempotencyKey: 'idem-add-item',
      payload: {
        count: 20,
        itemId: 'plant_matter',
      },
      type: Actions.ADD_ITEM,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.ADD_ITEM);
    expect(applied.body.ack.authoritativePatch.data.lastItemAddition).toEqual({
      addedCount: 2,
      count: 2,
      itemId: 'plant_matter',
      slotIndex: 5,
      totalCount: 2,
    });
    expect(applied.body.ack.authoritativePatch.data.inventory.slots[5]).toMatchObject({
      count: 2,
      itemId: 'plant_matter',
    });
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(1);
    expect(state.data.inventory.slots[5]).toMatchObject({
      count: 2,
      itemId: 'plant_matter',
    });
    expect(state.ledger.entries).toHaveLength(1);
  });

  it('routes tool repairs through canonical inventory once', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-add-repair-material',
      idempotencyKey: 'idem-add-repair-material',
      payload: {
        count: 2,
        itemId: 'plant_matter',
      },
      type: Actions.ADD_ITEM,
    }));
    await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-damage-tool',
      idempotencyKey: 'idem-damage-tool',
      payload: {
        durabilityCost: 40,
        itemId: 'watering_can',
        slotIndex: 0,
      },
      type: Actions.USE_TOOL,
    }));

    const applied = await postJson(handle, '/api/action', envelope({
      expectedTick: 2,
      id: 'action-repair-tool',
      idempotencyKey: 'idem-repair-tool',
      payload: {
        itemId: 'watering_can',
        materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
        slotIndex: 0,
      },
      type: Actions.REPAIR_TOOL,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      expectedTick: 2,
      id: 'action-repair-tool-retry',
      idempotencyKey: 'idem-repair-tool',
      payload: {
        itemId: 'watering_can',
        materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
        slotIndex: 0,
      },
      type: Actions.REPAIR_TOOL,
    }));
    const state = service.sessions.get('session-http');

    expect(applied.body.ok).toBe(true);
    expect(applied.body.ack.actionType).toBe(Actions.REPAIR_TOOL);
    expect(applied.body.ack.authoritativePatch.data.lastToolRepair).toEqual({
      durability: 100,
      itemId: 'watering_can',
      materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
      maxDurability: 100,
      remainingMaterials: { plant_matter: 0 },
      slotIndex: 0,
    });
    expect(applied.body.ack.authoritativePatch.data.inventory.slots[0]).toMatchObject({
      durability: 100,
      itemId: 'watering_can',
      maxDurability: 100,
    });
    expect(applied.body.ack.authoritativePatch.data.inventory.slots[5]).toBeNull();
    expect(verifyAuthorityAckSignature(applied.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(3);
    expect(state.data.inventory.slots[0].durability).toBe(100);
    expect(state.data.inventory.slots[5]).toBeNull();
    expect(state.ledger.entries).toHaveLength(3);
  });

  it('routes protect and mulch interventions through one canonical transaction', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const protectedCell = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-protect-intervention',
      idempotencyKey: 'idem-protect-intervention',
      payload: {
        appliedAt: NOW,
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        itemCount: 1,
        itemId: 'pest_spray',
        protected: true,
        toolId: 'protect',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-protect-intervention-retry',
      idempotencyKey: 'idem-protect-intervention',
      payload: {
        appliedAt: NOW,
        cellIndex: 2,
        cooldownUntil: NOW + 60_000,
        itemCount: 3,
        itemId: 'pest_spray',
        protected: true,
        toolId: 'protect',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const mulchedCell = await postJson(handle, '/api/action', envelope({
      expectedTick: 2,
      id: 'action-mulch-intervention',
      idempotencyKey: 'idem-mulch-intervention',
      payload: {
        appliedAt: NOW + 1,
        bonus: 0.2,
        carryForwardType: 'enriched',
        cellIndex: 3,
        cooldownUntil: NOW + 45_000,
        itemCount: 1,
        itemId: 'mulch_bag',
        mulched: true,
        toolId: 'mulch',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const state = service.sessions.get('session-http');

    expect(protectedCell.body.ok).toBe(true);
    expect(protectedCell.body.ack.actionType).toBe(Actions.APPLY_TOOL_INTERVENTION);
    expect(protectedCell.body.ack.authoritativePatch.data.lastToolIntervention).toMatchObject({
      appliedAt: NOW,
      cellIndex: 2,
      cooldown: { cellIndex: 2, key: 'protect_2', toolId: 'protect', until: NOW + 30_000 },
      itemCount: 1,
      itemId: 'pest_spray',
      protected: true,
      remainingCount: 2,
      toolId: 'protect',
    });
    expect(verifyAuthorityAckSignature(protectedCell.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(2);
    expect(mulchedCell.body.ok).toBe(true);
    expect(mulchedCell.body.ack.authoritativePatch.data.lastToolIntervention).toMatchObject({
      appliedAt: NOW + 1,
      bonus: 0.2,
      carryForwardType: 'enriched',
      cellIndex: 3,
      cooldown: { cellIndex: 3, key: 'mulch_3', toolId: 'mulch', until: NOW + 45_000 },
      interventionBonus: 0.2,
      itemCount: 1,
      itemId: 'mulch_bag',
      mulched: true,
      remainingCount: 2,
      toolId: 'mulch',
    });
    expect(state.data.grid[2].protected).toBe(true);
    expect(state.data.grid[3].mulched).toBe(true);
    expect(state.data.grid[3].carryForwardType).toBe('enriched');
    expect(state.data.grid[3].interventionBonus).toBe(0.2);
    expect(state.data.inventory.slots[3].count).toBe(2);
    expect(state.data.inventory.slots[4].count).toBe(2);
    expect(state.data.toolCooldowns.protect_2).toBe(NOW + 30_000);
    expect(state.data.toolCooldowns.mulch_3).toBe(NOW + 45_000);
    expect(state.ledger.entries).toHaveLength(3);
  });

  it('routes water interventions with cooldown through one canonical transaction', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));

    const wateredCell = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-water-intervention',
      idempotencyKey: 'idem-water-intervention',
      payload: {
        appliedAt: NOW,
        bonus: 0.25,
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        toolId: 'water',
        toolDurabilityCost: 1,
        toolItemId: 'watering_can',
        toolSlotIndex: 0,
        wateredAt: NOW,
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const duplicate = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-water-intervention-retry',
      idempotencyKey: 'idem-water-intervention',
      payload: {
        appliedAt: NOW + 1,
        bonus: 1,
        cellIndex: 2,
        cooldownUntil: NOW + 60_000,
        toolId: 'water',
        toolDurabilityCost: 50,
        toolItemId: 'watering_can',
        toolSlotIndex: 0,
        wateredAt: NOW + 1,
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const state = service.sessions.get('session-http');

    expect(wateredCell.body.ok).toBe(true);
    expect(wateredCell.body.ack.actionType).toBe(Actions.APPLY_TOOL_INTERVENTION);
    expect(wateredCell.body.ack.authoritativePatch.data.lastToolIntervention).toMatchObject({
      appliedAt: NOW,
      bonus: 0.25,
      cellIndex: 2,
      cooldown: { cellIndex: 2, key: 'water_2', toolId: 'water', until: NOW + 30_000 },
      interventionBonus: 0.25,
      itemCount: 0,
      itemId: null,
      remainingCount: null,
      toolDurability: 99,
      toolDurabilityCost: 1,
      toolId: 'water',
      toolItemId: 'watering_can',
      toolSlotIndex: 0,
      wateredAt: NOW,
    });
    expect(wateredCell.body.ack.authoritativePatch.data.grid[2]).toMatchObject({
      cropId: 'basil',
      interventionBonus: 0.25,
      lastWateredAt: NOW,
    });
    expect(verifyAuthorityAckSignature(wateredCell.body.ack, SECRET)).toBe(true);
    expect(duplicate.body.duplicate).toBe(true);
    expect(duplicate.body.session.tick).toBe(2);
    expect(state.data.grid[2].interventionBonus).toBe(0.25);
    expect(state.data.grid[2].lastWateredAt).toBe(NOW);
    expect(state.data.toolCooldowns.water_2).toBe(NOW + 30_000);
    expect(state.data.inventory.slots[0].itemId).toBe('watering_can');
    expect(state.data.inventory.slots[0].durability).toBe(99);
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('rejects malformed or client-owned tool intervention payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const emptyProtect = await postJson(handle, '/api/action', envelope({
      id: 'action-empty-protect-intervention',
      idempotencyKey: 'idem-empty-protect-intervention',
      payload: {
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        itemId: 'pest_spray',
        protected: true,
        toolId: 'protect',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const emptyWater = await postJson(handle, '/api/action', envelope({
      id: 'action-empty-water-intervention',
      idempotencyKey: 'idem-empty-water-intervention',
      payload: {
        cellIndex: 3,
        cooldownUntil: NOW + 30_000,
        toolId: 'water',
        wateredAt: NOW,
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    await postJson(handle, '/api/action', envelope({
      id: 'action-plant',
      idempotencyKey: 'idem-plant',
      payload: { cellIndex: 2, cropId: 'basil' },
      type: Actions.PLANT_CROP,
    }));
    const trustedTotal = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-trusted-intervention-total',
      idempotencyKey: 'idem-trusted-intervention-total',
      payload: {
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        interventionBonus: 99,
        itemId: 'pest_spray',
        protected: true,
        toolId: 'protect',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const badWateredAt = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-bad-watered-at',
      idempotencyKey: 'idem-bad-watered-at',
      payload: {
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        toolId: 'water',
        wateredAt: 'bad-timestamp',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const toolMismatch = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-water-tool-mismatch',
      idempotencyKey: 'idem-water-tool-mismatch',
      payload: {
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        toolId: 'water',
        toolItemId: 'pruning_shears',
        toolSlotIndex: 0,
        wateredAt: NOW,
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const wrongItem = await postJson(handle, '/api/action', envelope({
      expectedTick: 1,
      id: 'action-wrong-intervention-item',
      idempotencyKey: 'idem-wrong-intervention-item',
      payload: {
        cellIndex: 2,
        cooldownUntil: NOW + 30_000,
        itemId: 'mulch_bag',
        protected: true,
        toolId: 'protect',
      },
      type: Actions.APPLY_TOOL_INTERVENTION,
    }));
    const state = service.sessions.get('session-http');

    expect(emptyProtect.body.ok).toBe(false);
    expect(emptyProtect.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(emptyWater.body.ok).toBe(false);
    expect(emptyWater.body.ack.rejection.code).toBe('CELL_EMPTY');
    expect(trustedTotal.body.ok).toBe(false);
    expect(trustedTotal.body.ack.rejection.code).toBe('CLIENT_INTERVENTION_TOTAL');
    expect(badWateredAt.body.ok).toBe(false);
    expect(badWateredAt.body.ack.rejection.code).toBe('BAD_WATERED_AT');
    expect(toolMismatch.body.ok).toBe(false);
    expect(toolMismatch.body.ack.rejection.code).toBe('TOOL_MISMATCH');
    expect(wrongItem.body.ok).toBe(false);
    expect(wrongItem.body.ack.rejection.code).toBe('ITEM_MISMATCH');
    expect(verifyAuthorityAckSignature(wrongItem.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(1);
    expect(state.data.grid[2].protected).toBe(false);
    expect(state.data.inventory.slots[3].count).toBe(3);
  });

  it('rejects malformed cooldown payloads without changing session state', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const blocked = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-cooldown',
      idempotencyKey: 'idem-bad-cooldown',
      payload: { key: '__proto__', until: -1 },
      type: Actions.SET_COOLDOWN,
    }));
    const state = service.sessions.get('session-http');

    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.ack.accepted).toBe(false);
    expect(blocked.body.ack.actionType).toBe(Actions.SET_COOLDOWN);
    expect(blocked.body.ack.rejection.code).toBe('BAD_COOLDOWN_KEY');
    expect(verifyAuthorityAckSignature(blocked.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.toolCooldowns).toEqual({});
  });

  it('rejects malformed or client-owned tool durability payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const trustedInventory = await postJson(handle, '/api/action', envelope({
      id: 'action-trusted-tool-use',
      idempotencyKey: 'idem-trusted-tool-use',
      payload: { inventory: { slots: [] }, slotIndex: 0 },
      type: Actions.USE_TOOL,
    }));
    const notTool = await postJson(handle, '/api/action', envelope({
      id: 'action-not-tool',
      idempotencyKey: 'idem-not-tool',
      payload: { durabilityCost: 1, slotIndex: 2 },
      type: Actions.USE_TOOL,
    }));
    const mismatch = await postJson(handle, '/api/action', envelope({
      id: 'action-tool-mismatch',
      idempotencyKey: 'idem-tool-mismatch',
      payload: { durabilityCost: 1, itemId: 'pruning_shears', slotIndex: 0 },
      type: Actions.USE_TOOL,
    }));
    const state = service.sessions.get('session-http');

    expect(trustedInventory.body.ok).toBe(false);
    expect(trustedInventory.body.ack.rejection.code).toBe('TRUSTED_INVENTORY_PAYLOAD');
    expect(notTool.body.ok).toBe(false);
    expect(notTool.body.ack.rejection.code).toBe('NOT_TOOL');
    expect(mismatch.body.ok).toBe(false);
    expect(mismatch.body.ack.rejection.code).toBe('TOOL_MISMATCH');
    expect(verifyAuthorityAckSignature(mismatch.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.inventory.slots[0].durability).toBe(100);
  });

  it('rejects malformed or client-owned tool repair payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const trustedInventory = await postJson(handle, '/api/action', envelope({
      id: 'action-trusted-tool-repair',
      idempotencyKey: 'idem-trusted-tool-repair',
      payload: { inventory: { slots: [] }, itemId: 'watering_can', slotIndex: 0 },
      type: Actions.REPAIR_TOOL,
    }));
    const clientTotal = await postJson(handle, '/api/action', envelope({
      id: 'action-client-repair-total',
      idempotencyKey: 'idem-client-repair-total',
      payload: { itemId: 'watering_can', restoredTo: 100, slotIndex: 0 },
      type: Actions.REPAIR_TOOL,
    }));
    const notTool = await postJson(handle, '/api/action', envelope({
      id: 'action-repair-not-tool',
      idempotencyKey: 'idem-repair-not-tool',
      payload: { slotIndex: 2 },
      type: Actions.REPAIR_TOOL,
    }));
    const mismatch = await postJson(handle, '/api/action', envelope({
      id: 'action-repair-mismatch',
      idempotencyKey: 'idem-repair-mismatch',
      payload: { itemId: 'pruning_shears', slotIndex: 0 },
      type: Actions.REPAIR_TOOL,
    }));
    const badCost = await postJson(handle, '/api/action', envelope({
      id: 'action-repair-bad-cost',
      idempotencyKey: 'idem-repair-bad-cost',
      payload: {
        itemId: 'watering_can',
        materialsConsumed: [{ count: 1, itemId: 'plant_matter' }],
        slotIndex: 0,
      },
      type: Actions.REPAIR_TOOL,
    }));
    const notEnough = await postJson(handle, '/api/action', envelope({
      id: 'action-repair-not-enough',
      idempotencyKey: 'idem-repair-not-enough',
      payload: {
        itemId: 'watering_can',
        materialsConsumed: [{ count: 2, itemId: 'plant_matter' }],
        slotIndex: 0,
      },
      type: Actions.REPAIR_TOOL,
    }));
    const state = service.sessions.get('session-http');

    expect(trustedInventory.body.ok).toBe(false);
    expect(trustedInventory.body.ack.rejection.code).toBe('TRUSTED_INVENTORY_PAYLOAD');
    expect(clientTotal.body.ok).toBe(false);
    expect(clientTotal.body.ack.rejection.code).toBe('CLIENT_REPAIR_TOTAL');
    expect(notTool.body.ok).toBe(false);
    expect(notTool.body.ack.rejection.code).toBe('NOT_TOOL');
    expect(mismatch.body.ok).toBe(false);
    expect(mismatch.body.ack.rejection.code).toBe('TOOL_MISMATCH');
    expect(badCost.body.ok).toBe(false);
    expect(badCost.body.ack.rejection.code).toBe('REPAIR_COST_MISMATCH');
    expect(notEnough.body.ok).toBe(false);
    expect(notEnough.body.ack.rejection.code).toBe('NOT_ENOUGH_ITEM');
    expect(verifyAuthorityAckSignature(notEnough.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.inventory.slots[0].durability).toBe(100);
  });

  it('rejects malformed or client-owned item removal payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const trustedInventory = await postJson(handle, '/api/action', envelope({
      id: 'action-trusted-remove-item',
      idempotencyKey: 'idem-trusted-remove-item',
      payload: { inventory: { slots: [] }, itemId: 'pest_spray', count: 1 },
      type: Actions.REMOVE_ITEM,
    }));
    const badCount = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-remove-count',
      idempotencyKey: 'idem-bad-remove-count',
      payload: { count: 0, itemId: 'pest_spray' },
      type: Actions.REMOVE_ITEM,
    }));
    const notEnough = await postJson(handle, '/api/action', envelope({
      id: 'action-not-enough-item',
      idempotencyKey: 'idem-not-enough-item',
      payload: { count: 99, itemId: 'pest_spray' },
      type: Actions.REMOVE_ITEM,
    }));
    const state = service.sessions.get('session-http');

    expect(trustedInventory.body.ok).toBe(false);
    expect(trustedInventory.body.ack.rejection.code).toBe('TRUSTED_INVENTORY_PAYLOAD');
    expect(badCount.body.ok).toBe(false);
    expect(badCount.body.ack.rejection.code).toBe('BAD_ITEM_COUNT');
    expect(notEnough.body.ok).toBe(false);
    expect(notEnough.body.ack.rejection.code).toBe('NOT_ENOUGH_ITEM');
    expect(verifyAuthorityAckSignature(notEnough.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.inventory.slots[3].count).toBe(3);
  });

  it('rejects malformed or client-owned item addition payloads before mutation', async () => {
    const { handle, service } = createHarness();
    await postJson(handle, '/api/session', { sessionId: 'session-http' });

    const trustedInventory = await postJson(handle, '/api/action', envelope({
      id: 'action-trusted-add-item',
      idempotencyKey: 'idem-trusted-add-item',
      payload: { inventory: { slots: [] }, itemId: 'plant_matter', count: 1 },
      type: Actions.ADD_ITEM,
    }));
    const badCount = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-add-count',
      idempotencyKey: 'idem-bad-add-count',
      payload: { count: 0, itemId: 'plant_matter' },
      type: Actions.ADD_ITEM,
    }));
    const badItem = await postJson(handle, '/api/action', envelope({
      id: 'action-bad-add-item',
      idempotencyKey: 'idem-bad-add-item',
      payload: { count: 1, itemId: '__proto__' },
      type: Actions.ADD_ITEM,
    }));
    const state = service.sessions.get('session-http');

    expect(trustedInventory.body.ok).toBe(false);
    expect(trustedInventory.body.ack.rejection.code).toBe('TRUSTED_INVENTORY_PAYLOAD');
    expect(badCount.body.ok).toBe(false);
    expect(badCount.body.ack.rejection.code).toBe('BAD_ITEM_COUNT');
    expect(badItem.body.ok).toBe(false);
    expect(badItem.body.ack.rejection.code).toBe('BAD_ITEM_ID');
    expect(verifyAuthorityAckSignature(badItem.body.ack, SECRET)).toBe(true);
    expect(state.tick).toBe(0);
    expect(state.data.inventory.slots[5]).toBeNull();
  });

  it('stores sessions and ledger entries through Upstash Redis REST commands', async () => {
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
    const config = {
      fetchFn,
      keyPrefix: 'test:authority',
      token: 'redis-token',
      url: 'https://redis.example.test/',
    };
    const sessionStore = createUpstashSessionStore(config);
    const ledgerStore = createUpstashLedgerStore(config);

    await sessionStore.set({
      checksum: 'checksum-1',
      data: { activeTool: 'hand', selectedCropId: 'basil' },
      gameId: 'garden',
      ledger: { acks: {}, cursor: '0', entries: [] },
      sessionId: 'session-http',
      tick: 1,
      version: 1,
    });
    const stored = await sessionStore.get('session-http');
    await ledgerStore.append({ recordType: 'action', sessionId: 'session-http' });

    expect(stored.data.selectedCropId).toBe('basil');
    expect(calls.map((call) => call.command[0])).toEqual(['SET', 'GET', 'RPUSH', 'RPUSH']);
    expect(calls[0]).toMatchObject({
      headers: {
        Authorization: 'Bearer redis-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      url: 'https://redis.example.test',
    });
    expect(calls[0].command[1]).toBe('test:authority:session:session-http');
    expect(calls[2].command[1]).toBe('test:authority:ledger');
    expect(calls[3].command[1]).toBe('test:authority:ledger:session-http');
  });
});
