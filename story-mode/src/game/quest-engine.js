import questDeckData from 'specs/QUEST_DECK.json';

import { Actions } from './store.js';
import { getInventoryItemCount } from './inventory.js';

const QuestStates = {
  AVAILABLE: 'AVAILABLE',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  READY_TO_TURN_IN: 'READY_TO_TURN_IN',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  FAILED: 'FAILED',
};

const ACTIVE_QUEST_LIMIT = 3;

class QuestEngine {
  constructor(store, questDeck = questDeckData?.quests ?? []) {
    this.store = store;
    this.questDeck = Array.isArray(questDeck) ? questDeck : [];
  }

  getState() {
    return this.store.getState();
  }

  getQuestById(questId) {
    return this.questDeck.find((quest) => quest.id === questId) ?? null;
  }

  getQuestEntry(questId) {
    return this.getState().campaign.questLog?.[questId] ?? null;
  }

  meetsPrerequisites(quest, state) {
    const prereq = quest.prerequisites ?? {};
    if ((state.campaign.currentChapter ?? 1) < (prereq.chapter_min ?? 1)) return false;
    if (prereq.season && state.season.season !== prereq.season) return false;
    const reputationReq = prereq.reputation ?? {};
    const reputation = state.campaign.reputation ?? {};
    if (Object.entries(reputationReq).some(([npcId, minValue]) => (reputation[npcId] ?? 0) < minValue)) {
      return false;
    }
    const completed = state.campaign.questLog ?? {};
    if ((prereq.quests_completed ?? []).some((questId) => completed[questId]?.state !== QuestStates.COMPLETED)) {
      return false;
    }
    return true;
  }

  meetsRequirement(requirement, state) {
    const count = requirement.count ?? 1;
    switch (requirement.type) {
      case 'crop_harvested':
        return (state.campaign.pantry?.[requirement.id] ?? 0) >= count;
      case 'crop_planted':
        return state.season.grid.filter((cell) => cell.cropId === requirement.id).length >= count;
      case 'reputation':
        return (state.campaign.reputation?.[requirement.id] ?? 0) >= count;
      case 'item_crafted':
        return (
          (state.campaign.craftedItems?.[requirement.id] ?? 0) >= count
          || getInventoryItemCount(state.campaign.inventory, requirement.id) >= count
        );
      case 'zone_visited':
        return (state.campaign.worldState?.visitedZones ?? []).includes(requirement.id);
      case 'season':
        return state.season.season === (requirement.id ?? requirement.season);
      default:
        return false;
    }
  }

  requirementsMet(quest, state) {
    return (quest.requirements ?? []).every((requirement) => this.meetsRequirement(requirement, state));
  }

  getAvailableQuests() {
    const state = this.getState();
    return this.questDeck.filter((quest) => {
      const entry = state.campaign.questLog?.[quest.id];
      if (entry?.state === QuestStates.COMPLETED) return false;
      if (entry?.state === QuestStates.ACCEPTED || entry?.state === QuestStates.IN_PROGRESS || entry?.state === QuestStates.READY_TO_TURN_IN) {
        return false;
      }
      return this.meetsPrerequisites(quest, state);
    });
  }

  getActiveQuests() {
    const state = this.getState();
    return this.questDeck.filter((quest) => {
      const questState = state.campaign.questLog?.[quest.id]?.state;
      return questState === QuestStates.ACCEPTED || questState === QuestStates.IN_PROGRESS || questState === QuestStates.READY_TO_TURN_IN;
    });
  }

  getQuestsForNPC(npcId) {
    const state = this.getState();
    return this.questDeck
      .filter((quest) => quest.npc === npcId)
      .map((quest) => ({
        ...quest,
        state: state.campaign.questLog?.[quest.id]?.state ?? QuestStates.AVAILABLE,
      }));
  }

  acceptQuest(questId) {
    const quest = this.getQuestById(questId);
    const state = this.getState();
    if (!quest || !this.meetsPrerequisites(quest, state)) return false;
    if (this.getActiveQuests().length >= ACTIVE_QUEST_LIMIT) return false;
    this.store.dispatch({
      type: Actions.ACCEPT_QUEST,
      payload: {
        questId,
        acceptedAt: Date.now(),
        acceptedSeason: state.season.season,
        acceptedChapter: state.campaign.currentChapter,
      },
    });
    return true;
  }

  abandonQuest(questId) {
    const entry = this.getQuestEntry(questId);
    if (!entry || (entry.state !== QuestStates.ACCEPTED && entry.state !== QuestStates.IN_PROGRESS)) {
      return false;
    }
    this.store.dispatch({
      type: Actions.ABANDON_QUEST,
      payload: { questId, abandonedAt: Date.now() },
    });
    return true;
  }

  evaluateProgress() {
    const state = this.getState();
    const changes = [];
    for (const quest of this.getActiveQuests()) {
      const entry = state.campaign.questLog?.[quest.id];
      if (!entry) continue;
      if (this.requirementsMet(quest, state)) {
        this.store.dispatch({
          type: Actions.UPDATE_QUEST_STATE,
          payload: { questId: quest.id, newState: QuestStates.READY_TO_TURN_IN },
        });
        changes.push({ questId: quest.id, newState: QuestStates.READY_TO_TURN_IN });
      } else if (entry.state === QuestStates.ACCEPTED) {
        this.store.dispatch({
          type: Actions.UPDATE_QUEST_STATE,
          payload: { questId: quest.id, newState: QuestStates.IN_PROGRESS },
        });
        changes.push({ questId: quest.id, newState: QuestStates.IN_PROGRESS });
      }
    }
    return changes;
  }

  turnInQuest(questId) {
    const quest = this.getQuestById(questId);
    const entry = this.getQuestEntry(questId);
    if (!quest || entry?.state !== QuestStates.READY_TO_TURN_IN) return null;
    this.store.dispatch({
      type: Actions.COMPLETE_QUEST,
      payload: {
        questId,
        rewards: quest.rewards ?? [],
        completedAt: Date.now(),
      },
    });
    return quest.rewards ?? [];
  }

  checkTimedQuests() {
    const state = this.getState();
    const failed = [];
    for (const quest of this.getActiveQuests()) {
      if (!quest.timed) continue;
      const entry = state.campaign.questLog?.[quest.id];
      if (!entry) continue;

      let expired = false;
      if (typeof quest.deadline === 'number') {
        expired = (entry.acceptedAt ?? 0) + quest.deadline <= Date.now();
      } else if (quest.deadline === 'end_of_fall') {
        expired = entry.acceptedSeason === 'fall' && state.season.season !== 'fall';
      }

      if (expired) {
        this.store.dispatch({
          type: Actions.UPDATE_QUEST_STATE,
          payload: {
            questId: quest.id,
            newState: QuestStates.FAILED,
            meta: { failedAt: Date.now() },
          },
        });
        failed.push(quest.id);
      }
    }
    return failed;
  }

  getQuestLog() {
    const state = this.getState();
    return this.questDeck.map((quest) => ({
      ...quest,
      state: state.campaign.questLog?.[quest.id]?.state ?? QuestStates.AVAILABLE,
      entry: state.campaign.questLog?.[quest.id] ?? null,
    }));
  }
}

export {
  ACTIVE_QUEST_LIMIT,
  QuestEngine,
  QuestStates,
};
