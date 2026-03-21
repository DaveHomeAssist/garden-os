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

  // ═══ EVENT REACTIONS — by family ═════════════════════════

  // Weather — negative
  { id: 'event-weather-frost', trigger: 'event_drawn', conditions: { category: 'weather', valence: 'negative', season: 'spring' }, priority: 80, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Frost line is dropping. The tender crops feel it first.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'event-push', backdropTone: 'storm' },
  ]},
  { id: 'event-weather-heat', trigger: 'event_drawn', conditions: { category: 'weather', valence: 'negative', season: 'summer' }, priority: 80, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'This heat is serious. Even I would not plant into this.', emotion: 'surprised', portraitAnim: 'talk', camera: 'event-push', backdropTone: 'heat' },
  ]},
  { id: 'event-weather-storm', trigger: 'event_drawn', conditions: { category: 'weather', valence: 'negative' }, priority: 76, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Weather event. Check which cells are exposed.', emotion: 'neutral', portraitAnim: 'talk', camera: 'event-push', backdropTone: 'storm' },
  ]},

  // Weather — positive
  { id: 'event-weather-positive', trigger: 'event_drawn', conditions: { category: 'weather', valence: 'positive' }, priority: 78, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Rain when you need it. That is the kind of luck you cannot plan for.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'dawn' },
  ]},

  // Pests — negative
  { id: 'event-pest-negative', trigger: 'event_drawn', conditions: { category: 'critter', valence: 'negative' }, priority: 80, once: false, skippable: true, beats: [
    { speaker: 'critters', text: 'Found something. Stems are stressed. This is not our fault. Mostly.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  // Pests — mixed
  { id: 'event-pest-mixed', trigger: 'event_drawn', conditions: { category: 'critter', valence: 'mixed' }, priority: 78, once: false, skippable: true, beats: [
    { speaker: 'critters', text: 'Some of us eat the bad ones. Some of us are the bad ones. Good luck sorting it out.', emotion: 'smirk', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  // Neighbor — positive
  { id: 'event-neighbor-positive', trigger: 'event_drawn', conditions: { category: 'neighbor', valence: 'positive' }, priority: 78, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Neighbors looking out. That is how it works on this block.', emotion: 'warm', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'dawn' },
  ]},

  // Neighbor — negative
  { id: 'event-neighbor-negative', trigger: 'event_drawn', conditions: { category: 'neighbor', valence: 'negative' }, priority: 78, once: false, skippable: true, beats: [
    { speaker: 'critters', text: 'Foot traffic. Not ours this time. The damage is real though.', emotion: 'neutral', portraitAnim: 'talk', camera: 'event-push' },
  ]},

  // Family/memory — neutral
  { id: 'event-memory', trigger: 'event_drawn', conditions: { category: 'family' }, priority: 80, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Something from the old days surfaced. The bed remembers more than you think.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle', backdropTone: 'calm' },
  ]},

  // Phillies — any valence
  { id: 'event-phillies', trigger: 'event_drawn', conditions: { category: 'phillies' }, priority: 78, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Phillies energy in the yard. That changes things, whether you believe it or not.', emotion: 'warm', portraitAnim: 'emphasis', camera: 'bed-low-angle' },
  ]},

  // Infrastructure/soil
  { id: 'event-infrastructure', trigger: 'event_drawn', conditions: { category: 'infrastructure' }, priority: 77, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Structural change in the bed. The soil state just shifted.', emotion: 'neutral', portraitAnim: 'talk', camera: 'overview' },
  ]},
  { id: 'event-soil', trigger: 'event_drawn', conditions: { category: 'soil' }, priority: 77, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Soil condition update. This one carries forward.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  // Generic fallback — only if no family matched. Single line, no mechanic explanation.
  { id: 'event-drawn-fallback', trigger: 'event_drawn', conditions: {}, priority: 65, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'New condition on the bed. Check the event card above the grid.', emotion: 'neutral', portraitAnim: 'talk', camera: 'overview' },
  ]},

  // ═══ INTERVENTION MOMENTS ═════════════════════════════════

  { id: 'intervention-protect', trigger: 'intervention_used', conditions: { intervention: 'protect' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Shielded.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-mulch', trigger: 'intervention_used', conditions: { intervention: 'mulch' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'That mulch will matter in three weeks.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-prune', trigger: 'intervention_used', conditions: { intervention: 'prune' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'Gone. Sometimes the best move is subtraction.', emotion: 'smirk', portraitAnim: 'emphasis', camera: 'row-close' },
  ]},

  { id: 'intervention-swap', trigger: 'intervention_used', conditions: { intervention: 'swap' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Repositioned. The scoring factors just changed.', emotion: 'neutral', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-companion-patch', trigger: 'intervention_used', conditions: { intervention: 'companion_patch' }, priority: 60, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Good neighbors make good gardens.', emotion: 'warm', portraitAnim: 'talk', camera: 'row-close' },
  ]},

  { id: 'intervention-accept', trigger: 'intervention_used', conditions: { intervention: 'accept_loss' }, priority: 55, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Noted.', emotion: 'neutral', portraitAnim: 'talk', camera: 'overview' },
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

  // Season-specific B grades
  { id: 'harvest-grade-b-spring', trigger: 'harvest_complete', conditions: { grade: 'B', season: 'spring' }, priority: 76, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'First season holding. The roots took. That is what spring is for.', emotion: 'warm', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold' },
  ]},
  { id: 'harvest-grade-b-summer', trigger: 'harvest_complete', conditions: { grade: 'B', season: 'summer' }, priority: 76, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'Survived the heat. Not perfect, but nothing burned. I respect that.', emotion: 'warm', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold' },
  ]},
  { id: 'harvest-grade-b-fall', trigger: 'harvest_complete', conditions: { grade: 'B', season: 'fall' }, priority: 76, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Fall harvest. Solid. The pantry gets what the bed promised.', emotion: 'warm', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold' },
  ]},
  // B fallback
  { id: 'harvest-grade-b', trigger: 'harvest_complete', conditions: { grade: 'B' }, priority: 75, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Solid work. Not everything landed, but the bed held together.', emotion: 'warm', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'harvest-gold' },
  ]},

  // Season-specific C grades
  { id: 'harvest-grade-c-spring', trigger: 'harvest_complete', conditions: { grade: 'C', season: 'spring' }, priority: 71, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Spring is forgiving. The next season will not be. Study the factors.', emotion: 'neutral', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'calm' },
  ]},
  { id: 'harvest-grade-c-summer', trigger: 'harvest_complete', conditions: { grade: 'C', season: 'summer' }, priority: 71, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'The heat exposed the weak placements. Sun fit is carrying you or sinking you.', emotion: 'emphasis', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'calm' },
  ]},
  { id: 'harvest-grade-c', trigger: 'harvest_complete', conditions: { grade: 'C' }, priority: 70, once: false, skippable: true, beats: [
    { speaker: 'garden_gurl', text: 'Passing. The scoring factors tell you exactly where it went wrong.', emotion: 'neutral', portraitAnim: 'talk', camera: 'harvest-hero', backdropTone: 'calm' },
  ]},

  { id: 'harvest-grade-d', trigger: 'harvest_complete', conditions: { grade: 'D' }, priority: 70, once: false, skippable: true, beats: [
    { speaker: 'onion_man', text: 'Rough season. Mom had those too. She came back every time.', emotion: 'sad', portraitAnim: 'talk', camera: 'bed-low-angle' },
  ]},

  { id: 'harvest-grade-f', trigger: 'harvest_complete', conditions: { grade: 'F' }, priority: 72, once: false, skippable: true, beats: [
    { speaker: 'vegeman', text: 'That happened. We do not talk about it. We just plant better.', emotion: 'surprised', portraitAnim: 'emphasis', camera: 'harvest-hero', backdropTone: 'loss' },
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
