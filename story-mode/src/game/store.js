import {
  attachGridMeta,
  createCampaignState,
  createGameState,
  createGrid,
  createSeasonState,
  DEFAULT_REPUTATION,
  DEFAULT_WORLD_STATE,
  getAvailableGridSizes,
  getGridCols,
  getGridRows,
  GRID_UNLOCKS,
  PHASES,
} from './state.js';
import { scoreBed } from '../scoring/bed-score.js';
import { checkRecipeComplete, getRecipeById, getRecipes } from '../data/crops.js';
import {
  addItemToInventoryState,
  applyToolDurabilityToInventoryState,
  getInventoryItemCount,
  moveInventorySlot,
  normalizeInventoryState,
  removeItemFromInventoryState,
  repairToolInInventoryState,
  splitInventoryStack,
  upgradeInventoryState,
} from './inventory.js';
import {
  awardXPToSkillsState,
  getDefaultSkillsState,
  getSkillXpMap,
  normalizeSkillsState,
} from './skills.js';

const DEFAULT_CELL = {
  cropId: null,
  protected: false,
  mulched: false,
  damageState: null,
  carryForwardType: null,
  eventModifier: 0,
  interventionBonus: 0,
  soilFatigue: 0,
  lastWateredAt: null,
};

const Actions = {
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  PLANT_CROP: 'PLANT_CROP',
  REMOVE_CROP: 'REMOVE_CROP',
  APPLY_EVENT: 'APPLY_EVENT',
  USE_INTERVENTION: 'USE_INTERVENTION',
  SET_DAMAGE: 'SET_DAMAGE',
  SET_PROTECTION: 'SET_PROTECTION',
  UPDATE_SOIL: 'UPDATE_SOIL',
  CARRY_FORWARD: 'CARRY_FORWARD',
  ADVANCE_CHAPTER: 'ADVANCE_CHAPTER',
  AWARD_KEEPSAKE: 'AWARD_KEEPSAKE',
  PUSH_JOURNAL: 'PUSH_JOURNAL',
  LOAD_SAVE: 'LOAD_SAVE',
  NEW_GAME: 'NEW_GAME',
  REPLACE_STATE: 'REPLACE_STATE',
  RESET_SEASON: 'RESET_SEASON',
  SET_SELECTED_CROP: 'SET_SELECTED_CROP',
  WATER_CELL: 'WATER_CELL',
  HARVEST_CELL: 'HARVEST_CELL',
  SET_COOLDOWN: 'SET_COOLDOWN',
  ACCEPT_QUEST: 'ACCEPT_QUEST',
  ABANDON_QUEST: 'ABANDON_QUEST',
  UPDATE_QUEST_STATE: 'UPDATE_QUEST_STATE',
  COMPLETE_QUEST: 'COMPLETE_QUEST',
  ADD_REPUTATION: 'ADD_REPUTATION',
  DECAY_REPUTATION: 'DECAY_REPUTATION',
  ZONE_CHANGED: 'ZONE_CHANGED',
  ZONE_VISITED: 'ZONE_VISITED',
  FESTIVAL_START: 'FESTIVAL_START',
  FESTIVAL_END: 'FESTIVAL_END',
  FESTIVAL_ACTIVITY: 'FESTIVAL_ACTIVITY',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  MOVE_SLOT: 'MOVE_SLOT',
  SPLIT_STACK: 'SPLIT_STACK',
  UPGRADE_INVENTORY: 'UPGRADE_INVENTORY',
  AWARD_XP: 'AWARD_XP',
  LEVEL_UP: 'LEVEL_UP',
  CRAFT_ITEM: 'CRAFT_ITEM',
  USE_TOOL: 'USE_TOOL',
  REPAIR_TOOL: 'REPAIR_TOOL',
  FORAGE: 'FORAGE',
  EXPAND_GRID: 'EXPAND_GRID',
  UNLOCK_BIOME_CROP: 'UNLOCK_BIOME_CROP',
  SET_GAME_MODE: 'SET_GAME_MODE',
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
  ACQUIRE_BED: 'ACQUIRE_BED',
  SWITCH_BED: 'SWITCH_BED',
  EXPAND_BED_GRID: 'EXPAND_BED_GRID',
};

