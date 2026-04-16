/**
 * Harvest Reveal — animated score breakdown overlay.
 * Shows final score, grade, per-factor breakdown, and plain-English explanations.
 */
import { explainFactor, bedHints } from '../scoring/score-explain.js';

const FACTOR_LABELS = {
  sunFit: { label: 'Sun Fit', emoji: '☀️', weight: '2x' },
  supportFit: { label: 'Support', emoji: '🪴', weight: '1x' },
  shadeFit: { label: 'Shade', emoji: '🌤️', weight: '1x' },
  accessFit: { label: 'Access', emoji: '🚶', weight: '1x' },
  seasonFit: { label: 'Season', emoji: '📅', weight: '1x' },
  adjacency: { label: 'Adjacency', emoji: '🤝', weight: '±' },
};

const GRADE_COLORS = {
  'A+': '#e8c84a',
  'A': '#5aab6b',
  'B': '#4a9aba',
  'C': '#dda855',
  'D': '#d48a4a',
  'F': '#d44a2a',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function factorTone(pct) {
  if (pct > 70) return 'good';
  if (pct > 40) return 'warn';
  return 'bad';
}

function buildAdjustments(result) {
  const items = [];
  if (result.details.diversityBonus > 0) {
    items.push({
      tone: 'good',
      label: `+${result.details.diversityBonus.toFixed(1)}`,
      copy: 'diversity bonus',
    });
  }
  if (result.details.recipeBonus > 0) {
    items.push({
      tone: 'warn',
      label: `+${result.details.recipeBonus.toFixed(1)}`,
      copy: 'recipe bonus',
    });
  }
  if (result.details.fillPenalty > 0) {
    items.push({
      tone: 'bad',
      label: `-${result.details.fillPenalty.toFixed(1)}`,
      copy: 'fill penalty',
    });
  }
  return items;
}

export function showHarvestReveal(container, result, extras = {}, onDismiss) {
  const overlay = document.createElement('div');
  overlay.className = 'harvest-reveal harvest-reveal-overlay';

  const gradeColor = GRADE_COLORS[result.grade] || '#f7f2ea';
  const keepsakes = extras.keepsakes ?? [];
  const recipeNames = extras.recipeNames ?? [];
  const unlockedCount = extras.unlockedCount ?? 0;
  const totalKeepsakes = extras.totalKeepsakes ?? unlockedCount;
  const onViewBackpack = extras.onViewBackpack ?? null;
  const adjustments = buildAdjustments(result);

  const factorAvgs = {};
  let scoredCount = 0;
  for (const cell of result.cellScores) {
    if (!cell) continue;
    scoredCount++;
    for (const [key, val] of Object.entries(cell.factors)) {
      factorAvgs[key] = (factorAvgs[key] || 0) + val;
    }
  }
  for (const key of Object.keys(factorAvgs)) {
    factorAvgs[key] = scoredCount > 0 ? factorAvgs[key] / scoredCount : 0;
  }

  overlay.innerHTML = `
    <div class="harvest-reveal__sheet" data-grade="${escapeHtml(result.grade)}">
      <header class="harvest-reveal__hero">
        <div class="harvest-reveal__intro">
          <div class="harvest-reveal__eyebrow">Harvest Complete</div>
          <h2 class="harvest-reveal__title">The bed told the truth.</h2>
          <p class="harvest-reveal__dek">
            Read the score, inspect the weak factors, and carry the useful lessons into the next season.
          </p>
          <div id="grade-badge" class="harvest-reveal__grade-badge">${escapeHtml(result.grade)}</div>
        </div>

        <div class="harvest-score-ring" style="--harvest-grade:${gradeColor};">
          <div id="score-counter" class="harvest-reveal__score">0</div>
          <div class="harvest-reveal__score-max">/ 100</div>
        </div>
      </header>

      <div class="harvest-reveal__body">
        <section class="harvest-reveal__panel harvest-reveal__panel--factors">
          <div class="harvest-reveal__section-label">Scoring Factors</div>
          <div class="harvest-reveal__factor-list">
            ${Object.entries(FACTOR_LABELS).map(([key, info], factorIdx) => {
              const val = factorAvgs[key] || 0;
              const maxVal = key === 'adjacency' ? 2 : 5;
              const minVal = key === 'adjacency' ? -2 : 0;
              const pct = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
              const tone = factorTone(pct);
              const barColor = pct > 70 ? '#5aab6b' : pct > 40 ? '#e8c84a' : '#d44a2a';
              const explanation = explainFactor(key, val);
              return `
                <div class="factor-row" data-factor="${key}" data-tone="${tone}" style="--factor-delay:${factorIdx * 100}ms;--factor-accent:${barColor};">
                  <span class="factor-row__icon">${info.emoji}</span>
                  <div class="factor-row__main">
                    <div class="factor-row__top">
                      <span class="factor-row__label">${info.label}</span>
                      <span class="factor-row__value">${val.toFixed(1)} <span class="factor-row__weight">${info.weight}</span></span>
                    </div>
                    <div class="factor-bar">
                      <div class="factor-bar-fill" data-target="${pct}"></div>
                    </div>
                    ${explanation ? `
                      <div class="factor-explain">
                        <div class="factor-explain__verdict">${escapeHtml(explanation.verdict)}</div>
                        ${explanation.tip ? `<div class="factor-explain__tip">Tip: ${escapeHtml(explanation.tip)}</div>` : ''}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <div class="harvest-reveal__columns">
          <div class="harvest-reveal__column">
            <section class="harvest-reveal__metric-grid">
              <article class="harvest-reveal__metric-card">
                <div class="harvest-reveal__metric-label">Planted</div>
                <div class="harvest-reveal__metric-value">${escapeHtml(result.occupiedCount)}</div>
              </article>
              <article class="harvest-reveal__metric-card">
                <div class="harvest-reveal__metric-label">Variety</div>
                <div class="harvest-reveal__metric-value">${escapeHtml(result.details.uniqueCrops)}</div>
              </article>
              <article class="harvest-reveal__metric-card">
                <div class="harvest-reveal__metric-label">Fill</div>
                <div class="harvest-reveal__metric-value">${Math.round(result.details.fillRatio * 100)}%</div>
              </article>
            </section>

            ${adjustments.length ? `
              <section class="harvest-reveal__panel">
                <div class="harvest-reveal__section-label">Season Adjustments</div>
                <div class="harvest-reveal__adjustment-list">
                  ${adjustments.map((item) => `
                    <div class="harvest-reveal__adjustment" data-tone="${item.tone}">
                      <span class="harvest-reveal__adjustment-label">${escapeHtml(item.label)}</span>
                      <span class="harvest-reveal__adjustment-copy">${escapeHtml(item.copy)}</span>
                    </div>
                  `).join('')}
                </div>
              </section>
            ` : ''}

            <section class="harvest-reveal__panel">
              <div class="harvest-reveal__section-label">How to Improve</div>
              <div class="harvest-reveal__hint-list">
                ${bedHints(result).map((hint) => `<div class="harvest-reveal__hint-item">${escapeHtml(hint)}</div>`).join('')}
              </div>
            </section>
          </div>

          <div class="harvest-reveal__column">
            ${recipeNames.length ? `
              <section class="harvest-reveal__panel">
                <div class="harvest-reveal__section-label">Recipe Matches</div>
                <div class="harvest-reveal__tag-list">
                  ${recipeNames.map((name) => `<span class="harvest-reveal__tag">${escapeHtml(name)}</span>`).join('')}
                </div>
              </section>
            ` : ''}

            <section class="harvest-reveal__panel">
              <div class="harvest-reveal__panel-head">
                <div class="harvest-reveal__section-label">Keepsakes</div>
                <div class="harvest-reveal__meta-count">${escapeHtml(unlockedCount)} / ${escapeHtml(totalKeepsakes)}</div>
              </div>
              ${keepsakes.length ? `
                <div class="harvest-reveal__keepsake-list">
                  ${keepsakes.map((keepsake) => `
                    <div class="harvest-reveal__keepsake">
                      <span class="harvest-reveal__keepsake-name">${escapeHtml(keepsake.name)}</span>
                      <span class="harvest-reveal__keepsake-badge">New</span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="harvest-reveal__empty-note">No new keepsakes this chapter.</div>
              `}
            </section>
          </div>
        </div>
      </div>

      <footer class="harvest-reveal__footer">
        <div class="harvest-reveal__footer-copy">
          ${result.grade === 'A+' || result.grade === 'A'
            ? 'Strong season. Keep the structure, and do not waste the momentum.'
            : 'Use the breakdown to fix the weak side of the bed before the next planning pass.'}
        </div>
        <div class="harvest-reveal__actions">
          ${onViewBackpack && (keepsakes.length > 0 || recipeNames.length > 0) ? `
            <button id="harvest-backpack" class="harvest-reveal__button harvest-reveal__button--secondary">View Backpack</button>
          ` : ''}
          <button id="harvest-continue" class="harvest-reveal__button harvest-reveal__button--primary">Continue</button>
        </div>
      </footer>
    </div>
  `;

  const counterEl = overlay.querySelector('#score-counter');
  const gradeBadge = overlay.querySelector('#grade-badge');
  let count = 0;
  const target = result.score;
  const duration = 1200;
  const startTime = performance.now();

  function animateCounter(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    count = Math.round(eased * target);
    counterEl.textContent = String(count);
    if (progress < 1) {
      requestAnimationFrame(animateCounter);
    } else if (gradeBadge) {
      gradeBadge.classList.add('is-visible');
    }
  }
  requestAnimationFrame(animateCounter);

  requestAnimationFrame(() => {
    overlay.querySelectorAll('.factor-row').forEach((row) => {
      row.classList.add('is-visible');
    });
    overlay.querySelectorAll('.factor-bar-fill').forEach((bar) => {
      bar.style.width = `${bar.dataset.target ?? 0}%`;
    });
  });

  overlay.querySelectorAll('.factor-row[data-factor]').forEach((row) => {
    row.addEventListener('click', () => {
      const explainEl = row.querySelector('.factor-explain');
      if (!explainEl) return;
      const isOpen = explainEl.classList.contains('is-open');
      overlay.querySelectorAll('.factor-explain').forEach((el) => el.classList.remove('is-open'));
      if (!isOpen) explainEl.classList.add('is-open');
    });
  });

  overlay.querySelector('#harvest-backpack')?.addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.3s ease-in both';
    setTimeout(() => {
      overlay.remove();
      onViewBackpack?.();
      onDismiss?.();
    }, 300);
  });

  overlay.querySelector('#harvest-continue')?.addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.3s ease-in both';
    setTimeout(() => {
      overlay.remove();
      onDismiss?.();
    }, 300);
  });

  container.appendChild(overlay);
}
