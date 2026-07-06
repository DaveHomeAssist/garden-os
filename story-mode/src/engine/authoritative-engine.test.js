import { describe, expect, it } from 'vitest';

import { Actions, gameReducer } from '../game/store.js';
import { createGameState } from '../game/state.js';
import {
  applyAuthoritativeAction,
  checksumState,
  createActionEnvelope,
  createEngineState,
  replayActionLedger,
  stableStringify,
  validateActionEnvelope,
} from './authoritative-engine.js';

const NOW = '2026-07-06T14:00:00.000Z';

function counterReducer(data, payload) {
  return {
    ...data,
    count: (data.count ?? 0) + (payload.amount ?? 1),
  };
}

describe('authoritative engine core', () => {
  it('uses stable checksums independent of object key order', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
    expect(checksumState(createEngineState({ data: { b: 2, a: 1 }, now: NOW }))).toBe(
      checksumState(createEngineState({ data: { a: 1, b: 2 }, now: NOW })),
    );
  });

  it('applies idempotent actions once', () => {
    const state = createEngineState({ data: { count: 0 }, now: NOW });
    const envelope = createActionEnvelope({
      clientSeq: 1,
      clientSentAt: NOW,
      expectedTick: 0,
      id: 'action-1',
      idempotencyKey: 'idem-1',
      payload: { amount: 2 },
      type: 'INCREMENT',
    });

    const first = applyAuthoritativeAction(state, envelope, { INCREMENT: counterReducer }, { now: NOW });
    const second = applyAuthoritativeAction(first.state, envelope, { INCREMENT: counterReducer }, { now: NOW });

    expect(first.ack.accepted).toBe(true);
    expect(first.ack.actionType).toBe('INCREMENT');
    expect(second.duplicate).toBe(true);
    expect(second.state.data.count).toBe(2);
    expect(second.ack).toEqual(first.ack);
  });

  it('rejects trusted full-state payloads before the reducer', () => {
    const state = createEngineState({ data: { count: 0 }, now: NOW });
    const envelope = createActionEnvelope({
      clientSeq: 1,
      clientSentAt: NOW,
      expectedTick: 0,
      id: 'action-2',
      payload: { resourceTotals: { coins: 999 }, state: { count: 999 } },
      type: 'INCREMENT',
    });
    const result = applyAuthoritativeAction(state, envelope, { INCREMENT: counterReducer }, { now: NOW });

    expect(result.ack.accepted).toBe(false);
    expect(result.ack.rejection.code).toBe('TRUSTED_STATE_PAYLOAD');
    expect(result.state.data.count).toBe(0);
  });

  it('rejects actions outside the prediction window', () => {
    const state = createEngineState({ now: NOW });
    const envelope = createActionEnvelope({
      clientSeq: 1,
      clientSentAt: NOW,
      expectedTick: 99,
      id: 'action-3',
      payload: {},
      type: 'NOOP',
    });

    const errors = validateActionEnvelope(envelope, state);

    expect(errors.map((error) => error.code)).toContain('TICK_OUT_OF_WINDOW');
  });

  it('replays the same ledger to the same checksum', () => {
    const envelopes = [
      createActionEnvelope({
        clientSeq: 1,
        clientSentAt: NOW,
        expectedTick: 0,
        id: 'action-4',
        payload: { amount: 3 },
        type: 'INCREMENT',
      }),
      createActionEnvelope({
        clientSeq: 2,
        clientSentAt: NOW,
        expectedTick: 1,
        id: 'action-5',
        payload: { amount: 4 },
        type: 'INCREMENT',
      }),
    ];
    const left = replayActionLedger(
      createEngineState({ data: { count: 0 }, now: NOW }),
      envelopes,
      { INCREMENT: counterReducer },
      { now: NOW },
    );
    const right = replayActionLedger(
      createEngineState({ data: { count: 0 }, now: NOW }),
      envelopes,
      { INCREMENT: counterReducer },
      { now: NOW },
    );

    expect(left.state.data.count).toBe(7);
    expect(left.state.checksum).toBe(right.state.checksum);
  });

  it('can wrap the existing Story Mode reducer without changing reducer code', () => {
    const state = createEngineState({
      data: createGameState(),
      now: NOW,
      sessionId: 'story-session',
    });
    const envelope = createActionEnvelope({
      clientSeq: 1,
      clientSentAt: NOW,
      expectedTick: 0,
      id: 'action-6',
      payload: { cropId: 'basil' },
      sessionId: 'story-session',
      type: Actions.SET_SELECTED_CROP,
    });

    const result = applyAuthoritativeAction(
      state,
      envelope,
      (data, payload, action) => gameReducer(data, { type: action.type, payload }),
      { now: NOW },
    );

    expect(result.ack.accepted).toBe(true);
    expect(result.state.data.selectedCropId).toBe('basil');
    expect(result.state.ledger.entries).toHaveLength(1);
  });
});
