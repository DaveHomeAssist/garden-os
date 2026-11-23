/**
 * Shop Panel — modal overlay for the village seed stand (and the Market
 * Square shop). Players buy seeds, tools, and recipes with their coins:
 * the same campaign.currency.balance the market uses (village-economy.js).
 * In Free Play the seed stand also has a Sell tab for pantry crops.
 */
import { getCropById, getCropsForChapter, getRecipes } from '../data/crops.js';
import { getSeedItemId, getItemDef, getInventoryItemCount } from '../game/inventory.js';
import { getCropSellPrice, getCurrencyBalance, quotePantrySale } from '../game/village/village-economy.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TOOL_LISTINGS = [
  { itemId: 'watering_can', price: 20 },
  { itemId: 'pruning_shears', price: 15 },
  { itemId: 'soil_scanner', price: 25 },
  { itemId: 'smart_watering_can', price: 40 },
];

function getSeedListings(chapter) {
  const crops = getCropsForChapter(chapter);
  return crops.map((crop) => {
    const itemId = getSeedItemId(crop.id);
    const def = getItemDef(itemId);
    return {
      itemId,
      name: def.name,
      icon: crop.emoji ?? def.icon ?? '🌱',
      price: (crop.chapterUnlock ?? 1) * 5,
      description: def.description ?? `Seeds for ${crop.name}.`,
    };
  });
}

function getToolListings() {
  return TOOL_LISTINGS.map((entry) => {
    const def = getItemDef(entry.itemId);
    return {
      itemId: entry.itemId,
      name: def.name,
      icon: def.icon ?? '🛠️',
      price: entry.price,
      description: def.description ?? 'A useful tool.',
    };
  });
}

function getRecipeListings() {
  const recipes = getRecipes();
  return Object.entries(recipes).map(([recipeId, recipe]) => {
    const ingredientCount = Array.isArray(recipe.crops) ? recipe.crops.length : 0;
    return {
      itemId: recipeId,
      name: recipe.name,
      icon: '📜',
      price: ingredientCount * 10,
      description: `Ingredients: ${(recipe.crops ?? []).join(', ')}`,
      isRecipe: true,
    };
  });
}


