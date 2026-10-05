/**
 * Quest UI controller: talking to quest givers, the neighborhood notice
 * board, quest sites in the world, the HUD quest tracker and the quest log.
 *
 * - NPC interactables (Old Gus, Maya, Lila) get an onInteract that opens a
 *   talk scene in the existing dialogue panel (cutscene machine). The scene
 *   offers available quests with their acceptDialogue, shows progressDialogue
 *   for active ones, takes item deliveries, and turns in ready quests with
 *   their completeDialogue and the deck's two outcome choices.
 * - Pat, Sam, Jo and Robin have no world presence, so their quests live on a
 *   notice board in the neighborhood.
 * - Progress is re-evaluated after every store action (deferred to a
 *   microtask so nested dispatches never reach other subscribers out of
 *   order), timed quests are checked when the season turns, and the season's
 *   festival opens during planning.
 *
 * All DOM listeners use the session AbortSignal and dispose() removes every
 * element, so returning to the Main Menu leaves nothing behind.
 */
import '../../assets/css/hud-quests.css';

import { FESTIVALS } from '../data/festivals-data.js';
import { getNPC, getNPCFarewell, getNPCGreeting } from '../data/npcs.js';
import { getQuestSite, getQuestSitesForZone } from '../data/quest-sites.js';
import { getCropById } from '../data/crops.js';
import { getItemDef } from '../game/inventory.js';
import { QuestStates } from '../game/quest-engine.js';
import {
  canPlantAtSite,
  getActivePlanting,
  getCampaignYear,
  getSitePlantingCount,
  isPlantingReady,
  normalizeQuestLedger,
} from '../game/quest-ledger.js';
import { ReputationTiers } from '../game/reputation.js';
import { PHASES } from '../game/state.js';
import { Actions } from '../game/store.js';
import { resolveNpcPresence } from '../scene/npc-presence.js';
import {
  NEIGHBOR_NAMES,
  describeQuestGiverLocation,
  describeRequirement,
  getQuestGiverName,
  itemName,
} from './quest-text.js';

