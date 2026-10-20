import { describe, expect, it } from 'vitest';
import { getHighestPriorityCutscene } from './cutscenes.js';
import { getChapterNarrative } from '../ui/chapter-text.js';

const SEASON_BY_CHAPTER = { 1: 'spring', 2: 'summer', 3: 'fall', 5: 'spring', 6: 'summer', 7: 'fall' };
const OTHER = { spring: /\b(summer|fall|autumn) (came|heat)/i, summer: /\bspring came\b/i, fall: /\b(spring came|summer heat)\b/i };

function acceptLines(payload) {
  const scene = getHighestPriorityCutscene({ type: 'intervention_used', intervention: 'accept_loss', ...payload }, {}, new Set());
  return scene.beats.map((b) => b.text);
}

describe('P0-9 text fixes', () => {
  it.each(Object.entries(SEASON_BY_CHAPTER))('chapter %s intro does not open in the wrong season', (chapter, season) => {
    const text = getChapterNarrative(Number(chapter), {});
    expect(text).not.toMatch(OTHER[season]);
  });

  it('Chapter 2 opens in summer', () => {
    expect(getChapterNarrative(2, {})).toMatch(/^Summer came fast/);
  });

  it('the Accept reaction is no longer the same line after every event', () => {
    const events = ['Late Frost Advisory', 'Windy Week', 'Aphid Bloom', 'Hail Scare', 'Heat Dome', 'Squirrel Raid'];
    const lines = new Set(events.flatMap((eventTitle, i) => acceptLines({ eventTitle, eventValence: 'negative', season: 'spring', chapter: i + 1 })));
    expect(lines.size).toBeGreaterThan(3);
    for (const line of lines) expect(line).not.toMatch(/consequence belongs to this beat/);
  });

  it('accepting good news does not talk about a loss', () => {
    const lines = acceptLines({ eventTitle: 'Spring Rain Streak', eventValence: 'positive', season: 'spring', chapter: 1 });
    expect(lines.join(' ')).not.toMatch(/loss|hit|cost/i);
    expect(lines.join(' ')).toMatch(/Spring Rain Streak/);
  });
});

describe('harvest count', () => {
  it('"N things" counts harvested cells, not crop types', async () => {
    const { createGameState, PHASES } = await import('../game/state.js');
    const { advance } = await import('../game/phase-machine.js');
    const state = createGameState();
    state.season.campaign = state.campaign;
    state.season.grid.forEach((cell, i) => { cell.cropId = i < 3 ? 'basil' : i < 10 ? 'lettuce' : null; });
    state.season.phase = PHASES.LATE_SEASON;
    state.season.eventActive = null;
    const result = advance(state);
    expect(result.trigger.type).toBe('harvest_complete');
    expect(result.trigger.yieldCount).toBe(10);
    expect(result.trigger.cropTypeCount).toBe(2);
  });
});
