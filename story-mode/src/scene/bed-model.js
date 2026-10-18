/**
 * Bed Model — cedar frame + configurable soil grid.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLS, ROWS } from '../game/state.js';
import { projectUVs } from './yard-art/yard-backdrop.js';

const CELL_SIZE = 0.5;
const FRAME_HEIGHT = 0.15;
const FRAME_THICKNESS = 0.06;
const BEVEL_INSET = 0.008;
const SOIL_Y = FRAME_HEIGHT * 0.6;

const CEDAR_MATERIAL = { color: 0xffffff, roughness: 0.85, metalness: 0.05 };
const CEDAR_BEVEL_MATERIAL = { color: 0xffffff, roughness: 0.8, metalness: 0.08 };
const SOIL_MATERIAL = { color: 0xffffff, roughness: 0.96 };
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
    ctx.fillStyle = '#6b4e33';
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

function createSoilGeometry(seed, mound = 0.013) {
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
    const centerLift = (1 - radial) ** 2 * mound;
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
  const cedarTexture = createWoodTexture(0xa06a34, 0x7a4e22, 1.3, 1.3);
  const cedarBevelTexture = createWoodTexture(0x8f5c2c, 0x6a4520, 1.4, 1.4);
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

  const legacyFrame = [front, frontBevel, back, backBevel, left, leftBevel, right, rightBevel];

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

  /**
   * Yard art pass: swap the canvas-painted frame for a two-board wood frame
   * with corner posts (one merged mesh), give the soil the painted texture,
   * a fuller mound and a berm under the cells. Cell meshes, their userData,
   * materials and raycast targets are unchanged.
   */
  function setArtMaterials({ wood, soil } = {}) {
    if (!wood || !soil || group.userData.artFrame) return;
    legacyFrame.forEach((m) => { m.visible = false; });
    const parts = [];
    const outerW = bedWidth / 2 + FRAME_THICKNESS;
    const outerD = bedDepth / 2 + FRAME_THICKNESS;
    const boardH = FRAME_HEIGHT / 2;
    const add = (geo, x, y, z, rotY = 0, vertical = false) => {
      geo.rotateY(rotY);
      geo.translate(x, y, z);
      parts.push(projectUVs(geo, 2.2, vertical));
    };
    for (let b = 0; b < 2; b++) {
      const y = boardH * (b + 0.5);
      const inset = b === 0 ? 0.004 : 0;
      add(new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2, boardH - 0.006, FRAME_THICKNESS - inset), 0, y, bedDepth / 2 + FRAME_THICKNESS / 2);
      add(new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2, boardH - 0.006, FRAME_THICKNESS - inset), 0, y, -bedDepth / 2 - FRAME_THICKNESS / 2);
      add(new THREE.BoxGeometry(FRAME_THICKNESS - inset, boardH - 0.006, bedDepth), -bedWidth / 2 - FRAME_THICKNESS / 2, y, 0);
      add(new THREE.BoxGeometry(FRAME_THICKNESS - inset, boardH - 0.006, bedDepth), bedWidth / 2 + FRAME_THICKNESS / 2, y, 0);
    }
    // top cap boards, slightly proud of the frame
    const capT = 0.018;
    const capY = FRAME_HEIGHT + capT / 2;
    add(new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2 + 0.03, capT, FRAME_THICKNESS + 0.03), 0, capY, bedDepth / 2 + FRAME_THICKNESS / 2);
    add(new THREE.BoxGeometry(bedWidth + FRAME_THICKNESS * 2 + 0.03, capT, FRAME_THICKNESS + 0.03), 0, capY, -bedDepth / 2 - FRAME_THICKNESS / 2);
    add(new THREE.BoxGeometry(FRAME_THICKNESS + 0.03, capT, bedDepth), -bedWidth / 2 - FRAME_THICKNESS / 2, capY, 0);
    add(new THREE.BoxGeometry(FRAME_THICKNESS + 0.03, capT, bedDepth), bedWidth / 2 + FRAME_THICKNESS / 2, capY, 0);
    // corner posts and a mid post on each long side
    const post = 0.085;
    for (const [x, z] of [[-outerW, -outerD], [outerW, -outerD], [-outerW, outerD], [outerW, outerD], [0, outerD], [0, -outerD]]) {
      const px = x === 0 ? 0 : x - Math.sign(x) * (post / 2 - 0.012);
      const pz = z - Math.sign(z) * (post / 2 - 0.012);
      add(new THREE.BoxGeometry(post, FRAME_HEIGHT + 0.05, post), px, (FRAME_HEIGHT + 0.05) / 2, pz, 0, true);
      add(new THREE.ConeGeometry(post * 0.74, 0.03, 4, 1).rotateY(Math.PI / 4), px, FRAME_HEIGHT + 0.065, pz);
    }
    const merged = mergeGeometries(parts.map((g) => {
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      return g;
    }), false);
    merged.computeVertexNormals();
    const frameMat = new THREE.MeshStandardMaterial({ map: wood, color: 0xcdb293, roughness: 0.86, metalness: 0 });
    frameMat.name = 'yard-art-bed-frame';
    const frame = new THREE.Mesh(merged, frameMat);
    frame.name = 'yard-art-bed-frame';
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);
    group.userData.artFrame = frame;

    // soil berm under the cells hides the seams between cell tiles
    const soilTex = soil.clone();
    soilTex.repeat.set(cols, rows);
    soilTex.needsUpdate = true;
    const bermGeo = new THREE.PlaneGeometry(bedWidth, bedDepth, cols * 4, rows * 4);
    const bp = bermGeo.getAttribute('position');
    for (let i = 0; i < bp.count; i++) {
      const ex = Math.abs(bp.getX(i)) / (bedWidth / 2);
      const ey = Math.abs(bp.getY(i)) / (bedDepth / 2);
      bp.setZ(i, (1 - Math.max(ex, ey) ** 6) * 0.004);
    }
    bermGeo.computeVertexNormals();
    const berm = new THREE.Mesh(bermGeo, new THREE.MeshStandardMaterial({ map: soilTex, color: 0x9a8a78, roughness: 1, metalness: 0 }));
    berm.name = 'yard-art-bed-berm';
    berm.rotation.x = -Math.PI / 2;
    berm.position.y = SOIL_Y - 0.006;
    berm.receiveShadow = true;
    berm.raycast = () => {};
    group.add(berm);

    // painted soil + fuller mound on the existing cell meshes
    cellMeshes.forEach((cell, index) => {
      const old = cell.geometry;
      cell.geometry = createSoilGeometry(index * 17 + 23, 0.024);
      old.dispose();
      cell.material.map = soil;
      cell.material.bumpMap = soil;
      cell.material.bumpScale = 0.02;
      cell.material.needsUpdate = true;
      cell.castShadow = false;
    });
    tracker?.trackObject(frame);
    tracker?.trackObject(berm);
  }

  return {
    group,
    setArtMaterials,
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
