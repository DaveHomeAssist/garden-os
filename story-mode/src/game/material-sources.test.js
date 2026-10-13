import { describe, expect, it } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import FORAGE_TABLES from 'specs/FORAGE_TABLES.json';
import CRAFTING_RECIPES from 'specs/CRAFTING_RECIPES.json';
import QUEST_DECK from 'specs/QUEST_DECK.json';
import MARKET_PRICES from 'specs/MARKET_PRICES.json';
import CROP_DATA from 'specs/CROP_SCORING_DATA.json';

import { ACTIVITY_REWARD_TABLE } from '../data/festivals-data.js';
import { ITEM_REGISTRY } from './inventory.js';
import { LOOT_TABLES, ZONE_SPOTS } from './foraging.js';

// Every crafting material has to come from somewhere a player can reach:
// forage loot, the market, quest or festival rewards, or another recipe.
// A recipe whose inputs never drop is dead content, so this fails the suite.

function forageItems() {
  const types = new Set(Object.values(ZONE_SPOTS).flatMap((spots) => spots.map((spot) => spot.type)));
  const items = new Set();
  types.forEach((type) => {
    Object.values(LOOT_TABLES[type] ?? {}).forEach((tier) => tier.forEach((entry) => items.add(entry.itemId)));
  });
  return items;
}

function rewardItems() {
  const items = new Set();
  const collect = (rewards) => (rewards ?? []).forEach((reward) => {
    if (reward.type === 'item') items.add(reward.id);
  });
  (QUEST_DECK.quests ?? []).forEach((quest) => {
    collect(quest.rewards);
    (quest.outcomes ?? []).forEach((outcome) => collect(outcome.rewards));
  });
  Object.values(ACTIVITY_REWARD_TABLE).forEach(collect);
  return items;
}

function obtainableItems() {
  const obtainable = new Set([
    ...forageItems(),
    ...Object.keys(MARKET_PRICES.items ?? {}),
    ...rewardItems(),
  ]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const recipe of CRAFTING_RECIPES.recipes) {
      const craftable = recipe.materials.every((material) => obtainable.has(material.itemId));
      if (craftable && !obtainable.has(recipe.output.itemId)) {
        obtainable.add(recipe.output.itemId);
        grew = true;
      }
    }
  }
  return obtainable;
}

describe('crafting material sources', () => {
  it('can craft every recipe from items a player can actually obtain', () => {
    const obtainable = obtainableItems();
    const blocked = CRAFTING_RECIPES.recipes
      .filter((recipe) => !recipe.materials.every((material) => obtainable.has(material.itemId)))
      .map((recipe) => `${recipe.id} needs ${recipe.materials.filter((m) => !obtainable.has(m.itemId)).map((m) => m.itemId).join(', ')}`);
    expect(blocked).toEqual([]);
  });

  it('declares a source for every material the recipes use', () => {
    const catalog = CRAFTING_RECIPES.materials ?? {};
    const used = new Set(CRAFTING_RECIPES.recipes.flatMap((recipe) => recipe.materials.map((m) => m.itemId)));
    const crafted = new Set(CRAFTING_RECIPES.recipes.map((recipe) => recipe.output.itemId));
    const marketItems = new Set(Object.keys(MARKET_PRICES.items ?? {}));
    used.forEach((itemId) => {
      if (crafted.has(itemId) && !catalog[itemId]) return;
      if (marketItems.has(itemId) && !catalog[itemId]) return;
      expect(catalog[itemId]?.sources?.length ?? 0, `${itemId} has no declared source`).toBeGreaterThan(0);
    });
  });
});

describe('forage data contract', () => {
  it('reads every zone spot from WORLD_MAP and every spot type from FORAGE_TABLES', () => {
    for (const [zoneId, zone] of Object.entries(WORLD_MAP.zones)) {
      const spots = zone.foraging?.spots ?? [];
      expect(zone.foraging?.enabled).toBe(spots.length > 0);
      expect(zone.foraging).not.toHaveProperty('lootTable');
      expect(ZONE_SPOTS[zoneId] ?? []).toHaveLength(spots.length);
      spots.forEach((spot) => {
        expect(FORAGE_TABLES.spotTypes[spot.type], `${zoneId}.${spot.id} uses unknown type ${spot.type}`).toBeTruthy();
      });
    }
  });

  it('only drops items the inventory knows', () => {
    const cropIds = new Set(Object.keys(CROP_DATA.crops ?? {}));
    for (const table of Object.values(LOOT_TABLES)) {
      for (const tier of Object.values(table)) {
        for (const entry of tier) {
          const known = Boolean(ITEM_REGISTRY[entry.itemId]) || entry.itemId.endsWith('_seed') || cropIds.has(entry.itemId);
          expect(known, `${entry.itemId} is not in ITEM_REGISTRY`).toBe(true);
        }
      }
    }
  });

  it('keeps the meadow gate reachable from neighborhood foraging, as its blocker copy says', () => {
    const gate = WORLD_MAP.zones.meadow.gate;
    expect(gate.type).toBe('skill');
    expect(gate.requirement.skill).toBe('foraging');
    expect(ZONE_SPOTS.neighborhood.length).toBeGreaterThan(0);
  });
});
