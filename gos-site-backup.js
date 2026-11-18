/* gos-site-backup.js: back up and restore the planner-side Garden OS data.
 *
 * Browsers keep localStorage per origin, so beds, journal entries, experiments
 * and surface settings saved at one address (davehomeassist.github.io) are not
 * visible at another (garden.mixmash.games). This writes them to one portable
 * file and reads it back. Story Mode saves are separate: they live under
 * `gos-story-*` keys plus IndexedDB and have their own Export Saves flow.
 *
 * File shape (formatVersion 1):
 *   { format: 'garden-os-site-backup', formatVersion: 1, exportedAt, origin,
 *     keys: { '<localStorage key>': '<raw string value>' },
 *     checksum: { algorithm: 'fnv1a32', value: '<8 hex>' } }
 * The checksum covers the keys object serialised with sorted keys.
 *
 * Attaches `GosSiteBackup` to window (and module.exports under Node for tests).
 * A page opts into buttons with <div data-gos-site-backup></div>.
 */
(function (global) {
  'use strict';

  var FORMAT = 'garden-os-site-backup';
  var FORMAT_VERSION = 1;
  // Planner-side data: everything under "gos." (beds, journal, experiments,
  // surface tweaks) plus the shared theme and the cage ops guide progress.
  var EXTRA_KEYS = ['garden-os-theme', 'garden_cage_ops_guide_v2'];
  // Per-tab coordination state, never carried between browsers.
  var SKIP_KEYS = ['gos.session.lock', 'gos.session.tabId'];

  function isBackedUp(key) {
    if (SKIP_KEYS.indexOf(key) !== -1) return false;
    return key.indexOf('gos.') === 0 || EXTRA_KEYS.indexOf(key) !== -1;
  }

  function fnv1a32(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return ('0000000' + hash.toString(16)).slice(-8);
  }

  function checksumOf(keys) {
    var sorted = {};
    Object.keys(keys).sort().forEach(function (k) { sorted[k] = keys[k]; });
    return fnv1a32(JSON.stringify(sorted));
  }

  function collect(storage) {
    var keys = {};
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key != null && isBackedUp(key)) keys[key] = storage.getItem(key);
    }
    return keys;
  }

  function createBackup(storage, options) {
    var keys = collect(storage);
    return {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      exportedAt: (options && options.now) || new Date().toISOString(),
      origin: (options && options.origin) || (global.location ? global.location.origin : null),
      keys: keys,
      checksum: { algorithm: 'fnv1a32', value: checksumOf(keys) },
    };
  }

  /** Validate a parsed file. Returns { ok, keys } or { ok: false, error }. */
  function validateBackup(data) {
    if (!data || typeof data !== 'object') return { ok: false, error: 'Not a Garden OS backup file.' };
    if (data.format !== FORMAT) return { ok: false, error: 'Not a Garden OS planner backup (wrong format).' };
    if (data.formatVersion !== FORMAT_VERSION) return { ok: false, error: 'Backup was made by a newer Garden OS.' };
    var keys = data.keys;
    if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return { ok: false, error: 'Backup has no data.' };
    var names = Object.keys(keys);
    for (var i = 0; i < names.length; i++) {
      if (!isBackedUp(names[i])) return { ok: false, error: 'Backup contains an unexpected key: ' + names[i] };
      if (typeof keys[names[i]] !== 'string') return { ok: false, error: 'Backup value for ' + names[i] + ' is not text.' };
    }
    if (!data.checksum || data.checksum.value !== checksumOf(keys)) return { ok: false, error: 'Backup file is damaged or was edited (checksum mismatch).' };
    return { ok: true, keys: keys };
  }

  /** Write a validated backup into storage. Existing keys with the same name are replaced; others are kept. */
  function restoreBackup(storage, data) {
    var result = validateBackup(data);
    if (!result.ok) return result;
    var names = Object.keys(result.keys);
    var replaced = 0;
    for (var i = 0; i < names.length; i++) {
      if (storage.getItem(names[i]) !== null) replaced++;
      storage.setItem(names[i], result.keys[names[i]]);
    }
    return { ok: true, written: names.length, replaced: replaced };
  }

  function download(storage) {
    var backup = createBackup(storage);
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'garden-os-planner-backup-' + backup.exportedAt.slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 100);
    return backup;
  }

  function mount(root) {
    var status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.className = 'gos-site-backup__status';
    var exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn';
    exportBtn.textContent = 'Back up planner data';
    var importLabel = document.createElement('label');
    importLabel.className = 'btn';
    importLabel.style.margin = '0';
    importLabel.textContent = 'Restore planner data';
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.className = 'sr-only';
    input.id = 'gos-site-backup-file';
    importLabel.htmlFor = input.id;
    exportBtn.addEventListener('click', function () {
      var backup = download(global.localStorage);
      status.textContent = 'Planner backup saved (' + Object.keys(backup.keys).length + ' items).';
    });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      file.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { status.textContent = 'Restore failed: not a JSON file.'; return; }
        var check = validateBackup(data);
        if (!check.ok) { status.textContent = 'Restore failed: ' + check.error; return; }
        var count = Object.keys(check.keys).length;
        if (!global.confirm('Restore ' + count + ' planner items from ' + (data.origin || 'a backup') + '? Items with the same name here are replaced.')) return;
        var result = restoreBackup(global.localStorage, data);
        status.textContent = result.ok ? 'Restored ' + result.written + ' items. Reloading…' : 'Restore failed: ' + result.error;
        if (result.ok) global.setTimeout(function () { global.location.reload(); }, 600);
      }).finally(function () { input.value = ''; });
    });
    root.appendChild(exportBtn);
    root.appendChild(importLabel);
    root.appendChild(input);
    root.appendChild(status);
  }

  var api = {
    FORMAT: FORMAT,
    FORMAT_VERSION: FORMAT_VERSION,
    isBackedUp: isBackedUp,
    createBackup: createBackup,
    validateBackup: validateBackup,
    restoreBackup: restoreBackup,
    download: download,
  };
  global.GosSiteBackup = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined') {
    var mountAll = function () {
      var roots = document.querySelectorAll('[data-gos-site-backup]');
      for (var i = 0; i < roots.length; i++) mount(roots[i]);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll, { once: true });
    else mountAll();
  }
})(typeof window !== 'undefined' ? window : globalThis);
