import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const source = readFileSync(new URL('../gos-bed.js', import.meta.url), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); return true; },
    clear() { values.clear(); },
  };
}

function loadSurface(localStorage, sessionStorage, uuid) {
  const context = createContext({
    console,
    Date,
    Math,
    JSON,
    localStorage,
    sessionStorage,
    crypto: { randomUUID: () => uuid },
  });
  context.window = context;
  context.self = context;
  new Script(source, { filename: 'gos-bed.js' }).runInContext(context);
  return context.GosBed;
}

const localStorage = createStorage();
const tabAStorage = createStorage();
const tabBStorage = createStorage();
const bed = { id: 'test-bed', name: 'Test Bed', shape: '4x4', sun: 'full', painted: [] };

const bedsPage = loadSurface(localStorage, tabAStorage, 'tab-a');
bedsPage.initSessionLock();
bedsPage.write(bed);

const plannerSameTab = loadSurface(localStorage, tabAStorage, 'replacement-id-must-not-win');
assert.equal(plannerSameTab._tabId(), bedsPage._tabId(), 'same-tab navigation should preserve one session identity');
assert.doesNotThrow(() => plannerSameTab.write({ ...bed, name: 'Edited in Planner' }));

const otherTab = loadSurface(localStorage, tabBStorage, 'tab-b');
assert.throws(
  () => otherTab.write({ ...bed, name: 'Conflicting edit' }),
  /another window has an active session/,
  'a separate tab should remain blocked while Beds owns the edit lock',
);

assert.equal(plannerSameTab.releaseSessionLock(), true, 'lock owner should release its own session lock');
assert.doesNotThrow(() => otherTab.write({ ...bed, name: 'Edit after release' }));

console.log(JSON.stringify({ ok: true, sameTabId: plannerSameTab._tabId() }, null, 2));
