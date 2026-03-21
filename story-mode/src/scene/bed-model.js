/**
 * Bed Model — 8x4 cedar frame + 32 soil cells + grid lines + row labels.
 */
import * as THREE from 'three';
import { COLS, ROWS } from '../game/state.js';

const CELL_SIZE = 0.5;
const FRAME_HEIGHT = 0.15;
const FRAME_THICKNESS = 0.06;
const BEVEL_INSET = 0.008;
const SOIL_Y = FRAME_HEIGHT * 0.6;

const CEDAR = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85, metalness: 0.05 });
const CEDAR_BEVEL = new THREE.MeshStandardMaterial({ color: 0x7A4E24, roughness: 0.8, metalness: 0.08 });
const SOIL = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
const GRID_LINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1208, transparent: true, opacity: 0.35 });

// Seeded random for consistent soil terrain per cell
function seededRandom(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ROW_LABELS = ['Back (Wall)', 'Row 1', 'Row 2', 'Front (Access)'];
const ROW_LABEL_COLORS = [0x6688aa, 0x888888, 0x888888, 0x88aa66];

export function buildBed() {
  const group = new THREE.Group();

  const bedWidth = COLS * CELL_SIZE;
  const bedDepth = ROWS * CELL_SIZE;

  // Cedar frame — 4 planks with bevel edges
  const longPlank = new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS);
  const shortPlank = new THREE.BoxGeometry(FRAME_THICKNESS, FRAME_HEIGHT, bedDepth);

  // Bevel strips (thin lighter strips on top edges of frame)
  const longBevel = new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2 + BEVEL_INSET, BEVEL_INSET, FRAME_THICKNESS + BEVEL_INSET);
  const shortBevel = new THREE.BoxGeometry(FRAME_THICKNESS + BEVEL_INSET, BEVEL_INSET, bedDepth + BEVEL_INSET);

  const front = new THREE.Mesh(longPlank, CEDAR);
  front.position.set(0, FRAME_HEIGHT / 2, bedDepth / 2 + FRAME_THICKNESS / 2);
  front.castShadow = true;
  front.receiveShadow = true;
  group.add(front);

  const frontBevel = new THREE.Mesh(longBevel, CEDAR_BEVEL);
  frontBevel.position.set(0, FRAME_HEIGHT + BEVEL_INSET / 2, bedDepth / 2 + FRAME_THICKNESS / 2);
  group.add(frontBevel);

  const back = new THREE.Mesh(longPlank, CEDAR);
  back.position.set(0, FRAME_HEIGHT / 2, -bedDepth / 2 - FRAME_THICKNESS / 2);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  const backBevel = new THREE.Mesh(longBevel, CEDAR_BEVEL);
  backBevel.position.set(0, FRAME_HEIGHT + BEVEL_INSET / 2, -bedDepth / 2 - FRAME_THICKNESS / 2);
  group.add(backBevel);

  const left = new THREE.Mesh(shortPlank, CEDAR);
  left.position.set(-bedWidth / 2 - FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  left.castShadow = true;
  left.receiveShadow = true;
  group.add(left);

  const leftBevel = new THREE.Mesh(shortBevel, CEDAR_BEVEL);
  leftBevel.position.set(-bedWidth / 2 - FRAME_THICKNESS / 2, FRAME_HEIGHT + BEVEL_INSET / 2, 0);
  group.add(leftBevel);

  const right = new THREE.Mesh(shortPlank, CEDAR);
  right.position.set(bedWidth / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  right.castShadow = true;
  right.receiveShadow = true;
  group.add(right);

  const rightBevel = new THREE.Mesh(shortBevel, CEDAR_BEVEL);
  rightBevel.position.set(bedWidth / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT + BEVEL_INSET / 2, 0);
  group.add(rightBevel);

  // Grid lines between cells (thin dark strips)
  const gridLineThickness = 0.012;

  // Vertical grid lines (between columns)
  for (let col = 1; col < COLS; col++) {
    const x = (col - COLS / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(gridLineThickness, 0.005, bedDepth);
    const line = new THREE.Mesh(lineGeo, GRID_LINE_MAT);
    line.position.set(x, SOIL_Y + 0.003, 0);
    group.add(line);
  }

  // Horizontal grid lines (between rows)
  for (let row = 1; row < ROWS; row++) {
    const z = (row - ROWS / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(bedWidth, 0.005, gridLineThickness);
    const line = new THREE.Mesh(lineGeo, GRID_LINE_MAT);
    line.position.set(0, SOIL_Y + 0.003, z);
    group.add(line);
  }

  // Soil cells — 32 individual planes for raycasting with subtle height variation
  const cellGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
  const cellMeshes = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const soilMat = SOIL.clone();
      // Slight color variation per cell
      const rnd = seededRandom(index * 7 + 42);
      const colorShift = 0.02 * (rnd - 0.5);
      soilMat.color.offsetHSL(0, 0, colorShift);

      const cell = new THREE.Mesh(cellGeo, soilMat);
      cell.rotation.x = -Math.PI / 2;
      const x = (col - (COLS - 1) / 2) * CELL_SIZE;
      const z = (row - (ROWS - 1) / 2) * CELL_SIZE;
      // Subtle terrain: slight height variation per cell
      const heightOffset = (seededRandom(index * 13 + 97) - 0.5) * 0.012;
      cell.position.set(x, SOIL_Y + heightOffset, z);
      cell.receiveShadow = true;
      cell.userData.cellIndex = index;
      cell.userData.row = row;
      cell.userData.col = col;
      group.add(cell);
      cellMeshes.push(cell);
    }
  }

  // Row labels — colored marker cubes along the left side
  for (let row = 0; row < ROWS; row++) {
    const z = (row - (ROWS - 1) / 2) * CELL_SIZE;
    const markerX = -bedWidth / 2 - FRAME_THICKNESS - 0.12;

    // Small colored cube marker
    const markerGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const markerMat = new THREE.MeshStandardMaterial({
      color: ROW_LABEL_COLORS[row],
      roughness: 0.5,
      emissive: ROW_LABEL_COLORS[row],
      emissiveIntensity: 0.3,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(markerX, FRAME_HEIGHT * 0.5, z);
    group.add(marker);

    // Canvas-based text sprite for the label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = '28px monospace';
    ctx.fillStyle = '#d0c8b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ROW_LABELS[row], 4, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.8, 0.2, 1);
    sprite.position.set(markerX - 0.55, FRAME_HEIGHT * 0.6, z);
    group.add(sprite);
  }

  return {
    group,
    cellMeshes,
    cellSize: CELL_SIZE,
    soilY: SOIL_Y,
    frameHeight: FRAME_HEIGHT,
  };
}
