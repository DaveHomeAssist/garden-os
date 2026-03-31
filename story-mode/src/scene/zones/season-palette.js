/** Shared seasonal color palettes for zone setSeason(). */
export const SEASON_PALETTE = {
  ground:  { spring: 0x6daa45, summer: 0x7a9a3a, fall: 0x8a6a35, winter: 0xb0aaa0 },
  foliage: { spring: 0x5abf40, summer: 0x2d6a28, fall: 0xc46a1e, winter: 0x6b5540 },
  ambient: { spring: 0.7, summer: 0.85, fall: 0.55, winter: 0.4 },
  fog:     { spring: 0.02, summer: 0.015, fall: 0.025, winter: 0.03 },
  water:   { spring: 0x3388cc, summer: 0x22aa99, fall: 0x6688aa, winter: 0xa0c8dd },
};

export function applyBase(zone, season, ground, hemi, fogObj) {
  const s = season || 'spring';
  if (ground) ground.material.color.setHex(SEASON_PALETTE.ground[s]);
  if (hemi) hemi.intensity = SEASON_PALETTE.ambient[s];
  if (fogObj) fogObj.density = SEASON_PALETTE.fog[s];
}
