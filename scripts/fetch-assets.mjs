#!/usr/bin/env node
/**
 * Downloads CC0 assets (Poly Haven textures + HDRI), the three.js example
 * soldier model (MIT), and OFL fonts for the HUD. Assets are committed to the
 * repo so the game runs offline. Safe to re-run; skips files that exist.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public', 'assets');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function download(url, dest, label) {
  if (await exists(dest)) { console.log(`[skip] ${label}`); return true; }
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) { console.warn(`[fail ${res.status}] ${label} ${url}`); return false; }
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    console.log(`[ok] ${label} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    console.warn(`[error] ${label}: ${e.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Poly Haven textures. We resolve real file URLs through the API so we never
// guess filenames. For each asset we take 2K JPGs of the maps we need.
// ---------------------------------------------------------------------------
const TEXTURES = [
  // ground / streets
  { id: 'asphalt_02', as: 'asphalt' },
  { id: 'concrete_floor_worn_001', as: 'concrete_floor' },
  { id: 'concrete_floor_02', as: 'concrete_floor_2' },
  { id: 'gravel_embedded_concrete', as: 'gravel_concrete' },
  { id: 'dry_dirt', as: 'dirt' },
  { id: 'dirty_concrete', as: 'dirty_concrete' },
  // walls
  { id: 'concrete_wall_004', as: 'concrete_wall' },
  { id: 'concrete_wall_008', as: 'concrete_wall_2' },
  { id: 'painted_plaster_wall', as: 'plaster_painted' },
  { id: 'patched_plaster_wall', as: 'plaster_patched' },
  { id: 'plastered_stone_wall', as: 'plaster_stone' },
  { id: 'brick_wall_04', as: 'brick' },
  { id: 'red_brick_03', as: 'brick_red' },
  { id: 'brick_wall_02', as: 'brick_2' },
  { id: 'rock_wall_08', as: 'rock_wall' },
  // metal / misc
  { id: 'metal_plate_02', as: 'metal_plate' },
  { id: 'corrugated_iron_02', as: 'corrugated' },
  { id: 'corrugated_iron', as: 'corrugated_2' },
  { id: 'rusty_metal_02', as: 'rusty_metal' },
  { id: 'rusty_metal_sheet', as: 'rusty_sheet' },
  { id: 'metal_plate', as: 'metal_plate_2' },
  { id: 'green_metal_rust', as: 'metal_rust_green' },
  // fabric (sandbags, tarps)
  { id: 'fabric_pattern_07', as: 'fabric' },
  { id: 'denim_fabric', as: 'denim' },
  { id: 'leather_red_02', as: 'leather' },
  // wood
  { id: 'weathered_planks', as: 'planks' },
  { id: 'worn_planks', as: 'planks_2' },
  { id: 'rough_wood', as: 'rough_wood' },
];

const WANTED_MAPS = [
  ['Diffuse', 'diff'],
  ['nor_gl', 'normal'],
  ['Rough', 'rough'],
  ['AO', 'ao'],
  ['arm', 'arm'],
  ['Displacement', 'disp'],
];

async function fetchTexture({ id, as }) {
  let files;
  try {
    const res = await fetch(`https://api.polyhaven.com/files/${id}`);
    if (!res.ok) { console.warn(`[no-asset] ${id}`); return; }
    files = await res.json();
  } catch (e) {
    console.warn(`[api-error] ${id}: ${e.message}`);
    return;
  }
  for (const [key, short] of WANTED_MAPS) {
    const node = files[key];
    if (!node) continue;
    const twoK = node['2k'];
    if (!twoK) continue;
    const jpg = twoK.jpg || twoK.png;
    if (!jpg?.url) continue;
    const ext = jpg.url.endsWith('.png') ? 'png' : 'jpg';
    await download(jpg.url, join(OUT, 'textures', as, `${short}.${ext}`), `${as}/${short}`);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  await mkdir(OUT, { recursive: true });

  // HDRIs (2K is plenty for IBL + sky background)
  await download(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_02_puresky_2k.hdr',
    join(OUT, 'hdri', 'sunset.hdr'), 'hdri/sunset');
  await download(
    'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr',
    join(OUT, 'hdri', 'day.hdr'), 'hdri/day');

  // Soldier model with animations (three.js examples, MIT)
  await download(
    'https://threejs.org/examples/models/gltf/Soldier.glb',
    join(OUT, 'models', 'soldier.glb'), 'models/soldier');

  // HUD fonts (OFL) — Rajdhani has that military-stencil-adjacent look
  const fonts = [
    ['https://github.com/google/fonts/raw/main/ofl/rajdhani/Rajdhani-Medium.ttf', 'Rajdhani-Medium.ttf'],
    ['https://github.com/google/fonts/raw/main/ofl/rajdhani/Rajdhani-SemiBold.ttf', 'Rajdhani-SemiBold.ttf'],
    ['https://github.com/google/fonts/raw/main/ofl/rajdhani/Rajdhani-Bold.ttf', 'Rajdhani-Bold.ttf'],
    ['https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf', 'Oswald.ttf'],
  ];
  for (const [url, name] of fonts) {
    await download(url, join(OUT, 'fonts', name), `fonts/${name}`);
  }

  // Textures — a few at a time to be polite
  const queue = [...TEXTURES];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) await fetchTexture(queue.shift());
  });
  await Promise.all(workers);

  console.log('Asset fetch complete.');
}

main();
