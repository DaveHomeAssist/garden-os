/**
 * Intervention Targeting — manages the two-step intervention UI
 * (target selection, swap workflow, finalization).
 *
 * Extracted from ui-binder.js to isolate the intervention state machine.
 */
import { Actions } from '../game/store.js';
import {
  applyIntervention,
  getTargetableCells,
} from '../game/intervention.js';
import { applyEventEffect } from '../game/event-engine.js';
import { INTERVENTION_LABELS, INTERVENTION_PROMPTS } from './ui-constants.js';

export function createInterventionTargeting(ctx) {
  let targetState = null;

  function getCellLabel(cellIndex) {
    const cols = ctx.getState().season.gridCols ?? ctx.getState().season.grid?.cols ?? 8;
    const row = Math.floor(cellIndex / cols) + 1;
    const col = (cellIndex % cols) + 1;
    return `R${row} · C${col}`;
  }

  function clear() {
    targetState = null;
    ctx.scene.clearTargeting?.();
  }

  function isActive() {
    return targetState !== null;
  }

  function getState() {
    return targetState;
  }

  function showTargetPrompt() {
    if (!targetState) return;
    const { interventionId, firstCell } = targetState;
    const secondStep = interventionId === 'swap' && firstCell >= 0;
    const state = ctx.getState();
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
        clear();
        ctx.setGameInputEnabled(false);
        ctx.openEventCard();
        return;
      }

      if (event.target.closest('#target-back') && targetState?.interventionId === 'swap') {
        targetState.firstCell = -1;
        ctx.scene.setTargetableCells(getTargetableCells(ctx.getState().season.grid, 'swap'));
        showTargetPrompt();
      }
    });

    const panelContainer = ctx.panelContainer;
    if (panelContainer) {
      panelContainer.innerHTML = '';
      panelContainer.appendChild(sheet);
    }
  }

  function finalize(interventionId, targetA = -1, targetB = -1) {
    clear();
    const targetIndices = [targetA, targetB]
      .filter((index) => Number.isInteger(index) && index >= 0)
      .filter((index, position, indices) => indices.indexOf(index) === position);
    const targetCropNames = targetIndices
      .map((index) => ctx.getCropById(ctx.getState().season.grid[index]?.cropId)?.name)
      .filter(Boolean);

    const resolvedEvent = ctx.produceState(Actions.USE_INTERVENTION, (draft) => {
      draft.season.interventionChosen = interventionId;
      if (interventionId !== 'accept_loss') {
        draft.season.interventionTokens = Math.max(0, draft.season.interventionTokens - 1);
      }

      applyIntervention(draft.season.grid, interventionId, targetA, targetB);

      const nextResolvedEvent = draft.season.eventActive ? { ...draft.season.eventActive } : null;
      draft.season.lastResolvedEvent = nextResolvedEvent;
      draft.season.lastEventEffectSummary = applyEventEffect(draft.season.grid, nextResolvedEvent);
      draft.season.eventActive = null;
      return nextResolvedEvent;
    });

    if (targetA >= 0) ctx.scene.flashCell(targetA, 0xe8c84a, 450);
    if (targetB >= 0) ctx.scene.flashCell(targetB, 0xe8c84a, 450);

    const targetSummary = interventionId === 'swap' && targetA >= 0 && targetB >= 0
      ? `${getCellLabel(targetA)} ↔ ${getCellLabel(targetB)}`
      : targetA >= 0
        ? getCellLabel(targetA)
        : '';

    ctx.showToast(
      interventionId === 'accept_loss'
        ? 'Accepted the loss'
        : `${INTERVENTION_LABELS[interventionId]}${targetSummary ? ` · ${targetSummary}` : ''}`,
      2200,
    );
    ctx.persistState();
    ctx.setGameInputEnabled(false);
    ctx.phaseRouter.handleNarrativeTrigger({
      type: 'intervention_used',
      intervention: interventionId,
      season: ctx.getState().season.season,
      chapter: ctx.getState().season.chapter,
      eventCategory: resolvedEvent?.category ?? null,
      eventValence: resolvedEvent?.valence ?? null,
      eventTitle: resolvedEvent?.title ?? null,
      targetSummary,
      targetCount: targetIndices.length,
      targetCropNames,
    });
    ctx.updateHUD();
  }

  function begin(interventionId) {
    const state = ctx.getState();
    const validCells = getTargetableCells(state.season.grid, interventionId);
    if (validCells.length === 0) {
      ctx.showToast(`No valid targets for ${INTERVENTION_LABELS[interventionId]}.`, 2000);
      ctx.setGameInputEnabled(false);
      ctx.openEventCard();
      return;
    }

    targetState = { interventionId, firstCell: -1 };
    ctx.scene.setTargetableCells(validCells);
    ctx.setGameInputEnabled(true);
    showTargetPrompt();
    ctx.showToast(
      interventionId === 'swap'
        ? 'Tap the first highlighted cell to start the swap.'
        : 'Tap a highlighted bed cell to apply the intervention.',
      2200,
    );
    ctx.updateHUD();
  }

  function handleTargetClick(cellIndex) {
    if (!targetState) return;
    const { interventionId, firstCell } = targetState;
    const state = ctx.getState();
    const validCells = getTargetableCells(state.season.grid, interventionId, firstCell);
    if (cellIndex < 0 || !validCells.includes(cellIndex)) {
      ctx.showToast('Choose a highlighted cell.', 1400);
      return;
    }

    if (interventionId === 'swap' && firstCell < 0) {
      targetState.firstCell = cellIndex;
      ctx.scene.setTargetableCells(getTargetableCells(state.season.grid, 'swap', cellIndex));
      ctx.scene.flashCell(cellIndex, 0x8ba8b5, 350);
      showTargetPrompt();
      ctx.showToast(`First swap cell locked: ${getCellLabel(cellIndex)}. Choose an adjacent partner.`, 2200);
      return;
    }

    finalize(interventionId, firstCell >= 0 ? firstCell : cellIndex, cellIndex);
  }

  return { isActive, getState, clear, begin, handleTargetClick, finalize };
}
