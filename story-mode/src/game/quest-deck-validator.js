import QUEST_DECK from 'specs/QUEST_DECK.json';
import WORLD_MAP from 'specs/WORLD_MAP.json';

// Requirement types QuestEngine.meetsRequirement evaluates. A requirement the
// engine cannot check would leave its quest uncompletable, so the deck fails.
const ENGINE_REQUIREMENT_TYPES = new Set([
  'crop_harvested', 'crop_planted', 'festival_completed', 'item_crafted', 'item_delivered',
  'item_found', 'item_traded', 'reputation', 'season', 'spot_foraged', 'zone_visited',
]);
const ZONE_IDS = new Set(Object.keys(WORLD_MAP.zones ?? {}));
const ECHO_SPEAKERS = new Set(['old_gus', 'maya', 'lila']);

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

    (quest.requirements ?? []).forEach((requirement, reqIndex) => {
      if (!ENGINE_REQUIREMENT_TYPES.has(requirement?.type)) {
        errors.push(`${quest.id}.requirements[${reqIndex}].type ${requirement?.type} is not checked by the quest engine`);
      }
      if (requirement?.type === 'zone_visited' && !ZONE_IDS.has(requirement.id)) {
        errors.push(`${quest.id}.requirements[${reqIndex}] zone_visited needs a WORLD_MAP zone, got ${requirement.id}`);
      }
    });

    // A branch has to change something: its own label, summary, world flag,
    // and rewards. Outcomes that differ only by id are a template, not a choice.
    const [first, second] = quest.outcomes;
    const sameRewards = JSON.stringify(first?.rewards ?? []) === JSON.stringify(second?.rewards ?? []);
    if (first?.label === second?.label || first?.summary === second?.summary || sameRewards) {
      errors.push(`${quest.id} outcomes must differ in label, summary, and rewards`);
    }
    quest.outcomes.forEach((outcome, outcomeIndex) => {
      (outcome?.echoes ?? []).forEach((echo, echoIndex) => {
        if (!ECHO_SPEAKERS.has(echo?.npc) || typeof echo?.line !== 'string' || !echo.line.trim()) {
          errors.push(`${quest.id}.outcomes[${outcomeIndex}].echoes[${echoIndex}] needs a speaking neighbor and a line`);
        }
      });
    });

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

  // Two quests offering the exact same pair of choices means the deck was
  // filled from a template.
  const pairCounts = new Map();
  quests.forEach((quest) => {
    const key = (quest?.outcomes ?? []).map((outcome) => outcome?.label).join(' | ');
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  });
  pairCounts.forEach((count, key) => {
    if (count > 1 && key) errors.push(`${count} quests share the same choices: ${key}`);
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
