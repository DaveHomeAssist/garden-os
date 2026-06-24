import WORLD_MAP from 'specs/WORLD_MAP.json';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';
import { evaluateZoneAccess } from '../scene/zone-manager.js';

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
    };
  });

  return {
    version: worldMap.version,
    currentZoneId,
    zones,
    connections: worldMap.connections ?? [],
  };
}

function createWorldMapPanel(model, onTravel) {
  const panel = document.createElement('div');
  panel.className = 'panel-sheet is-open';
  panel.id = 'world-map-panel';
  panel.innerHTML = `
    <div class="panel-handle"></div>
    <div class="palette-header">
      <div>
        <div class="palette-title">World Map</div>
        <div class="read-only-sheet__subtitle">${model.zones.length} zones</div>
      </div>
      <button type="button" class="palette-dismiss" data-close="true" aria-label="Close world map">&times;</button>
    </div>
    <div class="read-only-sheet__list">
      ${model.zones.map((zone) => `
        <article class="read-only-sheet__card">
          <div class="read-only-sheet__card-top">
            <div>
              <div class="read-only-sheet__card-title">${zone.name}</div>
              <div class="read-only-sheet__card-meta">${zone.biome} · ${zone.connectionCount} paths · ${zone.biomeCropCount} crops</div>
            </div>
            <button type="button" data-zone-id="${zone.id}" ${zone.current || !zone.allowed ? 'disabled' : ''}>
              ${zone.current ? 'Here' : zone.allowed ? 'Travel' : 'Locked'}
            </button>
          </div>
        </article>
      `).join('')}
    </div>
  `;

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
  container.innerHTML = '';
  container.appendChild(panel);
  return panel;
}

export {
  WORLD_MAP,
  buildWorldMapModel,
  createWorldMapPanel,
  showWorldMapPanel,
};
