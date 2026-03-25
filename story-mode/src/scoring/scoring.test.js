/**
 * Scoring Unit Tests — verifies all 6 factors + bed aggregation
 * against SCORING_RULES.md canonical spec.
 *
 * Run: cd story-mode && npx vitest run src/scoring/scoring.test.js
 */
import { describe, it, expect } from 'vitest';
import { sunFit, supportFit, shadeFit, accessFit, seasonFit, adjacencyScore, scoreCell } from './cell-score.js';
import { scoreBed } from './bed-score.js';
import { createTestStore, plantGrid, buildMinimalLayout } from '../test/test-helpers.js';

// ── Factor 1: Sun Fit (weight 2x) ───────────────────────────────────────────

describe('sunFit', () => {
  const crop = { sunMin: 4, sunIdeal: 6 };

  it('returns 5.0 when light >= sunIdeal', () => {
    expect(sunFit(crop, 6)).toBe(5.0);
    expect(sunFit(crop, 8)).toBe(5.0);
  });

  it('returns 3.0-5.0 when light between sunMin and sunIdeal', () => {
    const val = sunFit(crop, 5); // midpoint
    expect(val).toBeGreaterThanOrEqual(3.0);
    expect(val).toBeLessThanOrEqual(5.0);
    expect(val).toBeCloseTo(4.0, 1); // linear interpolation midpoint
  });

  it('returns 1.0-3.0 when light < sunMin', () => {
    const val = sunFit(crop, 2);
    expect(val).toBeGreaterThanOrEqual(1.0);
    expect(val).toBeLessThanOrEqual(3.0);
  });

  it('handles zero light', () => {
    const val = sunFit(crop, 0);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(5.0);
  });

  it('handles crop where sunMin equals sunIdeal', () => {
    const narrowCrop = { sunMin: 6, sunIdeal: 6 };
    expect(sunFit(narrowCrop, 6)).toBe(5.0);
    expect(sunFit(narrowCrop, 4)).toBeLessThan(3.0);
  });
});

// ── Factor 2: Support Fit ────────────────────────────────────────────────────

describe('supportFit', () => {
  it('returns 3.0 for non-climbing crops', () => {
    expect(supportFit({ support: false }, true)).toBe(3.0);
    expect(supportFit({ support: false }, false)).toBe(3.0);
  });

  it('returns 5.0 for climber with trellis', () => {
    expect(supportFit({ support: true }, true)).toBe(5.0);
  });

  it('returns 1.0 for climber without trellis', () => {
    expect(supportFit({ support: true }, false)).toBe(1.0);
  });
});

// ── Factor 3: Shade Tolerance ────────────────────────────────────────────────

describe('shadeFit', () => {
  it('returns shadeScore when light >= sunMin', () => {
    expect(shadeFit({ sunMin: 4, shadeScore: 3 }, 5)).toBe(3);
    expect(shadeFit({ sunMin: 4, shadeScore: 5 }, 4)).toBe(5);
  });

  it('returns shadeScore * 0.6 (floored at 1.0) when light < sunMin', () => {
    // shadeScore 3 * 0.6 = 1.8 > 1.0 → 1.8
    expect(shadeFit({ sunMin: 4, shadeScore: 3 }, 2)).toBeCloseTo(1.8, 1);
  });

  it('floors at 1.0 for low-shade crops under low light', () => {
    // shadeScore 1 * 0.6 = 0.6 → floored to 1.0
    expect(shadeFit({ sunMin: 4, shadeScore: 1 }, 2)).toBe(1.0);
  });
});

// ── Factor 4: Access Fit ─────────────────────────────────────────────────────

describe('accessFit', () => {
  it('returns 3.0 for tall crops regardless of position', () => {
    expect(accessFit({ tall: true }, 0, 0, 4, 8, 'back')).toBe(3.0);
    expect(accessFit({ tall: true }, 3, 7, 4, 8, 'back')).toBe(3.0);
  });

  it('returns 3.0-5.0 for short crops based on row', () => {
    // Back wall: row 0 is at the wall, rowFromFront = totalRows-1-row = 3
    // So row 0 (back/wall) has HIGH access (far from wall = easy to reach from front)
    const atWall = accessFit({ tall: false }, 0, 0, 4, 8, 'back');
    expect(atWall).toBe(5.0); // row 0 with back wall → rowFromFront=3 → accessScore=1.0 → 5.0

    // Row 3 (front edge) has LOW access (closest to front = access score 0)
    const atFront = accessFit({ tall: false }, 3, 0, 4, 8, 'back');
    expect(atFront).toBe(3.0); // row 3 with back wall → rowFromFront=0 → accessScore=0 → 3.0
  });

  it('wall-adjacent rows score higher access than front-edge rows', () => {
    // With back wall: row 0 (at wall) is farthest from front → high access score
    const atWall = accessFit({ tall: false }, 0, 0, 4, 8, 'back');
    const atFront = accessFit({ tall: false }, 3, 0, 4, 8, 'back');
    expect(atWall).toBeGreaterThan(atFront);
  });
});

// ── Factor 5: Season Fit ─────────────────────────────────────────────────────

