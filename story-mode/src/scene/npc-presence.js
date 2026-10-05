/**
 * Where an NPC actually stands right now.
 *
 * `data/npcs.js` schedules can put an NPC in a zone the player cannot enter
 * yet (Maya in the gated meadow in spring/summer, Gus at the gated forest
 * edge in fall, Lila in the gated greenhouse in winter) or nowhere at all
 * (Maya in winter). That made their quests unreachable. When the scheduled
 * zone is missing or still locked for the player, the NPC waits at their
 * neighborhood slot instead, so they can always be talked to.
 */
import WORLD_MAP from 'specs/WORLD_MAP.json';

import { NPC_REGISTRY, getNPC } from '../data/npcs.js';
import { evaluateZoneAccess } from './zone-manager.js';

const FALLBACK_ZONE = 'neighborhood';

function getNeighborhoodSlot(npc) {
  const slot = WORLD_MAP?.zones?.[FALLBACK_ZONE]?.npcSlots?.find((entry) => entry.npcId === npc.id);
  if (slot?.position) return { ...slot.position };
  const scheduled = Object.values(npc.schedule ?? {}).find((entry) => entry?.zone === FALLBACK_ZONE);
  return scheduled?.position ? { ...scheduled.position } : { x: 0, z: 2 };
}

function resolveNpcPresence(npcId, state, { canEnterZone } = {}) {
  const npc = getNPC(npcId);
  if (!npc) return null;
  const season = state?.season?.season ?? state?.campaign?.currentSeason ?? 'spring';
  const scheduled = npc.schedule?.[season] ?? null;
  const isOpen = canEnterZone ?? ((zoneId) => evaluateZoneAccess(zoneId, state).allowed);
  if (scheduled?.zone && (scheduled.zone === FALLBACK_ZONE || isOpen(scheduled.zone))) {
    return { zone: scheduled.zone, position: { ...scheduled.position }, fallback: false };
  }
  return { zone: FALLBACK_ZONE, position: getNeighborhoodSlot(npc), fallback: true };
}

function getNPCsPresentInZone(zoneId, state, options = {}) {
  return Object.values(NPC_REGISTRY)
    .map((npc) => {
      const presence = resolveNpcPresence(npc.id, state, options);
      if (!presence || presence.zone !== zoneId) return null;
      return {
        ...npc,
        activeSchedule: { zone: presence.zone, position: presence.position },
        presenceFallback: presence.fallback,
      };
    })
    .filter(Boolean);
}

export {
  getNPCsPresentInZone,
  resolveNpcPresence,
};
