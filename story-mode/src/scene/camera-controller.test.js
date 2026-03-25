// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { createCameraController } from './camera-controller.js';

describe('camera-controller', () => {
  it('orbits the camera in response to pointer dragging', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const element = document.createElement('div');
    const controller = createCameraController(camera, element);
    const before = camera.position.clone();

    element.dispatchEvent(new PointerEvent('pointerdown', {
      pointerType: 'mouse',
      button: 0,
      clientX: 160,
      clientY: 160,
    }));
    element.dispatchEvent(new PointerEvent('pointermove', {
      pointerType: 'mouse',
      clientX: 220,
      clientY: 175,
    }));
    element.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));

    expect(camera.position.x).not.toBeCloseTo(before.x, 4);
    expect(camera.position.z).not.toBeCloseTo(before.z, 4);

    controller.dispose();
  });

  it('clamps wheel zoom within the supported min and max radius', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const element = document.createElement('div');
    const controller = createCameraController(camera, element);
    const baselineDistance = camera.position.distanceTo(controller.getTarget());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, cancelable: true }));
    const zoomedInDistance = camera.position.distanceTo(controller.getTarget());

    element.dispatchEvent(new WheelEvent('wheel', { deltaY: 50000, cancelable: true }));
    const zoomedOutDistance = camera.position.distanceTo(controller.getTarget());

    expect(zoomedInDistance).toBeLessThan(baselineDistance);
    expect(zoomedOutDistance).toBeGreaterThan(zoomedInDistance);
    expect(zoomedOutDistance).toBeCloseTo(11.5, 1);

    controller.dispose();
  });

  it('follows a provided target by lerping the camera focus point', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const element = document.createElement('div');
    const controller = createCameraController(camera, element);
    const target = new THREE.Vector3(2, 0.6, 1.5);
    const before = controller.getTarget().clone();

    controller.setFollowTarget(target, { strength: 0.5 });
    controller.update();

    const after = controller.getTarget().clone();
    expect(after.distanceTo(target)).toBeLessThan(before.distanceTo(target));
    expect(camera.position.distanceTo(after)).toBeGreaterThan(0);

    controller.clearFollowTarget();
    const frozen = controller.getTarget().clone();
    controller.update();
    expect(controller.getTarget().distanceTo(frozen)).toBeLessThan(0.0001);

    controller.dispose();
  });

  it('lerps toward named preset camera poses', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const element = document.createElement('div');
    const controller = createCameraController(camera, element);

    controller.setPose('side');
    for (let index = 0; index < 40; index += 1) {
      controller.update();
    }

    expect(camera.position.x).toBeGreaterThan(3);
    expect(camera.position.y).toBeGreaterThan(2);
    expect(controller.getTarget().x).toBeGreaterThan(0.1);

    controller.dispose();
  });
});
