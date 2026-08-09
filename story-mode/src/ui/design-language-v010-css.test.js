import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../assets/css/design-language-v010.css', import.meta.url), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  return match?.[1] ?? null;
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

describe('Story Mode design-language CSS contract', () => {
  it('keeps functional text and the primary CTA above WCAG AA contrast', () => {
    expect(contrast(token('gos-ui-text'), token('gos-ui-surface-strong'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('gos-ui-text-muted'), token('gos-ui-surface-strong'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('gos-ui-accent-ink'), token('gos-ui-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('defines the required hierarchy, state, viewport, and reduced-motion rules', () => {
    expect(css).toContain('.hud-action-btn.is-visible');
    expect(css).toContain('#fab-advance::before');
    expect(css).toContain('.tool-hud__slot[aria-pressed="true"]');
    expect(css).toContain('button:focus-visible');
    expect(css).toContain('@media (min-width: 1600px)');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
