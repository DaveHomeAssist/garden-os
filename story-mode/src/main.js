/**
 * Garden OS Story Mode — Entry Point
 * Mounts the 3D scene, initializes game state, binds touch input.
 */
import { createGardenScene } from './scene/garden-scene.js';
import { createLoop } from './game/loop.js';
import { createGameState, PHASES, PHASE_ORDER } from './game/state.js';
import { advance, canAdvance, getPhaseLabel } from './game/phase-machine.js';
import { scoreBed } from './scoring/bed-score.js';
import { getCropsForChapter } from './data/crops.js';
import { saveCampaign, loadCampaign, hasSave, deleteCampaign } from './game/save.js';

// Faction badge colors
const FACTION_BADGE_COLORS = {
  climbers: '#2d8a4e',
  fast_cycles: '#6dbf6d',
  greens: '#3a7a4f',
  roots: '#c47a3a',
  herbs: '#7ab85e',
  fruiting: '#d44a2a',
  brassicas: '#4a8a6a',
  companions: '#e8c84a',
};

// Faction display names
const FACTION_NAMES = {
  climbers: 'Climber',
  fast_cycles: 'Fast',
  greens: 'Greens',
  roots: 'Root',
  herbs: 'Herb',
  fruiting: 'Fruit',
  brassicas: 'Brassica',
  companions: 'Companion',
};

function mount() {
  const viewport = document.getElementById('viewport');
  const state = createGameState();

  // New Game vs Continue choice
  const saved = loadCampaign();
  if (saved) {
    showStartChoice(saved, state, () => startGame(state, viewport));
    return;
  }

  startGame(state, viewport);
}

function showStartChoice(saved, state, onStart) {
  const overlayContainer = document.getElementById('overlay-container');
  const choice = document.createElement('div');
  choice.className = 'chapter-intro';
  choice.style.animation = 'fadeInIntro 0.6s ease-out both';
  choice.innerHTML = `
    <div class="chapter-num">Garden OS</div>
    <h2>Welcome Back</h2>
    <p>Chapter ${saved.currentChapter} save found from ${new Date(saved.updatedAt).toLocaleDateString()}.</p>
    <div style="display:flex;gap:16px;margin-top:28px;">
      <button id="btn-continue" style="
        font-family:'DM Sans',sans-serif;font-size:15px;
        padding:12px 28px;border-radius:8px;cursor:pointer;
        background:#e8c84a;color:#1e110a;border:none;
        font-weight:500;
      ">Continue</button>
      <button id="btn-new" style="
        font-family:'DM Sans',sans-serif;font-size:15px;
        padding:12px 28px;border-radius:8px;cursor:pointer;
        background:rgba(247,242,234,0.1);color:#f7f2ea;
        border:1px solid rgba(247,242,234,0.2);
        font-weight:500;
      ">New Game</button>
    </div>
  `;

  choice.querySelector('#btn-continue').addEventListener('click', () => {
    Object.assign(state.campaign, saved);
    state.showChapterIntro = false;
    choice.remove();
    onStart();
  });

  choice.querySelector('#btn-new').addEventListener('click', () => {
    deleteCampaign();
    choice.remove();
    onStart();
  });

  overlayContainer.appendChild(choice);
}

