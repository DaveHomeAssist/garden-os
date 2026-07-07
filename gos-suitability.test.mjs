// Node test for the shared gos-suitability core + compatibility facade.
//   node --test gos-suitability.test.mjs
// The core exports GardenScoringCore and the facade preserves the historical
// window.GosSuitability API consumed by the root HTML tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.window = {};
const CORE = require('./gos-suitability-core.js');
require('./gos-suitability.js');
const GS = globalThis.window.GosSuitability;

const CROPS = {
  tom: { sun: 'full', sowWeek: 8, harvestStart: 26, harvestEnd: 38 },   // tall
  let: { sun: 'part', sowWeek: 10, harvestStart: 16, harvestEnd: 22 },  // front-preferred
  bas: { sun: 'full', sowWeek: 12, harvestStart: 22, harvestEnd: 38 },  // companion of tom
  oni: { sun: 'full', sowWeek: 6, harvestStart: 32, harvestEnd: 36 },   // conflicts with bas
};
const getCrop = (id) => CROPS[id] || null;

test('engine surface is present', () => {
  assert.equal(GS, CORE, 'facade exposes the shared core object');
  for (const fn of ['scoreCell', 'scoreBed', 'explain', 'explainFactor', 'sunFit', 'adjacencyDelta']) {
    assert.equal(typeof GS[fn], 'function', `${fn} exported`);
  }
});

test('sun weight is 2x — a sun match dominates a full-sun bed', () => {
  const bed = { shape: '8x4', sun: 'full', wallSide: 'back', painted: [{ cell: 'r0c0', cropId: 'tom' }] };
  const res = GS.scoreCell({ bed, cellEntry: { cell: 'r0c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  assert.ok(res, 'scored');
  assert.equal(res.factors.sunFit, 5, 'full crop in full bed → sunFit 5');
  // weightedCore = (5*2 + pos + 5 + 3)/5; with tom on the back wall pos is high.
  assert.ok(res.total >= 8, `strong placement scores high (got ${res.total})`);
});

test('a full-sun crop scores worse in a shade bed than in a full-sun bed', () => {
  const mk = (sun) => ({ shape: '8x4', sun, wallSide: 'back', painted: [{ cell: 'r0c0', cropId: 'tom' }] });
  const shade = GS.scoreCell({ bed: mk('shade'), cellEntry: { cell: 'r0c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  const full = GS.scoreCell({ bed: mk('full'), cellEntry: { cell: 'r0c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  assert.equal(shade.factors.sunFit, 1, 'full crop in shade → sunFit 1');
  assert.equal(full.factors.sunFit, 5, 'full crop in full sun → sunFit 5');
  assert.ok(shade.total < full.total - 3, `shade placement is much weaker (${shade.total} vs ${full.total})`);
});

test('adjacency: companion boosts, conflict cuts, clamped to ±2', () => {
  assert.ok(GS.adjacencyDelta('tom', ['bas']) > 0, 'tom+bas companions → positive');
  assert.ok(GS.adjacencyDelta('bas', ['oni']) < 0, 'bas+oni conflict → negative');
  assert.equal(GS.adjacencyDelta('tom', ['tom']), -0.25, 'monoculture penalty');
  assert.ok(GS.adjacencyDelta('bas', ['oni', 'oni', 'oni']) >= -2, 'clamped at -2');
});

test('tall crop scores higher on the wall row than up front', () => {
  const bed = { shape: '8x4', sun: 'full', wallSide: 'back',
    painted: [{ cell: 'r0c0', cropId: 'tom' }, { cell: 'r3c0', cropId: 'tom' }] };
  const back = GS.scoreCell({ bed, cellEntry: { cell: 'r0c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  const front = GS.scoreCell({ bed, cellEntry: { cell: 'r3c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  assert.ok(back.factors.positionFit > front.factors.positionFit, 'tomato belongs on the wall row');
});

test('scoreBed aggregates to 0–100 and flags weakest cells', () => {
  const bed = { shape: '8x4', sun: 'full', wallSide: 'back', painted: [
    { cell: 'r0c0', cropId: 'tom' }, // strong
    { cell: 'r0c1', cropId: 'bas' }, // ok
    { cell: 'r3c2', cropId: 'oni' }, // weaker season/pos
  ] };
  const res = GS.scoreBed({ bed, getCrop, currentWeek: 30 });
  assert.ok(res.score >= 0 && res.score <= 100, `score in range (${res.score})`);
  assert.equal(res.cells.length, 3);
  assert.ok(Array.isArray(res.weakestCells) && res.weakestCells.length >= 1);
});

test('empty bed returns a null score, not a crash', () => {
  const res = GS.scoreBed({ bed: { shape: '8x4', painted: [] }, getCrop, currentWeek: 30 });
  assert.equal(res.score, null);
});

test('explain() returns one row per emitted factor with verdict + copy', () => {
  const bed = { shape: '8x4', sun: 'full', wallSide: 'back', painted: [{ cell: 'r0c0', cropId: 'tom' }] };
  const res = GS.scoreCell({ bed, cellEntry: { cell: 'r0c0', cropId: 'tom' }, getCrop, currentWeek: 30 });
  const rows = GS.explain(res.factors);
  assert.equal(rows.length, 4, 'sun/position/season/adjacency');
  for (const row of rows) {
    assert.ok(['good', 'mid', 'bad'].includes(row.verdict), `verdict for ${row.key}`);
    assert.ok(row.label && row.note && row.what, `copy present for ${row.key}`);
  }
  const sun = rows.find(r => r.key === 'sunFit');
  assert.equal(sun.verdict, 'good', 'sunFit 5 → good');
  assert.equal(sun.weight, '2×');
});

test('explainFactor maps thresholds correctly for a 0–5 factor', () => {
  assert.equal(GS.explainFactor('seasonFit', 5).verdict, 'good');
  assert.equal(GS.explainFactor('seasonFit', 3).verdict, 'mid');
  assert.equal(GS.explainFactor('seasonFit', 1).verdict, 'bad');
  assert.equal(GS.explainFactor('adjacency', 1).verdict, 'good');
  assert.equal(GS.explainFactor('adjacency', -1).verdict, 'bad');
  assert.equal(GS.explainFactor('adjacency', 0).verdict, 'mid');
});
