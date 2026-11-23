/**
 * Third-person follow camera. Pitch, distance and the portrait FOV blend stay
 * on the #104 framing (wide: 50° / 11 m / 45°; fully portrait at aspect <= 0.55:
 * 27° / 9.2 m / 42°). Yaw is no longer locked.
 *
 * The previous rig kept yaw at 0 in every viewport (FOLLOW_DEFAULTS.yaw,
 * resolveFollowFrame copying that yaw, getAzimuth returning it). The yard
 * orbit did the same: follow only slid the look point and updateOrbit() kept
 * theta. Turning never put the camera behind the gardener. Position lag was
 * a separate, smaller issue (yard look point stayed 72% on the bed).
 *
 * Yaw, the look point and the occlusion pull-in use a closed-form critically
 * damped spring: (A + B t) e^{-ω t}. It does not overshoot, and a 30 fps step
 * and a 144 fps step of the same clock time land on the same pose. The spring
 * is seeded to the current heading on load, teleport and scene change, so the
 * first frame is already behind the gardener instead of whipping from yaw 0.
 */
export const FOLLOW_DEFAULTS = Object.freeze({
  pitchDeg: 50,
  distance: 11,
  yaw: 0, // camera sits on +z of the player, looking toward -z (the default app view)
  lookHeight: 0.7,
  lookAhead: 0, // metres: aim in front of the player, along the view, so the street leads the frame
  stiffness: 6, // 1/s
});

/**
 * Wide viewports (aspect >= 1, including desktop and phone landscape) keep
 * FOLLOW_DEFAULTS: 50° pitch, 11 m, 45° vertical FOV. Narrower viewports
 * blend toward PORTRAIT_FOLLOW and are fully there at NARROW_ASPECT (a
 * 390×844 phone is 0.46).
 *
 * The old portrait policy held a 44° horizontal view by opening the vertical
 * FOV to 68°. On a tall screen that aimed the whole frame downward: the
 * horizon was off screen and the character was about 3% of the screen height.
 * PORTRAIT_FOLLOW uses 27° and 42° so the street ahead sits in the upper
 * frame and the character is about 10% of the height. The camera stays near
 * 5 m up so a garden bed between it and the player does not hide the body.
 */
export const WIDE_ASPECT = 1;
export const NARROW_ASPECT = 0.55;
export const PORTRAIT_FOLLOW = Object.freeze({
  // 27° keeps the camera about 5 m up: high enough that a bed between the
  // camera and the player does not hide their body, low enough that the
  // street ahead is in the upper frame instead of a top-down ground fill.
  pitchDeg: 27,
  distance: 9.2,
  lookAhead: 1,
  fov: 42,
});

export function dampFactor(stiffness, dt) {
  return 1 - Math.exp(-stiffness * Math.max(0, dt));
}

/** Shortest signed angle in (-π, π]. */
export function wrapAngle(rad) {
  const tau = Math.PI * 2;
  let a = (rad + Math.PI) % tau;
  if (a < 0) a += tau;
  return a - Math.PI;
}

/** Camera yaw that sits behind a character facing `facing` (0 = camera on +z). */
export function behindYaw(facing) {
  return wrapAngle((Number.isFinite(facing) ? facing : Math.PI) + Math.PI);
}

/**
 * Exact critically damped step. `state` is `{ value, velocity }`.
 * Multiple substeps of a clock interval match one step of that interval,
 * and the pose never crosses the target.
 */
export function criticallyDamped(state, target, omega, dt) {
  const w = Math.max(0, omega);
  const h = Math.max(0, dt);
  if (!(w > 0) || !(h > 0)) return state.value;
  const x = state.value - target;
  const v = state.velocity;
  const e = Math.exp(-w * h);
  const A = x;
  const B = v + w * x;
  state.value = target + (A + B * h) * e;
  state.velocity = (B - w * (A + B * h)) * e;
  return state.value;
}

export function criticallyDampedAngle(state, target, omega, dt) {
  return criticallyDamped(state, state.value + wrapAngle(target - state.value), omega, dt);
}

