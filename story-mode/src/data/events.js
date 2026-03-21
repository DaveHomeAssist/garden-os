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

