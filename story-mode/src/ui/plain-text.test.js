import { describe, expect, it } from 'vitest';
import eventDeck from 'specs/EVENT_DECK.json';
import { buildObjectiveText, describeEventEffect, formatHudScore, VILLAGE_OBJECTIVE_TEXT, VILLAGE_OBJECTIVE_TEXT_TOUCH } from './plain-text.js';

const JARGON = /Paths \d|Zone:|current_beat|rest_of_season|carry_forward|row-\d|col-\d|[+-]\d+(\.\d+)? ·/;

describe('plain objective text', () => {
  const cases = [
    { phase: 'PLANNING', season: 'spring', planted: 0 },
    { phase: 'PLANNING', season: 'spring', planted: 3 },
    { phase: 'PLANNING', season: 'spring', planted: 8 },
    { phase: 'PLANNING', season: 'winter' },
    { phase: 'PLANNING', season: 'winter', winterReviewSeen: true },
    { phase: 'PLANNING', season: 'summer', zoneId: 'neighborhood', zoneName: 'The Neighborhood', forageAvailable: 3 },
    { phase: 'PLANNING', season: 'spring', sandbox: true },
    { phase: 'EARLY_SEASON', season: 'spring', nextPhaseLabel: 'Mid Season' },
    { phase: 'TRANSITION', season: 'fall' },
  ];
  it.each(cases)('has no developer jargon: %o', (input) => {
    const text = buildObjectiveText(input);
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toMatch(JARGON);
  });

  it('tells a first-time player exactly what to do', () => {
    expect(buildObjectiveText({ phase: 'PLANNING', season: 'spring', planted: 0 })).toMatch(/Press Plant.*at least 8.*Start Season/);
    expect(buildObjectiveText({ phase: 'PLANNING', season: 'spring', planted: 5 })).toMatch(/\(5\/8\)/);
    expect(buildObjectiveText({ phase: 'PLANNING', season: 'summer', zoneId: 'neighborhood', zoneName: 'The Neighborhood' })).toMatch(/You're in The Neighborhood.*Head home to plant/);
  });
});

describe('Free Play objective text', () => {
  it('never mentions chapters, the 8-crop minimum or the winter review', () => {
    const inputs = [
      { phase: 'PLANNING', season: 'spring', sandbox: true, planted: 0 },
      { phase: 'PLANNING', season: 'summer', sandbox: true, planted: 5, bedSize: 32 },
      { phase: 'PLANNING', season: 'winter', sandbox: true },
      { phase: 'PLANNING', season: 'winter', sandbox: true, planted: 2 },
      { phase: 'TRANSITION', season: 'fall', sandbox: true },
    ];
    for (const input of inputs) {
      expect(buildObjectiveText(input)).not.toMatch(/chapter|at least 8|review/i);
    }
    expect(buildObjectiveText(inputs[1])).toMatch(/5 \/ 32 planted/);
  });
});

describe('plain event effects', () => {
  it('every event in the deck reads as words, not numbers', () => {
    for (const event of eventDeck.events) {
      const text = describeEventEffect(event.mechanicalEffect);
      expect(text, event.id).not.toMatch(JARGON);
      expect(text, event.id).toMatch(/\.$/);
    }
  });

  it('describes Late Frost as a big hit to frost-sensitive crops this step', () => {
    expect(describeEventEffect({ modifier: -2, duration: 'current_beat', target: { type: 'crop_filter', filter: 'frost-sensitive' } }))
      .toBe('Big hit to frost sensitive crops, this step only.');
  });
});

describe('village objective text (V0)', () => {
  it('describes the V0 stations and the way home, in every phase, with no NPC talk', () => {
    for (const phase of ['PLANNING', 'EARLY_SEASON', 'HARVEST', 'TRANSITION']) {
      const text = buildObjectiveText({ phase, season: 'spring', sandbox: true, zoneId: 'village', zoneName: 'Village' });
      expect(text).toBe(VILLAGE_OBJECTIVE_TEXT);
    }
    expect(VILLAGE_OBJECTIVE_TEXT).toMatch(/seed stand/);
    expect(VILLAGE_OBJECTIVE_TEXT).toMatch(/compost bin/);
    expect(VILLAGE_OBJECTIVE_TEXT).toMatch(/plot/);
    expect(VILLAGE_OBJECTIVE_TEXT).not.toMatch(/neighbo|talk|Start Season|Plant,/i);
  });
});

describe('device-aware objective wording (phone playthrough, Nov 23)', () => {
  it('touch players are told to tap, not to press E', () => {
    const text = buildObjectiveText({ phase: 'PLANNING', season: 'spring', sandbox: true, zoneId: 'village', touch: true });
    expect(text).toBe(VILLAGE_OBJECTIVE_TEXT_TOUCH);
    expect(text).not.toMatch(/\bE\b/);
    expect(text).toMatch(/Tap/);
    const zone = buildObjectiveText({ phase: 'PLANNING', season: 'spring', zoneId: 'park', zoneName: 'the park', touch: true });
    expect(zone).not.toMatch(/with E/);
  });

  it('says Continue in winter, matching the advance button', () => {
    const text = buildObjectiveText({ phase: 'EARLY_SEASON', season: 'winter', sandbox: true, nextPhaseLabel: 'Mid Season' });
    expect(text).toBe('The season is growing. Press Continue for Mid Season.');
    expect(buildObjectiveText({ phase: 'EARLY_SEASON', season: 'spring', sandbox: true, nextPhaseLabel: 'Mid Season' })).toMatch(/Press Next/);
  });
});

describe('HUD score readout', () => {
  it('marks an unscored bed empty so phones can hide the bare "--"', () => {
    expect(formatHudScore(0)).toEqual({ text: '--', empty: true });
    expect(formatHudScore(undefined)).toEqual({ text: '--', empty: true });
    expect(formatHudScore(42)).toEqual({ text: '42', empty: false });
  });
});
