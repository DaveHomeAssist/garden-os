// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCutsceneMachine } from '../game/cutscene-machine.js';
import { createPhaseRouter } from '../game/phase-router.js';
import { createDialoguePanel } from './dialogue-panel.js';
import { setElementInteractive } from './focus-state.js';

const scene = (id, beats) => ({ id, priority: 1, skippable: true, beats });

/**
 * Wires the cutscene machine, dialogue panel and phase router the same way
 * ui-binder.js does, with a tiny HUD stand-in whose "Start Season" button is
 * only shown when updateHUD() runs while input is enabled.
 */
function setup() {
  document.body.innerHTML = `
    <div id="cutscene-layer" aria-hidden="true" inert><div id="dialogue-root"></div></div>
    <button id="fab-advance">Start Season</button>`;
  const layer = document.getElementById('cutscene-layer');
  const fab = document.getElementById('fab-advance');
  let inputEnabled = false;
  let router = null;
  const hud = {
    updateHUD: vi.fn(() => {
      const show = inputEnabled && !machine.isActive();
      fab.classList.toggle('is-visible', show);
      fab.disabled = !show;
    }),
  };
  const setGameInputEnabled = (enabled) => {
    inputEnabled = enabled;
    // Like ui-binder: enabling input only re-enables a FAB that is already visible.
    fab.disabled = !(enabled && fab.classList.contains('is-visible'));
  };
  const panel = createDialoguePanel(document.getElementById('dialogue-root'));
  const machine = createCutsceneMachine({
    onStateChange: (ui) => {
      panel.render(ui);
      setElementInteractive(layer, ui.visible);
    },
    onFinish: () => {
      panel.hide();
      setElementInteractive(layer, false);
      router?.onCutsceneFinish();
    },
    gardenScene: {},
  });
  router = createPhaseRouter({
    getState: () => ({ season: { season: 'spring', phase: 'EARLY_SEASON' }, campaign: {} }),
    isGameInputEnabled: () => inputEnabled,
    produceState: () => ({}),
    cutsceneMachine: machine,
    clearSceneTargeting: () => {},
    setGameInputEnabled,
    showToast: () => {},
    updateHUD: hud.updateHUD,
    persistState: () => {},
    openEventCard: () => {},
    openHarvestReveal: () => {},
    openSeasonTransitionOverlay: () => {},
    openWinterReviewOverlay: () => {},
    showEndGameOverlay: () => {},
  });
  // Same handlers ui-binder attaches to the panel.
  panel.getSkipButton().addEventListener('click', (event) => {
    event.stopPropagation();
    machine.skip();
  });
  panel.getPanelElement().addEventListener('click', (event) => {
    if (panel.isChoiceTarget(event.target) || panel.hasVisibleChoices()) return;
    if (machine.isActive()) machine.next();
  });
  return { layer, fab, panel, machine, hud, isInputEnabled: () => inputEnabled };
}

describe('Skip cutscene cleanup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('closes the dialog, releases focus and restores the HUD after Skip', () => {
    const h = setup();
    // An event-beat style scene that finishes with no follow-up overlay
    // (e.g. the intervention_used scene after an event response).
    h.machine.start(scene('intervention_used', [
      { speaker: 'narrator', text: 'You let the frost have its way.' },
      { speaker: 'narrator', text: 'The consequence belongs to this beat now.' },
    ]), {});
    vi.runAllTimers();
    expect(h.layer.hasAttribute('inert')).toBe(false);
    expect(h.panel.getPanelElement().querySelector('#dp-advance-hint').style.opacity).toBe('1');

    const skip = h.panel.getSkipButton();
    skip.focus();
    expect(document.activeElement).toBe(skip);
    skip.click();

    expect(h.machine.isActive()).toBe(false);
    const panelEl = h.panel.getPanelElement();
    expect(panelEl.classList.contains('dp-panel--visible')).toBe(false);
    expect(panelEl.querySelector('#dp-text').textContent).toBe('');
    expect(panelEl.querySelector('#dp-advance-hint').hidden).toBe(true);
    expect(panelEl.querySelector('#dp-advance-hint').style.opacity).toBe('0');
    expect(skip.style.display).toBe('none');
    expect(h.panel.hasVisibleChoices()).toBe(false);
    // Layer is inert + aria-hidden, and focus is no longer trapped inside it.
    expect(h.layer.hasAttribute('inert')).toBe(true);
    expect(h.layer.getAttribute('aria-hidden')).toBe('true');
    expect(h.layer.contains(document.activeElement)).toBe(false);
    // Input is back and the HUD was redrawn, so Start Season is usable again.
    expect(h.isInputEnabled()).toBe(true);
    expect(h.hud.updateHUD).toHaveBeenCalled();
    expect(h.fab.disabled).toBe(false);
  });

  it('clears leftover choices when a choice beat is skipped', () => {
    const h = setup();
    h.machine.start(scene('quest_talk:lila', [
      { speaker: 'narrator', text: 'Lila waves.', choices: [{ label: 'Goodbye' }] },
    ]), {});
    vi.runAllTimers();
    expect(h.panel.hasVisibleChoices()).toBe(true);
    h.panel.getSkipButton().click();
    expect(h.panel.hasVisibleChoices()).toBe(false);
    expect(h.fab.disabled).toBe(false);
  });

  it('does not let the Skip click bubble into tap-to-continue', () => {
    const h = setup();
    h.machine.start(scene('first', [{ speaker: 'narrator', text: 'First scene.' }]), {});
    vi.runAllTimers();
    // If the click bubbled to the panel, next() would fast-forward whatever
    // scene the queue starts after the skipped one.
    const next = vi.spyOn(h.machine, 'next');
    h.panel.getSkipButton().click();
    expect(next).not.toHaveBeenCalled();
    expect(h.machine.isActive()).toBe(false);
  });
});

describe('setElementInteractive', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('moves focus out of an element before making it inert and aria-hidden', () => {
    document.body.innerHTML = '<div id="pause-menu"><button id="pause-resume">Resume</button></div>';
    const menu = document.getElementById('pause-menu');
    const resume = document.getElementById('pause-resume');
    resume.focus();
    setElementInteractive(menu, false);
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(menu.hasAttribute('inert')).toBe(true);
    expect(menu.contains(document.activeElement)).toBe(false);
  });

  it('leaves focus alone when it is elsewhere', () => {
    document.body.innerHTML = '<div id="a"><button>A</button></div><button id="b">B</button>';
    const b = document.getElementById('b');
    b.focus();
    setElementInteractive(document.getElementById('a'), false);
    expect(document.activeElement).toBe(b);
  });
});
