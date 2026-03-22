/**
 * Intervention Engine — applies mechanical effects of player interventions to the grid.
 * Each intervention type modifies cell state before scoring.
 */
import { Actions } from './store.js';
import { PHASE_ORDER, PHASES } from './state.js';
import { getCropById } from '../data/crops.js';
import {
  findToolSlotIndex,
  getItemDef,
  getInventoryItemCount,
} from './inventory.js';

const cooldowns = new Map();
const TOOL_COOLDOWNS = {
  water: 30_000,
  protect: 60_000,
  mulch: 120_000,
};

const TOOL_REQUIREMENTS = {
  water: { itemId: 'watering_can', mode: 'durability' },
  harvest: { itemId: 'pruning_shears', mode: 'durability' },
  protect: { itemId: 'pest_spray', mode: 'consumable' },
  mulch: { itemId: 'mulch_bag', mode: 'consumable' },
};

const REPAIR_COSTS = {
  watering_can: [{ itemId: 'plant_matter', count: 2, name: 'Plant Matter' }],
  pruning_shears: [{ itemId: 'scrap_metal', count: 1, name: 'Scrap Metal' }],
  soil_scanner: [{ itemId: 'crystal_shard', count: 1, name: 'Crystal Shard' }],
  smart_watering_can: [{ itemId: 'plant_matter', count: 2, name: 'Plant Matter' }, { itemId: 'crystal_shard', count: 1, name: 'Crystal Shard' }],
};

function getCooldownKey(toolId, cellIndex) {
  return `${toolId}_${cellIndex}`;
}

function getCooldownUntil(state, toolId, cellIndex) {
  const key = getCooldownKey(toolId, cellIndex);
  const stateUntil = state?.season?.toolCooldowns?.[key];
  const memoryUntil = cooldowns.get(key);
  return Math.max(stateUntil ?? 0, memoryUntil ?? 0);
}

function getToolRequirement(toolId) {
  return TOOL_REQUIREMENTS[toolId] ?? null;
}

function getToolSlot(state, toolId) {
  const requirement = getToolRequirement(toolId);
  if (!requirement) return null;
  const slotIndex = findToolSlotIndex(state?.campaign?.inventory, requirement.itemId);
  if (slotIndex < 0) return null;
  return {
    slotIndex,
    requirement,
    slot: state?.campaign?.inventory?.slots?.[slotIndex] ?? null,
  };
}

function isHarvestReady(state) {
  const phase = state?.season?.phase ?? PHASES.PLANNING;
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(PHASES.LATE_SEASON);
}

function getCell(state, cellIndex) {
  return state?.season?.grid?.[cellIndex] ?? null;
}

function getCropName(cell) {
  return getCropById(cell?.cropId)?.name ?? 'crop';
}

/**
 * Get indices of all cells that have a crop planted.
 */
function getPlantedIndices(grid) {
  return grid
    .map((cell, i) => (cell.cropId ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Get indices adjacent to cellIndex (up/down/left/right) that have a crop.
 */
export function getAdjacentPlantedIndices(grid, cellIndex, cols = grid?.cols ?? 8, rows = grid?.rows ?? 4) {
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  const neighbors = [];
  if (row > 0) neighbors.push(cellIndex - cols);
  if (row < rows - 1) neighbors.push(cellIndex + cols);
  if (col > 0) neighbors.push(cellIndex - 1);
  if (col < cols - 1) neighbors.push(cellIndex + 1);
  return neighbors.filter((i) => grid[i] && grid[i].cropId);
}

/**
 * Shield one cell from the current event (event skips this cell).
 */
export function protect(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].protected = true;
}

/**
 * Mulch a cell — adds +0.5 intervention bonus this season
 * and carries +0.25 into the next season.
 */
export function mulch(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].mulched = true;
  grid[cellIndex].carryForwardType = 'mulched';
  grid[cellIndex].interventionBonus += 0.5;
}

/**
 * Swap cropIds between two adjacent cells.
 */
export function swap(grid, indexA, indexB) {
  if (indexA < 0 || indexA >= grid.length) return;
  if (indexB < 0 || indexB >= grid.length) return;
  const temp = grid[indexA].cropId;
  grid[indexA].cropId = grid[indexB].cropId;
  grid[indexB].cropId = temp;
}

/**
 * Companion patch — adds +1.0 intervention bonus to a cell.
 */
export function companion_patch(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].interventionBonus += 1.0;
}

/**
 * Prune — removes a crop from the cell entirely.
 */
export function prune(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].cropId = null;
  grid[cellIndex].damageState = null;
}

/**
 * Accept loss — no-op, just saves the token (no grid modification).
 */
export function accept_loss() {
  // Intentional no-op.
}

