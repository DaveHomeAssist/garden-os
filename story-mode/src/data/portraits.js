export const PORTRAITS = {
  garden_gurl: {
    id: 'garden_gurl',
    cssOnly: true,
    emoji: '🌿',
    layers: { base: null, body: null, eyes: null, mouth: null, overlay: null },
    emotions: {
      neutral: {},
      warm: {},
      sad: {},
      surprised: {},
      smirk: {},
      emphasis: {},
    },
  },
  onion_man: {
    id: 'onion_man',
    cssOnly: true,
    emoji: '🧅',
    layers: { base: null, body: null, eyes: null, mouth: null, overlay: null },
    emotions: {
      neutral: {},
      warm: {},
      sad: {},
      surprised: {},
      smirk: {},
      emphasis: {},
    },
  },
  vegeman: {
    id: 'vegeman',
    cssOnly: true,
    emoji: '🥬',
    layers: { base: null, body: null, eyes: null, mouth: null, overlay: null },
    emotions: {
      neutral: {},
      warm: {},
      sad: {},
      surprised: {},
      smirk: {},
      emphasis: {},
    },
  },
  critters: {
    id: 'critters',
    cssOnly: true,
    emoji: '🐛',
    layers: { base: null, body: null, eyes: null, mouth: null, overlay: null },
    emotions: {
      neutral: {},
      warm: {},
      sad: {},
      surprised: {},
      smirk: {},
      emphasis: {},
    },
  },
};

export function getPortrait(portraitId) {
  return PORTRAITS[portraitId] ?? null;
}

export function resolvePortraitLayers(portraitId, emotion) {
  const portrait = getPortrait(portraitId);
  if (!portrait) return null;

  const emotionOverride = portrait.emotions[emotion] ?? portrait.emotions.neutral ?? {};
  return {
    ...portrait.layers,
    ...emotionOverride,
    cssOnly: portrait.cssOnly,
    emoji: portrait.emoji,
  };
}
