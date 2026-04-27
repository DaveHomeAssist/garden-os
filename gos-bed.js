/* gos-bed.js — canonical bed data primitive for Garden OS v5 surfaces.
 *
 * Single shared localStorage namespace, no framework, no build step.
 * Attaches a vanilla `GosBed` namespace to `window`. Safe to load before
 * any React + Babel CDN bundles on the page; React surfaces can read and
 * write through GosBed.* without taking a dependency on it.
 *
 * Schema (v1, additive across releases):
 *   localStorage["gos.bed.<id>"] = {
 *     schemaVersion: 1,
 *     id: "front-bed",
 *     name: "Front Bed",
 *     shape: "4x8",            // "<cols>x<rows>"
 *     sun: "full",             // "full" | "partial" | "shade"
 *
 *     // Optional site context — round-tripped if present. Surfaces fall
 *     // back to defaults when absent so old beds keep working.
 *     zone:           "7a",    // USDA hardiness zone label
 *     wallSide:       "back",  // "back" | "front" | "left" | "right" | "none"
 *     sunHoursNumeric: 6,      // measured/estimated daily sun hours
 *     water:          "drip",  // "drip" | "manual" | "rainfed" | "unknown"
 *     orientation:    "ew",    // "ew" (long side faces south) | "ns"
 *
 *     painted: [
 *       { cell: "r0c2", cropId, cropName, cropIcon, cropColor,
 *         plantedAt: "<ISO8601>",   // optional, when this cell was sown
 *         plantedWeek: 16 }, ...    // optional ISO week of plantedAt
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

  function ConcurrentWriteError(message) {
    this.name = 'ConcurrentWriteError';
    this.message = message || 'Concurrent write conflict';
    this.code = 'CONCURRENT_WRITE';
    if (Error.captureStackTrace) Error.captureStackTrace(this, ConcurrentWriteError);
  }
  ConcurrentWriteError.prototype = Object.create(Error.prototype);
  ConcurrentWriteError.prototype.constructor = ConcurrentWriteError;

  function checkLock() {
    var raw = safeGet(LOCK_KEY);
    if (!raw) return; // no lock, fine
    var lock = parseJson(raw);
    if (!lock) return;
    if (lock.tabId && lock.tabId !== TAB_ID) {
      throw new Error('Concurrent write conflict: another window has an active session.');
    }
  }

  // Allowed enum values for optional bedContext fields. We accept anything
  // the caller passes (kept loose so future values don't require a writer
  // change), but document the canonical set so surfaces agree on shape.
  var WALL_SIDES   = ['back', 'front', 'left', 'right', 'none'];
  var WATER_KINDS  = ['drip', 'manual', 'rainfed', 'unknown'];
  var ORIENTATIONS = ['ew', 'ns'];

  function copyPaintedEntry(p) {
    if (!p || typeof p !== 'object') return p;
    var out = {
      id: p.id,
      cell: p.cell,
      cropId: p.cropId,
      cropName: p.cropName,
      cropIcon: p.cropIcon,
      cropColor: p.cropColor,
      displayName: p.displayName,
      varietyName: p.varietyName == null ? null : p.varietyName,
      status: p.status,
      bedLocation: p.bedLocation,
      sourceBedName: p.sourceBedName,
      placementConfidence: p.placementConfidence,
      placementNote: p.placementNote,
      label: p.label,
      sourcePlantingId: p.sourcePlantingId,
      sourcePlantingCellIndex: p.sourcePlantingCellIndex,
      notes: p.notes
    };
    // Round-trip optional planting timestamp + ISO week when present.
    // Surfaces that don't set these (older code, fixtures) stay back-compat.
    if (typeof p.plantedAt === 'string' && p.plantedAt) out.plantedAt = p.plantedAt;
    if (typeof p.plantedOnStart === 'string' && p.plantedOnStart) out.plantedOnStart = p.plantedOnStart;
    if (typeof p.plantedOnEnd === 'string' && p.plantedOnEnd) out.plantedOnEnd = p.plantedOnEnd;
    if (typeof p.season === 'string' && p.season) out.season = p.season;
    if (typeof p.plantedWeek === 'number' && isFinite(p.plantedWeek)) {
      out.plantedWeek = p.plantedWeek;
    }
    Object.keys(out).forEach(function (k) {
      if (out[k] === undefined) delete out[k];
    });
    return out;
  }

  function normalizeRevision(bed) {
    if (!bed || typeof bed !== 'object') return 0;
    return (typeof bed.revision === 'number' && isFinite(bed.revision) && bed.revision >= 0)
      ? Math.floor(bed.revision)
      : 0;
  }

  function writeBed(bedData, options) {
    options = options || {};
    validateBedShape(bedData);
    checkLock();
    var now = new Date().toISOString();
    var current = readBed(bedData.id);
    var currentRevision = normalizeRevision(current);
    if (options.expectedRevision != null && options.expectedRevision !== currentRevision) {
      throw new ConcurrentWriteError('GosBed.write: expected revision ' + options.expectedRevision + ' but found ' + currentRevision);
    }
    var paintedSrc = Array.isArray(bedData.painted) ? bedData.painted : [];
    var record = {
      schemaVersion: SCHEMA_VERSION,
      revision: currentRevision + 1,
      id: bedData.id,
      name: bedData.name || bedData.id,
      shape: bedData.shape,
      sun: bedData.sun,
      painted: paintedSrc.map(copyPaintedEntry),
      events: Array.isArray(bedData.events) ? bedData.events : [],
      lastEdited: now,
      ruleVersion: bedData.ruleVersion != null ? bedData.ruleVersion : null,
      seasonStart: bedData.seasonStart || 'standard'
    };
    if (typeof bedData.type === 'string' && bedData.type) record.type = bedData.type;
    if (typeof bedData.source === 'string' && bedData.source) record.source = bedData.source;
    if (typeof bedData.loadedAt === 'string' && bedData.loadedAt) record.loadedAt = bedData.loadedAt;
    if (typeof bedData.comment === 'string' && bedData.comment) record.comment = bedData.comment;
    if (typeof bedData.momGarden === 'boolean') record.momGarden = bedData.momGarden;
    // Optional bedContext — only persist if the caller supplied it. Keeps
    // pre-context beds visually identical when re-saved.
    if (typeof bedData.zone === 'string' && bedData.zone) record.zone = bedData.zone;
    if (typeof bedData.wallSide === 'string' && bedData.wallSide) record.wallSide = bedData.wallSide;
    if (typeof bedData.sunHoursNumeric === 'number' && isFinite(bedData.sunHoursNumeric)) {
      record.sunHoursNumeric = bedData.sunHoursNumeric;
    }
    if (typeof bedData.water === 'string' && bedData.water) record.water = bedData.water;
    if (typeof bedData.orientation === 'string' && bedData.orientation) {
      record.orientation = bedData.orientation;
    }
    if (bedData.dimensions && typeof bedData.dimensions === 'object') {
      var rows = parseInt(bedData.dimensions.rows, 10);
      var cols = parseInt(bedData.dimensions.cols, 10);
      if (isFinite(rows) && rows > 0 && isFinite(cols) && cols > 0) {
        record.dimensions = { rows: rows, cols: cols };
      }
    }
    if (typeof bedData.location === 'string' && bedData.location) record.location = bedData.location;
    if (typeof bedData.lastFrostWeek === 'number' && isFinite(bedData.lastFrostWeek)) record.lastFrostWeek = bedData.lastFrostWeek;
    if (typeof bedData.firstFrostWeek === 'number' && isFinite(bedData.firstFrostWeek)) record.firstFrostWeek = bedData.firstFrostWeek;
    if (bedData.frostWeeks && typeof bedData.frostWeeks === 'object') record.frostWeeks = bedData.frostWeeks;
    var ok = safeSet(BED_PREFIX + bedData.id, JSON.stringify(record));
    if (!ok) {
      throw new Error('GosBed.write: localStorage write failed (quota or disabled)');
    }
    return record;
  }

  function readBed(id) {
    if (!id) return null;
    var raw = safeGet(BED_PREFIX + id);
    var bed = parseJson(raw);
    if (bed && typeof bed === 'object' && bed.revision == null) bed.revision = 0;
    return bed;
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
      if (v) {
        if (v.revision == null) v.revision = 0;
        out.push(v);
      }
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

  // ISO week of the year for `date`. Matches the Planner's existing helper so
  // surfaces compute plantedWeek from plantedAt the same way without copy-
  // pasting the algorithm.
  function isoWeek(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    var utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  }

  function currentIsoDate() { return new Date().toISOString(); }
  function currentIsoWeek() { return isoWeek(new Date()); }

  // Best-effort: return a numeric ISO week for a painted entry. Prefers an
  // explicit plantedWeek; falls back to deriving from plantedAt; returns null
  // if neither is present so callers can decide their own catalog fallback.
  function plantedWeekOf(painted) {
    if (!painted || typeof painted !== 'object') return null;
    if (typeof painted.plantedWeek === 'number' && isFinite(painted.plantedWeek)) {
      return painted.plantedWeek;
    }
    if (typeof painted.plantedAt === 'string' && painted.plantedAt) {
      return isoWeek(painted.plantedAt);
    }
    return null;
  }

  // ── Mom-first static data loader ────────────────────────────────────────
  var MOM_SOURCE = 'mom-garden-data.json v2';

  function countMomPlantings(data) {
    if (!data || !Array.isArray(data.beds)) return 0;
    return data.beds.reduce(function (sum, bed) {
      return sum + (Array.isArray(bed.plantings) ? bed.plantings.reduce(function (bedSum, planting) {
        return bedSum + (Array.isArray(planting.cells) && planting.cells.length ? planting.cells.length : 1);
      }, 0) : 0);
    }, 0);
  }

  function rowFromLocation(location) {
    var m = String(location || '').match(/Row\s+(\d+)/i);
    return m ? Math.max(0, parseInt(m[1], 10) - 1) : null;
  }

  function bagFromLocation(location) {
    var m = String(location || '').match(/Bag\s+(\d+)/i);
    return m ? Math.max(0, parseInt(m[1], 10) - 1) : null;
  }

  function nextOpenColumn(used, row, cols) {
    for (var c = 0; c < cols; c++) {
      if (!used[row + ':' + c]) return c;
    }
    return null;
  }

  function growBagLabel(row, col, rows, cols) {
    if (rows > 1) return 'Bag ' + (row + 1);
    return 'Bag ' + (col + 1);
  }

  function explicitCellTargets(cells, rows, cols) {
    if (!Array.isArray(cells)) return [];
    return cells.map(parseCell).filter(function (cell) {
      return cell && cell.r >= 0 && cell.c >= 0 && cell.r < rows && cell.c < cols;
    }).map(function (cell) {
      return { row: cell.r, col: cell.c, confidence: 'explicit-cell', note: null };
    });
  }

  function fallbackCellTarget(srcBed, planting, index, used, rows, cols) {
    var row = null;
    var col = null;
    var confidence = 'unknown';
    var note = '';
    if (srcBed.type === 'grow_bags') {
      row = rows > 1 ? bagFromLocation(planting.bedLocation) : 0;
      col = rows > 1 ? nextOpenColumn(used, row, cols) : bagFromLocation(planting.bedLocation);
      confidence = (row == null && col == null) ? 'auto' : 'explicit';
    } else {
      row = rowFromLocation(planting.bedLocation);
      if (row != null) {
        col = nextOpenColumn(used, row, cols);
        confidence = 'row';
        note = 'Garden OS placed left-to-right within the source row.';
      }
    }
    if (row == null || row >= rows) row = Math.min(rows - 1, Math.floor(index / cols));
    if (col == null || col >= cols) {
      col = nextOpenColumn(used, row, cols);
      if (col == null) col = Math.min(cols - 1, index % cols);
      if (confidence === 'unknown') confidence = 'auto';
      if (!note) note = 'Garden OS placed this planting because the source did not include an exact cell.';
    }
    return { row: row, col: col, confidence: confidence, note: note || null };
  }

  function createJournalEvent(message, bedId, loadedAt, payload) {
    return {
      type: 'journal',
      source: MOM_SOURCE,
      bedId: bedId,
      timestamp: loadedAt,
      message: message,
      payload: payload || null
    };
  }

  function plantingJournalMessage(planting, bedName) {
    var variety = planting.varietyName ? ' ' + planting.varietyName : '';
    var loc = planting.bedLocation ? ' (' + planting.bedLocation + ')' : '';
    return planting.displayName + variety + ' ' + String(planting.status || 'planted').toLowerCase() +
      ' in ' + bedName + loc + '.';
  }

  function buildMomBedsFromData(data, options) {
    options = options || {};
    if (!data || !Array.isArray(data.beds)) {
      throw new Error('GosBed.mom.buildBedsFromData: invalid Mom data');
    }
    var loadedAt = options.loadedAt || new Date().toISOString();
    var plantingCount = countMomPlantings(data);
    return data.beds.map(function (srcBed) {
      var rows = Number(srcBed.dimensions && srcBed.dimensions.rows) || 4;
      var cols = Number(srcBed.dimensions && srcBed.dimensions.cols) || 4;
      var used = {};
      var painted = [];
      (srcBed.plantings || []).forEach(function (planting, index) {
        var targets = explicitCellTargets(planting.cells, rows, cols);
        if (!targets.length) targets = [fallbackCellTarget(srcBed, planting, index, used, rows, cols)];
        targets.forEach(function (target, targetIndex) {
        var row = target.row;
        var col = target.col;
        var confidence = target.confidence;
        var note = target.note;
        if (used[row + ':' + col]) {
          note = note || 'Garden OS skipped an already-filled source cell.';
          return;
        }
        used[row + ':' + col] = true;
        painted.push(copyPaintedEntry({
          id: targets.length > 1 ? planting.id + '__' + formatCell(row, col) : planting.id,
          cell: formatCell(row, col),
          cropId: planting.cropId,
          cropName: planting.displayName || planting.cropId,
          cropIcon: '',
          cropColor: '',
          displayName: planting.displayName || planting.cropId,
          varietyName: planting.varietyName == null ? null : planting.varietyName,
          status: planting.status || 'Planted',
          bedLocation: planting.bedLocation || null,
          sourceBedName: srcBed.name,
          placementConfidence: confidence,
          placementNote: note || null,
          label: srcBed.type === 'grow_bags' ? growBagLabel(row, col, rows, cols) : null,
          sourcePlantingId: planting.id,
          sourcePlantingCellIndex: targetIndex,
          plantedAt: planting.plantedOnStart,
          plantedOnStart: planting.plantedOnStart,
          plantedOnEnd: planting.plantedOnEnd,
          plantedWeek: isoWeek(planting.plantedOnStart),
          season: planting.season,
          notes: planting.notes
        }));
        });
      });
      return {
        schemaVersion: SCHEMA_VERSION,
        id: srcBed.id,
        name: srcBed.name,
        type: srcBed.type,
        dimensions: { rows: rows, cols: cols },
        shape: cols + 'x' + rows,
        sun: 'full',
        wallSide: srcBed.wallSide || 'none',
        source: MOM_SOURCE,
        loadedAt: loadedAt,
        comment: srcBed.comment || null,
        momGarden: true,
        painted: painted,
        events: [createJournalEvent(
          'Loaded Mom Garden data (' + plantingCount + ' plantings, ' + data.beds.length + ' beds)',
          srcBed.id,
          loadedAt,
          { plantingCount: plantingCount, bedCount: data.beds.length }
        )].concat(painted.map(function (p) {
          return createJournalEvent(
            plantingJournalMessage(p, srcBed.name),
            srcBed.id,
            loadedAt,
            { planting: p, sourceBedName: srcBed.name }
          );
        })),
        ruleVersion: null,
        seasonStart: 'retroactive'
      };
    });
  }

  function isMomLoaded() {
    return readAllBeds().some(function (bed) {
      return bed && (bed.source === MOM_SOURCE || bed.momGarden === true);
    });
  }

  function loadMomFromData(data, options) {
    options = options || {};
    if (!options.overwrite && readAllBeds().length > 0) {
      return { ok: false, skipped: true, reason: 'existing-beds' };
    }
    var beds = buildMomBedsFromData(data, options);
    if (options.overwrite) {
      beds.forEach(function (bed) { deleteBed(bed.id); });
    }
    beds.forEach(function (bed) { writeBed(bed); });
    if (beds[0]) setActive(beds[0].id);
    return { ok: true, beds: beds, plantingCount: countMomPlantings(data) };
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
    isoWeek: isoWeek,
    currentIsoDate: currentIsoDate,
    currentIsoWeek: currentIsoWeek,
    plantedWeekOf: plantedWeekOf,
    mom: {
      source: MOM_SOURCE,
      buildBedsFromData: buildMomBedsFromData,
      loadFromData: loadMomFromData,
      isLoaded: isMomLoaded,
    },
    ConcurrentWriteError: ConcurrentWriteError,
    WALL_SIDES: WALL_SIDES,
    WATER_KINDS: WATER_KINDS,
    ORIENTATIONS: ORIENTATIONS,
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
