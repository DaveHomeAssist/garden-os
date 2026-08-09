// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorldContextMenu } from './context-menu.js';

describe('world context menu keyboard behavior', () => {
  let menu = null;

  afterEach(() => {
    menu?.dispose();
    menu = null;
    document.body.replaceChildren();
  });

  function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event;
  }

  it('uses menu semantics, focuses the first enabled option, and skips disabled rows', () => {
    menu = createWorldContextMenu();
    menu.open({
      x: 100,
      y: 100,
      options: [
        { verb: 'Water', target: 'Tomato', onSelect: vi.fn() },
        { verb: 'Harvest', target: 'Tomato', disabled: true, hint: 'Not ready' },
        { verb: 'Examine', target: 'Tomato', onSelect: vi.fn() },
      ],
    });

    const items = [...menu.element.querySelectorAll('[role="menuitem"]')];
    expect(menu.element.getAttribute('role')).toBe('menu');
    expect(document.activeElement).toBe(items[0]);
    expect(items[1].disabled).toBe(true);
    expect(items[1].getAttribute('aria-disabled')).toBe('true');

    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[2]);
    press('ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    press('End');
    expect(document.activeElement).toBe(items[2]);
    press('Home');
    expect(document.activeElement).toBe(items[0]);
    press('ArrowUp');
    expect(document.activeElement).toBe(items[2]);
  }, 15_000);

  it('restores focus to the previous control after Escape', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open actions';
    document.body.append(trigger);
    trigger.focus();

    menu = createWorldContextMenu();
    menu.open({ x: 100, y: 100, options: [{ verb: 'Cancel', onSelect: vi.fn() }] });
    expect(document.activeElement).not.toBe(trigger);

    const escape = press('Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  }, 15_000);
});
