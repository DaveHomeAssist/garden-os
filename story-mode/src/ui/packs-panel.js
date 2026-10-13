import '../../assets/css/hud-market.css';

import { installPackFromText, loadInstalledPacks, removeInstalledPack } from '../content/installed-packs.js';
import { listInstalledPacks } from '../content/content-registry.js';
import { isOfficialContent } from '../content/official-content.js';

// Content Packs sheet: install pack files from the device, see what each one
// adds, remove packs. Changes apply on the next load so a running season keeps
// the crops and quests it started with. DOM nodes and textContent only: pack
// titles and errors are author text.

function el(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  Object.entries(attrs ?? {}).forEach(([key, value]) => {
    if (value === false || value == null) return;
    node.setAttribute(key, value === true ? '' : String(value));
  });
  children.filter(Boolean).forEach((child) => node.appendChild(child));
  return node;
}

function describeContent(pack) {
  const content = pack.content ?? {};
  const parts = [
    [content.crops?.length, 'crop'],
    [content.quests?.length, 'quest'],
    [content.npcs?.length, 'neighbor'],
    [content.zones?.length, 'place'],
  ].filter(([count]) => count > 0).map(([count, noun]) => `${count} ${noun}${count === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'no content';
}

export function buildPacksModel({ storage, loadedThisSession = listInstalledPacks(), rejected = [] } = {}) {
  const active = new Set(loadedThisSession.map((pack) => `${pack.id}@${pack.version}`));
  return {
    installed: loadInstalledPacks(storage).map((pack) => ({
      id: pack.id,
      title: pack.title,
      version: pack.version,
      author: pack.author ?? 'Unknown author',
      summary: describeContent(pack),
      active: active.has(`${pack.id}@${pack.version}`),
      placesNote: pack.content?.zones?.length
        ? 'Places are recorded with the pack but cannot be visited yet.'
        : null,
    })),
    rejected: rejected.map((entry) => ({ id: entry.id, errors: entry.errors ?? [] })),
  };
}

export function showPacksPanel(container, {
  storage,
  persistState = () => {},
  reload = () => globalThis.location?.reload?.(),
  readFile = (file) => file.text(),
} = {}) {
  if (!container) return null;
  const restoreFocus = document.activeElement;
  const sheet = el('div', {
    className: 'panel-sheet is-open trade-panel',
    attrs: { id: 'packs-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Content packs' },
  });
  let pendingReload = false;

  function close() {
    sheet.classList.remove('is-open');
    setTimeout(() => sheet.remove(), 220);
    restoreFocus?.focus?.();
  }

  function render(message = '', errors = []) {
    const model = buildPacksModel({ storage, rejected: globalThis.GARDEN_OS_LOADED_CONTENT?.rejected ?? [] });
    const closeButton = el('button', { className: 'palette-dismiss', text: '×', attrs: { type: 'button', 'aria-label': 'Close content packs' } });
    closeButton.addEventListener('click', close);

    const fileInput = el('input', {
      className: 'trade-panel__count',
      attrs: { type: 'file', accept: '.json,application/json', multiple: true, 'aria-label': 'Choose content pack files', style: 'width: auto; padding: 8px' },
    });
    fileInput.addEventListener('change', async () => {
      const files = [...(fileInput.files ?? [])];
      const added = [];
      const problems = [];
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const text = await readFile(file);
        const result = installPackFromText(text, { storage, isOfficial: isOfficialContent });
        if (result.ok) added.push(result.pack.title);
        else problems.push(`${file.name}: ${result.errors.slice(0, 4).join('; ')}`);
      }
      if (added.length) pendingReload = true;
      render(added.length ? `Installed ${added.join(', ')}. Reload to play with it.` : '', problems);
    });

    const rows = model.installed.map((pack) => {
      const remove = el('button', { className: 'trade-panel__btn', text: 'Remove', attrs: { type: 'button', 'aria-label': `Remove ${pack.title}` } });
      remove.addEventListener('click', () => {
        removeInstalledPack(pack.id, { storage });
        pendingReload = true;
        render(`Removed ${pack.title}. Reload to finish removing it.`);
      });
      return el('li', { className: 'trade-panel__row trade-panel__row--stack' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__item', text: `${pack.title} ${pack.version}` }),
          el('div', { className: 'trade-panel__meta', text: `${pack.author} · ${pack.summary} · ${pack.active ? 'active now' : 'applies after reload'}` }),
          pack.placesNote ? el('div', { className: 'trade-panel__meta', text: pack.placesNote }) : null,
        ]),
        remove,
      ]);
    });

    const reloadButton = el('button', { className: 'trade-panel__btn', text: 'Save and reload', attrs: { type: 'button', disabled: !pendingReload } });
    reloadButton.addEventListener('click', () => {
      persistState();
      reload();
    });

    sheet.replaceChildren(
      el('div', { className: 'panel-handle' }),
      el('div', { className: 'trade-panel__header' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__title', text: 'Content Packs' }),
          el('div', { className: 'trade-panel__meta', text: `${model.installed.length} installed` }),
        ]),
        closeButton,
      ]),
      el('p', { className: 'trade-panel__message', text: message, attrs: { role: 'status', 'aria-live': 'polite' } }),
      errors.length ? el('ul', { className: 'trade-panel__traders' }, errors.map((line) => el('li', { text: line }))) : el('span'),
      el('p', {
        className: 'trade-panel__note',
        text: 'Packs add crops, quests, and neighbors written by other players. They are data only and are marked Modded wherever they appear. Pack quests are not signed by the save authority.',
      }),
      el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Install a pack' } }, [
        el('h3', { className: 'trade-panel__heading', text: 'Install' }),
        el('div', { className: 'trade-panel__controls' }, [fileInput, reloadButton]),
      ]),
      el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Installed packs' } }, [
        el('h3', { className: 'trade-panel__heading', text: 'Installed' }),
        rows.length ? el('ul', { className: 'trade-panel__list' }, rows) : el('p', { className: 'trade-panel__note', text: 'No packs installed.' }),
      ]),
      model.rejected.length ? el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Packs that did not load' } }, [
        el('h3', { className: 'trade-panel__heading', text: 'Did not load this session' }),
        el('ul', { className: 'trade-panel__traders' }, model.rejected.map((entry) => el('li', { text: `${entry.id}: ${entry.errors.slice(0, 3).join('; ')}` }))),
      ]) : el('span'),
    );
  }

  sheet.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  });
  container.replaceChildren(sheet);
  render();
  sheet.querySelector('button')?.focus();
  return { close, render };
}
