/**
 * Headless quest playthrough used by quest-reachability.test.js.
 *
 * Drives the real game systems (Store, Inventory, SkillSystem, Crafting,
 * Foraging, Market, Festivals, QuestEngine) and the real quest controller
 * through the same entry points the UI uses: walking zone exits, talking to
 * whoever is actually standing in the zone, reading the notice board,
 * foraging, crafting, planting in the home bed during planning, harvesting at
 * season end and using quest sites. Nothing writes quest state directly, so a
 * quest only completes if a player could complete it.
 */
import RECIPES from 'specs/CRAFTING_RECIPES.json';

import { getCropById, getCropsForChapter } from '../data/crops.js';
import { CraftingSystem } from '../game/crafting.js';
import { FestivalEngine } from '../game/festivals.js';
import { ForagingSystem, LOOT_TABLES, ZONE_SPOTS } from '../game/foraging.js';
import { Inventory, getInventoryItemCount, getItemDef } from '../game/inventory.js';
import { MarketSystem } from '../game/market.js';
import { QuestEngine, QuestStates } from '../game/quest-engine.js';
import { getActivePlanting, isPlantingReady, normalizeQuestLedger } from '../game/quest-ledger.js';
import { getQuestSite } from '../data/quest-sites.js';
import { SkillSystem } from '../game/skills.js';
import { PHASES, createGameState, createSeasonState } from '../game/state.js';
import { Actions, Store } from '../game/store.js';
import { resolveNpcPresence } from '../scene/npc-presence.js';
import { evaluateZoneAccess } from '../scene/zone-manager.js';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';
import { createQuestController } from '../ui/quest-controller.js';
import { isNoticeBoardQuest } from '../ui/quest-text.js';

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const DAY_MS = 86_400_000;
const FINAL_CHAPTER = 12;
const KEEP_CATEGORIES = new Set(['tools', 'quest_items']);
const GRINDABLE_SKILLS = new Set(['foraging', 'crafting']);
const DONE = new Set([QuestStates.COMPLETED]);
const ACTIVE = new Set([QuestStates.ACCEPTED, QuestStates.IN_PROGRESS, QuestStates.READY_TO_TURN_IN]);

function skillOf(blocker) {
  return blocker?.type === 'skill' ? String(blocker.requirement).replace(/ level$/, '') : null;
}

export class QuestPlaythrough {
  constructor({
    outcome = 'community',
    setNow = () => {},
    startTime = Date.UTC(2026, 0, 5, 12),
    questDeck = undefined,
    finalChapter = FINAL_CHAPTER,
  } = {}) {
    this.finalChapter = finalChapter;
    this.outcome = outcome;
    this.setNow = setNow;
    this.now = startTime;
    this.setNow(this.now);
    this.store = new Store(createGameState());
    this.skills = new SkillSystem(this.store);
    this.inventory = new Inventory(this.store);
    this.crafting = new CraftingSystem(this.store, this.inventory, this.skills);
    this.foraging = new ForagingSystem(this.store, this.inventory, this.skills);
    this.market = new MarketSystem(this.store);
    this.festivals = new FestivalEngine(this.store);
    this.quests = questDeck ? new QuestEngine(this.store, questDeck) : new QuestEngine(this.store);
    this.scene = null;
    this.goals = new Map();
    this.log = [];
    this.completedAt = {};
    this.controller = createQuestController({
      store: this.store,
      questEngine: this.quests,
      festivalEngine: this.festivals,
      cutsceneMachine: { isActive: () => false, start: (scene) => { this.scene = scene; } },
      getZoneId: () => this.zone,
      hudRoot: null,
    });
  }

  // --- State helpers --------------------------------------------------------

  get state() { return this.store.getState(); }
  get chapter() { return this.state.campaign.currentChapter; }
  get season() { return this.state.season.season; }
  get zone() { return this.state.campaign.worldState?.currentZone ?? 'player_plot'; }
  get deck() { return this.quests.questDeck; }

  questState(questId, state = this.state) { return state.campaign.questLog?.[questId]?.state ?? null; }
  count(itemId) { return getInventoryItemCount(this.state.campaign.inventory, itemId); }
  ledger() { return normalizeQuestLedger(this.state.campaign.questLedger); }
  note(message) { this.log.push(`ch${this.chapter} ${this.season} @${this.zone}: ${message}`); }

