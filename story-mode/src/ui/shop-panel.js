/**
 * Shop Panel — modal overlay for the Market Square shop.
 * Players buy seeds, tools, and recipes with their coins: the same
 * campaign.currency.balance the market uses (village-economy.js).
 */
import { getCropsForChapter, getRecipes } from '../data/crops.js';
import { getSeedItemId, getItemDef, getInventoryItemCount } from '../game/inventory.js';
import { getCurrencyBalance } from '../game/village/village-economy.js';

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

function renderTabButton(tabId, activeTab, label) {
  const active = tabId === activeTab;
  return `
    <button
      type="button"
      class="shop-tab${active ? ' is-active' : ''}"
      data-shop-tab="${tabId}"
      aria-pressed="${active ? 'true' : 'false'}"
    >${label}</button>
  `;
}

function renderItemCard(item, tokens) {
  const canAfford = tokens >= item.price;
  return `
    <div class="shop-item-card${canAfford ? '' : ' is-unaffordable'}">
      <span class="shop-item-card__icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
      <div class="shop-item-card__text">
        <div class="shop-item-card__name">${escapeHtml(item.name)}</div>
        <div class="shop-item-card__desc">${escapeHtml(item.description ?? '')}</div>
      </div>
      <div class="shop-item-card__buy">
        <span class="shop-item-card__price">${item.price}🪙</span>
        <button
          type="button"
          class="shop-buy-btn"
          data-buy-item="${escapeHtml(item.itemId)}"
          data-buy-price="${item.price}"
          ${item.isRecipe ? 'data-buy-recipe="true"' : ''}
          ${canAfford ? '' : 'disabled'}
        >Buy</button>
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
  function getVisibleTabs() {
    const allowed = Array.isArray(currentShopData?.tabs) && currentShopData.tabs.length
      ? currentShopData.tabs
      : null;
    return SHOP_TABS.filter(([tabId]) => !allowed || allowed.includes(tabId));
  }

  function getListingsForTab(tab) {
    switch (tab) {
      case 'seeds': return getSeedListings(getChapter());
      case 'tools': return getToolListings();
      case 'recipes': return getRecipeListings();
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
      <div class="palette-header shop-panel__header">
        <div>
          <div class="palette-title shop-panel__title">${escapeHtml(shopName)}</div>
          <div class="shop-panel__balance">Balance: ${tokens} 🪙</div>
        </div>
        <button type="button" class="palette-dismiss shop-panel__close" id="shop-dismiss" aria-label="Close shop">&times;</button>
      </div>

      <div class="shop-panel__tabs" role="group" aria-label="Shop sections">
        ${getVisibleTabs().map(([tabId, label]) => renderTabButton(tabId, activeTab, label)).join('')}
      </div>

      <div id="shop-items" class="shop-panel__items">
        ${listings.length
          ? listings.map((item) => renderItemCard(item, tokens)).join('')
          : '<div class="shop-panel__empty">No items available in this category.</div>'
        }
      </div>
      <div data-shop-message class="shop-panel__message${lastMessage ? ' has-message' : ''}" role="status" aria-live="polite">${escapeHtml(lastMessage)}</div>
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

  function open(shopData, store) {
    currentStore = store;
    currentShopData = shopData ?? {};
    const visibleTabs = getVisibleTabs().map(([tabId]) => tabId);
    activeTab = visibleTabs.includes(currentShopData.tab) ? currentShopData.tab : (visibleTabs[0] ?? 'seeds');
    _isOpen = true;
    lastMessage = '';

    sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open shop-panel';
    sheet.id = 'shop-panel';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'shop-backdrop';
    backdrop.className = 'shop-backdrop';
    backdrop.addEventListener('click', () => close());

    container.appendChild(backdrop);
    container.appendChild(sheet);
    rerender();
  }

  function close() {
    const wasOpen = _isOpen;
    const onClose = currentShopData?.onClose;
    _isOpen = false;
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
