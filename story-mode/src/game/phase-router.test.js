import { describe, expect, it, vi } from 'vitest';
import { createPhaseRouter } from './phase-router.js';

/**
 * Regression: Start Season in a beat with no event drawn (e.g. Chapter 2,
 * early summer) returned no trigger. doAdvance re-enabled input but never
 * redrew the HUD, which it had last drawn with input disabled, so Start
 * Season / Next and Plant stayed hidden and the season could not continue.
 *
 * The HUD stand-in mirrors ui-binder: updateHUD() shows the advance button
 * only while input is enabled, and setGameInputEnabled() only re-enables a
 * button that is already visible.
 */
function setup(advanceResult) {
  let inputEnabled = true;
  const fab = { visible: true, disabled: false };
  const updateHUD = vi.fn(() => {
    fab.visible = inputEnabled;
    fab.disabled = !inputEnabled;
  });
  const setGameInputEnabled = vi.fn((enabled) => {
    inputEnabled = enabled;
    fab.disabled = !(enabled && fab.visible);
  });
  const handlers = {
    openEventCard: vi.fn(),
    openHarvestReveal: vi.fn(),
    openSeasonTransitionOverlay: vi.fn(),
    openWinterReviewOverlay: vi.fn(),
    showEndGameOverlay: vi.fn(),
  };
  const router = createPhaseRouter({
    // EARLY_SEASON with no event and no choice: canAdvance() is true.
    getState: () => ({ season: { season: 'summer', phase: 'EARLY_SEASON', eventActive: null, interventionChosen: null, grid: [] }, campaign: {} }),
    isGameInputEnabled: () => inputEnabled,
    produceState: vi.fn(() => advanceResult),
    cutsceneMachine: { isActive: () => false, queueFromTrigger: vi.fn(() => false) },
    clearSceneTargeting: () => {},
    setGameInputEnabled,
    showToast: vi.fn(),
    updateHUD,
    persistState: () => {},
    ...handlers,
  });
  return { router, fab, updateHUD, setGameInputEnabled, handlers, isInputEnabled: () => inputEnabled };
}

describe('phase router: advancing without a narrative trigger', () => {
  it('redraws the HUD after re-enabling input when the new beat has no event', () => {
    const h = setup({ advanced: true, trigger: null });
    h.router.doAdvance();
    expect(h.isInputEnabled()).toBe(true);
    // Last HUD draw happened with input enabled, so the advance button is back.
    const lastHud = h.updateHUD.mock.invocationCallOrder.at(-1);
    const lastEnable = h.setGameInputEnabled.mock.invocationCallOrder.at(-1);
    expect(lastHud).toBeGreaterThan(lastEnable);
    expect(h.fab).toEqual({ visible: true, disabled: false });
    expect(h.handlers.openEventCard).not.toHaveBeenCalled();
  });

  it('redraws the HUD when the advance was refused', () => {
    const h = setup({ advanced: false });
    h.router.doAdvance();
    expect(h.isInputEnabled()).toBe(true);
    expect(h.fab).toEqual({ visible: true, disabled: false });
  });
});
