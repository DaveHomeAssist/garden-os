import { Actions } from './store.js';
import { getCropById } from '../data/crops.js';

const BASE_COOLDOWN_MS = 300_000;

// Biome crop seeds discoverable through foraging (zone → crop IDs)
const BIOME_CROP_SEEDS = {
  meadow: ['wild_clover', 'prairie_onion', 'meadow_sage'],
  riverside: ['watercress', 'wild_rice', 'marsh_marigold'],
  forest_edge: ['shiitake_mushroom', 'wild_garlic', 'woodland_strawberry'],
};

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
    uncommon: [{ itemId: 'rosemary_seed', count: [1, 1], weight: 20 }, { itemId: 'meadow_sage_seed', count: [1, 1], weight: 8, biomeCrop: 'meadow_sage' }],
    rare: [{ itemId: 'heirloom_herb_seed', count: [1, 1], weight: 10 }],
  },
  berry_bush: {
    common: [{ itemId: 'fresh_berries', count: [1, 3], weight: 45 }, { itemId: 'strawberry_seed', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'blueberry_seed', count: [1, 1], weight: 20 }, { itemId: 'woodland_strawberry_seed', count: [1, 1], weight: 8, biomeCrop: 'woodland_strawberry' }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }],
  },
  rock_pile: {
    common: [{ itemId: 'stone', count: [1, 3], weight: 50 }, { itemId: 'scrap_metal', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'crystal_shard', count: [1, 1], weight: 15 }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }],
  },
  driftwood: {
    common: [{ itemId: 'wood', count: [1, 3], weight: 55 }, { itemId: 'scrap_metal', count: [1, 2], weight: 25 }],
    uncommon: [{ itemId: 'festival_seed_bundle', count: [1, 1], weight: 15 }, { itemId: 'watercress_seed', count: [1, 1], weight: 8, biomeCrop: 'watercress' }],
    rare: [{ itemId: 'crystal_shard', count: [1, 1], weight: 5 }, { itemId: 'wild_rice_seed', count: [1, 1], weight: 4, biomeCrop: 'wild_rice' }],
  },
  mushroom_log: {
    common: [{ itemId: 'mushroom_spores', count: [1, 2], weight: 55 }, { itemId: 'compost', count: [1, 2], weight: 30 }],
    uncommon: [{ itemId: 'plant_matter', count: [2, 4], weight: 10 }, { itemId: 'shiitake_seed', count: [1, 1], weight: 8, biomeCrop: 'shiitake_mushroom' }],
    rare: [{ itemId: 'rare_earth', count: [1, 1], weight: 5 }, { itemId: 'wild_garlic_seed', count: [1, 1], weight: 4, biomeCrop: 'wild_garlic' }],
  },
  wildflower_field: {
    common: [{ itemId: 'plant_matter', count: [1, 3], weight: 50 }, { itemId: 'marigold_seed', count: [1, 2], weight: 35 }],
    uncommon: [{ itemId: 'lavender_seed', count: [1, 1], weight: 10 }, { itemId: 'wild_clover_seed', count: [1, 1], weight: 8, biomeCrop: 'wild_clover' }],
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
    this.loadPersistedCooldowns();
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

  loadPersistedCooldowns() {
    this.cooldowns.clear();
    const persisted = this.store.getState().campaign.worldState?.forageState?.cooldowns ?? {};
    Object.entries(persisted).forEach(([spotId, until]) => {
      if (Number.isFinite(until) && until > Date.now()) {
        this.cooldowns.set(spotId, until);
      }
    });
  }

  serializeCooldowns() {
    return Object.fromEntries(this.cooldowns.entries());
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

    const timestamp = Date.now();
    const season = state.season.season ?? 'spring';
    const level = this.skillSystem.getLevel('foraging');
    const dayNumber = Math.floor(timestamp / 86_400_000);
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
    const cooldownUntil = timestamp + BASE_COOLDOWN_MS;
    this.cooldowns.set(spotId, cooldownUntil);
    this.store.dispatch({
      type: Actions.FORAGE,
      payload: {
        spotId,
        zoneId,
        items,
        xpGained,
        timestamp,
        cooldownUntil,
      },
    });

    // Unlock biome crops discovered through foraging
    const biomeCropsFound = [];
    for (const pull of items) {
      const lootEntry = lootPool.find((e) => e.itemId === pull.itemId);
      if (lootEntry?.biomeCrop) {
        const alreadyUnlocked = new Set(state.campaign.biomeCropsUnlocked ?? []);
        if (!alreadyUnlocked.has(lootEntry.biomeCrop)) {
          this.store.dispatch({
            type: Actions.UNLOCK_BIOME_CROP,
            payload: { cropId: lootEntry.biomeCrop },
          });
          biomeCropsFound.push(lootEntry.biomeCrop);
        }
      }
    }

    return {
      success: true,
      items,
      xpGained,
      biomeCropsFound,
      message: biomeCropsFound.length
        ? `Discovered ${biomeCropsFound.map((id) => getCropById(id)?.name ?? id).join(', ')}!`
        : items.some((entry) => entry.dropped)
          ? 'Found items, but your pack was full.'
          : 'Foraging successful.',
    };
  }

  resetDaily() {
    this.cooldowns.clear();
  }
}
