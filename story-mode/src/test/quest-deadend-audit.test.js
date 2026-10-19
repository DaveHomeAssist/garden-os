import { describe, expect, it } from 'vitest';

import questDeck from 'specs/QUEST_DECK.json';
import WORLD_MAP from 'specs/WORLD_MAP.json';
import RECIPES from 'specs/CRAFTING_RECIPES.json';
import MARKET from 'specs/MARKET_PRICES.json';
import SKILL_TREE from 'specs/SKILL_TREE.json';

import { getCropById } from '../data/crops.js';
import { FESTIVALS } from '../data/festivals-data.js';
import { getNPC } from '../data/npcs.js';
import { QUEST_SITES } from '../data/quest-sites.js';
import { PLAYER_RADIUS } from '../engine/simulation-core.js';
import { LOOT_TABLES, ZONE_SPOTS } from '../game/foraging.js';
import { getItemDef } from '../game/inventory.js';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';
import { isNoticeBoardQuest } from '../ui/quest-text.js';
import { getZoneMovementBlockers, getZoneMovementBounds } from '../ui/zone-travel.js';

/**
 * D7 dead-end audit. A data-level check that every quest in QUEST_DECK can be
 * taken from accept to turn-in in the shipped game: the giver exists and can be
 * reached, every prerequisite resolves, and every objective points at
 * something real (a zone you can walk into, a crop you can grow, an item a
 * recipe, forage spot, quest site or the market produces, a forage spot that
 * exists, a festival that runs). It complements quest-reachability-*.test.js,
 * which plays the deck headlessly: this one names the missing content when a
 * quest breaks, and checks that the places involved are standable.
 *
 * The 12 dead ends from the Sept 25 audit (REPORT.md §3.6, FEATURE_PLAN 0.3)
 * are listed in ORIGINAL_DEAD_ENDS so a regression on any of them is called out
 * by name.
 */

const QUESTS = questDeck.quests;
const QUEST_IDS = new Set(QUESTS.map((quest) => quest.id));
const ZONES = WORLD_MAP.zones;
const FINAL_CHAPTER = 12;
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const SEASON_OF_CHAPTER = (chapter) => SEASONS[(chapter - 1) % 4];
const MAX_REPUTATION = 100;
const NPC_TALK_RADIUS = 1.2; // makeNpcMarker
const FORAGE_RADIUS = 0.8; // makeForageSpotMesh

export const ORIGINAL_DEAD_ENDS = {
  // direct (8)
  gus_river_path: 'item_found old_map: nothing produced old_map and the type was unsupported (gates Riverside)',
  explore_meadow: 'zone_visited meadow_spot_1..3: fake spot ids, and spots are not zones',
  jo_compost: 'crop_harvested "any" looked up pantry.any',
  gus_mushroom_logs: 'item_delivered: unsupported type',
  market_day: 'item_traded any: unsupported type',
  festival_champion: 'festival_completed x4: unsupported type',
  maya_sprinkler: 'item_crafted basic_sprinkler: no recipe produced it',
  maya_hybrid: 'item_crafted hybrid_seed: no recipe produced it',
  // transitive via gus_river_path (4)
  maya_scanner: 'zone_visited riverside, gated on gus_river_path',
  robin_birds: 'zone_visited riverside, gated on gus_river_path',
  lila_watercress: 'prerequisite gus_river_path',
  lila_cookbook: 'prerequisite lila_watercress',
};

const SUPPORTED_TYPES = new Set([
  'crop_harvested', 'crop_planted', 'reputation', 'item_crafted', 'item_found',
  'item_delivered', 'item_traded', 'festival_completed', 'spot_foraged', 'zone_visited', 'season',
]);

// --- Geometry ---------------------------------------------------------------

function blocked(zoneId, x, z, pad = PLAYER_RADIUS) {
  return getZoneMovementBlockers(zoneId).some((b) => {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    return Math.hypot(x - cx, z - cz) < pad;
  });
}

