/**
 * Instanced particle pool.
 *
 * Short-lived effect particles (soil poofs when planting, harvest confetti)
 * used to be one Mesh + one material each, so replanting a whole bed spawned
 * ~8 meshes per crop at once (+512 draw calls for half a second). A pool
 * draws all live particles of one kind with a single InstancedMesh: per-
 * instance colour via instanceColor, per-instance opacity via a small shader
 * patch, and dead particles compacted out each sync so `count` is exactly the
 * number alive (0 → hidden, no draw at all).
 *
 * Callers own the motion: add() returns a plain particle record
 * ({ x, y, z, scale, rotX, rotZ, opacity, color, ... }) that they mutate each
 * frame; set `dead = true` to retire it, then call sync() once per frame.
 */
import * as THREE from 'three';

function patchOpacity(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vInstanceOpacity;');
}

export function createParticlePool({ geometry, capacity, name = 'particle-pool' }) {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  material.onBeforeCompile = patchOpacity;
  material.customProgramCacheKey = () => 'particle-pool-opacity-v1';

  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.name = name;
  mesh.count = 0;
  mesh.visible = false;
  // Instances move every frame; a cached bounding sphere would cull them.
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const opacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
  opacity.setUsage(THREE.DynamicDrawUsage);
  geometry = mesh.geometry;
  geometry.setAttribute('instanceOpacity', opacity);

  const live = [];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  let dropped = 0;

  function add(particle) {
    if (live.length >= capacity) {
      dropped += 1;
      return null;
    }
    const record = { x: 0, y: 0, z: 0, scale: 1, rotX: 0, rotZ: 0, opacity: 1, color: 0xffffff, dead: false, ...particle };
    live.push(record);
    return record;
  }

  function sync() {
    let n = 0;
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      if (p.dead) continue;
      live[n] = p;
      position.set(p.x, p.y, p.z);
      quaternion.setFromEuler(euler.set(p.rotX, 0, p.rotZ));
      scale.setScalar(p.scale);
      mesh.setMatrixAt(n, matrix.compose(position, quaternion, scale));
      mesh.setColorAt(n, color.set(p.color));
      opacity.array[n] = p.opacity;
      n += 1;
    }
    live.length = n;
    mesh.count = n;
    mesh.visible = n > 0;
    if (n > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      opacity.needsUpdate = true;
    }
    return n;
  }

  return {
    mesh,
    add,
    sync,
    /** Live particle records (mutate in place; set `dead` to retire). */
    live() { return live; },
    get size() { return live.length; },
    get dropped() { return dropped; },
    clear() { live.length = 0; mesh.count = 0; mesh.visible = false; },
    dispose() { material.dispose(); },
  };
}
