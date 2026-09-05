#!/usr/bin/env node
// Cross-section of the gravel mainline, out of the browser. Crown, shoulder,
// windrow, ditch and batter are a set of numbers before they are a picture, and
// a 4 cm crown that has come out as 4 mm is not something a software render at
// 448 px is going to tell you.
//
//   node tools/mainprobe.mjs [--t 0.55] [--step 0.25] [--span 13]
//
// Also prints the long profile of the spur into the junction and whether the
// junction is in sight from each point on it, and the worst wheel-to-wheel
// cross drop on each road, which is the number the ride is actually made of:
// the suspension has 0.16 m of travel, so a road that asks for more than that
// between one wheel and the other is a road the body has to move for.
//
// NO_MAIN=1 builds the world with the mainline switched off at the road lookup
// every downstream system keys off, which is the like-for-like baseline for
// what the second road costs in triangles and in build time.
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const { createTerrain } = await import('../src/terrain.js');
const t0 = performance.now();
const terrain = createTerrain({});
console.log(`createTerrain: ${(performance.now() - t0).toFixed(0)} ms`);
console.log(terrain.stats);
const j = terrain.junction;
console.log(
  `junction: world (${j.x.toFixed(1)}, ${j.z.toFixed(1)}) y ${j.y.toFixed(2)}  ` +
    `trailT ${j.trailT.toFixed(4)}  mainT ${j.mainT.toFixed(4)}  mainLength ${terrain.mainLength.toFixed(0)} m`,
);

const step = Number(arg('step', '0.25'));
const span = Number(arg('span', '13'));

// Long profile up the spur into the junction, and the sight line along it.
// Every approach framing built by eye put the camera behind a berm or below a
// crest and came back with no mainline in it at all, which was then read as
// "the junction does not carry" for two rounds. Whether the graded surface can
// be seen from the spur is a geometry question and it has an answer.
{
  const j = terrain.junction;
  const L = terrain.roadLength;
  console.log(`\n--- spur long profile into the junction  (trail length ${L.toFixed(0)} m)`);
  const eye = 1.6;
  const rows = [];
  for (let d = -60; d <= 12.001; d += 3) {
    const t = j.trailT + d / L;
    const p = terrain.roadPoint(t);
    rows.push({ d, y: terrain.heightAt(p.x, p.z), x: p.x, z: p.z });
  }
  const jy = terrain.heightAt(j.x, j.z);
  const lo = Math.min(...rows.map((r) => r.y));
  const hi = Math.max(...rows.map((r) => r.y));
  for (const r of rows) {
    const col = Math.round(((r.y - lo) / Math.max(1e-4, hi - lo)) * 46);
    // Highest terrain between here and the junction, as an angle from the eye.
    // If it clears the junction's own surface, the junction is behind a crest.
    let block = -9;
    const steps = Math.max(1, Math.round(-r.d / 2));
    for (let i = 1; i <= steps && r.d < 0; i++) {
      const f = i / steps;
      const t = j.trailT + (r.d * (1 - f)) / L;
      const q = terrain.roadPoint(t);
      block = Math.max(block, (terrain.heightAt(q.x, q.z) - (r.y + eye)) / Math.max(0.5, -r.d * (1 - f)));
    }
    const toJ = (jy - (r.y + eye)) / Math.max(0.5, -r.d);
    const sees = r.d >= 0 || toJ > block - 1e-4;
    console.log(
      `${r.d.toFixed(0).padStart(5)} m  y ${r.y.toFixed(2)}  ${' '.repeat(Math.max(0, col))}#` +
        `${' '.repeat(Math.max(0, 48 - col))}${sees ? 'junction visible' : 'BLIND — crest in the way'}`,
    );
  }
  console.log(`   junction surface y ${jy.toFixed(2)}, spur falls ${(hi - lo).toFixed(2)} m over the last 60 m`);
}

function section(label, t, isMain) {
  const p = isMain ? terrain.mainPoint(t) : terrain.roadPoint(t);
  const tan = isMain ? terrain.mainTangent(t) : terrain.roadTangent(t);
  const nx = tan.z;
  const nz = -tan.x;
  const y0 = terrain.heightAt(p.x, p.z);
  console.log(`\n--- ${label}  t=${t.toFixed(3)}  (x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)}, y ${y0.toFixed(2)})`);
  const rows = [];
  for (let d = -span; d <= span + 1e-6; d += step) {
    rows.push([d, terrain.heightAt(p.x + nx * d, p.z + nz * d) - y0]);
  }
  const lo = Math.min(...rows.map((r) => r[1]));
  const hi = Math.max(...rows.map((r) => r[1]));
  const w = 62;
  for (const [d, rel] of rows) {
    const col = Math.round(((rel - lo) / Math.max(1e-4, hi - lo)) * w);
    const mark = Math.abs(d) < 1e-6 ? '|' : ' ';
    console.log(
      `${d.toFixed(2).padStart(7)}${mark} ${(rel >= 0 ? '+' : '') + rel.toFixed(3)}  ${' '.repeat(Math.max(0, col))}#`,
    );
  }
  console.log(`   range ${(hi - lo).toFixed(3)} m`);
}

const jt = Number(arg('t', String(j.mainT + 0.09)));
section('mainline, clear of the junction', jt, true);
section('mainline, in the junction apron', j.mainT, true);
section('trail, for comparison', 0.3, false);

// what the truck actually feels: wheel-to-wheel drop at its own track width
for (const [label, t, isMain] of [
  ['mainline', jt, true],
  ['trail', 0.3, false],
]) {
  const p = isMain ? terrain.mainPoint(t) : terrain.roadPoint(t);
  const tan = isMain ? terrain.mainTangent(t) : terrain.roadTangent(t);
  const nx = tan.z;
  const nz = -tan.x;
  let worst = 0;
  for (let s = -0.5; s <= 0.5; s += 0.05) {
    const l = terrain.heightAt(p.x + nx * (s + 0.845), p.z + nz * (s + 0.845));
    const r = terrain.heightAt(p.x + nx * (s - 0.845), p.z + nz * (s - 0.845));
    worst = Math.max(worst, Math.abs(l - r));
  }
  console.log(`\n${label}: worst wheel-to-wheel cross drop over a metre of lateral offset ${worst.toFixed(3)} m`);
}
