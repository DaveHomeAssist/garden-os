// node --test tests/site-backup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backup = require('../gos-site-backup.js');

function memoryStorage(init = {}) {
  const map = new Map(Object.entries(init));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

const source = () => memoryStorage({
  'gos.bed.front-bed': JSON.stringify({ schemaVersion: 1, id: 'front-bed', shape: '4x8', painted: [] }),
  'gos.activeBed': 'front-bed',
  'gos.bed.order.v1': '["front-bed"]',
  'gos.journal.v1': '[{"id":"e1"}]',
  'gos.experiments.v1': '{}',
  'garden-os-theme': 'dark',
  'gos.session.lock': '{"tabId":"x"}',
  'gos-story-slot-0': '{"story":true}',
  'unrelated': '1',
});

test('backs up planner keys only: no Story Mode, session lock or foreign keys', () => {
  const b = backup.createBackup(source(), { now: '2026-10-19T09:00:00.000Z', origin: 'https://davehomeassist.github.io' });
  assert.equal(b.format, 'garden-os-site-backup');
  assert.deepEqual(Object.keys(b.keys).sort(), ['garden-os-theme', 'gos.activeBed', 'gos.bed.front-bed', 'gos.bed.order.v1', 'gos.experiments.v1', 'gos.journal.v1']);
  assert.match(b.checksum.value, /^[0-9a-f]{8}$/);
});

test('round trip into an empty origin restores every value exactly', () => {
  const b = JSON.parse(JSON.stringify(backup.createBackup(source())));
  const target = memoryStorage({ 'gos-story-slot-0': 'keep' });
  const r = backup.restoreBackup(target, b);
  assert.deepEqual(r, { ok: true, written: 6, replaced: 0 });
  assert.equal(target.getItem('gos.activeBed'), 'front-bed');
  assert.equal(target.getItem('gos-story-slot-0'), 'keep');
  assert.equal(target.getItem('gos.session.lock'), null);
});

test('rejects edited, foreign or newer files without writing', () => {
  const b = backup.createBackup(source());
  const target = memoryStorage();
  const edited = { ...b, keys: { ...b.keys, 'gos.activeBed': 'other' } };
  assert.equal(backup.restoreBackup(target, edited).ok, false);
  const smuggled = { ...b, keys: { ...b.keys, 'gos-story-slot-0': 'x' } };
  assert.match(backup.restoreBackup(target, smuggled).error, /unexpected key/);
  assert.equal(backup.restoreBackup(target, { ...b, formatVersion: 2 }).ok, false);
  assert.equal(backup.restoreBackup(target, { format: 'garden-os-story-save' }).ok, false);
  assert.equal(target.length, 0);
});
