function isCoarsePointer() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function applyBaseStyles(button, hint, label) {
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-hidden', 'true');
  button.style.position = 'absolute';
  button.style.left = '0';
  button.style.top = '0';
  button.style.transform = 'translate(-50%, -115%)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '0.55rem';
  button.style.padding = '0.55rem 0.75rem';
  button.style.border = '1px solid rgba(245, 233, 203, 0.2)';
  button.style.borderRadius = '999px';
  button.style.background = 'rgba(66, 48, 35, 0.94)';
  button.style.color = 'var(--cream, #f5e9cb)';
  button.style.fontFamily = '"DM Mono", ui-monospace, SFMono-Regular, monospace';
  button.style.fontSize = '0.78rem';
  button.style.letterSpacing = '0.02em';
  button.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.28)';
  button.style.backdropFilter = 'blur(10px)';
  button.style.zIndex = '35';
  button.style.pointerEvents = 'none';
  button.style.opacity = '0';
  button.style.transition = 'opacity 120ms ease, transform 120ms ease';

  hint.style.display = 'inline-flex';
  hint.style.alignItems = 'center';
  hint.style.justifyContent = 'center';
  hint.style.minWidth = '2rem';
  hint.style.height = '1.8rem';
  hint.style.padding = '0 0.55rem';
  hint.style.borderRadius = '999px';
  hint.style.background = 'rgba(232, 200, 74, 0.16)';
  hint.style.color = '#e8c84a';
  hint.style.fontSize = '0.72rem';
  hint.style.fontWeight = '700';
  hint.style.textTransform = 'uppercase';

  label.style.whiteSpace = 'nowrap';
  label.style.fontSize = '0.78rem';
}

function createInteractionPrompt({ container, onActivate }) {
  const button = document.createElement('button');
  const hint = document.createElement('span');
  const label = document.createElement('span');
  applyBaseStyles(button, hint, label);

  button.className = 'interaction-prompt';
  hint.className = 'interaction-prompt__hint';
  label.className = 'interaction-prompt__label';
  button.append(hint, label);
  container.append(button);

  function hide() {
    button.hidden = true;
    button.setAttribute('aria-hidden', 'true');
    button.style.opacity = '0';
    button.style.pointerEvents = 'none';
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate?.();
  });

  function update({ x, y, label: nextLabel, visible }) {
    if (!visible) {
      hide();
      return;
    }

    const coarse = isCoarsePointer();
    hint.textContent = coarse ? 'Tap' : '[E]';
    label.textContent = nextLabel ?? 'Interact';
    button.hidden = false;
    button.setAttribute('aria-hidden', 'false');
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    button.style.transform = coarse ? 'translate(-50%, -105%)' : 'translate(-50%, -115%)';
    button.style.padding = coarse ? '0.7rem 0.9rem' : '0.55rem 0.75rem';
  }

  return {
    hide,
    update,
    dispose() {
      button.remove();
    },
  };
}

export { createInteractionPrompt };
