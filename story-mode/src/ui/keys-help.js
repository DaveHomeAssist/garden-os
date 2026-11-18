/**
 * Controls overlay (feat/keyboard-shortcuts): lists every keyboard shortcut,
 * grouped, and lets the player change the remappable ones. Opens with ? or
 * F1, or from the pause menu's Controls entry. Esc closes it (or cancels a
 * key capture). While it is open no key reaches the game.
 */
import '../../assets/css/keys-help.css';
import { formatKey } from '../input/keybindings.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function keycaps(keys) {
  return keys.map((k) => `<kbd class="keys-help__kbd">${escapeHtml(formatKey(k))}</kbd>`).join('<span class="keys-help__or">or</span>');
}

export function createKeysHelp({ container, keymap, onOpen = () => {}, onClose = () => {}, playSfx = () => {} } = {}) {
  let root = null;
  let capturingId = null;
  let message = '';
  let returnFocus = null;

  const labelOf = (id) => keymap.defs.find((d) => d.id === id)?.label ?? id;

  function rowHtml(def) {
    const keys = def.display ? null : keymap.getKeys(def.id);
    const shown = def.display
      ? `<kbd class="keys-help__kbd">${escapeHtml(def.display)}</kbd>`
      : keycaps(def.id === 'toggle_help' ? ['?', 'F1'] : keys);
    const capturing = capturingId === def.id;
    const change = def.remappable
      ? `<button type="button" class="keys-help__change${capturing ? ' is-capturing' : ''}" data-remap="${def.id}" aria-label="Change key for ${escapeHtml(def.label)}">${capturing ? 'Press a key…' : 'Change'}</button>`
      : '<span class="keys-help__fixed" title="Fixed so menus always work">fixed</span>';
    const remapped = keymap.isRemapped(def.id) ? '<span class="keys-help__badge">custom</span>' : '';
    return `
      <li class="keys-help__row${capturing ? ' is-capturing' : ''}" data-binding="${def.id}">
        <span class="keys-help__label">${escapeHtml(def.label)}${remapped}</span>
        <span class="keys-help__keys">${shown}</span>
        <span class="keys-help__action">${change}</span>
      </li>`;
  }

  function render() {
    if (!root) return;
    const groups = [];
    for (const def of keymap.defs) {
      let g = groups.find((x) => x.name === def.group);
      if (!g) { g = { name: def.group, defs: [] }; groups.push(g); }
      g.defs.push(def);
    }
    root.querySelector('.keys-help__body').innerHTML = groups.map((g) => `
      <section class="keys-help__group" aria-label="${escapeHtml(g.name)}">
        <h3 class="keys-help__heading">${escapeHtml(g.name)}</h3>
        <ul class="keys-help__list">${g.defs.map(rowHtml).join('')}</ul>
      </section>`).join('');
    const msg = root.querySelector('[data-keys-message]');
    msg.textContent = message;
    msg.classList.toggle('has-message', Boolean(message));
    root.querySelector('[data-keys-reset]').disabled = !keymap.hasOverrides();
  }

  function startCapture(id) {
    capturingId = id;
    message = `Press the new key for “${labelOf(id)}”. Esc cancels.`;
    render();
    root.querySelector(`[data-remap="${id}"]`)?.focus();
  }

  function finishCapture(event) {
    const id = capturingId;
    if (event.key === 'Escape') {
      capturingId = null;
      message = 'No change.';
      render();
      root.querySelector(`[data-remap="${id}"]`)?.focus();
      return;
    }
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    const result = keymap.setKey(id, event.key);
    if (!result.ok) {
      message = result.reason;
      render();
      return;
    }
    capturingId = null;
    playSfx('ui_click');
    message = result.swappedWith
      ? `${labelOf(id)} is now ${formatKey(result.key)}. ${labelOf(result.swappedWith)} moved to ${formatKey(keymap.getPrimary(result.swappedWith))}.`
      : `${labelOf(id)} is now ${formatKey(result.key)}.`;
    render();
    root.querySelector(`[data-remap="${id}"]`)?.focus();
  }

  // Capture phase on document: runs before the input manager (window) and the
  // quest log (document bubble), so nothing leaks to the game while open.
  function onKeyDown(event) {
    if (!root) return;
    if (capturingId) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) finishCapture(event);
      return;
    }
    if (event.key === 'Escape' || event.key === 'F1' || event.key === '?') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    // Let Tab / Enter / Space drive the buttons inside the dialog.
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
      if (event.key === 'Tab') trapFocus(event);
      return;
    }
    event.stopPropagation();
  }

  function trapFocus(event) {
    const items = [...root.querySelectorAll('button:not([disabled])')];
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function open() {
    if (root) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    capturingId = null;
    message = '';
    root = document.createElement('div');
    root.id = 'keys-help';
    root.className = 'keys-help';
    root.innerHTML = `
      <div class="keys-help__backdrop" data-keys-close></div>
      <div class="keys-help__sheet" role="dialog" aria-modal="true" aria-labelledby="keys-help-title">
        <div class="keys-help__top">
          <div>
            <h2 class="keys-help__title" id="keys-help-title">Controls</h2>
            <p class="keys-help__subtitle">Keyboard shortcuts. Changes save on this device.</p>
          </div>
          <button type="button" class="keys-help__close" data-keys-close aria-label="Close controls">×</button>
        </div>
        <div class="keys-help__body"></div>
        <div class="keys-help__foot">
          <p class="keys-help__message" data-keys-message role="status" aria-live="polite"></p>
          <button type="button" class="keys-help__reset" data-keys-reset>Reset to defaults</button>
        </div>
      </div>`;
    root.addEventListener('click', (event) => {
      const t = event.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-keys-close]')) { close(); return; }
      if (t.closest('[data-keys-reset]')) { keymap.reset(); capturingId = null; message = 'Back to the default keys.'; render(); return; }
      const remap = t.closest('[data-remap]');
      if (remap) {
        if (capturingId === remap.dataset.remap) { capturingId = null; message = 'No change.'; render(); }
        else startCapture(remap.dataset.remap);
      }
    });
    container.appendChild(root);
    document.addEventListener('keydown', onKeyDown, true);
    render();
    root.querySelector('.keys-help__close')?.focus();
    onOpen();
  }

  function close() {
    if (!root) return;
    document.removeEventListener('keydown', onKeyDown, true);
    root.remove();
    root = null;
    capturingId = null;
    onClose();
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  return {
    open,
    close,
    toggle: () => (root ? close() : open()),
    isOpen: () => Boolean(root),
    isCapturing: () => Boolean(capturingId),
    dispose: close,
  };
}
