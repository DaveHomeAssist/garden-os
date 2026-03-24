/**
 * Score Explain — plain-English explanations for each scoring factor.
 * Bridges the gap between raw numbers and player understanding.
 * Used by harvest-reveal.js and winter-review.js to surface
 * contextual tips alongside factor bars.
 */

const FACTOR_EXPLAIN = {
  sunFit: {
    label: 'Sun Fit',
    emoji: '☀️',
    weight: '2×',
    what: 'How well this crop\'s sun needs match your bed\'s light.',
    good: 'This crop is getting the sun it wants.',
    mid: 'Decent light, but this crop could use a bit more.',
    bad: 'Not enough sun for this crop — consider moving it or choosing a shade-tolerant variety.',
    improve: 'Move sun-hungry crops to the sunniest rows, or swap in shade-tolerant crops for darker spots.',
  },
  supportFit: {
    label: 'Support',
    emoji: '🪴',
    weight: '1×',
    what: 'Whether climbers and viners have a trellis to grow on.',
    good: 'Trellis is in place — vining crops are happy.',
    mid: 'This crop doesn\'t need support, so this factor is neutral.',
    bad: 'This crop needs a trellis but doesn\'t have one. Big penalty.',
    improve: 'Place crops that need support in the back row where the trellis is.',
  },
  shadeFit: {
    label: 'Shade',
    emoji: '🌤️',
    weight: '1×',
    what: 'How well this crop tolerates shade when light is low.',
    good: 'Good shade tolerance — holds up even in low light.',
    mid: 'Average shade tolerance.',
    bad: 'This crop struggles in shade — it really needs direct sun.',
    improve: 'Shade-sensitive crops belong in the brightest positions.',
  },
  accessFit: {
    label: 'Access',
    emoji: '🚶',
    weight: '1×',
    what: 'Whether tall crops block access to shorter ones behind them.',
    good: 'Good layout — nothing is blocked.',
    mid: 'Passable, but the arrangement could be tighter.',
    bad: 'Tall crops in front are blocking access to crops behind them.',
    improve: 'Keep tall crops in the back row so you can reach everything.',
  },
  seasonFit: {
    label: 'Season',
    emoji: '📅',
    weight: '1×',
    what: 'Whether this crop belongs in the current season.',
    good: 'Perfect season for this crop.',
    mid: 'This crop can grow now, but it\'s not its peak season.',
    bad: 'Wrong season — this crop is struggling.',
    improve: 'Plant cool-season crops in spring/fall and warm-season crops in summer.',
  },
  adjacency: {
    label: 'Adjacency',
    emoji: '🤝',
    weight: '±',
    what: 'Bonus or penalty from neighboring crops (companions vs. conflicts).',
    good: 'Great neighbors — companion planting bonus.',
    mid: 'Neutral neighbors.',
    bad: 'Bad neighbors — conflicting crops are hurting each other.',
    improve: 'Check companion/conflict lists and separate enemies.',
  },
};

/**
 * Get a plain-English explanation for a single factor value.
 * @param {string} factorKey - e.g. 'sunFit', 'adjacency'
 * @param {number} value - the raw factor score
 * @returns {{ label, emoji, weight, what, verdict, tip }}
 */
export function explainFactor(factorKey, value) {
  const info = FACTOR_EXPLAIN[factorKey];
  if (!info) return null;

  let verdict, tip;
  if (factorKey === 'adjacency') {
    if (value > 0.5) { verdict = info.good; tip = null; }
    else if (value >= -0.3) { verdict = info.mid; tip = info.improve; }
    else { verdict = info.bad; tip = info.improve; }
  } else {
    if (value >= 4.0) { verdict = info.good; tip = null; }
    else if (value >= 2.5) { verdict = info.mid; tip = info.improve; }
    else { verdict = info.bad; tip = info.improve; }
  }

  return {
    label: info.label,
    emoji: info.emoji,
    weight: info.weight,
    what: info.what,
    verdict,
    tip,
  };
}

/**
 * Generate a full score breakdown with explanations for all factors.
 * @param {Object} factors - { sunFit, supportFit, shadeFit, accessFit, seasonFit, adjacency }
 * @returns {Array<{ key, label, emoji, weight, value, what, verdict, tip }>}
 */
export function explainAllFactors(factors) {
  return Object.entries(factors).map(([key, value]) => {
    const explanation = explainFactor(key, value);
    return explanation ? { key, value, ...explanation } : null;
  }).filter(Boolean);
}

/**
 * Generate bed-level improvement hints from a bed score result.
 * @param {Object} bedResult - from scoreBed()
 * @returns {string[]} array of plain-English hints
 */
export function bedHints(bedResult) {
  const hints = [];
  const d = bedResult.details;

  if (d.fillRatio < 0.6) {
    hints.push('Fill more of the bed — empty cells drag your score down.');
  }
  if (d.uniqueCrops < 3) {
    hints.push('Plant more variety — at least 3 different crops earns a diversity bonus.');
  }
  if (d.tallPenalty < 0) {
    hints.push('Too many tall crop types — stick to one tall variety per bed.');
  }
  if (d.trellisPenalty < 0) {
    hints.push('Multiple trellis crops compete for support — one vining type is enough.');
  }
  if (d.fillPenalty > 0.8) {
    hints.push('The bed is mostly empty — even a few more crops will help a lot.');
  }
  if (d.cellAvg < 4) {
    hints.push('Individual crop placements are scoring low — check sun, season, and neighbor fits.');
  }

  if (hints.length === 0) {
    hints.push('Strong layout. Keep experimenting with companion combos for even higher scores.');
  }

  return hints;
}

export { FACTOR_EXPLAIN };
