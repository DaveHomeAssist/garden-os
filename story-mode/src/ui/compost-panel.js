/**
 * Compost panel — the village compost bin (Free Play). Same sheet style as
 * the shop panel. Rules live in game/village/compost.js (crafting recipe).
 */
import {
  COMPOST_ITEM_ID,
  depositForCompost,
  getCompostableItems,
  getCompostBatchesAvailable,
} from '../game/village/compost.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buttonStyle(enabled) {
  return `
    border:none;
    border-radius:999px;
    padding:8px 14px;
    font-size:12px;
    font-weight:700;
    cursor:${enabled ? 'pointer' : 'not-allowed'};
    background:${enabled ? '#5aab6b' : 'rgba(247,242,234,0.08)'};
    color:${enabled ? '#1a120c' : 'rgba(247,242,234,0.35)'};
  `;
}

// Shown while the bin cannot make a batch, so an empty bin is not a dead end.
export const COMPOST_SCRAPS_HINT = 'Scraps come from your garden: each harvest leaves plant matter, and each season end leaves dried leaves.';

export function createCompostPanel(container) {
  let sheet = null;
  let backdrop = null;
  let deps = null;
  let onCloseCb = null;
  let lastMessage = '';
  let keyHandler = null;

  function rerender() {
    if (!sheet || !deps) return;
    const { craftingSystem, inventory } = deps;
    const items = getCompostableItems(craftingSystem, inventory);
    const batches = getCompostBatchesAvailable(craftingSystem, inventory);
    const compost = inventory.getItemCount(COMPOST_ITEM_ID);
    const fillPct = Math.min(100, Math.round((batches / 5) * 100));

    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div class="palette-title" style="font-family:'Fraunces',serif;font-size:20px;color:#f7f2ea;">Compost bin</div>
          <div data-compost-total style="font-family:'DM Mono',monospace;font-size:12px;color:#e8c84a;margin-top:4px;">
            Compost: ${compost} ♻️
          </div>
        </div>
        <button type="button" class="palette-dismiss" id="compost-dismiss" aria-label="Close compost bin" style="
          border:none;background:none;color:#f7f2ea;font-size:24px;cursor:pointer;padding:4px 8px;line-height:1;
        ">&times;</button>
      </div>

      <div style="font-size:12px;color:rgba(247,242,234,0.6);margin-bottom:10px;">Add scraps to make compost. Use compost on your bed.</div>

      <div id="compost-items" style="display:grid;gap:8px;margin-bottom:12px;">
        ${items.map((item) => `
          <div class="compost-item" data-compost-item="${escapeHtml(item.itemId)}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
            <span style="font-size:24px;flex-shrink:0;">${escapeHtml(item.icon)}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Fraunces',serif;font-size:14px;color:#f7f2ea;">${escapeHtml(item.name)}</div>
              <div style="font-size:11px;color:rgba(247,242,234,0.5);margin-top:2px;">${item.perBatch} per batch</div>
            </div>
            <span data-compost-have style="font-family:'DM Mono',monospace;font-size:12px;color:${item.have >= item.perBatch ? '#e8c84a' : '#d2654d'};">${item.have}</span>
          </div>
        `).join('')}
      </div>

      ${batches === 0 ? `<div data-compost-hint style="font-size:12px;color:#e8c84a;margin-bottom:10px;">${escapeHtml(COMPOST_SCRAPS_HINT)}</div>` : ''}

      <div aria-label="Bin fill" style="height:6px;border-radius:999px;background:rgba(247,242,234,0.08);margin-bottom:12px;overflow:hidden;">
        <div data-compost-fill style="height:100%;width:${fillPct}%;background:#5aab6b;"></div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button type="button" data-compost-make="1" ${batches > 0 ? '' : 'disabled'} style="${buttonStyle(batches > 0)}">Add scraps</button>
        <button type="button" data-compost-make="all" ${batches > 1 ? '' : 'disabled'} style="${buttonStyle(batches > 1)}">Add all (${batches})</button>
      </div>
      <div data-compost-message role="status" aria-live="polite" style="font-size:12px;color:rgba(247,242,234,0.7);margin-top:10px;min-height:16px;">${escapeHtml(lastMessage)}</div>
    `;

    sheet.querySelector('#compost-dismiss')?.addEventListener('click', () => close());
    sheet.querySelectorAll('[data-compost-make]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.compostMake;
        const result = depositForCompost(craftingSystem, inventory, { count: raw === 'all' ? 'all' : 1 });
        lastMessage = result.message;
        deps.onDeposit?.(result);
        rerender();
      });
    });
  }

  function open({ craftingSystem, inventory, onClose, onDeposit } = {}) {
    if (sheet) close({ silent: true });
    if (!craftingSystem || !inventory) throw new Error('createCompostPanel.open: craftingSystem and inventory are required');
    deps = { craftingSystem, inventory, onDeposit };
    onCloseCb = onClose ?? null;
    lastMessage = '';

    backdrop = document.createElement('div');
    backdrop.id = 'compost-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:899;';
    backdrop.addEventListener('click', () => close());

    sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'compost-panel';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Compost bin');
    sheet.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      max-width:min(92vw,420px);max-height:82vh;overflow:auto;z-index:900;
      background:#3a2516;border:1px solid rgba(247,242,234,0.12);border-radius:12px;
      padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.6);
    `;
    container.appendChild(backdrop);
    container.appendChild(sheet);

    keyHandler = (event) => {
      if (event.key !== 'Escape') return;
      if (!sheet?.isConnected) {
        // Our DOM was torn down without close(): drop the listener, don't eat Esc.
        close({ silent: true });
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation?.();
      close();
    };
    globalThis.document?.addEventListener('keydown', keyHandler, true);
    rerender();
    sheet.querySelector('[data-compost-make]:not([disabled])')?.focus?.();
  }

  function close({ silent = false } = {}) {
    if (keyHandler) globalThis.document?.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
    backdrop?.remove();
    sheet?.remove();
    const wasOpen = Boolean(sheet);
    backdrop = null;
    sheet = null;
    deps = null;
    const cb = onCloseCb;
    onCloseCb = null;
    if (wasOpen && !silent) cb?.();
  }

  return {
    open,
    close,
    isOpen: () => Boolean(sheet),
    dispose: () => close({ silent: true }),
  };
}
