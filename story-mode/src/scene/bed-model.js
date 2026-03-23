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
const SOIL_MATERIAL = { color: 0x4b3826, roughness: 0.96 };
const GRID_LINE_MATERIAL = { color: 0x4c402f, transparent: true, opacity: 0.16, roughness: 0.98, metalness: 0 };

// Seeded random for consistent soil terrain per cell
function seededRandom(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function seededNoise2D(seed, x, y) {
  const n = Math.sin((x + seed * 0.17) * 12.9898 + (y - seed * 0.11) * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function makeCanvasTexture(size, painter, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
  return texture;
}

function createWoodTexture(baseHex, grainHex, repeatX = 1, repeatY = 1) {
  const base = new THREE.Color(baseHex);
  const grain = new THREE.Color(grainHex);
  return makeCanvasTexture(192, (ctx, size) => {
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) {
      const wobble = Math.sin(y * 0.09) * 8;
      const blend = 0.18 + (Math.sin(y * 0.17) * 0.08 + 0.08);
      ctx.strokeStyle = `rgba(${Math.round(grain.r * 255)}, ${Math.round(grain.g * 255)}, ${Math.round(grain.b * 255)}, ${blend})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + wobble);
      ctx.lineTo(size, y - wobble * 0.25);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = (i * 37) % size;
      const y = (i * 19) % size;
      ctx.fillStyle = 'rgba(60,30,10,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + (i % 3) * 3, 3 + (i % 2) * 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, repeatX, repeatY);
}

function createSoilTexture() {
  return makeCanvasTexture(192, (ctx, size) => {
    ctx.fillStyle = '#4b3826';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      const x = (i * 73) % size;
      const y = (i * 41) % size;
      const r = 1 + (i % 3);
      const shade = 46 + (i % 42);
      ctx.fillStyle = `rgba(${shade}, ${28 + (i % 28)}, ${15 + (i % 20)}, 0.17)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 120; i++) {
      const x = (i * 29) % size;
      const y = (i * 61) % size;
      ctx.fillStyle = 'rgba(150,118,74,0.08)';
      ctx.fillRect(x, y, 6 + (i % 4), 2 + (i % 3));
    }
    for (let i = 0; i < 180; i++) {
      const x = (i * 17) % size;
      const y = (i * 97) % size;
      ctx.fillStyle = 'rgba(92,64,36,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + (i % 3), 1.5 + (i % 2), (i % 7) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1.4, 1.4);
}

function createSoilGeometry(seed) {
  const span = CELL_SIZE * 0.985;
  const geo = new THREE.PlaneGeometry(span, span, 12, 12);
  const pos = geo.getAttribute('position');
  const half = span / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / half;
    const ny = y / half;
    const radial = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    const centerLift = (1 - radial) ** 2 * 0.013;
    const edgeDip = radial * 0.0018;
    const noise = (seededNoise2D(seed, x * 3.1, y * 3.1) - 0.5) * 0.0048;
    const furrow = Math.sin((x + seed * 0.07) * 20) * 0.0012 * (1 - radial);
    pos.setZ(i, centerLift - edgeDip + noise + furrow);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

const ROW_LABEL_COLORS = [0x6688aa, 0x888888, 0x888888, 0x88aa66, 0xd2a95a, 0x88aa66, 0x88aa66, 0x88aa66];

function getRowLabel(row, rows) {
  if (row === 0) return 'Back · Wall';
  if (row === rows - 1) return 'Front · Access';
  return `Row ${row}`;
}

export function buildBed(tracker = null, cols = COLS, rows = ROWS) {
  const group = new THREE.Group();
  const gridLineMeshes = [];
  const labelSprites = [];
  const labelMarkers = [];
  const guardMeshes = [];
  const trellisWireMeshes = [];
  const cedarMat = new THREE.MeshStandardMaterial(CEDAR_MATERIAL);
  const cedarBevelMat = new THREE.MeshStandardMaterial(CEDAR_BEVEL_MATERIAL);
  const gridLineMat = new THREE.MeshStandardMaterial(GRID_LINE_MATERIAL);
  const cedarTexture = createWoodTexture(0x8b5a2b, 0x6e431d, 1.3, 1.3);
  const cedarBevelTexture = createWoodTexture(0x7a4e24, 0x5a3717, 1.4, 1.4);
  const soilTexture = createSoilTexture();

  cedarMat.map = cedarTexture;
  cedarMat.bumpMap = cedarTexture;
  cedarMat.bumpScale = 0.01;
  cedarBevelMat.map = cedarBevelTexture;
  cedarBevelMat.bumpMap = cedarBevelTexture;
  cedarBevelMat.bumpScale = 0.008;

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
    color: 0x8a8478,
    transparent: true,
    opacity: 0.18,
    roughness: 0.52,
    metalness: 0.55,
    wireframe: true,
  });
  const trellisZ = -bedDepth / 2 - FRAME_THICKNESS * 0.15;
  const trellisHeight = 1.2;
  const trellisWidth = bedWidth - 0.12;

  for (const x of [-trellisWidth / 2, trellisWidth / 2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, trellisHeight, 8), trellisMat);
    post.position.set(x, trellisHeight / 2, trellisZ);
    post.castShadow = true;
    group.add(post);
  }

  for (const y of [0.12, trellisHeight - 0.12]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, trellisWidth + 0.08, 8), trellisMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, y, trellisZ);
    rail.castShadow = true;
    group.add(rail);
  }

  const latticeCols = 8;
  const latticeRows = Math.max(5, rows + 1);
  for (let col = 0; col < latticeCols; col++) {
    const x = -trellisWidth / 2 + (col / (latticeCols - 1)) * trellisWidth;
    const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, trellisHeight - 0.18, 7), trellisMat);
    slat.position.set(x, trellisHeight / 2, trellisZ);
    slat.castShadow = true;
    group.add(slat);
  }

  for (let row = 0; row < latticeRows; row++) {
    const y = 0.18 + (row / (latticeRows - 1)) * (trellisHeight - 0.36);
    const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, trellisWidth - 0.08, 7), trellisMat);
    slat.rotation.z = Math.PI / 2;
    slat.position.set(0, y, trellisZ);
    slat.castShadow = true;
    group.add(slat);
  }

  // Trellis wires — horizontal tension wires across the trellis frame
  const trellisWireHeights = [0.3, 0.6, 0.9];
  for (const wy of trellisWireHeights) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, trellisWidth + 0.04, 6),
      new THREE.MeshStandardMaterial({ color: 0x807b72, roughness: 0.6, metalness: 0.45, transparent: true, opacity: 0.58 })
    );
    wire.rotation.z = Math.PI / 2;
    wire.position.set(0, wy, trellisZ - 0.01);
    wire.name = 'trellis-wire';
    group.add(wire);
    trellisWireMeshes.push(wire);
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
  guardMeshes.push(frontMesh);

  for (const x of [-bedWidth / 2 + 0.06, 0, bedWidth / 2 - 0.06]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, guardHeight, 7), trellisMat);
    post.position.set(x, guardHeight / 2, guardZ);
    group.add(post);
  }

  const guardRailTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, bedWidth - 0.04, 7), trellisMat);
  guardRailTop.rotation.z = Math.PI / 2;
  guardRailTop.position.set(0, guardHeight, guardZ);
  group.add(guardRailTop);

  // Grid lines between cells (thin dark strips)
  const gridLineThickness = 0.004;

  // Vertical grid lines (between columns)
  for (let col = 1; col < cols; col++) {
    const x = (col - cols / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(gridLineThickness, 0.003, bedDepth);
    const line = new THREE.Mesh(lineGeo, gridLineMat);
    line.position.set(x, SOIL_Y + 0.001, 0);
    group.add(line);
    gridLineMeshes.push(line);
  }

  // Horizontal grid lines (between rows)
  for (let row = 1; row < rows; row++) {
    const z = (row - rows / 2) * CELL_SIZE;
    const lineGeo = new THREE.BoxGeometry(bedWidth, 0.003, gridLineThickness);
    const line = new THREE.Mesh(lineGeo, gridLineMat);
    line.position.set(0, SOIL_Y + 0.001, z);
    group.add(line);
    gridLineMeshes.push(line);
  }

  // Soil cells — 32 individual planes for raycasting with subtle height variation
  const cellMeshes = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const cellGeo = createSoilGeometry(index * 17 + 23);
      const soilMat = new THREE.MeshStandardMaterial(SOIL_MATERIAL);
      soilMat.map = soilTexture;
      soilMat.bumpMap = soilTexture;
      soilMat.bumpScale = 0.012;
      // Slight color variation per cell
      const rnd = seededRandom(index * 7 + 42);
      const colorShift = 0.02 * (rnd - 0.5);
      soilMat.color.offsetHSL(0, 0, colorShift);

      const cell = new THREE.Mesh(cellGeo, soilMat);
      cell.rotation.x = -Math.PI / 2;
      const x = (col - (cols - 1) / 2) * CELL_SIZE;
      const z = (row - (rows - 1) / 2) * CELL_SIZE;
      // Subtle terrain: slight height variation per cell
      const heightOffset = (seededRandom(index * 13 + 97) - 0.5) * 0.008;
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
  for (let row = 0; row < rows; row++) {
    const z = (row - (rows - 1) / 2) * CELL_SIZE;
    const markerX = -bedWidth / 2 - FRAME_THICKNESS - 0.05;

    // Small colored cube marker
    const markerGeo = new THREE.SphereGeometry(0.035, 10, 8);
    const markerMat = new THREE.MeshStandardMaterial({
      color: ROW_LABEL_COLORS[row],
      roughness: 0.5,
      emissive: ROW_LABEL_COLORS[row],
      emissiveIntensity: 0.3,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(markerX, FRAME_HEIGHT * 0.5, z);
    marker.scale.set(1, 0.9, 1);
    group.add(marker);
    labelMarkers.push(marker);

    // Canvas-based text sprite for the label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(18,12,8,0.76)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(0, 8, 212, 48, 16);
      ctx.fill();
    } else {
      ctx.fillRect(0, 8, 212, 48);
    }
    ctx.strokeStyle = 'rgba(232,200,74,0.42)';
    ctx.lineWidth = 2;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(1, 9, 210, 46, 15);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 9, 210, 46);
    }
    ctx.font = '600 28px monospace';
    ctx.fillStyle = '#f4ead8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;
    ctx.fillText(getRowLabel(row, rows), 14, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.92 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.84, 0.21, 1);
    sprite.position.set(markerX - 0.48, FRAME_HEIGHT * 0.62, z);
    group.add(sprite);
    labelSprites.push(sprite);
  }

  tracker?.trackObject(group);

  return {
    group,
    cellMeshes,
    gridLineMeshes,
    labelSprites,
    labelMarkers,
    guardMeshes,
    trellisWireMeshes,
    cellSize: CELL_SIZE,
    soilY: SOIL_Y,
    frameHeight: FRAME_HEIGHT,
    cols,
    rows,
  };
}
