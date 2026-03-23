const DEFAULT_INTERACTION_RADIUS = 0.6;
const GRID_SCAN_RADIUS = 1;
const GRID_FALLBACK_WIDTH = 0.25;
const GRID_FALLBACK_DEPTH = 0.25;
const PULSE_PERIOD_SECONDS = 1.5;
const PULSE_BASE_INTENSITY = 0.3;
const PULSE_VARIANCE = 0.1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDistanceSquared(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return (dx * dx) + (dz * dz);
}

function inferGridMeta(gridLayout) {
  if (!Array.isArray(gridLayout) || gridLayout.length === 0) {
    return null;
  }

  const sortedByX = [...gridLayout].sort((left, right) => left.x - right.x);
  const sortedByZ = [...gridLayout].sort((left, right) => left.z - right.z);

  const xs = sortedByX.map((cell) => cell.x);
  const zs = sortedByZ.map((cell) => cell.z);

  const uniqueXs = xs.filter((value, index) => index === 0 || Math.abs(value - xs[index - 1]) > 0.001);
  const uniqueZs = zs.filter((value, index) => index === 0 || Math.abs(value - zs[index - 1]) > 0.001);

  if (uniqueXs.length === 0 || uniqueZs.length === 0) {
    return null;
  }

  return {
    minX: uniqueXs[0],
    maxX: uniqueXs[uniqueXs.length - 1],
    minZ: uniqueZs[0],
    maxZ: uniqueZs[uniqueZs.length - 1],
    cols: uniqueXs.length,
    rows: uniqueZs.length,
    xStep: uniqueXs.length > 1 ? Math.abs(uniqueXs[1] - uniqueXs[0]) : GRID_FALLBACK_WIDTH,
    zStep: uniqueZs.length > 1 ? Math.abs(uniqueZs[1] - uniqueZs[0]) : GRID_FALLBACK_DEPTH,
  };
}

function normalizeGridCell(cell) {
  return {
    id: `cell:${cell.index}`,
    type: 'cell',
    index: cell.index,
    position: {
      x: cell.x,
      y: cell.y ?? 0,
      z: cell.z,
    },
    anchor: {
      x: cell.x,
      y: (cell.y ?? 0) + 0.2,
      z: cell.z,
    },
    width: cell.width ?? GRID_FALLBACK_WIDTH,
    depth: cell.depth ?? GRID_FALLBACK_DEPTH,
    radius: Math.max(
      DEFAULT_INTERACTION_RADIUS,
      Math.max(cell.width ?? GRID_FALLBACK_WIDTH, cell.depth ?? GRID_FALLBACK_DEPTH) * 0.9,
    ),
  };
}

function normalizeCustomInteractable(id, definition) {
  return {
    id,
    type: 'custom',
    label: definition.label ?? 'Interact',
    radius: definition.radius ?? DEFAULT_INTERACTION_RADIUS,
    onInteract: definition.onInteract,
    position: {
      x: definition.position?.x ?? 0,
      y: definition.position?.y ?? 0,
      z: definition.position?.z ?? 0,
    },
    anchor: {
      x: definition.position?.x ?? 0,
      y: (definition.position?.y ?? 0) + 0.3,
      z: definition.position?.z ?? 0,
    },
  };
}

class InteractionSystem {
  constructor(store, inputManager, movementController, gridLayout, options = {}) {
    this.store = store;
    this.inputManager = inputManager;
    this.movementController = movementController;
    this.gridLayout = Array.isArray(gridLayout) ? gridLayout.map(normalizeGridCell) : [];
    this.gridMeta = inferGridMeta(this.gridLayout);
    this.highlighted = null;
    this.customInteractables = new Map();
    this.elapsed = 0;
    this.enabled = true;
    this.options = options;
  }

