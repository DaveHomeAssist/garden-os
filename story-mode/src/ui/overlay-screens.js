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
import { getProfileRecipeName } from '../data/player-profile.js';

/** H4: save-derived lists can be any JSON type; treat non-arrays as empty. */
const asArray = (value) => (Array.isArray(value) ? value : []);

function escapeOverlayText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createOverlayScreens(ctx) {
  function buildRecipeRewards(state) {
    return (state.season.harvestResult?.recipeMatches ?? []).map((recipeId) => {
      const recipe = ctx.getRecipeById?.(recipeId);
      return {
        id: recipeId,
        name: getProfileRecipeName(recipeId, recipe?.name, state.campaign),
        crops: (recipe?.crops ?? []).map((cropId) => {
          const crop = ctx.getCropById?.(cropId);
          return {
            id: cropId,
            name: crop?.name ?? cropId,
            short: crop?.short ?? cropId.slice(0, 4).toUpperCase(),
          };
        }),
      };
    });
  }

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

    // H4: never leave input locked if the reveal or its continue throws.
    try {
      ctx.finalizeHarvestProgression();
      showHarvestReveal(
        document.getElementById('overlay-container'),
        ctx.getState().season.harvestResult,
        {
          keepsakes: asArray(ctx.getState().season.newlyEarnedKeepsakes)
            .map((entry) => ctx.getKeepsakeById(entry?.id))
            .filter(Boolean),
          unlockedCount: asArray(ctx.getState().campaign.keepsakes).length,
          totalKeepsakes: ctx.getKeepsakeSlots().length,
          recipeNames: (ctx.getState().season.harvestResult.recipeMatches ?? [])
            .map((recipeId) => getProfileRecipeName(recipeId, ctx.getRecipeById(recipeId)?.name, ctx.getState().campaign)),
          recipeRewards: buildRecipeRewards(ctx.getState()),
          onViewBackpack: () => {
            ctx.showBackpack();
          },
        },
        () => {
          let handedOff = false;
          try {
            ctx.hudScore?.classList.remove('is-harvest-glow');
            ctx.persistState();

            const postState = ctx.getState();
            if (postState.season.phase === PHASES.HARVEST && canAdvance(postState.season)) {
              const transitionResult = ctx.produceState(Actions.ADVANCE_PHASE, (draft) => advance(draft));
              ctx.updateHUD();
              ctx.persistState();

              if (transitionResult.advanced && transitionResult.trigger) {
                ctx.phaseRouter.handleNarrativeTrigger(transitionResult.trigger);
                handedOff = true;
              }
            }
          } catch (error) {
            console.error('[GOS] Harvest continue failed:', error);
          } finally {
            if (!handedOff) {
              ctx.setGameInputEnabled(true);
              ctx.updateHUD();
            }
          }
        },
      );
    } catch (error) {
      console.error('[GOS] Harvest reveal failed:', error);
      ctx.hudScore?.classList.remove('is-harvest-glow');
      ctx.setGameInputEnabled(true);
      ctx.updateHUD();
    }
  }

  function openSeasonTransition() {
    ctx.scene.clearTargeting?.();
    const overlayContainer = document.getElementById('overlay-container');
    overlayContainer?.querySelector('#season-transition-overlay')?.remove();

    const state = ctx.getState();
    const isSandbox = state.campaign?.sandbox;
    // H3: chapter and season come from the save; keep them in range and
    // escape them before they reach innerHTML.
    const parsedChapter = Number.parseInt(state.campaign?.currentChapter, 10);
    const currentChapter = Number.isFinite(parsedChapter) && parsedChapter >= 1 ? parsedChapter : 1;
    const nextChapter = currentChapter + 1;
    const seasonId = state.season?.season;
    const seasonLabel = Object.prototype.hasOwnProperty.call(SEASON_LABELS, seasonId) ? SEASON_LABELS[seasonId] : 'The season';
    const campaignComplete = !isSandbox && nextChapter > 12;
    const nextSeasonLabel = getRotatedSeasonLabel(seasonId);

    const overlay = document.createElement('div');
    overlay.className = 'chapter-intro';
    overlay.id = 'season-transition-overlay';
    overlay.innerHTML = `
      <div class="chapter-num">Season Complete</div>
      <h2>${campaignComplete ? 'The Garden Stays' : isSandbox ? 'Season Complete' : `Chapter ${escapeOverlayText(currentChapter)} Complete`}</h2>
      <p>
        ${campaignComplete
          ? 'You have reached the end of the current campaign. Continue to view the closing season.'
          : isSandbox
            ? `${escapeOverlayText(seasonLabel)} is finished. Continue into ${escapeOverlayText(nextSeasonLabel)}.`
            : seasonId === 'winter'
              ? `Winter review is complete. Continue into Chapter ${escapeOverlayText(nextChapter)} and ${escapeOverlayText(nextSeasonLabel)}.`
              : `Late ${escapeOverlayText(seasonLabel)} is finished. Continue into Chapter ${escapeOverlayText(nextChapter)} and ${escapeOverlayText(nextSeasonLabel)}.`}
      </p>
      <div class="tap-hint" style="margin-top:20px;margin-bottom:10px;">
        ${campaignComplete ? 'Tap continue for the ending' : 'Tap continue to roll into the next season'}
      </div>
      <div class="start-choice-actions">
        <button type="button" class="start-choice-btn start-choice-btn--primary" id="season-transition-continue">
          ${campaignComplete ? 'Continue' : isSandbox ? `Continue to ${escapeOverlayText(nextSeasonLabel)}` : `Continue to Chapter ${escapeOverlayText(nextChapter)}`}
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
