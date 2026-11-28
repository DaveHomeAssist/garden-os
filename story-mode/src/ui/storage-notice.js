/**
 * Quiet one-time notice shown when browser storage is blocked (H2) and saves
 * fall back to memory for the current tab. Text only; no markup from outside.
 */
const NOTICE_ID = 'gos-storage-notice';
const NOTICE_TEXT = 'This browser is blocking saved data here, so progress lasts until you close this tab. Open Garden OS directly to keep your saves.';

export function showStorageFallbackNotice({ doc = globalThis.document, durationMs = 8000 } = {}) {
  if (!doc?.body || doc.getElementById(NOTICE_ID)) return null;
  const notice = doc.createElement('div');
  notice.id = NOTICE_ID;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.className = 'gos-storage-notice';
  notice.textContent = NOTICE_TEXT;
  Object.assign(notice.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    transform: 'translateX(-50%)',
    maxWidth: 'min(92vw, 420px)',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'rgba(20, 24, 18, 0.88)',
    color: '#f7f2ea',
    font: "13px/1.4 'DM Sans', sans-serif",
    textAlign: 'center',
    zIndex: '9000',
    pointerEvents: 'none',
  });
  doc.body.appendChild(notice);
  if (durationMs > 0) {
    setTimeout(() => notice.remove(), durationMs);
  }
  return notice;
}

export { NOTICE_ID as STORAGE_NOTICE_ID, NOTICE_TEXT as STORAGE_NOTICE_TEXT };
