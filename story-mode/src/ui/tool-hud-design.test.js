// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolHUD } from './tool-hud.js';

function createInputManager() {
  return {
    registerAction: vi.fn(),
    on: vi.fn(() => vi.fn()),
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe('tool HUD design contract', () => {
  it('renders a semantic toolbar with class-driven slots and non-color selection state', () => {
    const hud = new ToolHUD(document.getElementById('app'), createInputManager(), null);
    hud.setTools([
      { id: 'hand', label: 'Hand', icon: 'H', shortcut: '1' },
      { id: 'water', label: 'Water', icon: 'W', shortcut: '2' },
    ]);
    hud.setVisible(true);

    const slots = [...hud.root.querySelectorAll('.tool-hud__slot')];
    expect(hud.root.getAttribute('role')).toBe('toolbar');
    expect(hud.root.getAttribute('aria-label')).toBe('Garden tools');
    expect(hud.root.getAttribute('aria-hidden')).toBe('false');
    expect(slots).toHaveLength(2);
    expect(slots[0].getAttribute('aria-pressed')).toBe('true');
    expect(slots[0].classList.contains('is-selected')).toBe(true);
    expect(slots[0].querySelector('.tool-hud__icon').textContent).toBe('H');
    expect(slots[0].querySelector('.tool-hud__shortcut').textContent).toBe('1');
    expect(slots[0].hasAttribute('style')).toBe(false);

    hud.dispose();
  });

  it('builds cooldown presentation without inline styles', () => {
    const hud = new ToolHUD(document.getElementById('app'), createInputManager(), null);
    hud.setTools([{ id: 'water', label: 'Water', icon: 'W', shortcut: '1' }]);
    hud.syncCooldowns({ water_0: 10_000 }, 0, 8_200);

    const cooldown = hud.root.querySelector('.tool-hud__cooldown');
    expect(cooldown).not.toBeNull();
    expect(cooldown.hasAttribute('style')).toBe(false);
    expect(cooldown.textContent).toBe('2s');

    hud.dispose();
  });
});
