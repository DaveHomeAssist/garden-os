/**
 * Write the gardener glb + atlas from the live mesh builder.
 * Run from story-mode/: node scripts/art/build-gardener.mjs
 *
 * The game builds the same mesh in process (profile recoloring needs a live
 * atlas). This file is the portable, meshopt-compressed copy: one material,
 * one external atlas.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildGardener } from '../../src/scene/gardener-model.js';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/art/gardener');

class FileReaderPolyfill {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.({ target: this });
    });
  }
}
globalThis.FileReader = FileReaderPolyfill;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(8 + body.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + body.length);
  return out;
}

function pngFromRgba(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.subarray(y * width * 4, (y + 1) * width * 4).forEach((b, i) => { raw[row + 1 + i] = b; });
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const view = buildGardener();
view.material.map = null;
view.material.vertexColors = true;
const exporter = new GLTFExporter();
const binary = await exporter.parseAsync(view.mesh, { binary: true, onlyVisible: false });
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.readBinary(new Uint8Array(binary));
console.log('before', {
  skins: doc.getRoot().listSkins().length,
  nodes: doc.getRoot().listNodes().length,
  meshes: doc.getRoot().listMeshes().length,
});
const png = pngFromRgba(128, 128, view.atlas.data);
const texture = doc.createTexture('gardener-atlas')
  .setImage(png)
  .setMimeType('image/png')
  .setURI('gardener-atlas.png');
const materials = doc.getRoot().listMaterials();
if (materials.length !== 1) throw new Error(`expected 1 material, got ${materials.length}`);
materials[0].setBaseColorTexture(texture);
await doc.transform(meshopt({ encoder: MeshoptEncoder }));
console.log('after', { skins: doc.getRoot().listSkins().length });
const glb = await io.writeBinary(doc);
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'gardener.glb'), glb);
await writeFile(resolve(outDir, 'gardener-atlas.png'), png);
const tris = view.triangleCount;
console.log(`gardener.glb ${glb.byteLength} bytes, atlas ${png.length} bytes, ${tris} tris, ${materials.length} material`);
if (tris < 5000 || tris > 8000) throw new Error(`triangle budget ${tris}`);
