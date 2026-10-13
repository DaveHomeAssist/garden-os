// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { showBedsPanel, buildBedsModel } from './beds-panel.js';
import { Actions, Store } from '../game/store.js';
import { createGameState } from '../game/state.js';
import { addItemToInventoryState } from '../game/inventory.js';

beforeEach(() => {
  document.body.replaceChildren();
});

function setup({ kits = 1, zone = 'player_plot' } = {}) {
  const state = createGameState();
  if (kits > 0) {
    state.campaign.inventory = addItemToInventoryState(state.campaign.inventory, 'raised_bed_kit', kits).inventory;
  }
  state.campaign.worldState.currentZone = zone;
  const store = new Store(state);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toasts = [];
  showBedsPanel(container, {
    getState: () => store.getState(),
    dispatch: (action) => store.dispatch(action),
    showToast: (message) => toasts.push(message),
  });
  return { store, container, toasts };
}

function button(container, label) {
  return [...container.querySelectorAll('button')].find((node) => node.textContent === label);
}

describe('garden beds panel', () => {
  it('builds a bed from a kit and lets the player tend it', () => {
    const { store, container, toasts } = setup();
    container.querySelector('input').value = 'Back Fence';
    button(container, 'Build bed').click();
    expect(store.getState().campaign.beds.bed_2.name).toBe('Back Fence');
    expect(toasts.at(-1)).toMatch(/Back Fence is built/);

    store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });
    button(container, 'Tend this bed').click();
    expect(store.getState().campaign.activeBedId).toBe('bed_2');
    expect(store.getState().season.grid[0].cropId).toBeNull();
  });

  it('explains why building is unavailable without a kit', () => {
    const { container } = setup({ kits: 0 });
    expect(button(container, 'Build bed').disabled).toBe(true);
    expect(container.textContent).toMatch(/raised bed kit/i);
  });

  it('only switches beds at home', () => {
    const state = createGameState();
    state.campaign.worldState.currentZone = 'meadow';
    expect(buildBedsModel(state)).toMatchObject({ atHome: false, canSwitch: false });
  });
});
