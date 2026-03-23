import * as THREE from 'three';

const MATERIAL_STYLE_DEFAULTS = {
  roughness: 1,
  metalness: 0,
  envMapIntensity: 0,
  saturation: 1,
  lightness: 1,
  flatShading: false,
};

const PHASE_STYLE_MAP = {
  PLANNING: 'planner',
  INSPECT: 'planner',
  TRANSITION: 'story',
  EARLY_SEASON: 'story',
  MID_SEASON: 'story',
  LATE_SEASON: 'story',
  HARVEST: 'celebration',
  CUTSCENE: 'story',
  GRADE: 'celebration',
  CELEBRATION: 'celebration',
};

export const SCENE_STYLES = {
  planner: {
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    shadowsEnabled: false,
    fogDensityMultiplier: 0,
    backgroundColor: new THREE.Color(0xd8d3c6),
    skyTint: new THREE.Color(0xf2eee6),
    hemiSkyTint: new THREE.Color(0xe9e3d8),
    hemiGroundTint: new THREE.Color(0x6a645a),
    hemiIntensityMultiplier: 1.2,
    sunIntensityMultiplier: 0.12,
    fillIntensityMultiplier: 0.18,
    rimIntensityMultiplier: 0.08,
    material: {
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
      saturation: 0.55,
      lightness: 1.04,
      flatShading: true,
    },
  },
  story: {
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.18,
    shadowsEnabled: true,
    fogDensityMultiplier: 1,
    backgroundColor: null,
    skyTint: new THREE.Color(0xffffff),
    hemiSkyTint: null,
    hemiGroundTint: null,
    hemiIntensityMultiplier: 1,
    sunIntensityMultiplier: 1,
    fillIntensityMultiplier: 1,
    rimIntensityMultiplier: 1,
    material: {
      roughness: null,
      metalness: null,
      envMapIntensity: null,
      saturation: 1,
      lightness: 1,
      flatShading: false,
    },
  },
  celebration: {
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.25,
    shadowsEnabled: true,
    fogDensityMultiplier: 0.78,
    backgroundColor: null,
    skyTint: new THREE.Color(0xfff1cf),
    hemiSkyTint: new THREE.Color(0xfff3d6),
    hemiGroundTint: null,
    hemiIntensityMultiplier: 1.08,
    sunIntensityMultiplier: 1.18,
    fillIntensityMultiplier: 1.14,
    rimIntensityMultiplier: 1.08,
    material: {
      roughness: null,
      metalness: null,
      envMapIntensity: null,
      saturation: 1.08,
      lightness: 1.03,
      flatShading: false,
    },
  },
};

const scratchHsl = { h: 0, s: 0, l: 0 };

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function applyMaterialStyle(material, styleMaterial) {
  if (!material || !material.isMaterial) return;

  if (!material.userData.__sceneStyleBase) {
    material.userData.__sceneStyleBase = {
      color: material.color?.clone?.() ?? null,
      roughness: material.roughness,
      metalness: material.metalness,
      envMapIntensity: material.envMapIntensity,
      flatShading: material.flatShading ?? false,
    };
  }

  const base = material.userData.__sceneStyleBase;

  if (material.color && base.color) {
    material.color.copy(base.color);
    material.color.getHSL(scratchHsl);
    material.color.setHSL(
      scratchHsl.h,
      clamp01(scratchHsl.s * styleMaterial.saturation),
      clamp01(scratchHsl.l * styleMaterial.lightness),
    );
  }

  if (base.roughness !== undefined && styleMaterial.roughness !== null) {
    material.roughness = styleMaterial.roughness;
  } else if (base.roughness !== undefined) {
    material.roughness = base.roughness;
  }

  if (base.metalness !== undefined && styleMaterial.metalness !== null) {
    material.metalness = styleMaterial.metalness;
  } else if (base.metalness !== undefined) {
    material.metalness = base.metalness;
  }

  if (base.envMapIntensity !== undefined && styleMaterial.envMapIntensity !== null) {
    material.envMapIntensity = styleMaterial.envMapIntensity;
  } else if (base.envMapIntensity !== undefined) {
    material.envMapIntensity = base.envMapIntensity;
  }

  if ('flatShading' in material) {
    material.flatShading = styleMaterial.flatShading;
  }

  material.needsUpdate = true;
}

function applyStyleToTarget(target, styleMaterial) {
  if (!target) return;
  if (target instanceof Map) {
    for (const value of target.values()) {
      applyStyleToTarget(value, styleMaterial);
    }
    return;
  }
  if (Array.isArray(target)) {
    target.forEach((entry) => applyStyleToTarget(entry, styleMaterial));
    return;
  }
  if (target.isMesh) {
    const materials = Array.isArray(target.material) ? target.material : [target.material];
    materials.forEach((material) => applyMaterialStyle(material, styleMaterial));
    return;
  }
  if (target.traverse) {
    target.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => applyMaterialStyle(material, styleMaterial));
    });
  }
}

export function getStyleForPhase(phase) {
  return PHASE_STYLE_MAP[String(phase || '').toUpperCase()] || 'story';
}

export function getMaterialProps(styleName) {
  return {
    ...MATERIAL_STYLE_DEFAULTS,
    ...(SCENE_STYLES[styleName]?.material ?? MATERIAL_STYLE_DEFAULTS),
  };
}

export function applySceneStyle(styleName, refs) {
  const style = SCENE_STYLES[styleName] || SCENE_STYLES.story;
  const {
    renderer,
    scene,
    skyMat,
    hemi,
    sun,
    fill,
    rim,
    lightingState,
    materialTargets = [],
  } = refs;

  if (renderer) {
    renderer.toneMapping = style.toneMapping;
    renderer.toneMappingExposure = style.toneMappingExposure;
    renderer.shadowMap.enabled = style.shadowsEnabled;
    renderer.shadowMap.needsUpdate = true;
  }

  if (scene && lightingState?.background) {
    if (style.backgroundColor) {
      scene.background.copy(style.backgroundColor);
    } else {
      scene.background.copy(lightingState.background);
    }
  }

  if (scene?.fog && lightingState) {
    scene.fog.color.copy(lightingState.fogColor);
    scene.fog.density = lightingState.fogDensity * style.fogDensityMultiplier;
  }

  if (skyMat?.color) {
    skyMat.color.copy(style.skyTint);
  }

  if (hemi && lightingState) {
    hemi.color.copy(style.hemiSkyTint ?? lightingState.hemiSky);
    hemi.groundColor.copy(style.hemiGroundTint ?? lightingState.hemiGround);
    hemi.intensity = lightingState.hemiIntensity * style.hemiIntensityMultiplier;
  }

  if (sun && lightingState) {
    sun.color.copy(lightingState.sunColor);
    sun.position.copy(lightingState.sunPosition);
    sun.intensity = lightingState.sunIntensity * style.sunIntensityMultiplier;
    sun.castShadow = style.shadowsEnabled;
  }

  if (fill && lightingState) {
    fill.color.copy(lightingState.fillColor);
    fill.position.copy(lightingState.fillPosition);
    fill.intensity = lightingState.fillIntensity * style.fillIntensityMultiplier;
  }

  if (rim && lightingState) {
    rim.color.copy(lightingState.rimColor);
    rim.position.copy(lightingState.rimPosition);
    rim.intensity = lightingState.rimIntensity * style.rimIntensityMultiplier;
  }

  materialTargets.forEach((target) => applyStyleToTarget(target, style.material));
}
