import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import questDeck from 'specs/QUEST_DECK.json';
import { QuestPlaythrough, formatPlaythroughFailure } from './quest-playthrough.js';

const basil = questDeck.quests.find((quest) => quest.id === 'lila_basil');

describe('quest playthrough harness', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports quests that no player action can finish', () => {
    const deck = [
      basil,
      { ...basil, id: 'dead_spot', title: 'Dead Spot', requirements: [{ type: 'spot_foraged', id: 'meadow_spot_1', count: 1 }] },
      { ...basil, id: 'dead_item', title: 'Dead Item', requirements: [{ type: 'item_found', id: 'unicorn_horn', count: 1 }] },
    ];
    const run = new QuestPlaythrough({ questDeck: deck, finalChapter: 3, setNow: (ms) => vi.setSystemTime(ms) });
    const report = run.run();
    expect(report.completed).toEqual(['lila_basil']);
    expect(report.stuck.map((quest) => quest.id)).toEqual(['dead_spot', 'dead_item']);
    expect(formatPlaythroughFailure(report)).toMatch(/dead_spot .*spot_foraged:meadow_spot_1 0\/1/);
  });
});
