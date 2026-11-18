/**
 * Keyboard shortcut registry (feat/keyboard-shortcuts).
 *
 * One list of every key the game listens for, used by the input manager
 * bindings, the movement poll, the quest log toggle and the Controls (help)
 * overlay. Remappable actions keep their primary key in localStorage; the
 * fixed keys (Escape, Enter/Space, arrows, 1-6, Tab) never move so menus,
 * dialogue and accessibility paths always work.
 */

export const KEYBINDINGS_STORAGE_KEY = 'gardenOS.keybindings.v1';

// primary: the remappable key. fixed: keys that always work for the action.
export const KEYBINDING_DEFS = [
  { id: 'move_up', label: 'Walk forward', group: 'Move', primary: 'w', fixed: ['ArrowUp'], remappable: true },
  { id: 'move_left', label: 'Walk left', group: 'Move', primary: 'a', fixed: ['ArrowLeft'], remappable: true },
  { id: 'move_down', label: 'Walk back', group: 'Move', primary: 's', fixed: ['ArrowDown'], remappable: true },
  { id: 'move_right', label: 'Walk right', group: 'Move', primary: 'd', fixed: ['ArrowRight'], remappable: true },
  { id: 'interact', label: 'Talk / use what is in front of you', group: 'Act', primary: 'e', fixed: [], remappable: true },
  { id: 'select_cell', label: 'Plant / select / confirm', group: 'Act', primary: null, fixed: ['Enter', 'Space'], remappable: false },
  { id: 'advance', label: 'Start season / next phase (garden)', group: 'Act', primary: null, fixed: ['Enter'], remappable: false },
  { id: 'toggle_palette', label: 'Crop picker (garden)', group: 'Panels', primary: 'p', fixed: [], remappable: true },
  { id: 'toggle_backpack', label: 'Backpack', group: 'Panels', primary: 'b', fixed: [], remappable: true },
  { id: 'toggle_world_map', label: 'World map', group: 'Panels', primary: 'm', fixed: [], remappable: true },
  { id: 'toggle_quest_log', label: 'Quest log', group: 'Panels', primary: 'q', fixed: [], remappable: true },
  { id: 'toggle_help', label: 'Controls (this list)', group: 'Panels', primary: null, fixed: ['?', 'Shift+?', 'F1'], remappable: false },
  { id: 'next_tool', label: 'Next tool', group: 'Tools', primary: null, fixed: [']', 'Tab'], remappable: false },
  { id: 'prev_tool', label: 'Previous tool', group: 'Tools', primary: null, fixed: ['[', 'Shift+Tab'], remappable: false },
  { id: 'tool_slots', label: 'Pick tool 1-6', group: 'Tools', primary: null, fixed: ['1', '2', '3', '4', '5', '6'], remappable: false, display: '1 – 6' },
  { id: 'cutscene_next', label: 'Next line of dialogue', group: 'Dialogue', primary: null, fixed: ['Enter', 'Space'], remappable: false },
  { id: 'cancel', label: 'Close the top panel / skip a cutscene / pause', group: 'Menus', primary: null, fixed: ['Escape'], remappable: false },
];

const DEF_BY_ID = new Map(KEYBINDING_DEFS.map((def) => [def.id, def]));

// Keys a player may not take for a remappable action: the fixed ones the
// game relies on, browser/system keys and modifiers.
const RESERVED = new Set([
  'escape', 'enter', 'space', ' ', 'tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  '1', '2', '3', '4', '5', '6', '[', ']', '?', '/', 'f1', 'f5', 'f11', 'f12',
  'shift', 'control', 'alt', 'meta', 'capslock', 'contextmenu', 'dead', 'unidentified', 'process',
]);

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function normalizeBindingKey(key) {
  if (key === ' ') return 'Space';
  if (typeof key === 'string' && key.length === 1) return key.toLowerCase();
  return key ?? '';
}

