import { Actions } from './store.js';
import { getCropById } from '../data/crops.js';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import FORAGE_TABLES from 'specs/FORAGE_TABLES.json';

// Forage spots live in specs/WORLD_MAP.json (zones.*.foraging.spots) and what
// each spot type yields lives in specs/FORAGE_TABLES.json. This module reads
// both; it keeps no loot or spot data of its own.

const DEFAULT_COOLDOWN_MINUTES = 5;
const LOOT_TIERS = ['common', 'uncommon', 'rare'];

function buildZoneSpots(worldMap = WORLD_MAP) {
  return Object.fromEntries(
    Object.entries(worldMap.zones ?? {})
      .filter(([, zone]) => zone.foraging?.enabled && Array.isArray(zone.foraging.spots) && zone.foraging.spots.length)
      .map(([zoneId, zone]) => [zoneId, zone.foraging.spots.map((spot) => ({
        id: spot.id,
        position: { x: spot.position.x, z: spot.position.z },
        type: spot.type,
        ...(Number.isFinite(spot.xpGained) ? { xpGained: spot.xpGained } : {}),
      }))]),
  );
}

function buildLootTables(forageTables = FORAGE_TABLES) {
  return Object.fromEntries(
    Object.entries(forageTables.spotTypes ?? {}).map(([type, table]) => [
      type,
      Object.fromEntries(LOOT_TIERS
        .filter((tier) => Array.isArray(table[tier]))
        .map((tier) => [tier, table[tier].map((entry) => ({ ...entry, count: [...entry.count] }))])),
    ]),
  );
}

function getZoneCooldownMs(zoneId, worldMap = WORLD_MAP) {
  const minutes = Number(worldMap.zones?.[zoneId]?.foraging?.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES);
  return Math.max(1, minutes) * 60_000;
}

function entryInSeason(entry, season) {
  return !Array.isArray(entry.seasons) || entry.seasons.includes(season);
}

const ZONE_SPOTS = buildZoneSpots();
const LOOT_TABLES = buildLootTables();

// Biome crop seeds discoverable through foraging (zone -> crop ids), from the
// zones' own biomeCrops lists.
const BIOME_CROP_SEEDS = Object.fromEntries(
  Object.keys(ZONE_SPOTS).map((zoneId) => [zoneId, [...(WORLD_MAP.zones[zoneId]?.biomeCrops ?? [])]]),
);

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
      loot: (LOOT_TABLES[spot.type]?.[season === 'winter' ? 'uncommon' : 'common'] ?? [])
        .filter((entry) => entryInSeason(entry, season)),
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
    const rules = FORAGE_TABLES.rarityRules ?? {};
    const rareRule = rules.rareWeightMultiplierAtLevel ?? { level: 5, multiplier: 2 };
    const bonusRule = rules.bonusRareEarthAtLevel ?? { level: 10, weight: 2 };
    const commonPool = (table.common ?? []).filter((entry) => entryInSeason(entry, season));
    const rarePool = [...(table.uncommon ?? []), ...(table.rare ?? [])].filter((entry) => entryInSeason(entry, season));
    const lootPool = [...commonPool, ...rarePool.map((entry) => ({
      ...entry,
      weight: entry.weight * (level >= rareRule.level ? rareRule.multiplier : 1),
    }))];
    if (level >= bonusRule.level) {
      lootPool.push({ itemId: 'rare_earth', count: [1, 1], weight: bonusRule.weight });
    }
    const pulls = 1 + (level >= (rules.secondPullAtLevel ?? 3) ? 1 : 0);
    const multiplier = level >= (rules.doubleCountAtLevel ?? 7) ? 2 : 1;
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

    const xpGained = (spot.xpGained ?? 20) + (items.some((entry) => entry.itemId === 'rare_earth') ? 10 : 0);
    const cooldownUntil = timestamp + getZoneCooldownMs(zoneId);
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

export {
  BIOME_CROP_SEEDS,
  LOOT_TABLES,
  ZONE_SPOTS,
  buildLootTables,
  buildZoneSpots,
  getZoneCooldownMs,
};
