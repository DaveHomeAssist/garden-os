/**
 * Touch Controls — coordinates virtual joystick (left 40%) and camera
 * orbit (right 60%) for mobile devices.
 *
 * The joystick itself lives in ui/touch-stick.js and is already wired
 * into getMovementVector(). This module adds the camera-orbit overlay
 * so single-finger drags on the right side of the screen orbit the
 * camera, while the left side stays reserved for the joystick.
 *
 * Two-finger pinch zoom is handled by camera-controller.js directly.
 */

const JOYSTICK_ZONE = 0.4; // left 40% of viewport
const ORBIT_SENSITIVITY = 0.005;

export function createTouchControls(container, { onOrbitDelta } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'touch-orbit-zone';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: `${(1 - JOYSTICK_ZONE) * 100}%`,
    height: '100%',
    zIndex: '12',
    pointerEvents: 'none', // pass-through by default
    touchAction: 'none',
  });
  container.appendChild(overlay);

  let activeId = null;
  let lastX = 0;
  let lastY = 0;

  function onPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    if (activeId !== null) return;
    activeId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    overlay.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerId !== activeId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    onOrbitDelta?.(dx * ORBIT_SENSITIVITY, dy * ORBIT_SENSITIVITY);
    e.preventDefault();
  }

  function onPointerEnd(e) {
    if (e.pointerId !== activeId) return;
    activeId = null;
  }

  overlay.style.pointerEvents = 'auto';
  overlay.addEventListener('pointerdown', onPointerDown);
  overlay.addEventListener('pointermove', onPointerMove);
  overlay.addEventListener('pointerup', onPointerEnd);
  overlay.addEventListener('pointercancel', onPointerEnd);

  // Only show the overlay on touch-capable devices
  const touchCapable =
    (navigator.maxTouchPoints ?? 0) > 0 ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);

  if (!touchCapable) {
    overlay.style.display = 'none';
  }

  return {
    /** Expose for symmetry — movement vector comes from touch-stick.js */
    getVector() {
      return { x: 0, z: 0 };
    },
    dispose() {
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('pointerup', onPointerEnd);
      overlay.removeEventListener('pointercancel', onPointerEnd);
      overlay.remove();
    },
  };
}
