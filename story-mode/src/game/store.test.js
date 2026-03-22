import { describe, expect, it, vi } from 'vitest';

import { createGameState, createSeasonState, PHASES } from './state.js';
import { Actions, Store, cloneGameState, gameReducer } from './store.js';

function makeState() {
  return createGameState();
}

describe('gameReducer', () => {
  it('creates a fresh state for NEW_GAME', () => {
    const base = makeState();
    const next = gameReducer(base, { type: Actions.NEW_GAME });

    expect(next).not.toBe(base);
    expect(next.season.phase).toBe(PHASES.PLANNING);
    expect(next.selectedCropId).toBeNull();
  });

  it('loads an explicit state snapshot', () => {
    const loaded = makeState();
    loaded.campaign.currentChapter = 4;
    loaded.season.chapter = 4;
    loaded.season.season = 'winter';
    loaded.season.phase = 'REVIEW';

    const next = gameReducer(makeState(), {
      type: Actions.LOAD_SAVE,
      payload: { state: loaded },
    });

    expect(next.campaign.currentChapter).toBe(4);
    expect(next.season.chapter).toBe(4);
    expect(next.season.season).toBe('winter');
    expect(next.season.phase).toBe(PHASES.TRANSITION);
    expect(next.season.campaign).toBe(next.campaign);
  });

  it('updates grid cells through plant, remove, damage, protection, soil, and carry-forward actions', () => {
    const base = makeState();
    const planted = gameReducer(base, {
      type: Actions.PLANT_CROP,
      payload: { cellIndex: 3, cropId: 'basil' },
    });
    const damaged = gameReducer(planted, {
      type: Actions.SET_DAMAGE,
      payload: { cellIndex: 3, damageState: 'frost' },
    });
    const protectedState = gameReducer(damaged, {
      type: Actions.SET_PROTECTION,
      payload: { cellIndex: 3, protected: true },
    });
    const soilUpdated = gameReducer(protectedState, {
      type: Actions.UPDATE_SOIL,
      payload: { cellIndex: 3, soilFatigue: 0.4 },
    });
    const carried = gameReducer(soilUpdated, {
      type: Actions.CARRY_FORWARD,
      payload: { cellIndex: 3, carryForwardType: 'mulched' },
    });
    const removed = gameReducer(carried, {
      type: Actions.REMOVE_CROP,
      payload: { cellIndex: 3 },
    });

    expect(planted.season.grid[3].cropId).toBe('basil');
    expect(damaged.season.grid[3].damageState).toBe('frost');
    expect(protectedState.season.grid[3].protected).toBe(true);
    expect(soilUpdated.season.grid[3].soilFatigue).toBe(0.4);
    expect(carried.season.grid[3].carryForwardType).toBe('mulched');
    expect(removed.season.grid[3].cropId).toBeNull();
    expect(removed.season.grid[3].damageState).toBeNull();
  });

  it('accepts replacement-style event and intervention updates', () => {
    const eventState = cloneGameState(makeState());
    eventState.season.grid[1].cropId = 'kale';
    eventState.season.grid[1].eventModifier = -0.5;
    eventState.season.lastResolvedEvent = { id: 'storm-1', title: 'Storm Front' };
    eventState.season.lastEventEffectSummary = { negativeAffectedCount: 1 };

    const afterEvent = gameReducer(makeState(), {
      type: Actions.APPLY_EVENT,
      payload: { state: eventState },
    });

    const interventionState = cloneGameState(afterEvent);
    interventionState.season.interventionChosen = 'protect';
    interventionState.season.interventionTokens = 2;
    interventionState.season.eventActive = null;

    const afterIntervention = gameReducer(afterEvent, {
      type: Actions.USE_INTERVENTION,
      payload: { state: interventionState },
    });

    expect(afterEvent.season.grid[1].eventModifier).toBe(-0.5);
    expect(afterEvent.season.lastResolvedEvent?.id).toBe('storm-1');
    expect(afterIntervention.season.interventionChosen).toBe('protect');
    expect(afterIntervention.season.interventionTokens).toBe(2);
  });

  it('supports phase and chapter progression actions', () => {
    const advancedPhase = gameReducer(makeState(), {
      type: Actions.ADVANCE_PHASE,
      payload: { phase: PHASES.HARVEST, winterReviewSeen: true },
    });
    const advancedChapter = gameReducer(advancedPhase, {
      type: Actions.ADVANCE_CHAPTER,
      payload: { chapter: 2, season: 'summer' },
    });

    expect(advancedPhase.season.phase).toBe(PHASES.HARVEST);
    expect(advancedPhase.season.winterReviewSeen).toBe(true);
    expect(advancedChapter.campaign.currentChapter).toBe(2);
    expect(advancedChapter.campaign.currentSeason).toBe('summer');
  });

  it('tracks quests through accept, update, abandon, and complete actions', () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    const accepted = gameReducer(makeState(), {
      type: Actions.ACCEPT_QUEST,
      payload: {
        questId: 'gus_tomatoes',
        acceptedSeason: 'summer',
        acceptedChapter: 3,
      },
    });
    const progressed = gameReducer(accepted, {
      type: Actions.UPDATE_QUEST_STATE,
      payload: {
        questId: 'gus_tomatoes',
        newState: 'READY_TO_TURN_IN',
      },
    });
    const completed = gameReducer(progressed, {
      type: Actions.COMPLETE_QUEST,
      payload: {
        questId: 'gus_tomatoes',
        rewards: [{ type: 'reputation', id: 'old_gus', amount: 15 }],
      },
    });
    const abandoned = gameReducer(accepted, {
      type: Actions.ABANDON_QUEST,
      payload: { questId: 'gus_tomatoes' },
    });

    expect(accepted.campaign.questLog.gus_tomatoes).toMatchObject({
      state: 'ACCEPTED',
      acceptedAt: 12345,
      acceptedSeason: 'summer',
      acceptedChapter: 3,
    });
    expect(progressed.campaign.questLog.gus_tomatoes.state).toBe('READY_TO_TURN_IN');
    expect(completed.campaign.questLog.gus_tomatoes.state).toBe('COMPLETED');
    expect(completed.campaign.reputation.old_gus).toBe(15);
    expect(abandoned.campaign.questLog.gus_tomatoes.state).toBe('ABANDONED');
  });

  it('handles reputation actions with clamps and seasonal decay', () => {
    const rewarded = gameReducer(makeState(), {
      type: Actions.ADD_REPUTATION,
      payload: { npcId: 'maya', amount: 120 },
    });
    const decayed = gameReducer(rewarded, {
      type: Actions.DECAY_REPUTATION,
      payload: {},
    });

    expect(rewarded.campaign.reputation.maya).toBe(100);
    expect(decayed.campaign.reputation.maya).toBe(99);
    expect(decayed.campaign.reputation.old_gus).toBe(0);
  });

  it('tracks current zone and visited zones without duplicates', () => {
    const changed = gameReducer(makeState(), {
      type: Actions.ZONE_CHANGED,
      payload: { fromZone: 'player_plot', toZone: 'neighborhood', spawnPoint: { x: 1, z: 2 } },
    });
    const visited = gameReducer(changed, {
      type: Actions.ZONE_VISITED,
      payload: { zoneId: 'neighborhood' },
    });

    expect(changed.campaign.worldState.currentZone).toBe('neighborhood');
    expect(changed.campaign.worldState.visitedZones).toEqual(['player_plot', 'neighborhood']);
    expect(visited.campaign.worldState.visitedZones).toEqual(['player_plot', 'neighborhood']);
  });

  it('handles keepsakes, journal entries, and reducer-level reset helpers', () => {
    const awarded = gameReducer(makeState(), {
      type: Actions.AWARD_KEEPSAKE,
      payload: {
        awarded: {
          id: 'first_seed_packet',
          earnedAt: '2026-03-22T00:00:00.000Z',
          chapter: 1,
          season: 'spring',
        },
      },
    });
    const journaled = gameReducer(awarded, {
      type: Actions.PUSH_JOURNAL,
      payload: {
        entry: {
          chapter: 1,
          season: 'spring',
          grade: 'A',
          score: 8.2,
        },
      },
    });
    const resetSeason = createSeasonState(1, 'summer', journaled.campaign);
    resetSeason.grid[0].cropId = 'pepper';
    const reset = gameReducer(journaled, {
      type: Actions.RESET_SEASON,
      payload: {
        season: resetSeason,
        selectedCropId: null,
      },
    });

    expect(awarded.campaign.keepsakes).toHaveLength(1);
    expect(awarded.season.newlyEarnedKeepsakes).toHaveLength(1);
    expect(journaled.campaign.journalEntries).toHaveLength(1);
    expect(reset.season.season).toBe('summer');
    expect(reset.season.grid[0].cropId).toBe('pepper');
    expect(reset.selectedCropId).toBeNull();
  });

  it('returns the previous state for unknown actions', () => {
    const base = makeState();
    const next = gameReducer(base, { type: 'UNKNOWN_ACTION' });

    expect(next).toBe(base);
  });

  it('initializes quest, reputation, and world defaults when loading an old save', () => {
    const loaded = makeState();
    delete loaded.campaign.questLog;
    delete loaded.campaign.reputation;
    delete loaded.campaign.worldState;

    const next = gameReducer(makeState(), {
      type: Actions.LOAD_SAVE,
      payload: { state: loaded },
    });

    expect(next.campaign.questLog).toEqual({});
    expect(next.campaign.reputation).toMatchObject({ old_gus: 0, maya: 0, lila: 0 });
    expect(next.campaign.worldState.currentZone).toBe('player_plot');
  });
});

describe('Store', () => {
  it('notifies and unsubscribes subscribers', () => {
    const store = new Store(makeState());
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    const snapshot = store.dispatch({
      type: Actions.PLANT_CROP,
      payload: { cellIndex: 0, cropId: 'lettuce' },
    });

    expect(snapshot.season.grid[0].cropId).toBe('lettuce');
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0].season.grid[0].cropId).toBe('lettuce');
    expect(subscriber.mock.calls[0][1]).toMatchObject({ type: Actions.PLANT_CROP });

    unsubscribe();
    store.dispatch({
      type: Actions.REMOVE_CROP,
      payload: { cellIndex: 0 },
    });

    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
