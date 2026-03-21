/**
 * Camera Controller — orbit + pinch-zoom for mobile, preset poses.
 */
import * as THREE from 'three';

const POSES = {
  overview: { position: [0, 5.6, 6.4], target: [0, 0, -0.2] },
  closeup:  { position: [0, 3, 2.8], target: [0, 0, -0.1] },
  side:     { position: [5, 4, 1.2], target: [0, 0, -0.1] },
  birds:    { position: [0, 10, -0.2], target: [0, 0, -0.2] },
};

export function createCameraController(camera, domElement) {
  const target = new THREE.Vector3(0, 0, -0.2);
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let theta = 0;
  let phi = Math.PI / 3.3;
  let radius = 7.6;
  let targetPose = null;
  let lerpSpeed = 0.08;

  function updateOrbit() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  // Touch/mouse orbit
  domElement.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (e.pointerType === 'mouse' && e.button === 0) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  domElement.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    theta -= dx * 0.005;
    phi = Math.max(0.2, Math.min(Math.PI / 2.2, phi - dy * 0.005));
    targetPose = null;
    updateOrbit();
  });

  domElement.addEventListener('pointerup', () => { isDragging = false; });
  domElement.addEventListener('pointercancel', () => { isDragging = false; });

  // Pinch zoom
  let pinchDist = 0;
  domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: true });

  domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = pinchDist - dist;
      radius = Math.max(3, Math.min(15, radius + delta * 0.02));
      pinchDist = dist;
      targetPose = null;
      updateOrbit();
    }
  }, { passive: true });

  // Mouse wheel zoom
  domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    radius = Math.max(3, Math.min(15, radius + e.deltaY * 0.01));
    targetPose = null;
    updateOrbit();
  }, { passive: false });

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
    update() {
      if (targetPose) {
        camera.position.lerp(targetPose.position, lerpSpeed);
        target.lerp(targetPose.target, lerpSpeed);
        camera.lookAt(target);

        if (camera.position.distanceTo(targetPose.position) < 0.01) {
          targetPose = null;
        }
      }
    },
    getTarget() { return target; },
  };
}
