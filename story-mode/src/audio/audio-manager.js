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
    this.musicVolume = 0.5;
    this.sfxVolume = 1;
    this.ambientVolume = 0.3;
    this.muted = false;
    this.sfxRegistry = new Map();
    this.sfxLastPlayed = new Map();
    this.ambient = null;
    this.music = null;
    this.masterGain = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
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
      // 3-layer gain architecture: master → music/ambient/sfx
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.audioContext.createGain();
      this.ambientGain.gain.value = this.ambientVolume;
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
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

  async crossfadeTo(layer, url, { fadeMs = 2000, volume = 0.3 } = {}) {
    const current = this[layer];
    const next = createAudioElement(url);
    next.volume = 0;
    next.loop = true;
    await next.play?.().catch?.(() => {
      console.warn(`[GOS audio] ${layer} missing or blocked: ${url}`);
    });

    const targetVol = this.muted ? 0 : clamp01(volume);
    this[layer] = { element: next, url, volume: clamp01(volume) };

    // No previous track or instant fade — set volume immediately
    if (!current?.element || !fadeMs || fadeMs <= 50) {
      next.volume = targetVol;
      current?.element?.pause?.();
      current?.element?.remove?.();
      return;
    }

    // Crossfade: start new track at 0 and ramp up while old fades out
    next.volume = 0;

    // Fade in the new track, fade out old
    const steps = Math.max(1, Math.floor(fadeMs / 50));
    const stepMs = fadeMs / steps;
    let step = 0;
    const fadeInterval = globalThis.setInterval?.(() => {
      step++;
      const t = Math.min(1, step / steps);
      next.volume = targetVol * t;
      if (current?.element) {
        current.element.volume = Math.max(0, (current.volume ?? 0) * (1 - t));
      }
      if (step >= steps) {
        globalThis.clearInterval?.(fadeInterval);
        current?.element?.pause?.();
        current?.element?.remove?.();
      }
    }, stepMs);
  }

  async setAmbient(url, { fadeMs, fadeInMs, volume = 0.3 } = {}) {
    return this.crossfadeTo('ambient', url, { fadeMs: fadeMs ?? fadeInMs ?? 2000, volume });
  }

  async setMusic(url, { fadeMs = 2000, volume = 0.5 } = {}) {
    return this.crossfadeTo('music', url, { fadeMs, volume });
  }

  stopLayer(layer, fadeOutMs = 2000) {
    const active = this[layer];
    if (!active?.element) return;
    const el = active.element;
    const startVol = el.volume;
    const steps = Math.max(1, Math.floor(fadeOutMs / 50));
    let step = 0;
    const fadeInterval = globalThis.setInterval?.(() => {
      step++;
      el.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        globalThis.clearInterval?.(fadeInterval);
        el.pause?.();
        el.remove?.();
      }
    }, fadeOutMs / steps);
    this[layer] = null;
  }

  stopAmbient(fadeOutMs = 2000) {
    this.stopLayer('ambient', fadeOutMs);
  }

  stopMusic(fadeOutMs = 2000) {
    this.stopLayer('music', fadeOutMs);
  }

  setMasterVolume(v) {
    this.masterVolume = clamp01(v);
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    this.syncLayerVolumes();
  }

  setMusicVolume(v) {
    this.musicVolume = clamp01(v);
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    this.syncLayerVolumes();
  }

  setSFXVolume(v) {
    this.sfxVolume = clamp01(v);
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setAmbientVolume(v) {
    this.ambientVolume = clamp01(v);
    if (this.ambientGain) this.ambientGain.gain.value = this.ambientVolume;
    this.syncLayerVolumes();
  }

  syncLayerVolumes() {
    const masterMult = this.muted ? 0 : this.masterVolume;
    if (this.ambient?.element) {
      this.ambient.element.volume = clamp01(masterMult * this.ambientVolume * (this.ambient.volume ?? 1));
    }
    if (this.music?.element) {
      this.music.element.volume = clamp01(masterMult * this.musicVolume * (this.music.volume ?? 1));
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    this.syncLayerVolumes();
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
    this.stopMusic(0);
    this.audioContext?.close?.();
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.initialized = false;
  }
}

export {
  DEFAULT_SFX_LIBRARY,
};
