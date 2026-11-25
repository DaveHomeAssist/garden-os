/**
 * Modal focus management for every open dialog (mobile accessibility pass).
 *
 * Sheets and overlays (pause menu, shop, world map, quest log, trade, beds,
 * packs, save transfer) each declare role="dialog" + aria-modal="true" but
 * nothing kept keyboard or screen-reader focus inside them:
 *  - on open, focus stayed on the canvas or the button behind the sheet, so
 *    VoiceOver / TalkBack kept reading the HUD underneath;
 *  - Tab walked out of the sheet into the HUD, and while the tool dock was
 *    visible the game's Tab = "next tool" binding swallowed it entirely, so
 *    Tab changed tools behind an open shop instead of moving focus;
 *  - on close, focus was lost to <body>.
 *
 * The opener is the focused control, or else the control tapped or focused in
 * the last 1.5s (iOS does not focus a tapped button, and the village prompt
 * hides before its sheet appears). On close, focus goes back to it once it is
 * visible again, for up to 1.5s; a sheet opened from a game key (E, Q, M, Esc
 * with nothing focused) leaves focus on <body>, where game keys keep working.
 *
 * This watches the DOM for the top-most open modal, moves focus into it when
 * it appears (the dialog itself, not its first button, so a stray Space or
 * Enter cannot buy or travel), wraps Tab / Shift+Tab inside it, and returns
 * focus to the control that opened it when it closes. Esc stays with each
 * sheet's own handler (escape-layers.js, quest log, pause).
 */

export const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], [role="alertdialog"]';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isRendered(element, win) {
  if (!element?.isConnected) return false;
  if (element.closest('[inert], [aria-hidden="true"], [hidden]')) return false;
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    const style = win.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

/** The open modal the player sees on top (the last one in document order). */
export function findTopModal(doc = document) {
  const win = doc.defaultView;
  const open = [...doc.querySelectorAll(MODAL_SELECTOR)].filter((el) => isRendered(el, win));
  return open.at(-1) ?? null;
}

/** Tabbable controls inside a modal, in DOM order. */
export function getFocusable(root) {
  const win = root.ownerDocument.defaultView;
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => isRendered(el, win));
}

/**
 * Where Tab / Shift+Tab should land inside `modal`, or null to let the
 * browser move focus normally (it is already between two inner controls).
 */
export function nextTrapTarget(modal, active, backwards) {
  const items = getFocusable(modal);
  if (!items.length) return modal;
  const first = items[0];
  const last = items.at(-1);
  if (!modal.contains(active) || active === modal) return backwards ? last : first;
  if (backwards && active === first) return last;
  if (!backwards && active === last) return first;
  return null;
}

// How long a tap or focus on a control still counts as "the opener" of a
// sheet that appears after it, and how long a closed sheet waits for its
// opener to come back (the village prompt is hidden while its sheet is open
// and only reappears after the close).
const OPENER_WINDOW_MS = 1500;
const RETURN_WINDOW_MS = 1500;

export function installModalFocus({ doc = document, now = () => Date.now() } = {}) {
  const win = doc.defaultView;
  let current = null;
  let returnTo = null;
  let pendingReturn = null;
  let retryTimer = null;
  let scheduled = false;
  // Last control the player tapped or focused outside any sheet. iOS Safari
  // does not focus a button on tap, and the village prompt hides (dropping
  // focus to <body>) before the sheet it opens is observed, so activeElement
  // alone loses the opener.
  let lastControl = null;

  const focusSoft = (el) => {
    try { el.focus({ preventScroll: true }); } catch { /* detached */ }
  };

  function noteControl(event) {
    const el = event.target?.closest?.(FOCUSABLE_SELECTOR);
    if (!el || el.closest(MODAL_SELECTOR)) return;
    lastControl = { el, at: now() };
  }

  function findOpener(top) {
    const active = doc.activeElement;
    if (active && active !== doc.body && !top.contains(active)) return active;
    if (lastControl && now() - lastControl.at <= OPENER_WINDOW_MS && !top.contains(lastControl.el)) return lastControl.el;
    return null;
  }

  function tryReturn() {
    if (!pendingReturn) return;
    const { target, until } = pendingReturn;
    const active = doc.activeElement;
    const focusFree = !active || active === doc.body || !active.isConnected;
    if (!focusFree || !target.isConnected || now() > until) { pendingReturn = null; return; }
    if (isRendered(target, win) && !target.disabled) {
      focusSoft(target);
      pendingReturn = null;
      return;
    }
    // Not back yet (e.g. the prompt re-shows after the close): retry shortly.
    if (!retryTimer) retryTimer = win.setTimeout(() => { retryTimer = null; tryReturn(); }, 50);
  }

  function sync() {
    scheduled = false;
    const top = findTopModal(doc);
    if (top === current) { tryReturn(); return; }
    const previous = current;
    current = top;
    if (top) {
      pendingReturn = null;
      // Remember who opened the first modal; stacked modals keep that origin.
      if (!previous) returnTo = findOpener(top);
      if (!top.contains(doc.activeElement)) {
        if (!top.hasAttribute('tabindex')) top.setAttribute('tabindex', '-1');
        top.dataset.modalFocusTarget = 'true';
        focusSoft(top);
      }
      return;
    }
    const target = returnTo;
    returnTo = null;
    lastControl = null;
    if (target) {
      pendingReturn = { target, until: now() + RETURN_WINDOW_MS };
      tryReturn();
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    // After the opener's own synchronous focus calls, before the next paint.
    (win.requestAnimationFrame ?? ((cb) => win.setTimeout(cb, 16)))(sync);
  }

  // No 'style' in the filter: the HUD and 3D overlays rewrite inline styles
  // every frame, and watching them cost enough main-thread time to reorder
  // the main-menu save against the next session's load (village e2e). Every
  // sheet opens via class / hidden / insertion, which are still observed.
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'inert', 'aria-hidden', 'aria-modal', 'role'],
  });

  function onKeyDown(event) {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const modal = findTopModal(doc);
    if (!modal) return;
    // The game binds Tab to "next tool"; inside a sheet Tab moves focus.
    event.stopPropagation();
    const target = nextTrapTarget(modal, doc.activeElement, event.shiftKey);
    if (target) {
      event.preventDefault();
      focusSoft(target);
    }
  }
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('pointerdown', noteControl, true);
  doc.addEventListener('focusin', noteControl, true);
  schedule();

  return {
    sync,
    dispose() {
      observer.disconnect();
      doc.removeEventListener('keydown', onKeyDown, true);
      doc.removeEventListener('pointerdown', noteControl, true);
      doc.removeEventListener('focusin', noteControl, true);
      if (retryTimer) win.clearTimeout(retryTimer);
    },
  };
}
