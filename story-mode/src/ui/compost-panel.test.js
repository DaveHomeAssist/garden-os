// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSandboxState } from '../game/state.js';
import { Store } from '../game/store.js';
import { Inventory } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { COMPOST_SCRAPS_HINT, createCompostPanel } from './compost-panel.js';

const panels = [];
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(() => {
  while (panels.length) panels.pop().dispose();
});

function make() {
  const store = new Store(createSandboxState());
  const inventory = new Inventory(store);
  const crafting = new CraftingSystem(store, inventory, new SkillSystem(store));
  const root = document.getElementById('root');
  const panel = createCompostPanel(root);
  panels.push(panel);
  return { store, inventory, crafting, root, panel };
}

describe('compost panel', () => {
  it('renders the bin with compostable items in the shop sheet style', () => {
    const { inventory, crafting, root, panel } = make();
    inventory.addItem('dried_leaves', 2);
    panel.open({ craftingSystem: crafting, inventory });
    const sheet = root.querySelector('#compost-panel');
    expect(sheet).not.toBeNull();
    expect(sheet.classList.contains('panel-sheet')).toBe(true);
    expect(sheet.querySelector('.palette-title').textContent).toBe('Compost bin');
    expect([...sheet.querySelectorAll('[data-compost-item]')].map((el) => el.dataset.compostItem))
      .toEqual(['dried_leaves', 'plant_matter']);
    expect(sheet.querySelector('[data-compost-make="1"]').disabled).toBe(true);
  });

  it('deposits scraps and shows the new compost count', () => {
    const { inventory, crafting, root, panel } = make();
    inventory.addItem('dried_leaves', 4);
    inventory.addItem('plant_matter', 2);
    const onDeposit = vi.fn();
    panel.open({ craftingSystem: crafting, inventory, onDeposit });
    root.querySelector('[data-compost-make="1"]').click();
    expect(inventory.getItemCount('compost')).toBe(1);
    expect(root.querySelector('[data-compost-total]').textContent).toContain('Compost: 1');
    expect(root.querySelector('[data-compost-message]').textContent).toBe('Made 1 compost. You have 1.');
    expect(onDeposit).toHaveBeenCalledWith(expect.objectContaining({ made: 1 }));
    root.querySelector('[data-compost-make="1"]').click();
    expect(inventory.getItemCount('compost')).toBe(2);
    expect(root.querySelector('[data-compost-make="1"]').disabled).toBe(true);
  });

  it('closes with the close button, the backdrop or Esc and calls onClose once', () => {
    const { inventory, crafting, root, panel } = make();
    const onClose = vi.fn();
    panel.open({ craftingSystem: crafting, inventory, onClose });
    root.querySelector('#compost-dismiss').click();
    expect(panel.isOpen()).toBe(false);
    expect(root.querySelector('#compost-panel')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);

    panel.open({ craftingSystem: crafting, inventory, onClose });
    root.querySelector('#compost-backdrop').click();
    expect(onClose).toHaveBeenCalledTimes(2);

    panel.open({ craftingSystem: crafting, inventory, onClose });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('an empty bin says where scraps come from; the hint goes once a batch is possible', () => {
    const { inventory, crafting, root, panel } = make();
    panel.open({ craftingSystem: crafting, inventory });
    const hint = root.querySelector('#compost-panel [data-compost-hint]');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe(COMPOST_SCRAPS_HINT);
    panel.close({ silent: true });
    inventory.addItem('dried_leaves', 2);
    inventory.addItem('plant_matter', 1);
    panel.open({ craftingSystem: crafting, inventory });
    expect(root.querySelector('#compost-panel [data-compost-hint]')).toBeNull();
  });
});
