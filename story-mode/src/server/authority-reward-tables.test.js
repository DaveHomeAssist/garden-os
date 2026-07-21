import { describe, expect, it } from 'vitest';

import cropData from 'specs/CROP_SCORING_DATA.json';
import questDeckData from 'specs/QUEST_DECK.json';

import { ACTIVITY_REWARD_TABLE, FESTIVALS } from '../data/festivals-data.js';
import {
  AUTHORITY_FESTIVAL_ACTIVITY_REWARDS,
  AUTHORITY_FESTIVALS,
  AUTHORITY_QUEST_REWARDS,
  AUTHORITY_RECIPE_TABLE,
} from './authority-reward-tables.js';

function normalizeRewards(rewards) {
  return (rewards ?? []).map((reward) => ({
    amount: reward.amount ?? 1,
    id: reward.id,
    type: reward.type,
  }));
}

// The authority reward tables are generated from the canonical specs so both
// server runtimes can import them without spec aliases. These tests fail the
// build the moment a spec edit is not regenerated into the mirror, so client
// derivation and server validation can never silently disagree.
describe('authority reward tables mirror the canonical specs', () => {
  it('mirrors every quest reward and outcome reward in QUEST_DECK.json', () => {
    const quests = questDeckData.quests ?? [];
    expect(Object.keys(AUTHORITY_QUEST_REWARDS).sort()).toEqual(quests.map((quest) => quest.id).sort());

    for (const quest of quests) {
      const mirrored = AUTHORITY_QUEST_REWARDS[quest.id];
      expect(normalizeRewards(mirrored.rewards)).toEqual(normalizeRewards(quest.rewards));
      const outcomes = quest.outcomes ?? [];
      expect(Object.keys(mirrored.outcomes ?? {}).sort()).toEqual(outcomes.map((outcome) => outcome.id).sort());
      for (const outcome of outcomes) {
        expect(normalizeRewards(mirrored.outcomes[outcome.id])).toEqual(normalizeRewards(outcome.rewards));
      }
    }
  });

  it('mirrors every recipe crop list in CROP_SCORING_DATA.json', () => {
    const recipes = cropData.recipes ?? {};
    expect(Object.keys(AUTHORITY_RECIPE_TABLE).sort()).toEqual(Object.keys(recipes).sort());
    for (const [recipeId, recipe] of Object.entries(recipes)) {
      expect(AUTHORITY_RECIPE_TABLE[recipeId]).toEqual(recipe.crops);
    }
  });

  it('mirrors the festival activity and reward tables in festivals-data.js', () => {
    expect(Object.keys(AUTHORITY_FESTIVALS).sort()).toEqual(Object.keys(FESTIVALS).sort());
    for (const [festivalId, festival] of Object.entries(FESTIVALS)) {
      const mirroredActivities = AUTHORITY_FESTIVALS[festivalId].activities;
      expect(Object.keys(mirroredActivities).sort()).toEqual(festival.activities.map((activity) => activity.id).sort());
      for (const activity of festival.activities) {
        expect(mirroredActivities[activity.id]).toBe(activity.rewardType);
      }
    }

    expect(Object.keys(AUTHORITY_FESTIVAL_ACTIVITY_REWARDS).sort()).toEqual(Object.keys(ACTIVITY_REWARD_TABLE).sort());
    for (const [rewardType, rewards] of Object.entries(ACTIVITY_REWARD_TABLE)) {
      expect(normalizeRewards(AUTHORITY_FESTIVAL_ACTIVITY_REWARDS[rewardType])).toEqual(normalizeRewards(rewards));
    }
  });
});
