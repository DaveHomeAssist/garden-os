import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import questDeck from 'specs/QUEST_DECK.json';
import { QuestPlaythrough, formatPlaythroughFailure } from './quest-playthrough.js';

// Data-driven: walks every quest in QUEST_DECK from offer to turn-in using only
// player actions. Split per outcome path so vitest can run both in parallel.
describe('quest reachability: stewardship choices', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts and turns in every quest in the deck by the end of chapter 12', () => {
    const run = new QuestPlaythrough({ outcome: 'stewardship', setNow: (ms) => vi.setSystemTime(ms) });
    const report = run.run();
    expect(formatPlaythroughFailure(report)).toBe('');
    expect(report.completed).toHaveLength(questDeck.quests.length);
    expect(Object.keys(report.completedAt).sort()).toEqual(questDeck.quests.map((quest) => quest.id).sort());
  }, 120_000);
});
