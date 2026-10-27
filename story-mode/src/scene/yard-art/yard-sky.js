/**
 * Painted sky dome: vertex-colour gradient (seam-free) plus a shader layer for
 * a soft sun glow and stylised two-tone clouds. One draw call, fog-free.
 */
import * as THREE from 'three';

const SKY_VERTEX = /* glsl */`
  varying vec3 vGradient;
  varying vec3 vDir;
  void main() {
    vGradient = color;
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // pin to far plane
  }
`;

const SKY_FRAGMENT = /* glsl */`
  uniform vec3 uSunDir;
  uniform vec3 uSunGlow;
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform vec3 uTint;
  uniform float uTintAmount;
  uniform float uTime;
  uniform float uCloudCover;
  varying vec3 vGradient;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.55;
    for (int i = 0; i < SKY_OCTAVES; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    vec3 col = vGradient;
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunGlow * (pow(sunDot, 6.0) * 0.32 + pow(sunDot, 48.0) * 0.55 + pow(sunDot, 900.0) * 1.4);

    // clouds on a flattened dome; fade into the horizon haze
    float up = dir.y;
    if (up > 0.015) {
      vec2 uv = dir.xz / (up + 0.18) * 1.15 + vec2(uTime * 0.006, uTime * 0.0025);
      float n = fbm(uv * 1.3);
      float shape = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.16, n);
      // lit tops / shaded bellies: sample the field nudged toward the sun
      float nl = fbm(uv * 1.3 + normalize(uSunDir.xz + 1e-4) * 0.09);
      float lit = clamp(0.55 + (n - nl) * 6.0, 0.0, 1.0);
      vec3 cloud = mix(uCloudShade, uCloudLit, lit);
      cloud += uSunGlow * pow(sunDot, 10.0) * 0.25;
      float horizonFade = smoothstep(0.015, 0.16, up);
      col = mix(col, cloud, shape * horizonFade * 0.92);
    }
    col = mix(col, uTint, uTintAmount);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSkyMaterial({ octaves = 5 } = {}) {
  const material = new THREE.ShaderMaterial({
    name: 'yard-art-sky',
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    defines: { SKY_OCTAVES: octaves },
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.6, 0.55, 0.56) },
      uSunGlow: { value: new THREE.Color(0xffd9a0) },
      uCloudLit: { value: new THREE.Color(0xfff8ec) },
      uCloudShade: { value: new THREE.Color(0xc9cfdc) },
      uTint: { value: new THREE.Color(0xffffff) },
      uTintAmount: { value: 0 },
      uTime: { value: 0 },
      uCloudCover: { value: 0.42 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexColors: true,
  });
  return material;
}

/** Rewrite the dome's vertex-colour gradient from a palette (linear colours). */
export function paintSkyGradient(geometry, palette, radius) {
  const stops = [
    { at: 0.0, color: new THREE.Color(palette.horizon).multiplyScalar(0.92) },
    { at: 0.47, color: new THREE.Color(palette.horizon) },
    { at: 0.505, color: new THREE.Color(palette.horizon) },
    { at: 0.57, color: new THREE.Color(palette.sky) },
    { at: 1.0, color: new THREE.Color(palette.zenith) },
  ];
  const pos = geometry.getAttribute('position');
  let attr = geometry.getAttribute('color');
  if (!attr || attr.count !== pos.count) {
    attr = new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3);
    geometry.setAttribute('color', attr);
  }
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const t = THREE.MathUtils.clamp((pos.getY(i) / radius + 1) / 2, 0, 1);
    let k = 1;
    while (k < stops.length - 1 && t > stops[k].at) k += 1;
    const a = stops[k - 1];
    const b = stops[k];
    const lt = b.at === a.at ? 0 : THREE.MathUtils.clamp((t - a.at) / (b.at - a.at), 0, 1);
    // ease toward the horizon so the haze band stays soft
    c.copy(a.color).lerp(b.color, lt * lt * (3 - 2 * lt));
    attr.setXYZ(i, c.r, c.g, c.b);
  }
  attr.needsUpdate = true;
}
