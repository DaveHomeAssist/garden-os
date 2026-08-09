import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cssUrls = [
  new URL('../../assets/css/hud-foundation.css', import.meta.url),
  new URL('../../assets/css/hud-controls.css', import.meta.url),
  new URL('../../assets/css/hud-interactions.css', import.meta.url),
];
const css = cssUrls.map((url) => readFileSync(url, 'utf8')).join('\n');

function token(name) {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? null;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('Story Mode field-kit CSS contract', () => {
  it('keeps functional parchment and progression combinations above WCAG AA contrast', () => {
    expect(contrast(token('hud-ink'), token('hud-paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('hud-ink-soft'), token('hud-paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#fff8e8', token('hud-leaf'))).toBeGreaterThanOrEqual(4.5);
  });

  it('defines the safe frame, state, target, focus, and reduced-motion rules', () => {
    expect(css).toContain('1872px');
    expect(css).toContain('.tool-hud__slot[aria-pressed="true"]');
    expect(css).toContain('.season-card__beat[data-state="current"]');
    expect(css).toContain('.world-context-menu__option:disabled');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
