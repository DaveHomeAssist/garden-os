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
    loaded: [],
    rejected: [],
  };
}

/**
 * Validate packs and tag their content for the runtime registry. Campaign
 * pack status and provenance are rebuilt for this boot, so reloading the
 * same packs does not stack duplicate entries in the save.
 */
export function loadContentPacks(initialState, packs = [], { isOfficial } = {}) {
  const state = clone(initialState);
  state.campaign = {
    ...(state.campaign ?? {}),
    version: CAMPAIGN_SCHEMA_VERSION,
    contentPacks: normalizePackState(state.campaign ?? {}),
    // Provenance from earlier boots is kept for entities a save still uses;
    // this boot's packs refresh their own rows.
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

  const seenPackIds = new Set();
  const provenanceKey = (entry) => `${entry.packId}:${entry.contentType}:${entry.id}`;
  const provenanceRows = new Map(state.campaign.contentProvenance.map((entry) => [provenanceKey(entry), entry]));

  packs.forEach((pack) => {
    if (pack?.id && seenPackIds.has(pack.id)) {
      const duplicate = { id: pack.id, errors: ['pack id is already loaded'] };
      result.rejected.push(duplicate);
      state.campaign.contentPacks.rejected.push(duplicate);
      return;
    }
    const validation = validateContentPack(pack, { isOfficial });
    if (!validation.valid) {
      const rejected = {
        id: pack?.id ?? 'unknown_pack',
        errors: validation.errors,
      };
      result.rejected.push(rejected);
      state.campaign.contentPacks.rejected.push(rejected);
      return;
    }

    seenPackIds.add(pack.id);
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
        const row = createProvenanceEntry(pack, type, entry);
        provenanceRows.set(provenanceKey(row), row);
      });
    });
  });

  state.campaign.contentProvenance = [...provenanceRows.values()];
  return result;
}