function cloneValue(value) {
  return value == null ? value : structuredClone(value);
}

function cloneArray(value) {
  return Array.isArray(value) ? value.map((entry) => cloneValue(entry)) : [];
}

function normalizeCell(cell = {}) {
  return {
    ...DEFAULT_CELL,
    ...cell,
  };
}

function normalizeGrid(grid, fallbackGrid, cols, rows) {
  const sourceCells = Array.isArray(grid?.cells)
    ? grid.cells
    : (Array.isArray(grid) && grid.length ? grid : fallbackGrid);
  const targetCount = cols * rows;
  const nextGrid = [];
  for (let i = 0; i < targetCount; i++) {
    nextGrid.push(normalizeCell(sourceCells[i] ?? {}));
  }
  return attachGridMeta(nextGrid, cols, rows);
}

function normalizeCampaign(rawCampaign) {
  const fallbackCampaign = createCampaignState();
  const campaign = rawCampaign ?? {};
  const worldState = {
    ...fallbackCampaign.worldState,
    ...(campaign.worldState ?? {}),
  };
  const currentZone = worldState.currentZone ?? DEFAULT_WORLD_STATE.currentZone;
  const visitedZones = Array.from(new Set([
    ...(Array.isArray(worldState.visitedZones) ? worldState.visitedZones : DEFAULT_WORLD_STATE.visitedZones),
    currentZone,
  ]));
  const skills = normalizeSkillsState(campaign.skills ?? campaign.skillXp ?? getDefaultSkillsState());
  return {
    ...fallbackCampaign,
    ...campaign,
    pantry: { ...(fallbackCampaign.pantry ?? {}), ...(campaign.pantry ?? {}) },
    completedChapters: cloneArray(campaign.completedChapters),
    seasonHistory: cloneArray(campaign.seasonHistory),
    recipesCompleted: cloneArray(campaign.recipesCompleted),
    keepsakes: cloneArray(campaign.keepsakes),
    cropsUnlocked: cloneArray(campaign.cropsUnlocked ?? fallbackCampaign.cropsUnlocked),
    journalEntries: cloneArray(campaign.journalEntries),
    seenCutsceneIds: cloneArray(campaign.seenCutsceneIds),
    soilHealth: (() => {
      const base = Array.isArray(campaign.soilHealth) ? [...campaign.soilHealth] : [...fallbackCampaign.soilHealth];
      const gardeningLevel = (normalizeSkillsState(campaign.skills ?? {})).gardening?.level ?? 1;
      const sizes = getAvailableGridSizes(campaign.currentChapter ?? 1, gardeningLevel);
      const best = sizes[sizes.length - 1];
      const needed = best ? best.cols * best.rows : base.length;
      while (base.length < needed) base.push(1.0);
      return base;
    })(),
    previousGrid: Array.isArray(campaign.previousGrid)
      ? campaign.previousGrid.map((cell) => normalizeCell(cell))
      : null,
    lastSeasonReview: campaign.lastSeasonReview ?? null,
    questLog: { ...(fallbackCampaign.questLog ?? {}), ...(campaign.questLog ?? {}) },
    reputation: { ...DEFAULT_REPUTATION, ...(campaign.reputation ?? {}) },
    worldState: {
      ...worldState,
      currentZone,
      visitedZones,
    },
    activeNeighbors: cloneArray(campaign.activeNeighbors ?? fallbackCampaign.activeNeighbors),
    inventory: normalizeInventoryState(campaign.inventory ?? fallbackCampaign.inventory),
    craftedItems: { ...(fallbackCampaign.craftedItems ?? {}), ...(campaign.craftedItems ?? {}) },
    skills,
    skillXp: getSkillXpMap(skills),
    activeFestival: cloneValue(campaign.activeFestival) ?? null,
    lastLevelUp: cloneValue(campaign.lastLevelUp) ?? null,
    beds: cloneValue(campaign.beds ?? fallbackCampaign.beds ?? {}),
    activeBedId: campaign.activeBedId ?? fallbackCampaign.activeBedId ?? 'player_plot',
  };
}

