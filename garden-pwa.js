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
      const probe = await fetch(url.href, { method: 'HEAD', cache: 'no-store' });
      if (!probe.ok) return null;
      return await navigator.serviceWorker.register(url.href, {
        scope: new URL('./', url).pathname,
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
