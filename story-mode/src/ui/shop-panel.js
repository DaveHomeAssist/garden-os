/**
 * Shop Panel — modal overlay for the Market Square shop.
 * Players can buy seeds, tools, and recipes with harvest tokens.
 */
import { getCropsForChapter, getRecipes } from '../data/crops.js';
import { getSeedItemId, getItemDef } from '../game/inventory.js';

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
      data-shop-tab="${tabId}"
      style="
        border:none;
        border-radius:999px;
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
        padding:10px 12px;
        border-radius:10px;
        background:rgba(247,242,234,0.04);
        border:1px solid rgba(247,242,234,0.08);
      "
    >
      <span style="font-size:24px;flex-shrink:0;">${escapeHtml(item.icon)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Fraunces',serif;font-size:14px;color:#f7f2ea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
        <div style="font-size:11px;color:rgba(247,242,234,0.5);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.description ?? '')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-family:'DM Mono',monospace;font-size:12px;color:${canAfford ? '#e8c84a' : '#d2654d'};">${item.price}🪙</span>
        <button
          type="button"
          data-buy-item="${escapeHtml(item.itemId)}"
          data-buy-price="${item.price}"
          ${item.isRecipe ? 'data-buy-recipe="true"' : ''}
          ${canAfford ? '' : 'disabled'}
          style="
            border:none;
            border-radius:999px;
            padding:6px 12px;
            font-size:12px;
            font-weight:700;
            cursor:${canAfford ? 'pointer' : 'not-allowed'};
            background:${canAfford ? '#5aab6b' : 'rgba(247,242,234,0.08)'};
            color:${canAfford ? '#1a120c' : 'rgba(247,242,234,0.35)'};
          "
        >Buy</button>
      </div>
    </div>
  `;
}

export function createShopPanel(container) {
  let sheet = null;
  let activeTab = 'seeds';
  let currentStore = null;
  let currentShopData = null;
  let _isOpen = false;

  function getTokens() {
    return currentStore?.getState?.()?.campaign?.tokens ?? 0;
  }

  function getChapter() {
    return currentShopData?.chapter
      ?? currentStore?.getState?.()?.campaign?.currentChapter
      ?? 1;
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
          padding:4px 8px;
          line-height:1;
        ">&times;</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        ${renderTabButton('seeds', activeTab, 'Seeds')}
        ${renderTabButton('tools', activeTab, 'Tools')}
        ${renderTabButton('recipes', activeTab, 'Recipes')}
      </div>

      <div id="shop-items" style="display:grid;gap:8px;max-height:50vh;overflow-y:auto;">
        ${listings.length
          ? listings.map((item) => renderItemCard(item, tokens)).join('')
          : '<div style="font-size:13px;color:rgba(247,242,234,0.48);padding:16px 0;">No items available in this category.</div>'
        }
      </div>
    `;

    // Bind tab buttons
    sheet.querySelectorAll('[data-shop-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.shopTab;
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

    // Deduct tokens
    currentStore.dispatch({ type: 'SET_TOKENS', payload: { tokens: tokens - price } });

    // Add item to inventory (recipes are added as quest_items)
    if (isRecipe) {
      currentStore.dispatch({
        type: 'ADD_ITEM',
        payload: { itemId: `recipe_${itemId}`, count: 1 },
      });
    } else {
      currentStore.dispatch({
        type: 'ADD_ITEM',
        payload: { itemId, count: 1 },
      });
    }

    rerender();
  }

  function open(shopData, store) {
    currentStore = store;
    currentShopData = shopData ?? {};
    activeTab = 'seeds';
    _isOpen = true;

    sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'shop-panel';
    sheet.style.cssText = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      max-width:min(92vw,420px);
      max-height:82vh;
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
    rerender();
  }

  function close() {
    _isOpen = false;
    const backdrop = container.querySelector('#shop-backdrop');
    if (backdrop) backdrop.remove();
    if (sheet) {
      sheet.remove();
      sheet = null;
    }
    currentStore = null;
    currentShopData = null;
  }

  function isOpen() {
    return _isOpen;
  }

  function dispose() {
    close();
  }

  return { open, close, isOpen, dispose };
}
