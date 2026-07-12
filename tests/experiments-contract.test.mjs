import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

function loadApi(seed) {
  globalThis.localStorage = makeStorage(seed);
  const path = require.resolve('../gos-experiments.js');
  delete require.cache[path];
  return require('../gos-experiments.js');
}

const baseline = {
  a: { revision: 4, score: 76, plantedCount: 18 },
  b: { revision: 2, score: 71, plantedCount: 18 },
};

test('creates and reloads a valid cross-bed experiment', () => {
  const api = loadApi();
  const created = api.create({
    id: 'exp-spacing',
    aBedId: 'front-bed',
    bBedId: 'side-bed',
    variable: 'spacing',
    hypothesis: 'Wider spacing will improve airflow.',
    baseline,
  }, { bedExists: () => true });
  assert.equal(created.id, 'exp-spacing');
  assert.equal(api.getRevision(), 1);
  assert.deepEqual(api.readAll().map(item => item.id), ['exp-spacing']);
});

test('rejects same-bed links, unknown beds, and unsupported variables', () => {
  const api = loadApi();
  assert.throws(() => api.create({ aBedId: 'front-bed', bBedId: 'front-bed', variable: 'spacing' }), { code: 'SAME_BED' });
  assert.throws(() => api.create({ aBedId: 'front-bed', bBedId: 'missing', variable: 'spacing' }, { bedExists: id => id !== 'missing' }), { code: 'UNKNOWN_BED' });
  assert.throws(() => api.create({ aBedId: 'front-bed', bBedId: 'side-bed', variable: 'moon phase' }), { code: 'INVALID_VARIABLE' });
});

test('keeps baselines immutable while observations sort by date then id', () => {
  const api = loadApi();
  api.create({ id: 'exp-water', aBedId: 'a', bBedId: 'b', variable: 'watering', baseline }, { bedExists: () => true });
  api.addObservation('exp-water', { id: 'obs-b', bedId: 'a', date: '2026-07-19', note: 'Second note', scoreSnapshot: 80, plantedCount: 18 });
  api.addObservation('exp-water', { id: 'obs-a', bedId: 'b', date: '2026-07-18', note: 'First note', scoreSnapshot: 73, plantedCount: 18 });
  const experiment = api.get('exp-water');
  assert.deepEqual(experiment.baseline, baseline);
  assert.deepEqual(experiment.observations.map(item => item.id), ['obs-a', 'obs-b']);
});

test('closing preserves observations and relinking preserves history', () => {
  const api = loadApi();
  api.create({ id: 'exp-mulch', aBedId: 'a', bBedId: 'b', variable: 'mulch', baseline }, { bedExists: () => true });
  api.addObservation('exp-mulch', { id: 'obs-1', bedId: 'a', date: '2026-07-18', note: 'Soil stayed damp.' });
  assert.equal(api.close('exp-mulch').status, 'closed');
  const relinked = api.relink('exp-mulch', 'a', 'c', baseline, { bedExists: () => true });
  assert.equal(relinked.status, 'active');
  assert.equal(relinked.bBedId, 'c');
  assert.equal(relinked.observations.length, 1);
});

test('reports malformed storage without destroying valid browser state', () => {
  const api = loadApi({ 'gos.experiments.v1': '{bad json' });
  assert.deepEqual(api.readAll(), []);
  assert.equal(api.getDiagnostics()[0].code, 'MALFORMED_STORAGE');
});

test('summarizes current beds while retaining missing-bed history', () => {
  const api = loadApi();
  const experiment = api.normalize({ id: 'exp-summary', aBedId: 'a', bBedId: 'deleted', variable: 'variety', baseline });
  const summary = api.summarize(experiment, {
    getBed: id => id === 'a' ? { id: 'a', name: 'Front Bed' } : null,
    scoreBed: () => ({ score: 82, weakestCells: ['r0c0'] }),
  });
  assert.equal(summary.complete, false);
  assert.deepEqual(summary.missingBedIds, ['deleted']);
  assert.equal(summary.a.score, 82);
});