describe('seasonFit', () => {
  const cool = { coolSeason: true };
  const warm = { coolSeason: false };

  it('spring: cool=5.0, warm=3.0', () => {
    expect(seasonFit(cool, 'spring')).toBe(5.0);
    expect(seasonFit(warm, 'spring')).toBe(3.0);
  });

  it('summer: cool=2.0, warm=5.0', () => {
    expect(seasonFit(cool, 'summer')).toBe(2.0);
    expect(seasonFit(warm, 'summer')).toBe(5.0);
  });

  it('latesummer: cool=1.0, warm=5.0', () => {
    expect(seasonFit(cool, 'latesummer')).toBe(1.0);
    expect(seasonFit(warm, 'latesummer')).toBe(5.0);
  });

  it('fall: cool=5.0, warm=2.0', () => {
    expect(seasonFit(cool, 'fall')).toBe(5.0);
    expect(seasonFit(warm, 'fall')).toBe(2.0);
  });

  it('winter: cool=3.0, warm=1.0', () => {
    expect(seasonFit(cool, 'winter')).toBe(3.0);
    expect(seasonFit(warm, 'winter')).toBe(1.0);
  });

  it('unknown season defaults to 3.0', () => {
    expect(seasonFit(cool, 'monsoon')).toBe(3.0);
    expect(seasonFit(warm, 'monsoon')).toBe(3.0);
  });
});

// ── Factor 6: Adjacency ─────────────────────────────────────────────────────

describe('adjacencyScore', () => {
  it('returns 0 for unknown crop', () => {
    const grid = Array.from({ length: 32 }, () => ({ cropId: null }));
    expect(adjacencyScore('nonexistent_999', 0, grid)).toBe(0);
  });

  it('is clamped between -2 and +2', () => {
    // Can't easily test extremes without planting many conflicting neighbors,
    // but the clamp should always hold
    const grid = Array.from({ length: 32 }, () => ({ cropId: null }));
    grid[0] = { cropId: 'basil' };
    const score = adjacencyScore('basil', 0, grid);
    expect(score).toBeGreaterThanOrEqual(-2);
    expect(score).toBeLessThanOrEqual(2);
  });
});

// ── scoreCell integration ────────────────────────────────────────────────────

describe('scoreCell', () => {
  it('returns null for empty cell', () => {
    const store = createTestStore();
    const state = store.getState();
    const result = scoreCell(0, state.season.grid, state.season.siteConfig, 'spring');
    expect(result).toBeNull();
  });

  it('returns a valid score object for a planted cell', () => {
    const store = createTestStore();
    plantGrid(store, { 0: 'basil' });
    const state = store.getState();
    const result = scoreCell(0, state.season.grid, state.season.siteConfig, 'spring');

    expect(result).not.toBeNull();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(10);
    expect(result.cropId).toBe('basil');
    expect(result.cellIndex).toBe(0);
    expect(result.factors).toHaveProperty('sunFit');
    expect(result.factors).toHaveProperty('supportFit');
    expect(result.factors).toHaveProperty('shadeFit');
    expect(result.factors).toHaveProperty('accessFit');
    expect(result.factors).toHaveProperty('seasonFit');
    expect(result.factors).toHaveProperty('adjacency');
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const store = createTestStore();
    plantGrid(store, { 0: 'lettuce', 1: 'basil', 8: 'spinach' });
    const state = store.getState();
    const grid = state.season.grid;
    const config = state.season.siteConfig;

    const result1 = scoreCell(0, grid, config, 'spring');
    const result2 = scoreCell(0, grid, config, 'spring');
    expect(result1.total).toBe(result2.total);
    expect(result1.factors).toEqual(result2.factors);
  });

  it('score changes with season', () => {
    const store = createTestStore();
    plantGrid(store, { 0: 'lettuce' }); // cool season crop
    const state = store.getState();
    const grid = state.season.grid;
    const config = state.season.siteConfig;

    const spring = scoreCell(0, grid, config, 'spring');
    const summer = scoreCell(0, grid, config, 'summer');
    expect(spring.total).not.toBe(summer.total);
  });
});

// ── scoreBed integration ─────────────────────────────────────────────────────

describe('scoreBed', () => {
  it('returns grade F for empty bed', () => {
    const store = createTestStore();
    const state = store.getState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring');
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('returns a valid score and grade for planted bed', () => {
    const store = createTestStore();
    plantGrid(store, buildMinimalLayout());
    const state = store.getState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring');

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    expect(result.occupiedCount).toBe(8);
    expect(result.details.uniqueCrops).toBeGreaterThanOrEqual(4);
  });

  it('grade thresholds match spec', () => {
    // Verify grade boundaries are correct
    // A+ >= 90, A >= 85, B >= 70, C >= 55, D >= 40, F < 40
    const store = createTestStore();
    plantGrid(store, buildMinimalLayout());
    const state = store.getState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring');

    if (result.score >= 90) expect(result.grade).toBe('A+');
    else if (result.score >= 85) expect(result.grade).toBe('A');
    else if (result.score >= 70) expect(result.grade).toBe('B');
    else if (result.score >= 55) expect(result.grade).toBe('C');
    else if (result.score >= 40) expect(result.grade).toBe('D');
    else expect(result.grade).toBe('F');
  });

  it('diversity bonus applied for 4+ unique crops', () => {
    const store = createTestStore();
    plantGrid(store, buildMinimalLayout()); // 6 unique crops
    const state = store.getState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring');
    expect(result.details.diversityBonus).toBe(0.7);
  });

  it('fill penalty applied for partially filled bed', () => {
    const store = createTestStore();
    plantGrid(store, { 0: 'basil' }); // only 1 of 32 cells
    const state = store.getState();
    const result = scoreBed(state.season.grid, state.season.siteConfig, 'spring');
    expect(result.details.fillPenalty).toBeGreaterThan(0);
  });

  it('is deterministic across calls', () => {
    const store = createTestStore();
    plantGrid(store, buildMinimalLayout());
    const state = store.getState();
    const r1 = scoreBed(state.season.grid, state.season.siteConfig, 'spring');
    const r2 = scoreBed(state.season.grid, state.season.siteConfig, 'spring');
    expect(r1.score).toBe(r2.score);
    expect(r1.grade).toBe(r2.grade);
  });
});
