/**
 * Village session (Free Play only): wires attachVillageHooks() to the live
 * village zone so the village is reachable from the yard and back.
 *
 *   yard (player_plot, the existing Free Play garden screen)
 *     "← Back to village"  -> travel to the village, land on the home plot's exit spot
 *   village
 *     walk to your plot, E / tap "Your garden" -> travel to the yard (garden screen)
 *     shop / seed box / tool shed / compost / neighbour plots -> village-hooks router
 *
 * The ZoneManager builds a fresh village instance on every visit and disposes
 * it when you leave, so the router talks to a stable facade that is re-bound
 * on each ZONE_CHANGED. Story Mode never creates a session.
 *
 * deps: { store, zoneManager, travelToZone(zoneId, { spawnPoint }) -> Promise<boolean>,
 *         getCurrentZoneId(), container, inventory, craftingSystem, toolHUD?, showToast?,
 *         keyTarget?, layout?, saveIntervalMs? }
 */
import { Actions } from '../game/store.js';
import { normalizeVillageState } from '../game/village/village-state.js';
import { getVillageLayout, pointInsideBlocker, VILLAGE_ZONE_ID } from '../scene/village/village-layout.js';
import { attachVillageHooks, createVillageEngineFacade } from './village-hooks.js';

export const GARDEN_ZONE_ID = 'player_plot';
const PLAYER_RADIUS = 0.18;

/** Where to put the player in the village for a saved state; invalid spots fall back to spawn. */
export function resolveVillageRestorePose(village, layout = getVillageLayout()) {
  const spawn = { x: layout.spawn.x, z: layout.spawn.z, facingY: layout.spawn.facing ?? 0 };
  const state = normalizeVillageState(village, spawn);
  const [x, z] = state.position;
  const { bounds } = layout;
  const inBounds = x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  const blocked = layout.blockers.some((b) => pointInsideBlocker(x, z, b, PLAYER_RADIUS));
  if (!inBounds || blocked) return { ...spawn, insidePlot: state.insidePlot };
  return { x, z, facingY: state.facingY, insidePlot: state.insidePlot };
}

export function getHomePlotExit(layout = getVillageLayout()) {
  const home = layout.interactables.find((t) => t.type === 'enter_plot' && t.plotId === 'home')
    ?? layout.interactables.find((t) => t.type === 'enter_plot');
  if (home?.exit) return { ...home.exit };
  return { x: layout.spawn.x, z: layout.spawn.z, facingY: layout.spawn.facing ?? 0 };
}

