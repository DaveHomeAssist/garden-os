// Shared zone and bed rules for both authority runtimes (Node service and
// fetch worker). Pure functions over the generated WORLD_MAP table; each
// runtime passes in its own grid and inventory helpers.
//
// What the server can check today, it checks:
//   - zone ids must exist in WORLD_MAP
//   - quest gates need the quest claimed on the server (claimedQuests)
//   - festival gates need a server-owned active festival
//   - beds need a free WORLD_MAP bed slot and a raised bed kit in the
//     server-owned inventory, and a switch must name a bed the server knows
// Skill and reputation gates stay client-checked until skill and reputation
// state move server side; the gate table already carries their thresholds.

import { AUTHORITY_ZONES } from './authority-world-tables.js';

const HOME_BED_ID = 'player_plot';
const BED_KIT_ITEM_ID = 'raised_bed_kit';
const BED_ID_RE = /^[a-z][a-z0-9_]{2,39}$/;
const BLOCKED_ZONE_PAYLOAD_KEYS = ['currentZone', 'visitedZones', 'gate', 'allowed'];
const BLOCKED_BED_PAYLOAD_KEYS = ['grid', 'bed', 'beds', 'inventory', 'slots'];

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function reject(code, message) {
  return { code, message };
}

function validateZoneChange(data, payload, { zones = AUTHORITY_ZONES } = {}) {
  const blocked = BLOCKED_ZONE_PAYLOAD_KEYS.find((key) => hasOwn(payload, key));
  if (blocked) return reject('TRUSTED_ZONE_PAYLOAD', `Zone change cannot submit trusted field "${blocked}".`);
  const toZone = payload?.toZone;
  if (typeof toZone !== 'string' || !zones[toZone]) {
    return reject('BAD_ZONE_ID', 'Zone change requires a zone from WORLD_MAP.');
  }
  const gate = zones[toZone].gate;
  if (gate?.quest && !data?.claimedQuests?.[gate.quest]) {
    return reject('ZONE_GATED', `Zone ${toZone} opens after quest ${gate.quest} is complete.`);
  }
  if (gate?.activeFestival && !data?.activeFestival) {
    return reject('ZONE_GATED', `Zone ${toZone} only opens during an active festival.`);
  }
  return null;
}

function applyZoneChange(data, payload) {
  const currentZone = payload.toZone;
  const visitedZones = new Set(Array.isArray(data.visitedZones) ? data.visitedZones : [HOME_BED_ID]);
  visitedZones.add(currentZone);
  return {
    ...data,
    currentZone,
    lastSpawnPoint: Number.isFinite(Number(payload.spawnPoint?.x)) && Number.isFinite(Number(payload.spawnPoint?.z))
      ? { x: Number(payload.spawnPoint.x), z: Number(payload.spawnPoint.z) }
      : null,
    visitedZones: [...visitedZones],
  };
}

function bedRecords(data) {
  return data?.beds && typeof data.beds === 'object' ? data.beds : {};
}

function activeBedId(data) {
  return typeof data?.activeBedId === 'string' ? data.activeBedId : HOME_BED_ID;
}

function bedCountInZone(data, zone) {
  const records = bedRecords(data);
  const implicitHome = !records[activeBedId(data)] && zone === HOME_BED_ID ? 1 : 0;
  return Object.values(records).filter((bed) => bed?.zone === zone).length + implicitHome;
}

function validateAcquireBed(data, payload, { getItemCount, zones = AUTHORITY_ZONES } = {}) {
  const blocked = BLOCKED_BED_PAYLOAD_KEYS.find((key) => hasOwn(payload, key));
  if (blocked) return reject('TRUSTED_BED_PAYLOAD', `Bed actions cannot submit trusted field "${blocked}".`);
  const { bedId, name } = payload ?? {};
  const zone = payload?.zone ?? HOME_BED_ID;
  if (typeof bedId !== 'string' || !BED_ID_RE.test(bedId)) return reject('BAD_BED_ID', 'A bed needs a lowercase id of 3 to 40 characters.');
  if (bedRecords(data)[bedId] || bedId === activeBedId(data)) return reject('BED_EXISTS', 'That bed already exists.');
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 32) return reject('BAD_BED_NAME', 'A bed name is 1 to 32 characters.');
  const slots = Number(zones[zone]?.bedSlots ?? 0);
  if (slots <= 0) return reject('NO_BED_SLOT', 'There is no bed slot in that zone.');
  if (bedCountInZone(data, zone) >= slots) return reject('BED_LIMIT', `That zone holds ${slots} beds at most.`);
  if (getItemCount(data?.inventory, BED_KIT_ITEM_ID) < 1) return reject('NO_BED_KIT', 'Building a bed needs a raised bed kit.');
  return null;
}

function applyAcquireBed(data, payload, { createGrid, removeItem }) {
  const records = { ...bedRecords(data) };
  const homeId = activeBedId(data);
  if (!records[homeId]) {
    records[homeId] = { grid: createGrid(data.grid), name: 'Home Bed', zone: HOME_BED_ID };
  }
  records[payload.bedId] = {
    grid: createGrid([]),
    name: payload.name.trim(),
    zone: payload.zone ?? HOME_BED_ID,
  };
  const removed = removeItem(data.inventory, BED_KIT_ITEM_ID, 1);
  return {
    ...data,
    activeBedId: homeId,
    beds: records,
    inventory: removed.inventory,
    lastBedChange: { bedId: payload.bedId, kind: 'acquire', bedCount: Object.keys(records).length },
  };
}

function validateSwitchBed(data, payload) {
  const blocked = BLOCKED_BED_PAYLOAD_KEYS.find((key) => hasOwn(payload, key));
  if (blocked) return reject('TRUSTED_BED_PAYLOAD', `Bed actions cannot submit trusted field "${blocked}".`);
  const bedId = payload?.bedId;
  if (typeof bedId !== 'string' || !bedRecords(data)[bedId]) return reject('UNKNOWN_BED', 'Switch requires a bed the server knows.');
  if (bedId === activeBedId(data)) return reject('BED_ALREADY_ACTIVE', 'That bed is already active.');
  return null;
}

function applySwitchBed(data, payload, { createGrid }) {
  const records = { ...bedRecords(data) };
  const outgoing = activeBedId(data);
  records[outgoing] = { ...(records[outgoing] ?? { name: 'Home Bed', zone: HOME_BED_ID }), grid: createGrid(data.grid) };
  const incoming = records[payload.bedId];
  return {
    ...data,
    activeBedId: payload.bedId,
    beds: records,
    grid: createGrid(incoming.grid),
    lastBedChange: { bedId: payload.bedId, kind: 'switch', bedCount: Object.keys(records).length },
  };
}

export {
  AUTHORITY_ZONES,
  BED_KIT_ITEM_ID,
  HOME_BED_ID,
  applyAcquireBed,
  applySwitchBed,
  applyZoneChange,
  validateAcquireBed,
  validateSwitchBed,
  validateZoneChange,
};
