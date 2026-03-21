/**
 * Garden OS Story Mode — Entry Point
 * Mounts the 3D scene, initializes game state, binds touch input.
 */
import { createGardenScene } from './scene/garden-scene.js';
import { createLoop } from './game/loop.js';
import { createGameState, createSeasonState, PHASES, PHASE_ORDER } from './game/state.js';
import { advance, canAdvance, getPhaseLabel } from './game/phase-machine.js';
import { scoreBed } from './scoring/bed-score.js';
import { getCropById, getCropsForChapter, getRecipeById, getRecipes } from './data/crops.js';
import { getKeepsakeById, getKeepsakeSlots } from './data/keepsakes.js';
import {
  saveCampaign, loadCampaign, deleteCampaign,
  saveSeasonState, loadSeasonState, awardKeepsake,
  listSaves, getActiveSaveSlot, setActiveSaveSlot, SAVE_SLOTS,
} from './game/save.js';
import { showEventCard } from './ui/event-card.js';
import { showHarvestReveal } from './ui/harvest-reveal.js';
import { showBackpackPanel } from './ui/backpack-panel.js';
import { createDialoguePanel } from './ui/dialogue-panel.js';
import { showWinterReview } from './ui/winter-review.js';
import { showSeasonJournalSheet, showBugReportsSheet } from './ui/pause-panels.js';
import { createCutsceneMachine } from './game/cutscene-machine.js';
import { createSeasonCalendar, updateSeasonCalendar } from './ui/season-calendar.js';
import { applyIntervention, getTargetableCells } from './game/intervention.js';
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

let activeSlot = 0;

const GRADE_DOT_CLASS = {
  ‘A+’: ‘sparkline-dot--a’, A: ‘sparkline-dot--a’,
  ‘B+’: ‘sparkline-dot--b’, B: ‘sparkline-dot--b’,
  ‘C+’: ‘sparkline-dot--c’, C: ‘sparkline-dot--c’,
  D: ‘sparkline-dot--d’,
  F: ‘sparkline-dot--f’,
};

function getProgressClass(campaign) {
  const entries = campaign.journalEntries ?? [];
  if (!entries.length) return ‘’;
  const lastGrade = entries[entries.length - 1]?.grade ?? ‘’;
  if ([‘A+’, ‘A’, ‘B+’, ‘B’].includes(lastGrade)) return ‘’;
  if ([‘C+’, ‘C’].includes(lastGrade)) return ‘progress-mid’;
  return ‘progress-low’;
}

