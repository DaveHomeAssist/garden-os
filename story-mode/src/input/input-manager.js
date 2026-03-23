function normalizeKey(key) {
  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  if (typeof key === 'string' && key.length === 1) return key.toLowerCase();
  return key;
}

function parseKeyBinding(binding) {
  const raw = String(binding ?? '').trim();
  const tokens = raw.split('+').map((token) => token.trim()).filter(Boolean);
  const parsed = {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    key: '',
  };

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (lower === 'alt') parsed.altKey = true;
    else if (lower === 'ctrl' || lower === 'control') parsed.ctrlKey = true;
    else if (lower === 'meta' || lower === 'cmd' || lower === 'command') parsed.metaKey = true;
    else if (lower === 'shift') parsed.shiftKey = true;
    else parsed.key = normalizeKey(token);
  });

  if (!parsed.key) {
    parsed.key = normalizeKey(raw);
  }

  return parsed;
}

function matchesKeyBinding(event, binding) {
  const key = normalizeKey(event.key);
  return (
    key === binding.key
    && event.altKey === binding.altKey
    && event.ctrlKey === binding.ctrlKey
    && event.metaKey === binding.metaKey
    && event.shiftKey === binding.shiftKey
  );
}

export class InputManager {
  constructor(targetElement, options = {}) {
    this.targetElement = targetElement;
    this.keyboardTarget = options.keyboardTarget ?? window;
    this.pointerTarget = options.pointerTarget ?? targetElement;
    this.actionBindings = new Map();
    this.actionListeners = new Map();
    this.pointerMoveListeners = new Set();
    this.pointerLeaveListeners = new Set();
    this.heldKeys = new Set();
    this.lastPointerSource = 'pointer';
    this.pointerPosition = {
      x: 0,
      y: 0,
      clientX: 0,
      clientY: 0,
      inside: false,
      source: 'pointer',
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.keyboardTarget.addEventListener('keydown', this.handleKeyDown);
    this.keyboardTarget.addEventListener('keyup', this.handleKeyUp);
    this.pointerTarget.addEventListener('pointermove', this.handlePointerMove);
    this.pointerTarget.addEventListener('pointerleave', this.handlePointerLeave);
    this.pointerTarget.addEventListener('pointerdown', this.handlePointerDown);
    this.pointerTarget.addEventListener('pointerup', this.handlePointerUp);
    this.pointerTarget.addEventListener('pointercancel', this.handlePointerCancel);
    this.pointerTarget.addEventListener('click', this.handleClick);
  }

  registerAction(name, bindings = {}) {
    this.actionBindings.set(name, {
      keys: (bindings.keys ?? []).map(parseKeyBinding),
      pointer: Boolean(bindings.pointer),
      touch: Boolean(bindings.touch),
    });
  }

  on(actionName, callback) {
    if (!this.actionListeners.has(actionName)) {
      this.actionListeners.set(actionName, new Set());
    }
    this.actionListeners.get(actionName).add(callback);
    return () => this.off(actionName, callback);
  }

  off(actionName, callback) {
    this.actionListeners.get(actionName)?.delete(callback);
  }

  onPointerMove(callback) {
    this.pointerMoveListeners.add(callback);
    return () => this.pointerMoveListeners.delete(callback);
  }

  onPointerLeave(callback) {
    this.pointerLeaveListeners.add(callback);
    return () => this.pointerLeaveListeners.delete(callback);
  }

  update(dt) {
    this.lastDt = dt;
  }

  isKeyHeld(key) {
    return this.heldKeys.has(normalizeKey(key));
  }

  getPointerPosition() {
    return { ...this.pointerPosition };
  }

  emitAction(actionName, source, event) {
    const listeners = this.actionListeners.get(actionName);
    if (!listeners?.size) return false;

    const payload = {
      action: actionName,
      source,
      event,
      position: this.getPointerPosition(),
      handled: false,
      preventDefault() {
        event?.preventDefault?.();
        this.handled = true;
      },
      stop() {
        this.handled = true;
      },
    };

    for (const callback of listeners) {
      callback(payload);
      if (payload.handled) break;
    }

    return payload.handled;
  }

  updatePointerPosition(event, inside = true) {
    const rect = this.targetElement.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const clientX = event?.clientX ?? this.pointerPosition.clientX;
    const clientY = event?.clientY ?? this.pointerPosition.clientY;

    this.pointerPosition = {
      x: ((clientX - rect.left) / width) * 2 - 1,
      y: -((clientY - rect.top) / height) * 2 + 1,
      clientX,
      clientY,
      inside,
      source: this.lastPointerSource,
    };
  }

  handleKeyDown(event) {
    this.heldKeys.add(normalizeKey(event.key));

    for (const [actionName, bindings] of this.actionBindings) {
      if (!bindings.keys.some((binding) => matchesKeyBinding(event, binding))) continue;
      const handled = this.emitAction(actionName, 'keyboard', event);
      if (handled) break;
    }
  }

  handleKeyUp(event) {
    this.heldKeys.delete(normalizeKey(event.key));
  }

  handlePointerMove(event) {
    this.lastPointerSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    this.updatePointerPosition(event, true);
    const payload = {
      event,
      source: this.lastPointerSource,
      position: this.getPointerPosition(),
    };
    this.pointerMoveListeners.forEach((callback) => callback(payload));
  }

  handlePointerLeave(event) {
    this.updatePointerPosition(event, false);
    const payload = {
      event,
      source: this.lastPointerSource,
      position: this.getPointerPosition(),
    };
    this.pointerLeaveListeners.forEach((callback) => callback(payload));
  }

  handlePointerDown(event) {
    this.lastPointerSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    this.updatePointerPosition(event, true);
  }

  handlePointerUp(event) {
    this.lastPointerSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    this.updatePointerPosition(event, true);
  }

  handlePointerCancel(event) {
    this.lastPointerSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    this.updatePointerPosition(event, false);
  }

  handleClick(event) {
    this.updatePointerPosition(event, true);
    const source = this.lastPointerSource;

    for (const [actionName, bindings] of this.actionBindings) {
      const matchesPointer = bindings.pointer && source === 'pointer';
      const matchesTouch = bindings.touch && source === 'touch';
      if (!matchesPointer && !matchesTouch) continue;
      const handled = this.emitAction(actionName, source, event);
      if (handled) break;
    }
  }

  dispose() {
    this.keyboardTarget.removeEventListener('keydown', this.handleKeyDown);
    this.keyboardTarget.removeEventListener('keyup', this.handleKeyUp);
    this.pointerTarget.removeEventListener('pointermove', this.handlePointerMove);
    this.pointerTarget.removeEventListener('pointerleave', this.handlePointerLeave);
    this.pointerTarget.removeEventListener('pointerdown', this.handlePointerDown);
    this.pointerTarget.removeEventListener('pointerup', this.handlePointerUp);
    this.pointerTarget.removeEventListener('pointercancel', this.handlePointerCancel);
    this.pointerTarget.removeEventListener('click', this.handleClick);
    this.actionListeners.clear();
    this.pointerMoveListeners.clear();
    this.pointerLeaveListeners.clear();
    this.heldKeys.clear();
  }
}
