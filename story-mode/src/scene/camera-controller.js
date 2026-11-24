/**
 * Camera Controller — orbit + pinch-zoom for mobile, preset poses, and a
 * third-person heading follow (the same rig as the village).
 */
import * as THREE from 'three';
import { createFollowRig, prefersReducedMotion, resolveFollowFrame } from './village/follow-camera.js';

const POSES = {
  overview: { position: [0, 3.45, 5.35], target: [0, 0.44, -0.18] },
  closeup:  { position: [0, 2.15, 3.55], target: [0, 0.36, -0.16] },
  side:     { position: [3.7, 2.65, 3.5], target: [0.15, 0.4, -0.14] },
  birds:    { position: [0, 6.5, 2.2], target: [0, 0.1, -0.15] },
};

export function createCameraController(camera, domElement) {
  const target = new THREE.Vector3(0, 0.44, -0.18);
  const followTarget = new THREE.Vector3(0, 0.44, -0.18);
  const disposers = [];
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let theta = 0;
  let phi = 1.08;
  let radius = 6.55;
  let targetPose = null;
  let lerpSpeed = 0.1;
  let followStrength = 0.12;
  let followEnabled = false;
  let headingFollow = false;
  let headingPose = null;
  let headingObstacles = [];
  const headingRig = createFollowRig();
  const lastApplied = new THREE.Vector3();
  let followFov = null;

  function updateOrbit() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  function listen(type, handler, options) {
    domElement.addEventListener(type, handler, options);
    disposers.push(() => domElement.removeEventListener(type, handler, options));
  }

  // Touch/mouse orbit
  // For touch events, only start orbit if touch is in the right 60% of the screen.
  // This leaves the left 40% free for the virtual joystick.
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' && e.isPrimary) {
      if (e.clientX < window.innerWidth * 0.4) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (e.pointerType === 'mouse' && e.button === 0) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  listen('pointerdown', onPointerDown);

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    targetPose = null;
    if (headingFollow) {
      headingRig.addManualYaw(-dx * 0.005);
      headingRig.addPitchOffset(-dy * 0.005);
      headingRig.apply(camera);
      lastApplied.copy(camera.position);
      theta = headingRig.getAzimuth();
      return;
    }
    theta -= dx * 0.005;
    phi = Math.max(0.48, Math.min(1.34, phi - dy * 0.005));
    updateOrbit();
  };
  listen('pointermove', onPointerMove);

  const stopDragging = () => { isDragging = false; };
  listen('pointerup', stopDragging);
  listen('pointercancel', stopDragging);

  // Pinch zoom
  let pinchDist = 0;
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  };
  listen('touchstart', onTouchStart, { passive: true });

  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = pinchDist - dist;
      targetPose = null;
      if (headingFollow) {
        const frame = resolveFollowFrame(camera.aspect || 1);
        const next = headingRig.getUserDistance() + delta * 0.002;
        const metres = frame.distance * next;
        headingRig.setUserDistance(Math.min(14, Math.max(4.4, metres)) / frame.distance);
        headingRig.apply(camera);
        lastApplied.copy(camera.position);
      } else {
        radius = Math.max(4.4, Math.min(11.5, radius + delta * 0.02));
        updateOrbit();
      }
      pinchDist = dist;
    }
  };
  listen('touchmove', onTouchMove, { passive: true });

  // Mouse wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    targetPose = null;
    if (headingFollow) {
      const frame = resolveFollowFrame(camera.aspect || 1);
      const next = headingRig.getUserDistance() + e.deltaY * 0.001;
      const metres = frame.distance * next;
      headingRig.setUserDistance(Math.min(14, Math.max(4.4, metres)) / frame.distance);
      headingRig.apply(camera);
      lastApplied.copy(camera.position);
      return;
    }
    radius = Math.max(4.4, Math.min(11.5, radius + e.deltaY * 0.01));
    updateOrbit();
  };
  listen('wheel', onWheel, { passive: false });

  updateOrbit();

  return {
    // Horizontal orbit angle. Movement input is rotated by this so "up" walks
    // the way the camera faces (camera-relative), not fixed world-north.
    getAzimuth() {
      return headingFollow ? headingRig.getAzimuth() : theta;
    },
    setPose(poseName) {
      const pose = POSES[poseName];
      if (!pose) return;
      targetPose = {
        position: new THREE.Vector3(...pose.position),
        target: new THREE.Vector3(...pose.target),
      };
    },
    setFollowTarget(nextTarget, options = {}) {
      if (!nextTarget) return;
      const point = nextTarget.position ?? nextTarget;
      followTarget.set(point.x ?? 0, point.y ?? 0, point.z ?? 0);
      if (typeof options.strength === 'number') {
        followStrength = options.strength;
      }
      followEnabled = options.enabled ?? true;
      const facing = options.facing ?? nextTarget.facing;
      if (Number.isFinite(facing)) {
        headingFollow = true;
        headingPose = {
          position: { x: followTarget.x, y: followTarget.y, z: followTarget.z },
          facing,
          moving: Boolean(options.moving),
          speed: options.speed ?? 0,
          velocity: options.velocity ?? null,
        };
        if (Array.isArray(options.obstacles)) headingObstacles = options.obstacles;
        headingRig.setObstacles(headingObstacles);
        headingRig.setReducedMotion(options.reducedMotion ?? prefersReducedMotion());
        if (!headingRig.isInitialised()) {
          if (options.snap) headingRig.snap(headingPose.position, facing);
          else headingRig.seedFromCamera(camera, headingPose);
          headingRig.apply(camera);
          lastApplied.copy(camera.position);
        }
      }
    },
    clearFollowTarget() {
      followEnabled = false;
      headingFollow = false;
    },
    // lerpSpeed and followStrength are tuned per 60 Hz frame; convert them to
    // the actual frame time so easing speed doesn't depend on refresh rate.
    update(dt = 1 / 60) {
      const frames = Math.max(0, dt) * 60;
      if (targetPose) {
        const k = 1 - Math.pow(1 - lerpSpeed, frames);
        camera.position.lerp(targetPose.position, k);
        target.lerp(targetPose.target, k);
        camera.lookAt(target);

        if (camera.position.distanceTo(targetPose.position) < 0.01) {
          targetPose = null;
        }
        lastApplied.copy(camera.position);
      } else if (headingFollow && headingPose) {
        if (camera.position.distanceTo(lastApplied) > 0.08) {
          headingRig.seedFromCamera(camera, headingPose);
        }
        const frame = resolveFollowFrame(camera.aspect || 1);
        headingRig.setFrame(frame);
        headingRig.setReducedMotion(prefersReducedMotion());
        headingRig.setObstacles(headingObstacles);
        headingPose = {
          ...headingPose,
          position: { x: followTarget.x, y: followTarget.y, z: followTarget.z },
        };
        headingRig.update(headingPose, dt);
        headingRig.apply(camera);
        lastApplied.copy(camera.position);
        theta = headingRig.getAzimuth();
        target.set(headingRig.getTarget().x, headingRig.getTarget().y, headingRig.getTarget().z);
        followFov = frame.fov;
        if (Number.isFinite(followFov) && Math.abs(camera.fov - followFov) > 0.01) {
          camera.fov = followFov;
          camera.updateProjectionMatrix();
        }
      } else if (followEnabled) {
        target.lerp(followTarget, 1 - Math.pow(1 - followStrength, frames));
        updateOrbit();
        lastApplied.copy(camera.position);
      }
    },
    applyOrbitDelta(dTheta, dPhi) {
      targetPose = null;
      if (headingFollow) {
        headingRig.addManualYaw(-dTheta);
        headingRig.addPitchOffset(-dPhi);
        headingRig.apply(camera);
        lastApplied.copy(camera.position);
        theta = headingRig.getAzimuth();
        return;
      }
      theta -= dTheta;
      phi = Math.max(0.48, Math.min(1.34, phi - dPhi));
      updateOrbit();
    },
    getTarget() { return target; },
    dispose() {
      disposers.forEach((dispose) => dispose());
      disposers.length = 0;
      isDragging = false;
    },
  };
}
