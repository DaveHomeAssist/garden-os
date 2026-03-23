import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

import { ResourceTracker } from './resource-tracker.js';

describe('ResourceTracker', () => {
  it('tracks and disposes object geometries, materials, and nested textures once', () => {
    const tracker = new ResourceTracker();
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ map, normalMap });
    const mesh = new THREE.Mesh(geometry, material);

    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const mapDispose = vi.spyOn(map, 'dispose');
    const normalMapDispose = vi.spyOn(normalMap, 'dispose');

    tracker.trackObject(mesh);
    tracker.trackObject(mesh);

    expect(tracker.count).toBe(4);

    tracker.disposeAll();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(mapDispose).toHaveBeenCalledTimes(1);
    expect(normalMapDispose).toHaveBeenCalledTimes(1);
    expect(tracker.count).toBe(0);
  });

  it('disposes render targets and removes runtime objects from parents', () => {
    const tracker = new ResourceTracker();
    const root = new THREE.Group();
    const child = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    const target = new THREE.WebGLRenderTarget(8, 8);

    root.add(child);
    tracker.trackObject(child);
    tracker.track(target);

    const targetDispose = vi.spyOn(target, 'dispose');
    const geometryDispose = vi.spyOn(child.geometry, 'dispose');
    const materialDispose = vi.spyOn(child.material, 'dispose');

    tracker.disposeObject(child);

    expect(child.parent).toBeNull();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(tracker.count).toBe(1);

    tracker.disposeAll();

    expect(targetDispose).toHaveBeenCalledTimes(1);
    expect(tracker.count).toBe(0);
  });

  it('does not dispose textures marked as externally managed', () => {
    const tracker = new ResourceTracker();
    const sharedMap = new THREE.Texture();
    sharedMap.userData.managedExternally = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ map: sharedMap });
    const mesh = new THREE.Mesh(geometry, material);

    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const mapDispose = vi.spyOn(sharedMap, 'dispose');

    tracker.trackObject(mesh);
    tracker.disposeObject(mesh);

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(mapDispose).not.toHaveBeenCalled();
  });
});
