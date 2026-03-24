import { createLoop } from '../game/loop.js';
import { Actions, cloneGameState } from '../game/store.js';
import { advance, canAdvance, getPhaseLabel } from '../game/phase-machine.js';
import { createPhaseRouter } from '../game/phase-router.js';
import { createSeasonState, PHASES, PHASE_ORDER } from '../game/state.js';
import { scoreBed } from '../scoring/bed-score.js';
import { deleteCampaign, saveCampaign, saveSeasonState } from '../game/save.js';
import { showEventCard } from './event-card.js';
import { showHarvestReveal } from './harvest-reveal.js';
import { showBackpackPanel } from './backpack-panel.js';
import { createDialoguePanel } from './dialogue-panel.js';
import { showWinterReview } from './winter-review.js';
import { showSeasonJournalSheet, showBugReportsSheet } from './pause-panels.js';
import { createCutsceneMachine } from '../game/cutscene-machine.js';
import { createSeasonCalendar, updateSeasonCalendar } from './season-calendar.js';
import {
  applyIntervention,
  canUseTool,
  executeToolAction,
  getTargetableCells,
} from '../game/intervention.js';
import { applyEventEffect } from '../game/event-engine.js';
import { createPlayerController } from '../game/player-controller.js';
import { InteractionSystem } from '../game/interaction.js';
import { createInteractionPrompt } from './interaction-prompt.js';
import { ToolHUD } from './tool-hud.js';
import { createTouchStick } from './touch-stick.js';
import { Inventory, getItemDef } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { ForagingSystem } from '../game/foraging.js';
import { ReputationSystem } from '../game/reputation.js';
import { QuestEngine } from '../game/quest-engine.js';
import { FestivalEngine } from '../game/festivals.js';
import { evaluateZoneAccess } from '../scene/zone-manager.js';

const FACTION_BADGE_COLORS = {
  climbers: '#2d8a4e',
  fast_cycles: '#6dbf6d',
  greens: '#3a7a4f',
  roots: '#c47a3a',
  herbs: '#7ab85e',
  fruiting: '#d44a2a',
  brassicas: '#4a8a6a',
  companions: '#e8c84a',
};

const FACTION_NAMES = {
  climbers: 'Climber',
  fast_cycles: 'Fast',
  greens: 'Greens',
  roots: 'Root',
  herbs: 'Herb',
  fruiting: 'Fruit',
  brassicas: 'Brassica',
  companions: 'Companion',
};

const INTERVENTION_LABELS = {
  protect: 'Protect',
  mulch: 'Mulch',
  swap: 'Swap',
  companion_patch: 'Companion Patch',
  prune: 'Prune',
  accept_loss: 'Accept Loss',
};

const INTERVENTION_PROMPTS = {
  protect: 'Choose a planted cell to shield from this event.',
  mulch: 'Choose a planted cell to mulch for this season and next-season carry-forward.',
  companion_patch: 'Choose a planted cell to patch with an adjacency bonus.',
  prune: 'Choose a planted cell to remove from the bed.',
  swap: 'Choose the first planted cell to swap.',
};

const SEASON_ICONS = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };
const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
const DEFAULT_TOOLS = [
  { id: 'hand', label: 'Hand', icon: '✋', shortcut: '1' },
  { id: 'water', label: 'Water', icon: '💧', shortcut: '2' },
  { id: 'plant', label: 'Plant', icon: '🌱', shortcut: '3' },
  { id: 'harvest', label: 'Harvest', icon: '🌾', shortcut: '4' },
  { id: 'protect', label: 'Protect', icon: '🛡️', shortcut: '5' },
  { id: 'mulch', label: 'Mulch', icon: '🍂', shortcut: '6' },
];
const ZONE_NAMES = {
  player_plot: 'Player Plot',
  neighborhood: 'Neighborhood',
  meadow: 'Meadow',
  riverside: 'Riverside',
  forest_edge: 'Forest Edge',
  greenhouse: 'Greenhouse',
  festival_grounds: 'Festival Grounds',
  market_square: 'Market Square',
};
const WORLD_ZONE_INTERACTABLES = {
  player_plot: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Neighborhood Gate', position: { x: 0, y: 0, z: -3.2 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.5, y: 0, z: 1.4 }, radius: 1.1 },
    { id: 'travel_forest_edge', zoneId: 'forest_edge', label: 'Forest Trail', position: { x: 4.8, y: 0, z: 1.6 }, radius: 1.1 },
    { id: 'travel_riverside', zoneId: 'riverside', label: 'Riverside Path', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  neighborhood: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Backyard Gate', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_market_square', zoneId: 'market_square', label: 'Market Lane', position: { x: 4.7, y: 0, z: 0.8 }, radius: 1.1 },
    { id: 'travel_greenhouse', zoneId: 'greenhouse', label: 'Greenhouse Walk', position: { x: -3.8, y: 0, z: -2.4 }, radius: 1.1 },
    { id: 'travel_festival_grounds', zoneId: 'festival_grounds', label: 'Festival Route', position: { x: -4.5, y: 0, z: 2.4 }, radius: 1.1 },
  ],
  meadow: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_forest_edge', zoneId: 'forest_edge', label: 'Forest Trail', position: { x: 4.8, y: 0, z: 0.9 }, radius: 1.1 },
  ],
  riverside: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.2, y: 0, z: 0.8 }, radius: 1.1 },
  ],
  forest_edge: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.2, y: 0, z: 0.8 }, radius: 1.1 },
  ],
  greenhouse: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  festival_grounds: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  market_square: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
};

function hasKeepsake(campaign, keepsakeId) {
  return Array.isArray(campaign.keepsakes) && campaign.keepsakes.some((entry) => entry.id === keepsakeId);
}

function getRowAverages(cellScores, rowCount = 4, colCount = 8) {
  const rows = Array.from({ length: rowCount }, () => ({ total: 0, count: 0 }));
  cellScores.forEach((cellScore, index) => {
    if (!cellScore) return;
    const row = Math.floor(index / colCount);
    rows[row].total += cellScore.total ?? 0;
    rows[row].count += 1;
  });
  return rows.map((row) => (row.count > 0 ? row.total / row.count : 0));
}

function getYearForChapter(chapter) {
  return Math.floor((chapter - 1) / 4) + 1;
}

function isLetItGrowInteractionMode(state) {
  if (state?.campaign?.sandbox) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'let-it-grow') return true;
  if (params.get('let-it-grow') === '1') return true;
  if (params.get('proximity') === '1') return true;
  return window.localStorage?.getItem('garden-os:let-it-grow-mode') === '1';
}

