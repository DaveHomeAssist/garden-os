/* gos-suitability-core.js - importable suitability engine for Garden OS v5.
 *
 * This is the source module for the root v5 suitability surfaces. It exports a
 * UMD-style `GardenScoringCore` object so browser pages, Node tests, and thin
 * compatibility wrappers can all use the same deterministic scoring logic.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.GardenScoringCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  var COMPANIONS = {
    tom: ['bas', 'mar', 'car', 'chv'],
    bas: ['tom', 'pep'],
    mar: ['tom', 'cuc', 'pep'],
    car: ['oni', 'tom', 'let', 'chv'],
    oni: ['car', 'let', 'rad'],
    let: ['car', 'rad', 'oni'],
    rad: ['let', 'cuc', 'oni'],
    pep: ['bas', 'mar'],
    cuc: ['rad', 'mar'],
    spi: ['rad', 'let'],
    chv: ['car', 'tom'],
    kal: ['oni', 'chv'],
  };

  var CONFLICTS = {
    bas: ['oni', 'rue'],
    oni: ['bas', 'leg'],
    car: ['dil'],
    cuc: ['pot'],
    tom: ['cor'],
    pep: ['fen'],
  };

  var TALL = { tom: 1, cuc: 1, pep: 1, oni: 1 };
  var FRONT_PREFERRED = { let: 1, rad: 1, spi: 1, chv: 1 };

  function parseShape(shape) {
    if (typeof shape !== 'string') return null;
    var match = shape.match(/^(\d+)x(\d+)$/i);
    if (!match) return null;
    return { cols: parseInt(match[1], 10), rows: parseInt(match[2], 10) };
  }

  function parseCell(cellStr) {
    if (typeof cellStr !== 'string') return null;
    var match = cellStr.match(/^r(\d+)c(\d+)$/);
    if (!match) return null;
    return { r: parseInt(match[1], 10), c: parseInt(match[2], 10) };
  }

  function isCompanion(a, b) {
    var list = COMPANIONS[a];
    return Array.isArray(list) && list.indexOf(b) !== -1;
  }

  function isConflict(a, b) {
    var list = CONFLICTS[a];
    return Array.isArray(list) && list.indexOf(b) !== -1;
  }

  function indexBed(bed) {
    var idx = {};
    if (!bed || !Array.isArray(bed.painted)) return idx;
    bed.painted.forEach(function (entry) {
      if (!entry || !entry.cell || !entry.cropId) return;
      idx[entry.cell] = entry.cropId;
    });
    return idx;
  }

  function neighborsOf(r, c, idx) {
    var out = [];
    var deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < deltas.length; i++) {
      var nr = r + deltas[i][0];
      var nc = c + deltas[i][1];
      var key = 'r' + nr + 'c' + nc;
      if (idx[key]) out.push(idx[key]);
    }
    return out;
  }

  function sunFit(crop, bed) {
    var cropSun = crop && crop.sun;
    if (typeof bed.sunHoursNumeric === 'number') {
      var hrs = bed.sunHoursNumeric;
      if (cropSun === 'full') return clamp(1 + (hrs - 4) * 1.0, 1, 5);
      if (cropSun === 'part') return clamp(5 - Math.abs(hrs - 5) * 0.7, 1, 5);
      if (cropSun === 'shade') return clamp(5 - Math.max(0, hrs - 4) * 0.7, 1, 5);
      return 3;
    }

    var bedSun = bed.sun || 'full';
    if (cropSun === 'full' && bedSun === 'full') return 5;
    if (cropSun === 'full' && bedSun === 'partial') return 2.5;
    if (cropSun === 'full' && bedSun === 'shade') return 1;
    if (cropSun === 'part' && bedSun === 'partial') return 5;
    if (cropSun === 'part' && bedSun === 'full') return 4;
    if (cropSun === 'part' && bedSun === 'shade') return 2.5;
    if (cropSun === 'shade' && bedSun === 'shade') return 5;
    if (cropSun === 'shade' && bedSun === 'partial') return 4;
    if (cropSun === 'shade' && bedSun === 'full') return 2;
    return 3;
  }

  function positionFit(cropId, r, c, dims, bed) {
    var rows = dims.rows;
    var cols = dims.cols;
    var wallSide = bed.wallSide;
    if (!wallSide || wallSide === 'none') return 3;

    var rowFromWall;
    var distFromAccess;
    if (wallSide === 'back') {
      rowFromWall = r;
      distFromAccess = (rows - 1) - r;
    } else if (wallSide === 'front') {
      rowFromWall = (rows - 1) - r;
      distFromAccess = r;
    } else if (wallSide === 'left') {
      rowFromWall = c;
      distFromAccess = (cols - 1) - c;
    } else if (wallSide === 'right') {
      rowFromWall = (cols - 1) - c;
      distFromAccess = c;
    } else {
      return 3;
    }

    var maxR = Math.max(1, rows - 1);
    var maxC = Math.max(1, cols - 1);
    var maxAccess = (wallSide === 'left' || wallSide === 'right') ? maxC : maxR;
    var accessFrac = 1 - (distFromAccess / Math.max(1, maxAccess));

    if (TALL[cropId]) {
      var atWall = 1 - (rowFromWall / Math.max(1, maxR));
      return clamp(2 + atWall * 3, 1, 5);
    }
    if (FRONT_PREFERRED[cropId]) {
      return clamp(2 + accessFrac * 3, 1, 5);
    }
    return 3.5;
  }

  function seasonFit(crop, currentWeek) {
    if (!crop || typeof currentWeek !== 'number') return 3;
    var sow = typeof crop.sowWeek === 'number' ? crop.sowWeek : null;
    var hStart = typeof crop.harvestStart === 'number' ? crop.harvestStart : null;
    var hEnd = typeof crop.harvestEnd === 'number' ? crop.harvestEnd : null;
    if (sow == null && hStart == null && hEnd == null) return 3;
    if (hStart != null && hEnd != null && currentWeek >= hStart && currentWeek <= hEnd) return 5;
    if (sow != null && hStart != null && currentWeek >= sow && currentWeek < hStart) return 4;
    if (sow != null && currentWeek < sow - 4) return 2;
    if (hEnd != null && currentWeek > hEnd + 2) return 1.5;
    return 3;
  }

  function adjacencyDelta(cropId, neighborIds) {
    if (!neighborIds || !neighborIds.length) return 0;
    var delta = 0;
    for (var i = 0; i < neighborIds.length; i++) {
      var neighbor = neighborIds[i];
      if (neighbor === cropId) delta -= 0.25;
      else if (isCompanion(cropId, neighbor) || isCompanion(neighbor, cropId)) delta += 0.6;
      else if (isConflict(cropId, neighbor) || isConflict(neighbor, cropId)) delta -= 1.2;
    }
    return clamp(delta, -2, 2);
  }

  function scoreCell(opts) {
    if (!opts || !opts.bed || !opts.cellEntry || typeof opts.getCrop !== 'function') {
      return null;
    }
    var bed = opts.bed;
    var entry = opts.cellEntry;
    var crop = opts.getCrop(entry.cropId);
    if (!crop) return null;

    var pos = parseCell(entry.cell);
    var dims = parseShape(bed.shape) || { cols: 8, rows: 4 };
    if (!pos) return null;

    var idx = opts._bedIndex || indexBed(bed);
    var neighborIds = neighborsOf(pos.r, pos.c, idx);
    var sf = sunFit(crop, bed);
    var pf = positionFit(entry.cropId, pos.r, pos.c, dims, bed);
    var sea = seasonFit(crop, opts.currentWeek);
    var comp = 3;
    var adj = adjacencyDelta(entry.cropId, neighborIds);
    var weightedCore = (sf * 2 + pf + sea + comp) / 5;
    var total = clamp(weightedCore * 2 + adj, 0, 10);

    return {
      total: total,
      factors: {
        sunFit: sf,
        positionFit: pf,
        seasonFit: sea,
        adjacency: adj,
      },
      cropId: entry.cropId,
      cell: entry.cell,
    };
  }

  function scoreBed(opts) {
    if (!opts || !opts.bed || typeof opts.getCrop !== 'function') {
      return { score: null, cells: [], weakestCells: [] };
    }
    var bed = opts.bed;
    var painted = Array.isArray(bed.painted) ? bed.painted : [];
    if (!painted.length) return { score: null, cells: [], weakestCells: [] };

    var idx = indexBed(bed);
    var perCell = painted.map(function (entry) {
      return scoreCell({
        bed: bed,
        cellEntry: entry,
        getCrop: opts.getCrop,
        currentWeek: opts.currentWeek,
        _bedIndex: idx,
      });
    }).filter(Boolean);

    if (!perCell.length) return { score: null, cells: [], weakestCells: [] };

    var sum = 0;
    for (var i = 0; i < perCell.length; i++) sum += perCell[i].total;
    var avg = sum / perCell.length;
    var bedScore = Math.round(avg * 10);
    var threshold = avg - 1.5;
    var weak = perCell.filter(function (cell) { return cell.total < threshold; });
    if (!weak.length) {
      var sorted = perCell.slice().sort(function (a, b) { return a.total - b.total; });
      weak = sorted.slice(0, Math.max(1, Math.floor(perCell.length * 0.2)));
    }

    return {
      score: bedScore,
      cells: perCell,
      weakestCells: weak.map(function (cell) { return cell.cell; }),
    };
  }

  var FACTOR_EXPLAIN = {
    sunFit: {
      label: 'Sun', emoji: '☀️', weight: '2×',
      what: 'How well this crop’s light needs match the bed.',
      good: 'Getting the sun it wants.',
      mid: 'Workable light, but it could use more.',
      bad: 'Not enough sun here — move it or pick a shade-tolerant crop.',
    },
    positionFit: {
      label: 'Position', emoji: '📐', weight: '1×',
      what: 'Tall crops belong on the wall row; low, frequently-picked crops near the front.',
      good: 'Well placed for its height and access.',
      mid: 'Placement is fine, not optimal.',
      bad: 'Out of place — a tall crop up front or a picker stuck in back.',
    },
    seasonFit: {
      label: 'Season', emoji: '📅', weight: '1×',
      what: 'Whether the current week sits in this crop’s grow/harvest window.',
      good: 'Right in its season.',
      mid: 'Can grow now, but off its peak.',
      bad: 'Wrong season — outside its window.',
    },
    adjacency: {
      label: 'Neighbors', emoji: '🤝', weight: '±',
      what: 'Companion bonus vs. conflict penalty from the four touching cells.',
      good: 'Good company — companion planting bonus.',
      mid: 'Neutral neighbors.',
      bad: 'Bad neighbors — conflicts or too much of the same crop.',
    },
  };

  function factorVerdict(key, value) {
    if (key === 'adjacency') {
      if (value > 0.3) return 'good';
      if (value < -0.3) return 'bad';
      return 'mid';
    }
    if (value >= 4) return 'good';
    if (value >= 2.5) return 'mid';
    return 'bad';
  }

  function explainFactor(key, value) {
    var meta = FACTOR_EXPLAIN[key];
    if (!meta) return null;
    var verdict = factorVerdict(key, value);
    return {
      key: key,
      label: meta.label,
      emoji: meta.emoji,
      weight: meta.weight,
      value: value,
      verdict: verdict,
      what: meta.what,
      note: meta[verdict],
    };
  }

  function explain(factors) {
    if (!factors) return [];
    var order = ['sunFit', 'positionFit', 'seasonFit', 'adjacency'];
    var rows = [];
    for (var i = 0; i < order.length; i++) {
      if (typeof factors[order[i]] === 'number') {
        var row = explainFactor(order[i], factors[order[i]]);
        if (row) rows.push(row);
      }
    }
    return rows;
  }

  return {
    scoreCell: scoreCell,
    scoreBed: scoreBed,
    sunFit: sunFit,
    positionFit: positionFit,
    seasonFit: seasonFit,
    adjacencyDelta: adjacencyDelta,
    isCompanion: isCompanion,
    isConflict: isConflict,
    explain: explain,
    explainFactor: explainFactor,
    COMPANIONS: COMPANIONS,
    CONFLICTS: CONFLICTS,
  };
});
