import { PHASES } from './state.js';
import { Actions } from './store.js';
import { advance, canAdvance, getPhaseLabel } from './phase-machine.js';

function createPhaseRouter({
  getState,
  isGameInputEnabled,
  produceState,
  cutsceneMachine,
  clearSceneTargeting,
  setGameInputEnabled,
  showToast,
  updateHUD,
  persistState,
  openEventCard,
  openHarvestReveal,
  openSeasonTransitionOverlay,
  openWinterReviewOverlay,
  showEndGameOverlay,
}) {
  let postCutsceneAction = null;

  function onCutsceneFinish() {
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

    if (postCutsceneAction === 'ending') {
      postCutsceneAction = null;
      showEndGameOverlay();
      return;
    }

    if (postCutsceneAction === 'winter_review') {
      postCutsceneAction = null;
      openWinterReviewOverlay();
      return;
    }

    // Re-enabling input alone is not enough: the HUD (Start Season / Next,
    // Plant, backpack) was last rendered while the cutscene was active, so it
    // is still hidden and inert. Refresh it or the player is stuck until
    // something else (e.g. the pause menu) happens to redraw the HUD.
    setGameInputEnabled(true);
    updateHUD();
  }

  function handleNarrativeTrigger(trigger) {
    const state = getState();

    clearSceneTargeting();

    // Every branch that hands control straight back must redraw the HUD after
    // re-enabling input (see onCutsceneFinish). Free Play's "Continue to
    // Summer" lands here with no cutscene: without updateHUD() Plant and
    // Start Season stayed hidden and a mouse-only player was stuck.
    if (!trigger) {
      setGameInputEnabled(true);
      updateHUD();
      return false;
    }

    if (state.campaign?.sandbox && trigger.type === 'chapter_start') {
      setGameInputEnabled(true);
      updateHUD();
      return false;
    }

    const queued = cutsceneMachine.queueFromTrigger(trigger, state.campaign);
    if (!queued) {
      if (trigger.type === 'chapter_start' && state.season.season === 'winter' && !state.season.winterReviewSeen) {
        openWinterReviewOverlay();
        return false;
      }
      if (trigger.type === 'event_drawn') {
        openEventCard();
      } else if (trigger.type === 'harvest_complete') {
        openHarvestReveal();
      } else if (trigger.type === 'chapter_complete') {
        openSeasonTransitionOverlay();
      } else {
        setGameInputEnabled(true);
        updateHUD();
      }
      return false;
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
    return true;
  }

  function doAdvance() {
    const state = getState();

    if (!isGameInputEnabled() || cutsceneMachine.isActive()) return;
    if (!canAdvance(state.season)) {
      if (state.season.phase === PHASES.PLANNING && state.season.season !== 'winter' && state.campaign?.sandbox) {
        showToast('Plant at least one crop before you start the season.', 2400, 'error');
      } else if (state.season.phase === PHASES.PLANNING && state.season.season !== 'winter') {
        const planted = state.season.grid.filter((cell) => cell.cropId !== null).length;
        if (planted < 8) {
          showToast(`Need at least 8 crops to commit (${planted} planted)`, 2400, 'error');
        }
      }
      return;
    }

    setGameInputEnabled(false);
    const result = produceState(Actions.ADVANCE_PHASE, (draft) => advance(draft));
    updateHUD();
    persistState();

    // updateHUD() above ran while input was disabled, so it hid Start Season /
    // Next, Plant and the backpack. Any branch that hands control straight back
    // (no cutscene, no event card) has to redraw the HUD after re-enabling
    // input, or the player is stuck in the new phase with every action hidden.
    if (!result.advanced) {
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

    if (result.campaignComplete) {
      // Play the written ending scene first (once per save), then the recap.
      clearSceneTargeting();
      const queued = cutsceneMachine.queueFromTrigger({ type: 'campaign_complete' }, getState().campaign);
      if (queued) {
        postCutsceneAction = 'ending';
      } else {
        showEndGameOverlay();
      }
      return;
    }

    if (!result.trigger) {
      // A beat with no event drawn (common in summer/fall) has no trigger.
      showToast(getPhaseLabel(getState().season.phase), 1800);
      setGameInputEnabled(true);
      updateHUD();
      return;
    }

    handleNarrativeTrigger(result.trigger);
  }

  return {
    canAdvance,
    doAdvance,
    handleNarrativeTrigger,
    onCutsceneFinish,
  };
}

export { createPhaseRouter };