function bindUI({
  store,
  data,
  scene,
  inputManager,
  viewport,
  slot,
  destroyInit,
  remount,
}) {
  const {
    getCropById,
    getCropsForChapter,
    getRecipeById,
    getRecipes,
    getKeepsakeById,
    getKeepsakeSlots,
  } = data;

  inputManager.registerAction('cancel', { keys: ['Escape'] });
  inputManager.registerAction('pause', { keys: ['Escape'] });
  inputManager.registerAction('cutscene_next', { keys: ['Enter', 'Space'] });
  inputManager.registerAction('advance', { keys: ['Enter'] });
  inputManager.registerAction('toggle_palette', { keys: ['p'] });
  inputManager.registerAction('toggle_backpack', { keys: ['b'] });
  inputManager.registerAction('select_cell', { keys: ['Enter', 'Space'], pointer: true, touch: true });
  inputManager.registerAction('next_tool', { keys: ['Tab', ']'] });
  inputManager.registerAction('prev_tool', { keys: ['Shift+Tab', '['] });
  inputManager.registerAction('move_up', { keys: ['w', 'ArrowUp'] });
  inputManager.registerAction('move_down', { keys: ['s', 'ArrowDown'] });
  inputManager.registerAction('move_left', { keys: ['a', 'ArrowLeft'] });
  inputManager.registerAction('move_right', { keys: ['d', 'ArrowRight'] });

  inputManager.onPointerMove(({ position }) => {
    if (isProximityInteractionEnabled()) {
      scene.clearPointerHover();
      return;
    }
    scene.updatePointer(position);
  });
  inputManager.onPointerLeave(() => {
    scene.clearPointerHover();
  });

  const calendarEl = createSeasonCalendar();
  document.getElementById('app')?.appendChild(calendarEl);

  const hudChapter = document.getElementById('hud-chapter');
  const hudPhase = document.getElementById('hud-phase');
  const hudAction = document.getElementById('hud-action');
  const hudCrops = document.getElementById('hud-crops');
  const hudScore = document.getElementById('hud-score');
  const phaseHelper = document.getElementById('phase-helper');
  const panelContainer = document.getElementById('panel-container');
  const phaseDots = document.getElementById('phase-dots');
  const toastContainer = document.getElementById('toast-container');
  const fab = document.getElementById('fab-advance');
  const fabPlant = document.getElementById('fab-plant');
  const fabBackpack = document.getElementById('fab-backpack');
  const dialogueRoot = document.getElementById('dialogue-root');
  const cutsceneLayer = document.getElementById('cutscene-layer');
  const pauseOverlay = document.getElementById('pause-menu');
  const pauseStatus = document.getElementById('pause-status');
  const pauseContainer = document.getElementById('panel-container');
  const fabBug = document.getElementById('fab-bug');
  const bugPanel = document.getElementById('bug-panel');
  const bugText = document.getElementById('bug-text');
  const bugMeta = document.getElementById('bug-meta');
  const bugSend = document.getElementById('bug-send');
  const bugCancel = document.getElementById('bug-cancel');

  let backpackOpen = false;
  let cropPaletteOpen = false;
  let gameInputEnabled = true;
  let holdTimer = null;
  let interventionTargetState = null;
  let pauseMenuOpen = false;
  let fabWasVisible = false;
  let fabPlantWasVisible = false;

  let state = store.getState();
  const unsubscribeState = store.subscribe((nextState) => {
    state = nextState;
  });
  const playerController = createPlayerController();
  const touchStick = createTouchStick();
  touchStick.mount(document.getElementById('app'));
  const letItGrowInteractionMode = isLetItGrowInteractionMode(state);
  const toolHUD = letItGrowInteractionMode
    ? new ToolHUD(document.getElementById('app'), inputManager, store)
    : null;
  if (toolHUD) {
    toolHUD.setTools(DEFAULT_TOOLS);
    toolHUD.selectTool('hand');
    toolHUD.setVisible(false);
  }

  const interactionPrompt = createInteractionPrompt({
    container: viewport,
    onActivate: () => {
      if (interactionSystem.interactHighlighted({ source: 'prompt' })) {
        syncInteractionPresentation();
      }
    },
  });

  const dialoguePanel = createDialoguePanel(dialogueRoot);
  let phaseRouter = null;

  function dispatch(action) {
    return store.dispatch(action);
  }

  function produceState(type, producer, extraPayload = {}, meta = {}) {
    const draft = cloneGameState(state);
    const result = producer(draft);
    dispatch({
      type,
      payload: {
        ...extraPayload,
        state: draft,
      },
      meta,
    });
    return result;
  }

  const cutsceneMachine = createCutsceneMachine({
    onStateChange: (uiState) => {
      dialoguePanel.render(uiState);
      cutsceneLayer?.setAttribute('aria-hidden', uiState.visible ? 'false' : 'true');
      phaseDots?.classList.toggle('is-cutscene', uiState.visible);
      scene.setScenePhase?.(uiState.visible ? 'CUTSCENE' : state.season.phase);
    },
    onFinish: () => {
      dialoguePanel.hide();
      cutsceneLayer?.setAttribute('aria-hidden', 'true');
      phaseDots?.classList.remove('is-cutscene');
      scene.setScenePhase?.(state.season.phase, { force: true });
      phaseRouter?.onCutsceneFinish();
    },
    onEffect: (effect) => {
      if (!effect?.action) return;
      dispatch({
        type: effect.action,
        payload: effect.payload ?? {},
      });
    },
    gardenScene: scene,
  });
  dialoguePanel.setChoiceHandler((index) => cutsceneMachine.selectChoice(index));
  const inventory = new Inventory(store);
  const skillSystem = new SkillSystem(store);
  const reputationSystem = new ReputationSystem(store);
  const questEngine = new QuestEngine(store);
  const festivalEngine = new FestivalEngine(store);
  const craftingSystem = new CraftingSystem(store, inventory, skillSystem);
  const foragingSystem = new ForagingSystem(store, inventory, skillSystem);
  let registeredWorldInteractableIds = [];

  function getCurrentZoneId() {
    return state.campaign.worldState?.currentZone ?? 'player_plot';
  }

  function getCurrentZoneName() {
    return ZONE_NAMES[getCurrentZoneId()] ?? 'Unknown Zone';
  }

  function getZoneTravelSummary(currentState = state) {
    const systems = { reputationSystem, skillSystem, questEngine, festivalEngine };
    const exits = WORLD_ZONE_INTERACTABLES[getCurrentZoneId()] ?? [];
    const available = exits.filter((entry) => (
      evaluateZoneAccess(entry.zoneId, currentState, systems).allowed
    )).length;
    return {
      total: exits.length,
      available,
    };
  }

  function getForagingSummary(currentState = state) {
    const spots = foragingSystem.getForagingSpots(currentState.campaign.worldState?.currentZone ?? 'player_plot');
    return {
      total: spots.length,
      available: spots.filter((spot) => spot.available).length,
    };
  }

  function getZoneBlockerText(blocker) {
    if (!blocker) return 'Locked';
    if (blocker.type === 'skill') {
      return `Need ${blocker.requirement.replace(' level', '')} ${blocker.needed}`;
    }
    if (blocker.type === 'reputation') {
      return `Need ${blocker.needed}+ rep`;
    }
    if (blocker.type === 'quest') {
      return 'Quest locked';
    }
    if (blocker.type === 'festival') {
      return 'Festival only';
    }
    return blocker.message ?? 'Locked';
  }

  function syncWorldInteractables() {
    registeredWorldInteractableIds.forEach((id) => interactionSystem.unregisterInteractable(id));
    registeredWorldInteractableIds = [];

    const currentZone = getCurrentZoneId();
    const systems = { reputationSystem, skillSystem, questEngine, festivalEngine };
    const exits = WORLD_ZONE_INTERACTABLES[currentZone] ?? [];
    exits.forEach((entry) => {
      const interactableId = `zone:${entry.id}`;
      interactionSystem.registerInteractable(interactableId, {
        position: entry.position,
        radius: entry.radius ?? 1,
        label: (currentState) => {
          const check = evaluateZoneAccess(entry.zoneId, currentState, systems);
          return check.allowed
            ? `Travel: ${ZONE_NAMES[entry.zoneId] ?? entry.zoneId}`
            : getZoneBlockerText(check.blockers[0]);
        },
        onInteract: () => {
          const check = evaluateZoneAccess(entry.zoneId, state, systems);
          if (!check.allowed) {
            showToast(check.blockers[0]?.message ?? 'That area is still locked.', 2200, 'info');
            return;
          }
          dispatch({
            type: Actions.ZONE_CHANGED,
            payload: { fromZone: currentZone, toZone: entry.zoneId, spawnPoint: entry.position },
          });
          showToast(`Entered ${ZONE_NAMES[entry.zoneId] ?? entry.zoneId}.`, 1800, 'success');
          updateHUD();
          persistState();
        },
      });
      registeredWorldInteractableIds.push(interactableId);
    });

    foragingSystem.getForagingSpots(currentZone).forEach((spot) => {
      const interactableId = `forage:${spot.id}`;
      interactionSystem.registerInteractable(interactableId, {
        position: { ...spot.position, y: 0 },
        radius: 1,
        label: () => (
          spot.available
            ? `Forage ${spot.type.replace(/_/g, ' ')}`
            : `Recovering ${Math.ceil(spot.cooldownRemaining / 1000)}s`
        ),
        onInteract: () => {
          const result = foragingSystem.forage(spot.id);
          if (!result.success) {
            showToast(result.message, 1800, 'info');
            return;
          }
          const summary = result.items.map((entry) => `${entry.count}x ${getItemDef(entry.itemId).name}`).join(', ');
          showToast(summary ? `Foraged ${summary}` : result.message, 2200, 'success');
          updateHUD();
          persistState();
        },
      });
      registeredWorldInteractableIds.push(interactableId);
    });
  }

  function setGameInputEnabled(enabled) {
    gameInputEnabled = enabled;
    if (fab) {
      fab.disabled = !enabled;
      fab.classList.toggle('is-disabled', !enabled);
    }
    syncToolHUDVisibility();
  }

  function canMovePlayer() {
    return gameInputEnabled && !pauseMenuOpen && !cutsceneMachine.isActive() && !interventionTargetState;
  }

  function isProximityInteractionEnabled() {
    return letItGrowInteractionMode
      && canMovePlayer()
      && state.season.phase === PHASES.PLANNING;
  }

  function shouldShowToolHUD() {
    return Boolean(
      toolHUD
      && letItGrowInteractionMode
      && gameInputEnabled
      && !pauseMenuOpen
      && !cutsceneMachine.isActive()
      && !interventionTargetState
      && !backpackOpen
      && !cropPaletteOpen
      && state.season.phase === PHASES.PLANNING
    );
  }

  function getSelectedTool() {
    return toolHUD?.getSelectedTool() ?? null;
  }

  function getSelectedToolId() {
    return getSelectedTool()?.id ?? null;
  }

  function syncPlayerTool() {
    scene.setPlayerTool?.(getSelectedToolId() ?? 'hand');
  }

  function syncToolHUDVisibility() {
    toolHUD?.setVisible(shouldShowToolHUD());
  }

  function getMovementVector() {
    let x = 0;
    let z = 0;
    if (inputManager.isKeyHeld('a') || inputManager.isKeyHeld('ArrowLeft')) x -= 1;
    if (inputManager.isKeyHeld('d') || inputManager.isKeyHeld('ArrowRight')) x += 1;
    if (inputManager.isKeyHeld('w') || inputManager.isKeyHeld('ArrowUp')) z -= 1;
    if (inputManager.isKeyHeld('s') || inputManager.isKeyHeld('ArrowDown')) z += 1;

    const stick = touchStick.getVector();
    if (stick.active) {
      const stickMagnitude = Math.hypot(stick.x, stick.y);
      const keyMagnitude = Math.hypot(x, z);
      if (stickMagnitude >= keyMagnitude) {
        x = stick.x;
        z = stick.y;
      }
    }

    return { x, z };
  }

  function getCellInteractionLabel(cellIndex) {
    const cell = state.season.grid[cellIndex];
    if (!cell || state.season.phase !== PHASES.PLANNING) {
      return 'Interact';
    }

    const activeTool = getSelectedTool();
    if (activeTool) {
      const availability = canUseTool(state, activeTool.id, cellIndex);
      if (!availability.valid) {
        return availability.reason || `Can't use ${activeTool.label} here`;
      }
      if (activeTool.id === 'plant' && state.selectedCropId) {
        const selectedCrop = getCropById(state.selectedCropId);
        return `Plant ${selectedCrop?.name ?? 'crop'}`;
      }
      return activeTool.label;
    }

    if (cell.cropId && !state.selectedCropId) {
      return 'Remove crop';
    }
    if (state.selectedCropId) {
      const crop = getCropById(state.selectedCropId);
      return crop ? `Plant ${crop.name}` : 'Plant crop';
    }
    return cropPaletteOpen ? 'Choose crop' : 'Open seed kit';
  }

  const interactionSystem = new InteractionSystem(
    store,
    inputManager,
    playerController,
    scene.getGridLayout?.() ?? [],
    {
      getCellLabel: (cellIndex) => getCellInteractionLabel(cellIndex),
      onInteractCell: ({ cellIndex, source }) => handleCellInteraction(cellIndex, source),
    },
  );
  syncWorldInteractables();

  function syncInteractionPresentation() {
    const highlighted = interactionSystem.getHighlighted();
    if (!highlighted || !isProximityInteractionEnabled()) {
      scene.clearInteractionHighlight?.();
      interactionPrompt.hide();
      return;
    }

    if (highlighted.type === 'cell') {
      scene.setInteractionHighlight?.(highlighted.index, highlighted.pulse ?? 0.3);
    } else {
      scene.clearInteractionHighlight?.();
    }

    const projected = scene.projectWorldPosition?.(highlighted.anchor ?? highlighted.position);
    if (!projected?.visible) {
      interactionPrompt.hide();
      return;
    }

    interactionPrompt.update({
      x: projected.x,
      y: projected.y,
      label: highlighted.label,
      visible: true,
    });
  }

  function showToast(message, durationMs = 2200, variant = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification toast--${variant}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  function triggerScreenShake() {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('is-shaking');
    void app.offsetWidth;
    app.classList.add('is-shaking');
    setTimeout(() => app.classList.remove('is-shaking'), 250);
  }

  function awardCampaignKeepsake(keepsakeId, meta = {}) {
    if (hasKeepsake(state.campaign, keepsakeId)) return null;
    const awarded = {
      id: keepsakeId,
      earnedAt: new Date().toISOString(),
      chapter: state.campaign.currentChapter,
      season: state.season.season,
      ...meta,
    };
    dispatch({
      type: Actions.AWARD_KEEPSAKE,
      payload: { awarded },
    });
    const keepsake = getKeepsakeById(keepsakeId);
    if (keepsake) {
      showToast(`Keepsake earned: ${keepsake.name}`, 2600);
    }
    return awarded;
  }

  function persistState() {
    if (!hasKeepsake(state.campaign, 'first_seed_packet')) {
      awardCampaignKeepsake('first_seed_packet');
    }
    saveCampaign(state.campaign, slot);
    saveSeasonState(state.season, slot);
  }

  function finalizeHarvestProgression() {
    const awardedKeepsakes = produceState(Actions.REPLACE_STATE, (draft) => {
      const result = draft.season.harvestResult;
      if (!result) return [];

      const awarded = [];
      draft.season.newlyEarnedKeepsakes = [];

      for (const cropId of result.yieldList ?? []) {
        draft.campaign.pantry[cropId] = (draft.campaign.pantry[cropId] ?? 0) + 1;
      }

      for (const recipeId of result.recipeMatches ?? []) {
        if (!draft.campaign.recipesCompleted.includes(recipeId)) {
          draft.campaign.recipesCompleted.push(recipeId);
        }
      }

      const queueKeepsake = (keepsakeId, meta = {}) => {
        if (hasKeepsake(draft.campaign, keepsakeId)) return;
        const nextAwarded = {
          id: keepsakeId,
          earnedAt: new Date().toISOString(),
          chapter: draft.campaign.currentChapter,
          season: draft.season.season,
          ...meta,
        };
        draft.campaign.keepsakes.push(nextAwarded);
        draft.season.newlyEarnedKeepsakes.push(nextAwarded);
        awarded.push(nextAwarded);
      };

      if (draft.campaign.currentChapter === 8) {
        queueKeepsake('the_photo');
      }

      if (
        (result.recipeMatches ?? []).includes('moms_sauce')
        && draft.campaign.currentChapter >= 11
      ) {
        queueKeepsake('handwritten_sauce_card', { recipeId: 'moms_sauce' });
      }

      const lastEvent = draft.season.lastResolvedEvent;
      const eventSummary = draft.season.lastEventEffectSummary;

      if (
        lastEvent
        && /block party/i.test(`${lastEvent.title} ${lastEvent.description}`)
        && (result.recipeMatches?.length ?? 0) > 0
      ) {
        queueKeepsake('block_party_plate', { recipeId: result.recipeMatches[0] });
      }

      if (
        lastEvent
        && /frost/i.test(`${lastEvent.title} ${lastEvent.description}`)
        && (eventSummary?.negativeAffectedCount ?? 0) > 0
      ) {
        queueKeepsake('first_frost_marker', { eventId: lastEvent.id, eventTitle: lastEvent.title });
      }

      const rowAverages = getRowAverages(result.cellScores);
      const hadGardenFailure = rowAverages.some((avg) => avg > 0 && avg < 3);
      if (
        lastEvent
        && /phillies/i.test(`${lastEvent.title} ${lastEvent.description}`)
        && lastEvent.valence !== 'positive'
        && hadGardenFailure
      ) {
        queueKeepsake('onion_mans_scorecard', { eventId: lastEvent.id, eventTitle: lastEvent.title });
      }

      return awarded;
    });

    for (const awarded of awardedKeepsakes ?? []) {
      const keepsake = getKeepsakeById(awarded.id);
      if (keepsake) {
        showToast(`Keepsake earned: ${keepsake.name}`, 2600);
      }
    }
  }

  function updatePhaseDots() {
    if (!phaseDots) return;
    const currentIndex = PHASE_ORDER.indexOf(state.season.phase);
    phaseDots.innerHTML = PHASE_ORDER.map((phase, index) => {
      let cls = 'phase-dot';
      if (index < currentIndex) cls += ' phase-dot--done';
      else if (index === currentIndex) cls += ' phase-dot--active';
      return `<span class="${cls}" title="${getPhaseLabel(phase)}"></span>`;
    }).join('');
  }

  function getAdvanceLabel() {
    if (state.season.season === 'winter') return 'Continue';
    switch (state.season.phase) {
      case PHASES.PLANNING:
        return 'Start Season';
      case PHASES.TRANSITION:
        return 'Continue';
      case PHASES.LATE_SEASON:
        return canAdvance(state.season) ? 'Harvest' : 'Next';
      default:
        return 'Next';
    }
  }

  function pulseOnEnter(element, wasVisible) {
    if (!element || wasVisible) return;
    element.classList.remove('is-entering');
    void element.offsetWidth;
    element.classList.add('is-entering');
    setTimeout(() => element.classList.remove('is-entering'), 700);
  }

  function closePalette() {
    const sheet = panelContainer?.querySelector('#crop-palette-panel');
    if (sheet) {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    }
    cropPaletteOpen = false;
    syncToolHUDVisibility();
  }

  function closeBackpackPanel() {
    const sheet = panelContainer?.querySelector('#backpack-panel');
    if (sheet) {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    }
    backpackOpen = false;
    fabBackpack?.classList.remove('is-open');
    syncToolHUDVisibility();
  }

  function closePanelSheets() {
    if (panelContainer) {
      panelContainer.innerHTML = '';
    }
    cropPaletteOpen = false;
    backpackOpen = false;
    fabBackpack?.classList.remove('is-open');
    if (!interventionTargetState) {
      scene.clearTargeting?.();
    }
    syncToolHUDVisibility();
  }

  function clearInterventionTargeting() {
    interventionTargetState = null;
    scene.clearTargeting?.();
    panelContainer?.querySelector('#intervention-target-panel')?.remove();
  }

  function updateFAB() {
    if (!fab) return;
    if (!gameInputEnabled || cutsceneMachine.isActive() || interventionTargetState) {
      fab.classList.remove('is-visible');
      fabWasVisible = false;
      if (fabPlant) {
        fabPlant.classList.remove('is-visible');
        fabPlantWasVisible = false;
      }
      fabBackpack?.classList.add('is-hidden');
      return;
    }

    if (canAdvance(state.season)) {
      const wasVisible = fabWasVisible;
      fab.classList.add('is-visible');
      fab.textContent = getAdvanceLabel();
      pulseOnEnter(fab, wasVisible);
      fabWasVisible = true;
    } else {
      fab.classList.remove('is-visible');
      fabWasVisible = false;
    }

    if (fabPlant) {
      if (state.season.phase === PHASES.PLANNING) {
        const wasVisible = fabPlantWasVisible;
        fabPlant.classList.add('is-visible');
        pulseOnEnter(fabPlant, wasVisible);
        fabPlantWasVisible = true;
      } else {
        fabPlant.classList.remove('is-visible');
        fabPlantWasVisible = false;
        if (cropPaletteOpen) closePalette();
      }
    }

    fabBackpack?.classList.remove('is-hidden');
  }

  function getRotatedSeasonLabel(seasonId) {
    const order = ['spring', 'summer', 'fall', 'winter'];
    const index = order.indexOf(seasonId);
    const next = order[(index + 1) % order.length] ?? 'spring';
    return SEASON_LABELS[next];
  }

  function buildBackpackData() {
    const inventoryState = inventory.getState();
    const toolMap = {
      watering_can: 'water',
      smart_watering_can: 'water',
      pruning_shears: 'harvest',
      pest_spray: 'protect',
      mulch_bag: 'mulch',
      fertilizer_bag: 'mulch',
      soil_scanner: 'hand',
    };
    const unlockedKeepsakes = (state.campaign.keepsakes ?? []).map((entry) => ({
      ...entry,
      ...(getKeepsakeById(entry.id) ?? {}),
    }));
    const recipesCompleted = (state.campaign.recipesCompleted ?? [])
      .map((recipeId) => ({ id: recipeId, ...(getRecipeById(recipeId) ?? { name: recipeId }) }));
    const pantryEntries = Object.entries(state.campaign.pantry ?? {})
      .filter(([, count]) => count > 0)
      .map(([cropId, count]) => ({
        id: cropId,
        name: getCropById(cropId)?.name ?? cropId,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const availableRecipes = craftingSystem.getAvailableRecipes().map((recipe) => ({
      ...recipe,
      craftCheck: craftingSystem.canCraft(recipe.id),
      outputDef: getItemDef(recipe.output?.itemId),
    }));

    return {
      inventory: {
        slots: inventoryState.slots.map((slot, index) => (
          slot
            ? { ...slot, index, itemDef: getItemDef(slot.itemId) }
            : null
        )),
        capacity: inventoryState.capacity,
        tier: inventoryState.tier,
      },
      keepsakeSlots: getKeepsakeSlots(),
      unlockedKeepsakes,
      recipesCompleted,
      availableRecipes,
      totalRecipes: Object.keys(getRecipes()).length,
      pantryEntries,
      seasonHistory: state.campaign.seasonHistory ?? [],
      skills: {
        crafting: skillSystem.getProgress('crafting'),
      },
      getLatest: buildBackpackData,
      actions: {
        onMoveSlot(fromIndex, toIndex) {
          const result = inventory.moveSlot(fromIndex, toIndex);
          if (result.success) persistState();
          return result;
        },
        onSplitStack(fromIndex, count, toIndex) {
          const result = inventory.splitStack(fromIndex, count, toIndex);
          if (result.success) persistState();
          return result;
        },
        onDropItem(slotIndex, count = 1) {
          const slot = inventory.getSlots()[slotIndex];
          if (!slot) return { success: false };
          const result = inventory.removeItem(slot.itemId, count);
          if (result.removed) persistState();
          return result;
        },
        onUseItem(slotIndex) {
          const slot = inventory.getSlots()[slotIndex];
          if (!slot) return { success: false, message: 'Nothing selected.' };
          const itemDef = getItemDef(slot.itemId);
          if (itemDef.category === 'seeds' && itemDef.cropId) {
            store.dispatch({
              type: Actions.SET_SELECTED_CROP,
              payload: { cropId: itemDef.cropId },
            });
            persistState();
            return { success: true, message: `${itemDef.name} ready to plant.` };
          }
          const mappedTool = toolMap[slot.itemId];
          if (mappedTool) {
            toolHUD?.selectTool(mappedTool);
            syncPlayerTool();
            return { success: true, message: `${itemDef.name} equipped.` };
          }
          return { success: false, message: itemDef.description ?? 'No direct use.' };
        },
        onCraftRecipe(recipeId) {
          const result = craftingSystem.craft(recipeId);
          showToast(result.message, 1800, result.success ? 'success' : 'info');
          if (result.success) {
            updateHUD();
            persistState();
          }
          return result;
        },
      },
    };
  }

  function buildWinterReviewData() {
    const year = getYearForChapter(state.campaign.currentChapter);
    const review = state.campaign.lastSeasonReview ?? {
      score: 0,
      grade: '–',
      eventsEncountered: [],
      yieldList: [],
      bestCells: [],
      worstCells: [],
    };
    const yearEntries = (state.campaign.journalEntries ?? [])
      .filter((entry) => getYearForChapter(entry.chapter) === year)
      .sort((a, b) => a.chapter - b.chapter);

    const previousGrid = state.campaign.previousGrid ?? [];
    const soilCells = state.season.grid.map((cell, index) => {
      const previousCell = previousGrid[index] ?? null;
      const carryForwardType = previousCell?.carryForwardType ?? null;
      let carryForward = null;
      if (carryForwardType === 'mulched') {
        carryForward = { type: carryForwardType, label: 'Mulched carry-over · +0.25' };
      } else if (carryForwardType === 'compacted') {
        carryForward = { type: carryForwardType, label: 'Compacted carry-over · -0.50' };
      } else if (carryForwardType === 'enriched') {
        carryForward = { type: carryForwardType, label: 'Enriched carry-over · +0.30' };
      }
      return {
        index,
        soilFatigue: cell.soilFatigue ?? 0,
        carryForward,
      };
    });

    const maxFatigue = soilCells.reduce((max, cell) => Math.max(max, cell.soilFatigue), 0);
    const mulchedCount = soilCells.filter((cell) => cell.carryForward?.type === 'mulched').length;
    const compactedCount = soilCells.filter((cell) => cell.carryForward?.type === 'compacted').length;
    const enrichedCount = soilCells.filter((cell) => cell.carryForward?.type === 'enriched').length;
    const recipesCompleted = state.campaign.recipesCompleted?.length ?? 0;
    const totalRecipes = Object.keys(getRecipes()).length;
    const keepsakesUnlocked = state.campaign.keepsakes?.length ?? 0;
    const totalKeepsakes = getKeepsakeSlots().length;

    const decorateCells = (cells) => cells.map((cell) => ({
      ...cell,
      cropName: getCropById(cell.cropId)?.name ?? cell.cropId ?? 'Empty',
    }));

    const hints = [];
    if (maxFatigue >= 0.6) {
      hints.push('Several cells are heavily fatigued. Rotate heavy feeders out of the reddest spots next spring.');
    } else if (maxFatigue >= 0.3) {
      hints.push('A few cells are getting tired. Spread brassicas and fruiting crops around instead of repeating winners.');
    } else {
      hints.push('Soil fatigue is low. You have freedom to chase recipes without fighting the bed too hard.');
    }
    if (mulchedCount > 0) {
      hints.push(`${mulchedCount} cell${mulchedCount === 1 ? '' : 's'} carry mulch into the next season. Those are safe places to restart tender crops.`);
    }
    if (compactedCount > 0) {
      hints.push(`${compactedCount} compacted cell${compactedCount === 1 ? '' : 's'} need relief. Favor roots or low-demand crops there first.`);
    }
    if (enrichedCount > 0) {
      hints.push(`${enrichedCount} enriched cell${enrichedCount === 1 ? '' : 's'} are primed for a push. Save your hungriest crops for those pockets.`);
    }
    if ((review.recipeMatches?.length ?? 0) === 0 && recipesCompleted < totalRecipes) {
      hints.push('No recipe completed last season. Use the pantry list and your strongest cells to aim at one dish on purpose next year.');
    }
    if (!hints.length) {
      hints.push('Nothing urgent is flashing red. Winter is a clean read: preserve what worked and do not overreact.');
    }

    return {
      year,
      yearEntries,
      soilCells,
      lastReview: {
        ...review,
        bestCells: decorateCells(review.bestCells ?? []),
        worstCells: decorateCells(review.worstCells ?? []),
      },
      recipesCompleted,
      totalRecipes,
      keepsakesUnlocked,
      totalKeepsakes,
      hints,
    };
  }

  function showBackpack() {
    scene.clearTargeting?.();
    closePalette();
    showBackpackPanel(panelContainer, buildBackpackData(), () => {
      backpackOpen = false;
      fabBackpack?.classList.remove('is-open');
      syncToolHUDVisibility();
    });
    backpackOpen = true;
    fabBackpack?.classList.add('is-open');
    syncToolHUDVisibility();
  }

  function openWinterReviewOverlay() {
    setGameInputEnabled(false);
    scene.clearTargeting?.();
    closePanelSheets();
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer?.querySelector('#winter-review-overlay')?.remove();

    const mount = document.createElement('div');
    mount.id = 'winter-review-overlay';
    overlayContainer?.appendChild(mount);

    showWinterReview(mount, buildWinterReviewData(), {
      onViewBackpack: () => {
        showBackpack();
      },
      onContinue: () => {
        mount.remove();
        produceState(Actions.ADVANCE_PHASE, (draft) => {
          draft.season.winterReviewSeen = true;
          draft.season.phase = PHASES.TRANSITION;
        });
        updateHUD();
        persistState();
        setGameInputEnabled(true);
        openSeasonTransitionOverlay();
      },
    });
  }

  function getCellLabel(cellIndex) {
    const cols = state.season.gridCols ?? state.season.grid?.cols ?? 8;
    const row = Math.floor(cellIndex / cols) + 1;
    const col = (cellIndex % cols) + 1;
    return `R${row} · C${col}`;
  }

  function showInterventionTargetPrompt() {
    if (!interventionTargetState) return;
    const { interventionId, firstCell } = interventionTargetState;
    const secondStep = interventionId === 'swap' && firstCell >= 0;
    const validCells = getTargetableCells(state.season.grid, interventionId, firstCell);

    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open targeting-sheet';
    sheet.id = 'intervention-target-panel';
    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header">
        <div>
          <div class="palette-title">${INTERVENTION_LABELS[interventionId]}</div>
          <div class="targeting-hint">
            ${secondStep ? `Tap a highlighted neighbor to complete the swap for ${getCellLabel(firstCell)}.` : INTERVENTION_PROMPTS[interventionId]}
          </div>
        </div>
        <button type="button" class="palette-dismiss" id="target-cancel" aria-label="Cancel targeting">&times;</button>
      </div>
      <div class="targeting-chip-row">
        <span class="targeting-chip">${validCells.length} valid target${validCells.length === 1 ? '' : 's'}</span>
        <span class="targeting-chip">${secondStep ? 'Step 2 of 2' : interventionId === 'swap' ? 'Step 1 of 2' : 'Tap the bed'}</span>
      </div>
      <div class="targeting-actions">
        ${secondStep ? '<button type="button" id="target-back" class="start-choice-btn start-choice-btn--ghost">Back</button>' : ''}
        <button type="button" id="target-cancel-text" class="start-choice-btn start-choice-btn--ghost">Cancel</button>
      </div>
    `;

    sheet.addEventListener('click', (event) => {
      if (event.target.closest('#target-cancel') || event.target.closest('#target-cancel-text')) {
        clearInterventionTargeting();
        setGameInputEnabled(false);
        openEventCard();
        return;
      }

      if (event.target.closest('#target-back') && interventionTargetState?.interventionId === 'swap') {
        interventionTargetState.firstCell = -1;
        scene.setTargetableCells(getTargetableCells(state.season.grid, 'swap'));
        showInterventionTargetPrompt();
      }
    });

    if (panelContainer) {
      panelContainer.innerHTML = '';
      panelContainer.appendChild(sheet);
    }
  }

  function finalizeInterventionChoice(interventionId, targetA = -1, targetB = -1) {
    clearInterventionTargeting();
    const targetIndices = [targetA, targetB]
      .filter((index) => Number.isInteger(index) && index >= 0)
      .filter((index, position, indices) => indices.indexOf(index) === position);
    const targetCropNames = targetIndices
      .map((index) => getCropById(state.season.grid[index]?.cropId)?.name)
      .filter(Boolean);
    const resolvedEvent = produceState(Actions.USE_INTERVENTION, (draft) => {
      draft.season.interventionChosen = interventionId;
      if (interventionId !== 'accept_loss') {
        draft.season.interventionTokens = Math.max(0, draft.season.interventionTokens - 1);
      }

      applyIntervention(draft.season.grid, interventionId, targetA, targetB);

      const nextResolvedEvent = draft.season.eventActive ? { ...draft.season.eventActive } : null;
      draft.season.lastResolvedEvent = nextResolvedEvent;
      draft.season.lastEventEffectSummary = applyEventEffect(draft.season.grid, nextResolvedEvent);
      draft.season.eventActive = null;
      return nextResolvedEvent;
    });

    if (targetA >= 0) scene.flashCell(targetA, 0xe8c84a, 450);
    if (targetB >= 0) scene.flashCell(targetB, 0xe8c84a, 450);

    const targetSummary = interventionId === 'swap' && targetA >= 0 && targetB >= 0
      ? `${getCellLabel(targetA)} ↔ ${getCellLabel(targetB)}`
      : targetA >= 0
        ? getCellLabel(targetA)
        : '';

    showToast(
      interventionId === 'accept_loss'
        ? 'Accepted the loss'
        : `${INTERVENTION_LABELS[interventionId]}${targetSummary ? ` · ${targetSummary}` : ''}`,
      2200,
    );
    persistState();
    setGameInputEnabled(false);
    phaseRouter.handleNarrativeTrigger({
      type: 'intervention_used',
      intervention: interventionId,
      season: state.season.season,
      chapter: state.season.chapter,
      eventCategory: resolvedEvent?.category ?? null,
      eventValence: resolvedEvent?.valence ?? null,
      eventTitle: resolvedEvent?.title ?? null,
      targetSummary,
      targetCount: targetIndices.length,
      targetCropNames,
    });
    updateHUD();
  }

  function beginInterventionTargeting(interventionId) {
    const validCells = getTargetableCells(state.season.grid, interventionId);
    if (validCells.length === 0) {
      showToast(`No valid targets for ${INTERVENTION_LABELS[interventionId]}.`, 2000);
      setGameInputEnabled(false);
      openEventCard();
      return;
    }

    interventionTargetState = { interventionId, firstCell: -1 };
    scene.setTargetableCells(validCells);
    setGameInputEnabled(true);
    showInterventionTargetPrompt();
    showToast(
      interventionId === 'swap'
        ? 'Tap the first highlighted cell to start the swap.'
        : 'Tap a highlighted bed cell to apply the intervention.',
      2200,
    );
    updateHUD();
  }

  function handleInterventionTargetClick(cellIndex) {
    if (!interventionTargetState) return;
    const { interventionId, firstCell } = interventionTargetState;
    const validCells = getTargetableCells(state.season.grid, interventionId, firstCell);
    if (cellIndex < 0 || !validCells.includes(cellIndex)) {
      showToast('Choose a highlighted cell.', 1400);
      return;
    }

    if (interventionId === 'swap' && firstCell < 0) {
      interventionTargetState.firstCell = cellIndex;
      scene.setTargetableCells(getTargetableCells(state.season.grid, 'swap', cellIndex));
      scene.flashCell(cellIndex, 0x8ba8b5, 350);
      showInterventionTargetPrompt();
      showToast(`First swap cell locked: ${getCellLabel(cellIndex)}. Choose an adjacent partner.`, 2200);
      return;
    }

    finalizeInterventionChoice(interventionId, firstCell >= 0 ? firstCell : cellIndex, cellIndex);
  }

  function toggleBackpack() {
    if (interventionTargetState) return;
    if (backpackOpen) {
      closeBackpackPanel();
    } else {
      showBackpack();
      fabBackpack?.classList.add('is-open');
    }
  }

  function openEventCard() {
    if (!interventionTargetState) {
      scene.clearTargeting?.();
    }
    closePanelSheets();
    const event = state.season.eventActive;
    if (!event) {
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

    if (event.valence === 'negative') {
      triggerScreenShake();
    }

    showEventCard(panelContainer, event, state.season.interventionTokens, (interventionId) => {
      if (interventionId === 'accept_loss') {
        finalizeInterventionChoice(interventionId);
        return;
      }
      beginInterventionTargeting(interventionId);
    });
  }

  function openHarvestReveal() {
    scene.clearTargeting?.();
    closePanelSheets();
    if (!state.season.harvestResult) {
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

    hudScore?.classList.add('is-harvest-glow');

    finalizeHarvestProgression();
    showHarvestReveal(
      document.getElementById('overlay-container'),
      state.season.harvestResult,
      {
        keepsakes: state.season.newlyEarnedKeepsakes.map((entry) => getKeepsakeById(entry.id)).filter(Boolean),
        unlockedCount: state.campaign.keepsakes.length,
        totalKeepsakes: getKeepsakeSlots().length,
        recipeNames: (state.season.harvestResult.recipeMatches ?? [])
          .map((recipeId) => getRecipeById(recipeId)?.name ?? recipeId),
        onViewBackpack: () => {
          showBackpack();
          fabBackpack?.classList.add('is-open');
        },
      },
      () => {
        hudScore?.classList.remove('is-harvest-glow');

        persistState();

        if (state.season.phase === PHASES.HARVEST && canAdvance(state.season)) {
          const transitionResult = produceState(Actions.ADVANCE_PHASE, (draft) => advance(draft));
          updateHUD();
          persistState();

          if (transitionResult.advanced && transitionResult.trigger) {
            phaseRouter.handleNarrativeTrigger(transitionResult.trigger);
            return;
          }
        }

        setGameInputEnabled(true);
        updateHUD();
      },
    );
  }

  function openSeasonTransitionOverlay() {
    scene.clearTargeting?.();
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer?.querySelector('#season-transition-overlay')?.remove();

    const isSandbox = state.campaign?.sandbox;
    const nextChapter = state.campaign.currentChapter + 1;
    const campaignComplete = !isSandbox && nextChapter > 12;
    const nextSeasonLabel = getRotatedSeasonLabel(state.season.season);

    const overlay = document.createElement('div');
    overlay.className = 'chapter-intro';
    overlay.id = 'season-transition-overlay';
    overlay.innerHTML = `
      <div class="chapter-num">Season Complete</div>
      <h2>${campaignComplete ? 'The Garden Stays' : isSandbox ? 'Season Complete' : `Chapter ${state.campaign.currentChapter} Complete`}</h2>
      <p>
        ${campaignComplete
          ? 'You have reached the end of the current campaign. Continue to view the closing season.'
          : isSandbox
            ? `${SEASON_LABELS[state.season.season]} is finished. Continue into ${nextSeasonLabel}.`
            : state.season.season === 'winter'
              ? `Winter review is complete. Continue into Chapter ${nextChapter} and ${nextSeasonLabel}.`
              : `Late ${SEASON_LABELS[state.season.season]} is finished. Continue into Chapter ${nextChapter} and ${nextSeasonLabel}.`}
      </p>
      <div class="tap-hint" style="margin-top:20px;margin-bottom:10px;">
        ${campaignComplete ? 'Tap continue for the ending' : 'Tap continue to roll into the next season'}
      </div>
      <div class="start-choice-actions">
        <button type="button" class="start-choice-btn start-choice-btn--primary" id="season-transition-continue">
          ${campaignComplete ? 'Continue' : isSandbox ? `Continue to ${nextSeasonLabel}` : `Continue to Chapter ${nextChapter}`}
        </button>
      </div>
    `;

    overlay.querySelector('#season-transition-continue')?.addEventListener('click', () => {
      overlay.style.animation = 'fadeOutIntro 0.25s ease-in both';
      setTimeout(() => {
        overlay.remove();
        setGameInputEnabled(true);
        phaseRouter.doAdvance();
      }, 220);
    });

    overlayContainer?.appendChild(overlay);
  }

  function showEndGameOverlay() {
    const overlayContainer = document.getElementById('overlay-container');
    const overlay = document.createElement('div');
    overlay.className = 'chapter-intro';
    overlay.innerHTML = `
      <div class="chapter-num">Garden OS</div>
      <h2>The Garden Stays</h2>
      <p>All 12 chapters complete. Your garden has grown through every season.</p>
      <div class="start-choice-actions">
        <button type="button" class="start-choice-btn start-choice-btn--primary" id="btn-endgame-close">Close</button>
      </div>
    `;
    overlay.querySelector('#btn-endgame-close')?.addEventListener('click', () => {
      overlay.remove();
      setGameInputEnabled(true);
    });
    overlayContainer?.appendChild(overlay);
  }

  function updateHUD() {
    scene.setScenePhase?.(cutsceneMachine.isActive() ? 'CUTSCENE' : state.season.phase);
    syncWorldInteractables();

    syncToolHUDVisibility();

    if (hudChapter) hudChapter.textContent = state.campaign?.sandbox ? 'Free Play' : `Ch ${state.campaign.currentChapter}`;
    if (hudPhase) hudPhase.textContent = getPhaseLabel(state.season.phase);
    const planted = state.season.grid.filter((cell) => cell.cropId !== null).length;
    if (hudCrops) hudCrops.textContent = `${planted} / ${state.season.grid.length}`;

    const scoreResult = state.season.harvestResult
      ?? scoreBed(state.season.grid, state.season.siteConfig, state.season.season, state.campaign.pantry);
    if (hudScore) hudScore.textContent = scoreResult.score > 0 ? String(scoreResult.score) : '--';

    if (hudAction) {
      const visible = gameInputEnabled && !cutsceneMachine.isActive() && !interventionTargetState && canAdvance(state.season);
      hudAction.textContent = getAdvanceLabel();
      hudAction.disabled = !visible;
      hudAction.classList.toggle('is-visible', visible);
    }

    const seasonIcon = document.getElementById('hud-season-icon');
    if (seasonIcon) seasonIcon.textContent = SEASON_ICONS[state.season.season] || '🌱';

    const inBeatPhase = [PHASES.EARLY_SEASON, PHASES.MID_SEASON, PHASES.LATE_SEASON].includes(state.season.phase);
    if (inBeatPhase && state.season.eventActive && state.season.interventionChosen === null && gameInputEnabled && !cutsceneMachine.isActive()) {
      const existingCard = panelContainer?.querySelector('.event-card-sheet');
      if (!existingCard) {
        openEventCard();
      }
    }

    const tokensEl = document.getElementById('hud-tokens');
    if (tokensEl) {
      const inBeat = [PHASES.EARLY_SEASON, PHASES.MID_SEASON, PHASES.LATE_SEASON].includes(state.season.phase);
      tokensEl.style.display = inBeat ? '' : 'none';
      if (inBeat) {
        const remaining = state.season.interventionTokens ?? 0;
        tokensEl.innerHTML = Array.from({ length: 3 }, (_, index) =>
          `<span class="token-dot${index >= remaining ? ' spent' : ''}"></span>`
        ).join('');
      }
    }

    if (phaseHelper) {
      const isWinter = state.season.season === 'winter';
      let helperText = '';

      if (state.season.phase === PHASES.PLANNING) {
        if (isWinter) {
          helperText = state.season.winterReviewSeen
            ? 'Winter review complete. Continue to roll into the next chapter.'
            : 'Winter chapter. Review the year, the soil, and the carry-forward before spring returns.';
        } else if (!state.campaign?.sandbox && planted < 8) {
          helperText = `${planted} / 8 crops planted — fill the bed to begin the season.`;
        } else {
          helperText = 'Bed is ready. Tap Commit Plan to begin Early Season.';
        }
      } else if (state.season.phase === PHASES.TRANSITION) {
        helperText = 'Season complete. Use Continue to roll into the next chapter.';
      }

      if (letItGrowInteractionMode && state.season.phase === PHASES.PLANNING) {
        const routes = getZoneTravelSummary();
        const foraging = getForagingSummary();
        const zonePrefix = `Zone: ${getCurrentZoneName()} · Paths ${routes.available}/${routes.total}${foraging.total ? ` · Forage ${foraging.available}/${foraging.total}` : ''}.`;
        helperText = helperText ? `${zonePrefix} ${helperText}` : zonePrefix;
      }

      phaseHelper.textContent = helperText;
      phaseHelper.classList.toggle('is-visible', Boolean(helperText) && gameInputEnabled && !cutsceneMachine.isActive());
    }

    updatePhaseDots();
    updateFAB();
    updateSeasonCalendar(state);
  }

  function showCropPalette() {
    scene.clearTargeting?.();
    closeBackpackPanel();
    if (toolHUD && letItGrowInteractionMode) {
      toolHUD.selectTool('plant');
      syncPlayerTool();
    }
    const crops = getCropsForChapter(state.campaign.currentChapter);
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'crop-palette-panel';
    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header">
        <div class="palette-title">Select Crop</div>
        <button type="button" class="palette-dismiss" id="palette-dismiss" aria-label="Dismiss crop palette">&times;</button>
      </div>
      <div class="palette-grid">
        ${crops.map((crop) => {
          const badgeColor = FACTION_BADGE_COLORS[crop.faction] || '#888';
          const badgeName = FACTION_NAMES[crop.faction] || crop.faction;
          const selected = state.selectedCropId === crop.id;
          const fit = crop.seasonalMultipliers?.[state.season.season] ?? 0;
          const fitLabel = fit >= 0.8 ? 'Great fit' : fit >= 0.5 ? 'OK fit' : 'Poor fit';
          const fitClass = fit >= 0.8 ? 'palette-fit--great' : fit >= 0.5 ? 'palette-fit--ok' : 'palette-fit--poor';
          return `
            <button type="button" class="palette-item ${selected ? 'is-selected' : ''}" data-crop="${crop.id}" aria-label="${crop.name}, ${badgeName}, ${fitLabel}">
              <div class="palette-emoji">${crop.emoji}</div>
              <div class="palette-name">${crop.name}</div>
              <span class="palette-badge" style="--badge-color:${badgeColor};">${badgeName}</span>
              <span class="palette-fit ${fitClass}">${fitLabel}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    sheet.addEventListener('click', (event) => {
      if (event.target.closest('#palette-dismiss')) {
        closePalette();
        return;
      }

      const cropButton = event.target.closest('[data-crop]');
      if (!cropButton) return;
      dispatch({
        type: Actions.SET_SELECTED_CROP,
        payload: { cropId: cropButton.dataset.crop },
        meta: { persist: false },
      });
      closePalette();
    });

    if (panelContainer) {
      panelContainer.innerHTML = '';
      panelContainer.appendChild(sheet);
    }
    cropPaletteOpen = true;
    syncToolHUDVisibility();
  }

  phaseRouter = createPhaseRouter({
    getState: () => state,
    isGameInputEnabled: () => gameInputEnabled,
    produceState,
    cutsceneMachine,
    clearSceneTargeting: () => {
      if (!interventionTargetState) {
        scene.clearTargeting?.();
      }
    },
    setGameInputEnabled,
    showToast,
    updateHUD,
    persistState,
    openEventCard,
    openHarvestReveal,
    openSeasonTransitionOverlay,
    openWinterReviewOverlay,
    showEndGameOverlay,
  });

  function handleEquippedToolInteraction(cellIndex) {
    const activeToolId = getSelectedToolId();
    if (!activeToolId || cellIndex < 0) {
      return false;
    }

    const beforeState = store.getState();
    const beforeCell = beforeState.season.grid[cellIndex];
    const beforeCropId = beforeCell?.cropId ?? null;
    const result = executeToolAction(store, activeToolId, cellIndex);

    if (result.action === 'open_crop_picker') {
      showCropPalette();
      return true;
    }

    if (!result.success) {
      if (result.message) {
        showToast(result.message, 1500);
      }
      return false;
    }

    if (result.message && activeToolId !== 'plant') {
      showToast(result.message, activeToolId === 'plant' ? 1600 : 1700, result.action === 'inspect' ? 'info' : 'success');
    }

    if (activeToolId === 'water') {
      scene.flashCell(cellIndex, 0x4f8fca, 320);
    } else if (activeToolId === 'harvest') {
      scene.flashCell(cellIndex, 0xd0b24a, 320);
    } else if (activeToolId === 'protect') {
      scene.flashCell(cellIndex, 0x88a1d8, 320);
    } else if (activeToolId === 'mulch') {
      scene.flashCell(cellIndex, 0x8b5d2c, 320);
    } else {
      scene.flashCell(cellIndex, 0xe8c84a, 260);
    }

    if (activeToolId === 'plant' && beforeCropId == null && state.selectedCropId) {
      const cropInfo = getCropById(state.selectedCropId);
      if (cropInfo) {
        showToast(`${cropInfo.emoji} ${cropInfo.name} planted`, 1600, 'success');
      }
      if (
        cellIndex === 0
        && state.campaign.currentChapter === 1
        && !hasKeepsake(state.campaign, 'moms_trowel')
      ) {
        awardCampaignKeepsake('moms_trowel', { cellIndex, cropId: state.selectedCropId });
      }
    }

    return true;
  }

  function handleCellInteraction(cellIndex, source = 'pointer') {
    if (pauseMenuOpen) return false;
    if (!gameInputEnabled || cutsceneMachine.isActive()) return false;

    if (interventionTargetState) {
      handleInterventionTargetClick(cellIndex);
      return true;
    }

    if (state.season.phase !== PHASES.PLANNING) return false;

    if (toolHUD && letItGrowInteractionMode) {
      const handled = handleEquippedToolInteraction(cellIndex);
      if (handled) {
        updateHUD();
      }
      return handled;
    }

    if (cellIndex < 0) {
      if (!cropPaletteOpen) {
        showCropPalette();
        return true;
      }
      return false;
    }

    const cell = state.season.grid[cellIndex];
    if (cell.cropId && !state.selectedCropId) {
      dispatch({
        type: Actions.REMOVE_CROP,
        payload: { cellIndex },
      });
      showToast('Crop removed', 1400);
    } else if (state.selectedCropId) {
      const cropInfo = getCropById(state.selectedCropId);
      dispatch({
        type: Actions.PLANT_CROP,
        payload: { cellIndex, cropId: state.selectedCropId },
      });
      scene.flashCell(cellIndex, 0x4a9a4a, 350);
      if (cropInfo) {
        showToast(`${cropInfo.emoji} ${cropInfo.name} planted`, 1600, 'success');
      }
      if (
        cellIndex === 0
        && state.campaign.currentChapter === 1
        && !hasKeepsake(state.campaign, 'moms_trowel')
      ) {
        awardCampaignKeepsake('moms_trowel', { cellIndex, cropId: state.selectedCropId });
      }
    } else {
      showCropPalette();
      return true;
    }

    updateHUD();
    return true;
  }

  function handleViewportSelection(clientX, clientY) {
    const cellIndex = scene.raycastCell(clientX, clientY);
    handleCellInteraction(cellIndex, 'pointer');
  }

  inputManager.on('select_cell', ({ source, position }) => {
    if ((source === 'keyboard' || source === 'touch') && interactionSystem.interactHighlighted({ source })) {
      syncInteractionPresentation();
      return;
    }
    if (source === 'keyboard') return;
    handleViewportSelection(position.clientX, position.clientY);
  });

  ['move_up', 'move_down', 'move_left', 'move_right'].forEach((actionName) => {
    inputManager.on(actionName, (payload) => {
      payload.preventDefault();
    });
  });

  inputManager.on('cancel', (payload) => {
    const { event } = payload;
    if (interventionTargetState) {
      payload.preventDefault();
      clearInterventionTargeting();
      setGameInputEnabled(false);
      openEventCard();
      return;
    }

    const activeReadOnlySheet = pauseContainer?.querySelector('#season-journal-sheet, #bug-reports-sheet');
    if (event?.key === 'Escape' && activeReadOnlySheet) {
      payload.preventDefault();
      activeReadOnlySheet.querySelector('[data-close="true"]')?.click();
    }
  });

  inputManager.on('pause', (payload) => {
    if (payload.event?.key !== 'Escape') return;
    payload.preventDefault();
    if (cutsceneMachine.isActive()) {
      cutsceneMachine.skip();
      return;
    }
    togglePauseMenu();
  });

  inputManager.on('cutscene_next', (payload) => {
    if (!cutsceneMachine.isActive()) return;
    if (cutsceneMachine.hasChoices()) return;
    payload.preventDefault();
    cutsceneMachine.next();
  });

  inputManager.on('advance', (payload) => {
    if (pauseMenuOpen || cutsceneMachine.isActive() || !gameInputEnabled) return;
    payload.preventDefault();
    phaseRouter.doAdvance();
  });

  inputManager.on('toggle_palette', (payload) => {
    if (pauseMenuOpen || cutsceneMachine.isActive() || !gameInputEnabled) return;
    payload.preventDefault();
    showCropPalette();
  });

  inputManager.on('toggle_backpack', (payload) => {
    if (pauseMenuOpen || cutsceneMachine.isActive() || !gameInputEnabled) return;
    payload.preventDefault();
    toggleBackpack();
  });

  dialoguePanel.getSkipButton().addEventListener('click', () => cutsceneMachine.skip());

  dialoguePanel.getPanelElement().addEventListener('click', (event) => {
    if (dialoguePanel.isChoiceTarget(event.target) || dialoguePanel.hasVisibleChoices()) {
      return;
    }
    if (cutsceneMachine.isActive()) {
      cutsceneMachine.next();
    }
  });

  dialoguePanel.getPanelElement().addEventListener('pointerdown', () => {
    if (!cutsceneMachine.isActive()) return;
    holdTimer = setTimeout(() => cutsceneMachine.startFastForward(), 300);
  });

  dialoguePanel.getPanelElement().addEventListener('pointerup', () => {
    clearTimeout(holdTimer);
    cutsceneMachine.stopFastForward();
  });

  dialoguePanel.getPanelElement().addEventListener('pointercancel', () => {
    clearTimeout(holdTimer);
    cutsceneMachine.stopFastForward();
  });

  fab?.addEventListener('click', (event) => {
    event.stopPropagation();
    phaseRouter.doAdvance();
  });

  hudAction?.addEventListener('click', (event) => {
    event.stopPropagation();
    phaseRouter.doAdvance();
  });

  fabPlant?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.season.phase !== PHASES.PLANNING) return;
    if (toolHUD && letItGrowInteractionMode) {
      toolHUD.selectTool('plant');
      syncPlayerTool();
    }
    if (cropPaletteOpen) {
      closePalette();
    } else {
      showCropPalette();
    }
  });

  fabBackpack?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleBackpack();
  });

  function togglePauseMenu() {
    if (interventionTargetState) return;
    pauseMenuOpen = !pauseMenuOpen;
    if (pauseMenuOpen) {
      bugPanel?.classList.remove('is-open');
      if (cropPaletteOpen) closePalette();
      closePanelSheets();
      if (pauseStatus) {
        pauseStatus.textContent = state.campaign?.sandbox
          ? `Free Play · ${getPhaseLabel(state.season.phase)}`
          : `Chapter ${state.campaign.currentChapter} · ${getPhaseLabel(state.season.phase)}`;
      }
      pauseOverlay?.classList.add('is-open');
    } else {
      pauseOverlay?.classList.remove('is-open');
    }
    syncToolHUDVisibility();
  }

  function closePauseMenu() {
    pauseMenuOpen = false;
    pauseOverlay?.classList.remove('is-open');
  }

  document.getElementById('hud-pause')?.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePauseMenu();
  });

  document.getElementById('pause-resume')?.addEventListener('click', () => {
    togglePauseMenu();
  });

  document.getElementById('pause-journal')?.addEventListener('click', () => {
    closePauseMenu();
    showSeasonJournalSheet(pauseContainer, state.campaign.journalEntries || []);
  });

  document.getElementById('pause-bugs')?.addEventListener('click', () => {
    const bugsKey = 'gos-story-bugs';
    closePauseMenu();
    try {
      const bugs = JSON.parse(localStorage.getItem(bugsKey) || '[]');
      showBugReportsSheet(pauseContainer, Array.isArray(bugs) ? bugs : []);
    } catch {
      showBugReportsSheet(pauseContainer, []);
    }
  });

  document.getElementById('pause-restart')?.addEventListener('click', () => {
    if (!confirm('Restart this chapter? Your current grid progress will be lost.')) return;
    dispatch({
      type: Actions.RESET_SEASON,
      payload: {
        season: createSeasonState(state.campaign.currentChapter, state.season.season, state.campaign),
        selectedCropId: null,
      },
    });
    closePauseMenu();
    updateHUD();
    showToast('Chapter restarted.', 1800);
  });

  document.getElementById('pause-main-menu')?.addEventListener('click', () => {
    persistState();
    closePauseMenu();
    loop.stop();
    cleanupGame();
    remount();
  });

  document.getElementById('pause-new')?.addEventListener('click', () => {
    if (!confirm('Delete this save slot and return to the title screen? This cannot be undone.')) return;
    deleteCampaign(slot);
    closePauseMenu();
    loop.stop();
    cleanupGame();
    remount();
  });

  document.getElementById('pause-close')?.addEventListener('click', () => {
    closePauseMenu();
  });

  pauseOverlay?.addEventListener('click', (event) => {
    if (event.target === pauseOverlay) {
      closePauseMenu();
    }
  });

  function toggleBugPanel() {
    if (interventionTargetState) return;
    if (pauseMenuOpen) {
      pauseMenuOpen = false;
      pauseOverlay?.classList.remove('is-open');
    }
    const isOpen = bugPanel?.classList.toggle('is-open');
    if (isOpen) {
      if (bugText) {
        bugText.value = '';
        bugText.focus();
      }
      if (bugMeta) {
        bugMeta.textContent = [
          `Chapter: ${state.campaign.currentChapter}`,
          `Phase: ${state.season.phase}`,
          `Season: ${state.season.season}`,
          `Crops: ${state.season.grid.filter((cell) => cell.cropId).length}/32`,
          `Score: ${hudScore?.textContent ?? '--'}`,
          `Time: ${new Date().toISOString()}`,
          `UA: ${navigator.userAgent.slice(0, 60)}`,
        ].join(' · ');
      }
    }
  }

  fabBug?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleBugPanel();
  });

  bugCancel?.addEventListener('click', () => {
    bugPanel?.classList.remove('is-open');
  });

  bugSend?.addEventListener('click', () => {
    const text = bugText?.value.trim();
    if (!text) {
      bugText?.focus();
      return;
    }

    const report = {
      text,
      chapter: state.campaign.currentChapter,
      phase: state.season.phase,
      season: state.season.season,
      beatIndex: state.season.beatIndex,
      score: hudScore?.textContent ?? '--',
      cropsPlanted: state.season.grid.filter((cell) => cell.cropId).map((cell) => cell.cropId),
      interventionChosen: state.season.interventionChosen,
      interventionTokens: state.season.interventionTokens,
      eventActive: state.season.eventActive ? {
        id: state.season.eventActive.id,
        title: state.season.eventActive.title,
      } : null,
      lastResolvedEvent: state.season.lastResolvedEvent ? {
        id: state.season.lastResolvedEvent.id,
        title: state.season.lastResolvedEvent.title,
      } : null,
      keepsakes: (state.campaign.keepsakes ?? []).map((entry) => entry.id),
      recipesCompleted: [...(state.campaign.recipesCompleted ?? [])],
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    const bugsKey = 'gos-story-bugs';
    try {
      const existing = JSON.parse(localStorage.getItem(bugsKey) || '[]');
      existing.push(report);
      localStorage.setItem(bugsKey, JSON.stringify(existing));
    } catch (error) {
      console.warn('Bug save failed:', error);
    }

    bugPanel?.classList.remove('is-open');
    showToast('Bug report saved on this device.', 2500);
  });

  const bugPanelOutsideHandler = (event) => {
    if (bugPanel?.classList.contains('is-open') && !bugPanel.contains(event.target) && event.target !== fabBug) {
      bugPanel.classList.remove('is-open');
    }
  };
  document.addEventListener('click', bugPanelOutsideHandler);

  function resize() {
    const rect = viewport.getBoundingClientRect();
    scene.resize(Math.round(rect.width), Math.round(rect.height));
  }

  window.addEventListener('resize', resize);
  resize();

  const loop = createLoop({
    scene,
    getState: () => state,
    update: (dt) => {
      inputManager.update(dt);
      const movementEnabled = canMovePlayer();
      touchStick.setEnabled(movementEnabled);
      playerController.setEnabled(movementEnabled);
      const playerState = playerController.update(dt, movementEnabled ? getMovementVector() : null);
      scene.setPlayerState?.(playerState);
      syncPlayerTool();
      const proximityEnabled = isProximityInteractionEnabled();
      interactionSystem.setEnabled(proximityEnabled);
      if (proximityEnabled) {
        scene.clearPointerHover();
      }
      interactionSystem.update(dt);
      syncInteractionPresentation();
    },
  });

  function renderGameToText() {
    const plantedCells = state.season.grid
      .map((cell, index) => (cell.cropId ? {
        index,
        cropId: cell.cropId,
        damageState: cell.damageState,
      } : null))
      .filter(Boolean);

    return JSON.stringify({
      chapter: state.campaign.currentChapter,
      season: state.season.season,
      phase: state.season.phase,
      currentZone: getCurrentZoneId(),
      pauseMenuOpen,
      cutsceneActive: cutsceneMachine.isActive(),
      selectedCropId: state.selectedCropId,
      plantedCount: plantedCells.length,
      plantedCells: plantedCells.slice(0, 12),
      score: hudScore?.textContent ?? '--',
      pointer: inputManager.getPointerPosition(),
      player: playerController.getState(),
      proximityMode: letItGrowInteractionMode,
      highlightedInteraction: interactionSystem.getHighlighted(),
      routes: getZoneTravelSummary(),
      foraging: getForagingSummary(),
      selectedTool: getSelectedToolId(),
      toolHudVisible: shouldShowToolHUD(),
    });
  }

  function advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < steps; index += 1) {
      loop.tick(1 / 60);
    }
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;
  window.gardenOS = {
    render_game_to_text: renderGameToText,
    advanceTime,
  };

  function cleanupGame() {
    destroyInit?.();
    unsubscribeState();
    inputManager.dispose();
    interactionSystem.dispose();
    interactionPrompt.dispose();
    toolHUD?.dispose();
    touchStick.dispose();
    calendarEl.remove();
    dialoguePanel?.destroy();
    document.removeEventListener('click', bugPanelOutsideHandler);
    window.removeEventListener('resize', resize);
    delete window.render_game_to_text;
    delete window.advanceTime;
    delete window.gardenOS;
    scene.dispose?.();
  }

  updateHUD();
  scene.setPlayerState?.(playerController.getState());
  syncPlayerTool();
  syncInteractionPresentation();
  loop.start();
  if (state.campaign?.sandbox) {
    setGameInputEnabled(true);
  } else {
    setGameInputEnabled(false);
    phaseRouter.handleNarrativeTrigger({
      type: 'chapter_start',
      chapter: state.campaign.currentChapter,
      season: state.season.season,
    });
  }

  return {
    cleanup: cleanupGame,
    store,
  };
}

export { bindUI };
