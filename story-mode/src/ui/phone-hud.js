// Phone HUD declutter (fix/phone-hud-declutter, Nov 2026).
//
// On phones (portrait up to 430px wide, and landscape phones) the crop
// counter, the quest tracker and the 🦗 bug-report button were three more
// boxes stacked over the scene. They fold into one small status chip in the
// top-right corner: it reads "🌱 3/32" (plus "📜 1" with active quests) and a
// tap opens the full counter, the quest list and the bug button under it.
// The CSS that hides / shows them lives in phone-hud.css; larger screens never
// see the chip (display: none outside the phone media query).

export const PHONE_HUD_QUERY = '(max-width: 430px) and (orientation: portrait), (orientation: landscape) and (max-height: 500px)';

const OPEN_ATTR = 'phoneStatus';

/** Text for the chip: "🌱 3/32", plus "· 📜 1" while quests are active. */
export function buildStatusChipText({ crops = '', quests = null } = {}) {
  const cropText = String(crops).replace(/\s+/g, '');
  const parts = [`🌱 ${cropText || '–'}`];
  if (Number.isFinite(quests) && quests > 0) parts.push(`📜 ${quests}`);
  return parts.join(' · ');
}

export function buildStatusChipLabel({ crops = '', quests = null, open = false } = {}) {
  const [planted, total] = String(crops).split('/').map((s) => s.trim());
  const bits = [planted && total ? `${planted} of ${total} squares planted` : 'Garden status'];
  if (Number.isFinite(quests) && quests > 0) bits.push(`${quests} active quest${quests === 1 ? '' : 's'}`);
  return `${bits.join(', ')}. ${open ? 'Hide' : 'Show'} details and bug report`;
}

function readQuestCount(doc) {
  const tracker = doc.querySelector('.quest-tracker');
  if (!tracker || tracker.hidden) return null;
  const m = tracker.querySelector('.quest-tracker__count')?.textContent?.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Mounts the chip into the HUD's right rail (so it follows the HUD's
 * hidden / inert state) and keeps it in step with #hud-crops and the tracker.
 */
export function mountPhoneStatusChip({ doc = globalThis.document, signal } = {}) {
  if (!doc) return null;
  const rail = doc.querySelector('#hud .hud-right');
  const crops = doc.getElementById('hud-crops');
  if (!rail || !crops) return null;
  doc.getElementById('hud-status-chip')?.remove();
  const chip = doc.createElement('button');
  chip.type = 'button';
  chip.id = 'hud-status-chip';
  chip.className = 'hud-status-chip';
  chip.setAttribute('aria-expanded', 'false');
  rail.insertBefore(chip, rail.firstChild);

  const isOpen = () => doc.body.dataset[OPEN_ATTR] === 'open';
  const render = () => {
    const state = { crops: crops.textContent, quests: readQuestCount(doc), open: isOpen() };
    const text = buildStatusChipText(state);
    if (chip.textContent !== text) chip.textContent = text;
    chip.setAttribute('aria-label', buildStatusChipLabel(state));
    chip.setAttribute('aria-expanded', state.open ? 'true' : 'false');
  };
  const setOpen = (open) => {
    if (open) doc.body.dataset[OPEN_ATTR] = 'open';
    else delete doc.body.dataset[OPEN_ATTR];
    render();
  };
  const opts = signal ? { signal } : undefined;
  chip.addEventListener('click', (event) => { event.stopPropagation(); setOpen(!isOpen()); }, opts);
  // A tap anywhere else (the scene, the stick, a FAB) folds it away again;
  // taps inside the opened tracker / bug button keep it open.
  doc.addEventListener('pointerdown', (event) => {
    if (!isOpen()) return;
    const t = event.target;
    if (t?.closest?.('#hud-status-chip, .quest-tracker, #fab-bug, #bug-panel')) return;
    setOpen(false);
  }, opts);
  doc.getElementById('fab-bug')?.addEventListener('click', () => setOpen(false), opts);

  const MO = globalThis.MutationObserver;
  if (MO) {
    const mo = new MO(render);
    mo.observe(crops, { childList: true, characterData: true, subtree: true });
    mo.observe(doc.body, { childList: true });
    // The tracker re-renders its innerHTML; watch it once it exists.
    let trackerObserved = null;
    const watchTracker = () => {
      const tracker = doc.querySelector('.quest-tracker');
      if (tracker && tracker !== trackerObserved) {
        trackerObserved = tracker;
        mo.observe(tracker, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
      }
    };
    const bodyMo = new MO(() => { watchTracker(); render(); });
    bodyMo.observe(doc.body, { childList: true });
    watchTracker();
    signal?.addEventListener?.('abort', () => { mo.disconnect(); bodyMo.disconnect(); });
  }
  render();
  return { element: chip, render, setOpen, isOpen };
}
