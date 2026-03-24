import { describe, expect, it, vi } from 'vitest';

import { InteractionSystem } from './interaction.js';

function createMovementController(position) {
  const state = {
    position: { ...position },
  };

  return {
    getState() {
      return {
        position: { ...state.position },
      };
    },
    moveTo(nextPosition) {
      state.position = { ...nextPosition };
    },
  };
}

describe('InteractionSystem', () => {
  it('highlights the nearest grid cell and resolves its interaction label', () => {
    const movementController = createMovementController({ x: 0.05, y: 0, z: 0.02 });
    const interaction = new InteractionSystem(
      null,
      null,
      movementController,
      [
        { index: 0, x: 0, y: 0, z: 0 },
        { index: 1, x: 1, y: 0, z: 1 },
      ],
      {
        getCellLabel: (index) => `Cell ${index}`,
      },
    );

    const highlighted = interaction.update(0.25);

    expect(highlighted).toMatchObject({
      type: 'cell',
      index: 0,
      label: 'Cell 0',
    });
  });

  it('prefers the closest interactable when grid cells and custom targets overlap', () => {
    const movementController = createMovementController({ x: 0.32, y: 0, z: 0 });
    const interaction = new InteractionSystem(
      null,
      null,
      movementController,
      [{ index: 0, x: 0, y: 0, z: 0 }],
    );

    interaction.registerInteractable('well', {
      label: 'Inspect well',
      radius: 0.8,
      position: { x: 0.35, y: 0, z: 0 },
    });

    const highlighted = interaction.update(0.1);

    expect(highlighted).toMatchObject({
      id: 'well',
      type: 'custom',
      label: 'Inspect well',
    });
  });

  it('delegates interaction callbacks for both cell and custom targets', () => {
    const movementController = createMovementController({ x: 0, y: 0, z: 0 });
    const onInteractCell = vi.fn(() => true);
    const store = { getState: vi.fn(() => ({ season: {} })) };
    const interaction = new InteractionSystem(
      store,
      null,
      movementController,
      [{ index: 7, x: 0, y: 0, z: 0 }],
      { onInteractCell },
    );

    interaction.update(0.1);
    expect(interaction.interactHighlighted({ source: 'keyboard' })).toBe(true);
    expect(onInteractCell).toHaveBeenCalledWith(
      expect.objectContaining({
        cellIndex: 7,
        source: 'keyboard',
      }),
    );

    const onInteract = vi.fn();
    interaction.registerInteractable('gate', {
      label: 'Open gate',
      radius: 0.5,
      position: { x: 0.02, y: 0, z: 0.02 },
      onInteract,
    });

    movementController.moveTo({ x: 0.03, y: 0, z: 0.03 });
    interaction.update(0.1);
    expect(interaction.interactHighlighted({ source: 'touch' })).toBe(true);
    expect(onInteract).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'touch',
        store,
        target: expect.objectContaining({
          id: 'gate',
          label: 'Open gate',
        }),
      }),
    );
  });

  it('clears the highlight when disabled or when the player moves out of range', () => {
    const movementController = createMovementController({ x: 0, y: 0, z: 0.1 });
    const interaction = new InteractionSystem(
      null,
      null,
      movementController,
      [{ index: 2, x: 0, y: 0, z: 0 }],
    );

    expect(interaction.update(0.1)).not.toBeNull();

    interaction.setEnabled(false);
    expect(interaction.update(0.1)).toBeNull();
    expect(interaction.getHighlighted()).toBeNull();

    interaction.setEnabled(true);
    movementController.moveTo({ x: 3, y: 0, z: 3 });
    expect(interaction.update(0.1)).toBeNull();
    expect(interaction.getHighlighted()).toBeNull();
  });
});