const HEADING = Object.freeze({
  positionOmega: 9,
  yawOmega: 7.2,
  pullOmega: 11,
  aheadOmega: 8,
  idleYawDelay: 0.5,
  moveLookAhead: 0.62,
  walkSpeed: 1.85,
  minDistance: 2.35,
  pullMargin: 0.42,
  reducedOmega: 18,
});

export function prefersReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  try {
    return Boolean(matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

function springTo(state, target, omega, dt) {
  criticallyDamped(state, target, omega, dt);
}

/** Entry parameter t along a->b (metres = t * |b-a|) for an oriented box, or null. */
export function segmentOrientedBoxHit(a, b, box) {
  const height = box.h ?? box.height ?? 3;
  const centreX = box.x ?? ((box.minX + box.maxX) / 2);
  const centreZ = box.z ?? ((box.minZ + box.maxZ) / 2);
  const w = box.w ?? (box.maxX - box.minX);
  const d = box.d ?? (box.maxZ - box.minZ);
  const shaped = { x: centreX, z: centreZ, w, d, h: height, rotationY: box.rotationY ?? 0 };
  const c = Math.cos(shaped.rotationY);
  const s = Math.sin(shaped.rotationY);
  const toLocal = (p) => {
    const dx = p.x - shaped.x;
    const dz = p.z - shaped.z;
    return { x: (dx * c) - (dz * s), y: p.y, z: (dx * s) + (dz * c) };
  };
  const la = toLocal(a);
  const lb = toLocal(b);
  const min = { x: -shaped.w / 2, y: 0, z: -shaped.d / 2 };
  const max = { x: shaped.w / 2, y: shaped.h, z: shaped.d / 2 };
  let t0 = 0;
  let t1 = 1;
  for (const axis of ['x', 'y', 'z']) {
    const delta = lb[axis] - la[axis];
    if (Math.abs(delta) < 1e-9) {
      if (la[axis] < min[axis] || la[axis] > max[axis]) return null;
      continue;
    }
    let ta = (min[axis] - la[axis]) / delta;
    let tb = (max[axis] - la[axis]) / delta;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  if (t1 < 0 || t0 > 1) return null;
  return { t: Math.max(0, t0) };
}

function sphereHitT(a, b, sphere) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 < 1e-8) return null;
  const ox = a.x - sphere.x;
  const oy = a.y - sphere.y;
  const oz = a.z - sphere.z;
  const bq = (ox * dx + oy * dy + oz * dz) / len2;
  const c = (ox * ox + oy * oy + oz * oz - sphere.r * sphere.r) / len2;
  const h = bq * bq - c;
  if (h < 0) return null;
  const t = -bq - Math.sqrt(h);
  if (t < 0 || t > 1) return null;
  return t;
}

/**
 * How far from `origin` toward `dest` the camera may sit before a wall or
 * tree hides the gardener. Returns a distance in metres.
 */
export function occlusionDistance(origin, dest, obstacles = [], opts = {}) {
  const margin = opts.margin ?? HEADING.pullMargin;
  const minDistance = opts.minDistance ?? HEADING.minDistance;
  const dx = dest.x - origin.x;
  const dy = dest.y - origin.y;
  const dz = dest.z - origin.z;
  const full = Math.hypot(dx, dy, dz);
  if (full < 1e-4) return minDistance;
  let limit = full;
  let hit = false;
  for (const obstacle of obstacles) {
    if (!obstacle) continue;
    let t = null;
    if (obstacle.kind === 'sphere' || Number.isFinite(obstacle.r)) {
      t = sphereHitT(origin, dest, obstacle);
    } else {
      const boxHit = segmentOrientedBoxHit(origin, dest, obstacle);
      t = boxHit ? boxHit.t : null;
    }
    if (t == null) continue;
    const metres = t * full;
    // A hit in the last 20 cm is the camera brushing an edge, not the
    // gardener being hidden. Pulling on it shifts the idle framing.
    if (metres >= full - 0.2) continue;
    hit = true;
    if (metres < limit) limit = metres;
  }
  if (!hit) return full;
  // Prefer the comfort stand-off, but a wall closer than that wins. Pushing
  // back out to minDistance would put the camera through the surface.
  const beforeSurface = Math.max(0.12, limit - margin);
  const cleared = Math.min(Math.max(0.12, limit - 0.08), beforeSurface);
  if (cleared >= minDistance) return Math.min(full, cleared);
  return Math.max(0.12, Math.min(limit - 0.05, cleared));
}

/** Camera position for a look target. */
export function followOffset({ pitchDeg, distance, yaw } = FOLLOW_DEFAULTS) {
  const pitch = (pitchDeg * Math.PI) / 180;
  const horizontal = Math.cos(pitch) * distance;
  return {
    x: Math.sin(yaw) * horizontal,
    y: Math.sin(pitch) * distance,
    z: Math.cos(yaw) * horizontal,
  };
}

function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Vertical FOV (degrees) that holds `baseHfov` horizontal, clamped.
 * This is the wide-viewport policy: landscape and desktop stay at 45°.
 */
export function verticalFovForAspect(aspect, {
  baseHfov = 44,
  minVfov = 45,
  maxVfov = 68,
} = {}) {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const halfV = Math.atan(Math.tan((baseHfov * Math.PI) / 360) / a);
  const fov = (halfV * 2 * 180) / Math.PI;
  return Math.min(maxVfov, Math.max(minVfov, fov));
}

/** Follow rig for a viewport aspect (width / height). Wide aspects match FOLLOW_DEFAULTS. */
export function resolveFollowFrame(aspect, defaults = FOLLOW_DEFAULTS) {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const wideFov = verticalFovForAspect(a);
  const wide = {
    pitchDeg: defaults.pitchDeg,
    distance: defaults.distance,
    yaw: defaults.yaw,
    lookHeight: defaults.lookHeight,
    lookAhead: defaults.lookAhead ?? 0,
    fov: wideFov,
    narrow: 0,
  };
  if (a >= WIDE_ASPECT) return wide;
  const t = smoothstep((WIDE_ASPECT - a) / (WIDE_ASPECT - NARROW_ASPECT));
  return {
    pitchDeg: lerp(defaults.pitchDeg, PORTRAIT_FOLLOW.pitchDeg, t),
    distance: lerp(defaults.distance, PORTRAIT_FOLLOW.distance, t),
    yaw: defaults.yaw,
    lookHeight: defaults.lookHeight,
    lookAhead: lerp(defaults.lookAhead ?? 0, PORTRAIT_FOLLOW.lookAhead, t),
    fov: lerp(wideFov, PORTRAIT_FOLLOW.fov, t),
    narrow: t,
  };
}

export function createFollowRig(options = {}) {
  const cfg = { ...FOLLOW_DEFAULTS, ...options };
  const look = {
    x: { value: 0, velocity: 0 },
    y: { value: cfg.lookHeight, velocity: 0 },
    z: { value: 0, velocity: 0 },
  };
  const yawState = { value: cfg.yaw ?? 0, velocity: 0 };
  const aheadState = { value: cfg.lookAhead ?? 0, velocity: 0 };
  const pullState = { value: 1, velocity: 0 };
  const manualState = { value: 0, velocity: 0 };
  const pitchState = { value: 0, velocity: 0 };
  let yawGoal = cfg.yaw ?? 0;
  let holdingIdle = false;
  let idleTime = 0;
  let initialised = false;
  let reducedMotion = Boolean(options.reducedMotion);
  let obstacles = [];
  let userDistance = 1;
  let zoomTouched = false;
  const distanceState = { value: 1, velocity: 0 };
  let lastAim = { x: 0, y: cfg.lookHeight, z: 0 };
  let lastCam = { x: 0, y: cfg.lookHeight, z: 0 };
  let activity = false;

  function omega(kind) {
    if (reducedMotion) return HEADING.reducedOmega;
    if (kind === 'yaw') return HEADING.yawOmega;
    if (kind === 'pull') return HEADING.pullOmega;
    if (kind === 'ahead') return HEADING.aheadOmega;
    return HEADING.positionOmega;
  }

  function facingOf(pos) {
    if (Number.isFinite(pos?.facing)) return pos.facing;
    if (Number.isFinite(pos?.facingY)) return pos.facingY;
    return null;
  }

  function place() {
    const yaw = yawState.value + manualState.value;
    const framing = cfg.lookAhead ?? 0;
    const ahead = framing + aheadState.value;
    const aim = {
      x: look.x.value - Math.sin(yaw) * ahead,
      y: look.y.value,
      z: look.z.value - Math.cos(yaw) * ahead,
    };
    const distance = Math.min(14, Math.max(4.4, cfg.distance * distanceState.value));
    const offset = followOffset({
      pitchDeg: cfg.pitchDeg + pitchState.value * (180 / Math.PI),
      distance,
      yaw,
    });
    const desired = { x: aim.x + offset.x, y: aim.y + offset.y, z: aim.z + offset.z };
    const chest = { x: look.x.value, y: look.y.value + 0.25, z: look.z.value };
    const full = Math.hypot(desired.x - chest.x, desired.y - chest.y, desired.z - chest.z) || distance;
    const allowed = occlusionDistance(chest, desired, obstacles, {
      margin: HEADING.pullMargin,
      minDistance: HEADING.minDistance,
    });
    const pullGoal = full > 1e-4 ? Math.min(1, Math.max(0, allowed / full)) : 1;
    // pullState is applied after it has been sprung by update/snap. place() reads it.
    // No comfort-distance floor here: a near wall must be allowed to win.
    const pull = Math.min(1, Math.max(0, Number.isFinite(pullState.value) ? pullState.value : pullGoal));
    const cam = {
      x: chest.x + (desired.x - chest.x) * pull,
      y: chest.y + (desired.y - chest.y) * pull,
      z: chest.z + (desired.z - chest.z) * pull,
    };
    lastAim = aim;
    lastCam = cam;
    return { aim, cam, pullGoal, yaw };
  }

  function seedSprings(pos, facing, { yawValue = null } = {}) {
    const face = facing == null ? null : facing;
    const y = yawValue == null ? (face == null ? (cfg.yaw ?? 0) : behindYaw(face)) : yawValue;
    yawState.value = y;
    yawState.velocity = 0;
    yawGoal = y;
    manualState.value = 0;
    manualState.velocity = 0;
    pitchState.value = 0;
    pitchState.velocity = 0;
    const py = (pos?.y ?? 0) + cfg.lookHeight;
    look.x.value = pos?.x ?? 0;
    look.y.value = py;
    look.z.value = pos?.z ?? 0;
    look.x.velocity = look.y.velocity = look.z.velocity = 0;
    aheadState.value = 0;
    aheadState.velocity = 0;
    pullState.value = 1;
    pullState.velocity = 0;
    distanceState.value = 1;
    distanceState.velocity = 0;
    zoomTouched = false;
    holdingIdle = false;
    idleTime = 0;
    initialised = true;
    place();
  }

  function snap(pos, facing) {
    const position = pos?.position ?? pos ?? { x: 0, y: 0, z: 0 };
    seedSprings(position, facingOf(pos) ?? (Number.isFinite(facing) ? facing : null));
  }

  return {
    config: cfg,
    snap,
    /** True once snap or the first update has seeded the springs (no yaw sweep from 0). */
    isInitialised: () => initialised,
    setReducedMotion(on) { reducedMotion = Boolean(on); },
    setObstacles(next) { obstacles = Array.isArray(next) ? next : []; },
    /** Pointer orbit on top of the heading follow. Recentres after the idle delay. */
    addManualYaw(delta) {
      manualState.value += delta;
      activity = true;
      holdingIdle = false;
      idleTime = 0;
    },
    addPitchOffset(delta) {
      pitchState.value = Math.max(-0.35, Math.min(0.28, pitchState.value + delta));
      activity = true;
      holdingIdle = false;
      idleTime = 0;
    },
    /**
     * Start the springs at the camera's current azimuth and distance so the
     * first gameplay frames ease instead of popping. Used when another owner
     * (a cutscene, a scene change) has moved the camera.
     */
    seedFromCamera(camera, pose = {}) {
      const position = pose.position ?? pose ?? { x: 0, y: 0, z: 0 };
      const dx = camera.position.x - (position.x ?? 0);
      const dz = camera.position.z - (position.z ?? 0);
      const seededYaw = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : behindYaw(facingOf(pose) ?? Math.PI);
      seedSprings(position, facingOf(pose), { yawValue: seededYaw });
      const face = facingOf(pose);
      if (face != null) yawGoal = behindYaw(face);
      const current = Math.hypot(
        camera.position.x - (position.x ?? 0),
        camera.position.y - ((position.y ?? 0) + cfg.lookHeight),
        camera.position.z - (position.z ?? 0),
      );
      if (cfg.distance > 0 && current > 0.5) {
        distanceState.value = Math.min(14 / cfg.distance, Math.max(4.4 / cfg.distance, current / cfg.distance));
        distanceState.velocity = 0;
      }
      place();
    },
    /** Replace pitch, distance, look-ahead and look height. Does not touch the sprung yaw. */
    setFrame(next = {}) {
      if (Number.isFinite(next.pitchDeg)) cfg.pitchDeg = next.pitchDeg;
      if (Number.isFinite(next.distance)) cfg.distance = next.distance;
      if (Number.isFinite(next.lookHeight)) cfg.lookHeight = next.lookHeight;
      if (Number.isFinite(next.lookAhead)) cfg.lookAhead = next.lookAhead;
      // Framing yaw is the offset basis (0 = +z). Heading yaw lives in yawState,
      // so a per-frame setFrame from resolveFollowFrame cannot snap it back to 0.
      if (Number.isFinite(next.yaw) && next.lockYaw === true) {
        cfg.yaw = next.yaw;
        yawState.value = next.yaw;
        yawState.velocity = 0;
        yawGoal = next.yaw;
      }
      if (initialised) place();
    },
    setUserDistance(next) {
      if (!Number.isFinite(next)) return;
      userDistance = next;
      zoomTouched = true;
      distanceState.value = next;
      distanceState.velocity = 0;
      if (initialised) place();
    },
    getUserDistance: () => userDistance,
    /**
     * Ease the look point, yaw and occlusion pull toward the gardener.
     * `pos` may be `{x,z}` (legacy) or a pose `{position, facing, moving, speed, velocity}`.
     */
    update(pos, dt) {
      if (!pos) return;
      const position = pos.position ?? pos;
      const facing = facingOf(pos);
      const step = Math.max(0, dt || 0);
      if (!initialised) {
        snap(position, facing ?? undefined);
        return;
      }
      const speed = Number.isFinite(pos.speed) ? pos.speed : 0;
      const moving = Boolean(pos.moving) && speed > 0.05;
      const idleDelay = reducedMotion ? 0 : HEADING.idleYawDelay;
      if (facing != null) {
        const behind = behindYaw(facing);
        // The manual orbit is applied again in place(). The player's facing
        // already follows getAzimuth(), which includes that offset, so the
        // heading goal must not include it or forward-walk spins forever.
        const headingGoal = behind - manualState.value;
        if (moving || activity) {
          holdingIdle = false;
          idleTime = 0;
          yawGoal = headingGoal;
          activity = false;
        } else if (!holdingIdle) {
          holdingIdle = true;
          idleTime = 0;
          yawGoal = yawState.value;
          yawState.velocity = 0;
        } else {
          idleTime += step;
          if (idleTime >= idleDelay) yawGoal = behind - manualState.value;
        }
      }
      if (!moving && !activity && holdingIdle && idleTime >= idleDelay) {
        springTo(manualState, 0, omega('yaw'), step);
        springTo(pitchState, 0, omega('yaw'), step);
      }
      criticallyDampedAngle(yawState, yawGoal, omega('yaw'), step);
      const motion = (!reducedMotion && moving)
        ? HEADING.moveLookAhead * Math.min(1.25, speed / HEADING.walkSpeed)
        : 0;
      springTo(aheadState, motion, omega('ahead'), step);
      if (!zoomTouched) springTo(distanceState, 1, omega('pos'), step);
      springTo(look.x, position.x ?? 0, omega('pos'), step);
      springTo(look.y, (position.y ?? 0) + cfg.lookHeight, omega('pos'), step);
      springTo(look.z, position.z ?? 0, omega('pos'), step);
      const preview = place();
      springTo(pullState, preview.pullGoal, omega('pull'), step);
      place();
    },
    getTarget() {
      return { x: lastAim.x, y: lastAim.y, z: lastAim.z };
    },
    getPosition() {
      return { ...lastCam };
    },
    /** Camera yaw for camera-relative input, including a manual orbit offset. */
    getAzimuth() {
      return wrapAngle(yawState.value + manualState.value);
    },
    /** Unsmoothed yaw the rig is easing toward (tests). */
    getYawGoal() {
      return wrapAngle(yawGoal + manualState.value);
    },
    /** Apply to a three.js camera. */
    apply(camera) {
      if (!initialised) place();
      camera.position.set(lastCam.x, lastCam.y, lastCam.z);
      camera.lookAt(lastAim.x, lastAim.y, lastAim.z);
    },
  };
}

/**
 * Boundary-tree cutaway. The follow camera sits ~7 m behind the player (+z),
 * so at the north edge it backs over the treeline and canopies slice across
 * the bottom of the frame. Clamping the camera inside the bounds would push the
 * player off screen at this pitch, so instead any tree standing in the
 * foreground corridor between the camera and the player (plan view) is cut.
 *
 * Corridor: along the camera->player axis from just behind the camera to just
 * short of the player, and up to halfWidth (frame half-width near the bottom
 * edge) to either side, both widened by the canopy radius. Trees level with or
 * beyond the player stay, so the side and far treelines remain visible.
 */
export const TREE_CUT_DEFAULTS = Object.freeze({
  halfWidth: 6.5, // m either side of the view axis
  behindCamera: 1.5, // m behind the camera still counted (canopy overhang)
  shortOfPlayer: 0.6, // m: trees this close to (or past) the player's depth stay
  canopyRadius: 1.1, // per unit tree scale
});

export function treeInViewCorridor(tree, cam, player, opts = TREE_CUT_DEFAULTS) {
  const o = { ...TREE_CUT_DEFAULTS, ...opts };
  const ax = player.x - cam.x;
  const az = player.z - cam.z;
  const len = Math.hypot(ax, az);
  if (len < 1e-6) return false;
  const ux = ax / len;
  const uz = az / len;
  const dx = tree.x - cam.x;
  const dz = tree.z - cam.z;
  const along = (dx * ux) + (dz * uz);
  const side = Math.abs((dx * -uz) + (dz * ux));
  const r = o.canopyRadius * (tree.scale ?? 1);
  return along >= -(o.behindCamera + r) && along <= len - o.shortOfPlayer && side <= o.halfWidth + r;
}

/**
 * Does the segment a->b pass through an oriented box (footprint rect + height)?
 * Slab test in the box's local frame. Used for the house cutaway.
 */
export function segmentHitsOrientedBox(a, b, box) {
  const c = Math.cos(box.rotationY ?? 0);
  const s = Math.sin(box.rotationY ?? 0);
  const toLocal = (p) => {
    const dx = p.x - box.x;
    const dz = p.z - box.z;
    return { x: (dx * c) - (dz * s), y: p.y, z: (dx * s) + (dz * c) };
  };
  const la = toLocal(a);
  const lb = toLocal(b);
  const min = { x: -box.w / 2, y: 0, z: -box.d / 2 };
  const max = { x: box.w / 2, y: box.h, z: box.d / 2 };
  let t0 = 0;
  let t1 = 1;
  for (const axis of ['x', 'y', 'z']) {
    const d = lb[axis] - la[axis];
    if (Math.abs(d) < 1e-9) {
      if (la[axis] < min[axis] || la[axis] > max[axis]) return false;
      continue;
    }
    let ta = (min[axis] - la[axis]) / d;
    let tb = (max[axis] - la[axis]) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
