import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createParticlePool } from './particle-pool.js';

function pool(capacity = 4) {
  return createParticlePool({ geometry: new THREE.SphereGeometry(0.01, 4, 3), capacity, name: 'test-pool' });
}

describe('createParticlePool', () => {
  it('is one hidden InstancedMesh until something spawns', () => {
    const p = pool();
    expect(p.mesh.isInstancedMesh).toBe(true);
    expect(p.mesh.count).toBe(0);
    expect(p.mesh.visible).toBe(false);
    expect(p.mesh.frustumCulled).toBe(false);
  });

  it('writes live particles into instances and compacts dead ones out', () => {
    const p = pool();
    const a = p.add({ x: 1, y: 2, z: 3, scale: 2, color: 0xff0000, opacity: 0.5 });
    const b = p.add({ x: -1, color: 0x00ff00, opacity: 0.25 });
    expect(p.sync()).toBe(2);
    expect(p.mesh.count).toBe(2);
    expect(p.mesh.visible).toBe(true);
    const m = new THREE.Matrix4();
    p.mesh.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.toArray()).toEqual([1, 2, 3]);
    const opacity = p.mesh.geometry.getAttribute('instanceOpacity');
    expect(opacity.array[0]).toBeCloseTo(0.5);
    expect(opacity.array[1]).toBeCloseTo(0.25);

    a.dead = true;
    expect(p.sync()).toBe(1);
    const c = new THREE.Color();
    p.mesh.getColorAt(0, c);
    expect(c.getHex()).toBe(0x00ff00);
    expect(p.live()).toEqual([b]);

    b.dead = true;
    expect(p.sync()).toBe(0);
    expect(p.mesh.visible).toBe(false);
  });

  it('drops spawns past capacity instead of allocating meshes', () => {
    const p = pool(2);
    expect(p.add({})).toBeTruthy();
    expect(p.add({})).toBeTruthy();
    expect(p.add({})).toBeNull();
    expect(p.dropped).toBe(1);
    expect(p.sync()).toBe(2);
  });

  it('patches the material for per-instance opacity', () => {
    const p = pool();
    const shader = {
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>',
    };
    p.mesh.material.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain('attribute float instanceOpacity');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= vInstanceOpacity');
  });
});
