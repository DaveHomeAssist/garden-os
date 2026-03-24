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

export function showHarvestReveal(container, result, extras = {}, onDismiss) {
  const overlay = document.createElement('div');
  overlay.className = 'harvest-reveal';
  overlay.style.cssText = `
    position:absolute;inset:0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:rgba(30,17,10,0.94);
    z-index:30;padding:24px;
    animation:fadeInIntro 0.5s ease-out both;
    overflow-y:auto;
  `;

  const gradeColor = GRADE_COLORS[result.grade] || '#f7f2ea';
  const keepsakes = extras.keepsakes ?? [];
  const recipeNames = extras.recipeNames ?? [];
  const unlockedCount = extras.unlockedCount ?? 0;
  const totalKeepsakes = extras.totalKeepsakes ?? unlockedCount;
  const onViewBackpack = extras.onViewBackpack ?? null;

  // Compute average factors across all scored cells
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
    <div style="text-align:center;max-width:420px;width:100%;">
      <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(247,242,234,0.35);margin-bottom:8px;">Harvest Complete</div>

      <div class="harvest-score-ring" style="
        width:120px;height:120px;border-radius:50%;
        border:4px solid ${gradeColor};
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        margin:0 auto 8px;
        box-shadow:0 0 30px ${gradeColor}33;
      ">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:36px;color:${gradeColor};line-height:1;" id="score-counter">0</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:rgba(247,242,234,0.4);">/ 100</div>
      </div>

      <div style="
        font-family:'Fraunces',serif;font-weight:700;font-size:28px;
        color:${gradeColor};margin-bottom:20px;
        opacity:0;transform:scale(0.5);
        position:relative;
      " id="grade-badge">${result.grade}${result.grade === 'A+' ? '<span class="confetti-burst"></span>' : ''}</div>

      <div style="
        background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);
        border-radius:12px;padding:16px;margin-bottom:16px;text-align:left;
      ">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.3);margin-bottom:10px;">Scoring Factors</div>
        ${Object.entries(FACTOR_LABELS).map(([key, info], factorIdx) => {
          const val = factorAvgs[key] || 0;
          const maxVal = key === 'adjacency' ? 2 : 5;
          const minVal = key === 'adjacency' ? -2 : 0;
          const pct = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
          const barColor = pct > 70 ? '#5aab6b' : pct > 40 ? '#e8c84a' : '#d44a2a';
          const staggerDelay = factorIdx * 100;
          const explanation = explainFactor(key, val);
          return `
            <div class="factor-row" data-factor="${key}" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;opacity:0;transform:translateY(6px);transition:opacity 0.3s ease ${staggerDelay}ms, transform 0.3s ease ${staggerDelay}ms;cursor:pointer;">
              <span style="font-size:16px;width:24px;text-align:center;margin-top:1px;">${info.emoji}</span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(247,242,234,0.7);">${info.label}</span>
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.4);">${val.toFixed(1)} <span style="font-size:9px;color:rgba(247,242,234,0.25);">${info.weight}</span></span>
                </div>
                <div style="height:6px;border-radius:3px;background:rgba(247,242,234,0.06);overflow:hidden;">
                  <div class="factor-bar-fill" style="height:100%;width:0%;background:${barColor};border-radius:3px;transition:width 0.8s ease-out ${staggerDelay + 200}ms;"></div>
                </div>
                ${explanation ? `
                  <div class="factor-explain" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
                    <div style="font-size:11px;color:rgba(247,242,234,0.6);line-height:1.5;">${explanation.verdict}</div>
                    ${explanation.tip ? `<div style="font-size:10px;color:${barColor};margin-top:4px;line-height:1.4;">💡 ${explanation.tip}</div>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="
        display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;
      ">
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Planted</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${result.occupiedCount}</div>
        </div>
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Variety</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${result.details.uniqueCrops}</div>
        </div>
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Fill</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${Math.round(result.details.fillRatio * 100)}%</div>
        </div>
      </div>

      ${result.details.diversityBonus > 0 ? `
        <div style="font-size:12px;color:#5aab6b;margin-bottom:4px;">+${result.details.diversityBonus.toFixed(1)} diversity bonus</div>
      ` : ''}
      ${result.details.recipeBonus > 0 ? `
        <div style="font-size:12px;color:#e8c84a;margin-bottom:4px;">+${result.details.recipeBonus.toFixed(1)} recipe bonus</div>
      ` : ''}
      ${result.details.fillPenalty > 0 ? `
        <div style="font-size:12px;color:#d44a2a;margin-bottom:4px;">-${result.details.fillPenalty.toFixed(1)} fill penalty</div>
      ` : ''}

      <div style="
        background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);
        border-radius:12px;padding:14px;margin-top:14px;margin-bottom:14px;text-align:left;
      ">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.3);margin-bottom:8px;">How to Improve</div>
        <div style="display:grid;gap:6px;">
          ${bedHints(result).map((hint) => `
            <div style="font-size:12px;line-height:1.5;color:rgba(247,242,234,0.72);display:flex;gap:8px;align-items:flex-start;">
              <span style="color:#e8c84a;flex-shrink:0;">→</span>
              <span>${hint}</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${recipeNames.length > 0 ? `
        <div style="
          background:rgba(232,200,74,0.08);border:1px solid rgba(232,200,74,0.18);
          border-radius:12px;padding:14px;margin-top:14px;text-align:left;
        ">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(232,200,74,0.7);margin-bottom:8px;">Recipe Matches</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${recipeNames.map((name) => `
              <span style="padding:6px 10px;border-radius:999px;background:rgba(232,200,74,0.14);color:#f4dfa1;font-size:12px;">${name}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div style="
        background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);
        border-radius:12px;padding:14px;margin-top:14px;text-align:left;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:${keepsakes.length > 0 ? '10px' : '0'};">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.3);">Keepsakes</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.55);">${unlockedCount} / ${totalKeepsakes}</div>
        </div>
        ${keepsakes.length > 0 ? `
          <div style="display:grid;gap:8px;">
            ${keepsakes.map((keepsake) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(90,171,107,0.12);border:1px solid rgba(90,171,107,0.24);">
                <span style="font-family:'Fraunces',serif;font-size:16px;color:#f7f2ea;">${keepsake.name}</span>
                <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8fd39b;">New</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-size:12px;color:rgba(247,242,234,0.5);">No new keepsakes this chapter.</div>
        `}
      </div>

      ${onViewBackpack && (keepsakes.length > 0 || recipeNames.length > 0) ? `
        <button id="harvest-backpack" style="
          margin-top:16px;width:100%;max-width:280px;
          font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
          padding:12px 24px;border-radius:8px;cursor:pointer;
          background:rgba(247,242,234,0.08);color:#f7f2ea;border:1px solid rgba(247,242,234,0.16);
        ">View Backpack</button>
      ` : ''}

      <button id="harvest-continue" style="
        margin-top:20px;width:100%;max-width:280px;
        font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;
        padding:14px 28px;border-radius:8px;cursor:pointer;
        background:#e8c84a;color:#1e110a;border:none;
      ">Continue</button>
    </div>
  `;

  // Animate score counter
  const counterEl = overlay.querySelector('#score-counter');
  const gradeBadge = overlay.querySelector('#grade-badge');
  let count = 0;
  const target = result.score;
  const duration = 1200;
  const startTime = performance.now();

  function animateCounter(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    count = Math.round(eased * target);
    counterEl.textContent = count;
    if (progress < 1) {
      requestAnimationFrame(animateCounter);
    } else {
      // Bounce in the grade badge after counter finishes
      if (gradeBadge) {
        gradeBadge.style.transition = 'opacity 0.3s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        gradeBadge.style.opacity = '1';
        gradeBadge.style.transform = 'scale(1)';
      }
    }
  }
  requestAnimationFrame(animateCounter);

  // Stagger factor bar animations after mount
  requestAnimationFrame(() => {
    // Fade in factor rows
    overlay.querySelectorAll('.factor-row').forEach((row) => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    });
    // Compute and set actual bar widths to trigger width transition
    const factorKeys = Object.keys(FACTOR_LABELS);
    overlay.querySelectorAll('.factor-bar-fill').forEach((bar, idx) => {
      const key = factorKeys[idx];
      const val = factorAvgs[key] || 0;
      const maxVal = key === 'adjacency' ? 2 : 5;
      const minVal = key === 'adjacency' ? -2 : 0;
      const pct = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
      bar.style.width = `${pct}%`;
    });
  });

  // Toggle factor explanations on tap/click
  overlay.querySelectorAll('.factor-row[data-factor]').forEach((row) => {
    row.addEventListener('click', () => {
      const explainEl = row.querySelector('.factor-explain');
      if (!explainEl) return;
      const isVisible = explainEl.style.display !== 'none';
      // Close all others first
      overlay.querySelectorAll('.factor-explain').forEach((el) => { el.style.display = 'none'; });
      if (!isVisible) explainEl.style.display = 'block';
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

  overlay.querySelector('#harvest-continue').addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.3s ease-in both';
    setTimeout(() => {
      overlay.remove();
      onDismiss?.();
    }, 300);
  });

  container.appendChild(overlay);
}
