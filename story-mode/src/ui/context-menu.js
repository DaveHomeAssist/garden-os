/**
 * RuneScape-style "Choose Option" context menu for the 3D world.
 * Options are { verb, target?, hint?, disabled?, onSelect? }.
 * Verb renders in cream, target in leaf-green, hover rows glow sun-yellow.
 */

const MENU_Z_INDEX = '60';

function applyRootStyles(root) {
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.minWidth = '170px';
  root.style.maxWidth = '280px';
  root.style.background = 'rgba(24, 14, 8, 0.97)';
  root.style.border = '1px solid rgba(232, 200, 74, 0.35)';
  root.style.borderRadius = '8px';
  root.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.45)';
  root.style.fontFamily = '"DM Mono", ui-monospace, SFMono-Regular, monospace';
  root.style.fontSize = '0.78rem';
  root.style.overflow = 'hidden';
  root.style.zIndex = MENU_Z_INDEX;
  root.style.userSelect = 'none';
  root.style.display = 'none';
}

function applyHeaderStyles(header) {
  header.textContent = 'Choose Option';
  header.style.padding = '0.4rem 0.75rem';
  header.style.background = 'rgba(92, 61, 30, 0.92)';
  header.style.color = '#e8c84a';
  header.style.letterSpacing = '0.04em';
  header.style.fontSize = '0.72rem';
  header.style.borderBottom = '1px solid rgba(232, 200, 74, 0.25)';
}

function applyOptionStyles(button, disabled) {
  button.type = 'button';
  button.style.display = 'flex';
  button.style.alignItems = 'baseline';
  button.style.gap = '0.4rem';
  button.style.width = '100%';
  button.style.textAlign = 'left';
  button.style.padding = '0.42rem 0.75rem';
  button.style.background = 'transparent';
  button.style.border = 'none';
  button.style.fontFamily = 'inherit';
  button.style.fontSize = 'inherit';
  button.style.letterSpacing = '0.02em';
  button.style.cursor = disabled ? 'default' : 'pointer';
}

export function createWorldContextMenu({ onOutsideDismiss = null } = {}) {
  const root = document.createElement('div');
  root.className = 'world-context-menu';
  applyRootStyles(root);

  const header = document.createElement('div');
  applyHeaderStyles(header);
  root.appendChild(header);

  const list = document.createElement('div');
  list.style.padding = '0.25rem 0';
  root.appendChild(list);

  // Keep interactions inside the menu from reaching the game canvas beneath it,
  // and suppress the browser menu when right-clicking the menu itself.
  ['pointerdown', 'pointerup', 'click'].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation());
  });
  root.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  let openState = false;

  function close() {
    if (!openState) return;
    openState = false;
    root.style.display = 'none';
    list.innerHTML = '';
    removeDismissListeners();
  }

  function handleWindowPointerDown(event) {
    if (root.contains(event.target)) return;
    close();
    // Let the host suppress the click this gesture will produce — dismissing
    // the menu must never double as a game action on whatever was clicked.
    onOutsideDismiss?.(event);
  }

  function handleWindowKeyDown(event) {
    if (event.key !== 'Escape' && event.key !== 'Esc') return;
    // Consume the keystroke: Escape here means "dismiss the menu", not
    // "toggle the pause menu" — stop it before the game's key bindings.
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  function handleWindowDismiss() {
    close();
  }

  function addDismissListeners() {
    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeyDown, true);
    window.addEventListener('resize', handleWindowDismiss);
    window.addEventListener('blur', handleWindowDismiss);
    window.addEventListener('wheel', handleWindowDismiss, { passive: true });
  }

  function removeDismissListeners() {
    window.removeEventListener('pointerdown', handleWindowPointerDown, true);
    window.removeEventListener('keydown', handleWindowKeyDown, true);
    window.removeEventListener('resize', handleWindowDismiss);
    window.removeEventListener('blur', handleWindowDismiss);
    window.removeEventListener('wheel', handleWindowDismiss);
  }

  function renderOption(option) {
    const button = document.createElement('button');
    const disabled = Boolean(option.disabled);
    applyOptionStyles(button, disabled);

    const verb = document.createElement('span');
    verb.textContent = option.verb ?? option.label ?? 'Interact';
    verb.style.color = disabled ? 'rgba(247, 242, 234, 0.38)' : '#f7f2ea';
    button.appendChild(verb);

    if (option.target) {
      const target = document.createElement('span');
      target.textContent = option.target;
      target.style.color = disabled ? 'rgba(90, 171, 107, 0.4)' : '#5aab6b';
      button.appendChild(target);
    }

    if (option.hint) {
      const hint = document.createElement('span');
      hint.textContent = option.hint;
      hint.style.marginLeft = 'auto';
      hint.style.paddingLeft = '0.6rem';
      hint.style.fontSize = '0.66rem';
      hint.style.color = 'rgba(247, 242, 234, 0.45)';
      button.appendChild(hint);
    }

    if (!disabled) {
      button.addEventListener('pointerenter', () => {
        button.style.background = 'rgba(232, 200, 74, 0.16)';
        verb.style.color = '#e8c84a';
      });
      button.addEventListener('pointerleave', () => {
        button.style.background = 'transparent';
        verb.style.color = '#f7f2ea';
      });
      button.addEventListener('click', () => {
        close();
        option.onSelect?.();
      });
    }

    list.appendChild(button);
  }

  function open({ x, y, options = [] }) {
    if (!options.length) return false;
    list.innerHTML = '';
    options.forEach(renderOption);

    root.style.display = 'block';
    root.style.visibility = 'hidden';
    // Reset position before measuring: a stale left from a previous open near
    // the screen edge squeezes shrink-to-fit width and wraps the rows.
    root.style.left = '0px';
    root.style.top = '0px';
    if (!root.isConnected) document.body.appendChild(root);

    // Center the header under the pointer, clamped to the window.
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    const left = Math.max(4, Math.min(x - Math.min(width / 2, 70), window.innerWidth - width - 4));
    const top = Math.max(4, Math.min(y - 6, window.innerHeight - height - 4));
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
    root.style.visibility = 'visible';

    if (!openState) {
      openState = true;
      addDismissListeners();
    }
    return true;
  }

  function dispose() {
    close();
    root.remove();
  }

  return {
    open,
    close,
    dispose,
    isOpen: () => openState,
    element: root,
  };
}