  advanceTime(ms) {
    this.now += ms;
    this.setNow(this.now);
  }

  // --- Travel ---------------------------------------------------------------

  canEnter(zoneId) { return evaluateZoneAccess(zoneId, this.state).allowed; }

  route(target) {
    const state = this.state;
    const from = state.campaign.worldState?.currentZone ?? 'player_plot';
    if (from === target) return [];
    const open = new Map();
    const canEnter = (zoneId) => {
      if (!open.has(zoneId)) open.set(zoneId, evaluateZoneAccess(zoneId, state).allowed);
      return open.get(zoneId);
    };
    const seen = new Set([from]);
    const queue = [[from, []]];
    while (queue.length) {
      const [zoneId, path] = queue.shift();
      for (const exit of getZoneExitPoints(zoneId)) {
        const next = exit.destination;
        if (!next || seen.has(next) || !canEnter(next)) continue;
        const nextPath = [...path, next];
        if (next === target) return nextPath;
        seen.add(next);
        queue.push([next, nextPath]);
      }
    }
    return null;
  }

  reachable(zoneId) { return this.route(zoneId) !== null; }

  reachableZones() {
    const state = this.state;
    const from = state.campaign.worldState?.currentZone ?? 'player_plot';
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length) {
      for (const exit of getZoneExitPoints(queue.shift())) {
        const next = exit.destination;
        if (!next || seen.has(next) || !evaluateZoneAccess(next, state).allowed) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  }

  travel(target) {
    const path = this.route(target);
    if (!path) return false;
    let fromZone = this.zone;
    path.forEach((toZone) => {
      this.store.dispatch({ type: Actions.ZONE_CHANGED, payload: { fromZone, toZone } });
      fromZone = toZone;
    });
    return path.length === 0 || this.zone === target;
  }

  /** Zones that are locked only behind skills the player can practice. */
  reachableAfterGrind(zoneId) {
    if (this.reachable(zoneId)) return true;
    const access = evaluateZoneAccess(zoneId, this.state);
    return (access.blockers ?? []).every((blocker) => GRINDABLE_SKILLS.has(skillOf(blocker)));
  }

  enterZone(zoneId) {
    if (this.travel(zoneId)) return true;
    const access = evaluateZoneAccess(zoneId, this.state);
    for (const blocker of access.blockers ?? []) {
      const skill = skillOf(blocker);
      if (!GRINDABLE_SKILLS.has(skill) || !this.ensureSkill(skill, blocker.needed)) return false;
    }
    return this.travel(zoneId);
  }

  // --- Inventory, foraging, crafting ----------------------------------------

  protect(itemId, delta) {
    const next = (this.goals.get(itemId) ?? 0) + delta;
    if (next > 0) this.goals.set(itemId, next);
    else this.goals.delete(itemId);
  }

  makeRoom(minFree = 4) {
    const slots = this.inventory.getSlots();
    let free = slots.filter((slot) => !slot).length;
    for (const slot of slots) {
      if (free >= minFree) return;
      if (!slot) continue;
      const category = getItemDef(slot.itemId)?.category;
      if (KEEP_CATEGORIES.has(category) || this.goals.has(slot.itemId)) continue;
      this.inventory.removeItem(slot.itemId, slot.count);
      free += 1;
    }
  }

  spotsFor(itemId) {
    return Object.entries(ZONE_SPOTS).flatMap(([zoneId, spots]) => spots
      .filter((spot) => Object.values(LOOT_TABLES[spot.type] ?? {})
        .some((tier) => tier.some((entry) => entry.itemId === itemId)))
      .map((spot) => ({ zoneId, spot })));
  }

  /** Forage the given spots round-robin, one round per in-game day, until done(). */
  forageUntil(done, spots, maxDays = 400) {
    for (let day = 0; day < maxDays; day += 1) {
      if (done()) return true;
      const zones = this.reachableZones();
      const open = spots.filter(({ zoneId }) => zones.has(zoneId));
      if (!open.length) return false;
      for (const { zoneId, spot } of open) {
        if (done()) return true;
        if (!this.travel(zoneId)) continue;
        this.makeRoom();
        if (this.foraging.isAvailable(spot.id)) this.foraging.forage(spot.id);
      }
      this.advanceTime(DAY_MS);
    }
    return done();
  }

  obtain(itemId, count, depth = 0) {
    if (this.count(itemId) >= count) return true;
    if (depth > 4) return false;
    this.protect(itemId, 1);
    try {
      const zones = this.reachableZones();
      const spots = this.spotsFor(itemId).filter(({ zoneId }) => zones.has(zoneId));
      if (spots.length && this.forageUntil(() => this.count(itemId) >= count, spots)) return true;
      const recipe = RECIPES.recipes.find((entry) => entry.output?.itemId === itemId);
      if (recipe) {
        while (this.count(itemId) < count) {
          if (!this.craft(recipe.id, depth + 1)) break;
        }
        if (this.count(itemId) >= count) return true;
      }
      return this.buy(itemId, count - this.count(itemId)) && this.count(itemId) >= count;
    } finally {
      this.protect(itemId, -1);
    }
  }

  buy(itemId, amount) {
    if (!this.market.getPriceTable(this.season).prices[itemId] || !this.travel('market_square')) return false;
    this.makeRoom(2);
    return this.market.buy(itemId, amount).success;
  }

  craft(recipeId, depth = 0) {
    const recipe = this.crafting.getRecipe(recipeId);
    if (!recipe) return false;
    if (!this.ensureSkill('crafting', recipe.skillRequirement?.crafting ?? 1)) return false;
    const materials = recipe.materials ?? [];
    materials.forEach(({ itemId }) => this.protect(itemId, 1));
    try {
      for (const { itemId, count } of materials) {
        if (!this.obtain(itemId, count, depth)) return false;
      }
      this.makeRoom(2);
      return this.crafting.craft(recipeId).success === true;
    } finally {
      materials.forEach(({ itemId }) => this.protect(itemId, -1));
    }
  }

  ensureSkill(skillId, level) {
    for (let guard = 0; guard < 2000 && this.skills.getLevel(skillId) < level; guard += 1) {
      if (skillId === 'crafting') {
        if (!this.craft('basic_sprinkler')) return false;
        if (!this.goals.has('basic_sprinkler')) this.inventory.removeItem('basic_sprinkler', this.count('basic_sprinkler'));
      } else if (skillId === 'foraging') {
        const before = this.state.campaign.skills?.foraging?.xp ?? 0;
        const spots = Object.entries(ZONE_SPOTS).flatMap(([zoneId, list]) => list.map((spot) => ({ zoneId, spot })));
        this.forageUntil(() => (this.state.campaign.skills?.foraging?.xp ?? 0) > before, spots, 2);
      } else {
        return false;
      }
    }
    return this.skills.getLevel(skillId) >= level;
  }

  // --- Planting -------------------------------------------------------------

  canPlantHome(cropId) {
    return this.state.season.phase === PHASES.PLANNING
      && this.season !== 'winter'
      && getCropsForChapter(this.chapter).some((crop) => crop.id === cropId);
  }

  emptyCells() {
    const { grid } = this.state.season;
    return grid.map((cell, index) => (cell?.cropId ? null : index)).filter((index) => index != null);
  }

  plantHome(cropId, cellIndex = this.emptyCells()[0]) {
    if (cellIndex == null || !this.canPlantHome(cropId) || !this.travel('player_plot')) return false;
    this.store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex, cropId } });
    return this.state.season.grid[cellIndex]?.cropId === cropId;
  }

  plantedCount(cropId) {
    return this.state.season.grid.filter((cell) => cell?.cropId === cropId).length;
  }

  plantAdjacentPair(cropId, neighborId) {
    const { grid } = this.state.season;
    const cols = grid.cols ?? 8;
    for (let index = 0; index < grid.length; index += 1) {
      const right = index + 1;
      if (right % cols === 0 || right >= grid.length) continue;
      const leftOk = !grid[index]?.cropId || grid[index].cropId === cropId;
      const rightOk = !grid[right]?.cropId || grid[right].cropId === neighborId;
      if (!leftOk || !rightOk) continue;
      if (!grid[index]?.cropId && !this.plantHome(cropId, index)) return false;
      if (!grid[right]?.cropId && !this.plantHome(neighborId, right)) return false;
      return true;
    }
    return false;
  }

  /** Greenhouse planter: plant needed crops, harvest anything ready. */
  tendGreenhouse(neededCrops) {
    if (!neededCrops.size || !this.enterZone('greenhouse')) return false;
    const site = getQuestSite('greenhouse_planter');
    let acted = false;
    for (const cropId of neededCrops) {
      const planting = getActivePlanting(this.ledger(), site.id, cropId);
      const name = getCropById(cropId)?.name ?? cropId;
      if (planting && !isPlantingReady(planting, site, this.chapter)) continue;
      this.controller.interactSite(site.id);
      const prefix = planting ? `Harvest ${name}` : `Plant ${name}`;
      if (this.choose(this.scene?.beats?.[0], prefix)) acted = true;
    }
    return acted;
  }

  // --- Talking --------------------------------------------------------------

  giverZone(quest) {
    if (isNoticeBoardQuest(quest)) return 'neighborhood';
    return resolveNpcPresence(quest.npc, this.state)?.zone ?? null;
  }

  openTalk(quest) {
    const zoneId = this.giverZone(quest);
    if (!zoneId || !this.travel(zoneId)) return null;
    this.scene = null;
    if (isNoticeBoardQuest(quest)) this.controller.interactSite('neighborhood_notice_board');
    else this.controller.talkTo(quest.npc);
    return this.scene;
  }

  /** Pick a choice by label prefix; runs its effect and returns the branch beats. */
  choose(beat, prefix) {
    const choice = beat?.choices?.find((entry) => entry.label.startsWith(prefix));
    if (!choice) return null;
    choice.effect?.run?.();
    return (choice.branchId ? this.scene?.branches?.[choice.branchId] : null) ?? [];
  }

  accept(quest) {
    const scene = this.openTalk(quest);
    const offer = this.choose(scene?.beats?.[0], `New request: ${quest.title}`);
    if (!offer) return false;
    this.choose(offer[0], "I'll do it");
    const ok = ACTIVE.has(this.questState(quest.id));
    if (ok) this.note(`accepted ${quest.id}`);
    return ok;
  }

  outcomeLabel(quest) {
    const outcomes = this.quests.getQuestOutcomes(quest);
    return (outcomes.find((entry) => entry.id === this.outcome) ?? outcomes[0])?.label ?? '';
  }

  turnIn(quest) {
    const scene = this.openTalk(quest);
    const beats = this.choose(scene?.beats?.[0], `Turn in: ${quest.title}`);
    if (!beats) return false;
    this.choose(beats[0], this.outcomeLabel(quest));
    const ok = this.questState(quest.id) === QuestStates.COMPLETED;
    if (ok) {
      this.completedAt[quest.id] = this.chapter;
      this.note(`completed ${quest.id}`);
    }
    return ok;
  }

  deliver(quest, zoneId) {
    if (!this.travel(zoneId) || this.giverZone(quest) !== zoneId) return false;
    const scene = this.openTalk(quest);
    const beats = this.choose(scene?.beats?.[0], 'Hand over');
    if (!beats) return false;
    const turnInBeat = beats.find((beat) => beat.choices?.length);
    if (turnInBeat) {
      this.choose(turnInBeat, this.outcomeLabel(quest));
      if (this.questState(quest.id) === QuestStates.COMPLETED) {
        this.completedAt[quest.id] = this.chapter;
        this.note(`completed ${quest.id} on delivery`);
      }
    }
    return true;
  }

  // --- Requirements ---------------------------------------------------------

  unmet(quest) {
    return this.quests.getQuestProgress(quest, this.state).filter((entry) => !entry.met);
  }

  /** Can this requirement be worked on from the current chapter onward? */
  feasible(quest, entry) {
    const req = entry.requirement;
    switch (req.type) {
      case 'crop_harvested':
        if (req.zone === 'greenhouse') return this.reachableAfterGrind('greenhouse');
        if (req.id === 'any') return this.season !== 'winter';
        return this.season !== 'winter' && getCropsForChapter(this.chapter).some((crop) => crop.id === req.id);
      case 'crop_planted':
        if (req.zone === 'meadow') return this.reachableAfterGrind('meadow');
        return this.canPlantHome(req.id) && (!req.adjacentTo || this.canPlantHome(req.adjacentTo));
      case 'item_found':
        return req.zone ? this.reachableAfterGrind(req.zone) : true;
      case 'item_delivered':
        return this.reachableAfterGrind(req.zone) && resolveNpcPresence(quest.npc, this.state)?.zone === req.zone;
      case 'item_traded':
        return this.reachable('market_square');
      case 'festival_completed':
        return this.season === 'spring';
      case 'zone_visited':
      case 'spot_foraged':
        return this.reachableAfterGrind(req.zone ?? this.spotZone(req.id) ?? req.id);
      default:
        return true;
    }
  }

  spotZone(spotId) {
    return Object.entries(ZONE_SPOTS).find(([, spots]) => spots.some((spot) => spot.id === spotId))?.[0] ?? null;
  }

  work(quest, entry) {
    const req = entry.requirement;
    switch (req.type) {
      case 'crop_planted': {
        if (req.zone === 'meadow') {
          if (!this.enterZone('meadow')) return false;
          let planted = false;
          for (let i = 0; i < entry.target - entry.current; i += 1) {
            planted = this.controller.interactSite('meadow_clover_plot') || planted;
          }
          return planted;
        }
        let planted = false;
        for (let i = entry.current; i < entry.target; i += 1) {
          const ok = req.adjacentTo ? this.plantAdjacentPair(req.id, req.adjacentTo) : this.plantHome(req.id);
          planted = ok || planted;
          if (!ok) break;
        }
        return planted;
      }
      case 'crop_harvested':
        // Home-bed harvests happen at season end; greenhouse ones in tendGreenhouse().
        return false;
      case 'item_crafted':
        return this.obtain(req.id, entry.target);
      case 'item_found':
        if (req.id === 'old_map') return this.travel('neighborhood') && this.controller.interactSite('big_oak_hollow');
        return this.forageUntil(
          () => this.quests.getRequirementProgress(req, this.state, quest).met,
          this.spotsFor(req.id).filter(({ zoneId }) => !req.zone || zoneId === req.zone),
        );
      case 'item_delivered': {
        const outstanding = this.unmet(quest).filter((e) => e.requirement.type === 'item_delivered');
        outstanding.forEach((e) => this.protect(e.requirement.id, 1));
        try {
          for (const e of outstanding) {
            if (!this.obtain(e.requirement.id, e.target - e.current)) return false;
          }
          return this.deliver(quest, req.zone);
        } finally {
          outstanding.forEach((e) => this.protect(e.requirement.id, -1));
        }
      }
      case 'item_traded': {
        if (!this.travel('market_square')) return false;
        let traded = false;
        while (!this.quests.getRequirementProgress(req, this.state, quest).met) {
          this.makeRoom(2);
          if (!this.market.buy('lettuce_seed', 1).success || !this.market.sell('lettuce_seed', 1).success) break;
          traded = true;
        }
        return traded;
      }
      case 'zone_visited':
        return this.enterZone(req.id);
      case 'spot_foraged': {
        const zoneId = this.spotZone(req.id);
        if (!zoneId || !this.enterZone(zoneId)) return false;
        if (!this.foraging.isAvailable(req.id)) this.advanceTime(DAY_MS);
        this.makeRoom();
        return this.foraging.forage(req.id)?.success === true;
      }
      default:
        return false;
    }
  }

  // --- Chapter flow ---------------------------------------------------------

  turnInReady() {
    let progressed = false;
    this.quests.evaluateProgress();
    const snapshot = this.state;
    const ready = this.deck.filter((quest) => this.questState(quest.id, snapshot) === QuestStates.READY_TO_TURN_IN);
    for (const quest of ready) {
      if (this.turnIn(quest)) progressed = true;
    }
    return progressed;
  }

  acceptAvailable() {
    let progressed = false;
    let active = this.quests.getActiveQuests().length;
    for (const quest of this.quests.getAvailableQuests()) {
      if (active >= 3) break;
      if (!this.unmet(quest).every((entry) => this.feasible(quest, entry))) continue;
      if (this.accept(quest)) {
        progressed = true;
        active += 1;
      }
    }
    return progressed;
  }

  workActive() {
    let progressed = false;
    const snapshot = this.state;
    for (const quest of this.deck.filter((q) => ACTIVE.has(this.questState(q.id, snapshot)))) {
      for (const entry of this.unmet(quest)) {
        if (this.work(quest, entry)) progressed = true;
        if (!ACTIVE.has(this.questState(quest.id))) break;
      }
    }
    return progressed;
  }

  /** Crops some unfinished quest still needs harvested (lifetime pantry). */
  harvestNeeds() {
    const state = this.state;
    const pantry = state.campaign.pantry ?? {};
    const home = new Map();
    const greenhouse = new Set();
    for (const quest of this.deck) {
      if (DONE.has(this.questState(quest.id, state))) continue;
      for (const req of quest.requirements ?? []) {
        if (req.type !== 'crop_harvested') continue;
        const site = getQuestSite('greenhouse_planter');
        if (req.zone === 'greenhouse' || site.crops.some((crop) => crop.cropId === req.id)) {
          const done = this.quests.getRequirementProgress(req, state, quest).met;
          if (!done) greenhouse.add(req.id);
          continue;
        }
        const cropId = req.id === 'any' ? 'lettuce' : req.id;
        const have = req.id === 'any' ? 0 : (pantry[cropId] ?? 0);
        const need = Math.max(0, req.count - have);
        if (need > 0) home.set(cropId, Math.max(home.get(cropId) ?? 0, need));
      }
    }
    return { home, greenhouse };
  }

  festivalRound() {
    const active = this.festivals.getActiveFestival();
    if (!active || !this.travel('festival_grounds')) return false;
    let joined = false;
    for (const siteId of ['festival_booth_a', 'festival_booth_b']) {
      this.scene = null;
      this.controller.interactSite(siteId);
      const beat = this.scene?.beats?.find((entry) => entry.choices?.length);
      if (this.choose(beat, 'Join in')) joined = true;
    }
    return joined;
  }

  seasonEnd() {
    const { home, greenhouse } = this.harvestNeeds();
    this.tendGreenhouse(greenhouse);
    if (this.season !== 'winter') {
      for (const [cropId, need] of home) {
        for (let i = 0; i < need; i += 1) {
          if (!this.plantHome(cropId)) break;
        }
      }
    }
    const state = this.state;
    state.season.phase = PHASES.LATE_SEASON;
    this.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    this.state.season.grid.forEach((cell, cellIndex) => {
      if (cell?.cropId) this.store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex, cropId: cell.cropId } });
    });
  }

  advanceChapter() {
    const state = this.state;
    const chapter = state.campaign.currentChapter + 1;
    const season = SEASONS[(chapter - 1) % 4];
    state.campaign.currentChapter = chapter;
    state.campaign.currentSeason = season;
    state.campaign.cropsUnlocked = getCropsForChapter(chapter).map((crop) => crop.id);
    state.season = createSeasonState(chapter, season, state.campaign);
    this.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    this.advanceTime(DAY_MS);
  }

  playChapter() {
    this.controller.evaluateNow();
    this.festivalRound();
    for (let pass = 0; pass < 8; pass += 1) {
      let progressed = this.turnInReady();
      progressed = this.acceptAvailable() || progressed;
      progressed = this.workActive() || progressed;
      progressed = this.tendGreenhouse(this.harvestNeeds().greenhouse) || progressed;
      progressed = this.turnInReady() || progressed;
      if (!progressed) break;
    }
    this.festivalRound();
  }

  run() {
    for (let chapter = 1; chapter <= this.finalChapter; chapter += 1) {
      if (chapter > 1) this.advanceChapter();
      this.playChapter();
      if (chapter < this.finalChapter) this.seasonEnd();
    }
    return this.report();
  }

  report() {
    const state = this.state;
    const stuck = this.deck
      .filter((quest) => this.questState(quest.id, state) !== QuestStates.COMPLETED)
      .map((quest) => ({
        id: quest.id,
        state: this.questState(quest.id, state) ?? 'never offered',
        unmet: this.unmet(quest).map((entry) => `${entry.requirement.type}:${entry.requirement.id} ${entry.current}/${entry.target}`),
      }));
    return {
      completed: this.deck.map((quest) => quest.id).filter((id) => this.questState(id, state) === QuestStates.COMPLETED),
      completedAt: { ...this.completedAt },
      stuck,
      reputation: { ...state.campaign.reputation },
      skills: Object.fromEntries(Object.entries(state.campaign.skills ?? {}).map(([id, s]) => [id, s.level])),
      log: this.log,
    };
  }
}

export function formatPlaythroughFailure(report) {
  if (!report.stuck.length) return '';
  return [
    'Unreachable quests:',
    ...report.stuck.map((quest) => `  ${quest.id} [${quest.state}] ${quest.unmet.join(', ')}`),
    `reputation=${JSON.stringify(report.reputation)} skills=${JSON.stringify(report.skills)}`,
    ...report.log,
  ].join('\n');
}
