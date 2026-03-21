import { resolvePortraitLayers } from '../data/portraits.js';

export function createDialoguePanel(rootEl) {
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
        <div class="dp-dots" id="dp-dots"></div>
        <div class="dp-advance-hint" id="dp-advance-hint" aria-hidden="true">▼</div>
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
    dots: rootEl.querySelector('#dp-dots'),
    advanceHint: rootEl.querySelector('#dp-advance-hint'),
    skipBtn: rootEl.querySelector('#dp-skip-btn'),
  };

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
      renderDots(uiState.beatIndex, uiState.beatCount);
      els.advanceHint.style.opacity = uiState.canAdvance ? '1' : '0';
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

    destroy() {
      rootEl.innerHTML = '';
    },
  };
}
