#!/usr/bin/env node
/**
 * Yard art export + budget gate.
 *
 *   node scripts/art/export-and-budget.mjs [--bake] [--textures] [--capture] [--max-mb=4.7] [--max-calls=450]
 *
 * 1. --bake      re-run the Blender asset script (headless) into art-src/build/
 * 2. --textures  re-paint the tiling WebP textures (python3 + numpy + Pillow)
 * 3. always      compress every art-src/build/*.glb with gltf-transform
 *                (meshopt geometry) into assets/art/yard/, and convert the
 *                baked *_atlas.png files to WebP beside them
 * 4. always      fail if assets/art/yard/ is over the byte budget
 * 5. --capture   boot the game headless (SwiftShader) and fail if the opening
 *                yard renders more than --max-calls draw calls (desktop + phone)
 *
 * Exits non-zero on any failure. Needs `blender` and `gltf-transform` on PATH
 * (see STYLE_KIT.md for the setup).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SRC = join(ROOT, 'art-src');
const BUILD = join(SRC, 'build');
const OUT = join(ROOT, 'assets/art/yard');

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const MAX_MB = Number(args['max-mb'] ?? 4.7);
const MAX_CALLS = Number(args['max-calls'] ?? 450);
const failures = [];

function run(cmd, argv, opts = {}) {
  console.log(`$ ${cmd} ${argv.join(' ')}`);
  const r = spawnSync(cmd, argv, { stdio: 'inherit', cwd: ROOT, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}`);
}

function gltfTransformBin() {
  try { execFileSync('gltf-transform', ['--version'], { stdio: 'ignore' }); return ['gltf-transform']; } catch { /* fall through */ }
  return ['npx', '--yes', '@gltf-transform/cli@4'];
}

if (args.bake) {
  run('blender', ['-b', '--factory-startup', '-P', join(SRC, 'blender/build_yard_assets.py'), '--', BUILD]);
}
if (args.textures) {
  run('python3', [join(SRC, 'textures/make_textures.py')]);
}

mkdirSync(OUT, { recursive: true });
const glbs = existsSync(BUILD) ? readdirSync(BUILD).filter((f) => f.endsWith('.glb')) : [];
if (glbs.length === 0) failures.push(`no source .glb files in ${BUILD} (run with --bake)`);
const [gt, ...gtPre] = gltfTransformBin();
for (const f of glbs) {
  run(gt, [...gtPre, 'optimize', join(BUILD, f), join(OUT, f),
    '--compress', 'meshopt',
    '--texture-compress', 'webp', // no-op for geometry-only files; kept for future embedded textures
    '--texture-size', '1024',
    // keep named prop nodes and the single cottage mesh as authored
    '--flatten', 'false', '--join', 'false', '--instance', 'false',
    '--palette', 'false', '--simplify', 'false',
    // the atlas lives outside the .glb, so keep UVs that no glTF texture references
    '--prune-attributes', 'false']);
}

// baked atlases ship as WebP files beside the geometry-only .glb files
const atlases = existsSync(BUILD) ? readdirSync(BUILD).filter((f) => f.endsWith('_atlas.png')) : [];
for (const f of atlases) {
  run('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=88, method=6)',
    join(BUILD, f), join(OUT, f.replace(/\.png$/, '.webp'))]);
}

// ---- byte budget ----------------------------------------------------------
const files = readdirSync(OUT).filter((f) => !f.startsWith('.'));
let total = 0;
console.log('\nYard art payload (assets/art/yard):');
for (const f of files.sort()) {
  const size = statSync(join(OUT, f)).size;
  total += size;
  console.log(`  ${f.padEnd(22)} ${(size / 1024).toFixed(1).padStart(8)} KB`);
}
const mb = total / 1e6;
console.log(`  ${'TOTAL'.padEnd(22)} ${(total / 1024).toFixed(1).padStart(8)} KB  (${mb.toFixed(3)} MB, budget ${MAX_MB} MB)`);
if (mb > MAX_MB) failures.push(`art payload ${mb.toFixed(3)} MB > ${MAX_MB} MB`);

// ---- draw-call budget -----------------------------------------------------
if (args.capture) {
  const outDir = join(ROOT, 'art-src/build/budget-capture');
  run('node', [join(HERE, 'capture-yard.mjs'), outDir, 'budget']);
  const report = JSON.parse(readFileSync(join(outDir, 'budget-report.json'), 'utf8'));
  for (const [vp, r] of Object.entries(report)) {
    console.log(`  ${vp}: ${r.calls} draw calls, ${r.tris} tris, art bytes ${r.artBytes}`);
    if (r.calls > MAX_CALLS) failures.push(`${vp}: ${r.calls} draw calls > ${MAX_CALLS}`);
  }
}

if (failures.length) {
  console.error(`\nBUDGET FAIL:\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('\nBudget OK');
