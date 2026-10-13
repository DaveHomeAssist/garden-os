/**
 * Multiple garden beds.
 *
 * Canonical model: every bed the player owns has a record in campaign.beds.
 * The active bed is projected into the live season: season.grid (with its
 * cols and rows), season.harvestResult, campaign.soilHealth, and
 * campaign.previousGrid always describe campaign.activeBedId. While a bed is
 * active its record in campaign.beds is a parked copy that is refreshed on
 * every switch; read a bed through getBedGrid() so the active one comes from
 * the projection, never from the parked copy.
 *
 * Switching stashes the projection into the outgoing bed's record and loads
 * the incoming bed's record into the projection, so each bed keeps its own
 * crops, soil, history, and last harvest.
 */
import WORLD_MAP from 'specs/WORLD_MAP.json';

import { COLS, ROWS, attachGridMeta, createGrid } from './state.js';

const HOME_BED_ID = 'player_plot';
const BED_KIT_ITEM_ID = 'raised_bed_kit';
const BED_ID_RE = /^[a-z][a-z0-9_]{2,39}$/;
const BED_NAME_MAX = 32;
// Harvest is being scored and the season is rolling; a switch would score the
// wrong bed.
const BED_SWITCH_LOCKED_PHASES = new Set(['HARVEST', 'TRANSITION']);

function cloneCells(grid = []) {
  return grid.map((cell) => ({ ...cell }));
}

function getZoneBedSlots(zoneId, worldMap = WORLD_MAP) {
  return Number(worldMap.zones?.[zoneId]?.bedSlots ?? 0);
}

function getMaxBeds(worldMap = WORLD_MAP) {
  return Object.values(worldMap.zones ?? {}).reduce((total, zone) => total + Number(zone.bedSlots ?? 0), 0);
}

function countBedsInZone(campaign, zoneId) {
  return Object.values(campaign?.beds ?? {}).filter((bed) => bed?.zone === zoneId).length;
}

function snapshotProjection(state, base = {}) {
  const season = state.season ?? {};
  const campaign = state.campaign ?? {};
  const cols = season.gridCols ?? season.grid?.cols ?? COLS;
  const rows = season.gridRows ?? season.grid?.rows ?? ROWS;
  return {
    ...base,
    grid: cloneCells(season.grid ?? createGrid(cols, rows)),
    gridCols: cols,
    gridRows: rows,
    harvestResult: season.harvestResult ? structuredClone(season.harvestResult) : null,
    soilHealth: Array.isArray(campaign.soilHealth) ? [...campaign.soilHealth] : null,
    previousGrid: Array.isArray(campaign.previousGrid) ? cloneCells(campaign.previousGrid) : null,
  };
}

/**
 * Make sure the active bed has a record. Older saves have one implicit bed
 * that lives only in the season grid; it becomes the home bed losslessly.
 * Mutates and returns nextState.
 */
function ensureActiveBedRecord(nextState) {
  const campaign = nextState.campaign;
  campaign.beds = campaign.beds ?? {};
  const activeBedId = campaign.activeBedId ?? HOME_BED_ID;
  campaign.activeBedId = activeBedId;
  if (!campaign.beds[activeBedId]) {
    campaign.beds[activeBedId] = snapshotProjection(nextState, {
      id: activeBedId,
      name: activeBedId === HOME_BED_ID ? 'Home Bed' : activeBedId,
      zone: HOME_BED_ID,
      history: [],
    });
  }
  return nextState;
}

function canSwitchBed(state) {
  return !BED_SWITCH_LOCKED_PHASES.has(state?.season?.phase);
}

/**
 * Park the active projection in its record and load another bed into the
 * projection. Mutates nextState. Returns true when the active bed changed.
 */