function renderTitleScreen(onStart) {
  const titleScreen = document.getElementById(‘title-screen’);
  const slotsContainer = document.getElementById(‘save-slots’);
  const modesContainer = document.getElementById(‘title-modes’);
  if (!titleScreen || !slotsContainer) return;

  titleScreen.classList.remove(‘is-exiting’);
  titleScreen.style.display = ‘’;

  const saves = listSaves();
  slotsContainer.innerHTML = saves.map((entry) => {
    if (entry.isEmpty) {
      return `
        <div class="save-slot-card save-slot-card--empty" data-slot="${entry.slot}">
          <div class="save-slot-label">Slot ${entry.slot + 1}</div>
          <div class="save-slot-empty-label">Empty Slot</div>
          <button type="button" class="save-slot-btn save-slot-btn--primary" data-action="new" data-slot="${entry.slot}">New Game</button>
        </div>`;
    }
    const sparkline = (entry.gradeHistory ?? []).map((gh) => {
      const cls = GRADE_DOT_CLASS[gh.grade] ?? ‘’;
      return `<span class="sparkline-dot ${cls}" title="Ch${gh.chapter}: ${gh.grade}"></span>`;
    }).join(‘’);
    const dateStr = entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : ‘unknown’;
    const progressCls = getProgressClass(entry.campaign);
    return `
      <div class="save-slot-card save-slot-card--occupied ${progressCls}" data-slot="${entry.slot}">
        <div>
          <div class="save-slot-label">Slot ${entry.slot + 1}</div>
          <div class="save-slot-chapter">
            <span class="season-emoji">${entry.seasonEmoji}</span>
            Chapter ${entry.chapter}
          </div>
          <div class="save-slot-meta">Score: ${entry.score} &middot; ${dateStr}</div>
          ${sparkline ? `<div class="save-slot-sparkline">${sparkline}</div>` : ‘’}
        </div>
        <div class="save-slot-actions">
          <button type="button" class="save-slot-btn save-slot-btn--primary" data-action="continue" data-slot="${entry.slot}">Continue</button>
          <button type="button" class="save-slot-btn save-slot-btn--danger" data-action="delete" data-slot="${entry.slot}">Delete</button>
        </div>
      </div>`;
  }).join(‘’);

  if (modesContainer) {
    modesContainer.innerHTML = `
      <div class="mode-card mode-card--active">
        <span class="mode-icon">📖</span>
        <span>Story Mode</span>
      </div>
      <div class="mode-card mode-card--locked">
        <span class="mode-icon">🌿</span>
        <span>Free Play</span>
        <span class="mode-lock">🔒</span>
        <span class="mode-soon">Coming Soon</span>
      </div>
      <div class="mode-card mode-card--locked">
        <span class="mode-icon">📅</span>
        <span>Daily Challenge</span>
        <span class="mode-lock">🔒</span>
        <span class="mode-soon">Coming Soon</span>
      </div>
      <div class="mode-card mode-card--locked">
        <span class="mode-icon">⏱</span>
        <span>Speedrun</span>
        <span class="mode-lock">🔒</span>
        <span class="mode-soon">Coming Soon</span>
      </div>
    `;
  }

  // Use event delegation — replace container to avoid stacking listeners
  const freshSlots = slotsContainer.cloneNode(true);
  slotsContainer.parentNode.replaceChild(freshSlots, slotsContainer);

  freshSlots.addEventListener(‘click’, (e) => {
    const btn = e.target.closest(‘[data-action]’);
    if (!btn) return;
    const action = btn.dataset.action;
    const slot = parseInt(btn.dataset.slot, 10);

    if (action === ‘delete’) {
      if (!confirm(`Delete save in Slot ${slot + 1}? This cannot be undone.`)) return;
      deleteCampaign(slot);
      renderTitleScreen(onStart);
      return;
    }

    if (action === ‘new’) {
      activeSlot = slot;
      setActiveSaveSlot(slot);
      dismissTitleScreen(titleScreen, () => onStart(slot, null));
      return;
    }

    if (action === ‘continue’) {
      activeSlot = slot;
      setActiveSaveSlot(slot);
      const saved = loadCampaign(slot);
      dismissTitleScreen(titleScreen, () => onStart(slot, saved));
      return;
    }
  });
}

function dismissTitleScreen(titleScreen, callback) {
  titleScreen.classList.add(‘is-exiting’);
  setTimeout(() => {
    titleScreen.style.display = ‘none’;
    callback();
  }, 400);
}

function showTitleScreen() {
  const titleScreen = document.getElementById(‘title-screen’);
  if (titleScreen) {
    titleScreen.classList.remove(‘is-exiting’);
    titleScreen.style.display = ‘’;
  }
  renderTitleScreen((slot, saved) => {
    const viewport = document.getElementById(‘viewport’);
    const state = createGameState();
    if (saved) {
      Object.assign(state.campaign, saved);
      const savedSeason = loadSeasonState(slot);
      if (savedSeason) {
        Object.assign(state.season, savedSeason);
        state.season.campaign = state.campaign;
        if (state.season.phase === ‘REVIEW’) {
          state.season.phase = PHASES.TRANSITION;
        }
      } else {
        state.season = createSeasonState(
          state.campaign.currentChapter,
          state.campaign.currentSeason ?? ‘spring’,
          state.campaign,
        );
      }
    }
    startGame(state, viewport);
  });
}

function mount() {
  showTitleScreen();
}

