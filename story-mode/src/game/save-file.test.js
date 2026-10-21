// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CAMPAIGN_SCHEMA_VERSION, createGameState } from './state.js';
import { listSaves, loadCampaign, loadSeasonState, saveCampaign, saveSeasonState } from './save.js';
import {
  SAVE_FILE_FORMAT,
  SAVE_FILE_VERSION,
  buildSaveFile,
  computeSaveChecksum,
  describeSlotsForImport,
  describeSlotsForImportWithSnapshots,
  exportLiveState,
  exportStoredSlots,
  importSaveRecord,
  parseSaveFile,
  saveFileName,
  stringifySaveFile,
} from './save-file.js';
import { sessionPointerKey } from '../engine/authority-cache.js';

function makeState({ name = 'Ana', chapter = 3 } = {}) {
  const state = createGameState();
  state.campaign.currentChapter = chapter;
  state.campaign.currentSeason = 'fall';
  state.campaign.playerProfile = { ...state.campaign.playerProfile, displayName: name };
  state.campaign.questLog = { lila_basil: { state: 'ACCEPTED' } };
  state.campaign.questLedger.found = { basil: 2 };
  state.campaign.reputation.lila = 15;
  state.season.grid[0].cropId = 'basil';
  return state;
}

function storeInSlot(state, slot) {
  saveCampaign(state.campaign, slot);
  saveSeasonState(state.season, slot);
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('save file export -> import round trip', () => {
  it('exports stored slots and imports them back into another slot unchanged', async () => {
    storeInSlot(makeState(), 0);
    const before = loadCampaign(0);

    const file = await exportStoredSlots({ slots: [0] });
    expect(file.format).toBe(SAVE_FILE_FORMAT);
    expect(file.formatVersion).toBe(SAVE_FILE_VERSION);
    expect(file.campaignSchemaVersion).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(file.checksum.value).toMatch(/^[0-9a-f]{8}$/);

    const parsed = parseSaveFile(stringifySaveFile(file));
    expect(parsed.ok).toBe(true);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].sourceSlot).toBe(0);
    expect(parsed.records[0].summary).toMatchObject({ chapter: 3, season: 'fall', gardenerName: 'Ana' });

    expect(importSaveRecord(parsed.records[0], 2).ok).toBe(true);
    const after = loadCampaign(2);
    expect(after).toEqual(before);
    expect(after.questLog.lila_basil.state).toBe('ACCEPTED');
    expect(after.questLedger.found.basil).toBe(2);
    expect(loadSeasonState(2).grid.cells[0].cropId).toBe('basil');
  });

  it('exports every occupied slot when none are named', async () => {
    storeInSlot(makeState({ name: 'Ana' }), 0);
    storeInSlot(makeState({ name: 'Ben', chapter: 5 }), 2);
    const parsed = parseSaveFile(stringifySaveFile(await exportStoredSlots()));
    expect(parsed.ok).toBe(true);
    expect(parsed.records.map((r) => [r.sourceSlot, r.summary.gardenerName])).toEqual([[0, 'Ana'], [2, 'Ben']]);
  });

  it('exports the live session state (pause menu), not a stale stored copy', () => {
    const state = makeState({ chapter: 6 });
    // Nothing in localStorage: the IndexedDB authority path never writes it.
    expect(loadCampaign(1)).toBeNull();
    const file = exportLiveState(state, 1);
    const parsed = parseSaveFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    expect(parsed.records[0].campaign.currentChapter).toBe(6);
    expect(parsed.records[0].season.campaign).toBeUndefined();
    expect(importSaveRecord(parsed.records[0], 1).ok).toBe(true);
    expect(loadCampaign(1).currentChapter).toBe(6);
  });

  it('refuses to export Free Play', () => {
    const state = makeState();
    state.campaign.sandbox = true;
    expect(exportLiveState(state, 0)).toBeNull();
    expect(exportLiveState(makeState(), -1)).toBeNull();
  });

  it('exports and re-imports Keep gardening (post-campaign Free Play on a real slot)', () => {
    const state = makeState();
    state.campaign.sandbox = true;
    state.campaign.postCampaign = true;
    state.campaign.complete = true;
    state.campaign.currentChapter = 99;
    const file = exportLiveState(state, 0);
    expect(file).not.toBeNull();
    const parsed = parseSaveFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    expect(importSaveRecord(parsed.records[0], 2).ok).toBe(true);
    expect(loadCampaign(2).postCampaign).toBe(true);
  });

  it('survives re-indenting the file (checksum uses sorted keys)', async () => {
    storeInSlot(makeState(), 0);
    const file = await exportStoredSlots();
    expect(parseSaveFile(JSON.stringify(file)).ok).toBe(true);
    expect(parseSaveFile(JSON.stringify(file, null, 8)).ok).toBe(true);
  });

  it('drops a stale authority session pointer so the import is what Continue loads', () => {
    localStorage.setItem(sessionPointerKey(1), 'old-session');
    const file = exportLiveState(makeState(), 0);
    const parsed = parseSaveFile(JSON.stringify(file));
    importSaveRecord(parsed.records[0], 1);
    expect(localStorage.getItem(sessionPointerKey(1))).toBeNull();
  });

  it('names files garden-os-save-YYYYMMDD.json', () => {
    const date = new Date(2026, 9, 7);
    expect(saveFileName(date)).toBe('garden-os-save-20261007.json');
    expect(saveFileName(date, { slot: 1 })).toBe('garden-os-save-slot2-20261007.json');
  });
});