function switchActiveBedInState(nextState, targetBedId) {
  ensureActiveBedRecord(nextState);
  const campaign = nextState.campaign;
  const activeBedId = campaign.activeBedId;
  const target = campaign.beds?.[targetBedId];
  if (!target || targetBedId === activeBedId) return false;

  campaign.beds[activeBedId] = snapshotProjection(nextState, campaign.beds[activeBedId]);

  const cols = target.gridCols ?? COLS;
  const rows = target.gridRows ?? ROWS;
  const grid = Array.isArray(target.grid) && target.grid.length === cols * rows
    ? attachGridMeta(cloneCells(target.grid), cols, rows)
    : createGrid(cols, rows);
  nextState.season.grid = grid;
  nextState.season.gridCols = cols;
  nextState.season.gridRows = rows;
  nextState.season.harvestResult = target.harvestResult ? structuredClone(target.harvestResult) : null;
  campaign.soilHealth = Array.isArray(target.soilHealth)
    ? [...target.soilHealth]
    : Array.from({ length: cols * rows }, () => 1.0);
  campaign.previousGrid = Array.isArray(target.previousGrid) ? cloneCells(target.previousGrid) : null;
  campaign.activeBedId = targetBedId;
  return true;
}

/** Validate a bed acquisition against slots, kit, and naming rules. */
function checkBedAcquisition(state, { bedId, name, zone = HOME_BED_ID } = {}, { getItemCount } = {}) {
  if (typeof bedId !== 'string' || !BED_ID_RE.test(bedId)) {
    return { ok: false, code: 'BAD_BED_ID', message: 'A bed needs a lowercase id of 3 to 40 characters.' };
  }
  if (state.campaign?.beds?.[bedId] || bedId === (state.campaign?.activeBedId ?? HOME_BED_ID)) {
    return { ok: false, code: 'BED_EXISTS', message: 'You already have a bed with that id.' };
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > BED_NAME_MAX) {
    return { ok: false, code: 'BAD_BED_NAME', message: `Give the bed a name up to ${BED_NAME_MAX} characters.` };
  }
  const slots = getZoneBedSlots(zone);
  if (slots <= 0) {
    return { ok: false, code: 'NO_BED_SLOT', message: 'There is no room for a bed there.' };
  }
  const homeCounted = state.campaign?.beds?.[state.campaign?.activeBedId ?? HOME_BED_ID] ? 0 : 1;
  if (countBedsInZone(state.campaign, zone) + (zone === HOME_BED_ID ? homeCounted : 0) >= slots) {
    return { ok: false, code: 'BED_LIMIT', message: `That spot holds ${slots} beds at most.` };
  }
  if (typeof getItemCount === 'function' && getItemCount(BED_KIT_ITEM_ID) < 1) {
    return { ok: false, code: 'NO_BED_KIT', message: 'Build a raised bed kit first.' };
  }
  return { ok: true, bedId, name: name.trim(), zone };
}

function createBedRecord({ bedId, name, zone = HOME_BED_ID, cols = COLS, rows = ROWS }) {
  return {
    id: bedId,
    name,
    zone,
    grid: cloneCells(createGrid(cols, rows)),
    gridCols: cols,
    gridRows: rows,
    harvestResult: null,
    soilHealth: Array.from({ length: cols * rows }, () => 1.0),
    previousGrid: null,
    history: [],
  };
}

/** Grid for any bed: the live projection for the active bed, the record otherwise. */
function getBedGrid(state, bedId) {
  if (!bedId) return null;
  if (bedId === (state.campaign?.activeBedId ?? HOME_BED_ID)) return state.season?.grid ?? null;
  return state.campaign?.beds?.[bedId]?.grid ?? null;
}

/** All beds with the active one read from the projection. */
function listBeds(state) {
  const activeBedId = state.campaign?.activeBedId ?? HOME_BED_ID;
  const records = { ...(state.campaign?.beds ?? {}) };
  if (!records[activeBedId]) {
    records[activeBedId] = { id: activeBedId, name: 'Home Bed', zone: HOME_BED_ID, history: [] };
  }
  return Object.values(records).map((bed) => ({
    ...bed,
    active: bed.id === activeBedId,
    grid: bed.id === activeBedId ? state.season?.grid ?? bed.grid : bed.grid,
    planted: (bed.id === activeBedId ? state.season?.grid ?? [] : bed.grid ?? []).filter((cell) => cell?.cropId).length,
  }));
}

export {
  BED_KIT_ITEM_ID,
  BED_SWITCH_LOCKED_PHASES,
  HOME_BED_ID,
  canSwitchBed,
  checkBedAcquisition,
  createBedRecord,
  ensureActiveBedRecord,
  getBedGrid,
  getMaxBeds,
  getZoneBedSlots,
  listBeds,
  snapshotProjection,
  switchActiveBedInState,
};
