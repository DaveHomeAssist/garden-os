import { describe, expect, it } from 'vitest';

import {
  addItemToInventoryState,
  createInventoryState,
  getInventoryItemCount,
  hasInventoryItem,
  moveInventorySlot,
  normalizeInventoryState,
  removeItemFromInventoryState,
  splitInventoryStack,
  upgradeInventoryState,
} from './inventory.js';

describe('inventory helpers', () => {
  it('fills existing stacks before opening a new slot', () => {
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'plant_matter', 90).inventory;
    const result = addItemToInventoryState(inventory, 'plant_matter', 20);

    expect(result.success).toBe(true);
    expect(result.inventory.slots[0].count).toBe(99);
    expect(result.inventory.slots[1].count).toBe(11);
  });

  it('adds non-stackable tools to new slots', () => {
    const result = addItemToInventoryState(createInventoryState(), 'watering_can', 1);
    expect(result.success).toBe(true);
    expect(result.inventory.slots[0].itemId).toBe('watering_can');
    expect(result.inventory.slots[0].count).toBe(1);
  });

  it('fails when there is not enough space for a full add', () => {
    let inventory = createInventoryState();
    for (let index = 0; index < inventory.capacity; index += 1) {
      inventory = addItemToInventoryState(inventory, `festival_token_${index}`, 1).inventory;
    }
    const result = addItemToInventoryState(inventory, 'watering_can', 1);
    expect(result.success).toBe(false);
  });

  it('removes partial stacks and reports removed count', () => {
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'compost', 10).inventory;
    const result = removeItemFromInventoryState(inventory, 'compost', 4);
    expect(result.removed).toBe(4);
    expect(result.inventory.slots[0].count).toBe(6);
  });

  it('removes as much as possible when asked for too much', () => {
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'scrap_metal', 3).inventory;
    const result = removeItemFromInventoryState(inventory, 'scrap_metal', 7);
    expect(result.removed).toBe(3);
    expect(result.inventory.slots[0]).toBeNull();
  });

  it('moves and swaps slots', () => {
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'watering_can', 1).inventory;
    inventory = addItemToInventoryState(inventory, 'compost', 4).inventory;
    const result = moveInventorySlot(inventory, 0, 1);
    expect(result.success).toBe(true);
    expect(result.inventory.slots[0].itemId).toBe('compost');
    expect(result.inventory.slots[1].itemId).toBe('watering_can');
  });

  it('splits a stack into an empty slot', () => {
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'plant_matter', 8).inventory;
    const result = splitInventoryStack(inventory, 0, 3, 1);
    expect(result.success).toBe(true);
    expect(result.inventory.slots[0].count).toBe(5);
    expect(result.inventory.slots[1].count).toBe(3);
  });

  it('upgrades capacity from 20 to 30 to 40 and then stops', () => {
    let inventory = createInventoryState();
    inventory = upgradeInventoryState(inventory).inventory;
    expect(inventory.capacity).toBe(30);
    inventory = upgradeInventoryState(inventory).inventory;
    expect(inventory.capacity).toBe(40);
    const result = upgradeInventoryState(inventory);
    expect(result.success).toBe(false);
  });

  it('checks item counts and legacy bag migration', () => {
    const inventory = normalizeInventoryState({ compost: 2, scrap_metal: 1 });
    expect(hasInventoryItem(inventory, 'compost', 2)).toBe(true);
    expect(getInventoryItemCount(inventory, 'scrap_metal')).toBe(1);
  });
});
