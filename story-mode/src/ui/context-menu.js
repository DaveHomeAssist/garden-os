/**
 * RuneScape-style "Choose Option" menu for the 3D world.
 * Options are { verb, target?, hint?, disabled?, onSelect? }.
 */

function getEnabledItems(list) {
  return [...list.querySelectorAll('[role="menuitem"]:not(:disabled)')];
}

export function createWorldContextMenu({ onOutsideDismiss = null } = {}) {
  const root = document.createElement('div');
  root.className = 'world-context-menu';
  root.setAttribute('role', 'menu');
  root.setAttribute('aria-labelledby', 'world-context-menu-title');
  root.hidden = true;

  const header = document.createElement('div');
  header.id = 'world-context-menu-title';
  header.className = 'world-context-menu__header';
  header.textContent = 'Choose Option';

  const list = document.createElement('div');
  list.className = 'world-context-menu__list';
  list.setAttribute('role', 'presentation');
  root.append(header, list);

  ['pointerdown', 'pointerup', 'click'].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation());
  });
  root.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  let openState = false;
  let returnFocus = null;

  function restoreFocus() {
    if (!(returnFocus instanceof HTMLElement) || !returnFocus.isConnected) return;
    returnFocus.focus({ preventScroll: true });
  }

  function close({ restore = true } = {}) {
    if (!openState) return;
    openState = false;
    root.hidden = true;
    root.style.visibility = '';
    list.replaceChildren();
    removeDismissListeners();
    if (restore) restoreFocus();
    returnFocus = null;
  }

  function focusItem(nextIndex) {
    const items = getEnabledItems(list);
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);
    const normalizedIndex = (nextIndex(currentIndex, items.length) + items.length) % items.length;
    items.forEach((item, index) => { item.tabIndex = index === normalizedIndex ? 0 : -1; });
    items[normalizedIndex].focus({ preventScroll: true });
  }

  function handleWindowPointerDown(event) {
    if (root.contains(event.target)) return;
    close();
    onOutsideDismiss?.(event);
  }

  function handleWindowKeyDown(event) {
    const key = event.key;
    if (key === 'Escape' || key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }

    const navigation = {
      ArrowDown: (index) => index + 1,
      ArrowUp: (index, length) => (index < 0 ? length - 1 : index - 1),
      Home: () => 0,
      End: (_index, length) => length - 1,
    }[key];
    if (!navigation) return;

    event.preventDefault();
    event.stopPropagation();
    focusItem(navigation);
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

  function renderOption(option, index) {
    const button = document.createElement('button');
    const disabled = Boolean(option.disabled);
    button.type = 'button';
    button.className = 'world-context-menu__option';
    button.setAttribute('role', 'menuitem');
    button.disabled = disabled;
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    button.tabIndex = disabled || index > 0 ? -1 : 0;

    const verb = document.createElement('span');
    verb.className = 'world-context-menu__verb';
    verb.textContent = option.verb ?? option.label ?? 'Interact';
    button.append(verb);

    if (option.target) {
      const target = document.createElement('span');
      target.className = 'world-context-menu__target';
      target.textContent = option.target;
      button.append(target);
    }

    if (option.hint) {
      const hint = document.createElement('span');
      hint.className = 'world-context-menu__hint';
      hint.textContent = option.hint;
      button.append(hint);
    }

    if (!disabled) {
      button.addEventListener('click', () => {
        close();
        option.onSelect?.();
      });
    }

    list.append(button);
  }

  function open({ x, y, options = [] }) {
    if (!options.length) return false;
    if (openState) close({ restore: false });

    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    list.replaceChildren();
    options.forEach(renderOption);

    root.hidden = false;
    root.style.visibility = 'hidden';
    root.style.left = '0px';
    root.style.top = '0px';
    if (!root.isConnected) document.body.append(root);

    const width = root.offsetWidth;
    const height = root.offsetHeight;
    const left = Math.max(4, Math.min(x - Math.min(width / 2, 70), window.innerWidth - width - 4));
    const top = Math.max(4, Math.min(y - 6, window.innerHeight - height - 4));
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
    root.style.visibility = 'visible';

    openState = true;
    addDismissListeners();
    focusItem(() => 0);
    return true;
  }

  function dispose() {
    close({ restore: false });
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