export function loadKeyOverrides() {
  const store = storage();
  if (!store) return {};
  try {
    const raw = JSON.parse(store.getItem(KEYBINDINGS_STORAGE_KEY) || '{}');
    const out = {};
    for (const [id, key] of Object.entries(raw ?? {})) {
      const def = DEF_BY_ID.get(id);
      if (def?.remappable && typeof key === 'string' && validateKey(key).ok) out[id] = normalizeBindingKey(key);
    }
    return out;
  } catch {
    return {};
  }
}

function saveKeyOverrides(overrides) {
  const store = storage();
  if (!store) return;
  try {
    if (Object.keys(overrides).length) store.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(overrides));
    else store.removeItem(KEYBINDINGS_STORAGE_KEY);
  } catch { /* private mode: the remap lasts for this session only */ }
}

export function validateKey(key) {
  const k = normalizeBindingKey(key);
  if (!k) return { ok: false, reason: 'No key pressed.' };
  if (RESERVED.has(k.toLowerCase())) return { ok: false, reason: `${formatKey(k)} is kept for menus and can't be reassigned.` };
  if (k.length !== 1 && !/^F([2-9]|10)$/.test(k)) return { ok: false, reason: `${formatKey(k)} can't be used. Pick a letter, number row symbol or F2-F10.` };
  return { ok: true, key: k };
}

export function formatKey(key) {
  const k = String(key ?? '');
  const names = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Escape: 'Esc', Space: 'Space', ' ': 'Space', Enter: 'Enter', Tab: 'Tab',
  };
  if (names[k]) return names[k];
  if (k.startsWith('Shift+')) return `Shift + ${formatKey(k.slice(6))}`;
  return k.length === 1 ? k.toUpperCase() : k;
}

/**
 * Creates the live keymap. listeners get (id, keys) after any change.
 */
export function createKeymap() {
  let overrides = loadKeyOverrides();
  const listeners = new Set();

  const primaryOf = (id) => {
    const def = DEF_BY_ID.get(id);
    if (!def) return null;
    return overrides[id] ?? def.primary;
  };

  function getKeys(id) {
    const def = DEF_BY_ID.get(id);
    if (!def) return [];
    const primary = primaryOf(id);
    return [...(primary ? [primary] : []), ...def.fixed];
  }

  function findConflict(key, exceptId) {
    const k = normalizeBindingKey(key);
    return KEYBINDING_DEFS.find((def) => def.id !== exceptId && def.remappable && primaryOf(def.id) === k) ?? null;
  }

  function emit(id) {
    for (const fn of listeners) fn(id, getKeys(id));
  }

  /** Sets a remappable action's key. A key held by another action swaps. */
  function setKey(id, key) {
    const def = DEF_BY_ID.get(id);
    if (!def?.remappable) return { ok: false, reason: 'That control is fixed.' };
    const check = validateKey(key);
    if (!check.ok) return check;
    const previous = primaryOf(id);
    const other = findConflict(check.key, id);
    const next = { ...overrides };
    if (other) {
      if (previous === other.primary) delete next[other.id];
      else next[other.id] = previous;
    }
    if (check.key === def.primary) delete next[id];
    else next[id] = check.key;
    overrides = next;
    saveKeyOverrides(overrides);
    emit(id);
    if (other) emit(other.id);
    return { ok: true, key: check.key, swappedWith: other ? other.id : null };
  }

  function reset() {
    const changed = Object.keys(overrides);
    overrides = {};
    saveKeyOverrides(overrides);
    changed.forEach(emit);
  }

  function matches(id, event) {
    if (!event) return false;
    const k = normalizeBindingKey(event.key);
    return getKeys(id).some((binding) => {
      const shift = binding.startsWith('Shift+');
      const bare = shift ? binding.slice(6) : binding;
      return normalizeBindingKey(bare) === k && Boolean(event.shiftKey) === shift;
    });
  }

  return {
    defs: KEYBINDING_DEFS,
    getKeys,
    getPrimary: primaryOf,
    isRemapped: (id) => Object.prototype.hasOwnProperty.call(overrides, id),
    hasOverrides: () => Object.keys(overrides).length > 0,
    setKey,
    reset,
    matches,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
