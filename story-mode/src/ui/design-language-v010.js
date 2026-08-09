const VERSION = 'v0.10';

function setAttributeIfChanged(element, name, value) {
  if (!element || element.getAttribute(name) === value) return;
  element.setAttribute(name, value);
}

function normalizeHelperCopy(helper) {
  if (!helper) return;
  const text = helper.textContent?.trim() ?? '';
  if (!text.includes('Tap Commit Plan')) return;
  helper.textContent = text.replace('Tap Commit Plan', 'Select Start Season');
}

function syncPrimaryAction(button, helper) {
  if (!button) return;
  setAttributeIfChanged(button, 'aria-describedby', 'phase-helper');
  setAttributeIfChanged(button, 'data-ui-role', 'primary-action');

  const action = button.textContent?.trim();
  const guidance = helper?.textContent?.trim();
  if (!action) return;
  const label = guidance ? `${action}. ${guidance}` : action;
  setAttributeIfChanged(button, 'aria-label', label);
}

function syncCalendar(calendar) {
  if (!calendar) return;
  setAttributeIfChanged(calendar, 'role', 'status');
  setAttributeIfChanged(calendar, 'aria-live', 'polite');
  setAttributeIfChanged(calendar, 'aria-atomic', 'true');
  setAttributeIfChanged(calendar, 'data-ui-role', 'season-status');

  const parts = [
    calendar.querySelector('#cal-month')?.textContent,
    calendar.querySelector('#cal-chapter-title')?.textContent,
    calendar.querySelector('#cal-year')?.textContent,
    calendar.querySelector('#cal-beat-label')?.textContent,
  ].map((value) => value?.trim()).filter(Boolean);

  if (parts.length) {
    setAttributeIfChanged(calendar, 'aria-label', parts.join('. '));
  }
}

function syncDynamicSurfaces(root = document) {
  const body = root.body ?? document.body;
  if (!body) return;
  setAttributeIfChanged(body, 'data-design-language', VERSION);

  const helper = root.getElementById?.('phase-helper') ?? document.getElementById('phase-helper');
  normalizeHelperCopy(helper);
  syncPrimaryAction(root.getElementById?.('fab-advance') ?? document.getElementById('fab-advance'), helper);
  syncPrimaryAction(root.getElementById?.('hud-action') ?? document.getElementById('hud-action'), helper);
  syncCalendar(root.getElementById?.('season-calendar') ?? document.getElementById('season-calendar'));
}

export function installDesignLanguageV010(root = document) {
  syncDynamicSurfaces(root);

  const observer = new MutationObserver(() => syncDynamicSurfaces(root));
  observer.observe(root.body ?? document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden', 'data-story-screen', 'data-phase'],
  });

  return {
    version: VERSION,
    sync: () => syncDynamicSurfaces(root),
    dispose: () => observer.disconnect(),
  };
}