function inBounds(zoneId, x, z) {
  const b = getZoneMovementBounds(zoneId);
  return !b || (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
}

/** Is there a standable point within `radius` of (x, z)? */
function canStandNear(zoneId, { x, z }, radius) {
  const r = Math.max(0, radius - 0.1);
  for (let dx = -r; dx <= r + 1e-9; dx += 0.1) {
    for (let dz = -r; dz <= r + 1e-9; dz += 0.1) {
      if (Math.hypot(dx, dz) > r + 1e-9) continue;
      if (inBounds(zoneId, x + dx, z + dz) && !blocked(zoneId, x + dx, z + dz)) return true;
    }
  }
  return false;
}

// --- Zones ------------------------------------------------------------------

function questsRequiringZone(zoneId) {
  return QUESTS.filter((quest) => (quest.requirements ?? []).some((req) => req.zone === zoneId
    || (req.type === 'zone_visited' && req.id === zoneId)));
}

function gateProblem(zoneId, closed = new Set()) {
  const gate = ZONES[zoneId]?.gate;
  if (!gate) return null;
  const req = gate.requirement ?? {};
  switch (gate.type) {
    case 'skill': {
      const skill = SKILL_TREE.skills?.[req.skill] ?? (Array.isArray(SKILL_TREE.skills) ? SKILL_TREE.skills.find((s) => s.id === req.skill) : null);
      return skill ? null : `gate skill ${req.skill} does not exist`;
    }
    case 'reputation':
      return getNPC(req.npc) && (req.minValue ?? 0) <= MAX_REPUTATION ? null : `gate reputation ${req.npc} ${req.minValue}`;
    case 'quest': {
      if (!QUEST_IDS.has(req.quest)) return `gate quest ${req.quest} is not in the deck`;
      // The unlocking quest must not need the zone it unlocks.
      if (questsRequiringZone(zoneId).some((quest) => quest.id === req.quest)) return `gate quest ${req.quest} needs ${zoneId} itself`;
      return null;
    }
    case 'event':
      return Object.keys(FESTIVALS).length ? null : 'gate event: no festivals defined';
    default:
      return `unknown gate type ${gate.type}`;
  }
}

/** Zones reachable from the home plot through exits whose gates can open. */
function reachableZones(closed = new Set()) {
  const seen = new Set(['player_plot']);
  const queue = ['player_plot'];
  while (queue.length) {
    for (const exit of getZoneExitPoints(queue.shift())) {
      const next = exit.destination;
      if (!next || seen.has(next) || !ZONES[next] || closed.has(next) || gateProblem(next, closed)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

let REACHABLE_ZONES = reachableZones();

// --- Items ------------------------------------------------------------------

const SITE_ITEMS = new Map(QUEST_SITES.filter((site) => site.itemId).map((site) => [site.itemId, site]));

function lootItemsByZone() {
  const byZone = {};
  for (const [zoneId, spots] of Object.entries(ZONE_SPOTS)) {
    if (!REACHABLE_ZONES.has(zoneId)) continue;
    const items = new Set();
    for (const spot of spots) {
      const table = LOOT_TABLES[spot.type] ?? {};
      for (const tier of ['common', 'uncommon', 'rare']) (table[tier] ?? []).forEach((entry) => items.add(entry.itemId));
    }
    byZone[zoneId] = items;
  }
  return byZone;
}
let LOOT_BY_ZONE = lootItemsByZone();

function maxSkillLevel(skillId) {
  const skill = SKILL_TREE.skills?.[skillId] ?? (Array.isArray(SKILL_TREE.skills) ? SKILL_TREE.skills.find((s) => s.id === skillId) : null);
  if (!skill) return 0;
  return skill.maxLevel ?? (Array.isArray(SKILL_TREE.xpTable) ? SKILL_TREE.xpTable.length : 10);
}

function obtainableItems() {
  const items = new Set(Object.keys(MARKET.items ?? {}));
  Object.values(LOOT_BY_ZONE).forEach((set) => set.forEach((id) => items.add(id)));
  for (const [itemId, site] of SITE_ITEMS) if (REACHABLE_ZONES.has(site.zoneId)) items.add(itemId);
  Object.values(FESTIVALS).forEach((festival) => festival.activities?.forEach(() => {}));
  let grew = true;
  while (grew) {
    grew = false;
    for (const recipe of RECIPES.recipes) {
      const out = recipe.output?.itemId;
      if (!out || items.has(out)) continue;
      const skillsOk = Object.entries(recipe.skillRequirement ?? {}).every(([skill, level]) => level <= maxSkillLevel(skill));
      if (skillsOk && (recipe.materials ?? []).every((m) => items.has(m.itemId))) {
        items.add(out);
        grew = true;
      }
    }
  }
  return items;
}
let OBTAINABLE = obtainableItems();

function itemProblem(itemId) {
  if (!getItemDef(itemId)) return `item ${itemId} has no inventory definition`;
  if (!OBTAINABLE.has(itemId)) return `item ${itemId} has no source (recipe, forage, quest site or market)`;
  return null;
}

// --- Crops ------------------------------------------------------------------

function siteCropZones(cropId) {
  return QUEST_SITES.filter((site) => site.kind === 'planter' && site.crops?.some((c) => c.cropId === cropId)).map((site) => site.zoneId);
}

function cropProblem(cropId, zone) {
  if (cropId === 'any') return null;
  const crop = getCropById(cropId);
  if (!crop) return `crop ${cropId} does not exist`;
  if (zone && zone !== 'player_plot') {
    if (!REACHABLE_ZONES.has(zone)) return `zone ${zone} is unreachable`;
    return siteCropZones(cropId).includes(zone) ? null : `no planter in ${zone} grows ${cropId}`;
  }
  // Home bed: unlocked by chapter 12, or growable at a reachable quest planter
  // (greenhouse-only crops count toward the lifetime pantry from there).
  const byChapter = (crop.chapterUnlock ?? 1) <= FINAL_CHAPTER;
  const grows = SEASONS.some((season) => (crop.seasonalMultipliers?.[season] ?? 1) > 0);
  if (byChapter && grows) return null;
  if (siteCropZones(cropId).some((z) => REACHABLE_ZONES.has(z))) return null;
  return `crop ${cropId} can't be grown in any season by chapter ${FINAL_CHAPTER}`;
}

// --- Prerequisites ------------------------------------------------------------

function prerequisiteProblems(quest) {
  const problems = [];
  const pre = quest.prerequisites ?? {};
  const min = pre.chapter_min ?? 1;
  const chapters = [];
  for (let ch = min; ch <= FINAL_CHAPTER; ch += 1) if (!pre.season || SEASON_OF_CHAPTER(ch) === pre.season) chapters.push(ch);
  if (!chapters.length) problems.push(`no chapter in ${min}..${FINAL_CHAPTER} is ${pre.season}`);
  for (const id of pre.quests_completed ?? []) {
    if (!QUEST_IDS.has(id)) problems.push(`prerequisite quest ${id} is not in the deck`);
    else if (auditQuest(QUESTS.find((entry) => entry.id === id)).length) problems.push(`prerequisite quest ${id} is itself a dead end`);
  }
  // Cycles.
  const visit = (id, path) => {
    if (path.includes(id)) { problems.push(`prerequisite cycle ${[...path, id].join(' -> ')}`); return; }
    const q = QUESTS.find((entry) => entry.id === id);
    (q?.prerequisites?.quests_completed ?? []).forEach((next) => visit(next, [...path, id]));
  };
  visit(quest.id, []);
  for (const [npcId, value] of Object.entries(pre.reputation ?? {})) {
    if (!getNPC(npcId)) problems.push(`reputation prerequisite on unknown NPC ${npcId}`);
    const available = reputationAvailable(npcId, quest.id);
    if (value > Math.min(MAX_REPUTATION, available)) problems.push(`needs ${npcId} reputation ${value}, other quests give at most ${available}`);
  }
  return problems;
}

function dependsOn(questId, targetId, seen = new Set()) {
  if (seen.has(questId)) return false;
  seen.add(questId);
  const quest = QUESTS.find((entry) => entry.id === questId);
  const pre = quest?.prerequisites?.quests_completed ?? [];
  return pre.includes(targetId) || pre.some((id) => dependsOn(id, targetId, seen));
}

/** Reputation with an NPC from quests that don't depend on `excludeId` (worst outcome each). */
function reputationAvailable(npcId, excludeId) {
  const sum = (rewards) => (rewards ?? []).filter((r) => r.type === 'reputation' && r.id === npcId).reduce((s, r) => s + (r.amount ?? 0), 0);
  let total = 0;
  for (const quest of QUESTS) {
    if (quest.id === excludeId || dependsOn(quest.id, excludeId)) continue;
    const outcomes = quest.outcomes?.length ? quest.outcomes.map((o) => sum(o.rewards)) : [0];
    total += sum(quest.rewards) + Math.min(...outcomes);
  }
  return total;
}

// --- Objectives ---------------------------------------------------------------

function requirementProblem(req) {
  if (!SUPPORTED_TYPES.has(req.type)) return `unsupported objective type ${req.type}`;
  if (req.zone && !ZONES[req.zone]) return `zone ${req.zone} does not exist`;
  if (req.zone && !REACHABLE_ZONES.has(req.zone)) return `zone ${req.zone} is unreachable`;
  switch (req.type) {
    case 'crop_harvested':
    case 'crop_planted': {
      const p = cropProblem(req.id, req.zone);
      if (p) return p;
      if (req.adjacentTo) return cropProblem(req.adjacentTo, null);
      return null;
    }
    case 'reputation':
      return getNPC(req.id) ? null : `NPC ${req.id} does not exist`;
    case 'item_crafted':
      if (!RECIPES.recipes.some((r) => r.output?.itemId === req.id)) return `no recipe crafts ${req.id}`;
      return itemProblem(req.id);
    case 'item_found': {
      const zone = req.zone ?? null;
      const site = SITE_ITEMS.get(req.id);
      const fromSite = site && (!zone || site.zoneId === zone) && REACHABLE_ZONES.has(site.zoneId);
      const fromForage = zone ? LOOT_BY_ZONE[zone]?.has(req.id) : Object.values(LOOT_BY_ZONE).some((s) => s.has(req.id));
      return fromSite || fromForage ? null : `${req.id} can't be found${zone ? ` in ${zone}` : ''}`;
    }
    case 'item_delivered':
      return itemProblem(req.id);
    case 'item_traded':
      if (req.id === 'any') return Object.keys(MARKET.items ?? {}).length ? null : 'the market sells nothing';
      return MARKET.items?.[req.id] ? null : `the market doesn't trade ${req.id}`;
    case 'festival_completed': {
      if (!REACHABLE_ZONES.has('festival_grounds')) return 'festival grounds are unreachable';
      const ok = Object.values(FESTIVALS).some((f) => (f.season === req.id || f.id === req.id) && f.activities?.length);
      return ok ? null : `no festival with activities for ${req.id}`;
    }
    case 'spot_foraged': {
      const zoneId = Object.keys(ZONE_SPOTS).find((z) => ZONE_SPOTS[z].some((spot) => spot.id === req.id));
      if (!zoneId) return `forage spot ${req.id} does not exist`;
      return REACHABLE_ZONES.has(zoneId) ? null : `forage spot ${req.id} is in unreachable ${zoneId}`;
    }
    case 'zone_visited':
      if (!ZONES[req.id]) return `zone ${req.id} does not exist`;
      return REACHABLE_ZONES.has(req.id) ? null : `zone ${req.id} is unreachable`;
    case 'season':
      return SEASONS.includes(req.id ?? req.season) ? null : `unknown season ${req.id ?? req.season}`;
    default:
      return null;
  }
}

function giverProblems(quest) {
  const problems = [];
  if (!quest.title || !quest.acceptDialogue || !quest.completeDialogue) problems.push('missing title or accept/complete dialogue');
  if (isNoticeBoardQuest(quest)) {
    if (!QUEST_SITES.some((site) => site.kind === 'notice_board' && site.npcIds?.includes(quest.npc))) problems.push(`no notice board lists ${quest.npc}`);
    return problems;
  }
  const npc = getNPC(quest.npc);
  if (!npc) { problems.push(`giver ${quest.npc} does not exist`); return problems; }
  // npc-presence falls back to the neighborhood slot when the scheduled zone
  // is locked, so the neighborhood slot must be talkable-to.
  const slot = ZONES.neighborhood.npcSlots?.find((entry) => entry.npcId === quest.npc)?.position;
  if (!slot) problems.push(`${quest.npc} has no neighborhood slot to fall back to`);
  else if (!canStandNear('neighborhood', slot, NPC_TALK_RADIUS)) problems.push(`${quest.npc}'s neighborhood slot can't be walked up to`);
  return problems;
}

export function auditQuest(quest) {
  return [
    ...giverProblems(quest),
    ...prerequisiteProblems(quest),
    ...(quest.requirements ?? []).map(requirementProblem).filter(Boolean),
  ];
}

// A zone behind a quest gate is only open if that quest is completable. Settle
// the zone set until it stops changing (gus_river_path gates Riverside, which
// maya_scanner and robin_birds need).
const QUEST_GATED = Object.entries(ZONES).filter(([, zone]) => zone.gate?.type === 'quest').map(([zoneId, zone]) => [zoneId, zone.gate.requirement.quest]);
const CLOSED_ZONES = new Set();
for (let pass = 0; pass < 5; pass += 1) {
  const closed = QUEST_GATED.filter(([, questId]) => auditQuest(QUESTS.find((q) => q.id === questId)).length).map(([zoneId]) => zoneId);
  if (closed.length === CLOSED_ZONES.size && closed.every((z) => CLOSED_ZONES.has(z))) break;
  CLOSED_ZONES.clear();
  closed.forEach((z) => CLOSED_ZONES.add(z));
  REACHABLE_ZONES = reachableZones(CLOSED_ZONES);
  LOOT_BY_ZONE = lootItemsByZone();
  OBTAINABLE = obtainableItems();
}

describe('D7 quest dead-end audit (data level)', () => {
  it('audits all 25 quests in the deck', () => {
    expect(QUESTS).toHaveLength(25);
  });

  for (const quest of QUESTS) {
    const label = ORIGINAL_DEAD_ENDS[quest.id] ? `${quest.id} (was a dead end: ${ORIGINAL_DEAD_ENDS[quest.id]})` : quest.id;
    it(`${label} can go from accept to turn-in`, () => {
      expect(auditQuest(quest)).toEqual([]);
    });
  }

  it('every zone a quest needs is reachable from the home plot', () => {
    const needed = new Set(QUESTS.flatMap((q) => (q.requirements ?? []).flatMap((r) => [r.zone, r.type === 'zone_visited' ? r.id : null]).filter(Boolean)));
    expect([...needed].filter((zoneId) => !REACHABLE_ZONES.has(zoneId))).toEqual([]);
    expect(Object.keys(ZONES).filter((zoneId) => gateProblem(zoneId)).map((zoneId) => `${zoneId}: ${gateProblem(zoneId)}`)).toEqual([]);
    expect([...CLOSED_ZONES]).toEqual([]);
  });

  it('every quest site, forage spot, NPC slot and exit can be walked up to', () => {
    const problems = [];
    for (const site of QUEST_SITES) {
      if (!canStandNear(site.zoneId, site.position, site.radius ?? 1)) problems.push(`site ${site.id}`);
    }
    for (const [zoneId, spots] of Object.entries(ZONE_SPOTS)) {
      for (const spot of spots) if (!canStandNear(zoneId, spot.position, FORAGE_RADIUS)) problems.push(`spot ${spot.id}`);
    }
    for (const [zoneId, zone] of Object.entries(ZONES)) {
      for (const slot of zone.npcSlots ?? []) if (!canStandNear(zoneId, slot.position, NPC_TALK_RADIUS)) problems.push(`npc ${slot.npcId}@${zoneId}`);
      for (const exit of getZoneExitPoints(zoneId)) if (!canStandNear(zoneId, exit.position, 1.4)) problems.push(`exit ${exit.id}`);
    }
    expect(problems).toEqual([]);
  });

  it('every recipe unlockCondition names a quest that exists', () => {
    const dangling = RECIPES.recipes
      .filter((r) => r.unlockCondition)
      .filter((r) => !QUEST_IDS.has(String(r.unlockCondition).replace(/^quest_/, '')))
      .map((r) => `${r.id}: ${r.unlockCondition}`);
    expect(dangling).toEqual([]);
  });
});

describe('gus_compost: "Craft Compost" has a recipe', () => {
  it('compost_batch crafts compost from fall forage and counts toward the quest', async () => {
    const { createGameState } = await import('../game/state.js');
    const { Store, Actions } = await import('../game/store.js');
    const { Inventory } = await import('../game/inventory.js');
    const { SkillSystem } = await import('../game/skills.js');
    const { CraftingSystem } = await import('../game/crafting.js');
    const { QuestEngine } = await import('../game/quest-engine.js');
    const store = new Store(createGameState());
    const inventory = new Inventory(store);
    const crafting = new CraftingSystem(store, inventory, new SkillSystem(store));
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'dried_leaves', count: 4 } });
    store.dispatch({ type: Actions.ADD_ITEM, payload: { itemId: 'plant_matter', count: 2 } });
    expect(crafting.craft('compost_batch').success).toBe(true);
    expect(crafting.craft('compost_batch').success).toBe(true);
    const engine = new QuestEngine(store);
    const req = QUESTS.find((q) => q.id === 'gus_compost').requirements.find((r) => r.type === 'item_crafted');
    expect(engine.getRequirementProgress(req, store.getState())).toEqual({ current: 2, target: 2, met: true });
  });
});

describe('gus_river_path tracker wording', () => {
  it('the Old River Map is a quest-site find, not wild forage; watercress still is', async () => {
    const { describeRequirement } = await import('../ui/quest-text.js');
    const river = QUESTS.find((q) => q.id === 'gus_river_path');
    const map = river.requirements.find((r) => r.type === 'item_found');
    expect(describeRequirement(map, river)).toBe('Find Old River Map at The Neighborhood');
    const cress = QUESTS.find((q) => q.id === 'lila_watercress');
    expect(describeRequirement(cress.requirements[0], cress)).toMatch(/^Find wild Watercress at Riverside$/);
  });
});
