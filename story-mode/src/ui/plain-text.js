/**
 * Plain-language player text: the "Current objective" banner and season event
 * effects. Replaces developer strings such as "Zone: Your Garden · Paths 1/1"
 * and "-2 · current_beat".
 */

const ROW_NAMES = { 'row-0': 'the back row', 'row-1': 'row 1', 'row-2': 'row 2', 'row-3': 'the front row' };
const GROUP_NAMES = {
  herbs: 'herbs',
  greens: 'leafy greens',
  brassicas: 'cabbage-family crops',
  fruiting: 'fruiting crops',
  climbers: 'climbers',
  roots: 'root crops',
  companions: 'companion flowers',
  fast_cycles: 'fast growers',
};
const FILTER_NAMES = {
  'water >= 3': 'thirsty crops',
  empty_cells: 'empty squares',
  planted: 'planted squares',
  cherry_tom: 'cherry tomatoes',
};
const DURATION_TEXT = {
  current_beat: 'this step only',
  rest_of_season: 'for the rest of the season',
  carry_forward: 'and it carries into next season',
};

function describeTarget(target = {}) {
  const filter = String(target.filter ?? '');
  const cap = Number.isInteger(target.maxCells) && target.maxCells > 0 ? target.maxCells : null;
  let subject;
  switch (target.type) {
    case 'row': subject = ROW_NAMES[filter] ?? 'one row'; break;
    case 'column': {
      const n = Number(filter.replace('col-', ''));
      subject = n === 0 ? 'the left-most column' : n === 7 ? 'the right-most column' : Number.isFinite(n) ? `column ${n + 1}` : 'one column';
      break;
    }
    case 'zone': subject = filter === 'full_bed' ? 'the whole bed' : 'part of the bed'; break;
    case 'faction': subject = GROUP_NAMES[filter] ?? filter.replace(/_/g, ' '); break;
    case 'crop_filter': subject = FILTER_NAMES[filter] ?? `${filter.replace(/[-_]/g, ' ')} crops`; break;
    case 'random_cells': {
      const where = ROW_NAMES[filter] ? ` in ${ROW_NAMES[filter]}` : '';
      return cap ? `up to ${cap} random crop${cap === 1 ? '' : 's'}${where}` : `random crops${where}`;
    }
    default: subject = 'some crops';
  }
  return cap ? `up to ${cap} ${subject.replace(/^the /, '')}` : subject;
}

export function describeEventEffect(effect) {
  if (!effect) return '';
  const modifier = Number(effect.modifier) || 0;
  const target = describeTarget(effect.target);
  const when = DURATION_TEXT[effect.duration] ?? 'this step';
  if (modifier === 0) return `No direct score change; affects ${target} ${when}.`;
  const size = Math.abs(modifier) >= 1.5 ? 'Big' : Math.abs(modifier) >= 0.75 ? 'Moderate' : 'Small';
  const kind = modifier < 0 ? 'hit to' : 'boost to';
  return `${size} ${kind} ${target}, ${when}.`;
}

/**
 * Text for the centred "Current objective" banner.
 * @returns {string} empty string when the banner should hide
 */
export function buildObjectiveText({
  phase,
  season,
  sandbox = false,
  planted = 0,
  minPlanted = 8,
  winterReviewSeen = false,
  zoneId = 'player_plot',
  zoneName = 'your garden',
  forageAvailable = 0,
  nextPhaseLabel = null,
} = {}) {
  const atHome = !zoneId || zoneId === 'player_plot';
  if (phase === 'PLANNING') {
    if (season === 'winter') {
      return winterReviewSeen
        ? 'Winter review done. Press Continue to start the next chapter.'
        : 'Winter: look back on the year, then press Continue.';
    }
    if (!atHome) {
      const forage = forageAvailable > 0 ? ` ${forageAvailable} foraging spot${forageAvailable === 1 ? '' : 's'} here.` : '';
      return `You're in ${zoneName}. Talk to neighbors with E.${forage} Head home to plant.`;
    }
    if (sandbox) return 'Free Play: plant anything you like, then press Start Season.';
    if (planted === 0) return `Press Plant, pick a crop, then tap squares in the bed. Plant at least ${minPlanted}, then press Start Season.`;
    if (planted < minPlanted) return `Plant at least ${minPlanted} crops (${planted}/${minPlanted}), then press Start Season.`;
    return 'Bed is ready. Plant more if you like, or press Start Season.';
  }
  if (phase === 'EARLY_SEASON' || phase === 'MID_SEASON' || phase === 'LATE_SEASON') {
    return nextPhaseLabel ? `The season is growing. Press Next for ${nextPhaseLabel}.` : 'The season is growing. Press Next to move on.';
  }
  if (phase === 'TRANSITION') return 'Season complete. Press Continue for the next chapter.';
  return '';
}
