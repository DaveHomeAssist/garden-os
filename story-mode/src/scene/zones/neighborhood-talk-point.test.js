import { describe, it, expect } from 'vitest';
import WORLD_MAP from 'specs/WORLD_MAP.json';
import { InteractionSystem } from '../../game/interaction.js';
import { neighborhoodNpcPlacement } from './neighborhood.js';
import { listAllNPCs } from '../../data/npcs.js';

const zone = WORLD_MAP.zones.neighborhood;
const blockers = zone.blockers;
const inside = (p) => blockers.some((b) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ);
// Every place an NPC can stand in the Neighborhood: its WORLD_MAP slot (the
// fallback) and any season whose schedule puts it here. Each is checked on
// its own, with the rest of that season's neighbours registered alongside.
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const slotFor = (id) => zone.npcSlots.find((s) => s.npcId === id)?.position;
const standings = [];
SEASONS.forEach((season) => {
  const here = [];
  listAllNPCs().forEach((npc) => {
    const sched = npc.schedule?.[season];
    const pos = sched?.zone === 'neighborhood' ? sched.position : slotFor(npc.id);
    if (pos) here.push({ id: npc.id, name: npc.name, activeSchedule: { position: { y: 0, ...pos } } });
  });
  here.forEach((npc) => standings.push({ season, npc, group: here }));
});
const placements = standings.map((s) => ({ ...s, ...neighborhoodNpcPlacement(s.npc, blockers) }));
const moved = placements.filter((p) => p.moved);
const movedKeys = [...new Map(moved.map((p) => [`${p.npc.id}@${p.stand.x.toFixed(2)},${p.stand.z.toFixed(2)}`, p])).entries()];

function promptAt(position, group) {
  const player = { getState: () => ({ position }) };
  const system = new InteractionSystem(null, null, player, []);
  group.forEach((npc) => {
    const { interactable } = neighborhoodNpcPlacement(npc, blockers);
    system.registerInteractable(interactable.id, interactable);
  });
  return system.update(1 / 60);
}

describe('Neighborhood talk points follow the figures', () => {
  it('moves the talk point with every figure nudged out of a house, and leaves the slot data alone', () => {
    expect(moved.length).toBeGreaterThan(0);
    placements.forEach(({ npc, stand, interactable }) => {
      expect(interactable.position.x).toBe(stand.x);
      expect(interactable.position.z).toBe(stand.z);
      expect(interactable.slotPosition).toEqual(npc.activeSchedule.position);
    });
    // runtime only: the source data still has the original slot
    const slot = zone.npcSlots.find((s) => s.npcId === moved[0].npc.id);
    if (slot) expect(neighborhoodNpcPlacement({ id: slot.npcId, activeSchedule: { position: slot.position } }).interactable.slotPosition).toEqual(slot.position);
  });

  it.each(movedKeys)('standing ~0.8 m in front of %s (open side) brings up their talk prompt', (id, p) => {
    const slot = p.npc.activeSchedule.position;
    const dx = p.stand.x - slot.x;
    const dz = p.stand.z - slot.z;
    const len = Math.hypot(dx, dz);
    const at = { x: p.stand.x + (dx / len) * 0.8, y: 0, z: p.stand.z + (dz / len) * 0.8 };
    expect(inside(at), `${id}: player spot is walkable`).toBe(false);
    expect(Math.abs(at.x) < 8 && Math.abs(at.z) < 8, `${id}: inside zone bounds`).toBe(true);
    const highlighted = promptAt(at, p.group);
    expect(highlighted?.id, id).toBe(`npc_${p.npc.id}`);
    expect(highlighted.distance).toBeLessThanOrEqual(0.8 + 1e-6);
  });
});
