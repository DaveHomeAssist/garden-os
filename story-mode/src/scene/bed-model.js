/**
 * Bed Model — cedar frame + configurable soil grid.
 */
import * as THREE from 'three';
import { COLS, ROWS } from '../game/state.js';

const CELL_SIZE = 0.5;
const FRAME_HEIGHT = 0.15;
const FRAME_THICKNESS = 0.06;
const BEVEL_INSET = 0.008;
const SOIL_Y = FRAME_HEIGHT * 0.6;

const CEDAR_MATERIAL = { color: 0x8B5A2B, roughness: 0.85, metalness: 0.05 };
const CEDAR_BEVEL_MATERIAL = { color: 0x7A4E24, roughness: 0.8, metalness: 0.08 };
const SOIL_MATERIAL = { color: 0x473323, roughness: 0.95 };
const GRID_LINE_MATERIAL = { color: 0xc7b28a, transparent: true, opacity: 0.58 };

// Seeded random for consistent soil terrain per cell
function seededRandom(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildBed(tracker = null, cols = COLS, rows = ROWS) {
  const group = new THREE.Group();
  const cedarMat = new THREE.MeshStandardMaterial(CEDAR_MATERIAL);
  const cedarBevelMat = new THREE.MeshStandardMaterial(CEDAR_BEVEL_MATERIAL);
  const gridLineMat = new THREE.MeshBasicMaterial(GRID_LINE_MATERIAL);

  const bedWidth = cols * CELL_SIZE;
  const bedDepth = rows * CELL_SIZE;

  // Cedar frame — 4 planks with bevel edges
  const longPlank = new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS);
  const shortPlank = new THREE.BoxGeometry(FRAME_THICKNESS, FRAME_HEIGHT, bedDepth);

  // Bevel strips (thin lighter strips on top edges of frame)
  const longBevel = new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2 + BEVEL_INSET, BEVEL_INSET, FRAME_THICKNESS + BEVEL_INSET);
  const shortBevel = new THREE.BoxGeometry(FRAME_THICKNESS + BEVEL_INSET, BEVEL_INSET, bedDepth + BEVEL_INSET);

  const front = new THREE.Mesh(longPlank, cedarMat);
  front.position.set(0, FRAME_HEIGHT / 2, bedDepth / 2 + FRAME_THICKNESS / 2);
  front.castShadow = true;
  front.receiveShadow = true;
  group.add(front);

  const frontBevel = new THREE.Mesh(longBevel, cedarBevelMat);
  frontBevel.position.set(0, FRAME_HEIGHT + BEVEL_INSET / 2, bedDepth / 2 + FRAME_THICKNESS / 2);
  group.add(frontBevel);

  const back = new THREE.Mesh(longPlank, cedarMat);
  back.position.set(0, FRAME_HEIGHT / 2, -bedDepth / 2 - FRAME_THICKNESS / 2);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  const backBevel = new THREE.Mesh(longBevel, cedarBevelMat);
  backBevel.position.set(0, FRAME_HEIGHT + BEVEL_INSET / 2, -bedDepth / 2 - FRAME_THICKNESS / 2);
  group.add(backBevel);

  const left = new THREE.Mesh(shortPlank, cedarMat);
  left.position.set(-bedWidth / 2 - FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  left.castShadow = true;
  left.receiveShadow = true;
  group.add(left);

  const leftBevel = new THREE.Mesh(shortBevel, cedarBevelMat);
  leftBevel.position.set(-bedWidth / 2 - FRAME_THICKNESS / 2, FRAME_HEIGHT + BEVEL_INSET / 2, 0);
  group.add(leftBevel);

  const right = new THREE.Mesh(shortPlank, cedarMat);
  right.position.set(bedWidth / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0);
  right.castShadow = true;
  right.receiveShadow = true;
  group.add(right);

  const rightBevel = new THREE.Mesh(shortBevel, cedarBevelMat);
  rightBevel.position.set(bedWidth / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT + BEVEL_INSET / 2, 0);
  group.add(rightBevel);

  // Back lattice trellis — closer to the real bed silhouette
  const trellisMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.82, metalness: 0.05 });
  const meshWireMat = new THREE.MeshStandardMaterial({
    color: 0x9c9b95,
    transparent: true,
    opacity: 0.42,
    roughness: 0.45,
    metalness: 0.55,
    wireframe: true,
  });
  const trellisZ = -bedDepth / 2 - FRAME_THICKNESS * 0.15;
  const trellisHeight = 1.2;
  const trellisWidth = bedWidth - 0.12;

  for (const x of [-trellisWidth / 2, trellisWidth / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, trellisHeight, 0.05), trellisMat);
    post.position.set(x, trellisHeight / 2, trellisZ);
    post.castShadow = true;
    group.add(post);
  }

  for (const y of [0.12, trellisHeight - 0.12]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(trellisWidth + 0.08, 0.05, 0.05), trellisMat);
    rail.position.set(0, y, trellisZ);
    rail.castShadow = true;
    group.add(rail);
  }

  const latticeCols = 8;
  const latticeRows = Math.max(5, rows + 1);
  for (let col = 0; col < latticeCols; col++) {
    const x = -trellisWidth / 2 + (col / (latticeCols - 1)) * trellisWidth;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.025, trellisHeight - 0.18, 0.02), trellisMat);
    slat.position.set(x, trellisHeight / 2, trellisZ);
    slat.castShadow = true;
    group.add(slat);
  }

  for (let row = 0; row < latticeRows; row++) {
    const y = 0.18 + (row / (latticeRows - 1)) * (trellisHeight - 0.36);
    const slat = new THREE.Mesh(new THREE.BoxGeometry(trellisWidth - 0.08, 0.025, 0.02), trellisMat);
    slat.position.set(0, y, trellisZ);
    slat.castShadow = true;
    group.add(slat);
  }

  // Trellis wires — horizontal tension wires across the trellis frame
  const trellisWireHeights = [0.3, 0.6, 0.9];
  for (const wy of trellisWireHeights) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, trellisWidth + 0.04, 4),
      new THREE.MeshStandardMaterial({ color: 0x8a8a7a, roughness: 0.5, metalness: 0.6 })
    );
    wire.rotation.z = Math.PI / 2;
    wire.position.set(0, wy, trellisZ - 0.01);
    wire.name = 'trellis-wire';
    group.add(wire);
  }

  // Front critter guard — low frame plus chicken wire
  const guardHeight = 0.42;
  const guardZ = bedDepth / 2 + FRAME_THICKNESS * 0.55;
  const frontMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(bedWidth - 0.12, guardHeight - 0.08, 10, 6),
    meshWireMat
  );
  frontMesh.position.set(0, guardHeight / 2 + 0.04, guardZ + 0.012);
  group.add(frontMesh);

  for (const x of [-bedWidth / 2 + 0.06, 0, bedWidth / 2 - 0.06]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, guardHeight, 0.04), trellisMat);
    post.position.set(x, guardHeight / 2, guardZ);
    group.add(post);
  }

  const guardRailTop = new THREE.Mesh(new THREE.BoxGeometry(bedWidth - 0.04, 0.04, 0.04), trellisMat);
  guardRailTop.position.set(0, guardHeight, guardZ);
  group.add(guardRailTop);

  // Grid lines between cells (thin dark strips)
  const gridLineThickness = 0.016;

  // Vertical grid lines (between columns)
  for (let col = 1; col < cols; col++) {
    const x = (col - cols / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(gridLineThickness, 0.005, bedDepth);
    const line = new THREE.Mesh(lineGeo, gridLineMat);
    line.position.set(x, SOIL_Y + 0.003, 0);
    group.add(line);
  }

  // Horizontal grid lines (between rows)
  for (let row = 1; row < rows; row++) {
    const z = (row - rows / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(bedWidth, 0.005, gridLineThickness);
    const line = new THREE.Mesh(lineGeo, gridLineMat);
    line.position.set(0, SOIL_Y + 0.003, z);
    group.add(line);
  }

  // Soil cells — 32 individual planes for raycasting with subtle height variation
  const cellGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
  const cellMeshes = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const soilMat = new THREE.MeshStandardMaterial(SOIL_MATERIAL);
      // Slight color variation per cell
      const rnd = seededRandom(index * 7 + 42);
      const colorShift = 0.02 * (rnd - 0.5);
      soilMat.color.offsetHSL(0, 0, colorShift);

      const cell = new THREE.Mesh(cellGeo, soilMat);
      cell.rotation.x = -Math.PI / 2;
      const x = (col - (cols - 1) / 2) * CELL_SIZE;
      const z = (row - (rows - 1) / 2) * CELL_SIZE;
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

  tracker?.trackObject(group);

  return {
    group,
    cellMeshes,
    cellSize: CELL_SIZE,
    soilY: SOIL_Y,
    frameHeight: FRAME_HEIGHT,
    cols,
    rows,
  };
}
