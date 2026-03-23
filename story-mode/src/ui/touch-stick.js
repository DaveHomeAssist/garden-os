function applyStyles(element, styles) {
  Object.assign(element.style, styles);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createTouchStick() {
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchCapable = (navigator.maxTouchPoints ?? 0) > 0 || coarsePointer;

  const root = document.createElement('div');
  root.className = 'touch-stick';
  applyStyles(root, {
    position: 'absolute',
    left: '18px',
    bottom: 'calc(118px + env(safe-area-inset-bottom, 0px))',
    width: '112px',
    height: '132px',
    display: touchCapable ? 'flex' : 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: '14',
    pointerEvents: 'none',
    userSelect: 'none',
    touchAction: 'none',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
  });

  const ring = document.createElement('div');
  applyStyles(ring, {
    width: '104px',
    height: '104px',
    borderRadius: '999px',
    border: '1px solid rgba(247,242,234,0.14)',
    background: 'radial-gradient(circle at 30% 30%, rgba(247,242,234,0.12), rgba(30,17,10,0.45))',
    boxShadow: 'inset 0 0 0 1px rgba(232,200,74,0.08)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    pointerEvents: 'auto',
    touchAction: 'none',
  });

  const knob = document.createElement('div');
  applyStyles(knob, {
    width: '40px',
    height: '40px',
    borderRadius: '999px',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'linear-gradient(180deg, rgba(232,200,74,0.85), rgba(184,143,61,0.9))',
    boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
    border: '1px solid rgba(255,244,210,0.42)',
  });

  const label = document.createElement('div');
  label.textContent = 'Move';
  applyStyles(label, {
    fontFamily: '"DM Mono", monospace',
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(247,242,234,0.62)',
    padding: '3px 10px',
    borderRadius: '999px',
    background: 'rgba(30,17,10,0.62)',
    border: '1px solid rgba(247,242,234,0.08)',
  });

  ring.appendChild(knob);
  root.append(ring, label);

  let activePointerId = null;
  let enabled = false;
  let vector = { x: 0, y: 0 };
  const maxRadius = 32;

  function syncKnob() {
    knob.style.transform = `translate(calc(-50% + ${vector.x * maxRadius}px), calc(-50% + ${vector.y * maxRadius}px))`;
  }

  function reset() {
    activePointerId = null;
    vector = { x: 0, y: 0 };
    syncKnob();
  }

  function updateVector(event) {
    const rect = ring.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(maxRadius, length);
    vector = {
      x: clamp(dx / length, -1, 1) * (clamped / maxRadius),
      y: clamp(dy / length, -1, 1) * (clamped / maxRadius),
    };
    syncKnob();
  }

  function onPointerDown(event) {
    if (!enabled || activePointerId !== null) return;
    activePointerId = event.pointerId;
    ring.setPointerCapture?.(event.pointerId);
    updateVector(event);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!enabled || event.pointerId !== activePointerId) return;
    updateVector(event);
    event.preventDefault();
  }

  function onPointerEnd(event) {
    if (event.pointerId !== activePointerId) return;
    reset();
  }

  ring.addEventListener('pointerdown', onPointerDown);
  ring.addEventListener('pointermove', onPointerMove);
  ring.addEventListener('pointerup', onPointerEnd);
  ring.addEventListener('pointercancel', onPointerEnd);

  return {
    mount(parent) {
      if (!touchCapable || !parent || root.parentNode === parent) return;
      parent.appendChild(root);
    },
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled) && touchCapable;
      root.style.pointerEvents = enabled ? 'auto' : 'none';
      root.style.opacity = enabled ? '1' : '0';
      root.style.transform = enabled ? 'translateY(0)' : 'translateY(8px)';
      if (!enabled) reset();
    },
    getVector() {
      return { x: vector.x, y: vector.y, active: activePointerId !== null };
    },
    dispose() {
      reset();
      ring.removeEventListener('pointerdown', onPointerDown);
      ring.removeEventListener('pointermove', onPointerMove);
      ring.removeEventListener('pointerup', onPointerEnd);
      ring.removeEventListener('pointercancel', onPointerEnd);
      root.remove();
    },
  };
}
