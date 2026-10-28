/**
 * Village trigger router (Free Play, game/ui layer).
 *
 * Turns engine trigger events (via village-trigger-adapter.js) into the
 * existing Free Play UI. The engine never opens UI; this router never touches
 * the scene. All UI goes through the `ui` ports object so the router is pure
 * logic and testable with a mock emitter.
 *
 * ui ports (all optional except where noted):
 *   showPrompt({ id, type, label })        show the E / tap prompt
 *   hidePrompt()
 *   setMovementEnabled(enabled)
 *   openShop({ tab, seedsOnly, onClose })  existing shop panel
 *   openTools({ onClose })                 tool HUD / tools view
 *   openCompost({ onClose })               compost panel (new)
 *   enterPlot({ triggerId, onExit })       existing garden (bed) screen + "Back to village"
 *   exitPlot({ pose })                     leave the garden screen; pose = village exit spot
 *   toast(message)                         brief feedback (neighbour plots)
 *
 * Other deps:
 *   adapter       { subscribe, registerInteractables?, getPlayerPose?, setPlayerPose? }
 *   saveVillage(villageState)  persist campaign.village (Free Play only)
 *   initialVillage             campaign.village at load (for insidePlot restore)
 */
import { TRIGGER_PHASES } from './village-trigger-adapter.js';
import { normalizeVillageState } from './village-state.js';

export const VILLAGE_TRIGGER_TYPES = Object.freeze({
  ENTER_PLOT: 'enter_plot',
  OPEN_SHOP: 'open_shop',
  OPEN_SEEDS: 'open_seeds',
  OPEN_COMPOST: 'open_compost',
  OPEN_TOOLS: 'open_tools',
  NEIGHBOUR_PLOT_RESERVED: 'neighbour_plot_reserved',
});

export const DEFAULT_TRIGGER_PROMPTS = Object.freeze({
  enter_plot: 'Your garden — tend your bed',
  open_shop: 'Seed stand — buy seeds',
  open_seeds: 'Seed box — buy seed packets',
  open_compost: 'Compost bin — turn scraps into compost',
  open_tools: 'Tool shed — buy tools',
  neighbour_plot_reserved: 'Reserved for a neighbour',
});

const HANDLED = new Set(Object.values(VILLAGE_TRIGGER_TYPES));

/** Brief feedback when E / tap hits a neighbour plot that has no one yet. */
export const NEIGHBOUR_PLOT_FEEDBACK = 'Neighbours coming soon';

export function isHandledTriggerType(type) {
  return HANDLED.has(type);
}

