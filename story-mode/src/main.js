/**
 * Garden OS Story Mode — Entry Point
 * Mounts the 3D scene, initializes game state, binds touch input.
 */
import { createGardenScene } from './scene/garden-scene.js';
import { createLoop } from './game/loop.js';
import { createGameState, PHASES } from './game/state.js';
import { advance, canAdvance, getPhaseLabel } from './game/phase-machine.js';
import { scoreBed } from './scoring/bed-score.js';
import { getCropsForChapter } from './data/crops.js';
import { saveCampaign, loadCampaign } from './game/save.js';

function mount() {
  const viewport = document.getElementById('viewport');
  const state = createGameState();

  // Restore campaign if exists
  const saved = loadCampaign();
  if (saved) {
    Object.assign(state.campaign, saved);
  }

  // Scene
  let scene;
  try {
    scene = createGardenScene(viewport);
  } catch (err) {
    viewport.innerHTML = `<div style="padding:24px;color:#e8c84a;font-family:monospace">${err.message}</div>`;
    console.error('Scene init failed:', err);
    return;
  }

  // HUD elements
  const hudChapter = document.getElementById('hud-chapter');
  const hudPhase = document.getElementById('hud-phase');
  const hudCrops = document.getElementById('hud-crops');
  const hudScore = document.getElementById('hud-score');
  const panelContainer = document.getElementById('panel-container');
  const overlayContainer = document.getElementById('overlay-container');

  // Site config (defaults for Chapter 1)
  const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };

  function updateHUD() {
    hudChapter.textContent = `Chapter ${state.campaign.currentChapter}`;
    hudPhase.textContent = getPhaseLabel(state.season.phase);
    const planted = state.season.grid.filter(c => c.cropId !== null).length;
    hudCrops.textContent = `${planted} / 32`;

    if (state.season.phase === PHASES.PLANNING || state.season.phase === PHASES.HARVEST) {
      const result = scoreBed(state.season.grid, siteConfig, state.season.season, state.campaign.pantry);
      hudScore.textContent = result.score > 0 ? result.score.toString() : '--';
    }
  }

  // Chapter intro
  function showChapterIntro() {
    const chapter = state.campaign.currentChapter;
    const intro = document.createElement('div');
    intro.className = 'chapter-intro';
    intro.innerHTML = `
      <div class="chapter-num">Chapter ${chapter}</div>
      <h2>${getChapterTitle(chapter)}</h2>
      <p>${getChapterNarrative(chapter)}</p>
      <div class="tap-hint">Tap to begin</div>
    `;
    intro.addEventListener('click', () => {
      intro.remove();
      state.showChapterIntro = false;
    });
    overlayContainer.appendChild(intro);
  }

  // Crop palette panel
  function showCropPalette() {
    const crops = getCropsForChapter(state.campaign.currentChapter);
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.innerHTML = `
      <div class="panel-handle"></div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,242,234,0.4);margin-bottom:12px;">Select Crop</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;">
        ${crops.map(c => `
          <button data-crop="${c.id}" style="
            background:rgba(247,242,234,0.06);
            border:1px solid ${state.selectedCropId === c.id ? '#e8c84a' : 'rgba(247,242,234,0.1)'};
            border-radius:8px;padding:10px 8px;cursor:pointer;color:#f7f2ea;
            font-family:'DM Sans',sans-serif;font-size:13px;text-align:center;
            transition:border-color 0.15s;
          ">
            <div style="font-size:22px;margin-bottom:4px;">${c.emoji}</div>
            <div style="font-size:11px;line-height:1.3;">${c.name}</div>
          </button>
        `).join('')}
      </div>
    `;
    sheet.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-crop]');
      if (btn) {
        state.selectedCropId = btn.dataset.crop;
        sheet.remove();
      }
    });
    panelContainer.innerHTML = '';
    panelContainer.appendChild(sheet);
  }

  // Touch input on viewport
  viewport.addEventListener('click', (e) => {
    if (state.showChapterIntro) return;
    if (state.season.phase !== PHASES.PLANNING) return;

    const cellIndex = scene.raycastCell(e.clientX, e.clientY);
    if (cellIndex < 0) {
      showCropPalette();
      return;
    }

    const cell = state.season.grid[cellIndex];
    if (cell.cropId && !state.selectedCropId) {
      // Tap on planted cell without crop selected = erase
      cell.cropId = null;
    } else if (state.selectedCropId) {
      cell.cropId = state.selectedCropId;
    } else {
      showCropPalette();
    }
    updateHUD();
  });

  // Advance phase button (temporary — will be replaced by proper UI)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && canAdvance(state.season)) {
      advance(state.season);
      updateHUD();
      saveCampaign(state.campaign);
    }
    if (e.key === 'p' || e.key === 'P') {
      showCropPalette();
    }
  });

  // Resize
  function resize() {
    const rect = viewport.getBoundingClientRect();
    scene.resize(rect.width, rect.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Game loop
  const loop = createLoop({
    scene,
    getState: () => state,
  });

  // Start
  if (state.showChapterIntro) showChapterIntro();
  updateHUD();
  loop.start();
}

// Chapter data (Phase 1 — inline, will move to NARRATIVE_SPEC.md loader later)
function getChapterTitle(chapter) {
  const titles = {
    1: "The Backyard Inheritance",
    2: "First Shoots",
    3: "Root Work",
    4: "Winter Rest",
    5: "The Second Spring",
    6: "Full Sun",
    7: "The Climbing Season",
    8: "Preservation",
    9: "The Final Harvest",
    10: "Legacy Rows",
    11: "Mom's Recipe",
    12: "The Garden Stays",
  };
  return titles[chapter] || `Chapter ${chapter}`;
}

function getChapterNarrative(chapter) {
  if (chapter === 1) {
    return "Mom left you the raised bed out back. Eight feet by four, cedar frame, good soil. " +
      "The screen door still creaks the same way. The radio's on inside. " +
      "Start with what you know — lettuce, basil, radishes. Keep it simple. Keep it alive.";
  }
  return "A new season begins.";
}

// Mount
try {
  mount();
} catch (err) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<pre style="color:#e8c84a;padding:24px;font-family:monospace;white-space:pre-wrap">${err.stack || err.message}</pre>`;
  }
  console.error('Mount failed:', err);
}
