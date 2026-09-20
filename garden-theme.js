/* Garden OS shared light/dark theme controller.
 *
 * The product defaults to light on first visit. A user's explicit choice is
 * stored once and shared by the root tools and Story Mode.
 */
(function initGardenTheme(global) {
  'use strict';

  const STORAGE_KEY = 'garden-os-theme';
  const VALID_THEMES = new Set(['light', 'dark']);
  const root = document.documentElement;

  function readStoredTheme() {
    try {
      const stored = global.localStorage?.getItem(STORAGE_KEY);
      return VALID_THEMES.has(stored) ? stored : 'light';
    } catch {
      return 'light';
    }
  }

  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#171b16' : '#f7f3ec';
  }

  function updateToggle(button, theme) {
    if (!button) return;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    button.dataset.theme = theme;
    button.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    button.setAttribute('title', `Switch to ${nextTheme} theme`);
    button.querySelector('[data-theme-icon]').textContent = theme === 'dark' ? '☀' : '☾';
    button.querySelector('[data-theme-label]').textContent = nextTheme === 'dark' ? 'Dark' : 'Light';
  }

  function applyTheme(theme, { persist = false } = {}) {
    const nextTheme = VALID_THEMES.has(theme) ? theme : 'light';
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    updateThemeColor(nextTheme);

    if (persist) {
      try {
        global.localStorage?.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // Private browsing and locked-down embeds can reject storage writes.
      }
    }

    updateToggle(document.querySelector('[data-garden-theme-toggle]'), nextTheme);
    global.dispatchEvent(new CustomEvent('garden-theme-change', { detail: { theme: nextTheme } }));
    return nextTheme;
  }

  function mountToggle() {
    if (!document.body || document.querySelector('[data-garden-theme-toggle]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'garden-theme-toggle';
    button.dataset.gardenThemeToggle = 'true';
    button.innerHTML = '<span data-theme-icon aria-hidden="true"></span><span data-theme-label></span>';
    button.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', { persist: true });
    });
    document.body.appendChild(button);
    updateToggle(button, root.dataset.theme || 'light');
  }

  const initialTheme = readStoredTheme();
  applyTheme(initialTheme);

  global.GardenTheme = Object.freeze({
    storageKey: STORAGE_KEY,
    getTheme: () => root.dataset.theme || 'light',
    setTheme: (theme) => applyTheme(theme, { persist: true }),
    mountToggle,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  } else {
    mountToggle();
  }
})(window);
