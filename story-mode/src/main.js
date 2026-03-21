/**
 * Garden OS Story Mode — Entry Point
 * Mounts the 3D scene, initializes game state, binds touch input.
 */
import { createGardenScene } from './scene/garden-scene.js';
import { createLoop } from './game/loop.js';
import { createGameState, createSeasonState, PHASES, PHASE_ORDER } from './game/state.js';
import { advance, canAdvance, getPhaseLabel } from './game/phase-machine.js';
import { scoreBed } from './scoring/bed-score.js';
import { getCropsForChapter, getRecipeById } from './data/crops.js';
import { getKeepsakeById, getKeepsakeSlots } from './data/keepsakes.js';
import { saveCampaign, loadCampaign, deleteCampaign, saveSeasonState, loadSeasonState, awardKeepsake } from './game/save.js';
import { showEventCard } from './ui/event-card.js';
import { showHarvestReveal } from './ui/harvest-reveal.js';
import { createDialoguePanel } from './ui/dialogue-panel.js';
import { createCutsceneMachine } from './game/cutscene-machine.js';
import { createSeasonCalendar, updateSeasonCalendar } from './ui/season-calendar.js';
import { applyIntervention } from './game/intervention.js';
import { applyEventEffect } from './game/event-engine.js';

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

function mount() {
  const viewport = document.getElementById('viewport');
  const state = createGameState();
  const saved = loadCampaign();

  if (saved) {
    showStartChoice(saved, () => {
      Object.assign(state.campaign, saved);
      const savedSeason = loadSeasonState();
      if (savedSeason) {
        Object.assign(state.season, savedSeason);
        state.season.campaign = state.campaign;
      } else {
        state.season = createSeasonState(
          state.campaign.currentChapter,
          state.campaign.currentSeason ?? 'spring',
          state.campaign,
        );
      }
      startGame(state, viewport);
    }, () => {
      deleteCampaign();
      startGame(state, viewport);
    });
    return;
  }

  startGame(state, viewport);
}

function showStartChoice(saved, onContinue, onNewGame) {
  const overlayContainer = document.getElementById('overlay-container');
  const choice = document.createElement('div');
  choice.className = 'chapter-intro';
  choice.innerHTML = `
    <div class="chapter-num">Garden OS</div>
    <h2>Welcome Back</h2>
    <p>Chapter ${saved.currentChapter} save found from ${new Date(saved.updatedAt).toLocaleDateString()}.</p>
    <div class="start-choice-actions">
      <button type="button" class="start-choice-btn start-choice-btn--primary" id="btn-continue">Continue</button>
      <button type="button" class="start-choice-btn start-choice-btn--ghost" id="btn-new">New Game</button>
    </div>
  `;

  choice.querySelector('#btn-continue').addEventListener('click', () => {
    choice.remove();
    onContinue();
  });

  choice.querySelector('#btn-new').addEventListener('click', () => {
    choice.remove();
    onNewGame();
  });

  overlayContainer.appendChild(choice);
}

