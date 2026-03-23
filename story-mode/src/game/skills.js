import skillTreeData from 'specs/SKILL_TREE.json';

export const Skills = {
  GARDENING: 'gardening',
  SOIL_SCIENCE: 'soil_science',
  COMPOSTING: 'composting',
  FORAGING: 'foraging',
  SOCIAL: 'social',
  CRAFTING: 'crafting',
};

export const XP_TABLE = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200];

const ACTION_XP_MAP = {
  PLANT_CROP: [{ skillId: Skills.GARDENING, amount: 10 }],
  HARVEST_CELL: [{ skillId: Skills.GARDENING, amount: 25 }],
  WATER_CELL: [{ skillId: Skills.GARDENING, amount: 5 }],
  COMPLETE_QUEST: [{ skillId: Skills.SOCIAL, amount: 30 }],
  REPAIR_TOOL: [{ skillId: Skills.CRAFTING, amount: 10 }],
};

const BUFF_ALIASES = {
  yield_bonus: 'harvest_yield',
  material_cost_reduction: 'crafting_material_cost',
  reputation_gain_bonus: 'reputation_gain',
};

export function getDefaultSkillsState(skillSpec = skillTreeData) {
  return Object.keys(skillSpec.skills ?? {}).reduce((acc, skillId) => {
    acc[skillId] = { xp: 0, level: 1 };
    return acc;
  }, {});
}

export function calculateSkillLevel(xp) {
  let level = 1;
  XP_TABLE.forEach((threshold, index) => {
    if (xp >= threshold) {
      level = index + 1;
    }
  });
  return Math.min(10, level);
}

export function normalizeSkillsState(raw, skillSpec = skillTreeData) {
  const base = getDefaultSkillsState(skillSpec);
  if (!raw || typeof raw !== 'object') return base;
  return Object.keys(base).reduce((acc, skillId) => {
    const entry = raw[skillId];
    if (typeof entry === 'number') {
      acc[skillId] = { xp: entry, level: calculateSkillLevel(entry) };
      return acc;
    }
    const xp = Math.max(0, Number(entry?.xp ?? 0));
    acc[skillId] = {
      xp,
      level: Math.max(1, Number(entry?.level ?? calculateSkillLevel(xp))),
    };
    return acc;
  }, {});
}

export function getSkillXpMap(skillsState) {
  return Object.fromEntries(Object.entries(normalizeSkillsState(skillsState)).map(([skillId, entry]) => [skillId, entry.xp]));
}

function getSkillLevels(skillId, skillSpec = skillTreeData) {
  return skillSpec.skills?.[skillId]?.levels ?? [];
}

function getSkillBuffs(skillId, level, skillSpec = skillTreeData) {
  const levels = getSkillLevels(skillId, skillSpec)
    .filter((entry) => (entry.level ?? 0) <= level && entry.buff)
    .map((entry) => ({ ...entry.buff, level: entry.level, skill: skillId }));
  const replaced = new Set(levels.flatMap((entry) => entry.replaces ? [entry.replaces] : []));
  return levels.filter((entry) => !replaced.has(entry.id));
}

export function awardXPToSkillsState(skillsState, skillId, amount, skillSpec = skillTreeData) {
  const nextSkills = normalizeSkillsState(skillsState, skillSpec);
  const current = nextSkills[skillId] ?? { xp: 0, level: 1 };
  const nextXP = Math.max(0, current.xp + Math.max(0, Number(amount ?? 0)));
  const nextLevel = calculateSkillLevel(nextXP);
  nextSkills[skillId] = { xp: nextXP, level: nextLevel };
  const previousBuffs = new Set(getSkillBuffs(skillId, current.level, skillSpec).map((entry) => entry.id));
  const unlockedBuffs = getSkillBuffs(skillId, nextLevel, skillSpec)
    .filter((entry) => !previousBuffs.has(entry.id));
  return {
    skills: nextSkills,
    levelsGained: Math.max(0, nextLevel - current.level),
    newLevel: nextLevel,
    unlockedBuffs,
  };
}

export class SkillSystem {
  constructor(store, skillSpec = skillTreeData) {
    this.store = store;
    this.skillSpec = skillSpec;
    this.unsubscribe = this.store.subscribe((_, action) => this.handleAction(action));
  }

  getState() {
    return this.store.getState();
  }

