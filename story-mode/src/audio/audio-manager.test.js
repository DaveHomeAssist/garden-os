import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioManager } from './audio-manager.js';

class AudioContextMock {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  async resume() {}
  async suspend() {}
  async close() {}
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { value: 0 },
      connect: vi.fn(),
    };
  }
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', AudioContextMock);
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AudioManager', () => {
  it('clamps volume controls and mute state', () => {
    const manager = new AudioManager();
    manager.setMasterVolume(2);
    manager.setSFXVolume(-1);
    manager.setAmbientVolume(0.5);
    manager.setMuted(true);

    expect(manager.masterVolume).toBe(1);
    expect(manager.sfxVolume).toBe(0);
    expect(manager.ambientVolume).toBe(0.5);
    expect(manager.muted).toBe(true);
  });

  it('registers and plays placeholder sfx', async () => {
    const manager = new AudioManager();
    await manager.init();
    manager.registerSFX('test', '/missing.ogg', { volume: 0.4, pitch: 1.1 });

    expect(manager.sfxRegistry.has('test')).toBe(true);
    expect(manager.playSFX('test')).toBe(true);
  });
});
