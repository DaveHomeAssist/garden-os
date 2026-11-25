/* Shared Garden OS service-worker registration. */
(function initGardenPwa(global) {
  'use strict';

  function serviceWorkerUrl() {
    const storySegment = '/story-mode/';
    if (global.location.pathname.includes(storySegment)) {
      return new URL('../sw.js', global.location.href);
    }
    return new URL('sw.js', global.location.href);
  }

  async function registerGardenServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    const isLocalStoryDev = ['127.0.0.1', 'localhost'].includes(global.location.hostname)
      && global.location.pathname.includes('/story-mode/');
    if (isLocalStoryDev) return null;
    try {
      const url = serviceWorkerUrl();
      // Scope is the Garden OS root (/garden-os/ on GitHub Pages) on purpose:
      // one worker serves the planner and Story Mode, and sw.js picks the
      // offline fallback per area (Story Mode never falls back to the planner).
      // updateViaCache 'none' re-checks sw.js on every visit so a new
      // CACHE_VERSION is picked up right after a deploy, not after HTTP cache expiry.
      return await navigator.serviceWorker.register(url.href, {
        scope: new URL('./', url).pathname,
        updateViaCache: 'none',
      });
    } catch (error) {
      console.warn('[Garden OS] Service worker registration failed:', error);
      return null;
    }
  }

  global.GardenPwa = Object.freeze({ register: registerGardenServiceWorker });
  if (document.readyState === 'complete') {
    void registerGardenServiceWorker();
  } else {
    global.addEventListener('load', () => { void registerGardenServiceWorker(); }, { once: true });
  }
})(window);
