// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createGameState, createSandboxState } from '../game/state.js';
import { loadCampaign, saveCampaign } from '../game/save.js';
import { exportLiveState, stringifySaveFile } from '../game/save-file.js';
import { pickSaveFile, runImportFlow } from './save-transfer.js';

function fileOf(text) {
  return { name: 'garden-os-save-20261017.json', text: async () => text };
}

function stateNamed(name, chapter) {
  const state = createGameState();
  state.campaign.currentChapter = chapter;
  state.campaign.playerProfile = { ...state.campaign.playerProfile, displayName: name };
  return state;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor(selector) {
  for (let i = 0; i < 50; i += 1) {
    const el = document.querySelector(selector);
    if (el) return el;
    // eslint-disable-next-line no-await-in-loop
    await tick();
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<button id="launcher">Import</button>';
});
afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('import flow UI', () => {
  it('routes a Free Play file only to its independent world', async () => {
    const text = stringifySaveFile(exportLiveState(createSandboxState(), 'freeplay'));
    const flow = runImportFlow({ pickFile: async () => fileOf(text) });
    const confirm = await waitFor('.save-transfer-dialog [data-role="confirm"]');
    expect(confirm.textContent).toBe('Import to Free Play');
    expect(document.querySelectorAll('input[name="save-transfer-target"]:not(:disabled)')).toHaveLength(1);
    confirm.click();
    expect(await flow).toMatchObject({ ok: true, slot: 'freeplay' });
    expect(loadCampaign('freeplay').sandbox).toBe(true);
    expect(loadCampaign(0)).toBeNull();
  });
  it('asks before replacing an occupied slot and writes only after confirm', async () => {
    saveCampaign(stateNamed('Keep', 2).campaign, 0);
    const text = stringifySaveFile(exportLiveState(stateNamed('Ana', 7), 0));
    const launcher = document.getElementById('launcher');

    const flow = runImportFlow({ fixedSlot: 0, launcher, pickFile: async () => fileOf(text) });
    const confirm = await waitFor('.save-transfer-dialog [data-role="confirm"]');
    expect(document.querySelector('.save-transfer-dialog').getAttribute('aria-modal')).toBe('true');
    expect(confirm.textContent).toBe('Replace Slot 1');
    expect(document.querySelector('[data-role="warning"]').textContent).toMatch(/overwritten/);
    // Not written yet.
    expect(loadCampaign(0).playerProfile.displayName).toBe('Keep');
    expect(document.activeElement).toBe(confirm);

    confirm.click();
    const result = await flow;
    expect(result).toMatchObject({ ok: true, slot: 0 });
    expect(loadCampaign(0).playerProfile.displayName).toBe('Ana');
    expect(document.querySelector('.save-transfer-overlay')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('lets the title screen pick the target slot and defaults to an empty one', async () => {
    saveCampaign(stateNamed('Keep', 2).campaign, 0);
    const text = stringifySaveFile(exportLiveState(stateNamed('Ana', 4), 0));
    const flow = runImportFlow({ pickFile: async () => fileOf(text) });
    const confirm = await waitFor('[data-role="confirm"]');
    // Source slot 1 is taken, so the first empty slot (2) is preselected.
    expect(confirm.textContent).toBe('Import to Slot 2');
    const slot1 = document.querySelector('input[name="save-transfer-target"][value="0"]');
    slot1.checked = true;
    slot1.dispatchEvent(new Event('change', { bubbles: true }));
    expect(confirm.textContent).toBe('Replace Slot 1');
    const slot3 = document.querySelector('input[name="save-transfer-target"][value="2"]');
    slot3.checked = true;
    slot3.dispatchEvent(new Event('change', { bubbles: true }));
    confirm.click();
    expect(await flow).toMatchObject({ ok: true, slot: 2 });
    expect(loadCampaign(2).playerProfile.displayName).toBe('Ana');
    expect(loadCampaign(0).playerProfile.displayName).toBe('Keep');
  });

  it('Escape cancels without writing, and keys do not leak to the game', async () => {
    const text = stringifySaveFile(exportLiveState(stateNamed('Ana', 4), 0));
    let leaked = 0;
    const onDocKey = () => { leaked += 1; };
    document.addEventListener('keydown', onDocKey);
    const flow = runImportFlow({ fixedSlot: 1, pickFile: async () => fileOf(text) });
    const dialog = await waitFor('.save-transfer-dialog');
    dialog.querySelector('[data-role="confirm"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await flow).toMatchObject({ ok: false, cancelled: true });
    expect(loadCampaign(1)).toBeNull();
    expect(leaked).toBe(0);
    document.removeEventListener('keydown', onDocKey);
  });

  it('shows a clear error for a bad file and changes nothing', async () => {
    saveCampaign(stateNamed('Keep', 2).campaign, 0);
    const flow = runImportFlow({ fixedSlot: 0, pickFile: async () => fileOf('{"format":"something-else"}') });
    const alert = await waitFor('[role="alertdialog"] [role="alert"]');
    expect(alert.textContent).toMatch(/isn't a Garden OS save/);
    document.querySelector('[data-role="ok"]').click();
    expect(await flow).toMatchObject({ ok: false, error: 'wrong-format' });
    expect(loadCampaign(0).playerProfile.displayName).toBe('Keep');
  });

  it('closes the dialog when the session signal aborts (Main Menu teardown)', async () => {
    const text = stringifySaveFile(exportLiveState(stateNamed('Ana', 4), 0));
    const session = new AbortController();
    const flow = runImportFlow({ fixedSlot: 0, signal: session.signal, pickFile: async () => fileOf(text) });
    await waitFor('.save-transfer-dialog');
    session.abort();
    expect(await flow).toMatchObject({ ok: false, cancelled: true });
    expect(document.querySelector('.save-transfer-overlay')).toBeNull();
    expect(loadCampaign(0)).toBeNull();
  });

  it('treats a cancelled file picker as a no-op', async () => {
    expect(await runImportFlow({ pickFile: async () => null })).toMatchObject({ ok: false, cancelled: true });
    expect(document.querySelector('.save-transfer-overlay')).toBeNull();
  });

  it('a new pick settles an earlier one whose picker was dismissed without a cancel event', async () => {
    const first = pickSaveFile();
    const second = pickSaveFile();
    expect(await first).toBeNull();
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1);
    document.querySelector('input[type="file"]').dispatchEvent(new Event('cancel'));
    expect(await second).toBeNull();
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });
});
