import { getHighestPriorityCutscene } from '../data/cutscenes.js';
import { getSpeaker } from '../data/speakers.js';

export function createCutsceneMachine({ onStateChange, onFinish, gardenScene }) {
  const state = {
    active: false,
    currentScene: null,
    currentBeatIndex: 0,
    currentTypedChars: 0,
    typingDone: false,
    queue: [],
    seenSceneIds: new Set(),
    currentCampaign: null,
    _typingTimer: null,
    _autoAdvanceTimer: null,
    _fastForward: false,
  };

  const TYPING_INTERVAL_MS = 30;
  const TYPING_FAST_MS = 5;

  function clearTimers() {
    if (state._typingTimer) {
      clearTimeout(state._typingTimer);
      state._typingTimer = null;
    }
    if (state._autoAdvanceTimer) {
      clearTimeout(state._autoAdvanceTimer);
      state._autoAdvanceTimer = null;
    }
  }

  function currentBeat() {
    return state.currentScene?.beats?.[state.currentBeatIndex] ?? null;
  }

  function syncSeenSet(campaign) {
    state.currentCampaign = campaign ?? state.currentCampaign;
    const seenIds = campaign?.seenCutsceneIds ?? [];
    state.seenSceneIds = new Set(seenIds);
  }

  function persistSeen(sceneId) {
    state.seenSceneIds.add(sceneId);
    if (!state.currentCampaign) return;
    if (!Array.isArray(state.currentCampaign.seenCutsceneIds)) {
      state.currentCampaign.seenCutsceneIds = [];
    }
    if (!state.currentCampaign.seenCutsceneIds.includes(sceneId)) {
      state.currentCampaign.seenCutsceneIds.push(sceneId);
    }
  }

  function insertQueued(scene) {
    const idx = state.queue.findIndex((queued) => queued.priority < scene.priority);
    if (idx === -1) state.queue.push(scene);
    else state.queue.splice(idx, 0, scene);
  }

  function applyBeat(beat) {
    if (!beat) return;
    if (beat.camera) gardenScene.setCameraPreset?.(beat.camera);
    if (beat.backdropTone) gardenScene.applyMood?.(beat.backdropTone);
    if (beat.sceneCue) gardenScene.playSceneCue?.(beat.sceneCue, beat);
  }

  function buildUiState() {
    const beat = currentBeat();
    if (!beat || !state.currentScene) {
      return { visible: false };
    }

    const speaker = getSpeaker(beat.speaker);
    return {
      visible: true,
      speaker: beat.speaker,
      speakerName: speaker.displayName,
      portraitId: speaker.portraitId,
      portraitEmoji: speaker.emoji,
      textFull: beat.text,
      textVisible: beat.text.slice(0, state.currentTypedChars),
      emotion: beat.emotion ?? speaker.defaultEmotion,
      portraitAnim: beat.portraitAnim ?? speaker.defaultAnim,
      sceneCue: beat.sceneCue ?? null,
      canAdvance: state.typingDone,
      canSkip: state.currentScene.skippable ?? true,
      beatIndex: state.currentBeatIndex,
      beatCount: state.currentScene.beats.length,
      side: speaker.side,
    };
  }

  function emitState() {
    onStateChange(buildUiState());
  }

  function typeNextChar() {
    const beat = currentBeat();
    if (!beat) return;

    if (state.currentTypedChars >= beat.text.length) {
      state.typingDone = true;
      emitState();
      if (beat.duration != null) {
        state._autoAdvanceTimer = setTimeout(() => machine.next(), beat.duration);
      }
      return;
    }

    state.currentTypedChars += 1;
    emitState();
    const delay = state._fastForward ? TYPING_FAST_MS : TYPING_INTERVAL_MS;
    state._typingTimer = setTimeout(typeNextChar, delay);
  }

  function startTyping() {
    state.currentTypedChars = 0;
    state.typingDone = false;
    clearTimers();
    typeNextChar();
  }

  function startScene(scene, campaign = state.currentCampaign) {
    state.currentCampaign = campaign;
    state.currentScene = scene;
    state.currentBeatIndex = 0;
    state.active = true;
    state._fastForward = false;
    clearTimers();
    applyBeat(currentBeat());
    startTyping();
  }

  function completeScene() {
    if (state.currentScene) {
      persistSeen(state.currentScene.id);
    }
    state.currentScene = null;
    state.currentBeatIndex = 0;
    state.currentTypedChars = 0;
    state.typingDone = false;
    state._fastForward = false;
    clearTimers();

    if (state.queue.length > 0) {
      startScene(state.queue.shift());
      return;
    }

    state.active = false;
    onFinish?.();
  }

  const machine = {
    isActive() {
      return state.active;
    },

    getState() {
      return {
        active: state.active,
        currentScene: state.currentScene,
        currentBeatIndex: state.currentBeatIndex,
        currentTypedChars: state.currentTypedChars,
        typingDone: state.typingDone,
        queue: [...state.queue],
        seenSceneIds: new Set(state.seenSceneIds),
      };
    },

    queueFromTrigger(triggerPayload, campaign) {
      syncSeenSet(campaign);
      if (triggerPayload?.type === 'chapter_start') {
        gardenScene.resetMood?.();
      }

      const scene = getHighestPriorityCutscene(triggerPayload, campaign, state.seenSceneIds);
      if (!scene) return false;

      if (!state.active) {
        startScene(scene, campaign);
        return true;
      }

      if (scene.priority > state.currentScene.priority) {
        const interrupted = state.currentScene;
        clearTimers();
        state.queue.unshift(interrupted);
        startScene(scene, campaign);
        return true;
      }

      insertQueued(scene);
      return true;
    },

    start(scene, campaign) {
      syncSeenSet(campaign);
      startScene(scene, campaign);
    },

    next() {
      if (!state.active) return;
      clearTimers();

      if (!state.typingDone) {
        const beat = currentBeat();
        if (!beat) return;
        state.currentTypedChars = beat.text.length;
        state.typingDone = true;
        emitState();
        if (beat.duration != null) {
          state._autoAdvanceTimer = setTimeout(() => machine.next(), beat.duration);
        }
        return;
      }

      const nextBeatIndex = state.currentBeatIndex + 1;
      if (nextBeatIndex >= state.currentScene.beats.length) {
        completeScene();
        return;
      }

      state.currentBeatIndex = nextBeatIndex;
      state._fastForward = false;
      applyBeat(currentBeat());
      startTyping();
    },

    startFastForward() {
      if (!state.active || state.typingDone) return;
      state._fastForward = true;
      clearTimers();
      typeNextChar();
    },

    stopFastForward() {
      state._fastForward = false;
    },

    skip() {
      if (!state.active || !(state.currentScene?.skippable ?? true)) return;
      clearTimers();
      completeScene();
    },

    finish() {
      clearTimers();
      state.queue = [];
      state.currentScene = null;
      state.active = false;
      onFinish?.();
    },
  };

  return machine;
}
