/**
 * Chapter Text — narrative titles and intro text for all 12 chapters.
 */

const CHAPTERS = {
  1: {
    title: "The Backyard Inheritance",
    narrative: "Mom left you the raised bed out back. Eight feet by four, cedar frame, good soil. The screen door still creaks the same way. The radio's on inside. Start with what you know — lettuce, basil, radishes. Keep it simple. Keep it alive.",
  },
  2: {
    title: "First Shoots",
    narrative: "Spring came fast this year. The trellises are up — Mom always said climbers need something to reach for. Pole beans and peas are in the packet drawer. The neighborhood cat is already interested.",
  },
  3: {
    title: "Root Work",
    narrative: "Summer heat bakes the soil by noon. You learned to water early. Carrots, beets, onions — roots hold steady when the surface burns. The score is climbing. You're starting to understand what the bed wants.",
  },
  4: {
    title: "Winter Rest",
    narrative: "First frost painted the kale silver. The bed goes quiet. No planting this round — just memory. Review what grew, what didn't, what the soil remembers. Mom's notebook is still on the shelf.",
  },
  5: {
    title: "The Second Spring",
    narrative: "Year two. You know the light now — where the shadow falls at 3 PM, which corner stays warm longest. Broccoli, dill, new herbs. The bed is filling in like a sentence finding its rhythm.",
  },
  6: {
    title: "Full Sun",
    narrative: "Peppers, tomatoes, eggplant — the fruiting crops demand everything. Full sun, deep water, no shade. The bed is loud with color. The Phillies are on the radio. Broad Street feels close.",
  },
  7: {
    title: "The Climbing Season",
    narrative: "The trellis is full. Cucumbers reach across, vines tangle in ways you didn't plan. Every surface is alive. The bed is teaching you things the notebook never mentioned.",
  },
  8: {
    title: "Preservation",
    narrative: "Cabbage, kohlrabi — the brassicas arrive for the cool-down. You're thinking ahead now. What to save, what to can, what to freeze. The pantry is filling. Mom's recipe is three ingredients away.",
  },
  9: {
    title: "The Final Harvest",
    narrative: "Garlic and nasturtiums — the last unlocks. The bed has given you everything it knows. Now it's about execution. Every cell matters. The recipe book is open on the kitchen counter.",
  },
  10: {
    title: "Legacy Rows",
    narrative: "The bed looks different now. Soil darker, richer. You rotate without thinking. The neighbors ask questions. You sound like your mother when you answer.",
  },
  11: {
    title: "Mom's Recipe",
    narrative: "Cherry tomato, basil, pepper, onion, carrot. Five ingredients, grown in this bed, in this soil, in this yard. The sauce simmers on the stove. The house smells the way it's supposed to.",
  },
  12: {
    title: "The Garden Stays",
    narrative: "Three years. Twelve seasons. You inherited a raised bed and built something that keeps going. The cedar will need replacing soon. That's okay. The soil remembers. The garden stays.",
  },
};

export function getChapterTitle(chapter) {
  return CHAPTERS[chapter]?.title || `Chapter ${chapter}`;
}

export function getChapterNarrative(chapter) {
  return CHAPTERS[chapter]?.narrative || "A new season begins.";
}
