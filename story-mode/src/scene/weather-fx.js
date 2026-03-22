/**
 * Weather Effects — rain particles, frost overlay, sun rays.
 * Activated by season events.
 */
import * as THREE from 'three';

const DAY_NIGHT_KEYFRAMES = [
  {
    time: 0,
    sunColor: 0xffb366,
    sunIntensity: 0.6,
    hemiSky: 0xffd4a3,
    hemiGround: 0x5a3e20,
    ambient: 0.4,
  },
  {
    time: 0.25,
    sunColor: 0xfffff0,
    sunIntensity: 1.0,
    hemiSky: 0x87ceeb,
    hemiGround: 0x8fbc8f,
    ambient: 0.6,
  },
  {
    time: 0.5,
    sunColor: 0xff7f50,
    sunIntensity: 0.5,
    hemiSky: 0xcd853f,
    hemiGround: 0x3e2723,
    ambient: 0.35,
  },
  {
    time: 0.75,
    sunColor: 0x4169e1,
    sunIntensity: 0.15,
    hemiSky: 0x1a1a3e,
    hemiGround: 0x0d0d1a,
    ambient: 0.15,
  },
  {
    time: 1,
    sunColor: 0xffb366,
    sunIntensity: 0.6,
    hemiSky: 0xffd4a3,
    hemiGround: 0x5a3e20,
    ambient: 0.4,
  },
];

function smoothHermite(t) {
  return t * t * (3 - 2 * t);
}

function lerpColor(fromHex, toHex, t) {
  return new THREE.Color(fromHex).lerp(new THREE.Color(toHex), t);
}

function findFramePair(timeOfDay) {
  for (let i = 0; i < DAY_NIGHT_KEYFRAMES.length - 1; i++) {
    const current = DAY_NIGHT_KEYFRAMES[i];
    const next = DAY_NIGHT_KEYFRAMES[i + 1];
    if (timeOfDay >= current.time && timeOfDay <= next.time) {
      return [current, next];
    }
  }
  return [DAY_NIGHT_KEYFRAMES[0], DAY_NIGHT_KEYFRAMES[1]];
}

export class DayNightCycle {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.cycleDurationMs = options.cycleDurationMs ?? 300000;
    this.enabled = Boolean(options.enabled);
    this.timeOfDay = 0;
    this.currentSeason = 'spring';
    this.baseFogDensity = scene.fog?.density ?? 0.02;
    this.moonLight = new THREE.DirectionalLight(0xa8bbff, 0);
    this.moonLight.position.set(-2, 5, -3);
    this.stars = this.createStars();
    scene.add(this.moonLight, this.stars);
    this.apply();
  }

  createStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(90);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = 5 + Math.random() * 4;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const stars = new THREE.Points(geometry, material);
    stars.visible = false;
    return stars;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stars.visible = false;
      this.stars.material.opacity = 0;
      this.moonLight.intensity = 0;
    }
  }

  setSeason(season) {
    this.currentSeason = season ?? this.currentSeason;
  }

  setTimeOfDay(t) {
    this.timeOfDay = Math.max(0, Math.min(1, t));
    this.apply();
  }

  getTimeOfDay() {
    return this.timeOfDay;
  }

  setCycleDuration(ms) {
    this.cycleDurationMs = Math.max(1000, ms ?? this.cycleDurationMs);
  }

  update(dt) {
    if (!this.enabled) return;
    this.timeOfDay = (this.timeOfDay + ((dt * 1000) / this.cycleDurationMs)) % 1;
    this.apply();
  }

  apply() {
    const rig = this.scene.userData.lightingRig ?? {};
    if (!rig.sun || !rig.hemi) return;

    const [from, to] = findFramePair(this.timeOfDay);
    const localT = smoothHermite((this.timeOfDay - from.time) / Math.max(to.time - from.time, 0.0001));
    const sunColor = lerpColor(from.sunColor, to.sunColor, localT);
    const skyColor = lerpColor(from.hemiSky, to.hemiSky, localT);
    const groundColor = lerpColor(from.hemiGround, to.hemiGround, localT);
    const sunIntensity = from.sunIntensity + (to.sunIntensity - from.sunIntensity) * localT;
    const ambient = from.ambient + (to.ambient - from.ambient) * localT;

    rig.sun.color.copy(sunColor);
    rig.sun.intensity = sunIntensity;
    rig.sun.position.set(
      Math.cos(this.timeOfDay * Math.PI * 2) * 5,
      Math.max(0.5, Math.sin(this.timeOfDay * Math.PI * 2) * 5 + 4),
      Math.sin(this.timeOfDay * Math.PI * 2) * 4,
    );
    rig.hemi.color.copy(skyColor);
    rig.hemi.groundColor.copy(groundColor);
    rig.hemi.intensity = ambient;
    if (rig.fill) {
      rig.fill.intensity = ambient * 0.8;
    }
    if (rig.rim) {
      rig.rim.intensity = ambient * 0.35;
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.density = this.baseFogDensity * (this.timeOfDay >= 0.75 ? 0.6 : 1);
    }

    const showStars = this.timeOfDay >= 0.75 && this.timeOfDay <= 0.95;
    this.stars.visible = showStars;
    this.stars.material.opacity = showStars ? 0.75 : 0;
    this.moonLight.intensity = showStars ? 0.25 : 0;

    this.scene.userData.weatherFx?.[this.timeOfDay >= 0.2 && this.timeOfDay <= 0.3 ? 'startSunRays' : 'stopSunRays']?.(1.2);
    this.scene.userData.scenery?.showFireflies?.(this.currentSeason === 'summer' && this.timeOfDay >= 0.6 && this.timeOfDay <= 0.8);
  }

  dispose() {
    this.scene.remove(this.moonLight, this.stars);
    this.stars.geometry.dispose();
    this.stars.material.dispose();
  }
}

export function createWeatherFX(scene, tracker = null) {
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
  tracker?.trackObject(rain);

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
  tracker?.trackObject(frost);

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

    dispose() {
      this.stopAll();
      scene.remove(rain);
      scene.remove(frost);
      scene.remove(sunRayLight);
      scene.remove(sunRayLight.target);
    },

    get active() { return activeEffects; },
  };
}
