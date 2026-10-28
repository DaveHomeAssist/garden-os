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
// A touch that barely moves and lifts quickly is a tap, not an orbit drag.
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_MS = 450;

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
  let down = null;

  // The overlay covers the right 60% of the screen and used to swallow every
  // tap there (village tap-to-move on phones did nothing). Forward a tap to
  // whatever sits underneath, as if the overlay were not there.
  function forwardTap(e) {
    const doc = overlay.ownerDocument;
    const prev = overlay.style.pointerEvents;
    overlay.style.pointerEvents = 'none';
    const target = doc.elementFromPoint?.(e.clientX, e.clientY);
    overlay.style.pointerEvents = prev;
    if (!target || target === overlay || overlay.contains(target)) return;
    const view = doc.defaultView;
    const init = {
      bubbles: true, cancelable: true, composed: true, clientX: e.clientX, clientY: e.clientY,
      screenX: e.screenX, screenY: e.screenY, button: 0, buttons: 0,
      pointerId: e.pointerId, pointerType: 'touch', isPrimary: true,
    };
    const PointerCtor = view?.PointerEvent ?? view?.MouseEvent;
    target.dispatchEvent(new PointerCtor('pointerdown', { ...init, buttons: 1 }));
    target.dispatchEvent(new PointerCtor('pointerup', init));
    target.dispatchEvent(new view.MouseEvent('click', init));
  }

  function onPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    if (activeId !== null) return;
    activeId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    overlay.setPointerCapture?.(e.pointerId);
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
    const start = down;
    down = null;
    if (e.type !== 'pointerup' || !start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_MAX_MOVE_PX) return;
    if (performance.now() - start.t > TAP_MAX_MS) return;
    forwardTap(e);
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
