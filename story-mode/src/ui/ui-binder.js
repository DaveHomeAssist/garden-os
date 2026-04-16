import { createLoop } from '../game/loop.js';
import { Actions, cloneGameState } from '../game/store.js';
import { advance, canAdvance, getPhaseLabel } from '../game/phase-machine.js';
import { createPhaseRouter } from '../game/phase-router.js';
import { createSeasonState, PHASES, PHASE_ORDER } from '../game/state.js';
import { scoreBed } from '../scoring/bed-score.js';
import { saveCampaign, saveSeasonState } from '../game/save.js';
import { showEventCard } from './event-card.js';
import { showHarvestReveal } from './harvest-reveal.js';
import { showBackpackPanel } from './backpack-panel.js';
import { createDialoguePanel } from './dialogue-panel.js';
import { showWinterReview } from './winter-review.js';
import { createCutsceneMachine } from '../game/cutscene-machine.js';
import { createSeasonCalendar, updateSeasonCalendar } from './season-calendar.js';
import {
  canUseTool,
  executeToolAction,
} from '../game/intervention.js';
import { createPlayerController } from '../game/player-controller.js';
import { InteractionSystem } from '../game/interaction.js';
import { createInteractionPrompt } from './interaction-prompt.js';
import { ToolHUD } from './tool-hud.js';
import { createTouchStick } from './touch-stick.js';
import { createTouchControls } from '../input/touch-controls.js';
import { Inventory, getItemDef } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { ForagingSystem } from '../game/foraging.js';
import { ReputationSystem } from '../game/reputation.js';
import { QuestEngine } from '../game/quest-engine.js';
import { FestivalEngine } from '../game/festivals.js';
import { evaluateZoneAccess } from '../scene/zone-manager.js';
import { DayNightController } from '../game/day-night-controller.js';
import { AudioManager } from '../audio/audio-manager.js';
import { registerProceduralSFX } from '../audio/audio-assets.js';
import { createSeasonalAmbient } from '../audio/ambient-generator.js';
import {
  WORLD_ZONE_INTERACTABLES,
  ZONE_NAMES,
  applyZoneTravelState,
  resolveZoneSpawnPoint,
} from './zone-travel.js';
import {
  FACTION_BADGE_COLORS,
  FACTION_NAMES,
  SEASON_ICONS,
  SEASON_LABELS,
  DEFAULT_TOOLS,
  hasKeepsake,
  getRowAverages,
  getYearForChapter,
  isLetItGrowInteractionMode,
} from './ui-constants.js';
import { createPauseController } from './pause-controller.js';
import { getRotatedSeasonLabel, buildBackpackData as buildBackpackData_imported, buildWinterReviewData as buildWinterReviewData_imported } from './ui-data-builders.js';
import { createInterventionTargeting } from './intervention-targeting.js';
import { createOverlayScreens } from './overlay-screens.js';

