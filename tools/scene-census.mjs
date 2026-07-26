#!/usr/bin/env node
// Scene census: where the draw calls come from.
//
// Boots the game, walks Engine.scene at a checkpoint and reports the renderable
// population grouped by the top-level scene group, plus the geometries and
// materials that are duplicated the most (the instancing/merge candidates).
//
// Usage: node tools/scene-census.mjs [checkpoint] [--json out.json]
//   checkpoint: a name from qa.listCheckpoints() (default: lobby)
//   Base URL from BASE_URL (default http://127.0.0.1:5173).

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootGame, closeBrowser, launchArgs } from './lib/harness.mjs';

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
const checkpoint = args.find((a) => !a.startsWith('--') && a !== jsonOut) || 'lobby';

const browser = await chromium.launch({ args: launchArgs });
const { page, errors } = await bootGame(browser);

await page.evaluate(async (cp) => {
  const q = window.__qa;
  q.startMission({});
  await window.__waitForPlaying();
  q.freezeAI(true);
  q.god(true);
  q.teleport(cp);
  q.lookYawPitch(0, 0);
  window.advanceTime(600);
}, checkpoint);

const census = await page.evaluate(async () => {
  const Engine = window.__engine;              // live instance (see testhooks)
  const scene = Engine.scene;
  const camera = Engine.camera;

  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);

  // Frustum planes straight off the view-projection matrix. Doing the algebra
  // here keeps the tool free of a bare 'three' specifier, which the browser
  // cannot resolve outside Vite's import rewriting.
  const mul = (p, v) => {                     // column-major, C = P · V
    const out = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += p[k * 4 + r] * v[c * 4 + k];
        out[c * 4 + r] = s;
      }
    }
    return out;
  };
  const m = mul(camera.projectionMatrix.elements, camera.matrixWorldInverse.elements);
  const at = (row, col) => m[col * 4 + row];
  const planes = [];
  for (const [row, sign] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
    let [x, y, z, w] = [0, 1, 2, 3].map((c) => at(3, c) + sign * at(row, c));
    const len = Math.hypot(x, y, z) || 1;
    planes.push([x / len, y / len, z / len, w / len]);
  }
  const sphereInFrustum = (cx, cy, cz, r) =>
    planes.every(([nx, ny, nz, d]) => nx * cx + ny * cy + nz * cz + d >= -r);

  // the group a node belongs to, for reporting: nearest named ancestor under the
  // scene root, falling back to the root child itself
  const labelOf = (obj) => {
    const chain = [];
    for (let o = obj; o && o !== scene; o = o.parent) chain.unshift(o);
    const root = chain[0];
    if (!root) return '(scene)';
    const rootName = root.name || `${root.type}#anon`;
    const second = chain[1];
    if (!second || chain.length < 3) return rootName;
    return `${rootName} / ${second.name || second.type}`;
  };

  const groups = new Map();
  const geoms = new Map();
  const mats = new Map();
  const lights = [];
  let renderable = 0, hidden = 0, inFrustum = 0, drawUnits = 0, tris = 0;

  const visibleUp = (obj) => {
    for (let o = obj; o && o !== scene; o = o.parent) if (!o.visible) return false;
    return true;
  };

  scene.traverse((obj) => {
    if (obj.isLight) {
      lights.push({ type: obj.type, name: obj.name || '', castShadow: !!obj.castShadow, visible: obj.visible });
      return;
    }
    if (!obj.isMesh && !obj.isLine && !obj.isPoints && !obj.isSprite) return;
    renderable++;
    const shown = visibleUp(obj);
    if (!shown) { hidden++; return; }

    const label = labelOf(obj);
    const g = groups.get(label) || { group: label, meshes: 0, instanced: 0, instances: 0, inFrustum: 0, drawUnits: 0, triangles: 0 };
    g.meshes++;

    // a material array is one draw call per group; InstancedMesh is one call for
    // all of its copies
    const matCount = Array.isArray(obj.material) ? obj.material.length : 1;
    const units = obj.isInstancedMesh ? 1 : matCount;
    g.drawUnits += units;
    drawUnits += units;
    if (obj.isInstancedMesh) { g.instanced++; g.instances += obj.count; }

    const geo = obj.geometry;
    let t = 0;
    if (geo) {
      const idx = geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0);
      t = Math.round((idx / 3) * (obj.isInstancedMesh ? obj.count : 1));
      g.triangles += t;
      tris += t;
      const key = `${geo.type}:${geo.uuid.slice(0, 8)}`;
      const rec = geoms.get(geo.uuid) || { key, type: geo.type, name: geo.name || '', users: 0, triangles: Math.round(idx / 3) };
      rec.users++;
      geoms.set(geo.uuid, rec);
    }

    for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      if (!m) continue;
      const rec = mats.get(m.uuid) || { name: m.name || '(unnamed)', type: m.type, transparent: !!m.transparent, users: 0 };
      rec.users++;
      mats.set(m.uuid, rec);
    }

    let visibleNow = true;
    if (obj.geometry) {
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      const bs = obj.geometry.boundingSphere;
      const e = obj.matrixWorld.elements;
      const [x, y, z] = [bs.center.x, bs.center.y, bs.center.z];
      const cx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const cy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const cz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const scale = Math.max(
        Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]),
      );
      visibleNow = sphereInFrustum(cx, cy, cz, bs.radius * scale);
    }
    if (visibleNow) { inFrustum++; g.inFrustum++; }

    groups.set(label, g);
  });

  const perf = Engine.getPerf();
  const info = Engine.renderer.info;
  return {
    checkpoint: null,
    perf,
    rendererInfo: {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : null,
      shadowMapEnabled: Engine.renderer.shadowMap.enabled,
    },
    totals: { renderable, hidden, inFrustum, drawUnits, triangles: tris, lights: lights.length,
      shadowCasters: lights.filter((l) => l.castShadow).length },
    lights,
    groups: [...groups.values()].sort((a, b) => b.drawUnits - a.drawUnits),
    topGeometries: [...geoms.values()].filter((g) => g.users > 1).sort((a, b) => b.users - a.users).slice(0, 20),
    topMaterials: [...mats.values()].sort((a, b) => b.users - a.users).slice(0, 20),
    uniqueGeometries: geoms.size,
    uniqueMaterials: mats.size,
  };
});
census.checkpoint = checkpoint;

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log(`\n=== scene census @ ${checkpoint} ===`);
console.log(`draw calls ${census.rendererInfo.calls}  triangles ${census.rendererInfo.triangles}` +
  `  geometries ${census.rendererInfo.geometries}  textures ${census.rendererInfo.textures}` +
  `  programs ${census.rendererInfo.programs}`);
