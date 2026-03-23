import { Actions } from './store.js';

const FESTIVALS = {
  bloom_festival: {
    id: 'bloom_festival',
    season: 'spring',
    name: 'Bloom Festival',
    month: 2,
    durationDays: 3,
    description: 'Celebrate the first blooms with seed swaps and planting bonuses.',
    mechanics: {
      seedDrop: { bonusMultiplier: 2.0, rareSeedChance: 0.15 },
      plantingBonus: { scoreModifier: 0.5 },
    },
    activities: [
      { id: 'seed_swap', name: 'Seed Swap', description: 'Trade seeds with neighbors', rewardType: 'seed' },
      { id: 'flower_show', name: 'Flower Show', description: 'Display your best blooms for judging', rewardType: 'reputation' },
    ],
    npcDialogue: {
      old_gus: "Used to be twice this size. But it's still good.",
      maya: 'I rigged up a seed launcher! Want to try?',
      lila: 'The edible flower salad is almost ready...',
    },
  },
  growth_surge: {
    id: 'growth_surge',
    season: 'summer',
    name: 'Growth Surge',
    month: 2,
    durationDays: 3,
    description: 'Summer peak — faster growth but heat challenges.',
    mechanics: {
      growthSpeed: { multiplier: 1.5 },
      heatChallenge: { damageChance: 0.2, damageSeverity: 'heat' },
    },
    activities: [
      { id: 'watering_race', name: 'Watering Race', description: 'Keep crops alive under scorching sun', rewardType: 'xp' },
      { id: 'shade_building', name: 'Shade Building', description: 'Construct shade structures', rewardType: 'item' },
    ],
    npcDialogue: {
      old_gus: "This heat reminds me of '98. Lost half my tomatoes.",
      maya: 'My automatic sprinkler prototype is... mostly working.',
      lila: 'Cold soup weather. I need cucumbers.',
    },
  },
  harvest_week: {
    id: 'harvest_week',
    season: 'fall',
    name: 'Harvest Week',
    month: 2,
    durationDays: 5,
    description: 'The big harvest — scoring multipliers and recipe bonuses.',
    mechanics: {
      scoringMultiplier: { multiplier: 1.25 },
      recipeBonus: { extraReward: 0.5 },
    },
    activities: [
      { id: 'harvest_competition', name: 'Harvest Competition', description: 'Best garden scores win prizes', rewardType: 'item' },
      { id: 'recipe_contest', name: 'Recipe Contest', description: 'Complete recipes for bonus rewards', rewardType: 'reputation' },
    ],
    npcDialogue: {
      old_gus: "Let's see what this year brought. No lying about your tomato size.",
      maya: "I built a yield-measuring device! It's only slightly explosive.",
      lila: 'This is MY time. Bring me everything.',
    },
  },
  dormancy_challenge: {
    id: 'dormancy_challenge',
    season: 'winter',
    name: 'Dormancy Challenge',
    month: 2,
    durationDays: 3,
    description: 'Winter soil management — prepare for next year.',
    mechanics: {
      soilRecovery: { fatigueReduction: 0.2 },
      planningBonus: { nextSeasonModifier: 0.3 },
    },
    activities: [
      { id: 'soil_workshop', name: 'Soil Workshop', description: 'Learn to restore depleted soil', rewardType: 'xp' },
      { id: 'seed_planning', name: 'Seed Planning', description: 'Plan next season for bonuses', rewardType: 'seed' },
    ],
    npcDialogue: {
      old_gus: 'Soil needs its rest. So do I, but here we are.',
      maya: "I'm testing a frost sensor. It keeps going off indoors.",
      lila: 'Preserved everything I could. Want some pickles?',
    },
  },
};

const ACTIVITY_REWARD_TABLE = {
  seed: [{ type: 'seed', id: 'festival_seed_bundle', amount: 1 }],
  reputation: [{ type: 'reputation', id: 'lila', amount: 10 }],
  xp: [{ type: 'xp', id: 'festival', amount: 15 }],
  item: [{ type: 'item', id: 'festival_token', amount: 1 }],
};

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
    this.store.dispatch({
      type: Actions.FESTIVAL_START,
      payload: {
        festivalId,
        season: state.season.season,
        month: state.season.month ?? 1,
        startedAt: Date.now(),
        mechanics: festival.mechanics,
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
    this.store.dispatch({
      type: Actions.FESTIVAL_ACTIVITY,
      payload: { activityId, rewards },
    });
    return rewards;
  }
}

export {
  ACTIVITY_REWARD_TABLE,
  FESTIVALS,
};
