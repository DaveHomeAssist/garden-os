import '../../assets/css/hud-market.css';

import { BedManager } from '../game/bed-manager.js';
import { BED_KIT_ITEM_ID, HOME_BED_ID } from '../game/beds.js';
import { getInventoryItemCount } from '../game/inventory.js';

// Garden Beds sheet: build a bed from a raised bed kit and choose which bed
// to tend. Shares the market sheet styles. DOM nodes and textContent only.

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

export function buildBedsModel(state) {
  const store = { getState: () => state, dispatch: () => state };
  const manager = new BedManager(store);
  const atHome = (state.campaign?.worldState?.currentZone ?? HOME_BED_ID) === HOME_BED_ID;
  const beds = manager.getAllBeds().map((bed) => ({
    id: bed.id,
    name: bed.name ?? bed.id,
    active: bed.active,
    planted: bed.planted,
    size: `${bed.active ? state.season?.gridCols ?? bed.gridCols ?? 8 : bed.gridCols ?? 8}×${bed.active ? state.season?.gridRows ?? bed.gridRows ?? 4 : bed.gridRows ?? 4}`,
    lastGrade: bed.history?.at?.(-1)?.grade ?? null,
  }));
  return {
    atHome,
    canSwitch: manager.canSwitch() && atHome,
    build: manager.canBuildBed(),
    kits: getInventoryItemCount(state.campaign?.inventory, BED_KIT_ITEM_ID),
    beds,
  };
}

export function showBedsPanel(container, { getState, dispatch, showToast = () => {}, onChange = () => {} } = {}) {
  if (!container) return null;
  const store = { getState, dispatch };
  const manager = new BedManager(store);
  const restoreFocus = document.activeElement;
  const sheet = el('div', {
    className: 'panel-sheet is-open trade-panel',
    attrs: { id: 'beds-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Garden beds' },
  });

  function close() {
    sheet.classList.remove('is-open');
    setTimeout(() => sheet.remove(), 220);
    restoreFocus?.focus?.();
  }

  function render(message = '') {
    const model = buildBedsModel(getState());
    const closeButton = el('button', { className: 'palette-dismiss', text: '×', attrs: { type: 'button', 'aria-label': 'Close garden beds' } });
    closeButton.addEventListener('click', close);

    const rows = model.beds.map((bed) => {
      const tend = el('button', {
        className: 'trade-panel__btn',
        text: bed.active ? 'Tending' : 'Tend this bed',
        attrs: { type: 'button', disabled: bed.active || !model.canSwitch, 'aria-pressed': bed.active ? 'true' : 'false' },
      });
      tend.addEventListener('click', () => {
        if (manager.switchActiveBed(bed.id)) {
          showToast(`Now tending ${bed.name}.`, 2000);
          onChange();
          render(`Now tending ${bed.name}.`);
        } else {
          render('That bed cannot be switched to right now.');
        }
      });
      return el('li', { className: 'trade-panel__row' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__item', text: bed.name }),
          el('div', {
            className: 'trade-panel__meta',
            text: `${bed.size} · ${bed.planted} planted${bed.lastGrade ? ` · last season ${bed.lastGrade}` : ''}`,
          }),
        ]),
        tend,
      ]);
    });

    const nameInput = el('input', {
      className: 'trade-panel__count',
      attrs: { type: 'text', maxlength: 32, value: `Bed ${model.beds.length + 1}`, 'aria-label': 'New bed name', style: 'width: 140px' },
    });
    const buildButton = el('button', { className: 'trade-panel__btn', text: 'Build bed', attrs: { type: 'button', disabled: !model.build.ok } });
    buildButton.addEventListener('click', () => {
      const result = manager.buildBed(nameInput.value);
      if (result.ok) {
        showToast(`${result.bed.name} is built.`, 2000);
        onChange();
        render(`${result.bed.name} is built. Tend it from this list.`);
      } else {
        render(result.reason ?? 'The bed could not be built.');
      }
    });

    let switchNote = null;
    if (!model.atHome) switchNote = 'Walk home to change which bed you are tending.';
    else if (!model.canSwitch) switchNote = 'Beds lock while the harvest is scored. Switch after the new season starts.';

    sheet.replaceChildren(
      el('div', { className: 'panel-handle' }),
      el('div', { className: 'trade-panel__header' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__title', text: 'Garden Beds' }),
          el('div', { className: 'trade-panel__meta', text: `${model.beds.length} bed${model.beds.length === 1 ? '' : 's'} · ${model.kits} kit${model.kits === 1 ? '' : 's'} on hand` }),
        ]),
        closeButton,
      ]),
      el('p', { className: 'trade-panel__message', text: message, attrs: { role: 'status', 'aria-live': 'polite' } }),
      switchNote ? el('p', { className: 'trade-panel__note', text: switchNote }) : el('span'),
      el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Your beds' } }, [
        el('h3', { className: 'trade-panel__heading', text: 'Your beds' }),
        el('ul', { className: 'trade-panel__list' }, rows),
      ]),
      el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Build a bed' } }, [
        el('h3', { className: 'trade-panel__heading', text: 'Build a bed' }),
        el('p', {
          className: 'trade-panel__note',
          text: model.build.ok
            ? 'Uses one raised bed kit. Each bed keeps its own crops, soil, and season history.'
            : model.build.reason,
        }),
        el('div', { className: 'trade-panel__controls' }, [nameInput, buildButton]),
      ]),
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
