/**
 * Gardener poses. Locomotion is in-place and foot-planted: a stance foot is
 * stored in world space, so the stride length (not a free sine) sets how fast
 * the cycle plays. Actions crossfade on top of the arms only.
 */
import * as THREE from 'three';
import { criticallyDamped, prefersReducedMotion, wrapAngle } from './village/follow-camera.js';
import { LEG } from './gardener-model.js';

const WALK_STRIDE = 0.78;
const RUN_STRIDE = 1.22;
const WALK_SPEED = 1.05;
const RUN_SPEED = 1.7;

const ACTIONS = {
  plant: 0.85,
  water: 0.9,
  harvest: 0.8,
  celebrate: 1.05,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function solveLeg(thigh, shin, side, target, weight) {
  const hipX = side < 0 ? -LEG.hipX : LEG.hipX;
  const hipY = LEG.hipY - LEG.thighDrop;
  const L1 = LEG.thigh;
  const L2 = LEG.shin;
  const dy = target.y - hipY;
  const dz = target.z;
  let dist = Math.hypot(dy, dz);
  const max = L1 + L2 - 0.004;
  const min = Math.abs(L1 - L2) + 0.02;
  dist = clamp(dist, min, max);
  const pitch = Math.atan2(dz, -dy);
  const cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const cosKnee = clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1);
  const bend = Math.PI - Math.acos(cosKnee);
  const aim = Math.acos(cosA);
  // Positive thigh X swings the foot toward -z (see player facing notes).
  // Knee bends backward (-z) so the shin adds positive X.
  const thighX = -(pitch + aim) * weight;
  const shinX = bend * weight;
  thigh.rotation.set(thighX, 0, side * 0.04 * weight);
  shin.rotation.set(shinX, 0, 0);
}

