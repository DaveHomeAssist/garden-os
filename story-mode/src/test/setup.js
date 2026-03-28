/**
 * Vitest global setup — polyfills for Node.js 14.
 *
 * Node 14 lacks structuredClone (added 17), AbortController as a global
 * (added 15), and browser environments may lack PointerEvent.
 */

// structuredClone — plain JSON-round-trip is sufficient for game-state objects
if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = (value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
}

// AbortController — Three.js LoadingManager requires it at import time
if (typeof AbortController === 'undefined') {
  globalThis.AbortController = class AbortController {
    constructor() {
      const handlers = [];
      this.signal = {
        aborted: false,
        reason: undefined,
        _handlers: handlers,
        addEventListener(type, fn) {
          if (type === 'abort') handlers.push(fn);
        },
        removeEventListener(type, fn) {
          const idx = handlers.indexOf(fn);
          if (idx !== -1) handlers.splice(idx, 1);
        },
        dispatchEvent() {},
        throwIfAborted() {
          if (this.aborted) throw this.reason;
        },
      };
    }
    abort(reason) {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      this.signal.reason = reason;
      const event = { type: 'abort', target: this.signal };
      this.signal._handlers.forEach((fn) => fn(event));
    }
  };
}

// PointerEvent — only inject in jsdom where MouseEvent exists but PointerEvent may not
if (typeof PointerEvent === 'undefined' && typeof MouseEvent !== 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary !== false;
      this.pressure = init.pressure ?? 0;
      this.tiltX = init.tiltX ?? 0;
      this.tiltY = init.tiltY ?? 0;
      this.width = init.width ?? 1;
      this.height = init.height ?? 1;
    }
  };
}
