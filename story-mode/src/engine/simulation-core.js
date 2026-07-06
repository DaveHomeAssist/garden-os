import { stableStringify } from './authoritative-engine.js';

const PLAYER_RADIUS = 0.18;
const PLAYER_SPEED = 1.85;
const FIXED_SIMULATION_DT = 1 / 60;
const DEFAULT_BOUNDS = {
  minX: -5.2,
  maxX: 5.2,
  minZ: -2.35,
  maxZ: 4.5,
};
const DEFAULT_BLOCKERS = [
  { minX: -2.28, maxX: 2.28, minZ: -1.42, maxZ: 1.42 },
];
const DEFAULT_POSITION = { x: 0, y: 0, z: 2.55 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneBounds(bounds = DEFAULT_BOUNDS) {
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
  };
}

function cloneBlockers(blockers = DEFAULT_BLOCKERS) {
  return blockers.map((blocker) => ({ ...blocker }));
}

function normalizeSimulationConfig(config = {}) {
  return {
    blockers: Array.isArray(config.blockers)
      ? cloneBlockers(config.blockers)
      : cloneBlockers(DEFAULT_BLOCKERS),
    bounds: cloneBounds(config.bounds ?? DEFAULT_BOUNDS),
  };
}

function circleIntersectsRect(x, z, radius, rect) {
  const closestX = clamp(x, rect.minX, rect.maxX);
  const closestZ = clamp(z, rect.minZ, rect.maxZ);
  const dx = x - closestX;
  const dz = z - closestZ;
  return (dx * dx) + (dz * dz) < radius * radius;
}

function normalizeInput(input) {
  const x = input?.x ?? 0;
  const z = input?.z ?? 0;
  const length = Math.hypot(x, z);
  if (length < 0.0001) {
    return { x: 0, z: 0, magnitude: 0 };
  }

  return {
    x: x / length,
    z: z / length,
    magnitude: Math.min(1, length),
  };
}

function cloneSimulationState(state) {
  return {
    enabled: Boolean(state.enabled),
    facing: state.facing,
    moving: Boolean(state.moving),
    position: { ...state.position },
    radius: state.radius,
    speed: state.speed,
    time: state.time,
    velocity: { ...state.velocity },
  };
}

function createSimulationState(options = {}) {
  const config = normalizeSimulationConfig(options);
  const position = {
    ...DEFAULT_POSITION,
    ...(options.initialPosition ?? {}),
  };
  const state = {
    enabled: options.enabled !== false,
    facing: options.facing ?? Math.PI,
    moving: false,
    position: {
      x: clamp(position.x, config.bounds.minX, config.bounds.maxX),
      y: position.y ?? 0,
      z: clamp(position.z, config.bounds.minZ, config.bounds.maxZ),
    },
    radius: PLAYER_RADIUS,
    speed: 0,
    time: options.time ?? 0,
    velocity: { x: 0, z: 0 },
  };
  return cloneSimulationState(state);
}

function normalizeSimulationState(state = {}, config = {}) {
  const normalizedConfig = normalizeSimulationConfig(config);
  const fallback = createSimulationState({ ...normalizedConfig });
  const position = {
    ...fallback.position,
    ...(state.position ?? {}),
  };
  return {
    enabled: state.enabled ?? fallback.enabled,
    facing: state.facing ?? fallback.facing,
    moving: Boolean(state.moving),
    position: {
      x: clamp(position.x, normalizedConfig.bounds.minX, normalizedConfig.bounds.maxX),
      y: position.y ?? 0,
      z: clamp(position.z, normalizedConfig.bounds.minZ, normalizedConfig.bounds.maxZ),
    },
    radius: state.radius ?? PLAYER_RADIUS,
    speed: state.speed ?? 0,
    time: state.time ?? 0,
    velocity: {
      x: state.velocity?.x ?? 0,
      z: state.velocity?.z ?? 0,
    },
  };
}

function resetSimulationState(state = {}, nextPosition = DEFAULT_POSITION, config = {}) {
  const normalizedConfig = normalizeSimulationConfig(config);
  return {
    enabled: state.enabled ?? true,
    facing: Math.PI,
    moving: false,
    position: {
      x: clamp(nextPosition.x ?? DEFAULT_POSITION.x, normalizedConfig.bounds.minX, normalizedConfig.bounds.maxX),
      y: nextPosition.y ?? 0,
      z: clamp(nextPosition.z ?? DEFAULT_POSITION.z, normalizedConfig.bounds.minZ, normalizedConfig.bounds.maxZ),
    },
    radius: PLAYER_RADIUS,
    speed: 0,
    time: 0,
    velocity: { x: 0, z: 0 },
  };
}