export function isOnCooldown(state, toolId, cellIndex, now = Date.now()) {
  return getCooldownUntil(state, toolId, cellIndex) > now;
}

export function setCooldown(store, toolId, cellIndex, durationMs, now = Date.now()) {
  const until = now + durationMs;
  const key = getCooldownKey(toolId, cellIndex);
  cooldowns.set(key, until);
  store.dispatch({
    type: Actions.SET_COOLDOWN,
    payload: { toolId, cellIndex, until, key },
  });
  return until;
}

export function canUseTool(state, toolId, cellIndex, now = Date.now()) {
  const cell = getCell(state, cellIndex);
  if (!cell) {
    return { valid: false, reason: 'No bed cell here.' };
  }

  if (toolId === 'hand') {
    return { valid: true, reason: '' };
  }

  const toolSlot = getToolSlot(state, toolId);
  const requirement = getToolRequirement(toolId);
  if (requirement?.mode === 'durability' && !toolSlot) {
    return { valid: false, reason: 'Tool not in inventory.' };
  }
  if (requirement?.mode === 'durability' && (toolSlot.slot?.durability ?? getItemDef(requirement.itemId).durability ?? 0) <= 0) {
    return { valid: false, reason: 'Tool is broken — repair needed.' };
  }
  if (requirement?.mode === 'consumable' && getInventoryItemCount(state?.campaign?.inventory, requirement.itemId) <= 0) {
    return { valid: false, reason: 'Missing required supply.' };
  }

  if (toolId === 'plant') {
    if (cell.cropId) {
      return { valid: false, reason: 'Cell already has a crop.' };
    }
    return { valid: true, reason: '' };
  }

  if (toolId === 'water') {
    if (!cell.cropId) {
      return { valid: false, reason: 'Water needs a planted cell.' };
    }
    if (isOnCooldown(state, toolId, cellIndex, now)) {
      return { valid: false, reason: 'Recently watered.' };
    }
    return { valid: true, reason: '' };
  }

  if (toolId === 'harvest') {
    if (!cell.cropId) {
      return { valid: false, reason: 'Nothing to harvest.' };
    }
    if (!isHarvestReady(state)) {
      return { valid: false, reason: 'Crop is not ready yet.' };
    }
    return { valid: true, reason: '' };
  }

  if (toolId === 'protect') {
    if (!cell.cropId) {
      return { valid: false, reason: 'Protect needs a planted cell.' };
    }
    if (cell.protected) {
      return { valid: false, reason: 'Cell is already protected.' };
    }
    if (isOnCooldown(state, toolId, cellIndex, now)) {
      return { valid: false, reason: 'Protection is cooling down.' };
    }
    return { valid: true, reason: '' };
  }

  if (toolId === 'mulch') {
    if (cell.mulched || cell.carryForwardType === 'enriched') {
      return { valid: false, reason: 'Cell is already mulched.' };
    }
    if (isOnCooldown(state, toolId, cellIndex, now)) {
      return { valid: false, reason: 'Mulch is cooling down.' };
    }
    return { valid: true, reason: '' };
  }

  return { valid: false, reason: 'Tool not supported.' };
}

