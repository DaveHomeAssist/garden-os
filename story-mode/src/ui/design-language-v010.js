const VERSION = 'v0.10';

function setAttributeIfChanged(element, name, value) {
  if (!element || element.getAttribute(name) === value) return;
  element.setAttribute(name, value);
}

function findById(root, id) {
  return root.getElementById?.(id)
    ?? root.querySelector?.(`#${id}`)
    ?? document.getElementById(id);
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

function resolveSurfaces(root) {
  return {
    helper: findById(root, 'phase-helper'),
    fabAdvance: findById(root, 'fab-advance'),
    hudAction: findById(root, 'hud-action'),
    seasonCalendar: findById(root, 'season-calendar'),
  };
}

function syncDynamicSurfaces(root = document) {
  const body = root.body ?? document.body;
  if (!body) return resolveSurfaces(root);
  setAttributeIfChanged(body, 'data-design-language', VERSION);

  const surfaces = resolveSurfaces(root);
  normalizeHelperCopy(surfaces.helper);
  syncPrimaryAction(surfaces.fabAdvance, surfaces.helper);
  syncPrimaryAction(surfaces.hudAction, surfaces.helper);
  syncCalendar(surfaces.seasonCalendar);
  return surfaces;
}

export function installDesignLanguageV010(root = document) {
  const targetObservers = new Map();
  const body = root.body ?? document.body;
  const mount = findById(root, 'app') ?? body;

  function watchTarget(key, element) {
    const current = targetObservers.get(key);
    if (current?.element === element) return;
    current?.observer.disconnect();
    targetObservers.delete(key);
    if (!element) return;

    const observer = new MutationObserver(syncAndBind);
    observer.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    targetObservers.set(key, { element, observer });
  }

  function syncAndBind() {
    const surfaces = syncDynamicSurfaces(root);
    watchTarget('helper', surfaces.helper);
    watchTarget('fabAdvance', surfaces.fabAdvance);
    watchTarget('hudAction', surfaces.hudAction);
    watchTarget('seasonCalendar', surfaces.seasonCalendar);
  }

  syncAndBind();

  // Only watch top-level app remounts. Runtime label changes are handled by
  // the four targeted observers above, avoiding a whole-document observer on
  // every scene, inventory, cooldown, and animation mutation.
  const mountObserver = new MutationObserver(syncAndBind);
  if (mount) {
    mountObserver.observe(mount, {
      childList: true,
      subtree: false,
    });
  }

  return {
    version: VERSION,
    sync: syncAndBind,
    dispose: () => {
      mountObserver.disconnect();
      targetObservers.forEach(({ observer }) => observer.disconnect());
      targetObservers.clear();
    },
  };
}
