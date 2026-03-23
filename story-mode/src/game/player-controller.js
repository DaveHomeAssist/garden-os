const PLAYER_RADIUS = 0.18;
const PLAYER_SPEED = 1.85;
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

export function createPlayerController(options = {}) {
  const bounds = options.bounds ?? DEFAULT_BOUNDS;
  const blockers = options.blockers ?? DEFAULT_BLOCKERS;
  const position = { ...DEFAULT_POSITION, ...(options.initialPosition ?? {}) };

  let enabled = true;
  let elapsed = 0;
  let velocityX = 0;
  let velocityZ = 0;
  let facing = Math.PI;
  let moving = false;
  let speed = 0;

  function collides(x, z) {
    return blockers.some((rect) => circleIntersectsRect(x, z, PLAYER_RADIUS, rect));
  }

  function resolveAxis(nextX, nextZ, previousX, previousZ) {
    let resolvedX = clamp(nextX, bounds.minX, bounds.maxX);
    let resolvedZ = clamp(nextZ, bounds.minZ, bounds.maxZ);

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

  function update(dt, input) {
    elapsed += dt;

    if (!enabled) {
      moving = false;
      speed = 0;
      velocityX = 0;
      velocityZ = 0;
      return getState();
    }

    const normalized = normalizeInput(input);
    const stepSpeed = PLAYER_SPEED * normalized.magnitude;
    const nextX = position.x + (normalized.x * stepSpeed * dt);
    const nextZ = position.z + (normalized.z * stepSpeed * dt);
    const resolved = resolveAxis(nextX, nextZ, position.x, position.z);

    velocityX = dt > 0 ? (resolved.x - position.x) / dt : 0;
    velocityZ = dt > 0 ? (resolved.z - position.z) / dt : 0;
    position.x = resolved.x;
    position.z = resolved.z;
    moving = Math.hypot(velocityX, velocityZ) > 0.02;
    speed = Math.hypot(velocityX, velocityZ);

    if (moving) {
      facing = Math.atan2(velocityX, velocityZ);
    }

    return getState();
  }

  function getState() {
    return {
      position: { ...position },
      velocity: { x: velocityX, z: velocityZ },
      facing,
      moving,
      speed,
      time: elapsed,
      radius: PLAYER_RADIUS,
      enabled,
    };
  }

  return {
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) {
        velocityX = 0;
        velocityZ = 0;
        moving = false;
        speed = 0;
      }
    },
    reset(nextPosition = DEFAULT_POSITION) {
      position.x = nextPosition.x;
      position.y = nextPosition.y ?? 0;
      position.z = nextPosition.z;
      velocityX = 0;
      velocityZ = 0;
      moving = false;
      speed = 0;
      facing = Math.PI;
      elapsed = 0;
      return getState();
    },
    update,
    getState,
  };
}
