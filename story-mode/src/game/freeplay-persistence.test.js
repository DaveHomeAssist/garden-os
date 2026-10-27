// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState, createSandboxState } from './state.js';
import { loadCampaign, loadSeasonState, saveCampaign, saveSeasonState, writeSlotSave, listSaves } from './save.js';
import { exportLiveState, exportStoredSlots, parseSaveFile, importSaveRecord } from './save-file.js';

beforeEach(() => localStorage.clear());

describe('persistent Free Play and current save files', () => {
  it('rolls back a Free Play import when season storage fails', () => {
    const old = createSandboxState();
    old.campaign.currency.balance = 12;
    writeSlotSave('freeplay', old);
    const original = localStorage.getItem('gos-freeplay-campaign');
    const setItem = Storage.prototype.setItem;
    let failed = false;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === 'gos-freeplay-season' && !failed) { failed = true; throw new Error('quota'); }
      return setItem.call(this, key, value);
    });
    try {
      expect(writeSlotSave('freeplay', createSandboxState()).ok).toBe(false);
      expect(localStorage.getItem('gos-freeplay-campaign')).toBe(original);
    } finally { spy.mockRestore(); }
  });
  it('persists a separate 8 by 4 Free Play world without touching Story slots', () => {
    const story = createGameState();
    saveCampaign(story.campaign, 0);
    const before = localStorage.getItem('gos-story-slot-0-campaign');
    const free = createSandboxState();
    free.season.grid[0].cropId = 'basil';
    expect(saveCampaign(free.campaign, 'freeplay')).toBeTruthy();
    expect(saveSeasonState(free.season, 'freeplay')).toBeTruthy();
    expect(loadCampaign('freeplay').sandbox).toBe(true);
    expect(loadSeasonState('freeplay').grid.cells[0].cropId).toBe('basil');
    expect(free.season.grid).toHaveLength(32);
    expect(localStorage.getItem('gos-story-slot-0-campaign')).toBe(before);
    expect(listSaves()).toHaveLength(3);
  });

  it('round-trips Free Play through the checksummed version 2 format', () => {
    const state = createSandboxState();
    const file = exportLiveState(state, 'freeplay');
    expect(file?.formatVersion).toBe(2);
    expect(file?.slots[0].slot).toBe('freeplay');
    const parsed = parseSaveFile(file);
    expect(parsed.ok).toBe(true);
    expect(importSaveRecord(parsed.records[0], 'freeplay').ok).toBe(true);
    expect(loadCampaign('freeplay').sandbox).toBe(true);
    file.slots[0].campaign.currentChapter++;
    expect(parseSaveFile(file).code).toBe('checksum-mismatch');
  });

  it('refuses cross-mode imports without writing either save', () => {
    const free = createSandboxState();
    const story = createGameState();
    expect(writeSlotSave(0, free).ok).toBe(false);
    expect(writeSlotSave('freeplay', story).ok).toBe(false);
    expect(loadCampaign(0)).toBeNull();
    expect(loadCampaign('freeplay')).toBeNull();
  });

  it('preserves post-campaign Free Play in its Story slot', () => {
    const state = createSandboxState();
    state.campaign.postCampaign = true;
    const file = exportLiveState(state, 1);
    expect(file?.formatVersion).toBe(2);
    const parsed = parseSaveFile(file);
    expect(parsed.ok).toBe(true);
    expect(importSaveRecord(parsed.records[0], 1).ok).toBe(true);
  });

  it('accepts a preserved version 1 Free Play backup only into Free Play', () => {
    const state = createSandboxState();
    const parsed = parseSaveFile({ format: 'garden-os-story-save', formatVersion: 1,
      slot: 'freeplay', campaign: state.campaign, season: null });
    expect(parsed.ok).toBe(true);
    expect(importSaveRecord(parsed.records[0], 0).ok).toBe(false);
    expect(importSaveRecord(parsed.records[0], 'freeplay').ok).toBe(true);
  });

  it('includes the independent world alongside three Story slots in title exports', async () => {
    const story = createGameState();
    const free = createSandboxState();
    const file = await exportStoredSlots({ loadSave: async (slot) => slot === 'freeplay' ? free : story });
    expect(file.slots.map((s) => s.slot)).toEqual([0, 1, 2, 'freeplay']);
    expect(parseSaveFile(file).ok).toBe(true);
  });
});