describe('rejecting bad save files', () => {
  function validFile() {
    return exportLiveState(makeState(), 0);
  }

  it.each([
    ['not JSON', 'this is { not json', 'not-json'],
    ['empty', '   ', 'empty'],
    ['some other JSON', JSON.stringify({ hello: 'world' }), 'wrong-format'],
    ['a JSON array', '[1,2,3]', 'wrong-format'],
  ])('rejects %s', (_label, text, code) => {
    const result = parseSaveFile(text);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(code);
    expect(result.error).toMatch(/\S/);
  });

  it('rejects a file edited after export (checksum mismatch)', () => {
    const file = validFile();
    file.slots[0].campaign.currentChapter = 12;
    const result = parseSaveFile(JSON.stringify(file));
    expect(result).toMatchObject({ ok: false, code: 'checksum-mismatch' });
  });

  it('rejects a truncated file', () => {
    const text = stringifySaveFile(validFile());
    expect(parseSaveFile(text.slice(0, Math.floor(text.length / 2)))).toMatchObject({ ok: false, code: 'not-json' });
  });

  it('rejects a v2 file without a checksum', () => {
    const file = validFile();
    delete file.checksum;
    expect(parseSaveFile(JSON.stringify(file))).toMatchObject({ ok: false, code: 'no-checksum' });
  });

  it('rejects files from a newer format or campaign schema with an update message', () => {
    const newer = { ...validFile(), formatVersion: SAVE_FILE_VERSION + 1 };
    expect(parseSaveFile(JSON.stringify(newer))).toMatchObject({ ok: false, code: 'newer-format' });
    expect(parseSaveFile(JSON.stringify(newer)).error).toMatch(/newer version/);

    const state = makeState();
    const file = buildSaveFile([{ slot: 0, campaign: state.campaign, season: state.season }]);
    file.slots[0].campaign.version = CAMPAIGN_SCHEMA_VERSION + 1;
    // Re-sign so only the schema check can fail.
    file.checksum.value = computeSaveChecksum(file.formatVersion, file.slots);
    expect(parseSaveFile(JSON.stringify(file))).toMatchObject({ ok: false, code: 'newer-campaign' });
  });

  it('rejects a slot without a valid chapter and leaves existing saves alone', () => {
    storeInSlot(makeState({ name: 'Keep' }), 0);
    const legacy = { format: SAVE_FILE_FORMAT, formatVersion: 1, slot: 0, campaign: { currentSeason: 'spring' } };
    const result = parseSaveFile(JSON.stringify(legacy));
    expect(result).toMatchObject({ ok: false, code: 'bad-chapter' });
    expect(loadCampaign(0).playerProfile.displayName).toBe('Keep');
  });
});

