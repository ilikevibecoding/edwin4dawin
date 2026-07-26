#!/usr/bin/env node
// Times the CPU side of the ground build outside the browser: procedural
// texture generation and the terrain mesh build, separately.
const t = (label, fn) => {
  const a = performance.now();
  const r = fn();
  console.log(`${label}: ${(performance.now() - a).toFixed(0)} ms`);
  return r;
};

const g = await import('../src/textures/ground.js');
t('trackMaps', () => g.trackMaps());
t('vergeMaps', () => g.vergeMaps());
t('litterMaps', () => g.litterMaps());
t('treadImprint', () => g.treadImprint());
t('detailNormal', () => g.detailNormal());
t('macroVariation', () => g.macroVariation());
t('dustPuff', () => g.dustPuff());

const { createTerrain } = await import('../src/terrain.js');
const terrain = t('createTerrain', () => createTerrain({}));
console.log(terrain.stats);

// road cross-section at the pre-roll position, to check the ruts and the crown
// actually exist in the geometry at the height the truck's wheels want
const T = 0.49;
const p = terrain.roadPoint(T);
const tan = terrain.roadTangent(T);
const nx = tan.z;
const nz = -tan.x;
console.log(`\ncross-section at t=${T}  (x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)}, y ${p.y.toFixed(2)})`);
const rows = [];
for (let d = -6; d <= 6.001; d += 0.25) {
  const y = terrain.heightAt(p.x + nx * d, p.z + nz * d);
  rows.push({ d: d.toFixed(2), y });
}
const y0 = terrain.heightAt(p.x, p.z);
for (const r of rows) {
  const rel = r.y - y0;
  const bar = Math.round((rel + 0.4) * 60);
  console.log(`${String(r.d).padStart(6)}  ${rel >= 0 ? '+' : ''}${rel.toFixed(3)}  ${' '.repeat(Math.max(0, bar))}#`);
}
const centre = terrain.heightAt(p.x, p.z);
for (const off of [0.845, -0.845]) {
  const wy = terrain.heightAt(p.x + nx * off, p.z + nz * off);
  console.log(`wheel at ${off}: drop ${(wy - centre).toFixed(3)} m (suspension travel is 0.11)`);
}
