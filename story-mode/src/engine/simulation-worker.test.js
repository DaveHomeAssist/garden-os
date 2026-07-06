import { describe, expect, it } from 'vitest';

import {
  FIXED_SIMULATION_DT,
  createSimulationState,
  replaySimulationFrames,
} from './simulation-core.js';
import { createSimulationWorkerRuntime } from './simulation-worker.js';

const CONFIG = {
  blockers: [],
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
};

function createFakeWorkerScope() {
  let listener = null;
  let nextTimerId = 1;
  const intervals = new Map();
  const posts = [];

  return {
    posts,
    addEventListener(type, callback) {
      if (type === 'message') listener = callback;
    },
    clearInterval(timerId) {
      intervals.delete(timerId);
    },
    postMessage(message) {
      posts.push(message);
    },
    send(message) {
      listener?.({ data: message });
    },
    setInterval(callback) {
      const timerId = nextTimerId;
      nextTimerId += 1;
      intervals.set(timerId, callback);
      return timerId;
    },
    tickIntervals(count = 1) {
      for (let index = 0; index < count; index += 1) {
        [...intervals.values()].forEach((callback) => callback());
      }
    },
  };
}

describe('fixed-step simulation worker', () => {
  it('emits the same 120-frame checksum as the core replay', () => {
    const scope = createFakeWorkerScope();
    createSimulationWorkerRuntime(scope);
    const initial = createSimulationState(CONFIG);

    scope.send({
      config: CONFIG,
      fixedDt: FIXED_SIMULATION_DT,
      state: initial,
      type: 'INIT',
    });
    scope.send({ input: { x: 1, z: 0 }, type: 'INPUT' });
    scope.send({ frames: 120, type: 'STEP' });

    const snapshot = scope.posts.at(-1);
    const expected = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 120,
      inputAtFrame: () => ({ x: 1, z: 0 }),
    });

    expect(snapshot.type).toBe('SIMULATION_SNAPSHOT');
    expect(snapshot.frame).toBe(120);
    expect(snapshot.checksum).toBe(expected.checksum);
  });

  it('runs a fixed interval tick while started and stops cleanly', () => {
    const scope = createFakeWorkerScope();
    createSimulationWorkerRuntime(scope);

    scope.send({
      config: CONFIG,
      state: createSimulationState(CONFIG),
      type: 'INIT',
    });
    scope.send({ input: { x: 0, z: -1 }, type: 'INPUT' });
    scope.send({ type: 'START' });
    scope.tickIntervals(3);
    scope.send({ type: 'STOP' });
    scope.tickIntervals(3);

    const snapshots = scope.posts.filter((message) => message.type === 'SIMULATION_SNAPSHOT');
    expect(snapshots.at(-1).frame).toBe(3);
    expect(snapshots.at(-1).state.position.z).toBeLessThan(2.55);
  });
});