export function createGardenerAnimator(view) {
  const bones = view.bones;
  const phaseState = { phase: 0 };
  const ik = { value: 0, velocity: 0 };
  const actionWeight = { value: 0, velocity: 0 };
  const lean = { value: 0, velocity: 0 };
  let action = null;
  let queued = null;
  let lastFacing = null;
  let reduced = false;
  const plants = { L: null, R: null };
  const wasStance = { L: false, R: false };
  const local = new THREE.Vector3();
  const world = new THREE.Vector3();

  function playAction(name) {
    if (!ACTIONS[name]) return false;
    if (action && action.t < action.duration * 0.85) {
      queued = name;
      return true;
    }
    action = { name, t: 0, duration: ACTIONS[name] };
    queued = null;
    return true;
  }

  function strideOf(speed) {
    const runT = clamp((speed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED), 0, 1);
    return WALK_STRIDE + (RUN_STRIDE - WALK_STRIDE) * runT;
  }

  function footLocal(side, along, lift) {
    const x = side === 'L' ? -LEG.hipX : LEG.hipX;
    return { x, y: 0.06 + lift, z: along };
  }

  function update(snapshot, dt, group) {
    const step = Math.max(0, Math.min(0.05, dt || 0));
    reduced = prefersReducedMotion();
    const speed = snapshot?.speed ?? 0;
    const moving = Boolean(snapshot?.moving) && speed > 0.04;
    const facing = snapshot?.facing ?? lastFacing ?? Math.PI;
    const time = snapshot?.time ?? 0;
    const yawRate = lastFacing == null || step === 0 ? 0 : wrapAngle(facing - lastFacing) / Math.max(step, 1 / 120);
    lastFacing = facing;
    criticallyDamped(lean, reduced ? 0 : clamp(-yawRate * 0.055, -0.32, 0.32), reduced ? 18 : 8, step);
    criticallyDamped(ik, moving ? 1 : 0, reduced ? 16 : 8, step);

    const stride = strideOf(speed);
    if (moving) phaseState.phase = (phaseState.phase + (speed / stride) * step) % 1;

    const runT = clamp((speed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED), 0, 1);
    const armAmp = (0.55 + runT * 0.45) * ik.value;
    const swing = Math.sin(phaseState.phase * Math.PI * 2);
    const steps = [];

    group.updateMatrixWorld(true);
    for (const side of ['L', 'R']) {
      const localPhase = side === 'L' ? phaseState.phase : (phaseState.phase + 0.5) % 1;
      const stance = localPhase < 0.5;
      let target = footLocal(side, 0, 0);
      if (moving && ik.value > 0.2) {
        if (stance) {
          if (!wasStance[side] || !plants[side]) {
            const ahead = stride * 0.25;
            const right = side === 'L' ? -1 : 1;
            plants[side] = {
              x: group.position.x + Math.sin(facing) * ahead + Math.cos(facing) * LEG.hipX * right,
              z: group.position.z + Math.cos(facing) * ahead - Math.sin(facing) * LEG.hipX * right,
            };
            if (speed > 0.35 && !reduced) steps.push({ x: plants[side].x, z: plants[side].z });
          }
          world.set(plants[side].x, 0.06, plants[side].z);
          local.copy(group.worldToLocal(world));
          target = { x: local.x, y: 0.06, z: local.z };
        } else {
          plants[side] = null;
          const swingT = (localPhase - 0.5) / 0.5;
          const along = -stride * 0.25 + stride * 0.5 * swingT;
          const lift = Math.sin(swingT * Math.PI) * (0.05 + runT * 0.09);
          target = footLocal(side, along, lift);
        }
      } else {
        plants[side] = null;
      }
      wasStance[side] = stance && moving;
      const thigh = bones[side === 'L' ? 'thighL' : 'thighR'];
      const shin = bones[side === 'L' ? 'shinL' : 'shinR'];
      solveLeg(thigh, shin, side === 'L' ? -1 : 1, target, ik.value);
    }

    let pose = { torsoX: 0, armL: swing * armAmp, armR: -swing * armAmp, armLZ: 0, armRZ: 0, hop: 0 };
    if (action) {
      action.t += step;
      const u = clamp(action.t / action.duration, 0, 1);
      const env = Math.sin(u * Math.PI);
      if (action.name === 'plant') pose = { torsoX: 0.5 * env, armL: 0.2 * env, armR: 1.25 * env, armLZ: 0, armRZ: 0.15 * env, hop: 0 };
      else if (action.name === 'water') pose = { torsoX: 0.22 * env, armL: 0.1 * env, armR: 0.55 * env, armLZ: 0, armRZ: -1.05 * env, hop: 0 };
      else if (action.name === 'harvest') {
        const pull = u < 0.42 ? u / 0.42 : Math.max(0, 1 - (u - 0.42) / 0.58);
        pose = { torsoX: 0.6 * pull, armL: 1.15 * pull, armR: 1.15 * pull, armLZ: 0, armRZ: 0, hop: 0 };
      } else if (action.name === 'celebrate') {
        pose = {
          torsoX: -0.12 * env,
          armL: -2.05 * env,
          armR: -2.05 * env,
          armLZ: 0.25 * env,
          armRZ: -0.25 * env,
          hop: reduced ? 0 : Math.sin(u * Math.PI) * 0.065,
        };
      }
      if (action.t >= action.duration) {
        action = queued ? { name: queued, t: 0, duration: ACTIONS[queued] } : null;
        queued = null;
      }
    }
    criticallyDamped(actionWeight, action ? 1 : 0, reduced ? 16 : 9, step);
    const w = actionWeight.value;
    const breathe = reduced ? 0 : Math.sin(time * 2.1) * 0.028 * (1 - ik.value) * (1 - w * 0.5);
    const look = (!reduced && ik.value < 0.35) ? lookAround(time) : 0;

    bones.root.position.y = pose.hop * w;
    bones.spine.rotation.set(breathe + pose.torsoX * w * 0.45, 0, lean.value);
    bones.chest.rotation.set(pose.torsoX * w * 0.55, 0, lean.value * 0.35);
    bones.head.rotation.set(-breathe * 0.6, look * (1 - w), 0);
    bones.armL.rotation.set((1 - w) * (swing * armAmp) + w * pose.armL, 0, 0.12 + pose.armLZ * w);
    bones.armR.rotation.set((1 - w) * (-swing * armAmp) + w * pose.armR, 0, -0.12 + pose.armRZ * w);
    bones.foreL.rotation.set(0.18 + Math.max(0, bones.armL.rotation.x) * 0.25, 0, 0);
    bones.foreR.rotation.set(0.18 + Math.max(0, bones.armR.rotation.x) * 0.25, 0, 0);

    return { steps, phase: phaseState.phase, ik: ik.value, action: action?.name ?? null };
  }

  return {
    update,
    playAction,
    getPhase: () => phaseState.phase,
  };
}

function lookAround(time) {
  const period = 5.4;
  const t = time % period;
  if (t < 3.55 || t > 5.05) return 0;
  const u = (t - 3.55) / 1.5;
  const dir = Math.floor(time / period) % 2 === 0 ? 1 : -1;
  return Math.sin(u * Math.PI) * 0.5 * dir;
}

export function footWorld(group, bone, target = new THREE.Vector3()) {
  group.updateMatrixWorld(true);
  return bone.getWorldPosition(target);
}
