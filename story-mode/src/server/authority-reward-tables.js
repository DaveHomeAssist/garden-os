// Canonical server-owned reward tables for the Story Mode authority runtimes.
// Generated from specs/QUEST_DECK.json and specs/CROP_SCORING_DATA.json plus the
// festival activity tables in src/data/festivals-data.js. Pure data, no imports —
// both the Node authority service and the fetch-compatible worker load this module,
// so it must stay free of Vite aliases, JSON imports, and runtime-specific APIs.

const AUTHORITY_QUEST_REWARDS = {
  gus_tomatoes: {
    outcomes: {
      community: [
        { amount: 1, id: 'heritage_pepper', type: 'seed' },
        { amount: 15, id: 'old_gus', type: 'reputation' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'heritage_pepper', type: 'seed' },
        { amount: 15, id: 'old_gus', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'heritage_pepper', type: 'seed' },
      { amount: 15, id: 'old_gus', type: 'reputation' },
    ],
  },
  gus_compost: {
    outcomes: {
      community: [
        { amount: 1, id: 'compost_supplies', type: 'item' },
        { amount: 20, id: 'old_gus', type: 'reputation' },
        { amount: 15, id: 'soil_science', type: 'xp' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'compost_supplies', type: 'item' },
        { amount: 20, id: 'old_gus', type: 'reputation' },
        { amount: 15, id: 'soil_science', type: 'xp' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'compost_supplies', type: 'item' },
      { amount: 20, id: 'old_gus', type: 'reputation' },
      { amount: 15, id: 'soil_science', type: 'xp' },
    ],
  },
  gus_frost: {
    outcomes: {
      community: [
        { amount: 1, id: 'rare_seed_bundle', type: 'seed' },
        { amount: 25, id: 'old_gus', type: 'reputation' },
        { amount: 20, id: 'gardening', type: 'xp' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'rare_seed_bundle', type: 'seed' },
        { amount: 25, id: 'old_gus', type: 'reputation' },
        { amount: 20, id: 'gardening', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'rare_seed_bundle', type: 'seed' },
      { amount: 25, id: 'old_gus', type: 'reputation' },
      { amount: 20, id: 'gardening', type: 'xp' },
    ],
  },
  maya_sprinkler: {
    outcomes: {
      community: [
        { amount: 1, id: 'smart_watering_can', type: 'item' },
        { amount: 15, id: 'maya', type: 'reputation' },
        { amount: 15, id: 'crafting', type: 'xp' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'smart_watering_can', type: 'item' },
        { amount: 15, id: 'maya', type: 'reputation' },
        { amount: 15, id: 'crafting', type: 'xp' },
        { amount: 5, id: 'crafting', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'smart_watering_can', type: 'item' },
      { amount: 15, id: 'maya', type: 'reputation' },
      { amount: 15, id: 'crafting', type: 'xp' },
    ],
  },
  maya_scanner: {
    outcomes: {
      community: [
        { amount: 1, id: 'soil_scanner', type: 'item' },
        { amount: 20, id: 'maya', type: 'reputation' },
        { amount: 20, id: 'soil_science', type: 'xp' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'soil_scanner', type: 'item' },
        { amount: 20, id: 'maya', type: 'reputation' },
        { amount: 20, id: 'soil_science', type: 'xp' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'soil_scanner', type: 'item' },
      { amount: 20, id: 'maya', type: 'reputation' },
      { amount: 20, id: 'soil_science', type: 'xp' },
    ],
  },
  maya_hybrid: {
    outcomes: {
      community: [
        { amount: 1, id: 'hybrid_seeds', type: 'seed' },
        { amount: 25, id: 'maya', type: 'reputation' },
        { amount: 20, id: 'gardening', type: 'xp' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'hybrid_seeds', type: 'seed' },
        { amount: 25, id: 'maya', type: 'reputation' },
        { amount: 20, id: 'gardening', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'hybrid_seeds', type: 'seed' },
      { amount: 25, id: 'maya', type: 'reputation' },
      { amount: 20, id: 'gardening', type: 'xp' },
    ],
  },
  lila_basil: {
    outcomes: {
      community: [
        { amount: 1, id: 'herb_seeds', type: 'seed' },
        { amount: 10, id: 'lila', type: 'reputation' },
        { amount: 10, id: 'social', type: 'xp' },
        { amount: 3, id: 'lila', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'herb_seeds', type: 'seed' },
        { amount: 10, id: 'lila', type: 'reputation' },
        { amount: 10, id: 'social', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'herb_seeds', type: 'seed' },
      { amount: 10, id: 'lila', type: 'reputation' },
      { amount: 10, id: 'social', type: 'xp' },
    ],
  },
  lila_salsa: {
    outcomes: {
      community: [
        { amount: 1, id: 'recipe_card_salsa', type: 'item' },
        { amount: 20, id: 'lila', type: 'reputation' },
        { amount: 15, id: 'gardening', type: 'xp' },
        { amount: 3, id: 'lila', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'recipe_card_salsa', type: 'item' },
        { amount: 20, id: 'lila', type: 'reputation' },
        { amount: 15, id: 'gardening', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'recipe_card_salsa', type: 'item' },
      { amount: 20, id: 'lila', type: 'reputation' },
      { amount: 15, id: 'gardening', type: 'xp' },
    ],
  },
  lila_recipe: {
    outcomes: {
      community: [
        { amount: 1, id: 'exclusive_seed', type: 'seed' },
        { amount: 30, id: 'lila', type: 'reputation' },
        { amount: 20, id: 'social', type: 'xp' },
        { amount: 15, id: 'crafting', type: 'xp' },
        { amount: 3, id: 'lila', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'exclusive_seed', type: 'seed' },
        { amount: 30, id: 'lila', type: 'reputation' },
        { amount: 20, id: 'social', type: 'xp' },
        { amount: 15, id: 'crafting', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'exclusive_seed', type: 'seed' },
      { amount: 30, id: 'lila', type: 'reputation' },
      { amount: 20, id: 'social', type: 'xp' },
      { amount: 15, id: 'crafting', type: 'xp' },
    ],
  },
  pat_watering: {
    outcomes: {
      community: [
        { amount: 5, id: 'plant_matter', type: 'item' },
        { amount: 10, id: 'neighbor_pat', type: 'reputation' },
        { amount: 3, id: 'neighbor_pat', type: 'reputation' },
      ],
      stewardship: [
        { amount: 5, id: 'plant_matter', type: 'item' },
        { amount: 10, id: 'neighbor_pat', type: 'reputation' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 5, id: 'plant_matter', type: 'item' },
      { amount: 10, id: 'neighbor_pat', type: 'reputation' },
    ],
  },
  sam_bees: {
    outcomes: {
      community: [
        { amount: 1, id: 'honey_jar', type: 'item' },
        { amount: 10, id: 'neighbor_sam', type: 'reputation' },
        { amount: 3, id: 'neighbor_sam', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'honey_jar', type: 'item' },
        { amount: 10, id: 'neighbor_sam', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'honey_jar', type: 'item' },
      { amount: 10, id: 'neighbor_sam', type: 'reputation' },
    ],
  },
  jo_compost: {
    outcomes: {
      community: [
        { amount: 2, id: 'fertilizer', type: 'item' },
        { amount: 10, id: 'neighbor_jo', type: 'reputation' },
        { amount: 3, id: 'neighbor_jo', type: 'reputation' },
      ],
      stewardship: [
        { amount: 2, id: 'fertilizer', type: 'item' },
        { amount: 10, id: 'neighbor_jo', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 2, id: 'fertilizer', type: 'item' },
      { amount: 10, id: 'neighbor_jo', type: 'reputation' },
    ],
  },
  robin_birds: {
    outcomes: {
      community: [
        { amount: 1, id: 'rare_wildflower_seeds', type: 'seed' },
        { amount: 15, id: 'neighbor_robin', type: 'reputation' },
        { amount: 3, id: 'neighbor_robin', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'rare_wildflower_seeds', type: 'seed' },
        { amount: 15, id: 'neighbor_robin', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'rare_wildflower_seeds', type: 'seed' },
      { amount: 15, id: 'neighbor_robin', type: 'reputation' },
    ],
  },
  explore_meadow: {
    outcomes: {
      community: [
        { amount: 2, id: 'rare_wildflower_seeds', type: 'seed' },
        { amount: 20, id: 'foraging', type: 'xp' },
        { amount: 3, id: 'neighbor_robin', type: 'reputation' },
      ],
      stewardship: [
        { amount: 2, id: 'rare_wildflower_seeds', type: 'seed' },
        { amount: 20, id: 'foraging', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 2, id: 'rare_wildflower_seeds', type: 'seed' },
      { amount: 20, id: 'foraging', type: 'xp' },
    ],
  },
  gus_river_path: {
    outcomes: {
      community: [
        { amount: 1, id: 'riverside_access', type: 'item' },
        { amount: 20, id: 'old_gus', type: 'reputation' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'riverside_access', type: 'item' },
        { amount: 20, id: 'old_gus', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'riverside_access', type: 'item' },
      { amount: 20, id: 'old_gus', type: 'reputation' },
    ],
  },
  greenhouse_access: {
    outcomes: {
      community: [
        { amount: 1, id: 'greenhouse_access', type: 'item' },
        { amount: 30, id: 'crafting', type: 'xp' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'greenhouse_access', type: 'item' },
        { amount: 30, id: 'crafting', type: 'xp' },
        { amount: 5, id: 'crafting', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'greenhouse_access', type: 'item' },
      { amount: 30, id: 'crafting', type: 'xp' },
    ],
  },
  lila_watercress: {
    outcomes: {
      community: [
        { amount: 1, id: 'recipe_card_foragers_stew', type: 'item' },
        { amount: 20, id: 'lila', type: 'reputation' },
        { amount: 15, id: 'social', type: 'xp' },
        { amount: 3, id: 'lila', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'recipe_card_foragers_stew', type: 'item' },
        { amount: 20, id: 'lila', type: 'reputation' },
        { amount: 15, id: 'social', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'recipe_card_foragers_stew', type: 'item' },
      { amount: 20, id: 'lila', type: 'reputation' },
      { amount: 15, id: 'social', type: 'xp' },
    ],
  },
  gus_mushroom_logs: {
    outcomes: {
      community: [
        { amount: 3, id: 'shiitake_spores', type: 'seed' },
        { amount: 25, id: 'old_gus', type: 'reputation' },
        { amount: 20, id: 'soil_science', type: 'xp' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 3, id: 'shiitake_spores', type: 'seed' },
        { amount: 25, id: 'old_gus', type: 'reputation' },
        { amount: 20, id: 'soil_science', type: 'xp' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 3, id: 'shiitake_spores', type: 'seed' },
      { amount: 25, id: 'old_gus', type: 'reputation' },
      { amount: 20, id: 'soil_science', type: 'xp' },
    ],
  },
  vanilla_challenge: {
    outcomes: {
      community: [
        { amount: 1, id: 'legendary_seed', type: 'seed' },
        { amount: 30, id: 'gardening', type: 'xp' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'legendary_seed', type: 'seed' },
        { amount: 30, id: 'gardening', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'legendary_seed', type: 'seed' },
      { amount: 30, id: 'gardening', type: 'xp' },
    ],
  },
  prairie_restore: {
    outcomes: {
      community: [
        { amount: 40, id: 'composting', type: 'xp' },
        { amount: 1, id: 'rare_earth', type: 'item' },
        { amount: 3, id: 'neighbor_sam', type: 'reputation' },
      ],
      stewardship: [
        { amount: 40, id: 'composting', type: 'xp' },
        { amount: 1, id: 'rare_earth', type: 'item' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 40, id: 'composting', type: 'xp' },
      { amount: 1, id: 'rare_earth', type: 'item' },
    ],
  },
  maya_masterpiece: {
    outcomes: {
      community: [
        { amount: 1, id: 'ability_crop_crossbreeding', type: 'item' },
        { amount: 30, id: 'maya', type: 'reputation' },
        { amount: 3, id: 'maya', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'ability_crop_crossbreeding', type: 'item' },
        { amount: 30, id: 'maya', type: 'reputation' },
        { amount: 5, id: 'crafting', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'ability_crop_crossbreeding', type: 'item' },
      { amount: 30, id: 'maya', type: 'reputation' },
    ],
  },
  gus_legacy: {
    outcomes: {
      community: [
        { amount: 1, id: 'legendary_trowel_recipe', type: 'item' },
        { amount: 3, id: 'heirloom_seeds', type: 'seed' },
        { amount: 30, id: 'old_gus', type: 'reputation' },
        { amount: 3, id: 'old_gus', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'legendary_trowel_recipe', type: 'item' },
        { amount: 3, id: 'heirloom_seeds', type: 'seed' },
        { amount: 30, id: 'old_gus', type: 'reputation' },
        { amount: 5, id: 'social', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'legendary_trowel_recipe', type: 'item' },
      { amount: 3, id: 'heirloom_seeds', type: 'seed' },
      { amount: 30, id: 'old_gus', type: 'reputation' },
    ],
  },
  lila_cookbook: {
    outcomes: {
      community: [
        { amount: 1, id: 'exclusive_cosmetics', type: 'item' },
        { amount: 40, id: 'social', type: 'xp' },
        { amount: 30, id: 'lila', type: 'reputation' },
        { amount: 3, id: 'lila', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'exclusive_cosmetics', type: 'item' },
        { amount: 40, id: 'social', type: 'xp' },
        { amount: 30, id: 'lila', type: 'reputation' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'exclusive_cosmetics', type: 'item' },
      { amount: 40, id: 'social', type: 'xp' },
      { amount: 30, id: 'lila', type: 'reputation' },
    ],
  },
  market_day: {
    outcomes: {
      community: [
        { amount: 1, id: 'rare_materials_bundle', type: 'item' },
        { amount: 25, id: 'social', type: 'xp' },
        { amount: 3, id: 'neighbor_pat', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'rare_materials_bundle', type: 'item' },
        { amount: 25, id: 'social', type: 'xp' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'rare_materials_bundle', type: 'item' },
      { amount: 25, id: 'social', type: 'xp' },
    ],
  },
  festival_champion: {
    outcomes: {
      community: [
        { amount: 1, id: 'trophy_festival_champion', type: 'item' },
        { amount: 1, id: 'scoring_buff_global_5pct', type: 'item' },
        { amount: 3, id: 'neighbor_jo', type: 'reputation' },
      ],
      stewardship: [
        { amount: 1, id: 'trophy_festival_champion', type: 'item' },
        { amount: 1, id: 'scoring_buff_global_5pct', type: 'item' },
        { amount: 5, id: 'gardening', type: 'xp' },
      ],
    },
    rewards: [
      { amount: 1, id: 'trophy_festival_champion', type: 'item' },
      { amount: 1, id: 'scoring_buff_global_5pct', type: 'item' },
    ],
  },
};

const AUTHORITY_FESTIVAL_ACTIVITY_REWARDS = {
  item: [{ amount: 1, id: 'festival_token', type: 'item' }],
  reputation: [{ amount: 10, id: 'lila', type: 'reputation' }],
  seed: [{ amount: 1, id: 'festival_seed_bundle', type: 'seed' }],
  xp: [{ amount: 15, id: 'festival', type: 'xp' }],
};

const AUTHORITY_FESTIVALS = {
  bloom_festival: {
    activities: {
      seed_swap: 'seed',
      flower_show: 'reputation',
    },
  },
  growth_surge: {
    activities: {
      watering_race: 'xp',
      shade_building: 'item',
    },
  },
  harvest_week: {
    activities: {
      harvest_competition: 'item',
      recipe_contest: 'reputation',
    },
  },
  dormancy_challenge: {
    activities: {
      soil_workshop: 'xp',
      seed_planning: 'seed',
    },
  },
};

const AUTHORITY_RECIPE_TABLE = {
  herb_bowl: ['basil', 'dill'],
  tomato_sandwich: ['cherry_tom', 'basil', 'lettuce'],
  weeknight_pasta: ['cherry_tom', 'basil', 'pepper', 'onion'],
  moms_sauce: ['cherry_tom', 'basil', 'pepper', 'onion', 'carrot'],
  stir_fry: ['bok_choy', 'scallion', 'pepper', 'garlic'],
  garden_salad: ['lettuce', 'radish', 'carrot', 'chives'],
  foragers_stew: ['wild_garlic', 'shiitake_mushroom', 'watercress', 'prairie_onion'],
  garden_deluxe_salsa: ['ghost_pepper', 'cherry_tom', 'cilantro', 'onion'],
};

export {
  AUTHORITY_FESTIVAL_ACTIVITY_REWARDS,
  AUTHORITY_FESTIVALS,
  AUTHORITY_QUEST_REWARDS,
  AUTHORITY_RECIPE_TABLE,
};
