/**
 * Ground shader: blends painted grass, worn dirt and packed path tiles with a
 * layout mask (paths, wear, contact shade) painted from yard-layout.js at
 * startup. Applied to the existing ground mesh, so raycasts and collision are
 * untouched. One draw call.
 */
import * as THREE from 'three';
import { groundMaskAt } from './yard-layout.js';

export const GROUND_MASK_EXTENT = 13; // mask covers [-13, 13] in x and z

/** Paint the RGB mask (R path, G wear, B contact shade) into a DataTexture. */
export function buildGroundMaskTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j += 1) {
    const z = ((j + 0.5) / size) * 2 * GROUND_MASK_EXTENT - GROUND_MASK_EXTENT;
    for (let i = 0; i < size; i += 1) {
      const x = ((i + 0.5) / size) * 2 * GROUND_MASK_EXTENT - GROUND_MASK_EXTENT;
      const m = groundMaskAt(x, z);
      const k = (j * size + i) * 4;
      data[k] = Math.round(m.path * 255);
      data[k + 1] = Math.round(m.wear * 255);
      data[k + 2] = Math.round(m.ao * 255);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createGroundMaterial({ grass, dirt, path, mask }) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, metalness: 0 });
  material.name = 'yard-art-ground';
  const uniforms = {
    uGrass: { value: grass },
    uDirt: { value: dirt },
    uPath: { value: path },
    uMask: { value: mask },
    uMaskExtent: { value: GROUND_MASK_EXTENT },
    uGrassTint: { value: new THREE.Color(1, 1, 1) },
    uFarGrass: { value: new THREE.Color(0x7fa356) },
  };
  material.userData.yardUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vYardWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvYardWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vYardWorld;
uniform sampler2D uGrass;
uniform sampler2D uDirt;
uniform sampler2D uPath;
uniform sampler2D uMask;
uniform float uMaskExtent;
uniform vec3 uGrassTint;
uniform vec3 uFarGrass;`)
      .replace('#include <map_fragment>', `
{
  vec2 w = vYardWorld.xz;
  vec3 g1 = texture2D(uGrass, w * 0.42).rgb;
  // texture values arrive linear: centre them on the tile means so the masks
  // and swells below are symmetric (grass ~0.152, dirt ~0.196 linear luma)
  float texMacro = dot(texture2D(uGrass, w * 0.083 + 0.37).rgb, vec3(0.333)) / 0.152 - 1.0;
  float swell = sin(w.x * 0.23 + sin(w.y * 0.17) * 2.0) * sin(w.y * 0.21 + sin(w.x * 0.13) * 1.7);
  float macro = clamp(swell * 0.5 + 0.5 + texMacro * 1.5, 0.0, 1.0);
  vec3 grass = g1 * mix(0.84, 1.16, macro) * uGrassTint;
  // sun-warmed patches: painted yellow-green swells across the lawn
  grass = mix(grass, grass * vec3(1.18, 1.08, 0.72), smoothstep(0.55, 0.95, macro) * 0.6);
  vec3 dirt = texture2D(uDirt, w * 0.55).rgb;
  vec3 path = texture2D(uPath, w * 0.5).rgb;
  vec2 muv = w / (2.0 * uMaskExtent) + 0.5;
  float inside = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
  vec3 m = texture2D(uMask, clamp(muv, 0.0, 1.0)).rgb * inside;
  // painterly, broken edges: perturb the mask with tile noise
  float n = dot(texture2D(uDirt, w * 1.7 + 0.11).rgb, vec3(0.333)) / 0.196 - 1.0;
  float wear = smoothstep(0.46, 0.76, m.g + n * 0.3);
  float pth = smoothstep(0.5, 0.72, m.r + n * 0.25);
  vec3 col = mix(grass, dirt, wear);
  col = mix(col, path, pth);
  // far field fades to a calm, slightly cooler sward
  float far = smoothstep(18.0, 55.0, length(w));
  col = mix(col, uFarGrass * mix(0.9, 1.08, macro), far * 0.7);
  // contact shade, tinted cool so it reads as sky-lit shadow, not dirt
  col *= mix(vec3(1.0), vec3(0.56, 0.6, 0.68), m.b);
  diffuseColor.rgb *= col;
}`);
  };
  material.customProgramCacheKey = () => 'yard-art-ground-v3';
  return material;
}
