/* gos-bed.js — canonical bed data primitive for Garden OS v5 surfaces.
 *
 * Single shared localStorage namespace, no framework, no build step.
 * Attaches a vanilla `GosBed` namespace to `window`. Safe to load before
 * any React + Babel CDN bundles on the page; React surfaces can read and
 * write through GosBed.* without taking a dependency on it.
 *
 * Schema (v1):
 *   localStorage["gos.bed.<id>"] = {
 *     schemaVersion: 1,
 *     id: "front-bed",
 *     name: "Front Bed",
 *     shape: "4x8",        // "<cols>x<rows>"
 *     sun: "full",         // "full" | "partial" | "shade"
 *     painted: [
 *       { cell: "r0c2", cropId, cropName, cropIcon, cropColor }, ...
 *     ],
 *     events: [                  // appended by item #4 (Plan timeline)
 *       { type: "mark_done"|"harvest", bedId, season, cropSnapshot,
 *         cell, timestamp, quantity, unit, notes }, ...
 *     ],
 *     lastEdited: "<ISO8601>",
 *     ruleVersion: null,
 *     seasonStart: "standard"   // "standard" | "retroactive"
 *   }
 *
 * Plus three meta keys:
 *   localStorage["gos.bed.pending"]   — staged bed in onboarding
 *   localStorage["gos.session.lock"]  — { tabId, timestamp }
 *   localStorage["gos.activeBed"]     — id of the bed surfaces should
 *                                       open by default
 */