function normalizeSeason(rawSeason, campaign) {
  const chapter = rawSeason?.chapter ?? campaign.currentChapter ?? 1;
  const seasonId = rawSeason?.season ?? campaign.currentSeason ?? 'spring';
  let gridCols = rawSeason?.gridCols ?? rawSeason?.grid?.cols ?? 8;
  let gridRows = rawSeason?.gridRows ?? rawSeason?.grid?.rows ?? 4;

  // Legacy grid migration: expand grid if chapter warrants larger size
  const gardeningLevel = campaign.skills?.gardening?.level ?? 1;
  const available = getAvailableGridSizes(chapter, gardeningLevel);
  const best = available[available.length - 1];
  if (best && (best.cols > gridCols || best.rows > gridRows)) {
    gridCols = Math.max(gridCols, best.cols);
    gridRows = Math.max(gridRows, best.rows);
  }

  const fallbackSeason = createSeasonState(chapter, seasonId, campaign, gridCols, gridRows);
  const season = rawSeason ?? {};

  const normalized = {
    ...fallbackSeason,
    ...season,
    month: season.month ?? fallbackSeason.month,
    gridCols,
    gridRows,
    siteConfig: { ...fallbackSeason.siteConfig, ...(season.siteConfig ?? {}) },
    grid: normalizeGrid(season.grid, fallbackSeason.grid, gridCols, gridRows),
    eventsDrawn: cloneArray(season.eventsDrawn),
    eventTitles: cloneArray(season.eventTitles),
    harvestResult: cloneValue(season.harvestResult),
    lastResolvedEvent: cloneValue(season.lastResolvedEvent),
    lastEventEffectSummary: cloneValue(season.lastEventEffectSummary),
    newlyEarnedKeepsakes: cloneArray(season.newlyEarnedKeepsakes),
    toolCooldowns: { ...(fallbackSeason.toolCooldowns ?? {}), ...(season.toolCooldowns ?? {}) },
    eventActive: cloneValue(season.eventActive),
    campaign,
  };

  if (normalized.phase === 'REVIEW') {
    normalized.phase = PHASES.TRANSITION;
  }
  if (normalized.winterReviewSeen == null) {
    normalized.winterReviewSeen = false;
  }

  return normalized;
}

function normalizeGameState(rawState) {
  const fallbackState = createGameState();
  const inputState = rawState ? structuredClone(rawState) : fallbackState;
  const campaign = normalizeCampaign(inputState.campaign);
  const season = normalizeSeason(inputState.season, campaign);

  return {
    ...fallbackState,
    ...inputState,
    campaign,
    season,
    settings: {
      ...fallbackState.settings,
      ...(inputState.settings ?? {}),
      audio: {
        ...fallbackState.settings.audio,
        ...(inputState.settings?.audio ?? {}),
      },
    },
    selectedCropId: inputState.selectedCropId ?? null,
    cameraMode: inputState.cameraMode ?? fallbackState.cameraMode,
    cameraWeight: inputState.cameraWeight ?? fallbackState.cameraWeight,
    selectedWeight: inputState.selectedWeight ?? fallbackState.selectedWeight,
    panelOpen: inputState.panelOpen ?? fallbackState.panelOpen,
    showChapterIntro: inputState.showChapterIntro ?? fallbackState.showChapterIntro,
  };
}

function cloneGameState(state) {
  return normalizeGameState(state);
}

function replaceState(nextState) {
  return normalizeGameState(nextState);
}

function updateCell(state, cellIndex, updater) {
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= state.season.grid.length) {
    return state;
  }

  const nextState = cloneGameState(state);
  updater(nextState.season.grid[cellIndex], nextState);
  return nextState;
}

function awardKeepsakeToState(state, awarded, includeSeasonQueue = true) {
  if (!awarded?.id) return state;
  if ((state.campaign.keepsakes ?? []).some((entry) => entry.id === awarded.id)) {
    return state;
  }

  const nextState = cloneGameState(state);
  const nextAwarded = { ...awarded };
  nextState.campaign.keepsakes = [...(nextState.campaign.keepsakes ?? []), nextAwarded];
  if (includeSeasonQueue) {
    nextState.season.newlyEarnedKeepsakes = [
      ...(nextState.season.newlyEarnedKeepsakes ?? []),
      nextAwarded,
    ];
  }
  return nextState;
}

