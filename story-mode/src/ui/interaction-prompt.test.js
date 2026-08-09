// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInteractionPrompt } from './interaction-prompt.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.matchMedia = vi.fn(() => ({ matches: false }));
});

describe('interaction prompt', () => {
  it('uses a named native button and keeps hidden state out of the accessibility tree', () => {
    const prompt = createInteractionPrompt({
      container: document.getElementById('app'),
      onActivate: vi.fn(),
    });

    expect(prompt.element.tagName).toBe('BUTTON');
    expect(prompt.element.hidden).toBe(true);
    expect(prompt.element.getAttribute('aria-hidden')).toBe('true');

    prompt.update({ x: 120, y: 240, label: 'Talk to Calvin', visible: true });

    expect(prompt.element.hidden).toBe(false);
    expect(prompt.element.classList.contains('is-visible')).toBe(true);
    expect(prompt.element.getAttribute('aria-label')).toBe('Interact: Talk to Calvin');
    expect(prompt.element.style.left).toBe('120px');
    expect(prompt.element.style.top).toBe('240px');
  }, 15_000);

  it('routes activation and presents coarse-pointer copy', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    const onActivate = vi.fn();
    const prompt = createInteractionPrompt({ container: document.getElementById('app'), onActivate });

    prompt.update({ x: 10, y: 20, label: 'Open gate', visible: true });
    prompt.element.click();

    expect(prompt.element.classList.contains('is-coarse')).toBe(true);
    expect(prompt.element.getAttribute('aria-label')).toBe('Tap: Open gate');
    expect(onActivate).toHaveBeenCalledTimes(1);
  }, 15_000);
});