console.log(`renderables ${census.totals.renderable} (hidden ${census.totals.hidden}), ` +
  `in frustum ${census.totals.inFrustum}, draw units ${census.totals.drawUnits}, ` +
  `scene triangles ${census.totals.triangles}`);
console.log(`lights ${census.totals.lights} (${census.totals.shadowCasters} casting shadows), ` +
  `unique geometries ${census.uniqueGeometries}, unique materials ${census.uniqueMaterials}\n`);

console.log(`${pad('group', 44)}${num('meshes', 8)}${num('frustum', 9)}${num('units', 8)}${num('ktris', 8)}`);
for (const g of census.groups) {
  console.log(pad(g.group.slice(0, 43), 44) + num(g.meshes, 8) + num(g.inFrustum, 9) +
    num(g.drawUnits, 8) + num((g.triangles / 1000).toFixed(1), 8) +
    (g.instanced ? `  (${g.instanced} InstancedMesh, ${g.instances} copies)` : ''));
}

console.log(`\ntop shared geometries (merge/instancing candidates)`);
for (const g of census.topGeometries) {
  console.log(`  ${num(g.users, 5)}×  ${pad(g.type, 22)}${num(g.triangles, 7)} tris  ${g.name}`);
}
console.log(`\ntop shared materials`);
for (const m of census.topMaterials) {
  console.log(`  ${num(m.users, 5)}×  ${pad(m.type, 22)}${m.transparent ? ' transparent ' : ' opaque      '}${m.name}`);
}

if (jsonOut) {
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(census, null, 2));
  console.log(`\njson -> ${jsonOut}`);
}
console.log(`console errors: ${errors.length}`);
for (const e of errors.slice(0, 8)) console.log('E:', e.slice(0, 300));

await closeBrowser(browser);
process.exit(errors.length ? 1 : 0);
