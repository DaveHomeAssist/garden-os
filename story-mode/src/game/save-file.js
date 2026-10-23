/**
 * Save files: export Story Mode save slots to a portable, versioned JSON file
 * and import them back.
 *
 * Why this exists: saves live in localStorage / IndexedDB, which browsers scope
 * per origin. A save made at davehomeassist.github.io/garden-os/story-mode/ is
 * invisible inside the mixmash.games/garden/ iframe embed and the reverse.
 * A downloaded save file is the player's way to carry progress across (D4 part A).
 *
 * File shape (formatVersion 2):
 *   {
 *     format: 'garden-os-story-save',
 *     formatVersion: 2,
 *     game: 'Garden OS: Story Mode',
 *     exportedAt: ISO string,
 *     campaignSchemaVersion: <CAMPAIGN_SCHEMA_VERSION at export>,
 *     slots: [{ slot, campaign, season }],
 *     checksum: { algorithm: 'fnv1a32', value: '<8 hex>' },
 *   }
 * The checksum covers { formatVersion, slots } serialised with sorted keys, so
 * re-indenting the file does not break it but any edit or truncation does.
 * formatVersion 1 files (the single-slot backup the pause menu wrote before
 * this module) are still accepted; they carry no checksum.
 *
 * Every imported campaign goes through the normal load migration
 * (migrateCampaignSave), including the quest-ledger migration, so a file made
 * by an older build lands on the current schema.
 */
import { CAMPAIGN_SCHEMA_VERSION } from './state.js';
import {
  SAVE_SLOTS,
  listSaves,
  listSavesWithAuthoritySnapshots,
  loadBestAvailableSave,
  migrateCampaignSave,
  migrateSeasonSave,
  prepareCampaignForSave,
  prepareSeasonForSave,
  writeSlotSave,
} from './save.js';
import { normalizePlayerProfile } from '../data/player-profile.js';

export const SAVE_FILE_FORMAT = 'garden-os-story-save';
export const SAVE_FILE_VERSION = 2;
export const SAVE_FILE_GAME = 'Garden OS: Story Mode';
export const SAVE_FILE_MAX_BYTES = 10 * 1024 * 1024;
const CHECKSUM_ALGORITHM = 'fnv1a32';

