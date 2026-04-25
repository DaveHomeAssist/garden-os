// story-mode/src/ui/planner-binder.js
import { Actions } from '../game/store.js';
import { scoreBed } from '../scoring/bed-score.js';
import { getAllCrops } from '../data/crops.js';

/**
 * Build and inject a minimal score panel into the viewport.
 * Returns { el, update(result), dispose() }.
 */
function createScorePanel(viewport) {
  const panel = document.createElement('div');
  panel.setAttribute('data-planner-score-panel', 'true');
  panel.style.cssText = [
    'position:absolute',
    'top:12px',
    'right:12px',
    'background:rgba(30,17,10,0.82)',
    'color:#e8c84a',
    'font-family:"DM Mono",monospace',
    'font-size:12px',
    'border-radius:6px',
    'padding:10px 14px',
    'min-width:160px',
    'z-index:100',
    'pointer-events:none',
    'line-height:1.55',
  ].join(';');

  panel.innerHTML = '<div class="ps-score">Score: —</div>';
  viewport?.appendChild(panel);

  function update(result) {
    if (!result) {
      panel.innerHTML = '<div class="ps-score">Score: —</div>';
      return;
    }

    const { score, grade, details } = result;

    // Determine top 2 limiting factors from details
    const factors = [];
    if (details) {
      if (details.fillPenalty > 0.05) {
        factors.push(`Fill penalty: −${details.fillPenalty.toFixed(2)}`);
      }
      if (details.tallPenalty < 0) {
        factors.push(`Multiple tall crops: ${details.tallPenalty.toFixed(2)}`);
      }
      if (details.trellisPenalty < 0) {
        factors.push(`Multiple support crops: ${details.trellisPenalty.toFixed(2)}`);
      }
      if (details.diversityBonus < 0.3) {
        factors.push(`Low diversity: +${details.diversityBonus.toFixed(2)}`);
      }
    }
    const topFactors = factors.slice(0, 2);

    const gradeColors = {
      'A+': '#4ac94a', A: '#4ac94a',
      B: '#9ad44a', 'B+': '#9ad44a',
      C: '#e8c84a', 'C+': '#e8c84a',
      D: '#e88a4a', F: '#e84a4a',
    };
    const gradeColor = gradeColors[grade] ?? '#e8c84a';

    panel.innerHTML = `
      <div style="font-size:22px;font-weight:bold;color:${gradeColor};line-height:1.1">${score}</div>
      <div style="font-size:10px;letter-spacing:0.1em;color:${gradeColor};margin-bottom:4px">Grade ${grade}</div>
      ${topFactors.map((f) => `<div style="font-size:10px;opacity:0.75">${f}</div>`).join('')}
    `.trim();
  }

  function dispose() {
    panel.remove();
  }

  return { el: panel, update, dispose };
}

/**
 * Build a minimal crop palette panel that lets the user select a crop to plant.
 * Returns { el, dispose() }.
 */
