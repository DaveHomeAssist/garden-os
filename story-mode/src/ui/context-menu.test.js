// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorldContextMenu } from './context-menu.js';

describe('createWorldContextMenu', () => {
  let menu = null;

  afterEach(() => {
    menu?.dispose();
    menu = null;
  });

  it('renders a Choose Option header and one row per option', () => {
    menu = createWorldContextMenu();
    const opened = menu.open({
      x: 100,
      y: 100,
      options: [
        { verb: 'Water', target: 'Tomato', onSelect: vi.fn() },
        { verb: 'Examine', target: 'Tomato', onSelect: vi.fn() },
        { verb: 'Cancel', onSelect: vi.fn() },
      ],
    });

    expect(opened).toBe(true);
    expect(menu.isOpen()).toBe(true);
    expect(menu.element.textContent).toContain('Choose Option');
    expect(menu.element.querySelectorAll('button')).toHaveLength(3);
    expect(menu.element.textContent).toContain('Water');
    expect(menu.element.textContent).toContain('Tomato');
  });

  it('refuses to open with no options', () => {
    menu = createWorldContextMenu();
    expect(menu.open({ x: 10, y: 10, options: [] })).toBe(false);
    expect(menu.isOpen()).toBe(false);
  });

  it('runs onSelect and closes when an option is clicked', () => {
    menu = createWorldContextMenu();
    const onSelect = vi.fn();
    menu.open({ x: 50, y: 50, options: [{ verb: 'Harvest', target: 'Carrot', onSelect }] });

    menu.element.querySelector('button').click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menu.isOpen()).toBe(false);
  });

  it('ignores clicks on disabled options', () => {
    menu = createWorldContextMenu();
    const onSelect = vi.fn();
    menu.open({
      x: 50,
      y: 50,
      options: [{ verb: 'Water', target: 'Tomato', disabled: true, hint: 'Recently watered.', onSelect }],
    });

    menu.element.querySelector('button').click();

    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.isOpen()).toBe(true);
    expect(menu.element.textContent).toContain('Recently watered.');
  });

  it('closes on Escape', () => {
    menu = createWorldContextMenu();
    menu.open({ x: 50, y: 50, options: [{ verb: 'Cancel', onSelect: vi.fn() }] });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(menu.isOpen()).toBe(false);
  });

  it('consumes the Escape keystroke so game key bindings never see it', () => {
    menu = createWorldContextMenu();
    menu.open({ x: 50, y: 50, options: [{ verb: 'Cancel', onSelect: vi.fn() }] });

    const documentSpy = vi.fn();
    document.addEventListener('keydown', documentSpy);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    window.dispatchEvent(escape);
    document.removeEventListener('keydown', documentSpy);

    expect(menu.isOpen()).toBe(false);
    expect(escape.defaultPrevented).toBe(true);
    expect(documentSpy).not.toHaveBeenCalled();
  });

  it('reports outside-pointerdown dismissals so the host can suppress the click', () => {
    const onOutsideDismiss = vi.fn();
    menu = createWorldContextMenu({ onOutsideDismiss });
    menu.open({ x: 50, y: 50, options: [{ verb: 'Cancel', onSelect: vi.fn() }] });

    // Pointerdown inside the menu: stays open, no dismissal callback.
    menu.element.querySelector('button').dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(menu.isOpen()).toBe(true);
    expect(onOutsideDismiss).not.toHaveBeenCalled();

    // Pointerdown outside: closes and reports the event.
    const outside = new MouseEvent('pointerdown', { bubbles: true });
    document.body.dispatchEvent(outside);
    expect(menu.isOpen()).toBe(false);
    expect(onOutsideDismiss).toHaveBeenCalledTimes(1);
    expect(onOutsideDismiss).toHaveBeenCalledWith(outside);

    // Escape dismissal must NOT trigger the pointer suppression path.
    menu.open({ x: 50, y: 50, options: [{ verb: 'Cancel', onSelect: vi.fn() }] });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onOutsideDismiss).toHaveBeenCalledTimes(1);
  });

  it('measures its size from a reset position on reopen (no stale-left squeeze)', () => {
    menu = createWorldContextMenu();
    // Emulate CSS shrink-to-fit: reported width depends on the left offset at
    // measure time, exactly the mechanism behind the stale-left bug.
    Object.defineProperty(menu.element, 'offsetWidth', {
      get() { return parseInt(this.style.left, 10) > 800 ? 170 : 240; },
    });
    Object.defineProperty(menu.element, 'offsetHeight', {
      get() { return 120; },
    });

    const options = () => [{ verb: 'Cancel', onSelect: vi.fn() }];
    menu.open({ x: 1000, y: 100, options: options() });
    const firstLeft = menu.element.style.left;
    menu.close();

    menu.open({ x: 1000, y: 100, options: options() });
    expect(menu.element.style.left).toBe(firstLeft);
  });
});
