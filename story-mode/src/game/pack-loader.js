import { CAMPAIGN_SCHEMA_VERSION, DEFAULT_CONTENT_PACK_STATE } from './state.js';
import { validateContentPack } from './pack-validator.js';

const CONTENT_TYPES = ['crops', 'zones', 'quests', 'npcs'];

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function tagContent(pack, type, entry) {
  return {
    ...clone(entry),
    modded: true,
    provenance: {
      packId: pack.id,
      packVersion: pack.version,
      contentType: type,
    },
  };
}

function createProvenanceEntry(pack, type, entry) {
  return {
    packId: pack.id,
    packVersion: pack.version,
    contentType: type,
    id: entry.id,
  };
}

function normalizePackState(campaign) {
  return {
    ...DEFAULT_CONTENT_PACK_STATE,
    ...(campaign.contentPacks ?? {}),
    loaded: Array.isArray(campaign.contentPacks?.loaded) ? [...campaign.contentPacks.loaded] : [],
    rejected: Array.isArray(campaign.contentPacks?.rejected) ? [...campaign.contentPacks.rejected] : [],
  };
}

export function loadContentPacks(initialState, packs = []) {
  const state = clone(initialState);
  state.campaign = {
    ...(state.campaign ?? {}),
    version: CAMPAIGN_SCHEMA_VERSION,
    contentPacks: normalizePackState(state.campaign ?? {}),
    contentProvenance: Array.isArray(state.campaign?.contentProvenance) ? [...state.campaign.contentProvenance] : [],
  };

  const result = {
    state,
    loaded: [],
    rejected: [],
    content: {
      crops: [],
      zones: [],
      quests: [],
      npcs: [],
    },
  };

  if (!Array.isArray(packs) || !packs.length) {
    return result;
  }

  packs.forEach((pack) => {
    const validation = validateContentPack(pack);
    if (!validation.valid) {
      const rejected = {
        id: pack?.id ?? 'unknown_pack',
        errors: validation.errors,
      };
      result.rejected.push(rejected);
      state.campaign.contentPacks.rejected.push(rejected);
      return;
    }

    const loaded = {
      id: pack.id,
      version: pack.version,
      title: pack.title,
    };
    result.loaded.push(loaded);
    state.campaign.contentPacks.loaded.push(loaded);

    CONTENT_TYPES.forEach((type) => {
      (pack.content?.[type] ?? []).forEach((entry) => {
        result.content[type].push(tagContent(pack, type, entry));
        state.campaign.contentProvenance.push(createProvenanceEntry(pack, type, entry));
      });
    });
  });

  return result;
}