export function createVillageTriggerRouter({
  adapter,
  ui = {},
  saveVillage = () => {},
  initialVillage = null,
} = {}) {
  if (!adapter?.subscribe) throw new Error('createVillageTriggerRouter: adapter with subscribe() is required');

  // Triggers the player is currently inside, in enter order (last = active).
  const inside = new Map();
  let openPanel = null; // 'shop' | 'seeds' | 'tools' | 'compost' | null
  let insidePlot = false;
  let plotTrigger = null;
  let poseBeforePlot = null;
  let village = normalizeVillageState(initialVillage);
  let disposed = false;

  function activeTrigger() {
    const entries = [...inside.values()];
    return entries.length ? entries[entries.length - 1] : null;
  }

  function labelFor(trigger) {
    return trigger.prompt ?? DEFAULT_TRIGGER_PROMPTS[trigger.type] ?? 'Interact';
  }

  function syncPrompt() {
    const trigger = activeTrigger();
    if (!trigger || openPanel || insidePlot) {
      ui.hidePrompt?.();
      return;
    }
    ui.showPrompt?.({ id: trigger.id, type: trigger.type, label: labelFor(trigger) });
  }

  function currentPose() {
    const pose = adapter.getPlayerPose?.();
    if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.z)) {
      return { x: pose.x, z: pose.z, facingY: Number.isFinite(pose.facingY) ? pose.facingY : 0 };
    }
    return { x: village.position[0], z: village.position[1], facingY: village.facingY };
  }

  function persist(patch = {}) {
    const pose = patch.pose ?? currentPose();
    village = {
      position: [pose.x, pose.z],
      facingY: pose.facingY,
      insidePlot: patch.insidePlot ?? insidePlot,
    };
    saveVillage({ ...village, position: [...village.position] });
  }

  function onPanelClosed(panel) {
    if (openPanel !== panel) return;
    openPanel = null;
    ui.setMovementEnabled?.(true);
    syncPrompt();
  }

  function openPanelOf(panel, open) {
    if (typeof open !== 'function') return false;
    openPanel = panel;
    ui.hidePrompt?.();
    ui.setMovementEnabled?.(false);
    persist();
    open({ onClose: () => onPanelClosed(panel) });
    return true;
  }

  function enterPlot(trigger) {
    if (insidePlot || typeof ui.enterPlot !== 'function') return false;
    poseBeforePlot = currentPose();
    plotTrigger = trigger;
    insidePlot = true;
    ui.hidePrompt?.();
    ui.setMovementEnabled?.(false);
    persist({ pose: poseBeforePlot, insidePlot: true });
    ui.enterPlot({ triggerId: trigger?.id ?? null, onExit: () => exitPlot() });
    return true;
  }

  function exitPlot() {
    if (!insidePlot) return false;
    const exitPose = plotTrigger?.exit ?? poseBeforePlot ?? currentPose();
    ui.exitPlot?.({ pose: { ...exitPose } });
    adapter.setPlayerPose?.(exitPose);
    insidePlot = false;
    plotTrigger = null;
    persist({ pose: exitPose, insidePlot: false });
    ui.setMovementEnabled?.(true);
    syncPrompt();
    return true;
  }

  /** E / Enter / Space, or a tap on the prompt. Returns true if it did something. */
  function activate() {
    if (disposed || openPanel || insidePlot) return false;
    const trigger = activeTrigger();
    if (!trigger) return false;
    switch (trigger.type) {
      case VILLAGE_TRIGGER_TYPES.ENTER_PLOT:
        return enterPlot(trigger);
      case VILLAGE_TRIGGER_TYPES.OPEN_SHOP:
        return openPanelOf('shop', ui.openShop && ((opts) => ui.openShop({ tab: trigger.target ?? 'seeds', seedsOnly: false, ...opts })));
      case VILLAGE_TRIGGER_TYPES.OPEN_SEEDS:
        return openPanelOf('seeds', ui.openShop && ((opts) => ui.openShop({ tab: 'seeds', seedsOnly: true, ...opts })));
      case VILLAGE_TRIGGER_TYPES.OPEN_TOOLS:
        return openPanelOf('tools', ui.openTools);
      case VILLAGE_TRIGGER_TYPES.OPEN_COMPOST:
        return openPanelOf('compost', ui.openCompost);
      case VILLAGE_TRIGGER_TYPES.NEIGHBOUR_PLOT_RESERVED:
        // No panel, no save, no movement change: just a brief toast so E is
        // not silently ignored.
        ui.toast?.(NEIGHBOUR_PLOT_FEEDBACK);
        return true;
      default:
        return false;
    }
  }

  /** Esc. Returns true if consumed (the caller should not open pause). */
  function handleEscape() {
    if (openPanel) return false; // panels own their own Esc/close and call onClose
    if (insidePlot) return exitPlot();
    return false;
  }

  const unsubscribe = adapter.subscribe(({ phase, trigger }) => {
    if (disposed || !isHandledTriggerType(trigger.type)) return;
    if (phase === TRIGGER_PHASES.ENTER) {
      inside.delete(trigger.id);
      inside.set(trigger.id, trigger);
    } else {
      inside.delete(trigger.id);
    }
    syncPrompt();
  });

  /** Tell the engine which placement triggers the game layer handles. */
  function registerFromPlacements(placements = []) {
    const list = (placements ?? [])
      .map((p) => (p?.trigger ? { id: p.id ?? p.trigger.id, ...p.trigger } : p))
      .filter((t) => t?.id && isHandledTriggerType(t.type))
      .map((t) => ({ id: t.id, type: t.type, prompt: t.prompt ?? DEFAULT_TRIGGER_PROMPTS[t.type] }));
    adapter.registerInteractables?.(list);
    return list;
  }

  /** Call once after load: if the save says we were in the garden, go back there. */
  function restore() {
    if (village.insidePlot && !insidePlot && typeof ui.enterPlot === 'function') {
      poseBeforePlot = { x: village.position[0], z: village.position[1], facingY: village.facingY };
      insidePlot = true;
      ui.setMovementEnabled?.(false);
      ui.enterPlot({ triggerId: null, onExit: () => exitPlot(), restored: true });
      return 'plot';
    }
    adapter.setPlayerPose?.({ x: village.position[0], z: village.position[1], facingY: village.facingY });
    return 'village';
  }

  return {
    activate,
    handleEscape,
    exitPlot,
    restore,
    registerFromPlacements,
    savePosition: () => persist(),
    getActiveTrigger: () => activeTrigger(),
    getOpenPanel: () => openPanel,
    isInsidePlot: () => insidePlot,
    getVillageState: () => ({ ...village, position: [...village.position] }),
    dispose() {
      disposed = true;
      unsubscribe?.();
      inside.clear();
      ui.hidePrompt?.();
    },
  };
}
