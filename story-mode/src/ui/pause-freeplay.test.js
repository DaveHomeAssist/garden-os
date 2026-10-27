// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createSandboxState } from '../game/state.js';
import { createPauseController } from './pause-controller.js';

afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

it('restarts the Free Play season with its existing dimensions and disposes listeners', () => {
  document.body.innerHTML = '<button id="pause-restart"><span class="pause-action__title"></span></button>';
  vi.stubGlobal('confirm', vi.fn(() => true));
  const dispatch = vi.fn();
  const state = createSandboxState();
  const controller = createPauseController({ getState: () => state, dispatch, slot: 'freeplay',
    updateHUD: vi.fn(), showToast: vi.fn(), syncToolHUDVisibility: vi.fn() });
  expect(document.querySelector('.pause-action__title').textContent).toBe('Restart Season');
  document.getElementById('pause-restart').click();
  expect(dispatch.mock.calls[0][0].payload.season.grid).toHaveLength(32);
  expect(confirm.mock.calls[0][0]).toMatch(/Free Play season/);
  controller.dispose();
  document.getElementById('pause-restart').click();
  expect(dispatch).toHaveBeenCalledTimes(1);
});
