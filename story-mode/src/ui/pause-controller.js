import { Actions } from '../game/store.js';
import { getPhaseLabel } from '../game/phase-machine.js';
import { createSeasonState } from '../game/state.js';
import { deleteCampaign } from '../game/save.js';
import { showSeasonJournalSheet, showBugReportsSheet } from './pause-panels.js';
import { showStoryLogSheet } from './story-log.js';
import { setButtonInteractive, setElementInteractive } from './focus-state.js';
import { createPlayerProfileEditor } from './player-profile-editor.js';

export function createPauseController({
  getState,
  dispatch,
  persistState,
  showToast,
  closePalette,
  closePanelSheets,
  syncToolHUDVisibility,
  updateHUD,
  stopLoop,
  cleanupGame,
  remount,
  slot,
  isInterventionTargeting,
  isCropPaletteOpen,
}) {
  const pauseOverlay = document.getElementById('pause-menu');
  const pauseStatus = document.getElementById('pause-status');
  const pauseContainer = document.getElementById('panel-container');
  const fabBug = document.getElementById('fab-bug');
  const bugPanel = document.getElementById('bug-panel');
  const bugText = document.getElementById('bug-text');
  const bugMeta = document.getElementById('bug-meta');
  const bugSend = document.getElementById('bug-send');
  const bugCancel = document.getElementById('bug-cancel');
  const hudScore = document.getElementById('hud-score');

  let pauseMenuOpen = false;

  setElementInteractive(pauseOverlay, false);
  setElementInteractive(bugPanel, false);
  setButtonInteractive(fabBug, true);

  function togglePauseMenu() {
    if (isInterventionTargeting()) return;
    pauseMenuOpen = !pauseMenuOpen;
    if (pauseMenuOpen) {
      bugPanel?.classList.remove('is-open');
      setElementInteractive(bugPanel, false);
      if (isCropPaletteOpen()) closePalette();
      closePanelSheets();
      const state = getState();
      if (pauseStatus) {
        pauseStatus.textContent = state.campaign?.sandbox
          ? `Free Play · ${getPhaseLabel(state.season.phase)}`
          : `Chapter ${state.campaign.currentChapter} · ${getPhaseLabel(state.season.phase)}`;
      }
      pauseOverlay?.classList.add('is-open');
      setElementInteractive(pauseOverlay, true);
    } else {
      pauseOverlay?.classList.remove('is-open');
      setElementInteractive(pauseOverlay, false);
    }
    syncToolHUDVisibility();
  }

  function closePauseMenu() {
    pauseMenuOpen = false;
    pauseOverlay?.classList.remove('is-open');
    setElementInteractive(pauseOverlay, false);
  }

  function showProfileSheet() {
    closePauseMenu();
    const state = getState();
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open profile-sheet';
    sheet.id = 'gardener-profile-sheet';
    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header read-only-sheet__header">
        <div>
          <div class="palette-title">Gardener Profile</div>
          <div class="read-only-sheet__subtitle">Saved with this campaign slot</div>
        </div>
        <button type="button" class="palette-dismiss read-only-sheet__close" data-close="true" aria-label="Close gardener profile">&times;</button>
      </div>
      <div class="profile-sheet__body"></div>
    `;

    const closeSheet = () => {
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    };

    const editor = createPlayerProfileEditor({
      initialProfile: state.campaign.playerProfile,
      title: 'Edit Gardener',
      subtitle: 'These choices update the in-scene character and future save slot label.',
      submitLabel: 'Save Profile',
      cancelLabel: 'Close',
      onSubmit(profile) {
        dispatch({
          type: Actions.UPDATE_PLAYER_PROFILE,
          payload: { profile },
        });
        persistState();
        updateHUD();
        showToast('Gardener profile updated.', 1800, 'success');
        closeSheet();
      },
      onCancel: closeSheet,
    });

    sheet.querySelector('.profile-sheet__body')?.appendChild(editor.element);
    sheet.addEventListener('click', (event) => {
      if (event.target.closest('[data-close="true"]')) closeSheet();
    });
    pauseContainer.innerHTML = '';
    pauseContainer.appendChild(sheet);
    editor.focus();
  }

  function isOpen() {
    return pauseMenuOpen;
  }

  // --- Pause menu button wiring ---
  document.getElementById('hud-pause')?.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePauseMenu();
  });

  document.getElementById('pause-resume')?.addEventListener('click', () => {
    togglePauseMenu();
  });

  document.getElementById('pause-journal')?.addEventListener('click', () => {
    closePauseMenu();
    const state = getState();
    showSeasonJournalSheet(pauseContainer, state.campaign.journalEntries || []);
  });

  document.getElementById('pause-story-log')?.addEventListener('click', () => {
    closePauseMenu();
    const state = getState();
    showStoryLogSheet(pauseContainer, state.campaign);
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
    const state = getState();
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
    stopLoop();
    cleanupGame();
    remount();
  });

  document.getElementById('pause-profile')?.addEventListener('click', () => {
    showProfileSheet();
  });

  document.getElementById('pause-new')?.addEventListener('click', () => {
    if (!confirm('Delete this save slot and return to the title screen? This cannot be undone.')) return;
    deleteCampaign(slot);
    closePauseMenu();
    stopLoop();
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

  // --- Bug panel wiring ---
  function toggleBugPanel() {
    if (isInterventionTargeting()) return;
    if (pauseMenuOpen) {
      pauseMenuOpen = false;
      pauseOverlay?.classList.remove('is-open');
      setElementInteractive(pauseOverlay, false);
    }
    const isOpen = bugPanel?.classList.toggle('is-open');
    setElementInteractive(bugPanel, Boolean(isOpen));
    if (isOpen) {
      if (bugText) {
        bugText.value = '';
        bugText.focus();
      }
      if (bugMeta) {
        const state = getState();
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
    setElementInteractive(bugPanel, false);
  });

  bugSend?.addEventListener('click', () => {
    const text = bugText?.value.trim();
    if (!text) {
      bugText?.focus();
      return;
    }

    const state = getState();
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
    setElementInteractive(bugPanel, false);
    showToast('Bug report saved on this device.', 2500);
  });

  const bugPanelOutsideHandler = (event) => {
    if (bugPanel?.classList.contains('is-open') && !bugPanel.contains(event.target) && event.target !== fabBug) {
      bugPanel.classList.remove('is-open');
    }
  };
  document.addEventListener('click', bugPanelOutsideHandler);

  return {
    toggle: togglePauseMenu,
    close: closePauseMenu,
    isOpen,
    toggleBugPanel,
    dispose() {
      document.removeEventListener('click', bugPanelOutsideHandler);
    },
  };
}
