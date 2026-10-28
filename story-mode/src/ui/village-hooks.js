/**
 * Village hooks — glue between the village trigger router and the existing
 * Free Play UI (shop panel, tool HUD, garden screen) plus the new compost
 * panel. Free Play only. ui-binder wires this through village-session.js,
 * which binds the live village zone (3D BOT's engine, #78) via
 * createVillageEngineFacade().
 *
 * Keys: only E activates a village trigger, and only while one is active, so
 * Enter / Space keep reaching select_cell, cutscene_next and advance.
 */
import { createVillageTriggerAdapter } from '../game/village/village-trigger-adapter.js';
import { createVillageTriggerRouter } from '../game/village/village-trigger-router.js';
import { Actions } from '../game/store.js';
import { createCompostPanel } from './compost-panel.js';
import { createShopPanel } from './shop-panel.js';

// Top-right under the HUD bar: clear of the pause button (top-left), the
// season card, the crop counter and the bottom tool / phase controls. z-index
// 40 sits above the HUD (≤35) and below the pause overlay (50) and sheets (200).
export function createBackToVillageButton(container, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'village-back-button';
  button.id = 'village-back';
  button.textContent = '← Back to village';
  button.setAttribute('aria-label', 'Back to village (Esc)');
  button.style.cssText = `
    position:fixed;top:calc(88px + env(safe-area-inset-top, 0px));right:12px;z-index:40;
    border:1px solid rgba(247,242,234,0.12);border-radius:999px;padding:8px 14px;
    font-family:'DM Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;
    background:#3a2516;color:#f7f2ea;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.4);
  `;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    onClick?.();
  });
  container.appendChild(button);
  return button;
}

function createVillagePrompt(container, onActivate) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'interaction-prompt village-prompt';
  button.id = 'village-prompt';
  button.hidden = true;
  // The shared .interaction-prompt style anchors at a projected world point
  // (left/top). The village prompt has no world anchor, so pin it bottom-centre
  // above the tool row and touch controls, where it is readable on a phone.
  button.style.cssText = `
    position:fixed;left:50%;top:auto;bottom:calc(27vh + env(safe-area-inset-bottom, 0px));
    transform:translateX(-50%);z-index:36;max-width:calc(100vw - 24px);
  `;
  const hint = document.createElement('span');
  hint.className = 'interaction-prompt__hint';
  hint.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'interaction-prompt__label';
  button.append(hint, label);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  });
  container.appendChild(button);
  return {
    element: button,
    show(text) {
      const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
      hint.textContent = coarse ? 'Tap' : 'E';
      label.textContent = text;
      button.setAttribute('aria-label', `${coarse ? 'Tap' : 'Interact'}: ${text}`);
      button.hidden = false;
      button.classList.add('is-visible');
    },
    hide() {
      button.hidden = true;
      button.classList.remove('is-visible');
    },
    dispose() {
      button.remove();
    },
  };
}

/**
 * Build the router's ui ports from existing Free Play pieces.
 * deps: { container, store, inventory, craftingSystem, toolHUD?, shopPanel?,
 *         compostPanel?, setMovementEnabled, enterGardenScreen, exitGardenScreen,
 *         showToast?, activate }
 */
export function createVillageUiPorts(deps) {
  const {
    container, store, inventory, craftingSystem, toolHUD = null,
    setMovementEnabled = () => {}, enterGardenScreen = () => {}, exitGardenScreen = () => {},
    showToast = () => {}, activate = () => {},
  } = deps;
  const shopPanel = deps.shopPanel ?? createShopPanel(container);
  const compostPanel = deps.compostPanel ?? createCompostPanel(container);
  const prompt = createVillagePrompt(container, () => activate());
  let backButton = null;

  return {
    shopPanel,
    compostPanel,
    showPrompt: ({ label }) => prompt.show(label),
    hidePrompt: () => prompt.hide(),
    setMovementEnabled,
    openShop: ({ tab = 'seeds', seedsOnly = false, onClose }) => {
      shopPanel.open({
        name: seedsOnly ? 'Seed box' : 'Seed stand',
        tab,
        tabs: seedsOnly ? ['seeds'] : undefined,
        onClose,
      }, store);
    },
    openTools: ({ onClose }) => {
      toolHUD?.setVisible(true);
      shopPanel.open({
        name: 'Tool shed',
        tab: 'tools',
        tabs: ['tools'],
        onClose: () => {
          toolHUD?.setVisible(false);
          onClose?.();
        },
      }, store);
    },
    openCompost: ({ onClose }) => {
      compostPanel.open({
        craftingSystem,
        inventory,
        onClose,
        onDeposit: (result) => { if (result.made > 0) showToast(result.message, 1800, 'success'); },
      });
    },
    enterPlot: ({ onExit, restored = false }) => {
      enterGardenScreen({ restored });
      backButton?.remove();
      backButton = createBackToVillageButton(container, onExit);
    },
    exitPlot: ({ pose = null } = {}) => {
      backButton?.remove();
      backButton = null;
      exitGardenScreen({ pose });
    },
    toast: (message) => showToast(message),
    dispose() {
      prompt.dispose();
      backButton?.remove();
      shopPanel.dispose?.();
      compostPanel.dispose?.();
    },
  };
}

function isTypingTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}

/**
 * Wire everything: engine -> adapter -> router -> existing UI. Returns
 * { router, ports, dispose }. Free Play only; returns null otherwise.
 */
export function attachVillageHooks({
  engine, store, keyTarget = globalThis.document, placements = [], initialVillage, escapeExitsPlot = true, ...deps
}) {
  if (!engine || !store?.getState?.()?.campaign?.sandbox) return null;
  const adapter = createVillageTriggerAdapter(engine);
  let router = null;
  const ports = createVillageUiPorts({ ...deps, store, activate: () => router?.activate() });
  router = createVillageTriggerRouter({
    adapter,
    ui: ports,
    initialVillage: initialVillage ?? store.getState().campaign.village,
    saveVillage: (village) => store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: village }),
  });
  router.registerFromPlacements(placements);

  const onKeyDown = (event) => {
    if (isTypingTarget(event.target)) return;
    if (event.key === 'Escape') {
      if (escapeExitsPlot && router.handleEscape()) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
      return;
    }
    if (event.repeat) return;
    // E only (never Enter / Space, which belong to select_cell, cutscene_next
    // and advance), and only while a village trigger is active.
    if (event.key !== 'e' && event.key !== 'E') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!router.getActiveTrigger() || router.isInsidePlot() || router.getOpenPanel()) return;
    if (router.activate()) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  };
  keyTarget?.addEventListener?.('keydown', onKeyDown, true);

  return {
    router,
    ports,
    dispose() {
      keyTarget?.removeEventListener?.('keydown', onKeyDown, true);
      router.dispose();
      ports.dispose();
    },
  };
}

/**
 * Stable engine for the router while the live village zone comes and goes
 * (ZoneManager disposes the village when you travel into your plot and builds
 * a new one on the way back). bind(instance) forwards that instance's
 * triggers; unbind() sends a synthetic `leave` for every trigger the player
 * was inside, so the router never keeps a stale prompt across travel.
 */
export function createVillageEngineFacade() {
  const listeners = new Set();
  const inside = new Map();
  let instance = null;
  let off = null;
  let registered = [];

  function emit(phase, trigger) {
    listeners.forEach((fn) => {
      try { fn(phase, trigger); } catch (err) { console.error('[village] hook listener failed', err); }
    });
  }

  function forward(phase, trigger) {
    if (!trigger?.id) return;
    if (phase === 'enter') inside.set(trigger.id, trigger);
    else if (phase === 'leave') inside.delete(trigger.id);
    emit(phase, trigger);
  }

  function bind(next = null) {
    if (next === instance) return;
    off?.();
    off = null;
    const stale = [...inside.values()];
    inside.clear();
    stale.forEach((trigger) => emit('leave', trigger));
    instance = next;
    if (instance?.onTrigger) {
      off = instance.onTrigger(forward);
      if (registered.length) instance.registerInteractables?.(registered);
    }
  }

  return {
    onTrigger(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    registerInteractables(list) {
      registered = Array.isArray(list) ? list.map((entry) => ({ ...entry })) : [];
      instance?.registerInteractables?.(registered);
    },
    getPlayerPose() {
      return instance?.getPlayerPose?.() ?? null;
    },
    setPlayerPose(pose) {
      instance?.setPlayerPose?.(pose);
    },
    setTapToMoveEnabled(on) {
      instance?.setTapToMoveEnabled?.(on);
    },
    bind,
    unbind: () => bind(null),
    getInstance: () => instance,
    isBound: () => Boolean(instance),
    listenerCount: () => listeners.size,
    dispose() {
      bind(null);
      listeners.clear();
    },
  };
}
