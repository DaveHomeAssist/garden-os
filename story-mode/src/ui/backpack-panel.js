function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TAB_ORDER = ['inventory', 'crafting', 'keepsakes', 'pantry'];
const CATEGORY_TINTS = {
  seeds: 'rgba(90,171,107,0.16)',
  tools: 'rgba(147,108,67,0.18)',
  materials: 'rgba(146,150,156,0.16)',
  quest_items: 'rgba(232,200,74,0.18)',
  decor: 'rgba(176,120,180,0.16)',
};

function renderTabButton(tabId, activeTab, label) {
  const active = tabId === activeTab;
  return `
    <button
      type="button"
      data-tab="${tabId}"
      style="
        border:none;
        border-radius:999px;
        padding:7px 10px;
        font-size:11px;
        font-family:'DM Mono',monospace;
        letter-spacing:0.08em;
        text-transform:uppercase;
        cursor:pointer;
        color:${active ? '#1a120c' : 'rgba(247,242,234,0.72)'};
        background:${active ? '#e8c84a' : 'rgba(247,242,234,0.05)'};
      "
    >${label}</button>
  `;
}

function renderInventoryGrid(data, selectedSlotIndex) {
  const slots = data.inventory?.slots ?? [];
  return slots.map((slot, index) => {
    const selected = selectedSlotIndex === index;
    const tint = CATEGORY_TINTS[slot?.category] ?? 'rgba(247,242,234,0.03)';
    const border = selected ? '#e8c84a' : (slot ? 'rgba(247,242,234,0.12)' : 'rgba(247,242,234,0.1)');
    const badge = slot && slot.count > 1
      ? `<span style="position:absolute;right:4px;bottom:4px;font-family:'DM Mono',monospace;font-size:10px;color:#f7f2ea;">x${slot.count}</span>`
      : '';
    const durability = slot?.maxDurability
      ? `
        <span style="position:absolute;left:4px;right:4px;bottom:4px;height:3px;border-radius:999px;background:rgba(247,242,234,0.12);overflow:hidden;">
          <span style="
            display:block;
            width:${Math.max(0, Math.min(100, Math.round(((slot.durability ?? 0) / slot.maxDurability) * 100)))}%;
            height:100%;
            background:${(slot.durability ?? 0) <= 0 ? '#9ca0a6' : (slot.durability / slot.maxDurability <= 0.25 ? '#d2654d' : (slot.durability / slot.maxDurability <= 0.5 ? '#d9b85a' : '#7fbf7f'))};
          "></span>
        </span>
      `
      : '';
    return `
      <button
        type="button"
        data-slot-index="${index}"
        class="backpack-slot"
        ${slot ? `data-item-id="${slot.itemId}"` : ''}
        style="
          position:relative;
          width:40px;
          height:40px;
          border-radius:10px;
          border:2px ${slot ? 'solid' : 'dashed'} ${border};
          background:${slot ? tint : 'rgba(247,242,234,0.03)'};
          color:#f7f2ea;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:18px;
        "
        draggable="${slot ? 'true' : 'false'}"
        aria-label="${slot ? escapeHtml(slot.itemDef?.name ?? slot.itemId) : `Empty slot ${index + 1}`}"
      >
        ${slot ? escapeHtml(slot.itemDef?.icon ?? '📦') : ''}
        ${badge}
        ${durability}
      </button>
    `;
  }).join('');
}

