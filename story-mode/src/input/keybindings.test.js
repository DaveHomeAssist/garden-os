// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { createKeymap, KEYBINDING_DEFS, KEYBINDINGS_STORAGE_KEY, validateKey, formatKey } from './keybindings.js';

beforeEach(() => localStorage.clear());

describe('keybindings registry', () => {
  it('ships the documented defaults, with M still the world map', () => {
    const km = createKeymap();
    expect(km.getKeys('toggle_world_map')).toEqual(['m']);
    expect(km.getKeys('toggle_quest_log')).toEqual(['q']);
    expect(km.getKeys('interact')).toEqual(['e']);
    expect(km.getKeys('move_up')).toEqual(['w', 'ArrowUp']);
    expect(km.getKeys('toggle_help')).toEqual(['?', 'Shift+?', 'F1']);
  });

  it('has no two remappable actions on the same default key', () => {
    const prim = KEYBINDING_DEFS.filter((d) => d.remappable).map((d) => d.primary);
    expect(new Set(prim).size).toBe(prim.length);
  });

  it('remaps, persists to localStorage and reloads', () => {
    const km = createKeymap();
    expect(km.setKey('toggle_world_map', 'n')).toMatchObject({ ok: true, key: 'n' });
    expect(km.getKeys('toggle_world_map')).toEqual(['n']);
    expect(JSON.parse(localStorage.getItem(KEYBINDINGS_STORAGE_KEY))).toEqual({ toggle_world_map: 'n' });
    expect(createKeymap().getKeys('toggle_world_map')).toEqual(['n']);
  });

  it('swaps when the new key belongs to another action', () => {
    const km = createKeymap();
    const r = km.setKey('toggle_world_map', 'b');
    expect(r).toMatchObject({ ok: true, swappedWith: 'toggle_backpack' });
    expect(km.getPrimary('toggle_backpack')).toBe('m');
    expect(km.getPrimary('toggle_world_map')).toBe('b');
  });

  it('refuses reserved keys and fixed actions', () => {
    const km = createKeymap();
    for (const k of ['Escape', 'Enter', ' ', 'Tab', '1', 'ArrowUp', '?']) {
      expect(km.setKey('interact', k).ok, k).toBe(false);
    }
    expect(km.setKey('cancel', 'x').ok).toBe(false);
    expect(km.getKeys('interact')).toEqual(['e']);
  });

  it('reset clears overrides and storage', () => {
    const km = createKeymap();
    km.setKey('interact', 'f');
    const seen = [];
    km.onChange((id, keys) => seen.push([id, keys]));
    km.reset();
    expect(km.getKeys('interact')).toEqual(['e']);
    expect(localStorage.getItem(KEYBINDINGS_STORAGE_KEY)).toBeNull();
    expect(seen).toEqual([['interact', ['e']]]);
  });

  it('ignores junk in storage', () => {
    localStorage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify({ interact: 'Escape', cancel: 'x', move_up: 'i', nope: 'z' }));
    const km = createKeymap();
    expect(km.getKeys('interact')).toEqual(['e']);
    expect(km.getKeys('cancel')).toEqual(['Escape']);
    expect(km.getKeys('move_up')).toEqual(['i', 'ArrowUp']);
  });

  it('matches events by key and shift', () => {
    const km = createKeymap();
    expect(km.matches('toggle_quest_log', { key: 'q', shiftKey: false })).toBe(true);
    expect(km.matches('toggle_quest_log', { key: 'Q', shiftKey: false })).toBe(true); // caps lock
    expect(km.matches('toggle_help', { key: '?', shiftKey: true })).toBe(true);
    expect(km.matches('toggle_help', { key: 'F1', shiftKey: false })).toBe(true);
  });

  it('validates and formats keys', () => {
    expect(validateKey('F4').ok).toBe(true);
    expect(validateKey('PageDown').ok).toBe(false);
    expect(formatKey('ArrowLeft')).toBe('←');
    expect(formatKey('m')).toBe('M');
    expect(formatKey('Escape')).toBe('Esc');
  });
});