export function executeToolAction(store, toolId, cellIndex, now = Date.now()) {
  const state = store.getState();
  const cell = getCell(state, cellIndex);
  const validity = canUseTool(state, toolId, cellIndex, now);
  const toolSlot = getToolSlot(state, toolId);
  if (!validity.valid) {
    return {
      success: false,
      message: validity.reason,
      effects: {},
    };
  }

  switch (toolId) {
    case 'hand':
      return {
        success: true,
        message: cell?.cropId
          ? `Inspecting ${getCropName(cell)}.`
          : 'Inspecting open soil.',
        action: 'inspect',
        effects: { cellIndex },
      };

    case 'plant':
      if (state.selectedCropId) {
        store.dispatch({
          type: Actions.PLANT_CROP,
          payload: { cellIndex, cropId: state.selectedCropId },
        });
        return {
          success: true,
          message: `${getCropById(state.selectedCropId)?.name ?? 'Crop'} planted.`,
          effects: { cellIndex, cropId: state.selectedCropId },
        };
      }
      return {
        success: false,
        message: state.selectedCropId ? 'Ready to plant.' : 'Open the seed kit.',
        action: 'open_crop_picker',
        effects: { cellIndex, selectedCropId: state.selectedCropId ?? null },
      };

    case 'water': {
      const bonus = Math.min(0.3, Math.max(0, 1 - (cell.interventionBonus ?? 0)));
      store.dispatch({
        type: Actions.WATER_CELL,
        payload: {
          cellIndex,
          bonus,
          wateredAt: now,
        },
      });
      if (toolSlot) {
        store.dispatch({
          type: Actions.USE_TOOL,
          payload: { slotIndex: toolSlot.slotIndex, durabilityCost: 1 },
        });
      }
      const until = setCooldown(store, toolId, cellIndex, TOOL_COOLDOWNS.water, now);
      return {
        success: true,
        message: `${getCropName(cell)} watered.`,
        effects: { cellIndex, bonus, cooldownUntil: until },
      };
    }

    case 'harvest': {
      const cropId = cell.cropId;
      store.dispatch({
        type: Actions.HARVEST_CELL,
        payload: { cellIndex, harvestedAt: now, cropId },
      });
      if (toolSlot) {
        store.dispatch({
          type: Actions.USE_TOOL,
          payload: { slotIndex: toolSlot.slotIndex, durabilityCost: 1 },
        });
      }
      return {
        success: true,
        message: `${getCropName(cell)} harvested.`,
        effects: { cellIndex, cropId },
      };
    }

    case 'protect': {
      store.dispatch({
        type: Actions.SET_PROTECTION,
        payload: { cellIndex, protected: true },
      });
      store.dispatch({
        type: Actions.REMOVE_ITEM,
        payload: { itemId: 'pest_spray', count: 1 },
      });
      const until = setCooldown(store, toolId, cellIndex, TOOL_COOLDOWNS.protect, now);
      return {
        success: true,
        message: `${getCropName(cell)} protected.`,
        effects: { cellIndex, protected: true, cooldownUntil: until },
      };
    }

    case 'mulch': {
      store.dispatch({
        type: Actions.CARRY_FORWARD,
        payload: { cellIndex, carryForwardType: 'enriched', mulched: true },
      });
      store.dispatch({
        type: Actions.WATER_CELL,
        payload: {
          cellIndex,
          bonus: 0.2,
        },
      });
      store.dispatch({
        type: Actions.REMOVE_ITEM,
        payload: { itemId: 'mulch_bag', count: 1 },
      });
      const until = setCooldown(store, toolId, cellIndex, TOOL_COOLDOWNS.mulch, now);
      return {
        success: true,
        message: `${cell?.cropId ? getCropName(cell) : 'Soil'} mulched.`,
        effects: { cellIndex, carryForwardType: 'enriched', cooldownUntil: until },
      };
    }

    default:
      return {
        success: false,
        message: 'Tool action not implemented.',
        effects: {},
      };
  }
}

export function getRepairCost(itemId) {
  return REPAIR_COSTS[itemId] ?? [];
}

export function getMaxDurability(itemId) {
  return getItemDef(itemId)?.durability ?? 0;
}

export function repairTool(store, inventory, slotIndex) {
  const slot = inventory.getSlots()[slotIndex];
  if (!slot || slot.category !== 'tools') {
    return { success: false, reason: 'Not a tool' };
  }

  const repairCost = getRepairCost(slot.itemId);
  for (const material of repairCost) {
    if (!inventory.hasItem(material.itemId, material.count)) {
      return { success: false, reason: `Need ${material.count}x ${material.name}` };
    }
  }

  repairCost.forEach((material) => {
    inventory.removeItem(material.itemId, material.count);
  });

  const restoredTo = getMaxDurability(slot.itemId);
  store.dispatch({
    type: Actions.REPAIR_TOOL,
    payload: { slotIndex, restoredTo },
  });

  return { success: true, message: 'Tool repaired!' };
}

/**
 * Apply an intervention by id using explicit target indices.
 */
export function applyIntervention(grid, interventionId, targetA = -1, targetB = -1) {
  if (interventionId === 'accept_loss') {
    accept_loss();
    return;
  }

  if (interventionId === 'protect') {
    if (targetA >= 0) protect(grid, targetA);
    return;
  }

  if (interventionId === 'mulch') {
    if (targetA >= 0) mulch(grid, targetA);
    return;
  }

  if (interventionId === 'companion_patch') {
    if (targetA >= 0) companion_patch(grid, targetA);
    return;
  }

  if (interventionId === 'prune') {
    if (targetA >= 0) prune(grid, targetA);
    return;
  }

  if (interventionId === 'swap') {
    if (targetA >= 0 && targetB >= 0) swap(grid, targetA, targetB);
  }
}

export function getTargetableCells(grid, interventionId, firstCell = -1) {
  const planted = getPlantedIndices(grid);

  if (interventionId === 'accept_loss') return [];
  if (interventionId === 'swap') {
    if (firstCell >= 0) {
      return getAdjacentPlantedIndices(grid, firstCell);
    }
    return planted.filter((index) => getAdjacentPlantedIndices(grid, index).length > 0);
  }

  return planted;
}
