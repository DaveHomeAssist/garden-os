/**
 * Chapter Text — narrative titles and intro text for all 12 chapters.
 */
import { resolvePlayerText } from '../data/player-profile.js';

const CHAPTERS = {
  1: {
    title: "Back to the Bed",
    narrative: "{returningGardener} is back in the raised bed out back. Eight feet by four, cedar frame, good soil. The screen door still creaks the same way. The radio's on inside. Start with what you know: lettuce, basil, radishes. Keep it simple. Keep it alive.",
  },
  2: {
    title: "First Shoots",
    narrative: "Spring came fast this year. The trellises are up because climbers need something to reach for. Pole beans and peas are in the packet drawer. The neighborhood cat is already interested.",
  },
  3: {
    title: "Root Work",
    narrative: "Summer heat bakes the soil by noon. You learned to water early. Carrots, beets, onions — roots hold steady when the surface burns. The score is climbing. You're starting to understand what the bed wants.",
  },
  4: {
    title: "Winter Rest",
    narrative: "First frost painted the kale silver. The bed goes quiet. No planting this round, just review. Read what grew, what did not, and what the soil is telling you to change.",
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
    narrative: "Cabbage, kohlrabi — the brassicas arrive for the cool-down. You're thinking ahead now. What to save, what to can, what to freeze. The pantry is filling. {recipeLabel} is three ingredients away.",
  },
  9: {
    title: "The Final Harvest",
    narrative: "Garlic and nasturtiums — the last unlocks. The bed has given you everything it knows. Now it's about execution. Every cell matters. The recipe book is open on the kitchen counter.",
  },
  10: {
    title: "Legacy Rows",
    narrative: "The bed looks different now. Soil darker, richer. You rotate without thinking. The neighbors ask questions. You answer like somebody who knows this yard by feel.",
  },
  11: {
    title: "Sauce Season",
    narrative: "Cherry tomato, basil, pepper, onion, carrot. Five ingredients, grown in this bed, in this soil, in this yard. The sauce simmers on the stove. The house smells the way it's supposed to.",
  },
  12: {
    title: "The Garden Stays",
    narrative: "Three years. Twelve seasons. You returned to a raised bed and built something that keeps going. The cedar will need replacing soon. That's okay. The soil remembers. The garden stays.",
  },
};

export function getChapterTitle(chapter) {
  if (chapter === 99) return 'Free Play';
  return CHAPTERS[chapter]?.title || `Chapter ${chapter}`;
}

export function getChapterNarrative(chapter, campaign) {
  if (chapter === 99) return 'All crops unlocked. No gates, no pressure. Just the bed and the soil.';
  return resolvePlayerText(CHAPTERS[chapter]?.narrative || "A new season begins.", campaign);
}
