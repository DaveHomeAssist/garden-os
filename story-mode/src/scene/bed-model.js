/**
 * Bed Model — 8x4 cedar frame + 32 soil cells.
 */
import * as THREE from 'three';
import { COLS, ROWS } from '../game/state.js';

const CELL_SIZE = 0.5;
const FRAME_HEIGHT = 0.15;
const FRAME_THICKNESS = 0.06;
const SOIL_Y = FRAME_HEIGHT * 0.6;

const CEDAR = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85, metalness: 0.05 });
const SOIL = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
const CELL_HOVER = new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.9, transparent: true, opacity: 0.9 });

export function buildBed() {
  const group = new THREE.Group();

  const bedWidth = COLS * CELL_SIZE;
  const bedDepth = ROWS * CELL_SIZE;

  // Cedar frame — 4 planks
  const longPlank = new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS);
  const shortPlank = new THREE.BoxGeometry(FRAME_THICKNESS, FRAME_HEIGHT, bedDepth);

  const front = new THREE.Mesh(longPlank, CEDAR);
  front.position.set(0, FRAME_HEIGHT / 2, bedDepth / 2 + FRAME_THICKNESS / 2);
  front.castShadow = true;
  front.receiveShadow = true;
  group.add(front);

  const back = new THREE.Mesh(longPlank, CEDAR);
  back.position.set(0, FRAME_HEIGHT / 2, -bedDepth / 2 - FRAME_THICKNESS / 2);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  const left = new THREE.Mesh(shortPlank, CEDAR);
  left.position.set(-bedWidth / 2 - FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  left.castShadow = true;
  left.receiveShadow = true;
  group.add(left);

  const right = new THREE.Mesh(shortPlank, CEDAR);
  right.position.set(bedWidth / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  right.castShadow = true;
  right.receiveShadow = true;
  group.add(right);

  // Soil cells — 32 individual planes for raycasting
  const cellGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
  const cellMeshes = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const cell = new THREE.Mesh(cellGeo, SOIL.clone());
      cell.rotation.x = -Math.PI / 2;
      const x = (col - (COLS - 1) / 2) * CELL_SIZE;
      const z = (row - (ROWS - 1) / 2) * CELL_SIZE;
      cell.position.set(x, SOIL_Y, z);
      cell.receiveShadow = true;
      cell.userData.cellIndex = index;
      cell.userData.row = row;
      cell.userData.col = col;
      group.add(cell);
      cellMeshes.push(cell);
    }
  }

  return {
    group,
    cellMeshes,
    cellSize: CELL_SIZE,
    soilY: SOIL_Y,
    frameHeight: FRAME_HEIGHT,
  };
}
