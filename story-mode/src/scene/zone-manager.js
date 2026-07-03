import { Vector3 } from 'three';

import { Actions } from '../game/store.js';
import { ReputationTiers } from '../game/reputation.js';
import WORLD_MAP from 'specs/WORLD_MAP.json';

const FADE_DURATION_MS = 300;
const TIER_THRESHOLDS = Object.fromEntries(Object.values(ReputationTiers).map((tier) => [tier.id, tier.threshold]));
const projectedPositionScratch = new Vector3();

function buildZoneGateRequirements(worldMap = WORLD_MAP) {
  return Object.fromEntries(
    Object.entries(worldMap?.zones ?? {}).map(([zoneId, zoneDef]) => {
      const gate = zoneDef?.gate;
      if (!gate) {
        return [zoneId, {}];
      }

      const requirement = gate.requirement ?? {};
      const next = {};
      if (gate.blockerMessage) next.message = gate.blockerMessage;

      if (gate.type === 'skill' && requirement.skill) {
        next.skills = { [requirement.skill]: requirement.level ?? 1 };
      } else if (gate.type === 'quest' && requirement.quest) {
        next.quests = [requirement.quest];
      } else if (gate.type === 'reputation' && requirement.npc) {
        next.reputation = { [requirement.npc]: requirement.tier ?? requirement.minValue ?? 0 };
      } else if (gate.type === 'festival' || (gate.type === 'event' && requirement.activeFestival)) {
        next.festival = true;
      }

      return [zoneId, next];
    }),
  );
}

const DEFAULT_ZONE_GATES = buildZoneGateRequirements(WORLD_MAP);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInsideBounds(position, bounds) {
  if (!position || !bounds) return false;
  return (
    position.x >= bounds.minX
    && position.x <= bounds.maxX
    && position.z >= bounds.minZ
    && position.z <= bounds.maxZ
  );
}

function toWorldPosition(position) {
  if (!position) return null;
  return {
    x: position.x ?? 0,
    y: position.y ?? 0,
    z: position.z ?? 0,
  };
}

function evaluateZoneAccess(zoneId, state, systems = {}, zoneGates = DEFAULT_ZONE_GATES) {
  const requirements = zoneGates[zoneId] ?? {};
  const blockers = [];
  const blockerMessage = requirements.message ?? null;
  const reputationSystem = systems.reputationSystem ?? null;
  const skillSystem = systems.skillSystem ?? null;
  const questEngine = systems.questEngine ?? null;
  const festivalEngine = systems.festivalEngine ?? null;

  Object.entries(requirements.reputation ?? {}).forEach(([npcId, tierName]) => {
    const needed = TIER_THRESHOLDS[tierName] ?? Number(tierName) ?? 0;
    const current = reputationSystem?.getReputation?.(npcId) ?? (state.campaign.reputation?.[npcId] ?? 0);
    if (current < needed) {
      blockers.push({
        type: 'reputation',
        requirement: `${npcId} reputation`,
        current,
        needed,
        message: blockerMessage ?? `This area requires ${tierName} standing with ${npcId}.`,
      });
    }
  });

  Object.entries(requirements.skills ?? {}).forEach(([skillId, level]) => {
    const current = skillSystem?.getLevel?.(skillId) ?? (state.campaign.skills?.[skillId]?.level ?? 1);
    if (current < level) {
      blockers.push({
        type: 'skill',
        requirement: `${skillId} level`,
        current,
        needed: level,
        message: blockerMessage ?? `This area requires ${skillId.replace(/_/g, ' ')} level ${level}.`,
      });
    }
  });

  (requirements.quests ?? []).forEach((questId) => {
    const stateValue = questEngine?.getQuestEntry?.(questId)?.state ?? state.campaign.questLog?.[questId]?.state;
    if (stateValue !== 'COMPLETED') {
      blockers.push({
        type: 'quest',
        requirement: questId,
        current: stateValue ?? 'UNSTARTED',
        needed: 'COMPLETED',
        message: blockerMessage ?? `Complete ${questId} to enter this area.`,
      });
    }
  });

  if (requirements.festival) {
    const activeFestival = festivalEngine?.getActiveFestival?.() ?? state.campaign.activeFestival;
    if (!activeFestival) {
      blockers.push({
        type: 'festival',
        requirement: 'active festival',
        current: null,
        needed: true,
        message: blockerMessage ?? 'This area only opens during an active festival.',
      });
    }
  }

  return {
    allowed: blockers.length === 0,
    blockers,
  };
}