describe('migrating old saves on import', () => {
  it('upgrades a formatVersion 1 backup with an old campaign schema (no quest ledger)', () => {
    const legacy = {
      format: SAVE_FILE_FORMAT,
      formatVersion: 1,
      exportedAt: '2026-09-01T12:00:00.000Z',
      slot: 1,
      campaign: {
        version: 3,
        currentChapter: 2,
        currentSeason: 'summer',
        questLog: { gus_tomatoes: { state: 'ACCEPTED' } },
      },
      season: { grid: [{ cropId: 'tomato' }], gridCols: 8, gridRows: 4 },
    };
    const parsed = parseSaveFile(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    expect(parsed.legacy).toBe(true);
    const [record] = parsed.records;
    expect(record.campaign.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    // #48's quest-state migration: a missing ledger becomes a valid empty one.
    expect(record.campaign.questLedger).toMatchObject({ found: {}, delivered: {}, plantings: [] });
    expect(record.campaign.questLog.gus_tomatoes.state).toBe('ACCEPTED');
    expect(record.campaign.reputation).toMatchObject({ old_gus: 0, maya: 0, lila: 0 });
    expect(record.season.grid).toEqual({ cells: [{ cropId: 'tomato' }], cols: 8, rows: 4 });

    expect(importSaveRecord(record, 1).ok).toBe(true);
    const loaded = loadCampaign(1);
    expect(loaded.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(loaded.questLedger.plantings).toEqual([]);
  });

  it('repairs a malformed quest ledger from an older v2 file', () => {
    const state = makeState();
    state.campaign.version = 7;
    state.campaign.questLedger = { found: 'garbage', plantings: null };
    const file = buildSaveFile([{ slot: 0, campaign: state.campaign, season: null }]);
    // buildSaveFile stamps the current version on the way out, so put the old one back and re-sign.
    file.slots[0].campaign.version = 7;
    file.slots[0].campaign.questLedger = { found: 'garbage', plantings: null };
    file.checksum.value = computeSaveChecksum(file.formatVersion, file.slots);
    const parsed = parseSaveFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    expect(parsed.records[0].campaign.version).toBe(CAMPAIGN_SCHEMA_VERSION);
    expect(parsed.records[0].campaign.questLedger.found).toEqual({});
    expect(Array.isArray(parsed.records[0].campaign.questLedger.plantings)).toBe(true);
  });
});

describe('describeSlotsForImportWithSnapshots (pause + title import dialog)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('a live Story save (session pointer + IndexedDB snapshot) is not "unreadable"', async () => {
    // Story keeps only the session pointer in localStorage; the campaign is in IndexedDB.
    localStorage.setItem(sessionPointerKey(0), 'live-session');
    const { campaign } = makeState({ name: 'Mom', chapter: 1 });
    // The localStorage-only view (what the pause menu used) flags it as corrupt.
    expect(describeSlotsForImport()[0]).toMatchObject({ slot: 0, isCorrupt: true });
    const slots = await describeSlotsForImportWithSnapshots({
      loadWithSnapshots: async () => listSaves({ authoritySaves: { 0: campaign } }),
    });
    expect(slots[0]).toMatchObject({ slot: 0, isEmpty: false, isCorrupt: false, chapter: 1, gardenerName: 'Mom' });
    expect(slots[1]).toMatchObject({ slot: 1, isEmpty: true, isCorrupt: false });
  });

  it('falls back to the localStorage view when the snapshot read fails', async () => {
    const state = makeState({ name: 'Ana', chapter: 2 });
    saveCampaign(state.campaign, 1);
    const slots = await describeSlotsForImportWithSnapshots({
      loadWithSnapshots: async () => { throw new Error('idb unavailable'); },
    });
    expect(slots[1]).toMatchObject({ slot: 1, isEmpty: false, isCorrupt: false, gardenerName: 'Ana' });
  });
});
