import { Actions } from './store.js';

const BASE_COOLDOWN_MS = 300_000;

const ZONE_SPOTS = {
  meadow: [
    { id: 'meadow_herbs', position: { x: -2.2, z: 1.1 }, type: 'herb_patch' },
    { id: 'meadow_rocks', position: { x: 1.8, z: -1.2 }, type: 'rock_pile' },
    { id: 'meadow_flowers', position: { x: 2.7, z: 2.4 }, type: 'wildflower_field' },
  ],
  riverside: [
    { id: 'riverside_berries', position: { x: -1.4, z: 2.6 }, type: 'berry_bush' },
    { id: 'riverside_driftwood', position: { x: 2.9, z: -0.7 }, type: 'driftwood' },
  ],
  forest_edge: [
    { id: 'forest_herbs', position: { x: -2.8, z: 0.9 }, type: 'herb_patch' },
    { id: 'forest_berries', position: { x: 1.9, z: 1.7 }, type: 'berry_bush' },
    { id: 'forest_mushrooms', position: { x: 0.4, z: -2.1 }, type: 'mushroom_log' },
  ],
};

const LOOT_TABLES = {
  herb_patch: {
    common: [{ itemId: 'basil_seed', count: [1, 3], weight: 40 }, { itemId: 'cilantro_seed', count: [1, 2], weight: 30 }, { itemId: 'dried_herbs', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'rosemary_seed', count: [1, 1], weight: 20 }],
    rare: [{ itemId: 'heirloom_herb_seed', count: [1, 1], weight: 10 }],
  },
  berry_bush: {
    common: [{ itemId: 'fresh_berries', count: [1, 3], weight: 45 }, { itemId: 'strawberry_seed', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'blueberry_seed', count: [1, 1], weight: 20 }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }],
  },
  rock_pile: {
    common: [{ itemId: 'stone', count: [1, 3], weight: 50 }, { itemId: 'scrap_metal', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'crystal_shard', count: [1, 1], weight: 15 }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }],
  },
  driftwood: {
    common: [{ itemId: 'wood', count: [1, 3], weight: 55 }, { itemId: 'scrap_metal', count: [1, 2], weight: 25 }],
    uncommon: [{ itemId: 'festival_seed_bundle', count: [1, 1], weight: 15 }],
    rare: [{ itemId: 'crystal_shard', count: [1, 1], weight: 5 }],
  },
  mushroom_log: {
    common: [{ itemId: 'mushroom_spores', count: [1, 2], weight: 55 }, { itemId: 'compost', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'plant_matter', count: [2, 4], weight: 10 }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }],
  },
  wildflower_field: {
    common: [{ itemId: 'plant_matter', count: [1, 3], weight: 50 }, { itemId: 'marigold_seed', count: [1, 2], weight: 35 }],
    uncommon: [{ itemId: 'lavender_seed', count: [1, 1], weight: 10 }],
    rare: [{ itemId: 'festival_token', count: [1, 1], weight: 5 }],
  },
};

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickWeighted(items, seed) {
  const total = items.reduce((sum, entry) => sum + entry.weight, 0);
  let target = seed % total;
  for (const entry of items) {
    if (target < entry.weight) return entry;
    target -= entry.weight;
  }
  return items[0];
}

export class ForagingSystem {
  constructor(store, inventory, skillSystem) {
    this.store = store;
    this.inventory = inventory;
    this.skillSystem = skillSystem;
    this.cooldowns = new Map();
  }

  getCurrentZoneId() {
    return this.store.getState().campaign.worldState?.currentZone ?? 'player_plot';
  }

  getForagingSpots(zoneId) {
    return (ZONE_SPOTS[zoneId] ?? []).map((spot) => ({
      ...spot,
      available: this.isAvailable(spot.id),
      cooldownRemaining: Math.max(0, (this.cooldowns.get(spot.id) ?? 0) - Date.now()),
    }));
  }

  isAvailable(spotId) {
    return (this.cooldowns.get(spotId) ?? 0) <= Date.now();
  }

  getSeasonalLoot(zoneId, season) {
    const spots = this.getForagingSpots(zoneId);
    return spots.map((spot) => ({
      ...spot,
      loot: LOOT_TABLES[spot.type]?.[season === 'winter' ? 'uncommon' : 'common'] ?? [],
    }));
  }

  forage(spotId) {
    const state = this.store.getState();
    const zoneId = this.getCurrentZoneId();
    const spot = (ZONE_SPOTS[zoneId] ?? []).find((entry) => entry.id === spotId);
    if (!spot) {
      return { success: false, items: [], xpGained: 0, message: 'No foraging spot here.' };
    }
    if (!this.isAvailable(spotId)) {
      return { success: false, items: [], xpGained: 0, message: 'This patch needs time to recover.' };
    }

    const season = state.season.season ?? 'spring';
    const level = this.skillSystem.getLevel('foraging');
    const dayNumber = Math.floor(Date.now() / 86_400_000);
    const seedBase = hashString(`${zoneId}:${spotId}:${season}:${dayNumber}:${level}`);
    const table = LOOT_TABLES[spot.type] ?? { common: [] };
    const commonPool = [...(table.common ?? [])];
    const rarePool = [...(table.uncommon ?? []), ...(table.rare ?? [])];
    const lootPool = [...commonPool, ...rarePool.map((entry) => ({
      ...entry,
      weight: entry.weight * (level >= 5 ? 2 : 1),
    }))];
    if (level >= 10) {
      lootPool.push({ itemId: 'rare_earth', count: [1, 1], weight: 2 });
    }
    const pulls = 1 + (level >= 3 ? 1 : 0);
    const multiplier = level >= 7 ? 2 : 1;
    const items = [];

    for (let pull = 0; pull < pulls; pull += 1) {
      const choice = pickWeighted(lootPool, seedBase + (pull * 17));
      const [min, max] = choice.count;
      const spread = max - min + 1;
      const amount = (min + ((seedBase + pull) % spread)) * multiplier;
      const added = this.inventory.addItem(choice.itemId, amount);
      if (!added.success) {
        items.push({ itemId: choice.itemId, count: amount, dropped: true });
      } else {
        items.push({ itemId: choice.itemId, count: amount });
      }
    }

    const xpGained = 20 + (items.some((entry) => entry.itemId === 'rare_earth') ? 10 : 0);
    this.cooldowns.set(spotId, Date.now() + BASE_COOLDOWN_MS);
    this.store.dispatch({
      type: Actions.FORAGE,
      payload: { spotId, zoneId, items, xpGained },
    });

    return {
      success: true,
      items,
      xpGained,
      message: items.some((entry) => entry.dropped)
        ? 'Found items, but your pack was full.'
        : 'Foraging successful.',
    };
  }

  resetDaily() {
    this.cooldowns.clear();
  }
}
