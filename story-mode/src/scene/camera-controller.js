/**
 * Camera Controller — orbit + pinch-zoom for mobile, preset poses.
 */
import * as THREE from 'three';

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

    theta -= dx * 0.005;
    phi = Math.max(0.48, Math.min(1.34, phi - dy * 0.005));
    targetPose = null;
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
      radius = Math.max(4.4, Math.min(11.5, radius + delta * 0.02));
      pinchDist = dist;
      targetPose = null;
      updateOrbit();
    }
  };
  listen('touchmove', onTouchMove, { passive: true });

  // Mouse wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    radius = Math.max(4.4, Math.min(11.5, radius + e.deltaY * 0.01));
    targetPose = null;
    updateOrbit();
  };
  listen('wheel', onWheel, { passive: false });

  updateOrbit();

  return {
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
      followTarget.copy(nextTarget);
      if (typeof options.strength === 'number') {
        followStrength = options.strength;
      }
      followEnabled = options.enabled ?? true;
    },
    clearFollowTarget() {
      followEnabled = false;
    },
    update() {
      if (targetPose) {
        camera.position.lerp(targetPose.position, lerpSpeed);
        target.lerp(targetPose.target, lerpSpeed);
        camera.lookAt(target);

        if (camera.position.distanceTo(targetPose.position) < 0.01) {
          targetPose = null;
        }
      } else if (followEnabled) {
        target.lerp(followTarget, followStrength);
        updateOrbit();
      }
    },
    applyOrbitDelta(dTheta, dPhi) {
      theta -= dTheta;
      phi = Math.max(0.48, Math.min(1.34, phi - dPhi));
      targetPose = null;
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
