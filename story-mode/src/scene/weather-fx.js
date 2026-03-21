/**
 * Weather Effects — rain particles, frost overlay, sun rays.
 * Activated by season events.
 */
import * as THREE from 'three';

export function createWeatherFX(scene) {
  // --- Rain system ---
  const RAIN_COUNT = 300;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(RAIN_COUNT * 3);
  const rainVelocities = new Float32Array(RAIN_COUNT);
  const RAIN_AREA = 8;
  const RAIN_HEIGHT = 6;

  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
    rainPositions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    rainVelocities[i] = 3 + Math.random() * 2;
  }

  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainMat = new THREE.PointsMaterial({
    color: 0x8aadcc,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });

  const rain = new THREE.Points(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

  // --- Frost overlay ---
  const frostGeo = new THREE.PlaneGeometry(10, 10);
  const frostMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const frost = new THREE.Mesh(frostGeo, frostMat);
  frost.rotation.x = -Math.PI / 2;
  frost.position.y = 0.3;
  frost.visible = false;
  scene.add(frost);

  // --- Sun rays (spotlight cone) ---
  const sunRayLight = new THREE.SpotLight(0xffe0a0, 0, 20, Math.PI / 6, 0.5, 1);
  sunRayLight.position.set(2, 8, -1);
  sunRayLight.target.position.set(0, 0, 0);
  sunRayLight.visible = false;
  scene.add(sunRayLight);
  scene.add(sunRayLight.target);

  // Active effects state
  let activeEffects = new Set();
  let rainIntensity = 0;
  let frostIntensity = 0;
  let sunRayIntensity = 0;

  return {
    startRain(intensity = 1) {
      activeEffects.add('rain');
      rainIntensity = intensity;
      rain.visible = true;
    },

    stopRain() {
      activeEffects.delete('rain');
      rainIntensity = 0;
      rain.visible = false;
    },

    startFrost(intensity = 0.25) {
      activeEffects.add('frost');
      frostIntensity = intensity;
      frost.visible = true;
    },

    stopFrost() {
      activeEffects.delete('frost');
      frostIntensity = 0;
      frost.visible = false;
      frostMat.opacity = 0;
    },

    startSunRays(intensity = 2) {
      activeEffects.add('sun');
      sunRayIntensity = intensity;
      sunRayLight.visible = true;
    },

    stopSunRays() {
      activeEffects.delete('sun');
      sunRayIntensity = 0;
      sunRayLight.visible = false;
      sunRayLight.intensity = 0;
    },

    stopAll() {
      this.stopRain();
      this.stopFrost();
      this.stopSunRays();
    },

    update(dt) {
      // Rain animation
      if (activeEffects.has('rain')) {
        const positions = rainGeo.attributes.position.array;
        for (let i = 0; i < RAIN_COUNT; i++) {
          positions[i * 3 + 1] -= rainVelocities[i] * dt * rainIntensity;

          // Reset to top when below ground
          if (positions[i * 3 + 1] < -0.1) {
            positions[i * 3] = (Math.random() - 0.5) * RAIN_AREA;
            positions[i * 3 + 1] = RAIN_HEIGHT;
            positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
          }

          // Slight x drift
          positions[i * 3] += (Math.random() - 0.5) * 0.005;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // Frost fade in
      if (activeEffects.has('frost')) {
        frostMat.opacity = Math.min(frostMat.opacity + dt * 0.3, frostIntensity);
      }

      // Sun rays pulse
      if (activeEffects.has('sun')) {
        sunRayLight.intensity = sunRayIntensity * (0.8 + Math.sin(Date.now() * 0.001) * 0.2);
      }
    },

    /**
     * Auto-trigger effects based on event and season.
     */
    triggerForEvent(event, season) {
      this.stopAll();

      if (!event) {
        // Default seasonal ambient
        if (season === 'spring') this.startRain(0.5);
        if (season === 'winter') this.startFrost(0.15);
        if (season === 'summer') this.startSunRays(1.5);
        return;
      }

      const title = (event.title || '').toLowerCase();
      const desc = (event.description || '').toLowerCase();

      if (title.includes('rain') || title.includes('shower') || desc.includes('rain')) {
        this.startRain(1.2);
      }
      if (title.includes('frost') || title.includes('cold') || title.includes('freeze')) {
        this.startFrost(0.3);
      }
      if (title.includes('heat') || title.includes('sun') || desc.includes('sun beats')) {
        this.startSunRays(2.5);
      }
      if (title.includes('wind') || desc.includes('wind')) {
        this.startRain(0.3); // light particles for wind debris
      }
    },

    get active() { return activeEffects; },
  };
}
