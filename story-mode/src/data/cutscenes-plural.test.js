import { describe, expect, it } from 'vitest';
import { getHighestPriorityCutscene, plural } from './cutscenes.js';

describe('plural helper', () => {
  it('returns singular for 1 and plural otherwise', () => {
    expect(plural(1, 'thing')).toBe('thing');
    expect(plural(0, 'thing')).toBe('things');
    expect(plural(2, 'thing')).toBe('things');
    expect(plural(1, 'pull')).toBe('pull');
    expect(plural(3, 'pull')).toBe('pulls');
  });
});

describe('harvest yield grammar', () => {
  const campaign = { playerProfile: { returningGardener: 'Mom' } };
  const seen = new Set();

  function harvestTexts({ grade, season = 'spring', yieldCount, recipeMatches = [] }) {
    const scene = getHighestPriorityCutscene(
      { type: 'harvest_complete', grade, season, yieldCount, recipeMatches },
      campaign,
      seen,
    );
    return (scene?.beats ?? []).map((beat) => beat.text);
  }

  it.each([0, 1, 2])('grade B pantry line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({ grade: 'B', yieldCount });
    const pantry = texts.find((text) => text.includes('for the pantry'));
    expect(pantry).toBeTruthy();
    if (yieldCount === 1) {
      expect(pantry).toMatch(/\b1 thing for the pantry\b/);
      expect(pantry).not.toMatch(/\b1 things\b/);
    } else {
      expect(pantry).toMatch(new RegExp(`\\b${yieldCount} things for the pantry\\b`));
    }
  });

  it.each([0, 1, 2])('grade D rough-season line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({ grade: 'D', yieldCount });
    const rough = texts.find((text) => text.includes('came in'));
    expect(rough).toBeTruthy();
    if (yieldCount === 1) {
      expect(rough).toMatch(/\b1 thing came in\b/);
      expect(rough).not.toMatch(/\b1 things\b/);
    } else {
      expect(rough).toMatch(new RegExp(`\\b${yieldCount} things came in\\b`));
    }
  });

  it.each([0, 1, 2])('grade A+ pull line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({ grade: 'A+', yieldCount });
    const pulls = texts.find((text) => text.includes('useful'));
    expect(pulls).toBeTruthy();
    if (yieldCount === 1) {
      expect(pulls).toMatch(/\b1 useful pull\b/);
      expect(pulls).not.toMatch(/\b1 useful pulls\b/);
    } else {
      expect(pulls).toMatch(new RegExp(`\\b${yieldCount} useful pulls\\b`));
    }
  });

  it.each([0, 1, 2])('grade A solid-pull line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({ grade: 'A', season: 'spring', yieldCount });
    const pulls = texts.find((text) => text.includes('solid'));
    expect(pulls).toBeTruthy();
    if (yieldCount === 1) {
      expect(pulls).toMatch(/\b1 solid pull\b/);
      expect(pulls).not.toMatch(/\b1 solid pulls\b/);
    } else {
      expect(pulls).toMatch(new RegExp(`\\b${yieldCount} solid pulls\\b`));
    }
  });

  it.each([0, 1, 2])('recipe match "good things" line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({
      grade: 'B',
      yieldCount,
      recipeMatches: ['garden_salad'],
    });
    const line = texts.find((text) => text.includes('out of the bed') && text.includes('good'));
    expect(line).toBeTruthy();
    if (yieldCount === 1) {
      expect(line).toMatch(/\b1 good thing out of the bed\b/);
      expect(line).not.toMatch(/\b1 good things\b/);
    } else {
      expect(line).toMatch(new RegExp(`\\b${yieldCount} good things out of the bed\\b`));
    }
  });

  it.each([0, 1, 2])('moms_sauce "good pulls" line is grammatical for yieldCount %i', (yieldCount) => {
    const texts = harvestTexts({
      grade: 'A',
      yieldCount,
      recipeMatches: ['moms_sauce'],
    });
    const line = texts.find((text) => text.includes('good') && text.includes('out of the bed'));
    expect(line).toBeTruthy();
    if (yieldCount === 1) {
      expect(line).toMatch(/\b1 good pull out of the bed\b/);
      expect(line).not.toMatch(/\b1 good pulls\b/);
    } else {
      expect(line).toMatch(new RegExp(`\\b${yieldCount} good pulls out of the bed\\b`));
    }
  });
});
