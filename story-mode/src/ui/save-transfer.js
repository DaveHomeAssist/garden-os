/**
 * Save file UI: download a save file, pick one to import, and the modal that
 * confirms which slot an import replaces. Shared by the title screen and the
 * pause menu.
 *
 * Every listener here sits on elements this module creates and removes
 * (the dialog, the hidden file input), never on document/window or static
 * index.html nodes, so nothing outlives the dialog. Callers inside a game
 * session also pass the bindUI session `signal`; aborting it closes any open
 * dialog and drops its listeners.
 */
import {
  describeSlotsForImport,
  importSaveRecord,
  parseSaveFile,
  saveFileName,
  stringifySaveFile,
} from '../game/save-file.js';

const SEASON_LABEL = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  const ms = Date.parse(value ?? '');
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString() : 'unknown date';
}

/**
 * Trigger a browser download of a save file. Returns the file name, or null if
 * the browser refused (e.g. no Blob support).
 */
export function downloadSaveFile(file, { slot = null, now = new Date(), doc = document } = {}) {
  if (!file) return null;
  const name = saveFileName(now, { slot });
  try {
    const blob = new Blob([stringifySaveFile(file)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    link.style.display = 'none';
    doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  } catch (error) {
    console.warn('[GOS] Save download failed:', error?.message ?? error);
    return null;
  }
}

/** Open the OS file picker for a .json save. Resolves with the File, or null if cancelled. */
// Browsers without the file input `cancel` event never tell us the picker was
// dismissed, so a newer pick (or dialog) settles the older one instead of
// leaving it pending forever.
let settleActivePick = null;
let closeActiveModal = null;

export function pickSaveFile({ signal, doc = document } = {}) {
  settleActivePick?.(null);
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    input.setAttribute('aria-hidden', 'true');
    const local = new AbortController();
    let settled = false;
    const finish = (file) => {
      if (settled) return;
      settled = true;
      if (settleActivePick === finish) settleActivePick = null;
      local.abort();
      input.remove();
      resolve(file ?? null);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { signal: local.signal });
    input.addEventListener('cancel', () => finish(null), { signal: local.signal });
    signal?.addEventListener('abort', () => finish(null), { signal: local.signal });
    settleActivePick = finish;
    doc.body.appendChild(input);
    input.click();
  });
}

async function readFileText(file) {
  if (typeof file?.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file);
  });
}

function focusableIn(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && !el.closest('[hidden]'))
    // A radio group is one tab stop: only its checked radio takes focus.
    .filter((el) => el.type !== 'radio' || el.checked);
}

/**
 * Generic modal shell. `render(body, close)` fills it. Escape and the Cancel
 * button close it; Tab is kept inside; focus returns to `launcher`.
 */
function openModal({ title, role = 'dialog', launcher = null, signal, doc = document, render, onClose = null }) {
  closeActiveModal?.();
  doc.querySelector('.save-transfer-overlay')?.remove();
  const overlay = doc.createElement('div');
  overlay.className = 'save-transfer-overlay';
  const titleId = `save-transfer-title-${Math.random().toString(36).slice(2, 8)}`;
  overlay.innerHTML = `
    <div class="save-transfer-dialog" role="${role}" aria-modal="true" aria-labelledby="${titleId}">
      <div class="save-transfer-dialog__title" id="${titleId}">${escapeHtml(title)}</div>
      <div class="save-transfer-dialog__body"></div>
    </div>`;
  const dialog = overlay.querySelector('.save-transfer-dialog');
  const body = overlay.querySelector('.save-transfer-dialog__body');
  const local = new AbortController();
  const opts = { signal: local.signal };
  let closed = false;

  function close(result = null) {
    if (closed) return;
    closed = true;
    if (closeActiveModal === dismiss) closeActiveModal = null;
    local.abort();
    overlay.remove();
    if (launcher && launcher.isConnected && typeof launcher.focus === 'function') launcher.focus();
    onClose?.(result);
  }

  overlay.addEventListener('keydown', (event) => {
    // Keep keys inside the dialog: the game listens on document.
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close(null);
      return;
    }
    if (event.key === 'Tab') {
      const items = focusableIn(dialog);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }, opts);
  overlay.addEventListener('keyup', (event) => event.stopPropagation(), opts);
  overlay.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target === overlay) close(null);
  }, opts);
  signal?.addEventListener('abort', () => close(null), opts);

  const dismiss = () => close(null);
  closeActiveModal = dismiss;
  render(body, close, opts);
  doc.body.appendChild(overlay);
  const autofocus = dialog.querySelector('[data-autofocus]') ?? focusableIn(dialog)[0];
  autofocus?.focus();

  if (signal?.aborted) close(null);
  return { element: overlay, close };
}

