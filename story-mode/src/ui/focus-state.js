function releaseFocusWithin(element) {
  const active = element.ownerDocument?.activeElement;
  if (!active || active === element.ownerDocument.body) return;
  if (element === active || element.contains(active)) active.blur?.();
}

export function setElementInteractive(element, interactive, { ariaHidden = true } = {}) {
  if (!element) return;
  // Move focus out before hiding: a focused descendant left inside an
  // inert/aria-hidden subtree keeps eating Space/Enter and makes Chrome warn
  // "Blocked aria-hidden on an element because its descendant retained focus".
  if (!interactive) releaseFocusWithin(element);
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
