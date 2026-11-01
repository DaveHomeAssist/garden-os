// @vitest-environment jsdom
// iPad UI pass (Dave's Oct 30 iPad screenshots): collapsible Quests tracker,
// readable quest log on the cream field-kit sheet, Field Note tag clear of
// Skip, and a touch-reachable World Map entry in the pause menu.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FestivalEngine } from '../game/festivals.js';
import { QuestEngine } from '../game/quest-engine.js';
import { createGameState } from '../game/state.js';
import { Store } from '../game/store.js';
import { createDialoguePanel } from './dialogue-panel.js';
import { createQuestController } from './quest-controller.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8').replace(/\r\n/g, '\n');
const questCss = read('../../assets/css/hud-quests.css');
const themeCss = read('../../assets/css/theme.css');
const indexHtml = read('../../index.html');
const binderSrc = read('./ui-binder.js');

const COLLAPSE_KEY = 'gos-quest-tracker-collapsed';

function setupController() {
  const state = createGameState();
  state.campaign.worldState.currentZone = 'neighborhood';
  const store = new Store(state);
  const sessionListeners = new AbortController();
  const controller = createQuestController({
    store,
    questEngine: new QuestEngine(store),
    festivalEngine: new FestivalEngine(store),
    cutsceneMachine: { isActive: () => false, start: () => {} },
    getZoneId: () => store.getState().campaign.worldState.currentZone,
    showToast: () => {},
    hudRoot: document.body,
    signal: sessionListeners.signal,
  });
  return { controller, sessionListeners };
}

function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`))?.[1] ?? null;
}

describe('collapsible Quests tracker', () => {
  let harness = null;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.body.dataset.storyScreen = 'play';
  });

  afterEach(() => {
    harness?.controller.dispose();
    harness?.sessionListeners.abort();
    harness = null;
    localStorage.clear();
  });

  it('collapses and expands the list without opening the quest log', () => {
    harness = setupController();
    const tracker = document.querySelector('.quest-tracker');
    const collapse = () => tracker.querySelector('[data-quest-tracker-collapse]');
    expect(collapse()).not.toBeNull();
    expect(collapse().getAttribute('aria-expanded')).toBe('true');
    expect(tracker.classList.contains('is-collapsed')).toBe(false);
    expect(tracker.querySelector('.quest-tracker__list, .quest-tracker__empty')).not.toBeNull();

    collapse().click();
    expect(tracker.classList.contains('is-collapsed')).toBe(true);
    expect(collapse().getAttribute('aria-expanded')).toBe('false');
    expect(tracker.querySelector('.quest-tracker__list, .quest-tracker__empty')).toBeNull();
    // Header stays so the count and the Q shortcut are still visible.
    expect(tracker.querySelector('[data-quest-log-toggle]')).not.toBeNull();
    expect(harness.controller.isLogOpen()).toBe(false);
    expect(localStorage.getItem(COLLAPSE_KEY)).toBe('1');

    collapse().click();
    expect(tracker.classList.contains('is-collapsed')).toBe(false);
    expect(collapse().getAttribute('aria-expanded')).toBe('true');
    expect(harness.controller.isLogOpen()).toBe(false);
    expect(localStorage.getItem(COLLAPSE_KEY)).toBe('0');
  });

  it('still opens the quest log from the header button', () => {
    harness = setupController();
    document.querySelector('.quest-tracker [data-quest-log-toggle]').click();
    expect(harness.controller.isLogOpen()).toBe(true);
  });

  it('restores the collapsed state from localStorage on the next session', () => {
    localStorage.setItem(COLLAPSE_KEY, '1');
    harness = setupController();
    const tracker = document.querySelector('.quest-tracker');
    expect(tracker.classList.contains('is-collapsed')).toBe(true);
    expect(tracker.querySelector('[data-quest-tracker-collapse]').getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the existing step-aside rules for the collapsed tracker', () => {
    // .quest-tracker.is-collapsed only changes width/padding; it must never
    // set display, or it would override the display:none step-aside rules.
    const collapsed = ruleBody(questCss, '.quest-tracker.is-collapsed');
    expect(collapsed).not.toBeNull();
    expect(collapsed).not.toMatch(/display\s*:/);
  });
});

describe('quest log contrast on the cream sheet', () => {
  const OLD_LIGHT = /#f7f2ea|rgba\(247,\s*242,\s*234/i;

  for (const selector of [
    '.quest-log__title',
    '.quest-log__subtitle',
    '.quest-log__heading',
    '.quest-log__heading span',
    '.quest-log__desc',
    '.quest-log .quest-log__steps li',
    '.quest-log__drop',
  ]) {
    it(`${selector} uses dark ink, not the old light-on-dark colour`, () => {
      const body = ruleBody(questCss, selector);
      expect(body, `${selector} rule missing`).not.toBeNull();
      const color = body.match(/(?:^|\n|;)\s*color:\s*([^;]+);/)?.[1] ?? '';
      expect(color).not.toBe('');
      expect(color).not.toMatch(OLD_LIGHT);
      expect(color).not.toMatch(/#e8c84a/i);
    });
  }
});

describe('Field Note tag clears Skip', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('offsets the tag by a CSS variable with the old values as fallbacks', () => {
    expect(themeCss).toMatch(/\.dp-panel::before \{\s*right: var\(--dp-skip-clear, 88px\);/);
    expect(themeCss).toMatch(/right: var\(--dp-skip-clear, 74px\);/);
  });

  it('sets --dp-skip-clear from Skip and drops the reserve when Skip is hidden', () => {
    document.head.innerHTML = `<style>${themeCss}</style>`;
    document.body.innerHTML = '<div id="cutscene-layer"><div id="dialogue-root"></div></div>';
    const panel = createDialoguePanel(document.getElementById('dialogue-root'));
    const el = panel.getPanelElement();
    const skip = panel.getSkipButton();
    // jsdom has no layout; give Skip a measured width.
    Object.defineProperty(skip, 'offsetWidth', { configurable: true, get: () => 60 });
    const beat = (extra) => ({
      visible: true, speaker: 'narrator', speakerName: 'Narrator', textVisible: 'Hello.',
      canAdvance: true, canSkip: true, beatIndex: 0, beatCount: 1, ...extra,
    });
    panel.render(beat());
    expect(el.style.getPropertyValue('--dp-skip-clear')).toBe('88px');
    panel.render(beat({ canSkip: false }));
    expect(el.style.getPropertyValue('--dp-skip-clear')).toBe('18px');
  });
});

describe('World Map in the pause menu', () => {
  it('index.html has a World Map pause action', () => {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
    const button = doc.querySelector('#pause-menu #pause-map');
    expect(button).not.toBeNull();
    expect(button.classList.contains('pause-action')).toBe(true);
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('.pause-action__title')?.textContent).toBe('World Map');
  });

  it('ui-binder wires #pause-map after createPauseController and opens the map', () => {
    const created = binderSrc.indexOf('const pauseController = createPauseController({');
    const callEnd = binderSrc.indexOf('\n  });', created);
    const wired = binderSrc.indexOf("getElementById('pause-map')");
    expect(created).toBeGreaterThan(-1);
    expect(wired).toBeGreaterThan(callEnd);
    const handler = binderSrc.slice(wired, binderSrc.indexOf('}, sessionSignal);', wired));
    expect(handler).toMatch(/pauseController\.close\(\)/);
    expect(handler).toMatch(/showWorldMap\(\)/);
  });
});