function getSellListings(campaign) {
  if (!campaign?.sandbox) return [];
  const pantry = campaign.pantry ?? {};
  return Object.entries(pantry)
    .filter(([, count]) => count > 0)
    .map(([cropId, count]) => {
      const crop = getCropById(cropId);
      const unitPrice = getCropSellPrice(cropId);
      return {
        cropId,
        name: crop?.name ?? cropId,
        icon: crop?.emoji ?? '🥬',
        count,
        unitPrice,
        description: `In the pantry: ${count}. The stand pays ${unitPrice} coins each.`,
      };
    })
    .filter((item) => item.unitPrice > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderTabButton(tabId, activeTab, label) {
  const active = tabId === activeTab;
  return `
    <button
      type="button"
      class="shop-tab"
      data-shop-tab="${tabId}"
      aria-pressed="${active ? 'true' : 'false'}"
      style="
        border:none;
        border-radius:999px;
        min-height:44px;
        padding:8px 14px;
        font-size:12px;
        font-family:'DM Mono',monospace;
        letter-spacing:0.08em;
        text-transform:uppercase;
        cursor:pointer;
        color:${active ? '#1a120c' : 'rgba(247,242,234,0.72)'};
        background:${active ? '#e8c84a' : 'rgba(247,242,234,0.06)'};
      "
    >${label}</button>
  `;
}

function renderItemCard(item, tokens) {
  const canAfford = tokens >= item.price;
  return `
    <div
      class="shop-item-card"
      style="
        display:flex;
        align-items:center;
        gap:12px;
        min-width:0;
        padding:10px 12px;
        border-radius:10px;
        background:rgba(247,242,234,0.04);
        border:1px solid rgba(247,242,234,0.08);
      "
    >
      <span style="font-size:24px;flex-shrink:0;">${escapeHtml(item.icon)}</span>
      <div style="flex:1;min-width:0;">
        <div class="shop-item__name" style="font-family:'Fraunces',serif;font-size:14px;color:#f7f2ea;white-space:normal;overflow-wrap:anywhere;line-height:1.25;">${escapeHtml(item.name)}</div>
        <div class="shop-item__desc" style="font-size:12px;color:rgba(247,242,234,0.74);margin-top:2px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;">${escapeHtml(item.description ?? '')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="shop-item__price" style="font-family:'DM Mono',monospace;font-size:13px;color:${canAfford ? '#e8c84a' : '#ef9877'};">${item.price}<span aria-hidden="true">🪙</span><span class="sr-only"> coins</span></span>
        <button
          type="button"
          class="shop-buy-btn"
          data-buy-item="${escapeHtml(item.itemId)}"
          aria-label="Buy ${escapeHtml(item.name)}, ${item.price} coins"
          data-buy-price="${item.price}"
          ${item.isRecipe ? 'data-buy-recipe="true"' : ''}
          ${canAfford ? '' : 'disabled'}
          style="
            border:none;
            border-radius:999px;
            min-width:56px;
            min-height:44px;
            padding:6px 14px;
            font-size:13px;
            font-weight:700;
            cursor:${canAfford ? 'pointer' : 'not-allowed'};
            background:${canAfford ? '#5aab6b' : 'rgba(247,242,234,0.08)'};
            color:${canAfford ? '#1a120c' : 'rgba(247,242,234,0.6)'};
          "
        >Buy</button>
      </div>
    </div>
  `;
}


function renderSellCard(item) {
  const sellOneLabel = `Sell 1 ${item.name} for ${item.unitPrice} coins`;
  const sellAllLabel = `Sell all ${item.count} ${item.name} for ${item.unitPrice * item.count} coins`;
  const btnStyle = `
            border:none;
            border-radius:999px;
            min-width:56px;
            min-height:44px;
            padding:6px 14px;
            font-size:13px;
            font-weight:700;
            cursor:pointer;
            background:#5aab6b;
            color:#1a120c;
          `;
  return `
    <div
      class="shop-item-card"
      style="
        display:flex;
        align-items:center;
        gap:12px;
        min-width:0;
        padding:10px 12px;
        border-radius:10px;
        background:rgba(247,242,234,0.04);
        border:1px solid rgba(247,242,234,0.08);
      "
    >
      <span style="font-size:24px;flex-shrink:0;">${escapeHtml(item.icon)}</span>
      <div style="flex:1;min-width:0;">
        <div class="shop-item__name" style="font-family:'Fraunces',serif;font-size:14px;color:#f7f2ea;white-space:normal;overflow-wrap:anywhere;line-height:1.25;">${escapeHtml(item.name)} · ${item.count}</div>
        <div class="shop-item__desc" style="font-size:12px;color:rgba(247,242,234,0.74);margin-top:2px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;">${escapeHtml(item.description ?? '')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        <span class="shop-item__price" style="font-family:'DM Mono',monospace;font-size:13px;color:#e8c84a;">${item.unitPrice}<span aria-hidden="true">🪙</span><span class="sr-only"> coins each</span></span>
        <button
          type="button"
          class="shop-sell-btn"
          data-sell-crop="${escapeHtml(item.cropId)}"
          data-sell-count="1"
          aria-label="${escapeHtml(sellOneLabel)}"
          style="${btnStyle}"
        >Sell 1</button>
        ${item.count > 1 ? `<button
          type="button"
          class="shop-sell-btn"
          data-sell-crop="${escapeHtml(item.cropId)}"
          data-sell-count="${item.count}"
          aria-label="${escapeHtml(sellAllLabel)}"
          style="${btnStyle}"
        >Sell all</button>` : ''}
      </div>
    </div>
  `;
}

const SHOP_TABS = [['seeds', 'Seeds'], ['tools', 'Tools'], ['recipes', 'Recipes']];

export function createShopPanel(container) {
  let sheet = null;
  let activeTab = 'seeds';
  let currentStore = null;
  let currentShopData = null;
  let _isOpen = false;
  let lastMessage = '';
  let keyHandler = null;

  function getTokens() {
    return getCurrencyBalance(currentStore?.getState?.()?.campaign);
  }

  function getChapter() {
    return currentShopData?.chapter
      ?? currentStore?.getState?.()?.campaign?.currentChapter
      ?? 1;
  }

  // shopData.tabs limits which tabs show (e.g. the village seed box shows
  // only Seeds); shopData.tab picks the opening tab. Default: all, Seeds.
  function isSandbox() {
    return Boolean(currentStore?.getState?.()?.campaign?.sandbox);
  }

  function getVisibleTabs() {
    const allowed = Array.isArray(currentShopData?.tabs) && currentShopData.tabs.length
      ? currentShopData.tabs
      : null;
    const tabs = SHOP_TABS.filter(([tabId]) => !allowed || allowed.includes(tabId));
    // The village seed stand (default tabs) grows a Sell tab in Free Play.
    if (isSandbox() && !allowed) tabs.push(['sell', 'Sell']);
    else if (isSandbox() && allowed?.includes('sell') && !tabs.some(([id]) => id === 'sell')) {
      tabs.push(['sell', 'Sell']);
    }
    return tabs;
  }

  function getListingsForTab(tab) {
    switch (tab) {
      case 'seeds': return getSeedListings(getChapter());
      case 'tools': return getToolListings();
      case 'recipes': return getRecipeListings();
      case 'sell': return getSellListings(currentStore?.getState?.()?.campaign);
      default: return [];
    }
  }

  function rerender() {
    if (!sheet) return;
    const tokens = getTokens();
    const listings = getListingsForTab(activeTab);
    const shopName = currentShopData?.name ?? 'Market Shop';

    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div class="palette-title" style="font-family:'Fraunces',serif;font-size:20px;color:#f7f2ea;">${escapeHtml(shopName)}</div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:#e8c84a;margin-top:4px;">
            Balance: ${tokens} 🪙
          </div>
        </div>
        <button type="button" class="palette-dismiss" id="shop-dismiss" aria-label="Close shop" style="
          border:none;
          background:none;
          color:#f7f2ea;
          font-size:24px;
          cursor:pointer;
          min-width:44px;
          min-height:44px;
          padding:4px 8px;
          line-height:1;
        ">&times;</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        ${getVisibleTabs().map(([tabId, label]) => renderTabButton(tabId, activeTab, label)).join('')}
      </div>

      <div id="shop-items" style="display:grid;grid-template-columns:minmax(0,1fr);gap:8px;max-height:50vh;overflow-y:auto;">
        ${listings.length
          ? listings.map((item) => (activeTab === 'sell' ? renderSellCard(item) : renderItemCard(item, tokens))).join('')
          : `<div style="font-size:13px;color:rgba(247,242,234,0.48);padding:16px 0;">${
            activeTab === 'sell'
              ? 'Harvest a crop in the yard, then sell it here for coins.'
              : 'No items available in this category.'
          }</div>`
        }
      </div>
      <div data-shop-message role="status" aria-live="polite" style="font-size:12px;color:rgba(247,242,234,0.72);margin-top:10px;min-height:16px;">${escapeHtml(lastMessage)}</div>
    `;

    // Bind tab buttons
    sheet.querySelectorAll('[data-shop-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.shopTab;
        lastMessage = '';
        rerender();
      });
    });

    // Bind close button
    sheet.querySelector('#shop-dismiss')?.addEventListener('click', () => {
      close();
    });

    // Bind buy buttons
    sheet.querySelectorAll('[data-buy-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.buyItem;
        const price = Number(btn.dataset.buyPrice);
        const isRecipe = btn.dataset.buyRecipe === 'true';
        handleBuy(itemId, price, isRecipe);
      });
    });

    sheet.querySelectorAll('[data-sell-crop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        handleSell(btn.dataset.sellCrop, Number(btn.dataset.sellCount));
      });
    });
  }

  function handleBuy(itemId, price, isRecipe) {
    if (!currentStore) return;
    const tokens = getTokens();
    if (tokens < price) return;
    // Recipes go in the backpack as recipe cards.
    const inventoryItemId = isRecipe ? `recipe_${itemId}` : itemId;
    const countOf = () => getInventoryItemCount(currentStore.getState()?.campaign?.inventory, inventoryItemId);
    const before = countOf();
    // One atomic action: coins out and item in together, or nothing changes.
    currentStore.dispatch({
      type: 'VILLAGE_SHOP_BUY',
      payload: { itemId: inventoryItemId, price, count: 1 },
    });
    const bought = countOf() > before;
    const name = getItemDef(inventoryItemId)?.name ?? inventoryItemId;
    lastMessage = bought ? `Bought ${name}. It's in your backpack.` : 'Your backpack is full.';
    if (bought) currentShopData?.onBuy?.({ itemId: inventoryItemId, price });
    rerender();
  }

  function handleSell(cropId, count) {
    if (!currentStore) return;
    const quote = quotePantrySale(currentStore.getState()?.campaign, cropId, count);
    if (!quote.ok) {
      lastMessage = quote.message ?? 'Could not sell that.';
      rerender();
      return;
    }
    const haveBefore = currentStore.getState()?.campaign?.pantry?.[cropId] ?? 0;
    currentStore.dispatch({
      type: 'VILLAGE_SHOP_SELL',
      payload: { cropId, count: quote.count },
    });
    const haveAfter = currentStore.getState()?.campaign?.pantry?.[cropId] ?? 0;
    const sold = haveAfter === haveBefore - quote.count;
    const name = getCropById(cropId)?.name ?? cropId;
    if (sold) {
      lastMessage = quote.count === 1
        ? `Sold 1 ${name} for ${quote.revenue} coins.`
        : `Sold ${quote.count} ${name} for ${quote.revenue} coins.`;
      currentShopData?.onSell?.({ cropId, count: quote.count, revenue: quote.revenue });
    } else {
      lastMessage = 'Could not sell that.';
    }
    rerender();
  }

  function open(shopData, store) {
    currentStore = store;
    currentShopData = shopData ?? {};
    const visibleTabs = getVisibleTabs().map(([tabId]) => tabId);
    activeTab = visibleTabs.includes(currentShopData.tab) ? currentShopData.tab : (visibleTabs[0] ?? 'seeds');
    _isOpen = true;
    lastMessage = '';

    sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'shop-panel';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', currentShopData.name ?? 'Market Shop');
    sheet.style.cssText = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      box-sizing:border-box;
      width:min(92vw,420px);
      max-width:min(92vw,420px);
      max-height:82vh;
      max-height:82dvh;
      overflow:auto;
      z-index:900;
      background:#3a2516;
      border:1px solid rgba(247,242,234,0.12);
      border-radius:12px;
      padding:20px;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
    `;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'shop-backdrop';
    backdrop.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.5);
      z-index:899;
    `;
    backdrop.addEventListener('click', () => close());

    container.appendChild(backdrop);
    container.appendChild(sheet);
    // Esc closes the shop (and only the shop). Before, Esc fell through to
    // the game's pause binding and opened the pause menu under the sheet.
    if (keyHandler) globalThis.document?.removeEventListener('keydown', keyHandler, true);
    keyHandler = (event) => {
      if (event.key !== 'Escape') return;
      if (!sheet?.isConnected) { close(); return; }
      event.preventDefault();
      event.stopImmediatePropagation?.();
      close();
    };
    globalThis.document?.addEventListener('keydown', keyHandler, true);
    rerender();
  }

  function close() {
    const wasOpen = _isOpen;
    const onClose = currentShopData?.onClose;
    _isOpen = false;
    if (keyHandler) globalThis.document?.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
    const backdrop = container.querySelector('#shop-backdrop');
    if (backdrop) backdrop.remove();
    if (sheet) {
      sheet.remove();
      sheet = null;
    }
    currentStore = null;
    currentShopData = null;
    if (wasOpen && typeof onClose === 'function') onClose();
  }

  function isOpen() {
    return _isOpen;
  }

  function dispose() {
    close();
  }

  return { open, close, isOpen, dispose };
}