(function (global) {
  'use strict';

  var BED_PREFIX     = 'gos.bed.';
  var PENDING_KEY    = 'gos.bed.pending';
  var LOCK_KEY       = 'gos.session.lock';
  var ACTIVE_BED_KEY = 'gos.activeBed';
  var SCHEMA_VERSION = 1;
  var WARNING_BYTES  = 4000000;

  var TAB_ID = generateTabId();

  function generateTabId() {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (_) { /* fall through */ }
    return 'tab-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }

  function safeGet(key) {
    try { return global.localStorage.getItem(key); }
    catch (_) { return null; }
  }
  function safeSet(key, value) {
    try { global.localStorage.setItem(key, value); return true; }
    catch (e) { return false; }
  }
  function safeRemove(key) {
    try { global.localStorage.removeItem(key); return true; }
    catch (_) { return false; }
  }
  function parseJson(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); }
    catch (_) { return null; }
  }

  function validateBedShape(bed) {
    if (!bed || typeof bed !== 'object') {
      throw new Error('GosBed.write: bedData must be an object');
    }
    if (!bed.id || typeof bed.id !== 'string') {
      throw new Error('GosBed.write: bedData.id is required (string)');
    }
    if (!bed.shape || typeof bed.shape !== 'string') {
      throw new Error('GosBed.write: bedData.shape is required (e.g. "4x8")');
    }
    if (!bed.sun || typeof bed.sun !== 'string') {
      throw new Error('GosBed.write: bedData.sun is required (e.g. "full")');
    }
  }

  function checkLock() {
    var raw = safeGet(LOCK_KEY);
    if (!raw) return; // no lock, fine
    var lock = parseJson(raw);
    if (!lock) return;
    if (lock.tabId && lock.tabId !== TAB_ID) {
      throw new Error('Concurrent write conflict: another window has an active session.');
    }
  }

  function writeBed(bedData) {
    validateBedShape(bedData);
    checkLock();
    var now = new Date().toISOString();
    var record = {
      schemaVersion: SCHEMA_VERSION,
      id: bedData.id,
      name: bedData.name || bedData.id,
      shape: bedData.shape,
      sun: bedData.sun,
      painted: Array.isArray(bedData.painted) ? bedData.painted : [],
      events: Array.isArray(bedData.events) ? bedData.events : [],
      lastEdited: now,
      ruleVersion: bedData.ruleVersion != null ? bedData.ruleVersion : null,
      seasonStart: bedData.seasonStart || 'standard'
    };
    var ok = safeSet(BED_PREFIX + bedData.id, JSON.stringify(record));
    if (!ok) {
      throw new Error('GosBed.write: localStorage write failed (quota or disabled)');
    }
    return record;
  }

  function readBed(id) {
    if (!id) return null;
    var raw = safeGet(BED_PREFIX + id);
    return parseJson(raw);
  }

  function readAllBeds() {
    var out = [];
    if (!global.localStorage) return out;
    for (var i = 0; i < global.localStorage.length; i++) {
      var k = global.localStorage.key(i);
      if (!k) continue;
      if (k.indexOf(BED_PREFIX) !== 0) continue;
      if (k === PENDING_KEY) continue;
      var v = parseJson(global.localStorage.getItem(k));
      if (v) out.push(v);
    }
    out.sort(function (a, b) {
      var aT = a.lastEdited || '';
      var bT = b.lastEdited || '';
      if (aT === bT) return 0;
      return aT < bT ? 1 : -1; // descending
    });
    return out;
  }

  function getActive() {
    var id = safeGet(ACTIVE_BED_KEY);
    if (id) {
      var bed = readBed(id);
      if (bed) return bed;
    }
    var all = readAllBeds();
    return all.length ? all[0] : null;
  }

  function setActive(id) {
    if (!id) {
      safeRemove(ACTIVE_BED_KEY);
      return null;
    }
    safeSet(ACTIVE_BED_KEY, id);
    return id;
  }

  function deleteBed(id) {
    if (!id) return false;
    var existed = !!safeGet(BED_PREFIX + id);
    safeRemove(BED_PREFIX + id);
    if (safeGet(ACTIVE_BED_KEY) === id) safeRemove(ACTIVE_BED_KEY);
    return existed;
  }

  function writePending(bedData) {
    if (!bedData || typeof bedData !== 'object') {
      throw new Error('GosBed.writePending: bedData must be an object');
    }
    var ok = safeSet(PENDING_KEY, JSON.stringify(bedData));
    if (!ok) {
      throw new Error('GosBed.writePending: localStorage write failed');
    }
    return bedData;
  }

  function commitPending() {
    var raw = safeGet(PENDING_KEY);
    var pending = parseJson(raw);
    if (!pending) return null;
    var committed;
    try {
      committed = writeBed(pending);
    } catch (e) {
      throw e;
    }
    safeRemove(PENDING_KEY);
    return committed;
  }

  function discardPending() {
    safeRemove(PENDING_KEY);
  }

  function initSessionLock() {
    var lock = { tabId: TAB_ID, timestamp: new Date().toISOString() };
    safeSet(LOCK_KEY, JSON.stringify(lock));
    return TAB_ID;
  }

  function estimateStorageUsage() {
    var used = 0;
    if (!global.localStorage) {
      return { usedBytes: 0, warningThreshold: WARNING_BYTES, isOverThreshold: false };
    }
    for (var i = 0; i < global.localStorage.length; i++) {
      var k = global.localStorage.key(i);
      if (!k) continue;
      if (k.indexOf('gos.') !== 0) continue;
      var v = global.localStorage.getItem(k) || '';
      // approx UTF-16 in JS strings: 2 bytes per character
      used += (k.length + v.length) * 2;
    }
    return {
      usedBytes: used,
      warningThreshold: WARNING_BYTES,
      isOverThreshold: used > WARNING_BYTES
    };
  }

  // ── Helpers exposed for surface code ─────────────────────────────────────

  // Parse "4x8" → { cols: 4, rows: 8 }. Returns null if malformed.
  function parseShape(shape) {
    if (typeof shape !== 'string') return null;
    var m = shape.match(/^(\d+)x(\d+)$/i);
    if (!m) return null;
    return { cols: parseInt(m[1], 10), rows: parseInt(m[2], 10) };
  }

  // "r2c5" → { r: 2, c: 5 }. Returns null if malformed.
  function parseCell(cellStr) {
    if (typeof cellStr !== 'string') return null;
    var m = cellStr.match(/^r(\d+)c(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
  }

  function formatCell(r, c) {
    return 'r' + r + 'c' + c;
  }

  global.GosBed = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    write: writeBed,
    read: readBed,
    readAll: readAllBeds,
    getActive: getActive,
    setActive: setActive,
    delete: deleteBed,
    writePending: writePending,
    commitPending: commitPending,
    discardPending: discardPending,
    initSessionLock: initSessionLock,
    estimateStorageUsage: estimateStorageUsage,
    parseShape: parseShape,
    parseCell: parseCell,
    formatCell: formatCell,
    _tabId: function () { return TAB_ID; }
  };
})(typeof window !== 'undefined' ? window : this);
