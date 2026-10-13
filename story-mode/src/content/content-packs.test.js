import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { installPackFromText, loadInstalledPacks, removeInstalledPack } from './installed-packs.js';
import { installPackContent, isModdedQuest, listPackCrops, resetPackContent } from './content-registry.js';
import { isOfficialContent } from './official-content.js';
import { loadContentPacks } from '../game/pack-loader.js';
import { validateContentPack } from '../game/pack-validator.js';
import { getAvailableCrops, getCropById } from '../data/crops.js';
import { getNPC } from '../data/npcs.js';
import { QuestEngine } from '../game/quest-engine.js';
import { Actions, Store } from '../game/store.js';
import { createGameState } from '../game/state.js';
import { scoreCell } from '../scoring/cell-score.js';
import { getNPCsPresentInZone } from '../scene/npc-presence.js';
import { getNoticeBoardGivers, isNoticeBoardQuest } from '../ui/quest-text.js';
import { buildPacksModel } from '../ui/packs-panel.js';
import { isAuthorityRoutedAction } from '../engine/authority-cache.js';

const PACK_DIR = resolve(process.cwd(), '../examples/packs');
const readPack = (name) => readFileSync(resolve(PACK_DIR, name), 'utf8');

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function boot(packs, state = createGameState()) {
  const result = loadContentPacks(state, packs, { isOfficial: isOfficialContent });
  resetPackContent();
  installPackContent(result.content, { isOfficial: isOfficialContent, packs: result.loaded });
  return result;
}

afterEach(() => {
  resetPackContent();
});

describe('installed content packs', () => {
  let storage;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it('stores valid packs, replaces by id, and removes them', () => {
    expect(installPackFromText(readPack('spring-herbs.json'), { storage, isOfficial: isOfficialContent }).ok).toBe(true);
    expect(installPackFromText(readPack('spring-herbs.json'), { storage, isOfficial: isOfficialContent }).ok).toBe(true);
    expect(loadInstalledPacks(storage)).toHaveLength(1);
    expect(removeInstalledPack('spring_herbs', { storage })).toBe(true);
    expect(loadInstalledPacks(storage)).toHaveLength(0);
  });

  it('refuses malformed files, non JSON, and packs that replace official content', () => {
    expect(installPackFromText(readPack('malformed-pack.json'), { storage }).ok).toBe(false);
    expect(installPackFromText('{not json', { storage }).errors[0]).toMatch(/not valid JSON/);
    const hijack = JSON.parse(readPack('spring-herbs.json'));
    hijack.content.crops[0].id = 'basil';
    const result = installPackFromText(JSON.stringify(hijack), { storage, isOfficial: isOfficialContent });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/official content/);
  });

  it('requires every scoring input on a pack crop', () => {
    const pack = JSON.parse(readPack('spring-herbs.json'));
    delete pack.content.crops[0].sunMin;
    expect(validateContentPack(pack).errors.join(' ')).toMatch(/sunMin/);
  });

  it('rejects quest requirements the engine cannot check', () => {
    const pack = JSON.parse(readPack('porch-quest.json'));
    pack.content.quests[0].requirements = [{ type: 'teleport', id: 'moon', count: 1 }];
    expect(validateContentPack(pack).valid).toBe(false);
  });

  it('lists installed packs with what they add and whether they are active', () => {
    installPackFromText(readPack('riverside-neighbor.json'), { storage, isOfficial: isOfficialContent });
    const model = buildPacksModel({ storage, loadedThisSession: [] });
    expect(model.installed[0]).toMatchObject({ id: 'riverside_neighbor', active: false });
    expect(model.installed[0].summary).toMatch(/1 quest/);
    expect(model.installed[0].placesNote).toMatch(/cannot be visited/);
  });
});

describe('pack content in play', () => {
  it('adds pack crops to the palette and scores them like official crops', () => {
    boot([JSON.parse(readPack('spring-herbs.json'))]);
    const crop = getCropById('lemon_balm');
    expect(crop).toMatchObject({ modded: true, provenance: { packId: 'spring_herbs' } });
    expect(getAvailableCrops(2).some((entry) => entry.id === 'lemon_balm')).toBe(true);
    expect(getAvailableCrops(1).some((entry) => entry.id === 'lemon_balm')).toBe(false);
    expect(getCropById('basil').modded).toBeUndefined();

    const state = createGameState();
    state.season.grid[0].cropId = 'lemon_balm';
    const score = scoreCell(0, state.season.grid, state.season.siteConfig, 'spring');
    expect(Number.isFinite(score.total)).toBe(true);
  });

  it('runs a pack quest from the notice board with locally derived rewards', () => {
    boot([JSON.parse(readPack('porch-quest.json'))]);
    expect(isModdedQuest('porch_cuttings')).toBe(true);

    const store = new Store(createGameState());
    const engine = new QuestEngine(store);
    const quest = engine.getQuestById('porch_cuttings');
    expect(quest.modded).toBe(true);
    expect(isNoticeBoardQuest(quest)).toBe(true);
    expect(getNoticeBoardGivers()).toContain('neighbor_pat');

    expect(engine.acceptQuest('porch_cuttings')).toBeTruthy();
    const state = store.getState();
    state.campaign.pantry.basil = 1;
    store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    engine.evaluateProgress();
    engine.turnInQuest('porch_cuttings', 'share_tray');
    const campaign = store.getState().campaign;
    expect(campaign.questLog.porch_cuttings.state).toBe('COMPLETED');
    expect(campaign.reputation.neighbor_pat).toBeGreaterThan(0);

    // Pack rewards are local: the completion never goes to the authority.
    expect(isAuthorityRoutedAction({ type: 'COMPLETE_QUEST', payload: { questId: 'porch_cuttings' } })).toBe(false);
    expect(isAuthorityRoutedAction({ type: 'COMPLETE_QUEST', payload: { questId: 'lila_basil' } })).toBe(true);
  });

  it('places a pack neighbor in their zone in season and labels them modded', () => {
    boot([JSON.parse(readPack('riverside-neighbor.json'))]);
    const rhea = getNPC('rhea');
    expect(rhea).toMatchObject({ name: 'Rhea', modded: true });
    const state = createGameState();
    state.season.season = 'spring';
    const present = getNPCsPresentInZone('riverside', state, { canEnterZone: () => true });
    expect(present.map((npc) => npc.id)).toContain('rhea');
    state.season.season = 'winter';
    const winter = getNPCsPresentInZone('riverside', state, { canEnterZone: () => true });
    expect(winter.map((npc) => npc.id)).not.toContain('rhea');
    expect(isNoticeBoardQuest(new QuestEngine(new Store(createGameState())).getQuestById('rhea_cold_feet'))).toBe(false);
  });

  it('does not stack duplicate pack status across boots', () => {
    const pack = JSON.parse(readPack('spring-herbs.json'));
    const first = boot([pack]);
    const second = boot([pack], first.state);
    expect(second.state.campaign.contentPacks.loaded).toHaveLength(1);
    expect(second.state.campaign.contentProvenance.filter((row) => row.packId === 'spring_herbs')).toHaveLength(1);
    expect(listPackCrops()).toHaveLength(1);
  });
});
