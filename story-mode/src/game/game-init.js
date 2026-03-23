import { createGameState, createSandboxState, createSeasonState } from './state.js';
import { Store } from './store.js';
import {
  deleteCampaign,
  listSaves,
  loadCampaign,
  loadSeasonState,
  setActiveSaveSlot,
  subscribeToStoreSaves,
} from './save.js';
import { getCropById, getCropsForChapter, getRecipeById, getRecipes } from '../data/crops.js';
import { getKeepsakeById, getKeepsakeSlots } from '../data/keepsakes.js';
import { showGameplayGuide } from '../ui/gameplay-guide.js';

const GRADE_DOT_CLASS = {
  'A+': 'sparkline-dot--a', A: 'sparkline-dot--a',
  'B+': 'sparkline-dot--b', B: 'sparkline-dot--b',
  'C+': 'sparkline-dot--c', C: 'sparkline-dot--c',
  D: 'sparkline-dot--d',
  F: 'sparkline-dot--f',
};

const GAME_DATA = {
  getCropById,
  getCropsForChapter,
  getRecipeById,
  getRecipes,
  getKeepsakeById,
  getKeepsakeSlots,
};

function getProgressClass(campaign) {
  const entries = campaign.journalEntries ?? [];
  if (!entries.length) return '';
  const lastGrade = entries[entries.length - 1]?.grade ?? '';
  if (['A+', 'A', 'B+', 'B'].includes(lastGrade)) return '';
  if (['C+', 'C'].includes(lastGrade)) return 'progress-mid';
  return 'progress-low';
}

function createInitialState(slot, savedCampaign) {
  const initialState = createGameState();

  if (!savedCampaign) {
    return initialState;
  }

  Object.assign(initialState.campaign, savedCampaign);
  const savedSeason = loadSeasonState(slot);

  if (savedSeason) {
    Object.assign(initialState.season, savedSeason);
    initialState.season.campaign = initialState.campaign;
  } else {
    initialState.season = createSeasonState(
      initialState.campaign.currentChapter,
      initialState.campaign.currentSeason ?? 'spring',
      initialState.campaign,
    );
  }

  return initialState;
}

function dismissTitleScreen(titleScreen, callback) {
  titleScreen.classList.add('is-exiting');
  setTimeout(() => {
    titleScreen.style.display = 'none';
    callback();
  }, 400);
}

function renderTitleScreen(onStart) {
  const titleScreen = document.getElementById('title-screen');
  const slotsContainer = document.getElementById('save-slots');
  const modesContainer = document.getElementById('title-modes');
  const actionsContainer = document.getElementById('title-actions');
  if (!titleScreen || !slotsContainer) return;

  titleScreen.classList.remove('is-exiting');
  titleScreen.style.display = '';

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
      const cls = GRADE_DOT_CLASS[gh.grade] ?? '';
      return `<span class="sparkline-dot ${cls}" title="Ch${gh.chapter}: ${gh.grade}"></span>`;
    }).join('');
    const dateStr = entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : 'unknown';
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
          ${sparkline ? `<div class="save-slot-sparkline">${sparkline}</div>` : ''}
        </div>
        <div class="save-slot-actions">
          <button type="button" class="save-slot-btn save-slot-btn--primary" data-action="continue" data-slot="${entry.slot}">Continue</button>
          <button type="button" class="save-slot-btn save-slot-btn--danger" data-action="delete" data-slot="${entry.slot}">Delete</button>
        </div>
      </div>`;
  }).join('');

  if (modesContainer) {
    modesContainer.innerHTML = `
      <div class="mode-card mode-card--active" data-mode="story">
        <span class="mode-icon">📖</span>
        <span>Story Mode</span>
      </div>
      <div class="mode-card mode-card--selectable" data-mode="freeplay">
        <span class="mode-icon">🌿</span>
        <span>Free Play</span>
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

    let selectedMode = 'story';
    modesContainer.addEventListener('click', (event) => {
      const card = event.target.closest('[data-mode]');
      if (!card || card.classList.contains('mode-card--locked')) return;
      selectedMode = card.dataset.mode;
      modesContainer.querySelectorAll('.mode-card').forEach((c) => {
        c.classList.toggle('mode-card--active', c.dataset.mode === selectedMode);
        if (c.dataset.mode && !c.classList.contains('mode-card--locked')) {
          c.classList.toggle('mode-card--selectable', c.dataset.mode !== selectedMode);
        }
      });
      updateSlotsVisibility();
    });

    const freeplayBtn = document.createElement('button');
    freeplayBtn.type = 'button';
    freeplayBtn.className = 'save-slot-btn save-slot-btn--primary freeplay-start-btn';
    freeplayBtn.textContent = 'Start Free Play';
    freeplayBtn.style.display = 'none';
    freeplayBtn.addEventListener('click', () => {
      dismissTitleScreen(titleScreen, () => {
        onStart({
          slot: -1,
          viewport: document.getElementById('viewport'),
          initialState: createSandboxState(),
          sandbox: true,
        });
      });
    });
    slotsContainer.parentNode.insertBefore(freeplayBtn, slotsContainer.nextSibling);

    function updateSlotsVisibility() {
      const isFreeplay = selectedMode === 'freeplay';
      slotsContainer.style.display = isFreeplay ? 'none' : '';
      freeplayBtn.style.display = isFreeplay ? '' : 'none';
    }
  }

  if (actionsContainer) {
    const guideButton = actionsContainer.querySelector('#title-how-to-play');
    if (guideButton) {
      const freshGuideButton = guideButton.cloneNode(true);
      guideButton.parentNode.replaceChild(freshGuideButton, guideButton);
      freshGuideButton.addEventListener('click', (event) => {
        showGameplayGuide({ launcher: event.currentTarget });
      });
    }
  }

  const freshSlots = slotsContainer.cloneNode(true);
  slotsContainer.parentNode.replaceChild(freshSlots, slotsContainer);

  freshSlots.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const slot = parseInt(button.dataset.slot, 10);

    if (action === 'delete') {
      if (!confirm(`Delete save in Slot ${slot + 1}? This cannot be undone.`)) return;
      deleteCampaign(slot);
      renderTitleScreen(onStart);
      return;
    }

    if (action === 'new') {
      setActiveSaveSlot(slot);
      dismissTitleScreen(titleScreen, () => {
        onStart({
          slot,
          viewport: document.getElementById('viewport'),
          initialState: createInitialState(slot, null),
        });
      });
      return;
    }

    if (action === 'continue') {
      const savedCampaign = loadCampaign(slot);
      setActiveSaveSlot(slot);
      dismissTitleScreen(titleScreen, () => {
        onStart({
          slot,
          viewport: document.getElementById('viewport'),
          initialState: createInitialState(slot, savedCampaign),
        });
      });
    }
  });
}

function showTitleScreen(onStart) {
  const titleScreen = document.getElementById('title-screen');
  if (titleScreen) {
    titleScreen.classList.remove('is-exiting');
    titleScreen.style.display = '';
  }
  renderTitleScreen(onStart);
}

function initGame(initialState, { slot }) {
  const store = new Store(initialState);
  const unsubscribePersistence = subscribeToStoreSaves(store, () => slot, {
    shouldPersist: (_nextState, action) => action?.meta?.persist !== false,
  });

  return {
    store,
    data: GAME_DATA,
    cleanup() {
      unsubscribePersistence();
    },
  };
}

export {
  initGame,
  showTitleScreen,
};
