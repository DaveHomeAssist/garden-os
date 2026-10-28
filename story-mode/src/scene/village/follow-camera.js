/**
 * Village follow camera: fixed yaw (so WASD stays camera-relative and never
 * swings), fixed pitch and distance, frame-rate independent damping, and a
 * helper for the house cutaway test.
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
  stiffness: 6, // 1/s
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

export function createFollowRig(options = {}) {
  const cfg = { ...FOLLOW_DEFAULTS, ...options };
  const offset = followOffset(cfg);
  const target = { x: 0, y: cfg.lookHeight, z: 0 };
  let initialised = false;

  function snap(pos) {
    target.x = pos.x;
    target.y = (pos.y ?? 0) + cfg.lookHeight;
    target.z = pos.z;
    initialised = true;
  }

  return {
    config: cfg,
    snap,
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
    getPosition: () => ({ x: target.x + offset.x, y: target.y + offset.y, z: target.z + offset.z }),
    /** Camera yaw for camera-relative input (0 = identity mapping). */
    getAzimuth: () => cfg.yaw,
    /** Apply to a three.js camera. */
    apply(camera) {
      camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
      camera.lookAt(target.x, target.y, target.z);
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
