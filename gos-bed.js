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

  // ── Cross-device sync (optional) ────────────────────────────────────────
  // Stores per-bed sync metadata in localStorage["gos.sync.<bedId>"]:
  //   { code, secret, workerUrl, lastPushedAt }
  // The workspace-level default Worker URL (used by Join flows) lives in
  //   localStorage["gos.sync.workerUrl"]
  // No method changes the core GosBed.* API; sync is purely additive.

  var SYNC_PREFIX  = 'gos.sync.';
  var SYNC_DEFAULT = 'gos.sync.workerUrl';

  function syncKey(bedId) { return SYNC_PREFIX + bedId; }

  function readSyncMeta(bedId) {
    if (!bedId) return null;
    return parseJson(safeGet(syncKey(bedId)));
  }
  function writeSyncMeta(bedId, meta) {
    if (!bedId) return false;
    return safeSet(syncKey(bedId), JSON.stringify(meta));
  }
  function clearSyncMeta(bedId) {
    if (!bedId) return false;
    return safeRemove(syncKey(bedId));
  }

  function trimWorkerUrl(workerUrl) {
    if (typeof workerUrl !== 'string') return '';
    return workerUrl.replace(/\/+$/, '');
  }

  async function postBeds(workerUrl, payload) {
    var res = await fetch(trimWorkerUrl(workerUrl) + '/beds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || !json.ok) {
      throw new Error('GosBed.sync.create failed: ' + (json && json.error ? json.error : res.status));
    }
    return json;
  }
  async function putBed(workerUrl, code, payload) {
    var res = await fetch(trimWorkerUrl(workerUrl) + '/beds/' + code, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || !json.ok) {
      throw new Error('GosBed.sync.push failed: ' + (json && json.error ? json.error : res.status));
    }
    return json;
  }
  async function getBed(workerUrl, code) {
    var res = await fetch(trimWorkerUrl(workerUrl) + '/beds/' + code, { method: 'GET' });
    var json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || !json.ok) {
      throw new Error('GosBed.sync.pull failed: ' + (json && json.error ? json.error : res.status));
    }
    return json;
  }
  async function deleteBedRemote(workerUrl, code, secret) {
    var res = await fetch(trimWorkerUrl(workerUrl) + '/beds/' + code, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret }),
    });
    var json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || !json.ok) {
      var errorCode = json && json.error ? json.error : null;
      var err = new Error('GosBed.sync.revoke failed: ' + (errorCode || res.status));
      err.status = res.status;
      err.errorCode = errorCode;
      throw err;
    }
    return json;
  }

  async function syncCreate(bedId, workerUrl) {
    var bed = readBed(bedId);
    if (!bed) throw new Error('GosBed.sync.create: no bed with id ' + bedId);
    if (!workerUrl) throw new Error('GosBed.sync.create: workerUrl is required');
    var resp = await postBeds(workerUrl, { data: bed });
    var meta = {
      code: resp.code,
      secret: resp.secret,
      workerUrl: trimWorkerUrl(workerUrl),
      lastPushedAt: resp.updatedAt || new Date().toISOString(),
    };
    writeSyncMeta(bedId, meta);
    return { code: meta.code, url: resp.url };
  }

  async function syncPush(bedId) {
    var meta = readSyncMeta(bedId);
    if (!meta || !meta.code) throw new Error('No sync code for this bed');
    var bed = readBed(bedId);
    if (!bed) throw new Error('GosBed.sync.push: no bed with id ' + bedId);
    var resp = await putBed(meta.workerUrl, meta.code, { data: bed, secret: meta.secret });
    meta.lastPushedAt = resp.updatedAt || new Date().toISOString();
    writeSyncMeta(bedId, meta);
    return { ok: true, updatedAt: meta.lastPushedAt };
  }

  async function syncPull(code, workerUrl) {
    if (!code || !workerUrl) {
      throw new Error('GosBed.sync.pull: code and workerUrl are required');
    }
    var resp = await getBed(workerUrl, code);
    return resp.data;
  }

  function generateUniqueImportedBedId(baseId) {
    if (!readBed(baseId)) return baseId;
    var firstAttempt = baseId + '-imported';
    if (!readBed(firstAttempt)) return firstAttempt;
    for (var i = 2; i < 100; i++) {
      var candidate = baseId + '-imported-' + i;
      if (!readBed(candidate)) return candidate;
    }
    return baseId + '-imported-' + Date.now().toString(36);
  }

  async function syncImportFromCode(code, workerUrl, options) {
    options = options || {};
    var bed = await syncPull(code, workerUrl);
    if (!bed || typeof bed !== 'object' || !bed.id) {
      throw new Error('GosBed.sync.importFromCode: invalid bed payload');
    }
    var existing = readBed(bed.id);
    if (existing && options.onCollision !== 'overwrite' && options.onCollision !== 'rename') {
      var err = new Error('A local bed already exists with id "' + bed.id + '"');
      err.code = 'collision';
      err.existingBedId = bed.id;
      err.existingBedName = existing.name || existing.id;
      err.incomingBedName = bed.name || bed.id;
      throw err;
    }
    if (existing && options.onCollision === 'rename') {
      var newId = generateUniqueImportedBedId(bed.id);
      bed.id = newId;
      bed.name = (bed.name || newId) + ' (imported)';
    }
    writeBed(bed);
    setActive(bed.id);
    return bed;
  }

  function syncGetCode(bedId) {
    return readSyncMeta(bedId);
  }

  async function syncRevoke(bedId) {
    var meta = readSyncMeta(bedId);
    if (!meta || !meta.code) throw new Error('GosBed.sync.revoke: no sync metadata for ' + bedId);
    try {
      await deleteBedRemote(meta.workerUrl, meta.code, meta.secret);
    } catch (e) {
      // If the remote record is already gone (expired or previously revoked),
      // clearing local metadata is safe — there is nothing to retry against.
      if (e && e.errorCode === 'not_found') {
        clearSyncMeta(bedId);
        return { ok: true, alreadyGone: true };
      }
      // Otherwise preserve metadata so the user can retry — the shared link
      // may still be live and the secret is the only way to revoke it.
      throw e;
    }
    clearSyncMeta(bedId);
    return { ok: true };
  }

  function syncGetDefaultWorkerUrl() {
    var v = safeGet(SYNC_DEFAULT);
    return v || '';
  }
  function syncSetDefaultWorkerUrl(workerUrl) {
    var trimmed = trimWorkerUrl(workerUrl);
    if (!trimmed) return false;
    return safeSet(SYNC_DEFAULT, trimmed);
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
    sync: {
      create: syncCreate,
      push: syncPush,
      pull: syncPull,
      importFromCode: syncImportFromCode,
      getCode: syncGetCode,
      revoke: syncRevoke,
      getDefaultWorkerUrl: syncGetDefaultWorkerUrl,
      setDefaultWorkerUrl: syncSetDefaultWorkerUrl,
    },
    _tabId: function () { return TAB_ID; }
  };
})(typeof window !== 'undefined' ? window : this);
