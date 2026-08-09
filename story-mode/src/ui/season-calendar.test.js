// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { createSeasonCalendar, updateSeasonCalendar } from './season-calendar.js';

function makeState({ chapter = 1, season = 'spring', phase = 'PLANNING' } = {}) {
  return {
    campaign: { currentChapter: chapter },
    season: { season, phase },
  };
}

beforeEach(() => {
  document.body.replaceChildren(createSeasonCalendar());
});

describe('season calendar', () => {
  it('starts as one atomic, readable status region', () => {
    const calendar = document.getElementById('season-calendar');

    expect(calendar.getAttribute('role')).toBe('status');
    expect(calendar.getAttribute('aria-live')).toBe('polite');
    expect(calendar.getAttribute('aria-atomic')).toBe('true');
    expect(calendar.dataset.uiRole).toBe('season-status');
    expect(calendar.querySelectorAll('.cal-beat')).toHaveLength(3);
  });

  it('exposes complete, current, and upcoming beat states without color alone', () => {
    updateSeasonCalendar(makeState({ season: 'summer', phase: 'MID_SEASON' }));

    const states = [...document.querySelectorAll('.cal-beat')].map((beat) => beat.dataset.state);
    expect(states).toEqual(['complete', 'current', 'upcoming']);
    expect(document.getElementById('cal-month').textContent).toBe('July');
    expect(document.getElementById('cal-beat-label').textContent).toBe('mid summer');
    expect(document.getElementById('season-calendar').getAttribute('aria-label')).toContain('July');
  });

  it('clamps free-play chapters to the three-year campaign label', () => {
    updateSeasonCalendar(makeState({ chapter: 99, season: 'winter', phase: 'TRANSITION' }));

    expect(document.getElementById('cal-year').textContent).toBe('Year 3 of 3');
    expect(document.getElementById('cal-beat-label').textContent).toBe('Season Complete');
    expect([...document.querySelectorAll('.cal-beat')].map((beat) => beat.dataset.state))
      .toEqual(['complete', 'complete', 'complete']);
  });
});
