import { getYearForChapter, SEASON_LABELS } from './ui-constants.js';

export function getRotatedSeasonLabel(seasonId) {
  const order = ['spring', 'summer', 'fall', 'winter'];
  const index = order.indexOf(seasonId);
  const next = order[(index + 1) % order.length] ?? 'spring';
  return SEASON_LABELS[next];
}

const TOOL_MAP = {
  watering_can: 'water',
  smart_watering_can: 'water',
  pruning_shears: 'harvest',
  pest_spray: 'protect',
  mulch_bag: 'mulch',
  fertilizer_bag: 'mulch',
  soil_scanner: 'hand',
};

export function buildBackpackData({
  state,
  inventory,
  craftingSystem,
  skillSystem,
  toolHUD,
  getItemDef,
  getCropById,
  getRecipeById,
  getRecipes,
  getKeepsakeById,
  getKeepsakeSlots,
  persistState,
  syncPlayerTool,
  showToast,
  updateHUD,
  store,
  Actions,
}) {
  const inventoryState = inventory.getState();
  const unlockedKeepsakes = (state.campaign.keepsakes ?? []).map((entry) => ({
    ...entry,
    ...(getKeepsakeById(entry.id) ?? {}),
  }));
  const recipesCompleted = (state.campaign.recipesCompleted ?? [])
    .map((recipeId) => ({ id: recipeId, ...(getRecipeById(recipeId) ?? { name: recipeId }) }));
  const pantryEntries = Object.entries(state.campaign.pantry ?? {})
    .filter(([, count]) => count > 0)
    .map(([cropId, count]) => ({
      id: cropId,
      name: getCropById(cropId)?.name ?? cropId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const availableRecipes = craftingSystem.getAvailableRecipes().map((recipe) => ({
    ...recipe,
    craftCheck: craftingSystem.canCraft(recipe.id),
    outputDef: getItemDef(recipe.output?.itemId),
  }));

  return {
    inventory: {
      slots: inventoryState.slots.map((slot, index) => (
        slot
          ? { ...slot, index, itemDef: getItemDef(slot.itemId) }
          : null
      )),
      capacity: inventoryState.capacity,
      tier: inventoryState.tier,
    },
    keepsakeSlots: getKeepsakeSlots(),
    unlockedKeepsakes,
    recipesCompleted,
    availableRecipes,
    totalRecipes: Object.keys(getRecipes()).length,
    pantryEntries,
    seasonHistory: state.campaign.seasonHistory ?? [],
    skills: {
      crafting: skillSystem.getProgress('crafting'),
    },
    getLatest: () => buildBackpackData({
      state, inventory, craftingSystem, skillSystem, toolHUD,
      getItemDef, getCropById, getRecipeById, getRecipes,
      getKeepsakeById, getKeepsakeSlots, persistState,
      syncPlayerTool, showToast, updateHUD, store, Actions,
    }),
    actions: {
      onMoveSlot(fromIndex, toIndex) {
        const result = inventory.moveSlot(fromIndex, toIndex);
        if (result.success) persistState();
        return result;
      },
      onSplitStack(fromIndex, count, toIndex) {
        const result = inventory.splitStack(fromIndex, count, toIndex);
        if (result.success) persistState();
        return result;
      },
      onDropItem(slotIndex, count = 1) {
        const slot = inventory.getSlots()[slotIndex];
        if (!slot) return { success: false };
        const result = inventory.removeItem(slot.itemId, count);
        if (result.removed) persistState();
        return result;
      },
      onUseItem(slotIndex) {
        const slot = inventory.getSlots()[slotIndex];
        if (!slot) return { success: false, message: 'Nothing selected.' };
        const itemDef = getItemDef(slot.itemId);
        if (itemDef.category === 'seeds' && itemDef.cropId) {
          store.dispatch({
            type: Actions.SET_SELECTED_CROP,
            payload: { cropId: itemDef.cropId },
          });
          persistState();
          return { success: true, message: `${itemDef.name} ready to plant.` };
        }
        const mappedTool = TOOL_MAP[slot.itemId];
        if (mappedTool) {
          toolHUD?.selectTool(mappedTool);
          syncPlayerTool();
          return { success: true, message: `${itemDef.name} equipped.` };
        }
        return { success: false, message: itemDef.description ?? 'No direct use.' };
      },
      onCraftRecipe(recipeId) {
        const result = craftingSystem.craft(recipeId);
        showToast(result.message, 1800, result.success ? 'success' : 'info');
        if (result.success) {
          updateHUD();
          persistState();
        }
        return result;
      },
    },
  };
}

export function buildWinterReviewData({ state, getCropById, getRecipes, getKeepsakeSlots }) {
  const year = getYearForChapter(state.campaign.currentChapter);
  const review = state.campaign.lastSeasonReview ?? {
    score: 0,
    grade: '–',
    eventsEncountered: [],
    yieldList: [],
    bestCells: [],
    worstCells: [],
  };
  const yearEntries = (state.campaign.journalEntries ?? [])
    .filter((entry) => getYearForChapter(entry.chapter) === year)
    .sort((a, b) => a.chapter - b.chapter);

  const previousGrid = state.campaign.previousGrid ?? [];
  const soilCells = state.season.grid.map((cell, index) => {
    const previousCell = previousGrid[index] ?? null;
    const carryForwardType = previousCell?.carryForwardType ?? null;
    let carryForward = null;
    if (carryForwardType === 'mulched') {
      carryForward = { type: carryForwardType, label: 'Mulched carry-over · +0.25' };
    } else if (carryForwardType === 'compacted') {
      carryForward = { type: carryForwardType, label: 'Compacted carry-over · -0.50' };
    } else if (carryForwardType === 'enriched') {
      carryForward = { type: carryForwardType, label: 'Enriched carry-over · +0.30' };
    }
    return {
      index,
      soilFatigue: cell.soilFatigue ?? 0,
      carryForward,
    };
  });

  const maxFatigue = soilCells.reduce((max, cell) => Math.max(max, cell.soilFatigue), 0);
  const mulchedCount = soilCells.filter((cell) => cell.carryForward?.type === 'mulched').length;
  const compactedCount = soilCells.filter((cell) => cell.carryForward?.type === 'compacted').length;
  const enrichedCount = soilCells.filter((cell) => cell.carryForward?.type === 'enriched').length;
  const recipesCompleted = state.campaign.recipesCompleted?.length ?? 0;
  const totalRecipes = Object.keys(getRecipes()).length;
  const keepsakesUnlocked = state.campaign.keepsakes?.length ?? 0;
  const totalKeepsakes = getKeepsakeSlots().length;

  const decorateCells = (cells) => cells.map((cell) => ({
    ...cell,
    cropName: getCropById(cell.cropId)?.name ?? cell.cropId ?? 'Empty',
  }));

  const hints = [];
  if (maxFatigue >= 0.6) {
    hints.push('Several cells are heavily fatigued. Rotate heavy feeders out of the reddest spots next spring.');
  } else if (maxFatigue >= 0.3) {
    hints.push('A few cells are getting tired. Spread brassicas and fruiting crops around instead of repeating winners.');
  } else {
    hints.push('Soil fatigue is low. You have freedom to chase recipes without fighting the bed too hard.');
  }
  if (mulchedCount > 0) {
    hints.push(`${mulchedCount} cell${mulchedCount === 1 ? '' : 's'} carry mulch into the next season. Those are safe places to restart tender crops.`);
  }
  if (compactedCount > 0) {
    hints.push(`${compactedCount} compacted cell${compactedCount === 1 ? '' : 's'} need relief. Favor roots or low-demand crops there first.`);
  }
  if (enrichedCount > 0) {
    hints.push(`${enrichedCount} enriched cell${enrichedCount === 1 ? '' : 's'} are primed for a push. Save your hungriest crops for those pockets.`);
  }
  if ((review.recipeMatches?.length ?? 0) === 0 && recipesCompleted < totalRecipes) {
    hints.push('No recipe completed last season. Use the pantry list and your strongest cells to aim at one dish on purpose next year.');
  }
  if (!hints.length) {
    hints.push('Nothing urgent is flashing red. Winter is a clean read: preserve what worked and do not overreact.');
  }

  return {
    year,
    yearEntries,
    soilCells,
    lastReview: {
      ...review,
      bestCells: decorateCells(review.bestCells ?? []),
      worstCells: decorateCells(review.worstCells ?? []),
    },
    recipesCompleted,
    totalRecipes,
    keepsakesUnlocked,
    totalKeepsakes,
    hints,
  };
}
