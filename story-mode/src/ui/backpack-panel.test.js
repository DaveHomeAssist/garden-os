// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showBackpackPanel } from './backpack-panel.js';

// GD-103: backpack drag-and-drop used HTML5 drag events, which phones never
// fire. These tests drive the pointer-events path the way touch and mouse do.

function makeData() {
  const slots = Array.from({ length: 10 }, () => null);
  slots[0] = { itemId: 'trowel', count: 1, category: 'tools', itemDef: { name: 'Trowel', icon: 'T' } };
  slots[1] = { itemId: 'basil_seed', count: 3, category: 'seeds', itemDef: { name: 'Basil Seed', icon: 'B' } };
  const moves = [];
  const data = {
    inventory: { slots, capacity: 10 },
    actions: {
      onMoveSlot: vi.fn((from, to) => {
        moves.push([from, to]);
        const tmp = slots[to];
        slots[to] = slots[from];
        slots[from] = tmp;
        return { success: true };
      }),
    },
  };
  return { data, slots, moves };
}

function slot(index) {
  return document.querySelector(`#backpack-panel .backpack-slot[data-slot-index="${index}"]`);
}

function pointer(target, type, { x = 0, y = 0, pointerType = 'touch', pointerId = 7, button = 0 } = {}) {
  const event = new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType, pointerId, button,
  });
  target.dispatchEvent(event);
  return event;
}

let hitSlotIndex = null;

beforeEach(() => {
  document.body.replaceChildren();
  hitSlotIndex = null;
  // jsdom has no layout; route hit tests to whichever slot the test names.
  document.elementFromPoint = () => (hitSlotIndex == null ? document.body : slot(hitSlotIndex));
  Element.prototype.setPointerCapture = function setPointerCapture(id) { this.__capture = id; };
  Element.prototype.releasePointerCapture = function releasePointerCapture() { this.__capture = undefined; };
  Element.prototype.hasPointerCapture = function hasPointerCapture(id) { return this.__capture === id; };
});

afterEach(() => {
  delete document.elementFromPoint;
});

function mount() {
  const ctx = makeData();
  const container = document.createElement('div');
  document.body.appendChild(container);
  showBackpackPanel(container, ctx.data, () => {});
  return ctx;
}

describe('backpack drag and drop (GD-103)', () => {
  it('does not rely on native HTML5 drag, and opts filled slots out of touch panning', () => {
    mount();
    expect(slot(0).getAttribute('draggable')).toBe('false');
    // jsdom's CSSStyleDeclaration drops touch-action, so read the attribute.
    expect(slot(0).getAttribute('style')).toMatch(/touch-action:\s*none/);
    // Empty slots keep normal panning so the sheet still scrolls.
    expect(slot(5).getAttribute('style')).not.toMatch(/touch-action/);
  });

  it('moves an item with a touch drag and selects the drop slot', () => {
    const { moves } = mount();
    const from = slot(0);
    pointer(from, 'pointerdown', { x: 10, y: 10 });
    expect(from.hasPointerCapture(7)).toBe(true);
    hitSlotIndex = 4;
    const move = pointer(from, 'pointermove', { x: 120, y: 60 });
    expect(move.defaultPrevented).toBe(true);
    const ghost = document.querySelector('.backpack-drag-ghost');
    expect(ghost).not.toBeNull();
    expect(ghost.style.pointerEvents).toBe('none');
    expect(slot(4).getAttribute('data-drop-target')).toBe('true');
    pointer(from, 'pointerup', { x: 120, y: 60 });
    expect(moves).toEqual([[0, 4]]);
    expect(document.querySelector('.backpack-drag-ghost')).toBeNull();
    expect(slot(4).dataset.itemId).toBe('trowel');
    expect(slot(0).dataset.itemId).toBeUndefined();
    expect(document.querySelector('#backpack-panel').textContent).toContain('Trowel');
  });

  it('keeps mouse drag working', () => {
    const { moves } = mount();
    const from = slot(1);
    pointer(from, 'pointerdown', { x: 50, y: 10, pointerType: 'mouse', pointerId: 1 });
    hitSlotIndex = 0;
    pointer(from, 'pointermove', { x: 5, y: 10, pointerType: 'mouse', pointerId: 1 });
    pointer(from, 'pointerup', { x: 5, y: 10, pointerType: 'mouse', pointerId: 1 });
    expect(moves).toEqual([[1, 0]]);
    expect(slot(0).dataset.itemId).toBe('basil_seed');
  });

  it('treats a small wobble as a tap that selects, not a move', () => {
    const { moves } = mount();
    const target = slot(1);
    pointer(target, 'pointerdown', { x: 10, y: 10 });
    pointer(target, 'pointermove', { x: 13, y: 12 });
    pointer(target, 'pointerup', { x: 13, y: 12 });
    target.click();
    expect(moves).toEqual([]);
    expect(document.querySelector('.backpack-drag-ghost')).toBeNull();
    expect(document.querySelector('#backpack-panel').textContent).toContain('Basil Seed');
  });

  it('cleans up without moving when the browser cancels the gesture or it ends off-grid', () => {
    const { moves } = mount();
    let from = slot(0);
    pointer(from, 'pointerdown', { x: 10, y: 10 });
    pointer(from, 'pointermove', { x: 80, y: 80 });
    pointer(from, 'pointercancel', { x: 80, y: 80 });
    expect(document.querySelector('.backpack-drag-ghost')).toBeNull();

    from = slot(0);
    pointer(from, 'pointerdown', { x: 10, y: 10 });
    hitSlotIndex = null;
    pointer(from, 'pointermove', { x: 300, y: 500 });
    pointer(from, 'pointerup', { x: 300, y: 500 });
    expect(moves).toEqual([]);
    expect(document.querySelector('.backpack-drag-ghost')).toBeNull();
  });

  it('ignores drags that start on an empty slot and secondary mouse buttons', () => {
    const { moves } = mount();
    pointer(slot(6), 'pointerdown', { x: 10, y: 10 });
    hitSlotIndex = 0;
    pointer(slot(6), 'pointermove', { x: 90, y: 10 });
    pointer(slot(6), 'pointerup', { x: 90, y: 10 });
    pointer(slot(0), 'pointerdown', { x: 10, y: 10, pointerType: 'mouse', pointerId: 1, button: 2 });
    pointer(slot(0), 'pointermove', { x: 90, y: 10, pointerType: 'mouse', pointerId: 1 });
    pointer(slot(0), 'pointerup', { x: 90, y: 10, pointerType: 'mouse', pointerId: 1 });
    expect(moves).toEqual([]);
  });

  it('adds no window-level pointer listeners that could outlive the panel', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    mount();
    const pointerTypes = spy.mock.calls.map(([type]) => type).filter((type) => type.startsWith('pointer'));
    expect(pointerTypes).toEqual([]);
    spy.mockRestore();
  });
});
