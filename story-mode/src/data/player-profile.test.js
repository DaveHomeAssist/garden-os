import { describe, expect, it } from 'vitest';

import {
  getProfileRecipeName,
  normalizePlayerProfile,
  resolvePlayerText,
} from './player-profile.js';

describe('player profile', () => {
  it('defaults to Mom as the canonical gardener', () => {
    expect(normalizePlayerProfile()).toEqual({
      displayName: 'Mom',
      skinTone: 'warm',
      hair: 'softBrown',
      outfit: 'gardenApron',
    });
  });

  it('sanitizes profile text and rejects unknown option ids', () => {
    expect(normalizePlayerProfile({
      displayName: '  Dave\u0000  Garden   ',
      skinTone: 'unknown',
      hair: 'silver',
      outfit: 'workDenim',
    })).toEqual({
      displayName: 'Dave Garden',
      skinTone: 'warm',
      hair: 'silver',
      outfit: 'workDenim',
    });
  });

  it('resolves narrative labels for default and custom gardeners', () => {
    expect(resolvePlayerText('{returningGardener} made {recipeLabel}.', {}))
      .toBe("Mom made Mom's recipe.");
    expect(resolvePlayerText('{returningGardener} made {recipeLabel}.', {
      playerProfile: { displayName: 'Ana' },
    })).toBe('Ana made your sauce recipe.');
  });

  it('keeps recipe ids stable while customizing display names', () => {
    expect(getProfileRecipeName('moms_sauce', "Mom's Sauce", {})).toBe("Mom's Sauce");
    expect(getProfileRecipeName('moms_sauce', "Mom's Sauce", {
      playerProfile: { displayName: 'Jess' },
    })).toBe("Jess' Sauce");
    expect(getProfileRecipeName('garden_salad', 'Garden Salad', {
      playerProfile: { displayName: 'Jess' },
    })).toBe('Garden Salad');
  });
});
