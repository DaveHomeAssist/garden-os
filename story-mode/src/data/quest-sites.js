// Quest world sites: fixed places in the zones where quest objectives happen.
// Pure data module. It is imported by the store reducer, the quest UI and the
// zone scenes, so it must not import from src/game or src/scene.

const QUEST_SITES = [
  {
    // Pat, Sam, Jo and Robin have no world presence, so their requests are
    // pinned to a board in the neighborhood square instead.
    id: 'neighborhood_notice_board',
    zoneId: 'neighborhood',
    kind: 'notice_board',
    position: { x: 1.9, z: -1.7 },
    radius: 1.0,
    label: 'Read the neighborhood notice board',
    npcIds: ['neighbor_pat', 'neighbor_sam', 'neighbor_jo', 'neighbor_robin'],
  },
  {
    // gus_river_path: "behind the big oak in the neighborhood ... on the east
    // side". The big oak is the neighborhood tree at (6, -2).
    id: 'big_oak_hollow',
    zoneId: 'neighborhood',
    kind: 'discovery',
    position: { x: 7.0, z: -1.2 },
    radius: 0.9,
    questId: 'gus_river_path',
    itemId: 'old_map',
    label: 'Search behind the big oak',
    foundText: 'Tucked in a hollow root behind the big oak: an oilcloth packet with a hand-drawn map. A dotted line runs east through the tall grass to a river crossing.',
  },
  {
    // prairie_restore: "plant five clover patches out there" (the meadow).
    id: 'meadow_clover_plot',
    zoneId: 'meadow',
    kind: 'planter',
    position: { x: -4.5, z: -3.5 },
    radius: 1.2,
    questId: 'prairie_restore',
    slots: 5,
    crops: [{ cropId: 'wild_clover', growSeasons: null }],
    label: 'Plant a wild clover patch',
    plantText: 'You tuck one of Sam\'s clover plugs into the tired meadow soil.',
  },
  {
    // vanilla_challenge ("in the greenhouse", "multiple seasons") and the
    // winter-only greenhouse crops that the home bed can never grow.
    id: 'greenhouse_planter',
    zoneId: 'greenhouse',
    kind: 'planter',
    position: { x: -2.5, z: 1.2 },
    radius: 1.2,
    questId: null,
    slots: null,
    crops: [
      { cropId: 'vanilla_orchid', growSeasons: 2 },
      { cropId: 'ghost_pepper', growSeasons: 1 },
      { cropId: 'lemon_tree', growSeasons: 2 },
    ],
    label: 'Tend the greenhouse planter',
    plantText: 'The grow lights hum. This bed stays warm no matter the season outside.',
  },
  {
    id: 'festival_booth_a',
    zoneId: 'festival_grounds',
    kind: 'festival_booth',
    activityIndex: 0,
    position: { x: -4, z: -4 },
    radius: 1.4,
  },
  {
    id: 'festival_booth_b',
    zoneId: 'festival_grounds',
    kind: 'festival_booth',
    activityIndex: 1,
    position: { x: 4, z: -4 },
    radius: 1.4,
  },
];

function getQuestSite(siteId) {
  return QUEST_SITES.find((site) => site.id === siteId) ?? null;
}

function getQuestSitesForZone(zoneId) {
  return QUEST_SITES.filter((site) => site.zoneId === zoneId);
}

function getSiteCrop(siteOrId, cropId) {
  const site = typeof siteOrId === 'string' ? getQuestSite(siteOrId) : siteOrId;
  return site?.crops?.find((entry) => entry.cropId === cropId) ?? null;
}

export {
  QUEST_SITES,
  getQuestSite,
  getQuestSitesForZone,
  getSiteCrop,
};
