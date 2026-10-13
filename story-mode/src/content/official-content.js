// Which ids belong to official content. Packs may add, never replace.
import CROP_SCORING_DATA from 'specs/CROP_SCORING_DATA.json';
import QUEST_DECK from 'specs/QUEST_DECK.json';
import WORLD_MAP from 'specs/WORLD_MAP.json';

import { NPC_REGISTRY } from '../data/npcs.js';

const OFFICIAL_NEIGHBOR_IDS = ['neighbor_pat', 'neighbor_sam', 'neighbor_jo', 'neighbor_robin'];

const OFFICIAL_IDS = {
  crops: new Set(Object.keys(CROP_SCORING_DATA.crops ?? {})),
  quests: new Set((QUEST_DECK.quests ?? []).map((quest) => quest.id)),
  npcs: new Set([...Object.keys(NPC_REGISTRY), ...OFFICIAL_NEIGHBOR_IDS]),
  zones: new Set(Object.keys(WORLD_MAP.zones ?? {})),
};

export function isOfficialContent(type, id) {
  return Boolean(OFFICIAL_IDS[type]?.has(id));
}