/** Show a save-file error the player has to acknowledge. Resolves when dismissed. */
export function showSaveFileError(message, { launcher = null, signal, doc = document } = {}) {
  return new Promise((resolve) => {
    openModal({
      onClose: () => resolve(),
      title: "Couldn't import save",
      role: 'alertdialog',
      launcher,
      signal,
      doc,
      render(body, close, opts) {
        body.innerHTML = `
          <p class="save-transfer-dialog__error" role="alert">${escapeHtml(message)}</p>
          <p class="save-transfer-dialog__note">Your current saves were not changed.</p>
          <div class="save-transfer-dialog__actions">
            <button type="button" class="save-slot-btn save-slot-btn--primary" data-autofocus data-role="ok">OK</button>
          </div>`;
        body.querySelector('[data-role="ok"]').addEventListener('click', () => close(null), opts);
      },
    });
  });
}

function slotLabel(slotInfo) {
  if (!slotInfo) return '';
  if (slotInfo.isCorrupt) return `Slot ${slotInfo.slot + 1} · unreadable save`;
  if (slotInfo.isEmpty) return `Slot ${slotInfo.slot + 1} · empty`;
  return `Slot ${slotInfo.slot + 1} · ${slotInfo.gardenerName ?? 'Gardener'}, Chapter ${slotInfo.chapter ?? '?'}`;
}

function recordLabel(record) {
  const { summary } = record;
  const from = record.sourceSlot != null ? `Slot ${record.sourceSlot + 1}: ` : '';
  return `${from}${summary.gardenerName}, Chapter ${summary.chapter} (${SEASON_LABEL[summary.season] ?? summary.season}) · last played ${formatDate(summary.updatedAt)}`;
}

/**
 * The import confirmation dialog. With `fixedSlot` set (pause menu) the target
 * is that slot; otherwise the player picks one. Replacing an occupied slot is
 * spelled out on the confirm button. Resolves with { record, slot } or null.
 */
