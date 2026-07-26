#!/usr/bin/env node
import { createTerrain } from '../src/terrain.js';
import { macroVariation } from '../src/textures/ground.js';

// Road-space sanity check. Walks a lateral cross-section through the mesh's
// own attributes and prints what the fragment shader would see, so a missing
// rut or print can be traced to the attribute rather than guessed at from a
// software render.
//
//   node tools/roadprobe.mjs [--t 0.5]

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const t = Number(arg('t', '0.5'));

const terrain = createTerrain({});
const geo = terrain.mesh.geometry;
const pos = geo.getAttribute('position');
const side = geo.getAttribute('aSide');
const edge = geo.getAttribute('aEdge');
const along = geo.getAttribute('aAlong');

// what the shader's road-space macro lookup returns, sampled from the same
// texture data
const macro = macroVariation();
const mw = macro.image.width;
const md = macro.image.data;
const macroAt = (u, v) => {
  const x = ((Math.floor(u * mw) % mw) + mw) % mw;
  const y = ((Math.floor(v * mw) % mw) + mw) % mw;
  const i = (y * mw + x) * 4;
  return [md[i] / 255, md[i + 1] / 255, md[i + 2] / 255, md[i + 3] / 255];
};
console.log('road-space macro along the centreline (rsp.r gates the tyre print)');
for (let s = 0; s < 340; s += 10) {
  const rsp = macroAt(s * 0.021, 0.3);
  process.stdout.write(`  s=${String(s).padStart(3)} r=${rsp[0].toFixed(2)} a=${rsp[3].toFixed(2)}\n`);
}

const p = terrain.roadPoint(t);
const tan = terrain.roadTangent(t);
const rx = tan.z;
const rz = -tan.x;

const ROAD_HALF = terrain.roadHalf;
const RUT_C = 0.845;
const RUT_W = 0.33;
console.log('lateral   side    edge  along     y    mTrack  mRut  mCrown  treadU');
for (let o = -6; o <= 6; o += 0.25) {
  const x = p.x + rx * o;
  const z = p.z + rz * o;
  // nearest mesh vertex, which is what the shader actually interpolates
  let best = 1e9;
  let bi = -1;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - x;
    const dz = pos.getZ(i) - z;
    const d = dx * dx + dz * dz;
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  const s = side.getX(bi);
  const e = edge.getX(bi);
  const ax = Math.abs(s);
  const mTrack = 1 - smoothstep(ROAD_HALF - 0.45, ROAD_HALF + 0.7, e);
  const dRut = ax - RUT_C;
  const mRut = Math.exp(-(dRut * dRut) / (2 * RUT_W * RUT_W)) * mTrack;
  const mCrown = (1 - smoothstep(0.18, 0.66, ax)) * mTrack;
  const treadU = (s - Math.sign(s) * RUT_C) * 2.9;
  console.log(
    `${o.toFixed(2).padStart(6)} ${s.toFixed(2).padStart(6)} ${e.toFixed(2).padStart(6)} ${along
      .getX(bi)
      .toFixed(1)
      .padStart(6)} ${pos.getY(bi).toFixed(3).padStart(7)} ${mTrack.toFixed(2).padStart(6)} ${mRut
      .toFixed(2)
      .padStart(5)} ${mCrown.toFixed(2).padStart(6)} ${treadU.toFixed(2).padStart(7)}`,
  );
}

function smoothstep(e0, e1, x) {
  const v = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return v * v * (3 - 2 * v);
}