function renderKeepsakes(data) {
  const unlockedMap = new Map((data.unlockedKeepsakes ?? []).map((entry) => [entry.id, entry]));
  return `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
      ${(data.keepsakeSlots ?? []).map((slot) => {
        const unlocked = unlockedMap.get(slot.id);
        return `
          <div style="padding:12px;border-radius:10px;background:${unlocked ? 'rgba(90,171,107,0.12)' : 'rgba(247,242,234,0.03)'};border:1px solid ${unlocked ? 'rgba(90,171,107,0.24)' : 'rgba(247,242,234,0.08)'};">
            <div style="font-family:'Fraunces',serif;font-size:15px;color:${unlocked ? '#f7f2ea' : 'rgba(247,242,234,0.42)'};">${escapeHtml(slot.name)}</div>
            <div style="font-size:12px;color:rgba(247,242,234,0.5);margin-top:4px;">${unlocked ? `Earned in Ch ${unlocked.chapter}` : 'Locked keepsake slot'}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPantry(data) {
  const pantryEntries = data.pantryEntries ?? [];
  const recipesCompleted = data.recipesCompleted ?? [];
  const seasonHistory = (data.seasonHistory ?? []).slice(-6).reverse();
  return `
    <section style="margin-bottom:14px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:8px;">Pantry</div>
      ${pantryEntries.length ? `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
          ${pantryEntries.map((entry) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.03);border:1px solid rgba(247,242,234,0.08);">
              <span style="font-size:13px;color:#f7f2ea;">${escapeHtml(entry.name)}</span>
              <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.55);">x${entry.count}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div style="font-size:13px;color:rgba(247,242,234,0.48);">Your pantry is still empty.</div>'}
    </section>
    <section style="margin-bottom:14px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:8px;">Recipes</div>
      ${recipesCompleted.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${recipesCompleted.map((recipe) => `<span style="padding:7px 10px;border-radius:999px;background:rgba(232,200,74,0.14);color:#f4dfa1;font-size:12px;">${escapeHtml(recipe.name)}</span>`).join('')}
        </div>
      ` : '<div style="font-size:13px;color:rgba(247,242,234,0.48);">No completed recipes yet.</div>'}
    </section>
    <section>
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:8px;">Season Trail</div>
      ${seasonHistory.length ? `
        <div style="display:grid;gap:8px;">
          ${seasonHistory.map((entry) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.03);border:1px solid rgba(247,242,234,0.08);">
              <span style="font-size:13px;color:#f7f2ea;">Ch ${entry.chapter} · ${escapeHtml(entry.season)}</span>
              <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.55);">${entry.score} · ${escapeHtml(entry.grade)}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div style="font-size:13px;color:rgba(247,242,234,0.48);">No completed chapters yet.</div>'}
    </section>
  `;
}

function renderCrafting(data) {
  const recipes = data.availableRecipes ?? [];
  const completed = new Set((data.recipesCompleted ?? []).map((recipe) => recipe.id));
  const unlockedCount = recipes.length;
  const totalRecipes = data.totalRecipes ?? unlockedCount;
  const craftingLevel = data.skills?.crafting?.level ?? 1;
  const craftingProgress = data.skills?.crafting?.percentage ?? 0;

  if (!recipes.length) {
    return `
      <section>
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:10px;">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:6px;">Crafting</div>
            <div style="font-family:'Fraunces',serif;font-size:17px;color:#f7f2ea;">Workbench Offline</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.58);">Crafting Lv ${craftingLevel}</div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.4);">${unlockedCount}/${totalRecipes} recipes unlocked</div>
          </div>
        </div>
        <div style="height:8px;border-radius:999px;background:rgba(247,242,234,0.08);overflow:hidden;margin-bottom:12px;">
          <div style="height:100%;width:${craftingProgress}%;background:linear-gradient(90deg,#7fbf7f,#e8c84a);"></div>
        </div>
        <div style="padding:14px;border-radius:12px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);font-size:13px;color:rgba(247,242,234,0.56);">
          No recipes are unlocked yet. Raise your crafting level or progress quests to open the workbench.
        </div>
      </section>
    `;
  }

  return `
    <section>
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:10px;">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:6px;">Crafting</div>
          <div style="font-family:'Fraunces',serif;font-size:17px;color:#f7f2ea;">Workbench</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.58);">Crafting Lv ${craftingLevel}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.4);">${unlockedCount}/${totalRecipes} recipes unlocked</div>
        </div>
      </div>
      <div style="height:8px;border-radius:999px;background:rgba(247,242,234,0.08);overflow:hidden;margin-bottom:14px;">
        <div style="height:100%;width:${craftingProgress}%;background:linear-gradient(90deg,#7fbf7f,#e8c84a);"></div>
      </div>
      <div style="display:grid;gap:10px;">
        ${recipes.map((recipe) => {
          const craftable = recipe.craftCheck?.craftable;
          const outputLabel = recipe.outputDef?.name ?? recipe.output?.itemId ?? 'Output';
          const outputIcon = recipe.outputDef?.icon ?? '🛠️';
          const materials = (recipe.materials ?? []).map((material) => {
            const missing = (recipe.craftCheck?.missing ?? []).find((entry) => entry.itemId === material.itemId);
            const have = missing ? missing.have : material.count;
            const need = missing ? missing.need : material.count;
            const ready = have >= need;
            return `
              <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:${ready ? 'rgba(247,242,234,0.72)' : '#e8b58d'};">
                <span>${escapeHtml(material.name ?? material.itemId)}</span>
                <span style="font-family:'DM Mono',monospace;">${have}/${need}</span>
              </div>
            `;
          }).join('');
          return `
            <article style="padding:12px;border-radius:12px;background:rgba(247,242,234,0.04);border:1px solid ${craftable ? 'rgba(127,191,127,0.2)' : 'rgba(247,242,234,0.08)'};">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                <div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:20px;">${escapeHtml(outputIcon)}</span>
                    <div style="font-family:'Fraunces',serif;font-size:16px;color:#f7f2ea;">${escapeHtml(recipe.name)}</div>
                    ${completed.has(recipe.id) ? '<span style="padding:3px 7px;border-radius:999px;background:rgba(127,191,127,0.18);color:#9dd59d;font-size:10px;font-family:\'DM Mono\',monospace;letter-spacing:0.08em;text-transform:uppercase;">made</span>' : ''}
                  </div>
                  <div style="font-size:12px;color:rgba(247,242,234,0.5);margin-top:4px;">${escapeHtml(recipe.description ?? outputLabel)}</div>
                </div>
                <div style="text-align:right;min-width:84px;">
                  <div style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.5);">Output</div>
                  <div style="font-size:13px;color:#f7f2ea;">${escapeHtml(outputLabel)}${recipe.output?.count > 1 ? ` x${recipe.output.count}` : ''}</div>
                </div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 8px;">
                <span style="padding:5px 8px;border-radius:999px;background:rgba(232,200,74,0.14);color:#f4dfa1;font-size:11px;">${escapeHtml(recipe.category ?? 'recipe')}</span>
                <span style="padding:5px 8px;border-radius:999px;background:rgba(247,242,234,0.06);color:rgba(247,242,234,0.66);font-size:11px;">Crafting ${recipe.skillRequirement?.crafting ?? 1}</span>
                <span style="padding:5px 8px;border-radius:999px;background:rgba(247,242,234,0.06);color:rgba(247,242,234,0.66);font-size:11px;">+${recipe.craftingXP ?? 0} XP</span>
              </div>
              <div style="display:grid;gap:4px;margin-bottom:10px;">
                ${materials}
              </div>
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                <div style="font-size:12px;color:${craftable ? '#9dd59d' : 'rgba(247,242,234,0.45)'};">
                  ${craftable ? 'Ready to craft now.' : 'Missing materials.'}
                </div>
                <button
                  type="button"
                  data-craft-recipe="${recipe.id}"
                  ${craftable ? '' : 'disabled'}
                  style="
                    border:none;
                    border-radius:999px;
                    padding:8px 12px;
                    background:${craftable ? '#e8c84a' : 'rgba(247,242,234,0.08)'};
                    color:${craftable ? '#1a120c' : 'rgba(247,242,234,0.35)'};
                    font-weight:700;
                    cursor:${craftable ? 'pointer' : 'not-allowed'};
                  "
                >Craft</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

export function showBackpackPanel(container, initialData, onClose) {
  let data = initialData;
  let activeTab = 'inventory';
  let selectedSlotIndex = 0;
  let dragIndex = null;
  let touchDrag = null;
  let ghost = null;

  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open';
  sheet.id = 'backpack-panel';
  sheet.style.maxWidth = 'min(92vw, 332px)';
  sheet.style.maxHeight = '80vh';
  sheet.style.overflow = 'auto';
  sheet.tabIndex = 0;

  const close = () => {
    cleanupDrag();
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.remove();
      onClose?.();
    }, 260);
  };

  function cleanupDrag() {
    if (ghost) ghost.remove();
    ghost = null;
    touchDrag = null;
    dragIndex = null;
  }

  function getLatest() {
    return typeof data.getLatest === 'function' ? data.getLatest() : data;
  }

  function rerender() {
    data = getLatest();
    const selectedSlot = data.inventory?.slots?.[selectedSlotIndex] ?? null;
    const used = (data.inventory?.slots ?? []).filter(Boolean).length;
    const total = data.inventory?.capacity ?? 20;
    const capacityPercent = total ? Math.round((used / total) * 100) : 0;

    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div class="palette-header">
        <div style="min-width:0;">
          <div class="palette-title">Backpack</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(247,242,234,0.35);margin-top:4px;">
            Tools, pantry, keepsakes, trail
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="text-align:right;min-width:52px;">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.08em;color:rgba(247,242,234,0.32);text-transform:uppercase;">Load</div>
            <div style="font-family:'Fraunces',serif;font-size:15px;color:#f7f2ea;line-height:1.1;">${used}/${total}</div>
          </div>
          <button type="button" class="palette-dismiss" id="backpack-dismiss" aria-label="Close backpack">&times;</button>
        </div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        ${renderTabButton('inventory', activeTab, 'Inventory')}
        ${renderTabButton('crafting', activeTab, 'Crafting')}
        ${renderTabButton('keepsakes', activeTab, 'Keepsakes')}
        ${renderTabButton('pantry', activeTab, 'Pantry')}
      </div>

      <div id="backpack-tab-body">
        ${activeTab === 'inventory' ? `
          <div
            id="inventory-grid"
            style="display:grid;grid-template-columns:repeat(5,minmax(40px,1fr));gap:8px;justify-content:center;margin-bottom:10px;"
          >
            ${renderInventoryGrid(data, selectedSlotIndex)}
          </div>

          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;gap:8px;font-family:'DM Mono',monospace;font-size:10px;color:rgba(247,242,234,0.52);margin-bottom:6px;">
              <span>Slots used</span>
              <span>${capacityPercent}% full</span>
            </div>
            <div style="height:6px;border-radius:999px;background:rgba(247,242,234,0.08);overflow:hidden;">
              <div style="height:100%;width:${capacityPercent}%;background:linear-gradient(90deg,#7fbf7f,#e8c84a);"></div>
            </div>
          </div>

          <div style="padding:10px 12px;border-radius:12px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
            <div style="display:flex;gap:10px;align-items:flex-start;">
              <div style="width:38px;height:38px;border-radius:10px;background:${selectedSlot ? (CATEGORY_TINTS[selectedSlot.category] ?? 'rgba(247,242,234,0.08)') : 'rgba(247,242,234,0.04)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                ${selectedSlot ? escapeHtml(selectedSlot.itemDef?.icon ?? '📦') : '·'}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-family:'Fraunces',serif;font-size:15px;color:#f7f2ea;">${selectedSlot ? escapeHtml(selectedSlot.itemDef?.name ?? selectedSlot.itemId) : 'Select a slot'}</div>
                <div style="font-size:12px;color:rgba(247,242,234,0.52);margin-top:3px;line-height:1.45;">
                  ${selectedSlot ? `${escapeHtml(selectedSlot.itemDef?.description ?? 'Stored item.')} ${selectedSlot.count > 1 ? `(x${selectedSlot.count})` : ''}` : 'Pick a slot to inspect, use, or move the item inside.'}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button type="button" id="backpack-use" ${selectedSlot ? '' : 'disabled'} style="border:none;border-radius:999px;padding:8px 12px;background:#e8c84a;color:#1a120c;font-weight:700;cursor:pointer;">Use</button>
              <button type="button" id="backpack-drop" ${selectedSlot ? '' : 'disabled'} style="border:1px solid rgba(247,242,234,0.12);border-radius:999px;padding:8px 12px;background:rgba(247,242,234,0.04);color:#f7f2ea;cursor:pointer;">Drop</button>
            </div>
          </div>
        ` : ''}

        ${activeTab === 'crafting' ? renderCrafting(data) : ''}
        ${activeTab === 'keepsakes' ? renderKeepsakes(data) : ''}
        ${activeTab === 'pantry' ? renderPantry(data) : ''}
      </div>
    `;

    sheet.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        activeTab = button.dataset.tab;
        rerender();
      });
    });

    sheet.querySelector('#backpack-dismiss')?.addEventListener('click', close);

    if (activeTab === 'crafting') {
      sheet.querySelectorAll('[data-craft-recipe]').forEach((button) => {
        button.addEventListener('click', () => {
          data.actions?.onCraftRecipe?.(button.dataset.craftRecipe);
          rerender();
        });
      });
      return;
    }

    if (activeTab !== 'inventory') return;

    const slots = sheet.querySelectorAll('.backpack-slot');
    slots.forEach((button) => {
      const slotIndex = Number(button.dataset.slotIndex);
      button.addEventListener('click', () => {
        selectedSlotIndex = slotIndex;
        rerender();
      });
      button.addEventListener('dragstart', (event) => {
        dragIndex = slotIndex;
        event.dataTransfer?.setData('text/plain', String(slotIndex));
      });
      button.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        if (dragIndex == null) return;
        data.actions?.onMoveSlot?.(dragIndex, slotIndex);
        selectedSlotIndex = slotIndex;
        cleanupDrag();
        rerender();
      });
      button.addEventListener('pointerdown', (event) => {
        if (!data.inventory?.slots?.[slotIndex]) return;
        const pointerType = event.pointerType || 'mouse';
        touchDrag = {
          slotIndex,
          pointerId: event.pointerId,
          pointerType,
          x: event.clientX,
          y: event.clientY,
          started: pointerType === 'mouse',
          timer: pointerType === 'touch'
            ? window.setTimeout(() => startGhost(slotIndex, event.clientX, event.clientY), 300)
            : null,
        };
        if (pointerType === 'mouse') {
          startGhost(slotIndex, event.clientX, event.clientY);
        }
      });
    });

    sheet.querySelector('#backpack-use')?.addEventListener('click', () => {
      const result = data.actions?.onUseItem?.(selectedSlotIndex);
      if (result?.success) {
        rerender();
      }
    });
    sheet.querySelector('#backpack-drop')?.addEventListener('click', () => {
      const slot = data.inventory?.slots?.[selectedSlotIndex];
      if (!slot) return;
      data.actions?.onDropItem?.(selectedSlotIndex, slot.count > 1 ? 1 : slot.count);
      rerender();
    });
  }

  function startGhost(slotIndex, x, y) {
    if (ghost || !data.inventory?.slots?.[slotIndex]) return;
    dragIndex = slotIndex;
    const slot = data.inventory.slots[slotIndex];
    ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = `${x - 20}px`;
    ghost.style.top = `${y - 20}px`;
    ghost.style.width = '40px';
    ghost.style.height = '40px';
    ghost.style.borderRadius = '10px';
    ghost.style.background = CATEGORY_TINTS[slot.category] ?? 'rgba(247,242,234,0.1)';
    ghost.style.border = '1px solid rgba(232,200,74,0.7)';
    ghost.style.display = 'flex';
    ghost.style.alignItems = 'center';
    ghost.style.justifyContent = 'center';
    ghost.style.zIndex = '1000';
    ghost.textContent = slot.itemDef?.icon ?? '📦';
    document.body.appendChild(ghost);
  }

  function handlePointerMove(event) {
    if (!touchDrag) return;
    if (ghost) {
      ghost.style.left = `${event.clientX - 20}px`;
      ghost.style.top = `${event.clientY - 20}px`;
    }
  }

  function handlePointerUp(event) {
    if (!touchDrag) return;
    if (touchDrag.timer) window.clearTimeout(touchDrag.timer);
    if (ghost && dragIndex != null) {
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.backpack-slot');
      if (dropTarget) {
        const toIndex = Number(dropTarget.dataset.slotIndex);
        data.actions?.onMoveSlot?.(dragIndex, toIndex);
        selectedSlotIndex = toIndex;
      }
      rerender();
    }
    cleanupDrag();
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  sheet.addEventListener('keydown', (event) => {
    if (activeTab !== 'inventory') return;
    const total = data.inventory?.slots?.length ?? 0;
    if (!total) return;
    const cols = 5;
    if (event.key === 'ArrowRight') {
      selectedSlotIndex = Math.min(total - 1, selectedSlotIndex + 1);
      event.preventDefault();
      rerender();
    } else if (event.key === 'ArrowLeft') {
      selectedSlotIndex = Math.max(0, selectedSlotIndex - 1);
      event.preventDefault();
      rerender();
    } else if (event.key === 'ArrowDown') {
      selectedSlotIndex = Math.min(total - 1, selectedSlotIndex + cols);
      event.preventDefault();
      rerender();
    } else if (event.key === 'ArrowUp') {
      selectedSlotIndex = Math.max(0, selectedSlotIndex - cols);
      event.preventDefault();
      rerender();
    } else if (event.key === 'Enter') {
      data.actions?.onUseItem?.(selectedSlotIndex);
      event.preventDefault();
      rerender();
    }
  });

  container.innerHTML = '';
  container.appendChild(sheet);
  rerender();
}
