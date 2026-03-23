import { describe, expect, it } from 'vitest';
import { getMaterialProps, getStyleForPhase } from './scene-style.js';

describe('scene-style', () => {
  it('maps planning phases to planner mode', () => {
    expect(getStyleForPhase('PLANNING')).toBe('planner');
    expect(getStyleForPhase('inspect')).toBe('planner');
  });

  it('maps narrative beats to richer scene styles', () => {
    expect(getStyleForPhase('EARLY_SEASON')).toBe('story');
    expect(getStyleForPhase('CUTSCENE')).toBe('story');
    expect(getStyleForPhase('HARVEST')).toBe('celebration');
  });

  it('returns planner material defaults for unknown styles', () => {
    expect(getMaterialProps('missing-style')).toMatchObject({
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    });
  });
});
