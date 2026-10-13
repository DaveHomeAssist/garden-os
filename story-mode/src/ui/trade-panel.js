import '../../assets/css/hud-market.css';

import { getItemDef, getInventoryItemCount } from '../game/inventory.js';
import { MarketSystem } from '../game/market.js';
import { getMarketOffer, getTraderDays } from '../data/market-schedule.js';
import { AUTHORITY_MARKET_ITEMS } from '../server/authority-market.js';

// Market trade sheet. Built with DOM nodes and textContent only: item labels,
// trader names, and messages can come from content packs, so no markup string
// is parsed here. Every trade shows a preview and commits only on Confirm.

function el(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  Object.entries(attrs ?? {}).forEach(([key, value]) => {
    if (value === false || value == null) return;
    node.setAttribute(key, value === true ? '' : String(value));
  });
  children.filter(Boolean).forEach((child) => node.appendChild(child));
  return node;
}

function itemLabel(itemId) {
  return getItemDef(itemId)?.name ?? AUTHORITY_MARKET_ITEMS[itemId]?.label ?? itemId;
}

function describeQuote(quote, balance) {
  if (!quote.ok) return quote.message;
  if (quote.kind === 'buy') {
    return `Buy ${quote.count} ${itemLabel(quote.itemId)} for ${quote.cost} credits. Balance after: ${balance - quote.cost}.`;
  }
  if (quote.kind === 'sell') {
    return `Sell ${quote.count} ${itemLabel(quote.itemId)} for ${quote.revenue} credits. Balance after: ${balance + quote.revenue}.`;
  }
  return `Trade ${quote.count} ${itemLabel(quote.itemId)} for ${quote.wantCount} ${itemLabel(quote.wantItemId)}.`;
}

export function buildPriceHistoryRows(priceHistory = []) {
  const seasons = priceHistory.map((entry) => entry.season);
  const itemIds = [...new Set(priceHistory.flatMap((entry) => Object.keys(entry.prices ?? {})))];
  return {
    seasons,
    rows: itemIds.map((itemId) => ({
      itemId,
      label: itemLabel(itemId),
      buys: priceHistory.map((entry) => entry.prices?.[itemId]?.buy ?? null),
    })),
  };
}

