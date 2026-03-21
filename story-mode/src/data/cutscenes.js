import { getRecipeById } from './crops.js';

export const CUTSCENES = [

  // ═══ CHAPTER INTROS ═══════════════════════════════════════

  { id: 'ch1-intro', trigger: 'chapter_start', conditions: { chapter: 1 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Mom left you the raised bed out back. Eight feet by four, cedar frame, good soil.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'dawn', sceneCue: 'sheepdog-bed', cueDuration: 1800, cueFromX: 0.15, cueFromZ: 0.34 },
    { speaker: 'garden_gurl', text: 'CALVIN. Out of the bed. Now.', emotion: 'surprised', portraitAnim: 'emphasis', camera: 'chapter-intro', duration: 1800, sceneCue: 'sheepdog-run', cueDuration: 3400, cueFromX: 0.15, cueToX: 2.9, cueFromZ: 0.34, cueToZ: 0.96, cueArcHeight: 0.06, cueSway: 0.05 },
    { speaker: 'calvin', text: '...dirt is warm.', emotion: 'neutral', portraitAnim: 'talk', camera: 'row-close', duration: 1200 },
    { speaker: 'onion_man', text: 'He does that every spring. Mom never stopped him either.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
    { speaker: 'garden_gurl', text: 'This bed fed your family once. Now it is your turn.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Start simple. Lettuce, basil, radishes. Learn the light before you push the bed.', emotion: 'emphasis', portraitAnim: 'emphasis', camera: 'overview' },
  ]},

  { id: 'ch2-intro', trigger: 'chapter_start', conditions: { chapter: 2 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Summer. The trellises are up. Mom always said climbers need something to reach for.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'heat', sceneCue: 'sheepdog-run' },
    { speaker: 'vegeman', text: 'POLE BEANS. Let me at them. I will fill every cell.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Support crops need the back row. Check the trellis before you commit.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch3-intro', trigger: 'chapter_start', conditions: { chapter: 3 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Fall. The light changes first. Then the temperature follows.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'calm', sceneCue: 'sheepdog-run' },
    { speaker: 'onion_man', text: 'Carrots and beets. Root work. The stuff you cannot see is doing the most.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Adjacency matters now. Companions lift each other. Conflicts cost more than you think.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch4-intro', trigger: 'chapter_start', conditions: { chapter: 4 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'First winter. The bed goes quiet. No planting this round.', emotion: 'neutral', camera: 'overview', backdropTone: 'night' },
    { speaker: 'onion_man', text: 'Mom used to stand out here in January. Just looking at the soil. I never understood it.', emotion: 'sad', portraitAnim: 'sad', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Rest is part of the cycle. Review what grew. Plan what comes next.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview' },
  ]},

  { id: 'ch5-intro', trigger: 'chapter_start', conditions: { chapter: 5 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Year two. You know the light now — where the shadow falls, which corner stays warm.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'dawn', sceneCue: 'sheepdog-run' },
    { speaker: 'garden_gurl', text: 'Broccoli and herbs. The bed is getting serious. Respect the soil fatigue.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch6-intro', trigger: 'chapter_start', conditions: { chapter: 6 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Full sun. The fruiting crops demand everything.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'heat', sceneCue: 'sheepdog-run' },
    { speaker: 'vegeman', text: 'Peppers, tomatoes, eggplant — this is where legends are MADE.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
    { speaker: 'critters', text: 'More fruit means more of us. Just so you know.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch7-intro', trigger: 'chapter_start', conditions: { chapter: 7 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'The climbing season. The trellis is full. Vines tangle in ways you did not plan.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'calm', sceneCue: 'sheepdog-run' },
    { speaker: 'garden_gurl', text: 'Every surface is alive. The bed is teaching you things the notebook never mentioned.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch8-intro', trigger: 'chapter_start', conditions: { chapter: 8 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Preservation. You are thinking ahead now. What to save, what to can.', emotion: 'neutral', camera: 'overview', backdropTone: 'night' },
    { speaker: 'onion_man', text: 'Mom kept a photo of the bed from this time of year. I found it in the kitchen drawer.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch9-intro', trigger: 'chapter_start', conditions: { chapter: 9 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'The final spring. Garlic and nasturtiums — the last unlocks.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'dawn', sceneCue: 'sheepdog-run' },
    { speaker: 'garden_gurl', text: 'The recipe book is open on the counter. Every cell matters now.', emotion: 'emphasis', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
  ]},

  { id: 'ch10-intro', trigger: 'chapter_start', conditions: { chapter: 10 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Legacy rows. The soil is darker, richer. You rotate without thinking.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'heat', sceneCue: 'sheepdog-run' },
    { speaker: 'onion_man', text: 'The neighbors ask questions now. You sound like your mother when you answer.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch11-intro', trigger: 'chapter_start', conditions: { chapter: 11 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Cherry tomato, basil, pepper, onion, carrot. Five ingredients, this bed, this soil, this yard.', emotion: 'neutral', camera: 'chapter-intro', backdropTone: 'calm', sceneCue: 'sheepdog-run' },
    { speaker: 'onion_man', text: 'The sauce simmers on the stove. The house smells the way it is supposed to.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'harvest-gold' },
    { speaker: 'garden_gurl', text: 'This is what the bed was always for. Finish what she started.', emotion: 'emphasis', portraitAnim: 'emphasis', camera: 'overview' },
  ]},

  { id: 'ch12-intro', trigger: 'chapter_start', conditions: { chapter: 12 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Three years. Twelve seasons. The cedar will need replacing soon. That is okay.', emotion: 'neutral', camera: 'overview', backdropTone: 'night' },
    { speaker: 'garden_gurl', text: 'The soil remembers every crop you placed. Every choice you made. The garden stays.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'onion_man', text: 'She would have liked what you did with the place.', emotion: 'sad', portraitAnim: 'sad', camera: 'overview', backdropTone: 'dawn' },
  ]},

  // Fallback for chapters without specific intros
  { id: 'chapter-generic-intro', trigger: 'chapter_start', conditions: {}, priority: 100, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'A new chapter means a new bed, a new season, and new pressure.', emotion: 'warm', portraitAnim: 'talk', camera: 'chapter-intro', backdropTone: 'calm', sceneCue: 'sheepdog-run' },
  ]},

  // ═══ EVENT REACTIONS — by family ═════════════════════════

  // Generic fallback — only if the deck does not provide commentary.
  { id: 'event-drawn-fallback', trigger: 'event_drawn', conditions: {}, priority: 65, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'New condition on the bed. Check the event card above the grid.', emotion: 'neutral', portraitAnim: 'talk', camera: 'overview' },
  ]},

  // ═══ CALVIN THOUGHT BUBBLES ══════════════════════════════

  // Calvin notices critters before anyone else
  { id: 'calvin-pest-alert', trigger: 'event_drawn', conditions: { eventCategory: 'critter' }, priority: 68, once: false, skippable: true, beats: [
    { speaker: 'calvin', text: '...something moving under the leaves.', emotion: 'neutral', portraitAnim: 'talk', camera: 'row-close', duration: 1000 },
  ]},

  // Calvin during cat events — rivalry
  { id: 'calvin-cat-rival', trigger: 'event_drawn', conditions: { eventCategory: 'critter', eventTitle: 'Alley Cat Patrol' }, priority: 72, once: false, skippable: true, beats: [
    { speaker: 'calvin', text: '...that cat again. my yard.', emotion: 'surprised', portraitAnim: 'emphasis', camera: 'front-access', duration: 1000 },
  ]},

  // Calvin reacts to good harvest — food
  { id: 'calvin-harvest-good', trigger: 'harvest_complete', conditions: { grade: 'A+' }, priority: 62, once: false, skippable: true, beats: [
    { speaker: 'calvin', text: '...tomatoes. soon.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close', duration: 900 },
  ]},

  // Calvin in rain — doesn't like it
  { id: 'calvin-rain', trigger: 'event_drawn', conditions: { eventCategory: 'weather', eventValence: 'positive' }, priority: 67, once: true, skippable: true, beats: [
    { speaker: 'calvin', text: '...wet. going inside.', emotion: 'neutral', portraitAnim: 'talk', camera: 'front-access', duration: 900 },
  ]},

  // ═══ INTERVENTION MOMENTS ═════════════════════════════════

  { id: 'intervention-fallback', trigger: 'intervention_used', conditions: {}, priority: 55, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Intervention recorded. The bed will answer with the next scoring pass.', emotion: 'neutral', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  // ═══ HARVEST REACTIONS ════════════════════════════════════

  { id: 'harvest-fallback', trigger: 'harvest_complete', conditions: {}, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Every harvest tells the truth. Some of them just tell it harder.', emotion: 'sad', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold', duration: 1800 },
  ]},

  // ═══ CHAPTER COMPLETE ═════════════════════════════════════

  { id: 'ch4-complete-winter', trigger: 'chapter_complete', conditions: { chapter: 4 }, priority: 115, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Year one is done. The bed rests under frost. You will be back.', emotion: 'neutral', camera: 'overview', backdropTone: 'night', duration: 2000 },
    { speaker: 'onion_man', text: 'First year in the books. The soil knows you now.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch8-complete-year2', trigger: 'chapter_complete', conditions: { chapter: 8 }, priority: 115, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Two years down. The garden is not a project anymore. It is a practice.', emotion: 'neutral', camera: 'overview', backdropTone: 'night', duration: 2000 },
    { speaker: 'garden_gurl', text: 'You understand rotation now. You feel the adjacency before you check the numbers.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  // Generic chapter complete
  { id: 'chapter-complete', trigger: 'chapter_complete', conditions: {}, priority: 110, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'Chapter closed. Keep the momentum. The next season will not wait.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'front-access', backdropTone: 'calm' },
  ]},

  // ═══ FIRST-TIME MILESTONES ════════════════════════════════

  { id: 'first-companion-bonus', trigger: 'placement_companion_found', conditions: {}, priority: 85, once: true, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Mom always planted basil next to tomatoes. Said they were friends.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'first-conflict', trigger: 'placement_conflict_found', conditions: {}, priority: 85, once: true, skippable: true, beats: [
    { speaker: 'critters', text: 'Those two do not get along. We can tell from here.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'first-trellis-use', trigger: 'placement_trellis_correct', conditions: {}, priority: 85, once: true, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Wire row. That crop has something to climb. Good.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'full-bed', trigger: 'bed_full', conditions: {}, priority: 80, once: true, skippable: true, beats: [
    { speaker: 'vegeman', text: 'EVERY CELL PLANTED. That is what I am TALKING about!', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'overview', backdropTone: 'celebration' },
  ]},

  // ═══ RECIPE MOMENTS ═══════════════════════════════════════

  { id: 'recipe-first-unlock', trigger: 'recipe_unlocked', conditions: {}, priority: 90, once: true, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Your first recipe. The pantry remembers what the bed produced.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview', backdropTone: 'harvest-gold' },
  ]},

  { id: 'recipe-moms-sauce', trigger: 'recipe_unlocked', conditions: { recipeId: 'moms_sauce' }, priority: 95, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Cherry tomato, basil, pepper, onion, carrot. All from this bed. All from this soil.', emotion: 'neutral', camera: 'overview', backdropTone: 'harvest-gold' },
    { speaker: 'onion_man', text: 'That is Mom is recipe. You grew every ingredient yourself. She would be proud.', emotion: 'sad', portraitAnim: 'sad', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'The garden gave you what you needed. That is how it works.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview', backdropTone: 'celebration' },
  ]},

  // ═══ CAMPAIGN COMPLETE ════════════════════════════════════

  { id: 'campaign-complete', trigger: 'campaign_complete', conditions: {}, priority: 250, once: true, skippable: false, beats: [
    { speaker: 'narrator', text: 'Three years. Twelve seasons. You inherited a raised bed and built something that keeps going.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn', duration: 3000 },
    { speaker: 'garden_gurl', text: 'You did it. The bed is full, and the story holds.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'celebration' },
    { speaker: 'onion_man', text: 'The cedar will need replacing soon. That is okay. The soil remembers.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
    { speaker: 'vegeman', text: 'I still say you should have planted more tomatoes. But fine. FINE. It was beautiful.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'overview' },
    { speaker: 'critters', text: 'We were here the whole time. We will be here after you leave.', emotion: 'neutral', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'calvin', text: '...good yard.', emotion: 'warm', portraitAnim: 'talk', camera: 'front-access', duration: 1200, sceneCue: 'sheepdog-run', cueDuration: 2000 },
    { speaker: 'narrator', text: 'The garden stays.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn', duration: 3000 },
  ]},
];

const COMMENTARY_KEY_TO_SPEAKER = {
  gurl: 'garden_gurl',
  onion: 'onion_man',
  vegeman: 'vegeman',
  critters: 'critters',
};

function oxfordJoin(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildReactiveBeat({
  speaker,
  text,
  camera = 'overview',
  backdropTone = 'calm',
  emotion,
  duration,
}) {
  return {
    speaker,
    text,
    emotion: emotion ?? (speaker === 'critters' ? 'smirk' : speaker === 'onion_man' ? 'warm' : speaker === 'vegeman' ? 'smirk' : 'emphasis'),
    portraitAnim: 'talk',
    camera,
    backdropTone,
    ...(duration != null ? { duration } : {}),
  };
}

function buildEventBeat(speaker, text, triggerPayload, index) {
  const negative = triggerPayload.eventValence === 'negative';
  const mixed = triggerPayload.eventValence === 'mixed';
  const positive = triggerPayload.eventValence === 'positive';
  const season = triggerPayload.season;
  const category = triggerPayload.eventCategory;

  let camera = 'overview';
  let backdropTone = 'calm';

  if (speaker === 'critters') camera = 'event-push';
  else if (speaker === 'onion_man') camera = 'bed-low-angle';
  else if (speaker === 'vegeman') camera = 'front-access';
  else if (speaker === 'garden_gurl') camera = index === 0 ? 'event-push' : 'overview';

  if (negative || mixed) backdropTone = 'storm';
  else if (positive) backdropTone = season === 'summer' ? 'heat' : 'dawn';

  if (category === 'neighbor' || category === 'family') backdropTone = season === 'winter' ? 'night' : 'calm';
  if (category === 'infrastructure') backdropTone = season === 'winter' ? 'night' : 'calm';
  if (positive && triggerPayload.eventSeverity === 'high') backdropTone = 'celebration';

  return {
    speaker,
    text,
    emotion: speaker === 'critters' ? 'smirk' : speaker === 'vegeman' ? 'smirk' : speaker === 'onion_man' ? 'warm' : 'emphasis',
    portraitAnim: speaker === 'garden_gurl' ? 'talk' : 'talk',
    camera,
    backdropTone,
  };
}

function pickEventSpeakers(triggerPayload) {
  const season = triggerPayload.season;
  const category = triggerPayload.eventCategory;
  const valence = triggerPayload.eventValence;
  const carryForward = Boolean(triggerPayload.eventCarryForward);

  if (category === 'critter') {
    if (valence === 'negative' || valence === 'mixed') return ['critters', season === 'summer' ? 'vegeman' : 'garden_gurl'];
    return ['critters'];
  }

  if (category === 'weather') {
    if (season === 'summer') return valence === 'negative' ? ['garden_gurl', 'vegeman'] : ['vegeman', 'onion_man'];
    if (season === 'fall') return ['onion_man', 'garden_gurl'];
    if (season === 'winter') return carryForward ? ['onion_man', 'garden_gurl'] : ['onion_man'];
    return valence === 'positive' ? ['onion_man'] : ['garden_gurl', 'onion_man'];
  }

  if (category === 'neighbor') {
    if (season === 'winter') return ['onion_man'];
    if (season === 'summer' && valence === 'positive') return ['vegeman', 'onion_man'];
    return valence === 'negative' ? ['onion_man', 'garden_gurl'] : ['onion_man'];
  }

  if (category === 'family') {
    return season === 'winter' ? ['onion_man', 'garden_gurl'] : ['onion_man'];
  }

  if (category === 'infrastructure') {
    if (season === 'summer') return ['vegeman', 'garden_gurl'];
    return season === 'winter' ? ['garden_gurl', 'onion_man'] : ['garden_gurl'];
  }

  // Fallback by valence — Vegeman gets summer/positive energy
  if (valence === 'positive' && season === 'summer') return ['vegeman'];
  if (valence === 'negative') return ['garden_gurl'];
  if (valence === 'positive') return ['onion_man'];
  return ['garden_gurl'];
}

function buildDynamicEventCutscene(triggerPayload) {
  if (triggerPayload?.type !== 'event_drawn') return null;
  const commentary = triggerPayload.eventCommentary;
  if (!commentary || typeof commentary !== 'object') return null;

  const speakerOrder = pickEventSpeakers(triggerPayload);
  const beats = speakerOrder
    .map((speakerId, index) => {
      const commentaryKey = Object.entries(COMMENTARY_KEY_TO_SPEAKER).find(([, mapped]) => mapped === speakerId)?.[0];
      const text = commentary?.[commentaryKey];
      if (!text) return null;
      return buildEventBeat(speakerId, text, triggerPayload, index);
    })
    .filter(Boolean);

  if (beats.length === 0) return null;

  return {
    id: `dynamic-event-${triggerPayload.eventId}`,
    trigger: 'event_drawn',
    priority: 200,
    once: false,
    skippable: true,
    beats,
  };
}

function pickInterventionSpeakers(triggerPayload) {
  const { intervention, season, eventCategory, eventValence } = triggerPayload;

  if (intervention === 'protect') {
    if (eventCategory === 'critter') return ['critters', 'garden_gurl'];
    if (season === 'winter') return ['onion_man', 'garden_gurl'];
    return ['garden_gurl'];
  }

  if (intervention === 'mulch') {
    return season === 'summer' ? ['garden_gurl', 'vegeman'] : ['onion_man'];
  }

  if (intervention === 'swap') {
    return season === 'summer' ? ['vegeman', 'garden_gurl'] : ['garden_gurl'];
  }

  if (intervention === 'prune') {
    return season === 'fall' ? ['onion_man', 'garden_gurl'] : ['vegeman'];
  }

  if (intervention === 'companion_patch') {
    return season === 'spring' || season === 'fall' ? ['onion_man'] : ['garden_gurl'];
  }

  if (intervention === 'accept_loss') {
    return eventValence === 'negative' ? ['critters', 'garden_gurl'] : ['garden_gurl'];
  }

  return ['garden_gurl'];
}

function buildInterventionText(speaker, triggerPayload) {
  const cropText = oxfordJoin(triggerPayload.targetCropNames) || 'that cell';
  const targetText = triggerPayload.targetSummary || cropText;

  if (triggerPayload.intervention === 'protect') {
    if (speaker === 'critters') return `You covered ${cropText}. Fine. We saw that.`;
    if (speaker === 'onion_man') return `Protected ${cropText}. Sometimes one clean save is enough to steady the whole bed.`;
    return `${cropText} is covered. ${targetText} gets a cleaner shot at this beat now.`;
  }

  if (triggerPayload.intervention === 'mulch') {
    if (speaker === 'vegeman') return `Good. ${cropText} gets a little cushion and a little patience.`;
    if (speaker === 'garden_gurl') return `Mulch applied to ${targetText}. You are banking on the soil holding more of the season.`;
    return `Mulch on ${cropText}. That kind of move matters later, which is why it matters now.`;
  }

  if (triggerPayload.intervention === 'swap') {
    if (speaker === 'vegeman') return `${targetText} just changed the angle of the whole beat. That is a real move.`;
    return `Repositioned. The bed only cares about the layout in front of it now, not the one you started with.`;
  }

  if (triggerPayload.intervention === 'prune') {
    if (speaker === 'onion_man') return `You let ${cropText} go so the rest of the bed could keep moving. That is part of gardening too.`;
    if (speaker === 'garden_gurl') return `Pruned. One hard subtraction is better than a whole row dragged downward.`;
    return `Gone. Better one decisive cut than pretending ${cropText} was still helping.`;
  }

  if (triggerPayload.intervention === 'companion_patch') {
    if (speaker === 'onion_man') return `${cropText} has company now. The bed usually rewards that kind of cooperation.`;
    return `Patch placed on ${targetText}. You turned adjacency into part of the answer.`;
  }

  if (triggerPayload.intervention === 'accept_loss') {
    if (speaker === 'critters') return 'You let it land. Honest, if nothing else.';
    return 'Accepted. The consequence belongs to this beat now.';
  }

  return 'Intervention logged.';
}

function buildDynamicInterventionCutscene(triggerPayload) {
  if (triggerPayload?.type !== 'intervention_used') return null;

  const speakers = pickInterventionSpeakers(triggerPayload);
  const beats = speakers.map((speaker, index) => buildReactiveBeat({
    speaker,
    text: buildInterventionText(speaker, triggerPayload),
    camera: speaker === 'vegeman' ? 'front-access' : speaker === 'onion_man' ? 'bed-low-angle' : 'row-close',
    backdropTone: triggerPayload.eventValence === 'negative' ? 'storm' : triggerPayload.season === 'summer' ? 'heat' : 'calm',
    emotion: speaker === 'garden_gurl' && index === 0 ? 'neutral' : undefined,
  }));

  return {
    id: `dynamic-intervention-${triggerPayload.intervention}-${triggerPayload.season}`,
    trigger: 'intervention_used',
    priority: 190,
    once: false,
    skippable: true,
    beats,
  };
}

function pickHarvestSpeakers(triggerPayload) {
  if (triggerPayload.recipeMatches?.includes('moms_sauce')) return ['onion_man', 'garden_gurl'];
  if (triggerPayload.grade === 'A+') return ['garden_gurl', 'onion_man'];
  if (triggerPayload.grade === 'A') return triggerPayload.season === 'summer' ? ['vegeman', 'garden_gurl'] : ['garden_gurl'];
  if (triggerPayload.grade === 'B') return triggerPayload.season === 'summer' ? ['vegeman'] : ['onion_man'];
  if (triggerPayload.grade === 'C') return ['garden_gurl'];
  if (triggerPayload.grade === 'D') return ['onion_man'];
  if (triggerPayload.grade === 'F') return ['vegeman', 'garden_gurl'];
  return (triggerPayload.recipeMatches?.length ?? 0) > 0 ? ['onion_man'] : ['garden_gurl'];
}

function buildHarvestText(speaker, triggerPayload) {
  const recipeNames = (triggerPayload.recipeMatches ?? [])
    .map((recipeId) => getRecipeById(recipeId)?.name ?? recipeId)
    .filter(Boolean);
  const recipeText = oxfordJoin(recipeNames);
  const yieldCount = triggerPayload.yieldCount ?? 0;

  if (triggerPayload.recipeMatches?.includes('moms_sauce')) {
    if (speaker === 'onion_man') return `That is Mom's sauce on the table. ${yieldCount} good pulls out of the bed, and the right five among them.`;
    return 'Three years of practice turned into dinner. That is what this whole bed was built to do.';
  }

  if (recipeNames.length > 0) {
    if (speaker === 'onion_man') return `${yieldCount} good things out of the bed, and now ${recipeText} is real. That is pantry work, not theory.`;
    if (speaker === 'garden_gurl') return `Harvest converted into recipe progress. Useful output. No sentiment required.`;
  }

  if (triggerPayload.grade === 'A+') {
    if (speaker === 'onion_man') return 'That one would have made the whole house stop and look.';
    return `A+ harvest. ${yieldCount} useful pulls and no wasted structure anywhere in the bed.`;
  }

  if (triggerPayload.grade === 'A') {
    if (speaker === 'vegeman') return `That is a real summer harvest. Loud, heavy, and somehow still under control.`;
    return `Clean harvest. ${yieldCount} solid pulls, and none of them feel accidental.`;
  }

  if (triggerPayload.grade === 'B') {
    if (speaker === 'vegeman') return `Not perfect, but the bed stayed in the fight. Summer counts that as a win.`;
    return `Solid season. ${yieldCount} things for the pantry and enough proof that the plan held.`;
  }

  if (triggerPayload.grade === 'C') {
    return triggerPayload.season === 'summer'
      ? 'Passing, but the heat found every weak placement you left exposed.'
      : 'Passing. The bed told you exactly where the soft spots were.';
  }

  if (triggerPayload.grade === 'D') {
    return `Rough season. Still, ${yieldCount} things came in, and rough seasons are part of the record too.`;
  }

  if (triggerPayload.grade === 'F') {
    if (speaker === 'vegeman') return 'Bad beat. Bad harvest. Plant again and do not romanticize it.';
    return 'Failure logged. The next season starts when you are ready to read what went wrong.';
  }

  return 'The harvest is in. The bed told the truth again.';
}

function buildDynamicHarvestCutscene(triggerPayload) {
  if (triggerPayload?.type !== 'harvest_complete') return null;

  const speakers = pickHarvestSpeakers(triggerPayload);
  const lossGrade = triggerPayload.grade === 'D' || triggerPayload.grade === 'F';
  const beats = speakers.map((speaker, index) => buildReactiveBeat({
    speaker,
    text: buildHarvestText(speaker, triggerPayload),
    camera: index === 0 ? 'harvest-hero' : speaker === 'onion_man' ? 'bed-low-angle' : 'overview',
    backdropTone: triggerPayload.recipeMatches?.includes('moms_sauce')
      ? 'celebration'
      : lossGrade
        ? 'loss'
        : 'harvest-gold',
    duration: speakers.length === 1 ? 1800 : undefined,
  }));

  return {
    id: `dynamic-harvest-${triggerPayload.grade}-${triggerPayload.season}`,
    trigger: 'harvest_complete',
    priority: 195,
    once: false,
    skippable: true,
    beats,
  };
}

export function getEligibleCutscenes(triggerPayload, campaign, seenSet) {
  return CUTSCENES.filter((scene) => {
    if (scene.trigger !== triggerPayload.type) return false;
    if (scene.once && seenSet.has(scene.id)) return false;
    return Object.entries(scene.conditions ?? {}).every(([key, value]) => triggerPayload[key] === value);
  });
}

export function getHighestPriorityCutscene(triggerPayload, campaign, seenSet) {
  const dynamicScene = buildDynamicEventCutscene(triggerPayload)
    ?? buildDynamicInterventionCutscene(triggerPayload)
    ?? buildDynamicHarvestCutscene(triggerPayload);
  if (dynamicScene) return dynamicScene;
  const eligible = getEligibleCutscenes(triggerPayload, campaign, seenSet);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, scene) => (scene.priority > best.priority ? scene : best));
}