function clampReputation(value) {
  return Math.max(0, Math.min(100, value));
}

function applyQuestRewards(nextState, rewards = []) {
  for (const reward of rewards) {
    if (!reward?.type || !reward.id) continue;
    const amount = reward.amount ?? 1;
    switch (reward.type) {
      case 'reputation':
        nextState.campaign.reputation = {
          ...(nextState.campaign.reputation ?? {}),
          [reward.id]: clampReputation((nextState.campaign.reputation?.[reward.id] ?? 0) + amount),
        };
        break;
      case 'seed': {
        const unlocked = new Set(nextState.campaign.cropsUnlocked ?? []);
        unlocked.add(reward.id);
        nextState.campaign.cropsUnlocked = [...unlocked];
        break;
      }
      case 'item':
        nextState.campaign.inventory = addItemToInventoryState(
          nextState.campaign.inventory,
          reward.id,
          amount,
        ).inventory;
        break;
      case 'xp':
        if (nextState.campaign.skills?.[reward.id]) {
          const awarded = awardXPToSkillsState(nextState.campaign.skills, reward.id, amount);
          nextState.campaign.skills = awarded.skills;
          nextState.campaign.skillXp = getSkillXpMap(awarded.skills);
        }
        break;
      default:
        break;
    }
  }
}

