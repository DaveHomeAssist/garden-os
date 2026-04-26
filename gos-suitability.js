/* gos-suitability.js — shared crop suitability model for Garden OS v5 surfaces.
 *
 * Realism, not game scoring. Returns a 0–10 cell score and a 0–100 bed score
 * representing how well a placed crop matches the bed's site context, the
 * current season, and its neighbors. Same vocabulary across Painting, Doctor,
 * and Planner so the gardener sees one number, not three.
 *
 * Vanilla JS, no framework, no build step. Attaches a `GosSuitability`
 * namespace to `window`. Safe to load before any React + Babel CDN bundle.
 *
 * Inputs come from the canonical GosBed record:
 *   bed.shape           — "<cols>x<rows>"
 *   bed.sun             — "full" | "partial" | "shade"
 *   bed.sunHoursNumeric — optional measured/estimated daily sun hours
 *   bed.wallSide        — "back" | "front" | "left" | "right" | "none"
 *   bed.painted[]       — { cell, cropId, plantedAt?, plantedWeek? }, ...
 *
 * The caller supplies a getCrop(cropId) callback returning a crop record with
 * at minimum `sun` ('full' | 'part' | 'shade'). Optional fields used when
 * present: family, sowWeek, transplantWeek, harvestStart, harvestEnd, tall.
 * Each surface keeps owning its own crop catalog; this module never reaches
 * into one directly.
 *
 * Factor model (deterministic, four factors plus an additive adjacency delta;
 * compatible with the canonical 6-factor SCORING_RULES.md but reduced to the
 * fields the v5 surfaces have on hand. The full canonical port can extend
 * this without breaking callers).
 *
 *   sunFit       0–5  — bed light vs crop sun preference (weight 2x)
 *   positionFit  0–5  — tall crops in back row, accessible crops near front
 *   seasonFit    0–5  — current ISO week within crop's sow…harvestEnd window
 *   companions   0–5  — soft baseline; adjacencyDelta layered on top
 *   adjacency    -2..+2 (additive)
 *
 * Output:
 *   scoreCell  → { total: 0–10, factors: {...}, cropId, cell }
 *   scoreBed   → { score: 0–100 | null, weakestCells: [], cells: [] }
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  // Companion / conflict tables — kept small and explicit. These are the
  // pairings the v5 surfaces care about; can grow as the crop catalog does.
  // Symmetric in practice (A,B) ⇔ (B,A) so callers don't have to pre-flip.
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

  // Crops that grow tall enough to shade a front-of-bed neighbor and that
  // belong in the back row (or trellis row) of a bed.
  var TALL = { tom: 1, cuc: 1, pep: 1, oni: 1 };
  // Crops gardeners like to keep accessible (frequent picking, low canopy).
  var FRONT_PREFERRED = { let: 1, rad: 1, spi: 1, chv: 1 };

  // ── helpers ─────────────────────────────────────────────────────────────

  function parseShape(shape) {
    if (typeof shape !== 'string') return null;
    var m = shape.match(/^(\d+)x(\d+)$/i);
    if (!m) return null;
    return { cols: parseInt(m[1], 10), rows: parseInt(m[2], 10) };
  }
  function parseCell(cellStr) {
    if (typeof cellStr !== 'string') return null;
    var m = cellStr.match(/^r(\d+)c(\d+)$/);
    if (!m) return null;
    return { r: parseInt(m[1], 10), c: parseInt(m[2], 10) };
  }

  function isCompanion(a, b) {
    var list = COMPANIONS[a];
    return Array.isArray(list) && list.indexOf(b) !== -1;
  }
  function isConflict(a, b) {
    var list = CONFLICTS[a];
    return Array.isArray(list) && list.indexOf(b) !== -1;
  }

  // Build a (r,c) → cropId index from the bed's painted array.
  function indexBed(bed) {
    var idx = {};
    if (!bed || !Array.isArray(bed.painted)) return idx;
    bed.painted.forEach(function (p) {
      if (!p || !p.cell || !p.cropId) return;
      idx[p.cell] = p.cropId;
    });
    return idx;
  }

  function neighborsOf(r, c, idx) {
    var out = [];
    var deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < deltas.length; i++) {
      var nr = r + deltas[i][0], nc = c + deltas[i][1];
      var k = 'r' + nr + 'c' + nc;
      if (idx[k]) out.push(idx[k]);
    }
    return out;
  }

  // ── factors ─────────────────────────────────────────────────────────────

  // sunFit: 5 = good match, 3 = neutral, 1 = bad fit. Prefers numeric
  // sunHours when bedContext provides it; otherwise reads bed.sun enum.
  function sunFit(crop, bed) {
    var cropSun = crop && crop.sun;        // 'full' | 'part' | 'shade'
    if (typeof bed.sunHoursNumeric === 'number') {
      var hrs = bed.sunHoursNumeric;
      if (cropSun === 'full')  return clamp(1 + (hrs - 4) * 1.0, 1, 5);
      if (cropSun === 'part')  return clamp(5 - Math.abs(hrs - 5) * 0.7, 1, 5);
      if (cropSun === 'shade') return clamp(5 - Math.max(0, hrs - 4) * 0.7, 1, 5);
      return 3;
    }
    var bedSun = bed.sun || 'full';        // 'full' | 'partial' | 'shade'
    if (cropSun === 'full' && bedSun === 'full')    return 5;
    if (cropSun === 'full' && bedSun === 'partial') return 2.5;
    if (cropSun === 'full' && bedSun === 'shade')   return 1;
    if (cropSun === 'part' && bedSun === 'partial') return 5;
    if (cropSun === 'part' && bedSun === 'full')    return 4;
    if (cropSun === 'part' && bedSun === 'shade')   return 2.5;
    if (cropSun === 'shade' && bedSun === 'shade')  return 5;
    if (cropSun === 'shade' && bedSun === 'partial') return 4;
    if (cropSun === 'shade' && bedSun === 'full')   return 2;
    return 3;
  }

  // positionFit: tall crops belong on the wall row, low crops near the front.
  // Uses bed.wallSide when present; otherwise treats r=0 as back.
  function positionFit(cropId, r, c, dims, bed) {
    var rows = dims.rows, cols = dims.cols;
    var wallSide = bed.wallSide || 'back';
    var rowFromWall, distFromAccess;
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
      rowFromWall = 0; distFromAccess = 0;
    }
    var maxR = Math.max(1, rows - 1);
    var maxC = Math.max(1, cols - 1);
    var maxAccess = (wallSide === 'left' || wallSide === 'right') ? maxC : maxR;
    var accessFrac = 1 - (distFromAccess / Math.max(1, maxAccess));

    if (TALL[cropId]) {
      // Tall crops: 5 at the wall, drops as they move forward.
      var atWall = 1 - (rowFromWall / Math.max(1, maxR));
      return clamp(2 + atWall * 3, 1, 5);
    }
    if (FRONT_PREFERRED[cropId]) {
      // Low/frequent-pick crops: 5 near access, drops as they move backward.
      return clamp(2 + accessFrac * 3, 1, 5);
    }
    return 3.5;
  }

  // seasonFit: 5 inside the harvest window, 3 in grow window, 1 outside.
  // Falls back to neutral 3 if the crop has no schedule fields.
  function seasonFit(crop, currentWeek) {
    if (!crop || typeof currentWeek !== 'number') return 3;
    var sow   = typeof crop.sowWeek === 'number' ? crop.sowWeek : null;
    var hStart = typeof crop.harvestStart === 'number' ? crop.harvestStart : null;
    var hEnd   = typeof crop.harvestEnd === 'number' ? crop.harvestEnd : null;
    if (sow == null && hStart == null && hEnd == null) return 3;
    if (hStart != null && hEnd != null && currentWeek >= hStart && currentWeek <= hEnd) return 5;
    if (sow != null && hStart != null && currentWeek >= sow && currentWeek < hStart) return 4;
    if (sow != null && currentWeek < sow - 4) return 2;
    if (hEnd != null && currentWeek > hEnd + 2) return 1.5;
    return 3;
  }

  // adjacencyDelta: -2..+2 added on top of the weighted core. Companions
  // boost; conflicts cut; same-crop neighbors get a small monoculture penalty.
  function adjacencyDelta(cropId, neighborIds) {
    if (!neighborIds || !neighborIds.length) return 0;
    var delta = 0;
    for (var i = 0; i < neighborIds.length; i++) {
      var n = neighborIds[i];
      if (n === cropId) delta -= 0.25;
      else if (isCompanion(cropId, n) || isCompanion(n, cropId)) delta += 0.6;
      else if (isConflict(cropId, n)  || isConflict(n, cropId))  delta -= 1.2;
    }
    return clamp(delta, -2, 2);
  }

  // ── public API ──────────────────────────────────────────────────────────

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

    var sf  = sunFit(crop, bed);
    var pf  = positionFit(entry.cropId, pos.r, pos.c, dims, bed);
    var sea = seasonFit(crop, opts.currentWeek);
    var comp = 3; // neutral baseline; adjacencyDelta carries companion signal
    var adj = adjacencyDelta(entry.cropId, neighborIds);

    var weightedCore = (sf * 2 + pf + sea + comp) / 5; // 0–5 scale
    var total = clamp(weightedCore * 2 + adj, 0, 10);  // 0–10 scale

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
    if (!painted.length) {
      return { score: null, cells: [], weakestCells: [] };
    }
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
    if (!perCell.length) {
      return { score: null, cells: [], weakestCells: [] };
    }
    var sum = 0;
    for (var i = 0; i < perCell.length; i++) sum += perCell[i].total;
    var avg = sum / perCell.length;
    var bedScore = Math.round(avg * 10); // 0–100

    // Weakest cells: anything materially below avg (>1.5 on the 0–10 scale),
    // else the bottom 20% by total.
    var threshold = avg - 1.5;
    var weak = perCell.filter(function (c) { return c.total < threshold; });
    if (!weak.length) {
      var sorted = perCell.slice().sort(function (a, b) { return a.total - b.total; });
      weak = sorted.slice(0, Math.max(1, Math.floor(perCell.length * 0.2)));
    }
    return {
      score: bedScore,
      cells: perCell,
      weakestCells: weak.map(function (c) { return c.cell; }),
    };
  }

  global.GosSuitability = {
    scoreCell: scoreCell,
    scoreBed: scoreBed,
    sunFit: sunFit,
    positionFit: positionFit,
    seasonFit: seasonFit,
    adjacencyDelta: adjacencyDelta,
    isCompanion: isCompanion,
    isConflict: isConflict,
    COMPANIONS: COMPANIONS,
    CONFLICTS: CONFLICTS,
  };
})(typeof window !== 'undefined' ? window : this);
