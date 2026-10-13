import '../../assets/css/hud-market.css';
import WORLD_MAP from 'specs/WORLD_MAP.json';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';
import { evaluateZoneAccess } from '../scene/zone-manager.js';
import { getZoneBiomeCropProgress } from '../game/biome-crops.js';

function buildWorldMapModel(state, systems = {}, worldMap = WORLD_MAP) {
  const currentZoneId = state?.campaign?.worldState?.currentZone ?? 'player_plot';
  const visited = new Set(state?.campaign?.worldState?.visitedZones ?? [currentZoneId]);
  const zones = Object.values(worldMap.zones ?? {}).map((zone) => {
    const access = evaluateZoneAccess(zone.id, state, systems);
    return {
      id: zone.id,
      name: zone.name,
      biome: zone.biome,
      description: zone.description,
      current: zone.id === currentZoneId,
      visited: visited.has(zone.id),
      allowed: access.allowed,
      blockers: access.blockers,
      connectionCount: zone.connections?.length ?? 0,
      exitCount: getZoneExitPoints(zone.id, worldMap).length,
      biomeCropCount: zone.biomeCrops?.length ?? 0,
      wildCrops: getZoneBiomeCropProgress(state, zone.id),
    };
  });

  return {
    version: worldMap.version,
    currentZoneId,
    zones,
    connections: worldMap.connections ?? [],
  };
}

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

/** Why a zone is closed, in the player's words, from its first blocker. */
function describeLock(zone) {
  const blocker = zone.blockers?.[0];
  if (!blocker) return null;
  return blocker.message ?? `Needs ${blocker.requirement}.`;
}

// Built from DOM nodes and textContent only. Locked zones say why on the
// card itself, since a disabled button cannot explain itself on tap.
function createWorldMapPanel(model, onTravel) {
  const panel = el('div', { className: 'panel-sheet is-open', attrs: { id: 'world-map-panel', role: 'dialog', 'aria-label': 'World map' } });
  const close = el('button', { className: 'palette-dismiss', text: '×', attrs: { type: 'button', 'data-close': 'true', 'aria-label': 'Close world map' } });
  const cards = model.zones.map((zone) => {
    const lock = !zone.current && !zone.allowed ? describeLock(zone) : null;
    const button = el('button', {
      text: zone.current ? 'Here' : zone.allowed ? 'Travel' : 'Locked',
      attrs: {
        type: 'button',
        'data-zone-id': zone.id,
        disabled: zone.current || !zone.allowed,
        'aria-describedby': lock ? `world-map-lock-${zone.id}` : null,
      },
    });
    return el('article', { className: 'read-only-sheet__card' }, [
      el('div', { className: 'read-only-sheet__card-top' }, [
        el('div', {}, [
          el('div', { className: 'read-only-sheet__card-title', text: zone.name }),
          el('div', { className: 'read-only-sheet__card-meta', text: `${zone.biome} · ${zone.connectionCount} paths${zone.wildCrops?.total ? ` · ${zone.wildCrops.found} of ${zone.wildCrops.total} wild crops found` : ''}${zone.visited ? '' : ' · not visited'}` }),
          lock ? el('div', { className: 'world-map__lock', text: lock, attrs: { id: `world-map-lock-${zone.id}` } }) : null,
        ]),
        button,
      ]),
    ]);
  });

  panel.append(
    el('div', { className: 'panel-handle' }),
    el('div', { className: 'palette-header' }, [
      el('div', {}, [
        el('div', { className: 'palette-title', text: 'World Map' }),
        el('div', { className: 'read-only-sheet__subtitle', text: `${model.zones.length} zones` }),
      ]),
      close,
    ]),
    el('div', { className: 'read-only-sheet__list' }, cards),
  );

  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-close="true"]')) {
      panel.remove();
      return;
    }
    const zoneButton = event.target.closest('[data-zone-id]');
    if (zoneButton && !zoneButton.disabled) {
      onTravel?.(zoneButton.dataset.zoneId);
    }
  });
  return panel;
}

function showWorldMapPanel(container, model, onTravel) {
  if (!container) return null;
  const panel = createWorldMapPanel(model, onTravel);
  container.replaceChildren(panel);
  return panel;
}

export {
  WORLD_MAP,
  buildWorldMapModel,
  createWorldMapPanel,
  showWorldMapPanel,
};
