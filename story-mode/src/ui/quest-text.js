// Player-facing labels for quests and quest requirements. Pure helpers so the
// quest UI and its tests share one wording.
import { getCropById } from '../data/crops.js';
import { getNPC } from '../data/npcs.js';
import { QUEST_SITES } from '../data/quest-sites.js';
import { listPackQuests } from '../content/content-registry.js';
import { getItemDef } from '../game/inventory.js';
import { ZONE_NAMES } from './zone-travel.js';

const NEIGHBOR_NAMES = {
  neighbor_pat: 'Pat',
  neighbor_sam: 'Sam',
  neighbor_jo: 'Jo',
  neighbor_robin: 'Robin',
};

const SPOT_NAMES = {
  meadow_herbs: 'the meadow herb patch',
  meadow_rocks: 'the meadow rock pile',
  meadow_flowers: 'the meadow wildflowers',
};

const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

function getQuestGiverName(npcId) {
  return NEIGHBOR_NAMES[npcId] ?? getNPC(npcId)?.name ?? String(npcId ?? 'Someone');
}

// Content-pack quests whose giver cannot be met in person (no pack NPC with a
// zone) post their requests on the notice board like the neighbors do.
function isPackBoardGiver(npcId) {
  const npc = getNPC(npcId);
  return !npc || (npc.modded && !Object.keys(npc.schedule ?? {}).length);
}

function isNoticeBoardQuest(quest) {
  if (NEIGHBOR_NAMES[quest?.npc]) return true;
  return Boolean(quest?.modded) && isPackBoardGiver(quest?.npc);
}

/** Everyone whose requests go on the board: the neighbors plus pack givers. */
function getNoticeBoardGivers() {
  const packGivers = listPackQuests().filter((quest) => isNoticeBoardQuest(quest)).map((quest) => quest.npc);
  return [...new Set([...Object.keys(NEIGHBOR_NAMES), ...packGivers])];
}

function zoneName(zoneId) {
  return ZONE_NAMES[zoneId] ?? String(zoneId ?? '').replace(/_/g, ' ');
}

function cropName(cropId) {
  return getCropById(cropId)?.name ?? getItemDef(cropId).name;
}

function itemName(itemId) {
  const crop = getCropById(itemId);
  return crop?.name ?? getItemDef(itemId).name;
}

function describeRequirement(requirement, quest = null) {
  const { type, id, zone } = requirement ?? {};
  const where = zone ? ` in ${zone === 'greenhouse' ? 'the greenhouse' : zoneName(zone)}` : '';
  switch (type) {
    case 'crop_harvested':
      return id === 'any' ? `Harvest any crops${where}` : `Harvest ${cropName(id)}${where}`;
    case 'crop_planted': {
      const base = id === 'any' ? 'Plant any crops' : `Plant ${cropName(id)}`;
      if (zone && zone !== 'player_plot') return `${base}${where}`;
      if (requirement.adjacentTo) return `${base} next to ${cropName(requirement.adjacentTo)} (home bed)`;
      return `${base} in your bed`;
    }
    case 'item_crafted':
      return `Craft ${itemName(id)}`;
    case 'item_found':
      if (!zone) return `Find ${itemName(id)}`;
      // Quest-site discoveries (Gus's Old River Map) aren't forage, so not "wild".
      return QUEST_SITES.some((site) => site.itemId === id && site.zoneId === zone)
        ? `Find ${itemName(id)} at ${zoneName(zone)}`
        : `Find wild ${itemName(id)} at ${zoneName(zone)}`;
    case 'item_delivered':
      return `Bring ${itemName(id)} to ${getQuestGiverName(quest?.npc)}${zone ? ` at ${zoneName(zone)}` : ''}`;
    case 'item_traded':
      return id === 'any' ? 'Trade items at the Market Square' : `Trade ${itemName(id)} at the Market Square`;
    case 'festival_completed':
      return `Finish every ${SEASON_LABELS[id] ?? id} festival activity${requirement.sameYear ? ' (same year)' : ''}`;
    case 'spot_foraged':
      return `Forage ${SPOT_NAMES[id] ?? String(id).replace(/_/g, ' ')}`;
    case 'zone_visited':
      return `Visit ${zoneName(id)}`;
    case 'reputation':
      return `${getQuestGiverName(id)} reputation`;
    case 'season':
      return `Wait for ${SEASON_LABELS[id] ?? id}`;
    default:
      return String(type ?? 'Objective');
  }
}

/** Where to find whoever hands out / takes back a quest, for the quest log. */
function describeQuestGiverLocation(quest, presenceZone = null) {
  if (isNoticeBoardQuest(quest)) return 'Neighborhood notice board';
  const name = getQuestGiverName(quest?.npc);
  return presenceZone ? `${name} · ${zoneName(presenceZone)}` : name;
}

export {
  NEIGHBOR_NAMES,
  describeQuestGiverLocation,
  describeRequirement,
  getQuestGiverName,
  getNoticeBoardGivers,
  isNoticeBoardQuest,
  itemName,
  zoneName,
};