function bindUI({
  store,
  data,
  scene,
  inputManager,
  viewport,
  slot,
  destroyInit,
  remount,
  zoneManager,
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
  inputManager.registerAction('interact', { keys: ['e'] });

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

  let backpackOpen = false;
  let cropPaletteOpen = false;
  let gameInputEnabled = true;
  let holdTimer = null;
  const interventionCtx = {};
  const interventionTargeting = createInterventionTargeting(interventionCtx);
  
  let fabWasVisible = false;
  let fabPlantWasVisible = false;

  let state = store.getState();
  let interactionSystem = null;
  const playerController = createPlayerController();
  if (state.campaign.worldState?.lastSpawnPoint) {
    playerController.reset(state.campaign.worldState.lastSpawnPoint);
  }
  const unsubscribeState = store.subscribe((nextState, action) => {
    state = nextState;
    if (applyZoneTravelState(action, nextState, { playerController, scene, interactionSystem })) {
      updateHUD();
      interactionSystem?.update?.(0);
      syncInteractionPresentation();
    }
  });
  const touchStick = createTouchStick();
  touchStick.mount(document.getElementById('app'));
  const touchControls = createTouchControls(document.getElementById('app'), {
    onOrbitDelta(dTheta, dPhi) {
      scene.applyCameraOrbitDelta?.(dTheta, dPhi);
    },
  });
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

  const ACTION_SFX = {
    PLANT_CROP: 'plant',
    WATER_CELL: 'water',
    HARVEST_CELL: 'harvest',
    ACCEPT_QUEST: 'quest_accept',
    COMPLETE_QUEST: 'quest_complete',
  };

  function dispatch(action) {
    const result = store.dispatch(action);
    const sfxId = ACTION_SFX[action.type];
    if (sfxId && audioInitialized) audioManager.playSFX(sfxId);
    if (action.type === Actions.ADVANCE_PHASE) syncSeasonalAudio();
    return result;
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
  const dayNightController = new DayNightController(scene, store);

  const audioManager = new AudioManager();
  let audioInitialized = false;
  let lastAudioSeason = null;
  let currentAmbientGen = null;

  async function ensureAudioInit() {
    if (audioInitialized) return;
    audioInitialized = true;
    await audioManager.init();
    registerProceduralSFX(audioManager);
    const settings = state.settings?.audio ?? {};
    if (settings.muted) audioManager.setMuted(true);
    if (settings.masterVolume != null) audioManager.setMasterVolume(settings.masterVolume);
    if (settings.sfxVolume != null) audioManager.setSFXVolume(settings.sfxVolume);
    if (settings.ambientVolume != null) audioManager.setAmbientVolume(settings.ambientVolume);
    if (settings.musicVolume != null) audioManager.setMusicVolume(settings.musicVolume);
  }

  function syncSeasonalAudio() {
    const season = state.season?.season;
    if (!season || season === lastAudioSeason || !audioManager.audioContext) return;
    lastAudioSeason = season;
    if (currentAmbientGen) {
      currentAmbientGen.stop();
      currentAmbientGen = null;
    }
    const gen = createSeasonalAmbient(audioManager.audioContext, season);
    audioManager.setAmbientNode(gen.node);
    gen.start();
    currentAmbientGen = gen;
  }

  // Init audio on first user interaction (Web Audio policy)
  function onFirstInteraction() {
    ensureAudioInit().then(() => syncSeasonalAudio());
    document.removeEventListener('pointerdown', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
  }
  document.addEventListener('pointerdown', onFirstInteraction, { once: true });
  document.addEventListener('keydown', onFirstInteraction, { once: true });

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
          const spawnPoint = resolveZoneSpawnPoint(currentZone, entry.zoneId);
          dispatch({
            type: Actions.ZONE_CHANGED,
            payload: { fromZone: currentZone, toZone: entry.zoneId, spawnPoint },
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
    return gameInputEnabled && !pauseController.isOpen() && !cutsceneMachine.isActive() && !interventionTargeting.isActive();
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
      && !pauseController.isOpen()
      && !cutsceneMachine.isActive()
      && !interventionTargeting.isActive()
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

  interactionSystem = new InteractionSystem(
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
    const highlightedCellIndex = highlighted?.type === 'cell' ? highlighted.index : null;

    // Tick cooldown overlays every frame — runs even when no cell is highlighted
    toolHUD?.syncCooldowns(state.season?.toolCooldowns ?? {}, highlightedCellIndex);

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
    if (!interventionTargeting.isActive()) {
      scene.clearTargeting?.();
    }
    syncToolHUDVisibility();
  }

  function clearInterventionTargeting() {
    interventionTargeting.clear();
    panelContainer?.querySelector('#intervention-target-panel')?.remove();
  }

  function updateFAB() {
    if (!fab) return;
    if (!gameInputEnabled || cutsceneMachine.isActive() || interventionTargeting.isActive()) {
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

  function buildBackpackData() {
    return buildBackpackData_imported({
      state, inventory, craftingSystem, skillSystem, toolHUD,
      getItemDef, getCropById, getRecipeById, getRecipes,
      getKeepsakeById, getKeepsakeSlots, persistState,
      syncPlayerTool, showToast, updateHUD, store, Actions,
    });
  }


  function buildWinterReviewData() {
    return buildWinterReviewData_imported({ state, getCropById, getRecipes, getKeepsakeSlots });
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

  // Intervention targeting delegated to intervention-targeting.js
  function finalizeInterventionChoice(interventionId, targetA, targetB) {
    interventionTargeting.finalize(interventionId, targetA, targetB);
  }
  function beginInterventionTargeting(interventionId) {
    interventionTargeting.begin(interventionId);
  }
  function handleInterventionTargetClick(cellIndex) {
    interventionTargeting.handleTargetClick(cellIndex);
  }

  function toggleBackpack() {
    if (interventionTargeting.isActive()) return;
    if (backpackOpen) {
      closeBackpackPanel();
    } else {
      showBackpack();
      fabBackpack?.classList.add('is-open');
    }
  }

  function openEventCard() {
    if (!interventionTargeting.isActive()) {
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
    document.body.dataset.storyScreen = 'play';
    document.body.dataset.season = state.season.season ?? 'spring';
    document.body.dataset.phase = state.season.phase ?? '';
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
      const visible = gameInputEnabled && !cutsceneMachine.isActive() && !interventionTargeting.isActive() && canAdvance(state.season);
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
      if (!interventionTargeting.isActive()) {
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
    if (pauseController.isOpen()) return false;
    if (!gameInputEnabled || cutsceneMachine.isActive()) return false;

    if (interventionTargeting.isActive()) {
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

  inputManager.on('interact', (payload) => {
    if (!isProximityInteractionEnabled()) return;
    payload.preventDefault();
    if (interactionSystem.interactHighlighted({ source: 'keyboard' })) {
      syncInteractionPresentation();
    }
  });

  ['move_up', 'move_down', 'move_left', 'move_right'].forEach((actionName) => {
    inputManager.on(actionName, (payload) => {
      payload.preventDefault();
    });
  });

  inputManager.on('cancel', (payload) => {
    const { event } = payload;
    if (interventionTargeting.isActive()) {
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
    if (pauseController.isOpen() || cutsceneMachine.isActive() || !gameInputEnabled) return;
    payload.preventDefault();
    phaseRouter.doAdvance();
  });

  inputManager.on('toggle_palette', (payload) => {
    if (pauseController.isOpen() || cutsceneMachine.isActive() || !gameInputEnabled) return;
    payload.preventDefault();
    showCropPalette();
  });

  inputManager.on('toggle_backpack', (payload) => {
    if (pauseController.isOpen() || cutsceneMachine.isActive() || !gameInputEnabled) return;
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

  const pauseController = createPauseController({
    getState: () => state,
    dispatch,
    persistState,
    showToast,
    closePalette,
    closePanelSheets,
    syncToolHUDVisibility,
    updateHUD,
    stopLoop: () => loop.stop(),
    cleanupGame,
    remount,
    slot,
    isInterventionTargeting: () => !!interventionTargeting.isActive(),
    isCropPaletteOpen: () => cropPaletteOpen,
  });
  const togglePauseMenu = pauseController.toggle;
  const closePauseMenu = pauseController.close;
  const toggleBugPanel = pauseController.toggleBugPanel;


  function resize() {
    const rect = viewport.getBoundingClientRect();
    scene.resize(Math.round(rect.width), Math.round(rect.height));
  }

  // Populate lazy intervention context now that all functions are defined
  Object.assign(interventionCtx, {
    getState: () => state,
    scene,
    panelContainer,
    showToast,
    setGameInputEnabled,
    openEventCard,
    updateHUD,
    persistState,
    produceState,
    getCropById,
    phaseRouter,
  });

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
      dayNightController.sync();
      // Check zone exit triggers each frame using the player's current position
      if (zoneManager && !zoneManager.transitioning) {
        const pos = playerController.getState().position;
        zoneManager.checkTriggers(pos);
      }
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
      pauseMenuOpen: pauseController.isOpen(),
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
    touchControls.dispose();
    calendarEl.remove();
    dialoguePanel?.destroy();
    dayNightController?.dispose();
    zoneManager?.dispose();
    audioManager?.dispose();
    pauseController.dispose();
    window.removeEventListener('resize', resize);
    delete window.render_game_to_text;
    delete window.advanceTime;
    delete window.gardenOS;
    zoneManager?.dispose?.();
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