const ACTIVE_STATES = new Set([QuestStates.ACCEPTED, QuestStates.IN_PROGRESS, QuestStates.READY_TO_TURN_IN]);
const BOARD_GIVERS = Object.keys(NEIGHBOR_NAMES);
const BOARD_SITE_ID = 'neighborhood_notice_board';
const FESTIVAL_HOSTS = ['old_gus', 'maya', 'lila'];
const ORDERED_TIERS = Object.values(ReputationTiers).sort((a, b) => a.threshold - b.threshold);
const QUEST_SPEAKERS = new Set(['old_gus', 'maya', 'lila']);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleCase(value) {
  return String(value ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTierId(value = 0) {
  let tier = ORDERED_TIERS[0];
  ORDERED_TIERS.forEach((entry) => {
    if (value >= entry.threshold) tier = entry;
  });
  return tier.id;
}

function formatItems(items) {
  return items.map((entry) => `${entry.count} ${itemName(entry.itemId)}`).join(' and ');
}

function summarizeRewards(rewards = []) {
  const reputation = {};
  const parts = [];
  rewards.forEach((reward) => {
    if (reward.type === 'reputation') {
      reputation[reward.id] = (reputation[reward.id] ?? 0) + (reward.amount ?? 0);
    } else if (reward.type === 'xp') {
      parts.push(`+${reward.amount} ${titleCase(reward.id)} XP`);
    } else if (reward.type === 'seed') {
      parts.push(`${getCropById(reward.id)?.name ?? titleCase(reward.id)} seeds`);
    } else if (reward.type === 'item') {
      const def = getItemDef(reward.id);
      parts.push(`${reward.amount > 1 ? `${reward.amount} ` : ''}${def.name}`);
    }
  });
  Object.entries(reputation).forEach(([npcId, amount]) => {
    parts.unshift(`+${amount} ${getQuestGiverName(npcId)}`);
  });
  return parts.join(' · ');
}

export function createQuestController({
  store,
  questEngine,
  festivalEngine = null,
  cutsceneMachine,
  getZoneId = () => store.getState().campaign?.worldState?.currentZone ?? 'player_plot',
  showToast = () => {},
  persist = () => {},
  playSfx = () => {},
  isInputBlocked = () => false,
  canEnterZone = null,
  hudRoot = typeof document !== 'undefined' ? document.body : null,
  signal = null,
} = {}) {
  let disposed = false;
  let evaluateQueued = false;
  let lastSeasonKey = null;
  let trackerEl = null;
  let logEl = null;

  const getState = () => store.getState();
  const deck = () => questEngine.questDeck ?? [];
  const questById = (questId) => questEngine.getQuestById(questId);
  const entryOf = (questId, state = getState()) => state.campaign?.questLog?.[questId] ?? null;
  const isActive = (questId, state = getState()) => ACTIVE_STATES.has(entryOf(questId, state)?.state);

  function isAvailable(quest, state = getState()) {
    const questState = entryOf(quest.id, state)?.state;
    if (questState === QuestStates.COMPLETED || ACTIVE_STATES.has(questState)) return false;
    return questEngine.meetsPrerequisites(quest, state);
  }

  function isReady(quest, state = getState()) {
    return isActive(quest.id, state) && questEngine.requirementsMet(quest, state);
  }

  function giverStatus(giverIds, state = getState()) {
    const quests = deck().filter((quest) => giverIds.includes(quest.npc));
    return {
      ready: quests.filter((quest) => isReady(quest, state)).length,
      offers: quests.filter((quest) => isAvailable(quest, state)).length,
    };
  }

  function speakerFor(quest) {
    return QUEST_SPEAKERS.has(quest.npc) ? quest.npc : 'narrator';
  }

  function quoteFor(quest, text) {
    // Board quests are read off a handwritten note; NPC lines are spoken.
    return QUEST_SPEAKERS.has(quest.npc) ? text : `${getQuestGiverName(quest.npc)}: “${text}”`;
  }

  function lockedCropHint(requirement, state) {
    // Home-bed crop objectives can be offered before the crop unlocks (Sam's
    // nasturtium); say when the seeds arrive instead of leaving it a mystery.
    if (requirement.zone || !['crop_planted', 'crop_harvested'].includes(requirement.type)) return '';
    const unlock = getCropById(requirement.id)?.chapterUnlock ?? 0;
    const chapter = state.campaign?.currentChapter ?? 1;
    return unlock > chapter ? ` (seeds unlock in Chapter ${unlock})` : '';
  }

  function progressLines(quest, state = getState()) {
    return questEngine.getQuestProgress(quest, state).map((entry) => ({
      label: `${describeRequirement(entry.requirement, quest)}${entry.met ? '' : lockedCropHint(entry.requirement, state)}`,
      current: Math.min(entry.current, entry.target),
      target: entry.target,
      met: entry.met,
    }));
  }

  function progressSummary(quest, state = getState()) {
    return progressLines(quest, state)
      .map((line) => `${line.met ? '✓' : '•'} ${line.label} ${line.current}/${line.target}`)
      .join('  ');
  }

  // --- Actions -------------------------------------------------------------

  function accept(questId) {
    const quest = questById(questId);
    if (!quest) return false;
    const ok = questEngine.acceptQuest(questId);
    if (!ok) {
      showToast(`Can't take “${quest.title}” right now.`, 2400, 'info');
      return false;
    }
    playSfx('quest_accept');
    questEngine.evaluateProgress();
    showToast(`Quest accepted: ${quest.title}`, 2400, 'success');
    persist();
    render();
    return true;
  }

  function turnIn(questId, choiceId) {
    const quest = questById(questId);
    questEngine.evaluateProgress();
    const rewards = questEngine.turnInQuest(questId, choiceId);
    if (!quest || !rewards) {
      showToast('Not quite done yet.', 2200, 'info');
      render();
      return null;
    }
    playSfx('quest_complete');
    const summary = summarizeRewards(rewards);
    showToast(`Quest complete: ${quest.title}${summary ? ` — ${summary}` : ''}`, 3600, 'success');
    persist();
    render();
    return rewards;
  }

  function drop(questId) {
    const quest = questById(questId);
    if (!quest || !isActive(questId) || !questEngine.abandonQuest(questId)) return false;
    showToast(`Dropped “${quest.title}”. You can pick it up again from ${NEIGHBOR_NAMES[quest.npc] ? 'the notice board' : getQuestGiverName(quest.npc)}.`, 3000, 'info');
    persist();
    render();
    return true;
  }

  function deliver(questId) {
    const delivered = questEngine.deliverItems(questId, getZoneId());
    if (delivered.length) {
      questEngine.evaluateProgress();
      persist();
      render();
    }
    return delivered;
  }

  // --- Talk scenes -----------------------------------------------------------

  function predictReadyAfterDelivery(quest, items, state) {
    return questEngine.getQuestProgress(quest, state).every((entry) => {
      if (entry.met) return true;
      if (entry.requirement.type !== 'item_delivered') return false;
      const handed = items.find((item) => item.itemId === entry.requirement.id)?.count ?? 0;
      return entry.current + handed >= entry.target;
    });
  }

  function turnInBeat(quest) {
    return {
      speaker: speakerFor(quest),
      text: quoteFor(quest, quest.completeDialogue),
      choices: questEngine.getQuestOutcomes(quest).map((outcome) => ({
        label: outcome.label,
        effect: { run: () => turnIn(quest.id, outcome.id) },
      })),
    };
  }

  function buildTalkScene(giverIds, { sceneId, greeting, farewell, speaker }) {
    const state = getState();
    const zoneId = getZoneId();
    const quests = deck().filter((quest) => giverIds.includes(quest.npc));
    const activeCount = questEngine.getActiveQuests().length;
    const atLimit = activeCount >= 3;
    const choices = [];
    const branches = {
      farewell: [{ speaker, text: farewell }],
    };

    quests.forEach((quest) => {
      if (isReady(quest, state)) {
        choices.push({ label: `Turn in: ${quest.title}`, branchId: `turnin:${quest.id}` });
        branches[`turnin:${quest.id}`] = [turnInBeat(quest)];
        return;
      }
      if (isActive(quest.id, state)) {
        const items = questEngine.getDeliverableItems(quest.id, zoneId, state);
        if (items.length) {
          choices.push({
            label: `Hand over ${formatItems(items)}`,
            branchId: `deliver:${quest.id}`,
            effect: { run: () => deliver(quest.id) },
          });
          const beats = [{ speaker: 'narrator', text: `You hand over ${formatItems(items)}.` }];
          if (predictReadyAfterDelivery(quest, items, state)) beats.push(turnInBeat(quest));
          else beats.push({ speaker: speakerFor(quest), text: quoteFor(quest, quest.progressDialogue) });
          branches[`deliver:${quest.id}`] = beats;
          return;
        }
        choices.push({ label: `About “${quest.title}”`, branchId: `progress:${quest.id}` });
        branches[`progress:${quest.id}`] = [
          { speaker: speakerFor(quest), text: quoteFor(quest, quest.progressDialogue) },
          { speaker: 'narrator', text: progressSummary(quest, state) || 'Keep at it.' },
        ];
        return;
      }
      if (isAvailable(quest, state)) {
        choices.push({ label: `New request: ${quest.title}`, branchId: `offer:${quest.id}` });
        branches[`offer:${quest.id}`] = [{
          speaker: speakerFor(quest),
          text: quoteFor(quest, quest.acceptDialogue),
          choices: atLimit
            ? [{ label: 'Maybe later (quest log full: 3 active)', branchId: 'farewell' }]
            : [
              { label: "I'll do it", effect: { run: () => accept(quest.id) }, branchId: `accepted:${quest.id}` },
              { label: 'Not right now', branchId: 'farewell' },
            ],
        }];
        branches[`accepted:${quest.id}`] = [{
          speaker: 'narrator',
          text: `Quest accepted: ${quest.title}.  ${progressLines(quest, state).map((line) => `• ${line.label} (${line.target})`).join('  ')}`,
        }];
      }
    });

    const beats = [];
    if (choices.length) {
      choices.push({ label: speaker === 'narrator' ? 'Step away' : 'Goodbye', branchId: 'farewell' });
      beats.push({ speaker, text: greeting, choices });
    } else {
      beats.push({ speaker, text: greeting });
      beats.push({ speaker: 'narrator', text: 'No requests right now. Check back as the seasons turn.' });
    }
    return { id: sceneId, priority: 1, skippable: true, beats, branches };
  }

  function startScene(scene) {
    if (!cutsceneMachine || cutsceneMachine.isActive?.()) return false;
    cutsceneMachine.start(scene, getState().campaign);
    return true;
  }

  function talkTo(npcId) {
    const npc = getNPC(npcId);
    if (!npc) return false;
    questEngine.evaluateProgress();
    const state = getState();
    const tier = getTierId(state.campaign?.reputation?.[npcId] ?? 0);
    return startScene(buildTalkScene([npcId], {
      sceneId: `quest_talk:${npcId}`,
      speaker: npcId,
      greeting: getNPCGreeting(npcId, tier) || `${npc.name} looks up from the soil.`,
      farewell: getNPCFarewell(npcId, tier) || 'See you around.',
    }));
  }

  function readNoticeBoard() {
    questEngine.evaluateProgress();
    return startScene(buildTalkScene(BOARD_GIVERS, {
      sceneId: 'quest_talk:notice_board',
      speaker: 'narrator',
      greeting: 'The neighborhood notice board is layered with handwritten notes from Pat, Sam, Jo and Robin.',
      farewell: 'You leave the notes where they are.',
    }));
  }

  // --- Quest sites -------------------------------------------------------------

  function siteQuestActive(site, state = getState()) {
    return !site.questId || isActive(site.questId, state);
  }

  function getSiteLabel(site, state = getState()) {
    const ledger = normalizeQuestLedger(state.campaign?.questLedger);
    switch (site.kind) {
      case 'notice_board': {
        const status = giverStatus(BOARD_GIVERS, state);
        if (status.ready) return 'Notice board · quest ready';
        if (status.offers) return 'Notice board · new request';
        return 'Read the notice board';
      }
      case 'discovery':
        if (!isActive(site.questId, state)) return 'The big oak';
        return (ledger.foundByZone[site.zoneId]?.[site.itemId] ?? 0) > 0 ? 'The big oak (searched)' : site.label;
      case 'planter': {
        if (site.crops.every((crop) => crop.growSeasons == null)) {
          if (!siteQuestActive(site, state)) return "Sam's restoration plot";
          const planted = getSitePlantingCount(ledger, site.id);
          return planted >= site.slots ? 'Clover patches planted' : `${site.label} (${planted}/${site.slots})`;
        }
        const ready = site.crops.some((crop) => isPlantingReady(getActivePlanting(ledger, site.id, crop.cropId), site, state.campaign?.currentChapter));
        return ready ? 'Greenhouse planter · ready to harvest' : site.label;
      }
      case 'festival_booth': {
        const active = state.campaign?.activeFestival;
        const festival = active?.id ? FESTIVALS[active.id] : null;
        const activity = festival?.activities?.[site.activityIndex];
        if (!activity) return 'Festival booth (closed)';
        const done = (active.activitiesCompleted ?? []).includes(activity.id);
        return done ? `${activity.name} ✓` : `${activity.name} · ${festival.name}`;
      }
      default:
        return site.label ?? site.id;
    }
  }

  function searchDiscovery(site) {
    const state = getState();
    if (!isActive(site.questId, state)) {
      showToast('Just roots and old leaves.', 1800, 'info');
      return false;
    }
    const ledger = normalizeQuestLedger(state.campaign?.questLedger);
    if ((ledger.foundByZone[site.zoneId]?.[site.itemId] ?? 0) > 0) {
      showToast('You already found what was hidden here.', 1800, 'info');
      return false;
    }
    store.dispatch({
      type: Actions.QUEST_ITEM_FOUND,
      payload: { itemId: site.itemId, zoneId: site.zoneId, count: 1 },
    });
    persist();
    startScene({
      id: `quest_site:${site.id}`,
      priority: 1,
      skippable: true,
      beats: [{ speaker: 'narrator', text: site.foundText ?? `You found ${itemName(site.itemId)}.` }],
    });
    showToast(`Found: ${itemName(site.itemId)}`, 2400, 'success');
    return true;
  }

  function plantAtSite(site, cropId) {
    if (!canPlantAtSite(getState().campaign, site.id, cropId)) return false;
    store.dispatch({ type: Actions.QUEST_SITE_PLANT, payload: { siteId: site.id, cropId } });
    persist();
    return true;
  }

  function harvestAtSite(site, cropId) {
    const before = getState().campaign?.pantry?.[cropId] ?? 0;
    store.dispatch({ type: Actions.QUEST_SITE_HARVEST, payload: { siteId: site.id, cropId } });
    const harvested = (getState().campaign?.pantry?.[cropId] ?? 0) > before;
    if (harvested) {
      showToast(`Harvested ${getCropById(cropId)?.name ?? cropId} from the greenhouse.`, 2400, 'success');
      persist();
    }
    return harvested;
  }

  function useCloverPlot(site) {
    const state = getState();
    if (!siteQuestActive(site, state)) {
      showToast("Sam's restoration plot. Check the neighborhood notice board.", 2400, 'info');
      return false;
    }
    const cropId = site.crops[0].cropId;
    if (!plantAtSite(site, cropId)) {
      showToast('All the clover patches are in.', 2000, 'info');
      return false;
    }
    const planted = getSitePlantingCount(normalizeQuestLedger(getState().campaign?.questLedger), site.id);
    showToast(`Wild clover patch planted (${planted}/${site.slots})`, 2200, 'success');
    return true;
  }

  function tendGreenhouse(site) {
    const state = getState();
    const chapter = state.campaign?.currentChapter ?? 1;
    const ledger = normalizeQuestLedger(state.campaign?.questLedger);
    const lines = [];
    const choices = [];
    site.crops.forEach((crop) => {
      const name = getCropById(crop.cropId)?.name ?? titleCase(crop.cropId);
      const planting = getActivePlanting(ledger, site.id, crop.cropId);
      if (!planting) {
        lines.push(`${name}: empty bed`);
        choices.push({
          label: `Plant ${name} (${crop.growSeasons} season${crop.growSeasons === 1 ? '' : 's'})`,
          effect: { run: () => {
            if (plantAtSite(site, crop.cropId)) showToast(`${name} planted in the greenhouse.`, 2200, 'success');
          } },
        });
      } else if (isPlantingReady(planting, site, chapter)) {
        lines.push(`${name}: ready to harvest`);
        choices.push({ label: `Harvest ${name}`, effect: { run: () => harvestAtSite(site, crop.cropId) } });
      } else {
        const left = planting.plantedChapter + crop.growSeasons - chapter;
        lines.push(`${name}: growing, ${left} more season${left === 1 ? '' : 's'}`);
      }
    });
    choices.push({ label: 'Leave' });
    return startScene({
      id: `quest_site:${site.id}`,
      priority: 1,
      skippable: true,
      beats: [{ speaker: 'narrator', text: `${site.plantText}  ${lines.join(' · ')}`, choices }],
    });
  }

  function visitFestivalBooth(site) {
    const state = getState();
    const active = state.campaign?.activeFestival;
    const festival = active?.id ? FESTIVALS[active.id] : null;
    const activity = festival?.activities?.[site.activityIndex];
    if (!festival || !activity) {
      showToast('The booth is packed away until the next festival.', 2000, 'info');
      return false;
    }
    if ((active.activitiesCompleted ?? []).includes(activity.id)) {
      showToast(`You already did the ${activity.name}.`, 2000, 'info');
      return false;
    }
    const host = FESTIVAL_HOSTS[(site.activityIndex + FESTIVAL_HOSTS.indexOf('maya')) % FESTIVAL_HOSTS.length];
    return startScene({
      id: `quest_site:${festival.id}:${activity.id}`,
      priority: 1,
      skippable: true,
      beats: [
        { speaker: host, text: festival.npcDialogue?.[host] ?? `Welcome to the ${festival.name}!` },
        {
          speaker: 'narrator',
          text: `${festival.name}: ${activity.name}. ${activity.description}.`,
          choices: [
            { label: 'Join in', effect: { run: () => joinFestivalActivity(activity.id) } },
            { label: 'Maybe later' },
          ],
        },
      ],
    });
  }

  function joinFestivalActivity(activityId) {
    const rewards = festivalEngine?.doActivity(activityId);
    if (!rewards) return null;
    const festival = festivalEngine.getActiveFestival();
    const remaining = festivalEngine.getAvailableActivities().length;
    const summary = summarizeRewards(rewards);
    showToast(
      remaining
        ? `${festival?.name ?? 'Festival'}: activity done${summary ? ` — ${summary}` : ''}. ${remaining} to go.`
        : `${festival?.name ?? 'Festival'} complete for this year!${summary ? ` ${summary}` : ''}`,
      3200,
      'success',
    );
    persist();
    return rewards;
  }

  function interactSite(siteId) {
    const site = getQuestSite(siteId);
    if (!site) return false;
    switch (site.kind) {
      case 'notice_board': return readNoticeBoard();
      case 'discovery': return searchDiscovery(site);
      case 'planter':
        return site.crops.every((crop) => crop.growSeasons == null) ? useCloverPlot(site) : tendGreenhouse(site);
      case 'festival_booth': return visitFestivalBooth(site);
      default: return false;
    }
  }

  function getSiteInteractables(zoneId) {
    return getQuestSitesForZone(zoneId).map((site) => ({
      id: `quest-site:${site.id}`,
      position: { x: site.position.x, y: 0, z: site.position.z },
      radius: site.radius ?? 1,
      label: (state) => getSiteLabel(site, state ?? getState()),
      onInteract: () => interactSite(site.id),
    }));
  }

  function getNpcLabel(npcId, state = getState()) {
    const name = getNPC(npcId)?.name ?? titleCase(npcId);
    const status = giverStatus([npcId], state);
    if (status.ready) return `Talk to ${name} · quest ready`;
    if (status.offers) return `Talk to ${name} · new request`;
    return `Talk to ${name}`;
  }

  /** Wrap a zone NPC interactable (scene markers carry only npcId) with talk behavior. */
  function decorateNpcInteractable(definition) {
    if (!definition?.npcId || !getNPC(definition.npcId)) return definition;
    return {
      ...definition,
      label: (state) => getNpcLabel(definition.npcId, state ?? getState()),
      onInteract: () => talkTo(definition.npcId),
    };
  }

  // --- Season, festivals, evaluation ------------------------------------------

  function syncFestival(state) {
    if (!festivalEngine) return;
    const season = state.season?.season;
    const chapter = state.campaign?.currentChapter ?? 1;
    const active = state.campaign?.activeFestival;
    if (active) {
      const stale = active.season !== season || (Number.isInteger(active.chapter) && active.chapter !== chapter);
      if (!stale) return;
      // Close last season's festival, then fall through so this season's opens right away.
      festivalEngine.endFestival();
    }
    if (state.season?.phase !== PHASES.PLANNING) return;
    const festival = festivalEngine.getFestivalForSeason(season);
    if (!festival) return;
    const year = getCampaignYear(chapter);
    const ledger = normalizeQuestLedger(state.campaign?.questLedger);
    if (ledger.festivalsCompleted.some((entry) => entry.festivalId === festival.id && entry.year === year)) return;
    if (festivalEngine.startFestival(festival.id)) {
      showToast(`${festival.name} is on! The Festival Grounds are open this season.`, 3200, 'success');
    }
  }

  function syncSeason() {
    const state = getState();
    const key = `${state.campaign?.currentChapter ?? 1}:${state.season?.season ?? ''}`;
    if (key !== lastSeasonKey) {
      lastSeasonKey = key;
      questEngine.checkTimedQuests().forEach((questId) => {
        showToast(`Quest failed: ${questById(questId)?.title ?? questId}. The season turned.`, 3200, 'error');
      });
    }
    syncFestival(getState());
  }

  function evaluateNow() {
    if (disposed) return [];
    syncSeason();
    const changes = questEngine.evaluateProgress();
    changes
      .filter((change) => change.newState === QuestStates.READY_TO_TURN_IN)
      .forEach((change) => {
        const quest = questById(change.questId);
        if (!quest) return;
        const where = NEIGHBOR_NAMES[quest.npc] ? 'the notice board' : getQuestGiverName(quest.npc);
        showToast(`Ready to turn in: ${quest.title}. Return to ${where}.`, 3200, 'success');
      });
    if (changes.length) persist();
    render();
    return changes;
  }

  function scheduleEvaluate() {
    if (evaluateQueued || disposed) return;
    evaluateQueued = true;
    queueMicrotask(() => {
      evaluateQueued = false;
      evaluateNow();
    });
  }

  const unsubscribe = store.subscribe((_snapshot, action) => {
    if (disposed) return;
    if (action?.type === Actions.UPDATE_QUEST_STATE) {
      render();
      return;
    }
    scheduleEvaluate();
  });

  // --- HUD tracker and quest log ------------------------------------------------

  function presenceZone(quest, state) {
    if (NEIGHBOR_NAMES[quest.npc]) return 'neighborhood';
    return resolveNpcPresence(quest.npc, state, canEnterZone ? { canEnterZone } : {})?.zone ?? null;
  }

  function renderTracker() {
    if (!hudRoot || typeof document === 'undefined') return;
    if (!trackerEl) {
      trackerEl = document.createElement('aside');
      trackerEl.className = 'quest-tracker';
      trackerEl.setAttribute('aria-label', 'Active quests');
      trackerEl.addEventListener('click', (event) => {
        if (event.target.closest('[data-quest-log-toggle]')) toggleLog();
      }, signal ? { signal } : undefined);
      hudRoot.appendChild(trackerEl);
    }
    const state = getState();
    const active = questEngine.getActiveQuests();
    const items = active.map((quest) => {
      const ready = isReady(quest, state);
      const giver = getQuestGiverName(quest.npc);
      const lines = progressLines(quest, state);
      return `
        <li class="quest-tracker__item${ready ? ' is-ready' : ''}">
          <div class="quest-tracker__title">${escapeHtml(quest.title)}</div>
          ${ready
    ? `<div class="quest-tracker__giver">Return to ${escapeHtml(NEIGHBOR_NAMES[quest.npc] ? 'the notice board' : giver)}</div>`
    : `<ul class="quest-tracker__steps">${lines.map((line) => `
              <li class="${line.met ? 'is-done' : ''}">${escapeHtml(line.label)} <span>${line.current}/${line.target}</span></li>`).join('')}
            </ul>`}
        </li>`;
    }).join('');
    trackerEl.innerHTML = `
      <button type="button" class="quest-tracker__header" data-quest-log-toggle aria-label="Open quest log (Q)">
        <span>Quests</span><span class="quest-tracker__count">${active.length}/3</span><kbd>Q</kbd>
      </button>
      ${items ? `<ol class="quest-tracker__list">${items}</ol>` : '<p class="quest-tracker__empty">Talk to neighbors to pick up requests.</p>'}
    `;
  }

  function renderLogCard(quest, state, mode) {
    const entry = entryOf(quest.id, state);
    const meta = mode === 'available'
      ? describeQuestGiverLocation(quest, presenceZone(quest, state))
      : mode === 'completed'
        ? `${getQuestGiverName(quest.npc)} · ${questEngine.resolveQuestOutcome(quest.id, entry?.choiceId ?? entry?.outcome?.id ?? null)?.label ?? 'Completed'}`
        : `${isReady(quest, state) ? 'Ready to turn in' : 'In progress'} · ${describeQuestGiverLocation(quest, presenceZone(quest, state))}`;
    const steps = mode === 'active'
      ? `<ul class="quest-log__steps">${progressLines(quest, state).map((line) => `
          <li class="${line.met ? 'is-done' : ''}">${line.met ? '✓' : '•'} ${escapeHtml(line.label)} <span>${line.current}/${line.target}</span></li>`).join('')}</ul>`
      : '';
    const dropButton = mode === 'active' && !isReady(quest, state)
      ? `<button type="button" class="quest-log__drop" data-quest-drop="${escapeHtml(quest.id)}">Drop quest</button>`
      : '';
    return `
      <article class="read-only-sheet__card quest-log__card">
        <div class="read-only-sheet__card-title">${escapeHtml(quest.title)}</div>
        <div class="read-only-sheet__card-meta">${escapeHtml(meta)}</div>
        ${mode === 'completed' ? '' : `<p class="quest-log__desc">${escapeHtml(quest.description)}</p>`}
        ${steps}
        ${dropButton}
      </article>`;
  }

  function renderLog() {
    if (!logEl) return;
    const state = getState();
    const active = questEngine.getActiveQuests();
    const available = deck().filter((quest) => isAvailable(quest, state));
    const completed = deck().filter((quest) => entryOf(quest.id, state)?.state === QuestStates.COMPLETED);
    const section = (title, list, mode, empty) => `
      <section class="quest-log__section">
        <h3 class="quest-log__heading">${title} <span>${list.length}</span></h3>
        ${list.length
    ? `<div class="read-only-sheet__list">${list.map((quest) => renderLogCard(quest, state, mode)).join('')}</div>`
    : `<div class="read-only-sheet__empty">${empty}</div>`}
      </section>`;
    logEl.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header quest-log__header">
        <div>
          <div class="palette-title quest-log__title">Quest Log</div>
          <div class="quest-log__subtitle">${active.length}/3 active · ${completed.length}/${deck().length} completed</div>
        </div>
        <button type="button" class="palette-dismiss" data-quest-log-close aria-label="Close quest log">&times;</button>
      </div>
      <div class="quest-log__body">
        ${section('Active', active, 'active', 'No active quests.')}
        ${section('Available now', available, 'available', 'Nothing new this season. Requests open up as chapters and seasons change.')}
        ${section('Completed', completed, 'completed', 'None yet.')}
      </div>
    `;
    logEl.querySelector('[data-quest-log-close]')?.addEventListener('click', closeLog, signal ? { signal } : undefined);
    logEl.querySelectorAll('[data-quest-drop]').forEach((button) => {
      button.addEventListener('click', () => drop(button.dataset.questDrop), signal ? { signal } : undefined);
    });
  }

  function openLog() {
    if (logEl || !hudRoot || typeof document === 'undefined') return;
    logEl = document.createElement('div');
    logEl.className = 'panel-sheet is-open quest-log';
    logEl.id = 'quest-log-panel';
    logEl.setAttribute('role', 'dialog');
    logEl.setAttribute('aria-label', 'Quest log');
    hudRoot.appendChild(logEl);
    renderLog();
  }

  function closeLog() {
    logEl?.remove();
    logEl = null;
  }

  function toggleLog() {
    if (logEl) closeLog();
    else openLog();
  }

  function render() {
    if (disposed) return;
    renderTracker();
    renderLog();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (event) => {
      if (disposed || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'q' && event.key !== 'Q') return;
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (isInputBlocked()) return;
      toggleLog();
    }, signal ? { signal } : undefined);
  }

  render();

  return {
    talkTo,
    readNoticeBoard,
    dropQuest: drop,
    interactSite,
    getSiteInteractables,
    decorateNpcInteractable,
    getNpcLabel,
    getSiteLabel: (siteId, state) => {
      const site = getQuestSite(siteId);
      return site ? getSiteLabel(site, state ?? getState()) : null;
    },
    evaluateNow,
    toggleLog,
    openLog,
    closeLog,
    isLogOpen: () => Boolean(logEl),
    getSnapshot: () => {
      const state = getState();
      return {
        active: questEngine.getActiveQuests().map((quest) => ({
          id: quest.id,
          state: entryOf(quest.id, state)?.state ?? null,
          progress: progressLines(quest, state),
        })),
        available: deck().filter((quest) => isAvailable(quest, state)).map((quest) => quest.id),
        completed: deck().filter((quest) => entryOf(quest.id, state)?.state === QuestStates.COMPLETED).map((quest) => quest.id),
        activeFestival: state.campaign?.activeFestival?.id ?? null,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      closeLog();
      trackerEl?.remove();
      trackerEl = null;
    },
  };
}
