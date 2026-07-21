import { Actions } from './store.js';
import { ACTIVITY_REWARD_TABLE, FESTIVALS } from '../data/festivals-data.js';

export class FestivalEngine {
  constructor(store) {
    this.store = store;
  }

  getState() {
    return this.store.getState();
  }

  getFestivalForSeason(season) {
    return Object.values(FESTIVALS).find((festival) => festival.season === season) ?? null;
  }

  getActiveFestival() {
    const activeId = this.getState().campaign.activeFestival?.id ?? null;
    return activeId ? FESTIVALS[activeId] ?? null : null;
  }

  checkFestivalStart() {
    const state = this.getState();
    if (state.campaign.activeFestival) return null;
    const festival = this.getFestivalForSeason(state.season.season);
    if (!festival || festival.month !== (state.season.month ?? 1)) return null;
    this.startFestival(festival.id);
    return festival;
  }

  startFestival(festivalId) {
    const festival = FESTIVALS[festivalId];
    if (!festival) return false;
    const state = this.getState();
    // Lean authority-routable payload: the reducer derives mechanics from the
    // canonical festival table instead of trusting the dispatch payload.
    this.store.dispatch({
      type: Actions.FESTIVAL_START,
      payload: {
        festivalId,
        season: state.season.season,
        month: state.season.month ?? 1,
        startedAt: Date.now(),
      },
    });
    return true;
  }

  endFestival() {
    const active = this.getActiveFestival();
    if (!active) return false;
    this.store.dispatch({
      type: Actions.FESTIVAL_END,
      payload: { festivalId: active.id },
    });
    return true;
  }

  getAvailableActivities() {
    const active = this.getActiveFestival();
    if (!active) return [];
    const completed = new Set(this.getState().campaign.activeFestival?.activitiesCompleted ?? []);
    return active.activities.filter((activity) => !completed.has(activity.id));
  }

  doActivity(activityId) {
    const active = this.getActiveFestival();
    if (!active) return null;
    const activity = active.activities.find((entry) => entry.id === activityId);
    if (!activity) return null;
    const completed = new Set(this.getState().campaign.activeFestival?.activitiesCompleted ?? []);
    if (completed.has(activityId)) return null;

    const rewards = ACTIVITY_REWARD_TABLE[activity.rewardType] ?? [];
    // Lean authority-routable payload: the reducer and the server both derive
    // activity rewards from the canonical festival tables.
    this.store.dispatch({
      type: Actions.FESTIVAL_ACTIVITY,
      payload: { activityId, festivalId: active.id },
    });
    return rewards;
  }
}

export {
  ACTIVITY_REWARD_TABLE,
  FESTIVALS,
};
