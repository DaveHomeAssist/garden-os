/* gos-journal.js — local-first Garden OS memory layer.
 *
 * Stores durable narrative/audit entries separately from GosBed operational
 * events. No backend, no framework, no build step.
 */
(function (global) {
  'use strict';

  var JOURNAL_STORAGE_KEY = 'gos.journal.v1';
  var SCHEMA_VERSION = 1;
  var TYPES = ['note', 'harvest', 'maintenance', 'observation', 'system'];
  var SOURCES = ['manual', 'planner', 'system'];
  var SEVERITIES = ['info', 'success', 'warning', 'urgent'];
  var SORTS = ['newest', 'oldest', 'type', 'source', 'bed'];
  var UNITS = ['', 'lb', 'oz', 'g', 'kg', 'bunch', 'bunches', 'each', 'basket', 'cups'];
  var CELL_RE = /^r\d+c\d+$/;

  function safeGet() {
    try { return global.localStorage.getItem(JOURNAL_STORAGE_KEY); }
    catch (_) { return null; }
  }
  function currentEnvelope() {
    var parsed = parseJson(safeGet());
    if (Array.isArray(parsed)) return { schemaVersion: SCHEMA_VERSION, revision: 0, entries: parsed };
    if (parsed && Array.isArray(parsed.entries)) {
      var rev = parseInt(parsed.revision, 10);
      return {
        schemaVersion: SCHEMA_VERSION,
        revision: isFinite(rev) && rev >= 0 ? rev : 0,
        entries: parsed.entries
      };
    }
    return { schemaVersion: SCHEMA_VERSION, revision: 0, entries: [] };
  }
  function safeSetEnvelope(envelope, expectedRevision) {
    var latest = currentEnvelope();
    if (expectedRevision != null && latest.revision !== expectedRevision) {
      throw new ConflictError('Journal changed in another tab.');
    }
    var next = {
      schemaVersion: SCHEMA_VERSION,
      revision: latest.revision + 1,
      updatedAt: new Date().toISOString(),
      entries: sortEntries(envelope.entries || [])
    };
    try {
      global.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    } catch (e) {
      throw e;
    }
  }
  function ConflictError(message) {
    this.name = 'JournalConflictError';
    this.code = 'JOURNAL_CONFLICT';
    this.message = message || 'Journal changed in another tab.';
    if (Error.captureStackTrace) Error.captureStackTrace(this, ConflictError);
  }
  ConflictError.prototype = Object.create(Error.prototype);
  ConflictError.prototype.constructor = ConflictError;
  function parseJson(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); }
    catch (_) { return null; }
  }
  function isPlainObject(value) {
    return !!value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]';
  }
  function clampString(value, max, fallback) {
    if (typeof value !== 'string') return fallback || '';
    return value.trim().slice(0, max);
  }
  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
  function validDateString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var d = new Date(value);
    if (isNaN(d.getTime())) return fallback;
    return value;
  }
  function eventDateFrom(value, fallback) {
    var v = validDateString(value, '');
    return v ? v.slice(0, 10) : fallback;
  }
  function seasonYearFrom(value, fallbackDate) {
    var n = parseInt(value, 10);
    if (isFinite(n) && n >= 2000 && n <= 2100) return n;
    return new Date(fallbackDate).getFullYear();
  }
  function normalizeCells(cells) {
    if (!Array.isArray(cells)) return [];
    var out = [];
    cells.forEach(function (cell) {
      if (typeof cell === 'string' && CELL_RE.test(cell) && out.indexOf(cell) < 0) out.push(cell);
    });
    return out.slice(0, 64);
  }
  function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    var out = [];
    tags.forEach(function (tag) {
      var clean = clampString(tag, 32, '').toLowerCase();
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out.slice(0, 20);
  }
  function normalizePayload(type, payload) {
    if (!isPlainObject(payload)) return {};
    if (type !== 'harvest') return Object.assign({}, payload);
    var amount = payload.amount == null || payload.amount === '' ? null : clampNumber(payload.amount, 0, 9999, null);
    var unit = clampString(payload.unit, 16, '').toLowerCase();
    if (UNITS.indexOf(unit) < 0) unit = '';
    var out = {
      amount: amount,
      unit: unit,
      quality: clampString(payload.quality, 40, ''),
      notes: clampString(payload.notes || payload.note, 500, '')
    };
    return out;
  }
  function generateId(prefix) {
    var date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    var rand = Math.random().toString(36).slice(2, 8);
    return (prefix || 'jrn') + '_' + date + '_' + rand;
  }
  function normalizeEntry(input) {
    if (!isPlainObject(input)) return null;
    var now = new Date().toISOString();
    var createdAt = validDateString(input.createdAt, now);
    var updatedAt = validDateString(input.updatedAt, createdAt);
    var eventDate = eventDateFrom(input.eventDate || createdAt, createdAt.slice(0, 10));
    var type = TYPES.indexOf(input.type) >= 0 ? input.type : null;
    var source = SOURCES.indexOf(input.source) >= 0 ? input.source : null;
    if (!type || !source) return null;
    var title = clampString(input.title, 120, '');
    var body = clampString(input.body, 2000, '');
    if (!title && !body) return null;
    var severity = SEVERITIES.indexOf(input.severity) >= 0 ? input.severity : 'info';
    var dismissedAt = input.dismissedAt == null ? null : validDateString(input.dismissedAt, null);
    var deletedAt = input.deletedAt == null ? null : validDateString(input.deletedAt, null);
    var payload = normalizePayload(type, input.payload);
    var out = {
      id: clampString(input.id, 80, '') || generateId('jrn'),
      schemaVersion: SCHEMA_VERSION,
      type: type,
      source: source,
      title: title || type.charAt(0).toUpperCase() + type.slice(1),
      body: body,
      createdAt: createdAt,
      updatedAt: updatedAt,
      eventDate: eventDate,
      seasonYear: seasonYearFrom(input.seasonYear, createdAt),
      bedId: clampString(input.bedId, 80, ''),
      bedName: clampString(input.bedName, 120, ''),
      cropId: clampString(input.cropId, 80, ''),
      cells: normalizeCells(input.cells),
      severity: severity,
      tags: normalizeTags(input.tags),
      dismissedAt: dismissedAt,
      deletedAt: deletedAt,
      payload: payload
    };
    var dedupeKey = clampString(input.dedupeKey, 160, '');
    if (dedupeKey) out.dedupeKey = dedupeKey;
    return out;
  }
  function readRawArray() {
    return currentEnvelope().entries;
  }
  function compareNewest(a, b) {
    if (!!a.deletedAt !== !!b.deletedAt) return a.deletedAt ? 1 : -1;
    return (b.eventDate || '').localeCompare(a.eventDate || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '') ||
      (b.updatedAt || '').localeCompare(a.updatedAt || '') ||
      (a.title || '').localeCompare(b.title || '');
  }
  function compareAlpha(a, b, fields) {
    for (var i = 0; i < fields.length; i++) {
      var diff = String(a[fields[i]] || '').localeCompare(String(b[fields[i]] || ''));
      if (diff) return diff;
    }
    return compareNewest(a, b);
  }
  function sortEntries(entries, sortMode) {
    var mode = SORTS.indexOf(sortMode) >= 0 ? sortMode : 'newest';
    return entries.slice().sort(function (a, b) {
      if (!!a.deletedAt !== !!b.deletedAt) return a.deletedAt ? 1 : -1;
      if (mode === 'oldest') {
        return (a.eventDate || '').localeCompare(b.eventDate || '') ||
          (a.createdAt || '').localeCompare(b.createdAt || '') ||
          (a.updatedAt || '').localeCompare(b.updatedAt || '') ||
          (a.title || '').localeCompare(b.title || '');
      }
      if (mode === 'type') return compareAlpha(a, b, ['type']);
      if (mode === 'source') return compareAlpha(a, b, ['source']);
      if (mode === 'bed') return compareAlpha(a, b, ['bedName', 'bedId']);
      return compareNewest(a, b);
    });
  }
  function readAll() {
    return sortEntries(readRawArray().map(normalizeEntry).filter(Boolean));
  }
  function findDuplicateIndex(entries, entry) {
    if (entry.dedupeKey) {
      for (var i = 0; i < entries.length; i++) if (entries[i].dedupeKey === entry.dedupeKey) return i;
    }
    for (var j = 0; j < entries.length; j++) if (entries[j].id === entry.id) return j;
    return -1;
  }
  function append(entryDraft) {
    var snapshot = currentEnvelope();
    var entry = normalizeEntry(entryDraft);
    if (!entry) return null;
    var entries = sortEntries(snapshot.entries.map(normalizeEntry).filter(Boolean));
    var duplicate = findDuplicateIndex(entries, entry);
    if (duplicate >= 0) return entries[duplicate];
    entries.push(entry);
    safeSetEnvelope({ entries: entries }, snapshot.revision);
    return entry;
  }
  function update(entryId, patch) {
    var snapshot = currentEnvelope();
    var id = clampString(entryId, 80, '');
    if (!id || !isPlainObject(patch)) return null;
    var entries = sortEntries(snapshot.entries.map(normalizeEntry).filter(Boolean));
    var idx = entries.findIndex(function (entry) { return entry.id === id; });
    if (idx < 0) return null;
    var next = normalizeEntry(Object.assign({}, entries[idx], patch, { id: entries[idx].id, updatedAt: new Date().toISOString() }));
    if (!next) return null;
    entries[idx] = next;
    safeSetEnvelope({ entries: entries }, snapshot.revision);
    return next;
  }
  function dismiss(entryId) {
    return update(entryId, { dismissedAt: new Date().toISOString() });
  }
  function query(filters) {
    filters = filters || {};
    return sortEntries(readAll().filter(function (entry) {
      if (filters.type && entry.type !== filters.type) return false;
      if (filters.source && entry.source !== filters.source) return false;
      if (filters.bedId && entry.bedId !== filters.bedId) return false;
      if (filters.cropId && entry.cropId !== filters.cropId) return false;
      if (filters.severity && entry.severity !== filters.severity) return false;
      if (filters.showDeleted !== true && entry.deletedAt) return false;
      if (filters.systemInbox && entry.type === 'system' && entry.dismissedAt) return false;
      if (filters.hideDismissedSystem !== false && entry.type === 'system' && entry.dismissedAt) return false;
      return true;
    }), filters.sort);
  }
  function exportEntries() {
    return readAll();
  }
  function importEntries(entries) {
    var incoming = Array.isArray(entries) ? entries : (entries && Array.isArray(entries.journalEntries) ? entries.journalEntries : []);
    var snapshot = currentEnvelope();
    var local = sortEntries(snapshot.entries.map(normalizeEntry).filter(Boolean));
    var counts = { added: 0, merged: 0, skipped: 0, invalid: 0 };
    incoming.forEach(function (raw) {
      var entry = normalizeEntry(raw);
      if (!entry) { counts.invalid++; return; }
      var idx = findDuplicateIndex(local, entry);
      if (idx < 0) {
        local.push(entry);
        counts.added++;
        return;
      }
      var localTime = new Date(local[idx].updatedAt || local[idx].createdAt || 0).getTime();
      var incomingTime = new Date(entry.updatedAt || entry.createdAt || 0).getTime();
      if (incomingTime > localTime) {
        local[idx] = Object.assign({}, local[idx], entry);
        counts.merged++;
      } else {
        counts.skipped++;
      }
    });
    safeSetEnvelope({ entries: local }, snapshot.revision);
    counts.entries = readAll();
    return counts;
  }
  function fromPlannerHarvest(harvestEvent, context) {
    if (!harvestEvent || harvestEvent.type !== 'harvest') return null;
    context = context || {};
    var crop = context.crop || {};
    var cropId = harvestEvent.cropId || (harvestEvent.cropSnapshot && harvestEvent.cropSnapshot.cropId) || context.cropId || '';
    var cropName = crop.name || (harvestEvent.cropSnapshot && harvestEvent.cropSnapshot.cropName) || cropId || 'crop';
    var quantity = harvestEvent.quantity != null ? harvestEvent.quantity : null;
    var unit = harvestEvent.unit || '';
    var amount = quantity != null ? String(quantity) + (unit ? ' ' + unit : '') : '';
    var cell = harvestEvent.cell || '';
    return append({
      id: harvestEvent.journalId || '',
      dedupeKey: harvestEvent.id ? 'planner-harvest:' + harvestEvent.id : ['planner-harvest', harvestEvent.bedId || context.bedId || '', cropId, cell, harvestEvent.timestamp || ''].join(':'),
      type: 'harvest',
      source: 'planner',
      title: 'Harvested ' + cropName,
      body: amount ? 'Picked ' + amount + (cell ? ' from ' + cell + '.' : '.') : (harvestEvent.notes || 'Harvest logged in Planner.'),
      createdAt: harvestEvent.timestamp || new Date().toISOString(),
      updatedAt: harvestEvent.timestamp || new Date().toISOString(),
      eventDate: (harvestEvent.timestamp || new Date().toISOString()).slice(0, 10),
      seasonYear: harvestEvent.season || context.seasonYear,
      bedId: harvestEvent.bedId || context.bedId || '',
      bedName: context.bedName || '',
      cropId: cropId,
      cells: cell ? [cell] : (Array.isArray(context.cells) ? context.cells : []),
      severity: 'success',
      tags: ['harvest', cropId].filter(Boolean),
      payload: {
        amount: quantity,
        unit: unit,
        quality: context.quality || '',
        notes: harvestEvent.notes || ''
      }
    });
  }
  function generateSystemAnnouncements(context) {
    context = context || {};
    var out = [];
    var now = context.now || {};
    var week = parseInt(now.week || context.week, 10);
    var seasonYear = parseInt(now.seasonYear || context.seasonYear || new Date().getFullYear(), 10);
    var bedId = clampString(context.bedId || (context.gosBed && context.gosBed.id), 80, '');
    var bedName = clampString(context.bedName || (context.gosBed && context.gosBed.name), 120, '');
    var crops = Array.isArray(context.crops) ? context.crops : [];
    var counts = { added: 0, skipped: 0, invalid: 0, entries: out };
    function add(draft) {
      var before = readAll().length;
      var saved = append(Object.assign({
        type: 'system',
        source: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        eventDate: new Date().toISOString().slice(0, 10),
        seasonYear: seasonYear,
        bedId: bedId,
        bedName: bedName,
        cropId: '',
        cells: [],
        severity: 'info',
        tags: ['system'],
        dismissedAt: null,
        payload: {}
      }, draft));
      if (saved) {
        out.push(saved);
        if (readAll().length > before) counts.added++;
        else counts.skipped++;
      } else {
        counts.invalid++;
      }
    }
    if (!context.hasLocation) {
      add({
        dedupeKey: 'location-not-set:' + (bedId || 'no-bed') + ':' + seasonYear,
        title: 'Location not set',
        body: 'Set a location when you are ready for frost-aware planning.',
        severity: 'warning',
        tags: ['system', 'location']
      });
    }
    if (Array.isArray(context.unknownCropIds) && context.unknownCropIds.length) {
      add({
        dedupeKey: 'unknown-crop:' + (bedId || 'no-bed') + ':' + context.unknownCropIds.sort().join(','),
        title: 'Unknown crop found',
        body: 'A planted crop is not in the current catalog: ' + context.unknownCropIds.join(', ') + '.',
        severity: 'warning',
        tags: ['system', 'catalog']
      });
    }
    if (context.frostDays != null && context.frostDays >= 0 && context.frostDays <= 7 && crops.some(function (c) { return c && c.tender; })) {
      add({
        dedupeKey: 'frost-risk:' + (bedId || 'no-bed') + ':' + seasonYear + '-W' + week,
        title: 'Frost risk',
        body: 'Frost risk in ' + context.frostDays + ' day' + (context.frostDays === 1 ? '' : 's') + '. Cover tender crops.',
        severity: 'urgent',
        tags: ['system', 'frost']
      });
    }
    crops.forEach(function (crop) {
      if (!crop || !crop.cropId) return;
      if (week >= crop.harvestStart && week <= crop.harvestEnd) {
        add({
          dedupeKey: 'harvest-open:' + (bedId || 'no-bed') + ':' + crop.cropId + ':' + seasonYear + '-W' + week,
          title: crop.name + ' harvest window open',
          body: 'Harvest window is active through W' + crop.harvestEnd + '.',
          cropId: crop.cropId,
          severity: 'success',
          tags: ['system', 'harvest', crop.cropId]
        });
      }
      if (crop.boltRisk && week >= crop.harvestStart && week <= crop.harvestEnd) {
        add({
          dedupeKey: 'bolt-risk:' + (bedId || 'no-bed') + ':' + crop.cropId + ':' + seasonYear + '-W' + week,
          title: crop.name + ' bolt risk',
          body: 'Cut before quality drops in warm weather.',
          cropId: crop.cropId,
          severity: 'warning',
          tags: ['system', 'bolt', crop.cropId]
        });
      }
      if (week === crop.sowWeek) {
        add({
          dedupeKey: 'sow-window:' + (bedId || 'no-bed') + ':' + crop.cropId + ':' + seasonYear + '-W' + week,
          title: crop.name + ' sow window open',
          body: 'Succession sowing is available this week.',
          cropId: crop.cropId,
          severity: 'info',
          tags: ['system', 'sow', crop.cropId]
        });
      }
    });
    counts.entries = out.filter(Boolean);
    return counts;
  }

  global.GardenJournal = {
    JOURNAL_STORAGE_KEY: JOURNAL_STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    types: TYPES.slice(),
    sources: SOURCES.slice(),
    severities: SEVERITIES.slice(),
    sorts: SORTS.slice(),
    readAll: readAll,
    append: append,
    update: update,
    dismiss: dismiss,
    query: query,
    export: exportEntries,
    import: importEntries,
    fromPlannerHarvest: fromPlannerHarvest,
    generateSystemAnnouncements: generateSystemAnnouncements,
    _normalizeEntry: normalizeEntry,
    ConflictError: ConflictError
  };
})(typeof window !== 'undefined' ? window : this);
