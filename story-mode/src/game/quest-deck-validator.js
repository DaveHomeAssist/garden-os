import QUEST_DECK from 'specs/QUEST_DECK.json';

function validateOutcome(quest, outcome, index) {
  const errors = [];
  const prefix = `${quest.id}.outcomes[${index}]`;

  if (!outcome || typeof outcome !== 'object') {
    return [`${prefix} must be an object`];
  }
  if (!outcome.id || typeof outcome.id !== 'string') {
    errors.push(`${prefix}.id is required`);
  }
  if (!outcome.label || typeof outcome.label !== 'string') {
    errors.push(`${prefix}.label is required`);
  }
  if (!Array.isArray(outcome.rewards)) {
    errors.push(`${prefix}.rewards must be an array`);
  }
  if (!outcome.worldState || typeof outcome.worldState !== 'object') {
    errors.push(`${prefix}.worldState is required`);
  }
  if (!Array.isArray(outcome.storyLog) || !outcome.storyLog.length) {
    errors.push(`${prefix}.storyLog must include at least one entry`);
  }

  return errors;
}

export function validateQuestDeck(deck = QUEST_DECK, options = {}) {
  const minBranchingQuests = options.minBranchingQuests ?? 10;
  const errors = [];
  const quests = deck?.quests;

  if (!Array.isArray(quests)) {
    return { valid: false, errors: ['quests must be an array'], branchingQuestCount: 0 };
  }

  let branchingQuestCount = 0;
  quests.forEach((quest, index) => {
    if (!quest?.id) {
      errors.push(`quests[${index}].id is required`);
      return;
    }
    if (!Array.isArray(quest.outcomes) || quest.outcomes.length < 2) {
      errors.push(`${quest.id}.outcomes must include at least 2 outcomes`);
      return;
    }

    branchingQuestCount += 1;
    const seenOutcomeIds = new Set();
    quest.outcomes.forEach((outcome, outcomeIndex) => {
      errors.push(...validateOutcome(quest, outcome, outcomeIndex));
      if (outcome?.id) {
        if (seenOutcomeIds.has(outcome.id)) {
          errors.push(`${quest.id}.outcomes has duplicate id ${outcome.id}`);
        }
        seenOutcomeIds.add(outcome.id);
      }
    });
  });

  if (branchingQuestCount < minBranchingQuests) {
    errors.push(`quest deck needs at least ${minBranchingQuests} branching quests`);
  }

  return {
    valid: errors.length === 0,
    errors,
    branchingQuestCount,
  };
}

export function assertValidQuestDeck(deck = QUEST_DECK, options = {}) {
  const result = validateQuestDeck(deck, options);
  if (!result.valid) {
    throw new Error(`Quest deck validation failed:\n${result.errors.join('\n')}`);
  }
  return result;
}
