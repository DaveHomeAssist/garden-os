const MATERIAL_TEXTURE_KEYS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
  'gradientMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'anisotropyMap',
];

function isDisposable(resource) {
  return Boolean(resource && typeof resource.dispose === 'function');
}

function collectMaterialTextures(material) {
  const textures = [];
  for (const key of MATERIAL_TEXTURE_KEYS) {
    const value = material?.[key];
    if (value?.isTexture) textures.push(value);
  }

  if (material?.uniforms) {
    for (const uniform of Object.values(material.uniforms)) {
      const value = uniform?.value;
      if (value?.isTexture) {
        textures.push(value);
      } else if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry?.isTexture) textures.push(entry);
        });
      }
    }
  }

  return textures;
}

function collectObjectResources(obj) {
  const resources = new Set();
  if (!obj?.traverse) return resources;

  obj.traverse((child) => {
    if (child.geometry) resources.add(child.geometry);

    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        resources.add(material);
        collectMaterialTextures(material).forEach((texture) => resources.add(texture));
      });
    }

    if (child.skeleton?.boneTexture) resources.add(child.skeleton.boneTexture);
    if (child.isLight && child.shadow?.map) resources.add(child.shadow.map);
    if (child.isLight && child.shadow?.mapPass) resources.add(child.shadow.mapPass);
  });

  return resources;
}

export class ResourceTracker {
  constructor() {
    this._resources = new Set();
  }

  track(resource) {
    if (!resource) return resource;

    if (Array.isArray(resource)) {
      resource.forEach((entry) => this.track(entry));
      return resource;
    }

    if (resource.isObject3D) {
      return this.trackObject(resource);
    }

    if (resource.isMaterial) {
      this._resources.add(resource);
      this.track(collectMaterialTextures(resource));
      return resource;
    }

    if (isDisposable(resource)) {
      this._resources.add(resource);
    }

    return resource;
  }

  trackObject(obj) {
    collectObjectResources(obj).forEach((resource) => this.track(resource));
    return obj;
  }

  dispose(resource) {
    if (!resource) return;

    if (Array.isArray(resource)) {
      resource.forEach((entry) => this.dispose(entry));
      return;
    }

    if (resource.isObject3D) {
      collectObjectResources(resource).forEach((entry) => this.dispose(entry));
      if (resource.parent) resource.parent.remove(resource);
      return;
    }

    if (resource.isMaterial) {
      this.dispose(collectMaterialTextures(resource));
    }

    this._resources.delete(resource);
    if (isDisposable(resource)) {
      resource.dispose();
    }
  }

  disposeObject(obj) {
    this.dispose(obj);
  }

  disposeAll() {
    const resources = [...this._resources];
    this._resources.clear();
    resources.forEach((resource) => {
      if (isDisposable(resource)) resource.dispose();
    });
  }

  get count() {
    return this._resources.size;
  }
}
