// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FestivalEngine } from '../game/festivals.js';
import { getInventoryItemCount } from '../game/inventory.js';
import { QuestEngine, QuestStates } from '../game/quest-engine.js';
import { PHASES, createGameState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import { createQuestController } from './quest-controller.js';

function setup({ mutate, zone = 'neighborhood' } = {}) {
  const state = createGameState();
  state.campaign.worldState.currentZone = zone;
  mutate?.(state);
  const store = new Store(state);
  const questEngine = new QuestEngine(store);
  const festivalEngine = new FestivalEngine(store);
  const scenes = [];
  const toasts = [];
  const sessionListeners = new AbortController();
  const controller = createQuestController({
    store,
    questEngine,
    festivalEngine,
    cutsceneMachine: { isActive: () => false, start: (scene) => scenes.push(scene) },
    getZoneId: () => store.getState().campaign.worldState.currentZone,
    showToast: (message) => toasts.push(message),
    hudRoot: document.body,
    signal: sessionListeners.signal,
  });
  return { store, questEngine, festivalEngine, controller, scenes, toasts, sessionListeners };
}

function choose(scene, beat, prefix) {
  const choice = beat?.choices?.find((entry) => entry.label.startsWith(prefix));
  if (!choice) throw new Error(`No choice "${prefix}" in [${beat?.choices?.map((c) => c.label).join(' | ')}]`);
  choice.effect?.run?.();
  return choice.branchId ? scene.branches[choice.branchId] : [];
}

function patch(store, mutate) {
  const state = store.getState();
  mutate(state);
  store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
}

let harness = null;

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.dataset.storyScreen = 'play';
});

afterEach(() => {
  harness?.controller.dispose();
  harness?.sessionListeners.abort();
  harness = null;
});