export function createVillageSession({
  store,
  zoneManager,
  travelToZone,
  getCurrentZoneId = () => store.getState().campaign.worldState?.currentZone ?? GARDEN_ZONE_ID,
  container = globalThis.document?.getElementById?.('app') ?? globalThis.document?.body,
  inventory,
  craftingSystem,
  toolHUD = null,
  showToast = () => {},
  keyTarget = globalThis.document,
  layout = getVillageLayout(),
  saveIntervalMs = 10000,
} = {}) {
  if (!store?.getState?.()?.campaign?.sandbox || typeof travelToZone !== 'function') return null;

  const facade = createVillageEngineFacade();
  let panelLock = false;
  let travelling = false;
  let pendingPose = null;
  let lastSaved = null;
  let disposed = false;

  const startZone = getCurrentZoneId();
  const saved = store.getState().campaign.village;
  let initialVillage;
  if (startZone === VILLAGE_ZONE_ID) {
    const pose = resolveVillageRestorePose(saved, layout);
    initialVillage = { position: [pose.x, pose.z], facingY: pose.facingY, insidePlot: pose.insidePlot };
    if (!pose.insidePlot) pendingPose = { x: pose.x, z: pose.z, facingY: pose.facingY };
  } else if (startZone === GARDEN_ZONE_ID) {
    // In the yard you are "inside" your plot; leaving puts you on its exit spot.
    const exit = getHomePlotExit(layout);
    initialVillage = { position: [exit.x, exit.z], facingY: exit.facingY, insidePlot: true };
  } else {
    initialVillage = { ...normalizeVillageState(saved), insidePlot: false };
  }

  async function enterGardenScreen() {
    if (getCurrentZoneId() === GARDEN_ZONE_ID) return true;
    travelling = true;
    try {
      const ok = await travelToZone(GARDEN_ZONE_ID);
      if (!ok) showToast('Could not open your garden. Try again.', 1800, 'info');
      return ok;
    } finally {
      travelling = false;
    }
  }

  async function exitGardenScreen({ pose = null } = {}) {
    const target = pose ?? getHomePlotExit(layout);
    pendingPose = { ...target };
    travelling = true;
    try {
      return await travelToZone(VILLAGE_ZONE_ID, {
        spawnPoint: { x: target.x, y: 0, z: target.z, facing: target.facingY },
      });
    } finally {
      travelling = false;
    }
  }

  const hooks = attachVillageHooks({
    engine: facade,
    store,
    keyTarget,
    placements: layout.interactables,
    initialVillage,
    // Esc in the yard keeps closing sheets / opening pause; the button leaves.
    escapeExitsPlot: false,
    container,
    inventory,
    craftingSystem,
    toolHUD,
    showToast,
    setMovementEnabled: (enabled) => {
      panelLock = !enabled;
      facade.setTapToMoveEnabled(enabled);
    },
    enterGardenScreen: () => { void enterGardenScreen(); },
    exitGardenScreen: (opts) => { void exitGardenScreen(opts); },
  });
  if (!hooks) return null;
  const { router } = hooks;

  function bindActiveZone() {
    const zoneId = zoneManager?.getActiveZone?.() ?? getCurrentZoneId();
    const instance = zoneId === VILLAGE_ZONE_ID ? zoneManager?.getActiveZoneInstance?.() : null;
    facade.bind(instance ?? null);
    if (instance && pendingPose) {
      // After ui-binder's ZONE_CHANGED handler (pose handler installed, walk sim
      // reset to the spawn point) so the facing lands too.
      facade.setPlayerPose(pendingPose);
      pendingPose = null;
    }
    if (instance) lastSaved = facade.getPlayerPose();
  }

  const unsubscribe = store.subscribe((_next, action) => {
    if (action?.type === Actions.ZONE_CHANGED) bindActiveZone();
  });

  if (startZone === GARDEN_ZONE_ID || startZone === VILLAGE_ZONE_ID) {
    if (initialVillage.insidePlot) router.restore();
  }
  if (zoneManager?.getActiveZone?.() === VILLAGE_ZONE_ID) bindActiveZone();

  function savePosition({ force = false } = {}) {
    if (disposed || travelling || !facade.isBound() || router.isInsidePlot()) return false;
    const pose = facade.getPlayerPose();
    if (!pose) return false;
    const moved = !lastSaved
      || Math.hypot(pose.x - lastSaved.x, pose.z - lastSaved.z) > 0.25
      || Math.abs((pose.facingY ?? 0) - (lastSaved.facingY ?? 0)) > 0.2;
    if (!moved && !force) return false;
    router.savePosition();
    lastSaved = { ...pose };
    return true;
  }

  const interval = saveIntervalMs > 0 ? setInterval(() => savePosition(), saveIntervalMs) : null;
  const onHidden = () => {
    if (globalThis.document?.visibilityState === 'hidden') savePosition({ force: true });
  };
  const onPageHide = () => savePosition({ force: true });
  globalThis.document?.addEventListener?.('visibilitychange', onHidden);
  globalThis.addEventListener?.('pagehide', onPageHide);

  return {
    router,
    facade,
    hooks,
    /** True only while a village panel (shop, seeds, tools, compost) is open. */
    isMovementLocked: () => panelLock && Boolean(router.getOpenPanel()),
    isVillageActive: () => getCurrentZoneId() === VILLAGE_ZONE_ID,
    savePosition,
    enterVillage: () => (router.isInsidePlot() ? router.exitPlot() : false),
    getDebugState: () => ({
      zone: getCurrentZoneId(),
      bound: facade.isBound(),
      travelling,
      insidePlot: router.isInsidePlot(),
      openPanel: router.getOpenPanel(),
      activeTrigger: router.getActiveTrigger()?.id ?? null,
      pose: facade.getPlayerPose(),
      village: store.getState().campaign.village,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (interval) clearInterval(interval);
      globalThis.document?.removeEventListener?.('visibilitychange', onHidden);
      globalThis.removeEventListener?.('pagehide', onPageHide);
      unsubscribe?.();
      hooks.dispose();
      facade.dispose();
    },
  };
}
