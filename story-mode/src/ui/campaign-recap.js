/**
 * Campaign recap: the screen shown after the ending scene once Chapter 12 is done.
 * Pure data builder + HTML renderer so it can be unit tested without the scene.
 */
import { getRecipeById } from '../data/crops.js';

const SEASON_NAMES = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'F'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function buildCampaignRecap(campaign = {}) {
  // One entry per chapter (the last one recorded wins if a chapter was replayed).
  const byChapter = new Map();
  for (const entry of campaign.seasonHistory ?? []) {
    if (!Number.isInteger(entry?.chapter) || entry.chapter < 1 || entry.chapter > 12) continue;
    byChapter.set(entry.chapter, entry);
  }
  const years = [1, 2, 3].map((year) => ({
    year,
    seasons: [1, 2, 3, 4].map((offset) => {
      const chapter = (year - 1) * 4 + offset;
      const entry = byChapter.get(chapter);
      const season = entry?.season ?? ['spring', 'summer', 'fall', 'winter'][offset - 1];
      const reviewOnly = season === 'winter';
      return {
        chapter,
        season,
        seasonLabel: SEASON_NAMES[season] ?? season,
        reviewOnly,
        grade: reviewOnly ? null : (entry?.grade ?? null),
        score: reviewOnly ? null : (Number.isFinite(entry?.score) ? entry.score : null),
      };
    }),
  }));
  const graded = years.flatMap((y) => y.seasons).filter((s) => s.grade);
  const best = graded.reduce((top, s) => (!top || (s.score ?? 0) > (top.score ?? 0) ? s : top), null);
  const recipes = [...new Set(campaign.recipesCompleted ?? [])].map((id) => getRecipeById(id)?.name ?? id);
  const questsCompleted = Object.values(campaign.questLog ?? {}).filter((q) => q?.state === 'COMPLETED').length;
  const gradeCounts = Object.fromEntries(GRADE_ORDER.map((g) => [g, graded.filter((s) => s.grade === g).length]));
  return {
    chaptersComplete: Math.min(12, new Set([...(campaign.completedChapters ?? [])].filter((c) => c >= 1 && c <= 12)).size),
    seasonsGrown: graded.length,
    years,
    best,
    gradeCounts,
    recipes,
    questsCompleted,
  };
}

export function renderCampaignRecapHTML(recap) {
  const yearRows = recap.years.map((year) => `
      <div class="campaign-recap__year">
        <div class="campaign-recap__year-label">Year ${year.year}</div>
        <div class="campaign-recap__seasons">
          ${year.seasons.map((s) => `
            <div class="campaign-recap__season${s.reviewOnly ? ' is-review' : ''}" data-chapter="${s.chapter}">
              <span class="campaign-recap__season-name">${escapeHtml(s.seasonLabel)}</span>
              <span class="campaign-recap__grade">${s.reviewOnly ? 'Review' : escapeHtml(s.grade ?? '–')}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
  const best = recap.best
    ? `Best season: ${escapeHtml(recap.best.seasonLabel)}, Chapter ${recap.best.chapter} (${escapeHtml(recap.best.grade)}, ${recap.best.score}).`
    : '';
  const recipes = recap.recipes.length
    ? `Recipes made: ${recap.recipes.map(escapeHtml).join(', ')}.`
    : 'No full recipes came out of the bed this time.';
  const quests = recap.questsCompleted === 1 ? '1 neighbor request finished.' : `${recap.questsCompleted} neighbor requests finished.`;
  return `
    <div class="chapter-num">Three years in the bed</div>
    <h2>The Garden Stays</h2>
    <p>${recap.chaptersComplete} chapters, ${recap.seasonsGrown} growing seasons. ${best}</p>
    <div class="campaign-recap__grid">${yearRows}</div>
    <p class="campaign-recap__notes">${recipes} ${quests}</p>
    <div class="start-choice-actions">
      <button type="button" class="start-choice-btn start-choice-btn--primary" id="btn-endgame-keep">Keep gardening</button>
      <button type="button" class="start-choice-btn" id="btn-endgame-menu">Main menu</button>
    </div>
    <div class="tap-hint">Keep gardening turns this save into Free Play: every crop unlocked, no chapters.</div>
  `;
}
