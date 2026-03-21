export const CUTSCENES = [

  // ═══ CHAPTER INTROS ═══════════════════════════════════════

  { id: 'ch1-intro', trigger: 'chapter_start', conditions: { chapter: 1 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Mom left you the raised bed out back. Eight feet by four, cedar frame, good soil.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn' },
    { speaker: 'garden_gurl', text: 'This bed fed your family once. Now it is your turn.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'onion_man', text: 'I remember when she planted the first tomato here. Felt like opening day.', emotion: 'sad', portraitAnim: 'talk', camera: 'row-close' },
    { speaker: 'garden_gurl', text: 'Start simple. Lettuce, basil, radishes. Learn the light before you push the bed.', emotion: 'emphasis', portraitAnim: 'emphasis', camera: 'overview' },
  ]},

  { id: 'ch2-intro', trigger: 'chapter_start', conditions: { chapter: 2 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Summer. The trellises are up. Mom always said climbers need something to reach for.', emotion: 'neutral', camera: 'overview', backdropTone: 'heat' },
    { speaker: 'vegeman', text: 'POLE BEANS. Let me at them. I will fill every cell.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Support crops need the back row. Check the trellis before you commit.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch3-intro', trigger: 'chapter_start', conditions: { chapter: 3 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Fall. The light changes first. Then the temperature follows.', emotion: 'neutral', camera: 'overview', backdropTone: 'calm' },
    { speaker: 'onion_man', text: 'Carrots and beets. Root work. The stuff you cannot see is doing the most.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Adjacency matters now. Companions lift each other. Conflicts cost more than you think.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch4-intro', trigger: 'chapter_start', conditions: { chapter: 4 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'First winter. The bed goes quiet. No planting this round.', emotion: 'neutral', camera: 'overview', backdropTone: 'night' },
    { speaker: 'onion_man', text: 'Mom used to stand out here in January. Just looking at the soil. I never understood it.', emotion: 'sad', portraitAnim: 'sad', camera: 'bed-low-angle' },
    { speaker: 'garden_gurl', text: 'Rest is part of the cycle. Review what grew. Plan what comes next.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview' },
  ]},

  { id: 'ch5-intro', trigger: 'chapter_start', conditions: { chapter: 5 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Year two. You know the light now — where the shadow falls, which corner stays warm.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn' },
    { speaker: 'garden_gurl', text: 'Broccoli and herbs. The bed is getting serious. Respect the soil fatigue.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch6-intro', trigger: 'chapter_start', conditions: { chapter: 6 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Full sun. The fruiting crops demand everything.', emotion: 'neutral', camera: 'overview', backdropTone: 'heat' },
    { speaker: 'vegeman', text: 'Peppers, tomatoes, eggplant — this is where legends are MADE.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
    { speaker: 'critters', text: 'More fruit means more of us. Just so you know.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch7-intro', trigger: 'chapter_start', conditions: { chapter: 7 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'The climbing season. The trellis is full. Vines tangle in ways you did not plan.', emotion: 'neutral', camera: 'overview', backdropTone: 'calm' },
    { speaker: 'garden_gurl', text: 'Every surface is alive. The bed is teaching you things the notebook never mentioned.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch8-intro', trigger: 'chapter_start', conditions: { chapter: 8 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Preservation. You are thinking ahead now. What to save, what to can.', emotion: 'neutral', camera: 'overview', backdropTone: 'night' },
    { speaker: 'onion_man', text: 'Mom kept a photo of the bed from this time of year. I found it in the kitchen drawer.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'ch9-intro', trigger: 'chapter_start', conditions: { chapter: 9 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'The final spring. Garlic and nasturtiums — the last unlocks.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn' },
    { speaker: 'garden_gurl', text: 'The recipe book is open on the counter. Every cell matters now.', emotion: 'emphasis', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
  ]},

  { id: 'ch10-intro', trigger: 'chapter_start', conditions: { chapter: 10 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Legacy rows. The soil is darker, richer. You rotate without thinking.', emotion: 'neutral', camera: 'overview', backdropTone: 'heat' },
    { speaker: 'onion_man', text: 'The neighbors ask questions now. You sound like your mother when you answer.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'ch11-intro', trigger: 'chapter_start', conditions: { chapter: 11 }, priority: 120, once: true, skippable: true, beats: [
    { speaker: 'narrator', text: 'Cherry tomato, basil, pepper, onion, carrot. Five ingredients, this bed, this soil, this yard.', emotion: 'neutral', camera: 'overview', backdropTone: 'calm' },
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
    { speaker: 'garden_gurl', text: 'A new chapter means a new bed, a new season, and new pressure.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview', backdropTone: 'calm' },
  ]},

  // ═══ EVENT REACTIONS ══════════════════════════════════════

  { id: 'event-drawn-generic', trigger: 'event_drawn', conditions: {}, priority: 70, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Something just shifted in the bed. Pay attention to the warning.', emotion: 'surprised', portraitAnim: 'surprised', camera: 'event-push', backdropTone: 'storm' },
    { speaker: 'critters', text: 'We noticed first. You are simply late to the scene.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'event-positive', trigger: 'event_drawn', conditions: { valence: 'positive' }, priority: 75, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Something good is happening out there. I can feel it.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'dawn' },
  ]},

  { id: 'event-negative', trigger: 'event_drawn', conditions: { valence: 'negative' }, priority: 75, once: false, skippable: true, beats: [
    { speaker: 'critters', text: 'Trouble incoming. We tried to warn you. Actually, no we did not.', emotion: 'smirk', portraitAnim: 'talk', camera: 'event-push', backdropTone: 'storm' },
    { speaker: 'garden_gurl', text: 'Use your intervention wisely. You only get one per beat.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'overview' },
  ]},

  // ═══ INTERVENTION MOMENTS ═════════════════════════════════

  { id: 'intervention-protect', trigger: 'intervention_used', conditions: { intervention: 'protect' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Smart. That cell is shielded for this beat.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-mulch', trigger: 'intervention_used', conditions: { intervention: 'mulch' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Mulch holds the memory of good seasons. It carries forward.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-prune', trigger: 'intervention_used', conditions: { intervention: 'prune' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'Bold move. Sometimes you have to cut to grow.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'row-close' },
  ]},

  { id: 'intervention-accept', trigger: 'intervention_used', conditions: { intervention: 'accept_loss' }, priority: 55, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Accepted. The bed absorbs the hit. Move forward.', emotion: 'neutral', portraitAnim: 'talk', camera: 'overview' },
  ]},

  // ═══ HARVEST REACTIONS ════════════════════════════════════

  { id: 'harvest-grade-a-plus', trigger: 'harvest_complete', conditions: { grade: 'A+' }, priority: 90, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Perfect execution. The bed gave everything it had and you respected every inch of it.', emotion: 'warm', portraitAnim: 'emphasis', camera: 'harvest-hero', backdropTone: 'celebration' },
    { speaker: 'onion_man', text: 'She would have cried. The good kind.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle' },
    { speaker: 'vegeman', text: 'I TOLD you to plant more. And somehow it WORKED.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'overview' },
  ]},

  { id: 'harvest-grade-a', trigger: 'harvest_complete', conditions: { grade: 'A' }, priority: 80, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'A clean harvest. Nothing wasted, nothing accidental.', emotion: 'warm', portraitAnim: 'emphasis', camera: 'harvest-hero', backdropTone: 'harvest-gold', duration: 1800 },
  ]},

  { id: 'harvest-grade-b', trigger: 'harvest_complete', conditions: { grade: 'B' }, priority: 75, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Solid work. Not everything landed, but the bed held together.', emotion: 'warm', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold' },
  ]},

  { id: 'harvest-grade-c', trigger: 'harvest_complete', conditions: { grade: 'C' }, priority: 70, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Passing, but barely. The scoring factors tell the story. Study them.', emotion: 'neutral', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'calm' },
  ]},

  { id: 'harvest-grade-d', trigger: 'harvest_complete', conditions: { grade: 'D' }, priority: 70, once: false, skippable: true, beats: [
    { speaker: 'critters', text: 'That was... educational. For everyone.', emotion: 'smirk', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'loss' },
    { speaker: 'onion_man', text: 'Bad seasons teach more than good ones. Mom said that after the drought of 2019.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'harvest-grade-f', trigger: 'harvest_complete', conditions: { grade: 'F' }, priority: 72, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'Okay. That happened. We do NOT talk about it. We just plant better next time.', emotion: 'surprised', portraitAnim: 'emphasis', camera: 'harvest-hero', backdropTone: 'loss' },
    { speaker: 'garden_gurl', text: 'Check your sun fit and season alignment. Those two factors carry the most weight.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'overview' },
  ]},

  // Fallback harvest
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
    { speaker: 'garden_gurl', text: 'Companion match detected. Those two crops boost each other. That is +0.5 adjacency.', emotion: 'warm', portraitAnim: 'emphasis', camera: 'row-close' },
    { speaker: 'onion_man', text: 'Mom always planted basil next to tomatoes. Said they were friends.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'first-conflict', trigger: 'placement_conflict_found', conditions: {}, priority: 85, once: true, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Conflict detected. Those two crops penalize each other. Check your adjacency score.', emotion: 'surprised', portraitAnim: 'surprised', camera: 'row-close' },
    { speaker: 'critters', text: 'We love a messy garden. More conflict means more chaos. More chaos means more of us.', emotion: 'smirk', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'first-trellis-use', trigger: 'placement_trellis_correct', conditions: {}, priority: 85, once: true, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Climber on the trellis row. Support factor is maxed. Well done.', emotion: 'warm', portraitAnim: 'emphasis', camera: 'row-close' },
  ]},

  { id: 'full-bed', trigger: 'bed_full', conditions: {}, priority: 80, once: true, skippable: true, beats: [
    { speaker: 'vegeman', text: 'EVERY CELL PLANTED. That is what I am TALKING about!', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'overview', backdropTone: 'celebration' },
    { speaker: 'garden_gurl', text: 'Full bed. Watch your fill ratio — diversity matters more than density.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  // ═══ RECIPE MOMENTS ═══════════════════════════════════════

  { id: 'recipe-first-unlock', trigger: 'recipe_unlocked', conditions: {}, priority: 90, once: true, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Your first recipe. The pantry remembers what the bed produced.', emotion: 'warm', portraitAnim: 'talk', camera: 'overview', backdropTone: 'harvest-gold' },
    { speaker: 'garden_gurl', text: 'Recipes give a scoring bonus. Keep growing the right ingredients.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'bed-low-angle' },
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
    { speaker: 'narrator', text: 'The garden stays.', emotion: 'neutral', camera: 'overview', backdropTone: 'dawn', duration: 3000 },
  ]},
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
