/**
 * Dialogue Runner — higher-level API over CutsceneMachine for
 * common dialogue patterns: NPC conversations, quest offers,
 * and branching interactions.
 *
 * The CutsceneMachine already handles:
 *   - choice rendering + selection
 *   - branchId branching to alternative beat arrays
 *   - onEffect dispatch of store actions
 *
 * This module provides convenience builders for structured dialogues.
 */

import { getSpeaker } from '../data/speakers.js';
import { Actions } from './store.js';

/**
 * Build a quest offer scene with accept/decline choices.
 */
export function buildQuestOfferScene(quest, npcId, { chapter = 1, season = 'spring' } = {}) {
  const speaker = getSpeaker(npcId) ?? getSpeaker('narrator');
  return {
    id: `quest-offer-${quest.id}`,
    trigger: 'npc_interaction',
    priority: 80,
    once: false,
    skippable: true,
    beats: [
      {
        speaker: npcId,
        text: quest.offerText ?? `I have a task for you: ${quest.name}.`,
        emotion: 'warm',
        portraitAnim: 'talk',
        choices: [
          {
            label: 'Accept',
            effect: { action: Actions.ACCEPT_QUEST, payload: { questId: quest.id } },
          },
          {
            label: 'Not now',
            effect: null,
          },
        ],
      },
    ],
  };
}

/**
 * Build a branching conversation scene with multiple paths.
 */
export function buildBranchingScene(id, { speaker, intro, branches, priority = 60 }) {
  const choices = Object.entries(branches).map(([branchId, branch]) => ({
    label: branch.label,
    branchId,
    effect: branch.effect ?? null,
  }));

  const branchBeats = {};
  for (const [branchId, branch] of Object.entries(branches)) {
    branchBeats[branchId] = (branch.beats ?? []).map((beat) => ({
      speaker: beat.speaker ?? speaker,
      text: beat.text,
      emotion: beat.emotion ?? 'neutral',
      portraitAnim: beat.portraitAnim ?? 'talk',
      ...(beat.choices ? { choices: beat.choices } : {}),
    }));
  }

  return {
    id,
    trigger: 'npc_interaction',
    priority,
    once: false,
    skippable: true,
    beats: [
      {
        speaker,
        text: intro,
        emotion: 'neutral',
        portraitAnim: 'talk',
        choices,
      },
    ],
    branches: branchBeats,
  };
}

/**
 * Build a simple NPC greeting scene (no choices).
 */
export function buildGreetingScene(npcId, lines, { priority = 40 } = {}) {
  return {
    id: `greeting-${npcId}`,
    trigger: 'npc_interaction',
    priority,
    once: false,
    skippable: true,
    beats: lines.map((line, i) => ({
      speaker: npcId,
      text: typeof line === 'string' ? line : line.text,
      emotion: (typeof line === 'object' ? line.emotion : null) ?? 'neutral',
      portraitAnim: i === 0 ? 'talk' : 'idle',
    })),
  };
}

/**
 * Build a reputation-gated dialogue — shows different content
 * based on the player's reputation tier with the NPC.
 */
export function buildReputationDialogue(npcId, tiers) {
  return function resolve(reputationValue) {
    const sortedTiers = Object.entries(tiers)
      .map(([threshold, scene]) => [Number(threshold), scene])
      .sort((a, b) => b[0] - a[0]);

    for (const [threshold, sceneFn] of sortedTiers) {
      if (reputationValue >= threshold) {
        return typeof sceneFn === 'function' ? sceneFn() : sceneFn;
      }
    }

    return buildGreetingScene(npcId, ['...']);
  };
}
