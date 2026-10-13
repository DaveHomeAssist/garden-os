// Content pack validation. Packs are declarative data: every field a pack can
// set is checked here against the same contracts the official specs follow,
// so modded crops score, modded quests run, and nothing in a pack executes.
// See specs/CONTENT_PACK_SCHEMA.json and docs/CREATOR_GUIDE.md.

import WORLD_MAP from 'specs/WORLD_MAP.json';

const ID_PATTERN = /^[a-z0-9_]+$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const CONTENT_TYPES = ['crops', 'zones', 'quests', 'npcs'];
const SUPPORTED_FORMAT_VERSIONS = [1];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const MAX_TEXT = 280;
const MAX_ENTRIES_PER_TYPE = 40;
const REQUIREMENT_TYPES = new Set([
  'crop_harvested', 'crop_planted', 'festival_completed', 'item_crafted', 'item_delivered',
  'item_found', 'item_traded', 'reputation', 'season', 'spot_foraged', 'zone_visited',
]);
const REWARD_TYPES = new Set(['reputation', 'xp', 'seed', 'item']);
const ZONE_IDS = new Set(Object.keys(WORLD_MAP.zones ?? {}));

function pushRequiredString(errors, value, path, max = MAX_TEXT) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} must be a non-empty string`);
    return;
  }
  if (value.length > max) errors.push(`${path} must be ${max} characters or fewer`);
}

function pushOptionalString(errors, value, path, max = MAX_TEXT) {
  if (value == null) return;
  pushRequiredString(errors, value, path, max);
}

function pushId(errors, value, path) {
  pushRequiredString(errors, value, path, 60);
  if (typeof value === 'string' && !ID_PATTERN.test(value)) {
    errors.push(`${path} must use lowercase letters, numbers, and underscores`);
  }
}

function pushNumber(errors, value, path, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${path} must be a number from ${min} to ${max}`);
  }
}

function pushBoolean(errors, value, path) {
  if (typeof value !== 'boolean') errors.push(`${path} must be true or false`);
}

