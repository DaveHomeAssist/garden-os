/**
 * Event Card — bottom-sheet panel showing season event with intervention buttons.
 * Called when a beat phase begins and an event is active.
 */

const INTERVENTIONS = [
  { id: 'protect', label: 'Protect', emoji: '🛡️', desc: 'Shield one cell from this event' },
  { id: 'mulch', label: 'Mulch', emoji: '🍂', desc: '+0.5 now, +0.25 next season' },
  { id: 'swap', label: 'Swap', emoji: '🔄', desc: 'Exchange two adjacent crops' },
  { id: 'companion_patch', label: 'Patch', emoji: '🌼', desc: '+1.0 adjacency bonus this beat' },
  { id: 'prune', label: 'Prune', emoji: '✂️', desc: 'Remove one crop entirely' },
  { id: 'accept_loss', label: 'Accept', emoji: '🤷', desc: 'Take the hit, save your token' },
];

export function showEventCard(container, event, tokensLeft, onChoose) {
  const availableInterventions = INTERVENTIONS.filter((intervention) => {
    const options = event.interventionOptions ?? [];
    return options.length === 0 || options.includes(intervention.id);
  });

  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open event-card-sheet';
  sheet.id = 'event-card-panel';
  sheet.style.animation = 'eventSlideIn 0.3s ease-out both';

  const valenceColor = event.valence === 'positive' ? '#5aab6b'
    : event.valence === 'negative' ? '#d44a2a'
    : event.valence === 'mixed' ? '#e8c84a'
    : '#8ba8b5';

  sheet.style.borderTop = `3px solid ${valenceColor}`;

  const valenceLabel = event.valence === 'positive' ? '+'
    : event.valence === 'negative' ? '−'
    : event.valence === 'mixed' ? '~'
    : '·';

  sheet.style.setProperty('--event-accent', valenceColor);
  sheet.dataset.valence = event.valence ?? 'neutral';

  sheet.innerHTML = `
    <div class="panel-handle"></div>
    <div class="event-card__header">
      <div>
        <div class="event-card__eyebrow">Season Event</div>
        <div class="event-card__title">${escapeHtml(event.title)}</div>
      </div>
      <span class="event-card__valence">${valenceLabel}</span>
    </div>

    <p class="event-card__body">
      ${escapeHtml(event.description)}
    </p>

    ${event.mechanicalEffect ? `
      <div class="event-card__effect">
        <div class="event-card__effect-label">Effect</div>
        ${event.mechanicalEffect.modifier > 0 ? '+' : ''}${event.mechanicalEffect.modifier} · ${event.mechanicalEffect.duration || 'this beat'}
      </div>
    ` : ''}

    <div class="event-card__response">
      Response · ${tokensLeft} token${tokensLeft !== 1 ? 's' : ''} left
    </div>
    <div class="targeting-hint" style="margin-bottom:10px;">
      Choose an intervention type first. If it targets the bed, you will pick the exact cell next.
    </div>

    <div class="intervention-grid" id="intervention-grid">
      ${availableInterventions.map(iv => {
        const isAccept = iv.id === 'accept_loss';
        const disabled = !isAccept && tokensLeft <= 0;
        return `
          <button data-intervention="${iv.id}" ${disabled ? 'disabled' : ''} class="intervention-btn ${disabled ? 'is-disabled' : ''}" aria-label="${iv.label}: ${iv.desc}">
            <div class="event-card__intervention-icon">${iv.emoji}</div>
            <div class="event-card__intervention-title">${iv.label}</div>
            <div class="event-card__intervention-copy">${iv.desc}</div>
          </button>
        `;
      }).join('')}
    </div>
    <div class="targeting-chip-row" style="margin-bottom:6px;">
      <span class="targeting-chip">Tap a card</span>
      <span class="targeting-chip">Tap the highlighted bed cell</span>
    </div>
  `;

  sheet.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-intervention]');
    if (!btn || btn.disabled) return;
    const interventionId = btn.dataset.intervention;
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.remove();
      onChoose(interventionId);
    }, 260);
  });

  container.innerHTML = '';
  container.appendChild(sheet);
}

export function dismissEventCard() {
  const panel = document.getElementById('event-card-panel');
  if (panel) {
    panel.classList.remove('is-open');
    setTimeout(() => panel.remove(), 260);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