function gameReducer(state, action = {}) {
  const { type, payload = {} } = action;

  switch (type) {
    case Actions.NEW_GAME:
      return replaceState(payload.state ?? createGameState());

    case Actions.LOAD_SAVE:
    case Actions.REPLACE_STATE:
      return payload.state ? replaceState(payload.state) : state;

    case Actions.SET_SELECTED_CROP: {
      const nextState = cloneGameState(state);
      nextState.selectedCropId = payload.cropId ?? null;
      return nextState;
    }

    case Actions.SET_COOLDOWN: {
      const nextState = cloneGameState(state);
      const key = payload.key ?? `${payload.toolId}_${payload.cellIndex}`;
      if (!key) return nextState;
      nextState.season.toolCooldowns = {
        ...(nextState.season.toolCooldowns ?? {}),
        [key]: payload.until ?? 0,
      };
      return nextState;
    }

    case Actions.ADD_ITEM: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = addItemToInventoryState(
        nextState.campaign.inventory,
        payload.itemId,
        payload.count ?? 1,
        payload,
      ).inventory;
      return nextState;
    }

    case Actions.REMOVE_ITEM: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = removeItemFromInventoryState(
        nextState.campaign.inventory,
        payload.itemId,
        payload.count ?? 1,
      ).inventory;
      return nextState;
    }

    case Actions.MOVE_SLOT: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = moveInventorySlot(
        nextState.campaign.inventory,
        payload.fromIndex,
        payload.toIndex,
      ).inventory;
      return nextState;
    }

    case Actions.SPLIT_STACK: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = splitInventoryStack(
        nextState.campaign.inventory,
        payload.fromIndex,
        payload.count,
        payload.toIndex,
      ).inventory;
      return nextState;
    }

    case Actions.UPGRADE_INVENTORY: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = upgradeInventoryState(nextState.campaign.inventory).inventory;
      return nextState;
    }

    case Actions.AWARD_XP: {
      if (!payload.skillId || !payload.amount) return state;
      const nextState = cloneGameState(state);
      const awarded = awardXPToSkillsState(nextState.campaign.skills, payload.skillId, payload.amount);
      nextState.campaign.skills = awarded.skills;
      nextState.campaign.skillXp = getSkillXpMap(awarded.skills);
      return nextState;
    }

    case Actions.LEVEL_UP: {
      if (!payload.skillId || !payload.newLevel) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.lastLevelUp = cloneValue({
        skillId: payload.skillId,
        newLevel: payload.newLevel,
        unlockedBuffs: cloneValue(payload.unlockedBuffs) ?? [],
        timestamp: Date.now(),
      });
      return nextState;
    }

    case Actions.PLANT_CROP:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.cropId = payload.cropId ?? null;
        cell.damageState = null;
      });

    case Actions.REMOVE_CROP:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.cropId = null;
        cell.damageState = null;
      });

    case Actions.WATER_CELL:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.interventionBonus = Math.min(1, (cell.interventionBonus ?? 0) + (payload.bonus ?? 0));
        if ('wateredAt' in payload) {
          cell.lastWateredAt = payload.wateredAt ?? null;
        }
      });

    case Actions.HARVEST_CELL: {
      const cellIndex = payload.cellIndex;
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= state.season.grid.length) {
        return state;
      }

      const sourceCell = state.season.grid[cellIndex];
      if (!sourceCell?.cropId) {
        return state;
      }

      const nextState = cloneGameState(state);
      const cropId = sourceCell.cropId;
      const nextCell = nextState.season.grid[cellIndex];
      nextCell.cropId = null;
      nextCell.damageState = null;
      nextCell.protected = false;

      nextState.campaign.pantry = {
        ...(nextState.campaign.pantry ?? {}),
        [cropId]: (nextState.campaign.pantry?.[cropId] ?? 0) + 1,
      };
      nextState.campaign.inventory = addItemToInventoryState(
        nextState.campaign.inventory,
        cropId,
        payload.yieldCount ?? 1,
      ).inventory;

      const completed = new Set(nextState.campaign.recipesCompleted ?? []);
      Object.keys(getRecipes()).forEach((recipeId) => {
        if (checkRecipeComplete(recipeId, nextState.campaign.pantry)) {
          const recipe = getRecipeById(recipeId);
          if (recipe) {
            completed.add(recipeId);
          }
        }
      });
      nextState.campaign.recipesCompleted = [...completed];
      nextState.season.harvestResult = scoreBed(
        nextState.season.grid,
        nextState.season.siteConfig,
        nextState.season.season,
        nextState.campaign.pantry,
      );
      return nextState;
    }

    case Actions.SET_DAMAGE:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.damageState = payload.damageState ?? null;
      });

    case Actions.SET_PROTECTION:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.protected = Boolean(payload.protected);
      });

    case Actions.UPDATE_SOIL:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.soilFatigue = payload.soilFatigue ?? cell.soilFatigue;
      });

    case Actions.CARRY_FORWARD:
      return updateCell(state, payload.cellIndex, (cell) => {
        cell.carryForwardType = payload.carryForwardType ?? null;
        if ('mulched' in payload) {
          cell.mulched = Boolean(payload.mulched);
        }
      });

    case Actions.ADVANCE_PHASE: {
      if (payload.state) return replaceState(payload.state);
      if (!payload.phase) return state;
      const nextState = cloneGameState(state);
      nextState.season.phase = payload.phase;
      if (payload.winterReviewSeen != null) {
        nextState.season.winterReviewSeen = Boolean(payload.winterReviewSeen);
      }
      return nextState;
    }

    case Actions.ADVANCE_CHAPTER: {
      if (payload.state) return replaceState(payload.state);
      const nextState = cloneGameState(state);
      nextState.campaign.currentChapter = payload.chapter ?? (nextState.campaign.currentChapter + 1);
      if (payload.season) {
        nextState.campaign.currentSeason = payload.season;
      }
      return nextState;
    }

    case Actions.ACCEPT_QUEST: {
      const questId = payload.questId;
      if (!questId) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.questLog = {
        ...(nextState.campaign.questLog ?? {}),
        [questId]: {
          ...(nextState.campaign.questLog?.[questId] ?? {}),
          state: 'ACCEPTED',
          acceptedAt: payload.acceptedAt ?? Date.now(),
          acceptedSeason: payload.acceptedSeason ?? nextState.season.season,
          acceptedChapter: payload.acceptedChapter ?? nextState.campaign.currentChapter,
          completedAt: null,
          abandonedAt: null,
          failedAt: null,
        },
      };
      return nextState;
    }

    case Actions.ABANDON_QUEST: {
      const questId = payload.questId;
      if (!questId) return state;
      const entry = state.campaign.questLog?.[questId];
      if (!entry) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.questLog = {
        ...(nextState.campaign.questLog ?? {}),
        [questId]: {
          ...entry,
          state: 'ABANDONED',
          abandonedAt: payload.abandonedAt ?? Date.now(),
        },
      };
      return nextState;
    }

    case Actions.UPDATE_QUEST_STATE: {
      const questId = payload.questId;
      if (!questId || !payload.newState) return state;
      const nextState = cloneGameState(state);
      const current = nextState.campaign.questLog?.[questId] ?? {};
      nextState.campaign.questLog = {
        ...(nextState.campaign.questLog ?? {}),
        [questId]: {
          ...current,
          state: payload.newState,
          updatedAt: payload.updatedAt ?? Date.now(),
          ...(payload.meta ?? {}),
        },
      };
      return nextState;
    }

    case Actions.COMPLETE_QUEST: {
      const questId = payload.questId;
      if (!questId) return state;
      const nextState = cloneGameState(state);
      const current = nextState.campaign.questLog?.[questId] ?? {};
      nextState.campaign.questLog = {
        ...(nextState.campaign.questLog ?? {}),
        [questId]: {
          ...current,
          state: 'COMPLETED',
          completedAt: payload.completedAt ?? Date.now(),
        },
      };
      applyQuestRewards(nextState, payload.rewards ?? []);
      return nextState;
    }

    case Actions.CRAFT_ITEM: {
      if (!payload.itemProduced?.itemId) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.craftedItems = {
        ...(nextState.campaign.craftedItems ?? {}),
        [payload.itemProduced.itemId]: (nextState.campaign.craftedItems?.[payload.itemProduced.itemId] ?? 0) + (payload.itemProduced.count ?? 1),
      };
      return nextState;
    }

    case Actions.USE_TOOL: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = applyToolDurabilityToInventoryState(
        nextState.campaign.inventory,
        payload.slotIndex,
        payload.durabilityCost ?? 1,
      ).inventory;
      return nextState;
    }

    case Actions.REPAIR_TOOL: {
      const nextState = cloneGameState(state);
      nextState.campaign.inventory = repairToolInInventoryState(
        nextState.campaign.inventory,
        payload.slotIndex,
        payload.restoredTo,
      ).inventory;
      return nextState;
    }

    case Actions.ADD_REPUTATION: {
      const npcId = payload.npcId;
      if (!npcId) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.reputation = {
        ...(nextState.campaign.reputation ?? {}),
        [npcId]: clampReputation((nextState.campaign.reputation?.[npcId] ?? 0) + (payload.amount ?? 0)),
      };
      return nextState;
    }

    case Actions.DECAY_REPUTATION: {
      const nextState = cloneGameState(state);
      const nextReputation = { ...(nextState.campaign.reputation ?? DEFAULT_REPUTATION) };
      Object.keys(nextReputation).forEach((npcId) => {
        nextReputation[npcId] = clampReputation((nextReputation[npcId] ?? 0) - 1);
      });
      nextState.campaign.reputation = nextReputation;
      return nextState;
    }

    case Actions.ZONE_CHANGED: {
      const toZone = payload.toZone;
      if (!toZone) return state;
      const nextState = cloneGameState(state);
      const visitedZones = new Set(nextState.campaign.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones);
      visitedZones.add(toZone);
      nextState.campaign.worldState = {
        ...DEFAULT_WORLD_STATE,
        ...(nextState.campaign.worldState ?? {}),
        currentZone: toZone,
        visitedZones: [...visitedZones],
        lastSpawnPoint: payload.spawnPoint ?? null,
      };
      return nextState;
    }

    case Actions.ZONE_VISITED: {
      const zoneId = payload.zoneId;
      if (!zoneId) return state;
      const nextState = cloneGameState(state);
      const visitedZones = new Set(nextState.campaign.worldState?.visitedZones ?? DEFAULT_WORLD_STATE.visitedZones);
      visitedZones.add(zoneId);
      nextState.campaign.worldState = {
        ...DEFAULT_WORLD_STATE,
        ...(nextState.campaign.worldState ?? {}),
        visitedZones: [...visitedZones],
      };
      return nextState;
    }

    case Actions.FESTIVAL_START: {
      const festivalId = payload.festivalId;
      if (!festivalId) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.activeFestival = {
        id: festivalId,
        season: payload.season ?? nextState.season.season,
        month: payload.month ?? nextState.season.month ?? 1,
        startedAt: payload.startedAt ?? Date.now(),
        activitiesCompleted: cloneArray(payload.activitiesCompleted),
        mechanics: cloneValue(payload.mechanics) ?? {},
      };
      return nextState;
    }

    case Actions.FESTIVAL_END: {
      if (!state.campaign.activeFestival) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.activeFestival = null;
      return nextState;
    }

    case Actions.FESTIVAL_ACTIVITY: {
      if (!state.campaign.activeFestival || !payload.activityId) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.activeFestival = {
        ...(nextState.campaign.activeFestival ?? {}),
        activitiesCompleted: [
          ...new Set([
            ...(nextState.campaign.activeFestival?.activitiesCompleted ?? []),
            payload.activityId,
          ]),
        ],
      };
      applyQuestRewards(nextState, payload.rewards ?? []);
      return nextState;
    }

    case Actions.FORAGE: {
      if (!payload.items?.length) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.worldState = {
        ...DEFAULT_WORLD_STATE,
        ...(nextState.campaign.worldState ?? {}),
        lastForage: {
          spotId: payload.spotId,
          zoneId: payload.zoneId,
          items: cloneValue(payload.items),
          xpGained: payload.xpGained ?? 0,
          timestamp: Date.now(),
        },
      };
      return nextState;
    }

    case Actions.EXPAND_GRID: {
      const newRows = payload.rows;
      const maxRows = Math.max(...GRID_UNLOCKS.map((u) => u.rows));
      const currentRows = state.season.gridRows ?? state.season.grid?.rows ?? 4;
      const currentCols = state.season.gridCols ?? state.season.grid?.cols ?? 8;

      if (!Number.isInteger(newRows) || newRows <= currentRows || newRows > maxRows) {
        return state;
      }

      const nextState = cloneGameState(state);
      const newGrid = createGrid(currentCols, newRows);

      // Copy existing cell data into the new grid (preserve planted crops)
      for (let i = 0; i < nextState.season.grid.length; i++) {
        newGrid[i] = { ...newGrid[i], ...nextState.season.grid[i] };
      }

      nextState.season.grid = attachGridMeta(newGrid, currentCols, newRows);
      nextState.season.gridRows = newRows;
      nextState.season.gridCols = currentCols;
      return nextState;
    }

    case Actions.UNLOCK_BIOME_CROP: {
      const cropId = payload.cropId;
      if (!cropId) return state;
      const nextState = cloneGameState(state);
      const unlocked = new Set(nextState.campaign.biomeCropsUnlocked ?? []);
      if (unlocked.has(cropId)) return state;
      unlocked.add(cropId);
      nextState.campaign.biomeCropsUnlocked = [...unlocked];
      return nextState;
    }

    case Actions.AWARD_KEEPSAKE:
      return awardKeepsakeToState(state, payload.awarded ?? payload.keepsake, payload.includeSeasonQueue !== false);

    case Actions.PUSH_JOURNAL: {
      if (!payload.entry) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.journalEntries = [
        ...(nextState.campaign.journalEntries ?? []),
        cloneValue(payload.entry),
      ];
      return nextState;
    }

    case Actions.APPLY_EVENT: {
      if (payload.state) return replaceState(payload.state);
      const nextState = cloneGameState(state);
      if (Array.isArray(payload.grid)) {
        nextState.season.grid = payload.grid.map((cell) => normalizeCell(cell));
      }
      if ('eventActive' in payload) {
        nextState.season.eventActive = cloneValue(payload.eventActive);
      }
      if ('resolvedEvent' in payload) {
        nextState.season.lastResolvedEvent = cloneValue(payload.resolvedEvent);
      }
      if ('summary' in payload) {
        nextState.season.lastEventEffectSummary = cloneValue(payload.summary);
      }
      return nextState;
    }

    case Actions.USE_INTERVENTION: {
      if (payload.state) return replaceState(payload.state);
      const nextState = cloneGameState(state);
      if (Array.isArray(payload.grid)) {
        nextState.season.grid = payload.grid.map((cell) => normalizeCell(cell));
      }
      if ('interventionId' in payload) {
        nextState.season.interventionChosen = payload.interventionId;
      }
      if ('interventionTokens' in payload) {
        nextState.season.interventionTokens = payload.interventionTokens;
      }
      if ('resolvedEvent' in payload) {
        nextState.season.lastResolvedEvent = cloneValue(payload.resolvedEvent);
      }
      if ('summary' in payload) {
        nextState.season.lastEventEffectSummary = cloneValue(payload.summary);
      }
      if ('eventActive' in payload) {
        nextState.season.eventActive = cloneValue(payload.eventActive);
      }
      return nextState;
    }

    case Actions.RESET_SEASON: {
      if (payload.state) return replaceState(payload.state);
      const nextState = cloneGameState(state);
      const nextSeason = payload.season
        ? normalizeSeason(payload.season, nextState.campaign)
        : createSeasonState(nextState.campaign.currentChapter, nextState.season.season, nextState.campaign);
      nextSeason.campaign = nextState.campaign;
      nextState.season = nextSeason;
      nextState.selectedCropId = payload.selectedCropId ?? null;
      return nextState;
    }

    case Actions.SET_GAME_MODE: {
      const nextState = cloneGameState(state);
      nextState.campaign.gameMode = payload.mode;
      return nextState;
    }

    case Actions.SET_ACTIVE_TOOL: {
      const nextState = cloneGameState(state);
      nextState.season.activeTool = payload.toolId;
      return nextState;
    }

    case Actions.ACQUIRE_BED: {
      const { bedId, bed } = payload;
      if (!bedId || !bed) return state;
      const nextState = cloneGameState(state);
      nextState.campaign.beds = {
        ...(nextState.campaign.beds ?? {}),
        [bedId]: cloneValue(bed),
      };
      return nextState;
    }

    case Actions.SWITCH_BED: {
      const { bedId } = payload;
      if (!bedId) return state;
      const nextState = cloneGameState(state);
      if (!nextState.campaign.beds?.[bedId]) return state;
      nextState.campaign.activeBedId = bedId;
      return nextState;
    }

    case Actions.EXPAND_BED_GRID: {
      const { bedId, rows: newRows } = payload;
      if (!bedId || !Number.isInteger(newRows)) return state;
      const nextState = cloneGameState(state);
      const bed = nextState.campaign.beds?.[bedId];
      if (!bed) return state;

      const currentRows = bed.gridRows ?? 4;
      const currentCols = bed.gridCols ?? 8;
      const maxRows = Math.max(...GRID_UNLOCKS.map((u) => u.rows));

      if (newRows <= currentRows || newRows > maxRows) return state;

      const newGrid = createGrid(currentCols, newRows);
      // Copy existing cell data into the new grid
      const oldGrid = bed.grid ?? [];
      for (let i = 0; i < oldGrid.length; i++) {
        newGrid[i] = { ...newGrid[i], ...oldGrid[i] };
      }

      bed.grid = attachGridMeta(newGrid, currentCols, newRows);
      bed.gridRows = newRows;
      bed.gridCols = currentCols;
      return nextState;
    }

    default:
      return state;
  }
}

class Store {
  constructor(initialState) {
    this.state = normalizeGameState(initialState);
    this.subscribers = new Set();
  }

  getState() {
    return cloneGameState(this.state);
  }

  dispatch(action) {
    const nextState = gameReducer(this.state, action);
    if (nextState === this.state) {
      return this.getState();
    }

    this.state = normalizeGameState(nextState);
    const snapshot = this.getState();
    this.subscribers.forEach((callback) => callback(snapshot, action));
    return snapshot;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }
}

export {
  Actions,
  Store,
  cloneGameState,
  gameReducer,
  normalizeGameState,
};