/** JSON.stringify with object keys sorted at every level (drops undefined like JSON does). */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined || typeof item === 'function' ? 'null' : stableStringify(item))).join(',')}]`;
  }
  if (typeof value.toJSON === 'function') {
    return stableStringify(value.toJSON());
  }
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined && typeof value[key] !== 'function')
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

/** 32-bit FNV-1a over the UTF-16 code units of a string, as 8 hex chars. */
function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeSaveChecksum(formatVersion, slots) {
  // Round-trip through JSON first so the checksum sees exactly what a file
  // reader will see (undefined dropped, Dates as strings, and so on).
  const plain = JSON.parse(JSON.stringify({ formatVersion, slots }));
  return fnv1a32(stableStringify(plain));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

/** garden-os-save-YYYYMMDD.json, or garden-os-save-slot2-YYYYMMDD.json for one slot. */
export function saveFileName(date = new Date(), { slot = null } = {}) {
  const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const slotPart = Number.isInteger(slot) ? `-slot${slot + 1}` : '';
  return `garden-os-save${slotPart}-${stamp}.json`;
}

/**
 * Build a save file from slot records ({ slot, campaign, season }).
 * Records without a campaign are skipped. Returns null when nothing is left.
 */
export function buildSaveFile(records, { now = new Date(), touch = false } = {}) {
  const slots = (records ?? [])
    .filter((record) => record?.campaign && typeof record.campaign === 'object')
    .map((record) => ({
      slot: Number.isInteger(record.slot) ? record.slot : null,
      campaign: prepareCampaignForSave(record.campaign, { touch }),
      season: record.season ? prepareSeasonForSave(record.season) : null,
    }));
  if (!slots.length) return null;
  const plainSlots = JSON.parse(JSON.stringify(slots));
  return {
    format: SAVE_FILE_FORMAT,
    formatVersion: SAVE_FILE_VERSION,
    game: SAVE_FILE_GAME,
    exportedAt: now.toISOString(),
    campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
    slots: plainSlots,
    checksum: {
      algorithm: CHECKSUM_ALGORITHM,
      value: computeSaveChecksum(SAVE_FILE_VERSION, plainSlots),
    },
  };
}

/** Serialise a save file for download. */
export function stringifySaveFile(file) {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Export the live, in-memory state of a running session (pause menu). */
export function exportLiveState(state, slot, options = {}) {
  // An unsaved Free Play session has no slot (slot < 0). Keep gardening after
  // the campaign is Free Play on a real slot (postCampaign) and exports fine.
  if (!state?.campaign || (state.campaign.sandbox && !state.campaign.postCampaign) || !Number.isInteger(slot) || slot < 0 || slot >= SAVE_SLOTS) {
    return null;
  }
  // The live campaign is newer than anything stored, so stamp it as of now.
  return buildSaveFile([{ slot, campaign: state.campaign, season: state.season }], { touch: true, ...options });
}

/**
 * Export stored slots (title screen). Reads the same best-available save the
 * Continue button would load, so IndexedDB authority snapshots are included.
 * Pass `slots` to limit which ones; defaults to every occupied slot.
 */
export async function exportStoredSlots({ slots = null, now = new Date(), loadSave = loadBestAvailableSave } = {}) {
  const wanted = Array.isArray(slots)
    ? slots
    : Array.from({ length: SAVE_SLOTS }, (_entry, index) => index);
  const records = [];
  for (const slot of wanted) {
    // eslint-disable-next-line no-await-in-loop
    const restored = await loadSave(slot);
    if (restored?.campaign) {
      records.push({ slot, campaign: restored.campaign, season: restored.season ?? null });
    }
  }
  return buildSaveFile(records, { now });
}

function fail(error, code) {
  return { ok: false, error, code };
}

function describeRecord(record) {
  const { campaign } = record;
  return {
    chapter: Number.isInteger(campaign.currentChapter) ? campaign.currentChapter : 1,
    season: typeof campaign.currentSeason === 'string' ? campaign.currentSeason : 'spring',
    gardenerName: normalizePlayerProfile(campaign.playerProfile).displayName,
    updatedAt: campaign.updatedAt ?? campaign.createdAt ?? null,
  };
}

function validateRecord(record, index) {
  const label = `Save ${index + 1} in this file`;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return fail(`${label} is not a save slot.`, 'bad-slot');
  }
  const { campaign, season } = record;
  if (!campaign || typeof campaign !== 'object' || Array.isArray(campaign)) {
    return fail(`${label} has no campaign data.`, 'no-campaign');
  }
  if (campaign.version != null && (!Number.isInteger(campaign.version) || campaign.version < 1)) {
    return fail(`${label} has an unreadable save version.`, 'bad-version');
  }
  if (Number.isInteger(campaign.version) && campaign.version > CAMPAIGN_SCHEMA_VERSION) {
    return fail(`${label} was made by a newer version of Garden OS. Update the game, then import it again.`, 'newer-campaign');
  }
  if (!Number.isInteger(campaign.currentChapter) || campaign.currentChapter < 1) {
    return fail(`${label} has no valid chapter, so it can't be loaded.`, 'bad-chapter');
  }
  if (campaign.sandbox === true && campaign.postCampaign !== true) {
    return fail(`${label} is a Free Play session, which can't be imported into a save slot.`, 'sandbox');
  }
  if (season != null && (typeof season !== 'object' || Array.isArray(season))) {
    return fail(`${label} has damaged season data.`, 'bad-season');
  }
  const sourceSlot = Number.isInteger(record.slot) && record.slot >= 0 && record.slot < SAVE_SLOTS
    ? record.slot
    : null;
  const migrated = {
    sourceSlot,
    campaign: migrateCampaignSave(campaign),
    season: season ? migrateSeasonSave(season) : null,
  };
  return { ok: true, record: { ...migrated, summary: describeRecord(migrated) } };
}

/**
 * Parse and validate a save file. Accepts the raw file text or an
 * already-parsed object. On success the records are already migrated to the
 * current campaign schema; nothing is written to storage.
 *
 * Returns { ok: true, formatVersion, exportedAt, legacy, records: [...] }
 * or { ok: false, error, code } with a message fit to show the player.
 */
