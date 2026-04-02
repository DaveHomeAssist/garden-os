import { explainFactor } from '../scoring/score-explain.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellLabel(index) {
  const row = Math.floor(index / 8) + 1;
  const col = (index % 8) + 1;
  return `R${row} · C${col}`;
}

function seasonLabel(season) {
  return season ? season.charAt(0).toUpperCase() + season.slice(1) : 'Season';
}

function fatigueTone(fatigue) {
  if (fatigue >= 60) return 'bad';
  if (fatigue >= 30) return 'warn';
  return 'good';
}

function renderSoilCells(cells) {
  return cells.map((cell) => {
    const fatigue = Math.round((cell.soilFatigue ?? 0) * 100);
    const carry = cell.carryForward?.label ?? 'No carry-forward effect';
    const tone = fatigueTone(fatigue);
    return `
      <article class="winter-review__soil-card" data-tone="${tone}">
        <div class="winter-review__soil-top">
          <span class="winter-review__mini-label">${escapeHtml(cellLabel(cell.index))}</span>
          <span class="winter-review__soil-fatigue">FT ${fatigue}%</span>
        </div>
        <div class="winter-review__soil-carry">${escapeHtml(carry)}</div>
      </article>
    `;
  }).join('');
}

function renderEventList(events) {
  if (!events.length) {
    return '<div class="winter-review__empty-note">Quiet season. No events recorded.</div>';
  }
  return `
    <div class="winter-review__event-list">
      ${events.map((eventTitle) => `<div class="winter-review__event-item">${escapeHtml(eventTitle)}</div>`).join('')}
    </div>
  `;
}

function renderReviewCells(cells, tone) {
  if (!cells.length) {
    return '<div class="winter-review__empty-note">No planted cells recorded.</div>';
  }

  return cells.map((cell) => {
    let worstFactor = null;
    let worstVal = Infinity;
    if (cell.factors) {
      for (const [key, val] of Object.entries(cell.factors)) {
        const threshold = key === 'adjacency' ? 0 : 2.5;
        if (val < threshold && val < worstVal) {
          worstVal = val;
          worstFactor = key;
        }
      }
    }

    const tip = worstFactor ? explainFactor(worstFactor, worstVal) : null;
    const fatigue = Math.round((cell.soilFatigue ?? 0) * 100);

    return `
      <article class="winter-review__review-card" data-tone="${tone}">
        <div class="winter-review__review-top">
          <div>
            <div class="winter-review__review-crop">${escapeHtml(cell.cropName)}</div>
            <div class="winter-review__mini-label">${escapeHtml(cellLabel(cell.cellIndex))}</div>
          </div>
          <div class="winter-review__review-score">
            <div class="winter-review__review-total">${cell.total.toFixed(1)}</div>
            <div class="winter-review__review-soil">soil ${fatigue}%</div>
          </div>
        </div>
        ${tip?.tip ? `<div class="winter-review__review-tip">Tip: ${escapeHtml(tip.tip)}</div>` : ''}
      </article>
    `;
  }).join('');
}

function renderYearEntries(entries) {
  return entries.map((entry) => `
    <article class="winter-review__entry" data-grade="${escapeHtml(entry.grade)}">
      <div class="winter-review__entry-top">
        <span class="winter-review__mini-label">${escapeHtml(seasonLabel(entry.season))}</span>
        <span class="winter-review__entry-grade">${escapeHtml(entry.grade)}</span>
      </div>
      <div class="winter-review__entry-score">${escapeHtml(entry.score)}</div>
      <div class="winter-review__entry-meta">${entry.eventsEncountered.length} events · ${entry.cropsPlanted.length} crops</div>
    </article>
  `).join('');
}

