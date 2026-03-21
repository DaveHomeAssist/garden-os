/**
 * Backpack Panel — persistent collection/progression drawer.
 * Shows keepsakes, recipes, pantry counts, and chapter history.
 */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showBackpackPanel(container, data, onClose) {
  const {
    keepsakeSlots = [],
    unlockedKeepsakes = [],
    recipesCompleted = [],
    totalRecipes = 0,
    pantryEntries = [],
    seasonHistory = [],
  } = data;

  const unlockedMap = new Map(unlockedKeepsakes.map((entry) => [entry.id, entry]));
  const recentHistory = seasonHistory.slice(-6).reverse();

  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open';
  sheet.id = 'backpack-panel';
  sheet.innerHTML = `
    <div class="panel-handle"></div>
    <div class="palette-header">
      <div>
        <div class="palette-title">Backpack</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;color:rgba(247,242,234,0.35);margin-top:4px;">
          Keepsakes, pantry, recipes, and season trail
        </div>
      </div>
      <button type="button" class="palette-dismiss" id="backpack-dismiss" aria-label="Close backpack">&times;</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
      <div style="background:rgba(247,242,234,0.04);border-radius:10px;padding:10px;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Keepsakes</div>
        <div style="font-family:'Fraunces',serif;font-size:22px;color:#f7f2ea;">${unlockedKeepsakes.length}<span style="font-size:12px;color:rgba(247,242,234,0.45);"> / ${keepsakeSlots.length}</span></div>
      </div>
      <div style="background:rgba(247,242,234,0.04);border-radius:10px;padding:10px;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Recipes</div>
        <div style="font-family:'Fraunces',serif;font-size:22px;color:#f7f2ea;">${recipesCompleted.length}<span style="font-size:12px;color:rgba(247,242,234,0.45);"> / ${totalRecipes}</span></div>
      </div>
      <div style="background:rgba(247,242,234,0.04);border-radius:10px;padding:10px;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Pantry</div>
        <div style="font-family:'Fraunces',serif;font-size:22px;color:#f7f2ea;">${pantryEntries.length}</div>
      </div>
    </div>

    <section style="margin-bottom:16px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:10px;">Keepsakes</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${keepsakeSlots.map((slot) => {
          const unlocked = unlockedMap.get(slot.id);
          return `
            <div style="
              padding:12px;border-radius:10px;
              background:${unlocked ? 'rgba(90,171,107,0.12)' : 'rgba(247,242,234,0.03)'};
              border:1px solid ${unlocked ? 'rgba(90,171,107,0.24)' : 'rgba(247,242,234,0.08)'};
              min-height:88px;
              display:flex;flex-direction:column;justify-content:space-between;
            ">
              <div>
                <div style="font-family:'Fraunces',serif;font-size:16px;color:${unlocked ? '#f7f2ea' : 'rgba(247,242,234,0.42)'};">${escapeHtml(slot.name)}</div>
                <div style="font-size:12px;color:rgba(247,242,234,0.48);margin-top:4px;">${unlocked ? `Earned in Ch ${unlocked.chapter}` : 'Locked keepsake slot'}</div>
              </div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:${unlocked ? '#8fd39b' : 'rgba(247,242,234,0.25)'};">
                ${unlocked ? 'Unlocked' : slot.shortLabel}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <section style="margin-bottom:16px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:10px;">Recipes</div>
      ${recipesCompleted.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${recipesCompleted.map((recipe) => `
            <span style="padding:7px 10px;border-radius:999px;background:rgba(232,200,74,0.14);color:#f4dfa1;font-size:12px;">${escapeHtml(recipe.name)}</span>
          `).join('')}
        </div>
      ` : `
        <div style="font-size:13px;color:rgba(247,242,234,0.48);">No completed recipes yet.</div>
      `}
    </section>

    <section style="margin-bottom:16px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:10px;">Pantry</div>
      ${pantryEntries.length > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
          ${pantryEntries.map((entry) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.03);border:1px solid rgba(247,242,234,0.08);">
              <span style="font-size:13px;color:#f7f2ea;">${escapeHtml(entry.name)}</span>
              <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.55);">x${entry.count}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="font-size:13px;color:rgba(247,242,234,0.48);">Your pantry is still empty.</div>
      `}
    </section>

    <section>
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(232,200,74,0.6);margin-bottom:10px;">Season Trail</div>
      ${recentHistory.length > 0 ? `
        <div style="display:grid;gap:8px;">
          ${recentHistory.map((entry) => `
            <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.03);border:1px solid rgba(247,242,234,0.08);">
              <span style="font-size:13px;color:#f7f2ea;">Ch ${entry.chapter} · ${escapeHtml(entry.season)}</span>
              <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.55);">${entry.score} · ${escapeHtml(entry.grade)}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="font-size:13px;color:rgba(247,242,234,0.48);">No completed chapters yet.</div>
      `}
    </section>
  `;

  sheet.addEventListener('click', (event) => {
    if (event.target.closest('#backpack-dismiss')) {
      sheet.classList.remove('is-open');
      setTimeout(() => {
        sheet.remove();
        onClose?.();
      }, 300);
    }
  });

  container.innerHTML = '';
  container.appendChild(sheet);
}
