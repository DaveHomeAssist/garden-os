import { describe, expect, it } from 'vitest';
import { createPlantAction, plantPose, facingToward, lerpAngle, PLANT_ACTION_DEFAULTS } from './plant-action.js';
import { createPlayerCharacter } from './player-character.js';

const D = PLANT_ACTION_DEFAULTS;
const run = (action, seconds, opts) => {
  let pose = null;
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) pose = action.update(1 / 60, opts);
  return pose;
};

describe('plantPose', () => {
  it('starts and ends standing (all weights 0) and kneels mid-action', () => {
    for (const p of [0, 1]) {
      const pose = plantPose(p);
      expect(pose.kneel).toBeCloseTo(0, 6);
      expect(pose.reach).toBeCloseTo(0, 6);
      expect(pose.turn).toBeCloseTo(0, 6);
      expect(pose.dig).toBe(0);
    }
    const mid = plantPose(0.5);
    expect(mid.kneel).toBe(1);
    expect(mid.reach).toBe(1);
    expect(mid.turn).toBe(1);
  });

  it('has the hand on the soil (dig 0) at the hit point and lifted between pats', () => {
    expect(plantPose(D.hitAt).dig).toBeCloseTo(0, 6);
    expect(plantPose(0.425).dig).toBeCloseTo(1, 6);
  });
});

describe('createPlantAction', () => {
  it('plays one full action of the configured length and reports the trowel hit', () => {
    const a = createPlantAction();
    const r = a.trigger({ x: 1, z: 0 });
    expect(r).toMatchObject({ skipped: false, queued: false });
    expect(r.hitInSec).toBeCloseTo(D.duration * D.hitAt);
    expect(D.duration).toBeGreaterThanOrEqual(1);
    expect(D.duration).toBeLessThanOrEqual(1.5);
    expect(run(a, D.duration * 0.5).progress).toBeCloseTo(0.5, 1);
    run(a, D.duration * 0.5 + 0.05);
    expect(a.isActive()).toBe(false);
  });

  it('queues rapid plants as quicker pats and caps the backlog', () => {
    const a = createPlantAction();
    a.trigger({ x: 0, z: 0 });
    const r2 = a.trigger({ x: 1, z: 0 });
    expect(r2.queued).toBe(true);
    expect(r2.hitInSec).toBeCloseTo(D.duration + D.quickDuration * D.hitAt);
    a.trigger({ x: 2, z: 0 });
    const r4 = a.trigger({ x: 3, z: 0 }); // queue full: retargets the last slot
    expect(a.queuedCount()).toBe(D.maxQueue);
    expect(a.backlogSec()).toBeCloseTo(D.duration + D.maxQueue * D.quickDuration);
    expect(r4.hitInSec).toBeCloseTo(D.duration + D.quickDuration + D.quickDuration * D.hitAt);
    run(a, D.duration + 0.02);
    expect(a.getPose().target).toEqual({ x: 1, z: 0 });
    run(a, D.quickDuration);
    expect(a.getPose().target).toEqual({ x: 3, z: 0 });
  });

  it('is skipped by moving (input is never blocked) and drops the queue', () => {
    const a = createPlantAction();
    a.trigger({ x: 0, z: 0 });
    a.trigger({ x: 1, z: 0 });
    run(a, 0.2);
    expect(a.update(1 / 60, { moving: true })).toBeNull();
    expect(a.isActive()).toBe(false);
    expect(a.queuedCount()).toBe(0);
  });

  it('skips the body animation under reduced motion and ignores bad targets', () => {
    const a = createPlantAction();
    expect(a.trigger({ x: 0, z: 0 }, { reducedMotion: true })).toEqual({ skipped: true, hitInSec: 0 });
    expect(a.trigger(null).skipped).toBe(true);
    expect(a.trigger({ x: NaN, z: 0 }).skipped).toBe(true);
    expect(a.isActive()).toBe(false);
  });
});

describe('facing helpers', () => {
  it('points a +Z-forward rig at the target and blends the short way round', () => {
    expect(facingToward({ x: 0, z: 0 }, { x: 0, z: 1 })).toBeCloseTo(0);
    expect(facingToward({ x: 0, z: 0 }, { x: 1, z: 0 })).toBeCloseTo(Math.PI / 2);
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
  });
});

describe('player character plant action', () => {
  const snap = (time, extra = {}) => ({ position: { x: 0, y: 0, z: 1 }, facing: Math.PI, moving: false, speed: 0, time, ...extra });

  it('turns to the square, kneels, then stands back up', () => {
    const pc = createPlayerCharacter();
    pc.update(snap(0));
    const rig = pc.group.children.find((c) => c.isGroup);
    const standY = rig.position.y;
    expect(pc.playPlantAction({ x: 0, z: 0 }).skipped).toBe(false);
    let t = 0;
    for (; t < D.duration * 0.5; t += 1 / 60) pc.update(snap(t));
    expect(pc.isPlanting()).toBe(true);
    expect(rig.position.y).toBeLessThan(standY - 0.1);
    // target is straight behind the default facing (-Z): faces it
    expect(Math.abs(Math.cos(pc.group.rotation.y - Math.PI))).toBeGreaterThan(0.99);
    for (; t < D.duration + 0.1; t += 1 / 60) pc.update(snap(t));
    expect(pc.isPlanting()).toBe(false);
    expect(rig.position.y).toBeCloseTo(standY);
    expect(pc.group.position.z).toBeCloseTo(1);
  });

  it('stops planting the moment the player moves', () => {
    const pc = createPlayerCharacter();
    pc.update(snap(0));
    pc.playPlantAction({ x: 0, z: 0 });
    pc.update(snap(0.2));
    pc.update(snap(0.22, { moving: true, speed: 1 }));
    expect(pc.isPlanting()).toBe(false);
  });

  it('advances on the game-loop step when one is given (sim clock frozen)', () => {
    const pc = createPlayerCharacter();
    pc.update(snap(5), 1 / 60);
    pc.playPlantAction({ x: 0, z: 0 });
    let frames = 0;
    while (pc.isPlanting() && frames < 500) { pc.update(snap(5), 1 / 60); frames++; }
    expect(frames).toBe(Math.round(D.duration * 60));
  });
});
