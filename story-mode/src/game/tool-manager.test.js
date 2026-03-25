import { describe, expect, it } from 'vitest';

import { Store } from './store.js';
import { addItemToInventoryState, createInventoryState } from './inventory.js';
import { ToolManager } from './tool-manager.js';

function createTestStore() {
  const store = new Store();
  const state = store.getState();
  let inventory = createInventoryState();
  inventory = addItemToInventoryState(inventory, 'watering_can', 1).inventory;
  inventory = addItemToInventoryState(inventory, 'pruning_shears', 1).inventory;
  inventory = addItemToInventoryState(inventory, 'soil_scanner', 1).inventory;
  inventory = addItemToInventoryState(inventory, 'smart_watering_can', 1).inventory;
  store.dispatch({
    type: 'REPLACE_STATE',
    payload: {
      state: {
        ...state,
        campaign: { ...state.campaign, inventory },
      },
    },
  });
  return store;
}

describe('ToolManager', () => {
  it('registerTool adds to registry', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    mgr.registerTool('hoe', {
      name: 'Hoe',
      icon: '\u{1FAA8}',
      action: 'TILL_CELL',
      durability: 60,
      cooldownMs: 0,
    });

    const tool = mgr.getTool('hoe');
    expect(tool).not.toBeNull();
    expect(tool.id).toBe('hoe');
    expect(tool.name).toBe('Hoe');
    expect(tool.action).toBe('TILL_CELL');
    expect(tool.durability).toBe(60);
  });

  it('selectTool sets active tool', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    const result = mgr.selectTool('watering_can');
    expect(result).not.toBeNull();
    expect(result.id).toBe('watering_can');
  });

  it('getSelectedTool returns current selection', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    expect(mgr.getSelectedTool()).toBeNull();

    mgr.selectTool('pruning_shears');
    const selected = mgr.getSelectedTool();
    expect(selected).not.toBeNull();
    expect(selected.id).toBe('pruning_shears');
  });

  it('canUseTool returns false when durability is 0', () => {
    const store = new Store();
    const state = store.getState();
    let inventory = createInventoryState();
    inventory = addItemToInventoryState(inventory, 'soil_scanner', 1, {
      durability: 0,
      maxDurability: 30,
    }).inventory;
    store.dispatch({
      type: 'REPLACE_STATE',
      payload: {
        state: {
          ...state,
          campaign: { ...state.campaign, inventory },
        },
      },
    });

    const mgr = new ToolManager(store, store.getState().campaign.inventory);
    expect(mgr.canUseTool('soil_scanner', 0)).toBe(false);
  });

  it('useTool decrements durability', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    const before = mgr.getToolDurability('watering_can');
    expect(before.current).toBe(100);

    const result = mgr.useTool('watering_can', 0);
    expect(result.success).toBe(true);
    expect(result.costDurability).toBe(1);

    const after = mgr.getToolDurability('watering_can');
    expect(after.current).toBe(99);
  });

  it('repairTool restores durability', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    mgr.useTool('pruning_shears', 0);
    const afterUse = mgr.getToolDurability('pruning_shears');
    expect(afterUse.current).toBe(49);

    const result = mgr.repairTool('pruning_shears', 50);
    expect(result.success).toBe(true);

    const afterRepair = mgr.getToolDurability('pruning_shears');
    expect(afterRepair.current).toBe(50);
  });

  it('getAllTools returns all registered tools', () => {
    const store = createTestStore();
    const mgr = new ToolManager(store, store.getState().campaign.inventory);

    const tools = mgr.getAllTools();
    expect(tools.length).toBe(4);

    const ids = tools.map((t) => t.id).sort();
    expect(ids).toEqual([
      'pruning_shears',
      'smart_watering_can',
      'soil_scanner',
      'watering_can',
    ]);
  });
});
