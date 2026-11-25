// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { AudioManager } from './audio-manager.js';
import {
  PARENT_MUTE_EVENT,
  effectiveMuted,
  installParentMuteListener,
  isParentMuted,
  isTrustedMuteOrigin,
  parseMuteMessage,
  resetParentMuteForTests,
} from './parent-mute.js';

let cleanup = () => {};

function setup({ dev = false } = {}) {
  const audio = new AudioManager();
  const apply = () => audio.setMuted(effectiveMuted(false));
  window.addEventListener(PARENT_MUTE_EVENT, apply);
  const remove = installParentMuteListener({ target: window, dev });
  cleanup = () => { remove(); window.removeEventListener(PARENT_MUTE_EVENT, apply); };
  return audio;
}

function post(data, origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

afterEach(() => {
  cleanup();
  resetParentMuteForTests();
});

describe('mixmash.games Mute All postMessage', () => {
  it('a valid message from mixmash.games mutes and unmutes Garden OS audio', () => {
    const audio = setup();
    post({ type: 'mixmash:mute', muted: true }, 'https://mixmash.games');
    expect(audio.muted).toBe(true);
    expect(isParentMuted()).toBe(true);
    post({ type: 'mixmash:mute', muted: false }, 'https://www.mixmash.games');
    expect(audio.muted).toBe(false);
  });

  it('ignores a wrong origin', () => {
    const audio = setup();
    for (const origin of ['https://evil.example', 'https://mixmash.games.evil.example', 'http://mixmash.games', 'null', '', 'http://localhost:5174']) {
      post({ type: 'mixmash:mute', muted: true }, origin);
    }
    expect(audio.muted).toBe(false);
    expect(isParentMuted()).toBe(false);
  });

  it('ignores a bad shape', () => {
    const audio = setup();
    for (const data of [
      null, 'mixmash:mute', ['mixmash:mute', true],
      { type: 'mixmash:mute' },
      { type: 'mixmash:mute', muted: 'true' },
      { type: 'mixmash:mute', muted: 1 },
      { type: 'MIXMASH:MUTE', muted: true },
      { type: 'mixmash:muteAll', muted: true },
    ]) post(data, 'https://mixmash.games');
    expect(audio.muted).toBe(false);
  });

  it('accepts localhost only in a dev build', () => {
    expect(isTrustedMuteOrigin('http://localhost:5174', { dev: false })).toBe(false);
    expect(isTrustedMuteOrigin('http://localhost:5174', { dev: true })).toBe(true);
    expect(isTrustedMuteOrigin('http://127.0.0.1:4318', { dev: true })).toBe(true);
    expect(isTrustedMuteOrigin('http://localhost.evil.example', { dev: true })).toBe(false);
    const audio = setup({ dev: true });
    post({ type: 'mixmash:mute', muted: true }, 'http://localhost:5174');
    expect(audio.muted).toBe(true);
  });

  it('a wrapper unmute does not override the player\'s own mute', () => {
    expect(parseMuteMessage({ type: 'mixmash:mute', muted: false })).toBe(false);
    expect(effectiveMuted(true)).toBe(true);
  });
});
