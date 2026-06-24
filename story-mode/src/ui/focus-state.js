export function setElementInteractive(element, interactive, { ariaHidden = true } = {}) {
  if (!element) return;
  element.toggleAttribute('inert', !interactive);
  if (ariaHidden) {
    element.setAttribute('aria-hidden', interactive ? 'false' : 'true');
  }
}

export function setButtonInteractive(button, interactive) {
  if (!button) return;
  button.disabled = !interactive;
  setElementInteractive(button, interactive);
}
