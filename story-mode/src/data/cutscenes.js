export const CUTSCENES = [
  {
    id: 'chapter-1-intro',
    trigger: 'chapter_start',
    conditions: { chapter: 1 },
    priority: 120,
    once: true,
    skippable: true,
    beats: [
      {
        speaker: 'garden_gurl',
        text: 'This bed fed your family once. Now it is your turn.',
        emotion: 'warm',
        portraitAnim: 'idle',
        camera: 'overview',
        backdropTone: 'dawn',
        duration: null,
        sfx: null,
      },
      {
        speaker: 'garden_gurl',
        text: 'Plant with intention. The season will answer back.',
        emotion: 'emphasis',
        portraitAnim: 'talk',
        camera: 'bed-low-angle',
        backdropTone: null,
        duration: null,
        sfx: null,
      },
    ],
  },
  {
    id: 'chapter-generic-intro',
    trigger: 'chapter_start',
    conditions: {},
    priority: 100,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: 'garden_gurl',
        text: 'A new chapter means a new bed, a new season, and new pressure.',
        emotion: 'warm',
        portraitAnim: 'talk',
        camera: 'overview',
        backdropTone: 'calm',
        duration: null,
        sfx: null,
      },
    ],
  },
  {
    id: 'event-drawn-generic',
    trigger: 'event_drawn',
    conditions: {},
    priority: 70,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: 'garden_gurl',
        text: 'Something just shifted in the bed. Pay attention to the warning.',
        emotion: 'surprised',
        portraitAnim: 'surprised',
        camera: 'event-push',
        backdropTone: 'storm',
        duration: null,
        sfx: null,
      },
      {
        speaker: 'critters',
        text: 'We noticed first. You are simply late to the scene.',
        emotion: 'smirk',
        portraitAnim: 'talk',
        camera: 'row-close',
        backdropTone: null,
        duration: null,
        sfx: null,
      },
    ],
  },
  {
    id: 'harvest-grade-a',
    trigger: 'harvest_complete',
    conditions: { grade: 'A' },
    priority: 80,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: 'garden_gurl',
        text: 'A clean harvest. Nothing wasted, nothing accidental.',
        emotion: 'warm',
        portraitAnim: 'emphasis',
        camera: 'harvest-hero',
        backdropTone: 'harvest-gold',
        duration: 1800,
        sfx: null,
      },
    ],
  },
  {
    id: 'harvest-grade-fallback',
    trigger: 'harvest_complete',
    conditions: {},
    priority: 60,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: 'onion_man',
        text: 'Every harvest tells the truth. Some of them just tell it harder.',
        emotion: 'sad',
        portraitAnim: 'talk',
        camera: 'harvest-hero',
        backdropTone: 'harvest-gold',
        duration: 1800,
        sfx: null,
      },
    ],
  },
  {
    id: 'chapter-complete',
    trigger: 'chapter_complete',
    conditions: {},
    priority: 110,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: 'vegeman',
        text: 'Chapter closed. Keep the momentum. The next season will not wait.',
        emotion: 'smirk',
        portraitAnim: 'emphasis',
        camera: 'front-access',
        backdropTone: 'calm',
        duration: null,
        sfx: null,
      },
    ],
  },
  {
    id: 'campaign-complete',
    trigger: 'campaign_complete',
    conditions: {},
    priority: 250,
    once: true,
    skippable: false,
    beats: [
      {
        speaker: 'garden_gurl',
        text: 'You did it. The bed is full, and the story holds.',
        emotion: 'warm',
        portraitAnim: 'idle',
        camera: 'overview',
        backdropTone: 'celebration',
        duration: null,
        sfx: null,
      },
      {
        speaker: 'narrator',
        text: 'Until next season.',
        emotion: 'neutral',
        portraitAnim: null,
        camera: 'overview',
        backdropTone: null,
        duration: 2400,
        sfx: null,
      },
    ],
  },
];

export function getEligibleCutscenes(triggerPayload, campaign, seenSet) {
  return CUTSCENES.filter((scene) => {
    if (scene.trigger !== triggerPayload.type) return false;
    if (scene.once && seenSet.has(scene.id)) return false;
    return Object.entries(scene.conditions ?? {}).every(([key, value]) => triggerPayload[key] === value);
  });
}

export function getHighestPriorityCutscene(triggerPayload, campaign, seenSet) {
  const eligible = getEligibleCutscenes(triggerPayload, campaign, seenSet);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, scene) => (scene.priority > best.priority ? scene : best));
}
