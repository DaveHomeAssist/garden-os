const MARKET_SCHEDULE = [
  { zoneId: 'market_square', traderId: 'lila', seasons: ['spring', 'summer', 'fall'], days: [1, 3, 5] },
  { zoneId: 'market_square', traderId: 'old_gus', seasons: ['spring', 'fall'], days: [2, 4] },
  { zoneId: 'market_square', traderId: 'maya', seasons: ['summer', 'winter'], days: [1, 6] },
  { zoneId: 'festival_grounds', traderId: 'festival_steward', seasons: ['spring', 'summer', 'fall', 'winter'], days: [7] },
];

function getCampaignDay(state = {}) {
  const chapter = Number(state.campaign?.currentChapter ?? 1);
  const seasonIndex = Math.max(0, ['spring', 'summer', 'fall', 'winter'].indexOf(state.season?.season ?? state.campaign?.currentSeason ?? 'spring'));
  return ((chapter - 1) * 4) + seasonIndex + 1;
}

export function getScheduledTraders({ zoneId = 'market_square', season = 'spring', campaignDay = 1 } = {}) {
  const daySlot = ((Number(campaignDay ?? 1) - 1) % 7) + 1;
  return MARKET_SCHEDULE.filter((entry) => (
    entry.zoneId === zoneId
    && entry.seasons.includes(season)
    && entry.days.includes(daySlot)
  )).map((entry) => entry.traderId);
}

export function getScheduledTradersForState(state, zoneId = 'market_square') {
  return getScheduledTraders({
    zoneId,
    season: state?.season?.season ?? state?.campaign?.currentSeason ?? 'spring',
    campaignDay: getCampaignDay(state),
  });
}

export { MARKET_SCHEDULE, getCampaignDay };
