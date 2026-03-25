// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showTitleScreen } from './game-init.js';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] ?? null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

function mountTitleScreenDom() {
  document.body.innerHTML = `
    <div id="title-screen" style="display:none;">
      <div id="title-modes"></div>
      <div id="save-slots"></div>
      <div id="title-actions">
        <button id="title-how-to-play" type="button">How to Play</button>
      </div>
    </div>
    <div id="viewport"></div>
  `;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('confirm', vi.fn(() => true));
  localStorage.clear();
  mountTitleScreenDom();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('game-init title screen', () => {
  it('switches between story and free play without duplicating the free-play start button', () => {
    const onStart = vi.fn();

    showTitleScreen(onStart);
    showTitleScreen(onStart);

    expect(document.querySelectorAll('.freeplay-start-btn')).toHaveLength(1);

    document.querySelector('[data-mode="freeplay"]').click();

    expect(document.getElementById('save-slots').style.display).toBe('none');
    expect(document.querySelector('.freeplay-start-btn').style.display).toBe('');
  });

  it('launches sandbox free play from the title screen', async () => {
    const onStart = vi.fn();

    showTitleScreen(onStart);
    document.querySelector('[data-mode="freeplay"]').click();
    document.querySelector('.freeplay-start-btn').click();
    await vi.runAllTimersAsync();

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        slot: -1,
        sandbox: true,
        initialState: expect.objectContaining({
          campaign: expect.objectContaining({
            sandbox: true,
            currentChapter: 99,
          }),
        }),
      }),
    );
  });
});
