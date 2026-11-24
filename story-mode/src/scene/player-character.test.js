import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildGardener } from './gardener-model.js';
import { createPlayerCharacter } from './player-character.js';

describe('gardener model', () => {
  it('is one material, one atlas, and stays inside the triangle budget', () => {
    const view = buildGardener();
    expect(view.materialCount ?? 1).toBe(1);
    expect(view.material).toBeInstanceOf(THREE.Material);
    expect(view.material.map).toBeTruthy();
    expect(view.mesh.isSkinnedMesh).toBe(true);
    expect(view.mesh.skeleton.bones.length).toBeGreaterThan(10);
    expect(view.triangleCount).toBeGreaterThanOrEqual(5000);
    expect(view.triangleCount).toBeLessThanOrEqual(8000);
    const names = view.mesh.skeleton.bones.map((b) => b.name);
    for (const name of ['head', 'handR', 'footL', 'footR', 'hips']) {
      expect(names).toContain(name);
    }
  });
});

describe('gardener animation', () => {
  it('keeps a stance foot planted while the body walks', () => {
    const player = createPlayerCharacter();
    const speed = 1.85;
    const facing = Math.PI;
    const dt = 1 / 60;
    let z = 0;
    for (let i = 0; i < 50; i += 1) {
      z -= speed * dt;
      player.update({
        position: { x: 0, y: 0, z },
        facing,
        moving: true,
        speed,
        time: (i + 1) * dt,
        velocity: { x: 0, z: -speed },
      }, dt);
    }
    const samples = [];
    for (let i = 0; i < 24; i += 1) {
      const before = player.getFootWorld('L').clone();
      z -= speed * dt;
      player.update({
        position: { x: 0, y: 0, z },
        facing,
        moving: true,
        speed,
        time: (51 + i) * dt,
        velocity: { x: 0, z: -speed },
      }, dt);
      const after = player.getFootWorld('L');
      samples.push(after.distanceTo(before));
    }
    const planted = samples.filter((d) => d < 0.025);
    expect(planted.length).toBeGreaterThan(6);
  });

  it('crossfades into a plant action and still accepts a queued celebrate', () => {
    const player = createPlayerCharacter();
    expect(player.playAction('plant')).toBe(true);
    expect(player.playAction('celebrate')).toBe(true);
    for (let i = 0; i < 40; i += 1) {
      player.update({
        position: { x: 0, y: 0, z: 0 },
        facing: Math.PI,
        moving: false,
        speed: 0,
        time: (i + 1) / 60,
      }, 1 / 60);
    }
    const arm = player.group.getObjectByName('gardener').skeleton.bones.find((b) => b.name === 'armR');
    expect(Math.abs(arm.rotation.x)).toBeGreaterThan(0.15);
  });

  it('looks around while idle and leans while turning', () => {
    const player = createPlayerCharacter();
    // 4.2s sits inside the look-around window (3.55–5.05 of each 5.4s).
    player.update({
      position: { x: 0, y: 0, z: 0 },
      facing: Math.PI,
      moving: false,
      speed: 0,
      time: 4.2,
    }, 1 / 60);
    const head = player.group.getObjectByName('gardener').skeleton.bones.find((b) => b.name === 'head');
    expect(Math.abs(head.rotation.y)).toBeGreaterThan(0.05);

    let facing = Math.PI;
    for (let i = 0; i < 20; i += 1) {
      facing += 0.08;
      player.update({
        position: { x: 0, y: 0, z: 0 },
        facing,
        moving: true,
        speed: 1.2,
        time: 4.2 + (i + 1) / 60,
        velocity: { x: Math.sin(facing) * 1.2, z: Math.cos(facing) * 1.2 },
      }, 1 / 60);
    }
    const spine = player.group.getObjectByName('gardener').skeleton.bones.find((b) => b.name === 'spine');
    expect(Math.abs(spine.rotation.z)).toBeGreaterThan(0.02);
  });
});
