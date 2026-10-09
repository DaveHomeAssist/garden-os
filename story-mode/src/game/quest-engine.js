import questDeckData from 'specs/QUEST_DECK.json';

import { Actions } from './store.js';
import { getInventoryItemCount } from './inventory.js';
import { normalizeQuestLedger } from './quest-ledger.js';

function sumMatching(map, matches) {
  return Object.entries(map ?? {}).reduce((sum, [key, value]) => (
    matches(key) ? sum + (Number(value) || 0) : sum
  ), 0);
}

function countPlantedCells(season, matches, adjacentTo = null) {
  const grid = Array.isArray(season.grid) ? season.grid : [];
  const cols = Number.isInteger(season.gridCols) ? season.gridCols : (Number.isInteger(grid.cols) ? grid.cols : 8);
  return grid.filter((cell, index) => {
    if (!cell?.cropId || !matches(cell.cropId)) return false;
    if (!adjacentTo) return true;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].some(([r, c]) => {
      if (r < 0 || c < 0 || c >= cols) return false;
      return grid[(r * cols) + c]?.cropId === adjacentTo;
    });
  }).length;
}

function countTradedItems(campaign, matches, sinceTimestamp = null) {
  const since = Number.isFinite(sinceTimestamp) ? sinceTimestamp : null;
  return (campaign.market?.transactions ?? []).reduce((sum, transaction) => {
    if (since != null && Number.isFinite(transaction?.timestamp) && transaction.timestamp < since) return sum;
    if (transaction?.type === 'barter') {
      return matches(transaction.offerItemId) ? sum + (Number(transaction.offerCount) || 0) : sum;
    }
    if (transaction?.type === 'buy' || transaction?.type === 'sell') {
      return matches(transaction.itemId) ? sum + (Number(transaction.count) || 0) : sum;
    }
    return sum;
  }, 0);
}

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
    // Canonical-deck engines dispatch lean authority-routable payloads; custom
    // decks (tests, mods) keep the legacy full payload since the server would
    // reject their quest ids anyway.
    this.usesCanonicalDeck = questDeck === (questDeckData?.quests ?? []);
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

  getQuestOutcomes(questOrId) {
    const quest = typeof questOrId === 'string' ? this.getQuestById(questOrId) : questOrId;
    return Array.isArray(quest?.outcomes) ? quest.outcomes : [];
  }

  resolveQuestOutcome(questId, choiceId) {
    const outcomes = this.getQuestOutcomes(questId);
    if (!outcomes.length) return null;
    if (choiceId) {
      return outcomes.find((outcome) => outcome.id === choiceId) ?? null;
    }
    return outcomes[0] ?? null;
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

  /**
   * Progress for one requirement as { current, target, met }.
   *
   * Requirement fields beyond { type, id, count }:
   * - zone: count only events in that zone (found items, plantings and
   *   harvests at quest sites, deliveries). Without it the home bed and the
   *   lifetime pantry count, as before.
   * - adjacentTo (crop_planted): only cells orthogonally next to that crop count.
   * - sameYear (festival_completed): all sameYear festival requirements of a
   *   quest must be met within one campaign year.
   * id "any" matches every crop or item for crop_harvested, crop_planted and
   * item_traded.
   */
  getRequirementProgress(requirement, state, quest = null) {
    const target = Math.max(1, Math.floor(Number(requirement?.count ?? 1) || 1));
    const current = this.countRequirement(requirement ?? {}, state, quest);
    return { current, target, met: current >= target };
  }

  countRequirement(requirement, state, quest) {
    const campaign = state.campaign ?? {};
    const ledger = normalizeQuestLedger(campaign.questLedger);
    const id = requirement.id;
    const zone = requirement.zone ?? null;
    const matches = (value) => id === 'any' || value === id;
    switch (requirement.type) {
      case 'crop_harvested':
        if (zone) return sumMatching(ledger.harvestedByZone[zone], matches);
        return sumMatching(campaign.pantry, matches);
      case 'crop_planted':
        if (zone && zone !== 'player_plot') {
          return ledger.plantings.filter((entry) => entry.zoneId === zone && matches(entry.cropId)).length;
        }
        return countPlantedCells(state.season ?? {}, matches, requirement.adjacentTo ?? null);
      case 'reputation':
        return campaign.reputation?.[id] ?? 0;
      case 'item_crafted':
        return Math.max(
          campaign.craftedItems?.[id] ?? 0,
          getInventoryItemCount(campaign.inventory, id),
        );
      case 'item_found':
        if (zone) return sumMatching(ledger.foundByZone[zone], matches);
        return sumMatching(ledger.found, matches);
      case 'item_delivered':
        return quest?.id ? (ledger.delivered[quest.id]?.[id] ?? 0) : 0;
      case 'item_traded':
        return countTradedItems(campaign, matches, quest?.id ? campaign.questLog?.[quest.id]?.acceptedAt : null);
      case 'festival_completed': {
        const completions = ledger.festivalsCompleted.filter((entry) => entry.season === id || entry.festivalId === id);
        if (!requirement.sameYear || !quest) return completions.length;
        const year = this.getFestivalYear(quest, ledger);
        return year == null ? 0 : completions.filter((entry) => entry.year === year).length;
      }
      case 'spot_foraged':
        return campaign.worldState?.forageState?.history?.[id] ? 1 : 0;
      case 'zone_visited':
        return (campaign.worldState?.visitedZones ?? []).includes(id) ? 1 : 0;
      case 'season':
        return state.season?.season === (id ?? requirement.season) ? 1 : 0;
      default:
        return 0;
    }
  }

  /** The campaign year that best satisfies a quest's sameYear festival requirements. */
  getFestivalYear(quest, ledger) {
    const grouped = (quest.requirements ?? []).filter((entry) => entry.type === 'festival_completed' && entry.sameYear);
    let bestYear = null;
    let bestScore = -1;
    const years = [...new Set(ledger.festivalsCompleted.map((entry) => entry.year))].sort((a, b) => a - b);
    years.forEach((year) => {
      const score = grouped.filter((entry) => ledger.festivalsCompleted.some((done) => (
        done.year === year && (done.season === entry.id || done.festivalId === entry.id)
      ))).length;
      if (score > bestScore) {
        bestScore = score;
        bestYear = year;
      }
    });
    return bestYear;
  }

  meetsRequirement(requirement, state, quest = null) {
    return this.getRequirementProgress(requirement, state, quest).met;
  }

  requirementsMet(quest, state) {
    return (quest.requirements ?? []).every((requirement) => this.meetsRequirement(requirement, state, quest));
  }

  getQuestProgress(questOrId, state = this.getState()) {
    const quest = typeof questOrId === 'string' ? this.getQuestById(questOrId) : questOrId;
    if (!quest) return [];
    return (quest.requirements ?? []).map((requirement) => ({
      requirement,
      ...this.getRequirementProgress(requirement, state, quest),
    }));
  }

  /**
   * Items the player could hand over right now for a quest's item_delivered
   * requirements, honoring the requirement zone. Returns [{ itemId, count }].
   */
  getDeliverableItems(questId, zoneId, state = this.getState()) {
    const quest = this.getQuestById(questId);
    if (!quest) return [];
    return (quest.requirements ?? [])
      .filter((requirement) => requirement.type === 'item_delivered')
      .filter((requirement) => !requirement.zone || requirement.zone === zoneId)
      .map((requirement) => {
        const progress = this.getRequirementProgress(requirement, state, quest);
        const remaining = Math.max(0, progress.target - progress.current);
        const have = getInventoryItemCount(state.campaign.inventory, requirement.id);
        return { itemId: requirement.id, count: Math.min(remaining, have) };
      })
      .filter((entry) => entry.count > 0);
  }

  deliverItems(questId, zoneId) {
    const items = this.getDeliverableItems(questId, zoneId);
    if (!items.length) return [];
    this.store.dispatch({
      type: Actions.QUEST_DELIVER,
      payload: { questId, zoneId, items },
    });
    return items;
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
      let newState = null;
      if (this.requirementsMet(quest, state)) {
        if (entry.state !== QuestStates.READY_TO_TURN_IN) newState = QuestStates.READY_TO_TURN_IN;
      } else if (entry.state !== QuestStates.IN_PROGRESS) {
        // ACCEPTED starts tracking; READY drops back if a requirement was undone
        // (for example a planted crop was pulled before turn-in).
        newState = QuestStates.IN_PROGRESS;
      }
      if (!newState) continue;
      this.store.dispatch({
        type: Actions.UPDATE_QUEST_STATE,
        payload: { questId: quest.id, newState },
      });
      changes.push({ questId: quest.id, newState });
    }
    return changes;
  }

  turnInQuest(questId, choiceId = null) {
    const quest = this.getQuestById(questId);
    const entry = this.getQuestEntry(questId);
    if (!quest || entry?.state !== QuestStates.READY_TO_TURN_IN) return null;
    const outcome = this.resolveQuestOutcome(questId, choiceId);
    if (this.getQuestOutcomes(quest).length && !outcome) return null;
    const rewards = outcome?.rewards ?? quest.rewards ?? [];
    // Lean authority-routable payload: the reducer and the server both derive
    // rewards, outcome, and story entries from the canonical quest deck.
    this.store.dispatch({
      type: Actions.COMPLETE_QUEST,
      payload: this.usesCanonicalDeck
        ? {
          questId,
          choiceId: choiceId ?? outcome?.id ?? null,
          completedAt: Date.now(),
        }
        : {
          questId,
          title: quest.title,
          choiceId: choiceId ?? outcome?.id ?? null,
          outcome,
          rewards,
          storyEntries: outcome?.storyLog ?? [],
          completedAt: Date.now(),
        },
    });
    return rewards;
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