function resolveAxis(nextX, nextZ, previousX, previousZ, config) {
  let resolvedX = clamp(nextX, config.bounds.minX, config.bounds.maxX);
  let resolvedZ = clamp(nextZ, config.bounds.minZ, config.bounds.maxZ);
  const collides = (x, z) => config.blockers.some((rect) => circleIntersectsRect(x, z, PLAYER_RADIUS, rect));

  if (collides(resolvedX, previousZ)) {
    resolvedX = previousX;
  }
  if (collides(resolvedX, resolvedZ)) {
    resolvedZ = previousZ;
  }
  if (collides(resolvedX, resolvedZ)) {
    resolvedX = previousX;
    resolvedZ = previousZ;
  }

  return { x: resolvedX, z: resolvedZ };
}

function stepSimulationState(state, {
  config = {},
  dt = FIXED_SIMULATION_DT,
  enabled = state?.enabled !== false,
  input = null,
} = {}) {
  const normalizedConfig = normalizeSimulationConfig(config);
  const current = normalizeSimulationState(state, normalizedConfig);
  const elapsed = current.time + dt;

  if (!enabled) {
    return {
      ...current,
      enabled: false,
      moving: false,
      speed: 0,
      time: elapsed,
      velocity: { x: 0, z: 0 },
    };
  }

  const normalized = normalizeInput(input);
  const stepSpeed = PLAYER_SPEED * normalized.magnitude;
  const nextX = current.position.x + (normalized.x * stepSpeed * dt);
  const nextZ = current.position.z + (normalized.z * stepSpeed * dt);
  const resolved = resolveAxis(nextX, nextZ, current.position.x, current.position.z, normalizedConfig);
  const velocityX = dt > 0 ? (resolved.x - current.position.x) / dt : 0;
  const velocityZ = dt > 0 ? (resolved.z - current.position.z) / dt : 0;
  const speed = Math.hypot(velocityX, velocityZ);
  const moving = speed > 0.02;

  return {
    ...current,
    enabled: true,
    facing: moving ? Math.atan2(velocityX, velocityZ) : current.facing,
    moving,
    position: {
      ...current.position,
      x: resolved.x,
      z: resolved.z,
    },
    speed,
    time: elapsed,
    velocity: { x: velocityX, z: velocityZ },
  };
}

function hashString(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function roundNumber(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function checksumSimulationState(state) {
  const normalized = normalizeSimulationState(state);
  return hashString(stableStringify({
    enabled: normalized.enabled,
    facing: roundNumber(normalized.facing),
    moving: normalized.moving,
    position: {
      x: roundNumber(normalized.position.x),
      y: roundNumber(normalized.position.y),
      z: roundNumber(normalized.position.z),
    },
    speed: roundNumber(normalized.speed),
    time: roundNumber(normalized.time),
    velocity: {
      x: roundNumber(normalized.velocity.x),
      z: roundNumber(normalized.velocity.z),
    },
  }));
}

function replaySimulationFrames(initialState, {
  config = {},
  enabledAtFrame = () => true,
  fixedDt = FIXED_SIMULATION_DT,
  frameCount = 120,
  inputAtFrame = () => null,
} = {}) {
  let state = normalizeSimulationState(initialState, config);
  for (let frame = 0; frame < frameCount; frame += 1) {
    state = stepSimulationState(state, {
      config,
      dt: fixedDt,
      enabled: enabledAtFrame(frame),
      input: inputAtFrame(frame),
    });
  }
  return {
    checksum: checksumSimulationState(state),
    state,
  };
}

export {
  DEFAULT_BLOCKERS,
  DEFAULT_BOUNDS,
  DEFAULT_POSITION,
  FIXED_SIMULATION_DT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  checksumSimulationState,
  cloneBlockers,
  cloneBounds,
  cloneSimulationState,
  createSimulationState,
  normalizeSimulationConfig,
  normalizeSimulationState,
  replaySimulationFrames,
  resetSimulationState,
  stepSimulationState,
};
