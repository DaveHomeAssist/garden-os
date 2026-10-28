// @vitest-environment jsdom
// Live playtest 2026-10-28: on a 390x844 phone the tool row (z 22) covered most
// of the Move stick (z 14); only 41 of 137 ring points took a touch.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTouchStick } from './touch-stick.js';

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });

describe('touch stick vs tool row', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('lifts the stick clear of an overlapping tool row, and drops back when the row is gone', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    const toolRow = { getBoundingClientRect: () => rect(10, 628, 354, 66) };
    let obstacle = toolRow;
    const stick = createTouchStick({ getObstacle: () => obstacle });
    stick.mount(document.body);
    const root = document.querySelector('.touch-stick');
    // jsdom has no layout: report the stick's box from its bottom offset (844 px viewport, 132 px tall)
    vi.spyOn(root, 'getBoundingClientRect').mockImplementation(() => {
      const bottom = Number(/calc\((\d+)px/.exec(root.style.bottom)[1]);
      return rect(18, 844 - bottom - 132, 112, 132);
    });
    stick.setEnabled(true);
    stick.syncClearance();
    const s = root.getBoundingClientRect();
    expect(s.bottom).toBeLessThanOrEqual(628 - 10 + 0.5);
    expect(root.style.bottom).toContain('safe-area-inset-bottom');
    obstacle = null;
    stick.syncClearance();
    expect(stick.getLift()).toBe(0);
    expect(root.style.bottom).toContain('118px');
    stick.dispose();
  });
});
