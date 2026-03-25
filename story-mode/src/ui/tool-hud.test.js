// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolHUD } from './tool-hud.js';

function createInputManager() {
  const listeners = new Map();

  return {
    registerAction: vi.fn(),
    on(actionName, handler) {
      const actionListeners = listeners.get(actionName) ?? new Set();
      actionListeners.add(handler);
      listeners.set(actionName, actionListeners);
      return () => {
        actionListeners.delete(handler);
        if (actionListeners.size === 0) {
          listeners.delete(actionName);
        }
      };
    },
    emit(actionName, payload = {}) {
      const eventPayload = {
        source: 'keyboard',
        event: new KeyboardEvent('keydown', { key: actionName }),
        preventDefault: vi.fn(),
        ...payload,
      };
      listeners.get(actionName)?.forEach((handler) => handler(eventPayload));
      return eventPayload;
    },
  };
}

function createTools() {
  return [
    { id: 'hand', label: 'Hand', icon: 'H', shortcut: '1' },
    { id: 'water', label: 'Water', icon: 'W', shortcut: '2' },
    { id: 'plant', label: 'Plant', icon: 'P', shortcut: '3' },
  ];
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ToolHUD', () => {
  it('registers tool slot actions and switches tools from number-key actions when visible', () => {
    const inputManager = createInputManager();
    const hud = new ToolHUD(document.getElementById('app'), inputManager, null);
    hud.setTools(createTools());
    hud.setVisible(true);

    expect(hud.getSelectedTool()?.id).toBe('hand');
    expect(inputManager.registerAction).toHaveBeenCalledWith('tool_slot_1', { keys: ['1'] });
    expect(inputManager.registerAction).toHaveBeenCalledWith('tool_slot_3', { keys: ['3'] });

    const payload = inputManager.emit('tool_slot_2', {
      event: new KeyboardEvent('keydown', { key: '2' }),
    });

    expect(payload.preventDefault).toHaveBeenCalled();
    expect(hud.getSelectedTool()?.id).toBe('water');
    expect(hud.root.hidden).toBe(false);
    expect(hud.root.getAttribute('aria-hidden')).toBe('false');

    hud.dispose();
  });

  it('ignores tool hotkeys while hidden or when typing in an input field', () => {
    const inputManager = createInputManager();
    const hud = new ToolHUD(document.getElementById('app'), inputManager, null);
    hud.setTools(createTools());

    inputManager.emit('tool_slot_3', {
      event: new KeyboardEvent('keydown', { key: '3' }),
    });
    expect(hud.getSelectedTool()?.id).toBe('hand');

    hud.setVisible(true);
    const input = document.createElement('input');
    document.body.appendChild(input);
    inputManager.emit('tool_slot_3', {
      event: { target: input },
    });

    expect(hud.getSelectedTool()?.id).toBe('hand');

    hud.dispose();
  });

  it('cycles tools with next and previous actions and syncs pressed state', () => {
    const inputManager = createInputManager();
    const hud = new ToolHUD(document.getElementById('app'), inputManager, null);
    hud.setTools(createTools());
    hud.setVisible(true);

    inputManager.emit('next_tool', {
      event: new KeyboardEvent('keydown', { key: 'Tab' }),
    });
    expect(hud.getSelectedTool()?.id).toBe('water');

    inputManager.emit('prev_tool', {
      event: new KeyboardEvent('keydown', { key: '[' }),
    });
    expect(hud.getSelectedTool()?.id).toBe('hand');

    const plantButton = hud.root.querySelector('[data-tool-id="plant"]');
    plantButton.click();

    expect(hud.getSelectedTool()?.id).toBe('plant');
    expect(plantButton.getAttribute('aria-pressed')).toBe('true');

    hud.dispose();
  });
});
