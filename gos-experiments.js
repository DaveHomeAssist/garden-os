/* gos-experiments.js — cross-bed experiment records for Garden OS v5.
 *
 * Experiments live outside GosBed because neither linked bed owns the
 * relationship. The module is UMD-shaped so browser surfaces and Node tests use
 * the same validation and persistence implementation.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GosExperiments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';

  var STORAGE_KEY = 'gos.experiments.v1';
  var SCHEMA_VERSION = 1;
  var VARIABLES = ['spacing', 'mulch', 'fertilizer', 'variety', 'sun exposure', 'watering', 'protection'];
  var STATUSES = ['active', 'closed'];
  var diagnostics = [];

  function ExperimentError(message, code) {
    this.name = 'ExperimentError';
    this.message = message || 'Experiment operation failed.';
    this.code = code || 'EXPERIMENT_ERROR';
    if (Error.captureStackTrace) Error.captureStackTrace(this, ExperimentError);
  }
  ExperimentError.prototype = Object.create(Error.prototype);
  ExperimentError.prototype.constructor = ExperimentError;

  function ExperimentConflictError(message) {
    ExperimentError.call(this, message || 'Experiments changed in another tab.', 'EXPERIMENT_CONFLICT');
    this.name = 'ExperimentConflictError';
  }
  ExperimentConflictError.prototype = Object.create(ExperimentError.prototype);
  ExperimentConflictError.prototype.constructor = ExperimentConflictError;

  function parseJson(raw) {
    if (raw == null || raw === '') return null;
    try { return JSON.parse(raw); }
    catch (error) {
      diagnostics.push({ code: 'MALFORMED_STORAGE', message: 'Experiment storage could not be parsed.' });
      return null;
    }
  }

  function safeGet() {
    try { return global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null; }
    catch (error) {
      diagnostics.push({ code: 'STORAGE_READ_FAILED', message: error.message || 'Experiment storage read failed.' });
      return null;
    }
  }

  function safeSet(value) {
    if (!global.localStorage) throw new ExperimentError('Local storage is unavailable.', 'STORAGE_UNAVAILABLE');
    try { global.localStorage.setItem(STORAGE_KEY, value); }
    catch (error) { throw new ExperimentError('Experiment storage write failed.', 'STORAGE_WRITE_FAILED'); }
  }

  function cleanString(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || 200) : '';
  }

  function validIsoDate(value, fallback) {
    var clean = cleanString(value, 40);
    if (!clean || isNaN(new Date(clean).getTime())) return fallback || '';
    return clean;
  }

  function cleanNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function cleanBaselineSide(side) {
    side = side && typeof side === 'object' ? side : {};
    return {
      revision: Math.max(0, Math.floor(cleanNumber(side.revision, 0))),
      score: side.score == null ? null : Math.max(0, Math.min(100, cleanNumber(side.score, 0))),
      plantedCount: Math.max(0, Math.floor(cleanNumber(side.plantedCount, 0)))
    };
  }

  function generateId(prefix) {
    var stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    var random = Math.random().toString(36).slice(2, 8);
    return (prefix || 'experiment') + '-' + stamp + '-' + random;
  }

  function normalizeObservation(input, experiment, options) {
    input = input && typeof input === 'object' ? input : {};
    var now = new Date().toISOString();
    var bedId = cleanString(input.bedId, 80);
    if (bedId !== experiment.aBedId && bedId !== experiment.bBedId) {
      throw new ExperimentError('Observation bed must belong to the experiment.', 'INVALID_OBSERVATION_BED');
    }
    var date = validIsoDate(input.date, '');
    if (!date) throw new ExperimentError('Observation date is required.', 'INVALID_OBSERVATION_DATE');
    var note = cleanString(input.note, 1000);
    if (!note) throw new ExperimentError('Observation note is required.', 'INVALID_OBSERVATION_NOTE');
    var id = cleanString(input.id, 100) || (options && options.id) || generateId('observation');
    return {
      id: id,
      bedId: bedId,
      date: date.slice(0, 10),
      note: note,
      scoreSnapshot: input.scoreSnapshot == null ? null : Math.max(0, Math.min(100, cleanNumber(input.scoreSnapshot, 0))),
      plantedCount: Math.max(0, Math.floor(cleanNumber(input.plantedCount, 0))),
      createdAt: validIsoDate(input.createdAt, now)
    };
  }

  function normalizeExperiment(input, options) {
    input = input && typeof input === 'object' ? input : {};
    options = options || {};
    var now = new Date().toISOString();
    var aBedId = cleanString(input.aBedId, 80);
    var bBedId = cleanString(input.bBedId, 80);
    if (!aBedId || !bBedId) throw new ExperimentError('Two bed ids are required.', 'MISSING_BED');
    if (aBedId === bBedId) throw new ExperimentError('An experiment requires two different beds.', 'SAME_BED');
    var variable = cleanString(input.variable, 40).toLowerCase();
    if (VARIABLES.indexOf(variable) < 0) throw new ExperimentError('Choose a supported controlled variable.', 'INVALID_VARIABLE');
    if (typeof options.bedExists === 'function' && (!options.bedExists(aBedId) || !options.bedExists(bBedId))) {
      throw new ExperimentError('Both linked beds must exist.', 'UNKNOWN_BED');
    }
    var status = STATUSES.indexOf(input.status) >= 0 ? input.status : 'active';
    var experiment = {
      schemaVersion: SCHEMA_VERSION,
      id: cleanString(input.id, 100) || options.id || generateId('experiment'),
      aBedId: aBedId,
      bBedId: bBedId,
      variable: variable,
      hypothesis: cleanString(input.hypothesis, 500),
      status: status,
      createdAt: validIsoDate(input.createdAt, now),
      updatedAt: validIsoDate(input.updatedAt, now),
      baseline: {
        a: cleanBaselineSide(input.baseline && input.baseline.a),
        b: cleanBaselineSide(input.baseline && input.baseline.b)
      },
      observations: []
    };
    var observations = Array.isArray(input.observations) ? input.observations : [];
    experiment.observations = observations.map(function (observation) {
      return normalizeObservation(observation, experiment);
    }).sort(compareObservations);
    return experiment;
  }

  function compareObservations(a, b) {
    return String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id));
  }

  function compareExperiments(a, b) {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return String(b.updatedAt).localeCompare(String(a.updatedAt)) || String(a.id).localeCompare(String(b.id));
  }

  function currentEnvelope() {
    diagnostics = [];
    var parsed = parseJson(safeGet());
    if (!parsed) return { schemaVersion: SCHEMA_VERSION, revision: 0, experiments: [] };
    var source = Array.isArray(parsed) ? parsed : parsed.experiments;
    if (!Array.isArray(source)) {
      diagnostics.push({ code: 'INVALID_ENVELOPE', message: 'Experiment storage did not contain an experiment list.' });
      return { schemaVersion: SCHEMA_VERSION, revision: 0, experiments: [] };
    }
    var valid = [];
    source.forEach(function (item) {
      try { valid.push(normalizeExperiment(item)); }
      catch (error) { diagnostics.push({ code: error.code || 'INVALID_RECORD', message: error.message }); }
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: Math.max(0, Math.floor(cleanNumber(parsed.revision, 0))),
      experiments: valid.sort(compareExperiments)
    };
  }

  function writeEnvelope(experiments, expectedRevision) {
    var latest = currentEnvelope();
    if (expectedRevision != null && latest.revision !== expectedRevision) {
      throw new ExperimentConflictError('Expected experiment revision ' + expectedRevision + ' but found ' + latest.revision + '.');
    }
    var envelope = {
      schemaVersion: SCHEMA_VERSION,
      revision: latest.revision + 1,
      updatedAt: new Date().toISOString(),
      experiments: experiments.slice().sort(compareExperiments)
    };
    safeSet(JSON.stringify(envelope));
    return envelope;
  }

  function readAll(options) {
    var experiments = currentEnvelope().experiments;
    if (options && options.includeClosed === false) {
      experiments = experiments.filter(function (experiment) { return experiment.status === 'active'; });
    }
    return experiments.map(function (experiment) { return normalizeExperiment(experiment); });
  }

  function get(id) {
    var cleanId = cleanString(id, 100);
    return readAll().find(function (experiment) { return experiment.id === cleanId; }) || null;
  }

  function create(input, options) {
    options = options || {};
    var snapshot = currentEnvelope();
    var experiment = normalizeExperiment(input, options);
    if (snapshot.experiments.some(function (item) { return item.id === experiment.id; })) {
      throw new ExperimentError('Experiment id already exists.', 'DUPLICATE_ID');
    }
    writeEnvelope(snapshot.experiments.concat(experiment), snapshot.revision);
    return experiment;
  }

  function updateRecord(id, updater) {
    var snapshot = currentEnvelope();
    var index = snapshot.experiments.findIndex(function (item) { return item.id === id; });
    if (index < 0) throw new ExperimentError('Experiment was not found.', 'NOT_FOUND');
    var draft = updater(normalizeExperiment(snapshot.experiments[index]));
    draft.id = snapshot.experiments[index].id;
    draft.createdAt = snapshot.experiments[index].createdAt;
    draft.updatedAt = new Date().toISOString();
    var next = normalizeExperiment(draft);
    var list = snapshot.experiments.slice();
    list[index] = next;
    writeEnvelope(list, snapshot.revision);
    return next;
  }

  function addObservation(id, observation) {
    return updateRecord(id, function (experiment) {
      var nextObservation = normalizeObservation(observation, experiment);
      if (experiment.observations.some(function (item) { return item.id === nextObservation.id; })) {
        throw new ExperimentError('Observation id already exists.', 'DUPLICATE_OBSERVATION');
      }
      experiment.observations = experiment.observations.concat(nextObservation).sort(compareObservations);
      return experiment;
    });
  }

  function close(id) {
    return updateRecord(id, function (experiment) {
      experiment.status = 'closed';
      return experiment;
    });
  }

  function relink(id, aBedId, bBedId, baseline, options) {
    options = options || {};
    return updateRecord(id, function (experiment) {
      experiment.aBedId = aBedId;
      experiment.bBedId = bBedId;
      experiment.baseline = baseline || experiment.baseline;
      experiment.status = 'active';
      return normalizeExperiment(experiment, options);
    });
  }

  function listForBed(bedId, options) {
    var cleanId = cleanString(bedId, 80);
    return readAll(options).filter(function (experiment) {
      return experiment.aBedId === cleanId || experiment.bBedId === cleanId;
    });
  }

  function summarize(experiment, options) {
    options = options || {};
    var getBed = options.getBed || function (id) {
      return global.GosBed && typeof global.GosBed.read === 'function' ? global.GosBed.read(id) : null;
    };
    var scoreBed = options.scoreBed || function () { return { score: null, weakestCells: [] }; };
    var aBed = getBed(experiment.aBedId);
    var bBed = getBed(experiment.bBedId);
    var aScore = aBed ? scoreBed(aBed) : { score: null, weakestCells: [] };
    var bScore = bBed ? scoreBed(bBed) : { score: null, weakestCells: [] };
    var complete = !!(aBed && bBed);
    var delta = complete && aScore.score != null && bScore.score != null ? aScore.score - bScore.score : null;
    return {
      experiment: experiment,
      complete: complete,
      missingBedIds: [!aBed ? experiment.aBedId : null, !bBed ? experiment.bBedId : null].filter(Boolean),
      a: { bed: aBed, score: aScore.score, weakestCells: aScore.weakestCells || [] },
      b: { bed: bBed, score: bScore.score, weakestCells: bScore.weakestCells || [] },
      delta: delta,
      leaderBedId: delta == null || delta === 0 ? null : (delta > 0 ? experiment.aBedId : experiment.bBedId),
      observationCount: experiment.observations.length
    };
  }

  function getDiagnostics() { return diagnostics.slice(); }
  function getRevision() { return currentEnvelope().revision; }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    VARIABLES: VARIABLES.slice(),
    ExperimentError: ExperimentError,
    ExperimentConflictError: ExperimentConflictError,
    normalize: normalizeExperiment,
    readAll: readAll,
    get: get,
    create: create,
    addObservation: addObservation,
    close: close,
    relink: relink,
    listForBed: listForBed,
    summarize: summarize,
    getDiagnostics: getDiagnostics,
    getRevision: getRevision
  };
});