describe('quest controller', () => {
  it('talk → accept → harvest → turn in with Lila, updating the tracker', () => {
    harness = setup();
    const { store, controller, scenes } = harness;

    controller.talkTo('lila');
    const talk = scenes.at(-1);
    expect(talk.beats[0].speaker).toBe('lila');
    const offer = choose(talk, talk.beats[0], 'New request: Fresh Basil, Please');
    expect(offer[0].text).toMatch(/basil/i);
    choose(talk, offer[0], "I'll do it");
    expect(store.getState().campaign.questLog.lila_basil.state).toBe(QuestStates.IN_PROGRESS);
    expect(document.querySelector('.quest-tracker').textContent).toContain('Fresh Basil, Please');
    expect(document.querySelector('.quest-tracker').textContent).toContain('0/3');

    patch(store, (state) => { state.campaign.pantry = { basil: 3 }; });
    controller.evaluateNow();
    expect(store.getState().campaign.questLog.lila_basil.state).toBe(QuestStates.READY_TO_TURN_IN);
    expect(controller.getNpcLabel('lila')).toBe('Talk to Lila · quest ready');

    controller.talkTo('lila');
    const turnIn = scenes.at(-1);
    const done = choose(turnIn, turnIn.beats[0], 'Turn in: Fresh Basil, Please');
    expect(done[0].choices.map((c) => c.label)).toHaveLength(2);
    const repBefore = store.getState().campaign.reputation.lila;
    choose(turnIn, done[0], done[0].choices[0].label);
    expect(store.getState().campaign.questLog.lila_basil.state).toBe(QuestStates.COMPLETED);
    expect(store.getState().campaign.reputation.lila).toBeGreaterThan(repBefore);
    expect(document.querySelector('.quest-tracker').textContent).toContain('0/3');
  });

  it('lists only neighbor requests on the notice board', () => {
    harness = setup({ mutate: (state) => { state.campaign.currentChapter = 2; state.season.season = 'summer'; state.campaign.currentSeason = 'summer'; } });
    harness.controller.interactSite('neighborhood_notice_board');
    const scene = harness.scenes.at(-1);
    const labels = scene.beats[0].choices.map((c) => c.label);
    expect(labels).toContain('New request: Weekend Watering');
    expect(labels.some((label) => label.includes('Basil'))).toBe(false);
  });

  it('hands over delivery items in the right zone and completes on the last delivery', () => {
    harness = setup({
      zone: 'forest_edge',
      mutate: (state) => {
        state.campaign.currentChapter = 7;
        state.season.season = 'fall';
        state.campaign.currentSeason = 'fall';
        state.campaign.reputation.old_gus = 60;
      },
    });
    const { store, controller, scenes } = harness;
    controller.talkTo('old_gus');
    let scene = scenes.at(-1);
    choose(scene, choose(scene, scene.beats[0], 'New request: Mushroom Log Inoculation')[0], "I'll do it");

    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'wood', count: 4 } });
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'compost', count: 2 } });
    controller.talkTo('old_gus');
    scene = scenes.at(-1);
    const beats = choose(scene, scene.beats[0], 'Hand over');
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'wood')).toBe(0);
    const turnInBeat = beats.find((beat) => beat.choices?.length);
    choose(scene, turnInBeat, turnInBeat.choices[1].label);
    expect(store.getState().campaign.questLog.gus_mushroom_logs.state).toBe(QuestStates.COMPLETED);
  });

  it('opens the season festival during planning and runs booth activities', () => {
    harness = setup({ zone: 'festival_grounds' });
    const { store, controller, scenes } = harness;
    controller.evaluateNow();
    expect(store.getState().campaign.activeFestival?.id).toBe('bloom_festival');
    ['festival_booth_a', 'festival_booth_b'].forEach((siteId) => {
      controller.interactSite(siteId);
      const scene = scenes.at(-1);
      choose(scene, scene.beats.find((beat) => beat.choices), 'Join in');
    });
    expect(store.getState().campaign.questLedger.festivalsCompleted).toEqual([
      expect.objectContaining({ festivalId: 'bloom_festival', year: 1 }),
    ]);
    // Next chapter: the stale festival closes and the summer one opens right away.
    patch(store, (state) => {
      state.campaign.currentChapter = 2;
      state.campaign.currentSeason = 'summer';
      state.season.season = 'summer';
      state.season.phase = PHASES.PLANNING;
    });
    controller.evaluateNow();
    expect(store.getState().campaign.activeFestival?.id).toBe('growth_surge');
  });

  it('caps active quests at three and lets the player drop one from the log', () => {
    harness = setup({ mutate: (state) => { state.campaign.currentChapter = 6; state.season.season = 'summer'; state.campaign.currentSeason = 'summer'; } });
    const { store, questEngine, controller, scenes } = harness;
    ['lila_basil', 'lila_salsa', 'gus_tomatoes'].forEach((id) => questEngine.acceptQuest(id));
    controller.talkTo('maya');
    const scene = scenes.at(-1);
    const offer = choose(scene, scene.beats[0], 'New request:');
    expect(offer[0].choices.map((c) => c.label)).toEqual(['Maybe later (quest log full: 3 active)']);

    controller.openLog();
    const drop = document.querySelector('[data-quest-drop="lila_salsa"]');
    expect(drop).not.toBeNull();
    drop.click();
    expect(store.getState().campaign.questLog.lila_salsa.state).toBe(QuestStates.ABANDONED);
    expect(questEngine.getAvailableQuests().map((q) => q.id)).toContain('lila_salsa');
    expect(document.querySelector('.quest-log').textContent).toContain('2/3 active');
  });

  it('flags home-bed crops that have not unlocked yet', () => {
    harness = setup({ mutate: (state) => { state.campaign.currentChapter = 3; } });
    harness.questEngine.acceptQuest('sam_bees');
    const active = harness.controller.getSnapshot().active.find((entry) => entry.id === 'sam_bees');
    expect(active.progress.map((line) => line.label).join(' ')).toContain('(seeds unlock in Chapter 9)');
  });

  it('toggles the quest log with Q and stops listening once the session aborts', () => {
    harness = setup();
    const press = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    press();
    expect(harness.controller.isLogOpen()).toBe(true);
    press();
    expect(harness.controller.isLogOpen()).toBe(false);
    harness.controller.dispose();
    harness.sessionListeners.abort();
    press();
    expect(document.querySelector('.quest-log')).toBeNull();
    expect(document.querySelector('.quest-tracker')).toBeNull();
  });

  it('only shows the big oak find while the river path quest is active', () => {
    harness = setup({ mutate: (state) => { state.campaign.currentChapter = 5; state.campaign.reputation.old_gus = 30; } });
    const { store, questEngine, controller } = harness;
    expect(controller.interactSite('big_oak_hollow')).toBe(false);
    questEngine.acceptQuest('gus_river_path');
    expect(controller.interactSite('big_oak_hollow')).toBe(true);
    expect(getInventoryItemCount(store.getState().campaign.inventory, 'old_map')).toBe(1);
    controller.evaluateNow();
    expect(store.getState().campaign.questLog.gus_river_path.state).toBe(QuestStates.READY_TO_TURN_IN);
  });
});
