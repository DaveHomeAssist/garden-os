const ID_PATTERN = /^[a-z0-9_]+$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const CONTENT_TYPES = ['crops', 'zones', 'quests', 'npcs'];

function pushRequiredString(errors, value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function pushId(errors, value, path) {
  pushRequiredString(errors, value, path);
  if (typeof value === 'string' && !ID_PATTERN.test(value)) {
    errors.push(`${path} must use lowercase letters, numbers, and underscores`);
  }
}

function validateCrop(crop, index, errors) {
  const path = `content.crops[${index}]`;
  pushId(errors, crop?.id, `${path}.id`);
  pushRequiredString(errors, crop?.name, `${path}.name`);
  pushRequiredString(errors, crop?.faction, `${path}.faction`);
  if (!Number.isFinite(Number(crop?.chapterUnlock)) || Number(crop.chapterUnlock) < 1) {
    errors.push(`${path}.chapterUnlock must be a number >= 1`);
  }
  if (!crop?.seasonalMultipliers || typeof crop.seasonalMultipliers !== 'object') {
    errors.push(`${path}.seasonalMultipliers must be an object`);
  }
}

function validateZone(zone, index, errors) {
  const path = `content.zones[${index}]`;
  pushId(errors, zone?.id, `${path}.id`);
  pushRequiredString(errors, zone?.name, `${path}.name`);
  pushRequiredString(errors, zone?.biome, `${path}.biome`);
}

function validateQuest(quest, index, errors) {
  const path = `content.quests[${index}]`;
  pushId(errors, quest?.id, `${path}.id`);
  pushRequiredString(errors, quest?.npc, `${path}.npc`);
  pushRequiredString(errors, quest?.title, `${path}.title`);
  if (!Array.isArray(quest?.requirements)) errors.push(`${path}.requirements must be an array`);
  if (!Array.isArray(quest?.rewards)) errors.push(`${path}.rewards must be an array`);
  if (!Array.isArray(quest?.outcomes) || quest.outcomes.length < 2) {
    errors.push(`${path}.outcomes must include at least 2 outcomes`);
  }
}

function validateNpc(npc, index, errors) {
  const path = `content.npcs[${index}]`;
  pushId(errors, npc?.id, `${path}.id`);
  pushRequiredString(errors, npc?.name, `${path}.name`);
  pushRequiredString(errors, npc?.role, `${path}.role`);
}

export function validateContentPack(pack) {
  const errors = [];
  if (!pack || typeof pack !== 'object') {
    return { valid: false, errors: ['pack must be an object'] };
  }

  pushId(errors, pack.id, 'id');
  pushRequiredString(errors, pack.title, 'title');
  if (typeof pack.version !== 'string' || !VERSION_PATTERN.test(pack.version)) {
    errors.push('version must use semver, for example 1.0.0');
  }
  if (!pack.content || typeof pack.content !== 'object') {
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
    }
  });

  (Array.isArray(content.crops) ? content.crops : []).forEach((crop, index) => validateCrop(crop, index, errors));
  (Array.isArray(content.zones) ? content.zones : []).forEach((zone, index) => validateZone(zone, index, errors));
  (Array.isArray(content.quests) ? content.quests : []).forEach((quest, index) => validateQuest(quest, index, errors));
  (Array.isArray(content.npcs) ? content.npcs : []).forEach((npc, index) => validateNpc(npc, index, errors));

  return { valid: errors.length === 0, errors };
}

export function assertValidContentPack(pack) {
  const result = validateContentPack(pack);
  if (!result.valid) {
    throw new Error(`Content pack ${pack?.id ?? 'unknown'} is invalid:\n${result.errors.join('\n')}`);
  }
  return result;
}
