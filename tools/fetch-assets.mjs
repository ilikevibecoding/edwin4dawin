#!/usr/bin/env node
// Downloads all CC0 assets listed in tools/asset-manifest.json into public/assets.
// Idempotent: existing files are skipped. Usage: node tools/fetch-assets.mjs [--force]
import { mkdir, writeFile, stat, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets');
const API = 'https://api.polyhaven.com';
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 6;

const manifest = JSON.parse(await readFile(join(ROOT, 'tools', 'asset-manifest.json'), 'utf8'));

async function exists(path) {
  try { const s = await stat(path); return s.size > 0; } catch { return false; }
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, dest, attempt = 0) {
  if (!FORCE && await exists(dest)) return 'skip';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return `${(buf.length / 1e6).toFixed(2)} MB`;
  } catch (err) {
    if (attempt < 4) {
      await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
      return download(url, dest, attempt + 1);
    }
    throw new Error(`failed ${url}: ${err.message}`);
  }
}

const jobs = [];
const index = { textures: {}, models: {}, hdris: {} };

// --- HDRIs ---
for (const h of manifest.hdris) {
  const url = `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${h.res}/${h.id}_${h.res}.hdr`;
  const dest = join(OUT, 'hdri', `${h.id}_${h.res}.hdr`);
  index.hdris[h.id] = { file: `hdri/${h.id}_${h.res}.hdr`, res: h.res };
  jobs.push([url, dest]);
}

// --- Textures ---
for (const t of manifest.textures) {
  const files = await fetchJson(`${API}/files/${t.id}`);
  const pick = (mapName) => files[mapName]?.[t.res]?.jpg?.url;
  const maps = {};
  const diff = pick('Diffuse'); if (diff) maps.diff = diff;
  const nor = pick('nor_gl'); if (nor) maps.nor_gl = nor;
  const arm = pick('arm');
  if (arm) maps.arm = arm; else {
    const rough = pick('Rough'); if (rough) maps.rough = rough;
    const ao = pick('AO'); if (ao) maps.ao = ao;
  }
  const disp = pick('Displacement'); if (disp) maps.disp = disp;
  index.textures[t.id] = { res: t.res, role: t.role, maps: Object.keys(maps) };
  for (const [map, url] of Object.entries(maps)) {
    jobs.push([url, join(OUT, 'textures', t.id, `${map}.jpg`)]);
  }
}

// --- Models (glTF + referenced files) ---
for (const m of manifest.models) {
  const files = await fetchJson(`${API}/files/${m.id}`);
  const g = files.gltf?.[m.res]?.gltf;
  if (!g) { console.warn(`no gltf for ${m.id}`); continue; }
  const dir = join(OUT, 'models', m.id);
  const gltfName = g.url.split('/').pop();
  index.models[m.id] = { file: `models/${m.id}/${gltfName}` };
  jobs.push([g.url, join(dir, gltfName)]);
  for (const [rel, info] of Object.entries(g.include || {})) {
    jobs.push([info.url, join(dir, rel)]);
  }
}

// --- External ---
for (const e of manifest.external || []) {
  jobs.push([e.url, join(OUT, e.dest)]);
}

let done = 0;
const total = jobs.length;
async function worker() {
  while (jobs.length) {
    const [url, dest] = jobs.shift();
    const res = await download(url, dest);
    done++;
    console.log(`[${String(done).padStart(3)}/${total}] ${res.padEnd(9)} ${dest.replace(OUT + '/', '')}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log('done. index written to public/assets/index.json');
