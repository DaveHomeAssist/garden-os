import { describe, expect, it } from 'vitest';

import questDeckData from 'specs/QUEST_DECK.json';

import { getChoiceEchoes, getLatestChoiceEcho } from './quest-echoes.js';
import { validateQuestDeck } from '../game/quest-deck-validator.js';

function choice(questId, outcomeId, resolvedAt) {
  return { [questId]: { questId, outcomeId, choiceId: outcomeId, resolvedAt } };
}

describe('choice echoes', () => {
  it('lets a choice in Gus\'s quest be heard from a different neighbor', () => {
    const shared = { choiceLog: choice('gus_tomatoes', 'share_seed', 10) };
    const kept = { choiceLog: choice('gus_tomatoes', 'save_seed_line', 10) };
    expect(getLatestChoiceEcho('lila', shared)?.line).toMatch(/half the yards/);
    expect(getLatestChoiceEcho('lila', kept)).toBeNull();
    expect(getLatestChoiceEcho('maya', kept)?.line).toMatch(/true to type/);
    expect(getLatestChoiceEcho('old_gus', shared)).toBeNull();
  });

  it('returns the newest choice first', () => {
    const campaign = {
      choiceLog: {
        ...choice('gus_tomatoes', 'share_seed', 10),
        ...choice('maya_scanner', 'share_map', 20),
      },
    };
    const echoes = getChoiceEchoes('lila', campaign);
    expect(echoes.map((echo) => echo.questId)).toEqual(['maya_scanner', 'gus_tomatoes']);
  });

  it('gives every quest two authored branches with an echo each', () => {
    for (const quest of questDeckData.quests) {
      const [first, second] = quest.outcomes;
      expect(first.label).not.toBe(second.label);
      expect(first.echoes.length + second.echoes.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('quest deck validator', () => {
  it('rejects a deck filled from a template', () => {
    const template = (id) => ({
      id,
      requirements: [{ type: 'season', id: 'spring', count: 1 }],
      outcomes: [
        { id: 'a', label: 'Share the result', summary: 'x', rewards: [], worldState: {}, storyLog: [{}] },
        { id: 'b', label: 'Document the lesson', summary: 'y', rewards: [{ type: 'xp', id: 'gardening', amount: 5 }], worldState: {}, storyLog: [{}] },
      ],
    });
    const result = validateQuestDeck({ quests: [template('one'), template('two')] }, { minBranchingQuests: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/share the same choices/);
  });

  it('rejects requirements the quest engine cannot check', () => {
    const quest = {
      id: 'broken',
      requirements: [{ type: 'item_teleported', id: 'x', count: 1 }],
      outcomes: [
        { id: 'a', label: 'A', summary: 'a', rewards: [], worldState: {}, storyLog: [{}] },
        { id: 'b', label: 'B', summary: 'b', rewards: [{ type: 'xp', id: 'gardening', amount: 1 }], worldState: {}, storyLog: [{}] },
      ],
    };
    const result = validateQuestDeck({ quests: [quest] }, { minBranchingQuests: 1 });
    expect(result.errors.join(' ')).toMatch(/not checked by the quest engine/);
  });
});
