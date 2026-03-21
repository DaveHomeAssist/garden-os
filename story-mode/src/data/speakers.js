export const SPEAKERS = {
  garden_gurl: {
    id: 'garden_gurl',
    displayName: 'Garden GURL',
    portraitId: 'garden_gurl',
    defaultEmotion: 'warm',
    defaultAnim: 'idle',
    side: 'left',
    emoji: '🌿',
  },
  onion_man: {
    id: 'onion_man',
    displayName: 'Onion Man',
    portraitId: 'onion_man',
    defaultEmotion: 'sad',
    defaultAnim: 'idle',
    side: 'right',
    emoji: '🧅',
  },
  vegeman: {
    id: 'vegeman',
    displayName: 'Vegeman',
    portraitId: 'vegeman',
    defaultEmotion: 'smirk',
    defaultAnim: 'idle',
    side: 'left',
    emoji: '🥬',
  },
  critters: {
    id: 'critters',
    displayName: 'Critters',
    portraitId: 'critters',
    defaultEmotion: 'surprised',
    defaultAnim: 'idle',
    side: 'right',
    emoji: '🐛',
  },
  narrator: {
    id: 'narrator',
    displayName: '',
    portraitId: null,
    defaultEmotion: 'neutral',
    defaultAnim: null,
    side: null,
    emoji: '',
  },
};

export function getSpeaker(speakerId) {
  return SPEAKERS[speakerId] ?? {
    id: speakerId,
    displayName: speakerId,
    portraitId: null,
    defaultEmotion: 'neutral',
    defaultAnim: 'idle',
    side: 'left',
    emoji: '',
  };
}
