/**
 * Event Registry — weighted draws from the canonical event deck.
 */
import eventDeck from 'specs/EVENT_DECK.json';

function normalizeAlreadyDrawn(alreadyDrawn) {
  return new Set(Array.isArray(alreadyDrawn) ? alreadyDrawn : []);
}

function isAvailableForChapter(event, chapter) {
  if (!Array.isArray(event.chapterAvailability) || event.chapterAvailability.length === 0) {
    return true;
  }
  return event.chapterAvailability.includes(chapter);
}

function isAvailableForSeason(event, season) {
  if (!event.season) return true;
  return event.season === season;
}

function getMonthlyRestriction(event) {
  if (Array.isArray(event.months) && event.months.length) {
    return event.months;
  }
  const fallbackById = {
    S01: [1],
    U05: [2, 3],
    F01: [3],
    W08: [3],
  };
  return fallbackById[event.id] ?? null;
}

function isAvailableForMonth(event, month) {
  const months = getMonthlyRestriction(event);
  if (!months) return true;
  return months.includes(month);
}

function weightedPick(events) {
  const totalWeight = events.reduce((sum, event) => sum + (event.drawWeight ?? 1), 0);
  if (totalWeight <= 0) {
    return events[Math.floor(Math.random() * events.length)] ?? null;
  }

  let cursor = Math.random() * totalWeight;
  for (const event of events) {
    cursor -= event.drawWeight ?? 1;
    if (cursor <= 0) return event;
  }

  return events[events.length - 1] ?? null;
}

export function drawEvent(season, chapter, alreadyDrawn = []) {
  const drawnIds = normalizeAlreadyDrawn(alreadyDrawn);
  const pool = (eventDeck.events ?? []).filter((event) => {
    return isAvailableForSeason(event, season)
      && isAvailableForChapter(event, chapter)
      && !drawnIds.has(event.id);
  });

  const drawn = weightedPick(pool);
  return drawn ? { ...drawn } : null;
}

export function getMonthlyEvents(season, month, chapter, drawnThisSeason = []) {
  const drawnIds = normalizeAlreadyDrawn(drawnThisSeason);
  return (eventDeck.events ?? [])
    .filter((event) => (
      isAvailableForSeason(event, season)
      && isAvailableForChapter(event, chapter)
      && isAvailableForMonth(event, month)
      && !drawnIds.has(event.id)
    ))
    .sort((a, b) => (b.drawWeight ?? 1) - (a.drawWeight ?? 1))
    .map((event) => ({ ...event }));
}
