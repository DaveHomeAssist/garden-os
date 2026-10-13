/**
 * Runtime registry for content-pack entries.
 *
 * Official content stays in specs/ and is never mutated. Pack content lives
 * here, keyed by id, and the crop, quest, and NPC accessors consult it after
 * the official tables. Every entry carries `modded: true` and a provenance
 * record so the UI can label it and saves can trace it.
 *
 * Packs are installed at boot (see installed-packs.js); changing the
 * installed set applies on the next load so a running season never loses a
 * crop or quest mid-play.
 */

const registry = {
  crops: new Map(),
  quests: new Map(),
  npcs: new Map(),
  zones: new Map(),
  packs: [],
};

function resetPackContent() {
  registry.crops.clear();
  registry.quests.clear();
  registry.npcs.clear();
  registry.zones.clear();
  registry.packs = [];
}

/**
 * Register loader output. Entries whose id collides with official content or
 * with an earlier pack are skipped and reported, never allowed to override.
 * @param {{ crops?: object[], quests?: object[], npcs?: object[], zones?: object[] }} content
 * @param {{ isOfficial?: (type: string, id: string) => boolean, packs?: object[] }} options
 */
function installPackContent(content = {}, { isOfficial = () => false, packs = [] } = {}) {
  const skipped = [];
  ['crops', 'quests', 'npcs', 'zones'].forEach((type) => {
    (content[type] ?? []).forEach((entry) => {
      if (!entry?.id) return;
      if (isOfficial(type, entry.id) || registry[type].has(entry.id)) {
        skipped.push({ type, id: entry.id, packId: entry.provenance?.packId ?? null });
        return;
      }
      registry[type].set(entry.id, Object.freeze({ ...entry, modded: true }));
    });
  });
  registry.packs = [...registry.packs, ...packs];
  return { skipped };
}

function getPackCrop(id) {
  return registry.crops.get(id) ?? null;
}

function listPackCrops() {
  return [...registry.crops.values()];
}

function getPackQuest(id) {
  return registry.quests.get(id) ?? null;
}

function listPackQuests() {
  return [...registry.quests.values()];
}

function getPackNpc(id) {
  return registry.npcs.get(id) ?? null;
}

function listPackNpcs() {
  return [...registry.npcs.values()];
}

function listPackZones() {
  return [...registry.zones.values()];
}

function listInstalledPacks() {
  return [...registry.packs];
}

function isModdedQuest(id) {
  return registry.quests.has(id);
}

function isModdedCrop(id) {
  return registry.crops.has(id);
}

function isModdedNpc(id) {
  return registry.npcs.has(id);
}

export {
  getPackCrop,
  getPackNpc,
  getPackQuest,
  installPackContent,
  isModdedCrop,
  isModdedNpc,
  isModdedQuest,
  listInstalledPacks,
  listPackCrops,
  listPackNpcs,
  listPackQuests,
  listPackZones,
  resetPackContent,
};
