import { Actions } from '../game/store.js';
import { ReputationTiers } from '../game/reputation.js';

const FADE_DURATION_MS = 300;
const TIER_THRESHOLDS = Object.fromEntries(Object.values(ReputationTiers).map((tier) => [tier.id, tier.threshold]));
const DEFAULT_ZONE_GATES = {
  player_plot: {},
  neighborhood: {},
  meadow: { skills: { foraging: 3 } },
  riverside: { quests: ['gus_river_path'] },
  forest_edge: { reputation: { old_gus: 'friend' } },
  greenhouse: { skills: { crafting: 5 } },
  festival_grounds: { festival: true },
  market_square: { skills: { social: 2 } },
};

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

function evaluateZoneAccess(zoneId, state, systems = {}, zoneGates = DEFAULT_ZONE_GATES) {
  const requirements = zoneGates[zoneId] ?? {};
  const blockers = [];
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
        message: `This area requires ${tierName} standing with ${npcId}.`,
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
        message: `This area requires ${skillId.replace(/_/g, ' ')} level ${level}.`,
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
        message: `Complete ${questId} to enter this area.`,
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
        message: 'This area only opens during an active festival.',
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

    this.activeZoneInstance?.dispose?.();
    this.resourceTracker?.disposeAll?.();

    const instance = this.factories.get(zoneId)?.();
    this.activeZoneId = zoneId;
    this.activeZoneInstance = instance ?? null;
    this.activeZoneInstance?.setSpawnPoint?.(spawnPoint);

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

  update(dt) {
    this.activeZoneInstance?.update?.(dt);
    const playerPosition = this.activeZoneInstance?.getPlayerPosition?.() ?? null;
    if (playerPosition && !this.transitioning) {
      this.checkTriggers(playerPosition);
    }
  }

  render() {
    if (!this.activeZoneInstance?.scene || !this.activeZoneInstance?.camera) return;
    this.renderer.render(this.activeZoneInstance.scene, this.activeZoneInstance.camera);
  }

  dispose() {
    this.activeZoneInstance?.dispose?.();
    this.resourceTracker?.disposeAll?.();
    this.activeZoneInstance = null;
    this.activeZoneId = null;
    this.overlay?.remove?.();
    this.overlay = null;
  }
}

export {
  DEFAULT_ZONE_GATES,
  evaluateZoneAccess,
};
