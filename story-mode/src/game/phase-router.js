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

    if (postCutsceneAction === 'winter_review') {
      postCutsceneAction = null;
      openWinterReviewOverlay();
      return;
    }

    setGameInputEnabled(true);
  }

  function handleNarrativeTrigger(trigger) {
    const state = getState();

    clearSceneTargeting();

    if (!trigger) {
      setGameInputEnabled(true);
      return;
    }

    if (state.campaign?.sandbox && trigger.type === 'chapter_start') {
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

  function doAdvance() {
    const state = getState();

    if (!isGameInputEnabled() || cutsceneMachine.isActive()) return;
    if (!canAdvance(state.season)) {
      if (state.season.phase === PHASES.PLANNING && state.season.season !== 'winter' && !state.campaign?.sandbox) {
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

    if (!result.advanced) {
      setGameInputEnabled(true);
      return;
    }

    if (result.campaignComplete) {
      showEndGameOverlay();
      return;
    }

    if (!result.trigger) {
      showToast(getPhaseLabel(getState().season.phase), 1800);
      setGameInputEnabled(true);
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