export class ZoneManager {
  constructor(renderer, store, resourceTracker, systems = {}) {
    this.renderer = renderer;
    this.store = store;
    this.resourceTracker = resourceTracker;
    this.systems = systems;
    this.factories = new Map();
    this.zoneExits = new Map();
    this.zoneGates = new Map();
    this.activeZoneId = null;
    this.activeZoneInstance = null;
    this.activeZoneInteractableIds = [];
    this.interactableRegistry = null;
    this.triggerArmed = true;
    this.transitioning = false;
    this.overlay = this.createOverlay();
    this.registerDefaultGates();
  }

  createOverlay() {
    if (typeof document === 'undefined') return null;
    const overlay = document.createElement('div');
    overlay.className = 'gos-zone-fade';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = '#000';
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
    overlay.style.zIndex = '5';
    document.body.appendChild(overlay);
    return overlay;
  }

  setOverlayOpacity(opacity) {
    if (this.overlay) {
      this.overlay.style.opacity = String(opacity);
    }
  }

  registerZone(zoneId, factory) {
    this.factories.set(zoneId, factory);
  }

  registerZoneGate(zoneId, requirements) {
    this.zoneGates.set(zoneId, structuredClone(requirements ?? {}));
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setSystems(systems = {}) {
    this.systems = systems;
  }

  setInteractableRegistry(registry = null) {
    this.clearActiveZoneInteractables();
    this.interactableRegistry = registry;
    this.registerActiveZoneInteractables();
  }

  clearActiveZoneInteractables() {
    if (!this.interactableRegistry?.unregister) {
      this.activeZoneInteractableIds = [];
      return;
    }
    this.activeZoneInteractableIds.forEach((id) => {
      this.interactableRegistry.unregister(id);
    });
    this.activeZoneInteractableIds = [];
  }

  registerActiveZoneInteractables() {
    if (!this.interactableRegistry?.register || !this.activeZoneInstance?.registerInteractables) {
      return;
    }

    this.activeZoneInstance.registerInteractables((definition) => {
      if (!definition?.id || !definition?.position) return;
      const registeredId = this.interactableRegistry.register(
        `active-zone:${this.activeZoneId}:${definition.id}`,
        definition,
      );
      if (registeredId) {
        this.activeZoneInteractableIds.push(registeredId);
      }
    });
  }

  registerDefaultGates() {
    Object.entries(DEFAULT_ZONE_GATES).forEach(([zoneId, requirements]) => {
      this.registerZoneGate(zoneId, requirements);
    });
  }

  addZoneExit(fromZone, triggerBounds, toZone, spawnPoint = null) {
    const exits = this.zoneExits.get(fromZone) ?? [];
    exits.push({ triggerBounds, toZone, spawnPoint });
    this.zoneExits.set(fromZone, exits);
  }

  getActiveZone() {
    return this.activeZoneId;
  }

  canEnterZone(zoneId) {
    const state = this.store?.getState?.() ?? { campaign: {}, season: {} };
    const gateMap = Object.fromEntries(this.zoneGates.entries());
    return evaluateZoneAccess(zoneId, state, this.systems, gateMap);
  }

  async transitionTo(zoneId, spawnPoint = null) {
    if (this.transitioning || !this.factories.has(zoneId)) return false;
    const gateCheck = this.canEnterZone(zoneId);
    if (!gateCheck.allowed) {
      return { blocked: true, blockers: gateCheck.blockers };
    }
    this.transitioning = true;
    const fromZone = this.activeZoneId;

    this.setOverlayOpacity(1);
    await wait(FADE_DURATION_MS);

    this.clearActiveZoneInteractables();
    this.activeZoneInstance?.dispose?.();
    this.resourceTracker?.disposeAll?.();

    const instance = this.factories.get(zoneId)?.();
    this.activeZoneId = zoneId;
    this.activeZoneInstance = instance ?? null;
    this.triggerArmed = false;
    this.activeZoneInstance?.setSpawnPoint?.(spawnPoint);
    this.activeZoneInstance?.setSeason?.(
      this.store?.getState?.()?.season?.season
        ?? this.store?.getState?.()?.campaign?.currentSeason
        ?? 'spring',
    );
    this.registerActiveZoneInteractables();

    this.store?.dispatch?.({
      type: Actions.ZONE_CHANGED,
      payload: { fromZone, toZone: zoneId, spawnPoint },
    });
    this.store?.dispatch?.({
      type: Actions.ZONE_VISITED,
      payload: { zoneId },
    });

    this.setOverlayOpacity(0);
    await wait(FADE_DURATION_MS);
    this.transitioning = false;
    return true;
  }

  checkTriggers(playerPosition) {
    const exits = this.zoneExits.get(this.activeZoneId) ?? [];
    for (const exit of exits) {
      if (isInsideBounds(playerPosition, exit.triggerBounds)) {
        return this.transitionTo(exit.toZone, exit.spawnPoint);
      }
    }
    return false;
  }

  isInsideAnyExit(playerPosition) {
    const exits = this.zoneExits.get(this.activeZoneId) ?? [];
    return exits.some((exit) => isInsideBounds(playerPosition, exit.triggerBounds));
  }

  update(dt, playerStateOrPosition = null) {
    const playerPosition = toWorldPosition(playerStateOrPosition?.position ?? playerStateOrPosition);
    if (playerPosition) {
      this.activeZoneInstance?.setPlayerPosition?.(playerPosition);
    }
    this.activeZoneInstance?.update?.(dt);
    const triggerPosition = playerPosition ?? this.activeZoneInstance?.getPlayerPosition?.() ?? null;
    if (triggerPosition && !this.transitioning) {
      if (!this.triggerArmed) {
        this.triggerArmed = !this.isInsideAnyExit(triggerPosition);
        return;
      }
      this.checkTriggers(triggerPosition);
    }
  }

  render() {
    if (!this.renderer || !this.activeZoneInstance?.scene || !this.activeZoneInstance?.camera) {
      return false;
    }
    this.renderer.render(this.activeZoneInstance.scene, this.activeZoneInstance.camera);
    return true;
  }

  isRenderableActiveZone() {
    return Boolean(this.renderer && this.activeZoneInstance?.scene && this.activeZoneInstance?.camera);
  }

  resize(width, height) {
    const camera = this.activeZoneInstance?.camera;
    if (!camera || !width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix?.();
  }

  projectWorldPosition(worldPosition) {
    const camera = this.activeZoneInstance?.camera;
    const element = this.renderer?.domElement;
    if (!worldPosition || !camera || !element) return null;

    projectedPositionScratch.set(
      worldPosition.x ?? 0,
      worldPosition.y ?? 0,
      worldPosition.z ?? 0,
    );
    projectedPositionScratch.project(camera);

    return {
      x: (projectedPositionScratch.x * 0.5 + 0.5) * element.clientWidth,
      y: (-projectedPositionScratch.y * 0.5 + 0.5) * element.clientHeight,
      visible: projectedPositionScratch.z >= -1
        && projectedPositionScratch.z <= 1
        && projectedPositionScratch.x >= -1.05
        && projectedPositionScratch.x <= 1.05
        && projectedPositionScratch.y >= -1.05
        && projectedPositionScratch.y <= 1.05,
    };
  }

  dispose() {
    this.clearActiveZoneInteractables();
    this.activeZoneInstance?.dispose?.();
    this.resourceTracker?.disposeAll?.();
    this.activeZoneInstance = null;
    this.activeZoneId = null;
    this.triggerArmed = true;
    this.overlay?.remove?.();
    this.overlay = null;
  }
}

export {
  DEFAULT_ZONE_GATES,
  buildZoneGateRequirements,
  evaluateZoneAccess,
};
