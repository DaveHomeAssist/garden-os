/**
 * Choice echoes: what neighbors say about the choices you made in other
 * people's quests. Each quest outcome in specs/QUEST_DECK.json may list
 * echoes ({ npc, line }). When you talk to that neighbor, the most recent
 * echo from a choice you made is folded into their greeting, so a call made
 * for Gus at the forest edge is heard from Lila at the market. Deterministic:
 * newest resolved choice first, ties broken by quest id.
 */
import questDeckData from 'specs/QUEST_DECK.json';

import { getPackQuest } from '../content/content-registry.js';

function findQuest(questId) {
  return (questDeckData.quests ?? []).find((quest) => quest.id === questId) ?? getPackQuest(questId);
}

/** Every echo addressed to this neighbor from choices already made. */
export function getChoiceEchoes(npcId, campaign = {}) {
  const choices = Object.values(campaign.choiceLog ?? {});
  return choices
    .map((choice) => {
      const quest = findQuest(choice.questId);
      const outcome = quest?.outcomes?.find((entry) => entry.id === choice.outcomeId);
      const echo = (outcome?.echoes ?? []).find((entry) => entry.npc === npcId);
      if (!echo?.line) return null;
      return {
        questId: choice.questId,
        outcomeId: choice.outcomeId,
        line: echo.line,
        resolvedAt: Number(choice.resolvedAt) || 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.resolvedAt - left.resolvedAt || left.questId.localeCompare(right.questId));
}

export function getLatestChoiceEcho(npcId, campaign = {}) {
  return getChoiceEchoes(npcId, campaign)[0] ?? null;
}