function createCropPalette(viewport, store) {
  const palette = document.createElement('div');
  palette.setAttribute('data-planner-crop-palette', 'true');
  palette.style.cssText = [
    'position:absolute',
    'bottom:12px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:rgba(30,17,10,0.88)',
    'color:#e8c84a',
    'font-family:"DM Mono",monospace',
    'font-size:11px',
    'border-radius:6px',
    'padding:8px 10px',
    'z-index:100',
    'display:flex',
    'flex-wrap:wrap',
    'gap:4px',
    'max-width:90vw',
    'justify-content:center',
  ].join(';');

  const crops = getAllCrops();

  crops.forEach((crop) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = crop.name;
    btn.setAttribute('data-crop-id', crop.id);
    btn.style.cssText = [
      'background:rgba(255,255,255,0.07)',
      'border:1px solid rgba(232,200,74,0.25)',
      'border-radius:4px',
      'color:#e8c84a',
      'cursor:pointer',
      'font-size:14px',
      'padding:4px 6px',
      'line-height:1',
    ].join(';');
    btn.textContent = crop.emoji ?? crop.id[0].toUpperCase();
    btn.addEventListener('click', () => {
      const state = store.getState();
      const currentId = state.selectedCropId;
      const newId = currentId === crop.id ? null : crop.id;
      store.dispatch({ type: Actions.SET_SELECTED_CROP, payload: { cropId: newId } });
    });
    palette.appendChild(btn);
  });

  // Add a "clear" button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.title = 'Clear selection';
  clearBtn.style.cssText = [
    'background:rgba(255,100,80,0.15)',
    'border:1px solid rgba(232,100,74,0.35)',
    'border-radius:4px',
    'color:#e8a090',
    'cursor:pointer',
    'font-size:11px',
    'padding:4px 7px',
    'line-height:1',
  ].join(';');
  clearBtn.textContent = '✕';
  clearBtn.addEventListener('click', () => {
    store.dispatch({ type: Actions.SET_SELECTED_CROP, payload: { cropId: null } });
  });
  palette.appendChild(clearBtn);

  viewport?.appendChild(palette);

  function highlightSelected(cropId) {
    palette.querySelectorAll('[data-crop-id]').forEach((btn) => {
      const active = btn.getAttribute('data-crop-id') === cropId;
      btn.style.background = active
        ? 'rgba(232,200,74,0.28)'
        : 'rgba(255,255,255,0.07)';
      btn.style.borderColor = active
        ? 'rgba(232,200,74,0.8)'
        : 'rgba(232,200,74,0.25)';
    });
  }

  function dispose() {
    palette.remove();
  }

  return { el: palette, highlightSelected, dispose };
}

/**
 * Wire Planner mode UI:
 *  - Apply planner scene style
 *  - Show live score panel (re-scores on every state change)
 *  - Show crop palette for placement
 *  - Wire canvas click → plant / remove crop
 */
export function bindPlannerUI(store, scene, viewport) {
  // 1. Apply planner scene style
  scene.setSceneStyle?.('planner');

  // 2. Build score panel
  const scorePanel = createScorePanel(viewport);

  // 3. Build crop palette
  const cropPalette = createCropPalette(viewport, store);

  // Helper: run scoreBed on current state
  function runScore(state) {
    const { grid, siteConfig, season } = state.season ?? {};
    const pantry = state.campaign?.pantry ?? {};
    if (!grid) return null;
    try {
      return scoreBed(grid, siteConfig, season, pantry);
    } catch {
      return null;
    }
  }

  // 4. Subscribe to store changes → re-score and update panel
  const unsubscribe = store.subscribe((state) => {
    const result = runScore(state);
    scorePanel.update(result);
    cropPalette.highlightSelected(state.selectedCropId);
  });

  // Initial render
  {
    const state = store.getState();
    scorePanel.update(runScore(state));
    cropPalette.highlightSelected(state.selectedCropId);
  }

  // 5. Wire canvas click → plant / remove
  const canvas = scene.canvas;

  function handleCanvasClick(event) {
    if (!canvas) return;
    const cellIndex = scene.raycastCell?.(event.clientX, event.clientY) ?? -1;
    if (cellIndex < 0) return;

    const state = store.getState();
    const cell = state.season?.grid?.[cellIndex];
    if (!cell) return;

    if (cell.cropId) {
      // Remove existing crop
      store.dispatch({ type: Actions.REMOVE_CROP, payload: { cellIndex } });
    } else if (state.selectedCropId) {
      // Plant selected crop
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex, cropId: state.selectedCropId } });
    }
    // If no crop selected and cell empty: do nothing (palette is always visible)
  }

  canvas?.addEventListener('click', handleCanvasClick);

  // 6. Return dispose
  function dispose() {
    canvas?.removeEventListener('click', handleCanvasClick);
    unsubscribe?.();
    scorePanel.dispose();
    cropPalette.dispose();
  }

  return { dispose };
}
