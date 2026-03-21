export const KEEPSAKES = [
  {
    id: 'moms_trowel',
    name: "Mom's Trowel",
    chapter: 1,
    trigger: 'first_crop_first_cell',
    shortLabel: 'Trowel',
  },
  {
    id: 'first_seed_packet',
    name: 'First Seed Packet',
    chapter: 1,
    trigger: 'first_save',
    shortLabel: 'Seed Packet',
  },
  {
    id: 'onion_mans_scorecard',
    name: "Onion Man's Scorecard",
    chapter: 2,
    trigger: 'phillies_failure',
    shortLabel: 'Scorecard',
  },
  {
    id: 'the_photo',
    name: 'The Photo',
    chapter: 8,
    trigger: 'chapter_8_review',
    shortLabel: 'Photo',
  },
  {
    id: 'first_frost_marker',
    name: 'First Frost Marker',
    chapter: 3,
    trigger: 'frost_damage',
    shortLabel: 'Frost Marker',
  },
  {
    id: 'block_party_plate',
    name: 'Block Party Plate',
    chapter: 5,
    trigger: 'recipe_block_party',
    shortLabel: 'Plate',
  },
  {
    id: 'handwritten_sauce_card',
    name: 'Handwritten Sauce Card',
    chapter: 11,
    trigger: 'moms_sauce',
    shortLabel: 'Sauce Card',
  },
];

export function getKeepsakeById(id) {
  return KEEPSAKES.find((keepsake) => keepsake.id === id) ?? null;
}

export function getKeepsakeSlots() {
  return KEEPSAKES;
}