export function parseSaveFile(input) {
  let payload = input;
  if (typeof input === 'string') {
    if (input.length > SAVE_FILE_MAX_BYTES) {
      return fail('That file is too large to be a Garden OS save.', 'too-large');
    }
    if (!input.trim()) {
      return fail('That file is empty.', 'empty');
    }
    try {
      payload = JSON.parse(input.replace(/^\uFEFF/, ''));
    } catch {
      return fail("That file isn't a Garden OS save. It isn't valid JSON (it may be damaged or cut off).", 'not-json');
    }
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.format !== SAVE_FILE_FORMAT) {
    return fail("That file isn't a Garden OS save. Choose a file exported from Garden OS: Story Mode.", 'wrong-format');
  }

  const { formatVersion } = payload;
  if (!Number.isInteger(formatVersion) || formatVersion < 1) {
    return fail('This save file has an unreadable format version.', 'bad-format-version');
  }
  if (formatVersion > SAVE_FILE_VERSION) {
    return fail('This save file was made by a newer version of Garden OS. Update the game, then import it again.', 'newer-format');
  }

  let rawRecords;
  if (formatVersion === 1) {
    // Single-slot backups written by the pause menu before formatVersion 2.
    rawRecords = [{ slot: payload.slot, campaign: payload.campaign, season: payload.season ?? null }];
  } else {
    if (!Array.isArray(payload.slots) || payload.slots.length === 0) {
      return fail('This save file has no save slots in it.', 'no-slots');
    }
    if (payload.slots.length > SAVE_SLOTS) {
      return fail(`This save file lists more than ${SAVE_SLOTS} slots, so it can't be from Garden OS.`, 'too-many-slots');
    }
    const checksum = payload.checksum;
    if (!checksum || checksum.algorithm !== CHECKSUM_ALGORITHM || typeof checksum.value !== 'string') {
      return fail('This save file is missing its checksum, so it may be damaged.', 'no-checksum');
    }
    if (computeSaveChecksum(formatVersion, payload.slots) !== checksum.value.toLowerCase()) {
      return fail('This save file was changed or damaged after it was exported (checksum mismatch), so it was not imported.', 'checksum-mismatch');
    }
    rawRecords = payload.slots;
  }

  const records = [];
  for (let index = 0; index < rawRecords.length; index += 1) {
    const result = validateRecord(rawRecords[index], index);
    if (!result.ok) return result;
    records.push(result.record);
  }

  return {
    ok: true,
    formatVersion,
    legacy: formatVersion < SAVE_FILE_VERSION,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : null,
    records,
  };
}

/** Write one parsed record (from parseSaveFile) into a slot, replacing what is there. */
export function importSaveRecord(record, targetSlot) {
  if (!record?.campaign) return fail('Nothing to import.', 'no-campaign');
  return writeSlotSave(targetSlot, { campaign: record.campaign, season: record.season ?? null });
}

/**
 * Slot occupancy for the import dialog, including saves that live only in
 * the IndexedDB authority snapshot. A live Story save keeps just a session
 * pointer in localStorage, so the plain listSaves() view reports it as an
 * unreadable save; the title and pause import flows both use this instead.
 */
export async function describeSlotsForImportWithSnapshots({
  loadWithSnapshots = listSavesWithAuthoritySnapshots,
  loadLocal = listSaves,
} = {}) {
  let entries;
  try {
    entries = await loadWithSnapshots();
  } catch {
    entries = loadLocal();
  }
  return describeSlotsForImport(entries);
}

/** Slot occupancy for the import dialog (local storage view, same as the title screen). */
export function describeSlotsForImport(entries = listSaves()) {
  return entries.map((entry) => ({
    slot: entry.slot,
    isEmpty: Boolean(entry.isEmpty),
    isCorrupt: Boolean(entry.isCorrupt),
    chapter: entry.chapter ?? null,
    gardenerName: entry.isEmpty || entry.isCorrupt
      ? null
      : normalizePlayerProfile(entry.playerProfile ?? entry.campaign?.playerProfile).displayName,
  }));
}