export function showWinterReview(container, data, handlers = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'winter-review winter-review-overlay';

  overlay.innerHTML = `
    <div class="winter-review__shell">
      <header class="winter-review__header">
        <div class="winter-review__eyebrow">Winter Review</div>
        <h2 class="winter-review__title">Year ${escapeHtml(data.year)} in the bed</h2>
        <p class="winter-review__dek">
          Review the last year, inspect tired soil, read carry-forward effects, and leave winter with a cleaner spring plan.
        </p>
      </header>

      <div class="winter-review__body">
        <section class="winter-review__entry-grid">
          ${renderYearEntries(data.yearEntries)}
        </section>

        <div class="winter-review__two-up">
          <section class="winter-review__panel">
            <div class="winter-review__section-label">Soil + Carry Forward</div>
            <div class="winter-review__soil-grid">
              ${renderSoilCells(data.soilCells)}
            </div>
          </section>

          <section class="winter-review__panel winter-review__panel--summary" data-grade="${escapeHtml(data.lastReview.grade ?? 'F')}">
            <div class="winter-review__section-label">Last Harvest</div>
            <div class="winter-review__summary-row">
              <div class="winter-review__summary-score">${escapeHtml(data.lastReview.score ?? '--')}</div>
              <div class="winter-review__summary-grade">${escapeHtml(data.lastReview.grade ?? '–')}</div>
            </div>
            <div class="winter-review__summary-meta">
              ${data.lastReview.eventsEncountered.length} events · ${data.lastReview.yieldList.length} harvested crops
            </div>

            <div class="winter-review__summary-block">
              <div class="winter-review__section-label">Recipes + Keepsakes</div>
              <div class="winter-review__summary-copy">
                ${escapeHtml(data.recipesCompleted)} / ${escapeHtml(data.totalRecipes)} recipes complete<br />
                ${escapeHtml(data.keepsakesUnlocked)} / ${escapeHtml(data.totalKeepsakes)} keepsakes found
              </div>
            </div>

            <div class="winter-review__summary-block">
              <div class="winter-review__section-label">Season Events</div>
              ${renderEventList(data.lastReview.eventsEncountered)}
            </div>
          </section>
        </div>

        <div class="winter-review__review-grid">
          <section class="winter-review__panel winter-review__panel--spotlight" data-tone="good">
            <div class="winter-review__section-label">Strongest Cells</div>
            <div class="winter-review__card-stack">${renderReviewCells(data.lastReview.bestCells, 'good')}</div>
          </section>

          <section class="winter-review__panel winter-review__panel--spotlight" data-tone="bad">
            <div class="winter-review__section-label">Weakest Cells</div>
            <div class="winter-review__card-stack">${renderReviewCells(data.lastReview.worstCells, 'bad')}</div>
          </section>
        </div>

        <section class="winter-review__panel winter-review__panel--hints">
          <div class="winter-review__section-label">Next Spring Hints</div>
          <div class="winter-review__hint-list">
            ${data.hints.map((hint) => `<div class="winter-review__hint-item">${escapeHtml(hint)}</div>`).join('')}
          </div>
        </section>
      </div>

      <footer class="winter-review__footer">
        <div class="winter-review__footer-copy">
          Winter is review-only. When you continue, the game rolls into the next chapter with this soil and carry-forward state in mind.
        </div>
        <div class="winter-review__actions">
          ${handlers.onViewBackpack ? `
            <button type="button" id="winter-review-backpack" class="winter-review__button winter-review__button--secondary">
              Open Backpack
            </button>
          ` : ''}
          <button type="button" id="winter-review-continue" class="winter-review__button winter-review__button--primary">
            Continue
          </button>
        </div>
      </footer>
    </div>
  `;

  overlay.querySelector('#winter-review-backpack')?.addEventListener('click', () => {
    handlers.onViewBackpack?.();
  });

  overlay.querySelector('#winter-review-continue')?.addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.25s ease-in both';
    setTimeout(() => {
      overlay.remove();
      handlers.onContinue?.();
    }, 220);
  });

  container.appendChild(overlay);
}