function pushIdList(errors, value, path) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of ids`);
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !ID_PATTERN.test(entry)) errors.push(`${path}[${index}] must be an id`);
  });
}

function pushOfficialCollision(errors, isOfficial, type, id, path) {
  if (typeof id === 'string' && isOfficial(type, id)) {
    errors.push(`${path} "${id}" is official content and cannot be replaced by a pack`);
  }
}

function validateCrop(crop, index, errors, isOfficial) {
  const path = `content.crops[${index}]`;
  pushId(errors, crop?.id, `${path}.id`);
  pushOfficialCollision(errors, isOfficial, 'crops', crop?.id, `${path}.id`);
  pushRequiredString(errors, crop?.name, `${path}.name`, 40);
  pushRequiredString(errors, crop?.faction, `${path}.faction`, 40);
  pushOptionalString(errors, crop?.emoji, `${path}.emoji`, 8);
  pushOptionalString(errors, crop?.short, `${path}.short`, 6);
  pushNumber(errors, crop?.chapterUnlock, `${path}.chapterUnlock`, 1, 12);
  // Scoring inputs (specs/SCORING_RULES.md): a crop without them cannot score.
  pushNumber(errors, crop?.sunMin, `${path}.sunMin`, 0, 12);
  pushNumber(errors, crop?.sunIdeal, `${path}.sunIdeal`, 0, 12);
  if (Number.isFinite(crop?.sunMin) && Number.isFinite(crop?.sunIdeal) && crop.sunIdeal < crop.sunMin) {
    errors.push(`${path}.sunIdeal must be at least sunMin`);
  }
  pushBoolean(errors, crop?.support, `${path}.support`);
  pushNumber(errors, crop?.shadeScore, `${path}.shadeScore`, 0, 5);
  pushBoolean(errors, crop?.coolSeason, `${path}.coolSeason`);
  pushBoolean(errors, crop?.tall, `${path}.tall`);
  pushNumber(errors, crop?.water, `${path}.water`, 1, 3);
  pushIdList(errors, crop?.companions, `${path}.companions`);
  pushIdList(errors, crop?.conflicts, `${path}.conflicts`);
  if (!crop?.seasonalMultipliers || typeof crop.seasonalMultipliers !== 'object') {
    errors.push(`${path}.seasonalMultipliers must be an object`);
  } else {
    SEASONS.forEach((season) => pushNumber(errors, crop.seasonalMultipliers[season], `${path}.seasonalMultipliers.${season}`, 0, 2));
  }
}

function validateZone(zone, index, errors, isOfficial) {
  const path = `content.zones[${index}]`;
  pushId(errors, zone?.id, `${path}.id`);
  pushOfficialCollision(errors, isOfficial, 'zones', zone?.id, `${path}.id`);
  pushRequiredString(errors, zone?.name, `${path}.name`, 60);
  pushRequiredString(errors, zone?.biome, `${path}.biome`, 40);
  pushOptionalString(errors, zone?.description, `${path}.description`);
}

function validateRewards(rewards, path, errors) {
  if (!Array.isArray(rewards)) {
    errors.push(`${path} must be an array`);
    return;
  }
  rewards.forEach((reward, index) => {
    const rewardPath = `${path}[${index}]`;
    if (!REWARD_TYPES.has(reward?.type)) errors.push(`${rewardPath}.type must be one of ${[...REWARD_TYPES].join(', ')}`);
    pushId(errors, reward?.id, `${rewardPath}.id`);
    const max = reward?.type === 'reputation' ? 20 : reward?.type === 'xp' ? 50 : 5;
    pushNumber(errors, reward?.amount ?? 1, `${rewardPath}.amount`, 1, max);
  });
}

function validateQuest(quest, index, errors, isOfficial) {
  const path = `content.quests[${index}]`;
  pushId(errors, quest?.id, `${path}.id`);
  pushOfficialCollision(errors, isOfficial, 'quests', quest?.id, `${path}.id`);
  pushId(errors, quest?.npc, `${path}.npc`);
  pushRequiredString(errors, quest?.title, `${path}.title`, 60);
  pushOptionalString(errors, quest?.description, `${path}.description`);
  if (!Array.isArray(quest?.requirements) || !quest.requirements.length) {
    errors.push(`${path}.requirements must be a non-empty array`);
  } else {
    quest.requirements.forEach((requirement, reqIndex) => {
      const reqPath = `${path}.requirements[${reqIndex}]`;
      if (!REQUIREMENT_TYPES.has(requirement?.type)) errors.push(`${reqPath}.type is not a requirement the quest engine can check`);
      pushRequiredString(errors, requirement?.id, `${reqPath}.id`, 60);
      pushNumber(errors, requirement?.count ?? 1, `${reqPath}.count`, 1, 99);
      if (requirement?.type === 'zone_visited' && !ZONE_IDS.has(requirement.id)) {
        errors.push(`${reqPath}.id must be a WORLD_MAP zone`);
      }
    });
  }
  validateRewards(quest?.rewards, `${path}.rewards`, errors);
  if (!Array.isArray(quest?.outcomes) || quest.outcomes.length < 2) {
    errors.push(`${path}.outcomes must include at least 2 outcomes`);
  } else {
    const ids = new Set();
    quest.outcomes.forEach((outcome, outIndex) => {
      const outPath = `${path}.outcomes[${outIndex}]`;
      pushId(errors, outcome?.id, `${outPath}.id`);
      if (ids.has(outcome?.id)) errors.push(`${outPath}.id repeats another outcome`);
      ids.add(outcome?.id);
      pushRequiredString(errors, outcome?.label, `${outPath}.label`, 60);
      validateRewards(outcome?.rewards, `${outPath}.rewards`, errors);
      if (outcome?.worldState != null && typeof outcome.worldState !== 'object') errors.push(`${outPath}.worldState must be an object`);
    });
  }
}

function validateNpc(npc, index, errors, isOfficial) {
  const path = `content.npcs[${index}]`;
  pushId(errors, npc?.id, `${path}.id`);
  pushOfficialCollision(errors, isOfficial, 'npcs', npc?.id, `${path}.id`);
  pushRequiredString(errors, npc?.name, `${path}.name`, 40);
  pushRequiredString(errors, npc?.role, `${path}.role`, 60);
  pushOptionalString(errors, npc?.personality, `${path}.personality`);
  pushOptionalString(errors, npc?.greeting, `${path}.greeting`);
  pushOptionalString(errors, npc?.farewell, `${path}.farewell`);
  if (npc?.zone != null && !ZONE_IDS.has(npc.zone)) errors.push(`${path}.zone must be a WORLD_MAP zone`);
  if (npc?.position != null) {
    pushNumber(errors, npc.position?.x, `${path}.position.x`, -12, 12);
    pushNumber(errors, npc.position?.z, `${path}.position.z`, -12, 12);
  }
  if (npc?.seasons != null) {
    if (!Array.isArray(npc.seasons) || npc.seasons.some((season) => !SEASONS.includes(season))) {
      errors.push(`${path}.seasons must list spring, summer, fall, or winter`);
    }
  }
}

/**
 * @param {object} pack
 * @param {{ isOfficial?: (type: string, id: string) => boolean }} [options]
 */
export function validateContentPack(pack, { isOfficial = () => false } = {}) {
  const errors = [];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return { valid: false, errors: ['pack must be an object'] };
  }

  pushId(errors, pack.id, 'id');
  pushRequiredString(errors, pack.title, 'title', 80);
  pushOptionalString(errors, pack.author, 'author', 80);
  if (typeof pack.version !== 'string' || !VERSION_PATTERN.test(pack.version)) {
    errors.push('version must use semver, for example 1.0.0');
  }
  if (pack.formatVersion != null && !SUPPORTED_FORMAT_VERSIONS.includes(pack.formatVersion)) {
    errors.push(`formatVersion ${pack.formatVersion} is not supported; this game reads format ${SUPPORTED_FORMAT_VERSIONS.join(', ')}`);
  }
  if (!pack.content || typeof pack.content !== 'object' || Array.isArray(pack.content)) {
    errors.push('content must be an object');
  }

  const content = pack.content ?? {};
  Object.keys(content).forEach((key) => {
    if (!CONTENT_TYPES.includes(key)) {
      errors.push(`content.${key} is not supported`);
    }
  });

  CONTENT_TYPES.forEach((type) => {
    if (content[type] == null) return;
    if (!Array.isArray(content[type])) {
      errors.push(`content.${type} must be an array`);
    } else if (content[type].length > MAX_ENTRIES_PER_TYPE) {
      errors.push(`content.${type} can hold at most ${MAX_ENTRIES_PER_TYPE} entries`);
    }
  });

  (Array.isArray(content.crops) ? content.crops : []).forEach((crop, index) => validateCrop(crop, index, errors, isOfficial));
  (Array.isArray(content.zones) ? content.zones : []).forEach((zone, index) => validateZone(zone, index, errors, isOfficial));
  (Array.isArray(content.quests) ? content.quests : []).forEach((quest, index) => validateQuest(quest, index, errors, isOfficial));
  (Array.isArray(content.npcs) ? content.npcs : []).forEach((npc, index) => validateNpc(npc, index, errors, isOfficial));

  return { valid: errors.length === 0, errors };
}

export function assertValidContentPack(pack, options) {
  const result = validateContentPack(pack, options);
  if (!result.valid) {
    throw new Error(`Content pack ${pack?.id ?? 'unknown'} is invalid:\n${result.errors.join('\n')}`);
  }
  return result;
}

export { REQUIREMENT_TYPES, REWARD_TYPES, SUPPORTED_FORMAT_VERSIONS };