  handleAction(action = {}) {
    if (!action?.type || action.type === 'AWARD_XP' || action.type === 'LEVEL_UP') return;
    const mapped = ACTION_XP_MAP[action.type] ?? [];
    if (action.type === 'FESTIVAL_ACTIVITY') {
      mapped.push({ skillId: Skills.SOCIAL, amount: 20 });
    }
    if (action.type === 'CRAFT_ITEM') {
      mapped.push({ skillId: Skills.CRAFTING, amount: action.payload?.xpGained ?? 20 });
    }
    if (action.type === 'FORAGE') {
      mapped.push({ skillId: Skills.FORAGING, amount: action.payload?.xpGained ?? 20 });
    }
    if (action.type === 'USE_INTERVENTION' && action.payload?.interventionId === 'mulch') {
      mapped.push({ skillId: Skills.SOIL_SCIENCE, amount: 15 });
    }
    mapped.forEach(({ skillId, amount }) => this.awardXP(skillId, amount));
  }

  getLevel(skillId) {
    return normalizeSkillsState(this.getState().campaign.skills, this.skillSpec)[skillId]?.level ?? 1;
  }

  getProgress(skillId) {
    const current = normalizeSkillsState(this.getState().campaign.skills, this.skillSpec)[skillId] ?? { xp: 0, level: 1 };
    const nextLevelXP = XP_TABLE[Math.min(current.level, XP_TABLE.length - 1)] ?? XP_TABLE[XP_TABLE.length - 1];
    const currentFloor = XP_TABLE[Math.max(0, current.level - 1)] ?? 0;
    const span = Math.max(1, nextLevelXP - currentFloor);
    return {
      currentXP: current.xp,
      nextLevelXP,
      level: current.level,
      percentage: current.level >= 10 ? 100 : Math.min(100, Math.round(((current.xp - currentFloor) / span) * 100)),
    };
  }

  awardXP(skillId, amount) {
    if (!skillId || amount <= 0) {
      return { levelsGained: 0, newLevel: this.getLevel(skillId), unlockedBuffs: [] };
    }
    const before = this.getLevel(skillId);
    this.store.dispatch({
      type: 'AWARD_XP',
      payload: { skillId, amount },
    });
    const after = this.getLevel(skillId);
    const unlockedBuffs = getSkillBuffs(skillId, after, this.skillSpec)
      .filter((entry) => (entry.level ?? 0) > before);
    if (after > before) {
      this.store.dispatch({
        type: 'LEVEL_UP',
        payload: { skillId, newLevel: after, unlockedBuffs },
      });
    }
    return {
      levelsGained: Math.max(0, after - before),
      newLevel: after,
      unlockedBuffs,
    };
  }

  getActiveBuffs() {
    return Object.keys(this.skillSpec.skills ?? {}).flatMap((skillId) => (
      getSkillBuffs(skillId, this.getLevel(skillId), this.skillSpec).map((entry) => ({
        buffId: entry.id,
        skill: skillId,
        level: entry.level,
        effect: entry.effect,
      }))
    ));
  }

  getBuffValue(buffId) {
    const active = this.getActiveBuffs();
    const aliasTarget = BUFF_ALIASES[buffId] ?? buffId;
    const exact = active.find((entry) => entry.buffId === buffId);
    if (exact) {
      return exact.effect?.value ?? true;
    }
    const matches = active.filter((entry) => entry.effect?.target === aliasTarget);
    if (!matches.length) return 0;
    if (aliasTarget === 'crafting_material_cost') {
      const multiplier = Math.min(...matches.map((entry) => entry.effect.value));
      return Number((1 - multiplier).toFixed(3));
    }
    if (aliasTarget === 'harvest_yield' || aliasTarget === 'reputation_gain') {
      const multiplier = Math.max(...matches.map((entry) => entry.effect.value));
      return Number((multiplier - 1).toFixed(3));
    }
    if (matches.some((entry) => entry.effect?.type === 'unlock')) {
      return true;
    }
    return matches.reduce((sum, entry) => sum + Number(entry.effect?.value ?? 0), 0);
  }

  getAllSkills() {
    const state = normalizeSkillsState(this.getState().campaign.skills, this.skillSpec);
    return Object.entries(this.skillSpec.skills ?? {}).map(([skillId, spec]) => ({
      id: skillId,
      name: spec.name,
      level: state[skillId]?.level ?? 1,
      xp: state[skillId]?.xp ?? 0,
      buffs: getSkillBuffs(skillId, state[skillId]?.level ?? 1, this.skillSpec),
    }));
  }

  dispose() {
    this.unsubscribe?.();
  }
}