export function openImportDialog(parsed, {
  slots = describeSlotsForImport(),
  fixedSlot = null,
  launcher = null,
  signal,
  doc = document,
} = {}) {
  return new Promise((resolve) => {
    const records = parsed.records;
    let recordIndex = 0;
    const defaultTarget = () => {
      if (Number.isInteger(fixedSlot)) return fixedSlot;
      const source = records[recordIndex].sourceSlot;
      if (source != null && slots[source]?.isEmpty) return source;
      return slots.find((info) => info.isEmpty)?.slot ?? source ?? 0;
    };
    let target = defaultTarget();

    openModal({
      onClose: (result) => resolve(result),
      title: 'Import Save',
      launcher,
      signal,
      doc,
      render(body, close, opts) {
        const legacyNote = parsed.legacy
          ? '<p class="save-transfer-dialog__note">Older backup format (no checksum). It will be upgraded as it is imported.</p>'
          : '';
        const recordChoices = records.length > 1
          ? `<fieldset class="save-transfer-dialog__group">
              <legend>Save to import</legend>
              ${records.map((record, index) => `
                <label class="save-transfer-dialog__choice">
                  <input type="radio" name="save-transfer-record" value="${index}" ${index === 0 ? 'checked data-autofocus' : ''}>
                  <span>${escapeHtml(recordLabel(record))}</span>
                </label>`).join('')}
            </fieldset>`
          : `<p class="save-transfer-dialog__summary">${escapeHtml(recordLabel(records[0]))}</p>`;
        const targetChoices = Number.isInteger(fixedSlot)
          ? ''
          : `<fieldset class="save-transfer-dialog__group">
              <legend>Import into</legend>
              ${slots.map((info) => `
                <label class="save-transfer-dialog__choice">
                  <input type="radio" name="save-transfer-target" value="${info.slot}" ${info.slot === target ? 'checked' : ''} ${records.length > 1 ? '' : (info.slot === target ? 'data-autofocus' : '')}>
                  <span>${escapeHtml(slotLabel(info))}</span>
                </label>`).join('')}
            </fieldset>`;
        body.innerHTML = `
          <p class="save-transfer-dialog__note">From a file exported ${escapeHtml(formatDate(parsed.exportedAt))}.</p>
          ${legacyNote}
          ${recordChoices}
          ${targetChoices}
          <p class="save-transfer-dialog__warning" data-role="warning" aria-live="polite"></p>
          <div class="save-transfer-dialog__actions">
            <button type="button" class="save-slot-btn" data-role="cancel">Cancel</button>
            <button type="button" class="save-slot-btn save-slot-btn--primary" data-role="confirm"></button>
          </div>`;

        const warning = body.querySelector('[data-role="warning"]');
        const confirmBtn = body.querySelector('[data-role="confirm"]');
        function sync() {
          const info = slots.find((entry) => entry.slot === target);
          const occupied = info && !info.isEmpty;
          confirmBtn.textContent = occupied ? `Replace Slot ${target + 1}` : `Import to Slot ${target + 1}`;
          confirmBtn.classList.toggle('save-slot-btn--danger', Boolean(occupied));
          confirmBtn.classList.toggle('save-slot-btn--primary', !occupied);
          warning.textContent = occupied
            ? `${slotLabel(info)} will be overwritten. That progress is lost unless you exported it first.`
            : '';
        }
        body.addEventListener('change', (event) => {
          if (event.target.name === 'save-transfer-record') {
            recordIndex = Number(event.target.value);
            if (!Number.isInteger(fixedSlot)) {
              target = defaultTarget();
              const radio = body.querySelector(`input[name="save-transfer-target"][value="${target}"]`);
              if (radio) radio.checked = true;
            }
          }
          if (event.target.name === 'save-transfer-target') {
            target = Number(event.target.value);
          }
          sync();
        }, opts);
        body.querySelector('[data-role="cancel"]').addEventListener('click', () => close(null), opts);
        confirmBtn.addEventListener('click', () => close({ record: records[recordIndex], slot: target }), opts);
        if (Number.isInteger(fixedSlot) && records.length <= 1) confirmBtn.setAttribute('data-autofocus', '');
        sync();
      },
    });
  });
}

/**
 * Full import flow: pick a file, validate + migrate it, confirm the target slot,
 * write it. Resolves with { ok: true, slot, campaign } on success, or
 * { ok: false, cancelled } / { ok: false, error } otherwise (errors are already
 * shown to the player).
 */
export async function runImportFlow({
  fixedSlot = null,
  slots,
  launcher = null,
  signal,
  doc = document,
  pickFile = pickSaveFile,
} = {}) {
  const file = await pickFile({ signal, doc });
  if (!file || signal?.aborted) return { ok: false, cancelled: true };
  let text;
  try {
    text = await readFileText(file);
  } catch {
    await showSaveFileError("Couldn't read that file.", { launcher, signal, doc });
    return { ok: false, error: 'read-failed' };
  }
  const parsed = parseSaveFile(text);
  if (!parsed.ok) {
    await showSaveFileError(parsed.error, { launcher, signal, doc });
    return { ok: false, error: parsed.code };
  }
  // `slots` may be a (possibly async) getter so callers can read slot state
  // after the picker: the picker itself must open within the click's user
  // activation, before any await.
  const slotInfo = typeof slots === 'function' ? await slots() : (slots ?? describeSlotsForImport());
  if (signal?.aborted) return { ok: false, cancelled: true };
  const choice = await openImportDialog(parsed, {
    slots: slotInfo, fixedSlot, launcher, signal, doc,
  });
  if (!choice) return { ok: false, cancelled: true };
  const written = importSaveRecord(choice.record, choice.slot);
  if (!written.ok) {
    await showSaveFileError(written.error, { launcher, signal, doc });
    return { ok: false, error: 'write-failed' };
  }
  return { ok: true, slot: choice.slot, campaign: written.campaign };
}