  setEnabled(nextEnabled) {
    const enabled = Boolean(nextEnabled);
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.highlighted = null;
    }
  }

  setOptions(nextOptions = {}) {
    this.options = {
      ...this.options,
      ...nextOptions,
    };
  }

  getHighlighted() {
    if (!this.highlighted) return null;
    return {
      ...this.highlighted,
      position: { ...this.highlighted.position },
      anchor: { ...this.highlighted.anchor },
    };
  }

  registerInteractable(id, definition) {
    if (!id || !definition?.position) return;
    this.customInteractables.set(id, normalizeCustomInteractable(id, definition));
  }

  unregisterInteractable(id) {
    if (!id) return;
    this.customInteractables.delete(id);
    if (this.highlighted?.id === id) {
      this.highlighted = null;
    }
  }

  update(dt = 0) {
    this.elapsed += dt;

    if (!this.enabled) {
      this.highlighted = null;
      return null;
    }

    const playerState = this.movementController?.getState?.();
    const playerPosition = playerState?.position;
    if (!playerPosition) {
      this.highlighted = null;
      return null;
    }

    const candidate = this.findClosestInteractable(playerPosition);
    if (!candidate) {
      this.highlighted = null;
      return null;
    }

    const pulse = PULSE_BASE_INTENSITY
      + (Math.sin((this.elapsed / PULSE_PERIOD_SECONDS) * Math.PI * 2) * PULSE_VARIANCE);
    const label = this.resolveLabel(candidate);

    this.highlighted = {
      ...candidate,
      label,
      pulse,
    };
    return this.getHighlighted();
  }

  interactHighlighted(context = {}) {
    if (!this.enabled || !this.highlighted) {
      return false;
    }

    if (this.highlighted.type === 'cell') {
      const handled = this.options.onInteractCell?.({
        cellIndex: this.highlighted.index,
        source: context.source ?? 'keyboard',
        highlighted: this.getHighlighted(),
      });
      return handled !== false;
    }

    if (typeof this.highlighted.onInteract === 'function') {
      this.highlighted.onInteract({
        source: context.source ?? 'keyboard',
        store: this.store,
        target: this.getHighlighted(),
      });
      return true;
    }

    return false;
  }

  dispose() {
    this.customInteractables.clear();
    this.highlighted = null;
  }

  resolveLabel(candidate) {
    if (candidate.type === 'cell') {
      return this.options.getCellLabel?.(candidate.index, this.store?.getState?.()) ?? 'Interact';
    }
    return typeof candidate.label === 'function'
      ? candidate.label(this.store?.getState?.(), candidate)
      : (candidate.label ?? 'Interact');
  }

  findClosestInteractable(playerPosition) {
    const candidates = [
      ...this.getNearbyGridCandidates(playerPosition),
      ...this.customInteractables.values(),
    ];

    let best = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const distanceSquared = getDistanceSquared(playerPosition, candidate.position);
      const radius = candidate.radius ?? DEFAULT_INTERACTION_RADIUS;
      if (distanceSquared > radius * radius) continue;
      if (distanceSquared >= bestDistanceSquared) continue;
      best = candidate;
      bestDistanceSquared = distanceSquared;
    }

    return best
      ? {
        ...best,
        distance: Math.sqrt(bestDistanceSquared),
      }
      : null;
  }

  getNearbyGridCandidates(playerPosition) {
    if (this.gridLayout.length === 0) {
      return [];
    }

    if (!this.gridMeta) {
      return this.gridLayout;
    }

    const col = clamp(
      Math.round((playerPosition.x - this.gridMeta.minX) / this.gridMeta.xStep),
      0,
      this.gridMeta.cols - 1,
    );
    const row = clamp(
      Math.round((playerPosition.z - this.gridMeta.minZ) / this.gridMeta.zStep),
      0,
      this.gridMeta.rows - 1,
    );

    const nearby = [];
    for (const cell of this.gridLayout) {
      const cellCol = clamp(
        Math.round((cell.position.x - this.gridMeta.minX) / this.gridMeta.xStep),
        0,
        this.gridMeta.cols - 1,
      );
      const cellRow = clamp(
        Math.round((cell.position.z - this.gridMeta.minZ) / this.gridMeta.zStep),
        0,
        this.gridMeta.rows - 1,
      );

      if (Math.abs(cellCol - col) > GRID_SCAN_RADIUS || Math.abs(cellRow - row) > GRID_SCAN_RADIUS) {
        continue;
      }

      nearby.push(cell);
    }

    return nearby;
  }
}

export { InteractionSystem };
