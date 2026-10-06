// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showGameplayGuide } from './gameplay-guide.js';

describe('How To Play guide close (Phase 0.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function openGuide() {
    return showGameplayGuide({ title: 'Gameplay Guide', subtitle: 'test' });
  }

  function expectOverlayGone() {
    expect(document.getElementById('title-guide-overlay')).toBeNull();
    expect(document.querySelectorAll('.title-guide-overlay').length).toBe(0);
  }

  it('removes the blur overlay when × is clicked', () => {
    const sheet = openGuide();
    const overlay = document.getElementById('title-guide-overlay');
    expect(overlay).toBeTruthy();
    sheet.querySelector('[data-close="true"]').click();
    vi.advanceTimersByTime(300);
    expectOverlayGone();
  });

  it('removes the blur overlay on Escape', () => {
    openGuide();
    expect(document.getElementById('title-guide-overlay')).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    vi.advanceTimersByTime(300);
    expectOverlayGone();
  });

  it('removes the blur overlay on backdrop click', () => {
    openGuide();
    const overlay = document.getElementById('title-guide-overlay');
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(300);
    expectOverlayGone();
  });
});