export function createTradePanel(container, { zoneId = 'market_square', now = () => Date.now() } = {}) {
  let sheet = null;
  let market = null;
  let currentStore = null;
  let currentShopData = null;
  let pending = null;
  let isOpen = false;
  let restoreFocus = null;

  function close() {
    if (!sheet) return;
    const closing = sheet;
    closing.classList.remove('is-open');
    setTimeout(() => closing.remove(), 220);
    sheet = null;
    pending = null;
    isOpen = false;
    if (restoreFocus?.focus) restoreFocus.focus();
    restoreFocus = null;
  }

  function stage(kind, itemId, count, wantItemId) {
    const quote = market.quote(kind, itemId, count, wantItemId);
    pending = { kind, itemId, count, wantItemId, quote };
    rerender();
  }

  function commit() {
    if (!pending?.quote?.ok) return;
    const { kind, itemId, count, wantItemId } = pending;
    pending = null;
    const result = market.trade(kind, itemId, count, wantItemId);
    rerender(result.success ? 'Trade recorded.' : (result.reason ?? 'Trade failed.'));
  }

  function renderHeader(state, offer) {
    const balance = state.campaign?.currency?.balance ?? 0;
    const close = el('button', { className: 'palette-dismiss', text: '×', attrs: { type: 'button', 'aria-label': 'Close trade panel', 'data-close': 'true' } });
    close.addEventListener('click', () => closeSheet());
    return el('div', { className: 'trade-panel__header' }, [
      el('div', {}, [
        el('div', { className: 'trade-panel__title', text: currentShopData?.name ?? 'Market Trade' }),
        el('div', { className: 'trade-panel__meta', text: `Balance ${balance} · ${offer.season} · ${offer.dayName}` }),
      ]),
      close,
    ]);
  }

  function closeSheet() {
    close();
  }

  function renderTraders(offer) {
    if (!offer.traders.length) {
      return el('p', {
        className: 'trade-panel__note',
        text: offer.baseStock.length
          ? 'No traders at their stalls today. The exchange still sells staples, buys, and barters.'
          : 'No traders here today. Selling and barter are still open.',
      });
    }
    return el('ul', { className: 'trade-panel__traders' }, offer.traders.map((trader) => {
      const days = getTraderDays(trader.traderId, offer.zoneId, offer.season);
      return el('li', {}, [
        el('strong', { text: trader.name }),
        el('span', { text: ` brought ${trader.stock.map(itemLabel).join(', ')}` }),
        days.length ? el('span', { className: 'trade-panel__days', text: ` · here ${days.join(', ')}` }) : null,
      ]);
    }));
  }

  function actionButton(label, onClick, disabled = false) {
    const button = el('button', { className: 'trade-panel__btn', text: label, attrs: { type: 'button', disabled } });
    button.addEventListener('click', onClick);
    return button;
  }

  function renderBuy(state, table, offer) {
    const balance = state.campaign?.currency?.balance ?? 0;
    const rows = offer.buyable.filter((itemId) => table.prices[itemId]).map((itemId) => {
      const price = table.prices[itemId];
      return el('li', { className: 'trade-panel__row' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__item', text: itemLabel(itemId) }),
          el('div', { className: 'trade-panel__meta', text: `${price.buy} credits · own ${getInventoryItemCount(state.campaign.inventory, itemId)}` }),
        ]),
        actionButton('Buy', () => stage('buy', itemId, 1), balance < price.buy),
      ]);
    });
    return el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Buy' } }, [
      el('h3', { className: 'trade-panel__heading', text: 'Buy' }),
      rows.length ? el('ul', { className: 'trade-panel__list' }, rows) : el('p', { className: 'trade-panel__note', text: 'Nothing for sale here right now.' }),
    ]);
  }

  function renderSellAndBarter(state, table) {
    const owned = Object.keys(table.prices).filter((itemId) => getInventoryItemCount(state.campaign.inventory, itemId) > 0);
    const rows = owned.map((itemId) => {
      const price = table.prices[itemId];
      const ownedCount = getInventoryItemCount(state.campaign.inventory, itemId);
      const select = el('select', { className: 'trade-panel__select', attrs: { 'aria-label': `Barter ${itemLabel(itemId)} for` } },
        Object.keys(table.prices).filter((wantId) => wantId !== itemId).map((wantId) => (
          el('option', { text: itemLabel(wantId), attrs: { value: wantId } })
        )));
      const countInput = el('input', {
        className: 'trade-panel__count',
        attrs: { type: 'number', min: 1, max: ownedCount, value: Math.min(ownedCount, 1), 'aria-label': `How many ${itemLabel(itemId)} to offer` },
      });
      const offerCount = () => Math.max(1, Math.min(ownedCount, Math.floor(Number(countInput.value) || 1)));
      return el('li', { className: 'trade-panel__row trade-panel__row--stack' }, [
        el('div', {}, [
          el('div', { className: 'trade-panel__item', text: itemLabel(itemId) }),
          el('div', { className: 'trade-panel__meta', text: `sells for ${price.sell} · barter value ${price.barterValue} · own ${ownedCount}` }),
        ]),
        el('div', { className: 'trade-panel__controls' }, [
          actionButton('Sell 1', () => stage('sell', itemId, 1), price.sell <= 0),
          countInput,
          select,
          actionButton('Barter', () => stage('barter', itemId, offerCount(), select.value)),
        ]),
      ]);
    });
    return el('section', { className: 'trade-panel__section', attrs: { 'aria-label': 'Sell and barter' } }, [
      el('h3', { className: 'trade-panel__heading', text: 'Sell and barter' }),
      rows.length ? el('ul', { className: 'trade-panel__list' }, rows) : el('p', { className: 'trade-panel__note', text: 'You are not carrying anything the market trades in.' }),
    ]);
  }

  function renderPreview(state) {
    if (!pending) return null;
    const balance = state.campaign?.currency?.balance ?? 0;
    const confirm = actionButton('Confirm', commit, !pending.quote.ok);
    const cancel = actionButton('Cancel', () => { pending = null; rerender(); });
    return el('div', { className: `trade-panel__preview${pending.quote.ok ? '' : ' is-blocked'}`, attrs: { role: 'group', 'aria-label': 'Trade preview' } }, [
      el('p', { text: describeQuote(pending.quote, balance) }),
      el('div', { className: 'trade-panel__controls' }, [confirm, cancel]),
    ]);
  }

  function renderHistory(state) {
    const history = buildPriceHistoryRows(state.campaign?.market?.priceHistory ?? []);
    if (!history.seasons.length) return null;
    const head = el('tr', {}, [el('th', { text: 'Item', attrs: { scope: 'col' } }), ...history.seasons.map((season) => el('th', { text: season, attrs: { scope: 'col' } }))]);
    const body = history.rows.map((row) => el('tr', {}, [
      el('th', { text: row.label, attrs: { scope: 'row' } }),
      ...row.buys.map((buy) => el('td', { text: buy ?? '·' })),
    ]));
    return el('details', { className: 'trade-panel__section trade-panel__history' }, [
      el('summary', { text: `Price history · last ${history.seasons.length} season${history.seasons.length === 1 ? '' : 's'}` }),
      el('div', { className: 'trade-panel__table-wrap' }, [
        el('table', { className: 'trade-panel__table' }, [el('thead', {}, [head]), el('tbody', {}, body)]),
      ]),
    ]);
  }

  function rerender(message = '') {
    if (!sheet || !currentStore || !market) return;
    const state = currentStore.getState();
    const table = market.getPriceTable(state.season?.season);
    const offer = getMarketOffer(state, zoneId, { now: now() });
    const fresh = state;
    sheet.replaceChildren(
      el('div', { className: 'panel-handle' }),
      renderHeader(fresh, offer),
      renderTraders(offer),
      el('p', { className: 'trade-panel__message', text: message, attrs: { role: 'status', 'aria-live': 'polite' } }),
      renderPreview(fresh) ?? el('span'),
      renderBuy(fresh, table, offer),
      renderSellAndBarter(fresh, table),
      renderHistory(fresh) ?? el('span'),
    );
    if (pending) sheet.querySelector('.trade-panel__preview button')?.focus();
  }

  function open(shopData, store) {
    currentStore = store;
    currentShopData = shopData ?? {};
    market = new MarketSystem(store, { now });
    isOpen = true;
    restoreFocus = typeof document !== 'undefined' ? document.activeElement : null;
    sheet = el('div', { className: 'panel-sheet is-open trade-panel', attrs: { id: 'trade-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': currentShopData?.name ?? 'Market trade' } });
    sheet.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    });
    container?.appendChild(sheet);
    market.recordSeasonPrices();
    rerender();
    sheet.querySelector('button')?.focus();
  }

  return {
    open,
    close,
    isOpen: () => isOpen,
    dispose: close,
  };
}
