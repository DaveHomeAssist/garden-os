import { describe, expect, it } from 'vitest';

import { getMonthlyEvents } from './events.js';

describe('getMonthlyEvents', () => {
  it('applies month-specific rotation rules', () => {
    const springMonth1 = getMonthlyEvents('spring', 1, 6, []).map((event) => event.id);
    const summerMonth2 = getMonthlyEvents('summer', 2, 6, []).map((event) => event.id);

    expect(springMonth1).toContain('S01');
    expect(springMonth1).not.toContain('U05');
    expect(summerMonth2).toContain('U05');
    expect(summerMonth2).not.toContain('S01');
  });

  it('filters already drawn events and respects chapter gating', () => {
    const fallPool = getMonthlyEvents('fall', 3, 2, ['F01']).map((event) => event.id);
    expect(fallPool).not.toContain('F01');
  });

  it('keeps unrestricted events available across the season', () => {
    const month1 = getMonthlyEvents('summer', 1, 12, []).map((event) => event.id);
    const month3 = getMonthlyEvents('summer', 3, 12, []).map((event) => event.id);

    expect(month1).toContain('U06');
    expect(month3).toContain('U06');
  });
});
