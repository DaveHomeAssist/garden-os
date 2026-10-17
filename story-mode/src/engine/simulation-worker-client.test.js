import { describe, expect, it } from 'vitest';

import { createSimulationWorkerClient } from './simulation-worker-client.js';

function fakeWorker() {
  const posts = [];
  return { posts, postMessage: (m) => posts.push(m), terminate: () => {} };
}

describe('simulation worker client', () => {
  it('only posts ENABLED/INPUT when the value changes', () => {
    const worker = fakeWorker();
    const client = createSimulationWorkerClient({ workerFactory: () => worker });
    const base = worker.posts.length;
    for (let i = 0; i < 60; i += 1) {
      client.setEnabled(true);
      client.setInput(null);
    }
    expect(worker.posts.length - base).toBe(2);
    client.setInput({ x: 1, z: 0 });
    client.setInput({ x: 1, z: 0 });
    client.setInput({ x: 0, z: 0 });
    expect(worker.posts.slice(base + 2).map((m) => m.type)).toEqual(['INPUT', 'INPUT']);
  });

  it('pause/resume stop and restart the worker tick once each', () => {
    const worker = fakeWorker();
    const client = createSimulationWorkerClient({ workerFactory: () => worker });
    const base = worker.posts.length;
    client.pause();
    client.pause();
    expect(client.paused).toBe(true);
    client.resume();
    client.resume();
    expect(worker.posts.slice(base).map((m) => m.type)).toEqual(['STOP', 'START']);
  });
});
