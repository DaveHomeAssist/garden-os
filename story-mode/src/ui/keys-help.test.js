// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKeysHelp } from './keys-help.js';
import { createKeymap, KEYBINDING_DEFS } from '../input/keybindings.js';

const here = dirname(fileURLToPath(import.meta.url));
const binderSrc = readFileSync(join(here, 'ui-binder.js'), 'utf8');
const indexHtml = readFileSync(join(here, '../../index.html'), 'utf8');

const key = (k, opts = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts });
  document.body.dispatchEvent(e);
  return e;
};

beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });

describe('controls overlay', () => {
  it('lists every binding grouped, with keycaps', () => {
    const help = createKeysHelp({ container: document.body, keymap: createKeymap() });
    help.open();
    const rows = document.querySelectorAll('#keys-help [data-binding]');
    expect(rows.length).toBe(KEYBINDING_DEFS.length);
    const map = document.querySelector('[data-binding="toggle_world_map"]');
    expect(map.textContent).toContain('World map');
    expect(map.querySelector('kbd').textContent).toBe('M');
    expect(document.querySelector('#keys-help [role="dialog"]').getAttribute('aria-modal')).toBe('true');
    help.close();
    expect(document.querySelector('#keys-help')).toBeNull();
  });

  it('remaps a key by Change + key press, and Esc cancels a capture', () => {
    const km = createKeymap();
    const help = createKeysHelp({ container: document.body, keymap: km });
    help.open();
    document.querySelector('[data-remap="toggle_world_map"]').click();
    expect(help.isCapturing()).toBe(true);
    key('Escape');
    expect(help.isCapturing()).toBe(false);
    expect(help.isOpen()).toBe(true);
    document.querySelector('[data-remap="toggle_world_map"]').click();
    key('n');
    expect(km.getPrimary('toggle_world_map')).toBe('n');
    expect(document.querySelector('[data-binding="toggle_world_map"] kbd').textContent).toBe('N');
    expect(document.querySelector('[data-keys-message]').textContent).toMatch(/World map is now N/);
    document.querySelector('[data-keys-reset]').click();
    expect(km.getPrimary('toggle_world_map')).toBe('m');
    help.close();
  });

  it('explains a refused key and keeps capturing', () => {
    const km = createKeymap();
    const help = createKeysHelp({ container: document.body, keymap: km });
    help.open();
    document.querySelector('[data-remap="interact"]').click();
    key('Enter');
    expect(help.isCapturing()).toBe(true);
    expect(document.querySelector('[data-keys-message]').textContent).toMatch(/can't be reassigned/);
    help.close();
  });

  it('swallows game keys while open and closes on Esc / ? / F1', () => {
    const help = createKeysHelp({ container: document.body, keymap: createKeymap() });
    const game = vi.fn();
    window.addEventListener('keydown', game);
    help.open();
    key('w'); key('m');
    expect(game).not.toHaveBeenCalled();
    key('Escape');
    expect(help.isOpen()).toBe(false);
    help.open(); key('?', { shiftKey: true }); expect(help.isOpen()).toBe(false);
    help.open(); key('F1'); expect(help.isOpen()).toBe(false);
    key('w');
    expect(game).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', game);
  });

  it('is wired: ? / F1 action, pause Controls entry, keymap-driven movement and quest log', () => {
    expect(binderSrc).toMatch(/registerAction\('toggle_help', \{ keys: \['\?', 'Shift\+\?', 'F1'\] \}\)/);
    expect(binderSrc).toMatch(/getElementById\('pause-controls'\)/);
    expect(binderSrc).toMatch(/keymap\.getKeys\(id\)\.some\(\(key\) => inputManager\.isKeyHeld\(key\)\)/);
    expect(binderSrc).toMatch(/isQuestLogKey: \(event\) => keymap\.matches\('toggle_quest_log', event\)/);
    expect(indexHtml).toMatch(/id="pause-controls"/);
  });
});
