import { describe, expect, it } from 'vitest';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions } from '../game/store.js';
import { createAuthorityFetchHandler } from './authority-http.js';
import {
  createAuthorityService,
  createMemoryLedgerStore,
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
});
