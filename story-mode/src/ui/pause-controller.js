import { FREEPLAY_SAVE_TARGET, isPersistentSaveTarget } from '../game/save-target.js';
import { Actions } from '../game/store.js';
import { getPhaseLabel } from '../game/phase-machine.js';
import { createSeasonState } from '../game/state.js';
import { deleteCampaign } from '../game/save.js';
import { describeSlotsForImportWithSnapshots, exportLiveState } from '../game/save-file.js';
import { downloadSaveFile, runImportFlow } from './save-transfer.js';
import { showSeasonJournalSheet, showBugReportsSheet } from './pause-panels.js';
import { showStoryLogSheet } from './story-log.js';
import { showBedsPanel } from './beds-panel.js';
import { showPacksPanel } from './packs-panel.js';
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
  playSFX = () => {},
  getArtQuality = () => null,
  setArtQuality = () => null,
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

  const isFreePlay = slot === FREEPLAY_SAVE_TARGET;
  const restartTitle = document.querySelector('#pause-restart .pause-action__title');
  if (restartTitle) restartTitle.textContent = isFreePlay ? 'Restart Season' : 'Restart Chapter';
  const targetDescription = slot === FREEPLAY_SAVE_TARGET ? 'Free Play world' : 'save slot';
  let pauseMenuOpen = false;

  // Everything below binds to static index.html elements that outlive this
  // session; dispose() aborts this so no closure keeps the session alive.
  const listenerAbort = new AbortController();
  const listenerOptions = { signal: listenerAbort.signal };

  setElementInteractive(pauseOverlay, false);
  setElementInteractive(bugPanel, false);
  setButtonInteractive(fabBug, true);

  function togglePauseMenu() {
    if (isInterventionTargeting()) return;
    pauseMenuOpen = !pauseMenuOpen;
    if (pauseMenuOpen) {
      playSFX('ui_click');
      bugPanel?.classList.remove('is-open');
      setElementInteractive(bugPanel, false);
      if (isCropPaletteOpen()) closePalette();
      closePanelSheets();
      const state = getState();
      if (pauseStatus) {
        // "Free Play rules" (campaign.sandbox) and "not saved" (slot < 0) are
        // different things: Keep gardening after the campaign is Free Play on
        // a real, saved slot.
        pauseStatus.textContent = state.campaign?.sandbox
          ? `Free Play · ${slot === FREEPLAY_SAVE_TARGET ? 'saved independently' : slot < 0 ? 'session only, not saved' : `saved in slot ${slot + 1}`} · ${getPhaseLabel(state.season.phase)}`
          : `Chapter ${state.campaign.currentChapter} · ${getPhaseLabel(state.season.phase)}`;
      }
      const mainMenuCopy = document.querySelector('#pause-main-menu .pause-action__copy');
      if (mainMenuCopy) {
        mainMenuCopy.textContent = slot < 0
          ? 'Leave this garden and return to the title screen. Unsaved Free Play is not kept.'
          : 'Save this run and return to the title screen.';
      }
      syncPauseThemeButton();
      syncPauseGraphicsButton();
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

  const GRAPHICS_ORDER = ['auto', 'high', 'low'];
  const GRAPHICS_LABEL = { auto: 'Auto', high: 'High', low: 'Low' };
  function syncPauseGraphicsButton() {
    const button = document.getElementById('pause-graphics');
    if (!button) return;
    const q = getArtQuality();
    if (!q) { button.hidden = true; return; }
    const title = button.querySelector('[data-pause-graphics-title]');
    const label = q.choice === 'auto' ? `Auto (${GRAPHICS_LABEL[q.tier]})` : GRAPHICS_LABEL[q.choice];
    if (title) title.textContent = `Graphics: ${label}`;
    button.setAttribute('aria-label', `Graphics quality ${label}. Activate to change.`);
  }

  function syncPauseThemeButton() {
    const button = document.getElementById('pause-theme');
    if (!button) return;
    const current = window.GardenTheme?.getTheme?.() === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    const icon = button.querySelector('[data-pause-theme-icon]');
    const title = button.querySelector('[data-pause-theme-title]');
    const copy = button.querySelector('[data-pause-theme-copy]');
    if (icon) icon.textContent = current === 'dark' ? '☀' : '☾';
    if (title) title.textContent = `Switch to ${next}`;
    if (copy) {
      copy.textContent = current === 'dark'
        ? 'Use the light appearance.'
        : 'Use the dark appearance.';
    }
    button.setAttribute('aria-label', `Switch to ${next} theme`);
  }

  function showProfileSheet() {
    playSFX('ui_click');
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
          <div class="read-only-sheet__subtitle">${slot < 0 ? 'Session only · changes are not saved' : `Saved with this ${targetDescription}`}</div>
        </div>
        <button type="button" class="palette-dismiss read-only-sheet__close" data-close="true" aria-label="Close gardener profile">&times;</button>
      </div>
      <div class="profile-sheet__body"></div>
    `;

    const closeSheet = () => {
      playSFX('ui_click');
      sheet.classList.remove('is-open');
      setTimeout(() => sheet.remove(), 260);
    };

    const editor = createPlayerProfileEditor({
      initialProfile: state.campaign.playerProfile,
      title: 'Edit Gardener',
      subtitle: slot < 0
        ? 'These choices last for this Free Play session only.'
        : `These choices update the in-scene character and this ${targetDescription}.`,
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
  }, listenerOptions);

  document.getElementById('pause-resume')?.addEventListener('click', () => {
    togglePauseMenu();
  }, listenerOptions);

  document.getElementById('pause-journal')?.addEventListener('click', () => {
    playSFX('ui_click');
    closePauseMenu();
    const state = getState();
    showSeasonJournalSheet(pauseContainer, state.campaign.journalEntries || []);
  }, listenerOptions);

  document.getElementById('pause-beds')?.addEventListener('click', () => {
    playSFX('ui_click');
    closePauseMenu();
    showBedsPanel(pauseContainer, {
      getState,
      dispatch,
      showToast,
      onChange: () => {
        persistState();
        updateHUD?.();
      },
    });
  }, listenerOptions);

  document.getElementById('pause-packs')?.addEventListener('click', () => {
    playSFX('ui_click');
    closePauseMenu();
    showPacksPanel(pauseContainer, { persistState });
  }, listenerOptions);

  document.getElementById('pause-story-log')?.addEventListener('click', () => {
    playSFX('ui_click');
    closePauseMenu();
    const state = getState();
    showStoryLogSheet(pauseContainer, state.campaign);
  }, listenerOptions);

  document.getElementById('pause-bugs')?.addEventListener('click', () => {
    playSFX('ui_click');
    const bugsKey = 'gos-story-bugs';
    closePauseMenu();
    try {
      const bugs = JSON.parse(localStorage.getItem(bugsKey) || '[]');
      showBugReportsSheet(pauseContainer, Array.isArray(bugs) ? bugs : []);
    } catch {
      showBugReportsSheet(pauseContainer, []);
    }
  }, listenerOptions);

  // Export the live in-memory state, not localStorage: when the IndexedDB
  // authority cache is active the session never writes the localStorage slot,
  // so reading it back exported nothing (or a stale save).
  document.getElementById('pause-export')?.addEventListener('click', () => {
    playSFX('ui_click');
    persistState();
    const state = getState();
    if (!isPersistentSaveTarget(slot)) {
      showToast('Free Play is not saved, so there is nothing to export.', 2400);
      return;
    }
    const file = exportLiveState(state, slot);
    const name = file ? downloadSaveFile(file, { slot }) : null;
    if (!name) {
      showToast('Could not create the save file.', 2400);
      return;
    }
    showToast(`Save downloaded as ${name}.`, 2600, 'success');
  }, listenerOptions);

  document.getElementById('pause-import')?.addEventListener('click', async (event) => {
    if (!isPersistentSaveTarget(slot)) {
      showToast('Free Play has no save slot to import into.', 2400);
      return;
    }
    playSFX('ui_click');
    const launcher = event.currentTarget;
    // The dialog validates + migrates the file and confirms the overwrite
    // before anything is written; the session signal closes it on teardown.
    // Read slot occupancy with the IndexedDB authority snapshots, like the
    // title flow; the localStorage-only view calls the live save "unreadable".
    const result = await runImportFlow({
      fixedSlot: slot,
      slots: () => describeSlotsForImportWithSnapshots(),
      launcher,
      signal: listenerAbort.signal,
    });
    if (!result.ok || listenerAbort.signal.aborted) return;
    showToast('Save imported.', 2200, 'success');
    closePauseMenu();
    stopLoop();
    cleanupGame();
    remount();
  }, listenerOptions);

  document.getElementById('pause-restart')?.addEventListener('click', () => {
    if (!confirm(isFreePlay ? 'Restart this Free Play season? Your current grid progress will be lost.' : 'Restart this chapter? Your current grid progress will be lost.')) return;
    const state = getState();
    dispatch({
      type: Actions.RESET_SEASON,
      payload: {
        season: createSeasonState(state.campaign.currentChapter, state.season.season, state.campaign, state.season.gridCols, state.season.gridRows),
        selectedCropId: null,
      },
    });
    closePauseMenu();
    updateHUD();
    showToast(isFreePlay ? 'Free Play season restarted.' : 'Chapter restarted.', 1800);
  }, listenerOptions);

  document.getElementById('pause-main-menu')?.addEventListener('click', () => {
    persistState();
    closePauseMenu();
    stopLoop();
    cleanupGame();
    remount();
  }, listenerOptions);

  document.getElementById('pause-profile')?.addEventListener('click', () => {
    showProfileSheet();
  }, listenerOptions);

  document.getElementById('pause-graphics')?.addEventListener('click', () => {
    playSFX('ui_click');
    const q = getArtQuality();
    if (!q) return;
    const next = GRAPHICS_ORDER[(GRAPHICS_ORDER.indexOf(q.choice) + 1) % GRAPHICS_ORDER.length];
    const applied = setArtQuality(next);
    syncPauseGraphicsButton();
    showToast(`Graphics: ${next === 'auto' ? `Auto (${GRAPHICS_LABEL[applied?.tier] ?? ''})` : GRAPHICS_LABEL[next]}.`, 1400);
  }, listenerOptions);

  document.getElementById('pause-theme')?.addEventListener('click', () => {
    playSFX('ui_click');
    const current = window.GardenTheme?.getTheme?.() === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    if (window.GardenTheme?.setTheme) {
      window.GardenTheme.setTheme(next);
    } else {
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    }
    syncPauseThemeButton();
    showToast(`Switched to ${next} theme.`, 1400);
  }, listenerOptions);

  document.getElementById('pause-new')?.addEventListener('click', () => {
    if (!confirm(`Delete this ${targetDescription} and return to the title screen? This cannot be undone. Export a save first if you want a copy.`)) return;
    deleteCampaign(slot);
    closePauseMenu();
    stopLoop();
    cleanupGame();
    remount();
  }, listenerOptions);

  document.getElementById('pause-close')?.addEventListener('click', () => {
    closePauseMenu();
  }, listenerOptions);

  pauseOverlay?.addEventListener('click', (event) => {
    if (event.target === pauseOverlay) {
      closePauseMenu();
    }
  }, listenerOptions);

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
  }, listenerOptions);

  bugCancel?.addEventListener('click', () => {
    bugPanel?.classList.remove('is-open');
    setElementInteractive(bugPanel, false);
  }, listenerOptions);

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
    showToast('Bug report saved on this device. Export it from Pause → Bug Reports.', 3200);
  }, listenerOptions);

  const bugPanelOutsideHandler = (event) => {
    if (bugPanel?.classList.contains('is-open') && !bugPanel.contains(event.target) && event.target !== fabBug) {
      bugPanel.classList.remove('is-open');
    }
  };
  document.addEventListener('click', bugPanelOutsideHandler, listenerOptions);

  return {
    toggle: togglePauseMenu,
    close: closePauseMenu,
    isOpen,
    toggleBugPanel,
    dispose() {
      listenerAbort.abort();
    },
  };
}
