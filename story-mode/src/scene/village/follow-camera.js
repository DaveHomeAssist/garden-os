/**
 * Village follow camera: fixed yaw (so WASD stays camera-relative and never
 * swings), pitch and distance chosen for the viewport aspect, frame-rate
 * independent damping, and a helper for the house cutaway test.
 *
 * Damping uses 1 - exp(-k * dt): N small steps land exactly where one big
 * step of the same total time does, so 30 fps and 144 fps feel the same and
 * a long frame can't overshoot or snap.
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
  let offset = followOffset(cfg);
  const target = { x: 0, y: cfg.lookHeight, z: 0 };
  let initialised = false;

  function aim() {
    const ahead = cfg.lookAhead ?? 0;
    const yaw = cfg.yaw ?? 0;
    return {
      x: target.x - Math.sin(yaw) * ahead,
      y: target.y,
      z: target.z - Math.cos(yaw) * ahead,
    };
  }

  function snap(pos) {
    target.x = pos.x;
    target.y = (pos.y ?? 0) + cfg.lookHeight;
    target.z = pos.z;
    initialised = true;
  }

  return {
    config: cfg,
    snap,
    /** Replace pitch, distance, look-ahead (and optional yaw / look height). Offset updates immediately. */
    setFrame(next = {}) {
      if (Number.isFinite(next.pitchDeg)) cfg.pitchDeg = next.pitchDeg;
      if (Number.isFinite(next.distance)) cfg.distance = next.distance;
      if (Number.isFinite(next.yaw)) cfg.yaw = next.yaw;
      if (Number.isFinite(next.lookHeight)) cfg.lookHeight = next.lookHeight;
      if (Number.isFinite(next.lookAhead)) cfg.lookAhead = next.lookAhead;
      offset = followOffset(cfg);
    },
    /** Move the smoothed look target toward the player. */
    update(pos, dt) {
      if (!pos) return;
      if (!initialised) { snap(pos); return; }
      const k = dampFactor(cfg.stiffness, dt);
      target.x += (pos.x - target.x) * k;
      target.y += ((pos.y ?? 0) + cfg.lookHeight - target.y) * k;
      target.z += (pos.z - target.z) * k;
    },
    getTarget: () => ({ ...target }),
    getPosition() {
      const at = aim();
      return { x: at.x + offset.x, y: at.y + offset.y, z: at.z + offset.z };
    },
    /** Camera yaw for camera-relative input (0 = identity mapping). */
    getAzimuth: () => cfg.yaw,
    /** Apply to a three.js camera. */
    apply(camera) {
      const at = aim();
      camera.position.set(at.x + offset.x, at.y + offset.y, at.z + offset.z);
      camera.lookAt(at.x, at.y, at.z);
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
