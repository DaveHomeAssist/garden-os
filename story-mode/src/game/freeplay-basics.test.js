import { describe, expect, it } from 'vitest';
import { createSandboxState, PHASES } from './state.js';
import { normalizeGameState } from './store.js';
import { advance, canAdvance } from './phase-machine.js';
import { getFreePlayYear } from '../ui/season-calendar.js';
import { getHighestPriorityCutscene } from '../data/cutscenes.js';

function linked(state) {
  state.season.campaign = state.campaign;
  return state;
}

function plantAll(state, cropId = state.campaign.cropsUnlocked[0]) {
  state.season.grid.forEach((cell) => { cell.cropId = cropId; });
}

function runSeason(state) {
  // PLANNING → EARLY → MID → LATE → HARVEST → TRANSITION → PLANNING
  for (let i = 0; i < 6; i += 1) {
    state.season.eventActive = null;
    const result = advance(state);
    expect(result.advanced).toBe(true);
  }
}

describe('Free Play bed matches the drawn 8×4 bed', () => {
  it('starts with 32 cells and 32 soil entries', () => {
    const state = createSandboxState();
    expect(state.season.gridCols).toBe(8);
    expect(state.season.gridRows).toBe(4);
    expect(state.season.grid).toHaveLength(32);
    expect(state.campaign.soilHealth).toHaveLength(32);
  });

  it('is not expanded to 8×8 by normalizeGameState (chapter 99)', () => {
    const state = normalizeGameState(createSandboxState());
    expect(state.season.grid).toHaveLength(32);
    expect(state.season.gridRows).toBe(4);
    expect(state.campaign.soilHealth).toHaveLength(32);
  });

  it('keeps 32 cells across season rollovers', () => {
    const state = linked(createSandboxState());
    for (let s = 0; s < 3; s += 1) {
      plantAll(state);
      runSeason(state);
      expect(state.season.phase).toBe(PHASES.PLANNING);
      expect(state.season.grid).toHaveLength(32);
    }
    expect(state.season.season).toBe('winter');
  });
});

describe('Free Play Start Season needs a planted bed', () => {
  it('blocks an empty bed outside winter and allows one crop', () => {
    const state = linked(createSandboxState());
    expect(canAdvance(state.season)).toBe(false);
    state.season.grid[0].cropId = state.campaign.cropsUnlocked[0];
    expect(canAdvance(state.season)).toBe(true);
  });

  it('lets the winter bed rest empty', () => {
    const state = linked(createSandboxState());
    state.season.season = 'winter';
    expect(canAdvance(state.season)).toBe(true);
  });
});

describe('Free Play calendar and copy', () => {
  it('counts years from seasons played, not chapter 99', () => {
    const state = linked(createSandboxState());
    expect(getFreePlayYear(state.campaign)).toBe(1);
    for (let s = 0; s < 4; s += 1) {
      plantAll(state);
      runSeason(state);
    }
    expect(state.campaign.freePlaySeasonIndex).toBe(4);
    expect(state.season.season).toBe('spring');
    expect(getFreePlayYear(state.campaign)).toBe(2);
  });

  it('uses a Free Play line at season end, not "Chapter closed"', () => {
    const scene = getHighestPriorityCutscene(
      { type: 'chapter_complete', chapter: 99, season: 'spring', sandbox: true },
      {},
      new Set(),
    );
    expect(scene.id).toBe('freeplay-season-complete');
    expect(scene.beats.map((beat) => beat.text).join(' ')).not.toMatch(/Chapter closed/);
  });

  it('keeps the story chapter-complete line for Story Mode', () => {
    const scene = getHighestPriorityCutscene(
      { type: 'chapter_complete', chapter: 3, season: 'winter' },
      {},
      new Set(),
    );
    expect(scene.id).toBe('chapter-complete');
  });

  it('marks sandbox on the harvest and season-end triggers', () => {
    const state = linked(createSandboxState());
    plantAll(state);
    const triggers = [];
    for (let i = 0; i < 5; i += 1) {
      state.season.eventActive = null;
      triggers.push(advance(state).trigger);
    }
    const harvest = triggers.find((t) => t?.type === 'harvest_complete');
    const done = triggers.find((t) => t?.type === 'chapter_complete');
    expect(harvest.sandbox).toBe(true);
    expect(done.sandbox).toBe(true);
  });
});
