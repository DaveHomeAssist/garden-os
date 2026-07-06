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
