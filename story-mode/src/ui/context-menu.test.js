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
});
