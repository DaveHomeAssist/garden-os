/**
 * Overlay Screens — full-screen overlays for season transitions,
 * end-game, harvest reveals, and event cards.
 *
 * Extracted from ui-binder.js to isolate modal UI creation.
 */
import { PHASES } from '../game/state.js';
import { Actions } from '../game/store.js';
import { canAdvance, advance } from '../game/phase-machine.js';
import { scoreBed } from '../scoring/bed-score.js';
import { showEventCard } from './event-card.js';
import { showHarvestReveal } from './harvest-reveal.js';
import { showBackpackPanel } from './backpack-panel.js';
import { SEASON_LABELS } from './ui-constants.js';
import { getRotatedSeasonLabel } from './ui-data-builders.js';

export function createOverlayScreens(ctx) {
  function openEventCard() {
    if (!ctx.interventionTargeting.isActive()) {
      ctx.scene.clearTargeting?.();
    }
    ctx.closePanelSheets();
    const state = ctx.getState();
    const event = state.season.eventActive;
    if (!event) {
      ctx.setGameInputEnabled(true);
      ctx.updateHUD();
      return;
    }

    if (event.valence === 'negative') {
      ctx.triggerScreenShake();
    }

    showEventCard(ctx.panelContainer, event, state.season.interventionTokens, (interventionId) => {
      if (interventionId === 'accept_loss') {
        ctx.interventionTargeting.finalize(interventionId);
        return;
      }
      ctx.interventionTargeting.begin(interventionId);
    });
  }

  function openHarvestReveal() {
    ctx.scene.clearTargeting?.();
    ctx.closePanelSheets();
    const state = ctx.getState();
    if (!state.season.harvestResult) {
      ctx.setGameInputEnabled(true);
      ctx.updateHUD();
      return;
    }

    ctx.hudScore?.classList.add('is-harvest-glow');

    ctx.finalizeHarvestProgression();
    showHarvestReveal(
      document.getElementById('overlay-container'),
      ctx.getState().season.harvestResult,
      {
        keepsakes: ctx.getState().season.newlyEarnedKeepsakes
          .map((entry) => ctx.getKeepsakeById(entry.id))
          .filter(Boolean),
        unlockedCount: ctx.getState().campaign.keepsakes.length,
        totalKeepsakes: ctx.getKeepsakeSlots().length,
        recipeNames: (ctx.getState().season.harvestResult.recipeMatches ?? [])
          .map((recipeId) => ctx.getRecipeById(recipeId)?.name ?? recipeId),
        onViewBackpack: () => {
          ctx.showBackpack();
        },
      },
      () => {
        ctx.hudScore?.classList.remove('is-harvest-glow');
        ctx.persistState();

        const postState = ctx.getState();
        if (postState.season.phase === PHASES.HARVEST && canAdvance(postState.season)) {
          const transitionResult = ctx.produceState(Actions.ADVANCE_PHASE, (draft) => advance(draft));
          ctx.updateHUD();
          ctx.persistState();

          if (transitionResult.advanced && transitionResult.trigger) {
            ctx.phaseRouter.handleNarrativeTrigger(transitionResult.trigger);
            return;
          }
        }

        ctx.setGameInputEnabled(true);
        ctx.updateHUD();
      },
    );
  }

  function openSeasonTransition() {
    ctx.scene.clearTargeting?.();
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer?.querySelector('#season-transition-overlay')?.remove();

    const state = ctx.getState();
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
        ctx.setGameInputEnabled(true);
        ctx.phaseRouter.doAdvance();
      }, 220);
    });

    overlayContainer?.appendChild(overlay);
  }

  function showEndGame() {
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
      ctx.setGameInputEnabled(true);
    });
    overlayContainer?.appendChild(overlay);
  }

  return { openEventCard, openHarvestReveal, openSeasonTransition, showEndGame };
}
