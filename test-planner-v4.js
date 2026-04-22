#!/usr/bin/env node
/**
 * Garden OS Planner v4.4 — Comprehensive Test Suite
 * Tests all 5 features + data model + migration + edge cases
 * Run: node test-planner-v4.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FRAMEWORK (minimal, zero-dep)
// ═══════════════════════════════════════════════════════════════════════════════
let _total = 0, _pass = 0, _fail = 0, _errors = [];
let _currentSuite = '';
function suite(name) { _currentSuite = name; console.log(`\n  ▸ ${name}`); }
function assert(condition, label) {
  _total++;
  if (condition) { _pass++; console.log(`    ✓ ${label}`); }
  else { _fail++; _errors.push(`${_currentSuite}: ${label}`); console.log(`    ✗ ${label}`); }
}
function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}
function assertDeep(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} (got ${JSON.stringify(actual)})`);
}
function assertThrows(fn, label) {
  _total++;
  try { fn(); _fail++; _errors.push(`${_currentSuite}: ${label} (did not throw)`); console.log(`    ✗ ${label}`); }
  catch(e) { _pass++; console.log(`    ✓ ${label}`); }
}
function assertType(val, type, label) { assert(typeof val === type, `${label} is ${type}`); }
function assertArray(val, label) { assert(Array.isArray(val), `${label} is array`); }
function assertTruthy(val, label) { assert(!!val, label); }
function assertNull(val, label) { assert(val === null, `${label} is null (got ${JSON.stringify(val)})`); }

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT & LOAD PLANNER JS
// ═══════════════════════════════════════════════════════════════════════════════
const htmlPath = path.join(__dirname, 'garden-planner-v4.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('No script block found'); process.exit(1); }
const rawScript = scriptMatch[1];

// Override escapeHtml after load — the DOM-based one won't work in Node
// We'll patch it after script loads

// Minimal DOM mock
const _mockStorage = {};
const _mockElements = {};
function createMockElement(tag) {
  const el = {};
  let _textContent = '';
  Object.defineProperty(el, 'textContent', {
    get() { return _textContent; },
    set(v) { _textContent = String(v); }
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return _textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
    set(v) { _textContent = v; }
  });
  return Object.assign(el, {
    tagName: tag || 'DIV',
    className: '', id: '',
    style: new Proxy({}, { set: () => true, get: () => '' }),
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); },
      remove(c) { this._c.delete(c); },
      contains(c) { return this._c.has(c); },
      toggle(c, force) { if(force===undefined) { this._c.has(c)?this._c.delete(c):this._c.add(c); } else { force?this._c.add(c):this._c.delete(c); } }
    },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { return c; }, removeChild() {},
    remove() {},
    focus() {},
    click() {},
    scrollIntoView() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    dataset: {},
    hidden: false,
    disabled: false,
    value: '',
    checked: false,
    children: [],
    get parentElement() { return null; }
  });
}

const _doc = {
  createElement(tag) { return createMockElement(tag); },
  getElementById(id) {
    if (!_mockElements[id]) _mockElements[id] = createMockElement('div');
    return _mockElements[id];
  },
  querySelector(sel) {
    // Extract id from selector like '#foo'
    if (sel && sel.startsWith('#')) {
      const id = sel.slice(1);
      if (!_mockElements[id]) _mockElements[id] = createMockElement('div');
      return _mockElements[id];
    }
    return createMockElement('div');
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {},
  body: createMockElement('body'),
  activeElement: null,
  documentElement: createMockElement('html'),
  head: createMockElement('head'),
};

const _win = {
  location: { hash: '', href: '' },
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame(fn) { fn(); },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } }, userAgent: '' },
  matchMedia() { return { matches: false, addEventListener() {} }; },
  innerWidth: 1200, innerHeight: 800,
  getComputedStyle() { return {}; },
};

const _localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; },
};

// Build execution context
const ctx = {
  document: _doc,
  window: _win,
  self: _win,
  localStorage: _localStorage,
  sessionStorage: _localStorage,
  navigator: _win.navigator,
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, Array, Object, String, Number, Boolean, RegExp, Error,
  Map, Set, WeakMap, WeakSet, Symbol, Promise, Proxy,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  URL: globalThis.URL,
  Blob: globalThis.Blob || function Blob(p, o) { this.data = p; this.type = o && o.type; },
  alert() {}, prompt() { return null; }, confirm() { return true; },
  requestAnimationFrame(fn) { fn(); },
  // Expose captured references for tests
  __test_exports: {},
};

// Wrap script to capture key globals
// Inject stubs for DOM-heavy functions to prevent crashes during both init and test calls
// We find the init block marker and inject stubs before it
// Keep the full script but stub DOM-heavy functions before they can be called.
// We inject stubs right after the last feature function definition.
let coreScript = rawScript;
// Find the tutorial section which comes after all our feature functions
const tutorialMarker = 'function startTutorial';
const tutIdx = coreScript.indexOf(tutorialMarker);
if (tutIdx > 0) {
  // Truncate here — everything after is tutorial + event wiring init code
  coreScript = coreScript.slice(0, tutIdx);
}
// Stub render/saveState/pushUndo so logCellEvent and navigateToCell work without DOM
coreScript += `
render = function(){};
saveState = function(){ if(typeof _workspace!=='undefined'&&_workspace) _workspace.updatedAt=new Date().toISOString(); };
pushUndo = function(){};
syncToolButtons = function(){};
switchRTab = function(t){ if(typeof ui!=='undefined') ui.rTab=t; };
saveWorkspaceDebounced = function(){};
saveWorkspace = function(){};
`;

const wrappedScript = `
  ${coreScript}
  // Expose to test harness
  __test_exports.CROPS = typeof CROPS !== 'undefined' ? CROPS : {};
  __test_exports.VALID_PLANTING_STATUSES = typeof VALID_PLANTING_STATUSES !== 'undefined' ? VALID_PLANTING_STATUSES : [];
  __test_exports.VALID_EVENT_TYPES = typeof VALID_EVENT_TYPES !== 'undefined' ? VALID_EVENT_TYPES : [];
  __test_exports.STATUS_COLORS = typeof STATUS_COLORS !== 'undefined' ? STATUS_COLORS : {};
  __test_exports.STATUS_TRANSITION = typeof STATUS_TRANSITION !== 'undefined' ? STATUS_TRANSITION : {};
  __test_exports.EVENT_LABELS = typeof EVENT_LABELS !== 'undefined' ? EVENT_LABELS : {};
  __test_exports.WORKSPACE_VERSION = typeof WORKSPACE_VERSION !== 'undefined' ? WORKSPACE_VERSION : 0;
  __test_exports.APP_VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '';
  __test_exports.uniqueId = typeof uniqueId !== 'undefined' ? uniqueId : null;
  __test_exports.normalizePlantingCell = typeof normalizePlantingCell !== 'undefined' ? normalizePlantingCell : null;
  __test_exports.normalizeCellArray = typeof normalizeCellArray !== 'undefined' ? normalizeCellArray : null;
  __test_exports.normalizeBedRecord = typeof normalizeBedRecord !== 'undefined' ? normalizeBedRecord : null;
  __test_exports.validateWorkspace = typeof validateWorkspace !== 'undefined' ? validateWorkspace : null;
  __test_exports.createMinimalWorkspace = typeof createMinimalWorkspace !== 'undefined' ? createMinimalWorkspace : null;
  __test_exports.createEmptyBed = typeof createEmptyBed !== 'undefined' ? createEmptyBed : null;
  __test_exports.createBed = typeof createBed !== 'undefined' ? createBed : null;
  __test_exports.formatEventDate = typeof formatEventDate !== 'undefined' ? formatEventDate : null;
  __test_exports.autoTransitionStatus = typeof autoTransitionStatus !== 'undefined' ? autoTransitionStatus : null;
  __test_exports.getStatusVisuals = typeof getStatusVisuals !== 'undefined' ? getStatusVisuals : null;
  __test_exports.buildSyncPayload = typeof buildSyncPayload !== 'undefined' ? buildSyncPayload : null;
  __test_exports.buildSeasonReview = typeof buildSeasonReview !== 'undefined' ? buildSeasonReview : null;
  __test_exports.renderEventLogger = typeof renderEventLogger !== 'undefined' ? renderEventLogger : null;
  __test_exports.renderSeasonReview = typeof renderSeasonReview !== 'undefined' ? renderSeasonReview : null;
  __test_exports.logCellEvent = typeof logCellEvent !== 'undefined' ? logCellEvent : null;
  __test_exports.getTodayNeedsAttention = typeof getTodayNeedsAttention !== 'undefined' ? getTodayNeedsAttention : null;
  __test_exports.getTodayRecentActivity = typeof getTodayRecentActivity !== 'undefined' ? getTodayRecentActivity : null;
  __test_exports.getTodayQuickStats = typeof getTodayQuickStats !== 'undefined' ? getTodayQuickStats : null;
  __test_exports.getHarvests = typeof getHarvests !== 'undefined' ? getHarvests : null;
  __test_exports.getHarvestSummary = typeof getHarvestSummary !== 'undefined' ? getHarvestSummary : null;
  __test_exports.saveSeasonNote = typeof saveSeasonNote !== 'undefined' ? saveSeasonNote : null;
  __test_exports.bedSnapshot = typeof bedSnapshot !== 'undefined' ? bedSnapshot : null;
  __test_exports.restoreSnapshot = typeof restoreSnapshot !== 'undefined' ? restoreSnapshot : null;
  __test_exports.escapeHtml = typeof escapeHtml !== 'undefined' ? escapeHtml : null;
  __test_exports.bed = typeof bed !== 'undefined' ? bed : [];
  __test_exports._workspace = typeof _workspace !== 'undefined' ? _workspace : null;
  __test_exports.getBed = function() { return typeof bed !== 'undefined' ? bed : []; };
  __test_exports.getWorkspace = function() { return typeof _workspace !== 'undefined' ? _workspace : null; };
  __test_exports.setBed = function(b) { bed = b; };
  __test_exports.setWorkspace = function(w) { _workspace = w; };
  __test_exports.exportWorkspaceFile = typeof exportWorkspaceFile !== 'undefined' ? exportWorkspaceFile : null;
  __test_exports.migrateV0toV1 = typeof migrateV0toV1 !== 'undefined' ? migrateV0toV1 : null;
  __test_exports.normalizeSiteSettings = typeof normalizeSiteSettings !== 'undefined' ? normalizeSiteSettings : null;
  __test_exports.saveState = typeof saveState !== 'undefined' ? saveState : null;
  __test_exports.pushUndo = typeof pushUndo !== 'undefined' ? pushUndo : null;
  __test_exports.validateFamilyRecipeSnapshot = typeof validateFamilyRecipeSnapshot !== 'undefined' ? validateFamilyRecipeSnapshot : null;
  __test_exports.loadFamilyRecipeSnapshot = typeof loadFamilyRecipeSnapshot !== 'undefined' ? loadFamilyRecipeSnapshot : null;
  __test_exports.saveFamilyRecipeSnapshot = typeof saveFamilyRecipeSnapshot !== 'undefined' ? saveFamilyRecipeSnapshot : null;
  __test_exports.matchFamilyRecipes = typeof matchFamilyRecipes !== 'undefined' ? matchFamilyRecipes : null;
  __test_exports.INSIGHT_SECTION_MAP = typeof INSIGHT_SECTION_MAP !== 'undefined' ? INSIGHT_SECTION_MAP : {};
`;

console.log('═══ Garden OS Planner v4.4 — Test Suite ═══');
console.log('Loading planner script...');

let T; // test exports
try {
  const fn = new Function(
    'document', 'window', 'self', 'localStorage', 'sessionStorage',
    'navigator', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'alert', 'prompt', 'confirm', 'requestAnimationFrame',
    'Date', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Promise', 'Proxy',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
    'URL', 'Blob', '__test_exports',
    wrappedScript
  );
  fn(
    _doc, _win, _win, _localStorage, _localStorage,
    _win.navigator, console, setTimeout, clearTimeout, setInterval, clearInterval,
    () => {}, () => null, () => true, (f) => f(),
    Date, Math, JSON, Array, Object, String, Number, Boolean,
    RegExp, Error, Map, Set, WeakMap, WeakSet, Symbol, Promise, Proxy,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    globalThis.URL, globalThis.Blob || function(p, o) { this.data = p; },
    ctx.__test_exports
  );
  T = ctx.__test_exports;
  console.log('Script loaded OK.\n');
} catch(e) {
  console.error('FATAL: Script failed to load:', e.message);
  console.error(e.stack);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: create a test workspace
function makeTestWorkspace(opts = {}) {
  const ws = T.createMinimalWorkspace();
  if (opts.crops) {
    // Place crops in first bed
    const cells = ws.beds[0].plannerState.cells;
    opts.crops.forEach((ck, i) => {
      if (i < cells.length && ck) {
        cells[i] = { crop: ck, plantingId: T.uniqueId('pl'), plantedAt: new Date().toISOString(), status: 'planned', events: [], notes: '' };
      }
    });
  }
  return ws;
}

// Helper: setup runtime bed from workspace
function setupRuntime(ws) {
  T.setWorkspace(ws);
  const b = ws.beds[0];
  const cols = b.size.cols, rows = b.size.rows;
  const runtimeBed = T.createEmptyBed(cols, rows);
  const cells = T.normalizeCellArray(b.plannerState.cells, cols, rows);
  cells.forEach((pc, i) => {
    if (pc) {
      runtimeBed[i].crop = pc.crop;
      runtimeBed[i].plantingId = pc.plantingId;
      runtimeBed[i].plantedAt = pc.plantedAt;
      runtimeBed[i].status = pc.status;
      runtimeBed[i].events = pc.events;
      runtimeBed[i].plantingNotes = pc.notes;
    }
  });
  T.setBed(runtimeBed);
  return runtimeBed;
}


// ─────────────────────────────────────────────────────────────────────────────
suite('1. Constants & Version');
// ─────────────────────────────────────────────────────────────────────────────

assertEq(T.WORKSPACE_VERSION, 2, 'WORKSPACE_VERSION is 2');
assertEq(T.APP_VERSION, '4.4', 'APP_VERSION is 4.4');

assertEq(T.VALID_PLANTING_STATUSES.length, 8, '8 planting statuses defined');
assert(T.VALID_PLANTING_STATUSES.includes('planned'), 'statuses include planned');
assert(T.VALID_PLANTING_STATUSES.includes('growing'), 'statuses include growing');
assert(T.VALID_PLANTING_STATUSES.includes('failed'), 'statuses include failed');

assertEq(T.VALID_EVENT_TYPES.length, 12, '12 event types defined');
assert(T.VALID_EVENT_TYPES.includes('seed_started'), 'events include seed_started');
assert(T.VALID_EVENT_TYPES.includes('harvested'), 'events include harvested');
assert(T.VALID_EVENT_TYPES.includes('note'), 'events include note');

assertEq(Object.keys(T.STATUS_COLORS).length, 8, 'STATUS_COLORS has 8 entries');
T.VALID_PLANTING_STATUSES.forEach(s => {
  assert(T.STATUS_COLORS[s] !== undefined, `STATUS_COLORS has entry for '${s}'`);
  assert(T.STATUS_COLORS[s].bg && T.STATUS_COLORS[s].bar && T.STATUS_COLORS[s].label, `STATUS_COLORS.${s} has bg, bar, label`);
});

assertEq(Object.keys(T.STATUS_TRANSITION).length, 6, 'STATUS_TRANSITION has 6 entries');
assertEq(T.STATUS_TRANSITION.seed_started, 'started_indoors', 'seed_started → started_indoors');
assertEq(T.STATUS_TRANSITION.germinated, 'growing', 'germinated → growing');
assertEq(T.STATUS_TRANSITION.harvested, 'harvesting', 'harvested → harvesting');
assertEq(T.STATUS_TRANSITION.removed, 'finished', 'removed → finished');
assertEq(T.STATUS_TRANSITION.transplanted, 'transplanted', 'transplanted → transplanted');
assertEq(T.STATUS_TRANSITION.direct_sown, 'direct_sown', 'direct_sown → direct_sown');

assertEq(Object.keys(T.EVENT_LABELS).length, 12, 'EVENT_LABELS has 12 entries');
T.VALID_EVENT_TYPES.forEach(et => {
  assert(T.EVENT_LABELS[et] !== undefined, `EVENT_LABELS has entry for '${et}'`);
});


// ─────────────────────────────────────────────────────────────────────────────
suite('2. CROPS database integrity');
// ─────────────────────────────────────────────────────────────────────────────

const cropKeys = Object.keys(T.CROPS);
assert(cropKeys.length >= 38, `CROPS has ${cropKeys.length} entries (expected ≥38)`);
cropKeys.forEach(ck => {
  const c = T.CROPS[ck];
  assert(typeof c.name === 'string' && c.name.length > 0, `${ck}.name is a non-empty string`);
  assert(typeof c.emoji === 'string', `${ck}.emoji exists`);
  assert(typeof c.color === 'string', `${ck}.color exists`);
  assert(typeof c.category === 'string', `${ck}.category exists`);
  assert(Array.isArray(c.companions), `${ck}.companions is array`);
  assert(Array.isArray(c.conflicts), `${ck}.conflicts is array`);
  assert(Array.isArray(c.varieties), `${ck}.varieties is array`);
  assert(typeof c.seasonalMultipliers === 'object', `${ck}.seasonalMultipliers is object`);
});


// ─────────────────────────────────────────────────────────────────────────────
suite('3. Data Model v2 — normalizePlantingCell');
// ─────────────────────────────────────────────────────────────────────────────

// Null input
assertNull(T.normalizePlantingCell(null), 'null → null');
assertNull(T.normalizePlantingCell(undefined), 'undefined → null');
assertNull(T.normalizePlantingCell(''), 'empty string → null');
assertNull(T.normalizePlantingCell('nonexistent_crop'), 'unknown crop string → null');

// Legacy v1 string format
const v1Cell = T.normalizePlantingCell('lettuce');
assertTruthy(v1Cell, 'lettuce string upgrades to object');
assertEq(v1Cell.crop, 'lettuce', 'v1 cell crop = lettuce');
assertTruthy(v1Cell.plantingId, 'v1 cell gets plantingId');
assert(v1Cell.plantingId.startsWith('pl-'), 'plantingId starts with pl-');
assertEq(v1Cell.status, 'planned', 'v1 cell status = planned');
assertNull(v1Cell.plantedAt, 'v1 cell plantedAt = null (no timestamp in legacy)');
assertDeep(v1Cell.events, [], 'v1 cell events = []');
assertEq(v1Cell.notes, '', 'v1 cell notes = empty');

// V2 rich cell format
const v2Cell = T.normalizePlantingCell({
  crop: 'compact_tomato', plantingId: 'pl-test-123', plantedAt: '2026-04-01T12:00:00Z',
  status: 'growing', events: [{type: 'germinated', date: '2026-04-05T10:00:00Z', note: ''}],
  notes: 'Test note'
});
assertEq(v2Cell.crop, 'compact_tomato', 'v2 cell crop preserved');
assertEq(v2Cell.plantingId, 'pl-test-123', 'v2 cell plantingId preserved');
assertEq(v2Cell.status, 'growing', 'v2 cell status preserved');
assertEq(v2Cell.plantedAt, '2026-04-01T12:00:00Z', 'v2 cell plantedAt preserved');
assertEq(v2Cell.events.length, 1, 'v2 cell events preserved');
assertEq(v2Cell.notes, 'Test note', 'v2 cell notes preserved');

// Invalid v2 — missing crop
assertNull(T.normalizePlantingCell({crop: null}), 'object with null crop → null');
assertNull(T.normalizePlantingCell({crop: 'fake'}), 'object with unknown crop → null');

// V2 with invalid status falls back
const badStatus = T.normalizePlantingCell({crop: 'lettuce', status: 'INVALID'});
assertEq(badStatus.status, 'planned', 'invalid status falls back to planned');

// V2 with invalid events filters them
const badEvents = T.normalizePlantingCell({
  crop: 'lettuce', events: [{type: 'bad_type', date: '2026-01-01'}, {type: 'germinated', date: '2026-01-01'}, 'string']
});
assertEq(badEvents.events.length, 1, 'invalid event types filtered out');
assertEq(badEvents.events[0].type, 'germinated', 'valid event preserved');


// ─────────────────────────────────────────────────────────────────────────────
suite('4. Data Model v2 — normalizeCellArray');
// ─────────────────────────────────────────────────────────────────────────────

// Empty array
const empty = T.normalizeCellArray([], 4, 2);
assertEq(empty.length, 8, 'empty array padded to cols×rows');
empty.forEach((c, i) => assertNull(c, `empty cell ${i} is null`));

// Legacy v1 string array
const v1arr = T.normalizeCellArray(['lettuce', null, 'compact_tomato', null], 2, 2);
assertEq(v1arr.length, 4, 'v1 array length preserved');
assertEq(v1arr[0].crop, 'lettuce', 'v1 arr[0] upgraded');
assertNull(v1arr[1], 'v1 null preserved');
assertEq(v1arr[2].crop, 'compact_tomato', 'v1 arr[2] upgraded');

// Truncation: more cells than grid
const truncated = T.normalizeCellArray(['lettuce','lettuce','lettuce','lettuce','lettuce'], 2, 2);
assertEq(truncated.length, 4, 'truncated to cols×rows');

// Padding: fewer cells than grid
const padded = T.normalizeCellArray(['lettuce'], 2, 2);
assertEq(padded.length, 4, 'padded to cols×rows');
assertEq(padded[0].crop, 'lettuce', 'first cell preserved');
assertNull(padded[1], 'padded cell is null');


// ─────────────────────────────────────────────────────────────────────────────
suite('5. Workspace validation');
// ─────────────────────────────────────────────────────────────────────────────

// Minimal valid workspace
const wsResult = T.validateWorkspace({
  beds: [{ size: {cols:4, rows:2}, plannerState: {cells: ['lettuce',null,null,null,null,null,null,null]} }]
});
assert(wsResult.ok, 'minimal workspace validates OK');
assertEq(wsResult.workspace.version, 2, 'version set to 2');
assertTruthy(wsResult.workspace.id, 'workspace gets an ID');
assertEq(wsResult.workspace.beds.length, 1, 'one bed preserved');
assertEq(wsResult.workspace.beds[0].plannerState.cells[0].crop, 'lettuce', 'cell upgraded in bed');

// seasonNotes preserved
const wsWithNotes = T.validateWorkspace({
  beds: [{ size: {cols:2, rows:2}, plannerState: {cells: ['lettuce',null,null,null]} }],
  seasonNotes: { compact_tomato: 'Great year' }
});
assert(wsWithNotes.ok, 'workspace with seasonNotes validates');
assertEq(wsWithNotes.workspace.seasonNotes['compact_tomato'], 'Great year', 'seasonNotes preserved');

// bedView preserved
const wsWithView = T.validateWorkspace({
  beds: [{ size: {cols:2, rows:2}, plannerState: {cells: []} }],
  workspaceSettings: { bedView: 'status' }
});
assert(wsWithView.ok, 'workspace with bedView validates');
assertEq(wsWithView.workspace.workspaceSettings.bedView, 'status', 'bedView=status preserved');

// Invalid bedView falls back
const wsInvalidView = T.validateWorkspace({
  beds: [{ size: {cols:2, rows:2}, plannerState: {cells: []} }],
  workspaceSettings: { bedView: 'INVALID' }
});
assertEq(wsInvalidView.workspace.workspaceSettings.bedView, 'score', 'invalid bedView → score');

// today as valid rightTab
const wsToday = T.validateWorkspace({
  beds: [{ size: {cols:2, rows:2}, plannerState: {cells: []} }],
  workspaceSettings: { rightTab: 'today' }
});
assertEq(wsToday.workspace.workspaceSettings.rightTab, 'today', 'rightTab=today preserved');

// Rejected: no beds
const wsBad = T.validateWorkspace({beds: []});
assert(!wsBad.ok, 'empty beds array rejected');

// Rejected: not an object
const wsBad2 = T.validateWorkspace(null);
assert(!wsBad2.ok, 'null rejected');
const wsBad3 = T.validateWorkspace('string');
assert(!wsBad3.ok, 'string rejected');


// ─────────────────────────────────────────────────────────────────────────────
suite('6. createMinimalWorkspace');
// ─────────────────────────────────────────────────────────────────────────────

const fresh = T.createMinimalWorkspace();
assertTruthy(fresh.id, 'has id');
assertEq(fresh.version, 2, 'version = 2');
assertEq(fresh.beds.length, 1, '1 default bed');
assertEq(fresh.beds[0].name, 'Main Bed', 'default bed name');
assertEq(fresh.beds[0].size.cols, 8, 'default 8 cols');
assertEq(fresh.beds[0].size.rows, 4, 'default 4 rows');
assertDeep(fresh.harvests, [], 'empty harvests');
assertDeep(fresh.seasonNotes, {}, 'empty seasonNotes');
assertEq(fresh.workspaceSettings.bedView, 'score', 'default bedView = score');
assertEq(fresh.workspaceSettings.rightTab, 'score', 'default rightTab = score');


// ─────────────────────────────────────────────────────────────────────────────
suite('7. createEmptyBed');
// ─────────────────────────────────────────────────────────────────────────────

const emptyBed = T.createEmptyBed(3, 2);
assertEq(emptyBed.length, 6, '3x2 = 6 cells');
emptyBed.forEach((c, i) => {
  assertNull(c.crop, `cell ${i} crop null`);
  assertNull(c.plantingId, `cell ${i} plantingId null`);
  assertNull(c.plantedAt, `cell ${i} plantedAt null`);
  assertNull(c.status, `cell ${i} status null`);
  assertDeep(c.events, [], `cell ${i} events empty`);
  assertEq(c.plantingNotes, '', `cell ${i} plantingNotes empty`);
});
assertEq(emptyBed[0].id, 'r0c0', 'first cell id = r0c0');
assertEq(emptyBed[5].id, 'r1c2', 'last cell id = r1c2');


// ─────────────────────────────────────────────────────────────────────────────
suite('8. Feature 1 — autoTransitionStatus');
// ─────────────────────────────────────────────────────────────────────────────

function makeCell(status) { return { crop: 'lettuce', status, events: [] }; }

const c1 = makeCell('planned');
T.autoTransitionStatus(c1, 'seed_started');
assertEq(c1.status, 'started_indoors', 'seed_started → started_indoors');

const c2 = makeCell('planned');
T.autoTransitionStatus(c2, 'direct_sown');
assertEq(c2.status, 'direct_sown', 'direct_sown → direct_sown');

const c3 = makeCell('direct_sown');
T.autoTransitionStatus(c3, 'germinated');
assertEq(c3.status, 'growing', 'germinated → growing');

const c4 = makeCell('growing');
T.autoTransitionStatus(c4, 'harvested');
assertEq(c4.status, 'harvesting', 'harvested → harvesting');

const c5 = makeCell('harvesting');
T.autoTransitionStatus(c5, 'removed');
assertEq(c5.status, 'finished', 'removed → finished');

// No-change events
const c6 = makeCell('growing');
T.autoTransitionStatus(c6, 'fertilized');
assertEq(c6.status, 'growing', 'fertilized → no change');

const c7 = makeCell('growing');
T.autoTransitionStatus(c7, 'pest_issue');
assertEq(c7.status, 'growing', 'pest_issue → no change');

const c8 = makeCell('growing');
T.autoTransitionStatus(c8, 'note');
assertEq(c8.status, 'growing', 'note → no change');

const c9 = makeCell('growing');
T.autoTransitionStatus(c9, 'thinned');
assertEq(c9.status, 'growing', 'thinned → no change');

const c10 = makeCell('growing');
T.autoTransitionStatus(c10, 'trellised');
assertEq(c10.status, 'growing', 'trellised → no change');

const c11 = makeCell('growing');
T.autoTransitionStatus(c11, 'disease_issue');
assertEq(c11.status, 'growing', 'disease_issue → no change');


// ─────────────────────────────────────────────────────────────────────────────
suite('9. Feature 1 — formatEventDate');
// ─────────────────────────────────────────────────────────────────────────────

assertEq(T.formatEventDate(null), '', 'null → empty');
assertEq(T.formatEventDate(''), '', 'empty → empty');
assertEq(T.formatEventDate(new Date().toISOString()), 'today', 'now → today');

const yesterday = new Date(Date.now() - 86400000).toISOString();
assertEq(T.formatEventDate(yesterday), '1d ago', 'yesterday → 1d ago');

const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
assertEq(T.formatEventDate(fiveDaysAgo), '5d ago', '5 days ago → 5d ago');

const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
assert(T.formatEventDate(monthAgo).includes(' '), '30 days ago → "Mon DD" format');


// ─────────────────────────────────────────────────────────────────────────────
suite('10. Feature 1 — renderEventLogger');
// ─────────────────────────────────────────────────────────────────────────────

assertEq(T.renderEventLogger(null), '', 'null cell → empty');
assertEq(T.renderEventLogger({crop: null}), '', 'empty cell → empty');

const plantedCell = { crop: 'lettuce', status: 'planned', events: [], plantingNotes: '' };
const loggerHtml = T.renderEventLogger(plantedCell);
assert(loggerHtml.includes('Activity tracker'), 'has title');
assert(loggerHtml.includes('Planned'), 'shows status label');
assert(loggerHtml.includes('evt-btn'), 'has event buttons');
assert(loggerHtml.includes('data-evt="seed_started"'), 'has seed_started button');
assert(loggerHtml.includes('data-evt="note"'), 'has note button');
assert(loggerHtml.includes('No events yet'), 'shows empty state');

// With events
const cellWithEvents = {
  crop: 'compact_tomato', status: 'growing',
  events: [
    {type: 'seed_started', date: '2026-03-01T10:00:00Z', note: ''},
    {type: 'germinated', date: new Date().toISOString(), note: ''}
  ],
  plantingNotes: ''
};
const loggerHtml2 = T.renderEventLogger(cellWithEvents);
assert(loggerHtml2.includes('Growing'), 'shows Growing status');
assert(loggerHtml2.includes('evt-timeline'), 'has timeline');
assert(loggerHtml2.includes('today'), 'shows today for recent event');
assert(!loggerHtml2.includes('No events yet'), 'no empty state');


// ─────────────────────────────────────────────────────────────────────────────
suite('11. Feature 1 — logCellEvent (integration)');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce'] });
  const rBed = setupRuntime(ws);

  assertEq(rBed[0].status, 'planned', 'initial status = planned');
  assertEq(rBed[0].events.length, 0, 'initial events empty');

  T.logCellEvent('r0c0', 'seed_started');
  assertEq(rBed[0].status, 'started_indoors', 'after seed_started → started_indoors');
  assertEq(rBed[0].events.length, 1, '1 event logged');
  assertEq(rBed[0].events[0].type, 'seed_started', 'event type correct');
  assertTruthy(rBed[0].events[0].date, 'event has date');

  T.logCellEvent('r0c0', 'germinated');
  assertEq(rBed[0].status, 'growing', 'after germinated → growing');
  assertEq(rBed[0].events.length, 2, '2 events logged');

  T.logCellEvent('r0c0', 'fertilized');
  assertEq(rBed[0].status, 'growing', 'fertilized → no status change');
  assertEq(rBed[0].events.length, 3, '3 events logged');

  // Invalid event type rejected
  T.logCellEvent('r0c0', 'INVALID_TYPE');
  assertEq(rBed[0].events.length, 3, 'invalid event type not logged');

  // Non-existent cell ignored
  T.logCellEvent('r99c99', 'note');
  assertEq(rBed[0].events.length, 3, 'non-existent cell ignored');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('12. Feature 2 — getStatusVisuals');
// ─────────────────────────────────────────────────────────────────────────────

T.VALID_PLANTING_STATUSES.forEach(s => {
  const v = T.getStatusVisuals(s);
  assert(typeof v.bg === 'string', `getStatusVisuals('${s}').bg is string`);
  assert(typeof v.bar === 'string', `getStatusVisuals('${s}').bar is string`);
  assert(v.bg.includes('#'), `getStatusVisuals('${s}').bg has # color`);
});

const nullVis = T.getStatusVisuals(null);
assertTruthy(nullVis.bg, 'null status returns fallback bg');
assertTruthy(nullVis.bar, 'null status returns fallback bar');

const unknownVis = T.getStatusVisuals('UNKNOWN');
assertTruthy(unknownVis.bg, 'unknown status returns fallback bg');


// ─────────────────────────────────────────────────────────────────────────────
suite('13. Feature 3 — buildSyncPayload');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce', null, 'compact_tomato'] });
  // Set site settings directly on the stored bed (buildSyncPayload reads from _workspace, not DOM)
  ws.beds[0].plannerState.site = { sunHours: 7, orientation: 'ns', season: 'spring', zone: '6',
    sunDirection: 'south', wallSide: 'back', trellis: true, goal: 'balanced' };
  setupRuntime(ws);
  T.setWorkspace(ws);

  const payload = T.buildSyncPayload();
  assertTruthy(payload.meta, 'payload has meta');
  assertEq(payload.meta.appVersion, '4.4', 'meta.appVersion = 4.4');
  assertTruthy(payload.meta.exportedAt, 'meta.exportedAt present');
  assertTruthy(payload.meta.workspaceId, 'meta.workspaceId present');

  assertArray(payload.plantings, 'plantings is array');
  assertEq(payload.plantings.length, 2, '2 planted cells → 2 plantings');

  const p0 = payload.plantings[0];
  assertEq(p0.crop, 'lettuce', 'planting 0 crop = lettuce');
  assertTruthy(p0.plantingId, 'planting 0 has plantingId');
  assertEq(p0.status, 'planned', 'planting 0 status = planned');
  assertEq(p0.row, 0, 'planting 0 row = 0');
  assertEq(p0.col, 0, 'planting 0 col = 0');
  assertEq(p0.cellId, 'r0c0', 'planting 0 cellId = r0c0');
  assertTruthy(p0.bedName, 'planting 0 has bedName');
  assertTruthy(p0.cropName, 'planting 0 cropName resolved');

  const p1 = payload.plantings[1];
  assertEq(p1.crop, 'compact_tomato', 'planting 1 crop = tomato');
  assertEq(p1.col, 2, 'planting 1 col = 2');
}

// Empty workspace
{
  const ws = makeTestWorkspace({});
  setupRuntime(ws);
  T.setWorkspace(ws);
  const payload = T.buildSyncPayload();
  assertEq(payload.plantings.length, 0, 'empty bed → 0 plantings');
  assertTruthy(payload.meta.exportedAt, 'empty payload still has meta');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('14. Feature 4 — Today View: needs attention');
// ─────────────────────────────────────────────────────────────────────────────

{
  // Setup bed with stale plantings
  const ws = makeTestWorkspace({ crops: ['lettuce', 'compact_tomato', 'basil'] });
  // lettuce: planted 20 days ago, no events, planned status (index 0)
  ws.beds[0].plannerState.cells[0].plantedAt = new Date(Date.now() - 20 * 86400000).toISOString();
  // tomato: has recent event (index 1)
  ws.beds[0].plannerState.cells[1].events = [{type: 'germinated', date: new Date().toISOString(), note: ''}];
  ws.beds[0].plannerState.cells[1].status = 'growing';
  // basil: planted 3 days ago, no events (index 2)
  ws.beds[0].plannerState.cells[2].plantedAt = new Date(Date.now() - 3 * 86400000).toISOString();

  setupRuntime(ws);

  const attention = T.getTodayNeedsAttention();
  assertArray(attention, 'attention is array');
  assert(attention.length >= 1, 'at least 1 needs attention (lettuce stale)');

  // Lettuce should be flagged (planned > 14 days)
  const lettuceItem = attention.find(a => a.crop === 'lettuce');
  assertTruthy(lettuceItem, 'lettuce flagged as needing attention');
  assert(lettuceItem.reason.includes('planned'), 'lettuce reason mentions planned');

  // Tomato should NOT be flagged (has recent event)
  const tomatoItem = attention.find(a => a.crop === 'compact_tomato');
  assert(!tomatoItem, 'tomato with recent event NOT flagged');

  // basil: has no events but planted recently — should still be flagged as "no events"
  const basilItem = attention.find(a => a.crop === 'basil');
  assertTruthy(basilItem, 'basil flagged (no events logged)');
}

// Finished cells excluded
{
  const ws = makeTestWorkspace({ crops: ['lettuce'] });
  ws.beds[0].plannerState.cells[0].status = 'finished';
  setupRuntime(ws);
  const attention = T.getTodayNeedsAttention();
  assertEq(attention.length, 0, 'finished cells excluded from attention');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('15. Feature 4 — Today View: recent activity');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce', 'compact_tomato'] });
  ws.beds[0].plannerState.cells[0].events = [
    {type: 'seed_started', date: '2026-04-01T10:00:00Z', note: ''},
    {type: 'germinated', date: '2026-04-05T10:00:00Z', note: ''}
  ];
  ws.beds[0].plannerState.cells[1].events = [
    {type: 'direct_sown', date: '2026-04-03T10:00:00Z', note: ''}
  ];
  setupRuntime(ws);

  const activity = T.getTodayRecentActivity();
  assertArray(activity, 'activity is array');
  assertEq(activity.length, 3, '3 total events');
  // Newest first
  assertEq(activity[0].event.type, 'germinated', 'newest event first');
  assertEq(activity[1].event.type, 'direct_sown', 'second event');
  assertEq(activity[2].event.type, 'seed_started', 'oldest event last');
}

// Empty bed → empty activity
{
  const ws = makeTestWorkspace({});
  setupRuntime(ws);
  assertEq(T.getTodayRecentActivity().length, 0, 'empty bed → 0 activity');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('16. Feature 4 — Today View: quick stats');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce', 'compact_tomato', 'basil'] });
  ws.beds[0].plannerState.cells[0].status = 'growing';
  ws.beds[0].plannerState.cells[1].status = 'planned';
  ws.beds[0].plannerState.cells[2].status = 'harvesting';
  setupRuntime(ws);

  const stats = T.getTodayQuickStats();
  assertEq(stats.totalPlanted, 3, '3 planted cells');
  assertEq(stats.byStatus.growing, 1, '1 growing');
  assertEq(stats.byStatus.planned, 1, '1 planned');
  assertEq(stats.byStatus.harvesting, 1, '1 harvesting');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('17. Feature 5 — buildSeasonReview');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['compact_tomato', 'lettuce'] });
  ws.beds[0].plannerState.cells[0].status = 'finished';
  ws.beds[0].plannerState.cells[1].status = 'failed';
  ws.harvests = [
    {id:'h-1', cellId:'r0c0', crop:'compact_tomato', date:'2026-08-01', amount:5, unit:'lb', quality:'excellent', note:''},
    {id:'h-2', cellId:'r0c0', crop:'compact_tomato', date:'2026-08-15', amount:3, unit:'lb', quality:'good', note:''},
    {id:'h-3', cellId:'r0c1', crop:'lettuce', date:'2026-07-01', amount:2, unit:'bunch', quality:'fair', note:''},
  ];
  setupRuntime(ws);
  T.setWorkspace(ws);

  const review = T.buildSeasonReview();
  assertTruthy(review, 'review is not null');
  assertEq(review.crops.length, 2, '2 crops in review');

  const tomato = review.crops.find(c => c.cropKey === 'compact_tomato');
  assertTruthy(tomato, 'tomato in review');
  assertEq(tomato.harvestCount, 2, 'tomato: 2 harvests');
  assertEq(tomato.totalByUnit.lb, 8, 'tomato: 8 lb total');
  assertEq(tomato.successCount, 1, 'tomato: 1 finished');
  assertEq(tomato.failCount, 0, 'tomato: 0 failed');
  assert(tomato.avgQuality >= 3.5, 'tomato: avg quality >= 3.5 (excellent+good avg)');
  assertEq(tomato.avgQualityLabel, 'excellent', 'tomato: quality label = excellent (3.5 avg)');

  const lettuce = review.crops.find(c => c.cropKey === 'lettuce');
  assertTruthy(lettuce, 'lettuce in review');
  assertEq(lettuce.harvestCount, 1, 'lettuce: 1 harvest');
  assertEq(lettuce.totalByUnit.bunch, 2, 'lettuce: 2 bunches');
  assertEq(lettuce.failCount, 1, 'lettuce: 1 failed');
}

// No harvests → null
{
  const ws = makeTestWorkspace({});
  ws.harvests = [];
  setupRuntime(ws);
  T.setWorkspace(ws);
  assertNull(T.buildSeasonReview(), 'no harvests → null');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('18. Feature 5 — renderSeasonReview');
// ─────────────────────────────────────────────────────────────────────────────

{
  // With harvests
  const ws = makeTestWorkspace({ crops: ['compact_tomato'] });
  ws.harvests = [{id:'h-1', cellId:'r0c0', crop:'compact_tomato', date:'2026-08-01', amount:3, unit:'lb', quality:'good', note:''}];
  ws.seasonNotes = { compact_tomato: 'Great crop' };
  setupRuntime(ws);
  T.setWorkspace(ws);

  const html = T.renderSeasonReview();
  assert(html.includes('Season overview'), 'has title');
  assert(html.includes('season-crop-card'), 'has crop card');
  assert(html.includes('Compact Tomato') || html.includes('compact_tomato'), 'has crop name');
  assert(html.includes('3 lb'), 'has yield amount');
  assert(html.includes('Great crop'), 'has season note');
  assert(html.includes('exportSeasonBtn'), 'has export button');
}

// No harvests → empty
{
  const ws = makeTestWorkspace({});
  ws.harvests = [];
  setupRuntime(ws);
  T.setWorkspace(ws);
  assertEq(T.renderSeasonReview(), '', 'no harvests → empty string');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('19. Feature 5 — saveSeasonNote');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({});
  setupRuntime(ws);
  T.setWorkspace(ws);

  T.saveSeasonNote('compact_tomato', 'Plant earlier next year');
  assertEq(T.getWorkspace().seasonNotes['compact_tomato'], 'Plant earlier next year', 'note saved');

  T.saveSeasonNote('compact_tomato', '');
  assertEq(T.getWorkspace().seasonNotes['compact_tomato'], '', 'note cleared');

  // Max length enforcement
  const longNote = 'x'.repeat(3000);
  T.saveSeasonNote('lettuce', longNote);
  assertEq(T.getWorkspace().seasonNotes.lettuce.length, 2000, 'note truncated to 2000 chars');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('20. Undo/Redo with planting fields');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce'] });
  const rBed = setupRuntime(ws);

  // Take snapshot
  const snap = T.bedSnapshot();
  assertEq(snap.length, rBed.length, 'snapshot length matches bed');
  assertEq(snap[0].crop, 'lettuce', 'snapshot captures crop');
  assertTruthy(snap[0].plantingId, 'snapshot captures plantingId');
  assertEq(snap[0].status, 'planned', 'snapshot captures status');
  assertDeep(snap[0].events, [], 'snapshot captures events');

  // Mutate bed
  rBed[0].status = 'growing';
  rBed[0].events.push({type: 'germinated', date: new Date().toISOString(), note: ''});

  // Restore snapshot
  const ok = T.restoreSnapshot(snap);
  assert(ok, 'restore returns true');
  assertEq(rBed[0].status, 'planned', 'status restored to planned');
  assertDeep(rBed[0].events, [], 'events restored to empty');

  // Invalid snapshot
  assert(!T.restoreSnapshot([]), 'empty snapshot rejected');
  assert(!T.restoreSnapshot(null), 'null snapshot rejected');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('21. Migration v1 → v2 (legacy flat string cells)');
// ─────────────────────────────────────────────────────────────────────────────

{
  // Simulate a v1 workspace with flat string cells
  const v1ws = {
    id: 'ws-old', version: 1,
    beds: [{
      id: 'bed-old', name: 'Legacy Bed',
      size: {cols: 2, rows: 2},
      plannerState: {
        cells: ['lettuce', null, 'compact_tomato', null],
        selectedCrop: 'lettuce', activeTool: 'paint',
        site: { sunHours: 6, orientation: 'ew', season: 'summer' }
      }
    }],
    harvests: [{id:'h-1', cellId:'r0c0', crop:'lettuce', date:'2026-07-01', amount:1, unit:'bunch', quality:'good', note:''}]
  };

  const result = T.validateWorkspace(v1ws);
  assert(result.ok, 'v1 workspace validates OK');
  assertEq(result.workspace.version, 2, 'migrated to version 2');

  const cell0 = result.workspace.beds[0].plannerState.cells[0];
  assertTruthy(cell0, 'cell 0 exists');
  assertEq(cell0.crop, 'lettuce', 'cell 0 crop preserved');
  assertTruthy(cell0.plantingId, 'cell 0 gets plantingId');
  assertEq(cell0.status, 'planned', 'cell 0 status = planned');
  assertDeep(cell0.events, [], 'cell 0 events = []');

  assertNull(result.workspace.beds[0].plannerState.cells[1], 'null cell stays null');
  assertEq(result.workspace.beds[0].plannerState.cells[2].crop, 'compact_tomato', 'cell 2 crop preserved');
  assertEq(result.workspace.harvests.length, 1, 'harvests preserved');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('22. INSIGHT_SECTION_MAP includes today');
// ─────────────────────────────────────────────────────────────────────────────

assertEq(T.INSIGHT_SECTION_MAP.today, 'insightToday', 'today maps to insightToday');
assertEq(T.INSIGHT_SECTION_MAP.score, 'insightSummary', 'score maps to insightSummary');
assertEq(T.INSIGHT_SECTION_MAP.harvest, 'insightHarvest', 'harvest maps to insightHarvest');


// ─────────────────────────────────────────────────────────────────────────────
suite('23. Edge case — empty bed in all features');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({});
  setupRuntime(ws);
  T.setWorkspace(ws);

  // Event logger: empty cell
  assertEq(T.renderEventLogger(T.getBed()[0]), '', 'event logger: empty cell → empty');

  // Status visuals: null
  const sv = T.getStatusVisuals(null);
  assertTruthy(sv.bg, 'status visuals: null → fallback');

  // Sync payload: empty
  const payload = T.buildSyncPayload();
  assertEq(payload.plantings.length, 0, 'sync: empty bed → 0 plantings');

  // Today: attention on empty bed
  const attn = T.getTodayNeedsAttention();
  assertEq(attn.length, 0, 'today: empty bed → 0 attention items');

  // Today: stats on empty bed
  const stats = T.getTodayQuickStats();
  assertEq(stats.totalPlanted, 0, 'today: empty bed → 0 planted');

  // Season review: no harvests
  ws.harvests = [];
  assertNull(T.buildSeasonReview(), 'season: no harvests → null');
  assertEq(T.renderSeasonReview(), '', 'season: no harvests → empty html');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('24. Edge case — rapid event logging');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['lettuce'] });
  setupRuntime(ws);

  for (let i = 0; i < 20; i++) {
    T.logCellEvent('r0c0', 'note');
  }
  assertEq(T.getBed()[0].events.length, 20, '20 rapid events all logged');
  assertEq(T.getBed()[0].status, 'planned', 'note events did not change status');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('25. Edge case — full status lifecycle');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['compact_tomato'] });
  setupRuntime(ws);

  assertEq(T.getBed()[0].status, 'planned', 'start: planned');

  T.logCellEvent('r0c0', 'seed_started');
  assertEq(T.getBed()[0].status, 'started_indoors', 'after seed: started_indoors');

  T.logCellEvent('r0c0', 'transplanted');
  assertEq(T.getBed()[0].status, 'transplanted', 'after transplant: transplanted');

  T.logCellEvent('r0c0', 'germinated');
  assertEq(T.getBed()[0].status, 'growing', 'after germ: growing');

  T.logCellEvent('r0c0', 'fertilized');
  assertEq(T.getBed()[0].status, 'growing', 'after fert: still growing');

  T.logCellEvent('r0c0', 'pest_issue');
  assertEq(T.getBed()[0].status, 'growing', 'after pest: still growing');

  T.logCellEvent('r0c0', 'harvested');
  assertEq(T.getBed()[0].status, 'harvesting', 'after harvest: harvesting');

  T.logCellEvent('r0c0', 'harvested');
  assertEq(T.getBed()[0].status, 'harvesting', 'double harvest: still harvesting');

  T.logCellEvent('r0c0', 'removed');
  assertEq(T.getBed()[0].status, 'finished', 'after removed: finished');

  assertEq(T.getBed()[0].events.length, 8, '8 events in full lifecycle');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('26. Edge case — sync payload with events');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ws = makeTestWorkspace({ crops: ['compact_tomato'] });
  ws.beds[0].plannerState.cells[0].events = [
    {type: 'seed_started', date: '2026-03-01T10:00:00Z', note: 'test'}
  ];
  ws.beds[0].plannerState.cells[0].status = 'started_indoors';
  setupRuntime(ws);
  T.setWorkspace(ws);

  const payload = T.buildSyncPayload();
  const p = payload.plantings[0];
  assertEq(p.events.length, 1, 'sync includes events');
  assertEq(p.events[0].type, 'seed_started', 'sync event type correct');
  assertEq(p.status, 'started_indoors', 'sync status correct');
}


// ─────────────────────────────────────────────────────────────────────────────
suite('27. uniqueId generation');
// ─────────────────────────────────────────────────────────────────────────────

{
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(T.uniqueId('test'));
  assertEq(ids.size, 100, '100 unique IDs generated');
  const sample = T.uniqueId('pl');
  assert(sample.startsWith('pl-'), 'ID starts with prefix');
  assert(sample.length > 8, 'ID has reasonable length');
}

suite('28. Family recipe bridge');

assertType(T.validateFamilyRecipeSnapshot, 'function', 'validateFamilyRecipeSnapshot');
assertType(T.matchFamilyRecipes, 'function', 'matchFamilyRecipes');

{
  const valid = T.validateFamilyRecipeSnapshot({
    schemaVersion: 1,
    exportedAt: '2026-04-20T12:00:00.000Z',
    recipes: [
      {
        id: 'family-moms-sauce',
        name: "Mom's Sunday Sauce",
        url: 'https://example.com/recipes/family-moms-sauce',
        ingredients_raw: ['tomatoes', 'basil', 'salt'],
        garden_ingredient_tokens: ['tomato', 'basil'],
        tags: ['family'],
      },
    ],
  });
  assert(valid.ok, 'valid family recipe snapshot accepted');
}

{
  const invalid = T.validateFamilyRecipeSnapshot({ schemaVersion: 99, recipes: [] });
  assert(!invalid.ok, 'unsupported schema version rejected');
}

{
  const ws = makeTestWorkspace({ crops: ['cherry_tom', 'basil', 'onion'] });
  setupRuntime(ws);
  const result = T.matchFamilyRecipes(T.getBed(), {
    schemaVersion: 1,
    exportedAt: '2026-04-20T12:00:00.000Z',
    recipes: [
      {
        id: 'family-moms-sauce',
        name: "Mom's Sunday Sauce",
        url: 'https://example.com/recipes/family-moms-sauce',
        ingredients_raw: ['tomatoes', 'basil', 'salt'],
        garden_ingredient_tokens: ['tomato', 'basil'],
        tags: ['family'],
      },
      {
        id: 'family-salsa',
        name: 'Fresh Garden Salsa',
        url: 'https://example.com/recipes/family-salsa',
        ingredients_raw: ['tomatoes', 'cilantro', 'hot pepper'],
        garden_ingredient_tokens: ['tomato', 'cilantro', 'pepper'],
        tags: ['family'],
      },
    ],
  });

  assertEq(result.fullMatches.length, 1, 'one full family recipe match found');
  assertEq(result.fullMatches[0].id, 'family-moms-sauce', 'matching recipe ID preserved');
}


// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log(`  Total: ${_total}  Pass: ${_pass}  Fail: ${_fail}`);
if (_fail > 0) {
  console.log('\n  FAILURES:');
  _errors.forEach(e => console.log(`    ✗ ${e}`));
}
console.log('═══════════════════════════════════════');
process.exit(_fail > 0 ? 1 : 0);
