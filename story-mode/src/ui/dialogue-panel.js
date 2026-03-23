import { resolvePortraitLayers } from '../data/portraits.js';

function ensureChoiceStyles() {
  if (document.getElementById('dp-choice-styles')) return;
  const style = document.createElement('style');
  style.id = 'dp-choice-styles';
  style.textContent = `
    .dp-choice-row {
      display: none;
      gap: 8px;
      padding: 12px 16px 0;
      flex-wrap: wrap;
      align-items: stretch;
    }
    .dp-choice-row.is-visible {
      display: flex;
    }
    .dp-choice-btn {
      min-height: 44px;
      background: var(--soil, #5c3d1e);
      color: var(--cream, #f7f0da);
      border: 1px solid var(--sun, #e8c84a);
      border-radius: 8px;
      padding: 10px 16px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      cursor: pointer;
      opacity: 0;
      transform: translateY(8px);
      animation: dp-choice-in 180ms ease forwards;
    }
    .dp-choice-btn:hover {
      background: var(--sun, #e8c84a);
      color: var(--text, #1f1a14);
    }
    .dp-choice-btn:focus-visible {
      outline: 2px solid var(--sun, #e8c84a);
      outline-offset: 2px;
    }
    .dp-choice-btn.is-selected {
      background: var(--leaf-bright, #8bcf5a);
      color: var(--text, #1f1a14);
    }
    @keyframes dp-choice-in {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

export function createDialoguePanel(rootEl) {
  ensureChoiceStyles();
  rootEl.innerHTML = `
    <div class="dp-panel" id="dp-panel" aria-live="polite" aria-atomic="false">
      <div class="dp-portrait-area">
        <div class="dp-portrait" id="dp-portrait">
          <div class="dp-portrait-layer" id="dp-layer-base"></div>
          <div class="dp-portrait-layer" id="dp-layer-body"></div>
          <div class="dp-portrait-layer" id="dp-layer-eyes"></div>
          <div class="dp-portrait-layer" id="dp-layer-mouth"></div>
          <div class="dp-portrait-layer" id="dp-layer-overlay"></div>
          <div class="dp-portrait-fallback" id="dp-portrait-fallback"></div>
        </div>
      </div>
      <div class="dp-content-area">
        <div class="dp-speaker-badge" id="dp-speaker-badge"></div>
        <div class="dp-text" id="dp-text"></div>
        <div class="dp-choice-row" id="dp-choice-row" role="group" aria-label="Dialogue choices"></div>
        <div class="dp-dots" id="dp-dots"></div>
        <div class="dp-advance-hint" id="dp-advance-hint" aria-hidden="true">tap to continue ▼</div>
      </div>
      <button class="dp-skip-btn" id="dp-skip-btn" aria-label="Skip cutscene">Skip</button>
    </div>
  `;

  const els = {
    panel: rootEl.querySelector('#dp-panel'),
    portrait: rootEl.querySelector('#dp-portrait'),
    portraitFallback: rootEl.querySelector('#dp-portrait-fallback'),
    layerBase: rootEl.querySelector('#dp-layer-base'),
    layerBody: rootEl.querySelector('#dp-layer-body'),
    layerEyes: rootEl.querySelector('#dp-layer-eyes'),
    layerMouth: rootEl.querySelector('#dp-layer-mouth'),
    layerOverlay: rootEl.querySelector('#dp-layer-overlay'),
    speakerBadge: rootEl.querySelector('#dp-speaker-badge'),
    text: rootEl.querySelector('#dp-text'),
    choiceRow: rootEl.querySelector('#dp-choice-row'),
    dots: rootEl.querySelector('#dp-dots'),
    advanceHint: rootEl.querySelector('#dp-advance-hint'),
    skipBtn: rootEl.querySelector('#dp-skip-btn'),
  };
  let choiceHandler = null;
  let lastChoiceSignature = '';

  function setLayerSrc(el, src) {
    el.style.backgroundImage = src ? `url("${src}")` : 'none';
  }

  function renderPortrait(uiState) {
    const { portraitId, emotion, portraitAnim, portraitEmoji } = uiState;
    if (!portraitId) {
      els.portrait.style.display = 'none';
      return;
    }

    els.portrait.style.display = '';
    const resolved = resolvePortraitLayers(portraitId, emotion);
    const emotionClass = `expr-${emotion ?? 'neutral'}`;
    const animClass = portraitAnim ? `anim-${portraitAnim}` : null;

    els.portrait.className = 'dp-portrait';
    els.portrait.classList.add(emotionClass);
    if (animClass) {
      els.portrait.classList.add(animClass);
    }

    if (!resolved || resolved.cssOnly) {
      els.portrait.dataset.portrait = portraitId;
      els.portraitFallback.textContent = portraitEmoji ?? '';
      setLayerSrc(els.layerBase, null);
      setLayerSrc(els.layerBody, null);
      setLayerSrc(els.layerEyes, null);
      setLayerSrc(els.layerMouth, null);
      setLayerSrc(els.layerOverlay, null);
      return;
    }

    els.portraitFallback.textContent = '';
    setLayerSrc(els.layerBase, resolved.base);
    setLayerSrc(els.layerBody, resolved.body);
    setLayerSrc(els.layerEyes, resolved.eyes);
    setLayerSrc(els.layerMouth, resolved.mouth);
    setLayerSrc(els.layerOverlay, resolved.overlay);
  }

  function renderDots(beatIndex, beatCount) {
    if (beatCount <= 1) {
      els.dots.innerHTML = '';
      return;
    }
    els.dots.innerHTML = Array.from({ length: beatCount }, (_, idx) => (
      `<span class="dp-dot ${idx === beatIndex ? 'dp-dot--active' : ''}"></span>`
    )).join('');
  }

  function focusChoice(index = 0) {
    const buttons = [...els.choiceRow.querySelectorAll('.dp-choice-btn')];
    buttons[index]?.focus();
  }

  function renderChoices(uiState) {
    const choices = uiState.choices ?? [];
    if (!choices.length || !uiState.canAdvance) {
      els.choiceRow.innerHTML = '';
      els.choiceRow.classList.remove('is-visible');
      lastChoiceSignature = '';
      return;
    }

    const signature = choices.map((choice) => choice.label).join('|');
    els.choiceRow.innerHTML = choices.map((choice, index) => (
      `<button
        type="button"
        class="dp-choice-btn ${index === uiState.selectedChoiceIndex ? 'is-selected' : ''}"
        data-choice-index="${index}"
        style="animation-delay:${index * 100}ms"
      >${choice.label}</button>`
    )).join('');
    els.choiceRow.classList.add('is-visible');

    if (signature !== lastChoiceSignature) {
      queueMicrotask(() => focusChoice(uiState.selectedChoiceIndex ?? 0));
    }
    lastChoiceSignature = signature;
  }

  els.choiceRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-choice-index]');
    if (!button) return;
    event.stopPropagation();
    choiceHandler?.(Number(button.dataset.choiceIndex));
  });

  els.choiceRow.addEventListener('keydown', (event) => {
    const buttons = [...els.choiceRow.querySelectorAll('.dp-choice-btn')];
    if (!buttons.length) return;
    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusChoice((currentIndex + 1 + buttons.length) % buttons.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusChoice((currentIndex - 1 + buttons.length) % buttons.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
      event.preventDefault();
      choiceHandler?.(fallbackIndex);
    }
  });

  return {
    render(uiState) {
      if (!uiState.visible) {
        this.hide();
        return;
      }

      els.panel.classList.add('dp-panel--visible');
      els.panel.dataset.side = uiState.side ?? 'left';
      els.panel.classList.toggle('dp-panel--thought', Boolean(uiState.thoughtBubble));
      els.panel.dataset.speaker = uiState.speaker ?? '';

      if (uiState.speakerName) {
        els.speakerBadge.textContent = uiState.speakerName;
        els.speakerBadge.style.display = '';
        els.speakerBadge.classList.toggle('dp-speaker-badge--thought', Boolean(uiState.thoughtBubble));
      } else {
        els.speakerBadge.style.display = 'none';
        els.speakerBadge.classList.remove('dp-speaker-badge--thought');
      }

      els.text.textContent = uiState.textVisible ?? '';
      renderPortrait(uiState);
      renderChoices(uiState);
      renderDots(uiState.beatIndex, uiState.beatCount);
      els.advanceHint.style.opacity = uiState.canAdvance && !(uiState.choices?.length) ? '1' : '0';
      els.skipBtn.style.display = uiState.canSkip ? '' : 'none';
    },

    hide() {
      els.panel.classList.remove('dp-panel--visible');
      els.panel.classList.remove('dp-panel--thought');
    },

    getSkipButton() {
      return els.skipBtn;
    },

    getPanelElement() {
      return els.panel;
    },

    setChoiceHandler(handler) {
      choiceHandler = handler;
    },

    hasVisibleChoices() {
      return els.choiceRow.classList.contains('is-visible');
    },

    isChoiceTarget(target) {
      return Boolean(target?.closest?.('[data-choice-index]'));
    },

    destroy() {
      rootEl.innerHTML = '';
    },
  };
}