function startGame(state, viewport) {
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
  const phaseDots = document.getElementById('phase-dots');
  const toastContainer = document.getElementById('toast-container');
  const fab = document.getElementById('fab-advance');

  // Site config (defaults for Chapter 1)
  const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };

  // Toast notification system
  function showToast(message, durationMs) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, durationMs || 2200);
  }

  // Phase progress dots
  function updatePhaseDots() {
    if (!phaseDots) return;
    const currentIndex = PHASE_ORDER.indexOf(state.season.phase);
    phaseDots.innerHTML = PHASE_ORDER.map((p, i) => {
      let cls = 'phase-dot';
      if (i < currentIndex) cls += ' phase-dot--done';
      else if (i === currentIndex) cls += ' phase-dot--active';
      return `<span class="${cls}" title="${getPhaseLabel(p)}"></span>`;
    }).join('');
  }

  // FAB visibility
  function updateFAB() {
    if (!fab) return;
    if (canAdvance(state.season)) {
      fab.classList.add('is-visible');
      fab.textContent = state.season.phase === PHASES.PLANNING ? 'Commit' : 'Next';
    } else {
      fab.classList.remove('is-visible');
    }
  }

  function updateHUD() {
    hudChapter.textContent = `Chapter ${state.campaign.currentChapter}`;
    hudPhase.textContent = getPhaseLabel(state.season.phase);
    const planted = state.season.grid.filter(c => c.cropId !== null).length;
    hudCrops.textContent = `${planted} / 32`;

    if (state.season.phase === PHASES.PLANNING || state.season.phase === PHASES.HARVEST) {
      const result = scoreBed(state.season.grid, siteConfig, state.season.season, state.campaign.pantry);
      hudScore.textContent = result.score > 0 ? result.score.toString() : '--';
    }

    updatePhaseDots();
    updateFAB();
  }

  // Phase advance logic
  function doAdvance() {
    if (!canAdvance(state.season)) return;
    const prevPhase = state.season.phase;
    advance(state.season);

    // Show event if active
    if (state.season.eventActive) {
      showToast(`${state.season.eventActive.title}: ${state.season.eventActive.description}`, 3500);
      // Auto-clear event so canAdvance works for next beat
      state.season.eventActive = null;
    } else {
      showToast(`Phase: ${getPhaseLabel(state.season.phase)}`, 1800);
    }

    updateHUD();
    saveCampaign(state.campaign);
  }

  // Chapter intro
  function showChapterIntro() {
    const chapter = state.campaign.currentChapter;
    const intro = document.createElement('div');
    intro.className = 'chapter-intro';
    intro.style.animation = 'fadeInIntro 0.6s ease-out both';
    intro.innerHTML = `
      <div class="chapter-num">Chapter ${chapter}</div>
      <h2>${getChapterTitle(chapter)}</h2>
      <p>${getChapterNarrative(chapter)}</p>
      <div class="tap-hint">Tap to begin</div>
    `;
    intro.addEventListener('click', () => {
      intro.style.animation = 'fadeOutIntro 0.3s ease-in both';
      setTimeout(() => {
        intro.remove();
        state.showChapterIntro = false;
      }, 300);
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,242,234,0.4);">Select Crop</div>
        <button id="palette-dismiss" style="
          background:none;border:1px solid rgba(247,242,234,0.15);
          color:rgba(247,242,234,0.5);font-size:18px;
          width:28px;height:28px;border-radius:6px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          line-height:1;padding:0;
        ">&times;</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">
        ${crops.map(c => {
          const badgeColor = FACTION_BADGE_COLORS[c.faction] || '#888';
          const badgeName = FACTION_NAMES[c.faction] || c.faction;
          const isSelected = state.selectedCropId === c.id;
          return `
          <button data-crop="${c.id}" style="
            background:rgba(247,242,234,0.06);
            border:1px solid ${isSelected ? '#e8c84a' : 'rgba(247,242,234,0.1)'};
            border-radius:8px;padding:10px 8px;cursor:pointer;color:#f7f2ea;
            font-family:'DM Sans',sans-serif;font-size:13px;text-align:center;
            transition:border-color 0.15s;
          ">
            <div style="font-size:22px;margin-bottom:2px;">${c.emoji}</div>
            <div style="font-size:11px;line-height:1.3;margin-bottom:4px;">${c.name}</div>
            <span style="
              display:inline-block;
              font-family:'DM Mono',monospace;
              font-size:9px;
              padding:2px 6px;
              border-radius:999px;
              background:${badgeColor}22;
              color:${badgeColor};
              border:1px solid ${badgeColor}44;
              letter-spacing:0.05em;
              text-transform:uppercase;
            ">${badgeName}</span>
          </button>
        `;
        }).join('')}
      </div>
    `;
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('#palette-dismiss')) {
        sheet.classList.remove('is-open');
        setTimeout(() => sheet.remove(), 300);
        return;
      }
      const btn = e.target.closest('[data-crop]');
      if (btn) {
        state.selectedCropId = btn.dataset.crop;
        sheet.classList.remove('is-open');
        setTimeout(() => sheet.remove(), 300);
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
      // Brief green highlight after placement
      scene.flashCell(cellIndex, 0x4a9a4a, 350);
    } else {
      showCropPalette();
    }
    updateHUD();
  });

  // Advance phase — keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      doAdvance();
    }
    if (e.key === 'p' || e.key === 'P') {
      showCropPalette();
    }
  });

  // Advance phase — FAB button
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      doAdvance();
    });
  }

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
