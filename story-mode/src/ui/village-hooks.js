/**
 * Village hooks — glue between the village trigger router and the existing
 * Free Play UI (shop panel, tool HUD, garden screen) plus the new compost
 * panel. Free Play only. Not wired into ui-binder yet: live wiring waits for
 * 3D BOT's V0 engine (onTrigger / registerInteractables). Call
 * attachVillageHooks() once the engine exists.
 */
import { createVillageTriggerAdapter } from '../game/village/village-trigger-adapter.js';
import { createVillageTriggerRouter } from '../game/village/village-trigger-router.js';
import { Actions } from '../game/store.js';
import { createCompostPanel } from './compost-panel.js';
import { createShopPanel } from './shop-panel.js';

export function createBackToVillageButton(container, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'village-back-button';
  button.id = 'village-back';
  button.textContent = '← Back to village';
  button.setAttribute('aria-label', 'Back to village (Esc)');
  button.style.cssText = `
    position:fixed;top:calc(12px + env(safe-area-inset-top, 0px));left:12px;z-index:850;
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
    exitPlot: () => {
      backButton?.remove();
      backButton = null;
      exitGardenScreen();
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
export function attachVillageHooks({ engine, store, keyTarget = globalThis.document, placements = [], ...deps }) {
  if (!engine || !store?.getState?.()?.campaign?.sandbox) return null;
  const adapter = createVillageTriggerAdapter(engine);
  let router = null;
  const ports = createVillageUiPorts({ ...deps, store, activate: () => router?.activate() });
  router = createVillageTriggerRouter({
    adapter,
    ui: ports,
    initialVillage: store.getState().campaign.village,
    saveVillage: (village) => store.dispatch({ type: Actions.SET_VILLAGE_STATE, payload: village }),
  });
  router.registerFromPlacements(placements);

  const onKeyDown = (event) => {
    if (isTypingTarget(event.target)) return;
    if (event.key === 'Escape') {
      if (router.handleEscape()) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
      return;
    }
    if (event.repeat) return;
    if (event.key === 'e' || event.key === 'E' || event.key === 'Enter' || event.key === ' ') {
      if (router.activate()) event.preventDefault();
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