function startGame(state, viewport) {
  let scene;
  try {
    scene = createGardenScene(viewport);
  } catch (err) {
    viewport.innerHTML = `<div style="padding:24px;color:#e8c84a;font-family:monospace">${err.message}</div>`;
    console.error('Scene init failed:', err);
    return;
  }

  const calendarEl = createSeasonCalendar();
  document.getElementById('app').appendChild(calendarEl);

  const hudChapter = document.getElementById('hud-chapter');
  const hudPhase = document.getElementById('hud-phase');
  const hudCrops = document.getElementById('hud-crops');
  const hudScore = document.getElementById('hud-score');
  const panelContainer = document.getElementById('panel-container');
  const phaseDots = document.getElementById('phase-dots');
  const toastContainer = document.getElementById('toast-container');
  const fab = document.getElementById('fab-advance');
  const fabBackpack = document.getElementById('fab-backpack');
  let backpackOpen = false;
  const dialogueRoot = document.getElementById('dialogue-root');
  const cutsceneLayer = document.getElementById('cutscene-layer');

  let gameInputEnabled = true;
  let holdTimer = null;
  let postCutsceneAction = null;

  const dialoguePanel = createDialoguePanel(dialogueRoot);
  const cutsceneMachine = createCutsceneMachine({
    onStateChange: (uiState) => {
      dialoguePanel.render(uiState);
      cutsceneLayer?.setAttribute('aria-hidden', uiState.visible ? 'false' : 'true');
    },
    onFinish: () => {
      dialoguePanel.hide();
      cutsceneLayer?.setAttribute('aria-hidden', 'true');

      if (postCutsceneAction === 'event') {
        postCutsceneAction = null;
        openEventCard();
        return;
      }

      if (postCutsceneAction === 'harvest') {
        postCutsceneAction = null;
        openHarvestReveal();
        return;
      }

      setGameInputEnabled(true);
    },
    gardenScene: scene,
  });

  function setGameInputEnabled(enabled) {
    gameInputEnabled = enabled;
    if (fab) {
      fab.disabled = !enabled;
      fab.classList.toggle('is-disabled', !enabled);
    }
  }

  function awardCampaignKeepsake(keepsakeId, meta = {}) {
    const awarded = awardKeepsake(state.campaign, keepsakeId, {
      chapter: state.campaign.currentChapter,
      season: state.season.season,
      ...meta,
    });
    if (!awarded) return null;
    state.season.newlyEarnedKeepsakes.push(awarded);
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
    saveCampaign(state.campaign);
    saveSeasonState(state.season);
  }

  function finalizeHarvestProgression() {
    const result = state.season.harvestResult;
    if (!result) return;

    state.season.newlyEarnedKeepsakes = [];

    for (const cropId of result.yieldList ?? []) {
      state.campaign.pantry[cropId] = (state.campaign.pantry[cropId] ?? 0) + 1;
    }

    for (const recipeId of result.recipeMatches ?? []) {
      if (!state.campaign.recipesCompleted.includes(recipeId)) {
        state.campaign.recipesCompleted.push(recipeId);
      }
    }

    if (
      state.campaign.currentChapter === 8
      && !hasKeepsake(state.campaign, 'the_photo')
    ) {
      awardCampaignKeepsake('the_photo');
    }

    if (
      (result.recipeMatches ?? []).includes('moms_sauce')
      && state.campaign.currentChapter >= 11
      && !hasKeepsake(state.campaign, 'handwritten_sauce_card')
    ) {
      awardCampaignKeepsake('handwritten_sauce_card', { recipeId: 'moms_sauce' });
    }

    const lastEvent = state.season.lastResolvedEvent;
    const eventSummary = state.season.lastEventEffectSummary;

    if (
      lastEvent
      && /block party/i.test(`${lastEvent.title} ${lastEvent.description}`)
      && (result.recipeMatches?.length ?? 0) > 0
      && !hasKeepsake(state.campaign, 'block_party_plate')
    ) {
      awardCampaignKeepsake('block_party_plate', { recipeId: result.recipeMatches[0] });
    }

    if (
      lastEvent
      && /frost/i.test(`${lastEvent.title} ${lastEvent.description}`)
      && (eventSummary?.negativeAffectedCount ?? 0) > 0
      && !hasKeepsake(state.campaign, 'first_frost_marker')
    ) {
      awardCampaignKeepsake('first_frost_marker', { eventId: lastEvent.id, eventTitle: lastEvent.title });
    }

    const rowAverages = getRowAverages(result.cellScores);
    const hadGardenFailure = rowAverages.some((avg) => avg > 0 && avg < 3);
    if (
      lastEvent
      && /phillies/i.test(`${lastEvent.title} ${lastEvent.description}`)
      && lastEvent.valence !== 'positive'
      && hadGardenFailure
      && !hasKeepsake(state.campaign, 'onion_mans_scorecard')
    ) {
      awardCampaignKeepsake('onion_mans_scorecard', { eventId: lastEvent.id, eventTitle: lastEvent.title });
    }
  }

  function showToast(message, durationMs = 2200) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  function updatePhaseDots() {
    const currentIndex = PHASE_ORDER.indexOf(state.season.phase);
    phaseDots.innerHTML = PHASE_ORDER.map((phase, idx) => {
      let cls = 'phase-dot';
      if (idx < currentIndex) cls += ' phase-dot--done';
      else if (idx === currentIndex) cls += ' phase-dot--active';
      return `<span class="${cls}" title="${getPhaseLabel(phase)}"></span>`;
    }).join('');
  }

  function updateFAB() {
    if (!fab) return;
    if (!gameInputEnabled || cutsceneMachine.isActive()) {
      fab.classList.remove('is-visible');
      if (fabBackpack) fabBackpack.classList.add('is-hidden');
      return;
    }
    if (canAdvance(state.season)) {
      fab.classList.add('is-visible');
      fab.textContent = state.season.phase === PHASES.PLANNING ? 'Commit' : 'Next';
    } else {
      fab.classList.remove('is-visible');
    }

    // Backpack only visible during PLANNING
    if (fabBackpack) {
      if (state.season.phase === PHASES.PLANNING) {
        fabBackpack.classList.remove('is-hidden');
      } else {
        fabBackpack.classList.add('is-hidden');
        if (backpackOpen) closePalette();
      }
    }
  }

  function updateHUD() {
    hudChapter.textContent = `Chapter ${state.campaign.currentChapter}`;
    hudPhase.textContent = getPhaseLabel(state.season.phase);
    const planted = state.season.grid.filter((cell) => cell.cropId !== null).length;
    hudCrops.textContent = `${planted} / 32`;

    const scoreResult = state.season.harvestResult
      ?? scoreBed(state.season.grid, state.season.siteConfig, state.season.season, state.campaign.pantry);
    hudScore.textContent = scoreResult.score > 0 ? String(scoreResult.score) : '--';

    updatePhaseDots();
    updateFAB();
    updateSeasonCalendar(state);
  }

  function showCropPalette() {
    const crops = getCropsForChapter(state.campaign.currentChapter);
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
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
          return `
            <button type="button" class="palette-item ${selected ? 'is-selected' : ''}" data-crop="${crop.id}">
              <div class="palette-emoji">${crop.emoji}</div>
              <div class="palette-name">${crop.name}</div>
              <span class="palette-badge" style="--badge-color:${badgeColor};">${badgeName}</span>
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
      state.selectedCropId = cropButton.dataset.crop;
      closePalette();
    });

    panelContainer.innerHTML = '';
    panelContainer.appendChild(sheet);
    backpackOpen = true;
    if (fabBackpack) fabBackpack.classList.add('is-open');
  }

  function closePalette() {
    const sheet = panelContainer.querySelector('.panel-sheet');
    if (sheet) {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 300);
    }
    backpackOpen = false;
    if (fabBackpack) fabBackpack.classList.remove('is-open');
  }

  function toggleBackpack() {
    if (backpackOpen) {
      closePalette();
    } else {
      showCropPalette();
    }
  }

  function openEventCard() {
    const event = state.season.eventActive;
    if (!event) {
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

    showEventCard(panelContainer, event, state.season.interventionTokens, (interventionId) => {
      state.season.interventionChosen = interventionId;
      if (interventionId !== 'accept_loss') {
        state.season.interventionTokens = Math.max(0, state.season.interventionTokens - 1);
      }

      // Bug 4: Apply the intervention's mechanical effect to the grid
      applyIntervention(state.season.grid, interventionId);

      // Bug 9 + 11: Save event reference BEFORE clearing, apply event effect
      const resolvedEvent = state.season.eventActive;
      state.season.lastResolvedEvent = resolvedEvent ? { ...resolvedEvent } : null;
      state.season.lastEventEffectSummary = applyEventEffect(state.season.grid, resolvedEvent);
      state.season.eventActive = null;

      showToast(interventionId === 'accept_loss' ? 'Accepted the loss' : `Used ${interventionId}`, 1800);
      persistState();
      setGameInputEnabled(true);
      updateHUD();
    });
  }

  function openHarvestReveal() {
    if (!state.season.harvestResult) {
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

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
      },
      () => {
        persistState();
        setGameInputEnabled(true);
        updateHUD();
      }
    );
  }

  function handleNarrativeTrigger(trigger) {
    if (!trigger) {
      setGameInputEnabled(true);
      return;
    }

    const queued = cutsceneMachine.queueFromTrigger(trigger, state.campaign);
    if (!queued) {
      if (trigger.type === 'event_drawn') {
        openEventCard();
      } else if (trigger.type === 'harvest_complete') {
        openHarvestReveal();
      } else {
        setGameInputEnabled(true);
      }
      return;
    }

    if (trigger.type === 'event_drawn') {
      postCutsceneAction = 'event';
    } else if (trigger.type === 'harvest_complete') {
      postCutsceneAction = 'harvest';
    } else {
      postCutsceneAction = null;
    }
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
    overlay.querySelector('#btn-endgame-close').addEventListener('click', () => {
      overlay.remove();
      setGameInputEnabled(true);
    });
    overlayContainer.appendChild(overlay);
  }

  function doAdvance() {
    if (!gameInputEnabled || cutsceneMachine.isActive() || !canAdvance(state.season)) return;

    setGameInputEnabled(false);
    const result = advance(state);
    updateHUD();

    // Bug 12: Save both campaign and season on every phase transition
    persistState();

    if (!result.advanced) {
      setGameInputEnabled(true);
      return;
    }

    // Bug 7: End-game guard — show completion overlay when campaign is done
    if (result.campaignComplete) {
      showEndGameOverlay();
      return;
    }

    if (!result.trigger) {
      showToast(getPhaseLabel(state.season.phase), 1800);
      setGameInputEnabled(true);
      return;
    }

    handleNarrativeTrigger(result.trigger);
  }

  dialoguePanel.getSkipButton().addEventListener('click', () => cutsceneMachine.skip());

  dialoguePanel.getPanelElement().addEventListener('click', () => {
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

  viewport.addEventListener('click', (event) => {
    if (!gameInputEnabled || cutsceneMachine.isActive()) return;
    if (state.season.phase !== PHASES.PLANNING) return;

    const cellIndex = scene.raycastCell(event.clientX, event.clientY);
    if (cellIndex < 0) {
      showCropPalette();
      return;
    }

    const cell = state.season.grid[cellIndex];
    if (cell.cropId && !state.selectedCropId) {
      cell.cropId = null;
    } else if (state.selectedCropId) {
      cell.cropId = state.selectedCropId;
      scene.flashCell(cellIndex, 0x4a9a4a, 350);
      if (
        cellIndex === 0
        && state.campaign.currentChapter === 1
        && !hasKeepsake(state.campaign, 'moms_trowel')
      ) {
        awardCampaignKeepsake('moms_trowel', { cellIndex, cropId: state.selectedCropId });
      }
    } else {
      showCropPalette();
      return;
    }

    updateHUD();
  });

  document.addEventListener('keydown', (event) => {
    if (cutsceneMachine.isActive()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cutsceneMachine.next();
      } else if (event.key === 'Escape') {
        cutsceneMachine.skip();
      }
      return;
    }

    if (!gameInputEnabled) return;

    if (event.key === 'Enter') {
      doAdvance();
    } else if (event.key === 'p' || event.key === 'P') {
      showCropPalette();
    }
  });

  fab?.addEventListener('click', (event) => {
    event.stopPropagation();
    doAdvance();
  });

  fabBackpack?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleBackpack();
  });

  function resize() {
    const rect = viewport.getBoundingClientRect();
    scene.resize(rect.width, rect.height);
  }

  window.addEventListener('resize', resize);
  resize();

  const loop = createLoop({
    scene,
    getState: () => state,
  });

  updateHUD();
  loop.start();
  setGameInputEnabled(false);
  handleNarrativeTrigger({
    type: 'chapter_start',
    chapter: state.campaign.currentChapter,
    season: state.season.season,
  });
}

try {
  mount();
} catch (err) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<pre style="color:#e8c84a;padding:24px;font-family:monospace;white-space:pre-wrap">${err.stack || err.message}</pre>`;
  }
  console.error('Mount failed:', err);
}