function startGame(state, viewport) {
  if (state.season.winterReviewSeen == null) {
    state.season.winterReviewSeen = false;
  }
  if (state.campaign.lastSeasonReview == null) {
    state.campaign.lastSeasonReview = null;
  }

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
  let backpackOpen = false;
  let cropPaletteOpen = false;
  const dialogueRoot = document.getElementById('dialogue-root');
  const cutsceneLayer = document.getElementById('cutscene-layer');

  let gameInputEnabled = true;
  let holdTimer = null;
  let postCutsceneAction = null;
  let interventionTargetState = null;

  const dialoguePanel = createDialoguePanel(dialogueRoot);
  const cutsceneMachine = createCutsceneMachine({
    onStateChange: (uiState) => {
      dialoguePanel.render(uiState);
      cutsceneLayer?.setAttribute('aria-hidden', uiState.visible ? 'false' : 'true');
      // Fade phase dots during cutscenes
      phaseDots?.classList.toggle('is-cutscene', uiState.visible);
    },
    onFinish: () => {
      dialoguePanel.hide();
      cutsceneLayer?.setAttribute('aria-hidden', 'true');
      phaseDots?.classList.remove('is-cutscene');

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

      if (postCutsceneAction === 'transition') {
        postCutsceneAction = null;
        openSeasonTransitionOverlay();
        return;
      }

      if (postCutsceneAction === 'winter_review') {
        postCutsceneAction = null;
        openWinterReviewOverlay();
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
    saveCampaign(state.campaign, activeSlot);
    saveSeasonState(state.season, activeSlot);
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
    void app.offsetWidth; // force reflow to restart animation
    app.classList.add('is-shaking');
    setTimeout(() => app.classList.remove('is-shaking'), 250);
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

  function getAdvanceLabel() {
    if (state.season.season === 'winter') return 'Continue';
    switch (state.season.phase) {
      case PHASES.PLANNING:
        return 'Commit Plan';
      case PHASES.TRANSITION:
        return 'Continue';
      case PHASES.LATE_SEASON:
        return canAdvance(state.season) ? 'Harvest' : 'Next';
      default:
        return 'Next';
    }
  }

  let fabWasVisible = false;
  let fabPlantWasVisible = false;

  function pulseOnEnter(el, wasVisible) {
    if (!wasVisible) {
      el.classList.remove('is-entering');
      void el.offsetWidth;
      el.classList.add('is-entering');
      setTimeout(() => el.classList.remove('is-entering'), 700);
    }
  }

  function updateFAB() {
    if (!fab) return;
    if (!gameInputEnabled || cutsceneMachine.isActive() || interventionTargetState) {
      fab.classList.remove('is-visible');
      fabWasVisible = false;
      if (fabPlant) { fabPlant.classList.remove('is-visible'); fabPlantWasVisible = false; }
      if (fabBackpack) fabBackpack.classList.add('is-hidden');
      return;
    }
    if (canAdvance(state.season)) {
      const wasVis = fabWasVisible;
      fab.classList.add('is-visible');
      fab.textContent = getAdvanceLabel();
      pulseOnEnter(fab, wasVis);
      fabWasVisible = true;
    } else {
      fab.classList.remove('is-visible');
      fabWasVisible = false;
    }

    if (fabPlant) {
      if (state.season.phase === PHASES.PLANNING) {
        const wasVis = fabPlantWasVisible;
        fabPlant.classList.add('is-visible');
        pulseOnEnter(fabPlant, wasVis);
        fabPlantWasVisible = true;
      } else {
        fabPlant.classList.remove('is-visible');
        fabPlantWasVisible = false;
        if (cropPaletteOpen) closePalette();
      }
    }

    if (fabBackpack) {
      fabBackpack.classList.remove('is-hidden');
    }
  }

  const SEASON_ICONS = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };
  const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

  function getRotatedSeasonLabel(seasonId) {
    const order = ['spring', 'summer', 'fall', 'winter'];
    const idx = order.indexOf(seasonId);
    const next = order[(idx + 1) % order.length] ?? 'spring';
    return SEASON_LABELS[next];
  }

  function updateHUD() {
    hudChapter.textContent = `Ch ${state.campaign.currentChapter}`;
    hudPhase.textContent = getPhaseLabel(state.season.phase);
    const planted = state.season.grid.filter((cell) => cell.cropId !== null).length;
    hudCrops.textContent = `${planted} / 32`;

    const scoreResult = state.season.harvestResult
      ?? scoreBed(state.season.grid, state.season.siteConfig, state.season.season, state.campaign.pantry);
    hudScore.textContent = scoreResult.score > 0 ? String(scoreResult.score) : '--';

    if (hudAction) {
      const visible = gameInputEnabled && !cutsceneMachine.isActive() && !interventionTargetState && canAdvance(state.season);
      hudAction.textContent = getAdvanceLabel();
      hudAction.disabled = !visible;
      hudAction.classList.toggle('is-visible', visible);
    }

    // Season icon
    const seasonIcon = document.getElementById('hud-season-icon');
    if (seasonIcon) seasonIcon.textContent = SEASON_ICONS[state.season.season] || '🌱';

    // Auto-show event card if event is active but card isn't rendered
    const inBeatPhase = [PHASES.EARLY_SEASON, PHASES.MID_SEASON, PHASES.LATE_SEASON].includes(state.season.phase);
    if (inBeatPhase && state.season.eventActive && state.season.interventionChosen === null && gameInputEnabled && !cutsceneMachine.isActive()) {
      const existingCard = panelContainer.querySelector('.event-card-sheet');
      if (!existingCard) {
        openEventCard();
      }
    }

    // Intervention tokens (show during beat phases)
    const tokensEl = document.getElementById('hud-tokens');
    if (tokensEl) {
      const inBeat = [PHASES.EARLY_SEASON, PHASES.MID_SEASON, PHASES.LATE_SEASON].includes(state.season.phase);
      tokensEl.style.display = inBeat ? '' : 'none';
      if (inBeat) {
        const remaining = state.season.interventionTokens ?? 0;
        tokensEl.innerHTML = Array.from({ length: 3 }, (_, i) =>
          `<span class="token-dot${i >= remaining ? ' spent' : ''}"></span>`
        ).join('');
      }
    }

    if (phaseHelper) {
      const planted = state.season.grid.filter((cell) => cell.cropId !== null).length;
      const isWinter = state.season.season === 'winter';
      let helperText = '';

      if (state.season.phase === PHASES.PLANNING) {
        if (isWinter) {
          helperText = state.season.winterReviewSeen
            ? 'Winter review complete. Continue to roll into the next chapter.'
            : 'Winter chapter. Review the year, the soil, and the carry-forward before spring returns.';
        } else if (planted < 8) {
          helperText = `Plant at least 8 crops to begin the season. ${8 - planted} more to go.`;
        } else {
          helperText = 'Bed is ready. Tap Commit Plan to begin Early Season.';
        }
      } else if (state.season.phase === PHASES.TRANSITION) {
        helperText = 'Season complete. Use Continue to roll into the next chapter.';
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
    cropPaletteOpen = true;
  }

  function closePalette() {
    const sheet = panelContainer.querySelector('#crop-palette-panel');
    if (sheet) {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    }
    cropPaletteOpen = false;
  }

  function buildBackpackData() {
    const keepsakeSlots = getKeepsakeSlots();
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

    return {
      keepsakeSlots,
      unlockedKeepsakes,
      recipesCompleted,
      totalRecipes: Object.keys(getRecipes()).length,
      pantryEntries,
      seasonHistory: state.campaign.seasonHistory ?? [],
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
      if (fabBackpack) fabBackpack.classList.remove('is-open');
    });
    backpackOpen = true;
    if (fabBackpack) fabBackpack.classList.add('is-open');
  }

  function openWinterReviewOverlay() {
    setGameInputEnabled(false);
    scene.clearTargeting?.();
    closePanelSheets();
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer.querySelector('#winter-review-overlay')?.remove();

    const mount = document.createElement('div');
    mount.id = 'winter-review-overlay';
    overlayContainer.appendChild(mount);

    showWinterReview(mount, buildWinterReviewData(), {
      onViewBackpack: () => {
        showBackpack();
      },
      onContinue: () => {
        mount.remove();
        state.season.winterReviewSeen = true;
        state.season.phase = PHASES.TRANSITION;
        updateHUD();
        persistState();
        setGameInputEnabled(true);
        openSeasonTransitionOverlay();
      },
    });
  }

  function closeBackpackPanel() {
    const sheet = panelContainer.querySelector('#backpack-panel');
    if (sheet) {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    }
    backpackOpen = false;
    if (fabBackpack) fabBackpack.classList.remove('is-open');
  }

  function closePanelSheets() {
    panelContainer.innerHTML = '';
    cropPaletteOpen = false;
    backpackOpen = false;
    if (fabBackpack) fabBackpack.classList.remove('is-open');
    if (!interventionTargetState) {
      scene.clearTargeting?.();
    }
  }

  function clearInterventionTargeting() {
    interventionTargetState = null;
    scene.clearTargeting?.();
    const sheet = panelContainer.querySelector('#intervention-target-panel');
    if (sheet) {
      sheet.remove();
    }
  }

  function getCellLabel(cellIndex) {
    const row = Math.floor(cellIndex / 8) + 1;
    const col = (cellIndex % 8) + 1;
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

    panelContainer.innerHTML = '';
    panelContainer.appendChild(sheet);
  }

  function finalizeInterventionChoice(interventionId, targetA = -1, targetB = -1) {
    clearInterventionTargeting();
    state.season.interventionChosen = interventionId;
    if (interventionId !== 'accept_loss') {
      state.season.interventionTokens = Math.max(0, state.season.interventionTokens - 1);
    }

    const targetIndices = [targetA, targetB]
      .filter((index) => Number.isInteger(index) && index >= 0)
      .filter((index, position, arr) => arr.indexOf(index) === position);
    const targetCropNames = targetIndices
      .map((index) => getCropById(state.season.grid[index]?.cropId)?.name)
      .filter(Boolean);

    applyIntervention(state.season.grid, interventionId, targetA, targetB);

    const resolvedEvent = state.season.eventActive;
    state.season.lastResolvedEvent = resolvedEvent ? { ...resolvedEvent } : null;
    state.season.lastEventEffectSummary = applyEventEffect(state.season.grid, resolvedEvent);
    state.season.eventActive = null;

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
      2200
    );
    persistState();
    setGameInputEnabled(false);
    handleNarrativeTrigger({
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
      2200
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
      if (fabBackpack) fabBackpack.classList.add('is-open');
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

    // Screen shake for negative events
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

    // Harvest score glow
    hudScore.classList.add('is-harvest-glow');

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
          if (fabBackpack) fabBackpack.classList.add('is-open');
        },
      },
      () => {
        // Reset harvest score glow
        hudScore.classList.remove('is-harvest-glow');

        persistState();

        if (state.season.phase === PHASES.HARVEST && canAdvance(state.season)) {
          const transitionResult = advance(state);
          updateHUD();
          persistState();

          if (transitionResult.advanced && transitionResult.trigger) {
            handleNarrativeTrigger(transitionResult.trigger);
            return;
          }
        }

        setGameInputEnabled(true);
        updateHUD();
      }
    );
  }

  function openSeasonTransitionOverlay() {
    scene.clearTargeting?.();
    const overlayContainer = document.getElementById('overlay-container');
    const existing = overlayContainer.querySelector('#season-transition-overlay');
    if (existing) existing.remove();

    const nextChapter = state.campaign.currentChapter + 1;
    const campaignComplete = nextChapter > 12;
    const nextSeasonLabel = getRotatedSeasonLabel(state.season.season);

    const overlay = document.createElement('div');
    overlay.className = 'chapter-intro';
    overlay.id = 'season-transition-overlay';
    overlay.innerHTML = `
      <div class="chapter-num">Season Complete</div>
      <h2>${campaignComplete ? 'The Garden Stays' : `Chapter ${state.campaign.currentChapter} Complete`}</h2>
      <p>
        ${campaignComplete
          ? 'You have reached the end of the current campaign. Continue to view the closing season.'
          : state.season.season === 'winter'
            ? `Winter review is complete. Continue into Chapter ${nextChapter} and ${nextSeasonLabel}.`
            : `Late ${SEASON_LABELS[state.season.season]} is finished. Continue into Chapter ${nextChapter} and ${nextSeasonLabel}.`}
      </p>
      <div class="tap-hint" style="margin-top:20px;margin-bottom:10px;">
        ${campaignComplete ? 'Tap continue for the ending' : 'Tap continue to roll into the next season'}
      </div>
      <div class="start-choice-actions">
        <button type="button" class="start-choice-btn start-choice-btn--primary" id="season-transition-continue">
          ${campaignComplete ? 'Continue' : `Continue to Chapter ${nextChapter}`}
        </button>
      </div>
    `;

    overlay.querySelector('#season-transition-continue')?.addEventListener('click', () => {
      overlay.style.animation = 'fadeOutIntro 0.25s ease-in both';
      setTimeout(() => {
        overlay.remove();
        setGameInputEnabled(true);
        doAdvance();
      }, 220);
    });

    overlayContainer.appendChild(overlay);
  }

  function handleNarrativeTrigger(trigger) {
    if (!interventionTargetState) {
      scene.clearTargeting?.();
    }
    if (!trigger) {
      setGameInputEnabled(true);
      return;
    }

    const queued = cutsceneMachine.queueFromTrigger(trigger, state.campaign);
    if (!queued) {
      if (trigger.type === 'chapter_start' && state.season.season === 'winter' && !state.season.winterReviewSeen) {
        openWinterReviewOverlay();
        return;
      }
      if (trigger.type === 'event_drawn') {
        openEventCard();
      } else if (trigger.type === 'harvest_complete') {
        openHarvestReveal();
      } else if (trigger.type === 'chapter_complete') {
        openSeasonTransitionOverlay();
      } else {
        setGameInputEnabled(true);
      }
      return;
    }

    if (trigger.type === 'event_drawn') {
      postCutsceneAction = 'event';
    } else if (trigger.type === 'harvest_complete') {
      postCutsceneAction = 'harvest';
    } else if (trigger.type === 'chapter_complete') {
      postCutsceneAction = 'transition';
    } else if (trigger.type === 'chapter_start' && state.season.season === 'winter' && !state.season.winterReviewSeen) {
      postCutsceneAction = 'winter_review';
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
    if (!gameInputEnabled || cutsceneMachine.isActive()) return;
    if (!canAdvance(state.season)) {
      // Show helpful toast when player tries to advance without enough crops
      if (state.season.phase === PHASES.PLANNING && state.season.season !== 'winter') {
        const planted = state.season.grid.filter((c) => c.cropId !== null).length;
        if (planted < 8) {
          showToast(`Need at least 8 crops to commit (${planted} planted)`, 2400, 'error');
        }
      }
      return;
    }

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
    if (pauseMenuOpen) return;
    if (!gameInputEnabled || cutsceneMachine.isActive()) return;

    const cellIndex = scene.raycastCell(event.clientX, event.clientY);
    if (interventionTargetState) {
      handleInterventionTargetClick(cellIndex);
      return;
    }

    if (state.season.phase !== PHASES.PLANNING) return;

    if (cellIndex < 0) {
      if (!cropPaletteOpen) {
        showCropPalette();
      }
      return;
    }

    const cell = state.season.grid[cellIndex];
    if (cell.cropId && !state.selectedCropId) {
      cell.cropId = null;
      cell.damageState = null;
      showToast('Crop removed', 1400);
    } else if (state.selectedCropId) {
      const cropInfo = getCropById(state.selectedCropId);
      cell.cropId = state.selectedCropId;
      cell.damageState = null;
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
      return;
    }

    updateHUD();
  });

  document.addEventListener('keydown', (event) => {
    if (interventionTargetState) {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearInterventionTargeting();
        setGameInputEnabled(false);
        openEventCard();
      }
      return;
    }

    const activeReadOnlySheet = pauseContainer.querySelector('#season-journal-sheet, #bug-reports-sheet');
    if (event.key === 'Escape' && activeReadOnlySheet) {
      event.preventDefault();
      activeReadOnlySheet.querySelector('[data-close="true"]')?.click();
      return;
    }

    // Escape always toggles pause menu (unless cutscene skipping)
    if (event.key === 'Escape') {
      event.preventDefault();
      if (cutsceneMachine.isActive()) {
        cutsceneMachine.skip();
      } else {
        togglePauseMenu();
      }
      return;
    }

    // Block all input while paused
    if (pauseMenuOpen) return;

    if (cutsceneMachine.isActive()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cutsceneMachine.next();
      }
      return;
    }

    if (!gameInputEnabled) return;

    if (event.key === 'Enter') {
      doAdvance();
    } else if (event.key === 'p' || event.key === 'P') {
      showCropPalette();
    } else if (event.key === 'b' || event.key === 'B') {
      toggleBackpack();
    }
  });

  fab?.addEventListener('click', (event) => {
    event.stopPropagation();
    doAdvance();
  });

  hudAction?.addEventListener('click', (event) => {
    event.stopPropagation();
    doAdvance();
  });

  fabPlant?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.season.phase !== PHASES.PLANNING) return;
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

  // Pause button in HUD
  document.getElementById('hud-pause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePauseMenu();
  });

  // Pause menu system
  const pauseOverlay = document.getElementById('pause-menu');
  const pauseStatus = document.getElementById('pause-status');
  const pauseContainer = document.getElementById('panel-container');
  let pauseMenuOpen = false;

  function togglePauseMenu() {
    if (interventionTargetState) return;
    pauseMenuOpen = !pauseMenuOpen;
    if (pauseMenuOpen) {
      // Close other panels
      bugPanel?.classList.remove('is-open');
      if (cropPaletteOpen) closePalette();
      closePanelSheets();
      pauseStatus.textContent = `Chapter ${state.campaign.currentChapter} · ${getPhaseLabel(state.season.phase)}`;
      pauseOverlay.classList.add('is-open');
    } else {
      pauseOverlay.classList.remove('is-open');
    }
  }

  function closePauseMenu() {
    pauseMenuOpen = false;
    pauseOverlay.classList.remove('is-open');
  }

  document.getElementById('pause-resume')?.addEventListener('click', () => {
    togglePauseMenu();
  });

  document.getElementById('pause-journal')?.addEventListener('click', () => {
    closePauseMenu();
    showSeasonJournalSheet(pauseContainer, state.campaign.journalEntries || []);
  });

  document.getElementById('pause-bugs')?.addEventListener('click', () => {
    const BUGS_KEY = 'gos-story-bugs';
    closePauseMenu();
    try {
      const bugs = JSON.parse(localStorage.getItem(BUGS_KEY) || '[]');
      showBugReportsSheet(pauseContainer, Array.isArray(bugs) ? bugs : []);
    } catch {
      showBugReportsSheet(pauseContainer, []);
    }
  });

  document.getElementById('pause-restart')?.addEventListener('click', () => {
    if (!confirm('Restart this chapter? Your current grid progress will be lost.')) return;
    state.season = createSeasonState(state.campaign.currentChapter, state.season.season);
    state.selectedCropId = null;
    closePauseMenu();
    updateHUD();
    showToast('Chapter restarted.', 1800);
  });

  document.getElementById('pause-new')?.addEventListener('click', () => {
    if (!confirm('Return to the title screen? Unsaved progress in this session will be lost.')) return;
    pauseMenuOpen = false;
    pauseOverlay.classList.remove('is-open');
    loop.stop();
    showTitleScreen();
  });

  document.getElementById('pause-close')?.addEventListener('click', () => {
    closePauseMenu();
  });

  pauseOverlay?.addEventListener('click', (event) => {
    if (event.target === pauseOverlay) {
      closePauseMenu();
    }
  });

  // Bug report system
  const fabBug = document.getElementById('fab-bug');
  const bugPanel = document.getElementById('bug-panel');
  const bugText = document.getElementById('bug-text');
  const bugMeta = document.getElementById('bug-meta');
  const bugSend = document.getElementById('bug-send');
  const bugCancel = document.getElementById('bug-cancel');

  function toggleBugPanel() {
    if (interventionTargetState) return;
    // Close pause menu if open
    if (pauseMenuOpen) {
      pauseMenuOpen = false;
      pauseOverlay.classList.remove('is-open');
    }
    const isOpen = bugPanel.classList.toggle('is-open');
    if (isOpen) {
      bugText.value = '';
      bugText.focus();
      // Auto-fill game state context
      const meta = [
        `Chapter: ${state.campaign.currentChapter}`,
        `Phase: ${state.season.phase}`,
        `Season: ${state.season.season}`,
        `Crops: ${state.season.grid.filter(c => c.cropId).length}/32`,
        `Score: ${hudScore.textContent}`,
        `Time: ${new Date().toISOString()}`,
        `UA: ${navigator.userAgent.slice(0, 60)}`,
      ].join(' · ');
      bugMeta.textContent = meta;
    }
  }

  fabBug?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBugPanel();
  });

  bugCancel?.addEventListener('click', () => {
    bugPanel.classList.remove('is-open');
  });

  bugSend?.addEventListener('click', () => {
    const text = bugText.value.trim();
    if (!text) {
      bugText.focus();
      return;
    }

    const report = {
      text,
      chapter: state.campaign.currentChapter,
      phase: state.season.phase,
      season: state.season.season,
      beatIndex: state.season.beatIndex,
      score: hudScore.textContent,
      cropsPlanted: state.season.grid.filter(c => c.cropId).map(c => c.cropId),
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

    // Save to localStorage
    const BUGS_KEY = 'gos-story-bugs';
    try {
      const existing = JSON.parse(localStorage.getItem(BUGS_KEY) || '[]');
      existing.push(report);
      localStorage.setItem(BUGS_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Bug save failed:', e);
    }

    bugPanel.classList.remove('is-open');
    showToast('Bug report saved on this device.', 2500);
  });

  // Close bug panel on outside click
  document.addEventListener('click', (e) => {
    if (bugPanel?.classList.contains('is-open') && !bugPanel.contains(e.target) && e.target !== fabBug) {
      bugPanel.classList.remove('is-open');
    }
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
