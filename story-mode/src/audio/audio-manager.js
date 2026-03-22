const DEFAULT_SFX_LIBRARY = {
  plant: { volume: 0.3, pitch: 1, cooldownMs: 0 },
  water: { volume: 0.25, pitch: 1, cooldownMs: 0 },
  harvest: { volume: 0.35, pitch: 1.1, cooldownMs: 0 },
  event_good: { volume: 0.3, pitch: 1.2, cooldownMs: 0 },
  event_bad: { volume: 0.3, pitch: 0.8, cooldownMs: 0 },
  ui_click: { volume: 0.1, pitch: 1.2, cooldownMs: 0 },
  ui_tab: { volume: 0.12, pitch: 1.05, cooldownMs: 0 },
  tool_switch: { volume: 0.15, pitch: 1, cooldownMs: 0 },
  footstep: { volume: 0.08, pitch: 1, cooldownMs: 60 },
  quest_accept: { volume: 0.3, pitch: 1.25, cooldownMs: 0 },
  quest_complete: { volume: 0.4, pitch: 1.4, cooldownMs: 0 },
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value ?? 0));
}

function createAudioElement(url) {
  if (typeof Audio === 'undefined') {
    return {
      src: url,
      loop: false,
      volume: 0,
      paused: true,
      play: async () => {},
      pause: () => {},
      remove: () => {},
    };
  }
  const audio = new Audio(url);
  audio.loop = true;
  return audio;
}

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
    this.masterVolume = 1;
    this.sfxVolume = 1;
    this.ambientVolume = 0.3;
    this.muted = false;
    this.sfxRegistry = new Map();
    this.sfxLastPlayed = new Map();
    this.ambient = null;
    this.visibilityHandler = null;

    Object.entries(DEFAULT_SFX_LIBRARY).forEach(([id, options]) => {
      this.registerSFX(id, `assets/audio/sfx/${id}.ogg`, options);
    });
  }

  async init() {
    if (this.initialized) return true;
    const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (Ctx) {
      this.audioContext = new Ctx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }
    this.visibilityHandler = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) this.suspend();
      else this.resume();
    };
    document?.addEventListener?.('visibilitychange', this.visibilityHandler);
    this.initialized = true;
    return true;
  }

  registerSFX(id, url, options = {}) {
    this.sfxRegistry.set(id, {
      id,
      url,
      volume: clamp01(options.volume ?? 1),
      pitch: options.pitch ?? 1,
      cooldownMs: options.cooldownMs ?? 0,
    });
  }

  playPlaceholder(id, pitch = 1) {
    if (!this.audioContext || this.muted) return false;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.type = id === 'event_bad' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = 220 * pitch;
    gainNode.gain.value = clamp01(this.masterVolume * this.sfxVolume * 0.2);
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
    return true;
  }

  playSFX(id) {
    const config = this.sfxRegistry.get(id);
    if (!config || this.muted) return false;
    const lastPlayed = this.sfxLastPlayed.get(id) ?? 0;
    const now = Date.now();
    if (now - lastPlayed < config.cooldownMs) return false;
    this.sfxLastPlayed.set(id, now);
    return this.playPlaceholder(id, config.pitch);
  }

  async setAmbient(url, { fadeInMs = 2000, volume = 0.3 } = {}) {
    const next = createAudioElement(url);
    next.volume = 0;
    next.loop = true;
    await next.play?.().catch?.(() => {
      console.warn(`[GOS audio] Ambient missing or blocked: ${url}`);
    });

    const previous = this.ambient;
    this.ambient = { element: next, url, volume: clamp01(volume) };
    next.volume = this.muted ? 0 : clamp01(this.masterVolume * this.ambientVolume * volume);

    if (previous?.element) {
      globalThis.setTimeout?.(() => {
        previous.element.pause?.();
      }, fadeInMs);
    }
  }

  stopAmbient(fadeOutMs = 2000) {
    if (!this.ambient?.element) return;
    const active = this.ambient.element;
    globalThis.setTimeout?.(() => {
      active.pause?.();
      active.remove?.();
    }, fadeOutMs);
    this.ambient = null;
  }

  setMasterVolume(v) {
    this.masterVolume = clamp01(v);
    this.syncAmbientVolume();
  }

  setSFXVolume(v) {
    this.sfxVolume = clamp01(v);
  }

  setAmbientVolume(v) {
    this.ambientVolume = clamp01(v);
    this.syncAmbientVolume();
  }

  syncAmbientVolume() {
    if (!this.ambient?.element) return;
    const target = this.muted ? 0 : clamp01(this.masterVolume * this.ambientVolume * (this.ambient.volume ?? 1));
    this.ambient.element.volume = target;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.syncAmbientVolume();
  }

  async suspend() {
    await this.audioContext?.suspend?.();
    this.ambient?.element?.pause?.();
  }

  async resume() {
    await this.audioContext?.resume?.();
    await this.ambient?.element?.play?.().catch?.(() => {});
  }

  dispose() {
    document?.removeEventListener?.('visibilitychange', this.visibilityHandler);
    this.stopAmbient(0);
    this.audioContext?.close?.();
    this.audioContext = null;
    this.initialized = false;
  }
}

export {
  DEFAULT_SFX_LIBRARY,
};
