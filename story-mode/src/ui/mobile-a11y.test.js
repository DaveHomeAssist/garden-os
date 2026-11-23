// @vitest-environment jsdom
// Mobile accessibility pass: zoom, modal focus, shop keyboard/touch, labels.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findTopModal, getFocusable, installModalFocus, nextTrapTarget } from './modal-focus.js';
import { createShopPanel } from './shop-panel.js';
import { ToolHUD } from './tool-hud.js';
import { Store } from '../game/store.js';
import { createGameState } from '../game/state.js';

const here = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(here, '../../index.html'), 'utf8');
const a11yCss = readFileSync(join(here, '../../assets/css/mobile-a11y.css'), 'utf8');
const mainSrc = readFileSync(join(here, '../main.js'), 'utf8');

describe('viewport and page shell', () => {
  it('does not block pinch zoom (WCAG 1.4.4)', () => {
    const meta = indexHtml.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';
    expect(meta).toContain('width=device-width');
    expect(meta).toContain('viewport-fit=cover');
    expect(meta).not.toMatch(/user-scalable\s*=\s*(no|0)/);
    expect(meta).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/);
  });

  it('announces toasts politely', () => {
    expect(indexHtml).toMatch(/<div id="toast-container" role="status" aria-live="polite"/);
  });

  it('keeps pause-action icons out of the accessible name', () => {
    const icons = indexHtml.match(/<span class="pause-action__icon"[^>]*>/g) ?? [];
    expect(icons.length).toBeGreaterThan(5);
    icons.forEach((tag) => expect(tag).toContain('aria-hidden="true"'));
    // Visible title + copy are the name; no aria-label that drops the copy.
    expect(indexHtml).not.toMatch(/id="pause-resume"[^>]*aria-label/);
  });

  it('loads the mobile a11y sheet after the HUD sheets and installs modal focus', () => {
    const imports = [...mainSrc.matchAll(/^import '(\.\.\/assets\/css\/[^']+)';/gm)].map((m) => m[1]);
    // Only the phone layout sheets may load after it: phone controls
    // (positions) and the phone HUD declutter (looks; its 44px / 12px floors
    // are checked in phone-hud.test.js).
    expect(imports.slice(imports.indexOf('../assets/css/mobile-a11y.css') + 1)).toEqual(['../assets/css/phone-controls.css', '../assets/css/phone-hud.css']);
    expect(mainSrc).toMatch(/installModalFocus\(\);/);
  });

  it('guards 44px targets, hidden prompts, safe areas and phone type sizes', () => {
    expect(a11yCss).toMatch(/\.interaction-prompt\[hidden\]\s*\{\s*display:\s*none !important;/);
    expect(a11yCss).toMatch(/@media \(pointer: coarse\), \(max-width: 900px\)/);
    for (const sel of ['.dp-skip-btn', '.quest-tracker__collapse', '.quest-log__drop', '.read-only-sheet__card button']) {
      const at = a11yCss.indexOf(sel);
      expect(at, sel).toBeGreaterThan(-1);
      expect(a11yCss.slice(at, a11yCss.indexOf('}', at)), sel).toContain('min-height: 44px');
    }
    expect(a11yCss).toMatch(/env\(safe-area-inset-top/);
    expect(a11yCss).toMatch(/env\(safe-area-inset-left/);
    expect(a11yCss).toMatch(/@media \(max-width: 600px\)[\s\S]*font-size: 14px !important/);
  });
});

describe('modal focus', () => {
  let api;
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <div id="closed" role="dialog" aria-modal="true" hidden><button>x</button></div>`;
  });
  afterEach(() => { api?.dispose(); api = null; document.body.innerHTML = ''; });

  function openSheet() {
    const sheet = document.createElement('div');
    sheet.id = 'sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<button id="first">One</button><button id="disabled" disabled>No</button><button id="last">Two</button>';
    document.body.appendChild(sheet);
    return sheet;
  }

  it('ignores hidden, inert and aria-hidden dialogs', () => {
    expect(findTopModal()).toBeNull();
    const sheet = openSheet();
    expect(findTopModal()).toBe(sheet);
    sheet.setAttribute('inert', '');
    expect(findTopModal()).toBeNull();
  });

  it('wraps Tab and Shift+Tab inside the top dialog, skipping disabled controls', () => {
    const sheet = openSheet();
    const first = sheet.querySelector('#first');
    const last = sheet.querySelector('#last');
    expect(getFocusable(sheet)).toEqual([first, last]);
    expect(nextTrapTarget(sheet, document.body, false)).toBe(first);
    expect(nextTrapTarget(sheet, last, false)).toBe(first);
    expect(nextTrapTarget(sheet, first, true)).toBe(last);
    expect(nextTrapTarget(sheet, first, false)).toBeNull();
  });

  it('moves focus into a new dialog, keeps Tab from the game, and restores focus on close', () => {
    api = installModalFocus();
    const opener = document.getElementById('opener');
    opener.focus();
    const sheet = openSheet();
    api.sync();
    expect(document.activeElement).toBe(sheet);

    const gameTab = vi.fn();
    window.addEventListener('keydown', gameTab);
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    sheet.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe('first');
    expect(gameTab).not.toHaveBeenCalled();
    window.removeEventListener('keydown', gameTab);

    sheet.remove();
    api.sync();
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to a tapped opener that hides while its sheet is open (village prompt)', () => {
    let t = 1000;
    api = installModalFocus({ now: () => t });
    const opener = document.getElementById('opener');
    // A tap: pointerdown on the control, no focus (iOS Safari), then it hides.
    opener.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    opener.hidden = true;
    t += 100;
    const sheet = openSheet();
    api.sync();
    expect(document.activeElement).toBe(sheet);

    sheet.remove();
    t += 100;
    api.sync();
    // Still hidden: nothing to focus yet, and focus is not forced elsewhere.
    expect(document.activeElement).toBe(document.body);
    opener.hidden = false;
    t += 100;
    api.sync();
    expect(document.activeElement).toBe(opener);
  });

  it('gives up on an opener that never comes back, and leaves keyboard-opened sheets on body', () => {
    let t = 1000;
    api = installModalFocus({ now: () => t });
    const opener = document.getElementById('opener');
    opener.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    opener.hidden = true;
    let sheet = openSheet();
    api.sync();
    sheet.remove();
    api.sync();
    t += 5000;
    opener.hidden = false;
    api.sync();
    expect(document.activeElement).toBe(document.body);

    // A sheet opened from a game key long after any tap has no opener.
    t += 5000;
    sheet = openSheet();
    api.sync();
    sheet.remove();
    api.sync();
    expect(document.activeElement).toBe(document.body);
  });

  it('leaves Tab alone when no dialog is open', () => {
    api = installModalFocus();
    const gameTab = vi.fn();
    window.addEventListener('keydown', gameTab);
    document.getElementById('opener').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(gameTab).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', gameTab);
  });
});

describe('shop panel on touch and keyboard', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; });

  function openShop() {
    const state = createGameState();
    state.campaign.currency.balance = 100;
    const store = new Store(state);
    const shop = createShopPanel(document.getElementById('root'));
    const onClose = vi.fn();
    shop.open({ name: 'Seed stand', chapter: 1, onClose }, store);
    return { shop, onClose, panel: document.getElementById('shop-panel') };
  }

  it('is a named modal dialog with 44px controls and a pressed-state tab', () => {
    const { shop, panel } = openShop();
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe('Seed stand');
    const buy = panel.querySelector('[data-buy-item]');
    expect(buy.getAttribute('style')).toMatch(/min-height:44px/);
    expect(buy.getAttribute('aria-label')).toMatch(/^Buy .+, \d+ coins$/);
    expect(panel.querySelector('#shop-dismiss').getAttribute('style')).toMatch(/min-width:44px;\s*min-height:44px/);
    const tabs = [...panel.querySelectorAll('[data-shop-tab]')];
    expect(tabs.every((t) => /min-height:44px/.test(t.getAttribute('style')))).toBe(true);
    expect(tabs.filter((t) => t.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    shop.dispose();
  });

  it('Esc closes only the shop and does not reach the pause binding', () => {
    const { shop, onClose } = openShop();
    const pause = vi.fn();
    window.addEventListener('keydown', pause);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(shop.isOpen()).toBe(false);
    expect(document.getElementById('shop-panel')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
    // The listener is gone once closed.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(pause).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', pause);
  });
});

describe('tool dock names', () => {
  it('includes the visible key number in each slot name (label in name)', () => {
    document.body.innerHTML = '<div id="hud-root"></div>';
    const input = { registerAction: vi.fn(), on: () => () => {} };
    const hud = new ToolHUD(document.getElementById('hud-root'), input, null);
    hud.setTools([{ id: 'water', label: 'Water', icon: '💧' }, { id: 'plant', label: 'Plant', icon: '🌱', shortcut: '7' }]);
    const labels = [...document.querySelectorAll('.tool-hud__slot')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Water, key 1', 'Plant, key 7']);
    hud.dispose?.();
  });
});

describe('follow-up: room playtest of #98', () => {
  const ruleFor = (selector) => a11yCss.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

  it('lifts the setup swatches and bug report actions to 44px', () => {
    expect(ruleFor('body .profile-choice')).toMatch(/min-height:\s*44px/);
    expect(ruleFor('body .bug-report-actions button')).toMatch(/min-height:\s*44px/);
  });

  it('puts the title theme switch in the title actions, not in a floating pill', () => {
    const actions = indexHtml.match(/<div class="title-footer-actions" id="title-actions">([\s\S]*?)<\/div>\s*<div class="title-modes"/)?.[1] ?? '';
    expect(actions).toMatch(/<button type="button" class="title-link-btn" id="title-theme" data-garden-theme-toggle>/);
    expect(actions).toMatch(/data-theme-icon aria-hidden="true"/);
    expect(actions).toMatch(/data-theme-label/);
    expect(mainSrc).toMatch(/getElementById\('title-theme'\)\?\.addEventListener\('click'/);
    expect(a11yCss).toMatch(/\.garden-theme-toggle:not\(#title-theme\)\s*\{\s*display:\s*none !important;/);
  });

  it('names Save Report by its visible text', () => {
    const tag = indexHtml.match(/<button class="bug-btn-send"[^>]*>/)?.[0] ?? '';
    expect(tag).toMatch(/aria-label="Save Report\b/);
  });
});
