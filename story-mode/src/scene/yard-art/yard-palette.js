/**
 * "A on B" palette: cozy painted colour on clean low-poly shapes.
 * One source of truth for the yard art pass; mirrored in STYLE_KIT.md.
 */
export const YARD_PALETTE = {
  spring: {
    zenith: 0x6fa3d6, sky: 0xa9cbe6, horizon: 0xf0dcbc, sunGlow: 0xffd9a0,
    cloudLit: 0xfff8ec, cloudShade: 0xc9cfdc,
    sun: 0xffd49a, fill: 0x9fb8e0, hemiSky: 0xb4cce6, hemiGround: 0x8a7a52, rim: 0xffd09a,
    hillNear: 0x7fa356, hillMid: 0x8fae74, hillFar: 0xa3b9a8,
    leafDark: 0x3f6b35, leafMid: 0x5f8f45, leafLight: 0x95bb5c, pine: 0x3d6440, bark: 0x6b4a32,
    grassDark: 0x4f7334, grassMid: 0x76a046, grassTip: 0xc4c870,
    flowers: [0xf4efe0, 0xf0c94a, 0xa68ad0, 0xe89ab0, 0xffffff],
  },
  summer: {
    zenith: 0x5c96d4, sky: 0x9ec6e8, horizon: 0xf3e3c0, sunGlow: 0xffe2a0,
    cloudLit: 0xfffaf0, cloudShade: 0xcfd3dc,
    sun: 0xffdca4, fill: 0x9cb6dc, hemiSky: 0xb2cce8, hemiGround: 0x7d7046, rim: 0xffd4a0,
    hillNear: 0x6f9a48, hillMid: 0x82a466, hillFar: 0x9db5a6,
    leafDark: 0x335e2c, leafMid: 0x4f8538, leafLight: 0x7eaa48, pine: 0x34583a, bark: 0x654430,
    grassDark: 0x416a2c, grassMid: 0x5f9038, grassTip: 0xa8b85a,
    flowers: [0xffd95e, 0xf4b56e, 0xf2f0d9, 0xe86a5a, 0xb48ad8],
  },
  fall: {
    zenith: 0x7d9cc4, sky: 0xb7c6d6, horizon: 0xf0cfa0, sunGlow: 0xffc888,
    cloudLit: 0xfff1de, cloudShade: 0xc8c0bc,
    sun: 0xffd09a, fill: 0x9aaed0, hemiSky: 0xc2cbd6, hemiGround: 0x7a5e3a, rim: 0xffc890,
    hillNear: 0xa0904a, hillMid: 0xa8a070, hillFar: 0xb0b4a2,
    leafDark: 0x9a4a24, leafMid: 0xc8742c, leafLight: 0xe8b04a, pine: 0x46603e, bark: 0x5f4230,
    grassDark: 0x6a6a32, grassMid: 0x8f8a46, grassTip: 0xc8b46a,
    flowers: [0xc98a34, 0xe0b050, 0xf2e8d0, 0xb85a3a, 0x9a6ab0],
  },
  winter: {
    zenith: 0x8aa0b8, sky: 0xb4c2d0, horizon: 0xd9dde0, sunGlow: 0xf2e6d6,
    cloudLit: 0xf4f6fa, cloudShade: 0xb8c0cc,
    sun: 0xe6ecf6, fill: 0xa8b8d0, hemiSky: 0xc4d0de, hemiGround: 0x6e665c, rim: 0xe0e6f2,
    hillNear: 0xb8c0c0, hillMid: 0xc0c8cc, hillFar: 0xc8d0d6,
    leafDark: 0x6a6460, leafMid: 0x857c72, leafLight: 0xa49a8c, pine: 0x4a5e50, bark: 0x5a4a40,
    grassDark: 0x6e705a, grassMid: 0x8a8a70, grassTip: 0xb4b49a,
    flowers: [0xdce5ef, 0xcdd6df, 0xffffff, 0xb6c2cf, 0xe8e0d0],
  },
};

/** How strongly each mood preset pulls the art sky/fog toward its own colour. */
export const MOOD_ART_WEIGHT = {
  calm: 0, dawn: 0.35, storm: 0.6, heat: 0.3, 'harvest-gold': 0.3, night: 0.85, celebration: 0.2, loss: 0.5,
};

/** Lighting rig targets (three.js r180 physical intensities, ACES exposure below). */
export const YARD_LIGHT = {
  exposure: 1.0,
  sunIntensity: 5.6,
  fillIntensity: 0.75,
  hemiIntensity: 2.0,
  ambientIntensity: 0.12,
  rimIntensity: 1.0,
  fogDensity: 0.0125,
  // Warm late-morning key from front-left, long-ish shadows falling back-right.
  sunDirection: [-0.6, 0.58, 0.55],
  fillDirection: [0.7, 0.42, -0.58],
  rimDirection: [0.25, 0.3, -0.92],
};

/** Per-phase nudges on top of the art rig (kept gentle so the look holds). */
export const STYLE_ART_NUDGE = {
  planner: { exposure: 0.97, sun: 0.92, hemi: 1.06, saturation: 0.94 },
  story: { exposure: 1.0, sun: 1.0, hemi: 1.0, saturation: 1.0 },
  celebration: { exposure: 1.05, sun: 1.08, hemi: 1.04, saturation: 1.06 },
};
