function isCoarsePointer() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function createInteractionPrompt({ container, onActivate }) {
  const button = document.createElement('button');
  const hint = document.createElement('span');
  const label = document.createElement('span');

  button.type = 'button';
  button.className = 'interaction-prompt';
  button.hidden = true;
  button.setAttribute('aria-hidden', 'true');

  hint.className = 'interaction-prompt__hint';
  hint.setAttribute('aria-hidden', 'true');
  label.className = 'interaction-prompt__label';
  button.append(hint, label);
  container.append(button);

  function hide() {
    button.hidden = true;
    button.classList.remove('is-visible');
    button.setAttribute('aria-hidden', 'true');
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
    const actionLabel = nextLabel ?? 'Interact';
    hint.textContent = coarse ? 'Tap' : 'E';
    label.textContent = actionLabel;
    button.setAttribute('aria-label', `${coarse ? 'Tap' : 'Interact'}: ${actionLabel}`);
    button.hidden = false;
    button.setAttribute('aria-hidden', 'false');
    button.classList.toggle('is-coarse', coarse);
    button.classList.add('is-visible');
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
  }

  return {
    element: button,
    hide,
    update,
    dispose() {
      button.remove();
    },
  };
}

export { createInteractionPrompt };
