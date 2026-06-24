import { getItemDef, getInventoryItemCount } from '../game/inventory.js';
import { MarketSystem } from '../game/market.js';
import { getScheduledTradersForState } from '../data/market-schedule.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderListing(item, balance, inventory) {
  const def = getItemDef(item.itemId);
  const owned = getInventoryItemCount(inventory, item.itemId);
  const canBuy = balance >= item.buy;
  const canSell = owned > 0;
  return `
    <article class="read-only-sheet__card">
      <div class="read-only-sheet__card-top">
        <div>
          <div class="read-only-sheet__card-title">${escapeHtml(def.name ?? item.label)}</div>
          <div class="read-only-sheet__card-meta">Buy ${item.buy} · Sell ${item.sell} · Owned ${owned}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          <button type="button" data-trade-action="buy" data-item-id="${escapeHtml(item.itemId)}" ${canBuy ? '' : 'disabled'}>Buy</button>
          <button type="button" data-trade-action="sell" data-item-id="${escapeHtml(item.itemId)}" ${canSell ? '' : 'disabled'}>Sell</button>
          <button type="button" data-trade-action="barter" data-item-id="${escapeHtml(item.itemId)}" ${canSell ? '' : 'disabled'}>Barter</button>
        </div>
      </div>
    </article>
  `;
}

export function createTradePanel(container) {
  let sheet = null;
  let market = null;
  let currentStore = null;
  let currentShopData = null;
  let isOpen = false;

  function close() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    setTimeout(() => sheet?.remove(), 220);
    sheet = null;
    isOpen = false;
  }

  function rerender(message = '') {
    if (!sheet || !currentStore || !market) return;
    const state = currentStore.getState();
    const table = market.recordSeasonPrices(state.season?.season);
    const listings = Object.values(table.prices);
    const balance = state.campaign?.currency?.balance ?? 0;
    const traders = getScheduledTradersForState(state, 'market_square');
    const shopName = currentShopData?.name ?? 'Market Trade';

    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div class="palette-title" style="font-family:'Fraunces',serif;font-size:20px;color:#f7f2ea;">${escapeHtml(shopName)}</div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:#e8c84a;margin-top:4px;">
            Balance: ${balance} · ${escapeHtml(state.season?.season ?? 'spring')}
          </div>
          <div style="font-size:12px;color:rgba(247,242,234,0.58);margin-top:4px;">
            Traders: ${traders.length ? traders.map(escapeHtml).join(', ') : 'open market'}
          </div>
        </div>
        <button type="button" class="palette-dismiss" data-close="true" aria-label="Close trade panel">&times;</button>
      </div>
      ${message ? `<div class="read-only-sheet__empty" style="margin-bottom:10px;">${escapeHtml(message)}</div>` : ''}
      <div class="read-only-sheet__list" style="max-height:50vh;overflow-y:auto;">
        ${listings.map((item) => renderListing(item, balance, state.campaign.inventory)).join('')}
      </div>
    `;

    sheet.querySelector('[data-close="true"]')?.addEventListener('click', close);
    sheet.querySelectorAll('[data-trade-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.tradeAction;
        const itemId = button.dataset.itemId;
        let result = null;
        if (action === 'buy') {
          result = market.buy(itemId, 1);
        } else if (action === 'sell') {
          result = market.sell(itemId, 1);
        } else if (action === 'barter') {
          result = market.barter(itemId, 'compost', 1);
        }
        rerender(result?.success ? 'Trade recorded.' : result?.reason ?? 'Trade failed.');
      });
    });
  }

  function open(shopData, store) {
    currentStore = store;
    currentShopData = shopData ?? {};
    market = new MarketSystem(store);
    isOpen = true;
    sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'trade-panel';
    sheet.style.cssText = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      max-width:min(92vw,520px);
      width:520px;
      z-index:20;
    `;
    container?.appendChild(sheet);
    rerender();
  }

  return {
    open,
    close,
    isOpen: () => isOpen,
    dispose: close,
  };
}
