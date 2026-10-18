/**
 * Light colour grade (high tier only): scene -> MSAA half-float target ->
 * one full-screen triangle that tone-maps, then applies warm-highlight /
 * cool-shadow split toning, a touch of saturation and a soft vignette.
 * Adds exactly one draw call. Low tier renders straight to the canvas.
 */
import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
  uniform sampler2D tScene;
  uniform float uSaturation;
  uniform float uVignette;
  uniform vec3 uShadowTint;
  uniform vec3 uHighlightTint;
  uniform float uSplit;
  uniform float uContrast;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    #ifdef TONE_MAPPING
      c = toneMapping(c);
    #endif
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSaturation);
    // split tone: cool lifts in the shade, warm in the light
    c += uSplit * (mix(uShadowTint, uHighlightTint, smoothstep(0.05, 0.75, l)) - 0.5) * 0.12;
    c = (c - 0.5) * uContrast + 0.5;
    vec2 d = vUv - 0.5;
    c *= 1.0 - uVignette * smoothstep(0.32, 0.95, dot(d, d) * 2.2);
    gl_FragColor = linearToOutputTexel(vec4(clamp(c, 0.0, 1.0), 1.0));
  }
`;

export function createGradePass({ samples = 4 } = {}) {
  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    samples,
    depthBuffer: true,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const material = new THREE.ShaderMaterial({
    name: 'yard-art-grade',
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      tScene: { value: target.texture },
      uSaturation: { value: 1.06 },
      uVignette: { value: 0.14 },
      uShadowTint: { value: new THREE.Color(0.42, 0.5, 0.66) },
      uHighlightTint: { value: new THREE.Color(0.68, 0.56, 0.4) },
      uSplit: { value: 1.6 },
      uContrast: { value: 1.03 },
    },
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  // single oversized triangle covering the screen
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(geo, material);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();

  return {
    material,
    render(renderer, scene, camera) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
      const prev = renderer.getRenderTarget();
      const autoReset = renderer.info.autoReset;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      // keep info counters for the whole frame (scene + grade)
      renderer.info.autoReset = false;
      renderer.setRenderTarget(prev);
      renderer.render(postScene, postCamera);
      renderer.info.autoReset = autoReset;
    },
    dispose() {
      target.dispose();
      geo.dispose();
      material.dispose();
    },
  };
}
