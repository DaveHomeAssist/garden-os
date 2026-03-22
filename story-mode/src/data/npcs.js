import worldMap from 'specs/WORLD_MAP.json';

const NEIGHBOR_TEMPLATES = [
  { id: 'neighbor_gardener', name: 'Pat', role: 'Weekend Gardener', questType: 'assist' },
  { id: 'neighbor_beekeeper', name: 'Sam', role: 'Beekeeper', questType: 'fetch' },
  { id: 'neighbor_composter', name: 'Jo', role: 'Composter', questType: 'assist' },
  { id: 'neighbor_birdwatcher', name: 'Robin', role: 'Birdwatcher', questType: 'discover' },
];

function getZoneNpcPosition(zoneId, npcId, fallbackPosition) {
  const zone = worldMap?.zones?.[zoneId];
  const slot = zone?.npcSlots?.find((entry) => entry.npcId === npcId);
  return slot?.position ?? fallbackPosition;
}

const NPC_REGISTRY = {
  old_gus: {
    id: 'old_gus',
    name: 'Old Gus',
    role: 'Veteran Gardener',
    personality: 'Gruff, wise, nostalgic',
    questFocus: 'Rare seed hunts, heritage techniques',
    defaultEmotion: 'neutral',
    portrait: 'old_gus',
    schedule: {
      spring: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'old_gus', { x: -3, z: 4 }) },
      summer: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'old_gus', { x: -3, z: 4 }) },
      fall: { zone: 'forest_edge', position: getZoneNpcPosition('forest_edge', 'old_gus', { x: -4, z: 3 }) },
      winter: { zone: 'forest_edge', position: getZoneNpcPosition('forest_edge', 'old_gus', { x: -4, z: 3 }) },
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: {
        stranger: 'Hmm? New around here?',
        acquaintance: 'You again. Good.',
        friend: 'Good to see you, kid.',
        trusted: "Soil's listening today. Pay attention.",
        family: 'There you are. Grab your gloves.',
      },
      farewell: {
        stranger: "Don't trample the beds.",
        acquaintance: 'Mind the roots on your way out.',
        friend: 'Take care of that soil.',
        trusted: 'Keep those hands busy.',
        family: 'Come back before sunset.',
      },
    },
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    role: 'Inventor/Tinkerer',
    personality: 'Enthusiastic, scattered',
    questFocus: 'Tool crafting, experiments',
    defaultEmotion: 'excited',
    portrait: 'maya',
    schedule: {
      spring: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'maya', { x: 4, z: 2 }) },
      summer: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'maya', { x: 4, z: 2 }) },
      fall: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'maya', { x: 4, z: 2 }) },
      winter: null,
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: {
        stranger: 'Oh! Hi! I was just... never mind.',
        acquaintance: 'You showed up at exactly the right moment.',
        friend: 'Perfect timing! I need someone to test this!',
        trusted: "Don't move. I need your opinion on three prototypes.",
        family: 'There you are. Help me break science again.',
      },
      farewell: {
        stranger: 'Wait, actually... no, go ahead.',
        acquaintance: 'If you find any spare parts, bring them back.',
        friend: 'Come back when you find more parts!',
        trusted: "I'll have version two ready by tomorrow. Probably.",
        family: 'If this explodes, it is technically our fault now.',
      },
    },
  },
  lila: {
    id: 'lila',
    name: 'Lila',
    role: 'Chef',
    personality: 'Warm, demanding, precise',
    questFocus: 'Ingredient farming, recipe completion',
    defaultEmotion: 'warm',
    portrait: 'lila',
    schedule: {
      spring: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'lila', { x: -1, z: -3 }) },
      summer: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'lila', { x: -1, z: -3 }) },
      fall: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'lila', { x: -1, z: -3 }) },
      winter: { zone: 'neighborhood', position: getZoneNpcPosition('neighborhood', 'lila', { x: -1, z: -3 }) },
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: {
        stranger: "The kitchen's not open yet.",
        acquaintance: 'If you brought herbs, we can talk.',
        friend: 'Tell me you brought basil.',
        trusted: 'You smell like tomato vines. Good.',
        family: "I've got a burner open and a sharp knife waiting.",
      },
      farewell: {
        stranger: 'Come back with something fresh.',
        acquaintance: "Don't bruise the leaves on the way home.",
        friend: "I'll save you a plate.",
        trusted: 'Next time, bring twice as much.',
        family: 'Come eat when the pans start singing.',
      },
    },
  },
};

const TIER_KEY_MAP = {
  stranger: 'stranger',
  acquaintance: 'acquaintance',
  friend: 'friend',
  trusted: 'trusted',
  family: 'family',
};

function getNPC(id) {
  return NPC_REGISTRY[id] ?? null;
}

function getNPCsInZone(zone, season) {
  return Object.values(NPC_REGISTRY)
    .filter((npc) => npc.schedule?.[season]?.zone === zone)
    .map((npc) => ({
      ...npc,
      activeSchedule: npc.schedule?.[season] ?? null,
    }));
}

function getActiveNeighbors(campaignState = {}) {
  const activeIds = Array.isArray(campaignState.activeNeighbors) && campaignState.activeNeighbors.length
    ? campaignState.activeNeighbors
    : NEIGHBOR_TEMPLATES.slice(0, 2).map((entry) => entry.id);
  return activeIds
    .map((id) => NEIGHBOR_TEMPLATES.find((entry) => entry.id === id))
    .filter(Boolean);
}

function getNPCGreeting(npcId, reputationTier = 'stranger') {
  const npc = getNPC(npcId);
  if (!npc) return '';
  const tierKey = TIER_KEY_MAP[String(reputationTier).toLowerCase()] ?? 'stranger';
  return npc.dialogueDefaults?.greeting?.[tierKey] ?? npc.dialogueDefaults?.greeting?.stranger ?? '';
}

function getNPCFarewell(npcId, reputationTier = 'stranger') {
  const npc = getNPC(npcId);
  if (!npc) return '';
  const tierKey = TIER_KEY_MAP[String(reputationTier).toLowerCase()] ?? 'stranger';
  return npc.dialogueDefaults?.farewell?.[tierKey] ?? npc.dialogueDefaults?.farewell?.stranger ?? '';
}

export {
  NPC_REGISTRY,
  NEIGHBOR_TEMPLATES,
  getNPC,
  getNPCsInZone,
  getActiveNeighbors,
  getNPCGreeting,
  getNPCFarewell,
};
